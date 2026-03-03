import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PRISMA_CONFIG } from "../config/config.js";
import { parseDate } from "../helpers/helpers.js";

const pool = new pg.Pool({ connectionString: PRISMA_CONFIG.datasource.url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
    console.dir({ totalVacancies: vacancies.length, uniqueMepIds: mepIds.length, existingInDB: existingIds.size });
    // 3. Filtrar el conjunto original dejando únicamente las vacantes que NO
    //    aparecen en la base de datos (nuevos candidatos a guardar).
    const newVacanciesToSave = vacancies.filter((v) => {
      const id = v.vacante ? String(v.vacante).trim() : null;
      return id && id !== "undefined" && id !== "null" && !existingIds.has(id);
    });

    if (newVacanciesToSave.length === 0) {
      console.log("No hay vacantes nuevas para guardar.");
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
      rige: parseDate(v.rige) || new Date(),
      vence: parseDate(v.vence) || new Date(),
    }));

    // 5. Inserción masiva (Bulk Insert). Gracias a `skipDuplicates` podemos
    //    ejecutar este paso sin riesgo aunque haya solapamientos en la data.
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
