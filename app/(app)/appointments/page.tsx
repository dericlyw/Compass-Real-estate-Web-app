import { logOutcome } from "@/app/actions";
import { Badge, PageHeader, Section } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { angles, personas } from "@/lib/data/urban-forest";

export default async function Appointments() {
  const s = await readStore();
  const appts = [...s.appointments].sort((a, b) => Date.parse(s.slots.find((x) => x.id === a.slotId)!.start) - Date.parse(s.slots.find((x) => x.id === b.slotId)!.start));
  const days = [...new Set(s.slots.map((x) => x.start.slice(0, 10)))].slice(0, 7);
  return (
    <>
      <PageHeader eyebrow="Stage 10 · Appointment booking" title="Sales-gallery appointments">
        Reminders go out 24 hours and 2 hours before each visit, with the directions pin. Negotiators get a pre-visit brief and log the outcome here —
        it is the source of truth for show-up rate, bookings and SPAs.
      </PageHeader>

      <Section title="Upcoming visits">
        {!appts.length ? <div className="card text-sm text-bone-muted">No appointments yet. Book one from the Lead Inbox.</div> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {appts.map((a) => {
            const slot = s.slots.find((x) => x.id === a.slotId)!;
            const l = s.leads.find((x) => x.id === a.leadId);
            if (!l) return null;
            const angle = angles.find((x) => x.id === l.angleId);
            const persona = personas.find((p) => angle?.personas.includes(p.id) && (l.purpose === "invest" ? p.id === "investor" : true));
            return (
              <div key={a.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg text-gold">{new Date(slot.start).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                    <p className="text-sm text-bone">{l.name} {l.demo ? <Badge>DEMO</Badge> : null} · {slot.negotiator}</p>
                  </div>
                  {a.outcome ? <Badge tone={a.outcome === "no_show" ? "bad" : "ok"}>{a.outcome.replace("_", " ")}</Badge> : <Badge tone="warn">pending</Badge>}
                </div>
                <div className="mt-3 rounded-md border border-ink-600 bg-ink-900 p-3 text-xs text-bone-muted">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-gold">Pre-visit brief</p>
                  <p>Score <span className="text-bone">{l.score}</span> · purpose <span className="text-bone">{l.purpose.replace("_", " ")}</span> · budget <span className="text-bone">{l.budget.replace(/_/g, " ")}</span> · timeline <span className="text-bone">{l.timeline.replace(/_/g, " ")}</span> · financing <span className="text-bone">{l.financing.replace(/_/g, " ")}</span></p>
                  <p>Saw ad: <span className="text-bone">{l.utm.utm_content ?? angle?.name ?? "direct"}</span> via {l.utm.utm_source ?? "direct"} · prefers {l.lang.toUpperCase()}</p>
                  {persona ? <p>Likely objections: <span className="text-bone">{persona.objections.join("; ")}</span></p> : null}
                  {l.interest ? <p>Asked: <span className="text-bone">{l.interest}</span></p> : null}
                </div>
                <p className="mt-2 text-[11px] text-bone-dim">Reminders: {a.reminders.map((r) => `${r.kind} ${new Date(r.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "numeric" })} (${r.status})`).join(" · ")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["no_show", "visited", "booking_fee", "spa"] as const).map((o) => (
                    <form key={o} action={logOutcome}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="outcome" value={o} />
                      <button className={a.outcome === o ? "btn-solid" : "btn"}>{o.replace("_", " ")}</button>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Slot availability (next 7 days with slots)">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Date</th><th>Negotiator 1</th><th>Negotiator 2</th></tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d}>
                  <td className="whitespace-nowrap text-bone">{new Date(d + "T00:00:00").toLocaleDateString("en-MY", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}</td>
                  {["Negotiator 1", "Negotiator 2"].map((n) => (
                    <td key={n} className="text-xs">
                      {s.slots.filter((x) => x.start.slice(0, 10) === d && x.negotiator === n).map((x) => (
                        <span key={x.id} className={`mr-2 ${x.leadId ? "text-gold" : "text-bone-dim"}`}>{new Date(x.start).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric" })}{x.leadId ? " ●" : ""}</span>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-bone-dim">Negotiator names are placeholders until TKB provides the sales roster.</p>
        </div>
      </Section>
    </>
  );
}
