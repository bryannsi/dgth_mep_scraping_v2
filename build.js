import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

// Función para ejecutar el build
async function buildProject() {
  console.log("🚀 Iniciando proceso de build...");

  try {
    await esbuild.build({
      entryPoints: ["src/index.js"], // Tu punto de entrada en src
      bundle: true, // Necesario para resolver los imports de tus propios archivos
      minify: true, // Minifica, quita espacios y renombra variables
      platform: "node", // Indica que es para Node.js
      format: "esm", // Mantener el formato de salida como ESM
      target: ["node23"], // Optimiza para tu versión de Node
      drop: ["console", "debugger"], // ¡Adiós a los console.log y debuggers!
      legalComments: "none", // Elimina todos los comentarios (incluyendo licencias)
      outfile: "build/index.js", // Destino final: carpeta build
      plugins: [nodeExternalsPlugin()], // No empaqueta las librerías de node_modules
    });

    console.log("✅ Build completado exitosamente en /build/index.js");
  } catch (error) {
    console.error("❌ Error en el build:", error);
    process.exit(1);
  }
}

buildProject();
