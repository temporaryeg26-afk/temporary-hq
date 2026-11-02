import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { Button, ErrorNote, PageHead, Panel, Text, useAsync } from "../components/ui";
import {
  band, Campaign, campaignOf, CATEGORIES, CouncilReview, feedbackPack, JUDGES, loadReviews, RESULT_FIELDS, reviewPack, saveFeedback, saveResults, saveReview, total,
} from "../lib/council";
import { loadContent, saveBrand } from "../lib/data";
import type { ContentItem } from "../lib/types";

const KINDS = ["reel idea", "video script", "finished video (describe it)", "caption", "carousel", "story sequence", "ad", "campaign", "content calendar", "hook", "product description", "ambassador / influencer brief", "trend", "strategy"];
const tone = (d: string) => (d.startsWith("APPROVED") ? "text-moss" : d === "REJECTED" ? "text-brick" : "text-ochre");

/** TEMP HQ — MARKETING INTELLIGENCE COUNCIL: five judges review, debate, rebuild and approve. */
export default function Council({ id }: { id?: string }) {
  const { brand, products, refresh } = useBrand();
  const data = useAsync(async () => {
    const [items, reviews] = await Promise.all([loadContent(brand.id), loadReviews(brand.id)]);
    return { items, reviews };
  }, [brand.id]);
  const items = (data.data?.items ?? []).filter((i) => i.output && i.status !== "rejected" && i.status !== "published").sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const reviews = [...(data.data?.reviews ?? [])].reverse();

  const [mode, setMode] = useState<"piece" | "other">(id ? "piece" : "piece");
  const [pick, setPick] = useState(id ?? "");
  const [text, setText] = useState("");
  const [kind, setKind] = useState(KINDS[0]);
  const [to, setTo] = useState<"claude" | "chatgpt">((brand.settings?.manager as any) === "chatgpt" ? "chatgpt" : "claude");
  const [open, setOpen] = useState<string | null>(null);
  const item: ContentItem | null = items.find((i) => i.id === pick) ?? (data.data?.items ?? []).find((i) => i.id === pick) ?? null;
  const subject = mode === "piece" ? { item } : { text, kind };

  return (
    <div>
      <PageHead title="Marketing Intelligence Council" sub="Five experts · one final decision. They review every piece on their own, debate, rebuild the weak parts, run a 'what if it flops?' check and give a production-ready version. A score never overrides a brand rule." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {JUDGES.map((j) => (
          <div key={j.key} className="rounded-panel border border-rule bg-soot p-4 text-sm">
            <p className="text-xs text-concrete">JUDGE {j.no} · {j.field}</p>
            <p className="mt-1 font-semibold">{j.name}</p>
            <p className="mt-2 text-concrete">{j.question}</p>
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs text-concrete">Pipeline: submitted → 5 independent reviews → debate → reconstruction → devil's advocate → final approval → performance feedback. Scores: hook 15 · retention 15 · emotion 15 · brand 10 · audience 10 · story 10 · share 10 · sales 10 · CTA 5.</p>

      <CampaignPanel campaign={campaignOf(brand)} onSave={async (c) => { await saveBrand(brand.id, { settings: { ...brand.settings, campaign: c } as any }); await refresh(); }} />

      <Panel className="mb-6">
        <h2 className="wide mb-3 font-semibold">Submit for review</h2>
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <button onClick={() => setMode("piece")} className={`rounded-full border px-3 py-1 ${mode === "piece" ? "border-ultra" : "border-rule text-concrete"}`}>A piece in HQ</button>
          <button onClick={() => setMode("other")} className={`rounded-full border px-3 py-1 ${mode === "other" ? "border-ultra" : "border-rule text-concrete"}`}>Anything else (idea, script, campaign…)</button>
          <span className="flex-1" />
          <select value={to} onChange={(e) => setTo(e.target.value as any)} className="text-sm"><option value="claude">Claude</option><option value="chatgpt">ChatGPT</option></select>
        </div>
        {mode === "piece" ? (
          <select className="mb-4 w-full" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a piece…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.scheduled_for} · {i.format} · {i.title}{i.output?.council ? ` · council ${i.output.council.after ?? "?"}` : ""}</option>
            ))}
          </select>
        ) : (
          <div className="mb-4 space-y-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            <textarea dir="auto" rows={6} className="w-full" placeholder="Paste the idea, script, caption, campaign… (describe a finished video scene by scene — the council can't watch it)" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        )}
        {(mode === "piece" ? !!item : text.trim().length > 10) ? (
          <Relay
            key={`${mode}-${pick}-${to}`}
            to={to}
            title="Run the council"
            why={mode === "piece" ? "The improved version is saved straight onto the piece (the old one stays restorable) unless the council rejects it." : "The review and the rebuilt version are saved below."}
            makePack={() => reviewPack(brand, products, subject)}
            onAnswer={async (json) => {
              const rec = await saveReview(brand, products, json, to, subject);
              await data.reload();
              setOpen(rec.id);
              return `${rec.decision} · ${rec.score_before ?? "?"} → ${rec.score_after ?? "?"}${rec.applied ? " · improved version saved on the piece" : ""}`;
            }}
          />
        ) : (
          <p className="text-sm text-concrete">{mode === "piece" ? "Choose a piece." : "Write at least a sentence."}</p>
        )}
      </Panel>

      <h2 className="wide mb-3 font-semibold">Reviews</h2>
      {!reviews.length && <p className="mb-6 text-sm text-concrete">No reviews yet.</p>}
      <div className="mb-8 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-panel border border-rule bg-soot p-4 text-sm">
            <button className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className="font-semibold" dir="auto">{r.subject}</span>
              <span className="text-xs text-concrete">{r.kind} · {r.created_at.slice(0, 10)} · {r.by} · {r.score_before ?? "?"} → <b className={band(r.score_after).tone}>{r.score_after ?? "?"}</b> · <b className={tone(r.decision)}>{r.decision}</b></span>
            </button>
            {open === r.id && <ReviewDetail r={r} onChange={data.reload} />}
          </div>
        ))}
      </div>

      <Library reviews={data.data?.reviews ?? []} />
      <ErrorNote msg={data.error} />
    </div>
  );
}

