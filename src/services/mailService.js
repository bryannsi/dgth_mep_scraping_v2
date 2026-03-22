import { Resend } from "resend";
import { CONFIG } from "../config/config.js";
import { logger } from "./loggerService.js";

let resendInstance = null;

/**
 * Obtiene o crea la instancia de Resend utilizando la clave de API configurada.
 * 
 * @returns {import("resend").Resend} La instancia del cliente Resend.
 * @throws {Error} Si la clave de API de Resend no está configurada o no se pudo cargar.
 */
function getResendInstance() {
  if (resendInstance) return resendInstance;

  const apiKey = CONFIG.mail.apiKey;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "❌ RESEND_API_KEY no está definido en el archivo .env o no se pudo cargar.",
    );
  }

  resendInstance = new Resend(apiKey);
  return resendInstance;
}

/**
 * Envía un correo electrónico utilizando el servicio Resend.
 * 
 * @param {Object} mailConfig - Configuración del correo.
 * @param {string|string[]} mailConfig.to - Destinatario(s).
 * @param {string|string[]} [mailConfig.cc] - Direcciones en copia (CC).
 * @param {string|string[]} [mailConfig.bcc] - Direcciones en copia oculta (BCC).
 * @param {string} mailConfig.subject - Asunto del correo.
 * @param {string} mailConfig.html - Contenido HTML del correo.
 * @param {Array<{filename: string, path: string}>} [mailConfig.attachments] - Lista de archivos adjuntos.
 * @returns {Promise<{data: any, error: any}>} Un objeto con los datos de respuesta o el error capturado.
 */
export async function sendEmail(mailConfig) {
  try {
    const resend = getResendInstance();

    const payload = {
      from: CONFIG.mail.from,
      to: mailConfig.to,
      cc: mailConfig.cc,
      bcc: mailConfig.bcc,
      subject: mailConfig.subject,
      html: mailConfig.html,
      attachments: Array.isArray(mailConfig.attachments)
        ? mailConfig.attachments.map((att) => ({
            filename: att.filename,
            path: att.path,
          }))
        : [],
    };

    return await resend.emails.send(payload);
  } catch (error) {
    logger.error("💥 Error en mailService:", error.message);
    return { data: null, error };
  }
}
