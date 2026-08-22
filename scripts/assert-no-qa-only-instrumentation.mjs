#!/usr/bin/env node

import {
  accessSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES,
  CALIFORNIA_COMPOSED_CANVAS_MARKER,
  CALIFORNIA_COMPOSED_CONTROL_MARKER,
  CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256,
  CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES,
  CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES,
  CALIFORNIA_SIGNATURE_SOURCE_ROOT,
  computeCaliforniaComposedSourceSha256
} from "./california-qa-only-instrumentation-contract.mjs";

export const CA_VIZ_COMPOSED_QA_BUILD_ENV = "CA_VIZ_COMPOSED_QA_BUILD";
export const CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER =
  ".ca-signature-qa-do-not-deploy.json";
export const CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER =
  ".california-canvas-graphics-runtime-NO-DEPLOY.json";
const CALIFORNIA_QA_ONLY_MARKER_BASENAMES = new Set([
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
]);
export const CALIFORNIA_SIGNATURE_CONTROL_SENTINEL =
  CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.controlNamespace;
export const CALIFORNIA_CANVAS_GRAPHICS_SENTINEL =
  CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.canvasHeader;
export const CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS = Object.freeze([
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_DEPLOYMENT_ID",
  "CI"
]);

const MAX_MARKER_BYTES = 64 * 1024;
const MODES = new Set(["release", "composed-qa-build"]);
const RESERVED_BUFFERS = Object.freeze(
  Object.entries(CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES).map(([family, value]) =>
    Object.freeze({ family, value, bytes: Buffer.from(value, "utf8") })
  )
);

function fail(message) {
  throw new Error(`California QA-only instrumentation guard: ${message}`);
}

function pathIsInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

