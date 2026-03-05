import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import pg from "pg";
import { PRISMA_CONFIG } from "../src/config/config.js";
import { parseDate } from "../src/helpers/helpers.js";

// 1. Cargar .env
try {
  loadEnvFile();
} catch (e) {}

async function testInsert() {
  console.log(
    "--- 📝 Probando INSERCIÓN en Supabase (Prisma 7) desde JSON ---",
  );

  const url = PRISMA_CONFIG.datasource.url;
  const { Pool } = pg;
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Leer datos del archivo JSON
    const dataPath = path.join(process.cwd(), "data", "vacantes_mep.json");
    if (!fs.existsSync(dataPath)) {
      throw new Error(`No se encontró el archivo: ${dataPath}`);
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const LIMIT = 10; // Especificar la cantidad de datos a tomar
    const testRecords = rawData.slice(0, LIMIT);

    console.log(`📂 Leídos ${rawData.length} registros en total.`);
    console.log(
      `🎯 Tomando los primeros ${testRecords.length} para la prueba.`,
    );

    // 2. Extraer IDs usando flatMap
    const mepIds = testRecords.flatMap((v) =>
      v.VACANTE ? [String(v.VACANTE)] : [],
    );

    // 3. Mapear al formato de la DB
    const dataToInsert = testRecords.map((vacancy) => ({
      mepId: String(vacancy.VACANTE),
      vacante: String(vacancy.VACANTE || "N/A"),
      regional: String(
        vacancy["DIRECCION REGIONAL"] || vacancy["REGION"] || "NO INDICADA",
      ),
      clasePuesto: String(vacancy["CLASE DE PUESTO"] || "NO INDICADA"),
      especialidad: String(vacancy.ESPECIALIDAD || "NO INDICADA"),
      institucion: String(vacancy["INSTITUCION"] || "NO INDICADA"),
      lecciones: parseInt(vacancy.LECCIONES || "0", 10) || 0,
      rige: parseDate(vacancy.RIGE) || new Date(),
      vence: parseDate(vacancy.VENCE),
    }));

    console.log(
      `⏳ Intentando Bulk Insert de ${dataToInsert.length} registros...`,
    );

    // 4. Ejecutar Bulk Insert
    const result = await prisma.vacancy.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    console.log(
      `✅ Bulk Insert finalizado. Registros creados: ${result.count}`,
    );
    if (result.count < dataToInsert.length) {
      console.log(
        `ℹ️ Algunos registros no se insertaron porque ya existían (skipDuplicates).`,
      );
    }
  } catch (error) {
    console.error("❌ ERROR durante la inserción:");
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    console.log("--- Fin de la prueba de inserción ---");
  }
}

testInsert();
