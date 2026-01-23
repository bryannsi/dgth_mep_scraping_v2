import { scrapeVacantesMEP } from "./src/scrapers/scraper.js";

const keywords = ["MATEMÁTICA", "INFORMÁTICA"];

scrapeVacantesMEP(keywords, false)
  .then((vacantes) => {
    console.log("\n--- RESULTADOS ---");
    console.dir(vacantes);
  })
  .catch((err) => console.error(err));
