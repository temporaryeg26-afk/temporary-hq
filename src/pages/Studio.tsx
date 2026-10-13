import { useEffect, useMemo, useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, Loading, Status, useAsync } from "../components/ui";
import { loadContent, log } from "../lib/data";
import { currentLogin, downloadFile } from "../lib/github";
import { list, mutate, now } from "../lib/store";
import type { ContentItem, Media } from "../lib/types";
import { missingJobs, renderPiece, RENDERABLE } from "../lib/render";
import { promptsFor } from "../lib/prompts";

/** Default Cairo posting times when the plan didn't set one. */
const DEFAULT_TIME: Record<string, string> = { reel: "20:00", founder_video: "20:30", carousel: "13:00", motion_carousel: "14:00", static: "18:00", story: "21:00" };
const FORMAT_NAME: Record<string, string> = { reel: "Reel", founder_video: "Founder film", carousel: "Carousel", motion_carousel: "Motion carousel", static: "Image post", story: "Stories" };
const FORMAT_DOT: Record<string, string> = { reel: "bg-ultra", founder_video: "bg-brick", carousel: "bg-ochre", motion_carousel: "bg-ochre", static: "bg-moss", story: "bg-concrete" };

const timeOf = (i: ContentItem) => {
  const t = String(i.brief?.post_time ?? i.output?.post_time ?? "").match(/\d{1,2}:\d{2}/)?.[0];
  return t ? t.padStart(5, "0") : DEFAULT_TIME[i.format] ?? "19:00";
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const slotNo = (s: string | null) => Number((s ?? "").match(/\d+/)?.[0] ?? 0);
const tag = (h: string) => (h.startsWith("#") ? h : "#" + h.replace(/\s+/g, ""));

type View = "calendar" | "grid" | "approve";
type Data = { items: ContentItem[]; media: Media[] };

/** Studio: calendar, Instagram grid and approvals — every piece opens as a phone preview you can edit. */
export default function Studio({ view }: { view: View }) {
  const { brand } = useBrand();
  const { data, error, reload } = useAsync<Data>(async () => {
    const [items, media] = await Promise.all([loadContent(brand.id), list<Media>(brand.id, "media")]);
    return { items: items.filter((i) => i.status !== "rejected"), media: media.filter((m) => m.status === "done" && m.storage_path) };
  }, [brand.id]);
  const [open, setOpen] = useState<string | null>(null);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  const mediaOf = (id: string) => data.media.filter((m) => m.content_id === id).sort((a, b) => slotNo(a.slot) - slotNo(b.slot));
  const item = data.items.find((i) => i.id === open) ?? null;

  const needDesign = data.items.filter((i) => RENDERABLE.includes(i.format) && i.output && i.status !== "published" && missingJobs(i, data.media).length > 0);

  return (
    <div>
      {/* auto-render off: you create assets in Claude / ChatGPT / Flow from the prompts */}
      {view === "calendar" && <Calendar items={data.items} onOpen={setOpen} />}
      {view === "grid" && <Grid items={data.items} mediaOf={mediaOf} onOpen={setOpen} />}
      {view === "approve" && <Approvals items={data.items} mediaOf={mediaOf} onChange={reload} />}
      {item && <PreviewModal item={item} media={mediaOf(item.id)} onClose={() => setOpen(null)} onChange={reload} />}
    </div>
  );
}

// ------------------------------------------------------------------ calendar

function Calendar({ items, onOpen }: { items: ContentItem[]; onOpen: (id: string) => void }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const today = iso(new Date());

  const days = useMemo(() => {
    const out: Date[] = [];
    if (mode === "week") {
      const s = new Date(anchor);
      s.setDate(s.getDate() - ((s.getDay() + 1) % 7)); // weeks start Saturday (Egypt)
      for (let i = 0; i < 7; i++) out.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
    } else {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const s = new Date(first);
      s.setDate(s.getDate() - ((s.getDay() + 1) % 7));
      for (let i = 0; i < 42; i++) out.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
    }
    return out;
  }, [mode, anchor]);

  const move = (n: number) => {
    const d = new Date(anchor);
    if (mode === "week") d.setDate(d.getDate() + 7 * n);
    else d.setMonth(d.getMonth() + n);
    setAnchor(d);
  };
  const byDay = (d: string) => items.filter((i) => i.scheduled_for === d).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
  const title = mode === "week" ? `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-concrete">What this is: everything planned, by day. Click a piece to see it as it will look on a phone.</p>
          <h1 className="wide mt-1 text-2xl font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button kind="quiet" onClick={() => move(-1)}>
            ←
          </Button>
          <Button kind="quiet" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button kind="quiet" onClick={() => move(1)}>
            →
          </Button>
          <div className="ml-2 flex overflow-hidden rounded-ctl border border-rule text-sm">
            {(["week", "month"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 capitalize ${mode === m ? "bg-rule text-plaster" : "text-concrete"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-panel border border-rule bg-rule text-sm">
        {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
          <div key={d} className="bg-ash px-2 py-1.5 text-xs text-concrete">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const k = iso(d);
          const list = byDay(k);
          const dim = mode === "month" && d.getMonth() !== anchor.getMonth();
          return (
            <div key={k} className={`min-h-[110px] bg-soot p-1.5 ${mode === "week" ? "min-h-[320px]" : ""} ${dim ? "opacity-40" : ""}`}>
              <p className={`mb-1 text-xs ${k === today ? "font-semibold text-ultra" : "text-concrete"}`}>{d.getDate()}</p>
              <ul className="space-y-1">
                {list.map((i) => (
                  <li key={i.id}>
                    <button onClick={() => onOpen(i.id)} className="w-full rounded-ctl border border-rule bg-ash px-1.5 py-1 text-left hover:border-concrete">
                      <span className="flex items-center gap-1 text-[11px] text-concrete">
                        <span className={`h-1.5 w-1.5 rounded-full ${FORMAT_DOT[i.format] ?? "bg-concrete"}`} />
                        {timeOf(i)} · {FORMAT_NAME[i.format] ?? i.format}
                      </span>
                      {mode === "week" && (
                        <span className="mt-0.5 line-clamp-2 block text-xs" dir="auto">
                          {i.title}
                        </span>
                      )}
                      {i.status === "needs_you" && <span className="mt-0.5 block text-[11px] text-ochre">needs you</span>}
                      {i.status === "approved" && <span className="mt-0.5 block text-[11px] text-moss">approved</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-concrete">
        {Object.entries(FORMAT_NAME).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${FORMAT_DOT[k]}`} /> {v}
          </span>
        ))}
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ Instagram grid preview

