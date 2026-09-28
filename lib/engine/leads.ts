// Lead scoring and speed-to-lead reply drafts (AI qualifier runs in P1; MVP drafts the
// first WhatsApp message in the lead's language for a human to send in < 2 minutes).

import type { Lang, Lead, LeadScore } from "@/lib/types";

type Answers = Pick<Lead, "purpose" | "budget" | "timeline" | "financing">;

export function scoreLead(a: Answers): LeadScore {
  let s = 0;
  s += { "0_3m": 3, "3_6m": 2, "6_12m": 1, browsing: 0 }[a.timeline];
  s += { cash: 3, loan_approved: 3, loan_needed: 1, unsure: 0 }[a.financing];
  s += { own_stay: 1, invest: 1, business: 1, unsure: 0 }[a.purpose];
  s += a.budget === "unsure" ? 0 : 1;
  return s >= 6 ? "hot" : s >= 3 ? "warm" : "cold";
}

export function draftReply(name: string, lang: Lang, projectName: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  switch (lang) {
    case "bm":
      return `Hai ${first}, terima kasih kerana berminat dengan ${projectName}. Saya dari pasukan jualan TKB. Boleh saya tahu unit jenis apa yang anda cari, dan bila masa sesuai untuk lawatan ke galeri jualan? Kami ada slot hujung minggu ini.`;
    case "zh":
      return `${first} 您好，感谢您对 ${projectName} 的关注。我是 TKB 销售团队。请问您比较关注哪一类单位？什么时候方便来销售展厅参观？本周末还有时段可以预约。`;
    default:
      return `Hi ${first}, thanks for your interest in ${projectName}. I'm with the TKB sales team. Which unit type are you looking at, and when would suit you for a sales-gallery visit? We have slots this weekend.`;
  }
}

export const SLA_MINUTES = 2;

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 60000);
}
