import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl text-bone md:text-4xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-sm leading-relaxed text-bone-muted">{children}</div> : null}
      <div className="rule mt-6" />
    </header>
  );
}

const TONE = {
  gold: "border-gold/50 text-gold",
  ok: "border-ok/50 text-ok",
  warn: "border-warn/50 text-warn",
  bad: "border-bad/50 text-bad",
  mute: "border-ink-500 text-bone-muted",
} as const;

export function Badge({ tone = "mute", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] uppercase tracking-wider text-bone-dim">{label}</p>
      <p className="mt-2 font-display text-3xl text-bone">{value}</p>
      {hint ? <p className="mt-1 text-xs text-bone-dim">{hint}</p> : null}
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl text-bone">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "bad" | "ok" | "gold"; children: ReactNode }) {
  const c = { warn: "border-warn/40 bg-warn/5", bad: "border-bad/40 bg-bad/5", ok: "border-ok/40 bg-ok/5", gold: "border-gold/40 bg-gold/5" }[tone];
  return <div className={`mb-6 rounded-lg border px-4 py-3 text-sm text-bone ${c}`}>{children}</div>;
}
