import puppeteer from "puppeteer";

export async function scrapeVacantesMEP(keywords = [], mode = "new") {
  // 1. Normalize filters
  let searchTerms = [];
  if (Array.isArray(keywords)) {
    searchTerms = keywords.map((f) => String(f).toUpperCase());
  } else if (typeof keywords === "string") {
    searchTerms = [keywords.toUpperCase()];
  }

  const browser = await puppeteer.launch({
    headless: mode,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  try {
    await page.goto("https://apps.mep.go.cr/formulario", {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector("select");

    const regions = await page.evaluate(() => {
      const select = document.querySelector("select");
      return Array.from(select.options)
        .filter((option) => option.value && option.value !== "0")
        .map((option) => ({
          value: option.value,
          text: option.textContent.trim(),
        }));
    });

    const results = [];

    for (const region of regions) {
      console.log(`📍 Procesando región: ${region.text}`);

      await page.select("select", region.value);

      // Wait for the table to load (prevents empty results)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tableRows = await page.evaluate(() => {
        const headers = Array.from(
          document.querySelectorAll("table thead th"),
        ).map((header) => header.textContent.trim());

        const rows = Array.from(document.querySelectorAll("table tbody tr"));

        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = cells[index]?.textContent.trim() || "";
          });
          return obj;
        });
      });

      // 2. Filter with validation of existence of Specialty
      const filteredRows = tableRows.filter((row) => {
        if (searchTerms.length === 0) return true;

        const specialty = row["Especialidad"]
          ? String(row["Especialidad"]).toUpperCase()
          : "";

        return searchTerms.some((term) => specialty.includes(term));
      });

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
