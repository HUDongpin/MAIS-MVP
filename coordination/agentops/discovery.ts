import { execFile as execFileCallback } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { sha256Digest } from "./canonical";
import type { AgentOpsContextRefV1 } from "./contracts";
import {
  PROBE_REGISTRY,
  SPECIALIST_REGISTRY,
  type ProbeId,
} from "./registry";

const execFile = promisify(execFileCallback);
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function repositoryRootDigest(realRoot: string): string {
  return sha256Digest({ repositoryRoot: realRoot });
}

export interface RepositorySnapshotV1 {
  readonly rootDigest: string;
  readonly gitCommonDirDigest: string;
  readonly headSha: string;
  readonly branch: string;
  readonly statusDigest: string;
  readonly dirty: boolean;
}

export interface WorktreeObservationV1 {
  readonly rootDigest: string;
  readonly headSha: string;
  readonly branch: string;
  readonly dirty: boolean;
  readonly changedPaths: readonly string[];
}

export interface ContextBoundaryObservationV1 {
  readonly kind: AgentOpsContextRefV1["kind"];
  readonly value: string;
  readonly exists: boolean;
  readonly resolvedPathDigest?: string;
}

export interface DiscoveryResultV1 {
  readonly repositorySnapshot: RepositorySnapshotV1;
  readonly executedProbeIds: readonly ProbeId[];
  readonly policyDigests: Readonly<{
    agentsPolicyDigest: string;
    releaseOwnerPathspecsDigest: string;
    releasePackageManifestDigest: string;
  }>;
  readonly worktrees: readonly WorktreeObservationV1[];
  readonly contextBoundaries: readonly ContextBoundaryObservationV1[];
  readonly specialistAvailability: Readonly<Record<string, boolean>>;
}

async function git(repoRoot: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFile("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });
  return stdout;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeRepoPath(value: string): void {
  const normalized = value.toLowerCase();
  const segments = normalized.split("/");
  if (
    path.isAbsolute(value) ||
    value.includes("\\") ||
    segments.some((segment) => segment === "" || segment === "..")
  ) {
    throw new TypeError("context path must remain repository-relative");
  }
  if (
    segments.some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        segment.includes("credential") ||
        segment.includes("secret") ||
        segment === "all api keys.docx" ||
        segment.endsWith(".pem") ||
        segment.endsWith(".key"),
    )
  ) {
    throw new TypeError("context path targets forbidden credential material");
  }
}

async function exists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function resolveExistingAncestor(candidate: string): Promise<string> {
  let current = candidate;
  for (;;) {
    if (await exists(current)) {
      return realpath(current);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new TypeError("context path has no resolvable repository ancestor");
    }
    current = parent;
  }
}

async function readTrackedStatus(repoRoot: string): Promise<string> {
  return git(repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=no"]);
}

export function assertTrackedStatusUnchanged(before: string, after: string): void {
  if (before !== after) {
    throw new Error("read-only probe modified tracked repository status");
  }
}

export async function validateRepositoryRoot(requestedRoot: string): Promise<string> {
  if (!path.isAbsolute(requestedRoot)) {
    throw new TypeError("repository root must be an absolute path");
  }
  const resolvedRequestedRoot = await realpath(requestedRoot);
  const discoveredRoot = (
    await git(resolvedRequestedRoot, ["rev-parse", "--show-toplevel"])
  ).trim();
  const resolvedDiscoveredRoot = await realpath(discoveredRoot);
  if (resolvedRequestedRoot !== resolvedDiscoveredRoot) {
    throw new TypeError("requested repository root does not match the Git root");
  }
  return resolvedRequestedRoot;
}

async function readSnapshot(repoRoot: string): Promise<RepositorySnapshotV1> {
  const [headSha, branchOutput, commonDirOutput, status] = await Promise.all([
    git(repoRoot, ["rev-parse", "HEAD"]),
    git(repoRoot, ["branch", "--show-current"]),
    git(repoRoot, ["rev-parse", "--git-common-dir"]),
    git(repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]),
  ]);
  const commonDirCandidate = path.resolve(repoRoot, commonDirOutput.trim());
  const commonDir = await realpath(commonDirCandidate);
  return {
    rootDigest: repositoryRootDigest(repoRoot),
    gitCommonDirDigest: sha256Digest({ realGitCommonDirectory: commonDir }),
    headSha: headSha.trim(),
    branch: branchOutput.trim() || "DETACHED",
    statusDigest: sha256Digest({ porcelainV1Zero: status }),
    dirty: status.length > 0,
  };
}

function parseChangedPaths(status: string): readonly string[] {
  const records = status.split("\0").filter(Boolean);
  const paths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const code = record.slice(0, 2);
    const repositoryPath = record.slice(3);
    if (repositoryPath) {
      paths.push(repositoryPath);
    }
    if (code.includes("R") || code.includes("C")) {
      index += 1;
      if (records[index]) {
        paths.push(records[index]);
      }
    }
  }
  return [...new Set(paths)].sort();
}

