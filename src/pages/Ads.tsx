import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { activePeriod, applyAdPlan, applyAdReview, createPiece, loadAds, loadContent } from "../lib/data";
import { PAID_UNLOCK_DAYS } from "../lib/playbooks";
import { adReviewPack, adsPack } from "../lib/packs";
import type { AdRecord, AdTest } from "../lib/types";

const ACTION_STYLE: Record<string, string> = {
  scale: "text-moss border-moss/60",
  keep: "text-plaster border-plaster/50",
  fix: "text-ochre border-ochre/60",
  cut: "text-brick border-brick/60",
};

export default function AdsPage() {
  const { brand, products } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const [budget, setBudget] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(14);
  const [results, setResults] = useState("");

  const { data, error, reload } = useAsync(async () => {
    const [ads, items, period] = await Promise.all([loadAds(brand.id), loadContent(brand.id), activePeriod(brand.id)]);
    return { ads, items, period };
  }, [brand.id]);

  const plan: AdRecord | null = data?.ads.find((a) => a.kind === "plan") ?? null;
  const review: AdRecord | null = data?.ads.find((a) => a.kind === "review") ?? null;
  const lastReview = data?.ads.find((a) => a.kind === "review") ?? null;
  const total = (plan?.data.campaigns ?? []).reduce((s, c) => s + (Number(c.daily_egp) || 0) * (Number(c.days) || 0), 0);

  return (
    <div>
      <PageHead title="Media buying" sub="Paid promotion on Instagram and Facebook: what to boost, budget, audiences, test ads, and a weekly results review. You press Launch in Meta Ads Manager — HQ never spends money by itself." />
      <ErrorNote msg={error} />
      {(() => {
        const st = data?.period?.start;
        const day = st ? Math.floor((Date.now() - new Date(st + "T00:00:00").getTime()) / 86400000) + 1 : 0;
        return !st || day <= PAID_UNLOCK_DAYS ? (
          <p className="mb-5 rounded-panel border border-ochre/50 bg-soot p-4 text-sm text-ochre">
            Organic first: paid ads stay off until day {PAID_UNLOCK_DAYS + 1} of the period{st ? ` (today is day ${day})` : ""}. You can plan now; follow the steps in{" "}
            <a href="#/playbook" className="underline">
              Playbooks
            </a>
            .
          </p>
        ) : null;
      })()}

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-[160px_1fr_130px]">
          <div>
            <label htmlFor="abudget">Budget (EGP, whole period)</label>
            <input id="abudget" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 3000" />
          </div>
          <div>
            <label htmlFor="agoal">Goal</label>
            <input id="agoal" dir="auto" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 60 Instagram messages and 15 orders for the Boulevard tee" />
          </div>
          <div>
            <label htmlFor="adays">Period</label>
            <select id="adays" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
            </select>
          </div>
        </div>
      </Panel>

      <Relay
        to={manager}
        title={`Plan the ads with ${aiName(manager)}`}
        why="The media buyer picks what to boost, splits the budget, sets audiences, and writes an ad test kit you can make for free in Flow."
        makePack={() => adsPack(brand, products, data?.items ?? [], budget ? Number(budget) : null, goal, days, lastReview)}
        onAnswer={async (json) => {
          await applyAdPlan(brand, json, manager, budget ? Number(budget) : null, goal);
          await reload();
          return "Ad plan saved below.";
        }}
      />

      {plan && (
        <Panel className="mt-6">
          <p className="text-xs text-concrete">
            Ad plan · {new Date(plan.created_at).toLocaleDateString("en-GB")} · by {aiName(plan.made_by)}
            {plan.goal ? ` · goal: ${plan.goal}` : ""}
          </p>
          <p className="mt-2 max-w-3xl" dir="auto">
            {plan.data.strategy}
          </p>
          {total > 0 && <p className="mt-2 text-sm text-ochre">Total if run as planned: EGP {total.toLocaleString("en-GB")}</p>}

          <h3 className="wide mt-6 font-semibold">Campaigns to set up in Ads Manager</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(plan.data.campaigns ?? []).map((c, n) => (
              <div key={n} className="rounded-ctl border border-rule p-4 text-sm">
                <p className="font-semibold" dir="auto">
                  {c.name}
                </p>
                <p className="text-concrete">
                  {c.objective} · EGP {c.daily_egp}/day × {c.days} days
                </p>
                <dl className="mt-2 space-y-1">
                  <Row k="Audience" v={c.audience} />
                  <Row k="Placements" v={c.placements} />
                  <Row k="Creative" v={c.creative} />
                  <Row k="Why" v={c.why} />
                </dl>
              </div>
            ))}
          </div>

          {(plan.data.tests ?? []).length > 0 && (
            <>
              <h3 className="wide mt-6 font-semibold">Ad test kit</h3>
              <p className="text-sm text-concrete">Different hooks to test cheaply. Send any of them to production — it becomes a content piece with a Flow prompt and your logo on top.</p>
              <div className="mt-3 space-y-3">
                {(plan.data.tests ?? []).map((t, n) => (
                  <TestAd key={n} t={t} onMade={reload} />
                ))}
              </div>
            </>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <List title="What to watch" items={plan.data.measure ?? []} />
            <List title="When to cut, keep or scale" items={plan.data.rules ?? []} />
          </div>
        </Panel>
      )}

      <h2 className="wide mb-3 mt-10 text-xl font-semibold">Weekly results review</h2>
      <Panel className="mb-5">
        <label htmlFor="aresults">Paste your results from Meta Ads Manager (or type them: spend, reach, clicks, messages, cost per result, orders)</label>
        <textarea id="aresults" rows={5} value={results} onChange={(e) => setResults(e.target.value)} className="font-mono text-xs" placeholder="Campaign | Spend | Reach | Results | Cost per result ..." />
      </Panel>
      <Relay
        to={manager}
        title={`Review the results with ${aiName(manager)}`}
        why="For each campaign: cut, keep, scale or fix — with the exact change to make."
        makePack={() => {
          if (!results.trim()) throw new Error("Paste your results first.");
          return adReviewPack(brand, plan, results);
        }}
        onAnswer={async (json) => {
          await applyAdReview(brand, json, manager, results);
          setResults("");
          await reload();
          return "Review saved below.";
        }}
      />

      {review && (
        <Panel className="mt-6">
          <p className="text-xs text-concrete">
            Review · {new Date(review.created_at).toLocaleDateString("en-GB")} · by {aiName(review.made_by)}
          </p>
          <p className="mt-2" dir="auto">
            {review.data.summary}
          </p>
          <ul className="mt-4 space-y-2">
            {(review.data.verdicts ?? []).map((v, n) => (
              <li key={n} className="grid grid-cols-[70px_1fr] gap-3 rounded-ctl border border-rule p-3 text-sm">
                <span className={`h-fit rounded-full border px-2 py-0.5 text-center text-xs uppercase ${ACTION_STYLE[v.action] ?? ""}`}>{v.action}</span>
                <div>
                  <p className="font-medium" dir="auto">
                    {v.campaign}
                  </p>
                  <p className="text-concrete" dir="auto">
                    {v.why}
                  </p>
                  {v.change && (
                    <p className="mt-1" dir="auto">
                      Change: {v.change}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <List title="Do this week" items={review.data.next_moves ?? []} />
          </div>
        </Panel>
      )}
    </div>
  );
}

function TestAd({ t, onMade }: { t: AdTest; onMade: () => void }) {
  const { brand, products } = useBrand();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const make = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createPiece(brand, products, {
        format: t.format === "story" ? "story" : "reel",
        pillar: "conversion",
        product_code: t.product_code ?? "",
        angle: `AD TEST — ${t.name}: ${t.hook}`,
        cta: t.cta,
      });
      setDone(true);
      onMade();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const full = [`Hook: ${t.hook}`, `Script: ${t.script}`, t.on_screen_text ? `On screen: ${t.on_screen_text}` : "", t.caption ? `Caption: ${t.caption}` : "", t.cta ? `CTA: ${t.cta}` : ""].filter(Boolean).join("\n");
  return (
    <div className="rounded-ctl border border-rule p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold" dir="auto">
            {t.name}
          </p>
          <p className="text-concrete" dir="auto">
            {t.angle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Copy text={full} label="Copy script" />
          {done ? <span className="text-moss">Added to Content</span> : <Button onClick={make} busy={busy}>Make this ad</Button>}
        </div>
      </div>
      <p className="mt-2 text-ultra" dir="auto">
        {t.hook}
      </p>
      <p className="mt-1 whitespace-pre-wrap" dir="auto">
        {t.script}
      </p>
      <ErrorNote msg={err} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="text-concrete">{k}</dt>
      <dd dir="auto">{v}</dd>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm text-concrete">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((t, i) => (
          <li key={i} dir="auto">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
