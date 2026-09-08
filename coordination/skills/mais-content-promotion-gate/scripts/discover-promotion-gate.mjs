#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_JSON_DEPTH = 128;
const MAX_JSON_WORK = MAX_FILE_BYTES * 2;
const GIT_TIMEOUT_MS = 10_000;
const SHA256_RE = /^[a-f0-9]{64}$/u;
const COMMIT_RE = /^[a-f0-9]{40}$/u;
const GIT_OBJECT_RE = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u;
const SAFE_REPO_PATH_RE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/u;
const EXPECTED_PROMOTION_SCRIPTS = Object.freeze({
  validate: { scriptName: "promotion:validate", subcommand: "validate" },
  shadow: { scriptName: "promotion:shadow", subcommand: "shadow" },
  verifyReceipt: { scriptName: "promotion:verify-receipt", subcommand: "verify-receipt" },
});
const RECEIPT_BINDING_KEYS = Object.freeze([
  "gateId", "pilotUnitId", "attemptId", "candidateDigest", "sourceCommit",
  "targetBaselineCommit", "checkerVersion", "checkerBundleDigest", "parentPackageId",
  "parentPackageStatus", "liveAllowed",
]);
const RECEIPT_LIFECYCLE_KEYS = Object.freeze([
  "priorState", "currentState", "recommendedState", "parentPackageStatus",
  "maturityClaim", "liveAllowed",
]);
const CANONICAL_BINDING_KEYS = Object.freeze([
  "gateId", "pilotUnitId", "attemptId", "candidateDigest", "sourceCommit",
  "targetBaselineCommit", "checkerVersion", "checkerBundleDigest",
  "checkerReleaseCommit", "parentPackageId", "parentPackageStatus",
  "executionCommit", "directParentManifestSha256", "liveAllowed",
]);
const LIFECYCLE_STATES = new Set([
  "candidate_hold", "shadow_ready", "shadow_passed", "repair_required", "rejected",
]);
const SUPPORTED_LINUX_RUNNERS = new Set(["ubuntu-latest", "ubuntu-24.04", "ubuntu-22.04", "ubuntu-20.04"]);
const RECEIPT_SCHEMA_FAMILY_RE = /^promotion-receipt\.[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const RECEIPT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const RECEIPT_CHECK_ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/u;
const CANONICAL_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const NON_LIVE_MATURITY_RE = /^(?:shadow-only|shadow-passed(?: \/ maturity-pending-[a-z0-9-]+)?)$/u;
const FORBIDDEN_POSITIVE_CLAIMS = new Set([
  "production-deploy", "approved-for-production", "deploy-live", "production-ready",
]);
const BUNDLED_HANDOFF_SCHEMA_URL = new URL("../assets/promotion-gate-handoff.schema.json", import.meta.url);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(value) {
  return sha256(stableJson(value));
}

export function redactedRef(value) {
  return `ref-${sha256(String(value))}`;
}

function fail(code, message, internal = false) {
  throw Object.assign(new Error(message), { code, ...(internal ? { internal: true } : {}) });
}

export function strictJsonParse(input, label = "authoritative JSON") {
  if (Buffer.isBuffer(input) && input.length > MAX_FILE_BYTES) fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`);
  let source = input;
  if (Buffer.isBuffer(input)) {
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(input); } catch { fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`); }
  }
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_FILE_BYTES) fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`);
  let offset = 0;
  let work = 0;
  const countWork = (amount = 1) => {
    work += amount;
    if (work > MAX_JSON_WORK) fail("STRICT_JSON_INVALID", `${label} exceeds strict JSON work limits`);
  };
  const skipWhitespace = () => {
    while (/[\t\n\r ]/u.test(source[offset] ?? "")) { offset += 1; countWork(); }
  };
  const parseString = () => {
    if (source[offset] !== '"') fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    offset += 1;
    let value = "";
    while (offset < source.length) {
      countWork();
      const character = source[offset++];
      if (character === '"') return value;
      if (character < " ") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      if (character !== "\\") { value += character; continue; }
      const escaped = source[offset++];
      countWork();
      const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }[escaped];
      if (simple !== undefined) { value += simple; continue; }
      if (escaped !== "u") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      const digits = source.slice(offset, offset + 4);
      if (!/^[a-fA-F0-9]{4}$/u.test(digits)) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      value += String.fromCharCode(Number.parseInt(digits, 16));
      offset += 4;
      countWork(4);
    }
    fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
  };
  const parseValue = (depth) => {
    countWork();
    if (depth > MAX_JSON_DEPTH) fail("STRICT_JSON_INVALID", `${label} exceeds strict JSON depth limits`);
    skipWhitespace();
    if (source[offset] === '"') return parseString();
    if (source[offset] === "{") {
      offset += 1;
      const result = {};
      const keys = new Set();
      skipWhitespace();
      if (source[offset] === "}") { offset += 1; return result; }
      while (offset < source.length) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) fail("JSON_DUPLICATE_KEY", "authoritative JSON contains a duplicate object key");
        keys.add(key);
        skipWhitespace();
        if (source[offset++] !== ":") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
        Object.defineProperty(result, key, { value: parseValue(depth + 1), enumerable: true, writable: true, configurable: true });
        skipWhitespace();
        const delimiter = source[offset++];
        if (delimiter === "}") return result;
        if (delimiter !== ",") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      }
      fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    }
    if (source[offset] === "[") {
      offset += 1;
      const result = [];
      skipWhitespace();
      if (source[offset] === "]") { offset += 1; return result; }
      while (offset < source.length) {
        result.push(parseValue(depth + 1));
        skipWhitespace();
        const delimiter = source[offset++];
        if (delimiter === "]") return result;
        if (delimiter !== ",") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      }
      fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    }
    for (const [literal, value] of [["true", true], ["false", false], ["null", null]]) {
      if (source.startsWith(literal, offset)) { offset += literal.length; countWork(literal.length); return value; }
    }
    const number = source.slice(offset).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u)?.[0];
    if (!number) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    offset += number.length;
    countWork(number.length);
    const numericValue = Number(number);
    if (!Number.isFinite(numericValue)) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    return numericValue;
  };
  const value = parseValue(0);
  skipWhitespace();
  if (offset !== source.length) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
  return value;
}

function parseAuthoritativeJson(source, label, malformedCode = "MALFORMED_JSON") {
  try { return strictJsonParse(source, label); } catch (error) {
    if (error?.code === "JSON_DUPLICATE_KEY") throw error;
    fail(malformedCode, `${label} is malformed JSON`);
  }
}

function issue(code, detail = undefined) {
  return detail === undefined ? { code } : { code, detailSha256: sha256(String(detail)) };
}

function canonicalTimestamp() {
  return new Date().toISOString();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasPositiveProductionClaim(value) {
  if (typeof value === "string") return FORBIDDEN_POSITIVE_CLAIMS.has(value.toLowerCase());
  if (Array.isArray(value)) return value.some(hasPositiveProductionClaim);
  if (!isPlainObject(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replaceAll(/[^a-z]/gu, "");
    if (["approved", "live", "productionready", "deploylive", "liveapproved", "productionapproved"].includes(normalizedKey) && child === true) return true;
    if (["approval", "authorization", "maturity", "maturityclaim", "state", "status", "recommendedstate", "requestedstate"].includes(normalizedKey) && typeof child === "string" && ["approved", "live", ...FORBIDDEN_POSITIVE_CLAIMS].includes(child.toLowerCase())) return true;
    if (hasPositiveProductionClaim(child)) return true;
  }
  return false;
}

function isCanonicalTimestamp(value) {
  if (typeof value !== "string" || !CANONICAL_TIMESTAMP_RE.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function isCalendarTimestamp(value) {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u);
  if (!parts || Number.isNaN(Date.parse(value))) return false;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number);
  // Round-trip the stated calendar components separately from the valid offset.
  // setUTCFullYear also preserves years 0000-0099 instead of mapping them to 1900.
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, 0);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1
    && calendar.getUTCDate() === day && calendar.getUTCHours() === hour
    && calendar.getUTCMinutes() === minute && calendar.getUTCSeconds() === second;
}

function proofGrammarFail(label) {
  fail("RECEIPT_PROOF_GRAMMAR_INVALID", `${label} is outside the closed Receipt proof grammar`);
}

function hasExactKeys(value, keys) {
  return isPlainObject(value) && stableJson(Object.keys(value).sort()) === stableJson([...keys].sort());
}

function requireSha(value, label) {
  if (!SHA256_RE.test(value ?? "")) proofGrammarFail(label);
}

function requireCommit(value, label) {
  if (!COMMIT_RE.test(value ?? "")) proofGrammarFail(label);
}

function requireBoundedString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 1000) proofGrammarFail(label);
}

const RECEIPT_REQUIRED_ROOT_KEYS = Object.freeze([
  "schemaVersion", "manifest", "run", "mode", "result", "exitReasons", "binding",
  "worktreeProof", "provenanceProof", "baselineProof", "checkerReleaseProof",
  "externalSideEffectProof", "checks", "lifecycle", "unmetConditions",
  "semanticReceiptDigest", "rawReceiptDigest",
]);
const ZERO_SIDE_EFFECT_KEY_RE = /(?:sideeffects?|networkrequests?|providercalls?|databasewrites?|deploymentcommands?|productionwrites?|liveregistrywrites?|externalcalls?|httpcalls?|egress)(?:count|total|attempts?)?$/u;
const SIDE_EFFECT_CONTEXT_RE = /(?:sideeffects?|network|provider|database|deploy|production|liveregistry|externalcalls?|http|egress)/u;
const SIDE_EFFECT_COUNTER_LEAF_RE = /^(?:count|total|attempts?|requests?|calls?|writes?|commands?|mutations?|operations?)$/u;
const AUTHORITY_KEY_RE = /(?:approval|approved|authori[sz](?:ation|ed)?|deploy(?:ment|ed)?|production|live|releaseallowed|releaseauthori[sz])/u;
const FORBIDDEN_AUTHORITY_VALUE_RE = /(?:approved-for-production|production-ready|production-deploy|deploy-live|live-approved|authori[sz]ed-for-live|release-authori[sz]ed)/u;
const POSITIVE_AUTHORITY_VALUE_RE = /^(?:approved|production|live|deployed|authori[sz]ed|granted|ready)$/u;
const NEGATIVE_AUTHORITY_VALUE_RE = /(?:unproven|blocked|forbidden|disabled|denied|not[_ -]?authori[sz]ed|none|false|shadow-only|candidate-only|pending)/u;

function normalizedReceiptKey(key) {
  return String(key).toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
}

function assertRecursiveReceiptSafety(value, pathValue = "$", sideEffectContext = false, authorityContext = false) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) proofGrammarFail(pathValue);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertRecursiveReceiptSafety(entry, `${pathValue}/${index}`, sideEffectContext, authorityContext));
    return;
  }
  if (!isPlainObject(value)) proofGrammarFail(pathValue);
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedReceiptKey(key);
    const childSideEffectContext = sideEffectContext || SIDE_EFFECT_CONTEXT_RE.test(normalized);
    const childAuthorityContext = authorityContext || AUTHORITY_KEY_RE.test(normalized);
    const sideEffectCounter = ZERO_SIDE_EFFECT_KEY_RE.test(normalized) || (childSideEffectContext && SIDE_EFFECT_COUNTER_LEAF_RE.test(normalized));
    if (sideEffectCounter && (!Number.isSafeInteger(child) || child !== 0)) {
      fail("RECEIPT_SIDE_EFFECT_FORBIDDEN", "Receipt declares a nonzero or malformed side-effect counter");
    }
    if (AUTHORITY_KEY_RE.test(normalized) && child === true) {
      fail("RECEIPT_PRODUCTION_CLAIM_FORBIDDEN", "Receipt contains a forbidden positive production authority alias");
    }
    const authorityEvidenceMetadata = /(?:digest|hash|reference|ref|count|path|id)$/u.test(normalized);
    if (typeof child === "string" && (
      FORBIDDEN_AUTHORITY_VALUE_RE.test(child.toLowerCase()) ||
      (childAuthorityContext && !authorityEvidenceMetadata && POSITIVE_AUTHORITY_VALUE_RE.test(child.toLowerCase()) && !NEGATIVE_AUTHORITY_VALUE_RE.test(child.toLowerCase()))
    )) {
      fail("RECEIPT_PRODUCTION_CLAIM_FORBIDDEN", "Receipt contains a forbidden positive production authority alias");
    }
    assertRecursiveReceiptSafety(child, `${pathValue}/${key}`, childSideEffectContext, childAuthorityContext);
  }
}

function collectReceiptKeyValues(value, targetKey, values = []) {
  if (Array.isArray(value)) value.forEach((entry) => collectReceiptKeyValues(entry, targetKey, values));
  else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === targetKey) values.push(child);
      collectReceiptKeyValues(child, targetKey, values);
    }
  }
  return values;
}

function assertDuplicatedReceiptBindings(receipt) {
  const expected = {
    candidateDigest: receipt.binding.candidateDigest,
    sourceCommit: receipt.binding.sourceCommit,
    targetBaselineCommit: receipt.binding.targetBaselineCommit,
    executionCommit: receipt.worktreeProof.executionCommit,
    checkerVersion: receipt.binding.checkerVersion,
    checkerBundleDigest: receipt.binding.checkerBundleDigest,
    checkerReleaseCommit: receipt.checkerReleaseProof.releaseCommit,
    parentPackageStatus: receipt.binding.parentPackageStatus,
    manifestPath: receipt.manifest.path,
    manifestRawSha256: receipt.manifest.rawSha256,
    directParentManifestSha256: receipt.manifest.rawSha256,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    for (const observed of collectReceiptKeyValues(receipt, key)) {
      if (observed !== expectedValue) fail("RECEIPT_CROSS_BINDING_INVALID", "Receipt duplicates disagree with the canonical Promotion binding");
    }
  }
  for (const observed of collectReceiptKeyValues(receipt, "liveAllowed")) {
    if (observed !== false) fail("LIVE_BOUNDARY_INVALID", "Receipt contains a liveAllowed value other than false");
  }
  const aliases = [
    [receipt.provenanceProof?.candidateDigest, receipt.binding.candidateDigest],
    [receipt.provenanceProof?.sourceCommit, receipt.binding.sourceCommit],
    [receipt.baselineProof?.targetBaselineCommit, receipt.binding.targetBaselineCommit],
    [receipt.baselineProof?.executionCommit, receipt.worktreeProof.executionCommit],
    [receipt.checkerReleaseProof?.version, receipt.binding.checkerVersion],
    [receipt.checkerReleaseProof?.bundleDigest, receipt.binding.checkerBundleDigest],
    [receipt.externalSideEffectProof?.checkerBundleDigest, receipt.binding.checkerBundleDigest],
    [receipt.lifecycle?.parentPackageStatus, receipt.binding.parentPackageStatus],
  ];
  if (aliases.some(([observed, canonical]) => observed !== canonical)) fail("RECEIPT_CROSS_BINDING_INVALID", "Receipt proof aliases disagree with the canonical Promotion binding");
}

function validateGenericReceiptProofEnvelope(receipt) {
  if (!RECEIPT_REQUIRED_ROOT_KEYS.every((key) => Object.hasOwn(receipt, key))) proofGrammarFail("Receipt root");
  if (!hasExactKeys(receipt.manifest, ["path", "rawSha256"])) proofGrammarFail("manifest");
  try { assertSafeRepoRelativePath(receipt.manifest.path, "Receipt Manifest path"); } catch { proofGrammarFail("manifest.path"); }
  requireSha(receipt.manifest.rawSha256, "manifest.rawSha256");

  if (!hasExactKeys(receipt.run, ["runId", "producedAt", "ciMetadata"]) || receipt.run.ciMetadata !== null) proofGrammarFail("run");
  if (!RECEIPT_ID_RE.test(receipt.run.runId ?? "") || !isCanonicalTimestamp(receipt.run.producedAt)) fail("RECEIPT_TIMESTAMP_INVALID", "Receipt run metadata is not canonical");

  if (!isPlainObject(receipt.worktreeProof)) proofGrammarFail("worktreeProof");
  requireCommit(receipt.worktreeProof.executionCommit, "worktreeProof.executionCommit");
  if (receipt.worktreeProof.cleanBeforeAndAfter !== true || receipt.worktreeProof.unchangedHead !== true) proofGrammarFail("worktreeProof");
  for (const phase of ["pre", "post"]) {
    const proof = receipt.worktreeProof[phase];
    if (!isPlainObject(proof) || proof.clean !== true || proof.headCommit !== receipt.worktreeProof.executionCommit) proofGrammarFail(`worktreeProof.${phase}`);
    requireSha(proof.statusDigest, `worktreeProof.${phase}.statusDigest`);
  }

  if (!isPlainObject(receipt.provenanceProof)) proofGrammarFail("provenanceProof");
  requireSha(receipt.provenanceProof.candidateDigest, "provenanceProof.candidateDigest");
  requireCommit(receipt.provenanceProof.sourceCommit, "provenanceProof.sourceCommit");
  if (receipt.provenanceProof.sourceCommitIsAncestor !== true) proofGrammarFail("provenanceProof.sourceCommitIsAncestor");

  if (!isPlainObject(receipt.baselineProof)) proofGrammarFail("baselineProof");
  requireCommit(receipt.baselineProof.executionCommit, "baselineProof.executionCommit");
  requireCommit(receipt.baselineProof.targetBaselineCommit, "baselineProof.targetBaselineCommit");

  if (!isPlainObject(receipt.checkerReleaseProof)) proofGrammarFail("checkerReleaseProof");
  requireCommit(receipt.checkerReleaseProof.releaseCommit, "checkerReleaseProof.releaseCommit");
  requireBoundedString(receipt.checkerReleaseProof.version, "checkerReleaseProof.version");
  requireSha(receipt.checkerReleaseProof.bundleDigest, "checkerReleaseProof.bundleDigest");

  const proof = receipt.externalSideEffectProof;
  if (!isPlainObject(proof) || !Array.isArray(proof.tempEnvironment) || proof.tempEnvironment.length === 0) proofGrammarFail("externalSideEffectProof");
  if (proof.tempEnvironment.some((entry) => !isPlainObject(entry) || entry.outsideRepository !== true)) proofGrammarFail("externalSideEffectProof.tempEnvironment");
  requireSha(proof.checkerBundleDigest, "externalSideEffectProof.checkerBundleDigest");
  requireSha(proof.digest, "externalSideEffectProof.digest");
  const { digest, ...withoutDigest } = proof;
  if (fingerprint(withoutDigest) !== digest) proofGrammarFail("externalSideEffectProof.digest");
  if (Array.isArray(proof.sourceBindings)) {
    for (const binding of proof.sourceBindings) {
      if (!hasExactKeys(binding, ["path", "rawSha256"])) proofGrammarFail("externalSideEffectProof.sourceBindings entry");
      try { assertSafeRepoRelativePath(binding.path, "externalSideEffectProof.sourceBindings.path"); } catch { proofGrammarFail("externalSideEffectProof.sourceBindings.path"); }
      requireSha(binding.rawSha256, "externalSideEffectProof.sourceBindings.rawSha256");
    }
    requireSha(proof.sourceBindingsDigest, "externalSideEffectProof.sourceBindingsDigest");
    if (fingerprint(proof.sourceBindings) !== proof.sourceBindingsDigest) proofGrammarFail("externalSideEffectProof.sourceBindingsDigest");
  }

  for (const condition of receipt.unmetConditions ?? []) {
    if (!isPlainObject(condition) || typeof condition.code !== "string" || condition.code.length === 0 || condition.code.length > 1000) proofGrammarFail("unmetConditions entry");
  }
  assertRecursiveReceiptSafety(receipt);
  assertDuplicatedReceiptBindings(receipt);
}

export function validateReceiptGovernanceGrammar(receipt) {
  if (!isPlainObject(receipt) || !RECEIPT_SCHEMA_FAMILY_RE.test(receipt.schemaVersion ?? "")) fail("RECEIPT_SCHEMA_FAMILY_INVALID", "Receipt schema is outside the Promotion Receipt family");
  if (receipt.mode !== "shadow") fail("RECEIPT_MODE_INVALID", "Receipt mode is not Shadow");
  if (!["pass", "fail", "blocked"].includes(receipt.result)) fail("RECEIPT_RESULT_INVALID", "Receipt result is outside the Shadow result grammar");
  if (!isPlainObject(receipt.run) || !RECEIPT_ID_RE.test(receipt.run.runId ?? "") || !isCanonicalTimestamp(receipt.run.producedAt)) fail("RECEIPT_TIMESTAMP_INVALID", "Receipt run metadata is not canonical");
  if (hasPositiveProductionClaim(receipt)) fail("RECEIPT_PRODUCTION_CLAIM_FORBIDDEN", "Receipt contains a forbidden positive production claim");
  if (!isPlainObject(receipt.binding) || stableJson(Object.keys(receipt.binding).sort()) !== stableJson([...RECEIPT_BINDING_KEYS].sort())) fail("BINDING_MALFORMED", "Receipt binding is incomplete");
  if (receipt.binding.parentPackageStatus !== "candidate-only") fail("RECEIPT_PARENT_STATUS_INVALID", "Receipt parent package status is outside the candidate-only contract");
  if (!isPlainObject(receipt.lifecycle) || stableJson(Object.keys(receipt.lifecycle).sort()) !== stableJson([...RECEIPT_LIFECYCLE_KEYS].sort())) fail("RECEIPT_LIFECYCLE_INVALID", "Receipt lifecycle is incomplete");
  if (receipt.lifecycle.parentPackageStatus !== "candidate-only") fail("RECEIPT_PARENT_STATUS_INVALID", "Receipt lifecycle parent status is outside the candidate-only contract");
  if (![receipt.lifecycle.priorState, receipt.lifecycle.currentState, receipt.lifecycle.recommendedState].every((state) => LIFECYCLE_STATES.has(state))) fail("RECEIPT_LIFECYCLE_INVALID", "Receipt lifecycle is outside the Promotion Shadow contract");
  if (typeof receipt.lifecycle.maturityClaim !== "string" || !NON_LIVE_MATURITY_RE.test(receipt.lifecycle.maturityClaim)) fail("RECEIPT_MATURITY_INVALID", "Receipt maturity claim is outside the non-live grammar");
  if (receipt.binding.liveAllowed !== false || receipt.lifecycle.liveAllowed !== false) fail("LIVE_BOUNDARY_INVALID", "native Receipt is not explicitly non-live");
  validateGenericReceiptProofEnvelope(receipt);
  if (!Array.isArray(receipt.checks) || receipt.checks.length === 0) fail("RECEIPT_CHECK_INVALID", "Receipt checks are missing");
  const checkIds = new Set();
  for (const check of receipt.checks) {
    if (!isPlainObject(check) || stableJson(Object.keys(check).sort()) !== stableJson(["details", "digest", "id", "result"]) || !RECEIPT_CHECK_ID_RE.test(check.id ?? "") || !["pass", "fail", "blocked"].includes(check.result) || !isPlainObject(check.details) || !SHA256_RE.test(check.digest ?? "") || fingerprint({ id: check.id, result: check.result, details: check.details }) !== check.digest || checkIds.has(check.id)) fail("RECEIPT_CHECK_INVALID", "Receipt check grammar is invalid");
    checkIds.add(check.id);
  }
  if (receipt.result === "pass") {
    if (receipt.exitReasons?.length !== 0 || receipt.checks.some((check) => check.result !== "pass") || receipt.lifecycle.priorState !== "candidate_hold" || receipt.lifecycle.currentState !== "shadow_ready" || receipt.lifecycle.recommendedState !== "shadow_passed") fail("RECEIPT_LIFECYCLE_INVALID", "Passing Receipt lifecycle does not match the Shadow transition");
  } else if (!Array.isArray(receipt.exitReasons) || receipt.exitReasons.length === 0) {
    fail("RECEIPT_RESULT_INVALID", "Non-pass Receipt has no bounded reason");
  }
}

export function assertExactKeys(value, expected, label = "value") {
  if (!isPlainObject(value)) fail("STRUCTURE_INVALID", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (stableJson(actual) !== stableJson(wanted)) {
    fail("UNRECOGNIZED_SEMANTIC_FIELD", `${label} has missing or unrecognized fields`);
  }
}

export function assertSafeRepoRelativePath(pathValue, label = "path") {
  if (
    typeof pathValue !== "string" ||
    pathValue.length === 0 ||
    pathValue.length > 1_000 ||
    !SAFE_REPO_PATH_RE.test(pathValue) ||
    posix.normalize(pathValue) !== pathValue ||
    pathValue.includes("//") ||
    pathValue.includes("\\") ||
    pathValue.includes("\0")
  ) {
    fail("UNSAFE_SELECTOR_PATH", `${label} must be a canonical repository-relative POSIX path`);
  }
}

function runGit(repoRoot, args, { encoding = "utf8", allowFailure = false, maxBuffer = MAX_FILE_BYTES } = {}) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding,
    maxBuffer,
    timeout: GIT_TIMEOUT_MS,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  if (result.error) fail("GIT_READ_FAILED", "bounded Git read failed", true);
  if (!allowFailure && result.status !== 0) fail("GIT_READ_FAILED", "Git read failed", true);
  return result;
}

export function createGitRepositoryAdapter(repoRoot) {
  return {
    async readReleaseAuthorityEvidence() {
      // Git records do not authenticate deployment authorizers or external QA.
      // A trusted host must supply independently authenticated source I/O.
      fail("RELEASE_AUTHORITY_UNAVAILABLE", "independent release authority source is not configured");
    },
    async head() {
      return String(runGit(repoRoot, ["rev-parse", "HEAD"]).stdout).trim();
    },
    async branch() {
      const result = runGit(repoRoot, ["branch", "--show-current"], { allowFailure: true });
      return result.status === 0 && String(result.stdout).trim() ? String(result.stdout).trim() : null;
    },
    async status() {
      return String(runGit(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout ?? "");
    },
    async treeEntry(commit, pathValue) {
      assertSafeRepoRelativePath(pathValue);
      const result = runGit(repoRoot, ["ls-tree", "-z", commit, "--", pathValue], { allowFailure: true, encoding: null });
      if (result.status !== 0) return null;
      const output = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
      if (output.length === 0) return null;
      const records = output.toString("utf8").split("\0").filter(Boolean);
      if (records.length !== 1) fail("HEAD_TREE_AMBIGUOUS", "Git tree path is ambiguous");
      const match = records[0].match(/^(100644|100755|120000|160000)\s+(blob|commit)\s+([a-f0-9]{40,64})\t(.+)$/u);
      if (!match || match[4] !== pathValue) fail("HEAD_TREE_MALFORMED", "Git tree entry is malformed");
      return { mode: match[1], type: match[2], objectId: match[3], path: match[4] };
    },
    async blob(commit, pathValue) {
      assertSafeRepoRelativePath(pathValue);
      const result = runGit(repoRoot, ["show", "--no-textconv", `${commit}:${pathValue}`], { allowFailure: true, encoding: null });
      if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
      return result.stdout;
    },
    async listTrackedPaths(prefix) {
      assertSafeRepoRelativePath(prefix);
      const result = runGit(repoRoot, ["ls-tree", "-r", "--name-only", "-z", "HEAD", "--", prefix], { encoding: null });
      const output = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
      return output.toString("utf8").split("\0").filter(Boolean);
    },
    async commitExists(commit) {
      if (!COMMIT_RE.test(commit ?? "")) return false;
      return runGit(repoRoot, ["cat-file", "-e", `${commit}^{commit}`], { allowFailure: true }).status === 0;
    },
    async isAncestor(ancestor, descendant) {
      if (![ancestor, descendant].every((value) => COMMIT_RE.test(value ?? ""))) return false;
      return runGit(repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant], { allowFailure: true }).status === 0;
    },
    async changedPaths(fromCommit, toCommit) {
      const result = runGit(repoRoot, ["diff", "--name-only", "-z", fromCommit, toCommit, "--"], { encoding: null });
      const output = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
      return output.toString("utf8").split("\0").filter(Boolean).sort();
    },
  };
}

async function resolveNoSymlinkRegularFile(repoRoot, pathValue, label) {
  assertSafeRepoRelativePath(pathValue, label);
  const rootReal = await realpath(resolve(repoRoot));
  let cursor = rootReal;
  const segments = pathValue.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    cursor = resolve(cursor, segments[index]);
    let stat;
    try { stat = await lstat(cursor); } catch { fail("AUTHORITATIVE_INPUT_MISSING", `${label} is missing`); }
    if (stat.isSymbolicLink()) fail("SYMLINK_COMPONENT_FORBIDDEN", `${label} contains a symlink component`);
    if (index < segments.length - 1 && !stat.isDirectory()) fail("UNSAFE_SELECTOR_FILE", `${label} has a non-directory intermediate component`);
    if (index === segments.length - 1 && (!stat.isFile() || stat.size > MAX_FILE_BYTES)) fail("UNSAFE_SELECTOR_FILE", `${label} must be a bounded regular file`);
  }
  const fileReal = await realpath(cursor);
  const expected = resolve(rootReal, ...segments);
  if (fileReal !== expected || (fileReal !== rootReal && !fileReal.startsWith(`${rootReal}${sep}`))) {
    fail("SELECTOR_ESCAPE", `${label} escapes the repository or resolves noncanonically`);
  }
  return { rootReal, absolute: expected, relative: pathValue, stat: await lstat(expected) };
}

export async function verifyTrackedCurrentFile(repoRoot, pathValue, label, repositoryAdapter = createGitRepositoryAdapter(repoRoot)) {
  const resolved = await resolveNoSymlinkRegularFile(repoRoot, pathValue, label);
  const entry = await repositoryAdapter.treeEntry("HEAD", pathValue);
  if (!entry || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) fail("AUTHORITATIVE_INPUT_UNTRACKED", `${label} is not one regular blob in HEAD`);
  const workingMode = (resolved.stat.mode & 0o111) === 0 ? "100644" : "100755";
  if (workingMode !== entry.mode) fail("AUTHORITATIVE_MODE_DRIFT", `${label} working mode differs from HEAD`);
  const [workingBytes, headBytes] = await Promise.all([readFile(resolved.absolute), repositoryAdapter.blob("HEAD", pathValue)]);
  if (!Buffer.isBuffer(headBytes) || !workingBytes.equals(headBytes)) fail("AUTHORITATIVE_BYTES_DRIFT", `${label} working bytes differ from HEAD`);
  return { ...resolved, bytes: workingBytes, text: workingBytes.toString("utf8"), sha256: sha256(workingBytes), gitMode: entry.mode, gitObjectId: entry.objectId };
}

async function readCurrentJson(repoRoot, pathValue, label, repositoryAdapter) {
  const artifact = await verifyTrackedCurrentFile(repoRoot, pathValue, label, repositoryAdapter);
  return { ...artifact, value: parseAuthoritativeJson(artifact.text, label) };
}

export async function readJsonArtifactAtCommit(repoRoot, commit, pathValue, label = "Git artifact", repositoryAdapter = createGitRepositoryAdapter(repoRoot)) {
  if (!COMMIT_RE.test(commit ?? "")) fail("ARTIFACT_COMMIT_INVALID", `${label} commit is malformed`);
  assertSafeRepoRelativePath(pathValue, `${label} path`);
  if (!await repositoryAdapter.commitExists(commit)) fail("ARTIFACT_COMMIT_INVALID", `${label} commit does not exist`);
  const entry = await repositoryAdapter.treeEntry(commit, pathValue);
  if (
    !entry ||
    entry.type !== "blob" ||
    !["100644", "100755"].includes(entry.mode) ||
    !GIT_OBJECT_RE.test(entry.objectId ?? "") ||
    entry.path !== pathValue
  ) fail("ARTIFACT_GIT_BLOB_INVALID", `${label} is not one exact regular Git blob`);
  const bytes = await repositoryAdapter.blob(commit, pathValue);
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_FILE_BYTES) fail("ARTIFACT_GIT_BLOB_INVALID", `${label} Git blob is absent or oversized`);
  const value = parseAuthoritativeJson(bytes, label);
  return {
    relative: pathValue,
    bytes,
    text: bytes.toString("utf8"),
    sha256: sha256(bytes),
    gitMode: entry.mode,
    gitObjectId: entry.objectId,
    storageCommit: commit,
    value,
  };
}

function jsonPointer(root, pointer) {
  if (!pointer.startsWith("#/")) fail("SCHEMA_REF_UNSUPPORTED", "only local JSON Schema references are supported");
  return pointer.slice(2).split("/").reduce((value, token) => value?.[token.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function schemaTypeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isPlainObject(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateSchemaValue(value, schema, root, pathValue, errors) {
  if (schema === true) return;
  if (schema === false) { errors.push(`${pathValue}:false-schema`); return; }
  if (!isPlainObject(schema)) { errors.push(`${pathValue}:schema-not-object`); return; }
  if (typeof schema.$ref === "string") {
    const target = jsonPointer(root, schema.$ref);
    if (!target) errors.push(`${pathValue}:unresolved-ref`);
    else validateSchemaValue(value, target, root, pathValue, errors);
  }
  if (Array.isArray(schema.allOf)) schema.allOf.forEach((entry) => validateSchemaValue(value, entry, root, pathValue, errors));
  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter((entry) => { const local = []; validateSchemaValue(value, entry, root, pathValue, local); return local.length === 0; });
    if (matches.length === 0) errors.push(`${pathValue}:anyOf`);
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((entry) => { const local = []; validateSchemaValue(value, entry, root, pathValue, local); return local.length === 0; });
    if (matches.length !== 1) errors.push(`${pathValue}:oneOf`);
  }
  if (schema.not !== undefined) {
    const local = [];
    validateSchemaValue(value, schema.not, root, pathValue, local);
    if (local.length === 0) errors.push(`${pathValue}:not`);
  }
  if (Object.hasOwn(schema, "if")) {
    const local = [];
    validateSchemaValue(value, schema.if, root, pathValue, local);
    if (local.length === 0 && Object.hasOwn(schema, "then")) validateSchemaValue(value, schema.then, root, pathValue, errors);
    if (local.length > 0 && Object.hasOwn(schema, "else")) validateSchemaValue(value, schema.else, root, pathValue, errors);
  }
  if (Object.hasOwn(schema, "const") && stableJson(value) !== stableJson(schema.const)) errors.push(`${pathValue}:const`);
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => stableJson(entry) === stableJson(value))) errors.push(`${pathValue}:enum`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => schemaTypeMatches(value, type))) { errors.push(`${pathValue}:type`); return; }
  }
  if (typeof value === "string") {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${pathValue}:minLength`);
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) errors.push(`${pathValue}:maxLength`);
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${pathValue}:pattern`);
    if (schema.format === "date-time" && !isCalendarTimestamp(value)) errors.push(`${pathValue}:format`);
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) errors.push(`${pathValue}:minimum`);
    if (typeof schema.maximum === "number" && value > schema.maximum) errors.push(`${pathValue}:maximum`);
  }
  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${pathValue}:minItems`);
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${pathValue}:maxItems`);
    if (schema.uniqueItems && new Set(value.map(stableJson)).size !== value.length) errors.push(`${pathValue}:uniqueItems`);
    if (Array.isArray(schema.prefixItems)) schema.prefixItems.forEach((entry, index) => { if (index < value.length) validateSchemaValue(value[index], entry, root, `${pathValue}/${index}`, errors); });
    if (schema.items === false && value.length > (schema.prefixItems?.length ?? 0)) errors.push(`${pathValue}:extraItems`);
    else if (isPlainObject(schema.items)) value.slice(schema.prefixItems?.length ?? 0).forEach((entry, offset) => {
      const index = offset + (schema.prefixItems?.length ?? 0);
      validateSchemaValue(entry, schema.items, root, `${pathValue}/${index}`, errors);
    });
  }
  if (isPlainObject(value)) {
    if (Array.isArray(schema.required)) schema.required.forEach((key) => { if (!Object.hasOwn(value, key)) errors.push(`${pathValue}/${key}:required`); });
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    Object.entries(properties).forEach(([key, child]) => { if (Object.hasOwn(value, key)) validateSchemaValue(value[key], child, root, `${pathValue}/${key}`, errors); });
    const additionalKeys = Object.keys(value).filter((key) => !Object.hasOwn(properties, key));
    if (schema.additionalProperties === false) additionalKeys.forEach((key) => errors.push(`${pathValue}/${key}:additional`));
    else if (isPlainObject(schema.additionalProperties)) additionalKeys.forEach((key) => validateSchemaValue(value[key], schema.additionalProperties, root, `${pathValue}/${key}`, errors));
  }
}

export function validateJsonSchema(value, schema, label = "document", options = {}) {
  try {
    walkSchema(schema, schema, new Set(), true);
    assertAcyclicSchemaReferences(schema);
  } catch (error) {
    if (error?.code) throw error;
    fail("SCHEMA_DOCUMENT_INVALID", "schema contains an invalid or unsupported assertion");
  }
  const errors = [];
  validateSchemaValue(value, schema, schema, "$", errors);
  if (errors.length > 0) fail("SCHEMA_VALIDATION_FAILED", `${label} fails its bundled schema: ${errors.slice(0, 3).join(",")}`);
  if (Object.hasOwn(schema, "x-resolver-enforced")) {
    validateResolverEnforcedTruth(value, schema["x-resolver-enforced"]);
    if (value?.releaseHandoff !== null && options.repositoryAncestryVerified !== true) {
      fail("REPOSITORY_ANCESTRY_VALIDATION_REQUIRED", "release handoff requires repository-backed ancestry validation");
    }
  }
}

export function validateResolverEnforcedTruth(value, contract) {
  if (contract !== "promotion-gate-handoff-v1") fail("SCHEMA_DOCUMENT_INVALID", "schema requests an unsupported resolver-enforced contract");
  if (!isPlainObject(value) || value.skill !== "mais-content-promotion-gate") fail("RESOLVER_TRUTH_MISMATCH", "Promotion resolver truth cannot be established");
  const canonicalReceiptSha256 = value.nativeArtifacts?.canonicalReceipt?.sha256;
  if (value.receiptComparison?.canonical?.receiptSha256 !== canonicalReceiptSha256) fail("RESOLVER_TRUTH_MISMATCH", "canonical Receipt artifact binding differs across the envelope");
  if (value.releaseHandoff === null) return;
  const handoff = value.releaseHandoff;
  const releaseEvidence = [handoff.liveSurfaceOwnerEvidence, handoff.a11Evidence, handoff.a22Evidence, handoff.a25Evidence];
  if (releaseEvidence.some((entry) => entry?.releaseSha !== handoff.releaseSha) || handoff.ownerAuthorization?.releaseSha !== handoff.releaseSha) {
    fail("RELEASE_EXACT_SHA_EVIDENCE_MISMATCH", "release authority evidence does not bind the intended release SHA");
  }
  if (handoff.ownerAuthorization?.ownerRef !== handoff.liveSurfaceOwnerEvidence?.ownerRef) {
    fail("RELEASE_OWNER_AUTHORIZATION_MISMATCH", "release owner authorization does not bind the live-surface owner");
  }
  const expectedPathspecDigest = fingerprint({
    releaseSha: handoff.releaseSha,
    target: handoff.ownerAuthorization?.target,
    action: handoff.ownerAuthorization?.action,
    targetPathspecRef: handoff.ownerAuthorization?.targetPathspecRef,
  });
  if (handoff.ownerAuthorization?.targetPathspecDigest !== expectedPathspecDigest) {
    fail("RELEASE_TARGET_PATHSPEC_DIGEST_MISMATCH", "release target pathspec digest does not recompute");
  }
  const evidenceHashes = [handoff.liveSurfaceOwnerEvidence?.sha256, handoff.ownerAuthorization?.sha256, handoff.a11Evidence?.sha256, handoff.a22Evidence?.sha256, handoff.a25Evidence?.sha256];
  const evidenceRefs = [handoff.liveSurfaceOwnerEvidence?.ref, handoff.ownerAuthorization?.authorizationRef, handoff.a11Evidence?.ref, handoff.a22Evidence?.ref, handoff.a25Evidence?.ref];
  if (new Set(evidenceHashes).size !== evidenceHashes.length || new Set(evidenceRefs).size !== evidenceRefs.length) {
    fail("RELEASE_LIVE_OWNER_EVIDENCE_NOT_DISTINCT", "release authority evidence records must be distinct");
  }
  const comparisons = [
    [handoff.releaseSha, value.repository?.head],
    [handoff.candidateDigest, value.bindings?.candidateDigest],
    [handoff.sourceCommit, value.bindings?.sourceCommit],
    [handoff.targetBaselineCommit, value.bindings?.targetBaselineCommit],
    [handoff.checkerBundleDigest, value.bindings?.checkerBundleDigest],
    [handoff.checkerReleaseCommit, value.bindings?.checkerReleaseCommit],
    [handoff.manifestSha256, value.nativeArtifacts?.manifest?.sha256],
    [handoff.canonicalReceiptSha256, canonicalReceiptSha256],
    [handoff.canonicalReceiptSha256, value.receiptComparison?.canonical?.receiptSha256],
    [handoff.closureSha256, value.nativeArtifacts?.closure?.sha256],
    [handoff.registrySha256, value.nativeArtifacts?.registry?.sha256],
    [handoff.registeredExecutionCommit, value.attemptRelation?.executionCommit],
    [handoff.storageCommit, value.attemptRelation?.storageCommit],
    [handoff.storageCommit, value.canonicalReceiptEvidence?.storageCommit],
    [handoff.finalizationCommit, value.attemptRelation?.finalizationCommit],
    [handoff.canonicalReceiptSha256, value.canonicalReceiptEvidence?.fileSha256],
    [handoff.registeredExecutionCommit, value.canonicalReceiptEvidence?.executionCommit],
    [handoff.directParentManifestSha256, value.attemptRelation?.directParentManifestSha256],
  ];
  if (comparisons.some(([left, right]) => typeof left !== "string" || left !== right)) fail("RESOLVER_TRUTH_MISMATCH", "release handoff duplicates do not bind the exact envelope");
  if (handoff.executionAncestorOfStorage !== true || handoff.storageAncestorOfFinalization !== true || handoff.executionAncestorOfFinalization !== true || handoff.finalizationAncestorOfRelease !== true) fail("RESOLVER_TRUTH_MISMATCH", "release handoff ancestry proof is incomplete");
  if (handoff.liveAllowed !== false || value.externalClosure?.scope !== "active-attempt") fail("RESOLVER_TRUTH_MISMATCH", "release handoff exceeds the non-live active-attempt boundary");
}

async function bundledHandoffSchema() {
  let source;
  try { source = await readFile(BUNDLED_HANDOFF_SCHEMA_URL, "utf8"); } catch { fail("HANDOFF_SCHEMA_UNAVAILABLE", "fixed bundled handoff schema is unavailable", true); }
  try { return strictJsonParse(source, "fixed bundled handoff schema"); } catch { fail("HANDOFF_SCHEMA_INVALID", "fixed bundled handoff schema is malformed", true); }
}

function validateExactReleaseTransport(value, exactTransport) {
  if (!hasExactKeys(exactTransport, ["path", "fileSha256", "executionCommit", "storageCommit", "gitMode", "gitObjectId"])) {
    fail("RELEASE_TRANSPORT_REQUIRED", "release validation requires one exact private canonical Receipt transport");
  }
  assertSafeRepoRelativePath(exactTransport.path, "canonical Receipt transport path");
  if (!SHA256_RE.test(exactTransport.fileSha256 ?? "") || !COMMIT_RE.test(exactTransport.executionCommit ?? "") || !COMMIT_RE.test(exactTransport.storageCommit ?? "") || !["100644", "100755"].includes(exactTransport.gitMode) || !GIT_OBJECT_RE.test(exactTransport.gitObjectId ?? "")) {
    fail("RELEASE_TRANSPORT_INVALID", "release canonical Receipt transport identity is malformed");
  }
  const handoff = value?.releaseHandoff;
  const comparisons = [
    [exactTransport.executionCommit, value?.attemptRelation?.executionCommit],
    [exactTransport.executionCommit, value?.canonicalReceiptEvidence?.executionCommit],
    [exactTransport.executionCommit, handoff?.registeredExecutionCommit],
    [exactTransport.storageCommit, value?.attemptRelation?.storageCommit],
    [exactTransport.storageCommit, value?.canonicalReceiptEvidence?.storageCommit],
    [exactTransport.storageCommit, handoff?.storageCommit],
    [exactTransport.fileSha256, value?.canonicalReceiptEvidence?.fileSha256],
    [exactTransport.fileSha256, value?.nativeArtifacts?.canonicalReceipt?.sha256],
    [exactTransport.fileSha256, value?.receiptComparison?.canonical?.receiptSha256],
    [exactTransport.fileSha256, handoff?.canonicalReceiptSha256],
  ];
  if (comparisons.some(([left, right]) => left !== right)) fail("RELEASE_TRANSPORT_BINDING_INVALID", "release canonical Receipt transport does not bind the exact envelope");
  return exactTransport;
}

async function readRepositoryBlobArtifact(repositoryAdapter, commit, pathValue, label, parseJson = false) {
  assertSafeRepoRelativePath(pathValue, label);
  const [entry, bytes] = await Promise.all([
    repositoryAdapter.treeEntry(commit, pathValue),
    repositoryAdapter.blob(commit, pathValue),
  ]);
  if (!entry || entry.type !== "blob" || entry.path !== pathValue || !["100644", "100755"].includes(entry.mode) || !GIT_OBJECT_RE.test(entry.objectId ?? "") || !Buffer.isBuffer(bytes) || bytes.length > MAX_FILE_BYTES) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release Receipt authority does not resolve one bounded regular repository blob");
  }
  const artifact = {
    relative: pathValue,
    bytes,
    sha256: sha256(bytes),
    gitMode: entry.mode,
    gitObjectId: entry.objectId,
  };
  if (parseJson) artifact.value = parseAuthoritativeJson(bytes, label, "RELEASE_RECEIPT_AUTHORITY_INVALID");
  return artifact;
}

function decodeAuthoritativeWorkflow(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release workflow authority is not valid UTF-8"); }
}

async function discoverRepositoryBoundReleaseReceipt(repositoryAdapter, actualHead, transport, storedBytes) {
  if (typeof repositoryAdapter.listTrackedPaths !== "function") fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release validation cannot enumerate repository-bound authority");
  const packageArtifact = await readRepositoryBlobArtifact(repositoryAdapter, actualHead, "package.json", "release package authority", true);
  const nativeCli = validatePublicScripts(packageArtifact.value);
  for (const operation of Object.values(nativeCli)) await readRepositoryBlobArtifact(repositoryAdapter, actualHead, operation.entryPath, "release native CLI authority");

  const workflowPaths = (await repositoryAdapter.listTrackedPaths(".github/workflows", actualHead)).filter((pathValue) => /\.ya?ml$/u.test(pathValue));
  const workflows = [];
  for (const pathValue of workflowPaths) {
    const artifact = await readRepositoryBlobArtifact(repositoryAdapter, actualHead, pathValue, "release workflow authority");
    const parsed = parsePromotionWorkflow(decodeAuthoritativeWorkflow(artifact.bytes));
    if (parsed) workflows.push({ ...artifact, ...parsed });
  }
  if (workflows.length !== 1 || workflows[0].receiptSelector !== transport.path) fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release Receipt is not selected by one exact Promotion workflow");
  const workflow = workflows[0];
  const manifestArtifact = await readRepositoryBlobArtifact(repositoryAdapter, actualHead, workflow.manifestSelector, "release Manifest authority", true);
  const descriptor = manifestArtifact.value?.checkerRelease;
  if (!isPlainObject(descriptor) || typeof descriptor.ledgerPath !== "string" || !SHA256_RE.test(descriptor.ledgerRawSha256 ?? "") || descriptor.version !== manifestArtifact.value.checkerVersion || descriptor.bundleAlgorithm !== "sha256-stable-json-path-raw-v2" || !SHA256_RE.test(descriptor.bundleDigest ?? "") || !COMMIT_RE.test(descriptor.releaseCommit ?? "")) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release Manifest checker authority is incomplete");
  }
  if (!await repositoryAdapter.commitExists(descriptor.releaseCommit) || !await repositoryAdapter.isAncestor(descriptor.releaseCommit, actualHead)) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release checker commit is not an ancestor of actual HEAD");
  }
  const ledger = await readRepositoryBlobArtifact(repositoryAdapter, actualHead, descriptor.ledgerPath, "release checker ledger authority", true);
  if (ledger.sha256 !== descriptor.ledgerRawSha256) fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release checker ledger bytes do not match the Manifest");
  const entries = Array.isArray(ledger.value?.entries) ? ledger.value.entries : [];
  const matches = entries.filter((entry) => entry?.version === descriptor.version);
  if (matches.length !== 1) fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release checker ledger does not resolve one entry");
  const entry = matches[0];
  assertExactKeys(entry, ["version", "bundleAlgorithm", "bundlePaths", "bundleDigest", "releaseCommit"], "release checker entry");
  if (entry.bundleAlgorithm !== descriptor.bundleAlgorithm || entry.bundleDigest !== descriptor.bundleDigest || entry.releaseCommit !== descriptor.releaseCommit || !Array.isArray(entry.bundlePaths) || entry.bundlePaths.length === 0 || new Set(entry.bundlePaths).size !== entry.bundlePaths.length) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release checker entry disagrees with the Manifest");
  }
  const bundleBindings = [];
  const schemaArtifacts = [];
  for (const bundlePath of entry.bundlePaths) {
    const [currentArtifact, releasedArtifact] = await Promise.all([
      readRepositoryBlobArtifact(repositoryAdapter, actualHead, bundlePath, "current release checker bundle"),
      readRepositoryBlobArtifact(repositoryAdapter, descriptor.releaseCommit, bundlePath, "immutable release checker bundle"),
    ]);
    if (!currentArtifact.bytes.equals(releasedArtifact.bytes) || currentArtifact.gitMode !== releasedArtifact.gitMode || currentArtifact.gitObjectId !== releasedArtifact.gitObjectId) {
      fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "current checker bundle differs from its immutable release");
    }
    bundleBindings.push({ path: bundlePath, rawSha256: currentArtifact.sha256 });
    if (/\.schema\.json$/u.test(bundlePath)) {
      const schemaValue = parseAuthoritativeJson(currentArtifact.bytes, "release checker schema", "RELEASE_RECEIPT_AUTHORITY_INVALID");
      validateSchemaDocument(schemaValue);
      schemaArtifacts.push({ ...currentArtifact, value: schemaValue });
    }
  }
  const bundleDigest = fingerprint(bundleBindings);
  if (bundleDigest !== descriptor.bundleDigest) fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release checker bundle digest does not recompute");
  const bundlePaths = new Set(entry.bundlePaths);
  if (Object.values(nativeCli).some(({ entryPath }) => !bundlePaths.has(entryPath)) || (workflow.comparator.kind === "external-release-bound" && !bundlePaths.has(workflow.comparator.entryPath))) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release workflow authority is outside the immutable checker bundle");
  }
  const checker = {
    descriptor,
    ledger,
    entry,
    bundleDigest,
    bundlePathsDigest: fingerprint(entry.bundlePaths),
    schemaArtifacts,
  };
  const manifestSchema = schemaForValue(schemaArtifacts, manifestArtifact.value, "release Promotion Manifest");
  validateJsonSchema(manifestArtifact.value, manifestSchema.value, "release Promotion Manifest");
  const receiptValue = parseAuthoritativeJson(storedBytes, "release canonical Receipt", "RELEASE_RECEIPT_AUTHORITY_INVALID");
  const receiptArtifact = { relative: transport.path, bytes: storedBytes, sha256: transport.fileSha256, value: receiptValue };
  const receiptSchema = schemaForValue(schemaArtifacts, receiptValue, "release canonical Receipt");
  if (receiptSchema.relative !== uniqueReceiptSchema(schemaArtifacts).relative) fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release Receipt is not governed by the unique closed Shadow schema");
  const summary = summarizeVerifiedReceipt({ ...receiptArtifact, label: "release canonical Receipt", receiptSha256: transport.fileSha256 }, { schema: receiptSchema.value });
  if (summary.result !== "pass") fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release canonical Receipt is not a passing native Receipt");
  const bindingProjection = exactManifestReceiptBindings(manifestArtifact, receiptArtifact, checker);
  return { manifestArtifact, checker, receiptSchema, summary, bindingProjection };
}

export async function validateRepositoryBackedReleaseHandoff(value, repositoryAdapter, exactTransport) {
  const schema = await bundledHandoffSchema();
  validateJsonSchema(value, schema, "release handoff", { repositoryAncestryVerified: true });
  validateResolverEnforcedTruth(value, "promotion-gate-handoff-v1");
  const handoff = value.releaseHandoff;
  if (!handoff) fail("RELEASE_HANDOFF_REQUIRED", "repository ancestry validation requires one release handoff");
  const transport = validateExactReleaseTransport(value, exactTransport);
  const executionCommit = handoff.registeredExecutionCommit;
  const storageCommit = handoff.storageCommit;
  const finalizationCommit = handoff.finalizationCommit;
  const releaseCommit = handoff.releaseSha;
  if (![executionCommit, storageCommit, finalizationCommit, releaseCommit].every((commit) => COMMIT_RE.test(commit ?? "")) || executionCommit === storageCommit || executionCommit === finalizationCommit) {
    fail("RELEASE_COMMIT_IDENTITY_INVALID", "release execution, storage, finalization, or intended-release identity is invalid");
  }
  const actualHead = await repositoryAdapter.head();
  if (!COMMIT_RE.test(actualHead ?? "") || actualHead !== releaseCommit || value.repository?.head !== actualHead) {
    fail("RELEASE_HEAD_IDENTITY_INVALID", "release handoff and envelope must bind the actual repository HEAD");
  }
  if (!(await Promise.all([executionCommit, storageCommit, finalizationCommit, actualHead].map((commit) => repositoryAdapter.commitExists(commit)))).every(Boolean)) {
    fail("RELEASE_COMMIT_IDENTITY_INVALID", "release handoff names a missing commit");
  }
  if (await repositoryAdapter.treeEntry(executionCommit, transport.path) !== null) fail("RELEASE_TRANSPORT_INVALID", "canonical Receipt was already present at execution");
  const storedEntry = await repositoryAdapter.treeEntry(storageCommit, transport.path);
  const storedBytes = await repositoryAdapter.blob(storageCommit, transport.path);
  if (!storedEntry || storedEntry.type !== "blob" || storedEntry.path !== transport.path || storedEntry.mode !== transport.gitMode || storedEntry.objectId !== transport.gitObjectId || !Buffer.isBuffer(storedBytes) || storedBytes.length > MAX_FILE_BYTES || sha256(storedBytes) !== transport.fileSha256) {
    fail("RELEASE_TRANSPORT_INVALID", "canonical Receipt transport does not bind the exact storage Git blob");
  }
  const transportedReceipt = parseAuthoritativeJson(storedBytes, "canonical Receipt transport");
  if (!isPlainObject(transportedReceipt)) fail("RELEASE_TRANSPORT_INVALID", "canonical Receipt transport is not one JSON object");
  let trustedReceipt;
  try {
    trustedReceipt = await discoverRepositoryBoundReleaseReceipt(repositoryAdapter, actualHead, transport, storedBytes);
  } catch (error) {
    if (error?.code === "JSON_DUPLICATE_KEY") throw error;
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release canonical Receipt does not have exact trusted native authority");
  }
  const canonicalDigest = value.receiptComparison?.canonical;
  const projection = trustedReceipt.bindingProjection;
  const authorityComparisons = [
    [trustedReceipt.manifestArtifact.sha256, value.nativeArtifacts?.manifest?.sha256],
    [trustedReceipt.manifestArtifact.sha256, value.attemptRelation?.directParentManifestSha256],
    [trustedReceipt.checker.bundleDigest, value.bindings?.checkerBundleDigest],
    [trustedReceipt.checker.descriptor.releaseCommit, value.bindings?.checkerReleaseCommit],
    [projection.candidateDigest, value.bindings?.candidateDigest],
    [projection.sourceCommit, value.bindings?.sourceCommit],
    [projection.targetBaselineCommit, value.bindings?.targetBaselineCommit],
    [sha256(projection.checkerVersion), value.bindings?.checkerVersionSha256],
    [projection.executionCommit, executionCommit],
    [trustedReceipt.summary.digest.receiptSha256, canonicalDigest?.receiptSha256],
    [trustedReceipt.summary.digest.semanticDigest, canonicalDigest?.semanticDigest],
    [trustedReceipt.summary.digest.rawDigest, canonicalDigest?.rawDigest],
    [trustedReceipt.summary.digest.bindingDigest, canonicalDigest?.bindingDigest],
  ];
  if (authorityComparisons.some(([left, right]) => typeof left !== "string" || left !== right) || canonicalDigest?.semanticDigestVerified !== true || canonicalDigest?.liveAllowed !== false) {
    fail("RELEASE_RECEIPT_AUTHORITY_INVALID", "release Receipt authority does not bind the current envelope");
  }
  if (!await repositoryAdapter.isAncestor(executionCommit, storageCommit) || (storageCommit !== finalizationCommit && !await repositoryAdapter.isAncestor(storageCommit, finalizationCommit)) || !await repositoryAdapter.isAncestor(finalizationCommit, actualHead)) {
    fail("RELEASE_ANCESTRY_INVALID", "release ancestry is not execution -> storage -> finalization -> intended release");
  }
  await verifyReleaseAuthorityEvidence(handoff, repositoryAdapter);
  return value;
}

const RELEASE_AUTHORITY_MAX_BYTES = 64 * 1024;
const RELEASE_AUTHORITY_SLOTS = Object.freeze([
  ["liveSurfaceOwnerEvidence", "LIVE_SURFACE_OWNER"],
  ["ownerAuthorization", "OWNER_AUTHORIZATION"],
  ["a11Evidence", "A11"], ["a22Evidence", "A22"], ["a25Evidence", "A25"],
]);

async function verifyReleaseAuthorityEvidence(handoff, repositoryAdapter) {
  if (typeof repositoryAdapter?.readReleaseAuthorityEvidence !== "function") {
    fail("RELEASE_AUTHORITY_UNAVAILABLE", "independent release authority source is not configured");
  }
  const sourceIds = new Set();
  let verifiedOwnerId;
  for (const [slot, role] of RELEASE_AUTHORITY_SLOTS) {
    const declaration = handoff[slot];
    const ref = role === "OWNER_AUTHORIZATION" ? declaration.authorizationRef : declaration.ref;
    let source;
    try {
      source = await repositoryAdapter.readReleaseAuthorityEvidence({
        role, ref, releaseSha: handoff.releaseSha, maxBytes: RELEASE_AUTHORITY_MAX_BYTES,
      });
    } catch (error) {
      if (error?.code === "RELEASE_AUTHORITY_UNAVAILABLE") {
        fail("RELEASE_AUTHORITY_UNAVAILABLE", "independent release authority source is not configured");
      }
      fail("RELEASE_AUTHORITY_SOURCE_UNAVAILABLE", "independent release authority source could not be resolved");
    }
    const owned = role === "LIVE_SURFACE_OWNER" || role === "OWNER_AUTHORIZATION";
    const identityKeys = ["recordId", "issuerId", "role", ...(owned ? ["ownerId"] : []), ...(role === "OWNER_AUTHORIZATION" ? ["targetPathspecId"] : [])];
    if (!hasExactKeys(source, ["sourceIdentity", "bytes"]) || !hasExactKeys(source.sourceIdentity, identityKeys)
      || !Buffer.isBuffer(source.bytes) || source.bytes.length === 0 || source.bytes.length > RELEASE_AUTHORITY_MAX_BYTES) {
      fail("RELEASE_AUTHORITY_SOURCE_INVALID", "release authority source requires bounded raw bytes and independent source identity");
    }
    const identity = source.sourceIdentity;
    if (identityKeys.some((key) => typeof identity[key] !== "string" || !SAFE_ID_RE.test(identity[key])) || identity.role !== role) {
      fail("RELEASE_AUTHORITY_IDENTITY_INVALID", "release authority source identity does not match the required role");
    }
    if (sourceIds.has(identity.recordId)) {
      fail("RELEASE_AUTHORITY_SOURCE_NOT_DISTINCT", "release authority records must have distinct authenticated source identities");
    }
    sourceIds.add(identity.recordId);
    const resolvedRef = redactedRef(stableJson({ issuerId: identity.issuerId, recordId: identity.recordId }));
    if (resolvedRef !== ref || sha256(source.bytes) !== declaration.sha256) {
      fail("RELEASE_AUTHORITY_DIGEST_MISMATCH", "release authority reference or raw digest does not recompute");
    }
    let record;
    try { record = strictJsonParse(source.bytes, "release authority evidence"); } catch (error) {
      if (error?.code === "JSON_DUPLICATE_KEY") throw error;
      fail("RELEASE_AUTHORITY_RECORD_INVALID", "release authority evidence is not strict JSON");
    }
    const recordKeys = ["schemaVersion", ...identityKeys, "releaseSha", "result", "liveAllowed", ...(role === "OWNER_AUTHORIZATION" ? ["target", "action"] : [])];
    if (!hasExactKeys(record, recordKeys) || record.schemaVersion !== "release-authority-evidence.v1"
      || identityKeys.some((key) => record[key] !== identity[key])
      || record.releaseSha !== handoff.releaseSha || record.result !== "pass" || record.liveAllowed !== false) {
      fail("RELEASE_AUTHORITY_RECORD_INVALID", "release authority record does not bind its source, role, result, or release SHA");
    }
    if (owned) {
      if (declaration.ownerRef !== redactedRef(identity.ownerId) || (verifiedOwnerId !== undefined && verifiedOwnerId !== identity.ownerId)) {
        fail("RELEASE_AUTHORITY_OWNER_MISMATCH", "release authority records do not bind the same independently identified owner");
      }
      verifiedOwnerId = identity.ownerId;
    }
    if (role === "OWNER_AUTHORIZATION") {
      const targetPathspecRef = redactedRef(identity.targetPathspecId);
      if (record.target !== "production" || record.action !== "deploy"
        || declaration.target !== record.target || declaration.action !== record.action
        || declaration.targetPathspecRef !== targetPathspecRef
        || declaration.targetPathspecDigest !== fingerprint({ releaseSha: record.releaseSha, target: record.target, action: record.action, targetPathspecRef })) {
        fail("RELEASE_AUTHORITY_SCOPE_MISMATCH", "release authorization does not bind the independently identified target, action, and pathspec");
      }
    } else if (declaration.result !== record.result || declaration.liveAllowed !== record.liveAllowed || (role !== "LIVE_SURFACE_OWNER" && declaration.role !== record.role)) {
      fail("RELEASE_AUTHORITY_RECORD_INVALID", "release authority projection differs from the independently read record");
    }
  }
}

function validateReleaseAuthorityInputs({ releaseSha, liveSurfaceOwnerEvidence, ownerAuthorization, a11Evidence, a22Evidence, a25Evidence }) {
  if (!hasExactKeys(liveSurfaceOwnerEvidence, ["ownerRef", "ref", "sha256", "releaseSha", "result", "liveAllowed"])) {
    fail("RELEASE_LIVE_OWNER_EVIDENCE_REQUIRED", "release handoff requires distinct live-surface-owner evidence");
  }
  if (!hasExactKeys(ownerAuthorization, ["ownerRef", "authorizationRef", "sha256", "releaseSha", "target", "action", "targetPathspecRef", "targetPathspecDigest"])) {
    fail("RELEASE_OWNER_AUTHORIZATION_REQUIRED", "release handoff requires explicit owner target/action authorization");
  }
  const roleEvidence = [a11Evidence, a22Evidence, a25Evidence];
  if (roleEvidence.some((entry) => !hasExactKeys(entry, ["role", "ref", "sha256", "releaseSha", "result", "liveAllowed"]))) {
    fail("RELEASE_EXACT_SHA_EVIDENCE_REQUIRED", "release handoff requires exact-SHA A11, A22, and A25 evidence");
  }
  const exactShaEvidence = [liveSurfaceOwnerEvidence, ownerAuthorization, ...roleEvidence];
  if (exactShaEvidence.some((entry) => entry.releaseSha !== releaseSha)) {
    fail("RELEASE_EXACT_SHA_EVIDENCE_MISMATCH", "release authority evidence does not bind the intended release SHA");
  }
  if (ownerAuthorization.ownerRef !== liveSurfaceOwnerEvidence.ownerRef) {
    fail("RELEASE_OWNER_AUTHORIZATION_MISMATCH", "owner authorization does not bind the live-surface owner");
  }
  if (ownerAuthorization.target !== "production" || ownerAuthorization.action !== "deploy") {
    fail("RELEASE_OWNER_AUTHORIZATION_INVALID", "owner authorization does not name the exact production deploy action");
  }
  const expectedPathspecDigest = fingerprint({
    releaseSha,
    target: ownerAuthorization.target,
    action: ownerAuthorization.action,
    targetPathspecRef: ownerAuthorization.targetPathspecRef,
  });
  if (ownerAuthorization.targetPathspecDigest !== expectedPathspecDigest) {
    fail("RELEASE_TARGET_PATHSPEC_DIGEST_MISMATCH", "release target pathspec digest does not recompute");
  }
  const evidenceHashes = [liveSurfaceOwnerEvidence.sha256, ownerAuthorization.sha256, ...roleEvidence.map((entry) => entry.sha256)];
  const evidenceRefs = [liveSurfaceOwnerEvidence.ref, ownerAuthorization.authorizationRef, ...roleEvidence.map((entry) => entry.ref)];
  if (new Set(evidenceHashes).size !== evidenceHashes.length || new Set(evidenceRefs).size !== evidenceRefs.length) {
    fail("RELEASE_LIVE_OWNER_EVIDENCE_NOT_DISTINCT", "release authority evidence records must be distinct");
  }
}

export async function buildRepositoryValidatedReleaseHandoff(envelope, { repositoryAdapter, releaseSha, canonicalReceiptEvidence, liveSurfaceOwnerEvidence, ownerAuthorization, a11Evidence, a22Evidence, a25Evidence }) {
  const storageCommit = envelope.canonicalReceiptEvidence?.storageCommit;
  const finalizationCommit = envelope.attemptRelation?.finalizationCommit;
  if (!COMMIT_RE.test(storageCommit ?? "") || !COMMIT_RE.test(finalizationCommit ?? "")) fail("RELEASE_STORAGE_IDENTITY_REQUIRED", "release handoff requires exact verified Receipt storage and finalization identities");
  if (!canonicalReceiptEvidence || canonicalReceiptEvidence.storageCommit !== storageCommit || canonicalReceiptEvidence.executionCommit !== envelope.attemptRelation?.executionCommit || canonicalReceiptEvidence.fileSha256 !== envelope.canonicalReceiptEvidence?.fileSha256 || typeof canonicalReceiptEvidence.path !== "string") {
    fail("RELEASE_STORAGE_IDENTITY_REQUIRED", "release handoff requires the exact verified canonical Receipt transport");
  }
  validateReleaseAuthorityInputs({ releaseSha, liveSurfaceOwnerEvidence, ownerAuthorization, a11Evidence, a22Evidence, a25Evidence });
  assertSafeRepoRelativePath(canonicalReceiptEvidence.path, "canonical Receipt transport path");
  if (await repositoryAdapter.treeEntry(canonicalReceiptEvidence.executionCommit, canonicalReceiptEvidence.path) !== null) fail("RELEASE_STORAGE_IDENTITY_INVALID", "canonical Receipt was already present at execution");
  const storedEntry = await repositoryAdapter.treeEntry(storageCommit, canonicalReceiptEvidence.path);
  const storedBytes = await repositoryAdapter.blob(storageCommit, canonicalReceiptEvidence.path);
  if (!storedEntry || storedEntry.type !== "blob" || storedEntry.mode !== canonicalReceiptEvidence.gitMode || storedEntry.objectId !== canonicalReceiptEvidence.gitObjectId || !Buffer.isBuffer(storedBytes) || sha256(storedBytes) !== canonicalReceiptEvidence.fileSha256) {
    fail("RELEASE_STORAGE_IDENTITY_INVALID", "canonical Receipt transport does not bind the exact storage Git blob");
  }
  const handoff = {
    releaseSha,
    candidateDigest: envelope.bindings?.candidateDigest,
    sourceCommit: envelope.bindings?.sourceCommit,
    targetBaselineCommit: envelope.bindings?.targetBaselineCommit,
    checkerBundleDigest: envelope.bindings?.checkerBundleDigest,
    checkerReleaseCommit: envelope.bindings?.checkerReleaseCommit,
    manifestSha256: envelope.nativeArtifacts?.manifest?.sha256,
    canonicalReceiptSha256: envelope.nativeArtifacts?.canonicalReceipt?.sha256,
    closureSha256: envelope.nativeArtifacts?.closure?.sha256,
    registrySha256: envelope.nativeArtifacts?.registry?.sha256,
    registeredExecutionCommit: envelope.attemptRelation?.executionCommit,
    storageCommit,
    finalizationCommit,
    directParentManifestSha256: envelope.attemptRelation?.directParentManifestSha256,
    executionAncestorOfStorage: true,
    storageAncestorOfFinalization: true,
    executionAncestorOfFinalization: true,
    finalizationAncestorOfRelease: true,
    liveSurfaceOwnerEvidence,
    ownerAuthorization,
    a11Evidence,
    a22Evidence,
    a25Evidence,
    liveAllowed: false,
  };
  const packet = { ...envelope, releaseHandoff: handoff };
  await validateRepositoryBackedReleaseHandoff(packet, repositoryAdapter, canonicalReceiptEvidence);
  return handoff;
}

const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema", "$id", "$ref", "$defs", "$comment", "title", "description", "default", "examples",
  "deprecated", "readOnly", "writeOnly", "type", "const", "enum", "allOf", "anyOf", "oneOf",
  "not", "if", "then", "else", "properties", "required", "additionalProperties", "items",
  "prefixItems", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "pattern",
  "format", "minimum", "maximum", "x-resolver-enforced",
]);

function walkSchema(schema, root = schema, seen = new Set(), isRoot = false) {
  if (schema === true || schema === false) return;
  if (!isPlainObject(schema)) fail("SCHEMA_DOCUMENT_INVALID", "schema node is not an object or boolean");
  if (seen.has(schema)) return;
  seen.add(schema);
  for (const key of Object.keys(schema)) if (!SUPPORTED_SCHEMA_KEYWORDS.has(key)) fail("SCHEMA_DOCUMENT_INVALID", "schema uses an unsupported assertion keyword");
  if (Object.hasOwn(schema, "x-resolver-enforced") && (!isRoot || schema["x-resolver-enforced"] !== "promotion-gate-handoff-v1")) fail("SCHEMA_DOCUMENT_INVALID", "schema uses an unsupported resolver-enforced contract");
  for (const key of ["$schema", "$id", "$comment", "title", "description"]) {
    if (schema[key] !== undefined && typeof schema[key] !== "string") fail("SCHEMA_DOCUMENT_INVALID", `schema ${key} annotation is malformed`);
  }
  if (schema.examples !== undefined && !Array.isArray(schema.examples)) fail("SCHEMA_DOCUMENT_INVALID", "schema examples annotation is malformed");
  for (const key of ["deprecated", "readOnly", "writeOnly"]) {
    if (schema[key] !== undefined && typeof schema[key] !== "boolean") fail("SCHEMA_DOCUMENT_INVALID", `schema ${key} annotation is malformed`);
  }
  if (schema.pattern !== undefined && typeof schema.pattern !== "string") fail("SCHEMA_DOCUMENT_INVALID", "schema pattern assertion is malformed");
  if (typeof schema.pattern === "string") {
    try { new RegExp(schema.pattern, "u"); } catch { fail("SCHEMA_DOCUMENT_INVALID", "schema has an invalid pattern"); }
  }
  if (schema.format !== undefined && typeof schema.format !== "string") fail("SCHEMA_DOCUMENT_INVALID", "schema format assertion is malformed");
  if (typeof schema.format === "string" && schema.format !== "date-time") fail("SCHEMA_DOCUMENT_INVALID", "schema uses an unsupported format");
  if (schema.$ref !== undefined && typeof schema.$ref !== "string") fail("SCHEMA_DOCUMENT_INVALID", "schema reference assertion is malformed");
  if (typeof schema.$ref === "string" && !jsonPointer(root, schema.$ref)) fail("SCHEMA_DOCUMENT_INVALID", "schema has an unresolved local reference");
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (types.length === 0 || new Set(types).size !== types.length || types.some((type) => !["null", "array", "object", "integer", "number", "string", "boolean"].includes(type))) fail("SCHEMA_DOCUMENT_INVALID", "schema type assertion is malformed");
  }
  if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some((entry) => typeof entry !== "string") || new Set(schema.required).size !== schema.required.length)) fail("SCHEMA_DOCUMENT_INVALID", "schema required assertion is malformed");
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0 || new Set(schema.enum.map(stableJson)).size !== schema.enum.length)) fail("SCHEMA_DOCUMENT_INVALID", "schema enum assertion is malformed");
  if (schema.properties !== undefined && !isPlainObject(schema.properties)) fail("SCHEMA_DOCUMENT_INVALID", "schema properties assertion is malformed");
  if (schema.$defs !== undefined && !isPlainObject(schema.$defs)) fail("SCHEMA_DOCUMENT_INVALID", "schema definitions are malformed");
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean" && !isPlainObject(schema.additionalProperties)) fail("SCHEMA_DOCUMENT_INVALID", "schema additionalProperties assertion is malformed");
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) {
    if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || schema[key] < 0)) fail("SCHEMA_DOCUMENT_INVALID", `schema ${key} assertion is malformed`);
  }
  for (const key of ["minimum", "maximum"]) {
    if (schema[key] !== undefined && (typeof schema[key] !== "number" || !Number.isFinite(schema[key]))) fail("SCHEMA_DOCUMENT_INVALID", `schema ${key} assertion is malformed`);
  }
  if (schema.minLength !== undefined && schema.maxLength !== undefined && schema.minLength > schema.maxLength) fail("SCHEMA_DOCUMENT_INVALID", "schema string length range is malformed");
  if (schema.minItems !== undefined && schema.maxItems !== undefined && schema.minItems > schema.maxItems) fail("SCHEMA_DOCUMENT_INVALID", "schema array length range is malformed");
  if (schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum) fail("SCHEMA_DOCUMENT_INVALID", "schema numeric range is malformed");
  if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== "boolean") fail("SCHEMA_DOCUMENT_INVALID", "schema uniqueItems assertion is malformed");
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
    if (schema[key] !== undefined && (!Array.isArray(schema[key]) || schema[key].length === 0 || schema[key].some((entry) => entry !== true && entry !== false && !isPlainObject(entry)))) fail("SCHEMA_DOCUMENT_INVALID", `schema ${key} assertion is malformed`);
    schema[key]?.forEach((entry) => walkSchema(entry, root, seen, false));
  }
  for (const key of ["not", "if", "then", "else", "items"]) if (schema[key] !== undefined) walkSchema(schema[key], root, seen, false);
  if (isPlainObject(schema.additionalProperties)) walkSchema(schema.additionalProperties, root, seen, false);
  for (const container of [schema.properties, schema.$defs]) if (isPlainObject(container)) Object.values(container).forEach((entry) => walkSchema(entry, root, seen, false));
}

function assertAcyclicSchemaReferences(schema, root = schema, active = new Set(), complete = new Set()) {
  if (schema === true || schema === false || !isPlainObject(schema)) return;
  if (active.has(schema)) fail("SCHEMA_DOCUMENT_INVALID", "schema contains a cyclic local reference");
  if (complete.has(schema)) return;
  active.add(schema);
  const children = [];
  if (typeof schema.$ref === "string") children.push(jsonPointer(root, schema.$ref));
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"]) if (Array.isArray(schema[key])) children.push(...schema[key]);
  for (const key of ["not", "if", "then", "else", "items", "additionalProperties"]) {
    if (schema[key] === true || schema[key] === false || isPlainObject(schema[key])) children.push(schema[key]);
  }
  for (const container of [schema.properties, schema.$defs]) if (isPlainObject(container)) children.push(...Object.values(container));
  for (const child of children) assertAcyclicSchemaReferences(child, root, active, complete);
  active.delete(schema);
  complete.add(schema);
}

export function validateSchemaDocument(schema) {
  if (!isPlainObject(schema) || schema.type !== "object" || !isPlainObject(schema.properties)) fail("SCHEMA_DOCUMENT_INVALID", "bundled schema must be an object schema with properties");
  try {
    walkSchema(schema, schema, new Set(), true);
    assertAcyclicSchemaReferences(schema);
  } catch (error) {
    if (error?.code) throw error;
    fail("SCHEMA_DOCUMENT_INVALID", "bundled schema contains an invalid pattern or reference");
  }
}

export function canonicalBindingProjection(source) {
  const binding = source?.binding ?? source;
  const projection = {
    gateId: binding?.gateId,
    pilotUnitId: binding?.pilotUnitId,
    attemptId: binding?.attemptId,
    candidateDigest: binding?.candidateDigest,
    sourceCommit: binding?.sourceCommit,
    targetBaselineCommit: binding?.targetBaselineCommit,
    checkerVersion: binding?.checkerVersion,
    checkerBundleDigest: binding?.checkerBundleDigest,
    checkerReleaseCommit: source?.checkerReleaseCommit ?? binding?.checkerReleaseCommit ?? source?.checkerRelease?.releaseCommit ?? source?.checkerReleaseProof?.releaseCommit,
    parentPackageId: binding?.parentPackageId,
    parentPackageStatus: binding?.parentPackageStatus,
    executionCommit: source?.executionCommit ?? binding?.executionCommit ?? source?.worktreeProof?.executionCommit,
    directParentManifestSha256: source?.directParentManifestSha256 ?? binding?.directParentManifestSha256 ?? source?.manifest?.rawSha256,
    liveAllowed: binding?.liveAllowed ?? source?.liveAllowed,
  };
  assertExactKeys(projection, CANONICAL_BINDING_KEYS, "canonical binding projection");
  for (const key of ["candidateDigest", "checkerBundleDigest", "directParentManifestSha256"]) if (!SHA256_RE.test(projection[key] ?? "")) fail("BINDING_MALFORMED", `binding ${key} is malformed`);
  for (const key of ["sourceCommit", "targetBaselineCommit", "checkerReleaseCommit", "executionCommit"]) if (!COMMIT_RE.test(projection[key] ?? "")) fail("BINDING_MALFORMED", `binding ${key} is malformed`);
  for (const key of ["gateId", "pilotUnitId", "attemptId", "checkerVersion", "parentPackageId", "parentPackageStatus"]) {
    if (typeof projection[key] !== "string" || projection[key].length === 0 || projection[key].length > 200) fail("BINDING_MALFORMED", `binding ${key} is malformed`);
  }
  if (projection.liveAllowed !== false) fail("LIVE_BOUNDARY_INVALID", "canonical binding is not explicitly non-live");
  return projection;
}

export function canonicalBindingDigest(source) {
  return fingerprint(canonicalBindingProjection(source));
}

function normalizeExternalSideEffectProof(proof) {
  if (!isPlainObject(proof)) return proof;
  const { digest: _digest, tempEnvironment, ...stableProof } = proof;
  const normalized = {
    ...stableProof,
    tempEnvironment: {
      observed: Array.isArray(tempEnvironment) && tempEnvironment.length > 0,
      allOutsideRepository: Array.isArray(tempEnvironment) && tempEnvironment.length > 0 && tempEnvironment.every((entry) => isPlainObject(entry) && entry.outsideRepository === true),
    },
  };
  return { ...normalized, digest: fingerprint(normalized) };
}

function normalizeSemanticChecks(checks, externalSideEffectProof, canonicalizeRoleFamily = false) {
  return checks.map((check) => {
    assertExactKeys(check, ["id", "result", "details", "digest"], "Receipt check");
    const safeRole = check.id === "external-side-effects" || /^external-side-effects-v[1-9][0-9]*$/u.test(check.id);
    if (!safeRole) {
      if (typeof check.id === "string" && check.id.startsWith("external-side-effects")) fail("RECEIPT_CHECK_ID_INVALID", "external side-effect check ID is outside the safe role family");
      return check;
    }
    assertExactKeys(check.details, ["externalSideEffectCount", "proofDigest"], "external side-effect check details");
    if (check.result !== "pass" || check.details.externalSideEffectCount !== 0 || !SHA256_RE.test(check.details.proofDigest ?? "") || !SHA256_RE.test(externalSideEffectProof?.digest ?? "")) {
      fail("RECEIPT_CHECK_ID_INVALID", "external side-effect role does not carry the exact zero-side-effect proof shape");
    }
    const { digest: _digest, id: exactSafeRole, ...withoutDigest } = check;
    const normalized = { id: canonicalizeRoleFamily ? "external-side-effects" : exactSafeRole, ...withoutDigest, details: { ...check.details, proofDigest: externalSideEffectProof.digest } };
    return { ...normalized, digest: fingerprint(normalized) };
  });
}

export function receiptSemanticProjection(receipt, options = {}) {
  validateReceiptGovernanceGrammar(receipt);
  assertExactKeys(receipt.binding, RECEIPT_BINDING_KEYS, "native Receipt binding");
  assertExactKeys(receipt.lifecycle, RECEIPT_LIFECYCLE_KEYS, "native Receipt lifecycle");
  assertExactKeys(receipt.manifest, ["path", "rawSha256"], "native Receipt Manifest reference");
  assertExactKeys(receipt.run, ["runId", "producedAt", "ciMetadata"], "native Receipt run");
  if (!Array.isArray(receipt.checks) || !Array.isArray(receipt.exitReasons) || !Array.isArray(receipt.unmetConditions)) fail("RECEIPT_STRUCTURE_INVALID", "native Receipt findings collections are malformed");
  if (receipt.binding.liveAllowed !== false || receipt.lifecycle.liveAllowed !== false) fail("LIVE_BOUNDARY_INVALID", "native Receipt is not explicitly non-live");
  const { semanticReceiptDigest: _semantic, rawReceiptDigest: _raw, ...withoutDigests } = receipt;
  const externalSideEffectProof = normalizeExternalSideEffectProof(withoutDigests.externalSideEffectProof);
  return {
    ...withoutDigests,
    run: { ...withoutDigests.run, runId: null, producedAt: null, ciMetadata: null },
    externalSideEffectProof,
    checks: normalizeSemanticChecks(withoutDigests.checks, externalSideEffectProof, options.canonicalizeRoleFamily === true),
  };
}

export function attachReceiptDigests(receiptWithoutDigests) {
  const placeholder = { ...receiptWithoutDigests, semanticReceiptDigest: "0".repeat(64), rawReceiptDigest: "0".repeat(64) };
  const semanticReceiptDigest = fingerprint(receiptSemanticProjection(placeholder));
  const rawReceiptDigest = fingerprint({ ...receiptWithoutDigests, semanticReceiptDigest });
  return { ...receiptWithoutDigests, semanticReceiptDigest, rawReceiptDigest };
}

export function summarizeVerifiedReceipt(artifact, options = {}) {
  const receipt = artifact.value;
  if (!isPlainObject(options.schema) || options.schema.additionalProperties !== false) fail("RECEIPT_SCHEMA_REQUIRED", "authoritative Receipt verification requires a closed repository-native schema");
  validateSchemaDocument(options.schema);
  validateJsonSchema(receipt, options.schema, `${artifact.label ?? "Receipt"} checker-release Receipt`);
  const declaredSemanticDigest = fingerprint(receiptSemanticProjection(receipt));
  const semanticDigest = fingerprint(receiptSemanticProjection(receipt, { canonicalizeRoleFamily: true }));
  const { rawReceiptDigest: _raw, ...withoutRaw } = receipt;
  const rawDigest = fingerprint(withoutRaw);
  if (!SHA256_RE.test(receipt.semanticReceiptDigest ?? "") || !SHA256_RE.test(receipt.rawReceiptDigest ?? "")) fail("RECEIPT_DIGEST_INVALID", `${artifact.label ?? "Receipt"} digest is malformed`);
  if (declaredSemanticDigest !== receipt.semanticReceiptDigest || rawDigest !== receipt.rawReceiptDigest) fail("RECEIPT_DIGEST_MISMATCH", `${artifact.label ?? "Receipt"} self-declared digest does not match its closed projection`);
  const bindingProjection = canonicalBindingProjection(receipt);
  const runId = receipt.run?.runId;
  if (typeof runId !== "string" || runId.length === 0 || runId.length > 128) fail("RUN_ID_INVALID", "Receipt run identity is malformed");
  return {
    result: receipt.result,
    runIdDigest: sha256(runId),
    bindingProjection,
    digest: {
      receiptSha256: artifact.receiptSha256 ?? artifact.sha256,
      semanticDigest,
      rawDigest,
      bindingDigest: fingerprint(bindingProjection),
      semanticDigestVerified: true,
      liveAllowed: false,
    },
  };
}

function validatePublicScripts(packageValue) {
  const scripts = packageValue?.scripts;
  if (!isPlainObject(scripts)) fail("NATIVE_CLI_UNRESOLVED", "package scripts are missing");
  const promotionKeys = Object.keys(scripts).filter((name) => name.startsWith("promotion:")).sort();
  const expectedKeys = Object.values(EXPECTED_PROMOTION_SCRIPTS).map(({ scriptName }) => scriptName).sort();
  if (stableJson(promotionKeys) !== stableJson(expectedKeys)) fail("UNEXPECTED_PROMOTION_SCRIPT", "package.json must expose exactly the three non-live Promotion operations");
  const discovered = {};
  for (const [operation, expected] of Object.entries(EXPECTED_PROMOTION_SCRIPTS)) {
    const command = scripts[expected.scriptName];
    const match = typeof command === "string" ? command.match(/^node\s+([A-Za-z0-9_./-]+)\s+([A-Za-z0-9-]+)$/u) : null;
    if (!match || match[2] !== expected.subcommand) fail("NATIVE_OPERATION_MAPPING_INVALID", `${expected.scriptName} must map only to native ${expected.subcommand}`);
    assertSafeRepoRelativePath(match[1], "native CLI entry");
    discovered[operation] = { scriptName: expected.scriptName, entryPath: match[1], subcommand: expected.subcommand, commandSha256: sha256(command) };
  }
  return discovered;
}

function yamlIndent(line) {
  return line.match(/^\s*/u)[0].length;
}

function yamlScalar(text, label) {
  const value = stripShellComment(text).trim();
  if (value === "" || value === "|" || value === ">" || /^[&*!]\S/u.test(value)) fail("WORKFLOW_STRUCTURE_INVALID", `${label} is not one supported static YAML scalar`);
  const quoted = value.match(/^(?:"([^"\r\n]*)"|'([^'\r\n]*)')$/u);
  return quoted ? (quoted[1] ?? quoted[2]) : value;
}

function conditionTruth(value) {
  if (value === null) return true;
  const normalized = value.trim().replace(/^\$\{\{\s*/u, "").replace(/\s*\}\}$/u, "").trim().toLowerCase();
  if (["true", "always()", "success()"].includes(normalized)) return true;
  if (["false", "0", "null", "no", "off"].includes(normalized)) return false;
  return null;
}

function supportedShell(value) {
  if (value === null) return true;
  if (/\$\{\{/u.test(value)) return false;
  return /^(?:(?:\/usr\/bin\/env\s+)?(?:\/bin\/)?(?:bash|sh))$/u.test(value);
}

function parseYamlEnvAndRuns(source) {
  const lines = source.split(/\r?\n/u);
  if (lines.some((line) => line.includes("\t"))) fail("WORKFLOW_STRUCTURE_INVALID", "workflow indentation contains tabs");
  const jobsMatches = lines.map((line, index) => ({ line, index })).filter(({ line }) => /^\s*jobs:\s*(?:#.*)?$/u.test(line));
  if (jobsMatches.length === 0) return { jobs: [] };
  if (jobsMatches.length !== 1) fail("WORKFLOW_STRUCTURE_INVALID", "workflow has an ambiguous jobs mapping");
  const { index: jobsIndex, line: jobsLine } = jobsMatches[0];
  const jobsIndent = yamlIndent(jobsLine);
  const allowedWorkflowFields = new Set(["name", "on", "permissions", "env", "defaults", "jobs"]);
  const seenWorkflowFields = new Set();
  let hasWorkflowEnv = false;
  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#") || yamlIndent(line) !== jobsIndent) continue;
    const field = line.trim().match(/^([A-Za-z0-9_.-]+)\s*:/u)?.[1];
    if (!field || !allowedWorkflowFields.has(field)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow contains an unsupported top-level mapping field");
    if (seenWorkflowFields.has(field)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow repeats a top-level mapping field");
    seenWorkflowFields.add(field);
    if (field === "env") hasWorkflowEnv = true;
  }

  let workflowDefaultShell = null;
  let workflowDefaultShellCount = 0;
  for (let index = 0; index < jobsIndex; index += 1) {
    if (yamlIndent(lines[index]) !== jobsIndent || !/^\s*defaults:\s*(?:#.*)?$/u.test(lines[index])) continue;
    const defaultsIndent = yamlIndent(lines[index]);
    for (let cursor = index + 1; cursor < jobsIndex; cursor += 1) {
      if (lines[cursor].trim() === "" || lines[cursor].trim().startsWith("#")) continue;
      const indent = yamlIndent(lines[cursor]);
      if (indent <= defaultsIndent) break;
      if (/^\s*shell\s*:/u.test(lines[cursor])) {
        workflowDefaultShellCount += 1;
        if (workflowDefaultShellCount > 1) fail("WORKFLOW_STRUCTURE_INVALID", "workflow default shell is duplicated");
        workflowDefaultShell = yamlScalar(lines[cursor].replace(/^\s*shell\s*:\s*/u, ""), "workflow default shell");
      }
    }
  }

  const jobsEnd = (() => {
    for (let index = jobsIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim() !== "" && !lines[index].trim().startsWith("#") && yamlIndent(lines[index]) <= jobsIndent) return index;
    }
    return lines.length;
  })();
  const jobHeaders = [];
  for (let index = jobsIndex + 1; index < jobsEnd; index += 1) {
    if (lines[index].trim() === "" || lines[index].trim().startsWith("#")) continue;
    const match = lines[index].match(/^(\s*)([A-Za-z0-9_.-]+):\s*(?:#.*)?$/u);
    if (match && match[1].length === jobsIndent + 2) jobHeaders.push({ index, id: match[2], indent: match[1].length });
  }
  if (new Set(jobHeaders.map(({ id }) => id)).size !== jobHeaders.length) fail("WORKFLOW_STRUCTURE_INVALID", "workflow repeats a job identifier");
  if (jobHeaders.length === 0 && source.includes("npm run promotion:")) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion commands are outside one supported job mapping");

  const jobs = [];
  for (let headerIndex = 0; headerIndex < jobHeaders.length; headerIndex += 1) {
    const header = jobHeaders[headerIndex];
    const end = jobHeaders[headerIndex + 1]?.index ?? jobsEnd;
    const fieldIndent = header.indent + 2;
    let jobIf = null;
    let runsOn = null;
    let jobDefaultShell = null;
    const envEntries = [];
    const runBlocks = [];
    const usesSteps = [];
    const seenJobFields = new Set();
    const allowedJobFields = new Set(["name", "if", "runs-on", "permissions", "env", "defaults", "steps"]);
    for (let index = header.index + 1; index < end; index += 1) {
      const line = lines[index];
      if (line.trim() === "" || line.trim().startsWith("#") || yamlIndent(line) !== fieldIndent) continue;
      const jobField = line.trim().match(/^([A-Za-z0-9_.-]+)\s*:/u)?.[1];
      if (!jobField || !allowedJobFields.has(jobField)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow job contains an unsupported mapping or control field");
      if (seenJobFields.has(jobField)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow job repeats a mapping field");
      seenJobFields.add(jobField);
      if (/^\s*if\s*:/u.test(line)) jobIf = yamlScalar(line.replace(/^\s*if\s*:\s*/u, ""), "job if");
      if (/^\s*runs-on\s*:/u.test(line)) runsOn = yamlScalar(line.replace(/^\s*runs-on\s*:\s*/u, ""), "job runs-on");
      if (/^\s*env:\s*(?:#.*)?$/u.test(line)) {
        for (let cursor = index + 1; cursor < end; cursor += 1) {
          const child = lines[cursor];
          if (child.trim() === "" || child.trim().startsWith("#")) continue;
          const childIndent = yamlIndent(child);
          if (childIndent <= fieldIndent) break;
          if (childIndent !== fieldIndent + 2) continue;
          const match = child.match(/^\s*([A-Z][A-Z0-9_]*)\s*:\s*(.+)$/u);
          if (!match) fail("WORKFLOW_STRUCTURE_INVALID", "job env contains an unsupported entry");
          if (envEntries.some(({ key }) => key === match[1])) fail("WORKFLOW_STRUCTURE_INVALID", "job env contains a duplicate key");
          envEntries.push({ key: match[1], value: yamlScalar(match[2], "job env value") });
        }
      }
      if (/^\s*defaults:\s*(?:#.*)?$/u.test(line)) {
        for (let cursor = index + 1; cursor < end; cursor += 1) {
          const child = lines[cursor];
          if (child.trim() === "" || child.trim().startsWith("#")) continue;
          const childIndent = yamlIndent(child);
          if (childIndent <= fieldIndent) break;
          if (/^\s*shell\s*:/u.test(child)) {
            if (jobDefaultShell !== null) fail("WORKFLOW_STRUCTURE_INVALID", "job default shell is duplicated");
            jobDefaultShell = yamlScalar(child.replace(/^\s*shell\s*:\s*/u, ""), "job default shell");
          }
        }
      }
      if (!/^\s*steps:\s*(?:#.*)?$/u.test(line)) continue;
      const stepsIndent = fieldIndent;
      const stepHeaders = [];
      for (let cursor = index + 1; cursor < end; cursor += 1) {
        const child = lines[cursor];
        if (child.trim() === "" || child.trim().startsWith("#")) continue;
        const childIndent = yamlIndent(child);
        if (childIndent <= stepsIndent) break;
        if (childIndent === stepsIndent + 2 && /^\s*-\s+/u.test(child)) stepHeaders.push(cursor);
      }
      for (let stepIndex = 0; stepIndex < stepHeaders.length; stepIndex += 1) {
        const start = stepHeaders[stepIndex];
        const stepEnd = stepHeaders[stepIndex + 1] ?? end;
        const stepIndent = yamlIndent(lines[start]);
        let stepIf = null;
        let shell = null;
        let body = null;
        let uses = null;
        let hasStepEnv = false;
        const seenStepFields = new Set();
        const allowedStepFields = new Set(["name", "id", "if", "shell", "env", "run", "uses", "with"]);
        const firstField = lines[start].replace(/^\s*-\s+/u, "");
        const candidates = [{ text: firstField, index: start, inline: true }];
        for (let cursor = start + 1; cursor < stepEnd; cursor += 1) {
          if (lines[cursor].trim() === "" || lines[cursor].trim().startsWith("#") || yamlIndent(lines[cursor]) !== stepIndent + 2) continue;
          candidates.push({ text: lines[cursor].trim(), index: cursor, inline: false });
        }
        for (const candidate of candidates) {
          const stepField = candidate.text.match(/^([A-Za-z0-9_.-]+)\s*:/u)?.[1];
          if (!stepField || !allowedStepFields.has(stepField)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow step contains an unsupported mapping or control field");
          if (seenStepFields.has(stepField)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow step repeats a mapping field");
          seenStepFields.add(stepField);
          if (/^if\s*:/u.test(candidate.text)) stepIf = yamlScalar(candidate.text.replace(/^if\s*:\s*/u, ""), "step if");
          if (/^shell\s*:/u.test(candidate.text)) shell = yamlScalar(candidate.text.replace(/^shell\s*:\s*/u, ""), "step shell");
          if (/^env\s*:/u.test(candidate.text)) {
            if (!/^env\s*:\s*(?:#.*)?$/u.test(candidate.text)) fail("WORKFLOW_STRUCTURE_INVALID", "workflow step env must be an explicit mapping");
            hasStepEnv = true;
          }
          const usesMatch = candidate.text.match(/^uses\s*:\s*(.*)$/u);
          if (usesMatch) uses = yamlScalar(usesMatch[1], "step uses");
          const runMatch = candidate.text.match(/^run\s*:\s*(.*)$/u);
          if (!runMatch) continue;
          if (body !== null) fail("WORKFLOW_STRUCTURE_INVALID", "workflow step has multiple run fields");
          const scalar = stripShellComment(runMatch[1]).trim();
          if (/^[|>][-+]?$/u.test(scalar)) {
            const content = [];
            for (let cursor = candidate.index + 1; cursor < stepEnd; cursor += 1) {
              const child = lines[cursor];
              if (child.trim() === "") { content.push(""); continue; }
              const childIndent = yamlIndent(child);
              if (childIndent <= stepIndent + 2) break;
              content.push(child.slice(Math.min(child.length, stepIndent + 4)));
            }
            body = content.join("\n");
          } else {
            body = yamlScalar(runMatch[1], "step run");
          }
        }
        if (body !== null && uses !== null) fail("WORKFLOW_STRUCTURE_INVALID", "workflow step cannot combine run and uses authority");
        const stepAuthority = {
          condition: conditionTruth(jobIf) === true && conditionTruth(stepIf) === true,
          conditionAmbiguous: conditionTruth(jobIf) === null || conditionTruth(stepIf) === null,
          hasStepEnv,
        };
        if (body !== null) runBlocks.push({
          body,
          ...stepAuthority,
          shell: shell ?? jobDefaultShell ?? workflowDefaultShell,
        });
        if (uses !== null) usesSteps.push({ ...stepAuthority, uses });
      }
    }
    jobs.push({ id: header.id, envEntries, runBlocks, runsOn, usesSteps });
  }
  return { jobs, hasWorkflowEnv };
}

function stripShellComment(line) {
  let single = false;
  let double = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && !single) { escaped = true; continue; }
    if (character === "'" && !double) { single = !single; continue; }
    if (character === '"' && !single) { double = !double; continue; }
    if (character === "#" && !single && !double && (index === 0 || /\s/u.test(line[index - 1]))) return line.slice(0, index);
  }
  return line;
}

function unmatchedShellQuote(line) {
  let single = false;
  let double = false;
  let escaped = false;
  let opening = -1;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && !single) { escaped = true; continue; }
    if (character === "'" && !double) { single = !single; opening = single ? index : -1; continue; }
    if (character === '"' && !single) { double = !double; opening = double ? index : -1; }
  }
  return single ? { character: "'", index: opening } : double ? { character: '"', index: opening } : null;
}

function findQuoteClose(line, character) {
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    if (escaped) { escaped = false; continue; }
    if (character === '"' && line[index] === "\\") { escaped = true; continue; }
    if (line[index] === character) return index;
  }
  return -1;
}

function lexicalShellLines(block) {
  const lines = [];
  const programs = new Map();
  let heredocDelimiter = null;
  let quote = null;
  for (const rawLine of block.split(/\r?\n/u)) {
    const trimmedRaw = rawLine.trim();
    if (heredocDelimiter !== null) {
      if (trimmedRaw === heredocDelimiter) heredocDelimiter = null;
      continue;
    }
    if (quote !== null) {
      const closing = findQuoteClose(rawLine, quote.character);
      if (closing < 0) { quote.content.push(rawLine); continue; }
      quote.content.push(rawLine.slice(0, closing));
      const suffix = rawLine.slice(closing + 1);
      if (quote.executableNodeProgram) {
        const marker = `__PROMOTION_NODE_PROGRAM_${programs.size}__`;
        programs.set(marker, quote.content.join("\n"));
        lines.push(`${quote.prefix} ${marker} ${suffix}`.trimEnd());
      } else {
        lines.push(`${quote.prefix} '' ${suffix}`.trimEnd());
      }
      quote = null;
      continue;
    }
    const uncommented = stripShellComment(rawLine).trimEnd();
    if (uncommented.trim() === "") continue;
    const heredoc = uncommented.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/u);
    if (heredoc) {
      heredocDelimiter = heredoc[1];
      const prefix = uncommented.slice(0, heredoc.index).trim();
      if (prefix) lines.push(prefix);
      continue;
    }
    const opening = unmatchedShellQuote(uncommented);
    if (opening) {
      const prefix = uncommented.slice(0, opening.index).trimEnd();
      quote = {
        character: opening.character,
        prefix,
        content: [uncommented.slice(opening.index + 1)],
        executableNodeProgram: /^node\s+--input-type=module\s+-e\s*$/u.test(prefix.trim()),
      };
      continue;
    }
    lines.push(uncommented);
  }
  if (quote !== null || heredocDelimiter !== null) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell contains an unterminated quoted or heredoc body");
  return { lines, programs };
}

function staticFalseShellCondition(line) {
  const normalized = line.trim().replace(/;?\s*then\s*;?$/u, "").trim();
  if (/^if\s+(?:false|\[\s*false\s*\]|\[\[\s*false\s*\]\])$/u.test(normalized)) return true;
  if (/^if\s+\(\(\s*0\s*\)\)$/u.test(normalized)) return true;
  if (/^if\s+(?:\[|\[\[)\s*(?:1\s+-eq\s+0|0\s+-ne\s+0|1\s+==\s+0|0\s+!=\s+0)\s*(?:\]|\]\])$/u.test(normalized)) return true;
  return /^if\s+test\s+(?:1\s+-eq\s+0|0\s+-ne\s+0)$/u.test(normalized);
}

function staticTrueShellCondition(line) {
  const normalized = line.trim().replace(/;?\s*then\s*;?$/u, "").trim();
  if (/^if\s+(?:true|\[\s*true\s*\]|\[\[\s*true\s*\]\])$/u.test(normalized)) return true;
  if (/^if\s+\(\(\s*1\s*\)\)$/u.test(normalized)) return true;
  if (/^if\s+(?:\[|\[\[)\s*(?:1\s+-eq\s+1|0\s+-eq\s+0|1\s+==\s+1|0\s+==\s+0)\s*(?:\]|\]\])$/u.test(normalized)) return true;
  return /^if\s+test\s+(?:1\s+-eq\s+1|0\s+-eq\s+0)$/u.test(normalized);
}

function removeStaticallyDeadShell(lines, { strictEvidence = false } = {}) {
  const output = [];
  const branches = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^if\b/u.test(trimmed)) {
      const oneLine = /;\s*fi\s*;?$/u.test(trimmed);
      let truth = staticFalseShellCondition(trimmed) ? false : staticTrueShellCondition(trimmed) ? true : null;
      if (truth === null && strictEvidence) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell condition is dynamic or ambiguous");
      if (truth === null) truth = true;
      if (oneLine) {
        if (truth !== false) fail("WORKFLOW_STRUCTURE_INVALID", "one-line Promotion workflow shell branches are unsupported");
      } else {
        branches.push({ truth, inElse: false });
      }
      continue;
    }
    if (/^then\s*;?$/u.test(trimmed)) continue;
    if (/^elif\b/u.test(trimmed)) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell elif conditions are ambiguous");
    if (/^else\s*;?$/u.test(trimmed)) {
      if (branches.length === 0) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell has an unmatched branch");
      branches[branches.length - 1].inElse = true;
      continue;
    }
    if (/^fi\s*;?$/u.test(trimmed)) {
      if (branches.length === 0) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell has an unmatched branch terminator");
      branches.pop();
      continue;
    }
    const dead = branches.some(({ truth, inElse }) => (truth === false && !inElse) || (truth === true && inElse));
    if (!dead) output.push(line);
  }
  if (branches.length !== 0) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell has an unterminated branch");
  return output;
}

function truncateAfterTerminal(lines, inFunction = false) {
  const output = [];
  let discarded = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    output.push(line);
    const terminal = inFunction ? /^(?:return|exit)(?:\s|;|$)/u : /^exit(?:\s|;|$)/u;
    if (terminal.test(trimmed)) { discarded = lines.slice(index + 1); break; }
  }
  return { lines: output, discarded };
}

function assertSupportedEvidenceShellControl(lines) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(?:while|until|case|esac|select|for)\b/u.test(trimmed) || trimmed === "(" || trimmed === ")") {
      fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence uses unsupported shell control flow");
    }
    if (/\$\(/u.test(trimmed)) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence uses command substitution");
    if (/^(?:exit|return)\b[^\r\n]*(?:;|&&|\|\|)\s*\S/u.test(trimmed)) {
      fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence appears after a compound shell terminator");
    }
  }
}

function foldShellContinuations(lines) {
  const folded = [];
  let pending = "";
  for (const line of lines) {
    const trimmed = line.trim();
    const continued = /\\$/u.test(trimmed);
    const fragment = continued ? trimmed.slice(0, -1).trimEnd() : trimmed;
    pending = pending ? `${pending} ${fragment}` : fragment;
    if (!continued) { folded.push(pending); pending = ""; }
  }
  if (pending) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow has an unterminated shell continuation");
  return folded;
}

function analyzeExecutableShell(block, { strictEvidence = false } = {}) {
  const lexical = lexicalShellLines(block);
  if (strictEvidence) assertSupportedEvidenceShellControl(lexical.lines);
  const lines = foldShellContinuations(removeStaticallyDeadShell(lexical.lines, { strictEvidence }));
  const functions = new Map();
  const rawTopLevel = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{$/u);
    if (!opening) { rawTopLevel.push(lines[index]); continue; }
    const body = [];
    let depth = 1;
    for (index += 1; index < lines.length; index += 1) {
      const current = lines[index].trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(\)\s*\{$/u.test(current)) depth += 1;
      if (current === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
      if (depth > 0) body.push(lines[index]);
    }
    if (depth !== 0 || functions.has(opening[1])) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow shell function grammar is ambiguous");
    functions.set(opening[1], truncateAfterTerminal(body, true));
  }
  const topLevelReachability = truncateAfterTerminal(rawTopLevel, false);
  const topLevel = topLevelReachability.lines;
  const calls = [];
  const reachableFunctionNames = new Set();
  const queue = [];
  const discoverCalls = (candidateLines, recordTopLevel = false) => {
    for (let lineIndex = 0; lineIndex < candidateLines.length; lineIndex += 1) {
      const line = candidateLines[lineIndex];
      const call = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/u);
      if (!call || !functions.has(call[1])) continue;
      if (recordTopLevel) calls.push({ name: call[1], args: call[2].trim(), line: line.trim(), topLevelIndex: lineIndex });
      if (!reachableFunctionNames.has(call[1])) { reachableFunctionNames.add(call[1]); queue.push(call[1]); }
    }
  };
  discoverCalls(topLevel, true);
  while (queue.length > 0) discoverCalls(functions.get(queue.shift())?.lines ?? [], false);
  const executableLines = [...topLevel, ...[...reachableFunctionNames].flatMap((name) => functions.get(name)?.lines ?? [])];
  const reachableNodePrograms = executableLines.flatMap((line) => [...lexical.programs.entries()].filter(([marker]) => line.includes(marker)).map(([, program]) => program));
  const text = `${executableLines.join("\n")}\n${reachableNodePrograms.join("\n")}`;
  const unreachableAfterTerminal = [
    ...topLevelReachability.discarded,
    ...[...reachableFunctionNames].flatMap((name) => functions.get(name)?.discarded ?? []),
  ];
  return { executableLines, topLevel, functions: new Map([...functions].map(([name, value]) => [name, value.lines])), calls, reachableNodePrograms, nodePrograms: lexical.programs, text, unreachableAfterTerminal };
}

function parsePromotionCommand(line) {
  const match = line.trim().match(/^npm(?:\s+--silent)?\s+run\s+(promotion:[a-z0-9:-]+)\s+--\s+(.+)$/u);
  if (!match) return null;
  return { scriptName: match[1], argumentsText: match[2] };
}

function receiptBinding(argumentsText) {
  const match = argumentsText.match(/^--receipt\s+"?\$([A-Za-z_][A-Za-z0-9_]*)"?(?:\s+--json(?:\s+>\s+"?\$([A-Za-z_][A-Za-z0-9_]*)"?)?)?$/u);
  return match ? { receiptVariable: match[1], reportVariable: match[2] ?? null } : null;
}

function parseSemanticComparator(line, nodePrograms = new Map()) {
  const match = line.trim().match(/^node\s+([A-Za-z0-9_./-]+)\s+compare-receipts\s+--manifest\s+"?\$PROMOTION_MANIFEST"?\s+--canonical\s+"?\$(PROMOTION_CANONICAL(?:_RECEIPT(?:_COPY)?)?)"?\s+--fresh\s+"?\$PROMOTION_FRESH_RECEIPT"?\s+--replay\s+"?\$PROMOTION_REPLAY_RECEIPT"?\s+--fail-on-mismatch$/u);
  if (match) {
    assertSafeRepoRelativePath(match[1], "semantic comparator entry");
    return { kind: "external-release-bound", entryPath: match[1], canonicalVariable: match[2], programSha256: null };
  }
  const inline = line.trim().match(/^node\s+--input-type=module\s+-e\s+(__PROMOTION_NODE_PROGRAM_\d+__)\s+(.+)$/u);
  if (!inline || !nodePrograms.has(inline[1])) return null;
  if (!/^(?:"\$[A-Za-z_][A-Za-z0-9_]*"|\$[A-Za-z_][A-Za-z0-9_]*)\s+(?:"\$[A-Za-z_][A-Za-z0-9_]*"|\$[A-Za-z_][A-Za-z0-9_]*)\s+(?:"\$[A-Za-z_][A-Za-z0-9_]*"|\$[A-Za-z_][A-Za-z0-9_]*)$/u.test(inline[2].trim())) return null;
  const variables = [...inline[2].matchAll(/"?\$([A-Za-z_][A-Za-z0-9_]*)"?/gu)].map((entry) => entry[1]);
  const allowedCanonical = variables.filter((name) => /^PROMOTION_CANONICAL(?:_RECEIPT(?:_COPY)?)?$/u.test(name));
  if (variables.length !== 3 || allowedCanonical.length !== 1 || variables.filter((name) => name === "PROMOTION_FRESH_RECEIPT").length !== 1 || variables.filter((name) => name === "PROMOTION_REPLAY_RECEIPT").length !== 1) return null;
  const program = nodePrograms.get(inline[1]);
  const normalized = program.replaceAll(/\s+/gu, " ").trim();
  const safeDigestThrow = 'throw new Error(`Semantic Receipt digest mismatch: ${digests.join(", ")}`);';
  const sanitized = normalized
    .replaceAll(safeDigestThrow, "throw;")
    .replaceAll(/throw new Error\((?:"[^"\\\r\n]*"|'[^'\\\r\n]*')\);/gu, "throw;");
  const expected = 'import { readFileSync } from "node:fs"; const paths = process.argv.slice(1); const receipts = paths.map((receiptPath) => JSON.parse(readFileSync(receiptPath, "utf8"))); if (receipts.length !== 3 || receipts.some((receipt) => receipt.result !== "pass" || receipt.binding?.liveAllowed !== false)) { throw; } const digests = receipts.map((receipt) => receipt.semanticReceiptDigest); if (digests.some((digest) => !/^[a-f0-9]{64}$/.test(digest)) || !digests.every((digest) => digest === digests[0])) { throw; }';
  if (sanitized !== expected) return null;
  return { kind: "inline-workflow", entryPath: null, canonicalVariable: allowedCanonical[0], programSha256: sha256(program) };
}

function proveDistinctRunIdTemplates(fresh, replay) {
  if (!fresh.includes("${{") && !replay.includes("${{")) return fresh !== replay;
  const split = (value) => {
    const expressions = [...value.matchAll(/\$\{\{\s*([^}]+?)\s*\}\}/gu)].map((match) => match[1].trim());
    const literals = value.split(/\$\{\{\s*[^}]+?\s*\}\}/gu);
    return { expressions, literals };
  };
  const left = split(fresh);
  const right = split(replay);
  if (stableJson(left.expressions) !== stableJson(right.expressions) || left.expressions.length === 0 || left.literals.length !== right.literals.length) return false;
  const differences = left.literals.map((value, index) => ({ index, left: value, right: right.literals[index] })).filter(({ left: a, right: b }) => a !== b);
  if (differences.length !== 1) return false;
  const difference = differences[0];
  if (![0, left.literals.length - 1].includes(difference.index)) return false;
  return (difference.left.startsWith(difference.right) && difference.left.length > difference.right.length) || (difference.right.startsWith(difference.left) && difference.right.length > difference.left.length);
}

export function parsePromotionWorkflow(source) {
  const rawEvidencePattern = /(?:npm(?:\s+--silent)?\s+run\s+promotion:|compare-receipts|semanticReceiptDigest[^\r\n]*(?:PROMOTION_CANONICAL|PROMOTION_FRESH|PROMOTION_REPLAY))/u;
  // Discovery scans every tracked workflow. Only a workflow that advertises
  // Promotion evidence is in this parser's authority boundary; once it does,
  // every accepted top-level, job, and step mapping remains fail-closed.
  if (!rawEvidencePattern.test(source)) return null;
  const { jobs, hasWorkflowEnv } = parseYamlEnvAndRuns(source);
  const prepared = [];
  for (const job of jobs) {
    for (const block of job.runBlocks) {
      const containsEvidenceText = rawEvidencePattern.test(block.body);
      if (containsEvidenceText && (block.conditionAmbiguous || block.condition !== true)) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence is conditionally disabled or ambiguous");
      if (containsEvidenceText && !supportedShell(block.shell)) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence uses an unsupported shell");
      if (containsEvidenceText && block.hasStepEnv) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence may not shadow authoritative job environment selectors");
      if (containsEvidenceText && !SUPPORTED_LINUX_RUNNERS.has(job.runsOn)) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence does not run in one explicit supported Linux job");
      if (block.condition === true && supportedShell(block.shell)) {
        const analysis = analyzeExecutableShell(block.body, { strictEvidence: containsEvidenceText });
        if (analysis.unreachableAfterTerminal.some((line) => rawEvidencePattern.test(line))) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion workflow evidence appears only after an unconditional shell terminator");
        prepared.push({ jobId: job.id, analysis });
      }
    }
  }
  const commands = prepared.flatMap(({ analysis, jobId }, blockIndex) => analysis.executableLines.map((line, lineIndex) => {
    const command = parsePromotionCommand(line);
    return command ? { ...command, blockIndex, lineIndex, jobId } : null;
  }).filter(Boolean));
  const advertised = commands.map(({ scriptName }) => scriptName);
  if (advertised.length === 0) return null;
  const commandJobs = [...new Set(commands.map(({ jobId }) => jobId))];
  if (commandJobs.length !== 1) fail("WORKFLOW_STRUCTURE_INVALID", "Promotion evidence is split across multiple jobs");
  const selectedJob = jobs.find(({ id }) => id === commandJobs[0]);
  const selectedPrepared = prepared.filter(({ jobId }) => jobId === commandJobs[0]);
  const analyses = selectedPrepared.map(({ analysis }) => analysis);
  const envEntries = selectedJob.envEntries;
  const selectedCommands = commands.map(({ blockIndex: oldIndex, ...command }) => ({
    ...command,
    blockIndex: selectedPrepared.findIndex((entry) => entry === prepared[oldIndex]),
  }));
  const allowed = new Set(Object.values(EXPECTED_PROMOTION_SCRIPTS).map(({ scriptName }) => scriptName));
  if (advertised.some((name) => !allowed.has(name))) fail("WORKFLOW_OPERATION_FORBIDDEN", "workflow invokes an unregistered Promotion operation");
  const selector = (name, required = true) => {
    const matches = envEntries.filter((entry) => entry.key === name);
    if (matches.length === 0 && !required) return null;
    if (matches.length !== 1) fail("AMBIGUOUS_SELECTOR", `${name} selector is absent or ambiguous`);
    assertSafeRepoRelativePath(matches[0].value, name);
    return matches[0].value;
  };
  const envScalar = (name) => {
    const matches = envEntries.filter((entry) => entry.key === name);
    if (matches.length !== 1 || matches[0].value.length > 500) fail("AMBIGUOUS_SELECTOR", `${name} is absent or ambiguous`);
    return matches[0].value;
  };
  const manifestSelector = selector("PROMOTION_MANIFEST");
  const receiptSelector = selector("PROMOTION_CANONICAL_RECEIPT");
  const reaffirmationSelector = selector("PROMOTION_REAFFIRMATION", false);
  const freshRunId = envScalar("PROMOTION_RUN_ID");
  const replayRunId = envScalar("PROMOTION_REPLAY_RUN_ID");
  if (!proveDistinctRunIdTemplates(freshRunId, replayRunId)) fail("WORKFLOW_STRUCTURE_INVALID", "fresh and replay run identities are not provably distinct");
  const validateCommands = selectedCommands.filter(({ scriptName, argumentsText }) => scriptName === "promotion:validate" && /^--manifest\s+"?\$PROMOTION_MANIFEST"?(?:\s+--json(?:\s+>\s+"?\$PROMOTION_CURRENT_VALIDATION"?)?)?$/u.test(argumentsText));
  const freshCommands = selectedCommands.filter(({ scriptName, argumentsText }) => scriptName === "promotion:shadow" && /^--manifest\s+"?\$PROMOTION_MANIFEST"?\s+--run-id\s+"?\$PROMOTION_RUN_ID"?(?:\s+--json(?:\s+>\s+"?\$PROMOTION_FRESH_RECEIPT"?)?)?$/u.test(argumentsText));
  const replayCommands = selectedCommands.filter(({ scriptName, argumentsText }) => scriptName === "promotion:shadow" && /^--manifest\s+"?\$PROMOTION_MANIFEST"?\s+--run-id\s+"?\$PROMOTION_REPLAY_RUN_ID"?(?:\s+--json(?:\s+>\s+"?\$PROMOTION_REPLAY_RECEIPT"?)?)?$/u.test(argumentsText));
  const allValidateCommands = selectedCommands.filter(({ scriptName }) => scriptName === "promotion:validate");
  const allShadowCommands = selectedCommands.filter(({ scriptName }) => scriptName === "promotion:shadow");
  const allVerifyCommands = selectedCommands.filter(({ scriptName }) => scriptName === "promotion:verify-receipt");
  const verifyTargets = [];
  const helperAuthority = [];
  let everyVerifyCommandAccounted = true;
  for (const command of allVerifyCommands) {
    const binding = receiptBinding(command.argumentsText);
    const variable = binding?.receiptVariable ?? null;
    if (variable && variable !== "receipt_path") {
      const expectedReport = variable === "PROMOTION_FRESH_RECEIPT"
        ? "PROMOTION_FRESH_VERIFICATION"
        : variable === "PROMOTION_REPLAY_RECEIPT"
          ? "PROMOTION_REPLAY_VERIFICATION"
          : /^PROMOTION_CANONICAL(?:_RECEIPT(?:_COPY)?)?$/u.test(variable)
            ? "PROMOTION_CANONICAL_VERIFICATION"
            : null;
      if (binding.reportVariable === null || binding.reportVariable === expectedReport) {
        verifyTargets.push({ name: variable, order: command.blockIndex * 100000 + command.lineIndex });
      } else everyVerifyCommandAccounted = false;
    }
    if (variable === "receipt_path") {
      const analysis = analyses[command.blockIndex];
      const owners = [...analysis.functions].filter(([, lines]) => lines.some((line) => {
        const candidate = parsePromotionCommand(line);
        return candidate?.scriptName === command.scriptName && candidate.argumentsText === command.argumentsText;
      })).map(([name]) => name);
      if (owners.length !== 1) { everyVerifyCommandAccounted = false; continue; }
      const calls = analysis.calls.filter(({ name }) => name === owners[0]);
      if (calls.length === 0) everyVerifyCommandAccounted = false;
      const helperCommand = parsePromotionCommand(analysis.functions.get(owners[0]).find((line) => parsePromotionCommand(line)?.scriptName === "promotion:verify-receipt") ?? "");
      const reportVariable = helperCommand?.argumentsText.match(/^--receipt\s+"?\$receipt_path"?(?:\s+--json)?\s+>\s+"?\$([A-Za-z_][A-Za-z0-9_]*)"?$/u)?.[1] ?? null;
      const expectedHelperBody = reportVariable === null
        ? ['local receipt_path="$1"', analysis.functions.get(owners[0]).find((line) => parsePromotionCommand(line)?.scriptName === "promotion:verify-receipt")]
        : ['local receipt_path="$1"', `local ${reportVariable}="$2"`, analysis.functions.get(owners[0]).find((line) => parsePromotionCommand(line)?.scriptName === "promotion:verify-receipt")];
      if (
        owners[0] !== "verify_one" ||
        expectedHelperBody.includes(undefined) ||
        stableJson(analysis.functions.get(owners[0])) !== stableJson(expectedHelperBody)
      ) {
        everyVerifyCommandAccounted = false;
        continue;
      }
      const helperCalls = [];
      for (const call of calls) {
        const parsedCall = call.args.match(/^"?\$([A-Za-z_][A-Za-z0-9_]*)"?(?:\s+"?\$([A-Za-z_][A-Za-z0-9_]*)"?)?$/u);
        const target = parsedCall?.[1] ?? null;
        const report = parsedCall?.[2] ?? null;
        const expectedReport = target === "PROMOTION_FRESH_RECEIPT"
          ? "PROMOTION_FRESH_VERIFICATION"
          : target === "PROMOTION_REPLAY_RECEIPT"
            ? "PROMOTION_REPLAY_VERIFICATION"
            : /^PROMOTION_CANONICAL(?:_RECEIPT(?:_COPY)?)?$/u.test(target ?? "")
              ? "PROMOTION_CANONICAL_VERIFICATION"
              : null;
        const callIsExact = target !== null && (
          (reportVariable === null && report === null) ||
          (reportVariable !== null && report === expectedReport)
        );
        if (callIsExact) {
          verifyTargets.push({ name: target, order: command.blockIndex * 100000 + call.topLevelIndex });
          helperCalls.push(call.topLevelIndex);
        } else everyVerifyCommandAccounted = false;
      }
      helperAuthority.push({ blockIndex: command.blockIndex, owner: owners[0], callLineIndexes: helperCalls });
    }
    if (!binding) everyVerifyCommandAccounted = false;
  }
  const canonicalTargets = verifyTargets.filter(({ name }) => /^PROMOTION_CANONICAL(?:_RECEIPT(?:_COPY)?)?$/u.test(name));
  const orderedLines = selectedPrepared.flatMap(({ analysis }, blockIndex) => analysis.executableLines.map((line, lineIndex) => ({ line, nodePrograms: analysis.nodePrograms, order: blockIndex * 100000 + lineIndex })));
  const comparators = orderedLines.map(({ line, nodePrograms, order }) => ({ comparator: parseSemanticComparator(line, nodePrograms), order })).filter(({ comparator }) => comparator !== null);
  const inlineComparatorProgramSha256 = comparators.length === 1 && comparators[0].comparator.kind === "inline-workflow" ? comparators[0].comparator.programSha256 : null;
  for (const analysis of analyses) {
    if (analysis.executableLines.some((line) => /\bJSON\.parse\s*\(/u.test(line))) fail("WORKFLOW_JSON_PARSE_UNTRUSTED", "Promotion workflow contains a JSON.parse outside the exact semantic comparator");
    for (const program of analysis.reachableNodePrograms) {
      const occurrenceCount = [...program.matchAll(/\bJSON\.parse\s*\(/gu)].length;
      if (occurrenceCount === 0) continue;
      if (occurrenceCount !== 1 || sha256(program) !== inlineComparatorProgramSha256) fail("WORKFLOW_JSON_PARSE_UNTRUSTED", "Promotion workflow contains a JSON.parse outside the exact semantic comparator");
    }
  }
  const comparatorInvocationCount = orderedLines.filter(({ line, nodePrograms }) => {
    if (/\bcompare-receipts\b/u.test(line)) return true;
    const marker = line.match(/^node\s+--input-type=module\s+-e\s+(__PROMOTION_NODE_PROGRAM_\d+__)/u)?.[1];
    return marker ? nodePrograms.get(marker)?.includes("semanticReceiptDigest") : false;
  }).length;
  const commandOrder = (scriptName, predicate = () => true) => orderedLines.find(({ line }) => {
    const command = parsePromotionCommand(line);
    return command?.scriptName === scriptName && predicate(command.argumentsText);
  })?.order ?? -1;
  const validateOrder = commandOrder("promotion:validate");
  const freshOrder = commandOrder("promotion:shadow", (value) => value.includes("$PROMOTION_RUN_ID"));
  const replayOrder = commandOrder("promotion:shadow", (value) => value.includes("$PROMOTION_REPLAY_RUN_ID"));
  const ordered = validateOrder >= 0 && validateOrder < freshOrder && freshOrder < replayOrder && verifyTargets.length === 3 && verifyTargets.every(({ order }) => replayOrder < order) && comparators.length === 1 && replayOrder < comparators[0].order;
  if (allValidateCommands.length !== 1 || allShadowCommands.length !== 2 || validateCommands.length !== 1 || freshCommands.length !== 1 || replayCommands.length !== 1 || !everyVerifyCommandAccounted || verifyTargets.length !== 3 || canonicalTargets.length !== 1 || verifyTargets.filter(({ name }) => name === "PROMOTION_FRESH_RECEIPT").length !== 1 || verifyTargets.filter(({ name }) => name === "PROMOTION_REPLAY_RECEIPT").length !== 1 || comparatorInvocationCount !== 1 || !ordered) {
    fail("WORKFLOW_STRUCTURE_INVALID", "workflow must structurally contain one validate, fresh Shadow, replay Shadow, three-Receipt verify, and semantic comparison step");
  }
  if (selectedJob.usesSteps.length !== 0) {
    fail("WORKFLOW_OPERATION_FORBIDDEN", "selected Promotion job contains an untrusted action step");
  }
  const allowedJobEnv = new Set([
    "PROMOTION_MANIFEST",
    "PROMOTION_CANONICAL_RECEIPT",
    "PROMOTION_REAFFIRMATION",
    "PROMOTION_RUN_ID",
    "PROMOTION_REPLAY_RUN_ID",
  ]);
  if (hasWorkflowEnv || envEntries.some(({ key }) => !allowedJobEnv.has(key))) {
    fail("WORKFLOW_OPERATION_FORBIDDEN", "Promotion workflow contains an environment hook outside the exact selector policy");
  }
  if (selectedJob.runBlocks.some((block) => block.conditionAmbiguous || (block.condition === true && !supportedShell(block.shell)))) {
    fail("WORKFLOW_OPERATION_FORBIDDEN", "selected Promotion job contains an executable step outside the exact shell policy");
  }
  const authorizedExecutableLines = new Set(selectedCommands.map(({ blockIndex, lineIndex }) => `${blockIndex}:${lineIndex}`));
  authorizedExecutableLines.add(`${Math.floor(comparators[0].order / 100000)}:${comparators[0].order % 100000}`);
  for (const helper of helperAuthority) {
    const analysis = analyses[helper.blockIndex];
    for (const lineIndex of helper.callLineIndexes) authorizedExecutableLines.add(`${helper.blockIndex}:${lineIndex}`);
    let functionLineIndex = analysis.topLevel.length;
    for (const [name, lines] of analysis.functions) {
      if (name === helper.owner) {
        for (let offset = 0; offset < lines.length; offset += 1) authorizedExecutableLines.add(`${helper.blockIndex}:${functionLineIndex + offset}`);
        break;
      }
      functionLineIndex += lines.length;
    }
  }
  for (let blockIndex = 0; blockIndex < analyses.length; blockIndex += 1) {
    for (let lineIndex = 0; lineIndex < analyses[blockIndex].executableLines.length; lineIndex += 1) {
      if (!authorizedExecutableLines.has(`${blockIndex}:${lineIndex}`)) {
        fail("WORKFLOW_OPERATION_FORBIDDEN", "selected Promotion job contains an executable outside the exact native gate policy");
      }
    }
  }
  return { manifestSelector, receiptSelector, reaffirmationSelector, comparator: comparators[0].comparator };
}

async function findWorkflow(repoRoot, repositoryAdapter, authoritativeRecords) {
  const paths = (await repositoryAdapter.listTrackedPaths(".github/workflows")).filter((pathValue) => /\.ya?ml$/u.test(pathValue));
  const matches = [];
  for (const pathValue of paths) {
    const artifact = await verifyTrackedCurrentFile(repoRoot, pathValue, "workflow", repositoryAdapter);
    const parsed = parsePromotionWorkflow(artifact.text);
    if (parsed) matches.push({ ...artifact, ...parsed });
  }
  if (matches.length !== 1) fail("AMBIGUOUS_WORKFLOW", "Promotion workflow is absent or ambiguous");
  authoritativeRecords.push(matches[0]);
  return matches[0];
}

function schemaForValue(schemaArtifacts, value, label) {
  const matches = schemaArtifacts.filter((artifact) => artifact.value?.properties?.schemaVersion?.const === value?.schemaVersion);
  if (matches.length !== 1) fail("CHECKER_SCHEMA_UNRESOLVED", `${label} has no one exact bundled schema`);
  return matches[0];
}

function uniqueReceiptSchema(schemaArtifacts) {
  const matches = schemaArtifacts.filter((artifact) => (
    artifact.value?.type === "object" &&
    artifact.value?.additionalProperties === false &&
    artifact.value?.properties?.mode?.const === "shadow" &&
    Object.hasOwn(artifact.value.properties ?? {}, "semanticReceiptDigest") &&
    Object.hasOwn(artifact.value.properties ?? {}, "rawReceiptDigest")
  ));
  if (matches.length !== 1) fail("CHECKER_SCHEMA_UNRESOLVED", "checker release does not bind exactly one closed Shadow Receipt schema");
  return matches[0];
}

async function resolveCheckerRelease(repoRoot, manifestArtifact, nativeCli, repositoryAdapter, head, authoritativeRecords) {
  const descriptor = manifestArtifact.value?.checkerRelease;
  if (!isPlainObject(descriptor) || typeof descriptor.ledgerPath !== "string" || !SHA256_RE.test(descriptor.ledgerRawSha256 ?? "") || descriptor.version !== manifestArtifact.value.checkerVersion || descriptor.bundleAlgorithm !== "sha256-stable-json-path-raw-v2" || !SHA256_RE.test(descriptor.bundleDigest ?? "") || !COMMIT_RE.test(descriptor.releaseCommit ?? "")) fail("CHECKER_RELEASE_UNRESOLVED", "Manifest checker release is incomplete");
  const ledger = await readCurrentJson(repoRoot, descriptor.ledgerPath, "checker release ledger", repositoryAdapter);
  authoritativeRecords.push(ledger);
  if (ledger.sha256 !== descriptor.ledgerRawSha256) fail("CHECKER_LEDGER_DIGEST_MISMATCH", "declared checker ledger digest differs from current bytes");
  if (!await repositoryAdapter.commitExists(descriptor.releaseCommit) || !await repositoryAdapter.isAncestor(descriptor.releaseCommit, head)) fail("CHECKER_RELEASE_COMMIT_INVALID", "checker release commit is missing or not ancestral to HEAD");
  const entries = Array.isArray(ledger.value?.entries) ? ledger.value.entries : [];
  const matches = entries.filter((entry) => entry?.version === descriptor.version);
  if (matches.length !== 1) fail("CHECKER_RELEASE_UNRESOLVED", "checker ledger does not resolve one exact version");
  const entry = matches[0];
  assertExactKeys(entry, ["version", "bundleAlgorithm", "bundlePaths", "bundleDigest", "releaseCommit"], "checker release entry");
  if (entry.bundleAlgorithm !== descriptor.bundleAlgorithm || entry.bundleDigest !== descriptor.bundleDigest || entry.releaseCommit !== descriptor.releaseCommit || !Array.isArray(entry.bundlePaths) || entry.bundlePaths.length === 0 || new Set(entry.bundlePaths).size !== entry.bundlePaths.length) fail("CHECKER_RELEASE_UNRESOLVED", "checker ledger entry disagrees with Manifest");
  const bundleBindings = [];
  const bundleArtifacts = [];
  const schemaArtifacts = [];
  for (const bundlePath of entry.bundlePaths) {
    const artifact = await verifyTrackedCurrentFile(repoRoot, bundlePath, "checker bundle file", repositoryAdapter);
    const releasedBytes = await repositoryAdapter.blob(descriptor.releaseCommit, bundlePath);
    if (!Buffer.isBuffer(releasedBytes) || !releasedBytes.equals(artifact.bytes)) fail("CHECKER_RELEASE_DRIFT", "current checker bundle differs from its immutable release commit");
    authoritativeRecords.push(artifact);
    bundleArtifacts.push(artifact);
    bundleBindings.push({ path: bundlePath, rawSha256: artifact.sha256 });
    if (/\.schema\.json$/u.test(bundlePath)) {
      let value;
      value = parseAuthoritativeJson(artifact.text, "bundled checker schema", "CHECKER_SCHEMA_MALFORMED");
      validateSchemaDocument(value);
      schemaArtifacts.push({ ...artifact, value });
    }
  }
  if (schemaArtifacts.length === 0) fail("CHECKER_SCHEMA_UNRESOLVED", "checker bundle contains no schema");
  const recomputed = fingerprint(bundleBindings);
  if (recomputed !== descriptor.bundleDigest) fail("CHECKER_BUNDLE_DIGEST_MISMATCH", "checker bundle digest does not recompute");
  const entryPaths = new Set(entry.bundlePaths);
  if (Object.values(nativeCli).some(({ entryPath }) => !entryPaths.has(entryPath))) fail("NATIVE_CLI_NOT_RELEASE_BOUND", "advertised native CLI entry is outside the checker release bundle");
  return { descriptor, ledger, entry, bundleBindings, bundleArtifacts, bundleDigest: recomputed, bundlePathsDigest: fingerprint(bundleBindings.map(({ path }) => path)), schemaArtifacts };
}

export async function discoverTrustedReceiptSchema(repoInput, selectedManifestPath) {
  const requestedRepoRoot = resolve(repoInput);
  const repoRoot = await realpath(requestedRepoRoot);
  if (repoRoot !== requestedRepoRoot) fail("REPOSITORY_ROOT_SYMLINK_FORBIDDEN", "repository root must be canonical");
  const repositoryAdapter = createGitRepositoryAdapter(repoRoot);
  const authoritativeRecords = [];
  const packageArtifact = await readCurrentJson(repoRoot, "package.json", "package.json", repositoryAdapter);
  authoritativeRecords.push(packageArtifact);
  const nativeCli = validatePublicScripts(packageArtifact.value);
  for (const operation of Object.values(nativeCli)) {
    const artifact = await verifyTrackedCurrentFile(repoRoot, operation.entryPath, "advertised native CLI entry", repositoryAdapter);
    authoritativeRecords.push(artifact);
  }
  const workflow = await findWorkflow(repoRoot, repositoryAdapter, authoritativeRecords);
  if (selectedManifestPath !== workflow.manifestSelector) fail("MANIFEST_AUTHORITY_MISMATCH", "caller Manifest is not workflow-selected");
  let comparatorArtifact = null;
  if (workflow.comparator.kind === "external-release-bound") {
    comparatorArtifact = await verifyTrackedCurrentFile(repoRoot, workflow.comparator.entryPath, "semantic comparator entry", repositoryAdapter);
    authoritativeRecords.push(comparatorArtifact);
  }
  const manifestArtifact = await readCurrentJson(repoRoot, workflow.manifestSelector, "Promotion Manifest", repositoryAdapter);
  authoritativeRecords.push(manifestArtifact);
  const head = await repositoryAdapter.head();
  for (const commit of [manifestArtifact.value.sourceCommit, manifestArtifact.value.checkerRelease?.releaseCommit]) {
    if (!COMMIT_RE.test(commit ?? "") || !await repositoryAdapter.commitExists(commit) || !await repositoryAdapter.isAncestor(commit, head)) fail("SOURCE_COMMIT_INVALID", "source or checker release commit is missing or not ancestral to HEAD");
  }
  const checkerCli = workflow.comparator.kind === "external-release-bound" ? { ...nativeCli, compareReceipts: { entryPath: workflow.comparator.entryPath } } : nativeCli;
  const checker = await resolveCheckerRelease(repoRoot, manifestArtifact, checkerCli, repositoryAdapter, head, authoritativeRecords);
  const manifestSchema = schemaForValue(checker.schemaArtifacts, manifestArtifact.value, "Promotion Manifest");
  validateJsonSchema(manifestArtifact.value, manifestSchema.value, "Promotion Manifest");
  const canonicalReceiptArtifact = await readCurrentJson(repoRoot, workflow.receiptSelector, "canonical Promotion Receipt", repositoryAdapter);
  const receiptSchema = schemaForValue(checker.schemaArtifacts, canonicalReceiptArtifact.value, "canonical Promotion Receipt");
  if (receiptSchema.relative !== uniqueReceiptSchema(checker.schemaArtifacts).relative) fail("CHECKER_SCHEMA_UNRESOLVED", "selected Receipt schema is not the unique closed Shadow schema");
  validateJsonSchema(canonicalReceiptArtifact.value, receiptSchema.value, "canonical Promotion Receipt");
  const manifestBindingProjection = exactManifestReceiptBindings(manifestArtifact, canonicalReceiptArtifact, checker);
  const executionCommit = manifestBindingProjection.executionCommit;
  if (!await repositoryAdapter.commitExists(executionCommit) || !await repositoryAdapter.isAncestor(executionCommit, head)) {
    fail("EXECUTION_COMMIT_INVALID", "canonical Receipt execution commit is missing or not ancestral to HEAD");
  }
  const canonicalReceiptIdentity = {
    path: canonicalReceiptArtifact.relative,
    rawSha256: canonicalReceiptArtifact.sha256,
    rawReceiptDigest: canonicalReceiptArtifact.value.rawReceiptDigest,
    semanticReceiptDigest: canonicalReceiptArtifact.value.semanticReceiptDigest,
    gitBlob: canonicalReceiptArtifact.gitObjectId,
    gitMode: canonicalReceiptArtifact.gitMode,
    executionCommit,
  };
  return {
    repoRoot,
    manifestSelector: workflow.manifestSelector,
    receiptSelector: workflow.receiptSelector,
    canonicalReceiptArtifact,
    canonicalReceiptIdentity,
    manifestBindingProjection,
    receiptSchema: receiptSchema.value,
    authority: {
      repositoryHead: head,
      manifestPath: manifestArtifact.relative,
      manifestSha256: manifestArtifact.sha256,
      manifestGitBlob: manifestArtifact.gitObjectId,
      manifestGitMode: manifestArtifact.gitMode,
      ledgerPath: checker.ledger.relative,
      ledgerRawSha256: checker.ledger.sha256,
      ledgerGitBlob: checker.ledger.gitObjectId,
      ledgerGitMode: checker.ledger.gitMode,
      checkerReleaseCommit: checker.descriptor.releaseCommit,
      checkerReleaseEntryDigest: fingerprint(checker.entry),
      checkerBundleDigest: checker.bundleDigest,
      schemaPath: receiptSchema.relative,
      schemaRawSha256: receiptSchema.sha256,
      schemaGitBlob: receiptSchema.gitObjectId,
      schemaGitMode: receiptSchema.gitMode,
      releaseCommitAncestorOfHead: true,
      comparatorKind: workflow.comparator.kind,
      comparatorWorkflowSha256: workflow.sha256,
      comparatorWorkflowGitBlob: workflow.gitObjectId,
      comparatorWorkflowGitMode: workflow.gitMode,
      comparatorProgramSha256: workflow.comparator.programSha256,
      comparatorEntrySha256: comparatorArtifact?.sha256 ?? null,
      canonicalReceiptRawSha256: canonicalReceiptIdentity.rawSha256,
      canonicalReceiptRawDigest: canonicalReceiptIdentity.rawReceiptDigest,
      canonicalReceiptGitBlob: canonicalReceiptIdentity.gitBlob,
      canonicalReceiptGitMode: canonicalReceiptIdentity.gitMode,
      executionCommit,
      manifestBindingDigest: fingerprint(manifestBindingProjection),
    },
  };
}

async function verifyDeclaredFile(repoRoot, reference, pathKey, digestKey, label, repositoryAdapter, authoritativeRecords, parseJson = false) {
  if (!isPlainObject(reference) || typeof reference[pathKey] !== "string" || !SHA256_RE.test(reference[digestKey] ?? "")) fail("DECLARED_FILE_BINDING_INVALID", `${label} binding is malformed`);
  const artifact = parseJson ? await readCurrentJson(repoRoot, reference[pathKey], label, repositoryAdapter) : await verifyTrackedCurrentFile(repoRoot, reference[pathKey], label, repositoryAdapter);
  if (artifact.sha256 !== reference[digestKey]) fail("DECLARED_FILE_DIGEST_MISMATCH", `${label} bytes differ from declared digest`);
  authoritativeRecords.push(artifact);
  return artifact;
}

async function verifyManifestInputs(repoRoot, manifest, checker, repositoryAdapter, authoritativeRecords) {
  const candidateRecords = [];
  const evidenceRecords = [];
  const additionalInputRecords = [];
  if (manifest.candidatePackage) candidateRecords.push(await verifyDeclaredFile(repoRoot, manifest.candidatePackage, "path", "rawSha256", "candidate package", repositoryAdapter, authoritativeRecords));
  if (!Array.isArray(manifest.candidateArtifacts) || manifest.candidateArtifacts.length === 0) fail("CANDIDATE_BINDING_INCOMPLETE", "Manifest candidate artifact set is empty");
  for (const entry of manifest.candidateArtifacts) candidateRecords.push(await verifyDeclaredFile(repoRoot, entry, "path", "rawFileSha256", "candidate artifact", repositoryAdapter, authoritativeRecords));
  const evidenceIndex = await verifyDeclaredFile(repoRoot, manifest.evidenceIndex, "path", "rawSha256", "evidence index", repositoryAdapter, authoritativeRecords, true);
  const evidenceBindings = Array.isArray(manifest.evidenceBindings) ? manifest.evidenceBindings : [];
  if (evidenceBindings.length === 0) fail("EVIDENCE_BINDING_INCOMPLETE", "Manifest evidence binding set is empty");
  const roles = new Set();
  for (const binding of evidenceBindings) {
    const artifact = await verifyDeclaredFile(repoRoot, binding, "evidencePath", "rawSha256", "owner evidence", repositoryAdapter, authoritativeRecords, true);
    if (roles.has(binding.role)) fail("EVIDENCE_ROLE_AMBIGUOUS", "Manifest repeats an evidence role");
    roles.add(binding.role);
    const schema = schemaForValue(checker.schemaArtifacts, artifact.value, "owner evidence");
    validateJsonSchema(artifact.value, schema.value, "owner evidence");
    if (artifact.value.role !== binding.role || artifact.value.result !== binding.expectedResult || artifact.value.candidateDigest !== manifest.candidateDigest || artifact.value.sourceCommit !== manifest.sourceCommit || artifact.value.targetBaselineCommit !== manifest.targetBaselineCommit || artifact.value.checkerVersion !== manifest.checkerVersion) fail("EVIDENCE_BINDING_MISMATCH", "owner evidence does not bind the current Manifest");
    evidenceRecords.push(artifact);
  }
  if (manifest.legacyResolution) additionalInputRecords.push(await verifyDeclaredFile(repoRoot, manifest.legacyResolution, "registryPath", "rawSha256", "legacy registry", repositoryAdapter, authoritativeRecords, true));
  if (manifest.liveReachability?.compatibilityManifestPath) {
    additionalInputRecords.push(await verifyDeclaredFile(repoRoot, { path: manifest.liveReachability.compatibilityManifestPath, rawSha256: manifest.liveReachability.compatibilityManifestRawSha256 }, "path", "rawSha256", "compatibility Manifest", repositoryAdapter, authoritativeRecords, true));
  }
  const protectedProjection = { targetBaselineCommit: manifest.targetBaselineCommit, expectedRuntimePolicy: manifest.liveReachability?.expectedRuntimePolicy ?? null, legacyResolution: manifest.legacyResolution ?? null };
  const candidateProjection = candidateRecords.map((artifact) => ({ ref: redactedRef(artifact.relative), rawSha256: artifact.sha256 }));
  return {
    evidenceIndex,
    candidateRecords,
    evidenceRecords,
    registeredDigests: {
      candidate: fingerprint(candidateProjection),
      protected: fingerprint(protectedProjection),
      checker: fingerprint(checker.bundleBindings),
    },
    registeredSources: {
      candidate: candidateRecords.map((artifact) => ({ relative: artifact.relative })),
      protected: protectedProjection,
      checker: checker.bundleBindings.map(({ path: pathValue }) => ({ relative: pathValue })),
    },
    executionProtectedRecords: [evidenceIndex, ...candidateRecords, ...evidenceRecords, ...additionalInputRecords, checker.ledger, ...checker.bundleArtifacts],
  };
}

function manifestBindingSource(manifestArtifact, receiptOrExecutionCommit) {
  const manifest = manifestArtifact.value;
  const executionCommit = typeof receiptOrExecutionCommit === "string"
    ? receiptOrExecutionCommit
    : receiptOrExecutionCommit?.worktreeProof?.executionCommit;
  return {
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerBundleDigest: manifest.checkerRelease?.bundleDigest,
      parentPackageId: manifest.parentPackage?.id,
      parentPackageStatus: manifest.parentPackage?.status,
      liveAllowed: manifest.authorizations?.liveAllowed,
    },
    checkerReleaseCommit: manifest.checkerRelease?.releaseCommit,
    executionCommit,
    directParentManifestSha256: manifestArtifact.sha256,
  };
}

function candidateBindingProjection(manifest) {
  if (!isPlainObject(manifest) || !SHA256_RE.test(manifest.candidateDigest ?? "") || !Array.isArray(manifest.candidateArtifacts) || manifest.candidateArtifacts.length === 0) {
    fail("CANDIDATE_BINDING_INCOMPLETE", "Manifest candidate binding is incomplete");
  }
  return {
    candidateDigest: manifest.candidateDigest,
    candidatePackage: manifest.candidatePackage ?? null,
    candidateArtifacts: manifest.candidateArtifacts,
  };
}

function candidateBindingChanged(baseManifest, activeManifest) {
  return stableJson(candidateBindingProjection(baseManifest)) !== stableJson(candidateBindingProjection(activeManifest));
}

function exactManifestReceiptBindings(manifestArtifact, receiptArtifact, checker) {
  const receipt = receiptArtifact.value;
  if (receipt.result !== "pass" || receipt.manifest?.path !== manifestArtifact.relative || receipt.manifest?.rawSha256 !== manifestArtifact.sha256 || receipt.binding?.liveAllowed !== false || receipt.lifecycle?.liveAllowed !== false || receipt.checkerReleaseProof?.version !== checker.descriptor.version || receipt.checkerReleaseProof?.releaseCommit !== checker.descriptor.releaseCommit || receipt.checkerReleaseProof?.bundleDigest !== checker.bundleDigest || receipt.checkerReleaseProof?.bundlePathsDigest !== checker.bundlePathsDigest || receipt.checkerReleaseProof?.ledgerRawSha256 !== checker.ledger.sha256) fail("BINDING_MISMATCH", "Manifest, Receipt, and checker release proof disagree");
  const manifestProjection = canonicalBindingProjection(manifestBindingSource(manifestArtifact, receipt));
  const receiptProjection = canonicalBindingProjection(receipt);
  if (stableJson(manifestProjection) !== stableJson(receiptProjection)) fail("BINDING_MISMATCH", "Manifest and Receipt canonical binding projections differ");
  return manifestProjection;
}

async function findSchemaOutsideBundle(repoRoot, schemaVersion, repositoryAdapter, authoritativeRecords) {
  const paths = (await repositoryAdapter.listTrackedPaths("coordination/integration")).filter((pathValue) => pathValue.endsWith(`/${schemaVersion}.schema.json`) || pathValue.endsWith(`${schemaVersion}.schema.json`));
  if (paths.length !== 1) fail("ARTIFACT_SCHEMA_UNRESOLVED", `no one exact schema resolves ${schemaVersion}`);
  const schema = await readCurrentJson(repoRoot, paths[0], `${schemaVersion} schema`, repositoryAdapter);
  validateSchemaDocument(schema.value);
  authoritativeRecords.push(schema);
  return schema;
}

function assertSelfDigest(value, field, label) {
  if (!SHA256_RE.test(value?.[field] ?? "")) fail("SELF_DIGEST_INVALID", `${label} self digest is malformed`);
  const payload = structuredClone(value);
  delete payload[field];
  if (fingerprint(payload) !== value[field]) fail("SELF_DIGEST_INVALID", `${label} self digest does not recompute`);
}

async function validateClosureEvidence(closure, artifacts, baseManifestArtifact, baseReceiptArtifact, repositoryAdapter, head) {
  const required = ["manifest", "receipt", "a11Replay", "a22Isolation", "prCheck", "requiredChecks", "mainPostMerge", "a25Closeout"];
  if (required.some((name) => !artifacts[name])) fail("EXTERNAL_CLOSURE_EVIDENCE_INCOMPLETE", "Closure lacks A11/A22/GitHub/A25 evidence");
  const manifest = baseManifestArtifact.value;
  const receipt = baseReceiptArtifact.value;
  const expected = { candidateDigest: manifest.candidateDigest, sourceCommit: manifest.sourceCommit, targetBaselineCommit: manifest.targetBaselineCommit, checkerVersion: manifest.checkerVersion, checkerBundleDigest: manifest.checkerRelease.bundleDigest };
  const binding = closure.binding;
  for (const [key, value] of Object.entries(expected)) if (binding?.[key] !== value) fail("CLOSURE_BINDING_MISMATCH", `Closure binding ${key} differs`);
  if (binding.executionCommit !== receipt.worktreeProof?.executionCommit) fail("CLOSURE_BINDING_MISMATCH", "Closure execution commit differs from Receipt");
  if (closure.stateTransition?.toState !== "shadow_passed" || closure.stateTransition?.pilotUnitStatus !== "shadow_passed" || closure.stateTransition?.liveAllowed !== false || closure.stateTransition?.liveEvidence !== "none") fail("CLOSURE_LIVE_BOUNDARY_INVALID", "Closure does not prove only a non-live Shadow transition");
  const a11 = artifacts.a11Replay.value;
  if (
    closure.receiptDigests?.rawReceiptDigest !== receipt.rawReceiptDigest ||
    closure.receiptDigests?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    closure.receiptDigests?.independentRawReceiptDigest !== a11.independentReplay?.rawReceiptDigest
  ) fail("CLOSURE_RECEIPT_DIGEST_MISMATCH", "Closure Receipt signatures do not bind the canonical and replay Receipts");
  if (
    a11.role !== "A11" ||
    a11.result !== "pass" ||
    a11.liveAllowed !== false ||
    stableJson(a11.binding) !== stableJson(expected) ||
    a11.executionCommit !== binding.executionCommit ||
    a11.manifest?.path !== baseManifestArtifact.relative ||
    a11.manifest?.rawSha256 !== baseManifestArtifact.sha256 ||
    a11.canonicalReceipt?.path !== baseReceiptArtifact.relative ||
    a11.canonicalReceipt?.fileRawSha256 !== baseReceiptArtifact.sha256 ||
    a11.canonicalReceipt?.rawReceiptDigest !== receipt.rawReceiptDigest ||
    a11.canonicalReceipt?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a11.canonicalReceipt?.runId === a11.independentReplay?.runId ||
    a11.independentReplay?.result !== "pass" ||
    a11.independentReplay?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a11.independentReplay?.rawReceiptDigest === receipt.rawReceiptDigest ||
    a11.independentReplay?.semanticDigestMatchesCanonical !== true ||
    a11.independentReplay?.rawDigestDiffersFromCanonical !== true ||
    a11.independentReplay?.allHardGatesPass !== true ||
    a11.independentReplay?.candidateSourceByteIdentical !== true ||
    a11.independentReplay?.forbiddenChangedPathCount !== 0 ||
    a11.independentReplay?.rollbackExactPreimage !== true ||
    a11.independentReplay?.externalSideEffectCount !== 0 ||
    a11.canonicalVerification?.result !== "pass" ||
    a11.canonicalVerification?.valid !== true ||
    a11.canonicalVerification?.semanticReplayMatches !== true ||
    a11.canonicalVerification?.executionCommitMatches !== true ||
    a11.canonicalVerification?.liveAllowed !== false
  ) fail("A11_CLOSURE_EVIDENCE_INVALID", "A11 replay does not bind and independently reproduce the exact canonical Receipt");
  const a22 = artifacts.a22Isolation.value;
  if (
    a22.role !== "A22" ||
    a22.result !== "pass" ||
    a22.liveAllowed !== false ||
    a22.executionCommit !== binding.executionCommit ||
    a22.manifest?.path !== baseManifestArtifact.relative ||
    a22.manifest?.rawSha256 !== baseManifestArtifact.sha256 ||
    a22.receipt?.path !== baseReceiptArtifact.relative ||
    a22.receipt?.fileRawSha256 !== baseReceiptArtifact.sha256 ||
    a22.receipt?.rawReceiptDigest !== receipt.rawReceiptDigest ||
    a22.receipt?.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a22.cleanSourceProof?.worktreeClean !== true ||
    a22.cleanSourceProof?.exactExecutionCommit !== true ||
    a22.cleanSourceProof?.candidateSnapshotMatchesReceipt !== true ||
    a22.cleanSourceProof?.forbiddenSnapshotMatchesReceipt !== true ||
    a22.cleanSourceProof?.candidateSourceByteIdentical !== true ||
    a22.cleanSourceProof?.forbiddenChangedPathCount !== 0 ||
    a22.outputIsolationProof?.exactPreimageRestored !== true ||
    a22.preflightBuildProof?.deploymentPerformed !== false ||
    !["networkRequestCount", "providerCallCount", "databaseWriteCount", "deploymentCommandCount", "productionWriteCount", "liveRegistryWriteCount"].every((key) => a22.externalSideEffects?.[key] === 0)
  ) fail("A22_CLOSURE_EVIDENCE_INVALID", "A22 isolation does not bind the exact non-mutating closure");
  const pr = artifacts.prCheck.value;
  if (pr.role !== "A11" || pr.result !== "pass" || pr.event !== "pull_request" || pr.conclusion !== "success" || pr.liveAllowed !== false || pr.candidateDigest !== expected.candidateDigest || pr.manifestRawSha256 !== baseManifestArtifact.sha256 || pr.semanticReceiptDigest !== receipt.semanticReceiptDigest || pr.headCommit !== binding.compositionHeadCommit) fail("GITHUB_PR_EVIDENCE_INVALID", "PR check proof does not bind the exact closure");
  const requiredChecks = artifacts.requiredChecks.value;
  if (requiredChecks.role !== "A22" || requiredChecks.result !== "pass" || requiredChecks.branch !== "main" || requiredChecks.required !== true || requiredChecks.enforceAdmins !== true || typeof requiredChecks.strict !== "boolean" || !Array.isArray(requiredChecks.checks) || !requiredChecks.checks.some((entry) => entry?.context === pr.checkName)) fail("GITHUB_REQUIRED_CHECK_EVIDENCE_INVALID", "required-check proof is incomplete");
  const main = artifacts.mainPostMerge.value;
  if (main.role !== "A22" || main.result !== "pass" || main.branch !== "main" || main.event !== "push" || main.conclusion !== "success" || main.requiredCheckObserved !== true || main.workflowName !== pr.workflowName || main.checkName !== pr.checkName || main.liveAllowed !== false || main.candidateDigest !== expected.candidateDigest || main.manifestRawSha256 !== baseManifestArtifact.sha256 || main.semanticReceiptDigest !== receipt.semanticReceiptDigest || main.mergeCommit !== binding.mergeCommit) fail("GITHUB_MAIN_EVIDENCE_INVALID", "main post-merge proof does not bind the exact closure");
  const a25 = artifacts.a25Closeout.value;
  if (a25.role !== "A25" || a25.result !== "pass" || a25.liveAllowed !== false || a25.finalDisposition !== "reviewed commit" || !Array.isArray(a25.ownerPackageFinalStates) || a25.ownerPackageFinalStates.length === 0 || a25.ownerPackageFinalStates.some((entry) => entry?.finalState !== "reviewed commit") || a25.reviewedHeadCommit !== binding.compositionHeadCommit || a25.mergeCommit !== binding.mergeCommit) fail("A25_CLOSURE_EVIDENCE_INVALID", "A25 closeout does not bind the exact closure");
  if (
    !await repositoryAdapter.commitExists(binding.compositionHeadCommit) ||
    !await repositoryAdapter.commitExists(binding.mergeCommit) ||
    !await repositoryAdapter.isAncestor(binding.compositionHeadCommit, binding.mergeCommit) ||
    !await repositoryAdapter.isAncestor(binding.mergeCommit, head)
  ) fail("CLOSURE_COMMIT_GRAPH_INVALID", "Closure composition and merge commits are not ordered ancestors of current HEAD");
}

async function validateClosureAndRegistry(repoRoot, closureArtifact, registryArtifact, baseManifestArtifact, baseReceiptArtifact, repositoryAdapter, head, authoritativeRecords) {
  if (!closureArtifact && !registryArtifact) return { verified: false, lifecycleState: baseReceiptArtifact.value.lifecycle?.currentState ?? "candidate_hold", evidenceHashes: [] };
  if (!closureArtifact || !registryArtifact) fail("CLOSURE_REGISTRY_PAIR_REQUIRED", "Closure and Registry must be present as an exact pair");
  const closureSchema = await findSchemaOutsideBundle(repoRoot, closureArtifact.value.schemaVersion, repositoryAdapter, authoritativeRecords);
  const registrySchema = await findSchemaOutsideBundle(repoRoot, registryArtifact.value.schemaVersion, repositoryAdapter, authoritativeRecords);
  validateJsonSchema(closureArtifact.value, closureSchema.value, "Shadow Closure");
  validateJsonSchema(registryArtifact.value, registrySchema.value, "lifecycle Registry");
  assertSelfDigest(closureArtifact.value, "closureDigest", "Shadow Closure");
  assertSelfDigest(registryArtifact.value, "registryDigest", "lifecycle Registry");
  const closureRefs = closureArtifact.value.artifacts;
  if (!isPlainObject(closureRefs)) fail("EXTERNAL_CLOSURE_EVIDENCE_INCOMPLETE", "Closure artifact references are absent");
  const loaded = {};
  for (const [name, reference] of Object.entries(closureRefs)) loaded[name] = await verifyDeclaredFile(repoRoot, reference, "path", "rawSha256", `Closure ${name}`, repositoryAdapter, authoritativeRecords, true);
  if (loaded.manifest.relative !== baseManifestArtifact.relative || loaded.manifest.sha256 !== baseManifestArtifact.sha256) fail("CLOSURE_DIRECT_PARENT_MISMATCH", "Closure Manifest is not the exact direct parent");
  if (loaded.receipt.relative !== baseReceiptArtifact.relative || loaded.receipt.sha256 !== baseReceiptArtifact.sha256) fail("CLOSURE_DIRECT_PARENT_MISMATCH", "Closure Receipt is not the exact direct parent");
  await validateClosureEvidence(closureArtifact.value, loaded, baseManifestArtifact, baseReceiptArtifact, repositoryAdapter, head);
  const registry = registryArtifact.value;
  if (registry.pilotUnitId !== baseManifestArtifact.value.pilotUnitId || registry.attemptId !== baseManifestArtifact.value.attemptId || registry.parentPackageStatus !== "candidate-only" || registry.liveAllowed !== false || registry.liveEvidence !== "none" || registry.pilotUnitStatus !== "shadow_passed") fail("REGISTRY_LIVE_BOUNDARY_INVALID", "Registry is not an exact non-live Shadow state for the direct base attempt");
  let previous = null;
  registry.events.forEach((event, index) => {
    if (event.sequence !== index + 1 || event.previousEventDigest !== previous) fail("REGISTRY_EVENT_CHAIN_INVALID", "Registry event chain is unordered");
    assertSelfDigest(event, "eventDigest", "Registry event");
    previous = event.eventDigest;
  });
  const ready = registry.events.find((event) => event.toState === "shadow_ready");
  const passed = registry.events.find((event) => event.toState === "shadow_passed");
  if (ready?.evidence?.manifest?.path !== baseManifestArtifact.relative || ready?.evidence?.manifest?.rawSha256 !== baseManifestArtifact.sha256 || passed?.evidence?.closure?.path !== closureArtifact.relative || passed?.evidence?.closure?.digest !== closureArtifact.value.closureDigest) fail("REGISTRY_DIRECT_PARENT_MISMATCH", "Registry does not chain the exact Manifest and Closure");
  return { verified: true, lifecycleState: "shadow_passed", evidenceHashes: [closureArtifact.sha256, registryArtifact.sha256, ...Object.values(loaded).map((artifact) => artifact.sha256)] };
}

async function loadDirectBaseArtifacts(repoRoot, rootRelative, repositoryAdapter, authoritativeRecords) {
  const paths = await repositoryAdapter.listTrackedPaths(rootRelative);
  const direct = paths.filter((pathValue) => dirname(pathValue) === rootRelative);
  const closurePaths = direct.filter((pathValue) => /(?:^|\/)shadow-closure[^/]*\.json$/u.test(pathValue));
  const registryPaths = direct.filter((pathValue) => /(?:^|\/)lifecycle-registry[^/]*\.json$/u.test(pathValue));
  if (closurePaths.length > 1 || registryPaths.length > 1) fail("AMBIGUOUS_BASE_ARTIFACT", "base Closure or Registry is ambiguous");
  const closure = closurePaths.length === 1 ? await readCurrentJson(repoRoot, closurePaths[0], "Shadow Closure", repositoryAdapter) : null;
  const registry = registryPaths.length === 1 ? await readCurrentJson(repoRoot, registryPaths[0], "lifecycle Registry", repositoryAdapter) : null;
  if (closure) authoritativeRecords.push(closure);
  if (registry) authoritativeRecords.push(registry);
  return { closure, registry };
}

async function loadInferredNearestBase(repoRoot, attemptRoot, activeRoot, repositoryAdapter, authoritativeRecords) {
  const directPair = async (rootRelative, label) => {
    const paths = await repositoryAdapter.listTrackedPaths(rootRelative);
    const direct = paths.filter((pathValue) => dirname(pathValue) === rootRelative);
    const manifests = direct.filter((pathValue) => /(?:^|\/)promotion-manifest[^/]*\.json$/u.test(pathValue));
    const receipts = direct.filter((pathValue) => /(?:^|\/)shadow-receipt[^/]*\.json$/u.test(pathValue));
    if (manifests.length > 1 || receipts.length > 1) fail("INFERRED_DIRECT_PARENT_AMBIGUOUS", `${label} has an ambiguous Manifest/Receipt pair`);
    if (manifests.length !== 1 || receipts.length !== 1) return null;
    const [manifest, receipt] = await Promise.all([
      readCurrentJson(repoRoot, manifests[0], `${label} Manifest`, repositoryAdapter),
      readCurrentJson(repoRoot, receipts[0], `${label} Receipt`, repositoryAdapter),
    ]);
    authoritativeRecords.push(manifest, receipt);
    return { manifest, receipt };
  };
  let cursor = dirname(activeRoot);
  let nearest = null;
  while (cursor === attemptRoot || cursor.startsWith(`${attemptRoot}/`)) {
    nearest = await directPair(cursor, "inferred nearest direct-parent");
    if (nearest) break;
    if (cursor === attemptRoot) break;
    cursor = dirname(cursor);
  }
  if (!nearest) fail("INFERRED_DIRECT_PARENT_AMBIGUOUS", "nested reaffirmation has no mechanically resolvable nearest parent Manifest and Receipt");
  const original = cursor === attemptRoot ? nearest : await directPair(attemptRoot, "original attempt");
  if (!original) fail("INFERRED_DIRECT_PARENT_AMBIGUOUS", "nested reaffirmation has no original attempt Manifest and Receipt");
  const directArtifacts = await loadDirectBaseArtifacts(repoRoot, attemptRoot, repositoryAdapter, authoritativeRecords);
  return {
    nearestManifest: nearest.manifest,
    nearestReceipt: nearest.receipt,
    baseManifest: original.manifest,
    baseReceipt: original.receipt,
    ...directArtifacts,
  };
}

function assertFileReference(reference, label) {
  assertExactKeys(reference, ["path", "rawSha256"], label);
  assertSafeRepoRelativePath(reference.path, label);
  if (!SHA256_RE.test(reference.rawSha256 ?? "")) fail("REAFFIRMATION_INVALID", `${label} digest is malformed`);
}

async function protectedRecordsMatchExecution(repositoryAdapter, executionCommit, records) {
  for (const record of records) {
    if (!record || typeof record.relative !== "string" || !Buffer.isBuffer(record.bytes)) return false;
    const committed = await repositoryAdapter.blob(executionCommit, record.relative);
    if (!Buffer.isBuffer(committed) || !committed.equals(record.bytes)) return false;
  }
  return true;
}

export async function classifyRegisteredExecutionCurrentness({ relationBlocked, gitClean, repositoryAdapter, executionCommit, protectedRecords }) {
  if (relationBlocked || gitClean !== true || !COMMIT_RE.test(executionCommit ?? "")) return "stale";
  return await protectedRecordsMatchExecution(repositoryAdapter, executionCommit, protectedRecords) ? "current" : "stale";
}

export async function validateReaffirmationCommitProtocol({
  repositoryAdapter,
  storageHead,
  evidenceCommit,
  executionCommit,
  manifestArtifact,
  descriptorArtifact,
  receiptArtifact,
  protectedRecords = [],
}) {
  if (![storageHead, evidenceCommit, executionCommit].every((value) => COMMIT_RE.test(value ?? "")) || evidenceCommit === executionCommit || executionCommit === storageHead) fail("REAFFIRMATION_ORDER_INVALID", "reaffirmation commits must be three ordered immutable phases");
  if (!await repositoryAdapter.commitExists(evidenceCommit) || !await repositoryAdapter.commitExists(executionCommit) || !await repositoryAdapter.commitExists(storageHead) || !await repositoryAdapter.isAncestor(evidenceCommit, executionCommit) || !await repositoryAdapter.isAncestor(executionCommit, storageHead)) fail("REAFFIRMATION_ORDER_INVALID", "evidence must precede execution and independent finalization");
  for (const [artifact, label] of [[manifestArtifact, "Manifest"], [descriptorArtifact, "descriptor"]]) {
    if (!artifact || typeof artifact.relative !== "string" || !Buffer.isBuffer(artifact.bytes)) fail("REAFFIRMATION_ORDER_INVALID", `reaffirmation ${label} artifact is malformed`);
    const committed = await repositoryAdapter.blob(executionCommit, artifact.relative);
    if (!Buffer.isBuffer(committed) || !committed.equals(artifact.bytes)) fail("REAFFIRMATION_ORDER_INVALID", `execution commit does not bind the revision ${label}`);
  }
  if (!receiptArtifact || typeof receiptArtifact.relative !== "string" || !Buffer.isBuffer(receiptArtifact.bytes)) fail("REAFFIRMATION_ORDER_INVALID", "revision Receipt artifact is malformed");
  if (Buffer.isBuffer(await repositoryAdapter.blob(executionCommit, receiptArtifact.relative))) fail("REAFFIRMATION_RECEIPT_PREBOUND", "future revision Receipt must not be pre-bound by the execution commit");
  if (!await protectedRecordsMatchExecution(repositoryAdapter, executionCommit, protectedRecords)) fail("REAFFIRMATION_PROTECTED_BINDING_MUTATION", "protected execution bindings differ from the immutable execution snapshot");
  return { evidenceCommit, executionCommit, storageCommit: storageHead, finalizationCommit: storageHead };
}

export async function validateReaffirmationExecutionPreparation({
  repositoryAdapter,
  evidenceCommit,
  executionCommit,
  manifestArtifact,
  descriptorArtifact,
  receiptPath,
  protectedRecords = [],
}) {
  if (![evidenceCommit, executionCommit].every((value) => COMMIT_RE.test(value ?? "")) || evidenceCommit === executionCommit) fail("REAFFIRMATION_ORDER_INVALID", "reaffirmation evidence and execution commits must be distinct ordered phases");
  if (!await repositoryAdapter.commitExists(evidenceCommit) || !await repositoryAdapter.commitExists(executionCommit) || !await repositoryAdapter.isAncestor(evidenceCommit, executionCommit)) fail("REAFFIRMATION_ORDER_INVALID", "reaffirmation evidence must precede registered execution");
  for (const [artifact, label] of [[manifestArtifact, "Manifest"], [descriptorArtifact, "descriptor"]]) {
    if (!artifact || typeof artifact.relative !== "string" || !Buffer.isBuffer(artifact.bytes)) fail("REAFFIRMATION_ORDER_INVALID", `reaffirmation ${label} artifact is malformed`);
    const committed = await repositoryAdapter.blob(executionCommit, artifact.relative);
    if (!Buffer.isBuffer(committed) || !committed.equals(artifact.bytes)) fail("REAFFIRMATION_ORDER_INVALID", `execution commit does not bind the revision ${label}`);
  }
  assertSafeRepoRelativePath(receiptPath, "future revision Receipt path");
  if (Buffer.isBuffer(await repositoryAdapter.blob(executionCommit, receiptPath))) fail("REAFFIRMATION_RECEIPT_PREBOUND", "future revision Receipt must be absent from the execution commit");
  if (!await protectedRecordsMatchExecution(repositoryAdapter, executionCommit, protectedRecords)) fail("REAFFIRMATION_PROTECTED_BINDING_MUTATION", "protected execution bindings differ from the immutable execution snapshot");
  return { evidenceCommit, executionCommit, storageCommit: null, finalizationCommit: null };
}

async function resolveAttemptRelation(repoRoot, workflow, activeManifest, activeReceipt, checker, inputs, repositoryAdapter, head, authoritativeRecords, options = {}) {
  if (!workflow.reaffirmationSelector) {
    if (activeManifest.relative.includes("/reaffirmations/")) {
      const [attemptRoot, revisionSuffix] = activeManifest.relative.split("/reaffirmations/");
      const revisionRoot = dirname(activeManifest.relative);
      if (!attemptRoot || !revisionSuffix || !revisionRoot.startsWith(`${attemptRoot}/reaffirmations/`)) fail("INFERRED_DIRECT_PARENT_AMBIGUOUS", "nested reaffirmation path is outside its attempt hierarchy");
      const inferred = await loadInferredNearestBase(repoRoot, attemptRoot, revisionRoot, repositoryAdapter, authoritativeRecords);
      const base = inferred.nearestManifest.value;
      const active = activeManifest.value;
      const checkerChanged = base.checkerVersion !== active.checkerVersion || base.checkerRelease?.bundleDigest !== active.checkerRelease?.bundleDigest || base.checkerRelease?.releaseCommit !== active.checkerRelease?.releaseCommit;
      const candidateChanged = candidateBindingChanged(base, active);
      return {
        attemptRelation: {
          relation: "unresolved-reaffirmation", baseAttemptRef: redactedRef(`${base.attemptId}:base`), revisionRef: redactedRef(revisionRoot), baseCount: 1,
          candidateChanged, sourceChanged: base.sourceCommit !== active.sourceCommit,
          checkerChanged, baselineChanged: base.targetBaselineCommit !== active.targetBaselineCommit, reviewedBaselineOnly: false,
          directParentManifestSha256: inferred.nearestManifest.sha256, directParentReceiptSha256: inferred.nearestReceipt.sha256,
          evidenceCommit: null, bindingCommit: null, executionCommit: null, storageCommit: null, finalizationCommit: null, historicalClosureOverwritten: false,
        },
        ...inferred,
        reaffirmation: null,
        closureScope: "historical-direct-base",
        nativeExecutionBlockers: ["EXPLICIT_REAFFIRMATION_DESCRIPTOR_REQUIRED"],
      };
    }
    const direct = await loadDirectBaseArtifacts(repoRoot, dirname(activeManifest.relative), repositoryAdapter, authoritativeRecords);
    const verifiedStorageCommit = activeReceipt && COMMIT_RE.test(options.storageCommit ?? "") ? options.storageCommit : null;
    return {
      attemptRelation: {
        relation: "base-attempt", baseAttemptRef: redactedRef(`${activeManifest.value.attemptId}:base`), revisionRef: null,
        baseCount: 1, candidateChanged: false, sourceChanged: false, checkerChanged: false, baselineChanged: false,
        reviewedBaselineOnly: false, directParentManifestSha256: activeManifest.sha256, directParentReceiptSha256: null,
        evidenceCommit: null, bindingCommit: activeReceipt ? activeReceipt.value.worktreeProof?.executionCommit ?? null : null,
        executionCommit: activeReceipt ? activeReceipt.value.worktreeProof?.executionCommit ?? null : head,
        storageCommit: verifiedStorageCommit, finalizationCommit: verifiedStorageCommit, historicalClosureOverwritten: false,
      },
      baseManifest: activeManifest, baseReceipt: activeReceipt, ...direct, reaffirmation: null,
      closureScope: "active-attempt", nativeExecutionBlockers: [],
    };
  }
  const descriptor = await readCurrentJson(repoRoot, workflow.reaffirmationSelector, "reaffirmation descriptor", repositoryAdapter);
  authoritativeRecords.push(descriptor);
  assertExactKeys(descriptor.value, ["schemaVersion", "relation", "bases", "revision", "unchangedBindings", "baselineDelta", "ordering"], "reaffirmation descriptor");
  if (descriptor.value.schemaVersion !== "promotion-reaffirmation.v1" || descriptor.value.relation !== "append-only-reaffirmation") fail("REAFFIRMATION_INVALID", "unsupported reaffirmation descriptor");
  if (!Array.isArray(descriptor.value.bases) || descriptor.value.bases.length !== 1) fail("REAFFIRMATION_BASE_AMBIGUOUS", "reaffirmation must name exactly one base");
  const base = descriptor.value.bases[0];
  assertExactKeys(base, ["manifest", "receipt", "closure", "registry"], "reaffirmation base");
  [base.manifest, base.receipt, base.closure, base.registry].forEach((reference, index) => assertFileReference(reference, `reaffirmation base reference ${index}`));
  assertExactKeys(descriptor.value.revision, ["manifest"], "reaffirmation revision");
  assertFileReference(descriptor.value.revision.manifest, "revision Manifest");
  if (descriptor.value.revision.manifest.path !== activeManifest.relative || descriptor.value.revision.manifest.rawSha256 !== activeManifest.sha256) fail("REAFFIRMATION_DIRECT_PARENT_MISMATCH", "reaffirmation does not bind the selected revision Manifest bytes");
  const baseManifest = await verifyDeclaredFile(repoRoot, base.manifest, "path", "rawSha256", "base Manifest", repositoryAdapter, authoritativeRecords, true);
  const baseReceipt = await verifyDeclaredFile(repoRoot, base.receipt, "path", "rawSha256", "base Receipt", repositoryAdapter, authoritativeRecords, true);
  const closure = await verifyDeclaredFile(repoRoot, base.closure, "path", "rawSha256", "base Closure", repositoryAdapter, authoritativeRecords, true);
  const registry = await verifyDeclaredFile(repoRoot, base.registry, "path", "rawSha256", "base Registry", repositoryAdapter, authoritativeRecords, true);
  const unchanged = descriptor.value.unchangedBindings;
  assertExactKeys(unchanged, ["candidateDigest", "sourceCommit", "checkerVersion", "checkerBundleDigest", "checkerReleaseCommit"], "reaffirmation unchanged bindings");
  const expectedUnchanged = { candidateDigest: activeManifest.value.candidateDigest, sourceCommit: activeManifest.value.sourceCommit, checkerVersion: activeManifest.value.checkerVersion, checkerBundleDigest: activeManifest.value.checkerRelease.bundleDigest, checkerReleaseCommit: activeManifest.value.checkerRelease.releaseCommit };
  if (stableJson(unchanged) !== stableJson(expectedUnchanged)) fail("REAFFIRMATION_BINDING_MUTATION", "reaffirmation unchanged bindings are false");
  if (candidateBindingChanged(baseManifest.value, activeManifest.value) || baseManifest.value.sourceCommit !== unchanged.sourceCommit || baseManifest.value.checkerVersion !== unchanged.checkerVersion || baseManifest.value.checkerRelease?.bundleDigest !== unchanged.checkerBundleDigest || baseManifest.value.checkerRelease?.releaseCommit !== unchanged.checkerReleaseCommit) fail("REAFFIRMATION_REQUIRES_NEW_ATTEMPT", "candidate bytes/semantics, source, or checker changed across reaffirmation");
  const delta = descriptor.value.baselineDelta;
  assertExactKeys(delta, ["fromCommit", "toCommit", "unrelatedToCandidate", "candidatePathsChanged", "checkerPathsChanged", "changedPathsDigest", "reviewEvidence"], "baseline delta");
  if (delta.fromCommit !== baseManifest.value.targetBaselineCommit || delta.toCommit !== activeManifest.value.targetBaselineCommit || delta.fromCommit === delta.toCommit || delta.unrelatedToCandidate !== true || delta.candidatePathsChanged !== false || delta.checkerPathsChanged !== false || !SHA256_RE.test(delta.changedPathsDigest ?? "") || !Array.isArray(delta.reviewEvidence)) fail("REAFFIRMATION_BASELINE_DELTA_INVALID", "reaffirmation is not an explicit reviewed baseline-only delta");
  const ordering = descriptor.value.ordering;
  assertExactKeys(ordering, ["evidenceCommit"], "reaffirmation ordering");
  const executionCommit = activeReceipt?.value?.worktreeProof?.executionCommit ?? options.executionCommit;
  if (!COMMIT_RE.test(ordering.evidenceCommit ?? "") || !COMMIT_RE.test(executionCommit ?? "")) fail("REAFFIRMATION_ORDER_INVALID", "reaffirmation evidence or execution commit is malformed");
  const changedPaths = await repositoryAdapter.changedPaths(delta.fromCommit, delta.toCommit);
  if (fingerprint(changedPaths) !== delta.changedPathsDigest) fail("REAFFIRMATION_DELTA_DIGEST_MISMATCH", "baseline changed-path digest does not recompute");
  const candidatePaths = new Set([activeManifest.value.candidatePackage?.path, ...activeManifest.value.candidateArtifacts.map((entry) => entry.path)].filter(Boolean));
  const checkerPaths = new Set(checker.entry.bundlePaths);
  if (changedPaths.some((pathValue) => candidatePaths.has(pathValue) || checkerPaths.has(pathValue))) fail("REAFFIRMATION_REQUIRES_NEW_ATTEMPT", "candidate or checker path changed across reaffirmation");
  const requiredRoles = new Set(["A11", "A22", "A25"]);
  const observedRoles = new Set();
  const reviewArtifacts = [];
  if (delta.reviewEvidence.length !== requiredRoles.size) fail("REAFFIRMATION_REVIEW_INCOMPLETE", "reaffirmation requires exactly one A11, A22, and A25 review");
  for (const reference of delta.reviewEvidence) {
    assertExactKeys(reference, ["role", "path", "rawSha256"], "reaffirmation review evidence");
    if (!requiredRoles.has(reference.role) || observedRoles.has(reference.role)) fail("REAFFIRMATION_REVIEW_INCOMPLETE", "unexpected or duplicate baseline review role");
    const artifact = await verifyDeclaredFile(repoRoot, reference, "path", "rawSha256", "baseline review evidence", repositoryAdapter, authoritativeRecords, true);
    reviewArtifacts.push(artifact);
    const committedBytes = await repositoryAdapter.blob(ordering.evidenceCommit, reference.path);
    const evidence = artifact.value;
    if (
      !Buffer.isBuffer(committedBytes) ||
      !committedBytes.equals(artifact.bytes) ||
      evidence.role !== reference.role ||
      evidence.result !== "pass" ||
      evidence.liveAllowed !== false ||
      evidence.fromCommit !== delta.fromCommit ||
      evidence.toCommit !== delta.toCommit ||
      evidence.changedPathsDigest !== delta.changedPathsDigest ||
      evidence.unrelatedToCandidate !== true ||
      evidence.candidatePathsChanged !== false ||
      evidence.checkerPathsChanged !== false ||
      evidence.candidateDigest !== unchanged.candidateDigest ||
      evidence.sourceCommit !== unchanged.sourceCommit ||
      evidence.checkerVersion !== unchanged.checkerVersion ||
      evidence.checkerBundleDigest !== unchanged.checkerBundleDigest ||
      evidence.checkerReleaseCommit !== unchanged.checkerReleaseCommit
    ) fail("REAFFIRMATION_REVIEW_INCOMPLETE", "review evidence is not immutable or does not bind the reviewed baseline-only delta");
    observedRoles.add(reference.role);
  }
  if (stableJson([...observedRoles].sort()) !== stableJson([...requiredRoles].sort())) fail("REAFFIRMATION_REVIEW_INCOMPLETE", "A11/A22/A25 baseline review evidence is incomplete");
  const storageIdentityBound = COMMIT_RE.test(options.storageCommit ?? "");
  const protocol = options.phase === "execution"
    ? await validateReaffirmationExecutionPreparation({
      repositoryAdapter,
      evidenceCommit: ordering.evidenceCommit,
      executionCommit,
      manifestArtifact: activeManifest,
      descriptorArtifact: descriptor,
      receiptPath: workflow.receiptSelector,
      protectedRecords: [...inputs.executionProtectedRecords, ...reviewArtifacts],
    })
    : await validateReaffirmationCommitProtocol({
      repositoryAdapter,
      storageHead: options.storageCommit ?? head,
      evidenceCommit: ordering.evidenceCommit,
      executionCommit,
      manifestArtifact: activeManifest,
      descriptorArtifact: descriptor,
      receiptArtifact: activeReceipt,
      protectedRecords: [...inputs.executionProtectedRecords, ...reviewArtifacts],
    });
  if (!storageIdentityBound && options.phase !== "execution") {
    protocol.storageCommit = null;
    protocol.finalizationCommit = null;
  }
  const revisionRoot = dirname(activeManifest.relative);
  const revisionPaths = (await repositoryAdapter.listTrackedPaths(revisionRoot)).filter((pathValue) => dirname(pathValue) === revisionRoot);
  if (revisionPaths.some((pathValue) => /(?:shadow-closure|lifecycle-registry)[^/]*\.json$/u.test(pathValue))) fail("HISTORICAL_CLOSURE_OVERWRITE", "revision may not introduce Closure or Registry facts");
  return {
    attemptRelation: {
      relation: "append-only-reaffirmation", baseAttemptRef: redactedRef(`${baseManifest.value.attemptId}:base`), revisionRef: redactedRef(descriptor.relative), baseCount: 1,
      candidateChanged: false, sourceChanged: false, checkerChanged: false, baselineChanged: true, reviewedBaselineOnly: true,
      directParentManifestSha256: baseManifest.sha256, directParentReceiptSha256: baseReceipt.sha256,
      evidenceCommit: protocol.evidenceCommit, bindingCommit: protocol.executionCommit, executionCommit: protocol.executionCommit, storageCommit: protocol.storageCommit, finalizationCommit: protocol.finalizationCommit, historicalClosureOverwritten: false,
    },
    baseManifest, baseReceipt, closure, registry, reaffirmation: descriptor,
    closureScope: "historical-direct-base", nativeExecutionBlockers: [],
  };
}

function artifactSummary(artifact) {
  return artifact ? { ref: redactedRef(artifact.relative), sha256: artifact.sha256 } : null;
}

async function repositoryState(repositoryAdapter, baselineCommit) {
  const [head, branch, status] = await Promise.all([repositoryAdapter.head(), repositoryAdapter.branch(), repositoryAdapter.status()]);
  if (!COMMIT_RE.test(head ?? "")) fail("HEAD_UNRESOLVED", "Repository HEAD is malformed");
  if (!await repositoryAdapter.commitExists(baselineCommit) || !await repositoryAdapter.isAncestor(baselineCommit, head)) fail("BASELINE_NOT_ANCESTRAL", "target baseline is missing or not ancestral to HEAD");
  return { head, branch, clean: status.length === 0, statusSha256: sha256(status) };
}

export async function snapshotAuthoritativeState(context) {
  const records = [];
  const recordsByPath = new Map();
  for (const expected of context.authoritativeRecords) {
    const current = await verifyTrackedCurrentFile(context.repoRoot, expected.relative, "authoritative native input", context.repositoryAdapter);
    if (current.sha256 !== expected.sha256 || current.gitMode !== expected.gitMode || current.gitObjectId !== expected.gitObjectId) fail("AUTHORITATIVE_INPUT_MUTATED", "authoritative native input changed after discovery");
    records.push({ ref: redactedRef(current.relative), rawSha256: current.sha256, mode: current.gitMode, objectId: current.gitObjectId });
    recordsByPath.set(current.relative, current);
  }
  const observedRegisteredDigests = {
    candidate: fingerprint(context.registeredSources.candidate.map(({ relative: pathValue }) => {
      const artifact = recordsByPath.get(pathValue);
      if (!artifact) fail("REGISTERED_DIGEST_UNRESOLVED", "registered candidate input is absent from authoritative snapshot");
      return { ref: redactedRef(pathValue), rawSha256: artifact.sha256 };
    })),
    protected: fingerprint(context.registeredSources.protected),
    checker: fingerprint(context.registeredSources.checker.map(({ relative: pathValue }) => {
      const artifact = recordsByPath.get(pathValue);
      if (!artifact) fail("REGISTERED_DIGEST_UNRESOLVED", "registered checker input is absent from authoritative snapshot");
      return { path: pathValue, rawSha256: artifact.sha256 };
    })),
  };
  if (stableJson(observedRegisteredDigests) !== stableJson(context.registeredDigests)) fail("REGISTERED_DIGEST_MUTATED", "candidate/protected/checker registered digest set changed after discovery");
  const [head, status] = await Promise.all([context.repositoryAdapter.head(), context.repositoryAdapter.status()]);
  return { head, clean: status.length === 0, statusSha256: sha256(status), authoritativeDigest: fingerprint(records), registeredDigest: fingerprint(observedRegisteredDigests) };
}

export async function discoverNativePromotionContext(repoInput, options = {}) {
  const requestedRepoRoot = resolve(repoInput);
  const repoRoot = await realpath(requestedRepoRoot);
  if (repoRoot !== requestedRepoRoot) fail("REPOSITORY_ROOT_SYMLINK_FORBIDDEN", "repository root must be a canonical path without symlink components");
  const repositoryAdapter = options.repositoryAdapter ?? createGitRepositoryAdapter(repoRoot);
  const authoritativeRecords = [];
  const packageArtifact = await readCurrentJson(repoRoot, "package.json", "package.json", repositoryAdapter);
  authoritativeRecords.push(packageArtifact);
  const nativeCli = validatePublicScripts(packageArtifact.value);
  const cliArtifacts = [];
  for (const operation of Object.values(nativeCli)) {
    if (!cliArtifacts.some((artifact) => artifact.relative === operation.entryPath)) {
      const artifact = await verifyTrackedCurrentFile(repoRoot, operation.entryPath, "advertised native CLI entry", repositoryAdapter);
      cliArtifacts.push(artifact);
      authoritativeRecords.push(artifact);
    }
  }
  const workflow = await findWorkflow(repoRoot, repositoryAdapter, authoritativeRecords);
  let comparatorArtifact = null;
  if (workflow.comparator.kind === "external-release-bound") {
    comparatorArtifact = await verifyTrackedCurrentFile(repoRoot, workflow.comparator.entryPath, "semantic comparator entry", repositoryAdapter);
    authoritativeRecords.push(comparatorArtifact);
  }
  const operation = options.operation ?? "audit";
  if (!["audit", "validate", "shadow", "verify-receipt"].includes(operation)) fail("OPERATION_FORBIDDEN", "discovery operation is unsupported");
  const executionPhase = operation === "validate" || operation === "shadow";
  const manifestArtifact = await readCurrentJson(repoRoot, workflow.manifestSelector, "Promotion Manifest", repositoryAdapter);
  let receiptArtifact = null;
  if (!executionPhase) {
    receiptArtifact = options.receiptArtifact ?? await readCurrentJson(repoRoot, workflow.receiptSelector, "canonical Promotion Receipt", repositoryAdapter);
    if (!isPlainObject(receiptArtifact?.value) || !Buffer.isBuffer(receiptArtifact?.bytes) || typeof receiptArtifact?.relative !== "string") fail("RECEIPT_ARTIFACT_INVALID", "canonical or transported Receipt artifact is malformed");
  }
  authoritativeRecords.push(manifestArtifact);
  if (receiptArtifact && !options.receiptArtifact) authoritativeRecords.push(receiptArtifact);
  const gitState = await repositoryState(repositoryAdapter, manifestArtifact.value.targetBaselineCommit);
  if (options.expectedHead && options.expectedHead !== gitState.head) fail("HEAD_MISMATCH", "observed HEAD differs from expected HEAD");
  for (const commit of [manifestArtifact.value.sourceCommit, manifestArtifact.value.checkerRelease?.releaseCommit]) {
    if (!COMMIT_RE.test(commit ?? "") || !await repositoryAdapter.commitExists(commit) || !await repositoryAdapter.isAncestor(commit, gitState.head)) fail("SOURCE_COMMIT_INVALID", "source or checker release commit is missing or not ancestral to HEAD");
  }
  const checkerCli = workflow.comparator.kind === "external-release-bound" ? { ...nativeCli, compareReceipts: { entryPath: workflow.comparator.entryPath } } : nativeCli;
  const checker = await resolveCheckerRelease(repoRoot, manifestArtifact, checkerCli, repositoryAdapter, gitState.head, authoritativeRecords);
  const manifestSchema = schemaForValue(checker.schemaArtifacts, manifestArtifact.value, "Promotion Manifest");
  const receiptSchema = receiptArtifact
    ? schemaForValue(checker.schemaArtifacts, receiptArtifact.value, "canonical Promotion Receipt")
    : uniqueReceiptSchema(checker.schemaArtifacts);
  validateJsonSchema(manifestArtifact.value, manifestSchema.value, "Promotion Manifest");
  if (receiptArtifact) validateJsonSchema(receiptArtifact.value, receiptSchema.value, "canonical Promotion Receipt");
  const bindingProjection = receiptArtifact
    ? exactManifestReceiptBindings(manifestArtifact, receiptArtifact, checker)
    : canonicalBindingProjection(manifestBindingSource(manifestArtifact, gitState.head));
  if (!await repositoryAdapter.commitExists(bindingProjection.executionCommit) || !await repositoryAdapter.isAncestor(bindingProjection.executionCommit, gitState.head)) fail("EXECUTION_COMMIT_INVALID", "canonical Receipt execution commit is missing or not ancestral to HEAD");
  if (executionPhase && await repositoryAdapter.treeEntry(bindingProjection.executionCommit, workflow.receiptSelector) !== null) {
    fail("FUTURE_CANONICAL_RECEIPT_ALREADY_BOUND", "future canonical Receipt already exists at the registered execution commit");
  }
  const canonicalReceipt = receiptArtifact
    ? summarizeVerifiedReceipt({ ...receiptArtifact, label: "canonical Receipt", receiptSha256: receiptArtifact.sha256 }, { schema: receiptSchema.value })
    : null;
  const inputs = await verifyManifestInputs(repoRoot, manifestArtifact.value, checker, repositoryAdapter, authoritativeRecords);
  const relation = await resolveAttemptRelation(repoRoot, workflow, manifestArtifact, receiptArtifact, checker, inputs, repositoryAdapter, gitState.head, authoritativeRecords, {
    phase: executionPhase ? "execution" : "storage",
    executionCommit: gitState.head,
    storageCommit: options.storageCommit,
  });
  if (relation.baseReceipt && relation.baseManifest !== manifestArtifact) {
    const baseManifestSchema = schemaForValue(checker.schemaArtifacts, relation.baseManifest.value, "base Manifest");
    const baseReceiptSchema = schemaForValue(checker.schemaArtifacts, relation.baseReceipt.value, "base Receipt");
    validateJsonSchema(relation.baseManifest.value, baseManifestSchema.value, "base Manifest");
    validateJsonSchema(relation.baseReceipt.value, baseReceiptSchema.value, "base Receipt");
    exactManifestReceiptBindings(relation.baseManifest, relation.baseReceipt, checker);
    summarizeVerifiedReceipt({ ...relation.baseReceipt, label: "base Receipt", receiptSha256: relation.baseReceipt.sha256 }, { schema: baseReceiptSchema.value });
  }
  const closure = operation === "audit" && relation.baseReceipt
    ? await validateClosureAndRegistry(repoRoot, relation.closure, relation.registry, relation.baseManifest, relation.baseReceipt, repositoryAdapter, gitState.head, authoritativeRecords)
    : { verified: false, lifecycleState: "candidate_hold", evidenceHashes: [] };
  const relationBlocked = relation.nativeExecutionBlockers.length > 0;
  const relationRequiresNewAttempt = relation.attemptRelation.candidateChanged || relation.attemptRelation.sourceChanged || relation.attemptRelation.checkerChanged;
  let lifecycleState = closure.verified && !relationBlocked && relation.closureScope === "active-attempt"
    ? closure.lifecycleState
    : receiptArtifact?.value?.lifecycle?.currentState ?? "shadow_ready";
  if (!LIFECYCLE_STATES.has(lifecycleState)) lifecycleState = "candidate_hold";
  const currentness = await classifyRegisteredExecutionCurrentness({
    relationBlocked,
    gitClean: gitState.clean,
    repositoryAdapter,
    executionCommit: bindingProjection.executionCommit,
    protectedRecords: [manifestArtifact, ...inputs.executionProtectedRecords],
  });
  const liveBlockers = Array.isArray(manifestArtifact.value.knownBlockers) ? manifestArtifact.value.knownBlockers.filter((entry) => entry?.scope === "live") : [];
  const blockers = liveBlockers.map((entry, index) => `live-blocker-${sha256(`${entry?.code ?? index}:${manifestArtifact.sha256}`).slice(0, 12)}`);
  blockers.push(...relation.nativeExecutionBlockers);
  if (relationRequiresNewAttempt) blockers.push("REAFFIRMATION_REQUIRES_NEW_ATTEMPT");
  if (currentness !== "current") blockers.push(`currentness-blocker-${sha256(`${gitState.head}:${bindingProjection.executionCommit}`).slice(0, 12)}`);
  const branch = gitState.branch && SAFE_ID_RE.test(gitState.branch) ? gitState.branch : null;
  const uniqueRecords = [...new Map(authoritativeRecords.map((record) => [record.relative, record])).values()];
  const evidenceHashes = [...new Set([...uniqueRecords.map((record) => record.sha256), ...closure.evidenceHashes])];
  const envelopeMode = {
    audit: "audit-read-only",
    validate: "native-validate",
    shadow: "native-shadow",
    "verify-receipt": "receipt-verify",
  }[operation];
  const envelope = {
    schemaVersion: "1.0",
    skill: "mais-content-promotion-gate",
    mode: envelopeMode,
    observedAt: options.observedAt ?? canonicalTimestamp(),
    repository: { head: gitState.head, branch, clean: gitState.clean },
    evidenceId: `evidence-${sha256(`${manifestArtifact.sha256}:${gitState.head}`).slice(0, 24)}`,
    evidenceClass: "exact-package-machine-review",
    sourceIdentity: [
      { logicalId: "promotion-manifest", sha256: manifestArtifact.sha256, commit: bindingProjection.sourceCommit },
      ...(receiptArtifact ? [{ logicalId: "canonical-promotion-receipt", sha256: receiptArtifact.sha256 }] : []),
    ],
    resolvedState: relationBlocked ? "blocked" : "discovered",
    authority: {
      required: ["native-validation", "receipt-verification", "external-closure"],
      proven: closure.verified && relation.closureScope === "active-attempt" ? ["external-closure"] : [],
      missing: closure.verified && relation.closureScope === "active-attempt" ? ["native-validation", "receipt-verification"] : ["native-validation", "receipt-verification", "external-closure"],
    },
    status: relationBlocked ? "blocked" : "complete",
    authoritativeReceipt: false,
    bindings: {
      candidateDigest: bindingProjection.candidateDigest,
      sourceCommit: bindingProjection.sourceCommit,
      targetBaselineCommit: bindingProjection.targetBaselineCommit,
      checkerVersionSha256: sha256(bindingProjection.checkerVersion),
      checkerBundleDigest: bindingProjection.checkerBundleDigest,
      checkerReleaseCommit: bindingProjection.checkerReleaseCommit,
    },
    lifecycleState,
    currentness,
    liveBoundary: liveBlockers.length > 0 ? "blocked" : "unproven",
    attemptRelation: relation.attemptRelation,
    receiptComparison: {
      canonical: canonicalReceipt?.digest ?? null, fresh: null, replay: null,
      bindingsEqual: false, semanticDigestsEqual: false, rawDigestsEqual: false,
      runIdsDistinct: false, semanticDigestsVerified: false, comparisonStatus: "not-run",
    },
    nativeArtifacts: {
      manifest: artifactSummary(manifestArtifact), canonicalReceipt: artifactSummary(receiptArtifact),
      closure: artifactSummary(relation.closure), registry: artifactSummary(relation.registry),
      reaffirmation: artifactSummary(relation.reaffirmation), ciArtifact: null,
    },
    canonicalReceiptEvidence: receiptArtifact ? {
      ref: redactedRef(receiptArtifact.relative),
      fileSha256: receiptArtifact.sha256,
      executionCommit: bindingProjection.executionCommit,
      storageCommit: relation.attemptRelation.storageCommit,
    } : null,
    externalClosure: {
      verified: closure.verified, signatureDigestCount: closure.verified ? 2 : 0,
      scope: relation.closureScope,
      a11EvidenceVerified: closure.verified, a22EvidenceVerified: closure.verified,
      githubEvidenceVerified: closure.verified, a25EvidenceVerified: closure.verified,
      liveAllowed: false,
    },
    releaseHandoff: null,
    checks: [
      { id: "authoritative-input-currentness", status: "pass", evidenceRef: redactedRef(fingerprint(uniqueRecords.map((record) => ({ sha256: record.sha256, mode: record.gitMode })))) },
      { id: "public-native-cli", status: "pass", evidenceRef: redactedRef(stableJson(nativeCli)) },
      { id: "workflow-structure", status: "pass", evidenceRef: redactedRef(workflow.sha256) },
      { id: "checker-release", status: "pass", evidenceRef: redactedRef(checker.bundleDigest) },
      { id: "manifest-receipt-binding", status: "pass", evidenceRef: redactedRef(fingerprint(bindingProjection)) },
      { id: "receipt-digest-recomputation", status: canonicalReceipt ? "pass" : "unknown", ...(canonicalReceipt ? { evidenceRef: redactedRef(canonicalReceipt.digest.semanticDigest) } : {}) },
      { id: "explicit-reaffirmation-descriptor", status: relationBlocked ? "blocked" : "pass", ...(relation.reaffirmation ? { evidenceRef: redactedRef(relation.reaffirmation.sha256) } : {}) },
      { id: relation.closureScope === "historical-direct-base" ? "historical-external-closure" : "external-closure", status: closure.verified ? "pass" : "unknown" },
    ],
    blockers,
    evidenceHashes,
    redaction: { protectedContentIncluded: false, credentialsIncluded: false, rawProviderResponsesIncluded: false },
    claimCeiling: "audit-only",
    nextAllowedAction: relationRequiresNewAttempt ? "create-new-immutable-attempt" : currentness === "current" ? "run-native-validation" : "supply-missing-evidence",
  };
  return {
    envelope,
    context: {
      repoRoot, repositoryAdapter, nativeCli,
      manifestSelector: workflow.manifestSelector, receiptSelector: workflow.receiptSelector,
      reaffirmationSelector: workflow.reaffirmationSelector, workflowSha256: workflow.sha256,
      manifestEvidence: { path: manifestArtifact.relative, rawSha256: manifestArtifact.sha256 },
      canonicalReceiptEvidence: receiptArtifact ? {
        path: receiptArtifact.relative,
        manifestPath: receiptArtifact.value.manifest?.path,
        manifestRawSha256: receiptArtifact.value.manifest?.rawSha256,
        executionCommit: receiptArtifact.value.worktreeProof?.executionCommit,
        semanticReceiptDigest: receiptArtifact.value.semanticReceiptDigest,
        rawReceiptDigest: receiptArtifact.value.rawReceiptDigest,
        storageCommit: relation.attemptRelation.storageCommit,
        gitMode: receiptArtifact.gitMode,
        gitObjectId: receiptArtifact.gitObjectId,
        fileSha256: receiptArtifact.sha256,
      } : null,
      schemaCount: checker.schemaArtifacts.length, bindingProjection, bindingDigest: fingerprint(bindingProjection),
      receiptSchema: receiptSchema.value,
      receiptSchemaAuthority: {
        repositoryHead: gitState.head,
        manifestPath: manifestArtifact.relative,
        manifestSha256: manifestArtifact.sha256,
        ledgerPath: checker.ledger.relative,
        ledgerRawSha256: checker.ledger.sha256,
        checkerReleaseCommit: checker.descriptor.releaseCommit,
        checkerReleaseEntryDigest: fingerprint(checker.entry),
        checkerBundleDigest: checker.bundleDigest,
        schemaPath: receiptSchema.relative,
        schemaRawSha256: receiptSchema.sha256,
        schemaGitBlob: receiptSchema.gitObjectId,
        schemaGitMode: receiptSchema.gitMode,
        releaseCommitAncestorOfHead: true,
        comparatorKind: workflow.comparator.kind,
        comparatorWorkflowSha256: workflow.sha256,
        comparatorWorkflowGitBlob: workflow.gitObjectId,
        comparatorWorkflowGitMode: workflow.gitMode,
        comparatorProgramSha256: workflow.comparator.programSha256,
        comparatorEntrySha256: comparatorArtifact?.sha256 ?? null,
      },
      authoritativeRecords: uniqueRecords.map((record) => ({ relative: record.relative, sha256: record.sha256, gitMode: record.gitMode, gitObjectId: record.gitObjectId })),
      registeredDigests: inputs.registeredDigests, registeredSources: inputs.registeredSources, gitState,
      nativeExecutionBlockers: [
        ...relation.nativeExecutionBlockers,
        ...(bindingProjection.executionCommit === gitState.head ? [] : ["REGISTERED_EXECUTION_CHECKOUT_REQUIRED"]),
      ],
    },
  };
}

export async function discoverPromotionGate(repoInput, options = {}) {
  const { envelope } = await discoverNativePromotionContext(repoInput, options);
  return envelope;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/discover-promotion-gate.mjs [--repo ROOT] [--expected-head SHA]\n\nOffline, read-only discovery. Every package/workflow/selector/checker/schema/Manifest/\nReceipt/Closure/Registry/reaffirmation/native input must be a canonical repository\npath with no symlink component and exact current HEAD bytes plus mode. Workflow proof\ncomes only from reachable executable validate, fresh/replay Shadow, three verifies,\nand semantic comparison commands. A selected reaffirmation uses evidence -> registered\nexecution -> independent Receipt/finalization commits; an implicit revision remains\nblocked/stale. Currentness binds the registered execution SHA and protected inputs,\nnot storage HEAD identity. Output contains hashes, enums, and redacted references.\n\nExit codes:\n  0  bounded discovery completed, including a blocked evidence-state envelope\n  2  ambiguous, malformed, unsafe, untracked, or cryptographically invalid input\n  3  internal filesystem or Git read failure\n`);
}

