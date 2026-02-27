import path from "node:path";
import { CONFIG } from "./config/config.js";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { DbService } from "./services/dbService.js";
import { jsonExport } from "./services/exportService.js";
import { NotificationService } from "./services/notificationService.js";
import TemplateService from "./services/templateService.js";

const __dirname = import.meta.dirname;
const OUTPUT_DIR = path.join(__dirname, "data");
const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

async function main() {
  console.log("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();

  // 1. Selección de templates desde la configuración centralizada
  const templateConfig = CONFIG.templates;

  console.log(`🔧 Modo: ${CONFIG.isProd ? "PRODUCCIÓN" : "DESARROLLO"}`);

  // 2. Inicializar Servicios con la configuración inyectada
  const templateService = new TemplateService(templateConfig);
  const notificationService = new NotificationService(templateService);

  try {
    const allowedRegions = templateService.getAllRegions();
    const data = await scrapeVacantesMEP(allowedRegions);

    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      // 2. Deduplicación en DB (PostgreSQL)
      console.log("🔍 Verificando duplicados en la base de datos...");
      const newData = await DbService.filterAndSaveNewVacancies(data);

      if (newData.length > 0) {
        console.log(`✨ ${newData.length} nuevas vacantes detectadas.`);

        // 3. Guardar JSON (Opcional, de respaldo)
        jsonExport(FILE_PATH, data);

        // 4. Procesar Notificaciones
        await notificationService.processNotifications(newData, {
          name: FILE_NAME,
          path: FILE_PATH,
        });
      } else {
        console.log("😴 No hay vacantes nuevas para notificar.");
      }
    } else {
      console.log("⚠️ No se encontraron vacantes en el scraping.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Proceso finalizado con éxito en ${duration}s`);
  } catch (error) {
    console.error("❌ Error crítico en el flujo principal:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
