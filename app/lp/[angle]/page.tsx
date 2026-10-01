import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submitLead } from "@/app/actions";
import { LP_TEXT } from "@/app/lp/content";
import { library } from "@/lib/data/copy-library";
import { readStore } from "@/lib/data/store";
import { angles, VIDEO_ID } from "@/lib/data/urban-forest";
import { permitLine } from "@/lib/engine/generate";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ angle: string }> }): Promise<Metadata> {
  const { angle } = await params;
  const a = angles.find((x) => x.id === angle);
  return { title: a ? `${a.name} · Urban Forest` : "Urban Forest", robots: { index: false } };
}

export default async function Landing({ params, searchParams }: { params: Promise<{ angle: string }>; searchParams: Promise<SP> }) {
  const { angle: angleId } = await params;
  const sp = await searchParams;
  const angle = angles.find((a) => a.id === angleId);
  if (!angle) notFound();
  const lang: Lang = sp.lang === "bm" || sp.lang === "zh" ? sp.lang : "en";
  const t = LP_TEXT[lang];
  const c = library[angle.id][lang];
  const s = await readStore();
  const p = s.project;
  const wa = p.whatsappNumber
    ? `https://wa.me/${p.whatsappNumber}?text=${encodeURIComponent(`${angle.name} — ${c.headlines[0]} (ref: ${sp.utm_content ?? "lp"})`)}`
    : null;
  const utm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const opt = (name: string, keys: string[]) => (
    <div>
      <label className="label">{t[name]}</label>
      <select name={name} className="input" defaultValue="">
        <option value="" disabled>—</option>
        {keys.map((k) => <option key={k} value={k}>{t[k]}</option>)}
      </select>
    </div>
  );
  const langHref = (l: Lang) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    q.set("lang", l);
    return `/lp/${angle.id}?${q}`;
  };

  return (
    <div className="min-h-screen bg-ink">
      {process.env.NEXT_PUBLIC_TEST_MODE !== "off" ? (
        <div className="bg-warn px-4 py-1.5 text-center text-xs font-medium text-ink">
          {{ en: "TEST VERSION — please use dummy details", bm: "VERSI UJIAN — sila guna butiran palsu", zh: "测试版本——请使用虚拟资料" }[lang]}
        </div>
      ) : null}
      <div className="relative">
        <div
          role="img"
          aria-label="Urban Forest — artist's impression"
          className="h-[52vh] w-full bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg), linear-gradient(160deg, #2F5D4A 0%, #121214 60%, #9C7A3A 130%)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4">
          <span className="font-display text-lg text-bone">Urban Forest</span>
          <nav className="flex gap-1 text-xs">
            {(["en", "bm", "zh"] as const).map((l) => (
              <Link key={l} href={langHref(l)} className={`rounded px-2 py-1 ${l === lang ? "bg-gold text-ink" : "text-bone-muted"}`}>{l === "zh" ? "中文" : l.toUpperCase()}</Link>
            ))}
          </nav>
        </div>
        <span className="absolute right-3 top-14 rounded bg-ink/70 px-2 py-0.5 text-[10px] text-bone-muted">{t.impression}</span>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl px-5 pb-8">
          <p className="eyebrow">{p.developer}</p>
          <h1 className="mt-2 text-4xl leading-tight text-bone md:text-5xl">{c.headlines[0]}</h1>
          <p className="mt-3 text-lg text-bone-muted">{c.hooks[0]}</p>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        <p className="text-base leading-relaxed text-bone">{c.long}</p>

        <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-ink-600">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`} title="Urban Forest film" allow="encrypted-media; picture-in-picture" allowFullScreen />
        </div>

        {wa ? <a href={wa} className="btn-solid mt-6 w-full !py-3 text-base">{t.whatsapp}</a> : null}

        <form action={submitLead} className="card mt-8 grid gap-4">
          <h2 className="text-2xl text-bone">{t.formTitle}</h2>
          {sp.error ? <p className="rounded border border-bad/50 bg-bad/10 p-2 text-sm text-bad">{sp.error === "consent" ? t.errConsent : t.errContact}</p> : null}
          <input type="hidden" name="angleId" value={angle.id} />
          <input type="hidden" name="lang" value={lang} />
          {utm.map((k) => (sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null))}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div><label className="label">{t.name}</label><input name="name" required maxLength={80} className="input" autoComplete="name" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">{t.phone}</label><input name="phone" required type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="+60" /></div>
            <div><label className="label">{t.email}</label><input name="email" type="email" className="input" autoComplete="email" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {opt("purpose", ["own_stay", "invest", "business", "unsure"])}
            {opt("budget", ["under_500k", "500k_1m", "above_1m", "unsure"])}
            {opt("timeline", ["0_3m", "3_6m", "6_12m", "browsing"])}
            {opt("financing", ["cash", "loan_approved", "loan_needed", "unsure"])}
          </div>
          <div><label className="label">{t.interest}</label><input name="interest" maxLength={200} className="input" /></div>
          <label className="flex gap-3 text-xs leading-relaxed text-bone-muted">
            <input type="checkbox" name="consent" required className="mt-0.5 accent-[#C9A45C]" />
            <span>
              {t.consent}{" "}
              {p.privacyUrl ? <a href={p.privacyUrl} className="text-gold underline" target="_blank" rel="noreferrer">{t.privacy}</a> : <span className="text-warn">[{t.privacy}: URL pending]</span>}
            </span>
          </label>
          <button className="btn-solid !py-3 text-base">{t.submit}</button>
        </form>

        <footer className="mt-10 space-y-1 text-[11px] leading-relaxed text-bone-dim">
          <p>{p.name} · {p.developer}</p>
          <p>{permitLine(p, lang)}</p>
          <p>{t.impression}</p>
        </footer>
      </main>
    </div>
  );
}
