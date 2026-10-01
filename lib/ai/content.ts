import "server-only";
// Content Engine agents (Claude): Strategist (Angle), Copywriter (Draft), Editor (Polish).
// Same request shape and guardrails as lib/ai/copywriter.ts. Output is never trusted directly:
// angles go through the specificity check, drafts through the linter and the compliance gate.

import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "@/lib/ai/copywriter";
import { angles as launchAngles, claims, personas } from "@/lib/data/urban-forest";
import { anglePrompt, draftPrompt, ENGINE_PROMPT_VERSION, polishPrompt } from "@/lib/engine/content";
import type { ContentPiece, Lang, LintFinding, PieceCopy, Platform, VoiceProfile } from "@/lib/types";

/** Claims the engine may use: same exclusions as the launch Copywriter. */
export const usableClaims = () =>
  claims.filter((c) => c.status !== "high_risk" && !["c-ipoh-city-day", "c-tenant-secured", "c-brands"].includes(c.id));

const RULES = `Hard rules:
- Use ONLY facts in the provided claims list. Never invent prices, unit counts, sizes, dates, returns, percentages or permit numbers.
- Never mention investment returns, yields or guarantees.
- Do not name the locality (Bercham/Tambun is unconfirmed); say "Ipoh".
- No superlatives such as "world-class" or "best".
- Write natively in the requested language; Bahasa Malaysia and Simplified Chinese are not translations.`;

async function callJson<T>(system: string, user: string, schema: Record<string, unknown>): Promise<{ data: T; model: string }> {
  const client = new Anthropic();
  // Server-side fallback: if the primary model declines, the API re-runs on a recommended model.
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
  };
  const res = (await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)) as Anthropic.Beta.BetaMessage;
  if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No output returned.");
  return { data: JSON.parse(text.text) as T, model: res.model };
}

// ── Angle ────────────────────────────────────────────────────────────

export interface AngleSuggestion {
  sentence: string;
  personaId: string;
  parentAngleId: string;
  rationale: string;
  claimIds: string[];
}

export async function proposeAngles(profile: VoiceProfile, problems: string[]): Promise<{ angles: AngleSuggestion[]; model: string }> {
  const schema = {
    type: "object",
    properties: {
      angles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sentence: { type: "string" },
            personaId: { type: "string", enum: personas.map((p) => p.id) },
            parentAngleId: { type: "string", enum: launchAngles.map((a) => a.id) },
            rationale: { type: "string" },
            claimIds: { type: "array", items: { type: "string" } },
          },
          required: ["sentence", "personaId", "parentAngleId", "rationale", "claimIds"],
          additionalProperties: false,
        },
      },
    },
    required: ["angles"],
    additionalProperties: false,
  };
  const system = `You are a senior Malaysian property marketing strategist. Your job is not to generate ideas but to narrow to the one message that matters most right now.
An angle is ONE sentence (≤ 25 words), specific enough that it could not apply to any other project. "Tips for buying property" is not an angle.
Return up to 3 angles, strongest first. For each: the persona it serves, the launch angle whose landing page fits best, a rationale of at most 2 short lines, and the claim IDs it relies on.
${RULES}`;
  const user = JSON.stringify({
    request: anglePrompt(profile, problems),
    personas: personas.map((p) => ({ id: p.id, name: p.name, who: p.who })),
    landing_pages: launchAngles.map((a) => ({ id: a.id, name: a.name, promise: a.promise })),
    claims: usableClaims().map((c) => ({ id: c.id, statement: c.statement, status: c.status })),
  });
  const { data, model } = await callJson<{ angles: AngleSuggestion[] }>(system, user, schema);
  return { angles: data.angles.slice(0, 3), model };
}

// ── Draft ────────────────────────────────────────────────────────────

export async function draftCopy(
  profile: VoiceProfile,
  angle: { sentence: string; personaId: string },
  opts: { lang: Lang; platform: Platform; format: ContentPiece["format"] },
): Promise<{ copy: PieceCopy; claimIds: string[]; model: string; promptVersion: string }> {
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
  };
  const facts = usableClaims();
  const persona = personas.find((p) => p.id === angle.personaId);
  const system = `You are a senior Malaysian property copywriter writing organic social posts that earn a sales-gallery visit.
Write like a person, not a brochure: short sentences, one idea, no clichés ("nestled", "elevate", "dream home", "in the heart of", "whether you're…").
Hook ≤ 90 characters. Headline ≤ 40 characters. Primary text ≤ 400 characters.
${RULES}`;
  const user = JSON.stringify({
    request: draftPrompt(profile, angle.sentence, { ...opts, facts: facts.map((c) => c.statement) }),
    persona,
    claims: facts.map((c) => ({ id: c.id, statement: c.statement, status: c.status })),
    offer_line: profile.offerLine,
    avoid_phrases: profile.avoid,
  });
  const { data, model } = await callJson<PieceCopy & { claimIds: string[] }>(system, user, schema);
  const { claimIds, ...copy } = data;
  return { copy, claimIds: claimIds.filter((id) => facts.some((c) => c.id === id)), model, promptVersion: ENGINE_PROMPT_VERSION };
}

// ── Polish ───────────────────────────────────────────────────────────

export interface PolishNote {
  field: LintFinding["field"];
  phrase: string;
  suggestion: string;
}

/** Editor pass: suggestions for flagged phrases plus any other generic lines the linter missed. */
export async function polishNotes(copy: PieceCopy, lang: Lang, findings: LintFinding[]): Promise<{ notes: PolishNote[]; model: string }> {
  const schema = {
    type: "object",
    properties: {
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: ["hook", "primary", "headline", "cta"] },
            phrase: { type: "string" },
            suggestion: { type: "string" },
          },
          required: ["field", "phrase", "suggestion"],
          additionalProperties: false,
        },
      },
    },
    required: ["notes"],
    additionalProperties: false,
  };
  const system = `You are a sharp editor for a Malaysian property brand. Your job is making sure the piece sounds like the people behind it, not a template.
For each phrase that sounds generic, "perfect" or AI-written, quote it EXACTLY as it appears and suggest a more natural, conversational alternative in the same language, keeping the core message.
Always cover the already-flagged phrases first. At most 8 notes. Do not add facts or numbers.
${RULES}`;
  const user = JSON.stringify({
    request: polishPrompt(copy),
    language: lang,
    copy,
    already_flagged: findings.map((f) => ({ field: f.field, phrase: f.phrase, reason: f.reason })),
  });
  const { data, model } = await callJson<{ notes: PolishNote[] }>(system, user, schema);
  // Keep only notes that quote text actually present in that field.
  return { notes: data.notes.filter((n) => n.phrase && copy[n.field]?.includes(n.phrase)).slice(0, 8), model };
}
