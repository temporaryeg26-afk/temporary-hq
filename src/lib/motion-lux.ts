/**
 * LUXURY CHROME — the TEMPORARY™ motion-carousel template.
 * Black / bone / chrome; pink only for what the seller says (gets crossed out); lime only for data.
 * Every slide gets an illustration that ACTS OUT its point (fabric on a scale, print in a washer,
 * stitches under a loupe, a measuring tape, a return label…), picked from the slide's words.
 * The headline is on screen from the very first frame (the frame people see while swiping).
 * Music: one original track — each slide plays the next chord, so swiping sounds like one piece.
 */

export type LuxSlide = { ar: string; en: string; seconds: number; index: number; total: number; kind?: "cover" | "check" | "end" | "plain" };
export type LuxExtras = { founder?: CanvasImageSource | null; series?: string };
export type Topic = "cover" | "end" | "fabric" | "print" | "stitch" | "size" | "returns" | "price" | "limited" | "plain";

const C = { black: "#0B0B0B", bone: "#ECE8E1", mute: "#8E8A83", pink: "#D4567F", lime: "#B5E61D", line: "#2A2A2A" };
const KUFI = '"Reem Kufi", "Cairo", sans-serif';
const CAIRO = '"Cairo", sans-serif';
const WIDE = '"Syncopate", "Archivo", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export async function luxFonts() {
  await Promise.all([
    document.fonts.load(`700 80px ${KUFI}`),
    document.fonts.load(`800 40px ${CAIRO}`),
    document.fonts.load(`600 40px ${CAIRO}`),
    document.fonts.load(`700 40px ${WIDE}`),
    document.fonts.load(`600 30px ${MONO}`),
  ]).catch(() => null);
}

