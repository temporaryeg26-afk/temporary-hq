export type Format = "reel" | "carousel" | "static" | "story";
export type Pillar = "discovery" | "philosophy" | "product" | "community" | "conversion";

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
};

export type Product = {
  id: string;
  brand_id: string;
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
};

export type Flag = { severity: "block" | "approval"; rule: string; detail: string };

export type ContentItem = {
  id: string;
  brand_id: string;
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
  created_at: string;
};

export type Research = { id: string; kind: "scan" | "lab"; topic: string; title: string; content: any; made_by: string; created_at: string };
