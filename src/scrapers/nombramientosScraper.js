import puppeteer from "puppeteer";
import { CONFIG } from "../config/config.js";
import { logger } from "../services/loggerService.js";

/**
 * Scrapea el nombramiento basado en un id de vacante y el año.
 * @param {string} mepId 
 * @param {string} year 
 * @returns {Promise<Object|null>}
 */
export async function scrapeNombramientoMEP(mepId, year) {
  const browser = await puppeteer.launch(CONFIG.puppeteer);
  const page = await browser.newPage();

  // Set window size to ensure elements are visible
  await page.setViewport({ width: 1280, height: 800 });

  let alertMessage = null;
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    logger.info(`Alerta web detectada para vacante ${mepId}: "${alertMessage}"`);
    try {
      await dialog.accept();
    } catch {
      // Si ya fue manejado o cerrado, ignorar
    }
  });

  try {
    logger.info(`Navegando al sitio de nombramientos para consultar vacante ${mepId} en el año ${year}`);
    await page.goto("https://apps.mep.go.cr/consultanombramientos/", { waitUntil: "networkidle2" });

    // Seleccionar criterio por número de vacante en lugar de identificación
    const hasRadioVacante = await page.$("#radioVacante") !== null;
    if (hasRadioVacante) {
      await page.click("#radioVacante");
      // Pequeña espera para que la interfaz reaccione al cambio de criterio
      await new Promise(r => setTimeout(r, 500));
    } else {
      logger.warn("No se encontró el radio button #radioVacante, continuando con comportamiento por defecto");
    }

    // Ingresar mepId
    await page.type("#txtCedula", String(mepId));

    // Seleccionar año
    const hasDdlAnio = await page.$("#ddlAño") !== null;
    if (hasDdlAnio) {
      await page.select("#ddlAño", String(year));
    } else {
      logger.warn("No se encontró el selector de año #ddlAño");
    }

    // Click consultar y esperar
    await page.click("#btnConsultar");
    
    // Espera adaptativa por la respuesta (ya sea la tabla, alerta recibida o un mensaje de que no hay datos)
    // Revisamos periódicamente en lugar de un waitForFunction largo si ya saltó la alerta
    const maxWaitMs = 6000;
    const intervalMs = 250;
    let waitedMs = 0;

    while (waitedMs < maxWaitMs) {
      if (alertMessage) {
        // La alerta ya confirmó que no hay registros o hubo un aviso
        break;
      }

      const hasTable = await page.$("#grvNombramientos") !== null;
      if (hasTable) {
        break;
      }

      const hasNoDataMessage = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : "";
        return (
          bodyText.includes("No se encontraron") ||
          bodyText.includes("no produjo resultados") ||
          bodyText.includes("no existan")
        );
      });

      if (hasNoDataMessage) {
        break;
      }

      await new Promise((r) => setTimeout(r, intervalMs));
      waitedMs += intervalMs;
    }

    // Comprobar existencia de la tabla
    const hasTable = (await page.$("#grvNombramientos")) !== null;
    
    if (!hasTable) {
      logger.info(`No se encontró la tabla de nombramientos para la vacante ${mepId} en ${year}.`);
      return null; // El requerimiento: "sino devuelve datos la consulta, no se debe guardar nada en la base de datos"
    }

    // Extraer datos de la tabla
    const tableData = await page.evaluate(() => {
      const normalize = (str) => str ? str.trim() : null;
      
      const rows = Array.from(document.querySelectorAll("#grvNombramientos tr"));
      if (rows.length < 2) return null; // Solo encabezados o vacía

      // Usualmente el primer registro está en la fila 1 (índice 0 son headers)
      const headers = Array.from(rows[0].querySelectorAll("th")).map(th => normalize(th.textContent).toUpperCase());
      const cells = Array.from(rows[1].querySelectorAll("td")).map(td => normalize(td.textContent));
      
      const result = {};
      headers.forEach((header, index) => {
        result[header] = cells[index];
      });
      return result;
    });

    if (tableData) {
      logger.info(`Datos extraídos correctamente de #grvNombramientos para vacante ${mepId}`);
    }

    return tableData;

  } catch (error) {
    logger.error(`Error durante scraping de nombramiento para ${mepId}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}
