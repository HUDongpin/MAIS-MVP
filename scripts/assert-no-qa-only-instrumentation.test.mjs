import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  access,
  chmod,
  copyFile,
  cp,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES,
  CALIFORNIA_COMPOSED_CANVAS_MARKER,
  CALIFORNIA_COMPOSED_CONTROL_MARKER,
  CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256,
  CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES,
  CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES,
  CALIFORNIA_QA_ONLY_RESERVED_BYTE_TOKENS
} from "./california-qa-only-instrumentation-contract.mjs";
import {
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER,
  CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS,
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CA_VIZ_COMPOSED_QA_BUILD_ENV,
  assertNoQaOnlyInstrumentationBytesSync,
  assertNoQaOnlyInstrumentationSync
} from "./assert-no-qa-only-instrumentation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoTmpRoot = path.join(repoRoot, ".tmp");
await mkdir(repoTmpRoot, { recursive: true });
const suiteRoot = await mkdtemp(path.join(repoTmpRoot, "qa-marker-guard-"));

assert.ok(suiteRoot.startsWith(`${repoTmpRoot}${path.sep}`));
assert.ok(suiteRoot.startsWith("/Volumes/Starship/"));
after(() => rm(suiteRoot, { force: true, recursive: true }));

async function freshDirectory(prefix) {
  const root = await mkdtemp(path.join(suiteRoot, `${prefix}-`));
  assert.ok(root.startsWith(`${suiteRoot}${path.sep}`));
  return root;
}

async function isolatedChildEnv(tmpRoot, overrides = {}) {
  const runtimeRoot = path.join(tmpRoot, "child-runtime");
  await mkdir(runtimeRoot, { recursive: true });
  const env = {
    ...process.env,
    NODE_COMPILE_CACHE: path.join(runtimeRoot, "node-compile-cache"),
    TEMP: runtimeRoot,
    TMP: runtimeRoot,
    TMPDIR: runtimeRoot
  };
  delete env[CA_VIZ_COMPOSED_QA_BUILD_ENV];
  for (const key of CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS) delete env[key];
  return { ...env, ...overrides };
}

async function releaseFixture() {
  const root = await freshDirectory("release-fixture");
  const signatureDir = path.join(root, "components", "visualizations", "signature");
  await mkdir(signatureDir, { recursive: true });
  await writeFile(
    path.join(signatureDir, "Example.jsx"),
    "export default function Example() { return null; }\n"
  );
  await writeFile(path.join(signatureDir, "notes.md"), "clean product notes\n");
  return { root, signatureDir };
}

function assertRelease(root, env = {}) {
  return assertNoQaOnlyInstrumentationSync({ env, mode: "release", root });
}

function assertComposedQa(root, env = { [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1" }) {
  return assertNoQaOnlyInstrumentationSync({ env, mode: "composed-qa-build", root });
}

async function buildExactComposedFixture() {
  const preparationRoot = await freshDirectory("exact-composed-preparation");
  const productRoot = path.join(preparationRoot, "product");
  const stagingRoot = path.join(preparationRoot, "staging");
  const sourceSignatureRoot = path.join(
    repoRoot,
    "components",
    "visualizations",
    "signature"
  );
  for (const targetRoot of [productRoot, stagingRoot]) {
    await mkdir(path.join(targetRoot, "components", "visualizations"), { recursive: true });
    await cp(
      sourceSignatureRoot,
      path.join(targetRoot, "components", "visualizations", "signature"),
      { recursive: true }
    );
  }

  const composerUrl = pathToFileURL(
    path.join(repoRoot, "tests", "e2e", "california-signature-composed-staging.ts")
  ).href;
  const composerProgram = [
    `import { instrumentCaliforniaSignatureComposedQaStaging } from ${JSON.stringify(composerUrl)};`,
    "const [productProjectRoot, stagingProjectRoot] = process.argv.slice(1);",
    "const result = instrumentCaliforniaSignatureComposedQaStaging({ productProjectRoot, stagingProjectRoot });",
    "console.log(JSON.stringify(result));"
  ].join("\n");
  const env = await isolatedChildEnv(preparationRoot);
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      composerProgram,
      productRoot,
      stagingRoot
    ],
    { cwd: repoRoot, encoding: "utf8", env }
  );
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  return stagingRoot;
}

