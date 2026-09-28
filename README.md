# PropVid Campaign Engine

Turn one property concept film into an approval-ready, trilingual social campaign that books sales-gallery visits — and track every lead to SPA.

**Pilot:** Urban Forest @ Bercham, Ipoh (Team Keris Berhad). Source film: https://youtu.be/BK0CO1hdOqA

## What's in it
- **Project Intelligence** — 26-scene video map with hook/emotion/clarity scores; 14 claims each linked to its source; flags for unverified, conflicting and high-risk claims; 5 buyer personas.
- **Campaign Plan** — 4 angles, funnel map, 30-day calendar (60 placements), budget split, channel roles.
- **Creative** — 48 assets (4 angles × EN/BM/中文 × 4 formats), each with A/B/C copy variants and a compliant end card. Optional Claude Copywriter for rewrites.
- **Compliance gate** — permit/licence, artist's-impression labels, no return/guarantee claims (EN/BM/中文), prices must match the price list, every number sourced, PDPA, Meta housing / TikTok limits. Blocked assets cannot be approved (enforced in app and in Postgres).
- **Approval queue** — kanban, inline edit, bulk approve per angle, full audit log.
- **Launch Kit** — ZIP per platform: `ads.csv` (named `project_angle_persona_format_lang_variant`, UTMs baked in), `manifest.json`, README. Uploaded paused.
- **Landing pages** — `/lp/{night|planned|food|stay}?lang=en|bm|zh`, mobile-first, PDPA consent, WhatsApp CTA, UTM capture.
- **Lead inbox → appointments → report** — scoring, 2-minute SLA with drafted first reply, slot booking with reminders, pre-visit brief, outcome logging, leadership one-pager.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # compliance + lead-scoring unit tests
```
Then open **Settings** and enter the developer licence and APDL numbers — until then every asset is (correctly) blocked.

Optional: `ANTHROPIC_API_KEY` enables AI rewrites. See `.env.example`.

## Layout
`app/` pages and server actions · `lib/engine/` compliance, generator, strategy, naming, leads, metrics · `lib/data/` case-study data and copy library · `supabase/migrations/` production schema with RLS · `worker/` ffmpeg/PySceneDetect/Whisper video worker · `docs/` plan, decisions, missing inputs, campaign brief.

## Not yet built (P1)
Supabase wiring (schema is ready), Meta/TikTok lead webhooks, WhatsApp Cloud API qualifier, paused-ad API push, Optimiser Agent, client portal.
