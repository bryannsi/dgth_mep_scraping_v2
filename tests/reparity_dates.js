import { smartFormatDate } from "../src/helpers/helpers.js";

// --- IMPLEMENTACIONES VIEJAS ---
function old_parseDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00.000-06:00`);
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function old_formatDate(date = null, locale = "es-CR", options = {}) {
  const finalDate =
    date !== null && date !== undefined ? new Date(date) : new Date();
  if (isNaN(finalDate.getTime()) && date !== null && date !== undefined)
    return "N/A";
  const baseOptions = {
    timeZone: "America/Costa_Rica",
    ...(locale === "es-CR"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : {}),
    ...options,
  };
  return finalDate.toLocaleDateString(locale, baseOptions);
}

// --- UTILIZANDO LA IMPLEMENTACIÓN REAL ---
// (Ya importada arriba)

// --- TESTS DE PARIDAD ---
const testCases = [
  { name: "Fecha DD/MM/YYYY", input: "20/03/2024" },
  { name: "Fecha ISO", input: "2024-03-20T15:00:00Z" },
  { name: "Fecha Objeto Date", input: new Date("2024-03-20T15:00:00Z") },
  { name: "Input Null (Expect Today)", input: null },
  { name: "Input Undefined (Expect Today)", input: undefined },
  { name: "Input String Invalido", input: "esto no es una fecha" },
  { name: "Locale en-CA", input: "20/03/2024", locale: "en-CA" },
];

console.log("--- TEST DE PARIDAD (VIEJO vs NUEVO) ---");
console.log("-----------------------------------------");

testCases.forEach((c) => {
  const oldStr = old_formatDate(c.input, c.locale || "es-CR");
  const smartObj = smartFormatDate(c.input, c.locale || "es-CR");
  const smartStr = smartObj.toString();

  const statusStr = oldStr === smartStr ? "✅" : "❌";

  console.log(`[${c.name}]`);
  console.log(`  Input:  ${c.input}`);
  console.log(`  Viejo:  "${oldStr}"`);
  console.log(`  Nuevo:  "${smartStr}" (via .toString())`);
  console.log(`  Nuevo sin toString():  "${smartObj}"`);
  console.log(`  Match:  ${statusStr}`);

  // Verificar que sea instancia de Date
  const isDate = smartObj instanceof Date;
  console.log(`  Es Obj Date: ${isDate ? "✅" : "❌"}`);

  // Comparación con parseDate (solo si no es null/invalido ya que parseDate retorna null)
  if (
    (c.input && !isNaN(new Date(c.input).getTime())) ||
    (typeof c.input === "string" && c.input.includes("/"))
  ) {
    const oldDateObj = old_parseDate(c.input);
    const diff = Math.abs(oldDateObj.getTime() - smartObj.getTime());
    console.log(
      `  Paridad con parseDate (time diff): ${diff === 0 ? "✅" : "❌ (" + diff + "ms)"}`,
    );
  }
  console.log("-----------------------------------------");

});

// Caso especial: DbService.js necesita saber si la fecha es válida para el fallback "|| new Date()"
console.log("[Especial DbService: Fallback]");
const inputVacio = null;
const smartVacio = smartFormatDate(inputVacio);
// Si es null, smartFormatDate(null) devuelve "Hoy" (para match con formatDate).
// Pero parseDate(null) devolvía null.
console.log(
  `smartFormatDate(null) es hoy? ${!isNaN(smartVacio.getTime()) ? "✅" : "❌"}`,
);
