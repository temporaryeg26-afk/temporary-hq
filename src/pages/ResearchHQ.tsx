import { useEffect, useMemo, useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, Copy, ErrorNote, Loading, useAsync } from "../components/ui";
import { asReport, loadResearch, saveBrand, saveReport } from "../lib/data";
import { DEFAULT_RESEARCH_QUERIES, deepResearchPrompt, RESEARCH_PLATFORMS, RESEARCH_SCOPES, reportPack } from "../lib/packs";
import type { Research, ResearchReport, ResearchType } from "../lib/types";

const DRAFT_KEY = "hq.researchDraft";
type Draft = { type: ResearchType; scope: string[]; topic: string; search: string; deep: string; running: boolean };
const EMPTY: Draft = { type: "full", scope: RESEARCH_SCOPES.map(([k]) => k), topic: "", search: "", deep: "", running: false };

function readDraft(): Draft {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    return s ? { ...EMPTY, ...JSON.parse(s) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const TYPES: [ResearchType, string, string][] = [
  ["full", "Full research", "Market, buyer, 60+ real complaints, trends, seasons. Do it once at the start and every 2–3 months."],
  ["quick", "Quick refresh", "What changed in the last 30 days: new trends and 20+ new complaints. Before each period."],
  ["custom", "Custom topic", "One question you want answered."],
];

export default function ResearchHQ() {
  const { brand, refresh } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const { data, error, reload } = useAsync(async () => (await loadResearch(brand.id)).filter((r) => r.kind === "report"), [brand.id]);
  const [d, setD] = useState<Draft>(readDraft);
  const [open, setOpen] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage blocked: draft just isn't remembered */
    }
  }, [d]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;

  const reports = data;
  const shown = reports.find((r) => r.id === open) ?? reports[0] ?? null;
  const prev = shown ? reports[reports.indexOf(shown) + 1] ?? null : null;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="wide text-2xl font-semibold">Research</h1>
          <p className="mt-1 max-w-2xl text-concrete">What this is: the Researcher's reports on the Egyptian market and real buyer complaints. The newest report feeds every plan, script and caption automatically.</p>
        </div>
        {!d.running && (
          <Button kind="primary" onClick={() => set({ running: true })}>
            Run research
          </Button>
        )}
      </header>

      {!reports.length && !d.running && (
        <div className="mb-6 rounded-panel border border-ochre/40 bg-soot p-4 text-sm">
          <span className="text-ochre">Needed from you: </span>no report yet. Press <b>Run research</b>, then tell Claude in Chrome: “Run the research playbook on the TEMP. HQ Research page — Full”.
        </div>
      )}

      {d.running && <Playbook d={d} set={set} manager={manager} brandQueries={brand.settings?.research_queries} last={reports[0] ?? null}
        onSaveQueries={async (q) => {
          await saveBrand(brand.id, { settings: { ...brand.settings, research_queries: q } });
          await refresh();
        }}
        onSaved={async (row) => {
          setD({ ...EMPTY, running: false });
          await reload();
          setOpen(row.id);
        }}
        onSave={async (json) => {
          const rep = asReport(json, d.type, d.scope, d.topic);
          return saveReport(brand, rep, manager);
        }}
      />}

      {reports.length > 0 && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <h2 className="mb-2 text-sm text-concrete">Reports</h2>
            <ul className="space-y-1">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setOpen(r.id);
                      setCompare(false);
                    }}
                    className={`w-full rounded-ctl px-3 py-2 text-left text-sm ${shown?.id === r.id ? "bg-rule text-plaster" : "text-concrete hover:text-plaster"}`}
                  >
                    <span className="block truncate" dir="auto">
                      {r.title}
                    </span>
                    <span className="text-xs text-concrete">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {shown && (
            <div className="min-w-0">
              {prev && (
                <div className="mb-4 flex justify-end">
                  <Button kind="quiet" onClick={() => setCompare(!compare)}>
                    {compare ? "Hide comparison" : "Compare with last report"}
                  </Button>
                </div>
              )}
              {compare && prev && <Compare now={shown.content} before={prev.content} beforeDate={prev.created_at} />}
              <ReportView r={shown} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ the playbook Claude in Chrome follows

function Playbook({
  d,
  set,
  manager,
  brandQueries,
  last,
  onSaveQueries,
  onSave,
  onSaved,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  manager: "claude" | "chatgpt";
  brandQueries?: string[];
  last: Research | null;
  onSaveQueries: (q: string[]) => Promise<void>;
  onSave: (json: any) => Promise<Research>;
  onSaved: (row: Research) => Promise<void>;
}) {
  const { brand } = useBrand();
  const queries = brandQueries?.length ? brandQueries : DEFAULT_RESEARCH_QUERIES;
  const [editQ, setEditQ] = useState(false);
  const [qText, setQText] = useState(queries.join("\n"));
  const target = d.type === "quick" ? 20 : d.type === "full" ? 60 : 10;
  const found = d.search.split("\n").filter((l) => l.trim()).length;
  const prompt = useMemo(() => deepResearchPrompt(d.type, d.scope.map((k) => RESEARCH_SCOPES.find(([x]) => x === k)?.[1] ?? k), d.topic), [d.type, d.scope, d.topic]);

  return (
    <section className="rounded-panel border border-ultra/40 bg-soot p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="wide text-lg font-semibold">Research playbook</h2>
          <p className="text-sm text-concrete">Claude in Chrome follows these steps. You can read along — nothing is posted, no one is messaged.</p>
        </div>
        <Button kind="quiet" onClick={() => set({ running: false })}>
          Close
        </Button>
      </div>

      {/* 0 · settings */}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {TYPES.map(([k, label, why]) => (
          <button key={k} onClick={() => set({ type: k })} className={`rounded-ctl border p-3 text-left ${d.type === k ? "border-ultra" : "border-rule hover:border-concrete"}`}>
            <span className="block font-medium">{label}</span>
            <span className="block text-xs text-concrete">{why}</span>
          </button>
        ))}
      </div>
      {d.type === "custom" && (
        <input className="mt-3" dir="auto" value={d.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. What do Egyptians expect from a 1,200 EGP hoodie?" />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {RESEARCH_SCOPES.map(([k, label]) => {
          const on = d.scope.includes(k);
          return (
            <button key={k} onClick={() => set({ scope: on ? d.scope.filter((x) => x !== k) : [...d.scope, k] })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-ultra text-plaster" : "border-rule text-concrete"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <ol className="mt-6 space-y-6">
        {/* 1 · search */}
        <Step n={1} title="Search and read real posts" who="Claude in Chrome">
          <p className="text-sm text-concrete">Read only — never log in, comment, post or message. Look on:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {RESEARCH_PLATFORMS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-concrete">Search queries</p>
            <button className="text-sm text-ultra hover:underline" onClick={() => setEditQ(!editQ)}>
              {editQ ? "Cancel" : "Edit queries"}
            </button>
          </div>
          {editQ ? (
            <div className="mt-2">
              <textarea rows={6} dir="auto" value={qText} onChange={(e) => setQText(e.target.value)} />
              <Button
                onClick={async () => {
                  await onSaveQueries(qText.split("\n").map((x) => x.trim()).filter(Boolean));
                  setEditQ(false);
                }}
              >
                Save queries
              </Button>
            </div>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {queries.map((q) => (
                <li key={q} className="flex items-center gap-2 rounded-ctl border border-rule px-2.5 py-1 text-sm">
                  <span dir="auto">{q}</span>
                  <a className="text-xs text-ultra" href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
                    Search
                  </a>
                  <Copy text={q} label="Copy" />
                </li>
              ))}
            </ul>
          )}
          <label className="mt-4 block" htmlFor="rsearch">
            Paste results — one complaint per line: quote | platform | theme | link
          </label>
          <textarea id="rsearch" dir="auto" rows={7} className="font-mono text-xs" value={d.search} onChange={(e) => set({ search: e.target.value })} placeholder="الطباعة اتقشرت بعد غسلتين | Facebook group | print cracking | https://..." />
          <p className={`mt-1 text-xs ${found >= target ? "text-moss" : "text-concrete"}`}>
            {found} of {target}+ complaints collected
          </p>
        </Step>

        {/* 2 · deep research */}
        <Step n={2} title="Deep research in ChatGPT" who="Claude in Chrome · ChatGPT">
          <pre dir="auto" className="max-h-56 overflow-auto whitespace-pre-wrap rounded-ctl border border-rule p-3 text-xs">
            {prompt}
          </pre>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Copy text={prompt} label="Copy prompt" />
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="text-sm text-ultra hover:underline">
              Open ChatGPT
            </a>
            <span className="text-xs text-concrete">Turn on deep research or web search.</span>
          </div>
          <label className="mt-4 block" htmlFor="rdeep">
            Paste ChatGPT's answer
          </label>
          <textarea id="rdeep" dir="auto" rows={7} className="text-xs" value={d.deep} onChange={(e) => set({ deep: e.target.value })} />
        </Step>

        {/* 3 · write the report */}
        <Step n={3} title="Director writes the report" who={aiName(manager)}>
          <Relay
            to={manager}
            title="Turn the notes into the report"
            why="The Director groups and counts the complaints, finds our gap, writes the 'Know before you pay' checklist and saves the report."
            makePack={() => {
              if (!d.search.trim() && !d.deep.trim()) throw new Error("Paste the results of step 1 or 2 first.");
              return reportPack(brand, d.type, d.scope, d.topic, d.search, d.deep, last);
            }}
            onAnswer={async (json) => {
              const row = await onSave(json);
              await onSaved(row);
              return "Report saved.";
            }}
          />
        </Step>
      </ol>
    </section>
  );
}

function Step({ n, title, who, children }: { n: number; title: string; who: string; children: React.ReactNode }) {
  return (
    <li className="grid gap-3 sm:grid-cols-[32px_1fr]">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-rule text-sm">{n}</span>
      <div className="min-w-0">
        <p className="font-semibold">
          {title} <span className="ml-2 rounded-full border border-rule px-2 py-0.5 text-xs font-normal text-concrete">{who}</span>
        </p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ report view

function ReportView({ r }: { r: Research }) {
  const t = r.content as ResearchReport;
  const [all, setAll] = useState(false);
  const complaints = all ? t.complaints : t.complaints.slice(0, 12);
  const max = Math.max(1, ...t.themes.map((x) => x.count));
  return (
    <article className="space-y-8">
      <header>
        <p className="text-xs text-concrete">
          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {t.type} · {t.complaints.length} real complaints · {t.sources.length} sources
        </p>
        <h2 className="wide mt-1 text-2xl font-semibold" dir="auto">
          {t.title}
        </h2>
      </header>

      <Sec title="Summary">
        <ol className="list-decimal space-y-1 pl-5">
          {t.summary.map((x, i) => (
            <li key={i} dir="auto">
              {x}
            </li>
          ))}
        </ol>
      </Sec>

      <Sec title="The buyer">
        <dl className="grid gap-3 sm:grid-cols-2">
          {([["Who", t.buyer.who], ["Age", t.buyer.age], ["Money", t.buyer.money], ["Where they hang out", t.buyer.hangouts]] as const).map(([k, v]) =>
            v ? (
              <div key={k} className="rounded-ctl border border-rule p-3">
                <dt className="text-xs text-concrete">{k}</dt>
                <dd dir="auto">{v}</dd>
              </div>
            ) : null,
          )}
        </dl>
        {t.buyer.fears.length > 0 && (
          <p className="mt-3 text-sm" dir="auto">
            <span className="text-concrete">Fears: </span>
            {t.buyer.fears.join(" · ")}
          </p>
        )}
      </Sec>

      <Sec title="Top complaints">
        <ul className="space-y-3">
          {[...t.themes].sort((a, b) => b.count - a.count).map((x) => (
            <li key={x.theme}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium" dir="auto">
                  {x.theme}
                </span>
                <span className="text-concrete">{x.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-rule">
                <div className="h-full rounded-full bg-ochre" style={{ width: `${(x.count / max) * 100}%` }} />
              </div>
              {x.what_people_say && (
                <p className="mt-1 text-sm text-concrete" dir="auto">
                  {x.what_people_say}
                </p>
              )}
              {x.what_we_do && (
                <p className="text-sm" dir="auto">
                  <span className="text-moss">Our answer: </span>
                  {x.what_we_do}
                </p>
              )}
            </li>
          ))}
        </ul>
        {t.complaints.length > 0 && (
          <>
            <h4 className="mt-6 text-sm text-concrete">Real quotes</h4>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {complaints.map((c, i) => (
                <li key={i} className="rounded-ctl border border-rule p-3 text-sm">
                  <p dir="auto">“{c.quote}”</p>
                  <p className="mt-1 text-xs text-concrete">
                    {c.platform} · {c.theme}
                    {c.link && (
                      <>
                        {" · "}
                        <a href={c.link} target="_blank" rel="noreferrer" className="text-ultra">
                          source
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            {t.complaints.length > 12 && (
              <button className="mt-2 text-sm text-ultra hover:underline" onClick={() => setAll(!all)}>
                {all ? "Show fewer" : `Show all ${t.complaints.length}`}
              </button>
            )}
          </>
        )}
      </Sec>

      {t.gap && (
        <Sec title="Our gap — what nobody owns">
          <p className="wide text-lg" dir="auto">
            {t.gap}
          </p>
        </Sec>
      )}

      {t.checklist.length > 0 && (
        <Sec title="Know before you pay — the checklist">
          <ol className="grid gap-3 md:grid-cols-2">
            {t.checklist.map((c, i) => (
              <li key={i} className="rounded-ctl border border-rule p-3 text-sm">
                <p className="font-semibold" dir="auto">
                  {i + 1}. {c.check}
                </p>
                <p className="mt-1" dir="auto">
                  {c.how_to_check}
                </p>
                {c.why && (
                  <p className="mt-1 text-concrete" dir="auto">
                    {c.why}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Sec>
      )}

      {(t.trends.length > 0 || t.seasons.length > 0) && (
        <Sec title="Trends & seasons">
          <div className="grid gap-5 md:grid-cols-2">
            <ul className="space-y-2 text-sm">
              {t.trends.map((x, i) => (
                <li key={i} dir="auto">
                  <b>{x.trend}</b> — <span className="text-concrete">{x.note}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 text-sm">
              {t.seasons.map((x, i) => (
                <li key={i} className="grid grid-cols-[90px_1fr] gap-2" dir="auto">
                  <span className="text-ochre">{x.when}</span>
                  <span>
                    {x.moment}
                    {x.idea && <span className="text-concrete"> → {x.idea}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Sec>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {t.ig_rules.length > 0 && (
          <Sec title="Instagram rules now">
            <List items={t.ig_rules} />
          </Sec>
        )}
        {t.risks.length > 0 && (
          <Sec title="Risks">
            <List items={t.risks} />
          </Sec>
        )}
      </div>

      {t.sources.length > 0 && (
        <Sec title="Sources">
          <ul className="space-y-1 text-sm">
            {t.sources.map((s, i) => (
              <li key={i} className="truncate">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-ultra hover:underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </Sec>
      )}
    </article>
  );
}

function Compare({ now, before, beforeDate }: { now: ResearchReport; before: ResearchReport; beforeDate: string }) {
  const names = [...new Set([...now.themes.map((t) => t.theme), ...before.themes.map((t) => t.theme)])];
  const was = (n: string) => before.themes.find((t) => t.theme === n)?.count ?? 0;
  const is = (n: string) => now.themes.find((t) => t.theme === n)?.count ?? 0;
  const newQuotes = now.complaints.filter((c) => !before.complaints.some((b) => b.quote === c.quote)).length;
  return (
    <div className="mb-8 rounded-panel border border-rule bg-soot p-4 text-sm">
      <p className="text-concrete">Compared with {new Date(beforeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {newQuotes} new quotes</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {names.map((n) => {
          const diff = is(n) - was(n);
          return (
            <li key={n} className="flex justify-between gap-3" dir="auto">
              <span>{n}</span>
              <span className={diff > 0 ? "text-ochre" : diff < 0 ? "text-moss" : "text-concrete"}>
                {was(n)} → {is(n)}
              </span>
            </li>
          );
        })}
      </ul>
      {now.gap !== before.gap && before.gap && (
        <p className="mt-3" dir="auto">
          <span className="text-concrete">Gap before: </span>
          {before.gap}
        </p>
      )}
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="wide mb-3 border-b border-rule pb-2 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((x, i) => (
        <li key={i} dir="auto">
          {x}
        </li>
      ))}
    </ul>
  );
}
