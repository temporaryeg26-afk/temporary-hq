import { downloadFile, must, sb } from "./supabase";
import { OverlayIn, Position, POSITIONS } from "./media";
import type { Asset } from "./types";

export type OverlaySpec = { asset_id?: string; asset_kind?: string; position?: string; width_pct?: number };

export async function loadAssets(brandId: string): Promise<Asset[]> {
  return must(await sb.from("assets").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }));
}

/** Turn "logo, bottom-right, 14%" into your ORIGINAL uploaded file. */
export async function resolveOverlays(brandId: string, specs: OverlaySpec[] = [], productId?: string | null) {
  const assets = (await loadAssets(brandId)).filter((a) => a.locked);
  const out: OverlayIn[] = [];
  const missing: string[] = [];
  for (const s of (specs ?? []).slice(0, 4)) {
    let a = s.asset_id ? assets.find((x) => x.id === s.asset_id) : undefined;
    if (!a && s.asset_kind) {
      const ofKind = assets.filter((x) => x.kind === s.asset_kind);
      a = (productId ? ofKind.find((x) => x.product_id === productId) : undefined) ?? ofKind.find((x) => /primary|main/i.test(x.label ?? "")) ?? ofKind[0];
    }
    if (!a) {
      missing.push(s.asset_kind ?? "file");
      continue;
    }
    out.push({
      assetId: a.id,
      file: await downloadFile(a.storage_path),
      position: (POSITIONS.includes(s.position as Position) ? s.position : "bottom-right") as Position,
      widthPct: Number(s.width_pct) || 15,
    });
  }
  return { overlays: out, missing };
}
