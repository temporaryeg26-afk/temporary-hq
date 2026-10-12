import { useEffect, useState } from "react";
import { useBrand } from "../App";
import { Button, Copy, ErrorNote, Loading, PageHead, Status, useAsync } from "../components/ui";
import { loadContent, log } from "../lib/data";
import { currentLogin, downloadFile } from "../lib/github";
import { list, now, update } from "../lib/store";
import type { ContentItem, Media } from "../lib/types";

/** Best default posting times in Cairo, used when the plan didn't set one. */
const DEFAULT_TIME: Record<string, string> = {
  reel: "20:00",
  founder_video: "20:30",
  carousel: "13:00",
  motion_carousel: "14:00",
  static: "18:00",
  story: "21:00",
};

const FORMAT_NAME: Record<string, string> = {
  reel: "Reel",
  founder_video: "Founder film",
  carousel: "Carousel",
  motion_carousel: "Motion carousel",
  static: "Image post",
  story: "Story set",
};

const tag = (h: string) => (h.startsWith("#") ? h : "#" + h.replace(/\s+/g, ""));
const slotOrder = (s: string | null) => Number((s ?? "").match(/\d+/)?.[0] ?? 0);

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

export default function WeekPage() {
  const { brand } = useBrand();
  const today = new Date().toISOString().slice(0, 10);
  const [days, setDays] = useState(7);
  const [showPosted, setShowPosted] = useState(false);

  const { data, error, reload } = useAsync(async () => {
    const [items, media] = await Promise.all([loadContent(brand.id), list<Media>(brand.id, "media")]);
    return { items, media: media.filter((m) => m.status === "done" && m.storage_path) };
  }, [brand.id]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;

  const end = addDays(today, days);
  const inRange = data.items
    .filter((i) => i.scheduled_for >= today && i.scheduled_for < end && i.status !== "rejected")
    .filter((i) => showPosted || i.status !== "published")
    .sort((a, b) => (a.scheduled_for + timeOf(a)).localeCompare(b.scheduled_for + timeOf(b)));
  const overdue = data.items.filter((i) => i.scheduled_for < today && (i.status === "approved" || i.status === "needs_you"));

  const byDay = new Map<string, ContentItem[]>();
  for (const i of inRange) byDay.set(i.scheduled_for, [...(byDay.get(i.scheduled_for) ?? []), i]);

  const ready = inRange.filter((i) => i.status === "approved").length;
  const waiting = inRange.filter((i) => i.status !== "approved" && i.status !== "published").length;

  return (
    <div>
      <PageHead title="This week" sub="Everything to post, in order. Download the file, copy the caption and hashtags, schedule it at the time shown, then press Posted.">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
        </select>
      </PageHead>

      <p className="mb-6 text-sm text-concrete">
        {ready} ready to schedule · {waiting} not approved yet{overdue.length ? ` · ${overdue.length} from earlier days still waiting` : ""} ·{" "}
        <button className="text-ultra hover:underline" onClick={() => setShowPosted(!showPosted)}>
          {showPosted ? "hide posted" : "show posted"}
        </button>
      </p>

      {inRange.length === 0 && (
        <div className="rounded-panel border border-rule bg-soot p-6">
          <p className="font-semibold">Nothing planned for these days yet.</p>
          <p className="mt-1 text-sm text-concrete">
            Start a <a href="#/session" className="text-ultra">Session</a> to plan the next 1–2 weeks.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {[...byDay.entries()].map(([day, items]) => (
          <section key={day}>
            <h2 className="wide mb-3 font-semibold">{dayLabel(day)}</h2>
            <div className="space-y-4">
              {items.map((i) => (
                <PostCard key={i.id} item={i} media={data.media.filter((m) => m.content_id === i.id).sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))} onChange={reload} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function timeOf(i: ContentItem): string {
  const t = String(i.brief?.post_time ?? "").match(/\d{1,2}:\d{2}/)?.[0];
  return t ? t.padStart(5, "0") : DEFAULT_TIME[i.format] ?? "19:00";
}

function PostCard({ item, media, onChange }: { item: ContentItem; media: Media[]; onChange: () => void }) {
  const { brand } = useBrand();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const o = item.output ?? {};
  const caption = String(o.caption ?? "");
  const hashtags = ((o.hashtags ?? []) as string[]).filter(Boolean).map(tag).join(" ");
  const approved = item.status === "approved";
  const posted = item.status === "published";

  const markPosted = async () => {
    setBusy(true);
    setErr(null);
    try {
      await update<ContentItem>(brand.id, "content", item.id, { status: "published", updated_at: now() }, `posted: ${item.title}`);
      await log(brand.id, `${currentLogin()} posted "${item.title}".`);
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const next = !item.output
    ? "Not written yet — run Content → write the batch."
    : !approved && !posted
    ? "Not approved yet — open it, check it and press Approve."
    : media.length === 0 && item.format !== "story"
    ? "No visuals yet — open it and make the images / video."
    : null;

  return (
    <article className={`rounded-panel border bg-soot p-5 ${posted ? "border-rule opacity-60" : approved ? "border-moss/50" : "border-rule"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-concrete">
            <span className="text-plaster">{timeOf(item)}</span> · {FORMAT_NAME[item.format] ?? item.format} · {item.pillar}
          </p>
          <h3 className="mt-1 font-semibold" dir="auto">
            {item.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Status s={item.status} />
          <a href={`#/content/${item.id}`} className="text-sm text-ultra hover:underline">
            Open
          </a>
        </div>
      </header>

      {next && <p className="mt-3 text-sm text-ochre">{next}</p>}

      {media.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {media.map((m, n) => (
            <MediaThumb key={m.id} m={m} n={n + 1} title={item.title} />
          ))}
        </div>
      )}

      {(caption || hashtags) && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
          {caption && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-concrete">Caption</span>
                <Copy text={caption} label="Copy caption" />
              </div>
              <p dir="auto" className="whitespace-pre-wrap rounded-ctl border border-rule p-3 text-sm">
                {caption}
              </p>
            </div>
          )}
          {hashtags && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-concrete">Hashtags</span>
                <Copy text={hashtags} label="Copy hashtags" />
              </div>
              <p className="rounded-ctl border border-rule p-3 text-sm text-ultra">{hashtags}</p>
            </div>
          )}
        </div>
      )}

      {o.pinned_comment && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-concrete">Pin this comment:</span>
          <span dir="auto">{o.pinned_comment}</span>
          <Copy text={String(o.pinned_comment)} />
        </div>
      )}

      <ErrorNote msg={err} />
      {!posted && (
        <div className="mt-4">
          <Button kind={approved ? "primary" : "plain"} onClick={markPosted} busy={busy} disabled={!approved} title={approved ? "" : "Approve it first"}>
            Posted / scheduled
          </Button>
        </div>
      )}
    </article>
  );
}

function MediaThumb({ m, n, title }: { m: Media; n: number; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    downloadFile(m.storage_path!)
      .then((b) => setUrl((u = URL.createObjectURL(b))))
      .catch(() => setUrl(null));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [m.storage_path]);
  const ext = m.kind === "video" ? "mp4" : "png";
  const name = `${title.replace(/[^\w؀-ۿ]+/g, "-").slice(0, 40)}-${n}.${ext}`;
  return (
    <div className="w-32 shrink-0">
      <div className="aspect-[4/5] overflow-hidden rounded-ctl border border-rule bg-ash">
        {url && m.kind === "image" && <img src={url} alt="" className="h-full w-full object-cover" />}
        {url && m.kind === "video" && <video src={url} muted playsInline className="h-full w-full object-cover" />}
      </div>
      {url ? (
        <a href={url} download={name} className="mt-1 block text-xs text-ultra">
          Download {n}
        </a>
      ) : (
        <span className="mt-1 block text-xs text-concrete">Loading…</span>
      )}
    </div>
  );
}
