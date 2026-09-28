// DEMO data for walkthroughs only. Every record carries demo: true and is badged in the UI.
// These are not real people or real spend.

import { draftReply, scoreLead } from "@/lib/engine/leads";
import type { AdSpend, Lang, Lead } from "@/lib/types";

const rows: [string, Lang, Lead["purpose"], Lead["budget"], Lead["timeline"], Lead["financing"], string, string, number][] = [
  ["Demo Lead A", "en", "invest", "500k_1m", "0_3m", "loan_approved", "planned", "meta", 3],
  ["Demo Lead B", "zh", "invest", "above_1m", "0_3m", "cash", "stay", "xhs", 11],
  ["Demo Lead C", "bm", "own_stay", "under_500k", "3_6m", "loan_needed", "night", "tiktok", 42],
  ["Demo Lead D", "en", "business", "unsure", "6_12m", "unsure", "food", "meta", 95],
  ["Demo Lead E", "zh", "own_stay", "500k_1m", "3_6m", "loan_approved", "night", "meta", 180],
  ["Demo Lead F", "bm", "unsure", "unsure", "browsing", "unsure", "food", "tiktok", 400],
  ["Demo Lead G", "en", "invest", "500k_1m", "0_3m", "cash", "planned", "google", 700],
];

export function demoLeads(projectName: string): Lead[] {
  return rows.map(([name, lang, purpose, budget, timeline, financing, angleId, src, minsAgo], i) => {
    const answers = { purpose, budget, timeline, financing };
    const created = new Date(Date.now() - minsAgo * 60000).toISOString();
    return {
      id: `demo-${i}`,
      createdAt: created,
      name,
      phone: "+60 0000 0000",
      lang,
      ...answers,
      interest: "",
      consentAt: created,
      utm: { utm_source: src, utm_medium: "paid_social", utm_campaign: `urban-forest_${angleId}` },
      angleId,
      score: scoreLead(answers),
      stage: minsAgo > 60 ? "contacted" : "new",
      firstResponseAt: minsAgo > 60 ? new Date(Date.parse(created) + 90000).toISOString() : undefined,
      draftReply: draftReply(name, lang, projectName),
      notes: [],
      demo: true,
    };
  });
}

export function demoSpend(): AdSpend[] {
  const today = new Date().toISOString().slice(0, 10);
  return (
    [
      ["meta", "planned", 420],
      ["meta", "night", 310],
      ["tiktok", "food", 260],
      ["xhs", "stay", 180],
      ["google", "planned", 90],
    ] as const
  ).map(([platform, angleId, amountRM], i) => ({ id: `demo-spend-${i}`, date: today, platform, angleId, amountRM, demo: true }));
}
