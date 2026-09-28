// Creative Agents (Copywriter + asset planner) — deterministic build from the house
// copy library. The Claude-backed Copywriter (lib/ai/copywriter.ts) rewrites single
// variants on request; its output goes through the same compliance gate.

import { ARTIST_IMPRESSION, COPY_PROMPT_VERSION, CTA, library } from "@/lib/data/copy-library";
import { angles } from "@/lib/data/urban-forest";
import type { AssetFormat, CopyVariant, CreativeAsset, Lang, Platform, Project } from "@/lib/types";
import { LANGS } from "@/lib/types";

const FORMATS: AssetFormat[] = ["reel15", "feed30", "carousel", "story"];

const PLATFORMS_BY_FORMAT: Record<AssetFormat, Platform[]> = {
  reel15: ["meta", "tiktok", "youtube"],
  feed30: ["meta", "youtube"],
  carousel: ["meta"],
  story: ["meta"],
};

export function permitLine(project: Project, lang: Lang): string {
  const p = project.permit;
  if (!p.developerLicence || !p.advertisingPermit) return "[PERMIT PENDING]";
  const label = { en: "Developer licence", bm: "Lesen pemaju", zh: "发展商执照" }[lang];
  const permit = { en: "Adv. & sales permit", bm: "Permit iklan & jualan", zh: "广告与销售准证" }[lang];
  const validity = p.validity ? ` (${p.validity})` : "";
  const authority = p.approvingAuthority ? ` · ${p.approvingAuthority}` : "";
  return `${label}: ${p.developerLicence} · ${permit}: ${p.advertisingPermit}${validity}${authority}`;
}

export function endCard(project: Project, lang: Lang): string {
  return `${project.name} · ${project.developer} · ${ARTIST_IMPRESSION[lang]} · ${permitLine(project, lang)}`;
}

function variants(angleId: string, lang: Lang, format: AssetFormat, claimIds: string[]): CopyVariant[] {
  const c = library[angleId][lang];
  const cta = format === "carousel" || angleId === "food" || angleId === "night" ? CTA[lang].register : CTA[lang].visit;
  // Short formats lead with the short body; feed video gets the long body on variant B.
  const body = (i: number) => (format === "feed30" && i === 1 ? c.long : c.short);
  return (["A", "B", "C"] as const).map((key, i) => ({
    key,
    hook: c.hooks[i],
    primary: body(i),
    headline: c.headlines[i],
    cta,
    claimIds,
    promptVersion: COPY_PROMPT_VERSION,
  }));
}

/** Builds 4 angles × 3 languages × 4 formats = 48 assets, each with A/B/C copy variants. */
export function buildAssets(project: Project): CreativeAsset[] {
  const out: CreativeAsset[] = [];
  for (const angle of angles) {
    for (const lang of LANGS) {
      for (const format of FORMATS) {
        // Video formats target the angle's lead persona; statics target the secondary persona.
        const personaId = format === "reel15" || format === "feed30" ? angle.personas[0] : angle.personas[1] ?? angle.personas[0];
        out.push({
          id: `${angle.code}-${lang}-${format}`,
          projectId: project.id,
          angleId: angle.id,
          personaId,
          format,
          lang,
          platforms: PLATFORMS_BY_FORMAT[format],
          sceneIds: format === "reel15" ? angle.sceneIds.slice(0, 3).concat(angle.sceneIds.slice(-1)) : angle.sceneIds,
          variants: variants(angle.id, lang, format, angle.claimIds),
          endCard: endCard(project, lang),
          rendersUsed: true,
          status: "draft",
          compliance: [],
        });
      }
    }
  }
  return out;
}
