import puppeteer from "puppeteer";

/**
 * Scrapea vacantes por región desde el sitio del MEP
 * @param {string[]} keywords Palabras clave para filtrar Especialidad (opcional)
 * @param {boolean} headless Ejecutar navegador sin UI
 */
export async function scrapeVacantesMEP(keywords = [], headless = "new") {
  // Normalizar keywords SIEMPRE como array
  if (!Array.isArray(keywords)) {
    keywords = typeof keywords === "string" ? [keywords] : [];
  }

  const browser = await puppeteer.launch({
    headless,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://apps.mep.go.cr/formulario", {
    waitUntil: "domcontentloaded",
  });

  // Esperar dropdown (selector dinámico)
  await page.waitForSelector("select");

  // Obtener todas las regiones del dropdown
  const regiones = await page.evaluate(() => {
    const select = document.querySelector("select");
    return Array.from(select.options)
      .filter((o) => o.value && o.value !== "0")
      .map((o) => ({
        value: o.value,
        text: o.textContent.trim(),
      }));
  });

  const resultados = [];

  for (const region of regiones) {
    console.log(`📍 Procesando región: ${region.text}`);

    // Cambiar región
    await page.select("select", region.value);

    // Esperar que la tabla cambie
    await page.waitForFunction(() => {
      const table = document.querySelector("table");
      return table && table.querySelectorAll("tbody tr").length > 0;
    });

    // Extraer tabla
    const filas = await page.evaluate(() => {
      const headers = Array.from(
        document.querySelectorAll("table thead th"),
      ).map((th) => th.textContent.trim());

      const rows = Array.from(document.querySelectorAll("table tbody tr"));

      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = cells[i]?.textContent.trim() || "";
        });
        return obj;
      });
    });

    // ✅ FILTRO CORRECTO (opcional)
    let filasFiltradas = [];

    filasFiltradas = filas.filter((row) => {
      // Sin filtro → todo pasa
      if (!keywords || keywords.length === 0) return true;

      return Object.entries(row).some(([key, value]) => {
        if (key !== "Especialidad") return false;
        return keywords.some((word) =>
          value.toUpperCase().includes(word.toUpperCase()),
        );
      });
    });

    console.log(`✔ ${filasFiltradas.length} resultados en ${region.text}`);

    resultados.push(...filasFiltradas);
  }

  await browser.close();

  return resultados;
}