let exactComposedFixturePromise;
function exactComposedFixture() {
  exactComposedFixturePromise ??= buildExactComposedFixture();
  return exactComposedFixturePromise;
}

async function cloneExactComposedFixture(prefix) {
  const source = await exactComposedFixture();
  const container = await freshDirectory(prefix);
  const clone = path.join(container, "tree");
  await cp(source, clone, { recursive: true });
  return clone;
}

async function readJson(target) {
  return JSON.parse(await readFile(target, "utf8"));
}

async function writeJson(target, value) {
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

test("clean product source passes release mode but cannot borrow the composed QA flag", async () => {
  const { root } = await releaseFixture();
  const result = assertRelease(root);
  assert.equal(result.releaseEligible, true);
  assert.equal(result.markerCount, 0);
  assert.equal(result.regularFiles, 2);
  assert.throws(
    () => assertRelease(root, { [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1" }),
    /must be unset for release/i
  );
  assert.throws(
    () => assertComposedQa(root),
    /requires both exact root markers/i
  );
});

test("release byte-scans every regular signature file for the complete reserved family", async (t) => {
  for (const [index, token] of CALIFORNIA_QA_ONLY_RESERVED_BYTE_TOKENS.entries()) {
    await t.test(token, async () => {
      const { root, signatureDir } = await releaseFixture();
      const extension = index % 2 === 0 ? "mjs" : "md";
      await writeFile(path.join(signatureDir, `residual-${index}.${extension}`), `prefix ${token} suffix\n`);
      assert.throws(() => assertRelease(root), /reserved instrumentation bytes/i);
    });
  }
});

test("release rejects either QA-only marker basename at every signature depth", async (t) => {
  for (const markerName of [
    CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
    CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
  ]) {
    await t.test(markerName, async () => {
      const { root, signatureDir } = await releaseFixture();
      const nested = path.join(signatureDir, "nested", "deeper");
      await mkdir(nested, { recursive: true });
      await writeFile(path.join(nested, markerName), "{}\n");
      assert.throws(
        () => assertRelease(root),
        /forbidden.*marker|marker.*basename/i
      );
    });
  }
});

test("tree scan final-fences directories against files added after an early subtree", async () => {
  const container = await freshDirectory("output-directory-race");
  const root = path.join(container, "tree");
  const earlyDirectory = path.join(root, "a");
  const slowDirectory = path.join(root, "z");
  const readyPath = path.join(container, "scanner-ready");
  await mkdir(earlyDirectory, { recursive: true });
  await mkdir(slowDirectory, { recursive: true });
  await writeFile(path.join(earlyDirectory, "clean.js"), "clean\n");
  for (let start = 0; start < 8_000; start += 100) {
    await Promise.all(
      Array.from({ length: 100 }, (_, offset) => {
        const index = start + offset;
        return writeFile(
          path.join(slowDirectory, `${String(index).padStart(5, "0")}.js`),
          "x\n"
        );
      })
    );
  }

  const guardUrl = pathToFileURL(
    path.join(repoRoot, "scripts", "assert-no-qa-only-instrumentation.mjs")
  ).href;
  const program = [
    "import { writeFileSync } from 'node:fs';",
    `import { assertNoQaOnlyInstrumentationBytesSync } from ${JSON.stringify(guardUrl)};`,
    "const [root, readyPath] = process.argv.slice(1);",
    "writeFileSync(readyPath, 'ready\\n');",
    "try {",
    "  assertNoQaOnlyInstrumentationBytesSync({ root });",
    "  console.log('SCAN_PASSED');",
    "} catch (error) {",
    "  console.error(error instanceof Error ? error.message : String(error));",
    "  process.exitCode = 1;",
    "}"
  ].join("\n");
  const env = await isolatedChildEnv(container);
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", program, root, readyPath],
    { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] }
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      await access(readyPath);
      break;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(child.exitCode, null, "scanner must still be traversing the later subtree");
  await writeFile(
    path.join(earlyDirectory, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER),
    "{}\n"
  );
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

  assert.notEqual(status, 0, stdout);
  assert.match(stderr, /directory changed.*complete tree inspection|changed while.*inspected/i);
});

test("release scan rejects source symlinks, hardlinks, special files, and unreadable files", async (t) => {
  await t.test("symlink", async () => {
    const { root, signatureDir } = await releaseFixture();
    const outside = path.join(root, "outside.jsx");
    await writeFile(outside, "export default null;\n");
    await symlink(outside, path.join(signatureDir, "Linked.jsx"));
    assert.throws(() => assertRelease(root), /symlink/i);
  });

  await t.test("hardlink", async () => {
    const { root, signatureDir } = await releaseFixture();
    const outside = path.join(root, "outside.jsx");
    await writeFile(outside, "export default null;\n");
    await link(outside, path.join(signatureDir, "Linked.jsx"));
    assert.throws(() => assertRelease(root), /hardlink/i);
  });

  await t.test("special file", async () => {
    const { root, signatureDir } = await releaseFixture();
    const fifo = path.join(signatureDir, "unknown.fifo");
    const child = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.throws(() => assertRelease(root), /special entry type/i);
  });

  await t.test("unreadable", async () => {
    const { root, signatureDir } = await releaseFixture();
    const source = path.join(signatureDir, "Example.jsx");
    await chmod(source, 0o000);
    assert.throws(() => assertRelease(root), /unreadable/i);
  });
});

test("only the exact current 186-file control-plus-Canvas composition is locally authorized", async () => {
  const root = await exactComposedFixture();
  const result = assertComposedQa(root);
  assert.equal(result.localQaBuildAuthorized, true);
  assert.equal(result.releaseEligible, false);
  assert.equal(result.markerCount, 2);
  assert.equal(result.signatureSentinelFiles, 186);
  assert.equal(result.canvasSentinelFiles, 186);
  assert.equal(result.jsxFiles, 192);
  assert.equal(result.finalStagingSourceSha256, CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256);
  assert.deepEqual(
    await readJson(path.join(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER)),
    CALIFORNIA_COMPOSED_CONTROL_MARKER
  );
  assert.deepEqual(
    await readJson(path.join(root, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER)),
    CALIFORNIA_COMPOSED_CANVAS_MARKER
  );
  assert.equal(CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.length, 186);
  assert.equal(CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES.length, 6);
});

test("every exact marker field and schema key is frozen", async (t) => {
  for (const [markerName, expected] of [
    [CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER, CALIFORNIA_COMPOSED_CONTROL_MARKER],
    [CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER, CALIFORNIA_COMPOSED_CANVAS_MARKER]
  ]) {
    await t.test(markerName, async () => {
      const root = await cloneExactComposedFixture("marker-freeze");
      const markerPath = path.join(root, markerName);
      const original = await readFile(markerPath, "utf8");
      for (const key of Object.keys(expected)) {
        const value = await readJson(markerPath);
        value[key] = typeof value[key] === "number"
          ? value[key] + 1
          : typeof value[key] === "boolean"
            ? !value[key]
            : `${value[key]}-forged`;
        await writeJson(markerPath, value);
        assert.throws(() => assertComposedQa(root), new RegExp(`${key} mismatch`, "i"));
        await writeFile(markerPath, original);
      }
      const extra = JSON.parse(original);
      extra.unreviewed = true;
      await writeJson(markerPath, extra);
      assert.throws(() => assertComposedQa(root), /schema mismatch/i);
    });
  }
});

test("composed marker symlinks, hardlinks, and special entries fail closed", async (t) => {
  for (const kind of ["symlink", "hardlink", "special"]) {
    await t.test(kind, async () => {
      const root = await cloneExactComposedFixture(`marker-${kind}`);
      const markerPath = path.join(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
      const targetPath = path.join(root, "marker-target.json");
      await writeFile(targetPath, await readFile(markerPath));
      await unlink(markerPath);
      if (kind === "symlink") {
        await symlink(targetPath, markerPath);
      } else if (kind === "hardlink") {
        await link(targetPath, markerPath);
      } else {
        const child = spawnSync("mkfifo", [markerPath], { encoding: "utf8" });
        assert.equal(child.status, 0, child.stderr);
      }
      assert.throws(() => assertComposedQa(root), /symlink|hardlink|regular file/i);
    });
  }
});

test("exact marker values with a non-composer serialization are still rejected", async () => {
  const root = await cloneExactComposedFixture("marker-byte-freeze");
  const markerPath = path.join(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  const marker = await readJson(markerPath);
  await writeFile(markerPath, JSON.stringify(marker));
  assert.throws(() => assertComposedQa(root), /exact composer marker serialization/i);
});

test("composed authorization binds every family, exact JSX inventory, and final staged bytes", async () => {
  const root = await cloneExactComposedFixture("source-freeze");
  const firstBenchPath = path.join(
    root,
    "components",
    "visualizations",
    "signature",
    CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES[0]
  );
  const original = await readFile(firstBenchPath, "utf8");

  for (const [family, value] of [
    ["controlNamespace", CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.controlNamespace],
    ["canvasHeader", CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.canvasHeader],
    ["canvasRuntime", CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.canvasRuntime],
    ["noDeployTerminator", CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.noDeployTerminator]
  ]) {
    assert.ok(original.includes(value), `${family} fixture precondition`);
    await writeFile(firstBenchPath, original.replaceAll(value, `removed-${family}`));
    assert.throws(() => assertComposedQa(root), new RegExp(`lacks required composed ${family}`, "i"));
    await writeFile(firstBenchPath, original);
  }

  await writeFile(firstBenchPath, `${original}\n/* harmless-looking staged byte drift */\n`);
  assert.throws(() => assertComposedQa(root), /final staged source aggregate mismatch/i);
  await writeFile(firstBenchPath, original);

  await writeFile(
    firstBenchPath,
    `${original}\n${CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.legacyControlAttribute}\n`
  );
  assert.throws(() => assertComposedQa(root), /forbidden legacy control/i);
  await writeFile(firstBenchPath, original);

  const nonBenchPath = path.join(
    root,
    "components",
    "visualizations",
    "signature",
    CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES[0]
  );
  const nonBench = await readFile(nonBenchPath, "utf8");
  await writeFile(
    nonBenchPath,
    `${nonBench}\n${CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.controlNamespace}\n`
  );
  assert.throws(() => assertComposedQa(root), /only the exact 186 reviewed bench files/i);
  await writeFile(nonBenchPath, nonBench);

  const extraJsxPath = path.join(path.dirname(firstBenchPath), "UnreviewedLab.jsx");
  await writeFile(extraJsxPath, "export default null;\n");
  assert.throws(() => assertComposedQa(root), /\.jsx inventory mismatch/i);
  await unlink(extraJsxPath);

  await unlink(nonBenchPath);
  assert.throws(() => assertComposedQa(root), /\.jsx inventory mismatch/i);
});

test("deleting both markers cannot make residual composed bytes release eligible", async () => {
  const root = await cloneExactComposedFixture("marker-deletion");
  await unlink(path.join(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER));
  await unlink(path.join(root, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER));
  assert.throws(() => assertRelease(root), /reserved instrumentation bytes/i);
});

test("composed mode is unconditionally forbidden in every deployment context", async (t) => {
  const root = await exactComposedFixture();
  for (const key of CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS) {
    await t.test(key, () => {
      assert.throws(
        () => assertComposedQa(root, {
          [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1",
          [key]: ""
        }),
        /forbidden in any deployment context/i
      );
    });
  }
});

async function copyConfigClosure(root) {
  await copyFile(path.join(repoRoot, "next.config.ts"), path.join(root, "next.config.ts"));
  const scriptsDir = path.join(root, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  for (const name of [
    "assert-no-qa-only-instrumentation.mjs",
    "california-qa-only-instrumentation-contract.mjs"
  ]) {
    await copyFile(path.join(repoRoot, "scripts", name), path.join(scriptsDir, name));
  }
}

async function loadNextProductionConfig(root, overrides = {}) {
  const runtimeRoot = await freshDirectory("next-load-config-runtime");
  const env = await isolatedChildEnv(runtimeRoot, overrides);
  const program = [
    "import configModule from 'next/dist/server/config.js';",
    "import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';",
    "const loadConfig = configModule.default;",
    "const config = await loadConfig(PHASE_PRODUCTION_BUILD, process.cwd(), { silent: true });",
    "console.log(`TSCONFIG_PATH=${config.typescript?.tsconfigPath ?? ''}`);",
    "console.log('NEXT_LOAD_CONFIG_OK');"
  ].join("\n");
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", program],
    { cwd: root, encoding: "utf8", env }
  );
}

async function cleanNextConfigFixture(prefix) {
  const { root } = await releaseFixture();
  const container = await freshDirectory(prefix);
  const fixture = path.join(container, "project");
  await cp(root, fixture, { recursive: true });
  await copyConfigClosure(fixture);
  await writeFile(path.join(fixture, "tsconfig.json"), "{\"compilerOptions\":{}}\n");
  return fixture;
}

test("installed Next loadConfig production-build phase enforces local-only composition", async (t) => {
  const clean = await loadNextProductionConfig(repoRoot);
  assert.equal(clean.status, 0, `${clean.stdout}\n${clean.stderr}`);
  assert.match(clean.stdout, /NEXT_LOAD_CONFIG_OK/);

  const composedRoot = await cloneExactComposedFixture("next-config-composed");
  await copyConfigClosure(composedRoot);
  const local = await loadNextProductionConfig(composedRoot, {
    [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1"
  });
  assert.equal(local.status, 0, `${local.stdout}\n${local.stderr}`);
  assert.match(local.stdout, /NEXT_LOAD_CONFIG_OK/);

  for (const key of CALIFORNIA_QA_ONLY_DEPLOYMENT_ENV_KEYS) {
    for (const value of ["", "1"]) {
      await t.test(`${key}=${JSON.stringify(value)}`, async () => {
        const deployed = await loadNextProductionConfig(composedRoot, {
          [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1",
          [key]: value
        });
        assert.notEqual(deployed.status, 0);
        assert.match(`${deployed.stdout}\n${deployed.stderr}`, /forbidden in any deployment context/i);
      });
    }
  }
});

test("custom dist config never follows a disposable-tsconfig symlink", async () => {
  const root = await cleanNextConfigFixture("next-config-symlink");
  const victimPath = path.join(root, "victim.txt");
  const legacyDisposablePath = path.join(root, "tsconfig.dist-tmp-review.tmp.json");
  await writeFile(victimPath, "owner bytes must remain unchanged\n");
  await symlink(victimPath, legacyDisposablePath);

  const loaded = await loadNextProductionConfig(root, { NEXT_DIST_DIR: ".tmp/review" });
  assert.equal(loaded.status, 0, `${loaded.stdout}\n${loaded.stderr}`);
  assert.equal(await readFile(victimPath, "utf8"), "owner bytes must remain unchanged\n");
  assert.equal((await lstat(legacyDisposablePath)).isSymbolicLink(), true);
  const disposableFiles = (await readdir(root)).filter(
    (name) => /^tsconfig[.]dist-.+[.]tmp[.]json$/.test(name) && name !== path.basename(legacyDisposablePath)
  );
  assert.equal(disposableFiles.length, 1);
});

test("colliding custom dist labels receive distinct disposable tsconfigs", async () => {
  const root = await cleanNextConfigFixture("next-config-collision");
  for (const distDir of [".tmp/a/b", ".tmp/a-b"]) {
    const loaded = await loadNextProductionConfig(root, { NEXT_DIST_DIR: distDir });
    assert.equal(loaded.status, 0, `${loaded.stdout}\n${loaded.stderr}`);
  }
  const disposableFiles = (await readdir(root)).filter((name) =>
    /^tsconfig[.]dist-.+[.]tmp[.]json$/.test(name)
  );
  assert.equal(disposableFiles.length, 2);
  assert.equal(new Set(disposableFiles).size, 2);
});

test("custom dist config fails closed when a disposable tsconfig cannot be created", async () => {
  const root = await cleanNextConfigFixture("next-config-fail-closed");
  await chmod(root, 0o555);
  let loaded;
  try {
    loaded = await loadNextProductionConfig(root, { NEXT_DIST_DIR: ".tmp/read-only" });
  } finally {
    await chmod(root, 0o755);
  }
  assert.notEqual(loaded.status, 0, loaded.stdout);
  assert.match(`${loaded.stdout}\n${loaded.stderr}`, /disposable tsconfig|EACCES|permission denied/i);
});

test("release entrypoints reject the composed flag before spawn, collection, or copy", async () => {
  const { root } = await releaseFixture();
  const scriptsDir = path.join(root, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  for (const name of [
    "assert-no-qa-only-instrumentation.mjs",
    "california-qa-only-instrumentation-contract.mjs",
    "release-build-gate.mjs",
    "prepare-vercel-staging.mjs"
  ]) {
    await copyFile(path.join(repoRoot, "scripts", name), path.join(scriptsDir, name));
  }
  await writeFile(
    path.join(scriptsDir, "next-clean-build.mjs"),
    "import { writeFileSync } from 'node:fs';\n" +
      "writeFileSync(new URL('../BUILD-SPAWNED', import.meta.url), 'spawned\\n');\n" +
      "process.exitCode = 97;\n"
  );
  const env = await isolatedChildEnv(root, { [CA_VIZ_COMPOSED_QA_BUILD_ENV]: "1" });

  const build = spawnSync(process.execPath, [path.join(scriptsDir, "release-build-gate.mjs")], {
    cwd: root,
    encoding: "utf8",
    env
  });
  assert.notEqual(build.status, 0);
  assert.match(`${build.stdout}\n${build.stderr}`, /must be unset for release/i);
  await assert.rejects(access(path.join(root, "BUILD-SPAWNED")), { code: "ENOENT" });

  const staging = spawnSync(process.execPath, [path.join(scriptsDir, "prepare-vercel-staging.mjs")], {
    cwd: root,
    encoding: "utf8",
    env
  });
  assert.notEqual(staging.status, 0);
  assert.match(`${staging.stdout}\n${staging.stderr}`, /must be unset for release/i);
  await assert.rejects(access(path.join(root, ".tmp", "vercel-staging")), { code: "ENOENT" });
});

test("release output byte scanner rejects marker names, symlink, hardlink, special, unreadable, and reserved output", async (t) => {
  for (const kind of ["marker", "symlink", "hardlink", "special", "unreadable", "reserved"]) {
    await t.test(kind, async () => {
      const root = await freshDirectory(`output-${kind}`);
      const clean = path.join(root, "clean.js");
      await writeFile(clean, "export default 1;\n");
      if (kind === "marker") {
        await writeFile(
          path.join(root, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER),
          "{}\n"
        );
      } else if (kind === "symlink") {
        await symlink(clean, path.join(root, "linked.js"));
      } else if (kind === "hardlink") {
        await link(clean, path.join(root, "linked.js"));
      } else if (kind === "special") {
        const child = spawnSync("mkfifo", [path.join(root, "unknown.fifo")], { encoding: "utf8" });
        assert.equal(child.status, 0, child.stderr);
      } else if (kind === "unreadable") {
        await chmod(clean, 0o000);
      } else {
        await writeFile(
          path.join(root, "chunk.js"),
          `globalThis.${CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.canvasRuntime};\n`
        );
      }
      assert.throws(
        () => assertNoQaOnlyInstrumentationBytesSync({ root }),
        /marker|symlink|hardlink|special entry type|unreadable|reserved QA-only instrumentation bytes/i
      );
    });
  }
});

test("release build gate rejects transient child instrumentation preserved only in output", async () => {
  const { root, signatureDir } = await releaseFixture();
  const scriptsDir = path.join(root, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  for (const name of [
    "assert-no-qa-only-instrumentation.mjs",
    "california-qa-only-instrumentation-contract.mjs",
    "release-build-gate.mjs"
  ]) {
    await copyFile(path.join(repoRoot, "scripts", name), path.join(scriptsDir, name));
  }
  await writeFile(path.join(root, "tsconfig.next.json"), "{}\n");

  const fakeChild = [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const sourcePath = path.join(process.cwd(), 'components/visualizations/signature/Example.jsx');",
    "const original = fs.readFileSync(sourcePath, 'utf8');",
    "const dist = path.resolve(process.cwd(), process.env.NEXT_DIST_DIR);",
    "try {",
    `  fs.writeFileSync(sourcePath, original + ${JSON.stringify(`\n${CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.controlNamespace}\n`)});`,
    "  const outputs = [",
    "    'BUILD_ID',",
    "    'server/app/api/auth/login/route.js',",
    "    'server/app/api/dashboard/route.js',",
    "    'server/app/api/gamification/summary/route.js',",
    "    'server/app/api/rewards/route.js',",
    "    'server/app/dashboard.html'",
    "  ];",
    "  for (const relative of outputs) {",
    "    const target = path.join(dist, relative);",
    "    fs.mkdirSync(path.dirname(target), { recursive: true });",
    "    fs.writeFileSync(target, relative === 'server/app/dashboard.html'",
    `      ? ${JSON.stringify(`<script>${CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES.canvasRuntime}</script>`)}`,
    "      : 'clean output\\n');",
    "  }",
    "} finally {",
    "  fs.writeFileSync(sourcePath, original);",
    "}"
  ].join("\n");
  await writeFile(path.join(scriptsDir, "next-clean-build.mjs"), `${fakeChild}\n`);

  const env = await isolatedChildEnv(root);
  const child = spawnSync(
    process.execPath,
    [
      path.join(scriptsDir, "release-build-gate.mjs"),
      "--dist-dir",
      ".tmp/transient-next",
      "--keep-dist-dir"
    ],
    { cwd: root, encoding: "utf8", env }
  );
  assert.notEqual(child.status, 0);
  assert.match(`${child.stdout}\n${child.stderr}`, /release build output contains reserved QA-only instrumentation bytes/i);
  assert.equal(
    await readFile(path.join(signatureDir, "Example.jsx"), "utf8"),
    "export default function Example() { return null; }\n"
  );
  await access(path.join(root, ".tmp", "transient-next", "server", "app", "dashboard.html"));
});

test("release and staging integrations consume the same contract and output scanner", async () => {
  const [nextConfig, buildGate, staging] = await Promise.all([
    readFile(path.join(repoRoot, "next.config.ts"), "utf8"),
    readFile(path.join(repoRoot, "scripts", "release-build-gate.mjs"), "utf8"),
    readFile(path.join(repoRoot, "scripts", "prepare-vercel-staging.mjs"), "utf8")
  ]);
  assert.match(nextConfig, /assertNoQaOnlyInstrumentationSync/);
  assert.match(nextConfig, /CA_VIZ_COMPOSED_QA_BUILD_ENV/);
  assert.match(buildGate, /assertNoQaOnlyInstrumentationBytesSync/);
  assert.ok(
    buildGate.indexOf("assertNoQaOnlyInstrumentationBytesSync({") <
      buildGate.indexOf("verifyBuildOutputs(config.absoluteDistDir)")
  );
  assert.match(staging, /scripts\/california-qa-only-instrumentation-contract\.mjs/);
  assert.match(staging, /assertNoQaOnlyInstrumentationSync/);
});
