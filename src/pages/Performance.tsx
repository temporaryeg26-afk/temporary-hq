import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote } from "../components/ui";
import { saveBrand } from "../lib/data";
import {
  ASSUMPTIONS, BUDGETS, CREATIVES, DASHBOARD, DECISIONS, EXTRA_METRICS, FUNNEL, MISSING, NEXT, PLAN_30, RISKS, SCORECARD, SOURCES, SUMMARY, TERMS, TRACKING, UE, UE_DEFAULT, unitMath, VERIFIED,
} from "../lib/performance";

const SECTIONS: [string, string][] = [
  ["summary", "1 · Summary"],
  ["assumptions", "2 · Facts & assumptions"],
  ["funnel", "3 · Funnel"],
  ["glossary", "4 · Glossary"],
  ["profit", "5 · Profit & break-even"],
  ["creative", "6 · Creative & testing"],
  ["budgets", "7 · Budgets"],
  ["plan", "8 · 30-day plan"],
  ["dashboard", "9 · Dashboard & tracking"],
  ["scorecard", "10 · Agency scorecard"],
  ["risks", "11 · Risks & missing data"],
  ["next", "12 · Next steps"],
];

const egp = (n: number | null | undefined) => (n == null || !isFinite(n) ? "—" : `EGP ${Math.round(n).toLocaleString("en-US")}`);

function H({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="wide scroll-mt-28 border-b border-rule pb-2 text-xl font-semibold">
      {children}
    </h2>
  );
}
function Src({ k }: { k: string }) {
  const s = SOURCES[k];
  return s ? (
    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-ultra">
      [{s.label}]
    </a>
  ) : null;
}

