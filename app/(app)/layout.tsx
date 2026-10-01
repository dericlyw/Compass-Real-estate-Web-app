import Link from "next/link";
import { Nav } from "@/components/Nav";
import { testMode } from "@/lib/access";
import { readStore, storageMode } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await readStore();
  const counts = {
    "/approvals": s.assets.filter((a) => a.status === "needs_review").length,
    "/leads": s.leads.filter((l) => l.stage === "new").length,
    "/engine": (s.engine?.pieces ?? []).filter((p) => p.status === "polished").length,
    "/feedback": (s.feedback ?? []).length,
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col md:flex-row">
      <aside className="no-print border-b border-ink-700 px-4 py-5 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:px-5 md:py-8">
        <Link href="/" className="block">
          <p className="font-display text-xl leading-tight text-bone">
            PropVid<span className="text-gold">.</span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-bone-dim">Campaign Engine</p>
        </Link>
        <div className="my-5 hidden rounded-lg border border-ink-600 bg-ink-800 p-3 md:block">
          <p className="text-[10px] uppercase tracking-widest text-bone-dim">Active project</p>
          <p className="mt-1 font-display text-sm text-gold">{s.project.name}</p>
          <p className="text-xs text-bone-dim">{s.project.developer}</p>
        </div>
        <Nav counts={counts} />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
        {testMode() ? (
          <p className="no-print mb-6 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-bone-muted">
            <span className="text-gold">Test environment.</span> Nothing here is published or sent. Do not upload exported launch kits to live ad accounts.
          </p>
        ) : null}
        {storageMode() === "ephemeral" ? (
          <p className="no-print mb-6 rounded-md border border-bad/40 bg-bad/5 px-3 py-2 text-xs text-bad">
            Storage is temporary on this host (no Supabase configured) — work may disappear. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
