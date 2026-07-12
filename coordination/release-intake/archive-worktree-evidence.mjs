#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = git(["rev-parse", "--show-toplevel"], process.cwd());
const args = parseArgs(process.argv.slice(2));
const worktreePath = path.resolve(args.worktree ?? process.cwd());
const label = slug(args.label ?? path.basename(worktreePath));
const date = hktDateStamp();
const outDir = path.join(repoRoot, "coordination", "release-intake", `${date}-A25-worktree-evidence-${label}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--worktree") parsed.worktree = argv[++index];
    else if (arg === "--label") parsed.label = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function run(args, cwd = worktreePath) {
  return execFileSync(args[0], args.slice(1), {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
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
    .slice(0, 80);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

function write(fileName, content) {
  fs.writeFileSync(path.join(outDir, fileName), `${content.replace(/\s+$/u, "")}\n`);
}

function writeJson(fileName, content) {
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(content, null, 2)}\n`);
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const branch = git(["branch", "--show-current"], worktreePath) || "(detached)";
  const head = git(["rev-parse", "HEAD"], worktreePath);
  const status = git(["status", "--porcelain=v1", "-uall"], worktreePath);
  const untracked = git(["ls-files", "--others", "--exclude-standard"], worktreePath)
    .split("\n")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  const trackedPatch = run(["git", "diff", "--binary"], worktreePath);
  const trackedStat = run(["git", "diff", "--stat"], worktreePath);
  const recentLog = git(["log", "--oneline", "--decorate", "-5"], worktreePath);

  write("status.txt", status || "clean");
  write("tracked-diff.patch", trackedPatch || "");
  write("tracked-diff-stat.txt", trackedStat || "No tracked diff.");
  write("recent-log.txt", recentLog);
  write("untracked-files.txt", untracked.join("\n"));

  const untrackedManifest = untracked.map((relativePath) => {
    const absolutePath = path.join(worktreePath, relativePath);
    return {
      path: relativePath,
      bytes: fileSize(absolutePath),
      sha256: sha256(absolutePath)
    };
  });
  writeJson("untracked-manifest.json", untrackedManifest);

  let untrackedArchive = null;
  if (untracked.length > 0) {
    const listPath = path.join(outDir, "untracked-files.tar-list");
    fs.writeFileSync(listPath, `${untracked.join("\n")}\n`);
    untrackedArchive = path.join(outDir, "untracked-files.tar.gz");
    execFileSync("tar", ["-czf", untrackedArchive, "-C", worktreePath, "-T", listPath], {
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  const summary = {
    archivedAt: new Date().toISOString(),
    worktreePath,
    branch,
    head,
    statusEntries: status ? status.split("\n").filter(Boolean).length : 0,
    trackedPatch: "tracked-diff.patch",
    trackedPatchBytes: fileSize(path.join(outDir, "tracked-diff.patch")),
    untrackedCount: untracked.length,
    untrackedArchive: untrackedArchive ? "untracked-files.tar.gz" : null,
    untrackedManifest: "untracked-manifest.json",
    restoreNotes: [
      "Review tracked-diff.patch before applying it.",
      "Restore untracked files by extracting untracked-files.tar.gz from the target repo root.",
      "This archive is evidence only; it does not approve merge, discard, or release."
    ]
  };

  writeJson("summary.json", summary);
  write("README.md", markdown(summary));

  console.log(JSON.stringify({
    outDir: path.relative(repoRoot, outDir).split(path.sep).join("/"),
    statusEntries: summary.statusEntries,
    untrackedCount: summary.untrackedCount,
    trackedPatchBytes: summary.trackedPatchBytes
  }, null, 2));
}

function markdown(summary) {
  return `# A25 Worktree Evidence Archive

- Archived at: ${summary.archivedAt}
- Worktree: \`${summary.worktreePath}\`
- Branch: \`${summary.branch}\`
- Head: \`${summary.head}\`
- Status entries: ${summary.statusEntries}
- Untracked files: ${summary.untrackedCount}

## Files

- \`status.txt\`: exact short status at archive time.
- \`tracked-diff.patch\`: binary-safe tracked-file patch.
- \`tracked-diff-stat.txt\`: tracked diff stat.
- \`untracked-manifest.json\`: untracked file hashes and sizes.
- \`untracked-files.tar.gz\`: untracked file payload, when untracked files exist.
- \`recent-log.txt\`: recent branch log for context.

## Restore Notes

${summary.restoreNotes.map((item) => `- ${item}`).join("\n")}
`;
}

main();
