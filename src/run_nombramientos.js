import { NombramientosService } from "./services/nombramientosService.js";
import { logger } from "./services/loggerService.js";

async function main() {
  const args = process.argv.slice(2);
  const mepId = args[0];
  const year = args[1] || "2026";

  if (!mepId) {
    logger.error("❌ Por favor provee el ID de la vacante.");
    console.log("Uso: npm run scrape-nombramiento <mepId> [year]");
    console.log("Ejemplo: npm run scrape-nombramiento 1505623 2026");
    process.exit(1);
  }

  logger.info(`🚀 Ejecutando módulo de scraping manual para vacante: ${mepId}, año: ${year}`);
  const result = await NombramientosService.processNombramiento(mepId, year);
  
  if (result.success) {
    logger.info(`✅ Fin de ejecución exitosa: ${result.message}`);
    if (result.data) {
      console.log("\n📦 DATOS DEL NOMBRAMIENTO:");
      console.dir(result.data, { depth: null });
    }
  } else {
    logger.error(`❌ Fin de ejecución con fallos: ${result.error}`);
  }
  process.exit(0);
}

main();
