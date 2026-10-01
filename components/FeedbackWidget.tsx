"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { submitFeedback } from "@/app/actions";

const KINDS = [
  ["bug", "Something's wrong"],
  ["idea", "Idea / change"],
  ["question", "Question"],
  ["praise", "Works well"],
] as const;

export function FeedbackWidget() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setSent(false); }}
        className="no-print fixed bottom-5 right-5 z-50 rounded-full border border-gold bg-ink-800 px-4 py-2.5 text-sm text-gold shadow-lg shadow-black/50 hover:bg-gold hover:text-ink"
      >
        Feedback
      </button>
    );

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 w-[min(92vw,360px)] rounded-xl border border-gold/50 bg-ink-800 p-4 shadow-2xl shadow-black/60">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg text-bone">Feedback on this page</p>
        <button type="button" onClick={() => setOpen(false)} className="text-bone-dim hover:text-bone" aria-label="Close">✕</button>
      </div>
      {sent ? (
        <p className="text-sm text-ok">Thank you — saved. Keep going.</p>
      ) : (
        <form
          action={(fd) => start(async () => { await submitFeedback(fd); setSent(true); })}
          className="grid gap-3"
        >
          <input type="hidden" name="page" value={path} />
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map(([k, label], i) => (
              <label key={k} className="cursor-pointer">
                <input type="radio" name="kind" value={k} defaultChecked={i === 1} className="peer sr-only" />
                <span className="inline-block rounded-full border border-ink-500 px-2.5 py-1 text-xs text-bone-muted peer-checked:border-gold peer-checked:text-gold">{label}</span>
              </label>
            ))}
          </div>
          <textarea name="text" required rows={4} maxLength={2000} className="input" placeholder="What did you expect? What would make this useful for TKB?" />
          <p className="text-[11px] text-bone-dim">Page: {path}</p>
          <button className="btn-solid" disabled={pending}>{pending ? "Saving…" : "Send"}</button>
        </form>
      )}
    </div>
  );
}
