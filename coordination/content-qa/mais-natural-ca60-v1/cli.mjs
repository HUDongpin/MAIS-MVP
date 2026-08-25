#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v4/design-registration.json" with { type: "json" };
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";

export const NATURAL_CA60_COMMANDS_V1 = Object.freeze([
  "register",
  "freeze-frame",
  "audit-clusters",
  "freeze-sample",
  "label-qwen",
  "seal-reference-labels",
  "dry-run",
  "authorize-check",
  "execute-deepseek",
  "score",
  "verify",
  "export-aggregate-report",
]);

const SIMPLE_COMMANDS = new Set(NATURAL_CA60_COMMANDS_V1.filter((command) => command !== "execute-deepseek"));

function validExecutionArguments(argv) {
  return argv.length === 3 && argv[1] === "--canary" && argv[2] === "1"
    || argv.length === 2 && argv[1] === "--resume";
}

function parseCommand(argv) {
  if (!Array.isArray(argv)) return { valid: false, command: null };
  if (argv.length === 1 && ["--help", "help"].includes(argv[0])) return { valid: true, command: "help" };
  if (argv.length === 1 && SIMPLE_COMMANDS.has(argv[0])) return { valid: true, command: argv[0] };
  if (argv[0] === "execute-deepseek" && validExecutionArguments(argv)) return { valid: true, command: argv[0] };
  return { valid: false, command: typeof argv[0] === "string" ? argv[0] : null };
}

function statusFor(command) {
  switch (command) {
    case "help":
      return { ok: true, status: "HELP", executionMode: "READ_ONLY" };
    case "dry-run":
      return { ok: true, status: "OFFLINE_DRY_RUN_READY", executionMode: "OFFLINE_NO_PROVIDER" };
    case "register":
      return { ok: false, status: "DESIGN_FREEZE_BLOCKED", executionMode: "READ_ONLY_PREFLIGHT" };
    case "freeze-frame":
      return { ok: false, status: "UPSTREAM_DESIGN_NOT_FROZEN", executionMode: "READ_ONLY_PREFLIGHT" };
    case "audit-clusters":
    case "freeze-sample":
      return { ok: false, status: "FRAME_NOT_FROZEN", executionMode: "READ_ONLY_PREFLIGHT" };
    case "label-qwen":
      return { ok: false, status: "QWEN_AUTHORIZATION_NOT_FROZEN", executionMode: "READ_ONLY_PREFLIGHT" };
    case "seal-reference-labels":
      return { ok: false, status: "REFERENCE_LABELS_NOT_COMPLETE", executionMode: "READ_ONLY_PREFLIGHT" };
    case "authorize-check":
    case "execute-deepseek":
      return { ok: false, status: "AUTHORIZATION_BLOCKED", executionMode: "READ_ONLY_PREFLIGHT" };
    case "score":
      return { ok: false, status: "NO_NATURAL_RESULTS", executionMode: "READ_ONLY_PREFLIGHT" };
    case "verify":
      return { ok: false, status: "NO_EXECUTION_RECEIPTS", executionMode: "READ_ONLY_PREFLIGHT" };
    case "export-aggregate-report":
      return { ok: false, status: "AGGREGATE_PUBLICATION_BLOCKED", executionMode: "READ_ONLY_PREFLIGHT" };
    default:
      return { ok: false, status: "USAGE_ERROR", executionMode: "NO_EXECUTION" };
  }
}

function messagesFor(command, status) {
  if (status === "HELP") return ["Public command contract only; no provider or protected-artifact action was performed."];
  if (status === "OFFLINE_DRY_RUN_READY") {
    return [
      "Offline runner contracts are loadable.",
      "No natural question, provider request, reference label, or natural result was produced.",
      "The tracked V4 design remains a candidate until the Qwen endpoint and data region are frozen.",
    ];
  }
  if (status === "USAGE_ERROR") return [`Invalid CLI form for ${command ?? "missing command"}.`];
  return [
    `Command ${command} failed closed at ${status}.`,
    "No provider request or protected-artifact mutation was performed.",
  ];
}

function buildReceipt({ argv, command, state, now }) {
  const blockers = Array.isArray(DESIGN_REGISTRATION.blockingDecisionCodes)
    ? [...DESIGN_REGISTRATION.blockingDecisionCodes]
    : ["DESIGN_REGISTRATION_BLOCKER_SET_INVALID"];
  const body = {
    schemaVersion: "NaturalCaRunnerCommandReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    command,
    arguments: [...argv],
    commands: [...NATURAL_CA60_COMMANDS_V1],
    ok: state.ok,
    status: state.status,
    executionMode: state.executionMode,
    designLifecycleStatus: DESIGN_REGISTRATION.lifecycleStatus ?? null,
    designFreezeAllowed: DESIGN_REGISTRATION.freezeAllowed === true,
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash ?? null,
    blockingDecisionCodes: blockers,
    providerRequestCount: 0,
    fixtureDispatchCount: 0,
    protectedArtifactMutationCount: 0,
    naturalItemResultCount: 0,
    formalDecision: null,
    decisionCeiling: DESIGN_REGISTRATION.scope?.decisionCeiling ?? null,
    claimScopeCeiling: DESIGN_REGISTRATION.scope?.claimScopeCeiling ?? null,
    messages: messagesFor(command, state.status),
    createdAt: now,
  };
  return Object.freeze({ ...body, receiptHash: calculateArtifactHash(body, "receiptHash") });
}

export async function runCliV1({ argv = [], now = new Date().toISOString() } = {}) {
  const parsed = parseCommand(argv);
  const state = parsed.valid ? statusFor(parsed.command) : statusFor(null);
  const receipt = buildReceipt({ argv, command: parsed.command, state, now });
  return Object.freeze({
    exitCode: state.ok ? 0 : state.status === "USAGE_ERROR" ? 64 : 2,
    receipt,
  });
}

async function main() {
  const result = await runCliV1({ argv: process.argv.slice(2) });
  process.stdout.write(`${JSON.stringify(result.receipt)}\n`);
  process.exitCode = result.exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    const body = {
      schemaVersion: "NaturalCaRunnerCommandFailureV1",
      status: "LOCAL_RUNNER_FAILURE",
      providerRequestCount: 0,
      protectedArtifactMutationCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    };
    process.stderr.write(`${JSON.stringify({ ...body, receiptHash: calculateArtifactHash(body, "receiptHash") })}\n`);
    process.exitCode = 70;
  });
}
