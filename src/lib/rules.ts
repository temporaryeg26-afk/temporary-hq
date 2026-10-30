/**
 * Brand-rule checks done by plain code — free, instant, and they never "forget".
 * Anything here runs before Claude ever sees the content.
 */

export type Flag = { severity: "block" | "approval"; rule: string; detail: string };

export type CatalogueProduct = {
  code: string;
  name: string;
  price_egp: number | null;
  price_confirmed: boolean;
  specs: string;
};

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function normalizeDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Every string inside the output, joined. */
export function flatten(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join("\n");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(flatten).join("\n");
  return "";
}

/** Only what the audience will see: skips internal notes (ad plan, department notes, prompts for image/video models). */
const INTERNAL = new Set(["ads", "departments", "why", "research", "made_by", "metric", "self_check", "versions"]);
export function flattenPublic(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenPublic).join("\n");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).filter(([k]) => !INTERNAL.has(k) && !k.endsWith("_prompt") && k !== "visual" && k !== "sticker_note").map(([, v]) => flattenPublic(v)).join("\n");
  return "";
}

/** Fix things code can fix safely: brand name always "TEMPORARY™". */
export function autofix<T>(value: T): T {
  const fix = (s: string) => s.replace(/TEMPORARY(?!™)/g, "TEMPORARY™").replace(/TEMPORARY™™/g, "TEMPORARY™");
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        // hashtags can't contain ™; prompts for image/video models must not mention the brand at all
        o[k] = k === "hashtags" || k.endsWith("_prompt") ? x : walk(x);
      }
      return o;
    }
    return v;
  };
  return walk(value) as T;
}

