import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

export const HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_SCHEMA =
  "hk-visualization-release-source-freeze/v1";

const STARSHIP_ROOT = "/Volumes/Starship";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;
const MODE_PATTERN = /^[0-7]{4}$/;
const SAFE_TOOL_NAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const SAFE_TOOL_VERSION_PATTERN = /^[A-Za-z0-9._+:/@()-]{1,128}$/;
const EXCLUDED_DIRECTORY_NAMES = [
  ".git",
  ".local",
  ".next",
  ".tmp",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
];

export const HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_POLICY = deepFreeze({
  directoryEnumeration: "pre-and-post-membership-and-identity",
  entryOrdering: "binary-codepoint-relative-path",
  excludedDirectoryNames: EXCLUDED_DIRECTORY_NAMES,
  excludedEntryNames: [".git"],
  excludedGeneratedFiles: [
    ".DS_Store",
    "*.tsbuildinfo",
    "tsconfig.playwright-*.tmp.json",
  ],
  hashAlgorithm: "sha256",
  rawSecretRetention: "forbidden",
  regularFileRead: "nofollow-fd-pre-and-post-identity",
  secretLocalPayloads: "reject-with-path-fingerprint-only",
  symlinks: "canonical-internal-target-only-no-chain-or-excluded-target",
  unsafeFileTypes: "reject",
  workspaceRoot: "absolute-physical-directory-below-/Volumes/Starship",
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-canonical-number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("non-canonical-value");
}

function fingerprint(value) {
  const bytes = Buffer.from(String(value));
  return `length=${bytes.length},sha256=${sha256(bytes)}`;
}

function fail(reason, opaqueValue = "") {
  const suffix = opaqueValue === "" ? "" : `; input=${fingerprint(opaqueValue)}`;
  throw new Error(`${reason}${suffix}`);
}

function formatMode(mode) {
  return (Number(mode & 0o7777n) & 0o7777).toString(8).padStart(4, "0");
}

function entryType(stat) {
  if (stat.isFile()) return "file";
  if (stat.isDirectory()) return "directory";
  if (stat.isSymbolicLink()) return "symlink";
  return "unsafe";
}

function statIdentity(stat) {
  return {
    ctimeNs: String(stat.ctimeNs),
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    mtimeNs: String(stat.mtimeNs),
    nlink: String(stat.nlink),
    size: String(stat.size),
  };
}

function sameStat(left, right) {
  return canonicalJson(statIdentity(left)) === canonicalJson(statIdentity(right));
}

function sameObject(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function isBelow(root, candidate) {
  return candidate !== root && candidate.startsWith(`${root}${sep}`);
}

function isAtOrBelow(root, candidate) {
  return candidate === root || isBelow(root, candidate);
}

function toReceiptPath(workspace, absolutePath) {
  const result = relative(workspace, absolutePath);
  if (result === "") return ".";
  if (
    result === ".." ||
    result.startsWith(`..${sep}`) ||
    isAbsolute(result) ||
    result.includes("\0")
  ) {
    fail("source-path-outside-workspace", result);
  }
  return result.split(sep).join("/");
}

function absoluteReceiptPath(workspace, receiptPath) {
  if (receiptPath === ".") return workspace;
  return join(workspace, ...receiptPath.split("/"));
}

function pathSegments(receiptPath) {
  return receiptPath === "." ? [] : receiptPath.split("/");
}

function hasExcludedSegment(receiptPath) {
  return pathSegments(receiptPath).some((segment) =>
    EXCLUDED_DIRECTORY_NAMES.includes(segment),
  );
}

function isGeneratedFileName(name) {
  return (
    name === ".DS_Store" ||
    name.endsWith(".tsbuildinfo") ||
    /^tsconfig\.playwright-.*\.tmp\.json$/.test(name)
  );
}

function isTemplateName(lowerName) {
  return /(?:^|\.)(?:example|sample|template)(?:\.[a-z0-9_-]+)?$/.test(
    lowerName,
  );
}

function isForbiddenSecretName(name) {
  const lowerName = name.toLowerCase();
  if (isTemplateName(lowerName)) return false;
  if (lowerName === ".env" || lowerName.startsWith(".env.")) return true;
  if (
    [
      ".npmrc",
      ".pnpmrc",
      ".pypirc",
      ".yarnrc",
      "all api keys.docx",
      "credentials.json",
      "secrets.json",
      "service-account.json",
    ].includes(lowerName)
  ) {
    return true;
  }
  if (/^id_(?:dsa|ecdsa|ed25519|rsa)(?:\.pub)?$/.test(lowerName)) return true;
  if (/^service-account(?:[-_.][a-z0-9_-]+)?\.json$/.test(lowerName)) return true;
  if (/\.(?:cer|crt|der|jks|key|keystore|p12|pem|pfx)$/.test(lowerName)) return true;
  return false;
}

function assertSafeSourceName(receiptPath) {
  const name = basename(receiptPath);
  if (isForbiddenSecretName(name)) {
    fail("forbidden-secret-local-payload", receiptPath);
  }
}

function assertSafeWorkspace(workspaceInput) {
  if (typeof workspaceInput !== "string" || !isAbsolute(workspaceInput)) {
    fail("workspace-root-must-be-physical", workspaceInput);
  }
  const workspace = resolve(workspaceInput);
  if (
    workspaceInput !== workspace ||
    !isBelow(STARSHIP_ROOT, workspace)
  ) {
    fail("workspace-root-must-be-physical", workspaceInput);
  }
  let rootStat;
  try {
    rootStat = lstatSync(workspace, { bigint: true });
  } catch {
    fail("workspace-root-must-be-physical", workspaceInput);
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("workspace-root-must-be-physical", workspaceInput);
  }
  let physical;
  try {
    physical = realpathSync.native(workspace);
  } catch {
    fail("workspace-root-must-be-physical", workspaceInput);
  }
  if (physical !== workspace) {
    fail("workspace-root-must-be-physical", workspaceInput);
  }

  const relativeFromStarship = relative(STARSHIP_ROOT, workspace);
  let cursor = STARSHIP_ROOT;
  for (const segment of relativeFromStarship.split(sep)) {
    if (!segment) continue;
    cursor = join(cursor, segment);
    let segmentStat;
    try {
      segmentStat = lstatSync(cursor, { bigint: true });
    } catch {
      fail("workspace-root-must-be-physical", workspaceInput);
    }
    if (segmentStat.isSymbolicLink()) {
      fail("workspace-root-must-be-physical", workspaceInput);
    }
  }
  return {
    rootStat,
    workspace,
    workspaceIdentity: {
      dev: String(rootStat.dev),
      ino: String(rootStat.ino),
      realpath: workspace,
    },
  };
}

function readDirectoryNames(absolutePath) {
  const names = readdirSync(absolutePath, { encoding: "utf8" });
  for (const name of names) {
    if (name === "" || name === "." || name === ".." || name.includes("/") || name.includes("\0")) {
      fail("unsafe-source-entry-name", name);
    }
  }
  return names.sort(compareText);
}

function openNoFollow(absolutePath) {
  const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  return openSync(absolutePath, constants.O_RDONLY | noFollow);
}

function readStableRegularFile({
  absolutePath,
  beforePathStat,
  hook,
  relativePath,
}) {
  let fd;
  try {
    fd = openNoFollow(absolutePath);
  } catch {
    fail("source-mutated-during-hash", relativePath);
  }
  try {
    const beforeFdStat = fstatSync(fd, { bigint: true });
    if (
      !beforeFdStat.isFile() ||
      !sameStat(beforePathStat, beforeFdStat) ||
      beforeFdStat.nlink !== 1n
    ) {
      fail(
        beforeFdStat.nlink !== 1n
          ? "source-hardlink-alias-forbidden"
          : "source-mutated-during-hash",
        relativePath,
      );
    }
    const bytes = readFileSync(fd);
    if (hook) hook({ relativePath });
    const afterFdStat = fstatSync(fd, { bigint: true });
    let afterPathStat;
    try {
      afterPathStat = lstatSync(absolutePath, { bigint: true });
    } catch {
      fail("source-mutated-during-hash", relativePath);
    }
    if (
      !afterPathStat.isFile() ||
      !sameStat(beforeFdStat, afterFdStat) ||
      !sameStat(afterFdStat, afterPathStat)
    ) {
      fail("source-mutated-during-hash", relativePath);
    }
    return {
      bytes,
      stat: afterFdStat,
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function captureToolchainInput(input) {
  const rawFingerprint = canonicalJson({
    name: typeof input?.name === "string" ? fingerprint(input.name) : typeof input?.name,
    path: typeof input?.path === "string" ? fingerprint(input.path) : typeof input?.path,
    version:
      typeof input?.version === "string"
        ? fingerprint(input.version)
        : typeof input?.version,
  });
  if (
    !input ||
    typeof input !== "object" ||
    !SAFE_TOOL_NAME_PATTERN.test(input.name ?? "") ||
    !SAFE_TOOL_VERSION_PATTERN.test(input.version ?? "") ||
    typeof input.path !== "string" ||
    !isAbsolute(input.path) ||
    resolve(input.path) !== input.path
  ) {
    fail("invalid-toolchain-input", rawFingerprint);
  }
  let physicalPath;
  let stat;
  try {
    physicalPath = realpathSync.native(input.path);
    stat = lstatSync(physicalPath, { bigint: true });
  } catch {
    fail("invalid-toolchain-input", rawFingerprint);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("invalid-toolchain-input", rawFingerprint);
  }
  let captured;
  try {
    captured = readStableRegularFile({
      absolutePath: physicalPath,
      beforePathStat: stat,
      relativePath: "toolchain-input",
    });
  } catch {
    fail("invalid-toolchain-input", rawFingerprint);
  }
  return {
    dev: String(captured.stat.dev),
    ino: String(captured.stat.ino),
    mode: formatMode(captured.stat.mode),
    name: input.name,
    pathSha256: sha256(input.path),
    realpathSha256: sha256(physicalPath),
    sha256: sha256(captured.bytes),
    size: Number(captured.stat.size),
    type: "file",
    version: input.version,
  };
}

function directoryHashChildren(entries, directoryPath) {
  const prefix = directoryPath === "." ? "" : `${directoryPath}/`;
  const children = [];
  for (const entry of entries) {
    if (entry.path === directoryPath || !entry.path.startsWith(prefix)) continue;
    const remainder = entry.path.slice(prefix.length);
    if (!remainder.includes("/")) {
      children.push({ name: remainder, type: entry.type });
    }
  }
  children.sort((left, right) => compareText(left.name, right.name));
  return sha256(canonicalJson(children));
}

function captureEntries({ afterRegularFileRead, workspace }) {
  const entries = [];
  const deferredSymlinkChecks = [];

  function visit(absolutePath, receiptPath) {
    let beforeStat;
    try {
      beforeStat = lstatSync(absolutePath, { bigint: true });
    } catch {
      fail("source-mutated-during-enumeration", receiptPath);
    }
    const type = entryType(beforeStat);
    if (receiptPath !== ".") assertSafeSourceName(receiptPath);

    if (type === "file") {
      const captured = readStableRegularFile({
        absolutePath,
        beforePathStat: beforeStat,
        hook: afterRegularFileRead,
        relativePath: receiptPath,
      });
      entries.push({
        mode: formatMode(captured.stat.mode),
        path: receiptPath,
        sha256: sha256(captured.bytes),
        size: Number(captured.stat.size),
        type: "file",
      });
      return;
    }

    if (type === "symlink") {
      let linkText;
      try {
        linkText = readlinkSync(absolutePath, { encoding: "utf8" });
      } catch {
        fail("symlink-mutated-during-enumeration", receiptPath);
      }
      const lexicalTarget = resolve(dirname(absolutePath), linkText);
      if (!isAtOrBelow(workspace, lexicalTarget)) {
        fail("symlink-target-outside-workspace", receiptPath);
      }
      const targetReceiptPath = toReceiptPath(workspace, lexicalTarget);
      if (targetReceiptPath === ".") {
        fail("symlink-target-workspace-root", receiptPath);
      }
      if (
        hasExcludedSegment(targetReceiptPath) ||
        isGeneratedFileName(basename(targetReceiptPath))
      ) {
        fail("symlink-target-excluded", receiptPath);
      }
      assertSafeSourceName(targetReceiptPath);
      let physicalTarget;
      let targetStat;
      try {
        physicalTarget = realpathSync.native(lexicalTarget);
        targetStat = lstatSync(physicalTarget, { bigint: true });
      } catch {
        fail("symlink-target-unresolvable", receiptPath);
      }
      if (!isAtOrBelow(workspace, physicalTarget)) {
        fail("symlink-target-outside-workspace", receiptPath);
      }
      if (physicalTarget !== lexicalTarget) {
        fail("symlink-target-alias-chain", receiptPath);
      }
      const targetType = entryType(targetStat);
      if (targetType !== "file" && targetType !== "directory") {
        fail("symlink-target-unsafe-type", receiptPath);
      }
      let afterLinkStat;
      let afterLinkText;
      try {
        afterLinkStat = lstatSync(absolutePath, { bigint: true });
        afterLinkText = readlinkSync(absolutePath, { encoding: "utf8" });
      } catch {
        fail("symlink-mutated-during-enumeration", receiptPath);
      }
      if (!sameStat(beforeStat, afterLinkStat) || linkText !== afterLinkText) {
        fail("symlink-mutated-during-enumeration", receiptPath);
      }
      entries.push({
        mode: formatMode(afterLinkStat.mode),
        path: receiptPath,
        sha256: sha256(Buffer.from(linkText)),
        target: targetReceiptPath,
        targetMode: formatMode(targetStat.mode),
        targetType,
        type: "symlink",
      });
      deferredSymlinkChecks.push({
        absolutePath,
        linkStat: afterLinkStat,
        linkText,
        receiptPath,
        targetPath: physicalTarget,
        targetStat,
      });
      return;
    }

    if (type === "directory") {
      const namesBefore = readDirectoryNames(absolutePath);
      for (const name of namesBefore) {
        const childAbsolutePath = join(absolutePath, name);
        const childReceiptPath = toReceiptPath(workspace, childAbsolutePath);
        if (name === ".git") continue;
        let childStat;
        try {
          childStat = lstatSync(childAbsolutePath, { bigint: true });
        } catch {
          fail("directory-mutated-during-enumeration", receiptPath);
        }
        if (
          EXCLUDED_DIRECTORY_NAMES.includes(name) &&
          (childStat.isDirectory() || childStat.isSymbolicLink())
        ) {
          continue;
        }
        if (childStat.isFile() && isGeneratedFileName(name)) continue;
        visit(childAbsolutePath, childReceiptPath);
      }
      const namesAfter = readDirectoryNames(absolutePath);
      let afterStat;
      try {
        afterStat = lstatSync(absolutePath, { bigint: true });
      } catch {
        fail("directory-mutated-during-enumeration", receiptPath);
      }
      if (
        !sameObject(namesBefore, namesAfter) ||
        !sameStat(beforeStat, afterStat)
      ) {
        fail("directory-mutated-during-enumeration", receiptPath);
      }
      entries.push({
        mode: formatMode(afterStat.mode),
        path: receiptPath,
        sha256: "0".repeat(64),
        type: "directory",
      });
      return;
    }

    fail("unsafe-source-entry-type", receiptPath);
  }

  visit(workspace, ".");
  entries.sort((left, right) => compareText(left.path, right.path));
  for (const entry of entries) {
    if (entry.type === "directory") {
      entry.sha256 = directoryHashChildren(entries, entry.path);
    }
  }

  for (const check of deferredSymlinkChecks) {
    let currentLinkStat;
    let currentLinkText;
    let currentTargetStat;
    try {
      currentLinkStat = lstatSync(check.absolutePath, { bigint: true });
      currentLinkText = readlinkSync(check.absolutePath, { encoding: "utf8" });
      currentTargetStat = lstatSync(check.targetPath, { bigint: true });
    } catch {
      fail("symlink-mutated-during-enumeration", check.receiptPath);
    }
    if (
      !sameStat(check.linkStat, currentLinkStat) ||
      check.linkText !== currentLinkText ||
      !sameStat(check.targetStat, currentTargetStat)
    ) {
      fail("symlink-mutated-during-enumeration", check.receiptPath);
    }
  }
  return entries;
}

function receiptPayload(snapshot) {
  return {
    entries: snapshot.entries,
    entryCount: snapshot.entryCount,
    policy: snapshot.policy,
    schemaVersion: snapshot.schemaVersion,
    sourceAggregateSha256: snapshot.sourceAggregateSha256,
    toolchain: snapshot.toolchain,
    workspaceIdentity: snapshot.workspaceIdentity,
  };
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return sameObject(Object.keys(value).sort(compareText), [...expected].sort(compareText));
}

function isSafeReceiptPath(value) {
  if (value === ".") return true;
  if (typeof value !== "string" || value === "" || value.startsWith("/") || value.includes("\\")) {
    return false;
  }
  const segments = value.split("/");
  return segments.every(
    (segment) => segment !== "" && segment !== "." && segment !== ".." && !segment.includes("\0"),
  );
}

function invalidReceipt(reason) {
  throw new Error(`invalid source-freeze receipt: ${reason}`);
}

function validateWorkspaceIdentity(identity) {
  if (!exactKeys(identity, ["dev", "ino", "realpath"])) return false;
  if (
    !POSITIVE_INTEGER_PATTERN.test(identity.dev) ||
    !POSITIVE_INTEGER_PATTERN.test(identity.ino) ||
    typeof identity.realpath !== "string" ||
    !isBelow(STARSHIP_ROOT, identity.realpath) ||
    resolve(identity.realpath) !== identity.realpath
  ) {
    return false;
  }
  try {
    const stat = lstatSync(identity.realpath, { bigint: true });
    return (
      stat.isDirectory() &&
      !stat.isSymbolicLink() &&
      String(stat.dev) === identity.dev &&
      String(stat.ino) === identity.ino &&
      realpathSync.native(identity.realpath) === identity.realpath
    );
  } catch {
    return false;
  }
}

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  let priorPath = null;
  const byPath = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    if (!isSafeReceiptPath(entry.path) || !MODE_PATTERN.test(entry.mode) || !HASH_PATTERN.test(entry.sha256)) {
      return false;
    }
    if (priorPath !== null && compareText(priorPath, entry.path) >= 0) return false;
    priorPath = entry.path;
    if (byPath.has(entry.path)) return false;
    byPath.set(entry.path, entry);
    if (entry.type === "file") {
      if (!exactKeys(entry, ["mode", "path", "sha256", "size", "type"])) return false;
      if (!Number.isSafeInteger(entry.size) || entry.size < 0) return false;
    } else if (entry.type === "directory") {
      if (!exactKeys(entry, ["mode", "path", "sha256", "type"])) return false;
    } else if (entry.type === "symlink") {
      if (
        !exactKeys(entry, [
          "mode",
          "path",
          "sha256",
          "target",
          "targetMode",
          "targetType",
          "type",
        ]) ||
        !isSafeReceiptPath(entry.target) ||
        !MODE_PATTERN.test(entry.targetMode) ||
        !["file", "directory"].includes(entry.targetType)
      ) {
        return false;
      }
    } else {
      return false;
    }
  }
  const root = byPath.get(".");
  if (!root || root.type !== "directory") return false;
  for (const entry of entries) {
    if (entry.path !== ".") {
      const parentPath = dirname(entry.path).split(sep).join("/");
      const parent = byPath.get(parentPath === "." ? "." : parentPath);
      if (!parent || parent.type !== "directory") return false;
    }
    if (entry.type === "directory") {
      if (entry.sha256 !== directoryHashChildren(entries, entry.path)) return false;
    }
    if (entry.type === "symlink") {
      const target = byPath.get(entry.target);
      if (
        !target ||
        target.type !== entry.targetType ||
        target.mode !== entry.targetMode
      ) {
        return false;
      }
    }
  }
  return true;
}

function validateToolchain(toolchain) {
  if (!Array.isArray(toolchain)) return false;
  let priorName = null;
  for (const entry of toolchain) {
    if (
      !exactKeys(entry, [
        "dev",
        "ino",
        "mode",
        "name",
        "pathSha256",
        "realpathSha256",
        "sha256",
        "size",
        "type",
        "version",
      ]) ||
      !POSITIVE_INTEGER_PATTERN.test(entry.dev) ||
      !POSITIVE_INTEGER_PATTERN.test(entry.ino) ||
      !MODE_PATTERN.test(entry.mode) ||
      !SAFE_TOOL_NAME_PATTERN.test(entry.name) ||
      !SAFE_TOOL_VERSION_PATTERN.test(entry.version) ||
      !HASH_PATTERN.test(entry.pathSha256) ||
      !HASH_PATTERN.test(entry.realpathSha256) ||
      !HASH_PATTERN.test(entry.sha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      entry.type !== "file" ||
      (priorName !== null && compareText(priorName, entry.name) >= 0)
    ) {
      return false;
    }
    priorName = entry.name;
  }
  return true;
}

export function captureHkVisualizationReleaseSourceSnapshot(options = {}) {
  const { rootStat, workspace, workspaceIdentity } = assertSafeWorkspace(
    options.workspace,
  );
  if (
    options.afterRegularFileRead !== undefined &&
    typeof options.afterRegularFileRead !== "function"
  ) {
    fail("invalid-source-freeze-hook");
  }
  if (
    options.toolchainInputs !== undefined &&
    !Array.isArray(options.toolchainInputs)
  ) {
    fail("invalid-toolchain-input");
  }
  const entries = captureEntries({
    afterRegularFileRead: options.afterRegularFileRead,
    workspace,
  });
  const toolchain = (options.toolchainInputs ?? [])
    .map((input) => captureToolchainInput(input))
    .sort((left, right) => compareText(left.name, right.name));
  for (let index = 1; index < toolchain.length; index += 1) {
    if (toolchain[index - 1].name === toolchain[index].name) {
      fail("invalid-toolchain-input", toolchain[index].name);
    }
  }
  for (const tool of toolchain) {
    const sourceEntry = entries.find(
      (entry) =>
        entry.type === "file" &&
        sha256(absoluteReceiptPath(workspace, entry.path)) === tool.pathSha256,
    );
    if (sourceEntry && (sourceEntry.sha256 !== tool.sha256 || sourceEntry.mode !== tool.mode)) {
      fail("toolchain-source-identity-drift", tool.name);
    }
  }
  let afterRootStat;
  try {
    afterRootStat = lstatSync(workspace, { bigint: true });
  } catch {
    fail("workspace-mutated-during-capture");
  }
  if (!sameStat(rootStat, afterRootStat)) {
    fail("workspace-mutated-during-capture");
  }
  const sourceAggregateSha256 = sha256(canonicalJson(entries));
  const snapshot = {
    entries,
    entryCount: entries.length,
    policy: HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_POLICY,
    schemaVersion: HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_SCHEMA,
    sourceAggregateSha256,
    toolchain,
    workspaceIdentity,
  };
  snapshot.receiptAggregateSha256 = sha256(canonicalJson(receiptPayload(snapshot)));
  return deepFreeze(snapshot);
}

export function validateHkVisualizationReleaseSourceSnapshot(snapshot) {
  try {
    if (
      !exactKeys(snapshot, [
        "entries",
        "entryCount",
        "policy",
        "receiptAggregateSha256",
        "schemaVersion",
        "sourceAggregateSha256",
        "toolchain",
        "workspaceIdentity",
      ]) ||
      snapshot.schemaVersion !== HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_SCHEMA ||
      !sameObject(snapshot.policy, HK_VISUALIZATION_RELEASE_SOURCE_FREEZE_POLICY) ||
      !validateWorkspaceIdentity(snapshot.workspaceIdentity) ||
      !Number.isSafeInteger(snapshot.entryCount) ||
      snapshot.entryCount < 1 ||
      snapshot.entryCount !== snapshot.entries?.length ||
      !validateEntries(snapshot.entries) ||
      !validateToolchain(snapshot.toolchain) ||
      !HASH_PATTERN.test(snapshot.sourceAggregateSha256 ?? "") ||
      snapshot.sourceAggregateSha256 !== sha256(canonicalJson(snapshot.entries)) ||
      !HASH_PATTERN.test(snapshot.receiptAggregateSha256 ?? "") ||
      snapshot.receiptAggregateSha256 !== sha256(canonicalJson(receiptPayload(snapshot)))
    ) {
      invalidReceipt("schema-or-integrity");
    }
  } catch (error) {
    if (String(error?.message).startsWith("invalid source-freeze receipt:")) {
      throw error;
    }
    invalidReceipt("schema-or-integrity");
  }
  return deepFreeze({
    entryCount: snapshot.entryCount,
    receiptAggregateSha256: snapshot.receiptAggregateSha256,
    sourceAggregateSha256: snapshot.sourceAggregateSha256,
  });
}

export function compareHkVisualizationReleaseSourceSnapshots(before, after) {
  validateHkVisualizationReleaseSourceSnapshot(before);
  validateHkVisualizationReleaseSourceSnapshot(after);
  const issues = [];
  if (before.schemaVersion !== after.schemaVersion) issues.push("schema-version-drift");
  if (!sameObject(before.policy, after.policy)) issues.push("policy-drift");
  if (!sameObject(before.workspaceIdentity, after.workspaceIdentity)) {
    issues.push("workspace-identity-drift");
  }
  if (!sameObject(before.toolchain, after.toolchain)) issues.push("toolchain-drift");
  if (before.entryCount !== after.entryCount) issues.push("entry-count-drift");
  if (before.sourceAggregateSha256 !== after.sourceAggregateSha256) {
    issues.push("source-aggregate-drift");
  }
  if (before.receiptAggregateSha256 !== after.receiptAggregateSha256) {
    issues.push("receipt-aggregate-drift");
  }
  return deepFreeze({ equal: issues.length === 0, issues });
}

export function assertHkVisualizationReleaseSourceSnapshotUnchanged(before, after) {
  const comparison = compareHkVisualizationReleaseSourceSnapshots(before, after);
  if (!comparison.equal) {
    throw new Error(`HK Visualization release source changed: ${comparison.issues.join(",")}`);
  }
  return comparison;
}
