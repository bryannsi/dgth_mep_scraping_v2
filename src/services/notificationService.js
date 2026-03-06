import { filterVacancies } from "../helpers/helpers.js";
import { DbService } from "./dbService.js";
import { logger } from "./loggerService.js";
import { sendEmail } from "./mailService.js";
import { createHtmlTable } from "./renderService.js";

export class NotificationService {
  constructor(templateService) {
    this.templateService = templateService;
  }
  //TODO: este metodo processNotificationsFromDB debe estar en la capa DB
  /**
   * Procesa notificaciones basadas en el estado actual de la BD,
   * notificando solo vacantes que no hayan sido notificadas aún para cada template.
   * @param {Object} fileInfo - Información del archivo adjunto { name, path }
   */
  async processNotificationsFromDB(fileInfo) {
    const templates = this.templateService.templates.users;

    logger.info(
      "📂 Obteniendo vacantes pendientes de notificar de la base de datos...",
    );

    const notificationResults = await Promise.allSettled(
      Object.entries(templates).map(async ([tplName, tplConfig]) => {
        // 1. Validar suscripción antes de procesar
        if (!(await DbService.isClientAuthorized(tplName))) {
          return { tplName, success: false, reason: "subscription_invalid" };
        }

        // 2. Obtener vacantes pendientes (Delegado a DbService)
        const pendingVacanciesDB =
          await DbService.getPendingVacanciesByTemplate(tplName);

        if (pendingVacanciesDB.length === 0) {
          logger.warn(
            `\n⚠️ "${tplName}" no tiene vacantes pendientes por notificar (todas fueron procesadas previamente).`,
          );
          return { tplName, success: false, reason: "no_pending_matches" };
        }

        // 3. Sobre ese subset ya reducido, aplicamos el filtro de palabras clave/regiones
        const filteredData = filterVacancies(
          pendingVacanciesDB,
          tplConfig.keywords || [],
          tplConfig.regions || [],
        );

        if (filteredData.length === 0) {
          logger.warn(
            `\n⚠️ "${tplName}" no tiene vacantes que coincidan con sus filtros de keywords/regiones.`,
          );
          return { tplName, success: false, reason: "no_keyword_matches" };
        }

        logger.info(
          `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes que coinciden con sus filtros)...`,
        );

        // Crear tabla HTML y preparar correo
        const tablaHTML = createHtmlTable(filteredData);
        const mailContent = this.templateService.getMailTemplate(
          tplName,
          fileInfo,
          tablaHTML,
        );

        logger.info(`📧 Enviando correo para ${tplName}...`);
        const result = await sendEmail(mailContent);

        if (result.accepted && result.accepted.length > 0) {
          logger.info(`✅ Correo enviado a: ${tplConfig.to}`);

          // 3. Registrar notificaciones (Robustez: Manejo de fallos en DB tras envío exitoso)
          try {
            const insertResult = await DbService.logNotifications(
              tplName,
              filteredData,
            );
            logger.info(
              `📝 Se registraron ${insertResult.count} filas en log_notificaciones para ${tplName}.`,
            );
          } catch (dbError) {
            await logger.error(
              `🚨 ALERTA CRÍTICA DE DUPLICIDAD: El correo para ${tplName} se ENVIÓ, pero falló el registro en la base de datos.`,
              {
                template: tplName,
                vacancies: filteredData.map((v) => v.mepId),
                error: dbError.message,
              },
            );
            // No retornamos false aquí porque el correo SÍ se envió.
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
        await logger.error("❌ Error en notificación:", r.reason);
      }
    });

    logger.info("\n✅ Proceso de envío completado.");
  }
}
