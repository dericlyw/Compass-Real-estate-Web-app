import Link from "next/link";
import { LP_TEXT } from "@/app/lp/content";
import { readStore } from "@/lib/data/store";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Thanks({ params, searchParams }: { params: Promise<{ angle: string }>; searchParams: Promise<{ ref?: string; lang?: string }> }) {
  const { angle } = await params;
  const { ref, lang: l } = await searchParams;
  const lang: Lang = l === "bm" || l === "zh" ? l : "en";
  const t = LP_TEXT[lang];
  const p = (await readStore()).project;
  const wa = p.whatsappNumber ? `https://wa.me/${p.whatsappNumber}?text=${encodeURIComponent(`Urban Forest visit request — ref ${ref ?? ""}`)}` : null;
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <p className="eyebrow">Urban Forest</p>
      <h1 className="mt-3 text-3xl text-bone">{t.thanks}</h1>
      {ref ? <p className="mt-3 text-sm text-bone-dim">Ref {ref}</p> : null}
      {wa ? <a href={wa} className="btn-solid mx-auto mt-8 !px-6 !py-3">{t.whatsapp}</a> : null}
      <Link href={`/lp/${angle}?lang=${lang}`} className="btn-ghost mx-auto mt-4">←</Link>
    </main>
  );
}
