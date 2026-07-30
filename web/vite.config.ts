import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "/",
  build: { outDir: "dist" },
  server: {
    port: 4321,
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://127.0.0.1:3102",
        changeOrigin: true,
      },
    },
  },
});
