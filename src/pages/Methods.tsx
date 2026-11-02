import { PageHead, Panel } from "../components/ui";
import { METHODS } from "../lib/methods";

/** How the best marketers make content — and exactly how TEMPORARY applies it. Every employee and the Council use this. */
export default function Methods() {
  return (
    <div>
      <PageHead title="Content methods" sub="Studied from Hormozi, GaryVee, Seth Godin, Neil Patel, Ahrefs, HubSpot, vidIQ, Think Media and Social Media Examiner. These rules are inside the week command, every employee and the 5-judge Council, and every piece shows a methods check." />
      <Panel className="mb-6">
        <p className="text-sm"><b>Every piece, in one line:</b> a hook with search words → one retention method → a payoff that matches the hook → alt text + cover → posted natively on Instagram, TikTok and Shorts → 20 minutes in the comments.</p>
        <p className="mt-2 text-sm text-concrete">Pillars: THE MATERIAL · THE DECISION · THE LIMIT · BUILDING THE DROP · THE CIRCLE. Before the reveal ~3 jabs (value/story) for every right hook (ask).</p>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {METHODS.map((m) => (
          <div key={m.who} className="rounded-panel border border-rule bg-soot p-4 text-sm">
            <p className="text-xs text-concrete">{m.area}</p>
            <p className="mt-1 font-semibold">{m.who}</p>
            <p className="mt-2">{m.method}</p>
            <ol className="mt-2 list-decimal space-y-0.5 pl-5" dir="auto">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p className="mt-2 text-moss" dir="auto">TEMPORARY: {m.temporary}</p>
            <a href={m.source} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-ultra hover:underline">{m.source}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
