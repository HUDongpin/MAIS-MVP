import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildCaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceEvidenceOracleRow
} from "./california-signature-source-expected-provider";
import {
  assertCaliforniaSignatureExhaustiveMatrixComplete,
  assertCaliforniaSignatureExternalEvidenceOwnership,
  assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact,
  assertCaliforniaSignatureSourceOracleEvidenceMatrixExact,
  buildCaliforniaSignatureExternalEvidenceExpectations,
  buildCaliforniaSignatureSourceOracleCanvasReceiptMatrix,
  californiaSignaturePhaseIndependentOracleRowKeyFromRecord,
  expandCaliforniaSignatureSourceEvidenceOracle,
  type CaliforniaSignatureCanvasReceiptObservation,
  type CaliforniaSignatureExactEvidenceRecord,
  type CaliforniaSignatureExpandedSourceEvidenceExpectation
} from "./california-signature-exhaustive-qa";
import { buildCaliforniaSignatureArtifactValidationContext } from
  "./california-signature-exhaustive-artifact-lifecycle";

const manifest = buildCaliforniaSignatureSourceManifest();
const sourceOracle = (() => {
  let promise: ReturnType<typeof buildCaliforniaSignatureSourceExpectedEvidenceOracle> | null = null;
  return () => promise ??= buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
})();

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function tinyContext() {
  const oracle = await sourceOracle();
  const expectedRuntimeRunId = "ca-source-oracle-integration-run-0001";
  return buildCaliforniaSignatureArtifactValidationContext({
    expectedBenchIds: ["AreaLab"],
    externalExpectations: buildCaliforniaSignatureExternalEvidenceExpectations({
      expectedOrigin: "http://127.0.0.1:3199",
      expectedRuntimeRunId,
      manifest
    }),
    manifest,
    sourceEvidenceOracle: oracle
  });
}

function recordFromExpectation(
  expectation: CaliforniaSignatureExpandedSourceEvidenceExpectation,
  manifestForOracle: ReturnType<typeof buildCaliforniaSignatureSourceManifest>,
  rowByKey: ReadonlyMap<string, CaliforniaSignatureSourceEvidenceOracleRow>
): CaliforniaSignatureExactEvidenceRecord {
  const row = rowByKey.get(expectation.oracleRowKey);
  assert.ok(row, `tiny source oracle lost row ${expectation.oracleRowKey}`);
  const resetEvidence = row.activationEndpoint === null && row.combinationActivations === null ? null : ({
    activeBenchRestored: true,
    canvasReady: true,
    canvasReplaced: true,
    defaultControlFingerprint: "integration-control-default",
    defaultModelFingerprint: "integration-model-default",
    defaultSurfaceFingerprint: "integration-surface-default",
    defaultSurfaceStable: true,
    restoredControlFingerprint: "integration-control-default",
    restoredDefault: true,
    restoredModelFingerprint: "integration-model-default",
    restoredSurfaceFingerprint: "integration-surface-default",
    restoredSurfaceStable: true,
    surfaceChangedPixelRatio: 0,
    surfaceComparison: "stable-pixel-tolerance" as const,
    surfaceEdgeMismatchRatio: 0,
    surfaceMeanAbsoluteDiffRatio: 0
  } as const);
  const record: CaliforniaSignatureExactEvidenceRecord = {
    axisId: expectation.axisId,
    benchId: row.benchId,
    branchPath: [...row.branchPath],
    canvasGraphicsContrastAck: null,
    canvasGraphicsEvidence: null,
    canvasGraphicsEvidenceSha256: null,
    canvasGraphicsNodeAck: null,
    combinationActivations: row.combinationActivations,
    endpoint: row.activationEndpoint,
    instanceKey: row.instanceKey,
    key: "integration-placeholder",
    labId: "integration-placeholder",
    layoutSettleEvidence: null,
    layoutSettleEvidenceSha256: null,
    numericMidpoint: row.numericMidpoint,
    phase: expectation.phase,
    resetEvidence,
    resetEvidenceSha256: resetEvidence === null ? null : sha256(stableJson(resetEvidence)),
    sourceEndpoint: row.sourceEndpoint,
    sourceSiteKey: row.sourceSiteKey,
    stepKey: row.stepKey
  };
  assert.equal(
    californiaSignaturePhaseIndependentOracleRowKeyFromRecord({
      manifest: manifestForOracle,
      record
    }),
    expectation.oracleRowKey,
    `${row.benchId}/${row.stepKey}/${row.rowKind}: source row is not reconstructible from evidence`
  );
  return record;
}

