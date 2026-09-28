import "server-only";
// Copywriter Agent (Claude). Rewrites one copy variant from verified brief claims only.
// Output always goes back through the compliance gate before it can be approved.

import Anthropic from "@anthropic-ai/sdk";
import { angles, claims, personas } from "@/lib/data/urban-forest";
import type { CopyVariant, CreativeAsset } from "@/lib/types";
import { FORMAT_SPEC, LANG_LABEL } from "@/lib/types";

export const MODEL = "claude-opus-5";
export const PROMPT_VERSION = "copywriter-v1";

const SYSTEM = `You are a senior Malaysian property copywriter writing platform-native social ads.
Every asset exists to create a booked sales-gallery visit.
Hard rules:
- Use ONLY facts in the provided claims list. Never invent prices, unit counts, sizes, dates, returns or permit numbers.
- Never mention investment returns, yields, percentages or guarantees.
- Do not name the locality (Bercham/Tambun is unconfirmed); say "Ipoh".
- No superlatives such as "world-class" or "best".
- Write natively in the requested language (Bahasa Malaysia or Simplified Chinese are not translations; write as a native marketer would).
- Hook ≤ 90 characters. Headline ≤ 40 characters. Primary text ≤ 400 characters.`;

const schema = {
  type: "object",
  properties: {
    hook: { type: "string" },
    primary: { type: "string" },
    headline: { type: "string" },
    cta: { type: "string" },
    claimIds: { type: "array", items: { type: "string" } },
  },
  required: ["hook", "primary", "headline", "cta", "claimIds"],
  additionalProperties: false,
} as const;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function rewriteVariant(asset: CreativeAsset, current: CopyVariant, instruction: string): Promise<CopyVariant> {
  const angle = angles.find((a) => a.id === asset.angleId)!;
  const persona = personas.find((p) => p.id === asset.personaId)!;
  const usable = claims.filter((c) => c.status !== "high_risk" && c.id !== "c-ipoh-city-day" && c.id !== "c-tenant-secured" && c.id !== "c-brands");

  const client = new Anthropic();
  // Server-side fallback: if the primary model declines, the API re-runs on a recommended model.
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Rewrite this ad copy variant.",
          reviewer_instruction: instruction || "Make the hook stronger for the first 3 seconds.",
          language: LANG_LABEL[asset.lang],
          format: FORMAT_SPEC[asset.format],
          platforms: asset.platforms,
          angle: { name: angle.name, promise: angle.promise },
          persona,
          claims: usable.map((c) => ({ id: c.id, statement: c.statement, status: c.status })),
          current,
        }),
      },
    ],
  };
  const res = (await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)) as Anthropic.Beta.BetaMessage;
  if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No copy returned.");
  const out = JSON.parse(text.text) as Omit<CopyVariant, "key">;
  return { ...out, key: current.key, model: res.model, promptVersion: PROMPT_VERSION };
}
