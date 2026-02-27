import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { loadEnvFile } from "node:process";
import pg from "pg";
import { PRISMA_CONFIG } from "./src/config/config.js";

// 1. Cargar .env
try {
  loadEnvFile();
} catch (e) {}

async function testConnection() {
  console.log(
    "--- 🧪 Probando conexión con Supabase (Prisma 7 + Driver Adapter) ---",
  );

  const url = PRISMA_CONFIG.datasource.url;
  console.log("DEBUG: Usando URL (mask):", url.replace(/:[^@]+@/, ":****@"));

  const { Pool } = pg;
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  try {
    const prisma = new PrismaClient({ adapter });

    console.log("⏳ Intentando conectar con prisma.$connect()...");
    await prisma.$connect();
    console.log("✅ ¡CONEXIÓN EXITOSA A SUPABASE!");

    const count = await prisma.vacancy.count();
    console.log(`📊 Total vacantes encontradas: ${count}`);

    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error("❌ ERROR de conexión:");
    console.error(error.message || error);
  } finally {
    console.log("--- Fin de la prueba de conexión ---");
  }
}

testConnection();
