import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createAgentOpsHandoff,
  createAgentTaskContract,
  verifyAgentOpsHandoff,
  type AgentOpsHandoffV1,
} from "./artifacts";
import { sha256Digest } from "./canonical";
import { parseAgentOpsRequest } from "./contracts";
import { routeAgentTask } from "./routing";
import { discoveryFixture, requestFixture } from "./test-fixtures";

function contractFixture(clarificationFacts: readonly string[] = []) {
  const request = parseAgentOpsRequest(requestFixture());
  const discovery = discoveryFixture();
  const route = routeAgentTask(request, discovery);
  return createAgentTaskContract({
    request,
    discovery,
    route,
    clarificationFacts,
  });
}

test("local run store atomically persists manifest, event chain, state, and handoff", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-store-"));
  const contract = contractFixture();
  const store = new AgentOpsRunStore(repoRoot, contract.runId, {
    now: () => "2026-08-27T00:00:00.000Z",
  });
  await store.initialize({
    requestDigest: contract.requestDigest,
    contractDigest: contract.contractDigest,
    registryDigest: contract.policyDigests.registryDigest,
    agentsPolicyDigest: contract.policyDigests.agentsPolicyDigest,
    repositoryRootDigest: contract.repositorySnapshot.rootDigest,
  });
  await store.appendEvent({
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Request schema validated.",
      evidenceDigests: [contract.requestDigest],
      repositoryPaths: [],
    },
  });
  await store.appendEvent({
    nodeId: "agentops.contract",
    status: "completed",
    sanitizedEvidence: {
      summary: "Contract digest created.",
      evidenceDigests: [contract.contractDigest],
      repositoryPaths: [],
    },
  });
  await store.writeGraphState({ contract, stage: "agentops.contract" });
  await store.writeContract(contract);
  const handoff = createAgentOpsHandoff({
    contract,
    terminalStatus: "handoff-ready",
    checksPerformed: [],
    checksNotPerformed: ["No external execution was performed."],
    blockers: [],
    permittedEffects: ["repository-read"],
    nextOwner: "A14",
    nextAllowedAction: "Review the handoff in an isolated A14 session.",
    resumeGate: "A14 ownership and clean baseline are confirmed.",
    redactionDeclaration: "Outward fields contain only sanitized summaries and digests.",
  });
  await store.writeHandoff(handoff);

  const status = await store.status();
  assert.equal(status.eventCount, 2);
  assert.equal(status.handoffDigest, handoff.handoffDigest);
  assert.equal(status.integrity.ok, true, JSON.stringify(status.integrity));
  assert.deepEqual(await store.readGraphState(), {
    contract,
    stage: "agentops.contract",
  });
  assert.deepEqual(await store.readContract(), contract);
  assert.deepEqual(
    (await readdir(store.runDirectory)).filter((name) => name.endsWith(".tmp")),
    [],
  );
});

test("run-level lock rejects a concurrent resume", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-lock-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-lock-test");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });

  await store.withRunLock(async () => {
    await assert.rejects(
      () => store.withRunLock(async () => undefined),
      /lock|concurrent|active/i,
    );
  });
});

test("execution lock spans a whole run and rejects a second executor", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-execution-lock-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-execution-lock");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });

  await store.withExecutionLock(async () => {
    await assert.rejects(
      () => store.withExecutionLock(async () => undefined),
      /active execution lock|concurrent execution/i,
    );
  });
});

