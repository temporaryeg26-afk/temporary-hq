/**
 * MOTION ENGINE — TEMPORARY™ motion-graphic slides, made by Claude in code.
 * Kinetic Egyptian-Arabic + English type, grain, light sweeps, beat-synced accents, a running ticker,
 * and an ORIGINAL beat generated in the browser (no copyrighted music).
 * Used live (preview with sound) and for recording each slide to MP4.
 */

export type TemplateId = "cinematic" | "spin" | "cards" | "editorial" | "hud" | "split" | "receipt" | "blueprint" | "marquee" | "film";
export type MotionSlide = { ar: string; en: string; seconds: number; index: number; total: number; kind?: "cover" | "check" | "end" | "plain"; template?: TemplateId };

/** Motion templates (styles inspired by popular motion-graphic carousel formats; original designs). */
export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "cinematic", name: "Cinematic thread", desc: "Black, red light leak, word slams, a red thread that runs across all slides." },
  { id: "spin", name: "Text spin", desc: "A giant ring of words rotating behind the headline." },
  { id: "cards", name: "3D cards", desc: "Tilted cards floating in depth behind the text." },
  { id: "editorial", name: "Editorial", desc: "Cream paper, black type, big serif, a red band — magazine feel." },
  { id: "hud", name: "Camera HUD", desc: "Viewfinder frame, crosshair and grid — 'inspect before you pay'." },
  { id: "split", name: "Versus split", desc: "Screen split by a moving red seam, A vs B — perfect for comparisons." },
  { id: "receipt", name: "Receipt", desc: "A paper receipt prints line by line behind the text — 'what are you paying for?'." },
  { id: "blueprint", name: "Tech-pack blueprint", desc: "Deep blue drafting grid, garment outline and measurement arrows." },
  { id: "marquee", name: "Kinetic marquee", desc: "Huge outlined words racing across in opposite directions." },
  { id: "film", name: "Film strip", desc: "Sprocket film frames rolling past, warm grade — archive feel." },
];
const EDITORIAL = { bg: "#ECE6DC", ink: "#121110", dim: "#6F6961", accent: "#D13A2F", plate: "#ECE6DC" };
const BLUEPRINT = { bg: "#0D1B2E", ink: "#EAF0F7", dim: "#7E93AE", accent: "#E5574D", plate: "#EDE7DD" };
const FILM = { bg: "#120E0B", ink: "#F3E9DA", dim: "#8C7B66", accent: "#E5574D", plate: "#EDE7DD" };

export const BPM_DEFAULT = 110;
const AR = '"IBM Plex Sans Arabic"';
const EN = '"Archivo"';
const SERIF = '"Instrument Serif"';

export const PALETTE = { bg: "#090909", ink: "#F1ECE4", dim: "#7C766E", accent: "#E5574D", plate: "#EDE7DD" };

export async function motionFonts() {
  await Promise.all([
    document.fonts.load(`700 120px ${AR}`),
    document.fonts.load(`500 40px ${AR}`),
    document.fonts.load(`800 60px ${EN}`),
    document.fonts.load(`500 30px ${EN}`),
    document.fonts.load(`italic 400 60px ${SERIF}`),
  ]).catch(() => null);
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 4);
const easeInOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxW: number) {
  const lines: string[][] = [];
  let line: string[] = [];
  for (const w of words) {
    const t = [...line, w].join(" ");
    if (ctx.measureText(t).width > maxW && line.length) {
      lines.push(line);
      line = [w];
    } else line.push(w);
  }
  if (line.length) lines.push(line);
  return lines;
}

type Tok = { w: string; accent: boolean; strike: boolean };

/** *word* = red accent, ~word~ = struck through on screen. */
function tokens(text: string): Tok[] {
  const out: Tok[] = [];
  let accent = false, strike = false;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    let w = raw;
    const a0 = w.startsWith("*"), s0 = w.startsWith("~");
    if (a0) accent = true;
    if (s0) strike = true;
    const a1 = /\*[؟?.!،,…]*$/.test(w), s1 = /~[؟?.!،,…]*$/.test(w);
    w = w.replace(/[*~]/g, "");
    if (w) out.push({ w, accent, strike });
    if (a1) accent = false;
    if (s1) strike = false;
  }
  return out;
}

const layers = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>();
function layerFor(ctx: CanvasRenderingContext2D, W: number, H: number) {
  let c = layers.get(ctx);
  if (!c || c.width !== W || c.height !== H) {
    c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    layers.set(ctx, c);
  }
  return c;
}

