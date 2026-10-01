# PRD — Weekly Content Engine (Angle → Draft → Polish → Repeat)

**Product:** PropVid Campaign Engine — new module
**Status:** Draft for decision · v0.1 · 28 Sep 2026
**Owner:** Deric (product) · Build: Claude Code
**Source framework:** Daniel Chou, "Replace your marketing team" 9-step thread (Steps 1–9). Step 9 was only partly visible; its intent is inferred below.
**Gate:** No build starts until the MVP scope in §9 and the decisions in §12 are signed off.

---

## 1. Summary

The current app turns **one** property film into a **one-off** 30-day paid campaign (48 assets, approval queue, launch kit, leads → SPA). It has no answer to what happens in week 5, and no workflow for the organic posts that keep a project or agency page alive between launches.

This module adds a **weekly content loop** that runs the four marketing-team jobs in a fixed order, every week, by one operator with Claude:

| Team job | Engine stage | What the operator does | What the system does |
|---|---|---|---|
| Strategy | **Angle** | Picks one angle | Turns audience problems into ranked, specific one-sentence angles |
| Copy | **Draft** | Reads the draft once | Writes the post from angle + brand voice + verified claims only |
| Editing | **Polish** | Fixes flagged lines, adds one real detail | Flags generic/AI-sounding phrases, runs the compliance gate |
| Consistency | **Repeat** | Sits one fixed session a week | Batches 3–5 pieces, fills next week's slots, tracks the streak |

**Outcome (the campaign input):** every approved piece leaves the engine as a campaign-ready `CreativeAsset` in the existing approval queue, calendar and launch kit — with angle, persona, language, platform, copy, claim links, compliance result and UTM naming already attached. Marketing campaigns consume it; nothing downstream needs to change.

## 2. Problem

From the framework, and confirmed by the current build:

1. **Four jobs, no system.** Small teams (and TKB project marketing between launches) hand all four jobs to one person with no fixed order. Output is scattered or stops.
2. **Angle is skipped.** People ask AI for "a post about Urban Forest" and get generic copy. The app today has four hard-coded angles for launch; there is no way to create new ones from what buyers are actually asking.
3. **Polish is skipped.** Raw AI drafts read as robotic and hurt trust. The compliance gate catches *illegal* copy, not *generic* copy.
4. **Repeat is optional.** Nothing schedules the next session, so the engine runs once and quietly stops.
5. **No proof it pays.** Nobody records the "before" cost (hours / RM per month), so the engine cannot be compared against the team or agency it replaces.

## 3. Framework → product mapping

| Step | Guide says | Feature | Reuses |
|---|---|---|---|
| 1 | Write down current spend; name weakest and slowest job | **Baseline capture** in onboarding | — |
| 2 | Pick one offer; write its clearest sentence (< 5 min) | **Offer line** on the brand profile | `Project` |
| 3 | Fix the order: Angle, Draft, Polish, Repeat | **Stage-locked workflow** — a piece cannot skip a stage | Approval-gate pattern (D17) |
| 4 | List 3 problems → pick most urgent → one specific sentence | **Angle Bank** with specificity check | `Persona.pains/objections`, lead notes |
| 5 | Angle + business + audience + 3–5 tone words → full draft | **Draft** with Claude, brand-voice context | `lib/ai/copywriter.ts` pattern |
| 6 | Read aloud, circle generic lines, rewrite, add one real detail | **Polish gate**: generic-phrase linter + mandatory "only-we-know" detail | Compliance gate |
| 7 | One fixed weekly block, 3–5 pieces, schedule next week | **Weekly Session** + slot fill + streak | `calendar30` slots, `Slot` |
| 8 | Audit: did you skip Angle or Polish? | **Skip guardrails** + weekly self-audit card | Audit log |
| 9 | Measure engine output vs. before *(inferred)* | **Engine scorecard**: time/piece, pieces/week, leads per angle, cost vs. baseline | `lib/engine/metrics.ts`, UTMs |

Every "Copy & Paste Prompt" in the guide becomes a system prompt behind a button. When no API key is set, the same prompts are shown pre-filled for the operator to paste into Claude by hand — the engine still works, just slower.

## 4. Goals and success metrics

