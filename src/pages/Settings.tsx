import { useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { latestLab } from "../lib/data";
import { knowledgeFile } from "../lib/packs";
import { must, sb } from "../lib/supabase";
import type { BrandSettings, ContentItem, Pillar, Plan } from "../lib/types";

const PILLARS: [Pillar, string][] = [
  ["discovery", "Discovery posts"],
  ["philosophy", "Philosophy & founder posts"],
  ["community", "Community posts"],
  ["product", "Product posts"],
  ["conversion", "Conversion posts"],
];

export default function SettingsPage() {
  const { brand, products, refresh } = useBrand();
  const [s, setS] = useState<BrandSettings>({ manager: "claude", batchSize: 5, autoApprove: {}, ...brand.settings });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const team = useAsync(async () => must<{ email: string }[]>(await sb.from("team_members").select("email")), []);
  const knowledge = useAsync(async () => {
    const [plan, lab, approved] = await Promise.all([
      sb.from("plans").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      latestLab(brand.id),
      sb.from("content_items").select("*").eq("brand_id", brand.id).in("status", ["approved", "published"]).order("scheduled_for", { ascending: false }).limit(30),
    ]);
    return knowledgeFile(brand, products, (plan.data as Plan) ?? null, lab, must<ContentItem[]>(approved));
  }, [brand.id]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    const r = await sb.from("brands").update({ settings: s }).eq("id", brand.id);
    if (r.error) setErr(r.error.message);
    else {
      await refresh();
      setMsg("Saved.");
    }
    setBusy(false);
  };

  const download = () => {
    if (!knowledge.data) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([knowledge.data], { type: "text/markdown" }));
    a.download = `${brand.slug}-knowledge.md`;
    a.click();
  };

  return (
    <div>
      <PageHead title="Settings" sub="Who does what for this brand.">
        <Button kind="primary" onClick={save} busy={busy}>
          Save settings
        </Button>
      </PageHead>
      <ErrorNote msg={err} />
      {msg && <p className="mb-4 text-sm text-moss">{msg}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-5">
          <h2 className="wide font-semibold">The team</h2>
          <div>
            <p className="mb-2 text-sm text-concrete">Manager packs (plan, trend analysis, final review) go to</p>
            <div className="flex gap-2" role="radiogroup">
              {(["claude", "chatgpt"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={s.manager === m}
                  onClick={() => setS({ ...s, manager: m })}
                  className={`rounded-ctl border px-3 py-1.5 text-sm ${s.manager === m ? "border-ultra bg-ultra/15" : "border-rule text-concrete"}`}
                >
                  {m === "claude" ? "Claude (normal)" : "ChatGPT (when Claude is at its limit)"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="bs">Pieces ChatGPT writes per paste</label>
            <input id="bs" type="number" min={1} max={10} value={s.batchSize ?? 5} onChange={(e) => setS({ ...s, batchSize: Number(e.target.value) })} />
            <p className="mt-1 text-xs text-concrete">5 is a good balance. Lower it if ChatGPT's answers get cut off.</p>
          </div>
          <div>
            <p className="mb-2 text-sm text-concrete">Skip my approval when the manager approves and no rule is flagged</p>
            {PILLARS.map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-plaster">
                <input type="checkbox" checked={Boolean(s.autoApprove?.[k])} onChange={(e) => setS({ ...s, autoApprove: { ...s.autoApprove, [k]: e.target.checked } })} />
                {l}
              </label>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <h2 className="wide font-semibold">Chat with the team</h2>
          <p className="text-sm text-concrete">
            Make a Project in Claude and one in ChatGPT called “TEMPORARY™ HQ”, and add this file to each as project knowledge. Then every chat there knows the brand, products, current plan and
            latest trends. Re-upload it after each new plan or trend analysis.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button kind="primary" onClick={download} disabled={!knowledge.data}>
              Download knowledge file
            </Button>
            {knowledge.data && <Copy text={knowledge.data} label="Copy it instead" />}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a className="text-ultra" href="https://claude.ai/projects" target="_blank" rel="noreferrer">
              Claude Projects
            </a>
            <a className="text-ultra" href="https://chatgpt.com/" target="_blank" rel="noreferrer">
              ChatGPT (Projects in the sidebar)
            </a>
          </div>

          <h2 className="wide pt-4 font-semibold">Who can open HQ</h2>
          <ul className="text-sm">
            {(team.data ?? []).map((t) => (
              <li key={t.email}>{t.email}</li>
            ))}
          </ul>
          <p className="text-xs text-concrete">The lock lives in the database. To change it, edit the team_members table in Supabase (SETUP.md, “Changing who has access”).</p>
        </Panel>
      </div>
    </div>
  );
}
