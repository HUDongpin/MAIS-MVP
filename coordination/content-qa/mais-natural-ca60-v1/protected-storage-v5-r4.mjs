import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import { canonicalJsonV5R3 } from "./execution-integrity-v5-r3.mjs";

function relativeParts(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) throw new TypeError("protected path must be a nonempty relative path");
  const normalized = path.normalize(relativePath);
  const parts = normalized.split(path.sep);
  if (normalized === "." || parts.some((part) => part === "" || part === "." || part === "..")) throw new TypeError("protected path traversal is forbidden");
  return parts;
}

async function requireDirectoryNoSymlink(directory, label) {
  const metadata = await lstat(directory);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`${label} must be a real directory, not a symlink`);
  return metadata;
}

export async function establishProtectedRootV5R4(root) {
  if (!path.isAbsolute(root)) throw new TypeError("protected root must be absolute");
  await mkdir(root, { recursive: true, mode: 0o700 });
  await requireDirectoryNoSymlink(root, "protected root");
  await chmod(root, 0o700);
  const trustedRealRoot = await realpath(root);
  if (trustedRealRoot !== path.resolve(root)) throw new Error("protected root itself may not traverse a symlink");
  return Object.freeze({ root: path.resolve(root), trustedRealRoot });
}

async function resolveParent({ root, trustedRealRoot }, relativePath, { create = false } = {}) {
  const parts = relativeParts(relativePath);
  let cursor = root;
  for (const part of parts.slice(0, -1)) {
    cursor = path.join(cursor, part);
    if (create) await mkdir(cursor, { mode: 0o700 }).catch((error) => { if (error?.code !== "EEXIST") throw error; });
    await requireDirectoryNoSymlink(cursor, `protected path component ${part}`);
    const actual = await realpath(cursor);
    if (actual !== trustedRealRoot && !actual.startsWith(`${trustedRealRoot}${path.sep}`)) throw new Error("protected path parent escaped the trusted root");
  }
  return { parent: cursor, basename: parts.at(-1) };
}

async function fsyncDirectory(directory) {
  const handle = await open(directory, constants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function readProtectedJsonV5R4({ trustedRoot, relativePath }) {
  const { parent, basename } = await resolveParent(trustedRoot, relativePath);
  const target = path.join(parent, basename);
  const before = await lstat(target);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error("protected input must be a regular non-symlink file");
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(target, flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("protected input changed during no-follow open");
    const bytes = await handle.readFile("utf8");
    const parsed = JSON.parse(bytes);
    if (`${canonicalJsonV5R3(parsed)}\n` !== bytes && canonicalJsonV5R3(parsed) !== bytes) throw new Error("protected JSON is not canonical");
    return parsed;
  } finally {
    await handle.close();
  }
}

export async function atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value }) {
  const { parent, basename } = await resolveParent(trustedRoot, relativePath, { create: true });
  const finalPath = path.join(parent, basename);
  try {
    await lstat(finalPath);
    throw new Error("append-only protected target already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const temporaryPath = path.join(parent, `.${basename}.${randomUUID()}.tmp`);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(temporaryPath, flags, 0o600);
  try {
    await handle.writeFile(canonicalJsonV5R3(value), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    const temporaryMetadata = await lstat(temporaryPath);
    if (temporaryMetadata.isSymbolicLink() || !temporaryMetadata.isFile()) throw new Error("protected temporary output is not a regular file");
    await link(temporaryPath, finalPath);
    await chmod(finalPath, 0o600);
    await fsyncDirectory(parent);
  } finally {
    await unlink(temporaryPath).catch((error) => { if (error?.code !== "ENOENT") throw error; });
  }
  const finalMetadata = await lstat(finalPath);
  if (finalMetadata.isSymbolicLink() || !finalMetadata.isFile() || (finalMetadata.mode & 0o777) !== 0o600) throw new Error("protected output mode or type verification failed");
  const parentReal = await realpath(parent);
  if (parentReal !== trustedRoot.trustedRealRoot && !parentReal.startsWith(`${trustedRoot.trustedRealRoot}${path.sep}`)) throw new Error("protected output parent escaped after write");
  return finalPath;
}

export async function assertNoSymlinkPathV5R4({ trustedRoot, relativePath, allowMissingLeaf = false }) {
  const { parent, basename } = await resolveParent(trustedRoot, relativePath);
  const target = path.join(parent, basename);
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) throw new Error("protected leaf is a symlink");
  } catch (error) {
    if (!(allowMissingLeaf && error?.code === "ENOENT")) throw error;
  }
  return target;
}

export async function ensureProtectedDirectoryV5R4({ trustedRoot, relativePath }) {
  const parts = relativeParts(relativePath);
  let cursor = trustedRoot.root;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    await mkdir(cursor, { mode: 0o700 }).catch((error) => { if (error?.code !== "EEXIST") throw error; });
    await requireDirectoryNoSymlink(cursor, `protected directory ${part}`);
    await chmod(cursor, 0o700);
    const actual = await realpath(cursor);
    if (actual !== trustedRoot.trustedRealRoot && !actual.startsWith(`${trustedRoot.trustedRealRoot}${path.sep}`)) throw new Error("protected directory escaped the trusted root");
  }
  return cursor;
}
