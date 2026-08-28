import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { canonicalJson, sha256Digest } from "./canonical";

const execFile = promisify(execFileCallback);
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const TREE_RE = /^[a-f0-9]{40}$/;
const SAFE_REPO_PATH_RE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

export const SPECIALIST_CURRENTNESS_MARKER_SCHEMA_VERSION =
  "mais-agentops-specialist-currentness.v1" as const;
export const SPECIALIST_CURRENTNESS_POLICY_VERSION =
  "mais-agentops-specialist-currentness-policy.v1" as const;
export const SPECIALIST_CURRENTNESS_CLAIM_CEILING =
  "repository-specialist-currentness-only" as const;

export const SPECIALIST_CURRENTNESS_POLICY_PATHS = Object.freeze([
  "AGENTS.md",
  "package.json",
  "package-lock.json",
  "coordination/agentops/artifacts.ts",
  "coordination/agentops/bin/agentops",
  "coordination/agentops/canonical.ts",
  "coordination/agentops/currentness.ts",
  "coordination/agentops/discovery.ts",
  "coordination/agentops/registry.ts",
  "coordination/agentops/workflow.ts",
  "coordination/release-intake/owner-pathspecs.json",
  "coordination/release-intake/owner-package-manifest.json",
] as const);

const SUITE_MANIFEST_PATH = "coordination/skills/suite-manifest.json";
const INSTALLATION_RECEIPT_PATH =
  "coordination/skills/benchmarks/installation-receipt.json";

export interface SpecialistCurrentnessExpectationV1 {
  readonly workflowId: string;
  readonly markerPath: string;
  readonly claimCeiling: string;
  readonly registryDigest: string;
  readonly reviewedRepository: {
    readonly reviewedMainCommit: string;
    readonly agentopsCommit: string;
  };
  readonly reviewedSource: {
    readonly baseCommit: string;
    readonly sourceCommit: string;
    readonly receiptCommit: string;
    readonly packageName: string;
    readonly packagePath: string;
    readonly sourceTreeSha256: string;
    readonly packageViewSha256: string;
    readonly packageArchiveSha256: string;
    readonly installedReadbackSha256: string;
    readonly installationReceiptSha256: string;
  };
}

export interface SpecialistCurrentnessRepositorySnapshotInputV1 {
  readonly reviewedMainCommit: string;
  readonly agentopsCommit: string;
  readonly integrationCommit: string;
}

export interface SpecialistCurrentnessMarkerV1 {
  readonly schemaVersion: typeof SPECIALIST_CURRENTNESS_MARKER_SCHEMA_VERSION;
  readonly workflowId: string;
  readonly status: "repository-current";
  readonly claimCeiling: typeof SPECIALIST_CURRENTNESS_CLAIM_CEILING;
  readonly sourceBinding: Readonly<Record<string, unknown>>;
  readonly repositorySnapshot: Readonly<Record<string, unknown>>;
  readonly packageBinding: Readonly<Record<string, unknown>>;
  readonly policyBinding: Readonly<Record<string, unknown>>;
  readonly redaction: Readonly<Record<string, false>>;
  readonly markerDigest: string;
}

export interface SpecialistCurrentnessObservationV1 {
  readonly available: boolean;
  readonly status: "current" | "missing" | "invalid";
  readonly reasonCodes: readonly string[];
  readonly markerDigest: string | null;
}

class CurrentnessError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
    this.name = "CurrentnessError";
  }
}

function fail(reasonCode: string): never {
  throw new CurrentnessError(reasonCode);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function requireRecord(value: unknown, reasonCode: string): Record<string, unknown> {
  if (!isPlainRecord(value)) fail(reasonCode);
  return value;
}

function requireString(value: unknown, reasonCode: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096) {
    fail(reasonCode);
  }
  return value;
}

function requireCommit(value: unknown, reasonCode: string): string {
  const commit = requireString(value, reasonCode);
  if (!COMMIT_RE.test(commit)) fail(reasonCode);
  return commit;
}

function requireHash(value: unknown, reasonCode: string): string {
  const hash = requireString(value, reasonCode);
  if (!HASH_RE.test(hash)) fail(reasonCode);
  return hash;
}

function requireSafePath(value: unknown, reasonCode: string): string {
  const repositoryPath = requireString(value, reasonCode);
  if (
    !SAFE_REPO_PATH_RE.test(repositoryPath) ||
    repositoryPath.includes("\\") ||
    path.isAbsolute(repositoryPath)
  ) {
    fail(reasonCode);
  }
  return repositoryPath;
}

