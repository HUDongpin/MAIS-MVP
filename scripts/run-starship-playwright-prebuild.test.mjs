import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, fstatSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  acquireStarshipPlaywrightRunLock,
  buildStarshipNextPrebuildInvocation,
  buildStarshipE2eTempTsconfigBytes,
  buildStarshipPlaywrightInvocation,
  createStarshipExclusiveRegularFile,
  createStarshipHeldExclusiveFile,
  finalizeStarshipPrebuildProcessOutcome,
  readStarshipProcessIdentity,
  readStarshipProcessGroupIdentity,
  removeStarshipHeldExclusiveFile,
  runStarshipFullExecutionSourceHold,
  runStarshipNextEnvBuildBeforeLaunch,
  runStarshipNextEnvWholeRunBoundary,
  starshipPlaywrightFullRunRuntimeSourcePaths,
  starshipPlaywrightPrebuildRuntimeSourcePaths,
  validateStarshipPlaywrightPrebuildReceipt,
  writeStarshipPlaywrightPrebuildReceipt
} from "./run-starship-playwright.mjs";
import { buildStarshipE2ePathManifest } from "./starship-e2e-path-gate.mjs";

const STARSHIP_TEST_PREFIX = "/Volumes/Starship/mais-playwright-prebuild-";
const require = createRequire(import.meta.url);
const FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS = Object.freeze([
  "tests/e2e/starship-e2e-global-setup.ts",
  "tests/e2e/mainland-focused-canonical-cli.ts"
]);
const FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS = Object.freeze([
  "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts"
]);

test("full-run child identity binds the live PID, PGID, and OS start token", () => {
  const identity = readStarshipProcessGroupIdentity(process.pid);
  assert.equal(identity.pid, process.pid);
  assert.ok(Number.isInteger(identity.pgid) && identity.pgid > 0);
  assert.match(identity.startToken, /\S/u);
});

test("full-run source set holds fixed Playwright helpers before the exact ordered approved producers", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  await createRuntimeSourceJoinFixture(repositoryRoot);
  const producerRelativePaths = FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS;
  const producerPaths = producerRelativePaths.map((relativePath) =>
    path.join(repositoryRoot, relativePath)
  );
  await fs.mkdir(path.dirname(producerPaths[0]), { recursive: true });
  for (const producerPath of producerPaths) {
    await fs.writeFile(producerPath, `// exact ${path.basename(producerPath)} fixture\n`, {
      mode: 0o600
    });
  }
  const prebuildSources = starshipPlaywrightPrebuildRuntimeSourcePaths(repositoryRoot);
  const fixedRuntimeSources = FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS.map((relativePath) =>
    path.join(repositoryRoot, relativePath)
  );
  for (const fixedRuntimeSource of fixedRuntimeSources) {
    await fs.writeFile(fixedRuntimeSource, `// exact ${path.basename(fixedRuntimeSource)} fixture\n`, {
      mode: 0o600
    });
  }
  const fullRunSources = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...producerRelativePaths, "--project=desktop-chromium"]
  );
  assert.deepEqual(fullRunSources.slice(0, prebuildSources.length), prebuildSources);
  for (const requiredRelativePath of [
    "scripts/run-starship-playwright.mjs",
    "scripts/starship-e2e-path-gate.mjs",
    "scripts/next-clean-build.mjs",
    "scripts/cleanup-generated-artifacts.mjs",
    "scripts/check-stray-generated-types.mjs",
    "playwright.config.ts"
  ]) {
    assert.equal(
      fullRunSources.includes(path.join(repositoryRoot, requiredRelativePath)),
      true,
      requiredRelativePath
    );
  }
  assert.deepEqual(
    fullRunSources.slice(prebuildSources.length),
    [...fixedRuntimeSources, ...producerPaths]
  );
  const nonApprovedPath = path.join(repositoryRoot, "tests/e2e/non-approved.spec.ts");
  await fs.writeFile(nonApprovedPath, "// not approved\n", { mode: 0o600 });
  for (const invalidProducerArgs of [
    producerRelativePaths.slice(0, -1),
    [producerRelativePaths[1], producerRelativePaths[0], ...producerRelativePaths.slice(2)],
    [...producerRelativePaths, "tests/e2e/non-approved.spec.ts"],
    [...producerRelativePaths, producerRelativePaths[0]],
    ["../foreign.spec.ts"]
  ]) {
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...invalidProducerArgs]
      ),
      /source|approved|order|missing|extra|duplicate|escape|repository/iu
    );
  }
  await fs.unlink(producerPaths[2]);
  assert.throws(
    () => starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...producerRelativePaths]
    ),
    /source|missing|ENOENT/iu
  );
});

test("full-run source hold rejects a real G03 helper mutate-load-restore attack", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  await createRuntimeSourceJoinFixture(repositoryRoot);
  const producerRelativePaths = FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS;
  const fixedRuntimeRelativePaths = FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS;
  for (const relativePath of [...fixedRuntimeRelativePaths, ...producerRelativePaths]) {
    const sourcePath = path.join(repositoryRoot, relativePath);
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, `// exact ${relativePath} fixture\n`, { mode: 0o600 });
  }
  const g03Path = path.join(repositoryRoot, producerRelativePaths[0]);
  const helperPath = path.join(repositoryRoot, "tests/e2e/helpers.ts");
  const sessionPath = path.join(repositoryRoot, "lib/session.ts");
  const helperOriginal = await fs.readFile(
    new URL("../tests/e2e/helpers.ts", import.meta.url)
  );
  const helperMalicious = Buffer.from(helperOriginal);
  helperMalicious[helperMalicious.length - 2] = helperMalicious[helperMalicious.length - 2] === 0x20
    ? 0x21
    : 0x20;
  await fs.writeFile(
    g03Path,
    'import { expectNoPageErrors } from "./helpers";\nvoid expectNoPageErrors;\n',
    { mode: 0o600 }
  );
  await fs.writeFile(helperPath, helperOriginal, { mode: 0o600 });
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  await fs.copyFile(new URL("../lib/session.ts", import.meta.url), sessionPath);
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...producerRelativePaths]
  );
  const receiptPath = path.join(repositoryRoot, "evidence", "real-helper-attack.json");
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let observedMaliciousBytes = false;
  let result = null;
  let runError = null;
  try {
    result = await runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad({ pgid: 91_302, pid: 91_301, startToken: "real-g03-helper-attack" });
        await fs.writeFile(helperPath, helperMalicious);
        observedMaliciousBytes = (await fs.readFile(helperPath)).equals(helperMalicious);
        await fs.writeFile(helperPath, helperOriginal);
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: {
        args: ["test", ...producerRelativePaths],
        command: process.execPath,
        cwd: repositoryRoot
      },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths,
      terminalCleanup: async () => {}
    });
  } catch (error) {
    runError = error;
  }

  assert.equal(observedMaliciousBytes, true);
  assert.deepEqual(await fs.readFile(helperPath), helperOriginal);
  assert.equal(
    runtimeSourcePaths.includes(helperPath),
    true,
    `G03 helper escaped the runtime closure; boundaries=${JSON.stringify(
      result?.receipt.boundaries.map(({ name, status }) => ({ name, status })) ?? null
    )}`
  );
  assert.ok(runError, "held G03 helper mutation must reject the full-run hold");
});

test("real fixed setup, canonical CLI, and G03-G06 first-party closure is deterministic and complete", () => {
  const repositoryRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const playwrightArgs = ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS];
  const first = starshipPlaywrightFullRunRuntimeSourcePaths(repositoryRoot, playwrightArgs);
  const second = starshipPlaywrightFullRunRuntimeSourcePaths(repositoryRoot, playwrightArgs);
  assert.deepEqual(second, first);
  assert.equal(new Set(first).size, first.length);
  const relativePaths = first.map((sourcePath) => path.relative(repositoryRoot, sourcePath));
  for (const requiredRelativePath of [
    ...FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS,
    ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS,
    "components/visualizations/mainland/SignedRealNumberLineLab.tsx",
    "components/visualizations/mainland/FractionOperationsLab.tsx",
    "components/visualizations/mainland/PercentApplicationsLab.tsx",
    "components/visualizations/mainland/RatioProportionScaleModel.ts",
    "data/visualizationLabs.ts",
    "lib/lessonLinks.ts",
    "lib/session.ts",
    "tests/e2e/china-visualization-collision-receipt.ts",
    "tests/e2e/helpers.ts",
    "tests/e2e/hk-visualization-text-contrast-scanner.ts"
  ]) {
    assert.equal(relativePaths.includes(requiredRelativePath), true, requiredRelativePath);
  }
});

test("first-party closure resolves only supported direct and index source forms while ignoring builtins and packages", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
  const directSpecifiers = extensions.map((extension) => `./direct-${extension.slice(1)}`);
  const indexSpecifiers = extensions.map((extension) => `./index-${extension.slice(1)}`);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  await fs.writeFile(
    g03Path,
    [
      'import "node:path";',
      'import "@playwright/test";',
      ...directSpecifiers.map((specifier) => `import ${JSON.stringify(specifier)};`),
      ...indexSpecifiers.map((specifier) => `import ${JSON.stringify(specifier)};`),
      ""
    ].join("\n")
  );
  const directPaths = [];
  const indexPaths = [];
  for (const extension of extensions) {
    const directPath = path.join(
      repositoryRoot,
      "tests/e2e",
      `direct-${extension.slice(1)}${extension}`
    );
    const indexPath = path.join(
      repositoryRoot,
      "tests/e2e",
      `index-${extension.slice(1)}`,
      `index${extension}`
    );
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    const sourceBytes = extension === ".json" ? "{}\n" : "export {};\n";
    await fs.writeFile(directPath, sourceBytes, { mode: 0o600 });
    await fs.writeFile(indexPath, sourceBytes, { mode: 0o600 });
    directPaths.push(directPath);
    indexPaths.push(indexPath);
  }
  const sources = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.deepEqual(sources.slice(-(directPaths.length + indexPaths.length)), [
    ...directPaths,
    ...indexPaths
  ]);
});

test("first-party closure rejects an existing import with an unsupported source extension", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  await fs.writeFile(g03Path, 'import "./unsupported.txt";\n');
  await fs.writeFile(
    path.join(repositoryRoot, "tests/e2e/unsupported.txt"),
    "export {};\n",
    { mode: 0o600 }
  );
  assert.throws(
    () => starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    ),
    /first-party import|extension|resolve|exactly one/iu
  );
});

test("first-party closure fails closed on unresolved, escaping, symlinked, and ambiguous imports", async (t) => {
  const cases = ["unresolved", "escape", "symlink", "ambiguous"];
  for (const caseName of cases) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    if (caseName === "unresolved") {
      await fs.writeFile(g03Path, 'import "./missing";\n');
    } else if (caseName === "escape") {
      await fs.writeFile(g03Path, 'import "../../../outside";\n');
    } else if (caseName === "symlink") {
      const targetPath = path.join(repositoryRoot, "tests/e2e/symlink-target.ts");
      await fs.writeFile(targetPath, "export {};\n", { mode: 0o600 });
      await fs.symlink(targetPath, path.join(repositoryRoot, "tests/e2e/symlink-source.ts"));
      await fs.writeFile(g03Path, 'import "./symlink-source.ts";\n');
    } else {
      await fs.writeFile(g03Path, 'import "./ambiguous";\n');
      const primaryPath = path.join(repositoryRoot, "tests/e2e/ambiguous.ts");
      await fs.writeFile(primaryPath, "export {};\n", { mode: 0o600 });
      await fs.link(primaryPath, path.join(repositoryRoot, "tests/e2e/ambiguous.tsx"));
    }
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /first-party import|escape|symlink|resolve|exactly one/iu,
      caseName
    );
  }
});

test("held-byte graph validation rejects an omitted dependency before prebuild or child spawn", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const entryPath = path.join(repositoryRoot, "held-entry.ts");
  const helperPath = path.join(repositoryRoot, "held-helper.ts");
  const receiptPath = path.join(repositoryRoot, "evidence", "held-graph-mismatch.json");
  await fs.writeFile(entryPath, 'import "./held-helper";\n', { mode: 0o600 });
  await fs.writeFile(helperPath, "export const held = true;\n", { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async () => {
        childCount += 1;
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath,
      repositoryRoot,
      runtimeSourceEntryPaths: [entryPath],
      runtimeSourcePaths: [entryPath],
      terminalCleanup: async () => {}
    }),
    (error) => {
      assert.match(
        [error.message, ...(error.errors ?? []).map((entry) => entry.message)].join(" | "),
        /held-byte import graph|unheld runtime source|first-party import|live first-party candidate|captured ordered closure/iu
      );
      return true;
    }
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.deepEqual(receipt.orderedSourcePaths, [entryPath]);
  assert.equal(receipt.boundaries.find(({ name }) => name === "opened").status, "failed");
  assert.equal(
    receipt.boundaries.find(({ name }) => name === "postPrebuildPreSpawn").status,
    "failed"
  );
  assert.equal(receipt.boundaries.find(({ name }) => name === "postSpawnLoad").status, "not-reached");
  assert.equal(
    receipt.boundaries.find(({ name }) => name === "immediatelyAfterChildExit").status,
    "not-reached"
  );
  assert.equal(receipt.boundaries.find(({ name }) => name === "beforeReceiptClose").status, "failed");
});

