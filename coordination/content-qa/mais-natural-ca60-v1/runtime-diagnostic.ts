import { pathToFileURL } from "node:url";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v4/design-registration.json";
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  auditRuntimeHomologyV1,
} from "./clustering-audit.mjs";
import {
  createQuestionStoreCaliforniaAdapterV1,
} from "./question-store-source";
import {
  extractCaliforniaRuntimeInventoryV1,
} from "./runtime-extractor";

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function runRuntimeDiagnosticV1({
  createdAt = new Date().toISOString(),
}: {
  createdAt?: string;
} = {}) {
  const inventory = await extractCaliforniaRuntimeInventoryV1({
    adapter: createQuestionStoreCaliforniaAdapterV1(),
  });
  const homology = auditRuntimeHomologyV1({ itemRecords: inventory.itemRecords });
  const blockingAnomalyCounts = Object.fromEntries(
    [...homology.blockingAnomalies.reduce((counts: Map<string, number>, anomaly: { code: string }) => {
      counts.set(anomaly.code, (counts.get(anomaly.code) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()).entries()].sort(([left], [right]) => codePointCompare(left, right)),
  );
  const largest = [...homology.largest20Components]
    .sort((left, right) => right.itemCount - left.itemCount)[0] ?? null;
  const body = {
    schemaVersion: "RuntimeDiagnosticAggregateReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    designLifecycleStatus: DESIGN_REGISTRATION.lifecycleStatus,
    diagnosticOnly: true,
    sourceCleanProofBound: false,
    frameFreezeAuthorized: false,
    sampleFreezeAuthorized: false,
    runtimeSemanticChecksPassed: inventory.freezeEligible,
    homologyChecksPassed: homology.freezeEligible,
    runtimeVisibleItemCount: inventory.runtimeVisibleItemCount,
    independentClusterCount: homology.clusterCount,
    singletonCount: homology.singletonCount,
    singletonRate: homology.singletonRate,
    edgeCount: homology.edgeCount,
    largestComponentItemCount: largest?.itemCount ?? 0,
    largestComponentShare: largest?.frameShare ?? 0,
    gradeCounts: inventory.gradeProjectionInvocations.map(({ grade, itemCount }) => ({ grade, itemCount })),
    frameFailureCount: inventory.frameFailureLedger.length,
    blockingAnomalyCounts,
    runtimeInventoryRootHash: inventory.itemRecordRootHash,
    homologyAuditRootHash: homology.auditRootHash,
    claimCeiling: "DIAGNOSTIC_ONLY_NOT_A_FRAME_REGISTRATION",
    providerRequestCount: 0,
    createdAt,
  };
  return Object.freeze({ ...body, receiptHash: calculateArtifactHash(body, "receiptHash") });
}

async function main() {
  const unknown = process.argv.slice(2);
  if (unknown.length > 0) throw new TypeError(`unknown argument(s): ${unknown.join(", ")}`);
  process.stdout.write(`${JSON.stringify(await runRuntimeDiagnosticV1())}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "RuntimeDiagnosticFailureV1",
      diagnosticOnly: true,
      providerRequestCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    })}\n`);
    process.exitCode = 1;
  });
}
