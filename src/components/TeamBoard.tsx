import { useState } from "react";
import { useBrand } from "../App";
import { AGENTS, decide, importMeeting, meetingPrompt, Pitch, PitchStatus, Snapshot } from "../lib/agencyos";
import { Button, Copy, ErrorNote, Panel } from "./ui";

const TONE: Record<PitchStatus, string> = { pitched: "border-ochre/60 text-ochre", approved: "border-moss/60 text-moss", rejected: "border-rule text-concrete", done: "border-ultra/60 text-ultra" };

/** The Director's desk: ideas pitched by every employee, decided by you. */
export function PitchBoard({ s, reload }: { s: Snapshot; reload: () => Promise<void> | void }) {
  const { brand } = useBrand();
  const [show, setShow] = useState<"open" | "all">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = s.pitches.filter((p) => (show === "open" ? p.status === "pitched" || p.status === "approved" : true));

  const act = async (p: Pitch, st: PitchStatus) => {
    setBusy(p.id + st);
    setErr(null);
    try { await decide(brand.id, p.id, st, notes[p.id] ?? ""); await reload(); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };

  return (
    <Panel className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Ideas from the team <span className="text-xs font-normal text-concrete">· {s.pitches.filter((p) => p.status === "pitched").length} waiting · {s.pitches.filter((p) => p.status === "approved").length} approved</span></p>
        <div className="flex gap-2 text-xs">
          <button className={show === "open" ? "text-plaster" : "text-concrete"} onClick={() => setShow("open")}>Open</button>
          <button className={show === "all" ? "text-plaster" : "text-concrete"} onClick={() => setShow("all")}>All</button>
        </div>
      </div>
      {!rows.length && <p className="text-sm text-concrete">No open ideas. Each employee pitches from their tab (Check in → My ideas → Pitch), from chat, and in the Sunday team meeting.</p>}
      <div className="space-y-3">
        {rows.map((p) => (
          <div key={p.id} className="rounded-ctl border border-rule p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{p.title}</p>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${TONE[p.status]}`}>{p.status}</span>
            </div>
            <p className="text-xs text-concrete">{AGENTS[p.agent]?.name ?? p.agent} · {p.source} · {new Date(p.created_at).toLocaleDateString()} · effort {p.effort}{p.cost_egp ? ` · ~${p.cost_egp} EGP` : " · free"}</p>
            {p.idea && p.idea !== p.title && <p className="mt-1">{p.idea}</p>}
            {p.why && <p className="mt-1 text-xs text-concrete">Why: {p.why}</p>}
            {p.impact && <p className="text-xs text-concrete">Expected: {p.impact}</p>}
            {p.note && <p className="mt-1 text-xs text-ultra">Your note: {p.note}</p>}
            {(p.status === "pitched" || p.status === "approved") && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input className="min-w-0 flex-1" placeholder="Note to the employee (optional)" value={notes[p.id] ?? ""} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} />
                {p.status === "pitched" && <Button kind="primary" busy={busy === p.id + "approved"} onClick={() => act(p, "approved")}>Approve</Button>}
                {p.status === "pitched" && <Button busy={busy === p.id + "rejected"} onClick={() => act(p, "rejected")}>Reject</Button>}
                {p.status === "approved" && <Button busy={busy === p.id + "done"} onClick={() => act(p, "done")}>Mark done</Button>}
              </div>
            )}
          </div>
        ))}
      </div>
      <ErrorNote msg={err} />
    </Panel>
  );
}

/** The weekly team meeting: research + every employee pitches + Director summary. Run by the scheduled Claude every Sunday, or by hand. */
export function TeamMeeting({ s, reload }: { s: Snapshot; reload: () => Promise<void> | void }) {
  const { brand } = useBrand();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const lastK = s.knowledge[0]?.date;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try { const r = await importMeeting(brand.id, text); setMsg(`Imported: ${r.knowledge} new facts, ${r.pitches} pitches.`); setText(""); await reload(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Weekly team meeting</p>
          <p className="text-xs text-concrete">Every Sunday the team researches what changed (algorithm, ads, Egypt trends), pitches ideas and the Director sums up. Team knowledge last updated: {lastK ?? "never"} · <a href="#/knowledge" className="text-ultra hover:underline">open team knowledge →</a></p>
        </div>
        <Button onClick={() => setOpen(!open)}>{open ? "Close" : "Run it now"}</Button>
      </div>
      {open && (
        <div id="team-meeting" className="mt-3 text-sm">
          <p className="mb-2 text-xs text-concrete">1 · Copy the meeting brief · 2 · Paste it in Claude (with web search on) · 3 · Paste the JSON answer here.</p>
          <Copy text={meetingPrompt(s)} label="Copy meeting brief" />
          <textarea id="meeting-answer" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="mt-3 w-full font-mono text-xs" placeholder='{"summary": …, "knowledge": [ … ], "pitches": [ … ]}' />
          <div className="mt-2"><Button kind="primary" busy={busy} disabled={!text.trim()} onClick={save}>Import meeting</Button></div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-moss">{msg}</p>}
      <ErrorNote msg={err} />
    </Panel>
  );
}
