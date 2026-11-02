/**
 * MARKETING INTELLIGENCE COUNCIL — five independent judges review, debate, rebuild and approve every piece.
 * Works through the copy/paste relay (Claude or ChatGPT). HQ does the maths (weights, verdicts, overrides)
 * and the doctrine checker has the last word: a score never overrides a brand rule.
 */
import { log, saveOutput } from "./data";
import { checkRules } from "./rules";
import { list, mutate, newId, now } from "./store";
import type { Brand, ContentItem, Flag, Product } from "./types";
import { METHODS_RULE } from "./methods";

// ------------------------------------------------------------------ the judges

export type JudgeKey = "strategist" | "creative" | "psychologist" | "growth" | "sales";

export const JUDGES: { key: JudgeKey; no: string; name: string; field: string; question: string; authority: string }[] = [
  { key: "strategist", no: "01", name: "Chief Marketing Strategist", field: "Campaign intelligence", question: "Does this move TEMPORARY towards its business goals?", authority: "Rejects content with no clear strategic purpose." },
  { key: "creative", no: "02", name: "Viral Content & Creative Director", field: "Attention engineering", question: "Will people stop scrolling, keep watching and want to share this?", authority: "Rejects content that looks good but doesn't capture attention." },
  { key: "psychologist", no: "03", name: "Consumer Psychologist", field: "Emotion & decision science", question: "What will the audience feel, think and want after seeing this?", authority: "Rejects content with no emotional connection or the wrong trigger." },
  { key: "growth", no: "04", name: "Social Media Growth Engineer", field: "Platform performance", question: "Is this built to perform on the platform where we publish it?", authority: "Rejects content with no plausible distribution." },
  { key: "sales", no: "05", name: "Sales & Conversion Psychologist", field: "Revenue generation", question: "Does this create a genuine reason to buy?", authority: "Rejects attention with no commercial or community objective." },
];

// ------------------------------------------------------------------ scoring

export const CATEGORIES: { key: string; label: string; weight: number }[] = [
  { key: "hook", label: "Hook strength", weight: 15 },
  { key: "retention", label: "Attention & retention", weight: 15 },
  { key: "emotion", label: "Emotional & psychological impact", weight: 15 },
  { key: "brand", label: "Brand identity & differentiation", weight: 10 },
  { key: "audience", label: "Audience relevance", weight: 10 },
  { key: "story", label: "Storytelling & creativity", weight: 10 },
  { key: "share", label: "Shareability & engagement", weight: 10 },
  { key: "sales", label: "Sales & conversion potential", weight: 10 },
  { key: "cta", label: "CTA effectiveness", weight: 5 },
];

/** Category scores 0–10 → total out of 100 (HQ does the maths, not the model). */
export function total(scores: Record<string, number> | null | undefined): number | null {
  if (!scores) return null;
  let t = 0;
  for (const c of CATEGORIES) {
    const v = Number(scores[c.key]);
    if (Number.isNaN(v)) return null;
    t += (Math.max(0, Math.min(10, v)) / 10) * c.weight;
  }
  return Math.round(t);
}

export function band(score: number | null): { label: string; tone: string } {
  if (score == null) return { label: "—", tone: "text-concrete" };
  if (score >= 90) return { label: "EXCEPTIONAL — ready for production", tone: "text-moss" };
  if (score >= 80) return { label: "STRONG — minor refinements", tone: "text-moss" };
  if (score >= 70) return { label: "NEEDS IMPROVEMENT", tone: "text-ochre" };
  if (score >= 60) return { label: "MAJOR RECONSTRUCTION", tone: "text-brick" };
  return { label: "REJECT AND REBUILD", tone: "text-brick" };
}

export type Decision = "APPROVED" | "APPROVED WITH MINOR CHANGES" | "RETURN FOR REVISION" | "REJECTED";

// ------------------------------------------------------------------ campaign data (founder-controlled, editable)

export type Campaign = { reveal: string; drop_open: string; black_friday: string; last_call: string; notes: string };
export const DEFAULT_CAMPAIGN: Campaign = {
  reveal: "2026-11-23",
  drop_open: "2026-11-25",
  black_friday: "2026-11-27",
  last_call: "2026-11-30",
  notes: "No early access. Salaries land around the 25th. Before the reveal: never show the designs — fabric, details, philosophy and teasers only.",
};
export const campaignOf = (b: Brand): Campaign => ({ ...DEFAULT_CAMPAIGN, ...((b.settings as any)?.campaign ?? {}) });

