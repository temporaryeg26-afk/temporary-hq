import { ReactNode, useEffect, useState } from "react";
import { go, useBrand } from "../App";
import Composer from "../components/Composer";
import { aiName, Button, Copy, ErrorNote, Loading, Panel, Status, Text, useAsync } from "../components/ui";
import { resolveOverlays } from "../lib/assets";
import { loadContent, log } from "../lib/data";
import { Aspect, composite } from "../lib/media";
import { imagePromptFor, videoPromptFor } from "../lib/packs";
import { checkRules } from "../lib/rules";
import { currentLogin, downloadFile, removeFiles, uploadFile } from "../lib/github";
import { insert, list, mutate, newId, now, remove, update } from "../lib/store";
import type { ContentItem, Media } from "../lib/types";
import { overlayVideo } from "../lib/video";

const FLOW = "https://labs.google/fx/tools/flow";
const CHATGPT = "https://chatgpt.com/";

type Slot = { key: string; label: string; kind: "image" | "video"; prompt: string; text: string; aspect: Aspect };

function slotsFor(item: ContentItem): Slot[] {
  const o = item.output ?? {};
  if (item.format === "carousel")
    return (o.slides ?? []).map((s: any) => ({ key: `slide-${s.n}`, label: `Slide ${s.n}`, kind: "image", prompt: s.image_prompt ?? s.visual ?? "", text: s.copy ?? "", aspect: "4:5" as Aspect }));
  if (item.format === "story")
    return (o.frames ?? []).map((f: any) => ({ key: `frame-${f.n}`, label: `Frame ${f.n}`, kind: "image", prompt: f.image_prompt ?? f.visual ?? "", text: f.text ?? "", aspect: "9:16" as Aspect }));
  if (item.format === "founder_video")
    return (o.scenes ?? []).map((sc: any) => ({
      key: `scene-${sc.n}`,
      label: `Scene ${sc.n} (10s)`,
      kind: "video",
      prompt: [sc.video_prompt ?? sc.visual ?? "", sc.start_frame ? `Starts on: ${sc.start_frame}.` : "", sc.end_frame ? `Ends on: ${sc.end_frame}.` : "", "Exactly 10 seconds."].filter(Boolean).join(" "),
      text: sc.on_screen_text ?? "",
      aspect: "9:16" as Aspect,
    }));
  if (item.format === "motion_carousel")
    return (o.slides ?? []).map((s: any) => ({ key: `slide-${s.n}`, label: `Slide ${s.n} (motion)`, kind: "video", prompt: s.motion ?? "", text: s.copy ?? "", aspect: "4:5" as Aspect }));
  if (item.format === "static") return [{ key: "post", label: "Post image", kind: "image", prompt: o.image_prompt ?? o.visual ?? "", text: o.headline ?? "", aspect: "4:5" }];
  return [
    { key: "reel", label: "Reel video", kind: "video", prompt: o.video_prompt ?? "", text: "", aspect: "9:16" },
    { key: "cover", label: "Reel cover", kind: "image", prompt: o.video_prompt ?? "", text: o.chosen_hook ?? "", aspect: "9:16" },
  ];
}

