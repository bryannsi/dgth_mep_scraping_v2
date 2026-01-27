import fs from "fs";
import path from "path";

/**
 * Exporta un conjunto de datos a un archivo en formato JSON.
 * * Esta función realiza las siguientes tareas:
 * 1. Verifica si el directorio de destino existe; si no, lo crea recursivamente.
 * 2. Aplana los datos (en caso de recibir un array de arrays).
 * 3. Convierte el objeto/array a una cadena JSON con indentación de 2 espacios.
 * 4. Sobrescribe el archivo de destino con los nuevos datos.
 * * @param {string} filePath - La ruta completa o relativa donde se guardará el archivo (ej: './data/mep.json').
 * @param {Array<Object>|Array<Array<Object>>} data - El conjunto de datos extraídos.
 * Puede ser un array simple de objetos o una lista de listas.
 * @returns {void} No devuelve ningún valor.
 * @throws {Error} Lanza una excepción si hay problemas de permisos o errores en el sistema de archivos.
 */
export const jsonExport = (filePath, data) => {
  try {
    // 1. Asegurar que la carpeta existe para evitar errores de 'no such file or directory'
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 2. Aplanar los datos si vienen de múltiples regiones (Array de Arrays -> Array simple)
    // El método .flat() une los sub-arreglos en una sola lista plana.
    const flatData = Array.isArray(data) ? data.flat() : data;

    // 3. Convertir a String JSON (null y 2 activan el modo "pretty-print" para lectura humana)
    const jsonString = JSON.stringify(flatData, null, 2);

    // 4. Guardar archivo (sobrescribe contenido previo por defecto)
    fs.writeFileSync(filePath, jsonString, "utf8");

    console.log(
      `✅ Exportación exitosa: ${flatData.length} registros en ${filePath}`,
    );
  } catch (error) {
    console.error("❌ Error en exportService.jsonExport:", error);
    throw error;
  }
};