| # | Goal | Metric | MVP target (4-week pilot) |
|---|---|---|---|
| G1 | Consistency | Weeks with ≥ 3 approved pieces | 4 of 4 weeks |
| G2 | Speed | Median minutes from Angle chosen → piece Polished | ≤ 20 min |
| G3 | Quality | Pieces approved by reviewer without a rewrite request | ≥ 70% |
| G4 | Safety | Approved pieces with a compliance block or unsourced number | 0 (hard) |
| G5 | Business | Leads and gallery appointments attributed to engine angles (UTM) | Reported weekly; target set after baseline |
| G6 | Cost | Engine hours × rate vs. Step 1 baseline | Reported at week 4 |

Views and likes are diagnostics only, consistent with the campaign brief.

## 5. Users

| User | Needs |
|---|---|
| **Operator** (Deric / TKB marketing exec) | Run a 45–60 min weekly session, leave with next week's posts done |
| **Reviewer** (TKB marketing lead / Legal for risky claims) | Approve or return pieces in the existing queue |
| **Leadership** (Dato' Lee) | One number per week: pieces out, leads and appointments by angle |

## 6. Core flow — the weekly session

```
Open session (fixed day/time, e.g. Mon 9:00)
  └─ 1. ANGLE   Pull 3 problems (personas, recent lead questions, operator input)
                → Claude ranks, writes one-sentence angles → specificity check → pick 1
  └─ 2. DRAFT   Angle + voice profile + verified claims + platform/lang/format → draft
                → operator must open "read in full" before editing is enabled
  └─ 3. POLISH  Linter flags generic phrases (+ Claude suggestions)
                → operator resolves each flag, adds one real detail
                → compliance gate runs → "Polished"
  └─ repeat 1–3 until 3–5 pieces
  └─ 4. REPEAT  Pieces auto-fill next week's open slots → submitted to approval queue
                → next session booked (.ics) → streak updated
Close session → scorecard shows time per stage
```

## 7. Functional requirements

Priority: **P0** = MVP, **P1** = next, **P2** = later.

### 7.1 Brand profile and baseline (Steps 1–2)
- **FR-1 (P0)** Per project: business line, audience, 3–5 tone words, offer line (one sentence), phrases to avoid, 3+ "signature details" (real names, numbers, moments only we know). Seeded for Urban Forest from existing personas and verified claims.
- **FR-2 (P0)** Baseline: current monthly content hours and RM spend, weakest job, slowest job. Stored once; editable.
- **FR-3 (P1)** Claude suggests the offer line from the brief (Step 2 prompt).

### 7.2 Angle Bank (Step 4)
- **FR-4 (P0)** Operator enters or selects 2–3 audience problems. Sources offered: persona pains/objections; free text. **(P1)** questions mined from lead notes and WhatsApp replies.
- **FR-5 (P0)** Claude returns up to 3 candidate angles, each: one sentence (≤ 25 words), target persona, rationale (≤ 2 lines), claim IDs it relies on.
- **FR-6 (P0)** **Specificity check** (deterministic, unit-tested): rejects angles that are topics not claims (e.g. starts with "Tips for", "Why you should", "Everything about"), lack a concrete noun/number/place/persona, or exceed length. Rejected angles show why.
- **FR-7 (P0)** Angle states: `proposed → chosen → used`. Used angles stay in the bank with their results so good ones can be re-run in another language or format.

### 7.3 Draft (Step 5)
- **FR-8 (P0)** Generate one draft per piece from: angle, voice profile, persona, language (EN/BM/中文, written natively), platform, format, and **verified claims only** (same exclusions as the current Copywriter).
- **FR-9 (P0)** MVP formats: `post` (single image + caption) and `carousel` caption. Reel script is P1.
- **FR-10 (P0)** Draft records model, prompt version, and seconds taken (AI provenance, as today).
- **FR-11 (P0)** No-key fallback: show the Step 5 prompt pre-filled; operator pastes the result back.

### 7.4 Polish gate (Steps 6 and 8)
- **FR-12 (P0)** **Generic-phrase linter** (deterministic, per language): cliché list (e.g. "nestled", "elevate your lifestyle", "dream home", "look no further", "unlock", "in today's fast-paced world", "whether you're… or…"), stacked adjectives, superlatives, over-used em dashes, emoji density. Each finding: phrase, reason, severity.
- **FR-13 (P0)** Claude "editor" pass (Step 6 prompt) adds suggested rewrites for each flagged line, keeping the core message.
- **FR-14 (P0)** Piece cannot leave Polish until: every `block` finding is fixed or overridden with a reason; **one signature detail** is present (picked from profile or typed); existing compliance gate passes.
- **FR-15 (P0)** Before/after diff is kept on the piece for reviewer context.
- **FR-16 (P1)** "Read aloud" — browser text-to-speech of the draft.

### 7.5 Repeat (Step 7)
- **FR-17 (P0)** Session settings: fixed weekday + time, target pieces (3–5). Download `.ics` for a recurring calendar block.
- **FR-18 (P0)** Polished pieces auto-fill next week's open slots (default 12:30 / 20:30 MYT, the current calendar windows); operator can drag to re-order.
- **FR-19 (P0)** Streak and missed-week banner on the dashboard. **(P1)** WhatsApp/email reminder 1 hour before the session.

### 7.6 Hand-off to marketing campaigns (the outcome)
- **FR-20 (P0)** On "Submit", each piece is written as a `CreativeAsset` with `source: "engine"` into the existing approval queue. The compliance gate and DB-level approval trigger apply unchanged.
- **FR-21 (P0)** Approved pieces appear in the calendar and the launch-kit export (CSV + manifest), named with the existing convention and UTMs so leads attribute back to the engine angle. Two code changes are required: `adName`/`landingUrl` in `lib/engine/naming.ts` currently resolve only the four hard-coded launch angles (and would throw on an engine angle), and `/lp/[angle]` has only four pages. MVP: each engine angle maps to a **parent landing page** (one of the four), with its own angle code in `utm_campaign`/`utm_content`, and `utm_medium=organic_social` for unpaid posts.
- **FR-22 (P1)** An engine angle that wins (top leads per RM) can be promoted to a full paid-campaign angle, which spawns the 4-format × 3-language asset set.

### 7.7 Scorecard (Step 9)
- **FR-23 (P0)** Weekly card: pieces approved, median minutes per stage, polish findings per piece (trend down = voice is being learned), streak.
- **FR-24 (P0)** Leads, appointments and SPA by engine angle, via existing UTM capture and `metrics.ts`.
- **FR-25 (P1)** Cost comparison vs. Step 1 baseline on the leadership one-pager.

## 8. Outcome contract — what marketing campaigns receive

Each approved piece carries:

| Field | Example |
|---|---|
| `angle` | "Ipoh families drive 20 minutes for dinner; Urban Forest puts 128 eateries at the doorstep." |
| `persona` | Local family |
| `platform · format · lang` | Meta · post · 中文 |
| `hook · primary · headline · cta` | Final polished copy |
| `signatureDetail` | The real detail added in Polish |
| `claimIds` | Links to verified claims and sources |
| `compliance` | Ruleset version, pass/warn results |
| `endCard` | Project, developer, *Artist's impression*, licence + APDL |
| `slot` | Scheduled date/time (MYT) |
| `adName · utm` | `project_angle_persona_format_lang_variant` (existing convention), UTMs baked in |
| `provenance` | Model, prompt versions, minutes per stage, author, reviewer |

This is the same shape the approval queue, launch kit and lead attribution already use, so the engine feeds campaigns without new integration work.

### New data (mirrors to Supabase later)
- `VoiceProfile` — FR-1/FR-2 fields, one per project.
- `AngleCandidate` — problems, sentence, persona, claimIds, specificity result, status, weekOf.
- `ContentPiece` — angleId, platform, lang, format, draft, lintFindings[], signatureDetail, final copy, compliance, status (`draft → polished → submitted`), stage timings, provenance, assetId once submitted.
- `EngineSession` — weekOf, start/end, pieceIds.
- `CreativeAsset` gains `source: "launch" | "engine"` and format `post`; engine angles carry `parentAngleId` (for the landing page) and their own `code`.

## 9. MVP scope — recommendation

**Principle:** prove the loop runs **four weeks in a row** on one real project before adding channels, automation or clients.

### In (P0) — ~2 sprints / 10 working days

| Sprint | Deliverable |
|---|---|
| **S1 — Angle + Draft** (days 1–5) | Types + JSON store seams · Brand profile & baseline screen (seeded for Urban Forest) · Angle Bank with Claude ranking + deterministic specificity check · Draft for `post` and `carousel`, EN/BM/中文 · No-key prompt fallback · Unit tests for specificity check |
| **S2 — Polish + Repeat + Hand-off** (days 6–10) | Generic-phrase linter (EN/BM/中文) + Claude suggestions · Polish gate (findings, signature detail, compliance) · Weekly session view with timers · Slot fill + `.ics` · Submit → approval queue as `CreativeAsset` · Calendar + launch-kit include engine pieces · Scorecard card · Unit tests for linter and gate |

### Out of MVP (and why)

| Deferred | Why |
|---|---|
| Auto-publishing to Meta/TikTok/XHS | Existing non-goal; housing ads need human launch |
| Image / video generation | Operator uses existing renders; avoids new compliance surface |
| Reel scripts, XHS notes, email/newsletter | Add after `post` proves the loop |
| Mining angles from WhatsApp / lead notes | Needs the P1 WhatsApp integration |
| Supabase migration, multi-user auth, client portal | JSON store is enough for one operator (D10); do it once the loop is proven |
| Reminders by WhatsApp/email | `.ics` covers the need for one operator |
| Paid-campaign promotion of winning angles (FR-22) | Needs 2–4 weeks of engine data first |

### MVP acceptance criteria
1. Given a seeded brand profile, the operator produces **3 approved-ready pieces in ≤ 60 minutes** in one session, including in 中文 and BM.
2. A piece **cannot** reach the approval queue without a chosen angle, a completed Polish (no open `block` findings, one signature detail) and a compliance pass — verified by unit tests and in the UI.
3. No submitted piece contains a price, return figure or number not traceable to a verified claim (existing rules R3–R5).
4. Approved pieces appear in next week's calendar and in the Meta launch-kit CSV with correct naming and UTMs.
5. The scorecard shows minutes per stage and pieces per week for the session just completed.
6. With no API key, the full flow still completes using the copy-and-paste prompts.

## 10. Non-functional requirements
- **Compliance first:** organic posts about a development are still advertising under Malaysian housing rules — licence/APDL end card and *Artist's impression* labels apply to every piece. No AI output bypasses the gate.
- **PDPA:** no personal data in prompts; lead questions are anonymised before any P1 mining.
- **Language:** BM and 中文 written natively, not translated; linter lists maintained per language.
- **Cost:** ≤ 6 Claude calls per piece (angles, draft, polish suggestions, one retry). Estimate and cap per session in Settings.
- **Traceability:** every stage change goes to the append-only audit log.
- **Design:** existing dark/gold design system.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Operator skips the session (Step 8, mistake 3) | Fixed slot, `.ics`, streak, visible missed-week banner to leadership |
| Linter too strict → operator overrides everything | Overrides need a reason; track override rate; tune lists weekly |
| Posts still sound generic in BM/中文 | Native-language lists; signature detail is mandatory; reviewer feedback feeds avoid-list |
| Blocked inputs (licence, APDL) stop all output | Same blocker as today — see `MISSING_INPUTS.md` #2–4 |
| Engine output competes with launch ads for the same slots | Engine uses organic slots by default; paid calendar stays separate |

## 12. Decisions needed before build

| # | Decision | Recommendation |
|---|---|---|
| Q1 | **Which brand runs the pilot?** Urban Forest (TKB project page) or Compass.RealEstate (agency page)? | **Urban Forest** — claims, personas and compliance data already exist; Compass as second profile in week 3 |
| Q2 | Organic only, or also paid? | **Organic first**; winning angles promoted to paid in P1 (FR-22) |
| Q3 | Weekly session day/time and pieces per week | Mon 9:00 MYT, 3 pieces (raise to 5 after week 2) |
| Q4 | Reviewer for engine pieces | TKB marketing lead; Legal only when a piece cites a `high_risk` or `conflict` claim |
| Q5 | Step 1 baseline figures (hours, RM/month, current CPL) | Needed for G6; same item as `MISSING_INPUTS.md` #14 |
| Q6 | Languages for pilot | All three; 中文 and BM at minimum one piece each per week |

---

*Next step on sign-off: build S1 on this branch, then S2; update `PLAN.md` and `DECISIONS.md` as defaults are taken.*
