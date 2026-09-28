// Compliance Agent — blocking gate. Deterministic rules first; nothing reaches the
// approval queue with a "block". Pure functions so they are unit-testable.

import type { Claim, ComplianceResult, CopyVariant, CreativeAsset, Project } from "@/lib/types";

export const RULESET_VERSION = "compliance-v1";

const RETURN_PATTERNS: RegExp[] = [
  /guarantee/i,
  /assured\s+(return|income|yield)/i,
  /fixed\s+(return|income|yield)/i,
  /\d+(\.\d+)?\s?%\s*(return|yield|roi|p\.?a\.?|per annum|rental)/i,
  /\broi\b/i,
  /passive income/i,
  /dijamin|jaminan|pulangan\s+(tetap|terjamin|\d)/i,
  /保证|稳赚|保本|回报率|\d+(\.\d+)?\s?%\s*回报/,
];

const SUPERLATIVES = /\b(world[- ]class|best|no\.?\s?1|number one|first ever)\b|terbaik|nombor satu|最好|第一|顶级/i;

const PRICE = /(RM|MYR)\s?[\d,.]+\s?(k|mil|million|juta)?|万令吉|令吉\s?[\d,.]+/gi;

const LOCALITIES = /\b(bercham|tambun)\b|布占|打扪/i;

export function variantText(v: CopyVariant): string {
  return [v.hook, v.primary, v.headline, v.cta].join("\n");
}

function numbersIn(text: string): string[] {
  // Standalone numbers, ignoring those that are part of prices (handled separately).
  const withoutPrices = text.replace(PRICE, " ");
  return withoutPrices.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

function allowedNumbers(claims: Claim[]): Set<string> {
  const s = new Set<string>();
  for (const c of claims) {
    if (c.status === "high_risk") continue;
    for (const n of c.statement.match(/\d+(?:[.,]\d+)?/g) ?? []) s.add(n);
  }
  return s;
}

export interface ComplianceContext {
  project: Project;
  claims: Claim[];
  artistImpressionLabels: string[];
}

export function checkAsset(asset: CreativeAsset, ctx: ComplianceContext): ComplianceResult[] {
  const out: ComplianceResult[] = [];
  const { project, claims } = ctx;
  const claimById = new Map(claims.map((c) => [c.id, c]));

  // R1 — Permit & licence (Housing Development (Control & Licensing) rules).
  const p = project.permit;
  if (!p.developerLicence || !p.advertisingPermit) {
    out.push({
      rule: "R1 permit",
      level: "block",
      message: `Missing ${[!p.developerLicence && "developer licence no.", !p.advertisingPermit && "advertising & sales permit (APDL) no."]
        .filter(Boolean)
        .join(" and ")}. Enter it under Settings.`,
    });
  } else {
    out.push({ rule: "R1 permit", level: "pass", message: `End card carries licence ${p.developerLicence} / APDL ${p.advertisingPermit}.` });
  }

  // R2 — Renders labelled as artist's impression.
  if (asset.rendersUsed) {
    const labelled = ctx.artistImpressionLabels.some((l) => asset.endCard.includes(l));
    out.push(
      labelled
        ? { rule: "R2 render label", level: "pass", message: "Artist's impression label present." }
        : { rule: "R2 render label", level: "block", message: "Uses rendered/AI-generated footage without an 'Artist's impression' label." },
    );
  }

  const texts = asset.variants.map((v) => ({ key: v.key, text: variantText(v) }));
  const allowed = allowedNumbers(claims);
  const priceSet = new Set(project.priceList.map((x) => String(x.priceFromRM)));

  for (const { key, text } of texts) {
    // R3 — No guaranteed-return or misleading investment claims.
    const hit = RETURN_PATTERNS.find((re) => re.test(text));
    if (hit) out.push({ rule: "R3 investment claim", level: "block", message: `Variant ${key}: return/guarantee language matched ${hit}.` });

    // R4 — Prices must match the price list exactly.
    for (const m of text.match(PRICE) ?? []) {
      const n = m.replace(/[^\d.]/g, "");
      if (!priceSet.has(n)) out.push({ rule: "R4 price", level: "block", message: `Variant ${key}: price "${m.trim()}" not found in the price list.` });
    }

    // R5 — Every number must trace to a brief claim.
    for (const n of numbersIn(text)) {
      if (!allowed.has(n)) out.push({ rule: "R5 unsourced number", level: "block", message: `Variant ${key}: "${n}" has no source in the project brief.` });
    }

    // R6 — Superlatives need substantiation.
    const sup = text.match(SUPERLATIVES);
    if (sup) out.push({ rule: "R6 superlative", level: "warn", message: `Variant ${key}: "${sup[0]}" needs substantiation before launch.` });

    // R7 — Locality conflict.
    const conflict = claims.find((c) => c.id === "c-location" && c.status === "conflict");
    const loc = text.match(LOCALITIES);
    if (loc && conflict) out.push({ rule: "R7 locality", level: "warn", message: `Variant ${key}: names "${loc[0]}" while the locality is unconfirmed (Bercham vs Tambun).` });
  }

  // R8 — Claim provenance.
  const used = new Set(asset.variants.flatMap((v) => v.claimIds));
  for (const id of used) {
    const c = claimById.get(id);
    if (!c) out.push({ rule: "R8 claim source", level: "block", message: `Claim ${id} is not in the project brief.` });
    else if (c.status === "high_risk") out.push({ rule: "R8 claim source", level: "block", message: `Uses high-risk claim: ${c.statement}.` });
    else if (c.status === "unverified" || c.status === "conflict")
      out.push({ rule: "R8 claim source", level: "warn", message: `Relies on unverified claim "${c.statement}" (${c.sources.map((s) => `${s.doc} ${s.locator}`).join("; ")}).` });
  }

  // R9 — PDPA: destination landing page needs a privacy link.
  out.push(
    project.privacyUrl
      ? { rule: "R9 PDPA", level: "pass", message: "Landing page carries PDPA 2010 consent notice and privacy link." }
      : { rule: "R9 PDPA", level: "warn", message: "Landing page has the PDPA consent notice but no privacy-policy URL yet." },
  );

  // R10 — Platform policy.
  if (asset.platforms.includes("meta"))
    out.push({ rule: "R10 Meta housing", level: "pass", message: "Launch as Special Ad Category: Housing — no age, gender or postcode targeting." });
  if (asset.platforms.includes("tiktok")) {
    for (const v of asset.variants)
      if ([...v.hook].length > 100) out.push({ rule: "R10 TikTok", level: "warn", message: `Variant ${v.key}: hook exceeds TikTok's 100-character ad text limit.` });
  }
  for (const v of asset.variants)
    if (asset.platforms.includes("meta") && [...v.headline].length > 40)
      out.push({ rule: "R10 Meta", level: "warn", message: `Variant ${v.key}: headline over 40 characters may truncate on mobile.` });

  return out;
}

export function isBlocked(results: ComplianceResult[]): boolean {
  return results.some((r) => r.level === "block");
}

export function summary(results: ComplianceResult[]): "pass" | "warn" | "block" {
  if (isBlocked(results)) return "block";
  return results.some((r) => r.level === "warn") ? "warn" : "pass";
}
