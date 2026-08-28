import { lstat, mkdtemp, readlink, realpath, rm, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const registeredRoots = new Map();

async function canonicalTempRoot() {
  return realpath(tmpdir());
}

function assertPrefix(prefix) {
  if (typeof prefix !== "string" || !prefix.startsWith("promotion-") || prefix.includes("/") || prefix.includes("\\") || prefix.includes("..")) {
    throw new Error("Promotion test temp prefix is unsafe");
  }
}

export async function cleanupPromotionTestTempDir(root) {
  const record = registeredRoots.get(root);
  if (!record) throw new Error("Promotion test temp root was not registered");
  const tempRoot = await canonicalTempRoot();
  const absolute = resolve(root);
  if (absolute !== root || dirname(absolute) !== tempRoot || !basename(absolute).startsWith(record.prefix)) {
    throw new Error("Promotion test cleanup target is not the exact registered root");
  }
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink() || !stat.isDirectory() || stat.dev !== record.dev || stat.ino !== record.ino) {
      throw new Error("Promotion test cleanup target is not the exact registered directory");
    }
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  await rm(absolute, { recursive: true, force: false });
}

export async function createPromotionTestTempDir(t, prefix) {
  if (!t || typeof t.after !== "function") throw new Error("Promotion test temp creation requires a node:test context");
  assertPrefix(prefix);
  const tempRoot = await canonicalTempRoot();
  const root = await mkdtemp(join(tempRoot, prefix));
  const stat = await lstat(root);
  registeredRoots.set(root, { prefix, dev: stat.dev, ino: stat.ino });
  t.after(async () => cleanupPromotionTestTempDir(root));
  return root;
}

export async function createPromotionTestSiblingSymlink(t, root, suffix) {
  if (!t || typeof t.after !== "function") throw new Error("Promotion test sibling creation requires a node:test context");
  const record = registeredRoots.get(root);
  if (!record || typeof suffix !== "string" || !/^-[a-z0-9-]+$/u.test(suffix)) {
    throw new Error("Promotion test sibling alias is unsafe");
  }
  const tempRoot = await canonicalTempRoot();
  const alias = `${root}${suffix}`;
  if (dirname(alias) !== tempRoot || !basename(alias).startsWith(record.prefix)) {
    throw new Error("Promotion test sibling alias is outside the exact temp root");
  }
  t.after(async () => {
    try {
      const stat = await lstat(alias);
      if (!stat.isSymbolicLink() || await readlink(alias) !== root) {
        throw new Error("Promotion test sibling cleanup target is not the exact registered symlink");
      }
      await unlink(alias);
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
  });
  await symlink(root, alias);
  return alias;
}

export async function withPromotionTestTempDir(t, prefix, setup) {
  const root = await createPromotionTestTempDir(t, prefix);
  let completed = false;
  try {
    const result = await setup(root);
    completed = true;
    return result;
  } finally {
    if (!completed) await cleanupPromotionTestTempDir(root);
  }
}
