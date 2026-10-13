/**
 * MOTION ENGINE — TEMPORARY™ motion-graphic slides, made by Claude in code.
 * Kinetic Egyptian-Arabic + English type, grain, light sweeps, beat-synced accents, a running ticker,
 * and an ORIGINAL beat generated in the browser (no copyrighted music).
 * Used live (preview with sound) and for recording each slide to MP4.
 */

export type MotionSlide = { ar: string; en: string; seconds: number; index: number; total: number; kind?: "cover" | "check" | "end" | "plain" };

export const BPM_DEFAULT = 110;
const AR = '"IBM Plex Sans Arabic"';
const EN = '"Archivo"';

export const PALETTE = { bg: "#090909", ink: "#F1ECE4", dim: "#7C766E", accent: "#E5574D", plate: "#EDE7DD" };

export async function motionFonts() {
  await Promise.all([
    document.fonts.load(`700 120px ${AR}`),
    document.fonts.load(`500 40px ${AR}`),
    document.fonts.load(`800 60px ${EN}`),
    document.fonts.load(`500 30px ${EN}`),
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

  ctx.save();
  // ---------- camera: impact shake + slow push-in
  const shake = (cover ? 18 : 9) * impact * impact + 2 * onBeat * (time < dur - 0.5 ? 1 : 0);
  const zoom = 1 + 0.035 * clamp(time / dur);
  ctx.translate(W / 2 + Math.sin(time * 91) * shake, H / 2 + Math.cos(time * 73) * shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  // ---------- background
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
  // moving red light leak
  const lx = W * (0.75 - 0.5 * clamp(time / dur)), ly = H * (0.25 + 0.1 * Math.sin(time * 0.8));
  const leak = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.75);
  leak.addColorStop(0, `rgba(229,87,77,${0.22 + 0.1 * onBeat})`);
  leak.addColorStop(0.5, "rgba(229,87,77,0.05)");
  leak.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, W, H);
  // fabric threads: thin waving lines
  ctx.strokeStyle = "rgba(241,236,228,0.05)";
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const y = H * (0.1 + k * 0.1) + Math.sin(x * 0.01 + time * 1.4 + k) * 14;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // vignette + grain + flicker
  const v = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.25, W / 2, H / 2, W * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const r = rand(Math.floor(time * 24) + 11);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = r() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
  ctx.globalAlpha = 1;
  if (r() > 0.93) {
    ctx.fillStyle = "rgba(241,236,228,0.08)";
    ctx.fillRect(r() * W, 0, 1.5, H); // film scratch
  }

  // ---------- giant background number: counts up on the cover, drifts on the others
  const enNum = (s.en.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, "");
  let big = cover ? (enNum ? Math.round(Number(enNum) * easeOut(time / 1.6)).toLocaleString("en-US") : "?") : String(s.index + 1).padStart(2, "0");
  if (s.kind === "end") big = "→";
  ctx.font = `800 ${Math.round(W * (cover && enNum ? 0.34 : 0.62))}px ${EN}`;
  ctx.textAlign = "left";
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(241,236,228,${0.09 + 0.07 * onBeat})`;
  ctx.strokeText(big, -W * 0.04 + time * 8, H * (cover && enNum ? 0.27 : 0.64));

  // ---------- top bar + progress dots
  ctx.font = `800 ${Math.round(W * 0.028)}px ${EN}`;
  ctx.globalAlpha = easeOut(pIn * 2);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText("TEMPORARY™", pad, pad + W * 0.02);
  ctx.textAlign = "right";
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText("● REC", W - pad, pad + W * 0.02);
  ctx.fillRect(pad, pad + W * 0.045, (W - pad * 2) * easeOut(pIn), 3);
  for (let d = 0; d < s.total; d++) {
    ctx.fillStyle = d === s.index ? PALETTE.accent : "rgba(241,236,228,0.25)";
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
        lc.fillStyle = t.accent ? PALETTE.accent : PALETTE.ink;
        lc.fillText(t.w, 0, size * 0.35);
        lc.restore();
        if (t.accent) {
          lc.fillStyle = PALETTE.accent;
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
    lc.fillStyle = PALETTE.accent;
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

  // ---------- English line types on, in a subtitle box
  const enTop = top + lines.length * lh + size * 0.6;
  const enDelay = lastLand + 0.1;
  const shown = Math.floor(clamp((time - enDelay) / 0.8) * s.en.length);
  let enSize = Math.round(W * 0.034);
  ctx.letterSpacing = "3px";
  for (; enSize > W * 0.02; enSize -= 1) {
    ctx.font = `600 ${enSize}px ${EN}`;
    if (ctx.measureText(s.en.toUpperCase()).width <= W - pad * 2 - 24) break;
  }
  if (shown > 0) {
    const full = ctx.measureText(s.en.toUpperCase()).width;
    ctx.fillStyle = "rgba(241,236,228,0.08)";
    ctx.fillRect(W - pad - full - 16, enTop - enSize * 1.05, full + 24, enSize * 1.55);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(s.en.toUpperCase().slice(0, shown) + (shown < s.en.length && Math.floor(time * 5) % 2 ? "▍" : ""), W - pad - 4, enTop);
  ctx.letterSpacing = "0px";

  // ---------- accents: self-drawing check / pulsing "send" call to action
  ctx.strokeStyle = PALETTE.accent;
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
    ctx.fillStyle = PALETTE.accent;
    roundRect(ctx, -W * 0.27, -W * 0.055, W * 0.54, W * 0.11, W * 0.055);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 ${Math.round(W * 0.042)}px ${AR}`;
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillText("ابعتها لصاحبك ➤", 0, W * 0.015);
    ctx.restore();
  }

  // ---------- bottom ticker
  const tick = "  اعرف قبل ما تدفع  ·  KNOW BEFORE YOU PAY  ·  EVERYTHING IS TEMPORARY  ·";
  ctx.font = `600 ${Math.round(W * 0.026)}px ${AR}`;
  ctx.direction = "ltr";
  const tw2 = ctx.measureText(tick).width;
  const ty = H - pad * 0.9;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = "left";
  for (let x = -((time * 90) % tw2); x < W; x += tw2) ctx.fillText(tick, x, ty);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(0, ty - W * 0.045, W * clamp(time / dur), 2);

  ctx.restore(); // end camera

  // ---------- plate for the real logo (not shaken — the logo is pasted at a fixed spot)
  if (logoBox) {
    ctx.fillStyle = PALETTE.plate;
    const p = W * 0.012;
    roundRect(ctx, logoBox.x - p, logoBox.y - p, logoBox.w + p * 2, logoBox.h + p * 2, W * 0.012);
    ctx.fill();
  }

  // ---------- impact flash + whip-out transition
  if (impact > 0) {
    ctx.fillStyle = `rgba(241,236,228,${0.35 * impact * impact})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (pOut > 0) {
    const e = easeInOut(pOut);
    ctx.globalAlpha = 0.5;
    for (let k = 1; k <= 4; k++) ctx.drawImage(ctx.canvas, -W * 0.06 * k * e, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(W * (1 - e), 0, W * e, H);
    ctx.fillStyle = PALETTE.bg;
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
