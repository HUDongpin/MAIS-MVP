import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  buildVercelStagingGitEnvironment,
  calculateFileProvenance,
  parseGitLsTree,
  prepareVercelStaging,
  releasePreparedVercelStagingSeal,
  sealPreparedVercelStaging,
  verifyPreparedVercelStaging
} from "./prepare-vercel-staging.mjs";

const execFileAsync = promisify(execFile);

test("staging Git children receive only execution basics and fixed read-only Git controls", () => {
  const parentEnv = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    TMPDIR: "/tmp/staging-git-fixture",
    LANG: "en_US.UTF-8",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    GITHUB_TOKEN: "fixture-github-token-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
    POSTGRES_URL: "postgres://fixture:fixture@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real",
    QWEN_API_KEY: "fixture-qwen-key-not-real",
    GIT_CONFIG_GLOBAL: "/tmp/hostile-global-gitconfig",
    GIT_CONFIG_SYSTEM: "/tmp/hostile-system-gitconfig"
  };
  const childEnv = buildVercelStagingGitEnvironment(parentEnv);
  assert.equal(childEnv.PATH, parentEnv.PATH);
  assert.equal(childEnv.TMPDIR, parentEnv.TMPDIR);
  assert.equal(childEnv.LANG, parentEnv.LANG);
  assert.equal(childEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(childEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(childEnv.GIT_CONFIG_COUNT, "2");
  assert.equal(childEnv.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(childEnv.GIT_CONFIG_VALUE_0, "false");
  assert.equal(childEnv.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(childEnv.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(childEnv.GIT_NO_LAZY_FETCH, "1");
  assert.equal(childEnv.GIT_OPTIONAL_LOCKS, "0");
  assert.equal(childEnv.GIT_TERMINAL_PROMPT, "0");
  for (const key of [
    "VERCEL_TOKEN",
    "GITHUB_TOKEN",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM",
    "POSTGRES_URL",
    "RESEND_API_KEY",
    "QWEN_API_KEY",
    "GIT_CONFIG_SYSTEM"
  ]) {
    assert.equal(childEnv[key], undefined, `${key} must not reach a staging Git child`);
  }
});

const requiredRootFiles = [
  ".vercelignore",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "public/robots.txt",
  "scripts/check-stray-generated-types.mjs",
  "scripts/cleanup-generated-artifacts.mjs",
  "scripts/next-clean-build.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.next.json",
  "vercel.json"
];

const requiredDirectories = [
  "app",
  "components",
  "data",
  "lib",
  "types",
  "public/audio",
  "public/lesson-illustrations",
  "public/ease_question_assets",
  "public/practice"
];

const requiredGameAssetFiles = [
  "public/games/math-match-quest/board-reference.png",
  "public/games/math-match-quest/map-reference.png",
  "public/games/math-virus-blaster/math-master-virus-blaster-design.png",
  "public/games/mighty-tank-battle/desktop-reference.png",
  "public/games/mighty-tank-battle/mobile-reference.png"
];

async function git(repoRoot, args) {
  const result = await execFileAsync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });
  return result.stdout.trim();
}

async function writeFixtureFile(repoRoot, relativePath, contents = `${relativePath}\n`) {
  const absolutePath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, contents);
}

async function createFixture(options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-vercel-staging-"));
  const repoRoot = path.join(tempRoot, "repo");
  await fs.mkdir(repoRoot, { recursive: true });
  await execFileAsync(
    "git",
    ["init", "--quiet", ...(options.objectFormat ? [`--object-format=${options.objectFormat}`] : [])],
    { cwd: repoRoot }
  );
  await git(repoRoot, ["config", "user.email", "fixture@example.test"]);
  await git(repoRoot, ["config", "user.name", "Fixture User"]);

  for (const relativePath of requiredRootFiles) {
    await writeFixtureFile(repoRoot, relativePath);
  }
  await fs.chmod(path.join(repoRoot, "scripts/next-clean-build.mjs"), 0o755);
  for (const relativePath of requiredGameAssetFiles) {
    await writeFixtureFile(repoRoot, relativePath, Buffer.from(`asset:${relativePath}`));
  }
  for (const directory of requiredDirectories) {
    await writeFixtureFile(repoRoot, `${directory}/fixture.txt`);
  }
  await writeFixtureFile(
    repoRoot,
    "lib/mainlandPepQuestionAssets.ts",
    "export const mainlandPepQuestionIllustrationApprovals = [];\n"
  );
  await writeFixtureFile(repoRoot, ".gitignore", ".tmp/\n");

  if (options.symlinkRequiredFile) {
    await fs.rm(path.join(repoRoot, "middleware.ts"));
    await fs.symlink("package.json", path.join(repoRoot, "middleware.ts"));
  }

  await git(repoRoot, ["add", "--all"]);
  await git(repoRoot, ["commit", "--quiet", "-m", "fixture"]);
  return {
    repoRoot,
    stagingRoot: path.join(repoRoot, ".tmp", "vercel-staging"),
    tempRoot
  };
}

async function removeFixture(fixture) {
  await fs.rm(fixture.tempRoot, { recursive: true, force: true });
}

test("raw file provenance uses Vercel SHA-1/SHA-256 digests but only SHA-1 Git blob OIDs", () => {
  const bytes = Buffer.from("hello\n", "utf8");
  assert.deepEqual(calculateFileProvenance(bytes, "sha1"), {
    gitBlobOid: createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex"),
    rawSha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length
  });
  assert.throws(
    () => calculateFileProvenance(bytes, "sha256"),
    /only SHA-1 Git repositories/iu
  );
  assert.throws(
    () => parseGitLsTree(Buffer.from(""), "sha256"),
    /only SHA-1 Git repositories/iu
  );
});

test("NUL-delimited ls-tree parsing keeps a complete regular/non-regular mapping", () => {
  const output = Buffer.from(
    `100644 blob ${"a".repeat(40)}\tapp/a file.ts\0` +
    `100755 blob ${"b".repeat(40)}\tscripts/run.mjs\0` +
    `120000 blob ${"c".repeat(40)}\tapp/link\0` +
    `160000 commit ${"d".repeat(40)}\tvendor/submodule\0`,
    "utf8"
  );
  const entries = parseGitLsTree(output, "sha1");
  assert.equal(entries.size, 4);
  assert.deepEqual(entries.get("app/a file.ts"), {
    gitBlobOid: "a".repeat(40),
    mode: "100644",
    objectType: "blob",
    regularBlob: true
  });
  assert.equal(entries.get("app/link").regularBlob, false);
  assert.equal(entries.get("vendor/submodule").regularBlob, false);
});

test("a SHA-256 Git repository fails before staging because provider source UIDs require SHA-1", async (t) => {
  const fixture = await createFixture({ objectFormat: "sha256" });
  t.after(() => removeFixture(fixture));

  await assert.rejects(
    () => prepareVercelStaging({
      dryRun: true,
      repoRoot: fixture.repoRoot,
      runId: "sha256-must-fail",
      stagingRoot: fixture.stagingRoot
    }),
    /only SHA-1 Git repositories/iu
  );
  await assert.rejects(() => fs.access(fixture.stagingRoot));
});

test("every provenance Git subprocess disables lazy fetch and terminal prompts", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const actualGit = (await execFileAsync("which", ["git"], { encoding: "utf8" })).stdout.trim();
  const proxyRoot = path.join(fixture.tempRoot, "git-proxy");
  const proxyPath = path.join(proxyRoot, "git");
  await fs.mkdir(proxyRoot, { recursive: true });
  await fs.writeFile(
    proxyPath,
    [
      "#!/bin/sh",
      "if [ \"$GIT_NO_LAZY_FETCH\" != \"1\" ] || [ \"$GIT_TERMINAL_PROMPT\" != \"0\" ]; then",
      "  exit 97",
      "fi",
      `exec ${JSON.stringify(actualGit)} \"$@\"`,
      ""
    ].join("\n")
  );
  await fs.chmod(proxyPath, 0o755);
  const originalPath = process.env.PATH;
  process.env.PATH = `${proxyRoot}${path.delimiter}${originalPath ?? ""}`;
  try {
    const summary = await prepareVercelStaging({
      dryRun: true,
      repoRoot: fixture.repoRoot,
      runId: "no-lazy-fetch",
      stagingRoot: fixture.stagingRoot
    });
    assert.equal(summary.gitSourceVerified, true);
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  }
});

