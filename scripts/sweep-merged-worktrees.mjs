#!/usr/bin/env node
// Retire linked worktrees whose work is already preserved elsewhere.
//
// CLAUDE.md requires a landed branch's worktree to be removed the same day. In
// practice the branch is tidied and the tree is left behind, so harness-created
// worktrees accumulate: a 2026-08-27 sweep found 122 registered worktrees, 74 of
// them retirable with zero commit loss and 177 GiB of disk attached.
//
// DRY RUN BY DEFAULT. Pass --apply to remove anything.
//
// A worktree is retired only when ALL of these hold:
//   1. it is a linked worktree (never the primary checkout, never bare)
//   2. its directory exists and `git status --porcelain` is empty
//   3. it holds no protected ignored content (see PROTECTED_IGNORED)
//   4. its HEAD is an ancestor of the upstream default branch, OR its branch tip
//      is contained in some other ref
//   5. its branch has no open PR (skipped when `gh` is unavailable)
//
// `git worktree remove` is never called with --force.
//
// Usage:
//   node scripts/sweep-merged-worktrees.mjs                 # plan only
//   node scripts/sweep-merged-worktrees.mjs --apply         # remove
//   node scripts/sweep-merged-worktrees.mjs --json          # machine-readable plan
//   node scripts/sweep-merged-worktrees.mjs --min-age-days 3
//   node scripts/sweep-merged-worktrees.mjs --no-pr-check
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Candidate names for content that is expensive or impossible to rebuild.
// A candidate only counts once `git check-ignore` confirms git actually ignores
// it — a tracked `.env.local.example` is documentation, not a secret.
export const PROTECTED_IGNORED = [
  { label: "env file", match: (n) => /^\.env(\..+)?$/.test(n) && !/\.(example|sample|template)$/.test(n) },
  { label: "local database", match: (n) => /\.sqlite(3)?$/.test(n) },
];

export const REBUILDABLE = new Set([
  "node_modules", ".next", ".tmp", ".turbo", ".vercel",
  "coverage", "test-results", "playwright-report", "dist", "build",
]);

function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...opts }).trim();
}
function gitQuiet(args, opts = {}) {
  try { return git(args, opts); } catch { return null; }
}

/** Parse `git worktree list --porcelain` into records. */
export function parseWorktreeList(porcelain) {
  const out = [];
  let cur = null;
  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (cur) out.push(cur);
      cur = { path: line.slice(9), head: null, branch: null, bare: false, detached: false };
    } else if (!cur) continue;
    else if (line.startsWith("HEAD ")) cur.head = line.slice(5);
    else if (line.startsWith("branch ")) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
    else if (line === "bare") cur.bare = true;
    else if (line === "detached") cur.detached = true;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Strip the decoration `git branch --contains` puts on each line. Current branch
 * is `* `, but a branch checked out in ANOTHER worktree is `+ `. Missing the `+`
 * makes every branch appear to contain itself, which silently turns "unique work"
 * into "safe to delete".
 */
export function parseContainingRefs(stdout, selfBranch) {
  return stdout
    .split("\n")
    .map((l) => l.replace(/^[*+ ]+/, "").trim())
    .filter(Boolean)
    .filter((r) => r !== selfBranch && r !== `remotes/origin/${selfBranch}`)
    .filter((r) => !r.startsWith("(HEAD detached"));
}