function parseExpectation(value: unknown): SpecialistCurrentnessExpectationV1 {
  const expectation = requireRecord(value, "CURRENTNESS_EXPECTATION_INVALID");
  const source = requireRecord(
    expectation.reviewedSource,
    "CURRENTNESS_EXPECTATION_INVALID",
  );
  return {
    workflowId: requireString(
      expectation.workflowId,
      "CURRENTNESS_EXPECTATION_INVALID",
    ),
    markerPath: requireSafePath(
      expectation.markerPath,
      "CURRENTNESS_EXPECTATION_INVALID",
    ),
    claimCeiling: requireString(
      expectation.claimCeiling,
      "CURRENTNESS_EXPECTATION_INVALID",
    ),
    registryDigest: requireHash(
      expectation.registryDigest,
      "CURRENTNESS_EXPECTATION_INVALID",
    ),
    reviewedRepository: {
      reviewedMainCommit: requireCommit(
        requireRecord(
          expectation.reviewedRepository,
          "CURRENTNESS_EXPECTATION_INVALID",
        ).reviewedMainCommit,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      agentopsCommit: requireCommit(
        requireRecord(
          expectation.reviewedRepository,
          "CURRENTNESS_EXPECTATION_INVALID",
        ).agentopsCommit,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
    },
    reviewedSource: {
      baseCommit: requireCommit(source.baseCommit, "CURRENTNESS_EXPECTATION_INVALID"),
      sourceCommit: requireCommit(
        source.sourceCommit,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      receiptCommit: requireCommit(
        source.receiptCommit,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      packageName: requireString(
        source.packageName,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      packagePath: requireSafePath(
        source.packagePath,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      sourceTreeSha256: requireHash(
        source.sourceTreeSha256,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      packageViewSha256: requireHash(
        source.packageViewSha256,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      packageArchiveSha256: requireHash(
        source.packageArchiveSha256,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      installedReadbackSha256: requireHash(
        source.installedReadbackSha256,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
      installationReceiptSha256: requireHash(
        source.installationReceiptSha256,
        "CURRENTNESS_EXPECTATION_INVALID",
      ),
    },
  };
}

function parseSnapshotInput(
  value: unknown,
): SpecialistCurrentnessRepositorySnapshotInputV1 {
  const snapshot = requireRecord(value, "REPOSITORY_SNAPSHOT_INVALID");
  return {
    reviewedMainCommit: requireCommit(
      snapshot.reviewedMainCommit,
      "REPOSITORY_SNAPSHOT_INVALID",
    ),
    agentopsCommit: requireCommit(
      snapshot.agentopsCommit,
      "REPOSITORY_SNAPSHOT_INVALID",
    ),
    integrationCommit: requireCommit(
      snapshot.integrationCommit,
      "REPOSITORY_SNAPSHOT_INVALID",
    ),
  };
}

async function git(repoRoot: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFile("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });
  return stdout;
}

async function gitSucceeds(
  repoRoot: string,
  args: readonly string[],
): Promise<boolean> {
  try {
    await git(repoRoot, args);
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 1) return false;
    throw error;
  }
}

async function validateRepositoryRoot(repoRoot: string): Promise<string> {
  if (!path.isAbsolute(repoRoot)) fail("REPOSITORY_ROOT_INVALID");
  const resolved = await realpath(repoRoot);
  const discovered = (
    await git(resolved, ["rev-parse", "--show-toplevel"])
  ).trim();
  if ((await realpath(discovered)) !== resolved) fail("REPOSITORY_ROOT_INVALID");
  return resolved;
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readSafeRepositoryFile(
  repoRoot: string,
  repositoryPath: string,
  reasonCode: string,
): Promise<Buffer> {
  requireSafePath(repositoryPath, reasonCode);
  let current = repoRoot;
  for (const segment of repositoryPath.split("/")) {
    current = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
      fail(reasonCode);
    }
    if (metadata.isSymbolicLink()) fail(reasonCode);
  }
  const metadata = await lstat(current);
  if (!metadata.isFile() || metadata.nlink !== 1) fail(reasonCode);
  const resolved = await realpath(current);
  if (!isInsideRoot(repoRoot, resolved)) fail(reasonCode);
  return readFile(resolved);
}

function sha256Bytes(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

interface SkillTreeHashV1 {
  readonly fileCount: number;
  readonly treeSha256: string;
}

async function hashSkillTree(
  skillDirectory: string,
  packageView: boolean,
): Promise<SkillTreeHashV1> {
  const root = await realpath(skillDirectory);
  const rootMetadata = await lstat(root);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    fail("PACKAGE_TREE_INVALID");
  }
  const files: { path: string; sha256: string }[] = [];
  async function visit(current: string): Promise<void> {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    );
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const parts = relative.split("/");
      const excluded =
        packageView &&
        (parts[0] === "evals" ||
          parts.includes("__pycache__") ||
          parts.includes("node_modules") ||
          entry.name === ".DS_Store" ||
          entry.name.endsWith(".pyc"));
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) fail("PACKAGE_TREE_INVALID");
      if (excluded) continue;
      if (metadata.isDirectory()) {
        await visit(absolute);
      } else if (metadata.isFile() && metadata.nlink === 1) {
        files.push({ path: relative, sha256: sha256Bytes(await readFile(absolute)) });
      } else {
        fail("PACKAGE_TREE_INVALID");
      }
    }
  }
  await visit(root);
  if (files.length === 0) fail("PACKAGE_TREE_INVALID");
  return {
    fileCount: files.length,
    treeSha256: sha256Bytes(
      files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""),
    ),
  };
}

function findNamedComponent(
  value: unknown,
  packageName: string,
  reasonCode: string,
): Record<string, unknown> {
  const root = requireRecord(value, reasonCode);
  if (!Array.isArray(root.components)) fail(reasonCode);
  const matches = root.components.filter(
    (component) => isPlainRecord(component) && component.name === packageName,
  );
  if (matches.length !== 1) fail(reasonCode);
  return matches[0] as Record<string, unknown>;
}

function parseJsonBytes(bytes: Buffer, reasonCode: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    fail(reasonCode);
  }
}

async function computePolicyBinding(
  repoRoot: string,
  registryDigest: string,
): Promise<Readonly<Record<string, unknown>>> {
  const sources = await Promise.all(
    SPECIALIST_CURRENTNESS_POLICY_PATHS.map(async (repositoryPath) => ({
      path: repositoryPath,
      sha256: sha256Bytes(
        await readSafeRepositoryFile(
          repoRoot,
          repositoryPath,
          "POLICY_SOURCE_INVALID",
        ),
      ),
    })),
  );
  const byPath = new Map(sources.map((entry) => [entry.path, entry.sha256]));
  const agentsText = (
    await readSafeRepositoryFile(repoRoot, "AGENTS.md", "POLICY_SOURCE_INVALID")
  ).toString("utf8");
  const ownerText = (
    await readSafeRepositoryFile(
      repoRoot,
      "coordination/release-intake/owner-pathspecs.json",
      "POLICY_SOURCE_INVALID",
    )
  ).toString("utf8");
  const packageManifestText = (
    await readSafeRepositoryFile(
      repoRoot,
      "coordination/release-intake/owner-package-manifest.json",
      "POLICY_SOURCE_INVALID",
    )
  ).toString("utf8");
  const body = {
    policyVersion: SPECIALIST_CURRENTNESS_POLICY_VERSION,
    registryDigest,
    agentsPolicyDigest: sha256Digest({ text: agentsText }),
    releaseOwnerPathspecsDigest: sha256Digest({ text: ownerText }),
    releasePackageManifestDigest: sha256Digest({ text: packageManifestText }),
    sources: [...SPECIALIST_CURRENTNESS_POLICY_PATHS]
      .sort()
      .map((repositoryPath) => ({
        path: repositoryPath,
        sha256: byPath.get(repositoryPath),
      })),
  };
  return { ...body, policyDigest: sha256Digest(body) };
}

async function computePackageBinding(
  repoRoot: string,
  expectation: SpecialistCurrentnessExpectationV1,
): Promise<Readonly<Record<string, unknown>>> {
  const source = expectation.reviewedSource;
  const packageRoot = path.join(repoRoot, source.packagePath);
  const [sourceTree, packageView, manifestBytes, receiptBytes] = await Promise.all([
    hashSkillTree(packageRoot, false),
    hashSkillTree(packageRoot, true),
    readSafeRepositoryFile(repoRoot, SUITE_MANIFEST_PATH, "SUITE_MANIFEST_INVALID"),
    readSafeRepositoryFile(
      repoRoot,
      INSTALLATION_RECEIPT_PATH,
      "INSTALLATION_RECEIPT_INVALID",
    ),
  ]);
  if (
    sourceTree.treeSha256 !== source.sourceTreeSha256 ||
    packageView.treeSha256 !== source.packageViewSha256
  ) {
    fail("PACKAGE_HASH_MISMATCH");
  }
  const manifest = requireRecord(
    parseJsonBytes(manifestBytes, "SUITE_MANIFEST_INVALID"),
    "SUITE_MANIFEST_INVALID",
  );
  const manifestComponent = findNamedComponent(
    manifest,
    source.packageName,
    "SUITE_MANIFEST_INVALID",
  );
  const installation = requireRecord(
    manifestComponent.installation,
    "SUITE_MANIFEST_INVALID",
  );
  const manifestReceipt = requireRecord(
    manifest.installationReceipt,
    "SUITE_MANIFEST_INVALID",
  );
  if (
    manifest.status !== "source-package-installation-verified" ||
    manifestComponent.sourceCommit !== source.sourceCommit ||
    manifestComponent.sourceHash !== source.sourceTreeSha256 ||
    manifestComponent.sourceFileCount !== sourceTree.fileCount ||
    manifestComponent.packageViewHash !== source.packageViewSha256 ||
    manifestComponent.packageFileCount !== packageView.fileCount ||
    manifestComponent.packageHash !== source.packageArchiveSha256 ||
    installation.state !== "installed-verified" ||
    installation.readbackHash !== source.installedReadbackSha256 ||
    installation.readbackFileCount !== packageView.fileCount ||
    manifestReceipt.sha256 !== source.installationReceiptSha256 ||
    manifestReceipt.status !== "installed-readback-and-rollback-verified"
  ) {
    fail("SUITE_MANIFEST_MISMATCH");
  }
  const receipt = requireRecord(
    parseJsonBytes(receiptBytes, "INSTALLATION_RECEIPT_INVALID"),
    "INSTALLATION_RECEIPT_INVALID",
  );
  const receiptComponent = findNamedComponent(
    receipt,
    source.packageName,
    "INSTALLATION_RECEIPT_INVALID",
  );
  if (
    sha256Bytes(receiptBytes) !== source.installationReceiptSha256 ||
    receipt.sourceCommit !== source.sourceCommit ||
    receiptComponent.sourceTreeSha256 !== source.sourceTreeSha256 ||
    receiptComponent.sourceFileCount !== sourceTree.fileCount ||
    receiptComponent.packageViewTreeSha256 !== source.packageViewSha256 ||
    receiptComponent.packageFileCount !== packageView.fileCount ||
    receiptComponent.packageArchiveSha256 !== source.packageArchiveSha256 ||
    receiptComponent.installedReadbackTreeSha256 !== source.installedReadbackSha256
  ) {
    fail("INSTALLATION_RECEIPT_MISMATCH");
  }
  return {
    packageName: source.packageName,
    packagePath: source.packagePath,
    sourceTreeSha256: sourceTree.treeSha256,
    sourceFileCount: sourceTree.fileCount,
    packageViewSha256: packageView.treeSha256,
    packageFileCount: packageView.fileCount,
    packageArchiveSha256: source.packageArchiveSha256,
    installedReadbackSha256: source.installedReadbackSha256,
    suiteManifestPath: SUITE_MANIFEST_PATH,
    suiteManifestSha256: sha256Bytes(manifestBytes),
    installationReceiptPath: INSTALLATION_RECEIPT_PATH,
    installationReceiptSha256: sha256Bytes(receiptBytes),
  };
}

async function assertAncestryAndDrift(
  repoRoot: string,
  expectation: SpecialistCurrentnessExpectationV1,
  snapshot: SpecialistCurrentnessRepositorySnapshotInputV1,
  currentHead: string,
): Promise<void> {
  const source = expectation.reviewedSource;
  const sourceParent = (await git(repoRoot, ["rev-parse", `${source.sourceCommit}^`])).trim();
  const receiptParent = (await git(repoRoot, ["rev-parse", `${source.receiptCommit}^`])).trim();
  if (sourceParent !== source.baseCommit || receiptParent !== source.sourceCommit) {
    fail("SOURCE_RECEIPT_PARENT_MISMATCH");
  }
  for (const commit of [
    snapshot.reviewedMainCommit,
    snapshot.agentopsCommit,
    source.sourceCommit,
    source.receiptCommit,
    snapshot.integrationCommit,
  ]) {
    if (!(await gitSucceeds(repoRoot, ["merge-base", "--is-ancestor", commit, currentHead]))) {
      fail("REPOSITORY_ANCESTRY_MISMATCH");
    }
  }
  if (
    !(await gitSucceeds(repoRoot, [
      "diff",
      "--quiet",
      source.sourceCommit,
      currentHead,
      "--",
      source.packagePath,
    ]))
  ) {
    fail("SOURCE_PACKAGE_DRIFT");
  }
  if (
    !(await gitSucceeds(repoRoot, [
      "diff",
      "--quiet",
      source.receiptCommit,
      currentHead,
      "--",
      SUITE_MANIFEST_PATH,
      INSTALLATION_RECEIPT_PATH,
    ]))
  ) {
    fail("RECEIPT_DRIFT");
  }
  const protectedPaths = [
    ...SPECIALIST_CURRENTNESS_POLICY_PATHS,
    source.packagePath,
    SUITE_MANIFEST_PATH,
    INSTALLATION_RECEIPT_PATH,
  ];
  if (
    !(await gitSucceeds(repoRoot, [
      "diff",
      "--quiet",
      snapshot.integrationCommit,
      currentHead,
      "--",
      ...protectedPaths,
    ]))
  ) {
    fail("INTEGRATION_SNAPSHOT_DRIFT");
  }
}

async function assembleMarkerBody(options: {
  readonly repoRoot: string;
  readonly expectation: SpecialistCurrentnessExpectationV1;
  readonly repositorySnapshot: SpecialistCurrentnessRepositorySnapshotInputV1;
  readonly requireIntegrationHead: boolean;
}): Promise<Readonly<Record<string, unknown>>> {
  const repoRoot = await validateRepositoryRoot(options.repoRoot);
  const status = await git(repoRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=normal",
  ]);
  if (status.length !== 0) fail("REPOSITORY_DIRTY");
  const currentHead = (await git(repoRoot, ["rev-parse", "HEAD"])).trim();
  if (!COMMIT_RE.test(currentHead)) fail("REPOSITORY_SNAPSHOT_INVALID");
  if (
    options.requireIntegrationHead &&
    currentHead !== options.repositorySnapshot.integrationCommit
  ) {
    fail("INTEGRATION_HEAD_MISMATCH");
  }
  await assertAncestryAndDrift(
    repoRoot,
    options.expectation,
    options.repositorySnapshot,
    currentHead,
  );
  const integrationTreeSha1 = (
    await git(repoRoot, [
      "rev-parse",
      `${options.repositorySnapshot.integrationCommit}^{tree}`,
    ])
  ).trim();
  if (!TREE_RE.test(integrationTreeSha1)) fail("REPOSITORY_SNAPSHOT_INVALID");
  const [packageBinding, policyBinding] = await Promise.all([
    computePackageBinding(repoRoot, options.expectation),
    computePolicyBinding(repoRoot, options.expectation.registryDigest),
  ]);
  return {
    schemaVersion: SPECIALIST_CURRENTNESS_MARKER_SCHEMA_VERSION,
    workflowId: options.expectation.workflowId,
    status: "repository-current",
    claimCeiling: SPECIALIST_CURRENTNESS_CLAIM_CEILING,
    sourceBinding: {
      evidenceBasis: "repository-commit-and-redacted-receipt",
      baseCommit: options.expectation.reviewedSource.baseCommit,
      sourceCommit: options.expectation.reviewedSource.sourceCommit,
      receiptCommit: options.expectation.reviewedSource.receiptCommit,
      agentopsCommit: options.repositorySnapshot.agentopsCommit,
      downstreamVerdictsCreated: false,
      providerAuthorityCreated: false,
    },
    repositorySnapshot: {
      repository: "MAIS-MVP",
      reviewedMainCommit: options.repositorySnapshot.reviewedMainCommit,
      integrationCommit: options.repositorySnapshot.integrationCommit,
      integrationTreeSha1,
      cleanAtIntegration: true,
      cleanStatusDigest: sha256Digest({ porcelainV1Zero: "" }),
    },
    packageBinding,
    policyBinding,
    redaction: {
      protectedContentIncluded: false,
      credentialsIncluded: false,
      rawProviderResponsesIncluded: false,
    },
  };
}

export async function createSpecialistCurrentnessMarker(options: {
  readonly repoRoot: string;
  readonly expectation: unknown;
  readonly repositorySnapshot: unknown;
}): Promise<Readonly<SpecialistCurrentnessMarkerV1>> {
  const expectation = parseExpectation(options.expectation);
  const repositorySnapshot = parseSnapshotInput(options.repositorySnapshot);
  if (
    repositorySnapshot.reviewedMainCommit !==
      expectation.reviewedRepository.reviewedMainCommit ||
    repositorySnapshot.agentopsCommit !==
      expectation.reviewedRepository.agentopsCommit
  ) {
    fail("REVIEWED_BASELINE_MISMATCH");
  }
  const body = await assembleMarkerBody({
    repoRoot: options.repoRoot,
    expectation,
    repositorySnapshot,
    requireIntegrationHead: true,
  });
  return Object.freeze({
    ...body,
    markerDigest: sha256Digest(body),
  }) as unknown as Readonly<SpecialistCurrentnessMarkerV1>;
}

function invalidObservation(reasonCode: string): SpecialistCurrentnessObservationV1 {
  return Object.freeze({
    available: false,
    status: reasonCode === "CURRENTNESS_MARKER_MISSING" ? "missing" : "invalid",
    reasonCodes: Object.freeze([reasonCode]),
    markerDigest: null,
  });
}

export async function verifySpecialistCurrentnessMarker(options: {
  readonly repoRoot: string;
  readonly expectation: unknown;
}): Promise<Readonly<SpecialistCurrentnessObservationV1>> {
  try {
    const repoRoot = await validateRepositoryRoot(options.repoRoot);
    const expectation = parseExpectation(options.expectation);
    let markerBytes: Buffer;
    try {
      markerBytes = await readSafeRepositoryFile(
        repoRoot,
        expectation.markerPath,
        "CURRENTNESS_MARKER_INVALID",
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return invalidObservation("CURRENTNESS_MARKER_MISSING");
      }
      if (error instanceof CurrentnessError) {
        return invalidObservation(error.reasonCode);
      }
      throw error;
    }
    if (markerBytes.length > 128 * 1024) {
      return invalidObservation("CURRENTNESS_MARKER_INVALID");
    }
    if (
      !(await gitSucceeds(repoRoot, [
        "ls-files",
        "--error-unmatch",
        "--",
        expectation.markerPath,
      ]))
    ) {
      return invalidObservation("CURRENTNESS_MARKER_UNTRACKED");
    }
    const raw = markerBytes.toString("utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return invalidObservation("CURRENTNESS_MARKER_INVALID");
    }
    if (!isPlainRecord(parsed) || `${canonicalJson(parsed)}\n` !== raw) {
      return invalidObservation("CURRENTNESS_MARKER_NOT_CANONICAL");
    }
    const markerDigest = parsed.markerDigest;
    if (typeof markerDigest !== "string" || !HASH_RE.test(markerDigest)) {
      return invalidObservation("CURRENTNESS_MARKER_DIGEST_INVALID");
    }
    const markerBody = { ...parsed };
    delete markerBody.markerDigest;
    if (sha256Digest(markerBody) !== markerDigest) {
      return invalidObservation("CURRENTNESS_MARKER_DIGEST_MISMATCH");
    }
    const markerSnapshot = requireRecord(
      parsed.repositorySnapshot,
      "CURRENTNESS_MARKER_INVALID",
    );
    const sourceBinding = requireRecord(
      parsed.sourceBinding,
      "CURRENTNESS_MARKER_INVALID",
    );
    const repositorySnapshot = parseSnapshotInput({
      reviewedMainCommit: markerSnapshot.reviewedMainCommit,
      agentopsCommit: sourceBinding.agentopsCommit,
      integrationCommit: markerSnapshot.integrationCommit,
    });
    if (
      repositorySnapshot.reviewedMainCommit !==
        expectation.reviewedRepository.reviewedMainCommit ||
      repositorySnapshot.agentopsCommit !==
        expectation.reviewedRepository.agentopsCommit
    ) {
      return invalidObservation("REVIEWED_BASELINE_MISMATCH");
    }
    const expectedBody = await assembleMarkerBody({
      repoRoot,
      expectation,
      repositorySnapshot,
      requireIntegrationHead: false,
    });
    if (canonicalJson(markerBody) !== canonicalJson(expectedBody)) {
      return invalidObservation("CURRENTNESS_MARKER_BINDING_MISMATCH");
    }
    return Object.freeze({
      available: true,
      status: "current",
      reasonCodes: Object.freeze([]),
      markerDigest,
    });
  } catch (error) {
    if (error instanceof CurrentnessError) {
      return invalidObservation(error.reasonCode);
    }
    return invalidObservation("CURRENTNESS_TOOL_FAILURE");
  }
}
