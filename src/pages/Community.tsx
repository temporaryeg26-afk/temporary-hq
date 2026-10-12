import { useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { Copy, Panel } from "../components/ui";
import { latestLab } from "../lib/data";
import { communityPack } from "../lib/packs";

type Reply = { message: string; intent: string; reply: string; where: string; needs_owner: string };

const INTENT: Record<string, string> = { question: "text-ultra", complaint: "text-brick", wants_to_buy: "text-moss", compliment: "text-plaster", other: "text-concrete" };

/** DMs and comments: ChatGPT drafts the replies, you send them. Nothing is posted from here. */
export default function CommunityPage() {
  const { brand, products } = useBrand();
  const [messages, setMessages] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const phone = /(\+?20)?0?1[0125]\d{8}/.test(messages.replace(/\s/g, ""));

  return (
    <div>
      <p className="text-sm text-concrete">What this is: paste DMs or comments, the Community & sales employee drafts the replies, you send them from Instagram. Nothing is sent from here.</p>
      <h1 className="wide mt-2 text-2xl font-semibold">Community & sales</h1>

      <Panel className="mt-5">
        <label htmlFor="cmsg">Messages or comments (one per line)</label>
        <textarea id="cmsg" dir="auto" rows={6} value={messages} onChange={(e) => setMessages(e.target.value)} placeholder={"بكام الهودي؟\nالمقاسات بتيجي مظبوطة؟\nالطباعة بتستحمل الغسيل؟"} />
        <p className={`mt-1 text-xs ${phone ? "text-brick" : "text-concrete"}`}>
          {phone ? "Remove the phone number before sending this to ChatGPT." : "Remove names, phone numbers and addresses first — they never go to ChatGPT."}
        </p>
      </Panel>

      <div className="mt-5">
        <Relay
          to="chatgpt"
          title="Draft the replies with ChatGPT"
          why="Warm Egyptian Arabic, only confirmed facts, a clear next step for anyone who wants to buy."
          makePack={async () => {
            if (!messages.trim()) throw new Error("Paste at least one message first.");
            if (phone) throw new Error("Remove the phone number first.");
            return communityPack(brand, products, await latestLab(brand.id), messages);
          }}
          onAnswer={async (json) => {
            const r = Array.isArray(json?.replies) ? json.replies : [];
            if (!r.length) throw new Error('No "replies" in that answer.');
            setReplies(r.map((x: any) => ({ message: String(x.message ?? ""), intent: String(x.intent ?? "other"), reply: String(x.reply ?? ""), where: String(x.where ?? ""), needs_owner: String(x.needs_owner ?? "") })));
            return "Replies ready below.";
          }}
        />
      </div>

      {replies.length > 0 && (
        <ul className="mt-6 space-y-3">
          {replies.map((r, i) => (
            <li key={i} className="rounded-panel border border-rule bg-soot p-4 text-sm">
              <p className="text-xs">
                <span className={INTENT[r.intent] ?? "text-concrete"}>{r.intent.replace("_", " ")}</span>
                <span className="text-concrete"> · {r.where}</span>
              </p>
              <p className="mt-1 text-concrete" dir="auto">
                “{r.message}”
              </p>
              <p className="mt-2 whitespace-pre-wrap text-base" dir="auto">
                {r.reply}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <Copy text={r.reply} label="Copy reply" />
                {r.needs_owner && <span className="text-xs text-ochre">Needs you: {r.needs_owner}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
