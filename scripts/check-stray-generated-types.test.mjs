import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as strayModule from "./check-stray-generated-types.mjs";

const { findStrayGeneratedTypes, assertNoBrokenStrayGeneratedTypes } = strayModule;
const scriptPath = path.resolve(new URL(".", import.meta.url).pathname, "check-stray-generated-types.mjs");

function nextValidator(specifiers) {
  return [
    "type AppPageConfig = unknown;",
    ...specifiers.map(
      (specifier, index) =>
        `{ const handler${index} = {} as typeof import(${JSON.stringify(specifier)}); type Check${index} = typeof handler${index}; }`
    )
  ].join("\n");
}

async function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content);
}

async function makeFixtureRepo() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-stray-types-"));
  // A route that still exists.
  await writeFile(repoRoot, "app/existing/page.tsx", "export default function Page() { return null; }\n");
  // Stray build referencing a DELETED route -> broken.
  await writeFile(
    repoRoot,
    "straybuild/types/validator.ts",
    nextValidator(["../../app/existing/page.js", "../../app/deleted/page.js"])
  );
  // Stray build whose routes all still exist -> valid stray (warn only).
  await writeFile(repoRoot, "goodstray/types/validator.ts", nextValidator(["../../app/existing/page.js"]));
  // Excluded dir (mirrors tsconfig exclude) -> must be ignored.
  await writeFile(repoRoot, "private/old/types/validator.ts", nextValidator(["../../../app/deleted/page.js"]));
  // Dot dir (tsc's **/*.ts skips it) -> must be ignored.
  await writeFile(repoRoot, ".next/types/validator.ts", nextValidator(["../../app/deleted/page.js"]));
  // Hand-written types/validator.ts without the Next shape -> must be ignored.
  await writeFile(repoRoot, "customlib/types/validator.ts", "export const validators = [];\n");
  return repoRoot;
}

test("flags a stray validator that references a deleted route as broken", async (t) => {
  const repoRoot = await makeFixtureRepo();
  t.after(async () => fs.rm(repoRoot, { recursive: true, force: true }));

  const { broken, strayValid } = findStrayGeneratedTypes({ repoRoot });

  assert.equal(broken.length, 1, `expected exactly one broken validator, got ${JSON.stringify(broken)}`);
  assert.equal(broken[0].path, "straybuild/types/validator.ts");
  assert.deepEqual(broken[0].missing, ["../../app/deleted/page.js"]);
  assert.deepEqual(strayValid, ["goodstray/types/validator.ts"]);
});

test("ignores validators under excluded dirs, dot dirs, and non-Next files", async (t) => {
  const repoRoot = await makeFixtureRepo();
  t.after(async () => fs.rm(repoRoot, { recursive: true, force: true }));

  const found = findStrayGeneratedTypes({ repoRoot });
  const allPaths = [...found.broken.map((b) => b.path), ...found.strayValid];

  assert.ok(!allPaths.some((p) => p.startsWith("private/")), "excluded private/ must be pruned");
  assert.ok(!allPaths.some((p) => p.startsWith(".next/")), "dot-dir .next/ must be pruned");
  assert.ok(!allPaths.includes("customlib/types/validator.ts"), "non-Next validator.ts must be skipped");
});

test("assertNoBrokenStrayGeneratedTypes throws on broken and warns on valid strays", async (t) => {
  const repoRoot = await makeFixtureRepo();
  t.after(async () => fs.rm(repoRoot, { recursive: true, force: true }));

  const warnings = [];
  assert.throws(
    () => assertNoBrokenStrayGeneratedTypes({ repoRoot, logger: { warn: (m) => warnings.push(m) } }),
    /Refusing to build[\s\S]*straybuild\/types\/validator\.ts[\s\S]*app\/deleted\/page\.js/
  );
  assert.ok(
    warnings.some((m) => m.includes("goodstray/types/validator.ts")),
    "valid stray should be surfaced as a warning"
  );
});

test("passes cleanly when there are no stray validators", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mais-stray-clean-"));
  t.after(async () => fs.rm(repoRoot, { recursive: true, force: true }));
  await writeFile(repoRoot, "app/existing/page.tsx", "export default function Page() { return null; }\n");
  await writeFile(repoRoot, ".next/types/validator.ts", nextValidator(["../../app/existing/page.js"]));

  const { broken, strayValid } = assertNoBrokenStrayGeneratedTypes({ repoRoot, logger: { warn() {} } });
  assert.equal(broken.length, 0);
  assert.equal(strayValid.length, 0);
});

test("CLI exits 1 on a broken stray and 0 once it is removed", async (t) => {
  const repoRoot = await makeFixtureRepo();
  t.after(async () => fs.rm(repoRoot, { recursive: true, force: true }));

  const failing = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(failing.status, 1, failing.stdout + failing.stderr);
  assert.match(failing.stderr, /Refusing to build/);
  assert.match(failing.stderr, /straybuild\/types\/validator\.ts/);

  await fs.rm(path.join(repoRoot, "straybuild"), { recursive: true, force: true });
  await fs.rm(path.join(repoRoot, "goodstray"), { recursive: true, force: true });
  const passing = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
});
