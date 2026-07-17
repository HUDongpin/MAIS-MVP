import assert from "node:assert/strict";
import test from "node:test";

import {
  aiGovernanceUserStoreOperations,
  studentActivityUserStoreOperations
} from "@/lib/server/userStore/domainContracts";

test("pilot platform loop belongs to the AI governance userStore contract", () => {
  const aiGovernanceOperations: readonly string[] = aiGovernanceUserStoreOperations;
  const studentActivityOperations: readonly string[] = studentActivityUserStoreOperations;

  assert.equal(aiGovernanceOperations.includes("getPilotPlatformLoopData"), true);
  assert.equal(studentActivityOperations.includes("getPilotPlatformLoopData"), false);
});
