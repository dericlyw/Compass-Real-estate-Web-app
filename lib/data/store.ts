import "server-only";
// Local demo store (JSON file in .data/). Production target is Supabase — the schema is in
// supabase/migrations/0001_init.sql and mirrors these shapes one-to-one.

import { promises as fs } from "node:fs";
import path from "node:path";
import { ARTIST_IMPRESSION } from "@/lib/data/copy-library";
import { seedEngine } from "@/lib/data/engine-seed";
import { claims, project as seedProject } from "@/lib/data/urban-forest";
import { checkAsset, isBlocked } from "@/lib/engine/compliance";
import { buildAssets, endCard } from "@/lib/engine/generate";
import type { AuditEntry, CreativeAsset, EngineState, Slot, Store } from "@/lib/types";

const DIR = process.env.PROPVID_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "store.json");
const STORE_VERSION = 1;

let queue: Promise<unknown> = Promise.resolve();

export function complianceCtx(store: Store) {
  return { project: store.project, claims, artistImpressionLabels: Object.values(ARTIST_IMPRESSION) };
}

/** Re-runs the gate on one asset and moves it between draft / needs_review accordingly. */
export function recheck(store: Store, a: CreativeAsset): void {
  a.endCard = endCard(store.project, a.lang);
  a.compliance = checkAsset(a, complianceCtx(store));
  a.complianceRunAt = new Date().toISOString();
  if (isBlocked(a.compliance)) {
    if (a.status !== "rejected") a.status = "draft";
  } else if (a.status === "draft") {
    a.status = "needs_review";
  }
}

function seedSlots(): Slot[] {
  // Sales-gallery hours in Malaysia time (UTC+8): weekends 11am/2pm/4pm, weekdays 7pm.
  const slots: Slot[] = [];
  const nowMyt = new Date(Date.now() + 8 * 3600000);
  for (let d = 1; d <= 14; d++) {
    const y = nowMyt.getUTCFullYear(), m = nowMyt.getUTCMonth(), day = nowMyt.getUTCDate() + d;
    const dow = new Date(Date.UTC(y, m, day)).getUTCDay();
    const hours = dow === 0 || dow === 6 ? [11, 14, 16] : [19];
    for (const h of hours) {
      for (const negotiator of ["Negotiator 1", "Negotiator 2"]) {
        const t = new Date(Date.UTC(y, m, day, h - 8));
        slots.push({ id: `slot_${t.getTime()}_${negotiator.slice(-1)}`, negotiator, start: t.toISOString() });
      }
    }
  }
  return slots;
}

export function seed(): Store {
  const store: Store = {
    version: STORE_VERSION,
    project: structuredClone(seedProject),
    assets: buildAssets(seedProject),
    leads: [],
    slots: seedSlots(),
    appointments: [],
    spend: [],
    audit: [],
    engine: seedEngine(), // explicit so a workspace reset also resets the engine
  };
  for (const a of store.assets) recheck(store, a);
  store.audit.push(entry("system", "generate_campaign", seedProject.id, `${store.assets.length} assets generated across 4 angles × 3 languages`));
  return store;
}

/** The Content Engine state, created on first use so existing stores keep their data. */
export function engineOf(s: Store): EngineState {
  s.engine ??= seedEngine();
  return s.engine;
}

export function entry(actor: string, action: string, target: string, detail?: string): AuditEntry {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, target, detail };
}

export async function readStore(): Promise<Store> {
  try {
    const s = JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
    if (s.version === STORE_VERSION) return s;
  } catch {
    // first run or unreadable — fall through to seed
  }
  const s = seed();
  await write(s);
  return s;
}

async function write(s: Store) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}

/** Serialised read-modify-write. */
export function mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const s = await readStore();
    const result = await fn(s);
    await write(s);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function resetStore(): Promise<void> {
  await mutate((s) => {
    Object.assign(s, seed());
  });
}
