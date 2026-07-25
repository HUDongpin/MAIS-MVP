#!/usr/bin/env node
// PreToolUse guard for the shared primary checkout (see CLAUDE.md).
// Multiple concurrent agent sessions share the canonical MAIS-MVP working
// tree; branch/stash operations there silently move every other session.
// Blocks those commands only when the session is rooted in the canonical
// checkout itself — linked worktrees and clones are unaffected.
// Fails open on any parse or filesystem error.
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const CANONICAL_ROOT = "/Users/dongpinhu/Desktop/MAIS-MVP";

function safeRealpath(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

// Walk up to the nearest checkout. A linked worktree has a .git FILE; the
// primary checkout (and clones) have a .git DIRECTORY.
function containingCheckout(startDir) {
  let dir = startDir;
  for (;;) {
    const dotGit = join(dir, ".git");
    if (existsSync(dotGit)) {
      return { dir, isLinkedWorktree: statSync(dotGit).isFile() };
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let command = "";
  let cwd = "";
  try {
    const input = JSON.parse(raw);
    if (input.tool_name !== "Bash") process.exit(0);
    command = String(input.tool_input?.command ?? "");
    cwd = String(input.cwd ?? "");
  } catch {
    process.exit(0);
  }
  if (!command || !cwd) process.exit(0);

  let checkout = null;
  try {
    checkout = containingCheckout(safeRealpath(cwd));
  } catch {
    process.exit(0);
  }
  if (
    !checkout ||
    checkout.isLinkedWorktree ||
    checkout.dir !== safeRealpath(CANONICAL_ROOT)
  ) {
    process.exit(0);
  }

  // Anchor matches to a command boundary (line start, ;, &, |, `, or an
  // opening paren) so mentions inside quoted strings — commit messages,
  // echoed text, JSON payloads — don't trip the guard. `git -C <dir> switch`
  // never matches either: naming a target checkout is a deliberate act, not
  // an accidental operation on the shared root.
  const rules = [
    {
      re: /(^|[;&|`(])\s*(?:command\s+|env\s+)?git\s+(?:switch|checkout)\b/m,
      why: "moves HEAD/branch state under every concurrent session sharing this checkout",
    },
    {
      re: /(^|[;&|`(])\s*(?:command\s+|env\s+)?git\s+stash\b(?!\s+(?:list|show)\b)/m,
      why: "stashes other sessions' uncommitted work along with yours",
    },
  ];
  for (const { re, why } of rules) {
    if (re.test(command)) {
      process.stderr.write(
        `BLOCKED in the shared primary root (${CANONICAL_ROOT}): this command ${why}. ` +
          `The root is integration-only — do branch work in a git worktree, use ` +
          `'git restore' for file recovery, or target a specific checkout with ` +
          `'git -C <dir>'. See CLAUDE.md.`,
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
