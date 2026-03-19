import { Resend } from "resend";
import { CONFIG } from "../config/config.js";
import { logger } from "./loggerService.js";

let resendInstance = null;

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
