import { filterVacancies } from "../helpers/helpers.js";
import { prisma } from "./dbService.js";
import { sendEmail } from "./mailService.js";
import { createHtmlTable } from "./renderService.js";

export class NotificationService {
  constructor(templateService) {
    this.templateService = templateService;
  }

  /**
   * Procesa notificaciones basadas en el estado actual de la BD,
   * notificando solo vacantes que no hayan sido notificadas aún para cada template.
   * @param {Object} fileInfo - Información del archivo adjunto { name, path }
   */
  async processNotificationsFromDB(fileInfo) {
    const templates = this.templateService.templates;

    console.log("📂 Obteniendo vacantes de la base de datos...");
    const allVacancies = await prisma.vacancy.findMany();

    if (allVacancies.length === 0) {
      console.log("⚠️ No hay vacantes en la base de datos para notificar.");
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

        console.log(
          `🔍 ${notifiedMepIds.size} vacantes ya notificadas para "${tplName}".`,
        );

        const filteredData = filterVacancies(
          allVacancies,
          tplConfig.keywords || [],
          tplConfig.regions || [],
        ).filter((v) => !notifiedMepIds.has(v.mepId));

        if (filteredData.length === 0) {
          console.log(
            `\n⚠️ "${tplName}" no tiene vacantes pendientes por notificar.`,
          );
          return { tplName, success: false, reason: "no_pending_matches" };
        }

        console.log(
          `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes pendientes)...`,
        );

        // crear tabla HTML y preparar correo
        const tablaHTML = createHtmlTable(filteredData);
        const mailContent = this.templateService.getMailTemplate(
          tplName,
          fileInfo,
          tablaHTML,
        );
        //TODO; ESTO SE TIENE QUE MOVER AL dbService.
        // registrar notificaciones independientemente del envío
        const insertResult = await prisma.notificationLog.createMany({
          data: filteredData.map((v) => ({
            mepId: v.mepId,
            template: tplName,
          })),
          skipDuplicates: true,
        });
        console.log(
          `📝 Se registraron ${insertResult.count} filas en log_notificaciones.`,
        );

        console.log(`📧 Enviando correo para ${tplName}...`);
        const result = await sendEmail(mailContent);

        if (result.accepted && result.accepted.length > 0) {
          console.log(`✅ Correo enviado a: ${tplConfig.to}`);
          return { tplName, success: true, count: filteredData.length };
        } else {
          console.error(`❌ Error al enviar correo para ${tplName}`);
          return { tplName, success: false, reason: "send_error" };
        }
      }),
    );

    notificationResults.forEach((r) => {
      if (r.status === "rejected") {
        console.error("❌ Error en notificación:", r.reason);
      }
    });

    console.log("\n✅ Proceso de envío completado.");
  }
}
