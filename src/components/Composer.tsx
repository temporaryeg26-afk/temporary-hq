import { useEffect, useRef, useState } from "react";
import { verifyAgainstBase } from "../lib/media";
import { currentLogin, downloadFile, uploadFile } from "../lib/github";
import { update } from "../lib/store";
import { useBrand } from "../App";
import type { Media, Placement } from "../lib/types";
import { Button, isArabic } from "./ui";

/**
 * Adds slide text on top of the finished image (in the browser, so Arabic shapes correctly),
 * then re-checks that every locked file is still pixel-identical before saving.
 */
export default function Composer({ media, imageUrl, initialText, onSaved }: { media: Media; imageUrl: string; initialText: string; onSaved: () => void }) {
  const { brand } = useBrand();
  const canvas = useRef<HTMLCanvasElement>(null);
  const placements: Placement[] = media.fidelity?.placements ?? [];
  const [text, setText] = useState(initialText);
  const [pos, setPos] = useState<"top" | "middle" | "bottom">("bottom");
  const [size, setSize] = useState(64);
  const [tone, setTone] = useState<"light" | "dark">("light");
  const [panel, setPanel] = useState(true);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [overlap, setOverlap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    let cancelled = false;
    (async () => {
      await document.fonts.load(`700 ${size}px "IBM Plex Sans Arabic"`).catch(() => null);
      await document.fonts.load(`700 ${size}px "Archivo"`).catch(() => null);
      if (cancelled) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const rtl = isArabic(text);
      ctx.font = `700 ${size}px ${rtl ? '"IBM Plex Sans Arabic"' : '"Archivo"'}, sans-serif`;
      ctx.direction = rtl ? "rtl" : "ltr";
      ctx.textAlign = rtl ? "right" : "left";
      const margin = Math.round(c.width * 0.07);
      const maxW = c.width - margin * 2;
      const lines: string[] = [];
      for (const para of text.split("\n")) {
        let line = "";
        for (const word of para.split(" ")) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
          } else line = test;
        }
        lines.push(line);
      }
      const lh = Math.round(size * 1.3);
      const blockH = lines.length * lh;
      const pad = Math.round(size * 0.6);
      const top = pos === "top" ? margin + pad : pos === "middle" ? (c.height - blockH) / 2 : c.height - margin - blockH - Math.round(c.height * 0.06);
      const box = { left: margin - pad, top: top - pad, width: maxW + pad * 2, height: blockH + pad * 2 };
      setOverlap(placements.some((p) => box.left < p.left + p.width && box.left + box.width > p.left && box.top < p.top + p.height && box.top + box.height > p.top));
      if (panel && text.trim()) {
        ctx.fillStyle = tone === "light" ? "rgba(20,18,17,0.55)" : "rgba(240,236,228,0.72)";
        ctx.fillRect(box.left, box.top, box.width, box.height);
      }
      ctx.fillStyle = tone === "light" ? "#F2EEE7" : "#151312";
      ctx.textBaseline = "top";
      const x = rtl ? c.width - margin : margin;
      lines.forEach((l, i) => ctx.fillText(l, x, top + i * lh));
    })();
    return () => {
      cancelled = true;
    };
  }, [img, text, pos, size, tone, panel, placements]);

  const save = async () => {
    const c = canvas.current;
    if (!c || !media.base_path) return;
    setBusy(true);
    setMsg(null);
    try {
      const finalBlob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
      const base = await downloadFile(media.base_path);
      const v = await verifyAgainstBase(finalBlob, base, placements);
      if (!v.pass) throw new Error("The text covers a locked file (logo, artwork or mask). Move the text and save again.");
      const path = media.base_path.replace(/\.png$/, "-final.png");
      await uploadFile(path, finalBlob, `HQ (${currentLogin()}): final image with text`);
      await update<Media>(brand.id, "media", media.id, { storage_path: path, fidelity: { ...media.fidelity, finalised: true, finalChecks: v.checks } }, "final image");
      setMsg("Saved. Locked files verified untouched.");
      onSaved();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-4">
      <canvas ref={canvas} className="w-full max-w-sm rounded-ctl border border-rule" aria-label="Slide preview" />
      <div className="space-y-3">
        <div>
          <label>Slide text</label>
          <textarea dir="auto" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label>Position</label>
            <select value={pos} onChange={(e) => setPos(e.target.value as typeof pos)}>
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          <div>
            <label>Size</label>
            <input type="number" min={28} max={140} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </div>
          <div>
            <label>Colour</label>
            <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-plaster">
          <input type="checkbox" checked={panel} onChange={(e) => setPanel(e.target.checked)} /> Panel behind text
        </label>
        {overlap && <p className="text-sm text-ochre">The text overlaps a locked file — move it or saving will be refused.</p>}
        <Button kind="primary" onClick={save} busy={busy}>
          Save final image
        </Button>
        {msg && <p className="text-sm text-concrete">{msg}</p>}
      </div>
    </div>
  );
}
