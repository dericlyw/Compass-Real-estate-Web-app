// Content Engine — Angle → Draft → Polish → Repeat (docs/PRD_CONTENT_ENGINE.md).
// Pure functions only (type imports), so the node test runner can load this file directly.

import type {
  Claim,
  ComplianceResult,
  ContentPiece,
  CreativeAsset,
  EngineAngle,
  Lang,
  LintFinding,
  PieceCopy,
  Platform,
  Project,
  SpecificityResult,
  VoiceProfile,
} from "@/lib/types";

export const ENGINE_PROMPT_VERSION = "engine-v1";

// ── Step 4: Angle specificity check ──────────────────────────────────

const TOPIC_OPENERS: RegExp[] = [
  /^(\d+\s+)?(tips|ideas|ways|reasons|things|facts)\b/i,
  /^why you should\b/i,
  /^everything (about|you need)/i,
  /^(all )?about\b/i,
  /^(a |an |the )?(guide|introduction|overview|intro)\b/i,
  /^how to\b/i,
  /^(tips|cara|panduan|semua tentang|pengenalan)\b/i,
  /^(关于|如何|介绍|指南)/,
  /(的技巧|的指南|须知)$/,
];

const VAGUE = /\b(amazing|awesome|great|nice|beautiful|perfect|best|incredible|stunning)\b|terbaik|hebat|最好|完美|超棒/i;

const MAX_WORDS = 25;
const MIN_WORDS = 6;
const MAX_ZH_CHARS = 60;
const MIN_ZH_CHARS = 10;

function isCjk(text: string): boolean {
  return /[一-鿿]/.test(text);
}

export interface SpecificityContext {
  /** Concrete anchors: places, project name, audience words ("families", "investors", 家庭…). */
  anchors: string[];
}

/**
 * A strong angle is one specific claim, not a topic: "Tips for marketing" fails;
 * "Why most small businesses overpay for content they could produce in 20 minutes" passes.
 */
export function checkAngle(sentence: string, ctx: SpecificityContext): SpecificityResult {
  const s = sentence.trim().replace(/\s+/g, " ");
  const reasons: string[] = [];
  if (!s) return { ok: false, reasons: ["Angle is empty."] };

  if (TOPIC_OPENERS.some((re) => re.test(s))) reasons.push("Reads as a topic, not an angle. Say the one thing you want them to believe.");

  if (isCjk(s)) {
    const n = [...s.replace(/\s/g, "")].length;
    if (n > MAX_ZH_CHARS) reasons.push(`Too long (${n} characters). Keep it to one sentence of ≤ ${MAX_ZH_CHARS}.`);
    if (n < MIN_ZH_CHARS) reasons.push("Too short to carry a specific point.");
  } else {
    const n = s.split(" ").length;
    if (n > MAX_WORDS) reasons.push(`Too long (${n} words). Keep it to one sentence of ≤ ${MAX_WORDS} words.`);
    if (n < MIN_WORDS) reasons.push("Too short to carry a specific point.");
  }

  // One terminal mark is fine; a sentence break inside means two messages. ("5.5" is not a break.)
  const inner = s.replace(/[.!?。！？]+$/, "");
  if (/[.!?](\s|$)|[。！？]/.test(inner)) reasons.push("More than one sentence. An angle is one message.");

  const lower = s.toLowerCase();
  const anchored = /\d/.test(s) || ctx.anchors.some((a) => a && lower.includes(a.toLowerCase()));
  if (!anchored) reasons.push("Nothing concrete: add a number, a place, or who it is for.");

  const vague = s.match(VAGUE);
  if (vague) reasons.push(`"${vague[0]}" is vague praise. Replace it with the fact behind it.`);

  return { ok: reasons.length === 0, reasons };
}

