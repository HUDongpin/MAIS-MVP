import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync
} from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import test from "node:test";
import {
  californiaSignatureFinalCompositorPhase4RealDriverTestFixture as phase4Fixture
} from "./california-signature-final-compositor-phase4-real-driver.test-fixture";
import {
  compareCaliforniaPhase4IndependentReferenceObservation,
  renderCaliforniaPhase4IndependentReferenceCandidate
} from "./california-signature-final-compositor-phase4-independent-reference-renderer";
import {
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES,
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256
} from "./california-signature-final-compositor-phase4-independent-reference-scene-registry";

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function independentlyStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(independentlyStableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${independentlyStableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function independentlySha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function independentlyRecomputeCandidateSha256(
  candidate: Awaited<ReturnType<typeof renderCaliforniaPhase4IndependentReferenceCandidate>>
): string {
  const { candidateSha256: _candidateSha256, ...base } = candidate;
  const identity = {
    ...base,
    rasters: candidate.rasters.map(({ readPixels: _readPixels, ...rasterIdentity }) =>
      rasterIdentity)
  };
  return independentlySha256(independentlyStableJson(identity));
}

const TEST_DIRECTORY = fileURLToPath(new URL(".", import.meta.url));
const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";

test("independent software renderer emits four exact nonzero diagnostic candidates", async () => {
  assert.equal(renderCaliforniaPhase4IndependentReferenceCandidate.length, 0);
  const rendered = await renderCaliforniaPhase4IndependentReferenceCandidate() as unknown as {
    formalExecutionAuthorized: boolean;
    independentExpectedRasterAvailable: boolean;
    rasters: readonly { readPixels(): Uint8Array }[];
  };
  assert.equal(rendered.formalExecutionAuthorized, false);
  assert.equal(rendered.independentExpectedRasterAvailable, false);
  assert.equal(rendered.rasters.length, 4);
  for (const raster of rendered.rasters) {
    assert.equal(raster.readPixels().some((byte) => byte !== 0), true);
  }
});

test("issued raster bytes are mutation-safe on the same candidate object", async () => {
  const candidate = await renderCaliforniaPhase4IndependentReferenceCandidate();
  const raster = candidate.rasters[0]!;
  const issued = raster as unknown as {
    pixels?: Uint8Array;
    readPixels?: () => Uint8Array;
    rgbaSha256: string;
  };
  assert.equal("pixels" in issued, false,
    "issued raster must not expose its module-held bytes as a mutable typed array");
  assert.equal(typeof issued.readPixels, "function");
  assert.equal(issued.readPixels!().length,
    raster.backingWidth * raster.backingHeight * 4);
  const firstRead = issued.readPixels!();
  const originalFirstByte = firstRead[0]!;
  firstRead[0] = originalFirstByte ^ 0xff;
  const secondRead = issued.readPixels!();
  assert.equal(secondRead[0], originalFirstByte,
    "mutating one read changed the same issued raster object");
  assert.equal(independentlySha256(secondRead), issued.rgbaSha256,
    "same-object mutation made issued bytes diverge from rgbaSha256");
  assert.equal(independentlyRecomputeCandidateSha256(candidate), candidate.candidateSha256,
    "same-object mutation made candidateSha256 diverge from its issued identity");
  const mutatedComparison = await compareCaliforniaPhase4IndependentReferenceObservation({
    backingHeight: raster.backingHeight,
    backingWidth: raster.backingWidth,
    classId: raster.classId,
    pixels: firstRead,
    targetSha256: raster.targetSha256
  });
  assert.equal(mutatedComparison.matches, false,
    "comparator accepted a caller-mutated copy from the same raster object");
  const exactComparison = await compareCaliforniaPhase4IndependentReferenceObservation({
    backingHeight: raster.backingHeight,
    backingWidth: raster.backingWidth,
    classId: raster.classId,
    pixels: secondRead,
    targetSha256: raster.targetSha256
  });
  assert.equal(exactComparison.matches, true);
  assert.throws(() => {
    (issued as { readPixels: () => Uint8Array }).readPixels = () => firstRead;
  }, TypeError, "issued raster allowed its authenticated read API to be replaced");
});

test("diagnostic source identity rejects post-import on-disk replacement", async () => {
  const temporaryRoot = path.join(WORKTREE, ".tmp");
  mkdirSync(temporaryRoot, { mode: 0o700, recursive: true });
  const directoryPath = mkdtempSync(path.join(temporaryRoot, "p4ir-drift."));
  assert.equal(path.dirname(directoryPath), temporaryRoot);
  try {
    const sourceFileNames = [
      "california-signature-final-compositor-phase4-independent-reference-renderer-contract.ts",
      "california-signature-final-compositor-phase4-independent-reference-renderer.ts",
      "california-signature-final-compositor-phase4-independent-reference-scene-registry.ts"
    ];
    for (const fileName of sourceFileNames) {
      copyFileSync(path.join(TEST_DIRECTORY, fileName), path.join(directoryPath, fileName));
    }
    const rendererPath = path.join(directoryPath,
      "california-signature-final-compositor-phase4-independent-reference-renderer.ts");
    const copied = await import(`${pathToFileURL(rendererPath).href}?drift=${Date.now()}`) as {
      renderCaliforniaPhase4IndependentReferenceCandidate(): Promise<unknown>;
    };
    appendFileSync(path.join(directoryPath,
      "california-signature-final-compositor-phase4-independent-reference-scene-registry.ts"),
    "\n// deterministic post-import replacement attack\n", "utf8");
    await assert.rejects(
      () => copied.renderCaliforniaPhase4IndependentReferenceCandidate(),
      /diagnostic on-disk.*drifted since module load/i
    );
  } finally {
    rmSync(directoryPath, { force: true, recursive: true });
  }
});

test("scene registry independently binds the exact authenticated targets and rejects metadata echo",
async () => {
  const subjects = await phase4Fixture.createHarness({ acceptedReceipt: "valid" }).subjects();
  const independentlyDerivedTargets = structuredClone(subjects.calibrationTargets);
  assert.deepEqual(
    CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES.map((entry) => entry.target),
    independentlyDerivedTargets
  );
  assert.equal(
    independentlySha256(independentlyStableJson(independentlyDerivedTargets)),
    CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256
  );
  for (const entry of CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry.target), true);
    assert.equal(Object.isFrozen(entry.target.backingSize), true);
    assert.equal(Object.isFrozen(entry.scene), true);
    assert.doesNotMatch(independentlyStableJson(entry.scene),
      /classId|targetSha256|bindingKey|projectName|backingSize/);
  }
  assert.throws(() => {
    (CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES[0]!.target.backingSize as
      { width: number }).width += 1;
  }, TypeError);

  const forged = structuredClone(CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES);
  forged[0]!.target.targetSha256 = "0".repeat(64);
  await assert.rejects(
    () => (renderCaliforniaPhase4IndependentReferenceCandidate as unknown as
      (metadata: unknown) => Promise<unknown>)(forged),
    /takes no caller-authored scene or target/i
  );

  const first = await renderCaliforniaPhase4IndependentReferenceCandidate();
  const firstPixels = first.rasters[0]!.readPixels();
  const originalFirstByte = firstPixels[0]!;
  firstPixels[0] = originalFirstByte ^ 0xff;
  const second = await renderCaliforniaPhase4IndependentReferenceCandidate();
  assert.equal(first.rasters[0]!.readPixels()[0], originalFirstByte);
  assert.equal(second.rasters[0]!.readPixels()[0], originalFirstByte);
  assert.equal(second.candidateSha256, first.candidateSha256);
  assert.equal(second.targetPlanSha256,
    CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256);
});

