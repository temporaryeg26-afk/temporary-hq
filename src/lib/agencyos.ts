/**
 * TEMP. HQ — the agency engine.
 * One goal, six employees (one per tab). Each employee can:
 *   - checkIn(snapshot)  → an instant briefing computed from HQ's own data (no AI, no API)
 *   - ask(snapshot, q)   → a full expert brief to paste into Claude / ChatGPT for deeper thinking
 * Memory (what we already did + results) and weekly numbers feed every employee, so nothing repeats
 * and every decision is based on real results.
 */
import { list, insert, newId, now } from "./store";
import { loadAds, loadContent, log } from "./data";
import type { AdRecord, Brand, ContentItem, Product } from "./types";

// ------------------------------------------------------------------ goal & calendar

export type AgencyGoal = {
  goal_pieces: number; // Drop 1 goal (both designs)
  target_low: number; // 0.85
  target_high: number; // 0.90
  sold: number; // updated by you or the weekly check-in
  sold_updated_at?: string;
  early_access_start: string;
  early_access_end: string;
  drop_start: string;
  drop_end: string;
  ad_cap_egp: number;
  ad_spent_egp: number;
};

export const DEFAULT_GOAL: AgencyGoal = {
  goal_pieces: 120,
  target_low: 0.85,
  target_high: 0.9,
  sold: 0,
  early_access_start: "2026-11-08",
  early_access_end: "2026-11-10",
  drop_start: "2026-11-20",
  drop_end: "2026-11-26",
  ad_cap_egp: 5000,
  ad_spent_egp: 0,
};

export const goalOf = (b: Brand): AgencyGoal => ({ ...DEFAULT_GOAL, ...((b.settings as any)?.agency ?? {}) });

// ------------------------------------------------------------------ memory & weekly numbers

export type MemoryEntry = {
  id: string;
  date: string; // YYYY-MM-DD posted
  format: string; // reel | carousel | static | story | founder_video | ad
  topic: string;
  hook: string;
  views?: number;
  saves?: number;
  shares?: number;
  follows?: number;
  likes?: number;
  profile_visits?: number;
  avg_watch_s?: number;
  boosted?: boolean;
  verdict?: "winner" | "average" | "weak" | "suspect" | "";
  lesson?: string;
  created_at: string;
};

export type WeeklyEntry = {
  id: string;
  week_of: string; // Monday YYYY-MM-DD
  followers: number;
  views: number;
  profile_visits: number;
  link_clicks: number;
  saves: number;
  shares: number;
  new_follows: number;
  founder_dms: number;
  site_visits: number;
  add_to_bag: number;
  orders: number;
  pieces: number;
  ad_spend: number;
  notes: string;
  created_at: string;
};

export type AgentLog = { id: string; agent: AgentKey; question: string; answer: string; created_at: string };

/** A post's quality per 1,000 views (the signals Instagram rewards: sends, saves, follows). */
export function score(m: Pick<MemoryEntry, "views" | "saves" | "shares" | "follows">) {
  const v = Math.max(1, m.views ?? 0);
  return { savesShares: (((m.saves ?? 0) + (m.shares ?? 0)) / v) * 1000, follows: ((m.follows ?? 0) / v) * 1000 };
}
export function verdictOf(m: MemoryEntry, avg: { savesShares: number; follows: number }): MemoryEntry["verdict"] {
  if (m.verdict === "suspect") return "suspect";
  if (!m.views) return "";
  const s = score(m);
  const idx = (s.savesShares / Math.max(1, avg.savesShares) + s.follows / Math.max(0.5, avg.follows)) / 2;
  return idx >= 1.3 ? "winner" : idx >= 0.7 ? "average" : "weak";
}
export function averages(mem: MemoryEntry[]) {
  const real = mem.filter((m) => m.views && m.verdict !== "suspect");
  const n = Math.max(1, real.length);
  const tot = real.reduce((a, m) => { const s = score(m); return { savesShares: a.savesShares + s.savesShares, follows: a.follows + s.follows }; }, { savesShares: 0, follows: 0 });
  return { savesShares: tot.savesShares / n, follows: tot.follows / n };
}

