#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PromotionGateError,
  parseCanonicalJsonBytes,
  readAuthoritativeFile,
  readExternalReceiptFile,
  runShadowPilot,
  validateShadowPilot,
  verifyPromotionReceipt
} from "./promotion-gate-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "../..");

function parseCommandLine(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new PromotionGateError("CLI_USAGE", "A Promotion Gate command is required.");
  }
  const command = args[0];
  const allowedByCommand = {
    validate: new Set(["manifest", "json"]),
    shadow: new Set(["manifest", "run-id", "json"]),
    "verify-receipt": new Set(["receipt", "json"])
  };
  const allowed = allowedByCommand[command];
  if (!allowed) {
    throw new PromotionGateError("CLI_USAGE", `Unsupported Promotion Gate command "${String(command)}".`);
  }

  const options = {};
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (typeof token !== "string" || !token.startsWith("--") || token.length <= 2) {
      throw new PromotionGateError("CLI_USAGE", "Promotion Gate accepts named options only.");
    }
    const option = token.slice(2);
    if (!allowed.has(option) || Object.hasOwn(options, option)) {
      throw new PromotionGateError("CLI_USAGE", `Unknown or duplicate option "${token}".`);
    }
    if (option === "json") {
      options.json = true;
      continue;
    }
    const value = args[index + 1];
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new PromotionGateError("CLI_USAGE", `Option "${token}" requires a value.`);
    }
    options[option] = value;
    index += 1;
  }

  if (options.json !== true) {
    throw new PromotionGateError("CLI_USAGE", "The v1 CLI requires --json.");
  }
  if ((command === "validate" || command === "shadow") && typeof options.manifest !== "string") {
    throw new PromotionGateError("CLI_USAGE", `${command} requires --manifest.`);
  }
  if (command === "shadow" && typeof options["run-id"] !== "string") {
    throw new PromotionGateError("CLI_USAGE", "shadow requires --run-id.");
  }
  if (command === "verify-receipt" && typeof options.receipt !== "string") {
    throw new PromotionGateError("CLI_USAGE", "verify-receipt requires --receipt.");
  }
  return { command, options };
}

async function executeCommand(args, { repoRoot, producedAt }) {
  const { command, options } = parseCommandLine(args);
  if (command === "validate") {
    return validateShadowPilot(repoRoot, { manifestPath: options.manifest, producedAt });
  }
  if (command === "shadow") {
    return runShadowPilot(repoRoot, {
      manifestPath: options.manifest,
      runId: options["run-id"],
      producedAt
    });
  }

  const loaded = path.isAbsolute(options.receipt)
    ? await readExternalReceiptFile(options.receipt)
    : await readAuthoritativeFile(repoRoot, options.receipt);
  let receipt;
  try {
    receipt = parseCanonicalJsonBytes(loaded.bytes, "RECEIPT_JSON_INVALID", "Promotion receipt");
  } catch {
    throw new PromotionGateError("RECEIPT_JSON_INVALID", "Promotion receipt is not valid JSON.");
  }
  const verified = await verifyPromotionReceipt(repoRoot, receipt, { producedAt });
  return {
    schemaVersion: "promotion-receipt-verification.v1",
    result: verified.result,
    manifestPath: verified.manifestPath,
    manifestDigest: verified.manifestDigest,
    semanticReceiptDigest: verified.semanticReceiptDigest,
    rawReceiptDigest: verified.rawReceiptDigest
  };
}

export async function runCli(args, {
  repoRoot = defaultRepoRoot,
  producedAt = new Date().toISOString(),
  writeStdout = (text) => process.stdout.write(text)
} = {}) {
  let exitCode;
  let payload;
  try {
    payload = await executeCommand(args, { repoRoot, producedAt });
    exitCode = payload.result === "blocked" ? 2 : payload.result === "fail" ? 1 : 0;
  } catch (error) {
    if (error instanceof PromotionGateError) {
      const blocked = error.outcome === "blocked";
      payload = {
        schemaVersion: "promotion-gate-error.v1",
        result: blocked ? "blocked" : "fail",
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details })
      };
      exitCode = blocked ? 2 : 1;
    } else {
      payload = {
        schemaVersion: "promotion-gate-error.v1",
        result: "internal",
        code: "INTERNAL_ERROR",
        message: "Internal Promotion Gate error."
      };
      exitCode = 3;
    }
  }
  writeStdout(`${JSON.stringify(payload)}\n`);
  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  process.exitCode = await runCli(process.argv.slice(2));
}
