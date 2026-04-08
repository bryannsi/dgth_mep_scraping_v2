import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config/config.js";
import { formatDuration } from "./helpers/helpers.js";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { DbService } from "./services/dbService.js";
import { jsonExport } from "./services/exportService.js";
import { logger } from "./services/loggerService.js";
import { NotificationFactory } from "./services/factories/NotificationFactory.js";
import { NotificationService } from "./services/notificationService.js";
import { TemplateService } from "./services/templateService.js";

const OUTPUT_DIR = path.join(process.cwd(), "build", "data");
fs.mkdirSync(OUTPUT_DIR, { recursive: true }); // crea build/data si no existe

const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

async function main() {
  logger.info("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();
  // Indicar si estamos corriendo en desarrollo o producción
  logger.info(`🔧 Modo: ${CONFIG.isProd ? "PRODUCCIÓN" : "DESARROLLO"}`);

  // 1. Inicializar los servicios que se usarán en todo el flujo.
  const templateService = new TemplateService();
  const notificationFactory = new NotificationFactory(templateService);
  const notificationService = new NotificationService(notificationFactory);

  try {
    // 1. Obtener clientes autorizados (una sola vez para todo el flujo)
    const authorizedClients = await DbService.getAuthorizedClients();

    // 2. Scraper: pedimos al crawler las vacantes configuradas por regiones,
    //    las cuales se extraen de los clientes ya cargados.
    const allowedRegions =
      DbService.extractRegionsFromClients(authorizedClients);

    // Medir duración del Scraping específicamente
    const scrapingStart = Date.now();
    const data = await scrapeVacantesMEP(allowedRegions);
    const scrapingMs = Date.now() - scrapingStart;

    if (data && data.length > 0) {
      logger.info(
        `📊 Scraping finalizado (${data.length} vacantes). Tiempo: ${formatDuration(scrapingMs)}`,
      );

      // 3. Filtrado/guardado en la base de datos.
      logger.info("🔍 Verificando duplicados en la base de datos...");
      const newData = await DbService.filterAndSaveNewVacancies(data);

      if (newData.length > 0) {
        logger.info(`✨ ${newData.length} nuevas vacantes detectadas.`);

        // 4. Guardar un respaldo en formato JSON con todas las vacantes extraídas
        await jsonExport(FILE_PATH, data);
      }

      // 5. Notificaciones por correo: pasamos los clientes ya cargados
      await notificationService.processNotificationsFromDB(
        { name: FILE_NAME, path: FILE_PATH },
        authorizedClients,
      );
    } else {
      // Si no hay vacantes nuevas, evitamos los pasos de export y mail.

      logger.warn("⚠️ No se encontraron vacantes en el scraping.");
    }

    const totalMs = Date.now() - startTime;
    logger.info(`✨ TIEMPO TOTAL DEL PROCESO: ${formatDuration(totalMs)}`);
  } catch (error) {
    // Cualquier excepción no manejada provoca la salida con código 1.
    await logger.error("❌ Error crítico en el flujo principal:", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
