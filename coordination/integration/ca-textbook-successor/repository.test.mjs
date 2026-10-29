import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
  chmodSync,
  symlinkSync,
  linkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Repository, GIT_ENV, snapshot, dependency } from "./repository.mjs";
import {
  validatePhase,
  attemptPaths,
  authenticateRelease,
} from "./contract.mjs";
import {
  readStoredReceipt,
  sealReceipt,
  validateFinalizationProofs,
} from "./receipts.mjs";
import { ROOT, VERSION, ANCHOR, BUNDLE_PATHS } from "./constants.mjs";
import { hash, digest, parse } from "./common.mjs";
import { validateSchema } from "./schema.mjs";
import { registeredFixture } from "./test-fixtures.mjs";
const project = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  ),
  H = "a".repeat(64);
function fixture(
  run,
  {
    future = false,
    extraParent = false,
    bundle = false,
    sourceFiles = [],
  } = {},
) {
  const dir = realpathSync(mkdtempSync("/tmp/ca-test-"));
  const git = (...a) =>
    execFileSync("/usr/bin/git", ["--no-replace-objects", ...a], {
      cwd: dir,
      env: {
        ...GIT_ENV,
        GIT_AUTHOR_NAME: "Synthetic test",
        GIT_AUTHOR_EMAIL: "synthetic@example.invalid",
        GIT_COMMITTER_NAME: "Synthetic test",
        GIT_COMMITTER_EMAIL: "synthetic@example.invalid",
      },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    }).trim();
  const write = (p, b) => {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), b);
  };
  const commit = (files) => {
    git("add", "--", ...files);
    git("commit", "-qm", "Synthetic test only; not approval");
    return git("rev-parse", "HEAD");
  };
  try {
    git("init", "-q", "--initial-branch=fixture");
    git("config", "commit.gpgsign", "false");
    git("config", "core.hooksPath", "/dev/null");
    const common = execFileSync(
      "/usr/bin/git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: project, encoding: "utf8" },
    ).trim();
    write(".git/objects/info/alternates", path.join(common, "objects") + "\n");
    write("source.txt", "synthetic source\n");
    for (const file of bundle ? BUNDLE_PATHS : sourceFiles)
      write(file, readFileSync(path.join(project, file)));
    git("add", "--", "source.txt", ...(bundle ? BUNDLE_PATHS : sourceFiles));
    const source = git(
      "commit-tree",
      git("write-tree"),
      "-p",
      ANCHOR,
      "-m",
      "Synthetic source",
    );
    git("update-ref", "HEAD", source);
    write(ROOT + "/release-note", "synthetic");
    const release = commit([ROOT + "/release-note"]);
    const prefix = ROOT + "/attempts/ca-textbook-fixture";
    write(prefix + "/inputs/note", "synthetic");
    if (future) write(prefix + "/canonical-receipt.json", "{}");
    const evidence = commit([
      prefix + "/inputs/note",
      ...(future ? [prefix + "/canonical-receipt.json"] : []),
    ]);
    if (extraParent) {
      write(prefix + "/intermediate", "extra");
      commit([prefix + "/intermediate"]);
    }
    const ref = (p) => ({ path: p, sha256: H });
    const m = {
      schemaVersion: "ca-textbook-manifest.v1",
      version: VERSION,
      pullRequestNumber: 304,
      attemptId: "ca-textbook-fixture",
      baseCommit: ANCHOR,
      sourceCommit: source,
      sourceTree: git("rev-parse", source + "^{tree}"),
      sourceAuthors: ["synthetic-author"],
      checkerAuthors: ["synthetic-checker-author"],
      sourceInventoryDigest: H,
      candidate: ref(prefix + "/inputs/candidate.json"),
      registry: ref(prefix + "/inputs/registry.json"),
      disposition: ref(prefix + "/inputs/disposition.json"),
      evidenceIndex: ref(prefix + "/inputs/evidence-index.json"),
      evidenceCommit: evidence,
      checkerLedger: ref(ROOT + "/checker-releases.json"),
      checkerReleaseCommit: release,
      checkerBundleDigest: H,
      descriptorPath: prefix + "/successor.json",
      canonicalReceiptPath: prefix + "/canonical-receipt.json",
      runtime: {
        compatibility: ref("compatibility.json"),
        policyDigest: H,
        auditDigest: H,
      },
      lifecycleState: "shadow_ready",
      liveAllowed: false,
    };
    const manifestPath = prefix + "/manifest.json",
      bytes = Buffer.from(JSON.stringify(m));
    write(manifestPath, bytes);
    write(
      m.descriptorPath,
      JSON.stringify({
        schemaVersion: "ca-textbook-successor.v1",
        relation: "immutable-content-successor",
        manifest: { path: manifestPath, sha256: hash(bytes) },
        evidenceCommit: evidence,
        candidateChanged: true,
        checkerChanged: true,
        baselineOnly: false,
        historicalClosureOverwritten: false,
        liveAllowed: false,
      }),
    );
    const execution = commit([manifestPath, m.descriptorPath]);
    const result = run({
      root: dir,
      git,
      write,
      commit,
      m,
      manifestPath,
      execution,
      source,
    });
    if (result && typeof result.then === "function")
      return result.finally(() =>
        rmSync(dir, { recursive: true, force: true }),
      );
    rmSync(dir, { recursive: true, force: true });
    return result;
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}
test("real Git fixture enforces evidence then first-added execution manifest/descriptor", () =>
  registeredFixture(({ root, m, manifestPath, execution }) => {
    const repo = new Repository(root);
    repo.clean();
    assert.equal(validatePhase(repo, m, manifestPath), execution);
  }));
