# MEP Vacantes Scraper 🚀

Este proyecto es un servicio de scraping automatizado diseñado para monitorear las vacantes publicadas en el portal de la Dirección de Gestión de Talento Humano (DGTH) del Ministerio de Educación Pública (MEP).

El sistema extrae la información más reciente, filtra las vacantes según criterios específicos (regiones y palabras clave) y envía notificaciones por correo electrónico a los interesados.

## ✨ Características

- **Scraping Automatizado**: Utiliza [Puppeteer](https://pptr.dev/) para navegar y extraer datos del portal del MEP.
- **Filtrado Inteligente**: Permite filtrar vacantes por regiones y palabras clave configurables.
- **Notificaciones por Email**: Envía reportes detallados en formato HTML utilizando [Nodemailer](https://nodemailer.com/) con soporte para Gmail OAuth2.
- **Exportación de Datos**: Guarda los resultados en archivos JSON para un seguimiento histórico.
- **Preparado para CI/CD**: Arquitectura lista para ser ejecutada mediante GitHub Actions como una tarea programada (cron job).

## 📋 Requisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
- [pnpm](https://pnpm.io/) (recomendado) o [npm](https://www.npmjs.com/).

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos para configurar el proyecto localmente.

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd dgth_mep_scraping_v2
```

### 2. Instalar dependencias

Puedes usar el gestor de paquetes de tu preferencia:

**Con pnpm (Recomendado):**
```bash
pnpm install
```

**Con npm:**
```bash
npm install
```

### 3. Configuración del entorno
Crea un archivo `.env` en la raíz del proyecto basándote en los campos requeridos para las notificaciones y el filtrado:

```env
# Configuración de Gmail OAuth2
MAIL_USERNAME=tu-correo@gmail.com
OAUTH_CLIENTID=tu-client-id
OAUTH_CLIENT_SECRET=tu-client-secret
OAUTH_REFRESH_TOKEN=tu-refresh-token
REDIRECT_URL=https://developers.google.com/oauthplayground
```

---

## 🛠️ Comandos Disponibles

El proyecto utiliza una serie de scripts definidos en el `package.json` para facilitar el desarrollo y la ejecución:

| Comando | Descripción |
| :--- | :--- |
| `pnpm run dev` | Inicia el proyecto en modo desarrollo con auto-recarga (watch mode). |
| `pnpm run build` | Limpia la carpeta `build` y compila el proyecto usando `esbuild`. |
| `pnpm start` | Ejecuta la versión compilada del proyecto en `./build/index.js`. |

> [!NOTE]
> Si utilizas **npm**, simplemente sustituye `pnpm` por `npm` en los comandos anteriores (ej: `npm run dev`).

---

## 📂 Estructura del Proyecto

- `src/`: Contiene el código fuente del scraper, servicios de notificación y lógica principal.
- `build/`: Directorio donde se genera el código compilado para producción.
- `data/`: Carpeta donde se almacenan los archivos JSON generados con las vacantes.
- `build.js`: Script de configuración para el proceso de empaquetado con `esbuild`.

## 🤝 Autor

**Bryan Chavarría Hughes**
