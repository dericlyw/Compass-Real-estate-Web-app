// Campaign Strategist — persona × funnel map, 30-day calendar, budget split.
// Budget is expressed as percentages only: no client budget has been supplied.

import { angles } from "@/lib/data/urban-forest";
import type { AssetFormat, FunnelStage, Lang, Platform } from "@/lib/types";

export const budgetSplit: { stage: FunnelStage; pct: number; why: string }[] = [
  { stage: "awareness", pct: 35, why: "Day-into-Night and 128 Eateries reels build a warm video-view audience cheaply (ThruPlay / 6s views)." },
  { stage: "consideration", pct: 30, why: "Planned-to-Perform and Reason-to-Stay drive landing-page visits and WhatsApp chats from warm viewers." },
  { stage: "conversion", pct: 25, why: "Lead forms + click-to-WhatsApp optimised for leads, retargeting 50%+ video viewers and LP visitors." },
  { stage: "retargeting", pct: 10, why: "Carousel + story to form openers and non-bookers; appointment-booking CTA." },
];

export const phases = [
  { days: "1–7", name: "Tease & learn", focus: "All 4 angles live at low spend; 3 hooks per asset compete. Kill bottom-third hooks on day 4 by 3-second view rate." },
  { days: "8–14", name: "Scale winners", focus: "Shift 60% of awareness budget to the top 2 angle×language pairs. Launch conversion ad sets to 50% viewers." },
  { days: "15–21", name: "Convert", focus: "Gallery-visit pushes: weekend slots, WhatsApp-first. Optimiser proposes new hooks from top performers." },
  { days: "22–30", name: "Close & retarget", focus: "Retarget form openers and no-shows. Leadership one-pager with cost per appointment by angle." },
];

export interface CalendarItem {
  day: number;
  angleId: string;
  format: AssetFormat;
  lang: Lang;
  platform: Platform;
  stage: FunnelStage;
  slot: string;
}

const ORDER: [string, AssetFormat, Platform][] = [
  ["night", "reel15", "tiktok"],
  ["food", "reel15", "meta"],
  ["planned", "feed30", "meta"],
  ["stay", "reel15", "youtube"],
  ["night", "carousel", "meta"],
  ["food", "story", "meta"],
  ["planned", "reel15", "tiktok"],
  ["stay", "feed30", "meta"],
];

const LANG_ROTATION: Lang[] = ["en", "zh", "bm"];
// Posting windows tuned for Malaysian mobile usage (lunch and after-dinner peaks).
const SLOTS = ["12:30", "20:30"];

export function calendar30(): CalendarItem[] {
  const items: CalendarItem[] = [];
  let k = 0;
  for (let day = 1; day <= 30; day++) {
    for (const slot of SLOTS) {
      const [angleId, format, platform] = ORDER[k % ORDER.length];
      const angle = angles.find((a) => a.id === angleId)!;
      const stage: FunnelStage = day > 21 && format !== "reel15" ? "retargeting" : day > 14 && angle.stage === "consideration" ? "conversion" : angle.stage;
      items.push({ day, angleId, format, lang: LANG_ROTATION[(k + day) % 3], platform, stage, slot });
      k++;
    }
  }
  return items;
}

export const channelPlan: { platform: Platform; role: string; langs: Lang[] }[] = [
  { platform: "meta", role: "Main lead engine: lead forms, click-to-WhatsApp, retargeting. Special Ad Category: Housing.", langs: ["en", "bm", "zh"] },
  { platform: "tiktok", role: "Hook testing and reach with Day-into-Night and 128 Eateries reels.", langs: ["bm", "zh", "en"] },
  { platform: "xhs", role: "Chinese-speaking investors and homecomers; organic notes from carousel stills.", langs: ["zh"] },
  { platform: "youtube", role: "Shorts for reach; full concept film as a retargeting source.", langs: ["en", "zh"] },
  { platform: "google", role: "Search capture for 'Urban Forest Ipoh' and brand terms once the locality is confirmed.", langs: ["en", "zh", "bm"] },
];