test("staging writes a deterministic, relative-path-only manifest bound to clean HEAD", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));

  const summary = await prepareVercelStaging({
    repoRoot: fixture.repoRoot,
    runId: "manifest-proof",
    stagingRoot: fixture.stagingRoot
  });
  const manifestPath = path.join(summary.stagingDir, "vercel-staging-manifest.json");
  const manifestBytes = await fs.readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const candidateSha = await git(fixture.repoRoot, ["rev-parse", "--verify", "HEAD"]);
  const sourceTreeObject = await git(fixture.repoRoot, ["rev-parse", `${candidateSha}^{tree}`]);

  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(Object.keys(manifest), [
    "schemaVersion",
    "candidateSha",
    "sourceTreeObject",
    "objectFormat",
    "sourceManifestAlgorithm",
    "sourceManifestRoot",
    "trackedEntryCount",
    "fileCount",
    "totalBytes",
    "files"
  ]);
  assert.equal(manifest.candidateSha, candidateSha);
  assert.equal(manifest.sourceTreeObject, sourceTreeObject);
  assert.equal(manifest.objectFormat, "sha1");
  assert.equal(manifest.sourceManifestAlgorithm, "sha256-canonical-json-lines-v2");
  assert.equal(manifest.sourceManifestRoot, summary.sourceManifestRoot);
  const canonicalSourceManifest = `${manifest.files.map((file) => JSON.stringify([
    file.path,
    file.mode,
    file.size,
    file.rawSha1,
    file.sha256,
    file.gitBlobOid
  ])).join("\n")}\n`;
  assert.equal(
    manifest.sourceManifestRoot,
    createHash("sha256").update(Buffer.from(canonicalSourceManifest)).digest("hex")
  );
  assert.equal(manifest.fileCount, manifest.files.length);
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    [...manifest.files.map((file) => file.path)].sort()
  );
  assert.ok(manifest.files.every((file) => Object.keys(file).join(",") === "path,mode,size,rawSha1,sha256,gitBlobOid"));
  assert.ok(manifest.files.every((file) => file.mode === "100644" || file.mode === "100755"));
  assert.ok(manifest.files.every((file) => /^[0-9a-f]{40}$/u.test(file.rawSha1)));
  assert.ok(manifest.files.every((file) => /^[0-9a-f]{64}$/u.test(file.sha256)));
  assert.ok(manifest.files.every((file) => /^[0-9a-f]{40}$/u.test(file.gitBlobOid)));
  assert.equal(manifest.files.some((file) => file.path === "vercel-staging-manifest.json"), false);
  assert.equal(manifestBytes.includes(Buffer.from(fixture.repoRoot)), false);
  assert.equal(manifestBytes.includes(Buffer.from(fixture.stagingRoot)), false);
  assert.equal(summary.manifestRawSha1, createHash("sha1").update(manifestBytes).digest("hex"));
  assert.equal(summary.manifestSha256, createHash("sha256").update(manifestBytes).digest("hex"));
  assert.equal(summary.manifestPath, "vercel-staging-manifest.json");
  assert.equal(summary.gitSourceVerified, true);

  const packageRecord = manifest.files.find((file) => file.path === "package.json");
  const packageBytes = await fs.readFile(path.join(fixture.repoRoot, "package.json"));
  assert.deepEqual(packageRecord, {
    path: "package.json",
    mode: "100644",
    ...calculateFileProvenance(packageBytes, "sha1")
  });
  assert.equal(
    manifest.files.find((file) => file.path === "scripts/next-clean-build.mjs").mode,
    "100755"
  );

  const repeatedDryRun = await prepareVercelStaging({
    dryRun: true,
    repoRoot: fixture.repoRoot,
    runId: "manifest-proof-repeat",
    stagingRoot: fixture.stagingRoot
  });
  assert.equal(repeatedDryRun.sourceManifestRoot, summary.sourceManifestRoot);
  assert.equal(repeatedDryRun.manifestRawSha1, summary.manifestRawSha1);
  assert.equal(repeatedDryRun.manifestSha256, summary.manifestSha256);
});

