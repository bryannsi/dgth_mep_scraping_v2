import path from "path";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
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

  // 1. Inicializar Servicios
  const templateService = new TemplateService();
  const notificationService = new NotificationService(templateService);

  try {
    const data = await scrapeVacantesMEP();

    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      // 3. Guardar JSON
      jsonExport(FILE_PATH, data);

      // 4. Procesar Notificaciones (Filtrar, Generar HTML, Enviar Correos)
      await notificationService.processNotifications(data, {
        name: FILE_NAME,
        path: FILE_PATH,
      });
    } else {
      console.log(
        "⚠️ No se encontraron vacantes que coincidan con los criterios.",
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Proceso finalizado con éxito en ${duration}s`);
  } catch (error) {
    console.error("❌ Error crítico en el flujo principal:");
    console.error(error.message);

    // Salir con código de error para que GitHub Actions marque el Job como fallido
    process.exit(1);
  }
}

main();
