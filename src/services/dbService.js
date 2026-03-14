import { CONFIG } from "../config/config.js";
import { smartFormatDate } from "../helpers/helpers.js";
import { logger } from "../services/loggerService.js";
import { prisma } from "./prismaClient.js";

export { prisma };

export class DbService {
  /**
   * Filtra las vacantes que ya existen en la base de datos y guarda las nuevas.
   * @param {Array} vacancies - Lista de vacantes scrapeadas.
   * @returns {Promise<Array>} - Lista de vacantes nuevas que no estaban en la BD.
   */
  static async filterAndSaveNewVacancies(vacancies) {
    // Si no se pasó nada, no hacer nada.
    if (!vacancies?.length) return [];

    // 1. Extraer todos los IDs de las vacantes que queremos procesar (en una sola vuelta)
    //    esto nos permite consultar en bloque a la base de datos y reducir llamadas.
    const mepIds = vacancies.flatMap((v) => {
      const id = v.vacante ? String(v.vacante).trim() : null;
      return id && id !== "undefined" && id !== "null" ? [id] : [];
    });

    // 2. Consultar en bloque qué registros ya existen en la DB, usando el campo
    //    `mepId` (mapa simple con select para no traer datos de más).
    const existingVacancies = await prisma.vacancy.findMany({
      where: { mepId: { in: mepIds } },
      select: { mepId: true },
    });

    const existingIds = new Set(existingVacancies.map((v) => v.mepId));
    logger.info({
      totalVacancies: vacancies.length,
      uniqueMepIds: mepIds.length,
      existingInDB: existingIds.size,
    });
    // 3. Filtrar el conjunto original dejando únicamente las vacantes que NO
    //    aparecen en la base de datos (nuevos candidatos a guardar).
    const newVacanciesToSave = vacancies.filter((v) => {
      const id = v.vacante ? String(v.vacante).trim() : null;
      return id && id !== "undefined" && id !== "null" && !existingIds.has(id);
    });

    if (newVacanciesToSave.length === 0) {
      logger.info("No hay vacantes nuevas para guardar.");
      return [];
    }

    // 4. Mapear cada vacante al formato esperado por Prisma/BD. Aquí también
    //    parseamos fechas y convertimos campos a strings para evitar nulls.
    const dataToInsert = newVacanciesToSave.map((v) => ({
      mepId: String(v.vacante).trim(),
      vacante: String(v.vacante || "N/A"),
      regional: String(v.regional || "NO INDICADA"),
      clasePuesto: String(v.clasePuesto || "NO INDICADA"),
      especialidad: String(v.especialidad || "NO INDICADA"),
      institucion: String(v.institucion || "NO INDICADA"),
      lecciones: parseInt(v.lecciones || "0", 10) || 0,
      rige: smartFormatDate(v.rige),
      vence: smartFormatDate(v.vence),
    }));

    // 5. Inserción masiva (Bulk Insert). Gracias a `skipDuplicates` podemos
    //    ejecutar este paso sin riesgo aunque haya solapamientos en la data.
    const result = await prisma.vacancy.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    logger.info(
      `✅ Bulk Insert: Se guardaron ${result.count} vacantes nuevas.`,
    );
    return newVacanciesToSave;
  }

  /**
   * Obtiene las vacantes que no han sido notificadas para un template específico.
   * Mejora B: Filtrado a nivel de Base de Datos para evitar OOM.
   * @param {string} templateName - Nombre del template (ej: "template1").
   * @returns {Promise<Array>} - Lista de objetos Vacancy.
   */
  static async getPendingVacanciesByTemplate(templateName) {
    return await prisma.vacancy.findMany({
      where: {
        NOT: {
          notificationLogs: {
            some: {
              template: templateName,
            },
          },
        },
      },
    });
  }

  /**
   * Registra masivamente las notificaciones enviadas en la bitácora.
   * @param {string} templateName - Nombre del template.
   * @param {Array} vacancies - Lista de vacantes notificadas.
   * @returns {Promise<Object>} - Resultado de la operación createMany.
   */
  static async logNotifications(templateName, vacancies) {
    if (!vacancies?.length) return { count: 0 };

    return await prisma.notificationLog.createMany({
      data: vacancies.map((v) => ({
        mepId: v.mepId,
        template: templateName,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Verifica si un cliente/template tiene permiso para recibir notificaciones.
   * Retorna el objeto cliente completo si está autorizado.
   * @param {string} templateKey - Clave del template (ej: "template1").
   * @returns {Promise<Object|null>} - Objeto Client o null si no está autorizado.
   */
  static async isClientAuthorized(templateKey) {
    try {
      const hoyCR = smartFormatDate(null, "en-CA");

      const client = await prisma.client.findUnique({
        where: { templateKey },
      });

      if (!client) {
        logger.warn(
          `⚠️ Cliente "${templateKey}" no registrado en la base de datos de suscripciones.`,
        );
        return null;
      }

      if (!client.isActive) {
        logger.warn(
          `🚫 Cliente "${templateKey}" desactivado manualmente por administración.`,
        );
        return null;
      }

      const venceCR = smartFormatDate(client.expirationDate, "en-CA");

      if (venceCR.toString() < hoyCR.toString()) {
        logger.warn(
          `📅 Suscripción de "${templateKey}" vencida el ${venceCR} (Hora CR).`,
        );
        return null;
      }

      return client;
    } catch (error) {
      await logger.error(
        `❌ Error crítico al validar suscripción de ${templateKey}`,
        error,
      );
      return null;
    }
  }

  /**
   * Obtiene todos los clientes autorizados (activos y vigentes).
   * @returns {Promise<Array>} - Lista de objetos de cliente.
   */
  static async getAuthorizedClients() {
    try {
      //TODO: revisar si esta funcion se puede mezclar con la funcion formatDateCR de helpers.js, habria que pasar parametros para que sea funcional en ambos procesos
      const hoyCR = smartFormatDate(null, "en-CA");

      const where = {
        isActive: true,
        expirationDate: {
          gte: hoyCR,
        },
      };

      // Si estamos en producción: solo clientes reales (isTest: false).
      // Si estamos en desarrollo: solo clientes de prueba (isTest: true).
      where.isTest = CONFIG.isProd ? false : true;

      return await prisma.client.findMany({ where });
    } catch (error) {
      await logger.error("❌ Error al obtener clientes autorizados", error);
      return [];
    }
  }

  /**
   * TODO: REVISAR ESTA FUNCION SI DEBE ESTAR EN dbService.js, ya que no utiliza la DB
   * Extrae regiones únicas de una lista de clientes.
   * Si algún cliente busca en "todas", retorna un arreglo vacío [].
   * @param {Array} clients - Lista de clientes de la base de datos.
   * @returns {string[]} - Lista de regiones en mayúsculas o [] para todas.
   */
  static extractRegionsFromClients(clients) {
    const regions = new Set();

    for (const client of clients) {
      const configRegions = client.config?.regions;
      // Si CUALQUIER cliente activo NO tiene regiones definidas (search all),
      // el scraper debe buscar en todas las regiones.
      if (
        !configRegions ||
        !Array.isArray(configRegions) ||
        configRegions.length === 0
      ) {
        return [];
      }
      configRegions.forEach((reg) => regions.add(reg.toUpperCase().trim()));
    }

    return Array.from(regions);
  }
}
