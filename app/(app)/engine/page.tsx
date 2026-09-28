import Link from "next/link";
import { addManualAngle, chooseAngle, createPiece, dropAngle, proposeAnglesAction, submitPolished } from "@/app/engine-actions";
import { Badge, Notice, PageHeader, Section, Stat } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/copywriter";
import { problemBank } from "@/lib/data/engine-seed";
import { engineOf, readStore } from "@/lib/data/store";
import { angles as launchAngles, personas } from "@/lib/data/urban-forest";
import { anglePrompt, scorecard, streak, weekOf } from "@/lib/engine/content";
import type { ContentPiece, EngineAngle } from "@/lib/types";
import { LANG_LABEL, PLATFORM_LABEL } from "@/lib/types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const myt = (iso: string) =>
  new Date(iso).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS_TONE: Record<ContentPiece["status"], "warn" | "gold" | "ok"> = { draft: "warn", polished: "gold", submitted: "ok" };

function stageOf(p: ContentPiece): string {
  if (p.status === "submitted") return "Repeat · scheduled";
  if (p.status === "polished") return "Polished · ready to schedule";
  if (!p.draft) return "Draft · waiting for draft";
  if (!p.readConfirmedAt) return "Draft · read it once in full";
  return "Polish · in progress";
}

function AngleCard({ a }: { a: EngineAngle }) {
  const persona = personas.find((p) => p.id === a.personaId);
  const lp = launchAngles.find((x) => x.id === a.parentAngleId);
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg text-bone">&ldquo;{a.sentence}&rdquo;</p>
        <div className="flex gap-2">
          <Badge tone={a.specificity.ok ? "ok" : "bad"}>{a.specificity.ok ? "specific" : "too vague"}</Badge>
          <Badge tone={a.status === "chosen" ? "gold" : a.status === "used" ? "ok" : "mute"}>{a.status}</Badge>
        </div>
      </div>
      <p className="mt-2 text-xs text-bone-dim">
        For {persona?.name ?? a.personaId} · landing page: {lp?.name ?? a.parentAngleId} · code <span className="text-bone-muted">{a.code}</span>
        {a.model ? ` · ${a.model}` : " · written by operator"}
      </p>
      {a.rationale ? <p className="mt-2 text-sm text-bone-muted">{a.rationale}</p> : null}
      {a.specificity.reasons.length ? (
        <ul className="mt-2 list-disc pl-5 text-xs text-bad">{a.specificity.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      ) : null}
      {a.status === "proposed" ? (
        <div className="mt-3 flex gap-2">
          <form action={chooseAngle}><input type="hidden" name="id" value={a.id} /><button className="btn-solid" disabled={!a.specificity.ok}>Choose this angle</button></form>
          <form action={dropAngle}><input type="hidden" name="id" value={a.id} /><button className="btn-ghost">Drop</button></form>
        </div>
      ) : null}
      {a.status === "chosen" || a.status === "used" ? (
        <form action={createPiece} className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-600 pt-3">
          <input type="hidden" name="angleId" value={a.id} />
          <div><label className="label">Language</label><select name="lang" className="input">{(["en", "bm", "zh"] as const).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</select></div>
          <div><label className="label">Platform</label><select name="platform" className="input">{(["meta", "tiktok", "xhs"] as const).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select></div>
          <div><label className="label">Format</label><select name="format" className="input"><option value="post">Single-image post</option><option value="carousel">Carousel caption</option></select></div>
          <button className="btn-solid">Draft a piece →</button>
        </form>
      ) : null}
    </div>
  );
}

export default async function EnginePage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string; prompt?: string; p?: string | string[] }> }) {
  const sp = await searchParams;
  const s = await readStore();
  const e = engineOf(s);
  const now = new Date();
  const wk = weekOf(now);
  const ai = aiEnabled();
  const thisWeek = e.pieces.filter((p) => weekOf(new Date(p.timings.createdAt)) === wk);
  const submittedWeeks = e.pieces.filter((p) => p.timings.submittedAt).map((p) => weekOf(new Date(p.timings.submittedAt!)));
  const run = streak(submittedWeeks, now);
  const sentThisWeek = thisWeek.filter((p) => p.status === "submitted").length;
  const card = scorecard(thisWeek);
  const allCard = scorecard(e.pieces);
  const polished = e.pieces.filter((p) => p.status === "polished");
  const lastWeek = weekOf(new Date(now.getTime() - 7 * 86400000));
  // Only nag once the engine was running before this week; a first session is not a missed week.
  const startedBefore = e.pieces.some((p) => weekOf(new Date(p.timings.createdAt)) < wk);
  const missedLastWeek = startedBefore && !submittedWeeks.includes(lastWeek) && !submittedWeeks.includes(wk);
  const activeAngles = e.angles.filter((a) => a.status !== "rejected" && (a.status !== "used" || a.weekOf === wk));
  const permitMissing = !s.project.permit.developerLicence || !s.project.permit.advertisingPermit;
  const scheduled = s.assets.filter((a) => a.engine?.scheduledFor && new Date(a.engine.scheduledFor) > now).sort((a, b) => a.engine!.scheduledFor!.localeCompare(b.engine!.scheduledFor!));
  const promptProblems = sp.prompt ? [sp.p ?? []].flat() : [];
  const bank = problemBank();
  const angleOf = (id: string) => e.angles.find((a) => a.id === id);

  return (
    <>
      <PageHeader eyebrow="Weekly · Angle → Draft → Polish → Repeat" title="Content Engine">
        One sitting a week replaces the four jobs of a marketing team: decide what to say, write it, make it sound like us, and keep it going. Every piece ends in the approval queue as a campaign-ready asset.
        {" "}<Link href="/engine/profile" className="text-gold underline">Brand voice &amp; baseline</Link>
      </PageHeader>

      {sp.error ? <Notice tone="bad">{sp.error}</Notice> : null}
      {sp.done ? <Notice tone="ok">{sp.done} <Link href="/approvals" className="text-gold underline">Open the approval queue</Link></Notice> : null}
      {missedLastWeek ? <Notice tone="warn">Nothing went out last week. Repeat is the step people skip — run this week&apos;s session before adding anything new.</Notice> : null}
      {permitMissing ? (
        <Notice tone="bad">Pieces cannot pass Polish while the developer licence and APDL numbers are missing (compliance rule R1). <Link href="/settings" className="text-gold underline">Settings</Link></Notice>
      ) : null}

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="This week" value={`${sentThisWeek}/${e.profile.session.target}`} hint="pieces sent to approval" />
        <Stat label="Streak" value={`${run} wk`} hint="weeks in a row with output" />
        <Stat label="Angle → polished" value={card.medianTotalMin !== null ? `${Math.round(card.medianTotalMin)} min` : "—"} hint="median this week · goal ≤ 20" />
        <Stat label="Flags per piece" value={allCard.findingsPerPiece !== null ? allCard.findingsPerPiece.toFixed(1) : "—"} hint="should fall as the voice settles" />
        <Stat label="Next session" value={`${WEEKDAYS[e.profile.session.weekday].slice(0, 3)} ${e.profile.session.time}`} hint="MYT" />
      </div>
      <p className="-mt-6 mb-10 text-xs text-bone-dim">
        <a href="/api/engine/ics" className="text-gold underline">Add the weekly session to your calendar (.ics)</a> · AI: {ai ? <Badge tone="ok">on</Badge> : <Badge>off — the guide&apos;s prompts are shown to paste into Claude</Badge>}
      </p>

      <Section title="1 · Angle — what is the one thing to say this week?">
        <form action={proposeAnglesAction} className="card grid gap-4">
          <p className="text-sm text-bone-muted">Pick 2–3 problems your buyers have right now. The angle is the single most specific thing you can say about one of them.</p>
          <div className="grid max-h-72 gap-1 overflow-y-auto pr-2 text-sm sm:grid-cols-2">
            {bank.map((b) => (
              <label key={`${b.personaId}-${b.problem}`} className="flex items-start gap-2 text-bone">
                <input type="checkbox" name="problem" value={`${b.problem} (${b.persona})`} className="mt-1" defaultChecked={promptProblems.includes(`${b.problem} (${b.persona})`)} />
                <span>{b.problem} <span className="text-bone-dim">— {b.persona}</span></span>
              </label>
            ))}
          </div>
          <div><label className="label">Or type problems you heard this week (one per line)</label><textarea name="customProblems" rows={2} className="input" placeholder="e.g. Buyers keep asking if it will be busy on weekdays" /></div>
          <div><button className="btn-solid">{ai ? "Suggest angles with Claude" : "Show me the angle prompt"}</button></div>
        </form>

        {promptProblems.length ? (
          <div className="card mt-4">
            <p className="mb-2 text-sm text-bone">Paste this into Claude, then add the angle you pick below.</p>
            <pre className="whitespace-pre-wrap rounded border border-ink-600 bg-ink-900 p-3 text-xs text-bone">{anglePrompt(e.profile, promptProblems)}</pre>
          </div>
        ) : null}

        <details className="card mt-4" open={Boolean(promptProblems.length)}>
          <summary className="cursor-pointer text-sm text-bone">Write an angle yourself</summary>
          <form action={addManualAngle} className="mt-3 grid gap-3">
            {promptProblems.map((p) => <input key={p} type="hidden" name="p" value={p} />)}
            <div><label className="label">Angle — one specific sentence</label><input name="sentence" className="input" placeholder="Ipoh families drive across town for dinner; Urban Forest puts 128 eateries in one place." /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Who it is for</label><select name="personaId" className="input">{personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label">Landing page</label><select name="parentAngleId" className="input">{launchAngles.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            </div>
            <div><label className="label">Why this one (optional)</label><input name="rationale" className="input" /></div>
            <div><button className="btn">Add &amp; check specificity</button></div>
          </form>
        </details>

        <div className="mt-4 space-y-3">
          {activeAngles.length ? activeAngles.map((a) => <AngleCard key={a.id} a={a} />) : <p className="text-sm text-bone-dim">No angles yet this week.</p>}
        </div>
      </Section>

      <Section
        title="2–3 · Draft & Polish — this week's pieces"
        aside={
          <form action={submitPolished}>
            <button className="btn-solid" disabled={!polished.length}>4 · Schedule {polished.length} polished piece{polished.length === 1 ? "" : "s"} for next week →</button>
          </form>
        }
      >
        {thisWeek.length ? (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-bone-dim">
                <tr><th className="p-3">Angle</th><th className="p-3">Piece</th><th className="p-3">Stage</th><th className="p-3">Flags</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {thisWeek.map((p) => (
                  <tr key={p.id} className="border-t border-ink-600">
                    <td className="max-w-xs p-3 text-bone-muted">{angleOf(p.angleId)?.sentence.slice(0, 70) ?? "—"}</td>
                    <td className="p-3 text-bone">{PLATFORM_LABEL[p.platform]} · {p.format} · {p.lang.toUpperCase()}</td>
                    <td className="p-3"><Badge tone={STATUS_TONE[p.status]}>{stageOf(p)}</Badge></td>
                    <td className="p-3 text-bone-muted">{p.findings.filter((f) => f.severity === "block" && !f.overrideReason).length} open</td>
                    <td className="p-3"><Link href={`/engine/piece/${p.id}`} className="text-gold underline">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-bone-dim">Choose an angle above, then draft a piece. Target: {e.profile.session.target} pieces this session.</p>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="4 · Repeat — scheduled posts">
          <ul className="card space-y-2 text-sm">
            {scheduled.length ? scheduled.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-bone">{myt(a.engine!.scheduledFor!)} · {a.lang.toUpperCase()} · {a.platforms.join(", ")}</span>
                <Link href={`/approvals/${a.id}`} className="text-xs text-gold underline">{a.status.replace("_", " ")}</Link>
              </li>
            )) : <li className="text-bone-dim">Nothing scheduled yet. Polished pieces fill next week&apos;s 12:30 and 20:30 slots.</li>}
          </ul>
        </Section>
        <Section title="Scorecard — engine vs. before">
          <div className="card space-y-2 text-sm text-bone-muted">
            <p>All time: <span className="text-bone">{allCard.created}</span> pieces started · <span className="text-bone">{allCard.submitted}</span> sent to approval.</p>
            <p>Median minutes — draft: <span className="text-bone">{allCard.medianDraftMin !== null ? Math.round(allCard.medianDraftMin) : "—"}</span> · polish: <span className="text-bone">{allCard.medianPolishMin !== null ? Math.round(allCard.medianPolishMin) : "—"}</span> · total: <span className="text-bone">{allCard.medianTotalMin !== null ? Math.round(allCard.medianTotalMin) : "—"}</span></p>
            <p>Generic-phrase overrides: <span className="text-bone">{allCard.overrideRate !== null ? `${Math.round(allCard.overrideRate * 100)}%` : "—"}</span> of blocking flags (high = tune the lists).</p>
            <p>
              Baseline before the engine:{" "}
              {e.profile.baseline.hoursPerMonth !== null || e.profile.baseline.spendRM !== null ? (
                <span className="text-bone">{e.profile.baseline.hoursPerMonth ?? "—"} h / month · RM {e.profile.baseline.spendRM?.toLocaleString() ?? "—"} / month</span>
              ) : (
                <Link href="/engine/profile" className="text-gold underline">not recorded yet (Step 1)</Link>
              )}
            </p>
            <p>Leads by engine angle appear on the <Link href="/report" className="text-gold underline">leadership report</Link> through the UTM codes on every piece.</p>
          </div>
        </Section>
      </div>
    </>
  );
}
