import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseDate } from "../src/helpers/helpers.js";

test("Date Parsing with Real Data from vacantes_mep.json", async (t) => {
  const dataPath = path.join(process.cwd(), "data", "vacantes_mep.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const vacancies = JSON.parse(rawData);

  // Tomamos una muestra de las primeras 5 vacantes
  const sample = vacancies.slice(0, 5);

  for (const v of sample) {
    await t.test(`Parsing vacancy ${v.VACANTE} (RIGE: ${v.RIGE})`, () => {
      const date = parseDate(v.RIGE);

      assert.notStrictEqual(
        date,
        null,
        `La fecha no debería ser nula para ${v.RIGE}`,
      );

      // Verificamos que sea el día correcto en Costa Rica
      const localeDate = date.toLocaleDateString("es-CR", {
        timeZone: "America/Costa_Rica",
      });
      const [expectedDay, expectedMonth, expectedYear] = v.RIGE.split("/");

      // Formato locale suele ser D/M/YYYY o DD/MM/YYYY dependiendo del sistema
      // Normalizamos para comparar
      const parts = localeDate.split("/");
      assert.strictEqual(
        parseInt(parts[0]),
        parseInt(expectedDay),
        "Día incorrecto",
      );
      assert.strictEqual(
        parseInt(parts[1]),
        parseInt(expectedMonth),
        "Mes incorrecto",
      );
      assert.strictEqual(
        parseInt(parts[2]),
        parseInt(expectedYear),
        "Año incorrecto",
      );

      // Verificamos el offset UTC (debe ser 06:00 AM UTC para medianoche CR)
      assert.strictEqual(
        date.getUTCHours(),
        6,
        "El offset UTC debería ser 6 AM para representar medianoche CR",
      );
    });
  }
});

test("Edge cases and fallbacks", () => {
  assert.strictEqual(parseDate(""), null);
  assert.strictEqual(parseDate(null), null);

  // Test ISO fallback
  const isoDate = "2026-05-20";
  const parsedIso = parseDate(isoDate);
  assert.strictEqual(parsedIso.getUTCFullYear(), 2026);
  assert.strictEqual(parsedIso.getUTCMonth(), 4); // Mayo es 4
  assert.strictEqual(parsedIso.getUTCDate(), 20);
});
