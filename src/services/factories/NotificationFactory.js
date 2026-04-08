import { ConsoleNotificationStrategy } from "../strategies/ConsoleNotificationStrategy.js";
import { EmailNotificationStrategy } from "../strategies/EmailNotificationStrategy.js";
import { TelegramNotificationStrategy } from "../strategies/TelegramNotificationStrategy.js";
import { WhatsappNotificationStrategy } from "../strategies/WhatsappNotificationStrategy.js";

/**
 * Fábrica encargada de instanciar y decidir la estrategia de notificación
 * correcta basada en la configuración del cliente.
 */
export class NotificationFactory {
  constructor(templateService) {
    this.templateService = templateService;

    // Mapa de estrategias reales (puedes añadir o quitar sin afectar el core)
    this.strategies = {
      email: new EmailNotificationStrategy(this.templateService),
      telegram: new TelegramNotificationStrategy(),
      whatsapp: new WhatsappNotificationStrategy(),
    };

    // Estrategia especial para Mocks/Tests
    this.consoleStrategy = new ConsoleNotificationStrategy();
  }

  /**
   * Retorna una o varias estrategias de acuerdo a las preferencias del cliente.
   * Si Client.isTest es true, siempre devuelve unicamente la estrategia de consola.
   * @param {Object} client - El objeto cliente con su JSON de 'configuracion'.
   * @returns {NotificationStrategy[]} - Arreglo de estrategias seleccionadas.
   */
  getStrategies(client) {
    // 1. Si el cliente tiene el flag de prueba activo, usamos solo la consola por seguridad.
    if (client.isTest === true) {
      return [this.consoleStrategy];
    }

    // 2. Obtener preferencias del JSON 'config'. (Usa 'notificationChannel' segun feedback de usuario)
    const config = client.config || {};
    const preferredChannel = config.notificationChannel || "email";

    // 3. Soporte para múltiples canales (arreglo o valor único)
    const channels = Array.isArray(preferredChannel)
      ? preferredChannel
      : [preferredChannel];

    // 4. Mapear canales a objetos de estrategia concretos (ignorando los que no existan)
    return channels
      .map((ch) => this.strategies[ch.toLowerCase()])
      .filter((s) => s !== undefined);
  }
}
