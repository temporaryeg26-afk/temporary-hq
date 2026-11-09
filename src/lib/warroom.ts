/**
 * WAR ROOM — the goal-driven control room.
 * One north star (Drop 01 sells), real numbers every 48 h, nine roads running at once,
 * money only behind proof, and every plan red-teamed before it ships.
 * Built from: campaign-and-launch-planning (STORY), goals-and-kpis (NORTH), analytics-and-reporting (METER),
 * instagram-growth (sends + watch time), ugc-and-influencer (BRIEF), experimentation (TEST), hook-writer.
 */
import { insert, list, mutate, newId, now } from "./store";
import type { Brand } from "./types";

export const NORTH_STAR =
  "Our job is not to get people to understand TEMPORARY. Our job is to make the right people want Drop 01 badly enough that 25 November becomes a date they remember.";

// ------------------------------------------------------------------ settings (brand.settings.warroom)

export type ScenarioKey = "conservative" | "target" | "aggressive";
export type Scenario = { key: ScenarioKey; label: string; pieces: number; pieces_per_order: number; list_buy_rate: number; list_share: number; visit_buy_rate: number; visit_to_list: number; reach_to_visit: number };

export type WarSettings = {
  scenario: ScenarioKey;
  reveal_mode: "progressive" | "hidden"; // back print: gradual ladder from now, or hidden until the reveal
  stories: "off" | "launch_week" | "daily";
  test_budget_egp: number; // the small paid test Seif approved (0 = none)
  daily_cap_egp: number; // cap once a gate opens (0 = not set)
  boost_views: number; // gate 1: organic views in 48 h
  boost_actions: number; // gate 1: shares + saves in 48 h
  wave2_signups: number; // Circle wave 2 gate
  wave2_views: number;
  drop_list_url: string;
  meta_linked: "unknown" | "yes" | "no";
};

export const DEFAULT_WAR: WarSettings = {
  scenario: "target",
  reveal_mode: "hidden",
  stories: "off",
  test_budget_egp: 0,
  daily_cap_egp: 0,
  boost_views: 1500,
  boost_actions: 20,
  wave2_signups: 150,
  wave2_views: 5000,
  drop_list_url: "",
  meta_linked: "unknown",
};
export const warOf = (b: Brand): WarSettings => ({ ...DEFAULT_WAR, ...((b.settings as any)?.warroom ?? {}) });

/** Three honest scenarios — planning assumptions until our own numbers replace them. */
export const SCENARIOS: Scenario[] = [
  { key: "conservative", label: "Conservative", pieces: 150, pieces_per_order: 1.1, list_buy_rate: 0.1, list_share: 0.6, visit_buy_rate: 0.012, visit_to_list: 0.08, reach_to_visit: 0.02 },
  { key: "target", label: "Target", pieces: 390, pieces_per_order: 1.2, list_buy_rate: 0.15, list_share: 0.6, visit_buy_rate: 0.02, visit_to_list: 0.1, reach_to_visit: 0.03 },
  { key: "aggressive", label: "Aggressive", pieces: 390, pieces_per_order: 1.25, list_buy_rate: 0.22, list_share: 0.65, visit_buy_rate: 0.03, visit_to_list: 0.12, reach_to_visit: 0.04 },
];

/** Working backwards: pieces → orders → list + site visits → profile visits → reach. */
export function backwards(sc: Scenario) {
  const orders = Math.ceil(sc.pieces / sc.pieces_per_order);
  const listOrders = Math.round(orders * sc.list_share), directOrders = orders - listOrders;
  const signups = Math.ceil(listOrders / sc.list_buy_rate);
  const siteVisits = Math.ceil(directOrders / sc.visit_buy_rate);
  const profileVisits = Math.ceil(signups / sc.visit_to_list);
  const reach = Math.ceil(profileVisits / sc.reach_to_visit);
  return { orders, listOrders, directOrders, signups, siteVisits, profileVisits, reach };
}

// ------------------------------------------------------------------ the daily pulse (real numbers, one row per day)

