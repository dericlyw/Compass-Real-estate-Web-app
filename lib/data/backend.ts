import "server-only";
// Storage backends for the workspace document. Local file for development; Supabase
// (one jsonb row with optimistic revision checks) for the hosted pilot test.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/lib/types";

export interface Loaded {
  store: Store;
  rev: number;
}

export interface Backend {
  name: "file" | "supabase";
  load(): Promise<Loaded | null>;
  /** Returns false when someone else saved first (caller retries). */
  save(store: Store, prevRev: number | null): Promise<boolean>;
}

const WORKSPACE = process.env.PROPVID_WORKSPACE ?? "urban-forest-pilot";

function fileBackend(): Backend {
  const dir = process.env.PROPVID_DATA_DIR ?? path.join(process.cwd(), ".data");
  const file = path.join(dir, "store.json");
  return {
    name: "file",
    async load() {
      try {
        return { store: JSON.parse(await fs.readFile(file, "utf8")) as Store, rev: 0 };
      } catch {
        return null;
      }
    },
    async save(store) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, JSON.stringify(store, null, 2));
      return true;
    },
  };
}

function supabaseBackend(url: string, key: string): Backend {
  const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });
  return {
    name: "supabase",
    async load() {
      const { data, error } = await db.from("app_state").select("data, rev").eq("id", WORKSPACE).maybeSingle();
      if (error) throw new Error(`Supabase load failed: ${error.message}`);
      return data ? { store: data.data as Store, rev: data.rev as number } : null;
    },
    async save(store, prevRev) {
      if (prevRev === null) {
        const { error } = await db.from("app_state").insert({ id: WORKSPACE, rev: 1, data: store });
        if (error?.code === "23505") return false; // inserted concurrently
        if (error) throw new Error(`Supabase insert failed: ${error.message}`);
        return true;
      }
      const { data, error } = await db
        .from("app_state")
        .update({ data: store, rev: prevRev + 1, updated_at: new Date().toISOString() })
        .eq("id", WORKSPACE)
        .eq("rev", prevRev)
        .select("rev");
      if (error) throw new Error(`Supabase save failed: ${error.message}`);
      return (data?.length ?? 0) === 1;
    },
  };
}

let cached: Backend | null = null;

export function backend(): Backend {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? supabaseBackend(url, key) : fileBackend();
  return cached;
}
