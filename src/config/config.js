// config.js
export const PUPPETEER_CONFIG = () => ({
  headless: "new",
  // Solo definimos la ruta de Windows si estamos en Windows localmente.
  // En GitHub Actions (Linux), dejamos que Puppeteer encuentre el binario automáticamente.
  executablePath:
    process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : undefined,

  args: [
    "--no-sandbox", // Necesario para entornos de contenedores/Docker
    "--disable-setuid-sandbox", // Seguridad necesaria en Linux
    "--disable-dev-shm-usage", // Evita errores de memoria compartida en Docker/CI
    "--disable-accelerated-2d-canvas", // Ahorra recursos de CPU
    "--disable-gpu", // Ahorra recursos (no hay tarjeta gráflsica en el servidor)
    "--no-first-run", // Evita procesos de bienvenida
    "--no-zygote", // Ahorra memoria RAM
  ],
});

export const MEP_URL = "https://apps.mep.go.cr/formulario";
