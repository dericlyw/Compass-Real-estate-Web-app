// Core domain types. Mirrors supabase/migrations/0001_init.sql.

export type Lang = "en" | "bm" | "zh";
export const LANGS: Lang[] = ["en", "bm", "zh"];
export const LANG_LABEL: Record<Lang, string> = { en: "English", bm: "Bahasa Malaysia", zh: "中文" };

export type Platform = "meta" | "tiktok" | "xhs" | "youtube" | "google";
export const PLATFORM_LABEL: Record<Platform, string> = {
  meta: "Meta (FB/IG)",
  tiktok: "TikTok",
  xhs: "Xiaohongshu",
  youtube: "YouTube Shorts",
  google: "Google",
};

export type FunnelStage = "awareness" | "consideration" | "conversion" | "retargeting";

/** Where a claim came from. "prd" = client brief; "video" = voice-over transcript at a timestamp. */
export interface SourceRef {
  doc: "prd" | "video" | "brochure" | "price_list" | "floor_plan" | "permit" | "operator";
  locator: string; // page no., timestamp, or field
}

export type ClaimStatus = "verified" | "unverified" | "conflict" | "high_risk";

export interface Claim {
  id: string;
  field: string;
  statement: string;
  sources: SourceRef[];
  status: ClaimStatus;
  note?: string;
}

export interface Permit {
  developerLicence: string | null;
  advertisingPermit: string | null; // APDL / Advertising & Sales Permit
  validity: string | null;
  approvingAuthority: string | null;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  developer: string;
  city: string;
  videoUrl: string;
  videoDurationSec: number;
  whatsappNumber: string | null; // E.164 without "+", e.g. 60123456789
  privacyUrl: string | null;
  permit: Permit;
  priceList: { unitType: string; component: string; sizeSqft: string; priceFromRM: number }[];
}

export interface VideoScene {
  id: string;
  start: number; // seconds (approximate until worker re-derives from source file)
  end: number;
  line: string; // voice-over
  tags: string[];
  isRender: boolean; // artist's impression / CGI
  hook: number; // 0-10 first-3-second stopping power
  emotion: number; // 0-10
  clarity: number; // 0-10 selling-point clarity
  claimIds: string[];
}

export interface Persona {
  id: string;
  name: string;
  who: string;
  pains: string[];
  desires: string[];
  objections: string[];
  bestAngles: string[];
}

export interface Angle {
  id: string;
  code: string; // used in naming convention
  name: string;
  promise: string;
  stage: FunnelStage;
  personas: string[];
  sceneIds: string[];
  claimIds: string[];
}

export type AssetFormat = "reel15" | "feed30" | "carousel" | "story";
export const FORMAT_SPEC: Record<AssetFormat, { label: string; aspect: string; duration: string; code: string }> = {
  reel15: { label: "Reel / TikTok 15s", aspect: "9:16", duration: "15s", code: "r15" },
  feed30: { label: "Feed video 30s", aspect: "1:1", duration: "30s", code: "f30" },
  carousel: { label: "Carousel (5 cards)", aspect: "4:5", duration: "static", code: "car" },
  story: { label: "Story static", aspect: "9:16", duration: "static", code: "sty" },
};

export interface CopyVariant {
  key: "A" | "B" | "C";
  hook: string;
  primary: string;
  headline: string;
  cta: string;
  claimIds: string[];
  model?: string; // AI provenance
  promptVersion?: string;
}

export type ApprovalStatus = "draft" | "needs_review" | "approved" | "rejected";

export interface ComplianceResult {
  rule: string;
  level: "pass" | "warn" | "block";
  message: string;
}

export interface CreativeAsset {
  id: string;
  projectId: string;
  angleId: string;
  personaId: string;
  format: AssetFormat;
  lang: Lang;
  platforms: Platform[];
  sceneIds: string[];
  variants: CopyVariant[];
  endCard: string;
  rendersUsed: boolean;
  status: ApprovalStatus;
  compliance: ComplianceResult[];
  complianceRunAt?: string;
  reviewerComment?: string;
}

export interface LandingPage {
  angleId: string;
  slug: string;
  pdpaNotice: string;
}

export type LeadScore = "hot" | "warm" | "cold";
export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment"
  | "showed"
  | "no_show"
  | "booking_fee"
  | "spa";

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email?: string;
  lang: Lang;
  purpose: "own_stay" | "invest" | "business" | "unsure";
  budget: "under_500k" | "500k_1m" | "above_1m" | "unsure";
  timeline: "0_3m" | "3_6m" | "6_12m" | "browsing";
  financing: "cash" | "loan_approved" | "loan_needed" | "unsure";
  interest: string;
  consentAt: string;
  utm: Record<string, string>;
  angleId?: string;
  score: LeadScore;
  stage: LeadStage;
  firstResponseAt?: string;
  draftReply: string;
  notes: string[];
  demo?: boolean;
}

export interface Slot {
  id: string;
  negotiator: string;
  start: string; // ISO
  leadId?: string;
}

export interface Appointment {
  id: string;
  slotId: string;
  leadId: string;
  createdAt: string;
  reminders: { at: string; kind: "24h" | "2h"; status: "scheduled" | "sent" }[];
  outcome?: "no_show" | "visited" | "booking_fee" | "spa";
  outcomeAt?: string;
}

export interface AdSpend {
  id: string;
  date: string;
  platform: Platform;
  angleId: string;
  amountRM: number;
  demo?: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

export type FeedbackKind = "bug" | "idea" | "praise" | "question";

export interface Feedback {
  id: string;
  at: string;
  actor: string;
  page: string;
  kind: FeedbackKind;
  text: string;
  status: "open" | "done";
}

export interface Store {
  version: number;
  negotiators: string[];
  feedback: Feedback[];
  project: Project;
  assets: CreativeAsset[];
  leads: Lead[];
  slots: Slot[];
  appointments: Appointment[];
  spend: AdSpend[];
  audit: AuditEntry[];
}
