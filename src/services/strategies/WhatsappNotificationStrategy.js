import { logger } from "../loggerService.js";
import { NotificationStrategy } from "./NotificationStrategy.js";

/**
 * Estrategia de notificación vía WhatsApp.
 * Pendiente de implementación real (usar API de WhatsApp Business).
 */
export class WhatsappNotificationStrategy extends NotificationStrategy {
  get channelName() {
    return "whatsapp";
  }

  async send(client, vacancies) {
    try {
      // TODO: Implementar lógica real con Twilio o WhatsApp Business API.
      logger.info(
        `[MOCK] Enviando ${vacancies.length} vacantes a WhatsApp para el cliente ${client.name} (${client.email})...`,
      );

      // Simulamos un ID de mensaje
      const providerId = `wa_msg_${Date.now()}`;

      return { success: true, providerId };
    } catch (err) {
      return { success: false, error: err };
    }
  }
}
