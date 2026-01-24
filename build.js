name: MEP Scraping Cron Job

on:
  schedule:
    - cron: "0 13 * * *"
    - cron: "0 17 * * *"
    - cron: "30 21 * * *"
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Instalar pnpm
        uses: pnpm/action-setup@v4

      - name: Configurar Node.js 23
        uses: actions/setup-node@v4
        with:
          node-version: "23"
          cache: "pnpm"

      - name: Instalar dependencias de Node
        run: pnpm install --frozen-lockfile

      - name: Instalar Navegador y Librerías (Chrome)
        # Esta es la línea clave corregida
        run: sudo npx puppeteer browsers install chrome --install-deps

      - name: Ejecutar Build (esbuild)
        run: pnpm run build

      - name: Ejecutar Scraping
        run: node build/index.js
        env:
          NODE_ENV: production
