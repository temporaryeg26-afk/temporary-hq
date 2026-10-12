export type Format = "reel" | "carousel" | "static" | "story" | "founder_video" | "motion_carousel";
export type Pillar = "discovery" | "philosophy" | "product" | "community" | "conversion" | "doctrine";

export type BrandSettings = {
  /** Where manager packs go. Switch to "chatgpt" if Claude hits its limit. */
  manager?: "claude" | "chatgpt";
  /** How many pieces ChatGPT writes per paste. */
  batchSize?: number;
  autoApprove?: Partial<Record<Pillar, boolean>>;
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

export type Research = { id: string; kind: "scan" | "lab"; topic: string; title: string; content: any; made_by: string; created_at: string };

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
