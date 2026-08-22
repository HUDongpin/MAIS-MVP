import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  computeLegalDocumentDigest,
  evaluateGoogleOAuthLegalApproval,
  inspectCurrentLegalDocuments
} from "./check-google-oauth-legal-approval.mjs";

const privacySha256 = "a".repeat(64);
const termsSha256 = "b".repeat(64);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptPath = path.join(repoRoot, "scripts", "check-google-oauth-legal-approval.mjs");

function approvedManifest() {
  return {
    schemaVersion: 1,
    digestVersion: "mais-google-legal-v1",
    factsScheduleVersion: "2026-08-20-final-1",
    effectiveDate: "2026-09-01",
    documents: {
      privacy: { sha256: privacySha256 },
      terms: { sha256: termsSha256 }
    },
    ownerApproval: {
      approved: true,
      approvedAt: "2026-08-30T09:00:00Z",
      name: "Authorised Owner",
      title: "Director",
      entity: "MAIS Operating Entity",
      evidenceReference: "legal-archive-owner-approval-001",
      privacySha256,
      termsSha256
    },
    counselApproval: {
      approved: true,
      approvedAt: "2026-08-30T10:00:00Z",
      name: "Reviewing Counsel",
      firm: "Reviewing Law Firm",
      jurisdictions: ["Hong Kong", "United States"],
      conditions: "none",
      evidenceReference: "legal-archive-counsel-approval-001",
      privacySha256,
      termsSha256
    }
  };
}

test("legal approval gate accepts owner and counsel approvals bound to the same exact documents", () => {
  const result = evaluateGoogleOAuthLegalApproval({
    approval: approvedManifest(),
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.checks, {
    counselApproval: "approved:exact-hashes",
    documentStatus: "published:no-draft-markers",
    ownerApproval: "approved:exact-hashes",
    privacySha256: "matches",
    termsSha256: "matches"
  });
});

test("legal approval gate rejects a placeholder owner identity even when hashes match", () => {
  const approval = approvedManifest();
  approval.ownerApproval.name = "[FULL LEGAL NAME]";

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /owner approval identity and evidence are incomplete/i.test(blocker)));
});

test("legal approval gate rejects counsel approval without reviewed jurisdictions", () => {
  const approval = approvedManifest();
  approval.counselApproval.jurisdictions = [];

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /counsel approval identity, jurisdictions, and evidence are incomplete/i.test(blocker)));
});

test("legal approval gate rejects a placeholder legal facts schedule", () => {
  const approval = approvedManifest();
  approval.factsScheduleVersion = "[VERSION/DATE]";

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /legal facts schedule version is missing/i.test(blocker)));
});

