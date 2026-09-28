import Link from "next/link";
import { notFound } from "next/navigation";
import { aiRewrite, approveAsset, editVariant, rejectAsset, returnToReview } from "@/app/actions";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/copywriter";
import { carouselCards } from "@/lib/data/copy-library";
import { readStore } from "@/lib/data/store";
import { angles, personas, videoMap } from "@/lib/data/urban-forest";
import { isBlocked } from "@/lib/engine/compliance";
import { FORMAT_SPEC, LANG_LABEL } from "@/lib/types";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

export default async function AssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await readStore();
  const a = s.assets.find((x) => x.id === id);
  if (!a) notFound();
  const angle = angles.find((x) => x.id === a.angleId)!;
  const persona = personas.find((x) => x.id === a.personaId)!;
  const blocked = isBlocked(a.compliance);
  const trail = s.audit.filter((e) => e.target.startsWith(a.id)).reverse();

  return (
    <>
      <Link href="/approvals" className="btn-ghost mb-4 -ml-3">← Queue</Link>
      <PageHeader eyebrow={`${angle.name} · ${LANG_LABEL[a.lang]} · ${FORMAT_SPEC[a.format].label} (${FORMAT_SPEC[a.format].aspect})`} title={a.id}>
        Persona: {persona.name}. Platforms: {a.platforms.join(", ")}. Status: <Badge tone={a.status === "approved" ? "ok" : a.status === "rejected" ? "bad" : blocked ? "bad" : "warn"}>{a.status.replace("_", " ")}</Badge>
      </PageHeader>
      {error ? <Notice tone="bad">{error}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <Section title="Copy variants (A/B/C)">
            <div className="space-y-4">
              {a.variants.map((v) => (
                <div key={v.key} className="card">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-display text-lg text-gold">Variant {v.key}</span>
                    <span className="text-[11px] text-bone-dim">{v.model ?? "house library"} · {v.promptVersion} · claims: {v.claimIds.join(", ")}</span>
                  </div>
                  <form action={editVariant} className="grid gap-3">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="key" value={v.key} />
                    <div><label className="label">Hook (first 3 seconds / on-screen)</label><input name="hook" defaultValue={v.hook} className="input" /></div>
                    <div><label className="label">Primary text</label><textarea name="primary" defaultValue={v.primary} rows={4} className="input" /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="label">Headline</label><input name="headline" defaultValue={v.headline} className="input" /></div>
                      <div><label className="label">CTA</label><input name="cta" defaultValue={v.cta} className="input" /></div>
                    </div>
                    <div><button className="btn">Save edit &amp; re-check</button></div>
                  </form>
                  <form action={aiRewrite} className="mt-3 flex flex-wrap gap-2 border-t border-ink-600 pt-3">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="key" value={v.key} />
                    <input name="instruction" placeholder="Instruction for the AI Copywriter, e.g. warmer, shorter hook" className="input flex-1" />
                    <button className="btn-ghost border border-ink-500" title={aiEnabled() ? "" : "Set ANTHROPIC_API_KEY"}>AI rewrite {aiEnabled() ? "" : "(off)"}</button>
                  </form>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Decision">
            <div className="card space-y-3">
              <form action={approveAsset} className="space-y-3">
                <input type="hidden" name="id" value={a.id} />
                <textarea name="comment" placeholder="Reviewer comment (saved to audit log)" rows={2} className="input" defaultValue={a.reviewerComment} />
                <div className="flex flex-wrap gap-2">
                  <button className="btn-solid" disabled={blocked || a.status === "approved"}>Approve</button>
                  <button formAction={rejectAsset} className="btn">Reject</button>
                  {a.status !== "needs_review" && !blocked ? <button formAction={returnToReview} className="btn-ghost">Back to review</button> : null}
                </div>
              </form>
              {blocked ? <p className="text-xs text-bad">Approval disabled: fix the blocking items below.</p> : null}
            </div>
          </Section>

          <Section title="Compliance">
            <ul className="card space-y-2 text-xs">
              {a.compliance.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <Badge tone={r.level === "block" ? "bad" : r.level === "warn" ? "warn" : "ok"}>{r.level}</Badge>
                  <span><span className="text-bone-muted">{r.rule}</span> — <span className="text-bone">{r.message}</span></span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Edit spec">
            <div className="card space-y-2 text-xs text-bone-muted">
              {a.sceneIds.map((sid) => {
                const sc = videoMap.find((x) => x.id === sid)!;
                return <p key={sid}><span className="text-gold">{sid}</span> {fmt(sc.start)}–{fmt(sc.end)} · {sc.line.slice(0, 70)}…</p>;
              })}
              <p className="pt-2 text-bone">Burned-in captions: {LANG_LABEL[a.lang]}. End card:</p>
              <p className="rounded border border-ink-600 bg-ink-900 p-2 text-bone">{a.endCard}</p>
              {a.format === "carousel" ? (
                <ol className="list-decimal pl-4 text-bone">{carouselCards[a.angleId][a.lang].map((c) => <li key={c}>{c}</li>)}</ol>
              ) : null}
            </div>
          </Section>

          <Section title="Audit trail">
            <ul className="card space-y-1 text-xs text-bone-muted">
              {trail.length ? trail.map((e) => <li key={e.id}>{new Date(e.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {e.actor} · {e.action}{e.detail ? ` — ${e.detail.slice(0, 80)}` : ""}</li>) : <li>No actions yet.</li>}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