export default function PerformancePage() {
  const { brand, refresh } = useBrand();
  const saved = (brand.settings as any).unit_economics as UE | undefined;
  const [u, setU] = useState<UE>(() => ({ ...UE_DEFAULT, ...(saved ?? {}), rows: saved?.rows ?? UE_DEFAULT.rows }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>("A");

  const setNum = (k: keyof UE, v: string) => {
    setU({ ...u, [k]: Number(v) || 0 });
    setDirty(true);
  };
  const setCost = (i: number, v: string) => {
    const rows = u.rows.map((r, j) => (j === i ? { ...r, cost: v === "" ? null : Number(v) } : r));
    setU({ ...u, rows });
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await saveBrand(brand.id, { settings: { ...brand.settings, unit_economics: u } as any });
      await refresh();
      setDirty(false);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const sameAsPrice = u.rows.some((r) => r.cost != null && r.cost >= r.price);
  const missingCosts = u.rows.every((r) => r.cost == null);

  return (
    <div className="space-y-12">
      <header>
        <p className="text-sm text-concrete">
          What this is: the paid-growth and profit system for TEMPORARY™ — funnel, every metric with its formula, break-even, budgets, the 30-day plan and how to judge any agency (including us). PRIVATE: the prices, supplier costs and margins on this page are only for calculating profit and the most we can pay per customer. They never appear in posts, stories, ads or anything sent to ChatGPT.
        </p>
        <h1 className="wide mt-2 text-2xl font-semibold">Performance</h1>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} className="text-ultra">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section>
        <H id="summary">1 · Executive summary</H>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5">
          {SUMMARY.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-concrete">Brand-building (trust, follows, saves, the archive story) makes every later ad cheaper. Direct response (messages, orders) turns that trust into money. We run brand-building always, and direct response only around a drop and only when the unit economics are positive.</p>
      </section>

      <section>
        <H id="assumptions">2 · Brand & market: verified facts vs assumptions</H>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="rounded-panel border border-rule bg-soot p-4">
            <h3 className="font-semibold">Verified (with source)</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {VERIFIED.map((v) => <li key={v.fact}>{v.fact} <Src k={v.src} /></li>)}
            </ul>
          </div>
          <div className="rounded-panel border border-rule bg-soot p-4">
            <h3 className="font-semibold text-ochre">Assumptions (replace with our data)</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <p className="mt-3 text-xs text-concrete">CPM estimate: <Src k="adamigo" /></p>
          </div>
        </div>
      </section>

      <section>
        <H id="funnel">3 · Full funnel</H>
        <p className="mt-3 max-w-3xl text-sm text-concrete">Simplest viable structure for a new brand: organic does A–C every day; paid = one prospecting campaign from week 2 and one retargeting ad set once the warm audience passes ~1,000. Click a stage.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {FUNNEL.map((f) => (
            <button key={f.key} onClick={() => setOpen(f.key)} className={`rounded-panel border px-3 py-1.5 text-sm ${open === f.key ? "border-ink bg-ink text-white" : "border-rule"}`}>
              {f.key} · {f.name}
            </button>
          ))}
        </div>
        {FUNNEL.filter((f) => f.key === open).map((f) => (
          <dl key={f.key} className="mt-4 grid gap-3 rounded-panel border border-rule bg-soot p-4 text-sm md:grid-cols-2">
            {([["Objective", f.objective], ["Audience", f.audience], ["Campaign", f.campaign], ["Creative", f.creative], ["Message", f.message], ["Call to action", f.cta], ["Metrics", f.metrics], ["Tracking", f.tracking], ["Improve / stop when", f.decide]] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-concrete">{k}</dt>
                <dd dir="auto">{v}</dd>
              </div>
            ))}
          </dl>
        ))}
      </section>

      <section>
        <H id="glossary">4 · Glossary with worked examples</H>
        <div className="mt-4 space-y-3">
          {TERMS.map((t) => (
            <details key={t.key} className="rounded-panel border border-rule bg-soot p-4">
              <summary className="cursor-pointer font-semibold">
                {t.key}. {t.name} <span className="ml-2 text-xs font-normal text-concrete">{t.type}</span>
              </summary>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                {([["Meaning", t.meaning], ["Formula", t.formula], ["Example", t.example], ["How to measure", t.measure], ["Why it can be poor", t.poor], ["What to do", t.action], ...(t.sheet ? [["Google Sheets", t.sheet]] : [])] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-concrete">{k}</dt>
                    <dd dir="auto" className={k === "Google Sheets" || k === "Formula" ? "font-mono text-xs" : ""}>{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
        <h3 className="mt-8 font-semibold">Metrics that connect ads to profit</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-concrete">
              <tr><th className="py-2 pr-3">Metric</th><th className="pr-3">Meaning</th><th className="pr-3">Sheet formula</th><th>Kind</th></tr>
            </thead>
            <tbody>
              {EXTRA_METRICS.map(([n, m, f, k]) => (
                <tr key={n} className="border-t border-rule align-top">
                  <td className="py-2 pr-3 font-medium">{n}</td><td className="pr-3">{m}</td><td className="pr-3 font-mono text-xs">{f}</td>
                  <td className={k === "profit" ? "text-ochre" : "text-concrete"}>{k === "profit" ? "Affects profit" : "Diagnostic"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H id="profit">5 · Profitability & break-even</H>
        <p className="mt-3 max-w-3xl text-sm">Contribution per completed order = price − unit cost − embroidery − DTF − label − packaging − payment fee (prepaid share) − delivery we absorb − cost of refused COD parcels. Break-even ROAS = price ÷ contribution. Max CAC = contribution (spend more than that per order and you lose money).</p>
        {missingCosts && <p className="mt-3 rounded-panel border border-ochre p-3 text-sm text-ochre">Unit costs are empty. Type the supplier's price per piece for each product. Tick "Print/emb extra?" only if DTF + embroidery are charged on top. Until then break-even can't be calculated.</p>}
        {sameAsPrice && <p className="mt-3 rounded-panel border border-red-500 p-3 text-sm text-red-400">Warning: a unit cost is equal to or higher than its selling price — every sale of that product loses money. Fix pricing or the cost before any paid conversion campaign.</p>}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {([
            ["delivery_fee", "Delivery fee customer pays"], ["courier_cost", "Courier charges us"], ["embroidery", "Embroidery / piece"], ["dtf", "DTF print / piece"], ["label", "Label / piece"],
            ["packaging", "Packaging / piece"], ["pay_pct", "Payment fee %"], ["pay_fixed", "Payment fee fixed"], ["prepaid_share", "% orders paid online"], ["rto_rate", "% COD refused/failed"],
          ] as [keyof UE, string][]).map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-xs text-concrete">{label}</span>
              <input type="number" value={u[k] as number} onChange={(e) => setNum(k, e.target.value)} className="mt-1 w-full" />
            </label>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-concrete">
              <tr><th className="py-2 pr-3">Product</th><th className="pr-3">Price</th><th className="pr-3">Unit cost (supplier)</th><th className="pr-3">Extras</th><th className="pr-3">Print/emb extra?</th><th className="pr-3">Contribution / order</th><th className="pr-3">Break-even ROAS</th><th>Max CAC</th></tr>
            </thead>
            <tbody>
              {u.rows.map((r, i) => {
                const m = unitMath(u, r);
                return (
                  <tr key={r.name} className="border-t border-rule">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="pr-3">{egp(r.price)}</td>
                    <td className="pr-3"><input type="number" placeholder="?" value={r.cost ?? ""} onChange={(e) => setCost(i, e.target.value)} className="w-24" /></td>
                    <td className="pr-3">{egp(m.extras)}</td>
                    <td className="pr-3"><input type="checkbox" checked={r.emb || r.dtf} onChange={(e) => { const rows = u.rows.map((x, j) => (j === i ? { ...x, emb: e.target.checked, dtf: e.target.checked } : x)); setU({ ...u, rows }); setDirty(true); }} /></td>
                    <td className={`pr-3 ${m.contribution != null && m.contribution <= 0 ? "text-red-400" : ""}`}>{egp(m.contribution)}</td>
                    <td className="pr-3">{m.breakevenRoas ? m.breakevenRoas.toFixed(2) : m.contribution != null ? "never" : "—"}</td>
                    <td>{m.contribution != null ? egp(m.maxCac) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button kind="primary" busy={busy} disabled={!dirty} onClick={save}>{dirty ? "Save numbers" : "Saved"}</Button>
          <span className="text-xs text-concrete">Refused COD parcels are spread over completed orders (courier both ways + packaging). Prices from your price sheet (Oct 2026).</span>
        </div>
        <ErrorNote msg={err} />
      </section>

      <section>
        <H id="creative">6 · Audience & creative testing</H>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CREATIVES.map((c) => (
            <div key={c.name} className="rounded-panel border border-rule bg-soot p-4 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{c.name}</h3><span className="text-xs text-concrete">Stage {c.stage}</span>
              </div>
              <p dir="auto" className="mt-2 text-base">{c.hook}</p>
              <p className="mt-2">{c.message}</p>
              <p className="mt-1 text-concrete">Visual: {c.visual} · Copy: {c.copy}</p>
              <p className="mt-1">Audience: {c.audience} · CTA: {c.cta}</p>
              <p className="mt-1 text-ochre">KPI: {c.kpi}</p>
              <p className="mt-1 text-xs text-concrete">Hypothesis: {c.hypothesis}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-8 font-semibold">Decision rules</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {DECISIONS.map(([k, v]) => <li key={k}><b>{k}:</b> {v}</li>)}
        </ul>
      </section>

      <section>
        <H id="budgets">7 · Three monthly budget scenarios (hypothetical)</H>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {BUDGETS.map((b) => (
            <div key={b.name} className="rounded-panel border border-rule bg-soot p-4 text-sm">
              <h3 className="font-semibold">{b.name} · {egp(b.egp)}/month</h3>
              <p className="mt-2"><b>Split:</b> {b.split}</p>
              <p className="mt-1"><b>Objectives:</b> {b.objectives}</p>
              <p className="mt-1"><b>Testing:</b> {b.testing}</p>
              <p className="mt-1"><b>Needs:</b> {b.measure}</p>
              <p className="mt-1"><b>Risk:</b> {b.risk}</p>
              <p className="mt-1 text-ochre"><b>Increase when:</b> {b.up}</p>
              <p className="mt-1"><b>Reduce when:</b> {b.down}</p>
              <p className="mt-2 text-xs text-concrete">{b.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H id="plan">8 · Thirty-day execution plan</H>
        <div className="mt-4 space-y-3">
          {PLAN_30.map((w) => (
            <div key={w.week} className="rounded-panel border border-rule bg-soot p-4 text-sm">
              <h3 className="font-semibold">{w.week} — {w.focus}</h3>
              <p className="mt-1"><b>Setup:</b> {w.setup}</p>
              <p className="mt-1"><b>Creative:</b> {w.creative}</p>
              <p className="mt-1"><b>Measure:</b> {w.measure}</p>
              <p className="mt-1 text-ochre"><b>Gate:</b> {w.gate}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H id="dashboard">9 · Weekly dashboard & tracking</H>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-concrete"><tr><th className="py-2 pr-3">Column</th><th>Formula / source</th></tr></thead>
            <tbody>
              {DASHBOARD.map(([k, v]) => (
                <tr key={k} className="border-t border-rule"><td className="py-2 pr-3">{k}</td><td className="font-mono text-xs">{v}</td></tr>
              ))}
            </tbody>
          </table>
          <ul className="space-y-2 text-sm">
            {TRACKING.map((t) => <li key={t}>{t}</li>)}
            <li><Src k="capi" /></li>
          </ul>
        </div>
      </section>

      <section>
        <H id="scorecard">10 · Agency evaluation scorecard</H>
        <dl className="mt-4 space-y-3 text-sm">
          {SCORECARD.map(([k, v]) => (
            <div key={k}><dt className="font-semibold">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      <section>
        <H id="risks">11 · Risks, dependencies & missing data</H>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <ul className="list-disc space-y-2 pl-5 text-sm">{RISKS.map((r) => <li key={r}>{r}</li>)}</ul>
          <ul className="list-disc space-y-2 pl-5 text-sm text-ochre">{MISSING.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>

      <section>
        <H id="next">12 · Immediate next steps</H>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">{NEXT.map((n) => <li key={n}>{n}</li>)}</ol>
      </section>
    </div>
  );
}
