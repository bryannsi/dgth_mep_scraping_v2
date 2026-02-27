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
    if (!vacancies?.length) return [];

    // 1. Extraer todos los IDs de las vacantes que queremos procesar (en una sola vuelta)
    const mepIds = vacancies.flatMap((v) => {
      const id = v.VACANTE ? String(v.VACANTE) : null;
      return id && id !== "undefined" && id !== "null" ? [id] : [];
    });

    // 2. Consultar en bloque cuáles de estos IDs ya existen en la DB
    const existingVacancies = await prisma.vacancy.findMany({
      where: { mepId: { in: mepIds } },
      select: { mepId: true },
    });

    const existingIds = new Set(existingVacancies.map((v) => v.mepId));

    // 3. Filtrar solo las vacantes que NO están en la base de datos
    const newVacanciesToSave = vacancies.filter((v) => {
      const id = String(v.VACANTE);
      return id && id !== "undefined" && id !== "null" && !existingIds.has(id);
    });

    if (newVacanciesToSave.length === 0) {
      console.log("No hay vacantes nuevas para guardar.");
      return [];
    }

    // 4. Mapear datos al formato de Prisma
    const dataToInsert = newVacanciesToSave.map((vacancy) => ({
      mepId: String(vacancy.VACANTE),
      vacante: String(vacancy["VACANTE"] || vacancy.VACANTE || "N/A"),
      regional: String(
        vacancy["DIRECCION REGIONAL"] || vacancy["REGION"] || "NO INDICADA",
      ),
      clasePuesto: String(vacancy["CLASE DE PUESTO"] || "NO INDICADA"),
      especialidad: String(vacancy.ESPECIALIDAD || "NO INDICADA"),
      institucion: String(vacancy["INSTITUCION"] || "NO INDICADA"),
      lecciones: parseInt(vacancy.LECCIONES || vacancy.JORNADA || "0", 10) || 0,
      rige:
        parseDate(vacancy.RIGE || vacancy["FECHA PUBLICACION"]) || new Date(),
      vence: parseDate(vacancy.VENCE),
    }));

    // 5. Inserción masiva (Bulk Insert)
    const result = await prisma.vacancy.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    console.log(
      `✅ Bulk Insert: Se guardaron ${result.count} vacantes nuevas.`,
    );
    return newVacanciesToSave;
  }
}
