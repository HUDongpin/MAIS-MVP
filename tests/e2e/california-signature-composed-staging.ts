import { createHash } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  lstatSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import {
  assertCaliforniaSignatureSourceManifestFrozen,
  type CaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_VERSION,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER,
  instrumentCaliforniaCanvasGraphicsSourceText,
  instrumentCaliforniaCanvasGraphicsStagingTree,
  type CaliforniaCanvasGraphicsStagingResult
} from "./california-canvas-graphics-instrumentation";
import {
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import {
  assertCaliforniaSignatureProductSourcesUninstrumented,
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
  instrumentCaliforniaSignatureBenchSource,
  instrumentCaliforniaSignatureQaStagingCopy,
  validateInstrumentedCaliforniaSignatureBenchSource,
  type CaliforniaSignatureQaInstrumentationProvenance
} from "./california-signature-qa-instrumentation";

/**
 * A fail-closed composition boundary for the two QA-only source transforms.
 *
 * The caller supplies a pre-existing isolated copy whose 186 signature source
 * files still equal the reviewed product bytes. Both transformations run in a
 * private scratch tree first (control identities, then Canvas graphics), and
 * only a completely validated result is published into that supplied copy.
 * Neither this tree nor either marker is release/deploy eligible.
 */

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMPOSED_TEMP_PATTERN = /\.ca-(?:signature-qa|canvas-graphics|signature-composed)-.*\.tmp$/;

const CONTROL_MARKER_KEYS = [
  "blueprintSha256",
  "componentCount",
  "controlsInstrumented",
  "productBytesUnchanged",
  "productSourceSha256",
  "purpose",
  "releaseEligible",
  "stagingSourceSha256"
] as const;

const CANVAS_MARKER_KEYS = [
  "animationCancellations",
  "animationSchedules",
  "benches",
  "contextRegistrations",
  "instrumentationVersion",
  "noDeploy",
  "paintInvocations",
  "productSourceSha256",
  "sourceContractSha256"
] as const;

export type CaliforniaSignatureControlQaNoDeployMarker = {
  blueprintSha256: string;
  componentCount: number;
  controlsInstrumented: number;
  productBytesUnchanged: true;
  productSourceSha256: string;
  purpose: "California signature browser QA only";
  releaseEligible: false;
  stagingSourceSha256: string;
};

export type CaliforniaCanvasGraphicsNoDeployMarker = {
  animationCancellations: number;
  animationSchedules: number;
  benches: number;
  contextRegistrations: number;
  instrumentationVersion: number;
  noDeploy: true;
  paintInvocations: number;
  productSourceSha256: string;
  sourceContractSha256: string;
};

export type CaliforniaSignatureComposedStagingResult = {
  canvas: CaliforniaCanvasGraphicsStagingResult;
  canvasMarkerPath: string;
  control: CaliforniaSignatureQaInstrumentationProvenance;
  controlMarkerPath: string;
  finalStagingSourceSha256: string;
  productBytesUnchanged: true;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function aggregateSourceDigest(entries: readonly { benchId: string; source: string }[]) {
  return sha256(entries.map(({ benchId, source }) => `${benchId}\0${sha256(source)}`).join("\n"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string
) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} schema mismatch (expected=${expected.join(",")}; actual=${actual.join(",")})`
    );
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch (expected=${JSON.stringify(expected)}; actual=${JSON.stringify(actual)})`);
  }
}

function assertSha256(value: unknown, label: string) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be an exact lowercase SHA-256 digest`);
  }
  return value;
}

function entryKind(target: string) {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function assertInside(root: string, target: string, label: string) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes the isolated staging root: ${target}`);
  }
}

function assertNoSymlinkSegments(root: string, target: string, label: string) {
  assertInside(root, target, label);
  const relative = path.relative(root, target);
  let cursor = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (entryKind(cursor)?.isSymbolicLink()) {
      throw new Error(`${label} must not traverse a symlink: ${cursor}`);
    }
  }
}

