import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAsset, isBlocked } from "../lib/engine/compliance.ts";
import {
  angleCodeFrom,
  checkAngle,
  linkClaims,
  lintCopy,
  nextWeekSlots,
  openBlocks,
  pieceToAsset,
  polishBlockers,
  relint,
  scorecard,
  sessionIcs,
  streak,
  weekOf,
} from "../lib/engine/content.ts";
import type { Claim, ContentPiece, EngineAngle, PieceCopy, Project } from "../lib/types.ts";

const anchors = { anchors: ["ipoh", "families", "investors", "怡保", "家庭"] };

// ── Angle specificity (Step 4) ──

test("topics are rejected; specific one-sentence angles pass", () => {
  assert.equal(checkAngle("Tips for marketing", anchors).ok, false);
  assert.equal(checkAngle("Everything about Urban Forest and its many great features", anchors).ok, false);
  assert.equal(checkAngle("How to choose a home in Ipoh for your family", anchors).ok, false);
  const good = checkAngle("Ipoh families drive across town for dinner; Urban Forest puts 128 eateries in one place.", anchors);
  assert.deepEqual(good.reasons, []);
  assert.ok(good.ok);
});

test("an angle needs something concrete and must be one sentence", () => {
  const vague = checkAngle("Life feels better when everything you love is close to home", anchors);
  assert.ok(vague.reasons.some((r) => r.includes("Nothing concrete")));
  const two = checkAngle("Ipoh families want more. Urban Forest gives it to them every night.", anchors);
  assert.ok(two.reasons.some((r) => r.includes("More than one sentence")));
  assert.ok(checkAngle("Ipoh investors ask about 5.5 things before buying anything new", anchors).reasons.every((r) => !r.includes("sentence")));
});

test("vague praise and overlong angles are flagged; Chinese angles are measured in characters", () => {
  assert.ok(checkAngle("The best new place for Ipoh families to spend a weekend night out", anchors).reasons.some((r) => r.includes("vague praise")));
  const long = "Ipoh families " + "really ".repeat(30) + "want dinner nearby";
  assert.ok(checkAngle(long, anchors).reasons.some((r) => r.includes("Too long")));
  assert.ok(checkAngle("怡保家庭周末晚餐不必再开车穿过整个城市", anchors).ok);
  assert.equal(checkAngle("关于怡保的一切", anchors).ok, false);
});

test("angle codes are short, prefixed and unique", () => {
  assert.equal(angleCodeFrom("Ipoh families drive across town", []), "e-ipohfamilies");
  assert.equal(angleCodeFrom("Ipoh families drive across town", ["e-ipohfamilies"]), "e-ipohfamilies1");
  assert.equal(angleCodeFrom("怡保家庭", []), "e1");
  assert.equal(angleCodeFrom("怡保家庭", ["e1"]), "e2");
});

// ── Generic-phrase linter (Step 6) ──

const copy = (over: Partial<PieceCopy> = {}): PieceCopy => ({ hook: "Dinner without the drive.", primary: "128 eateries in one place in Ipoh.", headline: "Dinner, closer", cta: "Register", ...over });

test("AI tells are blocked; clean copy has no findings", () => {
  assert.deepEqual(lintCopy(copy(), "en"), []);
  const f = lintCopy(copy({ primary: "Nestled in the heart of Ipoh, elevate your lifestyle in your dream home." }), "en");
  const phrases = f.map((x) => x.phrase.toLowerCase());
  for (const p of ["nestled", "in the heart of", "elevate", "dream home"]) assert.ok(phrases.includes(p), p);
  assert.ok(f.every((x) => x.severity === "block"));
});

test("template constructions, dash and emoji overuse are caught", () => {
  const f = lintCopy(copy({ primary: "It's not just a mall, it's a destination — food — lights — music 🎉🎉🎉🎉", hook: "Whether you're young or old" }), "en");
  assert.ok(f.some((x) => x.phrase.toLowerCase().startsWith("not just a mall")));
  assert.ok(f.some((x) => x.id.includes(":dash:")));
  assert.ok(f.some((x) => x.id.includes(":emoji:")));
  assert.ok(f.some((x) => x.field === "hook" && x.phrase.toLowerCase() === "whether you're"));
});

