import "server-only";
// Workspace store. One document per pilot workspace, persisted by lib/data/backend.ts
// (local file in development, Supabase `app_state` row when hosted). The relational schema in
// supabase/migrations/0001_init.sql is the post-pilot target and mirrors these shapes.

import { ARTIST_IMPRESSION } from "@/lib/data/copy-library";
import { claims, project as seedProject } from "@/lib/data/urban-forest";
import { checkAsset, isBlocked } from "@/lib/engine/compliance";
import { buildAssets, endCard } from "@/lib/engine/generate";
import { backend } from "@/lib/data/backend";
import type { AuditEntry, CreativeAsset, Slot, Store } from "@/lib/types";

const STORE_VERSION = 2;
export const DEFAULT_NEGOTIATORS = ["Negotiator 1", "Negotiator 2"];

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

export function seedSlots(negotiators: string[] = DEFAULT_NEGOTIATORS): Slot[] {
  // Sales-gallery hours in Malaysia time (UTC+8): weekends 11am/2pm/4pm, weekdays 7pm.
  const slots: Slot[] = [];
  const nowMyt = new Date(Date.now() + 8 * 3600000);
  for (let d = 1; d <= 14; d++) {
    const y = nowMyt.getUTCFullYear(), m = nowMyt.getUTCMonth(), day = nowMyt.getUTCDate() + d;
    const dow = new Date(Date.UTC(y, m, day)).getUTCDay();
    const hours = dow === 0 || dow === 6 ? [11, 14, 16] : [19];
    for (const h of hours) {
      negotiators.forEach((negotiator, n) => {
        const t = new Date(Date.UTC(y, m, day, h - 8));
        slots.push({ id: `slot_${t.getTime()}_${n}`, negotiator, start: t.toISOString() });
      });
    }
  }
  return slots;
}

export function seed(): Store {
  const store: Store = {
    version: STORE_VERSION,
    negotiators: [...DEFAULT_NEGOTIATORS],
    feedback: [],
    project: structuredClone(seedProject),
    assets: buildAssets(seedProject),
    leads: [],
    slots: seedSlots(),
    appointments: [],
    spend: [],
    audit: [],
  };
  for (const a of store.assets) recheck(store, a);
  store.audit.push(entry("system", "generate_campaign", seedProject.id, `${store.assets.length} assets generated across 4 angles × 3 languages`));
  return store;
}

export function entry(actor: string, action: string, target: string, detail?: string): AuditEntry {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, target, detail };
}

/** Upgrades older documents in place so pilot data survives releases. */
function migrate(s: Store): Store {
  if (s.version === 1) {
    s.negotiators ??= [...DEFAULT_NEGOTIATORS];
    s.feedback ??= [];
    s.version = 2;
  }
  return s;
}

async function load(): Promise<{ store: Store; rev: number | null }> {
  const got = await backend().load();
  if (got && got.store.version <= STORE_VERSION) return { store: migrate(got.store), rev: got.rev };
  return { store: seed(), rev: got ? got.rev : null };
}

export async function readStore(): Promise<Store> {
  const { store, rev } = await load();
  if (rev === null) await backend().save(store, null); // first run: persist the generated campaign
  return store;
}

/** Serialised read-modify-write with optimistic retry across server instances. */
export function mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { store, rev } = await load();
      const result = await fn(store);
      if (await backend().save(store, rev)) return result;
    }
    throw new Error("Could not save: too many concurrent edits. Please retry.");
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function resetStore(): Promise<void> {
  await mutate((s) => {
    Object.assign(s, seed());
  });
}
