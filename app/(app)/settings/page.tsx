import { cookies } from "next/headers";
import { clearDemo, loadDemo, resetAll, saveSettings } from "@/app/actions";
import { Badge, PageHeader, Section } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/copywriter";
import { readStore } from "@/lib/data/store";

export default async function Settings() {
  const s = await readStore();
  const p = s.project;
  const reviewer = (await cookies()).get("pv_user")?.value ?? "";
  const hasDemo = s.leads.some((l) => l.demo);
  return (
    <>
      <PageHeader eyebrow="Project settings" title="Compliance inputs & workspace">
        Permit numbers go on every end card and landing page. Saving re-runs the compliance gate on all {s.assets.length} assets.
      </PageHeader>
      <form action={saveSettings} className="grid gap-6 lg:grid-cols-2">
        <Section title="Permits (Housing Development Act)">
          <div className="card grid gap-3">
            <div><label className="label">Developer licence no.</label><input name="developerLicence" defaultValue={p.permit.developerLicence ?? ""} className="input" placeholder="As issued by KPKT" /></div>
            <div><label className="label">Advertising &amp; sales permit (APDL) no.</label><input name="advertisingPermit" defaultValue={p.permit.advertisingPermit ?? ""} className="input" /></div>
            <div><label className="label">Validity</label><input name="validity" defaultValue={p.permit.validity ?? ""} className="input" placeholder="e.g. valid until dd/mm/yyyy" /></div>
            <div><label className="label">Approving authority</label><input name="approvingAuthority" defaultValue={p.permit.approvingAuthority ?? ""} className="input" /></div>
            <p className="text-xs text-bone-dim">Enter numbers exactly as printed on the permit. The system never generates them.</p>
          </div>
        </Section>
        <Section title="Lead capture">
          <div className="card grid gap-3">
            <div><label className="label">Sales WhatsApp number</label><input name="whatsapp" defaultValue={p.whatsappNumber ?? ""} className="input" placeholder="60XXXXXXXXX" /></div>
            <div><label className="label">Privacy policy URL (PDPA)</label><input name="privacyUrl" defaultValue={p.privacyUrl ?? ""} className="input" placeholder="https://" /></div>
            <div><label className="label">Your name (for the audit log)</label><input name="reviewer" defaultValue={reviewer} className="input" placeholder="e.g. Deric" /></div>
            <p className="text-xs text-bone-dim">AI Copywriter: {aiEnabled() ? <Badge tone="ok">on</Badge> : <Badge>off — set ANTHROPIC_API_KEY</Badge>}</p>
          </div>
        </Section>
        <div className="lg:col-span-2"><button className="btn-solid">Save &amp; re-run compliance</button></div>
      </form>

      <Section title="Demo & reset">
        <div className="card flex flex-wrap items-center gap-3">
          <form action={hasDemo ? clearDemo : loadDemo}><button className="btn">{hasDemo ? "Clear DEMO leads & spend" : "Load DEMO leads & spend"}</button></form>
          <form action={resetAll}><button className="btn-ghost border border-bad/50 text-bad">Reset workspace to generated campaign</button></form>
          <p className="w-full text-xs text-bone-dim">DEMO records are badged everywhere and flagged on the leadership report. Reset wipes approvals, leads and settings.</p>
        </div>
      </Section>
    </>
  );
}
