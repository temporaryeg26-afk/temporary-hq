import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { addMemory, averages, loadSnapshot, MemoryEntry, score, verdictOf } from "../lib/agencyos";
import { insert, newId, now } from "../lib/store";

/** What we already did (from Instagram insights, 29 Oct 2026) — loaded once so nothing repeats. */
const SEED: Omit<MemoryEntry, "id" | "created_at">[] = [
  { date: "2026-10-23", format: "founder_video", topic: "100,000 vs 200 — why few pieces", hook: "تيشيرت معمول منه ١٠٠ ألف.. وتيشيرت معمول منه ٢٠٠", views: 3290, likes: 256, saves: 37, shares: 33, follows: 26, avg_watch_s: 7, verdict: "winner", lesson: "A clear number/contrast hook + insider tone = real saves, shares and follows." },
  { date: "2026-10-01", format: "reel", topic: "Older Founder Reel (boosted) — exact topic to confirm", hook: "", views: 2543, likes: 35, saves: 54, shares: 7, follows: 119, boosted: true, verdict: "winner", lesson: "Best follower result so far: a strong Reel + boost brought 119 follows. Promote proven winners only." },
  { date: "2026-10-02", format: "reel", topic: "Reel with few likes but real saves — topic to confirm", hook: "", views: 1348, likes: 17, saves: 18, shares: 12, follows: 15, verdict: "winner", lesson: "Likes don't matter: 17 likes, yet 30 saves+shares and 15 follows." },
  { date: "2026-10-03", format: "reel", topic: "Boosted Reel — topic to confirm", hook: "", views: 2328, likes: 125, saves: 22, shares: 6, follows: 21, boosted: true, verdict: "average" },
  { date: "2026-10-04", format: "reel", topic: "Reel with inflated likes (like service period)", hook: "", views: 2264, likes: 330, saves: 9, shares: 6, follows: 6, avg_watch_s: 0, verdict: "suspect", lesson: "Likes from the like service: ignore likes, judge by saves/shares/follows." },
  { date: "2026-10-05", format: "reel", topic: "Reel (like service period)", hook: "", views: 1009, likes: 508, saves: 1, shares: 2, follows: 0, avg_watch_s: 0, verdict: "suspect" },
  { date: "2026-10-06", format: "reel", topic: "Reel (like service period)", hook: "", views: 858, likes: 240, saves: 6, shares: 3, follows: 0, avg_watch_s: 1, verdict: "suspect" },
  { date: "2026-10-07", format: "static", topic: "Image post (like service period)", hook: "", views: 595, likes: 245, saves: 0, shares: 1, follows: 0, verdict: "suspect" },
  { date: "2026-10-08", format: "static", topic: "Typical image post (average of many)", hook: "", views: 40, likes: 2, saves: 0, shares: 0, follows: 0, verdict: "weak", lesson: "Image posts reach only 13–85 people. Use statics only for big moments; Reels first." },
  { date: "2026-10-22", format: "founder_video", topic: "Why everyone wears the same tee (origin)", hook: "بص حواليك في أي كافيه.. هتلاقي ٣ لابسين نفس التيشيرت", verdict: "" },
  { date: "2026-10-24", format: "founder_video", topic: "I chose to sell less (the circle)", hook: "أي براند عايز يبيع أكتر.. أنا اخترت أبيع أقل", verdict: "" },
  { date: "2026-10-25", format: "static", topic: "Clásico capsule 90' (Paymob approval posts)", hook: "الليلة.. أبيض ولا بلو-جرانا؟", verdict: "" },
  { date: "2026-10-25", format: "founder_video", topic: "What you really pay for", hook: "لما بتدفع في تيشيرت.. إنت بتدفع في إيه بالظبط؟", verdict: "" },
  { date: "2026-10-26", format: "founder_video", topic: "7 days, no agency", hook: "٧ أيام. من غير وكالة. من غير ما أدفع جنيه.", verdict: "" },
  { date: "2026-10-27", format: "founder_video", topic: "Why the mask", hook: "كل يوم حد بيسألني: إنت مين؟ وليه الماسك؟", verdict: "" },
  { date: "2026-10-28", format: "founder_video", topic: "EVERYTHING IS TEMPORARY — the name", hook: "الترند اللي إنت لابسه دلوقتي.. هيعيش كام شهر؟", verdict: "" },
  { date: "2026-10-31", format: "carousel", topic: "3 ways to be part of TEMPORARY (Founder Walks, 9 slides)", hook: "٣ طرق تبقى جزء من TEMPORARY.. وواحدة منهم مش هتتكرر", verdict: "" },
];

