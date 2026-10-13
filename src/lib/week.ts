/**
 * RUN AGENCY — one command → a full week (or two) of content, from Claude OR ChatGPT.
 * The command carries every rule; the answer is ONE JSON that HQ imports in one click.
 * Same format whoever writes it, so you can switch to ChatGPT any time Claude hits a limit.
 */
import { log } from "./data";
import { checkRules } from "./rules";
import { insert, newId, now } from "./store";
import type { Brand, ContentItem, Product } from "./types";

export type RunConfig = {
  start: string; // YYYY-MM-DD
  days: number; // 7 or 14
  language: "bilingual" | "masri" | "english";
  products: string[]; // product codes ([] = brand/trust content only)
  objective: string;
  package: { static: boolean; carousel: boolean; stories: boolean; reel: boolean };
  writer: "claude" | "chatgpt";
  notes: string;
};

export const DEFAULT_RUN: RunConfig = {
  start: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  days: 7,
  language: "bilingual",
  products: [],
  objective: "Trust before launch: get Cairo Gen Z / millennials to stop, watch to the end, save, send and follow.",
  package: { static: true, carousel: true, stories: true, reel: true },
  writer: "claude",
  notes: "",
};

const RULES = `NON-NEGOTIABLE RULES
- Brand: TEMPORARY™ — premium limited-edition Egyptian streetwear. Luxury, dark, confident. "EVERYTHING IS TEMPORARY."
- Audience: Cairo Gen Z and millennials (18–30). Location for every post: "Cairo, Egypt".
- Language: natural Egyptian Arabic (Masri, not MSA) + sharp English. Every slide/frame has Arabic + an English line.
- HOOKS: frame 1 / slide 1 must stop the scroll in under 1 second (curiosity gap, bold claim we can back, a question the viewer already has, a visual pattern break). Never generic ("Day 1:", "Introducing…", "New post"). Every hook in the pack must be different.
- KEEP THEM TO THE END: every slide/scene adds ONE new thing; the last one pays off the hook + asks to save/send.
- HASHTAGS: 5–8 per post = one English set + one Arabic set: #TEMPORARY + campaign tag (#اعرف_قبل_ما_تدفع) + Cairo/local (#Cairo #القاهرة #CairoStreetwear) + streetwear (#ستريت_وير #EgyptianStreetwear #براند_مصري) + 1–2 topic tags. Never giant generic tags, never #TEMPORARY_HQ.
- NO prices, costs, margins or discounts in any content. No discounts ever.
- NO invented facts: no fake reviews, sold-out claims, stock numbers, delivery/return policies or manufacturing claims. Only confirmed specs. Talking about OTHER brands' prices use "5,000 EGP" as the example. Never name competitors.
- Edition truth you MAY use: 200 pieces per design, the same edition is never restocked. FOUNDER = 1 piece from any of the 3 Founder Drops; FOUNDER ELITE = 1 piece from each.
- FOUNDER character: a masked character made with AI tools. Never claim he is real or filmed live. Never mention AI in captions. Add "ai_label": true on any piece showing him.
- Posting times (Cairo): carousel 13:00–14:00, static 18:00–19:00, Reel 20:00–21:00, stories 21:00–23:00.`;

const SCHEMA = `ANSWER = ONE JSON object, nothing else:
{
  "week_theme": "…",
  "research": [{ "finding": "…", "source": "url", "use": "how we use it" }],
  "items": [
    {
      "date": "YYYY-MM-DD", "time": "HH:MM",
      "format": "static" | "motion_carousel" | "story" | "reel",
      "pillar": "discovery" | "philosophy" | "product" | "community" | "conversion" | "doctrine",
      "product_code": null or a code,
      "title": "short internal title",
      "hook": "the scroll-stopper (Arabic)", "hook_en": "…",
      // static:
      "headline": "on-image Arabic text", "headline_en": "…", "image_prompt": "full luxury art-direction prompt for ChatGPT, 4:5, keep bottom-right 220px empty for the logo",
      // motion_carousel (5–8 slides): *word* = accent, ~word~ = crossed out
      "slides": [{ "copy": "Arabic", "copy_en": "English", "seconds": 5, "visual": "what the motion scene shows (acts out the point; different style per carousel)" }],
      // story (3–5 frames):
      "frames": [{ "text": "Arabic", "text_en": "English", "sticker": "Poll: … / … | Question: … | Link | none" }],
      // reel (6–12s):
      "scenes": [{ "seconds": 2, "on_screen_text": "Arabic", "on_screen_en": "English", "visual": "what we see" }], "video_prompt": "Flow/Veo prompt",
      "caption_ar": "Masri caption, line 1 = hook", "caption_en": "English caption",
      "hashtags_en": ["#…"], "hashtags_ar": ["#…"],
      "pinned_comment": "…", "cta": "…", "location": "Cairo, Egypt", "ai_label": false,
      "why": "one line: why this will work"
    }
  ]
}`;

