import { useState } from "react";
import { go, useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, ErrorNote, PageHead, Panel, Status, useAsync } from "../components/ui";
import { applySession, loadContent, loadPlans, loadSessions } from "../lib/data";
import { sessionPack } from "../lib/packs";
import type { Session } from "../lib/types";

/** Plan page reads these to pre-fill the goal and length after a session. */
export const PLAN_PREFILL_KEY = "hq.planPrefill";

function prefillPlan(goal: string, days: number) {
  try {
    localStorage.setItem(PLAN_PREFILL_KEY, JSON.stringify({ goal, days }));
  } catch {
    /* storage blocked — the owner can paste the goal by hand */
  }
}

const STEPS: { n: number; title: string; why: string; href: string }[] = [
  { n: 1, title: "Review the last period", why: "What worked, what didn't, what we learned. Done right here, below.", href: "/session" },
  { n: 2, title: "Check the doctrine", why: "Is the worldview still right? Sharpen it before planning.", href: "/doctrine" },
  { n: 3, title: "Research", why: "Quick refresh: new complaints and trends.", href: "/research" },
  { n: 4, title: "Plan the period", why: "The manager plans every piece. The goal from this session is pre-filled.", href: "/plan" },
  { n: 5, title: "Write & review", why: "ChatGPT writes the batch, the manager reviews it.", href: "/content" },
  { n: 6, title: "Make the visuals", why: "Founder film scenes, images, motion carousels. Your locked files go on top.", href: "/content" },
  { n: 7, title: "Approve & post", why: "You approve, post, and mark as posted.", href: "/content" },
];

export default function SessionPage() {
  const { brand } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const [days, setDays] = useState(14);
  const [notes, setNotes] = useState("");

  const { data, error, reload } = useAsync(async () => {
    const [sessions, items, plans] = await Promise.all([loadSessions(brand.id), loadContent(brand.id), loadPlans(brand.id)]);
    return { sessions, items, plans };
  }, [brand.id]);

  const last: Session | null = data?.sessions[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data?.items ?? []).filter((i) => i.scheduled_for >= today).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const counts = (s: string) => (data?.items ?? []).filter((i) => i.status === s).length;

  return (
    <div>
      <PageHead
        title="Session"
        sub="Every 1–2 weeks: review what happened, sharpen the doctrine, research, plan the next period and produce it. Follow the steps in order."
      />
      <ErrorNote msg={error} />

      <ol className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n}>
            <button onClick={() => go(s.href)} className="h-full w-full rounded-panel border border-rule bg-soot p-4 text-left hover:border-concrete">
              <span className="text-xs text-concrete">Step {s.n}</span>
              <span className="mt-1 block font-semibold">{s.title}</span>
              <span className="mt-1 block text-sm text-concrete">{s.why}</span>
            </button>
          </li>
        ))}
      </ol>

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-[1fr_160px]">
          <div>
            <label htmlFor="snotes">Results since last time (followers, DMs, orders, comments, what you noticed)</label>
            <textarea id="snotes" dir="auto" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. +420 followers, 31 DMs, 9 orders. The mask reel got shared a lot. Carousels were weak." />
          </div>
          <div>
            <label htmlFor="sdays">Next period</label>
            <select id="sdays" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-concrete">
          Right now: {counts("needs_you")} need you · {counts("brief")} waiting to be written · {counts("approved")} approved, not posted · {counts("published")} posted in total.
        </p>
      </Panel>

      <Relay
        to={manager}
        title={`Step 1 — Review with ${aiName(manager)}`}
        why="The manager reviews the period, checks we stayed true to the doctrine, proposes bold trend-starting bets and sets the goal for the next period."
        makePack={() => sessionPack(brand, data?.items ?? [], data?.plans ?? [], last, days, notes)}
        onAnswer={async (json) => {
          const s = await applySession(brand, json, manager, days, notes);
          prefillPlan(s.review?.next_goal ?? "", days);
          await reload();
          return "Session saved. Next: check the Doctrine, then Trend Radar, then Plan (the goal is pre-filled).";
        }}
      />

      {last?.review && (
        <Panel className="mt-6">
          <p className="text-xs text-concrete">
            Session of {new Date(last.created_at).toLocaleDateString("en-GB")} · {last.days} days · by {aiName(last.made_by)}
          </p>
          <h2 className="wide mt-1 text-xl font-semibold" dir="auto">
            {last.review.next_focus}
          </h2>
          <p className="mt-1 text-ochre" dir="auto">
            Goal: {last.review.next_goal}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <List title="Wins" items={last.review.wins} />
            <List title="Misses" items={last.review.misses} />
            <List title="Lessons" items={last.review.lessons} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <List title="Bold bets — trends we could start" items={last.review.bold_bets} />
            <div>
              <h3 className="text-sm text-concrete">Doctrine check</h3>
              <p className="mt-1 text-sm" dir="auto">
                {last.review.doctrine_check}
              </p>
            </div>
          </div>
          <button
            className="mt-5 text-sm text-ultra hover:underline"
            onClick={() => {
              prefillPlan(last.review?.next_goal ?? "", last.days);
              go("/plan");
            }}
          >
            Plan the next {last.days} days with this goal →
          </button>
        </Panel>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="wide mb-3 mt-8 font-semibold">Coming up</h2>
          <ul className="divide-y divide-rule rounded-panel border border-rule">
            {upcoming.slice(0, 28).map((i) => (
              <li key={i.id}>
                <a href={`#/content/${i.id}`} className="grid grid-cols-[64px_120px_1fr] items-center gap-3 px-4 py-2.5 text-sm hover:bg-soot sm:grid-cols-[80px_140px_1fr_auto]">
                  <time className="text-concrete">{i.scheduled_for?.slice(5)}</time>
                  <span className="text-concrete">{i.format.replace("_", " ")}</span>
                  <span dir="auto" className="truncate">
                    {i.title}
                  </span>
                  <span className="hidden sm:block">
                    <Status s={i.status} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {(data?.sessions.length ?? 0) > 1 && (
        <>
          <h2 className="wide mb-3 mt-8 font-semibold">Earlier sessions</h2>
          <ul className="space-y-2 text-sm">
            {data!.sessions.slice(1, 12).map((s) => (
              <li key={s.id} className="rounded-ctl border border-rule px-4 py-2.5" dir="auto">
                <span className="text-concrete">{s.created_at.slice(0, 10)} · {s.days} days — </span>
                {s.review?.next_focus}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
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
