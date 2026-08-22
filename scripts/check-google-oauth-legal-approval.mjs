#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_APPROVAL_FILE = path.join(REPO_ROOT, ".local", "legal-approvals", "google-oauth-policy-approval.json");
const VERCEL_STAGING_ROOT = path.join(REPO_ROOT, ".tmp", "vercel-staging");
const DIGEST_VERSION = "mais-google-legal-v1";

export function computeLegalDocumentDigest({
  kind,
  pageSource,
  sharedRendererSource,
  publicIdentitySource
}) {
  return createHash("sha256")
    .update(DIGEST_VERSION)
    .update("\0")
    .update(String(kind))
    .update("\0app-page\0")
    .update(String(pageSource))
    .update("\0shared-renderer\0")
    .update(String(sharedRendererSource))
    .update("\0public-identity\0")
    .update(String(publicIdentitySource))
    .digest("hex");
}

export function inspectCurrentLegalDocuments(repositoryRoot = REPO_ROOT) {
  const sharedRendererSource = readFileSync(
    path.join(repositoryRoot, "components", "legal", "LegalDocument.tsx"),
    "utf8"
  );
  const publicIdentitySource = readFileSync(
    path.join(repositoryRoot, "lib", "publicSiteIdentity.ts"),
    "utf8"
  );

  return Object.fromEntries(["privacy", "terms"].map((kind) => {
    const pageSource = readFileSync(path.join(repositoryRoot, "app", kind, "page.tsx"), "utf8");
    return [kind, {
      sha256: computeLegalDocumentDigest({
        kind,
        pageSource,
        sharedRendererSource,
        publicIdentitySource
      }),
      published: /status\s*=\s*["']published["']/u.test(pageSource),
      hasDraftMarkers: /status\s*=\s*["']draft-pending-review["']|pending legal review|\bdraft\b/iu.test(pageSource)
    }];
  }));
}

function approvalMatchesDocuments(approval, currentDocuments) {
  return (
    approval?.approved === true
    && approval.privacySha256 === currentDocuments.privacy.sha256
    && approval.termsSha256 === currentDocuments.terms.sha256
  );
}

function isMeaningfulApprovalText(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length >= 2
    && !/[\[\]{}<>]/u.test(normalized)
    && !["tbd", "todo", "placeholder", "example", "n/a"].includes(normalized)
  );
}

function isIsoCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoTimestamp(value) {
  return (
    typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    && !Number.isNaN(Date.parse(value))
  );
}

function ownerApprovalMetadataComplete(approval) {
  return (
    ["name", "title", "entity", "evidenceReference"]
      .every((key) => isMeaningfulApprovalText(approval?.[key]))
    && isIsoTimestamp(approval?.approvedAt)
  );
}

function counselApprovalMetadataComplete(approval) {
  return (
    ["name", "firm", "conditions", "evidenceReference"]
      .every((key) => isMeaningfulApprovalText(approval?.[key]))
    && isIsoTimestamp(approval?.approvedAt)
    && Array.isArray(approval?.jurisdictions)
    && approval.jurisdictions.length > 0
    && approval.jurisdictions.every(isMeaningfulApprovalText)
  );
}

export function evaluateGoogleOAuthLegalApproval({ approval, currentDocuments }) {
  const blockers = [];
  const schemaValid = approval?.schemaVersion === 1 && approval?.digestVersion === DIGEST_VERSION;
  const effectiveDateValid = isIsoCalendarDate(approval?.effectiveDate);
  const factsSchedulePresent = isMeaningfulApprovalText(approval?.factsScheduleVersion);
  const privacyMatches = approval?.documents?.privacy?.sha256 === currentDocuments.privacy.sha256;
  const termsMatches = approval?.documents?.terms?.sha256 === currentDocuments.terms.sha256;
  const published = currentDocuments.privacy.published === true && currentDocuments.terms.published === true;
  const hasDraftMarkers = currentDocuments.privacy.hasDraftMarkers || currentDocuments.terms.hasDraftMarkers;
  const ownerMetadataComplete = ownerApprovalMetadataComplete(approval?.ownerApproval);
  const ownerApproved = approvalMatchesDocuments(approval?.ownerApproval, currentDocuments) && ownerMetadataComplete;
  const counselMetadataComplete = counselApprovalMetadataComplete(approval?.counselApproval);
  const counselApproved = approvalMatchesDocuments(approval?.counselApproval, currentDocuments) && counselMetadataComplete;

  if (!privacyMatches) blockers.push("Privacy Policy approval hash does not match the current document.");
  if (!termsMatches) blockers.push("Terms of Service approval hash does not match the current document.");
  if (!schemaValid) blockers.push("Unsupported legal approval schema or digest version.");
  if (!effectiveDateValid) blockers.push("Policy effective date must be a valid ISO calendar date (YYYY-MM-DD).");
  if (!factsSchedulePresent) blockers.push("Legal facts schedule version is missing or contains a placeholder.");
  if (!published) blockers.push("Privacy Policy and Terms of Service must both be marked published.");
  if (hasDraftMarkers) blockers.push("Published legal documents must not contain draft markers.");
  if (!ownerMetadataComplete) blockers.push("Owner approval identity and evidence are incomplete or contain placeholders.");
  else if (!ownerApproved) blockers.push("Owner approval is missing or is not bound to the current documents.");
  if (!counselMetadataComplete) blockers.push("Counsel approval identity, jurisdictions, and evidence are incomplete or contain placeholders.");
  else if (!counselApproved) blockers.push("Counsel approval is missing or is not bound to the current documents.");

  return {
    ready: blockers.length === 0,
    checks: {
      counselApproval: counselApproved ? "approved:exact-hashes" : "blocked",
      documentStatus: published && !hasDraftMarkers ? "published:no-draft-markers" : "blocked",
      ownerApproval: ownerApproved ? "approved:exact-hashes" : "blocked",
      privacySha256: privacyMatches ? "matches" : "mismatch",
      termsSha256: termsMatches ? "matches" : "mismatch"
    },
    blockers
  };
}

function parseArgs(argv) {
  const parsed = { approvalFile: DEFAULT_APPROVAL_FILE, json: false, sourceRoot: REPO_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") {
      parsed.json = true;
    } else if (value === "--approval-file") {
      parsed.approvalFile = path.resolve(REPO_ROOT, argv[++index] ?? "");
    } else if (value === "--source-root") {
      const requestedRoot = argv[++index];
      parsed.sourceRoot = requestedRoot ? path.resolve(REPO_ROOT, requestedRoot) : null;
    }
  }
  return parsed;
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveApprovedSourceRoot(requestedRoot) {
  if (!requestedRoot) throw new Error("invalid source root");

  const repositoryRoot = realpathSync(REPO_ROOT);
  const sourceRoot = realpathSync(requestedRoot);
  if (sourceRoot === repositoryRoot) return sourceRoot;

  const stagingRoot = realpathSync(VERCEL_STAGING_ROOT);
  if (!pathIsWithin(repositoryRoot, stagingRoot) || !pathIsWithin(stagingRoot, sourceRoot)) {
    throw new Error("invalid source root");
  }
  return sourceRoot;
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Google OAuth legal approval: ${report.ready ? "ready" : "blocked"}`);
  for (const blocker of report.blockers) console.log(`- ${blocker}`);
}

function runCli(argv) {
  const args = parseArgs(argv);
  let sourceRoot;
  try {
    sourceRoot = resolveApprovedSourceRoot(args.sourceRoot);
  } catch {
    const report = {
      ready: false,
      checks: { sourceRoot: "invalid" },
      blockers: ["The legal source root is not an approved repository or Vercel staging location."]
    };
    printReport(report, args.json);
    return 1;
  }

  if (!existsSync(args.approvalFile)) {
    const report = {
      ready: false,
      checks: { approvalArtifact: "missing" },
      blockers: ["The owner and counsel approval artifact is missing."]
    };
    printReport(report, args.json);
    return 1;
  }

  let approval;
  try {
    approval = JSON.parse(readFileSync(args.approvalFile, "utf8"));
  } catch {
    const report = {
      ready: false,
      checks: { approvalArtifact: "invalid" },
      blockers: ["The owner and counsel approval artifact is not valid JSON."]
    };
    printReport(report, args.json);
    return 1;
  }

  let currentDocuments;
  try {
    currentDocuments = inspectCurrentLegalDocuments(sourceRoot);
  } catch {
    const report = {
      ready: false,
      checks: { legalDocuments: "unreadable" },
      blockers: ["The Privacy Policy and Terms of Service source bundle could not be inspected."]
    };
    printReport(report, args.json);
    return 1;
  }

  const report = evaluateGoogleOAuthLegalApproval({ approval, currentDocuments });
  printReport(report, args.json);
  return report.ready ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv.slice(2));
}
