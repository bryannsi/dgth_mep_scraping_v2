import { scrapeVacantesMEP } from "./scrapers/scraper.js";

// const keywords = ["RED", "INFORMÁTICA", "SOFTWARE", "DISPOSITIVO", "SEGURIDAD"];
const keywords = []
scrapeVacantesMEP(keywords)
  .then((vacantes) => {
    console.log("\n--- RESULTADOS ---");
    console.dir(vacantes);
  })
  .catch((err) => console.error(err));
