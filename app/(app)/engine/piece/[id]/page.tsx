import Link from "next/link";
import { notFound } from "next/navigation";
import { aiPolish, confirmRead, draftWithAi, markPolished, overrideFinding, pasteDraft, savePiece, submitPolished } from "@/app/engine-actions";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/copywriter";
import { complianceCtx, engineOf, readStore } from "@/lib/data/store";
import { angles as launchAngles, claims, personas } from "@/lib/data/urban-forest";
import { checkAsset } from "@/lib/engine/compliance";
import { copyText, draftPrompt, pieceToAsset, polishBlockers, polishPrompt } from "@/lib/engine/content";
import { endCard } from "@/lib/engine/generate";
import type { PieceCopy } from "@/lib/types";
import { LANG_LABEL, PLATFORM_LABEL } from "@/lib/types";

const FIELDS: [keyof PieceCopy, string, number][] = [
  ["hook", "Hook (first line)", 1],
  ["primary", "Post text", 6],
  ["headline", "Headline", 1],
  ["cta", "Call to action", 1],
];

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2 text-xs">
      {["Angle", "Draft", "Polish", "Repeat"].map((name, i) => (
        <li key={name}>
          <Badge tone={i < current ? "ok" : i === current ? "gold" : "mute"}>{i + 1} · {name}{i < current ? " ✓" : ""}</Badge>
        </li>
      ))}
    </ol>
  );
}

