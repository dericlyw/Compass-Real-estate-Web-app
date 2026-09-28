// Urban Forest @ Bercham — case-study source data.
// Rule: never invent prices, permit numbers or unit counts. Anything not in a
// source document is null / flagged. See /docs/MISSING_INPUTS.md.

import type { Angle, Claim, Persona, Project, VideoScene } from "@/lib/types";

export const VIDEO_ID = "BK0CO1hdOqA";
export const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;
const DURATION = 207; // 3:27, from YouTube metadata

export const project: Project = {
  id: "proj_urban_forest",
  slug: "urban-forest",
  name: "Urban Forest @ Bercham",
  developer: "Team Keris Berhad (TKB)",
  city: "Ipoh, Perak",
  videoUrl: VIDEO_URL,
  videoDurationSec: DURATION,
  whatsappNumber: null,
  privacyUrl: null,
  permit: { developerLicence: null, advertisingPermit: null, validity: null, approvingAuthority: null },
  priceList: [],
};

export const claims: Claim[] = [
  {
    id: "c-location",
    field: "location",
    statement: "Located in Bercham, Ipoh",
    sources: [
      { doc: "prd", locator: "§2 Pilot" },
      { doc: "video", locator: "YouTube title" },
    ],
    status: "conflict",
    note: "Voice-over at ~0:22 says 'Tambun, Ipoh'. Confirm the correct locality before any copy names it. Copy currently says 'Ipoh' only.",
  },
  {
    id: "c-components",
    field: "components",
    statement: "Mixed-use: The Miner (303 units), The Dulang (345 units), The Plantations villas, Riverboat F&B, retail",
    sources: [{ doc: "prd", locator: "§2 Pilot" }],
    status: "unverified",
    note: "From client PRD. Confirm unit counts against brochure / price list. Villa count not provided.",
  },
  {
    id: "c-developer",
    field: "developer",
    statement: "Developed by Team Keris Berhad (TKB)",
    sources: [
      { doc: "prd", locator: "§2 Pilot" },
      { doc: "video", locator: "~3:06 (TKB continues managing)" },
    ],
    status: "verified",
  },
  {
    id: "c-ipoh",
    field: "location_context",
    statement: "Ipoh is known for nature, food and cultural heritage",
    sources: [{ doc: "video", locator: "0:00–0:12" }],
    status: "verified",
    note: "General context about the city, not a project claim.",
  },
  {
    id: "c-day-night",
    field: "usp",
    statement: "Dining, entertainment, lights and night-time experiences designed to keep the city alive from day into night",
    sources: [{ doc: "video", locator: "~1:00–1:27" }],
    status: "unverified",
    note: "Stated as an aim ('aims to'). Keep phrasing aspirational.",
  },
  {
    id: "c-theme-stays",
    field: "usp",
    statement: "Theme stays, relaxing getaways and immersive spaces with stories and character",
    sources: [{ doc: "video", locator: "~0:33–0:49" }],
    status: "unverified",
  },
  {
    id: "c-hospitality",
    field: "operator",
    statement: "Accommodation suites to be operated by a hospitality brand (described as 'world-class')",
    sources: [{ doc: "video", locator: "~0:49" }],
    status: "unverified",
    note: "Operator not named. Do not use 'world-class' in ads until the operator agreement is on file.",
  },
  {
    id: "c-128",
    field: "f&b_count",
    statement: "128 eateries curated without duplication",
    sources: [{ doc: "video", locator: "~2:52" }],
    status: "unverified",
    note: "Verify against leasing plan / brochure before launch.",
  },
  {
    id: "c-brands",
    field: "tenants",
    statement: "Established international and local brands",
    sources: [{ doc: "video", locator: "~2:42" }],
    status: "unverified",
    note: "No brand names or LOIs provided. Not used in ad copy.",
  },
  {
    id: "c-planned",
    field: "usp",
    statement: "Commercial mix, hospitality and attractions planned as one connected ecosystem before completion, with traffic flow and operating strategy",
    sources: [{ doc: "video", locator: "~1:38–2:04" }],
    status: "unverified",
  },
  {
    id: "c-tenant-secured",
    field: "tenants",
    statement: "Tenant mix secured early so operators can prepare before completion",
    sources: [{ doc: "video", locator: "~2:04" }],
    status: "unverified",
    note: "Needs signed tenancy evidence. Not used in ad copy.",
  },
  {
    id: "c-managed",
    field: "management",
    statement: "TKB continues actively managing the destination after opening",
    sources: [{ doc: "video", locator: "~3:06" }],
    status: "unverified",
  },
  {
    id: "c-ipoh-city-day",
    field: "events",
    statement: "Extends the celebration of Ipoh City Day by MBI",
    sources: [{ doc: "video", locator: "~1:27" }],
    status: "unverified",
    note: "References Majlis Bandaraya Ipoh. Needs MBI consent before use in paid ads. Not used.",
  },
  {
    id: "c-return",
    field: "investment_return",
    statement: "5.5% return, long-term lease and contractual step-ups",
    sources: [{ doc: "video", locator: "~2:12" }],
    status: "high_risk",
    note: "Investment-return claim. Blocked from all ads and landing pages until Legal confirms the lease structure, wording and disclaimers. Never phrase as 'guaranteed'.",
  },
];