function parseArgs(argv) {
  const options = { repo: process.cwd(), expectedHead: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--repo") options.repo = argv[++index];
    else if (arg === "--expected-head") options.expectedHead = argv[++index];
    else fail("USAGE_INVALID", "unsupported argument");
  }
  if (!options.repo || (options.expectedHead && !COMMIT_RE.test(options.expectedHead))) fail("USAGE_INVALID", "invalid arguments");
  return options;
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); } catch (error) {
    process.stdout.write(`${JSON.stringify({ tool: "discover-promotion-gate", result: "blocked", issues: [issue(error.code ?? "USAGE_INVALID")] })}\n`);
    return 2;
  }
  if (options.help) { printHelp(); return 0; }
  try {
    const envelope = await discoverPromotionGate(options.repo, { expectedHead: options.expectedHead });
    process.stdout.write(`${JSON.stringify({ tool: "discover-promotion-gate", result: "pass", authoritative: false, envelope })}\n`);
    return 0;
  } catch (error) {
    const code = error?.code ?? "INTERNAL_READ_FAILURE";
    const internal = error?.internal === true || code === "GIT_READ_FAILED" || code === "INTERNAL_READ_FAILURE";
    process.stdout.write(`${JSON.stringify({ tool: "discover-promotion-gate", result: internal ? "internal-error" : "blocked", issues: [issue(code)] })}\n`);
    return internal ? 3 : 2;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; });
}
