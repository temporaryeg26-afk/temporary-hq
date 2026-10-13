import { useState } from "react";
import { go, useBrand } from "../App";
import { Button, Copy, ErrorNote } from "./ui";
import { DEFAULT_RUN, importWeek, parseWeek, RunConfig, weekCommand } from "../lib/week";

const CHATGPT = "https://chatgpt.com/";
const HOOK_CHECK = `You are TEMPORARY™'s hook critic. Score EVERY hook (slide 1 / frame 1 / clip 1 / static headline) 1–10 on: stops the scroll in under 1 second, curiosity gap, specific (not generic), fits a masked insider who gives real advice, natural Egyptian Masri. Rewrite anything under 9. Also check each carousel/video keeps one new idea per slide/clip and ends with a payoff + save/send ask. Keep all other fields and rules exactly. Answer with the improved JSON ONLY.\n\nJSON:\n`;

/** RUN AGENCY: set the week, copy ONE command (to Claude or ChatGPT), paste the answer back, import. */
export default function RunAgency() {
  const { brand, products } = useBrand();
  const [cfg, setCfg] = useState<RunConfig>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hq.run") ?? "{}");
      return saved.v === 2 ? { ...DEFAULT_RUN, ...saved, start: DEFAULT_RUN.start } : DEFAULT_RUN;
    } catch {
      return DEFAULT_RUN;
    }
  });
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (p: Partial<RunConfig>) => {
    const n = { ...cfg, ...p };
    setCfg(n);
    try {
      localStorage.setItem("hq.run", JSON.stringify({ ...n, start: undefined, v: 2 }));
    } catch {
      /* private mode */
    }
  };
  const cmd = weekCommand(cfg, brand, products);
  const perDay = Object.values(cfg.package).filter(Boolean).length;

  const doImport = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const n = await importWeek(brand, products, parseWeek(answer), cfg.writer);
      setDone(`Imported ${n} pieces. Open the Grid to review and approve.`);
      setAnswer("");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="mb-10 rounded-panel border border-ultra/40 bg-soot p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="wide text-xl font-semibold">RUN AGENCY</h2>
        <span className="text-xs text-concrete">
          {cfg.days} days × {perDay} pieces/day = <b className="text-plaster">{cfg.days * perDay}</b> pieces
        </span>
      </div>
      <p className="mt-1 text-sm text-concrete">Set the period, copy ONE command, paste the answer back. Claude does everything incl. renders; if Claude is at its limit, switch to ChatGPT — same command, same import.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="text-xs text-concrete">Start</span>
          <input type="date" value={cfg.start} onChange={(e) => set({ start: e.target.value })} className="mt-1 w-full" />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-concrete">Length</span>
          <select value={cfg.days} onChange={(e) => set({ days: Number(e.target.value) })} className="mt-1 w-full">
            <option value={7}>1 week</option>
            <option value={14}>2 weeks</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-concrete">Language</span>
          <select value={cfg.language} onChange={(e) => set({ language: e.target.value as RunConfig["language"] })} className="mt-1 w-full">
            <option value="bilingual">Masri + English</option>
            <option value="masri">Masri</option>
            <option value="english">English</option>
          </select>
        </label>
        <div className="text-sm">
          <span className="text-xs text-concrete">Who writes it</span>
          <div className="mt-1 flex overflow-hidden rounded-ctl border border-rule">
            {(["claude", "chatgpt"] as const).map((w) => (
              <button key={w} onClick={() => set({ writer: w })} className={`flex-1 px-3 py-2 ${cfg.writer === w ? "bg-ultra text-white" : "text-concrete"}`}>
                {w === "claude" ? "Claude" : "ChatGPT"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="text-xs text-concrete">Every day:</span>
        {(Object.keys(cfg.package) as (keyof RunConfig["package"])[]).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="checkbox" checked={cfg.package[k]} onChange={(e) => set({ package: { ...cfg.package, [k]: e.target.checked } })} />
            {k === "static" ? "Static post" : k === "carousel" ? "Motion carousel" : k === "stories" ? "Story set" : k === "founder60" ? "Founder 60s video" : "Reel"}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="text-xs text-concrete">Products (none = trust phase):</span>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => set({ products: cfg.products.includes(p.code) ? cfg.products.filter((c) => c !== p.code) : [...cfg.products, p.code] })}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${cfg.products.includes(p.code) ? "border-ultra text-plaster" : "border-rule text-concrete"}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-xs text-concrete">Objective / notes for this run</span>
        <input value={cfg.objective} onChange={(e) => set({ objective: e.target.value })} className="mt-1 w-full" />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Copy text={cmd} label={`1 · Copy command for ${cfg.writer === "claude" ? "Claude" : "ChatGPT"}`} />
        {cfg.writer === "chatgpt" && (
          <a href={CHATGPT} target="_blank" rel="noreferrer" className="text-sm text-ultra">
            Open ChatGPT ↗
          </a>
        )}
        <span className="text-xs text-concrete">{cfg.writer === "claude" ? "Paste it to Claude in Chrome. Claude imports it itself." : "Paste it in ChatGPT, copy its JSON answer, paste it below."}</span>
      </div>

      <label className="mt-4 block text-sm">
        <span className="text-xs text-concrete">2 · Paste the JSON answer</span>
        <textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-1 w-full font-mono text-xs" placeholder='{"week_theme": …, "items": [ … ]}' />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {answer.trim() && <Copy text={HOOK_CHECK + answer.trim()} label="Optional · Copy hook-check prompt (paste in ChatGPT, then paste its answer here)" />}
        <Button kind="primary" busy={busy} disabled={!answer.trim()} onClick={doImport}>
          3 · Import into HQ
        </Button>
        {done && (
          <button className="text-sm text-moss" onClick={() => go("/grid")}>
            {done} → Grid
          </button>
        )}
      </div>
      <ErrorNote msg={err} />
    </section>
  );
}
