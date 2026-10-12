import { currentLogin, mutateJSON, readJSON } from "./github";
import { autofix, checkRules } from "./rules";
import { insert, list, mutate, newId, now } from "./store";
import type { Activity, AdRecord, Brand, ContentItem, Doctrine, Plan, Product, Period, Research, ResearchReport, ResearchType, Session, Task, TaskStatus } from "./types";

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

/** Latest trend lab, with the newest full research report attached — every pack gets both. */
export async function latestLab(brandId: string): Promise<Research | null> {
  const all = await loadResearch(brandId);
  const lab = all.find((r) => r.kind === "lab") ?? null;
  const report = all.find((r) => r.kind === "report") ?? null;
  if (!lab) return report ? { ...report, report } : null;
  return { ...lab, report };
}

/** Keep every report; trim the old trend scans so the file stays small. */
const keepResearch = (rows: Research[]) => [...rows.filter((r) => r.kind !== "report").slice(0, 60), ...rows.filter((r) => r.kind === "report")];

export function asReport(json: any, type: ResearchType, scope: string[], topic: string): ResearchReport {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const str = (v: any) => (v == null ? "" : String(v));
  const summary = Array.isArray(json?.summary) ? json.summary.map(str) : str(json?.summary).split(/\n+/).filter(Boolean);
  if (!summary.length && !arr(json?.complaints).length) throw new Error("That doesn't look like a research report (no summary or complaints).");
  const b = json?.buyer ?? {};
  return {
    type,
    scope,
    topic: topic || undefined,
    title: str(json?.title) || (type === "full" ? "Full research" : type === "quick" ? "Quick refresh" : `Research: ${topic}`),
    summary,
    buyer: { who: str(b.who), age: str(b.age), money: str(b.money), hangouts: str(b.hangouts), fears: arr(b.fears).map(str) },
    themes: arr(json?.themes).map((t: any) => ({ theme: str(t.theme), count: Number(t.count) || 0, what_people_say: str(t.what_people_say), what_we_do: str(t.what_we_do) })),
    complaints: arr(json?.complaints).map((c: any) => ({ quote: str(c.quote), platform: str(c.platform), theme: str(c.theme), link: str(c.link) })),
    gap: str(json?.gap),
    checklist: arr(json?.checklist).map((c: any) => ({ check: str(c.check), how_to_check: str(c.how_to_check), why: str(c.why) })),
    trends: arr(json?.trends).map((t: any) => ({ trend: str(t.trend), note: str(t.note) })),
    seasons: arr(json?.seasons).map((t: any) => ({ when: str(t.when), moment: str(t.moment), idea: str(t.idea) })),
    ig_rules: arr(json?.ig_rules).map(str),
    risks: arr(json?.risks).map(str),
    sources: arr(json?.sources).map((x: any) => ({ title: str(x.title), url: str(x.url) })),
  };
}

export async function saveReport(brand: Brand, report: ResearchReport, by: string) {
  const row: Research = { id: newId(), kind: "report", topic: report.type, title: report.title, content: report, made_by: by, created_at: now() };
  await mutate<Research>(brand.id, "research", (d) => keepResearch([row, ...d]), `research report: ${report.title}`);
  await log(brand.id, `Researcher saved "${report.title}": ${report.complaints.length} real complaints, ${report.themes.length} themes.`);
  return row;
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
  await mutate<Research>(brand.id, "research", (d) => keepResearch([...rows, ...d]), "trend research");
  await log(brand.id, `${who(by)} researched ${rows.length} topics on the web.`);
  return rows.length;
}

