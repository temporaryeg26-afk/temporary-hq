import { useMemo, useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { dataBlock, loadSnapshot, saveReply } from "../lib/agencyos";
import { saveBrand } from "../lib/data";
import {
  backwards, directorBrief, gateOpen, latest, loadCircle, loadMetrics, loadPulse, NORTH_STAR, parseMetrics, readNumbers, redTeamPack,
  RoadState, ROADS, roadsOf, savePulse, SCENARIOS, signupPace, upsertMetrics, WarSettings, warOf, wave2Gate,
} from "../lib/warroom";

const LIST_START = "2026-11-10", LIST_END = "2026-11-24", REVEAL = "2026-11-23", DROP = "2026-11-25";
const days = (a: string, b: string) => Math.ceil((Date.parse(b) - Date.parse(a)) / 864e5);
const n = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/[, ]/g, "")));
const fmt = (v?: number) => (typeof v === "number" ? v.toLocaleString("en-US") : "—");

/** HQ home: one goal, real numbers, nine roads, money behind proof only. */
export default function WarRoom() {
  const { brand, products, refresh } = useBrand();
  const w = warOf(brand);
  const today = new Date().toISOString().slice(0, 10);
  const pulse = useAsync(() => loadPulse(brand.id), [brand.id]);
  const metrics = useAsync(() => loadMetrics(brand.id), [brand.id]);
  const circle = useAsync(() => loadCircle(brand.id), [brand.id]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sc = SCENARIOS.find((s) => s.key === w.scenario)!;
  const plan = useMemo(() => backwards(sc), [sc]);
  const P = pulse.data ?? [], M = metrics.data ?? [], C = circle.data ?? [];
  const signups = latest(P, "signups_total") ?? 0, followers = latest(P, "followers"), pieces = latest(P, "pieces") ?? 0, orders = latest(P, "orders") ?? 0, spend = latest(P, "ad_spend") ?? 0;
  const pace = signupPace(today, LIST_START, LIST_END, plan.signups);
  const behind = signups < pace.expected;
  const nums = readNumbers(M);
  const roads = roadsOf(brand);
  const g2 = wave2Gate(C, w);

  const setWar = async (patch: Partial<WarSettings>) => {
    setBusy("war"); setErr(null);
    try { await saveBrand(brand.id, { settings: { ...brand.settings, warroom: { ...w, ...patch } } as any }); await refresh(); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };
  const setRoad = async (key: string, patch: Partial<RoadState>) => {
    setErr(null);
    const cur: RoadState = roads[key] ?? { status: "not started", owner: "HQ", next: "" };
    try { await saveBrand(brand.id, { settings: { ...brand.settings, roads: { ...roads, [key]: { ...cur, ...patch, updated_at: new Date().toISOString() } } } as any }); await refresh(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div>
      <PageHead title="War Room" sub={NORTH_STAR} />
      <ErrorNote msg={err} />

      {/* countdown */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Reveal", REVEAL], ["Drop opens", DROP], ["Black Friday", "2026-11-27"], ["Last call", "2026-11-30"]].map(([l, d]) => (
          <div key={l} className="rounded-panel border border-rule bg-soot p-4">
            <p className="text-xs text-concrete">{l} · {d.slice(8)} Nov</p>
            <p className="wide mt-1 text-2xl font-semibold">{Math.max(0, days(today, d))}<span className="ml-1 text-sm font-normal text-concrete">days</span></p>
          </div>
        ))}
      </div>

      <GoalBoard {...{ w, plan, sc, signups, followers, pieces, orders, spend, pace, behind, setWar, busy }} />
      <PulseForm brandId={brand.id} today={today} reload={pulse.reload} last={P.at(-1)} />
      <Numbers brandId={brand.id} nums={nums} w={w} reload={metrics.reload} />

      <h2 className="wide mb-3 mt-10 text-xl font-semibold">Nine roads — all at once</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {ROADS.map((r) => {
          const s = roads[r.key];
          const color = s?.status === "moving" ? "border-moss/60" : s?.status === "blocked" ? "border-brick/60" : s?.status === "done" ? "border-plaster/40" : "border-rule";
          return (
            <div key={r.key} className={`rounded-panel border bg-soot p-4 text-sm ${color}`}>
              <a href={r.href} className="font-semibold hover:text-ultra">{r.name}</a>
              <p className="mt-1 text-concrete">{r.job}</p>
              <p className="mt-1 text-xs text-concrete">KPI: {r.kpi}</p>
              {r.key === "circle" && <p className="mt-1 text-xs">Wave 1: {g2.members} live · {fmt(g2.views)} views · {fmt(g2.signups)} sign-ups · wave 2 {g2.open ? <b className="text-moss">OPEN</b> : "locked"}</p>}
              <div className="mt-3 flex gap-2">
                <select className="w-auto py-1 text-xs" value={s?.status ?? "not started"} onChange={(e) => setRoad(r.key, { status: e.target.value as RoadState["status"] })}>
                  {["not started", "moving", "blocked", "done"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <select className="w-auto py-1 text-xs" value={s?.owner ?? "HQ"} onChange={(e) => setRoad(r.key, { owner: e.target.value })}>
                  {["HQ", "Seif", "Circle", "Vendor"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <input className="mt-2 py-1 text-xs" placeholder="Next action…" defaultValue={s?.next ?? ""} onBlur={(e) => e.target.value !== (s?.next ?? "") && setRoad(r.key, { next: e.target.value })} />
            </div>
          );
        })}
      </div>

      <Gates w={w} setWar={setWar} busy={busy === "war"} nums={nums} g2={g2} />
      <DirectorDesk brand={brand} products={products} today={today} w={w} M={M} P={P} C={C} roads={roads} />
    </div>
  );
}

function GoalBoard({ w, plan, sc, signups, followers, pieces, orders, spend, pace, behind, setWar, busy }: any) {
  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="wide text-lg font-semibold">Goal Board — Drop 01</p>
        <div className="flex gap-1">
          {SCENARIOS.map((s) => (
            <button key={s.key} onClick={() => setWar({ scenario: s.key })} disabled={busy === "war"} className={`rounded-ctl px-3 py-1 text-xs ${w.scenario === s.key ? "bg-ultra text-white" : "border border-rule text-concrete"}`}>{s.label} · {s.pieces}</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-concrete">Working backwards from 30 Nov. Rates are planning assumptions ({Math.round(sc.reach_to_visit * 100)}% reach→profile, {Math.round(sc.visit_to_list * 100)}% profile→list, {Math.round(sc.list_buy_rate * 100)}% of the list buys, {sc.visit_buy_rate * 100}% of site visits buy) until our own numbers replace them.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        {[["People reached", plan.reach], ["Profile visits", plan.profileVisits], ["Drop-list sign-ups", plan.signups], ["Orders", plan.orders], ["Pieces", sc.pieces]].map(([l, v]) => (
          <div key={l as string} className="rounded-ctl border border-rule p-3"><p className="text-xs text-concrete">{l} needed</p><p className="mt-1 text-lg font-semibold">{fmt(v as number)}</p></div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>Drop list: <b>{fmt(signups)}</b> <span className="text-concrete">of {fmt(plan.signups)} by 24 Nov</span></span>
          <span className={behind ? "text-brick" : "text-moss"}>{behind ? `Behind — pace says ${fmt(pace.expected)} by today` : `On pace (${fmt(pace.expected)} expected)`} · need {fmt(Math.ceil(Math.max(0, plan.signups - signups) / Math.max(1, pace.daysLeft)))}/day</span>
        </div>
        <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-rule">
          <div className="absolute inset-y-0 left-0 bg-ultra" style={{ width: `${Math.min(100, (signups / plan.signups) * 100)}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-plaster" style={{ left: `${Math.min(100, (pace.expected / plan.signups) * 100)}%` }} title="Where the pace says we should be today" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-concrete">
        <span>Followers <b className="text-plaster">{fmt(followers)}</b></span>
        <span>Orders <b className="text-plaster">{fmt(orders)}</b></span>
        <span>Pieces sold <b className="text-plaster">{fmt(pieces)}</b> / {sc.pieces}</span>
        <span>Ad spend <b className="text-plaster">{fmt(spend)}</b> EGP</span>
      </div>
    </Panel>
  );
}

function PulseForm({ brandId, today, reload, last }: { brandId: string; today: string; reload: () => void; last?: any }) {
  const [v, setV] = useState<Record<string, string>>({ date: today });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const F: [string, string][] = [["followers", "Followers"], ["signups_total", "Drop-list total"], ["profile_visits", "Profile visits (day)"], ["site_visits", "Site visits (day)"], ["orders", "Orders total"], ["pieces", "Pieces total"], ["ad_spend", "Ad spend total"]];
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await savePulse(brandId, { date: v.date || today, ...Object.fromEntries(F.map(([k]) => [k, n(v[k] ?? "")])), note: v.note || undefined } as any);
      setV({ date: today }); reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <Panel className="mb-6">
      <p className="text-sm font-semibold">Today's pulse <span className="font-normal text-concrete">— 1 minute a day; HQ fills what it can automatically{last ? ` · last saved ${last.date}` : ""}</span></p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        {F.map(([k, l]) => <input key={k} inputMode="numeric" placeholder={l} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />)}
      </div>
      <input className="mt-2" placeholder="Note (what happened today)" value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <div className="mt-3"><Button kind="primary" busy={busy} onClick={save}>Save pulse</Button></div>
      <ErrorNote msg={err} />
    </Panel>
  );
}

function Numbers({ brandId, nums, w, reload }: { brandId: string; nums: ReturnType<typeof readNumbers>; w: WarSettings; reload: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const imp = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try { const rows = parseMetrics(text); const r = await upsertMetrics(brandId, rows); setMsg(`${r.added} new, ${r.changed} updated.`); setText(""); reload(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const rows = [...nums.rows].sort((a, b) => b.m.date.localeCompare(a.m.date));
  const tag = { scale: "text-moss", keep: "text-concrete", kill: "text-brick" } as const;
  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="wide text-lg font-semibold">The 48-hour loop</p>
        <p className="text-sm text-concrete">Median {fmt(Math.round(nums.medViews))} views · last 5 posts {fmt(Math.round(nums.recentMed))} ({Math.round(nums.trend * 100)}% of normal)</p>
      </div>
      <p className="mt-1 text-xs text-concrete">Each post vs the account's own median (60% views, 40% shares + saves + comments). Scale = remake with a new hook · Keep · Kill = stop that format or angle.</p>
      {rows.length ? (
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-concrete"><th className="py-1 pr-2">Date</th><th className="pr-2">Post</th><th className="pr-2 text-right">Views</th><th className="pr-2 text-right">Likes</th><th className="pr-2 text-right">Com.</th><th className="pr-2 text-right">Shares</th><th className="pr-2 text-right">Saves</th><th>Call</th></tr></thead>
            <tbody>{rows.map(({ m, verdict }) => (
              <tr key={m.id} className="border-t border-rule">
                <td className="py-1 pr-2 whitespace-nowrap text-concrete">{m.date}</td>
                <td className="pr-2"><a href={`https://www.instagram.com/p/${m.code}/`} target="_blank" rel="noreferrer" className="hover:text-ultra" dir="auto">{(m.hook || m.code).slice(0, 60)}</a> <span className="text-xs text-concrete">{m.format}</span></td>
                <td className="pr-2 text-right">{fmt(m.views)}</td><td className="pr-2 text-right">{fmt(m.likes)}</td><td className="pr-2 text-right">{fmt(m.comments)}</td><td className="pr-2 text-right">{fmt(m.shares)}</td><td className="pr-2 text-right">{fmt(m.saves)}</td>
                <td className={`font-semibold ${tag[verdict]}`}>{verdict}{gateOpen(m, w) && <span className="ml-1 text-xs text-ultra">· gate open</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="mt-3 text-sm text-concrete">No post numbers yet.</p>}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-concrete">Add / update numbers</summary>
        <p className="mt-2 text-xs text-concrete">Paste JSON, or one post per line: code | date | format | views | likes | comments | shares | saves | follows | hook. Same code = updated, never duplicated.</p>
        <textarea rows={4} className="mt-2 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2 flex items-center gap-3"><Button busy={busy} onClick={imp} disabled={!text.trim()}>Import</Button>{msg && <span className="text-sm text-moss">{msg}</span>}</div>
        <ErrorNote msg={err} />
      </details>
    </Panel>
  );
}

function Gates({ w, setWar, busy, nums, g2 }: { w: WarSettings; setWar: (p: Partial<WarSettings>) => Promise<void>; busy: boolean; nums: ReturnType<typeof readNumbers>; g2: ReturnType<typeof wave2Gate> }) {
  const open = nums.rows.filter((r) => gateOpen(r.m, w));
  const num = (k: keyof WarSettings) => (
    <input type="number" className="w-28 py-1" defaultValue={w[k] as number} onBlur={(e) => Number(e.target.value) !== w[k] && setWar({ [k]: Number(e.target.value) || 0 } as any)} />
  );
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <Panel>
        <p className="wide text-lg font-semibold">Money gates</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li><b>First boost:</b> a post with {w.boost_views}+ views and {w.boost_actions}+ shares/saves in 48 h → paid reach behind that post only. {open.length ? <span className="text-moss">Open on {open.length} post(s).</span> : <span className="text-concrete">Not open yet.</span>}</li>
          <li><b>Test:</b> {w.test_budget_egp ? `${w.test_budget_egp} EGP approved behind 2–3 real product clips.` : "no test budget approved."}</li>
          <li><b>Scale:</b> cost per sign-up under target 3 days in a row → raise budget on the winner (Seif approves).</li>
          <li><b>Circle wave 2:</b> wave 1 reaches {w.wave2_signups}+ sign-ups or {fmt(w.wave2_views)}+ views → send the other 7. {g2.open ? <span className="text-moss">Open.</span> : <span className="text-concrete">{fmt(g2.signups)} sign-ups · {fmt(g2.views)} views so far.</span>}</li>
          <li><b>Retarget:</b> from 25 Nov, show the drop to engagers, viewers and site visitors.</li>
        </ol>
        <p className="mt-3 text-xs text-concrete">Auto-pause: any ad at more than 2× the target cost per sign-up for 24 h stops.</p>
      </Panel>
      <Panel>
        <p className="wide text-lg font-semibold">Seif's decisions</p>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">Reveal of the back print
            <select className="mt-1" value={w.reveal_mode} disabled={busy} onChange={(e) => setWar({ reveal_mode: e.target.value as any })}>
              <option value="hidden">Hidden until 23 Nov</option><option value="progressive">Progressive ladder from now (recommended)</option>
            </select>
          </label>
          <label className="block">Stories
            <select className="mt-1" value={w.stories} disabled={busy} onChange={(e) => setWar({ stories: e.target.value as any })}>
              <option value="off">Off</option><option value="launch_week">Launch week only (23–30 Nov)</option><option value="daily">Daily, 3–8 frames</option>
            </select>
          </label>
          <label className="block">Instagram linked to a Facebook Page (needed for 24/7 numbers + auto-replies)
            <select className="mt-1" value={w.meta_linked} disabled={busy} onChange={(e) => setWar({ meta_linked: e.target.value as any })}>
              <option value="unknown">Not checked</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="block">Test budget (EGP)<br />{num("test_budget_egp")}</label>
            <label className="block">Daily cap (EGP)<br />{num("daily_cap_egp")}</label>
            <label className="block">Gate views<br />{num("boost_views")}</label>
            <label className="block">Gate shares+saves<br />{num("boost_actions")}</label>
          </div>
          <label className="block">Drop-list link
            <input className="mt-1" defaultValue={w.drop_list_url} placeholder="https://…" onBlur={(e) => e.target.value !== w.drop_list_url && setWar({ drop_list_url: e.target.value.trim() })} />
          </label>
        </div>
      </Panel>
    </div>
  );
}

function DirectorDesk({ brand, products, today, w, M, P, C, roads }: any) {
  const [answer, setAnswer] = useState("");
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const brief = async () => {
    const s = await loadSnapshot(brand, products);
    return directorBrief({ brand, today, w, ms: M, pulse: P, circle: C, roads, dataBlock: dataBlock(s) });
  };
  const [briefText, setBriefText] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try { await saveReply(brand.id, "director", "48-hour war-room brief", answer); setPlan(answer); setAnswer(""); setMsg("Saved to the Director's chat. Now red-team it below."); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <Panel className="mt-10">
      <p className="wide text-lg font-semibold">Director of Content — the 48-hour brief</p>
      <p className="mt-1 text-sm text-concrete">1) Build the brief (it carries the goal, real numbers, the roads and the Circle). 2) Paste it into Claude. 3) Paste the answer back. 4) Send the plan to GPT to attack. 5) You approve.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button kind="primary" onClick={async () => setBriefText(await brief())}>Build the brief</Button>
        {briefText && <Copy text={briefText} label="Copy brief" />}
        {briefText && <span className="text-xs text-concrete">{Math.round(briefText.length / 1000)}k characters</span>}
      </div>
      <textarea rows={5} className="mt-3 text-sm" placeholder="Paste the Director's answer here…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <div className="mt-2"><Button busy={busy} disabled={!answer.trim()} onClick={save}>Save answer</Button></div>
      <p className="mt-6 text-sm font-semibold">Red team (GPT)</p>
      <textarea rows={4} className="mt-2 text-sm" placeholder="The plan to attack (filled after you save the Director's answer, or paste any plan)…" value={plan} onChange={(e) => setPlan(e.target.value)} />
      <div className="mt-2">{plan.trim() && <Copy text={redTeamPack(plan, `Goal: ${SCENARIOS.find((s) => s.key === w.scenario)!.label} scenario. Followers ${latest(P, "followers") ?? "?"}, drop list ${latest(P, "signups_total") ?? 0}. Median Reel views ${Math.round(readNumbers(M).medViews)}.`)} label="Copy for GPT" />}</div>
      {msg && <p className="mt-2 text-sm text-moss">{msg}</p>}
      <ErrorNote msg={err} />
    </Panel>
  );
}