test("new higher-priority direct candidate appearing before descriptor capture invalidates the initial index edge", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const choiceIndexPath = path.join(repositoryRoot, "tests/e2e/choice/index.ts");
  const higherPriorityPath = path.join(repositoryRoot, "tests/e2e/choice.ts");
  await fs.writeFile(g03Path, 'import "./choice";\n', { mode: 0o600 });
  await fs.mkdir(path.dirname(choiceIndexPath), { recursive: true });
  await fs.writeFile(choiceIndexPath, "export const initialChoice = true;\n", { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.equal(runtimeSourcePaths.includes(choiceIndexPath), true);
  assert.equal(runtimeSourcePaths.includes(higherPriorityPath), false);
  await fs.writeFile(higherPriorityPath, "export const appearedChoice = true;\n", {
    mode: 0o600
  });
  const receiptPath = path.join(repositoryRoot, "evidence", "candidate-appearance.json");
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        childCount += 1;
        postSpawnLoad({ pgid: 96_102, pid: 96_101, startToken: "candidate-appearance" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath,
      repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(repositoryRoot),
      runtimeSourcePaths,
      terminalCleanup: async () => {}
    }),
    /candidate|closure|edge|graph|held|priority|runtime source/iu
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
});

test("byte-identical candidate replacement before descriptor capture cannot inherit the initial closure plan", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const choicePath = path.join(repositoryRoot, "tests/e2e/replaced-choice.ts");
  const displacedPath = `${choicePath}.initial`;
  const original = Buffer.from("export const replacementChoice = true;\n");
  await fs.writeFile(g03Path, 'import "./replaced-choice";\n', { mode: 0o600 });
  await fs.writeFile(choicePath, original, { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  await fs.rename(choicePath, displacedPath);
  await fs.writeFile(choicePath, original, { mode: 0o600 });
  const receiptPath = path.join(repositoryRoot, "evidence", "candidate-replacement.json");
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        childCount += 1;
        postSpawnLoad({ pgid: 96_202, pid: 96_201, startToken: "candidate-replacement" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath,
      repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(repositoryRoot),
      runtimeSourcePaths,
      terminalCleanup: async () => {}
    }),
    /candidate|closure|identity|inode|receipt|runtime source/iu
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
  assert.deepEqual(await fs.readFile(choicePath), original);
  assert.deepEqual(await fs.readFile(displacedPath), original);
});

test("deep sibling candidate appearing after graph recompute fails the opened boundary before prebuild or child", async (t) => {
  const fixture = await createDeepSiblingCandidateFixture(t, "after-capture");
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        childCount += 1;
        postSpawnLoad({ pgid: 96_302, pid: 96_301, startToken: "deep-after-capture" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: fixture.repositoryRoot },
      operations: {
        afterSourcesCaptured() {
          writeFileSync(fixture.directPath, "export const lateDirect = true;\n", { mode: 0o600 });
        }
      },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath: fixture.receiptPath,
      repositoryRoot: fixture.repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(fixture.repositoryRoot),
      runtimeSourcePaths: fixture.runtimeSourcePaths,
      terminalCleanup: async () => {}
    }),
    /candidate|closure|directory|edge|graph|held|parent|runtime source/iu
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
  assert.equal((await fs.lstat(fixture.directPath)).isFile(), true);
});

test("deep sibling candidate mutate-load-restore during child remains RED on the resolution-directory token", async (t) => {
  const fixture = await createDeepSiblingCandidateFixture(t, "child-transient");
  let prebuildCount = 0;
  let childCount = 0;
  let observedTransient = false;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        childCount += 1;
        postSpawnLoad({ pgid: 96_402, pid: 96_401, startToken: "deep-child-transient" });
        await fs.writeFile(fixture.directPath, "export const childTransient = true;\n", {
          mode: 0o600
        });
        observedTransient = /childTransient/u.test(await fs.readFile(fixture.directPath, "utf8"));
        await fs.unlink(fixture.directPath);
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: fixture.repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath: fixture.receiptPath,
      repositoryRoot: fixture.repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(fixture.repositoryRoot),
      runtimeSourcePaths: fixture.runtimeSourcePaths,
      terminalCleanup: async () => {}
    }),
    /candidate|closure|directory|edge|graph|held|parent|runtime source/iu
  );
  assert.equal(prebuildCount, 1);
  assert.equal(childCount, 1);
  assert.equal(observedTransient, true);
  await assert.rejects(fs.lstat(fixture.directPath), { code: "ENOENT" });
  assert.equal((await fs.lstat(fixture.indexPath)).isFile(), true);
});

test("deep sibling candidate mutate-load-restore during terminal cleanup fails before receipt close", async (t) => {
  const fixture = await createDeepSiblingCandidateFixture(t, "cleanup-transient");
  let prebuildCount = 0;
  let childCount = 0;
  let cleanupCount = 0;
  let observedTransient = false;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        childCount += 1;
        postSpawnLoad({ pgid: 96_502, pid: 96_501, startToken: "deep-cleanup-transient" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: fixture.repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath: fixture.receiptPath,
      repositoryRoot: fixture.repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(fixture.repositoryRoot),
      runtimeSourcePaths: fixture.runtimeSourcePaths,
      terminalCleanup: async () => {
        cleanupCount += 1;
        await fs.writeFile(fixture.directPath, "export const cleanupTransient = true;\n", {
          mode: 0o600
        });
        observedTransient = /cleanupTransient/u.test(await fs.readFile(fixture.directPath, "utf8"));
        await fs.unlink(fixture.directPath);
      }
    }),
    /candidate|closure|directory|edge|graph|held|parent|runtime source/iu
  );
  assert.equal(prebuildCount, 1);
  assert.equal(childCount, 1);
  assert.equal(cleanupCount, 1);
  assert.equal(observedTransient, true);
  await assert.rejects(fs.lstat(fixture.directPath), { code: "ENOENT" });
});

test("raw full-run receipt independently carries exact closure and resolution-directory authority", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const importerPath = path.join(
    repositoryRoot,
    FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]
  );
  const indexPath = path.join(repositoryRoot, "tests", "deep", "choice", "index.ts");
  const secondPath = path.join(repositoryRoot, "tests", "e2e", "second-edge.ts");
  await fs.writeFile(
    importerPath,
    'import "../deep/choice";\nimport "./second-edge";\n',
    { mode: 0o600 }
  );
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, "export const rawChoice = true;\n", { mode: 0o600 });
  await fs.writeFile(secondPath, "export const secondEdge = true;\n", { mode: 0o600 });
  const entryPaths = fullRunStaticEntryPaths(repositoryRoot);
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  const expectedEdges = [
    { importerPath, resolvedPath: indexPath, specifier: "../deep/choice" },
    { importerPath, resolvedPath: secondPath, specifier: "./second-edge" }
  ];
  const expectedResolutionDirectoryPaths = [
    repositoryRoot,
    path.join(repositoryRoot, "tests"),
    path.join(repositoryRoot, "tests", "deep"),
    path.join(repositoryRoot, "tests", "deep", "choice"),
    path.join(repositoryRoot, "tests", "e2e")
  ];
  const receiptPath = path.join(repositoryRoot, "evidence", "raw-authority.json");
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const result = await runStarshipFullExecutionSourceHold({
    executeChild: async ({ childExited, postSpawnLoad }) => {
      postSpawnLoad({ pgid: 96_602, pid: 96_601, startToken: "raw-authority" });
      childExited({ code: 0, signal: null, spawnError: null });
    },
    invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
    prebuild: async () => ({ status: "prebuilt" }),
    receiptPath,
    repositoryRoot,
    runtimeSourceEntryPaths: entryPaths,
    runtimeSourcePaths,
    terminalCleanup: async () => {}
  });
  const rawBytes = await fs.readFile(receiptPath);
  assert.deepEqual(JSON.parse(rawBytes), result.receipt);
  const expectations = {
    entryPaths,
    expectedEdges,
    expectedResolutionDirectoryPaths,
    orderedSourcePaths: runtimeSourcePaths
  };
  validateRawFullRunAuthorityReceipt(result.receipt, expectations);

  const mutations = [
    ["omitted directory", (receipt) => receipt.resolutionDirectories.shift()],
    ["reordered directory", (receipt) => receipt.resolutionDirectories.reverse()],
    ["foreign directory", (receipt) => {
      receipt.resolutionDirectories[0].path = "/Volumes/Starship/foreign-resolution-directory";
      receipt.resolutionDirectories[0].held.path = receipt.resolutionDirectories[0].path;
    }],
    ["omitted edge", (receipt) => receipt.closure.expectedEdges.shift()],
    ["reordered edge", (receipt) => receipt.closure.expectedEdges.reverse()],
    ["foreign edge", (receipt) => {
      receipt.closure.expectedEdges[0].resolvedPath = "/Volumes/Starship/foreign-edge.ts";
    }],
    ["omitted boundary join", (receipt) => {
      receipt.boundaries[0].resolutionDirectories.shift();
    }],
    ["foreign boundary join", (receipt) => {
      const join = receipt.boundaries[0].resolutionDirectories[0];
      join.resolutionDirectoryPath = "/Volumes/Starship/foreign-resolution-directory";
      join.path.path = join.resolutionDirectoryPath;
      join.descriptor.path = join.resolutionDirectoryPath;
    }],
    ["changed boundary join", (receipt) => {
      receipt.boundaries[0].resolutionDirectories[0].descriptor.ctimeNs = "0";
    }]
  ];
  for (const [label, mutate] of mutations) {
    const mutated = structuredClone(result.receipt);
    mutate(mutated);
    assert.throws(
      () => validateRawFullRunAuthorityReceipt(mutated, expectations),
      /authority|boundary|closure|directory|edge|identity|join|order|receipt/iu,
      label
    );
  }
});

test("disappearing initially resolved candidate blocks capture before prebuild or child", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const choicePath = path.join(repositoryRoot, "tests/e2e/disappearing-choice.ts");
  await fs.writeFile(g03Path, 'import "./disappearing-choice";\n', { mode: 0o600 });
  await fs.writeFile(choicePath, "export const disappearingChoice = true;\n", { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  await fs.unlink(choicePath);
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async () => {
        childCount += 1;
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath: path.join(repositoryRoot, "evidence", "candidate-disappearance.json"),
      repositoryRoot,
      runtimeSourceEntryPaths: fullRunStaticEntryPaths(repositoryRoot),
      runtimeSourcePaths,
      terminalCleanup: async () => {}
    }),
    /ENOENT|candidate|closure|runtime source/iu
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
});

test("extensionless resolution uses exact supported extension precedence before index precedence", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const imports = [];
  const expectedPaths = [];
  for (let winnerIndex = 0; winnerIndex < extensions.length; winnerIndex += 1) {
    const directBase = path.join(repositoryRoot, "tests/e2e", `direct-priority-${winnerIndex}`);
    const indexBase = path.join(repositoryRoot, "tests/e2e", `index-priority-${winnerIndex}`);
    imports.push(`import ${JSON.stringify(`./direct-priority-${winnerIndex}`)};`);
    imports.push(`import ${JSON.stringify(`./index-priority-${winnerIndex}`)};`);
    for (let candidateIndex = winnerIndex; candidateIndex < extensions.length; candidateIndex += 1) {
      const extension = extensions[candidateIndex];
      const bytes = extension === ".json" ? "{}\n" : "export {};\n";
      await fs.writeFile(`${directBase}${extension}`, bytes, { mode: 0o600 });
      await fs.mkdir(indexBase, { recursive: true });
      await fs.writeFile(path.join(indexBase, `index${extension}`), bytes, { mode: 0o600 });
    }
    expectedPaths.push(`${directBase}${extensions[winnerIndex]}`);
    expectedPaths.push(path.join(indexBase, `index${extensions[winnerIndex]}`));
  }
  const directOverIndexBase = path.join(repositoryRoot, "tests/e2e/direct-over-index");
  imports.push('import "./direct-over-index";');
  await fs.writeFile(`${directOverIndexBase}.json`, "{}\n", { mode: 0o600 });
  await fs.mkdir(directOverIndexBase, { recursive: true });
  await fs.writeFile(path.join(directOverIndexBase, "index.ts"), "export {};\n", {
    mode: 0o600
  });
  expectedPaths.push(`${directOverIndexBase}.json`);
  await fs.writeFile(g03Path, `${imports.join("\n")}\n`, { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.deepEqual(runtimeSourcePaths.slice(-expectedPaths.length), expectedPaths);
  assert.equal(runtimeSourcePaths.includes(path.join(directOverIndexBase, "index.ts")), false);
});

test("static import, export, dynamic import, and require forms cannot silently escape the closure", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const forms = [
    ["import-type", 'import type { Value } from "./import-type";'],
    ["export-from", 'export { value } from "./export-from";'],
    ["export-type", 'export type { Value } from "./export-type";'],
    ["dynamic-import", 'void import("./dynamic-import");'],
    ["require-call", 'void require("./require-call");'],
    ["import-equals", 'import required = require("./import-equals"); void required;'],
    ["require-call-member", 'void require.call(null, "./require-call-member");'],
    ["module-require", 'void module.require("./module-require");'],
    ["module-element-require", 'void module["require"]("./module-element-require");']
  ];
  await fs.writeFile(g03Path, `${forms.map(([, source]) => source).join("\n")}\n`, {
    mode: 0o600
  });
  const expectedPaths = [];
  for (const [name] of forms) {
    const dependencyPath = path.join(repositoryRoot, "tests/e2e", `${name}.ts`);
    await fs.writeFile(
      dependencyPath,
      "export type Value = true; export const value = true;\n",
      { mode: 0o600 }
    );
    expectedPaths.push(dependencyPath);
  }
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  for (const expectedPath of expectedPaths) {
    assert.equal(runtimeSourcePaths.includes(expectedPath), true, expectedPath);
  }
});

test("unsupported first-party require resolution forms fail closed instead of being omitted", async (t) => {
  for (const source of ['void require.resolve("./resolve-only");\n']) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await assert.rejects(
      async () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /non-static|unsupported|require|first-party/iu,
      source.trim()
    );
  }
});

test("computed and dynamic first-party loader forms fail closed", async (t) => {
  for (const source of [
    'const target = "./dynamic-require"; void require(target);\n',
    'const target = "./dynamic-import"; void import(target);\n',
    'const method = "call"; void require[method](null, "./computed-require-call");\n',
    'const method = "require"; void module[method]("./computed-module-require");\n',
    'const target = "./dynamic-require-call"; void require.call(null, target);\n',
    'const target = "./dynamic-module-require"; void module["require"](target);\n',
    'void require.apply(null, ["./applied-require"]);\n',
    'void (0, require)("./sequenced-require");\n',
    'void module.require.call(module, "./nested-module-require-call");\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await assert.rejects(
      async () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /computed|dynamic|non-static|unsupported|require|loader/iu,
      source.trim()
    );
  }
});

test("loader aliases and renamed or indirect first-party calls fail closed", async (t) => {
  for (const source of [
    'const load = require; void load("./direct-alias");\n',
    'const load = module.require; void load("./module-alias");\n',
    'const { require: load } = module; void load("./destructured-alias");\n',
    'let load; load = require; void load("./assigned-alias");\n',
    'let load; ({ require: load } = module); void load("./assigned-destructured-alias");\n',
    'const renamed = module["require"]; void renamed("./renamed-alias");\n',
    'const first = require; const second = first; void second("./indirect-alias");\n',
    'const holder = { load: require }; void holder.load("./object-alias");\n',
    'export { require as exportedLoader };\n',
    'export default require;\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await assert.rejects(
      async () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /alias|escape|non-static|unsupported|require|loader/iu,
      source.trim()
    );
  }
});