export async function applyLab(brand: Brand, json: any, by: string) {
  if (!json?.big_picture && !json?.invent) throw new Error("That doesn't look like a trend analysis (no big_picture / invent).");
  await mutate<Research>(brand.id, "research", (d) => keepResearch([{ id: newId(), kind: "lab", topic: "trend-lab", title: "Trend Lab", content: json, made_by: by, created_at: now() } as Research, ...d]), "trend analysis");
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

// ------------------------------------------------------------------ media buying

export async function loadAds(brandId: string): Promise<AdRecord[]> {
  return (await list<AdRecord>(brandId, "ads")).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function applyAdPlan(brand: Brand, json: any, by: string, budget: number | null, goal: string) {
  if (!Array.isArray(json?.campaigns) && !Array.isArray(json?.tests)) throw new Error("That doesn't look like an ad plan (no campaigns / tests).");
  const r: AdRecord = { id: newId(), kind: "plan", budget_egp: budget, goal, data: { strategy: json.strategy ?? "", campaigns: json.campaigns ?? [], tests: json.tests ?? [], measure: json.measure ?? [], rules: json.rules ?? [] }, made_by: by, created_at: now() };
  await insert(brand.id, "ads", r, "ad plan");
  await log(brand.id, `${who(by)} made an ad plan: ${r.data.campaigns!.length} campaigns, ${r.data.tests!.length} test ads.`);
  return r;
}

export async function applyAdReview(brand: Brand, json: any, by: string, results: string) {
  if (!Array.isArray(json?.verdicts)) throw new Error("That doesn't look like an ad review (no verdicts).");
  const r: AdRecord = { id: newId(), kind: "review", budget_egp: null, goal: "", data: { summary: json.summary ?? "", verdicts: json.verdicts, next_moves: json.next_moves ?? [] }, results_text: results.slice(0, 6000), made_by: by, created_at: now() };
  await insert(brand.id, "ads", r, "ad review");
  await log(brand.id, `${who(by)} reviewed the ad results: ${r.data.summary}`);
  return r;
}

// ------------------------------------------------------------------ periods, roadmap, tasks

export async function loadPeriods(brandId: string): Promise<Period[]> {
  return (await list<Period>(brandId, "periods")).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function activePeriod(brandId: string): Promise<Period | null> {
  return (await loadPeriods(brandId)).find((p) => p.status === "active") ?? null;
}

export async function loadTasks(brandId: string, periodId?: string): Promise<Task[]> {
  const all = await list<Task>(brandId, "tasks");
  return periodId ? all.filter((t) => t.period_id === periodId) : all;
}

/** Start a new period of ANY length. The previous active period is marked done (never deleted). */
export async function createPeriod(brand: Brand, p: { name: string; start: string; end: string; goal: string; notes: string }) {
  if (!p.name.trim() || !p.goal.trim()) throw new Error("Give the period a name and a goal.");
  if (p.end <= p.start) throw new Error("The end date must be after the start date.");
  const row: Period = { id: newId(), ...p, phases: [], needs: [], budget: null, status: "active", made_by: currentLogin(), created_at: now() };
  await mutate<Period>(brand.id, "periods", (d) => [row, ...d.map((x) => (x.status === "active" ? { ...x, status: "done" as const } : x))], `new period: ${p.name}`);
  await log(brand.id, `New period "${p.name}" (${p.start} → ${p.end}).`);
  return row;
}

export async function updatePeriod(brand: Brand, id: string, patch: Partial<Period>) {
  await mutate<Period>(brand.id, "periods", (d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)), "update period");
}

const EMPLOYEES = ["director", "researcher", "strategist", "copywriter", "film", "motion", "designer", "community", "growth"];

/** Save the Director's roadmap: phases, the owner's to-do list, plan usage and the team's tasks. */
export async function applyRoadmap(brand: Brand, period: Period, json: any, by: string) {
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const str = (v: any) => (v == null ? "" : String(v));
  const phases = arr(json?.phases).map((x: any) => ({ name: str(x.name), start: str(x.start), end: str(x.end), goal: str(x.goal), focus: str(x.focus) }));
  if (!phases.length) throw new Error('No "phases" in that answer.');
  const b = json?.budget ?? {};
  await updatePeriod(brand, period.id, {
    phases,
    needs: arr(json?.needs_from_owner).map(str),
    budget: { flow_clips: Number(b.flow_clips) || 0, chatgpt_images: Number(b.chatgpt_images) || 0, notes: str(b.notes) },
  });
  const t = now();
  const tasks: Task[] = arr(json?.tasks).map((x: any) => ({
    id: newId(),
    period_id: period.id,
    employee: EMPLOYEES.includes(str(x.employee)) ? str(x.employee) : "director",
    title: str(x.title),
    input: str(x.input),
    output: "",
    due: str(x.due),
    status: "todo" as TaskStatus,
    director_note: "",
    versions: [],
    created_at: t,
    updated_at: t,
  }));
  // replace the period's open tasks; keep finished ones
  await mutate<Task>(brand.id, "tasks", (d) => [...d.filter((x) => x.period_id !== period.id || x.status === "done"), ...tasks], `roadmap tasks: ${period.name}`);
  await log(brand.id, `${who(by)} built the roadmap for "${period.name}": ${phases.length} phases, ${tasks.length} tasks.`);
  return tasks.length;
}

/** Change a task. A new output keeps the old one as a version (restorable). */
export async function updateTask(brand: Brand, task: Task, patch: Partial<Task>, by = currentLogin()) {
  const versions = patch.output !== undefined && patch.output !== task.output && task.output ? [{ at: now(), by, output: task.output }, ...task.versions].slice(0, 20) : task.versions;
  await mutate<Task>(brand.id, "tasks", (d) => d.map((x) => (x.id === task.id ? { ...x, ...patch, versions, updated_at: now() } : x)), `task: ${task.title}`);
}

/** Save a new output for a piece; the old output is kept as a restorable version. */
export async function saveOutput(brand: Brand, item: ContentItem, output: Record<string, any>, extra: Partial<ContentItem> = {}) {
  await mutate<ContentItem>(
    brand.id,
    "content",
    (d) =>
      d.map((x) =>
        x.id !== item.id
          ? x
          : { ...x, ...extra, output, versions: x.output ? [{ at: now(), by: currentLogin(), output: x.output }, ...(x.versions ?? [])].slice(0, 15) : x.versions, updated_at: now() },
      ),
    `edit: ${item.title}`,
  );
}

/** Move a period: new dates, and the roadmap phases + open task due dates shift with the start. */
export async function movePeriod(brand: Brand, period: Period, patch: { name: string; goal: string; start: string; end: string }) {
  if (patch.end <= patch.start) throw new Error("The end date must be after the start date.");
  const shift = Math.round((new Date(patch.start + "T12:00:00").getTime() - new Date(period.start + "T12:00:00").getTime()) / 86400000);
  const mv = (d: string) => {
    if (!d || !shift) return d;
    const x = new Date(d + "T12:00:00");
    x.setDate(x.getDate() + shift);
    return x.toISOString().slice(0, 10);
  };
  await updatePeriod(brand, period.id, { ...patch, phases: period.phases.map((ph) => ({ ...ph, start: mv(ph.start), end: mv(ph.end) })) });
  if (shift) await mutate<Task>(brand.id, "tasks", (d) => d.map((t) => (t.period_id === period.id && t.status !== "done" ? { ...t, due: mv(t.due) } : t)), `move tasks ${shift} days`);
  await log(brand.id, `Period "${patch.name}" now ${patch.start} → ${patch.end}${shift ? ` (roadmap moved ${shift} days)` : ""}.`);
}
