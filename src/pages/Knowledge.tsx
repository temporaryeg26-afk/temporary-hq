import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { addKnowledge, AGENTS, AgentKey, loadSnapshot, seedKnowledge } from "../lib/agencyos";

const KEYS = Object.keys(AGENTS) as AgentKey[];
const AREAS = ["algorithm", "platform", "ads", "market", "trend", "launch", "psychology"];

/** What the team knows right now: sourced facts every employee reads before answering. Refreshed every Sunday. */
export default function Knowledge() {
  const { brand, products } = useBrand();
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id]);
  const [area, setArea] = useState("all");
  const [f, setF] = useState({ area: "trend", finding: "", use: "", source: "", agents: [] as AgentKey[] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = (snap.data?.knowledge ?? []).filter((k) => area === "all" || k.area === area);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); await snap.reload(); } catch (e) { setErr((e as Error).message); } setBusy(false); };

  return (
    <div>
      <PageHead title="Team knowledge" sub="The latest research every employee reads before answering you: algorithm, ads, Egyptian market, trends and launch tactics — each with its source. The Sunday team meeting adds new facts every week." />
      {!snap.loading && !snap.data?.knowledge.length && (
        <Panel className="mb-6">
          <p className="mb-3 text-sm">No knowledge yet. Load the research from 30 Oct 2026 (Instagram 2026 ranking signals, Reels linking removal, Meta Andromeda ads, launch tactics, Egyptian Gen Z).</p>
          <Button kind="primary" busy={busy} onClick={() => run(() => seedKnowledge(brand.id))}>Load the first research</Button>
        </Panel>
      )}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {["all", ...AREAS].map((a) => <button key={a} onClick={() => setArea(a)} className={`rounded-full border px-3 py-1 ${area === a ? "border-ultra text-plaster" : "border-rule text-concrete"}`}>{a}</button>)}
      </div>
      <div className="mb-8 space-y-3">
        {rows.map((k) => (
          <div key={k.id} className="rounded-panel border border-rule bg-soot p-3 text-sm">
            <p className="text-xs text-concrete">{k.date} · {k.area} · for {k.agents.map((a) => AGENTS[a]?.name ?? a).join(", ")}</p>
            <p className="mt-1">{k.finding}</p>
            {k.use && <p className="mt-1 text-ultra">Use: {k.use}</p>}
            {k.source && <a href={k.source} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-concrete hover:underline">{k.source}</a>}
          </div>
        ))}
      </div>
      <Panel>
        <p className="mb-3 text-sm font-semibold">Add something you learned</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
          <input className="sm:col-span-3" placeholder="Source link (optional)" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
          <textarea className="sm:col-span-4" rows={2} dir="auto" placeholder="What did you learn?" value={f.finding} onChange={(e) => setF({ ...f, finding: e.target.value })} />
          <input className="sm:col-span-4" dir="auto" placeholder="How should we use it?" value={f.use} onChange={(e) => setF({ ...f, use: e.target.value })} />
          <div className="flex flex-wrap gap-3 text-xs sm:col-span-4">
            {KEYS.map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={f.agents.includes(k)} onChange={(e) => setF({ ...f, agents: e.target.checked ? [...f.agents, k] : f.agents.filter((x) => x !== k) })} />{AGENTS[k].name}</label>)}
          </div>
        </div>
        <div className="mt-3"><Button kind="primary" busy={busy} disabled={!f.finding.trim()} onClick={() => run(async () => { await addKnowledge(brand.id, { ...f, finding: f.finding.trim(), use: f.use.trim(), agents: f.agents.length ? f.agents : KEYS, date: new Date().toISOString().slice(0, 10) }); setF({ area: "trend", finding: "", use: "", source: "", agents: [] }); })}>Save</Button></div>
        <ErrorNote msg={err} />
      </Panel>
      <ErrorNote msg={snap.error} />
    </div>
  );
}