const STOP = new Set(["the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "at", "is", "are", "your", "you", "why", "most", "with", "from", "that", "this", "it", "its", "yang", "dan", "di", "untuk", "ke", "anda"]);

/**
 * Short code for ad names / UTMs, e.g. "e-ipohfamilies". The "e-" prefix keeps engine codes
 * distinct from the launch angle codes. Non-Latin text falls back to e1, e2…
 */
export function angleCodeFrom(sentence: string, taken: string[]): string {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  const base = words.length ? `e-${words.slice(0, 2).join("").slice(0, 12)}` : "e";
  if (base !== "e" && !taken.includes(base)) return base;
  let i = 1;
  while (taken.includes(`${base}${i}`)) i++;
  return `${base}${i}`;
}

// ── Step 6: generic-phrase linter ────────────────────────────────────

interface Rule {
  re: RegExp;
  reason: string;
  severity: "block" | "warn";
}

const AI_TELL = "Reads as template/AI copy. Say it the way you would across the table.";

const RULES: Record<Lang, Rule[]> = {
  en: [
    { re: /\bnestled\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\belevat(e|es|ed|ing)\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\bunlock(s|ed|ing)?\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\blook no further\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\bin today'?s fast[- ]paced world\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\b(vibrant )?tapestry\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\bembark on\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\ba testament to\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\bgame[- ]changer\b/gi, reason: AI_TELL, severity: "block" },
    { re: /\bin the heart of\b/gi, reason: "Every listing says this. Name the actual place or drive time.", severity: "block" },
    { re: /\bdream home\b/gi, reason: "Generic property cliché. Say what the buyer actually gets.", severity: "block" },
    { re: /\bwhether you'?re\b/gi, reason: "'Whether you're… or…' is a template opener. Pick one reader.", severity: "block" },
    { re: /\bnot just an? [^.,;!?]{1,40}[,;—–-]+\s*it'?s\b/gi, reason: "'Not just X, it's Y' is a stock AI construction.", severity: "block" },
    { re: /\bwhere \w+ meets \w+\b/gi, reason: "'Where X meets Y' is a stock tagline construction.", severity: "block" },
    { re: /\b(seamless(ly)?|unparalleled|exquisite|second to none|like never before|state[- ]of[- ]the[- ]art)\b/gi, reason: "Empty intensifier. Replace with the specific fact.", severity: "warn" },
    { re: /\b(boast(s|ing)?|hidden gem|perfect blend|luxurious living|discover the perfect)\b/gi, reason: "Brochure cliché.", severity: "warn" },
    { re: /\b(don'?t miss out|act now|limited time)\b/gi, reason: "Pressure line; reads as spam and can mislead.", severity: "warn" },
    { re: /\b\w+(ful|ous|ive|ant|ent|ic),\s+\w+(ful|ous|ive|ant|ent|ic),?\s+and\s+\w+(ful|ous|ive|ant|ent|ic)\b/gi, reason: "Three stacked adjectives. Keep the one that is true and specific.", severity: "warn" },
  ],
  bm: [
    { re: /kediaman (idaman|impian)/gi, reason: "Klise hartanah. Nyatakan apa yang pembeli dapat.", severity: "block" },
    { re: /rumah (idaman|impian)/gi, reason: "Klise hartanah. Nyatakan apa yang pembeli dapat.", severity: "block" },
    { re: /gaya hidup (mewah|eksklusif)/gi, reason: "Frasa templat. Gunakan butiran sebenar.", severity: "block" },
    { re: /peluang keemasan/gi, reason: "Frasa templat / tekanan jualan.", severity: "block" },
    { re: /jangan lepaskan peluang/gi, reason: "Tekanan jualan; berbunyi seperti spam.", severity: "block" },
    { re: /terletak (secara )?strategik|lokasi strategik/gi, reason: "Semua iklan kata begini. Nyatakan tempat atau masa perjalanan.", severity: "block" },
    { re: /\b(serba lengkap|tiada tandingan|terunggul|unik dan eksklusif)\b/gi, reason: "Penguat kosong. Gantikan dengan fakta.", severity: "warn" },
  ],
  zh: [
    { re: /梦想(家园|之家)/g, reason: "地产套话。直接说买家得到什么。", severity: "block" },
    { re: /奢华(生活|享受)/g, reason: "模板化用语，换成具体细节。", severity: "block" },
    { re: /品质生活/g, reason: "模板化用语，换成具体细节。", severity: "block" },
    { re: /黄金地段/g, reason: "人人都这么说。写出具体地点或车程。", severity: "block" },
    { re: /不容错过|错过不再/g, reason: "催促式话术，读起来像广告轰炸。", severity: "block" },
    { re: /尊贵|匠心|绝佳|坐落于|开启.{0,4}新篇章/g, reason: "空洞修饰，换成事实。", severity: "warn" },
  ],
};

const EMOJI = /\p{Extended_Pictographic}/gu;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FIELDS: LintFinding["field"][] = ["hook", "primary", "headline", "cta"];

/** Deterministic linter. Finding ids are stable so overrides survive re-linting. */
export function lintCopy(copy: PieceCopy, lang: Lang, avoid: string[] = []): LintFinding[] {
  const out: LintFinding[] = [];
  const seen = new Set<string>();
  const push = (f: Omit<LintFinding, "id">, rule: string) => {
    const id = `${f.field}:${rule}:${f.phrase.toLowerCase()}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, ...f });
  };

  // Language rules plus English rules for mixed-language copy.
  const rules = lang === "en" ? RULES.en : [...RULES[lang], ...RULES.en];
  const custom: Rule[] = avoid
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ re: new RegExp(escapeRe(p), "gi"), reason: "On this brand's avoid list.", severity: "block" as const }));

  for (const field of FIELDS) {
    const text = copy[field] ?? "";
    [...rules, ...custom].forEach((r, i) => {
      for (const m of text.matchAll(r.re)) push({ field, phrase: m[0], reason: r.reason, severity: r.severity }, `r${i}`);
    });
    const dashes = (text.match(/—/g) ?? []).length;
    if (dashes > 2) push({ field, phrase: "—".repeat(dashes), reason: `${dashes} em dashes. Heavy dash use is a common AI tell; use full stops.`, severity: "warn" }, "dash");
    const emoji = (text.match(EMOJI) ?? []).length;
    if (emoji > 3) push({ field, phrase: `${emoji} emoji`, reason: "Emoji-heavy copy reads as templated. Keep 0–3.", severity: "warn" }, "emoji");
    const bangs = (text.match(/[!！]/g) ?? []).length;
    if (bangs > 2) push({ field, phrase: "!".repeat(bangs), reason: "Too many exclamation marks.", severity: "warn" }, "bang");
  }
  return out;
}

/**
 * Re-lint and carry over override reasons and suggestions for findings that are still present.
 * AI-editor findings (id contains ":ai:") are kept while their phrase is still in the field.
 */
export function relint(copy: PieceCopy, lang: Lang, avoid: string[], previous: LintFinding[]): LintFinding[] {
  const prev = new Map(previous.map((f) => [f.id, f]));
  const fresh = lintCopy(copy, lang, avoid).map((f) => {
    const p = prev.get(f.id);
    return p ? { ...f, overrideReason: p.overrideReason, suggestion: p.suggestion } : f;
  });
  const ai = previous.filter((f) => f.id.includes(":ai:") && (copy[f.field] ?? "").toLowerCase().includes(f.phrase.toLowerCase()));
  return [...fresh, ...ai];
}

export function openBlocks(findings: LintFinding[]): LintFinding[] {
  return findings.filter((f) => f.severity === "block" && !f.overrideReason);
}

// ── Steps 3, 6, 8: the Polish gate (no stage can be skipped) ─────────

export function copyText(c: PieceCopy): string {
  return [c.hook, c.primary, c.headline, c.cta].join("\n");
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface GateInput {
  angleStatus: EngineAngle["status"] | undefined;
  piece: Pick<ContentPiece, "draft" | "copy" | "findings" | "signatureDetail" | "readConfirmedAt">;
  compliance: ComplianceResult[];
}

/** Returns the reasons a piece cannot be marked Polished. Empty array = it can. */
export function polishBlockers({ angleStatus, piece, compliance }: GateInput): string[] {
  const out: string[] = [];
  if (angleStatus !== "chosen" && angleStatus !== "used") out.push("Angle: this piece has no chosen angle.");
  if (!piece.draft) out.push("Draft: no draft yet.");
  else if (!piece.readConfirmedAt) out.push("Draft: read the draft once in full before polishing.");
  const open = openBlocks(piece.findings);
  if (open.length) out.push(`Polish: ${open.length} generic phrase${open.length > 1 ? "s" : ""} still flagged — fix or override with a reason.`);
  const detail = norm(piece.signatureDetail);
  if (!detail) out.push("Polish: add one real, specific detail only you would know.");
  else if (!norm(copyText(piece.copy)).includes(detail)) out.push("Polish: the real detail must appear in the copy itself.");
  if (!piece.copy.hook.trim() || !piece.copy.primary.trim()) out.push("Copy: hook and primary text are required.");
  const blocks = compliance.filter((r) => r.level === "block");
  if (blocks.length) out.push(`Compliance: ${blocks.length} blocking rule${blocks.length > 1 ? "s" : ""} (${[...new Set(blocks.map((b) => b.rule))].join(", ")}).`);
  return out;
}

/**
 * Links every claim whose numbers appear in the copy, so the compliance gate's R8 warns the reviewer
 * when a piece leans on an unverified figure (e.g. "128 eateries") even if the angle cited no claims.
 */
export function linkClaims(copy: PieceCopy, claims: Pick<Claim, "id" | "statement">[], existing: string[] = []): string[] {
  const numbers = new Set(copyText(copy).match(/\d+(?:[.,]\d+)?/g) ?? []);
  const ids = new Set(existing);
  for (const c of claims) if ((c.statement.match(/\d+(?:[.,]\d+)?/g) ?? []).some((n) => numbers.has(n))) ids.add(c.id);
  return [...ids];
}

// ── Hand-off: a polished piece becomes a campaign asset ──────────────

const FORMAT_CODE: Record<ContentPiece["format"], string> = { post: "pst", carousel: "car" };

export function pieceToAsset(piece: ContentPiece, angle: EngineAngle, project: Project, endCard: string): CreativeAsset {
  return {
    id: piece.assetId ?? `eng-${angle.code}-${piece.lang}-${FORMAT_CODE[piece.format]}-${piece.id.slice(0, 6)}`,
    projectId: project.id,
    angleId: angle.parentAngleId,
    personaId: angle.personaId,
    format: piece.format,
    lang: piece.lang,
    platforms: [piece.platform],
    sceneIds: [],
    variants: [{ key: "A", ...piece.copy, claimIds: piece.claimIds, model: piece.model, promptVersion: piece.promptVersion }],
    endCard,
    rendersUsed: true, // project visuals are artist's impressions until real photography exists
    status: "draft",
    compliance: [],
    engine: {
      pieceId: piece.id,
      angleId: angle.id,
      angleCode: angle.code,
      angle: angle.sentence,
      scheduledFor: piece.scheduledFor,
      signatureDetail: piece.signatureDetail,
    },
  };
}

// ── Step 7: Repeat — weeks, slots, streak, calendar block ────────────

const MYT = 8 * 3600000;
const DAY = 86400000;

/** Monday of the MYT week containing `d`, as YYYY-MM-DD. */
export function weekOf(d: Date): string {
  const local = new Date(d.getTime() + MYT);
  const dow = (local.getUTCDay() + 6) % 7; // Mon=0
  const monday = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow));
  return monday.toISOString().slice(0, 10);
}

/** Posting windows tuned for Malaysian mobile usage (same as the launch calendar). */
export const POST_TIMES = ["12:30", "20:30"];

/** Open posting slots (ISO, UTC) across next Monday–Sunday in MYT, excluding taken ones. */
export function nextWeekSlots(now: Date, taken: string[] = [], times = POST_TIMES): string[] {
  const [y, m, d] = weekOf(now).split("-").map(Number);
  const out: string[] = [];
  const busy = new Set(taken);
  for (let day = 7; day < 14; day++) {
    for (const t of times) {
      const [hh, mm] = t.split(":").map(Number);
      const iso = new Date(Date.UTC(y, m - 1, d + day, hh, mm) - MYT).toISOString();
      if (!busy.has(iso)) out.push(iso);
    }
  }
  return out;
}

/** Consecutive weeks with at least one submitted piece, counting back from this week (or last week if this week is still empty). */
export function streak(submittedWeeks: string[], now: Date): number {
  const weeks = new Set(submittedWeeks);
  let cursor = new Date(`${weekOf(now)}T00:00:00Z`).getTime();
  if (!weeks.has(new Date(cursor).toISOString().slice(0, 10))) cursor -= 7 * DAY;
  let n = 0;
  while (weeks.has(new Date(cursor).toISOString().slice(0, 10))) {
    n++;
    cursor -= 7 * DAY;
  }
  return n;
}

function icsStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Recurring weekly calendar block for the Content Engine session. MYT has no DST, so UTC is exact. */
export function sessionIcs(session: VoiceProfile["session"], now: Date, projectName: string, url = ""): string {
  const [hh, mm] = session.time.split(":").map(Number);
  const local = new Date(now.getTime() + MYT);
  let add = (session.weekday - local.getUTCDay() + 7) % 7;
  const at = (days: number) => Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, hh, mm) - MYT;
  if (at(add) <= now.getTime()) add += 7;
  const start = at(add);
  const end = start + 60 * 60000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropVid//Content Engine//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:content-engine-${start}@propvid`,
    `DTSTAMP:${icsStamp(now.getTime())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    "RRULE:FREQ=WEEKLY",
    `SUMMARY:Content Engine session — ${projectName}`,
    `DESCRIPTION:Angle → Draft → Polish → Repeat. Target ${session.target} pieces.${url ? ` ${url}` : ""}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Content Engine session in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// ── Step 9: scorecard ────────────────────────────────────────────────

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const mins = (a?: string, b?: string) => (a && b ? Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 60000) : null);

export interface Scorecard {
  created: number;
  polished: number;
  submitted: number;
  medianDraftMin: number | null;
  medianPolishMin: number | null;
  medianTotalMin: number | null;
  findingsPerPiece: number | null;
  overrideRate: number | null;
}

export function scorecard(pieces: ContentPiece[]): Scorecard {
  const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
  const done = pieces.filter((p) => p.timings.polishedAt);
  const findings = pieces.flatMap((p) => p.findings);
  const blocks = findings.filter((f) => f.severity === "block");
  return {
    created: pieces.length,
    polished: done.length,
    submitted: pieces.filter((p) => p.status === "submitted").length,
    medianDraftMin: median(nums(pieces.map((p) => mins(p.timings.createdAt, p.timings.draftedAt)))),
    medianPolishMin: median(nums(done.map((p) => mins(p.timings.draftedAt, p.timings.polishedAt)))),
    medianTotalMin: median(nums(done.map((p) => mins(p.timings.createdAt, p.timings.polishedAt)))),
    findingsPerPiece: pieces.length ? findings.length / pieces.length : null,
    overrideRate: blocks.length ? blocks.filter((f) => f.overrideReason).length / blocks.length : null,
  };
}

// ── The guide's copy-and-paste prompts, filled in (AI calls + no-key fallback) ──

const LANG_NAME: Record<Lang, string> = { en: "English", bm: "Bahasa Malaysia", zh: "Simplified Chinese" };
const PLATFORM_NAME: Record<Platform, string> = { meta: "Facebook/Instagram", tiktok: "TikTok", xhs: "Xiaohongshu", youtube: "YouTube", google: "Google" };

export function anglePrompt(p: VoiceProfile, problems: string[]): string {
  return [
    `My business is: ${p.business}. My audience is: ${p.audience}.`,
    `My audience deals with these problems:`,
    ...problems.map((x, i) => `${i + 1}. ${x}`),
    `Help me pick the single most specific and compelling angle from this list. Write up to 3 candidate angles, each ONE sentence of at most 25 words, specific enough that it could not apply to any other business, and explain briefly why each stands out. Put the strongest first.`,
  ].join("\n");
}

export function draftPrompt(
  p: VoiceProfile,
  angle: string,
  opts: { lang: Lang; platform: Platform; format: ContentPiece["format"]; facts: string[] },
): string {
  return [
    `My angle is: ${angle}`,
    `My business is ${p.business}, my audience is ${p.audience}, and my tone is ${p.tone.join(", ")}.`,
    `Write a full ${PLATFORM_NAME[opts.platform]} ${opts.format === "carousel" ? "carousel caption" : "post"} based on this angle, natively in ${LANG_NAME[opts.lang]} (not translated).`,
    `Use only these facts; do not invent numbers, prices, returns or dates:`,
    ...opts.facts.map((f) => `- ${f}`),
    `Give me: a hook (≤ 90 characters), the post text (≤ 400 characters), a headline (≤ 40 characters) and a call to action.`,
  ].join("\n");
}

export function polishPrompt(copy: PieceCopy): string {
  return [
    `Here's a draft post:`,
    copyText(copy),
    ``,
    `Point out any phrases that sound generic or AI-written, and suggest more natural, conversational alternatives while keeping the core message the same.`,
  ].join("\n");
}