test("computed destructuring and module-object aliases cannot omit an existing dependency", async (t) => {
  for (const source of [
    'const { ["require"]: load } = module; void load("./escaped");\n',
    'let load; ({ ["require"]: load } = module); void load("./escaped");\n',
    'const key = "require"; const { [key]: load } = module; void load("./escaped");\n',
    'const m = module; void m["require"]("./escaped");\n',
    'let m; m = module; void m["require"]("./escaped");\n',
    'let first; let second; first = second = module; void first.require("./escaped");\n',
    'const { call: invoke } = require; void invoke(null, "./escaped");\n',
    'let invoke; ({ call: invoke } = require); void invoke(null, "./escaped");\n',
    'function sink(value) { return value; } void sink(require);\n',
    'function expose() { return module; } void expose;\n',
    'const values = [require, module]; void values;\n',
    'const values = { load: require, moduleObject: module }; void values;\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    const dependencyPath = path.join(repositoryRoot, "tests", "e2e", "escaped.ts");
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await fs.writeFile(dependencyPath, "export const escaped = true;\n", { mode: 0o600 });
    let acceptedPaths = null;
    let rejection = null;
    try {
      acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      );
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection,
      `${source.trim()} was accepted; escaped dependency included=${acceptedPaths?.includes(dependencyPath)}`
    );
    assert.match(rejection.message, /alias|escape|module|non-static|require|loader/iu);
  }
});

test("ordinary require-named members and shadowed loader bindings are not false positives", async (t) => {
  for (const source of [
    'const client = { require(value) { return value; } }; void client.require("./ordinary");\n',
    'const client = { require(value) { return value; } }; void client["require"]("./ordinary");\n',
    'const client = { require(value) { return value; } }; const callback = client.require; void callback;\n',
    'const client = { require(value) { return value; } }; const { require: callback } = client; void callback;\n',
    'const client = { require(value) { return value; } }; const { require } = client; void require("./ordinary-destructure");\n',
    'const client = { require(value) { return value; } }; let require; ({ require } = client); void require("./ordinary-assignment");\n',
    'function local(require, module) { require("./shadowed-param"); module.require("./shadowed-module-param"); } void local;\n',
    'const require = (value) => value; void require("./shadowed-variable");\n',
    'const module = { require(value) { return value; } }; void module.require("./shadowed-module-variable");\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(
      runtimeSourcePaths.some((sourcePath) => /ordinary|shadowed/u.test(sourcePath)),
      false,
      source.trim()
    );
  }
});