/** Ignored-but-precious content that `git status` cannot see. */
export function scanProtectedIgnored(dir, { readdir = readdirSync, stat = statSync } = {}) {
  const hits = [];
  const walk = (d, depth) => {
    if (depth > 3) return;
    let entries;
    try { entries = readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === ".git") continue;
      const full = join(d, e.name);
      const isDir = e.isDirectory?.() ?? false;
      if (isDir) {
        if (REBUILDABLE.has(e.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      for (const p of PROTECTED_IGNORED) {
        if (p.match(e.name)) {
          let size = 0;
          try { size = stat(full).size; } catch {}
          hits.push({ path: full, label: p.label, size });
          break;
        }
      }
    }
  };
  walk(dir, 0);
  return hits;
}

/** Pure policy decision. All filesystem and git state is resolved by the caller. */
export function decide(wt, ctx) {
  if (wt.bare) return { action: "skip", reason: "bare repository" };
  if (wt.path === ctx.primaryRoot) return { action: "skip", reason: "primary checkout" };
  // A checkout of the integration branch is a standing reference, and it is
  // merged-by-definition, so every other rule would happily delete it.
  if (wt.branch && wt.branch === ctx.defaultBranch)
    return { action: "skip", reason: `checkout of the default branch (${ctx.defaultBranch})` };
  if (!wt.exists) return { action: "skip", reason: "directory missing (run `git worktree prune`)" };
  if (wt.dirty > 0) return { action: "skip", reason: `dirty (${wt.dirty} entries)` };
  if (wt.protectedHits.length) {
    const l = wt.protectedHits.map((h) => h.label);
    return { action: "skip", reason: `holds ${[...new Set(l)].join(", ")} that git ignores` };
  }
  if (wt.ageDays !== null && ctx.minAgeDays > 0 && wt.ageDays < ctx.minAgeDays)
    return { action: "skip", reason: `younger than --min-age-days ${ctx.minAgeDays}` };
  if (wt.openPr) return { action: "skip", reason: `open PR #${wt.openPr}` };
  if (wt.mergedIntoUpstream) return { action: "retire", reason: `commits already on ${ctx.upstream}` };
  if (wt.containedIn.length) return { action: "retire", reason: `tip contained in ${wt.containedIn[0]}` };
  return { action: "skip", reason: "holds commits found in no other ref" };
}

/** Map of branch -> open PR number, or null when `gh` cannot answer. */
function openPrsByBranch(enabled, cwd) {
  if (!enabled) return null;
  let raw;
  try {
    raw = execFileSync(
      "gh",
      ["pr", "list", "--state", "open", "--limit", "300", "--json", "number,headRefName"],
      { encoding: "utf8", cwd, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return null;
  }
  try {
    return new Map(JSON.parse(raw).map((pr) => [pr.headRefName, pr.number]));
  } catch {
    return null;
  }
}

/** Keep only the candidates git actually ignores. */
function retainGitIgnored(dir, hits) {
  if (!hits.length) return [];
  const rel = hits.map((h) => h.path.slice(dir.length + 1));
  let out;
  try {
    out = execFileSync("git", ["-C", dir, "check-ignore", "--stdin"], {
      encoding: "utf8", input: rel.join("\n"), stdio: ["pipe", "pipe", "ignore"],
    });
  } catch (e) {
    // exit 1 simply means "none of them are ignored"
    out = e.status === 1 ? String(e.stdout ?? "") : null;
    if (out === null) return hits; // check-ignore unusable: fail safe, keep them
  }
  const ignored = new Set(out.split("\n").map((l) => l.trim()).filter(Boolean));
  return hits.filter((h) => ignored.has(h.path.slice(dir.length + 1)));
}

function main(argv) {
  const apply = argv.includes("--apply");
  const asJson = argv.includes("--json");
  const prCheck = !argv.includes("--no-pr-check");
  const i = argv.indexOf("--min-age-days");
  const minAgeDays = i >= 0 ? Number(argv[i + 1]) || 0 : 0;

  const primaryRoot = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).replace(/\/\.git$/, "");
  const upstream = gitQuiet(["rev-parse", "--abbrev-ref", "origin/HEAD"]) || "origin/main";
  const defaultBranch = upstream.replace(/^origin\//, "");
  const upstreamSha = gitQuiet(["rev-parse", upstream]);
  if (!upstreamSha) {
    console.error(`cannot resolve ${upstream}; run \`git fetch origin\` first`);
    process.exit(1);
  }
  const prs = openPrsByBranch(prCheck, primaryRoot);
  const worktrees = parseWorktreeList(git(["worktree", "list", "--porcelain"]));

  const plan = [];
  for (const wt of worktrees) {
    const exists = existsSync(wt.path);
    wt.exists = exists;
    wt.dirty = exists ? (gitQuiet(["-C", wt.path, "status", "--porcelain"]) ?? "").split("\n").filter(Boolean).length : 0;
    wt.protectedHits = exists && wt.dirty === 0 ? retainGitIgnored(wt.path, scanProtectedIgnored(wt.path)) : [];
    wt.mergedIntoUpstream = wt.head ? gitQuiet(["merge-base", "--is-ancestor", wt.head, upstreamSha]) !== null : false;
    wt.containedIn = wt.branch
      ? parseContainingRefs(gitQuiet(["branch", "-a", "--contains", wt.branch]) ?? "", wt.branch)
      : [];
    const iso = wt.head ? gitQuiet(["log", "-1", "--format=%cI", wt.head]) : null;
    wt.ageDays = iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null;
    wt.openPr = wt.branch && prs ? prs.get(wt.branch) ?? null : null;
    plan.push({ ...decide(wt, { primaryRoot, upstream, defaultBranch, minAgeDays }), path: wt.path, branch: wt.branch ?? "(detached)" });
  }

  const retire = plan.filter((p) => p.action === "retire");
  if (asJson) {
    console.log(JSON.stringify({ upstream, upstreamSha, apply, prCheckAvailable: prs !== null, plan }, null, 2));
  } else {
    for (const p of plan.filter((x) => x.action === "skip")) console.log(`  keep    ${p.branch}  — ${p.reason}`);
    for (const p of retire) console.log(`  RETIRE  ${p.branch}  — ${p.reason}`);
    console.log(`\n${worktrees.length} worktrees; ${retire.length} retirable.`);
    if (prs === null && prCheck) console.log("note: `gh` unavailable — open-PR check was skipped.");
  }

  if (!apply) {
    if (!asJson) console.log(retire.length ? "\ndry run — re-run with --apply to remove them." : "");
    return 0;
  }

  let removed = 0, failed = 0;
  for (const p of retire) {
    // Re-check immediately before removing: the fleet changes underneath a long run.
    const dirty = (gitQuiet(["-C", p.path, "status", "--porcelain"]) ?? "").split("\n").filter(Boolean).length;
    if (dirty > 0) { console.log(`  skip    ${p.branch} — became dirty during the sweep`); continue; }
    if (gitQuiet(["worktree", "remove", p.path]) === null) { failed++; console.log(`  FAILED  ${p.branch}`); }
    else { removed++; console.log(`  removed ${p.branch}`); }
  }
  gitQuiet(["worktree", "prune"]);
  console.log(`\nremoved ${removed}, failed ${failed}. ${parseWorktreeList(git(["worktree", "list", "--porcelain"])).length} worktrees remain.`);
  return failed > 0 ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