function CampaignPanel({ campaign, onSave }: { campaign: Campaign; onSave: (c: Campaign) => Promise<void> }) {
  const [c, setC] = useState(campaign);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const f = (k: keyof Campaign, label: string) => (
    <label className="block text-sm"><span className="text-xs text-concrete">{label}</span>
      <input className="mt-1 w-full" type={k === "notes" ? "text" : "date"} value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
    </label>
  );
  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm"><span className="text-concrete">Campaign (founder decisions — the council can't change them):</span> reveal <b>{campaign.reveal}</b> · drop opens <b>{campaign.drop_open}</b> · Black Friday <b>{campaign.black_friday}</b> · last call <b>{campaign.last_call}</b></p>
        <Button kind="quiet" onClick={() => setEdit(!edit)}>{edit ? "Close" : "Edit dates"}</Button>
      </div>
      {edit && (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {f("reveal", "Design reveal")}{f("drop_open", "Drop opens")}{f("black_friday", "Black Friday")}{f("last_call", "Last call")}
          <div className="sm:col-span-4">{f("notes", "Notes for the council")}</div>
          <div><Button kind="primary" busy={busy} onClick={async () => { setBusy(true); await onSave(c); setBusy(false); setEdit(false); }}>Save</Button></div>
        </div>
      )}
    </Panel>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs text-concrete">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">{items.map((x, i) => <li key={i} dir="auto">{String(x)}</li>)}</ul>
    </div>
  );
}

