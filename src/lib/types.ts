export type Format = "reel" | "carousel" | "static" | "story" | "founder_video" | "motion_carousel";
export type Pillar = "discovery" | "philosophy" | "product" | "community" | "conversion" | "doctrine";

export type BrandSettings = {
  /** Where manager packs go. Switch to "chatgpt" if Claude hits its limit. */
  manager?: "claude" | "chatgpt";
  /** How many pieces ChatGPT writes per paste. */
  batchSize?: number;
  autoApprove?: Partial<Record<Pillar, boolean>>;
  /** Search queries the Researcher uses (editable on the Research page). */
  research_queries?: string[];
  /** Default length of a new period in days (2 weeks = 14). */
  period_days?: number;
  /** How many days ahead the team produces in full detail (7 or 14). */
  detail_days?: number;
  /** Unit economics for the Performance page (internal — never in content). */
  unit_economics?: import("./performance").UE;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  context: string;
  order_form_url: string;
  settings: BrandSettings;
  /** The brand's worldview. Every pack sent to Claude / ChatGPT includes it. */
  doctrine?: Doctrine;
  created_at?: string;
};

export type Doctrine = {
  belief: string;
  manifesto: string;
  for_who: string;
  enemy: string;
  promise: string;
  voice: string;
  words_we_use: string;
  words_we_never_use: string;
  symbols: string;
  rituals: string;
  signature_series: string;
  future_vision: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  price_egp: number | null;
  price_confirmed: boolean;
  sizes: string[];
  colors: string[];
  specs: string;
  content_role: string;
  status: "not_released" | "available" | "sold_out";
  edition_limit: number | null;
  sold_count: number;
  sort: number;
};

export type Region = { x: number; y: number; w: number; h: number };

export type Asset = {
  id: string;
  kind: "logo" | "artwork" | "mask" | "product_photo" | "reference";
  locked: boolean;
  label: string;
  product_id: string | null;
  storage_path: string;
  mime: string;
  width: number;
  height: number;
  sha256: string;
  protect_regions: Region[];
  created_by?: string;
  created_at: string;
};

export type Flag = { severity: "block" | "approval"; rule: string; detail: string };

export type ContentItem = {
  id: string;
  plan_id: string | null;
  product_id: string | null;
  format: Format;
  pillar: Pillar;
  title: string;
  scheduled_for: string;
  brief: Record<string, any>;
  output: Record<string, any> | null;
  rule_flags: Flag[];
  qa: { score: number; issues: string[] } | null;
  review: { decision: "approve" | "revise"; note: string; by: string } | null;
  revision_note: string | null;
  status: "brief" | "drafted" | "in_review" | "needs_you" | "approved" | "rejected" | "published";
  revisions: number;
  /** Earlier outputs, newest first — restorable from the Studio preview. */
  versions?: { at: string; by: string; output: Record<string, any> }[];
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  title: string;
  goal: string;
  data: { strategy: string; weeks: { week: number; focus: string; notes: string }[]; kpis: string[] };
  made_by: string;
  created_at: string;
};

export type Placement = { assetId: string; sha256: string; left: number; top: number; width: number; height: number };

export type Media = {
  id: string;
  content_id: string | null;
  kind: "image" | "video";
  slot: string | null;
  made_with: string | null;
  status: "done" | "rejected";
  storage_path: string | null;
  base_path: string | null;
  fidelity: any;
  note: string | null;
  created_by?: string;
  created_at: string;
};

export type Research = {
  id: string;
  kind: "scan" | "lab" | "report";
  topic: string;
  title: string;
  content: any;
  made_by: string;
  created_at: string;
  /** Attached by latestLab(): the newest full research report, so every pack sees it. */
  report?: Research | null;
};

export type ResearchType = "full" | "quick" | "custom";
export type Complaint = { quote: string; platform: string; theme: string; link: string };
export type ResearchReport = {
  type: ResearchType;
  scope: string[];
  topic?: string;
  title: string;
  summary: string[];
  buyer: { who: string; age: string; money: string; hangouts: string; fears: string[] };
  themes: { theme: string; count: number; what_people_say: string; what_we_do: string }[];
  complaints: Complaint[];
  gap: string;
  checklist: { check: string; how_to_check: string; why: string }[];
  trends: { trend: string; note: string }[];
  seasons: { when: string; moment: string; idea: string }[];
  ig_rules: string[];
  risks: string[];
  sources: { title: string; url: string }[];
};

export type Activity = { id: string; message: string; level: "info" | "warn" | "error"; created_by: string; created_at: string };

export type Session = {
  id: string;
  period_start: string;
  days: number;
  review: { wins: string[]; misses: string[]; lessons: string[]; doctrine_check: string; next_focus: string; next_goal: string; bold_bets: string[] } | null;
  notes: string;
  made_by: string;
  created_at: string;
};

export type AdCampaign = { name: string; objective: string; daily_egp: number; days: number; audience: string; placements: string; creative: string; why: string };
export type AdTest = { name: string; hook: string; angle: string; format: string; product_code: string | null; script: string; on_screen_text: string; caption: string; cta: string };
export type AdVerdict = { campaign: string; action: "cut" | "keep" | "scale" | "fix"; why: string; change: string };

export type AdRecord = {
  id: string;
  kind: "plan" | "review";
  budget_egp: number | null;
  goal: string;
  data: {
    strategy?: string;
    campaigns?: AdCampaign[];
    tests?: AdTest[];
    measure?: string[];
    rules?: string[];
    verdicts?: AdVerdict[];
    summary?: string;
    next_moves?: string[];
  };
  results_text?: string;
  made_by: string;
  created_at: string;
};

// ------------------------------------------------------------------ the agency: periods, roadmap, tasks

export type Phase = { name: string; start: string; end: string; goal: string; focus: string };

export type Period = {
  id: string;
  name: string;
  start: string;
  end: string;
  goal: string;
  notes: string;
  phases: Phase[];
  /** What the Director needs from the owner before the team can finish. */
  needs: string[];
  /** Estimated use of the owner's plans this period. */
  budget: { flow_clips: number; chatgpt_images: number; notes: string } | null;
  status: "active" | "done";
  made_by: string;
  created_at: string;
};

export type TaskStatus = "todo" | "working" | "review" | "needs_you" | "done";
export type TaskVersion = { at: string; by: string; output: string; note?: string };

export type Task = {
  id: string;
  period_id: string;
  employee: string;
  title: string;
  input: string;
  output: string;
  due: string;
  status: TaskStatus;
  director_note: string;
  versions: TaskVersion[];
  created_at: string;
  updated_at: string;
};
