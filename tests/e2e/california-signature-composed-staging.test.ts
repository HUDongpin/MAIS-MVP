import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import {
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
} from "./california-canvas-graphics-instrumentation";
import {
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  buildCaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import {
  expectedCaliforniaCanvasGraphicsNoDeployMarker,
  instrumentCaliforniaSignatureComposedQaStaging,
  readAndAssertCaliforniaSignatureComposedMarkers
} from "./california-signature-composed-staging";
import {
  assertCaliforniaSignatureQaRuntimeMarker
} from "./california-signature-exhaustive-qa";
import {
  assertCaliforniaSignatureProductSourcesUninstrumented,
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
  validateInstrumentedCaliforniaSignatureBenchSource
} from "./california-signature-qa-instrumentation";
import {
  buildCaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  iterateCaliforniaSignatureSourceEvidenceOracleRows
} from "./california-signature-source-expected-provider";

const realProjectRoot = process.cwd();
const realManifest = assertCaliforniaSignatureProductSourcesUninstrumented(realProjectRoot);
const realContract = buildCaliforniaCanvasGraphicsSourceContract(realProjectRoot);
assertCaliforniaCanvasGraphicsSourceContractFrozen(realContract);
const signatureSourcePaths = realManifest.benches.map((bench) => bench.sourcePath);

function snapshotSourceBytes(root: string, sourcePaths: readonly string[]) {
  return new Map(sourcePaths.map((sourcePath) => [
    sourcePath,
    readFileSync(path.join(root, sourcePath))
  ]));
}

function assertSourceBytesUnchanged(
  root: string,
  snapshot: ReadonlyMap<string, Buffer>,
  label: string
) {
  for (const [sourcePath, source] of snapshot) {
    assert.deepEqual(
      readFileSync(path.join(root, sourcePath)),
      source,
      `${label}/${sourcePath}: source bytes changed`
    );
  }
}

const realProjectSnapshot = snapshotSourceBytes(realProjectRoot, signatureSourcePaths);
const fixtureRunRoot = mkdtempSync(path.join(os.tmpdir(), "ca-signature-composed-fixture-"));
const projectRoot = path.join(fixtureRunRoot, "product-fixture");
const stagingFixtureRoot = path.join(fixtureRunRoot, "staging-fixture");
const ancestorSymlinkCanaryRoot = path.join(fixtureRunRoot, "ancestor-symlink-canary");
for (const root of [projectRoot, stagingFixtureRoot, ancestorSymlinkCanaryRoot]) {
  mkdirSync(root, { recursive: true });
}
after(() => {
  try {
    assertSourceBytesUnchanged(realProjectRoot, realProjectSnapshot, "real project");
  } finally {
    rmSync(fixtureRunRoot, { force: true, recursive: true });
  }
});
for (const sourcePath of signatureSourcePaths) {
  const destination = path.join(projectRoot, sourcePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(path.join(realProjectRoot, sourcePath), destination);
  assert.deepEqual(readFileSync(destination), realProjectSnapshot.get(sourcePath),
    `${sourcePath}: product fixture is not byte-exact`);
}
const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(projectRoot);
const contract = buildCaliforniaCanvasGraphicsSourceContract(projectRoot);
assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
assert.deepEqual(manifest, realManifest, "product fixture manifest differs from the real read-only source");
assert.deepEqual(contract, realContract, "product fixture Canvas contract differs from real read-only source");
const productFixtureSnapshot = snapshotSourceBytes(projectRoot, signatureSourcePaths);
assert.deepEqual(productFixtureSnapshot, realProjectSnapshot,
  "product fixture is not a byte-exact sibling copy of the real source");

function makeStagingCopy(t: test.TestContext, prefix = "ca-signature-composed-") {
  const stagingRoot = mkdtempSync(path.join(stagingFixtureRoot, prefix));
  t.after(() => rmSync(stagingRoot, { force: true, recursive: true }));
  for (const bench of manifest.benches) {
    const destination = path.join(stagingRoot, bench.sourcePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(projectRoot, bench.sourcePath), destination);
  }
  return stagingRoot;
}

function productSnapshot() {
  return snapshotSourceBytes(projectRoot, signatureSourcePaths);
}

function assertProductSnapshot(snapshot: ReadonlyMap<string, Buffer>) {
  assertSourceBytesUnchanged(projectRoot, snapshot, "product fixture");
  assertSourceBytesUnchanged(realProjectRoot, realProjectSnapshot, "real project");
}

function readJson(markerPath: string) {
  return JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
}

function writeJson(markerPath: string, value: Record<string, unknown>) {
  writeFileSync(markerPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("composed staging instruments all 186 sources in control-then-Canvas order without changing product bytes", async (t) => {
  assert.equal(manifest.counts.benches, 186, "the full reviewed signature inventory must remain exact");
  assert.equal(contract.sources.length, manifest.counts.benches);
  const before = productSnapshot();
  const stagingRoot = makeStagingCopy(t);
  const result = instrumentCaliforniaSignatureComposedQaStaging({
    productProjectRoot: projectRoot,
    stagingProjectRoot: stagingRoot
  });

  const expectedCanvas = expectedCaliforniaCanvasGraphicsNoDeployMarker(contract);
  assert.deepEqual(
    {
      benches: result.canvas.benches,
      components: result.control.componentCount,
      contexts: result.canvas.contextRegistrations,
      controls: result.control.controlsInstrumented,
      paints: result.canvas.paintInvocations,
      productBytesUnchanged: result.productBytesUnchanged
    },
    {
      benches: contract.sources.length,
      components: manifest.counts.benches,
      contexts: contract.bindings.length,
      controls: manifest.counts.controlSites,
      paints: contract.paintSites.length,
      productBytesUnchanged: true
    }
  );
  assert.equal(result.canvas.animationSchedules, expectedCanvas.animationSchedules);
  assert.equal(result.canvas.animationCancellations, expectedCanvas.animationCancellations);
  assert.equal(result.canvas.markerPath, result.canvasMarkerPath);
  assert.match(result.finalStagingSourceSha256, /^[a-f0-9]{64}$/);
  assert.notEqual(result.finalStagingSourceSha256, manifest.componentSourceSha256);

  const markers = readAndAssertCaliforniaSignatureComposedMarkers({ contract, manifest, stagingRoot });
  assert.equal(lstatSync(markers.controlMarkerPath).isFile(), true);
  assert.equal(lstatSync(markers.canvasMarkerPath).isFile(), true);
  assert.deepEqual(markers.canvas, expectedCanvas);
  assert.equal(markers.control.blueprintSha256, manifest.blueprintSha256);
  assert.equal(markers.control.productSourceSha256, manifest.componentSourceSha256);
  assert.equal(markers.control.stagingSourceSha256, result.control.stagingSourceSha256);

  for (const bench of manifest.benches) {
    const staged = readFileSync(path.join(stagingRoot, bench.sourcePath), "utf8");
    assert.equal(
      validateInstrumentedCaliforniaSignatureBenchSource(bench, staged),
      bench.controlSites.length
    );
    assert.ok(staged.includes(CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE));
    assert.ok(staged.includes(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER));
  }
  const runtimeMarkers = await assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot });
  assert.deepEqual(runtimeMarkers.control, markers.control);
  assert.deepEqual(runtimeMarkers.canvas, markers.canvas);
  assertProductSnapshot(before);

  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: stagingRoot
    }),
    /marker already exists|already instrumented/
  );
  assertProductSnapshot(before);
});