const FALLBACK_PRICES = "Tee 900 EGP · Standard hoodie 1,300 EGP · Premium hoodie 1,500 EGP · Premium crewneck 1,400 EGP";

function pricesOf(products: Product[]): string {
  const p = products.filter((x) => x.price_confirmed && x.price_egp != null).map((x) => `${x.name} ${x.price_egp} EGP`);
  return p.length ? p.join(" · ") : FALLBACK_PRICES;
}

// ------------------------------------------------------------------ records

export type CouncilReview = {
  id: string;
  created_at: string;
  by: string; // claude | chatgpt
  content_id: string | null;
  subject: string; // title / short description
  kind: string; // reel, carousel, story, caption, ad, campaign, idea…
  submitted: any; // what was reviewed (snapshot)
  answer: any; // the council's full JSON
  score_before: number | null;
  score_after: number | null;
  decision: Decision;
  applied: boolean; // improved version saved onto the content piece
  doctrine_flags: Flag[];
  results?: { at: string; numbers: Record<string, number | string> }[];
  feedback?: { at: string; by: string; answer: any }[];
};

export const loadReviews = (brandId: string) => list<CouncilReview>(brandId, "council").catch(() => [] as CouncilReview[]);

// ------------------------------------------------------------------ the master prompt

const COUNCIL_SYSTEM = (brand: Brand, products: Product[]) => {
  const c = campaignOf(brand);
  return `SYSTEM ROLE
You are the TEMPORARY™ MARKETING & CREATIVE INTELLIGENCE COUNCIL: five independent senior experts (strategy, viral content, consumer psychology, platform growth, sales conversion). You do not just evaluate — you challenge, rebuild and approve. You are a demanding professional team, not a supportive audience. If something is weak, say so; if a hook is predictable, replace it; if it looks good but won't produce business results, say that. Never approve content because the founder likes it. Your loyalty is to TEMPORARY's success.

PART 1 — BRAND KNOWLEDGE
- TEMPORARY™ (@temporary_eg) — premium Egyptian limited-edition streetwear. EVERYTHING IS TEMPORARY. NOT FOR EVERYONE.
- Brand look: dark, black/chrome, strong typography, cinematic. Personality: confident, intelligent, mysterious, honest, slightly provocative, never desperate, never cheap-looking, never begging for engagement.
- PRODUCT TRUTH: Founder Drop 1 = 2 designs, BOLD MULTI-COLOUR statement graphics on black (graffiti typography, neon, characters). Never give advice against bold colour, graphics, statement type or loud prints. The brand look is dark; the product is loud.
- Audience: Egyptian Gen Z + millennials 18–30, Cairo / Giza / Alexandria. Language: natural Egyptian Arabic (Masri) + sharp English.
- Prices (founder-controlled, public): ${pricesOf(products)}. 200 pieces per design, never remade. No discounts ever. No artificial price inflation. No fake scarcity or countdowns, no invented reviews/testimonials, no fake sold-out or stock claims.
- Hoodie: heavy-quality fabric, clean hood with no drawstring. Show construction honestly. Unknown specs (GSM, delivery days, stock) = ask or mark UNVERIFIED.
- The masked Founder character is made with AI tools: never claim he is real or filmed live; never mention AI in captions; ai_label true on any piece showing him. Products are always REAL footage.
- Hashtags: max 5, always #temporary_eg. Never name competitors ("some brands", "the market").
- CAMPAIGN (editable data, not assumptions): reveal ${c.reveal} · drop opens ${c.drop_open} · Black Friday ${c.black_friday} (same price, no discount) · last call ${c.last_call}. ${c.notes}

PART 2 — THE FIVE JUDGES (each independent, each can reject in their area)
01 CHIEF MARKETING STRATEGIST — positioning, differentiation, segmentation, campaign architecture, funnels, full-price positioning, community. Asks: why should this exist, who exactly is it for, what belief does it change, what should they do next, does it build brand equity or look generic, is it right for this launch stage? Rejects content with no strategic purpose.
02 VIRAL CONTENT & CREATIVE DIRECTOR — hooks, pattern interrupts, open loops, curiosity gaps, retention, visual storytelling, editing. Judges the first 1–3 seconds, cuts every unnecessary word, finds attention drops. Attention loop (adapt, don't force): 0–2s interruption → 2–5s curiosity → 5–10s development → 10–20s reinforcement → payoff → next action. Never accept "Hey guys / let me tell you / welcome back". A loop must pay off — never promise a reveal that doesn't arrive. Writes 3 alternative hooks whenever the hook is weak.
03 CONSUMER PSYCHOLOGIST — identity, belonging, exclusivity, loss aversion (only true), social proof (only real), curiosity, perceived value, anticipation. For every piece names: primary + secondary emotion, trigger, current belief, new belief, desire, objection, intended outcome. Never shame, fake social pressure, financial anxiety or misleading manipulation — ethical persuasion only.
04 SOCIAL MEDIA GROWTH ENGINEER — Instagram (watch time, likes/reach, sends/reach for non-followers, originality, share rate + skip rate in Insights, Trial Reels, carousels with music, search keywords in captions) and TikTok (opening retention, completion, rewatch, search intent, native style). Separates official platform statements from third-party observations; never guarantees virality; never invents statistics. Defines length, on-screen text, caption structure, testing plan and success metrics.
05 SALES & CONVERSION PSYCHOLOGIST — direct response (Hormozi value equation, Suby, Schwartz awareness levels, Cialdini, Ogilvy, Hopkins — principles, not imitation). Finds the objection addressed, the value shown, friction, the next step in the journey; keeps urgency honest; matches the CTA to the stage (awareness: follow the story · engagement: tell us · consideration: save this · conversion: shop the drop). Never recommends discounts — improves understanding, confidence, desirability and risk reduction instead. Value stacking with real elements only, never invented money values.

PART 3 — PROCESS (run it all yourself, don't ask permission to improve)
1 UNDERSTAND: what it is, platform, audience, campaign stage, desired action, commercial objective. Use what you're given; state safe assumptions; never invent facts.
2 INDEPENDENT JUDGMENT: each judge alone — score /100, works, fails, biggest weakness, biggest opportunity, specific improvements, approve/reject.
3 DEBATE: real disagreements resolved by reasoning (no manufactured agreement). If it stays open, show both and pick the stronger.
4 RECONSTRUCTION: don't say "make the hook stronger" — write it. Rewrite script, scenes, on-screen text, sound, editing, caption, CTA, hashtags, cover. Keep the founder's idea where it has value; don't change things just to look creative.
5 DEVIL'S ADVOCATE: imagine it was published and flopped. Each judge gives the 3 most likely reasons. Fix them in the improved version.
6 FINAL APPROVAL: rescore the improved version, list remaining weaknesses, production requirements, publishing recommendation.

${METHODS_RULE}
Each judge applies the methods in their area: Strategist → Godin (smallest viable audience, who it's NOT for) + HubSpot pillars; Creative Director → Hormozi hook/retain/reward (one retention method, payoff = hook) + Think Media cover/2–5 s hook + vidIQ outlier formats; Psychologist → Godin 'people like us', status, remarkable; Growth Engineer → Neil Patel/Ahrefs social search (keywords in caption line 1, alt text, subtitles) + native TikTok/Shorts + one new feature; Sales → GaryVee jab/right-hook balance + Hormozi proof-promise-plan. The improved version must fill keywords, alt_text, retention_method, intent, series, cover_text, repurpose and distribution.

SCORING: score each category 0–10 (HQ applies the weights): hook 15 · retention 15 · emotion 15 · brand 10 · audience 10 · story 10 · share 10 · sales 10 · cta 5. 90+ exceptional · 80–89 strong · 70–79 needs improvement · 60–69 major reconstruction · <60 reject and rebuild.
MANDATORY OVERRIDES (a score never overrides these): false claim → REJECT · fake scarcity → REJECT · unauthorised design reveal before ${c.reveal} → REJECT · discount → REJECT · wrong price → REJECT · misleading testimonial → REJECT · unsupported product claim → HOLD FOR VERIFICATION (list it in needs_founder).
YOU MAY NOT CHANGE (founder decisions): prices, quantities, restock/discount policy, launch dates, unreleased designs, product specs, official positioning.

ATTENTION WITHOUT INTEREST IS WASTED. INTEREST WITHOUT TRUST IS FRAGILE. TRUST WITHOUT DESIRE DOESN'T SELL. DESIRE WITHOUT A CLEAR NEXT STEP DOESN'T CONVERT.
THE FIVE JUDGES ARE NOT HERE TO PRAISE CONTENT. THEY ARE HERE TO MAKE IT BETTER.`;
};

