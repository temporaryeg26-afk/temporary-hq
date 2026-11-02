/**
 * TEMP. HQ — the agency engine.
 * One goal, six employees (one per tab). Each employee can:
 *   - checkIn(snapshot)  → an instant briefing computed from HQ's own data (no AI, no API)
 *   - ask(snapshot, q)   → a full expert brief to paste into Claude / ChatGPT for deeper thinking
 * Memory (what we already did + results) and weekly numbers feed every employee, so nothing repeats
 * and every decision is based on real results.
 */
import { list, insert, mutate, newId, now } from "./store";
import { loadAds, loadContent, log } from "./data";
import type { AdRecord, Brand, ContentItem, Product } from "./types";
import { brainOf, KNOWLEDGE_SEED, MISSION, playsFor, TEAM_RULES } from "./experts";

// ------------------------------------------------------------------ goal & calendar

export type AgencyGoal = {
  goal_pieces: number; // Drop 1 goal (both designs)
  target_low: number; // 0.85
  target_high: number; // 0.90
  sold: number; // updated by you or the weekly check-in
  sold_updated_at?: string;
  early_access_start: string; // if start > end there is NO early access
  early_access_end: string;
  reveal?: string; // design reveal date
  drop_start: string;
  drop_end: string;
  ad_cap_egp: number;
  ad_spent_egp: number;
};

export const DEFAULT_GOAL: AgencyGoal = {
  goal_pieces: 400, // 2 designs × 200 pieces
  target_low: 0.85,
  target_high: 0.9,
  sold: 0,
  early_access_start: "2026-11-25", // no early access (start > end)
  early_access_end: "2026-11-24",
  reveal: "2026-11-23",
  drop_start: "2026-11-25",
  drop_end: "2026-11-30",
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
export type ChatMsg = { id: string; agent: AgentKey; role: "you" | "agent"; text: string; created_at: string };
export type PitchStatus = "pitched" | "approved" | "rejected" | "done";
export type Pitch = { id: string; agent: AgentKey; title: string; idea: string; why: string; impact: string; cost_egp: number; effort: "low" | "medium" | "high"; status: PitchStatus; note?: string; source: "check-in" | "chat" | "meeting"; created_at: string; decided_at?: string };
export type Knowledge = { id: string; area: string; finding: string; use: string; source: string; agents: AgentKey[]; date: string; created_at: string };

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
  chat: ChatMsg[];
  pitches: Pitch[];
  knowledge: Knowledge[];
  intel: Record<string, string>[];
  pains: Record<string, string>[];
  trendlab: Record<string, string>[];
  today: string;
};

