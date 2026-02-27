import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PRISMA_CONFIG } from "../config/config.js";
import { parseDate } from "../helpers/helpers.js";

const pool = new pg.Pool({ connectionString: PRISMA_CONFIG.datasource.url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export class DbService {
  /**
   * Filtra las vacantes que ya existen en la base de datos y guarda las nuevas.
   * @param {Array} vacancies - Lista de vacantes scrapeadas.
   * @returns {Promise<Array>} - Lista de vacantes nuevas que no estaban en la BD.
   */
  static async filterAndSaveNewVacancies(vacancies) {
    const newVacancies = [];

    for (const vacancy of vacancies) {
      const mepId = vacancy.VACANTE;

      if (!mepId) continue;

      // Intentar encontrar la vacante por mepId
      const existing = await prisma.vacancy.findUnique({
        where: { mepId },
      });

      if (!existing) {
        // Preparar fechas
        const rigeDate =
          parseDate(vacancy.RIGE || vacancy["FECHA PUBLICACION"]) || new Date();
        const venceDate = parseDate(vacancy.VENCE);

        // Guardar la nueva vacante mapeada al nuevo schema
        const saved = await prisma.vacancy.create({
          data: {
            mepId: String(vacancy.VACANTE),
            vacante: String(
              vacancy["TIPO VACANTE"] || vacancy.VACANTE || "N/A",
            ),
            regional: String(
              vacancy["DIRECCION REGIONAL"] ||
                vacancy["REGION"] ||
                "NO INDICADA",
            ).substring(0, 100),
            clasePuesto: String(vacancy["CLASE DE PUESTO"] || "NO INDICADA"),
            especialidad: String(vacancy.ESPECIALIDAD || "NO INDICADA"),
            institucion: String(vacancy["CENTRO EDUCATIVO"] || "NO INDICADA"),
            lecciones:
              parseInt(vacancy.LECCIONES || vacancy.JORNADA || "0", 10) || 0,
            rige: rigeDate,
            vence: venceDate,
          },
        });
        console.log("DATOS GUARDADOS EN DB:", saved);
        newVacancies.push(vacancy);
        console.log(`🆕 Nueva vacante guardada: ${mepId}`);
      }
    }

    return newVacancies;
  }
}
