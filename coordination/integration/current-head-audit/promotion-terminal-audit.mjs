#!/usr/bin/env node

import {
  auditPromotionTerminalCurrentHead,
  createAuditFailureReport
} from "./promotion-terminal-audit-lib.mjs";

function argumentError(code, message) {
  return Object.assign(new Error(message), { code, outcome: "blocked" });
}

function parseArgs(argv) {
  if (argv[0] !== "audit") {
    throw argumentError("AUDIT_COMMAND_UNSUPPORTED", "The only supported command is audit.");
  }
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--json") {
      if (values.json === true) throw argumentError("AUDIT_ARGUMENT_INVALID", "--json cannot be repeated.");
      values.json = true;
      continue;
    }
    if (!["--policy", "--target-root", "--expected-head"].includes(flag)) {
      throw argumentError("AUDIT_ARGUMENT_INVALID", "Unknown terminal audit argument.");
    }
    const value = argv[index + 1];
    if (typeof value !== "string" || value === "" || value.startsWith("--")) {
      throw argumentError("AUDIT_ARGUMENT_INVALID", "Terminal audit argument is missing a value.");
    }
    const key = flag.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
    if (Object.hasOwn(values, key)) {
      throw argumentError("AUDIT_ARGUMENT_INVALID", "Terminal audit argument cannot be repeated.");
    }
    values[key] = value;
    index += 1;
  }
  if (
    values.json !== true ||
    typeof values.policy !== "string" ||
    typeof values.targetRoot !== "string" ||
    typeof values.expectedHead !== "string"
  ) {
    throw argumentError(
      "AUDIT_ARGUMENT_INVALID",
      "audit requires --policy, --target-root, --expected-head, and --json."
    );
  }
  return values;
}

function exitCodeFor(result) {
  if (result === "pass") return 0;
  if (result === "fail") return 1;
  if (result === "blocked") return 2;
  return 3;
}

let report;
let parsed = null;
try {
  parsed = parseArgs(process.argv.slice(2));
  report = await auditPromotionTerminalCurrentHead({
    policyPath: parsed.policy,
    targetRoot: parsed.targetRoot,
    expectedHead: parsed.expectedHead,
    auditId: process.env.PROMOTION_TERMINAL_AUDIT_RUN_ID ?? "terminal-current-head-audit"
  });
} catch (error) {
  report = await createAuditFailureReport({
    code: typeof error?.code === "string" ? error.code : "AUDIT_INTERNAL_ERROR",
    message: typeof error?.message === "string"
      ? error.message
      : "Terminal current-HEAD audit encountered an internal error.",
    outcome: ["fail", "blocked", "internal"].includes(error?.outcome) ? error.outcome : "internal",
    policyPath: parsed?.policy,
    expectedHead: parsed?.expectedHead
  });
}

process.stdout.write(`${JSON.stringify(report)}\n`);
process.exitCode = exitCodeFor(report.result);