test("formal composed collection reads every source oracle from the frozen product root", async (t) => {
  const stagingRoot = makeStagingCopy(t, "ca-signature-frozen-collection-");
  instrumentCaliforniaSignatureComposedQaStaging({
    productProjectRoot: projectRoot,
    stagingProjectRoot: stagingRoot
  });
  const previousCwd = process.cwd();
  const previousComposed = process.env.CA_VIZ_COMPOSED_QA_BUILD;
  const previousProductRoot = process.env.CA_SIGNATURE_PRODUCT_PROJECT_ROOT;
  const previousStagingRoot = process.env.CA_SIGNATURE_QA_STAGING_ROOT;
  try {
    process.chdir(stagingRoot);
    process.env.CA_VIZ_COMPOSED_QA_BUILD = "1";
    process.env.CA_SIGNATURE_PRODUCT_PROJECT_ROOT = projectRoot;
    process.env.CA_SIGNATURE_QA_STAGING_ROOT = stagingRoot;

    const collectedManifest = buildCaliforniaSignatureSourceManifest();
    const collectedContract = buildCaliforniaCanvasGraphicsSourceContract();
    assert.deepEqual(collectedManifest, manifest,
      "formal collection parsed the instrumented staging tree as product source");
    assert.deepEqual(collectedContract, contract,
      "formal collection parsed Canvas bindings from instrumented staging");
    const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(
      collectedManifest,
      { canvasContract: collectedContract }
    );
    assert.equal(oracle.componentSourceSha256, collectedManifest.componentSourceSha256);
    assert.equal(oracle.canvasContractSha256, collectedContract.contractSha256);
    assert.equal(
      iterateCaliforniaSignatureSourceEvidenceOracleRows({
        manifest: collectedManifest,
        oracle
      }).next().done,
      false,
      "formal frozen-source oracle unexpectedly contains no evidence rows"
    );
    const runtimeMarkers = await assertCaliforniaSignatureQaRuntimeMarker({
      manifest: collectedManifest
    });
    assert.equal(runtimeMarkers.control.productSourceSha256, manifest.componentSourceSha256);

    delete process.env.CA_SIGNATURE_PRODUCT_PROJECT_ROOT;
    assert.throws(
      () => buildCaliforniaSignatureSourceManifest(),
      /CA_SIGNATURE_PRODUCT_PROJECT_ROOT is required/,
      "formal composed collection silently fell back to instrumented cwd"
    );
  } finally {
    process.chdir(previousCwd);
    if (previousComposed === undefined) delete process.env.CA_VIZ_COMPOSED_QA_BUILD;
    else process.env.CA_VIZ_COMPOSED_QA_BUILD = previousComposed;
    if (previousProductRoot === undefined) delete process.env.CA_SIGNATURE_PRODUCT_PROJECT_ROOT;
    else process.env.CA_SIGNATURE_PRODUCT_PROJECT_ROOT = previousProductRoot;
    if (previousStagingRoot === undefined) delete process.env.CA_SIGNATURE_QA_STAGING_ROOT;
    else process.env.CA_SIGNATURE_QA_STAGING_ROOT = previousStagingRoot;
  }
});

