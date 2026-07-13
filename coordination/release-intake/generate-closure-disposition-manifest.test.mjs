import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDispositionManifest,
  buildDispositionRows,
  classifyDisposition,
  hashDispositionPath,
  readRawStatus,
  resolveDispositionEvidenceRoot,
  validateDispositionPolicy,
  writeDispositionReport
} from "./generate-closure-disposition-manifest.mjs";
import {
  assertDispositionManifestCurrent
} from "./assert-closure-disposition-manifest-current.mjs";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-disposition-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "MAIS Test"]);
  git(root, ["config", "user.email", "mais-test@example.invalid"]);
  fs.writeFileSync(path.join(root, "modified.txt"), "before\n");
  fs.writeFileSync(path.join(root, "deleted.txt"), "delete me\n");
  git(root, ["add", "--", "modified.txt", "deleted.txt"]);
  git(root, ["commit", "-qm", "fixture"]);
  return root;
}

const policy = {
  version: 1,
  humanInputPaths: [
    "coordination/release-intake/closure-disposition-policy.json"
  ],
  externalEvidence: {
    archivePrefixes: ["coordination/release-intake/archive/"],
    evidenceDirectoryPatterns: [
      "^coordination/release-intake/[0-9]{4}-[0-9]{2}-[0-9]{2}-A25-(?:branch|worktree)-evidence-[^/]+/"
    ],
    latestPattern: "^coordination/release-intake/latest-.*\\.(?:json|md|pathspec)$",
    dirtyMapPattern: "^coordination/release-intake/[0-9]{4}-[0-9]{2}-[0-9]{2}-(?:A25|S25)-dirty-tree-map-.*\\.(?:json|md)$",
    repeatedSelectionPattern: "^coordination/release-intake/[0-9]{4}-[0-9]{2}-[0-9]{2}-A25-dirty-worktree-final-state-(?:blocker-selection|owner-approved-selection)\\.(?:json|md)$",
    rawSuffixes: [".pathspec", ".patch", ".tar", ".tar-list"],
    officeLockPattern: "(?:^|/)(?:\\.~lock\\.[^/]+#|\\.~[^/]+\\.(?:docx|xlsx|pptx)|~\\$[^/]+\\.(?:docx|xlsx|pptx))$",
    datedLatestPairs: true
  },
  packageAssignments: [
    {
      sourcePackageId: "A25-release-intake",
      packageId: "P8-A25-closure-governance-source",
      wave: "P8",
      finalState: "reviewed commit"
    }
  ],
  externalPackage: {
    packageId: "P8-external-generated-evidence",
    wave: "P8",
    finalState: "evidence archive"
  }
};

function fixtureOwnerManifest(pathspecs = ["*.txt"]) {
  return {
    version: 1,
    packages: [
      {
        id: "fixture-package",
        owner: "A25",
        role: "fixture",
        slice: "tests",
        pathspecs
      }
    ],
    resolutionChecks: [
      { path: "modified.txt", expectedOwner: "A25" }
    ]
  };
}

function fixtureDispositionPolicy(overrides = {}) {
  return {
    ...policy,
    ...overrides,
    packageAssignments: overrides.packageAssignments ?? [
      {
        sourcePackageId: "fixture-package",
        packageId: "P8-fixture-package",
        wave: "P8",
        finalState: "reviewed commit"
      }
    ]
  };
}

function preparePublishFixture(root) {
  const ownerPath = path.join(root, "owner-pathspecs.json");
  const policyPath = path.join(root, "closure-disposition-policy.json");
  const dirtyMapPath = path.join(root, "latest-A25-dirty-tree-map.json");
  const ownerManifest = fixtureOwnerManifest([
    "*.txt",
    "latest-A25-dirty-tree-map.json"
  ]);
  const fixturePolicy = fixtureDispositionPolicy({ humanInputPaths: [] });
  fs.writeFileSync(ownerPath, `${JSON.stringify(ownerManifest, null, 2)}\n`);
  fs.writeFileSync(policyPath, `${JSON.stringify(fixturePolicy, null, 2)}\n`);
  git(root, ["add", "--", "owner-pathspecs.json", "closure-disposition-policy.json"]);
  git(root, ["commit", "-qm", "fixture policy"]);
  fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
  fs.writeFileSync(dirtyMapPath, `${JSON.stringify({
    generatedAt: "2026-07-13T00:00:00.000Z",
    statusSignature: "a".repeat(64),
    outputPaths: { latestJson: "latest-A25-dirty-tree-map.json" },
    entries: [{ status: " M", path: "modified.txt" }]
  }, null, 2)}\n`);
  return { ownerPath, policyPath, dirtyMapPath };
}

function publishedFixture() {
  const root = fixtureRepo();
  const evidenceParent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-published-"));
  const evidenceRoot = path.join(evidenceParent, "evidence-archives");
  const paths = preparePublishFixture(root);
  const reportPath = writeDispositionReport({
    repoRoot: root,
    evidenceRoot,
    ownerManifestPath: paths.ownerPath,
    policyPath: paths.policyPath,
    dirtyMapPath: paths.dirtyMapPath,
    generatedAt: "2026-07-13T00:01:00.000Z"
  });
  return {
    root,
    evidenceParent,
    evidenceRoot,
    reportPath,
    ...paths,
    assertCurrent(overrides = {}) {
      return assertDispositionManifestCurrent({
        repoRoot: root,
        evidenceRoot,
        ownerManifestPath: paths.ownerPath,
        policyPath: paths.policyPath,
        dirtyMapPath: paths.dirtyMapPath,
        clock: () => new Date("2026-07-13T00:02:00.000Z"),
        maxAgeMinutes: 10,
        ...overrides
      });
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(evidenceParent, { recursive: true, force: true });
    }
  };
}

test("classifies durable source separately from exact generated evidence", () => {
  const context = {
    ownerId: "A25",
    sourcePackageId: "A25-release-intake",
    allPaths: new Set([
      "coordination/release-intake/latest-A25-example.json",
      "coordination/release-intake/2026-07-13-A25-example.json"
    ])
  };

  assert.deepEqual(
    classifyDisposition({
      ...context,
      path: "coordination/release-intake/generate-example.mjs",
      policy
    }),
    {
      packageId: "P8-A25-closure-governance-source",
      wave: "P8",
      finalState: "reviewed commit"
    }
  );
  assert.deepEqual(
    classifyDisposition({
      ...context,
      path: "coordination/release-intake/latest-A25-example.json",
      policy
    }),
    {
      packageId: "P8-external-generated-evidence",
      wave: "P8",
      finalState: "evidence archive"
    }
  );
  assert.deepEqual(
    classifyDisposition({
      ...context,
      path: "coordination/release-intake/2026-07-13-A25-example.json",
      policy
    }),
    {
      packageId: "P8-external-generated-evidence",
      wave: "P8",
      finalState: "evidence archive"
    }
  );
});

