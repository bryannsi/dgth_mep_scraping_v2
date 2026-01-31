import { loadEnvFile } from "node:process"; // Importamos la función nativa

try {
  loadEnvFile();
} catch (error) {
  console.warn(
    "⚠️ No se pudo cargar el archivo .env, usando variables de entorno del sistema.",
  );
}

const getEnv = (name, defaultValue = "") => process.env[name] || defaultValue;

export const CONFIG = {
  scraper: {
    url: "https://apps.mep.go.cr/formulario",
    keywords: getEnv("KEYWORDS")
      ? getEnv("KEYWORDS")
          .split(",")
          .map((k) => k.trim().toUpperCase())
      : [],
  },
  mail: {
    user: getEnv("MAIL_USERNAME"),
    clientId: getEnv("OAUTH_CLIENTID"),
    clientSecret: getEnv("OAUTH_CLIENT_SECRET"),
    refreshToken: getEnv("OAUTH_REFRESH_TOKEN"),
    destination: getEnv("MAIL_DESTINATION"),
  },
  puppeteer: {
    headless: "new",
    executablePath:
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ],
  },
};
