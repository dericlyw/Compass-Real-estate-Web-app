import { bookAppointment, markContacted, setLeadStage } from "@/app/actions";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { angles } from "@/lib/data/urban-forest";
import { minutesSince, SLA_MINUTES } from "@/lib/engine/leads";
import type { LeadStage } from "@/lib/types";

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "appointment", "showed", "no_show", "booking_fee", "spa"];
const LABEL: Record<string, string> = { own_stay: "own stay", invest: "invest", business: "business", unsure: "unsure", under_500k: "< RM500k", "500k_1m": "RM500k–1m", above_1m: "> RM1m", "0_3m": "0–3 mths", "3_6m": "3–6 mths", "6_12m": "6–12 mths", browsing: "browsing", cash: "cash", loan_approved: "loan approved", loan_needed: "needs loan" };

export default async function Leads() {
  const s = await readStore();
  const free = s.slots.filter((x) => !x.leadId && Date.parse(x.start) > Date.now()).slice(0, 12);
  const waiting = s.leads.filter((l) => !l.firstResponseAt);
  return (
    <>
      <PageHeader eyebrow="Stage 9 · Lead capture & qualifier" title="Lead inbox">
        Speed-to-lead wins. Each lead arrives scored with a first WhatsApp reply drafted in their language — send it within {SLA_MINUTES} minutes. Hot leads go
        to a negotiator immediately.
      </PageHeader>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Leads" value={s.leads.length} />
        <Stat label="Hot" value={s.leads.filter((l) => l.score === "hot").length} />
        <Stat label="Awaiting first reply" value={waiting.length} />
        <Stat label="Breaching SLA" value={waiting.filter((l) => minutesSince(l.createdAt) >= SLA_MINUTES).length} hint={`> ${SLA_MINUTES} min`} />
      </div>
      {!s.leads.length ? <div className="card text-sm text-bone-muted">No leads yet. Share a landing page (e.g. <a className="text-gold underline" href="/lp/planned">/lp/planned</a>) or load DEMO data in Settings.</div> : null}
      <div className="space-y-3">
        {s.leads.map((l) => {
          const age = minutesSince(l.createdAt);
          const breach = !l.firstResponseAt && age >= SLA_MINUTES;
          const wa = `https://wa.me/${l.phone.replace(/\D/g, "")}?text=${encodeURIComponent(l.draftReply)}`;
          return (
            <div key={l.id} className={`card ${breach ? "border-bad/60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-bone">
                    {l.name} {l.demo ? <Badge>DEMO</Badge> : null}
                  </p>
                  <p className="text-xs text-bone-dim">
                    {l.phone} · {l.lang.toUpperCase()} · {angles.find((a) => a.id === l.angleId)?.name ?? "—"} · source {l.utm.utm_source ?? "direct"}
                    {l.utm.utm_content ? ` · ${l.utm.utm_content}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={l.score === "hot" ? "bad" : l.score === "warm" ? "warn" : "mute"}>{l.score}</Badge>
                  <Badge tone={breach ? "bad" : l.firstResponseAt ? "ok" : "warn"}>
                    {l.firstResponseAt ? "replied" : `${age} min waiting`}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-bone-muted">
                {LABEL[l.purpose]} · {LABEL[l.budget]} · {LABEL[l.timeline]} · {LABEL[l.financing]} {l.interest ? `· “${l.interest}”` : ""}
              </p>
              <div className="mt-3 rounded-md border border-ink-600 bg-ink-900 p-3 text-sm text-bone">{l.draftReply}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={wa} target="_blank" rel="noreferrer" className="btn-solid">Open WhatsApp with draft</a>
                <form action={markContacted}><input type="hidden" name="id" value={l.id} /><button className="btn">Mark replied</button></form>
                <form action={setLeadStage} className="flex gap-1">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="stage" defaultValue={l.stage} className="input !w-auto !py-1.5">{STAGES.map((st) => <option key={st} value={st}>{st.replace("_", " ")}</option>)}</select>
                  <button className="btn-ghost">Set</button>
                </form>
                {l.stage !== "appointment" && free.length ? (
                  <form action={bookAppointment} className="flex gap-1">
                    <input type="hidden" name="leadId" value={l.id} />
                    <select name="slotId" className="input !w-auto !py-1.5">
                      {free.map((x) => <option key={x.id} value={x.id}>{new Date(x.start).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric" })} · {x.negotiator}</option>)}
                    </select>
                    <button className="btn-ghost">Book visit</button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