test("nested shadowed bindings do not hide the outer real require loader", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const realDependencyPath = path.join(repositoryRoot, "tests", "e2e", "outer-real.ts");
  await fs.writeFile(
    g03Path,
    [
      'function local(require, module) { require("./shadowed"); module.require("./shadowed-module"); }',
      'void require("./outer-real");',
      "void local;",
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
  await fs.writeFile(realDependencyPath, "export const outerReal = true;\n", { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.equal(runtimeSourcePaths.includes(realDependencyPath), true);
  assert.equal(runtimeSourcePaths.some((sourcePath) => /shadowed/u.test(sourcePath)), false);
});

test("renamed createRequire bindings retain loader provenance", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  const realDependencyPath = path.join(repositoryRoot, "tests", "e2e", "factory-loader.ts");
  await fs.writeFile(
    g03Path,
    [
      'import { createRequire as makeRequire } from "node:module";',
      "const load = makeRequire(import.meta.url);",
      'void load("./factory-loader");',
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
  await fs.writeFile(realDependencyPath, "export const factoryLoader = true;\n", { mode: 0o600 });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.equal(runtimeSourcePaths.includes(realDependencyPath), true);

  await fs.writeFile(
    g03Path,
    [
      'import { createRequire as makeRequire } from "node:module";',
      "const load = makeRequire(import.meta.url);",
      "function sink(value) { return value; }",
      "void sink(load);",
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
  assert.throws(
    () => starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    ),
    /alias|escape|require|loader/iu
  );
});

test("createRequire factories cannot escape or change the first-party resolution base", async (t) => {
  for (const source of [
    [
      'import { createRequire as makeRequire } from "node:module";',
      "const factory = makeRequire;",
      "const load = factory(import.meta.url);",
      'void load("./escaped-factory");',
      ""
    ].join("\n"),
    [
      'import { createRequire as makeRequire } from "node:module";',
      'const load = makeRequire("/tmp/foreign-base.cjs");',
      'void load("./escaped-base");',
      ""
    ].join("\n"),
    [
      'import * as nodeModule from "node:module";',
      "const factory = nodeModule.createRequire;",
      "const load = factory(import.meta.url);",
      'void load("./escaped-namespace");',
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /alias|base|escape|factory|require|loader/iu,
      source.trim()
    );
  }
});

test("unsupported Node createRequire acquisition forms fail closed", async (t) => {
  for (const source of [
    [
      'const load = require("node:module").createRequire(import.meta.url);',
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'const load = require("node:module").createRequire(__filename);',
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'const load = require.call(null, "node:module").createRequire(import.meta.url);',
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = module.constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = module.__proto__.constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = module.parent.constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = module.children[0].constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = require.main.constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      "const load = require.cache[__filename].constructor.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import { Module } from "node:module";',
      "const load = Module.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import NodeModule from "node:module";',
      "const load = NodeModule.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import * as nodeModule from "node:module";',
      "const load = nodeModule.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import * as nodeModule from "node:module";',
      'const load = nodeModule["createRequire"](import.meta.url);',
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import * as nodeModule from "node:module";',
      'const factoryName = "createRequire";',
      "const load = nodeModule[factoryName](import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'import nodeModule = require("node:module");',
      "const load = nodeModule.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n"),
    [
      'const nodeModule = await import("node:module");',
      "const load = nodeModule.createRequire(import.meta.url);",
      'void load("./escaped-acquisition");',
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    const dependencyPath = path.join(
      repositoryRoot,
      "tests",
      "e2e",
      "escaped-acquisition.ts"
    );
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await fs.writeFile(dependencyPath, "export const escapedAcquisition = true;\n", {
      mode: 0o600
    });
    let acceptedPaths = null;
    let rejection = null;
    try {
      acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      );
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection,
      `${source.trim()} was accepted; dependency included=${acceptedPaths?.includes(dependencyPath)}`
    );
    assert.match(rejection.message, /createRequire|factory|loader|module|unsupported|escape/iu);
  }
});

test("exported and re-exported loader factories fail in the exporter before importer execution", async (t) => {
  const cases = [
    {
      files: {
        "loader-helper.ts": [
          'import { createRequire } from "node:module";',
          "export const load = createRequire(import.meta.url);",
          ""
        ].join("\n")
      },
      importer: 'import { load } from "./loader-helper"; void load("./escaped-export");\n'
    },
    {
      files: {
        "loader-helper.ts": [
          'import { createRequire } from "node:module";',
          "const load = createRequire(import.meta.url);",
          "export { load };",
          ""
        ].join("\n")
      },
      importer: 'import { load } from "./loader-helper"; void load("./escaped-export");\n'
    },
    {
      files: {
        "loader-helper.ts": [
          'import { createRequire } from "node:module";',
          "const load = createRequire(import.meta.url);",
          "export default load;",
          ""
        ].join("\n")
      },
      importer: 'import load from "./loader-helper"; void load("./escaped-export");\n'
    },
    {
      files: {
        "factory-barrel.ts": 'export { createRequire as makeRequire } from "node:module";\n'
      },
      importer: [
        'import { makeRequire } from "./factory-barrel";',
        "const load = makeRequire(import.meta.url);",
        'void load("./escaped-export");',
        ""
      ].join("\n")
    },
    {
      files: {
        "factory-barrel.ts": [
          'import { createRequire } from "node:module";',
          "export { createRequire as makeRequire };",
          ""
        ].join("\n")
      },
      importer: [
        'import { makeRequire } from "./factory-barrel";',
        "const load = makeRequire(import.meta.url);",
        'void load("./escaped-export");',
        ""
      ].join("\n")
    },
    {
      files: {
        "factory-barrel.ts": 'export { Module } from "node:module";\n'
      },
      importer: [
        'import { Module } from "./factory-barrel";',
        "const load = Module.createRequire(import.meta.url);",
        'void load("./escaped-export");',
        ""
      ].join("\n")
    },
    {
      files: {
        "factory-leaf.ts": 'export { createRequire as makeRequire } from "node:module";\n',
        "factory-barrel.ts": 'export { makeRequire } from "./factory-leaf";\n'
      },
      importer: [
        'import { makeRequire } from "./factory-barrel";',
        "const load = makeRequire(import.meta.url);",
        'void load("./escaped-export");',
        ""
      ].join("\n")
    },
    {
      files: {
        "factory-barrel.ts": 'export { default as Module } from "node:module";\n'
      },
      importer: [
        'import { Module } from "./factory-barrel";',
        "const load = Module.createRequire(import.meta.url);",
        'void load("./escaped-export");',
        ""
      ].join("\n")
    }
  ];
  for (const { files, importer } of cases) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const e2eRoot = path.join(repositoryRoot, "tests", "e2e");
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    const dependencyPath = path.join(e2eRoot, "escaped-export.ts");
    await fs.writeFile(g03Path, importer, { mode: 0o600 });
    for (const [relativePath, source] of Object.entries(files)) {
      await fs.writeFile(path.join(e2eRoot, relativePath), source, { mode: 0o600 });
    }
    await fs.writeFile(dependencyPath, "export const escapedExport = true;\n", { mode: 0o600 });
    let acceptedPaths = null;
    let rejection = null;
    try {
      acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      );
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection,
      `${importer.trim()} was accepted; dependency included=${acceptedPaths?.includes(dependencyPath)}`
    );
    assert.match(rejection.message, /createRequire|export|factory|loader|module|unsupported|escape/iu);
  }
});

test("ordinary shadowed factory-shaped owners remain non-loaders", async (t) => {
  for (const source of [
    [
      "const require = () => ({ createRequire: () => (value) => value });",
      'const load = require("node:module").createRequire(import.meta.url);',
      'void load("./ordinary-shadowed-require");',
      ""
    ].join("\n"),
    [
      "const module = { constructor: { createRequire: () => (value) => value } };",
      "const load = module.constructor.createRequire(import.meta.url);",
      'void load("./ordinary-shadowed-module");',
      ""
    ].join("\n"),
    [
      "const Module = { createRequire: () => (value) => value };",
      "const load = Module.createRequire(import.meta.url);",
      'void load("./ordinary-local-Module");',
      ""
    ].join("\n"),
    [
      "const nodeModule = { createRequire: () => (value) => value };",
      "const load = nodeModule.createRequire(import.meta.url);",
      'void load("./ordinary-local-namespace");',
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(
      runtimeSourcePaths.some((sourcePath) => /ordinary-(shadowed|local)/u.test(sourcePath)),
      false,
      source.trim()
    );
  }
});

test("global dynamic Node loading forms fail closed before omitting first-party code", async (t) => {
  for (const source of [
    'void eval(\'require("./escaped-dynamic-loader")\');\n',
    'void Function(\'return require("./escaped-dynamic-loader")\')();\n',
    'void new Function(\'return require("./escaped-dynamic-loader")\')();\n',
    [
      'const load = process.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-dynamic-loader");',
      ""
    ].join("\n"),
    [
      'import { Module } from "node:module";',
      'void Module._load("./escaped-dynamic-loader", module, false);',
      ""
    ].join("\n"),
    'void module.constructor._load("./escaped-dynamic-loader", module, false);\n',
    'void require.main.require("./escaped-dynamic-loader");\n',
    'void module.parent.require("./escaped-dynamic-loader");\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    const dependencyPath = path.join(
      repositoryRoot,
      "tests",
      "e2e",
      "escaped-dynamic-loader.ts"
    );
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await fs.writeFile(dependencyPath, "export const escapedDynamicLoader = true;\n", {
      mode: 0o600
    });
    let acceptedPaths = null;
    let rejection = null;
    try {
      acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      );
    } catch (error) {
      rejection = error;
    }
    assert.ok(
      rejection,
      `${source.trim()} was accepted; dependency included=${acceptedPaths?.includes(dependencyPath)}`
    );
    assert.match(rejection.message, /dynamic|eval|Function|loader|module|require|unsupported|escape/iu);
  }
});

test("shadowed dynamic-loader-shaped globals remain ordinary application bindings", async (t) => {
  for (const source of [
    'const eval = (value) => value; void eval("./ordinary-shadowed-eval");\n',
    'const Function = (value) => () => value; void Function("./ordinary-shadowed-Function")();\n',
    [
      "const process = { getBuiltinModule: () => ({ createRequire: () => (value) => value }) };",
      'const load = process.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./ordinary-shadowed-process");',
      ""
    ].join("\n"),
    [
      "const Module = { _load: (value) => value };",
      'void Module._load("./ordinary-shadowed-Module");',
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(
      runtimeSourcePaths.some((sourcePath) => /ordinary-shadowed/u.test(sourcePath)),
      false,
      source.trim()
    );
  }
});

test("aliased global Function cannot execute a first-party dependency omitted from the closure", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const source = [
    "const F = Function;",
    [
      "void F(",
      '  \'return process.getBuiltinModule("module").createRequire(arguments[0])\' +',
      '  \'("./escaped-review.cjs")\'',
      ")(import.meta.url);"
    ].join("\n"),
    ""
  ].join("\n");
  const markerKey = "__starshipC15AliasedFunctionActuallyExecuted";
  const { dependencyActuallyExecuted, dependencyPath } =
    await executeC15DynamicLoaderFixture({ markerKey, repositoryRoot, source });
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  await fs.writeFile(g03Path, source, { mode: 0o600 });
  let acceptedPaths = null;
  let rejection = null;
  try {
    acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
  } catch (error) {
    rejection = error;
  }
  assert.equal(dependencyActuallyExecuted, true);
  assert.ok(
    rejection,
    `aliased Function source accepted=${acceptedPaths !== null}; ` +
      `dependencyIncluded=${acceptedPaths?.includes(dependencyPath)}; ` +
      `dependencyActuallyExecuted=${dependencyActuallyExecuted}`
  );
  assert.match(rejection.message, /dynamic|Function|loader|unsupported|escape/iu);
});

test("bound process.getBuiltinModule cannot execute a first-party dependency omitted from the closure", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const source = [
    "const getBuiltin = process.getBuiltinModule.bind(process);",
    'const load = getBuiltin("module").createRequire(import.meta.url);',
    'void load("./escaped-review.cjs");',
    ""
  ].join("\n");
  const markerKey = "__starshipC15BoundGetBuiltinActuallyExecuted";
  const { dependencyActuallyExecuted, dependencyPath } =
    await executeC15DynamicLoaderFixture({ markerKey, repositoryRoot, source });
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  await fs.writeFile(g03Path, source, { mode: 0o600 });
  let acceptedPaths = null;
  let rejection = null;
  try {
    acceptedPaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
  } catch (error) {
    rejection = error;
  }
  assert.equal(dependencyActuallyExecuted, true);
  assert.ok(
    rejection,
    `bound getBuiltinModule source accepted=${acceptedPaths !== null}; ` +
      `dependencyIncluded=${acceptedPaths?.includes(dependencyPath)}; ` +
      `dependencyActuallyExecuted=${dependencyActuallyExecuted}`
  );
  assert.match(rejection.message, /getBuiltinModule|loader|module|unsupported|escape/iu);
});

test("unshadowed eval and Function capabilities cannot escape through aliases or call adapters", async (t) => {
  const dynamicBody =
    'return process.getBuiltinModule("module").createRequire(arguments[0])("./escaped-capability.cjs")';
  const evalBody =
    'process.getBuiltinModule("module").createRequire("/tmp/c15-base.cjs")("./escaped-capability.cjs")';
  for (const source of [
    `const execute = eval; void execute(${JSON.stringify(evalBody)});\n`,
    `let execute; execute = eval; void execute(${JSON.stringify(evalBody)});\n`,
    `const holder = { execute: eval }; void holder.execute(${JSON.stringify(evalBody)});\n`,
    "function sink(value) { return value; } void sink(eval);\n",
    "function expose() { return eval; } void expose;\n",
    "export default eval;\n",
    `void (0, eval)(${JSON.stringify(evalBody)});\n`,
    `void eval.call(null, ${JSON.stringify(evalBody)});\n`,
    `void eval.apply(null, [${JSON.stringify(evalBody)}]);\n`,
    `void Reflect.apply(eval, null, [${JSON.stringify(evalBody)}]);\n`,
    `const F = Function; void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const F = globalThis.Function; void new F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const F = global.Function; void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const root = globalThis; const F = root.Function; void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const root = global; const F = root["Function"]; void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const { Function: F } = globalThis; void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const holder = { root: globalThis }; void holder.root.Function(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `const F = Function.bind(null); void F(${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `void Function.call(null, ${JSON.stringify(dynamicBody)})(import.meta.url);\n`,
    `void Function.apply(null, [${JSON.stringify(dynamicBody)}])(import.meta.url);\n`,
    `void Reflect.apply(Function, null, [${JSON.stringify(dynamicBody)}])(import.meta.url);\n`,
    "function sink(value) { return value; } void sink(Function);\n",
    "function expose() { return Function; } void expose;\n",
    "const holder = [Function]; void holder;\n",
    "export default Function;\n"
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /dynamic|eval|Function|loader|unsupported|escape/iu,
      source.trim()
    );
  }
});

test("process.getBuiltinModule capability cannot escape direct binding provenance", async (t) => {
  for (const source of [
    [
      "const getBuiltin = process.getBuiltinModule;",
      'const load = getBuiltin("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      "const { getBuiltinModule: getBuiltin } = process;",
      'const load = getBuiltin("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      "const getBuiltin = process.getBuiltinModule.bind(process);",
      'const Module = getBuiltin("module");',
      'void Module._load("./escaped-get-builtin", null, false);',
      ""
    ].join("\n"),
    [
      'const Module = process.getBuiltinModule.call(process, "module");',
      'void Module._load("./escaped-get-builtin", null, false);',
      ""
    ].join("\n"),
    [
      'const Module = process.getBuiltinModule.apply(process, ["module"]);',
      'void Module._load("./escaped-get-builtin", null, false);',
      ""
    ].join("\n"),
    [
      'const Module = Reflect.apply(process.getBuiltinModule, process, ["module"]);',
      'void Module._load("./escaped-get-builtin", null, false);',
      ""
    ].join("\n"),
    "const holder = { getBuiltin: process.getBuiltinModule }; void holder;\n",
    "function sink(value) { return value; } void sink(process.getBuiltinModule);\n",
    "function expose() { return process.getBuiltinModule; } void expose;\n",
    "export const getBuiltin = process.getBuiltinModule;\n",
    [
      "const nodeProcess = process;",
      'const load = nodeProcess.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      'const load = globalThis.process.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      'const load = global.process.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      "const root = globalThis;",
      'const load = root.process.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n"),
    [
      "const { process: nodeProcess } = globalThis;",
      'const load = nodeProcess.getBuiltinModule("module").createRequire(import.meta.url);',
      'void load("./escaped-get-builtin");',
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /getBuiltinModule|dynamic|loader|module|process|unsupported|escape/iu,
      source.trim()
    );
  }
});

test("function and class constructor chains cannot synthesize a dynamic loader", async (t) => {
  const body =
    'return process.getBuiltinModule("module").createRequire(arguments[0])("./escaped-constructor.cjs")';
  for (const source of [
    `void (() => {}).constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `function Local() {} void Local.constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `class Local {} void Local.constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = function () {}; const F = local.constructor; void F(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = function () {}; const alias = local; void alias.constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = function () {}; let alias; alias = local; void alias.constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = function () {}; let first; let second; second = first = local; void second.constructor(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = function () {}; const { constructor: F } = local; void F(${JSON.stringify(body)})(import.meta.url);\n`,
    `const local = class {}; const holder = { F: local.constructor }; void holder;\n`
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /constructor|dynamic|Function|loader|unsupported|escape/iu,
      source.trim()
    );
  }
});

test("node:vm execution functions and their aliases or re-exports fail closed", async (t) => {
  const body =
    'process.getBuiltinModule("module").createRequire("/tmp/c15-vm.cjs")("./escaped-vm.cjs")';
  for (const source of [
    `import { runInThisContext } from "node:vm"; void runInThisContext(${JSON.stringify(body)});\n`,
    `import { runInNewContext as run } from "node:vm"; void run(${JSON.stringify(body)});\n`,
    `import { compileFunction } from "node:vm"; void compileFunction(${JSON.stringify(body)})();\n`,
    `import * as vm from "node:vm"; const run = vm.runInThisContext; void run(${JSON.stringify(body)});\n`,
    `import vm from "node:vm"; void vm.runInNewContext(${JSON.stringify(body)});\n`,
    `const vm = require("node:vm"); void vm.runInThisContext(${JSON.stringify(body)});\n`,
    `const vm = await import("node:vm"); void vm.runInThisContext(${JSON.stringify(body)});\n`,
    'export { runInThisContext as run } from "node:vm";\n',
    'export * from "node:vm";\n',
    'import { compileFunction } from "node:vm"; export { compileFunction };\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /dynamic|execution|loader|node:vm|unsupported|vm|escape/iu,
      source.trim()
    );
  }
});

test("shadowed dynamic capabilities and ordinary constructor or vm-shaped members remain allowed", async (t) => {
  for (const source of [
    'const eval = (value) => value; const execute = eval; void execute("./ordinary-eval-alias");\n',
    'const Function = (value) => () => value; const F = Function; void F("./ordinary-Function-alias")();\n',
    [
      "const process = { getBuiltinModule() { return { createRequire: () => (value) => value }; } };",
      "const getBuiltin = process.getBuiltinModule.bind(process);",
      'const load = getBuiltin("module").createRequire(import.meta.url);',
      'void load("./ordinary-process-alias");',
      ""
    ].join("\n"),
    'const client = { getBuiltinModule(value) { return value; }, _load(value) { return value; } }; void client.getBuiltinModule("./ordinary-get-builtin"); void client._load("./ordinary-load");\n',
    'const client = { constructor(value) { return value; } }; void client.constructor("./ordinary-constructor");\n',
    'const vm = { runInThisContext(value) { return value; }, compileFunction(value) { return () => value; } }; void vm.runInThisContext("./ordinary-vm"); void vm.compileFunction("./ordinary-vm")();\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(
      runtimeSourcePaths.some((sourcePath) => /ordinary-/u.test(sourcePath)),
      false,
      source.trim()
    );
  }
});

test("only the exact imported prebuild validator receives the direct process identity", async (t) => {
  {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    await fs.writeFile(
      path.join(repositoryRoot, "playwright.config.ts"),
      [
        'import { validateStarshipPlaywrightPrebuildReceipt } from "./scripts/run-starship-playwright.mjs";',
        "validateStarshipPlaywrightPrebuildReceipt({ processIdentity: process });",
        ""
      ].join("\n"),
      { mode: 0o600 }
    );
    assert.doesNotThrow(() => starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    ));
  }
  for (const source of [
    [
      'import { validateStarshipPlaywrightPrebuildReceipt } from "./scripts/run-starship-playwright.mjs";',
      "const nodeProcess = process;",
      "validateStarshipPlaywrightPrebuildReceipt({ processIdentity: nodeProcess });",
      ""
    ].join("\n"),
    [
      'import { validateStarshipPlaywrightPrebuildReceipt } from "./scripts/run-starship-playwright.mjs";',
      "const invoke = validateStarshipPlaywrightPrebuildReceipt;",
      "invoke({ processIdentity: process });",
      ""
    ].join("\n"),
    [
      'import { unknownImportedCallee } from "./scripts/run-starship-playwright.mjs";',
      "unknownImportedCallee({ processIdentity: process });",
      ""
    ].join("\n"),
    [
      'import { validateStarshipPlaywrightPrebuildReceipt as unknownImportedCallee } from "./scripts/run-starship-playwright.mjs";',
      "function expose() { return process; }",
      "unknownImportedCallee({ processIdentity: expose() });",
      ""
    ].join("\n"),
    [
      'import { validateStarshipPlaywrightPrebuildReceipt as unknownImportedCallee } from "./scripts/run-starship-playwright.mjs";',
      "const holder = { processIdentity: process };",
      "unknownImportedCallee(holder);",
      ""
    ].join("\n")
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    await fs.writeFile(path.join(repositoryRoot, "playwright.config.ts"), source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /process|loader|escape/iu,
      source.trim()
    );
  }
});

test("CommonJS export assignments cannot carry loader or module-object provenance", async (t) => {
  for (const source of [
    [
      'import { createRequire } from "node:module";',
      "const load = createRequire(import.meta.url);",
      "module.exports = load;",
      ""
    ].join("\n"),
    [
      'import { createRequire } from "node:module";',
      "const load = createRequire(import.meta.url);",
      "exports.load = load;",
      ""
    ].join("\n"),
    [
      'import { createRequire } from "node:module";',
      "const load = createRequire(import.meta.url);",
      "module.exports = { load };",
      ""
    ].join("\n"),
    'module.exports = require;\n',
    'exports.moduleObject = module;\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    assert.throws(
      () => starshipPlaywrightFullRunRuntimeSourcePaths(
        repositoryRoot,
        ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
      ),
      /alias|escape|export|module|require|loader/iu,
      source.trim()
    );
  }
});

test("ambient CommonJS declarations remain real loaders while runtime declarations shadow them", async (t) => {
  for (const { dependencyName, source } of [
    {
      dependencyName: "ambient-require",
      source: [
        'declare const require: (target: string) => unknown;',
        'void require("./ambient-require");',
        ""
      ].join("\n")
    },
    {
      dependencyName: "ambient-module",
      source: [
        'declare const module: { require(target: string): unknown };',
        'void module.require("./ambient-module");',
        ""
      ].join("\n")
    }
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    const realDependencyPath = path.join(repositoryRoot, "tests", "e2e", `${dependencyName}.ts`);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    await fs.writeFile(realDependencyPath, "export const loaded = true;\n", { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(runtimeSourcePaths.includes(realDependencyPath), true, source.trim());
  }

  for (const source of [
    'function require(value) { return value; } void require("./ordinary-function");\n',
    'class module { static require(value) { return value; } } void module.require("./ordinary-class");\n'
  ]) {
    const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
    const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
    await fs.writeFile(g03Path, source, { mode: 0o600 });
    const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
      repositoryRoot,
      ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
    );
    assert.equal(
      runtimeSourcePaths.some((sourcePath) => /ordinary-(function|class)/u.test(sourcePath)),
      false,
      source.trim()
    );
  }
});

test("ordinary non-loader member calls with relative-looking strings are not false positives", async (t) => {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const g03Path = path.join(repositoryRoot, FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]);
  await fs.writeFile(
    g03Path,
    [
      "const helper = { call() { return true; } };",
      'void helper.call(null, "./not-a-loader");',
      "const moduleFactory = { requirement() { return true; } };",
      'void moduleFactory["requirement"]("./also-not-a-loader");',
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.equal(
    runtimeSourcePaths.some((sourcePath) => /not-a-loader/u.test(sourcePath)),
    false
  );
});

async function createFixture(t) {
  const repositoryRoot = await fs.mkdtemp(STARSHIP_TEST_PREFIX);
  const nextEnvPath = path.join(repositoryRoot, "next-env.d.ts");
  await fs.writeFile(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  await fs.chmod(nextEnvPath, 0o640);
  t.after(async () => {
    await fs.rm(repositoryRoot, { force: true, recursive: true });
  });
  return { nextEnvPath, repositoryRoot };
}

async function assertCanonicalIdentity(nextEnvPath, before) {
  const after = await fs.lstat(nextEnvPath, { bigint: true });
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "canonical-next-env\n");
  assert.equal(after.mode & 0o7777n, 0o640n);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateRawFullRunAuthorityReceipt(receipt, expectations) {
  try {
    assert.equal(receipt.contract, "starship-playwright-full-run-runtime-source-hold-v2");
    assert.equal(receipt.schemaVersion, 2);
    assert.deepEqual(receipt.closure.entryPaths, expectations.entryPaths);
    assert.deepEqual(receipt.closure.expectedEdges, expectations.expectedEdges);
    assert.deepEqual(receipt.closure.orderedSourcePaths, expectations.orderedSourcePaths);
    assert.equal(
      receipt.closure.sha256,
      sha256(Buffer.from(JSON.stringify({
        entryPaths: receipt.closure.entryPaths,
        expectedEdges: receipt.closure.expectedEdges,
        orderedSourcePaths: receipt.closure.orderedSourcePaths
      }), "utf8"))
    );
    assert.deepEqual(
      receipt.resolutionDirectories.map(({ path: directoryPath }) => directoryPath),
      expectations.expectedResolutionDirectoryPaths
    );
    const receiptKeys = ["device", "inode", "mode", "size", "mtimeNs", "ctimeNs"];
    for (let index = 0; index < receipt.resolutionDirectories.length; index += 1) {
      const directory = receipt.resolutionDirectories[index];
      assert.equal(directory.index, index);
      assert.equal(directory.held.path, directory.path);
      for (const key of receiptKeys) assert.notEqual(directory.held[key], undefined);
    }
    assert.deepEqual(
      receipt.boundaries.map(({ name }) => name),
      [
        "opened",
        "postPrebuildPreSpawn",
        "postSpawnLoad",
        "immediatelyAfterChildExit",
        "beforeReceiptClose"
      ]
    );
    for (const boundary of receipt.boundaries) {
      assert.equal(boundary.status, "exact");
      assert.deepEqual(boundary.errors, []);
      assert.equal(
        boundary.resolutionDirectories.length,
        receipt.resolutionDirectories.length
      );
      for (let index = 0; index < receipt.resolutionDirectories.length; index += 1) {
        const creation = receipt.resolutionDirectories[index];
        const join = boundary.resolutionDirectories[index];
        assert.equal(join.index, index);
        assert.equal(join.resolutionDirectoryPath, creation.path);
        assert.deepEqual(join.errors, []);
        for (const observed of [join.path, join.descriptor]) {
          assert.equal(observed.path, creation.path);
          for (const key of receiptKeys) {
            assert.equal(observed[key], creation.held[key]);
          }
        }
      }
    }
    return true;
  } catch (error) {
    throw new Error(
      `Raw full-run authority receipt closure/directory/edge/boundary join is invalid: ` +
      `${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

async function receiptFor(filePath, { includeChangeToken = false } = {}) {
  const [bytes, stat] = await Promise.all([
    fs.readFile(filePath),
    fs.lstat(filePath, { bigint: true })
  ]);
  const receipt = {
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
    mode: Number(stat.mode & 0o7777n).toString(8),
    path: filePath,
    sha256: sha256(bytes),
    size: bytes.length
  };
  if (includeChangeToken) {
    receipt.ctimeNs = stat.ctimeNs.toString();
    receipt.mtimeNs = stat.mtimeNs.toString();
  }
  return receipt;
}

async function createRuntimeSourceJoinFixture(repositoryRoot) {
  const sourcePaths = starshipPlaywrightPrebuildRuntimeSourcePaths(repositoryRoot);
  for (let index = 0; index < sourcePaths.length; index += 1) {
    const sourcePath = sourcePaths[index];
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(
      sourcePath,
      `runtime-source-${index}-${path.relative(repositoryRoot, sourcePath)}\n`,
      { flag: "wx", mode: 0o600 }
    );
  }
  return await Promise.all(sourcePaths.map(async (sourcePath) => {
    const receipt = await receiptFor(sourcePath, { includeChangeToken: true });
    return { after: receipt, before: receipt };
  }));
}

async function createFullRunStaticClosureFixture(t) {
  const { repositoryRoot } = await createFixture(t);
  await createRuntimeSourceJoinFixture(repositoryRoot);
  for (const relativePath of [
    ...FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS,
    ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS
  ]) {
    const sourcePath = path.join(repositoryRoot, relativePath);
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, `// exact ${relativePath} fixture\n`, { mode: 0o600 });
  }
  return { repositoryRoot };
}

async function executeC15DynamicLoaderFixture({ markerKey, repositoryRoot, source }) {
  const e2eRoot = path.join(repositoryRoot, "tests", "e2e");
  const dependencyPath = path.join(e2eRoot, "escaped-review.cjs");
  const executablePath = path.join(e2eRoot, `${markerKey}.mjs`);
  delete globalThis[markerKey];
  await fs.writeFile(path.join(repositoryRoot, "package.json"), "{}\n", { mode: 0o600 });
  await fs.writeFile(
    dependencyPath,
    `globalThis[${JSON.stringify(markerKey)}] = true;\nmodule.exports = {};\n`,
    { mode: 0o600 }
  );
  await fs.writeFile(executablePath, source, { mode: 0o600 });
  try {
    await import(pathToFileURL(executablePath).href);
    return {
      dependencyActuallyExecuted: globalThis[markerKey] === true,
      dependencyPath
    };
  } finally {
    delete globalThis[markerKey];
  }
}

async function createDeepSiblingCandidateFixture(t, label) {
  const { repositoryRoot } = await createFullRunStaticClosureFixture(t);
  const importerPath = path.join(
    repositoryRoot,
    FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS[0]
  );
  const directPath = path.join(repositoryRoot, "tests", "deep", "choice.ts");
  const indexPath = path.join(repositoryRoot, "tests", "deep", "choice", "index.ts");
  await fs.writeFile(importerPath, 'import "../deep/choice";\n', { mode: 0o600 });
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, "export const initialDeepChoice = true;\n", {
    mode: 0o600
  });
  const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
    repositoryRoot,
    ["test", ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS]
  );
  assert.equal(runtimeSourcePaths.includes(indexPath), true);
  assert.equal(runtimeSourcePaths.includes(directPath), false);
  const receiptPath = path.join(repositoryRoot, "evidence", `deep-${label}.json`);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  return { directPath, indexPath, receiptPath, repositoryRoot, runtimeSourcePaths };
}

function fullRunStaticEntryPaths(repositoryRoot) {
  return Object.freeze([
    ...starshipPlaywrightPrebuildRuntimeSourcePaths(repositoryRoot),
    ...FULL_RUN_FIXED_RUNTIME_RELATIVE_PATHS.map((relativePath) =>
      path.join(repositoryRoot, relativePath)
    ),
    ...FULL_RUN_APPROVED_PRODUCER_RELATIVE_PATHS.map((relativePath) =>
      path.join(repositoryRoot, relativePath)
    )
  ]);
}

async function createReceiptFixture(t, { completedAt = new Date().toISOString() } = {}) {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const pathManifest = buildStarshipE2ePathManifest({
    repositoryRoot,
    runId: "prebuild-receipt"
  });
  const receiptPath = path.join(
    pathManifest.paths.e2eRunRoot,
    "evidence",
    "next-env-prebuild-receipt.json"
  );
  const buildIdPath = path.join(pathManifest.paths.nextDistDir, "BUILD_ID");
  const buildManifestPath = path.join(pathManifest.paths.nextDistDir, "build-manifest.json");
  const requiredServerFilesPath = path.join(
    pathManifest.paths.nextDistDir,
    "required-server-files.json"
  );
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.mkdir(path.dirname(buildIdPath), { recursive: true });
  await fs.writeFile(buildIdPath, "fixture-build-id\n", { mode: 0o600 });
  await fs.writeFile(buildManifestPath, '{"fixture":"build-manifest"}\n', { mode: 0o600 });
  await fs.writeFile(requiredServerFilesPath, '{"fixture":"required-server-files"}\n', {
    mode: 0o600
  });
  const runtimeSources = await createRuntimeSourceJoinFixture(repositoryRoot);
  const nextEnv = await receiptFor(nextEnvPath);
  const buildId = await receiptFor(buildIdPath);
  const buildManifest = await receiptFor(buildManifestPath);
  const requiredServerFiles = await receiptFor(requiredServerFilesPath);
  const runner = readStarshipProcessIdentity(process.pid);
  const port = 3020;
  const baseURL = `http://127.0.0.1:${port}`;
  const receipt = {
    baseURL,
    build: { code: 0, signal: null, spawnError: null },
    buildOutputs: { buildId, buildManifest, requiredServerFiles },
    completedAt,
    contract: "starship-playwright-prebuild-v1",
    nextEnv: { after: nextEnv, before: nextEnv },
    paths: {
      nextDistDir: pathManifest.paths.nextDistDir,
      nextEnv: nextEnvPath,
      nextTsconfigPath: pathManifest.paths.nextTsconfigPath
    },
    repositoryRoot,
    runId: pathManifest.runId,
    port,
    runner,
    runtimeSources,
    schemaVersion: 1,
    status: "build-restored-before-playwright"
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(receiptPath, receiptBytes, { mode: 0o600, flag: "wx" });
  const receiptStat = await fs.lstat(receiptPath, { bigint: true });
  const environment = {
    PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE: receiptStat.dev.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_INODE: receiptStat.ino.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_PATH: receiptPath,
    PLAYWRIGHT_PREBUILD_RECEIPT_SHA256: sha256(receiptBytes),
    PLAYWRIGHT_PREBUILD_RUNNER_PID: String(runner.pid),
    PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN: runner.startToken,
    PLAYWRIGHT_PREBUILT_SERVER: "1"
  };
  return {
    baseURL,
    buildManifestPath,
    environment,
    pathManifest,
    port,
    processIdentity: { pid: 9001, ppid: runner.pid },
    requiredServerFilesPath,
    receipt,
    receiptPath
  };
}

async function rewriteReceiptFixture(fixture, receipt, environmentOverrides = {}) {
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(fixture.receiptPath, bytes);
  const stat = await fs.lstat(fixture.receiptPath, { bigint: true });
  return {
    ...fixture.environment,
    PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE: stat.dev.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_INODE: stat.ino.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_SHA256: sha256(bytes),
    ...environmentOverrides
  };
}

test("Playwright launch stays blocked until build-mutated next-env is restored exactly", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const before = await fs.lstat(nextEnvPath, { bigint: true });
  let releaseBuild;
  const buildPaused = new Promise((resolve) => {
    releaseBuild = resolve;
  });
  let signalMutation;
  const mutationObserved = new Promise((resolve) => {
    signalMutation = resolve;
  });
  let launchRead = null;

  const execution = runStarshipNextEnvBuildBeforeLaunch({
    build: async () => {
      await fs.writeFile(nextEnvPath, "next-route-types-from-build\n");
      await fs.chmod(nextEnvPath, 0o600);
      signalMutation();
      await buildPaused;
      return { code: 0, signal: null, spawnError: null };
    },
    launch: async () => {
      launchRead = await fs.readFile(nextEnvPath, "utf8");
      return "launched";
    },
    nextEnvPath,
    repositoryRoot
  });

  await mutationObserved;
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "next-route-types-from-build\n");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(launchRead, null, "no Playwright/spec process may launch during the build");

  releaseBuild();
  assert.equal(await execution, "launched");
  const after = await fs.lstat(nextEnvPath, { bigint: true });
  assert.equal(launchRead, "canonical-next-env\n");
  assert.equal(after.mode & 0o7777n, 0o640n);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
});

for (const failure of [
  {
    label: "nonzero exit",
    outcome: { code: 7, signal: null, spawnError: null },
    pattern: /"code":7/u
  },
  {
    label: "signal exit",
    outcome: { code: null, signal: "SIGTERM", spawnError: null },
    pattern: /SIGTERM/u
  },
  {
    label: "spawn error",
    outcome: { code: null, signal: null, spawnError: "spawn EACCES" },
    pattern: /spawn EACCES/u
  }
]) {
  test(`build ${failure.label} restores exact next-env and forbids launch`, async (t) => {
    const { nextEnvPath, repositoryRoot } = await createFixture(t);
    const before = await fs.lstat(nextEnvPath, { bigint: true });
    let launchCount = 0;
    await assert.rejects(
      runStarshipNextEnvBuildBeforeLaunch({
        build: async () => {
          await fs.writeFile(nextEnvPath, "failed-build-route-types\n");
          await fs.chmod(nextEnvPath, 0o600);
          return failure.outcome;
        },
        launch: async () => {
          launchCount += 1;
        },
        nextEnvPath,
        repositoryRoot
      }),
      failure.pattern
    );
    assert.equal(launchCount, 0);
    await assertCanonicalIdentity(nextEnvPath, before);
  });
}

test("foreign next-env replacement is preserved and fails closed before launch", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const displacedPath = path.join(repositoryRoot, "original-next-env.d.ts");
  let launchCount = 0;
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.rename(nextEnvPath, displacedPath);
        await fs.writeFile(nextEnvPath, "foreign-replacement\n", { mode: 0o600 });
        return { code: 0, signal: null, spawnError: null };
      },
      launch: async () => {
        launchCount += 1;
      },
      nextEnvPath,
      repositoryRoot
    }),
    /preserving the foreign path/u
  );
  assert.equal(launchCount, 0);
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "foreign-replacement\n");
  assert.equal(await fs.readFile(displacedPath, "utf8"), "canonical-next-env\n");
});

test("validated prebuild receipt binds the restored source, build output, run, and runner parent", async (t) => {
  const fixture = await createReceiptFixture(t);
  const validated = validateStarshipPlaywrightPrebuildReceipt({
    baseURL: fixture.baseURL,
    environment: fixture.environment,
    nowMs: Date.now(),
    pathManifest: fixture.pathManifest,
    port: fixture.port,
    processIdentity: fixture.processIdentity
  });
  assert.equal(validated.status, "build-restored-before-playwright");
  assert.deepEqual(
    validated.runtimeSources.map(({ after }) => after.path),
    starshipPlaywrightPrebuildRuntimeSourcePaths(fixture.pathManifest.paths.repositoryRoot)
  );
  assert.equal(validated.nextEnv.after.sha256, sha256(Buffer.from("canonical-next-env\n")));
  assert.equal(
    validated.buildOutputs.buildId.sha256,
    sha256(Buffer.from("fixture-build-id\n"))
  );
});

test("runner mints a mode-600 self-validated receipt only after exact restore proof", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const pathManifest = buildStarshipE2ePathManifest({
    repositoryRoot,
    runId: "runner-minted-receipt"
  });
  const receiptPath = path.join(
    pathManifest.paths.e2eRunRoot,
    "evidence",
    "next-env-prebuild-receipt.json"
  );
  const buildIdPath = path.join(pathManifest.paths.nextDistDir, "BUILD_ID");
  const buildManifestPath = path.join(pathManifest.paths.nextDistDir, "build-manifest.json");
  const requiredServerFilesPath = path.join(
    pathManifest.paths.nextDistDir,
    "required-server-files.json"
  );
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.mkdir(path.dirname(buildIdPath), { recursive: true });
  await fs.writeFile(buildIdPath, "runner-build-id\n", { flag: "wx", mode: 0o600 });
  await fs.writeFile(buildManifestPath, '{"runner":"build-manifest"}\n', {
    flag: "wx",
    mode: 0o600
  });
  await fs.writeFile(requiredServerFilesPath, '{"runner":"required-server-files"}\n', {
    flag: "wx",
    mode: 0o600
  });
  const runtimeSources = await createRuntimeSourceJoinFixture(repositoryRoot);
  const beforeReceipt = await receiptFor(nextEnvPath);
  const runnerIdentity = readStarshipProcessIdentity(process.pid);
  const environment = writeStarshipPlaywrightPrebuildReceipt({
    beforeReceipt,
    invocation: { pathManifest },
    outcome: { code: 0, signal: null, spawnError: null },
    restoreReceipt: { ...beforeReceipt, exact: true },
    runnerIdentity,
    runtimeSources,
    server: { baseURL: "http://127.0.0.1:3020", port: 3020 }
  });
  const receiptStat = await fs.lstat(receiptPath, { bigint: true });
  assert.equal(receiptStat.mode & 0o7777n, 0o600n);
  const validated = validateStarshipPlaywrightPrebuildReceipt({
    baseURL: `http://127.0.0.1:3020`,
    environment,
    pathManifest,
    port: 3020,
    processIdentity: { ppid: process.pid }
  });
  assert.equal(validated.runner.pid, process.pid);
  assert.equal(validated.runner.startToken, runnerIdentity.startToken);
  assert.equal(validated.nextEnv.before.inode, beforeReceipt.inode);
  assert.equal(validated.nextEnv.after.inode, beforeReceipt.inode);
});

test("build and restore failures are both preserved while a foreign path remains untouched", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const displacedPath = path.join(repositoryRoot, "original-next-env.d.ts");
  let launchCount = 0;
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.rename(nextEnvPath, displacedPath);
        await fs.writeFile(nextEnvPath, "foreign-after-build-error\n");
        throw new Error("build callback exploded");
      },
      launch: async () => {
        launchCount += 1;
      },
      nextEnvPath,
      repositoryRoot
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        [
          "build callback exploded",
          "Tracked next-env path was replaced during build; preserving the foreign path and refusing launch."
        ]
      );
      return true;
    }
  );
  assert.equal(launchCount, 0);
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "foreign-after-build-error\n");
});

