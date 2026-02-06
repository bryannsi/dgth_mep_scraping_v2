import templates from "../config/templates.json" with { type: "json" };

class TemplateService {
  constructor() {
    this.templates = templates;
  }
  getMailTemplate(templateName, fileInfo, htmlContent) {
    const baseTemplate = this.templates[templateName];

    if (!baseTemplate)
      throw new Error(
        `El template "${templateName}" no existe en el archivo de configuración.`,
      );

    // Clonamos para evitar modificar el original
    let m = { ...baseTemplate };
    m.attachments = [{ filename: fileInfo.name, path: fileInfo.path }];
    m.html = m.html.replace("{{TABLE}}", htmlContent);

    return m;
  }

  /**
   * Obtiene una lista única de todas las regiones definidas en los templates
   * @returns {string[]}
   */
  getAllRegions() {
    const allRegions = new Set();
    Object.values(this.templates).forEach((tpl) => {
      if (tpl.regions && Array.isArray(tpl.regions)) {
        tpl.regions.forEach((reg) => allRegions.add(reg.toUpperCase()));
      }
    });
    return Array.from(allRegions);
  }
}

export default TemplateService;
