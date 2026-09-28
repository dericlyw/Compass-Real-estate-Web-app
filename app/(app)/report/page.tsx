import { addSpend } from "@/app/actions";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader, Section } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { angles } from "@/lib/data/urban-forest";
import { cost, funnel, pct } from "@/lib/engine/metrics";
import { LANGS, PLATFORM_LABEL, type Platform } from "@/lib/types";

export default async function Report() {
  const s = await readStore();
  const all = funnel(s);
  const byAngle = angles.map((a) => ({ name: a.name, f: funnel(s, (l) => l.angleId === a.id, (x) => x.angleId === a.id) }));
  const byPlatform = (Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => ({ name: PLATFORM_LABEL[p], f: funnel(s, (l) => l.utm.utm_source === p, (x) => x.platform === p) }));
  const byLang = LANGS.map((l) => ({ name: l.toUpperCase(), f: funnel(s, (x) => x.lang === l, () => false) }));
  // Content Engine pieces tag utm_campaign with their own angle code (lib/engine/naming.ts).
  const byEngineAngle = (s.engine?.angles ?? [])
    .filter((a) => a.status === "used")
    .map((a) => ({ name: `${a.code} — ${a.sentence.slice(0, 48)}${a.sentence.length > 48 ? "…" : ""}`, f: funnel(s, (l) => l.utm.utm_campaign === `${s.project.slug}_${a.code}`, () => false) }));
  const demo = s.leads.some((l) => l.demo) || s.spend.some((x) => x.demo);
  const Table = ({ rows }: { rows: { name: string; f: ReturnType<typeof funnel> }[] }) => (
    <table className="table">
      <thead><tr><th /><th>Spend</th><th>Leads</th><th>Qual %</th><th>Appts</th><th>Show %</th><th>Bookings</th><th>SPA</th><th>CPL</th><th>Cost/appt</th><th>Cost/SPA</th></tr></thead>
      <tbody>
        {rows.map(({ name, f }) => (
          <tr key={name}>
            <td className="whitespace-nowrap text-bone">{name}</td>
            <td>{f.spend ? `RM ${f.spend.toLocaleString()}` : "—"}</td><td>{f.leads}</td><td>{pct(f.qualified, f.leads)}</td><td>{f.appointments}</td>
            <td>{pct(f.showed, f.appointments)}</td><td>{f.bookings}</td><td>{f.spas}</td>
            <td>{cost(f.spend, f.leads)}</td><td>{cost(f.spend, f.appointments)}</td><td>{cost(f.spend, f.spas)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <>
      <PageHeader eyebrow="Stage 11 · Reporting" title="Leadership one-pager">
        {s.project.name} · week ending {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })}
        {demo ? " · contains DEMO data — not for circulation" : ""}. Print or save as PDF from the browser.
      </PageHeader>
      <div className="no-print mb-6"><PrintButton /></div>
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Spend", all.spend ? `RM ${all.spend.toLocaleString()}` : "—"],
          ["Leads", String(all.leads)],
          ["Appointments", `${all.appointments} (${pct(all.appointments, all.leads)})`],
          ["SPAs", String(all.spas)],
          ["Cost per lead", cost(all.spend, all.leads)],
          ["Cost per appointment", cost(all.spend, all.appointments)],
          ["Show-up rate", pct(all.showed, all.appointments)],
          ["Cost per SPA", cost(all.spend, all.spas)],
        ].map(([k, v]) => (
          <div key={k} className="card !p-4"><p className="text-[11px] uppercase tracking-wider text-bone-dim">{k}</p><p className="mt-1 font-display text-2xl text-bone">{v}</p></div>
        ))}
      </div>
      <Section title="By angle"><div className="card overflow-x-auto"><Table rows={byAngle} /></div></Section>
      {byEngineAngle.length ? (
        <Section title="By Content Engine angle (organic, leads only)"><div className="card overflow-x-auto"><Table rows={byEngineAngle} /></div></Section>
      ) : null}
      <Section title="By platform"><div className="card overflow-x-auto"><Table rows={byPlatform} /></div></Section>
      <Section title="By language (leads only)"><div className="card overflow-x-auto"><Table rows={byLang} /></div></Section>
      <Section title="Log ad spend">
        <form action={addSpend} className="card no-print grid gap-3 sm:grid-cols-5">
          <input type="date" name="date" className="input" />
          <select name="platform" className="input">{Object.entries(PLATFORM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select name="angleId" className="input">{angles.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input name="amount" type="number" step="0.01" min="0" placeholder="Amount (RM)" className="input" />
          <button className="btn">Add</button>
        </form>
      </Section>
    </>
  );
}