test("descriptor close failure cannot erase an earlier build failure", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const before = await fs.lstat(nextEnvPath, { bigint: true });
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.writeFile(nextEnvPath, "failed-build-route-types\n");
        throw new Error("primary build failure");
      },
      launch: async () => {
        throw new Error("launch must not run");
      },
      nextEnvPath,
      operations: {
        closeDescriptor(descriptor) {
          closeSync(descriptor);
          throw new Error("descriptor close audit failure");
        }
      },
      repositoryRoot
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        ["primary build failure", "descriptor close audit failure"]
      );
      return true;
    }
  );
  await assertCanonicalIdentity(nextEnvPath, before);
});

test("unchanged build verifies next-env without inode, mode, mtime, or ctime churn", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const before = await fs.lstat(nextEnvPath, { bigint: true });
  const result = await runStarshipNextEnvBuildBeforeLaunch({
    build: async () => ({ code: 0, signal: null, spawnError: null }),
    launch: async () => "launched",
    nextEnvPath,
    repositoryRoot
  });
  const after = await fs.lstat(nextEnvPath, { bigint: true });
  assert.equal(result, "launched");
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mode, before.mode);
  assert.equal(after.mtimeNs, before.mtimeNs);
  assert.equal(after.ctimeNs, before.ctimeNs);
});

