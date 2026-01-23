// config.js
export const PUPPETEER_CONFIG = (mode) => ({
  headless: mode,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

export const MEP_URL = "https://apps.mep.go.cr/formulario";
