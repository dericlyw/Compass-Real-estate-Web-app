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
