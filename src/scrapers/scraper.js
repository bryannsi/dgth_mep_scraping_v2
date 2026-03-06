import puppeteer from "puppeteer";
import { CONFIG } from "../config/config.js";
import { extractTableData, getRegions } from "../helpers//helpers.js";
import { logger } from "../services/loggerService.js";

export async function scrapeVacantesMEP(allowedRegions = []) {
  const browser = await puppeteer.launch(CONFIG.puppeteer);
  const page = await browser.newPage();

  try {
    await page.goto(CONFIG.scraper.url, { waitUntil: "networkidle2" });
    // Obtener TODAS las regiones del sitio
    await page.waitForSelector("select");

    const regions = await getRegions(page);
    const results = [];
    const seenIds = new Set();

    // Asegurar un array válido (defensa contra null/undefined)
    const regionsList = Array.isArray(allowedRegions) ? allowedRegions : [];

    // Si hay filtros, se seleccionan regiones específicas; si no, se procesan TODAS las regiones del sitio
    const regionsToProcess =
      regionsList.length > 0
        ? regions.filter((r) => {
            const normalizedText = r.text.toUpperCase();
            return regionsList.some((allowed) =>
              normalizedText.includes(allowed.toUpperCase()),
            );
          })
        : regions; // Fallback: todas las regionales encontradas en el selector del MEP

    if (regionsList.length > 0) {
      logger.info(
        `🎯 Filtrando scraping para regiones: ${regionsList.join(", ")}`,
      );
      logger.info(`✅ ${regionsToProcess.length} regiones coinciden.`);
    }

    for (const region of regionsToProcess) {
      logger.info(`📍 Procesando región: ${region.text}`);

      // Usar evaluate para asegurar que se dispare el evento 'change' (necesario en algunos entornos Blazor)
      await page.evaluate((val) => {
        const select =
          document.querySelector("#regionalSelect") ||
          document.querySelector("select");
        if (select) {
          select.value = val;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, region.value);

      // Pagination loop
      let hasNextPage = true;
      let pageNum = 1;

      while (hasNextPage) {
        logger.info(`📄 Procesando página ${pageNum} de ${region.text}`);

        // Implementación Mejora A: Espera reactiva
        try {
          await page.waitForFunction(
            () => {
              const rows = document.querySelectorAll("table tbody tr");
              return rows.length > 0;
            },
            { timeout: 10000 },
          );
          // Pequeño buffer para permitir estabilización del DOM tras el renderizado reactivo
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.warn(
            `⚠️ Timeout esperando renderizado de la tabla en página ${pageNum}.`,
          );
        }

        const tableRows = await extractTableData(page);

        // Mitigación de fragilidad HTML: Validación de cabeceras en primera página
        if (pageNum === 1 && tableRows.length > 0) {
          const sampleRow = tableRows[0];
          if (!("VACANTE" in sampleRow) || !("CLASE DE PUESTO" in sampleRow)) {
            logger.error(
              `❌ ALERTA CRÍTICA: La estructura de la tabla HTML ha cambiado. Columnas clave no encontradas.`,
            );
            logger.error(
              `Cabeceras detectadas: ${Object.keys(sampleRow).join(", ")}`,
            );
            logger.error(
              `Se aborta el scraping de esta región para proteger la base de datos.`,
            );
            break; // Salimos del while para saltar a la siguiente región/terminar
          }
        }

        // Filtrar duplicados y actualizar la lista de IDs vistos
        const newVacancies = tableRows.filter(
          (row) => row.VACANTE && !seenIds.has(row.VACANTE),
        );
        newVacancies.forEach((row) => seenIds.add(row.VACANTE));

        const mappedVacancies = newVacancies.map((row) => {
          // Mapear los campos segun el html del sitio a scrapear
          return {
            vacante: row.VACANTE,
            regional: row["DIRECCION REGIONAL"],
            clasePuesto: row["CLASE DE PUESTO"],
            especialidad: row.ESPECIALIDAD,
            institucion: row.INSTITUCION,
            lecciones: row.LECCIONES,
            rige: row.RIGE,
            vence: row.VENCE,
          };
        });

        results.push(...mappedVacancies);
        logger.info(
          `✨ Encontradas ${tableRows.length} vacantes en pág ${pageNum} (${newVacancies.length} nuevas)`,
        );

        // Check for next page button
        // selector for enabled next button: button[aria-label="Next page"]:not([disabled])
        const nextButton = await page.$(
          'button[aria-label="Next page"]:not([disabled])',
        );

        if (nextButton) {
          logger.info("➡️ Avanzando a la siguiente página...");
          await nextButton.click();
          pageNum++;
          // Esperamos activamente a que la tabla "desaparezca" o cambie de estado
          // para no leer la misma tabla dos veces si el rendering es lento.
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          logger.info("⏹️ No hay más páginas en esta región.");
          hasNextPage = false;
        }
      }
    }

    return results;
  } catch (err) {
    await logger.error("Error during scraping:", err);
    return [];
  } finally {
    await browser.close();
  }
}
