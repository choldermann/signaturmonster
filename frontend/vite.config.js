import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  // In development: proxy API calls to backend
  // In production: nginx handles routing
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      }
    }
  }
})
