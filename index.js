import { scrapeVacantesPorRegion } from "./src/services/scraperService.js";

const KEYWORDS = [];

(async () => {
  try {
    // Ejemplo 1: sin filtro -> trae TODO
    const allData = await scrapeVacantesPorRegion({ KEYWORDS: [] });
    console.log("📌 Resultado sin filtro:");
    console.dir(allData, { depth: 2 });
    
  } catch (e) {
    console.error("Error principal:", e);
  }
})();