test("byte-identical foreign inode remains preserved and cannot authorize launch", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const originalPath = path.join(repositoryRoot, "original-next-env.d.ts");
  const original = await fs.lstat(nextEnvPath, { bigint: true });
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.rename(nextEnvPath, originalPath);
        await fs.writeFile(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
        return { code: 0, signal: null, spawnError: null };
      },
      launch: async () => {
        throw new Error("launch must not run");
      },
      nextEnvPath,
      repositoryRoot
    }),
    /preserving the foreign path/u
  );
  const foreign = await fs.lstat(nextEnvPath, { bigint: true });
  assert.notEqual(foreign.ino, original.ino);
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "canonical-next-env\n");
  assert.equal((await fs.lstat(originalPath, { bigint: true })).ino, original.ino);
});

test("runtime symlink replacement remains a symlink and cannot authorize launch", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const originalPath = path.join(repositoryRoot, "original-next-env.d.ts");
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.rename(nextEnvPath, originalPath);
        await fs.symlink(originalPath, nextEnvPath);
        return { code: 0, signal: null, spawnError: null };
      },
      launch: async () => {
        throw new Error("launch must not run");
      },
      nextEnvPath,
      repositoryRoot
    }),
    /preserving the foreign path/u
  );
  assert.equal((await fs.lstat(nextEnvPath)).isSymbolicLink(), true);
  assert.equal(await fs.readlink(nextEnvPath), originalPath);
});

for (const preflight of ["missing", "directory", "symlink"]) {
  test(`preflight ${preflight} next-env fails before the build callback`, async (t) => {
    const { nextEnvPath, repositoryRoot } = await createFixture(t);
    if (preflight === "missing") {
      await fs.rm(nextEnvPath);
    } else if (preflight === "directory") {
      await fs.rm(nextEnvPath);
      await fs.mkdir(nextEnvPath);
    } else {
      const target = path.join(repositoryRoot, "symlink-target.d.ts");
      await fs.rename(nextEnvPath, target);
      await fs.symlink(target, nextEnvPath);
    }
    let buildCount = 0;
    await assert.rejects(
      runStarshipNextEnvBuildBeforeLaunch({
        build: async () => {
          buildCount += 1;
          return { code: 0, signal: null, spawnError: null };
        },
        launch: async () => {
          throw new Error("launch must not run");
        },
        nextEnvPath,
        repositoryRoot
      }),
      /next-env|ENOENT|regular non-symlink/u
    );
    assert.equal(buildCount, 0);
  });
}

test("missing prebuild receipt fails closed", async (t) => {
  const fixture = await createReceiptFixture(t);
  await fs.rm(fixture.receiptPath);
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment: fixture.environment,
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /ENOENT|prebuild receipt/u
  );
});

test("self-hashed forged receipt with a foreign runner PID fails closed", async (t) => {
  const fixture = await createReceiptFixture(t);
  const forged = {
    ...fixture.receipt,
    runner: { ...fixture.receipt.runner, pid: fixture.receipt.runner.pid + 1 }
  };
  const bytes = Buffer.from(`${JSON.stringify(forged, null, 2)}\n`);
  await fs.writeFile(fixture.receiptPath, bytes);
  const stat = await fs.lstat(fixture.receiptPath, { bigint: true });
  const environment = {
    ...fixture.environment,
    PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE: stat.dev.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_INODE: stat.ino.toString(),
    PLAYWRIGHT_PREBUILD_RECEIPT_SHA256: sha256(bytes),
    PLAYWRIGHT_PREBUILD_RUNNER_PID: String(forged.runner.pid)
  };
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment,
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /runner PID/u
  );
});

test("stale prebuild receipt fails closed", async (t) => {
  const nowMs = Date.now();
  const fixture = await createReceiptFixture(t, {
    completedAt: new Date(nowMs - 120_001).toISOString()
  });
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment: fixture.environment,
      nowMs,
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /stale/u
  );
});

for (const output of [
  { key: "requiredServerFiles", pathKey: "requiredServerFilesPath" },
  { key: "buildManifest", pathKey: "buildManifestPath" }
]) {
  test(`missing ${output.key} build output fails closed`, async (t) => {
    const fixture = await createReceiptFixture(t);
    await fs.rm(fixture[output.pathKey]);
    assert.throws(
      () => validateStarshipPlaywrightPrebuildReceipt({
        baseURL: fixture.baseURL,
        environment: fixture.environment,
        pathManifest: fixture.pathManifest,
        port: fixture.port,
        processIdentity: fixture.processIdentity
      }),
      /ENOENT|build output|receipt/u
    );
  });

  test(`mutated ${output.key} build output fails closed`, async (t) => {
    const fixture = await createReceiptFixture(t);
    const before = await fs.lstat(fixture[output.pathKey], { bigint: true });
    await fs.writeFile(fixture[output.pathKey], '{"mutated":true}\n');
    const after = await fs.lstat(fixture[output.pathKey], { bigint: true });
    assert.equal(after.ino, before.ino);
    assert.throws(
      () => validateStarshipPlaywrightPrebuildReceipt({
        baseURL: fixture.baseURL,
        environment: fixture.environment,
        pathManifest: fixture.pathManifest,
        port: fixture.port,
        processIdentity: fixture.processIdentity
      }),
      /sha256 mismatch|size mismatch|build output/u
    );
  });

  test(`byte-identical foreign ${output.key} inode fails closed`, async (t) => {
    const fixture = await createReceiptFixture(t);
    const outputPath = fixture[output.pathKey];
    const displacedPath = `${outputPath}.original`;
    const bytes = await fs.readFile(outputPath);
    const before = await fs.lstat(outputPath, { bigint: true });
    await fs.rename(outputPath, displacedPath);
    await fs.writeFile(outputPath, bytes, { mode: 0o600 });
    const foreign = await fs.lstat(outputPath, { bigint: true });
    assert.notEqual(foreign.ino, before.ino);
    assert.throws(
      () => validateStarshipPlaywrightPrebuildReceipt({
        baseURL: fixture.baseURL,
        environment: fixture.environment,
        pathManifest: fixture.pathManifest,
        port: fixture.port,
        processIdentity: fixture.processIdentity
      }),
      /inode mismatch|build output/u
    );
  });
}

test("wrong intended port or baseURL fails closed", async (t) => {
  const fixture = await createReceiptFixture(t);
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: "http://127.0.0.1:3021",
      environment: fixture.environment,
      pathManifest: fixture.pathManifest,
      port: 3021,
      processIdentity: fixture.processIdentity
    }),
    /port|baseURL/u
  );
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: "http://localhost:3020",
      environment: fixture.environment,
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /baseURL/u
  );
});

test("self-hashed receipt with a stale runner OS start token fails closed", async (t) => {
  const fixture = await createReceiptFixture(t);
  const forged = {
    ...fixture.receipt,
    runner: { ...fixture.receipt.runner, startToken: `${fixture.receipt.runner.startToken}-stale` }
  };
  const environment = await rewriteReceiptFixture(fixture, forged, {
    PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN: forged.runner.startToken
  });
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment,
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /start token/u
  );
});

test("caller-controlled prebuild receipt variables reject before run-root creation", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const receiptNames = [
    "PLAYWRIGHT_PREBUILT_SERVER",
    "PLAYWRIGHT_PREBUILD_RECEIPT_PATH",
    "PLAYWRIGHT_PREBUILD_RECEIPT_SHA256",
    "PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE",
    "PLAYWRIGHT_PREBUILD_RECEIPT_INODE",
    "PLAYWRIGHT_PREBUILD_RUNNER_PID",
    "PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN"
  ];
  for (const name of receiptNames) {
    const runId = `reject-${name.toLowerCase()}`;
    const runRoot = path.join(repositoryRoot, ".tmp", `e2e-run-${runId}`);
    assert.throws(
      () => buildStarshipPlaywrightInvocation({
        args: ["test"],
        baseEnvironment: { [name]: "/tmp/caller-controlled" },
        repositoryRoot,
        runId
      }),
      new RegExp(name, "u")
    );
    await assert.rejects(fs.lstat(runRoot), { code: "ENOENT" });
  }
});

test("prebuild invocation is the exact repository Node script with manifest-owned paths", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const invocation = buildStarshipPlaywrightInvocation({
    args: ["test", "tests/e2e/example.spec.ts"],
    baseEnvironment: { PATH: "/bin" },
    repositoryRoot,
    runId: "exact-prebuild-command"
  });
  const prebuild = buildStarshipNextPrebuildInvocation(invocation);
  assert.equal(prebuild.command, process.execPath);
  assert.deepEqual(prebuild.args, [path.join(repositoryRoot, "scripts", "next-clean-build.mjs")]);
  assert.equal(prebuild.cwd, repositoryRoot);
  assert.equal(
    prebuild.environment.NEXT_DIST_DIR,
    path.relative(repositoryRoot, invocation.pathManifest.paths.nextDistDir)
  );
  assert.equal(
    prebuild.environment.NEXT_TSCONFIG_PATH,
    path.relative(repositoryRoot, invocation.pathManifest.paths.nextTsconfigPath)
  );
  assert.equal(prebuild.environment.NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS, "true");
  assert.equal(prebuild.environment.LLM_API_KEY, "");
  assert.equal(prebuild.nextEnvPath, path.join(repositoryRoot, "next-env.d.ts"));
});

