import { CONFIG } from "../config/config.js";

/**
 * Servicio encargado de gestionar y construir plantillas de correo
 * basadas en la configuración definida en el sistema.
 */
export class TemplateService {
  /**
   * Crea una nueva instancia de TemplateService.
   *
   * @param {Object<string, Object>|null} [customTemplates=null] -
   * Objeto opcional de templates personalizados.
   * Si no se proporciona, se utilizan los templates definidos en CONFIG.templates.
   */
  constructor(customTemplates = null) {
    this.templates = customTemplates || CONFIG.templates;
  }
  /**
   * Construye un objeto de correo basado en un template específico.
   *
   * @param {string} templateName - Nombre del template a utilizar.
   * @param {{ name: string, path: string }} fileInfo -
   * Información del archivo adjunto (nombre y ruta).
   * @param {string} htmlContent -
   * Contenido HTML que reemplazará el marcador {{TABLE}} dentro del template.
   *
   * @returns {Object} Objeto de configuración listo para enviarse por correo.
   *
   * @throws {Error} Si el template solicitado no existe en la configuración.
   */
  getMailTemplate(templateName, fileInfo, htmlContent) {
    // 1. Acceder a la sección de usuarios y al HTML base
    const templateData = this.templates.users[templateName];
    const baseHtml = this.templates.configs.baseHtml;
    if (!templateData) {
      throw new Error(`El template "${templateName}" no existe.`);
    }

    // 2. Clonar los datos del usuario para el objeto de envío
    let templateDataCopy = JSON.parse(JSON.stringify(templateData));

    // 3. Gestionar adjuntos
    if (templateDataCopy.sendAttachment && fileInfo?.name && fileInfo?.path) {
      templateDataCopy.attachments = [
        { filename: fileInfo.name, path: fileInfo.path },
      ];
    }

    // 4. Inyectar el HTML base y procesar los tokens (NAME y TABLE)
    const replaceableTokens = {
      NAME: templateDataCopy.name || "",
      TABLE: htmlContent || "",
    };

    // Reemplazamos los tokens en el commonHtml y lo asignamos al template de salida
    templateDataCopy.html = baseHtml.replace(
      /{{(\w+)}}/g,
      (match, key) => replaceableTokens[key] ?? "",
    );

    return templateDataCopy;
  }
  /**
   * Obtiene una lista única de todas las regiones definidas
   * dentro de los templates configurados.
   *
   * Las regiones se devuelven en mayúsculas.
   *
   * @returns {string[]} Arreglo de regiones únicas.
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