const ANSWER_SCHEMA = `ANSWER = ONE JSON object, nothing else:
{
  "executive": { "name": "…", "type": "reel|motion_carousel|static|story|founder_video|caption|ad|campaign|idea", "platform": "Instagram|TikTok|both", "objective": "…", "stage": "…", "assessment": "one professional sentence", "assumptions": ["…"] },
  "judges": [ { "key": "strategist|creative|psychologist|growth|sales", "score": 0-100, "works": ["…"], "fails": ["…"], "observations": "…", "biggest_weakness": "…", "biggest_opportunity": "…", "improvements": ["…"], "approve": true|false } ],   // all 5
  "psychology": { "primary_emotion": "…", "secondary_emotion": "…", "trigger": "…", "current_belief": "…", "new_belief": "…", "desire": "…", "objection": "…", "outcome": "…" },
  "debate": [ { "topic": "…", "positions": "who said what", "winner": "judge key", "why": "…" } ],
  "problems": [ { "problem": "…", "impact": "…", "fix": "…" } ],   // top 5, ranked
  "devils_advocate": [ { "key": "judge key", "reasons": ["…","…","…"] } ],
  "scores_before": { "hook":0-10, "retention":0-10, "emotion":0-10, "brand":0-10, "audience":0-10, "story":0-10, "share":0-10, "sales":0-10, "cta":0-10 },
  "hooks": ["option 1","option 2","option 3"], "selected_hook": "…",
  "improved": { /* the COMPLETE production-ready piece in the same fields as the input (hook, hook_en, scenes | slides | frames | clips | headline + image_prompt, video_prompt, caption_ar, caption_en, hashtags_en, hashtags_ar, pinned_comment, cta, cover, sound, editing, alt_hook, ads, departments, ai_label). For a campaign/idea: { "concept","message","audience","positioning","creative_concepts":[…],"sequence":[…],"distribution","conversion_path","kpis":[…] } */ },
  "scores_after": { same 9 keys },
  "remaining_weaknesses": ["…"],
  "production": ["what must be shot / made"],
  "needs_founder": ["facts to verify or decisions only the founder can make"],
  "overrides": [],   // e.g. "fake scarcity", "design reveal", "unsupported claim: GSM" — empty if none
  "prediction": { "metric_to_watch": "…", "expected": "honest range or 'unknown' — never invented stats", "success_looks_like": "…" },
  "decision": "APPROVED | APPROVED WITH MINOR CHANGES | RETURN FOR REVISION | REJECTED",
  "decision_reason": "…"
}`;

