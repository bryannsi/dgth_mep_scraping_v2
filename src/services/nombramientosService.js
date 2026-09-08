import { smartFormatDate } from "../helpers/helpers.js";
import { logger } from "./loggerService.js";
import { prisma } from "./prismaClient.js";
import { scrapeNombramientoMEP } from "../scrapers/nombramientosScraper.js";

export class NombramientosService {
  /**
   * Consulta y guarda un nombramiento para una vacante específica.
   * @param {string} mepId 
   * @param {string} year 
   */
  static async processNombramiento(mepId, year = "2026") {
    logger.info(`Iniciando proceso de nombramiento para vacante ${mepId} - año ${year}`);
    
    // 1. Buscar primero en la base de datos si ya existe el nombramiento para esta vacante y año (Cache/BD)
    const existingNombramiento = await prisma.nombramiento.findFirst({
      where: {
        vacancy: { mepId: String(mepId) },
        anio: parseInt(year, 10)
      },
      include: {
        persona: true
      }
    });

    if (existingNombramiento) {
      logger.info(`Nombramiento encontrado en base de datos para vacante ${mepId} y año ${year}. Omitiendo consulta web.`);
      return { 
        success: true, 
        message: "Nombramiento recuperado de la base de datos (Cache).",
        data: existingNombramiento 
      };
    }

    // 2. Obtener la vacante de la BD para relacionarla
    const vacante = await prisma.vacancy.findFirst({
      where: { mepId: String(mepId) }
    });

    if (!vacante) {
      logger.error(`La vacante con mep_id ${mepId} no existe en la base de datos.`);
      return { success: false, error: "La vacante no existe en la base de datos, por lo que no se puede asociar un nombramiento." };
    }

    // 3. Ejecutar Scraper
    const rawData = await scrapeNombramientoMEP(mepId, year);
    
    // Requerimiento: "sino devuelve datos la consulta, no se debe guardar nada en la base de datos"
    // "5. Si no se encuentra, indicar que no existe."
    if (!rawData) {
      logger.info(`No se encontraron registros web para la vacante ${mepId} en ${year}.`);
      return { success: false, error: `No se encontró nombramiento para la vacante ${mepId} y año ${year} en el sitio web.` };
    }

    // 3. Procesar y guardar en BD
    // Extraer campos mapeando posibles nombres de columnas en la tabla HTML
    const getField = (keys) => {
      for (const k of keys) {
        const foundKey = Object.keys(rawData).find(key => key.includes(k));
        if (foundKey) return rawData[foundKey];
      }
      return null;
    };

    const cedula = getField(["CÉDULA", "CEDULA"]);
    const nombre = getField(["NOMBRE"]);
    const institucion = getField(["INSTITUCIÓN", "INSTITUCION"]);
    const clasePuesto = getField(["CLASE PUESTO", "CLASE DE PUESTO"]);
    const especialidad = getField(["ESPECIALIDAD"]);
    const grupo = getField(["GRUPO"]);
    const numPuesto = getField(["N° PUESTO", "NUMERO", "PUESTO"]);
    const rigeStr = getField(["RIGE"]);
    const venceStr = getField(["VENCE"]);
    const estado = getField(["ESTADO"]);
    const calificacion = getField(["CALIFICACIÓN", "CALIFICACION", "ELEGIBLES"]);
    const titulo = getField(["TÍTULO", "TITULO", "NÓMINA", "NOMINA"]);

    if (!cedula || !nombre) {
      logger.warn("Datos insuficientes extraídos de la web para procesar persona (cédula o nombre faltante)");
      return { success: false, error: "Datos extraídos insuficientes (Cédula o Nombre faltante)" };
    }

    try {
      // Upsert Persona
      await prisma.persona.upsert({
        where: { cedula: cedula },
        update: { nombre: nombre },
        create: { cedula: cedula, nombre: nombre }
      });

      const rige = rigeStr ? smartFormatDate(rigeStr) : null;
      const vence = venceStr ? smartFormatDate(venceStr) : null;

      // Requerimiento: "vacancy en tabla Nombramiento debe ser unique ya si se hace n cantidad de veces la consulta no debera guardar duplicados"
      // Utilizamos upsert validando por vacanteId, que marcamos como @unique en el esquema.
      const savedNombramiento = await prisma.nombramiento.upsert({
        where: { vacanteId: vacante.id },
        update: {
          personaCedula: cedula,
          anio: parseInt(year, 10),
          institucion,
          clasePuesto,
          especialidad,
          grupo,
          numeroPuesto: numPuesto,
          rige,
          vence,
          estado,
          calificacionElegibles: calificacion,
          tituloNomina: titulo,
          fechaScraping: new Date()
        },
        create: {
          vacanteId: vacante.id,
          personaCedula: cedula,
          anio: parseInt(year, 10),
          institucion,
          clasePuesto,
          especialidad,
          grupo,
          numeroPuesto: numPuesto,
          rige,
          vence,
          estado,
          calificacionElegibles: calificacion,
          tituloNomina: titulo
        },
        include: {
          persona: true
        }
      });

      logger.info(`✅ Nombramiento guardado/actualizado con éxito para vacante ${mepId} (Persona: ${cedula})`);
      return { 
        success: true, 
        message: "Nombramiento guardado en la base de datos correctamente.",
        data: savedNombramiento
      };

    } catch (error) {
      logger.error(`Error de base de datos guardando nombramiento para vacante ${mepId}:`, error);
      return { success: false, error: error.message };
    }
  }
}
