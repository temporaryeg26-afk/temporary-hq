// Copies the video engine into the site so it's served from GitHub Pages (no outside CDN needed).
import { cpSync, mkdirSync } from "fs";
mkdirSync("public/ffmpeg", { recursive: true });
for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) cpSync(`node_modules/@ffmpeg/core/dist/esm/${f}`, `public/ffmpeg/${f}`);
console.log("video engine copied to public/ffmpeg");