const VERDICT: Record<string, string> = { winner: "text-moss border-moss/60", average: "text-concrete border-rule", weak: "text-brick border-brick/60", suspect: "text-ochre border-ochre/60" };
const blank = { date: new Date().toISOString().slice(0, 10), format: "founder_video", topic: "", hook: "", views: "", saves: "", shares: "", follows: "", likes: "", boosted: false, lesson: "" };

export default function Memory() {
  const { brand, products } = useBrand();
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id]);
  const [f, setF] = useState<any>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mem = snap.data?.memory ?? [];
  const avg = averages(mem);

  const seed = async () => {
    setBusy(true);
    try {
      await insert(brand.id, "memory", SEED.map((e) => ({ ...e, id: newId(), created_at: now() })), "memory: what we already did");
      await snap.reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      const n = (k: string) => (f[k] === "" ? undefined : Number(f[k]));
      await addMemory(brand.id, { date: f.date, format: f.format, topic: f.topic.trim(), hook: f.hook.trim(), views: n("views"), saves: n("saves"), shares: n("shares"), follows: n("follows"), likes: n("likes"), boosted: !!f.boosted, lesson: f.lesson.trim(), verdict: "" });
      setF(blank);
      await snap.reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div>
      <PageHead title="Memory" sub="Everything we already posted and how it did. Every employee reads this, so topics and hooks are never repeated and winners get repeated in new ways." />

      {!snap.loading && !mem.length && (
        <Panel className="mb-6">
          <p className="mb-3 text-sm">Memory is empty. Load what we already did (topics, hooks and the Instagram results I collected on 29 Oct).</p>
          <Button kind="primary" busy={busy} onClick={seed}>Load what we already did</Button>
        </Panel>
      )}

      <Panel className="mb-6">
        <p className="mb-3 text-sm font-semibold">Add a post</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}>
            {["founder_video", "reel", "carousel", "static", "story", "ad"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}
          </select>
          <input className="sm:col-span-2" placeholder="Topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
          <input className="sm:col-span-4" dir="auto" placeholder="Hook (first line / first second)" value={f.hook} onChange={(e) => setF({ ...f, hook: e.target.value })} />
          {["views", "saves", "shares", "follows", "likes"].map((k) => <input key={k} type="number" min={0} placeholder={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.boosted} onChange={(e) => setF({ ...f, boosted: e.target.checked })} /> Boosted</label>
          <input className="sm:col-span-4" placeholder="Lesson (optional)" value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} />
        </div>
        <div className="mt-3"><Button kind="primary" busy={busy} disabled={!f.topic.trim()} onClick={add}>Save to memory</Button></div>
        <ErrorNote msg={err} />
      </Panel>

      <p className="mb-2 text-sm text-concrete">Your average: <b className="text-plaster">{avg.savesShares.toFixed(1)}</b> saves+shares and <b className="text-plaster">{avg.follows.toFixed(1)}</b> follows per 1,000 views (likes ignored). Winner = clearly above your average.</p>
      <div className="overflow-x-auto rounded-panel border border-rule">
        <table className="w-full text-sm">
          <thead className="bg-soot text-left text-xs text-concrete">
            <tr><th className="p-2">Date</th><th className="p-2">Format</th><th className="p-2">Topic / hook</th><th className="p-2">Views</th><th className="p-2">Saves+shares /1k</th><th className="p-2">Follows /1k</th><th className="p-2">Verdict</th></tr>
          </thead>
          <tbody>
            {mem.map((m) => {
              const sc = score(m), v = m.verdict === "suspect" ? "suspect" : verdictOf(m, avg) || (m.views ? "" : "no results yet");
              return (
                <tr key={m.id} className="border-t border-rule align-top">
                  <td className="whitespace-nowrap p-2 text-concrete">{m.date}</td>
                  <td className="p-2">{m.format.replace("_", " ")}{m.boosted ? " · boosted" : ""}</td>
                  <td className="p-2"><p>{m.topic}</p>{m.hook && <p dir="auto" className="text-xs text-concrete">{m.hook}</p>}{m.lesson && <p className="text-xs text-ultra">{m.lesson}</p>}</td>
                  <td className="p-2">{m.views?.toLocaleString() ?? "—"}</td>
                  <td className="p-2">{m.views ? sc.savesShares.toFixed(1) : "—"}</td>
                  <td className="p-2">{m.views ? sc.follows.toFixed(1) : "—"}</td>
                  <td className="p-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${VERDICT[v as string] ?? "border-rule text-concrete"}`}>{v}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ErrorNote msg={snap.error} />
    </div>
  );
}
