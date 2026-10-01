import { signIn } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const needsCode = Boolean(process.env.ACCESS_CODE);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-display text-3xl text-bone">PropVid<span className="text-gold">.</span></p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-bone-dim">Campaign Engine · pilot test</p>
      <div className="rule my-6" />
      <form action={signIn} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <div>
          <label className="label">Your name</label>
          <input name="name" required maxLength={40} className="input" placeholder="Shown in the audit log and feedback" autoComplete="name" />
        </div>
        {needsCode ? (
          <div>
            <label className="label">Access code</label>
            <input name="code" required type="password" className="input" autoComplete="current-password" />
          </div>
        ) : null}
        {error ? <p className="text-sm text-bad">That access code is not right.</p> : null}
        <button className="btn-solid !py-2.5">Enter</button>
      </form>
      <p className="mt-6 text-xs leading-relaxed text-bone-dim">
        Test environment. Use dummy names and phone numbers when trying the landing pages.
      </p>
    </main>
  );
}
