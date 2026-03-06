import fs from "node:fs";
import pino from "pino";
import { CONFIG } from "../config/config.js";
import { prisma } from "./prismaClient.js";

const baseLogger = pino({
  /*
   * NIVELES DE LOG DISPONIBLES (de menor a mayor gravedad):
   * 'debug' -> TODO (ideal para desarrollo)
   * 'info'  -> Detalle de logs
   * 'warn'  -> Avisos que no rompen el flujo
   * 'error' -> Fallos críticos (mínima verbosidad)
   */
  level: CONFIG.isProd ? "error" : "debug",
  transport: !CONFIG.isProd
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          messageKey: "msg",
          singleLine: false, // Imprime objetos en varias líneas (como console.dir)
        },
      }
    : undefined,
});

/**
 * Escribe un mensaje de error en el resumen visual de GitHub Actions (Markdown).
 */
function sendToGithubSummary(msg, errorObj) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;

  try {
    const summary = `### ❌ Error: ${msg}\n\`\`\`json\n${JSON.stringify(errorObj, null, 2)}\n\`\`\``;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  } catch (e) {
    baseLogger.error("No se pudo escribir en GitHub Summary: " + e.message);
  }
}

/**
 * Guarda el error en la tabla log_sistema de la base de datos (Supabase).
 */
async function saveToDatabase(msg, errorObj) {
  try {
    await prisma.systemLog.create({
      data: {
        level: "error",
        message: msg,
        details: errorObj ? JSON.stringify(errorObj, null, 2) : null,
      },
    });
  } catch (e) {
    baseLogger.error("Incapaz de guardar log en DB: " + e.message);
  }
}

export const logger = {
  info: (...args) => baseLogger.info(...args),
  warn: (...args) => baseLogger.warn(...args),
  error: async (msg, errorObj = null) => {
    baseLogger.error(msg);
    if (errorObj) baseLogger.error(errorObj);

    // Persistencia visual y persistencia histórica
    sendToGithubSummary(msg, errorObj);
    await saveToDatabase(msg, errorObj);
  },
};