/** Strip heavy / internal fields before sending a piece to the council. */
function publicPiece(item: ContentItem) {
  const o = { ...(item.output ?? {}) };
  for (const k of ["research", "caption", "hashtags", "chosen_hook", "council", "template", "bpm"]) delete (o as any)[k];
  return { title: item.title, date: item.scheduled_for, format: item.format, pillar: item.pillar, status: item.status, ...o };
}

function memoryOf(reviews: CouncilReview[]) {
  const withFeedback = reviews.filter((r) => r.feedback?.length).slice(-12);
  const lessons = withFeedback.flatMap((r) => (r.feedback ?? []).flatMap((f) => (f.answer?.change_next ?? []).map((l: string) => `${f.at.slice(0, 10)} · ${r.subject}: ${l} [${f.answer?.pattern_status ?? "early"}]`)));
  const won = withFeedback.filter((r) => r.feedback?.some((f) => f.answer?.hook_worked === true)).map((r) => r.answer?.selected_hook).filter(Boolean);
  const lost = withFeedback.filter((r) => r.feedback?.some((f) => f.answer?.hook_worked === false)).map((r) => r.answer?.selected_hook).filter(Boolean);
  const rejected = reviews.filter((r) => r.decision === "REJECTED").slice(-8).map((r) => r.subject);
  if (!lessons.length && !won.length && !rejected.length) return "";
  return `\nCOUNCIL MEMORY (real results so far — learn from it, don't over-trust one post):
${lessons.length ? "Lessons:\n- " + lessons.slice(-15).join("\n- ") : ""}
${won.length ? "Hooks that worked: " + won.join(" | ") : ""}
${lost.length ? "Hooks that didn't: " + lost.join(" | ") : ""}
${rejected.length ? "Recently rejected: " + rejected.join(" | ") : ""}`;
}