function ReviewDetail({ r, onChange }: { r: CouncilReview; onChange: () => Promise<unknown> | void }) {
  const { brand, products } = useBrand();
  const a = r.answer ?? {};
  const [nums, setNums] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const judgeName = (k: string) => JUDGES.find((j) => j.key === k)?.name ?? k;
  const last = r.results?.[r.results.length - 1];

  return (
    <div className="mt-4 space-y-4 border-t border-rule pt-4">
      {a.executive && (
        <div>
          <p className="text-xs text-concrete">A · Executive verdict</p>
          <p className="mt-1" dir="auto">{a.executive.assessment}</p>
          <p className="mt-1 text-xs text-concrete">{a.executive.type} · {a.executive.platform} · objective: {a.executive.objective} · stage: {a.executive.stage}</p>
          <p className={`mt-1 text-xs ${band(r.score_after).tone}`}>{band(r.score_after).label}</p>
          <List title="Assumptions" items={a.executive.assumptions} />
        </div>
      )}
      {r.doctrine_flags?.length > 0 && (
        <div>
          <p className="text-xs text-concrete">Doctrine check on the improved version</p>
          {r.doctrine_flags.map((f, i) => <p key={i} className={f.severity === "block" ? "text-brick" : "text-ochre"}>{f.severity === "block" ? "Must fix" : "Needs your OK"}: {f.rule} — {f.detail}</p>)}
        </div>
      )}

      <div>
        <p className="text-xs text-concrete">B · The five judges</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {(a.judges ?? []).map((j: any) => (
            <div key={j.key} className="rounded-ctl border border-rule p-3">
              <p className="font-semibold">{judgeName(j.key)} · {j.score}/100 · <span className={j.approve ? "text-moss" : "text-brick"}>{j.approve ? "approve" : "reject"}</span></p>
              <List title="Works" items={j.works} />
              <List title="Fails" items={j.fails} />
              {j.observations && <p className="mt-2 text-concrete" dir="auto">{j.observations}</p>}
              <p className="mt-2" dir="auto"><span className="text-xs text-concrete">Biggest weakness: </span>{j.biggest_weakness}</p>
              <p dir="auto"><span className="text-xs text-concrete">Biggest opportunity: </span>{j.biggest_opportunity}</p>
              <List title="Improvements" items={j.improvements} />
            </div>
          ))}
        </div>
      </div>

      {a.psychology && (
        <div>
          <p className="text-xs text-concrete">Psychology</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(a.psychology).map(([k, v]) => <p key={k} dir="auto"><span className="text-xs capitalize text-concrete">{k.replace(/_/g, " ")}: </span>{String(v)}</p>)}</div>
        </div>
      )}

      {a.debate?.length > 0 && (
        <div>
          <p className="text-xs text-concrete">C · The debate</p>
          {a.debate.map((d: any, i: number) => (
            <div key={i} className="mt-2"><p className="font-semibold" dir="auto">{d.topic}</p><p dir="auto">{d.positions}</p><p className="text-moss" dir="auto">Wins: {judgeName(d.winner)} — {d.why}</p></div>
          ))}
        </div>
      )}

      {a.problems?.length > 0 && (
        <div>
          <p className="text-xs text-concrete">D · Biggest problems</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">{a.problems.map((p: any, i: number) => <li key={i} dir="auto"><b>{p.problem}</b> — {p.impact}. <span className="text-moss">Fix: {p.fix}</span></li>)}</ol>
        </div>
      )}

      {a.devils_advocate?.length > 0 && (
        <div>
          <p className="text-xs text-concrete">Devil's advocate — "it flopped, why?"</p>
          {a.devils_advocate.map((d: any, i: number) => <List key={i} title={judgeName(d.key)} items={d.reasons} />)}
        </div>
      )}

      <div>
        <p className="text-xs text-concrete">E · Hooks</p>
        <List title="Options" items={a.hooks} />
        {a.selected_hook && <p className="mt-1" dir="auto"><span className="text-xs text-concrete">Selected: </span><b>{a.selected_hook}</b></p>}
      </div>

      {a.improved && (
        <details>
          <summary className="cursor-pointer text-sm text-ultra">The improved version (full)</summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-ctl border border-rule p-3 text-xs" dir="auto">{JSON.stringify(a.improved, null, 2)}</pre>
        </details>
      )}
      {r.content_id && <a href={`#/content/${r.content_id}`} className="text-sm text-ultra hover:underline">{r.applied ? "Open the piece (improved version saved)" : "Open the piece"}</a>}

      <div>
        <p className="text-xs text-concrete">F · Scorecard</p>
        <table className="mt-1 w-full text-xs">
          <thead><tr className="text-concrete"><th className="text-left">Category</th><th>Weight</th><th>Before</th><th>After</th></tr></thead>
          <tbody>
            {CATEGORIES.map((c) => <tr key={c.key}><td>{c.label}</td><td className="text-center">{c.weight}</td><td className="text-center">{a.scores_before?.[c.key] ?? "–"}</td><td className="text-center">{a.scores_after?.[c.key] ?? "–"}</td></tr>)}
            <tr className="font-semibold"><td>Total /100</td><td /><td className="text-center">{total(a.scores_before) ?? "–"}</td><td className="text-center">{total(a.scores_after) ?? "–"}</td></tr>
          </tbody>
        </table>
        <List title="Remaining weaknesses" items={a.remaining_weaknesses} />
        <List title="Production requirements" items={a.production} />
        <List title="Needs you (verify / decide)" items={a.needs_founder} />
        {a.prediction && <p className="mt-2" dir="auto"><span className="text-xs text-concrete">Prediction: </span>{a.prediction.metric_to_watch} — {a.prediction.expected}. Success: {a.prediction.success_looks_like}</p>}
      </div>

      <div>
        <p className="text-xs text-concrete">G · Final publishing decision</p>
        <p className={`font-semibold ${tone(r.decision)}`}>{r.decision}</p>
        <Text>{a.decision_reason ?? ""}</Text>
      </div>

      <div className="rounded-ctl border border-rule p-3">
        <p className="font-semibold">Performance feedback</p>
        <p className="text-xs text-concrete">After posting (48h+), add the real numbers. The council compares them with its prediction and the lessons feed every future review.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RESULT_FIELDS.map(([k, l]) => (
            <label key={k} className="text-xs"><span className="text-concrete">{l}</span><input className="mt-1 w-full" inputMode="decimal" value={nums[k] ?? ""} onChange={(e) => setNums({ ...nums, [k]: e.target.value })} /></label>
          ))}
        </div>
        <div className="mt-2"><Button busy={busy} disabled={!Object.values(nums).some((v) => v.trim())} onClick={async () => {
          setBusy(true); setErr(null);
          try {
            const clean = Object.fromEntries(Object.entries(nums).filter(([, v]) => v.trim()).map(([k, v]) => [k, Number.isNaN(Number(v)) ? v : Number(v)]));
            await saveResults(brand, r, clean); setNums({}); await onChange();
          } catch (e) { setErr((e as Error).message); }
          setBusy(false);
        }}>Save results</Button></div>
        {last && (
          <div className="mt-3">
            <p className="text-xs text-concrete">Latest results ({last.at.slice(0, 10)}): {Object.entries(last.numbers).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
            <div className="mt-2">
              <Relay to={r.by === "chatgpt" ? "chatgpt" : "claude"} title="Ask the council what we learned" why="Predicted vs real — the lessons are kept with dates and used in every future review."
                makePack={() => feedbackPack(brand, products, r)}
                onAnswer={async (json) => { await saveFeedback(brand, r, json, r.by); await onChange(); return "Lessons saved."; }} />
            </div>
          </div>
        )}
        {(r.feedback ?? []).map((f, i) => (
          <div key={i} className="mt-3 border-t border-rule pt-2">
            <p className="text-xs text-concrete">Lessons · {f.at.slice(0, 10)} · {f.answer?.pattern_status ?? "early"} · hook {f.answer?.hook_worked ? "worked" : "didn't work"}</p>
            <List title="Change next time" items={f.answer?.change_next} />
            <List title="Predicted right" items={f.answer?.predicted_right} />
            <List title="Predicted wrong" items={f.answer?.predicted_wrong} />
          </div>
        ))}
        <ErrorNote msg={err} />
      </div>
    </div>
  );
}

