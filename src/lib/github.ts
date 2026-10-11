/**
 * GITHUB STORAGE — everything lives in a PRIVATE GitHub repository.
 * The website (public repo, GitHub Pages) holds no data. Each team member pastes a personal
 * GitHub key once per device; it's kept only in that browser. Only accounts with access to the
 * private data repo can read or change anything.
 */

export const DEFAULT_REPO = (import.meta.env.VITE_DATA_REPO as string | undefined) || "temporaryeg26-afk/temporary-hq-data";

type Session = { token: string; repo: string; login: string };
const KEY = "thq_session";

export function getSession(): Session | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Session) : null;
  } catch {
    return null;
  }
}
export function currentLogin() {
  return getSession()?.login ?? "";
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  cache.clear();
}

class GHError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function gh(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const t = token ?? getSession()?.token;
  if (!t) throw new GHError(401, "Not logged in.");
  const res = await fetch(`https://api.github.com${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      "X-GitHub-Api-Version": "2022-11-28",
      Accept: "application/vnd.github+json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new GHError(401, "Your GitHub key is invalid or expired. Log out and paste a new key.");
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") throw new GHError(403, "GitHub's hourly limit was reached. Wait a few minutes and try again.");
  return res;
}

/** Check the key and that it can write to the private data repo. */
export async function signIn(token: string, repo: string): Promise<Session> {
  token = token.trim();
  repo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const u = await gh("/user", {}, token);
  if (!u.ok) throw new Error("GitHub didn't accept that key. Copy it again (it starts with ghp_).");
  const user = await u.json();
  const r = await gh(`/repos/${repo}`, {}, token);
  if (r.status === 404) throw new Error(`This account (${user.login}) has no access to ${repo}. Ask the owner to invite you, accept the invite, and make sure the key has the "repo" box ticked.`);
  if (!r.ok) throw new Error(`Couldn't open ${repo} (error ${r.status}).`);
  const info = await r.json();
  if (!info.private) throw new Error(`${repo} is PUBLIC. Make it private first (Settings → General → Danger zone → Change visibility) — it holds your brand data.`);
  if (!info.permissions?.push) throw new Error(`Your account can view ${repo} but not edit it. Ask the owner to give you Write access.`);
  const s = { token, repo, login: user.login as string };
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

// ------------------------------------------------------------------ encoding

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64.replace(/\n/g, ""));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
const enc = (path: string) => path.split("/").map(encodeURIComponent).join("/");

// ------------------------------------------------------------------ files

type Meta = { sha: string; size: number; content?: string; encoding?: string };

async function meta(path: string): Promise<Meta | null> {
  const s = getSession()!;
  const r = await gh(`/repos/${s.repo}/contents/${enc(path)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new GHError(r.status, `Couldn't read ${path} (error ${r.status}).`);
  return (await r.json()) as Meta;
}

async function raw(path: string): Promise<ArrayBuffer> {
  const s = getSession()!;
  const r = await gh(`/repos/${s.repo}/contents/${enc(path)}`, { headers: { Accept: "application/vnd.github.raw" } });
  if (!r.ok) throw new GHError(r.status, `Couldn't download ${path} (error ${r.status}).`);
  return r.arrayBuffer();
}

async function put(path: string, base64: string, message: string, sha?: string | null) {
  const s = getSession()!;
  const r = await gh(`/repos/${s.repo}/contents/${enc(path)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: base64, ...(sha ? { sha } : {}) }),
  });
  if (r.status === 409 || r.status === 422) throw new GHError(409, "conflict");
  if (r.status === 413) throw new GHError(413, "That file is too big for GitHub (keep videos under about 50 MB).");
  if (!r.ok) throw new GHError(r.status, `Couldn't save ${path} (error ${r.status}).`);
  const body = await r.json();
  return body.content?.sha as string;
}

export async function uploadFile(path: string, blob: Blob, message = "HQ: add file") {
  if (blob.size > 50 * 1024 * 1024) throw new Error("That file is over 50 MB. Export a shorter or smaller version (720p is fine for Reels).");
  const b64 = bytesToB64(new Uint8Array(await blob.arrayBuffer()));
  const existing = await meta(path);
  await put(path, b64, message, existing?.sha);
  blobCache.delete(path);
  return path;
}

const blobCache = new Map<string, Blob>();
export async function downloadFile(path: string): Promise<Blob> {
  const hit = blobCache.get(path);
  if (hit) return hit;
  const b = new Blob([await raw(path)]);
  blobCache.set(path, b);
  return b;
}

const urlCache = new Map<string, string>();
/** Local preview link for a private file (works only in this browser, for the logged-in member). */
export async function fileUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = urlCache.get(path);
  if (hit) return hit;
  try {
    const url = URL.createObjectURL(await downloadFile(path));
    urlCache.set(path, url);
    return url;
  } catch {
    return null;
  }
}

export async function removeFiles(paths: string[]) {
  const s = getSession()!;
  for (const p of paths.filter(Boolean)) {
    const m = await meta(p).catch(() => null);
    if (!m) continue;
    await gh(`/repos/${s.repo}/contents/${enc(p)}`, { method: "DELETE", body: JSON.stringify({ message: "HQ: remove file", sha: m.sha }) });
    blobCache.delete(p);
    urlCache.delete(p);
  }
}

// ------------------------------------------------------------------ JSON "tables"

const cache = new Map<string, { sha: string | null; data: unknown }>();

export async function readJSON<T>(path: string, fallback: T): Promise<{ data: T; sha: string | null }> {
  const m = await meta(path);
  if (!m) return { data: fallback, sha: null };
  let text: string;
  if (m.content && m.encoding === "base64") text = new TextDecoder().decode(b64ToBytes(m.content));
  else text = new TextDecoder().decode(await raw(path)); // files over 1 MB
  const data = (text.trim() ? JSON.parse(text) : fallback) as T;
  cache.set(path, { sha: m.sha, data });
  return { data, sha: m.sha };
}

/** Read → change → save, retrying if the other team member saved at the same moment. */
export async function mutateJSON<T>(path: string, fallback: T, fn: (d: T) => T | void, message: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, sha } = await readJSON<T>(path, fallback);
    const draft = structuredClone(data);
    const next = (fn(draft) ?? draft) as T;
    const b64 = bytesToB64(new TextEncoder().encode(JSON.stringify(next, null, 1)));
    try {
      const newSha = await put(path, b64, message, sha);
      cache.set(path, { sha: newSha, data: next });
      return next;
    } catch (e) {
      if (e instanceof GHError && e.status === 409 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 + attempt * 600));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Couldn't save — someone else is editing. Try again.");
}

/** People with access to the private data repo. */
export async function collaborators(): Promise<{ login: string; role: string }[]> {
  const s = getSession()!;
  const r = await gh(`/repos/${s.repo}/collaborators?per_page=50`);
  if (!r.ok) return [];
  const list = await r.json();
  return list.map((c: any) => ({ login: c.login, role: c.role_name ?? (c.permissions?.admin ? "admin" : "write") }));
}

export function repoUrl() {
  const s = getSession();
  return s ? `https://github.com/${s.repo}` : "";
}
