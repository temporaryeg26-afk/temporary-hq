import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, ErrorNote, PageHead, Panel, Text, useAsync } from "../components/ui";
import { applyLab, applyResearch } from "../lib/data";
import { labPack, researchPack } from "../lib/packs";
import { must, sb } from "../lib/supabase";
import type { Research } from "../lib/types";

const STRENGTH: Record<string, string> = { rising: "text-moss", peak: "text-ochre", fading: "text-brick", steady: "text-concrete" };

export default function ResearchPage() {
  const { brand, products } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const { data, error, reload } = useAsync(
    async () => must<Research[]>(await sb.from("research").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }).limit(60)),
    [brand.id]
  );

  const lab = data?.find((r) => r.kind === "lab");
  // latest scan per topic
  const scans: Research[] = [];
  for (const r of data ?? []) if (r.kind === "scan" && !scans.some((s) => s.topic === r.topic)) scans.push(r);

  return (
    <div>
      <PageHead
        title="Trend Radar"
        sub="ChatGPT searches the live internet, then the manager reads it, picks trends worth riding and invents new ones TEMPORARY™ can own. Every plan uses the latest analysis. Refresh it weekly."
      />
      <ErrorNote msg={error} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Relay
          to="chatgpt"
          title="1. Search the internet"
          why="ChatGPT researches 6 areas on the web: global streetwear, Egypt's scene, Instagram formats, upcoming Egyptian moments, how Egyptians buy online, and drop culture."
          tip="Make sure web search is on."
          makePack={() => researchPack(brand)}
          onAnswer={async (json) => {
            const n = await applyResearch(brand, json, "chatgpt");
            await reload();
            return `Saved ${n} research topics. Now step 2.`;
          }}
        />
        <Relay
          to={manager}
          title="2. Analyse and invent trends"
          why={`${aiName(manager)} (manager) reads the research and decides what to ride, what to avoid, and which original trends to start.`}
          makePack={() => {
            if (!scans.length) throw new Error("Do step 1 first.");
            return labPack(brand, products, scans);
          }}
          onAnswer={async (json) => {
            await applyLab(brand, json, manager);
            await reload();
            return "Saved. The next plan will use it.";
          }}
        />
      </div>

      {lab && <Lab row={lab} />}

      {scans.length > 0 && (
        <>
          <h2 className="wide mb-3 mt-10 font-semibold">What the research found</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {scans.map((r) => (
              <Panel key={r.id}>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-xs text-concrete">
                  {new Date(r.created_at).toLocaleDateString("en-GB")} · {aiName(r.made_by)}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">
                    <Text className="inline">{r.content?.summary ?? ""}</Text>
                  </summary>
                  <ul className="mt-3 space-y-3 text-sm">
                    {(r.content?.findings ?? []).map((f: any, i: number) => (
                      <li key={i}>
                        <span className={STRENGTH[f.strength] ?? "text-concrete"}>{f.strength} </span>
                        <span dir="auto">{f.insight}</span>
                        <p className="text-concrete" dir="auto">
                          {f.evidence}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {(r.content?.sources ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-rule pt-2 text-xs">
                      {r.content.sources.slice(0, 10).map((s: any, i: number) => (
                        <li key={i} className="truncate">
                          <a href={s.url} target="_blank" rel="noreferrer" className="text-ultra hover:underline">
                            {s.title || s.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Lab({ row }: { row: Research }) {
  const t = row.content ?? {};
  return (
    <div className="mt-10 space-y-5">
      <Panel>
        <p className="mb-2 text-xs text-concrete">
          Analysis by {aiName(row.made_by)} · {new Date(row.created_at).toLocaleDateString("en-GB")}
        </p>
        <Text className="max-w-3xl text-lg leading-relaxed">{t.big_picture ?? ""}</Text>
      </Panel>
      <div>
        <h2 className="wide mb-3 font-semibold">Trends we invent</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(t.invent ?? []).map((i: any, n: number) => (
            <Panel key={n} className="border-ultra/50">
              <h3 className="wide text-lg font-semibold" dir="auto">
                {i.name}
              </h3>
              <Text className="mt-2">{i.concept ?? ""}</Text>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["How people join in", i.mechanic],
                  ["Why it spreads", i.why_it_spreads],
                  ["First post", i.first_post],
                  ["Cadence", i.cadence],
                  ["Measure", i.measure],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-concrete">{k}</dt>
                    <dd dir="auto">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="wide mb-3 font-semibold">Trends to ride, our way</h2>
          <ul className="space-y-4">
            {(t.ride ?? []).map((r: any, n: number) => (
              <li key={n} dir="auto">
                <p className="font-medium">
                  {r.trend} <span className="text-sm text-concrete">· {r.format}</span>
                </p>
                <p className="text-sm text-concrete">Why now: {r.why_now}</p>
                <p className="text-sm">Our take: {r.our_take}</p>
                {r.risk && <p className="text-sm text-ochre">Risk: {r.risk}</p>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="wide mb-3 font-semibold">Coming up in Egypt</h2>
          <ul className="divide-y divide-rule">
            {(t.moments ?? []).map((m: any, n: number) => (
              <li key={n} className="grid grid-cols-[96px_1fr] gap-3 py-2 text-sm">
                <time className="text-concrete">{m.date}</time>
                <div dir="auto">
                  <p>{m.moment}</p>
                  <p className="text-concrete">{m.idea}</p>
                </div>
              </li>
            ))}
          </ul>
          {(t.avoid ?? []).length > 0 && (
            <>
              <h3 className="mb-2 mt-5 font-semibold">Avoid</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-concrete">
                {t.avoid.map((a: string, n: number) => (
                  <li key={n} dir="auto">
                    {a}
                  </li>
                ))}
              </ul>
            </>
          )}
          {t.pricing_and_buyer_notes && (
            <>
              <h3 className="mb-2 mt-5 font-semibold">Buyers & pricing</h3>
              <Text className="text-sm text-concrete">{t.pricing_and_buyer_notes}</Text>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
