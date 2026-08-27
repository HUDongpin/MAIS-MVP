import assert from "node:assert/strict";
import test from "node:test";

import { EXTERNAL_COURSE_INTEGRATION_READINESS } from "./readiness";

test("every LTI and LMS capability remains disabled or unconfigured", () => {
  const leaves: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      leaves.push(value);
      return;
    }
    assert.ok(value && typeof value === "object" && !Array.isArray(value));
    for (const child of Object.values(value as Record<string, unknown>)) visit(child);
  };

  visit(EXTERNAL_COURSE_INTEGRATION_READINESS);

  assert.ok(leaves.length >= 8);
  assert.ok(leaves.every((value) => value === "disabled" || value === "unconfigured"));
  assert.ok(Object.isFrozen(EXTERNAL_COURSE_INTEGRATION_READINESS));
});
