import { expect, test as base } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  assertCaliforniaSignatureQaRuntimeMarker,
  buildCaliforniaSignatureExhaustivePackages,
  buildCaliforniaSignatureExternalEvidenceExpectations,
  buildCaliforniaSignatureSourceExecutionGroups,
  californiaSignatureAxesForViewport,
  californiaSignatureContrastProvider,
  parseCaliforniaSignatureShard,
  prepareCaliforniaSignatureExhaustivePage,
  requireCaliforniaSignatureCanvasRuntimeRunId,
  registerCaliforniaSignatureAxisStudent,
  runCaliforniaSignatureEndpointBench,
  runCaliforniaSignatureStructuralBench
} from "./california-signature-exhaustive-qa";
import {
  CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE,
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV,
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
  assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard,
  buildCaliforniaSignatureArtifactValidationContext,
  californiaSignatureArtifactRunIdentityFromEnvironment,
  createCaliforniaSignatureOfficialEvidenceWriter,
  initializeCaliforniaSignatureArtifactRunDirectory,
  persistCaliforniaSignatureFailureDiagnostic,
  persistCaliforniaSignatureSuccessfulArtifact,
  readCaliforniaSignatureExecutionGroupOwnershipManifest
} from "./california-signature-exhaustive-artifact-lifecycle";
import {
  assertCaliforniaSignatureSourceTargetsResolved,
  buildCaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  californiaSignatureSourceExpectedProvider
} from "./california-signature-source-expected-provider";
import {
  CaliforniaBrowserDiagnostics,
  installCaliforniaVisualizationUiAuditProtocolEpoch
} from "./california-visualization-qa-helpers";

const test = base.extend<{ californiaVisualizationUiAuditProtocolOwner: void }>({
  californiaVisualizationUiAuditProtocolOwner: [async ({ context }, use) => {
    expect(
      installCaliforniaVisualizationUiAuditProtocolEpoch(context),
      "California formal UI audit protocol owner must install before Page creation"
    ).toBe(true);
    await use();
  }, { auto: true }]
});

const ledgerRootFromEnvironment = process.env.CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR?.trim() ?? "";
const executionPlanPath = process.env.CA_SIGNATURE_EXECUTION_GROUP_PLAN_PATH?.trim() ?? "";
const executionPlanSha256 = process.env.CA_SIGNATURE_EXECUTION_GROUP_PLAN_SHA256?.trim() ?? "";
const sourceSnapshotSha256 = process.env.CA_VIZ_SOURCE_SNAPSHOT_SHA256?.trim() ?? "";
assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard(
  process.env[CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV]
);
assert.ok(path.isAbsolute(ledgerRootFromEnvironment),
  "CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR is required before execution-plan discovery");
const executionPlan = readCaliforniaSignatureExecutionGroupOwnershipManifest({
  allowedRoot: path.dirname(ledgerRootFromEnvironment),
  expectedSha256: executionPlanSha256,
  expectedSourceSnapshotSha256: sourceSnapshotSha256,
  manifestPath: executionPlanPath
}).manifest;
const manifest = buildCaliforniaSignatureSourceManifest();
const sourceEvidenceOraclePromise = buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
const shard = parseCaliforniaSignatureShard();
const legacyBenchPackages = buildCaliforniaSignatureExhaustivePackages(
  manifest,
  CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE
);
const benchTargetById = new Map<string, typeof legacyBenchPackages[number]["benches"][number]>(
  legacyBenchPackages.flatMap((workPackage) =>
    workPackage.benches.map((target) => [target.bench.benchId, target] as const)
  )
);
assert.equal(benchTargetById.size, manifest.benches.length,
  "California execution-plan bench target inventory drifted");
const shardIndex = shard?.index ?? null;
const shardTotal = shard?.total ?? null;
const packages = shardIndex !== null && shardTotal !== null
  ? executionPlan.packages.filter((_, index) => index % shardTotal === shardIndex - 1)
  : [...executionPlan.packages];

test.describe.configure({ mode: "serial", retries: 0 });

