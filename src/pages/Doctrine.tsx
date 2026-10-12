import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { asDoctrine, latestLab, loadResearch, saveDoctrine } from "../lib/data";
import { currentLogin } from "../lib/github";
import { DOCTRINE_FIELDS, doctrinePack } from "../lib/packs";
import type { Doctrine, ResearchReport } from "../lib/types";

const EMPTY = Object.fromEntries(DOCTRINE_FIELDS.map(([k]) => [k, ""])) as Doctrine;

export default function DoctrinePage() {
  const { brand, products, refresh } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const [d, setD] = useState<Doctrine>({ ...EMPTY, ...(brand.doctrine ?? {}) });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [mode, setMode] = useState<"read" | "edit">(brand.doctrine?.updated_at ? "read" : "edit");
  const report = useAsync(async () => (await loadResearch(brand.id)).find((r) => r.kind === "report") ?? null, [brand.id]);
  const gap = (report.data?.content as ResearchReport | undefined)?.gap ?? "";

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await saveDoctrine(brand, d, currentLogin());
      await refresh();
      setMsg("Saved. Every plan, script and review now includes the brand book.");
      setMode("read");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  if (mode === "read")
    return (
      <div>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-concrete">What this is: the brand book — what TEMPORARY™ believes, who it's for and how it speaks. Every plan, script and caption follows it.</p>
            <h1 className="wide mt-2 text-2xl font-semibold">Brand book</h1>
            {brand.doctrine?.updated_at && <p className="text-sm text-concrete">Last saved {new Date(brand.doctrine.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>}
          </div>
          <Button onClick={() => setMode("edit")}>Edit brand book</Button>
        </header>

        <section className="mb-8 rounded-panel border border-ultra/40 bg-soot p-5">
          <p className="text-xs uppercase tracking-widest text-concrete">Positioning</p>
          <p className="wide mt-2 text-lg leading-relaxed" dir="auto">
            For {d.for_who || "…"} — who are tired of {d.enemy || "…"} — TEMPORARY™ {d.promise || "…"}
          </p>
          {gap && (
            <p className="mt-3 text-sm" dir="auto">
              <span className="text-concrete">Our gap in the market (from research): </span>
              {gap}
            </p>
          )}
        </section>

        {d.manifesto && (
          <blockquote className="mb-8 border-l-2 border-ultra pl-5 text-xl leading-relaxed" dir="auto">
            {d.manifesto}
          </blockquote>
        )}
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {DOCTRINE_FIELDS.filter(([k]) => k !== "manifesto" && (d[k] as string)?.trim()).map(([k, label]) => (
            <section key={k}>
              <h2 className="text-xs uppercase tracking-widest text-concrete">{label}</h2>
              <p className="mt-1 whitespace-pre-wrap" dir="auto">
                {d[k] as string}
              </p>
            </section>
          ))}
        </div>
      </div>
    );

  return (
    <div>
      {brand.doctrine?.updated_at && (
        <button className="mb-4 text-sm text-concrete hover:text-plaster" onClick={() => setMode("read")}>
          ← Read the brand book
        </button>
      )}
      <PageHead
        title="Brand book · edit"
        sub="The worldview that makes people follow the idea first and buy the clothes second. It is sent with every plan, script and review, so everything the team makes speaks the same language."
      >
        <Button kind="primary" onClick={save} busy={busy}>
          Save doctrine
        </Button>
      </PageHead>
      <ErrorNote msg={err} />
      {msg && <p className="mb-4 text-sm text-moss">{msg}</p>}

      <Panel className="mb-6">
        <label htmlFor="dnotes">Your thoughts for the strategist (optional)</label>
        <textarea id="dnotes" dir="auto" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do you believe? What do you hate about fashion now? What should people feel when they wear TEMPORARY™?" />
      </Panel>

      <Relay
        to={manager}
        title={`${brand.doctrine?.belief ? "Sharpen" : "Build"} the doctrine with ${aiName(manager)}`}
        why="The strategist writes (or improves) every field below from your brand bible, catalogue, research and notes. You review and edit, then save."
        makePack={async () => doctrinePack(brand, products, await latestLab(brand.id), notes)}
        onAnswer={async (json) => {
          const next = asDoctrine(json);
          setD(next);
          setIdeas(Array.isArray(json.first_posts) ? json.first_posts.map(String) : []);
          return "Draft loaded below. Read it, edit anything, then press Save doctrine.";
        }}
      />

      {ideas.length > 0 && (
        <Panel className="mt-6">
          <h3 className="wide font-semibold">First posts to introduce it</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {ideas.map((t, i) => (
              <li key={i} dir="auto">
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {DOCTRINE_FIELDS.map(([k, label, hint]) => (
          <Panel key={k}>
            <label htmlFor={`d-${k}`} className="font-semibold">
              {label}
            </label>
            <p className="mb-2 text-xs text-concrete">{hint}</p>
            <textarea id={`d-${k}`} dir="auto" rows={k === "manifesto" ? 6 : 3} value={(d[k] as string) ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
          </Panel>
        ))}
      </div>

      <div className="mt-6">
        <Button kind="primary" onClick={save} busy={busy}>
          Save doctrine
        </Button>
        {brand.doctrine?.updated_at && <span className="ml-3 text-sm text-concrete">Last saved {new Date(brand.doctrine.updated_at).toLocaleString("en-GB")}</span>}
      </div>
    </div>
  );
}
