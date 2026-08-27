import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "skills",
  "mais-agentops-intake",
);

test("thin intake skill has a machine-verifiable read-only policy", async () => {
  const policy = JSON.parse(
    await readFile(path.join(skillRoot, "references/skill-policy.v1.json"), "utf8"),
  ) as {
    schemaVersion: string;
    maxQuestionsPerRound: number;
    maxClarificationRounds: number;
    allowedOperations: string[];
    forbiddenEffects: string[];
    cliEntrypoint: string;
    requestAndClarificationStorage: string;
  };

  assert.equal(policy.schemaVersion, "mais-agentops-intake-skill-policy.v1");
  assert.equal(policy.maxQuestionsPerRound, 3);
  assert.equal(policy.maxClarificationRounds, 2);
  assert.deepEqual(policy.allowedOperations, [
    "decode",
    "compile-request",
    "invoke-agentops-cli",
    "explain-handoff",
  ]);
  assert.deepEqual(policy.forbiddenEffects.sort(), [
    "code-write",
    "content-write",
    "credential-access",
    "deployment",
    "git-mutation",
    "production-data-mutation",
    "provider-execution",
  ]);
  assert.equal(policy.cliEntrypoint, "coordination/agentops/bin/agentops");
  assert.equal(
    policy.requestAndClarificationStorage,
    "git-ignored-local-only",
  );
});

test("skill entrypoint routes to the request contract and distinguishes handoff from execution", async () => {
  const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");

  assert.match(skill, /^---\nname: mais-agentops-intake\n/m);
  assert.match(skill, /references\/request-contract\.md/);
  assert.match(skill, /AgentOpsRequestV1/);
  assert.match(skill, /handoff-ready/);
  assert.match(skill, /does not mean|不代表/i);
  assert.doesNotMatch(skill, /\[COMPILATION_COMPLETE\]/);
});