for (const workPackage of packages) {
  test(`${workPackage.packageId} exhausts source-attributed lesson/control states`, async ({ page, baseURL }, testInfo) => {
    test.setTimeout(24 * 60 * 60_000);
    expect(baseURL, "PLAYWRIGHT_BASE_URL is required for diagnostic ownership").toBeTruthy();
    const runtimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId();
    const runtimeMarkers = await assertCaliforniaSignatureQaRuntimeMarker({ manifest });
    const identity = californiaSignatureArtifactRunIdentityFromEnvironment({
      actualOrigin: baseURL!,
      markers: runtimeMarkers,
      runtimeRunId
    });
    const ledgerRoot = process.env.CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR?.trim();
    expect(ledgerRoot, "CA_SIGNATURE_EXHAUSTIVE_LEDGER_DIR is required").toBeTruthy();
    await initializeCaliforniaSignatureArtifactRunDirectory({ identity, ledgerRoot: ledgerRoot! });
    const sourceEvidenceOracle = await sourceEvidenceOraclePromise;
    const viewport = testInfo.project.name.includes("mobile") ? "mobile" :
      testInfo.project.name.includes("desktop") ? "desktop" : null;
    expect(CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS).toContain(testInfo.project.name);
    expect(testInfo.repeatEachIndex, "California signature exhaustive repeatEach must remain frozen at 1").toBe(0);
    expect(viewport, `project ${testInfo.project.name} must explicitly identify desktop or mobile`).toBeTruthy();
    const axes = californiaSignatureAxesForViewport(viewport!);
    const projectName = testInfo.project.name as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
    const projectSlice = workPackage.projects.find((candidate) =>
      candidate.projectName === projectName);
    expect(projectSlice,
      `${workPackage.packageId}: execution plan lacks project ${projectName}`).toBeTruthy();
    const executionGroupOwnership = {
      cropCount: projectSlice!.cropCount,
      expectedRecordCount: projectSlice!.expectedRecordCount,
      groupKeys: [...projectSlice!.groupKeys],
      planSha256: executionPlan.capacityPlanSha256,
      receiptCount: projectSlice!.receiptCount,
      schemaVersion: executionPlan.schemaVersion,
      sourceIdentitySha256: executionPlan.sourceIdentitySha256,
      sourceSnapshotSha256: executionPlan.sourceSnapshotSha256
    } as const;
    const validationContext = buildCaliforniaSignatureArtifactValidationContext({
      executionGroupOwnership,
      expectedBenchIds: projectSlice!.benchIds,
      externalExpectations: buildCaliforniaSignatureExternalEvidenceExpectations({
        expectedOrigin: identity.origin,
        expectedRuntimeRunId: identity.runtimeRunId,
        manifest
      }),
      manifest,
      projectName,
      sourceEvidenceOracle
    });
    const sourceExecutionGroups = buildCaliforniaSignatureSourceExecutionGroups({
      benchIds: projectSlice!.benchIds,
      manifest,
      oracle: sourceEvidenceOracle,
      projectName
    }).filter((group) => executionGroupOwnership.groupKeys.includes(
      [projectName, group.benchId, group.axisId, group.phase].join("\0")
    ));
    expect(sourceExecutionGroups.map((group) =>
      [projectName, group.benchId, group.axisId, group.phase].join("\0")
    ), `${workPackage.packageId}/${projectName}: source execution plan group union drifted`
    ).toEqual(executionGroupOwnership.groupKeys);
    const axisById = new Map([...axes.functional, ...axes.layout, ...axes.structural]
      .map((axis) => [axis.id, axis]));
    expect(sourceExecutionGroups.every((group) => axisById.has(group.axisId)),
      `${workPackage.packageId}: project axis map is incomplete`).toBe(true);
    const evidenceWriter = await createCaliforniaSignatureOfficialEvidenceWriter({
      executionGroupOwnership,
      identity,
      ledgerRoot: ledgerRoot!,
      manifest: validationContext.manifest,
      packageId: workPackage.packageId,
      projectName,
      repeatEachIndex: testInfo.repeatEachIndex,
      shard
    });
    let evidenceStream: Awaited<ReturnType<typeof evidenceWriter.finalize>> | null = null;
    let diagnostics: CaliforniaBrowserDiagnostics | null = null;
    try {
      assertCaliforniaSignatureSourceTargetsResolved(manifest);
      await californiaSignatureSourceExpectedProvider.assertReady(manifest);
      await prepareCaliforniaSignatureExhaustivePage(page, {
        benchIds: projectSlice!.benchIds,
        runtimeRunId
      });
      diagnostics = new CaliforniaBrowserDiagnostics(page, baseURL!);
      const hydrateByAxisAndGrade = new Map<string, Awaited<ReturnType<
        typeof registerCaliforniaSignatureAxisStudent
      >>>();
      for (const group of sourceExecutionGroups) {
        const axis = axisById.get(group.axisId);
        expect(axis, `${workPackage.packageId}: source schedule cites missing axis ${group.axisId}`).toBeTruthy();
        const target = benchTargetById.get(group.benchId);
        expect(target, `${workPackage.packageId}: source schedule cites missing bench ${group.benchId}`).toBeTruthy();
        const hydrateKey = `${group.axisId}\0${target!.visit.lab.grade}`;
        let hydrate = hydrateByAxisAndGrade.get(hydrateKey);
        if (!hydrate) {
          hydrate = await registerCaliforniaSignatureAxisStudent({
            axis: axis!,
            grade: target!.visit.lab.grade,
            page,
            testInfo
          });
          hydrateByAxisAndGrade.set(hydrateKey, hydrate);
        }
        await hydrate(target!.visit.lab);
        const groupEvidence = group.phase === "structural"
          ? await runCaliforniaSignatureStructuralBench({
              axis: axis!,
              bench: target!.bench,
              contrastProvider: californiaSignatureContrastProvider,
              diagnostics,
              page,
              sourceExpectedProvider: californiaSignatureSourceExpectedProvider,
              visit: target!.visit
            })
          : await runCaliforniaSignatureEndpointBench({
              axis: axis!,
              bench: target!.bench,
              contrastProvider: californiaSignatureContrastProvider,
              diagnostics,
              page,
              phase: group.phase,
              sourceEvidenceOracle,
              sourceExpectedProvider: californiaSignatureSourceExpectedProvider,
              sourceManifest: manifest,
              visit: target!.visit
            });
        expect(groupEvidence.length,
          `${workPackage.packageId}/${group.benchId}/${group.axisId}/${group.phase}: source group was sampled`
        ).toBe(group.expectedRecordCount);
        await evidenceWriter.appendBatch(groupEvidence);
      }
      diagnostics?.dispose();
      diagnostics = null;
      // Close the browser page inside the guarded package lifecycle. A close
      // failure is diagnostic-only and can never leave an accepted artifact.
      await page.close({ runBeforeUnload: false });
      evidenceStream = await evidenceWriter.finalize();
    } catch (error) {
      diagnostics?.dispose();
      await evidenceWriter.abort();
      try {
        await persistCaliforniaSignatureFailureDiagnostic({
          error,
          identity,
          ledgerRoot: ledgerRoot!,
          packageId: workPackage.packageId,
          projectName: testInfo.project.name,
          shard,
          streamDiagnostic: evidenceWriter.diagnostic(),
          testInfo
        });
      } catch (diagnosticError) {
        throw new AggregateError(
          [error, diagnosticError],
          `${workPackage.packageId}: exhaustive package failed and its failure diagnostic was not durable`
        );
      }
      throw error;
    }
    expect(evidenceStream, `${workPackage.packageId}: evidence stream did not finalize`).toBeTruthy();
    await persistCaliforniaSignatureSuccessfulArtifact({
      evidenceStream: evidenceStream!,
      executionGroupOwnership,
      identity,
      ledgerRoot: ledgerRoot!,
      packageId: workPackage.packageId,
      projectName: testInfo.project.name,
      shard,
      testInfo,
      validationContext
    });
  });
}
