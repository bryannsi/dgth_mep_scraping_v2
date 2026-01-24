import puppeteer from "puppeteer";
import { MEP_URL, PUPPETEER_CONFIG } from "../config//config.js";
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

  const browser = await puppeteer.launch(PUPPETEER_CONFIG());
  const page = await browser.newPage();

  try {
    await page.goto(MEP_URL, { waitUntil: "networkidle2" });
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

      console.log(`✔ ${filteredRows.length} results in ${region.text}`);
      results.push(...filteredRows);
    }

    return results;
  } catch (err) {
    console.error("Error during scraping:", err);
    return [];
  } finally {
    await browser.close();
  }
}