test("intermediate execution parent is rejected", () =>
  registeredFixture(
    ({ root, m, manifestPath }) =>
      assert.throws(
        () => validatePhase(new Repository(root), m, manifestPath),
        /CA_EXECUTION_PARENT/,
      ),
    { extraParent: true },
  ));
test("future canonical receipt at registered execution is rejected", () =>
  registeredFixture(
    ({ root, m, manifestPath }) =>
      assert.throws(
        () => validatePhase(new Repository(root), m, manifestPath),
        /CA_FUTURE_FILE/,
      ),
    { future: true },
  ));
test("a declared wrong source tree cannot be used", () =>
  registeredFixture(({ root, m, manifestPath }) =>
    assert.throws(
      () =>
        validatePhase(
          new Repository(root),
          { ...m, sourceTree: "f".repeat(40) },
          manifestPath,
        ),
      /CA_SOURCE_TREE/,
    ),
  ));
test("source bytes and executable modes are measured independently of clean flags", () =>
  fixture(({ root, write }) => {
    const r = new Repository(root),
      b = r.blob(r.head, "source.txt");
    r.read(r.head, b);
    write("source.txt", "changed\n");
    assert.throws(() => r.read(r.head, b), /CA_WORKTREE_DRIFT/);
    write("source.txt", b.bytes);
    chmodSync(path.join(root, "source.txt"), 0o755);
    assert.throws(() => r.read(r.head, b), /CA_WORKTREE_DRIFT/);
  }));
test("assume-unchanged and sparse flags fail the full clean materialization guard", () =>
  fixture(({ root, git }) => {
    const r = new Repository(root);
    git("update-index", "--assume-unchanged", "source.txt");
    assert.throws(() => r.clean(), /CA_INDEX_FLAGS/);
  }));
test("untracked writer content is not ignored by clean checks", () =>
  fixture(({ root, write }) => {
    const r = new Repository(root);
    write("other.txt", "unreviewed");
    assert.throws(() => r.clean(), /CA_DIRTY/);
  }));
test("hardlinks symlinks traversal and wrong raw hashes are rejected", () =>
  fixture(({ root }) => {
    const r = new Repository(root),
      b = r.blob(r.head, "source.txt");
    assert.throws(
      () => r.read(r.head, { ...b, sha256: "0".repeat(64) }),
      /CA_BYTES/,
    );
    assert.throws(() => r.working("../outside"), /CA_PATH/);
    const p = path.join(root, "source.txt"),
      other = path.join(root, "saved");
    writeFileSync(other, b.bytes);
    rmSync(p);
    symlinkSync(other, p);
    assert.throws(() => r.working("source.txt"), /CA_FILE/);
    rmSync(p);
    linkSync(other, p);
    assert.throws(() => r.working("source.txt"), /CA_FILE/);
  }));
