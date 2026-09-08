import { smartFormatDate } from "../helpers/helpers.js";
import { logger } from "./loggerService.js";
import { prisma } from "./prismaClient.js";
import { scrapeNombramientoMEP } from "../scrapers/nombramientosScraper.js";
import { VacantesService } from "./vacantesService.js";

/**
 * Alias utilizados para localizar los campos provenientes
 * del scraper del MEP.
 */
const FIELD_ALIASES = {
  cedula: ["CÉDULA", "CEDULA"],
  nombre: ["NOMBRE"],
  institucion: ["INSTITUCIÓN", "INSTITUCION"],
  clasePuesto: ["CLASE PUESTO", "CLASE DE PUESTO"],
  especialidad: ["ESPECIALIDAD"],
  grupo: ["GRUPO"],
  numeroPuesto: ["N° PUESTO", "NUMERO", "PUESTO"],
  rige: ["RIGE"],
  vence: ["VENCE"],
  estado: ["ESTADO"],
  calificacion: ["CALIFICACIÓN", "CALIFICACION", "ELEGIBLES"],
  titulo: ["TÍTULO", "TITULO", "NÓMINA", "NOMINA"],
};

export class NombramientosService {
  /**
   * Busca un campo dentro de los datos obtenidos del scraper
   * utilizando una lista de posibles nombres.
   *
   * @param {Object} data
   * @param {string[]} aliases
   * @returns {*}
   */
  static getField(data, aliases) {
    const keys = Object.keys(data);

    for (const alias of aliases) {
      const key = keys.find((key) => key.includes(alias));

      if (key) {
        return data[key];
      }
    }

    return null;
  }

  /**
   * Extrae todos los campos necesarios del resultado del scraper.
   *
   * @param {Object} rawData
   * @returns {Object}
   */
  static extractNombramientoData(rawData) {
    return Object.fromEntries(
      Object.entries(FIELD_ALIASES).map(([field, aliases]) => [
        field,
        this.getField(rawData, aliases),
      ])
    );
  }

