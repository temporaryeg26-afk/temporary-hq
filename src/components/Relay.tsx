import { useState } from "react";
import { extractJSON } from "../lib/packs";
import { Button, ErrorNote } from "./ui";

const LINKS = {
  claude: { name: "Claude", url: "https://claude.ai/new" },
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" },
};

/**
 * The copy/paste bridge: 1) copy the pack, 2) paste it into Claude or ChatGPT, 3) paste the answer back.
 */
export default function Relay({
  to,
  title,
  why,
  makePack,
  onAnswer,
  tip,
}: {
  to: "claude" | "chatgpt";
  title: string;
  why: string;
  makePack: () => Promise<string> | string;
  onAnswer: (json: any) => Promise<string | void>;
  tip?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [size, setSize] = useState(0);
  const target = LINKS[to];

  const copy = async () => {
    setErr(null);
    try {
      const pack = await makePack();
      await navigator.clipboard.writeText(pack);
      setSize(pack.length);
      setCopied(true);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const json = extractJSON(answer);
      const msg = await onAnswer(json);
      setDone(msg || "Saved.");
      setAnswer("");
      setCopied(false);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="rounded-panel border border-rule bg-soot p-5">
      <h3 className="wide font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-concrete">{why}</p>
      <ol className="mt-4 space-y-4">
        <li className="flex flex-wrap items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-rule text-xs">1</span>
          <Button kind="primary" onClick={copy}>
            Copy for {target.name}
          </Button>
          {copied && <span className="text-sm text-moss">Copied ({Math.round(size / 1000)}k characters)</span>}
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-rule text-xs">2</span>
          <a href={target.url} target="_blank" rel="noreferrer" className="rounded-ctl border border-rule px-3.5 py-2 text-sm hover:border-concrete">
            Open {target.name}
          </a>
          <span className="text-sm text-concrete">Paste it into a new chat and send.{tip ? " " + tip : ""}</span>
        </li>
        <li>
          <div className="flex items-start gap-3">
            <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule text-xs">3</span>
            <div className="w-full">
              <textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={`Paste ${target.name}'s whole answer here`} className="font-mono text-xs" />
              <div className="mt-2">
                <Button onClick={save} busy={busy} disabled={!answer.trim()}>
                  Save answer
                </Button>
              </div>
            </div>
          </div>
        </li>
      </ol>
      <ErrorNote msg={err} />
      {done && <p className="mt-3 text-sm text-moss">{done}</p>}
    </div>
  );
}