// ------------------------------------------------------------------ snapshot (everything the employees read)

export type Snapshot = {
  brand: Brand;
  products: Product[];
  goal: AgencyGoal;
  content: ContentItem[];
  ads: AdRecord[];
  memory: MemoryEntry[];
  weekly: WeeklyEntry[];
  advice: AgentLog[];
  today: string;
};

export async function loadSnapshot(brand: Brand, products: Product[]): Promise<Snapshot> {
  const [content, ads, memory, weekly, advice] = await Promise.all([
    loadContent(brand.id).catch(() => [] as ContentItem[]),
    loadAds(brand.id).catch(() => [] as AdRecord[]),
    list<MemoryEntry>(brand.id, "memory").catch(() => []),
    list<WeeklyEntry>(brand.id, "weekly").catch(() => []),
    list<AgentLog>(brand.id, "agentlog").catch(() => []),
  ]);
  return {
    brand, products, goal: goalOf(brand),
    content: content.filter((c) => c.status !== "rejected"),
    ads, memory: memory.sort((a, b) => b.date.localeCompare(a.date)),
    weekly: weekly.sort((a, b) => b.week_of.localeCompare(a.week_of)),
    advice: advice.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    today: new Date().toISOString().slice(0, 10),
  };
}

export async function addMemory(brandId: string, e: Omit<MemoryEntry, "id" | "created_at">) {
  const row: MemoryEntry = { ...e, id: newId(), created_at: now() };
  await insert(brandId, "memory", row, `memory: ${e.topic}`);
  return row;
}
export async function addWeekly(brandId: string, e: Omit<WeeklyEntry, "id" | "created_at">) {
  const row: WeeklyEntry = { ...e, id: newId(), created_at: now() };
  await insert(brandId, "weekly", row, `weekly numbers ${e.week_of}`);
  await log(brandId, `Weekly numbers saved for the week of ${e.week_of}.`);
  return row;
}
export async function saveAdvice(brandId: string, agent: AgentKey, question: string, answer: string) {
  const row: AgentLog = { id: newId(), agent, question: question.slice(0, 2000), answer: answer.slice(0, 20000), created_at: now() };
  await insert(brandId, "agentlog", row, `${AGENTS[agent].name} advice`);
  return row;
}

// ------------------------------------------------------------------ helpers

const days = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
export const daysTo = (s: Snapshot, d: string) => days(s.today, d);
const upcoming = (s: Snapshot, n = 7) => s.content.filter((c) => c.scheduled_for >= s.today && days(s.today, c.scheduled_for) < n);
export const phaseOf = (s: Snapshot) => {
  const g = s.goal;
  if (s.today < g.early_access_start) return "pre-launch";
  if (s.today <= g.early_access_end) return "early access";
  if (s.today < g.drop_start) return "countdown";
  if (s.today <= g.drop_end) return "drop live";
  return "after the drop";
};

export function progress(s: Snapshot) {
  const g = s.goal, low = Math.ceil(g.goal_pieces * g.target_low), high = Math.ceil(g.goal_pieces * g.target_high);
  const pct = g.goal_pieces ? s.goal.sold / g.goal_pieces : 0;
  // simple pace: share of the selling window already passed (early access + drop window)
  const sellDays = days(g.early_access_start, g.drop_end) + 1;
  const passed = Math.min(sellDays, Math.max(0, days(g.early_access_start, s.today) + 1));
  const expectedByNow = s.today < g.early_access_start ? 0 : Math.round((low * passed) / sellDays);
  return { low, high, pct, expectedByNow, onTrack: s.goal.sold >= expectedByNow };
}

// ------------------------------------------------------------------ the six employees

