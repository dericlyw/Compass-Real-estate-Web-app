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
- **Content Engine** (`/engine`) — weekly Angle → Draft → Polish → Repeat loop for organic posts: specificity-checked angles, Claude or copy-and-paste drafts, a generic-phrase linter (EN/BM/中文) and a Polish gate, next-week slot scheduling with a `.ics` invite, and hand-off into the approval queue and launch kit with `organic_social` UTMs. See `docs/PRD_CONTENT_ENGINE.md`.
- **Lead inbox → appointments → report** — scoring, 2-minute SLA with drafted first reply, slot booking with reminders, pre-visit brief, outcome logging, leadership one-pager.

## Run on your own computer (easiest)
1. Install **Node.js LTS (22+)** from https://nodejs.org.
2. Unzip the project and double-click **`start-local.bat`** (Windows) or **`start-local.command`** (Mac; first time right-click → Open).
3. The browser opens http://localhost:3000/engine. First start installs packages (1–2 min). Close the window to stop.

Your data is saved in the `.data` folder next to the app. Delete it to start fresh.

## Run (developers)
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # compliance, lead-scoring and Content Engine unit tests
```
Then open **Settings** and enter the developer licence and APDL numbers — until then every asset is (correctly) blocked.

Optional: `ANTHROPIC_API_KEY` enables AI rewrites. See `.env.example`.

## Hosted test (Vercel + Supabase)
1. Supabase: run `supabase/migrations/0002_workspace_store.sql`, then `insert into propvid_secret (token_hash) values (encode(sha256('<your PROPVID_DB_TOKEN>'::bytea), 'hex'));`.
2. Vercel: import this repo; set `SUPABASE_URL`, `SUPABASE_KEY` (publishable key is enough), `PROPVID_DB_TOKEN`, `PROPVID_ACCESS_CODE`, `NEXT_PUBLIC_SITE_URL` and optionally `ANTHROPIC_API_KEY`.
3. Share the link, the access code and `docs/TEST_GUIDE.md` with testers. Their notes collect under **Feedback received** (CSV export).

Without Supabase on a host the app warns that storage is temporary.

## Layout
`app/` pages and server actions · `lib/engine/` compliance, generator, strategy, naming, leads, metrics · `lib/data/` case-study data and copy library · `supabase/migrations/` production schema with RLS · `worker/` ffmpeg/PySceneDetect/Whisper video worker · `docs/` plan, decisions, missing inputs, campaign brief.

## Not yet built (P1)
Supabase wiring (schema is ready), Meta/TikTok lead webhooks, WhatsApp Cloud API qualifier, paused-ad API push, Optimiser Agent, client portal.
