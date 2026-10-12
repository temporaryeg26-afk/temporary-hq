import { useBrand } from "../App";
import { ErrorNote, Loading, useAsync } from "../components/ui";
import { activePeriod } from "../lib/data";
import { NEVER, ORGANIC, PAID_RULES, PAID_STEPS, PAID_UNLOCK_DAYS } from "../lib/playbooks";

export default function PlaybookPage() {
  const { brand } = useBrand();
  const { data, error, loading } = useAsync(() => activePeriod(brand.id), [brand.id]);
  if (error) return <ErrorNote msg={error} />;
  if (loading) return <Loading />;

  const start = data?.start ?? null;
  const day = start ? Math.floor((Date.now() - new Date(start + "T00:00:00").getTime()) / 86400000) + 1 : 0;
  const unlocked = Boolean(start) && day > PAID_UNLOCK_DAYS;
  const unlockDate = start ? new Date(new Date(start + "T12:00:00").getTime() + PAID_UNLOCK_DAYS * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

  return (
    <div className="space-y-12">
      <header>
        <p className="text-sm text-concrete">What this is: how we grow the account. You can read it; Claude in Chrome follows it step by step. Steps tagged YOU are yours — everything that spends money or needs a password.</p>
        <h1 className="wide mt-2 text-2xl font-semibold">Playbooks</h1>
        <nav className="mt-3 flex gap-4 text-sm">
          <a href="#organic" onClick={(e) => { e.preventDefault(); document.getElementById("organic")?.scrollIntoView({ behavior: "smooth" }); }} className="text-ultra">
            Organic
          </a>
          <a href="#paid" onClick={(e) => { e.preventDefault(); document.getElementById("paid")?.scrollIntoView({ behavior: "smooth" }); }} className="text-ultra">
            Media buying
          </a>
        </nav>
      </header>

      {/* ---------------- organic ---------------- */}
      <section id="organic">
        <h2 className="wide border-b border-rule pb-2 text-xl font-semibold">Organic playbook</h2>
        <p className="mt-3 max-w-3xl">{ORGANIC.why}</p>
        <p className="mt-2 text-sm text-ochre">{ORGANIC.week1}</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Card title="Hooks (first 1–3 seconds)" items={ORGANIC.hooks} />
          <Card title="Captions" items={ORGANIC.caption} />
          <div className="rounded-panel border border-rule bg-soot p-4">
            <h3 className="font-semibold">Best times (Cairo)</h3>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {ORGANIC.times.map(([k, v]) => (
                  <tr key={k} className="border-t border-rule">
                    <td className="py-1.5 text-concrete">{k}</td>
                    <td className="py-1.5 text-right">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="mt-4 font-semibold">Hashtags</h3>
            <p className="mt-1 text-sm" dir="auto">
              {ORGANIC.hashtags}
            </p>
          </div>
          <Card title="After posting — every time" items={ORGANIC.routine} />
        </div>
      </section>

      {/* ---------------- paid ---------------- */}
      <section id="paid">
        <h2 className="wide border-b border-rule pb-2 text-xl font-semibold">Media buying playbook</h2>
        <div className={`mt-4 rounded-panel border p-4 ${unlocked ? "border-moss/50 text-moss" : "border-ochre/50 text-ochre"}`}>
          {!start
            ? "Locked: start a period first. Paid ads unlock after 7 days of organic posting."
            : unlocked
            ? `Unlocked — day ${day} of the period. Only push posts organic has already proven.`
            : `Locked until ${unlockDate} (day ${day} of ${PAID_UNLOCK_DAYS} organic days). Read it now; Claude won't run these steps yet.`}
        </div>

        <ol className="mt-6 space-y-4">
          {PAID_STEPS.map((s, i) => (
            <li key={i} className={`rounded-panel border bg-soot p-4 ${unlocked ? "border-rule" : "border-rule opacity-80"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-rule text-sm">{i + 1}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${s.who === "YOU" ? "border-ochre/60 text-ochre" : "border-ultra/60 text-ultra"}`}>{s.who}</span>
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-12 text-sm">
                {s.how.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
              {s.done_when && <p className="mt-2 pl-10 text-xs text-concrete">Done when: {s.done_when}</p>}
            </li>
          ))}
        </ol>

        <h3 className="wide mt-8 font-semibold">Cut · keep · scale · fix</h3>
        <ul className="mt-3 divide-y divide-rule rounded-panel border border-rule bg-soot text-sm">
          {PAID_RULES.map((r, i) => (
            <li key={i} className="grid gap-1 p-3 md:grid-cols-[1fr_1fr]">
              <span className="text-concrete">If {r.if}</span>
              <span>{r.then}</span>
            </li>
          ))}
        </ul>

        <h3 className="wide mt-8 font-semibold">Never</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brick">
          {NEVER.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          The AI media buyer's plan for a specific budget and goal lives in{" "}
          <a href="#/ads" className="text-ultra hover:underline">
            Growth → Media buying
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-panel border border-rule bg-soot p-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
        {items.map((t, i) => (
          <li key={i} dir="auto">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
