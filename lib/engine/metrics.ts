// Reporting — funnel from lead to SPA, costs per stage, sliced by angle / platform / language.

import type { Store } from "@/lib/types";

export interface Funnel {
  spend: number;
  leads: number;
  qualified: number;
  appointments: number;
  showed: number;
  bookings: number;
  spas: number;
  medianFirstResponseMin: number | null;
}

const REACHED: Record<string, number> = { new: 0, contacted: 1, qualified: 2, appointment: 3, no_show: 3, showed: 4, booking_fee: 5, spa: 6 };

export function funnel(s: Store, filter: (l: Store["leads"][number]) => boolean = () => true, spendFilter: (x: Store["spend"][number]) => boolean = () => true): Funnel {
  const leads = s.leads.filter(filter);
  const reached = (n: number) => leads.filter((l) => REACHED[l.stage] >= n || (n === 2 && l.score !== "cold" && REACHED[l.stage] >= 1)).length;
  const times = leads
    .filter((l) => l.firstResponseAt)
    .map((l) => (Date.parse(l.firstResponseAt!) - Date.parse(l.createdAt)) / 60000)
    .sort((a, b) => a - b);
  return {
    spend: s.spend.filter(spendFilter).reduce((t, x) => t + x.amountRM, 0),
    leads: leads.length,
    qualified: reached(2),
    appointments: reached(3),
    showed: reached(4),
    bookings: reached(5),
    spas: reached(6),
    medianFirstResponseMin: times.length ? Math.round(times[Math.floor(times.length / 2)] * 10) / 10 : null,
  };
}

export function cost(spend: number, n: number): string {
  if (!spend || !n) return "—";
  return `RM ${(spend / n).toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

export function pct(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 100)}%` : "—";
}
