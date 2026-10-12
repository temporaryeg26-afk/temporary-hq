import { useRef, useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, ErrorNote, PageHead, Panel, Status, useAsync } from "../components/ui";
import { applyReview, applyWriting, createPiece, latestLab, loadContent } from "../lib/data";
import { reviewPack, writePack } from "../lib/packs";
import type { ContentItem } from "../lib/types";

const FILTERS: [string, string][] = [
  ["", "All"],
  ["needs_you", "Needs you"],
  ["brief,in_review", "In progress"],
  ["approved", "Approved"],
  ["published", "Posted"],
  ["rejected", "Rejected"],
];

export default function ContentPage() {
  const { brand, products } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const batch = brand.settings?.batchSize ?? 5;
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const writing = useRef<ContentItem[]>([]);
  const reviewing = useRef<ContentItem[]>([]);

  const { data, error, reload } = useAsync(() => loadContent(brand.id), [brand.id]);
  const items = data ?? [];
  const toWrite = items.filter((i) => i.status === "brief");
  const toReview = items.filter((i) => i.status === "in_review");
  const shown = filter ? items.filter((i) => filter.split(",").includes(i.status)) : items;

  return (
    <div>
      <PageHead title="Content" sub="ChatGPT writes, the site checks the brand rules, the manager reviews, you approve.">
        <Button onClick={() => setAdding(!adding)}>New piece</Button>
      </PageHead>
      <ErrorNote msg={error} />
      {adding && <NewPiece onDone={() => (setAdding(false), reload())} />}

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <Relay
          to="chatgpt"
          title={toWrite.length === 1 ? "Write the next piece" : `Write the next ${Math.min(batch, toWrite.length) || batch} pieces`}
          why={toWrite.length ? `${toWrite.length} ${toWrite.length === 1 ? "brief is" : "briefs are"} waiting. ChatGPT writes ${batch} per paste, then the site checks every brand rule.` : "Nothing to write. Make a plan or add a piece."}
          makePack={async () => {
            if (!toWrite.length) throw new Error("Nothing waiting to be written.");
            writing.current = toWrite.slice(0, batch);
            return writePack(brand, products, writing.current, await latestLab(brand.id));
          }}
          onAnswer={async (json) => {
            const r = await applyWriting(brand, products, writing.current, json);
            await reload();
            return `Saved ${r.saved} pieces${r.missing.length ? ` (${r.missing.length} missing — copy again to redo them)` : ""}. Next: send them for review.`;
          }}
        />
        <Relay
          to={manager}
          title={`Final review by ${aiName(manager)}`}
          why={toReview.length ? `${toReview.length} ${toReview.length === 1 ? "draft is" : "drafts are"} waiting. The manager approves or sends back with one-line notes (sent-back pieces return to the writing queue).` : "Nothing waiting for review."}
          makePack={() => {
            if (!toReview.length) throw new Error("Nothing waiting for review.");
            reviewing.current = toReview.slice(0, 10);
            return reviewPack(brand, reviewing.current);
          }}
          onAnswer={async (json) => {
            const r = await applyReview(brand, reviewing.current, json, manager);
            await reload();
            return `${r.approved} passed to you, ${r.sent} sent back for rewriting.`;
          }}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={filter === v}
            onClick={() => setFilter(v)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === v ? "border-ultra text-plaster" : "border-rule text-concrete"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-concrete">Nothing here yet.</p>}
      <ul className="divide-y divide-rule rounded-panel border border-rule">
        {shown.map((i) => {
          const blocks = i.rule_flags?.filter((f) => f.severity === "block").length ?? 0;
          const asks = i.rule_flags?.filter((f) => f.severity === "approval").length ?? 0;
          return (
            <li key={i.id}>
              <a href={`#/content/${i.id}`} className="grid grid-cols-[56px_1fr] gap-3 px-4 py-3 text-sm hover:bg-soot sm:grid-cols-[70px_80px_1fr_auto_auto] sm:items-center">
                <time className="text-concrete">{i.scheduled_for?.slice(5)}</time>
                <span className="hidden capitalize text-concrete sm:block">{i.format}</span>
                <span className="min-w-0">
                  <span dir="auto" className="block truncate">
                    {i.title}
                  </span>
                  <span className="text-xs text-concrete">
                    {i.pillar}
                    {i.qa ? ` · self-check ${i.qa.score}/10` : ""}
                  </span>
                </span>
                <span className="col-start-2 text-xs sm:col-start-auto">
                  {blocks > 0 && <span className="mr-2 text-brick">{blocks} to fix</span>}
                  {asks > 0 && <span className="text-ochre">{asks} to confirm</span>}
                </span>
                <span className="col-start-2 sm:col-start-auto">
                  <Status s={i.status} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewPiece({ onDone }: { onDone: () => void }) {
  const { brand, products } = useBrand();
  const [f, setF] = useState({ format: "reel", pillar: "discovery", product_code: "", angle: "", cta: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Panel className="mb-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label>Format</label>
          <select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}>
            <option value="reel">Reel</option>
            <option value="carousel">Carousel</option>
            <option value="static">Static post</option>
            <option value="story">Story set</option>
            <option value="founder_video">Founder film (6 × 10s)</option>
            <option value="motion_carousel">Motion carousel</option>
          </select>
        </div>
        <div>
          <label>Purpose</label>
          <select value={f.pillar} onChange={(e) => setF({ ...f, pillar: e.target.value })}>
            <option value="discovery">Discovery — reach new people</option>
            <option value="philosophy">Philosophy & masked founder</option>
            <option value="product">Product desire & proof</option>
            <option value="community">Community & collectibility</option>
            <option value="conversion">Conversion & confidence</option>
            <option value="doctrine">Doctrine — teach the worldview</option>
          </select>
        </div>
        <div>
          <label>Product</label>
          <select value={f.product_code} onChange={(e) => setF({ ...f, product_code: e.target.value })}>
            <option value="">No specific product</option>
            {products.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label>The idea</label>
          <input dir="auto" value={f.angle} onChange={(e) => setF({ ...f, angle: e.target.value })} placeholder="What should this piece say or show?" />
        </div>
        <div>
          <label>Call to action</label>
          <input dir="auto" value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} placeholder="e.g. Save this / DM your size" />
        </div>
      </div>
      <ErrorNote msg={err} />
      <div className="mt-4">
        <Button
          kind="primary"
          busy={busy}
          disabled={!f.angle.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await createPiece(brand, products, f);
              onDone();
            } catch (e) {
              setErr((e as Error).message);
            }
            setBusy(false);
          }}
        >
          Add to the writing queue
        </Button>
      </div>
    </Panel>
  );
}
