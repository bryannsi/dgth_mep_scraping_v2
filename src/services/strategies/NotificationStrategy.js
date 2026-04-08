/**
 * Clase base para todas las estrategias de notificación.
 * Define la interfaz que deben seguir todos los canales (Email, Telegram, etc.)
 */
export class NotificationStrategy {
  /**
   * Nombre del canal (e.g. 'email', 'telegram')
   */
  get channelName() {
    throw new Error("El método channelName debe ser implementado");
  }

  /**
   * Envía la notificación al cliente.
   * @param {Object} client - Objeto cliente con su configuración.
   * @param {Array} vacancies - Lista de vacantes a notificar.
   * @param {Object} fileInfo - Información del archivo adjunto (opcional).
   * @returns {Promise<Object>} - Resultado { success, providerId, error }
   */
  async send(client, vacancies, fileInfo) {
    throw new Error("El método send debe ser implementado");
  }
}
