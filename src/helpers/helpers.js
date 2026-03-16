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
export function filterVacancies(
  rows,
  searchTerms,
  allowedRegions = [],
  allowedJobClasses = [],
) {
  // Si no hay filtros, devolver todo (comportamiento original)
  if (
    !searchTerms?.length &&
    !allowedRegions?.length &&
    !allowedJobClasses?.length
  )
    return rows;

  const normalizedSearchTerms = searchTerms
    ? searchTerms.map(normalizeValue)
    : [];
  const normalizedRegions = allowedRegions
    ? allowedRegions.map(normalizeValue)
    : [];
  const normalizedJobClasses = allowedJobClasses
    ? allowedJobClasses.map(normalizeValue)
    : [];

  return rows.filter((row) => {
    // 1. Filtro por Keywords (Specialty) - Solo si hay keywords definidas
    const originalValue = row.ESPECIALIDAD || row.especialidad || "";
    const cleanValue = normalizeValue(originalValue);
    const matchesKeyword =
      normalizedSearchTerms.length === 0 ||
      normalizedSearchTerms.some((term) => cleanValue.includes(term));

    // 2. Filtro por Región - Solo si hay regiones definidas
    const rowRegion = normalizeValue(
      row["DIRECCION REGIONAL"] || row["REGION"] || row.regional || "",
    );
    const matchesRegion =
      normalizedRegions.length === 0 ||
      normalizedRegions.some((reg) => rowRegion.includes(reg));

    // 3. Filtro por Clase de Puesto - Solo si hay clases definidas
    const rowJobClass = normalizeValue(
      row["CLASE PUESTO"] || row["CLASE_PUESTO"] || row.clasePuesto || "",
    );
    const matchesJobClass =
      normalizedJobClasses.length === 0 ||
      normalizedJobClasses.some((jc) => rowJobClass.includes(jc));

    // Si todos los filtros activos coinciden (o están vacíos), devuelve true.
    return matchesKeyword && matchesRegion && matchesJobClass;
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
 * Convierte milisegundos a una cadena legible usando la API nativa Intl. DurationFormat
 * @param {number} ms - Milisegundos a formatear
 * @returns {string} - Tiempo formateado (ej: "2 min 15 s")
 */
export function formatDuration(ms) {
  const secondsTotal = Math.floor(ms / 1000);
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = secondsTotal % 60;

  try {
    // Nota: Intl.DurationFormat requiere Node.js 22.0.0+
    return new Intl.DurationFormat("es", {
      style: "short",
      values: "numeric", // Evita mostrar 0 min si no hay minutos
    }).format({ minutes, seconds });
  } catch (e) {
    // Fallback simple por si el entorno no soporta la API todavía
    return minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
  }
}

const FORMATTERS = {
  "es-CR": new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  "en-CA": new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }),
};

/**
 * Clase personalizada que extiende Date para soportar formateo automático
 * según el locale especificado al convertir a string.
 */
class SmartDate extends Date {
  constructor(input, locale = "es-CR") {
    // formatDate original usaba "hoy" si el input era null/undefined
    const dateVal = input === null || input === undefined ? Date.now() : input;
    super(dateVal);
    this.locale = locale;
  }

  // Sobrescribimos toString para que al concatenar o llamar .toString()
  // devuelva el formato deseado automáticamente.
  toString() {
    if (isNaN(this.getTime())) return "N/A";
    return (
      FORMATTERS[this.locale]?.format(this) ||
      super.toLocaleDateString(this.locale, { timeZone: "America/Costa_Rica" })
    );
  }
}

/**
 * Función unificada para parsear y formatear fechas.
 * Retorna un objeto Date inteligente que se comporta como string al mostrarse.
 * @param {any} input - Fecha en texto, objeto Date o null.
 * @param {string} locale - Locale para el formateo (ej: 'es-CR', 'en-CA').
 * @returns {SmartDate} - Instancia de SmartDate (hereda de Date).
 */
export function smartFormatDate(input, locale = "es-CR") {
  let dateValue = input;
  // Soporte para DD/MM/YYYY, DD-MM-YYYY y YYYY-MM-DD con offset CR (-06:00)
  if (typeof input === "string") {
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(input)) {
      const [d, m, y] = input.split(/[/-]/);
      dateValue = `${y}-${m}-${d}T00:00:00.000-06:00`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      dateValue = `${input.substring(0, 10)}T00:00:00.000-06:00`;
    }
  }
  return new SmartDate(dateValue, locale);
}