test("runtime marker assertion rejects every forged control and Canvas provenance field", async (t) => {
  const stagingRoot = makeStagingCopy(t, "ca-signature-marker-forgery-");
  instrumentCaliforniaSignatureComposedQaStaging({
    productProjectRoot: projectRoot,
    stagingProjectRoot: stagingRoot
  });
  const controlPath = path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  const canvasPath = path.join(stagingRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER);
  const originalControl = readFileSync(controlPath, "utf8");
  const originalCanvas = readFileSync(canvasPath, "utf8");

  const controlMutations: Array<[string, unknown]> = [
    ["blueprintSha256", "0".repeat(64)],
    ["componentCount", manifest.counts.benches - 1],
    ["controlsInstrumented", manifest.counts.controlSites - 1],
    ["productBytesUnchanged", false],
    ["productSourceSha256", "0".repeat(64)],
    ["purpose", "deployable"],
    ["releaseEligible", true],
    ["stagingSourceSha256", manifest.componentSourceSha256],
    ["stagingSourceSha256", "0".repeat(64)]
  ];
  for (const [field, forged] of controlMutations) {
    writeFileSync(controlPath, originalControl, "utf8");
    const marker = readJson(controlPath);
    marker[field] = forged;
    writeJson(controlPath, marker);
    await assert.rejects(
      () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
      /composed QA markers missing or invalid/,
      `forged control ${field} must fail closed`
    );
  }
  writeFileSync(controlPath, originalControl, "utf8");
  const extraControl = readJson(controlPath);
  extraControl.unreviewed = true;
  writeJson(controlPath, extraControl);
  await assert.rejects(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
    /schema mismatch/,
    "an unreviewed control marker field must fail closed"
  );
  writeFileSync(controlPath, originalControl, "utf8");

  const expectedCanvas = expectedCaliforniaCanvasGraphicsNoDeployMarker(contract);
  const canvasMutations: Array<[keyof typeof expectedCanvas, unknown]> = [
    ["instrumentationVersion", expectedCanvas.instrumentationVersion + 1],
    ["noDeploy", false],
    ["benches", expectedCanvas.benches - 1],
    ["contextRegistrations", expectedCanvas.contextRegistrations - 1],
    ["paintInvocations", expectedCanvas.paintInvocations - 1],
    ["animationSchedules", expectedCanvas.animationSchedules - 1],
    ["animationCancellations", expectedCanvas.animationCancellations - 1],
    ["productSourceSha256", "0".repeat(64)],
    ["sourceContractSha256", "0".repeat(64)]
  ];
  for (const [field, forged] of canvasMutations) {
    writeFileSync(canvasPath, originalCanvas, "utf8");
    const marker = readJson(canvasPath);
    marker[field] = forged;
    writeJson(canvasPath, marker);
    await assert.rejects(
      () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
      /composed QA markers missing or invalid/,
      `forged Canvas ${field} must fail closed`
    );
  }
  writeFileSync(canvasPath, originalCanvas, "utf8");
  const extraCanvas = readJson(canvasPath);
  extraCanvas.unreviewed = true;
  writeJson(canvasPath, extraCanvas);
  await assert.rejects(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
    /schema mismatch/,
    "an unreviewed Canvas marker field must fail closed"
  );
});

