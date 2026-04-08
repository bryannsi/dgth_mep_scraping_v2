import { sendEmail } from "../mailService.js";
import { TemplateBuilder } from "../templateBuilder.js";
import { NotificationStrategy } from "./NotificationStrategy.js";

/**
 * Estrategia para notificaciones vía Correo Electrónico (Email).
 */
export class EmailNotificationStrategy extends NotificationStrategy {
  constructor(templateService) {
    super();
    this.templateService = templateService;
  }

  get channelName() {
    return "email";
  }

  /**
   * Construye el contenido del correo y lo envía.
   * @param {Object} client - El objeto cliente.
   * @param {Array} vacancies - La lista de vacantes.
   * @param {Object} fileInfo - Información del archivo adjunto.
   */
  async send(client, vacancies, fileInfo) {
    try {
      // 1. Generar la tabla HTML (Delegado a TemplateBuilder)
      const tablaHTML = TemplateBuilder.createHtmlTable(vacancies);

      // 2. Construir el objeto de correo (Delegado a TemplateService)
      const mailContent = this.templateService.getMailTemplateFromClient(
        client,
        fileInfo,
        tablaHTML,
      );

      // 3. Enviar el correo (Delegado a MailService)
      const { data, error } = await sendEmail(mailContent);

      if (data && data.id) {
        return { success: true, providerId: data.id };
      } else {
        return { success: false, error: error };
      }
    } catch (err) {
      return { success: false, error: err };
    }
  }
}
