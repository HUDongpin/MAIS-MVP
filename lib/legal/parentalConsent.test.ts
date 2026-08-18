import assert from "node:assert/strict";
import test from "node:test";
import { parseParentalConsent } from "@/lib/legal/parentalConsent";
import { currentConsentPolicyVersion } from "@/lib/legal/policyVersion";

const grantedAt = "2026-08-18T10:00:00.000Z";

const validInput = {
  acknowledged: true,
  guardianName: "  Wong Mei Ling  ",
  guardianEmail: " guardian@example.com ",
  relationship: "parent"
};

test("a complete consent payload is accepted and normalized", () => {
  const result = parseParentalConsent(validInput, grantedAt);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;

  assert.equal(result.consent.guardianName, "Wong Mei Ling", "whitespace trimmed");
  assert.equal(result.consent.guardianEmail, "guardian@example.com");
  assert.equal(result.consent.relationship, "parent");
  assert.equal(result.consent.grantedAt, grantedAt);
  assert.equal(result.consent.method, "registration-form");
});

test("consent records the policy version in force, so a later change is auditable", () => {
  const result = parseParentalConsent(validInput, grantedAt);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.consent.policyVersion, currentConsentPolicyVersion);
  assert.ok(result.consent.policyVersion.length > 0);
});

test("a school-authorized consent is recorded with its own method", () => {
  const result = parseParentalConsent({ ...validInput, relationship: "school" }, grantedAt);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.consent.method, "school-authorized");
});

test("the email is optional but must be well formed when given", () => {
  const withoutEmail = parseParentalConsent({ ...validInput, guardianEmail: "" }, grantedAt);
  assert.equal(withoutEmail.status, "ok");
  if (withoutEmail.status === "ok") assert.equal(withoutEmail.consent.guardianEmail, undefined);

  const malformed = parseParentalConsent({ ...validInput, guardianEmail: "not-an-email" }, grantedAt);
  assert.equal(malformed.status, "invalid");
  if (malformed.status === "invalid") assert.equal(malformed.reason, "guardian-email-invalid");
});

test("a missing payload is rejected", () => {
  for (const input of [undefined, null, "yes", 1, []]) {
    const result = parseParentalConsent(input, grantedAt);
    assert.equal(result.status, "invalid", `expected ${JSON.stringify(input)} to be rejected`);
    if (result.status === "invalid") assert.equal(result.reason, "missing");
  }
});

test("consent must be affirmatively acknowledged, not merely truthy", () => {
  for (const acknowledged of [false, undefined, "true", 1, "on"]) {
    const result = parseParentalConsent({ ...validInput, acknowledged }, grantedAt);
    assert.equal(result.status, "invalid", `expected acknowledged=${JSON.stringify(acknowledged)} to be rejected`);
    if (result.status === "invalid") assert.equal(result.reason, "not-acknowledged");
  }
});

test("a guardian name is required and length-bounded", () => {
  const blank = parseParentalConsent({ ...validInput, guardianName: "   " }, grantedAt);
  assert.equal(blank.status, "invalid");
  if (blank.status === "invalid") assert.equal(blank.reason, "guardian-name-required");

  const tooLong = parseParentalConsent({ ...validInput, guardianName: "a".repeat(121) }, grantedAt);
  assert.equal(tooLong.status, "invalid");
  if (tooLong.status === "invalid") assert.equal(tooLong.reason, "guardian-name-required");
});

test("the relationship must be one of the declared values", () => {
  for (const relationship of ["aunt", "", undefined, "PARENT"]) {
    const result = parseParentalConsent({ ...validInput, relationship }, grantedAt);
    assert.equal(result.status, "invalid", `expected relationship=${JSON.stringify(relationship)} to be rejected`);
    if (result.status === "invalid") assert.equal(result.reason, "relationship-invalid");
  }
});
