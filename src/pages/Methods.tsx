import { Copy, PageHead, Panel } from "../components/ui";
import { METHODS, VIDEO_PLACEMENT, VIDEO_STYLES, VIDEO_WEEK } from "../lib/methods";

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

      <h2 className="wide mb-2 mt-10 text-xl font-semibold">Product video playbook</h2>
      <p className="mb-4 text-sm text-concrete">19 shot styles (rebuilt from the Fash Studio examples, 2 Nov 2026). 9:16 · 5–10 s · silent, loops · one model, one outfit · one action + one camera move. For TEMPORARY they are camera directions for REAL footage; AI product video only if you allow it for a piece (then check print, logo and fabric frame by frame, AI label on).</p>
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-concrete"><th className="py-1 pr-3">Placement</th><th className="pr-3">Styles</th><th>Why</th></tr></thead>
          <tbody>{VIDEO_PLACEMENT.map(([a, b, c]) => <tr key={a} className="border-t border-rule"><td className="py-1 pr-3">{a}</td><td className="pr-3">{b}</td><td className="text-concrete">{c}</td></tr>)}</tbody>
        </table>
      </div>
      <Panel className="mb-6">
        <p className="mb-1 text-sm font-semibold">One product, one week</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm">{VIDEO_WEEK.map((d) => <li key={d}>{d}</li>)}</ol>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        {VIDEO_STYLES.map((v) => (
          <div key={v.n} className="rounded-panel border border-rule bg-soot p-4 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{v.n}. {v.name}</p>
              <span className="text-xs text-concrete">{v.family} · {v.seconds} s</span>
            </div>
            <p className="mt-1 text-concrete">Best for: {v.best}</p>
            <p className="mt-2 rounded-ctl border border-rule p-2 text-xs">{v.prompt}</p>
            <div className="mt-2"><Copy text={v.prompt} label="Copy prompt" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
