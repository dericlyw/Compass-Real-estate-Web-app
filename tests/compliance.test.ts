import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAsset, isBlocked, summary } from "../lib/engine/compliance.ts";
import type { Claim, CreativeAsset, Project } from "../lib/types.ts";

const claims: Claim[] = [
  { id: "c-128", field: "f&b", statement: "128 eateries curated without duplication", sources: [{ doc: "video", locator: "2:52" }], status: "unverified" },
  { id: "c-dev", field: "developer", statement: "Developed by TKB", sources: [{ doc: "prd", locator: "§2" }], status: "verified" },
  { id: "c-return", field: "return", statement: "5.5% return", sources: [{ doc: "video", locator: "2:12" }], status: "high_risk" },
  { id: "c-location", field: "location", statement: "Bercham", sources: [{ doc: "prd", locator: "§2" }], status: "conflict" },
];

const base: Project = {
  id: "p", slug: "urban-forest", name: "Urban Forest", developer: "TKB", city: "Ipoh", videoUrl: "", videoDurationSec: 207,
  whatsappNumber: null, privacyUrl: "https://example.com/privacy",
  permit: { developerLicence: "LIC-TEST", advertisingPermit: "APDL-TEST", validity: null, approvingAuthority: null },
  priceList: [],
};

const ctx = (project = base) => ({ project, claims, artistImpressionLabels: ["Artist's impression"] });

function asset(hook: string, primary = "Book a visit.", claimIds = ["c-dev"]): CreativeAsset {
  return {
    id: "a", projectId: "p", angleId: "food", personaId: "fnb", format: "reel15", lang: "en", platforms: ["meta", "tiktok"], sceneIds: [],
    variants: [{ key: "A", hook, primary, headline: "Short headline", cta: "Register", claimIds }],
    endCard: "Urban Forest · Artist's impression · permit", rendersUsed: true, status: "draft", compliance: [],
  };
}

test("clean copy with permits passes", () => {
  const r = checkAsset(asset("Ipoh's new food address."), ctx());
  assert.equal(summary(r), "pass");
});

test("missing permit blocks every asset", () => {
  const r = checkAsset(asset("Ipoh's new food address."), ctx({ ...base, permit: { ...base.permit, advertisingPermit: null } }));
  assert.ok(isBlocked(r));
  assert.ok(r.some((x) => x.rule === "R1 permit" && x.level === "block"));
});

test("return and guarantee language is blocked in all three languages", () => {
  for (const hook of ["Enjoy 5.5% return", "Guaranteed rental", "Pulangan dijamin", "保证回报", "稳赚不赔"]) {
    assert.ok(isBlocked(checkAsset(asset(hook), ctx())), hook);
  }
});

test("prices not on the price list are blocked", () => {
  assert.ok(isBlocked(checkAsset(asset("From RM450,000 only"), ctx())));
  const withPrice = { ...base, priceList: [{ unitType: "A", component: "The Miner", sizeSqft: "800", priceFromRM: 450000 }] };
  assert.ok(!checkAsset(asset("From RM450,000"), ctx(withPrice)).some((x) => x.rule === "R4 price"));
});

test("numbers must trace to the brief; 128 is sourced, 200 is not", () => {
  assert.ok(!isBlocked(checkAsset(asset("128 eateries. No two alike.", "x", ["c-128"]), ctx())));
  assert.ok(isBlocked(checkAsset(asset("200 eateries. No two alike."), ctx())));
});

test("high-risk claim reference blocks; unverified claim warns", () => {
  assert.ok(isBlocked(checkAsset(asset("Invest now", "x", ["c-return"]), ctx())));
  const r = checkAsset(asset("128 eateries", "x", ["c-128"]), ctx());
  assert.equal(summary(r), "warn");
});

test("renders without an artist's impression label are blocked", () => {
  const a = asset("Ipoh after dark");
  a.endCard = "Urban Forest";
  assert.ok(isBlocked(checkAsset(a, ctx())));
});

test("naming an unconfirmed locality warns", () => {
  const r = checkAsset(asset("New in Tambun"), ctx());
  assert.ok(r.some((x) => x.rule === "R7 locality" && x.level === "warn"));
});