  /**
   * Consulta y guarda un nombramiento para una vacante específica.
   *
   * Primero revisa si ya existe en la base de datos. Si existe,
   * evita realizar nuevamente el scraping.
   *
   * @param {string|number} mepId
   * @param {string|number} year
   * @returns {Promise<Object>}
   */
  static async processNombramiento(mepId, year = "2026") {
    const normalizedMepId = String(mepId);
    const normalizedYear = Number.parseInt(year, 10);

    if (!Number.isInteger(normalizedYear)) {
      return {
        success: false,
        error: `Año inválido: ${year}`,
      };
    }

    logger.info(
      `Iniciando proceso de nombramiento para vacante ${normalizedMepId} - año ${normalizedYear}`
    );

    /*
     * 1. Revisar caché de nombramiento.
     */
    const existingNombramiento = await prisma.nombramiento.findFirst({
      where: {
        vacancy: {
          mepId: normalizedMepId,
        },
        anio: normalizedYear,
      },
      include: {
        persona: true,
      },
    });

    if (existingNombramiento) {
      logger.info(
        `Nombramiento encontrado en BD para vacante ${normalizedMepId} y año ${normalizedYear}. Omitiendo consulta web.`
      );

      return {
        success: true,
        message: "Nombramiento recuperado de la base de datos (Cache).",
        data: existingNombramiento,
      };
    }

    /*
     * 2. Buscar la vacante utilizando VacantesService.
     *
     * NombramientosService ya no accede directamente a
     * prisma.vacancy.
     */
    const vacante = await VacantesService.findByMepId(normalizedMepId);

    if (!vacante) {
      logger.error(
        `La vacante con mepId ${normalizedMepId} no existe en la base de datos.`
      );

      return {
        success: false,
        error:
          "La vacante no existe en la base de datos, por lo que no se puede asociar un nombramiento.",
      };
    }

    /*
     * 3. Ejecutar scraper.
     */
    const rawData = await scrapeNombramientoMEP(
      normalizedMepId,
      normalizedYear
    );

    if (!rawData) {
      logger.info(
        `No se encontraron registros web para la vacante ${normalizedMepId} en ${normalizedYear}.`
      );

      return {
        success: false,
        error: `No se encontró nombramiento para la vacante ${normalizedMepId} y año ${normalizedYear} en el sitio web.`,
      };
    }

    /*
     * 4. Extraer información.
     */
    const {
      cedula,
      nombre,
      institucion,
      clasePuesto,
      especialidad,
      grupo,
      numeroPuesto,
      rige: rigeStr,
      vence: venceStr,
      estado,
      calificacion,
      titulo,
    } = this.extractNombramientoData(rawData);

    if (!cedula || !nombre) {
      logger.warn(
        "Datos insuficientes extraídos de la web para procesar persona (cédula o nombre faltante)"
      );

      return {
        success: false,
        error: "Datos extraídos insuficientes (Cédula o Nombre faltante)",
      };
    }

    /*
     * 5. Preparar datos.
     */
    const rige = rigeStr ? smartFormatDate(rigeStr) : null;
    const vence = venceStr ? smartFormatDate(venceStr) : null;

    const nombramientoData = {
      personaCedula: cedula,
      anio: normalizedYear,
      institucion,
      clasePuesto,
      especialidad,
      grupo,
      numeroPuesto,
      rige,
      vence,
      estado,
      calificacionElegibles: calificacion,
      tituloNomina: titulo,
      fechaScraping: new Date(),
    };

    try {
      /*
       * 6. Crear/actualizar persona y nombramiento.
       *
       * Promise.all permite ejecutar el upsert de persona y
       * posteriormente el nombramiento manteniendo la relación
       * correctamente.
       */

      await prisma.persona.upsert({
        where: {
          cedula,
        },
        update: {
          nombre,
        },
        create: {
          cedula,
          nombre,
        },
      });

      const savedNombramiento = await prisma.nombramiento.upsert({
        where: {
          vacanteId: vacante.id,
        },
        update: nombramientoData,
        create: {
          vacanteId: vacante.id,
          ...nombramientoData,
        },
        include: {
          persona: true,
        },
      });

      logger.info(
        `Nombramiento guardado/actualizado correctamente para vacante ${normalizedMepId} (Persona: ${cedula})`
      );

      return {
        success: true,
        message: "Nombramiento guardado en la base de datos correctamente.",
        data: savedNombramiento,
      };
    } catch (error) {
      logger.error(
        `Error de base de datos guardando nombramiento para vacante ${normalizedMepId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reconstruye el histórico de nombramientos a partir de una vacante.
   *
   * Se obtiene primero el bloque de vacantes con una sola consulta
   * y posteriormente se procesa cada nombramiento.
   *
   * @param {Object} params
   * @param {number|string} params.initialVacanteId
   * @param {string|number} params.year
   * @param {'backward'|'forward'} params.direction
   * @param {number} params.limit
   * @returns {Promise<Object>}
   */
  static async reconstructHistory({
    initialVacanteId,
    year = "2026",
    direction = "backward",
    limit = 10,
  }) {
    const startId = Number(initialVacanteId);
    const normalizedYear = Number.parseInt(year, 10);
    const normalizedLimit = Number(limit);

    if (!Number.isInteger(startId)) {
      return {
        success: false,
        error: `ID de vacante inválido: ${initialVacanteId}`,
      };
    }

    if (!Number.isInteger(normalizedYear)) {
      return {
        success: false,
        error: `Año inválido: ${year}`,
      };
    }

    if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
      return {
        success: false,
        error: `Límite inválido: ${limit}`,
      };
    }

    if (!["backward", "forward"].includes(direction)) {
      return {
        success: false,
        error: `Dirección inválida: ${direction}`,
      };
    }

    logger.info(
      `Iniciando recorrido histórico (${direction}) desde vacantes.id=${startId}, año=${normalizedYear}, límite=${normalizedLimit}`
    );

    /*
     * Obtener la vacante inicial.
     */
    const initialVacante = await VacantesService.findById(startId);

    if (!initialVacante) {
      logger.error(
        `Vacante inicial con ID interno ${startId} no fue encontrada en la base de datos.`
      );

      return {
        success: false,
        error: `Vacante con id ${startId} no encontrada.`,
      };
    }

    /*
     * Obtener todas las vacantes necesarias en una sola consulta.
     */
    let vacancies = await VacantesService.getHistoryChunk(
      startId,
      direction,
      normalizedLimit
    );

    /*
     * Para backward, Prisma devuelve:
     *
     * 10, 9, 8, 7...
     *
     * Si queremos procesarlas cronológicamente desde la
     * vacante inicial hacia atrás, ese orden ya es correcto.
     *
     * Para forward:
     *
     * 11, 12, 13, 14...
     */

    const summary = {
      processed: 0,
      found: 0,
      notFound: 0,
      errors: 0,
      details: [],
    };

    for (const currentVacante of vacancies) {
      summary.processed++;

      logger.info(
        `[${summary.processed}/${normalizedLimit}] Procesando vacantes.id=${currentVacante.id} (mepId=${currentVacante.mepId})...`
      );

      try {
        const result = await this.processNombramiento(
          currentVacante.mepId,
          normalizedYear
        );

        if (result.success) {
          summary.found++;

          summary.details.push({
            vacanteId: currentVacante.id,
            mepId: currentVacante.mepId,
            status: "NOMBRAMIENTO_GUARDADO",
            data: result.data,
          });
        } else {
          summary.notFound++;

          summary.details.push({
            vacanteId: currentVacante.id,
            mepId: currentVacante.mepId,
            status: "SIN_NOMBRAMIENTO",
            reason: result.error,
          });
        }
      } catch (error) {
        summary.errors++;

        logger.error(
          `Error procesando vacante.id=${currentVacante.id}:`,
          error
        );

        summary.details.push({
          vacanteId: currentVacante.id,
          mepId: currentVacante.mepId,
          status: "ERROR",
          reason: error.message,
        });
      }
    }

    logger.info(
      `Recorrido histórico (${direction}) finalizado. Procesadas: ${summary.processed}, encontradas: ${summary.found}, sin nombramiento: ${summary.notFound}, errores: ${summary.errors}`
    );

    return {
      success: true,
      summary,
    };
  }
}