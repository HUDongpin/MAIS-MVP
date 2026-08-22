import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertExactStagedInventory,
  assertMainlandPepQuestionIllustrationsAreNotDeployableFromSnapshot,
  assertNoQaOnlyMarkerBasenameInDeployPath,
  assertSafeStagingRootLocation,
  assertSafeStagingTarget,
  resolveSafeStagingDir
} from "./prepare-vercel-staging.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoTmpRoot = path.join(repoRoot, ".tmp");
const defaultTestStagingRoot = path.join(repoTmpRoot, "vercel-staging");
await mkdir(defaultTestStagingRoot, { recursive: true });
const suiteRoot = await mkdtemp(path.join(defaultTestStagingRoot, "guard-"));
assert.ok(suiteRoot.startsWith("/Volumes/Starship/"));
after(() => rm(suiteRoot, { force: true, recursive: true }));

const stagingRoot = path.join(suiteRoot, "resolver-root");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function plannedFile(relativePath, value) {
  const bytes = Buffer.from(value, "utf8");
  return { relativePath, sha256: sha256(bytes), size: bytes.byteLength };
}

test("Vercel staging run id resolves to one strict child", () => {
  assert.equal(
    resolveSafeStagingDir(stagingRoot, "release-20260811"),
    path.join(stagingRoot, "release-20260811")
  );
});

test("Vercel staging run id rejects dot-segment deletion targets", () => {
  for (const runId of [".", "..", "   ", "/"]) {
    assert.throws(
      () => resolveSafeStagingDir(stagingRoot, runId),
      /non-dot path segment|empty/i
    );
  }
});

test("Vercel staging run id sanitizes separators without escaping the root", () => {
  const target = resolveSafeStagingDir(stagingRoot, "candidate/../../outside");
  assert.equal(path.dirname(target), stagingRoot);
  assert.equal(target.startsWith(`${stagingRoot}${path.sep}`), true);
});

test("external staging exception remains Starship-only, dedicated, and repository-disjoint", () => {
  assert.equal(
    assertSafeStagingRootLocation("/Volumes/Starship/owner-approved-staging", true),
    "/Volumes/Starship/owner-approved-staging"
  );
  for (const unsafe of [
    "/Users",
    "/Users/dongpinhu",
    "/Volumes",
    "/Volumes/Starship",
    "/Volumes/Starship/arbitrary-output",
    path.join(repoRoot, "components", "staging")
  ]) {
    assert.throws(
      () => assertSafeStagingRootLocation(unsafe, true),
      /broad|Starship|staging-named|disjoint/i,
      `external staging root must reject ${unsafe}`
    );
  }
});

test("an existing staging target must carry an exact ownership manifest", async () => {
  const root = path.join(suiteRoot, "owned-staging");
  const target = path.join(root, "run-1");
  await mkdir(target, { recursive: true });

  await assert.rejects(
    () => assertSafeStagingTarget(root, target, { requireOwnedExisting: true }),
    /unowned Vercel staging target/i
  );
  await writeFile(
    path.join(target, "vercel-staging-manifest.json"),
    `${JSON.stringify({ stagingDir: target, dryRun: false, forbiddenPathCount: 0 })}\n`
  );
  await assert.doesNotReject(
    () => assertSafeStagingTarget(root, target, { requireOwnedExisting: true })
  );
});

test("Mainland illustration exclusion is decided from exact captured source bytes", () => {
  const relativePath = "lib/mainlandPepQuestionAssets.ts";
  const emptySource =
    "export const mainlandPepQuestionIllustrationApprovals: Approval[] = [];\n";
  const emptyBytes = Buffer.from(emptySource, "utf8");
  assert.doesNotThrow(() =>
    assertMainlandPepQuestionIllustrationsAreNotDeployableFromSnapshot({
      files: [{
        content: emptyBytes,
        relativePath,
        sha256: sha256(emptyBytes),
        size: emptyBytes.byteLength
      }]
    })
  );

  const approvedSource = [
    "export const mainlandPepQuestionIllustrationApprovals: Approval[] = [",
    "  { questionId: 'approved-question' }",
    "];",
    "const unrelatedEmptyArray = [];"
  ].join("\n");
  const approvedBytes = Buffer.from(approvedSource, "utf8");
  assert.throws(
    () => assertMainlandPepQuestionIllustrationsAreNotDeployableFromSnapshot({
      files: [{
        content: approvedBytes,
        relativePath,
        sha256: sha256(approvedBytes),
        size: approvedBytes.byteLength
      }]
    }),
    /approvals are no longer empty/i
  );
});

test("deploy collection fails on QA-only marker basenames instead of silently excluding them", () => {
  for (const markerName of [
    ".ca-signature-qa-do-not-deploy.json",
    ".california-canvas-graphics-runtime-NO-DEPLOY.json"
  ]) {
    assert.throws(
      () => assertNoQaOnlyMarkerBasenameInDeployPath(`app/nested/${markerName}`),
      /QA-only marker basename/i
    );
  }
  assert.doesNotThrow(() =>
    assertNoQaOnlyMarkerBasenameInDeployPath("app/nested/clean-source.ts")
  );
});

test("staged inventory final-fences every copied file identity", async () => {
  const root = path.join(suiteRoot, "destination-file-fence");
  const firstPath = path.join(root, "first.txt");
  const secondPath = path.join(root, "second.txt");
  const firstValue = "first clean bytes\n";
  const secondValue = "second clean bytes\n";
  await mkdir(root, { recursive: true });
  await writeFile(firstPath, firstValue);
  await writeFile(secondPath, secondValue);

  const first = plannedFile("first.txt", firstValue);
  const secondBase = plannedFile("second.txt", secondValue);
  let relativePathReads = 0;
  const second = {
    ...secondBase,
    get relativePath() {
      relativePathReads += 1;
      if (relativePathReads === 3) {
        writeFileSync(firstPath, "first bytes rewritten after their hash check\n");
      }
      return "second.txt";
    }
  };

  await assert.rejects(
    () => assertExactStagedInventory(root, [first, second]),
    /first[.]txt.*changed|changed.*first[.]txt/i
  );
});
