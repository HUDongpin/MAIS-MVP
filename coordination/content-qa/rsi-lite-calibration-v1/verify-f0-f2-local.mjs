import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyF0F2Artifacts, writeF0F2VerificationReceipt } from "./verify-f0-f2.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return path.resolve(value);
}

try {
  const publicDirectory = optionValue("--public-dir", scriptDirectory);
  const sealedDirectory = optionValue("--sealed-dir", path.join(repositoryRoot, ".local", "rsi-lite-calibration-v1"));
  const protocolPath = optionValue(
    "--protocol",
    path.join(repositoryRoot, "coordination", "research", "2026-08-23-A16-rsi-lite-matched-quadruplets-f0-f2-protocol.md")
  );
  const armContractsPath = optionValue("--arm-contracts", path.join(scriptDirectory, "arm-contracts.md"));
  const receiptPath = optionValue("--receipt", path.join(publicDirectory, "f0-f2-verification-receipt.json"));
  const result = await verifyF0F2Artifacts({ protocolPath, armContractsPath, publicDirectory, sealedDirectory });
  await writeF0F2VerificationReceipt(receiptPath, result);

  if (result.findings.length > 0) {
    process.stderr.write(`F0-F2 local verification failed with ${result.findings.length} finding(s).\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `${result.safeSummary.status}: ${result.safeSummary.counts.packages} sealed packages, ${result.safeSummary.counts.sacrificialReceipts} sacrificial receipts; all independent gates remain false.\n`
    );
  }
} catch (error) {
  process.stderr.write(`F0-F2 local verification failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
