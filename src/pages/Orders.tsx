import { useEffect, useMemo, useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { loadAssets } from "../lib/assets";
import { downloadFile } from "../lib/github";
import type { Asset } from "../lib/types";

type Line = { product_id: string; size: string; color: string };

const CHATGPT = "https://chatgpt.com/";

/**
 * Order certificate cards: HQ writes the ChatGPT image prompt from the order details
 * and hands you the real mockups of the ordered items to attach, so the products on the card are your real designs.
 */
export default function OrdersPage() {
  const { brand, products } = useBrand();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ product_id: "", size: "", color: "" }]);
  const [extra, setExtra] = useState("");

  const { data: assets, error } = useAsync(async () => (await loadAssets(brand.id)).filter((a) => a.kind === "product_photo" || a.kind === "logo"), [brand.id]);

  const logo = assets?.find((a) => a.kind === "logo") ?? null;
  const picked = lines
    .map((l) => ({ l, p: products.find((p) => p.id === l.product_id) }))
    .filter((x) => x.p);

  const mockupFor = (l: Line): Asset | null => {
    const photos = (assets ?? []).filter((a) => a.kind === "product_photo" && a.product_id === l.product_id);
    const c = l.color.toLowerCase().replace(/\s+/g, "");
    return photos.find((a) => a.label.toLowerCase().replace(/[\s_-]+/g, "").includes(c)) ?? photos[0] ?? null;
  };

  const prompt = useMemo(() => {
    const items = picked.map(({ l, p }, n) => `${n + 1}. ${p!.name} — Size: ${l.size || "?"} — Colour: ${l.color || "?"} (use attached image ${n + 2} EXACTLY as the product picture, do not redraw it)`);
    const num = number.trim() ? `#${number.trim().replace(/^#/, "").padStart(4, "0")}` : "#0000";
    const shown = new Date(date + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    return `Create a premium vertical 9:16 digital certificate card for the streetwear brand TEMPORARY™ (tagline: "EVERYTHING IS TEMPORARY"). It is shown on a phone when a customer scans the QR code on their piece.

STYLE: dark cinematic Cairo back-alley at night, red neon accents, gritty concrete, a masked hooded figure in the background (silhouette only), luxury collectible feel, crisp and readable on a phone.

ATTACHED IMAGES:
- Image 1 = the official TEMPORARY™ logo. Place it at the top EXACTLY as given — do not redraw, restyle or recolour it.
${picked.map((_, n) => `- Image ${n + 2} = product ${n + 1}.`).join("\n")}

CARD CONTENT (spell every word exactly as written):
- Gold metal plate: "FOUNDER ${num}" with "AUTHENTIC PRODUCT" under it
- "OWNED BY" ${name.trim() || "[first name]"}
- "Genuine TEMPORARY™ product"
- "YOUR ORDER (${picked.length} ${picked.length === 1 ? "ITEM" : "ITEMS"})"
${items.join("\n")}
- "PURCHASED ON ${shown}" and "TOTAL ITEMS ${picked.length}"
- Footer: "THANK YOU FOR BEING PART OF TEMPORARY™"

RULES: use the attached product images unchanged inside clean rounded frames; keep all text sharp and correctly spelled; no prices; no phone numbers or addresses; do not add any claims that are not listed above.${extra.trim() ? `\n\nEXTRA: ${extra.trim()}` : ""}`;
  }, [picked, name, number, date, extra]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  return (
    <div>
      <PageHead title="Order cards" sub="The certificate card a customer sees when they scan their piece. Fill in the order, copy the prompt into ChatGPT and attach the files listed — your real logo and real mockups, so the card shows your actual designs." />
      <ErrorNote msg={error} />

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="oname">Name on the card</label>
            <input id="oname" dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tarek A. (first name + initial)" />
          </div>
          <div>
            <label htmlFor="onum">Founder / order number</label>
            <input id="onum" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 10" />
          </div>
          <div>
            <label htmlFor="odate">Purchased on</label>
            <input id="odate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <h3 className="mt-5 text-sm text-concrete">Items</h3>
        <div className="mt-2 space-y-2">
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.product_id);
            return (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_110px_160px_auto]">
                <select value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value, color: "" })}>
                  <option value="">Choose product</option>
                  {products.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.code} {x.name}
                    </option>
                  ))}
                </select>
                <input value={l.size} onChange={(e) => setLine(i, { size: e.target.value })} placeholder="Size" />
                {p?.colors?.length ? (
                  <select value={l.color} onChange={(e) => setLine(i, { color: e.target.value })}>
                    <option value="">Colour</option>
                    {p.colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={l.color} onChange={(e) => setLine(i, { color: e.target.value })} placeholder="Colour" />
                )}
                <Button kind="quiet" onClick={() => setLines(lines.filter((_, n) => n !== i))} disabled={lines.length === 1}>
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <Button onClick={() => setLines([...lines, { product_id: "", size: "", color: "" }])}>Add item</Button>
        </div>

        <label htmlFor="oextra" className="mt-5 block">
          Anything special for this card (optional)
        </label>
        <input id="oextra" dir="auto" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. gift for his brother" />
      </Panel>

      {picked.length > 0 && (
        <Panel>
          <h3 className="wide font-semibold">1 · Download the files to attach (in this order)</h3>
          <div className="mt-3 flex flex-wrap gap-4">
            <Attach n={1} label="Logo" asset={logo} />
            {picked.map(({ l, p }, n) => (
              <Attach key={n} n={n + 2} label={`${p!.code} ${l.color || ""}`} asset={mockupFor(l)} />
            ))}
          </div>
          <h3 className="wide mt-6 font-semibold">2 · Copy the prompt</h3>
          <pre dir="auto" className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-ctl border border-rule p-3 text-xs">
            {prompt}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Copy text={prompt} label="Copy prompt" />
            <a href={CHATGPT} target="_blank" rel="noreferrer" className="rounded-ctl border border-rule px-3.5 py-2 text-sm hover:border-concrete">
              Open ChatGPT
            </a>
          </div>
          <h3 className="wide mt-6 font-semibold">3 · Check before sending</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-concrete">
            <li>Name, number, sizes, colours and date are spelled exactly right.</li>
            <li>The logo and the products look exactly like your real files.</li>
            <li>No extra claims were added.</li>
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Attach({ n, label, asset }: { n: number; label: string; asset: Asset | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (asset)
      downloadFile(asset.storage_path)
        .then((b) => setUrl((u = URL.createObjectURL(b))))
        .catch(() => setUrl(null));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [asset?.storage_path]);
  if (!asset) return <p className="w-28 text-xs text-brick">{n}. {label}: not in Assets yet</p>;
  return (
    <div className="w-28 text-xs">
      <div className="aspect-square overflow-hidden rounded-ctl border border-rule bg-ash">{url && <img src={url} alt="" className="h-full w-full object-contain" />}</div>
      <p className="mt-1 truncate">
        {n}. {label}
      </p>
      {url && (
        <a href={url} download={`${n}-${asset.label}.png`} className="text-ultra">
          Download
        </a>
      )}
    </div>
  );
}
