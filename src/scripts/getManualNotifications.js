import fs from 'fs';
import path from 'path';
import { ManualNotificationService } from '../services/manualNotificationService.js';
import { logger } from '../services/loggerService.js';

/**
 * Script for manual notification data extraction.
 * Outputs the results to a JSON file and the console.
 */
async function main() {
  try {
    const results = await ManualNotificationService.getPendingNotificationsJSON();

    if (!results.success) {
      console.error("❌ Falló el proceso manual:", results.message);
      process.exit(1);
    }

    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const fileName = `manual_notifications_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');

    console.log("\n========================================================");
    console.log(`✅ EXTRACCIÓN COMPLETADA`);
    console.log(`📂 Archivo generado: ${filePath}`);
    console.log(`📊 Clientes con vacantes: ${results.totalClientsWithMatches}`);
    console.log(`📑 Total vacantes encontradas: ${results.totalVacanciesFound}`);
    console.log("========================================================\n");

    if (results.totalVacanciesFound > 0) {
      console.log("Resumen por cliente:");
      for (const [tpl, data] of Object.entries(results.data)) {
        console.log(`- ${tpl} (${data.clientName}): ${data.vacancyCount} vacantes`);
      }
    } else {
      console.log("ℹ️ No se encontraron nuevas vacantes para notificar.");
    }

  } catch (error) {
    logger.error("🚨 Error ejecutando el script manual:", error);
    process.exit(1);
  }
}

main();
