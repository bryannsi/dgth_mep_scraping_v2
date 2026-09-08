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
    
    // Espera adaptativa por la respuesta (ya sea la tabla o un mensaje de que no hay datos)
    // Usualmente los UpdatePanels reemplazan DOM o inyectan HTML
    await new Promise(r => setTimeout(r, 2000));
    try {
      await page.waitForFunction(
        () => {
          const hasTable = document.querySelector("#grvNombramientos") !== null;
          const bodyText = document.body.innerText;
          const hasNoDataMessage = bodyText.includes("No se encontraron") || bodyText.includes("no produjo resultados");
          return hasTable || hasNoDataMessage;
        },
        { timeout: 10000 }
      );
    } catch (e) {
      logger.warn(`Timeout esperando respuesta del panel para vacante ${mepId}. Es posible que no haya tabla.`);
    }

    // Comprobar existencia de la tabla
    const hasTable = await page.$("#grvNombramientos") !== null;
    
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