test("BM and Chinese clichés are caught, plus the brand avoid list", () => {
  assert.ok(openBlocks(lintCopy(copy({ primary: "Rumah idaman anda di lokasi strategik." }), "bm")).length >= 2);
  assert.ok(openBlocks(lintCopy(copy({ primary: "打造您的梦想家园，尽享品质生活，不容错过！" }), "zh")).length >= 3);
  const custom = lintCopy(copy({ primary: "A true landmark for Ipoh." }), "en", ["landmark"]);
  assert.equal(custom.length, 1);
  assert.equal(custom[0].reason, "On this brand's avoid list.");
});

test("re-linting keeps overrides and AI notes that still apply", () => {
  const c = copy({ primary: "Nestled beside the river in Ipoh." });
  const first = lintCopy(c, "en");
  first[0].overrideReason = "The site really is beside the river";
  const ai = { id: "primary:ai:beside the river", field: "primary" as const, phrase: "beside the river", reason: "AI", severity: "warn" as const };
  const again = relint(c, "en", [], [...first, ai]);
  assert.equal(again[0].overrideReason, "The site really is beside the river");
  assert.ok(again.some((f) => f.id === ai.id));
  assert.equal(openBlocks(again).length, 0);
  // Once the phrase is edited out, both disappear.
  assert.deepEqual(relint(copy(), "en", [], again), []);
});

// ── Polish gate + hand-off ──

const claims: Claim[] = [
  { id: "c-128", field: "f&b", statement: "128 eateries curated without duplication", sources: [{ doc: "video", locator: "2:52" }], status: "unverified" },
  { id: "c-dev", field: "developer", statement: "Developed by TKB", sources: [{ doc: "prd", locator: "§2" }], status: "verified" },
];
const project: Project = {
  id: "p", slug: "urban-forest", name: "Urban Forest", developer: "TKB", city: "Ipoh", videoUrl: "", videoDurationSec: 207,
  whatsappNumber: null, privacyUrl: "https://example.com/privacy",
  permit: { developerLicence: "LIC-TEST", advertisingPermit: "APDL-TEST", validity: null, approvingAuthority: null },
  priceList: [],
};
const ctx = (p = project) => ({ project: p, claims, artistImpressionLabels: ["Artist's impression"] });

const angle: EngineAngle = {
  id: "ang1", code: "e-ipohfamilies", sentence: "Ipoh families drive across town for dinner.", problems: [], personaId: "family", parentAngleId: "food",
  claimIds: ["c-128"], rationale: "", specificity: { ok: true, reasons: [] }, status: "chosen", createdAt: "2026-09-28T01:00:00.000Z", weekOf: "2026-09-28",
};

function piece(over: Partial<ContentPiece> = {}): ContentPiece {
  const c = copy({ primary: "128 eateries in one place in Ipoh. Developed by TKB." });
  return {
    id: "piece-abcdef-123", angleId: "ang1", lang: "en", platform: "meta", format: "post", draft: c, copy: c, claimIds: ["c-128", "c-dev"],
    findings: [], signatureDetail: "Developed by TKB", readConfirmedAt: "2026-09-28T01:05:00.000Z", status: "draft",
    timings: { createdAt: "2026-09-28T01:00:00.000Z", draftedAt: "2026-09-28T01:04:00.000Z" }, promptVersion: "engine-v1", ...over,
  };
}

const endCardText = "Urban Forest · TKB · Artist's impression · Developer licence: LIC-TEST";
const complianceFor = (p: ContentPiece, pr = project) => checkAsset(pieceToAsset(p, angle, pr, endCardText), ctx(pr));

test("a complete piece passes the Polish gate", () => {
  const p = piece();
  assert.deepEqual(polishBlockers({ angleStatus: "chosen", piece: p, compliance: complianceFor(p) }), []);
});

test("no stage can be skipped: angle, draft, read, flags, real detail, compliance", () => {
  const ok = piece();
  const reasons = (p: ContentPiece, angleStatus: EngineAngle["status"] = "chosen", pr = project) => polishBlockers({ angleStatus, piece: p, compliance: complianceFor(p, pr) }).join(" | ");
  assert.match(reasons(ok, "proposed"), /Angle/);
  assert.match(reasons(piece({ draft: null })), /no draft/);
  assert.match(reasons(piece({ readConfirmedAt: undefined })), /read the draft/);
  const flagged = copy({ primary: "Nestled in Ipoh. Developed by TKB." });
  assert.match(reasons(piece({ copy: flagged, findings: lintCopy(flagged, "en") })), /generic phrase/);
  assert.match(reasons(piece({ signatureDetail: "" })), /real, specific detail/);
  assert.match(reasons(piece({ signatureDetail: "Our site manager Aina" })), /must appear in the copy/);
  assert.match(reasons(ok, "chosen", { ...project, permit: { ...project.permit, advertisingPermit: null } }), /Compliance/);
});

