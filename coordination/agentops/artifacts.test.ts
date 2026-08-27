import assert from "node:assert/strict";
import test from "node:test";

import { sha256Digest } from "./canonical";
import { parseAgentOpsRequest } from "./contracts";
import { routeAgentTask } from "./routing";
import { discoveryFixture, requestFixture } from "./test-fixtures";

function routedFixture() {
  const request = parseAgentOpsRequest(requestFixture());
  const discovery = discoveryFixture();
  const route = routeAgentTask(request, discovery);
  return { request, discovery, route };
}

test("AgentTaskContractV1 is deterministic, CRISPE-complete, and digest verified", async () => {
  const {
    createAgentTaskContract,
    verifyAgentTaskContract,
    AGENT_TASK_CONTRACT_SCHEMA_VERSION,
  } = await import("./artifacts");
  const fixture = routedFixture();
  const first = createAgentTaskContract(fixture);
  const second = createAgentTaskContract(fixture);

  assert.equal(first.schemaVersion, AGENT_TASK_CONTRACT_SCHEMA_VERSION);
  assert.equal(first.contractDigest, second.contractDigest);
  assert.equal(first.requestDigest, second.requestDigest);
  assert.deepEqual(Object.keys(first.crispe).sort(), [
    "capacity",
    "examples",
    "insight",
    "personality",
    "role",
    "statement",
  ]);
  assert.deepEqual(first.authorityPolicy.codeWriteAllowed, false);
  assert.equal(first.route.primaryLane, "A14");
  assert.equal(verifyAgentTaskContract(first).ok, true);

  const tampered = {
    ...first,
    claimCeiling: "implemented",
  };
  assert.equal(verifyAgentTaskContract(tampered).ok, false);
});

test("clarification facts create a new contract identity without changing request identity", async () => {
  const { createAgentTaskContract } = await import("./artifacts");
  const fixture = routedFixture();
  const original = createAgentTaskContract(fixture);
  const clarified = createAgentTaskContract({
    ...fixture,
    clarificationFacts: ["The parent report must persist through the A12 storage API."],
  });

  assert.equal(clarified.requestDigest, original.requestDigest);
  assert.notEqual(clarified.contractDigest, original.contractDigest);
  assert.ok(
    clarified.knowledge.explicitRequirements.includes(
      "The parent report must persist through the A12 storage API.",
    ),
  );
});

test("AgentOpsHandoffV1 is deterministic and cannot create completion or live claims", async () => {
  const { createAgentOpsHandoff, createAgentTaskContract, verifyAgentOpsHandoff } =
    await import("./artifacts");
  const contract = createAgentTaskContract(routedFixture());
  const input = {
    contract,
    terminalStatus: "handoff-ready" as const,
    checksPerformed: [
      {
        checkId: "registry-parity",
        status: "passed" as const,
        summary: "A01-A25 registry parity is current.",
        evidenceDigest: "a".repeat(64),
      },
    ],
    checksNotPerformed: ["No live provider evaluation was executed."],
    blockers: [],
    permittedEffects: ["repository-read" as const],
    nextOwner: "A14" as const,
    nextAllowedAction: "Review the parent-console implementation contract.",
    resumeGate: "An isolated A14 writer session is authorized.",
    redactionDeclaration: "No credentials, student data, protected content, or raw responses are present.",
  };
  const first = createAgentOpsHandoff(input);
  const second = createAgentOpsHandoff(input);

  assert.equal(first.handoffDigest, second.handoffDigest);
  assert.equal(first.claimCeiling, "handoff-ready");
  assert.equal(verifyAgentOpsHandoff(first).ok, true);
  assert.throws(
    () => createAgentOpsHandoff({ ...input, nextAllowedAction: "Mark this deployed and live." }),
    /claim|deployed|live|forbidden/i,
  );
  assert.throws(
    () =>
      createAgentOpsHandoff({
        ...input,
        permittedEffects: ["repository-read", "deterministic-validation"],
      }),
    /permitted|requested|effect/i,
  );
  assert.throws(
    () => createAgentOpsHandoff({ ...input, nextOwner: "A13" }),
    /owner|route|lane/i,
  );
});