export type AgentKey = "director" | "content" | "growth" | "media" | "community" | "brand";
export type Briefing = { status: string; good: string[]; wrong: string[]; next: { text: string; href?: string }[] };
type Agent = { key: AgentKey; name: string; title: string; room: string; expertise: string; checkIn: (s: Snapshot) => Briefing };

const ALGO_2026 = `How Instagram ranks content now (2026): sends per reach (shares to DMs) weigh most, then watch time / completion, then saves; likes barely matter. A high skip rate in the first 1–2 seconds kills reach. Original content only (reposted / watermarked content is demoted, now also for photos and carousels). Max 5 hashtags; keywords in the caption matter for search. Trial Reels test content on non-followers first. Reels bring ~95% of this account's views. Profiles built around an AI-generated person must carry the "AI-generated profile" label or reach is limited.`;
const PSYCH = `Buyer psychology we use (ethically): curiosity gaps that the content actually resolves; identity ("people like us wear this"); honest scarcity (a real number, never restocked); reciprocity (teach for free first); commitment ladder (follow → comment FOUNDER → DM → early access → order → Founder status); social proof only when real (never bought likes or fake reviews); loss aversion only when true ("the edition closes 26 Nov"). Egyptian Gen Z / millennials: Masri, humour, local references, mistrust of hype, love of local brands done right.`;
const BRAND_RULES = `TEMPORARY™ rules: premium limited Egyptian streetwear, dark/chrome identity, EVERYTHING IS TEMPORARY. Founder Drop 1 = 2 designs (KEEP IT REAL, TOO SMART FOR THIS WORLD) on tee / oversized / hoodie / crewneck, 200 pieces per design in total, never restocked, made to order (vendor 7 working days, delivery 10–14 days). Founder = 1 piece from any Founder Drop; Founder Elite = 1 piece from each of the 3; Member = buyer of a regular drop. Confirmed Founder perks: early access to the next drops + a private circle — nothing else may be promised. No discounts ever. Hashtag #temporary_eg. Never name competitors, never invent facts. The masked Founder is an AI character: AI label on, never claim he is filmed live.`;

