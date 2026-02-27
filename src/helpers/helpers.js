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
    // Definimos la función de normalización localmente dentro del navegador
    const normalizeValue = (str) => {
      if (!str) return "";
      return str
        .toString()
        .replace(/\u00a0/g, " ") // Cambia espacios raros de HTML por espacios normales
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
    };

    const headers = Array.from(document.querySelectorAll("table thead th")).map(
      (th) => normalizeValue(th.textContent),
    );

    const rows = Array.from(document.querySelectorAll("table tbody tr"));

    return rows
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const obj = {};
        headers.forEach((header, index) => {
          const key = header || `COL_${index}`;
          obj[header] = cells[index]?.textContent.trim() || "";
        });
        return obj;
      })
      .filter((row) => row.VACANTE && row.VACANTE !== "");
  });
}

/** Aplica el filtro de palabras clave a las filas encontradas */
export function filterVacancies(rows, searchTerms, allowedRegions = []) {
  // Si no hay filtros, devolver todo (comportamiento original, aunque raro si no hay keywords)
  if (!searchTerms?.length && !allowedRegions?.length) return rows;

  const normalizedSearchTerms = searchTerms
    ? searchTerms.map(normalizeValue)
    : [];
  const normalizedRegions = allowedRegions
    ? allowedRegions.map(normalizeValue)
    : [];

  return rows.filter((row) => {
    // Accedemos a la llave estandarizada en la extracción
    const originalValue = row.ESPECIALIDAD || "";
    const cleanValue = normalizeValue(originalValue);

    // Compara el texto limpio de la web contra tus términos limpios
    // 1. Filtro por Keywords (Specialty) - Solo si hay keywords definidas
    const matchesKeyword =
      normalizedSearchTerms.length === 0 ||
      normalizedSearchTerms.some((term) => cleanValue.includes(term));

    // 2. Filtro por Región - Solo si hay regiones definidas
    // Si no se especifican regiones, asumimos que TODAS son válidas (no filtra por región)
    // Nota: "Dirección Regional" se normaliza a "DIRECCION REGIONAL"
    const rowRegion = normalizeValue(
      row["DIRECCION REGIONAL"] || row["REGION"] || "",
    );
    const matchesRegion =
      normalizedRegions.length === 0 ||
      normalizedRegions.some((reg) => rowRegion.includes(reg));

    // Si ambos filtros están vacíos, devuelve true (todo match).
    // Si uno está vacío, ese filtro es true y solo depende del otro.
    return matchesKeyword && matchesRegion;
  });
}

const normalizeValue = (str) => {
  if (!str) return "";
  return str
    .toString()
    .replace(/\u00a0/g, " ") // Cambia espacios raros de HTML por espacios normales
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .toUpperCase();
};

/**
 * Helper para parsear fechas en formato DD/MM/YYYY (común en CR/MEP) o YYYY-MM-DD.
 * Asegura el offset de Costa Rica (-06:00) para evitar desfases de día en entornos UTC.
 * @param {string} dateStr - Fecha en texto.
 * @returns {Date|null} - Objeto Date o null si es inválida.
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  // Si está como DD/MM/YYYY
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    // Usamos el offset explícito de Costa Rica (-06:00) para evitar que
    // al correr en GitHub Actions (UTC) se guarde como el día anterior.
    return new Date(`${year}-${month}-${day}T00:00:00.000-06:00`);
  }
  // Fallback si es otro formato que JS entienda directamente
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