test("checkpoint initialization rejects a symlinked local-state parent without writing outside the repository", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-state-symlink-"));
  const outside = await mkdtemp(path.join(tmpdir(), "agentops-state-outside-"));
  await symlink(outside, path.join(repoRoot, ".local"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-state-symlink");

  await assert.rejects(
    () =>
      store.initialize({
        requestDigest: "1".repeat(64),
        contractDigest: "2".repeat(64),
        registryDigest: "3".repeat(64),
        agentsPolicyDigest: "4".repeat(64),
        repositoryRootDigest: "5".repeat(64),
      }),
    /symlink|escape|state.*directory/i,
  );
  assert.deepEqual(await readdir(outside), []);
});

test("checkpoint reads reject a symlinked artifact file even when its JSON is valid", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-file-symlink-"));
  const outside = await mkdtemp(path.join(tmpdir(), "agentops-file-outside-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-file-symlink");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  const manifestPath = path.join(store.runDirectory, "manifest.json");
  const externalManifest = path.join(outside, "manifest.json");
  await writeFile(externalManifest, await readFile(manifestPath));
  await unlink(manifestPath);
  await symlink(externalManifest, manifestPath);

  await assert.rejects(
    () => store.readManifest(),
    /artifact|manifest|symlink|regular file|outside/i,
  );
});

test("manifest verification rejects unknown fields even when its digest is recomputed", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-manifest-schema-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-manifest-schema");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  const manifestPath = path.join(store.runDirectory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  const { manifestDigest: _discarded, ...body } = manifest;
  const forgedBody = { ...body, shell: "ignored but forbidden" };
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      ...forgedBody,
      manifestDigest: sha256Digest(forgedBody),
    })}\n`,
    "utf8",
  );

  await assert.rejects(
    () => store.readManifest(),
    /manifest|schema|unknown|fields/i,
  );
});

test("contract reads reject a self-valid manifest with mismatched run identity", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-manifest-binding-"));
  const contract = contractFixture();
  const store = new AgentOpsRunStore(repoRoot, contract.runId);
  await store.initialize({
    requestDigest: contract.requestDigest,
    contractDigest: contract.contractDigest,
    registryDigest: contract.policyDigests.registryDigest,
    agentsPolicyDigest: contract.policyDigests.agentsPolicyDigest,
    repositoryRootDigest: contract.repositorySnapshot.rootDigest,
  });
  await store.writeContract(contract);
  const manifestPath = path.join(store.runDirectory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  const { manifestDigest: _discarded, ...manifestBody } = manifest;
  const forgedBody = { ...manifestBody, requestDigest: "9".repeat(64) };
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      ...forgedBody,
      manifestDigest: sha256Digest(forgedBody),
    })}\n`,
    "utf8",
  );

  await assert.rejects(
    () => store.readContract(),
    /contract|manifest|identity|request/i,
  );
});

test("tampered, missing, duplicate, or cross-run events cannot be resumed", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-tamper-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-tamper-test", {
    now: () => "2026-08-27T00:00:00.000Z",
  });
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  await store.appendEvent({
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Safe intake.",
      evidenceDigests: ["6".repeat(64)],
      repositoryPaths: [],
    },
  });
  const eventPath = path.join(
    store.runDirectory,
    "events",
    (await readdir(path.join(store.runDirectory, "events")))[0],
  );
  const event = JSON.parse(await readFile(eventPath, "utf8")) as Record<string, unknown>;
  event.sequence = 9;
  await writeFile(eventPath, `${JSON.stringify(event)}\n`, "utf8");

  await assert.rejects(
    () =>
      store.assertResumeCompatible({
        requestDigest: "1".repeat(64),
        contractDigest: "2".repeat(64),
        registryDigest: "3".repeat(64),
        agentsPolicyDigest: "4".repeat(64),
        repositoryRootDigest: "5".repeat(64),
      }),
    /event|integrity|digest|sequence/i,
  );
});

test("event-chain verification rejects unknown files instead of ignoring them", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-event-extra-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-event-extra");
  await store.initialize({
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  });
  await store.appendEvent({
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Safe intake.",
      evidenceDigests: ["6".repeat(64)],
      repositoryPaths: [],
    },
  });
  await writeFile(
    path.join(store.runDirectory, "events", "unexpected.json"),
    '{}\n',
    "utf8",
  );

  await assert.rejects(
    () => store.readEvents(),
    /event|unexpected|unknown|integrity/i,
  );
});

test("re-initialization rejects a missing event directory for an existing run", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-events-missing-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-events-missing");
  const identity = {
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  };
  await store.initialize(identity);
  await store.appendEvent({
    nodeId: "agentops.intake",
    status: "completed",
    sanitizedEvidence: {
      summary: "Safe intake.",
      evidenceDigests: ["6".repeat(64)],
      repositoryPaths: [],
    },
  });
  await rm(path.join(store.runDirectory, "events"), { recursive: true });

  await assert.rejects(
    () => store.initialize(identity),
    /event|missing|integrity|existing run/i,
  );
});

test("resume rejects request, contract, registry, policy, or repository identity drift", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-drift-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-drift-test");
  const identity = {
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  };
  await store.initialize(identity);

  await assert.rejects(
    () => store.assertResumeCompatible({ ...identity, registryDigest: "9".repeat(64) }),
    /registry|identity|mismatch|stale/i,
  );
});

