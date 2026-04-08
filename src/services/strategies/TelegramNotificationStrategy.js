import { logger } from "../loggerService.js";
import { NotificationStrategy } from "./NotificationStrategy.js";

/**
 * Estrategia de notificación vía Telegram.
 * Pendiente de implementación real (usar API de Telegram Bot).
 */
export class TelegramNotificationStrategy extends NotificationStrategy {
  get channelName() {
    return "telegram";
  }

  async send(client, vacancies) {
    try {
      // TODO: Implementar lógica real con @telegram-bot-sdk o similar.
      logger.info(
        `[MOCK] Enviando ${vacancies.length} vacantes a Telegram para el cliente ${client.name} (${client.templateKey})...`,
      );

      // Simulamos un ID de mensaje de Telegram
      const providerId = `tg_msg_${Date.now()}`;

      return { success: true, providerId };
    } catch (err) {
      return { success: false, error: err };
    }
  }
}
