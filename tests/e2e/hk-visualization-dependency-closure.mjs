import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { constants as fsConstants } from "node:fs";
import {
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA =
  "hk-visualization-dependency-closure/v2";
export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA =
  "hk-visualization-dependency-closure-artifact/v1";
export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA =
  "hk-visualization-dependency-closure-summary/v2";

export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256 =
  "da263e501296e5240d08c357d0ffa3222ef294820cff46daab87dcb8e4ac7c94";

export const HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE = deepFreeze({
  aggregateSha256:
    "016dbf546dc90758211f65763935d7c4fe164071af30c5228e3f3e3c3c71a49d",
  entryCount: 22_716,
  fileCount: 22_690,
  symlinkCount: 26,
  versions: {
    expected: "15.5.23",
    installed: "15.5.23",
    lockInstalled: "15.5.23",
    lockRoot: "15.5.23",
    required: "15.5.23",
  },
});

export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_POLICY = deepFreeze({
  aggregate: "sha256(JSON.stringify(entries))",
  directories: "omitted",
  fileFields: ["path", "type", "mode", "size", "sha256"],
  hashAlgorithm: "sha256",
  nodeModules: "physical-non-symlink-directory-on-/Volumes/Starship",
  ordering: "depth-first-per-directory-JavaScript-localeCompare",
  scanStability:
    "O_NOFOLLOW-fd-and-directory-and-symlink-pre-post-two-identical-scans",
  symlinkFields: [
    "path",
    "type",
    "mode",
    "size",
    "target",
    "resolvedRelative",
    "insideRoot",
    "broken",
    "sha256",
  ],
  symlinks: "strict-descendant-internal-unbroken-and-no-root-alias",
  unsupportedEntryTypes: "reject",
});

const STARSHIP_ROOT = "/Volumes/Starship";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const MODE_PATTERN = /^[0-7]{3}$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;
const IMPLEMENTATION_SOURCE_PATH = fileURLToPath(import.meta.url);

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

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

const IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD = sha256File(
  IMPLEMENTATION_SOURCE_PATH,
);
export const HK_VISUALIZATION_DEPENDENCY_CLOSURE_IMPLEMENTATION_SOURCE_SHA256 =
  IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD;

function exactKeys(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expectedKeys].sort())
  );
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatMode(mode) {
  return (mode & 0o777).toString(8).padStart(3, "0");
}

function stableStatIdentity(metadata) {
  return {
    birthtimeNs: String(metadata.birthtimeNs),
    ctimeNs: String(metadata.ctimeNs),
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    mode: String(metadata.mode),
    mtimeNs: String(metadata.mtimeNs),
    nlink: String(metadata.nlink),
    size: String(metadata.size),
  };
}

function callScanHook(scanHooks, hookName, payload) {
  const hook = scanHooks?.[hookName];
  if (hook !== undefined) {
    if (typeof hook !== "function") fail("dependency-scan-hook-invalid");
    hook(deepFreeze({ ...payload }));
  }
}

function readStableHkVisualizationDependencyFile(
  absolutePath,
  { relativePath, scanHooks = null } = {},
) {
  let descriptor;
  callScanHook(scanHooks, "beforeRegularFileOpen", {
    absolutePath,
    relativePath,
  });
  try {
    descriptor = openSync(
      absolutePath,
      fsConstants.O_RDONLY |
        (typeof fsConstants.O_NOFOLLOW === "number"
          ? fsConstants.O_NOFOLLOW
          : 0),
    );
  } catch {
    fail("dependency-regular-file-open-failed", relativePath);
  }
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) {
      fail("dependency-regular-file-open-failed", relativePath);
    }
    const bytes = readFileSync(descriptor);
    callScanHook(scanHooks, "afterRegularFileRead", {
      absolutePath,
      relativePath,
    });
    const after = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(absolutePath, { bigint: true });
    if (
      !sameJson(stableStatIdentity(before), stableStatIdentity(after)) ||
      !sameJson(stableStatIdentity(after), stableStatIdentity(pathAfter)) ||
      bytes.length !== Number(after.size)
    ) {
      fail("dependency-regular-file-changed-during-scan", relativePath);
    }
    return {
      path: relativePath,
      type: "file",
      mode: formatMode(Number(after.mode)),
      size: bytes.length,
      sha256: sha256(bytes),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("dependency-regular-file-changed-during-scan")
    ) {
      throw error;
    }
    fail("dependency-regular-file-changed-during-scan", relativePath);
  } finally {
    closeSync(descriptor);
  }
}

function isBelow(root, candidate) {
  return candidate !== root && candidate.startsWith(`${root}${sep}`);
}

function isAtOrBelow(root, candidate) {
  return candidate === root || isBelow(root, candidate);
}

function pathFingerprint(value) {
  const bytes = Buffer.from(String(value));
  return deepFreeze({ length: bytes.length, sha256: sha256(bytes) });
}

function safeVersionReceiptValue(value) {
  if (
    typeof value === "string" &&
    /^[0-9A-Za-z.+^~<>=|_-]{1,64}$/.test(value)
  ) {
    return value;
  }
  return pathFingerprint(value ?? "");
}

function safeVersionsReceipt(versions) {
  return {
    expected: safeVersionReceiptValue(versions?.expected),
    installed: safeVersionReceiptValue(versions?.installed),
    lockInstalled: safeVersionReceiptValue(versions?.lockInstalled),
    lockRoot: safeVersionReceiptValue(versions?.lockRoot),
    required: safeVersionReceiptValue(versions?.required),
  };
}

