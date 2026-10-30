import { useEffect, useRef, useState } from "react";
import { useBrand } from "../App";
import { AGENTS, AgentKey, chatPrompt, ideasOf, loadSnapshot, pitch, PitchDraft, saveReply } from "../lib/agencyos";
import { Button, ErrorNote, Text, useAsync } from "./ui";

const AI = { claude: { name: "Claude", url: "https://claude.ai/new" }, chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" } };
const initials = (n: string) => n.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? "")).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** The employee of this tab: check in (briefing + his own ideas for the Director) and chat with him. */
export default function AgentBar({ agent, open: openAtStart = false }: { agent: AgentKey; open?: boolean }) {
  const { brand, products } = useBrand();
  const a = AGENTS[agent];
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id]);
  const [open, setOpen] = useState(openAtStart);
  const [chat, setChat] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const ai = AI[brand.settings?.manager === "chatgpt" ? "chatgpt" : "claude"];
  const s = snap.data;
  const b = s ? a.checkIn(s) : null;
  const ideas = s ? ideasOf(agent, s) : [];
  const thread = (s?.chat ?? []).filter((m) => m.agent === agent).slice(-30);
  const myPitches = (s?.pitches ?? []).filter((p) => p.agent === agent).slice(0, 5);

  useEffect(() => { if (chat) end.current?.scrollIntoView({ block: "nearest" }); }, [chat, thread.length]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try { await fn(); await snap.reload(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const send = async () => {
    if (!s) return;
    const text = chatPrompt(agent, s, thread, msg.trim());
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
    setSent(msg.trim() || "What should we do now to reach the goal? Bring me your best ideas.");
    window.open(ai.url, "_blank", "noopener");
  };
  const saveAnswer = () => run(async () => {
    const r = await saveReply(brand.id, agent, sent, answer);
    setAnswer(""); setMsg(""); setSent(""); setCopied(false);
    setNote(r.pitches || r.knowledge ? `Saved. ${r.pitches} idea(s) pitched to the Director, ${r.knowledge} new fact(s) added to team knowledge.` : "Saved.");
  });
  const pitchIdea = (d: PitchDraft) => run(async () => { await pitch(brand.id, agent, d); setNote(`Pitched to the Director: ${d.title}`); });

  return (
    <section className="mb-6 rounded-panel border border-ultra/40 bg-soot">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ultra/20 text-sm font-bold text-ultra">{initials(a.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{a.name} <span className="text-xs font-normal text-concrete">· {a.title}{agent === "director" ? " · runs the team" : " · reports to the Director"}</span></p>
          <p className="truncate text-xs text-concrete">{b ? b.status : a.title}</p>
        </div>
        <Button kind={chat || open ? "plain" : "primary"} onClick={() => { const o = !(open && !chat); setOpen(o); setChat(false); if (o) snap.reload(); }}>
          {open && !chat ? "Close" : "Check in"}
        </Button>
        <Button kind={chat ? "primary" : "plain"} onClick={() => { setChat(!chat); setOpen(true); }}>Chat with {a.name.replace(/^The /, "")}</Button>
      </div>

      {open && (
        <div className="border-t border-rule p-4 text-sm">
          {snap.loading && !s && <p className="text-concrete">Checking…</p>}
          <ErrorNote msg={snap.error} />
          {note && <p className="mb-3 rounded-ctl border border-moss/50 p-2 text-moss">{note}</p>}

          {b && !chat && (
            <>
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

              {agent !== "director" && (
                <div className="mt-5 rounded-ctl border border-rule p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-ochre">My ideas for the Director</p>
                  {ideas.length ? ideas.map((d, i) => (
                    <div key={i} className="mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-rule/50 pb-2 last:border-0">
                      <div className="min-w-0 flex-1"><p className="font-medium">{d.title}</p>{d.idea !== d.title && <p className="text-xs text-concrete">{d.idea}</p>}<p className="text-xs text-concrete">Why: {d.why}{d.cost_egp ? ` · cost ~${d.cost_egp} EGP` : ""}</p></div>
                      <Button busy={busy} onClick={() => pitchIdea(d)}>Pitch</Button>
                    </div>
                  )) : <p className="text-concrete">All my current ideas are with the Director. Chat with me for new ones.</p>}
                  {myPitches.length > 0 && <p className="mt-2 text-xs text-concrete">My pitches: {myPitches.map((p) => `${p.title.slice(0, 40)} [${p.status}]`).join(" · ")}</p>}
                </div>
              )}
            </>
          )}

          {chat && s && (
            <div>
              <div className="max-h-96 space-y-3 overflow-y-auto rounded-ctl border border-rule p-3">
                {!thread.length && <p className="text-concrete">Start a conversation. {a.name} knows your numbers, memory, the plan, the team's latest research and his whole playbook. Ask anything, or tell him to change the approach.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={m.role === "you" ? "ml-8 rounded-ctl bg-ultra/15 p-2" : "mr-8 rounded-ctl bg-rule/40 p-2"}>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-concrete">{m.role === "you" ? "You" : a.name} · {new Date(m.created_at).toLocaleString()}</p>
                    <Text className="text-sm">{m.text}</Text>
                  </div>
                ))}
                {sent && <div className="ml-8 rounded-ctl border border-dashed border-ultra/50 p-2"><p className="mb-1 text-[11px] uppercase tracking-wide text-concrete">You (waiting for the answer)</p><Text className="text-sm">{sent}</Text></div>}
                <div ref={end} />
              </div>

              {!sent ? (
                <div className="mt-3">
                  <textarea rows={2} dir="auto" value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full" placeholder={`Message ${a.name}… (empty = "bring me your best ideas")`} />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Button kind="primary" onClick={send}>Send via {ai.name} ↗</Button>
                    <span className="text-xs text-concrete">Copies {a.name}'s full brain + your data and opens {ai.name}. Paste there (Ctrl/⌘+V), then bring the answer back here.</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-concrete">{copied ? `Copied ✓ — paste it in the ${ai.name} tab, then paste ${a.name}'s answer below.` : `Couldn't copy automatically — press "Copy again".`}</p>
                  <textarea rows={5} dir="auto" value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full" placeholder={`Paste ${a.name}'s answer here`} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button kind="primary" busy={busy} disabled={!answer.trim()} onClick={saveAnswer}>Save answer</Button>
                    <Button onClick={async () => { try { await navigator.clipboard.writeText(chatPrompt(agent, s, thread, sent)); setCopied(true); } catch { setCopied(false); } }}>Copy again</Button>
                    <Button kind="quiet" onClick={() => { setSent(""); setAnswer(""); }}>Cancel</Button>
                  </div>
                </div>
              )}
              <ErrorNote msg={err} />
            </div>
          )}
          {!chat && <ErrorNote msg={err} />}
        </div>
      )}
    </section>
  );
}