test("dry-run verifies Git provenance and computes manifest roots without writing staging", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const summary = await prepareVercelStaging({
    dryRun: true,
    repoRoot: fixture.repoRoot,
    runId: "dry-proof",
    stagingRoot: fixture.stagingRoot
  });

  assert.equal(summary.dryRun, true);
  assert.match(summary.candidateSha, /^[0-9a-f]{40}$/u);
  assert.match(summary.sourceTreeObject, /^[0-9a-f]{40}$/u);
  assert.match(summary.sourceManifestRoot, /^[0-9a-f]{64}$/u);
  assert.match(summary.manifestRawSha1, /^[0-9a-f]{40}$/u);
  assert.match(summary.manifestSha256, /^[0-9a-f]{64}$/u);
  await assert.rejects(() => fs.access(summary.stagingDir));
});

test("dirty and untracked source states fail closed without exposing paths", async (t) => {
  const dirtyFixture = await createFixture();
  const untrackedFixture = await createFixture();
  t.after(() => Promise.all([removeFixture(dirtyFixture), removeFixture(untrackedFixture)]));

  await fs.appendFile(path.join(dirtyFixture.repoRoot, "package.json"), "dirty-private-content\n");
  await fs.writeFile(path.join(untrackedFixture.repoRoot, "private-owner-file.txt"), "private\n");
  for (const fixture of [dirtyFixture, untrackedFixture]) {
    await assert.rejects(
      () => prepareVercelStaging({
        dryRun: true,
        repoRoot: fixture.repoRoot,
        runId: "must-fail",
        stagingRoot: fixture.stagingRoot
      }),
      (error) => {
        assert.match(error.message, /clean tracked Git HEAD/u);
        assert.doesNotMatch(error.message, /package\.json|private-owner-file|dirty-private-content/u);
        return true;
      }
    );
  }
});