export async function reviewPack(brand: Brand, products: Product[], subject: { item?: ContentItem | null; text?: string; kind?: string }) {
  const reviews = await loadReviews(brand.id);
  const what = subject.item
    ? `CONTENT PIECE FROM TEMP. HQ (JSON):\n${JSON.stringify(publicPiece(subject.item), null, 1)}`
    : `SUBMISSION (${subject.kind || "work out the type"}):\n${subject.text ?? ""}`;
  return `${COUNCIL_SYSTEM(brand, products)}
${memoryOf(reviews)}

TODAY: ${new Date().toISOString().slice(0, 10)}. If you have web search, check current official Instagram/TikTok guidance where it changes the verdict; mark anything unverified.

${what}

${ANSWER_SCHEMA}`;
}

// ------------------------------------------------------------------ saving a review (and the improved piece)

const DECISIONS: Decision[] = ["APPROVED", "APPROVED WITH MINOR CHANGES", "RETURN FOR REVISION", "REJECTED"];

export async function saveReview(brand: Brand, products: Product[], json: any, by: string, subject: { item?: ContentItem | null; text?: string; kind?: string }) {
  if (!json || typeof json !== "object" || !Array.isArray(json.judges)) throw new Error("This doesn't look like a council answer (no judges).");
  const before = total(json.scores_before);
  const after = total(json.scores_after);
  let decision: Decision = DECISIONS.includes(String(json.decision).toUpperCase() as Decision) ? (String(json.decision).toUpperCase() as Decision) : "RETURN FOR REVISION";

  const item = subject.item ?? null;
  const improved = json.improved && typeof json.improved === "object" ? json.improved : null;
  let flags: CouncilReview["doctrine_flags"] = [];
  let merged: Record<string, any> | null = null;
  if (improved) {
    const m: Record<string, any> = { ...(item?.output ?? {}), ...improved };
    merged = m;
    if (improved.caption_ar || improved.caption_en) m.caption = [improved.caption_ar ?? m.caption_ar, improved.caption_en ?? m.caption_en].filter(Boolean).join("\n\n");
    if (improved.hashtags_en || improved.hashtags_ar) m.hashtags = [...(improved.hashtags_en ?? m.hashtags_en ?? []), ...(improved.hashtags_ar ?? m.hashtags_ar ?? [])].map((h: string) => (String(h).startsWith("#") ? h : "#" + h));
    if (improved.hook || json.selected_hook) m.chosen_hook = improved.hook ?? json.selected_hook;
    for (const k of ["slides", "frames", "clips", "scenes"]) if (Array.isArray(m[k])) m[k] = m[k].map((s: any, i: number) => ({ ...s, n: s.n ?? i + 1, ...(k === "slides" ? { seconds: Number(s.seconds) || 5 } : {}) }));
    const code = item ? products.find((p) => p.id === item.product_id)?.code ?? null : null;
    flags = checkRules(m, products as any, code);
  }
  // Overrides: the doctrine checker and the council's own overrides beat any score.
  const hardOverride = (json.overrides ?? []).some((o: string) => !/unsupported|verify|hold/i.test(o));
  if (flags.some((f) => f.severity === "block") || hardOverride) decision = "REJECTED";
  if (decision.startsWith("APPROVED") && after != null && after < 80) decision = "RETURN FOR REVISION";

  const rec: CouncilReview = {
    id: newId(),
    created_at: now(),
    by,
    content_id: item?.id ?? null,
    subject: item?.title ?? json.executive?.name ?? (subject.text ?? "Submission").slice(0, 80),
    kind: item?.format ?? json.executive?.type ?? subject.kind ?? "idea",
    submitted: item ? publicPiece(item) : { text: subject.text, kind: subject.kind },
    answer: json,
    score_before: before,
    score_after: after,
    decision,
    applied: false,
    doctrine_flags: flags,
  };

  // Revise the actual piece (old version stays restorable) unless the council rejected it.
  if (item && merged && decision !== "REJECTED") {
    merged.council = { review_id: rec.id, at: rec.created_at, before, after, decision, by };
    await saveOutput(brand, item, merged, {
      rule_flags: flags,
      status: "needs_you",
      revision_note: `Council (${by}): ${before ?? "?"} → ${after ?? "?"} · ${decision}. ${json.decision_reason ?? ""}`.trim(),
      revisions: (item.revisions ?? 0) + 1,
    });
    rec.applied = true;
  } else if (item) {
    await saveOutput(brand, item, { ...(item.output ?? {}), council: { review_id: rec.id, at: rec.created_at, before, after, decision, by } }, {
      revision_note: `Council (${by}): ${decision}. ${json.decision_reason ?? ""}${flags.some((f) => f.severity === "block") ? " Doctrine: " + flags.filter((f) => f.severity === "block").map((f) => f.rule).join(" · ") : ""}`.trim(),
      // The council itself rejected the piece → back to brief. If only its rewrite broke a rule, the piece stays as it was.
      ...(String(json.decision).toUpperCase() === "REJECTED" || hardOverride ? { status: "brief" as const } : {}),
    });
  }

  await mutate<CouncilReview>(brand.id, "council", (d) => {
    d.push(rec);
  }, `council review: ${rec.subject} (${decision})`);
  await log(brand.id, `Council reviewed "${rec.subject}": ${before ?? "?"} → ${after ?? "?"} · ${decision}${rec.applied ? " · improved version saved on the piece" : ""}.`);
  return rec;
}

