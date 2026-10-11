import { currentEmail, must, sb } from "./supabase";
import { autofix, checkRules } from "./rules";
import type { Brand, ContentItem, Plan, Product, Research } from "./types";

const FORMATS = ["reel", "carousel", "static", "story"];
const PILLARS = ["discovery", "philosophy", "product", "community", "conversion"];

// ------------------------------------------------------------------ brand selection

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
  return must(await sb.from("brands").select("*").order("created_at"));
}

export async function loadBrand(): Promise<Brand> {
  const brands = await loadBrands();
  if (!brands.length) throw new Error("No brand found. Run supabase/schema.sql (SETUP step 2).");
  const id = activeBrandId();
  return brands.find((b) => b.id === id) ?? brands[0];
}

export async function loadProducts(brandId: string): Promise<Product[]> {
  return must(await sb.from("products").select("*").eq("brand_id", brandId).order("sort"));
}

export async function latestLab(brandId: string): Promise<Research | null> {
  const { data } = await sb.from("research").select("*").eq("brand_id", brandId).eq("kind", "lab").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as Research) ?? null;
}

export async function log(brandId: string, message: string, level: "info" | "warn" | "error" = "info") {
  await sb.from("activity").insert({ brand_id: brandId, message, level, created_by: await currentEmail() });
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
  const rows = scans.map((s: any) => ({
    brand_id: brand.id,
    kind: "scan",
    topic: String(s.topic ?? "general"),
    title: String(s.title ?? s.topic ?? "Research"),
    content: { summary: s.summary ?? "", findings: s.findings ?? [], sources: s.sources ?? [] },
    made_by: by,
  }));
  must(await sb.from("research").insert(rows));
  await log(brand.id, `${who(by)} researched ${rows.length} topics on the web.`);
  return rows.length;
}

export async function applyLab(brand: Brand, json: any, by: string) {
  if (!json?.big_picture && !json?.invent) throw new Error("That doesn't look like a trend analysis (no big_picture / invent).");
  must(await sb.from("research").insert({ brand_id: brand.id, kind: "lab", topic: "trend-lab", title: "Trend Lab", content: json, made_by: by }));
  await log(brand.id, `${who(by)} analysed the trends: ${json.invent?.length ?? 0} invented, ${json.ride?.length ?? 0} to ride.`);
}

export async function applyPlan(brand: Brand, products: Product[], json: any, by: string, start: string) {
  const items: any[] = Array.isArray(json?.items) ? json.items : [];
  if (!items.length) throw new Error('No "items" in that plan.');
  const plan = must<Plan>(
    await sb
      .from("plans")
      .insert({ brand_id: brand.id, title: json.title ?? "Plan", goal: json.goal ?? "", data: { strategy: json.strategy ?? "", weeks: json.weeks ?? [], kpis: json.kpis ?? [] }, made_by: by })
      .select()
      .single()
  );
  const startDate = new Date(start);
  const rows = items
    .filter((i) => FORMATS.includes(i.format))
    .map((i) => ({
      brand_id: brand.id,
      plan_id: plan.id,
      product_id: products.find((p) => p.code === String(i.product_code ?? ""))?.id ?? null,
      format: i.format,
      pillar: PILLARS.includes(i.pillar) ? i.pillar : "discovery",
      title: String(i.angle ?? "Untitled").slice(0, 140),
      scheduled_for: addDays(startDate, Math.max(0, (Number(i.day) || 1) - 1)),
      brief: i,
      status: "brief",
    }));
  must(await sb.from("content_items").insert(rows));
  await log(brand.id, `${who(by)} made the plan "${plan.title}" with ${rows.length} pieces.`);
  return rows.length;
}

export async function applyWriting(brand: Brand, products: Product[], items: ContentItem[], json: any) {
  const answers: any[] = Array.isArray(json?.items) ? json.items : [];
  if (!answers.length) throw new Error('No "items" in that answer.');
  let saved = 0;
  const missing: string[] = [];
  for (const item of items) {
    const a = answers.find((x) => x.id === item.id);
    if (!a?.output) {
      missing.push(item.title);
      continue;
    }
    const output = autofix(a.output);
    const code = products.find((p) => p.id === item.product_id)?.code ?? null;
    const flags = checkRules(output, products, code);
    must(
      await sb
        .from("content_items")
        .update({
          output,
          rule_flags: flags,
          qa: a.self_check ? { score: Number(a.self_check.score) || 0, issues: a.self_check.issues ?? [] } : null,
          status: "in_review",
          revision_note: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
    );
    saved++;
  }
  await log(brand.id, `ChatGPT wrote ${saved} pieces.${missing.length ? ` Missing from the answer: ${missing.length}.` : ""}`);
  return { saved, missing };
}

export async function applyReview(brand: Brand, items: ContentItem[], json: any, by: string) {
  const verdicts: any[] = Array.isArray(json?.verdicts) ? json.verdicts : [];
  if (!verdicts.length) throw new Error('No "verdicts" in that answer.');
  const auto = brand.settings?.autoApprove ?? {};
  let approved = 0, sent = 0;
  for (const item of items) {
    const v = verdicts.find((x) => x.id === item.id);
    if (!v) continue;
    const review = { decision: v.decision === "revise" ? "revise" : "approve", note: String(v.note ?? ""), by };
    if (review.decision === "revise" && item.revisions < 2) {
      must(await sb.from("content_items").update({ review, status: "brief", revision_note: review.note, revisions: item.revisions + 1, updated_at: new Date().toISOString() }).eq("id", item.id));
      sent++;
    } else {
      const autoOk = auto[item.pillar] && item.rule_flags.length === 0 && review.decision === "approve";
      must(await sb.from("content_items").update({ review, status: autoOk ? "approved" : "needs_you", updated_at: new Date().toISOString() }).eq("id", item.id));
      approved++;
    }
  }
  await log(brand.id, `${who(by)} reviewed: ${approved} passed, ${sent} sent back for rewriting.${json.memo ? " " + json.memo : ""}`);
  return { approved, sent };
}

export async function createPiece(brand: Brand, products: Product[], b: { format: string; pillar: string; product_code: string; angle: string; cta: string }) {
  must(
    await sb.from("content_items").insert({
      brand_id: brand.id,
      product_id: products.find((p) => p.code === b.product_code)?.id ?? null,
      format: b.format,
      pillar: b.pillar,
      title: b.angle.slice(0, 140),
      scheduled_for: addDays(new Date(), 1),
      brief: { ...b, objective: b.angle },
      status: "brief",
    })
  );
}
