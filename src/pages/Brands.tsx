import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead, Panel } from "../components/ui";
import { createBrand, saveBrand, setActiveBrand } from "../lib/data";

export default function BrandsPage() {
  const { brand, brands, refresh } = useBrand();
  const [name, setName] = useState(brand.name);
  const [form, setForm] = useState(brand.order_form_url ?? "");
  const [ctx, setCtx] = useState(brand.context);
  const [newName, setNewName] = useState("");
  const [newCtx, setNewCtx] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    setErr(null);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div>
      <PageHead title="Brands" sub="TEMPORARY™ is set up. Add another brand any time — it gets its own products, assets, plans, content and research." />
      <ErrorNote msg={err} />
      <div className="mb-6 flex flex-wrap gap-2">
        {brands.map((b) => (
          <button
            key={b.id}
            aria-current={b.id === brand.id}
            onClick={async () => {
              setActiveBrand(b.id);
              await refresh();
              window.location.reload();
            }}
            className={`rounded-ctl border px-4 py-2 ${b.id === brand.id ? "border-ultra" : "border-rule text-concrete hover:text-plaster"}`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <Panel className="mb-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>Google Forms order link</label>
            <input value={form} onChange={(e) => setForm(e.target.value)} placeholder="https://forms.gle/..." />
          </div>
        </div>
        <div>
          <label>Brand bible — every pack starts with this. Keep it tight.</label>
          <textarea dir="auto" rows={18} className="text-sm" value={ctx} onChange={(e) => setCtx(e.target.value)} />
          <p className="mt-1 text-xs text-concrete">{ctx.length.toLocaleString()} characters</p>
        </div>
        <Button
          kind="primary"
          busy={busy === "save"}
          onClick={() =>
            run("save", async () => {
              await saveBrand(brand.id, { name, order_form_url: form, context: ctx });
              await refresh();
              setMsg("Saved.");
            })
          }
        >
          Save brand
        </Button>
        {msg && <p className="text-sm text-moss">{msg}</p>}
      </Panel>

      <Panel className="space-y-4">
        <h2 className="wide font-semibold">Add a brand</h2>
        <div>
          <label>Brand name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div>
          <label>Brand bible (positioning, audience, voice, rules)</label>
          <textarea dir="auto" rows={6} value={newCtx} onChange={(e) => setNewCtx(e.target.value)} />
        </div>
        <Button
          disabled={!newName.trim()}
          busy={busy === "new"}
          onClick={() =>
            run("new", async () => {
              const b = await createBrand(newName, newCtx);
              setActiveBrand(b.id);
              window.location.reload();
            })
          }
        >
          Create and open it
        </Button>
      </Panel>
    </div>
  );
}