test("a clarification may revise the contract digest once while preserving prior identity", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-revision-"));
  const store = new AgentOpsRunStore(repoRoot, "agentops-revision-test");
  const identity = {
    requestDigest: "1".repeat(64),
    contractDigest: "2".repeat(64),
    registryDigest: "3".repeat(64),
    agentsPolicyDigest: "4".repeat(64),
    repositoryRootDigest: "5".repeat(64),
  };
  await store.initialize(identity);
  const revised = await store.reviseContractDigest(
    identity.contractDigest,
    "6".repeat(64),
  );

  assert.equal(revised.contractDigest, "6".repeat(64));
  assert.equal(revised.contractRevision, 2);
  assert.deepEqual(revised.priorContractDigests, [identity.contractDigest]);
  const replayed = await store.reviseContractDigest(
    identity.contractDigest,
    "6".repeat(64),
  );
  assert.equal(replayed.contractRevision, 2);
  await assert.rejects(
    () => store.reviseContractDigest(identity.contractDigest, "7".repeat(64)),
    /current|mismatch|stale/i,
  );
});

test("a run rejects a self-valid handoff for a different contract revision", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-handoff-stale-"));
  const currentContract = contractFixture();
  const differentContract = contractFixture([
    "A14 owns the exact parent-console implementation slice.",
  ]);
  assert.equal(differentContract.runId, currentContract.runId);
  assert.notEqual(differentContract.contractDigest, currentContract.contractDigest);
  const store = new AgentOpsRunStore(repoRoot, currentContract.runId);
  await store.initialize({
    requestDigest: currentContract.requestDigest,
    contractDigest: currentContract.contractDigest,
    registryDigest: currentContract.policyDigests.registryDigest,
    agentsPolicyDigest: currentContract.policyDigests.agentsPolicyDigest,
    repositoryRootDigest: currentContract.repositorySnapshot.rootDigest,
  });
  await store.writeContract(currentContract);
  const staleHandoff = createAgentOpsHandoff({
    contract: differentContract,
    terminalStatus: "handoff-ready",
    checksPerformed: [],
    checksNotPerformed: ["No external effect was executed."],
    blockers: [],
    permittedEffects: ["repository-read"],
    nextOwner: "A14",
    nextAllowedAction: "Review the bounded A14 handoff.",
    resumeGate: "The exact A14 slice is authorized separately.",
    redactionDeclaration: "Only sanitized evidence is present.",
  });

  await assert.rejects(
    () => store.writeHandoff(staleHandoff),
    /contract|manifest|stale|identity/i,
  );
});

test("a run rejects a self-valid handoff whose contract-derived route was rewritten", async () => {
  const { AgentOpsRunStore } = await import("./checkpoint");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "agentops-handoff-route-"));
  const contract = contractFixture();
  const store = new AgentOpsRunStore(repoRoot, contract.runId);
  await store.initialize({
    requestDigest: contract.requestDigest,
    contractDigest: contract.contractDigest,
    registryDigest: contract.policyDigests.registryDigest,
    agentsPolicyDigest: contract.policyDigests.agentsPolicyDigest,
    repositoryRootDigest: contract.repositorySnapshot.rootDigest,
  });
  await store.writeContract(contract);
  const validHandoff = createAgentOpsHandoff({
    contract,
    terminalStatus: "handoff-ready",
    checksPerformed: [],
    checksNotPerformed: ["No external effect was executed."],
    blockers: [],
    permittedEffects: ["repository-read"],
    nextOwner: "A14",
    nextAllowedAction: "Review the bounded A14 handoff.",
    resumeGate: "The exact A14 slice is authorized separately.",
    redactionDeclaration: "Only sanitized evidence is present.",
  });
  const { handoffDigest: _discarded, ...validBody } = validHandoff;
  const forgedBody = {
    ...validBody,
    route: {
      ...validBody.route,
      forbiddenPathScopes: [
        ...validBody.route.forbiddenPathScopes,
        "forged-extra-scope/**",
      ],
    },
  };
  const forgedHandoff = {
    ...forgedBody,
    handoffDigest: sha256Digest(forgedBody),
  } as unknown as AgentOpsHandoffV1;
  assert.equal(verifyAgentOpsHandoff(forgedHandoff).ok, true);

  await assert.rejects(
    () => store.writeHandoff(forgedHandoff),
    /contract|route|identity|stale/i,
  );
  await writeFile(
    path.join(store.runDirectory, "handoff.json"),
    `${JSON.stringify(forgedHandoff)}\n`,
    "utf8",
  );
  await assert.rejects(
    () => store.readHandoff(),
    /contract|route|identity|stale|inconsistent/i,
  );
});