test("temporary prebuild tsconfig is already complete for an honest Next custom-dist build", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  await fs.writeFile(path.join(repositoryRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      allowJs: true,
      incremental: true,
      plugins: [{ name: "next" }],
      strict: true
    },
    exclude: ["node_modules", "private", "private/**/*"],
    include: [
      "**/*.ts",
      "**/*.tsx",
      "components/visualizations/signature/**/*.jsx",
      ".next/types/**/*.ts",
      "next-env.d.ts"
    ]
  }, null, 2)}\n`);
  const invocation = buildStarshipPlaywrightInvocation({
    args: ["test", "tests/e2e/example.spec.ts"],
    repositoryRoot,
    runId: "honest-next-tsconfig"
  });
  const prebuild = buildStarshipNextPrebuildInvocation(invocation);
  const generated = JSON.parse(buildStarshipE2eTempTsconfigBytes(prebuild).toString("utf8"));
  assert.equal(
    path.dirname(prebuild.nextTsconfigPath),
    invocation.pathManifest.paths.e2eRunRoot
  );
  assert.equal(
    path.resolve(path.dirname(prebuild.nextTsconfigPath), generated.extends),
    path.join(repositoryRoot, "tsconfig.json")
  );
  assert.deepEqual(generated.compilerOptions, { plugins: [{ name: "next" }] });
  const configDirectory = path.dirname(prebuild.nextTsconfigPath);
  const portableRelative = (absolutePath) =>
    path.relative(configDirectory, absolutePath).split(path.sep).join("/");
  assert.equal(
    generated.include.some((entry) => entry.endsWith(".next/types/**/*.ts")),
    false
  );
  assert.equal(
    generated.include.includes(
      `${portableRelative(invocation.pathManifest.paths.nextDistDir)}/types/**/*.ts`
    ),
    true
  );
  assert.equal(
    generated.include.includes(`${prebuild.environment.NEXT_DIST_DIR}/types/**/*.ts`),
    true
  );
  assert.equal(
    generated.include.includes(
      `${portableRelative(path.join(repositoryRoot, "components", "visualizations", "signature"))}/**/*.jsx`
    ),
    true
  );
  assert.equal(
    generated.exclude.includes(portableRelative(path.join(repositoryRoot, "node_modules"))),
    true
  );
  assert.equal(
    generated.exclude.includes(`${portableRelative(path.join(repositoryRoot, "var"))}/**/*`),
    true
  );
});

test("locked Next and TypeScript accept the nested temporary config without rewriting or losing inputs", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const canonicalTsconfigBytes = await fs.readFile(
    new URL("../tsconfig.json", import.meta.url)
  );
  await fs.writeFile(path.join(repositoryRoot, "tsconfig.json"), canonicalTsconfigBytes);
  const invocation = buildStarshipPlaywrightInvocation({
    args: ["test", "tests/e2e/example.spec.ts"],
    repositoryRoot,
    runId: "next-no-rewrite-nested-tsconfig"
  });
  const prebuild = buildStarshipNextPrebuildInvocation(invocation);
  const inputPaths = [
    path.join(repositoryRoot, "app", "example.ts"),
    path.join(
      repositoryRoot,
      "components",
      "visualizations",
      "signature",
      "example.jsx"
    ),
    path.join(invocation.pathManifest.paths.nextDistDir, "types", "routes.d.ts")
  ];
  for (const inputPath of inputPaths) {
    await fs.mkdir(path.dirname(inputPath), { recursive: true });
    await fs.writeFile(inputPath, "export {};\n", { mode: 0o600 });
  }
  await fs.mkdir(path.dirname(prebuild.nextTsconfigPath), { recursive: true });
  const before = buildStarshipE2eTempTsconfigBytes(prebuild);
  await fs.writeFile(prebuild.nextTsconfigPath, before, { flag: "wx", mode: 0o600 });

  const ts = require("typescript");
  const { writeConfigurationDefaults } = require(
    "next/dist/lib/typescript/writeConfigurationDefaults"
  );
  await writeConfigurationDefaults(
    ts,
    prebuild.nextTsconfigPath,
    false,
    true,
    prebuild.environment.NEXT_DIST_DIR,
    false
  );

  assert.deepEqual(await fs.readFile(prebuild.nextTsconfigPath), before);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    prebuild.nextTsconfigPath,
    {},
    ts.sys
  );
  assert.ok(parsed);
  const parsedFiles = new Set(parsed.fileNames.map((fileName) => path.resolve(fileName)));
  for (const inputPath of inputPaths) {
    assert.equal(parsedFiles.has(inputPath), true, inputPath);
  }
  assert.equal(
    parsedFiles.has(path.join(repositoryRoot, ".next", "types", "routes.d.ts")),
    false
  );
});

test("honest run-owned temporary tsconfig creation does not invalidate held repository-root sources", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "runtime-source.mjs");
  const original = Buffer.from("export const heldAtRepositoryRoot = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  const manifest = buildStarshipE2ePathManifest({
    repositoryRoot,
    runId: "honest-owned-tsconfig"
  });
  await fs.mkdir(manifest.paths.e2eRunRoot, { recursive: true });
  const receiptPath = path.join(
    manifest.paths.e2eRunRoot,
    "evidence",
    "full-run-runtime-source-hold.json"
  );
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let childCount = 0;
  let cleanupCount = 0;

  const result = await runStarshipFullExecutionSourceHold({
    executeChild: async ({ childExited, postSpawnLoad }) => {
      childCount += 1;
      postSpawnLoad({ pgid: 91_202, pid: 91_201, startToken: "honest-owned-tsconfig" });
      assert.equal(
        await fs.readFile(manifest.paths.nextTsconfigPath, "utf8"),
        "{\"owned\":true}\n"
      );
      childExited({ code: 0, signal: null, spawnError: null });
    },
    invocation: {
      args: ["test", "tests/e2e/example.spec.ts"],
      command: process.execPath,
      cwd: repositoryRoot
    },
    prebuild: async () => {
      await fs.writeFile(
        manifest.paths.nextTsconfigPath,
        "{\"owned\":true}\n",
        { flag: "wx", mode: 0o600 }
      );
      return { status: "prebuilt" };
    },
    receiptPath,
    repositoryRoot,
    runtimeSourcePaths: [runtimeSourcePath],
    terminalCleanup: async () => {
      cleanupCount += 1;
      await fs.unlink(manifest.paths.nextTsconfigPath);
    }
  });

  assert.equal(childCount, 1);
  assert.equal(cleanupCount, 1);
  assert.deepEqual(
    result.receipt.boundaries.map(({ name, status }) => ({ name, status })),
    [
      { name: "opened", status: "exact" },
      { name: "postPrebuildPreSpawn", status: "exact" },
      { name: "postSpawnLoad", status: "exact" },
      { name: "immediatelyAfterChildExit", status: "exact" },
      { name: "beforeReceiptClose", status: "exact" }
    ]
  );
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
});

test("Playwright config validates the runner receipt and contains only a start server command", async () => {
  const configSource = await fs.readFile(
    new URL("../playwright.config.ts", import.meta.url),
    "utf8"
  );
  assert.match(configSource, /validateStarshipPlaywrightPrebuildReceipt/u);
  assert.doesNotMatch(configSource, /npm run build/u);
  assert.match(configSource, /npm run start/u);
});

test("native main awaits prebuild restore and receipt before the Playwright spawn site", async () => {
  const runnerSource = await fs.readFile(
    new URL("./run-starship-playwright.mjs", import.meta.url),
    "utf8"
  );
  const mainStart = runnerSource.indexOf("async function main(");
  const prebuildBoundary = runnerSource.indexOf(
    "await runStarshipNextEnvBuildBeforeLaunch",
    mainStart
  );
  const fullRunBoundary = runnerSource.indexOf(
    "await runStarshipFullExecutionSourceHold",
    mainStart
  );
  const fullRunSourceSet = runnerSource.indexOf(
    "starshipPlaywrightFullRunRuntimeSourcePaths",
    mainStart
  );
  const temporaryTsconfigPreparation = runnerSource.indexOf(
    "prepareStarshipNextPrebuild(prebuildInvocation)",
    mainStart
  );
  const playwrightSpawn = runnerSource.indexOf(
    "spawn(invocation.command, invocation.args",
    mainStart
  );
  assert.notEqual(mainStart, -1);
  assert.notEqual(fullRunBoundary, -1);
  assert.notEqual(fullRunSourceSet, -1);
  assert.notEqual(prebuildBoundary, -1);
  assert.notEqual(temporaryTsconfigPreparation, -1);
  assert.notEqual(playwrightSpawn, -1);
  assert.equal(fullRunSourceSet < fullRunBoundary, true);
  assert.equal(fullRunBoundary < prebuildBoundary, true);
  assert.equal(prebuildBoundary < temporaryTsconfigPreparation, true);
  assert.equal(prebuildBoundary < playwrightSpawn, true);
  assert.equal(fullRunBoundary < temporaryTsconfigPreparation, true);
  assert.equal(fullRunBoundary < playwrightSpawn, true);
});

test("transient runtime source mutation restored byte-for-byte still blocks launch", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "runtime-source.mjs");
  const original = Buffer.from("export const frozen = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  let launchCount = 0;
  await assert.rejects(
    runStarshipNextEnvBuildBeforeLaunch({
      build: async () => {
        await fs.writeFile(runtimeSourcePath, "export const transient = true;\n");
        await fs.writeFile(runtimeSourcePath, original);
        return { code: 0, signal: null, spawnError: null };
      },
      launch: async () => {
        launchCount += 1;
      },
      nextEnvPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath]
    }),
    /runtime source|change token|ctime/iu
  );
  assert.equal(launchCount, 0);
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
});

test("full-run runtime source hold rejects a child-phase transient mutation restored byte-for-byte", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "runtime-source.mjs");
  const receiptPath = path.join(repositoryRoot, "evidence", "full-run-runtime-source-hold.json");
  const original = Buffer.from("export const heldForFullRun = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const childIdentity = Object.freeze({
    pgid: 91_002,
    pid: 91_001,
    startToken: "Thu Aug 20 19:00:00 2026"
  });
  let terminalCleanupCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad(childIdentity);
        await fs.writeFile(runtimeSourcePath, "export const transient = true;\n");
        await fs.writeFile(runtimeSourcePath, original);
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: {
        args: ["test", "tests/e2e/example.spec.ts"],
        command: process.execPath,
        cwd: repositoryRoot
      },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {
        terminalCleanupCount += 1;
      }
    }),
    /full-run runtime source|change token|ctime/iu
  );
  assert.equal(terminalCleanupCount, 1);
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.equal(receipt.contract, "starship-playwright-full-run-runtime-source-hold-v2");
  assert.equal(receipt.schemaVersion, 2);
  assert.deepEqual(receipt.orderedSourcePaths, [runtimeSourcePath]);
  assert.deepEqual(receipt.child, childIdentity);
  assert.deepEqual(receipt.invocation, {
    args: ["test", "tests/e2e/example.spec.ts"],
    command: process.execPath,
    cwd: repositoryRoot
  });
  assert.deepEqual(
    receipt.boundaries.map(({ name }) => name),
    [
      "opened",
      "postPrebuildPreSpawn",
      "postSpawnLoad",
      "immediatelyAfterChildExit",
      "beforeReceiptClose"
    ]
  );
  assert.equal(
    receipt.boundaries.find(({ name }) => name === "immediatelyAfterChildExit").status,
    "failed"
  );
  assert.deepEqual(receipt.closeErrors, []);
  assert.equal(receipt.sources[0].held.sha256, sha256(original));
  assert.equal(receipt.sources[0].final.sha256, sha256(original));
});

test("full-run runtime source hold rejects a transient whole-parent swap restored before child exit", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const sourceParentPath = path.join(repositoryRoot, "held-source-parent");
  const displacedParentPath = path.join(repositoryRoot, "held-source-parent.displaced");
  const runtimeSourcePath = path.join(sourceParentPath, "runtime-source.mjs");
  const receiptPath = path.join(repositoryRoot, "evidence", "whole-parent-transient.json");
  const original = Buffer.from("export const heldParent = true;\n");
  const malicious = Buffer.from("export const transientParent = true;\n");
  await fs.mkdir(sourceParentPath, { mode: 0o700 });
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let bytesObservedDuringSwap = null;

  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad({ pgid: 91_102, pid: 91_101, startToken: "whole-parent-child" });
        await fs.rename(sourceParentPath, displacedParentPath);
        await fs.mkdir(sourceParentPath, { mode: 0o700 });
        await fs.writeFile(runtimeSourcePath, malicious, { mode: 0o600 });
        bytesObservedDuringSwap = await fs.readFile(runtimeSourcePath);
        await fs.rm(sourceParentPath, { recursive: true });
        await fs.rename(displacedParentPath, sourceParentPath);
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: {
        args: ["test", "tests/e2e/example.spec.ts"],
        command: process.execPath,
        cwd: repositoryRoot
      },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {}
    }),
    /full-run runtime source|parent.*change token|ctime/iu
  );

  assert.deepEqual(bytesObservedDuringSwap, malicious);
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  const childExitBoundary = receipt.boundaries.find(
    ({ name }) => name === "immediatelyAfterChildExit"
  );
  assert.equal(childExitBoundary.status, "failed");
  assert.equal(
    childExitBoundary.sources[0].parent.held.ctimeNs ===
      childExitBoundary.sources[0].parent.path.ctimeNs,
    false
  );
});

test("full-run hold blocks prebuild and child spawn when the opened boundary loses its exact path", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "opened-race-source.mjs");
  const displacedPath = `${runtimeSourcePath}.held`;
  const receiptPath = path.join(repositoryRoot, "evidence", "opened-race.json");
  const original = Buffer.from("export const openedRace = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  let prebuildCount = 0;
  let childCount = 0;
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async () => {
        childCount += 1;
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      operations: {
        afterSourcesCaptured() {
          renameSync(runtimeSourcePath, displacedPath);
          writeFileSync(runtimeSourcePath, original, { mode: 0o600 });
        }
      },
      prebuild: async () => {
        prebuildCount += 1;
      },
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {}
    }),
    /opened|path identity|full-run runtime source/iu
  );
  assert.equal(prebuildCount, 0);
  assert.equal(childCount, 0);
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
  assert.deepEqual(await fs.readFile(displacedPath), original);
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.equal(receipt.boundaries[0].name, "opened");
  assert.equal(receipt.boundaries[0].status, "failed");
});

for (const outcome of [
  { code: 7, signal: null, spawnError: null },
  { code: null, signal: "SIGTERM", spawnError: null }
]) {
  test(`full-run source hold validates and closes before rejecting child outcome ${JSON.stringify(outcome)}`, async (t) => {
    const { repositoryRoot } = await createFixture(t);
    const runtimeSourcePath = path.join(repositoryRoot, "child-outcome-source.mjs");
    const receiptPath = path.join(
      repositoryRoot,
      "evidence",
      `child-outcome-${outcome.code ?? outcome.signal}.json`
    );
    await fs.writeFile(runtimeSourcePath, "export const childOutcome = true;\n", { mode: 0o600 });
    await fs.mkdir(path.dirname(receiptPath), { recursive: true });
    let closeCount = 0;
    let cleanupCount = 0;
    await assert.rejects(
      runStarshipFullExecutionSourceHold({
        executeChild: async ({ childExited, postSpawnLoad }) => {
          postSpawnLoad({ pgid: 92_002, pid: 92_001, startToken: "exact-child-start" });
          childExited(outcome);
        },
        invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
        operations: {
          closeDescriptor(descriptor) {
            closeSync(descriptor);
            closeCount += 1;
          }
        },
        prebuild: async () => ({ status: "prebuilt" }),
        receiptPath,
        repositoryRoot,
        runtimeSourcePaths: [runtimeSourcePath],
        terminalCleanup: async () => {
          cleanupCount += 1;
        }
      }),
      /child outcome|code|signal|SIGTERM|7/iu
    );
    assert.equal(cleanupCount, 1);
    assert.equal(closeCount, 2);
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    assert.deepEqual(
      receipt.boundaries.find(({ name }) => name === "immediatelyAfterChildExit").outcome,
      outcome
    );
    assert.equal(receipt.boundaries.at(-1).status, "exact");
    assert.deepEqual(receipt.closeErrors, []);
  });
}

test("full-run hold rejects and preserves missing, symlink, and byte-identical successor source paths before spawn", async (t) => {
  for (const mutation of ["missing", "symlink", "successor"]) {
    const { repositoryRoot } = await createFixture(t);
    const runtimeSourcePath = path.join(repositoryRoot, `${mutation}-source.mjs`);
    const displacedPath = `${runtimeSourcePath}.held`;
    const receiptPath = path.join(repositoryRoot, "evidence", `${mutation}-receipt.json`);
    const original = Buffer.from(`export const mutation = ${JSON.stringify(mutation)};\n`);
    await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
    await fs.mkdir(path.dirname(receiptPath), { recursive: true });
    const originalStat = await fs.lstat(runtimeSourcePath, { bigint: true });
    let childCount = 0;
    await assert.rejects(
      runStarshipFullExecutionSourceHold({
        executeChild: async () => {
          childCount += 1;
        },
        invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
        prebuild: async () => {
          if (mutation === "missing") {
            await fs.unlink(runtimeSourcePath);
          } else {
            await fs.rename(runtimeSourcePath, displacedPath);
            if (mutation === "symlink") await fs.symlink(displacedPath, runtimeSourcePath);
            else await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
          }
        },
        receiptPath,
        repositoryRoot,
        runtimeSourcePaths: [runtimeSourcePath],
        terminalCleanup: async () => {}
      }),
      /full-run runtime source|path identity|path observation/iu,
      mutation
    );
    assert.equal(childCount, 0, mutation);
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    assert.equal(
      receipt.boundaries.find(({ name }) => name === "postPrebuildPreSpawn").status,
      "failed",
      mutation
    );
    if (mutation === "missing") {
      await assert.rejects(fs.lstat(runtimeSourcePath), { code: "ENOENT" });
    } else if (mutation === "symlink") {
      assert.equal((await fs.lstat(runtimeSourcePath)).isSymbolicLink(), true);
      assert.equal(await fs.readlink(runtimeSourcePath), displacedPath);
    } else {
      const successor = await fs.lstat(runtimeSourcePath, { bigint: true });
      assert.notEqual(successor.ino, originalStat.ino);
      assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
    }
  }
});

test("config, global setup, G03, path-gate, and canonical CLI helper transient child mutations all fail the full-run hold", async (t) => {
  const relativePaths = [
    "playwright.config.ts",
    "tests/e2e/starship-e2e-global-setup.ts",
    "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
    "scripts/starship-e2e-path-gate.mjs",
    "tests/e2e/mainland-focused-canonical-cli.ts"
  ];
  for (let index = 0; index < relativePaths.length; index += 1) {
    const { repositoryRoot } = await createFixture(t);
    const runtimeSourcePath = path.join(repositoryRoot, relativePaths[index]);
    const receiptPath = path.join(repositoryRoot, "evidence", `transient-${index}.json`);
    const original = Buffer.from(`// held ${relativePaths[index]}\n`);
    await fs.mkdir(path.dirname(runtimeSourcePath), { recursive: true });
    await fs.mkdir(path.dirname(receiptPath), { recursive: true });
    await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
    await assert.rejects(
      runStarshipFullExecutionSourceHold({
        executeChild: async ({ childExited, postSpawnLoad }) => {
          postSpawnLoad({ pgid: 93_002 + index, pid: 93_001 + index, startToken: `child-${index}` });
          await fs.writeFile(runtimeSourcePath, `// transient ${index}\n`);
          await fs.writeFile(runtimeSourcePath, original);
          childExited({ code: 0, signal: null, spawnError: null });
        },
        invocation: { args: ["test", relativePaths[index]], command: process.execPath, cwd: repositoryRoot },
        prebuild: async () => ({ status: "prebuilt" }),
        receiptPath,
        repositoryRoot,
        runtimeSourcePaths: [runtimeSourcePath],
        terminalCleanup: async () => {}
      }),
      /full-run runtime source|change token|ctime/iu,
      relativePaths[index]
    );
    assert.deepEqual(await fs.readFile(runtimeSourcePath), original, relativePaths[index]);
  }
});