function lstatEntry(target, label, { allowMissing = false } = {}) {
  try {
    return lstatSync(target, { bigint: true });
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return null;
    fail(`${label} is unreadable or has unknown state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertDirectoryReadable(stat, label) {
  if (!stat.isDirectory()) fail(`${label} must be a directory`);
  if ((stat.mode & 0o444n) === 0n || (stat.mode & 0o111n) === 0n) {
    fail(`${label} is unreadable`);
  }
}

function assertFileReadable(stat, label) {
  if ((stat.mode & 0o444n) === 0n) fail(`${label} is unreadable`);
}

function sameIdentity(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function assertExactRoot(root, label = "source root") {
  const resolved = path.resolve(root);
  const identity = lstatEntry(resolved, label);
  if (identity.isSymbolicLink()) fail(`${label} must not be a symlink: ${resolved}`);
  assertDirectoryReadable(identity, label);
  try {
    accessSync(resolved, fsConstants.R_OK | fsConstants.X_OK);
  } catch (error) {
    fail(`${label} is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  let canonical;
  try {
    canonical = realpathSync.native(resolved);
  } catch (error) {
    fail(`${label} cannot be resolved: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (canonical !== resolved) {
    fail(`${label} must not traverse a symlink: ${resolved} -> ${canonical}`);
  }
  return canonical;
}

function assertNoSymlinkSegments(root, target, label) {
  if (!pathIsInside(root, target)) fail(`${label} escapes its inspection root: ${target}`);
  const relative = path.relative(root, target);
  let cursor = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const identity = lstatEntry(cursor, label);
    if (identity.isSymbolicLink()) fail(`${label} must not traverse a symlink: ${cursor}`);
  }
}

function assertResolvedInside(root, target, label) {
  let canonical;
  try {
    canonical = realpathSync.native(target);
  } catch (error) {
    fail(`${label} cannot be resolved: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!pathIsInside(root, canonical)) {
    fail(`${label} resolves outside its inspection root: ${target} -> ${canonical}`);
  }
  return canonical;
}

function readExactRegularFile(root, target, label, { maxBytes } = {}) {
  assertNoSymlinkSegments(root, target, label);
  const before = lstatEntry(target, label);
  if (before.isSymbolicLink()) fail(`${label} must not be a symlink: ${target}`);
  if (!before.isFile()) fail(`${label} must be a regular file: ${target}`);
  if (before.nlink !== 1n) fail(`${label} must not be a hardlink: ${target}`);
  assertFileReadable(before, label);
  if (maxBytes !== undefined && before.size > BigInt(maxBytes)) {
    fail(`${label} exceeds the ${maxBytes}-byte safety limit`);
  }
  const canonical = assertResolvedInside(root, target, label);
  if (canonical !== target) fail(`${label} must have an exact non-aliased path: ${target}`);

  let descriptor;
  try {
    descriptor = openSync(
      target,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
    );
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameIdentity(before, opened)) {
      fail(`${label} identity changed before it could be read safely`);
    }
    const content = readFileSync(descriptor);
    const afterRead = fstatSync(descriptor, { bigint: true });
    const afterPath = lstatEntry(target, label);
    if (!sameIdentity(opened, afterRead) || !sameIdentity(afterRead, afterPath)) {
      fail(`${label} changed while it was being inspected`);
    }
    return { content, identity: afterPath };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("California QA-only")) throw error;
    fail(`${label} is unreadable or has unknown state: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function findReservedFamilies(content) {
  return new Set(
    RESERVED_BUFFERS
      .filter(({ bytes }) => content.includes(bytes))
      .map(({ family }) => family)
  );
}

function scanExactRegularTree(root, label, onFile) {
  const exactRoot = assertExactRoot(root, label);
  const finalDirectoryIdentities = [];
  const finalFileIdentities = [];
  let fileCount = 0;
  let totalBytes = 0;

  const walk = (directory) => {
    assertNoSymlinkSegments(exactRoot, directory, `${label} directory`);
    const before = lstatEntry(directory, `${label} directory`);
    if (before.isSymbolicLink()) fail(`${label} directory must not be a symlink: ${directory}`);
    assertDirectoryReadable(before, `${label} directory`);
    if (assertResolvedInside(exactRoot, directory, `${label} directory`) !== directory) {
      fail(`${label} directory must have an exact non-aliased path: ${directory}`);
    }

    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      fail(`${label} directory is unreadable: ${error instanceof Error ? error.message : String(error)}`);
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      const relativePath = path.relative(exactRoot, target).split(path.sep).join("/");
      const entryLabel = `${label} ${relativePath}`;
      const identity = lstatEntry(target, entryLabel);
      if (identity.isSymbolicLink()) fail(`${entryLabel} must not be a symlink`);
      if (identity.isDirectory()) {
        walk(target);
        continue;
      }
      if (!identity.isFile()) fail(`${entryLabel} has an unreadable or unknown special entry type`);
      if (identity.nlink !== 1n) fail(`${entryLabel} must not be a hardlink`);
      const { content, identity: readIdentity } = readExactRegularFile(
        exactRoot,
        target,
        entryLabel
      );
      finalFileIdentities.push({ identity: readIdentity, label: entryLabel, target });
      fileCount += 1;
      totalBytes += content.byteLength;
      onFile?.({ content, relativePath, target });
    }

    const after = lstatEntry(directory, `${label} directory`);
    if (!sameIdentity(before, after)) {
      fail(`${label} directory changed while it was being inspected: ${directory}`);
    }
    finalDirectoryIdentities.push({
      identity: after,
      label: `${label} directory`,
      target: directory
    });
  };

  walk(exactRoot);
  // A directory visited early must not gain or lose an entry while a later
  // subtree is still being inspected. Re-fence every directory after the full
  // traversal; checking only the root does not observe mutations in a nested
  // directory, and checking only files does not observe newly-added files.
  const assertDirectoriesStillExact = () => {
    for (const entry of finalDirectoryIdentities) {
      assertNoSymlinkSegments(exactRoot, entry.target, entry.label);
      const finalIdentity = lstatEntry(entry.target, entry.label);
      if (!sameIdentity(entry.identity, finalIdentity)) {
        fail(`${entry.label} changed before the complete tree inspection finished: ${entry.target}`);
      }
      if (assertResolvedInside(exactRoot, entry.target, entry.label) !== entry.target) {
        fail(`${entry.label} must have an exact non-aliased path: ${entry.target}`);
      }
    }
  };
  assertDirectoriesStillExact();
  // A file read early in a large output/source tree must not be replaceable or
  // rewritten while later entries are being scanned. Fence every file identity
  // again after the complete traversal, not merely around its individual read.
  for (const entry of finalFileIdentities) {
    assertNoSymlinkSegments(exactRoot, entry.target, entry.label);
    const finalIdentity = lstatEntry(entry.target, entry.label);
    if (!sameIdentity(entry.identity, finalIdentity)) {
      fail(`${entry.label} changed before the complete tree inspection finished`);
    }
    if (assertResolvedInside(exactRoot, entry.target, entry.label) !== entry.target) {
      fail(`${entry.label} must have an exact non-aliased path: ${entry.target}`);
    }
  }
  // The file fence above can itself be long on a release output tree. Close the
  // directory set once more so an entry added during that pass is also rejected.
  assertDirectoriesStillExact();
  return Object.freeze({ fileCount, root: exactRoot, totalBytes });
}

export function assertNoQaOnlyInstrumentationBytesSync(options = {}) {
  const findings = [];
  const label = options.label ?? "release build output";
  const result = scanExactRegularTree(options.root, label, ({ content, relativePath }) => {
    const families = findReservedFamilies(content);
    const findingKinds = [...families];
    if (CALIFORNIA_QA_ONLY_MARKER_BASENAMES.has(path.posix.basename(relativePath))) {
      findingKinds.push("forbidden-marker-basename");
    }
    if (findingKinds.length > 0) {
      findings.push(`${relativePath} [${findingKinds.sort().join(",")}]`);
    }
  });
  if (findings.length > 0) {
    fail(
      `${label} contains reserved QA-only instrumentation bytes: ` +
      findings.slice(0, 20).join("; ") +
      (findings.length > 20 ? `; ...and ${findings.length - 20} more` : "")
    );
  }
  return Object.freeze({ ...result, reservedFindingCount: 0 });
}

function scanSignatureSources(root) {
  const signatureRoot = path.join(root, CALIFORNIA_SIGNATURE_SOURCE_ROOT);
  const reservedByFile = new Map();
  const sourceByBenchFileName = new Map();
  const jsxFiles = [];
  const result = scanExactRegularTree(
    signatureRoot,
    "signature source root",
    ({ content, relativePath }) => {
      if (CALIFORNIA_QA_ONLY_MARKER_BASENAMES.has(path.posix.basename(relativePath))) {
        fail(`signature source contains forbidden QA-only marker basename: ${relativePath}`);
      }
      const families = findReservedFamilies(content);
      if (families.size > 0) reservedByFile.set(relativePath, families);
      if (path.extname(relativePath) === ".jsx") jsxFiles.push(relativePath);
      if (CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.includes(relativePath)) {
        sourceByBenchFileName.set(relativePath, content);
      }
    }
  );
  if (jsxFiles.length === 0) fail("signature source inventory contains no .jsx files");
  jsxFiles.sort((left, right) => left.localeCompare(right));
  return {
    ...result,
    jsxFiles,
    reservedByFile,
    sourceByBenchFileName
  };
}

function markerEntry(root, name) {
  const target = path.join(root, name);
  const identity = lstatEntry(target, `QA-only marker ${name}`, { allowMissing: true });
  return { identity, name, target };
}

function assertInspectionBoundaryStable(root, rootIdentity, markers, label) {
  const currentRootIdentity = lstatEntry(root, label);
  if (!sameIdentity(rootIdentity, currentRootIdentity)) {
    fail(`${label} changed while its QA-only instrumentation boundary was being inspected`);
  }
  for (const marker of markers) {
    const currentIdentity = lstatEntry(
      marker.target,
      `QA-only marker ${marker.name}`,
      { allowMissing: true }
    );
    const unchanged = marker.identity === null
      ? currentIdentity === null
      : currentIdentity !== null && sameIdentity(marker.identity, currentIdentity);
    if (!unchanged) {
      fail(`QA-only marker ${marker.name} appeared, disappeared, or changed during inspection`);
    }
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readMarker(root, marker, label) {
  const { content } = readExactRegularFile(root, marker.target, label, {
    maxBytes: MAX_MARKER_BYTES
  });
  let value;
  try {
    value = JSON.parse(content.toString("utf8"));
  } catch (error) {
    fail(`${label} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(value)) fail(`${label} must contain exactly one JSON object`);
  return { content, value };
}

function assertExactObject(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(`${label} schema mismatch (expected=${expectedKeys.join(",")}; actual=${actualKeys.join(",")})`);
  }
  for (const key of expectedKeys) {
    if (actual[key] !== expected[key]) {
      fail(`${label} ${key} mismatch (expected=${JSON.stringify(expected[key])}; actual=${JSON.stringify(actual[key])})`);
    }
  }
  return actual;
}

function assertExactMarker(root, marker, expected, label) {
  const { content, value } = readMarker(root, marker, label);
  const exact = assertExactObject(value, expected, label);
  const canonical = Buffer.from(`${JSON.stringify(expected, null, 2)}\n`, "utf8");
  if (!content.equals(canonical)) {
    fail(`${label} bytes differ from the exact composer marker serialization`);
  }
  return exact;
}

function assertExactStringSet(actual, expected, label) {
  const actualSorted = [...actual].sort((left, right) => left.localeCompare(right));
  const expectedSorted = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    const actualSet = new Set(actualSorted);
    const expectedSet = new Set(expectedSorted);
    const missing = expectedSorted.filter((value) => !actualSet.has(value));
    const extra = actualSorted.filter((value) => !expectedSet.has(value));
    fail(
      `${label} mismatch (missing=${JSON.stringify(missing)}; extra=${JSON.stringify(extra)})`
    );
  }
}

