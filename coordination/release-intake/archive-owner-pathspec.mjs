#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const args = parseArgs(process.argv.slice(2));
if (!args.pathspec) usage();

const date = hktDateStamp();
const label = slug(args.label ?? path.basename(args.pathspec, ".pathspec"));
const archiveDir = path.join(root, "coordination", "release-intake", "archive");
const prefix = path.join(archiveDir, `${date}-A25-owner-archive-${label}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--label") parsed.label = argv[++index];
    else if (!parsed.pathspec) parsed.pathspec = arg;
    else usage();
  }
  return parsed;
}

function usage() {
  console.error("Usage: node coordination/release-intake/archive-owner-pathspec.mjs <pathspec-file> [--label <label>]");
  process.exit(2);
}

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function repoRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
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
    if (isSecretPath(item)) throw new Error(`Refusing to archive secret-looking path: ${item}`);
  }
  return paths;
}

function isSecretPath(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base.endsWith(".example") || base.endsWith(".sample")) return false;
  if (base === ".env" || base === ".env.local" || base.startsWith(".env.")) return true;
  return /(?:^|[._-])(id_rsa|id_dsa|id_ed25519)(?:$|[._-])/.test(base)
    || /\.(pem|p12|pfx|key)$/i.test(base);
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
  return [...new Set(String(value).split(/\r?\n/).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function write(filePath, content) {
  fs.writeFileSync(filePath, `${String(content ?? "").replace(/\s+$/u, "")}\n`);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function fileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileBytes(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function main() {
  fs.mkdirSync(archiveDir, { recursive: true });
  const paths = readPathspec(args.pathspec);
  const status = uniqueSortedLines(runPathBatches(["status", "--short"], paths)).join("\n");
  const diffstat = runPathBatches(["diff", "--stat"], paths) || "No tracked diff.";
  const patch = runPathBatches(["diff", "--binary"], paths);
  const untracked = uniqueSortedLines(runPathBatches(["ls-files", "--others", "--exclude-standard"], paths)).join("\n");

  const statusPath = `${prefix}.status.txt`;
  const diffstatPath = `${prefix}.diffstat.txt`;
  const patchPath = `${prefix}.tracked.patch`;
  const untrackedPath = `${prefix}.untracked.txt`;
  const summaryPath = `${prefix}.summary.json`;
  const markdownPath = `${prefix}.md`;

  write(statusPath, status || "clean");
  write(diffstatPath, diffstat);
  write(patchPath, patch);
  write(untrackedPath, untracked || "none");

  const summary = {
    archivedAt: new Date().toISOString(),
    pathspec: args.pathspec,
    label,
    pathCount: paths.length,
    statusEntries: status ? status.split("\n").filter(Boolean).length : 0,
    untrackedEntries: untracked ? untracked.split("\n").filter(Boolean).length : 0,
    files: {
      status: repoRelative(statusPath),
      diffstat: repoRelative(diffstatPath),
      trackedPatch: repoRelative(patchPath),
      untracked: repoRelative(untrackedPath)
    },
    trackedPatchBytes: fileBytes(patchPath),
    trackedPatchSha256: fileSha256(patchPath),
    note: "Evidence archive only. This script does not stage, commit, restore, clean, delete, or archive untracked file payloads."
  };
  writeJson(summaryPath, summary);
  write(markdownPath, markdown(summary));

  console.log(JSON.stringify({
    summary: repoRelative(summaryPath),
    markdown: repoRelative(markdownPath),
    statusEntries: summary.statusEntries,
    untrackedEntries: summary.untrackedEntries,
    trackedPatchBytes: summary.trackedPatchBytes
  }, null, 2));
}

function markdown(summary) {
  return `# ${date} A25 Owner Pathspec Evidence Archive

- Archived at: ${summary.archivedAt}
- Pathspec: \`${summary.pathspec}\`
- Label: \`${summary.label}\`
- Paths: ${summary.pathCount}
- Status entries: ${summary.statusEntries}
- Untracked entries listed: ${summary.untrackedEntries}
- Tracked patch bytes: ${summary.trackedPatchBytes}
- Tracked patch sha256: \`${summary.trackedPatchSha256}\`

## Files

- \`${summary.files.status}\`: focused \`git status --short\` output.
- \`${summary.files.diffstat}\`: focused tracked diff stat.
- \`${summary.files.trackedPatch}\`: binary-safe tracked diff patch.
- \`${summary.files.untracked}\`: focused untracked path list; payloads are not bundled.

## Boundary

${summary.note}
`;
}

main();
