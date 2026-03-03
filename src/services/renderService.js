// @ts-check

/**
 * @typedef {Object} Vacante
 * @property {string} mepId
 * @property {string} regional
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
  const tableStyle =
    "width: 100%; border-collapse: collapse; font-family: sans-serif;";
  const thStyle =
    "background-color: #003366; color: white; padding: 10px; border: 1px solid #ddd;";
  const tdStyle = "padding: 8px; border: 1px solid #ddd; text-align: left;";

  const rows = vacantes
    .map((v, i) => {
      const rige = v.rige ? new Date(v.rige).toLocaleDateString("es-CR") : "N/A";
      const vence = v.vence ? new Date(v.vence).toLocaleDateString("es-CR") : "N/A";

      return `
      <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f2f2f2"};">
          <td style="${tdStyle}">${v.mepId || "N/A"}</td>
          <td style="${tdStyle}">${v.regional || "N/A"}</td>
          <td style="${tdStyle}">${v.especialidad || "N/A"}</td>
          <td style="${tdStyle}">${v.institucion || "N/A"}</td>
          <td style="${tdStyle}">${v.lecciones ?? "0"}</td>
          <td style="${tdStyle} white-space: nowrap;">
            ${rige}&nbsp;al&nbsp;${vence}
          </td>
      </tr>`;
    })
    .join("");

  return `
        <div style="width: 100%; overflow-x: auto; margin: 20px 0;">
            <table style="${tableStyle}">
                <thead>
                    <tr>
                        <th style="${thStyle} white-space: nowrap;">VACANTE</th>
                        <th style="${thStyle}">DIRECCIÓN REGIONAL</th>
                        <th style="${thStyle}">ESPECIALIDAD</th>
                        <th style="${thStyle}">INSTITUCIÓN</th>
                        <th style="${thStyle}">LECCIONES</th>
                        <th style="${thStyle} white-space: nowrap;">VIGENCIA</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}