test("selected symlinks and other non-regular Git blobs fail closed", async (t) => {
  const fixture = await createFixture({ symlinkRequiredFile: true });
  t.after(() => removeFixture(fixture));
  await assert.rejects(
    () => prepareVercelStaging({
      dryRun: true,
      repoRoot: fixture.repoRoot,
      runId: "symlink-fail",
      stagingRoot: fixture.stagingRoot
    }),
    /regular file|regular Git blob/u
  );
});

test("source tampering between pre-copy and post-copy verification fails closed", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  let tampered = false;
  await assert.rejects(
    () => prepareVercelStaging({
      repoRoot: fixture.repoRoot,
      runId: "tamper-fail",
      stagingRoot: fixture.stagingRoot,
      beforeCopyFile: async ({ relativePath }) => {
        if (!tampered && relativePath === "package.json") {
          tampered = true;
          await fs.appendFile(path.join(fixture.repoRoot, relativePath), "tampered\n");
        }
      }
    }),
    /source file changed during staging/u
  );
});

test("HEAD or tree changes before final verification fail closed", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  await assert.rejects(
    () => prepareVercelStaging({
      dryRun: true,
      repoRoot: fixture.repoRoot,
      runId: "head-change",
      stagingRoot: fixture.stagingRoot,
      beforeFinalSnapshot: async () => {
        await git(fixture.repoRoot, ["commit", "--quiet", "--allow-empty", "-m", "changed head"]);
      }
    }),
    /Git HEAD or tree changed during staging/u
  );
});

test("parent-directory run ids are rejected before any staging deletion", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const sentinel = path.join(fixture.stagingRoot, "sentinel.txt");
  await fs.mkdir(fixture.stagingRoot, { recursive: true });
  await fs.writeFile(sentinel, "preserve\n");

  await assert.rejects(
    () => prepareVercelStaging({
      repoRoot: fixture.repoRoot,
      runId: "..",
      stagingRoot: fixture.stagingRoot
    }),
    /safe non-parent path segment/u
  );
  assert.equal(await fs.readFile(sentinel, "utf8"), "preserve\n");
});

