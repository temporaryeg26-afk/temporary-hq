/**
 * LOCKED-FILE PROTECTION — runs in your browser, no server.
 * The AI (Flow / ChatGPT) only ever makes the scene. Your logo, artwork, mask and product cut-outs
 * are pasted on top by this code from your ORIGINAL uploaded files: uniform scaling only,
 * never cropped, recoloured or redrawn. After any later step (adding slide text), every opaque
 * pixel of every pasted file is compared with the saved composite. Any difference = rejected.
 */
import type { Placement, Region } from "./types";

export type Aspect = "4:5" | "9:16" | "1:1";
export const SIZES: Record<Aspect, { w: number; h: number }> = {
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};
export type Position = "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center" | "center";
export const POSITIONS: Position[] = ["top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center", "center"];

export async function sha256(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function bitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: "from-image", premultiplyAlpha: "none", colorSpaceConversion: "default" });
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

export function toPNG(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/png"));
}

/** Fit the AI image to the exact Instagram size (crop to fill, centred). Only used on AI scenes. */
export function coverFit(img: ImageBitmap, aspect: Aspect) {
  const { w, h } = SIZES[aspect];
  const { c, ctx } = canvas(w, h);
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return { c, ctx };
}

function place(pos: Position, cw: number, ch: number, w: number, h: number) {
  const m = Math.round(cw * 0.05);
  const xs = { l: m, c: Math.round((cw - w) / 2), r: cw - w - m };
  const ys = { t: m, m: Math.round((ch - h) / 2), b: ch - h - m };
  const map: Record<Position, [number, number]> = {
    "top-left": [xs.l, ys.t], "top-right": [xs.r, ys.t], "top-center": [xs.c, ys.t],
    "bottom-left": [xs.l, ys.b], "bottom-right": [xs.r, ys.b], "bottom-center": [xs.c, ys.b], center: [xs.c, ys.m],
  };
  const [left, top] = map[pos] ?? map["bottom-right"];
  return { left, top };
}

export type OverlayIn = { assetId: string; file: Blob; position: Position; widthPct: number };

/** Uniformly scale an original file to a width (proportions kept, nothing cropped). */
async function scaled(file: Blob, width: number) {
  const img = await bitmap(file);
  const w = Math.max(8, Math.round(width));
  const h = Math.max(1, Math.round((img.height * w) / img.width));
  const { c, ctx } = canvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { c, w, h };
}

/** Paste the original files onto the AI scene and prove they are untouched. */
export async function composite(aiImage: Blob, aspect: Aspect, overlays: OverlayIn[]) {
  const base = coverFit(await bitmap(aiImage), aspect);
  const { c, ctx } = base;
  const placements: Placement[] = [];
  const layers: { s: Awaited<ReturnType<typeof scaled>>; p: Placement }[] = [];
  for (const o of overlays) {
    const pct = Math.min(90, Math.max(5, o.widthPct || 15));
    let s = await scaled(o.file, (c.width * pct) / 100);
    if (s.h > c.height * 0.9) s = await scaled(o.file, (s.w * c.height * 0.9) / s.h);
    const { left, top } = place(o.position, c.width, c.height, s.w, s.h);
    ctx.drawImage(s.c, left, top);
    const p = { assetId: o.assetId, sha256: await sha256(o.file), left, top, width: s.w, height: s.h };
    placements.push(p);
    layers.push({ s, p });
  }
  // Prove: each fully-opaque pixel of the scaled original equals the final image.
  const checks = layers.map(({ s, p }) => {
    const want = s.c.getContext("2d")!.getImageData(0, 0, s.w, s.h).data;
    const got = ctx.getImageData(p.left, p.top, p.width, p.height).data;
    return compareOpaque(want, got, p.assetId);
  });
  return { blob: await toPNG(c), placements, checks, pass: checks.every((x) => x.pass) };
}

function compareOpaque(want: Uint8ClampedArray, got: Uint8ClampedArray, assetId: string) {
  let n = 0, sum = 0, max = 0;
  for (let i = 0; i < want.length; i += 4) {
    if (want[i + 3] !== 255) continue;
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(want[i + k] - got[i + k]);
      sum += d;
      if (d > max) max = d;
    }
    n++;
  }
  const mean = n ? sum / (n * 3) : 0;
  return { assetId, pass: n === 0 || (mean < 0.5 && max <= 2), checkedPixels: n, meanDiff: +mean.toFixed(3), maxDiff: max };
}

/** After slide text is added: the pasted files must be identical to the saved composite. */
export async function verifyAgainstBase(finalPng: Blob, basePng: Blob, placements: Placement[]) {
  const [f, b] = await Promise.all([bitmap(finalPng), bitmap(basePng)]);
  if (f.width !== b.width || f.height !== b.height) return { pass: false, checks: [] as ReturnType<typeof compareOpaque>[] };
  const fc = canvas(f.width, f.height); fc.ctx.drawImage(f, 0, 0);
  const bc = canvas(b.width, b.height); bc.ctx.drawImage(b, 0, 0);
  const checks = placements.map((p) => {
    const want = bc.ctx.getImageData(p.left, p.top, p.width, p.height).data;
    const got = fc.ctx.getImageData(p.left, p.top, p.width, p.height).data;
    // the base region is fully opaque after compositing, so every pixel is compared
    return compareOpaque(want, got, p.assetId);
  });
  return { pass: checks.every((c) => c.pass), checks };
}

/**
 * Photo edits (e.g. new background around a real product photo): the AI edit is resized to the
 * original's size, then each protected design area is checked. If the AI kept it in place, the
 * ORIGINAL pixels are pasted back exactly. If the AI moved or changed it, the edit is rejected.
 */
export async function restoreProtected(original: Blob, edited: Blob, regions: Region[]) {
  const o = await bitmap(original);
  const e = await bitmap(edited);
  const W = o.width, H = o.height;
  const oc = canvas(W, H); oc.ctx.drawImage(o, 0, 0);
  const ec = canvas(W, H); ec.ctx.drawImage(e, 0, 0, W, H);
  const checks: { region: Region; meanDiff: number; restored: boolean }[] = [];
  for (const r of regions) {
    const box = {
      x: Math.max(0, Math.round(r.x * W)),
      y: Math.max(0, Math.round(r.y * H)),
      w: Math.max(1, Math.min(W - Math.round(r.x * W), Math.round(r.w * W))),
      h: Math.max(1, Math.min(H - Math.round(r.y * H), Math.round(r.h * H))),
    };
    const a = oc.ctx.getImageData(box.x, box.y, box.w, box.h);
    const b = ec.ctx.getImageData(box.x, box.y, box.w, box.h).data;
    let sum = 0, n = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      for (let k = 0; k < 3; k++) sum += Math.abs(a.data[i + k] - b[i + k]);
      n += 3;
    }
    const mean = sum / n;
    const ok = mean < 22;
    checks.push({ region: r, meanDiff: +mean.toFixed(2), restored: ok });
    if (ok) ec.ctx.putImageData(a, box.x, box.y); // exact original pixels
  }
  const pass = checks.length > 0 && checks.every((c) => c.restored);
  return { pass, checks, blob: await toPNG(ec.c) };
}

/** Logo scaled for a video of the given width (for the video overlay step). */
export async function scaledPNG(file: Blob, width: number): Promise<Blob> {
  const s = await scaled(file, width);
  return toPNG(s.c);
}
