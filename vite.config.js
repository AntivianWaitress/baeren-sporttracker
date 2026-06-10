import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" macht die Pfade relativ – funktioniert damit unter
// https://USERNAME.github.io/REPO-NAME/ ohne weitere Anpassung.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
