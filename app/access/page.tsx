import { enterAccessCode } from "@/app/access/actions";

export const metadata = { title: "Access · PropVid test", robots: { index: false, follow: false } };

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={enterAccessCode} className="card w-full max-w-sm space-y-4">
        <div>
          <p className="eyebrow">Test environment</p>
          <h1 className="mt-2 font-display text-2xl text-bone">PropVid<span className="text-gold">.</span></h1>
          <p className="mt-2 text-sm text-bone-muted">Enter the access code you were given. Nothing here is live: ads are not published and leads are test entries.</p>
        </div>
        <input type="hidden" name="next" value={next ?? "/"} />
        <div><label className="label">Access code</label><input name="code" type="password" autoComplete="current-password" className="input" autoFocus /></div>
        <div><label className="label">Your name (shown in the audit log)</label><input name="name" className="input" placeholder="e.g. Aina, TKB Marketing" /></div>
        {error ? <p className="text-sm text-bad">That code is not right.</p> : null}
        <button className="btn-solid w-full">Enter</button>
      </form>
    </main>
  );
}
