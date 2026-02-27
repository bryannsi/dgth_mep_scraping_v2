import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { loadEnvFile } from "node:process";
import pg from "pg";
import { PRISMA_CONFIG } from "./src/config/config.js";

// 1. Cargar .env
try {
  loadEnvFile();
} catch (e) {}

async function testInsert() {
  console.log("--- 📝 Probando INSERCIÓN en Supabase (Prisma 7) ---");

  const url = PRISMA_CONFIG.datasource.url;
  const { Pool } = pg;
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  try {
    const prisma = new PrismaClient({ adapter });
    const testMepId = `TEST-${Date.now()}`;

    console.log(
      `⏳ Intentando insertar vacante de prueba (mepId: ${testMepId})...`,
    );

    const newVacancy = await prisma.vacancy.create({
      data: {
        mepId: testMepId,
        vacante: "PUESTO DE PRUEBA",
        regional: "REGIÓN DE PRUEBA",
        clasePuesto: "CLASE PRUEBA",
        especialidad: "ESPECIALIDAD PRUEBA",
        institucion: "INSTITUCIÓN PRUEBA",
        lecciones: 10,
        rige: new Date(),
      },
    });

    console.log("✅ Registro creado exitosamente:", newVacancy.mepId);
    console.log("🆔 ID generado por DB:", newVacancy.id);

    // Intentar borrado (sabemos que fallará por el trigger de inmutabilidad)
    console.log("🧹 Intentando limpieza (borrado)...");
    try {
      await prisma.vacancy.delete({ where: { mepId: testMepId } });
      console.log("✅ Registro eliminado (Inmutabilidad desactivada).");
    } catch (dbError) {
      console.warn("ℹ️ El borrado falló (esperado):", dbError.message);
    }

    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error("❌ ERROR durante la inserción:");
    console.error(error.message || error);
  } finally {
    console.log("--- Fin de la prueba de inserción ---");
  }
}

testInsert();
