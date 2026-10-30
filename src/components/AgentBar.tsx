import { useState } from "react";
import { useBrand } from "../App";
import { AGENTS, AgentKey, askPrompt, loadSnapshot, saveAdvice } from "../lib/agencyos";
import { Button, Copy, ErrorNote, Text, useAsync } from "./ui";

const AI = { claude: { name: "Claude", url: "https://claude.ai/new" }, chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" } };
const initials = (n: string) => n.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? "")).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** The employee of this tab: one tap to check in, one tap to ask for deeper thinking. */
export default function AgentBar({ agent, open: openAtStart = false }: { agent: AgentKey; open?: boolean }) {
  const { brand, products } = useBrand();
  const a = AGENTS[agent];
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id]);
  const [open, setOpen] = useState(openAtStart);
  const [asking, setAsking] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ai = AI[brand.settings?.manager === "chatgpt" ? "chatgpt" : "claude"];
  const s = snap.data;
  const b = s ? a.checkIn(s) : null;
  const last = s?.advice.find((x) => x.agent === agent);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await saveAdvice(brand.id, agent, q, answer);
      setAnswer("");
      setAsking(false);
      await snap.reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="mb-6 rounded-panel border border-ultra/40 bg-soot">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ultra/20 text-sm font-bold text-ultra">{initials(a.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{a.name}</p>
          <p className="truncate text-xs text-concrete">{b ? b.status : a.title}</p>
        </div>
        <Button kind={open ? "plain" : "primary"} onClick={() => { setOpen(!open); if (!open) snap.reload(); }}>
          {open ? "Close" : "Check in"}
        </Button>
        <Button onClick={() => { setAsking(!asking); setOpen(true); }}>Ask {a.name.replace(/^The /, "")}</Button>
      </div>

      {open && (
        <div className="border-t border-rule p-4 text-sm">
          {snap.loading && !s && <p className="text-concrete">Checking…</p>}
          <ErrorNote msg={snap.error} />
          {b && (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-moss">Going well</p>
                {b.good.length ? b.good.map((x, i) => <p key={i} className="mb-1">✓ {x}</p>) : <p className="text-concrete">—</p>}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-brick">Needs fixing</p>
                {b.wrong.length ? b.wrong.map((x, i) => <p key={i} className="mb-1">! {x}</p>) : <p className="text-concrete">Nothing urgent.</p>}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-ultra">Do next</p>
                {b.next.length ? b.next.map((x, i) => (x.href ? <a key={i} href={x.href} className="mb-1 block text-ultra hover:underline">{i + 1}. {x.text} →</a> : <p key={i} className="mb-1">{i + 1}. {x.text}</p>)) : <p className="text-concrete">—</p>}
              </div>
            </div>
          )}

          {last && !asking && (
            <details className="mt-4 rounded-ctl border border-rule p-3">
              <summary className="cursor-pointer text-xs text-concrete">Latest advice from {a.name} · {new Date(last.created_at).toLocaleDateString()}</summary>
              <Text className="mt-2 text-sm">{last.answer}</Text>
            </details>
          )}

          {asking && s && (
            <div className="mt-4 rounded-ctl border border-rule p-3">
              <p className="mb-2 text-xs text-concrete">1 · Write your question (or leave empty for "what should we do this week?") · 2 · Copy the brief and paste it in {ai.name} · 3 · Paste the answer back here.</p>
              <textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} className="w-full" placeholder={`Ask ${a.name} anything…`} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Copy text={askPrompt(agent, s, q)} label={`Copy brief for ${ai.name}`} />
                <a href={ai.url} target="_blank" rel="noreferrer" className="text-sm text-ultra hover:underline">Open {ai.name} ↗</a>
              </div>
              <textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-3 w-full" placeholder={`Paste ${ai.name}'s answer here`} />
              <div className="mt-2 flex gap-2">
                <Button kind="primary" busy={busy} disabled={!answer.trim()} onClick={save}>Save advice</Button>
                <Button kind="quiet" onClick={() => setAsking(false)}>Cancel</Button>
              </div>
              <ErrorNote msg={err} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
