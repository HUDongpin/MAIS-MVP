// Captured release worker. Only the authenticated CLI launches this file.
import { readFileSync } from "node:fs";
import { parse } from "./common.mjs";
import { validateAttempt } from "./contract.mjs";
import {
  shadowAttempt,
  verifyStoredReceipt,
  finalizeFromTransport,
} from "./receipts.mjs";
const [root, requestPath] = process.argv.slice(2);
try {
  const { operation, manifest, runId, transport } = parse(
    readFileSync(requestPath),
  );
  let result;
  if (operation === "validate") result = await validateAttempt(root, manifest);
  else if (operation === "shadow")
    result = await shadowAttempt(root, manifest, runId);
  else if (operation === "verify-receipt")
    result = await verifyStoredReceipt(root, manifest, transport);
  else if (operation === "finalize")
    result = await finalizeFromTransport(root, manifest, transport);
  else throw new Error("CA_USAGE");
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (e) {
  process.stdout.write(
    JSON.stringify({
      result: "blocked",
      code: /^CA_[A-Z_]+$/.test(e.code ?? e.message ?? "")
        ? (e.code ?? e.message)
        : "CA_OPERATION_FAILED",
      liveAllowed: false,
    }) + "\n",
  );
  process.exitCode = 2;
}
