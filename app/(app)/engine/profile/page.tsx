import Link from "next/link";
import { saveProfile } from "@/app/engine-actions";
import { Notice, PageHeader, Section } from "@/components/ui";
import { engineOf, readStore } from "@/lib/data/store";
import { ENGINE_JOB_LABEL, type EngineJob } from "@/lib/types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const JOBS = Object.entries(ENGINE_JOB_LABEL) as [EngineJob, string][];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await readStore();
  const p = engineOf(s).profile;
  return (
    <>
      <Link href="/engine" className="btn-ghost mb-4 -ml-3">← Content Engine</Link>
      <PageHeader eyebrow="Steps 1–2 · Baseline and brand voice" title="Brand voice & baseline">
        What the Draft step needs to sound like us, and what content cost before the engine so we can tell whether it pays.
      </PageHeader>
      {saved ? <Notice tone="ok">Saved.</Notice> : null}
      <form action={saveProfile} className="grid gap-6 lg:grid-cols-2">
        <Section title="Brand voice">
          <div className="card grid gap-3">
            <div><label className="label">Business (what we do)</label><input name="business" defaultValue={p.business} className="input" /></div>
            <div><label className="label">Audience (who we serve)</label><input name="audience" defaultValue={p.audience} className="input" /></div>
            <div><label className="label">Tone — 3 to 5 words, comma-separated</label><input name="tone" defaultValue={p.tone.join(", ")} className="input" /></div>
            <div><label className="label">Offer line — the single clearest sentence (Step 2)</label><textarea name="offerLine" rows={2} defaultValue={p.offerLine} className="input" /></div>
            <div><label className="label">Real details only we know — one per line</label><textarea name="signatureDetails" rows={4} defaultValue={p.signatureDetails.join("\n")} className="input" placeholder="e.g. a named person, a moment on site, a verified fact" /></div>
            <div><label className="label">Phrases to avoid — comma-separated (the linter blocks them)</label><input name="avoid" defaultValue={p.avoid.join(", ")} className="input" /></div>
          </div>
        </Section>
        <div>
          <Section title="Baseline (Step 1)">
            <div className="card grid gap-3 sm:grid-cols-2">
              <div><label className="label">Hours on content / month</label><input name="hoursPerMonth" type="number" min="0" step="0.5" defaultValue={p.baseline.hoursPerMonth ?? ""} className="input" /></div>
              <div><label className="label">Spend on content / month (RM)</label><input name="spendRM" type="number" min="0" step="1" defaultValue={p.baseline.spendRM ?? ""} className="input" /></div>
              <div>
                <label className="label">Weakest of the 4 jobs</label>
                <select name="weakestJob" defaultValue={p.baseline.weakestJob ?? ""} className="input"><option value="">—</option>{JOBS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </div>
              <div>
                <label className="label">Job that takes the most time</label>
                <select name="slowestJob" defaultValue={p.baseline.slowestJob ?? ""} className="input"><option value="">—</option>{JOBS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </div>
              <p className="text-xs text-bone-dim sm:col-span-2">Enter real figures only. Without them the scorecard cannot compare the engine with what it replaces.</p>
            </div>
          </Section>
          <Section title="Weekly session (Step 7)">
            <div className="card grid gap-3 sm:grid-cols-3">
              <div><label className="label">Day</label><select name="weekday" defaultValue={p.session.weekday} className="input">{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
              <div><label className="label">Time (MYT)</label><input name="time" type="time" defaultValue={p.session.time} className="input" /></div>
              <div><label className="label">Pieces</label><select name="target" defaultValue={p.session.target} className="input">{[3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <p className="text-xs text-bone-dim sm:col-span-3">Protect this block like a client call. <a href="/api/engine/ics" className="text-gold underline">Download the calendar invite</a> after saving.</p>
            </div>
          </Section>
        </div>
        <div className="lg:col-span-2"><button className="btn-solid">Save profile</button></div>
      </form>
    </>
  );
}