test("preflight rejects product equality, a symlink root, source, or marker, and preserves sentinels", (t) => {
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: projectRoot
    }),
    /disjoint product and staging roots/
  );
  assert.equal(existsSync(path.join(projectRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)), false);
  assert.equal(existsSync(path.join(projectRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER)), false);

  const container = mkdtempSync(path.join(
    ancestorSymlinkCanaryRoot,
    "ca-signature-symlink-root-"
  ));
  t.after(() => rmSync(container, { force: true, recursive: true }));
  const realStaging = path.join(container, "real");
  mkdirSync(realStaging);
  const symlinkRoot = path.join(container, "linked");
  symlinkSync(realStaging, symlinkRoot, "dir");
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: symlinkRoot
    }),
    /staging root must not be a symlink/
  );

  const sourceStaging = makeStagingCopy(t, "ca-signature-symlink-source-");
  const last = manifest.benches.at(-1)!;
  const sourcePath = path.join(sourceStaging, last.sourcePath);
  const outsideSource = path.join(sourceStaging, "outside-source.jsx");
  writeFileSync(outsideSource, readFileSync(sourcePath, "utf8"), "utf8");
  rmSync(sourcePath);
  symlinkSync(outsideSource, sourcePath);
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: sourceStaging
    }),
    /must not (?:traverse|be) a symlink/
  );
  assert.equal(readFileSync(outsideSource, "utf8"), readFileSync(path.join(projectRoot, last.sourcePath), "utf8"));

  const ancestorStaging = makeStagingCopy(t, "ca-signature-symlink-ancestor-");
  const signatureDirectory = path.join(ancestorStaging, "components/visualizations/signature");
  const ancestorCanary = mkdtempSync(path.join(
    ancestorSymlinkCanaryRoot,
    "ca-signature-source-ancestor-"
  ));
  t.after(() => rmSync(ancestorCanary, { force: true, recursive: true }));
  const realSignatureDirectory = path.join(ancestorCanary, "signature-real");
  renameSync(signatureDirectory, realSignatureDirectory);
  symlinkSync(realSignatureDirectory, signatureDirectory, "dir");
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: ancestorStaging
    }),
    /must not traverse a symlink/
  );

  const markerStaging = makeStagingCopy(t, "ca-signature-symlink-marker-");
  const sentinel = path.join(markerStaging, "outside-sentinel.json");
  writeFileSync(sentinel, "sentinel", "utf8");
  symlinkSync(sentinel, path.join(markerStaging, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER));
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: markerStaging
    }),
    /control QA marker already exists/
  );
  assert.equal(readFileSync(sentinel, "utf8"), "sentinel");
  assert.equal(existsSync(path.join(markerStaging, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER)), false);
});