export type Pulse = { id: string; date: string; followers?: number; signups_total?: number; profile_visits?: number; site_visits?: number; orders?: number; pieces?: number; ad_spend?: number; note?: string; created_at: string };

export const loadPulse = (brandId: string) => list<Pulse>(brandId, "pulse").then((r) => r.sort((a, b) => a.date.localeCompare(b.date))).catch(() => [] as Pulse[]);
export async function savePulse(brandId: string, row: Omit<Pulse, "id" | "created_at">) {
  await mutate<Pulse>(brandId, "pulse", (d) => {
    const i = d.findIndex((r) => r.date === row.date);
    const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v))));
    if (i >= 0) d[i] = { ...d[i], ...clean };
    else d.push({ ...(clean as any), id: newId(), created_at: now() });
  }, `pulse ${row.date}`);
}
export const latest = (p: Pulse[], k: keyof Pulse) => { for (let i = p.length - 1; i >= 0; i--) if (typeof p[i][k] === "number") return p[i][k] as number; return undefined; };

/** Sign-up pace: where we should be today on a straight line to the list target by the day before the drop. */
export function signupPace(today: string, start: string, end: string, target: number) {
  const t = (d: string) => Date.parse(d) / 864e5;
  const f = Math.min(1, Math.max(0, (t(today) - t(start)) / Math.max(1, t(end) - t(start))));
  const daysLeft = Math.max(0, Math.ceil(t(end) - t(today)));
  return { expected: Math.round(target * f), daysLeft };
}

// ------------------------------------------------------------------ post metrics (the 48-hour loop)

export type Engine = "viral" | "desire" | "conversion" | "";
export type Metric = { id: string; code: string; date: string; format: string; hook: string; engine?: Engine; views?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; follows?: number; captured_at: string };

export const loadMetrics = (brandId: string) => list<Metric>(brandId, "metrics").then((r) => r.sort((a, b) => b.date.localeCompare(a.date))).catch(() => [] as Metric[]);

/** Insert or update by Instagram shortcode — never duplicates. */
export async function upsertMetrics(brandId: string, rows: Partial<Metric>[]) {
  let added = 0, changed = 0;
  await mutate<Metric>(brandId, "metrics", (d) => {
    for (const r of rows) {
      if (!r.code) continue;
      const i = d.findIndex((x) => x.code === r.code);
      const clean = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== null && v !== ""));
      if (i >= 0) { d[i] = { ...d[i], ...clean, captured_at: now() }; changed++; }
      else { d.push({ date: "", format: "reel", hook: "", ...(clean as any), id: newId(), captured_at: now() }); added++; }
    }
  }, `metrics: ${rows.length} posts`);
  return { added, changed };
}

