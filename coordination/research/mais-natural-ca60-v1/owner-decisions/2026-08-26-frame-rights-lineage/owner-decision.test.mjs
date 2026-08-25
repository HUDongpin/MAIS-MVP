import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildOwnerFrameRightsLineageDecisionV1,
  validateOwnerFrameRightsLineageDecisionV1,
} from "./build-owner-decision.mjs";

const RECORDED_AT = "2026-08-25T19:21:35.000Z";

test("owner decision binds the exact request, rights, lineage, A22, and A11 roots", () => {
  const receipt = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: RECORDED_AT });
  assert.equal(receipt.ownerDecisionRequestHash, "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78");
  assert.equal(receipt.rightsPolicyHash, "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66");
  assert.equal(receipt.lineageRuleHash, "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449");
  assert.equal(receipt.a22EnvironmentReceiptHash, "4cf55806ab1feaf41679b12785fc67d84c085317928c9cb7abdbf401869c4b99");
  assert.equal(receipt.a11IndependentReadinessReviewHash, "8ab31d8269558a9544566e45a90afc8538c35e35567a46a5b38ea9a6d91c6657");
  assert.equal(validateOwnerFrameRightsLineageDecisionV1(receipt).length, 0);
});

test("approval permits only frame/sample freeze and never creates live execution authority", () => {
  const receipt = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: RECORDED_AT });
  assert.equal(receipt.frameFreezeAuthorized, true);
  assert.equal(receipt.sampleFreezeAuthorized, true);
  assert.equal(receipt.questionEgressAuthorizedNow, false);
  assert.equal(receipt.providerExecutionAuthorized, false);
  assert.equal(receipt.credentialReadAuthorized, false);
  assert.equal(receipt.tokenAuthorizationCreated, false);
  assert.equal(receipt.attemptAuthorizationCreated, false);
  assert.equal(receipt.usdAuthorizationCreated, false);
  assert.equal(receipt.providerRequestCount, 0);
});

test("receipt is deterministic for its observation time and rejects semantic drift", () => {
  const receipt = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: RECORDED_AT });
  assert.deepEqual(buildOwnerFrameRightsLineageDecisionV1({ recordedAt: RECORDED_AT }), receipt);
  const drifted = structuredClone(receipt);
  drifted.questionEgressAuthorizedNow = true;
  assert.ok(validateOwnerFrameRightsLineageDecisionV1(drifted).length > 0);
});

test("tracked receipt and closed schema match the deterministic builder", async () => {
  const tracked = JSON.parse(await readFile(path.join(import.meta.dirname, "owner-decision-receipt.json"), "utf8"));
  const schema = JSON.parse(await readFile(path.join(import.meta.dirname, "OwnerFrameRightsLineageDecisionReceiptV1.schema.json"), "utf8"));
  const expected = buildOwnerFrameRightsLineageDecisionV1({ recordedAt: RECORDED_AT });
  assert.deepEqual(tracked, expected);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(tracked).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(tracked).sort());
});