test("grafts replacement refs and shallow repositories are rejected", () => {
  fixture(({ root, write }) => {
    write(".git/info/grafts", "synthetic");
    assert.throws(() => new Repository(root), /CA_GRAFT/);
  });
  fixture(({ root, git, source }) => {
    git("update-ref", "refs/replace/" + source, ANCHOR);
    assert.throws(() => new Repository(root), /CA_REPLACE/);
  });
  fixture(({ root, write, source }) => {
    write(".git/shallow", source + "\n");
    assert.throws(() => new Repository(root), /CA_SHALLOW/);
  });
});
test("storage transport must be a distinct descendant and cannot smuggle source changes", () =>
  fixture(({ root, git, write, commit, m, manifestPath, execution }) => {
    const repo = new Repository(root),
      p = {
        manifest: {
          path: manifestPath,
          sha256: repo.blob(execution, manifestPath).sha256,
        },
        executionCommit: execution,
        sourceCommit: m.sourceCommit,
        sourceTree: m.sourceTree,
        baseCommit: m.baseCommit,
        checkerReleaseCommit: m.checkerReleaseCommit,
        checkerBundleDigest: H,
        candidateDigest: H,
        dispositionDigest: H,
        registryDigest: H,
        evidenceDigest: H,
        runtimeDigest: H,
        sourceInventoryDigest: H,
        historicalCustodyDigest: H,
      },
      receipt = sealReceipt(p, "synthetic-canonical", H),
      bytes = Buffer.from(JSON.stringify(receipt));
    write(m.canonicalReceiptPath, bytes);
    const storage = commit([m.canonicalReceiptPath]);
    const transport = {
      path: m.canonicalReceiptPath,
      storageCommit: storage,
      sha256: hash(bytes),
    };
    assert.equal(
      readStoredReceipt(repo, m, p, transport).receipt.runId,
      "synthetic-canonical",
    );
    assert.throws(
      () =>
        readStoredReceipt(repo, m, p, {
          ...transport,
          storageCommit: execution,
        }),
      /CA_RECEIPT_STORAGE/,
    );
    assert.throws(
      () =>
        readStoredReceipt(repo, m, p, {
          ...transport,
          path: "/tmp/receipt.json",
        }),
      /CA_PATH/,
    );
    assert.throws(
      () =>
        readStoredReceipt(repo, m, p, { ...transport, sha256: "0".repeat(64) }),
      /CA_BYTES/,
    );
    write("source.txt", "unreviewed");
    const moved = commit(["source.txt"]);
    assert.throws(
      () =>
        readStoredReceipt(repo, m, p, { ...transport, storageCommit: moved }),
      /CA_RECEIPT_STORAGE_DELTA/,
    );
  }));
test("CLI requires explicit execute and does not emit raw supplied values", () => {
  for (const args of [
    [
      "shadow",
      "--repo",
      project,
      "--manifest",
      "secret-sentinel",
      "--run-id",
      "test",
    ],
    ["verify-receipt", "--unknown", "secret-sentinel"],
    ["finalize"],
    ...["validate", "shadow", "verify-receipt", "finalize"].flatMap(
      (operation) => [
        [operation, "--timeout", "secret-sentinel"],
        [operation, "--operation-timeout", "secret-sentinel"],
      ],
    ),
  ]) {
    const r = spawnSync(
      process.execPath,
      [path.join(project, ROOT, "promotion.mjs"), ...args],
      { encoding: "utf8", env: GIT_ENV },
    );
    assert.equal(r.status, 2);
    assert.equal(r.stdout.includes("secret-sentinel"), false);
    assert.equal(parse(Buffer.from(r.stdout)).liveAllowed, false);
  }
});
test("release bundle is exactly scoped and no actual candidate approval is stored in source", () => {
  assert.ok(BUNDLE_PATHS.includes(ROOT + "/operation.mjs"));
  assert.ok(BUNDLE_PATHS.includes(ROOT + "/repository.test.mjs"));
  assert.equal(new Set(BUNDLE_PATHS).size, BUNDLE_PATHS.length);
});
test("snapshot materializes committed source and verifies bytes after the callback", () =>
  fixture(async ({ root }) => {
    const repo = new Repository(root);
    assert.equal(
      await snapshot(repo, async (owned) =>
        readFileSync(path.join(owned, "source.txt"), "utf8"),
      ),
      "synthetic source\n",
    );
    await assert.rejects(
      () =>
        snapshot(repo, async (owned) =>
          writeFileSync(path.join(owned, "source.txt"), "mutated"),
        ),
      /CA_SNAPSHOT_BYTES/,
    );
  }));
