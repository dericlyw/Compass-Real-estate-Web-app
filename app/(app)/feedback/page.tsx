import Link from "next/link";
import { submitFeedback } from "@/app/actions";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { FEEDBACK_LABEL, type FeedbackKind } from "@/lib/types";

const KINDS = Object.entries(FEEDBACK_LABEL) as [FeedbackKind, string][];
const TONE: Record<FeedbackKind, "bad" | "warn" | "gold" | "ok"> = { bug: "bad", confusing: "warn", idea: "gold", good: "ok" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string; thanks?: string; error?: string }> }) {
  const { from, thanks, error } = await searchParams;
  const s = await readStore();
  const items = s.feedback ?? [];
  const rated = items.filter((f) => f.rating !== null);
  const avg = rated.length ? rated.reduce((t, f) => t + (f.rating ?? 0), 0) / rated.length : null;
  return (
    <>
      <PageHeader eyebrow="Test round" title="Feedback">
        Tell us what broke, what confused you and what you would need before using this every week. One note per point is easiest to act on.
      </PageHeader>
      {thanks ? <Notice tone="ok">Thank you — saved. {from ? <Link href={from} className="text-gold underline">Back to where you were</Link> : null}</Notice> : null}
      {error ? <Notice tone="bad">Please write a short note.</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Section title="Add feedback">
          <form action={submitFeedback} className="card grid gap-3">
            <div><label className="label">Page</label><input name="page" defaultValue={from ?? "/"} className="input" /></div>
            <div>
              <label className="label">Type</label>
              <div className="flex flex-wrap gap-3 text-sm text-bone">
                {KINDS.map(([k, v], i) => (
                  <label key={k} className="flex items-center gap-2"><input type="radio" name="kind" value={k} defaultChecked={i === 0} /> {v}</label>
                ))}
              </div>
            </div>
            <div><label className="label">What happened / what would you change?</label><textarea name="note" rows={5} className="input" placeholder="What you did, what you expected, what you saw." /></div>
            <div>
              <label className="label">How useful would this be in your week? (1 = not at all, 5 = can&apos;t do without)</label>
              <select name="rating" className="input" defaultValue=""><option value="">— skip —</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <div><button className="btn-solid">Send feedback</button></div>
          </form>
        </Section>

        <Section title={`Received (${items.length})`} aside={items.length ? <a href="/api/feedback" className="btn-ghost">Download CSV</a> : null}>
          <p className="mb-3 text-xs text-bone-dim">Average usefulness: {avg !== null ? `${avg.toFixed(1)} / 5 from ${rated.length}` : "—"}</p>
          <ul className="space-y-2">
            {items.length ? items.map((f) => (
              <li key={f.id} className="card !p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONE[f.kind]}>{FEEDBACK_LABEL[f.kind]}</Badge>
                  {f.rating ? <Badge>{f.rating}/5</Badge> : null}
                  <span className="text-[11px] text-bone-dim">{f.who} · {f.page} · {new Date(f.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-bone">{f.note}</p>
              </li>
            )) : <li className="text-sm text-bone-dim">Nothing yet.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
