import { defineConfig, loadEnv } from "vite";
import { validateIosApiUrl } from "./src/lib/iosReadiness.js";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import process from "node:process";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "ios") {
    validateIosApiUrl(loadEnv(mode, process.cwd(), "").VITE_API_URL);
  }
  return {
    build: mode === "ios" ? { target: "safari16.4" } : undefined,
    plugins: [
      TanStackRouterVite(),
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
