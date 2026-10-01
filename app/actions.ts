"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiEnabled, rewriteVariant } from "@/lib/ai/copywriter";
import { DEFAULT_NEGOTIATORS, entry, mutate, readStore, recheck, resetStore, seedSlots } from "@/lib/data/store";
import { angles } from "@/lib/data/urban-forest";
import { isBlocked } from "@/lib/engine/compliance";
import { draftReply, scoreLead } from "@/lib/engine/leads";
import type { AdSpend, Appointment, FeedbackKind, Lang, Lead, LeadStage, Platform, Project } from "@/lib/types";

async function actor(): Promise<string> {
  return (await cookies()).get("pv_user")?.value || "Operator";
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

function refreshAll() {
  revalidatePath("/", "layout");
}

// ── Approval queue ────────────────────────────────────────────────

async function setAssetStatus(fd: FormData, status: "approved" | "rejected" | "needs_review") {
  const id = str(fd, "id");
  const comment = str(fd, "comment");
  const who = await actor();
  await mutate((s) => {
    const a = s.assets.find((x) => x.id === id);
    if (!a) return;
    if (status !== "rejected" && isBlocked(a.compliance)) return; // gate is authoritative
    a.status = status;
    a.reviewerComment = comment || a.reviewerComment;
    s.audit.push(entry(who, `asset_${status}`, id, comment || undefined));
  });
  refreshAll();
}

export async function approveAsset(fd: FormData) {
  await setAssetStatus(fd, "approved");
}

export async function rejectAsset(fd: FormData) {
  await setAssetStatus(fd, "rejected");
}

export async function returnToReview(fd: FormData) {
  await setAssetStatus(fd, "needs_review");
}

export async function bulkApprove(fd: FormData) {
  const angleId = str(fd, "angleId");
  const who = await actor();
  await mutate((s) => {
    const ids: string[] = [];
    for (const a of s.assets) {
      if (a.angleId === angleId && a.status === "needs_review" && !isBlocked(a.compliance)) {
        a.status = "approved";
        ids.push(a.id);
      }
    }
    s.audit.push(entry(who, "bulk_approve", angleId, `${ids.length} assets: ${ids.join(", ")}`));
  });
  refreshAll();
}

export async function editVariant(fd: FormData) {
  const id = str(fd, "id");
  const key = str(fd, "key");
  const who = await actor();
  await mutate((s) => {
    const a = s.assets.find((x) => x.id === id);
    const v = a?.variants.find((x) => x.key === key);
    if (!a || !v) return;
    const before = JSON.stringify({ hook: v.hook, headline: v.headline, primary: v.primary, cta: v.cta });
    v.hook = str(fd, "hook");
    v.headline = str(fd, "headline");
    v.primary = str(fd, "primary");
    v.cta = str(fd, "cta");
    v.promptVersion = `${v.promptVersion ?? "house"}+edit`;
    if (a.status === "approved") a.status = "needs_review"; // edits need re-approval
    recheck(s, a);
    s.audit.push(entry(who, "edit_copy", `${id}/${key}`, `before: ${before}`));
  });
  refreshAll();
}

export async function aiRewrite(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const key = str(fd, "key");
  const instruction = str(fd, "instruction").slice(0, 300);
  if (!aiEnabled()) redirect(`/approvals/${id}?error=${encodeURIComponent("Set ANTHROPIC_API_KEY to enable the AI Copywriter.")}`);
  const who = await actor();
  const s0 = await readStore();
  const a0 = s0.assets.find((x) => x.id === id);
  const v0 = a0?.variants.find((x) => x.key === key);
  if (!a0 || !v0) redirect("/approvals");
  // Call the model once, outside the save loop, so a save retry never re-bills the API.
  let next;
  try {
    next = await rewriteVariant(a0, v0, instruction, s0.project.priceList);
  } catch (e) {
    redirect(`/approvals/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "AI rewrite failed")}`);
  }
  await mutate((s) => {
    const a = s.assets.find((x) => x.id === id);
    const idx = a?.variants.findIndex((x) => x.key === key) ?? -1;
    if (!a || idx < 0) return;
    a.variants[idx] = next;
    if (a.status === "approved") a.status = "needs_review";
    recheck(s, a);
    s.audit.push(entry(who, "ai_rewrite", `${id}/${key}`, `${next.model} ${next.promptVersion}: ${instruction}`));
  });
  refreshAll();
  redirect(`/approvals/${id}`);
}

// ── Settings ─────────────────────────────────────────────────────

export async function saveSettings(fd: FormData) {
  const who = await actor();
  const reviewer = str(fd, "reviewer");
  if (reviewer) (await cookies()).set("pv_user", reviewer, { httpOnly: true, sameSite: "lax", path: "/" });
  await mutate((s) => {
    const p = s.project;
    p.permit.developerLicence = str(fd, "developerLicence") || null;
    p.permit.advertisingPermit = str(fd, "advertisingPermit") || null;
    p.permit.validity = str(fd, "validity") || null;
    p.permit.approvingAuthority = str(fd, "approvingAuthority") || null;
    const wa = str(fd, "whatsapp").replace(/\D/g, "");
    p.whatsappNumber = wa || null;
    const privacy = str(fd, "privacyUrl");
    p.privacyUrl = /^https?:\/\//.test(privacy) ? privacy : null;
    for (const a of s.assets) recheck(s, a);
    s.audit.push(entry(reviewer || who, "update_settings", p.id, "permit / WhatsApp / privacy updated; compliance re-run on all assets"));
  });
  refreshAll();
}

export async function resetAll() {
  await resetStore();
  refreshAll();
}

// ── Lead capture (public) ────────────────────────────────────────

export async function submitLead(fd: FormData) {
  const angleId = str(fd, "angleId");
  if (!angles.some((a) => a.id === angleId)) return;
  if (fd.get("consent") !== "on") redirect(`/lp/${angleId}?error=consent`);
  if (str(fd, "website")) redirect(`/lp/${angleId}/thanks`); // honeypot
  const name = str(fd, "name").slice(0, 80);
  const phone = str(fd, "phone").replace(/[^\d+]/g, "").slice(0, 16);
  if (!name || phone.replace(/\D/g, "").length < 9) redirect(`/lp/${angleId}?error=contact`);
  const lang = (["en", "bm", "zh"].includes(str(fd, "lang")) ? str(fd, "lang") : "en") as Lang;
  const answers = {
    purpose: (str(fd, "purpose") || "unsure") as Lead["purpose"],
    budget: (str(fd, "budget") || "unsure") as Lead["budget"],
    timeline: (str(fd, "timeline") || "browsing") as Lead["timeline"],
    financing: (str(fd, "financing") || "unsure") as Lead["financing"],
  };
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = str(fd, k);
    if (v) utm[k] = v.slice(0, 120);
  }
  const id = crypto.randomUUID();
  await mutate((s) => {
    const now = new Date().toISOString();
    s.leads.unshift({
      id,
      createdAt: now,
      name,
      phone,
      email: str(fd, "email").slice(0, 120) || undefined,
      lang,
      ...answers,
      interest: str(fd, "interest").slice(0, 200),
      consentAt: now,
      utm,
      angleId,
      score: scoreLead(answers),
      stage: "new",
      draftReply: draftReply(name, lang, s.project.name),
      notes: [],
    });
    s.audit.push(entry("landing_page", "lead_captured", id, `angle=${angleId} source=${utm.utm_source ?? "direct"}`));
  });
  refreshAll();
  redirect(`/lp/${angleId}/thanks?ref=${id.slice(0, 8)}&lang=${lang}`);
}

