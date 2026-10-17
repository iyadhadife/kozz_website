import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/chat": { target: "http://localhost:8001", rewrite: (p) => p.replace(/^\/chat/, "") },
    },
  },
});