function hasOwn(env, key) {
  return Object.prototype.hasOwnProperty.call(env ?? {}, key);
}

function assertEnvironment(mode, env) {
  const flagPresent = hasOwn(env, CA_VIZ_COMPOSED_QA_BUILD_ENV);
  const value = env?.[CA_VIZ_COMPOSED_QA_BUILD_ENV];
  if (mode === "release") {
    if (flagPresent) {
      fail(`${CA_VIZ_COMPOSED_QA_BUILD_ENV} must be unset for release, staging, and deploy paths`);
    }
    return;
  }

  const deploymentKeys = CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS.filter((key) => hasOwn(env, key));
  if (deploymentKeys.length > 0) {
    fail(
      `composed local QA build is forbidden in any deployment context; found ${deploymentKeys.join(",")}`
    );
  }
  if (!flagPresent || value !== "1") {
    fail(`${CA_VIZ_COMPOSED_QA_BUILD_ENV} must equal exactly "1" for a composed local QA build`);
  }
}

function assertExactComposedSources(sources) {
  const expectedJsx = [
    ...CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES,
    ...CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES
  ];
  assertExactStringSet(sources.jsxFiles, expectedJsx, "composed signature .jsx inventory");

  const expectedBenchSet = new Set(CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES);
  for (const sourcePath of CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES) {
    const families = sources.reservedByFile.get(sourcePath) ?? new Set();
    for (const required of ["controlNamespace", "canvasHeader", "canvasRuntime", "noDeployTerminator"]) {
      if (!families.has(required)) {
        fail(`${sourcePath} lacks required composed ${required} bytes`);
      }
    }
    if (families.has("legacyControlAttribute")) {
      fail(`${sourcePath} contains forbidden legacy control instrumentation bytes`);
    }
  }

  const contaminatedNonBenches = [...sources.reservedByFile.entries()]
    .filter(([sourcePath]) => !expectedBenchSet.has(sourcePath))
    .map(([sourcePath, families]) => `${sourcePath} [${[...families].sort().join(",")}]`);
  if (contaminatedNonBenches.length > 0) {
    fail(
      `only the exact 188 reviewed bench files may contain composed instrumentation: ` +
      contaminatedNonBenches.join("; ")
    );
  }

  let finalSourceSha256;
  try {
    finalSourceSha256 = computeCaliforniaComposedSourceSha256(
      sources.sourceByBenchFileName
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (finalSourceSha256 !== CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256) {
    fail(
      `composed final staged source aggregate mismatch ` +
      `(expected=${CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256}; actual=${finalSourceSha256})`
    );
  }
  return finalSourceSha256;
}

/**
 * Fail-closed boundary between clean product source and the disposable,
 * doubly-instrumented California browser-QA staging tree.
 *
 * Release mode scans every regular byte under the signature source root and
 * accepts only a marker-free/reserved-byte-free product tree. Composed mode is
 * local-only and binds both exact marker objects to all 188 reviewed final
 * staged source bytes, while requiring the exact six non-bench JSX sources and
 * every other signature file to remain free of reserved QA bytes.
 */
export function assertNoQaOnlyInstrumentationSync(options = {}) {
  const mode = options.mode ?? "release";
  if (!MODES.has(mode)) fail(`unsupported inspection mode: ${JSON.stringify(mode)}`);
  const env = options.env ?? process.env;
  assertEnvironment(mode, env);

  const root = assertExactRoot(options.root ?? process.cwd());
  const rootIdentity = lstatEntry(root, "source root");
  const markers = [
    markerEntry(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER),
    markerEntry(root, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER)
  ];
  const sources = scanSignatureSources(root);
  assertInspectionBoundaryStable(root, rootIdentity, markers, "source root");
  const presentMarkers = markers.filter((marker) => marker.identity !== null);

  if (mode === "release") {
    if (presentMarkers.length > 0 || sources.reservedByFile.size > 0) {
      const findings = [
        ...presentMarkers.map((marker) => `QA-only marker ${marker.name}`),
        ...[...sources.reservedByFile.entries()].map(
          ([sourcePath, families]) =>
            `${sourcePath} reserved instrumentation bytes [${[...families].sort().join(",")}]`
        )
      ];
      fail(`release source contains ${findings.join("; ")}`);
    }
    assertInspectionBoundaryStable(root, rootIdentity, markers, "source root");
    return Object.freeze({
      canvasSentinelFiles: 0,
      jsxFiles: sources.jsxFiles.length,
      localQaBuildAuthorized: false,
      markerCount: 0,
      mode,
      regularFiles: sources.fileCount,
      releaseEligible: true,
      signatureSentinelFiles: 0
    });
  }

  if (presentMarkers.length !== markers.length) {
    fail(`composed local QA build requires both exact root markers; found ${presentMarkers.length}/${markers.length}`);
  }
  const control = assertExactMarker(
    root,
    markers[0],
    CALIFORNIA_COMPOSED_CONTROL_MARKER,
    "California signature control QA marker"
  );
  const canvas = assertExactMarker(
    root,
    markers[1],
    CALIFORNIA_COMPOSED_CANVAS_MARKER,
    "California Canvas graphics marker"
  );
  if (control.productSourceSha256 !== canvas.productSourceSha256) {
    fail("control and Canvas marker product source identities do not match");
  }
  const finalStagingSourceSha256 = assertExactComposedSources(sources);
  assertInspectionBoundaryStable(root, rootIdentity, markers, "source root");

  return Object.freeze({
    canvasSentinelFiles: CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.length,
    finalStagingSourceSha256,
    jsxFiles: sources.jsxFiles.length,
    localQaBuildAuthorized: true,
    markerCount: markers.length,
    mode,
    regularFiles: sources.fileCount,
    releaseEligible: false,
    signatureSentinelFiles: CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.length
  });
}

export async function assertNoQaOnlyInstrumentation(options = {}) {
  return assertNoQaOnlyInstrumentationSync(options);
}

function parseArgs(argv) {
  const options = { json: false, mode: "release", root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--mode") {
      options.mode = argv[++index];
    } else if (argument === "--root") {
      options.root = argv[++index];
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = assertNoQaOnlyInstrumentationSync({
      env: process.env,
      mode: options.mode,
      root: options.root
    });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`California QA-only instrumentation guard passed (${result.mode})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