function fail(reason, relativePath = "") {
  const suffix = relativePath ? `; path=${relativePath}` : "";
  throw new Error(`${reason}${suffix}`);
}

function safeAbsolutePhysicalDirectory(
  label,
  input,
  { allowStarshipRoot = false } = {},
) {
  const locationAllowed =
    typeof input === "string" &&
    (allowStarshipRoot
      ? isAtOrBelow(STARSHIP_ROOT, input)
      : isBelow(STARSHIP_ROOT, input));
  if (
    typeof input !== "string" ||
    !isAbsolute(input) ||
    normalize(input) !== input ||
    resolve(input) !== input ||
    !locationAllowed
  ) {
    fail(`${label}-must-be-physical-Starship-directory`);
  }
  let metadata;
  let physical;
  try {
    metadata = lstatSync(input, { bigint: true });
    physical = realpathSync.native(input);
  } catch {
    fail(`${label}-must-be-physical-Starship-directory`);
  }
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    physical !== input
  ) {
    fail(`${label}-must-be-physical-Starship-directory`);
  }
  return { metadata, path: input };
}

function identityFor(directory) {
  const metadata = lstatSync(directory, { bigint: true });
  return {
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    realpath: realpathSync.native(directory),
  };
}

function identityFromPhysicalDirectoryCapture(capture) {
  return {
    dev: String(capture.metadata.dev),
    ino: String(capture.metadata.ino),
    realpath: capture.path,
  };
}

function assertPhysicalDirectoryCaptureUnchanged(label, capture, currentIdentity) {
  if (!sameJson(identityFromPhysicalDirectoryCapture(capture), currentIdentity)) {
    fail(`${label}-changed-during-capture`);
  }
}

function currentLocale() {
  return new Intl.Collator().resolvedOptions().locale;
}

function captureReferenceVerification(
  frozenReferencePath,
  frozenReferenceSha256,
) {
  if (frozenReferencePath === null) {
    return {
      observedSha256: null,
      pathFingerprint: null,
      status: "provenance-only",
    };
  }
  if (
    typeof frozenReferencePath !== "string" ||
    !isAbsolute(frozenReferencePath) ||
    normalize(frozenReferencePath) !== frozenReferencePath ||
    resolve(frozenReferencePath) !== frozenReferencePath ||
    !isBelow(STARSHIP_ROOT, frozenReferencePath) ||
    !HASH_PATTERN.test(frozenReferenceSha256)
  ) {
    fail("frozen-reference-must-be-physical-Starship-file");
  }
  let metadata;
  let physical;
  let observedSha256;
  try {
    metadata = lstatSync(frozenReferencePath);
    physical = realpathSync.native(frozenReferencePath);
    observedSha256 = sha256File(frozenReferencePath);
  } catch {
    fail("frozen-reference-must-be-physical-Starship-file");
  }
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    physical !== frozenReferencePath
  ) {
    fail("frozen-reference-must-be-physical-Starship-file");
  }
  if (observedSha256 !== frozenReferenceSha256) {
    fail("dependency-frozen-reference-sha-mismatch");
  }
  return {
    observedSha256,
    pathFingerprint: pathFingerprint(frozenReferencePath),
    status: "verified",
  };
}

function captureAlgorithmBinding({
  frozenReferencePath = null,
  frozenReferenceSha256 =
    HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
} = {}) {
  const liveSourceSha256 = sha256File(IMPLEMENTATION_SOURCE_PATH);
  if (liveSourceSha256 !== IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD) {
    fail("dependency-algorithm-source-drift-during-process");
  }
  return {
    frozenReferenceSha256,
    implementationSourceSha256: IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD,
    locale: currentLocale(),
    nodeVersion: process.version,
    referenceVerification: captureReferenceVerification(
      frozenReferencePath,
      frozenReferenceSha256,
    ),
  };
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(`dependency-${label}-unreadable`);
  }
}

function captureNextVersions(workspace) {
  const packageJson = readJson(join(workspace, "package.json"), "package-json");
  const packageLock = readJson(
    join(workspace, "package-lock.json"),
    "package-lock",
  );
  const installed = readJson(
    join(workspace, "node_modules", "next", "package.json"),
    "installed-next-package",
  ).version;
  const required =
    packageJson.dependencies?.next ?? packageJson.devDependencies?.next ?? null;
  const lockRoot =
    packageLock.packages?.[""]?.dependencies?.next ??
    packageLock.packages?.[""]?.devDependencies?.next ??
    null;
  const lockInstalled =
    packageLock.packages?.["node_modules/next"]?.version ?? null;
  return {
    expected: HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE.versions.expected,
    installed,
    lockInstalled,
    lockRoot,
    required,
  };
}

function stableDirectoryIdentity(directory) {
  const metadata = lstatSync(directory, { bigint: true });
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail("dependency-directory-changed-during-scan");
  }
  return stableStatIdentity(metadata);
}