// ── Lead inbox & booking ─────────────────────────────────────────

export async function markContacted(fd: FormData) {
  const id = str(fd, "id");
  const who = await actor();
  await mutate((s) => {
    const l = s.leads.find((x) => x.id === id);
    if (!l) return;
    l.firstResponseAt ??= new Date().toISOString();
    if (l.stage === "new") l.stage = "contacted";
    s.audit.push(entry(who, "lead_contacted", id));
  });
  refreshAll();
}

export async function setLeadStage(fd: FormData) {
  const id = str(fd, "id");
  const stage = str(fd, "stage") as LeadStage;
  if (!["new", "contacted", "qualified", "appointment", "showed", "no_show", "booking_fee", "spa"].includes(stage)) return;
  const who = await actor();
  await mutate((s) => {
    const l = s.leads.find((x) => x.id === id);
    if (!l) return;
    l.stage = stage;
    s.audit.push(entry(who, "lead_stage", id, stage));
  });
  refreshAll();
}

export async function bookAppointment(fd: FormData) {
  const leadId = str(fd, "leadId");
  const slotId = str(fd, "slotId");
  const who = await actor();
  await mutate((s) => {
    const l = s.leads.find((x) => x.id === leadId);
    const slot = s.slots.find((x) => x.id === slotId);
    if (!l || !slot || slot.leadId) return;
    slot.leadId = leadId;
    const t = new Date(slot.start).getTime();
    const appt: Appointment = {
      id: crypto.randomUUID(),
      slotId,
      leadId,
      createdAt: new Date().toISOString(),
      reminders: [
        { at: new Date(t - 24 * 3600000).toISOString(), kind: "24h", status: "scheduled" },
        { at: new Date(t - 2 * 3600000).toISOString(), kind: "2h", status: "scheduled" },
      ],
    };
    s.appointments.push(appt);
    l.stage = "appointment";
    l.firstResponseAt ??= new Date().toISOString();
    s.audit.push(entry(who, "appointment_booked", appt.id, `${l.name} · ${slot.negotiator} · ${slot.start}`));
  });
  refreshAll();
}

