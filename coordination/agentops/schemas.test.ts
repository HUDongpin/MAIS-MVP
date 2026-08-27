import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  createAgentOpsEvent,
  createAgentOpsHandoff,
  createAgentTaskContract,
} from "./artifacts";
import { parseAgentOpsRequest } from "./contracts";
import { routeAgentTask } from "./routing";
import { discoveryFixture, requestFixture } from "./test-fixtures";

const schemasDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "schemas",
);

async function loadSchema(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(schemasDirectory, name), "utf8"),
  ) as Record<string, unknown>;
}

function artifactFixtures() {
  const request = parseAgentOpsRequest(requestFixture());
  const discovery = discoveryFixture();
  const route = routeAgentTask(request, discovery);
  const contract = createAgentTaskContract({ request, discovery, route });
  const handoff = createAgentOpsHandoff({
    contract,
    terminalStatus: "handoff-ready",
    checksPerformed: [],
    checksNotPerformed: ["No provider or deployment check was performed."],
    blockers: [],
    permittedEffects: ["repository-read"],
    nextOwner: "A14",
    nextAllowedAction: "Review the handoff and authorize an isolated writer session.",
    resumeGate: "A14 ownership and current baseline are confirmed.",
    redactionDeclaration: "Only sanitized summaries, paths, and digests are present.",
  });
  const event = createAgentOpsEvent({
    runId: contract.runId,
    sequence: 1,
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Request was validated.",
      evidenceDigests: [contract.requestDigest],
      repositoryPaths: [],
    },
    previousEventDigest: null,
    producedAt: "2026-08-28T00:00:00.000Z",
  });
  return { request, contract, handoff, event };
}

test("all four public v1 schemas compile in strict Draft 2020-12 mode", async () => {
  const names = [
    "agentops-request-v1.schema.json",
    "agent-task-contract-v1.schema.json",
    "agentops-handoff-v1.schema.json",
    "agentops-event-v1.schema.json",
  ];
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const name of names) {
    const schema = await loadSchema(name);
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );
    assert.equal(schema.additionalProperties, false);
    assert.doesNotThrow(() => ajv.compile(schema));
  }
});

test("public schemas accept canonical artifacts and reject drift or unknown nested fields", async () => {
  const fixtures = artifactFixtures();
  const matrix = [
    ["agentops-request-v1.schema.json", fixtures.request],
    ["agent-task-contract-v1.schema.json", fixtures.contract],
    ["agentops-handoff-v1.schema.json", fixtures.handoff],
    ["agentops-event-v1.schema.json", fixtures.event],
  ] as const;
  for (const [name, value] of matrix) {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(await loadSchema(name));
    assert.equal(validate(value), true, JSON.stringify(validate.errors, null, 2));
  }

  const contractValidator = new Ajv2020({ allErrors: true, strict: true }).compile(
    await loadSchema("agent-task-contract-v1.schema.json"),
  );
  const contractWithAuthorityDrift = {
    ...fixtures.contract,
    authorityPolicy: {
      ...fixtures.contract.authorityPolicy,
      arbitraryShellAllowed: true,
    },
  };
  assert.equal(contractValidator(contractWithAuthorityDrift), false);

  const handoffValidator = new Ajv2020({ allErrors: true, strict: true }).compile(
    await loadSchema("agentops-handoff-v1.schema.json"),
  );
  assert.equal(
    handoffValidator({ ...fixtures.handoff, terminalStatus: "implemented" }),
    false,
  );
});