const cl = (x: number) => Math.min(1, Math.max(0, x));
const out4 = (x: number) => 1 - Math.pow(1 - cl(x), 4);
const outBack = (x: number) => {
  const t = cl(x), c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const inOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const prog = (t: number, at: number, dur: number) => cl((t - at) / dur);

export function topicOf(s: LuxSlide): Topic {
  if (s.kind === "cover" || s.index === 0) return "cover";
  if (s.kind === "end" || s.index === s.total - 1) return "end";
  const x = `${s.ar} ${s.en}`.toLowerCase().replace(/(^|\s)[0-9٠-٩]{1,2}\s*[—-]\s*/g, " ");
  if (/خياط|غرز|stitch|seam/.test(x)) return "stitch";
  if (/طباع|غسال|print|wash|peel/.test(x)) return "print";
  if (/مقاس|سنتي|size|centim|\bcm\b|s m l/.test(x)) return "size";
  if (/ترجع|استرجاع|استبدال|return|exchange|refund/.test(x)) return "returns";
  if (/قماش|وزن|خامة|gsm|fabric|weigh|cotton|قطن/.test(x)) return "fabric";
  if (/limited|ليمتد|محدود|restock|كام قطعة/.test(x)) return "limited";
  if (/\d[\d,٬]*|[٠-٩]{3,}|price|سعر|egp|جنيه/.test(x)) return "price";
  return "plain";
}

type Tok = { w: string; accent: boolean; strike: boolean };
function tokens(text: string): Tok[] {
  const out: Tok[] = [];
  let accent = false, strike = false;
  for (const raw of text.replace(/\n/g, " ").split(/\s+/).filter(Boolean)) {
    let w = raw;
    if (w.startsWith("*")) accent = true;
    if (w.startsWith("~")) strike = true;
    const a1 = /\*[؟?.!،,…»]*$/.test(w), s1 = /~[؟?.!،,…»]*$/.test(w);
    w = w.replace(/[*~]/g, "");
    if (w) out.push({ w, accent, strike });
    if (a1) accent = false;
    if (s1) strike = false;
  }
  return out;
}

function chrome(ctx: CanvasRenderingContext2D, x: number, w: number, sheen: number) {
  const gx = x + w * (2.2 - 1.7 * sheen); // sweeps in from the right, settles centred = bright chrome
  const g = ctx.createLinearGradient(gx - w * 1.3, 0, gx + w * 1.3, 0);
  const stops: [number, string][] = [[0, "#7d7d7d"], [0.22, "#f6f6f6"], [0.38, "#9c9c9c"], [0.5, "#ffffff"], [0.64, "#8f8f8f"], [0.82, "#e9e9e9"], [1, "#a4a4a4"]];
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const grainCanvas = (() => {
  let c: HTMLCanvasElement | null = null;
  let last = -1;
  return (t: number) => {
    if (!c) {
      c = document.createElement("canvas");
      c.width = 160;
      c.height = 200;
    }
    const f = Math.floor(t * 12);
    if (f !== last) {
      last = f;
      const g = c.getContext("2d")!;
      const img = g.createImageData(160, 200);
      let s = (f * 9301 + 49297) >>> 0;
      for (let i = 0; i < img.data.length; i += 4) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const v = (s >>> 24) & 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = (s & 1) ? 20 : 0;
      }
      g.putImageData(img, 0, 0);
    }
    return c;
  };
})();

/** Where the real logo goes in this template (bottom-left, on a small bone plate). */
export function luxLogoBox(W: number, H: number, logoAspect: number) {
  const w = Math.round(W * 0.11);
  const h = Math.round(w / (logoAspect || 1));
  return { x: Math.round(W * 0.07), y: Math.round(H - W * 0.05 - h), w, h };
}

export function drawLux(ctx: CanvasRenderingContext2D, W: number, H: number, s: LuxSlide, t: number, logoBox?: { x: number; y: number; w: number; h: number }, ex: LuxExtras = {}) {
  const u = W / 100;
  const topic = topicOf(s);
  const D = Math.max(2, s.seconds);
  const AR = /[\u0600-\u06FF]/;
  const toks: Tok[] = [];
  for (const k of tokens(s.ar)) {
    const prev = toks[toks.length - 1];
    // keep Latin runs together ("S M L", "01 —") so they read left-to-right as one piece
    if (prev && !AR.test(prev.w) && !AR.test(k.w) && prev.accent === k.accent && prev.strike === k.strike) prev.w += " " + k.w;
    else toks.push({ ...k });
  }
  const strikeWord = toks.filter((k) => k.strike).map((k) => k.w).join(" ");
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, W, H);

  // gentle camera drift so nothing is ever static
  const drift = 1 + 0.025 * (t / D);
  ctx.translate(W / 2, H / 2);
  ctx.scale(drift, drift);
  ctx.translate(-W / 2, -H / 2);

  // ---------- founder (cover + end)
  const hasFounder = (topic === "cover" || topic === "end") && ex.founder;
  if (hasFounder) {
    const img = ex.founder as any;
    const iw = 124 * u, ih = iw * ((img.height || 1) / (img.width || 1));
    const push = 1 + 0.07 * cl(t / 6);
    ctx.save();
    ctx.translate(-12 * u + iw * 0.47, 5 * u + ih * 0.25);
    ctx.scale(push, push);
    ctx.translate(-(-12 * u + iw * 0.47), -(5 * u + ih * 0.25));
    ctx.filter = "grayscale(1) contrast(1.15) brightness(0.8)";
    ctx.drawImage(img, -12 * u, 5 * u, iw, ih);
    ctx.filter = "none";
    ctx.restore();
    const g = ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, "#0B0B0B");
    g.addColorStop(0.28, "rgba(11,11,11,0.94)");
    g.addColorStop(0.52, "rgba(11,11,11,0.4)");
    g.addColorStop(0.68, "rgba(11,11,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, H * 0.16);
    g2.addColorStop(0, "rgba(11,11,11,0.8)");
    g2.addColorStop(1, "rgba(11,11,11,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H * 0.16);
  }

  // ---------- giant outlined number (inner slides)
  if (topic !== "cover" && topic !== "end") {
    const n = String(s.index).padStart(2, "0");
    const p = out4(t / 1.2);
    ctx.font = `700 ${27 * u}px ${WIDE}`;
    ctx.textAlign = "left";
    ctx.lineWidth = 0.22 * u;
    ctx.strokeStyle = `rgba(236,232,225,${0.2 * (0.4 + 0.6 * p)})`;
    ctx.strokeText(n, 5 * u - 4 * u * (1 - p), 11 * u + 27 * u * 0.8);
  }

  // ---------- layout of the text block (bottom), so the visual knows its room
  const pad = 7 * u;
  const big = topic === "cover" ? 10 : topic === "end" ? 11 : topic === "plain" ? 10 : 8.2;
  let size = big * u;
  let lines: Tok[][] = [];
  for (; size > 5 * u; size -= 0.3 * u) {
    ctx.font = `700 ${size}px ${KUFI}`;
    lines = [];
    let line: Tok[] = [];
    for (const k of toks) {
      const test = [...line, k].map((x) => x.w).join(" ");
      if (ctx.measureText(test).width > W - pad * 2 && line.length) {
        lines.push(line);
        line = [k];
      } else line.push(k);
    }
    if (line.length) lines.push(line);
    if (lines.length <= 3) break;
  }
  const lh = size * 1.42;
  const enSize = 2.55 * u;
  ctx.font = `700 ${enSize}px ${WIDE}`;
  const enWords = s.en.toUpperCase().split(/\s+/).filter(Boolean);
  const enLines: string[] = [];
  {
    let l: string[] = [];
    for (const w of enWords) {
      if (ctx.measureText([...l, w].join(" ")).width > W - pad * 2 && l.length) {
        enLines.push(l.join(" "));
        l = [w];
      } else l.push(w);
    }
    if (l.length) enLines.push(l.join(" "));
  }
  const enLh = enSize * 1.7;
  const bottom = H - (topic === "end" ? 16 : 12) * u;
  const enTop = bottom - enLines.length * enLh;
  const headTop = enTop - 2.2 * u - lines.length * lh;
  const visTop = 17 * u, visBottom = headTop - 3 * u;
  const cx = W / 2, cy = (visTop + visBottom) / 2;

  // ---------- topic visual
  ctx.save();
  visual(ctx, topic, t, D, u, W, H, cx, cy, visTop, visBottom, s, strikeWord, Boolean(hasFounder));
  ctx.restore();

  // ---------- headline (visible from frame 0)
  const rise = (1 - out4(t / 0.55)) * 1.2 * u;
  ctx.font = `700 ${size}px ${KUFI}`;
  ctx.textAlign = "left";
  const accents = toks.filter((k) => k.accent);
  let ai = 0;
  lines.forEach((ln, li) => {
    const y = headTop + li * lh + size * 1.02 + rise;
    let x = W - pad;
    const space = ctx.measureText(" ").width;
    for (const k of ln) {
      const w = ctx.measureText(k.w).width;
      x -= w;
      ctx.direction = AR.test(k.w) ? "rtl" : "ltr";
      ctx.textAlign = "left";
      const isAcc = k.accent;
      const accIdx = isAcc ? ai++ : -1;
      ctx.save();
      // end slide: first accent (the "name") dissolves, last accent (the "piece") slams in chrome
      const endDissolve = topic === "end" && (k.strike || (isAcc && accents.length > 1 && accIdx === 0));
      const endSlam = topic === "end" && isAcc && !endDissolve && accIdx === accents.length - 1;
      if (endDissolve) {
        const p = prog(t, 1.5, 1.2);
        ctx.filter = `blur(${(0.5 * u * p).toFixed(1)}px)`;
        ctx.globalAlpha = 1 - 0.55 * p;
        ctx.fillStyle = C.pink;
        ctx.fillText(k.w, x, y);
      } else if (endSlam) {
        const p = prog(t, 1.9, 0.6);
        const sc = p < 0.6 ? 1.9 - 0.92 * (p / 0.6) : 0.98 + 0.02 * ((p - 0.6) / 0.4);
        ctx.globalAlpha = cl(p / 0.3);
        ctx.filter = `blur(${(8 * (1 - cl(p / 0.6))).toFixed(1)}px)`;
        ctx.translate(x + w / 2, y - size * 0.35);
        ctx.scale(sc, sc);
        ctx.translate(-(x + w / 2), -(y - size * 0.35));
        ctx.fillStyle = chrome(ctx, x, w, prog(t, 2.4, 1.8));
        ctx.fillText(k.w, x, y);
      } else if (isAcc) {
        ctx.fillStyle = chrome(ctx, x, w, out4(prog(t, topic === "cover" ? 1.4 : 0.8, 1.8)));
        ctx.fillText(k.w, x, y);
        if (topic === "cover") {
          // censor bar pulls away
          const p = 1 - inOut(prog(t, 1.1, 0.55));
          if (p > 0) {
            ctx.fillStyle = C.bone;
            ctx.fillRect(x - w * 0.04, y - size * 0.86, (w * 1.08) * p, size * 1.0);
          }
        }
      } else if (k.strike) {
        ctx.fillStyle = C.pink;
        ctx.fillText(k.w, x, y);
        const p = inOut(prog(t, 1.6, 0.4));
        ctx.fillStyle = C.bone;
        ctx.fillRect(x - w * 0.03, y - size * 0.34, w * 1.06 * p, Math.max(2, 0.5 * u));
      } else {
        ctx.fillStyle = C.bone;
        ctx.fillText(k.w, x, y);
      }
      ctx.restore();
      x -= space;
    }
  });

  ctx.direction = "ltr";
  // ---------- English line
  ctx.font = `700 ${enSize}px ${WIDE}`;
  ctx.textAlign = "right";
  ctx.fillStyle = C.mute;
  const enP = out4(prog(t, topic === "cover" ? 0.9 : 0.25, 0.7));
  ctx.globalAlpha = 0.25 + 0.75 * enP;
  enLines.forEach((l, i) => ctx.fillText(l, W - pad, enTop + (i + 0.8) * enLh + (1 - enP) * 1.5 * u));
  ctx.globalAlpha = 1;

  // ---------- frame chrome: progress bars, meta row, bottom row
  const barsY = 3.2 * u, gap = 1 * u, bw = (W - 8 * u - gap * (s.total - 1)) / s.total;
  for (let i = 0; i < s.total; i++) {
    const x = 4 * u + i * (bw + gap);
    ctx.fillStyle = "rgba(236,232,225,0.18)";
    ctx.fillRect(x, barsY, bw, Math.max(2, 0.45 * u));
    const f = i < s.index ? 1 : i === s.index ? cl(t / D) : 0;
    ctx.fillStyle = C.bone;
    ctx.fillRect(x, barsY, bw * f, Math.max(2, 0.45 * u));
  }
  ctx.font = `600 ${2.1 * u}px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillStyle = C.mute;
  const series = (ex.series ?? "KNOW BEFORE YOU PAY").toUpperCase();
  ctx.fillText(series, 7 * u, 8.4 * u);
  ctx.textAlign = "right";
  const LABEL: Record<Topic, string> = { cover: "THE HOOK", end: "THE RULE", fabric: "FABRIC", print: "PRINT", stitch: "STITCHING", size: "SIZE", returns: "RETURNS", price: "PRICE", limited: "LIMITED", plain: "NOTE" };
  const inner = s.total - 2;
  const right = topic === "cover" || topic === "end" ? LABEL[topic] : `${LABEL[topic]} · ${String(s.index).padStart(2, "0")}/${String(Math.max(1, inner)).padStart(2, "0")}`;
  ctx.fillStyle = C.bone;
  ctx.fillText(right, W - 7 * u, 8.4 * u);

  if (topic === "end") {
    const p = out4(prog(t, 3.0, 0.8));
    ctx.globalAlpha = p;
    ctx.textAlign = "right";
    ctx.font = `800 ${2.8 * u}px ${CAIRO}`;
    ctx.fillStyle = C.bone;
    ctx.fillText("احفظ البوست", W - 7 * u - 4.4 * u, H - 5.4 * u);
    // bookmark icon
    const bx = W - 7 * u - 3.2 * u, by = H - 8.2 * u, bwid = 2.6 * u, bh = 3.2 * u;
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 0.35 * u;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bwid, by);
    ctx.lineTo(bx + bwid, by + bh);
    ctx.lineTo(bx + bwid / 2, by + bh * 0.72);
    ctx.lineTo(bx, by + bh);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `800 ${2.6 * u}px ${CAIRO}`;
    ctx.textAlign = "right";
    ctx.fillStyle = C.bone;
    const nudge = Math.sin(t * 4) * 0.5 * u;
    ctx.fillText("اسحب  ←", W - 7 * u + nudge, H - 5.4 * u);
  }

  // logo plate (the real logo is pasted on top by the recorder)
  if (!logoBox) {
    ctx.font = `700 ${1.9 * u}px ${WIDE}`;
    ctx.textAlign = "left";
    ctx.fillStyle = C.mute;
    ctx.fillText("TEMPORARY™", 7 * u, H - 5.4 * u);
  }
  if (logoBox) {
    ctx.fillStyle = C.bone;
    rr(ctx, logoBox.x - 0.8 * u, logoBox.y - 0.8 * u, logoBox.w + 1.6 * u, logoBox.h + 1.6 * u, 0.6 * u);
    ctx.fill();
  }
  ctx.restore();

  // vignette + grain (outside the drift)
  const v = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.42, W / 2, H * 0.5, W * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(grainCanvas(t), 0, 0, W, H);
  ctx.restore();
}

function visual(ctx: CanvasRenderingContext2D, topic: Topic, t: number, D: number, u: number, W: number, H: number, cx: number, cy: number, top: number, bottom: number, s: LuxSlide, strikeWord: string, hasFounder: boolean) {
  const room = bottom - top;
  const fit = Math.min(1, room / (60 * u));
  ctx.translate(cx, cy);
  ctx.scale(fit, fit);
  ctx.translate(-cx, -cy);

  const mono = (sz: number, w = 600) => `${w} ${sz * u}px ${MONO}`;

  if (topic === "cover") {
    const nums = (s.en.match(/\d[\d,]*/g) ?? []).map((n) => n.replace(/,/g, ""));
    if (!hasFounder) {
      // no founder image yet: a giant counter does the hook instead
      const target = Number(nums[0] ?? 0);
      const p = out4(t / 1.6);
      const txt = target ? Math.round(target * p).toLocaleString("en-US") : "???";
      ctx.font = `700 ${22 * u}px ${WIDE}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 0.25 * u;
      ctx.strokeStyle = "rgba(236,232,225,0.35)";
      ctx.strokeText(txt, cx, cy + 8 * u);
      ctx.font = mono(2.2);
      ctx.fillStyle = C.lime;
      ctx.fillText(target ? "EGP" : "", cx, cy + 16 * u);
    }
    // the list of what's coming, as blinking bars
    const rows = Math.min(5, Math.max(0, s.total - 2));
    const widths = [1, 0.74, 0.88, 0.62, 0.8];
    for (let i = 0; i < rows; i++) {
      const y = 38 * u + i * 4.3 * u;
      const bt = t - (0.4 + i * 0.3);
      const blink = bt > 0 && bt % 2.4 < 0.19 && bt % 2.4 > 0.08 ? 0.25 : 0.92;
      ctx.font = mono(2.1);
      ctx.textAlign = "right";
      ctx.fillStyle = C.lime;
      ctx.fillText(String(i + 1).padStart(2, "0"), W - 6 * u, y + 1.6 * u);
      ctx.globalAlpha = blink;
      ctx.fillStyle = C.bone;
      const bw = 18 * u * widths[i];
      ctx.fillRect(W - 6 * u - 4 * u - bw, y, bw, 2 * u);
      ctx.globalAlpha = 1;
    }
    return;
  }

  if (topic === "end") return;

  if (topic === "fabric") {
    // hang tag with the seller's word, crossed out
    if (strikeWord) {
      const p = out4(prog(t, 0.9, 0.8));
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(cx + 20 * u, top + 9 * u + (1 - p) * 3 * u);
      ctx.rotate((9 * Math.PI) / 180);
      ctx.font = `700 ${2.9 * u}px ${WIDE}`;
      const tw = ctx.measureText(strikeWord.toUpperCase()).width;
      ctx.fillStyle = C.black;
      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 1.5;
      rr(ctx, -tw / 2 - 4.4 * u, -2.6 * u, tw + 7 * u, 5.2 * u, 0.6 * u);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-tw / 2 - 2.6 * u, 0, 0.7 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = C.pink;
      ctx.textAlign = "left";
      ctx.fillText(strikeWord.toUpperCase(), -tw / 2, 1.05 * u);
      const sp = inOut(prog(t, 1.9, 0.4));
      ctx.fillStyle = C.bone;
      ctx.fillRect(-tw / 2 - 0.5 * u, -0.25 * u, (tw + u) * sp, Math.max(2, 0.3 * u));
      ctx.restore();
    }
    // swatch drops on a scale
    const p = prog(t, 0.3, 0.9);
    const yOff = (1 - outBack(p)) * -14 * u;
    const rot = (-4 - 10 * (1 - outBack(p))) * (Math.PI / 180);
    ctx.save();
    ctx.globalAlpha = cl(p * 3);
    ctx.translate(cx, cy - 6 * u + yOff);
    ctx.rotate(rot);
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 5 * u;
    ctx.shadowOffsetY = 3 * u;
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(-17 * u, -17 * u, 34 * u, 34 * u);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(236,232,225,0.07)";
    for (let k = -17 * u; k < 17 * u; k += 0.9 * u) {
      ctx.fillRect(-17 * u, k, 34 * u, 0.35 * u);
      ctx.fillRect(k, -17 * u, 0.35 * u, 34 * u);
    }
    ctx.restore();
    // platform
    const g = ctx.createLinearGradient(cx - 26 * u, 0, cx + 26 * u, 0);
    g.addColorStop(0, "rgba(154,154,154,0)");
    g.addColorStop(0.5, "#9a9a9a");
    g.addColorStop(1, "rgba(154,154,154,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 26 * u, cy + 14 * u, 52 * u, 0.5 * u);
    // readout scrambles, then refuses to answer
    let read = "??? GSM";
    if (t > 0.6 && t < 2.2) read = `${120 + Math.floor((Math.sin(t * 91.7) * 0.5 + 0.5) * 300)} GSM`;
    ctx.font = mono(5);
    ctx.textAlign = "center";
    ctx.fillStyle = C.lime;
    ctx.fillText(read, cx, cy + 22 * u);
    ctx.globalAlpha = out4(prog(t, 2.6, 0.8));
    ctx.font = mono(2);
    ctx.fillStyle = C.mute;
    ctx.fillText("GSM = GRAMS PER M²  ·  جرام في المتر المربع", cx, cy + 27 * u);
    ctx.globalAlpha = 1;
    return;
  }

  if (topic === "print") {
    const r = 29 * u;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 7 * u;
    ctx.shadowOffsetY = 4 * u;
    ctx.fillStyle = "#5a5a5a";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2.75 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2.4 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b3b3b";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 0.35 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#141414";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // spinning dashed ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t / 2.4) * Math.PI * 2);
    ctx.setLineDash([2 * u, 1.6 * u]);
    ctx.strokeStyle = "rgba(236,232,225,0.18)";
    ctx.lineWidth = 0.5 * u;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // glass
    const gr = r - 6 * u;
    const gl = ctx.createRadialGradient(cx - gr * 0.3, cy - gr * 0.4, 0, cx, cy, gr);
    gl.addColorStop(0, "#262626");
    gl.addColorStop(1, "#0c0c0c");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.fill();
    // the print, swaying, cracking, flaking
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin((t / 1.6) * Math.PI) * (10 * Math.PI) / 180);
    ctx.font = `700 ${7 * u}px ${WIDE}`;
    ctx.textAlign = "center";
    ctx.fillStyle = C.bone;
    ctx.fillText("PRINT", 0, 2.5 * u);
    const tw = ctx.measureText("PRINT").width;
    const cracks = [[[10, 4], [17, 13], [14, 21], [23, 33]], [[40, 2], [45, 12], [40, 20], [47, 30], [44, 38]], [[68, 5], [63, 15], [71, 24], [67, 37]], [[86, 8], [92, 19], [87, 30]]];
    ctx.strokeStyle = "#0c0c0c";
    ctx.lineWidth = 0.45 * u;
    ctx.lineCap = "round";
    cracks.forEach((pts, i) => {
      const p = prog(t, 1.4 + i * 0.4, 0.5);
      if (p <= 0) return;
      ctx.beginPath();
      const map = (q: number[]) => [-tw / 2 + (q[0] / 100) * tw, -4.5 * u + (q[1] / 40) * 8 * u];
      const segs = pts.length - 1;
      const upto = p * segs;
      ctx.moveTo(...(map(pts[0]) as [number, number]));
      for (let k = 1; k <= segs; k++) {
        const [ax, ay] = map(pts[k - 1]);
        const [bx, by] = map(pts[k]);
        const f = cl(upto - (k - 1));
        if (f <= 0) break;
        ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
      }
      ctx.stroke();
    });
    [[0.12, 0.4, 2.2], [0.44, 0.55, 2.6], [0.7, 0.35, 3.0], [0.88, 0.6, 3.3]].forEach(([fx, fy, at]) => {
      const p = prog(t, at, 1.4);
      if (p <= 0 || p >= 1) return;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.translate(-tw / 2 + fx * tw, -4 * u + fy * 8 * u + 12 * u * inOut(p));
      ctx.rotate(p * 2.4);
      ctx.fillStyle = C.bone;
      ctx.fillRect(-0.7 * u, -0.55 * u, 1.4 * u, 1.1 * u);
      ctx.restore();
    });
    ctx.restore();
    ctx.font = mono(2.4);
    ctx.textAlign = "right";
    ctx.fillStyle = C.lime;
    ctx.fillText("40°C", cx + r + 1 * u, cy - r + 1 * u);
    return;
  }

  if (topic === "stitch") {
    const r = 30 * u;
    const z = 1 + 0.2 * (t / D);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "#191919";
    ctx.fillRect(cx - r, cy - r, r, 2 * r);
    ctx.fillStyle = "#212121";
    ctx.fillRect(cx, cy - r, r, 2 * r);
    ctx.fillStyle = "rgba(236,232,225,0.06)";
    for (let k = -r; k < r; k += 0.8 * u) {
      ctx.fillRect(cx - r, cy + k, r, 0.3 * u);
      ctx.fillRect(cx - r + (k + r) / 2, cy - r, 0.3 * u, 2 * r);
    }
    const shade = ctx.createLinearGradient(cx, 0, cx + 3 * u, 0);
    shade.addColorStop(0, "rgba(0,0,0,0.6)");
    shade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx, cy - r, 3 * u, 2 * r);
    [[0.57, 0.5], [0.635, 0.85]].forEach(([fx, at]) => {
      const x = cx - r + fx * 2 * r;
      const p = prog(t, at, 1.9);
      const y0 = cy - r * 1.04, y1 = y0 + 2.08 * r * p;
      ctx.fillStyle = C.bone;
      for (let y = y0; y < y1; y += 3.8 * u) ctx.fillRect(x - 0.375 * u, y, 0.75 * u, Math.min(2.4 * u, y1 - y));
    });
    const np = prog(t, 0.5, 1.9);
    if (np > 0 && np < 1) {
      const nx = cx - r + 0.57 * 2 * r, ny = cy - r + 2 * r * np;
      ctx.shadowColor = C.lime;
      ctx.shadowBlur = 2.4 * u;
      ctx.fillStyle = C.lime;
      ctx.beginPath();
      ctx.arc(nx, ny, u, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 0.4 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 0.4 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1.1 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = mono(2.4);
    ctx.textAlign = "left";
    ctx.fillStyle = C.lime;
    ctx.fillText("×10", cx - r + 3 * u, cy - r + 4 * u);
    ctx.globalAlpha = out4(prog(t, 2.4, 0.8));
    ctx.font = mono(2);
    ctx.textAlign = "center";
    ctx.fillStyle = C.mute;
    ctx.fillText("SPI = STITCHES PER INCH  ·  عدد الغرز في البوصة", cx, cy + r + 5 * u);
    ctx.globalAlpha = 1;
    return;
  }

  if (topic === "size") {
    ctx.font = `700 ${15 * u}px ${WIDE}`;
    ctx.textAlign = "center";
    const sp = out4(prog(t, 0.1, 0.6));
    ctx.globalAlpha = 0.3 + 0.7 * sp;
    ctx.fillStyle = C.pink;
    ctx.fillText("S M L", cx, cy - 8 * u);
    const sw = ctx.measureText("S M L").width;
    ctx.fillStyle = C.bone;
    ctx.fillRect(cx - sw / 2 - u, cy - 13.4 * u, (sw + 2 * u) * inOut(prog(t, 1, 0.4)), 1.1 * u);
    ctx.globalAlpha = 1;
    const tp = out4(prog(t, 0.3, 0.8));
    const tx = cx - 43 * u + (1 - tp) * 100 * u, ty = cy;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4 * u;
    ctx.shadowOffsetY = 2 * u;
    ctx.fillStyle = "#E3D9C2";
    ctx.fillRect(tx, ty, 86 * u, 12 * u);
    ctx.restore();
    ctx.fillStyle = "#111";
    for (let i = 0; i <= 70; i++) {
      const x = tx + (i / 70) * 86 * u;
      const h = i % 10 === 0 ? 5 * u : i % 5 === 0 ? 3.6 * u : 2.2 * u;
      ctx.fillRect(x, ty, i % 10 === 0 ? 2 : 1, h);
    }
    ctx.font = mono(2.3);
    ctx.textAlign = "center";
    for (let i = 1; i <= 6; i++) ctx.fillText(String(i * 10), tx + (i / 7) * 86 * u, ty + 10.4 * u);
    const mp = prog(t, 1.4, 1.6);
    const mx = tx + 0.82857 * 86 * u * mp;
    ctx.shadowColor = C.lime;
    ctx.shadowBlur = 2 * u;
    ctx.fillStyle = C.lime;
    ctx.fillRect(mx - 0.3 * u, ty - u, 0.6 * u, 14 * u);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = out4(prog(t, 1.2, 0.8));
    ctx.font = mono(2.4);
    ctx.textAlign = "left";
    ctx.fillStyle = C.mute;
    ctx.fillText("WIDTH · العرض · EXAMPLE", cx - 43 * u, ty + 18 * u);
    ctx.textAlign = "right";
    ctx.font = mono(4.2);
    ctx.fillStyle = C.lime;
    ctx.fillText(`${Math.round(58 * mp)} CM`, cx + 43 * u, ty + 18.6 * u);
    ctx.globalAlpha = 1;
    return;
  }

  if (topic === "returns") {
    const p = out4(prog(t, 0.2, 0.8));
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(cx, cy + (1 - p) * 3 * u);
    ctx.rotate((-2 * Math.PI) / 180);
    const lw = 66 * u, lhh = 34 * u;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 6 * u;
    ctx.shadowOffsetY = 3 * u;
    ctx.fillStyle = C.bone;
    rr(ctx, -lw / 2, -lhh / 2, lw, lhh, 0.6 * u);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#111";
    ctx.font = `700 ${2.8 * u}px ${WIDE}`;
    ctx.textAlign = "left";
    ctx.fillText("RETURN POLICY", -lw / 2 + 4.4 * u, -lhh / 2 + 7 * u);
    ctx.font = `800 ${2.8 * u}px ${CAIRO}`;
    ctx.textAlign = "right";
    ctx.fillText("الاسترجاع", lw / 2 - 4.4 * u, -lhh / 2 + 7 * u);
    const rows: [string, number][] = [["DAYS / كام يوم", 0.8], ["SHIPPING / مين يدفع", 1.2], ["EXCHANGE · REFUND", 1.6]];
    rows.forEach(([label, at], i) => {
      const rp = out4(prog(t, at, 0.6));
      const y = -lhh / 2 + 12 * u + i * 6.6 * u + (1 - rp) * 1.5 * u;
      ctx.globalAlpha = p * rp;
      ctx.strokeStyle = "#9b958a";
      ctx.setLineDash([0.6 * u, 0.5 * u]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-lw / 2 + 4.4 * u, y);
      ctx.lineTo(lw / 2 - 4.4 * u, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = mono(2.5);
      ctx.textAlign = "left";
      ctx.fillStyle = "#111";
      ctx.fillText(label, -lw / 2 + 4.4 * u, y + 4.4 * u);
      ctx.textAlign = "right";
      ctx.fillStyle = "#8a8478";
      ctx.fillText("_____", lw / 2 - 4.4 * u, y + 4.4 * u);
    });
    ctx.globalAlpha = p;
    // spinning return arrow
    ctx.save();
    ctx.translate(lw / 2 + 1.5 * u, -lhh / 2 + 0.5 * u);
    ctx.rotate(-(t / 3) * Math.PI * 2);
    ctx.strokeStyle = C.lime;
    ctx.lineWidth = 0.7 * u;
    ctx.beginPath();
    ctx.arc(0, 0, 3.6 * u, 0.2, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
    // stamp
    const sp = prog(t, 2.7, 0.32);
    if (sp > 0) {
      ctx.save();
      ctx.translate(-lw / 2 + 12 * u, lhh / 2 + 1 * u);
      ctx.rotate((-12 * Math.PI) / 180);
      const sc = 2.6 - 1.6 * inOut(sp);
      ctx.scale(sc, sc);
      ctx.globalAlpha = cl(sp * 1.5);
      ctx.fillStyle = "rgba(11,11,11,0.85)";
      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 0.55 * u;
      rr(ctx, -15 * u, -4.6 * u, 30 * u, 9.2 * u, 0.8 * u);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.pink;
      ctx.textAlign = "center";
      ctx.font = `700 ${2.3 * u}px ${WIDE}`;
      ctx.fillText("ASK BEFORE YOU PAY", 0, -0.6 * u);
      ctx.font = `800 ${3 * u}px ${CAIRO}`;
      ctx.fillText("اسأل قبل ما تدفع", 0, 3.4 * u);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  if (topic === "price" || topic === "limited") {
    const nums = (s.en.match(/\d[\d,]*/g) ?? []).slice(0, 2);
    const labels = topic === "limited" ? ["LIMITED", "??? PCS"] : nums.length >= 2 ? nums.map((n) => `${n} EGP`) : ["A", "B"];
    labels.forEach((lab, i) => {
      const p = out4(prog(t, 0.2 + i * 0.25, 0.8));
      const swing = Math.sin(t * 1.6 + i * 1.3) * (6 * Math.PI) / 180;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(cx + (i ? 17 : -17) * u, top + 4 * u);
      ctx.rotate(swing);
      ctx.strokeStyle = "#9a9a9a";
      ctx.lineWidth = 0.25 * u;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 10 * u);
      ctx.stroke();
      ctx.fillStyle = i ? C.bone : C.black;
      ctx.strokeStyle = i ? C.bone : C.pink;
      ctx.lineWidth = 1.5;
      rr(ctx, -12 * u, 10 * u, 24 * u, 30 * u, 1 * u);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i ? C.black : C.bone;
      ctx.beginPath();
      ctx.arc(0, 14 * u, 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 ${lab.length > 7 ? 3.2 * u : 4.6 * u}px ${WIDE}`;
      ctx.textAlign = "center";
      ctx.fillStyle = i ? C.black : C.pink;
      ctx.fillText(lab, 0, 28 * u);
      ctx.restore();
    });
    // scanner line sweeping across both
    const sp = (t * 0.45) % 1;
    const y = top + 14 * u + sp * 28 * u;
    ctx.fillStyle = C.lime;
    ctx.shadowColor = C.lime;
    ctx.shadowBlur = 2 * u;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - 32 * u, y, 64 * u, 0.4 * u);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = out4(prog(t, 1.6, 0.8));
    ctx.font = mono(2.4);
    ctx.textAlign = "center";
    ctx.fillStyle = C.lime;
    ctx.fillText(topic === "limited" ? "HOW MANY, EXACTLY?" : "WHICH IS WHICH?", cx, top + 50 * u);
    ctx.globalAlpha = 1;
    return;
  }
}

// ------------------------------------------------------------------ music
const CH: number[][] = [
  [220, 261.63, 329.63], // Am
  [174.61, 220, 261.63], // F
  [196, 261.63, 329.63], // C/G
  [196, 246.94, 293.66], // G
  [146.83, 174.61, 220], // Dm
  [164.81, 207.65, 246.94], // E
];
const AM = CH[0];

/** Score one slide into `dst`. Returns a stop function. */
export function scoreLux(ac: BaseAudioContext, dst: AudioNode, s: LuxSlide, bpm: number, t0: number) {
  const D = Math.max(2, s.seconds), end = t0 + D;
  const topic = topicOf(s);
  const BEAT = 60 / bpm;
  const NB = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = NB.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  const sg = ac.createGain();
  sg.gain.setValueAtTime(0, t0);
  sg.gain.linearRampToValueAtTime(0.9, t0 + 0.03);
  sg.gain.setValueAtTime(0.9, end - 0.35);
  sg.gain.linearRampToValueAtTime(0, end);
  sg.connect(comp);
  comp.connect(dst);
  const o = sg;

  const env = (g: GainNode, t: number, a: number, peak: number, e: number, rel: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, Math.max(t + a, e - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, e);
  };
  const noise = (t: number, dur: number, op: { type?: BiquadFilterType; f?: number; f2?: number; q?: number; vol?: number; a?: number } = {}) => {
    const sr = ac.createBufferSource();
    sr.buffer = NB;
    sr.loop = true;
    const f = ac.createBiquadFilter();
    f.type = op.type ?? "lowpass";
    f.frequency.setValueAtTime(op.f ?? 1000, t);
    if (op.f2) f.frequency.exponentialRampToValueAtTime(op.f2, t + dur);
    f.Q.value = op.q ?? 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(op.vol ?? 0.3, t + (op.a ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sr.connect(f).connect(g).connect(o);
    sr.start(t);
    sr.stop(t + dur + 0.05);
  };
  const kick = (t: number, f0: number, f1: number, dur: number, vol: number) => {
    const k = ac.createOscillator();
    k.type = "sine";
    k.frequency.setValueAtTime(f0, t);
    k.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    k.connect(g).connect(o);
    k.start(t);
    k.stop(t + dur + 0.05);
  };
  const tick = (t: number, vol = 0.1, fr = 2600) => {
    const k = ac.createOscillator();
    k.type = "square";
    k.frequency.value = fr;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    k.connect(hp).connect(g).connect(o);
    k.start(t);
    k.stop(t + 0.05);
  };
  const pad = (t: number, e: number, ch: number[]) => {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    lp.Q.value = 0.7;
    const g = ac.createGain();
    env(g, t, 0.7, 0.05, e, 0.45);
    lp.connect(g).connect(o);
    ch.forEach((f) =>
      ([["triangle", f, 1], ["sawtooth", f * 1.004, 0.35]] as [OscillatorType, number, number][]).forEach(([ty, fr, v]) => {
        const k = ac.createOscillator();
        k.type = ty;
        k.frequency.value = fr;
        const og = ac.createGain();
        og.gain.value = v;
        k.connect(og).connect(lp);
        k.start(t);
        k.stop(e + 0.05);
      }),
    );
    const sub = ac.createOscillator();
    sub.type = "sine";
    sub.frequency.value = ch[0] / 2;
    const sgn = ac.createGain();
    env(sgn, t, 0.3, 0.16, e, 0.4);
    sub.connect(sgn).connect(o);
    sub.start(t);
    sub.stop(e + 0.05);
  };
  const hat = (t: number) => noise(t, 0.045, { type: "highpass", f: 8000, vol: 0.04 });
  const boom = (t: number, v = 0.9) => {
    kick(t, 92, 30, 2, v);
    noise(t, 0.45, { f: 700, f2: 110, vol: 0.32 });
  };
  const swish = (t: number) => noise(t, 0.28, { type: "bandpass", f: 1500, f2: 7000, q: 1.4, vol: 0.22, a: 0.12 });
  const riser = (t: number, d: number) => noise(t, d, { type: "bandpass", f: 300, f2: 4800, q: 2.2, vol: 0.16, a: d * 0.92 });
  const thud = (t: number) => {
    kick(t, 150, 44, 0.45, 0.95);
    noise(t, 0.14, { f: 1400, vol: 0.35 });
  };
  const crack = (t: number) => {
    noise(t, 0.1, { type: "highpass", f: 3200, vol: 0.28, a: 0.002 });
    tick(t, 0.06, 900);
  };
  const heart = (t: number) => {
    kick(t, 62, 40, 0.35, 0.6);
    kick(t + 0.22, 56, 38, 0.35, 0.4);
  };

  const chord = topic === "end" ? AM : CH[s.index % CH.length];
  const beatsFrom = topic === "cover" ? t0 + 1.1 : t0;
  if (topic !== "end") for (let b = beatsFrom; b < end - 0.3; b += BEAT) {
    kick(b, 68, 36, 0.45, 0.5);
    hat(b + BEAT / 2);
  }
  pad(topic === "cover" ? t0 + 1.0 : t0, end, chord);
  switch (topic) {
    case "cover":
      riser(t0 + 0.1, 1.0);
      boom(t0 + 1.1);
      swish(t0 + 1.1);
      break;
    case "fabric":
      thud(t0 + 0.75);
      for (let x = 0.6; x < 2.2; x += 0.06) tick(t0 + x, 0.05, 3000);
      swish(t0 + 1.9);
      break;
    case "print":
      noise(t0 + 0.1, D - 0.5, { type: "bandpass", f: 260, f2: 520, q: 1.2, vol: 0.06, a: 1 });
      [1.4, 1.8, 2.2, 2.6].forEach((x) => crack(t0 + x));
      break;
    case "stitch":
      for (let x = 0.5; x < 2.75; x += 1 / 18) tick(t0 + x, 0.045, 1700);
      break;
    case "size":
      swish(t0 + 0.3);
      tick(t0 + 1.0, 0.12, 2400);
      for (let x = 1.4; x < 3.0; x += 0.11) tick(t0 + x, 0.06, 2200);
      tick(t0 + 3.0, 0.14, 3300);
      break;
    case "returns":
      [0.8, 1.2, 1.6].forEach((x) => tick(t0 + x, 0.08, 1600));
      thud(t0 + 2.72);
      break;
    case "price":
    case "limited":
      swish(t0 + 0.2);
      for (let x = 0.4; x < D - 0.6; x += 0.45) tick(t0 + x, 0.05, 2000);
      thud(t0 + 1.6);
      break;
    case "end":
      heart(t0 + 0.4);
      heart(t0 + 1.4);
      noise(t0 + 1.5, 1, { type: "lowpass", f: 3000, f2: 300, vol: 0.12, a: 0.05 });
      boom(t0 + 1.9, 1);
      swish(t0 + 1.9);
      break;
    default:
      swish(t0 + 0.2);
  }
  return () => {
    try {
      sg.disconnect();
    } catch {
      /* already stopped */
    }
  };
}
