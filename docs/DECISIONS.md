# DECISIONS

Defaults chosen without blocking the build (PRD §0.5). Each can be reversed.

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D1 | User's "proceed" treated as approval to build past the PRD's plan-first gate. | Explicit instruction in the request. Plan is still documented here. | — |
| D2 | Video source = the YouTube link; transcript recovered via a scraping service, timings rescaled from ~330 s to the true 207 s runtime. | No master file was supplied; YouTube blocks direct download from the build environment. | Master MP4 arrives → run `worker study`. |
| D3 | Every scene treated as an artist's impression. | YouTube labels the film "Made with AI — altered or fully generated". | Client confirms which shots are real footage. |
| D4 | The **5.5% return / lease step-up** claim is `high_risk` and blocked everywhere. | Guaranteed/return claims are a PRD compliance fail and a regulatory risk. | Legal approves wording + disclaimer. |
| D5 | Copy says "Ipoh", never "Bercham" or "Tambun". | PRD/title say Bercham; voice-over says Tambun. | TKB confirms locality. |
| D6 | "World-class hospitality brand" rewritten as "professional hospitality operator"; superlatives warn. | Operator not named; unsubstantiated superlative. | Operator agreement on file. |
| D7 | Tenant-mix-secured, international brands and Ipoh City Day (MBI) claims kept in the brief but excluded from ads. | No evidence; MBI reference needs consent. | Evidence supplied. |
| D8 | Four angles: Day into Night, Planned Before It's Built, 128 Eateries, A Reason to Stay. | Maps the film's strongest hooks to 5 personas and all funnel stages. | Optimiser data after week 2. |
| D9 | Budget shown as percentages only (35/30/25/10). | No budget supplied; never invent figures. | TKB sets monthly budget. |
| D10 | Local JSON store for the MVP; Supabase schema delivered alongside. | Runs with zero setup for review; schema is migration-ready. | Pilot goes live. |
| D11 | Tailwind components instead of shadcn/ui. | Fewer dependencies for the MVP; same visual system. | Team prefers shadcn. |
| D12 | Claude Copywriter uses `claude-opus-5` with adaptive thinking, JSON-schema output and server-side refusal fallback; output always re-enters the compliance gate. | Highest-quality copy; no AI output bypasses the gate. | Cost review. |
| D13 | Meta ads exported under Special Ad Category: Housing, uploaded paused. | Meta housing policy; PRD non-goal of auto-publishing. | — |
| D14 | Lead scoring is rule-based (timeline, financing, purpose, budget); first reply drafted in lead's language for a human to send. | AI WhatsApp qualifier is P1. | WhatsApp Cloud API connected. |
| D15 | DEMO leads/spend are opt-in, badged, and flagged on reports. | Never mix fabricated records into real reporting. | — |
| D16 | Slots seeded as weekends 11am/2pm/4pm, weekdays 7pm MYT for two placeholder negotiators. | No sales roster supplied. | TKB shares roster and gallery hours. |
| D17 | Approval gate enforced twice: in the server action and by a Postgres trigger. | The gate must not be bypassable by a UI bug or direct API call. | — |

## Content Engine (docs/PRD_CONTENT_ENGINE.md)

Build started on "proceed" without answers to PRD §12, so the PRD's recommendations were taken as defaults.

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D18 | Pilot brand = Urban Forest (PRD Q1). | Claims, personas and the compliance gate already exist. | Compass.RealEstate profile needed (second project). |
| D19 | Organic posts first; `utm_medium=organic_social` (Q2). | Winning angles move to paid later (FR-22). | 2–4 weeks of engine data. |
| D20 | Session Monday 09:00 MYT, 3 pieces (Q3). Editable on /engine/profile. | PRD default. | Operator changes it. |
| D21 | Engine assets reuse the approval queue and gate unchanged; reviewer is whoever approves there (Q4). | One gate, no bypass. | TKB names a reviewer. |
| D22 | Engine assets store the parent launch angle in `angleId` (landing page) and their own code in `asset.engine`. | Every existing page, the launch kit and lead capture keep working; `naming.ts` no longer throws on unknown angles. | Engine angles get their own landing pages. |
| D23 | Engine state lives under `store.engine`, created lazily; `STORE_VERSION` unchanged. | Upgrading does not wipe existing leads and approvals. | Supabase migration. |
| D24 | Polish gate: chosen angle, draft read in full, no open blocking flag (or override with reason), one real detail that appears in the copy, compliance pass. Re-checked on submit. | PRD FR-14; Step 8 "don't skip steps". | Override rate > 30%. |
| D25 | Claims are auto-linked from numbers in the copy, so R8 warns reviewers about unverified figures such as "128 eateries". | Operator-written angles cite no claims. | Brochure verifies the claims. |

## Test deployment

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D26 | Hosted storage = one JSONB row per workspace in Supabase (`0002_workspace_store.sql`), written with an optimistic `rev` check and retried on conflict. Tables are closed to the API; access only via SECURITY DEFINER functions that check a secret token, so a publishable key suffices and it can share an existing project (`propvid_` prefix). Test round uses the existing "Chat demo" project (free plan's 2-project limit reached). | Smallest change that survives serverless instances; keeps `lib/data/store.ts` as the only data seam. Relational schema `0001` stays the production target. | Pilot goes live / more than a handful of concurrent users. |
| D27 | Supabase reads opt out of Next's per-render fetch memoization. | Found in testing: a re-read after a write conflict returned the stale first response. | — |
| D28 | Test gate = one shared access code (`PROPVID_ACCESS_CODE`), hashed cookie, everything gated including landing pages, `noindex`. | Unreleased TKB project material; no per-user accounts needed for a feedback round. | Real users / client portal (P1). |
| D29 | Feedback is stored in the workspace and exported as CSV; it survives a workspace reset. | Testers stay in the app; Deric gets one sheet to triage. | — |