function exactRegularDirectory(target: string, label: string) {
  const resolved = path.resolve(target);
  const identity = entryKind(resolved);
  if (!identity) throw new Error(`${label} is missing: ${resolved}`);
  if (identity.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${resolved}`);
  if (!identity.isDirectory()) throw new Error(`${label} must be a directory: ${resolved}`);
  return realpathSync(resolved);
}

function pathsOverlap(left: string, right: string) {
  const relative = path.relative(left, right);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseMarkerFile(markerPath: string, label: string) {
  const identity = entryKind(markerPath);
  if (!identity) throw new Error(`${label} is missing: ${markerPath}`);
  if (identity.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${markerPath}`);
  if (!identity.isFile()) throw new Error(`${label} must be a regular file: ${markerPath}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(markerPath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) throw new Error(`${label} must contain one JSON object`);
  return parsed;
}

export function expectedCaliforniaCanvasGraphicsNoDeployMarker(
  contract: CaliforniaCanvasGraphicsSourceContract
): CaliforniaCanvasGraphicsNoDeployMarker {
  assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
  return {
    animationCancellations: contract.apiCensus.animationMethods.cancelAnimationFrame ?? 0,
    animationSchedules: contract.apiCensus.animationMethods.requestAnimationFrame ?? 0,
    benches: contract.sources.length,
    contextRegistrations: contract.bindings.length,
    instrumentationVersion: CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_VERSION,
    noDeploy: true,
    paintInvocations: contract.paintSites.length,
    productSourceSha256: contract.sourceSha256,
    sourceContractSha256: contract.contractSha256
  };
}

export function assertExactCaliforniaSignatureControlQaMarker(
  value: unknown,
  manifest: CaliforniaSignatureSourceManifest,
  expectedStagingSourceSha256: string
): CaliforniaSignatureControlQaNoDeployMarker {
  assertCaliforniaSignatureSourceManifestFrozen(manifest);
  if (!isRecord(value)) throw new Error("California signature control QA marker must be an object");
  assertExactKeys(value, CONTROL_MARKER_KEYS, "California signature control QA marker");
  assertEqual(value.releaseEligible, false, "California signature control QA releaseEligible");
  assertEqual(value.productBytesUnchanged, true, "California signature control QA productBytesUnchanged");
  assertEqual(value.purpose, "California signature browser QA only", "California signature control QA purpose");
  assertEqual(value.blueprintSha256, manifest.blueprintSha256, "California signature control QA blueprintSha256");
  assertEqual(value.componentCount, manifest.counts.benches, "California signature control QA componentCount");
  assertEqual(value.controlsInstrumented, manifest.counts.controlSites, "California signature control QA controlsInstrumented");
  assertEqual(value.productSourceSha256, manifest.componentSourceSha256, "California signature control QA productSourceSha256");
  const stagingSourceSha256 = assertSha256(
    value.stagingSourceSha256,
    "California signature control QA stagingSourceSha256"
  );
  assertSha256(expectedStagingSourceSha256, "expected California signature control stagingSourceSha256");
  assertEqual(
    stagingSourceSha256,
    expectedStagingSourceSha256,
    "California signature control QA stagingSourceSha256"
  );
  return value as CaliforniaSignatureControlQaNoDeployMarker;
}

const expectedControlStagingDigestCache = new Map<string, string>();
const expectedComposedSourceIdentityCache = new Map<string, ReadonlyMap<string, string>>();

export function expectedCaliforniaSignatureControlStagingSourceSha256(
  manifest: CaliforniaSignatureSourceManifest,
  productProjectRoot = process.cwd()
) {
  assertCaliforniaSignatureSourceManifestFrozen(manifest);
  const productRoot = exactRegularDirectory(
    productProjectRoot,
    "California signature control provenance product root"
  );
  const cacheKey = `${productRoot}\0${manifest.componentSourceSha256}\0${manifest.blueprintSha256}`;
  const productSources = manifest.benches.map((bench) => {
    const source = readFileSync(path.join(productRoot, bench.sourcePath), "utf8");
    if (sha256(source) !== bench.sourceSha256) {
      throw new Error(`${bench.sourcePath}: control provenance product source identity drifted`);
    }
    return { bench, source };
  });
  const cached = expectedControlStagingDigestCache.get(cacheKey);
  if (cached) return cached;
  const entries = productSources.map(({ bench, source }) => {
    return {
      benchId: bench.benchId,
      source: instrumentCaliforniaSignatureBenchSource(bench, source)
    };
  });
  const expected = aggregateSourceDigest(entries);
  if (expected === manifest.componentSourceSha256) {
    throw new Error("California signature control provenance did not produce an instrumented source identity");
  }
  expectedControlStagingDigestCache.set(cacheKey, expected);
  return expected;
}

function expectedCaliforniaSignatureComposedSourceIdentities(options: {
  contract: CaliforniaCanvasGraphicsSourceContract;
  manifest: CaliforniaSignatureSourceManifest;
  productProjectRoot?: string;
}) {
  assertCaliforniaSignatureSourceManifestFrozen(options.manifest);
  assertCaliforniaCanvasGraphicsSourceContractFrozen(options.contract);
  const productRoot = exactRegularDirectory(
    options.productProjectRoot ?? process.cwd(),
    "California signature composed provenance product root"
  );
  const cacheKey = [
    productRoot,
    options.manifest.componentSourceSha256,
    options.manifest.blueprintSha256,
    options.contract.contractSha256
  ].join("\0");
  const productSources = options.manifest.benches.map((bench) => {
    const source = readFileSync(path.join(productRoot, bench.sourcePath), "utf8");
    if (sha256(source) !== bench.sourceSha256) {
      throw new Error(`${bench.sourcePath}: composed provenance product source identity drifted`);
    }
    return { bench, source };
  });
  const cached = expectedComposedSourceIdentityCache.get(cacheKey);
  if (cached) return cached;
  const identities = new Map(productSources.map(({ bench, source }) => {
    const controlInstrumented = instrumentCaliforniaSignatureBenchSource(bench, source);
    const composed = instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: bench.benchId,
      contract: options.contract,
      source: controlInstrumented,
      sourcePath: bench.sourcePath
    });
    return [bench.sourcePath, sha256(composed.source)] as const;
  }));
  expectedComposedSourceIdentityCache.set(cacheKey, identities);
  return identities;
}

function assertExactCaliforniaSignatureComposedStagedSources(options: {
  contract: CaliforniaCanvasGraphicsSourceContract;
  manifest: CaliforniaSignatureSourceManifest;
  productProjectRoot?: string;
  stagingRoot: string;
}) {
  const expected = expectedCaliforniaSignatureComposedSourceIdentities(options);
  for (const bench of options.manifest.benches) {
    const target = path.join(options.stagingRoot, bench.sourcePath);
    assertInside(options.stagingRoot, target, bench.sourcePath);
    assertNoSymlinkSegments(options.stagingRoot, target, bench.sourcePath);
    const identity = entryKind(target);
    if (!identity) throw new Error(`${bench.sourcePath}: composed staging source is missing`);
    if (identity.isSymbolicLink()) {
      throw new Error(`${bench.sourcePath}: composed staging source must not be a symlink`);
    }
    if (!identity.isFile()) throw new Error(`${bench.sourcePath}: composed staging source must be a regular file`);
    assertInside(options.stagingRoot, realpathSync(target), bench.sourcePath);
    const actualSha256 = sha256(readFileSync(target, "utf8"));
    assertEqual(
      actualSha256,
      expected.get(bench.sourcePath),
      `${bench.sourcePath}: exact composed staging source identity`
    );
  }
}

export function assertExactCaliforniaCanvasGraphicsMarker(
  value: unknown,
  contract: CaliforniaCanvasGraphicsSourceContract
): CaliforniaCanvasGraphicsNoDeployMarker {
  if (!isRecord(value)) throw new Error("California Canvas graphics marker must be an object");
  assertExactKeys(value, CANVAS_MARKER_KEYS, "California Canvas graphics marker");
  const expected = expectedCaliforniaCanvasGraphicsNoDeployMarker(contract);
  for (const key of CANVAS_MARKER_KEYS) {
    assertEqual(value[key], expected[key], `California Canvas graphics ${key}`);
  }
  return value as CaliforniaCanvasGraphicsNoDeployMarker;
}

export function readAndAssertCaliforniaSignatureComposedMarkers(options: {
  contract: CaliforniaCanvasGraphicsSourceContract;
  expectedControlStagingSourceSha256?: string;
  manifest: CaliforniaSignatureSourceManifest;
  productProjectRoot?: string;
  stagingRoot: string;
}) {
  const stagingRoot = exactRegularDirectory(options.stagingRoot, "California signature QA staging root");
  const controlMarkerPath = path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  const canvasMarkerPath = path.join(stagingRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER);
  const result = {
    canvas: assertExactCaliforniaCanvasGraphicsMarker(
      parseMarkerFile(canvasMarkerPath, "California Canvas graphics marker"),
      options.contract
    ),
    canvasMarkerPath,
    control: assertExactCaliforniaSignatureControlQaMarker(
      parseMarkerFile(controlMarkerPath, "California signature control QA marker"),
      options.manifest,
      options.expectedControlStagingSourceSha256 ??
        expectedCaliforniaSignatureControlStagingSourceSha256(
          options.manifest,
          options.productProjectRoot
        )
    ),
    controlMarkerPath
  };
  assertExactCaliforniaSignatureComposedStagedSources({
    contract: options.contract,
    manifest: options.manifest,
    productProjectRoot: options.productProjectRoot,
    stagingRoot
  });
  return result;
}

function assertNoExistingEntry(target: string, label: string) {
  if (entryKind(target)) throw new Error(`${label} already exists: ${target}`);
}

function assertNoStagingTemps(stagingRoot: string, sourcePaths: readonly string[]) {
  const directories = new Set([stagingRoot, ...sourcePaths.map((sourcePath) =>
    path.dirname(path.join(stagingRoot, sourcePath))
  )]);
  for (const directory of directories) {
    for (const name of readdirSync(directory)) {
      if (COMPOSED_TEMP_PATTERN.test(name)) {
        throw new Error(`California signature composed staging temporary path already exists: ${path.join(directory, name)}`);
      }
    }
  }
}

function assertSourceIdentity(options: {
  expected: string;
  sourcePath: string;
  stagingRoot: string;
}) {
  const target = path.join(options.stagingRoot, options.sourcePath);
  assertInside(options.stagingRoot, target, options.sourcePath);
  assertNoSymlinkSegments(options.stagingRoot, target, options.sourcePath);
  const identity = entryKind(target);
  if (!identity) throw new Error(`${options.sourcePath}: staging source is missing`);
  if (identity.isSymbolicLink()) throw new Error(`${options.sourcePath}: staging source must not be a symlink`);
  if (!identity.isFile()) throw new Error(`${options.sourcePath}: staging source must be a regular file`);
  const resolvedTarget = realpathSync(target);
  assertInside(options.stagingRoot, resolvedTarget, options.sourcePath);
  const actual = readFileSync(target, "utf8");
  if (actual !== options.expected) {
    throw new Error(`${options.sourcePath}: staging copy differs before composed QA instrumentation`);
  }
  if (
    actual.includes(CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE) ||
    actual.includes(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER)
  ) {
    throw new Error(`${options.sourcePath}: staging source is already instrumented`);
  }
  return actual;
}

function assertProductSnapshotUnchanged(
  productRoot: string,
  snapshot: ReadonlyMap<string, string>
) {
  for (const [sourcePath, expected] of snapshot) {
    if (readFileSync(path.join(productRoot, sourcePath), "utf8") !== expected) {
      throw new Error(`${sourcePath}: product source bytes changed during composed staging instrumentation`);
    }
  }
}

function writeExclusive(target: string, value: string) {
  const descriptor = openSync(target, "wx", 0o600);
  try {
    writeFileSync(descriptor, value, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

export function instrumentCaliforniaSignatureComposedQaStaging(options: {
  productProjectRoot?: string;
  stagingProjectRoot: string;
}): CaliforniaSignatureComposedStagingResult {
  const productRoot = exactRegularDirectory(
    options.productProjectRoot ?? process.cwd(),
    "California signature product root"
  );
  const stagingRoot = exactRegularDirectory(
    options.stagingProjectRoot,
    "California signature QA staging root"
  );
  if (pathsOverlap(productRoot, stagingRoot) || pathsOverlap(stagingRoot, productRoot)) {
    throw new Error("composed QA instrumentation requires disjoint product and staging roots");
  }

  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(productRoot);
  assertCaliforniaSignatureSourceManifestFrozen(manifest);
  const contract = buildCaliforniaCanvasGraphicsSourceContract(productRoot);
  assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
  if (manifest.counts.benches !== contract.sources.length) {
    throw new Error(
      `control/Canvas source count mismatch (${manifest.counts.benches}/${contract.sources.length})`
    );
  }
  const contractSources = new Map(contract.sources.map((source) => [source.sourcePath, source]));
  for (const bench of manifest.benches) {
    const source = contractSources.get(bench.sourcePath);
    if (!source || source.benchId !== bench.benchId || source.sourceSha256 !== bench.sourceSha256) {
      throw new Error(`${bench.sourcePath}: control/Canvas source identity mismatch`);
    }
  }

  const controlMarkerPath = path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  const canvasMarkerPath = path.join(stagingRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER);
  assertNoExistingEntry(controlMarkerPath, "California signature control QA marker");
  assertNoExistingEntry(canvasMarkerPath, "California Canvas graphics marker");
  assertNoStagingTemps(stagingRoot, manifest.benches.map((bench) => bench.sourcePath));

  const productSnapshot = new Map<string, string>();
  const stagingSnapshot = new Map<string, string>();
  for (const bench of manifest.benches) {
    const productSource = readFileSync(path.join(productRoot, bench.sourcePath), "utf8");
    if (sha256(productSource) !== bench.sourceSha256) {
      throw new Error(`${bench.sourcePath}: product source identity changed during preflight`);
    }
    productSnapshot.set(bench.sourcePath, productSource);
    stagingSnapshot.set(bench.sourcePath, assertSourceIdentity({
      expected: productSource,
      sourcePath: bench.sourcePath,
      stagingRoot
    }));
  }

  const scratchRoot = mkdtempSync(path.join(
    path.dirname(stagingRoot),
    `.${path.basename(stagingRoot)}.ca-signature-composed-${process.pid}-`
  ));
  let control: CaliforniaSignatureQaInstrumentationProvenance;
  let canvas: CaliforniaCanvasGraphicsStagingResult;
  const publishedMarkers = new Map<string, { device: number; inode: number }>();
  try {
    for (const bench of manifest.benches) {
      const destination = path.join(scratchRoot, bench.sourcePath);
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(path.join(stagingRoot, bench.sourcePath), destination);
    }

    control = instrumentCaliforniaSignatureQaStagingCopy({
      productProjectRoot: productRoot,
      stagingProjectRoot: scratchRoot
    });
    assertEqual(control.blueprintSha256, manifest.blueprintSha256, "composed control blueprintSha256");
    assertEqual(control.componentCount, manifest.counts.benches, "composed control componentCount");
    assertEqual(control.controlsInstrumented, manifest.counts.controlSites, "composed control controlsInstrumented");
    assertEqual(control.productBytesUnchanged, true, "composed control productBytesUnchanged");
    assertEqual(control.productSourceSha256, manifest.componentSourceSha256, "composed control productSourceSha256");
    assertSha256(control.stagingSourceSha256, "composed control stagingSourceSha256");
    if (control.stagingSourceSha256 === control.productSourceSha256) {
      throw new Error("composed control instrumentation did not change its scratch source identity");
    }
    for (const bench of manifest.benches) {
      validateInstrumentedCaliforniaSignatureBenchSource(
        bench,
        readFileSync(path.join(scratchRoot, bench.sourcePath), "utf8")
      );
    }

    canvas = instrumentCaliforniaCanvasGraphicsStagingTree({
      projectRoot: productRoot,
      stagingRoot: scratchRoot
    });
    const expectedCanvas = expectedCaliforniaCanvasGraphicsNoDeployMarker(contract);
    for (const key of [
      "animationCancellations",
      "animationSchedules",
      "benches",
      "contextRegistrations",
      "paintInvocations",
      "productSourceSha256",
      "sourceContractSha256"
    ] as const) {
      assertEqual(canvas[key], expectedCanvas[key], `composed Canvas result ${key}`);
    }
    readAndAssertCaliforniaSignatureComposedMarkers({
      contract,
      expectedControlStagingSourceSha256: control.stagingSourceSha256,
      manifest,
      productProjectRoot: productRoot,
      stagingRoot: scratchRoot
    });

    for (const bench of manifest.benches) {
      const transformed = readFileSync(path.join(scratchRoot, bench.sourcePath), "utf8");
      validateInstrumentedCaliforniaSignatureBenchSource(bench, transformed);
      if (!transformed.includes(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER)) {
        throw new Error(`${bench.sourcePath}: composed scratch source lacks Canvas instrumentation`);
      }
    }

    // A second complete fence immediately before publication catches a late
    // staging or product mutation. No supplied staging byte has changed yet.
    assertProductSnapshotUnchanged(productRoot, productSnapshot);
    for (const bench of manifest.benches) {
      assertSourceIdentity({
        expected: stagingSnapshot.get(bench.sourcePath)!,
        sourcePath: bench.sourcePath,
        stagingRoot
      });
    }
    assertNoExistingEntry(controlMarkerPath, "California signature control QA marker");
    assertNoExistingEntry(canvasMarkerPath, "California Canvas graphics marker");
    assertNoStagingTemps(stagingRoot, manifest.benches.map((bench) => bench.sourcePath));

    const publications = [
      ...manifest.benches.map((bench, index) => ({
        source: path.join(scratchRoot, bench.sourcePath),
        target: path.join(stagingRoot, bench.sourcePath),
        temporary: `${path.join(stagingRoot, bench.sourcePath)}.ca-signature-composed-${process.pid}-${index}.tmp`
      })),
      {
        source: path.join(scratchRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER),
        target: controlMarkerPath,
        temporary: `${controlMarkerPath}.ca-signature-composed-${process.pid}-control.tmp`
      },
      {
        source: path.join(scratchRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER),
        target: canvasMarkerPath,
        temporary: `${canvasMarkerPath}.ca-signature-composed-${process.pid}-canvas.tmp`
      }
    ];
    const preparedTemps: string[] = [];
    try {
      for (const publication of publications) {
        assertNoExistingEntry(publication.temporary, "California signature composed publish temporary");
        writeExclusive(publication.temporary, readFileSync(publication.source, "utf8"));
        preparedTemps.push(publication.temporary);
      }
      // Markers publish last. A process interruption can therefore never make
      // a partially rewritten source tree appear runtime-eligible.
      for (const [index, publication] of publications.entries()) {
        if (index < manifest.benches.length) {
          const bench = manifest.benches[index]!;
          assertSourceIdentity({
            expected: stagingSnapshot.get(bench.sourcePath)!,
            sourcePath: bench.sourcePath,
            stagingRoot
          });
          renameSync(publication.temporary, publication.target);
        } else {
          // Hard-link publication gives both markers exclusive `EEXIST`
          // semantics and never follows or overwrites a late symlink.
          assertProductSnapshotUnchanged(productRoot, productSnapshot);
          assertNoExistingEntry(publication.target, "California signature composed publish marker");
          linkSync(publication.temporary, publication.target);
          const markerIdentity = lstatSync(publication.target);
          publishedMarkers.set(publication.target, {
            device: markerIdentity.dev,
            inode: markerIdentity.ino
          });
          unlinkSync(publication.temporary);
        }
        preparedTemps.shift();
      }
    } catch (error) {
      for (const temporary of preparedTemps) rmSync(temporary, { force: true });
      throw error;
    }

    const markers = readAndAssertCaliforniaSignatureComposedMarkers({
      contract,
      expectedControlStagingSourceSha256: control.stagingSourceSha256,
      manifest,
      productProjectRoot: productRoot,
      stagingRoot
    });
    assertEqual(markers.control.stagingSourceSha256, control.stagingSourceSha256,
      "published control stagingSourceSha256");
    assertProductSnapshotUnchanged(productRoot, productSnapshot);
    const finalEntries = manifest.benches.map((bench) => {
      const source = readFileSync(path.join(stagingRoot, bench.sourcePath), "utf8");
      validateInstrumentedCaliforniaSignatureBenchSource(bench, source);
      if (!source.includes(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER)) {
        throw new Error(`${bench.sourcePath}: published source lacks Canvas instrumentation`);
      }
      return { benchId: bench.benchId, source };
    });
    return {
      canvas: { ...canvas, markerPath: canvasMarkerPath },
      canvasMarkerPath,
      control,
      controlMarkerPath,
      finalStagingSourceSha256: aggregateSourceDigest(finalEntries),
      productBytesUnchanged: true
    };
  } catch (error) {
    // If any publication or post-publication fence fails, remove only marker
    // inodes created by this invocation. A partial source tree must stay
    // visibly ineligible for the exhaustive runtime.
    for (const [markerPath, publishedIdentity] of publishedMarkers) {
      const current = entryKind(markerPath);
      if (
        current &&
        current.dev === publishedIdentity.device &&
        current.ino === publishedIdentity.inode
      ) {
        unlinkSync(markerPath);
      }
    }
    throw error;
  } finally {
    rmSync(scratchRoot, { force: true, recursive: true });
  }
}