// Transcript timings from the extraction run past the 207 s runtime (max ≈ 330 s),
// so they are scaled to the real duration. The worker re-derives exact cuts from the source file.
const SCALE = DURATION / 330;
const raw: [number, string, string[], number, number, number, string[]][] = [
  [0, "Ipoh, a city where nature, food, and rich cultural heritage come together.", ["aerial", "city", "heritage"], 8, 6, 5, ["c-ipoh"]],
  [6, "Its scenic landscapes, warm hospitality, and authentic local flavours continue to draw visitors from near and far, year after year.", ["landscape", "lifestyle", "food"], 5, 6, 4, ["c-ipoh"]],
  [19, "Yet, when the day's journey comes to an end, where do visitors go?", ["dusk", "question"], 9, 7, 6, []],
  [27, "And what will give them a reason to stay in Ipoh a little longer?", ["dusk", "question"], 8, 7, 6, []],
  [35, "Today, a new destination is taking shape in Tambun, Ipoh.", ["aerial", "site", "reveal"], 7, 6, 7, ["c-location"]],
  [43, "A place designed to bring the city's experiences together.", ["masterplan", "reveal"], 6, 6, 7, ["c-planned"]],
  [51, "Urban Forest.", ["title", "facade"], 7, 7, 8, []],
  [53, "From theme stays and relaxing getaways to immersive spaces filled with stories and character, the journey becomes more than just a stop along the way.", ["interior", "hospitality", "lifestyle"], 6, 8, 7, ["c-theme-stays"]],
  [78, "We are having a world-class hospitality brand to operate the accommodation suites.", ["hotel", "interior"], 5, 5, 8, ["c-hospitality"]],
  [88, "And in Ipoh, no experience is complete without food.", ["food", "close-up"], 9, 8, 6, ["c-ipoh"]],
  [95, "From the familiar flavours of Ipoh to a more diverse culinary experience, Urban Forest aims to keep the city alive from day into night.", ["food", "night", "crowd"], 7, 8, 8, ["c-day-night"]],
  [109, "From local delicacies to international cuisine.", ["food", "close-up"], 8, 7, 6, ["c-day-night"]],
  [114, "Dining, entertainment, lights, and nighttime experiences, creating something for everyone and memories for every generation.", ["night", "lights", "family", "crowd"], 8, 9, 7, ["c-day-night"]],
  [138, "Extending the celebration of Ipoh city day by MBI, bringing the spirits of Ipoh beyond a single day.", ["event", "night"], 6, 7, 4, ["c-ipoh-city-day"]],
  [152, "So, what makes Urban Forest different?", ["title", "question"], 8, 5, 6, []],
  [157, "We don't wait until completion and hope it works.", ["planning", "statement"], 9, 6, 8, ["c-planned"]],
  [164, "We plan how it will operate before we build it.", ["planning", "masterplan"], 8, 6, 9, ["c-planned"]],
  [174, "Before construction is completed, the commercial mix, hospitality, and attractions are already planned as one connected ecosystem along with traffic flow and operating strategy.", ["masterplan", "diagram"], 5, 5, 9, ["c-planned"]],
  [198, "Because the tenant mix is secured early, operators can prepare before completion reducing the wait between handover and rental income.", ["tenants", "diagram"], 4, 4, 8, ["c-tenant-secured"]],
  [210, "For the investor, the return structure is established upfront with a 5.5% return, a long-term lease and contractual step-ups for greater income visibility.", ["investor", "numbers"], 6, 4, 9, ["c-return"]],
  [235, "First, professional hospitality and tour management continuously brings visitors into the ecosystem turning accommodation, tourism and commercial activity into one connected destination.", ["hospitality", "crowd"], 5, 5, 7, ["c-hospitality"]],
  [258, "Second, established international and local brands create immediate recognition giving people stronger reasons to visit, spend and return.", ["retail", "brands"], 5, 5, 6, ["c-brands"]],
  [274, "Third, 128 eateries are curated without duplication creating greater variety while reducing internal competition.", ["food", "numbers"], 8, 6, 9, ["c-128"]],
  [297, "TKB continues actively managing the destination after opening.", ["management"], 5, 5, 7, ["c-managed", "c-developer"]],
  [302, "Urban Forest is planned to perform, managed to sustain and structured for long-term returns.", ["title", "tagline"], 6, 6, 6, ["c-planned", "c-managed"]],
  [322, "Urban Forest, where your investment is built to keep working.", ["endcard", "tagline"], 6, 6, 5, []],
];