test("independent source oracle expansion rejects missing, extra, duplicate, and wrong-phase evidence", async () => {
  const context = await tinyContext();
  const oracle = context.sourceEvidenceOracle;
  const subsetManifest = context.manifest;
  const expanded = expandCaliforniaSignatureSourceEvidenceOracle({ manifest: subsetManifest, oracle });
  const rowByKey = new Map<string, CaliforniaSignatureSourceEvidenceOracleRow>();
  for (const row of iterateCaliforniaSignatureSourceEvidenceOracleRows({
    manifest: subsetManifest,
    oracle
  })) {
    assert.equal(rowByKey.has(row.key), false, `tiny source oracle repeated row ${row.key}`);
    rowByKey.set(row.key, row);
    assert.ok(rowByKey.size <= 4_096,
      "tiny source-oracle integration fixture exceeded its bounded row index");
  }
  const evidence = expanded.map((expectation) =>
    recordFromExpectation(expectation, subsetManifest, rowByKey));
  assert.ok(expanded.length > 38);
  assert.doesNotThrow(() => assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
    evidence,
    manifest: subsetManifest,
    oracle
  }));
  assert.throws(() => assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
    evidence: evidence.slice(1),
    manifest: subsetManifest,
    oracle
  }), /missing=.*extra=/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
    evidence: [...evidence, { ...evidence[0]!, axisId: "invented-axis" }],
    manifest: subsetManifest,
    oracle
  }), /extra=\[[^\]]+\]/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
    evidence: [...evidence, evidence[0]!],
    manifest: subsetManifest,
    oracle
  }), /duplicate actual keys/i);
  const functionalEndpointIndex = evidence.findIndex((record) =>
    record.phase === "functional" && record.endpoint !== null
  );
  assert.ok(functionalEndpointIndex >= 0);
  const wrongPhase = [...evidence];
  wrongPhase[functionalEndpointIndex] = {
    ...wrongPhase[functionalEndpointIndex]!,
    axisId: "desktop-en-light",
    phase: "structural"
  };
  assert.throws(() => assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
    evidence: wrongPhase,
    manifest: subsetManifest,
    oracle
  }), /missing=.*extra=/i);
});

test("Canvas receipt matrix is source-oracle owned and rejects count, binding, row, and run drift", async () => {
  const context = await tinyContext();
  const oracle = context.sourceEvidenceOracle;
  const expected = buildCaliforniaSignatureSourceOracleCanvasReceiptMatrix({
    manifest: context.manifest,
    oracle
  });
  const runtimeRunId = "ca-source-oracle-integration-run-0001";
  const actual: CaliforniaSignatureCanvasReceiptObservation[] = expected.map((entry) => ({
    ...entry,
    bindingKeys: [...entry.bindingKeys],
    runtimeRunId
  }));
  assert.ok(expected.length >= 24);
  assert.doesNotThrow(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual,
    expected,
    expectedRuntimeRunId: runtimeRunId
  }));
  assert.throws(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual: actual.slice(1),
    expected,
    expectedRuntimeRunId: runtimeRunId
  }), /missing=/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual: [...actual, { ...actual[0]!, key: "invented-canvas-row" }],
    expected,
    expectedRuntimeRunId: runtimeRunId
  }), /extra=/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual: actual.map((entry, index) => index === 0
      ? { ...entry, canvasCount: entry.canvasCount + 1 }
      : entry),
    expected,
    expectedRuntimeRunId: runtimeRunId
  }), /count\/binding\/state expectation drifted/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual: actual.map((entry, index) => index === 0
      ? { ...entry, bindingKeys: [...entry.bindingKeys.slice(1), "invented-binding"] }
      : entry),
    expected,
    expectedRuntimeRunId: runtimeRunId
  }), /count\/binding\/state expectation drifted/i);
  assert.throws(() => assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
    actual: actual.map((entry, index) => index === 0
      ? { ...entry, runtimeRunId: "ca-source-oracle-integration-run-wrong" }
      : entry),
    expected,
    expectedRuntimeRunId: runtimeRunId
  }), /self-selected runtime run/i);
});

