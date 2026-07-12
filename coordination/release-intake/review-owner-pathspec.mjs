#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function usage() {
  console.error("Usage: node coordination/release-intake/review-owner-pathspec.mjs <pathspec-file> [--status] [--diffstat] [--diff]");
  process.exit(2);
}

function readPathspec(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error(`Pathspec must be inside repo: ${relativePath}`);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing pathspec file: ${relativePath}`);
  const paths = fs.readFileSync(absolutePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (paths.length === 0) throw new Error(`Pathspec file has no paths: ${relativePath}`);
  for (const item of paths) {
    if (path.isAbsolute(item) || item.includes("\0") || item.split(/[\\/]/).includes("..")) {
      throw new Error(`Unsafe pathspec entry: ${item}`);
    }
  }
  return paths;
}

function runPathBatches(prefixArgs, paths) {
  const outputs = [];
  for (let index = 0; index < paths.length; index += 200) {
    const batch = paths.slice(index, index + 200);
    const output = git([...prefixArgs, "--", ...batch]);
    if (output) outputs.push(output);
  }
  return outputs.join("\n");
}

function uniqueSortedLines(value) {
  return [...new Set(value.split(/\r?\n/).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function main() {
  const [, , pathspecFile, ...flags] = process.argv;
  if (!pathspecFile) usage();
  const requested = new Set(flags);
  if (requested.size === 0) {
    requested.add("--status");
    requested.add("--diffstat");
  }
  for (const flag of requested) {
    if (!["--status", "--diffstat", "--diff"].includes(flag)) usage();
  }

  const paths = readPathspec(pathspecFile);
  console.log("# A25 owner pathspec review");
  console.log(`Pathspec: ${pathspecFile}`);
  console.log(`Paths: ${paths.length}`);

  if (requested.has("--status")) {
    console.log("\n## git status --short");
    const output = runPathBatches(["status", "--short"], paths);
    const lines = uniqueSortedLines(output);
    console.log(lines.length > 0 ? lines.join("\n") : "clean");
  }

  if (requested.has("--diffstat")) {
    console.log("\n## git diff --stat");
    const output = runPathBatches(["diff", "--stat"], paths);
    console.log(output || "no tracked diff");
  }

  if (requested.has("--diff")) {
    console.log("\n## git diff --binary");
    const output = runPathBatches(["diff", "--binary"], paths);
    console.log(output || "no tracked diff");
  }
}

main();
