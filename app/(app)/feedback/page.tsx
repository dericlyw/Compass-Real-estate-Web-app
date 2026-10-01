import { toggleFeedback } from "@/app/actions";
import { Badge, PageHeader } from "@/components/ui";
import { readStore } from "@/lib/data/store";

const TONE = { bug: "bad", idea: "gold", question: "warn", praise: "ok" } as const;

export default async function FeedbackPage() {
  const s = await readStore();
  const open = s.feedback.filter((f) => f.status === "open").length;
  return (
    <>
      <PageHeader eyebrow="Pilot test" title="Tester feedback">
        Everything testers send with the Feedback button, newest first. {open} open. Tick items off as they are handled.
      </PageHeader>
      <div className="mb-6"><a href="/api/feedback" className="btn">Download CSV</a></div>
      {!s.feedback.length ? <div className="card text-sm text-bone-muted">No feedback yet. Use the Feedback button at the bottom-right of any page.</div> : null}
      <div className="space-y-3">
        {s.feedback.map((f) => (
          <div key={f.id} className={`card ${f.status === "done" ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={TONE[f.kind]}>{f.kind}</Badge>
                <span className="text-sm text-bone">{f.actor}</span>
                <span className="font-mono text-xs text-bone-dim">{f.page}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-bone-dim">{new Date(f.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</span>
                <form action={toggleFeedback}><input type="hidden" name="id" value={f.id} /><button className="btn-ghost !py-1">{f.status === "open" ? "Mark done" : "Reopen"}</button></form>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-bone">{f.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