function Grid({ items, mediaOf, onOpen }: { items: ContentItem[]; mediaOf: (id: string) => Media[]; onOpen: (id: string) => void }) {
  const { brand } = useBrand();
  const feed = items.filter((i) => i.format !== "story").sort((a, b) => (b.scheduled_for + timeOf(b)).localeCompare(a.scheduled_for + timeOf(a)));
  const posted = feed.filter((i) => i.status === "published").length;
  return (
    <section>
      <p className="text-sm text-concrete">What this is: how the Instagram profile will look once everything planned is posted (newest first). Click a tile to preview, approve, copy the caption and download the files.</p>
      <WeekTools items={items} mediaOf={mediaOf} />
      <div className="mx-auto mt-5 max-w-md rounded-panel border border-rule bg-[#000] pb-1 text-white">
        <div className="flex items-center gap-5 px-4 py-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-rule bg-[#111] text-xl font-bold">T.</div>
          <div className="grid flex-1 grid-cols-3 text-center text-sm">
            <span>
              <b className="block">{posted}</b>posts
            </span>
            <span>
              <b className="block">0</b>followers
            </span>
            <span>
              <b className="block">0</b>following
            </span>
          </div>
        </div>
        <div className="px-4 pb-3 text-sm">
          <p className="font-semibold">{brand.name}</p>
          <p className="text-[#aaa]">EVERYTHING IS TEMPORARY</p>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {feed.map((i) => (
            <button key={i.id} onClick={() => onOpen(i.id)} className="relative aspect-[4/5] overflow-hidden bg-[#111]" title={i.title}>
              <Thumb item={i} media={mediaOf(i.id)[0]} />
              {i.status !== "published" && <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-[#ccc]">{i.scheduled_for.slice(5)}</span>}
            </button>
          ))}
          {feed.length === 0 && <p className="col-span-3 p-6 text-center text-sm text-[#888]">Nothing planned yet.</p>}
        </div>
      </div>
    </section>
  );
}

function Thumb({ item, media }: { item: ContentItem; media?: Media }) {
  const url = useMediaUrl(media);
  if (url && media?.kind === "image") return <img src={url} alt="" className="h-full w-full object-cover" />;
  if (url && media?.kind === "video") return <video src={url} muted playsInline className="h-full w-full object-cover" />;
  const o = item.output ?? {};
  const text = o.slides?.[0]?.copy ?? o.headline ?? o.chosen_hook ?? o.scenes?.[0]?.on_screen_text ?? item.title;
  return (
    <span className="flex h-full w-full flex-col justify-between p-2 text-left">
      <span className="text-[9px] uppercase tracking-wide text-[#888]">{FORMAT_NAME[item.format]}</span>
      <span dir="auto" className="line-clamp-4 text-[11px] font-semibold leading-tight">
        {text}
      </span>
    </span>
  );
}

// ------------------------------------------------------------------ approvals queue

function Approvals({ items, mediaOf, onChange }: { items: ContentItem[]; mediaOf: (id: string) => Media[]; onChange: () => void }) {
  const { brand } = useBrand();
  const queue = items.filter((i) => i.status === "needs_you").sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const [idx, setIdx] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const item = queue[Math.min(idx, queue.length - 1)];

  const decide = async (approve: boolean) => {
    if (!item) return;
    if (!approve && !note.trim()) {
      setErr("Write what to change, so the team knows.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await mutate<ContentItem>(
        brand.id,
        "content",
        (d) => d.map((x) => (x.id !== item.id ? x : approve ? { ...x, status: "approved" as const, updated_at: now() } : { ...x, status: "brief" as const, revision_note: note.trim(), revisions: x.revisions + 1, updated_at: now() })),
        `${approve ? "approved" : "sent back"}: ${item.title}`,
      );
      await log(brand.id, `${currentLogin()} ${approve ? "approved" : "sent back"} "${item.title}".${approve ? "" : " Note: " + note.trim()}`);
      setNote("");
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section>
      <p className="text-sm text-concrete">What this is: pieces the Director passed, waiting for your yes. Approve, or send back with a note.</p>
      {!item ? (
        <p className="mt-6 rounded-panel border border-moss/40 bg-soot p-6 text-moss">Nothing waiting for you.</p>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-[360px_1fr]">
          <Phone item={item} media={mediaOf(item.id)} />
          <div>
            <p className="text-sm text-concrete">
              {Math.min(idx, queue.length - 1) + 1} of {queue.length} · {item.scheduled_for} {timeOf(item)} · {FORMAT_NAME[item.format]}
            </p>
            <h2 className="wide mt-1 text-xl font-semibold" dir="auto">
              {item.title}
            </h2>
            {item.review?.note && (
              <p className="mt-3 rounded-ctl border border-rule p-3 text-sm" dir="auto">
                <span className="text-concrete">Director: </span>
                {item.review.note}
              </p>
            )}
            {item.rule_flags.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-ochre">
                {item.rule_flags.map((f, i) => (
                  <li key={i}>⚑ {f.detail}</li>
                ))}
              </ul>
            )}
            <label htmlFor="anote" className="mt-5 block">
              Note (needed to send back)
            </label>
            <textarea id="anote" dir="auto" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Hook is too soft — open with the price question." />
            <ErrorNote msg={err} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button kind="primary" onClick={() => decide(true)} busy={busy}>
                Approve
              </Button>
              <Button onClick={() => decide(false)} busy={busy}>
                Send back
              </Button>
              <Button kind="quiet" onClick={() => setIdx((idx + 1) % queue.length)}>
                Skip →
              </Button>
              <a href={`#/content/${item.id}`} className="self-center text-sm text-ultra hover:underline">
                Open full piece
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ posting tools (approve, copy, download)

const extOf = (m: Media) => (m.kind === "video" ? "mp4" : "png");
const captionAr = (o: any) => String(o.caption_ar ?? o.caption ?? "");
const captionEn = (o: any) => String(o.caption_en ?? "");
const tagsOf = (o: any) => ((o.hashtags ?? []) as string[]).map(tag).join(" ");
async function saveBlob(path: string, name: string) {
  const b = await downloadFile(path);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function downloadPiece(item: ContentItem, media: Media[]) {
  const base = `TEMPORARY_${item.scheduled_for}_${item.format}`;
  for (const [i, m] of media.entries()) if (m.storage_path) await saveBlob(m.storage_path, `${base}_${String(i + 1).padStart(2, "0")}.${extOf(m)}`);
}
async function setStatus(brandId: string, item: ContentItem, approve: boolean, note: string) {
  await mutate<ContentItem>(
    brandId,
    "content",
    (d) => d.map((x) => (x.id !== item.id ? x : approve ? { ...x, status: "approved" as const, updated_at: now() } : { ...x, status: "brief" as const, revision_note: note, revisions: x.revisions + 1, updated_at: now() })),
    `${approve ? "approved" : "sent back"}: ${item.title}`,
  );
  await log(brandId, `${currentLogin()} ${approve ? "approved" : "sent back"} "${item.title}".${approve ? "" : " Note: " + note}`);
}

function PostActions({ item, media, onChange }: { item: ContentItem; media: Media[]; onChange: () => void }) {
  const { brand } = useBrand();
  const o = item.output ?? {};
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const full = [captionAr(o), captionEn(o), tagsOf(o)].filter(Boolean).join("\n\n");
  const decide = async (approve: boolean) => {
    if (!approve && !note.trim()) return setErr("Write what to change.");
    setBusy(true);
    setErr(null);
    try {
      await setStatus(brand.id, item, approve, note.trim());
      setNote("");
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="mb-4 rounded-panel border border-rule bg-soot p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Copy text={full} label="Copy caption + hashtags" />
        {captionAr(o) && <Copy text={captionAr(o)} label="Copy Masri" />}
        {captionEn(o) && <Copy text={captionEn(o)} label="Copy English" />}
        {tagsOf(o) && <Copy text={tagsOf(o)} label="Copy hashtags" />}
        <span className="text-concrete">📍 {item.brief?.location ?? "Cairo, Egypt"}</span>
        {o.ai_label && <span className="text-ochre">Turn on Instagram's "AI info" label</span>}
        {media.length > 0 && (
          <button className="text-ultra hover:underline" onClick={() => downloadPiece(item, media).catch((e) => setErr(e.message))}>
            Download {media.length} file{media.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
      {promptsFor(item).length > 0 && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="text-xs text-concrete">Make it: copy a prompt, paste it in the tool, then upload the result on the full piece page.</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {promptsFor(item).map((p) => (
              <span key={p.label} className="flex items-center gap-1.5">
                <Copy text={p.text} label={`Copy: ${p.label}`} />
                <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-concrete hover:text-plaster">
                  open {p.tool} ↗
                </a>
              </span>
            ))}
            <a href={`#/content/${item.id}`} className="text-moss hover:underline">
              Upload the result →
            </a>
          </div>
        </div>
      )}
      {item.status !== "published" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.status !== "approved" && (
            <Button kind="primary" busy={busy} onClick={() => decide(true)}>
              Approve
            </Button>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change…" className="min-w-0 flex-1 text-sm" />
          <Button busy={busy} onClick={() => decide(false)}>
            Send back
          </Button>
        </div>
      )}
      <ErrorNote msg={err} />
    </div>
  );
}

function WeekTools({ items, mediaOf }: { items: ContentItem[]; mediaOf: (id: string) => Media[] }) {
  const { brand } = useBrand();
  const today = iso(new Date());
  const weekEnd = iso(new Date(Date.now() + 13 * 86400000));
  const next = items.filter((i) => i.scheduled_for >= today && i.scheduled_for <= weekEnd).sort((a, b) => (a.scheduled_for + timeOf(a)).localeCompare(b.scheduled_for + timeOf(b)));
  const waiting = next.filter((i) => i.status === "needs_you");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const csv = () => {
    const q = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["date", "time", "format", "title", "status", "caption_masri", "caption_english", "hashtags", "location"].join(",")];
    for (const i of next) rows.push([i.scheduled_for, timeOf(i), FORMAT_NAME[i.format], i.title, i.status, captionAr(i.output ?? {}), captionEn(i.output ?? {}), tagsOf(i.output ?? {}), i.brief?.location ?? "Cairo, Egypt"].map(q).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" }));
    a.download = `TEMPORARY_schedule_${today}.csv`;
    a.click();
  };
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-concrete">Next 2 weeks: {next.length} pieces · {waiting.length} waiting for you</span>
      <button className="text-ultra hover:underline" onClick={csv}>
        Download schedule + captions (CSV)
      </button>
      <button className="text-ultra hover:underline" disabled={!!busy} onClick={() => run("dl", async () => { for (const i of next) await downloadPiece(i, mediaOf(i.id)); })}>
        {busy === "dl" ? "Downloading…" : "Download all files"}
      </button>
      {waiting.length > 0 && (
        <button className="text-moss hover:underline" disabled={!!busy} onClick={() => run("ok", async () => { for (const i of waiting) await setStatus(brand.id, i, true, ""); location.reload(); })}>
          {busy === "ok" ? "Approving…" : `Approve all ${waiting.length}`}
        </button>
      )}
      <ErrorNote msg={err} />
    </div>
  );
}

// ------------------------------------------------------------------ phone preview + editing

function PreviewModal({ item, media, onClose, onChange }: { item: ContentItem; media: Media[]; onClose: () => void; onChange: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="mx-auto mt-6 max-w-4xl rounded-panel border border-rule bg-ash p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-concrete">
              {item.scheduled_for} · {timeOf(item)} · {FORMAT_NAME[item.format]}
            </p>
            <h2 className="wide text-lg font-semibold" dir="auto">
              {item.title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Status s={item.status} />
            <button onClick={onClose} className="text-concrete hover:text-plaster" aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        <PostActions item={item} media={media} onChange={onChange} />
        <div className="grid gap-6 md:grid-cols-[360px_1fr]">
          <Phone item={item} media={media} />
          <Editor item={item} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

type Frame = { media?: Media; text: string };

function framesOf(item: ContentItem, media: Media[]): Frame[] {
  const o = item.output ?? {};
  const texts: string[] =
    item.format === "carousel" || item.format === "motion_carousel"
      ? (o.slides ?? []).map((s: any) => s.copy ?? "")
      : item.format === "story"
      ? (o.frames ?? []).map((f: any) => f.text ?? "")
      : item.format === "founder_video"
      ? (o.scenes ?? []).map((s: any) => s.on_screen_text || s.voiceover || "")
      : [o.headline ?? o.chosen_hook ?? ""];
  const n = Math.max(texts.length, media.length, 1);
  return Array.from({ length: n }, (_, i) => ({ media: media[i], text: texts[i] ?? "" }));
}

function Phone({ item, media }: { item: ContentItem; media: Media[] }) {
  const frames = framesOf(item, media);
  const [i, setI] = useState(0);
  const f = frames[Math.min(i, frames.length - 1)];
  const tall = ["reel", "founder_video", "story"].includes(item.format);
  const o = item.output ?? {};
  const caption = String(o.caption ?? "");
  const tags = ((o.hashtags ?? []) as string[]).filter(Boolean).map(tag).join(" ");
  const [more, setMore] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border-4 border-[#2a2a2a] bg-black text-white shadow-xl">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#222] text-[10px] font-bold">T.</span>
        <span className="font-semibold">temporary</span>
        <span className="ml-auto text-[#888]">•••</span>
      </div>
      <div className={`relative ${tall ? "aspect-[9/16]" : "aspect-[4/5]"} bg-[#111]`}>
        <FrameView frame={f} format={item.format} />
        {frames.length > 1 && (
          <>
            <button aria-label="Previous" onClick={() => setI(Math.max(0, i - 1))} className="absolute left-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-sm">
              ‹
            </button>
            <button aria-label="Next" onClick={() => setI(Math.min(frames.length - 1, i + 1))} className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-sm">
              ›
            </button>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 text-[11px]">
              {i + 1}/{frames.length}
            </span>
          </>
        )}
      </div>
      {frames.length > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {frames.map((_, n) => (
            <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-[#3b82f6]" : "bg-[#444]"}`} />
          ))}
        </div>
      )}
      {item.format !== "story" && (
        <div className="px-3 pb-4 pt-1 text-[13px]">
          <p className="mb-1 text-lg tracking-widest">♡ ◯ ➤</p>
          <p dir="auto" className={`whitespace-pre-wrap ${more ? "" : "line-clamp-2"}`}>
            <b>temporary</b> {caption || <span className="text-[#777]">No caption yet</span>}
          </p>
          {caption.length > 90 && (
            <button className="text-[#888]" onClick={() => setMore(!more)}>
              {more ? "less" : "more"}
            </button>
          )}
          {tags && <p className="mt-1 text-[#7aa2ff]">{tags}</p>}
          <p className="mt-1 text-[11px] uppercase text-[#777]">
            {new Date(item.scheduled_for + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })} · {timeOf(item)}
          </p>
        </div>
      )}
    </div>
  );
}

function FrameView({ frame, format }: { frame: Frame; format: string }) {
  const url = useMediaUrl(frame.media);
  if (url && frame.media?.kind === "image") return <img src={url} alt="" className="h-full w-full object-cover" />;
  if (url && frame.media?.kind === "video") return <video key={url} src={url} controls playsInline autoPlay muted loop className="h-full w-full object-cover" />;
  return (
    <div className="flex h-full w-full flex-col justify-center p-6">
      <p className="text-[10px] uppercase tracking-widest text-[#666]">{FORMAT_NAME[format]} · visual not made yet</p>
      <p dir="auto" className="mt-3 text-xl font-bold leading-snug">
        {frame.text || "—"}
      </p>
    </div>
  );
}

function useMediaUrl(m?: Media) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let live = true;
    setUrl(null);
    if (m?.storage_path)
      downloadFile(m.storage_path)
        .then((b) => {
          if (live) setUrl((u = URL.createObjectURL(b)));
        })
        .catch(() => setUrl(null));
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [m?.storage_path]);
  return url;
}

function Editor({ item, onChange }: { item: ContentItem; onChange: () => void }) {
  const { brand } = useBrand();
  const o = item.output ?? {};
  const [caption, setCaption] = useState(String(o.caption ?? ""));
  const [tags, setTags] = useState(((o.hashtags ?? []) as string[]).map(tag).join(" "));
  const [pinned, setPinned] = useState(String(o.pinned_comment ?? ""));
  const [day, setDay] = useState(item.scheduled_for);
  const [time, setTime] = useState(timeOf(item));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const versions = item.versions ?? [];

  const save = async (output: Record<string, any>, extra: Partial<ContentItem> = {}, label = "Saved.") => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await mutate<ContentItem>(
        brand.id,
        "content",
        (d) =>
          d.map((x) =>
            x.id !== item.id
              ? x
              : {
                  ...x,
                  ...extra,
                  output,
                  brief: { ...x.brief, post_time: time },
                  versions: x.output ? [{ at: now(), by: currentLogin(), output: x.output }, ...(x.versions ?? [])].slice(0, 15) : x.versions,
                  updated_at: now(),
                },
          ),
        `edit: ${item.title}`,
      );
      setMsg(label);
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4 text-sm">
      {!item.output && <p className="text-ochre">Not written yet — the Copywriter writes it first. You can still change the date and time.</p>}
      <div>
        <label htmlFor="ecap">Caption</label>
        <textarea id="ecap" dir="auto" rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <p className="mt-1 text-xs text-concrete">{caption.length} characters · the first line is the hook people see before “more”.</p>
      </div>
      <div>
        <label htmlFor="etags">Hashtags (3–5 niche ones work best)</label>
        <input id="etags" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <div>
        <label htmlFor="epin">Pinned comment</label>
        <input id="epin" dir="auto" value={pinned} onChange={(e) => setPinned(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="eday">Day</label>
          <input id="eday" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div>
          <label htmlFor="etime">Time (Cairo)</label>
          <input id="etime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          kind="primary"
          busy={busy}
          onClick={() =>
            save(
              { ...o, caption, hashtags: tags.split(/\s+/).filter(Boolean).map((t) => t.replace(/^#/, "")), pinned_comment: pinned, post_time: time },
              { scheduled_for: day },
            )
          }
        >
          Save changes
        </Button>
        {item.format === "founder_video" && item.output && (
          <a href={`#/film/${item.id}`} className="text-ultra hover:underline">
            Open storyboard
          </a>
        )}
        {item.format === "motion_carousel" && item.output && (
          <a href={`#/motion/${item.id}`} className="text-ultra hover:underline">
            Open motion board
          </a>
        )}
        <a href={`#/content/${item.id}`} className="text-ultra hover:underline">
          Open full piece (script, slides, visuals)
        </a>
      </div>
      {RENDERABLE.includes(item.format) && item.output && (
        <Button
          busy={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            setMsg(null);
            try {
              const n = await renderPiece(brand.id, item, (s) => setMsg(s));
              setMsg(`Made ${n} design${n === 1 ? "" : "s"}.`);
              onChange();
            } catch (e) {
              setErr((e as Error).message);
            }
            setBusy(false);
          }}
        >
          Re-make the design
        </Button>
      )}
      {msg && <p className="text-moss">{msg}</p>}
      <ErrorNote msg={err} />
      {versions.length > 0 && (
        <details>
          <summary className="cursor-pointer text-concrete">{versions.length} earlier versions</summary>
          <ul className="mt-2 space-y-2">
            {versions.map((v, n) => (
              <li key={n} className="rounded-ctl border border-rule p-2">
                <div className="flex items-center justify-between gap-2 text-xs text-concrete">
                  <span>
                    {new Date(v.at).toLocaleString("en-GB")} · {v.by}
                  </span>
                  <button className="text-ultra" disabled={busy} onClick={() => save(v.output, {}, "Restored that version.")}>
                    Restore
                  </button>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap" dir="auto">
                  {String(v.output?.caption ?? "")}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ design renderer (typographic posts, carousels, stories, motion slides)

function DesignBar({ items, media, onDone }: { items: ContentItem[]; media: Media[]; onDone: () => void }) {
  const { brand } = useBrand();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    const failed: string[] = [];
    let made = 0;
    for (const [n, it] of items.entries()) {
      try {
        made += await renderPiece(brand.id, it, (s) => setStep(`${n + 1}/${items.length} · ${it.title.slice(0, 40)} — ${s}`), missingJobs(it, media));
      } catch (e) {
        failed.push(`${it.title.slice(0, 40)}: ${(e as Error).message}`);
      }
    }
    await log(brand.id, `${currentLogin()} made ${made} designs with the HQ renderer${failed.length ? `; ${failed.length} pieces need a retry` : ""}.`).catch(() => null);
    setStep(null);
    if (failed.length) setErr(`Made ${made} designs. ${failed.length} ${failed.length === 1 ? "piece" : "pieces"} hit a network error — press Make designs again to finish them (finished slides are kept). ${failed.join(" · ")}`);
    onDone();
    setBusy(false);
  };
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-ultra/40 bg-soot p-4 text-sm">
      <div>
        <p>
          <b>{items.length}</b> written {items.length === 1 ? "piece needs" : "pieces need"} designs (posts, carousels, story frames, motion slides).
        </p>
        <p className="text-xs text-concrete">{step ?? "HQ designs them with exact Arabic type and pastes your real logo. Motion slides record in real time — keep this tab in front."}</p>
        <ErrorNote msg={err} />
      </div>
      <Button kind="primary" onClick={run} busy={busy}>
        Make designs
      </Button>
    </div>
  );
}
