# Deploying the pilot test

## Storage
Without Supabase variables the app writes to `.data/store.json` (fine locally, **not** on Vercel — serverless disks are ephemeral).
For the hosted test, apply `supabase/migrations/0002_app_state.sql` to a Supabase project and set the variables below. The whole pilot workspace is one row in `app_state`, saved with optimistic revision checks so concurrent testers don't overwrite each other. RLS is on with no policies; only the server's service-role key can read it.

`0001_init.sql` (full relational schema) is the post-pilot target and is not needed for the test.

## Environment variables (Vercel → Project → Settings → Environment Variables)
| Variable | Required | Value |
|---|---|---|
| `SUPABASE_URL` | Yes (hosted) | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (hosted) | Service-role key (server only — never `NEXT_PUBLIC_`) |
| `ACCESS_CODE` | Yes (hosted) | Shared passcode for testers; landing pages stay public |
| `NEXT_PUBLIC_SITE_URL` | Yes | The deployed URL, used in launch-kit UTM links |
| `ANTHROPIC_API_KEY` | Optional | Enables the AI rewrite button |
| `NEXT_PUBLIC_TEST_MODE` | Optional | Defaults to on (shows "TEST VERSION" on landing pages). Set `off` only for a real launch. |
| `PROPVID_WORKSPACE` | Optional | Row id in `app_state`; defaults to `urban-forest-pilot` |

## Steps
1. Supabase: run `0002_app_state.sql` (SQL editor or migration).
2. Vercel: import the GitHub repo, framework Next.js, add the variables, deploy.
3. Open the URL → sign in → Settings → enter the permit numbers and pilot inputs.
