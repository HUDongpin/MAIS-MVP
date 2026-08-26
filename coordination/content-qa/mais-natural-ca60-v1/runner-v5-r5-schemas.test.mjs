import assert from "node:assert/strict";
import test from "node:test";

import {
  V5_R5_SCHEMA_CATALOG,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  buildActiveRegistrationFixtureV5R5,
  buildExactRegistrationEvidenceFixtureV5R5,
  buildFreshReviewFixtureV5R5,
} from "./runner-v5-r5-test-fixtures.mjs";
import {
  PRODUCTION_PATHS_V5_R5,
} from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/build-runner-registration.mjs";

function schemaNamesFromProductionPathset() {
  return PRODUCTION_PATHS_V5_R5.filter((sourcePath) => sourcePath.includes("/schemas/"))
    .map((sourcePath) => /\/([^/]+)\.schema\.json$/u.exec(sourcePath)?.[1]);
}

function assertClosedObjectNodes(schema, label, seen = new Set()) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema) || seen.has(schema)) return;
  seen.add(schema);
  if (schema.type === "object") {
    const constrainedDynamicMap = schema.propertyNames && schema.additionalProperties
      && typeof schema.additionalProperties === "object";
    assert.ok(schema.additionalProperties === false || constrainedDynamicMap,
      `${label} contains an unconstrained object node`);
    if (schema.additionalProperties === false) {
      assert.deepEqual([...(schema.required ?? [])].sort(), Object.keys(schema.properties ?? {}).sort(),
        `${label} object properties are not all required`);
    }
  }
  for (const value of Object.values(schema)) {
    if (Array.isArray(value)) value.forEach((entry) => assertClosedObjectNodes(entry, label, seen));
    else assertClosedObjectNodes(value, label, seen);
  }
}

test("every production R5 schema is catalogued and its local object nodes are closed", () => {
  for (const name of schemaNamesFromProductionPathset()) {
    assert.ok(V5_R5_SCHEMA_CATALOG[name], `${name} is absent from the machine validator catalog`);
    assertClosedObjectNodes(V5_R5_SCHEMA_CATALOG[name], name);
  }
});

test("active registration, fresh A11 receipt, and exact-Git evidence reject additional properties", () => {
  const active = buildActiveRegistrationFixtureV5R5();
  const review = buildFreshReviewFixtureV5R5(active);
  const evidence = buildExactRegistrationEvidenceFixtureV5R5(active);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R5(active), []);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R5(review), []);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R5(evidence), []);
  for (const value of [active, review, evidence]) {
    const tampered = { ...value, forbiddenUnregisteredField: true };
    assert.match(validateClosedSelfHashedArtifactV5R5(tampered).join("; "), /additional property|selfHash/iu);
  }
});

test("external schema references are enforced instead of accepting opaque nested artifacts", () => {
  const active = buildActiveRegistrationFixtureV5R5();
  const evidence = buildExactRegistrationEvidenceFixtureV5R5(active);
  const tampered = structuredClone(evidence);
  tampered.activeRegistration.forbiddenNestedField = true;
  assert.match(validateClosedSelfHashedArtifactV5R5(tampered).join("; "), /additional property|selfHash/iu);
});
