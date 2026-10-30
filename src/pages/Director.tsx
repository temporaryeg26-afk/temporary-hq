import { useState } from "react";
import { useBrand } from "../App";
import AgentBar from "../components/AgentBar";
import { PitchBoard, TeamMeeting } from "../components/TeamBoard";
import { Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { AGENTS, AgentKey, daysTo, goalOf, loadSnapshot, phaseOf, progress } from "../lib/agencyos";
import { saveBrand } from "../lib/data";

const TEAM: { key: AgentKey; href: string }[] = [
  { key: "content", href: "#/calendar" },
  { key: "growth", href: "#/memory" },
  { key: "media", href: "#/ads" },
  { key: "community", href: "#/community" },
  { key: "brand", href: "#/doctrine" },
];

/** Home: the Director's briefing — where we are, what went wrong, what changes, today's 3 tasks. */
export default function Director() {
  const { brand, products, refresh } = useBrand();
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id, brand.settings]);
  const g = goalOf(brand);
  const [sold, setSold] = useState(String(g.sold));
  const [spent, setSpent] = useState(String(g.ad_spent_egp));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = snap.data;
  const p = s ? progress(s) : null;

  const saveNumbers = async () => {
    setBusy(true);
    setErr(null);
    try {
      const agency = { ...g, sold: Math.max(0, Number(sold) || 0), ad_spent_egp: Math.max(0, Number(spent) || 0), sold_updated_at: new Date().toISOString() };
      await saveBrand(brand.id, { settings: { ...brand.settings, agency } as any });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div>
      <PageHead title="Director" sub="Your agency at a glance. Press Check in on any tab and that employee briefs you." />

      {s && p && (
        <Panel className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="wide text-lg font-semibold">Founder Drop 1</p>
            <p className="text-sm text-concrete">{phaseOf(s).toUpperCase()} · early access in {Math.max(0, daysTo(s, g.early_access_start))} days · drop in {Math.max(0, daysTo(s, g.drop_start))} days</p>
          </div>
          <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-rule">
            <div className="absolute inset-y-0 left-0 bg-ultra" style={{ width: `${Math.min(100, p.pct * 100)}%` }} />
            <div className="absolute inset-y-0 border-x border-moss bg-moss/25" style={{ left: `${g.target_low * 100}%`, width: `${(g.target_high - g.target_low) * 100}%` }} title="Target 85–90%" />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
            <span><b className="text-plaster">{g.sold}</b> <span className="text-concrete">of {g.goal_pieces} pieces sold</span></span>
            <span className="text-moss">Target: {p.low}–{p.high} pieces (85–90%)</span>
            {s.today >= g.early_access_start && <span className={p.onTrack ? "text-moss" : "text-brick"}>{p.onTrack ? "On track" : `Behind — expected ${p.expectedByNow} by now`}</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-concrete">Pieces sold</span>
              <input type="number" min={0} value={sold} onChange={(e) => setSold(e.target.value)} className="mt-1 w-28" />
            </label>
            <label className="block">
              <span className="text-xs text-concrete">Ad spend so far (EGP)</span>
              <input type="number" min={0} value={spent} onChange={(e) => setSpent(e.target.value)} className="mt-1 w-36" />
            </label>
            <Button busy={busy} onClick={saveNumbers}>Update</Button>
            <span className="text-xs text-concrete">Ad budget {g.ad_spent_egp.toLocaleString()} / {g.ad_cap_egp.toLocaleString()} EGP</span>
          </div>
          <ErrorNote msg={err} />
        </Panel>
      )}

      <AgentBar agent="director" open />

      {s && <PitchBoard s={s} reload={snap.reload} />}
      {s && <TeamMeeting s={s} reload={snap.reload} />}

      <p className="mb-3 mt-8 text-xs uppercase tracking-wide text-concrete">Your team · everyone reports to the Director · open a tab to chat with them</p>
      <div className="grid gap-3 md:grid-cols-2">
        {TEAM.map(({ key, href }) => {
          const a = AGENTS[key], b = s ? a.checkIn(s) : null;
          return (
            <a key={key} href={href} className="block rounded-panel border border-rule bg-soot p-4 hover:border-concrete">
              <p className="font-semibold">{a.name} <span className="text-xs font-normal text-concrete">· {a.title}</span></p>
              <p className="mt-1 text-sm text-concrete">{b ? b.status : "…"}</p>
              {b && b.wrong[0] && <p className="mt-1 text-sm text-brick">! {b.wrong[0]}</p>}
              {s && <p className="mt-1 text-xs text-ochre">{s.pitches.filter((x) => x.agent === key && x.status === "pitched").length} idea(s) pitched · {s.chat.filter((x) => x.agent === key).length} chat messages</p>}
            </a>
          );
        })}
      </div>
      <ErrorNote msg={snap.error} />
    </div>
  );
}
