import { filterVacancies } from "../helpers/helpers.js";
import { DbService } from "./dbService.js";
import { logger } from "./loggerService.js";

/**
 * Service to handle manual notification retrieval in JSON format.
 */
export class ManualNotificationService {
  /**
   * Obtiene las vacantes pendientes por notificar para todos los clientes autorizados
   * y las devuelve en un formato JSON estructurado.
   * 
   * @returns {Promise<Object>} - Resultado con las vacantes agrupadas por cliente.
   */
  static async getPendingNotificationsJSON() {
    logger.info("🔍 Iniciando recuperación de vacantes pendientes (Proceso Manual)...");

    // 1. Obtener todos los clientes autorizados
    const authorizedClients = await DbService.getAuthorizedClients();

    if (!authorizedClients || authorizedClients.length === 0) {
      logger.warn("⚠️ No hay clientes autorizados activos.");
      return { success: false, message: "No authorized clients found.", data: {} };
    }

    const results = {};

    // 2. Procesar cada cliente de forma similar a NotificationService
    for (const client of authorizedClients) {
      const tplName = client.templateKey;
      const config = client.config || {};

      // Obtener vacantes pendientes de las últimas 24h para este template
      const pendingVacanciesDB = await DbService.getPendingVacanciesByTemplate(tplName);

      if (pendingVacanciesDB.length === 0) {
        continue;
      }

      // Aplicar filtros (keywords/regions/clasePuesto)
      const filteredData = filterVacancies(
        pendingVacanciesDB,
        config.keywords || [],
        config.regions || [],
        config.clasePuesto || []
      );

      if (filteredData.length > 0) {
        results[tplName] = {
          clientName: client.nombre || client.email,
          email: client.email,
          vacancyCount: filteredData.length,
          vacancies: filteredData.map(v => ({
            id: v.id,
            mepId: v.mepId,
            vacante: v.vacante,
            regional: v.regional,
            clasePuesto: v.clasePuesto,
            especialidad: v.especialidad,
            institucion: v.institucion,
            lecciones: v.lecciones,
            rige: v.rige,
            vence: v.vence
          }))
        };
      }
    }

    const totalMatches = Object.values(results).reduce((acc, curr) => acc + curr.vacancyCount, 0);

    logger.info(`✅ Proceso completado. Se encontraron ${totalMatches} vacantes para ${Object.keys(results).length} clientes.`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalClientsWithMatches: Object.keys(results).length,
      totalVacanciesFound: totalMatches,
      data: results
    };
  }
}