export const AGENTS: Record<AgentKey, Agent> = {
  director: {
    key: "director", name: "The Director", title: "Agency director", room: "director",
    expertise: `You are the agency director of TEMPORARY™. You own the goal and you are honest about the gap. You diagnose the bottleneck with the funnel math: pieces = site visits × conversion × pieces per order; site visits = reach × profile visit rate × link click rate. You decide what to stop, keep and change each week and give the founder max 3 tasks a day. ${BRAND_RULES}`,
    checkIn: (s) => {
      const p = progress(s), g = s.goal, wrong: string[] = [], good: string[] = [], next: Briefing["next"] = [];
      const ph = phaseOf(s), w = s.weekly[0];
      if (s.today >= g.early_access_start) (p.onTrack ? good : wrong).push(`Sales: ${g.sold} of ${g.goal_pieces} pieces (${Math.round(p.pct * 100)}%). Expected by now: ${p.expectedByNow}.`);
      if (!w || daysTo(s, w.week_of) < -8) { wrong.push("No weekly numbers this week — I'm flying blind."); next.push({ text: "Log this week's Instagram numbers (or let the Chrome check-in do it)", href: "#/growth-week" }); }
      else {
        if (w.orders === 0 && s.today >= g.early_access_start) wrong.push(`Visits but no orders last week (${w.site_visits} visits). Check price clarity, sizes and checkout.`);
        if (w.founder_dms > 0) good.push(`${w.founder_dms} FOUNDER DMs last week — real buyers raising their hand.`);
        if (w.views && w.new_follows / Math.max(1, w.views) * 1000 < 5) wrong.push("Follows per 1,000 views are low — hooks get views but don't make people follow.");
      }
      const need = upcoming(s, 3).filter((c) => c.status === "needs_you");
      if (need.length) next.push({ text: `Approve ${need.length} piece(s) for the next 3 days`, href: "#/approve" });
      if (!upcoming(s, 7).length) { wrong.push("Nothing planned for the next 7 days."); next.push({ text: "Plan the next 7 days with the Content team", href: "#/calendar" }); }
      if (ph === "pre-launch") next.push({ text: `${daysTo(s, g.early_access_start)} days to early access (${g.early_access_start}) — real sample photos due 4 Nov`, href: "#/content" });
      if (ph === "early access" || ph === "drop live") next.push({ text: "Answer FOUNDER DMs and abandoned bags today", href: "#/community" });
      if (g.ad_spent_egp > g.ad_cap_egp * 0.8) wrong.push(`Ad spend at ${g.ad_spent_egp} of ${g.ad_cap_egp} EGP — hold new spend unless a winner is proven.`);
      return { status: `${ph.toUpperCase()} · goal ${g.goal_pieces} pieces · aim ${p.low}–${p.high} sold · ${g.sold} sold so far`, good, wrong, next: next.slice(0, 3) };
    },
  },
  content: {
    key: "content", name: "Creative Director", title: "Content, hooks & copy", room: "content",
    expertise: `You are TEMPORARY™'s creative director and Masri copywriter. You write scroll-stopping hooks (first 1 second), one idea per Reel, payoff + a send/save ask at the end, captions with the hook in line 1, a specific question, and 5 hashtags (#temporary_eg #CairoStreetwear + 1 topic, #ستريت_وير or #براند_مصري + 1 Arabic topic). Never repeat a topic or hook from memory. Formats: 1 Founder Reel/day (8s Flow clips, his own Masri voice), 2–3 motion carousels/week, stories daily, statics only for big moments. ${ALGO_2026} ${PSYCH} ${BRAND_RULES}`,
    checkIn: (s) => {
      const up = upcoming(s, 7), need = up.filter((c) => c.status === "needs_you"), appr = up.filter((c) => c.status === "approved");
      const reels = up.filter((c) => ["reel", "founder_video"].includes(c.format)).length;
      const wrong: string[] = [], good: string[] = [], next: Briefing["next"] = [];
      if (reels < 5) wrong.push(`Only ${reels} Reel/Founder videos in the next 7 days — Reels bring ~95% of your views. Aim for 7.`);
      else good.push(`${reels} Reels planned this week.`);
      if (need.length) next.push({ text: `Review & approve ${need.length} piece(s)`, href: "#/approve" });
      const wins = s.memory.filter((m) => m.verdict === "winner").slice(0, 2);
      if (wins.length) good.push(`Do more like: ${wins.map((w) => `"${w.hook || w.topic}"`).join(", ")}.`);
      next.push({ text: "Open the grid and make today's pieces", href: "#/grid" });
      return { status: `${up.length} pieces in the next 7 days · ${appr.length} approved · ${need.length} waiting for you`, good, wrong, next };
    },
  },
  growth: {
    key: "growth", name: "Growth Analyst", title: "Numbers, algorithm & tests", room: "growth",
    expertise: `You are TEMPORARY™'s growth analyst. You judge content by saves+shares per 1,000 views and follows per 1,000 views (never likes — this account had inauthentic likes before, so likes are not evidence). You compare every post to the account's own averages, find the winning hook styles, and propose one test per week (hook style, length, format, posting time, Trial Reels). ${ALGO_2026}`,
    checkIn: (s) => {
      const avg = averages(s.memory), w = s.weekly[0], prev = s.weekly[1], wrong: string[] = [], good: string[] = [], next: Briefing["next"] = [];
      if (!w) { wrong.push("No weekly numbers yet."); next.push({ text: "Log this week's numbers", href: "#/growth-week" }); }
      else {
        if (prev) { const d = w.followers - prev.followers; (d > 0 ? good : wrong).push(`Followers ${d >= 0 ? "+" : ""}${d} this week (${w.followers}).`); }
        good.push(`Last week: ${w.views.toLocaleString()} views · ${w.saves + w.shares} saves+shares · ${w.new_follows} follows · ${w.founder_dms} FOUNDER DMs.`);
      }
      const unscored = s.memory.filter((m) => !m.views).length;
      if (unscored) next.push({ text: `Add results to ${unscored} posts in memory`, href: "#/memory" });
      next.push({ text: "Check what to do more of / stop", href: "#/memory" });
      return { status: `Your average: ${avg.savesShares.toFixed(1)} saves+shares and ${avg.follows.toFixed(1)} follows per 1,000 views`, good, wrong, next };
    },
  },
  media: {
    key: "media", name: "Media Buyer", title: "Ads, funnels & budget", room: "media",
    expertise: `You are TEMPORARY™'s media buyer (Meta Ads Manager, Instagram placements only — there is no Facebook page). Funnel layers: COLD (best organic Reels, objective = profile visits / follows, Cairo+Giza+Alexandria 18–30, streetwear interests or Advantage+ audience) → WARM (video viewers 50%+, profile engagers, site visitors: early access / reveal creative) → HOT (add-to-bag / checkout abandoners via the website's own list + retargeting). Only boost proven winners (top saves/shares/follows), test 3 creatives × 100 EGP for 2 days, keep the cheapest cost per follow (target < 5 EGP) or per order (max ~100 EGP because margin is ~200 EGP). Stop-loss: stop any ad at 2× target cost after 48h; never exceed the cap; never use the old "generation" boost audience. ${BRAND_RULES}`,
    checkIn: (s) => {
      const g = s.goal, left = g.ad_cap_egp - g.ad_spent_egp, wrong: string[] = [], good: string[] = [], next: Briefing["next"] = [];
      const plan = s.ads.find((a) => a.kind === "plan"), wins = s.memory.filter((m) => m.verdict === "winner" && ["reel", "founder_video"].includes(m.format));
      if (!plan) { wrong.push("No ad plan yet."); next.push({ text: "Ask the Media Buyer for the launch funnel plan", href: "#/ads" }); }
      if (wins.length) good.push(`${wins.length} proven winner Reel(s) ready to promote: "${wins[0].hook || wins[0].topic}".`);
      else wrong.push("No proven winner yet — don't spend; let organic find one first.");
      next.push({ text: `Budget left: ${left.toLocaleString()} of ${g.ad_cap_egp.toLocaleString()} EGP`, href: "#/ads" });
      return { status: `Phase: ${phaseOf(s)} · spent ${g.ad_spent_egp} / ${g.ad_cap_egp} EGP`, good, wrong, next };
    },
  },
  community: {
    key: "community", name: "Community & Sales", title: "DMs, buyers & Founders", room: "community",
    expertise: `You are TEMPORARY™'s community and sales manager. You answer DMs in warm, confident Masri within the hour, move people up the ladder (follow → FOUNDER → early access → order), recover abandoned bags politely (one email + one WhatsApp, never pushy), collect real UGC with permission, and keep the Founder / Founder Elite / Member records right. Never promise perks beyond early access + private circle; never invent stock or delivery claims (made to order, 10–14 days). ${BRAND_RULES}`,
    checkIn: (s) => {
      const w = s.weekly[0], g = s.goal, next: Briefing["next"] = [], good: string[] = [], wrong: string[] = [];
      if (w) good.push(`Last week: ${w.founder_dms} FOUNDER DMs · ${w.add_to_bag} add-to-bag · ${w.orders} orders.`);
      if (w && w.add_to_bag > w.orders) wrong.push(`${w.add_to_bag - w.orders} bags not turned into orders — follow up today.`);
      next.push({ text: "Answer FOUNDER comments & DMs (ready replies)", href: "#/community" });
      if (s.today >= g.early_access_start) next.push({ text: "Check new orders and send to the vendor the same day", href: "#/orders" });
      return { status: `Phase: ${phaseOf(s)} · ${g.sold} pieces sold`, good, wrong, next };
    },
  },
  brand: {
    key: "brand", name: "Brand Strategist", title: "Identity, rules & decisions", room: "brand",
    expertise: `You are TEMPORARY™'s brand strategist. You protect the identity (dark, chrome, masked Founder, EVERYTHING IS TEMPORARY), the decided rules, and you keep the list of open decisions (Founder pricing, later drop sizes, privileges) clearly separated from what's decided. ${BRAND_RULES}`,
    checkIn: (s) => ({
      status: `Decided: 3 Founder Drops · 200 per design · no restock · no discounts · black bag · made to order`,
      good: ["The identity and rules are written in the Brand book; every employee follows them."],
      wrong: ["Still open: Founder / Elite pricing, later drop sizes, extra Founder privileges."],
      next: [{ text: "Review the brand book", href: "#/doctrine" }],
    }),
  },
};

