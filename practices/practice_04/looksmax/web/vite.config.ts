import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // В dev API корзины живёт в serve.py (порт 8765).
  server: { proxy: { "/api": "http://127.0.0.1:8765" } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
