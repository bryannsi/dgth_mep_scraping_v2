import { loadEnvFile } from "node:process";
import templatesProd from "./templates.json" with { type: "json" };
import templatesTest from "./templates_test.json" with { type: "json" };

try {
  loadEnvFile();
} catch (error) {
  // Solo avisar si el error NO es que el archivo no existe
  if (error.code !== "ENOENT") {
    console.warn(
      "⚠️ No se pudo cargar el archivo .env, usando variables de entorno del sistema.",
    );
  }
}

const getEnv = (name, defaultValue = "") => process.env[name] || defaultValue;

const DB_PASSWORD = getEnv("DB_PASSWORD_ESCAPED");
const DB_PROJECT = getEnv("DB_PROJECT_ID");
const DB_PORT_POOLING = getEnv("DB_PORT_POOLING", "6543");
const DB_PORT_DIRECT = getEnv("DB_PORT_DIRECT", "5432");
const isProd = getEnv("MODE_ENV") === "prod";
console.log("Modo de ejecución desde config:", isProd ? "PRODUCCIÓN" : "DESARROLLO");
export const CONFIG = {
  templates: isProd ? templatesProd : templatesTest,
  isProd: isProd,
  scraper: {
    url: "https://apps.mep.go.cr/formulario",
  },
  mail: {
    user: getEnv("MAIL_USERNAME"),
    clientId: getEnv("OAUTH_CLIENTID"),
    clientSecret: getEnv("OAUTH_CLIENT_SECRET"),
    refreshToken: getEnv("OAUTH_REFRESH_TOKEN"),
  },
  puppeteer: {
    headless: "new",
    executablePath:
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ],
  },
};

export const PRISMA_CONFIG = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      getEnv("DATABASE_URL") ||
      `postgresql://postgres.${DB_PROJECT}:${DB_PASSWORD}@aws-1-us-east-1.pooler.supabase.com:${DB_PORT_POOLING}/postgres?pgbouncer=true`,
    directUrl:
      getEnv("DIRECT_URL") ||
      `postgresql://postgres:${DB_PASSWORD}@db.${DB_PROJECT}.supabase.co:${DB_PORT_DIRECT}/postgres`,
  },
};
