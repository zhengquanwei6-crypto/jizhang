import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://162.243.80.127:8080";
const wsProxyTarget = apiProxyTarget.replace(/^http/, "ws");

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true
      },
      "/ws": {
        target: wsProxyTarget,
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 900
  }
});
