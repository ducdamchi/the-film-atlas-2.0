import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcsss from "@tailwindcss/vite"
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcsss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