test("AgentOpsEventV1 forms a tamper-evident append-only hash chain", async () => {
  const { createAgentOpsEvent, verifyAgentOpsEventChain } = await import("./artifacts");
  const first = createAgentOpsEvent({
    runId: "run-abc123",
    sequence: 1,
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Request schema validated.",
      evidenceDigests: ["b".repeat(64)],
      repositoryPaths: [],
    },
    previousEventDigest: null,
    producedAt: "2026-08-27T00:00:00.000Z",
  });
  const second = createAgentOpsEvent({
    runId: "run-abc123",
    sequence: 2,
    nodeId: "agentops.contract",
    status: "completed",
    sanitizedEvidence: {
      summary: "Canonical contract created.",
      evidenceDigests: ["c".repeat(64)],
      repositoryPaths: [],
    },
    previousEventDigest: first.eventDigest,
    producedAt: "2026-08-27T00:00:01.000Z",
  });

  assert.equal(verifyAgentOpsEventChain([first, second]).ok, true);
  assert.equal(
    verifyAgentOpsEventChain([
      first,
      { ...second, sequence: 3 },
    ]).ok,
    false,
  );
  assert.equal(verifyAgentOpsEventChain([second, first]).ok, false);
});

test("digest recomputation cannot legitimize unknown nested contract, handoff, or event fields", async () => {
  const {
    createAgentOpsEvent,
    createAgentOpsHandoff,
    createAgentTaskContract,
    verifyAgentOpsEventChain,
    verifyAgentOpsHandoff,
    verifyAgentTaskContract,
  } = await import("./artifacts");
  const contract = createAgentTaskContract(routedFixture());
  const contractBody = {
    ...contract,
    authorityPolicy: {
      ...contract.authorityPolicy,
      promptCanEnableWrites: true,
    },
  } as Record<string, unknown>;
  delete contractBody.contractDigest;
  const forgedContract = {
    ...contractBody,
    contractDigest: sha256Digest(contractBody),
  };
  assert.equal(verifyAgentTaskContract(forgedContract).ok, false);

  const handoff = createAgentOpsHandoff({
    contract,
    terminalStatus: "handoff-ready",
    checksPerformed: [],
    checksNotPerformed: ["No external effects were executed."],
    blockers: [],
    permittedEffects: ["repository-read"],
    nextOwner: "A14",
    nextAllowedAction: "Review the bounded handoff.",
    resumeGate: "The exact owner accepts the contract.",
    redactionDeclaration: "Only sanitized evidence is present.",
  });
  const handoffBody = {
    ...handoff,
    route: { ...handoff.route, arbitraryRunner: "forbidden" },
  } as Record<string, unknown>;
  delete handoffBody.handoffDigest;
  const forgedHandoff = {
    ...handoffBody,
    handoffDigest: sha256Digest(handoffBody),
  };
  assert.equal(verifyAgentOpsHandoff(forgedHandoff).ok, false);

  const event = createAgentOpsEvent({
    runId: contract.runId,
    sequence: 1,
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Safe evidence.",
      evidenceDigests: ["d".repeat(64)],
      repositoryPaths: [],
    },
    previousEventDigest: null,
    producedAt: "2026-08-28T00:00:00.000Z",
  });
  const eventBody = {
    ...event,
    sanitizedEvidence: {
      ...event.sanitizedEvidence,
      rawProviderResponse: "forbidden",
    },
  } as Record<string, unknown>;
  delete eventBody.eventDigest;
  const forgedEvent = {
    ...eventBody,
    eventDigest: sha256Digest(eventBody),
  };
  assert.equal(verifyAgentOpsEventChain([forgedEvent as never]).ok, false);
});
