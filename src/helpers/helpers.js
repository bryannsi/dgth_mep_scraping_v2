/** Obtiene la lista de regiones del selector */
export async function getRegions(page) {
  return await page.evaluate(() => {
    const select = document.querySelector("select");
    return Array.from(select.options)
      .filter((option) => option.value && option.value !== "0")
      .map((option) => ({
        value: option.value,
        text: option.textContent.trim(),
      }));
  });
}

/** Extrae los datos de la tabla visible en la página */
export async function extractTableData(page) {
  return await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll("table thead th")).map(
      (header) => header.textContent.trim(),
    );

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
}

/** Aplica el filtro de palabras clave a las filas encontradas */
export function filterVacancies(rows, searchTerms) {
  if (searchTerms.length === 0) return rows;

  return rows.filter((row) => {
    // Usamos optional chaining y aseguramos que sea string
    const specialty = row.Especialidad?.toString().toUpperCase() || "";
    return searchTerms.some((term) => specialty.includes(term));
  });
}
