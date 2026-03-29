import { defineConfig } from "prisma/config";
import { PRISMA_CONFIG } from "./src/config/config.js";

console.log(
  "🔗 Cargando configuración de Prisma:",
  PRISMA_CONFIG.datasource.directUrl,
);

export default defineConfig({
  ...PRISMA_CONFIG,
  datasource: {
    url: PRISMA_CONFIG.datasource.directUrl,
  },
});
