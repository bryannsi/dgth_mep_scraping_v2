import { filterVacancies } from "../helpers/helpers.js";
import { sendEmail } from "./mailService.js";
import { createHtmlTable } from "./renderService.js";

export class NotificationService {
  /**
   * @param {import("./templateService.js").TemplateService} templateService
   */
  constructor(templateService) {
    this.templateService = templateService;
  }

  /**
   * Procesa las notificaciones para todas las plantillas configuradas
   * @param {Array} data - Datos scrapeados
   * @param {Object} fileInfo - Información del archivo adjunto { name, path }
   */
  async processNotifications(data, fileInfo) {
    const templates = this.templateService.templates;

    // Preparar envíos en paralelo usando Promise.allSettled
    const notificationResults = await Promise.allSettled(
      Object.entries(templates).map(async ([tplName, tplConfig]) => {
        const tplKeywords = tplConfig.keywords || [];
        const tplRegions = tplConfig.regions || [];
        const filteredData = filterVacancies(data, tplKeywords, tplRegions);

        if (filteredData.length > 0) {
          console.log(
            `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes)...`,
          );

          // Crear Tabla HTML
          const tablaHTML = createHtmlTable(filteredData);

          // Preparar Template
          const mailContent = this.templateService.getMailTemplate(
            tplName,
            fileInfo,
            tablaHTML,
          );

          // Enviar Correo
          console.log(`📧 Enviando correo para ${tplName}...`);
          const result = await sendEmail(mailContent);
          if (result.accepted && result.accepted.length > 0) {
            console.log(`✅ Correo enviado a: ${tplConfig.to}`);
          }
          return { tplName, success: true };
        } else {
          console.log(
            `\n⚠️ "${tplName}" no tuvo coincidencias. Saltando envio.`,
          );
          return { tplName, success: false, reason: "no_matches" };
        }
      }),
    );

    // Revisar resultados de Promise.allSettled
    notificationResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`❌ Error en notificación [${index}]:`, result.reason);
      }
    });

    console.log("\n✅ Proceso de envío completado.");
  }
}