export async function logOutcome(fd: FormData) {
  const id = str(fd, "id");
  const outcome = str(fd, "outcome") as NonNullable<Appointment["outcome"]>;
  if (!["no_show", "visited", "booking_fee", "spa"].includes(outcome)) return;
  const who = await actor();
  await mutate((s) => {
    const a = s.appointments.find((x) => x.id === id);
    if (!a) return;
    a.outcome = outcome;
    a.outcomeAt = new Date().toISOString();
    const l = s.leads.find((x) => x.id === a.leadId);
    if (l) l.stage = outcome === "visited" ? "showed" : outcome;
    s.audit.push(entry(who, "outcome_logged", id, outcome));
  });
  refreshAll();
}

export async function addSpend(fd: FormData) {
  const who = await actor();
  const amount = Number(str(fd, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) return;
  await mutate((s) => {
    const row: AdSpend = {
      id: crypto.randomUUID(),
      date: str(fd, "date") || new Date().toISOString().slice(0, 10),
      platform: str(fd, "platform") as Platform,
      angleId: str(fd, "angleId"),
      amountRM: Math.round(amount * 100) / 100,
    };
    s.spend.push(row);
    s.audit.push(entry(who, "spend_logged", row.id, `RM ${row.amountRM} ${row.platform}/${row.angleId}`));
  });
  refreshAll();
}

// ── Pilot inputs: price list & sales roster ──────────────────────

/** One unit type per line: Component | Unit type | Size (sq ft) | Price from (RM). */
export async function savePriceList(fd: FormData) {
  const who = await actor();
  const rows: Project["priceList"] = [];
  const bad: string[] = [];
  for (const line of str(fd, "priceList").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [component, unitType, size, price] = line.split("|").map((x) => x.trim());
    const n = Number((price ?? "").replace(/[^\d.]/g, ""));
    if (!component || !unitType || !size || !Number.isFinite(n) || n <= 0) bad.push(line.trim());
    else rows.push({ component, unitType, sizeSqft: size.replace(/[^\d.,-]/g, ""), priceFromRM: Math.round(n) });
  }
  if (bad.length) redirect(`/settings?error=${encodeURIComponent(`Could not read: ${bad.slice(0, 3).join(" / ")}`)}`);
  await mutate((s) => {
    s.project.priceList = rows;
    for (const a of s.assets) recheck(s, a);
    s.audit.push(entry(who, "update_price_list", s.project.id, `${rows.length} unit types`));
  });
  refreshAll();
  redirect("/settings?saved=price");
}

export async function saveRoster(fd: FormData) {
  const who = await actor();
  const names = [...new Set(str(fd, "roster").split(/\r?\n/).map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 12);
  await mutate((s) => {
    s.negotiators = names.length ? names : [...DEFAULT_NEGOTIATORS];
    // Keep booked slots; regenerate open future slots for the new roster.
    const booked = s.slots.filter((x) => x.leadId);
    const taken = new Set(booked.map((x) => `${x.start}|${x.negotiator}`));
    s.slots = [...booked, ...seedSlots(s.negotiators).filter((x) => !taken.has(`${x.start}|${x.negotiator}`))];
    s.audit.push(entry(who, "update_roster", s.project.id, s.negotiators.join(", ")));
  });
  refreshAll();
  redirect("/settings?saved=roster");
}

// ── Tester feedback ──────────────────────────────────────────────

export async function submitFeedback(fd: FormData) {
  const who = await actor();
  const text = str(fd, "text").slice(0, 2000);
  const kind = (["bug", "idea", "praise", "question"].includes(str(fd, "kind")) ? str(fd, "kind") : "idea") as FeedbackKind;
  const page = str(fd, "page").slice(0, 200) || "/";
  if (!text) return;
  await mutate((s) => {
    s.feedback.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), actor: who, page, kind, text, status: "open" });
  });
  revalidatePath("/feedback");
}

