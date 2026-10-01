import { readStore } from "@/lib/data/store";
import { toCsv } from "@/lib/engine/launchkit";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readStore();
  const rows = s.feedback.map((f) => ({ at: f.at, tester: f.actor, page: f.page, kind: f.kind, status: f.status, text: f.text }));
  return new Response(toCsv(rows) || "at,tester,page,kind,status,text\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="propvid_feedback.csv"' },
  });
}
