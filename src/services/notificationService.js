import { filterVacancies } from "../helpers/helpers.js";
import { DbService } from "./dbService.js";
import { logger } from "./loggerService.js";

/**
 * Servicio encargado de la orquestación del proceso de notificaciones.
 * Sigue SRP al delegar el "cómo" enviar y "qué" renderizar a otras clases.
 * Sigue OCP al permitir nuevos canales sin modificar esta lógica.
 */
export class NotificationService {
  /**
   * @param {NotificationFactory} notificationFactory - Fábrica para obtener canales de envío.
   */
  constructor(notificationFactory) {
    this.notificationFactory = notificationFactory;
  }

  /**
   * Procesa notificaciones basadas en el estado actual de la BD,
   * notificando solo vacantes que no hayan sido notificadas aún para cada cliente autorizado.
   * @param {Object} fileInfo - Información del archivo adjunto { name, path } (para email)
   * @param {Array} authorizedClients - Lista de clientes autorizados ya cargados.
   */
  async processNotificationsFromDB(fileInfo, authorizedClients) {
    if (!authorizedClients || authorizedClients.length === 0) {
      logger.warn(
        "⚠️ No se proporcionaron clientes autorizados para notificar.",
      );
      return;
    }

    const notificationResults = await Promise.allSettled(
      authorizedClients.map(async (client) => {
        const tplName = client.templateKey;
        const config = client.config || {};

        // 1. Obtener las estrategias de notificación configuradas para este cliente (Patrón Strategy/Factory)
        const strategies = this.notificationFactory.getStrategies(client);

        if (strategies.length === 0) {
          logger.warn(`⚠️ "${tplName}" no tiene canales de notificación válidos configurados.`);
          return { tplName, success: false, reason: "no_strategies" };
        }

        logger.info(`\n📨 Procesando notificaciones para "${tplName}" (${strategies.length} canales)...`);

        // 2. Ejecutar cada una de las estrategias de forma independiente (Multichannel Estricto)
        const channelResults = await Promise.all(
          strategies.map(async (strategy) => {
            const channelName = strategy.channelName;
            
            // 2.1 Obtener vacantes pendientes Específicas para este CANAL (Delegado a DbService)
            const pendingVacanciesDB = await DbService.getPendingVacanciesByTemplate(tplName, channelName);

            if (pendingVacanciesDB.length === 0) {
              // *? por que success:true si antes estaba en false?
              return { channel: channelName, success: true, reason: "no_pending" };
            }

            // 2.2 Aplicar filtros (keywords/regions/clasePuesto) guardados en el JSON 'config' de la BD
            const filteredData = filterVacancies(
              pendingVacanciesDB,
              config.keywords || [],
              config.regions || [],
              config.clasePuesto || [],
            );

            if (filteredData.length === 0) {
              return { channel: channelName, success: true, reason: "filtered" };
            }

            logger.info(`📧 [${channelName}] Enviando ${filteredData.length} vacantes a ${tplName}...`);
            const result = await strategy.send(client, filteredData, fileInfo);

            if (result.success) {
              logger.info(`✅ [${channelName}] Notificación exitosa para: ${client.email}`);

              try {
                // Registro estricto por canal en la bitácora
                await DbService.logNotifications(
                  tplName,
                  filteredData,
                  channelName,
                  result.providerId
                );
              } catch (dbError) {
                await logger.error(
                  `🚨 [${channelName}] Error registrando log para ${tplName}:`,
                  dbError,
                );
              }
            } else {
              await logger.error(
                `❌ [${channelName}] Error al notificar a ${tplName}`,
                result.error,
              );
            }
            return { channel: channelName, success: result.success };
          })
        );

        return { tplName, success: true, channels: channelResults };
      }),
    );

    // Revisión de errores inesperados
    notificationResults.forEach(async (r) => {
      if (r.status === "rejected") {
        await logger.error("❌ Error inesperado en flujo de notificación:", r.reason);
      }
    });

    logger.info("\n✅ Proceso de envío completado.");
  }
}