function ownershipFixture() {
  const runtimeRunId = "ca-source-oracle-integration-run-0001";
  const expectations = buildCaliforniaSignatureExternalEvidenceExpectations({
    expectedOrigin: "http://127.0.0.1:3199",
    expectedRuntimeRunId: runtimeRunId,
    manifest
  });
  const ownership = expectations.routes[0]!;
  const search = new URLSearchParams(
    ownership.searchParams.map((entry) => [entry.name, entry.value])
  );
  const url = `${expectations.expectedOrigin}${ownership.pathname}?${search.toString()}`;
  const record = {
    benchId: ownership.benchId,
    canvasGraphicsContrastAck: { capturedUrl: url, runtimeRunId },
    canvasGraphicsEvidence: {
      canvases: [{ benchId: ownership.benchId }],
      capturedUrl: url,
      runtimeRunId
    },
    canvasGraphicsNodeAck: { runtimeRunId },
    labId: ownership.labId,
    layoutSettleEvidence: {
      contrastContext: { benchId: ownership.benchId, state: "fixture", viewport: "desktop" },
      url
    },
    stepKey: "lesson-step:0"
  } as unknown as CaliforniaSignatureExactEvidenceRecord;
  return { expectations, record, runtimeRunId, url };
}

test("external ownership rejects evidence-selected runtime, origin, route, and lab", () => {
  const { expectations, record } = ownershipFixture();
  assert.doesNotThrow(() => assertCaliforniaSignatureExternalEvidenceOwnership({
    evidence: [record],
    expectations,
    manifest
  }));
  assert.throws(() => assertCaliforniaSignatureExternalEvidenceOwnership({
    evidence: [{
      ...record,
      canvasGraphicsEvidence: {
        ...record.canvasGraphicsEvidence!,
        runtimeRunId: "ca-source-oracle-integration-run-wrong"
      }
    }],
    expectations,
    manifest
  }), /selected its own runtime run/i);
  assert.throws(() => assertCaliforniaSignatureExternalEvidenceOwnership({
    evidence: [{
      ...record,
      canvasGraphicsEvidence: {
        ...record.canvasGraphicsEvidence!,
        capturedUrl: record.canvasGraphicsEvidence!.capturedUrl.replace(
          expectations.expectedOrigin,
          "http://127.0.0.1:3999"
        )
      }
    }],
    expectations,
    manifest
  }), /origin is not externally owned/i);
  const wrongRoute = new URL(record.canvasGraphicsEvidence!.capturedUrl);
  wrongRoute.searchParams.set("lab", "invented-lab");
  assert.throws(() => assertCaliforniaSignatureExternalEvidenceOwnership({
    evidence: [{
      ...record,
      canvasGraphicsEvidence: {
        ...record.canvasGraphicsEvidence!,
        capturedUrl: wrongRoute.href
      }
    }],
    expectations,
    manifest
  }), /route query is not externally owned/i);
  assert.throws(() => assertCaliforniaSignatureExternalEvidenceOwnership({
    evidence: [{ ...record, labId: "invented-lab" }],
    expectations,
    manifest
  }), /selected its own lab ownership/i);
});

test("official aggregate refuses to run without source oracle and external ownership", () => {
  assert.throws(() => assertCaliforniaSignatureExhaustiveMatrixComplete({
    evidence: [],
    manifest
  }), /requires the independent source evidence oracle/i);
});