test("a symlinked staging-root ancestor cannot escape the repository or delete caller data", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const outsideRoot = path.join(fixture.tempRoot, "outside-owned-by-caller");
  const preexistingRunDir = path.join(outsideRoot, "reviewer-repro");
  const sentinel = path.join(preexistingRunDir, "sentinel.txt");
  await fs.mkdir(preexistingRunDir, { recursive: true });
  await fs.writeFile(sentinel, "must survive\n");
  await fs.mkdir(path.dirname(fixture.stagingRoot), { recursive: true });
  await fs.symlink(outsideRoot, fixture.stagingRoot, "dir");

  await assert.rejects(
    () => prepareVercelStaging({
      repoRoot: fixture.repoRoot,
      runId: "reviewer-repro",
      stagingRoot: fixture.stagingRoot
    }),
    /symlink|realpath|containment|safe staging/iu
  );
  assert.equal(await fs.readFile(sentinel, "utf8"), "must survive\n");
  await assert.rejects(() => fs.access(path.join(outsideRoot, "vercel-staging-manifest.json")));
});

test("unknown CLI flags are rejected without echoing their name or value", async () => {
  const privateFlag = "--owner-secret=fixture-private-value-never-output";
  const scriptPath = fileURLToPath(new URL("./prepare-vercel-staging.mjs", import.meta.url));
  await assert.rejects(
    () => execFileAsync(process.execPath, [scriptPath, privateFlag], { encoding: "utf8" }),
    (error) => {
      assert.match(error.stderr, /Unknown command-line argument; value redacted\./u);
      assert.doesNotMatch(error.stderr, /owner-secret|fixture-private-value/u);
      return true;
    }
  );
});

test("each run uses a private mkdtemp and preserves a caller-selected pre-existing directory", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const callerSelectedDirectory = path.join(fixture.stagingRoot, "caller-run");
  const sentinel = path.join(callerSelectedDirectory, "sentinel.txt");
  await fs.mkdir(callerSelectedDirectory, { recursive: true });
  await fs.writeFile(sentinel, "preserve caller data\n");

  const summary = await prepareVercelStaging({
    repoRoot: fixture.repoRoot,
    runId: "caller-run",
    stagingRoot: fixture.stagingRoot
  });

  assert.notEqual(path.resolve(summary.stagingDir), path.resolve(callerSelectedDirectory));
  assert.match(path.basename(summary.stagingDir), /^caller-run-[A-Za-z0-9]+$/u);
  assert.equal(await fs.readFile(sentinel, "utf8"), "preserve caller data\n");
  assert.equal(
    JSON.parse(await fs.readFile(path.join(summary.stagingDir, "vercel-staging-manifest.json"), "utf8")).candidateSha,
    summary.candidateSha
  );
});

test("a private staging directory swapped after mkdtemp is rejected before file writes", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const outsideRoot = path.join(fixture.tempRoot, "outside-after-mkdtemp");
  const sentinel = path.join(outsideRoot, "sentinel.txt");
  await fs.mkdir(outsideRoot, { recursive: true });
  await fs.writeFile(sentinel, "must survive\n");

  await assert.rejects(
    () => prepareVercelStaging({
      repoRoot: fixture.repoRoot,
      runId: "swap-after-mkdtemp",
      stagingRoot: fixture.stagingRoot,
      afterPrivateStagingCreated: async ({ stagingDir }) => {
        await fs.rename(stagingDir, `${stagingDir}-original`);
        await fs.symlink(outsideRoot, stagingDir, "dir");
      }
    }),
    /private Vercel staging directory|lstat|realpath/iu
  );
  assert.equal(await fs.readFile(sentinel, "utf8"), "must survive\n");
  assert.deepEqual(await fs.readdir(outsideRoot), ["sentinel.txt"]);
});

test("upload-time verification accepts intact staging and rejects content replacement", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const staging = await prepareVercelStaging({
    repoRoot: fixture.repoRoot,
    runId: "upload-reverify-content",
    stagingRoot: fixture.stagingRoot
  });

  const verified = await verifyPreparedVercelStaging(staging);
  assert.deepEqual(verified, {
    candidateSha: staging.candidateSha,
    fileCount: staging.fileCount,
    manifestRawSha1: staging.manifestRawSha1,
    manifestSha256: staging.manifestSha256,
    sourceManifestRoot: staging.sourceManifestRoot,
    sourceTreeObject: staging.sourceTreeObject,
    totalBytes: staging.totalBytes,
    uploadBytesVerified: true
  });

  await fs.appendFile(path.join(staging.stagingDir, "package.json"), "tampered after prepare\n");
  await assert.rejects(
    () => verifyPreparedVercelStaging(staging),
    /staging verification|provenance|content|size/iu
  );
});