function scanDependencyTree(
  nodeModulesRoot,
  { scanHooks = null, scanIndex = 0 } = {},
) {
  const directories = [];
  const entries = [];

  function visit(absoluteDirectory, relativeDirectory) {
    let beforeIdentity;
    let children;
    try {
      beforeIdentity = stableDirectoryIdentity(absoluteDirectory);
      children = readdirSync(absoluteDirectory, { withFileTypes: true }).sort(
        (left, right) => left.name.localeCompare(right.name),
      );
    } catch {
      fail("dependency-directory-unreadable", relativeDirectory || ".");
    }
    callScanHook(scanHooks, "afterDirectoryChildrenRead", {
      absoluteDirectory,
      relativeDirectory,
      scanIndex,
    });

    for (const child of children) {
      const absolutePath = join(absoluteDirectory, child.name);
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${child.name}`
        : child.name;
      let metadata;
      try {
        metadata = lstatSync(absolutePath);
      } catch {
        fail("dependency-entry-unreadable", relativePath);
      }
      const mode = formatMode(metadata.mode);

      if (metadata.isSymbolicLink()) {
        const beforeIdentity = stableStatIdentity(
          lstatSync(absolutePath, { bigint: true }),
        );
        let target;
        try {
          target = readlinkSync(absolutePath);
        } catch {
          fail("dependency-symlink-unreadable", relativePath);
        }
        let resolved = null;
        let broken = false;
        try {
          resolved = realpathSync.native(absolutePath);
        } catch {
          broken = true;
        }
        const resolvedRelative = resolved
          ? relative(nodeModulesRoot, resolved)
          : null;
        const insideRoot = Boolean(
          resolvedRelative !== null &&
            !resolvedRelative.startsWith("..") &&
            !isAbsolute(resolvedRelative),
        );
        callScanHook(scanHooks, "afterSymlinkRead", {
          absolutePath,
          relativePath,
          scanIndex,
        });
        let targetAfter;
        let resolvedAfter = null;
        let brokenAfter = false;
        let afterIdentity;
        try {
          targetAfter = readlinkSync(absolutePath);
          afterIdentity = stableStatIdentity(
            lstatSync(absolutePath, { bigint: true }),
          );
        } catch {
          fail("dependency-symlink-changed-during-scan", relativePath);
        }
        try {
          resolvedAfter = realpathSync.native(absolutePath);
        } catch {
          brokenAfter = true;
        }
        if (
          targetAfter !== target ||
          resolvedAfter !== resolved ||
          brokenAfter !== broken ||
          !sameJson(beforeIdentity, afterIdentity)
        ) {
          fail("dependency-symlink-changed-during-scan", relativePath);
        }
        entries.push({
          path: relativePath,
          type: "symlink",
          mode,
          size: Buffer.byteLength(target),
          target,
          resolvedRelative,
          insideRoot,
          broken,
          sha256: sha256(target),
        });
      } else if (metadata.isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (metadata.isFile()) {
        entries.push(
          readStableHkVisualizationDependencyFile(absolutePath, {
            relativePath,
            scanHooks,
          }),
        );
      } else {
        fail("unsupported-dependency-entry-type", relativePath);
      }
    }
    let childrenAfter;
    let afterIdentity;
    try {
      childrenAfter = readdirSync(absoluteDirectory, { withFileTypes: true })
        .map(({ name }) => name)
        .sort((left, right) => left.localeCompare(right));
      afterIdentity = stableDirectoryIdentity(absoluteDirectory);
    } catch {
      fail("dependency-directory-changed-during-scan", relativeDirectory || ".");
    }
    if (
      !sameJson(
        children.map(({ name }) => name),
        childrenAfter,
      ) ||
      !sameJson(beforeIdentity, afterIdentity)
    ) {
      fail("dependency-directory-changed-during-scan", relativeDirectory || ".");
    }
    directories.push({
      children: childrenAfter,
      identity: afterIdentity,
      path: relativeDirectory || ".",
    });
  }

  visit(nodeModulesRoot, "");
  return { directories, entries };
}

function assertCapturedSymlinks(entries) {
  for (const entry of entries) {
    if (entry.type !== "symlink") continue;
    if (entry.broken) fail("dependency-symlink-broken", entry.path);
    if (!entry.insideRoot) fail("dependency-symlink-escape", entry.path);
    if (entry.resolvedRelative === "") {
      fail("dependency-symlink-root-alias", entry.path);
    }
  }
}

function manifestPayload(manifest) {
  return {
    algorithm: manifest.algorithm,
    aggregateSha256: manifest.aggregateSha256,
    entries: manifest.entries,
    entryCount: manifest.entryCount,
    fileCount: manifest.fileCount,
    nodeModulesIdentity: manifest.nodeModulesIdentity,
    nodeModulesPhysical: manifest.nodeModulesPhysical,
    policy: manifest.policy,
    schemaVersion: manifest.schemaVersion,
    starshipIdentity: manifest.starshipIdentity,
    symlinkCount: manifest.symlinkCount,
    versions: manifest.versions,
    workspaceIdentity: manifest.workspaceIdentity,
  };
}

function structuralEntryIssues(entries) {
  const issues = [];
  if (!Array.isArray(entries)) return ["entries-invalid"];
  const paths = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push("entry-invalid");
      continue;
    }
    if (
      typeof entry.path !== "string" ||
      entry.path === "" ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      issues.push("entry-path-invalid");
    }
    if (paths.has(entry.path)) issues.push("entry-path-duplicate");
    paths.add(entry.path);
    if (!MODE_PATTERN.test(entry.mode ?? "")) issues.push("entry-mode-invalid");
    if (!HASH_PATTERN.test(entry.sha256 ?? "")) issues.push("entry-hash-invalid");

    if (entry.type === "file") {
      if (!exactKeys(entry, ["path", "type", "mode", "size", "sha256"])) {
        issues.push("file-fields-invalid");
      }
      if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
        issues.push("file-size-invalid");
      }
    } else if (entry.type === "symlink") {
      if (
        !exactKeys(entry, [
          "path",
          "type",
          "mode",
          "size",
          "target",
          "resolvedRelative",
          "insideRoot",
          "broken",
          "sha256",
        ])
      ) {
        issues.push("symlink-fields-invalid");
      }
      if (typeof entry.target !== "string") issues.push("symlink-target-invalid");
      if (
        typeof entry.target === "string" &&
        entry.size !== Buffer.byteLength(entry.target)
      ) {
        issues.push("symlink-size-invalid");
      }
      if (
        typeof entry.target === "string" &&
        entry.sha256 !== sha256(entry.target)
      ) {
        issues.push("symlink-hash-invalid");
      }
      if (entry.broken !== false) issues.push("symlink-broken");
      if (entry.insideRoot !== true) issues.push("symlink-escape");
      if (entry.resolvedRelative === "") issues.push("symlink-root-alias");
      if (
        typeof entry.resolvedRelative !== "string" ||
        entry.resolvedRelative.startsWith("..") ||
        isAbsolute(entry.resolvedRelative)
      ) {
        issues.push("symlink-resolution-invalid");
      }
    } else {
      issues.push("entry-type-invalid");
    }
  }
  return [...new Set(issues)];
}

function identityIssues(identity, label, { live = false } = {}) {
  const issues = [];
  if (!exactKeys(identity, ["dev", "ino", "realpath"])) {
    return [`${label}-identity-invalid`];
  }
  if (!POSITIVE_INTEGER_PATTERN.test(identity.dev ?? "")) {
    issues.push(`${label}-device-invalid`);
  }
  if (!POSITIVE_INTEGER_PATTERN.test(identity.ino ?? "")) {
    issues.push(`${label}-inode-invalid`);
  }
  const realpathIsOnStarship =
    typeof identity.realpath === "string" &&
    (label === "starship"
      ? isAtOrBelow(STARSHIP_ROOT, identity.realpath)
      : isBelow(STARSHIP_ROOT, identity.realpath));
  if (
    typeof identity.realpath !== "string" ||
    !realpathIsOnStarship ||
    !isAbsolute(identity.realpath)
  ) {
    issues.push(`${label}-realpath-invalid`);
  }
  if (live && issues.length === 0) {
    try {
      const metadata = lstatSync(identity.realpath, { bigint: true });
      if (
        !metadata.isDirectory() ||
        metadata.isSymbolicLink() ||
        realpathSync.native(identity.realpath) !== identity.realpath ||
        String(metadata.dev) !== identity.dev ||
        String(metadata.ino) !== identity.ino
      ) {
        issues.push(`${label}-live-identity-drift`);
      }
    } catch {
      issues.push(`${label}-live-identity-drift`);
    }
  }
  return issues;
}

function algorithmIssues(
  algorithm,
  { expectedImplementationSourceSha256 = null, live = true } = {},
) {
  const issues = [];
  if (
    !exactKeys(algorithm, [
      "frozenReferenceSha256",
      "implementationSourceSha256",
      "locale",
      "nodeVersion",
      "referenceVerification",
    ])
  ) {
    return ["algorithm-binding-invalid"];
  }
  if (
    algorithm.frozenReferenceSha256 !==
    HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256
  ) {
    issues.push("frozen-reference-sha-drift");
  }
  if (
    !exactKeys(algorithm.referenceVerification, [
      "observedSha256",
      "pathFingerprint",
      "status",
    ])
  ) {
    issues.push("reference-verification-invalid");
  } else if (algorithm.referenceVerification.status === "provenance-only") {
    if (
      algorithm.referenceVerification.observedSha256 !== null ||
      algorithm.referenceVerification.pathFingerprint !== null
    ) {
      issues.push("reference-verification-invalid");
    }
  } else if (algorithm.referenceVerification.status === "verified") {
    if (
      algorithm.referenceVerification.observedSha256 !==
        algorithm.frozenReferenceSha256 ||
      !exactKeys(algorithm.referenceVerification.pathFingerprint, [
        "length",
        "sha256",
      ]) ||
      !Number.isSafeInteger(
        algorithm.referenceVerification.pathFingerprint?.length,
      ) ||
      algorithm.referenceVerification.pathFingerprint.length < 1 ||
      !HASH_PATTERN.test(
        algorithm.referenceVerification.pathFingerprint?.sha256 ?? "",
      )
    ) {
      issues.push("reference-verification-invalid");
    }
  } else {
    issues.push("reference-verification-invalid");
  }
  if (!HASH_PATTERN.test(algorithm.implementationSourceSha256 ?? "")) {
    issues.push("implementation-source-sha-invalid");
  }
  if (
    expectedImplementationSourceSha256 !== null &&
    (!HASH_PATTERN.test(expectedImplementationSourceSha256) ||
      algorithm.implementationSourceSha256 !== expectedImplementationSourceSha256)
  ) {
    issues.push("implementation-source-sha-mismatch");
  }
  if (typeof algorithm.nodeVersion !== "string" || !algorithm.nodeVersion) {
    issues.push("node-version-invalid");
  }
  if (typeof algorithm.locale !== "string" || !algorithm.locale) {
    issues.push("locale-invalid");
  }
  if (live) {
    if (
      algorithm.implementationSourceSha256 !==
        IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD ||
      sha256File(IMPLEMENTATION_SOURCE_PATH) !==
        IMPLEMENTATION_SOURCE_SHA256_AT_MODULE_LOAD
    ) {
      issues.push("implementation-source-sha-drift");
    }
    if (algorithm.nodeVersion !== process.version) issues.push("node-version-drift");
    if (algorithm.locale !== currentLocale()) issues.push("locale-drift");
  }
  return issues;
}

function versionIssues(versions, expectedVersions) {
  const issues = [];
  if (
    !exactKeys(versions, [
      "expected",
      "installed",
      "lockInstalled",
      "lockRoot",
      "required",
    ])
  ) {
    return ["versions-invalid"];
  }
  for (const key of [
    "expected",
    "required",
    "lockRoot",
    "lockInstalled",
    "installed",
  ]) {
    if (versions[key] !== expectedVersions[key]) {
      issues.push(`next-${key}-version-mismatch`);
    }
  }
  return issues;
}

export function captureHkVisualizationDependencyClosure({
  frozenReferencePath = null,
  frozenReferenceSha256 =
    HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
  scanHooks = null,
  workspace,
} = {}) {
  const workspaceCapture = safeAbsolutePhysicalDirectory("workspace", workspace);
  const nodeModulesRoot = join(workspaceCapture.path, "node_modules");
  const nodeModulesCapture = safeAbsolutePhysicalDirectory(
    "node-modules",
    nodeModulesRoot,
  );
  const starshipCapture = safeAbsolutePhysicalDirectory(
    "starship-root",
    STARSHIP_ROOT,
    { allowStarshipRoot: true },
  );
  if (nodeModulesCapture.metadata.dev !== starshipCapture.metadata.dev) {
    fail("node-modules-device-is-not-Starship");
  }

  const algorithm = captureAlgorithmBinding({
    frozenReferencePath,
    frozenReferenceSha256,
  });
  const versions = captureNextVersions(workspaceCapture.path);
  const firstScan = scanDependencyTree(nodeModulesCapture.path, {
    scanHooks,
    scanIndex: 0,
  });
  callScanHook(scanHooks, "afterScan", { ...firstScan, scanIndex: 0 });
  const secondScan = scanDependencyTree(nodeModulesCapture.path, {
    scanHooks,
    scanIndex: 1,
  });
  callScanHook(scanHooks, "afterScan", {
    ...secondScan,
    scanIndex: 1,
  });
  if (!sameJson(firstScan, secondScan)) {
    fail("dependency-tree-changed-between-consecutive-scans");
  }
  const entries = firstScan.entries;
  assertCapturedSymlinks(entries);
  const nodeModulesIdentity = identityFor(nodeModulesCapture.path);
  const starshipIdentity = identityFor(starshipCapture.path);
  const workspaceIdentity = identityFor(workspaceCapture.path);
  assertPhysicalDirectoryCaptureUnchanged(
    "node-modules",
    nodeModulesCapture,
    nodeModulesIdentity,
  );
  assertPhysicalDirectoryCaptureUnchanged(
    "starship-root",
    starshipCapture,
    starshipIdentity,
  );
  assertPhysicalDirectoryCaptureUnchanged(
    "workspace",
    workspaceCapture,
    workspaceIdentity,
  );
  const aggregateSha256 = sha256(JSON.stringify(entries));
  const manifest = {
    algorithm,
    aggregateSha256,
    entries,
    entryCount: entries.length,
    fileCount: entries.filter(({ type }) => type === "file").length,
    nodeModulesIdentity,
    nodeModulesPhysical: true,
    policy: HK_VISUALIZATION_DEPENDENCY_CLOSURE_POLICY,
    schemaVersion: HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA,
    starshipIdentity,
    symlinkCount: entries.filter(({ type }) => type === "symlink").length,
    versions,
    workspaceIdentity,
  };
  manifest.receiptAggregateSha256 = sha256(JSON.stringify(manifestPayload(manifest)));
  return deepFreeze(manifest);
}

export function validateHkVisualizationDependencyClosure(
  manifest,
  {
    canonical = true,
    expected = HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
    expectedImplementationSourceSha256 = null,
    live = true,
  } = {},
) {
  const issues = [];
  if (
    !exactKeys(manifest, [
      "algorithm",
      "aggregateSha256",
      "entries",
      "entryCount",
      "fileCount",
      "nodeModulesIdentity",
      "nodeModulesPhysical",
      "policy",
      "receiptAggregateSha256",
      "schemaVersion",
      "starshipIdentity",
      "symlinkCount",
      "versions",
      "workspaceIdentity",
    ])
  ) {
    return deepFreeze(["manifest-fields-invalid"]);
  }
  if (manifest.schemaVersion !== HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA) {
    issues.push("schema-version-invalid");
  }
  if (!sameJson(manifest.policy, HK_VISUALIZATION_DEPENDENCY_CLOSURE_POLICY)) {
    issues.push("policy-invalid");
  }
  if (canonical && expectedImplementationSourceSha256 === null) {
    issues.push("expected-implementation-source-sha-required");
  }
  issues.push(
    ...algorithmIssues(manifest.algorithm, {
      expectedImplementationSourceSha256,
      live,
    }),
  );
  issues.push(...identityIssues(manifest.workspaceIdentity, "workspace", { live }));
  issues.push(...identityIssues(manifest.starshipIdentity, "starship", { live }));
  issues.push(
    ...identityIssues(manifest.nodeModulesIdentity, "node-modules", { live }),
  );
  if (manifest.nodeModulesPhysical !== true) {
    issues.push("node-modules-not-physical");
  }
  if (
    manifest.nodeModulesIdentity?.dev !== manifest.starshipIdentity?.dev
  ) {
    issues.push("node-modules-device-is-not-Starship");
  }
  issues.push(...structuralEntryIssues(manifest.entries));
  if (
    !Number.isSafeInteger(manifest.entryCount) ||
    manifest.entryCount !== manifest.entries.length
  ) {
    issues.push("entry-count-invalid");
  }
  const actualFileCount = manifest.entries.filter(
    ({ type }) => type === "file",
  ).length;
  const actualSymlinkCount = manifest.entries.filter(
    ({ type }) => type === "symlink",
  ).length;
  if (manifest.fileCount !== actualFileCount) issues.push("file-count-invalid");
  if (manifest.symlinkCount !== actualSymlinkCount) {
    issues.push("symlink-count-invalid");
  }
  if (
    !HASH_PATTERN.test(manifest.aggregateSha256 ?? "") ||
    manifest.aggregateSha256 !== sha256(JSON.stringify(manifest.entries))
  ) {
    issues.push("dependency-aggregate-invalid");
  }
  if (
    !HASH_PATTERN.test(manifest.receiptAggregateSha256 ?? "") ||
    manifest.receiptAggregateSha256 !==
      sha256(JSON.stringify(manifestPayload(manifest)))
  ) {
    issues.push("receipt-aggregate-invalid");
  }

  if (canonical) {
    if (manifest.entryCount !== expected.entryCount) {
      issues.push("canonical-entry-count-mismatch");
    }
    if (manifest.fileCount !== expected.fileCount) {
      issues.push("canonical-file-count-mismatch");
    }
    if (manifest.symlinkCount !== expected.symlinkCount) {
      issues.push("canonical-symlink-count-mismatch");
    }
    if (manifest.aggregateSha256 !== expected.aggregateSha256) {
      issues.push("canonical-aggregate-mismatch");
    }
    issues.push(...versionIssues(manifest.versions, expected.versions));
  } else if (
    !exactKeys(manifest.versions, [
      "expected",
      "installed",
      "lockInstalled",
      "lockRoot",
      "required",
    ])
  ) {
    issues.push("versions-invalid");
  }
  return deepFreeze([...new Set(issues)]);
}

export function assertHkVisualizationDependencyClosure(manifest, options = {}) {
  const issues = validateHkVisualizationDependencyClosure(manifest, options);
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization dependency closure is invalid: ${issues.join(",")}`,
    );
  }
  return buildHkVisualizationDependencyClosureSummaryReceipt(manifest, options);
}

