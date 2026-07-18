import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const implementation = await import("./generate-physical-cleanup-fingerprint.mjs").catch(() => null);
const generatorPath = fileURLToPath(new URL("./generate-physical-cleanup-fingerprint.mjs", import.meta.url));

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createFingerprintFixture() {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mais-physical-fingerprint-")));
  const root = path.join(parent, "repo");
  const firstWorktree = path.join(parent, "feature-a");
  const secondWorktree = path.join(parent, "feature-b");
  fs.mkdirSync(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "MAIS Test"]);
  git(root, ["config", "user.email", "mais-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  git(root, ["add", "--", "README.md"]);
  git(root, ["commit", "-qm", "fixture main"]);
  git(root, ["branch", "feature-a"]);
  git(root, ["branch", "feature-b"]);
  git(root, ["worktree", "add", "-q", firstWorktree, "feature-a"]);
  git(root, ["worktree", "add", "-q", secondWorktree, "feature-b"]);
  for (const [worktree, subject] of [
    [firstWorktree, "same patch a"],
    [secondWorktree, "same patch b"]
  ]) {
    fs.writeFileSync(path.join(worktree, "feature.txt"), "same committed patch\n");
    git(worktree, ["add", "--", "feature.txt"]);
    git(worktree, ["commit", "-qm", subject]);
  }
  for (const worktree of [root, firstWorktree, secondWorktree]) {
    fs.mkdirSync(path.join(worktree, "data"), { recursive: true });
    fs.writeFileSync(
      path.join(worktree, "data", "duplicate.json"),
      `${JSON.stringify({ fixture: "DUPLICATE-CONTENT-SENTINEL" })}\n`
    );
  }
  return {
    parent,
    root,
    firstWorktree,
    secondWorktree,
    outputJson: path.join(root, "physical-fingerprint.json"),
    outputMarkdown: path.join(root, "physical-fingerprint.md"),
    cleanup() {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  };
}

function createEnvPlaceholderFixture() {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mais-env-placeholder-")));
  const root = path.join(parent, "repo");
  fs.mkdirSync(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "MAIS Test"]);
  git(root, ["config", "user.email", "mais-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  fs.writeFileSync(
    path.join(root, ".gitignore"),
    ".env\n.env.*\n!.env.example\n!.env.local.example\n"
  );
  git(root, ["add", "--", "README.md", ".gitignore"]);
  git(root, ["commit", "-qm", "fixture main"]);
  git(root, ["switch", "-qc", "feature-env-placeholder"]);
  fs.writeFileSync(path.join(root, ".env.local.example"), "DEEPSEEK_API_KEY=placeholder-xxxxxxxx\n");
  git(root, ["add", "--", ".env.local.example"]);
  git(root, ["commit", "-qm", "add safe environment placeholder"]);
  fs.writeFileSync(path.join(root, ".env.local"), "ACTUAL-IGNORED-SECRET-SENTINEL\n");
  return {
    parent,
    root,
    cleanup() {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  };
}

function createLockedWorktreeFixture() {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mais-locked-worktree-")));
  const root = path.join(parent, "repo");
  const linked = path.join(parent, "linked");
  fs.mkdirSync(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "MAIS Test"]);
  git(root, ["config", "user.email", "mais-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  git(root, ["add", "--", "README.md"]);
  git(root, ["commit", "-qm", "fixture main"]);
  git(root, ["branch", "locked-feature"]);
  git(root, ["worktree", "add", "-q", linked, "locked-feature"]);
  git(root, ["worktree", "lock", "--reason", "LOCK-REASON-SECRET-SENTINEL", linked]);
  return {
    parent,
    root,
    linked,
    cleanup() {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  };
}

function createMutablePublicationFixture() {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mais-publication-race-")));
  const root = path.join(parent, "repo");
  fs.mkdirSync(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "MAIS Test"]);
  git(root, ["config", "user.email", "mais-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  git(root, ["add", "--", "README.md"]);
  git(root, ["commit", "-qm", "fixture main"]);
  const dirtyPath = path.join(root, "mutable.txt");
  fs.writeFileSync(dirtyPath, "before-state\n");
  return {
    parent,
    root,
    dirtyPath,
    cleanup() {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  };
}

test("loads the physical cleanup fingerprint implementation", () => {
  assert.ok(implementation, "physical cleanup fingerprint implementation must exist");
});

test("exports the reviewable fingerprint primitives", () => {
  for (const name of [
    "parsePorcelainZ",
    "isSecretLikePath",
    "classifyPath",
    "inspectDirtyEntry",
    "buildDuplicateGroups",
    "evaluateRemovalGate",
    "renderFingerprintMarkdown",
    "parseCliArgs",
    "assertPublicationInputsCurrent",
    "publishAtomicOutputs"
  ]) {
    assert.equal(typeof implementation[name], "function", `${name} must be exported`);
  }
});

test("parses porcelain v1 -z without splitting embedded newlines and keeps rename history", () => {
  const status = Buffer.concat([
    Buffer.from(" M ordinary\nname.txt\0"),
    Buffer.from("R  renamed destination.txt\0renamed source.txt\0"),
    Buffer.from(" C copied destination.txt\0copied source.txt\0"),
    Buffer.from("?? .env.local\0")
  ]);

  assert.deepEqual(implementation.parsePorcelainZ(status), [
    { status: " M", relativePath: "ordinary\nname.txt" },
    {
      status: "R ",
      relativePath: "renamed destination.txt",
      historicalPath: "renamed source.txt"
    },
    {
      status: " C",
      relativePath: "copied destination.txt",
      historicalPath: "copied source.txt"
    },
    { status: "??", relativePath: ".env.local" }
  ]);
  assert.throws(
    () => implementation.parsePorcelainZ(Buffer.from("?? missing-final-nul")),
    /final NUL delimiter/u
  );
  assert.throws(
    () => implementation.parsePorcelainZ(Buffer.from("R  destination\0")),
    /historical path/u
  );
});

test("recognizes secret-like paths conservatively", () => {
  for (const filePath of [
    ".env",
    ".env.local",
    "config/.env.production",
    ".env.production.example",
    ".env.sample",
    ".env.local.example.backup",
    ".ENV.EXAMPLE",
    "config/.env.local.example",
    "All API Keys.docx",
    "private/credentials.json",
    "certs/server-private-key.pem",
    "keys/id_ed25519",
    "config/client_secret.json"
  ]) {
    assert.equal(implementation.isSecretLikePath(filePath), true, filePath);
  }
  for (const filePath of [
    ".env.example",
    ".env.local.example",
    "components/SecretBadge.tsx",
    "coordination/reports/credential-readiness.md",
    "public/logo.svg"
  ]) {
    assert.equal(implementation.isSecretLikePath(filePath), false, filePath);
  }
});

test("root-only plan snapshots tracked env placeholders while ignoring the real local env", () => {
  const fixture = createEnvPlaceholderFixture();
  try {
    const plan = implementation.generateFingerprintPlan({
      repoRoot: fixture.root,
      canonicalRoot: fixture.root,
      mainRef: "main",
      snapshotRef: "main",
      worktreePath: fixture.root,
      dryRun: true,
      clock: () => new Date("2026-07-17T12:00:00.000Z")
    });
    assert.equal(plan.worktrees.length, 1);
    assert.equal(plan.worktrees[0].valid, true);
    assert.equal(plan.worktrees[0].dirtyCount, 0);
    assert.equal(
      plan.worktrees[0].validationErrors.some((value) => value.includes("secret-like")),
      false
    );
    assert.equal(JSON.stringify(plan).includes("ACTUAL-IGNORED-SECRET-SENTINEL"), false);
  } finally {
    fixture.cleanup();
  }
});

test("fingerprint collection releases each completed worktree snapshot", () => {
  const fixture = createFingerprintFixture();
  let garbageCollectionCalls = 0;
  try {
    const plan = implementation.generateFingerprintPlan({
      repoRoot: fixture.root,
      canonicalRoot: fixture.root,
      mainRef: "main",
      snapshotRef: "main",
      dryRun: true,
      collectGarbage: () => {
        garbageCollectionCalls += 1;
      }
    });
    assert.equal(plan.worktrees.length, 3);
    assert.equal(garbageCollectionCalls, 3);
    assert.equal(plan.worktrees.every((worktree) => worktree.snapshot?.captureMode === "path-content-summary"), true);
  } finally {
    fixture.cleanup();
  }
});

test("path-summary snapshots scan dirty file content before marking a worktree safe", () => {
  const fixture = createMutablePublicationFixture();
  try {
    fs.writeFileSync(path.join(fixture.root, "notes.txt"), `DEEPSEEK_API_KEY=${"Q".repeat(48)}\n`);
    assert.throws(
      () => implementation.generateFingerprintPlan({
        repoRoot: fixture.root,
        canonicalRoot: fixture.root,
        mainRef: "main",
        snapshotRef: "main",
        dryRun: true
      }),
      (error) => /secret scanner rejected/u.test(error.message) && !error.message.includes("Q".repeat(48))
    );
  } finally {
    fixture.cleanup();
  }
});

test("locked worktrees are redacted, removal-ineligible, and lock drift blocks publication", () => {
  const fixture = createLockedWorktreeFixture();
  try {
    const plan = implementation.generateFingerprintPlan({
      repoRoot: fixture.root,
      canonicalRoot: fixture.root,
      mainRef: "main",
      snapshotRef: "main",
      dryRun: true
    });
    const linked = plan.worktrees.find((worktree) => worktree.path === fixture.linked);
    assert.equal(linked.locked, true);
    assert.equal(linked.lockReasonPresent, true);
    assert.match(linked.lockReasonSha256, /^[0-9a-f]{64}$/u);
    assert.equal(linked.removalGate.eligibleForRemoval, false);
    assert.equal(linked.removalGate.blockers.some((value) => value.includes("locked")), true);
    assert.equal(JSON.stringify(plan).includes("LOCK-REASON-SECRET-SENTINEL"), false);

    git(fixture.root, ["worktree", "unlock", fixture.linked]);
    git(fixture.root, ["worktree", "lock", "--reason", "changed reason", fixture.linked]);
    assert.throws(
      () => implementation.assertPublicationInputsCurrent(plan),
      /topology drift/u
    );
  } finally {
    fixture.cleanup();
  }
});

test("publication verifier detects dirty content drift without serializing its closure", () => {
  const fixture = createMutablePublicationFixture();
  try {
    const plan = implementation.generateFingerprintPlan({
      repoRoot: fixture.root,
      canonicalRoot: fixture.root,
      mainRef: "main",
      snapshotRef: "main",
      dryRun: true
    });
    assert.equal(JSON.stringify(plan).includes("publicationVerifier"), false);
    fs.writeFileSync(fixture.dirtyPath, "after--state\n");
    assert.throws(
      () => implementation.assertPublicationInputsCurrent(plan),
      /dirty content drift|canonical root drift/u
    );
  } finally {
    fixture.cleanup();
  }
});

test("atomic publisher verifies after buffers are prepared and before either rename", () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mais-publish-verifier-")));
  const outputJson = path.join(parent, "fingerprint.json");
  const outputMarkdown = path.join(parent, "fingerprint.md");
  fs.writeFileSync(outputJson, "old-json\n");
  fs.writeFileSync(outputMarkdown, "old-markdown\n");
  let verifierCalls = 0;
  try {
    assert.throws(
      () => implementation.publishAtomicOutputs({
        outputJson,
        outputMarkdown,
        jsonBuffer: Buffer.from("new-json\n"),
        markdownBuffer: Buffer.from("new-markdown\n"),
        verifyBeforeRename: () => {
          verifierCalls += 1;
          throw new Error("publication verifier blocked rename");
        }
      }),
      /publication verifier blocked rename/u
    );
    assert.equal(verifierCalls, 1);
    assert.equal(fs.readFileSync(outputJson, "utf8"), "old-json\n");
    assert.equal(fs.readFileSync(outputMarkdown, "utf8"), "old-markdown\n");
    assert.equal(fs.readdirSync(parent).some((name) => name.startsWith(".tmp-")), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("inspects secret metadata without invoking any content reader", () => {
  let hashCalls = 0;
  let linkCalls = 0;
  const fakeStat = {
    mode: 0o100600,
    size: 47,
    isFile: () => true,
    isSymbolicLink: () => false,
    isDirectory: () => false
  };
  const result = implementation.inspectDirtyEntry(
    "/fixture/worktree",
    { status: "??", relativePath: ".env.local" },
    {
      lstatSync: () => fakeStat,
      hashFile: () => {
        hashCalls += 1;
        throw new Error("secret file content was read");
      },
      readlinkSync: () => {
        linkCalls += 1;
        throw new Error("secret link content was read");
      }
    }
  );

  assert.equal(hashCalls, 0);
  assert.equal(linkCalls, 0);
  assert.deepEqual(result, {
    status: "??",
    relativePath: ".env.local",
    exists: true,
    kind: "file",
    mode: "100600",
    size: 47,
    sha256: null,
    secretRedacted: true
  });

  const copiedFromSecret = implementation.inspectDirtyEntry(
    "/fixture/worktree",
    {
      status: "C ",
      relativePath: "config/copied.txt",
      historicalPath: ".env.production"
    },
    {
      lstatSync: () => fakeStat,
      hashFile: () => {
        hashCalls += 1;
        throw new Error("content copied from a secret path was read");
      }
    }
  );
  assert.equal(copiedFromSecret.secretRedacted, true);
  assert.equal(copiedFromSecret.sha256, null);
  assert.equal(hashCalls, 0);
});

test("hashes ordinary files through the supplied no-follow hash primitive", () => {
  const expectedHash = crypto.createHash("sha256").update("ordinary").digest("hex");
  let hashCalls = 0;
  const result = implementation.inspectDirtyEntry(
    "/fixture/worktree",
    { status: " M", relativePath: "lib/ordinary.mjs" },
    {
      lstatSync: () => ({
        mode: 0o100644,
        size: 8,
        isFile: () => true,
        isSymbolicLink: () => false,
        isDirectory: () => false
      }),
      hashFile: () => {
        hashCalls += 1;
        return expectedHash;
      }
    }
  );

  assert.equal(hashCalls, 1);
  assert.equal(result.sha256, expectedHash);
  assert.equal(result.secretRedacted, false);
});

test("classifies representative paths into explicit owner packages", () => {
  const cases = [
    ["app/dashboard/page.tsx", "app", "A02"],
    ["components/ai/Tutor.tsx", "components", "A07"],
    ["lib/adaptiveLearning.ts", "lib", "A15"],
    ["types/index.ts", "types", "A08"],
    ["data/questions.ts", "data", "A04"],
    ["tests/e2e/student.spec.ts", "tests", "A11"],
    ["scripts/cleanup-generated-artifacts.mjs", "scripts", "A22"],
    ["next.config.ts", "config", "A10"],
    ["package.json", "package", "A10"],
    ["coordination/release-intake/fingerprint.json", "coordination-evidence", "A25"],
    ["public/question-illustrations/q1.svg", "public/generated-assets", "A24"],
    [".tmp/playwright/run.json", "local-generated", "A22"],
    ["All API Keys.docx", "secret/manual", "A19"],
    ["unknown-area/file.txt", "manual", "A10/A25"]
  ];

  for (const [filePath, category, owner] of cases) {
    assert.deepEqual(
      implementation.classifyPath(filePath),
      { category, owner, manualReview: owner === "A10/A25" },
      filePath
    );
  }
});

test("groups only content-verifiable duplicates across worktrees", () => {
  const shared = {
    status: "??",
    relativePath: "data/candidate.json",
    exists: true,
    kind: "file",
    mode: "100644",
    size: 12,
    sha256: "a".repeat(64),
    secretRedacted: false
  };
  const groups = implementation.buildDuplicateGroups([
    { ...shared, worktreePath: "/repo/w1", branch: "codex/A21-one" },
    { ...shared, worktreePath: "/repo/w2", branch: "codex/A21-two" },
    { ...shared, worktreePath: "/repo/w2", branch: "codex/A21-two-again" },
    { ...shared, relativePath: "data/other.json", worktreePath: "/repo/w3", branch: "codex/A21-three" },
    {
      ...shared,
      relativePath: ".env.local",
      sha256: null,
      secretRedacted: true,
      worktreePath: "/repo/w4",
      branch: "codex/A19-secret"
    }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].relativePath, "data/candidate.json");
  assert.equal(groups[0].occurrences.length, 2);
  assert.deepEqual(
    groups[0].occurrences.map((entry) => entry.worktreePath),
    ["/repo/w1", "/repo/w2"]
  );
});

test("removal gate fails closed unless every safety predicate is explicitly true", () => {
  const eligible = implementation.evaluateRemovalGate({
    access: true,
    dirtyCount: 0,
    branchMergedIntoMain: false,
    uniqueCommitCount: 0,
    dirtyPathsPreserved: true
  });
  assert.equal(eligible.eligibleForRemoval, true);

  for (const override of [
    { access: false },
    { dirtyCount: 1 },
    { uniqueCommitCount: 1 },
    { dirtyPathsPreserved: false },
    { dirtyPathsPreserved: undefined }
  ]) {
    const gate = implementation.evaluateRemovalGate({
      access: true,
      dirtyCount: 0,
      branchMergedIntoMain: false,
      uniqueCommitCount: 0,
      dirtyPathsPreserved: true,
      ...override
    });
    assert.equal(gate.eligibleForRemoval, false, JSON.stringify(override));
    assert.ok(gate.blockers.length > 0, JSON.stringify(override));
  }

  assert.equal(
    implementation.evaluateRemovalGate({
      access: true,
      dirtyCount: 0,
      branchMergedIntoMain: true,
      uniqueCommitCount: 9,
      dirtyPathsPreserved: true
    }).eligibleForRemoval,
    true
  );
});

test("CLI requires an explicit dry run or both output paths", () => {
  const dryRun = implementation.parseCliArgs(["--dry-run", "--worktree-path", "/repo/w1"]);
  assert.equal(dryRun.dryRun, true);
  assert.equal(dryRun.mainRef, "main");
  assert.equal(dryRun.snapshotRef, "c0ec06760");
  assert.equal(dryRun.worktreePath, "/repo/w1");

  const publish = implementation.parseCliArgs([
    "--output-json", "/tmp/fingerprint.json",
    "--output-markdown", "/tmp/fingerprint.md"
  ]);
  assert.equal(publish.dryRun, false);
  assert.equal(publish.outputJson, "/tmp/fingerprint.json");
  assert.equal(publish.outputMarkdown, "/tmp/fingerprint.md");

  assert.throws(() => implementation.parseCliArgs([]), /--dry-run/u);
  assert.throws(
    () => implementation.parseCliArgs(["--output-json", "/tmp/only.json"]),
    /together/u
  );
  assert.throws(
    () => implementation.parseCliArgs(["--dry-run", "--output-json", "/tmp/a", "--output-markdown", "/tmp/b"]),
    /cannot be combined/u
  );
  assert.throws(
    () => implementation.parseCliArgs(["--worktree-path", "/repo/w1", "--output-json", "/tmp/a", "--output-markdown", "/tmp/b"]),
    /only valid with --dry-run/u
  );
});

test("Markdown renders exact metadata without serializing secret content", () => {
  const secretSentinel = "DO-NOT-RENDER-SECRET-VALUE";
  const markdown = implementation.renderFingerprintMarkdown({
    schemaVersion: 1,
    generatedAtHkt: "2026-07-17T12:00:00.000+08:00",
    repo: {
      root: "/repo",
      canonicalRoot: "/repo",
      mainRef: "main",
      mainSha: "1".repeat(40),
      snapshotRef: "snapshot",
      snapshotSha: "2".repeat(40),
      selfGeneratedPaths: []
    },
    topology: { worktreeCount: 1, fingerprint: "3".repeat(64), stable: true },
    branchInventory: [],
    uniqueCommits: { count: 0, commits: [], duplicatePatchGroups: [] },
    worktrees: [{
      path: "/repo",
      branch: "main",
      head: "1".repeat(40),
      access: true,
      dirtyCount: 1,
      dirtyEntries: [{
        relativePath: ".env.local",
        status: "??",
        secretRedacted: true,
        sha256: null,
        privateTestPayload: secretSentinel
      }],
      removalGate: { eligibleForRemoval: false, blockers: ["dirty worktree"] }
    }],
    duplicateGroups: [],
    ownerPackages: [{
      owner: "A19",
      category: "secret/manual",
      uniquePathCount: 1,
      entryCount: 1,
      paths: [{ relativePath: ".env.local", count: 1 }]
    }],
    safetyGates: { eligibleWorktreeCount: 0, ineligibleWorktreeCount: 1 },
    privateTestPayload: secretSentinel
  });

  assert.match(markdown, /\.env\.local/u);
  assert.doesNotMatch(markdown, new RegExp(secretSentinel, "u"));
  assert.match(markdown, /eligibleForRemoval/u);
});

test("CLI fingerprints topology, duplicate patches, dirty content, and self-generated outputs", () => {
  const fixture = createFingerprintFixture();
  try {
    const args = [
      generatorPath,
      "--repo-root", fixture.root,
      "--canonical-root", fixture.root,
      "--main-ref", "main",
      "--snapshot-ref", "main",
      "--output-json", fixture.outputJson,
      "--output-markdown", fixture.outputMarkdown
    ];
    const first = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 120_000 });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /^fingerprint summary:/u);
    assert.doesNotMatch(first.stdout, /DUPLICATE-CONTENT-SENTINEL/u);
    assert.equal(fs.existsSync(fixture.outputJson), true);
    assert.equal(fs.existsSync(fixture.outputMarkdown), true);

    const plan = JSON.parse(fs.readFileSync(fixture.outputJson, "utf8"));
    for (const key of [
      "schemaVersion",
      "generatedAtHkt",
      "repo",
      "topology",
      "branchInventory",
      "uniqueCommits",
      "worktrees",
      "duplicateGroups",
      "ownerPackages",
      "safetyGates"
    ]) {
      assert.ok(Object.hasOwn(plan, key), key);
    }
    assert.equal(plan.topology.worktreeCount, 3);
    assert.equal(plan.topology.stable, true);
    assert.equal(plan.repo.mainSha.length, 40);
    assert.equal(plan.repo.snapshotSha, plan.repo.mainSha);
    assert.deepEqual(
      plan.repo.selfGeneratedPaths,
      [fixture.outputJson, fixture.outputMarkdown].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
    );
    assert.deepEqual(
      plan.branchInventory.map((branch) => branch.branch),
      ["feature-a", "feature-b"]
    );
    assert.equal(plan.uniqueCommits.count, 2);
    assert.equal(plan.uniqueCommits.commits.every((commit) => commit.sha.length === 40), true);
    assert.equal(plan.uniqueCommits.commits.every((commit) => commit.parents.length === 1), true);
    assert.equal(plan.uniqueCommits.commits.every((commit) => commit.changedFileCount === 1), true);
    assert.equal(
      plan.uniqueCommits.commits.every((commit) => (
        !Object.hasOwn(commit, "subject") && !Object.hasOwn(commit, "subjectRedacted")
      )),
      true
    );
    assert.doesNotMatch(JSON.stringify(plan), /same patch [ab]/u);
    assert.equal(plan.uniqueCommits.duplicatePatchGroups.length, 1);
    assert.equal(plan.uniqueCommits.duplicatePatchGroups[0].commitShas.length, 2);
    assert.equal(plan.duplicateGroups.length, 1);
    assert.equal(plan.duplicateGroups[0].relativePath, "data/duplicate.json");
    assert.equal(plan.duplicateGroups[0].occurrences.length, 3);
    assert.equal(plan.worktrees.every((worktree) => worktree.path.startsWith(fixture.parent)), true);
    assert.equal(plan.worktrees.every((worktree) => worktree.removalGate.eligibleForRemoval === false), true);
    const dataPackage = plan.ownerPackages.find((entry) => entry.category === "data");
    assert.equal(dataPackage.owner, "A10/A25");
    assert.equal(dataPackage.uniquePathCount, 1);
    assert.equal(dataPackage.entryCount, 3);

    const markdown = fs.readFileSync(fixture.outputMarkdown, "utf8");
    assert.match(markdown, /Exact owner package path counts/u);
    assert.doesNotMatch(markdown, /DUPLICATE-CONTENT-SENTINEL/u);
    assert.equal(fs.statSync(fixture.outputJson).mode & 0o777, 0o600);
    assert.equal(fs.statSync(fixture.outputMarkdown).mode & 0o777, 0o600);

    const second = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 120_000 });
    assert.equal(second.status, 0, second.stderr);
    const refreshed = JSON.parse(fs.readFileSync(fixture.outputJson, "utf8"));
    assert.equal(
      refreshed.worktrees.find((worktree) => worktree.path === fixture.root).dirtyCount,
      1,
      "self-generated output paths must be excluded on refresh"
    );
    assert.equal(
      fs.readdirSync(fixture.root).some((name) => name.includes(".tmp-physical-fingerprint")),
      false,
      "atomic output temporary files must be cleaned"
    );
  } finally {
    fixture.cleanup();
  }
});
