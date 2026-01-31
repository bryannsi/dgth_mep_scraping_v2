import puppeteer from "puppeteer";
import { CONFIG } from "../config/config.js";
import {
  extractTableData,
  filterVacancies,
  getRegions,
} from "../helpers//helpers.js";

export async function scrapeVacantesMEP(keywords = []) {
  // 1. Normalize filters (Tu lógica original)
  let searchTerms = [];
  if (Array.isArray(keywords)) {
    searchTerms = keywords.map((f) => String(f).toUpperCase());
  } else if (typeof keywords === "string") {
    searchTerms = [keywords.toUpperCase()];
  }

  const browser = await puppeteer.launch(CONFIG.puppeteer);
  const page = await browser.newPage();

  try {
    await page.goto(CONFIG.scraper.url, { waitUntil: "networkidle2" });
    await page.waitForSelector("select");

    const regions = await getRegions(page);
    const results = [];

    for (const region of regions) {
      console.log(`📍 Procesando región: ${region.text}`);

      await page.select("select", region.value);

      // Wait for the table to load (Tu timeout original)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tableRows = await extractTableData(page);

      // Aplicar tu filtro original
      const filteredRows = filterVacancies(tableRows, searchTerms);

      console.log(
        `✨ ¡ÉXITO! Encontradas ${filteredRows.length} vacantes en ${region.text}`,
      );
      results.push(...filteredRows);
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
