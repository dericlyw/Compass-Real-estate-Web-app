// Launch-kit naming convention: project_angle_persona_format_lang_variant, with UTMs baked in.
// Content Engine assets carry their own angle code (asset.engine) and land on the parent
// launch angle's landing page (asset.angleId).

import { angles } from "@/lib/data/urban-forest";
import type { CopyVariant, CreativeAsset, Platform, Project } from "@/lib/types";
import { FORMAT_SPEC } from "@/lib/types";

function angleCode(asset: CreativeAsset): string {
  if (asset.engine) return asset.engine.angleCode;
  return angles.find((a) => a.id === asset.angleId)?.code ?? asset.angleId;
}

export function adName(project: Project, asset: CreativeAsset, v: CopyVariant): string {
  return [project.slug.replace(/-/g, ""), angleCode(asset), asset.personaId, FORMAT_SPEC[asset.format].code, asset.lang, v.key.toLowerCase()].join("_");
}

export function landingUrl(siteUrl: string, project: Project, asset: CreativeAsset, v: CopyVariant, platform: Platform): string {
  const u = new URL(`/lp/${asset.angleId}`, siteUrl);
  u.searchParams.set("lang", asset.lang);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", asset.engine ? "organic_social" : "paid_social");
  u.searchParams.set("utm_campaign", `${project.slug}_${angleCode(asset)}`);
  u.searchParams.set("utm_content", adName(project, asset, v));
  u.searchParams.set("utm_term", asset.personaId);
  return u.toString();
}
