import { formatDateCR, getTodayInLocale } from "../src/helpers/helpers.js";

/**
 * Propuesta de función combinada
 */
function formatDateUnified(date = null, locale = "es-CR", options = {}) {
  const finalDate = date ? new Date(date) : new Date();

  if (isNaN(finalDate.getTime()) && date !== null) return "N/A";

  const baseOptions = {
    timeZone: "America/Costa_Rica",
    ...(locale === "es-CR"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : {}),
    ...options,
  };

  return finalDate.toLocaleDateString(locale, baseOptions);
}

const testDate = "2026-12-30T00:00:00.000-06:00";

console.log("--- TEST DE PARIDAD DE FECHAS ---");

// 1. Caso Display CR (Mismo que formatDateCR)
const res1_old = formatDateCR(testDate);
const res1_new = formatDateUnified(testDate, "es-CR");
console.log(
  `[Display CR] Original: ${res1_old} | Unificado: ${res1_new} | Match: ${res1_old === res1_new}`,
);

// 2. Caso DB ISO (Mismo que getTodayInLocale)
const res2_old = getTodayInLocale("en-CA");
const res2_new = formatDateUnified(null, "en-CA");
console.log(
  `[DB ISO Today] Original: ${res2_old} | Unificado: ${res2_new} | Match: ${res2_old === res2_new}`,
);

// 3. Caso Fecha Invalida
const res3_new = formatDateUnified("asdf", "es-CR");
console.log(`[Invalid Date] Unificado: ${res3_new} (Esperado: N/A)`);

// 4. Caso Hoy en CR explicitly
const res4_new = formatDateUnified(null, "es-CR");
console.log(`[Today Display] Unificado: ${res4_new}`);