test("limits dated-latest evidence pairs to matching release-intake external names", () => {
  const durable = {
    packageId: "P8-A25-closure-governance-source",
    wave: "P8",
    finalState: "reviewed commit"
  };
  const common = {
    ownerId: "A25",
    sourcePackageId: "A25-release-intake",
    policy
  };

  assert.deepEqual(classifyDisposition({
    ...common,
    path: "coordination/reports/2026-07-13-human-report.md",
    allPaths: new Set([
      "coordination/reports/2026-07-13-human-report.md",
      "coordination/reports/latest-human-report.md"
    ])
  }), durable);
  assert.deepEqual(classifyDisposition({
    ...common,
    path: "coordination/release-intake/2026-07-13-human-report.txt",
    allPaths: new Set([
      "coordination/release-intake/2026-07-13-human-report.txt",
      "coordination/release-intake/latest-human-report.txt"
    ])
  }), durable);
  const humanLatestPolicy = structuredClone(policy);
  humanLatestPolicy.humanInputPaths.push(
    "coordination/release-intake/latest-A25-human-input.json"
  );
  assert.deepEqual(classifyDisposition({
    ...common,
    policy: humanLatestPolicy,
    path: "coordination/release-intake/2026-07-13-A25-human-input.json",
    allPaths: new Set([
      "coordination/release-intake/2026-07-13-A25-human-input.json",
      "coordination/release-intake/latest-A25-human-input.json"
    ])
  }), durable);
  assert.equal(
    classifyDisposition({
      ...common,
      path: "coordination/release-intake/2026-07-13-A25-example.json",
      allPaths: new Set([
        "coordination/release-intake/2026-07-13-A25-example.json",
        "coordination/release-intake/latest-A25-example.json"
      ])
    }).finalState,
    "evidence archive"
  );
});

test("classifies every configured external family and preserves durable negatives", async (t) => {
  const context = {
    ownerId: "A25",
    sourcePackageId: "A25-release-intake",
    policy
  };
  const externalCases = [
    ["archive prefix", "coordination/release-intake/archive/run/report.json", []],
    ["dated evidence directory", "coordination/release-intake/2026-07-13-A25-branch-evidence-run/report.json", []],
    ["latest artifact", "coordination/release-intake/latest-A25-run.json", []],
    ["dirty map", "coordination/release-intake/2026-07-13-A25-dirty-tree-map-run.md", []],
    ["repeated selection", "coordination/release-intake/2026-07-13-A25-dirty-worktree-final-state-blocker-selection.json", []],
    ["raw pathspec", "coordination/release-intake/run.pathspec", []],
    ["raw patch", "coordination/release-intake/run.patch", []],
    ["raw tar", "coordination/release-intake/run.tar", []],
    ["raw tar list", "coordination/release-intake/run.tar-list", []],
    ["office lock", "coordination/release-intake/~$run.docx", []],
    [
      "dated latest pair",
      "coordination/release-intake/2026-07-13-A25-run.json",
      ["coordination/release-intake/latest-A25-run.json"]
    ]
  ];
  for (const [name, filePath, companions] of externalCases) {
    await t.test(name, () => {
      assert.equal(classifyDisposition({
        ...context,
        path: filePath,
        allPaths: new Set([filePath, ...companions])
      }).finalState, "evidence archive");
    });
  }

  const durableCases = [
    ["source generator", "coordination/release-intake/generate-run.mjs", []],
    ["ordinary report", "coordination/reports/human-report.md", []],
    [
      "human report dated pair",
      "coordination/reports/2026-07-13-human-report.md",
      ["coordination/reports/latest-human-report.md"]
    ],
    [
      "nonmatching latest pair",
      "coordination/release-intake/2026-07-13-human-report.txt",
      ["coordination/release-intake/latest-human-report.txt"]
    ],
    ["ordinary Office file", "coordination/release-intake/human-report.docx", []]
  ];
  for (const [name, filePath, companions] of durableCases) {
    await t.test(name, () => {
      assert.equal(classifyDisposition({
        ...context,
        path: filePath,
        allPaths: new Set([filePath, ...companions])
      }).finalState, "reviewed commit");
    });
  }
});

