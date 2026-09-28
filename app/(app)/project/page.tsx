import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { angles, claims, missingInputs, personas, project, videoMap, VIDEO_ID } from "@/lib/data/urban-forest";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
const STATUS_TONE = { verified: "ok", unverified: "warn", conflict: "bad", high_risk: "bad" } as const;

export default function ProjectPage() {
  const top = [...videoMap].sort((a, b) => b.hook - a.hook).slice(0, 5).map((s) => s.id);
  return (
    <>
      <PageHeader eyebrow="Stages 2–3 · Video Study + Project Intelligence" title={project.name}>
        {project.developer} · {project.city}. Every claim is linked to its source. Unverified claims are flagged and cannot be used as fact until a
        document confirms them.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card !p-0 overflow-hidden">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
              title="Urban Forest concept film"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="px-4 py-3 text-xs text-bone-dim">
            Source: YouTube (3:27). Labelled &ldquo;Made with AI&rdquo; by YouTube, so all footage is treated as an artist&rsquo;s impression.
          </p>
        </div>
        <div className="space-y-3">
          <Notice tone="bad">
            <strong>High-risk claim blocked:</strong> the film states a <em>5.5% return with long-term lease and step-ups</em> (~2:12). It is excluded from all
            ads and landing pages until Legal approves the wording and disclaimers.
          </Notice>
          <Notice tone="warn">
            <strong>Locality conflict:</strong> title and PRD say <em>Bercham</em>; the voice-over says <em>Tambun</em> (~0:22). Copy says &ldquo;Ipoh&rdquo; until
            confirmed.
          </Notice>
          <Notice tone="warn">
            <strong>Timing note:</strong> transcript timings were recovered from the public link and rescaled to the 207 s runtime. The worker re-derives exact
            cuts from the master file.
          </Notice>
        </div>
      </div>

      <Section title="Video map" aside={<span className="text-xs text-bone-dim">video_map · {videoMap.length} scenes · scores: hook / emotion / clarity</span>}>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Time</th><th>Voice-over</th><th>Tags</th><th>Hook</th><th>Emo</th><th>Clar</th></tr>
            </thead>
            <tbody>
              {videoMap.map((s) => (
                <tr key={s.id}>
                  <td className="text-bone-dim">{s.id}</td>
                  <td className="whitespace-nowrap text-bone-muted">{fmt(s.start)}–{fmt(s.end)}</td>
                  <td className="max-w-md text-bone">
                    {s.line} {top.includes(s.id) ? <Badge tone="gold">top hook</Badge> : null}
                    {s.claimIds.includes("c-return") ? <> <Badge tone="bad">high-risk</Badge></> : null}
                  </td>
                  <td className="text-xs text-bone-dim">{s.tags.join(", ")}</td>
                  <td className={s.hook >= 8 ? "text-gold" : "text-bone-muted"}>{s.hook}</td>
                  <td className="text-bone-muted">{s.emotion}</td>
                  <td className="text-bone-muted">{s.clarity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Project brief — claims and sources">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Claim</th><th>Source</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-sm text-bone">{c.statement}<div className="text-[11px] text-bone-dim">{c.id} · {c.field}</div></td>
                  <td className="whitespace-nowrap text-xs text-bone-muted">{c.sources.map((s) => `${s.doc} ${s.locator}`).join(" · ")}</td>
                  <td><Badge tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ")}</Badge></td>
                  <td className="max-w-sm text-xs text-bone-dim">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Buyer personas">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {personas.map((p) => (
            <div key={p.id} className="card">
              <p className="font-display text-lg text-gold">{p.name}</p>
              <p className="mt-1 text-xs text-bone-muted">{p.who}</p>
              <dl className="mt-3 space-y-2 text-xs">
                {([["Pains", p.pains], ["Desires", p.desires], ["Objections", p.objections]] as const).map(([k, v]) => (
                  <div key={k}><dt className="text-bone-dim">{k}</dt><dd className="text-bone">{v.join(" · ")}</dd></div>
                ))}
                <div><dt className="text-bone-dim">Best angles</dt><dd className="text-bone">{p.bestAngles.map((a) => angles.find((x) => x.id === a)?.name).join(" · ")}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Missing case-study inputs">
        <div id="missing" className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Input</th><th>Why it matters</th><th /></tr></thead>
            <tbody>
              {missingInputs.map((m) => (
                <tr key={m.item}>
                  <td className="text-bone">{m.item}</td>
                  <td className="text-xs text-bone-muted">{m.why}</td>
                  <td>{m.blocking ? <Badge tone="bad">blocking</Badge> : <Badge>needed</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
