import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { AGENTS } from "../lib/agencyos";
import { BoardKey, BOARDS } from "../lib/boards";
import { insert, list, mutate, newId, now } from "../lib/store";

type Row = Record<string, string> & { id: string; created_at: string; updated_at?: string };

/** One living board (intel / pains / trend lab): seeded with research, kept current by the team. */
export default function Board({ board }: { board: BoardKey }) {
  const def = BOARDS[board];
  const { brand } = useBrand();
  const snap = useAsync(() => list<Row>(brand.id, def.key).catch(() => [] as Row[]), [brand.id, board]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = (snap.data ?? []).filter((r) => filter === "all" || r[def.statusKey] === filter);
  const statusField = def.fields.find((f) => f.key === def.statusKey);
  const blank = (): Row => ({ id: "", created_at: "", ...Object.fromEntries(def.fields.map((f) => [f.key, f.options?.[0] ?? ""])) });

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); await snap.reload(); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  const seed = () => run(async () => { await insert(brand.id, def.key, def.seed.map((s) => ({ ...s, id: newId(), created_at: now() })) as Row[], `${def.title}: first research`); });
  const save = () => run(async () => {
    if (!edit) return;
    if (edit.id) await mutate<Row>(brand.id, def.key, (d) => d.map((r) => (r.id === edit.id ? { ...edit, updated_at: now() } : r)), `${def.title}: update ${edit[def.titleKey]}`);
    else await insert(brand.id, def.key, { ...edit, id: newId(), created_at: now() } as Row, `${def.title}: add ${edit[def.titleKey]}`);
    setEdit(null);
  });

  return (
    <div>
      <PageHead title={def.title} sub={`${def.sub} Owner: ${AGENTS[def.owner].name}.`} />
      {!snap.loading && !(snap.data ?? []).length && (
        <Panel className="mb-6">
          <p className="mb-3 text-sm">Empty. Load the research from 30 Oct 2026 ({def.seed.length} entries).</p>
          <Button kind="primary" busy={busy} onClick={seed}>Load the research</Button>
        </Panel>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {["all", ...(statusField?.options ?? [])].map((o) => (
          <button key={o} onClick={() => setFilter(o)} className={`rounded-full border px-3 py-1 ${filter === o ? "border-ultra text-plaster" : "border-rule text-concrete"}`}>
            {o} {o !== "all" && `(${(snap.data ?? []).filter((r) => r[def.statusKey] === o).length})`}
          </button>
        ))}
        <span className="flex-1" />
        <Button onClick={() => setEdit(blank())}>+ Add</Button>
      </div>

      {edit && (
        <Panel className="mb-6">
          <div className="grid gap-2 sm:grid-cols-2">
            {def.fields.map((f) => (
              <label key={f.key} className={`block text-sm ${f.kind === "long" ? "sm:col-span-2" : ""}`}>
                <span className="text-xs text-concrete">{f.label}</span>
                {f.kind === "select" ? (
                  <select className="mt-1 w-full" value={edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                ) : f.kind === "long" ? (
                  <textarea dir="auto" rows={2} className="mt-1 w-full" value={edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                ) : (
                  <input dir="auto" className="mt-1 w-full" value={edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button kind="primary" busy={busy} disabled={!String(edit[def.titleKey] ?? "").trim()} onClick={save}>Save</Button>
            <Button kind="quiet" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </Panel>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-panel border border-rule bg-soot p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold" dir="auto">{r[def.titleKey]}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-concrete">{r[def.statusKey]}</span>
                <button className="text-xs text-ultra hover:underline" onClick={() => setEdit(r)}>Edit</button>
              </div>
            </div>
            {def.fields.filter((f) => f.key !== def.titleKey && f.key !== def.statusKey && r[f.key]).map((f) => (
              <p key={f.key} className="mt-1" dir="auto">
                <span className="text-xs text-concrete">{f.label}: </span>
                {/^https?:\/\//.test(r[f.key]) ? <a href={r[f.key].split(" ")[0]} target="_blank" rel="noreferrer" className="break-all text-xs text-ultra hover:underline">{r[f.key]}</a> : r[f.key]}
              </p>
            ))}
          </div>
        ))}
      </div>
      <ErrorNote msg={err ?? snap.error} />
    </div>
  );
}
