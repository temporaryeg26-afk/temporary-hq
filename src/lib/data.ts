import { currentLogin, mutateJSON, readJSON } from "./github";
import { autofix, checkRules } from "./rules";
import { insert, list, mutate, newId, now } from "./store";
import type { Activity, Brand, ContentItem, Doctrine, Plan, Product, Research, Session } from "./types";

const FORMATS = ["reel", "carousel", "static", "story", "founder_video", "motion_carousel"];
const PILLARS = ["discovery", "philosophy", "product", "community", "conversion", "doctrine"];

// ------------------------------------------------------------------ brands

export function activeBrandId(): string | null {
  try {
    return localStorage.getItem("brand_id");
  } catch {
    return null;
  }
}
export function setActiveBrand(id: string) {
  try {
    localStorage.setItem("brand_id", id);
  } catch {
    /* ignore */
  }
}

export async function loadBrands(): Promise<Brand[]> {
  return (await readJSON<Brand[]>("brands.json", [])).data;
}

export async function loadBrand(): Promise<Brand> {
  const brands = await loadBrands();
  if (!brands.length) throw new Error("No brand found in the data repo. Upload the starter files (SETUP step 2).");
  const id = activeBrandId();
  return brands.find((b) => b.id === id) ?? brands[0];
}

export async function saveBrand(id: string, patch: Partial<Brand>) {
  await mutateJSON<Brand[]>("brands.json", [], (d) => {
    const i = d.findIndex((b) => b.id === id);
    if (i >= 0) d[i] = { ...d[i], ...patch };
  }, `HQ (${currentLogin()}): update brand`);
}

export async function createBrand(name: string, context: string): Promise<Brand> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
  const b: Brand = { id: `${slug}-${Date.now().toString(36)}`, name, slug, context, order_form_url: "", settings: { manager: "claude", batchSize: 5 }, created_at: now() };
  await mutateJSON<Brand[]>("brands.json", [], (d) => {
    d.push(b);
  }, `HQ (${currentLogin()}): add brand ${name}`);
  return b;
}

export async function loadProducts(brandId: string): Promise<Product[]> {
  return (await list<Product>(brandId, "products")).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export async function loadContent(brandId: string): Promise<ContentItem[]> {
  return (await list<ContentItem>(brandId, "content")).sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));
}

