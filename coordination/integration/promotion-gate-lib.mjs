import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { constants as fsConstants } from "node:fs";
import { lstat, mkdtemp, open as openFile, readdir, realpath, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

export class PromotionGateError extends Error {
  constructor(code, message, details = undefined, outcome = "fail") {
    super(message);
    this.name = "PromotionGateError";
    this.code = code;
    this.outcome = outcome;
    if (details !== undefined) this.details = details;
  }
}

export function stableJson(value) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new TypeError("Value cannot be represented as canonical JSON: sparse array.");
      }
    }
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Value cannot be represented as canonical JSON: non-plain object.");
    }
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  if (
    value === undefined ||
    typeof value === "bigint" ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw new TypeError("Value cannot be represented as canonical JSON.");
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const FATAL_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export function decodeCanonicalUtf8(bytes, invalidCode = "UTF8_INVALID", label = "Authoritative input") {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new PromotionGateError(invalidCode, `${label} is not a byte sequence.`);
  }
  try {
    return FATAL_UTF8_DECODER.decode(bytes);
  } catch {
    throw new PromotionGateError(invalidCode, `${label} is not valid UTF-8.`);
  }
}

export function parseCanonicalJsonBytes(bytes, invalidCode, label) {
  const source = decodeCanonicalUtf8(bytes, invalidCode, label);
  try {
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof PromotionGateError) throw error;
    throw new PromotionGateError(invalidCode, `${label} is not valid JSON.`);
  }
}

export function fingerprint(value) {
  return sha256(Buffer.from(stableJson(value)));
}

export function computeCandidateDigest(artifacts) {
  return fingerprint(
    artifacts.map(({ kind, id, recordSha256 }) => ({ kind, id, recordSha256 }))
  );
}

export const AUTHORITATIVE_FILE_MAX_BYTES = 32 * 1024 * 1024;
const AUTHORITATIVE_PREIMAGE_CONTEXT = new AsyncLocalStorage();

export function assertSafeRepoRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value === ".") {
    throw new PromotionGateError("PATH_UNSAFE", "Path must be a non-empty repository-relative file path.");
  }
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    value.includes("//") ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value)
  ) {
    throw new PromotionGateError("PATH_UNSAFE", "Path is not a safe repository-relative file path.");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new PromotionGateError("PATH_UNSAFE", "Path contains an unsafe segment.");
  }
  return value;
}

export async function readAuthoritativeFile(repoRoot, relativePath) {
  try {
    assertSafeRepoRelativePath(relativePath);
    const canonicalRoot = await realpath(repoRoot);
    const segments = relativePath.split("/");
    let candidatePath = canonicalRoot;
    let leafBefore;
    const pathEntriesBefore = [];
    for (const segment of segments) {
      candidatePath = path.join(candidatePath, segment);
      const entry = await lstat(candidatePath, { bigint: true });
      if (entry.isSymbolicLink()) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Authoritative inputs cannot contain symlinks.");
      }
      pathEntriesBefore.push({
        path: candidatePath,
        device: entry.dev,
        inode: entry.ino,
        directory: entry.isDirectory(),
        file: entry.isFile()
      });
      leafBefore = entry;
    }
    if (!leafBefore?.isFile() || leafBefore.nlink !== 1n) {
      throw new PromotionGateError(
        "AUTHORITATIVE_PATH_UNSAFE",
        "Authoritative input must be a regular, single-link file."
      );
    }
    const canonicalFile = await realpath(candidatePath);
    const relativeToRoot = path.relative(canonicalRoot, canonicalFile);
    if (
      relativeToRoot === "" ||
      relativeToRoot === ".." ||
      relativeToRoot.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeToRoot)
    ) {
      throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Authoritative input resolves outside the repository root.");
    }

    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    const handle = await openFile(candidatePath, fsConstants.O_RDONLY | noFollow);
    try {
      const openedBefore = await handle.stat({ bigint: true });
      if (!openedBefore.isFile() || openedBefore.nlink !== 1n) {
        throw new PromotionGateError(
          "AUTHORITATIVE_PATH_UNSAFE",
          "Opened authoritative input must be a regular, single-link file."
        );
      }
      if (openedBefore.dev !== leafBefore.dev || openedBefore.ino !== leafBefore.ino) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Authoritative input identity changed before read.");
      }
      if (openedBefore.size > BigInt(AUTHORITATIVE_FILE_MAX_BYTES)) {
        throw new PromotionGateError(
          "AUTHORITATIVE_FILE_TOO_LARGE",
          "Authoritative input exceeds the frozen per-file read bound.",
          {
            maxBytes: AUTHORITATIVE_FILE_MAX_BYTES,
            observedBytes: Number(openedBefore.size)
          },
          "blocked"
        );
      }
      const bytes = await handle.readFile();
      const openedAfter = await handle.stat({ bigint: true });
      const leafAfter = await lstat(candidatePath, { bigint: true });
      for (const before of pathEntriesBefore) {
        const after = await lstat(before.path, { bigint: true });
        if (
          after.isSymbolicLink() ||
          after.dev !== before.device ||
          after.ino !== before.inode ||
          after.isDirectory() !== before.directory ||
          after.isFile() !== before.file
        ) {
          throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Authoritative path ancestry changed during read.");
        }
      }
      if (
        openedAfter.dev !== openedBefore.dev ||
        openedAfter.ino !== openedBefore.ino ||
        openedAfter.size !== openedBefore.size ||
        openedAfter.mtimeNs !== openedBefore.mtimeNs ||
        leafAfter.dev !== openedBefore.dev ||
        leafAfter.ino !== openedBefore.ino ||
        leafAfter.nlink !== 1n ||
        leafAfter.isSymbolicLink()
      ) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Authoritative input changed during read.");
      }
      const rawSha256 = sha256(bytes);
      const preimageContext = AUTHORITATIVE_PREIMAGE_CONTEXT.getStore();
      if (preimageContext?.canonicalRoot === canonicalRoot) {
        const expected = preimageContext.expectedByPath.get(relativePath);
        if (expected === undefined || expected !== rawSha256) {
          throw new PromotionGateError(
            "PREIMAGE_DRIFT",
            "An authoritative input differs from the immutable run preimage.",
            { inputPathDigest: fingerprint(relativePath) },
            "blocked"
          );
        }
      }
      return {
        bytes,
        rawSha256,
        identity: {
          device: openedBefore.dev.toString(),
          inode: openedBefore.ino.toString(),
          bytes: Number(openedBefore.size),
          modifiedNanoseconds: openedBefore.mtimeNs.toString()
        }
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error instanceof PromotionGateError) throw error;
    if (error?.code === "ENOENT") {
      throw new PromotionGateError("AUTHORITATIVE_PATH_MISSING", "Required authoritative input does not exist.");
    }
    throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Unable to safely read authoritative input.");
  }
}

function pathIsWithinRoot(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function readExternalReceiptFile(receiptPath, {
  runnerTemp = process.env.RUNNER_TEMP
} = {}) {
  try {
    if (
      typeof receiptPath !== "string" ||
      receiptPath.length === 0 ||
      receiptPath.includes("\0") ||
      !path.isAbsolute(receiptPath)
    ) {
      throw new PromotionGateError("PATH_UNSAFE", "External receipt path must be an absolute path under an approved temp root.");
    }
    const approvedInputs = [tmpdir()];
    if (typeof runnerTemp === "string" && runnerTemp.length > 0) {
      if (runnerTemp.includes("\0") || !path.isAbsolute(runnerTemp)) {
        throw new PromotionGateError("PATH_UNSAFE", "RUNNER_TEMP must be an absolute approved temp root.");
      }
      approvedInputs.push(runnerTemp);
    }
    const absoluteReceiptPath = path.resolve(receiptPath);
    let selectedRoot = null;
    let selectedRelative = null;
    for (const approvedInput of approvedInputs) {
      const inputRoot = path.resolve(approvedInput);
      const canonicalRoot = await realpath(inputRoot);
      const rootEntry = await lstat(canonicalRoot, { bigint: true });
      if (!rootEntry.isDirectory()) continue;
      if (pathIsWithinRoot(absoluteReceiptPath, inputRoot)) {
        selectedRoot = canonicalRoot;
        selectedRelative = path.relative(inputRoot, absoluteReceiptPath);
        break;
      }
      if (pathIsWithinRoot(absoluteReceiptPath, canonicalRoot)) {
        selectedRoot = canonicalRoot;
        selectedRelative = path.relative(canonicalRoot, absoluteReceiptPath);
        break;
      }
    }
    if (selectedRoot === null || selectedRelative === null) {
      throw new PromotionGateError("PATH_UNSAFE", "External receipt path is outside the approved temp roots.");
    }
    const segments = selectedRelative.split(path.sep);
    if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
      throw new PromotionGateError("PATH_UNSAFE", "External receipt path contains an unsafe segment.");
    }
    let candidatePath = selectedRoot;
    let leafBefore = null;
    const pathEntriesBefore = [];
    for (const segment of segments) {
      candidatePath = path.join(candidatePath, segment);
      const entry = await lstat(candidatePath, { bigint: true });
      if (entry.isSymbolicLink()) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "External receipt path cannot contain symlinks.");
      }
      pathEntriesBefore.push({
        path: candidatePath,
        device: entry.dev,
        inode: entry.ino,
        directory: entry.isDirectory(),
        file: entry.isFile()
      });
      leafBefore = entry;
    }
    if (!leafBefore?.isFile() || leafBefore.nlink !== 1n) {
      throw new PromotionGateError(
        "AUTHORITATIVE_PATH_UNSAFE",
        "External receipt must be a regular, single-link file."
      );
    }
    const canonicalFile = await realpath(candidatePath);
    if (!pathIsWithinRoot(canonicalFile, selectedRoot)) {
      throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "External receipt resolves outside the approved temp root.");
    }
    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    const handle = await openFile(candidatePath, fsConstants.O_RDONLY | noFollow);
    try {
      const openedBefore = await handle.stat({ bigint: true });
      if (
        !openedBefore.isFile() ||
        openedBefore.nlink !== 1n ||
        openedBefore.dev !== leafBefore.dev ||
        openedBefore.ino !== leafBefore.ino
      ) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "External receipt identity changed before read.");
      }
      if (openedBefore.size > BigInt(AUTHORITATIVE_FILE_MAX_BYTES)) {
        throw new PromotionGateError(
          "AUTHORITATIVE_FILE_TOO_LARGE",
          "External receipt exceeds the frozen per-file read bound."
        );
      }
      const bytes = await handle.readFile();
      const openedAfter = await handle.stat({ bigint: true });
      const leafAfter = await lstat(candidatePath, { bigint: true });
      for (const before of pathEntriesBefore) {
        const after = await lstat(before.path, { bigint: true });
        if (
          after.isSymbolicLink() ||
          after.dev !== before.device ||
          after.ino !== before.inode ||
          after.isDirectory() !== before.directory ||
          after.isFile() !== before.file
        ) {
          throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "External receipt ancestry changed during read.");
        }
      }
      if (
        openedAfter.dev !== openedBefore.dev ||
        openedAfter.ino !== openedBefore.ino ||
        openedAfter.size !== openedBefore.size ||
        openedAfter.mtimeNs !== openedBefore.mtimeNs ||
        leafAfter.dev !== openedBefore.dev ||
        leafAfter.ino !== openedBefore.ino ||
        leafAfter.nlink !== 1n ||
        leafAfter.isSymbolicLink()
      ) {
        throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "External receipt changed during read.");
      }
      return {
        bytes,
        rawSha256: sha256(bytes),
        identity: {
          device: openedBefore.dev.toString(),
          inode: openedBefore.ino.toString(),
          bytes: Number(openedBefore.size),
          modifiedNanoseconds: openedBefore.mtimeNs.toString()
        }
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error instanceof PromotionGateError) throw error;
    if (error?.code === "ENOENT") {
      throw new PromotionGateError("AUTHORITATIVE_PATH_MISSING", "External receipt does not exist.");
    }
    throw new PromotionGateError("AUTHORITATIVE_PATH_UNSAFE", "Unable to safely read external receipt.");
  }
}

const REGISTERED_GIT_PROBES = Object.freeze([
  Object.freeze(["rev-parse", "--show-toplevel"]),
  Object.freeze(["rev-parse", "HEAD"]),
  Object.freeze(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
  Object.freeze(["ls-files", "-z"]),
  Object.freeze(["ls-files", "-v", "-z"]),
  Object.freeze(["ls-files", "--stage", "-z"])
]);

export const PROMOTION_ATTEMPT_HISTORY_ROOTS = Object.freeze([
  "coordination/integration/pilots",
  "coordination/integration/receipts",
  "coordination/integration/dispositions",
  "coordination/integration/closures",
  "coordination/integration/registries"
]);
export const PROMOTION_ATTEMPT_HISTORY_MAX_COMMITS = 512;
export const PROMOTION_ATTEMPT_HISTORY_MAX_ARTIFACTS = 512;
export const PROMOTION_ATTEMPT_HISTORY_MAX_TREE_ENTRIES = 2_048;
export const PROMOTION_ATTEMPT_HISTORY_MAX_UNIQUE_BYTES = 128 * 1024 * 1024;

function isPromotionAttemptHistoryPath(filePath) {
  return (
    typeof filePath === "string" &&
    !filePath.includes("\0") &&
    !filePath.includes("\\") &&
    !filePath.includes("//") &&
    !path.posix.isAbsolute(filePath) &&
    filePath.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..") &&
    PROMOTION_ATTEMPT_HISTORY_ROOTS.some((root) => filePath.startsWith(`${root}/`))
  );
}

function isPromotionAttemptHistoryArtifactPath(filePath) {
  return isPromotionAttemptHistoryPath(filePath) && filePath.endsWith(".json");
}

const REGISTERED_GIT_EXECUTABLE = "/usr/bin/git";
const REGISTERED_GIT_PATH = "/usr/bin:/bin";

const EXTERNAL_SIDE_EFFECT_REGISTERED_OPERATIONS = Object.freeze([
  "authoritative-repository-read",
  "registered-read-only-git-probe",
  "fresh-os-temp-exclusive-write-delete"
]);
const CHECKER_CAPABILITY_SOURCE_PATHS = Object.freeze([
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/promotion-gate.mjs"
]);
const FORBIDDEN_CHECKER_CAPABILITY_MODULES = Object.freeze([
  "http", "https", "net", "tls", "dgram", "dns", "undici",
  "axios", "got", "openai", "anthropic", "@anthropic-ai/sdk",
  "pg", "postgres", "mysql", "mysql2", "mongodb", "mongoose",
  "redis", "ioredis", "sqlite3", "better-sqlite3", "@prisma/client",
  "@supabase/supabase-js", "firebase", "firebase-admin", "vercel", "@vercel/client"
]);

function normalizeCapabilityModuleSpecifier(specifier) {
  return specifier.startsWith("node:") ? specifier.slice(5) : specifier;
}

function checkerModuleSpecifierIsForbidden(specifier) {
  const normalized = normalizeCapabilityModuleSpecifier(specifier);
  return FORBIDDEN_CHECKER_CAPABILITY_MODULES.some((forbidden) =>
    normalized === forbidden || normalized.startsWith(`${forbidden}/`)
  );
}

export async function collectCheckerCapabilityProof(repoRoot, checkerBundleDigest) {
  assertSha256(checkerBundleDigest, "checker capability bundleDigest");
  const sourceBindings = [];
  const violations = [];
  let registeredExecFileImportCount = 0;
  let registeredExecFileCallCount = 0;
  for (const sourcePath of CHECKER_CAPABILITY_SOURCE_PATHS) {
    const loaded = await readAuthoritativeFile(repoRoot, sourcePath);
    const source = decodeRuntimeSource(loaded.bytes, sourcePath);
    sourceBindings.push({ path: sourcePath, rawSha256: loaded.rawSha256 });
    const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const normalized = normalizeCapabilityModuleSpecifier(specifier);
        if (normalized === "child_process") {
          const named = node.importClause?.namedBindings;
          const importedNames = ts.isNamedImports(named)
            ? named.elements.map((element) => element.propertyName?.text ?? element.name.text)
            : [];
          if (
            sourcePath !== CHECKER_CAPABILITY_SOURCE_PATHS[0] ||
            stableJson(importedNames) !== stableJson(["execFile"])
          ) {
            violations.push({ sourcePath, kind: "child-process-import", position: node.getStart(sourceFile) });
          } else {
            registeredExecFileImportCount += 1;
          }
        } else if (checkerModuleSpecifierIsForbidden(specifier)) {
          violations.push({ sourcePath, kind: "forbidden-module-import", position: node.getStart(sourceFile) });
        }
      }
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        const moduleSpecifier = (
          (expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(expression) && expression.text === "require")) &&
          node.arguments.length === 1 &&
          (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
        ) ? node.arguments[0].text : null;
        if (moduleSpecifier !== null && checkerModuleSpecifierIsForbidden(moduleSpecifier)) {
          violations.push({ sourcePath, kind: "forbidden-module-load", position: node.getStart(sourceFile) });
        }
        if (ts.isIdentifier(expression) && expression.text === "fetch") {
          violations.push({ sourcePath, kind: "network-fetch", position: node.getStart(sourceFile) });
        }
        if (ts.isIdentifier(expression) && expression.text === "execFile") {
          const firstArgument = node.arguments[0];
          if (
            sourcePath !== CHECKER_CAPABILITY_SOURCE_PATHS[0] ||
            !firstArgument ||
            !ts.isIdentifier(firstArgument) ||
            firstArgument.text !== "REGISTERED_GIT_EXECUTABLE"
          ) {
            violations.push({ sourcePath, kind: "unregistered-process-execution", position: node.getStart(sourceFile) });
          } else {
            registeredExecFileCallCount += 1;
          }
        }
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["WebSocket", "EventSource", "XMLHttpRequest"].includes(node.expression.text)
      ) {
        violations.push({ sourcePath, kind: "network-constructor", position: node.getStart(sourceFile) });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  if (
    violations.length > 0 ||
    registeredExecFileImportCount !== 1 ||
    registeredExecFileCallCount !== 1
  ) {
    throw new PromotionGateError(
      "CHECKER_CAPABILITY_POLICY_VIOLATION",
      "Promotion checker sources contain an unregistered network, provider, database, deploy, or process capability.",
      {
        violationCount: violations.length,
        violationDigest: fingerprint(violations),
        registeredExecFileImportCount,
        registeredExecFileCallCount
      },
      "blocked"
    );
  }
  const payload = {
    schemaVersion: "promotion-checker-capability-proof.v1",
    result: "pass",
    policy: "no-network-provider-database-deploy.v1",
    checkerBundleDigest,
    sourceBindings,
    sourceBindingsDigest: fingerprint(sourceBindings),
    forbiddenModuleSetDigest: fingerprint(FORBIDDEN_CHECKER_CAPABILITY_MODULES),
    registeredExecFileImportCount,
    registeredExecFileCallCount,
    forbiddenCapabilityCount: 0
  };
  return { ...payload, digest: fingerprint(payload) };
}

async function collectTempRootProof(repoRoot) {
  const canonicalRepoRoot = await realpath(repoRoot);
  const configuredTempRoots = ["TMPDIR", "TMP", "TEMP"]
    .filter((name) => Object.hasOwn(process.env, name) && String(process.env[name] ?? "") !== "")
    .map((name) => ({ name, value: String(process.env[name]) }));
  const candidates = [{ name: "node-os-tmpdir", value: tmpdir() }, ...configuredTempRoots];
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate.value) || candidate.value.includes("\0")) {
      throw new PromotionGateError(
        "EXECUTION_ENVIRONMENT_UNSAFE",
        "Temporary-root environment must resolve to an absolute directory outside the repository.",
        { configuredVariableDigest: fingerprint(candidate.name) },
        "blocked"
      );
    }
    let canonicalCandidate;
    let entry;
    try {
      canonicalCandidate = await realpath(candidate.value);
      entry = await lstat(canonicalCandidate, { bigint: true });
    } catch {
      throw new PromotionGateError(
        "EXECUTION_ENVIRONMENT_UNSAFE",
        "Temporary-root environment cannot be canonicalized as an existing directory.",
        { configuredVariableDigest: fingerprint(candidate.name) },
        "blocked"
      );
    }
    if (
      !entry.isDirectory() ||
      canonicalCandidate === canonicalRepoRoot ||
      pathIsWithinRoot(canonicalCandidate, canonicalRepoRoot)
    ) {
      throw new PromotionGateError(
        "EXECUTION_ENVIRONMENT_UNSAFE",
        "Temporary-root environment points at the repository or a live repository descendant.",
        { configuredVariableDigest: fingerprint(candidate.name) },
        "blocked"
      );
    }
  }
  return {
    rootSource: "node-os-tmpdir",
    outsideRepository: true,
    outsideForbiddenPaths: true
  };
}

export async function collectExternalSideEffectProof(repoRoot, manifest = null) {
  const resolverVariables = ["NEXT_TSCONFIG_PATH", "NEXT_DIST_DIR"];
  const configured = resolverVariables.filter((name) =>
    Object.hasOwn(process.env, name) && String(process.env[name] ?? "") !== ""
  );
  if (configured.length > 0) {
    throw new PromotionGateError(
      "EXECUTION_ENVIRONMENT_UNSAFE",
      "Resolver-affecting environment variables must be unset for deterministic Shadow execution.",
      { configuredVariableDigests: configured.map(fingerprint).sort() },
      "blocked"
    );
  }
  const tempRootProof = await collectTempRootProof(repoRoot);
  const checkerCapabilityPolicy = await collectCheckerCapabilityProof(
    repoRoot,
    manifest?.checkerRelease?.bundleDigest ?? "0".repeat(64)
  );
  const payload = {
    schemaVersion: "promotion-external-side-effect-proof.v1",
    result: "pass",
    policy: "registered-local-only-operations.v1",
    registeredOperations: [...EXTERNAL_SIDE_EFFECT_REGISTERED_OPERATIONS],
    gitPolicy: {
      executable: REGISTERED_GIT_EXECUTABLE,
      path: REGISTERED_GIT_PATH,
      optionalLocks: false,
      fsmonitor: false,
      hooks: false,
      pager: "cat",
      terminalPrompt: false,
      systemConfig: false,
      globalConfig: false,
      inheritedGitEnvironment: false
    },
    resolverEnvironment: {
      NEXT_TSCONFIG_PATH: "unset",
      NEXT_DIST_DIR: "unset"
    },
    tempRootProof,
    checkerCapabilityPolicy,
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0
  };
  return { ...payload, digest: fingerprint(payload) };
}

function runRegisteredGitProbe(canonicalRoot, argv) {
  const isFixedProbe = REGISTERED_GIT_PROBES.some((registered) => stableJson(registered) === stableJson(argv));
  const commitPattern = /^[a-f0-9]{40}$/u;
  const isCommitExistenceProbe =
    argv.length === 3 &&
    argv[0] === "cat-file" &&
    argv[1] === "-e" &&
    /^[a-f0-9]{40}\^\{commit\}$/u.test(argv[2]);
  const isAncestorProbe =
    argv.length === 4 &&
    argv[0] === "merge-base" &&
    argv[1] === "--is-ancestor" &&
    commitPattern.test(argv[2]) &&
    commitPattern.test(argv[3]);
  const isCandidateBlobProbe =
    argv.length === 3 &&
    argv[0] === "show" &&
    argv[1] === "--no-textconv" &&
    CANONICAL_CANDIDATE_SELECTION.some(({ path: candidatePath }) =>
      argv[2].endsWith(`:${candidatePath}`) && commitPattern.test(argv[2].slice(0, 40))
    );
  const isCheckerBlobProbe =
    argv.length === 3 &&
    argv[0] === "show" &&
    argv[1] === "--no-textconv" &&
    [...CHECKER_BUNDLE_PATHS, CHECKER_RELEASE_MAPPING_PATH].some((checkerPath) =>
      argv[2].endsWith(`:${checkerPath}`) && commitPattern.test(argv[2].slice(0, 40))
    );
  const isEvidenceReviewBlobProbe =
    argv.length === 3 &&
    argv[0] === "show" &&
    argv[1] === "--no-textconv" &&
    commitPattern.test(String(argv[2]).slice(0, 40)) &&
    String(argv[2]).charAt(40) === ":" &&
    [
      "coordination/content-qa/",
      "coordination/integration/evidence/",
      "coordination/release-intake/",
      "coordination/reports/",
      "synthetic/evidence/"
    ].some((prefix) => String(argv[2]).slice(41).startsWith(prefix)) &&
    !String(argv[2]).slice(41).includes("..") &&
    !String(argv[2]).slice(41).includes("\\");
  const isTrackedPathProbe =
    (argv.length === 4 && argv[0] === "ls-files" && argv[1] === "--error-unmatch" && argv[2] === "--") ||
    (argv.length === 3 && argv[0] === "show" && argv[1] === "--no-textconv" &&
      typeof argv[2] === "string" && argv[2].startsWith("HEAD:"));
  const isCommitParentProbe =
    argv.length === 5 && argv[0] === "rev-list" && argv[1] === "--parents" &&
    argv[2] === "-n" && argv[3] === "1" && commitPattern.test(argv[4]);
  const isCommitPathDiffProbe =
    argv.length === 7 && argv[0] === "diff-tree" && argv[1] === "--no-commit-id" &&
    argv[2] === "--name-only" && argv[3] === "-r" && argv[4] === "-z" &&
    commitPattern.test(argv[5]) && argv[6] === "--";
  const isCheckerHistoryProbe =
    stableJson(argv) === stableJson(["log", "--all", "--format=%H", "--", CHECKER_RELEASE_MAPPING_PATH]);
  const isTargetBaselineTreeProbe =
    argv.length === 6 + TARGET_BASELINE_PROJECTION_PATHS.length &&
    argv[0] === "ls-tree" && argv[1] === "-r" && argv[2] === "-z" &&
    argv[3] === "--full-tree" && commitPattern.test(argv[4]) && argv[5] === "--" &&
    stableJson(argv.slice(6)) === stableJson(TARGET_BASELINE_PROJECTION_PATHS);
  const isAttemptHistoryCommitProbe = stableJson(argv) === stableJson([
    "rev-list", "--first-parent", "--reverse", "HEAD", "--", ...PROMOTION_ATTEMPT_HISTORY_ROOTS
  ]);
  const isAttemptHistoryTreeProbe =
    argv.length === 6 + PROMOTION_ATTEMPT_HISTORY_ROOTS.length &&
    argv[0] === "ls-tree" && argv[1] === "-r" && argv[2] === "-z" &&
    argv[3] === "--full-tree" && commitPattern.test(argv[4]) && argv[5] === "--" &&
    stableJson(argv.slice(6)) === stableJson(PROMOTION_ATTEMPT_HISTORY_ROOTS);
  const isAttemptHistoryBlobProbe =
    argv.length === 3 && argv[0] === "show" && argv[1] === "--no-textconv" &&
    commitPattern.test(String(argv[2]).slice(0, 40)) && String(argv[2]).charAt(40) === ":" &&
    isPromotionAttemptHistoryArtifactPath(String(argv[2]).slice(41));
  if (
    !isFixedProbe &&
    !isTrackedPathProbe &&
    !isCommitExistenceProbe &&
    !isAncestorProbe &&
    !isCandidateBlobProbe &&
    !isCheckerBlobProbe
    && !isEvidenceReviewBlobProbe
    && !isCommitParentProbe
    && !isCommitPathDiffProbe
    && !isCheckerHistoryProbe
    && !isTargetBaselineTreeProbe
    && !isAttemptHistoryCommitProbe
    && !isAttemptHistoryTreeProbe
    && !isAttemptHistoryBlobProbe
  ) {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      "Unregistered Git probe was rejected.",
      { probe: "unregistered" },
      "blocked"
    );
  }
  return new Promise((resolve, reject) => {
    execFile(REGISTERED_GIT_EXECUTABLE, [
      "-c", "core.fsmonitor=false",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.pager=cat",
      "-C", canonicalRoot,
      ...argv
    ], {
      shell: false,
      encoding: null,
      env: {
        PATH: REGISTERED_GIT_PATH,
        LC_ALL: "C",
        LANG: "C",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_ATTR_NOSYSTEM: "1",
        GIT_PAGER: "cat",
        GIT_TERMINAL_PROMPT: "0"
      },
      maxBuffer: ["show", "ls-files", "ls-tree"].includes(argv[0]) ? 32 * 1024 * 1024 : 64 * 1024,
      timeout: 5_000,
      windowsHide: true
    }, (error, stdout) => {
      if (error || !Buffer.isBuffer(stdout)) {
        reject(new PromotionGateError(
          "WORKTREE_PROOF_UNAVAILABLE",
          "Registered Git worktree probe could not be completed.",
          { probe: argv[0] === "status" ? "status" : argv.at(-1) },
          "blocked"
        ));
        return;
      }
      resolve(stdout);
    });
  });
}

async function requireGitCommit(repoRoot, commit, bindingName) {
  try {
    await runRegisteredGitProbe(repoRoot, ["cat-file", "-e", `${commit}^{commit}`]);
  } catch {
    const code = bindingName === "source" ? "SOURCE_PROVENANCE_COMMIT_MISSING" : "TARGET_BASELINE_COMMIT_MISSING";
    throw new PromotionGateError(
      code,
      `${bindingName === "source" ? "Candidate source" : "Target baseline"} commit does not exist in the execution repository.`,
      { binding: bindingName },
      "blocked"
    );
  }
}

async function requireGitAncestor(repoRoot, ancestor, executionCommit, bindingName) {
  try {
    await runRegisteredGitProbe(repoRoot, ["merge-base", "--is-ancestor", ancestor, executionCommit]);
  } catch {
    const code = bindingName === "source" ? "SOURCE_PROVENANCE_NOT_ANCESTOR" : "TARGET_BASELINE_NOT_ANCESTOR";
    throw new PromotionGateError(
      code,
      `${bindingName === "source" ? "Candidate source" : "Target baseline"} commit is not an ancestor of execution HEAD.`,
      { binding: bindingName },
      "blocked"
    );
  }
}

export async function collectCandidateProvenanceProof(repoRoot, manifest, executionCommit) {
  if (!/^[a-f0-9]{40}$/u.test(executionCommit)) {
    throw new PromotionGateError(
      "SOURCE_PROVENANCE_EXECUTION_INVALID",
      "Candidate provenance proof requires a valid execution commit.",
      {},
      "blocked"
    );
  }
  const canonicalRoot = await realpath(repoRoot);
  await requireGitCommit(canonicalRoot, manifest.sourceCommit, "source");
  await requireGitCommit(canonicalRoot, manifest.targetBaselineCommit, "target");
  await requireGitAncestor(canonicalRoot, manifest.sourceCommit, executionCommit, "source");
  await requireGitAncestor(canonicalRoot, manifest.targetBaselineCommit, executionCommit, "target");

  const artifacts = [];
  for (const artifact of manifest.candidateArtifacts) {
    let sourceBytes;
    try {
      sourceBytes = await runRegisteredGitProbe(
        canonicalRoot,
        ["show", "--no-textconv", `${manifest.sourceCommit}:${artifact.path}`]
      );
    } catch {
      throw new PromotionGateError(
        "SOURCE_PROVENANCE_BLOB_MISSING",
        "A frozen candidate artifact is absent from candidateSourceCommit.",
        { kind: artifact.kind, pathDigest: fingerprint(artifact.path) },
        "blocked"
      );
    }
    let document;
    try {
      document = parseCanonicalJsonBytes(sourceBytes, "SOURCE_PROVENANCE_JSON_INVALID", "Candidate source blob");
    } catch {
      throw new PromotionGateError(
        "SOURCE_PROVENANCE_BLOB_INVALID",
        "A candidate artifact at candidateSourceCommit is not valid JSON.",
        { kind: artifact.kind, pathDigest: fingerprint(artifact.path) },
        "blocked"
      );
    }
    const sourceRawSha256 = sha256(sourceBytes);
    const sourceRecordSha256 = fingerprint(extractJsonPointer(document, artifact.jsonPointer));
    const current = await readAuthoritativeFile(canonicalRoot, artifact.path);
    if (
      sourceRawSha256 !== artifact.rawFileSha256 ||
      sourceRecordSha256 !== artifact.recordSha256 ||
      current.rawSha256 !== sourceRawSha256
    ) {
      throw new PromotionGateError(
        "SOURCE_PROVENANCE_BLOB_MISMATCH",
        "Current candidate bytes and manifest digests must exactly match candidateSourceCommit.",
        { kind: artifact.kind, pathDigest: fingerprint(artifact.path) },
        "blocked"
      );
    }
    artifacts.push({
      kind: artifact.kind,
      id: artifact.id,
      path: artifact.path,
      jsonPointer: artifact.jsonPointer,
      rawFileSha256: sourceRawSha256,
      recordSha256: sourceRecordSha256
    });
  }
  const aggregateInput = artifacts.map(({ kind, id, path: artifactPath, rawFileSha256, recordSha256 }) => ({
    kind,
    id,
    path: artifactPath,
    rawFileSha256,
    recordSha256
  }));
  const proof = {
    schemaVersion: "promotion-candidate-provenance.v1",
    candidateSourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    sourceCommitExists: true,
    targetBaselineCommitExists: true,
    sourceAncestorOfExecution: true,
    targetBaselineAncestorOfExecution: true,
    artifacts,
    sourceAggregateDigest: fingerprint(aggregateInput),
    currentAggregateDigest: fingerprint(aggregateInput),
    equal: true
  };
  return { ...proof, digest: fingerprint(proof) };
}

function parseGitTreeProjection(bytes, label) {
  if (!Buffer.isBuffer(bytes) || (bytes.length > 0 && bytes.at(-1) !== 0)) {
    throw new PromotionGateError(
      "TARGET_BASELINE_PROJECTION_UNAVAILABLE",
      `${label} tree projection returned ambiguous output.`,
      { role: "A22" },
      "blocked"
    );
  }
  const text = bytes.length === 0
    ? ""
    : decodeCanonicalUtf8(
      bytes.subarray(0, -1),
      "TARGET_BASELINE_PROJECTION_UNAVAILABLE",
      `${label} tree projection`
    );
  const entries = text === "" ? [] : text.split("\0").map((entry) => {
    const match = /^(\d{6}) ([^ ]+) ([a-f0-9]{40,64})\t(.+)$/u.exec(entry);
    if (match === null || match[2] !== "blob" || !["100644", "100755"].includes(match[1])) {
      throw new PromotionGateError(
        "TARGET_BASELINE_PROJECTION_UNAVAILABLE",
        `${label} tree projection contains a non-regular or ambiguous entry.`,
        { role: "A22" },
        "blocked"
      );
    }
    assertSafeRepoRelativePath(match[4]);
    return { path: match[4], mode: match[1], objectId: match[3] };
  }).sort((left, right) => codePointCompare(left.path, right.path));
  const foldedPaths = new Set();
  for (const entry of entries) {
    const foldedPath = entry.path.toLocaleLowerCase("en-US");
    if (foldedPaths.has(foldedPath)) {
      throw new PromotionGateError(
        "TARGET_BASELINE_PROJECTION_UNAVAILABLE",
        `${label} tree projection contains duplicate or case-colliding paths.`,
        { role: "A22" },
        "blocked"
      );
    }
    foldedPaths.add(foldedPath);
  }
  return entries;
}

export async function collectTargetBaselineProjectionProof(repoRoot, manifest, executionCommit) {
  validatePromotionManifest(manifest);
  if (!/^[a-f0-9]{40}$/u.test(executionCommit)) {
    throw new PromotionGateError(
      "TARGET_BASELINE_PROJECTION_UNAVAILABLE",
      "Target-baseline projection requires an exact execution commit.",
      { role: "A22" },
      "blocked"
    );
  }
  const canonicalRoot = await realpath(repoRoot);
  const argvFor = (commit) => [
    "ls-tree", "-r", "-z", "--full-tree", commit, "--", ...TARGET_BASELINE_PROJECTION_PATHS
  ];
  const [targetBytes, executionBytes] = await Promise.all([
    runRegisteredGitProbe(canonicalRoot, argvFor(manifest.targetBaselineCommit)),
    runRegisteredGitProbe(canonicalRoot, argvFor(executionCommit))
  ]);
  const targetEntries = parseGitTreeProjection(targetBytes, "Target baseline");
  const executionEntries = parseGitTreeProjection(executionBytes, "Execution");
  const targetPaths = targetEntries.map(({ path: filePath }) => filePath);
  const executionPaths = executionEntries.map(({ path: filePath }) => filePath);
  const targetTreeDigest = fingerprint(targetEntries);
  const currentTreeDigest = fingerprint(executionEntries);
  if (stableJson(targetEntries) !== stableJson(executionEntries)) {
    throw new PromotionGateError(
      "TARGET_BASELINE_PROJECTION_STALE",
      "The current runtime, data, public, middleware, or resolver projection differs from targetBaselineCommit.",
      {
        role: "A22",
        targetFileCount: targetEntries.length,
        currentFileCount: executionEntries.length,
        targetPathsDigest: fingerprint(targetPaths),
        currentPathsDigest: fingerprint(executionPaths)
      },
      "blocked"
    );
  }
  const payload = {
    schemaVersion: "promotion-target-baseline-proof.v1",
    targetBaselineCommit: manifest.targetBaselineCommit,
    scope: "app-components-data-lib-public-middleware-resolver-v1",
    fileCount: targetEntries.length,
    pathsDigest: fingerprint(targetPaths),
    targetTreeDigest,
    currentTreeDigest,
    equal: true
  };
  return { ...payload, digest: fingerprint(payload) };
}

function validateCheckerReleaseLedger(ledger) {
  assertExactKeys(ledger, ["schemaVersion", "entries"], "checker release ledger");
  if (ledger.schemaVersion !== "promotion-checker-releases.v1" || !Array.isArray(ledger.entries) || ledger.entries.length !== 1) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_LEDGER_INVALID",
      "Checker release ledger must contain exactly the v1 checker release entry.",
      {},
      "blocked"
    );
  }
  const entry = ledger.entries[0];
  assertExactKeys(entry, ["version", "bundleAlgorithm", "bundlePaths", "bundleDigest"], "checker release entry");
  if (
    entry.version !== PROMOTION_CHECKER_VERSION ||
    entry.bundleAlgorithm !== "sha256-stable-json-path-raw-v1" ||
    stableJson(entry.bundlePaths) !== stableJson(CHECKER_BUNDLE_PATHS)
  ) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_LEDGER_INVALID",
      "Checker release entry does not bind the exact v1 algorithm and bundle paths.",
      {},
      "blocked"
    );
  }
  assertSha256(entry.bundleDigest, "checker release entry bundleDigest");
  return entry;
}

export async function collectCheckerReleaseProof(repoRoot, manifest, executionCommit) {
  const canonicalRoot = await realpath(repoRoot);
  await requireGitCommit(canonicalRoot, manifest.checkerRelease.releaseCommit, "source");
  try {
    await requireGitAncestor(canonicalRoot, manifest.checkerRelease.releaseCommit, executionCommit, "source");
  } catch {
    throw new PromotionGateError(
      "CHECKER_RELEASE_NOT_ANCESTOR",
      "Checker release commit is not an ancestor of execution HEAD.",
      {},
      "blocked"
    );
  }

  const currentMapping = await readAuthoritativeFile(canonicalRoot, CHECKER_RELEASE_MAPPING_PATH);
  if (currentMapping.rawSha256 !== manifest.checkerRelease.mappingRawSha256) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_MAPPING_DRIFT",
      "Current checker release ledger does not match the manifest binding.",
      {},
      "blocked"
    );
  }
  let releaseMappingBytes;
  try {
    releaseMappingBytes = await runRegisteredGitProbe(
      canonicalRoot,
      ["show", "--no-textconv", `${manifest.checkerRelease.releaseCommit}:${CHECKER_RELEASE_MAPPING_PATH}`]
    );
  } catch {
    throw new PromotionGateError(
      "CHECKER_RELEASE_MAPPING_MISSING",
      "Checker release ledger is absent from checker release commit.",
      {},
      "blocked"
    );
  }
  if (sha256(releaseMappingBytes) !== currentMapping.rawSha256) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_MAPPING_DRIFT",
      "Current checker release ledger differs from checker release commit.",
      {},
      "blocked"
    );
  }
  let ledger;
  try {
    ledger = parseCanonicalJsonBytes(currentMapping.bytes, "CHECKER_RELEASE_LEDGER_INVALID", "Checker release ledger");
  } catch {
    throw new PromotionGateError(
      "CHECKER_RELEASE_LEDGER_INVALID",
      "Checker release ledger is not valid JSON.",
      {},
      "blocked"
    );
  }
  const entry = validateCheckerReleaseLedger(ledger);
  if (
    entry.version !== manifest.checkerRelease.version ||
    entry.bundleDigest !== manifest.checkerRelease.bundleDigest
  ) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_BINDING_MISMATCH",
      "Manifest checker release does not match the authoritative release ledger.",
      {},
      "blocked"
    );
  }

  const bundleFiles = [];
  for (const checkerPath of CHECKER_BUNDLE_PATHS) {
    let releaseBytes;
    try {
      releaseBytes = await runRegisteredGitProbe(
        canonicalRoot,
        ["show", "--no-textconv", `${manifest.checkerRelease.releaseCommit}:${checkerPath}`]
      );
    } catch {
      throw new PromotionGateError(
        "CHECKER_BUNDLE_RELEASE_BLOB_MISSING",
        "Checker bundle file is absent from checker release commit.",
        { pathDigest: fingerprint(checkerPath) },
        "blocked"
      );
    }
    const current = await readAuthoritativeFile(canonicalRoot, checkerPath);
    const releaseRawSha256 = sha256(releaseBytes);
    if (current.rawSha256 !== releaseRawSha256) {
      throw new PromotionGateError(
        "CHECKER_BUNDLE_DRIFT",
        "Current checker implementation differs from the frozen checker release.",
        { pathDigest: fingerprint(checkerPath) },
        "blocked"
      );
    }
    bundleFiles.push({ path: checkerPath, rawSha256: releaseRawSha256 });
  }
  const bundleDigest = fingerprint(bundleFiles);
  if (bundleDigest !== entry.bundleDigest || bundleDigest !== manifest.checkerRelease.bundleDigest) {
    throw new PromotionGateError(
      "CHECKER_BUNDLE_DIGEST_MISMATCH",
      "Checker bundle digest does not match the frozen release mapping.",
      {},
      "blocked"
    );
  }

  let targetBaselineMappingStatus = "initial-release-absent";
  let genesisProof = null;
  let baselineMappingBytes = null;
  try {
    baselineMappingBytes = await runRegisteredGitProbe(
      canonicalRoot,
      ["show", "--no-textconv", `${manifest.targetBaselineCommit}:${CHECKER_RELEASE_MAPPING_PATH}`]
    );
  } catch {
    if (manifest.targetBaselineCommit !== manifest.sourceCommit) {
      throw new PromotionGateError(
        "CHECKER_TARGET_MAPPING_UNAVAILABLE",
        "Target baseline checker mapping could not be proven for a non-initial release.",
        {},
        "blocked"
      );
    }
  }
  if (baselineMappingBytes !== null) {
    let baselineLedger;
    try {
      baselineLedger = parseCanonicalJsonBytes(
        baselineMappingBytes,
        "CHECKER_RELEASE_LEDGER_INVALID",
        "Target baseline checker ledger"
      );
    } catch {
      throw new PromotionGateError(
        "CHECKER_RELEASE_LEDGER_INVALID",
        "Target baseline checker ledger is malformed, not absent.",
        {},
        "blocked"
      );
    }
    const baselineEntry = validateCheckerReleaseLedger(baselineLedger);
    if (stableJson(baselineEntry) !== stableJson(entry)) {
      throw new PromotionGateError(
        "CHECKER_RELEASE_REMAPPED",
        "An existing checker version cannot be remapped to different bundle bytes.",
        {},
        "blocked"
      );
    }
    targetBaselineMappingStatus = "same-version-identical";
  } else {
    const parentLine = singleGitLine(
      await runRegisteredGitProbe(canonicalRoot, [
        "rev-list", "--parents", "-n", "1", manifest.checkerRelease.releaseCommit
      ]),
      "checker-release-parents"
    );
    const parentParts = parentLine.split(" ");
    if (parentParts.length !== 2 || parentParts[0] !== manifest.checkerRelease.releaseCommit) {
      throw new PromotionGateError(
        "CHECKER_GENESIS_INVALID",
        "Initial checker release must be a single-parent commit.",
        {},
        "blocked"
      );
    }
    const releaseParentCommit = parentParts[1];
    const changedBytes = await runRegisteredGitProbe(canonicalRoot, [
      "diff-tree", "--no-commit-id", "--name-only", "-r", "-z",
      manifest.checkerRelease.releaseCommit, "--"
    ]);
    const changedPaths = changedBytes.length === 0
      ? []
      : decodeCanonicalUtf8(
        changedBytes.subarray(0, -1),
        "CHECKER_GENESIS_INVALID",
        "Checker genesis path list"
      ).split("\0");
    if (
      changedBytes.length === 0 || changedBytes.at(-1) !== 0 ||
      stableJson(changedPaths) !== stableJson([CHECKER_RELEASE_MAPPING_PATH])
    ) {
      throw new PromotionGateError(
        "CHECKER_GENESIS_INVALID",
        "Initial checker release commit must change only the checker release ledger.",
        { changedPathCount: changedPaths.length },
        "blocked"
      );
    }
    try {
      await runRegisteredGitProbe(
        canonicalRoot,
        ["show", "--no-textconv", `${releaseParentCommit}:${CHECKER_RELEASE_MAPPING_PATH}`]
      );
      throw new PromotionGateError(
        "CHECKER_GENESIS_INVALID",
        "Initial checker release parent already contains a checker ledger.",
        {},
        "blocked"
      );
    } catch (error) {
      if (error instanceof PromotionGateError && error.code === "CHECKER_GENESIS_INVALID") throw error;
    }
    const historyBytes = await runRegisteredGitProbe(
      canonicalRoot,
      ["log", "--all", "--format=%H", "--", CHECKER_RELEASE_MAPPING_PATH]
    );
    const historyCommits = decodeCanonicalUtf8(
      historyBytes,
      "CHECKER_GENESIS_INVALID",
      "Checker release history"
    ).split("\n").filter((value) => /^[a-f0-9]{40}$/u.test(value));
    const genesisCommits = [];
    for (const commit of historyCommits) {
      let candidateMapping;
      try {
        candidateMapping = await runRegisteredGitProbe(
          canonicalRoot,
          ["show", "--no-textconv", `${commit}:${CHECKER_RELEASE_MAPPING_PATH}`]
        );
      } catch {
        continue;
      }
      let candidateLedger;
      try {
        candidateLedger = parseCanonicalJsonBytes(
          candidateMapping,
          "CHECKER_RELEASE_LEDGER_INVALID",
          "Checker history ledger"
        );
      } catch {
        continue;
      }
      if (!Array.isArray(candidateLedger.entries) || !candidateLedger.entries.some(({ version }) => version === PROMOTION_CHECKER_VERSION)) {
        continue;
      }
      const candidateParentLine = singleGitLine(
        await runRegisteredGitProbe(canonicalRoot, ["rev-list", "--parents", "-n", "1", commit]),
        "checker-history-parents"
      );
      const candidateParents = candidateParentLine.split(" ").slice(1);
      let parentHasVersion = false;
      for (const parentCommit of candidateParents) {
        try {
          const parentMapping = await runRegisteredGitProbe(
            canonicalRoot,
            ["show", "--no-textconv", `${parentCommit}:${CHECKER_RELEASE_MAPPING_PATH}`]
          );
          const parentLedger = parseCanonicalJsonBytes(
            parentMapping,
            "CHECKER_RELEASE_LEDGER_INVALID",
            "Checker history parent ledger"
          );
          if (Array.isArray(parentLedger.entries) && parentLedger.entries.some(({ version }) => version === PROMOTION_CHECKER_VERSION)) {
            parentHasVersion = true;
          }
        } catch {
          // An absent or malformed parent ledger cannot establish an existing version.
        }
      }
      if (!parentHasVersion) genesisCommits.push(commit);
    }
    const uniqueGenesisCommits = [...new Set(genesisCommits)].sort(codePointCompare);
    if (
      uniqueGenesisCommits.length !== 1 ||
      uniqueGenesisCommits[0] !== manifest.checkerRelease.releaseCommit
    ) {
      throw new PromotionGateError(
        "CHECKER_GENESIS_NOT_UNIQUE",
        "Checker version must have exactly one ledger-only genesis across fetched repository refs.",
        { sameVersionGenesisCount: uniqueGenesisCommits.length },
        "blocked"
      );
    }
    genesisProof = {
      releaseParentCommit,
      ledgerOnlyCommit: true,
      parentMappingAbsent: true,
      sameVersionGenesisCount: 1,
      sameVersionGenesisDigest: fingerprint(uniqueGenesisCommits)
    };
  }

  const proof = {
    schemaVersion: "promotion-checker-release-proof.v1",
    version: entry.version,
    releaseCommit: manifest.checkerRelease.releaseCommit,
    mappingPath: CHECKER_RELEASE_MAPPING_PATH,
    mappingRawSha256: currentMapping.rawSha256,
    bundleAlgorithm: entry.bundleAlgorithm,
    bundlePaths: [...entry.bundlePaths],
    bundleFiles,
    bundleDigest,
    currentMatchesRelease: true,
    targetBaselineMappingStatus,
    genesisProof
  };
  return { ...proof, digest: fingerprint(proof) };
}

export async function collectTrackedInputProof(repoRoot, relativePaths) {
  if (!Array.isArray(relativePaths) || relativePaths.length === 0) {
    throw new PromotionGateError(
      "TRACKED_INPUT_SET_INVALID",
      "Tracked-input proof requires at least one authoritative path.",
      {},
      "blocked"
    );
  }
  const canonicalRoot = await realpath(repoRoot);
  const worktreeState = await collectGitWorktreeState(canonicalRoot);
  const trackedBytes = await runRegisteredGitProbe(canonicalRoot, ["ls-files", "-z"]);
  if (trackedBytes.length > 0 && trackedBytes.at(-1) !== 0) {
    throw new PromotionGateError(
      "TRACKED_INPUT_SET_INVALID",
      "Git tracked-file enumeration returned ambiguous output.",
      {},
      "blocked"
    );
  }
  const trackedPaths = new Set(
    trackedBytes.length === 0
      ? []
      : trackedBytes.subarray(0, -1).toString("utf8").split("\0")
  );
  const taggedBytes = await runRegisteredGitProbe(canonicalRoot, ["ls-files", "-v", "-z"]);
  const taggedEntries = taggedBytes.length === 0
    ? []
    : taggedBytes.subarray(0, -1).toString("utf8").split("\0");
  if (
    taggedBytes.length > 0 && taggedBytes.at(-1) !== 0 ||
    taggedEntries.some((entry) => !/^H /u.test(entry))
  ) {
    throw new PromotionGateError(
      "TRACKED_INPUT_INDEX_FLAG_UNSAFE",
      "Git index contains assume-unchanged, skip-worktree, unmerged, or otherwise non-normal tracked entries.",
      { flaggedEntryCount: taggedEntries.filter((entry) => !/^H /u.test(entry)).length },
      "blocked"
    );
  }
  const stagedBytes = await runRegisteredGitProbe(canonicalRoot, ["ls-files", "--stage", "-z"]);
  const stagedEntries = stagedBytes.length === 0
    ? []
    : stagedBytes.subarray(0, -1).toString("utf8").split("\0");
  if (
    stagedBytes.length > 0 && stagedBytes.at(-1) !== 0 ||
    stagedEntries.some((entry) => {
      const match = /^(\d{6}) [a-f0-9]{40,64} (\d)\t/u.exec(entry);
      return match === null || match[1] === "160000" || match[2] !== "0";
    })
  ) {
    throw new PromotionGateError(
      "TRACKED_INPUT_INDEX_STATE_UNSAFE",
      "Git index contains a submodule, unmerged stage, or ambiguous tracked entry.",
      {},
      "blocked"
    );
  }
  const foldedPaths = new Set();
  const sortedPaths = [...relativePaths].sort(codePointCompare);
  const bindings = [];
  for (const relativePath of sortedPaths) {
    assertSafeRepoRelativePath(relativePath);
    const foldedPath = relativePath.toLocaleLowerCase("en-US");
    if (foldedPaths.has(foldedPath)) {
      throw new PromotionGateError(
        "TRACKED_INPUT_SET_INVALID",
        "Tracked-input paths must be unique without case collisions.",
        {},
        "blocked"
      );
    }
    foldedPaths.add(foldedPath);
    if (!trackedPaths.has(relativePath)) {
      throw new PromotionGateError(
        "TRACKED_INPUT_UNCOMMITTED",
        "An authoritative Promotion Gate input is not tracked at execution HEAD.",
        { inputPathDigest: fingerprint(relativePath) },
        "blocked"
      );
    }
    if (!worktreeState.clean) {
      throw new PromotionGateError(
        "TRACKED_INPUT_BLOB_MISMATCH",
        "Authoritative Promotion Gate inputs cannot be proven against a dirty execution HEAD.",
        { inputPathDigest: fingerprint(relativePath) },
        "blocked"
      );
    }
    const current = await readAuthoritativeFile(canonicalRoot, relativePath);
    let headBytes;
    try {
      headBytes = await runRegisteredGitProbe(canonicalRoot, ["show", "--no-textconv", `HEAD:${relativePath}`]);
    } catch {
      throw new PromotionGateError(
        "TRACKED_INPUT_HEAD_BLOB_MISSING",
        "An authoritative Promotion Gate input is missing from execution HEAD.",
        { inputPathDigest: fingerprint(relativePath) },
        "blocked"
      );
    }
    if (sha256(headBytes) !== current.rawSha256) {
      throw new PromotionGateError(
        "TRACKED_INPUT_BLOB_MISMATCH",
        "Authoritative Promotion Gate bytes differ from their execution HEAD blob.",
        { inputPathDigest: fingerprint(relativePath) },
        "blocked"
      );
    }
    bindings.push({ path: relativePath, rawSha256: current.rawSha256 });
  }
  return {
    trackedInputCount: bindings.length,
    trackedInputAggregateDigest: fingerprint(bindings)
  };
}

function singleGitLine(bytes, label) {
  const value = bytes.toString("utf8");
  if (!value.endsWith("\n") || value.includes("\0") || value.slice(0, -1).includes("\n")) {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      `Git ${label} probe returned ambiguous output.`,
      { probe: label },
      "blocked"
    );
  }
  return value.slice(0, -1);
}

export async function collectGitWorktreeState(repoRoot) {
  let canonicalRoot;
  try {
    canonicalRoot = await realpath(repoRoot);
  } catch {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      "Repository root cannot be canonicalized for the Git worktree proof.",
      { probe: "repo-root" },
      "blocked"
    );
  }
  const topLevelBytes = await runRegisteredGitProbe(canonicalRoot, ["rev-parse", "--show-toplevel"]);
  const declaredTopLevel = singleGitLine(topLevelBytes, "show-toplevel");
  let canonicalTopLevel;
  try {
    canonicalTopLevel = await realpath(declaredTopLevel);
  } catch {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      "Git top-level path cannot be canonicalized.",
      { probe: "show-toplevel" },
      "blocked"
    );
  }
  if (canonicalTopLevel !== canonicalRoot) {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      "Git top-level does not exactly match the Promotion Gate repository root.",
      { probe: "show-toplevel" },
      "blocked"
    );
  }

  const headCommit = singleGitLine(
    await runRegisteredGitProbe(canonicalRoot, ["rev-parse", "HEAD"]),
    "HEAD"
  );
  if (!/^[a-f0-9]{40}$/u.test(headCommit)) {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      "Git execution HEAD is not an exact lowercase 40-hex commit.",
      { probe: "HEAD" },
      "blocked"
    );
  }
  const statusBytes = await runRegisteredGitProbe(
    canonicalRoot,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"]
  );
  return {
    headCommit,
    clean: statusBytes.length === 0,
    statusSha256: sha256(statusBytes),
    statusEntryCount: statusBytes.reduce((count, byte) => count + (byte === 0 ? 1 : 0), 0)
  };
}

function validateGitWorktreeState(state, label) {
  assertExactKeys(state, ["headCommit", "clean", "statusSha256", "statusEntryCount"], label);
  if (
    !/^[a-f0-9]{40}$/u.test(state.headCommit) ||
    typeof state.clean !== "boolean" ||
    !/^[a-f0-9]{64}$/u.test(state.statusSha256) ||
    !Number.isSafeInteger(state.statusEntryCount) ||
    state.statusEntryCount < 0 ||
    (state.clean && (state.statusEntryCount !== 0 || state.statusSha256 !== sha256(Buffer.alloc(0)))) ||
    (!state.clean && state.statusEntryCount === 0)
  ) {
    throw new PromotionGateError(
      "WORKTREE_PROOF_UNAVAILABLE",
      `${label} is not a valid Git worktree state.`,
      { probe: label },
      "blocked"
    );
  }
}

export function assertStableGitWorktree(pre, post) {
  validateGitWorktreeState(pre, "pre");
  validateGitWorktreeState(post, "post");
  if (!pre.clean || !post.clean) {
    const phase = !pre.clean ? "pre" : "post";
    const state = phase === "pre" ? pre : post;
    throw new PromotionGateError(
      "WORKTREE_DIRTY",
      "Promotion Gate requires a named clean Git worktree before and after execution.",
      { phase, statusEntryCount: state.statusEntryCount },
      "blocked"
    );
  }
  if (pre.headCommit !== post.headCommit) {
    throw new PromotionGateError(
      "WORKTREE_HEAD_DRIFT",
      "Git execution HEAD changed during the Promotion Gate attempt.",
      { preHeadCommit: pre.headCommit, postHeadCommit: post.headCommit },
      "blocked"
    );
  }
  if (pre.statusSha256 !== post.statusSha256) {
    throw new PromotionGateError(
      "WORKTREE_STATUS_DRIFT",
      "Git worktree status changed during the Promotion Gate attempt.",
      {},
      "blocked"
    );
  }
  return true;
}

export const LIFECYCLE_TRANSITIONS = Object.freeze({
  candidate_hold: Object.freeze(["shadow_ready"]),
  shadow_ready: Object.freeze(["shadow_passed", "repair_required", "rejected"]),
  shadow_passed: Object.freeze([]),
  repair_required: Object.freeze([]),
  rejected: Object.freeze([])
});

export function assertLifecycleTransition(currentState, requestedState, { runnerV1 = false } = {}) {
  if (!(currentState in LIFECYCLE_TRANSITIONS) || !(requestedState in LIFECYCLE_TRANSITIONS)) {
    throw new PromotionGateError("FUTURE_STATE_UNSUPPORTED", "Unknown, future, or live lifecycle state is unsupported.");
  }
  if (!LIFECYCLE_TRANSITIONS[currentState].includes(requestedState)) {
    throw new PromotionGateError("ILLEGAL_TRANSITION", `Illegal lifecycle transition: ${currentState} -> ${requestedState}.`);
  }
  if (runnerV1 && !(currentState === "shadow_ready" && requestedState === "shadow_passed")) {
    throw new PromotionGateError(
      "V1_RUNNER_TRANSITION_UNSUPPORTED",
      "The v1 shadow runner only accepts shadow_ready -> shadow_passed."
    );
  }
  return true;
}

const FORBIDDEN_EXECUTABLE_KEYS = new Set([
  "command",
  "commands",
  "argv",
  "shell",
  "hook",
  "url",
  "env",
  "fetch",
  "network",
  "deploy",
  "vercel",
  "provider",
  "database"
]);

function assertNoExecutableKeys(value, seen = new WeakSet(), objectPath = []) {
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) {
    throw new PromotionGateError("SCHEMA_INVALID", "Manifest must be an acyclic JSON value.");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertNoExecutableKeys(entry, seen, objectPath);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    const isRequiredNegativeAuthorization =
      objectPath.at(-1) === "authorizations" && key === "deploy";
    if (FORBIDDEN_EXECUTABLE_KEYS.has(key.toLowerCase()) && !isRequiredNegativeAuthorization) {
      throw new PromotionGateError("EXECUTABLE_KEY_FORBIDDEN", `Manifest key "${key}" is forbidden.`);
    }
    assertNoExecutableKeys(entry, seen, [...objectPath, key]);
  }
}

function assertExactKeys(value, expectedKeys, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new PromotionGateError("SCHEMA_INVALID", `${label} must be a plain object.`);
  }
  const actualKeys = Object.keys(value);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) {
      throw new PromotionGateError("SCHEMA_MISSING_FIELD", `${label} is missing required field "${key}".`);
    }
  }
  for (const key of actualKeys) {
    if (!expectedKeys.includes(key)) {
      throw new PromotionGateError("SCHEMA_UNKNOWN_FIELD", `${label} contains unknown field "${key}".`);
    }
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PromotionGateError("SCHEMA_INVALID", `${label} must be a non-empty string.`);
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new PromotionGateError("SCHEMA_INVALID", `${label} must be a lowercase SHA-256 digest.`);
  }
}

function parseCanonicalTimestamp(value, code, label) {
  if (typeof value !== "string") {
    throw new PromotionGateError(code, `${label} must be a canonical ISO timestamp.`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new PromotionGateError(code, `${label} must be a canonical ISO timestamp.`);
  }
  return milliseconds;
}

function assertJsonPointer(value, label) {
  if (typeof value !== "string" || (value !== "" && !/^(?:\/(?:[^~/]|~[01])*)+$/u.test(value))) {
    throw new PromotionGateError("SCHEMA_INVALID", `${label} must be an RFC 6901 JSON Pointer.`);
  }
}

export function extractJsonPointer(document, pointer) {
  assertJsonPointer(pointer, "jsonPointer");
  if (pointer === "") return document;
  const unsafeSegments = new Set(["__proto__", "prototype", "constructor"]);
  let current = document;
  for (const encodedSegment of pointer.slice(1).split("/")) {
    const segment = encodedSegment.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (unsafeSegments.has(segment)) {
      throw new PromotionGateError("JSON_POINTER_UNSAFE", "JSON Pointer contains an unsafe prototype segment.");
    }
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(segment)) {
        throw new PromotionGateError("JSON_POINTER_UNRESOLVED", "JSON Pointer array segment is invalid.");
      }
      const index = Number(segment);
      if (!Number.isSafeInteger(index) || index >= current.length || !Object.hasOwn(current, index)) {
        throw new PromotionGateError("JSON_POINTER_UNRESOLVED", "JSON Pointer does not resolve to a record.");
      }
      current = current[index];
    } else if (current !== null && typeof current === "object" && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      throw new PromotionGateError("JSON_POINTER_UNRESOLVED", "JSON Pointer does not resolve to a record.");
    }
  }
  return current;
}

function validateCandidateArtifacts(manifest) {
  const artifacts = manifest.candidateArtifacts;
  if (!Array.isArray(artifacts) || artifacts.length !== 3) {
    throw new PromotionGateError("ARTIFACT_KIND_SET_INVALID", "candidateArtifacts must contain exactly three artifacts.");
  }
  const ids = new Set();
  const foldedIds = new Set();
  const paths = new Set();
  const foldedPaths = new Set();
  const kinds = new Set();
  for (const [index, artifact] of artifacts.entries()) {
    assertExactKeys(
      artifact,
      ["kind", "id", "path", "jsonPointer", "rawFileSha256", "recordSha256"],
      `candidateArtifacts[${index}]`
    );
    assertNonEmptyString(artifact.id, `candidateArtifacts[${index}].id`);
    if (ids.has(artifact.id)) {
      throw new PromotionGateError("DUPLICATE_ARTIFACT_ID", `Duplicate candidate artifact id "${artifact.id}".`);
    }
    ids.add(artifact.id);
    const foldedId = artifact.id.toLocaleLowerCase("en-US");
    if (foldedIds.has(foldedId)) {
      throw new PromotionGateError("CASE_COLLISION", `Candidate artifact id case collision at "${artifact.id}".`);
    }
    foldedIds.add(foldedId);
    assertSafeRepoRelativePath(artifact.path);
    if (paths.has(artifact.path)) {
      throw new PromotionGateError("DUPLICATE_ARTIFACT_PATH", `Duplicate candidate artifact path "${artifact.path}".`);
    }
    paths.add(artifact.path);
    const foldedPath = artifact.path.toLocaleLowerCase("en-US");
    if (foldedPaths.has(foldedPath)) {
      throw new PromotionGateError("CASE_COLLISION", `Candidate artifact path case collision at "${artifact.path}".`);
    }
    foldedPaths.add(foldedPath);
    kinds.add(artifact.kind);
    assertJsonPointer(artifact.jsonPointer, `candidateArtifacts[${index}].jsonPointer`);
    assertSha256(artifact.rawFileSha256, `candidateArtifacts[${index}].rawFileSha256`);
    assertSha256(artifact.recordSha256, `candidateArtifacts[${index}].recordSha256`);
  }
  if (
    kinds.size !== 3 ||
    !kinds.has("safe-card") ||
    !kinds.has("practice") ||
    !kinds.has("lesson")
  ) {
    throw new PromotionGateError(
      "ARTIFACT_KIND_SET_INVALID",
      "candidateArtifacts must contain exactly one safe-card, practice, and lesson artifact."
    );
  }
  const selection = artifacts.map(({ kind, id, path: artifactPath, jsonPointer }) => ({
    kind,
    id,
    path: artifactPath,
    jsonPointer
  }));
  if (
    manifest.pilotUnitId !== "us-ca-math-rag-v2-g6-ratios-v1" ||
    manifest.parentPackage.id !== "us-ca-math-rag-v2-candidate" ||
    stableJson(selection) !== stableJson(CANONICAL_CANDIDATE_SELECTION)
  ) {
    throw new PromotionGateError(
      "CANDIDATE_SELECTION_MISMATCH",
      "Promotion Gate v1 is bound to the frozen Grade 6 ratios pilot package and exact three candidate records."
    );
  }
  assertSha256(manifest.candidateDigest, "candidateDigest");
  if (computeCandidateDigest(artifacts) !== manifest.candidateDigest) {
    throw new PromotionGateError("CANDIDATE_DIGEST_MISMATCH", "candidateDigest does not match the ordered artifact records.");
  }
}

export const PROMOTION_MANIFEST_FIELDS = Object.freeze([
  "schemaVersion",
  "gateId",
  "pilotUnitId",
  "attemptId",
  "mode",
  "parentPackage",
  "sourceCommit",
  "targetBaselineCommit",
  "checkerVersion",
  "checkerRelease",
  "candidateArtifacts",
  "candidateDigest",
  "knownBlockers",
  "accessPolicy",
  "requiredOwners",
  "evidenceBindings",
  "evidenceIndex",
  "allowlistedCheckIds",
  "operationPlan",
  "authorizations",
  "lifecycle",
  "liveReachability",
  "legacyDiscovery",
  "legacyRatchet"
]);

export const PROMOTION_MANIFEST_SCHEMA_VERSION = "promotion-manifest.v1";
export const PROMOTION_CHECKER_VERSION = "promotion-gate-shadow-v1";
export const PROMOTION_EVIDENCE_SCHEMA_VERSION = "promotion-evidence.v1";
export const TYPESCRIPT_PARSER_VERSION = "5.8.3";
export const TRUST_BOUNDARY =
  "Evidence role is a hash/path-bound self-declaration, not cryptographic identity or human authentication.";
export const PRIOR_S18_REVIEW_PATH =
  "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md";
export const PRIOR_S18_REVIEW_RAW_SHA256 =
  "7b3bfa54b84e105e703e31b5f27e3a135e5a48d5e0ebac1805129056e05318f4";

export const CANONICAL_RUNTIME_ROOTS = Object.freeze(["app", "components", "data", "lib", "public"]);
export const CANONICAL_RUNTIME_SPECIAL_FILES = Object.freeze(["middleware.ts"]);
export const RUNTIME_RESOLVER_CONFIG_PATHS = Object.freeze([
  "tsconfig.json",
  "tsconfig.next.json",
  "next.config.ts"
]);
export const TARGET_BASELINE_PROJECTION_PATHS = Object.freeze([
  ...CANONICAL_RUNTIME_ROOTS,
  ...CANONICAL_RUNTIME_SPECIAL_FILES,
  ...RUNTIME_RESOLVER_CONFIG_PATHS
]);
export const CANONICAL_RUNTIME_ENTRYPOINTS = Object.freeze([
  "data/rag/usMath.ts",
  "lib/rag/usMath.ts",
  "data/usCaliforniaTopics.ts",
  "data/usCaliforniaQuestions.ts",
  "data/questions.ts",
  "data/usCaliforniaLessons.ts",
  "data/lessons.ts",
  "lib/server/questionStore.ts",
  "lib/server/userStore.ts",
  "app/api/questions/route.ts",
  "app/api/lesson-entry/route.ts",
  "app/api/lessons/[slug]/route.ts",
  "app/practice/page.tsx",
  "components/providers/AppProviders.tsx",
  "components/lesson/lessonEntryTarget.ts",
  "components/lesson/StudentLessonPage.tsx",
  "components/lesson/StudentLessonEntryPage.tsx",
  "components/lesson/LessonView.tsx",
  "app/student/lessons/route.ts"
]);
export const CANONICAL_LEGACY_DISCOVERY_ROOTS = Object.freeze([
  "coordination/content-qa",
  "data/generated-content",
  "data/rag"
]);
export const CHECKER_RELEASE_MAPPING_PATH = "coordination/integration/checker-releases.v1.json";
export const CHECKER_BUNDLE_PATHS = Object.freeze([
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/promotion-gate.mjs",
  "coordination/integration/schemas/promotion-manifest.v1.schema.json",
  "coordination/integration/schemas/promotion-receipt.v1.schema.json",
  "coordination/integration/promotion-gate.test.mjs",
  "package.json",
  "package-lock.json"
]);
export const CANONICAL_CANDIDATE_SELECTION = Object.freeze([
  Object.freeze({
    kind: "safe-card",
    id: "ca-rag-v2-cluster-grade-6-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/safe-card-drafts.json",
    jsonPointer: "/108"
  }),
  Object.freeze({
    kind: "practice",
    id: "s04-ca-rag-v2-q031-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json",
    jsonPointer: "/questions/30"
  }),
  Object.freeze({
    kind: "lesson",
    id: "s05-ca-rag-v2-lesson-031-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json",
    jsonPointer: "/lessons/30"
  })
]);

export const REQUIRED_OWNER_ROLES = Object.freeze([
  "A21",
  "A18",
  "A04",
  "A05",
  "A23",
  "A11",
  "A22",
  "A24",
  "A25"
]);

export const EVIDENCE_KIND_BY_ROLE = Object.freeze({
  A21: "candidate-generation",
  A18: "independent-qa",
  A04: "practice-semantics",
  A05: "lesson-semantics",
  A23: "promotion-plan",
  A11: "targeted-regression",
  A22: "release-readiness",
  A24: "exact-layer",
  A25: "release-intake"
});

export const REQUIRED_CHECK_IDS = Object.freeze([
  "manifest-contract",
  "candidate-integrity",
  "evidence-currentness",
  "mapping-compatibility",
  "rollback-rehearsal",
  "live-reachability",
  "forbidden-diff",
  "legacy-ratchet"
]);

function validateEvidenceBindings(manifest) {
  if (
    !Array.isArray(manifest.requiredOwners) ||
    stableJson(manifest.requiredOwners) !== stableJson(REQUIRED_OWNER_ROLES)
  ) {
    throw new PromotionGateError("EVIDENCE_ROLE_SET_INVALID", "requiredOwners must be the exact ordered v1 owner role set.");
  }
  const bindings = manifest.evidenceBindings;
  if (!Array.isArray(bindings) || bindings.length !== REQUIRED_OWNER_ROLES.length) {
    throw new PromotionGateError("EVIDENCE_ROLE_SET_INVALID", "evidenceBindings must contain one binding per required owner role.");
  }
  const roles = new Set();
  const foldedRoles = new Set();
  const paths = new Set();
  const foldedPaths = new Set();
  const kinds = new Set();
  const foldedKinds = new Set();
  const reviewedCommits = new Set();
  for (const [index, binding] of bindings.entries()) {
    assertExactKeys(
      binding,
      ["kind", "role", "path", "rawSha256", "semanticSha256", "reviewedCommit"],
      `evidenceBindings[${index}]`
    );
    if (roles.has(binding.role)) {
      throw new PromotionGateError("DUPLICATE_EVIDENCE_ROLE", `Duplicate evidence role "${binding.role}".`);
    }
    roles.add(binding.role);
    const foldedRole = String(binding.role).toLocaleLowerCase("en-US");
    if (foldedRoles.has(foldedRole)) {
      throw new PromotionGateError("CASE_COLLISION", `Evidence role case collision at "${binding.role}".`);
    }
    foldedRoles.add(foldedRole);
    assertSafeRepoRelativePath(binding.path);
    if (paths.has(binding.path)) {
      throw new PromotionGateError("DUPLICATE_EVIDENCE_PATH", `Duplicate evidence path "${binding.path}".`);
    }
    paths.add(binding.path);
    const foldedPath = binding.path.toLocaleLowerCase("en-US");
    if (foldedPaths.has(foldedPath)) {
      throw new PromotionGateError("CASE_COLLISION", `Evidence path case collision at "${binding.path}".`);
    }
    foldedPaths.add(foldedPath);
    if (kinds.has(binding.kind)) {
      throw new PromotionGateError("DUPLICATE_EVIDENCE_KIND", `Duplicate evidence kind "${binding.kind}".`);
    }
    kinds.add(binding.kind);
    const foldedKind = String(binding.kind).toLocaleLowerCase("en-US");
    if (foldedKinds.has(foldedKind)) {
      throw new PromotionGateError("CASE_COLLISION", `Evidence kind case collision at "${binding.kind}".`);
    }
    foldedKinds.add(foldedKind);
    assertSha256(binding.rawSha256, `evidenceBindings[${index}].rawSha256`);
    assertSha256(binding.semanticSha256, `evidenceBindings[${index}].semanticSha256`);
    if (!/^[a-f0-9]{40}$/u.test(binding.reviewedCommit)) {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_COMMIT_INVALID",
        `Evidence reviewedCommit for role "${binding.role}" must be lowercase 40-hex.`
      );
    }
    if (reviewedCommits.has(binding.reviewedCommit)) {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_COMMIT_REUSE",
        "Nine independent owner bindings require nine distinct reviewed commits."
      );
    }
    reviewedCommits.add(binding.reviewedCommit);
  }
  if (roles.size !== REQUIRED_OWNER_ROLES.length || REQUIRED_OWNER_ROLES.some((role) => !roles.has(role))) {
    throw new PromotionGateError("EVIDENCE_ROLE_SET_INVALID", "evidenceBindings must contain the exact v1 owner role set.");
  }
  for (const binding of bindings) {
    if (EVIDENCE_KIND_BY_ROLE[binding.role] !== binding.kind) {
      throw new PromotionGateError(
        "EVIDENCE_KIND_ROLE_MISMATCH",
        `Evidence kind "${binding.kind}" does not match role "${binding.role}".`
      );
    }
  }
}

function validateEvidenceIndexBinding(manifest) {
  assertExactKeys(manifest.evidenceIndex, ["path", "rawSha256"], "evidenceIndex");
  assertSafeRepoRelativePath(manifest.evidenceIndex.path);
  assertSha256(manifest.evidenceIndex.rawSha256, "evidenceIndex.rawSha256");
  const boundPaths = new Set(manifest.evidenceBindings.map(({ path: evidencePath }) =>
    evidencePath.toLocaleLowerCase("en-US")
  ));
  if (boundPaths.has(manifest.evidenceIndex.path.toLocaleLowerCase("en-US"))) {
    throw new PromotionGateError(
      "EVIDENCE_INDEX_BINDING_INVALID",
      "The evidence index must be a distinct authoritative file, not an owner evidence file."
    );
  }
}

function validateCheckIds(checkIds) {
  if (!Array.isArray(checkIds)) {
    throw new PromotionGateError("CHECK_SET_INVALID", "allowlistedCheckIds must be an array.");
  }
  for (const checkId of checkIds) {
    if (!REQUIRED_CHECK_IDS.includes(checkId)) {
      throw new PromotionGateError("UNKNOWN_CHECK_ID", `Unknown Promotion Gate check id "${String(checkId)}".`);
    }
  }
  if (
    checkIds.length !== REQUIRED_CHECK_IDS.length ||
    new Set(checkIds).size !== REQUIRED_CHECK_IDS.length ||
    REQUIRED_CHECK_IDS.some((checkId) => !checkIds.includes(checkId))
  ) {
    throw new PromotionGateError("CHECK_SET_INVALID", "allowlistedCheckIds must contain the exact v1 check set.");
  }
}

function validateOperationPlan(operationPlan) {
  assertExactKeys(
    operationPlan,
    ["expectedOperationCount", "expectedOutputTypes", "outputs", "rollback"],
    "operationPlan"
  );
  if (
    operationPlan.expectedOperationCount !== 3 ||
    stableJson(operationPlan.expectedOutputTypes) !== stableJson(["safe-card", "practice", "lesson"])
  ) {
    throw new PromotionGateError(
      "OUTPUT_SET_INVALID",
      "operationPlan must explicitly bind three ordered safe-card/practice/lesson output types."
    );
  }
  if (!Array.isArray(operationPlan.outputs) || operationPlan.outputs.length !== 3) {
    throw new PromotionGateError("OUTPUT_SET_INVALID", "operationPlan.outputs must contain exactly three outputs.");
  }
  const kinds = new Set();
  const paths = new Set();
  const foldedPaths = new Set();
  for (const [index, output] of operationPlan.outputs.entries()) {
    assertExactKeys(output, ["kind", "path"], `operationPlan.outputs[${index}]`);
    assertSafeRepoRelativePath(output.path);
    if (output.path.includes("/")) {
      throw new PromotionGateError("OUTPUT_SET_INVALID", "Shadow output targets must be file names inside the fresh temp root.");
    }
    if (paths.has(output.path)) {
      throw new PromotionGateError("TARGET_COLLISION", `Shadow output target collision at "${output.path}".`);
    }
    paths.add(output.path);
    const foldedPath = output.path.toLocaleLowerCase("en-US");
    if (foldedPaths.has(foldedPath)) {
      throw new PromotionGateError("CASE_COLLISION", `Shadow output target case collision at "${output.path}".`);
    }
    foldedPaths.add(foldedPath);
    kinds.add(output.kind);
  }
  if (
    kinds.size !== 3 ||
    !kinds.has("safe-card") ||
    !kinds.has("practice") ||
    !kinds.has("lesson")
  ) {
    throw new PromotionGateError("OUTPUT_SET_INVALID", "Shadow outputs must contain one safe-card, practice, and lesson target.");
  }
  if (operationPlan.rollback !== "delete-and-verify-absent") {
    throw new PromotionGateError("ROLLBACK_POLICY_INVALID", "Shadow rollback must delete all outputs and verify absence.");
  }
}

function validateKnownBlockers(knownBlockers) {
  const expected = [
    {
      code: "item-standard-scope-overclaim",
      owner: "A18",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "fine-grained-standard-id-live-mapping-unbound",
      owner: "A04",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "unresolved-live-source-ids",
      owner: "A23",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "missing-bilingual-fields",
      owner: "A05",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "known-grammar-issue",
      owner: "A18",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "student-feedback-exposes-internal-misconception-label",
      owner: "A04",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "open-ended-practice-without-answer-or-rubric",
      owner: "A05",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "prior-s18-evidence-record-mismatch",
      owner: "A18",
      status: "preserved-outside-runtime",
      liveBlocking: true
    },
    {
      code: "legacy-live-package-conflict",
      owner: "A23",
      status: "ratcheted-temporary",
      liveBlocking: true
    }
  ];
  if (stableJson(knownBlockers) !== stableJson(expected)) {
    throw new PromotionGateError(
      "KNOWN_BLOCKER_SET_INVALID",
      "knownBlockers must bind the exact standards, localization, feedback, assessment, grammar, and legacy live blockers."
    );
  }
}

function validateAuthorizations(authorizations) {
  assertExactKeys(
    authorizations,
    ["shadow", "integration", "live", "preview", "deploy"],
    "authorizations"
  );
  if (
    authorizations.shadow !== true ||
    authorizations.integration !== false ||
    authorizations.live !== false ||
    authorizations.preview !== false ||
    authorizations.deploy !== false
  ) {
    throw new PromotionGateError(
      "AUTHORIZATION_BOUNDARY_VIOLATION",
      "Shadow v1 requires shadow=true and integration/live/preview/deploy=false."
    );
  }
}

function pathCoveredBy(pathValue, policyPaths) {
  return policyPaths.some((policyPath) => pathValue === policyPath || pathValue.startsWith(`${policyPath}/`));
}

function validatePathList(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PromotionGateError("SCHEMA_INVALID", `${label} must be a non-empty array.`);
  }
  const seen = new Set();
  for (const entry of value) {
    assertSafeRepoRelativePath(entry);
    const folded = entry.toLocaleLowerCase("en-US");
    if (seen.has(folded)) {
      throw new PromotionGateError("CASE_COLLISION", `${label} contains a duplicate or case-colliding path.`);
    }
    seen.add(folded);
  }
}

function validateAccessAndReachability(manifest) {
  assertExactKeys(
    manifest.accessPolicy,
    ["allowedReadPaths", "allowedTemporaryWritePaths", "forbiddenModificationPaths", "tempRootPolicy"],
    "accessPolicy"
  );
  validatePathList(manifest.accessPolicy.allowedReadPaths, "accessPolicy.allowedReadPaths");
  validatePathList(manifest.accessPolicy.allowedTemporaryWritePaths, "accessPolicy.allowedTemporaryWritePaths");
  validatePathList(manifest.accessPolicy.forbiddenModificationPaths, "accessPolicy.forbiddenModificationPaths");
  if (manifest.accessPolicy.tempRootPolicy !== "os-temp-only") {
    throw new PromotionGateError("TEMP_ROOT_POLICY_INVALID", "Shadow writes are restricted to a fresh OS temp root.");
  }

  assertExactKeys(
    manifest.liveReachability,
    ["policy", "roots", "entrypoints", "specialFiles", "registry"],
    "liveReachability"
  );
  if (manifest.liveReachability.policy !== "selected-candidate-unreachable") {
    throw new PromotionGateError("LIVE_REACHABILITY_POLICY_INVALID", "The selected candidate must remain unreachable from live roots.");
  }
  validatePathList(manifest.liveReachability.roots, "liveReachability.roots");
  validatePathList(manifest.liveReachability.entrypoints, "liveReachability.entrypoints");
  validatePathList(manifest.liveReachability.specialFiles, "liveReachability.specialFiles");
  if (
    stableJson(manifest.liveReachability.roots) !== stableJson(CANONICAL_RUNTIME_ROOTS) ||
    stableJson(manifest.liveReachability.entrypoints) !== stableJson(CANONICAL_RUNTIME_ENTRYPOINTS) ||
    stableJson(manifest.liveReachability.specialFiles) !== stableJson(CANONICAL_RUNTIME_SPECIAL_FILES)
  ) {
    throw new PromotionGateError(
      "LIVE_SURFACE_CONTRACT_MISMATCH",
      "Promotion Gate v1 requires the frozen five runtime roots and nineteen canonical entrypoints."
    );
  }
  assertExactKeys(manifest.liveReachability.registry, ["path", "rawSha256"], "liveReachability.registry");
  assertSafeRepoRelativePath(manifest.liveReachability.registry.path);
  assertSha256(manifest.liveReachability.registry.rawSha256, "liveReachability.registry.rawSha256");
  for (const entrypoint of manifest.liveReachability.entrypoints) {
    if (!pathCoveredBy(entrypoint, manifest.liveReachability.roots)) {
      throw new PromotionGateError(
        "LIVE_REGISTRY_MISMATCH",
        `Live entrypoint "${entrypoint}" is outside the declared live roots.`
      );
    }
  }

  assertExactKeys(manifest.legacyDiscovery, ["policy", "roots", "registry"], "legacyDiscovery");
  if (
    manifest.legacyDiscovery.policy !== "reachable-candidate-package-conflicts-v1" ||
    stableJson(manifest.legacyDiscovery.roots) !== stableJson(CANONICAL_LEGACY_DISCOVERY_ROOTS)
  ) {
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_CONTRACT_MISMATCH",
      "Legacy discovery must use the frozen content-QA, generated-content, and RAG roots."
    );
  }
  validatePathList(manifest.legacyDiscovery.roots, "legacyDiscovery.roots");
  assertExactKeys(manifest.legacyDiscovery.registry, ["path", "rawSha256"], "legacyDiscovery.registry");
  assertSafeRepoRelativePath(manifest.legacyDiscovery.registry.path);
  assertSha256(manifest.legacyDiscovery.registry.rawSha256, "legacyDiscovery.registry.rawSha256");
  assertSafeRepoRelativePath(manifest.legacyRatchet);

  const authoritativePaths = [
    ...manifest.candidateArtifacts.map((artifact) => artifact.path),
    ...manifest.evidenceBindings.map((binding) => binding.path),
    manifest.evidenceIndex.path,
    ...manifest.liveReachability.roots,
    ...manifest.liveReachability.entrypoints,
    ...manifest.liveReachability.specialFiles,
    ...RUNTIME_RESOLVER_CONFIG_PATHS,
    manifest.liveReachability.registry.path,
    ...manifest.legacyDiscovery.roots,
    manifest.legacyDiscovery.registry.path,
    manifest.checkerRelease.mappingPath,
    ...CHECKER_BUNDLE_PATHS,
    manifest.legacyRatchet
  ];
  for (const authoritativePath of authoritativePaths) {
    if (!pathCoveredBy(authoritativePath, manifest.accessPolicy.allowedReadPaths)) {
      throw new PromotionGateError("READ_POLICY_INCOMPLETE", `Read policy does not cover "${authoritativePath}".`);
    }
    if (!pathCoveredBy(authoritativePath, manifest.accessPolicy.forbiddenModificationPaths)) {
      throw new PromotionGateError(
        "FORBIDDEN_MODIFICATION_POLICY_INCOMPLETE",
        `Forbidden-modification policy does not cover "${authoritativePath}".`
      );
    }
  }

  const outputPaths = manifest.operationPlan.outputs.map((output) => output.path);
  if (
    outputPaths.length !== manifest.accessPolicy.allowedTemporaryWritePaths.length ||
    outputPaths.some((outputPath) => !manifest.accessPolicy.allowedTemporaryWritePaths.includes(outputPath))
  ) {
    throw new PromotionGateError(
      "TEMP_WRITE_SET_INVALID",
      "allowedTemporaryWritePaths must exactly match the three operationPlan outputs."
    );
  }
}

function validateManifestScalars(manifest) {
  if (manifest.schemaVersion !== PROMOTION_MANIFEST_SCHEMA_VERSION) {
    throw new PromotionGateError("SCHEMA_VERSION_UNSUPPORTED", "Unsupported Promotion Gate manifest schema version.");
  }
  for (const field of ["gateId", "pilotUnitId", "attemptId"]) {
    assertNonEmptyString(manifest[field], field);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(manifest[field])) {
      throw new PromotionGateError("SCHEMA_INVALID", `${field} contains unsupported characters.`);
    }
  }
  assertNonEmptyString(manifest.parentPackage.id, "parentPackage.id");
  if (
    manifest.parentPackage.sourceVersion !== `sha256:${manifest.candidateDigest}` ||
    manifest.parentPackage.candidatePackagingVersion !== "promotion-package.v1" ||
    manifest.parentPackage.status !== "candidate-only"
  ) {
    throw new PromotionGateError("PARENT_STATUS_INVALID", "The parent package must remain candidate-only.");
  }
  if (!/^[a-f0-9]{40}$/u.test(manifest.sourceCommit) || !/^[a-f0-9]{40}$/u.test(manifest.targetBaselineCommit)) {
    throw new PromotionGateError("COMMIT_BINDING_INVALID", "sourceCommit and targetBaselineCommit must be lowercase 40-hex commits.");
  }
  if (manifest.checkerVersion !== PROMOTION_CHECKER_VERSION) {
    throw new PromotionGateError("CHECKER_VERSION_UNSUPPORTED", "Unsupported Promotion Gate checker version.");
  }
  assertExactKeys(
    manifest.checkerRelease,
    ["version", "releaseCommit", "mappingPath", "mappingRawSha256", "bundleDigest"],
    "checkerRelease"
  );
  if (
    manifest.checkerRelease.version !== PROMOTION_CHECKER_VERSION ||
    manifest.checkerRelease.version !== manifest.checkerVersion ||
    !/^[a-f0-9]{40}$/u.test(manifest.checkerRelease.releaseCommit) ||
    manifest.checkerRelease.mappingPath !== CHECKER_RELEASE_MAPPING_PATH
  ) {
    throw new PromotionGateError(
      "CHECKER_RELEASE_INVALID",
      "checkerRelease must bind the frozen checker version, release commit, and release ledger path."
    );
  }
  assertSha256(manifest.checkerRelease.mappingRawSha256, "checkerRelease.mappingRawSha256");
  assertSha256(manifest.checkerRelease.bundleDigest, "checkerRelease.bundleDigest");
}

export function validatePromotionManifest(manifest) {
  assertNoExecutableKeys(manifest);
  assertExactKeys(manifest, PROMOTION_MANIFEST_FIELDS, "promotion manifest");
  assertExactKeys(
    manifest.parentPackage,
    ["id", "sourceVersion", "candidatePackagingVersion", "status"],
    "parentPackage"
  );
  validateManifestScalars(manifest);
  if (manifest?.mode !== "shadow") {
    throw new PromotionGateError("LIVE_MODE_DISABLED", "Promotion Gate v1 only permits shadow mode.");
  }
  validateCandidateArtifacts(manifest);
  validateKnownBlockers(manifest.knownBlockers);
  validateEvidenceBindings(manifest);
  validateEvidenceIndexBinding(manifest);
  validateCheckIds(manifest.allowlistedCheckIds);
  validateOperationPlan(manifest.operationPlan);
  validateAuthorizations(manifest.authorizations);
  assertExactKeys(manifest.lifecycle, ["currentState", "requestedState"], "lifecycle");
  assertLifecycleTransition(manifest.lifecycle.currentState, manifest.lifecycle.requestedState, { runnerV1: true });
  validateAccessAndReachability(manifest);
  return manifest;
}

function expectedRoleSemanticPayload(role, manifest) {
  if (!manifest) {
    throw new PromotionGateError(
      `${role}_SEMANTICS_INVALID`,
      `${role} semantic evidence requires the bound promotion manifest.`
    );
  }
  const artifactByKind = Object.fromEntries(manifest.candidateArtifacts.map((artifact) => [artifact.kind, artifact]));
  const parentFields = {
    "safe-card": ["packageId", "status", "candidate-only"],
    practice: ["upstreamPackageId", "approval.status", "candidate-only"],
    lesson: ["upstreamPackageId", "releaseStatus", "not-live"]
  };
  const artifacts = manifest.candidateArtifacts.map((artifact) => ({
    kind: artifact.kind,
    id: artifact.id,
    path: artifact.path,
    jsonPointer: artifact.jsonPointer,
    rawFileSha256: artifact.rawFileSha256,
    recordSha256: artifact.recordSha256,
    parentBindingField: parentFields[artifact.kind][0],
    parentBindingValue: manifest.parentPackage.id,
    candidateStateField: parentFields[artifact.kind][1],
    candidateStateValue: parentFields[artifact.kind][2]
  }));
  const artifactIds = manifest.candidateArtifacts.map(({ id }) => id);
  const sourceSequence = [
    "objective",
    "prerequisiteCheck",
    "conceptExplanation",
    "workedExample",
    "guidedPractice",
    "independentPractice",
    "remediation",
    "teacherNotes"
  ];
  const shadowSequence = ["objective", "workedExample", "guidedPractice", "independentPractice", "remediation"];
  const lessonLiveBlockers = [
    { code: "missing-bilingual-fields", status: "preserved-outside-runtime", path: "lessonModule" },
    {
      code: "known-grammar-issue",
      status: "preserved-outside-runtime",
      path: "lessonModule.conceptExplanation"
    },
    {
      code: "open-ended-practice-without-answer-or-rubric",
      status: "preserved-outside-runtime",
      path: "lessonModule.guidedPractice+independentPractice"
    }
  ];
  const payloadByRole = {
    A21: {
      contractVersion: "promotion-a21-candidate.v1",
      candidatePackage: {
        id: manifest.parentPackage.id,
        sourceVersion: `sha256:${manifest.candidateDigest}`,
        status: "candidate-only",
        generatedAt: "2026-06-19",
        immutableDuringShadow: true
      },
      inventory: { safeCardRecords: 146, practiceRecords: 68, lessonRecords: 68 },
      candidateDigest: manifest.candidateDigest,
      artifacts,
      sourceSafety: {
        safeCardCopiedSourceText: false,
        safeCardReleaseClaim: "candidate-only",
        practiceSourceDistanceStatus: "passed-source-distance-scan",
        practiceMathQaStatus: "passed-deterministic-candidate-check",
        lessonSourceDistanceStatus: "passed-source-distance-scan",
        lessonMathQaStatus: "passed-template-consistency-check"
      },
      liveMutationAuthorized: false
    },
    A18: {
      contractVersion: "promotion-a18-shadow-qa.v1",
      decisions: manifest.candidateArtifacts.map(({ kind, id }) => ({
        kind,
        id,
        decision: "accept-for-shadow",
        liveDecision: "repair-before-live",
        rejected: false
      })),
      independentMath: {
        firstQuantity: "oats-cups",
        secondQuantity: "fruit-cups",
        orderedRatio: [3, 5],
        targetQuantity: "fruit-cups",
        targetValue: 20,
        scaleFactor: 4,
        scaleCheck: {
          leftExpression: "5 * 4",
          leftValue: 20,
          rightExpression: "3 * 4",
          rightValue: 12
        },
        numericAnswer: 12,
        canonicalAnswer: "12 cups",
        acceptedAnswers: ["12", "12 cups"],
        acceptedAnswerPolicy: "exact-trimmed-forms-v1",
        ratioOrderPreserved: true,
        reasoning: ["preserve-ratio-order", "scale-both-quantities-by-4"]
      },
      standards: {
        declaredCluster: ["6.RP.1", "6.RP.2", "6.RP.3"],
        candidateMaisIds: ["CA.CCSS.Math.G6.RP.1", "CA.CCSS.Math.G6.RP.2", "CA.CCSS.Math.G6.RP.3"],
        primaryStandardId: "6.RP.3",
        directlyAssessed: ["6.RP.3"],
        embeddedPrerequisite: ["6.RP.1"],
        notDemonstrated: ["6.RP.2"],
        proposedLiveAlias: "6.RP.A.3",
        liveMappingStatus: "unverified-incompatible-preserved-outside-runtime"
      },
      lessonReview: {
        sourceSequence,
        shadowMappedSequence: shadowSequence,
        workedExampleMatchesPractice: true,
        misconceptions: {
          safeCardTags: ["ratio order reversed", "unit rate not normalized"],
          lessonMetadataTargets: ["ratio order reversed", "unit rate not normalized"],
          practiceFeedback: "ratio order reversed",
          remediationTarget: "ratio order reversed"
        }
      },
      priorReviewDrift: {
        path: PRIOR_S18_REVIEW_PATH,
        rawSha256: PRIOR_S18_REVIEW_RAW_SHA256,
        recordedClaim: "additive-vs-multiplicative confusion",
        actualRemediationTarget: "ratio order reversed",
        matchesSelectedRecord: false,
        mustBeSupersededBeforeLive: true
      },
      liveBlockers: [
        {
          code: "item-standard-scope-overclaim",
          declaredCluster: ["6.RP.1", "6.RP.2", "6.RP.3"],
          directlyAssessed: ["6.RP.3"],
          embeddedPrerequisite: ["6.RP.1"],
          notDemonstrated: ["6.RP.2"],
          status: "blocked-for-live"
        },
        {
          code: "fine-grained-standard-id-live-mapping-unbound",
          candidateMaisIds: ["CA.CCSS.Math.G6.RP.1", "CA.CCSS.Math.G6.RP.2", "CA.CCSS.Math.G6.RP.3"],
          proposedLiveAlias: "6.RP.A.3",
          status: "blocked-for-live"
        },
        {
          code: "unresolved-live-source-ids",
          candidateSourceIds: [
            "california-math-common-core-skill",
            "cde-ca-ccss-math-resources",
            "common-core-state-standards-public-license",
            "ixl-california-math-standards-navigation-only"
          ],
          verifiedLiveSourceIds: [
            "cde-ca-ccss-math-resources",
            "common-core-state-standards-public-license"
          ],
          unresolvedSourceIds: [
            "california-math-common-core-skill",
            "ixl-california-math-standards-navigation-only"
          ],
          status: "blocked-for-live"
        },
        {
          code: "missing-bilingual-fields",
          paths: [
            `${artifactByKind["safe-card"].path}${artifactByKind["safe-card"].jsonPointer}/bilingualTerminologyNotes`,
            `${artifactByKind.practice.path}${artifactByKind.practice.jsonPointer}`,
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}`
          ],
          presentLocales: ["en"],
          requiredLocalesBeforeLive: ["en", "zh", "zhHans"],
          status: "blocked-for-live"
        },
        {
          code: "known-grammar-issue",
          path: `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/conceptExplanation`,
          observedFragment: "The double number lines and ratio tables becomes your map",
          requiredFragment: "The double number lines and ratio tables become your map",
          status: "blocked-for-live"
        },
        {
          code: "student-feedback-exposes-internal-misconception-label",
          path: `${artifactByKind.practice.path}${artifactByKind.practice.jsonPointer}/studentContent/misconceptionFeedback/en`,
          observedValue: "ratio order reversed",
          status: "blocked-for-live"
        },
        {
          code: "open-ended-practice-without-answer-or-rubric",
          paths: [
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/guidedPractice`,
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/independentPractice`
          ],
          status: "blocked-for-live"
        },
        {
          code: "prior-s18-evidence-record-mismatch",
          path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md",
          recordedClaim: "additive-vs-multiplicative confusion",
          actualRemediationTarget: "ratio order reversed",
          status: "blocked-for-live"
        }
      ],
      shadowEligible: true,
      liveEligible: false
    },
    A04: {
      contractVersion: "promotion-a04-practice-semantics.v1",
      practiceId: artifactByKind.practice.id,
      numericOracle: 12,
      acceptedAnswers: ["12", "12 cups"],
      acceptedAnswerPolicy: "exact-trimmed-forms-v1",
      primaryStandardId: "6.RP.3",
      liveStandardAlias: "6.RP.A.3",
      liveAliasStatus: "unverified-incompatible-preserved-outside-runtime",
      futureBoundary: "candidate-only-no-live-write"
    },
    A05: {
      contractVersion: "promotion-a05-lesson-semantics.v1",
      lessonId: artifactByKind.lesson.id,
      recordPath: artifactByKind.lesson.path,
      jsonPointer: artifactByKind.lesson.jsonPointer,
      recordSha256: artifactByKind.lesson.recordSha256,
      sourceContainer: "lessonModule",
      languageMode: "en",
      sourceSequence,
      shadowMappedSequence: shadowSequence,
      shadowOmittedFields: ["prerequisiteCheck", "conceptExplanation", "teacherNotes"],
      workedExampleBinding: {
        practiceId: artifactByKind.practice.id,
        promptMatchesPractice: true,
        answer: "12 cups",
        numericOracle: 12
      },
      misconceptions: {
        metadataTargets: ["ratio order reversed", "unit rate not normalized"],
        remediationTarget: "ratio order reversed"
      },
      remediationRequired: true,
      inventBilingualFields: false,
      liveBlockers: lessonLiveBlockers,
      futureBoundary: "candidate-only-no-live-write"
    },
    A23: {
      contractVersion: "promotion-a23-shadow-plan.v1",
      pilotUnitId: manifest.pilotUnitId,
      candidateDigest: manifest.candidateDigest,
      mode: "shadow",
      currentState: manifest.lifecycle.currentState,
      requestedState: manifest.lifecycle.requestedState,
      authorizations: cloneCanonical(manifest.authorizations),
      operationPlan: {
        outputs: cloneCanonical(manifest.operationPlan.outputs),
        rollback: manifest.operationPlan.rollback
      },
      preflightMarkerScan: {
        schemaVersion: "promotion-runtime-marker-scan.v1",
        scanKind: "all-bytes-exact-needle",
        roots: ["app", "components", "data", "lib", "public"],
        fileCount: 3666,
        byteCount: 337194582,
        candidatePathNeedles: manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
        identityNeedles: [manifest.pilotUnitId, manifest.parentPackage.id, ...artifactIds],
        candidatePathHits: [],
        identityMarkerHits: [],
        selectedCandidateMarkerReachable: false,
        nonliteralDynamicImportsAssessed: false,
        finalRegistryScanRequired: true
      },
      canonicalRuntimeSurfaceV1: {
        status: "frozen",
        roots: [...CANONICAL_RUNTIME_ROOTS],
        entrypoints: [...CANONICAL_RUNTIME_ENTRYPOINTS]
      },
      liveAllowed: false
    },
    A11: {
      contractVersion: "promotion-a11-shadow-replay.v1",
      evidencePhase: "preflight",
      replayContract: "independent-synthetic-and-real-shaped-v1",
      selectedArtifactIds: artifactIds,
      historicalStaticPreview: {
        reportPath: "coordination/content-qa/us-ca-math-rag-v2-candidate/s11-candidate-preview-smoke.json",
        reportRawSha256: "653c9f6c15d7ec604aa55a4231178d7f45fea98d40cb7c4683c9731e21a1eca9",
        reportStatus: "pass",
        practiceCards: 2,
        lessonCards: 2,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        liveAppRegression: false,
        referencedHtmlPresent: false,
        referencedScreenshotPresent: false,
        usableAsFinalPilotProof: false
      },
      preflightAssertions: {
        testCommand: "npm run test:promotion-gate",
        syntheticSuiteRequired: true,
        realManifestValidationRequired: true,
        realShadowRequired: true,
        independentReplayRequired: true,
        verifyReceiptRequired: true
      },
      postRunReportBoundary: {
        status: "required-after-execution",
        validationEnvelopeSchema: "promotion-validation.v1",
        validationResult: "pass",
        requiredCheckIds: [...REQUIRED_CHECK_IDS],
        requiredReceiptSchema: "promotion-receipt.v1",
        requiredReceiptCount: 2,
        distinctRunIdsRequired: true,
        semanticReceiptDigestEqualityRequired: true,
        rawReceiptDigestInequalityRequired: false,
        verifyReceiptCount: 2,
        selectedCandidateReachableExpected: false,
        legacyRatchetResultExpected: "pass"
      },
      legacy492Expectation: {
        packagePath: LEGACY_AUTHORITATIVE_PACKAGE_PATH,
        questionCount: 492,
        uniqueIdCount: 492
      },
      claims: {
        finalReplayCompleted: false,
        liveAppRegressionCompleted: false,
        previewVerified: false,
        deploymentVerified: false
      }
    },
    A22: {
      contractVersion: "promotion-a22-release-readiness.v1",
      evidencePhase: "preflight",
      preflightDisposition: "awaiting-committed-clean-sha",
      currentObservation: {
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        clean: false,
        statusSha256: "1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1",
        statusEntryCount: 6,
        usableAsExecutionSource: false
      },
      executionSourceRequirements: {
        namedGitWorktreeRequired: true,
        cleanBeforeRun: true,
        cleanAfterRun: true,
        statusEntryCountBeforeRun: 0,
        statusEntryCountAfterRun: 0,
        headStableDuringRun: true,
        executionCommitRecordedSeparately: true,
        headMustEqualManifestSourceCommit: false,
        independentReplayMustCheckoutExecutionCommit: true
      },
      executionPolicy: {
        temporaryWrites: "os-temp-only",
        promotionCommandNetworkAllowed: false,
        providerCallsAllowed: false,
        databaseCallsAllowed: false,
        productionWriteAllowed: false,
        previewAllowed: false,
        deployAllowed: false
      },
      postRunReportBoundary: {
        status: "required-after-execution",
        sourceSnapshotsEqualRequired: true,
        forbiddenChangedPathsExpected: [],
        rollbackMethod: "delete-and-verify-absent",
        deletedOutputKindsExpected: ["safe-card", "practice", "lesson"],
        outputsVerifiedAbsentRequired: true,
        temporaryRootRemovedRequired: true,
        externalSideEffectsExpected: false,
        worktreePreCleanRequired: true,
        worktreePostCleanRequired: true
      },
      claims: {
        shadowExecuted: false,
        rollbackRehearsed: false,
        replayCompleted: false,
        previewAttempted: false,
        deployAttempted: false,
        liveVerified: false
      }
    },
    A24: {
      contractVersion: "promotion-a24-exact-layer.v1",
      exactLayerDisposition: "not-applicable",
      rationale: "Selected safe-card /108, practice /questions/30, and lesson /lessons/30 contain no diagram, illustration, image, asset, coordinate, formula-overlay, SVG, Plotly, or deterministic exact-layer fields; Shadow v1 maps text and metadata only."
    },
    A25: {
      contractVersion: "promotion-a25-release-intake.v1",
      evidencePhase: "preflight-observation",
      selectedCandidateSource: {
        branch: "codex/a23-promotion-shadow-v1-20260825",
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        pathspecs: manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
        allTracked: true,
        stagedChangeCount: 0,
        unstagedChangeCount: 0,
        untrackedChangeCount: 0,
        selectedPathspecClean: true
      },
      a23ImplementationWorktree: {
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        clean: false,
        statusSha256: "1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1",
        statusEntryCount: 6,
        untrackedPaths: [
          "coordination/integration/promotion-gate-lib.mjs",
          "coordination/integration/promotion-gate.mjs",
          "coordination/integration/promotion-gate.test.mjs",
          "coordination/integration/schemas/promotion-manifest.v1.schema.json",
          "coordination/integration/schemas/promotion-receipt.v1.schema.json",
          "coordination/session-logs/2026-08-25-A23-promotion-shadow-v1.md"
        ],
        wholeWorktreeReleaseSourceEligible: false
      },
      primaryRootStrictGate: {
        observedAt: "2026-08-24T17:25:23.195Z",
        branch: "codex/edulab-mais",
        headCommit: "a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6",
        statusSignature: "48c14842fbbe976ca2471df3ee14233705aeaffb919e7edc60f95269834c7bc1",
        statusSha256: "3a423cca663282895e47341ca316d0eea356d1e2b517310e5e92bc0165fa2f67",
        collapsedStatusEntries: 52,
        expandedStatusEntries: 106,
        trackedModified: 2,
        untrackedFiles: 104,
        strictUnmappedEntries: 56,
        ambiguousOwnerEntries: 0,
        secretQuarantineEntries: 0,
        assertCommand: ["npm", "run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60", "--json"],
        exitCode: 1,
        result: "fail",
        reasonCode: "strict-unmapped-owner-entries",
        rootReleaseFrozen: true,
        releaseSourceEligible: false
      },
      reviewPackageDisposition: "candidate-only-shadow-review",
      releaseDisposition: "blocked-until-committed-clean-worktree"
    }
  };
  return payloadByRole[role];
}

function validateRoleSemanticPayload(evidence, manifest) {
  const code = `${evidence.role}_SEMANTICS_INVALID`;
  if (evidence.result === "not_applicable") {
    if (evidence.role !== "A24") {
      throw new PromotionGateError("NOT_APPLICABLE_ROLE_INVALID", "Only A24 exact-layer evidence may be not_applicable.");
    }
    if (
      typeof evidence.semanticPayload.rationale !== "string" ||
      evidence.semanticPayload.rationale.trim() === ""
    ) {
      throw new PromotionGateError("A24_RATIONALE_REQUIRED", "A24 not_applicable evidence requires a nonempty rationale.");
    }
    try {
      assertExactKeys(
        evidence.semanticPayload,
        ["contractVersion", "exactLayerDisposition", "rationale"],
        "A24 semanticPayload"
      );
    } catch (error) {
      throw new PromotionGateError(code, "A24 semanticPayload does not match the exact-layer v1 contract.");
    }
    if (
      evidence.semanticPayload.contractVersion !== "promotion-a24-exact-layer.v1" ||
      evidence.semanticPayload.exactLayerDisposition !== "not-applicable"
    ) {
      throw new PromotionGateError(code, "A24 semanticPayload does not match the exact-layer v1 contract.");
    }
    return;
  }

  if (evidence.role === "A24") {
    throw new PromotionGateError(
      "A24_SEMANTICS_INVALID",
      "A24 must use not_applicable for this exact-layer-empty pilot selection."
    );
  }

  const expected = expectedRoleSemanticPayload(evidence.role, manifest);
  if (stableJson(evidence.semanticPayload) !== stableJson(expected)) {
    throw new PromotionGateError(
      code,
      `${evidence.role} semanticPayload does not match its versioned Promotion Gate v1 contract.`
    );
  }
}

export function validatePromotionEvidence(evidence, { manifest, binding, rawBytes } = {}) {
  assertNoExecutableKeys(evidence);
  assertExactKeys(
    evidence,
    [
      "schemaVersion",
      "evidenceId",
      "role",
      "result",
      "producedAt",
      "candidateDigest",
      "sourceCommit",
      "targetBaselineCommit",
      "checkerVersion",
      "semanticPayload"
    ],
    "promotion evidence"
  );
  if (evidence.schemaVersion !== PROMOTION_EVIDENCE_SCHEMA_VERSION) {
    throw new PromotionGateError("EVIDENCE_SCHEMA_UNSUPPORTED", "Unsupported promotion evidence schema version.");
  }
  assertNonEmptyString(evidence.evidenceId, "evidenceId");
  if (!REQUIRED_OWNER_ROLES.includes(evidence.role)) {
    throw new PromotionGateError("EVIDENCE_ROLE_INVALID", "Evidence role is not part of the v1 owner set.");
  }
  if (evidence.result !== "pass" && evidence.result !== "not_applicable") {
    throw new PromotionGateError("EVIDENCE_RESULT_INVALID", "Evidence result must be pass or not_applicable.");
  }
  parseCanonicalTimestamp(evidence.producedAt, "EVIDENCE_TIME_INVALID", "Evidence producedAt");
  assertSha256(evidence.candidateDigest, "evidence.candidateDigest");
  if (!/^[a-f0-9]{40}$/u.test(evidence.sourceCommit) || !/^[a-f0-9]{40}$/u.test(evidence.targetBaselineCommit)) {
    throw new PromotionGateError("EVIDENCE_CURRENTNESS_MISMATCH", "Evidence commit bindings are invalid.");
  }
  if (evidence.checkerVersion !== PROMOTION_CHECKER_VERSION) {
    throw new PromotionGateError(
      "EVIDENCE_CURRENTNESS_MISMATCH",
      "Evidence checkerVersion is not current.",
      { role: evidence.role, staleBindings: ["checkerVersion"] },
      "blocked"
    );
  }
  if (
    evidence.semanticPayload === null ||
    typeof evidence.semanticPayload !== "object" ||
    Array.isArray(evidence.semanticPayload) ||
    (Object.getPrototypeOf(evidence.semanticPayload) !== Object.prototype && Object.getPrototypeOf(evidence.semanticPayload) !== null)
  ) {
    throw new PromotionGateError("EVIDENCE_SEMANTIC_PAYLOAD_INVALID", "Evidence semanticPayload must be a plain object.");
  }
  stableJson(evidence.semanticPayload);
  validateRoleSemanticPayload(evidence, manifest);

  if (manifest) {
    const staleBindings = [
      ["candidateDigest", evidence.candidateDigest, manifest.candidateDigest],
      ["sourceCommit", evidence.sourceCommit, manifest.sourceCommit],
      ["targetBaselineCommit", evidence.targetBaselineCommit, manifest.targetBaselineCommit],
      ["checkerVersion", evidence.checkerVersion, manifest.checkerVersion]
    ].filter(([, actual, expected]) => actual !== expected).map(([field]) => field);
    if (staleBindings.length > 0) {
      throw new PromotionGateError(
        "EVIDENCE_CURRENTNESS_MISMATCH",
        "Evidence does not match the candidate, source, baseline, or checker bindings.",
        { role: evidence.role, staleBindings },
        "blocked"
      );
    }
  }
  if (binding) {
    if (binding.role !== evidence.role || EVIDENCE_KIND_BY_ROLE[evidence.role] !== binding.kind) {
      throw new PromotionGateError("EVIDENCE_BINDING_MISMATCH", "Evidence role or kind does not match its binding.");
    }
    if (fingerprint(evidence.semanticPayload) !== binding.semanticSha256) {
      throw new PromotionGateError("EVIDENCE_SEMANTIC_DIGEST_MISMATCH", "Evidence semantic digest does not match its binding.");
    }
    if (!Buffer.isBuffer(rawBytes) || sha256(rawBytes) !== binding.rawSha256) {
      throw new PromotionGateError("EVIDENCE_RAW_DIGEST_MISMATCH", "Evidence raw digest does not match its binding.");
    }
  }

  return { evidence, trustBoundary: TRUST_BOUNDARY };
}

export async function loadCandidateRecords(repoRoot, manifest) {
  validatePromotionManifest(manifest);
  const records = {};
  const sourceDigests = {};
  const actualArtifacts = [];
  const inventoryEntries = [];
  const inventoryContracts = {
    "safe-card": { containerPointer: "", expectedCount: 146, selectedIndex: 108 },
    practice: { containerPointer: "/questions", expectedCount: 68, selectedIndex: 30 },
    lesson: { containerPointer: "/lessons", expectedCount: 68, selectedIndex: 30 }
  };
  for (const artifact of manifest.candidateArtifacts) {
    const loaded = await readAuthoritativeFile(repoRoot, artifact.path);
    if (loaded.rawSha256 !== artifact.rawFileSha256) {
      throw new PromotionGateError(
        "CANDIDATE_RAW_DIGEST_MISMATCH",
        `Candidate artifact raw digest mismatch for "${artifact.id}".`
      );
    }
    let document;
    try {
      document = parseCanonicalJsonBytes(loaded.bytes, "CANDIDATE_JSON_INVALID", "Candidate artifact");
    } catch {
      throw new PromotionGateError("CANDIDATE_JSON_INVALID", `Candidate artifact "${artifact.id}" is not valid JSON.`);
    }
    const record = extractJsonPointer(document, artifact.jsonPointer);
    if (!isPlainObject(record) || record.id !== artifact.id) {
      throw new PromotionGateError(
        "CANDIDATE_RECORD_ID_MISMATCH",
        `Candidate record id does not match manifest artifact "${artifact.id}".`
      );
    }
    const inventoryContract = inventoryContracts[artifact.kind];
    const container = inventoryContract.containerPointer === ""
      ? document
      : extractJsonPointer(document, inventoryContract.containerPointer);
    if (!Array.isArray(container) || container.length !== inventoryContract.expectedCount) {
      throw new PromotionGateError(
        "CANDIDATE_INVENTORY_COUNT_MISMATCH",
        `Candidate ${artifact.kind} container must contain exactly ${inventoryContract.expectedCount} records.`
      );
    }
    const ids = [];
    const exactIds = new Set();
    const foldedIds = new Set();
    let selectedOccurrenceCount = 0;
    let selectedIndex = -1;
    for (const [index, candidateRecord] of container.entries()) {
      if (!isPlainObject(candidateRecord) || typeof candidateRecord.id !== "string" || candidateRecord.id.trim() === "") {
        throw new PromotionGateError(
          "CANDIDATE_INVENTORY_RECORD_INVALID",
          `Candidate ${artifact.kind} inventory contains a record without a stable id.`
        );
      }
      const foldedId = candidateRecord.id.toLocaleLowerCase("en-US");
      if (exactIds.has(candidateRecord.id) || foldedIds.has(foldedId)) {
        throw new PromotionGateError(
          "CANDIDATE_INVENTORY_DUPLICATE_ID",
          `Candidate ${artifact.kind} inventory contains a duplicate or case-colliding id.`
        );
      }
      exactIds.add(candidateRecord.id);
      foldedIds.add(foldedId);
      ids.push(candidateRecord.id);
      if (candidateRecord.id === artifact.id) {
        selectedOccurrenceCount += 1;
        selectedIndex = index;
      }
    }
    if (
      selectedOccurrenceCount !== 1 ||
      selectedIndex !== inventoryContract.selectedIndex ||
      artifact.jsonPointer !== `${inventoryContract.containerPointer}/${inventoryContract.selectedIndex}`
    ) {
      throw new PromotionGateError(
        "CANDIDATE_SELECTED_ID_LOCATION_MISMATCH",
        `Candidate ${artifact.kind} selected id must occur exactly once at its frozen JSON Pointer.`
      );
    }
    const recordSha256 = fingerprint(record);
    if (recordSha256 !== artifact.recordSha256) {
      throw new PromotionGateError(
        "CANDIDATE_RECORD_DIGEST_MISMATCH",
        `Candidate artifact record digest mismatch for "${artifact.id}".`
      );
    }
    records[artifact.kind] = record;
    sourceDigests[artifact.path] = loaded.rawSha256;
    actualArtifacts.push({ kind: artifact.kind, id: artifact.id, recordSha256 });
    inventoryEntries.push({
      kind: artifact.kind,
      path: artifact.path,
      containerPointer: inventoryContract.containerPointer,
      recordCount: container.length,
      idSetDigest: fingerprint([...ids].sort(codePointCompare)),
      selectedId: artifact.id,
      selectedOccurrenceCount,
      selectedIndex
    });
  }
  if (computeCandidateDigest(actualArtifacts) !== manifest.candidateDigest) {
    throw new PromotionGateError("CANDIDATE_DIGEST_MISMATCH", "Loaded candidate records do not match candidateDigest.");
  }
  const inventoryPayload = {
    schemaVersion: "promotion-candidate-inventory-proof.v1",
    entries: inventoryEntries
  };
  return {
    records,
    sourceDigests,
    inventoryProof: { ...inventoryPayload, aggregateDigest: fingerprint(inventoryPayload) }
  };
}

export function validatePromotionEvidenceIndex(index, manifest) {
  validatePromotionManifest(manifest);
  assertExactKeys(index, [
    "schemaVersion",
    "gateId",
    "pilotUnitId",
    "attemptId",
    "candidateDigest",
    "sourceCommit",
    "targetBaselineCommit",
    "checkerVersion",
    "entries",
    "entriesDigest"
  ], "promotion evidence index");
  if (
    index.schemaVersion !== "promotion-evidence-index.v1" ||
    index.gateId !== manifest.gateId ||
    index.pilotUnitId !== manifest.pilotUnitId ||
    index.attemptId !== manifest.attemptId ||
    index.candidateDigest !== manifest.candidateDigest ||
    index.sourceCommit !== manifest.sourceCommit ||
    index.targetBaselineCommit !== manifest.targetBaselineCommit ||
    index.checkerVersion !== manifest.checkerVersion ||
    stableJson(index.entries) !== stableJson(manifest.evidenceBindings) ||
    index.entriesDigest !== fingerprint(index.entries)
  ) {
    throw new PromotionGateError(
      "EVIDENCE_INDEX_MISMATCH",
      "Evidence index does not bind the exact manifest, candidate, commits, checker, and nine owner evidence records."
    );
  }
  return index;
}

async function collectEvidenceReviewCommitProof(repoRoot, manifest, executionCommit) {
  if (!/^[a-f0-9]{40}$/u.test(executionCommit)) {
    throw new PromotionGateError(
      "EVIDENCE_REVIEW_EXECUTION_INVALID",
      "Evidence review currentness requires the exact execution commit.",
      {},
      "blocked"
    );
  }
  const canonicalRoot = await realpath(repoRoot);
  const entries = [];
  for (const binding of manifest.evidenceBindings) {
    try {
      await runRegisteredGitProbe(canonicalRoot, ["cat-file", "-e", `${binding.reviewedCommit}^{commit}`]);
    } catch {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_COMMIT_MISSING",
        "An owner evidence reviewedCommit does not exist in the execution repository.",
        { role: binding.role },
        "blocked"
      );
    }
    try {
      await runRegisteredGitProbe(
        canonicalRoot,
        ["merge-base", "--is-ancestor", binding.reviewedCommit, executionCommit]
      );
    } catch {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_COMMIT_NOT_ANCESTOR",
        "An owner evidence reviewedCommit is not an ancestor of execution HEAD.",
        { role: binding.role },
        "blocked"
      );
    }
    let reviewedBytes;
    try {
      reviewedBytes = await runRegisteredGitProbe(
        canonicalRoot,
        ["show", "--no-textconv", `${binding.reviewedCommit}:${binding.path}`]
      );
    } catch {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_BLOB_MISSING",
        "An owner evidence file is absent from its reviewedCommit.",
        { role: binding.role },
        "blocked"
      );
    }
    const reviewedRawSha256 = sha256(reviewedBytes);
    if (reviewedRawSha256 !== binding.rawSha256) {
      throw new PromotionGateError(
        "EVIDENCE_REVIEW_BLOB_MISMATCH",
        "Owner evidence bytes differ from the exact reviewedCommit blob.",
        { role: binding.role },
        "blocked"
      );
    }
    entries.push({
      role: binding.role,
      reviewedCommit: binding.reviewedCommit,
      path: binding.path,
      rawSha256: reviewedRawSha256
    });
  }
  return {
    reviewedCommitCount: entries.length,
    reviewedCommitsDigest: fingerprint(entries)
  };
}

export async function loadEvidenceRecords(repoRoot, manifest, executionCommit) {
  validatePromotionManifest(manifest);
  const reviewCommitProof = await collectEvidenceReviewCommitProof(
    repoRoot,
    manifest,
    executionCommit
  );
  const loadedIndex = await readAuthoritativeFile(repoRoot, manifest.evidenceIndex.path);
  if (loadedIndex.rawSha256 !== manifest.evidenceIndex.rawSha256) {
    throw new PromotionGateError("EVIDENCE_INDEX_DIGEST_MISMATCH", "Evidence index bytes do not match the manifest binding.");
  }
  let evidenceIndex;
  try {
    evidenceIndex = parseCanonicalJsonBytes(
      loadedIndex.bytes,
      "EVIDENCE_INDEX_JSON_INVALID",
      "Evidence index"
    );
  } catch {
    throw new PromotionGateError("EVIDENCE_INDEX_JSON_INVALID", "Evidence index is not valid JSON.");
  }
  validatePromotionEvidenceIndex(evidenceIndex, manifest);
  const byRole = {};
  const sourceDigests = {};
  const evidenceIds = new Set();
  for (const binding of manifest.evidenceBindings) {
    let loaded;
    try {
      loaded = await readAuthoritativeFile(repoRoot, binding.path);
    } catch (error) {
      if (error?.code === "AUTHORITATIVE_PATH_MISSING") {
        throw new PromotionGateError(
          "EVIDENCE_UNAVAILABLE",
          `Required evidence for role "${binding.role}" is unavailable.`,
          { role: binding.role, path: binding.path },
          "blocked"
        );
      }
      throw error;
    }
    let evidence;
    try {
      evidence = parseCanonicalJsonBytes(loaded.bytes, "EVIDENCE_JSON_INVALID", "Promotion evidence");
    } catch {
      throw new PromotionGateError("EVIDENCE_JSON_INVALID", `Evidence for role "${binding.role}" is not valid JSON.`);
    }
    validatePromotionEvidence(evidence, { manifest, binding, rawBytes: loaded.bytes });
    const foldedId = evidence.evidenceId.toLocaleLowerCase("en-US");
    if (evidenceIds.has(foldedId)) {
      throw new PromotionGateError("DUPLICATE_EVIDENCE_ID", `Duplicate or case-colliding evidenceId "${evidence.evidenceId}".`);
    }
    evidenceIds.add(foldedId);
    byRole[evidence.role] = evidence;
    sourceDigests[binding.path] = loaded.rawSha256;
  }
  if (Object.keys(byRole).length !== REQUIRED_OWNER_ROLES.length) {
    throw new PromotionGateError("EVIDENCE_ROLE_SET_INVALID", "Loaded evidence does not cover the exact owner role set.");
  }
  return {
    byRole,
    sourceDigests,
    trustBoundary: TRUST_BOUNDARY,
    indexProof: {
      path: manifest.evidenceIndex.path,
      rawSha256: loadedIndex.rawSha256,
      entryCount: evidenceIndex.entries.length,
      entriesDigest: evidenceIndex.entriesDigest,
      reviewedCommitCount: reviewCommitProof.reviewedCommitCount,
      reviewedCommitsDigest: reviewCommitProof.reviewedCommitsDigest
    }
  };
}

function containsOwnKey(value, searchedKey) {
  if (value === null || typeof value !== "object") return false;
  if (Object.hasOwn(value, searchedKey)) return true;
  return Object.values(value).some((entry) => containsOwnKey(entry, searchedKey));
}

function containsAnyOwnKey(value, searchedKeys) {
  return [...searchedKeys].some((searchedKey) => containsOwnKey(value, searchedKey));
}

function canonicalEquals(left, right) {
  try {
    return stableJson(left) === stableJson(right);
  } catch {
    return false;
  }
}

const EXACT_LAYER_KEY_NAMES = new Set([
  "asset",
  "assets",
  "coordinate",
  "coordinates",
  "diagram",
  "diagrams",
  "exactlayer",
  "formulaoverlay",
  "illustration",
  "illustrations",
  "image",
  "images",
  "plotly",
  "svg"
]);

function findExactLayerFieldPaths(value, currentPath = "") {
  if (value === null || typeof value !== "object") return [];
  const matches = [];
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLocaleLowerCase("en-US").replace(/[-_\s]/gu, "");
    const fieldPath = `${currentPath}/${key}`;
    if (EXACT_LAYER_KEY_NAMES.has(normalizedKey)) matches.push(fieldPath);
    matches.push(...findExactLayerFieldPaths(entry, fieldPath));
  }
  return matches;
}

export function validateEvidenceCandidateSemantics(manifest, records, evidenceByRole) {
  validatePromotionManifest(manifest);
  if (!isPlainObject(records) || !isPlainObject(evidenceByRole)) {
    throw new PromotionGateError(
      "EVIDENCE_RECORD_CONTEXT_INVALID",
      "Evidence-to-record validation requires loaded record and owner maps."
    );
  }
  for (const role of REQUIRED_OWNER_ROLES) {
    const evidence = evidenceByRole[role];
    if (!evidence || evidence.role !== role) {
      throw new PromotionGateError(`${role}_SEMANTICS_INVALID`, `Missing bound ${role} semantic evidence.`);
    }
    validateRoleSemanticPayload(evidence, manifest);
  }

  const a21Artifacts = evidenceByRole.A21.semanticPayload.artifacts;
  for (const declared of a21Artifacts) {
    const artifact = manifest.candidateArtifacts.find(({ kind }) => kind === declared.kind);
    const record = records[declared.kind];
    if (
      !artifact ||
      !isPlainObject(record) ||
      record.id !== artifact.id ||
      readDottedRecordField(record, declared.parentBindingField) !== declared.parentBindingValue ||
      readDottedRecordField(record, declared.candidateStateField) !== declared.candidateStateValue
    ) {
      throw new PromotionGateError(
        "A21_RECORD_BINDING_MISMATCH",
        `A21 ${declared.kind} parent/candidate-state declaration does not match the selected record.`
      );
    }
  }

  const exactLayerPaths = Object.entries(records).flatMap(([kind, record]) =>
    findExactLayerFieldPaths(record, kind)
  );
  if (exactLayerPaths.length > 0) {
    throw new PromotionGateError(
      "A24_EXACT_LAYER_PRESENT",
      "A24 not_applicable is invalid because a selected record contains an exact-layer field.",
      { exactLayerPaths }
    );
  }

  const exactCanonicalStandards = ["6.RP.1", "6.RP.2", "6.RP.3"];
  const exactMaisStandards = [
    "CA.CCSS.Math.G6.RP.1",
    "CA.CCSS.Math.G6.RP.2",
    "CA.CCSS.Math.G6.RP.3"
  ];
  const exactMisconceptions = ["ratio order reversed", "unit rate not normalized"];
  const safeCard = records["safe-card"];
  const practice = records.practice;
  const lesson = records.lesson;
  for (const kind of ["safe-card", "practice", "lesson"]) {
    if (stableJson(records[kind]?.canonicalStandardIds) !== stableJson(exactCanonicalStandards)) {
      throw new PromotionGateError(
        "A18_RECORD_SEMANTICS_MISMATCH",
        `A18 evidence does not match the exact ${kind} 6.RP.1/.2/.3 standards record.`
      );
    }
  }

  if (
    safeCard?.curriculumTrack !== "US_CA_MATH" ||
    safeCard?.state !== "CA" ||
    safeCard?.maisGrade !== "P6" ||
    safeCard?.clusterId !== "6.RP.ratios" ||
    !canonicalEquals(safeCard?.domainIds, ["6.RP"]) ||
    !canonicalEquals(safeCard?.maisStandardIds, exactMaisStandards) ||
    !canonicalEquals(safeCard?.misconceptionTags, exactMisconceptions) ||
    !canonicalEquals(safeCard?.bilingualTerminologyNotes, [])
  ) {
    throw new PromotionGateError(
      "A18_RECORD_SEMANTICS_MISMATCH",
      "A18 evidence does not match the exact safe-card grade, domain, cluster, standards, misconception, and localization contract."
    );
  }
  for (const [kind, record] of [["practice", practice], ["lesson", lesson]]) {
    if (
      record?.curriculumTrack !== "US_CA_MATH" ||
      record?.state !== "CA" ||
      record?.grade !== "P6" ||
      record?.domainId !== "6.RP" ||
      record?.clusterId !== "6.RP.ratios" ||
      !canonicalEquals(record?.standardIds, exactMaisStandards) ||
      !canonicalEquals(record?.maisStandardIds, exactMaisStandards) ||
      !canonicalEquals(record?.evidenceCardIds, [safeCard?.id])
    ) {
      throw new PromotionGateError(
        "A18_RECORD_SEMANTICS_MISMATCH",
        `A18 evidence does not match the exact ${kind} grade, domain, cluster, standards, and safe-card link.`
      );
    }
  }

  const exactCandidateSourceIds = [
    "california-math-common-core-skill",
    "cde-ca-ccss-math-resources",
    "common-core-state-standards-public-license",
    "ixl-california-math-standards-navigation-only"
  ];
  if (
    !canonicalEquals(safeCard?.evidenceScope?.sourceIds, exactCandidateSourceIds) ||
    !canonicalEquals(practice?.sourceIds, exactCandidateSourceIds) ||
    !canonicalEquals(lesson?.sourceIds, exactCandidateSourceIds)
  ) {
    throw new PromotionGateError(
      "A18_RECORD_SEMANTICS_MISMATCH",
      "A18 evidence does not match the four candidate source ids and their unresolved live bindings."
    );
  }
  if (
    practice?.prompt?.en !==
      "A recipe uses 3 cups of oats for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of oats are needed?" ||
    practice?.answer !== "12 cups" ||
    !canonicalEquals(practice?.acceptedAnswers, ["12", "12 cups"]) ||
    practice?.answerKey?.correctAnswer !== "12 cups" ||
    !canonicalEquals(practice?.answerKey?.acceptedAnswers, ["12", "12 cups"]) ||
    !canonicalEquals(practice?.answerKey?.solutionSteps, [practice?.explanation?.en]) ||
    practice?.answerKey?.validationMethod !== "computed-equivalent-ratio" ||
    practice?.independentAnswer !== "12 cups" ||
    practice?.independentSolution !== practice?.explanation?.en ||
    typeof practice?.explanation?.en !== "string" ||
    !practice.explanation.en.includes("5 x 4 = 20") ||
    !practice.explanation.en.includes("3 x 4 = 12")
  ) {
    throw new PromotionGateError(
      "A04_RECORD_SEMANTICS_MISMATCH",
      "A04 evidence does not match the exact 3:5 to 20 practice oracle and accepted-answer contract."
    );
  }
  if (
    practice?.languageMode !== "en" ||
    containsAnyOwnKey(practice, new Set(["zh", "zhHans", "zh-Hans"]))
  ) {
    throw new PromotionGateError(
      "A04_RECORD_SEMANTICS_MISMATCH",
      "A04 evidence does not match the explicit English-only practice localization boundary."
    );
  }
  if (practice?.studentContent?.misconceptionFeedback?.en !== "ratio order reversed") {
    throw new PromotionGateError(
      "A18_RECORD_SEMANTICS_MISMATCH",
      "A18 evidence does not match the selected practice misconception-feedback live blocker."
    );
  }

  const lessonModule = lesson?.lessonModule;
  if (
    typeof lessonModule?.conceptExplanation !== "string" ||
    !lessonModule.conceptExplanation.includes("double number lines and ratio tables becomes")
  ) {
    throw new PromotionGateError(
      "A18_RECORD_SEMANTICS_MISMATCH",
      "A18 evidence no longer matches the frozen known-grammar live blocker."
    );
  }
  const lessonSequence = [
    "objective",
    "workedExample",
    "guidedPractice",
    "independentPractice",
    "remediation"
  ];
  if (
    lesson?.languageMode !== "en" ||
    !isPlainObject(lessonModule) ||
    lessonSequence.some((field) => !Object.hasOwn(lessonModule, field)) ||
    typeof lessonModule.objective !== "string" ||
    !isPlainObject(lessonModule.workedExample) ||
    !isPlainObject(lessonModule.guidedPractice) ||
    !isPlainObject(lessonModule.independentPractice) ||
    !isPlainObject(lessonModule.remediation) ||
    containsAnyOwnKey(lesson, new Set(["zh", "zhHans", "zh-Hans"]))
  ) {
    throw new PromotionGateError(
      "A05_RECORD_SEMANTICS_MISMATCH",
      "A05 evidence does not match the nested lesson sequence, remediation, or no-invented-bilingual contract."
    );
  }
  if (
    lessonModule.workedExample.prompt !== practice.prompt.en ||
    lessonModule.workedExample.answer !== practice.answer ||
    lessonModule.workedExample.reasoning !== practice.explanation.en ||
    !canonicalEquals(lesson.metadata?.misconceptionTargets, exactMisconceptions) ||
    lessonModule.remediation.targetMisconception !== "ratio order reversed"
  ) {
    throw new PromotionGateError(
      "A05_RECORD_SEMANTICS_MISMATCH",
      "A05 evidence does not match the practice-bound worked example, misconception targets, and remediation target."
    );
  }
  const openEndedForbiddenKeys = new Set([
    "answer", "acceptedAnswer", "acceptedAnswers", "answerKey", "correctAnswer", "rubric"
  ]);
  if (
    containsAnyOwnKey(lessonModule.guidedPractice, openEndedForbiddenKeys) ||
    containsAnyOwnKey(lessonModule.independentPractice, openEndedForbiddenKeys)
  ) {
    throw new PromotionGateError(
      "A05_RECORD_SEMANTICS_MISMATCH",
      "A05 evidence requires the guided and independent prompts to remain explicitly blocked for live by missing answers and rubrics."
    );
  }
  return true;
}

export async function validatePriorS18ReviewDrift(repoRoot, records, evidenceByRole) {
  const declared = evidenceByRole?.A18?.semanticPayload?.priorReviewDrift;
  if (
    !isPlainObject(declared) ||
    declared.path !== PRIOR_S18_REVIEW_PATH ||
    declared.rawSha256 !== PRIOR_S18_REVIEW_RAW_SHA256
  ) {
    throw new PromotionGateError(
      "A18_PRIOR_REVIEW_BINDING_MISMATCH",
      "A18 prior-review drift evidence does not bind the frozen source review."
    );
  }
  const loaded = await readAuthoritativeFile(repoRoot, declared.path);
  if (loaded.rawSha256 !== declared.rawSha256) {
    throw new PromotionGateError(
      "A18_PRIOR_REVIEW_BINDING_MISMATCH",
      "The frozen prior S18 review bytes no longer match A18 evidence."
    );
  }
  const source = decodeCanonicalUtf8(
    loaded.bytes,
    "A18_PRIOR_REVIEW_UTF8_INVALID",
    "Prior S18 review"
  );
  const expectedAnchor =
    "| `s05-ca-rag-v2-lesson-031-6-rp-ratios` | P6 | `6.RP.ratios` | Worked example matches the validated ratio question; remediation targets additive-vs-multiplicative confusion. | Pass for review |";
  const normalizedLines = source.replace(/\r\n?/gu, "\n").split("\n").map((line) => line.trim());
  if (normalizedLines.filter((line) => line === expectedAnchor).length !== 1) {
    throw new PromotionGateError(
      "A18_PRIOR_REVIEW_ANCHOR_MISMATCH",
      "The prior S18 review no longer contains the one exact selected-record claim."
    );
  }
  if (
    declared.recordedClaim !== "additive-vs-multiplicative confusion" ||
    declared.actualRemediationTarget !== records?.lesson?.lessonModule?.remediation?.targetMisconception ||
    declared.actualRemediationTarget !== "ratio order reversed" ||
    declared.matchesSelectedRecord !== false ||
    declared.mustBeSupersededBeforeLive !== true
  ) {
    throw new PromotionGateError(
      "A18_PRIOR_REVIEW_DRIFT_MISMATCH",
      "A18 prior-review drift evidence does not match the selected lesson remediation."
    );
  }
  return {
    path: declared.path,
    rawSha256: loaded.rawSha256,
    anchorDigest: fingerprint(expectedAnchor),
    matchesSelectedRecord: false
  };
}

function readDottedRecordField(record, dottedField) {
  if (typeof dottedField !== "string" || dottedField === "" || dottedField.split(".").some((segment) => segment === "")) {
    return undefined;
  }
  let value = record;
  for (const segment of dottedField.split(".")) {
    if (!isPlainObject(value) || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

export function evaluateAcceptedAnswer(
  submittedAnswer,
  acceptedAnswers,
  policy = "exact-trimmed-forms-v1"
) {
  if (policy !== "exact-trimmed-forms-v1") {
    throw new PromotionGateError(
      "ACCEPTED_ANSWER_POLICY_INVALID",
      "Promotion Gate v1 only supports exact-trimmed-forms-v1."
    );
  }
  if (
    !Array.isArray(acceptedAnswers) ||
    acceptedAnswers.length === 0 ||
    acceptedAnswers.some((answer) => typeof answer !== "string" || answer.trim() === "") ||
    new Set(acceptedAnswers).size !== acceptedAnswers.length
  ) {
    throw new PromotionGateError(
      "ACCEPTED_ANSWER_FORMS_INVALID",
      "Accepted-answer forms must be distinct nonempty strings."
    );
  }
  if (typeof submittedAnswer !== "string") return false;
  return acceptedAnswers.includes(submittedAnswer.trim());
}

function assertRequiredRecordFields(record, fields, label) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new PromotionGateError("MAPPING_COMPATIBILITY_FAILED", `${label} candidate must be a plain object.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) {
      throw new PromotionGateError(
        "MAPPING_COMPATIBILITY_FAILED",
        `${label} candidate is missing required field "${field}".`
      );
    }
  }
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.trim() !== "");
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function buildTopLevelPreservation(record, mappedFields) {
  const mappedSet = new Set(mappedFields);
  const preservedOutsideRuntimeFields = Object.keys(record)
    .filter((field) => !mappedSet.has(field))
    .sort(codePointCompare);
  const topLevel = Object.fromEntries(
    preservedOutsideRuntimeFields.map((field) => [field, cloneCanonical(record[field])])
  );
  const projection = {
    mappedFields: [...mappedFields],
    preservedOutsideRuntimeFields,
    unaccountedFields: [],
    preservedOutsideRuntime: topLevel
  };
  return {
    preservedOutsideRuntime: {
      disposition: "preserved-outside-runtime",
      topLevel
    },
    compatibility: {
      mappedFields: projection.mappedFields,
      preservedOutsideRuntimeFields,
      unaccountedFields: [],
      preservationDigest: fingerprint(projection)
    }
  };
}

export function buildShadowDtos(records, evidenceByRole) {
  assertRequiredRecordFields(records?.["safe-card"], [
    "cardKind",
    "id",
    "domainIds",
    "canonicalStandardIds",
    "maisStandardIds",
    "clusterId"
  ], "safe-card");
  assertRequiredRecordFields(records?.practice, [
    "id",
    "prompt",
    "studentContent",
    "answer",
    "acceptedAnswers",
    "explanation",
    "standardIds",
    "canonicalStandardIds",
    "maisStandardIds"
  ], "practice");
  assertRequiredRecordFields(records?.lesson, [
    "id",
    "languageMode",
    "standardIds",
    "canonicalStandardIds",
    "maisStandardIds",
    "lessonModule"
  ], "lesson");

  const safeCard = records["safe-card"];
  const practice = records.practice;
  const lesson = records.lesson;
  if (
    safeCard.cardKind !== "cluster-safe-card-v2" ||
    typeof safeCard.id !== "string" ||
    safeCard.id.trim() === "" ||
    !isNonEmptyStringArray(safeCard.domainIds) ||
    !isNonEmptyStringArray(safeCard.canonicalStandardIds) ||
    !isNonEmptyStringArray(safeCard.maisStandardIds) ||
    typeof safeCard.clusterId !== "string" ||
    safeCard.clusterId.trim() === ""
  ) {
    throw new PromotionGateError(
      "MAPPING_COMPATIBILITY_FAILED",
      "safe-card candidate does not satisfy the cluster-safe-card-v2 mapping contract."
    );
  }
  const lessonModule = lesson.lessonModule;
  if (
    typeof practice.id !== "string" ||
    practice.id.trim() === "" ||
    typeof practice.answer !== "string" ||
    !isPlainObject(practice.prompt) ||
    typeof practice.prompt.en !== "string" ||
    !isPlainObject(practice.studentContent) ||
    !isPlainObject(practice.studentContent.misconceptionFeedback) ||
    typeof practice.studentContent.misconceptionFeedback.en !== "string" ||
    !isPlainObject(practice.explanation) ||
    typeof practice.explanation.en !== "string" ||
    practice.explanation.en.trim() === "" ||
    !isNonEmptyStringArray(practice.standardIds) ||
    !isNonEmptyStringArray(practice.canonicalStandardIds) ||
    !isNonEmptyStringArray(practice.maisStandardIds) ||
    typeof lesson.id !== "string" ||
    lesson.id.trim() === "" ||
    lesson.languageMode !== "en" ||
    !isNonEmptyStringArray(lesson.standardIds) ||
    !isNonEmptyStringArray(lesson.canonicalStandardIds) ||
    !isNonEmptyStringArray(lesson.maisStandardIds) ||
    !isPlainObject(lessonModule) ||
    typeof lessonModule.objective !== "string" ||
    lessonModule.objective.trim() === "" ||
    !isPlainObject(lessonModule.workedExample) ||
    !isPlainObject(lessonModule.guidedPractice) ||
    !isPlainObject(lessonModule.independentPractice) ||
    !isPlainObject(lessonModule.remediation)
  ) {
    throw new PromotionGateError(
      "MAPPING_COMPATIBILITY_FAILED",
      "Practice or lesson candidate does not satisfy its preservation mapping contract."
    );
  }
  const a04 = evidenceByRole?.A04?.semanticPayload;
  const a18 = evidenceByRole?.A18?.semanticPayload;
  const a18Standards = a18?.standards;
  const a05 = evidenceByRole?.A05?.semanticPayload;
  if (
    a04?.numericOracle !== 12 ||
    a04?.practiceId !== practice.id ||
    stableJson(a04?.acceptedAnswers) !== stableJson(["12", "12 cups"]) ||
    a04?.primaryStandardId !== "6.RP.3" ||
    a04?.liveStandardAlias !== "6.RP.A.3" ||
    a04?.liveAliasStatus !== "unverified-incompatible-preserved-outside-runtime" ||
    a04?.acceptedAnswerPolicy !== "exact-trimmed-forms-v1" ||
    stableJson(a18Standards?.declaredCluster) !== stableJson(["6.RP.1", "6.RP.2", "6.RP.3"]) ||
    stableJson(a18Standards?.directlyAssessed) !== stableJson(["6.RP.3"]) ||
    stableJson(a18Standards?.embeddedPrerequisite) !== stableJson(["6.RP.1"]) ||
    stableJson(a18Standards?.notDemonstrated) !== stableJson(["6.RP.2"]) ||
    a18Standards?.liveMappingStatus !== "unverified-incompatible-preserved-outside-runtime" ||
    practice.prompt.en !==
      "A recipe uses 3 cups of oats for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of oats are needed?" ||
    practice.answer !== "12 cups" ||
    !Array.isArray(practice.acceptedAnswers) ||
    stableJson(practice.acceptedAnswers) !== stableJson(a04.acceptedAnswers) ||
    !evaluateAcceptedAnswer(practice.answer, practice.acceptedAnswers, a04.acceptedAnswerPolicy) ||
    practice.studentContent.misconceptionFeedback.en !== "ratio order reversed" ||
    practice.explanation.en !==
      "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12." ||
    !practice.canonicalStandardIds.includes(a04.primaryStandardId)
  ) {
    throw new PromotionGateError(
      "MAPPING_COMPATIBILITY_FAILED",
      "Practice candidate does not preserve the A04-bound answer and standard semantics."
    );
  }

  if (
    a05?.lessonId !== lesson.id ||
    a05?.sourceContainer !== "lessonModule" ||
    a05?.languageMode !== lesson.languageMode ||
    lessonModule.workedExample.prompt !== practice.prompt.en ||
    lessonModule.workedExample.answer !== practice.answer ||
    lessonModule.workedExample.reasoning !== practice.explanation.en ||
    stableJson(lesson.metadata?.misconceptionTargets) !== stableJson(a05?.misconceptions?.metadataTargets) ||
    lessonModule.remediation.targetMisconception !== a05?.misconceptions?.remediationTarget
  ) {
    throw new PromotionGateError(
      "MAPPING_COMPATIBILITY_FAILED",
      "Lesson candidate does not preserve the A05-bound practice, misconception, and remediation semantics."
    );
  }

  const safeMappedFields = [
    "cardKind", "id", "domainIds", "canonicalStandardIds", "maisStandardIds", "clusterId"
  ];
  const practiceMappedFields = [
    "id", "prompt", "studentContent", "answer", "acceptedAnswers", "explanation",
    "standardIds", "canonicalStandardIds", "maisStandardIds"
  ];
  const lessonMappedFields = [
    "id", "languageMode", "standardIds", "canonicalStandardIds", "maisStandardIds", "lessonModule"
  ];
  const safePreservation = buildTopLevelPreservation(safeCard, safeMappedFields);
  const practicePreservation = buildTopLevelPreservation(practice, practiceMappedFields);
  const lessonPreservation = buildTopLevelPreservation(lesson, lessonMappedFields);
  const lessonModuleMappedFields = [...a05.shadowMappedSequence];
  const lessonModuleMappedSet = new Set(lessonModuleMappedFields);
  const lessonModulePreservedFields = Object.keys(lessonModule)
    .filter((field) => !lessonModuleMappedSet.has(field))
    .sort(codePointCompare);
  const preservedLessonModule = Object.fromEntries(
    lessonModulePreservedFields.map((field) => [field, cloneCanonical(lessonModule[field])])
  );
  const lessonPreservationDigest = fingerprint({
    topLevel: lessonPreservation.preservedOutsideRuntime.topLevel,
    lessonModule: preservedLessonModule,
    mappedFields: lessonMappedFields,
    lessonModuleMappedFields,
    lessonModulePreservedFields
  });

  return {
    "safe-card": {
      schemaVersion: "promotion-shadow-dto.v1",
      kind: "safe-card",
      id: safeCard.id,
      sourceCardKind: safeCard.cardKind,
      proposedRuntimeKind: "standards",
      domainIds: safeCard.domainIds,
      canonicalStandardIds: safeCard.canonicalStandardIds,
      maisStandardIds: safeCard.maisStandardIds,
      clusterId: safeCard.clusterId,
      liveMappingStatus: a18Standards.liveMappingStatus,
      preservedOutsideRuntime: safePreservation.preservedOutsideRuntime,
      mappingCompatibility: {
        status: "shadow-compatible-live-blocked",
        adapter: "cluster-safe-card-v2-to-standards-v1",
        ...safePreservation.compatibility
      }
    },
    practice: {
      schemaVersion: "promotion-shadow-dto.v1",
      kind: "practice",
      id: practice.id,
      prompt: cloneCanonical(practice.prompt),
      studentContent: cloneCanonical(practice.studentContent),
      answer: practice.answer,
      acceptedAnswers: practice.acceptedAnswers,
      acceptedAnswerPolicy: a04.acceptedAnswerPolicy,
      explanation: practice.explanation,
      standardIds: practice.standardIds,
      canonicalStandardIds: practice.canonicalStandardIds,
      maisStandardIds: practice.maisStandardIds,
      compatibilityMetadata: {
        ownerRole: "A04",
        numericOracle: a04.numericOracle,
        primaryStandardId: a04.primaryStandardId,
        liveStandardAlias: a04.liveStandardAlias,
        liveAliasStatus: a04.liveAliasStatus,
        declaredCluster: a18Standards.declaredCluster,
        directlyAssessed: a18Standards.directlyAssessed,
        embeddedPrerequisite: a18Standards.embeddedPrerequisite,
        notDemonstrated: a18Standards.notDemonstrated,
        compatibilityStatus: "shadow-compatible-live-blocked"
      },
      liveBlockers: cloneCanonical(a18.liveBlockers),
      preservedOutsideRuntime: practicePreservation.preservedOutsideRuntime,
      mappingCompatibility: {
        status: "shadow-compatible-live-blocked",
        adapter: "practice-record-to-shadow-v1",
        ...practicePreservation.compatibility
      }
    },
    lesson: {
      schemaVersion: "promotion-shadow-dto.v1",
      kind: "lesson",
      id: lesson.id,
      languageMode: lesson.languageMode,
      objective: lessonModule.objective,
      workedExample: lessonModule.workedExample,
      guidedPractice: lessonModule.guidedPractice,
      independentPractice: lessonModule.independentPractice,
      remediation: lessonModule.remediation,
      standardIds: lesson.standardIds,
      canonicalStandardIds: lesson.canonicalStandardIds,
      maisStandardIds: lesson.maisStandardIds,
      liveBlockers: cloneCanonical(a05.liveBlockers),
      preservedOutsideRuntime: {
        disposition: "preserved-outside-runtime",
        topLevel: lessonPreservation.preservedOutsideRuntime.topLevel,
        lessonModule: preservedLessonModule
      },
      mappingCompatibility: {
        status: "shadow-compatible-live-blocked",
        adapter: "nested-lesson-module-to-shadow-v1",
        sourceSequence: cloneCanonical(a05.sourceSequence),
        shadowMappedSequence: cloneCanonical(a05.shadowMappedSequence),
        ownerDeclaredOmittedFields: cloneCanonical(a05.shadowOmittedFields),
        additionalPreservedLessonModuleFields: lessonModulePreservedFields.filter(
          (field) => !a05.shadowOmittedFields.includes(field)
        ),
        mappedFields: lessonMappedFields,
        preservedOutsideRuntimeFields: lessonPreservation.compatibility.preservedOutsideRuntimeFields,
        lessonModuleMappedFields,
        lessonModulePreservedFields,
        unaccountedFields: [],
        preservationDigest: lessonPreservationDigest
      }
    }
  };
}

async function assertDirectoryPathSafe(repoRoot, relativePath) {
  assertSafeRepoRelativePath(relativePath);
  const canonicalRoot = await realpath(repoRoot);
  let candidatePath = canonicalRoot;
  for (const segment of relativePath.split("/")) {
    candidatePath = path.join(candidatePath, segment);
    let entry;
    try {
      entry = await lstat(candidatePath, { bigint: true });
    } catch {
      throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", `Unable to inspect snapshot path "${relativePath}".`);
    }
    if (entry.isSymbolicLink()) {
      throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", "Snapshot paths cannot contain symlinks.");
    }
  }
  const canonicalPath = await realpath(candidatePath);
  const relativeToRoot = path.relative(canonicalRoot, canonicalPath);
  if (
    relativeToRoot === "" ||
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", "Snapshot path resolves outside the repository root.");
  }
  return candidatePath;
}

export const SNAPSHOT_MAX_FILE_COUNT = 10_000;
export const SNAPSHOT_MAX_AGGREGATE_BYTES = 1024 * 1024 * 1024;

async function collectSnapshotFiles(repoRoot, relativePath, files, foldedPaths, bounds) {
  const absolutePath = await assertDirectoryPathSafe(repoRoot, relativePath);
  const entry = await lstat(absolutePath, { bigint: true });
  if (entry.isFile()) {
    const folded = relativePath.toLocaleLowerCase("en-US");
    if (foldedPaths.has(folded) && !files.has(relativePath)) {
      throw new PromotionGateError("CASE_COLLISION", `Snapshot file case collision at "${relativePath}".`);
    }
    if (files.has(relativePath)) return;
    const loaded = await readAuthoritativeFile(repoRoot, relativePath);
    const nextFileCount = bounds.fileCount + 1;
    const nextAggregateBytes = bounds.aggregateBytes + loaded.identity.bytes;
    if (nextFileCount > SNAPSHOT_MAX_FILE_COUNT || nextAggregateBytes > SNAPSHOT_MAX_AGGREGATE_BYTES) {
      throw new PromotionGateError(
        "SNAPSHOT_BOUND_EXCEEDED",
        "Snapshot enumeration exceeded the frozen file-count or aggregate-byte bound.",
        {
          maxFileCount: SNAPSHOT_MAX_FILE_COUNT,
          maxAggregateBytes: SNAPSHOT_MAX_AGGREGATE_BYTES,
          observedFileCount: nextFileCount,
          observedAggregateBytes: nextAggregateBytes
        },
        "blocked"
      );
    }
    bounds.fileCount = nextFileCount;
    bounds.aggregateBytes = nextAggregateBytes;
    foldedPaths.add(folded);
    files.set(relativePath, loaded.rawSha256);
    return;
  }
  if (!entry.isDirectory()) {
    throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", "Snapshot paths must contain only directories and regular files.");
  }
  let children;
  try {
    children = await readdir(absolutePath, { withFileTypes: true });
  } catch {
    throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", `Unable to enumerate snapshot path "${relativePath}".`);
  }
  children.sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  const childNames = new Set();
  for (const child of children) {
    const foldedName = child.name.toLocaleLowerCase("en-US");
    if (childNames.has(foldedName)) {
      throw new PromotionGateError("CASE_COLLISION", `Snapshot directory contains a case-colliding entry at "${relativePath}".`);
    }
    childNames.add(foldedName);
    await collectSnapshotFiles(repoRoot, `${relativePath}/${child.name}`, files, foldedPaths, bounds);
  }
}

export async function snapshotRepoPaths(repoRoot, relativePaths) {
  if (!Array.isArray(relativePaths) || relativePaths.length === 0) {
    throw new PromotionGateError("SNAPSHOT_PATH_UNSAFE", "Snapshot requires at least one declared repository path.");
  }
  const files = new Map();
  const foldedPaths = new Set();
  const bounds = { fileCount: 0, aggregateBytes: 0 };
  const roots = [...relativePaths];
  for (const relativePath of roots) {
    await collectSnapshotFiles(repoRoot, relativePath, files, foldedPaths, bounds);
  }
  const snapshotFiles = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en-US"))
    .map(([filePath, rawSha256]) => ({ path: filePath, rawSha256 }));
  const payload = {
    roots,
    files: snapshotFiles,
    fileCount: bounds.fileCount,
    aggregateBytes: bounds.aggregateBytes
  };
  return {
    schemaVersion: "promotion-source-snapshot.v1",
    ...payload,
    digest: fingerprint(payload)
  };
}

async function snapshotCandidateSourceAggregate(repoRoot, manifest) {
  const paths = [];
  const bindings = [];
  const seenPaths = new Set();
  for (const artifact of manifest.candidateArtifacts) {
    if (!seenPaths.has(artifact.path)) {
      const loaded = await readAuthoritativeFile(repoRoot, artifact.path);
      paths.push(artifact.path);
      bindings.push({
        kind: artifact.kind,
        id: artifact.id,
        path: artifact.path,
        rawSha256: loaded.rawSha256
      });
      seenPaths.add(artifact.path);
    }
  }
  return { paths, aggregateDigest: fingerprint(bindings) };
}

export function assertSnapshotsEqual(before, after, errorCode = "SOURCE_MUTATION") {
  const beforeFiles = new Map(before?.files?.map((entry) => [entry.path, entry.rawSha256]) ?? []);
  const afterFiles = new Map(after?.files?.map((entry) => [entry.path, entry.rawSha256]) ?? []);
  const changedPaths = [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])]
    .filter((filePath) => beforeFiles.get(filePath) !== afterFiles.get(filePath))
    .sort((left, right) => left.localeCompare(right, "en-US"));
  if (
    before?.schemaVersion !== "promotion-source-snapshot.v1" ||
    after?.schemaVersion !== "promotion-source-snapshot.v1" ||
    before.digest !== after.digest ||
    changedPaths.length > 0
  ) {
    throw new PromotionGateError(errorCode, "Authoritative repository paths changed during the shadow run.", {
      changedPaths
    });
  }
  return { equal: true, changedPaths: [] };
}

async function assertOsTempRoot(repoRoot, tempRoot) {
  await collectTempRootProof(repoRoot);
  const canonicalRepoRoot = await realpath(repoRoot);
  const canonicalTempRoot = await realpath(tmpdir());
  const canonicalOutputRoot = await realpath(tempRoot);
  const relativeToTemp = path.relative(canonicalTempRoot, canonicalOutputRoot);
  if (
    relativeToTemp === "" ||
    relativeToTemp === ".." ||
    relativeToTemp.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToTemp) ||
    canonicalOutputRoot === canonicalRepoRoot ||
    pathIsWithinRoot(canonicalOutputRoot, canonicalRepoRoot)
  ) {
    throw new PromotionGateError("TEMP_ROOT_POLICY_INVALID", "Shadow output root must be a fresh child of the OS temp root.");
  }
  return canonicalOutputRoot;
}

export async function writeExclusiveShadowOutput(repoRoot, tempRoot, output, dto) {
  const canonicalOutputRoot = await assertOsTempRoot(repoRoot, tempRoot);
  assertExactKeys(output, ["kind", "path"], "shadow output");
  assertSafeRepoRelativePath(output.path);
  if (output.path.includes("/") || output.kind !== dto?.kind) {
    throw new PromotionGateError("OUTPUT_SET_INVALID", "Shadow output must be a matching file inside the temp root.");
  }
  const bytes = Buffer.from(`${stableJson(dto)}\n`);
  try {
    await writeFile(path.join(canonicalOutputRoot, output.path), bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new PromotionGateError("TARGET_COLLISION", `Shadow output target already exists: "${output.path}".`);
    }
    throw new PromotionGateError("SHADOW_OUTPUT_WRITE_FAILED", `Unable to create shadow output "${output.path}".`);
  }
  return {
    kind: output.kind,
    path: output.path,
    rawSha256: sha256(bytes),
    semanticSha256: fingerprint(dto)
  };
}

export async function verifyRollbackAbsent(repoRoot, tempRoot, relativePaths) {
  const canonicalOutputRoot = await assertOsTempRoot(repoRoot, tempRoot);
  const remainingPaths = [];
  for (const relativePath of relativePaths) {
    assertSafeRepoRelativePath(relativePath);
    if (relativePath.includes("/")) {
      throw new PromotionGateError("OUTPUT_SET_INVALID", "Rollback targets must be direct children of the temp root.");
    }
    try {
      await lstat(path.join(canonicalOutputRoot, relativePath));
      remainingPaths.push(relativePath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  if (remainingPaths.length > 0) {
    throw new PromotionGateError("ROLLBACK_INCOMPLETE", "Rollback left shadow output files behind.", { remainingPaths });
  }
  return { verifiedAbsent: true, remainingPaths: [] };
}

async function cleanupPartialShadowRoot(repoRoot, tempRoot, registeredPaths, preimageDigest, originalCode) {
  const canonicalOutputRoot = await assertOsTempRoot(repoRoot, tempRoot);
  const registered = new Set(registeredPaths);
  const beforeEntries = (await readdir(canonicalOutputRoot)).sort(codePointCompare);
  const unexpectedEntries = beforeEntries.filter((entry) => !registered.has(entry));
  const unsafeRegisteredEntries = [];
  const deletedPaths = [];
  for (const entry of beforeEntries.filter((candidate) => registered.has(candidate))) {
    const entryPath = path.join(canonicalOutputRoot, entry);
    const stat = await lstat(entryPath, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) {
      unsafeRegisteredEntries.push(entry);
      continue;
    }
    await rm(entryPath);
    deletedPaths.push(entry);
  }
  const remainingEntries = (await readdir(canonicalOutputRoot)).sort(codePointCompare);
  const postRollbackDigest = fingerprint(remainingEntries);
  let rootRemoved = false;
  if (remainingEntries.length === 0) {
    await rmdir(canonicalOutputRoot);
    rootRemoved = true;
  }
  const cleanupPayload = {
    method: "delete-registered-direct-children-and-verify",
    originalCode,
    preimageDigest,
    postRollbackDigest,
    registeredPathCount: registered.size,
    deletedPaths: deletedPaths.sort(codePointCompare),
    unexpectedEntryCount: unexpectedEntries.length,
    unexpectedEntriesDigest: fingerprint(unexpectedEntries),
    unsafeRegisteredEntryCount: unsafeRegisteredEntries.length,
    unsafeRegisteredEntriesDigest: fingerprint(unsafeRegisteredEntries.sort(codePointCompare)),
    verifiedAbsent: remainingEntries.length === 0,
    rootRemoved
  };
  const cleanupProof = { ...cleanupPayload, cleanupDigest: fingerprint(cleanupPayload) };
  if (
    unexpectedEntries.length > 0 ||
    unsafeRegisteredEntries.length > 0 ||
    postRollbackDigest !== preimageDigest ||
    !rootRemoved
  ) {
    throw new PromotionGateError(
      "ROLLBACK_INCOMPLETE",
      "Partial Shadow cleanup did not restore and remove the fresh temp-root preimage.",
      { partialRollback: cleanupProof }
    );
  }
  return cleanupProof;
}

export async function rehearseShadowOutputs(repoRoot, dtos, operationPlan) {
  validateOperationPlan(operationPlan);
  await collectTempRootProof(repoRoot);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-shadow-"));
  const preimageEntries = (await readdir(tempRoot)).sort(codePointCompare);
  const preimageDigest = fingerprint(preimageEntries);
  if (preimageEntries.length !== 0) {
    throw new PromotionGateError(
      "TEMP_ROOT_NOT_FRESH",
      "Shadow output root was not empty before the rehearsal.",
      {
        unexpectedEntryCount: preimageEntries.length,
        unexpectedEntriesDigest: fingerprint(preimageEntries)
      }
    );
  }
  const outputs = [];
  const deletedPaths = [];
  let rootRemoved = false;
  try {
    for (const output of operationPlan.outputs) {
      outputs.push(await writeExclusiveShadowOutput(repoRoot, tempRoot, output, dtos[output.kind]));
    }
    for (const output of operationPlan.outputs) {
      await rm(path.join(tempRoot, output.path));
      deletedPaths.push(output.path);
    }
    const rollback = await verifyRollbackAbsent(repoRoot, tempRoot, operationPlan.outputs.map((output) => output.path));
    const postRollbackEntries = (await readdir(tempRoot)).sort(codePointCompare);
    const postRollbackDigest = fingerprint(postRollbackEntries);
    if (preimageDigest !== postRollbackDigest) {
      throw new PromotionGateError("ROLLBACK_INCOMPLETE", "Rollback did not restore the fresh temp-root preimage.");
    }
    await rmdir(tempRoot);
    rootRemoved = true;
    const rollbackPayload = {
      method: operationPlan.rollback,
      preimageDigest,
      postRollbackDigest,
      deletedPaths,
      verifiedAbsent: rollback.verifiedAbsent,
      rootRemoved
    };
    return {
      tempRootPolicy: "os-temp-only",
      outputs,
      aggregateDigest: fingerprint(outputs),
      deletedPaths,
      verifiedAbsent: rollback.verifiedAbsent,
      rootRemoved,
      preimageDigest,
      postRollbackDigest,
      rollbackDigest: fingerprint(rollbackPayload)
    };
  } catch (error) {
    const controlled = error instanceof PromotionGateError
      ? error
      : new PromotionGateError(
        "SHADOW_OUTPUT_WRITE_FAILED",
        "Shadow output rehearsal failed after the temp root was created."
      );
    const partialRollback = await cleanupPartialShadowRoot(
      repoRoot,
      tempRoot,
      operationPlan.outputs.map(({ path: outputPath }) => outputPath),
      preimageDigest,
      controlled.code
    );
    controlled.details = { ...controlled.details, partialRollback };
    throw controlled;
  }
}

function scriptKindForRuntimePath(filePath) {
  const extension = path.posix.extname(filePath).toLocaleLowerCase("en-US");
  const scriptKinds = new Map([
    [".js", ts.ScriptKind.JS],
    [".jsx", ts.ScriptKind.JSX],
    [".mjs", ts.ScriptKind.JS],
    [".cjs", ts.ScriptKind.JS],
    [".ts", ts.ScriptKind.TS],
    [".tsx", ts.ScriptKind.TSX],
    [".mts", ts.ScriptKind.TS],
    [".cts", ts.ScriptKind.TS]
  ]);
  return scriptKinds.get(extension) ?? ts.ScriptKind.Unknown;
}

function exactModuleString(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return null;
}

function bindingNameContains(name, sought) {
  if (ts.isIdentifier(name)) return name.text === sought;
  return name.elements.some((element) =>
    !ts.isOmittedExpression(element) && bindingNameContains(element.name, sought)
  );
}

function statementDeclaresName(statement, sought) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.some(({ name }) => bindingNameContains(name, sought));
  }
  if (
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) || ts.isModuleDeclaration(statement)) &&
    statement.name
  ) return statement.name.text === sought;
  if (ts.isImportEqualsDeclaration(statement)) return statement.name.text === sought;
  if (ts.isImportDeclaration(statement) && statement.importClause) {
    if (statement.importClause.name?.text === sought) return true;
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) return bindings.name.text === sought;
    if (bindings && ts.isNamedImports(bindings)) {
      return bindings.elements.some(({ name }) => name.text === sought);
    }
  }
  return false;
}

function scopeDeclaresName(scope, sought) {
  if (ts.isFunctionLike(scope) && scope.parameters.some(({ name }) => bindingNameContains(name, sought))) {
    return true;
  }
  if (ts.isCatchClause(scope) && scope.variableDeclaration) {
    return bindingNameContains(scope.variableDeclaration.name, sought);
  }
  const statements = ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isModuleBlock(scope)
    ? scope.statements
    : ts.isFunctionLike(scope) && scope.body && ts.isBlock(scope.body)
      ? scope.body.statements
      : undefined;
  return statements?.some((statement) => statementDeclaresName(statement, sought)) ?? false;
}

function identifierIsLexicallyShadowed(identifier, sought) {
  let current = identifier.parent;
  while (current) {
    if (
      (ts.isSourceFile(current) || ts.isBlock(current) || ts.isModuleBlock(current) ||
        ts.isFunctionLike(current) || ts.isCatchClause(current)) &&
      scopeDeclaresName(current, sought)
    ) return true;
    current = current.parent;
  }
  return false;
}

function importDeclarationHasRuntimeValue(node) {
  return node.importClause?.isTypeOnly !== true;
}

function exportDeclarationHasRuntimeValue(node) {
  return node.isTypeOnly !== true;
}

function parseRuntimeSourceFile(filePath, source) {
  assertSafeRepoRelativePath(filePath);
  if (ts.version !== TYPESCRIPT_PARSER_VERSION) {
    throw new PromotionGateError(
      "CHECKER_PARSER_VERSION_MISMATCH",
      "Runtime module analysis requires the checker-release TypeScript parser version.",
      {
        expectedVersion: TYPESCRIPT_PARSER_VERSION,
        actualVersionDigest: fingerprint(ts.version)
      },
      "blocked"
    );
  }
  if (typeof source !== "string") {
    throw new PromotionGateError(
      "MODULE_PARSE_INDETERMINATE",
      "Runtime module source must be UTF-8 text.",
      {},
      "blocked"
    );
  }
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForRuntimePath(filePath)
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new PromotionGateError(
      "MODULE_PARSE_INDETERMINATE",
      "Runtime module could not be parsed by the frozen TypeScript parser.",
      {
        parserVersion: ts.version,
        diagnosticsDigest: fingerprint(sourceFile.parseDiagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          start: diagnostic.start ?? null,
          length: diagnostic.length ?? null,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        })))
      },
      "blocked"
    );
  }
  return sourceFile;
}

export function analyzeRuntimeModuleReferences(filePath, source) {
  const sourceFile = parseRuntimeSourceFile(filePath, source);

  const references = [];
  const unresolvedCalls = [];
  const addReference = (kind, specifier, node) => {
    references.push({ kind, specifier, typeOnly: false, position: node.getStart(sourceFile) });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && importDeclarationHasRuntimeValue(node)) {
      const specifier = exactModuleString(node.moduleSpecifier);
      if (specifier !== null) addReference("import", specifier, node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && exportDeclarationHasRuntimeValue(node)) {
      const specifier = exactModuleString(node.moduleSpecifier);
      if (specifier !== null) addReference("export", specifier, node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      const specifier = exactModuleString(node.moduleReference.expression);
      if (specifier !== null) addReference("import-equals", specifier, node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const specifier = node.arguments.length === 1 ? exactModuleString(node.arguments[0]) : null;
      if (specifier === null) {
        unresolvedCalls.push({ call: "import", position: node.expression.getStart(sourceFile) });
      } else {
        addReference("dynamic-import", specifier, node.expression);
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      !identifierIsLexicallyShadowed(node.expression, "require")
    ) {
      const specifier = node.arguments.length === 1 ? exactModuleString(node.arguments[0]) : null;
      if (specifier === null) {
        unresolvedCalls.push({ call: "require", position: node.expression.getStart(sourceFile) });
      } else {
        addReference("require", specifier, node.expression);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const deduped = [];
  const seen = new Set();
  for (const reference of references.sort((left, right) => left.position - right.position)) {
    const projected = { kind: reference.kind, specifier: reference.specifier, typeOnly: false };
    const key = stableJson(projected);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(projected);
    }
  }
  return {
    parser: { name: "typescript", version: TYPESCRIPT_PARSER_VERSION },
    references: deduped,
    specifiers: deduped.map(({ specifier }) => specifier),
    unresolvedCalls: unresolvedCalls.sort((left, right) => left.position - right.position)
  };
}

const FS_LOADER_MODULES = new Set(["fs", "node:fs", "fs/promises", "node:fs/promises"]);
const RUNTIME_CODE_CAPABILITY_MODULES = new Map([
  ["child_process", "node:child_process"],
  ["node:child_process", "node:child_process"],
  ["worker_threads", "node:worker_threads"],
  ["node:worker_threads", "node:worker_threads"],
  ["vm", "node:vm"],
  ["node:vm", "node:vm"]
]);
const ZERO_BASELINE_FS_KINDS = new Map([
  ["readFileSync", "read-file-sync"],
  ["open", "fs-open"],
  ["openSync", "fs-open-sync"],
  ["createReadStream", "create-read-stream"],
  ["readdir", "read-directory"],
  ["readdirSync", "read-directory-sync"],
  ["opendir", "open-directory"]
]);

function identifierIsShadowedBelowSource(identifier, sought) {
  let current = identifier.parent;
  while (current && !ts.isSourceFile(current)) {
    if (
      (ts.isBlock(current) || ts.isModuleBlock(current) || ts.isFunctionLike(current) ||
        ts.isCatchClause(current)) &&
      scopeDeclaresName(current, sought)
    ) return true;
    current = current.parent;
  }
  return false;
}

function importMetaProperty(expression, propertyName) {
  return ts.isPropertyAccessExpression(expression) &&
    expression.name.text === propertyName &&
    ts.isMetaProperty(expression.expression) &&
    expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    expression.expression.name.text === "meta";
}

function normalizeLoaderExpression(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { kind: "literal", valueType: "string", value: expression.text };
  }
  if (ts.isNumericLiteral(expression)) return { kind: "literal", valueType: "number", value: expression.text };
  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) {
    return { kind: "literal", valueType: "boolean", value: expression.kind === ts.SyntaxKind.TrueKeyword };
  }
  if (ts.isIdentifier(expression)) return { kind: "identifier", name: expression.text };
  if (ts.isPropertyAccessExpression(expression)) {
    return {
      kind: "property-access",
      expression: normalizeLoaderExpression(expression.expression),
      name: expression.name.text
    };
  }
  if (ts.isElementAccessExpression(expression)) {
    return {
      kind: "element-access",
      expression: normalizeLoaderExpression(expression.expression),
      argument: expression.argumentExpression
        ? normalizeLoaderExpression(expression.argumentExpression)
        : { kind: "missing" }
    };
  }
  if (ts.isCallExpression(expression)) {
    return {
      kind: "call",
      callee: normalizeLoaderExpression(expression.expression),
      arguments: expression.arguments.map(normalizeLoaderExpression)
    };
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return {
      kind: "concat",
      left: normalizeLoaderExpression(expression.left),
      right: normalizeLoaderExpression(expression.right)
    };
  }
  if (ts.isTemplateExpression(expression)) {
    return {
      kind: "template",
      head: expression.head.text,
      spans: expression.templateSpans.map((span) => ({
        expression: normalizeLoaderExpression(span.expression),
        literal: span.literal.text
      }))
    };
  }
  return { kind: "unsupported", syntaxKind: ts.SyntaxKind[expression.kind] ?? String(expression.kind) };
}

function loaderArgumentShape(argument) {
  const normalized = normalizeLoaderExpression(argument);
  if (normalized.kind === "identifier") return `identifier(${normalized.name})`;
  if (normalized.kind === "literal") return `literal(${normalized.valueType})`;
  if (normalized.kind === "property-access") return `property(${normalized.name})`;
  return normalized.kind;
}

function collectLoaderBindings(sourceFile) {
  const bindings = new Map();
  const canonicalLoaderModule = (moduleName) => {
    if (FS_LOADER_MODULES.has(moduleName)) {
      return moduleName.startsWith("node:") ? moduleName : `node:${moduleName}`;
    }
    if (moduleName === "next/dynamic") return "next/dynamic";
    if (["glob", "fast-glob"].includes(moduleName)) return moduleName;
    if (["node:module", "module"].includes(moduleName)) return "node:module";
    if (RUNTIME_CODE_CAPABILITY_MODULES.has(moduleName)) {
      return RUNTIME_CODE_CAPABILITY_MODULES.get(moduleName);
    }
    return null;
  };
  const addImportBinding = (localName, moduleName, importedName) => {
    if (FS_LOADER_MODULES.has(moduleName)) {
      const normalizedModule = canonicalLoaderModule(moduleName);
      bindings.set(localName, importedName ? `${normalizedModule}.${importedName}` : normalizedModule);
      return;
    }
    if (moduleName === "next/dynamic" && importedName === "default") {
      bindings.set(localName, "next/dynamic");
      return;
    }
    if (["glob", "fast-glob"].includes(moduleName)) {
      bindings.set(localName, `${moduleName}.${importedName ?? "default"}`);
      return;
    }
    if (["node:module", "module"].includes(moduleName) && importedName === "createRequire") {
      bindings.set(localName, "node:module.createRequire");
      return;
    }
    if (RUNTIME_CODE_CAPABILITY_MODULES.has(moduleName)) {
      const normalizedModule = RUNTIME_CODE_CAPABILITY_MODULES.get(moduleName);
      bindings.set(localName, importedName ? `${normalizedModule}.${importedName}` : normalizedModule);
    }
  };
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const moduleName = exactModuleString(statement.moduleSpecifier);
    if (moduleName === null) continue;
    if (statement.importClause.name) addImportBinding(statement.importClause.name.text, moduleName, "default");
    const namedBindings = statement.importClause.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      addImportBinding(namedBindings.name.text, moduleName, null);
    } else if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        if (element.isTypeOnly) continue;
        addImportBinding(element.name.text, moduleName, element.propertyName?.text ?? element.name.text);
      }
    }
  }
  const canonicalForExpression = (expression) => {
    if (ts.isParenthesizedExpression(expression) || ts.isAwaitExpression(expression)) {
      return canonicalForExpression(expression.expression);
    }
    if (ts.isIdentifier(expression)) {
      const bound = bindings.get(expression.text);
      if (bound !== undefined) return bound;
      const globals = {
        require: "commonjs.require",
        module: "commonjs.module",
        process: "node.process",
        eval: "global.eval",
        Function: "global.Function",
        Reflect: "global.Reflect",
        globalThis: "global.globalThis",
        window: "global.window",
        createRequire: "unbound.createRequire"
      };
      const canonical = globals[expression.text];
      return canonical !== undefined && !identifierIsLexicallyShadowed(expression, expression.text)
        ? canonical
        : null;
    }
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) return canonicalForExpression(expression.right);
    if (ts.isCallExpression(expression)) {
      if (
        ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression) &&
        expression.expression.expression.text === "process" &&
        !identifierIsLexicallyShadowed(expression.expression.expression, "process") &&
        expression.expression.name.text === "getBuiltinModule" &&
        expression.arguments.length === 1
      ) {
        const moduleName = exactModuleString(expression.arguments[0]);
        return moduleName === null ? null : canonicalLoaderModule(moduleName);
      }
      if (
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === "require" &&
        !identifierIsLexicallyShadowed(expression.expression, "require") &&
        expression.arguments.length === 1
      ) {
        const moduleName = exactModuleString(expression.arguments[0]);
        return moduleName === null ? null : canonicalLoaderModule(moduleName);
      }
      if (expression.expression.kind === ts.SyntaxKind.ImportKeyword && expression.arguments.length === 1) {
        const moduleName = exactModuleString(expression.arguments[0]);
        return moduleName === null ? null : canonicalLoaderModule(moduleName);
      }
      const callee = canonicalForExpression(expression.expression);
      if (
        callee === "node:module.createRequire" ||
        callee === "commonjs.module.createRequire" ||
        callee === "unbound.createRequire"
      ) return "node:module.require-instance";
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const parent = canonicalForExpression(expression.expression);
      if (parent === null) return null;
      const joined = `${parent}.${expression.name.text}`;
      return joined
        .replace(/^node:fs\.promises\./u, "node:fs/promises.")
        .replace(/^node:fs\/promises\.promises\./u, "node:fs/promises.");
    }
    if (ts.isElementAccessExpression(expression)) {
      const parent = canonicalForExpression(expression.expression);
      const propertyName = expression.argumentExpression
        ? exactModuleString(expression.argumentExpression)
        : null;
      if (parent === null || propertyName === null) return null;
      return `${parent}.${propertyName}`
        .replace(/^node:fs\.promises\./u, "node:fs/promises.")
        .replace(/^node:fs\/promises\.promises\./u, "node:fs/promises.");
    }
    return null;
  };
  let changed = true;
  while (changed) {
    changed = false;
    const visitAlias = (node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name)) {
          const canonical = canonicalForExpression(node.initializer);
          if (canonical !== null && bindings.get(node.name.text) !== canonical) {
            bindings.set(node.name.text, canonical);
            changed = true;
          }
        } else if (ts.isObjectBindingPattern(node.name)) {
          const base = canonicalForExpression(node.initializer);
          if (base !== null) {
            for (const element of node.name.elements) {
              if (!ts.isIdentifier(element.name)) continue;
              const propertyName = element.propertyName && ts.isIdentifier(element.propertyName)
                ? element.propertyName.text
                : element.name.text;
              const canonical = `${base}.${propertyName}`
                .replace(/^node:fs\.promises\./u, "node:fs/promises.");
              if (bindings.get(element.name.text) !== canonical) {
                bindings.set(element.name.text, canonical);
                changed = true;
              }
            }
          }
        }
      }
      ts.forEachChild(node, visitAlias);
    };
    visitAlias(sourceFile);
  }
  return { bindings, canonicalForExpression };
}

export function analyzeRuntimeLoaderCalls(filePath, source) {
  const sourceFile = parseRuntimeSourceFile(filePath, source);
  const { bindings, canonicalForExpression } = collectLoaderBindings(sourceFile);
  const fsReads = [];
  const nextDynamicCalls = [];
  const zeroBaselineCalls = [];
  const importMetaUrlReferences = [];
  const pushZeroBaseline = (kind, node, callee) => {
    zeroBaselineCalls.push({
      kind,
      callee,
      position: node.getStart(sourceFile),
      normalizedExpressionDigest: fingerprint(normalizeLoaderExpression(node))
    });
  };
  const unwrapTransparentExpression = (expression) => {
    let current = expression;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current)
    ) current = current.expression;
    return current;
  };
  const indirectEvaluationTarget = (expression) => {
    const current = unwrapTransparentExpression(expression);
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) return indirectEvaluationTarget(current.right);
    if (
      ts.isIdentifier(current) &&
      ["eval", "Function"].includes(current.text) &&
      !identifierIsLexicallyShadowed(current, current.text)
    ) return current.text;
    return null;
  };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      let canonical = canonicalForExpression(node.expression);
      if (
        ts.isIdentifier(node.expression) &&
        canonical !== null &&
        identifierIsShadowedBelowSource(node.expression, node.expression.text)
      ) canonical = null;
      if (canonical?.endsWith(".readFile")) {
        const normalized = {
          callee: canonical,
          arguments: node.arguments.map(normalizeLoaderExpression)
        };
        fsReads.push({
          callee: canonical,
          position: node.expression.getStart(sourceFile),
          argumentShape: node.arguments.map(loaderArgumentShape).join(","),
          normalizedExpressionDigest: fingerprint(normalized),
          policy: "runtime-storage-read-only-non-module"
        });
      } else if (canonical) {
        const operation = canonical.split(".").at(-1);
        if (
          (canonical.startsWith("node:fs.") || canonical.startsWith("node:fs/promises.")) &&
          ZERO_BASELINE_FS_KINDS.has(operation)
        ) {
          pushZeroBaseline(ZERO_BASELINE_FS_KINDS.get(operation), node, canonical);
        } else if (canonical.startsWith("glob.") || canonical.startsWith("fast-glob.")) {
          pushZeroBaseline("glob", node, canonical);
        } else if (canonical === "node:module.createRequire") {
          pushZeroBaseline("create-require", node, canonical);
        } else if (canonical === "next/dynamic") {
          const literalImports = [];
          let nonliteralImportCount = 0;
          const loader = node.arguments[0];
          if (!loader || (!ts.isArrowFunction(loader) && !ts.isFunctionExpression(loader))) {
            pushZeroBaseline("next-dynamic-unresolved-wrapper", node, canonical);
          } else {
            const collectImports = (child) => {
              if (ts.isCallExpression(child) && child.expression.kind === ts.SyntaxKind.ImportKeyword) {
                const specifier = child.arguments.length === 1 ? exactModuleString(child.arguments[0]) : null;
                if (specifier === null) nonliteralImportCount += 1;
                else literalImports.push(specifier);
              }
              ts.forEachChild(child, collectImports);
            };
            collectImports(loader.body);
            if (literalImports.length === 0 || nonliteralImportCount > 0) {
              pushZeroBaseline("next-dynamic-unresolved-wrapper", node, canonical);
            }
            nextDynamicCalls.push({
              position: node.expression.getStart(sourceFile),
              literalImports: [...new Set(literalImports)].sort(codePointCompare),
              nonliteralImportCount,
              normalizedExpressionDigest: fingerprint(normalizeLoaderExpression(node))
            });
          }
        } else if (
          canonical === "commonjs.require" &&
          !(ts.isIdentifier(node.expression) && node.expression.text === "require")
        ) {
          pushZeroBaseline("indirect-require", node, canonical);
        } else if (
          (canonical.startsWith("commonjs.require.") &&
            canonical !== "commonjs.require.resolve" &&
            canonical !== "commonjs.require.context") ||
          canonical === "node.process.mainModule.require" ||
          canonical === "commonjs.module.constructor._load" ||
          canonical === "node:module.require-instance"
        ) {
          pushZeroBaseline("indirect-require", node, canonical);
        } else if (canonical.startsWith("node:vm.run")) {
          pushZeroBaseline("node-vm-evaluation", node, canonical);
        } else if (canonical.startsWith("node:child_process.")) {
          pushZeroBaseline("child-process-execution", node, canonical);
        } else if (canonical.startsWith("node:worker_threads.")) {
          pushZeroBaseline("worker-thread-loader", node, canonical);
        } else if (canonical === "global.eval") {
          pushZeroBaseline("indirect-code-evaluation", node, canonical);
        } else if (
          canonical === "global.Function" ||
          canonical === "global.globalThis.Function" ||
          canonical === "global.window.Function"
        ) {
          pushZeroBaseline("function-constructor", node, canonical);
        } else if (canonical === "global.Reflect.apply" && node.arguments.length > 0) {
          const applied = canonicalForExpression(node.arguments[0]);
          if (applied === "commonjs.require" || applied === "node:module.require-instance") {
            pushZeroBaseline("indirect-require", node, canonical);
          } else if (applied === "global.eval") {
            pushZeroBaseline("indirect-code-evaluation", node, canonical);
          } else if (
            applied === "global.Function" ||
            applied === "global.globalThis.Function" ||
            applied === "global.window.Function"
          ) {
            pushZeroBaseline("function-constructor", node, canonical);
          }
        }
      }

      if (ts.isElementAccessExpression(node.expression)) {
        const parentCanonical = canonicalForExpression(node.expression.expression);
        const propertyName = node.expression.argumentExpression
          ? exactModuleString(node.expression.argumentExpression)
          : null;
        if (
          parentCanonical !== null &&
          (parentCanonical === "node:fs" || parentCanonical === "node:fs/promises") &&
          propertyName === null
        ) {
          pushZeroBaseline("element-access-loader", node, `${parentCanonical}[?]`);
        }
      }

      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        !identifierIsLexicallyShadowed(node.expression.expression, "require")
      ) {
        if (node.expression.name.text === "resolve") pushZeroBaseline("require-resolve", node, "require.resolve");
        if (node.expression.name.text === "context") pushZeroBaseline("require-context", node, "require.context");
      }
      if (
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "module" &&
        !identifierIsLexicallyShadowed(node.expression.expression, "module")
      ) {
        const propertyName = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : node.expression.argumentExpression
            ? exactModuleString(node.expression.argumentExpression)
            : null;
        if (propertyName === "require") pushZeroBaseline("module-require", node, "module.require");
        else if (propertyName === null) pushZeroBaseline("element-access-loader", node, "module[?]");
      }
      if (
        ts.isElementAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        !identifierIsLexicallyShadowed(node.expression.expression, "require")
      ) {
        const propertyName = node.expression.argumentExpression
          ? exactModuleString(node.expression.argumentExpression)
          : null;
        if (propertyName === "resolve") pushZeroBaseline("require-resolve", node, "require.resolve");
        else if (propertyName === "context") pushZeroBaseline("require-context", node, "require.context");
        else pushZeroBaseline("element-access-loader", node, "require[?]");
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "process" &&
        !identifierIsLexicallyShadowed(node.expression.expression, "process") &&
        node.expression.name.text === "getBuiltinModule"
      ) {
        pushZeroBaseline("process-get-builtin-module", node, "process.getBuiltinModule");
      }
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "eval" &&
        !identifierIsLexicallyShadowed(node.expression, "eval")
      ) {
        pushZeroBaseline("indirect-code-evaluation", node, "eval");
      }
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Function" &&
        !identifierIsLexicallyShadowed(node.expression, "Function")
      ) {
        pushZeroBaseline("function-constructor", node, "Function");
      }
      const indirectTarget = indirectEvaluationTarget(node.expression);
      if (
        indirectTarget !== null &&
        !(ts.isIdentifier(node.expression) && node.expression.text === indirectTarget) &&
        !["global.eval", "global.Function"].includes(canonical)
      ) {
        pushZeroBaseline(
          indirectTarget === "eval" ? "indirect-code-evaluation" : "function-constructor",
          node,
          `indirect-${indirectTarget}`
        );
      }
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "__non_webpack_require__" &&
        !identifierIsLexicallyShadowed(node.expression, "__non_webpack_require__")
      ) {
        pushZeroBaseline("webpack-require-escape", node, "__non_webpack_require__");
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        ["globalThis", "window"].includes(node.expression.expression.text) &&
        ["eval", "Function"].includes(node.expression.name.text)
      ) {
        pushZeroBaseline(
          node.expression.name.text === "eval" ? "indirect-code-evaluation" : "function-constructor",
          node,
          `${node.expression.expression.text}.${node.expression.name.text}`
        );
      }
      if (
        ts.isElementAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        ["globalThis", "window"].includes(node.expression.expression.text) &&
        !identifierIsLexicallyShadowed(node.expression.expression, node.expression.expression.text)
      ) {
        const propertyName = node.expression.argumentExpression
          ? exactModuleString(node.expression.argumentExpression)
          : null;
        if (propertyName === "eval" || propertyName === "Function") {
          pushZeroBaseline(
            propertyName === "eval" ? "indirect-code-evaluation" : "function-constructor",
            node,
            `${node.expression.expression.text}[${propertyName}]`
          );
        } else {
          pushZeroBaseline("element-access-loader", node, `${node.expression.expression.text}[?]`);
        }
      }
      if (
        ts.isElementAccessExpression(node.expression) &&
        (ts.isMetaProperty(node.expression.expression) ||
          (ts.isPropertyAccessExpression(node.expression.expression) &&
            ts.isMetaProperty(node.expression.expression.expression)))
      ) {
        pushZeroBaseline("element-access-loader", node, "import.meta[?]");
      }
      if (importMetaProperty(node.expression, "resolve")) {
        pushZeroBaseline("import-meta-resolve", node, "import.meta.resolve");
      }
      if (importMetaProperty(node.expression, "glob") || importMetaProperty(node.expression, "globEager")) {
        pushZeroBaseline("import-meta-glob", node, `import.meta.${node.expression.name.text}`);
      }
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "URL" &&
      !identifierIsShadowedBelowSource(node.expression, "URL") &&
      node.arguments?.length === 2 &&
      importMetaProperty(node.arguments[1], "url")
    ) {
      const specifier = exactModuleString(node.arguments[0]);
      if (specifier === null) pushZeroBaseline("import-meta-url-nonliteral", node, "new URL");
      else importMetaUrlReferences.push(specifier);
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Function" &&
      !identifierIsShadowedBelowSource(node.expression, "Function")
    ) {
      pushZeroBaseline("function-constructor", node, "new Function");
    } else if (ts.isNewExpression(node)) {
      const canonical = canonicalForExpression(node.expression);
      if (
        canonical === "global.Function" ||
        canonical === "global.globalThis.Function" ||
        canonical === "global.window.Function"
      ) pushZeroBaseline("function-constructor", node, canonical);
      else if (canonical === "node:worker_threads.Worker") {
        pushZeroBaseline("worker-thread-loader", node, canonical);
      } else if (canonical?.startsWith("node:vm.")) {
        pushZeroBaseline("node-vm-evaluation", node, canonical);
      } else if (
        ts.isIdentifier(node.expression) &&
        ["Worker", "SharedWorker"].includes(node.expression.text) &&
        !identifierIsShadowedBelowSource(node.expression, node.expression.text)
      ) {
        pushZeroBaseline("worker-loader", node, node.expression.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const byPosition = (left, right) => left.position - right.position;
  return {
    parserVersion: TYPESCRIPT_PARSER_VERSION,
    sourceRawSha256: sha256(Buffer.from(source)),
    fsReads: fsReads.sort(byPosition),
    nextDynamicCalls: nextDynamicCalls.sort(byPosition),
    zeroBaselineCalls: zeroBaselineCalls.sort(byPosition),
    importMetaUrlReferences: [...new Set(importMetaUrlReferences)].sort(codePointCompare)
  };
}

function resolveRepoModuleSpecifier(importerPath, specifier) {
  const withoutSuffix = specifier.split(/[?#]/u, 1)[0];
  if (withoutSuffix.startsWith("./") || withoutSuffix.startsWith("../")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(importerPath), withoutSuffix));
  }
  if (withoutSuffix.startsWith("@/")) return path.posix.normalize(withoutSuffix.slice(2));
  if (CANONICAL_RUNTIME_ROOTS.some((root) => withoutSuffix === root || withoutSuffix.startsWith(`${root}/`)) ||
      withoutSuffix === "coordination" || withoutSuffix.startsWith("coordination/")) {
    return path.posix.normalize(withoutSuffix);
  }
  return null;
}

const LIVE_REGISTRY_CHECK_IDS = Object.freeze([
  "canonical-runtime-file-set",
  "deterministic-file-classification",
  "framework-entrypoint-derivation",
  "typescript-ast-runtime-graph",
  "bounded-runtime-loaders",
  "identity-marker",
  "reachable-nonliteral-import-require"
]);

const ZERO_BASELINE_LOADER_KINDS = Object.freeze([
  "create-read-stream",
  "create-require",
  "element-access-loader",
  "fs-open",
  "fs-open-sync",
  "glob",
  "import-meta-glob",
  "import-meta-resolve",
  "import-meta-url-nonliteral",
  "indirect-require",
  "indirect-code-evaluation",
  "function-constructor",
  "module-require",
  "next-dynamic-unresolved-wrapper",
  "node-vm-evaluation",
  "open-directory",
  "process-get-builtin-module",
  "read-directory",
  "read-directory-sync",
  "read-file-sync",
  "require-context",
  "require-resolve",
  "webpack-require-escape"
]);

const RUNTIME_MODULE_EXTENSIONS = Object.freeze([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
export const RUNTIME_CLASSIFICATION_KINDS = Object.freeze([
  "test-code",
  "audit-script",
  "generated-code",
  "data-json",
  "asset",
  "documentation",
  "placeholder",
  "runtime-metadata",
  "runtime-code"
]);

export function classifyRuntimeSurfacePath(filePath, sourcePrefix = "") {
  assertSafeRepoRelativePath(filePath);
  const basename = path.posix.basename(filePath);
  const lower = filePath.toLocaleLowerCase("en-US");
  const extension = path.posix.extname(lower);
  const isCode = RUNTIME_MODULE_EXTENSIONS.includes(extension);
  if (
    /(?:^|\/)(?:__tests__|tests?)(?:\/|$)/u.test(lower) ||
    /\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/u.test(lower)
  ) return "test-code";
  if (/^audit-[^/]+\.mjs$/iu.test(basename)) return "audit-script";
  if (
    isCode &&
    /\b(?:GENERATED FILE|AUTO-GENERATED)\b/iu.test(String(sourcePrefix).slice(0, 4096))
  ) return "generated-code";
  if (extension === ".json") return "data-json";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3"].includes(extension)) return "asset";
  if (extension === ".md") return "documentation";
  if (basename === ".gitkeep") return "placeholder";
  if (filePath === "public/robots.txt") return "runtime-metadata";
  if (isCode || extension === ".css") return "runtime-code";
  throw new PromotionGateError(
    "LIVE_CLASSIFICATION_UNKNOWN",
    "Runtime surface contains a file outside the frozen classifier.",
    { pathDigest: fingerprint(filePath) },
    "blocked"
  );
}

const NEXT_FRAMEWORK_BASENAMES = Object.freeze([
  "page",
  "route",
  "layout",
  "template",
  "error",
  "global-error",
  "global-not-found",
  "loading",
  "not-found",
  "forbidden",
  "unauthorized",
  "default",
  "sitemap",
  "robots",
  "manifest",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image"
]);

export function deriveFrameworkRuntimeEntrypoints(paths) {
  if (!Array.isArray(paths)) {
    throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Runtime path set must be an array.");
  }
  const allowedExtensions = new Set(RUNTIME_MODULE_EXTENSIONS);
  return [...paths]
    .filter((filePath) => {
      assertSafeRepoRelativePath(filePath);
      if (!filePath.startsWith("app/")) return false;
      const extension = path.posix.extname(filePath).toLocaleLowerCase("en-US");
      const basename = path.posix.basename(filePath, extension);
      return allowedExtensions.has(extension) && NEXT_FRAMEWORK_BASENAMES.includes(basename);
    })
    .sort(codePointCompare);
}

const NEXT_ROOT_SPECIAL_BASENAMES = Object.freeze([
  "middleware",
  "proxy",
  "instrumentation",
  "instrumentation-client"
]);

function nextRootSpecialPath(filePath) {
  const extension = path.posix.extname(filePath).toLocaleLowerCase("en-US");
  if (!RUNTIME_MODULE_EXTENSIONS.includes(extension)) return false;
  const basename = path.posix.basename(filePath, extension);
  const directory = path.posix.dirname(filePath);
  return NEXT_ROOT_SPECIAL_BASENAMES.includes(basename) && (directory === "." || directory === "src");
}

async function existingSnapshotFiles(repoRoot, relativePath) {
  const canonicalRoot = await realpath(repoRoot);
  const absolutePath = path.join(canonicalRoot, relativePath);
  try {
    const entry = await lstat(absolutePath, { bigint: true });
    if (entry.isSymbolicLink()) {
      throw new PromotionGateError(
        "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT",
        "Alternate framework entrypoint roots cannot be symlinks.",
        {},
        "blocked"
      );
    }
  } catch (error) {
    if (error instanceof PromotionGateError) throw error;
    if (error?.code === "ENOENT") return [];
    throw new PromotionGateError(
      "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT",
      "Alternate framework entrypoint roots could not be inspected.",
      {},
      "blocked"
    );
  }
  return (await snapshotRepoPaths(canonicalRoot, [relativePath])).files.map(({ path: filePath }) => filePath);
}

async function deriveAlternateFrameworkEntrypoints(repoRoot) {
  const candidates = [];
  for (const relativeRoot of ["pages", "src/app", "src/pages"]) {
    const files = await existingSnapshotFiles(repoRoot, relativeRoot);
    for (const filePath of files) {
      const extension = path.posix.extname(filePath).toLocaleLowerCase("en-US");
      if (!RUNTIME_MODULE_EXTENSIONS.includes(extension)) continue;
      if (relativeRoot === "src/app") {
        const basename = path.posix.basename(filePath, extension);
        if (!NEXT_FRAMEWORK_BASENAMES.includes(basename)) continue;
      }
      candidates.push(filePath);
    }
  }
  const canonicalRoot = await realpath(repoRoot);
  const rootEntries = await readdir(canonicalRoot, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (nextRootSpecialPath(entry.name)) {
      if (!entry.isFile()) {
        throw new PromotionGateError(
          "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT",
          "A root-level framework special entry is not a regular file.",
          { pathDigest: fingerprint(entry.name) },
          "blocked"
        );
      }
      if (!CANONICAL_RUNTIME_SPECIAL_FILES.includes(entry.name)) candidates.push(entry.name);
    }
  }
  const srcEntries = await existingSnapshotFiles(repoRoot, "src");
  for (const filePath of srcEntries) {
    if (nextRootSpecialPath(filePath)) candidates.push(filePath);
  }
  return [...new Set(candidates)].sort(codePointCompare);
}

async function observeRuntimeResolverConfig(repoRoot) {
  const canonicalRoot = await realpath(repoRoot);
  const nextConfigNames = new Set([
    "next.config.js", "next.config.mjs", "next.config.cjs", "next.config.ts",
    "next.config.mts", "next.config.cts"
  ]);
  const rootEntries = await readdir(canonicalRoot, { withFileTypes: true });
  const observedNextConfigs = rootEntries
    .filter((entry) => nextConfigNames.has(entry.name))
    .sort((left, right) => codePointCompare(left.name, right.name));
  if (
    observedNextConfigs.length !== 1 ||
    observedNextConfigs[0].name !== "next.config.ts" ||
    !observedNextConfigs[0].isFile()
  ) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "Exactly one regular next.config.ts is permitted; alternate Next config names and symlinks are blocked.",
      { observedConfigCount: observedNextConfigs.length },
      "blocked"
    );
  }
  const loadedByPath = {};
  for (const configPath of RUNTIME_RESOLVER_CONFIG_PATHS) {
    loadedByPath[configPath] = await readAuthoritativeFile(repoRoot, configPath);
  }
  const tsconfigSource = decodeRuntimeSource(loadedByPath["tsconfig.json"].bytes, "tsconfig.json");
  const parsedTsconfig = ts.parseConfigFileTextToJson("tsconfig.json", tsconfigSource);
  if (parsedTsconfig.error || !isPlainObject(parsedTsconfig.config)) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_INVALID",
      "tsconfig.json could not be parsed under the frozen resolver policy.",
      {},
      "blocked"
    );
  }
  if (parsedTsconfig.config.extends !== undefined) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "The root tsconfig must not inherit an unobserved resolver configuration.",
      {},
      "blocked"
    );
  }
  const compilerOptions = parsedTsconfig.config.compilerOptions ?? {};
  const paths = compilerOptions.paths ?? {};
  const forbiddenRootResolutionOptions = [
    "moduleSuffixes",
    "customConditions",
    "rootDirs",
    "typeRoots",
    "resolvePackageJsonExports",
    "resolvePackageJsonImports",
    "allowArbitraryExtensions",
    "allowImportingTsExtensions"
  ];
  if (
    stableJson(paths) !== stableJson({ "@/*": ["./*"] }) ||
    (compilerOptions.baseUrl !== undefined && compilerOptions.baseUrl !== null) ||
    forbiddenRootResolutionOptions.some((name) => compilerOptions[name] !== undefined) ||
    ![undefined, "bundler"].includes(compilerOptions.moduleResolution) ||
    ![undefined, true].includes(compilerOptions.resolveJsonModule)
  ) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "tsconfig path aliases or baseUrl differ from the frozen @/* resolver policy.",
      {},
      "blocked"
    );
  }
  const nextTsconfigSource = decodeRuntimeSource(
    loadedByPath["tsconfig.next.json"].bytes,
    "tsconfig.next.json"
  );
  const parsedNextTsconfig = ts.parseConfigFileTextToJson("tsconfig.next.json", nextTsconfigSource);
  const nextCompilerOptions = parsedNextTsconfig.config?.compilerOptions ?? {};
  const nextResolutionOverrides = [
    "baseUrl",
    "paths",
    "moduleResolution",
    "moduleSuffixes",
    "customConditions",
    "rootDirs",
    "typeRoots",
    "resolvePackageJsonExports",
    "resolvePackageJsonImports",
    "resolveJsonModule",
    "allowArbitraryExtensions",
    "allowImportingTsExtensions"
  ];
  if (
    parsedNextTsconfig.error ||
    parsedNextTsconfig.config?.extends !== "./tsconfig.json" ||
    !isPlainObject(nextCompilerOptions) ||
    nextResolutionOverrides.some((name) => nextCompilerOptions[name] !== undefined)
  ) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "tsconfig.next.json must continue to extend the frozen tsconfig resolver.",
      {},
      "blocked"
    );
  }
  const nextConfigSource = decodeRuntimeSource(
    loadedByPath["next.config.ts"].bytes,
    "next.config.ts"
  );
  const nextConfigFile = parseRuntimeSourceFile("next.config.ts", nextConfigSource);
  const unwrapConfigExpression = (expression) => {
    let current = expression;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) current = current.expression;
    return current;
  };
  const propertyName = (name) => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
  };
  const topLevelKeys = [];
  const inspectObjectLiteral = (expression) => {
    const current = unwrapConfigExpression(expression);
    if (!ts.isObjectLiteralExpression(current)) return false;
    for (const property of current.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = unwrapConfigExpression(property.expression);
        if (ts.isConditionalExpression(spread)) {
          if (!inspectObjectLiteral(spread.whenTrue) || !inspectObjectLiteral(spread.whenFalse)) return false;
          continue;
        }
        if (!inspectObjectLiteral(spread)) return false;
        continue;
      }
      if (
        !ts.isPropertyAssignment(property) &&
        !ts.isShorthandPropertyAssignment(property) &&
        !ts.isMethodDeclaration(property) &&
        !ts.isGetAccessorDeclaration(property) &&
        !ts.isSetAccessorDeclaration(property)
      ) return false;
      const key = propertyName(property.name);
      if (key === null) return false;
      topLevelKeys.push(key);
    }
    return true;
  };
  const declarations = [];
  const defaultExports = [];
  const references = [];
  const visitConfig = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "nextConfig"
    ) declarations.push(node);
    if (ts.isExportAssignment(node) && !node.isExportEquals) defaultExports.push(node);
    if (ts.isIdentifier(node) && node.text === "nextConfig") references.push(node);
    ts.forEachChild(node, visitConfig);
  };
  visitConfig(nextConfigFile);
  const declaration = declarations[0];
  const defaultExport = defaultExports[0];
  const safeReferences = references.every((identifier) =>
    (ts.isVariableDeclaration(identifier.parent) && identifier.parent.name === identifier) ||
    (ts.isExportAssignment(identifier.parent) && identifier.parent.expression === identifier)
  );
  const staticConfig =
    declarations.length === 1 &&
    defaultExports.length === 1 &&
    declaration?.initializer !== undefined &&
    defaultExport !== undefined &&
    ts.isIdentifier(defaultExport.expression) &&
    defaultExport.expression.text === "nextConfig" &&
    safeReferences &&
    inspectObjectLiteral(declaration.initializer);
  const forbiddenConfigKeys = new Set([
    "pageExtensions",
    "webpack",
    "turbopack",
    "experimental",
    "resolve",
    "alias"
  ]);
  if (!staticConfig || topLevelKeys.some((key) => forbiddenConfigKeys.has(key))) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "next.config.ts must remain a statically enumerable config without page-extension or resolver hooks.",
      {},
      "blocked"
    );
  }
  const jsconfigPaths = (await readdir(canonicalRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^jsconfig(?:\.[^.]+)?\.json$/u.test(entry.name))
    .map(({ name }) => name)
    .sort(codePointCompare);
  if (jsconfigPaths.length > 0) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "A jsconfig resolver is outside the zero-baseline resolver policy.",
      {},
      "blocked"
    );
  }
  return {
    schemaVersion: "promotion-runtime-resolver-policy.v1",
    parser: { name: "typescript", version: TYPESCRIPT_PARSER_VERSION },
    tsconfig: {
      path: "tsconfig.json",
      rawSha256: loadedByPath["tsconfig.json"].rawSha256,
      extends: null,
      baseUrl: null,
      paths: { "@/*": ["./*"] },
      resolutionMode: "bundler-or-default-no-overrides-v1"
    },
    nextTsconfig: {
      path: "tsconfig.next.json",
      rawSha256: loadedByPath["tsconfig.next.json"].rawSha256,
      extends: "./tsconfig.json",
      resolutionOverrides: false
    },
    nextConfig: {
      path: "next.config.ts",
      rawSha256: loadedByPath["next.config.ts"].rawSha256,
      pageExtensions: "next-default",
      configurationShape: "static-object-no-resolver-hooks-v1"
    },
    jsconfigPaths: []
  };
}

function isRuntimeModulePath(filePath) {
  return RUNTIME_MODULE_EXTENSIONS.some((extension) => filePath.endsWith(extension));
}

function decodeRuntimeSource(bytes, filePath) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PromotionGateError(
      "RUNTIME_SOURCE_UTF8_INVALID",
      "Runtime source is not valid UTF-8 and cannot be classified or parsed deterministically.",
      { pathDigest: fingerprint(filePath) },
      "blocked"
    );
  }
}

function targetSelectsCandidate(target, selectedPaths) {
  if (target === null) return false;
  for (const selectedPath of selectedPaths) {
    if (
      target === selectedPath ||
      `${target}.json` === selectedPath ||
      `${target}/index.json` === selectedPath
    ) return true;
  }
  return false;
}

function validateLiveRegistryDocument(registry, manifest) {
  try {
    assertExactKeys(
      registry,
      [
        "schemaVersion",
        "pilotUnitId",
        "roots",
        "entrypoints",
        "specialFiles",
        "classificationPolicy",
        "resolverPolicy",
        "frameworkBoundary",
        "frameworkEntrypointCount",
        "frameworkEntrypointsDigest",
        "runtimeGraph",
        "loaderPolicy",
        "sensitiveAnchors",
        "sensitiveAnchorsDigest",
        "checkIds"
      ],
      "live registry"
    );
    if (
      registry.schemaVersion !== "promotion-live-registry.v1" ||
      registry.pilotUnitId !== manifest.pilotUnitId ||
      stableJson(registry.roots) !== stableJson(manifest.liveReachability.roots) ||
      stableJson(registry.entrypoints) !== stableJson(manifest.liveReachability.entrypoints) ||
      stableJson(registry.checkIds) !== stableJson(LIVE_REGISTRY_CHECK_IDS)
    ) {
      throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry bindings or check anchors changed.");
    }
    assertExactKeys(registry.classificationPolicy, ["schemaVersion", "kinds"], "live registry classificationPolicy");
    if (
      registry.classificationPolicy.schemaVersion !== "promotion-runtime-classifier.v1" ||
      stableJson(registry.classificationPolicy.kinds) !== stableJson(RUNTIME_CLASSIFICATION_KINDS)
    ) throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry classifier policy changed.");
    validateRuntimeResolverPolicyDocument(registry.resolverPolicy);
    validateFrameworkBoundaryDocument(registry.frameworkBoundary);
    if (!Array.isArray(registry.specialFiles) || registry.specialFiles.length !== CANONICAL_RUNTIME_SPECIAL_FILES.length) {
      throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry special-file proof is incomplete.");
    }
    for (const [index, specialFile] of registry.specialFiles.entries()) {
      assertExactKeys(specialFile, ["path", "rawSha256"], `live registry specialFiles[${index}]`);
      if (specialFile.path !== CANONICAL_RUNTIME_SPECIAL_FILES[index]) {
        throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry special-file path changed.");
      }
      assertSha256(specialFile.rawSha256, `live registry specialFiles[${index}].rawSha256`);
    }
    assertSha256(registry.frameworkEntrypointsDigest, "live registry frameworkEntrypointsDigest");
    if (
      !Number.isSafeInteger(registry.frameworkEntrypointCount) ||
      registry.frameworkEntrypointCount < 0
    ) {
      throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry framework count is invalid.");
    }
    validateRuntimeGraphPolicyDocument(registry.runtimeGraph);
    validateRuntimeLoaderPolicyDocument(registry.loaderPolicy);
    if (!Array.isArray(registry.sensitiveAnchors) || registry.sensitiveAnchors.length === 0) {
      throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry sensitive anchors are missing.");
    }
    for (const [index, anchor] of registry.sensitiveAnchors.entries()) {
      assertExactKeys(anchor, ["path", "rawSha256"], `live registry sensitiveAnchors[${index}]`);
      assertSafeRepoRelativePath(anchor.path);
      assertSha256(anchor.rawSha256, `live registry sensitiveAnchors[${index}].rawSha256`);
    }
    if (registry.sensitiveAnchorsDigest !== fingerprint(registry.sensitiveAnchors)) {
      throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry sensitive-anchor digest is invalid.");
    }
  } catch (error) {
    if (error instanceof PromotionGateError && error.code === "LIVE_REGISTRY_MISMATCH") throw error;
    throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry does not match its strict v1 contract.");
  }
  return registry;
}

function validateRuntimeResolverPolicyDocument(policy) {
  try {
    assertExactKeys(policy, [
      "schemaVersion", "parser", "tsconfig", "nextTsconfig", "nextConfig", "jsconfigPaths"
    ], "runtime resolver policy");
    assertExactKeys(policy.parser, ["name", "version"], "runtime resolver parser");
    assertExactKeys(
      policy.tsconfig,
      ["path", "rawSha256", "extends", "baseUrl", "paths", "resolutionMode"],
      "runtime resolver tsconfig"
    );
    assertExactKeys(
      policy.nextTsconfig,
      ["path", "rawSha256", "extends", "resolutionOverrides"],
      "runtime resolver next tsconfig"
    );
    assertExactKeys(
      policy.nextConfig,
      ["path", "rawSha256", "pageExtensions", "configurationShape"],
      "runtime resolver next config"
    );
    if (
      policy.schemaVersion !== "promotion-runtime-resolver-policy.v1" ||
      policy.parser.name !== "typescript" ||
      policy.parser.version !== TYPESCRIPT_PARSER_VERSION ||
      policy.tsconfig.path !== "tsconfig.json" ||
      policy.tsconfig.extends !== null ||
      policy.tsconfig.baseUrl !== null ||
      stableJson(policy.tsconfig.paths) !== stableJson({ "@/*": ["./*"] }) ||
      policy.tsconfig.resolutionMode !== "bundler-or-default-no-overrides-v1" ||
      policy.nextTsconfig.path !== "tsconfig.next.json" ||
      policy.nextTsconfig.extends !== "./tsconfig.json" ||
      policy.nextTsconfig.resolutionOverrides !== false ||
      policy.nextConfig.path !== "next.config.ts" ||
      policy.nextConfig.pageExtensions !== "next-default" ||
      policy.nextConfig.configurationShape !== "static-object-no-resolver-hooks-v1" ||
      !Array.isArray(policy.jsconfigPaths) || policy.jsconfigPaths.length !== 0
    ) throw new Error("invalid resolver policy");
    for (const digest of [
      policy.tsconfig.rawSha256,
      policy.nextTsconfig.rawSha256,
      policy.nextConfig.rawSha256
    ]) assertSha256(digest, "runtime resolver config rawSha256");
  } catch {
    throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry resolver policy is invalid.");
  }
  return policy;
}

function validateFrameworkBoundaryDocument(boundary) {
  try {
    assertExactKeys(boundary, [
      "schemaVersion",
      "alternateRoots",
      "rootSpecialBasenames",
      "alternateEntrypoints",
      "alternateEntrypointsDigest"
    ], "framework entrypoint boundary");
    if (
      boundary.schemaVersion !== "promotion-framework-entrypoint-boundary.v1" ||
      stableJson(boundary.alternateRoots) !== stableJson(["pages", "src/app", "src/pages"]) ||
      stableJson(boundary.rootSpecialBasenames) !== stableJson(NEXT_ROOT_SPECIAL_BASENAMES) ||
      !Array.isArray(boundary.alternateEntrypoints) ||
      boundary.alternateEntrypoints.some((filePath) => {
        assertSafeRepoRelativePath(filePath);
        return false;
      }) ||
      boundary.alternateEntrypointsDigest !== fingerprint(boundary.alternateEntrypoints)
    ) throw new Error("invalid framework boundary");
  } catch {
    throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry framework boundary is invalid.");
  }
  return boundary;
}

function validateRuntimeGraphPolicyDocument(policy) {
  try {
    assertExactKeys(policy, [
      "parser", "seedCount", "seedDigest", "reachablePathCount", "reachablePathsDigest",
      "edgeCount", "edgeDigest", "topologyEdgeCount", "topologyEdgeDigest"
    ], "runtime graph policy");
    assertExactKeys(policy.parser, ["name", "version"], "runtime graph parser");
    if (
      policy.parser.name !== "typescript" || policy.parser.version !== TYPESCRIPT_PARSER_VERSION ||
      !Number.isSafeInteger(policy.seedCount) || policy.seedCount < CANONICAL_RUNTIME_ENTRYPOINTS.length ||
      !Number.isSafeInteger(policy.reachablePathCount) || policy.reachablePathCount < policy.seedCount ||
      !Number.isSafeInteger(policy.edgeCount) || policy.edgeCount < 0 ||
      !Number.isSafeInteger(policy.topologyEdgeCount) || policy.topologyEdgeCount < 0
    ) throw new Error("invalid runtime graph counts");
    for (const field of ["seedDigest", "reachablePathsDigest", "edgeDigest", "topologyEdgeDigest"]) {
      assertSha256(policy[field], `runtime graph policy ${field}`);
    }
  } catch {
    throw new PromotionGateError("LIVE_REGISTRY_MISMATCH", "Live registry runtime graph policy is invalid.");
  }
  return policy;
}

function validateRuntimeLoaderPolicyDocument(policy) {
  try {
    assertExactKeys(policy, [
      "schemaVersion",
      "parser",
      "fsReadAllowlist",
      "fsReadAllowlistDigest",
      "nextDynamic",
      "importMetaUrlReferences",
      "importMetaUrlReferencesDigest",
      "zeroBaselineKinds",
      "zeroBaselineCallCount"
    ], "runtime loader policy");
    assertExactKeys(policy.parser, ["name", "version"], "runtime loader parser");
    assertExactKeys(policy.nextDynamic, [
      "callCount", "literalImportCount", "nonliteralImportCount", "callsiteDigest"
    ], "runtime next/dynamic policy");
    if (
      policy.schemaVersion !== "promotion-runtime-loader-policy.v1" ||
      policy.parser.name !== "typescript" ||
      policy.parser.version !== TYPESCRIPT_PARSER_VERSION ||
      stableJson(policy.zeroBaselineKinds) !== stableJson(ZERO_BASELINE_LOADER_KINDS) ||
      policy.zeroBaselineCallCount !== 0 ||
      !Array.isArray(policy.fsReadAllowlist) ||
      !Array.isArray(policy.importMetaUrlReferences)
    ) {
      throw new Error("invalid loader policy scalars");
    }
    for (const [index, entry] of policy.fsReadAllowlist.entries()) {
      assertExactKeys(entry, [
        "sourcePath", "sourceRawSha256", "callee", "position", "argumentShape",
        "normalizedExpressionDigest", "policy"
      ], `runtime loader fsReadAllowlist[${index}]`);
      assertSafeRepoRelativePath(entry.sourcePath);
      assertSha256(entry.sourceRawSha256, `runtime loader fsReadAllowlist[${index}].sourceRawSha256`);
      assertSha256(entry.normalizedExpressionDigest, `runtime loader fsReadAllowlist[${index}].normalizedExpressionDigest`);
      if (
        !Number.isSafeInteger(entry.position) || entry.position < 0 ||
        !["node:fs.readFile", "node:fs/promises.readFile"].includes(entry.callee) ||
        typeof entry.argumentShape !== "string" || entry.argumentShape === "" ||
        entry.policy !== "runtime-storage-read-only-non-module"
      ) throw new Error("invalid fs loader entry");
    }
    for (const [index, entry] of policy.importMetaUrlReferences.entries()) {
      assertExactKeys(entry, ["sourcePath", "sourceRawSha256", "specifier"], `runtime loader importMetaUrlReferences[${index}]`);
      assertSafeRepoRelativePath(entry.sourcePath);
      assertSha256(entry.sourceRawSha256, `runtime loader importMetaUrlReferences[${index}].sourceRawSha256`);
      if (typeof entry.specifier !== "string" || entry.specifier === "") throw new Error("invalid import.meta URL reference");
    }
    if (
      policy.fsReadAllowlistDigest !== fingerprint(policy.fsReadAllowlist) ||
      policy.importMetaUrlReferencesDigest !== fingerprint(policy.importMetaUrlReferences) ||
      !Number.isSafeInteger(policy.nextDynamic.callCount) || policy.nextDynamic.callCount < 0 ||
      !Number.isSafeInteger(policy.nextDynamic.literalImportCount) || policy.nextDynamic.literalImportCount < 0 ||
      policy.nextDynamic.nonliteralImportCount !== 0
    ) throw new Error("invalid loader policy digest/count");
    assertSha256(policy.nextDynamic.callsiteDigest, "runtime loader nextDynamic.callsiteDigest");
  } catch (error) {
    if (error instanceof PromotionGateError && error.code === "LIVE_REGISTRY_MISMATCH") throw error;
    throw new PromotionGateError(
      "LIVE_REGISTRY_MISMATCH",
      "Live registry runtime loader policy does not match its strict v1 contract."
    );
  }
  return policy;
}

const REPO_MODULE_SUFFIXES = Object.freeze([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts",
  ".json", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3"
]);

function resolveExistingRepoModule(importerPath, specifier, availablePaths) {
  const unresolvedTarget = resolveRepoModuleSpecifier(importerPath, specifier);
  if (unresolvedTarget === null) return { external: true, target: null };
  try {
    assertSafeRepoRelativePath(unresolvedTarget);
  } catch {
    throw new PromotionGateError(
      "UNRESOLVED_STATIC_IMPORT",
      "A runtime import resolves outside the trusted repository surface.",
      { importerPathDigest: fingerprint(importerPath), specifierDigest: fingerprint(specifier) },
      "blocked"
    );
  }
  const candidates = [unresolvedTarget];
  const hasRegisteredExtension = REPO_MODULE_SUFFIXES.some((suffix) => unresolvedTarget.endsWith(suffix));
  if (!hasRegisteredExtension) {
    for (const suffix of REPO_MODULE_SUFFIXES) candidates.push(`${unresolvedTarget}${suffix}`);
    for (const suffix of REPO_MODULE_SUFFIXES) candidates.push(`${unresolvedTarget}/index${suffix}`);
  }
  const resolvedCandidates = [...new Set(candidates.filter((candidate) => availablePaths.has(candidate)))];
  if (resolvedCandidates.length > 1) {
    throw new PromotionGateError(
      "AMBIGUOUS_INTERNAL_IMPORT",
      "An extensionless runtime import resolves to more than one tracked target.",
      { importerPathDigest: fingerprint(importerPath), specifierDigest: fingerprint(specifier), candidateCount: resolvedCandidates.length },
      "blocked"
    );
  }
  const target = resolvedCandidates[0] ?? null;
  return { external: false, target, unresolvedTarget };
}

async function buildRuntimeReachabilityGraph(
  repoRoot,
  manifest,
  actualFiles,
  classificationByPath,
  detachedTargets = new Set()
) {
  const frameworkEntrypoints = deriveFrameworkRuntimeEntrypoints(actualFiles);
  const availablePaths = new Set([...actualFiles, ...manifest.liveReachability.specialFiles]);
  const runtimeSeeds = [...new Set([
    ...manifest.liveReachability.entrypoints,
    ...frameworkEntrypoints,
    ...manifest.liveReachability.specialFiles
  ])].sort(codePointCompare);
  const reachablePaths = new Set();
  const edges = [];
  const detachedEdges = [];
  const unresolvedCalls = [];
  const fsReads = [];
  const nextDynamicCalls = [];
  const zeroBaselineCalls = [];
  const importMetaUrlReferences = [];
  const queue = [...runtimeSeeds];
  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (reachablePaths.has(currentPath)) continue;
    if (!availablePaths.has(currentPath)) {
      throw new PromotionGateError(
        "LIVE_REGISTRY_COVERAGE_MISMATCH",
        "A trusted runtime entrypoint is missing from the registered surface.",
        { pathDigest: fingerprint(currentPath) },
        "blocked"
      );
    }
    reachablePaths.add(currentPath);
    const classification = classificationByPath.get(currentPath) ?? "runtime-code";
    if (["test-code", "audit-script"].includes(classification)) {
      throw new PromotionGateError(
        "LIVE_CLASSIFICATION_CONFLICT",
        "A test or audit module is reachable from a trusted runtime entrypoint.",
        { pathDigest: fingerprint(currentPath), classification },
        "blocked"
      );
    }
    if (!isRuntimeModulePath(currentPath)) continue;
    const loaded = await readAuthoritativeFile(repoRoot, currentPath);
    let references;
    let loaderAnalysis;
    try {
      const source = decodeRuntimeSource(loaded.bytes, currentPath);
      references = analyzeRuntimeModuleReferences(currentPath, source);
      loaderAnalysis = analyzeRuntimeLoaderCalls(currentPath, source);
    } catch (error) {
      if (error instanceof PromotionGateError) {
        error.details = { ...(error.details ?? {}), pathDigest: fingerprint(currentPath) };
      }
      throw error;
    }
    fsReads.push(...loaderAnalysis.fsReads.map((call) => ({
      sourcePath: currentPath,
      sourceRawSha256: loaded.rawSha256,
      ...call
    })));
    nextDynamicCalls.push(...loaderAnalysis.nextDynamicCalls.map((call) => ({
      sourcePath: currentPath,
      sourceRawSha256: loaded.rawSha256,
      ...call
    })));
    zeroBaselineCalls.push(...loaderAnalysis.zeroBaselineCalls.map((call) => ({
      sourcePath: currentPath,
      sourceRawSha256: loaded.rawSha256,
      ...call
    })));
    importMetaUrlReferences.push(...loaderAnalysis.importMetaUrlReferences.map((specifier) => ({
      sourcePath: currentPath,
      sourceRawSha256: loaded.rawSha256,
      specifier
    })));
    for (const unresolvedCall of references.unresolvedCalls) {
      unresolvedCalls.push({ path: currentPath, call: unresolvedCall.call });
    }
    const moduleAndAssetReferences = [
      ...references.references,
      ...loaderAnalysis.importMetaUrlReferences.map((specifier) => ({
        kind: "import-meta-url",
        specifier,
        typeOnly: false
      }))
    ];
    for (const reference of moduleAndAssetReferences) {
      const { specifier } = reference;
      const resolution = resolveExistingRepoModule(currentPath, specifier, availablePaths);
      if (resolution.external) continue;
      if (targetSelectsCandidate(resolution.unresolvedTarget, detachedTargets)) {
        detachedEdges.push({ from: currentPath, specifier, target: resolution.unresolvedTarget });
        continue;
      }
      if (resolution.target === null) {
        throw new PromotionGateError(
          "UNRESOLVED_STATIC_IMPORT",
          "A repository-relative runtime import cannot be resolved against the tracked live surface.",
          { importerPathDigest: fingerprint(currentPath), specifierDigest: fingerprint(specifier) },
          "blocked"
        );
      }
      edges.push({
        from: currentPath,
        specifier,
        target: resolution.target,
        kind: reference.kind,
        typeOnly: false
      });
      if (!reachablePaths.has(resolution.target)) queue.push(resolution.target);
    }
  }
  const sortedEdges = edges
    .map(({ from, specifier, target, kind, typeOnly }) => ({
      from,
      specifier,
      to: target,
      kind,
      typeOnly
    }))
    .sort((left, right) => codePointCompare(
      [left.from, left.specifier, left.to, left.kind, left.typeOnly ? "1" : "0"].join("\0"),
      [right.from, right.specifier, right.to, right.kind, right.typeOnly ? "1" : "0"].join("\0")
    ));
  const topologyEdges = [...new Map(
    sortedEdges.map(({ from, to }) => [[from, to].join("\0"), { from, to }])
  ).values()].sort((left, right) =>
    codePointCompare([left.from, left.to].join("\0"), [right.from, right.to].join("\0"))
  );
  return {
    frameworkEntrypoints,
    runtimeSeeds,
    reachablePaths,
    edges: sortedEdges,
    topologyEdges,
    detachedEdges,
    unresolvedCalls,
    loaderInventory: {
      fsReads: fsReads.sort((left, right) => codePointCompare(
        [left.sourcePath, String(left.position), left.callee].join("\0"),
        [right.sourcePath, String(right.position), right.callee].join("\0")
      )),
      nextDynamicCalls: nextDynamicCalls.sort((left, right) => codePointCompare(
        [left.sourcePath, String(left.position)].join("\0"),
        [right.sourcePath, String(right.position)].join("\0")
      )),
      zeroBaselineCalls: zeroBaselineCalls.sort((left, right) => codePointCompare(
        [left.sourcePath, String(left.position), left.kind].join("\0"),
        [right.sourcePath, String(right.position), right.kind].join("\0")
      )),
      importMetaUrlReferences: importMetaUrlReferences.sort((left, right) => codePointCompare(
        [left.sourcePath, left.specifier].join("\0"),
        [right.sourcePath, right.specifier].join("\0")
      ))
    }
  };
}

function projectRuntimeLoaderPolicy(loaderInventory) {
  const fsReadAllowlist = loaderInventory.fsReads.map(({
    sourcePath,
    sourceRawSha256,
    callee,
    position,
    argumentShape,
    normalizedExpressionDigest,
    policy
  }) => ({
    sourcePath,
    sourceRawSha256,
    callee,
    position,
    argumentShape,
    normalizedExpressionDigest,
    policy
  }));
  const nextDynamicCallsites = loaderInventory.nextDynamicCalls.map(({
    sourcePath,
    sourceRawSha256,
    position,
    literalImports,
    nonliteralImportCount,
    normalizedExpressionDigest
  }) => ({
    sourcePath,
    sourceRawSha256,
    position,
    literalImports,
    nonliteralImportCount,
    normalizedExpressionDigest
  }));
  const importMetaUrlReferences = loaderInventory.importMetaUrlReferences.map(({
    sourcePath,
    sourceRawSha256,
    specifier
  }) => ({ sourcePath, sourceRawSha256, specifier }));
  return {
    schemaVersion: "promotion-runtime-loader-policy.v1",
    parser: { name: "typescript", version: TYPESCRIPT_PARSER_VERSION },
    fsReadAllowlist,
    fsReadAllowlistDigest: fingerprint(fsReadAllowlist),
    nextDynamic: {
      callCount: nextDynamicCallsites.length,
      literalImportCount: nextDynamicCallsites.reduce(
        (count, callsite) => count + callsite.literalImports.length,
        0
      ),
      nonliteralImportCount: nextDynamicCallsites.reduce(
        (count, callsite) => count + callsite.nonliteralImportCount,
        0
      ),
      callsiteDigest: fingerprint(nextDynamicCallsites)
    },
    importMetaUrlReferences,
    importMetaUrlReferencesDigest: fingerprint(importMetaUrlReferences),
    zeroBaselineKinds: [...ZERO_BASELINE_LOADER_KINDS],
    zeroBaselineCallCount: loaderInventory.zeroBaselineCalls.length
  };
}

function projectRuntimeGraphPolicy(graph) {
  const reachablePaths = [...graph.reachablePaths].sort(codePointCompare);
  return {
    parser: { name: "typescript", version: TYPESCRIPT_PARSER_VERSION },
    seedCount: graph.runtimeSeeds.length,
    seedDigest: fingerprint(graph.runtimeSeeds),
    reachablePathCount: reachablePaths.length,
    reachablePathsDigest: fingerprint(reachablePaths),
    edgeCount: graph.edges.length,
    edgeDigest: fingerprint(graph.edges),
    topologyEdgeCount: graph.topologyEdges.length,
    topologyEdgeDigest: fingerprint(graph.topologyEdges)
  };
}

export async function observeCanonicalRuntimePolicy(repoRoot, manifest) {
  validatePromotionManifest(manifest);
  const resolverPolicy = await observeRuntimeResolverConfig(repoRoot);
  const alternateEntrypoints = await deriveAlternateFrameworkEntrypoints(repoRoot);
  if (alternateEntrypoints.length > 0) {
    throw new PromotionGateError(
      "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT",
      "An alternate Next.js runtime entrypoint exists outside the frozen app/ and middleware surface.",
      { alternateEntrypointDigests: alternateEntrypoints.map((filePath) => fingerprint(filePath)) },
      "blocked"
    );
  }
  const frameworkBoundary = {
    schemaVersion: "promotion-framework-entrypoint-boundary.v1",
    alternateRoots: ["pages", "src/app", "src/pages"],
    rootSpecialBasenames: [...NEXT_ROOT_SPECIAL_BASENAMES],
    alternateEntrypoints,
    alternateEntrypointsDigest: fingerprint(alternateEntrypoints)
  };
  const snapshot = await snapshotRepoPaths(repoRoot, CANONICAL_RUNTIME_ROOTS);
  const actualFiles = snapshot.files.map(({ path: filePath }) => filePath).sort(codePointCompare);
  const classificationPaths = new Map(RUNTIME_CLASSIFICATION_KINDS.map((kind) => [kind, []]));
  const classificationByPath = new Map();
  for (const coveredPath of actualFiles) {
    const loaded = await readAuthoritativeFile(repoRoot, coveredPath);
    const shouldDecodeSource = isRuntimeModulePath(coveredPath) || coveredPath.endsWith(".css");
    const sourcePrefix = shouldDecodeSource
      ? decodeRuntimeSource(loaded.bytes, coveredPath).slice(0, 4096)
      : "";
    const classification = classifyRuntimeSurfacePath(coveredPath, sourcePrefix);
    classificationByPath.set(coveredPath, classification);
    classificationPaths.get(classification).push(coveredPath);
  }
  const classifications = RUNTIME_CLASSIFICATION_KINDS.map((kind) => ({
    kind,
    count: classificationPaths.get(kind).length,
    pathsDigest: fingerprint(classificationPaths.get(kind))
  }));
  const frameworkEntrypoints = deriveFrameworkRuntimeEntrypoints(actualFiles);
  const specialFiles = [];
  for (const specialPath of CANONICAL_RUNTIME_SPECIAL_FILES) {
    const loaded = await readAuthoritativeFile(repoRoot, specialPath);
    decodeRuntimeSource(loaded.bytes, specialPath);
    specialFiles.push({ path: specialPath, rawSha256: loaded.rawSha256 });
    classificationByPath.set(specialPath, "runtime-code");
  }
  const graph = await buildRuntimeReachabilityGraph(
    repoRoot,
    manifest,
    actualFiles,
    classificationByPath,
    new Set(manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath))
  );
  if (graph.loaderInventory.zeroBaselineCalls.length > 0) {
    throw new PromotionGateError(
      "UNREGISTERED_RUNTIME_LOADER",
      "A zero-baseline runtime loader capability is reachable from the trusted entrypoint graph.",
      {
        calls: graph.loaderInventory.zeroBaselineCalls.map(({ sourcePath, kind, position }) => ({
          sourcePathDigest: fingerprint(sourcePath),
          kind,
          position
        }))
      },
      "blocked"
    );
  }
  const sensitiveAnchorPaths = [...new Set([
    ...CANONICAL_RUNTIME_ENTRYPOINTS,
    ...CANONICAL_RUNTIME_SPECIAL_FILES,
    ...RUNTIME_RESOLVER_CONFIG_PATHS
  ])].sort(codePointCompare);
  const sensitiveAnchors = [];
  for (const anchorPath of sensitiveAnchorPaths) {
    const loaded = await readAuthoritativeFile(repoRoot, anchorPath);
    sensitiveAnchors.push({ path: anchorPath, rawSha256: loaded.rawSha256 });
  }
  return {
    snapshot,
    actualFiles,
    classifications,
    resolverPolicy,
    frameworkBoundary,
    frameworkEntrypoints,
    specialFiles,
    graph,
    graphPolicy: projectRuntimeGraphPolicy(graph),
    loaderPolicy: projectRuntimeLoaderPolicy(graph.loaderInventory),
    sensitiveAnchors,
    sensitiveAnchorsDigest: fingerprint(sensitiveAnchors),
    rawObservation: {
      coveredFileCount: actualFiles.length,
      coveredFilesDigest: fingerprint(actualFiles),
      coveredFilesAggregateDigest: snapshot.digest,
      classifications,
      classificationDigest: fingerprint(classifications)
    }
  };
}

export async function scanLiveReachability(repoRoot, manifest) {
  validatePromotionManifest(manifest);
  const { loaded: loadedRegistry, value: registryValue } = await loadAuthoritativeJson(
    repoRoot,
    manifest.liveReachability.registry.path,
    "LIVE_REGISTRY_JSON_INVALID",
    "Live reachability registry"
  );
  if (loadedRegistry.rawSha256 !== manifest.liveReachability.registry.rawSha256) {
    throw new PromotionGateError(
      "LIVE_REGISTRY_DIGEST_MISMATCH",
      "Live registry bytes do not match the manifest binding."
    );
  }
  const registry = validateLiveRegistryDocument(registryValue, manifest);
  const observedResolverPolicy = await observeRuntimeResolverConfig(repoRoot);
  if (stableJson(observedResolverPolicy) !== stableJson(registry.resolverPolicy)) {
    throw new PromotionGateError(
      "RUNTIME_RESOLVER_CONFIG_DRIFT",
      "Runtime resolver configuration differs from the reviewed live registry.",
      {},
      "blocked"
    );
  }
  const alternateEntrypoints = await deriveAlternateFrameworkEntrypoints(repoRoot);
  const observedFrameworkBoundary = {
    schemaVersion: "promotion-framework-entrypoint-boundary.v1",
    alternateRoots: ["pages", "src/app", "src/pages"],
    rootSpecialBasenames: [...NEXT_ROOT_SPECIAL_BASENAMES],
    alternateEntrypoints,
    alternateEntrypointsDigest: fingerprint(alternateEntrypoints)
  };
  if (
    alternateEntrypoints.length > 0 ||
    stableJson(observedFrameworkBoundary) !== stableJson(registry.frameworkBoundary)
  ) {
    throw new PromotionGateError(
      "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT",
      "The derived Next.js entrypoint surface differs from the frozen zero-alternate baseline.",
      { alternateEntrypointDigests: alternateEntrypoints.map((filePath) => fingerprint(filePath)) },
      "blocked"
    );
  }
  const snapshot = await snapshotRepoPaths(repoRoot, manifest.liveReachability.roots);
  const actualFiles = snapshot.files.map(({ path: filePath }) => filePath).sort(codePointCompare);
  const specialFiles = [];
  for (const specialPath of manifest.liveReachability.specialFiles) {
    const loaded = await readAuthoritativeFile(repoRoot, specialPath);
    specialFiles.push({ path: specialPath, rawSha256: loaded.rawSha256 });
  }
  if (
    stableJson(specialFiles) !== stableJson(registry.specialFiles) ||
    manifest.liveReachability.entrypoints.some((entrypoint) => !actualFiles.includes(entrypoint))
  ) {
    throw new PromotionGateError(
      "LIVE_REGISTRY_COVERAGE_MISMATCH",
      "Declared live roots contain missing, new, or unregistered files.",
      { actualFileCount: actualFiles.length }
    );
  }
  const selectedPaths = new Set(manifest.candidateArtifacts.map((artifact) => artifact.path));
  const identityMarkers = [
    manifest.pilotUnitId,
    manifest.parentPackage.id,
    ...manifest.candidateArtifacts.map((artifact) => artifact.id),
    ...manifest.candidateArtifacts.map((artifact) => artifact.path)
  ];
  const matches = [];
  const unresolved = [];
  const excludedNonRuntimeMatches = [];
  const classificationPaths = new Map(RUNTIME_CLASSIFICATION_KINDS.map((kind) => [kind, []]));
  const classificationByPath = new Map();
  const allMarkerHits = [];
  for (const coveredPath of actualFiles) {
    const loaded = await readAuthoritativeFile(repoRoot, coveredPath);
    const shouldDecodeSource = isRuntimeModulePath(coveredPath) || coveredPath.endsWith(".css");
    const sourcePrefix = shouldDecodeSource
      ? decodeRuntimeSource(loaded.bytes, coveredPath).slice(0, 4096)
      : "";
    const classification = classifyRuntimeSurfacePath(coveredPath, sourcePrefix);
    classificationByPath.set(coveredPath, classification);
    classificationPaths.get(classification).push(coveredPath);
    for (const marker of identityMarkers) {
      if (loaded.bytes.includes(Buffer.from(marker))) {
        allMarkerHits.push({ path: coveredPath, classification, marker });
      }
    }
  }
  for (const specialPath of manifest.liveReachability.specialFiles) {
    const loaded = await readAuthoritativeFile(repoRoot, specialPath);
    decodeRuntimeSource(loaded.bytes, specialPath);
    classificationByPath.set(specialPath, "runtime-code");
    for (const marker of identityMarkers) {
      if (loaded.bytes.includes(Buffer.from(marker))) {
        allMarkerHits.push({ path: specialPath, classification: "runtime-code", marker });
      }
    }
  }

  const observedClassifications = RUNTIME_CLASSIFICATION_KINDS.map((kind) => ({
    kind,
    count: classificationPaths.get(kind).length,
    pathsDigest: fingerprint(classificationPaths.get(kind))
  }));
  const frameworkEntrypoints = deriveFrameworkRuntimeEntrypoints(actualFiles);
  if (
    frameworkEntrypoints.length !== registry.frameworkEntrypointCount ||
    fingerprint(frameworkEntrypoints) !== registry.frameworkEntrypointsDigest
  ) {
    throw new PromotionGateError(
      "LIVE_REGISTRY_CLASSIFICATION_MISMATCH",
      "Runtime classifications or derived Next entrypoints differ from the trusted registry.",
      {},
      "blocked"
    );
  }

  const graph = await buildRuntimeReachabilityGraph(
    repoRoot,
    manifest,
    actualFiles,
    classificationByPath,
    selectedPaths
  );
  const { runtimeSeeds, reachablePaths, edges, topologyEdges } = graph;
  unresolved.push(...graph.unresolvedCalls);
  matches.push(...graph.detachedEdges.map(({ from, specifier, target }) => ({
    path: from,
    kind: "candidate-import",
    specifier,
    target
  })));
  for (const hit of allMarkerHits) {
    if (["test-code", "audit-script"].includes(hit.classification) && !reachablePaths.has(hit.path)) {
      excludedNonRuntimeMatches.push(hit);
      continue;
    }
    matches.push({ path: hit.path, kind: "identity-marker", marker: hit.marker });
  }
  if (unresolved.length > 0) {
    throw new PromotionGateError(
      "UNRESOLVED_DYNAMIC_IMPORT",
      "A nonliteral dynamic import under a declared live root cannot be resolved statically.",
      { unresolvedDynamicImports: unresolved },
      "blocked"
    );
  }
  if (matches.length > 0) {
    throw new PromotionGateError(
      "LIVE_CANDIDATE_REACHABLE",
      "The selected candidate is reachable or named from a configured live surface.",
      { matches }
    );
  }
  const observedGraphPolicy = projectRuntimeGraphPolicy(graph);
  if (stableJson(observedGraphPolicy) !== stableJson(registry.runtimeGraph)) {
    throw new PromotionGateError(
      "RUNTIME_GRAPH_POLICY_MISMATCH",
      "The derived framework/runtime graph differs from the reviewed live registry.",
      {
        observedDigest: fingerprint(observedGraphPolicy),
        expectedDigest: fingerprint(registry.runtimeGraph)
      },
      "blocked"
    );
  }
  if (graph.loaderInventory.zeroBaselineCalls.length > 0) {
    throw new PromotionGateError(
      "UNREGISTERED_RUNTIME_LOADER",
      "A zero-baseline runtime loader capability is reachable from the trusted entrypoint graph.",
      {
        calls: graph.loaderInventory.zeroBaselineCalls.map(({ sourcePath, kind, position }) => ({
          sourcePathDigest: fingerprint(sourcePath),
          kind,
          position
        }))
      },
      "blocked"
    );
  }
  const observedLoaderPolicy = projectRuntimeLoaderPolicy(graph.loaderInventory);
  if (stableJson(observedLoaderPolicy) !== stableJson(registry.loaderPolicy)) {
    throw new PromotionGateError(
      "RUNTIME_LOADER_POLICY_MISMATCH",
      "Runtime loader callsites differ from the reviewed live-registry policy.",
      {
        observedDigest: fingerprint(observedLoaderPolicy),
        expectedDigest: fingerprint(registry.loaderPolicy)
      },
      "blocked"
    );
  }
  const observedSensitiveAnchors = [];
  for (const anchor of registry.sensitiveAnchors) {
    const loaded = await readAuthoritativeFile(repoRoot, anchor.path);
    observedSensitiveAnchors.push({ path: anchor.path, rawSha256: loaded.rawSha256 });
  }
  if (
    stableJson(observedSensitiveAnchors) !== stableJson(registry.sensitiveAnchors) ||
    fingerprint(observedSensitiveAnchors) !== registry.sensitiveAnchorsDigest
  ) {
    throw new PromotionGateError(
      "LIVE_SENSITIVE_ANCHOR_DRIFT",
      "A candidate-sensitive runtime anchor changed from the reviewed live registry.",
      {},
      "blocked"
    );
  }
  const result = {
    policy: manifest.liveReachability.policy,
    result: "pass",
    selectedCandidateReachable: false,
    scannedPaths: [...actualFiles, ...manifest.liveReachability.specialFiles].sort(codePointCompare),
    matches: [],
    unresolvedDynamicImports: [],
    excludedNonRuntimeMatches,
    runtimeGraph: observedGraphPolicy,
    loaderPolicyProof: observedLoaderPolicy,
    rawObservation: {
      coveredFileCount: actualFiles.length,
      coveredFilesDigest: fingerprint(actualFiles),
      coveredFilesAggregateDigest: snapshot.digest,
      classifications: observedClassifications,
      classificationDigest: fingerprint(observedClassifications)
    },
    registryProof: {
      rawSha256: loadedRegistry.rawSha256,
      resolverPolicyDigest: fingerprint(observedResolverPolicy),
      frameworkBoundaryDigest: fingerprint(observedFrameworkBoundary),
      frameworkEntrypointCount: registry.frameworkEntrypointCount,
      frameworkEntrypointsDigest: registry.frameworkEntrypointsDigest,
      runtimeGraphDigest: fingerprint(observedGraphPolicy),
      loaderPolicyDigest: fingerprint(observedLoaderPolicy),
      sensitiveAnchorsDigest: registry.sensitiveAnchorsDigest
    }
  };
  Object.defineProperty(result, "runtimeGraphPaths", {
    value: [...reachablePaths].sort(codePointCompare),
    enumerable: false,
    writable: false
  });
  return result;
}

export const PROMOTION_LEGACY_DRIFT_SCHEMA_VERSION = "promotion-legacy-drift.v1";

const LEGACY_ENTRY_FIELDS = Object.freeze([
  "packageId",
  "observation",
  "packageDigest",
  "contentDigest",
  "semanticDigest",
  "idSetDigest",
  "gradeDistributionDigest",
  "rootStatusDigest",
  "rowStatusDigest",
  "reachabilityDigest",
  "authorization",
  "terminalChoices",
  "remediation"
]);

const LEGACY_OBSERVED_FIELDS = Object.freeze([
  "packageId",
  "observation",
  "packageDigest",
  "contentDigest",
  "semanticDigest",
  "idSetDigest",
  "gradeDistributionDigest",
  "rootStatusDigest",
  "rowStatusDigest",
  "reachabilityDigest"
]);

const LEGACY_AUTHORIZATION_REFERENCE = "user-request-2026-08-25-promotion-shadow-v1";
const LEGACY_CONFLICT_OWNERS = Object.freeze(["A04", "A18", "A23"]);
const LEGACY_REVIEW_OWNERS = Object.freeze(["A23", "A25"]);
const LEGACY_DOWNSTREAM_EVIDENCE_OWNERS = Object.freeze(["A11", "A22"]);
const LEGACY_TERMINAL_CHOICES = Object.freeze(["recertify", "remove-live"]);
const LEGACY_AUTHORITATIVE_PACKAGE_ID = "us-ca-k5-knowledge-point-practice-v1";
const LEGACY_AUTHORITATIVE_PACKAGE_PATH =
  "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json";
export const LEGACY_INITIAL_ANCHOR_FACTS = Object.freeze([
  Object.freeze({
    path: "data/usCaliforniaTopics.ts",
    anchors: Object.freeze([
      Object.freeze({
        id: "live-package-import",
        startMarker: "import kG5KnowledgePointQuestionPackJson from \"./generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json\";",
        endMarker: "import kG5KnowledgePointQuestionPackJson from \"./generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json\";",
        sha256: "dcbda3cc9c257e0eb6e6672d5f891f86dd1f45ef5f2b9b0530eb5a6105fccc6f"
      }),
      Object.freeze({
        id: "live-status",
        startMarker: "export const californiaK5LiveContentStatus = {",
        endMarker: "} as const;",
        sha256: "7d125928fa8908c979ac34d49da963ef9d851408c3c5838f2f7eb8640e058241"
      }),
      Object.freeze({
        id: "live-pack-selection",
        startMarker: "const questionPacks = [",
        endMarker: "export const generatedCaliforniaQuestions: GeneratedCaliforniaQuestion[] = questionPacks.flatMap((pack) => pack.questions);",
        sha256: "f11768b14e7ccf2faf109542bcc2cd1c6a69c7524f4a4a21a60459eac0fec56c"
      })
    ])
  }),
  Object.freeze({
    path: "data/usCaliforniaQuestions.ts",
    anchors: Object.freeze([
      Object.freeze({
        id: "generated-import",
        startMarker: "import {\n  type CaliforniaGradeId,",
        endMarker: "} from \"./usCaliforniaTopics\";",
        sha256: "ac763e70014c3ec0feda7bf10fe8136c59e71987cf53614fa5708f9cd2c851f5"
      }),
      Object.freeze({
        id: "expected-k5-count",
        startMarker: "export const expectedUnitedStatesCaliforniaK5QuestionCount = californiaK5LiveContentStatus.practiceLive",
        endMarker: ": 0;",
        sha256: "faea6c64471af9a28f21b7ac066fc372b318c9b2e4e73b29cca742de02e7aca7"
      }),
      Object.freeze({
        id: "question-export",
        startMarker: "export const usCaliforniaQuestions: Question[] = generatedCaliforniaQuestions.map(toQuestion);",
        endMarker: "export const usCaliforniaQuestions: Question[] = generatedCaliforniaQuestions.map(toQuestion);",
        sha256: "3524fcb50075e72676429548c8e952f83b6bc96b7e2f6abab0df49f52a173251"
      })
    ])
  }),
  Object.freeze({
    path: "data/questions.ts",
    anchors: Object.freeze([
      Object.freeze({
        id: "california-import",
        startMarker: "import { usCaliforniaQuestions } from \"./usCaliforniaQuestions\";",
        endMarker: "import { usCaliforniaQuestions } from \"./usCaliforniaQuestions\";",
        sha256: "433027066d266efd62bd36d8da204a874929437845d67690b172fcf0573d2285"
      }),
      Object.freeze({
        id: "curated-spread",
        startMarker: "  ...usMathLiveQuestions.filter((question) => question.curriculumTrack !== \"US_CA_MATH\"),",
        endMarker: "  ...usCaliforniaQuestions\n];",
        sha256: "9d3012bc8ae7aa328200f57bf82bfab0c33645dea0ba7d35b3de482a3e7574d7"
      }),
      Object.freeze({
        id: "public-export",
        startMarker: "export const questions: Question[] = curatedQuestions",
        endMarker: "  .map(withGeneratedAnswerAliases);",
        sha256: "9e04930e59cae7e4cbf520c98c8b075e91860dfae76482eab1067d54d53e43f3"
      })
    ])
  }),
  Object.freeze({
    path: "lib/server/questionStore.ts",
    anchors: Object.freeze([
      Object.freeze({
        id: "us-registry",
        startMarker: "async function unitedStatesQuestions(profile: CurriculumProfile) {",
        endMarker: "  return optionalQuestionModule(async () => (await import(\"@/data/usCaliforniaQuestions\")).usCaliforniaQuestions);\n}",
        sha256: "69661576874c584e4b284d7ae4ec789d314a909e9d73c15a15d0b60e7bef8143"
      }),
      Object.freeze({
        id: "profile-dispatch",
        startMarker: "async function loadSourceQuestionsForProfile(profile: CurriculumProfile, grade?: GradeId) {",
        endMarker: "  return unitedStatesQuestions(profile);\n}",
        sha256: "45fe10a46c63293aade0018db36bda6197b3a63e1859433ff7943cadc66b22e5"
      }),
      Object.freeze({
        id: "attempt-profile",
        startMarker: "    { region: \"US\", publisher: \"US_CA_MATH\" },",
        endMarker: "    { region: \"US\", publisher: \"US_CA_MATH\" },",
        sha256: "62c38788e5e6bbfee47e422f7f0940f489db9e66b40f965b1efccf1837677040"
      })
    ])
  })
]);

const LEGACY_ANCHOR_REGISTRY = Object.freeze(LEGACY_INITIAL_ANCHOR_FACTS.map((source) => Object.freeze({
  path: source.path,
  ids: Object.freeze(source.anchors.map(({ id }) => id))
})));
const LEGACY_GRADE_DISTRIBUTION = Object.freeze({ K: 72, P1: 192, P2: 48, P3: 60, P4: 60, P5: 60 });
const LEGACY_ROOT_STATUS = Object.freeze({
  packageStatus: "candidate-only",
  reviewStatus: "accepted-two-round-internal-qa",
  integrationStatus: "candidate-only-not-live",
  nextOwner: "S18 content QA, then S23 promotion planning if owner later asks to integrate"
});
const LEGACY_GRADE_SPAN = Object.freeze(["K", "P1", "P2", "P3", "P4", "P5"]);
const LEGACY_INTRODUCED_AT = "2026-08-25T00:00:00Z";
const LEGACY_EXPIRES_AT = "2026-09-24T00:00:00Z";
const LEGACY_DISCOVERY_SCHEMA_VERSION = "promotion-legacy-discovery.v1";
export const LEGACY_INITIAL_BASELINE_FACTS = Object.freeze({
  packageId: LEGACY_AUTHORITATIVE_PACKAGE_ID,
  packagePath: LEGACY_AUTHORITATIVE_PACKAGE_PATH,
  questionCount: 492,
  uniqueIdCount: 492,
  gradeDistribution: LEGACY_GRADE_DISTRIBUTION,
  packageDigest: "c8b2ee5c2f35782dc4ca8209eca71e98edf47663dd1bdefd20963d06c163c0ab",
  semanticDigest: "9e0b871a675cd025b026a481901a0faf2bdbc9d23a5a51c5717b4d8940ee5037",
  contentDigest: "c1cfda42ea57f54b7273f871532f653f64fad1e97ad710898194c7c8decfaae4",
  idSetDigest: "a3cec371c5faade53872c83d60de835500de66c10dd218ee718354dddce66262",
  gradeDistributionDigest: "de63a7843c99884c94eec47f90e9dcaef916d412ac855492326af9ffbe1265a3",
  rootStatusDigest: "3df5d313acfdaff67551216069f3b15b6c567c2c5071f170a5fed18e8673a059",
  rowStatusDigest: "427036a1b92ea8f51e9d0bf74fbfbacef04c37a8f238347dc5723961d527acc8",
  reachabilityDigest: "f5b1337ac176a961a37c4b11b1360402a30337d5265368173995a4ac0891f9c9",
  observationDigest: "f084deef3a95732a80b20bd756de75df312f9070284acfaded908f3c63e00968",
  introducedAt: LEGACY_INTRODUCED_AT,
  expiresAt: LEGACY_EXPIRES_AT,
  authorizationReference: LEGACY_AUTHORIZATION_REFERENCE,
  accountableOwner: "A23",
  conflictOwners: LEGACY_CONFLICT_OWNERS,
  reviewOwners: LEGACY_REVIEW_OWNERS,
  downstreamEvidenceOwners: LEGACY_DOWNSTREAM_EVIDENCE_OWNERS,
  reviewReferences: Object.freeze({
    a23PromotionReview: Object.freeze({
      path: "coordination/integration/evidence/legacy-us-ca-k5-a23-ratchet-review.v1.json",
      rawSha256: "414a3672b3770a4bbd993d756f2fb183390041bb8f620b8b5e7c715ece588b4f"
    }),
    a25ReleaseIntakeReview: Object.freeze({
      path: "coordination/integration/evidence/legacy-us-ca-k5-a25-ratchet-review.v1.json",
      rawSha256: "e08590e2100c5a8136eeb942860db0bb130da9357e16de4b59b07ab17b7b076b"
    })
  }),
  terminalChoices: LEGACY_TERMINAL_CHOICES,
  remediation: "Remove the legacy live selection before ratchet expiry."
});

function validateLegacyObservation(observation, label) {
  assertExactKeys(
    observation,
    ["observerVersion", "packagePath", "reachabilityAnchors"],
    `${label}.observation`
  );
  if (observation.observerVersion !== "promotion-legacy-question-pack.v1") {
    throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy observerVersion is unsupported.");
  }
  assertSafeRepoRelativePath(observation.packagePath);
  if (observation.packagePath !== LEGACY_AUTHORITATIVE_PACKAGE_PATH) {
    throw new PromotionGateError(
      "LEGACY_ENTRY_INVALID",
      "Legacy observer must read the authoritative live package copy, never a coordination copy."
    );
  }
  if (!Array.isArray(observation.reachabilityAnchors) || observation.reachabilityAnchors.length === 0) {
    throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy observation requires reachability anchors.");
  }
  const paths = new Set();
  const foldedPaths = new Set();
  const anchorIds = new Set();
  for (const [sourceIndex, source] of observation.reachabilityAnchors.entries()) {
    assertExactKeys(source, ["path", "anchors"], `${label}.observation.reachabilityAnchors[${sourceIndex}]`);
    assertSafeRepoRelativePath(source.path);
    const foldedPath = source.path.toLocaleLowerCase("en-US");
    if (paths.has(source.path) || foldedPaths.has(foldedPath)) {
      throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy observation paths must be distinct without case collisions.");
    }
    paths.add(source.path);
    foldedPaths.add(foldedPath);
    if (!Array.isArray(source.anchors) || source.anchors.length === 0) {
      throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Each legacy reachability source requires anchors.");
    }
    for (const [anchorIndex, anchor] of source.anchors.entries()) {
      assertExactKeys(
        anchor,
        ["id", "startMarker", "endMarker", "sha256"],
        `${label}.observation.reachabilityAnchors[${sourceIndex}].anchors[${anchorIndex}]`
      );
      assertNonEmptyString(anchor.id, "legacy anchor id");
      assertNonEmptyString(anchor.startMarker, "legacy anchor startMarker");
      assertNonEmptyString(anchor.endMarker, "legacy anchor endMarker");
      assertSha256(anchor.sha256, "legacy anchor sha256");
      const foldedId = anchor.id.toLocaleLowerCase("en-US");
      if (anchorIds.has(foldedId)) {
        throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy anchor ids must be unique without case collisions.");
      }
      anchorIds.add(foldedId);
    }
  }
  const observedRegistry = observation.reachabilityAnchors.map((source) => ({
    path: source.path,
    ids: source.anchors.map(({ id }) => id)
  }));
  if (stableJson(observedRegistry) !== stableJson(LEGACY_ANCHOR_REGISTRY)) {
    throw new PromotionGateError(
      "LEGACY_ENTRY_INVALID",
      "Legacy reachability anchors must cover the exact registered four-source projection."
    );
  }
  if (stableJson(observation.reachabilityAnchors) !== stableJson(LEGACY_INITIAL_ANCHOR_FACTS)) {
    throw new PromotionGateError(
      "LEGACY_ENTRY_INVALID",
      "Legacy reachability anchor markers and normalized hashes must match the frozen twelve-anchor baseline."
    );
  }
}

function validateLegacyAuthorization(authorization, label) {
  assertExactKeys(
    authorization,
    [
      "reference",
      "accountableOwner",
      "conflictOwners",
      "reviewOwners",
      "downstreamEvidenceOwners",
      "reviewReferences"
    ],
    `${label}.authorization`
  );
  if (
    authorization.reference !== LEGACY_AUTHORIZATION_REFERENCE ||
    authorization.accountableOwner !== "A23" ||
    stableJson(authorization.conflictOwners) !== stableJson(LEGACY_CONFLICT_OWNERS) ||
    stableJson(authorization.reviewOwners) !== stableJson(LEGACY_REVIEW_OWNERS) ||
    stableJson(authorization.downstreamEvidenceOwners) !== stableJson(LEGACY_DOWNSTREAM_EVIDENCE_OWNERS)
  ) {
    throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy authorization roles or reference changed.");
  }
  assertExactKeys(
    authorization.reviewReferences,
    ["a23PromotionReview", "a25ReleaseIntakeReview"],
    `${label}.authorization.reviewReferences`
  );
  const referencePaths = new Set();
  for (const reference of Object.values(authorization.reviewReferences)) {
    assertExactKeys(reference, ["path", "rawSha256"], "legacy review reference");
    assertSafeRepoRelativePath(reference.path);
    assertSha256(reference.rawSha256, "legacy review reference rawSha256");
    if (reference.path.toLocaleLowerCase("en-US").includes("pending") || referencePaths.has(reference.path.toLocaleLowerCase("en-US"))) {
      throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy review references must be distinct authoritative paths, never pending.");
    }
    referencePaths.add(reference.path.toLocaleLowerCase("en-US"));
  }
}

function validateLegacyEntry(entry, index, seenPackageIds) {
  const label = `legacy ratchet entries[${index}]`;
  try {
    assertExactKeys(entry, LEGACY_ENTRY_FIELDS, label);
    assertNonEmptyString(entry.packageId, `${label}.packageId`);
    const foldedPackageId = entry.packageId.toLocaleLowerCase("en-US");
    if (seenPackageIds.has(foldedPackageId)) {
      throw new PromotionGateError("CASE_COLLISION", `Duplicate or case-colliding legacy packageId "${entry.packageId}".`);
    }
    seenPackageIds.add(foldedPackageId);
    validateLegacyObservation(entry.observation, label);
    for (const field of [
      "packageDigest",
      "contentDigest",
      "semanticDigest",
      "idSetDigest",
      "gradeDistributionDigest",
      "rootStatusDigest",
      "rowStatusDigest",
      "reachabilityDigest"
    ]) {
      assertSha256(entry[field], `${label}.${field}`);
    }
    validateLegacyAuthorization(entry.authorization, label);
    if (stableJson(entry.terminalChoices) !== stableJson(LEGACY_TERMINAL_CHOICES)) {
      throw new PromotionGateError("LEGACY_ENTRY_INVALID", "Legacy terminal choices must be exactly recertify or remove-live.");
    }
    assertNonEmptyString(entry.remediation, `${label}.remediation`);
  } catch (error) {
    if (error instanceof PromotionGateError && ["CASE_COLLISION", "LEGACY_ENTRY_INVALID"].includes(error.code)) throw error;
    throw new PromotionGateError("LEGACY_ENTRY_INVALID", `${label} does not match the strict v1 governance contract.`);
  }
}

function assertLegacyInitialBaselineEntry(entry) {
  const expectedObservation = {
    observerVersion: "promotion-legacy-question-pack.v1",
    packagePath: LEGACY_INITIAL_BASELINE_FACTS.packagePath,
    reachabilityAnchors: LEGACY_INITIAL_ANCHOR_FACTS
  };
  const expectedAuthorization = {
    reference: LEGACY_INITIAL_BASELINE_FACTS.authorizationReference,
    accountableOwner: LEGACY_INITIAL_BASELINE_FACTS.accountableOwner,
    conflictOwners: LEGACY_INITIAL_BASELINE_FACTS.conflictOwners,
    reviewOwners: LEGACY_INITIAL_BASELINE_FACTS.reviewOwners,
    downstreamEvidenceOwners: LEGACY_INITIAL_BASELINE_FACTS.downstreamEvidenceOwners,
    reviewReferences: LEGACY_INITIAL_BASELINE_FACTS.reviewReferences
  };
  const expectedDigests = Object.fromEntries([
    "packageDigest",
    "contentDigest",
    "semanticDigest",
    "idSetDigest",
    "gradeDistributionDigest",
    "rootStatusDigest",
    "rowStatusDigest",
    "reachabilityDigest"
  ].map((field) => [field, LEGACY_INITIAL_BASELINE_FACTS[field]]));
  const observedDigests = Object.fromEntries(Object.keys(expectedDigests).map((field) => [field, entry[field]]));
  if (
    entry.packageId !== LEGACY_INITIAL_BASELINE_FACTS.packageId ||
    stableJson(entry.observation) !== stableJson(expectedObservation) ||
    fingerprint(entry.observation) !== LEGACY_INITIAL_BASELINE_FACTS.observationDigest ||
    stableJson(observedDigests) !== stableJson(expectedDigests) ||
    stableJson(entry.authorization) !== stableJson(expectedAuthorization) ||
    stableJson(entry.terminalChoices) !== stableJson(LEGACY_INITIAL_BASELINE_FACTS.terminalChoices) ||
    entry.remediation !== LEGACY_INITIAL_BASELINE_FACTS.remediation
  ) {
    throw new PromotionGateError(
      "LEGACY_INITIAL_BASELINE_MISMATCH",
      "Promotion Gate v1 legacy ratchet must equal the single frozen initial conflict record."
    );
  }
}

export function projectLegacyObservedEntry(entry) {
  return Object.fromEntries(LEGACY_OBSERVED_FIELDS.map((field) => [field, cloneCanonical(entry[field])]));
}

function validateLegacyObservedEntry(entry, index, seenPackageIds) {
  const label = `observed legacy entries[${index}]`;
  try {
    assertExactKeys(entry, LEGACY_OBSERVED_FIELDS, label);
    assertNonEmptyString(entry.packageId, `${label}.packageId`);
    const foldedPackageId = entry.packageId.toLocaleLowerCase("en-US");
    if (seenPackageIds.has(foldedPackageId)) {
      throw new PromotionGateError("CASE_COLLISION", `Duplicate or case-colliding observed packageId "${entry.packageId}".`);
    }
    seenPackageIds.add(foldedPackageId);
    validateLegacyObservation(entry.observation, label);
    for (const field of LEGACY_OBSERVED_FIELDS.filter((field) => field.endsWith("Digest"))) {
      assertSha256(entry[field], `${label}.${field}`);
    }
  } catch (error) {
    if (error instanceof PromotionGateError && error.code === "CASE_COLLISION") throw error;
    throw new PromotionGateError("LEGACY_OBSERVATION_INVALID", `${label} does not match the technical observation contract.`);
  }
}

function assertLegacyPathAuthorized(manifest, relativePath) {
  assertSafeRepoRelativePath(relativePath);
  if (
    !pathCoveredBy(relativePath, manifest.accessPolicy.allowedReadPaths) ||
    !pathCoveredBy(relativePath, manifest.accessPolicy.forbiddenModificationPaths)
  ) {
    throw new PromotionGateError(
      "LEGACY_OBSERVATION_PATH_UNAUTHORIZED",
      "Legacy observation path is outside the declared read/frozen sets."
    );
  }
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function extractNormalizedLegacyAnchor(source, anchor) {
  const normalizedSource = source.replace(/\r\n?/gu, "\n");
  const start = normalizedSource.indexOf(anchor.startMarker);
  const secondStart = normalizedSource.indexOf(anchor.startMarker, start + anchor.startMarker.length);
  const sameMarker = anchor.startMarker === anchor.endMarker;
  const end = sameMarker
    ? start
    : normalizedSource.indexOf(anchor.endMarker, start + anchor.startMarker.length);
  const firstEndAnywhere = sameMarker ? start : normalizedSource.indexOf(anchor.endMarker);
  const secondEnd = sameMarker
    ? secondStart
    : normalizedSource.indexOf(anchor.endMarker, firstEndAnywhere + anchor.endMarker.length);
  if (
    start < 0 ||
    end < 0 ||
    firstEndAnywhere !== end ||
    secondStart >= 0 ||
    secondEnd >= 0
  ) {
    throw new PromotionGateError(
      "LEGACY_ANCHOR_UNRESOLVED",
      `Legacy reachability anchor "${anchor.id}" is missing or ambiguous.`
    );
  }
  return normalizedSource
    .slice(start, end + anchor.endMarker.length)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !/^\/\//u.test(line))
    .join("\n");
}

const LEGACY_CANDIDATE_CONTAINER_KEYS = Object.freeze([
  "questions",
  "lessons",
  "topics",
  "books",
  "cards",
  "briefs",
  "items"
]);
const LEGACY_NESTED_CONTENT_CONTAINER_KEYS = Object.freeze([
  ...LEGACY_CANDIDATE_CONTAINER_KEYS,
  "chapters",
  "units",
  "sections"
]);

function isCandidateLikeStatus(status) {
  if (typeof status !== "string") return false;
  const normalized = status.toLocaleLowerCase("en-US");
  return normalized === "approved-for-review" ||
    normalized === "generated-review-package" ||
    normalized === "not-live" ||
    normalized.startsWith("not-integrated") ||
    normalized.includes("candidate") ||
    normalized.includes("pending") ||
    normalized.includes("needs-review") ||
    normalized.includes("blocked");
}

function classifyLegacyCandidatePackage(value) {
  const statusValues = (record) => isPlainObject(record) ? [
    record.packageStatus,
    record.status,
    record.integrationStatus,
    record.releaseStatus,
    record.reviewStatus,
    record.qaStatus,
    record.mathQaStatus,
    record.terminologyQaStatus,
    record.manualQaStatus,
    isPlainObject(record.approval) ? record.approval.status : undefined,
    isPlainObject(record.review) ? record.review.status : undefined,
    isPlainObject(record.qa) ? record.qa.status : undefined
  ] : [];
  const containsCandidateGovernanceStatus = (containers) => {
    const stack = containers.map((container) => ({ value: container, depth: 0 }));
    let visited = 0;
    while (stack.length > 0) {
      const current = stack.pop();
      visited += 1;
      if (visited > 250_000 || current.depth > 16) {
        throw new PromotionGateError(
          "LEGACY_DISCOVERY_INCOMPLETE",
          "Candidate governance traversal exceeded the frozen depth or node bound.",
          { visitedNodeCount: visited },
          "blocked"
        );
      }
      if (statusValues(current.value).some(isCandidateLikeStatus)) return true;
      if (isPlainObject(current.value)) {
        for (const key of LEGACY_NESTED_CONTENT_CONTAINER_KEYS) {
          if (!Array.isArray(current.value[key])) continue;
          for (const child of current.value[key]) {
            stack.push({ value: child, depth: current.depth + 1 });
          }
        }
      }
    }
    return false;
  };
  if (Array.isArray(value)) {
    return {
      candidateLike: containsCandidateGovernanceStatus(value),
      knownShape: true,
      hasPackageId: false,
      containerKeys: ["$root"]
    };
  }
  if (!isPlainObject(value)) {
    return { candidateLike: false, knownShape: false, hasPackageId: false, containerKeys: [] };
  }
  const rootCandidateStatus = [
    value.packageStatus,
    value.status,
    value.integrationStatus,
    value.releaseStatus,
    value.reviewStatus,
    value.qaStatus
  ].some(isCandidateLikeStatus);
  const containerKeys = LEGACY_CANDIDATE_CONTAINER_KEYS.filter((key) => Array.isArray(value[key]));
  const rowCandidateStatus = containsCandidateGovernanceStatus(
    containerKeys.flatMap((key) => value[key])
  );
  const hasPackageId = typeof value.packageId === "string" && value.packageId.trim() !== "";
  return {
    candidateLike: rootCandidateStatus || rowCandidateStatus,
    knownShape: containerKeys.length > 0,
    hasPackageId,
    containerKeys
  };
}

const LEGACY_CANONICAL_PACKAGE_BASENAMES = new Set([
  "candidate-package.json",
  "lessons.json",
  "package.json",
  "question-pack.json",
  "safe-card-drafts.json",
  "s04-practice-question-briefs.json",
  "s04-question-candidate-pack.json",
  "s04-representative-practice-candidates.json",
  "s05-lesson-candidate-pack.json",
  "s05-representative-lesson-candidates.json",
  "s05-textbook-lesson-briefs.json",
  "textbook-pack.json"
]);
const FROZEN_MANUAL_LEGACY_CORRELATION = Object.freeze({
  candidatePath: "coordination/content-qa/us-ca-math-grade1-h-l-micro-lessons-v1/lessons.json",
  candidateRawSha256: "9c698908a207589677b620427c970615dee8c3bac442b0240df9499fb1dce323",
  runtimePath: "data/usCaliforniaMicroLessons.ts",
  runtimeRawSha256: "94a32434013199df11aff7221ec63f0d12eea5c784e3170ddc7da1a7d5449292",
  packageId: "us-ca-math-grade1-h-l-micro-lessons-v1",
  recordCount: 12,
  reviewedProjectionReferenceDigest: "1e5736796205908db818d5635183266da8739618df463673898ffd7e1ee2ca5e"
});
const FROZEN_ADAPTIVE_LEGACY_AMBIGUITY = Object.freeze({
  candidatePath: "coordination/content-qa/us-ca-adaptive-k-g5-beta-seed-v1/question-pack.json",
  candidateRawSha256: "e587994df3a05d7f55bef1a56c8b84a8159f62a48c964f71f09aab5f01635416",
  runtimePath: "data/usCaliforniaTopics.ts",
  runtimeRawSha256: "c91fa464412532c60d45d75692c428f4e69ec318da17d62047f2b0fd80f2a7f2",
  packageId: "us-ca-adaptive-k-g5-beta-seed-v1",
  recordCount: 12
});

function isCanonicalLegacyCandidateArtifactPath(candidatePath) {
  const segments = candidatePath.split("/");
  if (segments.some((segment) => [
    "batches", "repair-batches", "repair_batches", "deepseek-v4-pro-full-rag-qa"
  ].includes(segment))) return false;
  return LEGACY_CANONICAL_PACKAGE_BASENAMES.has(segments.at(-1));
}

function extractLegacyContentProfile(value) {
  const containerEntries = [];
  if (Array.isArray(value)) {
    containerEntries.push(["$root", value]);
  } else if (isPlainObject(value)) {
    for (const key of LEGACY_CANDIDATE_CONTAINER_KEYS) {
      if (Array.isArray(value[key])) containerEntries.push([key, value[key]]);
    }
  }
  if (containerEntries.length === 0) return null;
  const ids = containerEntries.flatMap(([, container]) => container
    .filter(isPlainObject)
    .map((record) => record.id)
    .filter((id) => typeof id === "string" && id.trim() !== ""));
  const exactIds = new Set(ids);
  const foldedIds = new Set(ids.map((id) => id.toLocaleLowerCase("en-US")));
  if (ids.length !== exactIds.size || ids.length !== foldedIds.size) {
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_INCOMPLETE",
      "Candidate content identity contains duplicate or case-colliding ids.",
      { idCount: ids.length },
      "blocked"
    );
  }
  const sortedIds = [...exactIds].sort(codePointCompare);
  return {
    packageId: isPlainObject(value) && typeof value.packageId === "string" && value.packageId.trim() !== ""
      ? value.packageId
      : null,
    containerKeys: containerEntries.map(([key]) => key).sort(codePointCompare),
    idCount: sortedIds.length,
    idSetDigest: sortedIds.length > 0 ? fingerprint(sortedIds) : null,
    sortedIds
  };
}

export function inspectLegacyCandidateDocument(value) {
  return {
    classification: classifyLegacyCandidatePackage(value),
    contentProfile: extractLegacyContentProfile(value)
  };
}

function isLegacyCandidatePackage(value) {
  const classification = classifyLegacyCandidatePackage(value);
  return classification.candidateLike && classification.knownShape;
}

function validateLegacyDiscoveryRegistry(registry, manifest) {
  try {
    assertExactKeys(
      registry,
      [
        "schemaVersion",
        "policy",
        "roots",
        "observerVersion",
        "candidateShapeVersion",
        "observerContracts"
      ],
      "legacy discovery registry"
    );
    if (
      registry.schemaVersion !== LEGACY_DISCOVERY_SCHEMA_VERSION ||
      registry.policy !== manifest.legacyDiscovery.policy ||
      stableJson(registry.roots) !== stableJson(CANONICAL_LEGACY_DISCOVERY_ROOTS) ||
      registry.observerVersion !== "promotion-legacy-discovery-observer.v1" ||
      registry.candidateShapeVersion !== "promotion-legacy-candidate-shape.v1"
    ) {
      throw new PromotionGateError(
        "LEGACY_DISCOVERY_CONTRACT_MISMATCH",
        "Legacy discovery registry metadata changed from its frozen v1 contract."
      );
    }
    if (!Array.isArray(registry.observerContracts)) {
      throw new PromotionGateError("LEGACY_DISCOVERY_CONTRACT_MISMATCH", "Legacy observerContracts must be an array.");
    }
    const ids = new Set();
    const paths = new Set();
    for (const [index, contract] of registry.observerContracts.entries()) {
      assertExactKeys(contract, ["packageId", "observation"], `legacy observerContracts[${index}]`);
      assertNonEmptyString(contract.packageId, `legacy observerContracts[${index}].packageId`);
      validateLegacyObservation(contract.observation, `legacy observerContracts[${index}]`);
      const foldedId = contract.packageId.toLocaleLowerCase("en-US");
      const foldedPath = contract.observation.packagePath.toLocaleLowerCase("en-US");
      if (ids.has(foldedId) || paths.has(foldedPath)) {
        throw new PromotionGateError(
          "LEGACY_DISCOVERY_CONTRACT_MISMATCH",
          "Legacy observer contracts must have distinct package ids and paths."
        );
      }
      ids.add(foldedId);
      paths.add(foldedPath);
    }
  } catch (error) {
    if (error instanceof PromotionGateError && error.code === "LEGACY_DISCOVERY_CONTRACT_MISMATCH") throw error;
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_CONTRACT_MISMATCH",
      "Legacy discovery registry is not a strict v1 governance record."
    );
  }
  return registry;
}

async function discoverReachableLegacyConflicts(
  repoRoot,
  manifest,
  ratchet,
  runtimeReachability = null,
  { auditOnly = false } = {}
) {
  let registryLoaded = null;
  let registry = null;
  if (!auditOnly) {
    try {
      registryLoaded = await loadAuthoritativeJson(
        repoRoot,
        manifest.legacyDiscovery.registry.path,
        "LEGACY_DISCOVERY_JSON_INVALID",
        "Legacy discovery registry"
      );
    } catch (error) {
      if (error instanceof PromotionGateError) error.outcome = "blocked";
      throw error;
    }
    if (registryLoaded.loaded.rawSha256 !== manifest.legacyDiscovery.registry.rawSha256) {
      throw new PromotionGateError(
        "LEGACY_DISCOVERY_DIGEST_MISMATCH",
        "Legacy discovery registry bytes do not match the manifest binding.",
        {},
        "blocked"
      );
    }
    registry = validateLegacyDiscoveryRegistry(registryLoaded.value, manifest);
  }
  let discoverySnapshot;
  try {
    discoverySnapshot = await snapshotRepoPaths(repoRoot, CANONICAL_LEGACY_DISCOVERY_ROOTS);
  } catch (error) {
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_INCOMPLETE",
      "Legacy discovery could not completely enumerate its frozen roots.",
      { causeCode: error?.code ?? "unknown" },
      "blocked"
    );
  }
  const jsonFiles = discoverySnapshot.files
    .map(({ path: filePath }) => filePath)
    .filter((filePath) => filePath.endsWith(".json"))
    .sort(codePointCompare);
  const canonicalCandidateJsonFiles = jsonFiles.filter(isCanonicalLegacyCandidateArtifactPath);
  const verifiedRuntimeReachability = runtimeReachability ?? await scanLiveReachability(repoRoot, manifest);
  const runtimeGraphPaths = verifiedRuntimeReachability.runtimeGraphPaths;
  if (!Array.isArray(runtimeGraphPaths) || runtimeGraphPaths.length === 0) {
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_INCOMPLETE",
      "Legacy discovery requires the verified runtime graph path set.",
      {},
      "blocked"
    );
  }
  const directlyServedPublicPaths = verifiedRuntimeReachability.scannedPaths
    .filter((filePath) => filePath.startsWith("public/"));
  const candidateInspectionPaths = [...new Set([
    ...canonicalCandidateJsonFiles,
    ...runtimeGraphPaths.filter((filePath) => filePath.endsWith(".json")),
    ...directlyServedPublicPaths.filter((filePath) => filePath.endsWith(".json"))
  ])].sort(codePointCompare);
  const candidates = [];
  const contentProfiles = new Map();
  for (const candidatePath of candidateInspectionPaths) {
    let value;
    let loaded;
    try {
      loaded = await readAuthoritativeFile(repoRoot, candidatePath);
      value = parseCanonicalJsonBytes(loaded.bytes, "LEGACY_DISCOVERY_JSON_INVALID", "Legacy discovery input");
    } catch (error) {
      throw new PromotionGateError(
        "LEGACY_DISCOVERY_INCOMPLETE",
        "A legacy discovery or reachable runtime JSON file could not be completely parsed.",
        { inputPathDigest: fingerprint(candidatePath), causeCode: error?.code ?? "JSON_INVALID" },
        "blocked"
      );
    }
    const classification = classifyLegacyCandidatePackage(value);
    const contentProfile = extractLegacyContentProfile(value);
    if (contentProfile !== null) contentProfiles.set(candidatePath, contentProfile);
    if (classification.candidateLike) {
      candidates.push({
        packageId: isPlainObject(value) && typeof value.packageId === "string" ? value.packageId : null,
        packagePath: candidatePath,
        knownShape: classification.knownShape,
        hasPackageId: classification.hasPackageId,
        containerKeys: classification.containerKeys,
        contentProfile,
        rawSha256: loaded.rawSha256
      });
    }
  }

  const inspectionPaths = [...new Set([...runtimeGraphPaths, ...directlyServedPublicPaths])].sort(codePointCompare);
  const reachability = new Map(candidates.map(({ packagePath }) => [packagePath, { pathHits: [], idHits: [] }]));
  for (const candidate of candidates) {
    if (
      runtimeGraphPaths.includes(candidate.packagePath) ||
      directlyServedPublicPaths.includes(candidate.packagePath)
    ) {
      reachability.get(candidate.packagePath).pathHits.push(candidate.packagePath);
    }
  }
  for (const runtimePath of inspectionPaths) {
    const loaded = await readAuthoritativeFile(repoRoot, runtimePath);
    for (const candidate of candidates) {
      const hits = reachability.get(candidate.packagePath);
      if (loaded.bytes.includes(Buffer.from(candidate.packagePath))) hits.pathHits.push(runtimePath);
      if (
        typeof candidate.packageId === "string" &&
        loaded.bytes.includes(Buffer.from(candidate.packageId))
      ) hits.idHits.push(runtimePath);
    }
  }

  const knownById = new Map(ratchet.entries.map((entry) => [entry.packageId.toLocaleLowerCase("en-US"), entry]));
  const candidatesByIdentity = new Map();
  for (const candidate of candidates) {
    const identityKey = typeof candidate.packageId === "string"
      ? `package:${candidate.packageId.toLocaleLowerCase("en-US")}`
      : candidate.contentProfile?.idSetDigest
        ? `ids:${candidate.contentProfile.idSetDigest}`
        : `path:${candidate.packagePath}`;
    const group = candidatesByIdentity.get(identityKey) ?? [];
    group.push(candidate);
    candidatesByIdentity.set(identityKey, group);
  }
  const selected = [];
  const reachableCandidates = [];
  const opaqueConflicts = [];
  const newConflicts = [];
  const identityResolvedCandidatePaths = new Set();
  for (const [identityKey, group] of candidatesByIdentity) {
    const pathReached = group.filter(({ packagePath }) => reachability.get(packagePath).pathHits.length > 0);
    let reachable;
    if (pathReached.length === 1) {
      [reachable] = pathReached;
    } else if (pathReached.length > 1) {
      throw new PromotionGateError(
        "LEGACY_DISCOVERY_AMBIGUOUS",
        "Multiple copies of one candidate identity are path-reachable from the runtime roots.",
        { packageIdentityDigest: fingerprint(identityKey), reachableCopyCount: pathReached.length },
        "blocked"
      );
    }
    if (!reachable) continue;
    const groupedReachable = {
      ...reachable,
      sourcePaths: group.map(({ packagePath }) => packagePath).sort(codePointCompare)
    };
    for (const { packagePath } of group) identityResolvedCandidatePaths.add(packagePath);
    reachableCandidates.push(groupedReachable);
    if (!groupedReachable.knownShape) {
      opaqueConflicts.push(groupedReachable);
      continue;
    }
    const foldedPackageId = typeof groupedReachable.packageId === "string"
      ? groupedReachable.packageId.toLocaleLowerCase("en-US")
      : null;
    const baseline = foldedPackageId === null ? null : knownById.get(foldedPackageId);
    if (!baseline || baseline.observation.packagePath !== groupedReachable.packagePath) {
      newConflicts.push(groupedReachable);
      continue;
    }
    selected.push({ baseline, reachable: groupedReachable });
  }
  const directlyResolvedCandidatePaths = new Set([
    ...identityResolvedCandidatePaths,
    ...newConflicts.map(({ packagePath }) => packagePath),
    ...opaqueConflicts.map(({ packagePath }) => packagePath)
  ]);
  const runtimeProfiles = [...contentProfiles.entries()]
    .filter(([profilePath]) =>
      runtimeGraphPaths.includes(profilePath) || directlyServedPublicPaths.includes(profilePath)
    )
    .map(([profilePath, profile]) => ({ packagePath: profilePath, profile }));
  for (const group of candidatesByIdentity.values()) {
    if (group.some(({ packagePath }) => directlyResolvedCandidatePaths.has(packagePath))) continue;
    const candidate = [...group].sort((left, right) => codePointCompare(left.packagePath, right.packagePath))[0];
    const sourcePaths = group.map(({ packagePath }) => packagePath).sort(codePointCompare);
    const profile = candidate.contentProfile;
    if (profile === null) continue;
    const correlated = runtimeProfiles.filter(({ packagePath: runtimePath, profile: runtimeProfile }) => {
      if (sourcePaths.includes(runtimePath)) return false;
      const packageIdentityMatch =
        profile.packageId !== null &&
        runtimeProfile.packageId !== null &&
        profile.packageId.toLocaleLowerCase("en-US") === runtimeProfile.packageId.toLocaleLowerCase("en-US");
      const idSetMatch =
        profile.idCount > 0 &&
        profile.idCount === runtimeProfile.idCount &&
        profile.idSetDigest === runtimeProfile.idSetDigest;
      return packageIdentityMatch || idSetMatch;
    });
    if (correlated.length > 1) {
      opaqueConflicts.push({
        ...candidate,
        sourcePaths,
        correlation: "ambiguous-content-correlation",
        correlatedRuntimePaths: correlated.map(({ packagePath }) => packagePath).sort(codePointCompare)
      });
      reachableCandidates.push(opaqueConflicts.at(-1));
      for (const sourcePath of sourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
      continue;
    }
    if (correlated.length === 1) {
      const correlatedConflict = {
        ...candidate,
        sourcePaths,
        correlation: profile.packageId !== null &&
          correlated[0].profile.packageId !== null &&
          profile.packageId.toLocaleLowerCase("en-US") ===
            correlated[0].profile.packageId.toLocaleLowerCase("en-US")
          ? "package-id"
          : "exact-id-set",
        correlatedRuntimePath: correlated[0].packagePath
      };
      newConflicts.push(correlatedConflict);
      reachableCandidates.push(correlatedConflict);
      for (const sourcePath of sourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
    }
  }
  const frozenManualCorrelation = FROZEN_MANUAL_LEGACY_CORRELATION;
  const manualCandidate = candidates.find(({ packagePath }) =>
    packagePath === frozenManualCorrelation.candidatePath
  );
  if (manualCandidate && !directlyResolvedCandidatePaths.has(manualCandidate.packagePath)) {
    const manualGroup = [...candidatesByIdentity.values()].find((group) => group.includes(manualCandidate)) ?? [manualCandidate];
    const manualSourcePaths = manualGroup.map(({ packagePath }) => packagePath).sort(codePointCompare);
    const runtimeLoaded = await readAuthoritativeFile(repoRoot, frozenManualCorrelation.runtimePath);
    const runtimeSource = decodeCanonicalUtf8(
      runtimeLoaded.bytes,
      "LEGACY_DISCOVERY_INCOMPLETE",
      "Frozen manual live projection"
    );
    const frozenProjectionMatches =
      runtimeGraphPaths.includes(frozenManualCorrelation.runtimePath) &&
      manualCandidate.rawSha256 === frozenManualCorrelation.candidateRawSha256 &&
      runtimeLoaded.rawSha256 === frozenManualCorrelation.runtimeRawSha256 &&
      manualCandidate.packageId === frozenManualCorrelation.packageId &&
      manualCandidate.contentProfile?.idCount === frozenManualCorrelation.recordCount &&
      runtimeSource.includes(`const packageId = "${frozenManualCorrelation.packageId}" as const;`) &&
      (runtimeSource.match(/\bspec\(\{/gu) ?? []).length === frozenManualCorrelation.recordCount;
    if (frozenProjectionMatches) {
      const correlatedConflict = {
        ...manualCandidate,
        sourcePaths: manualSourcePaths,
        correlation: "frozen-reviewed-raw-correlation",
        correlatedRuntimePath: frozenManualCorrelation.runtimePath,
        semanticProof: false,
        reviewedProjectionReferenceDigest: frozenManualCorrelation.reviewedProjectionReferenceDigest
      };
      newConflicts.push(correlatedConflict);
      reachableCandidates.push(correlatedConflict);
      for (const sourcePath of manualSourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
    } else {
      const ambiguous = {
        ...manualCandidate,
        sourcePaths: manualSourcePaths,
        correlation: "manual-projection-drift",
        correlatedRuntimePath: frozenManualCorrelation.runtimePath,
        semanticProof: false
      };
      opaqueConflicts.push(ambiguous);
      reachableCandidates.push(ambiguous);
      for (const sourcePath of manualSourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
    }
  }
  const frozenAdaptiveAmbiguity = FROZEN_ADAPTIVE_LEGACY_AMBIGUITY;
  const adaptiveCandidate = candidates.find(({ packagePath }) =>
    packagePath === frozenAdaptiveAmbiguity.candidatePath
  );
  if (adaptiveCandidate && !directlyResolvedCandidatePaths.has(adaptiveCandidate.packagePath)) {
    const adaptiveGroup = [...candidatesByIdentity.values()].find((group) => group.includes(adaptiveCandidate)) ?? [adaptiveCandidate];
    const adaptiveSourcePaths = adaptiveGroup.map(({ packagePath }) => packagePath).sort(codePointCompare);
    const runtimeLoaded = await readAuthoritativeFile(repoRoot, frozenAdaptiveAmbiguity.runtimePath);
    const runtimeSource = decodeCanonicalUtf8(
      runtimeLoaded.bytes,
      "LEGACY_DISCOVERY_INCOMPLETE",
      "Frozen adaptive runtime ambiguity"
    );
    const exactAmbiguityObserved =
      runtimeGraphPaths.includes(frozenAdaptiveAmbiguity.runtimePath) &&
      adaptiveCandidate.rawSha256 === frozenAdaptiveAmbiguity.candidateRawSha256 &&
      runtimeLoaded.rawSha256 === frozenAdaptiveAmbiguity.runtimeRawSha256 &&
      adaptiveCandidate.packageId === frozenAdaptiveAmbiguity.packageId &&
      adaptiveCandidate.contentProfile?.idCount === frozenAdaptiveAmbiguity.recordCount &&
      runtimeSource.includes("adaptiveBetaPracticeLive: false,") &&
      runtimeSource.includes(`adaptiveBetaPackageId: "${frozenAdaptiveAmbiguity.packageId}",`) &&
      runtimeSource.includes(
        "...(californiaK5LiveContentStatus.adaptiveBetaPracticeLive ? [californiaK5AdaptiveBetaQuestionPack] : []),"
      ) &&
      adaptiveCandidate.contentProfile.sortedIds.every((id) => runtimeSource.includes(JSON.stringify(id)));
    const ambiguous = {
      ...adaptiveCandidate,
      sourcePaths: adaptiveSourcePaths,
      correlation: exactAmbiguityObserved
        ? "runtime-identity-conditional-exclusion"
        : "adaptive-runtime-correlation-drift",
      correlatedRuntimePath: frozenAdaptiveAmbiguity.runtimePath
    };
    opaqueConflicts.push(ambiguous);
    reachableCandidates.push(ambiguous);
    for (const sourcePath of adaptiveSourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
  }
  for (const group of candidatesByIdentity.values()) {
    if (group.some(({ packagePath }) => directlyResolvedCandidatePaths.has(packagePath))) continue;
    const idHitPaths = [...new Set(group.flatMap(({ packagePath }) =>
      reachability.get(packagePath).idHits
    ))].sort(codePointCompare);
    if (idHitPaths.length === 0) continue;
    const candidate = [...group].sort((left, right) => codePointCompare(left.packagePath, right.packagePath))[0];
    const sourcePaths = group.map(({ packagePath }) => packagePath).sort(codePointCompare);
    const ambiguous = {
      ...candidate,
      sourcePaths,
      correlation: "runtime-identity-marker-only",
      correlatedRuntimePaths: idHitPaths
    };
    opaqueConflicts.push(ambiguous);
    reachableCandidates.push(ambiguous);
    for (const sourcePath of sourcePaths) directlyResolvedCandidatePaths.add(sourcePath);
  }
  const conflictProofRows = (rows) => rows
    .map((candidate) => ({
      packageIdentityDigest: fingerprint(candidate.packageId ?? candidate.packagePath),
      packagePathDigest: fingerprint(candidate.packagePath),
      sourcePathCount: candidate.sourcePaths?.length ?? 1,
      sourcePathsDigest: fingerprint(candidate.sourcePaths ?? [candidate.packagePath]),
      identitySource: candidate.hasPackageId ? "package-id" : "path-derived",
      containerKeys: [...candidate.containerKeys].sort(codePointCompare),
      correlation: candidate.correlation ?? "direct-runtime-reachability",
      correlatedRuntimePathDigest: candidate.correlatedRuntimePath
        ? fingerprint(candidate.correlatedRuntimePath)
        : null,
      idCount: candidate.contentProfile?.idCount ?? null,
      idSetDigest: candidate.contentProfile?.idSetDigest ?? null
    }))
    .sort((left, right) => codePointCompare(left.packagePathDigest, right.packagePathDigest));
  const canonicalCandidateLikePaths = candidates
    .map(({ packagePath }) => packagePath)
    .filter((candidatePath) => canonicalCandidateJsonFiles.includes(candidatePath))
    .sort(codePointCompare);
  const directConflicts = [
    ...selected.map(({ reachable }) => reachable),
    ...newConflicts.filter(({ correlation }) => correlation === undefined)
  ];
  const correlatedConflicts = newConflicts.filter(({ correlation }) => correlation !== undefined);
  const conflictAuditBase = {
    schemaVersion: "promotion-legacy-conflict-union-audit.v1",
    candidateLikeCount: canonicalCandidateLikePaths.length,
    candidateSetDigest: fingerprint(canonicalCandidateLikePaths),
    directConflictCount: directConflicts.length,
    directConflictDigest: fingerprint(conflictProofRows(directConflicts)),
    correlatedConflictCount: correlatedConflicts.length,
    correlatedConflictDigest: fingerprint(conflictProofRows(correlatedConflicts)),
    ambiguousConflictCount: opaqueConflicts.length,
    ambiguousConflictDigest: fingerprint(conflictProofRows(opaqueConflicts)),
    reachableCandidateLikeCount: reachableCandidates.length,
    knownConflictCount: selected.length,
    newConflictCount: newConflicts.length,
    opaqueConflictCount: opaqueConflicts.length,
    reachableConflictDigest: fingerprint(conflictProofRows(reachableCandidates)),
    newConflictDigest: fingerprint(conflictProofRows(newConflicts)),
    opaqueConflictDigest: fingerprint(conflictProofRows(opaqueConflicts)),
    secondaryBlockedCondition: opaqueConflicts.length === 0 ? null : {
      code: "LEGACY_DISCOVERY_INCOMPLETE",
      conflictCount: opaqueConflicts.length,
      conflictDigest: fingerprint(conflictProofRows(opaqueConflicts))
    }
  };
  const conflictDetails = {
    ...conflictAuditBase,
    auditDigest: fingerprint(conflictAuditBase)
  };
  if (auditOnly) return conflictDetails;
  if (newConflicts.length > 0) {
    throw new PromotionGateError(
      "LEGACY_NEW_CONFLICT",
      "Observed one or more unratcheted reachable candidate/live conflicts.",
      conflictDetails,
      "fail"
    );
  }
  if (opaqueConflicts.length > 0) {
    throw new PromotionGateError(
      "LEGACY_DISCOVERY_INCOMPLETE",
      "A reachable or runtime-correlated candidate package remains ambiguous or uses an unmodelled container.",
      conflictDetails,
      "blocked"
    );
  }
  const selectedWithObservations = selected.map(({ baseline }) => {
    const observerContract = registry.observerContracts.find((contract) =>
      contract.packageId === baseline.packageId &&
      contract.observation.packagePath === baseline.observation.packagePath
    );
    if (!observerContract) {
      throw new PromotionGateError(
        "LEGACY_DISCOVERY_INCOMPLETE",
        "A known reachable legacy conflict has no independent observer contract.",
        { packageIdDigest: fingerprint(baseline.packageId) },
        "blocked"
      );
    }
    return { baseline, observation: observerContract.observation };
  });
  return {
    selected: selectedWithObservations,
    proof: {
      policy: registry.policy,
      registryDigest: registryLoaded.loaded.rawSha256,
      observerVersion: registry.observerVersion,
      candidateShapeVersion: registry.candidateShapeVersion,
      discoveryJsonFileCount: jsonFiles.length,
      discoveryJsonFilesDigest: fingerprint(jsonFiles),
      inspectedJsonFileCount: candidateInspectionPaths.length,
      inspectedJsonFilesDigest: fingerprint(candidateInspectionPaths),
      runtimeFileCount: verifiedRuntimeReachability.rawObservation.coveredFileCount,
      runtimeFilesDigest: verifiedRuntimeReachability.rawObservation.coveredFilesDigest,
      runtimeGraphPathCount: runtimeGraphPaths.length,
      runtimeGraphPathsDigest: fingerprint(runtimeGraphPaths)
    }
  };
}

export async function auditCanonicalLegacyConflictUnion(repoRoot, manifest) {
  validatePromotionManifest(manifest);
  const runtimePolicy = await observeCanonicalRuntimePolicy(repoRoot, manifest);
  const runtimeReachability = {
    scannedPaths: [
      ...runtimePolicy.actualFiles,
      ...runtimePolicy.specialFiles.map(({ path: specialPath }) => specialPath)
    ].sort(codePointCompare),
    runtimeGraphPaths: [...runtimePolicy.graph.reachablePaths].sort(codePointCompare),
    rawObservation: runtimePolicy.rawObservation
  };
  return discoverReachableLegacyConflicts(
    repoRoot,
    manifest,
    {
      entries: [{
        packageId: LEGACY_AUTHORITATIVE_PACKAGE_ID,
        observation: { packagePath: LEGACY_AUTHORITATIVE_PACKAGE_PATH }
      }]
    },
    runtimeReachability,
    { auditOnly: true }
  );
}

export async function observeLegacyRatchetEntries(repoRoot, manifest, ratchet, { runtimeReachability = null } = {}) {
  validatePromotionManifest(manifest);
  assertExactKeys(ratchet, ["schemaVersion", "introducedAt", "expiresAt", "entries"], "legacy ratchet");
  if (ratchet.schemaVersion !== PROMOTION_LEGACY_DRIFT_SCHEMA_VERSION || !Array.isArray(ratchet.entries)) {
    throw new PromotionGateError("LEGACY_SCHEMA_UNSUPPORTED", "Unsupported legacy drift ratchet schema version.");
  }
  const seenPackageIds = new Set();
  ratchet.entries.forEach((entry, index) => validateLegacyEntry(entry, index, seenPackageIds));
  const discovery = await discoverReachableLegacyConflicts(repoRoot, manifest, ratchet, runtimeReachability);
  const observedEntries = [];
  for (const { baseline, observation } of discovery.selected) {
    assertLegacyPathAuthorized(manifest, observation.packagePath);
    const loadedPackage = await readAuthoritativeFile(repoRoot, observation.packagePath);
    let packageValue;
    try {
      packageValue = parseCanonicalJsonBytes(
        loadedPackage.bytes,
        "LEGACY_PACKAGE_JSON_INVALID",
        "Observed legacy package"
      );
    } catch {
      throw new PromotionGateError("LEGACY_PACKAGE_JSON_INVALID", "Observed legacy package is not valid JSON.");
    }
    if (!isPlainObject(packageValue) || packageValue.packageId !== baseline.packageId || !Array.isArray(packageValue.questions)) {
      throw new PromotionGateError("LEGACY_PACKAGE_INVALID", "Observed legacy package shape or packageId is invalid.");
    }
    if (
      baseline.packageId !== LEGACY_AUTHORITATIVE_PACKAGE_ID ||
      packageValue.schemaVersion !== "1.0" ||
      packageValue.curriculumTrack !== "US_CA_MATH" ||
      packageValue.state !== "CA" ||
      packageValue.packageStatus !== LEGACY_ROOT_STATUS.packageStatus ||
      packageValue.reviewStatus !== LEGACY_ROOT_STATUS.reviewStatus ||
      packageValue.integrationStatus !== LEGACY_ROOT_STATUS.integrationStatus ||
      packageValue.nextOwner !== LEGACY_ROOT_STATUS.nextOwner ||
      !isPlainObject(packageValue.counts) ||
      packageValue.counts.totalQuestions !== 492 ||
      packageValue.counts.totalKnowledgePointTopics !== 41 ||
      packageValue.counts.questionsPerKnowledgePoint !== 12 ||
      !isPlainObject(packageValue.counts.gradeCounts) ||
      stableJson(packageValue.counts.gradeCounts) !== stableJson(LEGACY_GRADE_DISTRIBUTION) ||
      !isPlainObject(packageValue.scope) ||
      !Array.isArray(packageValue.scope.gradeSpan) ||
      stableJson(packageValue.scope.gradeSpan) !== stableJson(LEGACY_GRADE_SPAN) ||
      packageValue.questions.length !== 492
    ) {
      throw new PromotionGateError(
        "LEGACY_PACKAGE_INVALID",
        "Observed legacy package does not match the registered 492-row root/status/count contract."
      );
    }
    const ids = new Set();
    const foldedIds = new Set();
    const gradeCounts = new Map();
    const rowStatuses = [];
    for (const question of packageValue.questions) {
      if (
        !isPlainObject(question) ||
        typeof question.id !== "string" || question.id.trim() === "" ||
        typeof question.grade !== "string" || question.grade.trim() === "" ||
        question.integrationStatus !== "candidate-only-not-live" ||
        question.approval?.status !== "candidate-only-two-round-qa-pass"
      ) {
        throw new PromotionGateError("LEGACY_PACKAGE_INVALID", "Observed legacy question row is missing a registered identity/status field.");
      }
      const foldedId = question.id.toLocaleLowerCase("en-US");
      if (ids.has(question.id) || foldedIds.has(foldedId)) {
        throw new PromotionGateError("LEGACY_PACKAGE_INVALID", "Observed legacy question ids must be unique without case collisions.");
      }
      ids.add(question.id);
      foldedIds.add(foldedId);
      gradeCounts.set(question.grade, (gradeCounts.get(question.grade) ?? 0) + 1);
      rowStatuses.push({
        id: question.id,
        integrationStatus: question.integrationStatus,
        approvalStatus: question.approval.status
      });
    }
    const observedAnchors = [];
    const reachabilityInput = [];
    for (const sourceContract of observation.reachabilityAnchors) {
      assertLegacyPathAuthorized(manifest, sourceContract.path);
      const loadedSource = await readAuthoritativeFile(repoRoot, sourceContract.path);
      const source = decodeCanonicalUtf8(
        loadedSource.bytes,
        "LEGACY_ANCHOR_SOURCE_UTF8_INVALID",
        "Legacy reachability anchor source"
      );
      const anchors = sourceContract.anchors.map((anchor) => {
        const anchorSha256 = sha256(Buffer.from(extractNormalizedLegacyAnchor(source, anchor)));
        return { ...cloneCanonical(anchor), sha256: anchorSha256 };
      });
      observedAnchors.push({ path: sourceContract.path, anchors });
      reachabilityInput.push({
        path: sourceContract.path,
        anchors: anchors.map(({ id, sha256: anchorSha256 }) => ({ id, sha256: anchorSha256 }))
      });
    }
    const sortedIds = [...ids].sort(codePointCompare);
    const gradeDistribution = Object.fromEntries(
      [...gradeCounts.entries()].sort(([left], [right]) => codePointCompare(left, right))
    );
    if (
      ids.size !== 492 ||
      foldedIds.size !== 492 ||
      stableJson(gradeDistribution) !== stableJson(LEGACY_GRADE_DISTRIBUTION)
    ) {
      throw new PromotionGateError(
        "LEGACY_PACKAGE_INVALID",
        "Observed legacy question ids or grade distribution changed from the registered 492-row contract."
      );
    }
    rowStatuses.sort((left, right) => codePointCompare(left.id, right.id));
    const rootStatus = {
      packageStatus: packageValue.packageStatus,
      reviewStatus: packageValue.reviewStatus,
      integrationStatus: packageValue.integrationStatus,
      nextOwner: packageValue.nextOwner
    };
    try {
      stableJson(rootStatus);
    } catch {
      throw new PromotionGateError("LEGACY_PACKAGE_INVALID", "Observed legacy package root status fields are incomplete.");
    }
    observedEntries.push(projectLegacyObservedEntry({
      ...cloneCanonical(baseline),
      observation: {
        ...cloneCanonical(observation),
        reachabilityAnchors: observedAnchors
      },
      packageDigest: loadedPackage.rawSha256,
      contentDigest: fingerprint(packageValue.questions),
      semanticDigest: fingerprint(packageValue),
      idSetDigest: fingerprint(sortedIds),
      gradeDistributionDigest: fingerprint(gradeDistribution),
      rootStatusDigest: fingerprint(rootStatus),
      rowStatusDigest: fingerprint(rowStatuses),
      reachabilityDigest: fingerprint(reachabilityInput)
    }));
  }
  Object.defineProperty(observedEntries, "discoveryProof", {
    value: discovery.proof,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return observedEntries;
}

function legacyObservedSignature(entry) {
  return fingerprint({
    packageId: entry.packageId,
    observationDigest: fingerprint(entry.observation),
    packageDigest: entry.packageDigest,
    contentDigest: entry.contentDigest,
    semanticDigest: entry.semanticDigest,
    idSetDigest: entry.idSetDigest,
    gradeDistributionDigest: entry.gradeDistributionDigest,
    rootStatusDigest: entry.rootStatusDigest,
    rowStatusDigest: entry.rowStatusDigest,
    reachabilityDigest: entry.reachabilityDigest
  });
}

export async function validateLegacyAuthorizationReviews(repoRoot, manifest, entries) {
  validatePromotionManifest(manifest);
  if (!Array.isArray(entries)) {
    throw new PromotionGateError("LEGACY_REVIEW_BINDING_MISMATCH", "Legacy review validation requires entries.");
  }
  const roleByReference = {
    a23PromotionReview: "A23",
    a25ReleaseIntakeReview: "A25"
  };
  for (const [index, entry] of entries.entries()) {
    validateLegacyEntry(entry, index, new Set());
    const observedSignature = legacyObservedSignature(entry);
    for (const [referenceKey, role] of Object.entries(roleByReference)) {
      const reference = entry.authorization.reviewReferences[referenceKey];
      assertLegacyPathAuthorized(manifest, reference.path);
      const loaded = await readAuthoritativeFile(repoRoot, reference.path);
      if (loaded.rawSha256 !== reference.rawSha256) {
        throw new PromotionGateError("LEGACY_REVIEW_BINDING_MISMATCH", "Legacy review bytes do not match their ratchet binding.");
      }
      let review;
      try {
        review = parseCanonicalJsonBytes(loaded.bytes, "LEGACY_REVIEW_JSON_INVALID", "Legacy review evidence");
        assertExactKeys(
          review,
          ["schemaVersion", "role", "packageId", "authorizationReference", "observedSignature", "decision"],
          "legacy review"
        );
      } catch {
        throw new PromotionGateError("LEGACY_REVIEW_BINDING_MISMATCH", "Legacy review is not a strict v1 JSON record.");
      }
      if (
        review.schemaVersion !== "promotion-legacy-review.v1" ||
        review.role !== role ||
        review.packageId !== entry.packageId ||
        review.authorizationReference !== entry.authorization.reference ||
        review.observedSignature !== observedSignature ||
        review.decision !== "ratchet-baseline-approved"
      ) {
        throw new PromotionGateError("LEGACY_REVIEW_BINDING_MISMATCH", "Legacy review does not authorize the exact observed baseline.");
      }
    }
  }
  return true;
}

export function validateLegacyRatchet(ratchet, { now = new Date().toISOString(), observedEntries } = {}) {
  assertExactKeys(ratchet, ["schemaVersion", "introducedAt", "expiresAt", "entries"], "legacy ratchet");
  if (ratchet.schemaVersion !== PROMOTION_LEGACY_DRIFT_SCHEMA_VERSION) {
    throw new PromotionGateError("LEGACY_SCHEMA_UNSUPPORTED", "Unsupported legacy drift ratchet schema version.");
  }
  if (ratchet.introducedAt !== LEGACY_INTRODUCED_AT || ratchet.expiresAt !== LEGACY_EXPIRES_AT) {
    throw new PromotionGateError(
      "LEGACY_WINDOW_INVALID",
      "Legacy drift window must be the frozen 2026-08-25 through 2026-09-24 authorization window."
    );
  }
  const introducedAt = Date.parse(ratchet.introducedAt);
  const expiresAt = Date.parse(ratchet.expiresAt);
  const nowAt = parseCanonicalTimestamp(now, "LEGACY_WINDOW_INVALID", "now");
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (expiresAt <= introducedAt || expiresAt - introducedAt > thirtyDays || nowAt < introducedAt) {
    throw new PromotionGateError(
      "LEGACY_WINDOW_INVALID",
      "Legacy drift introducedAt/expiresAt must define a fixed positive window of at most 30 days."
    );
  }
  if (nowAt >= expiresAt) {
    throw new PromotionGateError("LEGACY_RATCHET_EXPIRED", "Legacy drift ratchet has expired.");
  }
  if (!Array.isArray(ratchet.entries) || ratchet.entries.length !== 1) {
    throw new PromotionGateError(
      "LEGACY_BASELINE_CARDINALITY_INVALID",
      "Promotion Gate v1 requires exactly one frozen legacy baseline entry until a versioned resolution record replaces it."
    );
  }
  const knownIds = new Set();
  for (const [index, entry] of ratchet.entries.entries()) validateLegacyEntry(entry, index, knownIds);
  assertLegacyInitialBaselineEntry(ratchet.entries[0]);
  if (!Array.isArray(observedEntries) || observedEntries.length !== 1) {
    throw new PromotionGateError(
      "LEGACY_OBSERVATION_CARDINALITY_INVALID",
      "Promotion Gate v1 requires exactly one currently observed copy of the frozen legacy conflict."
    );
  }
  const observedIds = new Set();
  for (const [index, entry] of observedEntries.entries()) validateLegacyObservedEntry(entry, index, observedIds);

  const knownById = new Map(ratchet.entries.map((entry) => [entry.packageId.toLocaleLowerCase("en-US"), entry]));
  for (const observed of observedEntries) {
    const known = knownById.get(observed.packageId.toLocaleLowerCase("en-US"));
    if (!known) {
      throw new PromotionGateError("LEGACY_NEW_CONFLICT", `Observed unratcheted legacy conflict "${observed.packageId}".`);
    }
    if (stableJson(projectLegacyObservedEntry(known)) !== stableJson(observed)) {
      throw new PromotionGateError("LEGACY_CONFLICT_CHANGED", `Legacy conflict "${observed.packageId}" changed from its frozen record.`);
    }
  }
  return {
    result: "pass",
    introducedAt: ratchet.introducedAt,
    expiresAt: ratchet.expiresAt,
    knownConflicts: ratchet.entries.length,
    observedConflicts: observedEntries.length,
    removedConflicts: 0
  };
}

export const PROMOTION_RECEIPT_SCHEMA_VERSION = "promotion-receipt.v1";

export const PROMOTION_RECEIPT_FIELDS = Object.freeze([
  "schemaVersion",
  "mode",
  "result",
  "exitReason",
  "nextOwner",
  "manifest",
  "runMetadata",
  "binding",
  "checkerReleaseProof",
  "worktreeProof",
  "checkResults",
  "sourceSnapshots",
  "candidateSourceProof",
  "candidateInventoryProof",
  "candidateProvenanceProof",
  "targetBaselineProof",
  "evidenceIndexProof",
  "shadowOutput",
  "mappingCompatibility",
  "rollbackProof",
  "reachability",
  "legacyRatchetProof",
  "liveBlockers",
  "noLiveAuthorizations",
  "forbiddenDiff",
  "externalSideEffects",
  "lifecycleRecommendation",
  "unmetConditions",
  "trustBoundary",
  "semanticReceiptDigest",
  "rawReceiptDigest"
]);

function cloneCanonical(value) {
  return JSON.parse(stableJson(value));
}

function receiptDigestPayloads(receipt) {
  const rawPayload = cloneCanonical(receipt);
  delete rawPayload.semanticReceiptDigest;
  delete rawPayload.rawReceiptDigest;
  const semanticPayload = cloneCanonical(rawPayload);
  if (semanticPayload.runMetadata && typeof semanticPayload.runMetadata === "object") {
    delete semanticPayload.runMetadata.runId;
    delete semanticPayload.runMetadata.producedAt;
    delete semanticPayload.runMetadata.ciMetadata;
  }
  // Full-root byte inventories are same-attempt mutation proofs, not cross-commit
  // semantic identity. Candidate, checker, sensitive-anchor, graph, loader, and
  // legacy conflict fingerprints remain in the semantic projection below.
  delete semanticPayload.sourceSnapshots;
  if (semanticPayload.reachability && typeof semanticPayload.reachability === "object") {
    delete semanticPayload.reachability.scannedPaths;
    delete semanticPayload.reachability.rawObservation;
  }
  if (semanticPayload.legacyRatchetProof?.discoveryProof) {
    const discovery = semanticPayload.legacyRatchetProof.discoveryProof;
    delete discovery.discoveryJsonFileCount;
    delete discovery.discoveryJsonFilesDigest;
    delete discovery.inspectedJsonFileCount;
    delete discovery.inspectedJsonFilesDigest;
    delete discovery.runtimeFileCount;
    delete discovery.runtimeFilesDigest;
  }
  return { rawPayload, semanticPayload };
}

export function attachReceiptDigests(receiptWithoutDigests) {
  const base = cloneCanonical(receiptWithoutDigests);
  const { rawPayload, semanticPayload } = receiptDigestPayloads(base);
  return {
    ...base,
    semanticReceiptDigest: fingerprint(semanticPayload),
    rawReceiptDigest: fingerprint(rawPayload)
  };
}

async function loadAuthoritativeJson(repoRoot, relativePath, invalidCode, label) {
  const loaded = await readAuthoritativeFile(repoRoot, relativePath);
  try {
    return { loaded, value: parseCanonicalJsonBytes(loaded.bytes, invalidCode, label) };
  } catch {
    throw new PromotionGateError(invalidCode, `${label} is not valid JSON.`);
  }
}

export async function loadPromotionManifest(repoRoot, manifestPath) {
  const { loaded, value: manifest } = await loadAuthoritativeJson(
    repoRoot,
    manifestPath,
    "MANIFEST_JSON_INVALID",
    "Promotion manifest"
  );
  validatePromotionManifest(manifest);
  return { manifest, manifestDigest: loaded.rawSha256 };
}

function controlledFailureRecord(error, checkId) {
  const result = error.outcome === "blocked" ? "blocked" : "fail";
  const details = error.details === undefined ? {} : cloneCanonical(error.details);
  return {
    result,
    exitReason: {
      code: error.code,
      checkId,
      message: error.message,
      details
    },
    checkResult: {
      checkId,
      result,
      code: error.code,
      message: error.message,
      details,
      evidenceDigest: fingerprint({ checkId, result, code: error.code, message: error.message, details })
    }
  };
}

function normativeCheckEvidencePayload(receipt, check) {
  if (check.result === "fail" || check.result === "blocked") {
    return {
      checkId: check.checkId,
      result: check.result,
      code: check.code,
      message: check.message,
      details: check.details
    };
  }
  const payloads = {
    "manifest-contract": {
      manifest: receipt.manifest,
      mode: receipt.mode,
      binding: receipt.binding,
      checkerReleaseProof: receipt.checkerReleaseProof
    },
    "candidate-integrity": {
      candidateSourceProof: receipt.candidateSourceProof,
      candidateInventoryProof: receipt.candidateInventoryProof,
      candidateProvenanceProof: receipt.candidateProvenanceProof
    },
    "evidence-currentness": {
      targetBaselineProof: receipt.targetBaselineProof,
      evidenceIndexProof: receipt.evidenceIndexProof
    },
    "mapping-compatibility": receipt.mappingCompatibility,
    "rollback-rehearsal": {
      shadowOutput: receipt.shadowOutput,
      rollbackProof: receipt.rollbackProof
    },
    "live-reachability": receipt.reachability,
    "forbidden-diff": {
      sourceSnapshots: receipt.sourceSnapshots,
      forbiddenDiff: receipt.forbiddenDiff,
      worktreeProof: receipt.worktreeProof
    },
    "legacy-ratchet": receipt.legacyRatchetProof
  };
  return payloads[check.checkId];
}

function attachCheckEvidenceDigests(receipt, rawChecks) {
  return rawChecks.map((check) => {
    if (check.result === "not_run") return { ...check, evidenceDigest: null };
    return { ...check, evidenceDigest: fingerprint(normativeCheckEvidencePayload(receipt, check)) };
  });
}

function nextOwnerForBlocked(failure) {
  const declaredRole = failure?.exitReason?.details?.role;
  if (/^A(?:0[1-9]|1[0-9]|2[0-5])$/u.test(declaredRole ?? "")) return declaredRole;
  const code = String(failure?.exitReason?.code ?? "");
  if (
    code.startsWith("WORKTREE_") ||
    code.startsWith("TRACKED_INPUT_") ||
    code.startsWith("SOURCE_PROVENANCE_") ||
    code.startsWith("TARGET_BASELINE_")
  ) return "A25";
  const ownerByCheck = {
    "candidate-integrity": "A21",
    "evidence-currentness": "A23",
    "mapping-compatibility": "A23",
    "rollback-rehearsal": "A22",
    "live-reachability": "A23",
    "forbidden-diff": "A23",
    "legacy-ratchet": "A23"
  };
  return ownerByCheck[failure?.exitReason?.checkId] ?? "A23";
}

async function executeStartedShadowChecks(repoRoot, manifest, manifestPath, producedAt) {
  const checkResults = new Map(REQUIRED_CHECK_IDS.map((checkId) => [checkId, { checkId, result: "not_run" }]));
  checkResults.set("manifest-contract", { checkId: "manifest-contract", result: "pass" });
  let activeCheckId = "forbidden-diff";
  let failure = null;
  let sourcePre = null;
  let sourcePost = null;
  let forbiddenPre = null;
  let forbiddenPost = null;
  let sourceSnapshots = null;
  let forbiddenDiff = null;
  let candidates = null;
  let evidence = null;
  let dtos = null;
  let mappingCompatibility = null;
  let reachability = null;
  let ratchetResult = null;
  let rehearsal = null;
  let worktreePre = null;
  let worktreePost = null;
  let worktreeProof = null;
  let attemptHistoryProof = null;
  let trackedInputProof = null;
  let candidateSourcePre = null;
  let candidateSourcePost = null;
  let candidateSourceProof = null;
  let candidateInventoryProof = null;
  let candidateProvenanceProof = null;
  let targetBaselineProof = null;
  let checkerReleaseProof = null;
  let evidenceIndexProof = null;
  let legacyRatchetProof = null;
  let externalSideEffectProof = null;

  try {
    activeCheckId = "forbidden-diff";
    externalSideEffectProof = await collectExternalSideEffectProof(repoRoot, manifest);
    worktreePre = await collectGitWorktreeState(repoRoot);
    if (!worktreePre.clean) {
      assertStableGitWorktree(worktreePre, worktreePre);
    }
    attemptHistoryProof = await collectPromotionAttemptHistoryProof(repoRoot, {
      manifestPath,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      executionCommit: worktreePre.headCommit
    });
    if (attemptHistoryProof.expectedAttemptTerminal) {
      throw new PromotionGateError(
        "ATTEMPT_ALREADY_TERMINAL",
        "This immutable Promotion attempt is already terminal and cannot be replayed in place.",
        { terminalState: attemptHistoryProof.expectedAttemptStatus }
      );
    }
    sourcePre = await snapshotRepoPaths(repoRoot, [manifestPath, ...manifest.accessPolicy.allowedReadPaths]);
    forbiddenPre = await snapshotRepoPaths(repoRoot, manifest.accessPolicy.forbiddenModificationPaths);
    const canonicalRoot = await realpath(repoRoot);
    const expectedByPath = new Map(sourcePre.files.map(({ path: filePath, rawSha256 }) => [filePath, rawSha256]));
    await AUTHORITATIVE_PREIMAGE_CONTEXT.run({ canonicalRoot, expectedByPath }, async () => {
    const trackedInputPaths = [...new Set([manifestPath, ...sourcePre.files.map(({ path: filePath }) => filePath)])];
    trackedInputProof = await collectTrackedInputProof(repoRoot, trackedInputPaths);
    candidateSourcePre = await snapshotCandidateSourceAggregate(repoRoot, manifest);

    activeCheckId = "candidate-integrity";
    candidates = await loadCandidateRecords(repoRoot, manifest);
    candidateInventoryProof = candidates.inventoryProof;
    candidateProvenanceProof = await collectCandidateProvenanceProof(repoRoot, manifest, worktreePre.headCommit);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "manifest-contract";
    checkerReleaseProof = await collectCheckerReleaseProof(repoRoot, manifest, worktreePre.headCommit);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "evidence-currentness";
    targetBaselineProof = await collectTargetBaselineProjectionProof(repoRoot, manifest, worktreePre.headCommit);
    evidence = await loadEvidenceRecords(repoRoot, manifest, worktreePre.headCommit);
    evidenceIndexProof = evidence.indexProof;
    validateEvidenceCandidateSemantics(manifest, candidates.records, evidence.byRole);
    await validatePriorS18ReviewDrift(repoRoot, candidates.records, evidence.byRole);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "mapping-compatibility";
    dtos = buildShadowDtos(candidates.records, evidence.byRole);
    mappingCompatibility = {
      result: "pass",
      dtoSchemaVersion: "promotion-shadow-dto.v1",
      outputSemanticDigests: manifest.operationPlan.outputs.map(({ kind }) => ({
        kind,
        semanticSha256: fingerprint(dtos[kind])
      }))
    };
    mappingCompatibility.digest = fingerprint(mappingCompatibility);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "rollback-rehearsal";
    rehearsal = await rehearseShadowOutputs(repoRoot, dtos, manifest.operationPlan);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "live-reachability";
    reachability = await scanLiveReachability(repoRoot, manifest);
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });

    activeCheckId = "legacy-ratchet";
    const { loaded: loadedRatchet, value: ratchet } = await loadAuthoritativeJson(
      repoRoot,
      manifest.legacyRatchet,
      "LEGACY_JSON_INVALID",
      "Legacy drift ratchet"
    );
    const observedLegacyEntries = await observeLegacyRatchetEntries(repoRoot, manifest, ratchet, {
      runtimeReachability: reachability
    });
    ratchetResult = validateLegacyRatchet(ratchet, { now: producedAt, observedEntries: observedLegacyEntries });
    await validateLegacyAuthorizationReviews(repoRoot, manifest, ratchet.entries);
    const legacyProofPayload = {
      schemaVersion: "promotion-legacy-ratchet-proof.v1",
      result: ratchetResult.result,
      ratchetPath: manifest.legacyRatchet,
      ratchetRawSha256: loadedRatchet.rawSha256,
      introducedAt: ratchetResult.introducedAt,
      expiresAt: ratchetResult.expiresAt,
      knownConflictCount: ratchetResult.knownConflicts,
      observedConflictCount: ratchetResult.observedConflicts,
      removedConflictCount: ratchetResult.removedConflicts,
      observedEntriesDigest: fingerprint(observedLegacyEntries),
      discoveryProof: cloneCanonical(observedLegacyEntries.discoveryProof)
    };
    legacyRatchetProof = { ...legacyProofPayload, digest: fingerprint(legacyProofPayload) };
    checkResults.set(activeCheckId, { checkId: activeCheckId, result: "pass" });
    });
  } catch (error) {
    if (!(error instanceof PromotionGateError)) throw error;
    failure = controlledFailureRecord(error, activeCheckId);
    checkResults.set(activeCheckId, failure.checkResult);
  }

  if (sourcePre && forbiddenPre) {
    try {
      sourcePost = await snapshotRepoPaths(repoRoot, [manifestPath, ...manifest.accessPolicy.allowedReadPaths]);
      forbiddenPost = await snapshotRepoPaths(repoRoot, manifest.accessPolicy.forbiddenModificationPaths);
      if (candidateSourcePre) {
        candidateSourcePost = await snapshotCandidateSourceAggregate(repoRoot, manifest);
        candidateSourceProof = {
          paths: candidateSourcePre.paths,
          preAggregateDigest: candidateSourcePre.aggregateDigest,
          postAggregateDigest: candidateSourcePost.aggregateDigest,
          equal: candidateSourcePre.aggregateDigest === candidateSourcePost.aggregateDigest
        };
        if (!candidateSourceProof.equal || stableJson(candidateSourcePre.paths) !== stableJson(candidateSourcePost.paths)) {
          throw new PromotionGateError(
            "CANDIDATE_SOURCE_MUTATION",
            "Candidate source bytes changed during the shadow attempt.",
            {}
          );
        }
      }
      const sourceEquality = assertSnapshotsEqual(sourcePre, sourcePost, "SOURCE_MUTATION");
      const forbiddenEquality = assertSnapshotsEqual(forbiddenPre, forbiddenPost, "FORBIDDEN_LIVE_MUTATION");
      sourceSnapshots = { pre: sourcePre, post: sourcePost, equal: sourceEquality.equal };
      forbiddenDiff = { result: "pass", changedPaths: forbiddenEquality.changedPaths };
      if (checkResults.get("forbidden-diff").result === "not_run") {
        checkResults.set("forbidden-diff", { checkId: "forbidden-diff", result: "pass" });
      }
    } catch (error) {
      if (!(error instanceof PromotionGateError)) throw error;
      const snapshotFailure = controlledFailureRecord(error, "forbidden-diff");
      if (failure === null) {
        failure = snapshotFailure;
        checkResults.set("forbidden-diff", snapshotFailure.checkResult);
      }
      if (sourcePre && sourcePost) {
        sourceSnapshots = {
          pre: sourcePre,
          post: sourcePost,
          equal: sourcePre.digest === sourcePost.digest
        };
      }
      forbiddenDiff = {
        result: "fail",
        changedPaths: cloneCanonical(error.details?.changedPaths ?? [])
      };
    }
  }

  try {
    worktreePost = await collectGitWorktreeState(repoRoot);
    if (worktreePre) {
      worktreeProof = {
        executionCommit: worktreePre.headCommit,
        preClean: worktreePre.clean,
        postClean: worktreePost.clean,
        preStatusSha256: worktreePre.statusSha256,
        postStatusSha256: worktreePost.statusSha256,
        preStatusEntryCount: worktreePre.statusEntryCount,
        postStatusEntryCount: worktreePost.statusEntryCount,
        trackedInputCount: trackedInputProof?.trackedInputCount ?? null,
        trackedInputAggregateDigest: trackedInputProof?.trackedInputAggregateDigest ?? null,
        attemptHistoryProof
      };
      assertStableGitWorktree(worktreePre, worktreePost);
    }
  } catch (error) {
    if (!(error instanceof PromotionGateError)) throw error;
    const worktreeFailure = controlledFailureRecord(error, "forbidden-diff");
    if (failure === null) {
      failure = worktreeFailure;
      checkResults.set("forbidden-diff", worktreeFailure.checkResult);
    }
    if (worktreePre && worktreePost && worktreeProof === null) {
      worktreeProof = {
        executionCommit: worktreePre.headCommit,
        preClean: worktreePre.clean,
        postClean: worktreePost.clean,
        preStatusSha256: worktreePre.statusSha256,
        postStatusSha256: worktreePost.statusSha256,
        preStatusEntryCount: worktreePre.statusEntryCount,
        postStatusEntryCount: worktreePost.statusEntryCount,
        trackedInputCount: trackedInputProof?.trackedInputCount ?? null,
        trackedInputAggregateDigest: trackedInputProof?.trackedInputAggregateDigest ?? null,
        attemptHistoryProof
      };
    }
    if (forbiddenDiff === null) {
      forbiddenDiff = { result: worktreeFailure.result, changedPaths: [] };
    }
  }

  const result = failure?.result ?? "pass";
  return {
    result,
    failure,
    nextOwner: result === "blocked" ? nextOwnerForBlocked(failure) : null,
    candidates,
    evidence,
    dtos,
    mappingCompatibility,
    reachability,
    ratchetResult,
    rehearsal,
    sourceSnapshots,
    candidateSourceProof,
    candidateInventoryProof,
    candidateProvenanceProof,
    targetBaselineProof,
    checkerReleaseProof,
    evidenceIndexProof,
    legacyRatchetProof,
    externalSideEffectProof,
    forbiddenDiff,
    worktreeProof,
    checkResults: REQUIRED_CHECK_IDS.map((checkId) => checkResults.get(checkId))
  };
}

export async function validateShadowPilot(repoRoot, {
  manifestPath,
  producedAt = new Date().toISOString()
} = {}) {
  assertSafeRepoRelativePath(manifestPath);
  parseCanonicalTimestamp(producedAt, "RUN_TIME_INVALID", "producedAt");
  const { manifest, manifestDigest } = await loadPromotionManifest(repoRoot, manifestPath);
  const checked = await executeStartedShadowChecks(repoRoot, manifest, manifestPath, producedAt);
  if (checked.failure) {
    const error = new PromotionGateError(
      checked.failure.exitReason.code,
      checked.failure.exitReason.message,
      checked.failure.exitReason.details,
      checked.failure.result
    );
    throw error;
  }
  return {
    schemaVersion: "promotion-validation.v1",
    result: "pass",
    manifestDigest,
    candidateDigest: manifest.candidateDigest,
    checks: checked.checkResults
  };
}

export async function runShadowPilot(repoRoot, {
  manifestPath,
  runId,
  producedAt = new Date().toISOString(),
  ciMetadata = null
} = {}) {
  assertSafeRepoRelativePath(manifestPath);
  if (typeof runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(runId)) {
    throw new PromotionGateError("RUN_ID_INVALID", "runId must be a non-empty identifier without shell syntax.");
  }
  parseCanonicalTimestamp(producedAt, "RUN_TIME_INVALID", "producedAt");
  if (ciMetadata !== null && !isPlainObject(ciMetadata)) {
    throw new PromotionGateError("CI_METADATA_INVALID", "CI metadata must be null or a plain JSON object.");
  }
  if (ciMetadata !== null) stableJson(ciMetadata);

  const { manifest, manifestDigest } = await loadPromotionManifest(repoRoot, manifestPath);
  const checked = await executeStartedShadowChecks(repoRoot, manifest, manifestPath, producedAt);
  const rehearsal = checked.rehearsal;
  const baseUnmetConditions = [
    "a11-independent-replay-required",
    "a22-postrun-isolation-required",
    "ci-semantic-replay-required",
    "integration-not-authorized",
    "live-not-authorized",
    "preview-not-authorized",
    "deploy-not-authorized"
  ];
  const receiptWithoutDigests = {
    schemaVersion: PROMOTION_RECEIPT_SCHEMA_VERSION,
    mode: manifest.mode,
    result: checked.result,
    exitReason: checked.failure?.exitReason ?? null,
    nextOwner: checked.nextOwner,
    manifest: { path: manifestPath, rawSha256: manifestDigest },
    runMetadata: {
      runId,
      producedAt,
      runnerVersion: PROMOTION_CHECKER_VERSION,
      ciMetadata: ciMetadata === null ? null : cloneCanonical(ciMetadata)
    },
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      parentPackage: cloneCanonical(manifest.parentPackage),
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerRelease: cloneCanonical(manifest.checkerRelease)
    },
    checkerReleaseProof: checked.checkerReleaseProof,
    worktreeProof: checked.worktreeProof,
    checkResults: [],
    sourceSnapshots: checked.sourceSnapshots,
    candidateSourceProof: checked.candidateSourceProof,
    candidateInventoryProof: checked.candidateInventoryProof,
    candidateProvenanceProof: checked.candidateProvenanceProof,
    targetBaselineProof: checked.targetBaselineProof,
    evidenceIndexProof: checked.evidenceIndexProof,
    shadowOutput: rehearsal === null ? null : {
      tempRootPolicy: rehearsal.tempRootPolicy,
      outputs: rehearsal.outputs,
      aggregateDigest: rehearsal.aggregateDigest
    },
    mappingCompatibility: checked.mappingCompatibility,
    rollbackProof: rehearsal === null ? null : {
      method: manifest.operationPlan.rollback,
      preimageDigest: rehearsal.preimageDigest,
      postRollbackDigest: rehearsal.postRollbackDigest,
      digest: rehearsal.rollbackDigest,
      deletedPaths: rehearsal.deletedPaths,
      verifiedAbsent: rehearsal.verifiedAbsent,
      rootRemoved: rehearsal.rootRemoved
    },
    reachability: checked.reachability,
    legacyRatchetProof: checked.legacyRatchetProof,
    liveBlockers: cloneCanonical(manifest.knownBlockers),
    noLiveAuthorizations: {
      integration: manifest.authorizations.integration,
      live: manifest.authorizations.live,
      preview: manifest.authorizations.preview,
      deploy: manifest.authorizations.deploy
    },
    forbiddenDiff: checked.forbiddenDiff,
    externalSideEffects: checked.externalSideEffectProof,
    lifecycleRecommendation: {
      currentState: manifest.lifecycle.currentState,
      suggestedTransition: null
    },
    unmetConditions: checked.failure
      ? [checked.failure.exitReason.code, ...baseUnmetConditions]
      : baseUnmetConditions,
    trustBoundary: TRUST_BOUNDARY
  };
  receiptWithoutDigests.checkResults = attachCheckEvidenceDigests(
    receiptWithoutDigests,
    checked.checkResults
  );
  return attachReceiptDigests(receiptWithoutDigests);
}

function validateReceiptSnapshot(snapshot, label) {
  assertExactKeys(snapshot, ["schemaVersion", "roots", "files", "fileCount", "aggregateBytes", "digest"], label);
  if (snapshot.schemaVersion !== "promotion-source-snapshot.v1") {
    throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} has an unsupported schema version.`);
  }
  if (!Array.isArray(snapshot.roots) || snapshot.roots.length === 0 || !Array.isArray(snapshot.files)) {
    throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} roots or files are invalid.`);
  }
  const foldedRoots = new Set();
  for (const root of snapshot.roots) {
    assertSafeRepoRelativePath(root);
    const folded = root.toLocaleLowerCase("en-US");
    if (foldedRoots.has(folded)) {
      throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} has duplicate roots.`);
    }
    foldedRoots.add(folded);
  }
  const foldedFiles = new Set();
  for (const [index, file] of snapshot.files.entries()) {
    assertExactKeys(file, ["path", "rawSha256"], `${label}.files[${index}]`);
    assertSafeRepoRelativePath(file.path);
    assertSha256(file.rawSha256, `${label}.files[${index}].rawSha256`);
    const folded = file.path.toLocaleLowerCase("en-US");
    if (foldedFiles.has(folded)) {
      throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} has duplicate files.`);
    }
    foldedFiles.add(folded);
  }
  if (
    !Number.isSafeInteger(snapshot.fileCount) || snapshot.fileCount !== snapshot.files.length ||
    snapshot.fileCount > SNAPSHOT_MAX_FILE_COUNT ||
    !Number.isSafeInteger(snapshot.aggregateBytes) || snapshot.aggregateBytes < 0 ||
    snapshot.aggregateBytes > SNAPSHOT_MAX_AGGREGATE_BYTES
  ) {
    throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} bounds are invalid.`);
  }
  assertSha256(snapshot.digest, `${label}.digest`);
  if (snapshot.digest !== fingerprint({
    roots: snapshot.roots,
    files: snapshot.files,
    fileCount: snapshot.fileCount,
    aggregateBytes: snapshot.aggregateBytes
  })) {
    throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", `${label} digest is invalid.`);
  }
}

function validateReceiptExternalSideEffectProof(proof, receipt) {
  if (proof === null) {
    if (receipt.result === "blocked" && receipt.exitReason?.code === "EXECUTION_ENVIRONMENT_UNSAFE") return;
    throw new PromotionGateError(
      "RECEIPT_SIDE_EFFECT_INVALID",
      "Receipt external-side-effect proof is missing."
    );
  }
  assertExactKeys(proof, [
    "schemaVersion",
    "result",
    "policy",
    "registeredOperations",
    "gitPolicy",
    "resolverEnvironment",
    "tempRootProof",
    "checkerCapabilityPolicy",
    "networkRequestCount",
    "providerCallCount",
    "databaseWriteCount",
    "deploymentCommandCount",
    "digest"
  ], "receipt externalSideEffects");
  assertExactKeys(proof.gitPolicy, [
    "executable",
    "path",
    "optionalLocks",
    "fsmonitor",
    "hooks",
    "pager",
    "terminalPrompt",
    "systemConfig",
    "globalConfig",
    "inheritedGitEnvironment"
  ], "receipt externalSideEffects.gitPolicy");
  assertExactKeys(
    proof.resolverEnvironment,
    ["NEXT_TSCONFIG_PATH", "NEXT_DIST_DIR"],
    "receipt externalSideEffects.resolverEnvironment"
  );
  assertExactKeys(
    proof.tempRootProof,
    ["rootSource", "outsideRepository", "outsideForbiddenPaths"],
    "receipt externalSideEffects.tempRootProof"
  );
  assertExactKeys(proof.checkerCapabilityPolicy, [
    "schemaVersion", "result", "policy", "checkerBundleDigest", "sourceBindings",
    "sourceBindingsDigest", "forbiddenModuleSetDigest", "registeredExecFileImportCount",
    "registeredExecFileCallCount", "forbiddenCapabilityCount", "digest"
  ], "receipt externalSideEffects.checkerCapabilityPolicy");
  if (!Array.isArray(proof.checkerCapabilityPolicy.sourceBindings)) {
    throw new PromotionGateError("RECEIPT_SIDE_EFFECT_INVALID", "Checker capability source bindings are invalid.");
  }
  for (const [index, binding] of proof.checkerCapabilityPolicy.sourceBindings.entries()) {
    assertExactKeys(binding, ["path", "rawSha256"], `checker capability sourceBindings[${index}]`);
    assertSafeRepoRelativePath(binding.path);
    assertSha256(binding.rawSha256, `checker capability sourceBindings[${index}].rawSha256`);
  }
  const checkerCapabilityPayload = cloneCanonical(proof.checkerCapabilityPolicy);
  delete checkerCapabilityPayload.digest;
  if (
    proof.schemaVersion !== "promotion-external-side-effect-proof.v1" ||
    proof.result !== "pass" ||
    proof.policy !== "registered-local-only-operations.v1" ||
    stableJson(proof.registeredOperations) !== stableJson(EXTERNAL_SIDE_EFFECT_REGISTERED_OPERATIONS) ||
    stableJson(proof.gitPolicy) !== stableJson({
      executable: REGISTERED_GIT_EXECUTABLE,
      path: REGISTERED_GIT_PATH,
      optionalLocks: false,
      fsmonitor: false,
      hooks: false,
      pager: "cat",
      terminalPrompt: false,
      systemConfig: false,
      globalConfig: false,
      inheritedGitEnvironment: false
    }) ||
    stableJson(proof.resolverEnvironment) !== stableJson({
      NEXT_TSCONFIG_PATH: "unset",
      NEXT_DIST_DIR: "unset"
    }) ||
    stableJson(proof.tempRootProof) !== stableJson({
      rootSource: "node-os-tmpdir",
      outsideRepository: true,
      outsideForbiddenPaths: true
    }) ||
    proof.checkerCapabilityPolicy.schemaVersion !== "promotion-checker-capability-proof.v1" ||
    proof.checkerCapabilityPolicy.result !== "pass" ||
    proof.checkerCapabilityPolicy.policy !== "no-network-provider-database-deploy.v1" ||
    proof.checkerCapabilityPolicy.checkerBundleDigest !== receipt.binding.checkerRelease.bundleDigest ||
    stableJson(proof.checkerCapabilityPolicy.sourceBindings.map(({ path: sourcePath }) => sourcePath)) !==
      stableJson(CHECKER_CAPABILITY_SOURCE_PATHS) ||
    proof.checkerCapabilityPolicy.sourceBindingsDigest !==
      fingerprint(proof.checkerCapabilityPolicy.sourceBindings) ||
    proof.checkerCapabilityPolicy.forbiddenModuleSetDigest !==
      fingerprint(FORBIDDEN_CHECKER_CAPABILITY_MODULES) ||
    proof.checkerCapabilityPolicy.registeredExecFileImportCount !== 1 ||
    proof.checkerCapabilityPolicy.registeredExecFileCallCount !== 1 ||
    proof.checkerCapabilityPolicy.forbiddenCapabilityCount !== 0 ||
    proof.checkerCapabilityPolicy.digest !== fingerprint(checkerCapabilityPayload) ||
    proof.networkRequestCount !== 0 ||
    proof.providerCallCount !== 0 ||
    proof.databaseWriteCount !== 0 ||
    proof.deploymentCommandCount !== 0
  ) {
    throw new PromotionGateError(
      "RECEIPT_SIDE_EFFECT_INVALID",
      "Receipt external-side-effect proof contradicts the registered local-only operation policy."
    );
  }
  const payload = cloneCanonical(proof);
  delete payload.digest;
  if (proof.digest !== fingerprint(payload)) {
    throw new PromotionGateError("RECEIPT_SIDE_EFFECT_INVALID", "Receipt external-side-effect proof digest is invalid.");
  }
}

function validateReceiptAttemptHistoryProof(proof, executionCommit, result) {
  if (proof === null) {
    if (result === "pass") {
      throw new PromotionGateError(
        "RECEIPT_ATTEMPT_HISTORY_INVALID",
        "Passing Receipt requires an immutable attempt-history proof."
      );
    }
    return;
  }
  assertExactKeys(proof, [
    "schemaVersion", "result", "policy", "historyScope", "otherRefsCovered", "historyTrustBoundary",
    "executionCommit", "roots", "inspectedCommitCount",
    "currentArtifactCount", "uniqueArtifactVersionCount", "uniqueArtifactBytes", "attemptCount",
    "frozenAttemptCount", "terminalAttemptCount", "registeredManifest", "expectedAttemptStatus",
    "expectedAttemptTerminal", "manifestPathDigest",
    "pilotAttemptDigest", "historyDigest", "currentTreeDigest", "currentTrackedInputCount",
    "currentTrackedInputAggregateDigest", "cleanWorktree", "digest"
  ], "receipt attemptHistoryProof");
  if (
    proof.schemaVersion !== "promotion-attempt-history-proof.v1" ||
    proof.result !== "pass" ||
    proof.policy !== "immutable-attempt-artifacts.v1" ||
    proof.historyScope !== "execution-head-first-parent" ||
    proof.otherRefsCovered !== false ||
    proof.historyTrustBoundary !==
      "Execution HEAD first-parent history only; remote and divergent ref uniqueness requires required PR/main post-merge enforcement." ||
    proof.executionCommit !== executionCommit ||
    stableJson(proof.roots) !== stableJson(PROMOTION_ATTEMPT_HISTORY_ROOTS) ||
    !Number.isSafeInteger(proof.inspectedCommitCount) ||
    proof.inspectedCommitCount < 1 ||
    proof.inspectedCommitCount > PROMOTION_ATTEMPT_HISTORY_MAX_COMMITS ||
    !Number.isSafeInteger(proof.currentArtifactCount) ||
    proof.currentArtifactCount < 1 ||
    proof.currentArtifactCount > PROMOTION_ATTEMPT_HISTORY_MAX_ARTIFACTS ||
    !Number.isSafeInteger(proof.uniqueArtifactVersionCount) ||
    proof.uniqueArtifactVersionCount < 1 ||
    !Number.isSafeInteger(proof.uniqueArtifactBytes) ||
    proof.uniqueArtifactBytes < 1 ||
    proof.uniqueArtifactBytes > PROMOTION_ATTEMPT_HISTORY_MAX_UNIQUE_BYTES ||
    !Number.isSafeInteger(proof.attemptCount) ||
    proof.attemptCount < 1 ||
    !Number.isSafeInteger(proof.frozenAttemptCount) ||
    proof.frozenAttemptCount < 0 ||
    proof.frozenAttemptCount > proof.attemptCount ||
    !Number.isSafeInteger(proof.terminalAttemptCount) ||
    proof.terminalAttemptCount < 0 ||
    proof.terminalAttemptCount > proof.frozenAttemptCount ||
    proof.registeredManifest !== true ||
    !["draft", "shadow_ready", "shadow_passed", "repair_required", "rejected"].includes(proof.expectedAttemptStatus) ||
    proof.expectedAttemptTerminal !== ["shadow_passed", "repair_required", "rejected"].includes(proof.expectedAttemptStatus) ||
    !Number.isSafeInteger(proof.currentTrackedInputCount) ||
    proof.currentTrackedInputCount !== proof.currentArtifactCount ||
    proof.cleanWorktree !== true
  ) {
    throw new PromotionGateError(
      "RECEIPT_ATTEMPT_HISTORY_INVALID",
      "Receipt attempt-history proof is malformed or exceeds its frozen bounds."
    );
  }
  for (const field of [
    "manifestPathDigest", "pilotAttemptDigest", "historyDigest", "currentTreeDigest",
    "currentTrackedInputAggregateDigest", "digest"
  ]) assertSha256(proof[field], `receipt attemptHistoryProof.${field}`);
  const payload = cloneCanonical(proof);
  delete payload.digest;
  if (proof.digest !== fingerprint(payload)) {
    throw new PromotionGateError(
      "RECEIPT_ATTEMPT_HISTORY_INVALID",
      "Receipt attempt-history proof digest is invalid."
    );
  }
}

function validateReceiptWorktreeProof(worktreeProof, result) {
  if (worktreeProof === null) {
    if (result === "pass") {
      throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Passing receipt requires a Git worktree proof.");
    }
    return;
  }
  assertExactKeys(worktreeProof, [
    "executionCommit",
    "preClean",
    "postClean",
    "preStatusSha256",
    "postStatusSha256",
    "preStatusEntryCount",
    "postStatusEntryCount",
    "trackedInputCount",
    "trackedInputAggregateDigest",
    "attemptHistoryProof"
  ], "receipt worktreeProof");
  if (
    !/^[a-f0-9]{40}$/u.test(worktreeProof.executionCommit) ||
    typeof worktreeProof.preClean !== "boolean" ||
    typeof worktreeProof.postClean !== "boolean" ||
    !/^[a-f0-9]{64}$/u.test(worktreeProof.preStatusSha256) ||
    !/^[a-f0-9]{64}$/u.test(worktreeProof.postStatusSha256) ||
    !Number.isSafeInteger(worktreeProof.preStatusEntryCount) ||
    worktreeProof.preStatusEntryCount < 0 ||
    !Number.isSafeInteger(worktreeProof.postStatusEntryCount) ||
    worktreeProof.postStatusEntryCount < 0
  ) {
    throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Receipt Git worktree proof is malformed.");
  }
  const emptyStatusSha256 = sha256(Buffer.alloc(0));
  if (
    (worktreeProof.preClean &&
      (worktreeProof.preStatusEntryCount !== 0 || worktreeProof.preStatusSha256 !== emptyStatusSha256)) ||
    (worktreeProof.postClean &&
      (worktreeProof.postStatusEntryCount !== 0 || worktreeProof.postStatusSha256 !== emptyStatusSha256)) ||
    (!worktreeProof.preClean && worktreeProof.preStatusEntryCount === 0) ||
    (!worktreeProof.postClean && worktreeProof.postStatusEntryCount === 0)
  ) {
    throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Receipt Git cleanliness fields contradict each other.");
  }
  const trackedProofAbsent = worktreeProof.trackedInputCount === null && worktreeProof.trackedInputAggregateDigest === null;
  const trackedProofPresent =
    Number.isSafeInteger(worktreeProof.trackedInputCount) &&
    worktreeProof.trackedInputCount > 0 &&
    /^[a-f0-9]{64}$/u.test(worktreeProof.trackedInputAggregateDigest);
  if (!trackedProofAbsent && !trackedProofPresent) {
    throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Receipt tracked-input proof is incomplete.");
  }
  if (result === "pass" && (!worktreeProof.preClean || !worktreeProof.postClean || !trackedProofPresent)) {
    throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Passing receipt requires clean pre/post and committed inputs.");
  }
  validateReceiptAttemptHistoryProof(worktreeProof.attemptHistoryProof, worktreeProof.executionCommit, result);
}

function validateReceiptCheckerReleaseProof(proof, binding, result) {
  if (proof === null) {
    if (result === "pass") {
      throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Passing receipt requires a checker release proof.");
    }
    return;
  }
  assertExactKeys(proof, [
    "schemaVersion",
    "version",
    "releaseCommit",
    "mappingPath",
    "mappingRawSha256",
    "bundleAlgorithm",
    "bundlePaths",
    "bundleFiles",
    "bundleDigest",
    "currentMatchesRelease",
    "targetBaselineMappingStatus",
    "genesisProof",
    "digest"
  ], "receipt checkerReleaseProof");
  if (
    proof.schemaVersion !== "promotion-checker-release-proof.v1" ||
    proof.version !== binding.checkerRelease.version ||
    proof.releaseCommit !== binding.checkerRelease.releaseCommit ||
    proof.mappingPath !== binding.checkerRelease.mappingPath ||
    proof.mappingRawSha256 !== binding.checkerRelease.mappingRawSha256 ||
    proof.bundleAlgorithm !== "sha256-stable-json-path-raw-v1" ||
    stableJson(proof.bundlePaths) !== stableJson(CHECKER_BUNDLE_PATHS) ||
    proof.bundleDigest !== binding.checkerRelease.bundleDigest ||
    proof.currentMatchesRelease !== true ||
    !["initial-release-absent", "same-version-identical"].includes(proof.targetBaselineMappingStatus) ||
    !Array.isArray(proof.bundleFiles) ||
    proof.bundleFiles.length !== CHECKER_BUNDLE_PATHS.length
  ) {
    throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Receipt checker release proof is incomplete.");
  }
  if (proof.targetBaselineMappingStatus === "initial-release-absent") {
    assertExactKeys(proof.genesisProof, [
      "releaseParentCommit", "ledgerOnlyCommit", "parentMappingAbsent",
      "sameVersionGenesisCount", "sameVersionGenesisDigest"
    ], "receipt checkerReleaseProof.genesisProof");
    if (
      !/^[a-f0-9]{40}$/u.test(proof.genesisProof.releaseParentCommit) ||
      proof.genesisProof.ledgerOnlyCommit !== true ||
      proof.genesisProof.parentMappingAbsent !== true ||
      proof.genesisProof.sameVersionGenesisCount !== 1
    ) {
      throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Receipt checker genesis proof is incomplete.");
    }
    assertSha256(proof.genesisProof.sameVersionGenesisDigest, "receipt checker genesis digest");
  } else if (proof.genesisProof !== null) {
    throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Non-genesis checker proof cannot contain genesis data.");
  }
  for (const [index, file] of proof.bundleFiles.entries()) {
    assertExactKeys(file, ["path", "rawSha256"], `receipt checkerReleaseProof.bundleFiles[${index}]`);
    if (file.path !== CHECKER_BUNDLE_PATHS[index]) {
      throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Receipt checker bundle path order changed.");
    }
    assertSha256(file.rawSha256, `receipt checkerReleaseProof.bundleFiles[${index}].rawSha256`);
  }
  assertSha256(proof.bundleDigest, "receipt checkerReleaseProof.bundleDigest");
  assertSha256(proof.digest, "receipt checkerReleaseProof.digest");
  const payload = cloneCanonical(proof);
  delete payload.digest;
  if (proof.bundleDigest !== fingerprint(proof.bundleFiles) || proof.digest !== fingerprint(payload)) {
    throw new PromotionGateError("RECEIPT_CHECKER_PROOF_INVALID", "Receipt checker release proof digest is invalid.");
  }
}

function validateReceiptCheckResults(receipt) {
  if (!Array.isArray(receipt.checkResults) || receipt.checkResults.length !== REQUIRED_CHECK_IDS.length) {
    throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Receipt must bind the exact ordered v1 check set.");
  }
  const terminalResults = [];
  for (const [index, check] of receipt.checkResults.entries()) {
    const expectedCheckId = REQUIRED_CHECK_IDS[index];
    if (!isPlainObject(check) || check.checkId !== expectedCheckId) {
      throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Receipt check ids or ordering changed.");
    }
    if (check.result === "pass") {
      assertExactKeys(check, ["checkId", "result", "evidenceDigest"], `receipt checkResults[${index}]`);
      assertSha256(check.evidenceDigest, `receipt checkResults[${index}].evidenceDigest`);
      if (check.evidenceDigest !== fingerprint(normativeCheckEvidencePayload(receipt, check))) {
        throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Passing check evidence digest is stale or invalid.");
      }
    } else if (check.result === "not_run") {
      assertExactKeys(check, ["checkId", "result", "evidenceDigest"], `receipt checkResults[${index}]`);
      if (check.evidenceDigest !== null) {
        throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "A not-run check must have a null evidence digest.");
      }
    } else if (check.result === "fail" || check.result === "blocked") {
      assertExactKeys(
        check,
        ["checkId", "result", "code", "message", "details", "evidenceDigest"],
        `receipt checkResults[${index}]`
      );
      assertNonEmptyString(check.code, `receipt checkResults[${index}].code`);
      assertNonEmptyString(check.message, `receipt checkResults[${index}].message`);
      assertSha256(check.evidenceDigest, `receipt checkResults[${index}].evidenceDigest`);
      if (!isPlainObject(check.details)) {
        throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Receipt failed check details must be a plain object.");
      }
      if (check.evidenceDigest !== fingerprint(normativeCheckEvidencePayload(receipt, check))) {
        throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Failed check evidence digest is stale or invalid.");
      }
      terminalResults.push(check);
    } else {
      throw new PromotionGateError("RECEIPT_CHECK_SET_INVALID", "Receipt check result is unsupported.");
    }
  }
  if (receipt.result === "pass") {
    if (receipt.checkResults.some(({ result }) => result !== "pass") || terminalResults.length !== 0) {
      throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Passing receipt must contain eight passing checks.");
    }
    return;
  }
  if (terminalResults.length === 0 || terminalResults.some(({ result }) => result !== receipt.result)) {
    throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Controlled receipt result must match its failed or blocked checks.");
  }
  if (!terminalResults.some((check) =>
    check.checkId === receipt.exitReason.checkId &&
    check.code === receipt.exitReason.code &&
    check.message === receipt.exitReason.message &&
    stableJson(check.details) === stableJson(receipt.exitReason.details)
  )) {
    throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Receipt exit reason is not bound to a matching check result.");
  }
}

function validateReceiptProofs(receipt) {
  if (receipt.sourceSnapshots !== null) {
    assertExactKeys(receipt.sourceSnapshots, ["pre", "post", "equal"], "receipt sourceSnapshots");
    validateReceiptSnapshot(receipt.sourceSnapshots.pre, "receipt sourceSnapshots.pre");
    validateReceiptSnapshot(receipt.sourceSnapshots.post, "receipt sourceSnapshots.post");
    if (typeof receipt.sourceSnapshots.equal !== "boolean") {
      throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", "Receipt snapshot equality must be boolean.");
    }
    const byteEqual = stableJson(receipt.sourceSnapshots.pre) === stableJson(receipt.sourceSnapshots.post);
    if (receipt.sourceSnapshots.equal !== byteEqual || (receipt.result === "pass" && !byteEqual)) {
      throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", "Receipt source snapshot equality is false or contradictory.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_SOURCE_SNAPSHOT_INVALID", "Passing receipt requires source snapshots.");
  }

  if (receipt.candidateSourceProof !== null) {
    assertExactKeys(
      receipt.candidateSourceProof,
      ["paths", "preAggregateDigest", "postAggregateDigest", "equal"],
      "receipt candidateSourceProof"
    );
    if (!Array.isArray(receipt.candidateSourceProof.paths) || receipt.candidateSourceProof.paths.length !== 3) {
      throw new PromotionGateError("RECEIPT_CANDIDATE_SOURCE_INVALID", "Candidate source proof requires three paths.");
    }
    for (const candidatePath of receipt.candidateSourceProof.paths) assertSafeRepoRelativePath(candidatePath);
    assertSha256(receipt.candidateSourceProof.preAggregateDigest, "candidateSourceProof.preAggregateDigest");
    assertSha256(receipt.candidateSourceProof.postAggregateDigest, "candidateSourceProof.postAggregateDigest");
    const digestEqual =
      receipt.candidateSourceProof.preAggregateDigest === receipt.candidateSourceProof.postAggregateDigest;
    if (
      receipt.candidateSourceProof.equal !== digestEqual ||
      (receipt.result === "pass" && !digestEqual)
    ) {
      throw new PromotionGateError("RECEIPT_CANDIDATE_SOURCE_INVALID", "Candidate source proof is not byte-equal.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_CANDIDATE_SOURCE_INVALID", "Passing receipt requires candidate source proof.");
  }

  if (receipt.candidateInventoryProof !== null) {
    const proof = receipt.candidateInventoryProof;
    assertExactKeys(proof, ["schemaVersion", "entries", "aggregateDigest"], "receipt candidateInventoryProof");
    if (
      proof.schemaVersion !== "promotion-candidate-inventory-proof.v1" ||
      !Array.isArray(proof.entries) ||
      proof.entries.length !== 3
    ) {
      throw new PromotionGateError("RECEIPT_CANDIDATE_INVENTORY_INVALID", "Candidate inventory proof is incomplete.");
    }
    const expected = [
      { kind: "safe-card", path: CANONICAL_CANDIDATE_SELECTION[0].path, containerPointer: "", recordCount: 146, selectedIndex: 108 },
      { kind: "practice", path: CANONICAL_CANDIDATE_SELECTION[1].path, containerPointer: "/questions", recordCount: 68, selectedIndex: 30 },
      { kind: "lesson", path: CANONICAL_CANDIDATE_SELECTION[2].path, containerPointer: "/lessons", recordCount: 68, selectedIndex: 30 }
    ];
    for (const [index, entry] of proof.entries.entries()) {
      assertExactKeys(entry, [
        "kind", "path", "containerPointer", "recordCount", "idSetDigest",
        "selectedId", "selectedOccurrenceCount", "selectedIndex"
      ], `receipt candidateInventoryProof.entries[${index}]`);
      const contract = expected[index];
      if (
        entry.kind !== contract.kind ||
        entry.path !== contract.path ||
        entry.containerPointer !== contract.containerPointer ||
        entry.recordCount !== contract.recordCount ||
        entry.selectedId !== CANONICAL_CANDIDATE_SELECTION[index].id ||
        entry.selectedOccurrenceCount !== 1 ||
        entry.selectedIndex !== contract.selectedIndex
      ) {
        throw new PromotionGateError("RECEIPT_CANDIDATE_INVENTORY_INVALID", "Candidate inventory proof changed its exact v1 contract.");
      }
      assertSha256(entry.idSetDigest, `receipt candidateInventoryProof.entries[${index}].idSetDigest`);
    }
    const payload = { schemaVersion: proof.schemaVersion, entries: proof.entries };
    if (proof.aggregateDigest !== fingerprint(payload)) {
      throw new PromotionGateError("RECEIPT_CANDIDATE_INVENTORY_INVALID", "Candidate inventory aggregate digest is invalid.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_CANDIDATE_INVENTORY_INVALID", "Passing receipt requires candidate inventory proof.");
  }

  if (receipt.evidenceIndexProof !== null) {
    assertExactKeys(
      receipt.evidenceIndexProof,
      [
        "path", "rawSha256", "entryCount", "entriesDigest",
        "reviewedCommitCount", "reviewedCommitsDigest"
      ],
      "receipt evidenceIndexProof"
    );
    assertSafeRepoRelativePath(receipt.evidenceIndexProof.path);
    assertSha256(receipt.evidenceIndexProof.rawSha256, "receipt evidenceIndexProof.rawSha256");
    assertSha256(receipt.evidenceIndexProof.entriesDigest, "receipt evidenceIndexProof.entriesDigest");
    assertSha256(receipt.evidenceIndexProof.reviewedCommitsDigest, "receipt evidenceIndexProof.reviewedCommitsDigest");
    if (
      receipt.evidenceIndexProof.entryCount !== REQUIRED_OWNER_ROLES.length ||
      receipt.evidenceIndexProof.reviewedCommitCount !== REQUIRED_OWNER_ROLES.length
    ) {
      throw new PromotionGateError("RECEIPT_EVIDENCE_INDEX_INVALID", "Receipt evidence index must bind exactly nine owners.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_EVIDENCE_INDEX_INVALID", "Passing receipt requires evidence index proof.");
  }

  if (receipt.candidateProvenanceProof !== null) {
    const proof = receipt.candidateProvenanceProof;
    assertExactKeys(proof, [
      "schemaVersion",
      "candidateSourceCommit",
      "targetBaselineCommit",
      "sourceCommitExists",
      "targetBaselineCommitExists",
      "sourceAncestorOfExecution",
      "targetBaselineAncestorOfExecution",
      "artifacts",
      "sourceAggregateDigest",
      "currentAggregateDigest",
      "equal",
      "digest"
    ], "receipt candidateProvenanceProof");
    if (
      proof.schemaVersion !== "promotion-candidate-provenance.v1" ||
      proof.candidateSourceCommit !== receipt.binding.sourceCommit ||
      proof.targetBaselineCommit !== receipt.binding.targetBaselineCommit ||
      proof.sourceCommitExists !== true ||
      proof.targetBaselineCommitExists !== true ||
      proof.sourceAncestorOfExecution !== true ||
      proof.targetBaselineAncestorOfExecution !== true ||
      proof.equal !== true ||
      !Array.isArray(proof.artifacts) ||
      proof.artifacts.length !== 3
    ) {
      throw new PromotionGateError("RECEIPT_PROVENANCE_INVALID", "Receipt candidate provenance proof is incomplete.");
    }
    const aggregateInput = [];
    for (const [index, artifact] of proof.artifacts.entries()) {
      assertExactKeys(
        artifact,
        ["kind", "id", "path", "jsonPointer", "rawFileSha256", "recordSha256"],
        `receipt candidateProvenanceProof.artifacts[${index}]`
      );
      const selection = CANONICAL_CANDIDATE_SELECTION[index];
      if (
        artifact.kind !== selection.kind ||
        artifact.id !== selection.id ||
        artifact.path !== selection.path ||
        artifact.jsonPointer !== selection.jsonPointer
      ) {
        throw new PromotionGateError("RECEIPT_PROVENANCE_INVALID", "Receipt candidate provenance selection changed.");
      }
      assertSha256(artifact.rawFileSha256, `receipt candidateProvenanceProof.artifacts[${index}].rawFileSha256`);
      assertSha256(artifact.recordSha256, `receipt candidateProvenanceProof.artifacts[${index}].recordSha256`);
      aggregateInput.push({
        kind: artifact.kind,
        id: artifact.id,
        path: artifact.path,
        rawFileSha256: artifact.rawFileSha256,
        recordSha256: artifact.recordSha256
      });
    }
    assertSha256(proof.sourceAggregateDigest, "receipt candidateProvenanceProof.sourceAggregateDigest");
    assertSha256(proof.currentAggregateDigest, "receipt candidateProvenanceProof.currentAggregateDigest");
    assertSha256(proof.digest, "receipt candidateProvenanceProof.digest");
    const proofWithoutDigest = cloneCanonical(proof);
    delete proofWithoutDigest.digest;
    if (
      proof.sourceAggregateDigest !== fingerprint(aggregateInput) ||
      proof.currentAggregateDigest !== proof.sourceAggregateDigest ||
      proof.digest !== fingerprint(proofWithoutDigest)
    ) {
      throw new PromotionGateError("RECEIPT_PROVENANCE_INVALID", "Receipt candidate provenance digests are invalid.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_PROVENANCE_INVALID", "Passing receipt requires candidate provenance proof.");
  }

  if (receipt.targetBaselineProof !== null) {
    const proof = receipt.targetBaselineProof;
    assertExactKeys(proof, [
      "schemaVersion",
      "targetBaselineCommit",
      "scope",
      "fileCount",
      "pathsDigest",
      "targetTreeDigest",
      "currentTreeDigest",
      "equal",
      "digest"
    ], "receipt targetBaselineProof");
    if (
      proof.schemaVersion !== "promotion-target-baseline-proof.v1" ||
      proof.targetBaselineCommit !== receipt.binding.targetBaselineCommit ||
      proof.scope !== "app-components-data-lib-public-middleware-resolver-v1" ||
      !Number.isSafeInteger(proof.fileCount) || proof.fileCount <= 0 ||
      proof.equal !== true
    ) {
      throw new PromotionGateError(
        "RECEIPT_TARGET_BASELINE_INVALID",
        "Receipt target-baseline proof is incomplete or bound to another baseline."
      );
    }
    for (const field of ["pathsDigest", "targetTreeDigest", "currentTreeDigest", "digest"]) {
      assertSha256(proof[field], `receipt targetBaselineProof.${field}`);
    }
    const payload = cloneCanonical(proof);
    delete payload.digest;
    if (proof.targetTreeDigest !== proof.currentTreeDigest || proof.digest !== fingerprint(payload)) {
      throw new PromotionGateError(
        "RECEIPT_TARGET_BASELINE_INVALID",
        "Receipt target-baseline projection digests are invalid."
      );
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError(
      "RECEIPT_TARGET_BASELINE_INVALID",
      "Passing receipt requires exact target-baseline runtime projection proof."
    );
  }

  if (receipt.shadowOutput !== null) {
    assertExactKeys(receipt.shadowOutput, ["tempRootPolicy", "outputs", "aggregateDigest"], "receipt shadowOutput");
    if (receipt.shadowOutput.tempRootPolicy !== "os-temp-only" || !Array.isArray(receipt.shadowOutput.outputs)) {
      throw new PromotionGateError("RECEIPT_SHADOW_OUTPUT_INVALID", "Receipt shadow output policy or output set is invalid.");
    }
    const outputKinds = new Set();
    const outputPaths = new Set();
    for (const [index, output] of receipt.shadowOutput.outputs.entries()) {
      assertExactKeys(output, ["kind", "path", "rawSha256", "semanticSha256"], `receipt shadowOutput.outputs[${index}]`);
      if (!["safe-card", "practice", "lesson"].includes(output.kind)) {
        throw new PromotionGateError("RECEIPT_SHADOW_OUTPUT_INVALID", "Receipt contains an unknown shadow output kind.");
      }
      assertSafeRepoRelativePath(output.path);
      if (output.path.includes("/")) {
        throw new PromotionGateError("RECEIPT_SHADOW_OUTPUT_INVALID", "Receipt shadow output paths must be temp-root file names.");
      }
      assertSha256(output.rawSha256, `receipt shadowOutput.outputs[${index}].rawSha256`);
      assertSha256(output.semanticSha256, `receipt shadowOutput.outputs[${index}].semanticSha256`);
      outputKinds.add(output.kind);
      outputPaths.add(output.path.toLocaleLowerCase("en-US"));
    }
    if (
      receipt.shadowOutput.outputs.length !== 3 ||
      outputKinds.size !== 3 ||
      outputPaths.size !== 3 ||
      receipt.shadowOutput.aggregateDigest !== fingerprint(receipt.shadowOutput.outputs)
    ) {
      throw new PromotionGateError("RECEIPT_SHADOW_OUTPUT_INVALID", "Receipt shadow output aggregate is invalid.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_SHADOW_OUTPUT_INVALID", "Passing receipt requires three shadow outputs.");
  }

  if (receipt.mappingCompatibility !== null) {
    assertExactKeys(
      receipt.mappingCompatibility,
      ["result", "dtoSchemaVersion", "outputSemanticDigests", "digest"],
      "receipt mappingCompatibility"
    );
    const mappingPayload = {
      result: receipt.mappingCompatibility.result,
      dtoSchemaVersion: receipt.mappingCompatibility.dtoSchemaVersion,
      outputSemanticDigests: receipt.mappingCompatibility.outputSemanticDigests
    };
    if (
      mappingPayload.result !== "pass" ||
      mappingPayload.dtoSchemaVersion !== "promotion-shadow-dto.v1" ||
      !Array.isArray(mappingPayload.outputSemanticDigests) ||
      receipt.mappingCompatibility.digest !== fingerprint(mappingPayload)
    ) {
      throw new PromotionGateError("RECEIPT_MAPPING_INVALID", "Receipt mapping compatibility proof is invalid.");
    }
    const mappingKinds = new Set();
    for (const [index, entry] of mappingPayload.outputSemanticDigests.entries()) {
      assertExactKeys(entry, ["kind", "semanticSha256"], `receipt mappingCompatibility.outputSemanticDigests[${index}]`);
      if (!["safe-card", "practice", "lesson"].includes(entry.kind)) {
        throw new PromotionGateError("RECEIPT_MAPPING_INVALID", "Receipt mapping compatibility contains an unknown output kind.");
      }
      assertSha256(entry.semanticSha256, `receipt mappingCompatibility.outputSemanticDigests[${index}].semanticSha256`);
      mappingKinds.add(entry.kind);
    }
    if (mappingPayload.outputSemanticDigests.length !== 3 || mappingKinds.size !== 3) {
      throw new PromotionGateError(
        "RECEIPT_MAPPING_INVALID",
        "Receipt mapping compatibility must bind exactly one safe-card, practice, and lesson digest."
      );
    }
    if (receipt.shadowOutput !== null) {
      const expectedSemanticDigests = receipt.shadowOutput.outputs.map(({ kind, semanticSha256 }) => ({ kind, semanticSha256 }));
      if (stableJson(mappingPayload.outputSemanticDigests) !== stableJson(expectedSemanticDigests)) {
        throw new PromotionGateError("RECEIPT_MAPPING_INVALID", "Receipt mapping digests do not match shadow outputs.");
      }
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_MAPPING_INVALID", "Passing receipt requires mapping compatibility proof.");
  }

  if (receipt.rollbackProof !== null) {
    assertExactKeys(
      receipt.rollbackProof,
      ["method", "preimageDigest", "postRollbackDigest", "digest", "deletedPaths", "verifiedAbsent", "rootRemoved"],
      "receipt rollbackProof"
    );
    assertSha256(receipt.rollbackProof.preimageDigest, "rollbackProof.preimageDigest");
    assertSha256(receipt.rollbackProof.postRollbackDigest, "rollbackProof.postRollbackDigest");
    const rollbackPayload = {
      method: receipt.rollbackProof.method,
      preimageDigest: receipt.rollbackProof.preimageDigest,
      postRollbackDigest: receipt.rollbackProof.postRollbackDigest,
      deletedPaths: receipt.rollbackProof.deletedPaths,
      verifiedAbsent: receipt.rollbackProof.verifiedAbsent,
      rootRemoved: receipt.rollbackProof.rootRemoved
    };
    const expectedDeletedPaths = receipt.shadowOutput?.outputs?.map((output) => output.path) ?? [];
    if (
      rollbackPayload.method !== "delete-and-verify-absent" ||
      rollbackPayload.preimageDigest !== rollbackPayload.postRollbackDigest ||
      receipt.rollbackProof.digest !== fingerprint(rollbackPayload) ||
      rollbackPayload.verifiedAbsent !== true ||
      rollbackPayload.rootRemoved !== true ||
      stableJson(rollbackPayload.deletedPaths) !== stableJson(expectedDeletedPaths)
    ) {
      throw new PromotionGateError("RECEIPT_ROLLBACK_INVALID", "Receipt does not prove complete preimage-equal rollback.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_ROLLBACK_INVALID", "Passing receipt requires rollback proof.");
  }

  if (receipt.reachability !== null) {
    assertExactKeys(receipt.reachability, [
      "policy", "result", "selectedCandidateReachable", "scannedPaths", "matches",
      "unresolvedDynamicImports", "excludedNonRuntimeMatches", "runtimeGraph",
      "loaderPolicyProof", "rawObservation", "registryProof"
    ], "receipt reachability");
    if (
      receipt.reachability.policy !== "selected-candidate-unreachable" ||
      receipt.reachability.result !== "pass" ||
      receipt.reachability.selectedCandidateReachable !== false ||
      !Array.isArray(receipt.reachability.scannedPaths) ||
      receipt.reachability.scannedPaths.length === 0 ||
      !Array.isArray(receipt.reachability.matches) ||
      receipt.reachability.matches.length !== 0 ||
      !Array.isArray(receipt.reachability.unresolvedDynamicImports) ||
      receipt.reachability.unresolvedDynamicImports.length !== 0 ||
      !Array.isArray(receipt.reachability.excludedNonRuntimeMatches)
    ) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt does not prove selected-candidate unreachability.");
    }
    for (const scannedPath of receipt.reachability.scannedPaths) assertSafeRepoRelativePath(scannedPath);
    for (const [index, excluded] of receipt.reachability.excludedNonRuntimeMatches.entries()) {
      assertExactKeys(excluded, ["path", "classification", "marker"], `receipt reachability excluded[${index}]`);
      assertSafeRepoRelativePath(excluded.path);
      if (!['test-code', 'audit-script'].includes(excluded.classification)) {
        throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Only isolated test/audit marker hits may be excluded.");
      }
      assertNonEmptyString(excluded.marker, `receipt reachability excluded[${index}].marker`);
    }
    assertExactKeys(
      receipt.reachability.runtimeGraph,
      [
        "parser", "seedCount", "seedDigest", "reachablePathCount", "reachablePathsDigest",
        "edgeCount", "edgeDigest", "topologyEdgeCount", "topologyEdgeDigest"
      ],
      "receipt reachability runtimeGraph"
    );
    assertExactKeys(receipt.reachability.runtimeGraph.parser, ["name", "version"], "receipt runtimeGraph parser");
    if (
      receipt.reachability.runtimeGraph.parser.name !== "typescript" ||
      receipt.reachability.runtimeGraph.parser.version !== TYPESCRIPT_PARSER_VERSION ||
      !Number.isSafeInteger(receipt.reachability.runtimeGraph.seedCount) ||
      receipt.reachability.runtimeGraph.seedCount < CANONICAL_RUNTIME_ENTRYPOINTS.length ||
      !Number.isSafeInteger(receipt.reachability.runtimeGraph.reachablePathCount) ||
      receipt.reachability.runtimeGraph.reachablePathCount < receipt.reachability.runtimeGraph.seedCount ||
      !Number.isSafeInteger(receipt.reachability.runtimeGraph.edgeCount) ||
      receipt.reachability.runtimeGraph.edgeCount < 0 ||
      !Number.isSafeInteger(receipt.reachability.runtimeGraph.topologyEdgeCount) ||
      receipt.reachability.runtimeGraph.topologyEdgeCount < 0
    ) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt runtime graph counts are invalid.");
    }
    for (const field of ["seedDigest", "reachablePathsDigest", "edgeDigest", "topologyEdgeDigest"]) {
      assertSha256(receipt.reachability.runtimeGraph[field], `receipt reachability runtimeGraph.${field}`);
    }
    validateRuntimeLoaderPolicyDocument(receipt.reachability.loaderPolicyProof);
    assertExactKeys(receipt.reachability.rawObservation, [
      "coveredFileCount", "coveredFilesDigest", "coveredFilesAggregateDigest",
      "classifications", "classificationDigest"
    ], "receipt reachability rawObservation");
    if (
      !Number.isSafeInteger(receipt.reachability.rawObservation.coveredFileCount) ||
      receipt.reachability.rawObservation.coveredFileCount < 1 ||
      !Array.isArray(receipt.reachability.rawObservation.classifications) ||
      receipt.reachability.rawObservation.classifications.length !== RUNTIME_CLASSIFICATION_KINDS.length
    ) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt raw runtime observation is invalid.");
    }
    for (const field of ["coveredFilesDigest", "coveredFilesAggregateDigest", "classificationDigest"]) {
      assertSha256(receipt.reachability.rawObservation[field], `receipt reachability rawObservation.${field}`);
    }
    if (receipt.reachability.rawObservation.classificationDigest !== fingerprint(receipt.reachability.rawObservation.classifications)) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt runtime classification digest is invalid.");
    }
    assertExactKeys(
      receipt.reachability.registryProof,
      [
        "rawSha256",
        "resolverPolicyDigest",
        "frameworkBoundaryDigest",
        "frameworkEntrypointCount",
        "frameworkEntrypointsDigest",
        "runtimeGraphDigest",
        "loaderPolicyDigest",
        "sensitiveAnchorsDigest"
      ],
      "receipt reachability registryProof"
    );
    if (
      !Number.isSafeInteger(receipt.reachability.registryProof.frameworkEntrypointCount) ||
      receipt.reachability.registryProof.frameworkEntrypointCount < 0
    ) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt registry coverage counts are invalid.");
    }
    for (const field of [
      "rawSha256",
      "resolverPolicyDigest", "frameworkBoundaryDigest", "frameworkEntrypointsDigest",
      "runtimeGraphDigest", "loaderPolicyDigest", "sensitiveAnchorsDigest"
    ]) assertSha256(receipt.reachability.registryProof[field], `receipt reachability registryProof.${field}`);
    if (
      receipt.reachability.registryProof.runtimeGraphDigest !== fingerprint(receipt.reachability.runtimeGraph) ||
      receipt.reachability.registryProof.loaderPolicyDigest !== fingerprint(receipt.reachability.loaderPolicyProof)
    ) {
      throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Receipt registry proof does not bind the runtime graph and loader policy.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_REACHABILITY_INVALID", "Passing receipt requires reachability proof.");
  }

  if (receipt.legacyRatchetProof !== null) {
    const proof = receipt.legacyRatchetProof;
    assertExactKeys(proof, [
      "schemaVersion", "result", "ratchetPath", "ratchetRawSha256", "introducedAt", "expiresAt",
      "knownConflictCount", "observedConflictCount", "removedConflictCount", "observedEntriesDigest",
      "discoveryProof", "digest"
    ], "receipt legacyRatchetProof");
    if (
      proof.schemaVersion !== "promotion-legacy-ratchet-proof.v1" ||
      proof.result !== "pass" ||
      !Number.isSafeInteger(proof.knownConflictCount) || proof.knownConflictCount < 0 ||
      !Number.isSafeInteger(proof.observedConflictCount) || proof.observedConflictCount < 0 ||
      !Number.isSafeInteger(proof.removedConflictCount) || proof.removedConflictCount < 0 ||
      proof.knownConflictCount !== proof.observedConflictCount + proof.removedConflictCount
    ) {
      throw new PromotionGateError("RECEIPT_LEGACY_RATCHET_INVALID", "Receipt legacy ratchet counts or result are invalid.");
    }
    assertSafeRepoRelativePath(proof.ratchetPath);
    if (
      proof.introducedAt !== LEGACY_INTRODUCED_AT ||
      proof.expiresAt !== LEGACY_EXPIRES_AT ||
      !Number.isFinite(Date.parse(proof.introducedAt)) ||
      !Number.isFinite(Date.parse(proof.expiresAt))
    ) {
      throw new PromotionGateError(
        "RECEIPT_LEGACY_RATCHET_INVALID",
        "Receipt legacy ratchet window does not match the frozen v1 window."
      );
    }
    assertSha256(proof.ratchetRawSha256, "receipt legacyRatchetProof.ratchetRawSha256");
    assertSha256(proof.observedEntriesDigest, "receipt legacyRatchetProof.observedEntriesDigest");
    if (!isPlainObject(proof.discoveryProof)) {
      throw new PromotionGateError("RECEIPT_LEGACY_RATCHET_INVALID", "Receipt legacy discovery proof is missing.");
    }
    const payload = cloneCanonical(proof);
    delete payload.digest;
    if (proof.digest !== fingerprint(payload)) {
      throw new PromotionGateError("RECEIPT_LEGACY_RATCHET_INVALID", "Receipt legacy ratchet proof digest is invalid.");
    }
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_LEGACY_RATCHET_INVALID", "Passing receipt requires a legacy ratchet proof.");
  }

  if (!Array.isArray(receipt.liveBlockers) || receipt.liveBlockers.length !== 9) {
    throw new PromotionGateError("RECEIPT_LIVE_BOUNDARY_INVALID", "Receipt must expose the exact nine live blockers.");
  }
  validateKnownBlockers(receipt.liveBlockers);
  assertExactKeys(
    receipt.noLiveAuthorizations,
    ["integration", "live", "preview", "deploy"],
    "receipt noLiveAuthorizations"
  );
  if (Object.values(receipt.noLiveAuthorizations).some((value) => value !== false)) {
    throw new PromotionGateError("RECEIPT_LIVE_BOUNDARY_INVALID", "Receipt integration/live/preview/deploy authorizations must all remain false.");
  }

  if (receipt.forbiddenDiff !== null) {
    assertExactKeys(receipt.forbiddenDiff, ["result", "changedPaths"], "receipt forbiddenDiff");
    if (
      !["pass", "fail", "blocked"].includes(receipt.forbiddenDiff.result) ||
      !Array.isArray(receipt.forbiddenDiff.changedPaths) ||
      (receipt.forbiddenDiff.result === "pass" && receipt.forbiddenDiff.changedPaths.length !== 0)
    ) {
      throw new PromotionGateError("RECEIPT_FORBIDDEN_DIFF_INVALID", "Receipt forbidden-diff proof is invalid.");
    }
    for (const changedPath of receipt.forbiddenDiff.changedPaths) assertSafeRepoRelativePath(changedPath);
  } else if (receipt.result === "pass") {
    throw new PromotionGateError("RECEIPT_FORBIDDEN_DIFF_INVALID", "Passing receipt requires forbidden-diff proof.");
  }
}

function validateReceiptStructure(receipt) {
  assertExactKeys(receipt, PROMOTION_RECEIPT_FIELDS, "promotion receipt");
  if (receipt.schemaVersion !== PROMOTION_RECEIPT_SCHEMA_VERSION) {
    throw new PromotionGateError("RECEIPT_SCHEMA_UNSUPPORTED", "Unsupported promotion receipt schema version.");
  }
  if (receipt.mode !== "shadow") {
    throw new PromotionGateError("RECEIPT_MODE_INVALID", "Promotion Receipt v1 must bind shadow mode.");
  }
  if (!["pass", "fail", "blocked"].includes(receipt.result)) {
    throw new PromotionGateError("RECEIPT_RESULT_INVALID", "Receipt result must be pass, fail, or blocked.");
  }
  assertSha256(receipt.semanticReceiptDigest, "semanticReceiptDigest");
  assertSha256(receipt.rawReceiptDigest, "rawReceiptDigest");
  const { rawPayload, semanticPayload } = receiptDigestPayloads(receipt);
  if (
    fingerprint(rawPayload) !== receipt.rawReceiptDigest ||
    fingerprint(semanticPayload) !== receipt.semanticReceiptDigest
  ) {
    throw new PromotionGateError("RECEIPT_DIGEST_MISMATCH", "Promotion receipt digest validation failed.");
  }

  assertExactKeys(receipt.manifest, ["path", "rawSha256"], "receipt manifest binding");
  assertSafeRepoRelativePath(receipt.manifest.path);
  assertSha256(receipt.manifest.rawSha256, "receipt manifest rawSha256");
  assertExactKeys(receipt.runMetadata, ["runId", "producedAt", "runnerVersion", "ciMetadata"], "receipt runMetadata");
  if (typeof receipt.runMetadata.runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(receipt.runMetadata.runId)) {
    throw new PromotionGateError("RECEIPT_RUN_METADATA_INVALID", "Receipt runId is invalid.");
  }
  parseCanonicalTimestamp(receipt.runMetadata.producedAt, "RECEIPT_RUN_METADATA_INVALID", "receipt producedAt");
  if (receipt.runMetadata.runnerVersion !== PROMOTION_CHECKER_VERSION) {
    throw new PromotionGateError("RECEIPT_RUN_METADATA_INVALID", "Receipt runner version is unsupported.");
  }
  if (receipt.runMetadata.ciMetadata !== null && !isPlainObject(receipt.runMetadata.ciMetadata)) {
    throw new PromotionGateError("RECEIPT_RUN_METADATA_INVALID", "Receipt CI metadata is invalid.");
  }
  if (receipt.runMetadata.ciMetadata !== null) stableJson(receipt.runMetadata.ciMetadata);

  assertExactKeys(receipt.binding, [
    "gateId",
    "pilotUnitId",
    "attemptId",
    "parentPackage",
    "candidateDigest",
    "sourceCommit",
    "targetBaselineCommit",
    "checkerVersion",
    "checkerRelease"
  ], "receipt binding");
  assertNonEmptyString(receipt.binding.gateId, "receipt gateId");
  assertNonEmptyString(receipt.binding.pilotUnitId, "receipt pilotUnitId");
  assertNonEmptyString(receipt.binding.attemptId, "receipt attemptId");
  assertExactKeys(
    receipt.binding.parentPackage,
    ["id", "sourceVersion", "candidatePackagingVersion", "status"],
    "receipt parentPackage"
  );
  assertSha256(receipt.binding.candidateDigest, "receipt candidateDigest");
  assertExactKeys(
    receipt.binding.checkerRelease,
    ["version", "releaseCommit", "mappingPath", "mappingRawSha256", "bundleDigest"],
    "receipt binding checkerRelease"
  );
  if (
    receipt.binding.parentPackage.sourceVersion !== `sha256:${receipt.binding.candidateDigest}` ||
    receipt.binding.parentPackage.candidatePackagingVersion !== "promotion-package.v1" ||
    receipt.binding.parentPackage.status !== "candidate-only" ||
    !/^[a-f0-9]{40}$/u.test(receipt.binding.sourceCommit) ||
    !/^[a-f0-9]{40}$/u.test(receipt.binding.targetBaselineCommit) ||
    receipt.binding.checkerVersion !== PROMOTION_CHECKER_VERSION ||
    receipt.binding.checkerRelease.version !== PROMOTION_CHECKER_VERSION ||
    !/^[a-f0-9]{40}$/u.test(receipt.binding.checkerRelease.releaseCommit) ||
    receipt.binding.checkerRelease.mappingPath !== CHECKER_RELEASE_MAPPING_PATH ||
    !/^[a-f0-9]{64}$/u.test(receipt.binding.checkerRelease.mappingRawSha256) ||
    !/^[a-f0-9]{64}$/u.test(receipt.binding.checkerRelease.bundleDigest)
  ) {
    throw new PromotionGateError("RECEIPT_BINDING_INVALID", "Receipt candidate, source, baseline, or checker binding is invalid.");
  }

  if (receipt.result === "pass") {
    if (receipt.exitReason !== null || receipt.nextOwner !== null) {
      throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Passing receipt cannot contain an exit reason or next owner.");
    }
  } else {
    assertExactKeys(receipt.exitReason, ["code", "checkId", "message", "details"], "receipt exitReason");
    assertNonEmptyString(receipt.exitReason.code, "receipt exitReason.code");
    if (!REQUIRED_CHECK_IDS.includes(receipt.exitReason.checkId)) {
      throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Receipt exit reason names an unknown check.");
    }
    assertNonEmptyString(receipt.exitReason.message, "receipt exitReason.message");
    if (!isPlainObject(receipt.exitReason.details)) {
      throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Receipt exit details must be a plain object.");
    }
    if (receipt.result === "blocked") {
      if (!/^A(?:0[1-9]|1[0-9]|2[0-5])$/u.test(receipt.nextOwner ?? "")) {
        throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Blocked receipt requires an explicit nextOwner.");
      }
    } else if (receipt.nextOwner !== null) {
      throw new PromotionGateError("RECEIPT_OUTCOME_INVALID", "Failed receipt cannot assign a blocked nextOwner.");
    }
  }
  validateReceiptCheckResults(receipt);
  validateReceiptCheckerReleaseProof(receipt.checkerReleaseProof, receipt.binding, receipt.result);
  validateReceiptWorktreeProof(receipt.worktreeProof, receipt.result);
  validateReceiptProofs(receipt);

  validateReceiptExternalSideEffectProof(receipt.externalSideEffects, receipt);
  if (receipt.trustBoundary !== TRUST_BOUNDARY) {
    throw new PromotionGateError("RECEIPT_TRUST_BOUNDARY_INVALID", "Receipt trust boundary is missing or changed.");
  }
  assertExactKeys(receipt.lifecycleRecommendation, ["currentState", "suggestedTransition"], "receipt lifecycleRecommendation");
  if (
    receipt.lifecycleRecommendation.currentState !== "shadow_ready" ||
    receipt.lifecycleRecommendation.suggestedTransition !== null
  ) {
    throw new PromotionGateError("RECEIPT_LIFECYCLE_INVALID", "Receipt lifecycle recommendation contradicts its outcome.");
  }
  const baseUnmetConditions = [
    "a11-independent-replay-required",
    "a22-postrun-isolation-required",
    "ci-semantic-replay-required",
    "integration-not-authorized",
    "live-not-authorized",
    "preview-not-authorized",
    "deploy-not-authorized"
  ];
  const expectedUnmetConditions = receipt.result === "pass"
    ? baseUnmetConditions
    : [receipt.exitReason.code, ...baseUnmetConditions];
  if (stableJson(receipt.unmetConditions) !== stableJson(expectedUnmetConditions)) {
    throw new PromotionGateError("RECEIPT_UNMET_CONDITIONS_INVALID", "Receipt unmet conditions are invalid.");
  }
  stableJson(receipt);
}

export const PROMOTION_CLOSURE_SCHEMA_VERSION = "promotion-shadow-closure.v1";
export const PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION = "promotion-lifecycle-registry.v1";
export const PROMOTION_DISPOSITION_SCHEMA_VERSION = "promotion-attempt-disposition.v1";
const PROMOTION_MATURITY_CLAIM = "Shadow-mature / live-unproven";
const EXTERNAL_GOVERNANCE_PROOF_BOUNDARY =
  "Hash-bound repository evidence; external CI and branch-protection API authenticity requires independent readback.";

function withSelfDigest(value, digestField) {
  const payload = cloneCanonical(value);
  delete payload[digestField];
  return { ...payload, [digestField]: fingerprint(payload) };
}

function assertSelfDigest(value, digestField, code, label) {
  assertSha256(value?.[digestField], `${label}.${digestField}`);
  const payload = cloneCanonical(value);
  delete payload[digestField];
  if (value[digestField] !== fingerprint(payload)) {
    throw new PromotionGateError(code, `${label} digest does not match its canonical payload.`);
  }
}

function validateBoundJsonArtifact(bound, label) {
  if (!isPlainObject(bound) || !Buffer.isBuffer(bound.rawBytes) || !isPlainObject(bound.value)) {
    throw new PromotionGateError("CLOSURE_ARTIFACT_INVALID", `${label} requires plain JSON value and raw bytes.`);
  }
  let parsed;
  try {
    parsed = parseCanonicalJsonBytes(bound.rawBytes, "CLOSURE_ARTIFACT_INVALID", label);
  } catch {
    throw new PromotionGateError("CLOSURE_ARTIFACT_INVALID", `${label} raw bytes are not canonical UTF-8 JSON.`);
  }
  if (stableJson(parsed) !== stableJson(bound.value)) {
    throw new PromotionGateError("CLOSURE_ARTIFACT_INVALID", `${label} raw bytes do not encode the supplied value.`);
  }
  return { value: bound.value, rawSha256: sha256(bound.rawBytes) };
}

function validateClosureReceiptRef(reference, label, boundReceipt, expectedRole) {
  assertExactKeys(reference, [
    "role", "path", "rawSha256", "rawReceiptDigest", "semanticReceiptDigest", "runId", "result"
  ], label);
  if (reference.role !== expectedRole || reference.result !== "pass") {
    throw new PromotionGateError("CLOSURE_RECEIPT_INVALID", `${label} role and result are invalid.`);
  }
  assertSafeRepoRelativePath(reference.path);
  for (const field of ["rawSha256", "rawReceiptDigest", "semanticReceiptDigest"]) {
    assertSha256(reference[field], `${label}.${field}`);
  }
  const loaded = validateBoundJsonArtifact(boundReceipt, label);
  validateReceiptStructure(loaded.value);
  if (
    loaded.value.result !== "pass" ||
    loaded.rawSha256 !== reference.rawSha256 ||
    loaded.value.rawReceiptDigest !== reference.rawReceiptDigest ||
    loaded.value.semanticReceiptDigest !== reference.semanticReceiptDigest ||
    loaded.value.runMetadata.runId !== reference.runId
  ) {
    throw new PromotionGateError("CLOSURE_RECEIPT_INVALID", `${label} does not bind the supplied passing Receipt.`);
  }
  return loaded.value;
}

function validatePostRunEvidenceArtifact(artifact, expectedRole, binding, receipts) {
  const schemaVersion = expectedRole === "A11"
    ? "promotion-a11-postrun.v1"
    : "promotion-a22-postrun.v1";
  const commonKeys = [
    "schemaVersion", "role", "result", "pilotUnitId", "attemptId", "candidateDigest",
    "sourceCommit", "targetBaselineCommit", "checkerVersion", "canonicalRunId",
    "independentRunId", "canonicalRawReceiptDigest", "independentRawReceiptDigest",
    "semanticReceiptDigest"
  ];
  const roleKeys = expectedRole === "A11"
    ? ["distinctRunIds", "semanticMatch", "independentReplayCompleted"]
    : ["shadowExecuted", "rollbackRehearsed", "replayCompleted", "noDeployment", "noProductionWrite"];
  assertExactKeys(artifact, [...commonKeys, ...roleKeys], `${expectedRole} post-run evidence`);
  if (
    artifact.schemaVersion !== schemaVersion ||
    artifact.role !== expectedRole ||
    artifact.result !== "pass" ||
    artifact.pilotUnitId !== binding.pilotUnitId ||
    artifact.attemptId !== binding.attemptId ||
    artifact.candidateDigest !== binding.candidateDigest ||
    artifact.sourceCommit !== binding.sourceCommit ||
    artifact.targetBaselineCommit !== binding.targetBaselineCommit ||
    artifact.checkerVersion !== binding.checkerVersion ||
    artifact.canonicalRunId !== receipts.canonical.runMetadata.runId ||
    artifact.independentRunId !== receipts.independent.runMetadata.runId ||
    artifact.canonicalRawReceiptDigest !== receipts.canonical.rawReceiptDigest ||
    artifact.independentRawReceiptDigest !== receipts.independent.rawReceiptDigest ||
    artifact.semanticReceiptDigest !== receipts.canonical.semanticReceiptDigest
  ) {
    throw new PromotionGateError("CLOSURE_POSTRUN_INVALID", `${expectedRole} post-run evidence is stale or mismatched.`);
  }
  if (expectedRole === "A11") {
    if (
      artifact.distinctRunIds !== true ||
      artifact.semanticMatch !== true ||
      artifact.independentReplayCompleted !== true
    ) {
      throw new PromotionGateError("CLOSURE_POSTRUN_INVALID", "A11 post-run replay assertions are incomplete.");
    }
  } else if (
    artifact.shadowExecuted !== true ||
    artifact.rollbackRehearsed !== true ||
    artifact.replayCompleted !== true ||
    artifact.noDeployment !== true ||
    artifact.noProductionWrite !== true
  ) {
    throw new PromotionGateError("CLOSURE_POSTRUN_INVALID", "A22 post-run isolation assertions are incomplete.");
  }
}

function validateClosureArtifactRef(reference, label, boundArtifact, expectedRole) {
  assertExactKeys(reference, ["role", "path", "rawSha256", "semanticSha256", "result"], label);
  assertSafeRepoRelativePath(reference.path);
  assertSha256(reference.rawSha256, `${label}.rawSha256`);
  assertSha256(reference.semanticSha256, `${label}.semanticSha256`);
  const loaded = validateBoundJsonArtifact(boundArtifact, label);
  if (
    reference.role !== expectedRole ||
    reference.result !== "pass" ||
    loaded.rawSha256 !== reference.rawSha256 ||
    fingerprint(loaded.value) !== reference.semanticSha256
  ) {
    throw new PromotionGateError("CLOSURE_ARTIFACT_INVALID", `${label} reference does not bind its supplied artifact.`);
  }
  return loaded.value;
}

export function attachPromotionClosureDigest(closureWithoutDigest) {
  return withSelfDigest(closureWithoutDigest, "closureDigest");
}

export function validatePromotionClosure(closure, context = {}) {
  assertExactKeys(closure, [
    "schemaVersion", "binding", "manifest", "evidenceIndex", "receipts", "postRunEvidence",
    "ciProof", "requiredCheckProof", "unmetConditions", "trustBoundary", "closureDigest"
  ], "promotion closure");
  if (closure.schemaVersion !== PROMOTION_CLOSURE_SCHEMA_VERSION) {
    throw new PromotionGateError("CLOSURE_SCHEMA_UNSUPPORTED", "Unsupported promotion closure schema version.");
  }
  assertSelfDigest(closure, "closureDigest", "CLOSURE_DIGEST_MISMATCH", "Promotion closure");
  const { manifest, evidenceIndex } = context;
  validatePromotionManifest(manifest);
  validatePromotionEvidenceIndex(evidenceIndex, manifest);
  assertExactKeys(closure.binding, [
    "gateId", "pilotUnitId", "attemptId", "parentPackageId", "candidateDigest", "sourceCommit",
    "targetBaselineCommit", "checkerVersion", "checkerReleaseDigest"
  ], "closure binding");
  const expectedBinding = {
    gateId: manifest.gateId,
    pilotUnitId: manifest.pilotUnitId,
    attemptId: manifest.attemptId,
    parentPackageId: manifest.parentPackage.id,
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    checkerReleaseDigest: fingerprint(manifest.checkerRelease)
  };
  if (stableJson(closure.binding) !== stableJson(expectedBinding)) {
    throw new PromotionGateError("CLOSURE_BINDING_MISMATCH", "Closure does not bind the exact manifest candidate and checker release.");
  }
  assertExactKeys(closure.manifest, ["path", "rawSha256"], "closure manifest");
  assertExactKeys(closure.evidenceIndex, ["path", "rawSha256"], "closure evidenceIndex");
  assertSafeRepoRelativePath(closure.manifest.path);
  assertSafeRepoRelativePath(closure.evidenceIndex.path);
  if (
    closure.evidenceIndex.path !== manifest.evidenceIndex.path ||
    closure.evidenceIndex.rawSha256 !== manifest.evidenceIndex.rawSha256
  ) {
    throw new PromotionGateError("CLOSURE_BINDING_MISMATCH", "Closure evidence-index binding is stale.");
  }
  assertSha256(closure.manifest.rawSha256, "closure manifest.rawSha256");
  assertExactKeys(closure.receipts, ["canonical", "independent"], "closure receipts");
  const canonicalReceipt = validateClosureReceiptRef(
    closure.receipts.canonical,
    "closure canonical receipt",
    context.canonicalReceipt,
    "A23"
  );
  const independentReceipt = validateClosureReceiptRef(
    closure.receipts.independent,
    "closure independent receipt",
    context.independentReceipt,
    "A11"
  );
  for (const receipt of [canonicalReceipt, independentReceipt]) {
    if (
      receipt.manifest.path !== closure.manifest.path ||
      receipt.manifest.rawSha256 !== closure.manifest.rawSha256 ||
      receipt.binding.gateId !== manifest.gateId ||
      receipt.binding.pilotUnitId !== manifest.pilotUnitId ||
      receipt.binding.attemptId !== manifest.attemptId ||
      receipt.binding.candidateDigest !== manifest.candidateDigest ||
      receipt.binding.sourceCommit !== manifest.sourceCommit ||
      receipt.binding.targetBaselineCommit !== manifest.targetBaselineCommit ||
      receipt.binding.checkerVersion !== manifest.checkerVersion ||
      stableJson(receipt.binding.checkerRelease) !== stableJson(manifest.checkerRelease)
    ) {
      throw new PromotionGateError("CLOSURE_RECEIPT_INVALID", "Closure Receipt bindings disagree with the manifest.");
    }
  }
  if (
    canonicalReceipt.runMetadata.runId === independentReceipt.runMetadata.runId ||
    canonicalReceipt.rawReceiptDigest === independentReceipt.rawReceiptDigest ||
    canonicalReceipt.semanticReceiptDigest !== independentReceipt.semanticReceiptDigest
  ) {
    throw new PromotionGateError(
      "CLOSURE_REPLAY_MISMATCH",
      "Closure requires distinct raw runs with one identical semantic Receipt digest."
    );
  }
  assertExactKeys(closure.postRunEvidence, ["a11", "a22"], "closure postRunEvidence");
  const a11 = validateClosureArtifactRef(closure.postRunEvidence.a11, "closure A11 evidence", context.a11PostRun, "A11");
  const a22 = validateClosureArtifactRef(closure.postRunEvidence.a22, "closure A22 evidence", context.a22PostRun, "A22");
  validatePostRunEvidenceArtifact(a11, "A11", closure.binding, {
    canonical: canonicalReceipt,
    independent: independentReceipt
  });
  validatePostRunEvidenceArtifact(a22, "A22", closure.binding, {
    canonical: canonicalReceipt,
    independent: independentReceipt
  });
  const ciProof = validateClosureArtifactRef(closure.ciProof, "closure CI proof", context.ciProof, "A11");
  assertExactKeys(ciProof, [
    "schemaVersion", "role", "result", "checkName", "conclusion", "compositionCommit",
    "manifestRawSha256", "candidateDigest", "targetBaselineCommit", "semanticReceiptDigest", "trustBoundary"
  ], "CI proof");
  if (
    ciProof.schemaVersion !== "promotion-ci-proof.v1" ||
    ciProof.role !== "A11" ||
    ciProof.result !== "pass" ||
    ciProof.checkName !== "promotion-shadow-gate" ||
    ciProof.conclusion !== "success" ||
    !/^[a-f0-9]{40}$/u.test(ciProof.compositionCommit) ||
    ciProof.manifestRawSha256 !== closure.manifest.rawSha256 ||
    ciProof.candidateDigest !== manifest.candidateDigest ||
    ciProof.targetBaselineCommit !== manifest.targetBaselineCommit ||
    ciProof.semanticReceiptDigest !== canonicalReceipt.semanticReceiptDigest ||
    ciProof.trustBoundary !== EXTERNAL_GOVERNANCE_PROOF_BOUNDARY
  ) {
    throw new PromotionGateError("CLOSURE_CI_PROOF_INVALID", "Closure CI proof is stale or names the wrong required check.");
  }
  const requiredCheckProof = validateClosureArtifactRef(
    closure.requiredCheckProof,
    "closure required-check proof",
    context.requiredCheckProof,
    "A22"
  );
  assertExactKeys(requiredCheckProof, [
    "schemaVersion", "role", "result", "branch", "contexts", "compositionCommit", "required", "trustBoundary"
  ], "required-check proof");
  if (
    requiredCheckProof.schemaVersion !== "promotion-required-check-proof.v1" ||
    requiredCheckProof.role !== "A22" ||
    requiredCheckProof.result !== "pass" ||
    requiredCheckProof.branch !== "main" ||
    stableJson(requiredCheckProof.contexts) !== stableJson(["promotion-shadow-gate", "validate"]) ||
    requiredCheckProof.compositionCommit !== ciProof.compositionCommit ||
    requiredCheckProof.required !== true ||
    requiredCheckProof.trustBoundary !== EXTERNAL_GOVERNANCE_PROOF_BOUNDARY
  ) {
    throw new PromotionGateError("CLOSURE_REQUIRED_CHECK_INVALID", "Required-check readback does not prove the exact main contexts and composition SHA.");
  }
  const referencedPaths = [
    closure.receipts.canonical.path,
    closure.receipts.independent.path,
    closure.postRunEvidence.a11.path,
    closure.postRunEvidence.a22.path,
    closure.ciProof.path,
    closure.requiredCheckProof.path
  ].map((entry) => entry.toLocaleLowerCase("en-US"));
  if (new Set(referencedPaths).size !== referencedPaths.length) {
    throw new PromotionGateError("CLOSURE_EVIDENCE_REUSE", "Closure Receipt and independent owner evidence paths must all be distinct.");
  }
  if (!Array.isArray(closure.unmetConditions) || closure.unmetConditions.length !== 0) {
    throw new PromotionGateError("CLOSURE_UNMET_CONDITIONS", "A shadow-passed closure cannot retain unmet conditions.");
  }
  if (closure.trustBoundary !== EXTERNAL_GOVERNANCE_PROOF_BOUNDARY) {
    throw new PromotionGateError("CLOSURE_TRUST_BOUNDARY_INVALID", "Closure external-proof trust boundary is missing.");
  }
  return { result: "pass", closureDigest: closure.closureDigest };
}

export function attachPromotionDispositionDigest(dispositionWithoutDigest) {
  return withSelfDigest(dispositionWithoutDigest, "dispositionDigest");
}

function validateDispositionAuthorityRef(reference, expectedRole, boundArtifact, expected) {
  try {
    assertExactKeys(
      reference,
      ["role", "path", "rawSha256", "semanticSha256", "result"],
      `disposition ${expectedRole} authority reference`
    );
    if (reference.role !== expectedRole || reference.result !== "approve") {
      throw new PromotionGateError(
        "DISPOSITION_AUTHORITY_INVALID",
        `Disposition ${expectedRole} authority role or result is invalid.`
      );
    }
    assertSafeRepoRelativePath(reference.path);
    assertSha256(reference.rawSha256, `disposition ${expectedRole} authority rawSha256`);
    assertSha256(reference.semanticSha256, `disposition ${expectedRole} authority semanticSha256`);
    const loaded = validateBoundJsonArtifact(boundArtifact, `disposition ${expectedRole} authority`);
    assertExactKeys(loaded.value, [
      "schemaVersion", "role", "result", "pilotUnitId", "attemptId", "candidateDigest",
      "sourceCommit", "targetBaselineCommit", "checkerVersion", "receiptRawSha256",
      "rawReceiptDigest", "semanticReceiptDigest", "runId", "reasonCode", "decision",
      "authorizationReference"
    ], `disposition ${expectedRole} authority artifact`);
    if (
      loaded.rawSha256 !== reference.rawSha256 ||
      fingerprint(loaded.value) !== reference.semanticSha256 ||
      loaded.value.schemaVersion !== "promotion-disposition-authority.v1" ||
      loaded.value.role !== expectedRole ||
      loaded.value.result !== "approve" ||
      stableJson({
        pilotUnitId: loaded.value.pilotUnitId,
        attemptId: loaded.value.attemptId,
        candidateDigest: loaded.value.candidateDigest,
        sourceCommit: loaded.value.sourceCommit,
        targetBaselineCommit: loaded.value.targetBaselineCommit,
        checkerVersion: loaded.value.checkerVersion,
        receiptRawSha256: loaded.value.receiptRawSha256,
        rawReceiptDigest: loaded.value.rawReceiptDigest,
        semanticReceiptDigest: loaded.value.semanticReceiptDigest,
        runId: loaded.value.runId,
        reasonCode: loaded.value.reasonCode,
        decision: loaded.value.decision,
        authorizationReference: loaded.value.authorizationReference
      }) !== stableJson(expected)
    ) {
      throw new PromotionGateError(
        "DISPOSITION_AUTHORITY_INVALID",
        `Disposition ${expectedRole} authority artifact is stale or mismatched.`
      );
    }
    return loaded.value;
  } catch (error) {
    if (error instanceof PromotionGateError && error.code === "DISPOSITION_AUTHORITY_INVALID") throw error;
    throw new PromotionGateError(
      "DISPOSITION_AUTHORITY_INVALID",
      `Disposition ${expectedRole} authority artifact is not a strict hash-bound v1 record.`
    );
  }
}

export function validatePromotionDisposition(
  disposition,
  { manifest, receipt, receiptRawBytes, a18Authority, a23Authority } = {}
) {
  assertExactKeys(disposition, [
    "schemaVersion", "pilotUnitId", "attemptId", "receipt", "decision", "reasonCode",
    "authorityRoles", "authorityEvidence", "authorizationReference", "newAttemptRequired",
    "dispositionDigest"
  ], "promotion disposition");
  if (disposition.schemaVersion !== PROMOTION_DISPOSITION_SCHEMA_VERSION) {
    throw new PromotionGateError("DISPOSITION_SCHEMA_UNSUPPORTED", "Unsupported attempt disposition schema.");
  }
  assertSelfDigest(disposition, "dispositionDigest", "DISPOSITION_DIGEST_MISMATCH", "Promotion disposition");
  validatePromotionManifest(manifest);
  validateReceiptStructure(receipt);
  if (!Buffer.isBuffer(receiptRawBytes)) {
    throw new PromotionGateError("DISPOSITION_INVALID", "Disposition requires the exact failed Receipt bytes.");
  }
  let parsedReceipt;
  try {
    parsedReceipt = parseCanonicalJsonBytes(receiptRawBytes, "DISPOSITION_INVALID", "Disposition Receipt");
  } catch {
    throw new PromotionGateError("DISPOSITION_INVALID", "Disposition Receipt bytes are not valid UTF-8 JSON.");
  }
  assertExactKeys(disposition.receipt, [
    "path", "rawSha256", "rawReceiptDigest", "semanticReceiptDigest", "runId", "result"
  ], "disposition receipt");
  assertSafeRepoRelativePath(disposition.receipt.path);
  for (const field of ["rawSha256", "rawReceiptDigest", "semanticReceiptDigest"]) {
    assertSha256(disposition.receipt[field], `disposition receipt.${field}`);
  }
  const expectedAuthorities = disposition.decision === "repair_required"
    ? ["A18", "A23"]
    : disposition.decision === "rejected"
      ? ["A18", "A23"]
      : null;
  if (
    expectedAuthorities === null ||
    disposition.pilotUnitId !== manifest.pilotUnitId ||
    disposition.attemptId !== manifest.attemptId ||
    receipt.result !== "fail" ||
    disposition.receipt.result !== "fail" ||
    stableJson(parsedReceipt) !== stableJson(receipt) ||
    disposition.receipt.rawSha256 !== sha256(receiptRawBytes) ||
    receipt.binding.gateId !== manifest.gateId ||
    receipt.binding.pilotUnitId !== manifest.pilotUnitId ||
    receipt.binding.attemptId !== manifest.attemptId ||
    receipt.binding.candidateDigest !== manifest.candidateDigest ||
    receipt.binding.sourceCommit !== manifest.sourceCommit ||
    receipt.binding.targetBaselineCommit !== manifest.targetBaselineCommit ||
    receipt.binding.checkerVersion !== manifest.checkerVersion ||
    disposition.receipt.rawReceiptDigest !== receipt.rawReceiptDigest ||
    disposition.receipt.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    disposition.receipt.runId !== receipt.runMetadata.runId ||
    disposition.reasonCode !== receipt.exitReason.code ||
    stableJson(disposition.authorityRoles) !== stableJson(expectedAuthorities) ||
    typeof disposition.authorizationReference !== "string" ||
    disposition.authorizationReference.trim() === "" ||
    disposition.newAttemptRequired !== true
  ) {
    throw new PromotionGateError("DISPOSITION_INVALID", "Disposition does not bind a legal failed-attempt terminal decision.");
  }
  assertExactKeys(disposition.authorityEvidence, ["a18", "a23"], "disposition authorityEvidence");
  const expectedAuthorityBinding = {
    pilotUnitId: manifest.pilotUnitId,
    attemptId: manifest.attemptId,
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    receiptRawSha256: sha256(receiptRawBytes),
    rawReceiptDigest: receipt.rawReceiptDigest,
    semanticReceiptDigest: receipt.semanticReceiptDigest,
    runId: receipt.runMetadata.runId,
    reasonCode: receipt.exitReason.code,
    decision: disposition.decision,
    authorizationReference: disposition.authorizationReference
  };
  validateDispositionAuthorityRef(
    disposition.authorityEvidence.a18,
    "A18",
    a18Authority,
    expectedAuthorityBinding
  );
  validateDispositionAuthorityRef(
    disposition.authorityEvidence.a23,
    "A23",
    a23Authority,
    expectedAuthorityBinding
  );
  const authorityPaths = [
    disposition.receipt.path,
    disposition.authorityEvidence.a18.path,
    disposition.authorityEvidence.a23.path
  ].map((artifactPath) => artifactPath.toLocaleLowerCase("en-US"));
  if (new Set(authorityPaths).size !== authorityPaths.length) {
    throw new PromotionGateError(
      "DISPOSITION_AUTHORITY_REUSE",
      "Disposition Receipt and A18/A23 authority evidence must use three distinct files."
    );
  }
  return disposition;
}

function lifecycleEventDigestPayload(event) {
  const payload = cloneCanonical(event);
  delete payload.eventDigest;
  return payload;
}

export function attachLifecycleEventDigest(eventWithoutDigest) {
  const payload = cloneCanonical(eventWithoutDigest);
  delete payload.eventDigest;
  return { ...payload, eventDigest: fingerprint(payload) };
}

export function attachLifecycleRegistryDigest(registryWithoutDigest) {
  return withSelfDigest(registryWithoutDigest, "registryDigest");
}

export function validatePromotionLifecycleRegistry(registry, context = {}) {
  assertExactKeys(registry, [
    "schemaVersion", "pilotUnitId", "attemptId", "parentPackageStatus", "pilotUnitStatus",
    "liveAllowed", "liveEvidence", "maturityClaim", "events", "registryDigest"
  ], "promotion lifecycle registry");
  if (registry.schemaVersion !== PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION) {
    throw new PromotionGateError("REGISTRY_SCHEMA_UNSUPPORTED", "Unsupported lifecycle registry schema.");
  }
  assertSelfDigest(registry, "registryDigest", "REGISTRY_DIGEST_MISMATCH", "Lifecycle registry");
  const { manifest, evidenceIndex } = context;
  validatePromotionManifest(manifest);
  validatePromotionEvidenceIndex(evidenceIndex, manifest);
  if (
    registry.pilotUnitId !== manifest.pilotUnitId ||
    registry.attemptId !== manifest.attemptId ||
    registry.parentPackageStatus !== "candidate-only" ||
    registry.liveAllowed !== false ||
    registry.liveEvidence !== "none" ||
    !Array.isArray(registry.events) ||
    ![2, 3].includes(registry.events.length)
  ) {
    throw new PromotionGateError("REGISTRY_BINDING_INVALID", "Lifecycle registry does not bind the one immutable candidate attempt.");
  }
  const [genesis, ready, terminal] = registry.events;
  for (const [index, event] of registry.events.entries()) {
    assertExactKeys(event, [
      "sequence", "eventId", "attemptId", "fromState", "toState", "manifest", "evidenceIndex",
      "closure", "disposition", "previousEventDigest", "eventDigest"
    ], `registry event ${index}`);
    if (
      event.sequence !== index + 1 ||
      event.attemptId !== manifest.attemptId ||
      typeof event.eventId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(event.eventId) ||
      event.eventDigest !== fingerprint(lifecycleEventDigestPayload(event)) ||
      (index === 0 ? event.previousEventDigest !== null : event.previousEventDigest !== registry.events[index - 1].eventDigest)
    ) {
      throw new PromotionGateError("REGISTRY_EVENT_CHAIN_INVALID", "Lifecycle registry event sequence or digest chain is invalid.");
    }
  }
  if (
    genesis.fromState !== null ||
    genesis.toState !== "candidate_hold" ||
    genesis.manifest !== null ||
    genesis.evidenceIndex !== null ||
    genesis.closure !== null ||
    genesis.disposition !== null
  ) {
    throw new PromotionGateError("REGISTRY_TRANSITION_INVALID", "Registry must begin with a candidate_hold genesis event.");
  }
  const expectedManifestRef = { path: context.manifestPath, rawSha256: context.manifestRawSha256 };
  const expectedIndexRef = { path: manifest.evidenceIndex.path, rawSha256: manifest.evidenceIndex.rawSha256 };
  if (
    ready.fromState !== "candidate_hold" ||
    ready.toState !== "shadow_ready" ||
    stableJson(ready.manifest) !== stableJson(expectedManifestRef) ||
    stableJson(ready.evidenceIndex) !== stableJson(expectedIndexRef) ||
    ready.closure !== null ||
    ready.disposition !== null
  ) {
    throw new PromotionGateError("REGISTRY_TRANSITION_INVALID", "candidate_hold to shadow_ready must bind the frozen manifest and evidence index.");
  }
  if (registry.events.length === 2) {
    if (
      registry.pilotUnitStatus !== "shadow_ready" ||
      registry.maturityClaim !== "not-shadow-mature"
    ) {
      throw new PromotionGateError(
        "REGISTRY_TRANSITION_INVALID",
        "A phase-1 registry may end only at evidence-bound shadow_ready without a maturity claim."
      );
    }
    return { result: "pass", state: "shadow_ready", registryDigest: registry.registryDigest };
  }
  const success = terminal.toState === "shadow_passed";
  if (success) {
    const closure = context.closure;
    if (
      terminal.fromState !== "shadow_ready" ||
      terminal.manifest !== null ||
      terminal.evidenceIndex !== null ||
      terminal.disposition !== null ||
      stableJson(terminal.closure) !== stableJson({ path: context.closurePath, digest: closure?.closureDigest }) ||
      registry.pilotUnitStatus !== "shadow_passed" ||
      registry.maturityClaim !== PROMOTION_MATURITY_CLAIM
    ) {
      throw new PromotionGateError("REGISTRY_TRANSITION_INVALID", "shadow_passed must bind one valid phase-2 closure.");
    }
    validatePromotionClosure(closure, context.closureContext);
  } else {
    const disposition = context.disposition;
    const expectedState = disposition?.decision;
    if (
      !["repair_required", "rejected"].includes(terminal.toState) ||
      terminal.fromState !== "shadow_ready" ||
      terminal.manifest !== null ||
      terminal.evidenceIndex !== null ||
      terminal.closure !== null ||
      stableJson(terminal.disposition) !== stableJson({ path: context.dispositionPath, digest: disposition?.dispositionDigest }) ||
      terminal.toState !== expectedState ||
      registry.pilotUnitStatus !== expectedState ||
      registry.maturityClaim !== "not-shadow-mature"
    ) {
      throw new PromotionGateError("REGISTRY_TRANSITION_INVALID", "Failed attempts must close into one immutable repair_required or rejected disposition.");
    }
    validatePromotionDisposition(disposition, {
      manifest,
      receipt: context.receipt,
      receiptRawBytes: context.receiptRawBytes,
      a18Authority: context.a18Authority,
      a23Authority: context.a23Authority
    });
  }
  return { result: "pass", state: registry.pilotUnitStatus, registryDigest: registry.registryDigest };
}

function parsePromotionAttemptHistoryTree(bytes) {
  if (!Buffer.isBuffer(bytes) || (bytes.length > 0 && bytes.at(-1) !== 0)) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_UNAVAILABLE",
      "Promotion attempt history tree output is ambiguous.",
      {},
      "blocked"
    );
  }
  const source = bytes.length === 0
    ? ""
    : decodeCanonicalUtf8(
      bytes.subarray(0, -1),
      "ATTEMPT_HISTORY_UNAVAILABLE",
      "Promotion attempt history tree"
    );
  const treeEntries = source === "" ? [] : source.split("\0").map((entry) => {
    const match = /^(\d{6}) ([^ ]+) ([a-f0-9]{40,64})\t(.+)$/u.exec(entry);
    if (
      match === null ||
      match[2] !== "blob" ||
      !["100644", "100755"].includes(match[1]) ||
      !isPromotionAttemptHistoryPath(match[4])
    ) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_ARTIFACT_INVALID",
        "Promotion attempt history contains a non-regular or unregistered artifact."
      );
    }
    return { path: match[4], mode: match[1], objectId: match[3] };
  }).sort((left, right) => codePointCompare(left.path, right.path));
  if (treeEntries.length > PROMOTION_ATTEMPT_HISTORY_MAX_TREE_ENTRIES) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_BOUND_EXCEEDED",
      "Promotion attempt history exceeds the frozen tree-entry bound.",
      {
        maxTreeEntries: PROMOTION_ATTEMPT_HISTORY_MAX_TREE_ENTRIES,
        observedTreeEntries: treeEntries.length
      },
      "blocked"
    );
  }
  const entries = treeEntries.filter(({ path: artifactPath }) => artifactPath.endsWith(".json"));
  if (entries.length > PROMOTION_ATTEMPT_HISTORY_MAX_ARTIFACTS) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_BOUND_EXCEEDED",
      "Promotion attempt history exceeds the frozen artifact-count bound.",
      {
        maxArtifacts: PROMOTION_ATTEMPT_HISTORY_MAX_ARTIFACTS,
        observedArtifacts: entries.length
      },
      "blocked"
    );
  }
  const folded = new Set();
  for (const entry of entries) {
    const key = entry.path.toLocaleLowerCase("en-US");
    if (folded.has(key)) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_CASE_COLLISION",
        "Promotion attempt history contains case-colliding artifact paths."
      );
    }
    folded.add(key);
  }
  return entries;
}

function validateHistoryRegistryShape(registry) {
  assertExactKeys(registry, [
    "schemaVersion", "pilotUnitId", "attemptId", "parentPackageStatus", "pilotUnitStatus",
    "liveAllowed", "liveEvidence", "maturityClaim", "events", "registryDigest"
  ], "attempt-history lifecycle registry");
  if (
    registry.schemaVersion !== PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION ||
    registry.parentPackageStatus !== "candidate-only" ||
    registry.liveAllowed !== false ||
    registry.liveEvidence !== "none" ||
    !Array.isArray(registry.events) ||
    ![2, 3].includes(registry.events.length)
  ) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_REGISTRY_INVALID",
      "Attempt-history registry is not a bounded phase-1 or terminal v1 registry."
    );
  }
  assertNonEmptyString(registry.pilotUnitId, "attempt-history registry pilotUnitId");
  assertNonEmptyString(registry.attemptId, "attempt-history registry attemptId");
  assertSelfDigest(
    registry,
    "registryDigest",
    "ATTEMPT_HISTORY_REGISTRY_INVALID",
    "Attempt-history lifecycle registry"
  );
  for (const [index, event] of registry.events.entries()) {
    assertExactKeys(event, [
      "sequence", "eventId", "attemptId", "fromState", "toState", "manifest", "evidenceIndex",
      "closure", "disposition", "previousEventDigest", "eventDigest"
    ], `attempt-history registry event ${index}`);
    if (
      event.sequence !== index + 1 ||
      event.attemptId !== registry.attemptId ||
      typeof event.eventId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(event.eventId) ||
      event.eventDigest !== fingerprint(lifecycleEventDigestPayload(event)) ||
      (index === 0
        ? event.previousEventDigest !== null
        : event.previousEventDigest !== registry.events[index - 1].eventDigest)
    ) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_REGISTRY_INVALID",
        "Attempt-history registry event sequence or hash chain is invalid."
      );
    }
  }
  const [genesis, ready, terminal] = registry.events;
  if (
    genesis.fromState !== null ||
    genesis.toState !== "candidate_hold" ||
    genesis.manifest !== null ||
    genesis.evidenceIndex !== null ||
    genesis.closure !== null ||
    genesis.disposition !== null ||
    ready.fromState !== "candidate_hold" ||
    ready.toState !== "shadow_ready" ||
    !isPlainObject(ready.manifest) ||
    !isPlainObject(ready.evidenceIndex) ||
    ready.closure !== null ||
    ready.disposition !== null
  ) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_REGISTRY_INVALID",
      "Attempt-history registry must prove candidate_hold to evidence-bound shadow_ready."
    );
  }
  assertExactKeys(ready.manifest, ["path", "rawSha256"], "attempt-history ready manifest reference");
  assertExactKeys(ready.evidenceIndex, ["path", "rawSha256"], "attempt-history ready evidence index reference");
  assertSafeRepoRelativePath(ready.manifest.path);
  assertSafeRepoRelativePath(ready.evidenceIndex.path);
  assertSha256(ready.manifest.rawSha256, "attempt-history ready manifest rawSha256");
  assertSha256(ready.evidenceIndex.rawSha256, "attempt-history ready evidence index rawSha256");
  if (registry.events.length === 2) {
    if (registry.pilotUnitStatus !== "shadow_ready" || registry.maturityClaim !== "not-shadow-mature") {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_REGISTRY_INVALID",
        "A two-event attempt-history registry must remain shadow_ready."
      );
    }
    return { status: "shadow_ready", terminal: false };
  }
  if (
    terminal.fromState !== "shadow_ready" ||
    terminal.manifest !== null ||
    terminal.evidenceIndex !== null ||
    terminal.toState !== registry.pilotUnitStatus
  ) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_REGISTRY_INVALID",
      "A terminal attempt-history registry must transition once from shadow_ready."
    );
  }
  if (registry.pilotUnitStatus === "shadow_passed") {
    if (
      registry.maturityClaim !== PROMOTION_MATURITY_CLAIM ||
      !isPlainObject(terminal.closure) ||
      terminal.disposition !== null
    ) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_REGISTRY_INVALID",
        "A shadow_passed attempt-history registry must bind one closure."
      );
    }
    assertExactKeys(terminal.closure, ["path", "digest"], "attempt-history terminal closure reference");
    assertSafeRepoRelativePath(terminal.closure.path);
    assertSha256(terminal.closure.digest, "attempt-history terminal closure digest");
  } else if (["repair_required", "rejected"].includes(registry.pilotUnitStatus)) {
    if (
      registry.maturityClaim !== "not-shadow-mature" ||
      terminal.closure !== null ||
      !isPlainObject(terminal.disposition)
    ) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_REGISTRY_INVALID",
        "A failed attempt-history registry must bind one disposition."
      );
    }
    assertExactKeys(terminal.disposition, ["path", "digest"], "attempt-history terminal disposition reference");
    assertSafeRepoRelativePath(terminal.disposition.path);
    assertSha256(terminal.disposition.digest, "attempt-history terminal disposition digest");
  } else {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_REGISTRY_INVALID",
      "Attempt-history registry contains an unsupported terminal state."
    );
  }
  return { status: registry.pilotUnitStatus, terminal: true };
}

function promotionAttemptArtifactProjection(value, artifactPath) {
  if (!isPlainObject(value)) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_ARTIFACT_INVALID",
      "Promotion attempt history artifact must be a JSON object."
    );
  }
  const rootFor = (root) => artifactPath.startsWith(`${root}/`);
  const inPilotSubtree = rootFor(PROMOTION_ATTEMPT_HISTORY_ROOTS[0]);
  let kind;
  let pilotUnitId;
  let attemptId;
  let runId = null;
  let status = null;
  if (value.schemaVersion === PROMOTION_MANIFEST_SCHEMA_VERSION) {
    kind = "manifest";
    pilotUnitId = value.pilotUnitId;
    attemptId = value.attemptId;
    if (!inPilotSubtree) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Manifest is outside the registered pilot root.");
    }
    validatePromotionManifest(value);
  } else if (value.schemaVersion === PROMOTION_RECEIPT_SCHEMA_VERSION) {
    kind = "receipt";
    if (
      (!inPilotSubtree && !rootFor(PROMOTION_ATTEMPT_HISTORY_ROOTS[1])) ||
      !isPlainObject(value.binding) ||
      !isPlainObject(value.runMetadata)
    ) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Receipt is outside its root or lacks identity bindings.");
    }
    pilotUnitId = value.binding.pilotUnitId;
    attemptId = value.binding.attemptId;
    runId = value.runMetadata.runId;
    status = value.result;
    validateReceiptStructure(value);
  } else if (value.schemaVersion === PROMOTION_DISPOSITION_SCHEMA_VERSION) {
    kind = "disposition";
    if (!inPilotSubtree && !rootFor(PROMOTION_ATTEMPT_HISTORY_ROOTS[2])) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Disposition is outside the registered disposition root.");
    }
    pilotUnitId = value.pilotUnitId;
    attemptId = value.attemptId;
    status = value.decision;
    assertExactKeys(value, [
      "schemaVersion", "pilotUnitId", "attemptId", "receipt", "decision", "reasonCode",
      "authorityRoles", "authorityEvidence", "authorizationReference", "newAttemptRequired",
      "dispositionDigest"
    ], "attempt-history disposition");
    assertSelfDigest(
      value,
      "dispositionDigest",
      "ATTEMPT_HISTORY_ARTIFACT_INVALID",
      "Attempt-history disposition"
    );
    if (!["repair_required", "rejected"].includes(status)) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Attempt-history disposition is not terminal.");
    }
  } else if (value.schemaVersion === PROMOTION_CLOSURE_SCHEMA_VERSION) {
    kind = "closure";
    if ((!inPilotSubtree && !rootFor(PROMOTION_ATTEMPT_HISTORY_ROOTS[3])) || !isPlainObject(value.binding)) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Closure is outside its root or lacks identity bindings.");
    }
    pilotUnitId = value.binding.pilotUnitId;
    attemptId = value.binding.attemptId;
    status = "shadow_passed";
    assertExactKeys(value, [
      "schemaVersion", "binding", "manifest", "evidenceIndex", "receipts", "postRunEvidence",
      "ciProof", "requiredCheckProof", "unmetConditions", "trustBoundary", "closureDigest"
    ], "attempt-history closure");
    assertSelfDigest(
      value,
      "closureDigest",
      "ATTEMPT_HISTORY_ARTIFACT_INVALID",
      "Attempt-history closure"
    );
    assertExactKeys(value.binding, [
      "gateId", "pilotUnitId", "attemptId", "parentPackageId", "candidateDigest", "sourceCommit",
      "targetBaselineCommit", "checkerVersion", "checkerReleaseDigest"
    ], "attempt-history closure binding");
    for (const field of ["candidateDigest", "checkerReleaseDigest"]) {
      assertSha256(value.binding[field], `attempt-history closure binding.${field}`);
    }
    if (
      !/^[a-f0-9]{40}$/u.test(value.binding.sourceCommit ?? "") ||
      !/^[a-f0-9]{40}$/u.test(value.binding.targetBaselineCommit ?? "") ||
      value.binding.checkerVersion !== PROMOTION_CHECKER_VERSION
    ) {
      throw new PromotionGateError(
        "ATTEMPT_HISTORY_ARTIFACT_INVALID",
        "Attempt-history closure identity binding is malformed."
      );
    }
  } else if (value.schemaVersion === PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION) {
    kind = "registry";
    if (!inPilotSubtree && !rootFor(PROMOTION_ATTEMPT_HISTORY_ROOTS[4])) {
      throw new PromotionGateError("ATTEMPT_HISTORY_ARTIFACT_INVALID", "Lifecycle registry is outside its registered root.");
    }
    pilotUnitId = value.pilotUnitId;
    attemptId = value.attemptId;
    status = validateHistoryRegistryShape(value).status;
  } else {
    return null;
  }
  assertNonEmptyString(pilotUnitId, `attempt-history ${kind} pilotUnitId`);
  assertNonEmptyString(attemptId, `attempt-history ${kind} attemptId`);
  const attemptKey = `${pilotUnitId}\0${attemptId}`;
  return {
    kind,
    pilotUnitId,
    attemptId,
    attemptKey,
    runId,
    status,
    registry: kind === "registry" ? value : null
  };
}

function legalRegistryHistoryEvolution(previous, current) {
  if (
    previous.events.length !== 2 ||
    previous.pilotUnitStatus !== "shadow_ready" ||
    current.events.length !== 3 ||
    !["shadow_passed", "repair_required", "rejected"].includes(current.pilotUnitStatus) ||
    stableJson(previous.events) !== stableJson(current.events.slice(0, 2))
  ) {
    return false;
  }
  return true;
}

export async function collectPromotionAttemptHistoryProof(repoRoot, {
  manifestPath,
  pilotUnitId,
  attemptId,
  executionCommit = null
} = {}) {
  assertSafeRepoRelativePath(manifestPath);
  if (!isPromotionAttemptHistoryArtifactPath(manifestPath) || !manifestPath.startsWith(`${PROMOTION_ATTEMPT_HISTORY_ROOTS[0]}/`)) {
    throw new PromotionGateError(
      "ATTEMPT_MANIFEST_PATH_UNREGISTERED",
      "Promotion Manifest must be stored under the registered immutable pilot root."
    );
  }
  assertNonEmptyString(pilotUnitId, "attempt-history expected pilotUnitId");
  assertNonEmptyString(attemptId, "attempt-history expected attemptId");
  const canonicalRoot = await realpath(repoRoot);
  const state = await collectGitWorktreeState(canonicalRoot);
  if (!state.clean) {
    throw new PromotionGateError(
      "WORKTREE_DIRTY",
      "Attempt-history proof requires a clean named Git worktree.",
      { statusEntryCount: state.statusEntryCount },
      "blocked"
    );
  }
  if (executionCommit !== null && executionCommit !== state.headCommit) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_HEAD_MISMATCH",
      "Attempt-history proof execution commit differs from the current clean HEAD.",
      {},
      "blocked"
    );
  }
  const commitBytes = await runRegisteredGitProbe(canonicalRoot, [
    "rev-list", "--first-parent", "--reverse", "HEAD", "--", ...PROMOTION_ATTEMPT_HISTORY_ROOTS
  ]);
  const commitSource = decodeCanonicalUtf8(
    commitBytes,
    "ATTEMPT_HISTORY_UNAVAILABLE",
    "Promotion attempt commit history"
  );
  if (commitSource !== "" && !commitSource.endsWith("\n")) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_UNAVAILABLE",
      "Promotion attempt commit history output is ambiguous.",
      {},
      "blocked"
    );
  }
  const relevantCommits = commitSource === ""
    ? []
    : commitSource.slice(0, -1).split("\n");
  if (relevantCommits.some((commit) => !/^[a-f0-9]{40}$/u.test(commit))) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_UNAVAILABLE",
      "Promotion attempt commit history contains an invalid commit id.",
      {},
      "blocked"
    );
  }
  const commits = relevantCommits.at(-1) === state.headCommit
    ? relevantCommits
    : [...relevantCommits, state.headCommit];
  if (commits.length === 0 || commits.length > PROMOTION_ATTEMPT_HISTORY_MAX_COMMITS) {
    throw new PromotionGateError(
      "ATTEMPT_HISTORY_BOUND_EXCEEDED",
      "Promotion attempt history exceeds the frozen commit-count bound.",
      {
        maxCommits: PROMOTION_ATTEMPT_HISTORY_MAX_COMMITS,
        observedCommits: commits.length
      },
      "blocked"
    );
  }

  const blobCache = new Map();
  let uniqueArtifactBytes = 0;
  const loadArtifact = async (commit, entry) => {
    if (!blobCache.has(entry.objectId)) {
      const bytes = await runRegisteredGitProbe(
        canonicalRoot,
        ["show", "--no-textconv", `${commit}:${entry.path}`]
      );
      uniqueArtifactBytes += bytes.length;
      if (uniqueArtifactBytes > PROMOTION_ATTEMPT_HISTORY_MAX_UNIQUE_BYTES) {
        throw new PromotionGateError(
          "ATTEMPT_HISTORY_BOUND_EXCEEDED",
          "Promotion attempt history exceeds the frozen aggregate-byte bound.",
          {
            maxUniqueBytes: PROMOTION_ATTEMPT_HISTORY_MAX_UNIQUE_BYTES,
            observedUniqueBytes: uniqueArtifactBytes
          },
          "blocked"
        );
      }
      const value = parseCanonicalJsonBytes(
        bytes,
        "ATTEMPT_HISTORY_ARTIFACT_INVALID",
        "Promotion attempt history artifact"
      );
      blobCache.set(entry.objectId, {
        rawSha256: sha256(bytes),
        byteCount: bytes.length,
        value
      });
    }
    const loaded = blobCache.get(entry.objectId);
    return {
      ...entry,
      rawSha256: loaded.rawSha256,
      byteCount: loaded.byteCount,
      value: loaded.value,
      projection: promotionAttemptArtifactProjection(loaded.value, entry.path)
    };
  };

  const snapshots = [];
  for (const commit of commits) {
    const tree = parsePromotionAttemptHistoryTree(await runRegisteredGitProbe(canonicalRoot, [
      "ls-tree", "-r", "-z", "--full-tree", commit, "--", ...PROMOTION_ATTEMPT_HISTORY_ROOTS
    ]));
    const artifacts = [];
    for (const entry of tree) {
      const artifact = await loadArtifact(commit, entry);
      if (artifact.projection !== null) artifacts.push(artifact);
    }
    snapshots.push({ commit, artifacts });
  }

  const seenPathState = new Map();
  const manifestPathByAttempt = new Map();
  const singletonPathByIdentity = new Map();
  const frozenAttempts = new Set();
  const terminalAttempts = new Map();
  const attemptKeys = new Set();
  const historyProjection = [];
  for (const snapshot of snapshots) {
    const currentPaths = new Set(snapshot.artifacts.map(({ path: artifactPath }) => artifactPath));
    for (const [artifactPath] of seenPathState) {
      if (!currentPaths.has(artifactPath)) {
        throw new PromotionGateError(
          "ATTEMPT_ARTIFACT_DELETED",
          "A registered Promotion attempt artifact was deleted or delete-readded in Git history.",
          { artifactPathDigest: fingerprint(artifactPath) }
        );
      }
    }
    const currentManifestAttempts = new Set();
    const currentProjection = [];
    for (const artifact of snapshot.artifacts) {
      const { projection } = artifact;
      attemptKeys.add(projection.attemptKey);
      const identityKey = projection.kind === "receipt"
        ? `receipt\0${projection.attemptKey}\0${projection.runId}`
        : `${projection.kind}\0${projection.attemptKey}`;
      if (projection.kind === "manifest") {
        currentManifestAttempts.add(projection.attemptKey);
        const priorPath = manifestPathByAttempt.get(projection.attemptKey);
        if (priorPath !== undefined && priorPath !== artifact.path) {
          throw new PromotionGateError(
            "ATTEMPT_ID_DUPLICATE",
            "One Promotion Unit attemptId is registered by more than one Manifest path."
          );
        }
        manifestPathByAttempt.set(projection.attemptKey, artifact.path);
      } else if (["receipt", "disposition", "closure", "registry"].includes(projection.kind)) {
        const priorPath = singletonPathByIdentity.get(identityKey);
        if (priorPath !== undefined && priorPath !== artifact.path) {
          throw new PromotionGateError(
            "ATTEMPT_ID_DUPLICATE",
            "One immutable attempt artifact identity is registered at multiple paths."
          );
        }
        singletonPathByIdentity.set(identityKey, artifact.path);
      }

      const previous = seenPathState.get(artifact.path);
      if (previous !== undefined) {
        if (previous.identityKey !== identityKey || previous.kind !== projection.kind) {
          throw new PromotionGateError(
            "ATTEMPT_ARTIFACT_OVERWRITTEN",
            "A registered Promotion attempt path was overwritten with another artifact identity."
          );
        }
        if (previous.rawSha256 !== artifact.rawSha256) {
          if (projection.kind === "registry") {
            if (previous.status !== "shadow_ready") {
              throw new PromotionGateError(
                "ATTEMPT_TERMINAL_REWRITE",
                "A terminal Promotion attempt Registry was overwritten with another state."
              );
            }
            if (!legalRegistryHistoryEvolution(previous.registry, projection.registry)) {
              throw new PromotionGateError(
                "ATTEMPT_ARTIFACT_OVERWRITTEN",
                "Lifecycle Registry history is not the one legal shadow_ready to terminal append."
              );
            }
          } else if (projection.kind !== "manifest" || frozenAttempts.has(projection.attemptKey)) {
            throw new PromotionGateError(
              "ATTEMPT_ARTIFACT_OVERWRITTEN",
              "An immutable Promotion attempt artifact was overwritten in Git history."
            );
          }
        }
      }
      seenPathState.set(artifact.path, {
        identityKey,
        kind: projection.kind,
        rawSha256: artifact.rawSha256,
        status: projection.status,
        registry: projection.registry
      });
      if (projection.kind === "registry" && projection.status !== "shadow_ready") {
        const priorTerminal = terminalAttempts.get(projection.attemptKey);
        if (priorTerminal !== undefined && priorTerminal !== projection.status) {
          throw new PromotionGateError(
            "ATTEMPT_TERMINAL_REWRITE",
            "One Promotion attempt has conflicting terminal lifecycle states."
          );
        }
        terminalAttempts.set(projection.attemptKey, projection.status);
      }
      currentProjection.push({
        pathDigest: fingerprint(artifact.path),
        rawSha256: artifact.rawSha256,
        kind: projection.kind,
        identityDigest: fingerprint(identityKey),
        status: projection.status
      });
    }
    for (const artifact of snapshot.artifacts) {
      const { projection } = artifact;
      if (projection.kind !== "manifest" && !currentManifestAttempts.has(projection.attemptKey)) {
        throw new PromotionGateError(
          "ATTEMPT_ARTIFACT_ORPHANED",
          "A Receipt, disposition, closure, or Registry has no current immutable Manifest."
        );
      }
      if (["receipt", "disposition", "closure", "registry"].includes(projection.kind)) {
        frozenAttempts.add(projection.attemptKey);
      }
    }
    historyProjection.push({
      commit: snapshot.commit,
      artifacts: currentProjection.sort((left, right) => codePointCompare(left.pathDigest, right.pathDigest))
    });
  }

  const expectedAttemptKey = `${pilotUnitId}\0${attemptId}`;
  const currentArtifacts = snapshots.at(-1).artifacts;
  const expectedManifest = currentArtifacts.find(({ path: artifactPath }) => artifactPath === manifestPath);
  if (
    expectedManifest === undefined ||
    expectedManifest.projection.kind !== "manifest" ||
    expectedManifest.projection.attemptKey !== expectedAttemptKey
  ) {
    throw new PromotionGateError(
      "ATTEMPT_MANIFEST_UNREGISTERED",
      "Current Manifest path and Promotion Unit attempt identity are absent from the immutable history."
    );
  }
  const trackedProof = await collectTrackedInputProof(
    canonicalRoot,
    currentArtifacts.map(({ path: artifactPath }) => artifactPath)
  );
  const currentTreeProjection = historyProjection.at(-1).artifacts;
  const expectedRegistry = currentArtifacts.find(({ projection }) =>
    projection.kind === "registry" && projection.attemptKey === expectedAttemptKey
  );
  const expectedAttemptStatus = expectedRegistry?.projection.status ?? "draft";
  const expectedAttemptTerminal = ["shadow_passed", "repair_required", "rejected"].includes(expectedAttemptStatus);
  const proofPayload = {
    schemaVersion: "promotion-attempt-history-proof.v1",
    result: "pass",
    policy: "immutable-attempt-artifacts.v1",
    historyScope: "execution-head-first-parent",
    otherRefsCovered: false,
    historyTrustBoundary:
      "Execution HEAD first-parent history only; remote and divergent ref uniqueness requires required PR/main post-merge enforcement.",
    executionCommit: state.headCommit,
    roots: [...PROMOTION_ATTEMPT_HISTORY_ROOTS],
    inspectedCommitCount: snapshots.length,
    currentArtifactCount: currentArtifacts.length,
    uniqueArtifactVersionCount: blobCache.size,
    uniqueArtifactBytes,
    attemptCount: attemptKeys.size,
    frozenAttemptCount: frozenAttempts.size,
    terminalAttemptCount: terminalAttempts.size,
    registeredManifest: true,
    expectedAttemptStatus,
    expectedAttemptTerminal,
    manifestPathDigest: fingerprint(manifestPath),
    pilotAttemptDigest: fingerprint({ pilotUnitId, attemptId }),
    historyDigest: fingerprint(historyProjection),
    currentTreeDigest: fingerprint(currentTreeProjection),
    currentTrackedInputCount: trackedProof.trackedInputCount,
    currentTrackedInputAggregateDigest: trackedProof.trackedInputAggregateDigest,
    cleanWorktree: true
  };
  return { ...proofPayload, digest: fingerprint(proofPayload) };
}

export function renderPromotionDecisionMarkdown({ receipt, closure, disposition, registry } = {}) {
  validateReceiptStructure(receipt);
  assertSelfDigest(registry, "registryDigest", "REGISTRY_DIGEST_MISMATCH", "Lifecycle registry");
  if (receipt.result === "fail") {
    assertSelfDigest(
      disposition,
      "dispositionDigest",
      "DISPOSITION_DIGEST_MISMATCH",
      "Promotion disposition"
    );
    const terminalEvent = registry.events?.at(-1);
    if (
      !["repair_required", "rejected"].includes(registry.pilotUnitStatus) ||
      registry.parentPackageStatus !== "candidate-only" ||
      registry.liveAllowed !== false ||
      registry.liveEvidence !== "none" ||
      registry.maturityClaim !== "not-shadow-mature" ||
      disposition.receipt?.rawReceiptDigest !== receipt.rawReceiptDigest ||
      disposition.receipt?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
      disposition.receipt?.runId !== receipt.runMetadata.runId ||
      disposition.reasonCode !== receipt.exitReason.code ||
      disposition.decision !== registry.pilotUnitStatus ||
      disposition.newAttemptRequired !== true ||
      terminalEvent?.fromState !== "shadow_ready" ||
      terminalEvent?.toState !== registry.pilotUnitStatus ||
      terminalEvent?.disposition?.digest !== disposition.dispositionDigest
    ) {
      throw new PromotionGateError(
        "DECISION_INPUT_INVALID",
        "Failure decision Markdown requires one validated failed Receipt, disposition, and terminal registry."
      );
    }
    return [
      "# Promotion Gate Attempt Decision",
      "",
      `- Parent package status: ${registry.parentPackageStatus}`,
      `- Pilot unit status: ${registry.pilotUnitStatus}`,
      `- Gate result: ${receipt.result}`,
      `- Exit reason: ${receipt.exitReason.code}`,
      `- New candidate version and attempt required: ${String(disposition.newAttemptRequired)}`,
      `- Live allowed: ${String(registry.liveAllowed)}`,
      `- Live evidence: ${registry.liveEvidence}`,
      `- Maturity claim: ${registry.maturityClaim}`,
      `- Receipt digest: ${receipt.rawReceiptDigest}`,
      `- Semantic Receipt digest: ${receipt.semanticReceiptDigest}`,
      `- Disposition digest: ${disposition.dispositionDigest}`,
      `- Registry digest: ${registry.registryDigest}`,
      ""
    ].join("\n");
  }
  assertSelfDigest(closure, "closureDigest", "CLOSURE_DIGEST_MISMATCH", "Promotion closure");
  if (
    receipt.result !== "pass" ||
    closure.receipts?.canonical?.rawReceiptDigest !== receipt.rawReceiptDigest ||
    closure.receipts?.canonical?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    registry.pilotUnitStatus !== "shadow_passed" ||
    registry.parentPackageStatus !== "candidate-only" ||
    registry.liveAllowed !== false ||
    registry.liveEvidence !== "none" ||
    registry.maturityClaim !== PROMOTION_MATURITY_CLAIM
  ) {
    throw new PromotionGateError("DECISION_INPUT_INVALID", "Decision Markdown requires one validated shadow-passed closure and registry.");
  }
  return [
    "# Promotion Gate Decision",
    "",
    `- Parent package status: ${registry.parentPackageStatus}`,
    `- Pilot unit status: ${registry.pilotUnitStatus}`,
    `- Live allowed: ${String(registry.liveAllowed)}`,
    `- Live evidence: ${registry.liveEvidence}`,
    `- Maturity claim: ${registry.maturityClaim}`,
    `- Canonical Receipt digest: ${receipt.rawReceiptDigest}`,
    `- Semantic Receipt digest: ${receipt.semanticReceiptDigest}`,
    `- Closure digest: ${closure.closureDigest}`,
    `- Registry digest: ${registry.registryDigest}`,
    ""
  ].join("\n");
}

export async function verifyPromotionReceipt(repoRoot, receipt, {
  producedAt = new Date().toISOString()
} = {}) {
  validateReceiptStructure(receipt);
  const verificationWorktree = await collectGitWorktreeState(repoRoot);
  if (
    !verificationWorktree.clean ||
    receipt.worktreeProof === null ||
    verificationWorktree.headCommit !== receipt.worktreeProof.executionCommit
  ) {
    throw new PromotionGateError(
      "RECEIPT_EXECUTION_HEAD_MISMATCH",
      "Receipt verification requires the exact clean execution commit recorded by the Receipt.",
      {
        expectedExecutionCommit: receipt.worktreeProof?.executionCommit ?? null,
        currentExecutionCommit: verificationWorktree.headCommit,
        clean: verificationWorktree.clean
      },
      "blocked"
    );
  }
  const loaded = await readAuthoritativeFile(repoRoot, receipt.manifest.path);
  if (loaded.rawSha256 !== receipt.manifest.rawSha256) {
    throw new PromotionGateError(
      "RECEIPT_MANIFEST_DIGEST_MISMATCH",
      "Referenced promotion manifest bytes do not match the receipt."
    );
  }
  let manifest;
  try {
    manifest = parseCanonicalJsonBytes(loaded.bytes, "MANIFEST_JSON_INVALID", "Referenced promotion manifest");
  } catch {
    throw new PromotionGateError("MANIFEST_JSON_INVALID", "Referenced promotion manifest is not valid JSON.");
  }
  validatePromotionManifest(manifest);
  if (
    receipt.mode !== manifest.mode ||
    receipt.binding.gateId !== manifest.gateId ||
    receipt.binding.pilotUnitId !== manifest.pilotUnitId ||
    receipt.binding.attemptId !== manifest.attemptId ||
    receipt.binding.candidateDigest !== manifest.candidateDigest ||
    receipt.binding.sourceCommit !== manifest.sourceCommit ||
    receipt.binding.targetBaselineCommit !== manifest.targetBaselineCommit ||
    receipt.binding.checkerVersion !== manifest.checkerVersion ||
    stableJson(receipt.binding.checkerRelease) !== stableJson(manifest.checkerRelease) ||
    stableJson(receipt.binding.parentPackage) !== stableJson(manifest.parentPackage)
  ) {
    throw new PromotionGateError("RECEIPT_MANIFEST_BINDING_MISMATCH", "Receipt does not match the referenced manifest bindings.");
  }
  if (receipt.candidateSourceProof !== null) {
    const expectedPaths = manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath);
    const currentCandidateSource = await snapshotCandidateSourceAggregate(repoRoot, manifest);
    if (
      stableJson(receipt.candidateSourceProof.paths) !== stableJson(expectedPaths) ||
      stableJson(currentCandidateSource.paths) !== stableJson(expectedPaths) ||
      receipt.candidateSourceProof.postAggregateDigest !== currentCandidateSource.aggregateDigest
    ) {
      throw new PromotionGateError(
        "RECEIPT_CANDIDATE_SOURCE_INVALID",
        "Receipt candidate source proof does not match the referenced manifest files."
      );
    }
  }
  if (receipt.worktreeProof?.trackedInputAggregateDigest !== null) {
    if (receipt.sourceSnapshots === null) {
      throw new PromotionGateError("RECEIPT_WORKTREE_PROOF_INVALID", "Tracked-input receipt proof has no source snapshot.");
    }
    const trackedInputPaths = [
      ...new Set([receipt.manifest.path, ...receipt.sourceSnapshots.pre.files.map(({ path: filePath }) => filePath)])
    ];
    let currentTrackedProof;
    try {
      currentTrackedProof = await collectTrackedInputProof(repoRoot, trackedInputPaths);
    } catch {
      throw new PromotionGateError(
        "RECEIPT_WORKTREE_PROOF_INVALID",
        "Receipt tracked-input proof cannot be reproduced from committed blobs."
      );
    }
    if (
      currentTrackedProof.trackedInputCount !== receipt.worktreeProof.trackedInputCount ||
      currentTrackedProof.trackedInputAggregateDigest !== receipt.worktreeProof.trackedInputAggregateDigest
    ) {
      throw new PromotionGateError(
        "RECEIPT_WORKTREE_PROOF_INVALID",
        "Receipt tracked-input aggregate does not match committed authoritative inputs."
      );
    }
  }
  parseCanonicalTimestamp(producedAt, "RUN_TIME_INVALID", "producedAt");
  const replayed = await runShadowPilot(repoRoot, {
    manifestPath: receipt.manifest.path,
    runId: `verify-${receipt.rawReceiptDigest.slice(0, 16)}`,
    producedAt,
    ciMetadata: null
  });
  if (
    replayed.result !== receipt.result ||
    replayed.semanticReceiptDigest !== receipt.semanticReceiptDigest
  ) {
    throw new PromotionGateError(
      "RECEIPT_SEMANTIC_REPLAY_MISMATCH",
      "Current repository semantic replay does not reproduce the submitted receipt.",
      {
        expectedResult: receipt.result,
        observedResult: replayed.result,
        expectedSemanticDigest: receipt.semanticReceiptDigest,
        observedSemanticDigest: replayed.semanticReceiptDigest
      }
    );
  }
  return {
    valid: true,
    result: receipt.result,
    manifestPath: receipt.manifest.path,
    manifestDigest: receipt.manifest.rawSha256,
    semanticReceiptDigest: receipt.semanticReceiptDigest,
    rawReceiptDigest: receipt.rawReceiptDigest
  };
}
