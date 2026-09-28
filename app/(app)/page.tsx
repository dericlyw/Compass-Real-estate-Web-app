import Link from "next/link";
import { Badge, Notice, PageHeader, Section, Stat } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { angles, claims, missingInputs, videoMap } from "@/lib/data/urban-forest";
import { summary } from "@/lib/engine/compliance";
import { cost, funnel, pct } from "@/lib/engine/metrics";

export default async function Overview() {
  const s = await readStore();
  const blocked = s.assets.filter((a) => summary(a.compliance) === "block").length;
  const review = s.assets.filter((a) => a.status === "needs_review").length;
  const approved = s.assets.filter((a) => a.status === "approved").length;
  const f = funnel(s);
  const permitMissing = !s.project.permit.developerLicence || !s.project.permit.advertisingPermit;

  const stages: [string, "done" | "partial" | "waiting", string][] = [
    ["Ingest", "partial", "YouTube link ingested; master file pending"],
    ["Video Study", "done", `${videoMap.length} scenes mapped, hooks scored`],
    ["Project Intelligence", "partial", `${claims.length} claims, ${claims.filter((c) => c.status === "high_risk").length} high-risk, brochure pending`],
    ["Strategise", "done", "4 angles · 5 personas · 30-day calendar"],
    ["Create", "done", `${s.assets.length} assets × 3 variants`],
    ["Comply", blocked ? "partial" : "done", blocked ? `${blocked} blocked` : "all passed"],
    ["Approve", approved ? "partial" : "waiting", `${approved} approved · ${review} in review`],
    ["Launch Kit", approved ? "partial" : "waiting", approved ? "exportable" : "needs approved assets"],
    ["Capture", s.leads.length ? "partial" : "waiting", `${s.leads.length} leads`],
    ["Nurture", "waiting", "P1: WhatsApp Cloud API"],
    ["Book", s.appointments.length ? "partial" : "waiting", `${s.appointments.length} appointments`],
    ["Report", "partial", "live dashboard + one-pager"],
  ];

  return (
    <>
      <PageHeader eyebrow="Pilot · Urban Forest @ Bercham" title="One film. A month of campaigns.">
        Every asset exists to create a booked sales-gallery visit. The system drafts; people approve.
      </PageHeader>

      {permitMissing ? (
        <Notice tone="bad">
          <strong className="text-bad">All {s.assets.length} assets are blocked</strong> by the compliance gate: the developer licence and advertising &amp; sales permit
          numbers are missing. <Link href="/settings" className="text-gold underline">Enter them in Settings</Link> to release assets to the approval queue.
        </Notice>
      ) : null}

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Assets generated" value={s.assets.length} hint="4 angles × 3 languages × 4 formats" />
        <Stat label="Blocked by compliance" value={blocked} hint="must be 0 before launch" />
        <Stat label="Awaiting review" value={review} />
        <Stat label="Approved" value={approved} hint="goal G1: ≥ 40 within 48h" />
      </div>

      <Section title="Pipeline">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map(([name, st, note], i) => (
            <li key={name} className="card flex items-start gap-3 !p-4">
              <span className="font-display text-lg text-gold/70">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-bone">{name}</span>
                  <Badge tone={st === "done" ? "ok" : st === "partial" ? "warn" : "mute"}>{st}</Badge>
                </div>
                <p className="mt-1 text-xs text-bone-dim">{note}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Funnel to SPA" aside={<Link href="/report" className="btn-ghost">Leadership one-pager →</Link>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Stat label="Spend" value={f.spend ? `RM ${f.spend.toLocaleString()}` : "—"} />
          <Stat label="Leads" value={f.leads} hint={cost(f.spend, f.leads) + " / lead"} />
          <Stat label="Qualified" value={f.qualified} hint={pct(f.qualified, f.leads)} />
          <Stat label="Appointments" value={f.appointments} hint={`${pct(f.appointments, f.leads)} · goal ≥ 15%`} />
          <Stat label="Showed" value={f.showed} hint={pct(f.showed, f.appointments)} />
          <Stat label="Booking fee" value={f.bookings} />
          <Stat label="SPA" value={f.spas} hint={cost(f.spend, f.spas) + " / SPA"} />
        </div>
        <p className="mt-3 text-xs text-bone-dim">
          Median first response: {f.medianFirstResponseMin ?? "—"} min (goal &lt; 2). {s.leads.some((l) => l.demo) ? "Includes DEMO records." : ""}
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Angles">
          <div className="space-y-2">
            {angles.map((a) => {
              const as = s.assets.filter((x) => x.angleId === a.id);
              return (
                <div key={a.id} className="card flex items-center justify-between !p-4">
                  <div>
                    <p className="font-display text-bone">{a.name}</p>
                    <p className="text-xs text-bone-dim">{a.stage} · {a.promise}</p>
                  </div>
                  <span className="text-xs text-bone-muted">{as.filter((x) => x.status === "approved").length}/{as.length} approved</span>
                </div>
              );
            })}
          </div>
        </Section>
        <Section title="Blocking inputs from TKB">
          <ul className="card space-y-2 text-sm">
            {missingInputs.filter((m) => m.blocking).map((m) => (
              <li key={m.item} className="flex gap-2">
                <span className="text-bad">●</span>
                <span><span className="text-bone">{m.item}</span> <span className="text-bone-dim">— {m.why}</span></span>
              </li>
            ))}
            <li className="pt-2 text-xs"><Link href="/project#missing" className="text-gold underline">Full list of missing case-study inputs</Link></li>
          </ul>
        </Section>
      </div>
    </>
  );
}
