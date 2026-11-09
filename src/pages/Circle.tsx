import { useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { update } from "../lib/store";
import { addCircle, CIRCLE_WEIGHTS, circleScore, CircleMember, CircleScores, CircleStatus, engagementRate, loadCircle, warOf, wave2Gate } from "../lib/warroom";

const STATUSES: CircleStatus[] = ["candidate", "shortlist", "invited", "accepted", "sent", "posted", "dropped"];
const ZERO: CircleScores = { relevance: 5, quality: 5, authenticity: 5, engagement: 5, cairo: 5, growth: 5 };

const BRIEF = `TEMPORARY™ — THE CIRCLE · one-page brief (Drop 01)

WHY YOU: we're not looking for influencers. We're looking for the first people who actually wear Drop 01.
THE GOAL: show Cairo what Drop 01 really is — honestly. Like it or not, say what you think.
WHAT YOU GET: one Drop 01 piece in your size, before the drop opens on 25 Nov.

MANDATORY (non-negotiable)
1. Label it as a gift: Instagram's paid-partnership / "gifted" label, or "gifted by @temporary_eg" in the first line.
2. Your own words. No script. If you don't like something, say it.
3. Don't promise anything about TEMPORARY we haven't said (prices are public from 23 Nov; 200 pieces per design; no restock).
4. Use your link (below) for the drop list.
5. We may reshare your post with credit. Any other use (ads, edits) only with your written OK.

PICK ONE ANGLE (each Circle member takes a different one): first try-on · unboxing the bag · outfit in the street · honest first reaction · detail close-ups · "would you pay for this?"

TIMING: post within 5 days of receiving the piece; Stories welcome.
YOUR LINK: {link}`;

const DM = (h: string) => `أهلاً @${h} 👋
إحنا TEMPORARY™ — براند ستريت وير مصري، أول دروب ٢٥ نوفمبر، ٢٠٠ قطعة بس من كل تصميم ومفيش ريستوك.
بنختار عدد صغير جداً من الناس اللي ذوقهم يمثل الشارع بجد عشان يكونوا أول ناس يلبسوا Drop 01 ويقولوا رأيهم الحقيقي — حلو أو وحش.
لو مهتم/ة، رد علينا وهنبعتلك التفاصيل.`;

export default function Circle() {
  const { brand } = useBrand();
  const w = warOf(brand);
  const c = useAsync(() => loadCircle(brand.id), [brand.id]);
  const [f, setF] = useState<Record<string, string>>({});
  const [sc, setSc] = useState<CircleScores>(ZERO);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = [...(c.data ?? [])].sort((a, b) => (a.status === "dropped" ? 1 : 0) - (b.status === "dropped" ? 1 : 0) || circleScore(b.scores) - circleScore(a.scores));
  const g = wave2Gate(c.data ?? [], w);

  const add = async () => {
    setBusy(true); setErr(null);
    try {
      const num = (k: string) => (f[k] ? Number(f[k].replace(/[, ]/g, "")) : undefined);
      await addCircle(brand.id, { handle: (f.handle || "").replace(/^@/, "").trim(), name: f.name, followers: num("followers"), avg_likes: num("avg_likes"), avg_comments: num("avg_comments"), niche: f.niche, scores: sc, wave: 0, status: "candidate", notes: f.notes });
      setF({}); setSc(ZERO); c.reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const patch = async (m: CircleMember, p: Partial<CircleMember>) => {
    setErr(null);
    try { await update<CircleMember>(brand.id, "circle", m.id, p, `circle: ${m.handle}`); c.reload(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div>
      <PageHead title="The Circle" sub="10 pieces, two waves: 3 first, 7 more only when wave 1 delivers. Picked on audience fit and content quality — not follower count. Publicly it's THE CIRCLE; never 'ambassadors', never 'free'." />
      <ErrorNote msg={err} />
      <Panel className="mb-6">
        <p className="text-sm">Wave 1: <b>{g.members}</b> live · <b>{g.views.toLocaleString()}</b> views · <b>{g.signups}</b> drop-list sign-ups · Wave 2 gate ({w.wave2_signups} sign-ups or {w.wave2_views.toLocaleString()} views): {g.open ? <b className="text-moss">OPEN — send the other 7</b> : <span className="text-concrete">locked</span>}</p>
        <div className="mt-3 flex flex-wrap gap-2"><Copy text={BRIEF} label="Copy the one-page brief" /></div>
      </Panel>

      <Panel className="mb-6">
        <p className="text-sm font-semibold">Add a candidate</p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          {[["handle", "@handle"], ["name", "Name"], ["niche", "What they post"], ["followers", "Followers"], ["avg_likes", "Avg likes (last 9 posts)"], ["avg_comments", "Avg comments"]].map(([k, l]) => (
            <input key={k} placeholder={l} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {CIRCLE_WEIGHTS.map(([k, label, wt]) => (
            <label key={k} className="block text-xs text-concrete">{label} ({Math.round(wt * 100)}%): <b className="text-plaster">{sc[k]}</b>
              <input type="range" min={0} max={10} value={sc[k]} onChange={(e) => setSc({ ...sc, [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <input className="mt-2" placeholder="Notes (fake-follower check, audience location, past brand work…)" value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <div className="mt-3 flex items-center gap-3"><Button kind="primary" busy={busy} disabled={!f.handle} onClick={add}>Add</Button><span className="text-sm text-concrete">Score {circleScore(sc)}/100</span></div>
      </Panel>

      <div className="space-y-3">
        {rows.map((m) => {
          const er = engagementRate(m);
          return (
            <div key={m.id} className={`rounded-panel border bg-soot p-4 text-sm ${m.status === "dropped" ? "border-rule opacity-50" : m.wave ? "border-ultra/50" : "border-rule"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={`https://www.instagram.com/${m.handle}/`} target="_blank" rel="noreferrer" className="font-semibold hover:text-ultra">@{m.handle}{m.name ? ` · ${m.name}` : ""}</a>
                <span className="text-concrete">Score <b className="text-plaster">{circleScore(m.scores)}</b> · {m.followers?.toLocaleString() ?? "?"} followers{er !== undefined ? ` · ${(er * 100).toFixed(1)}% engagement` : ""}{m.niche ? ` · ${m.niche}` : ""}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <select className="w-auto py-1 text-xs" value={m.status} onChange={(e) => patch(m, { status: e.target.value as CircleStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                <select className="w-auto py-1 text-xs" value={m.wave} onChange={(e) => patch(m, { wave: Number(e.target.value) as 0 | 1 | 2 })}><option value={0}>no wave</option><option value={1}>wave 1</option><option value={2}>wave 2</option></select>
                <input className="w-28 py-1 text-xs" placeholder="Piece" defaultValue={m.piece ?? ""} onBlur={(e) => e.target.value !== (m.piece ?? "") && patch(m, { piece: e.target.value })} />
                <input className="w-16 py-1 text-xs" placeholder="Size" defaultValue={m.size ?? ""} onBlur={(e) => e.target.value !== (m.size ?? "") && patch(m, { size: e.target.value })} />
                <input className="w-56 py-1 text-xs" placeholder="Tracked link" defaultValue={m.link ?? ""} onBlur={(e) => e.target.value !== (m.link ?? "") && patch(m, { link: e.target.value })} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {(["views", "follows", "signups"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1 text-concrete">{k}<input type="number" className="w-20 py-1" defaultValue={m[k] ?? ""} onBlur={(e) => Number(e.target.value) !== (m[k] ?? 0) && patch(m, { [k]: Number(e.target.value) || 0 })} /></label>
                ))}
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!m.disclosed} onChange={(e) => patch(m, { disclosed: e.target.checked })} /> labelled as gift</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!m.rights_ok} onChange={(e) => patch(m, { rights_ok: e.target.checked })} /> reshare OK in writing</label>
                <Copy text={DM(m.handle)} label="Copy invite DM" />
                <Copy text={BRIEF.replace("{link}", m.link || "(add the tracked link)")} label="Copy brief" />
              </div>
              {m.status === "posted" && !m.disclosed && <p className="mt-2 text-xs text-brick">Posted without a gift label — ask them to add it today.</p>}
              {m.notes && <p className="mt-2 text-xs text-concrete">{m.notes}</p>}
            </div>
          );
        })}
        {!rows.length && <p className="text-sm text-concrete">No candidates yet. Add 15–20, shortlist 10, send 3.</p>}
      </div>
    </div>
  );
}
