// Launch Kit — per-platform export of approved assets: CSV of copy + UTMs, manifest, README.

import { angles } from "@/lib/data/urban-forest";
import { adName, landingUrl } from "@/lib/engine/naming";
import type { Platform, Store } from "@/lib/types";
import { FORMAT_SPEC } from "@/lib/types";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function rowsFor(s: Store, platform: Platform, siteUrl: string) {
  return s.assets
    .filter((a) => a.status === "approved" && a.platforms.includes(platform))
    .flatMap((a) =>
      a.variants.map((v) => ({
        ad_name: adName(s.project, a, v),
        angle: a.engine ? `Engine: ${a.engine.angle}` : (angles.find((x) => x.id === a.angleId)?.name ?? a.angleId),
        source: a.engine ? "content_engine" : "launch",
        scheduled_for: a.engine?.scheduledFor ?? "",
        persona: a.personaId,
        language: a.lang,
        format: FORMAT_SPEC[a.format].label,
        aspect: FORMAT_SPEC[a.format].aspect,
        hook: v.hook,
        primary_text: v.primary,
        headline: v.headline,
        cta: v.cta,
        end_card: a.endCard,
        scenes: a.sceneIds.join(" "),
        url: landingUrl(siteUrl, s.project, a, v, platform),
        special_ad_category: platform === "meta" ? "HOUSING" : "",
        status_on_upload: "PAUSED",
      })),
    );
}

export function toCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c] ?? "")).join(","))].join("\n");
}

export const README = (platform: string, project: string) => `Launch kit — ${project} — ${platform}

1. Upload ads PAUSED. A named person must press Go (PRD non-goal: no auto-publishing).
2. Meta: create campaigns under Special Ad Category = Housing. Do not narrow by age, gender or postcode.
3. Use ad_name exactly as given (project_angle_persona_format_lang_variant) so leads trace back to the asset.
4. Destination URLs already carry UTM parameters. Do not strip them.
5. Video files: cut by the worker from the master file using the scene IDs in 'scenes'.
   Every clip shows the end card text in 'end_card' (includes the Artist's impression label and permit line).
6. Any copy change after export requires re-approval in the Approval Queue.
`;