test("preflight rejects existing markers, temporary paths, and a late source mismatch before any staging write", (t) => {
  const markerStaging = makeStagingCopy(t, "ca-signature-existing-marker-");
  const first = manifest.benches[0]!;
  const firstBefore = readFileSync(path.join(markerStaging, first.sourcePath), "utf8");
  writeFileSync(path.join(markerStaging, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER), "{}\n", "utf8");
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: markerStaging
    }),
    /Canvas graphics marker already exists/
  );
  assert.equal(readFileSync(path.join(markerStaging, first.sourcePath), "utf8"), firstBefore);
  assert.equal(existsSync(path.join(markerStaging, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)), false);

  const tempStaging = makeStagingCopy(t, "ca-signature-existing-temp-");
  const tempPath = `${path.join(tempStaging, first.sourcePath)}.ca-canvas-graphics-stale.tmp`;
  writeFileSync(tempPath, "stale", "utf8");
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: tempStaging
    }),
    /temporary path already exists/
  );
  assert.equal(readFileSync(tempPath, "utf8"), "stale");
  assert.equal(readFileSync(path.join(tempStaging, first.sourcePath), "utf8"), firstBefore);

  const mismatchStaging = makeStagingCopy(t, "ca-signature-late-mismatch-");
  const last = manifest.benches.at(-1)!;
  writeFileSync(path.join(mismatchStaging, last.sourcePath), "/* late mismatch */\n", "utf8");
  assert.throws(
    () => instrumentCaliforniaSignatureComposedQaStaging({
      productProjectRoot: projectRoot,
      stagingProjectRoot: mismatchStaging
    }),
    /staging copy differs before composed QA instrumentation/
  );
  assert.equal(readFileSync(path.join(mismatchStaging, first.sourcePath), "utf8"), firstBefore);
  assert.equal(existsSync(path.join(mismatchStaging, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)), false);
  assert.equal(existsSync(path.join(mismatchStaging, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER)), false);
});

test("runtime validation refuses a missing or symlinked marker", async (t) => {
  const stagingRoot = makeStagingCopy(t, "ca-signature-runtime-marker-");
  instrumentCaliforniaSignatureComposedQaStaging({
    productProjectRoot: projectRoot,
    stagingProjectRoot: stagingRoot
  });
  const first = manifest.benches[0]!;
  const stagedSourcePath = path.join(stagingRoot, first.sourcePath);
  const stagedSource = readFileSync(stagedSourcePath, "utf8");
  writeFileSync(stagedSourcePath, `${stagedSource}\n/* late rewrite */\n`, "utf8");
  await assert.rejects(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
    /exact composed staging source identity/,
    "a source rewrite after the Canvas transform must invalidate both markers"
  );
  writeFileSync(stagedSourcePath, stagedSource, "utf8");
  await assert.doesNotReject(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot })
  );
  const canvasPath = path.join(stagingRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER);
  const canvasMarker = readFileSync(canvasPath, "utf8");
  rmSync(canvasPath);
  await assert.rejects(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
    /Canvas graphics marker is missing/
  );
  const sentinel = path.join(stagingRoot, "canvas-marker-sentinel.json");
  writeFileSync(sentinel, canvasMarker, "utf8");
  symlinkSync(sentinel, canvasPath);
  await assert.rejects(
    () => assertCaliforniaSignatureQaRuntimeMarker({ manifest, stagingRoot }),
    /Canvas graphics marker must not be a symlink/
  );
  assert.equal(readFileSync(sentinel, "utf8"), canvasMarker);
});
