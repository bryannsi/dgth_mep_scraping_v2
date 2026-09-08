import { NombramientosService } from "./services/nombramientosService.js";
import { VacantesService } from "./services/vacantesService.js";
import { logger } from "./services/loggerService.js";

/**
 * Convierte un valor a entero positivo.
 *
 * @param {string|number} value
 * @returns {number|null}
 */
function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

/**
 * Muestra la ayuda de uso del script.
 */
function showHelp() {
  console.log(`
Uso:

  Modo unitario:
    npm run scrape-nombramiento <mepId> [year]

  Ejemplo:
    npm run scrape-nombramiento 1510412 2026


  Modo histórico:
    npm run scrape-nombramiento <vacanteId> [year] --direction=backward --limit=10

  Ejemplos:
    npm run scrape-nombramiento 5000 2026 --direction=backward --limit=10

    npm run scrape-nombramiento 5000 2026 --direction=forward --limit=20


Opciones:

  --limit=N
  -l N
      Cantidad de vacantes a procesar en modo histórico.

  --direction=backward
  --direction=forward

  -d backward
  -d forward

      Dirección del recorrido histórico.

      backward = vacantes anteriores
      forward  = vacantes siguientes


Ejemplos unitarios:

  npm run scrape-nombramiento 1510412
  npm run scrape-nombramiento 1510412 2026

  También puede utilizarse vacantes.id:

  npm run scrape-nombramiento 5000 2026


Ejemplos históricos:

  npm run scrape-nombramiento 5000 2026 --limit=10

  npm run scrape-nombramiento 5000 2026 --direction=backward --limit=10

  npm run scrape-nombramiento 5000 2026 --direction=forward --limit=20

  npm run scrape-nombramiento 5000 2026 -d forward -l 20
`);
}

/**
 * Analiza los argumentos recibidos desde la consola.
 *
 * @returns {{
 *   targetIdentifier: string|null,
 *   year: string,
 *   limit: number|null,
 *   direction: string,
 *   isHistoricalMode: boolean
 * }}
 */
function parseArguments() {
  const args = process.argv.slice(2);

  let limit = null;
  let direction = "backward";
  let directionSpecified = false;

  const positionalArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    /*
     * --limit=10
     */
    if (arg.startsWith("--limit=")) {
      limit = parsePositiveInt(arg.split("=")[1]);
      continue;
    }

    /*
     * --limit 10
     */
    if (arg === "--limit") {
      limit = parsePositiveInt(args[i + 1]);
      i++;
      continue;
    }

    /*
     * -l 10
     */
    if (arg === "-l") {
      limit = parsePositiveInt(args[i + 1]);
      i++;
      continue;
    }

    /*
     * -l10
     */
    if (arg.startsWith("-l")) {
      limit = parsePositiveInt(arg.substring(2));
      continue;
    }

    /*
     * --direction=forward
     */
    if (arg.startsWith("--direction=")) {
      direction = arg.split("=")[1].toLowerCase();
      directionSpecified = true;
      continue;
    }

    /*
     * --direction forward
     */
    if (arg === "--direction") {
      direction = (args[i + 1] || "").toLowerCase();
      directionSpecified = true;
      i++;
      continue;
    }

    /*
     * -d forward
     */
    if (arg === "-d") {
      direction = (args[i + 1] || "").toLowerCase();
      directionSpecified = true;
      i++;
      continue;
    }

    /*
     * -dforward
     */
    if (arg.startsWith("-d")) {
      direction = arg.substring(2).toLowerCase();
      directionSpecified = true;
      continue;
    }

    /*
     * Argumentos posicionales:
     *
     * 1. identificador
     * 2. año
     */
    if (!arg.startsWith("-")) {
      positionalArgs.push(arg);
    }
  }

  return {
    targetIdentifier: positionalArgs[0] || null,
    year: positionalArgs[1] || "2026",
    limit,
    direction,
    isHistoricalMode: limit !== null || directionSpecified,
  };
}

/**
 * Ejecuta un nombramiento individual.
 *
 * El identificador puede ser:
 *
 * - vacantes.id
 * - mepId
 */
