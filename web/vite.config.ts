import { defineConfig } from "vite";

export default defineConfig({
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
