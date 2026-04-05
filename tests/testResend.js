import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

// 1. Cargar el entorno antes de importar módulos que dependen de CONFIG
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  loadEnvFile(join(__dirname, "../.env"));
} catch (error) {
  // Ignorar si no se puede cargar (por ejemplo, si no existe .env)
}

// 2. Importaciones dinámicas para asegurar que las variables ya estén en process.env
const { sendEmail } = await import("../src/services/mailService.js");
const { CONFIG } = await import("../src/config/config.js");

async function testResend() {
  console.log("🧪 Test: Enviando correo de prueba con Resend...");

  // Log directo de diagnóstico por si el nivel de logger es 'error'
  console.log(`🔍 Diagnóstico rápido: 
    - API Key: ${CONFIG.mail.apiKey ? "✅ CARGADA" : "❌ NO CARGADA"}
    - From: ${CONFIG.mail.from || "❌ NO DEFINIDO"}`);

  const htmlContent = `
    <div style="padding:10px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
      <div style="background-color:#fff;border:1px solid #e1e8ed;border-radius:8px;margin-bottom:15px;padding:15px;box-shadow:0 2px 4px rgba(0,0,0,.02)">
        <div style="border-bottom:2px solid #003366;margin-bottom:12px;padding-bottom:5px">
          <span style="color:#003366;font-size:16px;font-weight:bold">Informática Educativa (Prueba con Desuscripción)</span>
          <div style="font-size:14px;color:#000;margin-top:2px;font-weight:500">Profesor De Enseñanza Técnico Profesional</div>
          <div style="font-size:12px;color:#000">Número de Vacante: TEST-123456</div>
        </div>
        <table width=100% cellpadding=0 cellspacing=0 border=0>
          <tr>
            <td width=50% style="vertical-align:top;padding-right:10px">
              <span style="color:#000;font-size:11px;font-weight:bold;text-transform:uppercase;margin-bottom:2px;display:block">Institución</span>
              <span style="color:#333;font-size:14px;margin-bottom:10px;display:block">Liceo de Prueba</span>
            </td>
            <td width=50% style="vertical-align:top">
              <span style="color:#000;font-size:11px;font-weight:bold;text-transform:uppercase;margin-bottom:2px;display:block">Región</span>
              <span style="color:#333;font-size:14px;margin-bottom:10px;display:block">San José</span>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  // Usar CONFIG.baseHtml directamente para que la prueba sea real
  const finalHtml = CONFIG.baseHtml
    .replace("{{NAME}}", "Usuario de Prueba")
    .replace("{{TABLE}}", htmlContent);

  const testConfig = {
    to: "bryannsi@outlook.com",
    subject: "Prueba de Resend con Footer de Desuscripción",
    html: finalHtml,
  };

  try {
    const mail = await sendEmail(testConfig);
    if (mail.data.id) {
      console.log("✅ Correo de prueba enviado con éxito! GUID del correo en resend: ", mail.data.id);
    } else {
      console.error("❌ Falló el envío del correo de prueba:", error);
    }
  } catch (err) {
    console.error("💥 Error inesperado en el test:", err);
  }
}

await testResend();
