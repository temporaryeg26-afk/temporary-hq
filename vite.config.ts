import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "./" makes the site work at https://<user>.github.io/<repo>/ without extra config.
export default defineConfig({
  base: "./",
  plugins: [react()],
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
});
