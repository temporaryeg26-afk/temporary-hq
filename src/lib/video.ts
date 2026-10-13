/**
 * Burns your ORIGINAL logo onto a video made in Flow (Veo) — inside your browser with ffmpeg.wasm.
 * The first run loads the video engine (~30 MB) from this website once; after that the browser caches it.
 * Note: every video is compressed (H.264), which shifts all pixels very slightly — real camera footage too.
 * The logo itself is never redrawn by AI.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Position, scaledPNG } from "./media";

let ff: FFmpeg | null = null;
let logBuf = "";

async function engine() {
  if (ff) return ff;
  const f = new FFmpeg();
  f.on("log", ({ message }) => {
    logBuf += message + "\n";
  });
  // Served from this same website (copied in at build time), so no outside CDN is needed.
  const base = new URL("./ffmpeg", document.baseURI).href;
  await f.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ff = f;
  return f;
}

/** Read the video's width with ffmpeg itself (works for any format ffmpeg understands). */
async function probeWidth(f: FFmpeg): Promise<number> {
  logBuf = "";
  await f.exec(["-hide_banner", "-i", "in.mp4"]).catch(() => null); // exits non-zero by design (no output file)
  const m = logBuf.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!m) throw new Error("Can't read this video. Download it from Flow as MP4 and try again.");
  return Number(m[1]);
}

const XY: Record<Position, string> = {
  "top-left": "x=W*0.05:y=H*0.04",
  "top-right": "x=W-w-W*0.05:y=H*0.04",
  "top-center": "x=(W-w)/2:y=H*0.04",
  "bottom-left": "x=W*0.05:y=H-h-H*0.12",
  "bottom-right": "x=W-w-W*0.05:y=H-h-H*0.12",
  "bottom-center": "x=(W-w)/2:y=H-h-H*0.12",
  center: "x=(W-w)/2:y=(H-h)/2",
};

export async function overlayVideo(
  video: Blob,
  overlays: { file: Blob; position: Position; widthPct: number }[],
  onProgress?: (p: number) => void,
  opts: { aacAudio?: boolean } = {}
): Promise<Blob> {
  if (!overlays.length && !opts.aacAudio) return video;
  const f = await engine();
  const prog = ({ progress }: { progress: number }) => onProgress?.(Math.max(0, Math.min(1, progress)));
  f.on("progress", prog);
  await f.writeFile("in.mp4", await fetchFile(video));
  const w = await probeWidth(f);
  const args = ["-i", "in.mp4"];
  for (let i = 0; i < overlays.length; i++) {
    const pct = Math.min(90, Math.max(5, overlays[i].widthPct || 15)) / 100;
    const png = await scaledPNG(overlays[i].file, Math.round(w * pct));
    await f.writeFile(`o${i}.png`, await fetchFile(png));
    args.push("-i", `o${i}.png`);
  }
  let filter = "";
  let last = "[0:v]";
  overlays.forEach((o, i) => {
    filter += `${last}[${i + 1}:v]overlay=${XY[o.position] ?? XY["top-right"]}:format=auto:eof_action=repeat[v${i}];`;
    last = `[v${i}]`;
  });
  args.push(
    "-filter_complex", filter.replace(/;$/, ""),
    "-map", last, "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
    ...(opts.aacAudio ? ["-c:a", "aac", "-b:a", "192k"] : ["-c:a", "copy"]), "-movflags", "+faststart",
    "out.mp4"
  );
  const code = await f.exec(args);
  f.off("progress", prog);
  if (code !== 0) throw new Error("The video engine couldn't process this file. Try re-downloading it from Flow as MP4.");
  const data = (await f.readFile("out.mp4")) as Uint8Array;
  await f.deleteFile("in.mp4").catch(() => null);
  await f.deleteFile("out.mp4").catch(() => null);
  return new Blob([data.slice().buffer], { type: "video/mp4" });
}
