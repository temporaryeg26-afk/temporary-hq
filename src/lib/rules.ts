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

/** Fix things code can fix safely: brand name always "TEMPORARY™". */
export function autofix<T>(value: T): T {
  const fix = (s: string) => s.replace(/TEMPORARY(?!™)/g, "TEMPORARY™").replace(/TEMPORARY™™/g, "TEMPORARY™");
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        // never rewrite generation prompts' asset references
        o[k] = walk(x);
      }
      return o;
    }
    return v;
  };
  return walk(value) as T;
}

const BLOCK_PATTERNS: [RegExp, string][] = [
  [/\b(discount|sale|on sale|\d+\s*%\s*off|promo code|coupon|bargain|cheap|deal of)\b/i, "Discount / bargain language"],
  [/(خصم|تخفيض|تخفيضات|أوكازيون|اوكازيون|كوبون|رخيص|عرض خاص|عروض)/, "Discount / bargain language (Arabic)"],
  [/\b(hurry|last chance|limited time|ends tonight|before it'?s too late|selling fast|almost gone)\b/i, "Fake urgency"],
  [/(آخر فرصة|اخر فرصة|الحق بسرعة|قرب يخلص|خلصان|بسرعة قبل ما)/, "Fake urgency (Arabic)"],
  [/\b(only\s+\d+\s+(left|remaining)|\d+\s+(pieces|pcs|units)\s+(left|remaining))\b/i, "Remaining-quantity claim (must come from real inventory)"],
  [/((فاضل|متبقي|باقي)\s*\d+|\d+\s*(قطعة|قطع)\s*(بس|فقط|متبقية|فاضلة))/, "Remaining-quantity claim (Arabic)"],
  [/\b(best in egypt|best brand|number one brand|#1 brand)\b/i, "Empty superiority claim"],
  [/(الأفضل في مصر|أفضل براند|احسن براند في مصر|أحسن براند)/, "Empty superiority claim (Arabic)"],
  [/\b(website|web site|online store|our site|shop now at|www\.)\b/i, "Mentions a website (TEMPORARY™ orders via Google Forms only)"],
  [/(الموقع|ويب ?سايت|المتجر الإلكتروني)/, "Mentions a website (Arabic)"],
  [/\b(restock|back in stock|coming back soon)\b/i, "Restock claim (editions are never reproduced)"],
];

const APPROVAL_PATTERNS: [RegExp, string][] = [
  [/\b(benefit|privilege|perk|early access|exclusive access|vip|reward)s?\b/i, "Membership privileges need your confirmation"],
  [/(امتيازات|مميزات العضوية|أولوية الشراء|وصول مبكر)/, "Membership privileges need your confirmation (Arabic)"],
  [/\b(testimonial|review|customer said|our customers say|5[- ]?star)s?\b/i, "Testimonial / review — must be genuine and approved"],
  [/\b(100%\s*cotton|organic|gsm|heavyweight|durable|won'?t fade|never shrinks?|premium cotton|egyptian cotton)\b/i, "Material / quality claim — must match verified specs"],
  [/(قطن\s*100|قطن مصري|مايبهتش|ما بيكشّ|خامة تقيلة)/, "Material / quality claim (Arabic)"],
  [/\b(delivery in|ships in|free shipping|refund|return policy|cash on delivery)\b/i, "Delivery / returns / payment policy"],
  [/(توصيل خلال|شحن مجاني|استرجاع|استبدال|الدفع عند الاستلام)/, "Delivery / returns / payment policy (Arabic)"],
  [/(تمبوراري|تيمبوراري)/, "Brand name written in Arabic — must be TEMPORARY™ in English"],
  [/\b(unmask|face reveal|founder'?s name)\b/i, "Founder identity — founder stays masked"],
  [/\b(collab|collaboration|partnered with|sponsored)\b/i, "Partnership / collaboration"],
];

const PRICE_RE = [
  /(\d[\d,.]*)\s*(EGP|LE|L\.E)\b/gi,
  /(\d[\d,.]*)\s*(جنيه|ج\.م)/g,
  /\b(EGP|LE)\s*(\d[\d,.]*)/gi,
];

export function checkRules(output: unknown, catalogue: CatalogueProduct[], productCode?: string | null): Flag[] {
  const text = normalizeDigits(flatten(output));
  const flags: Flag[] = [];

  for (const [re, rule] of BLOCK_PATTERNS) {
    const m = text.match(re);
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