export const videoMap: VideoScene[] = raw.map(([start, line, tags, hook, emotion, clarity, claimIds], i) => {
  const next = raw[i + 1]?.[0] ?? 330;
  return {
    id: `s${String(i + 1).padStart(2, "0")}`,
    start: Math.round(start * SCALE * 10) / 10,
    end: Math.round(next * SCALE * 10) / 10,
    line,
    tags,
    // YouTube labels this film "Made with AI — altered or fully generated", so every
    // development visual is treated as an artist's impression.
    isRender: true,
    hook,
    emotion,
    clarity,
    claimIds,
  };
});

export const personas: Persona[] = [
  {
    id: "investor",
    name: "The Out-of-Town Investor",
    who: "35–55, KL / Penang / Singapore-based professional or business owner; owns 1–3 properties; wants income visibility outside the Klang Valley.",
    pains: ["Oversupplied serviced-apartment markets", "Projects that open half-empty", "Managing tenants from afar"],
    desires: ["A destination with footfall planned in", "Professional operator and management", "Clear, documented terms"],
    objections: ["Is Ipoh demand real beyond weekends?", "Who operates it, and what are the terms?", "What happens after the developer leaves?"],
    bestAngles: ["planned", "stay"],
  },
  {
    id: "homecomer",
    name: "The Ipoh Homecomer",
    who: "30–45, grew up in Perak, now working in KL or Singapore; wants a stake back home and a place for family visits.",
    pains: ["Ipoh feels quiet after dark", "Nowhere to bring friends when back home", "Hard to judge projects from far away"],
    desires: ["Pride in a new Ipoh landmark", "Somewhere lively near family", "Easy WhatsApp-first buying process"],
    objections: ["Will it really be busy?", "Can I view and buy remotely?"],
    bestAngles: ["night", "stay"],
  },
  {
    id: "family",
    name: "The Local Upgrader Family",
    who: "32–50, Ipoh-based dual-income family looking to upgrade; values lifestyle amenities and green space.",
    pains: ["Weekend outings mean driving across town", "Few family-friendly night spots"],
    desires: ["Food, entertainment and nature on the doorstep", "Memories for every generation"],
    objections: ["Noise and traffic from a busy destination", "Completion timeline"],
    bestAngles: ["night", "food"],
  },
  {
    id: "retiree",
    name: "The Legacy Buyer",
    who: "55+, retiree or near-retiree in Perak / Klang Valley; buying for lifestyle and to pass on.",
    pains: ["Isolation", "Maintenance burden"],
    desires: ["A walkable, lively, managed environment", "An asset children will value"],
    objections: ["Tenure and title details", "Developer track record"],
    bestAngles: ["stay", "planned"],
  },
  {
    id: "fnb",
    name: "The F&B Operator",
    who: "Ipoh or regional F&B owner or franchisee looking for a second outlet with planned footfall.",
    pains: ["Clusters of copycat outlets killing margins", "Unpredictable footfall"],
    desires: ["Curated, non-duplicated tenant mix", "Destination marketing done by the landlord"],
    objections: ["Rental terms", "Fit-out timeline", "Opening date"],
    bestAngles: ["food", "planned"],
  },
];

