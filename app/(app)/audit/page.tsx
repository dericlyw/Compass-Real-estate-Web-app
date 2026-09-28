import { PageHeader } from "@/components/ui";
import { readStore } from "@/lib/data/store";

export default async function Audit() {
  const s = await readStore();
  return (
    <>
      <PageHeader eyebrow="Governance" title="Audit log">Who approved, edited, booked or changed what, and when. Append-only.</PageHeader>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>When (MYT)</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>
            {[...s.audit].reverse().map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs text-bone-muted">{new Date(e.at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td>
                <td className="text-bone">{e.actor}</td>
                <td className="text-gold">{e.action}</td>
                <td className="font-mono text-xs text-bone-muted">{e.target}</td>
                <td className="max-w-md break-words text-xs text-bone-dim">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
