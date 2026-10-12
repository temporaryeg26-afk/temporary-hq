/**
 * DESIGN RENDERER — makes the brand's typographic posts, carousels, story frames and motion slides
 * right here in the browser (no AI image tool, so the Arabic text is always exact).
 * The real logo is pasted on top by composite() / overlayVideo() from your original file.
 */
import { resolveOverlays } from "./assets";
import { currentLogin, uploadFile } from "./github";
import { Aspect, bitmap, composite, SIZES } from "./media";
import { mutate, newId, now } from "./store";
import type { ContentItem, Media } from "./types";
import { overlayVideo } from "./video";

export type Theme = { bg: string; fg: string; accent: string; muted: string };
export const DARK: Theme = { bg: "#0E0D0C", fg: "#ECE7DF", accent: "#E5574D", muted: "#8E877E" };
export const LIGHT: Theme = { bg: "#E9E4DC", fg: "#121110", accent: "#C8372D", muted: "#6F6961" };

export type Frame = { text: string; kicker?: string; index?: number; total?: number; seconds?: number };

const FONT_AR = '"IBM Plex Sans Arabic"';
const FONT_EN = '"Archivo"';
const isAr = (s: string) => /[؀-ۿ]/.test(s);

export async function fontsReady() {
  await Promise.all([
    document.fonts.load(`700 80px ${FONT_AR}`),
    document.fonts.load(`500 40px ${FONT_AR}`),
    document.fonts.load(`700 40px ${FONT_EN}`),
  ]).catch(() => null);
}

/** Pick dark or light so the real logo stays visible. */
export async function themeForLogo(logo: Blob | null): Promise<Theme> {
  if (!logo) return DARK;
  const img = await bitmap(logo);
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = Math.max(1, Math.round((img.height * 64) / img.width));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
  return n && sum / n < 110 ? LIGHT : DARK;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}

/** Fit the text: start big, shrink until it fits the box. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxH: number, start: number, min: number) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `700 ${size}px ${isAr(text) ? FONT_AR : FONT_EN}`;
    const lines = wrap(ctx, text, maxW);
    const lh = size * 1.35;
    if (lines.length * lh <= maxH) return { size, lines, lh };
  }
  ctx.font = `700 ${min}px ${isAr(text) ? FONT_AR : FONT_EN}`;
  return { size: min, lines: wrap(ctx, text, maxW), lh: min * 1.35 };
}

/** Draw one frame. t = 0..1 animation progress (1 = fully in). */
export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, f: Frame, th: Theme, t = 1, tall = false) {
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  ctx.save();
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, H);
  // subtle grain (deterministic)
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2600; i++) {
    const x = (i * 7919) % W, y = (i * 104729) % H;
    ctx.fillStyle = i % 2 ? th.fg : "#000";
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  const pad = W * 0.09;
  const ar = isAr(f.text);
  ctx.direction = ar ? "rtl" : "ltr";
  ctx.textAlign = ar ? "right" : "left";
  const xText = ar ? W - pad : pad;

  // kicker + counter
  const k = ease(t * 2);
  ctx.globalAlpha = k;
  ctx.font = `700 ${Math.round(W * 0.034)}px ${FONT_AR}`;
  ctx.fillStyle = th.accent;
  if (f.kicker) ctx.fillText(f.kicker, xText, pad + W * 0.03);
  if (f.total && f.total > 1) {
    ctx.fillStyle = th.muted;
    ctx.textAlign = ar ? "left" : "right";
    ctx.font = `700 ${Math.round(W * 0.028)}px ${FONT_EN}`;
    ctx.fillText(`${String((f.index ?? 0) + 1).padStart(2, "0")}/${String(f.total).padStart(2, "0")}`, ar ? pad : W - pad, pad + W * 0.03);
    ctx.textAlign = ar ? "right" : "left";
  }
  ctx.globalAlpha = 1;

  // main text: slides up + fades in
  const boxTop = H * (tall ? 0.24 : 0.2);
  const boxH = H * (tall ? 0.42 : 0.56);
  const fit = fitText(ctx, f.text || " ", W - pad * 2, boxH, Math.round(W * 0.095), Math.round(W * 0.04));
  const blockH = fit.lines.length * fit.lh;
  const y0 = boxTop + (boxH - blockH) / 2 + fit.size;
  ctx.fillStyle = th.fg;
  fit.lines.forEach((ln, i) => {
    const p = ease(t * 1.6 - i * 0.12);
    ctx.globalAlpha = p;
    ctx.fillText(ln, xText, y0 + i * fit.lh + (1 - p) * W * 0.04);
  });
  ctx.globalAlpha = 1;

  // accent rule that grows (the through-line)
  const ruleW = (W - pad * 2) * 0.22 * ease(t * 1.4);
  ctx.fillStyle = th.accent;
  const ry = y0 + blockH + fit.size * 0.1;
  ctx.fillRect(ar ? W - pad - ruleW : pad, Math.min(ry, H * 0.86), ruleW, Math.max(4, W * 0.006));

  ctx.restore();
}

