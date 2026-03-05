import { filterVacancies } from "../helpers/helpers.js";
import { prisma } from "./dbService.js";
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

    logger.info("📂 Obteniendo vacantes de la base de datos...");
    const allVacancies = await prisma.vacancy.findMany();

    if (allVacancies.length === 0) {
      logger.info("⚠️ No hay vacantes en la base de datos para notificar.");
      return;
    }

    const notificationResults = await Promise.allSettled(
      Object.entries(templates).map(async ([tplName, tplConfig]) => {
        // IDs (mepId) ya notificados para el template
        const notifiedMepIds = new Set(
          (
            await prisma.notificationLog.findMany({
              where: { template: tplName },
              select: { mepId: true },
            })
          ).map((log) => log.mepId),
        );

        logger.info(
          `🔍 ${notifiedMepIds.size} vacantes ya notificadas para "${tplName}".`,
        );

        const filteredData = filterVacancies(
          allVacancies,
          tplConfig.keywords || [],
          tplConfig.regions || [],
        ).filter((v) => !notifiedMepIds.has(v.mepId));

        if (filteredData.length === 0) {
          logger.warn(
            `\n⚠️ "${tplName}" no tiene vacantes pendientes por notificar.`,
          );
          return { tplName, success: false, reason: "no_pending_matches" };
        }

        logger.info(
          `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes pendientes)...`,
        );

        // crear tabla HTML y preparar correo
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

          //TODO; ESTO SE TIENE QUE MOVER AL dbService.
          // registrar notificaciones solo si el envío fue exitoso
          const insertResult = await prisma.notificationLog.createMany({
            data: filteredData.map((v) => ({
              mepId: v.mepId,
              template: tplName,
            })),
            skipDuplicates: true,
          });
          logger.info(
            `📝 Se registraron ${insertResult.count} filas en log_notificaciones para ${tplName}.`,
          );

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
