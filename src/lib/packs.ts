/**
 * PACKS — the copy/paste bridge to Claude, ChatGPT and Flow.
 * Each pack is a complete, self-contained instruction you paste into claude.ai or chatgpt.com.
 * The answer comes back as JSON, which the site checks and saves.
 */
import type { AdRecord, Brand, ContentItem, Doctrine, Plan, Product, Research, ResearchReport, ResearchType, Session } from "./types";
import { skillsSheet } from "./agency";

// ------------------------------------------------------------------ helpers

export function extractJSON<T = any>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body) as T;
  } catch {
    const a = body.indexOf("{");
    const b = body.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(body.slice(a, b + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error("That answer isn't valid JSON. Copy the whole reply (including the ```json block) and paste again. If it was cut off, ask the AI: \"continue the JSON\".");
  }
}

const JSON_TAIL = `\n\nREPLY FORMAT: answer with ONE JSON object inside a single \`\`\`json code block. Nothing before or after it.`;

export function catalogueText(products: Product[]): string {
  if (!products.length) return "CATALOGUE: (no products yet)";
  return (
    "CATALOGUE (the ONLY source of truth for prices, specs and availability):\n" +
    products
      .map((p) => {
        const price = p.price_confirmed && p.price_egp != null ? `EGP ${p.price_egp}` : "PRICE NOT CONFIRMED — never state a price";
        return `- [${p.code}] ${p.name} | ${p.category ?? ""} | ${price} | status: ${p.status} | edition ${p.edition_limit ?? "?"}, sold ${p.sold_count} | sizes: ${
          p.sizes?.join(", ") || "not confirmed"
        } | colours: ${p.colors?.join(", ") || "not confirmed"} | verified specs: ${p.specs || "NONE — make no material claims"} | role: ${p.content_role}`;
      })
      .join("\n")
  );
}

export const DOCTRINE_FIELDS: [keyof Doctrine, string, string][] = [
  ["belief", "Core belief", "The one idea the brand exists for."],
  ["manifesto", "Manifesto", "The short text people could quote and repeat."],
  ["for_who", "Who it's for", "The people who already think like us — and why."],
  ["enemy", "What we stand against", "An idea, habit or mindset — never a person or a competitor."],
  ["promise", "Our promise", "What a follower and a buyer get from us."],
  ["voice", "Voice", "How we sound: rhythm, language mix, attitude."],
  ["words_we_use", "Words & phrases we own", "Recurring lines and coined words."],
  ["words_we_never_use", "Words we never use", "Clichés and tones that break the brand."],
  ["symbols", "Symbols & visual codes", "Mask, numbers, colours, gestures, recurring images."],
  ["rituals", "Rituals", "Things followers do: replies, codes, signs, drop-day habits."],
  ["signature_series", "Signature series", "Recurring formats that belong only to us."],
  ["future_vision", "Where we're going", "The future the brand is building — chapters, drops, the bigger story."],
];

export function doctrineText(d?: Doctrine | null) {
  if (!d) return "";
  const lines = DOCTRINE_FIELDS.filter(([k]) => (d[k] ?? "").toString().trim()).map(([k, label]) => `- ${label}: ${(d[k] as string).trim()}`);
  return lines.length ? `DOCTRINE (the brand's worldview — every piece must express it):\n${lines.join("\n")}` : "";
}

export function brandHeader(brand: Brand) {
  return `${brand.context.trim()}\n${doctrineText(brand.doctrine)}\nORDER FORM: ${brand.order_form_url ? brand.order_form_url : "Google Forms link in bio — say 'link in bio' / 'اللينك في البايو'"}`;
}

/** Short version of the newest research report, sent with every pack. */
export function reportDigest(r: Research | null | undefined, max = 1800): string {
  if (!r || r.kind !== "report") return "";
  const t = r.content as ResearchReport;
  const age = Math.round((Date.now() - new Date(r.created_at).getTime()) / 86400000);
  return [
    `MARKET RESEARCH (${age} days old, ${t.complaints?.length ?? 0} real complaints):`,
    ...(t.summary ?? []).slice(0, 10).map((x) => `- ${x}`),
    "TOP COMPLAINTS: " + (t.themes ?? []).slice(0, 8).map((x) => `${x.theme} (${x.count})`).join(", "),
    "OUR GAP: " + (t.gap ?? ""),
    "KNOW-BEFORE-YOU-PAY CHECKLIST: " + (t.checklist ?? []).map((c) => c.check).join("; "),
    "BUYER FEARS: " + (t.buyer?.fears ?? []).join("; "),
  ]
    .join("\n")
    .slice(0, max);
}

export function researchDigest(lab: Research | null | undefined, max = 2200): string {
  if (!lab) return "No research yet — work from brand fundamentals.";
  const rep = reportDigest(lab.report ?? (lab.kind === "report" ? lab : null));
  if (lab.kind === "report") return rep.slice(0, max);
  return (rep ? rep + "\n\n" : "") + trendDigest(lab, Math.max(800, max - rep.length));
}

function trendDigest(lab: Research, max: number): string {
  const t = lab.content ?? {};
  const age = Math.round((Date.now() - new Date(lab.created_at).getTime()) / 86400000);
  return [
    `TREND LAB (${age} days old): ${t.big_picture ?? ""}`,
    "RIDE: " + (t.ride ?? []).map((r: any) => `${r.trend} → ${r.our_take}`).join(" | "),
    "OUR INVENTED TRENDS: " + (t.invent ?? []).map((i: any) => `${i.name}: ${i.concept} (people join by: ${i.mechanic})`).join(" | "),
    "MOMENTS: " + (t.moments ?? []).map((m: any) => `${m.date} ${m.moment} → ${m.idea}`).join(" | "),
    "AVOID: " + (t.avoid ?? []).join("; "),
    "BUYERS: " + (t.pricing_and_buyer_notes ?? ""),
  ]
    .join("\n")
    .slice(0, max);
}

const ASSET_RULES = `LOCKED FILES (logo, product artwork, founder mask, product photos) are NEVER drawn by an AI. Image/video prompts must never ask for the logo, the brand name, lettering, the mask or a garment print. Leave clean empty space where they go and list them in "overlays" — the site pastes the ORIGINAL files on top, pixel for pixel. Image/video prompts are written in ENGLISH.`;

// ------------------------------------------------------------------ 1. research (ChatGPT or Claude, web search ON)

export const LENSES: { key: string; title: string; q: string }[] = [
  { key: "global-streetwear", title: "Global streetwear & fashion", q: "What is rising in global streetwear and fashion in the last 60 days: silhouettes, fits, colours, graphics/print styles, fabrics, styling, drop culture, campaigns that worked and why." },
  { key: "egypt-scene", title: "Egypt streetwear & youth culture", q: "What young Egyptians in Cairo (Zamalek, Maadi, New Cairo, Sheikh Zayed) wear and talk about now; local premium streetwear landscape and typical EGP price levels; current cultural references, memes, slang. Describe factually — never criticise other brands." },
  { key: "instagram", title: "Instagram formats & algorithm", q: "Which Reels, carousel and Stories formats, hooks, editing styles and audio types perform now for fashion brands; recent Instagram product/algorithm changes that affect reach and sales." },
  { key: "egypt-calendar", title: "Upcoming moments in Egypt", q: "Cultural, religious, seasonal, academic, sports, concert/event and shopping moments in Egypt for the next 60 days, with dates." },
  { key: "egypt-buyers", title: "How Egyptians buy clothes online", q: "How Egyptians buy clothing via Instagram now: objections, trust, sizing worries, payment (cash on delivery, InstaPay, wallets), delivery and return expectations, what makes them actually order." },
  { key: "drop-culture", title: "Limited drops & community", q: "Limited-edition, numbered, collectible, QR/membership and community mechanics working for independent fashion brands now; what audiences respond to and what feels fake." },
];

export function researchPack(brand: Brand): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are the RESEARCH TEAM for ${brand.name}, a premium conceptual limited-edition streetwear brand from Egypt. Today is ${today}.

USE YOUR WEB SEARCH. Research each topic below on the live internet. Prefer sources from the last 60 days. Be specific: names, numbers, dates. If something is unclear, say "unclear" — never invent.

${LENSES.map((l, i) => `${i + 1}. [${l.key}] ${l.title}: ${l.q}`).join("\n")}

For each topic give 6-10 findings.
JSON shape:
{"scans":[{"topic":"global-streetwear","title":"...","summary":"3-4 sentences","findings":[{"insight":"","evidence":"specific facts","relevance":"why it matters for this brand","strength":"rising|peak|fading|steady"}],"sources":[{"title":"","url":""}]}]}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 2. trend lab (manager)

export function labPack(brand: Brand, products: Product[], scans: Research[]): string {
  const compact = scans
    .map(
      (s) =>
        `## ${s.title} (${s.created_at.slice(0, 10)})\n${s.content?.summary ?? ""}\n` +
        (s.content?.findings ?? [])
          .slice(0, 8)
          .map((f: any) => `- [${f.strength}] ${f.insight} — ${f.evidence}`.slice(0, 300))
          .join("\n")
    )
    .join("\n\n");
  return `You are the HEAD OF MARKETING for ${brand.name}. Your research team scanned the live internet (below). Turn it into strategy.

${brandHeader(brand)}

${catalogueText(products)}

RESEARCH:
${compact}

Only ride trends that fit the brand (premium, mysterious, individualistic). Never copy or attack competitors. No fake scarcity or discounts.
INVENT original trends: recurring series, rituals, participation mechanics, visual codes or phrases the audience can adopt and spread — things that can become "a TEMPORARY™ thing". Make them specific and executable in Egypt.

JSON shape:
{"big_picture":"4-6 sentences","ride":[{"trend":"","why_now":"","our_take":"how we do it our way","format":"reel|carousel|story|static|series","risk":""}],"invent":[{"name":"","concept":"","mechanic":"how people join in","why_it_spreads":"","first_post":"","cadence":"","measure":""}],"moments":[{"date":"YYYY-MM-DD","moment":"","idea":""}],"avoid":[""],"pricing_and_buyer_notes":"","next_research":[""]}
3-6 ride, 3-5 invent, all relevant moments.${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 3. plan (manager)

export function planPack(brand: Brand, products: Product[], lab: Research | null, goal: string, days: number, history: Plan[]): string {
  return `You are the HEAD OF MARKETING (the manager) for ${brand.name}. You set the goal and the direction. ChatGPT (your worker) will write every script, caption and prompt from your briefs, so keep each brief SHORT — one line per field. Do not write the content yourself.

${brandHeader(brand)}

${catalogueText(products)}

LATEST INTERNET RESEARCH (use it: ride the right trends, launch at least one of our invented trends as a recurring series, hook into upcoming Egyptian moments):
${researchDigest(lab)}

PREVIOUS PLANS: ${history.map((p) => `${p.created_at.slice(0, 10)} ${p.title} — ${p.goal}`).join(" | ") || "none (first plan)"}

TASK: plan the next ${days} days.
Owner's goal: ${goal || "Build curiosity and belief, then turn interest into orders for available products."}

Plan for real commercial results (qualified DMs, order-form visits, delivered orders), not vanity. Respect the pillar split, weekly rhythm and monthly arc. Direct-response posts only for products with status "available"; others only in teasers without prices. Set needs_real_footage=true whenever fit, on-body or garment-detail truth is needed. About one story set every 2 days.
FORMATS: "founder_video" = a 60-second masked-founder film made of 6 connected 10-second scenes (one per week is plenty; it carries the doctrine). "motion_carousel" = a carousel where every slide moves, with music and sound effects on the beat, and slides that visually flow into each other (aim for 1-2 per week; they are made in code, so they can be bold). "doctrine" pillar = posts that teach the worldview (beliefs, symbols, rituals, signature series) so people follow the idea, not just the clothes.
Do not only follow trends: plan at least one piece per week that could START a trend — a new format, ritual, phrase or visual code that belongs to the brand.

JSON shape:
{"title":"campaign name","goal":"one measurable goal","strategy":"3-5 sentences","weeks":[{"week":1,"focus":"","notes":""}],"kpis":[""],
"items":[{"day":1,"format":"reel|carousel|static|story|founder_video|motion_carousel","pillar":"discovery|philosophy|product|community|conversion|doctrine","product_code":"03 or null","audience":"1|2|3|4","direction":"A|B|C","objective":"","angle":"the idea in one line","hook_direction":"","cta":"","post_time":"HH:MM Cairo time, the best hour for this audience and format","needs_real_footage":false}]}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 4. write (worker, ChatGPT)

export const FORMAT_SPECS: Record<string, string> = {
  reel: `{"hooks":["3 first-second hooks"],"chosen_hook":"","duration_s":15,"script":"voiceover/dialogue in natural Egyptian Arabic (brand name in English)","subtitles":[""],"shots":[{"t":"0-2s","visual":"","camera":"","on_screen_text":""}],"sound":"commercially licensable direction","editing_rhythm":"","video_prompt":"ENGLISH, vertical 9:16, one continuous scene, no logo/brand text/prints, founder only as a masked silhouette from behind or in shadow","overlays":[{"asset_kind":"logo","position":"top-right","width_pct":16}],"needs_real_footage":false,"real_footage_shotlist":[""],"caption":"","hashtags":["5-8"],"cta":"","pinned_comment":"","metric":""}`,
  carousel: `{"audience_problem":"","hooks":["3 cover headlines"],"slides":[{"n":1,"purpose":"","copy":"exact short slide text","visual":"","image_prompt":"ENGLISH, 4:5, clean negative space for text, no logo/text/prints"}],"swipe_reason":"","final_cta":"","overlays":[{"asset_kind":"logo","position":"bottom-right","width_pct":14}],"caption":"","hashtags":[""],"pinned_comment":"","metric":""}  (6-9 slides, slide 1 = cover)`,
  static: `{"headline":"","copy":"","visual":"","image_prompt":"ENGLISH, 4:5, no logo/text/prints","overlays":[{"asset_kind":"logo","position":"bottom-right","width_pct":14}],"caption":"","hashtags":[""],"cta":"","metric":""}`,
  founder_video: `{"concept":"the one idea of the film","doctrine_line":"the line people should remember","voiceover_language":"Egyptian Arabic","scenes":[{"n":1,"seconds":10,"purpose":"hook|tension|turn|reveal|belief|call","voiceover":"exact words for these 10s","on_screen_text":"","visual":"what we see","start_frame":"exact description of the first frame (must match the previous scene's end_frame)","end_frame":"exact description of the last frame (the next scene starts here)","camera":"","video_prompt":"ENGLISH, vertical 9:16, ONE continuous 10-second shot, founder only as a masked silhouette from behind or in shadow, no logo/brand text/prints"}],"music":"commercially licensable direction + BPM","sound_design":"","overlays":[{"asset_kind":"mask","position":"center","width_pct":30},{"asset_kind":"logo","position":"top-right","width_pct":14}],"caption":"","hashtags":[""],"cta":"","pinned_comment":"","metric":""}  (EXACTLY 6 scenes of 10 seconds; scene N's start_frame continues scene N-1's end_frame so the 6 clips cut together as one film)`,
  motion_carousel: `{"concept":"","bpm":110,"music":"mood + instruments (royalty-free / made by us)","palette":["hex colours"],"through_line":"the visual element that travels from slide to slide (a line, a ball, the mask, a number) so the carousel feels like one piece","slides":[{"n":1,"seconds":6,"copy":"exact short slide text","motion":"what moves, how, and on which beat","transition_out":"how this slide hands over to the next one","sfx":["sound effect on beat X"],"image_prompt":"ENGLISH 4:5 background only if a photo is needed, else empty"}],"swipe_reason":"","overlays":[{"asset_kind":"logo","position":"bottom-right","width_pct":14}],"caption":"","hashtags":[""],"cta":"","pinned_comment":"","metric":""}  (6-10 slides, slide 1 = cover, every slide moves; Claude renders them as videos)`,
  story: `{"frames":[{"n":1,"type":"poll|question|clip|info|order_steps|reminder","text":"","sticker":"poll options / question / link","visual":"","image_prompt":"ENGLISH, 9:16, no logo/text/prints"}],"overlays":[{"asset_kind":"logo","position":"top-left","width_pct":12}],"goal":"","metric":""}  (3-6 frames)`,
};

export function writePack(brand: Brand, products: Product[], items: ContentItem[], lab: Research | null): string {
  const formats = Array.from(new Set(items.map((i) => i.format)));
  const jobs = items.map((i) => {
    const p = products.find((x) => x.id === i.product_id);
    return {
      id: i.id,
      format: i.format,
      pillar: i.pillar,
      product: p ? `[${p.code}] ${p.name}` : null,
      brief: i.brief,
      ...(i.revision_note ? { CHANGES_REQUIRED: i.revision_note, previous_draft: JSON.stringify(i.output ?? {}).slice(0, 2500) } : {}),
    };
  });
  return `You are the CONTENT PRODUCER for ${brand.name}. Turn each brief from the head of marketing into finished, publish-ready content. Write like the best creative studio in Cairo: sharp, premium, culturally natural, never cringe.

${brandHeader(brand)}

${catalogueText(products)}

CURRENT TRENDS (use where they fit):
${researchDigest(lab, 1400)}

${ASSET_RULES}

RULES: no discounts or urgency tricks; no remaining-stock numbers; no website (orders = Google Form in bio); prices exactly as in the catalogue and only when the piece is about that product; never invent materials, sizes, colours, member benefits, testimonials or delivery terms — write [CONFIRM: ...] instead; captions in Egyptian Arabic with English accents where premium; brand name exactly "TEMPORARY™". Where CHANGES_REQUIRED is present, apply it.

OUTPUT SHAPE PER FORMAT:
${formats.map((f) => `${f}: ${FORMAT_SPECS[f]}`).join("\n")}

BRIEFS:
${JSON.stringify(jobs, null, 1)}

After writing, score each piece honestly 1-10 (hook strength, one clear idea, on-brand voice, right CTA, would a buyer move closer to ordering) and list issues.

JSON shape:
{"items":[{"id":"<same id>","output":{ ...the format shape... },"self_check":{"score":8,"issues":[""]}}]}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 5. final review (manager)

export function excerpt(o: Record<string, any> | null, max = 650) {
  if (!o) return "";
  const parts: string[] = [];
  for (const k of ["chosen_hook", "headline", "script", "slides", "frames", "copy", "caption", "cta", "final_cta"]) {
    const v = o[k];
    if (!v) continue;
    if (k === "slides" || k === "frames") parts.push(`${k}: ${(v as any[]).map((s) => s.copy ?? s.text).join(" / ")}`);
    else parts.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  return parts.join(" | ").slice(0, max);
}

export function reviewPack(brand: Brand, items: ContentItem[]): string {
  const rows = items.map((i) => ({
    id: i.id,
    format: i.format,
    pillar: i.pillar,
    angle: i.brief?.angle,
    self_score: i.qa?.score,
    rule_flags: i.rule_flags.map((f) => f.rule),
    draft: excerpt(i.output),
  }));
  return `You are the HEAD OF MARKETING for ${brand.name}, doing the final review of drafts your team wrote. You see compact summaries. Approve what serves the goal and the brand; send back what doesn't with a ONE-line instruction. Be decisive.
Brand: premium, mysterious, individualistic, Egyptian Arabic voice. Never discount or urgency tricks; never invented stock, specs or benefits; Instagram → Google Form only.

DRAFTS:
${JSON.stringify(rows, null, 1)}

JSON shape:
{"verdicts":[{"id":"<same id>","decision":"approve|revise","note":"one line"}],"memo":"2-3 sentences of direction for the team"}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 6. visuals (Flow / ChatGPT images)

export function imagePromptFor(prompt: string, aspect: "4:5" | "9:16" | "1:1") {
  return `${prompt.trim()}

Aspect ratio ${aspect === "4:5" ? "4:5 portrait" : aspect === "9:16" ? "9:16 vertical" : "1:1 square"}. Photographic, premium, intentional lighting, refined colour grade.
Do NOT include any logo, brand name, letters, words, numbers or graphic prints. Leave clean empty space in the ${aspect === "9:16" ? "top-right corner" : "bottom-right corner"} for a logo that will be added later.`;
}

export function videoPromptFor(prompt: string) {
  return `${prompt.trim()}

Vertical 9:16. One continuous shot. No logos, no brand names, no on-screen text, no garment prints or graphics. Any masked figure appears only as a silhouette or from behind.`;
}

export function photoEditPrompt(instruction: string) {
  return `Edit this photo: ${instruction.trim()}.
Keep the garment, its print, any logo and any mask EXACTLY as they are — same position, size, shape and colours. Do not move, redraw or retouch them. Keep the photo the same size and framing. Only change what was asked.`;
}

// ------------------------------------------------------------------ 7. knowledge file for Claude / ChatGPT Projects (chat)

export function knowledgeFile(brand: Brand, products: Product[], plan: Plan | null, lab: Research | null, approved: ContentItem[]) {
  return `# ${brand.name} — team knowledge (exported ${new Date().toISOString().slice(0, 10)})

You are part of the ${brand.name} marketing team. Claude is the head of marketing; ChatGPT is the content producer. Answer in the language the owner writes in. Never promise guaranteed sales or virality.

## Brand bible
${brandHeader(brand)}

## ${catalogueText(products)}

## Current plan
${plan ? `${plan.title} — ${plan.goal}\n${plan.data?.strategy ?? ""}\n${(plan.data?.weeks ?? []).map((w) => `Week ${w.week}: ${w.focus} — ${w.notes}`).join("\n")}` : "No plan yet."}

## Latest trend research
${researchDigest(lab, 4000)}

## Recently approved content
${approved.slice(0, 30).map((i) => `- ${i.scheduled_for} ${i.format}: ${i.title}`).join("\n") || "None yet."}
`;
}

// ------------------------------------------------------------------ 8. doctrine (manager)

export function doctrinePack(brand: Brand, products: Product[], lab: Research | null, ownerNotes: string): string {
  const current = doctrineText(brand.doctrine);
  return `You are the BRAND STRATEGIST and cultural architect for ${brand.name}. Build (or sharpen) the brand DOCTRINE: the worldview that makes people follow the idea first and buy the clothes second. Think like the founders of movements and cult brands, not like an ad agency. Be original, specific to Egypt and to this brand, and future-facing: we want to create trends, not follow them.

${brand.context.trim()}

${catalogueText(products)}

${current ? "CURRENT DOCTRINE (improve it, keep what is strong):\n" + current : "No doctrine yet — create it."}

LATEST RESEARCH:
${researchDigest(lab, 1500)}

OWNER'S NOTES: ${ownerNotes || "none"}

RULES: the enemy is an idea or mindset, never a person, group or competitor. No fake claims about the products. Write in the language each field naturally belongs in (Egyptian Arabic for lines people repeat, English where premium).

JSON shape:
{${DOCTRINE_FIELDS.map(([k]) => `"${k}":""`).join(",")},"first_posts":["3 post ideas that would introduce this doctrine"]}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 9. session review (manager)

export function sessionPack(brand: Brand, items: ContentItem[], plans: Plan[], last: Session | null, days: number, notes: string): string {
  const since = last ? new Date(last.created_at).getTime() : 0;
  const recent = items.filter((i) => new Date(i.updated_at || i.created_at).getTime() >= since);
  const count = (s: string) => recent.filter((i) => i.status === s).length;
  const posted = recent.filter((i) => i.status === "published").map((i) => `${i.scheduled_for} ${i.format}/${i.pillar}: ${i.title}`);
  return `You are the HEAD OF MARKETING for ${brand.name}. This is our ${days}-day production session. Review the last period honestly, check we stayed true to the doctrine, and set the direction for the next ${days} days. Think bigger than trends: what could we start that others will copy?

${brandHeader(brand)}

LAST SESSION: ${last?.review ? `${last.created_at.slice(0, 10)} — focus: ${last.review.next_focus}; goal: ${last.review.next_goal}` : "none (first session)"}
LATEST PLAN: ${plans[0] ? `${plans[0].title} — ${plans[0].goal}` : "none"}
SINCE THEN: ${recent.length} pieces touched — posted ${count("published")}, approved ${count("approved")}, waiting for the owner ${count("needs_you")}, unwritten ${count("brief")}, rejected ${count("rejected")}.
POSTED:
${posted.slice(0, 40).join("\n") || "nothing posted yet"}

OWNER'S RESULTS & NOTES (followers, DMs, orders, what people said): ${notes || "none given — ask for them in next_focus if needed"}

JSON shape:
{"wins":[""],"misses":[""],"lessons":[""],"doctrine_check":"are we expressing the doctrine? where not?","bold_bets":["2-4 trend-starting ideas for the next period"],"next_focus":"one sentence","next_goal":"the goal to paste into the plan, measurable"}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ 10. media buying (manager)

const AD_RULES = `HONEST ADS: never fake testimonials or reviews; an AI or masked character may PRESENT the product but must never pretend to be a real customer who bought it; no fake urgency, fake stock counts or invented discounts; prices only as in the catalogue; follow Meta's rules for AI-generated content (label it where required). Your real logo, artwork and garments are pasted on top of any AI visual.`;

export function adsPack(brand: Brand, products: Product[], items: ContentItem[], budget: number | null, goal: string, days: number, last: AdRecord | null): string {
  const strong = items
    .filter((i) => i.status === "published" || i.status === "approved")
    .slice(-25)
    .map((i) => `- [${i.id.slice(0, 8)}] ${i.scheduled_for} ${i.format}/${i.pillar}: ${i.title}${i.qa ? ` (score ${i.qa.score})` : ""}`);
  return `You are the MEDIA BUYER for ${brand.name} on Instagram/Facebook (Meta Ads Manager), in Egypt. Plan paid promotion for the next ${days} days. Be specific and practical for a small premium brand: few campaigns, clear tests, clear rules for when to cut or scale.

${brandHeader(brand)}

${catalogueText(products)}

BUDGET: ${budget ? `EGP ${budget} for the whole period` : "not set — propose a lean budget and say why"}
GOAL: ${goal || "followers who care, Instagram messages and order-form visits that turn into orders"}
CONTENT WE CAN BOOST (approved or posted):
${strong.join("\n") || "none yet — propose the creatives to make"}
LAST AD REVIEW: ${last?.data?.summary ?? "none"}

${AD_RULES}

Include an AD TEST KIT: 5-10 short ad versions (different hooks and angles, 9:16, 10-20 seconds) the team can make for free in Google Flow, each with exact script and on-screen text.

JSON shape:
{"strategy":"3-5 sentences","campaigns":[{"name":"","objective":"Awareness|Engagement|Messages|Traffic|Sales","daily_egp":0,"days":0,"audience":"locations (Cairo areas/Egypt), ages, interests, lookalikes/retargeting","placements":"","creative":"which post id or which test","why":""}],"tests":[{"name":"","hook":"first 2 seconds","angle":"","format":"reel|story","product_code":"03 or null","script":"exact words","on_screen_text":"","caption":"","cta":""}],"measure":["what to watch: e.g. cost per message, thumb-stop rate"],"rules":["when to cut, keep or scale"]}${JSON_TAIL}`;
}

export function adReviewPack(brand: Brand, plan: AdRecord | null, results: string): string {
  return `You are the MEDIA BUYER for ${brand.name}. Review the ad results below (pasted from Meta Ads Manager) against the plan, and decide for each campaign or ad: cut, keep, scale or fix. Be blunt and specific. Egypt, EGP.

PLAN: ${plan ? JSON.stringify({ strategy: plan.data.strategy, campaigns: plan.data.campaigns, rules: plan.data.rules }).slice(0, 3500) : "no saved plan"}

RESULTS (as pasted by the owner):
${results}

${AD_RULES}

JSON shape:
{"summary":"2-4 sentences","verdicts":[{"campaign":"name","action":"cut|keep|scale|fix","why":"","change":"exact change: budget, audience, creative, hook"}],"next_moves":["3-5 concrete steps for this week"]}${JSON_TAIL}`;
}

// ------------------------------------------------------------------ RESEARCH (lives in HQ → Strategy → Research)

export const RESEARCH_SCOPES: [string, string][] = [
  ["market", "Market"],
  ["complaints", "Complaints"],
  ["trends", "Trends"],
  ["competitors", "Competitors (internal only)"],
  ["buyer", "Buyer"],
  ["seasons", "Seasons"],
];

export const RESEARCH_PLATFORMS = [
  "Facebook public groups and posts",
  "Reddit (r/Egypt, r/cairo)",
  "TikTok comments under Egyptian local-brand videos",
  "Instagram comments under Egyptian local-brand posts",
  "Google reviews of local brand shops",
  "X (Twitter)",
];

export const DEFAULT_RESEARCH_QUERIES = [
  "براند محلي غالي",
  "البراندات المحلية غالية والخامة وحشة",
  "الطباعة باظت بعد الغسيل",
  "التيشيرت كش بعد الغسيل",
  "المقاسات مش مظبوطة براند",
  "براندات مصرية سعرها",
  "لوكال براند نصب",
  "local brand masr ghali",
  "local brands egypt overpriced",
  "local brand egypt quality",
  "egyptian streetwear brands review reddit",
  "limited edition local brand egypt fake",
];

export function deepResearchPrompt(type: ResearchType, scope: string[], topic: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const focus =
    type === "custom"
      ? `FOCUS ONLY ON: ${topic}`
      : type === "quick"
      ? "QUICK REFRESH: only what changed in the last 30 days — new trends, new complaints, new moments."
      : "FULL RESEARCH.";
  return `Use deep research / web search. Today is ${today}. ${focus}
Areas: ${scope.join(", ")}.

Research the Egyptian local streetwear market for a new Cairo streetwear brand (Instagram: 0 followers, building trust before launching):
1. Market 2025–now: size of the local-brand scene, typical EGP prices for tees and hoodies, where people buy (Instagram, pop-ups, websites).
2. Buyers 18–30 in Cairo and Alexandria: who they are, money, where they spend time online, what makes them trust a NEW brand, what makes them feel scammed.
3. Real complaints about local brands (quality vs price, print cracking, thin fabric, wrong sizes, fake "limited", copied designs, delivery and returns). Quote real posts/comments with links. Never invent quotes.
4. Instagram and TikTok behaviour in Egypt now: formats, times, what gets shared.
5. Seasons and moments in the next 6 months (Ramadan, summer, back-to-school, sales, events) with dates.
6. Risks for a new brand.
Give sources (title + URL) for every claim. Say "unclear" when unsure.`;
}

export function reportPack(brand: Brand, type: ResearchType, scope: string[], topic: string, searchNotes: string, deepNotes: string, last: Research | null): string {
  const lastText = last ? reportDigest(last, 1500) : "No earlier report.";
  return `${skillsSheet("director")}
You are now writing the RESEARCH REPORT from the Researcher's raw notes.

BRAND:
${brandHeader(brand)}

RESEARCH TYPE: ${type}${topic ? ` — topic: ${topic}` : ""}. AREAS: ${scope.join(", ")}.

RAW NOTES 1 — real complaints and posts found on the web (quote | platform | theme | link):
${searchNotes.trim() || "(none pasted)"}

RAW NOTES 2 — deep research answer:
${deepNotes.trim() || "(none pasted)"}

LAST REPORT (for comparison):
${lastText}

RULES: use ONLY what is in the notes — never invent a quote, number or link. Remove private people's names. Competitor brand names may appear only inside complaints/sources (internal), never in "what_we_do" or the checklist. Count complaints per theme from the notes.

JSON shape:
{"title":"short title","summary":["10 short lines, the most important first"],
"buyer":{"who":"","age":"","money":"","hangouts":"","fears":[""]},
"themes":[{"theme":"price vs quality","count":0,"what_people_say":"","what_we_do":"how TEMPORARY answers this honestly"}],
"complaints":[{"quote":"short real quote","platform":"","theme":"","link":""}],
"gap":"what nobody in the market owns — our position",
"checklist":[{"check":"fabric weight (GSM)","how_to_check":"what a buyer should ask or look at","why":""}],
"trends":[{"trend":"","note":""}],"seasons":[{"when":"date","moment":"","idea":""}],
"ig_rules":["Instagram rules that matter now"],"risks":[""],"sources":[{"title":"","url":""}]}${JSON_TAIL}`;
}
