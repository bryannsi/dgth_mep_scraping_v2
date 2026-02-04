import puppeteer from "puppeteer";
import { CONFIG } from "../config/config.js";
import { extractTableData, getRegions } from "../helpers//helpers.js";

export async function scrapeVacantesMEP() {
  const browser = await puppeteer.launch(CONFIG.puppeteer);
  const page = await browser.newPage();

  try {
    await page.goto(CONFIG.scraper.url, { waitUntil: "networkidle2" });
    await page.waitForSelector("select");

    const regions = await getRegions(page);
    const results = [];
    const seenIds = new Set();

    for (const region of regions) {
      console.log(`📍 Procesando región: ${region.text}`);

      await page.select("select", region.value);

      // Wait for the table to load (Tu timeout original)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tableRows = await extractTableData(page);

      // Filtrar duplicados y actualizar la lista de IDs vistos
      const newVacancies = tableRows.filter(
        (row) => row.VACANTE && !seenIds.has(row.VACANTE),
      );
      newVacancies.forEach((row) => seenIds.add(row.VACANTE));
      results.push(...newVacancies);

      console.log(
        `✨ ¡ÉXITO! Encontradas ${tableRows.length} vacantes en ${region.text} (${newVacancies.length} nuevas)`,
      );
      // if (filteredRows.length > 0) {
      //   console.log(
      //     `✨ ¡ÉXITO! Encontradas ${filteredRows.length} vacantes en ${region.text}`,
      //   );
      //   results.push(...filteredRows);

      //   // --- LÓGICA DE SALIDA RÁPIDA ---
      //   console.log("🛑 Deteniendo búsqueda para prueba rápida...");
      //   break; // <--- Sale del bucle for ni bien encuentra algo
      // } else {
      //   console.log(`❌ Sin coincidencias en ${region.text}`);
      // }
    }

    return results;
  } catch (err) {
    console.error("Error during scraping:", err);
    return [];
  } finally {
    await browser.close();
  }
}
