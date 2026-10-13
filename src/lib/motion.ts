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

/**
 * Draw one frame. time = seconds since the slide started; logoBox = where the real logo will be pasted
 * (we draw a light plate under it so the dark logo stays readable on black).
 */
export function drawMotion(ctx: CanvasRenderingContext2D, W: number, H: number, s: MotionSlide, time: number, bpm = BPM_DEFAULT, logoBox?: { x: number; y: number; w: number; h: number }) {
  const beat = 60 / bpm;
  const dur = Math.max(2, s.seconds);
  const pIn = clamp(time / 1.4);
  const pOut = clamp((time - (dur - 0.5)) / 0.5);
  const onBeat = 1 - clamp((time % beat) / (beat * 0.35)); // flash at each beat
  const pad = W * 0.08;

  // ---------- background: black, slow light sweep, vignette, live grain
  ctx.save();
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);
  const sweepX = ((time / dur) * 1.6 - 0.3) * W;
  const g = ctx.createLinearGradient(sweepX - W * 0.5, 0, sweepX + W * 0.5, H);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,240,225,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H / 2, W * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const r = rand(Math.floor(time * 24) + 7);
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = r() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
  ctx.globalAlpha = 1;

  // ---------- giant outlined index number drifting behind
  const num = s.kind === "cover" ? "?" : String(s.index + 1).padStart(2, "0");
  ctx.font = `800 ${Math.round(W * 0.62)}px ${EN}`;
  ctx.textAlign = "left";
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(241,236,228,${0.07 + 0.05 * onBeat})`;
  ctx.strokeText(num, -W * 0.06 + time * 6, H * 0.62);

  // ---------- top bar: brand + counter + growing rule
  ctx.font = `800 ${Math.round(W * 0.028)}px ${EN}`;
  ctx.fillStyle = PALETTE.ink;
  ctx.globalAlpha = easeOut(pIn * 2);
  ctx.textAlign = "left";
  ctx.fillText("TEMPORARY™", pad, pad + W * 0.02);
  ctx.textAlign = "right";
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`${String(s.index + 1).padStart(2, "0")} / ${String(s.total).padStart(2, "0")}`, W - pad, pad + W * 0.02);
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(pad, pad + W * 0.045, (W - pad * 2) * easeOut(pIn), 3);
  ctx.globalAlpha = 1;

  // ---------- Arabic headline: words rise from behind a mask, staggered on the beat
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  let size = Math.round(W * (s.kind === "cover" ? 0.105 : 0.088));
  let lines: string[][] = [];
  const words = s.ar.split(/\s+/).filter(Boolean);
  for (; size > W * 0.05; size -= 4) {
    ctx.font = `700 ${size}px ${AR}`;
    lines = wrapWords(ctx, words, W - pad * 2);
    if (lines.length * size * 1.3 < H * 0.42) break;
  }
  const lh = size * 1.3;
  const top = H * 0.3 + (H * 0.42 - lines.length * lh) / 2;
  let wi = 0;
  lines.forEach((ln, li) => {
    const y = top + li * lh + size;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - size * 1.15, W, lh * 1.05);
    ctx.clip();
    let x = W - pad;
    for (const w of ln) {
      const delay = 0.12 + wi * (beat / 3.2);
      const p = easeOut((time - delay) / 0.5);
      const ww = ctx.measureText(w + " ").width;
      ctx.fillStyle = PALETTE.ink;
      ctx.globalAlpha = p;
      ctx.fillText(w, x, y + (1 - p) * size * 1.1);
      x -= ww;
      wi++;
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  ctx.direction = "ltr";

  // ---------- English line: letter-spaced, types on
  const enTop = top + lines.length * lh + size * 0.55;
  const enDelay = 0.2 + wi * (beat / 3.2);
  const shown = Math.floor(clamp((time - enDelay) / 0.9) * s.en.length);
  ctx.font = `500 ${Math.round(W * 0.034)}px ${EN}`;
  ctx.textAlign = "right";
  ctx.fillStyle = PALETTE.dim;
  const enText = s.en.toUpperCase().slice(0, shown) + (shown < s.en.length && Math.floor(time * 4) % 2 ? "▍" : "");
  ctx.letterSpacing = "3px";
  ctx.fillText(enText, W - pad, enTop);
  ctx.letterSpacing = "0px";

  // ---------- accent: check mark draws itself (checks) / underline pulse (others)
  const ap = easeOut((time - enDelay - 0.6) / 0.6);
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = Math.max(6, W * 0.01);
  ctx.lineCap = "round";
  if (s.kind === "check") {
    const cx = pad + W * 0.06, cy = enTop - size * 0.2, k = W * 0.06;
    const pts: [number, number][] = [[cx - k, cy], [cx - k * 0.3, cy + k * 0.7], [cx + k * 1.1, cy - k * 0.9]];
    const segs = [Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])];
    const total = segs[0] + segs[1];
    let left = ap * total;
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    for (let i = 0; i < 2 && left > 0; i++) {
      const f = Math.min(1, left / segs[i]);
      ctx.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f);
      left -= segs[i];
    }
    ctx.stroke();
  } else {
    const uw = (W - pad * 2) * 0.3 * ap * (0.9 + 0.1 * onBeat);
    ctx.beginPath();
    ctx.moveTo(W - pad, enTop + W * 0.03);
    ctx.lineTo(W - pad - uw, enTop + W * 0.03);
    ctx.stroke();
  }

  // ---------- bottom ticker
  const tick = "  اعرف قبل ما تدفع  ·  KNOW BEFORE YOU PAY  ·  EVERYTHING IS TEMPORARY  ·";
  ctx.font = `500 ${Math.round(W * 0.026)}px ${AR}`;
  const tw = ctx.measureText(tick).width;
  const ty = H - pad * 0.9;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = "left";
  const off = -((time * 60) % tw);
  for (let x = off; x < W; x += tw) ctx.fillText(tick, x, ty);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillRect(0, ty - W * 0.04, W, 1);

  // ---------- plate for the real logo (the logo itself is pasted from your original file)
  if (logoBox) {
    ctx.fillStyle = PALETTE.plate;
    const p = W * 0.012;
    roundRect(ctx, logoBox.x - p, logoBox.y - p, logoBox.w + p * 2, logoBox.h + p * 2, W * 0.012);
    ctx.fill();
  }

  // ---------- beat flash + outro wipe
  ctx.fillStyle = `rgba(229,87,77,${0.05 * onBeat * pIn})`;
  ctx.fillRect(0, 0, W, H);
  if (pOut > 0) {
    const e = easeInOut(pOut);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(0, 0, W * e, H);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W * Math.max(0, e - 0.15), H);
  }
  ctx.restore();
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
export function startBeat(ac: AudioContext, out: AudioNode, bpm = BPM_DEFAULT, seconds = 8, startAt = ac.currentTime + 0.05) {
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
    [110, 130.81, 164.81].forEach((hz) => {
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
  const notes = [55, 55, 65.41, 49];
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
  const stop = startBeat(ac, dest, bpm, s.seconds);
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