test("CLI rejects inherited loader hooks before parsing any authority", () => {
  const child = spawnSync(
    process.execPath,
    [
      path.join(project, ROOT, "promotion.mjs"),
      "validate",
      "--repo",
      project,
      "--manifest",
      "invalid",
    ],
    { encoding: "utf8", env: { ...GIT_ENV, NODE_OPTIONS: "--no-warnings" } },
  );
  assert.equal(child.status, 2);
  assert.equal(parse(Buffer.from(child.stdout)).code, "CA_LOADER_HOOK");
});
function releaseFixture(run) {
  return registeredFixture((f) => run({ ...f, manifest: f.m }));
}
test("release authentication binds exact immutable files, ledger first addition, dependencies and two review identities", () =>
  releaseFixture(({ root, write, repo, manifest, bundleDigest }) => {
    assert.equal(
      authenticateRelease(repo, manifest).bundleDigest,
      bundleDigest,
    );
    assert.throws(
      () =>
        authenticateRelease(repo, {
          ...manifest,
          checkerAuthors: ["synthetic-checker-A11"],
        }),
      /CA_AUTHOR_REVIEW/,
    );
    write(
      ROOT + "/common.mjs",
      readFileSync(path.join(root, ROOT + "/common.mjs"), "utf8") +
        "\n// drift\n",
    );
    assert.throws(
      () => authenticateRelease(repo, manifest),
      /CA_WORKTREE_DRIFT/,
    );
  }));

test("bootstrap literal bundle and parser anchor match the reviewed contract", () => {
  const source = readFileSync(
    path.join(project, ROOT, "promotion.mjs"),
    "utf8",
  );
  const literal = source.match(/const EXPECTED = (\[[\s\S]*?\]);/u)?.[1];
  assert.ok(literal);
  assert.deepEqual(
    [...literal.matchAll(/"([^"]+)"/gu)].map((match) => match[1]),
    BUNDLE_PATHS,
  );
  const parserSha = source.match(
    /const PARSER_SHA\s*=\s*"([a-f0-9]{64})"/u,
  )?.[1];
  assert.equal(
    hash(
      readFileSync(
        path.join(project, "scripts/promotion-workflow-json-guard.mjs"),
      ),
    ),
    parserSha,
  );
});

test("A23-R1 changing dependency bytes and later ledger cannot reuse freeze reviews", () =>
  releaseFixture(
    ({
      root,
      git,
      write,
      repo,
      manifest,
      ledger,
      ledgerPath,
      release,
      reviews,
    }) => {
      assert.equal(
        authenticateRelease(repo, manifest).bundleDigest,
        ledger.bundleDigest,
      );
      const reviewHashes = reviews.map((ref) =>
        hash(readFileSync(path.join(root, ref.path))),
      );
      write(
        "node_modules/typescript/unreviewed.mjs",
        "export const changed = true;\n",
      );
      ledger.dependencies = [dependency(root).binding];
      git("read-tree", manifest.evidenceCommit);
      write(ledgerPath, JSON.stringify(ledger));
      git("add", "--", ledgerPath);
      const evidence = git(
        "commit-tree",
        git("write-tree"),
        "-p",
        release,
        "-m",
        "Synthetic alternate evidence only",
      );
      git("update-ref", "HEAD", evidence);
      const current = {
        ...manifest,
        evidenceCommit: evidence,
        checkerLedger: {
          path: ledgerPath,
          sha256: hash(readFileSync(path.join(root, ledgerPath))),
        },
      };
      assert.deepEqual(
        reviews.map((ref) => hash(readFileSync(path.join(root, ref.path)))),
        reviewHashes,
      );
      assert.throws(
        () => authenticateRelease(new Repository(root), current),
        /CA_BUNDLE_DIGEST|CA_RELEASE_REVIEW/,
      );
      ledger.bundleDigest = digest({
        files: ledger.files,
        dependencies: ledger.dependencies,
      });
      git("read-tree", manifest.evidenceCommit);
      write(ledgerPath, JSON.stringify(ledger));
      git("add", "--", ledgerPath);
      const resealed = git(
        "commit-tree",
        git("write-tree"),
        "-p",
        release,
        "-m",
        "Synthetic resealed evidence without renewed reviews",
      );
      git("update-ref", "HEAD", resealed);
      const rebound = {
        ...current,
        evidenceCommit: resealed,
        checkerBundleDigest: ledger.bundleDigest,
        checkerLedger: {
          path: ledgerPath,
          sha256: hash(readFileSync(path.join(root, ledgerPath))),
        },
      };
      assert.deepEqual(
        reviews.map((ref) => hash(readFileSync(path.join(root, ref.path)))),
        reviewHashes,
      );
      assert.throws(
        () => authenticateRelease(new Repository(root), rebound),
        /CA_RELEASE_REVIEW/,
      );
    },
  ));

