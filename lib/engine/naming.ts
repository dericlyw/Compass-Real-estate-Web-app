// Launch-kit naming convention: project_angle_persona_format_lang_variant, with UTMs baked in.

import { angles } from "@/lib/data/urban-forest";
import type { CopyVariant, CreativeAsset, Platform, Project } from "@/lib/types";
import { FORMAT_SPEC } from "@/lib/types";

export function adName(project: Project, asset: CreativeAsset, v: CopyVariant): string {
  const angle = angles.find((a) => a.id === asset.angleId)!;
  return [project.slug.replace(/-/g, ""), angle.code, asset.personaId, FORMAT_SPEC[asset.format].code, asset.lang, v.key.toLowerCase()].join("_");
}

export function landingUrl(siteUrl: string, project: Project, asset: CreativeAsset, v: CopyVariant, platform: Platform): string {
  const angle = angles.find((a) => a.id === asset.angleId)!;
  const u = new URL(`/lp/${angle.id}`, siteUrl);
  u.searchParams.set("lang", asset.lang);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", "paid_social");
  u.searchParams.set("utm_campaign", `${project.slug}_${angle.code}`);
  u.searchParams.set("utm_content", adName(project, asset, v));
  u.searchParams.set("utm_term", asset.personaId);
  return u.toString();
}