export function compareHkVisualizationDependencyClosures(before, after) {
  const beforeIssues = validateHkVisualizationDependencyClosure(before, {
    canonical: false,
    live: false,
  });
  const afterIssues = validateHkVisualizationDependencyClosure(after, {
    canonical: false,
    live: false,
  });
  if (beforeIssues.length > 0 || afterIssues.length > 0) {
    throw new Error(
      `Cannot compare invalid dependency receipts: before=${beforeIssues.join(",")}; after=${afterIssues.join(",")}`,
    );
  }
  const issues = [];
  if (!sameJson(before.algorithm, after.algorithm)) issues.push("algorithm-drift");
  if (!sameJson(before.workspaceIdentity, after.workspaceIdentity)) {
    issues.push("workspace-identity-drift");
  }
  if (!sameJson(before.nodeModulesIdentity, after.nodeModulesIdentity)) {
    issues.push("node-modules-identity-drift");
  }
  if (!sameJson(before.starshipIdentity, after.starshipIdentity)) {
    issues.push("starship-identity-drift");
  }
  if (!sameJson(before.versions, after.versions)) issues.push("versions-drift");
  if (before.entryCount !== after.entryCount) issues.push("entry-count-drift");
  if (before.fileCount !== after.fileCount) issues.push("file-count-drift");
  if (before.symlinkCount !== after.symlinkCount) {
    issues.push("symlink-count-drift");
  }
  if (before.aggregateSha256 !== after.aggregateSha256) {
    issues.push("dependency-aggregate-drift");
  }
  if (before.receiptAggregateSha256 !== after.receiptAggregateSha256) {
    issues.push("receipt-aggregate-drift");
  }
  return deepFreeze({ equal: issues.length === 0, issues });
}