function Library({ reviews }: { reviews: CouncilReview[] }) {
  const approved = reviews.filter((r) => r.decision.startsWith("APPROVED") && r.answer?.selected_hook);
  const rejected = reviews.filter((r) => r.decision === "REJECTED");
  const lessons = reviews.flatMap((r) => (r.feedback ?? []).flatMap((f) => (f.answer?.change_next ?? []).map((l: string) => ({ at: f.at, l, s: f.answer?.pattern_status ?? "early", subject: r.subject }))));
  const worked = reviews.filter((r) => r.feedback?.some((f) => f.answer?.hook_worked === true));
  if (!reviews.length) return null;
  return (
    <Panel>
      <h2 className="wide mb-3 font-semibold">Council memory</h2>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div><p className="text-xs text-concrete">Approved hooks</p>{approved.slice(-15).reverse().map((r) => <p key={r.id} dir="auto">• {r.answer.selected_hook} <span className="text-xs text-concrete">({r.score_after})</span></p>)}</div>
        <div><p className="text-xs text-concrete">Hooks proven by real results</p>{worked.length ? worked.map((r) => <p key={r.id} dir="auto">• {r.answer?.selected_hook}</p>) : <p className="text-concrete">None yet — add results after posting.</p>}</div>
        <div><p className="text-xs text-concrete">Rejected</p>{rejected.length ? rejected.slice(-10).reverse().map((r) => <p key={r.id} dir="auto">• {r.subject} — {r.answer?.decision_reason}</p>) : <p className="text-concrete">None.</p>}</div>
        <div><p className="text-xs text-concrete">Lessons (dated, never overwritten)</p>{lessons.length ? lessons.slice(-15).reverse().map((x, i) => <p key={i} dir="auto">• {x.at.slice(0, 10)} [{x.s}] {x.l}</p>) : <p className="text-concrete">None yet.</p>}</div>
      </div>
    </Panel>
  );
}
