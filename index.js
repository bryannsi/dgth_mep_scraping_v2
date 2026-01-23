import { scrapeVacantesMEP } from "./src/scrapers/scraper.js";

const KEYWORDS = [];

(async () => {
  try {
    const allData = await scrapeVacantesMEP({ KEYWORDS: [] });
    console.log("📌 Resultado sin filtro:");
    console.dir(allData, { depth: 2 });
  } catch (e) {
    console.error("Error principal:", e);
  }
})();