test("reads raw porcelain NUL paths and hashes regular and deleted rows", () => {
  const root = fixtureRepo();
  try {
    const unusual = "line\nwith\ttab.txt";
    fs.writeFileSync(path.join(root, unusual), "nul-safe\n");
    fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
    fs.unlinkSync(path.join(root, "deleted.txt"));

    const entries = readRawStatus(root);
    assert.deepEqual(
      entries.map(({ status, path: filePath }) => [status, filePath]),
      [
        [" D", "deleted.txt"],
        [" M", "modified.txt"],
        ["??", unusual]
      ]
    );
    assert.equal(
      hashDispositionPath(root, entries[1]),
      crypto.createHash("sha256").update("after\n").digest("hex")
    );
    assert.equal(
      hashDispositionPath(root, entries[2]),
      crypto.createHash("sha256").update("nul-safe\n").digest("hex")
    );
    assert.equal(
      hashDispositionPath(root, entries[0]),
      crypto.createHash("sha256")
        .update(`MAIS-DISPOSITION-DELETED-V1\0 D\0deleted.txt`)
        .digest("hex")
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("records one destination row for staged and worktree-modified renames", () => {
  const root = fixtureRepo();
  try {
    git(root, ["mv", "modified.txt", "renamed.txt"]);
    let entries = readRawStatus(root);
    assert.deepEqual(entries, [
      { status: "R ", path: "renamed.txt", originalPath: "modified.txt" }
    ]);
    assert.equal(
      hashDispositionPath(root, entries[0]),
      crypto.createHash("sha256").update("before\n").digest("hex")
    );

    fs.writeFileSync(path.join(root, "renamed.txt"), "renamed and modified\n");
    entries = readRawStatus(root);
    assert.deepEqual(entries, [
      { status: "RM", path: "renamed.txt", originalPath: "modified.txt" }
    ]);
    const built = buildDispositionRows({
      repoRoot: root,
      ownerManifest: fixtureOwnerManifest(),
      policy: fixtureDispositionPolicy()
    });
    assert.equal(built.coverage.inputRows, 1);
    assert.deepEqual(built.rows.map((row) => row.path), ["renamed.txt"]);
    assert.equal(
      built.rows[0].sha256,
      crypto.createHash("sha256").update("renamed and modified\n").digest("hex")
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects real AA and DD unmerged Git index states", async (t) => {
  await t.test("AA", () => {
    const root = fixtureRepo();
    try {
      const baseBranch = git(root, ["branch", "--show-current"]).trim();
      git(root, ["checkout", "-qb", "conflict-side"]);
      fs.writeFileSync(path.join(root, "added-conflict.txt"), "side\n");
      git(root, ["add", "--", "added-conflict.txt"]);
      git(root, ["commit", "-qm", "side add"]);
      git(root, ["checkout", "-q", baseBranch]);
      fs.writeFileSync(path.join(root, "added-conflict.txt"), "main\n");
      git(root, ["add", "--", "added-conflict.txt"]);
      git(root, ["commit", "-qm", "main add"]);
      const merge = spawnSync("git", ["merge", "conflict-side"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }
      });
      assert.notEqual(merge.status, 0);
      assert.match(git(root, ["status", "--short"]), /^AA added-conflict\.txt$/mu);
      assert.throws(() => readRawStatus(root), /unmerged/u);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("DD", () => {
    const root = fixtureRepo();
    try {
      const objectId = git(root, ["rev-parse", "HEAD:modified.txt"]).trim();
      const zeros = "0".repeat(objectId.length);
      execFileSync("git", ["update-index", "-z", "--index-info"], {
        cwd: root,
        input: Buffer.from(
          `0 ${zeros}\tmodified.txt\0`
          + `100644 ${objectId} 1\tmodified.txt\0`
        ),
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
        stdio: ["pipe", "pipe", "pipe"]
      });
      fs.unlinkSync(path.join(root, "modified.txt"));
      assert.match(git(root, ["status", "--short"]), /^DD modified\.txt$/mu);
      assert.throws(() => readRawStatus(root), /unmerged/u);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test("rejects direct symlinks and ancestor symlinks without reading outside the repository", () => {
  const root = fixtureRepo();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-outside-"));
  try {
    fs.writeFileSync(path.join(outside, "secret.txt"), "outside secret\n");
    fs.symlinkSync(path.join(outside, "secret.txt"), path.join(root, "direct-link.txt"));
    fs.symlinkSync(outside, path.join(root, "linked"));
    assert.throws(
      () => hashDispositionPath(root, { status: "??", path: "direct-link.txt" }),
      /symlink|direct regular file|unsafe/u
    );
    assert.throws(
      () => hashDispositionPath(root, { status: "??", path: "linked/secret.txt" }),
      /ancestor|symlink|unsafe/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("rejects FIFO, directory, symlinked repo root, and repo-relative escape inputs", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-path-types-"));
  const root = path.join(parent, "repo");
  const rootLink = path.join(parent, "repo-link");
  fs.mkdirSync(root);
  try {
    fs.mkdirSync(path.join(root, "directory.txt"));
    execFileSync("mkfifo", [path.join(root, "pipe.txt")]);
    fs.writeFileSync(path.join(root, "regular.txt"), "regular\n");
    fs.symlinkSync(root, rootLink);
    for (const filePath of ["directory.txt", "pipe.txt"]) {
      assert.throws(
        () => hashDispositionPath(root, { status: "??", path: filePath }),
        /direct regular file|unsafe/u
      );
    }
    assert.throws(
      () => hashDispositionPath(rootLink, { status: "??", path: "regular.txt" }),
      /repository root.*symlink|direct directory/u
    );
    assert.throws(
      () => hashDispositionPath(root, { status: "??", path: "../outside.txt" }),
      /canonical repo-relative path/u
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("revalidates every earlier row after the full inventory has been hashed", () => {
  const root = fixtureRepo();
  try {
    fs.writeFileSync(path.join(root, "a.txt"), "a before\n");
    fs.writeFileSync(path.join(root, "z.txt"), "z before\n");
    git(root, ["add", "--", "a.txt", "z.txt"]);
    git(root, ["commit", "-qm", "inventory files"]);
    fs.writeFileSync(path.join(root, "a.txt"), "a first version\n");
    fs.writeFileSync(path.join(root, "z.txt"), "z dirty\n");
    let mutated = false;
    assert.throws(
      () => buildDispositionRows({
        repoRoot: root,
        ownerManifest: fixtureOwnerManifest(),
        policy: fixtureDispositionPolicy(),
        afterHash(entry) {
          if (entry.path === "z.txt") {
            mutated = true;
            fs.writeFileSync(path.join(root, "a.txt"), "a changed after its hash\n");
          }
        }
      }),
      /changed after hashing|inventory changed|revalidation/u
    );
    assert.equal(mutated, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("mutation barrier catches an early row rewrite after its second pass while a later row validates", () => {
  const root = fixtureRepo();
  try {
    fs.writeFileSync(path.join(root, "a.txt"), "a before\n");
    fs.writeFileSync(path.join(root, "z.txt"), Buffer.alloc(16 * 1024 * 1024, 0x7a));
    git(root, ["add", "--", "a.txt", "z.txt"]);
    git(root, ["commit", "-qm", "barrier files"]);
    fs.writeFileSync(path.join(root, "a.txt"), "a dirty first\n");
    fs.writeFileSync(path.join(root, "z.txt"), Buffer.alloc(16 * 1024 * 1024, 0x79));
    let mutated = false;
    assert.throws(
      () => buildDispositionRows({
        repoRoot: root,
        ownerManifest: fixtureOwnerManifest(),
        policy: fixtureDispositionPolicy(),
        beforeRevalidate(entry) {
          if (entry.path === "z.txt") {
            mutated = true;
            fs.writeFileSync(path.join(root, "a.txt"), "a rewritten after second pass\n");
          }
        }
      }),
      /mutation monitor|epoch|changed/u
    );
    assert.equal(mutated, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("currentness binds the canonical Git index when MM worktree bytes and XY stay unchanged", () => {
  const root = fixtureRepo();
  const evidenceParent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-index-current-"));
  const evidenceRoot = path.join(evidenceParent, "evidence-archives");
  try {
    const generatedAt = new Date().toISOString();
    const paths = preparePublishFixture(root);
    fs.writeFileSync(path.join(root, "modified.txt"), "staged B\n");
    git(root, ["add", "--", "modified.txt"]);
    fs.writeFileSync(path.join(root, "modified.txt"), "worktree C\n");
    const dirtyMap = JSON.parse(fs.readFileSync(paths.dirtyMapPath, "utf8"));
    dirtyMap.entries = [{ status: "MM", path: "modified.txt" }];
    fs.writeFileSync(paths.dirtyMapPath, `${JSON.stringify(dirtyMap, null, 2)}\n`);
    assert.equal(readRawStatus(root).find((entry) => entry.path === "modified.txt").status, "MM");
    writeDispositionReport({
      repoRoot: root,
      evidenceRoot,
      ownerManifestPath: paths.ownerPath,
      policyPath: paths.policyPath,
      dirtyMapPath: paths.dirtyMapPath,
      generatedAt
    });

    fs.writeFileSync(path.join(root, "modified.txt"), "staged D\n");
    git(root, ["add", "--", "modified.txt"]);
    fs.writeFileSync(path.join(root, "modified.txt"), "worktree C\n");
    assert.equal(readRawStatus(root).find((entry) => entry.path === "modified.txt").status, "MM");
    assert.throws(
      () => assertDispositionManifestCurrent({
        repoRoot: root,
        evidenceRoot,
        ownerManifestPath: paths.ownerPath,
        policyPath: paths.policyPath,
        dirtyMapPath: paths.dirtyMapPath,
        maxAgeMinutes: 10
      }),
      /index|not current/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(evidenceParent, { recursive: true, force: true });
  }
});

test("index mutation after the final index snapshot is caught by the mutation epoch", () => {
  const root = fixtureRepo();
  try {
    const paths = preparePublishFixture(root);
    let mutated = false;
    assert.throws(
      () => buildDispositionManifest({
        repoRoot: root,
        ownerManifestPath: paths.ownerPath,
        policyPath: paths.policyPath,
        dirtyMapPath: paths.dirtyMapPath,
        repositoryId: "a".repeat(64),
        evidenceRootId: "00000000-0000-4000-8000-000000000001",
        evidenceRootMarker: {},
        generatedAt: "2026-07-13T00:01:00.000Z",
        afterFinalIndexRead() {
          mutated = true;
          fs.writeFileSync(path.join(root, "modified.txt"), "staged after final index read\n");
          git(root, ["add", "--", "modified.txt"]);
        }
      }),
      /index|mutation monitor|epoch/u
    );
    assert.equal(mutated, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed on status drift and metadata-only drift during inventory hashing", async (t) => {
  await t.test("status drift", () => {
    const root = fixtureRepo();
    try {
      fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
      assert.throws(
        () => buildDispositionRows({
          repoRoot: root,
          ownerManifest: fixtureOwnerManifest(),
          policy: fixtureDispositionPolicy(),
          afterHash(entry) {
            if (entry.path === "modified.txt") {
              fs.writeFileSync(path.join(root, "new-status.txt"), "new\n");
            }
          }
        }),
        /raw dirty status changed/u
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("metadata-only drift", () => {
    const root = fixtureRepo();
    try {
      fs.writeFileSync(path.join(root, "a.txt"), "a before\n");
      fs.writeFileSync(path.join(root, "z.txt"), "z before\n");
      git(root, ["add", "--", "a.txt", "z.txt"]);
      git(root, ["commit", "-qm", "metadata files"]);
      fs.writeFileSync(path.join(root, "a.txt"), "a dirty\n");
      fs.writeFileSync(path.join(root, "z.txt"), "z dirty\n");
      assert.throws(
        () => buildDispositionRows({
          repoRoot: root,
          ownerManifest: fixtureOwnerManifest(),
          policy: fixtureDispositionPolicy(),
          afterHash(entry) {
            if (entry.path === "z.txt") fs.chmodSync(path.join(root, "a.txt"), 0o600);
          }
        }),
        /metadata changed|changed while hashing|revalidation/u
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test("fails closed when a dirty inode changes during hashing", () => {
  const root = fixtureRepo();
  try {
    fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
    const entry = readRawStatus(root).find(({ path: filePath }) => filePath === "modified.txt");
    assert.ok(entry);
    let hookCalled = false;
    assert.throws(
      () => hashDispositionPath(root, entry, {
        afterRead() {
          hookCalled = true;
          const replacement = path.join(root, "replacement.txt");
          fs.writeFileSync(replacement, "replacement\n");
          fs.renameSync(replacement, path.join(root, "modified.txt"));
        }
      }),
      /changed while hashing/u
    );
    assert.equal(hookCalled, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("policy partitions the A22 helper core from its held remainder", () => {
  const policyPath = path.join(
    import.meta.dirname,
    "closure-disposition-policy.json"
  );
  const actualPolicy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  assert.doesNotThrow(() => validateDispositionPolicy(actualPolicy));
  const context = {
    ownerId: "A22",
    sourcePackageId: "A22-release-hygiene-tooling",
    allPaths: new Set(),
    policy: actualPolicy
  };
  assert.deepEqual(
    classifyDisposition({
      ...context,
      path: "scripts/next-clean-build.mjs"
    }),
    {
      packageId: "P1-A22-cleanup-build-helpers",
      wave: "P1",
      finalState: "reviewed commit"
    }
  );
  assert.deepEqual(
    classifyDisposition({
      ...context,
      path: "playwright.config.ts"
    }),
    {
      packageId: "P1-A22-release-hygiene-held",
      wave: "P1",
      finalState: "blocker report"
    }
  );
});

test("preserves all four A22 helper entries in policy and owner package manifest", () => {
  const helperPaths = [
    "scripts/cleanup-generated-artifacts.mjs",
    "scripts/cleanup-generated-artifacts.test.mjs",
    "scripts/next-clean-build.mjs",
    "scripts/next-clean-build.test.mjs"
  ];
  const actualPolicy = JSON.parse(fs.readFileSync(
    path.join(import.meta.dirname, "closure-disposition-policy.json"),
    "utf8"
  ));
  const a22Assignments = actualPolicy.packageAssignments.filter(
    (assignment) => assignment.sourcePackageId === "A22-release-hygiene-tooling"
  );
  assert.equal(a22Assignments.length, 2);
  assert.deepEqual(a22Assignments.find((entry) => entry.includePaths).includePaths, helperPaths);
  assert.deepEqual(a22Assignments.find((entry) => entry.excludePaths).excludePaths, helperPaths);

  const ownerPackages = JSON.parse(fs.readFileSync(
    path.join(import.meta.dirname, "owner-package-manifest.json"),
    "utf8"
  )).packages;
  const a22Package = ownerPackages.find((entry) => entry.id === "foundation-release-hygiene-A22-A10");
  assert.ok(a22Package);
  for (const helperPath of helperPaths) assert.ok(a22Package.pathspecs.includes(helperPath));
  for (const preservedPath of ["package.json", "package-lock.json", "next.config.ts"]) {
    assert.ok(a22Package.pathspecs.includes(preservedPath));
  }
});

test("builds one exact seven-field disposition row for every raw NUL status row", () => {
  const root = fixtureRepo();
  try {
    const unusual = "line\nwith\ttab.txt";
    fs.writeFileSync(path.join(root, unusual), "nul-safe\n");
    fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
    fs.unlinkSync(path.join(root, "deleted.txt"));
    const ownerManifest = {
      version: 1,
      packages: [
        {
          id: "fixture-package",
          owner: "A25",
          role: "fixture",
          slice: "tests",
          pathspecs: ["*.txt"]
        }
      ],
      resolutionChecks: [
        { path: "modified.txt", expectedOwner: "A25" }
      ]
    };
    const fixturePolicy = {
      ...policy,
      packageAssignments: [
        {
          sourcePackageId: "fixture-package",
          packageId: "P8-fixture-package",
          wave: "P8",
          finalState: "reviewed commit"
        }
      ]
    };

    const result = buildDispositionRows({
      repoRoot: root,
      ownerManifest,
      policy: fixturePolicy
    });
    assert.deepEqual(result.coverage, {
      inputRows: 3,
      outputRows: 3,
      uniquePaths: 3,
      duplicatePaths: 0,
      uncovered: 0,
      multiplyAssigned: 0
    });
    assert.deepEqual(
      result.rows.map((row) => row.path),
      ["deleted.txt", unusual, "modified.txt"]
    );
    for (const row of result.rows) {
      assert.deepEqual(
        Object.keys(row).sort(),
        ["finalState", "ownerId", "packageId", "path", "sha256", "status", "wave"]
      );
      assert.equal(row.ownerId, "A25");
      assert.equal(row.packageId, "P8-fixture-package");
      assert.match(row.status, /^(?:\?\?|[ MADRC]{2})$/u);
      assert.match(row.sha256, /^[0-9a-f]{64}$/u);
      assert.equal(row.wave, "P8");
      assert.equal(row.finalState, "reviewed commit");
    }
    assert.match(result.rawStatusSignature, /^[0-9a-f]{64}$/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed on unresolved, duplicate, and multiply assigned inventory ownership", async (t) => {
  await t.test("unresolved owner", () => {
    const root = fixtureRepo();
    try {
      fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
      const ownerManifest = fixtureOwnerManifest(["other/**"]);
      ownerManifest.resolutionChecks = [
        { path: "other/example.txt", expectedOwner: "A25" }
      ];
      assert.throws(
        () => buildDispositionRows({
          repoRoot: root,
          ownerManifest,
          policy: fixtureDispositionPolicy()
        }),
        /must resolve to one owner/u
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("duplicate destination", () => {
    const root = fixtureRepo();
    try {
      git(root, ["rm", "--cached", "--", "modified.txt"]);
      assert.deepEqual(
        readRawStatus(root).map((entry) => entry.path),
        ["modified.txt", "modified.txt"]
      );
      assert.throws(
        () => buildDispositionRows({
          repoRoot: root,
          ownerManifest: fixtureOwnerManifest(),
          policy: fixtureDispositionPolicy()
        }),
        /duplicate destination paths/u
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test("multiply assigned policy", () => {
    const duplicate = structuredClone(policy);
    duplicate.packageAssignments = [
      ...duplicate.packageAssignments,
      structuredClone(duplicate.packageAssignments[0])
    ];
    assert.throws(
      () => validateDispositionPolicy(duplicate),
      /multiply assigned|partition/u
    );
  });
});

test("writes a marker-bound 0600 report and accounts for dirty-map self outputs", () => {
  const root = fixtureRepo();
  const evidenceParent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-evidence-parent-"));
  const evidenceRoot = path.join(evidenceParent, "evidence-archives");
  try {
    const ownerPath = path.join(root, "owner-pathspecs.json");
    const policyPath = path.join(root, "closure-disposition-policy.json");
    const dirtyMapPath = path.join(root, "latest-A25-dirty-tree-map.json");
    const ownerManifest = {
      version: 1,
      packages: [
        {
          id: "fixture-package",
          owner: "A25",
          role: "fixture",
          slice: "tests",
          pathspecs: ["*.txt", "latest-A25-dirty-tree-map.json"]
        }
      ],
      resolutionChecks: [
        { path: "modified.txt", expectedOwner: "A25" }
      ]
    };
    const fixturePolicy = {
      ...policy,
      humanInputPaths: [],
      packageAssignments: [
        {
          sourcePackageId: "fixture-package",
          packageId: "P8-fixture-package",
          wave: "P8",
          finalState: "reviewed commit"
        }
      ]
    };
    fs.writeFileSync(ownerPath, `${JSON.stringify(ownerManifest, null, 2)}\n`);
    fs.writeFileSync(policyPath, `${JSON.stringify(fixturePolicy, null, 2)}\n`);
    git(root, ["add", "--", "owner-pathspecs.json", "closure-disposition-policy.json"]);
    git(root, ["commit", "-qm", "fixture policy"]);

    fs.writeFileSync(path.join(root, "modified.txt"), "after\n");
    const dirtyMap = {
      generatedAt: "2026-07-13T00:00:00.000Z",
      statusSignature: "a".repeat(64),
      outputPaths: {
        latestJson: "latest-A25-dirty-tree-map.json"
      },
      entries: [
        { status: " M", path: "modified.txt" }
      ]
    };
    fs.writeFileSync(dirtyMapPath, `${JSON.stringify(dirtyMap, null, 2)}\n`);

    const reportPath = writeDispositionReport({
      repoRoot: root,
      evidenceRoot,
      ownerManifestPath: ownerPath,
      policyPath,
      dirtyMapPath,
      generatedAt: "2026-07-13T00:01:00.000Z"
    });
    const stat = fs.lstatSync(reportPath);
    assert.equal(stat.isFile(), true);
    assert.equal(stat.mode & 0o777, 0o600);
    assert.equal(fs.lstatSync(evidenceRoot).mode & 0o777, 0o700);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.coverage.inputRows, 2);
    assert.equal(report.coverage.outputRows, 2);
    assert.deepEqual(report.dirtyMap.excludedOutputPaths, [
      "latest-A25-dirty-tree-map.json"
    ]);
    assert.deepEqual(report.rows.map((row) => row.path), [
      "latest-A25-dirty-tree-map.json",
      "modified.txt"
    ]);
    assert.match(report.dispositionFingerprint, /^[0-9a-f]{64}$/u);
    assert.doesNotThrow(() => assertDispositionManifestCurrent({
      repoRoot: root,
      evidenceRoot,
      ownerManifestPath: ownerPath,
      policyPath,
      dirtyMapPath,
      clock: () => new Date("2026-07-13T00:02:00.000Z"),
      maxAgeMinutes: 10
    }));
    fs.writeFileSync(path.join(root, "modified.txt"), "same status, new bytes\n");
    assert.throws(
      () => assertDispositionManifestCurrent({
        repoRoot: root,
        evidenceRoot,
        ownerManifestPath: ownerPath,
        policyPath,
        dirtyMapPath,
        clock: () => new Date("2026-07-13T00:02:00.000Z"),
        maxAgeMinutes: 10
      }),
      /disposition manifest is not current/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(evidenceParent, { recursive: true, force: true });
  }
});

test("rejects authoritative JSON inputs reached through an ancestor symlink before parsing targets", async (t) => {
  const root = fixtureRepo();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-authoritative-outside-"));
  try {
    const paths = preparePublishFixture(root);
    for (const name of ["owner.json", "policy.json", "dirty-map.json"]) {
      fs.writeFileSync(path.join(outside, name), "TARGET_MUST_NOT_BE_PARSED\n");
    }
    fs.symlinkSync(outside, path.join(root, "inputs"));
    git(root, ["add", "--", "inputs"]);
    git(root, ["commit", "-qm", "tracked clean input symlink"]);
    const common = {
      repoRoot: root,
      ownerManifestPath: paths.ownerPath,
      policyPath: paths.policyPath,
      dirtyMapPath: paths.dirtyMapPath,
      repositoryId: "a".repeat(64),
      evidenceRootId: "00000000-0000-4000-8000-000000000001",
      evidenceRootMarker: {
        sha256: "a".repeat(64),
        dev: "1",
        ino: "1",
        mode: "33152",
        nlink: "1",
        size: "1",
        mtimeNs: "1",
        ctimeNs: "1"
      },
      generatedAt: "2026-07-13T00:01:00.000Z"
    };
    const cases = [
      ["owner", { ownerManifestPath: path.join(root, "inputs", "owner.json") }],
      ["policy", { policyPath: path.join(root, "inputs", "policy.json") }],
      ["dirty-map", { dirtyMapPath: path.join(root, "inputs", "dirty-map.json") }]
    ];
    for (const [name, override] of cases) {
      await t.test(name, () => {
        assert.throws(
          () => buildDispositionManifest({ ...common, ...override }),
          /authoritative input ancestor.*symlink|unsafe.*ancestor symlink/u
        );
      });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("continues to reject non-regular and multiply-linked authoritative JSON leaves", async (t) => {
  const root = fixtureRepo();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-authoritative-leaf-"));
  try {
    const paths = preparePublishFixture(root);
    fs.writeFileSync(path.join(outside, "outside.json"), "{}\n");
    fs.symlinkSync(path.join(outside, "outside.json"), path.join(root, "leaf-link.json"));
    fs.mkdirSync(path.join(root, "leaf-directory.json"));
    execFileSync("mkfifo", [path.join(root, "leaf-fifo.json")]);
    fs.writeFileSync(path.join(root, "leaf-hard-source.json"), "{}\n");
    fs.linkSync(path.join(root, "leaf-hard-source.json"), path.join(root, "leaf-hardlink.json"));
    const common = {
      repoRoot: root,
      policyPath: paths.policyPath,
      dirtyMapPath: paths.dirtyMapPath,
      repositoryId: "a".repeat(64),
      evidenceRootId: "00000000-0000-4000-8000-000000000001",
      evidenceRootMarker: {},
      generatedAt: "2026-07-13T00:01:00.000Z"
    };
    for (const name of [
      "leaf-link.json",
      "leaf-directory.json",
      "leaf-fifo.json",
      "leaf-hardlink.json"
    ]) {
      await t.test(name, () => {
        assert.throws(
          () => buildDispositionManifest({
            ...common,
            ownerManifestPath: path.join(root, name)
          }),
          /direct regular file with one link/u
        );
      });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("rejects duplicate object keys in each authoritative JSON input", async (t) => {
  const cases = [
    ["owner", "ownerPath", /^  "version": 1,$/mu],
    ["policy", "policyPath", /^  "version": 1,$/mu],
    ["dirty-map", "dirtyMapPath", /^  "statusSignature": .*,$/mu]
  ];
  for (const [name, pathKey, linePattern] of cases) {
    await t.test(name, () => {
      const root = fixtureRepo();
      try {
        const paths = preparePublishFixture(root);
        const targetPath = paths[pathKey];
        const original = fs.readFileSync(targetPath, "utf8");
        const match = original.match(linePattern);
        assert.ok(match);
        fs.writeFileSync(targetPath, original.replace(linePattern, `${match[0]}\n${match[0]}`));
        if (pathKey !== "dirtyMapPath") {
          git(root, ["add", "--", path.relative(root, targetPath)]);
          git(root, ["commit", "--amend", "--no-edit", "-q"]);
        }
        assert.throws(
          () => buildDispositionManifest({
            repoRoot: root,
            ownerManifestPath: paths.ownerPath,
            policyPath: paths.policyPath,
            dirtyMapPath: paths.dirtyMapPath,
            repositoryId: "a".repeat(64),
            evidenceRootId: "00000000-0000-4000-8000-000000000001",
            evidenceRootMarker: {},
            generatedAt: "2026-07-13T00:01:00.000Z"
          }),
          /duplicate JSON object key/u
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

test("records exact bytes hashes for all authoritative inputs and rejects equivalent-byte rewrites", () => {
  const fixture = publishedFixture();
  try {
    const report = JSON.parse(fs.readFileSync(fixture.reportPath, "utf8"));
    assert.match(report.ownerPathspecs.sha256, /^[0-9a-f]{64}$/u);
    assert.match(report.policy.sha256, /^[0-9a-f]{64}$/u);
    assert.match(report.dirtyMap.sha256, /^[0-9a-f]{64}$/u);
    const dirtyMap = JSON.parse(fs.readFileSync(fixture.dirtyMapPath, "utf8"));
    fs.writeFileSync(fixture.dirtyMapPath, `${JSON.stringify(dirtyMap)}\n`);
    assert.throws(() => fixture.assertCurrent(), /not current|authoritative/u);
  } finally {
    fixture.cleanup();
  }
});

test("rejects an evidence root inside any linked sibling worktree", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-worktrees-"));
  const root = path.join(parent, "main");
  const sibling = path.join(parent, "sibling");
  fs.mkdirSync(root);
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "MAIS Test"]);
    git(root, ["config", "user.email", "mais-test@example.invalid"]);
    fs.writeFileSync(path.join(root, "modified.txt"), "before\n");
    fs.writeFileSync(path.join(root, "deleted.txt"), "delete me\n");
    git(root, ["add", "--", "modified.txt", "deleted.txt"]);
    git(root, ["commit", "-qm", "fixture"]);
    const paths = preparePublishFixture(root);
    git(root, ["worktree", "add", "-q", "-b", "fixture-sibling", sibling]);
    for (const forbiddenRoot of [
      root,
      path.join(root, "nested-evidence"),
      path.join(root, ".git"),
      path.join(root, ".git", "nested-evidence"),
      sibling,
      path.join(sibling, "nested-evidence")
    ]) {
      assert.throws(
        () => resolveDispositionEvidenceRoot({
          repoRoot: root,
          evidenceRoot: forbiddenRoot
        }),
        /outside the repository, linked worktrees/u
      );
    }
    assert.throws(
      () => writeDispositionReport({
        repoRoot: root,
        evidenceRoot: path.join(sibling, "evidence-archives"),
        ownerManifestPath: paths.ownerPath,
        policyPath: paths.policyPath,
        dirtyMapPath: paths.dirtyMapPath,
        generatedAt: "2026-07-13T00:01:00.000Z"
      }),
      /outside the repository, linked worktrees/u
    );
    assert.equal(fs.existsSync(path.join(sibling, "evidence-archives")), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("rejects an evidence root inside a registered but missing linked worktree", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-missing-worktree-"));
  const root = path.join(parent, "main");
  const sibling = path.join(parent, "missing-sibling");
  fs.mkdirSync(root);
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "MAIS Test"]);
    git(root, ["config", "user.email", "mais-test@example.invalid"]);
    fs.writeFileSync(path.join(root, "tracked.txt"), "tracked\n");
    git(root, ["add", "--", "tracked.txt"]);
    git(root, ["commit", "-qm", "fixture"]);
    git(root, ["worktree", "add", "-q", "-b", "fixture-missing", sibling]);
    fs.rmSync(sibling, { recursive: true, force: true });
    const registeredSibling = path.join(fs.realpathSync(parent), path.basename(sibling));
    assert.match(git(root, ["worktree", "list", "--porcelain"]), new RegExp(
      `^worktree ${registeredSibling.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`,
      "mu"
    ));
    assert.throws(
      () => resolveDispositionEvidenceRoot({
        repoRoot: root,
        evidenceRoot: path.join(sibling, "evidence-archives")
      }),
      /outside the repository, linked worktrees|registered.*worktree/u
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("binds currentness to the exact marker file identity, not only parsed values", () => {
  const root = fixtureRepo();
  const evidenceParent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-marker-parent-"));
  const evidenceRoot = path.join(evidenceParent, "evidence-archives");
  try {
    const paths = preparePublishFixture(root);
    writeDispositionReport({
      repoRoot: root,
      evidenceRoot,
      ownerManifestPath: paths.ownerPath,
      policyPath: paths.policyPath,
      dirtyMapPath: paths.dirtyMapPath,
      generatedAt: "2026-07-13T00:01:00.000Z"
    });
    const markerPath = path.join(evidenceRoot, ".mais-evidence-root.json");
    const sameBytes = fs.readFileSync(markerPath);
    fs.writeFileSync(markerPath, sameBytes, { mode: 0o600 });
    assert.throws(
      () => assertDispositionManifestCurrent({
        repoRoot: root,
        evidenceRoot,
        ownerManifestPath: paths.ownerPath,
        policyPath: paths.policyPath,
        dirtyMapPath: paths.dirtyMapPath,
        clock: () => new Date("2026-07-13T00:02:00.000Z"),
        maxAgeMinutes: 10
      }),
      /marker|not current/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(evidenceParent, { recursive: true, force: true });
  }
});

test("rejects marker schema extras and repository identity changes", async (t) => {
  for (const [name, mutate] of [
    ["marker extra key", (marker) => { marker.extra = true; }],
    ["marker repository identity", (marker) => { marker.repositoryId = "b".repeat(64); }]
  ]) {
    await t.test(name, () => {
      const fixture = publishedFixture();
      try {
        const markerPath = path.join(fixture.evidenceRoot, ".mais-evidence-root.json");
        const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
        mutate(marker);
        fs.writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o600 });
        assert.throws(() => fixture.assertCurrent(), /marker|not current|repository/u);
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test("rejects every report schema, disposition, count, fingerprint, and age tamper", async (t) => {
  const fixture = publishedFixture();
  try {
    const original = JSON.parse(fs.readFileSync(fixture.reportPath, "utf8"));
    assert.ok(original.rows.length >= 2);
    const cases = [
      ["repository identity", (value) => { value.repositoryId = "b".repeat(64); }],
      ["extra key", (value) => { value.extra = true; }],
      ["row status", (value) => {
        value.rows[0].status = value.rows[0].status === "??" ? " M" : "??";
      }],
      ["row owner", (value) => { value.rows[0].ownerId = "A00"; }],
      ["policy hash", (value) => { value.policy.sha256 = "b".repeat(64); }],
      ["row package", (value) => { value.rows[0].packageId = "P8-tampered"; }],
      ["missing row", (value) => { value.rows.pop(); }],
      ["duplicate row", (value) => { value.rows.push(structuredClone(value.rows[0])); }],
      ["unsorted rows", (value) => { value.rows.reverse(); }],
      ["coverage count", (value) => { value.coverage.inputRows += 1; }],
      ["fingerprint", (value) => { value.dispositionFingerprint = "b".repeat(64); }]
    ];
    for (const [name, mutate] of cases) {
      await t.test(name, () => {
        const candidate = structuredClone(original);
        mutate(candidate);
        fs.writeFileSync(fixture.reportPath, `${JSON.stringify(candidate, null, 2)}\n`, { mode: 0o600 });
        assert.throws(() => fixture.assertCurrent(), /not current/u);
      });
    }
    await t.test("duplicate JSON field", () => {
      const canonical = `${JSON.stringify(original, null, 2)}\n`;
      const duplicate = canonical.replace(
        '  "schemaVersion": 1,',
        '  "schemaVersion": 1,\n  "schemaVersion": 1,'
      );
      fs.writeFileSync(fixture.reportPath, duplicate, { mode: 0o600 });
      assert.throws(() => fixture.assertCurrent(), /not current|canonical|duplicate/u);
    });
    fs.writeFileSync(fixture.reportPath, `${JSON.stringify(original, null, 2)}\n`, { mode: 0o600 });
    await t.test("stale age", () => {
      assert.throws(
        () => fixture.assertCurrent({ clock: () => new Date("2026-07-13T00:12:00.001Z") }),
        /age is invalid or stale|not current/u
      );
    });
  } finally {
    fixture.cleanup();
  }
});

test("binds generatedAt into the disposition fingerprint and supports only internal clock injection", async (t) => {
  await t.test("internal clock", () => {
    const fixture = publishedFixture();
    try {
      assert.doesNotThrow(() => assertDispositionManifestCurrent({
        repoRoot: fixture.root,
        evidenceRoot: fixture.evidenceRoot,
        ownerManifestPath: fixture.ownerPath,
        policyPath: fixture.policyPath,
        dirtyMapPath: fixture.dirtyMapPath,
        clock: () => new Date("2026-07-13T00:02:00.000Z"),
        maxAgeMinutes: 10
      }));
    } finally {
      fixture.cleanup();
    }
  });

  await t.test("fresh generatedAt tamper", () => {
    const fixture = publishedFixture();
    try {
      const report = JSON.parse(fs.readFileSync(fixture.reportPath, "utf8"));
      report.generatedAt = "2026-07-13T00:01:30.000Z";
      fs.writeFileSync(fixture.reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
      assert.throws(() => fixture.assertCurrent(), /fingerprint|not current/u);
    } finally {
      fixture.cleanup();
    }
  });
});

test("generator and assertion expose executable CLI contracts", () => {
  const generatorScript = path.join(
    import.meta.dirname,
    "generate-closure-disposition-manifest.mjs"
  );
  const assertionScript = path.join(
    import.meta.dirname,
    "assert-closure-disposition-manifest-current.mjs"
  );
  const generatorHelp = execFileSync(
    process.execPath,
    [generatorScript, "--help"],
    { encoding: "utf8" }
  );
  const assertionHelp = execFileSync(
    process.execPath,
    [assertionScript, "--help"],
    { encoding: "utf8" }
  );
  assert.match(generatorHelp, /--evidence-root/u);
  assert.match(generatorHelp, /--dirty-map/u);
  assert.doesNotMatch(assertionHelp, /--emit-paths0/u);
  assert.doesNotMatch(assertionHelp, /--assert-index-exact/u);
  assert.throws(
    () => execFileSync(
      process.execPath,
      [assertionScript, "--emit-paths0"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ),
    /unknown assertion argument/u
  );

  for (const [script, option] of [
    ...[
      "--repo-root",
      "--evidence-root",
      "--owner-manifest",
      "--policy",
      "--dirty-map",
      "--generated-at"
    ].map((option) => [generatorScript, option]),
    ...[
      "--repo-root",
      "--evidence-root",
      "--owner-manifest",
      "--policy",
      "--dirty-map",
      "--max-age-minutes"
    ].map((option) => [assertionScript, option])
  ]) {
    const result = spawnSync(process.execPath, [script, "--help", option], {
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${option} without a value must fail`);
    assert.match(result.stderr, /requires a value/u);
  }

  const nowResult = spawnSync(
    process.execPath,
    [assertionScript, "--now", "2026-07-13T00:02:00.000Z", "--help"],
    { encoding: "utf8" }
  );
  assert.notEqual(nowResult.status, 0);
  assert.match(nowResult.stderr, /unknown assertion argument/u);
});

test("real generator and assertion CLIs only write a marker-bound external report", () => {
  const root = fixtureRepo();
  const evidenceParent = fs.mkdtempSync(path.join(os.tmpdir(), "mais-closure-cli-parent-"));
  const evidenceRoot = path.join(evidenceParent, "evidence-archives");
  try {
    const paths = preparePublishFixture(root);
    const statusBefore = execFileSync(
      "git",
      ["status", "--porcelain=v1", "-z", "-uall"],
      { cwd: root, encoding: null }
    );
    const indexPath = path.join(root, ".git", "index");
    const indexBefore = crypto.createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");
    const headBefore = git(root, ["rev-parse", "HEAD"]).trim();
    const generatedAt = new Date().toISOString();
    const generatorOutput = execFileSync(
      process.execPath,
      [
        path.join(import.meta.dirname, "generate-closure-disposition-manifest.mjs"),
        "--repo-root", root,
        "--evidence-root", evidenceRoot,
        "--owner-manifest", paths.ownerPath,
        "--policy", paths.policyPath,
        "--dirty-map", paths.dirtyMapPath,
        "--generated-at", generatedAt
      ],
      { encoding: "utf8" }
    );
    const generated = JSON.parse(generatorOutput);
    assert.equal(
      generated.reportPath,
      path.join(fs.realpathSync(evidenceRoot), "reports", "mais-closure-disposition-v1.json")
    );
    assert.deepEqual(fs.readdirSync(evidenceRoot).sort(), [
      ".mais-evidence-root.json",
      "reports"
    ]);
    const reportEntries = fs.readdirSync(path.join(evidenceRoot, "reports"));
    assert.deepEqual(
      reportEntries.filter((name) => !name.startsWith(".evidence-report-owner-")),
      ["mais-closure-disposition-v1.json"]
    );

    const assertionOutput = execFileSync(
      process.execPath,
      [
        path.join(import.meta.dirname, "assert-closure-disposition-manifest-current.mjs"),
        "--repo-root", root,
        "--evidence-root", evidenceRoot,
        "--owner-manifest", paths.ownerPath,
        "--policy", paths.policyPath,
        "--dirty-map", paths.dirtyMapPath,
        "--max-age-minutes", "10"
      ],
      { encoding: "utf8" }
    );
    assert.equal(JSON.parse(assertionOutput).rows, 2);
    assert.deepEqual(
      execFileSync("git", ["status", "--porcelain=v1", "-z", "-uall"], { cwd: root, encoding: null }),
      statusBefore
    );
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex"),
      indexBefore
    );
    assert.equal(git(root, ["rev-parse", "HEAD"]).trim(), headBefore);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(evidenceParent, { recursive: true, force: true });
  }
});
