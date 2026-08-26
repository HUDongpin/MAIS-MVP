#!/usr/bin/env node

import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PromotionGateError,
  parseCanonicalJsonBytes,
  readAuthoritativeFile
} from "../promotion-gate-lib.mjs";
import {
  runV2ShadowPilot,
  validateV2ShadowPilot,
  verifyV2PromotionReceipt
} from "./promotion-gate-v2-lib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "../../..");
const RECEIPT_MAX_BYTES = 32 * 1024 * 1024;

export function parseV2CommandLine(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new PromotionGateError("V2_CLI_USAGE", "A Promotion Gate v2 command is required.");
  }
  const command = args[0];
  const allowedByCommand = {
    validate: new Set(["manifest", "json"]),
    shadow: new Set(["manifest", "run-id", "json"]),
    "verify-receipt": new Set(["receipt", "json"])
  };
  const allowed = allowedByCommand[command];
  if (!allowed) {
    throw new PromotionGateError("V2_CLI_USAGE", `Unsupported Promotion Gate v2 command "${String(command)}".`);
  }
  const options = {};
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (typeof token !== "string" || !token.startsWith("--") || token.length <= 2) {
      throw new PromotionGateError("V2_CLI_USAGE", "Promotion Gate v2 accepts named options only.");
    }
    const option = token.slice(2);
    if (!allowed.has(option) || Object.hasOwn(options, option)) {
      throw new PromotionGateError("V2_CLI_USAGE", `Unknown or duplicate option "${token}".`);
    }
    if (option === "json") {
      options.json = true;
      continue;
    }
    const value = args[index + 1];
    if (typeof value !== "string" || value === "" || value.startsWith("--")) {
      throw new PromotionGateError("V2_CLI_USAGE", `Option "${token}" requires a value.`);
    }
    options[option] = value;
    index += 1;
  }
  if (options.json !== true) {
    throw new PromotionGateError("V2_CLI_USAGE", "Promotion Gate v2 requires --json.");
  }
  if ((command === "validate" || command === "shadow") && typeof options.manifest !== "string") {
    throw new PromotionGateError("V2_CLI_USAGE", `${command} requires --manifest.`);
  }
  if (command === "shadow" && typeof options["run-id"] !== "string") {
    throw new PromotionGateError("V2_CLI_USAGE", "shadow requires --run-id.");
  }
  if (command === "verify-receipt" && typeof options.receipt !== "string") {
    throw new PromotionGateError("V2_CLI_USAGE", "verify-receipt requires --receipt.");
  }
  return { command, options };
}

async function readExternalReceipt(receiptPath) {
  const requestedEntry = await lstat(receiptPath);
  if (requestedEntry.isSymbolicLink()) {
    throw new PromotionGateError("V2_RECEIPT_FILE_INVALID", "External receipt path may not be a symlink.");
  }
  const canonical = await realpath(receiptPath);
  const entry = await lstat(canonical);
  if (!entry.isFile() || entry.size > RECEIPT_MAX_BYTES) {
    throw new PromotionGateError("V2_RECEIPT_FILE_INVALID", "External receipt must be a bounded regular file.");
  }
  return readFile(canonical);
}

async function executeV2Command(args, { repoRoot, producedAt }) {
  const { command, options } = parseV2CommandLine(args);
  if (command === "validate") {
    return validateV2ShadowPilot(repoRoot, { manifestPath: options.manifest, producedAt });
  }
  if (command === "shadow") {
    return runV2ShadowPilot(repoRoot, {
      manifestPath: options.manifest,
      runId: options["run-id"],
      producedAt
    });
  }
  const bytes = path.isAbsolute(options.receipt)
    ? await readExternalReceipt(options.receipt)
    : (await readAuthoritativeFile(repoRoot, options.receipt)).bytes;
  const receipt = parseCanonicalJsonBytes(bytes, "V2_RECEIPT_JSON_INVALID", "v2 receipt");
  return verifyV2PromotionReceipt(repoRoot, receipt, { producedAt });
}

export async function runV2Cli(args, {
  repoRoot = defaultRepoRoot,
  producedAt = new Date().toISOString(),
  writeStdout = (text) => process.stdout.write(text)
} = {}) {
  let exitCode;
  let payload;
  try {
    payload = await executeV2Command(args, { repoRoot, producedAt });
    exitCode = payload.result === "blocked" ? 2 : payload.result === "fail" ? 1 : 0;
  } catch (error) {
    if (error instanceof PromotionGateError) {
      const blocked = error.outcome === "blocked";
      payload = {
        schemaVersion: "promotion-gate-error.v2",
        result: blocked ? "blocked" : "fail",
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details })
      };
      exitCode = blocked ? 2 : 1;
    } else {
      payload = {
        schemaVersion: "promotion-gate-error.v2",
        result: "internal",
        code: "V2_INTERNAL_ERROR",
        message: "Internal Promotion Gate v2 error."
      };
      exitCode = 3;
    }
  }
  writeStdout(`${JSON.stringify(payload)}\n`);
  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  process.exitCode = await runV2Cli(process.argv.slice(2));
}
