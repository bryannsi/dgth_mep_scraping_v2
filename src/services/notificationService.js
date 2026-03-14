import { filterVacancies } from "../helpers/helpers.js";
import { DbService } from "./dbService.js";
import { logger } from "./loggerService.js";
import { sendEmail } from "./mailService.js";
import { createHtmlTable } from "./renderService.js";

export class NotificationService {
  constructor(templateService) {
    this.templateService = templateService;
  }
  /**
   * Procesa notificaciones basadas en el estado actual de la BD,
   * notificando solo vacantes que no hayan sido notificadas aún para cada cliente autorizado.
   * @param {Object} fileInfo - Información del archivo adjunto { name, path }
   * @param {Array} authorizedClients - Lista de clientes autorizados ya cargados.
   */
  async processNotificationsFromDB(fileInfo, authorizedClients) {
    if (!authorizedClients || authorizedClients.length === 0) {
      logger.warn(
        "⚠️ No se proporcionaron clientes autorizados para notificar.",
      );
      return;
    }

    const notificationResults = await Promise.allSettled(
      authorizedClients.map(async (client) => {
        const tplName = client.templateKey;
        const config = client.config || {};

        // 1. Obtener vacantes pendientes (Delegado a DbService)
        const pendingVacanciesDB =
          await DbService.getPendingVacanciesByTemplate(tplName);

        if (pendingVacanciesDB.length === 0) {
          logger.warn(
            `\n⚠️ "${tplName}" no tiene vacantes pendientes por notificar.`,
          );
          return { tplName, success: false, reason: "no_pending_matches" };
        }

        // 2. Aplicar filtros (keywords/regions) guardados en el JSON 'config' de la BD
        const filteredData = filterVacancies(
          pendingVacanciesDB,
          config.keywords || [],
          config.regions || [],
        );

        if (filteredData.length === 0) {
          logger.warn(
            `\n⚠️ "${tplName}" no tiene vacantes que coincidan con sus filtros en BD.`,
          );
          return { tplName, success: false, reason: "no_keyword_matches" };
        }

        logger.info(
          `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes nuevas)...`,
        );

        // 3. Crear tabla HTML y construir email desde el objeto Client
        const tablaHTML = createHtmlTable(filteredData);
        const mailContent = this.templateService.getMailTemplateFromClient(
          client,
          fileInfo,
          tablaHTML,
        );

        logger.info(`📧 Enviando correo para ${tplName}...`);
        const result = await sendEmail(mailContent);

        if (result.accepted && result.accepted.length > 0) {
          logger.info(`✅ Correo enviado a: ${client.email}`);

          // 4. Registrar notificaciones en bitácora
          try {
            const insertResult = await DbService.logNotifications(
              tplName,
              filteredData, // Keeping filteredData as it's the expected argument for logNotifications
            );
            logger.info(
              `📝 Se registraron ${insertResult.count} filas en log_notificaciones para ${tplName}.`,
            );
          } catch (dbError) {
            await logger.error(
              `🚨 ALERTA CRÍTICA: Email enviado a ${tplName} pero falló registro en log.`,
              dbError,
            );
          }

          return { tplName, success: true, count: filteredData.length };
        } else {
          await logger.error(
            `❌ Error al enviar correo para ${tplName}`,
            result,
          );
          return { tplName, success: false, reason: "send_error" };
        }
      }),
    );

    notificationResults.forEach(async (r) => {
      if (r.status === "rejected") {
        await logger.error("❌ Error inesperado en notificación:", r.reason);
      }
    });

    logger.info("\n✅ Proceso de envío completado.");
  }
}
