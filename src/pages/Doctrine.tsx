import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, ErrorNote, PageHead, Panel } from "../components/ui";
import { asDoctrine, latestLab, saveDoctrine } from "../lib/data";
import { currentLogin } from "../lib/github";
import { DOCTRINE_FIELDS, doctrinePack } from "../lib/packs";
import type { Doctrine } from "../lib/types";

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

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await saveDoctrine(brand, d, currentLogin());
      await refresh();
      setMsg("Saved. Every plan, script and review now includes the doctrine.");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div>
      <PageHead
        title="Doctrine"
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
