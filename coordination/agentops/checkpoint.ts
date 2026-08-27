import { randomUUID } from "node:crypto";
import {
  mkdir,
  lstat,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import {
  createAgentOpsEvent,
  verifyAgentOpsEventChain,
  verifyAgentOpsHandoff,
  verifyAgentOpsHandoffContractBinding,
  verifyAgentTaskContract,
  type AgentOpsEventV1,
  type AgentOpsHandoffV1,
  type AgentOpsNodeIdV1,
  type AgentOpsTerminalStatusV1,
  type AgentTaskContractV1,
  type VerificationResultV1,
} from "./artifacts";
import { canonicalJson, sha256Digest } from "./canonical";
import {
  assertNoSensitivePersistence,
  type SanitizedEvidenceV1,
} from "./security";

const RUN_MANIFEST_SCHEMA_VERSION = "mais-agentops-run-manifest.v1" as const;
const RUN_MANIFEST_KEYS = Object.freeze([
  "schemaVersion",
  "runId",
  "requestDigest",
  "contractDigest",
  "registryDigest",
  "agentsPolicyDigest",
  "repositoryRootDigest",
  "createdAt",
  "contractRevision",
  "priorContractDigests",
  "manifestDigest",
] as const);

export interface AgentOpsRunIdentityV1 {
  readonly requestDigest: string;
  readonly contractDigest: string;
  readonly registryDigest: string;
  readonly agentsPolicyDigest: string;
  readonly repositoryRootDigest: string;
}

export interface AgentOpsRunManifestV1 extends AgentOpsRunIdentityV1 {
  readonly schemaVersion: typeof RUN_MANIFEST_SCHEMA_VERSION;
  readonly runId: string;
  readonly createdAt: string;
  readonly contractRevision: number;
  readonly priorContractDigests: readonly string[];
  readonly manifestDigest: string;
}

export interface AgentOpsRunStatusV1 {
  readonly runId: string;
  readonly manifest: AgentOpsRunManifestV1;
  readonly terminalStatus: AgentOpsTerminalStatusV1 | null;
  readonly eventCount: number;
  readonly latestNodeId: AgentOpsNodeIdV1 | null;
  readonly handoffDigest: string | null;
  readonly integrity: VerificationResultV1;
}

interface RunStoreOptions {
  readonly now?: () => string;
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "EEXIST";
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertDigest(value: string, pathName: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${pathName} must be a lowercase SHA-256 digest`);
  }
}

function assertIdentity(identity: AgentOpsRunIdentityV1): void {
  assertDigest(identity.requestDigest, "requestDigest");
  assertDigest(identity.contractDigest, "contractDigest");
  assertDigest(identity.registryDigest, "registryDigest");
  assertDigest(identity.agentsPolicyDigest, "agentsPolicyDigest");
  assertDigest(identity.repositoryRootDigest, "repositoryRootDigest");
}

function withoutManifestDigest(
  manifest: AgentOpsRunManifestV1,
): Omit<AgentOpsRunManifestV1, "manifestDigest"> {
  const { manifestDigest: _digest, ...body } = manifest;
  return body;
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export class AgentOpsRunStore {
  readonly runDirectory: string;
  private readonly now: () => string;
  private readonly eventsDirectory: string;
  private readonly lockDirectory: string;
  private readonly executionLockDirectory: string;
  private readonly manifestPath: string;
  private readonly graphStatePath: string;
  private readonly langGraphMemoryPath: string;
  private readonly contractPath: string;
  private readonly handoffPath: string;

  constructor(
    readonly repoRoot: string,
    readonly runId: string,
    options: RunStoreOptions = {},
  ) {
    if (!path.isAbsolute(repoRoot)) {
      throw new TypeError("repoRoot must be absolute");
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(runId)) {
      throw new TypeError("runId contains unsafe path characters");
    }
    this.runDirectory = path.join(repoRoot, ".local", "agentops", runId);
    this.eventsDirectory = path.join(this.runDirectory, "events");
    this.lockDirectory = path.join(this.runDirectory, ".lock");
    this.executionLockDirectory = path.join(
      this.runDirectory,
      ".execution-lock",
    );
    this.manifestPath = path.join(this.runDirectory, "manifest.json");
    this.graphStatePath = path.join(this.runDirectory, "graph-state.json");
    this.langGraphMemoryPath = path.join(
      this.runDirectory,
      "langgraph-memory.json",
    );
    this.contractPath = path.join(this.runDirectory, "contract.json");
    this.handoffPath = path.join(this.runDirectory, "handoff.json");
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private async atomicWriteJson(destination: string, value: unknown): Promise<void> {
    assertNoSensitivePersistence(value);
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${canonicalJson(value)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
  }

  private async readArtifactText(
    artifactPath: string,
    artifactName: string,
  ): Promise<string> {
    await this.assertStateDirectoriesSafe();
    const metadata = await lstat(artifactPath);
    if (
      metadata.isSymbolicLink() ||
      !metadata.isFile() ||
      metadata.nlink !== 1
    ) {
      throw new TypeError(
        `${artifactName} artifact must be a regular non-symlink single-link file`,
      );
    }
    const [resolvedArtifact, resolvedRunDirectory] = await Promise.all([
      realpath(artifactPath),
      realpath(this.runDirectory),
    ]);
    if (!isInsideRoot(resolvedRunDirectory, resolvedArtifact)) {
      throw new TypeError(`${artifactName} artifact escapes the AgentOps run directory`);
    }
    return readFile(resolvedArtifact, "utf8");
  }

  private stateDirectories(): readonly string[] {
    return [
      path.join(this.repoRoot, ".local"),
      path.join(this.repoRoot, ".local", "agentops"),
      this.runDirectory,
      this.eventsDirectory,
    ];
  }

  private async assertStateDirectoriesSafe(): Promise<void> {
    const resolvedRepoRoot = await realpath(this.repoRoot);
    for (const directory of this.stateDirectories()) {
      const metadata = await lstat(directory);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new TypeError("AgentOps state directory must not be a symlink or non-directory");
      }
      const resolvedDirectory = await realpath(directory);
      if (!isInsideRoot(resolvedRepoRoot, resolvedDirectory)) {
        throw new TypeError("AgentOps state directory escapes the repository root");
      }
    }
  }

  private async ensureStateDirectoriesSafe(): Promise<void> {
    const resolvedRepoRoot = await realpath(this.repoRoot);
    for (const directory of this.stateDirectories()) {
      if (
        directory === this.eventsDirectory &&
        (await pathExists(this.manifestPath)) &&
        !(await pathExists(this.eventsDirectory))
      ) {
        throw new Error(
          "existing AgentOps run is missing its event directory",
        );
      }
      try {
        await mkdir(directory, { mode: 0o700 });
      } catch (error) {
        if (!isAlreadyExists(error)) throw error;
      }
      const metadata = await lstat(directory);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new TypeError("AgentOps state directory must not be a symlink or non-directory");
      }
      const resolvedDirectory = await realpath(directory);
      if (!isInsideRoot(resolvedRepoRoot, resolvedDirectory)) {
        throw new TypeError("AgentOps state directory escapes the repository root");
      }
    }
  }

  async withRunLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.assertStateDirectoriesSafe();
    try {
      await mkdir(this.lockDirectory, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`run ${this.runId} has an active concurrent lock`);
      }
      throw error;
    }
    const ownerPath = path.join(this.lockDirectory, "owner.json");
    try {
      await this.atomicWriteJson(ownerPath, {
        runId: this.runId,
        processId: process.pid,
        acquiredAt: this.now(),
      });
      return await operation();
    } finally {
      try {
        await unlink(ownerPath);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      await rmdir(this.lockDirectory);
    }
  }

  async withExecutionLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.assertStateDirectoriesSafe();
    try {
      await mkdir(this.executionLockDirectory, { mode: 0o700 });
    } catch (error) {
      if (isAlreadyExists(error)) {
        throw new Error(`run ${this.runId} has an active execution lock`);
      }
      throw error;
    }
    const ownerPath = path.join(this.executionLockDirectory, "owner.json");
    try {
      await this.atomicWriteJson(ownerPath, {
        runId: this.runId,
        processId: process.pid,
        acquiredAt: this.now(),
      });
      return await operation();
    } finally {
      try {
        await unlink(ownerPath);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      await rmdir(this.executionLockDirectory);
    }
  }

  async initialize(identity: AgentOpsRunIdentityV1): Promise<AgentOpsRunManifestV1> {
    assertIdentity(identity);
    await this.ensureStateDirectoriesSafe();
    return this.withRunLock(async () => {
      if (await pathExists(this.manifestPath)) {
        const existing = await this.readManifest();
        this.assertIdentityMatches(existing, identity);
        return existing;
      }
      const body: Omit<AgentOpsRunManifestV1, "manifestDigest"> = {
        schemaVersion: RUN_MANIFEST_SCHEMA_VERSION,
        runId: this.runId,
        ...identity,
        createdAt: this.now(),
        contractRevision: 1,
        priorContractDigests: [],
      };
      const manifest: AgentOpsRunManifestV1 = {
        ...body,
        manifestDigest: sha256Digest(body),
      };
      await this.atomicWriteJson(this.manifestPath, manifest);
      return manifest;
    });
  }

  private assertIdentityMatches(
    manifest: AgentOpsRunManifestV1,
    identity: AgentOpsRunIdentityV1,
  ): void {
    for (const key of Object.keys(identity) as (keyof AgentOpsRunIdentityV1)[]) {
      if (manifest[key] !== identity[key]) {
        throw new Error(`run identity mismatch for ${key}; resume is stale`);
      }
    }
  }

  async readManifest(): Promise<AgentOpsRunManifestV1> {
    await this.assertStateDirectoriesSafe();
    const parsed = JSON.parse(
      await this.readArtifactText(this.manifestPath, "manifest"),
    ) as
      | AgentOpsRunManifestV1
      | undefined;
    const parsedKeys =
      parsed && typeof parsed === "object" ? Object.keys(parsed).sort() : [];
    const expectedKeys = [...RUN_MANIFEST_KEYS].sort();
    if (
      !parsed ||
      parsedKeys.length !== expectedKeys.length ||
      parsedKeys.some((key, index) => key !== expectedKeys[index]) ||
      parsed.schemaVersion !== RUN_MANIFEST_SCHEMA_VERSION ||
      parsed.runId !== this.runId
    ) {
      throw new Error("run manifest schema or run identity is invalid");
    }
    assertIdentity(parsed);
    if (
      !Number.isSafeInteger(parsed.contractRevision) ||
      parsed.contractRevision < 1 ||
      !Array.isArray(parsed.priorContractDigests) ||
      parsed.priorContractDigests.some(
        (digest) => typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest),
      ) ||
      parsed.priorContractDigests.length !== parsed.contractRevision - 1
    ) {
      throw new Error("run manifest contract revision history is invalid");
    }
    if (sha256Digest(withoutManifestDigest(parsed)) !== parsed.manifestDigest) {
      throw new Error("run manifest digest mismatch");
    }
    assertNoSensitivePersistence(parsed);
    return parsed;
  }

  async readEvents(): Promise<readonly AgentOpsEventV1[]> {
    await this.assertStateDirectoriesSafe();
    const directoryNames = await readdir(this.eventsDirectory);
    const invalidNames = directoryNames.filter(
      (name) => !/^\d{6}-[a-f0-9]{64}\.json$/.test(name),
    );
    if (invalidNames.length > 0) {
      throw new Error("event-chain integrity failure: unexpected event-directory entry");
    }
    const names = directoryNames.sort();
    const events = await Promise.all(
      names.map(async (name) =>
        JSON.parse(
          await this.readArtifactText(
            path.join(this.eventsDirectory, name),
            "event",
          ),
        ) as AgentOpsEventV1,
      ),
    );
    const verification = verifyAgentOpsEventChain(events);
    if (!verification.ok) {
      throw new Error(`event-chain integrity failure: ${verification.errors.join("; ")}`);
    }
    for (const event of events) {
      if (event.runId !== this.runId) {
        throw new Error("event belongs to another run");
      }
    }
    return events;
  }

  async reviseContractDigest(
    expectedCurrentDigest: string,
    nextContractDigest: string,
  ): Promise<AgentOpsRunManifestV1> {
    assertDigest(expectedCurrentDigest, "expectedCurrentDigest");
    assertDigest(nextContractDigest, "nextContractDigest");
    return this.withRunLock(async () => {
      const current = await this.readManifest();
      if (nextContractDigest === current.contractDigest) {
        return current;
      }
      if (current.contractDigest !== expectedCurrentDigest) {
        throw new Error("current contract digest mismatch; revision is stale");
      }
      const body: Omit<AgentOpsRunManifestV1, "manifestDigest"> = {
        ...withoutManifestDigest(current),
        contractDigest: nextContractDigest,
        contractRevision: current.contractRevision + 1,
        priorContractDigests: [
          ...current.priorContractDigests,
          current.contractDigest,
        ],
      };
      const revised: AgentOpsRunManifestV1 = {
        ...body,
        manifestDigest: sha256Digest(body),
      };
      await this.atomicWriteJson(this.manifestPath, revised);
      return revised;
    });
  }

  async appendEvent(input: {
    readonly nodeId: AgentOpsNodeIdV1;
    readonly status: AgentOpsEventV1["status"];
    readonly sanitizedEvidence: SanitizedEvidenceV1;
  }): Promise<AgentOpsEventV1> {
    return this.withRunLock(async () => {
      await this.readManifest();
      const events = await this.readEvents();
      const previous = events.at(-1);
      const event = createAgentOpsEvent({
        runId: this.runId,
        sequence: events.length + 1,
        nodeId: input.nodeId,
        status: input.status,
        sanitizedEvidence: input.sanitizedEvidence,
        previousEventDigest: previous?.eventDigest ?? null,
        producedAt: this.now(),
      });
      const filename = `${String(event.sequence).padStart(6, "0")}-${event.eventDigest}.json`;
      await this.atomicWriteJson(path.join(this.eventsDirectory, filename), event);
      return event;
    });
  }

  async writeGraphState(state: unknown): Promise<void> {
    await this.withRunLock(async () => {
      await this.readManifest();
      await this.atomicWriteJson(this.graphStatePath, state);
    });
  }

  async readGraphState<T = unknown>(): Promise<T> {
    await this.assertStateDirectoriesSafe();
    const value = JSON.parse(
      await this.readArtifactText(this.graphStatePath, "graph state"),
    ) as T;
    assertNoSensitivePersistence(value);
    return value;
  }

  async writeLangGraphMemory(snapshot: unknown): Promise<void> {
    await this.withRunLock(async () => {
      await this.readManifest();
      await this.atomicWriteJson(this.langGraphMemoryPath, snapshot);
    });
  }

  async readLangGraphMemory<T = unknown>(): Promise<T | null> {
    await this.assertStateDirectoriesSafe();
    try {
      const value = JSON.parse(
        await this.readArtifactText(
          this.langGraphMemoryPath,
          "LangGraph memory",
        ),
      ) as T;
      assertNoSensitivePersistence(value);
      return value;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async writeContract(contract: AgentTaskContractV1): Promise<void> {
    const verification = verifyAgentTaskContract(contract);
    if (!verification.ok) {
      throw new TypeError(`invalid contract: ${verification.errors.join("; ")}`);
    }
    if (contract.runId !== this.runId) {
      throw new TypeError("contract belongs to another run");
    }
    await this.withRunLock(async () => {
      const manifest = await this.readManifest();
      if (manifest.contractDigest !== contract.contractDigest) {
        throw new TypeError("contract digest does not match the current run manifest");
      }
      await this.atomicWriteJson(this.contractPath, contract);
    });
  }

  async readContract(): Promise<AgentTaskContractV1 | null> {
    await this.assertStateDirectoriesSafe();
    try {
      const contract = JSON.parse(
        await this.readArtifactText(this.contractPath, "contract"),
      ) as AgentTaskContractV1;
      const verification = verifyAgentTaskContract(contract);
      if (!verification.ok || contract.runId !== this.runId) {
        throw new Error(`contract integrity failure: ${verification.errors.join("; ")}`);
      }
      const manifest = await this.readManifest();
      if (
        contract.requestDigest !== manifest.requestDigest ||
        contract.contractDigest !== manifest.contractDigest ||
        contract.policyDigests.registryDigest !== manifest.registryDigest ||
        contract.policyDigests.agentsPolicyDigest !==
          manifest.agentsPolicyDigest ||
        contract.repositorySnapshot.rootDigest !== manifest.repositoryRootDigest
      ) {
        throw new Error("contract identity does not match the current run manifest");
      }
      return contract;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async writeHandoff(handoff: AgentOpsHandoffV1): Promise<void> {
    const verification = verifyAgentOpsHandoff(handoff);
    if (!verification.ok) {
      throw new TypeError(`invalid handoff: ${verification.errors.join("; ")}`);
    }
    if (handoff.runId !== this.runId) {
      throw new TypeError("handoff belongs to another run");
    }
    await this.withRunLock(async () => {
      const manifest = await this.readManifest();
      if (
        handoff.requestDigest !== manifest.requestDigest ||
        handoff.contractDigest !== manifest.contractDigest
      ) {
        throw new TypeError("handoff identity does not match the current run manifest");
      }
      const contract = await this.readContract();
      if (!contract) {
        throw new TypeError("handoff cannot be written without the current contract");
      }
      const binding = verifyAgentOpsHandoffContractBinding(handoff, contract);
      if (!binding.ok) {
        throw new TypeError(binding.errors.join("; "));
      }
      await this.atomicWriteJson(this.handoffPath, handoff);
    });
  }

  async readHandoff(): Promise<AgentOpsHandoffV1 | null> {
    await this.assertStateDirectoriesSafe();
    try {
      const handoff = JSON.parse(
        await this.readArtifactText(this.handoffPath, "handoff"),
      ) as AgentOpsHandoffV1;
      const verification = verifyAgentOpsHandoff(handoff);
      if (!verification.ok || handoff.runId !== this.runId) {
        throw new Error(`handoff integrity failure: ${verification.errors.join("; ")}`);
      }
      const manifest = await this.readManifest();
      if (
        handoff.requestDigest !== manifest.requestDigest ||
        handoff.contractDigest !== manifest.contractDigest
      ) {
        throw new Error("handoff identity does not match the current run manifest");
      }
      const contract = await this.readContract();
      if (!contract) {
        throw new Error("handoff has no current contract artifact");
      }
      const binding = verifyAgentOpsHandoffContractBinding(handoff, contract);
      if (!binding.ok) {
        throw new Error(binding.errors.join("; "));
      }
      return handoff;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async assertResumeCompatible(identity: AgentOpsRunIdentityV1): Promise<void> {
    assertIdentity(identity);
    const manifest = await this.readManifest();
    this.assertIdentityMatches(manifest, identity);
    await this.readEvents();
    const contract = await this.readContract();
    if (!contract || contract.contractDigest !== identity.contractDigest) {
      throw new Error("current contract artifact is missing or stale");
    }
    await this.readHandoff();
  }

  async status(): Promise<AgentOpsRunStatusV1> {
    const errors: string[] = [];
    let manifest: AgentOpsRunManifestV1;
    let events: readonly AgentOpsEventV1[] = [];
    let handoff: AgentOpsHandoffV1 | null = null;
    let contract: AgentTaskContractV1 | null = null;
    try {
      manifest = await this.readManifest();
    } catch (error) {
      throw new Error(`manifest integrity failure: ${(error as Error).message}`);
    }
    try {
      contract = await this.readContract();
      if (!contract || contract.contractDigest !== manifest.contractDigest) {
        errors.push("current contract artifact is missing or stale");
      }
    } catch (error) {
      errors.push((error as Error).message);
    }
    try {
      events = await this.readEvents();
    } catch (error) {
      errors.push((error as Error).message);
    }
    try {
      handoff = await this.readHandoff();
    } catch (error) {
      errors.push((error as Error).message);
    }
    return {
      runId: this.runId,
      manifest,
      terminalStatus:
        handoff?.terminalStatus ??
        (events.at(-1)?.status === "interrupted"
          ? "clarification-required"
          : null),
      eventCount: events.length,
      latestNodeId: events.at(-1)?.nodeId ?? null,
      handoffDigest: handoff?.handoffDigest ?? null,
      integrity: { ok: errors.length === 0, errors },
    };
  }
}
