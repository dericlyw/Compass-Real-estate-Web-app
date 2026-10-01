// Content Engine starting profile for the pilot. Everything here is editable on /engine/profile.
// Signature details only restate verified or source-linked brief facts — the operator adds real ones.

import { personas, project } from "@/lib/data/urban-forest";
import type { EngineState, VoiceProfile } from "@/lib/types";

export function seedProfile(): VoiceProfile {
  return {
    business: `${project.name}, a mixed-use destination in Ipoh by ${project.developer}`,
    audience: "Ipoh families upgrading, Perak homecomers working in KL or Singapore, and out-of-town investors",
    tone: ["warm", "plain-spoken", "proud of Ipoh", "specific"],
    offerLine: "A place in Ipoh planned for food, stays and night-time life before it is built, and managed by TKB after it opens.",
    avoid: [],
    signatureDetails: ["Developed by Team Keris Berhad (TKB)", "Ipoh"],
    baseline: { hoursPerMonth: null, spendRM: null, weakestJob: null, slowestJob: null },
    // PRD §12 Q3 default: Monday 9:00 MYT, 3 pieces a week.
    session: { weekday: 1, time: "09:00", target: 3 },
  };
}

export function seedEngine(): EngineState {
  return { profile: seedProfile(), angles: [], pieces: [], sessions: [] };
}

/** Audience problems offered in the Angle step, drawn from the persona research. */
export function problemBank(): { personaId: string; persona: string; problem: string }[] {
  return personas.flatMap((p) => [...p.pains, ...p.objections].map((problem) => ({ personaId: p.id, persona: p.name, problem })));
}

/** Words that make an angle concrete: places, the project, and who it is for. */
export function specificityAnchors(): string[] {
  return [
    "ipoh", "perak", "kl", "kuala lumpur", "penang", "singapore", "urban forest", "tkb",
    "family", "families", "investor", "investors", "homecomer", "homecomers", "retiree", "retirees", "parents", "children", "kids",
    "operator", "operators", "owner", "owners", "buyer", "buyers", "tenant", "tenants", "visitor", "visitors",
    "keluarga", "pelabur", "pesara", "anak", "pembeli", "pengunjung", "peniaga",
    "怡保", "霹雳", "吉隆坡", "槟城", "新加坡", "家庭", "家人", "投资者", "父母", "孩子", "退休", "买家", "游客", "业者",
    "eateries", "food", "dinner", "night", "weekend", "makan", "malam", "美食", "夜晚", "周末",
  ];
}