const BLOCK_PATTERNS: [RegExp, string][] = [
  [/\b(hurry|last chance|limited time|ends tonight|before it'?s too late|selling fast|almost gone)\b/i, "Fake urgency"],
  [/(آخر فرصة|اخر فرصة|الحق بسرعة|قرب يخلص|خلصان|بسرعة قبل ما)/, "Fake urgency (Arabic)"],
  [/\b(only\s+\d+\s+(left|remaining)|\d+\s+(pieces|pcs|units)\s+(left|remaining))\b/i, "Remaining-quantity claim (must come from real inventory)"],
  [/((فاضل|متبقي|باقي)\s*\d+|\d+\s*(قطعة|قطع)\s*(بس|فقط|متبقية|فاضلة))/, "Remaining-quantity claim (Arabic)"],
  [/\b(best in egypt|best brand|number one brand|#1 brand)\b/i, "Empty superiority claim"],
  [/(الأفضل في مصر|أفضل براند|احسن براند في مصر|أحسن براند)/, "Empty superiority claim (Arabic)"],
];

const APPROVAL_PATTERNS: [RegExp, string][] = [
  [/\b(discount|on sale|\d+\s*%\s*off|promo code|coupon|bargain|cheap|deal of)\b/i, "Discount word — OK only if we are NOT offering one (no discounts ever)"],
  [/(خصم|تخفيض|تخفيضات|أوكازيون|اوكازيون|كوبون|رخيص|عرض خاص|عروض)/, "Discount word (Arabic) — OK only if we are NOT offering one"],
  [/\b(restock|back in stock|coming back soon)\b/i, "Restock word — OK only if we're not claiming a restock (editions never return)"],
  [/\b(benefit|privilege|perk|exclusive access|vip|reward)s?\b/i, "Membership privileges need your confirmation (only early access + the private circle are confirmed)"],
  [/(امتيازات|مميزات العضوية|أولوية الشراء)/, "Membership privileges need your confirmation (Arabic)"],
  [/\b(testimonial|review|customer said|our customers say|5[- ]?star)s?\b/i, "Testimonial / review — must be genuine and approved"],
  [/\b(100%\s*cotton|organic|gsm|heavyweight|durable|won'?t fade|never shrinks?|premium cotton|egyptian cotton)\b/i, "Material / quality claim — must match verified specs"],
  [/(قطن\s*100|قطن مصري|مايبهتش|ما بيكشّ|خامة تقيلة)/, "Material / quality claim (Arabic)"],
  [/\b(delivery in|ships in|free shipping|refund|return policy|cash on delivery)\b/i, "Delivery / returns / payment policy"],
  [/(توصيل خلال|شحن مجاني|استرجاع|استبدال|الدفع عند الاستلام)/, "Delivery / returns / payment policy (Arabic)"],
  [/(تمبوراري|تيمبوراري)/, "Brand name written in Arabic — must be TEMPORARY™ in English"],
  [/\b(unmask|face reveal|founder'?s name)\b/i, "Founder identity — founder stays masked"],
  [/\b(collab|collaboration|partnered with|sponsored)\b/i, "Partnership / collaboration"],
];

/** DOCTRINE — product truth, Founder rules, competitors. Every piece is checked before you can approve it. */
const DOCTRINE_BLOCK: [RegExp, string][] = [
  [/(أكتر من\s*[٣3]\s*ألوان|[٣3]\s*ألوان\s*(بس|فقط)|قاعدة\s*ال?[٣3]\s*ألوان|\b(3|three)[- ]colou?r rule\b|\b(max(imum)?|no more than)\s*(2|3|two|three)\s*colou?rs?\b)/i, "Doctrine: works against our designs (bold multi-colour graphics)"],
  [/(اللبس الساده أحسن|ساده دايمًا|\bless is more\b|\bplain (tees?|clothes) (are|is) (better|classier)\b|\bminimalis[mt] (only|always)\b)/i, "Doctrine: works against our designs (statement graphics)"],
  [/(اللوجو الكبير|بيصرخ باسم البراند|\bloud (logos?|prints?|graphics?) (are|is|look) (cheap|tacky|bad)\b|\bgraphics? (are|is) for kids\b)/i, "Doctrine: works against our designs (loud prints / statement type)"],
  [/(أسود بس وحاجة واحدة|\ball[- ]black only\b|\bonly one (thing|accent) that shines\b)/i, "Doctrine: works against our designs (neon / colour on black)"],
  [/\b(corteiz|supreme|scuffers|marsy|unty|fear2f|al camileon|in your shoe|defacto|lc waikiki|shein|temu|zara|h&m|bershka|pull ?& ?bear)\b/i, "Doctrine: names another brand (never name competitors)"],
  [/(ديفاكتو|شي إن|شي ان|زارا|تيمو)/, "Doctrine: names another brand (Arabic)"],
  [/\b(filmed live|real person behind the mask|this is really me on camera)\b/i, "Doctrine: claims the AI Founder is real / filmed live"],
];

function doctrine(output: any, text: string): Flag[] {
  const flags: Flag[] = [];
  for (const [re, rule] of DOCTRINE_BLOCK) {
    const m = text.match(re);
    if (m) flags.push({ severity: "block", rule, detail: `Found: "${m[0]}"` });
  }
  if (!output || typeof output !== "object") return flags;
  const founder = Array.isArray(output.clips) || /founder/i.test(String(output.format ?? ""));
  if (founder && output.ai_label !== true) flags.push({ severity: "block", rule: "Doctrine: AI label missing on a Founder piece", detail: "Set ai_label: true and turn on Instagram's AI info label when posting." });
  const cap = [output.caption, output.caption_ar, output.caption_en].filter(Boolean).join(" ");
  if (/(\bAI\b|ذكاء اصطناعي|artificial intelligence)/i.test(cap)) flags.push({ severity: "block", rule: "Doctrine: never mention AI in captions", detail: "Use Instagram's AI label instead." });
  const tags = Array.isArray(output.hashtags) ? output.hashtags : [...(output.hashtags_en ?? []), ...(output.hashtags_ar ?? [])];
  if (tags.length > 5) flags.push({ severity: "block", rule: "Doctrine: more than 5 hashtags", detail: `${tags.length} hashtags` });
  if (tags.length && !tags.some((t: string) => /temporary_eg/i.test(t))) flags.push({ severity: "approval", rule: "Brand hashtag #temporary_eg missing", detail: tags.join(" ") });
  if (output.pillar === "product" && typeof output.video_prompt === "string" && !/real/i.test(output.video_prompt)) flags.push({ severity: "approval", rule: "Products must be real footage (no AI for products)", detail: output.video_prompt.slice(0, 80) });
  if (output.ads === undefined && (Array.isArray(output.clips) || Array.isArray(output.scenes))) flags.push({ severity: "approval", rule: "No ad plan from Media Buying yet (all departments rule)", detail: "Ask the Media Buyer in chat to add layer, objective, ad text and test." });
  return flags;
}

const PRICE_RE = [
  /(\d[\d,.]*)\s*(EGP|LE|L\.E)\b/gi,
  /(\d[\d,.]*)\s*(جنيه|ج\.م)/g,
  /\b(EGP|LE)\s*(\d[\d,.]*)/gi,
];

export function checkRules(output: unknown, catalogue: CatalogueProduct[], productCode?: string | null): Flag[] {
  const text = normalizeDigits(flattenPublic(output));
  const flags: Flag[] = [];

  for (const [re, rule] of BLOCK_PATTERNS) {
    const m = text.match(re);
    // "200 pieces" is our real edition size, not a fake remaining-stock claim.
    if (m && rule.startsWith("Remaining-quantity") && (/\b200\b/.test(m[0]) || /بـ\s*$/.test(text.slice(Math.max(0, (m.index ?? 0) - 3), m.index)))) continue;
    if (m) flags.push({ severity: "block", rule, detail: `Found: "${m[0]}"` });
  }
  for (const [re, rule] of APPROVAL_PATTERNS) {
    const m = text.match(re);
    if (m) {
      // Material claims are fine if they match the verified specs.
      const specs = catalogue.map((p) => p.specs.toLowerCase()).join(" ");
      if (rule.startsWith("Material") && specs.includes(m[0].toLowerCase())) continue;
      flags.push({ severity: "approval", rule, detail: `Found: "${m[0]}"` });
    }
  }

  // Prices must match the confirmed catalogue.
  const allowed = new Set(catalogue.filter((p) => p.price_confirmed && p.price_egp != null).map((p) => Number(p.price_egp)));
  const found: number[] = [];
  for (const re of PRICE_RE) {
    for (const m of Array.from(text.matchAll(re))) {
      const raw = /\d/.test(m[1]) ? m[1] : m[2];
      const n = Number(String(raw).replace(/[,.](?=\d{3}\b)/g, "").replace(/,/g, ""));
      if (!Number.isNaN(n)) found.push(n);
    }
  }
  for (const n of found) {
    if (!allowed.has(n)) flags.push({ severity: "block", rule: "Price not in confirmed catalogue", detail: `EGP ${n}` });
  }
  if (productCode && found.length) {
    const p = catalogue.find((x) => x.code === productCode);
    if (p && !p.price_confirmed) {
      flags.push({ severity: "block", rule: "Price stated for a product whose price is not confirmed", detail: p.name });
    } else if (p && p.price_egp != null && !found.includes(Number(p.price_egp)) ) {
      flags.push({ severity: "block", rule: "Wrong price for this product", detail: `${p.name} is EGP ${p.price_egp}` });
    }
  }
  if (found.length) flags.push({ severity: "approval", rule: "Mentions a price", detail: "Prices always need your OK" });
  flags.push(...doctrine(output, text));

  // de-duplicate
  const seen = new Set<string>();
  return flags.filter((f) => {
    const k = f.severity + f.rule + f.detail;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const hasBlock = (flags: Flag[]) => flags.some((f) => f.severity === "block");
