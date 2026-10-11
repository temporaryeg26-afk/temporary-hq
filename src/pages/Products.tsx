import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead } from "../components/ui";
import { sb } from "../lib/supabase";
import type { Product } from "../lib/types";

const STATUS: [Product["status"], string][] = [
  ["not_released", "Not released"],
  ["available", "Available to order"],
  ["sold_out", "Sold out (edition closed)"],
];

export default function ProductsPage() {
  const { brand, products, refresh } = useBrand();
  const [err, setErr] = useState<string | null>(null);

  const save = async (id: string, patch: Partial<Product>) => {
    const r = await sb.from("products").update(patch).eq("id", id);
    if (r.error) setErr(r.error.message);
    await refresh();
  };
  const add = async () => {
    const n = products.length + 1;
    const r = await sb.from("products").insert({ brand_id: brand.id, code: String(n).padStart(2, "0"), name: "New product", sort: n });
    if (r.error) setErr(r.error.message);
    await refresh();
  };

  return (
    <div>
      <PageHead title="Products" sub="The only facts the AI may use. Anything not filled in here is never stated — the team writes [CONFIRM] instead.">
        <Button onClick={add}>Add product</Button>
      </PageHead>
      <ErrorNote msg={err} />
      <div className="space-y-4">
        {products.map((p) => (
          <Row key={p.id} p={p} onSave={(patch) => save(p.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function Row({ p, onSave }: { p: Product; onSave: (patch: Partial<Product>) => Promise<void> }) {
  const [f, setF] = useState({
    name: p.name,
    category: p.category ?? "",
    price: p.price_egp?.toString() ?? "",
    confirmed: p.price_confirmed,
    sizes: (p.sizes ?? []).join(", "),
    colors: (p.colors ?? []).join(", "),
    specs: p.specs ?? "",
    role: p.content_role ?? "",
    status: p.status,
    limit: p.edition_limit ?? 100,
    sold: p.sold_count ?? 0,
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean | number) => {
    setF({ ...f, [k]: v });
    setDirty(true);
  };
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <details className="rounded-panel border border-rule bg-soot">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
        <span className="wide w-8 text-concrete">{p.code}</span>
        <span className="font-medium">{p.name}</span>
        <span className="text-sm text-concrete">{p.price_confirmed && p.price_egp ? `EGP ${Number(p.price_egp).toLocaleString()}` : "Price not confirmed"}</span>
        <span className={`ml-auto text-sm ${p.status === "available" ? "text-moss" : "text-concrete"}`}>{STATUS.find((s) => s[0] === p.status)?.[1]}</span>
      </summary>
      <div className="grid gap-4 border-t border-rule p-5 md:grid-cols-3">
        <div>
          <label>Name</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label>Category</label>
          <input value={f.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div>
          <label>Availability</label>
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Price (EGP)</label>
          <input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} />
          <label className="mt-2 flex items-center gap-2 text-plaster">
            <input type="checkbox" checked={f.confirmed} onChange={(e) => set("confirmed", e.target.checked)} /> Confirmed — AI may state it
          </label>
        </div>
        <div>
          <label>Sizes (comma separated)</label>
          <input value={f.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="S, M, L, XL" />
        </div>
        <div>
          <label>Colours</label>
          <input value={f.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Black, Bone" />
        </div>
        <div className="md:col-span-2">
          <label>Verified materials & care (only facts you can prove)</label>
          <textarea rows={2} value={f.specs} onChange={(e) => set("specs", e.target.value)} placeholder="e.g. 100% cotton, 240 GSM, screen print, wash cold inside out" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Edition size</label>
            <input type="number" value={f.limit} onChange={(e) => set("limit", Number(e.target.value))} />
          </div>
          <div>
            <label>Sold so far</label>
            <input type="number" value={f.sold} onChange={(e) => set("sold", Number(e.target.value))} />
          </div>
        </div>
        <div className="md:col-span-3">
          <label>Role in content</label>
          <textarea rows={2} dir="auto" value={f.role} onChange={(e) => set("role", e.target.value)} />
        </div>
        <div>
          <Button
            kind="primary"
            busy={busy}
            disabled={!dirty}
            onClick={async () => {
              setBusy(true);
              await onSave({
                name: f.name,
                category: f.category,
                price_egp: f.price === "" ? null : Number(f.price),
                price_confirmed: f.price === "" ? false : f.confirmed,
                sizes: list(f.sizes),
                colors: list(f.colors),
                specs: f.specs,
                content_role: f.role,
                status: f.status,
                edition_limit: f.limit,
                sold_count: f.sold,
              });
              setBusy(false);
              setDirty(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </details>
  );
}
