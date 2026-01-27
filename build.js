import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

async function buildProject() {
  console.log("🚀 Iniciando proceso de build...");

  try {
    await esbuild.build({
      entryPoints: ["src/index.js"],
      bundle: true, // Esto es vital para unir todos tus archivos .js
      minify: true,
      platform: "node",
      format: "esm",
      target: ["node23"],
      // drop: ["console", "debugger"],
      legalComments: "none",
      outfile: "build/index.js",
      plugins: [
        nodeExternalsPlugin({
          allowList: [], // Asegura que NINGÚN archivo de tu carpeta /src sea tratado como externo
        }),
      ],
    });

    console.log("✅ Build completado exitosamente en /build/index.js");
  } catch (error) {
    console.error("❌ Error en el build:", error);
    process.exit(1);
  }
}

buildProject();