test("producer reports bounded diagnostic on-disk checkpoints without lifecycle provenance claims",
async () => {
  const candidate = await renderCaliforniaPhase4IndependentReferenceCandidate();
  const diagnostic = candidate.producer.diagnosticOnDiskIdentity;
  assert.deepEqual(candidate.producer, {
    browserScreenshotReadback: false,
    diagnosticOnDiskIdentity: diagnostic,
    importsTestedComponent: false,
    renderer: "independent-pure-node-software-renderer",
    samePageCanvasReadback: false
  });
  assert.equal(diagnostic.scope,
    "diagnostic-on-disk-path-snapshots-not-loaded-code-or-process-image-proof");
  assert.equal(diagnostic.unchanged, true);
  assert.equal(diagnostic.beforeOperationSnapshotSha256,
    diagnostic.moduleLoadSnapshot.snapshotSha256);
  assert.equal(diagnostic.afterOperationSnapshotSha256,
    diagnostic.moduleLoadSnapshot.snapshotSha256);
  const { checkpointSha256, ...checkpointBase } = diagnostic;
  assert.equal(checkpointSha256,
    independentlySha256(independentlyStableJson(checkpointBase)));
  const { snapshotSha256, ...snapshotBase } = diagnostic.moduleLoadSnapshot;
  assert.equal(snapshotSha256,
    independentlySha256(independentlyStableJson(snapshotBase)));
  assert.deepEqual(diagnostic.moduleLoadSnapshot.sourceFiles.map((source) => source.fileName), [
    "california-signature-final-compositor-phase4-independent-reference-renderer-contract.ts",
    "california-signature-final-compositor-phase4-independent-reference-renderer.ts",
    "california-signature-final-compositor-phase4-independent-reference-scene-registry.ts"
  ]);
  for (const source of diagnostic.moduleLoadSnapshot.sourceFiles) {
    const bytes = readFileSync(path.join(TEST_DIRECTORY, source.fileName));
    assert.equal(source.path, path.join(TEST_DIRECTORY, source.fileName));
    assert.equal(source.realPath, source.path);
    assert.equal(source.byteCount, bytes.length);
    assert.equal(source.fileSha256, independentlySha256(bytes));
    assert.equal(source.nlink, 1);
    assert.doesNotMatch(bytes.toString("utf8"),
      /components\/visualizations\/signature|from\s+["'][^"']*AbsoluteValueLab|from\s+["'][^"']*ShapesLab|getImageData|toDataURL|page\.screenshot|chromium|playwright|sharp|writeFile|appendFile|mkdir|mkdtemp/iu);
  }
  const nodeExecutable = diagnostic.moduleLoadSnapshot.nodeExecutable;
  const nodeBytes = readFileSync(realpathSync(process.execPath));
  assert.equal(nodeExecutable.path, realpathSync(process.execPath));
  assert.equal(nodeExecutable.realPath, nodeExecutable.path);
  assert.equal(nodeExecutable.byteCount, nodeBytes.length);
  assert.equal(nodeExecutable.fileSha256, independentlySha256(nodeBytes));
  assert.deepEqual({
    formalExecutionAuthorized: candidate.formalExecutionAuthorized,
    humanReviewReceiptAvailable: candidate.humanReviewReceiptAvailable,
    independentExpectedRasterAvailable: candidate.independentExpectedRasterAvailable,
    status: candidate.status
  }, {
    formalExecutionAuthorized: false,
    humanReviewReceiptAvailable: false,
    independentExpectedRasterAvailable: false,
    status: "diagnostic-independent-reference-raster-candidate-v1"
  });
  assert.equal("reviewerReceiptSha256" in candidate, false);
});

test("independent comparator detects first, middle, last, alpha, and dimension drift", async (t) => {
  const candidate = await renderCaliforniaPhase4IndependentReferenceCandidate();
  const expected = candidate.rasters[0]!;
  const expectedPixels = expected.readPixels();
  const base = {
    backingHeight: expected.backingHeight,
    backingWidth: expected.backingWidth,
    classId: expected.classId,
    targetSha256: expected.targetSha256
  };

  const exact = await compareCaliforniaPhase4IndependentReferenceObservation({
    ...base,
    pixels: Uint8Array.from(expectedPixels)
  });
  assert.deepEqual({
    firstMismatchPixelIndex: exact.firstMismatchPixelIndex,
    formalExecutionAuthorized: exact.formalExecutionAuthorized,
    independentExpectedRasterAvailable: exact.independentExpectedRasterAvailable,
    matches: exact.matches,
    mismatchPixelCount: exact.mismatchPixelCount
  }, {
    firstMismatchPixelIndex: null,
    formalExecutionAuthorized: false,
    independentExpectedRasterAvailable: false,
    matches: true,
    mismatchPixelCount: 0
  });
  const { comparisonSha256: exactComparisonSha256, ...exactBase } = exact;
  assert.equal(exactComparisonSha256,
    independentlySha256(independentlyStableJson(exactBase)));

  for (const [name, pixelIndex, channel] of [
    ["first-pixel", 0, 0],
    ["middle-pixel", Math.floor(expected.backingWidth * expected.backingHeight / 2), 1],
    ["last-pixel", expected.backingWidth * expected.backingHeight - 1, 2],
    ["alpha", Math.floor(expected.backingWidth * expected.backingHeight / 3), 3]
  ] as const) {
    await t.test(name, async () => {
      const pixels = Uint8Array.from(expectedPixels);
      const byteIndex = pixelIndex * 4 + channel;
      pixels[byteIndex] = pixels[byteIndex]! ^ 0xff;
      const comparison = await compareCaliforniaPhase4IndependentReferenceObservation({
        ...base, pixels
      });
      assert.equal(comparison.matches, false);
      assert.equal(comparison.mismatchPixelCount, 1);
      assert.equal(comparison.firstMismatchPixelIndex, pixelIndex);
      assert.notEqual(comparison.currentPixelsSha256, comparison.expectedPixelsSha256);
      const { comparisonSha256, ...comparisonBase } = comparison;
      assert.equal(comparisonSha256,
        independentlySha256(independentlyStableJson(comparisonBase)));
    });
  }

  await t.test("dimension", async () => {
    await assert.rejects(
      () => compareCaliforniaPhase4IndependentReferenceObservation({
        ...base,
        backingWidth: base.backingWidth + 1,
        pixels: Uint8Array.from(expectedPixels)
      }),
      /dimensions drifted/i
    );
  });
  await t.test("target-identity", async () => {
    await assert.rejects(
      () => compareCaliforniaPhase4IndependentReferenceObservation({
        ...base,
        pixels: Uint8Array.from(expectedPixels),
        targetSha256: "0".repeat(64)
      }),
      /target identity drifted/i
    );
  });
  await t.test("unreviewed-class", async () => {
    await assert.rejects(
      () => compareCaliforniaPhase4IndependentReferenceObservation({
        ...base,
        classId: "caller-authored-class",
        pixels: Uint8Array.from(expectedPixels)
      }),
      /class is not reviewed/i
    );
  });
});

test("four deterministic RGBA identities bind dimensions, class, project, binding, scene, and target",
async () => {
  const candidate = await renderCaliforniaPhase4IndependentReferenceCandidate();
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.producer), true);
  assert.equal(Object.isFrozen(candidate.producer.diagnosticOnDiskIdentity), true);
  assert.equal(Object.isFrozen(
    candidate.producer.diagnosticOnDiskIdentity.moduleLoadSnapshot.sourceFiles), true);
  assert.equal(Object.isFrozen(candidate.rasters), true);
  assert.deepEqual(candidate.rasters.map(({ readPixels: _readPixels, ...identity }) => identity), [
    {
      backingHeight: 1100,
      backingWidth: 1440,
      bindingKey: "AbsoluteValueLab/canvasRef/ctx@0",
      classId: "desktop-chrome-source-dpr-cap-2",
      pixelByteCount: 6_336_000,
      projectName: "desktop-chrome",
      rgbaSha256: "31e92b4f0624470678616a311f027f2b9d9e66e3ff9e09169bd1411b1310e064",
      sceneId: "absolute-value-fold-m1-b0-complete-v1",
      sceneSha256: "508eb4b97758824bd4103b99956d7ba6b8dfb3e42142b805878995b770746812",
      targetSha256: "e5b3670a1310313f65208da19b5fcefe4898fa28f0fc323acec92a48462c4660"
    },
    {
      backingHeight: 1100,
      backingWidth: 1440,
      bindingKey: "ShapesLab/canvasRef/ctx@0",
      classId: "desktop-chrome-source-dpr-cap-3",
      pixelByteCount: 6_336_000,
      projectName: "desktop-chrome",
      rgbaSha256: "9914f55de2617ef560239e53354a08aef54f0e1cf6e3bb6f1ed4ea94dac4edec",
      sceneId: "square-equal-closed-turn0-size3-v1",
      sceneSha256: "8fe679208667d5bc59bb6eef6884efee47360b0187a0e3d5ee955c615b3d5463",
      targetSha256: "87c4ef8bc22aceb92afe30506e7e951e375c6655cd4729f2ad000d06d6a7bc4a"
    },
    {
      backingHeight: 1454,
      backingWidth: 786,
      bindingKey: "AbsoluteValueLab/canvasRef/ctx@0",
      classId: "mobile-chrome-source-dpr-cap-2",
      pixelByteCount: 4_571_376,
      projectName: "mobile-chrome",
      rgbaSha256: "27e79e575c3ae208496ec33c85030c60642d79c2fdce85cde85e5c9e5209589f",
      sceneId: "absolute-value-fold-m1-b0-complete-v1",
      sceneSha256: "508eb4b97758824bd4103b99956d7ba6b8dfb3e42142b805878995b770746812",
      targetSha256: "8b084085ccb19535bbe136044551a5f3711a91887d9cc7a1dabe02194149081f"
    },
    {
      backingHeight: 1999,
      backingWidth: 1081,
      bindingKey: "ShapesLab/canvasRef/ctx@0",
      classId: "mobile-chrome-source-dpr-cap-3",
      pixelByteCount: 8_643_676,
      projectName: "mobile-chrome",
      rgbaSha256: "6733637dc9fa3fc9eaebd5ae34f4dfad6f273f5b27bab6dbd0fd18c0ad545e0f",
      sceneId: "square-equal-closed-turn0-size3-v1",
      sceneSha256: "8fe679208667d5bc59bb6eef6884efee47360b0187a0e3d5ee955c615b3d5463",
      targetSha256: "e23694b1bcfde98786c9bbca9855bf7111645f97b2113085b6c9e0c6cb3d5276"
    }
  ]);
  for (const raster of candidate.rasters) {
    const pixels = raster.readPixels();
    assert.equal(Object.isFrozen(raster), true);
    assert.equal(raster.pixelByteCount,
      raster.backingWidth * raster.backingHeight * 4);
    assert.equal(pixels.length, raster.pixelByteCount);
    assert.equal(independentlySha256(pixels), raster.rgbaSha256);
    assert.equal(pixels.some((byte) => byte !== 0), true);
    let nonOpaqueAlphaCount = 0;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] !== 255) nonOpaqueAlphaCount += 1;
    }
    assert.equal(nonOpaqueAlphaCount, 0,
      `${raster.classId}: independent raster contains non-opaque alpha`);
    const colors = new Set<string>();
    for (let offset = 0; offset < pixels.length; offset += 4) {
      colors.add(`${pixels[offset]},${pixels[offset + 1]},` +
        `${pixels[offset + 2]},${pixels[offset + 3]}`);
    }
    assert.ok(colors.size >= 4,
      `${raster.classId}: independent raster is a uniform or fake fill`);
  }
  for (const raster of candidate.rasters.filter((row) =>
    row.sceneId === "absolute-value-fold-m1-b0-complete-v1")) {
    const pixels = raster.readPixels();
    const center = (Math.round((raster.backingHeight - 1) / 2) * raster.backingWidth +
      Math.round((raster.backingWidth - 1) / 2)) * 4;
    assert.deepEqual([...pixels.slice(center, center + 4)], [200, 30, 79, 255],
      `${raster.classId}: independent absolute-value fold lost its exact vertex`);
  }
  for (const raster of candidate.rasters.filter((row) =>
    row.sceneId === "square-equal-closed-turn0-size3-v1")) {
    const pixels = raster.readPixels();
    const centerX = Math.round((raster.backingWidth - 1) / 2);
    const centerY = Math.round((raster.backingHeight - 1) / 2);
    const half = Math.round(Math.min(raster.backingWidth, raster.backingHeight) * 3_677 /
      (2 * 10_600));
    for (const [x, y] of [
      [centerX - half, centerY - half],
      [centerX + half, centerY - half],
      [centerX + half, centerY + half],
      [centerX - half, centerY + half]
    ]) {
      const offset = (y * raster.backingWidth + x) * 4;
      assert.deepEqual([...pixels.slice(offset, offset + 4)], [47, 111, 159, 255],
        `${raster.classId}: independent square lost one exact corner badge`);
    }
  }
  assert.equal(candidate.sceneRegistrySha256,
    "483925f59483f841a67a33f2e61f63e13db0f172c80ec90a6dae36b8aa64a21a");
  assert.equal(candidate.candidateSha256, independentlyRecomputeCandidateSha256(candidate));
});
