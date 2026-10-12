import { go, useBrand } from "../App";
import { ErrorNote, Loading, useAsync } from "../components/ui";
import { TEAM, EmployeeId } from "../lib/agency";
import { loadAssets } from "../lib/assets";
import { loadContent, loadPlans, loadResearch, loadSessions, loadAds, loadPeriods, loadTasks } from "../lib/data";
import type { ContentItem } from "../lib/types";

type Need = { text: string; why?: string; action: string; href: string; tone: "act" | "info" };
type Work = { status: "idle" | "working" | "waiting_director" | "waiting_you" | "done"; task: string };

const STATUS_LABEL: Record<Work["status"], [string, string]> = {
  idle: ["Idle", "text-concrete border-rule"],
  working: ["Working", "text-ultra border-ultra/50"],
  waiting_director: ["Waiting for Director", "text-plaster border-plaster/40"],
  waiting_you: ["Waiting for you", "text-ochre border-ochre/60"],
  done: ["Done", "text-moss border-moss/60"],
};

const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export default function Home() {
  const { brand, products } = useBrand();
  const { data, error } = useAsync(async () => {
    const [items, assets, research, plans, sessions, ads, periods, tasks] = await Promise.all([
      loadContent(brand.id),
      loadAssets(brand.id),
      loadResearch(brand.id),
      loadPlans(brand.id),
      loadSessions(brand.id),
      loadAds(brand.id),
      loadPeriods(brand.id),
      loadTasks(brand.id),
    ]);
    const period = periods.find((p) => p.status === "active") ?? null;
    return { items, assets, research, plans, sessions, ads, period, tasks: period ? tasks.filter((t) => t.period_id === period.id) : [] };
  }, [brand.id]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;

  const today = new Date().toISOString().slice(0, 10);
  const items = data.items.filter((i) => i.status !== "rejected");
  const by = (f: (i: ContentItem) => boolean) => items.filter(f);
  const has = (k: string) => data.assets.some((a) => a.kind === k);
  const report = data.research.find((r) => r.kind === "report") ?? null;

  // ---------------------------------------------------------------- what's needed from you
  const needs: Need[] = [];
  const postToday = by((i) => i.status === "approved" && i.scheduled_for <= today);
  if (postToday.length) needs.push({ text: `Post ${postToday.length} approved ${postToday.length === 1 ? "piece" : "pieces"} today`, action: "Post now", href: "/week", tone: "act" });
  const toApprove = by((i) => i.status === "needs_you");
  const P = data.period;
  if (!P) needs.push({ text: "Start a period", why: "Pick the length and goal — the Director builds the roadmap from it.", action: "New period", href: "/period/new", tone: "act" });
  else if (!P.phases.length) needs.push({ text: `Build the roadmap for "${P.name}"`, action: "Open roadmap", href: "/period", tone: "act" });
  for (const n of P?.needs ?? []) needs.push({ text: n, action: "Give info", href: "/period", tone: "info" });
  const taskNeeds = data.tasks.filter((t) => t.status === "needs_you");
  if (taskNeeds.length) needs.push({ text: `${taskNeeds.length} team ${taskNeeds.length === 1 ? "task needs" : "tasks need"} you`, action: "Open", href: "/period", tone: "act" });
  if (toApprove.length) needs.push({ text: `Approve ${toApprove.length} ${toApprove.length === 1 ? "piece" : "pieces"} the Director passed`, action: "Approve", href: "/approve", tone: "act" });
  if (!report) needs.push({ text: "Run the first market research", why: "Everything the team makes is built on it.", action: "Open research", href: "/research", tone: "act" });
  else if (days(report.created_at) > 14) needs.push({ text: `Research is ${days(report.created_at)} days old — run a quick refresh`, action: "Open research", href: "/research", tone: "info" });
  if (!brand.doctrine?.updated_at) needs.push({ text: "Read and save the brand book (doctrine)", why: "Every script and caption follows it.", action: "Edit", href: "/doctrine", tone: "act" });
  for (const [k, label] of [["logo", "logo"], ["mask", "founder mask"], ["product_photo", "product photos"]] as const)
    if (!has(k)) needs.push({ text: `Upload the ${label}`, action: "Upload", href: "/assets", tone: "act" });
  const noPrice = products.filter((p) => !p.price_confirmed);
  if (noPrice.length) needs.push({ text: `Confirm prices for ${noPrice.length} ${noPrice.length === 1 ? "product" : "products"}`, why: "Needed before any launch content.", action: "Give info", href: "/products", tone: "info" });
  if (!brand.order_form_url) needs.push({ text: "Add the order link (Google Form)", action: "Give info", href: "/brands", tone: "info" });

  // ---------------------------------------------------------------- team board
  const needsVisual = (f: string[]) => by((i) => f.includes(i.format) && (i.status === "needs_you" || i.status === "approved"));
  const count = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const work: Record<EmployeeId, Work> = {
    director: by((i) => i.status === "in_review").length
      ? { status: "working", task: `Reviewing ${count(by((i) => i.status === "in_review").length, "draft")}` }
      : toApprove.length
      ? { status: "waiting_you", task: `Passed ${count(toApprove.length, "piece")} to you` }
      : { status: "idle", task: "Ready for the next period" },
    researcher: report
      ? { status: "done", task: `Last report ${days(report.created_at) === 0 ? "today" : `${days(report.created_at)} days ago`}` }
      : { status: "waiting_you", task: "Waiting for you to press Run research" },
    strategist: brand.doctrine?.updated_at
      ? { status: "done", task: data.plans[0] ? `Plan: ${data.plans[0].title}` : "Brand book saved" }
      : { status: "waiting_you", task: "Brand book drafted — waiting for your edits" },
    copywriter: by((i) => i.status === "brief").length
      ? { status: "working", task: `${count(by((i) => i.status === "brief").length, "piece")} to write` }
      : { status: "idle", task: "Nothing to write" },
    film: needsVisual(["founder_video", "reel"]).length
      ? { status: "working", task: `${count(needsVisual(["founder_video", "reel"]).length, "film")} in production` }
      : { status: "idle", task: by((i) => i.format === "founder_video").length ? "Scripts written" : "No founder film planned yet" },
    motion: needsVisual(["motion_carousel"]).length
      ? { status: "working", task: `${count(needsVisual(["motion_carousel"]).length, "carousel")} to animate` }
      : { status: "idle", task: "No carousel waiting" },
    designer: needsVisual(["static", "carousel", "story"]).length
      ? { status: "working", task: `${count(needsVisual(["static", "carousel", "story"]).length, "visual")} to make` }
      : { status: "idle", task: "No visuals waiting" },
    community: { status: "idle", task: "Ready for DMs, comments and order cards" },
    growth: data.ads[0] ? { status: "done", task: `Last ${data.ads[0].kind === "plan" ? "ad plan" : "review"} ${days(data.ads[0].created_at)} days ago` } : { status: "idle", task: "Organic first — ads unlock after week 1" },
  };

  // tasks override the guesses above
  for (const e of TEAM) {
    const mine = data.tasks.filter((t) => t.employee === e.id);
    if (!mine.length) continue;
    const open = mine.filter((t) => t.status !== "done");
    const pick = open.find((t) => t.status === "needs_you") ?? open.find((t) => t.status === "review") ?? open.find((t) => t.status === "working") ?? open.sort((a, b) => a.due.localeCompare(b.due))[0];
    work[e.id] = !pick
      ? { status: "done", task: `All ${mine.length} tasks done` }
      : {
          status: pick.status === "needs_you" ? "waiting_you" : pick.status === "review" ? "waiting_director" : pick.status === "working" ? "working" : "idle",
          task: `${pick.title} · ${open.length} open`,
        };
  }

  // ---------------------------------------------------------------- current period
  const s = P ? null : data.sessions[0];
  const plan = P ? null : data.plans[0];
  const start = P?.start ?? s?.period_start ?? (plan ? plan.created_at.slice(0, 10) : null);
  const len = P ? Math.round((new Date(P.end).getTime() - new Date(P.start).getTime()) / 86400000) : s?.days ?? (plan ? Math.max(7, (plan.data.weeks?.length ?? 1) * 7) : 0);
  const elapsed = start ? Math.min(len, Math.max(0, days(start))) : 0;
  const end = start ? new Date(new Date(start + "T12:00:00").getTime() + len * 86400000).toISOString().slice(0, 10) : null;
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm text-concrete">What this is: your agency at a glance — what needs you, what the team is doing, and where the period stands.</p>
      </header>

      {/* Needed from you */}
      <section className="mb-10">
        <h2 className="wide mb-3 text-xl font-semibold">
          Needed from you <span className="text-concrete">· {needs.length}</span>
        </h2>
        {needs.length === 0 ? (
          <p className="rounded-panel border border-moss/40 bg-soot p-5 text-moss">Nothing right now. The team is on it.</p>
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-panel border border-rule bg-soot">
            {needs.map((n) => (
              <li key={n.text} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.tone === "act" ? "bg-ochre" : "bg-concrete"}`} />
                  <div>
                    <p className="font-medium">{n.text}</p>
                    {n.why && <p className="text-sm text-concrete">{n.why}</p>}
                  </div>
                </div>
                <button onClick={() => go(n.href)} className={`rounded-ctl px-3.5 py-2 text-sm font-medium ${n.tone === "act" ? "bg-ultra text-white hover:bg-[#5d6cff]" : "border border-rule hover:border-concrete"}`}>
                  {n.action}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Current period */}
      <section className="mb-10 rounded-panel border border-rule bg-soot p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-concrete">Current period</p>
            {start && end ? (
              <>
                <p className="wide mt-1 text-lg font-semibold" dir="auto">
                  {P?.name || s?.review?.next_focus || plan?.title || "Current plan"}
                </p>
                <p className="text-sm text-concrete">
                  {fmt(start)} → {fmt(end)} · {len} days
                </p>
                {(P?.goal || s?.review?.next_goal || plan?.goal) && (
                  <p className="mt-2 max-w-2xl text-sm" dir="auto">
                    <span className="text-concrete">Goal: </span>
                    {P?.goal || s?.review?.next_goal || plan?.goal}
                  </p>
                )}
              </>
            ) : (
              <p className="wide mt-1 text-lg font-semibold">No period running</p>
            )}
          </div>
          <button onClick={() => go(P ? "/period" : "/period/new")} className="rounded-ctl bg-ultra px-4 py-2 text-sm font-medium text-white hover:bg-[#5d6cff]">
            {P ? "Open roadmap" : "New period"}
          </button>
        </div>
        {start && (
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-ultra" style={{ width: `${Math.round((elapsed / Math.max(1, len)) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-concrete">
              Day {elapsed} of {len} · {items.filter((i) => i.status === "published").length} posted · {items.filter((i) => i.scheduled_for >= today && i.status !== "published").length} coming up
            </p>
          </div>
        )}
      </section>

      {/* Team board */}
      <section>
        <h2 className="wide mb-3 text-xl font-semibold">The team</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM.map((e) => {
            const w = work[e.id];
            const [label, cls] = STATUS_LABEL[w.status];
            return (
              <article key={e.id} className={`rounded-panel border bg-soot p-4 ${e.id === "director" ? "border-ultra/50 sm:col-span-2 xl:col-span-3" : "border-rule"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-xs text-concrete">{e.runsOn}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>
                </div>
                <p className="mt-3 text-sm" dir="auto">
                  {w.task}
                </p>
                <p className="mt-1 text-xs text-concrete">{e.job}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
