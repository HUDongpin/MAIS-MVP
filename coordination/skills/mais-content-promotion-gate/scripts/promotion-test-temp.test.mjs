import assert from "node:assert/strict";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";

const SCRIPTS = new URL("./", import.meta.url);

async function matchingTopLevelNodes(prefix) {
  const root = await realpath(tmpdir());
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.name.startsWith(prefix))
    .map((entry) => ({
      name: entry.name,
      type: entry.isSymbolicLink() ? "symlink" : entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

test("all Promotion test temp directories use the exact-root cleanup helper", async () => {
  const entries = (await readdir(SCRIPTS, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /(?:\.test|\.test-helper)\.mjs$/u.test(entry.name));
  const offenders = [];
  for (const entry of entries) {
    const source = await readFile(new URL(entry.name, SCRIPTS), "utf8");
    if (/\bmkdtemp\s*\(/u.test(source)) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("test temp cleanup is idempotent and covers normal and setup-failure paths", async (t) => {
  let tempApi;
  await assert.doesNotReject(async () => { tempApi = await import("./promotion-test-temp.mjs"); });
  const prefix = `promotion-cleanup-meta-${process.pid}-`;
  const before = await matchingTopLevelNodes(prefix);
  let normalRoot;
  await t.test("normal child cleanup", async (child) => {
    normalRoot = await tempApi.createPromotionTestTempDir(child, prefix);
    assert.ok(basename(normalRoot).startsWith(prefix));
    await writeFile(join(normalRoot, "proof.txt"), "proof\n", "utf8");
  });
  await assert.rejects(lstat(normalRoot), (error) => error.code === "ENOENT");

  let aliasRoot;
  let siblingAlias;
  await t.test("top-level sibling symlink cleanup", async (child) => {
    aliasRoot = await tempApi.createPromotionTestTempDir(child, `${prefix}alias-root-`);
    siblingAlias = await tempApi.createPromotionTestSiblingSymlink(child, aliasRoot, "-alias");
    assert.equal((await lstat(siblingAlias)).isSymbolicLink(), true);
  });
  await assert.rejects(lstat(aliasRoot), (error) => error.code === "ENOENT");
  await assert.rejects(lstat(siblingAlias), (error) => error.code === "ENOENT");

  let failedRoot;
  await assert.rejects(
    tempApi.withPromotionTestTempDir(t, `${prefix}setup-`, async (root) => {
      failedRoot = root;
      throw new Error("intentional setup failure");
    }),
    /intentional setup failure/u,
  );
  await assert.rejects(lstat(failedRoot), (error) => error.code === "ENOENT");
  await tempApi.cleanupPromotionTestTempDir(failedRoot);
  assert.deepEqual(await matchingTopLevelNodes(prefix), before);
});