test("legal approval CLI fails closed when the private approval artifact is missing", () => {
  const missingPath = path.join(repoRoot, ".local", "legal-approvals", "missing-test-approval.json");
  const result = spawnSync(process.execPath, [scriptPath, "--approval-file", missingPath, "--json"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((blocker) => /owner and counsel approval artifact is missing/i.test(blocker)));
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(missingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("legal document digest changes when shared rendered legal content changes", () => {
  const base = {
    kind: "privacy",
    pageSource: "privacy page source",
    publicIdentitySource: "public site identity source"
  };
  const first = computeLegalDocumentDigest({ ...base, sharedRendererSource: "renderer version one" });
  const second = computeLegalDocumentDigest({ ...base, sharedRendererSource: "renderer version two" });

  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.match(second, /^[a-f0-9]{64}$/u);
  assert.notEqual(first, second);
});

test("current legal source inspection reports both unapproved documents as drafts", () => {
  const currentDocuments = inspectCurrentLegalDocuments(repoRoot);

  for (const kind of ["privacy", "terms"]) {
    assert.match(currentDocuments[kind].sha256, /^[a-f0-9]{64}$/u);
    assert.equal(currentDocuments[kind].published, false);
    assert.equal(currentDocuments[kind].hasDraftMarkers, true);
  }
});

test("legal approval CLI stays blocked when exact-hash documents still render as drafts", () => {
  const tmpRoot = path.join(repoRoot, ".tmp");
  mkdirSync(tmpRoot, { recursive: true });
  const fixtureDir = mkdtempSync(path.join(tmpRoot, "google-legal-approval-"));
  const approvalPath = path.join(fixtureDir, "approval.json");
  const currentDocuments = inspectCurrentLegalDocuments(repoRoot);
  const approval = approvedManifest();
  for (const kind of ["privacy", "terms"]) {
    approval.documents[kind].sha256 = currentDocuments[kind].sha256;
    approval.ownerApproval[`${kind}Sha256`] = currentDocuments[kind].sha256;
    approval.counselApproval[`${kind}Sha256`] = currentDocuments[kind].sha256;
  }
  writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`, { mode: 0o600 });

  try {
    const result = spawnSync(process.execPath, [scriptPath, "--approval-file", approvalPath, "--json"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ready, false);
    assert.ok(report.blockers.some((blocker) => /must both be marked published/i.test(blocker)));
    assert.ok(report.blockers.some((blocker) => /must not contain draft markers/i.test(blocker)));
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("legal approval CLI verifies the exact staged source selected for deployment", () => {
  const stagingRoot = path.join(repoRoot, ".tmp", "vercel-staging");
  mkdirSync(stagingRoot, { recursive: true });
  const fixtureDir = mkdtempSync(path.join(stagingRoot, "google-legal-approval-"));
  const approvalPath = path.join(fixtureDir, "approval.json");

  mkdirSync(path.join(fixtureDir, "app", "privacy"), { recursive: true });
  mkdirSync(path.join(fixtureDir, "app", "terms"), { recursive: true });
  mkdirSync(path.join(fixtureDir, "components", "legal"), { recursive: true });
  mkdirSync(path.join(fixtureDir, "lib"), { recursive: true });
  writeFileSync(
    path.join(fixtureDir, "app", "privacy", "page.tsx"),
    'export default function Privacy() { return <LegalDocument status="published" />; }\n'
  );
  writeFileSync(
    path.join(fixtureDir, "app", "terms", "page.tsx"),
    'export default function Terms() { return <LegalDocument status="published" />; }\n'
  );
  writeFileSync(
    path.join(fixtureDir, "components", "legal", "LegalDocument.tsx"),
    "export function LegalDocument() { return null; }\n"
  );
  writeFileSync(
    path.join(fixtureDir, "lib", "publicSiteIdentity.ts"),
    'export const publicSiteIdentity = { name: "MAIS" };\n'
  );

  const stagedDocuments = inspectCurrentLegalDocuments(fixtureDir);
  const approval = approvedManifest();
  for (const kind of ["privacy", "terms"]) {
    approval.documents[kind].sha256 = stagedDocuments[kind].sha256;
    approval.ownerApproval[`${kind}Sha256`] = stagedDocuments[kind].sha256;
    approval.counselApproval[`${kind}Sha256`] = stagedDocuments[kind].sha256;
  }
  writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`, { mode: 0o600 });

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--approval-file", approvalPath, "--source-root", fixtureDir, "--json"],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ready, true);
    assert.deepEqual(report.blockers, []);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("legal approval CLI rejects source roots outside the repository staging boundary", () => {
  const tmpRoot = path.join(repoRoot, ".tmp");
  mkdirSync(tmpRoot, { recursive: true });
  const outsideStagingDir = mkdtempSync(path.join(tmpRoot, "google-legal-outside-staging-"));

  try {
    const result = spawnSync(
      process.execPath,
      [scriptPath, "--source-root", outsideStagingDir, "--json"],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ready, false);
    assert.equal(report.checks.sourceRoot, "invalid");
    assert.doesNotMatch(
      `${result.stdout}\n${result.stderr}`,
      new RegExp(outsideStagingDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  } finally {
    rmSync(outsideStagingDir, { recursive: true, force: true });
  }
});

test("legal approval gate rejects an unknown document-digest contract", () => {
  const approval = approvedManifest();
  approval.digestVersion = "legacy-raw-file-hash";

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /unsupported legal approval schema or digest version/i.test(blocker)));
});

test("legal approval gate rejects an invalid policy effective date", () => {
  const approval = approvedManifest();
  approval.effectiveDate = "DATE";

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /effective date must be a valid ISO calendar date/i.test(blocker)));
});

test("legal approval gate rejects an invalid owner approval timestamp", () => {
  const approval = approvedManifest();
  approval.ownerApproval.approvedAt = "yesterday";

  const result = evaluateGoogleOAuthLegalApproval({
    approval,
    currentDocuments: {
      privacy: { sha256: privacySha256, published: true, hasDraftMarkers: false },
      terms: { sha256: termsSha256, published: true, hasDraftMarkers: false }
    }
  });

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => /owner approval identity and evidence are incomplete/i.test(blocker)));
});
