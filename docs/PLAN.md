# PLAN — PropVid Campaign Engine (pilot: Urban Forest @ Bercham)

Source: `PRD — Video-to-Campaign Engine for Property Developers v1.0` and the concept film https://youtu.be/BK0CO1hdOqA (3:27).

## Status at a glance

| Phase | Scope (PRD §13) | Status in this build |
|---|---|---|
| 0 | Plan, schema, repo, design system | **Done.** This plan, `DECISIONS.md`, Supabase migration with RLS, dark/gold design system. |
| 1 | Ingest + Video Study + Project Intelligence | **Partial.** Transcript recovered from the public link; 26-scene video map scored; 14 source-linked claims; 5 personas. Worker (`worker/pipeline.py`) ready for the master file. |
| 2 | Strategist + Creative + Compliance gate | **Done for pilot.** 4 angles, 30-day calendar, budget split; 48 assets × 3 copy variants in EN/BM/中文; 10-rule compliance gate. |
| 3 | Approval queue + Launch kit + Landing pages | **Done.** Kanban queue with inline edit, AI rewrite, bulk approve, audit log; ZIP per platform (CSV + manifest + README, UTMs baked in); 4 trilingual landing pages with PDPA consent + WhatsApp CTA. |
| 4 | Lead inbox + Booking + Dashboard | **Done (MVP).** Scored inbox with 2-minute SLA and drafted first reply; slot booking with 24h/2h reminders, pre-visit brief, outcome logging; dashboard + printable leadership one-pager. |
| 5 | P1 features | Not started: Meta/TikTok lead webhooks, WhatsApp Cloud API qualifier, paused-ad push, Optimiser Agent, client portal. |

## Acceptance check (PRD §8)

> Given the video and brochure are uploaded, when the operator clicks Generate, within 48 hours ≥ 40 assets across 4 angles and 3 languages are in the approval queue, each with a compliance pass, and none contain a price or claim not found in the source documents.

- 48 assets across 4 angles × 3 languages are generated immediately.
- With permit numbers entered, **all 48 pass the gate** (0 blocks; warnings only for unverified claims). Verified end-to-end in a browser run.
- No asset contains a price, return figure or unsourced number — rules R3–R5 enforce this, unit-tested.
- **Blocked today** by missing inputs: permit numbers (all assets blocked by design) and the brochure (claims remain "unverified").

## Architecture (as built)

```
Next.js 15 App Router (TypeScript, Tailwind)
├── app/(app)/*            operator dashboard (server components + server actions)
├── app/lp/[angle]         public landing pages (EN/BM/中文), lead capture
├── app/api/launch-kit     ZIP export per platform
├── lib/data/              case-study data, copy library, store (JSON demo | Supabase)
├── lib/engine/            compliance gate, generator, strategist, naming/UTM, leads, metrics
├── lib/ai/copywriter.ts   Claude Copywriter agent (structured output → compliance gate)
supabase/migrations/       multi-tenant schema, RLS, DB-level approval gate, append-only audit
worker/                    Python + ffmpeg + PySceneDetect + faster-whisper (container host)
```

Storage: the app runs out of the box on a local JSON store (`.data/store.json`). The Supabase schema mirrors the same shapes; wiring the repository layer to Supabase is the first task of the next phase.

## Next tasks (ordered)

1. Receive blocking inputs from TKB (see `MISSING_INPUTS.md`).
2. Swap the JSON store for Supabase (auth, RLS, storage buckets for media); keep `lib/data/store.ts` as the only data seam.
3. Deploy the worker; run `study` on the master file to replace recovered timings, then `cut` on the approved kit.
4. Study/Intelligence agents on Claude: read brochure + price list PDFs, re-verify claims with page citations.
5. P1: Meta Lead Ads + TikTok webhooks → `leads`; WhatsApp Cloud API qualifier (or hand-off webhook to TKB's existing bot).
6. Optimiser Agent weekly job writing recommendations into the approval queue.
