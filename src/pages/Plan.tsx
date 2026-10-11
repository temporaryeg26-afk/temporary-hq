import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, ErrorNote, PageHead, Panel, Status, Text, useAsync } from "../components/ui";
import { applyPlan, latestLab, loadContent, loadPlans } from "../lib/data";
import { planPack } from "../lib/packs";

export default function PlanPage() {
  const { brand, products } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  const { data, error, reload } = useAsync(async () => {
    const [plans, items] = await Promise.all([loadPlans(brand.id), loadContent(brand.id)]);
    return { plans: plans.slice(0, 6), items };
  }, [brand.id]);

  const latest = data?.plans[0];

  return (
    <div>
      <PageHead title="Plan" sub="The manager sets the goal and direction from the brand bible, the catalogue and the latest Trend Radar." />
      <ErrorNote msg={error} />

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-[1fr_110px_170px]">
          <div>
            <label htmlFor="goal">What should this period achieve?</label>
            <textarea id="goal" dir="auto" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Launch Founder Drop 01 on 1 November, first 60 orders, Cairo first." />
          </div>
          <div>
            <label htmlFor="days">Days</label>
            <input id="days" type="number" min={7} max={45} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="start">Starting</label>
            <input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
        </div>
      </Panel>

      <Relay
        to={manager}
        title={`Make the plan with ${aiName(manager)}`}
        why="The manager writes the strategy and a short brief for every Reel, carousel, post and story set. ChatGPT writes them next, on the Content page."
        makePack={async () => planPack(brand, products, await latestLab(brand.id), goal, days, data?.plans ?? [])}
        onAnswer={async (json) => {
          const n = await applyPlan(brand, products, json, manager, start);
          await reload();
          return `Plan saved with ${n} pieces. Next: Content → write the first batch.`;
        }}
      />

      {latest && (
        <Panel className="mt-6">
          <p className="text-xs text-concrete">
            By {aiName(latest.made_by)} · {new Date(latest.created_at).toLocaleDateString("en-GB")}
          </p>
          <h2 className="wide mt-1 text-xl font-semibold" dir="auto">
            {latest.title}
          </h2>
          <p className="mt-1 text-ochre" dir="auto">
            {latest.goal}
          </p>
          <Text className="mt-3 max-w-3xl">{latest.data?.strategy ?? ""}</Text>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {(latest.data?.weeks ?? []).map((w) => (
              <div key={w.week} className="rounded-ctl border border-rule p-3">
                <p className="text-sm text-concrete">Week {w.week}</p>
                <p className="font-semibold" dir="auto">
                  {w.focus}
                </p>
                <p className="mt-1 text-sm text-concrete" dir="auto">
                  {w.notes}
                </p>
              </div>
            ))}
          </div>
          {(latest.data?.kpis ?? []).length > 0 && <p className="mt-4 text-sm text-concrete">Measured by: {latest.data.kpis.join(", ")}</p>}
        </Panel>
      )}

      {(data?.items.length ?? 0) > 0 && (
        <>
          <h2 className="wide mb-3 mt-8 font-semibold">Calendar</h2>
          <ul className="divide-y divide-rule rounded-panel border border-rule">
            {data!.items.map((i) => (
              <li key={i.id}>
                <a href={`#/content/${i.id}`} className="grid grid-cols-[64px_72px_1fr] items-center gap-3 px-4 py-2.5 text-sm hover:bg-soot sm:grid-cols-[80px_90px_1fr_auto]">
                  <time className="text-concrete">{i.scheduled_for?.slice(5)}</time>
                  <span className="capitalize text-concrete">{i.format}</span>
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
    </div>
  );
}
