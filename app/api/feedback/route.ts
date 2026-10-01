// Tester feedback as CSV (opens in Excel / Google Sheets).

import { readStore } from "@/lib/data/store";
import { toCsv } from "@/lib/engine/launchkit";
import { FEEDBACK_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readStore();
  const rows = (s.feedback ?? []).map((f) => ({
    at: f.at,
    who: f.who,
    page: f.page,
    type: FEEDBACK_LABEL[f.kind],
    usefulness: f.rating === null ? "" : String(f.rating),
    note: f.note,
  }));
  return new Response(toCsv(rows) || "at,who,page,type,usefulness,note\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${s.project.slug}_feedback.csv"` },
  });
}
