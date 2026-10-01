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

// Vercel's filesystem is read-only except /tmp.
const DIR = process.env.PROPVID_DATA_DIR ?? (process.env.VERCEL ? "/tmp/propvid" : path.join(process.cwd(), ".data"));
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

// ── Storage backends ─────────────────────────────────────────────────
// "file": local JSON (dev, single process). "supabase": the whole workspace as one JSONB row,
// written with an optimistic revision check so concurrent serverless instances cannot clobber
// each other. The relational schema in 0001_init.sql remains the production target.

interface Loaded {
  store: Store | null;
  rev: number;
}

interface Backend {
  load(): Promise<Loaded>;
  /** Returns false when someone else wrote first (revision mismatch). */
  save(s: Store, rev: number): Promise<boolean>;
}

const fileBackend: Backend = {
  async load() {
    try {
      return { store: JSON.parse(await fs.readFile(FILE, "utf8")) as Store, rev: 0 };
    } catch {
      return { store: null, rev: 0 }; // first run or unreadable
    }
  },
  async save(s) {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(s, null, 2));
    return true;
  },
};

// Access goes only through the token-checked functions in 0002_workspace_store.sql, so a
// public (publishable/anon) key is enough and the tables stay closed to the API.
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DB_TOKEN = process.env.PROPVID_DB_TOKEN || "";
const WORKSPACE = process.env.PROPVID_WORKSPACE || "default";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SB_URL.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    cache: "no-store",
    signal: new AbortController().signal, // never memoised across a render
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_id: WORKSPACE, p_token: DB_TOKEN, ...args }),
  });
  if (!res.ok) throw new Error(`Storage ${fn} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

const supabaseBackend: Backend = {
  async load() {
    const rows = await rpc<{ data: Store; rev: number }[]>("propvid_load", {});
    return rows[0] ? { store: rows[0].data, rev: rows[0].rev } : { store: null, rev: 0 };
  },
  async save(s, rev) {
    return rpc<boolean>("propvid_save", { p_data: s, p_rev: rev });
  },
};

export type StorageMode = "supabase" | "file" | "ephemeral";

/** "ephemeral" = hosted (Vercel) without Supabase: data lives in /tmp and is lost between instances. */
export function storageMode(): StorageMode {
  if (SB_URL && SB_KEY && DB_TOKEN) return "supabase";
  return process.env.VERCEL ? "ephemeral" : "file";
}

const backend: Backend = storageMode() === "supabase" ? supabaseBackend : fileBackend;

async function loadOrSeed(): Promise<Loaded & { store: Store }> {
  const loaded = await backend.load();
  if (loaded.store && loaded.store.version === STORE_VERSION) return { store: loaded.store, rev: loaded.rev };
  const s = seed();
  if (await backend.save(s, loaded.rev)) return { store: s, rev: loaded.rev + 1 };
  const again = await backend.load(); // another instance seeded first
  if (!again.store) throw new Error("Workspace could not be initialised.");
  return { store: again.store, rev: again.rev };
}

export async function readStore(): Promise<Store> {
  return (await loadOrSeed()).store;
}

/** Serialised read-modify-write; retried on a concurrent write in Supabase mode. */
export function mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { store, rev } = await loadOrSeed();
      const result = await fn(store);
      if (await backend.save(store, rev)) return result;
    }
    throw new Error("The workspace is busy — please try again.");
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function resetStore(): Promise<void> {
  await mutate((s) => {
    Object.assign(s, seed());
  });
}
