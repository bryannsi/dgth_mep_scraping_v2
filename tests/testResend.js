import { sendEmail } from "../src/services/mailService.js";
import { logger } from "../src/services/loggerService.js";

async function testResend() {
  logger.info("🧪 Test: Enviando correo de prueba con Resend...");

  const testConfig = {
    to: "bryannsi@outlook.com", // REEMPLAZAR CON UN CORREO REAL PARA PROBAR
    subject: "Prueba de Resend - MEP Scraping",
    html: "<h1>¡Funciona!</h1><p>Este es un correo de prueba desde el nuevo servicio de Resend.</p>",
  };

  try {
    const { data, error } = await sendEmail(testConfig);

    if (error) {
      logger.error("❌ Falló el envío del correo de prueba:", error);
    } else {
      logger.info("✅ Correo de prueba enviado con éxito!", data);
    }
  } catch (err) {
    logger.error("💥 Error inesperado en el test:", err);
  }
}

testResend();
