import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  server: { port: 4321, host: true },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: process.env.API_URL ?? "http://127.0.0.1:3102",
          changeOrigin: true,
        },
      },
    },
  },
});
