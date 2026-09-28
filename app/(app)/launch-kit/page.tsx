import { headers } from "next/headers";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { rowsFor } from "@/lib/engine/launchkit";
import type { Platform } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/types";

export default async function LaunchKit() {
  const s = await readStore();
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const platforms = Object.keys(PLATFORM_LABEL) as Platform[];
  const preview = rowsFor(s, "meta", site).slice(0, 6);
  return (
    <>
      <PageHeader eyebrow="Stage 8 · Launch Kit" title="Ready-to-launch ad sets">
        Only approved assets export. Every ad is named <code className="text-gold">project_angle_persona_format_lang_variant</code> and its URL carries UTMs,
        so every lead, appointment and SPA traces back to the asset that produced it. Ads upload paused.
      </PageHeader>
      {!s.assets.some((a) => a.status === "approved") ? <Notice>No approved assets yet. Approve assets in the queue to enable exports.</Notice> : null}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {platforms.map((p) => {
          const n = rowsFor(s, p, site).length;
          return (
            <div key={p} className="card">
              <p className="font-display text-lg text-bone">{PLATFORM_LABEL[p]}</p>
              <p className="mt-1 text-xs text-bone-dim">{n} ads ready</p>
              {n ? <a className="btn mt-4" href={`/api/launch-kit?platform=${p}`}>Download ZIP</a> : <p className="mt-4 text-xs text-bone-dim">{p === "xhs" || p === "google" ? "Organic / search — brief in Campaign Plan" : "Nothing approved"}</p>}
            </div>
          );
        })}
      </div>
      <Section title="Preview — Meta">
        <div className="card overflow-x-auto">
          {preview.length ? (
            <table className="table">
              <thead><tr><th>Ad name</th><th>Hook</th><th>Headline</th><th>URL</th></tr></thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.ad_name}>
                    <td className="whitespace-nowrap font-mono text-xs text-gold">{r.ad_name}</td>
                    <td className="max-w-xs text-bone">{r.hook}</td>
                    <td className="text-bone-muted">{r.headline}</td>
                    <td className="max-w-xs break-all text-[11px] text-bone-dim">{r.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-bone-dim">Approved Meta ads will appear here. <Badge>Special Ad Category: Housing</Badge></p>}
        </div>
      </Section>
    </>
  );
}
