#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `Usage: node suite-tools/hash-skill-tree.mjs [--package-view] SKILL_DIR

Compute a deterministic SHA-256 over sorted relative paths and file-content
SHA-256 values. The command is offline and read-only. It rejects symbolic links
and non-regular files. --package-view applies the exclusions used by the
canonical Skill Creator packager (root evals, caches, pyc, and .DS_Store).
`;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function shouldExclude(relativePath, packageView) {
  if (!packageView) return false;
  const parts = relativePath.split("/");
  if (parts[0] === "evals") return true;
  if (parts.includes("__pycache__") || parts.includes("node_modules")) return true;
  const name = parts.at(-1);
  return name === ".DS_Store" || name.endsWith(".pyc");
}

function collectFiles(root, current, packageView, files) {
  const entries = fs.readdirSync(current, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`symbolic link is not allowed: ${relative}`);
    if (shouldExclude(relative, packageView)) continue;
    if (stat.isDirectory()) {
      collectFiles(root, absolute, packageView, files);
      continue;
    }
    if (!stat.isFile()) throw new Error(`non-regular file is not allowed: ${relative}`);
    const contentSha256 = sha256(fs.readFileSync(absolute));
    files.push({ path: relative, sha256: contentSha256 });
  }
}

export function hashSkillTree(skillDirectory, { packageView = false } = {}) {
  const root = path.resolve(skillDirectory);
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("skill path must be a real directory");
  }
  const files = [];
  collectFiles(root, root, packageView, files);
  if (files.length === 0) throw new Error("skill directory contains no hashable files");
  const canonical = files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join("");
  return {
    schemaVersion: "1.0",
    algorithm: "sha256(sorted-relative-path-nul-content-sha256-newline)",
    view: packageView ? "package" : "canonical-source",
    fileCount: files.length,
    treeSha256: sha256(Buffer.from(canonical, "utf8")),
    files,
  };
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  const packageView = argv.includes("--package-view");
  const positional = argv.filter((entry) => entry !== "--package-view");
  if (positional.length !== 1) {
    process.stderr.write(HELP);
    return 2;
  }
  try {
    const result = hashSkillTree(positional[0], { packageView });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`hash-skill-tree: ${error instanceof Error ? error.message : "unknown error"}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
