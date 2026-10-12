import { Copy } from "../components/ui";
import { BEFORE, ROUTINES, RULES, START_PROMPT, WAIT_RULE } from "../lib/runsheet";
import { DIRECTOR_CHECKLIST, TEAM } from "../lib/agency";

/** The operating manual Claude in Chrome follows. The owner only copies the short prompt at the top. */
export default function RunGuide() {
  return (
    <div className="max-w-4xl space-y-10">
      <header>
        <p className="text-sm text-concrete">What this is: how the agency runs. You copy one short prompt into Claude in Chrome; Claude opens this page and follows it.</p>
        <h1 className="wide mt-2 text-2xl font-semibold">Run guide</h1>
      </header>

      <section className="rounded-panel border border-ultra/50 bg-soot p-5">
        <h2 className="font-semibold">1 · Copy this into Claude in Chrome</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-ctl border border-rule p-3 text-sm">{START_PROMPT}</pre>
        <div className="mt-2 flex items-center gap-4">
          <Copy text={START_PROMPT} label="Copy prompt" />
          <span className="text-xs text-concrete">Replace the last line with what you want.</span>
        </div>
      </section>

      <section>
        <h2 className="wide border-b border-rule pb-2 text-lg font-semibold">Before anything</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          {BEFORE.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
        <p className="mt-3 rounded-ctl border border-ochre/50 p-3 text-sm text-ochre">{WAIT_RULE}</p>
      </section>

      <section>
        <h2 className="wide border-b border-rule pb-2 text-lg font-semibold">Routines</h2>
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          {ROUTINES.map((r) => (
            <button key={r.key} onClick={() => document.getElementById(`r-${r.key}`)?.scrollIntoView({ behavior: "smooth" })} className="rounded-full border border-rule px-3 py-1 text-concrete hover:text-plaster">
              {r.title}
            </button>
          ))}
        </nav>
        <div className="mt-5 space-y-4">
          {ROUTINES.map((r) => (
            <article key={r.key} id={`r-${r.key}`} className="rounded-panel border border-rule bg-soot p-4">
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-xs text-concrete">When: {r.when}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {r.steps.map((s, i) => (
                  <li key={i} dir="auto">
                    {s}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="wide border-b border-rule pb-2 text-lg font-semibold">The team</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {TEAM.map((e) => (
              <li key={e.id}>
                <b>{e.name}</b> <span className="text-concrete">· {e.runsOn}</span>
                <br />
                <span className="text-concrete">{e.job}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="wide border-b border-rule pb-2 text-lg font-semibold">Director checklist</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {DIRECTOR_CHECKLIST.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <h2 className="wide mt-6 border-b border-rule pb-2 text-lg font-semibold">Always</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brick">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
