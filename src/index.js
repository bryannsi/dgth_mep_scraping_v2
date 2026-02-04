import path from "path";
import { filterVacancies } from "./helpers/helpers.js";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { jsonExport } from "./services/exportService.js";
import { sendEmail } from "./services/mailService.js";
import { createHtmlTable } from "./services/renderService.js";
import TemplateService from "./services/templateService.js";

const __dirname = import.meta.dirname;
const OUTPUT_DIR = path.join(__dirname, "data");
const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

async function main() {
  console.log("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();

  // 1. Obtener todas las keywords de todos los templates
  const templateService = new TemplateService();
  const templates = templateService.templates;
  const allKeywords = [
    ...new Set(Object.values(templates).flatMap((t) => t.keywords || [])),
  ];

  console.log(`🚀 Iniciando búsqueda con: ${allKeywords.join(", ")}`);

  try {
    const data = await scrapeVacantesMEP(allKeywords);

    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      // 1. Guardar JSON
      jsonExport(FILE_PATH, data);

      // 2. Preparar envíos en paralelo usando Promise.all
      const emailPromises = Object.entries(templates).map(
        async ([tplName, tplConfig]) => {
          const tplKeywords = tplConfig.keywords || [];
          const tplRegions = tplConfig.regions || [];
          const filteredData = filterVacancies(data, tplKeywords, tplRegions);

          if (filteredData.length > 0) {
            console.log(
              `\n📨 Procesando "${tplName}" (${filteredData.length} vacantes)...`,
            );

            // Crear Tabla HTML
            const tablaHTML = createHtmlTable(filteredData);

            // Preparar Template
            const mailContent = templateService.getMailTemplate(
              tplName,
              { name: FILE_NAME, path: FILE_PATH },
              tablaHTML,
            );

            //4. Enviar Correo
            console.log(`📧 Enviando correo para ${tplName}...`);
            const result = await sendEmail(mailContent);
            if (result.accepted.length > 0) {
              console.log(`✅ Correo enviado a: ${tplConfig.to}`);
            }
            return { tplName, success: true };
          } else {
            console.log(
              `\n⚠️ "${tplName}" no tuvo coincidencias. Saltando envio.`,
            );
            return { tplName, success: false, reason: "no_matches" };
          }
        },
      );

      // Ejecutar todos los envíos en paralelo
      await Promise.all(emailPromises);

      console.log("\n✅ Proceso de envío completado.");
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