export default function ContentDetail({ id }: { id: string }) {
  const { brand, products } = useBrand();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [json, setJson] = useState("");

  const { data, error, reload } = useAsync(async () => {
    const item = (await loadContent(brand.id)).find((i) => i.id === id);
    if (!item) throw new Error("This piece doesn't exist anymore.");
    const media = (await list<Media>(brand.id, "media")).filter((m) => m.content_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { item, media };
  }, [id]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  const { item, media } = data;
  const o = item.output ?? {};
  const product = products.find((p) => p.id === item.product_id);
  const blocks = item.rule_flags.filter((f) => f.severity === "block");

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };
  const setStatus = (status: string, extra: Record<string, unknown> = {}) =>
    act(status, async () => {
      await update<ContentItem>(brand.id, "content", item.id, { status: status as ContentItem["status"], updated_at: now(), ...extra }, `${status}: ${item.title}`);
      await log(brand.id, `${currentLogin()} marked "${item.title}" as ${status.replace("_", " ")}.`);
    });

  return (
    <div>
      <button className="mb-4 text-sm text-concrete hover:text-plaster" onClick={() => go("/content")}>
        Back to content
      </button>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-sm capitalize text-concrete">
            {item.format} · {item.pillar} · {item.scheduled_for}
            {product ? ` · ${product.name}` : ""}
          </p>
          <h1 className="wide mt-1 text-2xl font-semibold" dir="auto">
            {item.title}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <Status s={item.status} />
            {item.format === "founder_video" && item.output && (
              <a href={`#/film/${item.id}`} className="text-sm text-ultra hover:underline">
                Open storyboard
              </a>
            )}
            {item.format === "motion_carousel" && item.output && (
              <a href={`#/motion/${item.id}`} className="text-sm text-ultra hover:underline">
                Open motion board
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status !== "approved" && item.status !== "published" && (
            <Button kind="primary" onClick={() => setStatus("approved")} busy={busy === "approved"} disabled={!item.output || blocks.length > 0} title={blocks.length ? "Fix the red flags first" : ""}>
              Approve
            </Button>
          )}
          {item.status === "approved" && (
            <Button kind="primary" onClick={() => setStatus("published")} busy={busy === "published"}>
              Mark as posted
            </Button>
          )}
          <Button onClick={() => setStatus("rejected")} busy={busy === "rejected"}>
            Reject
          </Button>
          <Button
            kind="danger"
            onClick={() =>
              act("del", async () => {
                if (!confirm("Delete this piece and its visuals?")) return;
                await removeFiles(Array.from(new Set(media.flatMap((m) => [m.storage_path ?? "", m.base_path ?? ""]))));
                const mids = new Set(media.map((m) => m.id));
                if (mids.size) await mutate<Media>(brand.id, "media", (d) => d.filter((m) => !mids.has(m.id)), "remove visuals");
                await remove(brand.id, "content", item.id, `delete: ${item.title}`);
                go("/content");
              })
            }
          >
            Delete
          </Button>
        </div>
      </header>
      <ErrorNote msg={err} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {!item.output && <Panel className="text-concrete">Not written yet. On the Content page, copy the next batch for ChatGPT.</Panel>}
          {item.output && !editing && <OutputView format={item.format} o={o} />}
          {item.output && editing && (
            <Panel>
              <label>Edit everything (advanced)</label>
              <textarea dir="auto" rows={22} className="font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <Button
                  kind="primary"
                  busy={busy === "save"}
                  onClick={() =>
                    act("save", async () => {
                      const output = JSON.parse(json);
                      const flags = checkRules(output, products, product?.code ?? null);
                      await update<ContentItem>(brand.id, "content", item.id, { output, rule_flags: flags, updated_at: now() }, `edit: ${item.title}`);
                      setEditing(false);
                    })
                  }
                >
                  Save edits
                </Button>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </Panel>
          )}
          {item.output && (
            <Panel>
              <h2 className="wide mb-1 font-semibold">Visuals</h2>
              <p className="mb-4 text-sm text-concrete">
                Copy each prompt into Flow (Nano Banana for images, Veo for video) or ChatGPT, download the result and upload it here. The site adds your original logo and files on top and
                checks them pixel by pixel.
              </p>
              <div className="space-y-4">
                {slotsFor(item).map((s) => (
                  <SlotCard key={s.key} slot={s} item={item} media={media.filter((m) => m.slot === s.key)} onChange={reload} />
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-5">
          <Panel>
            <h2 className="mb-2 font-semibold">Brand rule checks</h2>
            {item.rule_flags.length === 0 && <p className="text-sm text-moss">{item.output ? "No problems found." : "Runs when it's written."}</p>}
            <ul className="space-y-2 text-sm">
              {item.rule_flags.map((f, i) => (
                <li key={i} className={f.severity === "block" ? "text-brick" : "text-ochre"}>
                  {f.severity === "block" ? "Must fix: " : "Your OK needed: "}
                  {f.rule}
                  <span className="block text-xs text-concrete" dir="auto">
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          {item.review && (
            <Panel>
              <h2 className="mb-1 font-semibold">Manager review · {aiName(item.review.by)}</h2>
              <p className={`text-sm ${item.review.decision === "approve" ? "text-moss" : "text-ochre"}`}>{item.review.decision === "approve" ? "Approved" : "Sent back"}</p>
              {item.review.note && <Text className="mt-1 text-sm">{item.review.note}</Text>}
            </Panel>
          )}
          {item.qa && (
            <Panel>
              <h2 className="mb-1 font-semibold">ChatGPT self-check · {item.qa.score}/10</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-concrete">
                {(item.qa.issues ?? []).map((x, i) => (
                  <li key={i} dir="auto">
                    {x}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel>
            <h2 className="mb-2 font-semibold">Ask for changes</h2>
            <textarea dir="auto" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shorter hook, more mystery, mention Founder status" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                disabled={!item.output || !note.trim()}
                busy={busy === "brief"}
                onClick={() => setStatus("brief", { revision_note: note, revisions: item.revisions + 1 })}
                title="Goes back to the writing queue with your note"
              >
                Send back to ChatGPT
              </Button>
              <Button
                kind="quiet"
                disabled={!item.output}
                onClick={() => {
                  setJson(JSON.stringify(o, null, 2));
                  setEditing(true);
                }}
              >
                Edit by hand
              </Button>
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-2 font-semibold">Manager's brief</h2>
            <dl className="space-y-1.5 text-sm">
              {Object.entries(item.brief ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-concrete">{k.replace(/_/g, " ")}</dt>
                  <dd dir="auto">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ one visual slot

function SlotCard({ slot, item, media, onChange }: { slot: Slot; item: ContentItem; media: Media[]; onChange: () => void }) {
  const { brand } = useBrand();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [madeWith, setMadeWith] = useState(slot.kind === "video" ? "Veo (Flow)" : "Nano Banana (Flow)");
  const prompt = slot.kind === "video" ? videoPromptFor(slot.prompt) : imagePromptFor(slot.prompt, slot.aspect);
  const overlaysSpec = item.output?.overlays ?? [{ asset_kind: "logo", position: slot.aspect === "9:16" ? "top-right" : "bottom-right", width_pct: 14 }];

  const upload = async (file: File | undefined, via?: string) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const { overlays, missing } = await resolveOverlays(brand.id, overlaysSpec, item.product_id);
      const id = newId();
      if (slot.kind === "image") {
        setProgress("Adding your original files and checking every pixel…");
        const r = await composite(file, slot.aspect, overlays);
        const path = `${brand.id}/files/media/${id}.png`;
        await uploadFile(path, r.blob, `HQ (${currentLogin()}): image for ${item.title}`);
        await insert<Media>(brand.id, "media", {
            id,
            content_id: item.id,
            kind: "image",
            slot: slot.key,
            made_with: via ?? madeWith,
            status: r.pass ? "done" : "rejected",
            storage_path: path,
            base_path: path,
            fidelity: { method: "pixel", pass: r.pass, placements: r.placements, checks: r.checks, missing },
            note: missing.length ? `Not in your Assets yet: ${missing.join(", ")}` : null,
            created_by: currentLogin(),
            created_at: now(),
          }, "add image");
      } else {
        setProgress("Loading the video engine (first time ~30 MB)…");
        const out = await overlayVideo(file, overlays, (p) => setProgress(`Adding your logo… ${Math.round(p * 100)}%`));
        const path = `${brand.id}/files/media/${id}.mp4`;
        setProgress("Saving to GitHub…");
        await uploadFile(path, out, `HQ (${currentLogin()}): video for ${item.title}`);
        await insert<Media>(brand.id, "media", {
            id,
            content_id: item.id,
            kind: "video",
            slot: slot.key,
            made_with: via ?? madeWith,
            status: "done",
            storage_path: path,
            fidelity: { method: "overlay", overlays: overlays.length, missing },
            note: "Logo burned on from your original file. Watch the video to confirm any garment print or mask looks right before posting.",
            created_by: currentLogin(),
            created_at: now(),
            base_path: null,
          }, "add video");
      }
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setProgress(null);
    setBusy(false);
  };

  return (
    <div className="rounded-ctl border border-rule p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{slot.label}</h3>
        <span className="text-xs text-concrete">{slot.aspect}</span>
      </div>
      {slot.text && (
        <p className="mt-1 text-sm text-concrete" dir="auto">
          Text: {slot.text}
        </p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-plaster">Prompt</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-ctl bg-ash p-3 text-xs text-concrete">{prompt}</pre>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <Copy text={prompt} label="Copy prompt" />
        <a href={FLOW} target="_blank" rel="noreferrer" className="text-ultra hover:underline">
          Open Flow
        </a>
        {slot.kind === "image" && (
          <a href={CHATGPT} target="_blank" rel="noreferrer" className="text-ultra hover:underline">
            Open ChatGPT
          </a>
        )}
        <select aria-label="Made with" className="w-auto py-1 text-sm" value={madeWith} onChange={(e) => setMadeWith(e.target.value)}>
          {slot.kind === "video" ? (
            <>
              <option>Veo (Flow)</option>
              <option>Real footage</option>
            </>
          ) : (
            <>
              <option>Nano Banana (Flow)</option>
              <option>ChatGPT image</option>
              <option>Real photo</option>
            </>
          )}
        </select>
        <label className={`mb-0 cursor-pointer rounded-ctl bg-ultra px-3.5 py-2 text-sm font-medium text-white ${busy ? "working opacity-60" : ""}`}>
          Upload result
          <input type="file" className="hidden" disabled={busy} accept={slot.kind === "video" ? "video/mp4,video/quicktime" : "image/png,image/jpeg,image/webp"} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {slot.kind === "image" && (
        <div
          tabIndex={0}
          role="button"
          aria-label={`Paste image for ${slot.label}`}
          onPaste={(e) => {
            const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
            if (f) {
              e.preventDefault();
              setMadeWith("ChatGPT image");
              upload(f, "ChatGPT image");
            } else setErr("No image on the clipboard. In ChatGPT, use the copy button under the image, then click here and press Ctrl+V.");
          }}
          className="mt-3 cursor-text rounded-ctl border border-dashed border-rule px-3 py-2 text-sm text-concrete focus:border-ultra focus:outline-none"
        >
          Or click here and press Ctrl+V to paste an image copied from ChatGPT
        </div>
      )}
      {progress && <p className="mt-2 text-sm text-concrete">{progress}</p>}
      <ErrorNote msg={err} />
      {media.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {media.map((m) => (
            <MediaCard key={m.id} m={m} slotText={slot.text} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function useBlobUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (path)
      downloadFile(path)
        .then((b) => setUrl((u = URL.createObjectURL(b))))
        .catch(() => setUrl(null));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [path]);
  return url;
}

function MediaCard({ m, slotText, onChange }: { m: Media; slotText: string; onChange: () => void }) {
  const { brand } = useBrand();
  const url = useBlobUrl(m.storage_path);
  const baseUrl = useBlobUrl(m.kind === "image" ? m.base_path : null);
  const [compose, setCompose] = useState(false);
  const f = m.fidelity ?? {};
  const status =
    f.method === "pixel"
      ? f.pass
        ? `Your files pasted from the originals and verified${f.finalised ? " — text added, re-verified" : ""}`
        : "Locked file check failed — don't post this"
      : f.method === "overlay"
      ? "Logo burned on from your original file"
      : "";
  const ext = m.kind === "video" ? "mp4" : "png";
  return (
    <div className="rounded-ctl border border-rule p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-concrete">
        <span>{m.made_with}</span>
        <Status s={m.status} />
      </div>
      {url && m.kind === "image" && <img src={url} alt="" className="w-full rounded-ctl" />}
      {url && m.kind === "video" && <video src={url} controls playsInline className="w-full rounded-ctl" />}
      {status && <p className={`mt-2 text-xs ${f.pass === false ? "text-brick" : "text-moss"}`}>{status}</p>}
      {m.note && <p className="mt-1 text-xs text-ochre">{m.note}</p>}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {url && (
          <a href={url} download={`temporary-${m.slot}-${m.id.slice(0, 6)}.${ext}`} className="text-ultra">
            Download
          </a>
        )}
        {m.kind === "image" && m.status === "done" && !f.finalised && (
          <button className="text-ultra" onClick={() => setCompose(!compose)}>
            {compose ? "Close text editor" : "Add text"}
          </button>
        )}
        <button
          className="text-concrete hover:text-brick"
          onClick={async () => {
            await removeFiles([m.storage_path ?? "", m.base_path && m.base_path !== m.storage_path ? m.base_path : ""]);
            await remove(brand.id, "media", m.id, "remove visual");
            onChange();
          }}
        >
          Remove
        </button>
      </div>
      {compose && baseUrl && (
        <div className="mt-3">
          <Composer
            media={m}
            imageUrl={baseUrl}
            initialText={slotText}
            onSaved={() => {
              setCompose(false);
              onChange();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ written content

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm text-concrete">{label}</p>
      {children}
    </div>
  );
}

function Block({ text }: { text: string }) {
  return (
    <div className="rounded-ctl border border-rule p-3">
      <Text>{text}</Text>
      <div className="mt-2">
        <Copy text={text} />
      </div>
    </div>
  );
}

function Caption({ o }: { o: any }) {
  const full = [o.caption, (o.hashtags ?? []).map((h: string) => (h.startsWith("#") ? h : "#" + h)).join(" ")].filter(Boolean).join("\n\n");
  return (
    <>
      {full && (
        <Field label="Caption">
          <Block text={full} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {o.pinned_comment && (
          <Field label="Pinned comment">
            <Text>{o.pinned_comment}</Text>
          </Field>
        )}
        {(o.cta || o.final_cta) && (
          <Field label="Call to action">
            <Text>{o.cta || o.final_cta}</Text>
          </Field>
        )}
        {o.metric && (
          <Field label="Success measured by">
            <Text>{o.metric}</Text>
          </Field>
        )}
      </div>
    </>
  );
}

function OutputView({ format, o }: { format: string; o: any }) {
  if (format === "reel")
    return (
      <Panel className="space-y-5">
        <Field label="Hooks (first second)">
          <ul className="space-y-1">
            {(o.hooks ?? []).map((h: string, i: number) => (
              <li key={i} dir="auto" className={h === o.chosen_hook ? "text-plaster" : "text-concrete"}>
                {h === o.chosen_hook ? "Chosen: " : ""}
                {h}
              </li>
            ))}
          </ul>
        </Field>
        <Field label={`Script · ${o.duration_s ?? "?"}s`}>
          <Block text={o.script ?? ""} />
        </Field>
        <Field label="Shots">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <tbody>
                {(o.shots ?? []).map((s: any, i: number) => (
                  <tr key={i} className="border-b border-rule align-top">
                    <td className="w-16 py-2 pr-3 text-concrete">{s.t}</td>
                    <td className="py-2 pr-3" dir="auto">
                      {s.visual}
                      <span className="block text-xs text-concrete">{s.camera}</span>
                    </td>
                    <td className="py-2 text-ultra" dir="auto">
                      {s.on_screen_text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sound">
            <Text>{o.sound ?? ""}</Text>
          </Field>
          <Field label="Editing rhythm">
            <Text>{o.editing_rhythm ?? ""}</Text>
          </Field>
        </div>
        {o.needs_real_footage && (
          <Field label="Film this for real (AI must not fake it)">
            <ul className="list-disc space-y-1 pl-5 text-ochre">
              {(o.real_footage_shotlist ?? []).map((s: string, i: number) => (
                <li key={i} dir="auto">
                  {s}
                </li>
              ))}
            </ul>
          </Field>
        )}
        <Caption o={o} />
      </Panel>
    );
  if (format === "carousel")
    return (
      <Panel className="space-y-5">
        {o.audience_problem && (
          <Field label="Why people will care">
            <Text>{o.audience_problem}</Text>
          </Field>
        )}
        <Field label="Cover options">
          <ul className="space-y-1">
            {(o.hooks ?? []).map((h: string, i: number) => (
              <li key={i} dir="auto">
                {h}
              </li>
            ))}
          </ul>
        </Field>
        <div className="space-y-2">
          {(o.slides ?? []).map((s: any) => (
            <div key={s.n} className="grid grid-cols-[32px_1fr] gap-3 rounded-ctl border border-rule p-3">
              <span className="wide text-lg text-concrete">{s.n}</span>
              <div>
                <Text className="font-medium">{s.copy ?? ""}</Text>
                <p className="mt-1 text-xs text-concrete" dir="auto">
                  {s.purpose} — {s.visual}
                </p>
              </div>
            </div>
          ))}
        </div>
        {o.swipe_reason && (
          <Field label="Reason to keep swiping">
            <Text>{o.swipe_reason}</Text>
          </Field>
        )}
        <Caption o={o} />
      </Panel>
    );
  if (format === "founder_video")
    return (
      <Panel className="space-y-5">
        <Field label="Concept">
          <Text>{o.concept ?? ""}</Text>
        </Field>
        {o.doctrine_line && (
          <Field label="The line people should remember">
            <Text className="wide text-lg">{o.doctrine_line}</Text>
          </Field>
        )}
        <div className="space-y-2">
          {(o.scenes ?? []).map((sc: any) => (
            <div key={sc.n} className="grid grid-cols-[48px_1fr] gap-3 rounded-ctl border border-rule p-3">
              <span className="wide text-concrete">
                {sc.n}
                <span className="block text-xs">{(sc.n - 1) * 10}–{sc.n * 10}s</span>
              </span>
              <div className="space-y-1 text-sm">
                <p className="text-xs uppercase text-concrete">{sc.purpose}</p>
                <Text className="font-medium">{sc.voiceover ?? ""}</Text>
                {sc.on_screen_text && (
                  <p className="text-ultra" dir="auto">
                    {sc.on_screen_text}
                  </p>
                )}
                <p className="text-concrete" dir="auto">
                  {sc.visual}
                </p>
                <p className="text-xs text-concrete">
                  Starts: {sc.start_frame} · Ends: {sc.end_frame}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Music">
            <Text>{o.music ?? ""}</Text>
          </Field>
          <Field label="Sound design">
            <Text>{o.sound_design ?? ""}</Text>
          </Field>
        </div>
        <Caption o={o} />
      </Panel>
    );
  if (format === "motion_carousel")
    return (
      <Panel className="space-y-5">
        <Field label={`Concept · ${o.bpm ?? "?"} BPM`}>
          <Text>{o.concept ?? ""}</Text>
        </Field>
        <Field label="What travels from slide to slide">
          <Text>{o.through_line ?? ""}</Text>
        </Field>
        <div className="space-y-2">
          {(o.slides ?? []).map((s: any) => (
            <div key={s.n} className="grid grid-cols-[32px_1fr] gap-3 rounded-ctl border border-rule p-3">
              <span className="wide text-lg text-concrete">{s.n}</span>
              <div className="space-y-1 text-sm">
                <Text className="font-medium">{s.copy ?? ""}</Text>
                <p className="text-concrete" dir="auto">
                  Motion: {s.motion}
                </p>
                <p className="text-concrete" dir="auto">
                  Into next: {s.transition_out}
                </p>
                {(s.sfx ?? []).length > 0 && <p className="text-xs text-ultra">Sound: {(s.sfx ?? []).join(" · ")}</p>}
              </div>
            </div>
          ))}
        </div>
        <Field label="Music">
          <Text>{o.music ?? ""}</Text>
        </Field>
        <p className="text-sm text-concrete">Motion slides are rendered by Claude as short videos with sound. Ask Claude in your session to render this carousel, then upload each slide here.</p>
        <Caption o={o} />
      </Panel>
    );
  if (format === "story")
    return (
      <Panel className="space-y-2">
        {(o.frames ?? []).map((f: any) => (
          <div key={f.n} className="grid grid-cols-[32px_1fr] gap-3 rounded-ctl border border-rule p-3">
            <span className="wide text-lg text-concrete">{f.n}</span>
            <div>
              <p className="text-xs text-concrete">{f.type}</p>
              <Text className="font-medium">{f.text ?? ""}</Text>
              {f.sticker && (
                <p className="mt-1 text-sm text-ultra" dir="auto">
                  Sticker: {f.sticker}
                </p>
              )}
            </div>
          </div>
        ))}
        {o.goal && <p className="pt-2 text-sm text-concrete">Goal: {o.goal}</p>}
      </Panel>
    );
  return (
    <Panel className="space-y-4">
      <Text className="wide text-xl font-semibold">{o.headline ?? ""}</Text>
      <Text>{o.copy ?? ""}</Text>
      <Caption o={o} />
    </Panel>
  );
}