export async function loadSnapshot(brand: Brand, products: Product[]): Promise<Snapshot> {
  const [content, ads, memory, weekly, advice, chat, pitches, knowledge, intel, pains, trendlab] = await Promise.all([
    loadContent(brand.id).catch(() => [] as ContentItem[]),
    loadAds(brand.id).catch(() => [] as AdRecord[]),
    list<MemoryEntry>(brand.id, "memory").catch(() => []),
    list<WeeklyEntry>(brand.id, "weekly").catch(() => []),
    list<AgentLog>(brand.id, "agentlog").catch(() => []),
    list<ChatMsg>(brand.id, "chat").catch(() => []),
    list<Pitch>(brand.id, "pitches").catch(() => []),
    list<Knowledge>(brand.id, "knowledge").catch(() => []),
    list<Record<string, string>>(brand.id, "intel").catch(() => []),
    list<Record<string, string>>(brand.id, "pains").catch(() => []),
    list<Record<string, string>>(brand.id, "trendlab").catch(() => []),
  ]);
  return {
    brand, products, goal: goalOf(brand),
    content: content.filter((c) => c.status !== "rejected"),
    ads, memory: memory.sort((a, b) => b.date.localeCompare(a.date)),
    weekly: weekly.sort((a, b) => b.week_of.localeCompare(a.week_of)),
    advice: advice.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    chat: chat.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    pitches: pitches.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    knowledge: knowledge.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    intel, pains, trendlab,
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
/** Early access only exists when its start is on/before its end. */
export const hasEarlyAccess = (g: AgencyGoal) => g.early_access_start <= g.early_access_end;
/** First day anyone can buy. */
export const sellStart = (g: AgencyGoal) => (hasEarlyAccess(g) ? g.early_access_start : g.drop_start);
export const revealOf = (g: AgencyGoal) => g.reveal ?? sellStart(g);
export const phaseOf = (s: Snapshot) => {
  const g = s.goal;
  if (!hasEarlyAccess(g)) {
    if (s.today < revealOf(g)) return "pre-launch";
    if (s.today < g.drop_start) return "countdown";
    if (s.today <= g.drop_end) return "drop live";
    return "after the drop";
  }
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
  const sellDays = days(sellStart(g), g.drop_end) + 1;
  const passed = Math.min(sellDays, Math.max(0, days(sellStart(g), s.today) + 1));
  const expectedByNow = s.today < sellStart(g) ? 0 : Math.round((low * passed) / sellDays);
  return { low, high, pct, expectedByNow, onTrack: s.goal.sold >= expectedByNow };
}

// ------------------------------------------------------------------ the six employees

export type AgentKey = "director" | "content" | "growth" | "media" | "community" | "brand";
export type Briefing = { status: string; good: string[]; wrong: string[]; next: { text: string; href?: string }[] };
type Agent = { key: AgentKey; name: string; title: string; room: string; expertise: string; checkIn: (s: Snapshot) => Briefing };

const ALGO_2026 = `How Instagram ranks content now (2026): sends per reach (shares to DMs) weigh most, then watch time / completion, then saves; likes barely matter. A high skip rate in the first 1–2 seconds kills reach. Original content only (reposted / watermarked content is demoted, now also for photos and carousels). Max 5 hashtags; keywords in the caption matter for search. Trial Reels test content on non-followers first. Reels bring ~95% of this account's views. Profiles built around an AI-generated person must carry the "AI-generated profile" label or reach is limited.`;
const PSYCH = `Buyer psychology we use (ethically): curiosity gaps that the content actually resolves; identity ("people like us wear this"); honest scarcity (a real number, never restocked); reciprocity (teach for free first); commitment ladder (follow → comment FOUNDER → DM → early access → order → Founder status); social proof only when real (never bought likes or fake reviews); loss aversion only when true ("the edition closes on the last day of the drop"). Egyptian Gen Z / millennials: Masri, humour, local references, mistrust of hype, love of local brands done right.`;
const BRAND_RULES = `TEMPORARY™ rules: premium limited Egyptian streetwear, dark/chrome identity, EVERYTHING IS TEMPORARY. Founder Drop 1 = 2 designs (KEEP IT REAL: graffiti typography in blue/red with a faceless hooded figure; TOO SMART FOR THIS WORLD: neon green/magenta drip type with a Rottweiler in headphones blowing pink bubblegum) — bold, multi-colour statement graphics on black; never publish advice against bold colour, graphics or loud prints — on tee / oversized / hoodie / crewneck, 200 pieces per design in total, never restocked, made to order (delivery days pending vendor confirmation — never promise a number). Founder Drop 1 goal: 400 pieces (2 designs × 200). CURRENT CAMPAIGN (overrides any older early-access step): NO early access; designs hidden until the reveal on 23 Nov; drop open to everyone 25–30 Nov (salary week); Black Friday 27 Nov = same price, no discount; last call 30 Nov. Retail prices = exactly the HQ product catalogue (e.g. regular tee 900, standard hoodie 1,300, premium hoodie 1,500, premium crewneck 1,400 EGP) — public from the reveal, never discounted. Hoodie: heavy fabric, clean hood with no drawstring. Every piece goes through the 5-judge Council (Director → The Council). Founder = 1 piece from any Founder Drop; Founder Elite = 1 piece from each of the 3; Member = buyer of a regular drop. Confirmed Founder perks: early access to the next drops + a private circle — nothing else may be promised. No discounts ever. Returns: made to order, so exchange or refund only if a piece is defective or the wrong item was sent (no change-of-mind returns). Hashtag #temporary_eg. Never name competitors, never invent facts. The masked Founder is an AI character: AI label on, never claim he is filmed live.`;

export const AGENTS: Record<AgentKey, Agent> = {
  director: {
    key: "director", name: "The Director", title: "Agency director", room: "director",
    expertise: `You are the agency director of TEMPORARY™. You own the goal and you are honest about the gap. You diagnose the bottleneck with the funnel math: pieces = site visits × conversion × pieces per order; site visits = reach × profile visit rate × link click rate. You decide what to stop, keep and change each week and give the founder max 3 tasks a day. ${BRAND_RULES}`,
    checkIn: (s) => {
      const p = progress(s), g = s.goal, wrong: string[] = [], good: string[] = [], next: Briefing["next"] = [];
      const ph = phaseOf(s), w = s.weekly[0];
      if (s.today >= sellStart(g)) (p.onTrack ? good : wrong).push(`Sales: ${g.sold} of ${g.goal_pieces} pieces (${Math.round(p.pct * 100)}%). Expected by now: ${p.expectedByNow}.`);
      if (!w || daysTo(s, w.week_of) < -8) { wrong.push("No weekly numbers this week — I'm flying blind."); next.push({ text: "Log this week's Instagram numbers (or let the Chrome check-in do it)", href: "#/growth-week" }); }
      else {
        if (w.orders === 0 && s.today >= sellStart(g)) wrong.push(`Visits but no orders last week (${w.site_visits} visits). Check price clarity, sizes and checkout.`);
        if (w.founder_dms > 0) good.push(`${w.founder_dms} FOUNDER DMs last week — real buyers raising their hand.`);
        if (w.views && w.new_follows / Math.max(1, w.views) * 1000 < 5) wrong.push("Follows per 1,000 views are low — hooks get views but don't make people follow.");
      }
      const need = upcoming(s, 3).filter((c) => c.status === "needs_you");
      if (need.length) next.push({ text: `Approve ${need.length} piece(s) for the next 3 days`, href: "#/approve" });
      if (!upcoming(s, 7).length) { wrong.push("Nothing planned for the next 7 days."); next.push({ text: "Plan the next 7 days with the Content team", href: "#/calendar" }); }
      if (ph === "pre-launch" && !hasEarlyAccess(g)) next.push({ text: `${daysTo(s, revealOf(g))} days to the reveal (${revealOf(g)}), ${daysTo(s, g.drop_start)} to the drop (${g.drop_start}) — post real sample footage every day, design hidden until the reveal`, href: "#/content" });
      if (ph === "pre-launch" && hasEarlyAccess(g)) next.push({ text: `${daysTo(s, g.early_access_start)} days to early access (${g.early_access_start}) — real sample photos needed 7 days before (detail shots for the teasers, then the reveal shoot)`, href: "#/content" });
      if (ph === "early access" || ph === "drop live") next.push({ text: "Answer FOUNDER DMs and abandoned bags today", href: "#/community" });
      if (g.ad_spent_egp > g.ad_cap_egp * 0.8) wrong.push(`Ad spend at ${g.ad_spent_egp} of ${g.ad_cap_egp} EGP — hold new spend unless a winner is proven.`);
      const waiting = s.pitches.filter((x) => x.status === "pitched"), approved = s.pitches.filter((x) => x.status === "approved");
      if (waiting.length) wrong.push(`${waiting.length} idea(s) from the team are waiting for your decision.`);
      if (approved.length) good.push(`${approved.length} approved idea(s) in progress.`);
      const openPains = s.pains.filter((x) => x.status !== "answered");
      if (openPains.length && s.today < sellStart(g)) wrong.push(`${openPains.length} customer pain(s) still unanswered before the drop — e.g. "${openPains[0].pain}".`);
      if (!s.intel.length) wrong.push("No competitor intel yet — load it in Growth → Competitors & ads.");
      const lastK = s.knowledge[0];
      if (!lastK || daysTo(s, lastK.date) < -8) wrong.push("Team knowledge is older than a week — the Sunday team meeting should refresh it.");
      const first: Briefing["next"] = approved.slice(0, 2).map((x) => ({ text: `Do: ${x.title} (${AGENTS[x.agent].name})`, href: "#/" }));
      if (waiting.length) first.push({ text: `Decide on ${waiting.length} pitch(es) from the team`, href: "#/" });
      return { status: `${ph.toUpperCase()} · goal ${g.goal_pieces} pieces · aim ${p.low}–${p.high} sold · ${g.sold} sold so far`, good, wrong, next: [...first, ...next].slice(0, 3) };
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
    expertise: `You are TEMPORARY™'s community and sales manager. You answer DMs in warm, confident Masri within the hour, move people up the ladder (follow → comment 23 / FOUNDER → DM + Close Friends → reveal reminder → order on drop day), recover abandoned bags politely (one email + one WhatsApp, never pushy), collect real UGC with permission, and keep the Founder / Founder Elite / Member records right. Never promise perks beyond early access + private circle; never invent stock or delivery claims (made to order; delivery days are being confirmed with the vendor — never promise a number until HQ says so). ${BRAND_RULES}`,
    checkIn: (s) => {
      const w = s.weekly[0], g = s.goal, next: Briefing["next"] = [], good: string[] = [], wrong: string[] = [];
      if (w) good.push(`Last week: ${w.founder_dms} FOUNDER DMs · ${w.add_to_bag} add-to-bag · ${w.orders} orders.`);
      if (w && w.add_to_bag > w.orders) wrong.push(`${w.add_to_bag - w.orders} bags not turned into orders — follow up today.`);
      next.push({ text: "Answer FOUNDER comments & DMs (ready replies)", href: "#/community" });
      if (s.today >= sellStart(g)) next.push({ text: "Check new orders and send to the vendor the same day", href: "#/orders" });
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

// ------------------------------------------------------------------ ideas each employee pitches (no AI needed)

export type PitchDraft = { title: string; idea: string; why: string; impact: string; cost_egp: number; effort: Pitch["effort"] };

/** The employee's own ideas for this phase, from their playbook + live data. Already-pitched titles are skipped. */
export function ideasOf(key: AgentKey, s: Snapshot): PitchDraft[] {
  const ph = phaseOf(s), out: PitchDraft[] = [];
  const wins = s.memory.filter((m) => m.verdict === "winner");
  if (key === "media" && wins.length && s.goal.ad_spent_egp < s.goal.ad_cap_egp) {
    const w = wins[0];
    out.push({ title: `Boost our winner: "${(w.hook || w.topic).slice(0, 60)}"`, idea: "Cold test: 100–150 EGP/day for 3–5 days to Cairo/Giza/Alex 18–30, objective follows / profile visits. Stop at 2× target cost after 48h.", why: `It beat our average (${w.follows ?? "?"} follows, ${(w.saves ?? 0) + (w.shares ?? 0)} saves+shares). Paying only for proven content.`, impact: "~100–150 real follows at < 5 EGP each", cost_egp: 500, effort: "low" });
  }
  if (key === "growth" && wins.length) out.push({ title: "Repeat the winning mechanism with a new topic", idea: `Next Founder video uses the same hook type as "${(wins[0].hook || wins[0].topic).slice(0, 60)}" (number / contrast), new topic, plus a Trial Reel with a second hook.`, why: "Winners show what this audience sends and follows; the mechanism repeats, the topic must not.", impact: "Above-average follows per 1,000 views", cost_egp: 0, effort: "low" });
  if (key === "community" && ph === "pre-launch") out.push({ title: "FOUNDER circle on Close Friends", idea: "Everyone who comments or DMs FOUNDER gets a personal DM and is added to Close Friends. Post 1–2 private stories a day for them (real details first, early-access link first when it opens).", why: "Self-selected, real interest; a warm list converts far better than cold followers.", impact: "A countable list of buyers before early access", cost_egp: 0, effort: "medium" });
  for (const play of playsFor(key, ph)) out.push({ title: play.length > 80 ? play.slice(0, 77) + "…" : play, idea: play, why: `Playbook for the ${ph} phase.`, impact: "Moves the phase goal", cost_egp: 0, effort: "medium" });
  const taken = new Set(s.pitches.map((p) => p.title));
  return out.filter((d) => !taken.has(d.title)).slice(0, 4);
}

export async function pitch(brandId: string, agent: AgentKey, d: PitchDraft, source: Pitch["source"] = "check-in") {
  const row: Pitch = { ...d, agent, id: newId(), status: "pitched", source, created_at: now() };
  await insert(brandId, "pitches", row, `pitch from ${AGENTS[agent].name}: ${d.title}`);
  return row;
}
export async function decide(brandId: string, id: string, status: PitchStatus, note = "") {
  await mutate<Pitch>(brandId, "pitches", (rows) => rows.map((r) => (r.id === id ? { ...r, status, note: note || r.note, decided_at: now() } : r)), `pitch ${status}`);
}
export async function seedKnowledge(brandId: string) {
  await insert(brandId, "knowledge", KNOWLEDGE_SEED.map((k) => ({ ...k, agents: k.agents as AgentKey[], id: newId(), date: "2026-10-30", created_at: now() })), "team knowledge: first research");
}
export async function addKnowledge(brandId: string, k: Omit<Knowledge, "id" | "created_at">) {
  await insert(brandId, "knowledge", { ...k, id: newId(), created_at: now() }, `knowledge: ${k.finding.slice(0, 40)}`);
}

// ------------------------------------------------------------------ the chat brain (paste into Claude / ChatGPT)

function dataBlock(s: Snapshot) {
  const g = s.goal, p = progress(s), avg = averages(s.memory);
  const mem = s.memory.slice(0, 25).map((m) => `- ${m.date} ${m.format} · ${m.topic} · hook: ${m.hook || "—"} · views ${m.views ?? "?"} · saves ${m.saves ?? "?"} · shares ${m.shares ?? "?"} · follows ${m.follows ?? "?"}${m.boosted ? " · BOOSTED" : ""} · verdict ${m.verdict || "?"}${m.lesson ? ` · lesson: ${m.lesson}` : ""}`).join("\n");
  const wk = s.weekly.slice(0, 4).map((w) => `- week of ${w.week_of}: followers ${w.followers}, views ${w.views}, profile visits ${w.profile_visits}, link taps ${w.link_clicks}, saves ${w.saves}, shares ${w.shares}, follows ${w.new_follows}, FOUNDER DMs ${w.founder_dms}, site visits ${w.site_visits}, add-to-bag ${w.add_to_bag}, orders ${w.orders}, pieces ${w.pieces}, ad spend ${w.ad_spend}${w.notes ? ` (${w.notes})` : ""}`).join("\n");
  const up = upcoming(s, 14).map((c) => `- ${c.scheduled_for} ${c.format} · ${c.title} · ${c.status}`).join("\n");
  const pit = s.pitches.slice(0, 15).map((x) => `- [${x.status}] ${AGENTS[x.agent].name}: ${x.title}${x.note ? ` (Director note: ${x.note})` : ""}`).join("\n");
  return `TODAY: ${s.today} · PHASE: ${phaseOf(s)}
GOAL: Founder Drop 1 = ${g.goal_pieces} pieces; target 85–90% = ${p.low}–${p.high} sold. Sold so far: ${g.sold}. ${hasEarlyAccess(g) ? `Early access ${g.early_access_start}–${g.early_access_end}; ` : `NO early access. Reveal ${revealOf(g)}; `}drop ${g.drop_start}–${g.drop_end}. Ad cap ${g.ad_cap_egp} EGP, spent ${g.ad_spent_egp}.
ACCOUNT AVERAGE: ${avg.savesShares.toFixed(1)} saves+shares and ${avg.follows.toFixed(1)} follows per 1,000 views.

MEMORY — what we already posted and how it did (never repeat a topic or hook):
${mem || "- (empty)"}

LAST WEEKS:
${wk || "- (no weekly numbers yet)"}

PLANNED NEXT 14 DAYS:
${up || "- (nothing planned)"}

TEAM PITCHES (latest):
${pit || "- (none yet)"}

COMPETITOR & ADS INTEL (internal — never name them in content):
${s.intel.slice(0, 12).map((x) => `- ${x.name} (${x.tier}): works → ${x.what_works} | ads → ${x.ads} | for us → ${x.fit}`).join("\n") || "- (empty)"}

CUSTOMER PAINS (must be answered):
${s.pains.slice(0, 15).map((x) => `- [${x.status}] ${x.pain} → ${x.answer}`).join("\n") || "- (empty)"}

TREND LAB:
${s.trendlab.slice(0, 12).map((x) => `- [${x.status}] ${x.name} (${x.kind}): ${x.how}`).join("\n") || "- (empty)"}`;
}

function knowledgeFor(key: AgentKey | "all", s: Snapshot) {
  const k = s.knowledge.filter((x) => key === "all" || key === "director" || x.agents.includes(key)).slice(0, key === "all" ? 30 : 15);
  return k.map((x) => `- (${x.date}, ${x.area}) ${x.finding} → USE: ${x.use}${x.source ? ` [${x.source}]` : ""}`).join("\n") || "- (empty — rely on your own up-to-date expertise and say what should be researched)";
}

const REPLY_FORMAT = `REPLY FORMAT
Answer the founder in clear, simple English (copy for posts in Masri). Short paragraphs or steps.
If you have ideas for the Director (you should — that's your job), add at the very end:
\`\`\`pitch
[{"title":"short","idea":"what exactly to do","why":"evidence / reasoning","impact":"expected result","cost_egp":0,"effort":"low|medium|high"}]
\`\`\`
If you used a NEW fact from research that the team should remember, also add:
\`\`\`knowledge
[{"area":"algorithm|ads|market|trend|launch|platform|psychology","finding":"...","use":"how we use it","source":"url"}]
\`\`\``;

export function chatPrompt(key: AgentKey, s: Snapshot, history: ChatMsg[], message: string) {
  const a = AGENTS[key], b = a.checkIn(s);
  const hist = history.slice(-12).map((m) => `${m.role === "you" ? "FOUNDER" : a.name.toUpperCase()}: ${m.text}`).join("\n\n");
  return `${MISSION}

YOU ARE: ${a.name} — ${a.title} of TEMP. HQ.
${a.expertise}

${brainOf(key)}

YOUR PLAYBOOK FOR THIS PHASE (${phaseOf(s)}):
${playsFor(key, phaseOf(s)).map((x) => `- ${x}`).join("\n")}

${TEAM_RULES}

TEAM KNOWLEDGE (latest research — use it, and say if something looks outdated):
${knowledgeFor(key, s)}

YOUR CHECK-IN: ${b.status}
Good: ${b.good.join(" | ") || "—"}
Wrong: ${b.wrong.join(" | ") || "—"}

${dataBlock(s)}

OUR CONVERSATION SO FAR:
${hist || "(new conversation)"}

FOUNDER: ${message || "What should we do now to reach the goal? Bring me your best ideas."}

${REPLY_FORMAT}`;
}

/** Kept for compatibility with older callers. */
export const askPrompt = (key: AgentKey, s: Snapshot, question: string) => chatPrompt(key, s, [], question);

function blocks(text: string, tag: string): any[] {
  const out: any[] = [];
  const re = new RegExp("```" + tag + "\\s*([\\s\\S]*?)```", "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { try { const j = JSON.parse(m[1].trim()); out.push(...(Array.isArray(j) ? j : [j])); } catch { /* ignore bad block */ } }
  return out;
}

/** Saves the employee's answer to the chat + any pitches and knowledge it contains. */
export async function saveReply(brandId: string, key: AgentKey, question: string, answer: string) {
  const pitches = blocks(answer, "pitch"), knowledge = blocks(answer, "knowledge");
  const clean = answer.replace(/```(pitch|knowledge)[\s\S]*?```/gi, "").trim();
  const t = now();
  const msgs: ChatMsg[] = [];
  if (question.trim()) msgs.push({ id: newId(), agent: key, role: "you", text: question.trim().slice(0, 4000), created_at: t });
  msgs.push({ id: newId(), agent: key, role: "agent", text: clean.slice(0, 20000), created_at: new Date(Date.parse(t) + 1).toISOString() });
  await insert(brandId, "chat", msgs, `chat with ${AGENTS[key].name}`);
  if (pitches.length) await insert(brandId, "pitches", pitches.map((p) => normPitch(p, key, "chat")), `${pitches.length} pitch(es) from ${AGENTS[key].name}`);
  if (knowledge.length) await insert(brandId, "knowledge", knowledge.map((k) => normKnow(k, [key])), `knowledge from ${AGENTS[key].name}`);
  return { pitches: pitches.length, knowledge: knowledge.length };
}

const KEYS: AgentKey[] = ["director", "content", "growth", "media", "community", "brand"];
const normPitch = (p: any, fallback: AgentKey, source: Pitch["source"]): Pitch => ({
  id: newId(), agent: KEYS.includes(p.agent) ? p.agent : fallback, title: String(p.title ?? "Idea").slice(0, 140), idea: String(p.idea ?? ""), why: String(p.why ?? ""), impact: String(p.impact ?? ""),
  cost_egp: Math.max(0, Number(p.cost_egp) || 0), effort: ["low", "medium", "high"].includes(p.effort) ? p.effort : "medium", status: "pitched", source, created_at: now(),
});
const normKnow = (k: any, agents: AgentKey[]): Knowledge => ({
  id: newId(), area: String(k.area ?? "trend"), finding: String(k.finding ?? ""), use: String(k.use ?? ""), source: String(k.source ?? ""),
  agents: Array.isArray(k.agents) ? k.agents.filter((x: any) => KEYS.includes(x)) : agents, date: String(k.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10), created_at: now(),
});

// ------------------------------------------------------------------ the weekly team meeting (Sunday, scheduled Claude)

export function meetingPrompt(s: Snapshot) {
  const team = KEYS.map((k) => `### ${AGENTS[k].name} — ${AGENTS[k].title}\n${brainOf(k)}\nPlaybook now: ${playsFor(k, phaseOf(s)).join(" · ")}\nCheck-in: ${AGENTS[k].checkIn(s).status}`).join("\n\n");
  return `${MISSION}

WEEKLY TEAM MEETING OF TEMP. HQ. You play the whole team. Steps:
1. RESEARCH (use web search): what changed in the last 7–14 days in the Instagram algorithm and features, Meta ads, Egyptian streetwear / Gen Z culture and trends, drop/launch tactics, and what the top marketing, sales and media-buying voices are teaching now (e.g. Alex Hormozi, Sabri Suby, leading Meta media buyers). Only real, sourced facts.
2. Each employee reviews the data below from their expertise and pitches 1–3 ideas to the Director to get more of the right followers, more customers and more profit.
3. The Director writes a short summary: what went wrong, what changes, the 3 priorities for the week.

THE TEAM:
${team}

${TEAM_RULES}

CURRENT TEAM KNOWLEDGE (don't repeat these; add only new facts, flag outdated ones):
${knowledgeFor("all", s)}

${dataBlock(s)}

ALSO (research duties): update the boards — new or changed competitor intel (check their Instagram and the Meta Ad Library, country Egypt), new customer complaints you found (forums, reviews, comments) with our answer, and trends to follow or formats to invent.

ANSWER = ONE JSON object, nothing else:
{"summary":"Director's summary in simple English","intel":[{"name":"brand","tier":"local streetwear|international drop brand|mass-market","positioning":"…","what_works":"…","ads":"…","fit":"how TEMPORARY uses it","source":"url","checked":"YYYY-MM-DD"}],"pains":[{"pain":"…","answer":"…","where":"…","status":"open","source":"url"}],"trends":[{"name":"…","kind":"invent (ours)|follow","what":"…","how":"…","metric":"…","status":"idea"}],"knowledge":[{"area":"…","finding":"…","use":"…","source":"url","agents":["content","growth"]}],"pitches":[{"agent":"content|growth|media|community|brand|director","title":"…","idea":"…","why":"…","impact":"…","cost_egp":0,"effort":"low|medium|high"}]}`;
}

export async function importMeeting(brandId: string, text: string) {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("No JSON found.");
  const j = JSON.parse(t.slice(a, b + 1));
  const k = (j.knowledge ?? []).map((x: any) => normKnow(x, ["director"])).filter((x: Knowledge) => x.finding);
  const p = (j.pitches ?? []).map((x: any) => normPitch(x, "director", "meeting"));
  if (k.length) await insert(brandId, "knowledge", k, `team meeting: ${k.length} new facts`);
  if (p.length) await insert(brandId, "pitches", p, `team meeting: ${p.length} pitches`);
  const up = async (t: "intel" | "pains" | "trendlab", key: string, arr: any[]) => {
    const rows = (arr ?? []).filter((x) => x && x[key]);
    if (!rows.length) return 0;
    await mutate<any>(brandId, t, (d) => {
      for (const r of rows) {
        const i = d.findIndex((x: any) => String(x[key]).toLowerCase() === String(r[key]).toLowerCase());
        if (i >= 0) d[i] = { ...d[i], ...r, updated_at: now() };
        else d.push({ ...r, id: newId(), created_at: now() });
      }
      return d;
    }, `team meeting: ${rows.length} ${t}`);
    return rows.length;
  };
  await up("intel", "name", j.intel);
  await up("pains", "pain", j.pains);
  await up("trendlab", "name", j.trends);
  if (j.summary) await insert(brandId, "chat", { id: newId(), agent: "director" as AgentKey, role: "agent" as const, text: `TEAM MEETING ${new Date().toISOString().slice(0, 10)}\n\n${j.summary}`, created_at: now() }, "team meeting summary");
  await log(brandId, `Team meeting imported: ${k.length} new facts, ${p.length} pitches.`);
  return { knowledge: k.length, pitches: p.length };
}