export default async function PiecePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await readStore();
  const e = engineOf(s);
  const piece = e.pieces.find((p) => p.id === id);
  if (!piece) notFound();
  const angle = e.angles.find((a) => a.id === piece.angleId);
  if (!angle) notFound();
  const ai = aiEnabled();
  const persona = personas.find((p) => p.id === angle.personaId);
  const lp = launchAngles.find((a) => a.id === angle.parentAngleId);
  const compliance = checkAsset(pieceToAsset(piece, angle, s.project, endCard(s.project, piece.lang)), complianceCtx(s));
  const blockers = polishBlockers({ angleStatus: angle.status, piece, compliance });
  const step = piece.status === "submitted" ? 4 : piece.status === "polished" ? 3 : piece.draft ? 2 : 1;
  const usable = claims.filter((c) => c.status !== "high_risk" && !["c-ipoh-city-day", "c-tenant-secured", "c-brands"].includes(c.id));
  const locked = piece.status === "submitted";
  const trail = s.audit.filter((x) => x.target === piece.id || (piece.assetId && x.target === piece.assetId)).reverse();

  return (
    <>
      <Link href="/engine" className="btn-ghost mb-4 -ml-3">← Content Engine</Link>
      <PageHeader eyebrow={`${PLATFORM_LABEL[piece.platform]} · ${piece.format === "post" ? "Single-image post" : "Carousel caption"} · ${LANG_LABEL[piece.lang]}`} title={`“${angle.sentence}”`}>
        For {persona?.name ?? angle.personaId}. Leads land on the “{lp?.name}” page and are tagged <span className="text-bone">{angle.code}</span>.
      </PageHeader>
      <Steps current={step} />
      {error ? <Notice tone="bad">{error}</Notice> : null}

      {!piece.draft ? (
        <Section title="2 · Draft">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="card space-y-3">
              {ai ? (
                <form action={draftWithAi}><input type="hidden" name="id" value={piece.id} /><button className="btn-solid">Draft with Claude</button></form>
              ) : (
                <p className="text-sm text-bone-muted">AI is off. Paste this prompt into Claude, then paste the result on the right.</p>
              )}
              <pre className="whitespace-pre-wrap rounded border border-ink-600 bg-ink-900 p-3 text-xs text-bone">
                {draftPrompt(e.profile, angle.sentence, { lang: piece.lang, platform: piece.platform, format: piece.format, facts: usable.map((c) => c.statement) })}
              </pre>
            </div>
            <form action={pasteDraft} className="card grid gap-3">
              <input type="hidden" name="id" value={piece.id} />
              {FIELDS.map(([k, label, rows]) => (
                <div key={k}><label className="label">{label}</label>{rows > 1 ? <textarea name={k} rows={rows} className="input" /> : <input name={k} className="input" />}</div>
              ))}
              <div><button className="btn">Use this draft</button></div>
            </form>
          </div>
        </Section>
      ) : !piece.readConfirmedAt && !locked ? (
        <Section title="2 · Draft — read it once, in full, before editing">
          <div className="card space-y-3">
            <pre className="whitespace-pre-wrap font-sans text-sm text-bone">{copyText(piece.draft)}</pre>
            <p className="text-xs text-bone-dim">{piece.model ?? "pasted by operator"} · {piece.promptVersion}</p>
            <form action={confirmRead}><input type="hidden" name="id" value={piece.id} /><button className="btn-solid">I&apos;ve read it in full — start Polish</button></form>
          </div>
        </Section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div>
            <Section title="3 · Polish — make it sound like us">
              <form action={savePiece} className="card grid gap-3">
                <input type="hidden" name="id" value={piece.id} />
                {FIELDS.map(([k, label, rows]) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    {rows > 1 ? <textarea name={k} rows={rows} defaultValue={piece.copy[k]} className="input" disabled={locked} /> : <input name={k} defaultValue={piece.copy[k]} className="input" disabled={locked} />}
                  </div>
                ))}
                <div>
                  <label className="label">One real, specific detail only we would know (must appear in the copy)</label>
                  <input name="signatureDetail" list="sig" defaultValue={piece.signatureDetail} className="input" disabled={locked} placeholder="a real name, moment or verified fact" />
                  <datalist id="sig">{e.profile.signatureDetails.map((d) => <option key={d} value={d} />)}</datalist>
                  <p className="mt-1 text-[11px] text-bone-dim">Numbers must come from the verified claims, or the compliance gate (R5) will block the piece.</p>
                </div>
                {!locked ? <div><button className="btn">Save &amp; re-check</button></div> : null}
              </form>

              <details className="card mt-4">
                <summary className="cursor-pointer text-sm text-bone">Before / after (kept for the reviewer)</summary>
                <div className="mt-3 grid gap-4 text-xs sm:grid-cols-2">
                  <div><p className="mb-1 text-bone-dim">First draft</p><pre className="whitespace-pre-wrap font-sans text-bone-muted">{copyText(piece.draft)}</pre></div>
                  <div><p className="mb-1 text-bone-dim">Now</p><pre className="whitespace-pre-wrap font-sans text-bone">{copyText(piece.copy)}</pre></div>
                </div>
              </details>
            </Section>

            <Section
              title={`Generic-phrase flags (${piece.findings.length})`}
              aside={!locked ? <form action={aiPolish}><input type="hidden" name="id" value={piece.id} /><button className="btn-ghost border border-ink-500">AI editor suggestions {ai ? "" : "(off)"}</button></form> : null}
            >
              <ul className="space-y-2">
                {piece.findings.length ? piece.findings.map((f) => (
                  <li key={f.id} className="card !p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={f.overrideReason ? "mute" : f.severity === "block" ? "bad" : "warn"}>{f.overrideReason ? "overridden" : f.severity}</Badge>
                      <span className="text-bone">&ldquo;{f.phrase}&rdquo;</span>
                      <span className="text-[11px] text-bone-dim">in {f.field}</span>
                    </div>
                    <p className="mt-1 text-bone-muted">{f.reason}</p>
                    {f.suggestion ? <p className="mt-1 text-bone">Try: <span className="text-gold">{f.suggestion}</span></p> : null}
                    {f.overrideReason ? <p className="mt-1 text-xs text-bone-dim">Kept because: {f.overrideReason}</p> : null}
                    {f.severity === "block" && !f.overrideReason && !locked ? (
                      <form action={overrideFinding} className="mt-2 flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={piece.id} />
                        <input type="hidden" name="findingId" value={f.id} />
                        <input name="reason" placeholder="Keep it because…" className="input flex-1" />
                        <button className="btn-ghost">Override</button>
                      </form>
                    ) : null}
                  </li>
                )) : <li className="text-sm text-bone-dim">No generic phrases flagged.</li>}
              </ul>
              {!ai && !locked ? (
                <details className="card mt-3">
                  <summary className="cursor-pointer text-sm text-bone">Editor prompt to paste into Claude</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-bone">{polishPrompt(piece.copy)}</pre>
                </details>
              ) : null}
            </Section>
          </div>

          <div>
            <Section title="Gate">
              <div className="card space-y-3 text-sm">
                {piece.status === "submitted" ? (
                  <p className="text-bone">
                    Sent to the approval queue{piece.scheduledFor ? ` for ${new Date(piece.scheduledFor).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}.{" "}
                    {piece.assetId ? <Link href={`/approvals/${piece.assetId}`} className="text-gold underline">Open asset</Link> : null}
                  </p>
                ) : piece.status === "polished" ? (
                  <>
                    <p className="text-ok">Polished. Ready to schedule into next week.</p>
                    <form action={submitPolished}><input type="hidden" name="id" value={piece.id} /><button className="btn-solid">Schedule &amp; send to approval</button></form>
                  </>
                ) : (
                  <>
                    {blockers.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-bad">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                    ) : (
                      <p className="text-ok">All checks pass.</p>
                    )}
                    <form action={markPolished}><input type="hidden" name="id" value={piece.id} /><button className="btn-solid" disabled={blockers.length > 0}>Mark polished</button></form>
                    <p className="text-[11px] text-bone-dim">Save your edits first — the gate checks the saved copy.</p>
                  </>
                )}
              </div>
            </Section>

            <Section title="Compliance">
              <ul className="card space-y-2 text-xs">
                {compliance.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge tone={r.level === "block" ? "bad" : r.level === "warn" ? "warn" : "ok"}>{r.level}</Badge>
                    <span><span className="text-bone-muted">{r.rule}</span> — <span className="text-bone">{r.message}</span></span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Audit trail">
              <ul className="card space-y-1 text-xs text-bone-muted">
                {trail.length ? trail.map((x) => <li key={x.id}>{new Date(x.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {x.actor} · {x.action}{x.detail ? ` — ${x.detail.slice(0, 80)}` : ""}</li>) : <li>No actions yet.</li>}
              </ul>
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
