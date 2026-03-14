// @ts-check
import { smartFormatDate } from "../helpers/helpers.js";

/**
 * @typedef {Object} Vacante
 * @property {string} mepId
 * @property {string} regional
 * @property {string} clasePuesto
 * @property {string} especialidad
 * @property {string} institucion
 * @property {number} lecciones
 * @property {string|null} rige
 * @property {string|null} vence
 */

/**
 * @param {Vacante[]} vacantes
 * @returns {string}
 */
export function createHtmlTable(vacantes) {
  // Contenedor principal
  const containerStyle =
    "padding: 10px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;";

  // Estilo de la tarjeta
  const cardStyle = `
    background-color: #ffffff; 
    border: 1px solid #e1e8ed; 
    border-radius: 8px; 
    margin-bottom: 15px; 
    padding: 15px; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  `;

  // Estilo de etiquetas (Labels)
  const labelStyle =
    "color: #000000; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; display: block;";

  // Estilo de contenido
  const valueStyle =
    "color: #333333; font-size: 14px; margin-bottom: 10px; display: block;";

  // Generamos las tarjetas
  const cards = vacantes
    .map((v) => {
      const rige = smartFormatDate(v.rige).toString();
      const vence = smartFormatDate(v.vence).toString();

      return `
      <div style="${cardStyle}">
        <div style="border-bottom: 2px solid #003366; margin-bottom: 12px; padding-bottom: 5px;">
            <span style="color: #003366; font-size: 16px; font-weight: bold;">${v.especialidad || "Especialidad no definida"}</span>
            <div style="font-size: 14px; color: #000000; margin-top: 2px; font-weight: 500;">${v.clasePuesto || "Clase de puesto no definida"}</div>
            <div style="font-size: 12px; color: #000000;">Número de Vacante: ${v.mepId || "N/A"}</div>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="50%" style="vertical-align: top; padding-right: 10px;">
              <span style="${labelStyle}">Institución</span>
              <span style="${valueStyle}">${v.institucion || "N/A"}</span>
            </td>
            <td width="50%" style="vertical-align: top;">
              <span style="${labelStyle}">Región</span>
              <span style="${valueStyle}">${v.regional || "N/A"}</span>
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top;">
              <span style="${labelStyle}">Lecciones</span>
              <span style="${valueStyle}"><strong>${v.lecciones || "0"}</strong></span>
            </td>
            <td style="vertical-align: top;">
              <span style="${labelStyle}">Vigencia</span>
              <span style="${valueStyle}">${rige} al ${vence}</span>
            </td>
          </tr>
        </table>
      </div>
    `;
    })
    .join("");

  return `<div style="${containerStyle}">${cards}</div>`;
}