/** Accepts JSON (array of objects) or lines: code | date | format | views | likes | comments | shares | saves | follows | hook */
export function parseMetrics(text: string): Partial<Metric>[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[") || t.startsWith("{")) {
    const j = JSON.parse(t);
    return (Array.isArray(j) ? j : [j]).map((r: any) => ({ ...r, code: String(r.code ?? r.shortcode ?? "").trim() }));
  }
  const num = (s?: string) => { const n = Number(String(s ?? "").replace(/[, ]/g, "")); return s && !Number.isNaN(n) ? n : undefined; };
  return t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((c) => c[0]).map((c) => ({
    code: c[0], date: c[1] || undefined, format: c[2] || undefined, views: num(c[3]), likes: num(c[4]), comments: num(c[5]), shares: num(c[6]), saves: num(c[7]), follows: num(c[8]), hook: c[9] || undefined,
  }));
}

const med = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Scores every post against the account's own median — the only fair benchmark. */
export function readNumbers(ms: Metric[]) {
  const withViews = ms.filter((m) => typeof m.views === "number");
  const medViews = med(withViews.map((m) => m.views!));
  const act = (m: Metric) => (m.shares ?? 0) + (m.saves ?? 0) + (m.comments ?? 0);
  const medAct = med(withViews.map(act));
  const rows = withViews.map((m) => {
    const vIdx = (m.views ?? 0) / Math.max(1, medViews);
    const aIdx = act(m) / Math.max(1, medAct);
    const idx = vIdx * 0.6 + aIdx * 0.4;
    const verdict: "scale" | "keep" | "kill" = idx >= 1.5 ? "scale" : idx >= 0.6 ? "keep" : "kill";
    return { m, vIdx, aIdx, idx, verdict };
  });
  const recent = [...rows].sort((a, b) => b.m.date.localeCompare(a.m.date)).slice(0, 5);
  const recentMed = med(recent.map((r) => r.m.views ?? 0));
  return { medViews, medAct, rows, recentMed, trend: medViews ? recentMed / medViews : 0 };
}

/** Gate 1 — a post earns money behind it only after proving itself. */
export const gateOpen = (m: Metric, w: WarSettings) => (m.views ?? 0) >= w.boost_views && (m.shares ?? 0) + (m.saves ?? 0) >= w.boost_actions;

// ------------------------------------------------------------------ THE CIRCLE (ambassadors — internal word only)

export type CircleStatus = "candidate" | "shortlist" | "invited" | "accepted" | "sent" | "posted" | "dropped";
export type CircleScores = { relevance: number; quality: number; authenticity: number; engagement: number; cairo: number; growth: number };
export type CircleMember = {
  id: string; handle: string; name?: string; followers?: number; avg_likes?: number; avg_comments?: number; niche?: string;
  scores: CircleScores; wave: 0 | 1 | 2; status: CircleStatus; piece?: string; size?: string; link?: string;
  views?: number; follows?: number; signups?: number; disclosed?: boolean; rights_ok?: boolean; post_url?: string; notes?: string; created_at: string;
};
/** GPT's scorecard, kept: audience fit and content quality beat follower count. Each score 0–10. */
export const CIRCLE_WEIGHTS: [keyof CircleScores, string, number][] = [
  ["relevance", "Audience relevance", 0.3], ["quality", "Content quality", 0.25], ["authenticity", "Authenticity", 0.15],
  ["engagement", "Engagement", 0.15], ["cairo", "Cairo / Egypt relevance", 0.1], ["growth", "Growth potential", 0.05],
];
export const circleScore = (s: CircleScores) => Math.round(CIRCLE_WEIGHTS.reduce((t, [k, , w]) => t + (s[k] ?? 0) * w, 0) * 10);
export const engagementRate = (c: CircleMember) => (c.followers ? ((c.avg_likes ?? 0) + (c.avg_comments ?? 0)) / c.followers : undefined);
export const loadCircle = (brandId: string) => list<CircleMember>(brandId, "circle").catch(() => [] as CircleMember[]);
export async function addCircle(brandId: string, c: Omit<CircleMember, "id" | "created_at">) {
  return insert<CircleMember>(brandId, "circle", { ...c, id: newId(), created_at: now() }, `circle: ${c.handle}`);
}
export function wave2Gate(cs: CircleMember[], w: WarSettings) {
  const w1 = cs.filter((c) => c.wave === 1 && c.status !== "dropped");
  const signups = w1.reduce((t, c) => t + (c.signups ?? 0), 0), views = w1.reduce((t, c) => t + (c.views ?? 0), 0);
  return { members: w1.length, signups, views, open: signups >= w.wave2_signups || views >= w.wave2_views };
}

// ------------------------------------------------------------------ the nine roads (all at once)

export type Road = { key: string; name: string; job: string; kpi: string; href: string };
export const ROADS: Road[] = [
  { key: "reels", name: "Reels — Viral + Desire", job: "1 Reel a day from the real samples: contrast hooks + product motion", kpi: "views vs median, sends", href: "#/content" },
  { key: "circle", name: "The Circle", job: "10 people, 3 first; honest first reactions, labelled as gifts", kpi: "views, follows, sign-ups per member", href: "#/circle" },
  { key: "ugc", name: "UGC", job: "Unboxing, outfit, first-wear clips from the Circle and buyers — reshared with consent", kpi: "reshares, saves", href: "#/circle" },
  { key: "critics", name: "Critics", job: "2–3 tough fashion voices review a sample, good or bad", kpi: "comments, shares", href: "#/circle" },
  { key: "followers", name: "Followers", job: "Every piece ends with one ask: follow + send to one friend; reply within 1 h", kpi: "profile visits → follows", href: "#/growth-week" },
  { key: "list", name: "Drop list", job: "Site form + WhatsApp + comment-23 capture", kpi: "sign-ups per day vs pace", href: "#/" },
  { key: "shoot", name: "Campaign shoot", job: "Half day: 1 model, 2 Cairo locations, 3 pieces, 30–40 shots, 15–20 clips", kpi: "assets ready", href: "#/assets" },
  { key: "paid", name: "Paid test", job: "Small test behind 2–3 real product clips, only if Seif approves", kpi: "cost per sign-up", href: "#/ads" },
  { key: "site", name: "Website", job: "Real stock per design, Drop 01 hero, sticky Get-access button", kpi: "visits → sign-ups", href: "#/products" },
];
export type RoadState = { status: "not started" | "moving" | "blocked" | "done"; owner: string; next: string; updated_at?: string };
export const roadsOf = (b: Brand): Record<string, RoadState> => (b.settings as any)?.roads ?? {};

// ------------------------------------------------------------------ the rules every employee and prompt now follows

export function warRules(w: WarSettings) {
  return `WAR ROOM RULES (override older rules where they conflict)
- NORTH STAR: ${NORTH_STAR}
- THREE ENGINES, every piece belongs to one: VIRAL (strangers — contrast: «١٠٠ ألف vs ٢٠٠», mass vs limited, trend vs archive; curiosity; opinion) · DESIRE (make people want the clothes — real product motion, fit on a real person, fabric, details, packaging, Cairo) · CONVERSION (make warm people act — drop list, real counts, Circle proof, countdown with real dates).
- Instagram ranks sends per reach (DM shares) and watch time above everything; the first 2–3 seconds decide a Reel. Every piece ends with ONE ask: send it to one friend, follow, or comment 23 for the drop list.
- Product first. No more "why we don't spend / no agency" posts. Show value; let people conclude the price.
- REVEAL: ${w.reveal_mode === "progressive" ? "progressive ladder from now — full front → tiny glimpse of the back → macro crop → silhouette → worn with the back hidden → full back → 23 Nov full Drop 01" : "back prints stay hidden until the 23 Nov reveal; show fronts, fabric, colours, the bag"}.
- STORIES: ${w.stories === "daily" ? "on daily, 3–8 frames: poll, close-up, real count, drop-list link" : w.stories === "launch_week" ? "only 23–30 Nov" : "off for now"}.
- Momentum only when real: "437 joined the list" only if 437 did. No fake countdowns, no invented scarcity, no fake reviews.
- The Circle (never "ambassadors" in public, never "free"): gifted posts are labelled as gifts; reuse their content only with written consent; one tracked link each.
- Judge by numbers, not opinions: each post vs the account median every 48 h; kill the bottom third of formats, remake the winner with a new hook. Change one thing at a time when testing.
- Money moves only behind proof: a post with ${w.boost_views}+ views and ${w.boost_actions}+ shares/saves in 48 h${w.test_budget_egp ? `, or the approved ${w.test_budget_egp} EGP test` : ""}. Seif approves every budget.
- No repeats of anything posted unless marked as a deliberate repeat to stress something important.`;
}

export function numbersBlock(ms: Metric[]) {
  const r = readNumbers(ms);
  if (!r.rows.length) return "POST NUMBERS: none captured yet — say which numbers you need.";
  const top = [...r.rows].sort((a, b) => b.idx - a.idx);
  const line = (x: (typeof r.rows)[number]) => `- ${x.m.date} ${x.m.format} · «${(x.m.hook || x.m.code).slice(0, 70)}» · views ${x.m.views} · likes ${x.m.likes ?? "?"} · comments ${x.m.comments ?? "?"} · shares ${x.m.shares ?? "?"} · saves ${x.m.saves ?? "?"} → ${x.verdict.toUpperCase()}`;
  return `POST NUMBERS (real, from Instagram): median ${Math.round(r.medViews)} views; last 5 posts median ${Math.round(r.recentMed)} (${Math.round(r.trend * 100)}% of normal).
WINNERS (remake with new hooks):
${top.slice(0, 5).map(line).join("\n")}
LOSERS (stop these formats/angles):
${top.slice(-5).reverse().map(line).join("\n")}`;
}

/** The Director of Content's 48-hour brief — paste into Claude or ChatGPT. */
export function directorBrief(o: { brand: Brand; today: string; w: WarSettings; ms: Metric[]; pulse: Pulse[]; circle: CircleMember[]; roads: Record<string, RoadState>; dataBlock: string }) {
  const sc = SCENARIOS.find((s) => s.key === o.w.scenario)!, b = backwards(sc);
  const signups = latest(o.pulse, "signups_total") ?? 0;
  const roads = ROADS.map((r) => { const s = o.roads[r.key]; return `- ${r.name}: ${s?.status ?? "not started"}${s?.next ? ` · next: ${s.next}` : ""}`; }).join("\n");
  const circle = o.circle.filter((c) => c.status !== "dropped").map((c) => `- @${c.handle} · wave ${c.wave} · ${c.status} · score ${circleScore(c.scores)} · views ${c.views ?? 0} · sign-ups ${c.signups ?? 0}`).join("\n");
  return `YOU ARE: the Director of Content of TEMP. HQ's war room — the best launch marketer in Egyptian streetwear. You own one number: Drop 01 sells (${sc.label} scenario: ${sc.pieces} pieces ≈ ${b.orders} orders, needing ~${b.signups} drop-list sign-ups and ~${b.reach.toLocaleString()} people reached).
Where we are: ${signups} sign-ups so far. Today ${o.today}. Reveal 23 Nov, drop 25–30 Nov, Black Friday 27 Nov same price, last call 30 Nov.

${warRules(o.w)}

${numbersBlock(o.ms)}

THE NINE ROADS (all run at once):
${roads}

THE CIRCLE:
${circle || "- (nobody yet)"}

${o.dataBlock}

YOUR JOB NOW — the next 48 hours, all roads at once:
1. Diagnose the ONE broken stage of the funnel (reach → profile visit → follow → list → order) with the numbers above.
2. Kill / keep / scale: name the formats to stop and the winners to remake.
3. Brief 2 Reels (1/day) + any static/carousel: engine, hook (on-screen text + first frame + first spoken line, Masri), shot list from the REAL samples, caption, the one ask. No topic from ALREADY POSTED.
4. One concrete action for each of the nine roads, with an owner (Seif / HQ) and a deadline.
5. The 3 riskiest assumptions in your own plan.
Reply in English (copy in Masri) as a short brief. End with \`\`\`pitch [...] \`\`\` blocks for anything that needs Seif's decision.`;
}

/** The red team — GPT attacks the plan before it ships. */
export function redTeamPack(plan: string, context: string) {
  return `You are the red team for TEMPORARY™ (Egyptian premium limited streetwear, Founder Drop 01: 2 designs × 200, reveal 23 Nov, drop 25–30 Nov, no discounts, zero-to-small budget, Instagram-led). Attack the plan below like a ruthless launch strategist who gets paid only if Drop 01 sells out.

For each point: what will fail, why (evidence or reasoning), and the specific fix. Then: the 3 biggest risks to the 25 Nov launch, what is missing entirely, and a score out of 10 for "will this make people want Drop 01 and join the list". Be concrete — no generic advice. Respect: no fake urgency, no fake reviews, gifts disclosed, never say "free" publicly.

CONTEXT:
${context}

THE PLAN:
${plan}`;
}