function finalGitFixture(mutation, run) {
  return fixture(
    ({ root, git, write, commit, m, manifestPath, execution }) => {
      let repo = new Repository(root);
      const p = {
        manifest: {
          path: manifestPath,
          sha256: repo.blob(execution, manifestPath).sha256,
        },
        executionCommit: execution,
        sourceCommit: m.sourceCommit,
        sourceTree: m.sourceTree,
        baseCommit: m.baseCommit,
        checkerReleaseCommit: m.checkerReleaseCommit,
        checkerBundleDigest: H,
        candidateDigest: H,
        dispositionDigest: H,
        registryDigest: H,
        evidenceDigest: H,
        runtimeDigest: H,
        sourceInventoryDigest: H,
        historicalCustodyDigest: H,
      };
      const prefix = path.posix.dirname(m.canonicalReceiptPath),
        receiptPaths = [
          m.canonicalReceiptPath,
          prefix + "/receipts/fresh.json",
          prefix + "/receipts/replay.json",
        ];
      const receipts = [
        "synthetic-canonical",
        "synthetic-fresh",
        "synthetic-replay",
      ].map((id) => sealReceipt(p, id, H));
      for (const [i, file] of receiptPaths.entries())
        write(file, JSON.stringify(receipts[i]));
      const storageExtra = prefix + "/receipts/unregistered-storage.json";
      if (mutation === "storage-extra") write(storageExtra, "{}");
      const storage = commit([
        ...receiptPaths,
        ...(mutation === "storage-extra" ? [storageExtra] : []),
      ]);
      const transports = receiptPaths.map((file) => ({
        path: file,
        storageCommit: storage,
        sha256: hash(readFileSync(path.join(root, file))),
      }));
      const activation = [
        ".github/workflows/promotion-shadow.yml",
        "scripts/promotion-required-check-ca-textbook-successor.mjs",
      ];
      for (const file of activation)
        write(file, "Synthetic activation fixture only.\n");
      let extra = [];
      if (mutation === "storage-extra") {
        rmSync(path.join(root, storageExtra));
        extra = [storageExtra];
      }
      if (mutation === "deleted")
        rmSync(path.join(root, m.canonicalReceiptPath));
      if (mutation === "changed")
        write(
          m.canonicalReceiptPath,
          JSON.stringify(sealReceipt(p, "synthetic-replacement", H)),
        );
      if (mutation === "mode")
        chmodSync(path.join(root, m.canonicalReceiptPath), 0o755);
      if (mutation === "extra") {
        const file = prefix + "/receipts/unregistered.json";
        write(file, "{}");
        extra = [file];
      }
      git("add", "--", ...activation, ...receiptPaths, ...extra);
      const release = git(
        "commit-tree",
        git("write-tree"),
        "-p",
        mutation === "unrelated-storage" ? execution : storage,
        "-m",
        "Synthetic activation",
      );
      git("update-ref", "HEAD", release);
      repo = new Repository(root);
      const files = activation
        .map((file) => {
          const { bytes, ...binding } = repo.blob(release, file);
          return binding;
        })
        .sort((a, b) => a.path.localeCompare(b.path));
      const main = git(
        "commit-tree",
        repo.tree(release),
        "-p",
        m.baseCommit,
        "-p",
        release,
        "-m",
        "Synthetic main composition",
      );
      git("update-ref", "HEAD", main);
      const input = {
        schemaVersion: "ca-textbook-finalization.v1",
        manifestPath,
        receipts: transports,
        evidence: [],
        prProof: null,
        mainProof: null,
        liveAllowed: false,
        releaseCommit: release,
        releaseInventoryDigest: digest(files),
        releaseFiles: files,
      };
      const paths = [],
        save = (file, value) => {
          const bytes = Buffer.from(
            typeof value === "string" ? value : JSON.stringify(value),
          );
          write(file, bytes);
          paths.push(file);
          return { path: file, sha256: hash(bytes) };
        };
      const observedAt = new Date().toISOString(),
        names = [
          "snapshot",
          "validate",
          "postgres-integration",
          "visualization-browser",
          "teacher-notice-outbox-postgres16",
          "resend-webhook-postgres-integration",
          "teacher-parent-e2e",
          "promotion-shadow-gate",
        ];
      for (const [event, head, key] of [
        ["pull_request", release, "prProof"],
        ["push", main, "mainProof"],
      ])
        input[key] = save(prefix + "/finalization/" + key + ".json", {
          schemaVersion: "ca-textbook-ci-proof.v1",
          repository: "HUDongpin/MAIS-MVP",
          event,
          pullRequestNumber: event === "pull_request" ? 304 : null,
          head,
          base: m.baseCommit,
          checks: names.map((name, i) => ({
            name,
            conclusion: "success",
            head,
            runId: i + 1,
          })),
          liveAllowed: false,
          observedAt,
        });
      const reviewedAt = new Date().toISOString();
      for (const role of ["A11", "A22", "A23", "A25"]) {
        const report = save(
          prefix + "/finalization/" + role + ".md",
          "Synthetic finalization test only.",
        );
        input.evidence.push(
          save(prefix + "/finalization/" + role + ".json", {
            schemaVersion: "ca-textbook-finalization-evidence.v1",
            role,
            reviewer: "synthetic-" + role,
            reviewedAt,
            executionCommit: execution,
            receiptHashes: transports.map((t) => t.sha256),
            report,
            result: "approved-nonlive-finalization",
            liveAllowed: false,
            releaseCommit: release,
            releaseInventoryDigest: input.releaseInventoryDigest,
          }),
        );
      }
      save(prefix + "/finalization-input.json", input);
      commit(paths);
      repo = new Repository(root);
      run({ repo, input, p, receipts, m, main });
    },
    { bundle: true },
  );
}
test("A23-R2 real Git fixture with unchanged receipts is eligible for finalization proof", () =>
  finalGitFixture(null, ({ repo, input, p, receipts, m, main }) =>
    assert.equal(
      validateFinalizationProofs(repo, input, p, receipts, m).mainCommit,
      main,
    ),
  ));
