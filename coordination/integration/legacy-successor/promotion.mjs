import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./bootstrap.mjs";

const script = fileURLToPath(import.meta.url);
const root = await realpath(path.resolve(path.dirname(script), "../../.."));
export async function main(args, actualRoot = root) {
  const { validateAttempt, shadowAttempt, verifyStoredReceipt, SuccessorError } = await import("./contract.mjs");
  try {
    const [operation, ...flags] = args;
    if (!["validate", "shadow", "verify-receipt"].includes(operation)) throw new SuccessorError("SUCCESSOR_CLI_USAGE");
    const allowed = operation === "validate" ? ["manifest", "json"] : operation === "shadow" ? ["manifest", "run-id", "json"] : ["receipt", "storage-commit", "receipt-sha256", "json"];
    const options = {};
    for (let i = 0; i < flags.length; i++) {
      const key = flags[i].startsWith("--") ? flags[i].slice(2) : "";
      if (!allowed.includes(key) || Object.hasOwn(options, key)) throw new SuccessorError("SUCCESSOR_CLI_USAGE");
      if (key === "json") options[key] = true;
      else { const value = flags[++i]; if (!value || value.startsWith("--")) throw new SuccessorError("SUCCESSOR_CLI_USAGE"); options[key] = value; }
    }
    if (options.json !== true) throw new SuccessorError("SUCCESSOR_CLI_USAGE");
    let result;
    if (operation === "validate") result = await validateAttempt(actualRoot, options.manifest);
    else if (operation === "shadow") result = await shadowAttempt(actualRoot, options.manifest, options["run-id"]);
    else {
      result = await verifyStoredReceipt(actualRoot, options.receipt, options["storage-commit"], options["receipt-sha256"]);
    }
    process.stdout.write(`${JSON.stringify(result)}\n`); return 0;
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{2,95}$/u.test(error.code ?? "") ? error.code : "SUCCESSOR_INTERNAL_ERROR";
    const internal = code === "SUCCESSOR_INTERNAL_ERROR" || code === "ETIMEDOUT" || code.includes("TIMEOUT");
    process.stdout.write(`${JSON.stringify({ schemaVersion: "promotion-legacy-successor-error.v1", result: internal ? "internal" : "blocked", code, liveAllowed: false })}\n`);
    return internal ? 3 : 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === script) process.exitCode = await launch(root, process.argv.slice(2));