export async function toggleFeedback(fd: FormData) {
  const id = str(fd, "id");
  await mutate((s) => {
    const f = s.feedback.find((x) => x.id === id);
    if (f) f.status = f.status === "open" ? "done" : "open";
  });
  revalidatePath("/feedback");
}

// ── Pilot access ─────────────────────────────────────────────────

export async function signIn(fd: FormData) {
  const { accessToken } = await import("@/lib/access");
  const code = str(fd, "code");
  const name = str(fd, "name").slice(0, 40);
  const next = str(fd, "next").startsWith("/") ? str(fd, "next") : "/";
  const expected = process.env.ACCESS_CODE;
  if (expected && code !== expected) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };
  if (expected) jar.set("pv_access", await accessToken(expected), opts);
  if (name) jar.set("pv_user", name, opts);
  redirect(next);
}

// ── Demo data (clearly labelled; never mixed into real reporting silently) ──

export async function loadDemo() {
  const who = await actor();
  const { demoLeads, demoSpend } = await import("@/lib/data/demo");
  await mutate((s) => {
    if (s.leads.some((l) => l.demo)) return;
    const leads = demoLeads(s.project.name);
    s.leads.unshift(...leads);
    s.spend.push(...demoSpend());
    // Book the hot demo leads into the first free slots and log a few outcomes.
    const free = s.slots.filter((x) => !x.leadId);
    leads.filter((l) => l.score === "hot").forEach((l, i) => {
      const slot = free[i];
      if (!slot) return;
      slot.leadId = l.id;
      l.stage = "appointment";
      const t = new Date(slot.start).getTime();
      s.appointments.push({
        id: `demo-appt-${i}`,
        slotId: slot.id,
        leadId: l.id,
        createdAt: new Date().toISOString(),
        reminders: [
          { at: new Date(t - 86400000).toISOString(), kind: "24h", status: "scheduled" },
          { at: new Date(t - 7200000).toISOString(), kind: "2h", status: "scheduled" },
        ],
      });
    });
    s.audit.push(entry(who, "demo_loaded", "demo", `${leads.length} DEMO leads`));
  });
  refreshAll();
}

export async function clearDemo() {
  const who = await actor();
  await mutate((s) => {
    const ids = new Set(s.leads.filter((l) => l.demo).map((l) => l.id));
    s.leads = s.leads.filter((l) => !l.demo);
    s.spend = s.spend.filter((x) => !x.demo);
    s.appointments = s.appointments.filter((a) => !ids.has(a.leadId));
    for (const slot of s.slots) if (slot.leadId && ids.has(slot.leadId)) delete slot.leadId;
    s.audit.push(entry(who, "demo_cleared", "demo"));
  });
  refreshAll();
}
