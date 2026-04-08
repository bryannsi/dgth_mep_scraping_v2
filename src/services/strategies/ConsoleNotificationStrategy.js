import { logger } from "../loggerService.js";
import { NotificationStrategy } from "./NotificationStrategy.js";

/**
 * Estrategia de notificación por Consola (Logs).
 * Se utiliza primordialmente para fines de depuración y cuando
 * el cliente se encuentra en modo de prueba (isTest === true).
 */
export class ConsoleNotificationStrategy extends NotificationStrategy {
  get channelName() {
    return "console";
  }

  async send(client, vacancies) {
    try {
      logger.info(
        `[MOCK] ConsoleNotificationStrategy: Enviando ${vacancies.length} vacantes a ${client.email} (${client.name})...`,
      );

      // Simulamos un ID de envío de consola
      const providerId = `console_msg_${Date.now()}`;

      return { success: true, providerId };
    } catch (err) {
      return { success: false, error: err };
    }
  }
}