export async function loadResearch(brandId: string): Promise<Research[]> {
  return (await list<Research>(brandId, "research")).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function latestLab(brandId: string): Promise<Research | null> {
  return (await loadResearch(brandId)).find((r) => r.kind === "lab") ?? null;
}

export async function loadPlans(brandId: string): Promise<Plan[]> {
  return (await list<Plan>(brandId, "plans")).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function log(brandId: string, message: string, level: Activity["level"] = "info") {
  await mutate<Activity>(brandId, "activity", (d) => [{ id: newId(), message, level, created_by: currentLogin(), created_at: now() }, ...d].slice(0, 200), "log");
}

const who = (m: string) => (m === "chatgpt" ? "ChatGPT" : "Claude");

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ apply pasted answers

export async function applyResearch(brand: Brand, json: any, by: string) {
  const scans = Array.isArray(json?.scans) ? json.scans : [];
  if (!scans.length) throw new Error('No "scans" found in that answer.');
  const rows: Research[] = scans.map((s: any) => ({
    id: newId(),
    kind: "scan",
    topic: String(s.topic ?? "general"),
    title: String(s.title ?? s.topic ?? "Research"),
    content: { summary: s.summary ?? "", findings: s.findings ?? [], sources: s.sources ?? [] },
    made_by: by,
    created_at: now(),
  }));
  // keep the last 60 research rows so the file stays small
  await mutate<Research>(brand.id, "research", (d) => [...rows, ...d].slice(0, 60), "trend research");
  await log(brand.id, `${who(by)} researched ${rows.length} topics on the web.`);
  return rows.length;
}

export async function applyLab(brand: Brand, json: any, by: string) {
  if (!json?.big_picture && !json?.invent) throw new Error("That doesn't look like a trend analysis (no big_picture / invent).");
  await mutate<Research>(brand.id, "research", (d) => [{ id: newId(), kind: "lab", topic: "trend-lab", title: "Trend Lab", content: json, made_by: by, created_at: now() } as Research, ...d].slice(0, 60), "trend analysis");
  await log(brand.id, `${who(by)} analysed the trends: ${json.invent?.length ?? 0} invented, ${json.ride?.length ?? 0} to ride.`);
}

export async function applyPlan(brand: Brand, products: Product[], json: any, by: string, start: string) {
  const items: any[] = Array.isArray(json?.items) ? json.items : [];
  if (!items.length) throw new Error('No "items" in that plan.');
  const plan: Plan = {
    id: newId(),
    title: json.title ?? "Plan",
    goal: json.goal ?? "",
    data: { strategy: json.strategy ?? "", weeks: json.weeks ?? [], kpis: json.kpis ?? [] },
    made_by: by,
    created_at: now(),
  };
  await insert(brand.id, "plans", plan, `plan: ${plan.title}`);
  const startDate = new Date(start);
  const rows: ContentItem[] = items
    .filter((i) => FORMATS.includes(i.format))
    .map((i) => ({
      id: newId(),
      plan_id: plan.id,
      product_id: products.find((p) => p.code === String(i.product_code ?? ""))?.id ?? null,
      format: i.format,
      pillar: PILLARS.includes(i.pillar) ? i.pillar : "discovery",
      title: String(i.angle ?? "Untitled").slice(0, 140),
      scheduled_for: addDays(startDate, Math.max(0, (Number(i.day) || 1) - 1)),
      brief: i,
      output: null,
      rule_flags: [],
      qa: null,
      review: null,
      revision_note: null,
      status: "brief",
      revisions: 0,
      created_at: now(),
      updated_at: now(),
    }));
  await insert(brand.id, "content", rows, `${rows.length} briefs`);
  await log(brand.id, `${who(by)} made the plan "${plan.title}" with ${rows.length} pieces.`);
  return rows.length;
}

export async function applyWriting(brand: Brand, products: Product[], items: ContentItem[], json: any) {
  const answers: any[] = Array.isArray(json?.items) ? json.items : [];
  if (!answers.length) throw new Error('No "items" in that answer.');
  const ids = new Set(items.map((i) => i.id));
  let saved = 0;
  await mutate<ContentItem>(brand.id, "content", (d) => {
    saved = 0;
    for (const row of d) {
      if (!ids.has(row.id)) continue;
      const a = answers.find((x) => x.id === row.id);
      if (!a?.output) continue;
      const output = autofix(a.output);
      const code = products.find((p) => p.id === row.product_id)?.code ?? null;
      row.output = output;
      row.rule_flags = checkRules(output, products, code);
      row.qa = a.self_check ? { score: Number(a.self_check.score) || 0, issues: a.self_check.issues ?? [] } : null;
      row.status = "in_review";
      row.revision_note = null;
      row.updated_at = now();
      saved++;
    }
  }, "ChatGPT drafts");
  const missing = items.length - saved;
  await log(brand.id, `ChatGPT wrote ${saved} pieces.${missing ? ` Missing from the answer: ${missing}.` : ""}`);
  return { saved, missing: Array.from({ length: missing }) };
}

export async function applyReview(brand: Brand, items: ContentItem[], json: any, by: string) {
  const verdicts: any[] = Array.isArray(json?.verdicts) ? json.verdicts : [];
  if (!verdicts.length) throw new Error('No "verdicts" in that answer.');
  const auto = brand.settings?.autoApprove ?? {};
  const ids = new Set(items.map((i) => i.id));
  let approved = 0, sent = 0;
  await mutate<ContentItem>(brand.id, "content", (d) => {
    approved = 0;
    sent = 0;
    for (const row of d) {
      if (!ids.has(row.id)) continue;
      const v = verdicts.find((x) => x.id === row.id);
      if (!v) continue;
      const review = { decision: (v.decision === "revise" ? "revise" : "approve") as "approve" | "revise", note: String(v.note ?? ""), by };
      row.review = review;
      row.updated_at = now();
      if (review.decision === "revise" && row.revisions < 2) {
        row.status = "brief";
        row.revision_note = review.note;
        row.revisions += 1;
        sent++;
      } else {
        row.status = auto[row.pillar] && row.rule_flags.length === 0 && review.decision === "approve" ? "approved" : "needs_you";
        approved++;
      }
    }
  }, `${who(by)} review`);
  await log(brand.id, `${who(by)} reviewed: ${approved} passed, ${sent} sent back for rewriting.${json.memo ? " " + json.memo : ""}`);
  return { approved, sent };
}

export async function createPiece(brand: Brand, products: Product[], b: { format: string; pillar: string; product_code: string; angle: string; cta: string }) {
  const row: ContentItem = {
    id: newId(),
    plan_id: null,
    product_id: products.find((p) => p.code === b.product_code)?.id ?? null,
    format: b.format as ContentItem["format"],
    pillar: b.pillar as ContentItem["pillar"],
    title: b.angle.slice(0, 140),
    scheduled_for: addDays(new Date(), 1),
    brief: { ...b, objective: b.angle },
    output: null,
    rule_flags: [],
    qa: null,
    review: null,
    revision_note: null,
    status: "brief",
    revisions: 0,
    created_at: now(),
    updated_at: now(),
  };
  await insert(brand.id, "content", row, "new piece");
}

// ------------------------------------------------------------------ doctrine & sessions

const DOCTRINE_KEYS: (keyof Doctrine)[] = ["belief", "manifesto", "for_who", "enemy", "promise", "voice", "words_we_use", "words_we_never_use", "symbols", "rituals", "signature_series", "future_vision"];

export function asDoctrine(json: any): Doctrine {
  const d = {} as Doctrine;
  let filled = 0;
  for (const k of DOCTRINE_KEYS) {
    const v = json?.[k];
    const text = Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v);
    (d as any)[k] = text;
    if (text.trim()) filled++;
  }
  if (filled < 4) throw new Error("That doesn't look like a doctrine (too few fields filled).");
  return d;
}

export async function saveDoctrine(brand: Brand, d: Doctrine, by: string) {
  await saveBrand(brand.id, { doctrine: { ...d, updated_at: now() } });
  await log(brand.id, `${by} updated the doctrine.`);
}

export async function loadSessions(brandId: string): Promise<Session[]> {
  return (await list<Session>(brandId, "sessions")).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function applySession(brand: Brand, json: any, by: string, days: number, notes: string) {
  if (!json?.next_goal && !json?.wins) throw new Error("That doesn't look like a session review (no next_goal / wins).");
  const arr = (v: any) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
  const s: Session = {
    id: newId(),
    period_start: new Date().toISOString().slice(0, 10),
    days,
    review: {
      wins: arr(json.wins),
      misses: arr(json.misses),
      lessons: arr(json.lessons),
      doctrine_check: String(json.doctrine_check ?? ""),
      next_focus: String(json.next_focus ?? ""),
      next_goal: String(json.next_goal ?? ""),
      bold_bets: arr(json.bold_bets),
    },
    notes,
    made_by: by,
    created_at: now(),
  };
  await insert(brand.id, "sessions", s, "session review");
  await log(brand.id, `${who(by)} ran the ${days}-day session: ${s.review!.next_focus}`);
  return s;
}
