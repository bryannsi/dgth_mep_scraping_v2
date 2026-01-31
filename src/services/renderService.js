export function createHtmlTable(vacantes) {
  const tableStyle =
    "width: 100%; border-collapse: collapse; font-family: sans-serif;";
  const thStyle =
    "background-color: #003366; color: white; padding: 10px; border: 1px solid #ddd;";
  const tdStyle = "padding: 8px; border: 1px solid #ddd; text-align: left;";

  const rows = vacantes
    .map(
      (v, i) => `
        <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f2f2f2"};">
            <td style="${tdStyle}">${v["DIRECCION REGIONAL"] || "N/A"}</td>
            <td style="${tdStyle}">${v["ESPECIALIDAD"] || "N/A"}</td>
            <td style="${tdStyle}">${v["INSTITUCION"] || v["CENTRO EDUCATIVO"] || "N/A"}</td>
            <td style="${tdStyle}">${v["LECCIONES"] || "0"}</td>
        </tr>`,
    )
    .join("");

  return `
        <table style="${tableStyle}">
            <thead>
                <tr>
                    <th style="${thStyle}">DIRECCIÓN REGIONAL</th>
                    <th style="${thStyle}">ESPECIALIDAD</th>
                    <th style="${thStyle}">INSTITUCIÓN</th>
                    <th style="${thStyle}">LECCIONES</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}
