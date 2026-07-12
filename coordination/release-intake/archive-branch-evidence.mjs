#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const args = parseArgs(process.argv.slice(2));
if (!args.branch) throw new Error("Usage: node coordination/release-intake/archive-branch-evidence.mjs --branch <branch> [--label <label>] [--patch-line-limit <n>]");

const branch = args.branch;
const label = slug(args.label ?? branch);
const patchLineLimit = Number(args.patchLineLimit ?? 10000);
const date = hktDateStamp();
const outDir = path.join(root, "coordination", "release-intake", `${date}-A25-branch-evidence-${label}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--branch") parsed.branch = argv[++index];
    else if (arg === "--label") parsed.label = argv[++index];
    else if (arg === "--patch-line-limit") parsed.patchLineLimit = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function git(args, cwd = root) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function safeGit(args, fallback = "") {
  try {
    return git(args);
  } catch {
    return fallback;
  }
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
    .replace(/^refs\/heads\//, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function write(fileName, content) {
  fs.writeFileSync(path.join(outDir, fileName), `${String(content).replace(/\s+$/u, "")}\n`);
}

function writeJson(fileName, content) {
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(content, null, 2)}\n`);
}

function parseNumstat(raw) {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, filePath] = line.split("\t");
      return {
        path: filePath,
        added: Number(added) || 0,
        deleted: Number(deleted) || 0
      };
    });
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const head = git(["rev-parse", branch]);
  const aheadLog = git(["log", "--oneline", "--decorate", `main..${branch}`]);
  const aheadCommits = aheadLog.split("\n").filter(Boolean);
  const divergenceRaw = git(["rev-list", "--left-right", "--count", `main...${branch}`]);
  const [behind, ahead] = divergenceRaw.split(/\s+/).map(Number);
  const showStat = git(["show", "--stat", "--oneline", "--find-renames", "--no-ext-diff", "--no-renames", branch]);
  const showNameStatus = git(["show", "--name-status", "--oneline", "--no-ext-diff", branch]);
  const numstatRaw = safeGit(["show", "--numstat", "--format=", "--no-ext-diff", branch]);
  const numstat = parseNumstat(numstatRaw);
  const totalChangedLines = numstat.reduce((total, item) => total + item.added + item.deleted, 0);
  const includePatch = totalChangedLines <= patchLineLimit;

  write("ahead-log.txt", aheadLog);
  write("commit-stat.txt", showStat);
  write("commit-name-status.txt", showNameStatus);
  write("commit-numstat.txt", numstatRaw || "No numstat output.");

  let patchFiles = [];
  if (includePatch) {
    const before = new Set(fs.readdirSync(outDir));
    execFileSync("git", ["format-patch", "-1", branch, "--output-directory", outDir], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const after = fs.readdirSync(outDir);
    patchFiles = after.filter((fileName) => !before.has(fileName) && fileName.endsWith(".patch")).sort();
  }

  const summary = {
    archivedAt: new Date().toISOString(),
    branch,
    head,
    divergence: { behind, ahead },
    aheadCommits,
    changedFiles: numstat.length,
    totalChangedLines,
    patchLineLimit,
    fullPatchIncluded: includePatch,
    patchFiles,
    notes: includePatch
      ? ["Full patch included because commit-level changed lines are under the configured limit."]
      : ["Full patch intentionally omitted because the commit is too large; use branch/commit as source of truth or create an archive tag."]
  };

  writeJson("summary.json", summary);
  write("README.md", markdown(summary));
  console.log(JSON.stringify({
    outDir: path.relative(root, outDir).split(path.sep).join("/"),
    branch,
    ahead,
    behind,
    changedFiles: summary.changedFiles,
    totalChangedLines,
    fullPatchIncluded: summary.fullPatchIncluded
  }, null, 2));
}

function markdown(summary) {
  return `# A25 Branch Evidence Archive

- Archived at: ${summary.archivedAt}
- Branch: \`${summary.branch}\`
- Head: \`${summary.head}\`
- Divergence: behind ${summary.divergence.behind}, ahead ${summary.divergence.ahead}
- Ahead commits: ${summary.aheadCommits.length}
- Changed files in branch head commit: ${summary.changedFiles}
- Changed lines in branch head commit: ${summary.totalChangedLines}
- Full patch included: ${summary.fullPatchIncluded ? "yes" : "no"}

## Files

- \`ahead-log.txt\`: commits on branch not reachable from \`main\`.
- \`commit-stat.txt\`: branch head commit stat.
- \`commit-name-status.txt\`: branch head changed paths.
- \`commit-numstat.txt\`: branch head numeric diff.
- \`summary.json\`: machine-readable evidence summary.
${summary.patchFiles.map((fileName) => `- \`${fileName}\`: full patch for branch head commit.`).join("\n")}

## Notes

${summary.notes.map((item) => `- ${item}`).join("\n")}
`;
}

main();