export function weekCommand(cfg: RunConfig, brand: Brand, products: Product[]) {
  const fmts = [cfg.package.static && "1 static post", cfg.package.carousel && "1 motion carousel", cfg.package.stories && "1 story set", cfg.package.reel && "1 Reel"].filter(Boolean).join(" + ");
  const prods = cfg.products.length ? products.filter((p) => cfg.products.includes(p.code)).map((p) => `${p.code}: ${p.name}${p.specs ? ` — confirmed specs: ${p.specs}` : ""}`).join("\n") : "No product focus (trust / brand phase).";
  const d = brand.doctrine;
  const head =
    cfg.writer === "claude"
      ? `TEMP. HQ — RUN AGENCY (Claude). Do the whole chain in one go: check competitors' latest public posts + trends, plan, write, hook-check, render the motion carousels/Reels/stories with the HQ motion engine, then import everything into TEMP. HQ in ONE upload. Only stop for things that need me.`
      : `You are the full creative team of TEMPORARY™ (researcher, strategist, copywriter, Egyptian-Arabic editor, hook critic).
STEP 1 — RESEARCH (use web search): what Egyptian / Cairo streetwear accounts posted in the last 2–3 weeks (formats, hooks, what got visibly more likes/comments, what people ask or complain about in comments), plus current Instagram Reel/carousel formats that are working. Put findings with links in "research".
STEP 2 — write the content pack below from that research. Check every hook against the rules before answering.`;
  return `${head}

PERIOD: ${cfg.start} for ${cfg.days} days. EVERY DAY: ${fmts}.
LANGUAGE: ${cfg.language}. OBJECTIVE: ${cfg.objective}
PRODUCTS:
${prods}
${d ? `BRAND BOOK: belief: ${d.belief} | promise: ${d.promise} | voice: ${d.voice} | never say: ${d.words_we_never_use}` : ""}
${cfg.notes ? `OWNER NOTES: ${cfg.notes}` : ""}

${RULES}

${SCHEMA}`;
}

/** Parse the JSON answer (tolerates ```json fences and text around it). */
export function parseWeek(text: string): any {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("No JSON found in the answer.");
  const j = JSON.parse(t.slice(a, b + 1));
  if (!Array.isArray(j.items) || !j.items.length) throw new Error("The answer has no items.");
  return j;
}

const FMT: Record<string, ContentItem["format"]> = { static: "static", image: "static", motion_carousel: "motion_carousel", carousel: "motion_carousel", story: "story", stories: "story", reel: "reel" };

export async function importWeek(brand: Brand, products: Product[], json: any, writer: string) {
  const rows: ContentItem[] = [];
  for (const it of json.items) {
    const format = FMT[String(it.format ?? "").toLowerCase()] ?? "static";
    const hashtags = [...(it.hashtags_en ?? []), ...(it.hashtags_ar ?? [])].map((h: string) => (h.startsWith("#") ? h : "#" + h));
    const output: Record<string, any> = {
      ...it,
      caption: [it.caption_ar, it.caption_en].filter(Boolean).join("\n\n"),
      hashtags,
      chosen_hook: it.hook,
      post_time: it.time,
      ...(format === "motion_carousel" ? { template: "luxury", bpm: 110, slides: (it.slides ?? []).map((s: any) => ({ ...s, seconds: Number(s.seconds) || 5 })) } : {}),
    };
    const code = it.product_code ?? null;
    rows.push({
      id: newId(),
      plan_id: null,
      product_id: products.find((p) => p.code === code)?.id ?? null,
      format,
      pillar: (it.pillar ?? "discovery") as ContentItem["pillar"],
      title: String(it.title ?? it.hook ?? "Piece").slice(0, 140),
      scheduled_for: String(it.date ?? "").slice(0, 10),
      brief: { post_time: it.time, location: it.location ?? "Cairo, Egypt", week_theme: json.week_theme, made_by: writer, why: it.why, research: json.research ?? [] },
      output,
      rule_flags: checkRules(output, products as any, code),
      qa: null,
      review: null,
      revision_note: null,
      status: "needs_you",
      revisions: 0,
      created_at: now(),
      updated_at: now(),
    });
  }
  await insert(brand.id, "content", rows, `RUN AGENCY: ${rows.length} pieces (${writer})`);
  await log(brand.id, `RUN AGENCY imported ${rows.length} pieces written by ${writer === "chatgpt" ? "ChatGPT" : "Claude"}${json.week_theme ? ` — theme: ${json.week_theme}` : ""}.`);
  return rows.length;
}
