"use server";
// Content Engine server actions: Angle → Draft → Polish → Repeat. Every stage change is audited,
// and the Polish gate is re-checked on the server at polish and at submit time.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiEnabled } from "@/lib/ai/copywriter";
import { specificityAnchors } from "@/lib/data/engine-seed";
import { complianceCtx, engineOf, entry, mutate, recheck } from "@/lib/data/store";
import { claims, angles as launchAngles, personas } from "@/lib/data/urban-forest";
import { checkAsset } from "@/lib/engine/compliance";
import {
  angleCodeFrom,
  checkAngle,
  ENGINE_PROMPT_VERSION,
  linkClaims,
  nextWeekSlots,
  pieceToAsset,
  polishBlockers,
  relint,
  weekOf,
} from "@/lib/engine/content";
import { endCard } from "@/lib/engine/generate";
import type { ContentPiece, EngineAngle, EngineJob, EngineState, Lang, PieceCopy, Platform, Store } from "@/lib/types";

async function actor(): Promise<string> {
  return (await cookies()).get("pv_user")?.value || "Operator";
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

function list(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function refreshAll() {
  revalidatePath("/", "layout");
}

const JOBS: EngineJob[] = ["strategy", "copy", "editing", "consistency"];
const LANG_OK: Lang[] = ["en", "bm", "zh"];
const PLATFORM_OK: Platform[] = ["meta", "tiktok", "xhs", "youtube", "google"];

const pieceUrl = (id: string, error?: string) => `/engine/piece/${id}${error ? `?error=${encodeURIComponent(error)}` : ""}`;

function ensureSession(e: EngineState, pieceId: string, now = new Date()) {
  const wk = weekOf(now);
  let session = e.sessions.find((x) => x.weekOf === wk);
  if (!session) {
    session = { id: crypto.randomUUID(), weekOf: wk, startedAt: now.toISOString(), pieceIds: [] };
    e.sessions.push(session);
  }
  if (!session.pieceIds.includes(pieceId)) session.pieceIds.push(pieceId);
}

function pieceCompliance(s: Store, piece: ContentPiece, angle: EngineAngle) {
  return checkAsset(pieceToAsset(piece, angle, s.project, endCard(s.project, piece.lang)), complianceCtx(s));
}

function gate(s: Store, piece: ContentPiece): string[] {
  const angle = engineOf(s).angles.find((a) => a.id === piece.angleId);
  if (!angle) return ["Angle: this piece's angle no longer exists."];
  return polishBlockers({ angleStatus: angle.status, piece, compliance: pieceCompliance(s, piece, angle) });
}

// ── Steps 1–2: profile & baseline ────────────────────────────────────

export async function saveProfile(fd: FormData) {
  const who = await actor();
  const num = (k: string) => {
    const n = Number(str(fd, k));
    return str(fd, k) && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const job = (k: string) => (JOBS.includes(str(fd, k) as EngineJob) ? (str(fd, k) as EngineJob) : null);
  await mutate((s) => {
    const p = engineOf(s).profile;
    p.business = str(fd, "business") || p.business;
    p.audience = str(fd, "audience") || p.audience;
    p.tone = list(str(fd, "tone")).slice(0, 5);
    p.offerLine = str(fd, "offerLine");
    p.avoid = list(str(fd, "avoid"));
    p.signatureDetails = str(fd, "signatureDetails").split("\n").map((x) => x.trim()).filter(Boolean);
    p.baseline = { hoursPerMonth: num("hoursPerMonth"), spendRM: num("spendRM"), weakestJob: job("weakestJob"), slowestJob: job("slowestJob") };
    const weekday = Number(str(fd, "weekday"));
    const time = /^\d{2}:\d{2}$/.test(str(fd, "time")) ? str(fd, "time") : p.session.time;
    const target = Math.min(5, Math.max(3, Number(str(fd, "target")) || p.session.target));
    p.session = { weekday: weekday >= 0 && weekday <= 6 ? weekday : p.session.weekday, time, target };
    s.audit.push(entry(who, "engine_profile_saved", s.project.id));
  });
  refreshAll();
  redirect("/engine/profile?saved=1");
}

// ── Step 4: Angle ────────────────────────────────────────────────────

function addAngle(e: EngineState, a: { sentence: string; personaId: string; parentAngleId: string; rationale: string; claimIds: string[]; problems: string[]; model?: string }): EngineAngle {
  const angle: EngineAngle = {
    id: crypto.randomUUID(),
    code: angleCodeFrom(a.sentence, e.angles.map((x) => x.code)),
    sentence: a.sentence.trim(),
    problems: a.problems,
    personaId: personas.some((p) => p.id === a.personaId) ? a.personaId : personas[0].id,
    parentAngleId: launchAngles.some((x) => x.id === a.parentAngleId) ? a.parentAngleId : launchAngles[0].id,
    claimIds: a.claimIds,
    rationale: a.rationale,
    specificity: checkAngle(a.sentence, { anchors: specificityAnchors() }),
    status: "proposed",
    createdAt: new Date().toISOString(),
    weekOf: weekOf(new Date()),
    model: a.model,
  };
  e.angles.unshift(angle);
  return angle;
}

function problemsFrom(fd: FormData): string[] {
  const picked = fd.getAll("problem").map((x) => String(x).trim()).filter(Boolean);
  return [...picked, ...str(fd, "customProblems").split("\n").map((x) => x.trim()).filter(Boolean)].slice(0, 3);
}

export async function proposeAnglesAction(fd: FormData) {
  const problems = problemsFrom(fd);
  if (problems.length < 2) redirect(`/engine?error=${encodeURIComponent("Pick or type 2–3 audience problems first.")}`);
  if (!aiEnabled()) redirect(`/engine?prompt=1&${problems.map((p) => `p=${encodeURIComponent(p)}`).join("&")}`);
  const who = await actor();
  let error = "";
  await mutate(async (s) => {
    const e = engineOf(s);
    try {
      const { proposeAngles } = await import("@/lib/ai/content");
      const { angles, model } = await proposeAngles(e.profile, problems);
      for (const a of [...angles].reverse()) addAngle(e, { ...a, problems, model });
      s.audit.push(entry(who, "engine_angles_proposed", s.project.id, `${angles.length} angles · ${model}`));
    } catch (err) {
      error = err instanceof Error ? err.message : "Angle suggestions failed";
    }
  });
  refreshAll();
  redirect(`/engine${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function addManualAngle(fd: FormData) {
  const sentence = str(fd, "sentence").slice(0, 400);
  if (!sentence) redirect(`/engine?error=${encodeURIComponent("Type the angle sentence.")}`);
  const who = await actor();
  await mutate((s) => {
    const a = addAngle(engineOf(s), {
      sentence,
      personaId: str(fd, "personaId"),
      parentAngleId: str(fd, "parentAngleId"),
      rationale: str(fd, "rationale"),
      claimIds: [],
      problems: fd.getAll("p").map(String).slice(0, 3),
    });
    s.audit.push(entry(who, "engine_angle_added", a.id, a.sentence));
  });
  refreshAll();
  redirect("/engine");
}

export async function chooseAngle(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  await mutate((s) => {
    const a = engineOf(s).angles.find((x) => x.id === id);
    if (!a || !a.specificity.ok || a.status !== "proposed") return; // vague angles cannot be chosen
    a.status = "chosen";
    s.audit.push(entry(who, "engine_angle_chosen", a.id, a.sentence));
  });
  refreshAll();
}

export async function dropAngle(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  await mutate((s) => {
    const a = engineOf(s).angles.find((x) => x.id === id);
    if (!a || a.status === "used") return;
    a.status = "rejected";
    s.audit.push(entry(who, "engine_angle_rejected", a.id));
  });
  refreshAll();
}

// ── Step 5: Draft ────────────────────────────────────────────────────

async function aiDraft(e: EngineState, piece: ContentPiece): Promise<void> {
  const angle = e.angles.find((a) => a.id === piece.angleId)!;
  const { draftCopy } = await import("@/lib/ai/content");
  const out = await draftCopy(e.profile, angle, { lang: piece.lang, platform: piece.platform, format: piece.format });
  piece.draft = out.copy;
  piece.copy = { ...out.copy };
  piece.claimIds = linkClaims(piece.copy, claims, out.claimIds.length ? out.claimIds : angle.claimIds);
  piece.model = out.model;
  piece.promptVersion = out.promptVersion;
  piece.timings.draftedAt = new Date().toISOString();
  piece.findings = relint(piece.copy, piece.lang, e.profile.avoid, []);
}

export async function createPiece(fd: FormData) {
  const angleId = str(fd, "angleId");
  const lang = (LANG_OK.includes(str(fd, "lang") as Lang) ? str(fd, "lang") : "en") as Lang;
  const platform = (PLATFORM_OK.includes(str(fd, "platform") as Platform) ? str(fd, "platform") : "meta") as Platform;
  const format = str(fd, "format") === "carousel" ? "carousel" : "post";
  const who = await actor();
  let id = "";
  let error = "";
  await mutate(async (s) => {
    const e = engineOf(s);
    const angle = e.angles.find((a) => a.id === angleId);
    if (!angle || (angle.status !== "chosen" && angle.status !== "used")) {
      error = "Choose an angle before drafting (Step 4 comes first).";
      return;
    }
    const piece: ContentPiece = {
      id: crypto.randomUUID(),
      angleId,
      lang,
      platform,
      format,
      draft: null,
      copy: { hook: "", primary: "", headline: "", cta: "" },
      claimIds: angle.claimIds,
      findings: [],
      signatureDetail: "",
      status: "draft",
      timings: { createdAt: new Date().toISOString() },
      promptVersion: `${ENGINE_PROMPT_VERSION}+manual`,
    };
    e.pieces.unshift(piece);
    ensureSession(e, piece.id);
    id = piece.id;
    s.audit.push(entry(who, "engine_piece_created", piece.id, `${angle.code} · ${lang} · ${platform} · ${format}`));
    if (aiEnabled()) {
      try {
        await aiDraft(e, piece);
        s.audit.push(entry(who, "engine_drafted", piece.id, `${piece.model} ${piece.promptVersion}`));
      } catch (err) {
        error = `AI draft failed (${err instanceof Error ? err.message : "error"}). Paste a draft instead.`;
      }
    }
  });
  refreshAll();
  if (!id) redirect(`/engine?error=${encodeURIComponent(error)}`);
  redirect(pieceUrl(id, error || undefined));
}

export async function draftWithAi(fd: FormData) {
  const id = str(fd, "id");
  if (!aiEnabled()) redirect(pieceUrl(id, "Set ANTHROPIC_API_KEY to draft with Claude, or paste a draft."));
  const who = await actor();
  let error = "";
  await mutate(async (s) => {
    const e = engineOf(s);
    const piece = e.pieces.find((p) => p.id === id);
    if (!piece || piece.status === "submitted") return;
    try {
      await aiDraft(e, piece);
      piece.readConfirmedAt = undefined;
      piece.status = "draft";
      s.audit.push(entry(who, "engine_drafted", piece.id, `${piece.model} ${piece.promptVersion}`));
    } catch (err) {
      error = err instanceof Error ? err.message : "AI draft failed";
    }
  });
  refreshAll();
  redirect(pieceUrl(id, error || undefined));
}

function copyFrom(fd: FormData): PieceCopy {
  return { hook: str(fd, "hook").slice(0, 200), primary: str(fd, "primary").slice(0, 2200), headline: str(fd, "headline").slice(0, 120), cta: str(fd, "cta").slice(0, 60) };
}

export async function pasteDraft(fd: FormData) {
  const id = str(fd, "id");
  const copy = copyFrom(fd);
  if (!copy.hook || !copy.primary) redirect(pieceUrl(id, "Paste at least a hook and the post text."));
  const who = await actor();
  await mutate((s) => {
    const e = engineOf(s);
    const piece = e.pieces.find((p) => p.id === id);
    if (!piece || piece.status === "submitted") return;
    piece.draft = copy;
    piece.copy = { ...copy };
    piece.claimIds = linkClaims(piece.copy, claims, e.angles.find((a) => a.id === piece.angleId)?.claimIds);
    piece.readConfirmedAt = undefined;
    piece.timings.draftedAt = new Date().toISOString();
    piece.findings = relint(piece.copy, piece.lang, e.profile.avoid, []);
    s.audit.push(entry(who, "engine_draft_pasted", piece.id));
  });
  refreshAll();
  redirect(pieceUrl(id));
}

export async function confirmRead(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  await mutate((s) => {
    const piece = engineOf(s).pieces.find((p) => p.id === id);
    if (!piece?.draft) return;
    piece.readConfirmedAt = new Date().toISOString();
    s.audit.push(entry(who, "engine_draft_read", piece.id));
  });
  refreshAll();
  redirect(pieceUrl(id));
}

// ── Step 6: Polish ───────────────────────────────────────────────────

export async function savePiece(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  await mutate((s) => {
    const e = engineOf(s);
    const piece = e.pieces.find((p) => p.id === id);
    if (!piece?.draft || piece.status === "submitted") return;
    piece.copy = copyFrom(fd);
    piece.signatureDetail = str(fd, "signatureDetail").slice(0, 200);
    piece.claimIds = linkClaims(piece.copy, claims, e.angles.find((a) => a.id === piece.angleId)?.claimIds);
    piece.findings = relint(piece.copy, piece.lang, e.profile.avoid, piece.findings);
    if (piece.status === "polished") {
      piece.status = "draft"; // any edit re-opens Polish
      piece.timings.polishedAt = undefined;
    }
    s.audit.push(entry(who, "engine_piece_edited", piece.id));
  });
  refreshAll();
  redirect(pieceUrl(id));
}

export async function overrideFinding(fd: FormData) {
  const id = str(fd, "id");
  const findingId = str(fd, "findingId");
  const reason = str(fd, "reason").slice(0, 200);
  if (!reason) redirect(pieceUrl(id, "An override needs a reason."));
  const who = await actor();
  await mutate((s) => {
    const piece = engineOf(s).pieces.find((p) => p.id === id);
    const f = piece?.findings.find((x) => x.id === findingId);
    if (!piece || !f || piece.status === "submitted") return;
    f.overrideReason = reason;
    s.audit.push(entry(who, "engine_finding_overridden", piece.id, `"${f.phrase}": ${reason}`));
  });
  refreshAll();
  redirect(pieceUrl(id));
}

export async function aiPolish(fd: FormData) {
  const id = str(fd, "id");
  if (!aiEnabled()) redirect(pieceUrl(id, "Set ANTHROPIC_API_KEY for the AI editor, or use the prompt below in Claude."));
  const who = await actor();
  let error = "";
  await mutate(async (s) => {
    const e = engineOf(s);
    const piece = e.pieces.find((p) => p.id === id);
    if (!piece?.draft || piece.status === "submitted") return;
    try {
      const { polishNotes } = await import("@/lib/ai/content");
      const { notes, model } = await polishNotes(piece.copy, piece.lang, piece.findings);
      for (const n of notes) {
        const existing = piece.findings.find((f) => f.field === n.field && f.phrase.toLowerCase() === n.phrase.toLowerCase());
        if (existing) existing.suggestion = n.suggestion;
        else piece.findings.push({ id: `${n.field}:ai:${n.phrase.toLowerCase()}`, field: n.field, phrase: n.phrase, reason: "Flagged by the AI editor as generic.", severity: "warn", suggestion: n.suggestion });
      }
      s.audit.push(entry(who, "engine_ai_polish", piece.id, `${notes.length} notes · ${model}`));
    } catch (err) {
      error = err instanceof Error ? err.message : "AI editor failed";
    }
  });
  refreshAll();
  redirect(pieceUrl(id, error || undefined));
}

export async function markPolished(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  let blockers: string[] = [];
  await mutate((s) => {
    const piece = engineOf(s).pieces.find((p) => p.id === id);
    if (!piece || piece.status !== "draft") return;
    blockers = gate(s, piece);
    if (blockers.length) return;
    piece.status = "polished";
    piece.timings.polishedAt = new Date().toISOString();
    s.audit.push(entry(who, "engine_polished", piece.id));
  });
  refreshAll();
  redirect(pieceUrl(id, blockers.length ? blockers.join(" ") : undefined));
}

// ── Step 7: Repeat — schedule next week and hand off to the campaign ──

export async function submitPolished(fd: FormData) {
  const only = str(fd, "id");
  const who = await actor();
  let count = 0;
  let skipped = 0;
  await mutate((s) => {
    const e = engineOf(s);
    const now = new Date();
    const taken = [...e.pieces.map((p) => p.scheduledFor), ...s.assets.map((a) => a.engine?.scheduledFor)].filter((x): x is string => Boolean(x));
    const free = nextWeekSlots(now, taken);
    for (const piece of e.pieces.filter((p) => p.status === "polished" && (!only || p.id === only))) {
      const angle = e.angles.find((a) => a.id === piece.angleId);
      if (!angle || gate(s, piece).length) {
        skipped++; // gate is authoritative, even for pieces polished before a rule changed
        continue;
      }
      piece.scheduledFor = free.shift();
      const asset = pieceToAsset(piece, angle, s.project, endCard(s.project, piece.lang));
      recheck(s, asset);
      s.assets.push(asset);
      piece.assetId = asset.id;
      piece.status = "submitted";
      piece.timings.submittedAt = now.toISOString();
      angle.status = "used";
      ensureSession(e, piece.id, now);
      count++;
      s.audit.push(entry(who, "engine_submitted", asset.id, `slot ${piece.scheduledFor ?? "unscheduled"} · ${angle.code}`));
    }
  });
  refreshAll();
  const msg = `${count} piece${count === 1 ? "" : "s"} sent to the approval queue${skipped ? `; ${skipped} held back by the gate` : ""}.`;
  redirect(`/engine?done=${encodeURIComponent(msg)}`);
}