/**
 * Draw one frame. time = seconds since the slide started; logoBox = where the real logo will be pasted
 * (a light plate goes under it so the dark logo stays readable on black).
 */
export function drawMotion(ctx: CanvasRenderingContext2D, W: number, H: number, s: MotionSlide, time: number, bpm = BPM_DEFAULT, logoBox?: { x: number; y: number; w: number; h: number }) {
  const beat = 60 / bpm;
  const dur = Math.max(2, s.seconds);
  const pIn = clamp(time / 1.2);
  const pOut = clamp((time - (dur - 0.45)) / 0.45);
  const onBeat = 1 - clamp((time % beat) / (beat * 0.3));
  const impact = 1 - clamp(time / 0.35); // the hit at the start of every slide
  const pad = W * 0.08;
  const cover = s.kind === "cover";
  const T: TemplateId = s.template ?? "cinematic";
  const P = T === "editorial" ? EDITORIAL : T === "blueprint" ? BLUEPRINT : T === "film" ? FILM : PALETTE;
  const INK = T === "editorial" ? "18,17,16" : T === "blueprint" ? "234,240,247" : "241,236,228";

  ctx.save();
  // ---------- camera: impact shake + slow push-in
  const shake = (cover ? 18 : 9) * impact * impact + 2 * onBeat * (time < dur - 0.5 ? 1 : 0);
  const zoom = 1 + 0.035 * clamp(time / dur);
  ctx.translate(W / 2 + Math.sin(time * 91) * shake, H / 2 + Math.cos(time * 73) * shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  // ---------- background
  ctx.fillStyle = P.bg;
  ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
  if (T === "cinematic" || T === "spin" || T === "cards" || T === "marquee" || T === "split") {
    // moving red light leak
    const lx = W * (0.75 - 0.5 * clamp(time / dur)), ly = H * (0.25 + 0.1 * Math.sin(time * 0.8));
    const leak = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.75);
    leak.addColorStop(0, `rgba(229,87,77,${0.22 + 0.1 * onBeat})`);
    leak.addColorStop(0.5, "rgba(229,87,77,0.05)");
    leak.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, W, H);
  }
  if (T === "cinematic") {
    ctx.strokeStyle = `rgba(${INK},0.05)`;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const y = H * (0.1 + k * 0.1) + Math.sin(x * 0.01 + time * 1.4 + k) * 14;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (T === "spin") {
    // giant rotating ring of words
    const words = (s.en + " · " + s.ar + " · ").repeat(3);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.47);
    ctx.rotate(time * 0.35 + s.index * 0.6);
    ctx.font = `800 ${Math.round(W * 0.045)}px ${EN}`;
    ctx.fillStyle = `rgba(${INK},0.13)`;
    ctx.textAlign = "center";
    const n = Math.min(120, words.length);
    for (let ring = 0; ring < 2; ring++) {
      const rad = W * (0.46 - ring * 0.12);
      for (let i = 0; i < n; i++) {
        ctx.save();
        ctx.rotate((i / n) * Math.PI * 2 * (ring ? -1 : 1));
        ctx.fillText(words[i], 0, -rad);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  if (T === "cards") {
    // three tilted cards floating in depth
    for (let k = 0; k < 3; k++) {
      const depth = 1 - k * 0.18;
      const ang = (-0.18 + k * 0.17) + Math.sin(time * 0.9 + k) * 0.04;
      const cx = W * (0.32 + k * 0.2) + Math.sin(time * 0.7 + k * 2) * W * 0.02;
      const cy = H * (0.46 + (k - 1) * 0.05) + Math.cos(time * 0.8 + k) * H * 0.015;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.scale(depth * (0.92 + 0.08 * Math.cos(time + k)), depth);
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 40;
      ctx.fillStyle = k === 1 ? "rgba(229,87,77,0.20)" : `rgba(${INK},0.06)`;
      roundRect(ctx, -W * 0.22, -H * 0.2, W * 0.44, H * 0.4, W * 0.03);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${INK},0.18)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  if (T === "editorial") {
    // magazine bands
    ctx.fillStyle = P.ink;
    ctx.fillRect(0, 0, W, H * 0.02);
    ctx.fillStyle = P.accent;
    const bandH = H * 0.1 * easeOut(pIn);
    ctx.fillRect(0, H - bandH, W, bandH);
    ctx.font = `italic 400 ${Math.round(W * 0.22)}px ${SERIF}`;
    ctx.fillStyle = `rgba(${INK},0.06)`;
    ctx.textAlign = "left";
    ctx.fillText("Temporary.", -W * 0.03 + time * 5, H * 0.95);
  }
  if (T === "hud") {
    // grid + viewfinder + crosshair
    ctx.strokeStyle = `rgba(${INK},0.05)`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += W / 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const fx = W * 0.16, fy = H * 0.2, fw = W * 0.68, fh = H * 0.52;
    ctx.strokeStyle = `rgba(${INK},${0.35 + 0.25 * onBeat})`;
    ctx.lineWidth = 2;
    const c = W * 0.05;
    for (const [x, y, dx, dy] of [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * c);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * c, y);
      ctx.stroke();
    }
    ctx.strokeStyle = P.accent;
    const sx = W * 0.5 + Math.sin(time * 1.3) * W * 0.12, sy = H * 0.46 + Math.cos(time * 1.1) * H * 0.08;
    ctx.beginPath();
    ctx.moveTo(sx - c * 0.6, sy);
    ctx.lineTo(sx + c * 0.6, sy);
    ctx.moveTo(sx, sy - c * 0.6);
    ctx.lineTo(sx, sy + c * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, c * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `600 ${Math.round(W * 0.018)}px ${EN}`;
    ctx.fillStyle = P.accent;
    ctx.textAlign = "left";
    ctx.fillText("INSPECTING…  GSM · PRINT · SEAMS · SIZE", fx, fy - W * 0.015);
  }
  if (T === "split") {
    // two halves divided by a moving diagonal red seam
    const sx = W * (0.5 + 0.08 * Math.sin(time * 0.9)) , tilt = W * 0.18;
    const open = easeOut(pIn);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.beginPath();
    ctx.moveTo(sx + tilt * open, 0); ctx.lineTo(W * 1.2, 0); ctx.lineTo(W * 1.2, H); ctx.lineTo(sx - tilt * open, H); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 4 + 3 * onBeat;
    ctx.beginPath(); ctx.moveTo(sx + tilt * open, -10); ctx.lineTo(sx - tilt * open, H + 10); ctx.stroke();
    ctx.font = `800 ${Math.round(W * 0.2)}px ${EN}`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${INK},0.07)`;
    ctx.fillText("A", W * 0.22, H * 0.86);
    ctx.fillText("B", W * 0.8, H * 0.86);
    ctx.font = `800 ${Math.round(W * 0.05)}px ${EN}`;
    ctx.fillStyle = P.accent;
    ctx.fillText("VS", sx, H * 0.16 + 6 * onBeat);
  }
  if (T === "receipt") {
    // a paper receipt printing line by line, slightly rotated, behind the text
    const rw = W * 0.56, rx = W * 0.22;
    const printed = clamp(time / (dur * 0.8));
    const rh = H * 0.9 * easeOut(printed);
    ctx.save();
    ctx.translate(W / 2, 0); ctx.rotate(-0.06); ctx.translate(-W / 2, 0);
    ctx.fillStyle = "rgba(237,231,221,0.13)";
    ctx.fillRect(rx, H * 0.05, rw, rh);
    ctx.font = `500 ${Math.round(W * 0.022)}px ${EN}`;
    ctx.textAlign = "left";
    const items = ["FABRIC ........ ?", "GSM ........... ?", "PRINT ......... ?", "STITCHING ..... ?", "SIZE (CM) ..... ?", "RETURNS ....... ?", "BRAND NAME .... ✕", "HYPE .......... ✕", "———————————————", "TOTAL ..... YOU DECIDE"];
    items.forEach((it, i) => {
      const y = H * 0.1 + i * H * 0.075;
      if (y < H * 0.05 + rh - 10) { ctx.fillStyle = `rgba(${INK},${i > 5 && i < 8 ? 0.34 : 0.26})`; ctx.fillText(it, rx + W * 0.04, y); }
    });
    // zig-zag torn edge
    ctx.fillStyle = P.bg;
    ctx.beginPath();
    const ey = H * 0.05 + rh;
    for (let x = rx; x <= rx + rw; x += 16) ctx.lineTo(x, ey + ((x - rx) / 16) % 2 * 10);
    ctx.lineTo(rx + rw, ey + 30); ctx.lineTo(rx, ey + 30); ctx.fill();
    ctx.restore();
  }
  if (T === "blueprint") {
    ctx.strokeStyle = `rgba(${INK},0.07)`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += W / 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // garment outline drawing itself
    const g = (px: number, py: number): [number, number] => [W * px, H * py];
    const pts = [g(0.36, 0.2), g(0.44, 0.22), g(0.5, 0.25), g(0.56, 0.22), g(0.64, 0.2), g(0.8, 0.3), g(0.74, 0.38), g(0.66, 0.34), g(0.66, 0.78), g(0.34, 0.78), g(0.34, 0.34), g(0.26, 0.38), g(0.2, 0.3), g(0.36, 0.2)];
    const draw = easeInOut(clamp(time / (dur * 0.7))) * (pts.length - 1);
    ctx.strokeStyle = `rgba(${INK},0.28)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i <= Math.floor(draw); i++) ctx.lineTo(...pts[i]);
    const f = draw % 1, i0 = Math.floor(draw);
    if (i0 < pts.length - 1) ctx.lineTo(pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * f, pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * f);
    ctx.stroke();
    ctx.setLineDash([]);
    // measurement arrows
    ctx.strokeStyle = P.accent; ctx.fillStyle = P.accent; ctx.lineWidth = 2;
    const m = easeOut(clamp((time - 0.6) / 1));
    const ay = H * 0.83;
    ctx.beginPath(); ctx.moveTo(W * 0.5 - W * 0.16 * m, ay); ctx.lineTo(W * 0.5 + W * 0.16 * m, ay); ctx.stroke();
    ctx.font = `600 ${Math.round(W * 0.02)}px ${EN}`; ctx.textAlign = "center";
    if (m > 0.9) ctx.fillText("CHEST  ·  ? CM", W * 0.5, ay - 10);
    ctx.textAlign = "left"; ctx.fillStyle = `rgba(${INK},0.4)`;
    ctx.fillText("TECH PACK — TMP/ARCHIVE", W * 0.08, H * 0.9);
  }
  if (T === "marquee") {
    ctx.font = `800 ${Math.round(W * 0.16)}px ${EN}`;
    ctx.textAlign = "left";
    ctx.lineWidth = 2;
    const phrase = "KNOW BEFORE YOU PAY — EVERYTHING IS TEMPORARY — ";
    const pw = ctx.measureText(phrase).width;
    for (let k = 0; k < 6; k++) {
      const dir = k % 2 ? 1 : -1;
      const off = ((time * W * 0.25 * dir + k * 400) % pw + pw) % pw;
      const y = H * (0.14 + k * 0.155);
      ctx.strokeStyle = k === 2 ? `rgba(229,87,77,${0.25 + 0.2 * onBeat})` : `rgba(${INK},0.09)`;
      ctx.strokeText(phrase + phrase, -off, y);
    }
  }
  if (T === "film") {
    // sprocket film strip rolling vertically on both sides + warm grade
    const fw = W * 0.12;
    const roll = (time * H * 0.18) % (H * 0.2);
    for (const x0 of [0, W - fw]) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x0, 0, fw, H);
      for (let y = -H * 0.2 + roll; y < H; y += H * 0.2) {
        ctx.fillStyle = `rgba(${INK},0.07)`;
        ctx.fillRect(x0 + fw * 0.2, y + H * 0.02, fw * 0.6, H * 0.16);
        ctx.fillStyle = `rgba(${INK},0.25)`;
        for (let h = 0; h < 4; h++) ctx.fillRect(x0 + fw * 0.06, y + h * H * 0.05, fw * 0.08, H * 0.022);
        for (let h = 0; h < 4; h++) ctx.fillRect(x0 + fw * 0.86, y + h * H * 0.05, fw * 0.08, H * 0.022);
      }
    }
    const warm = ctx.createLinearGradient(0, 0, W, H);
    warm.addColorStop(0, "rgba(214,140,60,0.10)"); warm.addColorStop(1, "rgba(120,40,30,0.10)");
    ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
    ctx.font = `600 ${Math.round(W * 0.018)}px ${EN}`; ctx.fillStyle = `rgba(${INK},0.45)`; ctx.textAlign = "left";
    ctx.fillText(`ARCHIVE ${String(s.index + 1).padStart(3, "0")}  ·  KODAK-ISH 400`, W * 0.15, H * 0.9);
  }
  // vignette + grain + flicker
  const v = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.25, W / 2, H / 2, W * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, T === "editorial" ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.75)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const r = rand(Math.floor(time * 24) + 11);
  ctx.globalAlpha = T === "editorial" ? 0.05 : 0.08;
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = r() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
  ctx.globalAlpha = 1;
  if (r() > 0.93) {
    ctx.fillStyle = `rgba(${INK},0.08)`;
    ctx.fillRect(r() * W, 0, 1.5, H); // film scratch
  }

  // ---------- giant background number: counts up on the cover, drifts on the others
  const enNum = (s.en.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, "");
  let big = cover ? (enNum ? Math.round(Number(enNum) * easeOut(time / 1.6)).toLocaleString("en-US") : "?") : String(s.index + 1).padStart(2, "0");
  if (s.kind === "end") big = "→";
  ctx.font = `800 ${Math.round(W * (cover && enNum ? 0.34 : 0.62))}px ${EN}`;
  ctx.textAlign = "left";
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(${INK},${0.09 + 0.07 * onBeat})`;
  ctx.strokeText(big, -W * 0.04 + time * 8, H * (cover && enNum ? 0.27 : 0.64));

  // ---------- top bar + progress dots
  ctx.font = `800 ${Math.round(W * 0.028)}px ${EN}`;
  ctx.globalAlpha = easeOut(pIn * 2);
  ctx.fillStyle = P.ink;
  ctx.fillText("TEMPORARY™", pad, pad + W * 0.02);
  ctx.textAlign = "right";
  ctx.fillStyle = P.accent;
  ctx.fillText("● REC", W - pad, pad + W * 0.02);
  ctx.fillRect(pad, pad + W * 0.045, (W - pad * 2) * easeOut(pIn), 3);
  for (let d = 0; d < s.total; d++) {
    ctx.fillStyle = d === s.index ? P.accent : `rgba(${INK},0.25)`;
    const dw = d === s.index ? W * 0.05 : W * 0.014;
    const dx = pad + d * W * 0.024 + (d > s.index ? W * 0.036 : 0);
    ctx.fillRect(dx, pad + W * 0.07, dw, W * 0.008);
  }
  ctx.globalAlpha = 1;

  // ---------- Arabic headline on its own layer (so it can glitch / ghost)
  const L = layerFor(ctx, W, H);
  const lc = L.getContext("2d")!;
  lc.clearRect(0, 0, W, H);
  lc.direction = "rtl";
  lc.textAlign = "right";
  const toks = tokens(s.ar);
  let size = Math.round(W * (cover ? 0.112 : 0.09));
  let lines: Tok[][] = [];
  for (; size > W * 0.05; size -= 4) {
    lc.font = `700 ${size}px ${AR}`;
    lines = [];
    let line: Tok[] = [];
    for (const t of toks) {
      const test = [...line, t].map((x) => x.w).join(" ");
      if (lc.measureText(test).width > W - pad * 2 && line.length) {
        lines.push(line);
        line = [t];
      } else line.push(t);
    }
    if (line.length) lines.push(line);
    if (lines.length * size * 1.32 < H * 0.36) break;
  }
  const lh = size * 1.32;
  const top = H * (cover ? 0.27 : 0.24) + (H * 0.36 - lines.length * lh) / 2;
  const step = beat / 2; // one word per 8th note
  let wi = 0;
  let lastLand = 0;
  const strikes: { x: number; y: number; w: number; at: number }[] = [];
  lines.forEach((ln, li) => {
    const y = top + li * lh + size;
    let x = W - pad;
    for (const t of ln) {
      const at = 0.1 + wi * step;
      const p = clamp((time - at) / 0.22);
      const e = easeOut(p);
      const sc = 1 + 0.8 * (1 - e);
      const ww = lc.measureText(t.w + " ").width;
      const tw = lc.measureText(t.w).width;
      if (p > 0) {
        lc.save();
        lc.globalAlpha = e;
        lc.translate(x - tw / 2, y - size * 0.35);
        lc.scale(sc, sc);
        lc.font = `700 ${size}px ${AR}`;
        lc.textAlign = "center";
        lc.fillStyle = t.accent ? P.accent : P.ink;
        lc.fillText(t.w, 0, size * 0.35);
        lc.restore();
        if (t.accent) {
          lc.fillStyle = P.accent;
          lc.fillRect(x - tw * easeOut((time - at - 0.2) / 0.4), y + size * 0.18, tw * easeOut((time - at - 0.2) / 0.4), Math.max(4, size * 0.06));
        }
        if (t.strike) strikes.push({ x: x - tw, y: y - size * 0.32, w: tw, at: at + 0.35 });
      }
      lastLand = at + 0.22;
      x -= ww;
      wi++;
    }
  });
  for (const st of strikes) {
    const p = easeOut((time - st.at) / 0.3);
    lc.fillStyle = P.accent;
    lc.fillRect(st.x + st.w * (1 - p), st.y, st.w * p, Math.max(5, size * 0.08));
  }
  // chromatic ghost right after each landing + glitch slices at the start
  const ghost = 1 - clamp((time % step) / 0.12);
  if (time < lastLand + 0.2) {
    ctx.globalAlpha = 0.35 * ghost;
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "none";
    ctx.drawImage(L, -6 * ghost, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  if (time < 0.28) {
    const rg = rand(Math.floor(time * 60) + 3);
    for (let k = 0; k < 9; k++) {
      const sy = rg() * H, sh = H * (0.02 + rg() * 0.06);
      ctx.drawImage(L, 0, sy, W, sh, (rg() - 0.5) * W * 0.12, sy, W, sh);
    }
  } else ctx.drawImage(L, 0, 0);

  // ---------- English line: editorial italic serif, types on
  const enTop = top + lines.length * lh + size * 0.75;
  const enDelay = lastLand + 0.1;
  const shown = Math.floor(clamp((time - enDelay) / 0.8) * s.en.length);
  let enSize = Math.round(W * 0.058);
  for (; enSize > W * 0.03; enSize -= 1) {
    ctx.font = `italic 400 ${enSize}px ${SERIF}`;
    if (ctx.measureText(s.en).width <= W - pad * 2) break;
  }
  ctx.textAlign = "right";
  ctx.fillStyle = P.ink;
  ctx.globalAlpha = 0.92;
  ctx.fillText(s.en.slice(0, shown) + (shown < s.en.length && Math.floor(time * 5) % 2 ? "|" : ""), W - pad, enTop);
  ctx.globalAlpha = 1;

  // ---------- accents: self-drawing check / pulsing "send" call to action
  ctx.strokeStyle = P.accent;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(8, W * 0.012);
  if (s.kind === "check") {
    const ap = easeOut((time - enDelay - 0.5) / 0.45);
    const cx = pad + W * 0.08, cy = top - size * 0.2, k = W * 0.07;
    ctx.beginPath();
    ctx.arc(cx, cy, k * 1.35 * easeOut((time - enDelay - 0.3) / 0.3), 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = Math.max(8, W * 0.012);
    const pts: [number, number][] = [[cx - k * 0.6, cy], [cx - k * 0.15, cy + k * 0.5], [cx + k * 0.7, cy - k * 0.55]];
    const a = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), b = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    let left = ap * (a + b);
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    const seg = [a, b];
    for (let i = 0; i < 2 && left > 0; i++) {
      const f = Math.min(1, left / seg[i]);
      ctx.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f);
      left -= seg[i];
    }
    ctx.stroke();
  }
  if (s.kind === "end") {
    const pulse = 1 + 0.08 * Math.sin(time * Math.PI * 2 * (bpm / 60));
    const ap = easeOut((time - enDelay - 0.2) / 0.4);
    ctx.save();
    ctx.globalAlpha = ap;
    ctx.translate(W * 0.4, H * 0.78);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = P.accent;
    roundRect(ctx, -W * 0.27, -W * 0.055, W * 0.54, W * 0.11, W * 0.055);
    ctx.fill();
    ctx.fillStyle = P.ink;
    ctx.font = `700 ${Math.round(W * 0.042)}px ${AR}`;
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillText("ابعتها لصاحبك ➤", 0, W * 0.015);
    ctx.restore();
  }

  // ---------- cover: animated "swipe" cue (curiosity → swipe)
  if (cover) {
    const sp = easeOut((time - 1.2) / 0.4);
    ctx.save();
    ctx.globalAlpha = sp;
    const y = H * 0.8;
    ctx.font = `800 ${Math.round(W * 0.03)}px ${EN}`;
    ctx.textAlign = "left";
    ctx.direction = "ltr";
    ctx.fillStyle = P.ink;
    ctx.letterSpacing = "4px";
    ctx.fillText("SWIPE", pad, y);
    ctx.letterSpacing = "0px";
    const base = pad + W * 0.15;
    for (let k = 0; k < 3; k++) {
      const ph = (time * 2.2 - k * 0.22) % 1;
      ctx.globalAlpha = sp * (0.25 + 0.75 * Math.max(0, Math.sin(ph * Math.PI)));
      ctx.fillStyle = P.accent;
      ctx.fillText("›", base + k * W * 0.035, y);
    }
    ctx.globalAlpha = sp;
    ctx.font = `700 ${Math.round(W * 0.03)}px ${AR}`;
    ctx.direction = "rtl";
    ctx.fillStyle = P.dim;
    ctx.fillText("اسحب وشوف", base + W * 0.33, y);
    ctx.restore();
  }

  // ---------- seamless panorama: a red thread enters at the left edge and leaves at the right edge
  // exactly where the next slide picks it up, so swiping feels like one continuous piece
  const seamY = (i: number) => H * (0.66 + 0.06 * Math.sin(i * 1.7));
  const y0 = seamY(s.index), y1 = seamY(s.index + 1);
  const draw = s.index === 0 ? easeOut((time - 0.6) / 1.2) : 1;
  ctx.save();
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = Math.max(4, W * 0.005);
  ctx.setLineDash([W * 2]);
  ctx.lineDashOffset = W * 2 * (1 - draw);
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.bezierCurveTo(W * 0.35, y0 + H * 0.08 * Math.sin(time * 1.3), W * 0.65, y1 - H * 0.08 * Math.cos(time * 1.1), W, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  // travelling dot riding the thread
  const u = (time * 0.35) % 1;
  const bx = (1 - u) ** 3 * 0 + 3 * (1 - u) ** 2 * u * W * 0.35 + 3 * (1 - u) * u * u * W * 0.65 + u ** 3 * W;
  const by = (1 - u) ** 3 * y0 + 3 * (1 - u) ** 2 * u * (y0 + H * 0.08 * Math.sin(time * 1.3)) + 3 * (1 - u) * u * u * (y1 - H * 0.08 * Math.cos(time * 1.1)) + u ** 3 * y1;
  ctx.fillStyle = P.accent;
  ctx.beginPath();
  ctx.arc(bx, by, W * 0.009 * (1 + 0.5 * onBeat), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // peek of the next slide's number cut by the right edge ("there's more →")
  if (s.index < s.total - 1) {
    ctx.font = `800 ${Math.round(W * 0.3)}px ${EN}`;
    ctx.textAlign = "left";
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(229,87,77,${0.35 + 0.2 * onBeat})`;
    ctx.strokeText(String(s.index + 2).padStart(2, "0"), W * 0.9 - Math.sin(time * 2) * W * 0.01, H * 0.58);
  }

  // ---------- spinning text ring (cover + end)
  if (cover || s.kind === "end") {
    const ring = " KNOW BEFORE YOU PAY ✳ EVERYTHING IS TEMPORARY ✳";
    const cx = pad + W * 0.16, cy = cover ? H * 0.2 : H * 0.62, rad = W * 0.12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.6);
    ctx.font = `700 ${Math.round(W * 0.019)}px ${EN}`;
    ctx.fillStyle = `rgba(${INK},${0.55 * easeOut(pIn * 1.5)})`;
    ctx.textAlign = "center";
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * Math.PI * 2);
      ctx.fillText(ring[i], 0, -rad);
      ctx.restore();
    }
    ctx.fillStyle = P.accent;
    ctx.beginPath();
    ctx.arc(0, 0, W * 0.012 * (1 + 0.6 * onBeat), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- camera HUD: corner brackets + timecode
  ctx.strokeStyle = `rgba(${INK},0.35)`;
  ctx.lineWidth = 2;
  const cb = W * 0.035, m = W * 0.03;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * cb);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * cb, y);
    ctx.stroke();
  }
  const fr = Math.floor(time * 30) % 30, sec = Math.floor(time);
  ctx.font = `500 ${Math.round(W * 0.018)}px ${EN}`;
  ctx.textAlign = "right";
  ctx.fillStyle = P.dim;
  ctx.fillText(`00:0${s.index}:${String(sec).padStart(2, "0")}:${String(fr).padStart(2, "0")}  ·  4:5`, W - pad, pad + W * 0.1);

  // ---------- bottom ticker
  const tick = "  اعرف قبل ما تدفع  ·  KNOW BEFORE YOU PAY  ·  EVERYTHING IS TEMPORARY  ·";
  ctx.font = `600 ${Math.round(W * 0.026)}px ${AR}`;
  ctx.direction = "ltr";
  const tw2 = ctx.measureText(tick).width;
  const ty = H - pad * 0.9;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = P.ink;
  ctx.textAlign = "left";
  for (let x = -((time * 90) % tw2); x < W; x += tw2) ctx.fillText(tick, x, ty);
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.accent;
  ctx.fillRect(0, ty - W * 0.045, W * clamp(time / dur), 2);

  ctx.restore(); // end camera

  // ---------- plate for the real logo (not shaken — the logo is pasted at a fixed spot)
  if (logoBox) {
    ctx.fillStyle = P.plate;
    const p = W * 0.012;
    roundRect(ctx, logoBox.x - p, logoBox.y - p, logoBox.w + p * 2, logoBox.h + p * 2, W * 0.012);
    ctx.fill();
  }

  // ---------- impact flash + whip-out transition
  if (impact > 0) {
    ctx.fillStyle = `rgba(${INK},${0.35 * impact * impact})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (pOut > 0) {
    const e = easeInOut(pOut);
    ctx.globalAlpha = 0.5;
    for (let k = 1; k <= 4; k++) ctx.drawImage(ctx.canvas, -W * 0.06 * k * e, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.accent;
    ctx.fillRect(W * (1 - e), 0, W * e, H);
    ctx.fillStyle = P.bg;
    ctx.fillRect(W * (1 - Math.max(0, e - 0.2)), 0, W, H);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ================================================================== original beat (WebAudio)

/** A dark, minimal 110-BPM beat: kick, clap, hats, sub bass and a low pad. Generated live — ours, royalty-free. */
export function startBeat(ac: AudioContext, out: AudioNode, bpm = BPM_DEFAULT, seconds = 8, startAt = ac.currentTime + 0.05, opts: { counter?: boolean } = {}) {
  const beat = 60 / bpm;
  const master = ac.createGain();
  master.gain.value = 0.8;
  master.connect(out);
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const kick = (t: number) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
  };
  const hat = (t: number, v = 0.12) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise;
    f.type = "highpass";
    f.frequency.value = 8000;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + 0.06);
  };
  const clap = (t: number) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise;
    f.type = "bandpass";
    f.frequency.value = 1500;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + 0.2);
  };
  const bass = (t: number, hz: number, len: number) => {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = hz;
    f.type = "lowpass";
    f.frequency.value = 180;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
  };
  const pad = (t: number, len: number) => {
    [110, 130.81, 155.56].forEach((hz) => {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = "triangle";
      o.frequency.value = hz;
      f.type = "lowpass";
      f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(f).connect(g).connect(master);
      o.start(t);
      o.stop(t + len + 0.1);
    });
  };
  const impactHit = (t: number) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.6);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g2 = ac.createGain();
    s.buffer = noise;
    f.type = "lowpass";
    f.frequency.value = 2500;
    g2.gain.setValueAtTime(0.6, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    s.connect(f).connect(g2).connect(master);
    s.start(t);
    s.stop(t + 0.45);
  };
  const whoosh = (t: number, len: number) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise;
    s.loop = true;
    f.type = "bandpass";
    f.Q.value = 2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + len * 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + len + 0.05);
  };
  const tickSnd = (t: number) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "square";
    o.frequency.value = 2400;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.04);
  };
  impactHit(startAt);
  if (opts.counter) for (let i = 0; i < 14; i++) tickSnd(startAt + 0.1 + i * 0.1);
  whoosh(startAt + seconds - 0.5, 0.45);
  const notes = [55, 55, 51.91, 49];
  const beats = Math.ceil(seconds / beat);
  pad(startAt, seconds);
  for (let b = 0; b < beats; b++) {
    const t = startAt + b * beat;
    if (b % 4 === 0 || b % 4 === 2 || (b % 8 === 7)) kick(t);
    if (b % 4 === 1 || b % 4 === 3) clap(t);
    hat(t + beat / 2, 0.1);
    hat(t, 0.05);
    if (b % 2 === 0) bass(t, notes[Math.floor(b / 4) % notes.length], beat * 1.6);
  }
  master.gain.setValueAtTime(0.8, startAt + seconds - 0.4);
  master.gain.linearRampToValueAtTime(0.0001, startAt + seconds);
  return () => {
    try {
      master.disconnect();
    } catch {
      /* already stopped */
    }
  };
}

/** Where the logo goes (bottom-right, 14% width) — must match the overlay position used when exporting. */
export function logoBoxFor(W: number, H: number, logoAspect: number) {
  const w = Math.round(W * 0.14);
  const h = Math.round(w / (logoAspect || 1));
  return { x: W - w - W * 0.05, y: H - h - H * 0.12, w, h };
}

/** Record one slide (picture + our beat) in real time → WebM with audio. */
export async function recordSlide(s: MotionSlide, W: number, H: number, logoAspect: number, bpm = BPM_DEFAULT): Promise<Blob> {
  await motionFonts();
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const box = logoBoxFor(W, H, logoAspect);
  drawMotion(ctx, W, H, s, 0, bpm, box);
  const ac = new AudioContext();
  await ac.resume();
  const dest = ac.createMediaStreamDestination();
  const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start(250);
  const stop = startBeat(ac, dest, bpm, s.seconds, ac.currentTime + 0.05, { counter: s.kind === "cover" && /\d/.test(s.en) });
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      drawMotion(ctx, W, H, s, el, bpm, box);
      if (el >= s.seconds) return res();
      setTimeout(tick, 1000 / 30);
    };
    tick();
  });
  rec.stop();
  await done;
  stop();
  await ac.close();
  return new Blob(chunks, { type: "video/webm" });
}
