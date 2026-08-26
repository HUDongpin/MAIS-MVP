import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeepSeekC0TriggerReceiptV1,
  buildOpenAIAdjudicationTriggerReceiptV1,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import { planDeepSeekResumeV5R3, planOpenAIReferenceResumeV5R3 } from "./resume-state-v5-r3.mjs";

const H = (character) => character.repeat(64);
const ITEM = Object.freeze({ itemHash: H("a"), itemIdPseudonym: "item-1" });

function attempt(role, index, status = "SUCCEEDED") {
  return sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV3",
    attemptId: `${role}-${index}`,
    role,
    ...ITEM,
    attemptStatus: status,
  });
}

function referenceTriggers(disagree = true) {
  const labelA = sealV5R3Artifact({ schemaVersion: "MachineReferenceLabelV1", ...ITEM, panelRole: "A_LABEL", uncertain: false, severity: disagree ? "P1" : "NO_FINDING", codes: disagree ? ["EVIDENCE_MISMATCH"] : ["NO_FINDING"] });
  const labelB = sealV5R3Artifact({ schemaVersion: "MachineReferenceLabelV1", ...ITEM, panelRole: "B_LABEL", uncertain: false, severity: "NO_FINDING", codes: ["NO_FINDING"] });
  const triggerReceipt = buildOpenAIAdjudicationTriggerReceiptV1({ item: ITEM, labelA, labelB, triggerEngineHash: H("b") });
  return { labelA, labelB, triggerReceipt };
}

function c0Triggers(selected = false, mandatory = []) {
  const randomAuditSelectionReceipt = sealV5R3Artifact({ schemaVersion: "C0RandomAuditMembershipV1", ...ITEM, selected });
  const mandatoryTriggerReceipt = sealV5R3Artifact({ schemaVersion: "C0MandatoryTriggerV1", ...ITEM, triggeredCodes: mandatory });
  const triggerReceipt = buildDeepSeekC0TriggerReceiptV1({ item: ITEM, randomAuditSelectionReceipt, mandatoryTriggerReceipt, triggerEngineHash: H("c") });
  return { randomAuditSelectionReceipt, mandatoryTriggerReceipt, triggerReceipt };
}

test("OpenAI resume derives adjudication from sealed label inputs and never accepts a caller boolean", () => {
  const base = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role, index) => attempt(role, index));
  const required = referenceTriggers(true);
  const plan = planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: base, adjudicationTrigger: required });
  assert.equal(plan.valid, true);
  assert.equal(plan.nextRole, "ADJUDICATOR");
  assert.equal(plan.adjudicationRequired, true);
  const noAdjudication = planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: base, adjudicationTrigger: referenceTriggers(false) });
  assert.equal(noAdjudication.complete, true);
  assert.equal(noAdjudication.nextRole, null);
  const callerChoice = planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: base, adjudicationRequired: false });
  assert.equal(callerChoice.valid, false);
  assert.match(callerChoice.errors.join("\n"), /sealed adjudication trigger/u);
});

test("OpenAI resume rejects a tampered trigger or cross-item successful receipt", () => {
  const base = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role, index) => attempt(role, index));
  const trigger = referenceTriggers(true);
  const tampered = { ...trigger, triggerReceipt: { ...trigger.triggerReceipt, adjudicationRequired: false } };
  assert.equal(planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: base, adjudicationTrigger: tampered }).valid, false);
  const crossed = [...base.slice(0, 3), sealV5R3Artifact({ ...Object.fromEntries(Object.entries(base[3]).filter(([key]) => key !== "selfHash")), itemHash: H("d") })];
  assert.equal(planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: crossed, adjudicationTrigger: trigger }).valid, false);
});

test("DeepSeek resume derives five C0 roles from sealed random/mandatory trigger inputs", () => {
  const base = [attempt("B_PRIME_CRITIQUE", 1), attempt("B_PRIME_REVISION", 1)];
  const trigger = c0Triggers(false, ["ANSWER_CRITICAL_VISUAL"]);
  const plan = planDeepSeekResumeV5R3({ item: ITEM, attempts: base, c0Trigger: trigger });
  assert.equal(plan.valid, true);
  assert.equal(plan.c0Required, true);
  assert.equal(plan.nextRole, "C0_PRIME_ROLE_1");
  assert.equal(plan.requiredRoles.length, 7);
  const noC0 = planDeepSeekResumeV5R3({ item: ITEM, attempts: base, c0Trigger: c0Triggers(false, []) });
  assert.equal(noC0.complete, true);
  const callerChoice = planDeepSeekResumeV5R3({ item: ITEM, attempts: base, c0Required: true });
  assert.equal(callerChoice.valid, false);
  assert.match(callerChoice.errors.join("\n"), /sealed C0 trigger/u);
});

test("both resume planners enforce two attempts, one success, unique IDs, and contiguous dependencies", () => {
  const duplicate = attempt("A_SOLVE", 1);
  const openai = planOpenAIReferenceResumeV5R3({ item: ITEM, attempts: [duplicate, duplicate], adjudicationTrigger: null });
  assert.equal(openai.valid, false);
  assert.match(openai.errors.join("\n"), /duplicate|success/u);
  const deepseek = planDeepSeekResumeV5R3({
    item: ITEM,
    attempts: [attempt("B_PRIME_REVISION", 1)],
    c0Trigger: null,
  });
  assert.equal(deepseek.valid, false);
  assert.match(deepseek.errors.join("\n"), /dependency/u);
});