test("upload staging can be owner-read-only sealed across the CLI read window", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const staging = await prepareVercelStaging({
    repoRoot: fixture.repoRoot,
    runId: "upload-read-only-seal",
    stagingRoot: fixture.stagingRoot
  });
  const executable = path.join(staging.stagingDir, "scripts", "next-clean-build.mjs");
  const regular = path.join(staging.stagingDir, "package.json");
  try {
    const sealed = await sealPreparedVercelStaging(staging);
    assert.equal(sealed.sealed, true);
    assert.equal((await fs.stat(staging.stagingDir)).mode & 0o777, 0o500);
    assert.equal((await fs.stat(executable)).mode & 0o777, 0o500);
    assert.equal((await fs.stat(regular)).mode & 0o777, 0o400);
    await assert.rejects(() => fs.appendFile(regular, "must not write\n"), /EACCES|EPERM/u);
    assert.equal((await verifyPreparedVercelStaging(staging)).uploadBytesVerified, true);
    await assert.rejects(
      () => sealPreparedVercelStaging({ ...staging }),
      /staging seal failed/i
    );
  } finally {
    await releasePreparedVercelStagingSeal(staging);
  }
  assert.equal((await fs.stat(staging.stagingDir)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(executable)).mode & 0o777, 0o755);
  assert.equal((await fs.stat(regular)).mode & 0o777, 0o644);
});

test("upload-time verification rechecks the clean candidate HEAD and tree", async (t) => {
  const fixture = await createFixture();
  t.after(() => removeFixture(fixture));
  const staging = await prepareVercelStaging({
    repoRoot: fixture.repoRoot,
    runId: "upload-reverify-git",
    stagingRoot: fixture.stagingRoot
  });
  await git(fixture.repoRoot, ["commit", "--quiet", "--allow-empty", "-m", "changed candidate"]);

  await assert.rejects(
    () => verifyPreparedVercelStaging(staging),
    /Prepared Vercel staging verification failed; details redacted\./u
  );
});

test("upload-time verification rejects mode, file-set, symlink, and directory-identity tampering", async (t) => {
  const cases = [
    {
      name: "mode flip",
      mutate: async (staging) => fs.chmod(path.join(staging.stagingDir, "package.json"), 0o755)
    },
    {
      name: "extra file",
      mutate: async (staging) => fs.writeFile(path.join(staging.stagingDir, "unexpected-extra.txt"), "extra\n")
    },
    {
      name: "omitted file",
      mutate: async (staging) => fs.rm(path.join(staging.stagingDir, "package.json"))
    },
    {
      name: "symlink replacement",
      mutate: async (staging) => {
        const target = path.join(staging.stagingDir, "package.json");
        await fs.rm(target);
        await fs.symlink("vercel-staging-manifest.json", target);
      }
    },
    {
      name: "identical regular-file replacement",
      mutate: async (staging) => {
        const target = path.join(staging.stagingDir, "package.json");
        const original = `${staging.stagingDir}-original-package.json`;
        await fs.rename(target, original);
        await fs.copyFile(original, target);
        await fs.chmod(target, 0o644);
      }
    },
    {
      name: "directory replacement with identical bytes",
      mutate: async (staging) => {
        const original = `${staging.stagingDir}-original`;
        await fs.rename(staging.stagingDir, original);
        await fs.cp(original, staging.stagingDir, { recursive: true, preserveTimestamps: true });
      }
    }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async (subtest) => {
      const fixture = await createFixture();
      subtest.after(() => removeFixture(fixture));
      const staging = await prepareVercelStaging({
        repoRoot: fixture.repoRoot,
        runId: `upload-reverify-${scenario.name.replaceAll(" ", "-")}`,
        stagingRoot: fixture.stagingRoot
      });
      await scenario.mutate(staging);
      await assert.rejects(
        () => verifyPreparedVercelStaging(staging),
        /Prepared Vercel staging verification failed; details redacted\./u
      );
    });
  }
});
