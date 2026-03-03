import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config/config.js";
import { scrapeVacantesMEP } from "./scrapers/scraper.js";
import { DbService } from "./services/dbService.js";
import { jsonExport } from "./services/exportService.js";
import { NotificationService } from "./services/notificationService.js";
import { TemplateService } from "./services/templateService.js";

const OUTPUT_DIR = path.join(process.cwd(), "build", "data");
fs.mkdirSync(OUTPUT_DIR, { recursive: true }); // crea build/data si no existe

const FILE_NAME = "vacantes_mep.json";
const FILE_PATH = path.join(OUTPUT_DIR, FILE_NAME);

async function main() {
  console.log("🚀 Iniciando MEP Scraping Service...");
  const startTime = Date.now();
  // Indicar si estamos corriendo en desarrollo o producción
  console.log(`🔧 Modo: ${CONFIG.isProd ? "PRODUCCIÓN" : "DESARROLLO"}`);

  // 1. Inicializar los servicios que se usarán en todo el flujo. El
  //    templateService decide qué configuración de plantillas usar según
  //    NODE_ENV y es necesario para las notificaciones.
  const templateService = new TemplateService();
  const notificationService = new NotificationService(templateService);

  try {
    // 2. Scraper: pedimos al crawler las vacantes configuradas por regiones,
    //    las cuales se obtienen de todos los templates. Esto para no hacer scraping
    //    de regiones que no nos interesan o no tenemos templates.
    //    Si no hay regiones configuradas, el scraper buscará en todas las regiones.
    const allowedRegions = templateService.getAllRegions();
    const data = await scrapeVacantesMEP(allowedRegions);

    //****DATOS DE PRUEBA */
    // const { default: data } = await import("./data/vacantes_mep.json", {
    //   with: { type: "json" },
    // });
    //** */
    if (data && data.length > 0) {
      console.log(`📊 Se encontraron ${data.length} vacantes en total.`);

      // 3. Filtrado/guardado en la base de datos. Este método guarda y retorna sólo
      //    las vacantes nuevas que no existían antes (identificadas por el
      //    campo VACANTE/mepId). Los duplicados se omiten aquí.
      console.log("🔍 Verificando duplicados en la base de datos...");
      const newData = await DbService.filterAndSaveNewVacancies(data);

      if (newData.length > 0) {
        console.log(`✨ ${newData.length} nuevas vacantes detectadas.`);

        // 4. Guardar un respaldo en formato JSON con todas las vacantes extraídas
        jsonExport(FILE_PATH, data);
      }

      // 5. Notificaciones por correo: se trabaja únicamente con las
      //    vacantes nuevas (newData) y se aplica el filtrado de keywords
      //    dentro de NotificationService.
      await notificationService.processNotificationsFromDB({
        name: FILE_NAME,
        path: FILE_PATH,
      });
    } else {
      // Si no hay vacantes nuevas, evitamos los pasos de export y mail.

      console.log("⚠️ No se encontraron vacantes en el scraping.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Proceso finalizado con éxito en ${duration}s`);
  } catch (error) {
    // Cualquier excepción no manejada provoca la salida con código 1.
    console.error("❌ Error crítico en el flujo principal:");
    console.error(error.message);
    process.exit(1);
  }
}

main();
