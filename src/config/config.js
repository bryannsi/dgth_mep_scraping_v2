import { loadEnvFile } from "node:process";

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

export const CONFIG = {
  isProd: isProd,
  baseHtml:
    "<!doctype html><html lang=es><head><meta charset=UTF-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body style='margin:0;padding:0;font-family:\"Segoe UI\",Arial,sans-serif;color:#333'><table width=100% cellpadding=0 cellspacing=0 border=0;padding:20px><tr><td align=center><table width=100% cellpadding=0 cellspacing=0 border=0 style=max-width:600px;background-color:transparent><tr><td style='padding:10px 0 20px 0;text-align:left'><h2 style=margin:0;font-size:20px;color:#036>Oportunidades Disponibles</h2><p style='margin:5px 0 0 0;font-size:14px;color:#000'>Hola <strong>{{NAME}}</strong>, estas son las vacantes según tu perfil:</p></td></tr><tr><td>{{TABLE}}</td></tr><tr><td style='padding:20px 0;border-top:1px solid #e1e8ed'><p style=margin:0;font-size:11px;color:#000;line-height:1.6;text-align:justify><strong>Nota informativa:</strong> Este servicio de notificación es independiente y <strong>no tiene vínculo oficial con el Ministerio de Educación Pública (MEP)</strong>. Los datos mostrados son de carácter público y se entregan de forma automatizada a solicitud del usuario.</p></td></tr></table></td></tr></table></body></html>",
  scraper: {
    url: "https://apps.mep.go.cr/formulario",
  },
  mail: {
    apiKey: getEnv("RESEND_API_KEY"),
    from: getEnv("MAIL_FROM"),
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
      `postgresql://postgres.${DB_PROJECT}:${DB_PASSWORD}@aws-1-us-east-1.pooler.supabase.com:${DB_PORT_DIRECT}/postgres`,
  },
};
