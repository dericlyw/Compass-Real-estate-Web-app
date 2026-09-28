import { Badge, PageHeader, Section } from "@/components/ui";
import { library } from "@/lib/data/copy-library";
import { angles, personas, videoMap } from "@/lib/data/urban-forest";
import { budgetSplit, calendar30, channelPlan, phases } from "@/lib/engine/strategy";
import { FORMAT_SPEC, LANG_LABEL, PLATFORM_LABEL } from "@/lib/types";

const STAGE_TONE = { awareness: "gold", consideration: "ok", conversion: "warn", retargeting: "mute" } as const;

export default function CampaignPage() {
  const cal = calendar30();
  return (
    <>
      <PageHeader eyebrow="Stage 4 · Campaign Strategist" title="Campaign plan">
        Four angles mapped to five personas across the funnel, a 30-day calendar and a budget split. Budget is shown as a share only: no total has been set.
      </PageHeader>

      <Section title="Angles">
        <div className="grid gap-4 md:grid-cols-2">
          {angles.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl text-bone">{a.name}</p>
                <Badge tone={STAGE_TONE[a.stage]}>{a.stage}</Badge>
              </div>
              <p className="mt-1 text-sm text-bone-muted">{a.promise}</p>
              <p className="mt-3 text-xs text-bone-dim">
                Personas: {a.personas.map((p) => personas.find((x) => x.id === p)?.name).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-bone-dim">
                Scenes: {a.sceneIds.map((id) => `${id} “${videoMap.find((s) => s.id === id)?.line.slice(0, 32)}…”`).join(" · ")}
              </p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                {(["en", "bm", "zh"] as const).map((l) => (
                  <div key={l} className="rounded-md border border-ink-600 bg-ink-900 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-bone-dim">{LANG_LABEL[l]}</p>
                    <p className="mt-1 text-bone">&ldquo;{library[a.id][l].hooks[0]}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Budget split (recommended)">
          <div className="card space-y-4">
            {budgetSplit.map((b) => (
              <div key={b.stage}>
                <div className="flex justify-between text-sm"><span className="capitalize text-bone">{b.stage}</span><span className="text-gold">{b.pct}%</span></div>
                <div className="mt-1 h-1.5 rounded bg-ink-600"><div className="h-1.5 rounded bg-gold" style={{ width: `${b.pct}%` }} /></div>
                <p className="mt-1 text-xs text-bone-dim">{b.why}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Flight plan">
          <div className="card space-y-3">
            {phases.map((p) => (
              <div key={p.days} className="flex gap-4">
                <span className="w-14 shrink-0 font-display text-gold">D{p.days}</span>
                <div><p className="text-sm text-bone">{p.name}</p><p className="text-xs text-bone-dim">{p.focus}</p></div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Channel roles">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Channel</th><th>Role</th><th>Languages</th></tr></thead>
            <tbody>
              {channelPlan.map((c) => (
                <tr key={c.platform}><td className="whitespace-nowrap text-bone">{PLATFORM_LABEL[c.platform]}</td><td className="text-bone-muted">{c.role}</td><td className="text-xs text-bone-dim">{c.langs.join(" · ").toUpperCase()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="30-day content calendar" aside={<span className="text-xs text-bone-dim">{cal.length} placements · 12:30 & 20:30 MYT</span>}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
            <div key={d} className="rounded-lg border border-ink-600 bg-ink-800 p-2.5">
              <p className="font-display text-sm text-gold">Day {d}</p>
              {cal.filter((c) => c.day === d).map((c) => (
                <div key={c.slot} className="mt-1.5 text-[11px] leading-snug">
                  <span className="text-bone-dim">{c.slot}</span>{" "}
                  <span className="text-bone">{angles.find((a) => a.id === c.angleId)?.name.split(" ").slice(0, 3).join(" ")}</span>
                  <div className="text-bone-dim">{FORMAT_SPEC[c.format].label.split(" ")[0]} · {PLATFORM_LABEL[c.platform].split(" ")[0]} · {c.lang.toUpperCase()}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