test("honest full-run hold closes every source and parent descriptor only after terminal cleanup", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "honest-full-run-source.mjs");
  const receiptPath = path.join(repositoryRoot, "evidence", "honest-full-run.json");
  await fs.writeFile(runtimeSourcePath, "export const honest = true;\n", { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const events = [];
  const closedDescriptors = [];
  const result = await runStarshipFullExecutionSourceHold({
    executeChild: async ({ childExited, postSpawnLoad }) => {
      events.push("child");
      postSpawnLoad({ pgid: 94_002, pid: 94_001, startToken: "honest-child" });
      childExited({ code: 0, signal: null, spawnError: null });
      return "child-result";
    },
    invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
    operations: {
      closeDescriptor(descriptor, { kind }) {
        events.push(`close-${kind}`);
        closeSync(descriptor);
        closedDescriptors.push(descriptor);
      }
    },
    prebuild: async () => {
      events.push("prebuild");
      return "prebuild-result";
    },
    receiptPath,
    repositoryRoot,
    runtimeSourcePaths: [runtimeSourcePath],
    terminalCleanup: async () => {
      events.push("cleanup");
    }
  });
  assert.equal(result.prebuildResult, "prebuild-result");
  assert.equal(result.childResult, "child-result");
  assert.deepEqual(events, ["prebuild", "child", "cleanup", "close-source", "close-parent"]);
  assert.equal(closedDescriptors.length, 2);
  for (const descriptor of closedDescriptors) {
    assert.throws(() => fstatSync(descriptor), (error) => error?.code === "EBADF");
  }
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.equal(receipt.boundaries.every(({ status }) => status === "exact"), true);
  assert.deepEqual(receipt.closeErrors, []);
});

test("full-run receipt records every source descriptor close error without erasing the child result", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "close-error-source.mjs");
  const receiptPath = path.join(repositoryRoot, "evidence", "close-errors.json");
  await fs.writeFile(runtimeSourcePath, "export const closeErrors = true;\n", { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad({ pgid: 95_002, pid: 95_001, startToken: "close-error-child" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      operations: {
        closeDescriptor(descriptor, { kind }) {
          closeSync(descriptor);
          throw new Error(`${kind} close audit failure`);
        }
      },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {}
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.equal(
        error.errors.some((entry) => /source descriptor close/iu.test(entry.message)),
        true
      );
      assert.equal(
        error.errors.some((entry) => /parent descriptor close/iu.test(entry.message)),
        true
      );
      return true;
    }
  );
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.deepEqual(
    receipt.closeErrors.map(({ kind }) => kind),
    ["source", "parent"]
  );
  assert.match(receipt.closeErrors[0].error, /source close audit failure/u);
  assert.match(receipt.closeErrors[1].error, /parent close audit failure/u);
  assert.deepEqual(
    receipt.boundaries.find(({ name }) => name === "immediatelyAfterChildExit").outcome,
    { code: 0, signal: null, spawnError: null }
  );
});

test("terminal-cleanup transient source mutation restored byte-for-byte is rejected before receipt close", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "cleanup-transient-source.mjs");
  const receiptPath = path.join(repositoryRoot, "evidence", "cleanup-transient.json");
  const original = Buffer.from("export const cleanupHeld = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad({ pgid: 96_002, pid: 96_001, startToken: "cleanup-child" });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {
        await fs.writeFile(runtimeSourcePath, "export const cleanupTransient = true;\n");
        await fs.writeFile(runtimeSourcePath, original);
      }
    }),
    /full-run runtime source|final boundary|change token|ctime/iu
  );
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  assert.equal(receipt.boundaries.at(-1).name, "beforeReceiptClose");
  assert.equal(receipt.boundaries.at(-1).status, "failed");
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
});

test("byte-identical source successor installed during child execution is preserved and remains RED", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const runtimeSourcePath = path.join(repositoryRoot, "child-successor-source.mjs");
  const displacedPath = `${runtimeSourcePath}.held`;
  const receiptPath = path.join(repositoryRoot, "evidence", "child-successor.json");
  const original = Buffer.from("export const childSuccessor = true;\n");
  await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const originalStat = await fs.lstat(runtimeSourcePath, { bigint: true });
  await assert.rejects(
    runStarshipFullExecutionSourceHold({
      executeChild: async ({ childExited, postSpawnLoad }) => {
        postSpawnLoad({ pgid: 97_002, pid: 97_001, startToken: "successor-child" });
        await fs.rename(runtimeSourcePath, displacedPath);
        await fs.writeFile(runtimeSourcePath, original, { mode: 0o600 });
        childExited({ code: 0, signal: null, spawnError: null });
      },
      invocation: { args: ["test"], command: process.execPath, cwd: repositoryRoot },
      prebuild: async () => ({ status: "prebuilt" }),
      receiptPath,
      repositoryRoot,
      runtimeSourcePaths: [runtimeSourcePath],
      terminalCleanup: async () => {}
    }),
    /full-run runtime source|path identity|inode/iu
  );
  const successorStat = await fs.lstat(runtimeSourcePath, { bigint: true });
  const displacedStat = await fs.lstat(displacedPath, { bigint: true });
  assert.notEqual(successorStat.ino, originalStat.ino);
  assert.equal(displacedStat.ino, originalStat.ino);
  assert.deepEqual(await fs.readFile(runtimeSourcePath), original);
  assert.deepEqual(await fs.readFile(displacedPath), original);
});

test("receipt validation rejects a runtime source transiently mutated after the build join", async (t) => {
  const fixture = await createReceiptFixture(t);
  const sourcePath = fixture.receipt.runtimeSources[0].after.path;
  const original = await fs.readFile(sourcePath);
  await fs.writeFile(sourcePath, "transient-after-build-join\n");
  await fs.writeFile(sourcePath, original);
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment: fixture.environment,
      nowMs: Date.now(),
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /runtime source|change token|ctime/iu
  );
});

test("receipt validation preserves and rejects a byte-identical runtime source successor", async (t) => {
  const fixture = await createReceiptFixture(t);
  const sourcePath = fixture.receipt.runtimeSources[1].after.path;
  const displacedPath = `${sourcePath}.created`;
  const original = await fs.readFile(sourcePath);
  await fs.rename(sourcePath, displacedPath);
  await fs.writeFile(sourcePath, original, { mode: 0o600 });
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment: fixture.environment,
      nowMs: Date.now(),
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /runtime source|inode mismatch|identity/iu
  );
  assert.deepEqual(await fs.readFile(sourcePath), original);
});

test("receipt validation rejects a missing runtime source without recreating it", async (t) => {
  const fixture = await createReceiptFixture(t);
  const sourcePath = fixture.receipt.runtimeSources[2].after.path;
  await fs.unlink(sourcePath);
  assert.throws(
    () => validateStarshipPlaywrightPrebuildReceipt({
      baseURL: fixture.baseURL,
      environment: fixture.environment,
      nowMs: Date.now(),
      pathManifest: fixture.pathManifest,
      port: fixture.port,
      processIdentity: fixture.processIdentity
    }),
    /ENOENT|runtime source/iu
  );
  await assert.rejects(fs.lstat(sourcePath), { code: "ENOENT" });
});

test("exclusive receipt creation rejects and preserves a byte-identical successor after close", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const filePath = path.join(repositoryRoot, "evidence", "receipt.json");
  const displacedPath = `${filePath}.created`;
  const bytes = Buffer.from('{"receipt":true}\n');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  assert.throws(
    () => createStarshipExclusiveRegularFile(
      "test receipt",
      filePath,
      bytes,
      {
        afterCreatedDescriptorClosed() {
          renameSync(filePath, displacedPath);
          writeFileSync(filePath, bytes, { mode: 0o600 });
        }
      }
    ),
    /inode mismatch|identity/iu
  );
  assert.deepEqual(await fs.readFile(filePath), bytes);
  assert.deepEqual(await fs.readFile(displacedPath), bytes);
});

test("held temp file cleanup preserves a foreign successor instead of deleting it", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const filePath = path.join(repositoryRoot, "tsconfig.playwright-held.tmp.json");
  const displacedPath = `${filePath}.created`;
  const held = createStarshipHeldExclusiveFile({
    bytes: Buffer.from('{"owned":true}\n'),
    filePath,
    label: "held temp tsconfig"
  });
  await fs.rename(filePath, displacedPath);
  await fs.writeFile(filePath, '{"foreign":true}\n', { mode: 0o600 });
  assert.throws(
    () => removeStarshipHeldExclusiveFile(held),
    /preserving the foreign path/iu
  );
  assert.equal(await fs.readFile(filePath, "utf8"), '{"foreign":true}\n');
});

test("held temp cleanup preserves a foreign successor interposed after final validation", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const filePath = path.join(repositoryRoot, "tsconfig.playwright-late-successor.tmp.json");
  const displacedPath = `${filePath}.created`;
  const held = createStarshipHeldExclusiveFile({
    bytes: Buffer.from('{"owned":true}\n'),
    filePath,
    label: "held late-successor temp tsconfig"
  });
  assert.throws(
    () => removeStarshipHeldExclusiveFile(held, {
      afterFinalValidationBeforeDisposition() {
        renameSync(filePath, displacedPath);
        writeFileSync(filePath, '{"foreign":true}\n', { mode: 0o600 });
      }
    }),
    /foreign|successor|preserv/iu
  );
  assert.equal(await fs.readFile(filePath, "utf8"), '{"foreign":true}\n');
  assert.equal(await fs.readFile(displacedPath, "utf8"), '{"owned":true}\n');
});

test("run-lock release preserves a foreign successor interposed after final validation", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const lockPath = path.join(repositoryRoot, ".tmp", "starship-playwright-run.lock");
  const displacedPath = `${lockPath}.created`;
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  const release = acquireStarshipPlaywrightRunLock(lockPath, {
    ownerPid: process.pid,
    repositoryRoot,
    runId: "late-lock-successor"
  });
  assert.throws(
    () => release({
      afterFinalValidationBeforeDisposition() {
        renameSync(lockPath, displacedPath);
        writeFileSync(lockPath, '{"foreign":true}\n', { mode: 0o600 });
      }
    }),
    /foreign|successor|preserv/iu
  );
  assert.equal(await fs.readFile(lockPath, "utf8"), '{"foreign":true}\n');
  assert.match(await fs.readFile(displacedPath, "utf8"), /late-lock-successor/u);
});

test("held temp cleanup preserves its inode when exact created bytes changed", async (t) => {
  const { repositoryRoot } = await createFixture(t);
  const filePath = path.join(repositoryRoot, "tsconfig.playwright-mutated.tmp.json");
  const held = createStarshipHeldExclusiveFile({
    bytes: Buffer.from('{"owned":true}\n'),
    filePath,
    label: "held mutated temp tsconfig"
  });
  await fs.writeFile(filePath, '{"mutated":true}\n');
  assert.throws(
    () => removeStarshipHeldExclusiveFile(held),
    /created|current|change token|sha256|size/iu
  );
  assert.equal(await fs.readFile(filePath, "utf8"), '{"mutated":true}\n');
});

test("whole-run next-env boundary preserves a post-receipt foreign replacement", async (t) => {
  const { nextEnvPath, repositoryRoot } = await createFixture(t);
  const displacedPath = path.join(repositoryRoot, "next-env.original.d.ts");
  await assert.rejects(
    runStarshipNextEnvWholeRunBoundary({
      nextEnvPath,
      repositoryRoot,
      run: async () => {
        await fs.rename(nextEnvPath, displacedPath);
        await fs.writeFile(nextEnvPath, "foreign-after-receipt\n", { mode: 0o600 });
      }
    }),
    /preserving the foreign path/iu
  );
  assert.equal(await fs.readFile(nextEnvPath, "utf8"), "foreign-after-receipt\n");
  assert.equal(await fs.readFile(displacedPath, "utf8"), "canonical-next-env\n");
});

for (const outcome of [
  { code: 7, signal: null, spawnError: null },
  { code: null, signal: "SIGTERM", spawnError: null },
  { code: null, signal: null, spawnError: "spawn EACCES" }
]) {
  test(`build outcome ${JSON.stringify(outcome)} is preserved before log-close failure`, () => {
    const closeError = new Error("server log close failed");
    assert.throws(
      () => finalizeStarshipPrebuildProcessOutcome({ closeError, outcome }),
      (error) => {
        assert.equal(error instanceof AggregateError, true);
        assert.equal(error.errors.length, 2);
        assert.match(error.errors[0].message, /Starship prebuild process failed/iu);
        assert.match(error.errors[0].message, new RegExp(
          String(outcome.code ?? outcome.signal ?? outcome.spawnError).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "u"
        ));
        assert.equal(error.errors[1], closeError);
        return true;
      }
    );
  });
}
