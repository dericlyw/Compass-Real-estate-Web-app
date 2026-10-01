import Link from "next/link";
import { bulkApprove } from "@/app/actions";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { readStore } from "@/lib/data/store";
import { angles } from "@/lib/data/urban-forest";
import { summary } from "@/lib/engine/compliance";
import type { ApprovalStatus, CreativeAsset } from "@/lib/types";
import { FORMAT_SPEC, LANGS } from "@/lib/types";

const COLS: [ApprovalStatus, string][] = [
  ["draft", "Draft · blocked"],
  ["needs_review", "Needs review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

function Card({ a }: { a: CreativeAsset }) {
  const c = summary(a.compliance);
  const blocks = a.compliance.filter((r) => r.level === "block").length;
  const warns = a.compliance.filter((r) => r.level === "warn").length;
  return (
    <Link href={`/approvals/${a.id}`} className="block rounded-lg border border-ink-600 bg-ink-900 p-3 transition hover:border-gold/60">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-bone-dim">{FORMAT_SPEC[a.format].label} · {a.lang.toUpperCase()}</span>
        <Badge tone={c === "block" ? "bad" : c === "warn" ? "warn" : "ok"}>{c === "block" ? `${blocks} block` : c === "warn" ? `${warns} warn` : "pass"}</Badge>
      </div>
      {a.engine ? <p className="mt-2"><Badge tone="gold">Content Engine</Badge></p> : null}
      <p className="mt-2 line-clamp-2 text-sm text-bone">{a.variants[0].hook}</p>
      <p className="mt-1 text-[11px] text-bone-dim">{a.personaId} · {a.platforms.join(", ")}</p>
    </Link>
  );
}

export default async function Approvals({ searchParams }: { searchParams: Promise<{ angle?: string; lang?: string }> }) {
  const { angle, lang } = await searchParams;
  const s = await readStore();
  const list = s.assets.filter((a) => (!angle || a.angleId === angle) && (!lang || a.lang === lang));
  const q = (k: string, v?: string) => {
    const p = new URLSearchParams();
    const next = { angle, lang, [k]: v };
    for (const [key, val] of Object.entries(next)) if (val) p.set(key, val);
    return `/approvals${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeader eyebrow="Stages 6–7 · Compliance gate + Approval queue" title="Approval queue">
        Nothing is published, spent or sent without a human approval. Blocked assets cannot be approved; editing an approved asset sends it back to review.
      </PageHeader>

      {list.every((a) => a.status === "draft") ? (
        <Notice tone="bad">Every asset is currently blocked by the gate. Open any card to see why — usually the missing permit numbers (Settings).</Notice>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href={q("angle")} className={!angle ? "btn" : "btn-ghost"}>All angles</Link>
        {angles.map((a) => <Link key={a.id} href={q("angle", a.id)} className={angle === a.id ? "btn" : "btn-ghost"}>{a.name}</Link>)}
        <span className="mx-2 h-5 w-px bg-ink-600" />
        <Link href={q("lang")} className={!lang ? "btn" : "btn-ghost"}>All</Link>
        {LANGS.map((l) => <Link key={l} href={q("lang", l)} className={lang === l ? "btn" : "btn-ghost"}>{l.toUpperCase()}</Link>)}
      </div>

      {angle ? (
        <form action={bulkApprove} className="mb-6">
          <input type="hidden" name="angleId" value={angle} />
          <button className="btn-solid" disabled={!s.assets.some((a) => a.angleId === angle && a.status === "needs_review")}>
            Bulk approve all passing “{angles.find((a) => a.id === angle)?.name}” assets
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {COLS.map(([st, label]) => {
          const items = list.filter((a) => a.status === st);
          return (
            <div key={st}>
              <h2 className="mb-3 text-lg text-bone">{label} ({items.length})</h2>
              <div className="space-y-2">{items.map((a) => <Card key={a.id} a={a} />)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
