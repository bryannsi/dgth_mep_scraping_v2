import puppeteer from "puppeteer";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function matchesEspecialidadFilter(row, keywords) {
  if (!keywords || keywords.length === 0) return true;

  const especialidad = row["Especialidad"] ?? "";
  if (!especialidad) return false;

  return keywords.some((word) =>
    especialidad.toUpperCase().includes(word.toUpperCase()),
  );
}

export async function scrapeVacantesPorRegion({
  keywords = [],
  headless = "new",
  selectTimeout = 10000,
} = {}) {
  const browser = await puppeteer.launch({
    headless,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (type === "image" || type === "font") req.abort();
    else req.continue();
  });

  try {
    await page.goto("https://apps.mep.go.cr/formulario", {
      waitUntil: "networkidle2",
      timeout: 0,
    });

    await page.waitForSelector("#regionalSelect", { timeout: 15000 });

    const regionales = await page.$$eval("#regionalSelect option", (opts) =>
      opts
        .filter((o) => o.value && o.value !== "0")
        .map((o) => ({ value: o.value, text: o.innerText.trim() })),
    );

    const resultados = [];

    for (const regional of regionales) {
      console.log(`🔎 ${regional.text}`);

      const prevFirstCell = await page.evaluate(() => {
        const td = document.querySelector(".mud-table-root tbody tr td");
        return td?.innerText.trim() ?? null;
      });

      await page.select("#regionalSelect", regional.value);

      await page.waitForSelector(".mud-table-root", { timeout: 15000 });

      try {
        await page.waitForFunction(
          (prev) => {
            const td = document.querySelector(".mud-table-root tbody tr td");
            return (td?.innerText.trim() ?? null) !== prev;
          },
          { timeout: selectTimeout },
          prevFirstCell,
        );
      } catch {
        // puede no cambiar si queda vacía → seguimos
      }

      // ✅ reemplazo de waitForTimeout
      await delay(500);

      const rows = await page.evaluate(() => {
        const table = document.querySelector(".mud-table-root");
        if (!table) return [];

        const headers = [...table.querySelectorAll("thead th")].map((h) =>
          h.innerText.trim(),
        );

        return [...table.querySelectorAll("tbody tr")].map((tr) => {
          const obj = {};
          [...tr.querySelectorAll("td")].forEach((td, i) => {
            const key =
              headers[i] || td.getAttribute("data-label") || `col_${i}`;
            obj[key] = td.innerText.trim();
          });
          return obj;
        });
      });

      const filtradas = rows.filter((r) =>
        matchesEspecialidadFilter(r, keywords),
      );

      resultados.push({
        regional: regional.text,
        total: rows.length,
        filtradas,
      });

      console.log("filtradas:", JSON.stringify(filasFiltradas, null, 2));

    }

    return resultados;
  } finally {
    await browser.close();
  }
}