async function readWorktrees(repoRoot: string): Promise<readonly WorktreeObservationV1[]> {
  const output = await git(repoRoot, ["worktree", "list", "--porcelain"]);
  const records = output.trim().split(/\n\n+/).filter(Boolean);
  const observations: WorktreeObservationV1[] = [];
  for (const record of records) {
    const fields = new Map<string, string>();
    for (const line of record.split("\n")) {
      const space = line.indexOf(" ");
      fields.set(space === -1 ? line : line.slice(0, space), space === -1 ? "" : line.slice(space + 1));
    }
    const worktreePath = fields.get("worktree");
    const headSha = fields.get("HEAD");
    if (!worktreePath || !headSha) {
      throw new Error("Git returned an incomplete worktree record");
    }
    const resolvedWorktreePath = await realpath(worktreePath);
    const status = await git(resolvedWorktreePath, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=normal",
    ]);
    observations.push({
      rootDigest: repositoryRootDigest(resolvedWorktreePath),
      headSha,
      branch: (fields.get("branch") ?? "DETACHED").replace(/^refs\/heads\//, ""),
      dirty: status.length > 0,
      changedPaths: parseChangedPaths(status),
    });
  }
  return observations.sort((left, right) =>
    left.rootDigest.localeCompare(right.rootDigest),
  );
}

async function readPolicyDigests(repoRoot: string): Promise<DiscoveryResultV1["policyDigests"]> {
  const paths = {
    agentsPolicyDigest: "AGENTS.md",
    releaseOwnerPathspecsDigest:
      "coordination/release-intake/owner-pathspecs.json",
    releasePackageManifestDigest:
      "coordination/release-intake/owner-package-manifest.json",
  } as const;
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, repositoryPath]) => {
      const candidate = path.join(repoRoot, repositoryPath);
      const metadata = await lstat(candidate);
      if (metadata.isSymbolicLink() || !metadata.isFile()) {
        throw new TypeError(`fixed policy source ${repositoryPath} must be a regular non-symlink file`);
      }
      const resolved = await realpath(candidate);
      if (!isInsideRoot(repoRoot, resolved)) {
        throw new TypeError(`fixed policy source ${repositoryPath} escapes the repository`);
      }
      return [
        key,
        sha256Digest({ text: await readFile(resolved, "utf8") }),
      ];
    }),
  );
  return Object.fromEntries(entries) as unknown as DiscoveryResultV1["policyDigests"];
}

async function readContextBoundaries(
  repoRoot: string,
  contextRefs: readonly AgentOpsContextRefV1[],
): Promise<readonly ContextBoundaryObservationV1[]> {
  const observations: ContextBoundaryObservationV1[] = [];
  for (const ref of contextRefs) {
    if (ref.kind !== "repo-path") {
      observations.push({ kind: ref.kind, value: ref.value, exists: true });
      continue;
    }
    assertSafeRepoPath(ref.value);
    const candidate = path.resolve(repoRoot, ref.value);
    if (!isInsideRoot(repoRoot, candidate)) {
      throw new TypeError("context path attempts to escape the repository");
    }
    const candidateExists = await exists(candidate);
    const resolvedBoundary = candidateExists
      ? await realpath(candidate)
      : await resolveExistingAncestor(candidate);
    if (!isInsideRoot(repoRoot, resolvedBoundary)) {
      throw new TypeError("context symlink resolves outside the repository");
    }
    observations.push({
      kind: ref.kind,
      value: ref.value,
      exists: candidateExists,
      resolvedPathDigest: sha256Digest({ resolvedPath: resolvedBoundary }),
    });
  }
  return observations;
}

async function readSpecialistAvailability(
  repoRoot: string,
): Promise<Readonly<Record<string, boolean>>> {
  const result: Record<string, boolean> = {};
  for (const [workflowId, workflow] of Object.entries(SPECIALIST_REGISTRY)) {
    result[workflowId] = (
      await Promise.all(
        workflow.requiredPaths.map(async (repositoryPath) => {
          const candidate = path.join(repoRoot, repositoryPath);
          let metadata;
          try {
            metadata = await lstat(candidate);
          } catch (error) {
            if (isNotFound(error)) return false;
            throw error;
          }
          if (metadata.isSymbolicLink()) return false;
          const resolved = await realpath(candidate);
          return isInsideRoot(repoRoot, resolved);
        }),
      )
    ).every(Boolean);
  }
  return result;
}

export async function discoverRepository(options: {
  readonly repoRoot: string;
  readonly probeIds: readonly ProbeId[];
  readonly contextRefs: readonly AgentOpsContextRefV1[];
}): Promise<Readonly<DiscoveryResultV1>> {
  const repoRoot = await validateRepositoryRoot(options.repoRoot);
  const requested = new Set(options.probeIds);
  for (const probeId of requested) {
    if (!(probeId in PROBE_REGISTRY)) {
      throw new TypeError(`probe ${probeId} is not registered`);
    }
  }
  const executedProbeIds = (Object.keys(PROBE_REGISTRY) as ProbeId[]).filter(
    (probeId) => requested.has(probeId),
  );
  const trackedBefore = await readTrackedStatus(repoRoot);
  const repositorySnapshot = await readSnapshot(repoRoot);
  const policyDigests = requested.has("repo.policy-digests")
    ? await readPolicyDigests(repoRoot)
    : {
        agentsPolicyDigest: "0".repeat(64),
        releaseOwnerPathspecsDigest: "0".repeat(64),
        releasePackageManifestDigest: "0".repeat(64),
      };
  const worktrees = requested.has("git.worktrees")
    ? await readWorktrees(repoRoot)
    : [];
  const contextBoundaries = requested.has("repo.context-boundaries")
    ? await readContextBoundaries(repoRoot, options.contextRefs)
    : [];
  const specialistAvailability = requested.has("repo.specialist-availability")
    ? await readSpecialistAvailability(repoRoot)
    : {};
  const trackedAfter = await readTrackedStatus(repoRoot);
  assertTrackedStatusUnchanged(trackedBefore, trackedAfter);
  return deepFreeze({
    repositorySnapshot,
    executedProbeIds,
    policyDigests,
    worktrees,
    contextBoundaries,
    specialistAvailability,
  });
}