export async function renderPNG(f: Frame, aspect: Aspect, th: Theme): Promise<Blob> {
  await fontsReady();
  const { w, h } = SIZES[aspect];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  drawFrame(c.getContext("2d")!, w, h, f, th, 1, aspect === "9:16");
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

/** Record an animated slide (text builds in, holds) as a video in real time, then hand back the blob. */
export async function renderMotion(f: Frame, aspect: Aspect, th: Theme, seconds: number): Promise<Blob> {
  await fontsReady();
  const { w, h } = SIZES[aspect];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  drawFrame(ctx, w, h, f, th, 0, aspect === "9:16");
  const stream = c.captureStream(30);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  const total = Math.max(2, seconds) * 1000;
  const anim = Math.min(1600, total * 0.4);
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      const el = performance.now() - t0;
      drawFrame(ctx, w, h, f, th, el / anim, aspect === "9:16");
      if (el >= total) return res();
      setTimeout(tick, 1000 / 30); // setTimeout keeps running when the tab is visible; keep HQ in front while rendering
    };
    tick();
  });
  rec.stop();
  await done;
  return new Blob(chunks, { type: "video/webm" });
}

/** Network hiccups happen (big uploads to GitHub): try again a few times before giving up. */
async function retry<T>(fn: () => Promise<T>, what: string, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`${what} failed after ${tries} tries: ${(last as Error)?.message ?? last}`);
}

export type RenderJob = { slot: string; aspect: Aspect; frame: Frame; motion: boolean };

const KICKER = "اعرف قبل ما تدفع";

/** Which frames a piece needs. Only typographic formats are rendered here. */
export function jobsFor(item: ContentItem): RenderJob[] {
  const o = item.output ?? {};
  if (item.format === "static") {
    const text = [o.headline, o.copy && String(o.copy).length < 90 ? o.copy : ""].filter(Boolean).join("\n");
    return [{ slot: "post", aspect: "4:5", frame: { text: text || item.title, kicker: KICKER }, motion: false }];
  }
  if (item.format === "carousel" || item.format === "motion_carousel") {
    const slides: any[] = o.slides ?? [];
    return slides.map((s, i) => ({
      slot: `slide-${s.n ?? i + 1}`,
      aspect: "4:5" as Aspect,
      frame: { text: String(s.copy ?? ""), kicker: KICKER, index: i, total: slides.length, seconds: Number(s.seconds) || 5 },
      motion: item.format === "motion_carousel",
    }));
  }
  if (item.format === "story") {
    const frames: any[] = o.frames ?? [];
    return frames.map((f, i) => ({ slot: `frame-${f.n ?? i + 1}`, aspect: "9:16" as Aspect, frame: { text: String(f.text ?? ""), kicker: KICKER, index: i, total: frames.length }, motion: false }));
  }
  return [];
}