// ------------------------------------------------------------------ performance feedback (learning loop)

export const RESULT_FIELDS: [string, string][] = [
  ["views", "Views"], ["reach", "Reach"], ["non_follower_pct", "Non-followers %"], ["avg_watch_s", "Avg watch (s)"], ["completion_pct", "Completion %"],
  ["shares", "Shares"], ["saves", "Saves"], ["comments", "Comments"], ["profile_visits", "Profile visits"], ["follows", "New followers"],
  ["site_visits", "Website visits"], ["orders", "Orders"], ["revenue_egp", "Revenue (EGP)"],
];

export async function saveResults(brand: Brand, rec: CouncilReview, numbers: Record<string, number | string>) {
  await mutate<CouncilReview>(brand.id, "council", (d) => d.map((r) => (r.id === rec.id ? { ...r, results: [...(r.results ?? []), { at: now(), numbers }] } : r)), `council results: ${rec.subject}`);
}

export function feedbackPack(brand: Brand, products: Product[], rec: CouncilReview) {
  const res = rec.results?.[rec.results.length - 1];
  return `${COUNCIL_SYSTEM(brand, products)}

PART 10 — PERFORMANCE FEEDBACK. This piece was reviewed by you on ${rec.created_at.slice(0, 10)} and published. Compare your predictions with the real results. One post is not proof — say whether a pattern is confirmed, early or a hypothesis.

YOUR REVIEW (summary): decision ${rec.decision}, score ${rec.score_before} → ${rec.score_after}, selected hook: ${rec.answer?.selected_hook ?? ""}, prediction: ${JSON.stringify(rec.answer?.prediction ?? {})}
THE PIECE AS PUBLISHED: ${JSON.stringify(rec.answer?.improved ?? rec.submitted).slice(0, 6000)}
REAL RESULTS (${res?.at.slice(0, 10) ?? "?"}): ${JSON.stringify(res?.numbers ?? {})}

ANSWER = ONE JSON object:
{ "predicted_right": ["…"], "predicted_wrong": ["…"], "audience_response": "…", "drop_off": "where viewers likely lost interest and why", "hook_worked": true|false, "right_audience": true|false|"unknown", "cta_worked": true|false, "purchase_intent": "…", "change_next": ["concrete rule for future content"], "pattern_status": "confirmed|early|hypothesis" }`;
}

export async function saveFeedback(brand: Brand, rec: CouncilReview, json: any, by: string) {
  if (!json || !Array.isArray(json.change_next)) throw new Error("This doesn't look like a feedback answer (no change_next).");
  await mutate<CouncilReview>(brand.id, "council", (d) => d.map((r) => (r.id === rec.id ? { ...r, feedback: [...(r.feedback ?? []), { at: now(), by, answer: json }] } : r)), `council lessons: ${rec.subject}`);
  await log(brand.id, `Council learned from "${rec.subject}": ${json.change_next.slice(0, 2).join(" · ")}`);
}

/** The line every "Run agency" week carries, so each new piece is already council-reviewed. */
export const COUNCIL_RULE = `- FIVE-JUDGE COUNCIL (standing rule): before answering, run EVERY piece past the five judges (strategist, creative director, consumer psychologist, growth engineer, sales psychologist) incl. a devil's-advocate "it flopped — why?" pass; rebuild until it scores 85+ /100 (hook 15, retention 15, emotion 15, brand 10, audience 10, story 10, share 10, sales 10, CTA 5). Add per item "council": { "score": 0-100, "weakest": "…", "fixed": "what you changed" }. A score never overrides a brand rule.`;
