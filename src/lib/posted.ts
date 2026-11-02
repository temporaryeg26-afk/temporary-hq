/**
 * NO REPEATS — every topic/hook already posted on Instagram lives in the "posted" table.
 * HQ checks every new piece against it (Must fix unless the piece says why it repeats on purpose),
 * and every prompt (week command, employees, Council) gets the list so nothing is written twice.
 */
import { insert, list, newId, now } from "./store";
import type { ContentItem } from "./types";

export type Posted = { id: string; date: string; format: string; topic: string; hook: string; source: "instagram" | "hq"; content_id?: string; created_at: string };

export const loadPosted = (brandId: string) => list<Posted>(brandId, "posted").catch(() => [] as Posted[]);

// Words that appear everywhere and say nothing about the topic.
const STOP = new Set(
  ("و في من على عن الى إلى لو اللي ده دي دا ان إن انت إنت انتو إنتوا مش هو هي هم احنا إحنا بس كل حاجة حاجه يعني عشان علشان لما ما مع او أو لا لأ اه آه بقى كده كدا " +
    "the and for you your our are not with this that what why how get just only one all its it's is to of in on a an be do " +
    "temporary tempo براند مصري مصرية ستريت وير streetwear cairo egypt egyptian القاهرة هودي هوديز كروونيك تيشيرت تيشيرتات قطعة قطع hoodie crewneck tee " +
    "تابع ابعتها ابعت لصاحبك صاحبك احفظها احفظ اكتب الكومنت follow save send comment نوفمبر ٢٣ 23 23.11 ٢٣.١١ drop دروب").split(/\s+/),
);

export function tokens(s: string): Set<string> {
  const t = String(s ?? "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // harakat, tatweel
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^(ال|و|ب|ل|ف)(?=\p{L}{3,})/u, ""))
    .filter((w) => w.length >= 3 && !STOP.has(w));
  return new Set(t);
}

/** Share of the smaller text's meaningful words that also appear in the other one. */
export function overlap(a: string, b: string) {
  const A = tokens(a), B = tokens(b);
  if (A.size < 2 || B.size < 2) return { score: 0, shared: [] as string[] };
  const shared = [...A].filter((w) => B.has(w));
  return { score: shared.length / Math.min(A.size, B.size), shared };
}

/** The closest already-posted piece, if it looks like the same idea. */
export function repeatOf(item: { title?: string; output?: any }, posted: Posted[]) {
  const o = item.output ?? {};
  const mine = [item.title, o.hook, o.hook_en, o.headline, (o.caption_ar ?? "").split("\n")[0]].filter(Boolean).join(" ");
  let best: { p: Posted; score: number; shared: string[] } | null = null;
  for (const p of posted) {
    if (item.output && p.content_id && (item as any).id === p.content_id) continue;
    const r = overlap(mine, `${p.topic} ${p.hook}`);
    if (r.shared.length >= 3 && r.score >= 0.5 && (!best || r.score > best.score)) best = { p, ...r };
  }
  return best;
}

/** Block for prompts: the full list of what is already out there. */
export function postedBlock(posted: Posted[]) {
  if (!posted.length) return "";
  const rows = [...posted].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 120)
    .map((p) => `- ${p.date || "?"} ${p.format}: ${p.topic}${p.hook ? ` — «${p.hook.slice(0, 90)}»` : ""}`).join("\n");
  return `ALREADY POSTED ON INSTAGRAM — NEVER REPEAT any of these topics, hooks, angles, tips or the same idea in another format (a care tip posted as a static is still posted). The ONLY exception: a deliberate repeat to emphasise something important — then add "repeat_reason": "why it must be said again" to that piece. HQ blocks repeats without a reason.\n${rows}`;
}

/** Called when a piece is marked as posted, so the list keeps itself up to date. */
export async function recordPosted(brandId: string, item: ContentItem) {
  const o = item.output ?? {};
  const row: Posted = { id: newId(), date: item.scheduled_for, format: item.format, topic: item.title, hook: String(o.hook ?? o.headline ?? "").slice(0, 200), source: "hq", content_id: item.id, created_at: now() };
  await insert(brandId, "posted", row, `posted: ${item.title}`);
}