// ------------------------------------------------------------------ the "Ask" brief (paste into Claude / ChatGPT)

export function askPrompt(key: AgentKey, s: Snapshot, question: string) {
  const a = AGENTS[key], b = a.checkIn(s), g = s.goal, p = progress(s), avg = averages(s.memory);
  const mem = s.memory.slice(0, 25).map((m) => `- ${m.date} ${m.format} · ${m.topic} · hook: ${m.hook || "—"} · views ${m.views ?? "?"} · saves ${m.saves ?? "?"} · shares ${m.shares ?? "?"} · follows ${m.follows ?? "?"}${m.boosted ? " · BOOSTED" : ""} · verdict ${m.verdict || "?"}${m.lesson ? ` · lesson: ${m.lesson}` : ""}`).join("\n");
  const wk = s.weekly.slice(0, 4).map((w) => `- week of ${w.week_of}: followers ${w.followers}, views ${w.views}, profile visits ${w.profile_visits}, link clicks ${w.link_clicks}, saves ${w.saves}, shares ${w.shares}, follows ${w.new_follows}, FOUNDER DMs ${w.founder_dms}, site visits ${w.site_visits}, add-to-bag ${w.add_to_bag}, orders ${w.orders}, pieces ${w.pieces}, ad spend ${w.ad_spend}${w.notes ? ` (${w.notes})` : ""}`).join("\n");
  const up = upcoming(s, 14).map((c) => `- ${c.scheduled_for} ${c.format} · ${c.title} · ${c.status}`).join("\n");
  return `${a.expertise}

TODAY: ${s.today} · PHASE: ${phaseOf(s)}
GOAL: Founder Drop 1 = ${g.goal_pieces} pieces; target 85–90% = ${p.low}–${p.high} sold. Sold so far: ${g.sold}. Early access ${g.early_access_start}–${g.early_access_end}; public drop ${g.drop_start}–${g.drop_end}. Ad cap ${g.ad_cap_egp} EGP, spent ${g.ad_spent_egp}.
ACCOUNT AVERAGE: ${avg.savesShares.toFixed(1)} saves+shares and ${avg.follows.toFixed(1)} follows per 1,000 views.

MY CHECK-IN SAYS: ${b.status}
Good: ${b.good.join(" | ") || "—"}
Wrong: ${b.wrong.join(" | ") || "—"}

MEMORY — what we already posted and how it did (never repeat a topic or hook):
${mem || "- (empty)"}

LAST WEEKS:
${wk || "- (no weekly numbers yet)"}

PLANNED NEXT 14 DAYS:
${up || "- (nothing planned)"}

THE FOUNDER ASKS: ${question || "What should we do this week to reach the goal? Be specific: what to stop, keep and change, and give me max 3 tasks for today."}

Answer in clear, simple English (Masri for any copy). Be honest about the gap; never invent numbers, claims or perks.`;
}
