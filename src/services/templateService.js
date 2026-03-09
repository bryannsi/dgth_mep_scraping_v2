import { CONFIG } from "../config/config.js";

/**
 * Servicio encargado de gestionar y construir plantillas de correo
 * basadas en la configuración guardada en la base de datos (híbrido).
 */
export class TemplateService {
  /**
   * Construye un objeto de correo basado en el registro del cliente de la BD.
   *
   * @param {Object} client - Registro del cliente obtenido de Prisma.
   * @param {{ name: string, path: string }} fileInfo - Información del archivo adjunto.
   * @param {string} htmlContent - Contenido HTML (tabla de vacantes).
   * @returns {Object} Objeto de configuración para mailService.
   */
  getMailTemplateFromClient(client, fileInfo, htmlContent) {
    const { templateKey, email, name, config } = client;
    const baseHtml = CONFIG.baseHtml;

    // 1. Preparar estructura base del correo
    const emailData = {
      templateKey,
      to: email, // El email relacional es el destinatario principal
      subject: config.subject || "Reporte de Vacantes MEP",
      cc: config.cc || "",
      bcc: config.bcc || "",
      name: name || "",
    };

    // 2. Gestionar adjuntos según la configuración en el JSON 'config'
    if (config.sendAttachment && fileInfo?.name && fileInfo?.path) {
      emailData.attachments = [
        { filename: fileInfo.name, path: fileInfo.path },
      ];
    }

    // 3. Inyectar el HTML base y procesar tokens
    const replaceableTokens = {
      NAME: name || "",
      TABLE: htmlContent || "",
    };

    emailData.html = baseHtml.replace(
      /{{(\w+)}}/g,
      (match, key) => replaceableTokens[key] ?? "",
    );

    return emailData;
  }
}
