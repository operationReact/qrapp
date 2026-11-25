import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { productionProxy, PROXY_PREFIX } from "./local-prod-proxy.mjs";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const prodApi = command === "serve" && (mode === "prod-api" || mode === "prod-api-write");
  const localApi = command === "serve" && mode === "local-backend";
  return {
  plugins: [
    ...(prodApi ? [productionProxy({ allowWrites: mode === "prod-api-write" })] : []),
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  ...(prodApi || localApi ? { define: { "import.meta.env.VITE_API_URL": JSON.stringify(prodApi ? PROXY_PREFIX : "http://localhost:8080") } } : {}),
  server: { host: "localhost", port: 5173, strictPort: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
