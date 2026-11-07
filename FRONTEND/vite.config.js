import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo (npm run dev:front) las llamadas a /api y /media se reenvían al backend en :4000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:4000", "/media": "http://localhost:4000" } },
  build: { outDir: "dist", chunkSizeWarningLimit: 2500 },
});