export function assertHkVisualizationDependencyClosureUnchanged(before, after) {
  const comparison = compareHkVisualizationDependencyClosures(before, after);
  if (!comparison.equal) {
    throw new Error(
      `HK Visualization dependency closure changed: ${comparison.issues.join(",")}`,
    );
  }
  return comparison;
}

function fullManifestArtifactDescriptor(artifactBytes, artifactPath) {
  if (
    typeof artifactPath !== "string" ||
    !isAbsolute(artifactPath) ||
    normalize(artifactPath) !== artifactPath ||
    resolve(artifactPath) !== artifactPath ||
    !isBelow(STARSHIP_ROOT, artifactPath)
  ) {
    fail("dependency-full-manifest-artifact-path-invalid");
  }
  return deepFreeze({
    pathFingerprint: pathFingerprint(artifactPath),
    schemaVersion: HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA,
    sha256: sha256(artifactBytes),
    size: artifactBytes.length,
  });
}

export function serializeHkVisualizationDependencyClosureManifest(
  manifest,
  options = {},
) {
  const issues = validateHkVisualizationDependencyClosure(manifest, options);
  if (issues.length > 0) {
    throw new Error(
      `Cannot serialize invalid HK Visualization dependency closure: ${issues.join(",")}`,
    );
  }
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
}