test("an unsourced number in the real detail is blocked by compliance (R5)", () => {
  const c = copy({ primary: "128 eateries in one place in Ipoh. 40 minutes from KL." });
  const p = piece({ copy: c, draft: c, signatureDetail: "40 minutes from KL" });
  assert.ok(isBlocked(complianceFor(p)));
});

test("hand-off: a polished piece becomes a campaign asset on the parent landing page", () => {
  const p = piece({ scheduledFor: "2026-10-05T04:30:00.000Z" });
  const a = pieceToAsset(p, angle, project, endCardText);
  assert.equal(a.angleId, "food");
  assert.equal(a.format, "post");
  assert.deepEqual(a.platforms, ["meta"]);
  assert.equal(a.variants.length, 1);
  assert.equal(a.variants[0].hook, p.copy.hook);
  assert.equal(a.engine?.angleCode, "e-ipohfamilies");
  assert.equal(a.engine?.scheduledFor, "2026-10-05T04:30:00.000Z");
  assert.equal(a.id, "eng-e-ipohfamilies-en-pst-piece-");
  assert.equal(a.status, "draft");
});

// ── Repeat (Step 7) and scorecard (Step 9) ──

test("weeks start on Monday in Malaysia time", () => {
  // Sunday 23:30 MYT is still the previous week; Monday 00:30 MYT is the new one.
  assert.equal(weekOf(new Date("2026-10-04T15:30:00Z")), "2026-09-28");
  assert.equal(weekOf(new Date("2026-10-04T16:30:00Z")), "2026-10-05");
});

test("next week's slots are 12:30 and 20:30 MYT, Monday to Sunday, skipping taken ones", () => {
  const now = new Date("2026-09-30T02:00:00Z"); // Wed 10:00 MYT
  const slots = nextWeekSlots(now);
  assert.equal(slots.length, 14);
  assert.equal(slots[0], "2026-10-05T04:30:00.000Z"); // Mon 12:30 MYT
  assert.equal(slots[1], "2026-10-05T12:30:00.000Z"); // Mon 20:30 MYT
  assert.equal(slots[13], "2026-10-11T12:30:00.000Z"); // Sun 20:30 MYT
  assert.equal(nextWeekSlots(now, [slots[0]])[0], slots[1]);
});

test("streak counts consecutive weeks with output", () => {
  const now = new Date("2026-09-30T02:00:00Z");
  assert.equal(streak([], now), 0);
  assert.equal(streak(["2026-09-28", "2026-09-21", "2026-09-14"], now), 3);
  assert.equal(streak(["2026-09-21", "2026-09-14"], now), 2); // this week not done yet
  assert.equal(streak(["2026-09-28", "2026-09-14"], now), 1);
});

test("the session invite recurs weekly at the chosen MYT time", () => {
  const ics = sessionIcs({ weekday: 1, time: "09:00", target: 3 }, new Date("2026-09-30T02:00:00Z"), "Urban Forest");
  assert.match(ics, /DTSTART:20261005T010000Z/); // next Monday 09:00 MYT
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.ok(ics.includes("\r\n"));
});

test("scorecard reports minutes per stage", () => {
  const done = piece({ status: "submitted", timings: { createdAt: "2026-09-28T01:00:00Z", draftedAt: "2026-09-28T01:04:00Z", polishedAt: "2026-09-28T01:16:00Z", submittedAt: "2026-09-28T01:20:00Z" } });
  const card = scorecard([done, piece({ timings: { createdAt: "2026-09-28T01:00:00Z" }, draft: null })]);
  assert.equal(card.created, 2);
  assert.equal(card.submitted, 1);
  assert.equal(card.medianDraftMin, 4);
  assert.equal(card.medianPolishMin, 12);
  assert.equal(card.medianTotalMin, 16);
});

test("claims are linked from the numbers in the copy so the reviewer sees unverified figures", () => {
  const c = copy({ primary: "128 eateries in one place in Ipoh." });
  assert.deepEqual(linkClaims(c, claims), ["c-128"]);
  assert.deepEqual(linkClaims(copy({ primary: "Dinner nearby." }), claims, ["c-dev"]), ["c-dev"]);
  const p = piece({ copy: c, claimIds: linkClaims(c, claims) });
  assert.ok(complianceFor(p).some((r) => r.rule === "R8 claim source" && r.level === "warn"));
});
