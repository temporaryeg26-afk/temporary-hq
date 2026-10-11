import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * These two values are PUBLIC by design (Supabase's "anon" key). They are set as
 * GitHub repository variables and added at build time. Security comes from the database:
 * every table and file is locked to the two team emails (see supabase/schema.sql).
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb: SupabaseClient = configured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : (null as unknown as SupabaseClient);

export const BUCKET = "brand-files";

/** Throw on Supabase error, return data. */
export function must<T = any>(res: { data: any; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function currentEmail(): Promise<string> {
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? "";
}

export async function uploadFile(path: string, data: Blob, contentType: string) {
  const { error } = await sb.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error("Upload failed: " + error.message);
  return path;
}

export async function downloadFile(path: string): Promise<Blob> {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error("Download failed: " + (error?.message ?? path));
  return data;
}

const urlCache = new Map<string, { url: string; at: number }>();
/** Short-lived private link to a file (only works for the logged-in team). */
export async function fileUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = urlCache.get(path);
  if (hit && Date.now() - hit.at < 50 * 60 * 1000) return hit.url;
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, at: Date.now() });
  return data.signedUrl;
}

export async function removeFiles(paths: string[]) {
  const list = paths.filter(Boolean);
  if (list.length) await sb.storage.from(BUCKET).remove(list);
}