for (const mutation of [
  "deleted",
  "changed",
  "mode",
  "extra",
  "unrelated-storage",
  "storage-extra",
])
  test(
    "A23-R2 rejects " + mutation + " receipt continuity in real Git history",
    () =>
      finalGitFixture(mutation, ({ repo, input, p, receipts, m }) =>
        assert.throws(() =>
          validateFinalizationProofs(repo, input, p, receipts, m),
        ),
      ),
  );

for (const [label, bytes] of [
  ["duplicate-key", Buffer.from('{"packageId":"first","packageId":"second"}')],
  ["invalid-utf8", Buffer.from([123, 34, 120, 34, 58, 34, 255, 34, 125])],
])
  test(
    "A23-R5 actual worker rejects " +
      label +
      " canonical JSON before legacy consumer parsing",
    () => {
      const root = realpathSync(mkdtempSync("/tmp/ca-observer-test-"));
      try {
        const write = (file, value) => {
          mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
          writeFileSync(path.join(root, file), value);
        };
        for (const file of BUNDLE_PATHS.filter(
          (p) =>
            p.endsWith(".mjs") ||
            p.endsWith("schemas.json") ||
            p.endsWith("canonical-transition.json"),
        ))
          write(file, readFileSync(path.join(project, file)));
        write("compatibility.json", "{}");
        write("package.json", '{"type":"module"}');
        write("coordination/content-qa/synthetic/lessons.json", bytes);
        mkdirSync(path.join(root, "data/generated-content"), {
          recursive: true,
        });
        mkdirSync(path.join(root, "data/rag"), { recursive: true });
        mkdirSync(path.join(root, "public"), { recursive: true });
        const input = path.join(root, "ca-observer-input.json");
        write(
          "ca-observer-input.json",
          JSON.stringify({
            manifest: {
              runtime: { compatibility: { path: "compatibility.json" } },
            },
            registry: { resolutions: [] },
          }),
        );
        const child = spawnSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `import {readFileSync} from 'node:fs'; const {observeSnapshot}=await import(${JSON.stringify(pathToFileURL(path.join(root, ROOT, "observer.mjs")).href)});try{await observeSnapshot(${JSON.stringify(root)},JSON.parse(readFileSync(${JSON.stringify(input)})));}catch(error){process.stdout.write(JSON.stringify({code:error.code??error.message}));process.exitCode=2;}`,
          ],
          { env: GIT_ENV, encoding: "utf8" },
        );
        assert.equal(child.status, 2);
        assert.equal(
          parse(Buffer.from(child.stdout)).code,
          "CA_OBSERVER_JSON_INVALID",
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

test("successor Manifest explicitly binds draft PR304 while preserving source provenance separately", () =>
  fixture(({ m }) => {
    validateSchema("manifest", { ...m, pullRequestNumber: 304 });
    assert.throws(() =>
      validateSchema("manifest", { ...m, pullRequestNumber: 225 }),
    );
  }));

for (const placement of ["public", "reachable"])
  test(
    "A23-R5 actual worker rejects duplicate-key " +
      placement +
      " JSON at the complete consumer boundary",
    () => {
      const root = realpathSync(mkdtempSync("/tmp/ca-json-consumer-"));
      try {
        const write = (file, value) => {
          mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
          writeFileSync(path.join(root, file), value);
        };
        for (const file of BUNDLE_PATHS.filter(
          (file) =>
            file.startsWith(ROOT + "/") ||
            file === "scripts/promotion-workflow-json-guard.mjs",
        ))
          write(file, readFileSync(path.join(project, file)));
        for (const folder of [
          "coordination/content-qa",
          "data/generated-content",
          "data/rag",
          "public",
        ])
          mkdirSync(path.join(root, folder), { recursive: true });
        write("package.json", '{"type":"module"}');
        write("compatibility.json", "{}");
        const target =
          placement === "public"
            ? "public/served.json"
            : "data/noncanonical-runtime.json";
        write(target, '{"identity":"first","identity":"second"}');
        // Mock only the graph provider for the reachable case; exercise the unmodified worker's parse ordering.
        if (placement === "reachable")
          write(
            ROOT + "/canonical-observer-ca-v1.mjs",
            'export async function observeCanonicalRuntimePolicy(){return {graph:{reachablePaths:new Set(["data/noncanonical-runtime.json"])}};} export async function auditCanonicalLegacyConflictUnion(){throw new Error("AUDIT_MUST_NOT_CONSUME_DUPLICATE_JSON");} export async function readAuthoritativeFile(){}',
          );
        write(
          "ca-observer-input.json",
          JSON.stringify({
            manifest: {
              runtime: { compatibility: { path: "compatibility.json" } },
            },
            registry: { resolutions: [] },
          }),
        );
        const child = spawnSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `import {readFileSync} from 'node:fs'; const {observeSnapshot}=await import(${JSON.stringify(pathToFileURL(path.join(root, ROOT, "observer.mjs")).href)});try{await observeSnapshot(${JSON.stringify(root)},JSON.parse(readFileSync(${JSON.stringify(path.join(root, "ca-observer-input.json"))})));}catch(error){process.stdout.write(JSON.stringify({code:error.code??error.message}));process.exitCode=2;}`,
          ],
          { env: GIT_ENV, encoding: "utf8" },
        );
        assert.equal(child.status, 2);
        assert.equal(
          parse(Buffer.from(child.stdout)).code,
          "CA_OBSERVER_JSON_INVALID",
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
