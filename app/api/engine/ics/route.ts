// Recurring weekly calendar block for the Content Engine session (Step 7: Repeat).

import { engineOf, readStore } from "@/lib/data/store";
import { sessionIcs } from "@/lib/engine/content";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await readStore();
  const url = new URL("/engine", req.url).toString();
  const body = sessionIcs(engineOf(s).profile.session, new Date(), s.project.name, url);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="content-engine-${s.project.slug}.ics"`,
    },
  });
}
