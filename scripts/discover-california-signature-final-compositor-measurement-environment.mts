import assert from "node:assert/strict";
import {
  assertCaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication,
  discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment
} from "../tests/e2e/california-signature-final-compositor-real-measurement-producer";

assert.equal(process.argv.length, 2,
  "California final compositor environment discovery accepts no caller-authored options");

const publication = discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment();
assertCaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication(publication);

process.stdout.write(`${JSON.stringify({
  browserContextStarted: publication.receipt.measurementBoundary.browserContextStarted,
  commandCount: publication.receipt.processSuccess.commandCount,
  environmentSha256: publication.receipt.environmentSha256,
  filePath: publication.filePath,
  fileSha256: publication.fileSha256,
  formalExecutionAuthorized: publication.receipt.formalExecutionAuthorized,
  readinessBlockers: publication.receipt.readinessBlockers,
  receiptSha256: publication.receipt.receiptSha256,
  status: publication.receipt.status
})}\n`);
