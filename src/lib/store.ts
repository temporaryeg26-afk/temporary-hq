/**
 * Simple tables on top of the private GitHub repo.
 * brands.json at the root; every brand has its own folder: <brand-id>/<table>.json and <brand-id>/files/...
 */
import { currentLogin, mutateJSON, readJSON } from "./github";

export type Table = "products" | "assets" | "plans" | "content" | "media" | "research" | "activity" | "sessions" | "ads";

export const tablePath = (brandId: string, t: Table) => `${brandId}/${t}.json`;
export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export async function list<T>(brandId: string, t: Table): Promise<T[]> {
  return (await readJSON<T[]>(tablePath(brandId, t), [])).data;
}

export async function mutate<T extends { id: string }>(brandId: string, t: Table, fn: (rows: T[]) => T[] | void, message: string) {
  return mutateJSON<T[]>(tablePath(brandId, t), [], fn, `HQ (${currentLogin()}): ${message}`);
}

export async function insert<T extends { id: string }>(brandId: string, t: Table, rows: T | T[], message = `add to ${t}`) {
  const arr = Array.isArray(rows) ? rows : [rows];
  await mutate<T>(brandId, t, (d) => {
    d.push(...arr);
  }, message);
  return arr;
}

export async function update<T extends { id: string }>(brandId: string, t: Table, id: string, patch: Partial<T>, message = `update ${t}`) {
  let found = false;
  await mutate<T>(brandId, t, (d) => {
    const i = d.findIndex((r) => r.id === id);
    if (i >= 0) {
      d[i] = { ...d[i], ...patch };
      found = true;
    }
  }, message);
  if (!found) throw new Error("That item no longer exists. Reload the page.");
}

export async function remove(brandId: string, t: Table, id: string, message = `remove from ${t}`) {
  await mutate<{ id: string }>(brandId, t, (d) => d.filter((r) => r.id !== id), message);
}