export const RENDERABLE = ["static", "carousel", "motion_carousel", "story"];

/** How many of a piece's frames already have a finished design. */
export function missingJobs(item: ContentItem, media: Media[]): RenderJob[] {
  const done = new Set(media.filter((m) => m.content_id === item.id && m.status === "done").map((m) => m.slot));
  return jobsFor(item).filter((j) => !done.has(j.slot));
}

/**
 * Render a piece's frames, paste the real logo, save each one to GitHub as soon as it's made
 * (so progress is never lost), and hide earlier renders of the same slot (nothing is deleted).
 * only = render just these slots (to resume); otherwise render all of them.
 */
export async function renderPiece(brandId: string, item: ContentItem, onStep?: (s: string) => void, only?: RenderJob[]) {
  const jobs = only ?? jobsFor(item);
  if (!jobs.length) return 0;
  const specs = item.output?.overlays?.length ? item.output.overlays : [{ asset_kind: "logo", position: "bottom-left", width_pct: 14 }];
  const story = [{ asset_kind: "logo", position: "top-left", width_pct: 14 }];
  let theme: Theme | null = null;
  let n = 0;
  for (const [i, j] of jobs.entries()) {
    const { overlays, missing } = await retry(() => resolveOverlays(brandId, j.aspect === "9:16" ? story : specs, item.product_id), "Loading your logo");
    if (!theme) theme = await themeForLogo(overlays.find((o) => o)?.file ?? null);
    const id = newId();
    let row: Media;
    if (!j.motion) {
      onStep?.(`Designing ${i + 1}/${jobs.length}…`);
      const base = await renderPNG(j.frame, j.aspect, theme);
      const r = await composite(base, j.aspect, overlays);
      const path = `${brandId}/files/media/${id}.png`;
      onStep?.(`Saving ${i + 1}/${jobs.length}…`);
      await retry(() => uploadFile(path, r.blob, `HQ (${currentLogin()}): design for ${item.title}`), "Saving the image");
      row = { id, content_id: item.id, kind: "image", slot: j.slot, made_with: "HQ renderer", status: r.pass ? "done" : "rejected", storage_path: path, base_path: path, fidelity: { method: "pixel", pass: r.pass, placements: r.placements, checks: r.checks, missing }, note: null, created_by: currentLogin(), created_at: now() };
    } else {
      onStep?.(`Animating slide ${i + 1}/${jobs.length} (${j.frame.seconds}s — keep this tab in front)…`);
      const webm = await renderMotion(j.frame, j.aspect, theme, j.frame.seconds ?? 5);
      onStep?.(`Converting slide ${i + 1}/${jobs.length} to MP4 + logo…`);
      const mp4 = await overlayVideo(webm, overlays.map((o) => ({ file: o.file, position: o.position, widthPct: o.widthPct })));
      const path = `${brandId}/files/media/${id}.mp4`;
      onStep?.(`Saving slide ${i + 1}/${jobs.length}…`);
      await retry(() => uploadFile(path, mp4, `HQ (${currentLogin()}): motion slide for ${item.title}`), "Saving the video");
      row = { id, content_id: item.id, kind: "video", slot: j.slot, made_with: "HQ renderer (motion)", status: "done", storage_path: path, base_path: null, fidelity: { method: "overlay", overlays: overlays.length, missing }, note: "Silent video — add music in Instagram when posting.", created_by: currentLogin(), created_at: now() };
    }
    await retry(
      () => mutate<Media>(brandId, "media", (d) => [...d.map((m) => (m.content_id === item.id && m.slot === row.slot && m.status === "done" ? { ...m, status: "rejected" as const } : m)), row], `design ${row.slot} for ${item.title}`),
      "Saving the design record",
    );
    n++;
  }
  return n;
}