async function runUnitario(targetIdentifier, year) {
  let mepId = targetIdentifier;

  /*
   * Primero intentamos determinar si el identificador
   * corresponde al ID interno de la vacante.
   */
  const vacancyById = await VacantesService.findById(targetIdentifier);

  if (vacancyById) {
    mepId = vacancyById.mepId;

    logger.info(
      `Identificador ${targetIdentifier} corresponde a vacantes.id. ` +
      `Se utilizará mepId=${mepId}.`
    );
  } else {
    /*
     * Si no es vacantes.id, verificamos si corresponde
     * directamente a un mepId existente.
     */
    const vacancyByMepId =
      await VacantesService.findByMepId(targetIdentifier);

    if (vacancyByMepId) {
      mepId = vacancyByMepId.mepId;

      logger.info(
        `Identificador ${targetIdentifier} corresponde directamente a mepId.`
      );
    } else {
      /*
       * Se mantiene el comportamiento original:
       * permitir que processNombramiento intente utilizar
       * directamente el valor como mepId.
       */
      logger.warn(
        `El identificador ${targetIdentifier} no se encontró en la tabla vacancy. ` +
        `Se intentará utilizar directamente como mepId.`
      );
    }
  }

  logger.info(
    `Ejecutando scraping unitario: mepId=${mepId}, año=${year}`
  );

  const result = await NombramientosService.processNombramiento(
    mepId,
    year
  );

  if (!result.success) {
    logger.error(
      `Fin de ejecución con errores: ${result.error}`
    );

    return false;
  }

  logger.info(
    `Fin de ejecución exitosa: ${result.message}`
  );

  if (result.data) {
    console.log("\nDATOS DEL NOMBRAMIENTO:");
    console.dir(result.data, {
      depth: null,
    });
  }

  return true;
}

/**
 * Ejecuta la reconstrucción histórica.
 *
 * En este modo el identificador DEBE ser vacantes.id,
 * porque se utiliza como punto de partida del recorrido.
 */
async function runHistorico({
  targetIdentifier,
  year,
  direction,
  limit,
}) {
  const effectiveLimit = limit || 10;

  if (!["backward", "forward"].includes(direction)) {
    logger.error(
      `Dirección inválida: "${direction}". ` +
      `Utilice "backward" o "forward".`
    );

    return false;
  }

  /*
   * Validar que el identificador sea una vacante existente.
   *
   * Esto evita iniciar un recorrido histórico con un mepId.
   */
  const initialVacante =
    await VacantesService.findById(targetIdentifier);

  if (!initialVacante) {
    logger.error(
      `El identificador ${targetIdentifier} no corresponde a ` +
      `vacantes.id válido para reconstrucción histórica.`
    );

    logger.error(
      "En modo histórico debe utilizar el ID interno de la tabla vacancy."
    );

    return false;
  }

  logger.info(
    "Ejecutando reconstrucción histórica de nombramientos..."
  );

  logger.info(
    `Parámetros -> ` +
    `vacanteId=${initialVacante.id}, ` +
    `mepId=${initialVacante.mepId}, ` +
    `year=${year}, ` +
    `direction=${direction}, ` +
    `limit=${effectiveLimit}`
  );

  const startTime = Date.now();

  const result =
    await NombramientosService.reconstructHistory({
      initialVacanteId: initialVacante.id,
      year,
      direction,
      limit: effectiveLimit,
    });

  const durationMs = Date.now() - startTime;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const formattedDuration =
    minutes > 0
      ? `${minutes} min ${remainingSeconds} s`
      : `${(durationMs / 1000).toFixed(2)} s`;

  if (!result.success) {
    logger.error(
      `Fallo en la reconstrucción: ${result.error}`
    );

    return false;
  }

  const { summary } = result;
  summary.durationMs = durationMs;
  summary.formattedDuration = formattedDuration;

  console.log("\n========================================");
  console.log(" RESUMEN DEL PROCESO HISTÓRICO");
  console.log("========================================");
  console.log(`Dirección:                 ${direction}`);
  console.log(`Año:                       ${year}`);
  console.log(`Solicitadas:               ${effectiveLimit}`);
  console.log(`Procesadas:                ${summary.processed}`);
  console.log(`Nombramientos encontrados: ${summary.found}`);
  console.log(`Sin nombramiento:          ${summary.notFound}`);
  console.log(`Errores:                   ${summary.errors}`);
  console.log(`Tiempo transcurrido:       ${formattedDuration}`);
  console.log("========================================\n");

  return true;
}

/**
 * Punto de entrada principal.
 */
async function main() {
  try {
    const {
      targetIdentifier,
      year,
      limit,
      direction,
      isHistoricalMode,
    } = parseArguments();

    /*
     * Mostrar ayuda cuando no se proporciona identificador.
     */
    if (!targetIdentifier) {
      logger.error(
        "Debe proporcionar el identificador de la vacante."
      );

      showHelp();

      process.exitCode = 1;
      return;
    }

    /*
     * Validación básica del año.
     */
    const parsedYear = Number.parseInt(year, 10);

    if (!Number.isInteger(parsedYear)) {
      logger.error(`Año inválido: ${year}`);
      process.exitCode = 1;
      return;
    }

    let success;

    if (isHistoricalMode) {
      /*
       * MODO HISTÓRICO
       */
      success = await runHistorico({
        targetIdentifier,
        year: String(parsedYear),
        direction,
        limit,
      });
    } else {
      /*
       * MODO UNITARIO
       */
      success = await runUnitario(
        targetIdentifier,
        String(parsedYear)
      );
    }

    process.exitCode = success ? 0 : 1;
  } catch (error) {
    logger.error(
      "Error inesperado durante la ejecución:",
      error
    );

    process.exitCode = 1;
  }
}

main();