import assert from "node:assert/strict";
import { test } from "node:test";
import { draftReply, scoreLead } from "../lib/engine/leads.ts";

test("scores hot / warm / cold", () => {
  assert.equal(scoreLead({ purpose: "invest", budget: "500k_1m", timeline: "0_3m", financing: "cash" }), "hot");
  assert.equal(scoreLead({ purpose: "own_stay", budget: "unsure", timeline: "3_6m", financing: "loan_needed" }), "warm");
  assert.equal(scoreLead({ purpose: "unsure", budget: "unsure", timeline: "browsing", financing: "unsure" }), "cold");
});

test("drafts the first reply in the lead's language", () => {
  assert.match(draftReply("Aina Rahman", "bm", "Urban Forest"), /^Hai Aina/);
  assert.match(draftReply("Tan", "zh", "Urban Forest"), /您好/);
  assert.match(draftReply("Sam Lee", "en", "Urban Forest"), /^Hi Sam/);
});
