import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config/config.js";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { jsonExport } from "./services/exportService.js";
import { sendEmail } from "./services/mailService.js";
import { createHtmlTable } from "./services/renderService.js";
import TemplateService from "./services/templateService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "data");
const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

async function main() {
  console.log("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();
  console.log(`🚀 Iniciando búsqueda con: ${CONFIG.scraper.keywords.join(", ")}`);
  try {
    const data = await scrapeVacantesMEP(CONFIG.scraper.keywords);

    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      // 1. Guardar JSON
      jsonExport(FILE_PATH, data);

      // 2. Crear Tabla HTML
      const tablaHTML = createHtmlTable(data);

      // 3. Preparar Template
      const engine = new TemplateService();
      const mailContent = engine.getMailTemplate(
        "template1",
        { name: FILE_NAME, path: FILE_PATH },
        tablaHTML,
      );

      // 4. Enviar Correo
      console.log("📧 Enviando correo...");
      const result = await sendEmail(mailContent);
      if (result.accepted.length > 0) {
        console.log(
          `✅ Correo enviado exitosamente a: ${CONFIG.mail.destination}`,
        );
      }
      console.log("✅ Proceso completado con éxito.");
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
