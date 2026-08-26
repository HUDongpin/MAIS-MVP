#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import ACTIVE_DESIGN_POINTER from "../../research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json" with { type: "json" };
import AUTHORIZATION_SEQUENCING from "../../research/mais-natural-ca60-v1/authorization-requests/2026-08-26-provider-authorization-sequencing.json" with { type: "json" };
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

export const NATURAL_CA60_COMMANDS_V1 = Object.freeze([
  "register",
  "freeze-frame",
  "audit-clusters",
  "freeze-sample",
  "label-openai",
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
      return { ok: true, status: "OFFLINE_V5_R2_RUNNER_READY_PENDING_FRESH_A11", executionMode: "OFFLINE_NO_PROVIDER" };
    case "register":
      return { ok: true, status: "PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION_INTERFACE_READY", executionMode: "OFFLINE_NO_PROVIDER" };
    case "freeze-frame":
      return { ok: true, status: "FRAME_ALREADY_FROZEN_IMMUTABLE", executionMode: "READ_ONLY" };
    case "audit-clusters":
      return { ok: true, status: "CLUSTER_AUDIT_ALREADY_FROZEN_IMMUTABLE", executionMode: "READ_ONLY" };
    case "freeze-sample":
      return { ok: true, status: "SAMPLE_ALREADY_FROZEN_IMMUTABLE", executionMode: "READ_ONLY" };
    case "label-openai":
      return { ok: false, status: "OPENAI_PROJECT_ROUTE_AND_LABEL_AUTHORIZATIONS_MISSING", executionMode: "READ_ONLY_PREFLIGHT" };
    case "seal-reference-labels":
      return { ok: false, status: "REFERENCE_LABELS_NOT_COMPLETE", executionMode: "READ_ONLY_PREFLIGHT" };
    case "authorize-check":
      return { ok: false, status: "PROVIDER_AUTHORIZATIONS_MISSING", executionMode: "READ_ONLY_PREFLIGHT" };
    case "execute-deepseek":
      return { ok: false, status: "REFERENCE_LABEL_SEAL_MISSING", executionMode: "READ_ONLY_PREFLIGHT" };
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
  if (status === "OFFLINE_V5_R2_RUNNER_READY_PENDING_FRESH_A11") {
    return [
      "The V5-R2 OpenAI and DeepSeek runner contracts and fixture seams are loadable; fresh A11 review is still required.",
      "No natural question, provider request, reference label, or natural result was produced.",
      "The V5 design, California frame, cluster audit, sample, rights screens, and privacy screens remain frozen and immutable.",
      "GPT-5.6 Luna, US_STORAGE_PROCESSING, and the US Responses endpoint are design selections, not live execution authorization.",
    ];
  }
  if (status === "USAGE_ERROR") return [`Invalid CLI form for ${command ?? "missing command"}.`];
  return [
    `Command ${command} failed closed at ${status}.`,
    "No provider request or protected-artifact mutation was performed.",
  ];
}

function buildReceipt({ argv, command, state, now }) {
  const blockers = Array.isArray(DESIGN_REGISTRATION.blockingActivationCodes)
    ? [...DESIGN_REGISTRATION.blockingActivationCodes]
    : ["DESIGN_REGISTRATION_BLOCKER_SET_INVALID"];
  const body = {
    schemaVersion: "NaturalCaRunnerCommandReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    command,
    arguments: [...argv],
    commands: [...NATURAL_CA60_COMMANDS_V1],
    ok: state.ok,
    status: state.status,
    executionMode: state.executionMode,
    designLifecycleStatus: DESIGN_REGISTRATION.lifecycleStatus ?? null,
    designFreezeAllowed: DESIGN_REGISTRATION.freezeAllowed === true,
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash ?? null,
    activeDesignId: ACTIVE_DESIGN_POINTER.activeDesignId ?? null,
    activeDesignRegistrationHash: ACTIVE_DESIGN_POINTER.activeRegistrationHash ?? null,
    frameRegistrationHash: AUTHORIZATION_SEQUENCING.frameSampleEvidence?.frameRegistrationHash ?? null,
    samplingFrameHash: AUTHORIZATION_SEQUENCING.frameSampleEvidence?.samplingFrameHash ?? null,
    sampleManifestHash: AUTHORIZATION_SEQUENCING.frameSampleEvidence?.sampleManifestHash ?? null,
    selectedRightsScreenRootHash: AUTHORIZATION_SEQUENCING.frameSampleEvidence?.selectedRightsScreenRootHash ?? null,
    selectedPrivacyScreenRootHash: AUTHORIZATION_SEQUENCING.frameSampleEvidence?.selectedPrivacyScreenRootHash ?? null,
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
  return Object.freeze({ ...body, receiptHash: jcsHash(body) });
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
    process.stderr.write(`${JSON.stringify({ ...body, receiptHash: jcsHash(body) })}\n`);
    process.exitCode = 70;
  });
}