export const angles: Angle[] = [
  {
    id: "night",
    code: "daynight",
    name: "Ipoh, Day into Night",
    promise: "Ipoh finally has somewhere to go after dark.",
    stage: "awareness",
    personas: ["homecomer", "family"],
    sceneIds: ["s03", "s10", "s11", "s13", "s07"],
    claimIds: ["c-ipoh", "c-day-night", "c-developer"],
  },
  {
    id: "planned",
    code: "planned",
    name: "Planned Before It's Built",
    promise: "An ecosystem planned to operate before construction completes, and managed after opening.",
    stage: "consideration",
    personas: ["investor", "retiree"],
    sceneIds: ["s16", "s17", "s18", "s24", "s07"],
    claimIds: ["c-planned", "c-managed", "c-developer"],
  },
  {
    id: "food",
    code: "128eats",
    name: "128 Eateries. No Two Alike.",
    promise: "Ipoh's food culture, curated without duplication.",
    stage: "awareness",
    personas: ["family", "fnb"],
    sceneIds: ["s10", "s12", "s23", "s11", "s07"],
    claimIds: ["c-128", "c-day-night", "c-ipoh"],
  },
  {
    id: "stay",
    code: "stay",
    name: "A Reason to Stay",
    promise: "Turn a day trip into a stay — theme stays, immersive spaces, professional operator.",
    stage: "consideration",
    personas: ["investor", "homecomer"],
    sceneIds: ["s03", "s04", "s08", "s09", "s07"],
    claimIds: ["c-theme-stays", "c-hospitality", "c-ipoh", "c-developer"],
  },
];

/** Inputs the PRD expects in /case-study/urban-forest/ that were not provided. */
export const missingInputs = [
  { item: "Master video file (MP4/MOV)", why: "Clip cutting, frame sampling and exact timings. Only a YouTube link was provided.", blocking: true },
  { item: "Developer licence number", why: "Required on every ad (Housing Development Act). All assets are blocked until provided.", blocking: true },
  { item: "Advertising & Sales Permit (APDL) number + validity", why: "Required on every ad and landing page. All assets are blocked until provided.", blocking: true },
  { item: "Sales brochure (PDF)", why: "Verify unit types, sizes, amenities and USPs; confirm the 128-eateries claim.", blocking: false },
  { item: "Price list", why: "No prices appear in any copy until a price list is loaded. Price claims are auto-blocked.", blocking: false },
  { item: "Floor plans", why: "Carousel cards and pre-visit briefs by unit type.", blocking: false },
  { item: "Tenure, completion date, drive times", why: "Common buyer questions; needed for qualifier answers.", blocking: false },
  { item: "Confirmed locality: Bercham or Tambun", why: "PRD/title say Bercham; voice-over says Tambun.", blocking: false },
  { item: "Hospitality operator name + agreement", why: "Needed before any 'world-class operator' claim.", blocking: false },
  { item: "Legal-approved wording for the 5.5% return / lease structure", why: "Currently blocked as a high-risk investment claim.", blocking: false },
  { item: "Brand guide (logo, colours, fonts)", why: "Client-facing assets follow the client's brand, not the platform's.", blocking: false },
  { item: "Sales WhatsApp number + privacy-policy URL", why: "Landing-page WhatsApp button and PDPA privacy link.", blocking: true },
  { item: "Baseline cost per lead, show-up rate, lead→SPA conversion", why: "Needed to measure goal G2 (30% lower cost per qualified lead).", blocking: false },
];
