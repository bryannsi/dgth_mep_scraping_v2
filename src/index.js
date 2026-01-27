import path from "path";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { jsonExport } from "./services/exportService.js";


const OUTPUT_DIR = "./data";
const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

const keywords = ["RED", "INFORMÁTICA", "SOFTWARE", "DISPOSITIVO", "SEGURIDAD"];
// const keywords = [];
async function main() {
  console.log("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();

  try {
    const data = await scrapeVacantesMEP(keywords);

    // 3. Validar y Exportar
    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      jsonExport(FILE_PATH, data);
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