export function validateHkVisualizationDependencyClosureManifestArtifact(
  artifactBytes,
  { artifactPath, ...validationOptions } = {},
) {
  if (!Buffer.isBuffer(artifactBytes)) {
    fail("dependency-full-manifest-artifact-bytes-invalid");
  }
  let manifest;
  try {
    manifest = JSON.parse(artifactBytes.toString("utf8"));
  } catch {
    fail("dependency-full-manifest-artifact-json-invalid");
  }
  const issues = validateHkVisualizationDependencyClosure(
    manifest,
    validationOptions,
  );
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization dependency full-manifest artifact is invalid: ${issues.join(",")}`,
    );
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  if (!artifactBytes.equals(canonicalBytes)) {
    fail("dependency-full-manifest-artifact-noncanonical");
  }
  return deepFreeze({
    descriptor: fullManifestArtifactDescriptor(artifactBytes, artifactPath),
    manifest: deepFreeze(manifest),
  });
}

function fingerprintIsValid(value) {
  return (
    exactKeys(value, ["length", "sha256"]) &&
    Number.isSafeInteger(value.length) &&
    value.length > 0 &&
    HASH_PATTERN.test(value.sha256 ?? "")
  );
}

function fullManifestDescriptorIsValid(value) {
  return (
    exactKeys(value, ["pathFingerprint", "schemaVersion", "sha256", "size"]) &&
    fingerprintIsValid(value.pathFingerprint) &&
    value.schemaVersion ===
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA &&
    HASH_PATTERN.test(value.sha256 ?? "") &&
    Number.isSafeInteger(value.size) &&
    value.size > 0
  );
}

function validateFullManifestEvidence(
  fullManifestArtifact,
  validationOptions,
) {
  const issues = [];
  if (
    !exactKeys(fullManifestArtifact, ["descriptor", "manifest"]) ||
    !fullManifestDescriptorIsValid(fullManifestArtifact?.descriptor)
  ) {
    return ["full-manifest-artifact-invalid"];
  }
  const manifestIssues = validateHkVisualizationDependencyClosure(
    fullManifestArtifact.manifest,
    validationOptions,
  );
  if (manifestIssues.length > 0) {
    issues.push("full-manifest-manifest-invalid");
  } else {
    const canonicalBytes = Buffer.from(
      `${JSON.stringify(fullManifestArtifact.manifest, null, 2)}\n`,
    );
    if (
      fullManifestArtifact.descriptor.size !== canonicalBytes.length ||
      fullManifestArtifact.descriptor.sha256 !== sha256(canonicalBytes)
    ) {
      issues.push("full-manifest-artifact-invalid");
    }
  }
  return issues;
}

export function validateHkVisualizationDependencyClosureSummaryReceipt(
  summary,
  {
    fullManifestArtifact = null,
    ...validationOptions
  } = {},
) {
  const issues = [];
  const summaryKeys = [
    "algorithm",
    "aggregateSha256",
    "dependencySchemaVersion",
    "entryCount",
    "fileCount",
    "fullManifestArtifact",
    "issues",
    "nodeModulesPhysical",
    "nodeModulesRootFingerprint",
    "receiptAggregateSha256",
    "schemaVersion",
    "status",
    "summaryAggregateSha256",
    "symlinkCount",
    "versions",
    "workspaceRootFingerprint",
  ];
  if (!exactKeys(summary, summaryKeys)) {
    return deepFreeze(["summary-fields-invalid"]);
  }
  if (summary.schemaVersion !== HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA) {
    issues.push("summary-schema-version-invalid");
  }
  if (
    !Number.isSafeInteger(summary.entryCount) ||
    summary.entryCount < 0 ||
    !Number.isSafeInteger(summary.fileCount) ||
    summary.fileCount < 0 ||
    !Number.isSafeInteger(summary.symlinkCount) ||
    summary.symlinkCount < 0 ||
    summary.entryCount !== summary.fileCount + summary.symlinkCount
  ) {
    issues.push("summary-entry-count-invalid");
  }
  if (!fingerprintIsValid(summary.nodeModulesRootFingerprint)) {
    issues.push("summary-node-modules-root-fingerprint-invalid");
  }
  if (!fingerprintIsValid(summary.workspaceRootFingerprint)) {
    issues.push("summary-workspace-root-fingerprint-invalid");
  }
  if (!fullManifestDescriptorIsValid(summary.fullManifestArtifact)) {
    issues.push("summary-full-manifest-artifact-invalid");
  }
  if (!Array.isArray(summary.issues) || summary.issues.length !== 0) {
    issues.push("summary-issues-invalid");
  }
  if (summary.status !== "PASS") issues.push("summary-status-invalid");
  if (summary.nodeModulesPhysical !== true) {
    issues.push("summary-node-modules-not-physical");
  }
  for (const hashField of [
    "aggregateSha256",
    "receiptAggregateSha256",
    "summaryAggregateSha256",
  ]) {
    if (!HASH_PATTERN.test(summary[hashField] ?? "")) {
      issues.push(`summary-${hashField}-invalid`);
    }
  }

  if (fullManifestArtifact === null) {
    issues.push("expected-full-manifest-artifact-required");
  } else {
    const evidenceIssues = validateFullManifestEvidence(
      fullManifestArtifact,
      validationOptions,
    );
    issues.push(...evidenceIssues);
    if (evidenceIssues.length === 0) {
      const manifest = fullManifestArtifact.manifest;
      if (!sameJson(summary.algorithm, manifest.algorithm)) {
        issues.push("summary-algorithm-drift");
      }
      if (summary.aggregateSha256 !== manifest.aggregateSha256) {
        issues.push("summary-dependency-aggregate-drift");
      }
      if (summary.dependencySchemaVersion !== manifest.schemaVersion) {
        issues.push("summary-dependency-schema-drift");
      }
      if (
        summary.entryCount !== manifest.entryCount ||
        summary.fileCount !== manifest.fileCount ||
        summary.symlinkCount !== manifest.symlinkCount
      ) {
        issues.push("summary-entry-count-invalid");
      }
      if (
        !sameJson(
          summary.fullManifestArtifact,
          fullManifestArtifact.descriptor,
        )
      ) {
        issues.push("summary-full-manifest-artifact-drift");
      }
      if (
        !sameJson(
          summary.nodeModulesRootFingerprint,
          pathFingerprint(manifest.nodeModulesIdentity.realpath),
        )
      ) {
        issues.push("summary-node-modules-root-fingerprint-drift");
      }
      if (summary.receiptAggregateSha256 !== manifest.receiptAggregateSha256) {
        issues.push("summary-receipt-aggregate-drift");
      }
      if (!sameJson(summary.versions, safeVersionsReceipt(manifest.versions))) {
        issues.push("summary-versions-drift");
      }
      if (
        !sameJson(
          summary.workspaceRootFingerprint,
          pathFingerprint(manifest.workspaceIdentity.realpath),
        )
      ) {
        issues.push("summary-workspace-root-fingerprint-drift");
      }
    }
  }

  const payload = { ...summary };
  delete payload.summaryAggregateSha256;
  if (summary.summaryAggregateSha256 !== sha256(JSON.stringify(payload))) {
    issues.push("summary-aggregate-invalid");
  }
  return deepFreeze([...new Set(issues)]);
}

export function buildHkVisualizationDependencyClosureSummaryReceipt(
  manifest,
  { fullManifestArtifact = null, ...validationOptions } = {},
) {
  const issues = validateHkVisualizationDependencyClosure(
    manifest,
    validationOptions,
  );
  if (issues.length > 0) {
    throw new Error(
      `Cannot summarize invalid HK Visualization dependency closure: ${issues.join(",")}`,
    );
  }
  const evidenceIssues = validateFullManifestEvidence(
    fullManifestArtifact,
    validationOptions,
  );
  if (evidenceIssues.length > 0 || !sameJson(fullManifestArtifact.manifest, manifest)) {
    throw new Error(
      `Cannot summarize an unbound HK Visualization dependency closure artifact: ${evidenceIssues.join(",") || "manifest-drift"}`,
    );
  }
  const payload = {
    algorithm: manifest.algorithm,
    aggregateSha256: manifest.aggregateSha256,
    dependencySchemaVersion: manifest.schemaVersion,
    entryCount: manifest.entryCount,
    fileCount: manifest.fileCount,
    fullManifestArtifact: fullManifestArtifact.descriptor,
    issues: [],
    nodeModulesPhysical: manifest.nodeModulesPhysical,
    nodeModulesRootFingerprint: pathFingerprint(
      manifest.nodeModulesIdentity?.realpath ?? "",
    ),
    receiptAggregateSha256: manifest.receiptAggregateSha256,
    schemaVersion: HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA,
    status: "PASS",
    symlinkCount: manifest.symlinkCount,
    versions: safeVersionsReceipt(manifest.versions),
    workspaceRootFingerprint: pathFingerprint(
      manifest.workspaceIdentity?.realpath ?? "",
    ),
  };
  const summary = {
    ...payload,
    summaryAggregateSha256: sha256(JSON.stringify(payload)),
  };
  const summaryIssues =
    validateHkVisualizationDependencyClosureSummaryReceipt(summary, {
      ...validationOptions,
      fullManifestArtifact,
    });
  if (summaryIssues.length > 0) {
    throw new Error(
      `Built HK Visualization dependency summary is invalid: ${summaryIssues.join(",")}`,
    );
  }
  return deepFreeze(summary);
}

export function captureAndAssertHkVisualizationCanonicalDependencyClosure(
  {
    expected = HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
    expectedImplementationSourceSha256 = null,
    frozenReferencePath = null,
    frozenReferenceSha256 =
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
    fullManifestArtifactPath,
    live = true,
    workspace,
  } = {},
) {
  const manifest = captureHkVisualizationDependencyClosure({
    frozenReferencePath,
    frozenReferenceSha256,
    workspace,
  });
  const validationOptions = {
    expected,
    expectedImplementationSourceSha256,
    live,
  };
  const fullManifestArtifactBytes =
    serializeHkVisualizationDependencyClosureManifest(
      manifest,
      validationOptions,
    );
  const fullManifestArtifact =
    validateHkVisualizationDependencyClosureManifestArtifact(
      fullManifestArtifactBytes,
      {
        ...validationOptions,
        artifactPath: fullManifestArtifactPath,
      },
    );
  const summary = buildHkVisualizationDependencyClosureSummaryReceipt(manifest, {
    ...validationOptions,
    fullManifestArtifact,
  });
  return Object.freeze({
    fullManifestArtifact,
    fullManifestArtifactBytes,
    manifest,
    summary,
  });
}
