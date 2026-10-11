import { useEffect, useRef, useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { loadAssets } from "../lib/assets";
import { log } from "../lib/data";
import { bitmap, restoreProtected, sha256 } from "../lib/media";
import { photoEditPrompt } from "../lib/packs";
import { currentLogin, downloadFile, fileUrl, removeFiles, uploadFile } from "../lib/github";
import { insert, list, newId, now, remove, update } from "../lib/store";
import type { Asset, Media, Region } from "../lib/types";

const KINDS: [Asset["kind"], string, string][] = [
  ["logo", "Logo", "Your brand mark, placed on images and videos exactly as uploaded. A transparent PNG works best."],
  ["artwork", "Product artwork", "The original design files printed on garments. Never redrawn."],
  ["mask", "Founder mask", "The mask as a cut-out PNG or photo. It can be placed, never changed."],
  ["product_photo", "Product photos", "Real photos of the garments. Mark the design area, then AI can change only what's around it."],
  ["reference", "Mood references", "Style inspiration only. Not locked."],
];

function Thumb({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fileUrl(path).then(setUrl);
  }, [path]);
  return url ? <img src={url} alt={alt} className="max-h-full max-w-full object-contain" /> : null;
}

export default function AssetsPage() {
  const { brand, products } = useBrand();
  const [kind, setKind] = useState<Asset["kind"]>("logo");
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [protect, setProtect] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, error, reload } = useAsync(async () => {
    const [assets, media] = await Promise.all([loadAssets(brand.id), list<Media>(brand.id, "media")]);
    const edits = media.filter((m) => m.slot === "photo-edit").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 24);
    return { assets, edits };
  }, [brand.id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const rows: Asset[] = [];
      for (const f of Array.from(files)) {
        const bm = await bitmap(f).catch(() => {
          throw new Error(`${f.name} isn't an image the browser can read (use PNG, JPG or WEBP).`);
        });
        const path = `${brand.id}/files/assets/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        await uploadFile(path, f, `HQ (${currentLogin()}): upload ${kind} ${f.name}`); // stored exactly as uploaded
        rows.push({
            id: newId(),
            kind,
            locked: kind !== "reference",
            label: f.name.replace(/\.[^.]+$/, ""),
            product_id: productId || null,
            storage_path: path,
            mime: f.type,
            width: bm.width,
            height: bm.height,
            sha256: await sha256(f),
            protect_regions: [],
            created_by: currentLogin(),
            created_at: now(),
          });
      }
      await insert<Asset>(brand.id, "assets", rows, `add ${rows.length} ${kind}`);
      await log(brand.id, `Uploaded ${files.length} ${kind.replace("_", " ")} file(s).`);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const patch = async (id: string, body: Partial<Asset>) => {
    try {
      await update<Asset>(brand.id, "assets", id, body, "update asset");
    } catch (e) {
      setErr((e as Error).message);
    }
    await reload();
  };

  return (
    <div>
      <PageHead
        title="Assets"
        sub="Everything except mood references is locked: AI never draws, recolours or crops these. The site pastes the original files on top of AI scenes and checks every pixel."
      />
      <ErrorNote msg={error ?? err} />
      <Panel className="mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="kind">What are you uploading?</label>
            <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Asset["kind"])}>
              {KINDS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prod">Which product (optional)</label>
            <select id="prod" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Not product-specific</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
            <Button kind="primary" onClick={() => fileRef.current?.click()} busy={busy}>
              Choose files
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-concrete">{KINDS.find((k) => k[0] === kind)?.[2]}</p>
      </Panel>

      {KINDS.map(([k, label]) => {
        const list = (data?.assets ?? []).filter((a) => a.kind === k);
        if (!list.length) return null;
        return (
          <section key={k} className="mb-8">
            <h2 className="wide mb-3 font-semibold">{label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((a) => (
                <div key={a.id} className="rounded-panel border border-rule bg-soot p-3">
                  <div className="mb-2 grid aspect-square place-items-center overflow-hidden rounded-ctl bg-[repeating-conic-gradient(#2a2725_0_25%,#232120_0_50%)] bg-[length:16px_16px]">
                    <Thumb path={a.storage_path} alt={a.label} />
                  </div>
                  <input className="mb-2 text-sm" defaultValue={a.label} aria-label="Name" onBlur={(e) => e.target.value !== a.label && patch(a.id, { label: e.target.value })} />
                  <p className="text-xs text-concrete">
                    {a.width}×{a.height} · {a.locked ? "Locked" : "Reference"}
                    {a.protect_regions?.length ? ` · ${a.protect_regions.length} protected` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {(k === "product_photo" || k === "mask") && (
                      <>
                        <button className="text-ultra" onClick={() => setProtect(a)}>
                          Protect area
                        </button>
                        <button className="text-ultra" onClick={() => setEditing(a)}>
                          Edit with AI
                        </button>
                      </>
                    )}
                    <button
                      className="text-concrete hover:text-brick"
                      onClick={async () => {
                        if (!confirm(`Delete ${a.label}?`)) return;
                        await removeFiles([a.storage_path]);
                        await remove(brand.id, "assets", a.id, `delete ${a.label}`);
                        reload();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {(data?.edits.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="wide mb-3 font-semibold">AI photo edits</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data!.edits.map((m) => (
              <EditCard key={m.id} m={m} brandId={brand.id} onRemove={reload} />
            ))}
          </div>
        </section>
      )}

      {protect && <ProtectEditor asset={protect} onClose={() => setProtect(null)} onSave={(r) => patch(protect.id, { protect_regions: r }).then(() => setProtect(null))} />}
      {editing && <EditPhoto asset={editing} onClose={() => (setEditing(null), reload())} />}
    </div>
  );
}

function EditCard({ m, brandId, onRemove }: { m: Media; brandId: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u = "";
    if (m.storage_path) downloadFile(m.storage_path).then((b) => setUrl((u = URL.createObjectURL(b))));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [m.storage_path]);
  return (
    <div className="rounded-panel border border-rule bg-soot p-3 text-sm">
      {url && <img src={url} alt="" className="rounded-ctl" />}
      <p className={`mt-2 text-xs ${m.status === "done" ? "text-moss" : "text-brick"}`}>
        {m.status === "done" ? "Protected design restored from your original, pixel for pixel" : "The AI moved or changed the design — rejected"}
      </p>
      <p className="text-xs text-concrete">{m.made_with}</p>
      <div className="mt-2 flex gap-3 text-xs">
        {url && m.status === "done" && (
          <a href={url} download={`temporary-edit-${m.id.slice(0, 6)}.png`} className="text-ultra">
            Download
          </a>
        )}
        <button
          className="text-concrete hover:text-brick"
          onClick={async () => {
            await removeFiles([m.storage_path ?? ""]);
            await remove(brandId, "media", m.id, "remove photo edit");
            onRemove();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/** Drag boxes over every print, logo or mask in the photo. */
function ProtectEditor({ asset, onClose, onSave }: { asset: Asset; onClose: () => void; onSave: (r: Region[]) => void }) {
  const [regions, setRegions] = useState<Region[]>(asset.protect_regions ?? []);
  const [draft, setDraft] = useState<Region | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fileUrl(asset.storage_path).then(setUrl);
  }, [asset.storage_path]);

  const pt = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/75 p-4" role="dialog" aria-label="Protect design area">
      <div className="w-full max-w-2xl rounded-panel border border-rule bg-ash p-5">
        <h2 className="wide mb-1 font-semibold">Protect the design</h2>
        <p className="mb-4 text-sm text-concrete">Drag a box over every print, logo or mask. After any AI edit these areas are put back from your original, or the edit is rejected.</p>
        <div
          ref={box}
          className="relative mx-auto w-fit touch-none select-none"
          onPointerDown={(e) => {
            start.current = pt(e);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const p = pt(e), s = start.current;
            setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
          }}
          onPointerUp={() => {
            if (draft && draft.w > 0.02 && draft.h > 0.02) setRegions([...regions, draft]);
            setDraft(null);
            start.current = null;
          }}
        >
          {url && <img src={url} alt={asset.label} draggable={false} className="max-h-[60vh]" />}
          {[...regions, ...(draft ? [draft] : [])].map((r, i) => (
            <div key={i} className="absolute border-2 border-ultra bg-ultra/20" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button kind="primary" onClick={() => onSave(regions)}>
            Save {regions.length} area{regions.length === 1 ? "" : "s"}
          </Button>
          <Button onClick={() => setRegions([])}>Clear</Button>
          <Button kind="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditPhoto({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { brand } = useBrand();
  const [instruction, setInstruction] = useState("Replace only the background with a dim concrete stairwell in Downtown Cairo at dusk, soft side light");
  const [madeWith, setMadeWith] = useState("Nano Banana (Flow)");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const ready = (asset.protect_regions ?? []).length > 0;
  useEffect(() => {
    fileUrl(asset.storage_path).then(setUrl);
  }, [asset.storage_path]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const original = await downloadFile(asset.storage_path);
      const r = await restoreProtected(original, file, asset.protect_regions);
      const id = newId();
      const path = `${brand.id}/files/edits/${id}.png`;
      await uploadFile(path, r.blob, `HQ (${currentLogin()}): photo edit`);
      await insert<Media>(brand.id, "media", {
          id,
          content_id: null,
          base_path: null,
          kind: "image",
          slot: "photo-edit",
          made_with: madeWith,
          status: r.pass ? "done" : "rejected",
          storage_path: path,
          fidelity: { method: "protected-regions", pass: r.pass, checks: r.checks, source: asset.id },
          note: instruction,
          created_by: currentLogin(),
          created_at: now(),
        }, "add photo edit");
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/75 p-4" role="dialog" aria-label="Edit photo with AI">
      <div className="w-full max-w-lg rounded-panel border border-rule bg-ash p-5">
        <h2 className="wide mb-1 font-semibold">Edit “{asset.label}”</h2>
        {!ready ? (
          <p className="text-sm text-ochre">Use “Protect area” on this photo first, so the design is guaranteed to stay exactly as it is.</p>
        ) : (
          <ol className="mt-3 space-y-4 text-sm">
            <li>
              <p className="mb-1 text-concrete">1. Download your original photo{url && " "}
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="text-ultra">
                    (open)
                  </a>
                )}
              </p>
            </li>
            <li>
              <p className="mb-1 text-concrete">2. Say what should change, then copy the prompt</p>
              <textarea dir="auto" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-3">
                <Copy text={photoEditPrompt(instruction)} label="Copy prompt" />
                <a href="https://labs.google/fx/tools/flow" target="_blank" rel="noreferrer" className="text-ultra">
                  Open Flow
                </a>
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="text-ultra">
                  Open ChatGPT
                </a>
              </div>
            </li>
            <li>
              <p className="mb-1 text-concrete">3. Attach the photo there with the prompt, download the edit, upload it here</p>
              <div className="flex flex-wrap items-center gap-3">
                <select aria-label="Made with" className="w-auto py-1" value={madeWith} onChange={(e) => setMadeWith(e.target.value)}>
                  <option>Nano Banana (Flow)</option>
                  <option>ChatGPT image</option>
                </select>
                <label className={`mb-0 cursor-pointer rounded-ctl bg-ultra px-3.5 py-2 text-sm font-medium text-white ${busy ? "working opacity-60" : ""}`}>
                  Upload the edit
                  <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
                </label>
              </div>
            </li>
          </ol>
        )}
        <ErrorNote msg={err} />
        <div className="mt-4">
          <Button kind="quiet" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
