#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = git(["rev-parse", "--show-toplevel"]);
const OUT_DIR = path.join(ROOT, "coordination", "release-intake");
const MAP_PATH = path.join(OUT_DIR, "latest-A25-dirty-tree-map.json");
const DATE = hktDateStamp();

const ACCEPTANCE_BY_OWNER = [
  [/A06 visualization/, "A06 validates focused visualization/Manim tests plus app type-check before packaging."],
  [/A12 backend\/API/, "A12 validates API/storage contract tests and confirms no provider/env secret exposure."],
  [/A10 tooling/, "A10 validates docs/config/tooling changes and preserves release coordination conventions."],
  [/A18 curriculum QA \/ A21 content pipeline/, "A18/A21 split candidate content from final QA signoff; no live promotion without A23/A11/A22 gates."],
  [/A21 content pipeline/, "A21 proves candidate package provenance and keeps raw/private corpus material out of tracked runtime surfaces."],
  [/A11 QA/, "A11 runs or routes targeted regression evidence and records failing gates by owning product surface."],
  [/A22 production reliability/, "A22 verifies clean release source, release env guard, and deploy-size/build isolation before any publish."],
  [/A25 git hygiene/, "A25 refreshes dirty map, emits pathspecs, and records non-destructive intake evidence only."],
  [/A13 teacher/, "A13 validates teacher-console product flow and coordinates shared API/storage needs with A12."],
  [/A04 practice/, "A04 validates Practice Arena/question-bank behavior and coordinates content correctness with A18."],
  [/A01 app shell/, "A01 validates app shell/auth entry/navigation behavior and bilingual shell copy."],
  [/A05 lesson/, "A05 validates lesson route/content behavior and coordinates curriculum correctness with A18."],
  [/A20 game/, "A20 validates game-loop behavior and keeps reward economy changes coordinated with A17."],
  [/A07 AI tutor/, "A07 validates tutor/provider behavior without logging secrets or changing env ownership."],
  [/A02 dashboard/, "A02 validates dashboard/progress UI behavior and coordinates adaptive semantics with A15."],
  [/A03 curriculum roadmap/, "A03 validates roadmap/topic structure and coordinates content correctness with A18."],
  [/A16 research/, "A16 records source-backed research evidence without implying feature-code approval."],
  [/A14 parent/, "A14 validates parent-console behavior and coordinates shared storage/API needs with A12."],
  [/A15 adaptive/, "A15 validates adaptive-engine tests and coordinates LLM/provider behavior with A07."],
  [/A17 gamification/, "A17 validates reward economy/badge/streak logic and coordinates game loops with A20."],
  [/A08 state/, "A08 validates shared type/state/analytics semantics and coordinates schema drift with A10/A22."],
  [/A24 illustration/, "A24 validates exact-layer assets and keeps final curriculum approval with A18."],
  [/A09 copy/, "A09 validates bilingual copy/accessibility selectors without changing business logic."],
  [/Unmapped runtime/, "A10/A25 must assign an owner before packaging or release."],
  [/Unmapped\/manual/, "A10/A25 must classify manually before packaging or release."]
];

const FINAL_STATES = "commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker";

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function readMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function hktTimestamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short"
  }).format(new Date());
}

function statusCounts(statusLines) {
  return {
    total: statusLines.length,
    modified: statusLines.filter((line) => !line.startsWith("??")).length,
    deleted: statusLines.filter((line) => !line.startsWith("??") && line.slice(0, 2).includes("D")).length,
    untracked: statusLines.filter((line) => line.startsWith("??")).length
  };
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] ?? "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function acceptanceFor(owner) {
  return ACCEPTANCE_BY_OWNER.find(([pattern]) => pattern.test(owner))?.[1] ?? "Owning agent must define and run a targeted acceptance check before packaging.";
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(fileName, value) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${value.trimEnd()}\n`);
}

function writePathspec(fileName, paths) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${paths.join("\n")}\n`);
}

function parseWorktrees() {
  const raw = git(["worktree", "list", "--porcelain"]);
  return raw
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const entry = {
        path: "",
        head: "",
        branch: "",
        detached: false,
        prunable: false,
        prunableReason: ""
      };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch refs/heads/".length);
        else if (line === "detached") entry.detached = true;
        else if (line.startsWith("prunable ")) {
          entry.prunable = true;
          entry.prunableReason = line.slice("prunable ".length);
        } else if (line === "prunable") {
          entry.prunable = true;
        }
      }
      return entry;
    });
}

function worktreeLedger() {
  return parseWorktrees().map((entry) => {
    const exists = fs.existsSync(entry.path);
    const branch = entry.branch || (entry.detached ? "(detached)" : "");
    const statusLines = exists ? safe(() => git(["-C", entry.path, "status", "--porcelain=v1", "-uall"]).split("\n").filter(Boolean), []) : [];
    const divergence = exists
      ? safe(() => {
          const [behind, ahead] = git(["-C", entry.path, "rev-list", "--left-right", "--count", "main...HEAD"]).split(/\s+/).map(Number);
          return { behind, ahead };
        }, null)
      : null;
    const topLevels = countTopLevels(statusLines);
    const lifecycleState = classifyLifecycle({ ...entry, exists, statusLines, divergence });

    return {
      path: entry.path,
      exists,
      branch,
      head: entry.head,
      prunable: entry.prunable,
      prunableReason: entry.prunableReason,
      statusCounts: statusCounts(statusLines),
      divergence,
      topLevels,
      lifecycleState,
      nextAction: nextWorktreeAction(lifecycleState)
    };
  });
}

function countTopLevels(statusLines) {
  const counts = new Map();
  for (const line of statusLines) {
    const filePath = line.slice(3).split(" -> ").at(-1) ?? line.slice(3);
    const top = filePath.split("/")[0] || filePath;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 8));
}

function classifyLifecycle(entry) {
  if (entry.prunable) return "stale-registry-prunable";
  if (!entry.exists) return "missing-path-investigate";
  if (entry.statusLines.length > 0) return "dirty-active-review-required";
  if (entry.divergence?.ahead > 0 || entry.divergence?.behind > 0) return "clean-branch-diverged-review";
  return "clean-current";
}

function nextWorktreeAction(state) {
  const actions = {
    "stale-registry-prunable": "A25 may prune registry metadata after dry-run evidence and owner approval.",
    "missing-path-investigate": "A25 should verify whether only metadata remains; do not delete unrelated filesystem paths.",
    "dirty-active-review-required": "Owning agent must package, commit, archive patch, or explicitly discard after review.",
    "clean-branch-diverged-review": "Owning agent should convert the ahead commit to PR/archive tag or retire branch after review.",
    "clean-current": "No action beyond routine weekly inventory."
  };
  return actions[state] ?? "Manual review required.";
}

function ownerBoard(map) {
  const owners = new Map();
  for (const entry of map.entries) {
    if (!owners.has(entry.owner)) owners.set(entry.owner, []);
    owners.get(entry.owner).push(entry);
  }

  return [...owners.entries()]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([owner, entries]) => {
      const fileName = `${DATE}-A25-owner-${slug(owner)}.pathspec`;
      const latestFileName = `latest-A25-owner-${slug(owner)}.pathspec`;
      const paths = entries.map((entry) => entry.path).sort((left, right) => left.localeCompare(right));
      writePathspec(fileName, paths);
      writePathspec(latestFileName, paths);
      return {
        owner,
        dirtyEntries: entries.length,
        sliceBuckets: countBy(entries, "slice"),
        statusBuckets: countBy(entries, "status"),
        pathspec: `coordination/release-intake/${fileName}`,
        latestPathspec: `coordination/release-intake/${latestFileName}`,
        acceptanceCheck: acceptanceFor(owner),
        finalStates: FINAL_STATES
      };
    });
}

function formatOwnerBoard(board) {
  const rows = [
    "| Owner | Dirty entries | Dominant slice | Pathspec | Acceptance check | Final states |",
    "| --- | ---: | --- | --- | --- | --- |"
  ];
  for (const item of board) {
    const dominantSlice = Object.entries(item.sliceBuckets)[0]?.join(": ") ?? "none";
    rows.push(`| ${item.owner} | ${item.dirtyEntries} | ${dominantSlice} | \`${item.latestPathspec}\` | ${item.acceptanceCheck} | ${item.finalStates} |`);
  }
  return rows.join("\n");
}

function formatWorktreeLedger(ledger) {
  const rows = [
    "| State | Branch | Dirty | Divergence | Path | Next action |",
    "| --- | --- | ---: | --- | --- | --- |"
  ];
  for (const item of ledger) {
    const divergence = item.divergence ? `behind ${item.divergence.behind}, ahead ${item.divergence.ahead}` : "n/a";
    rows.push(`| ${item.lifecycleState} | \`${item.branch || "(none)"}\` | ${item.statusCounts.total} | ${divergence} | \`${item.path}\` | ${item.nextAction} |`);
  }
  return rows.join("\n");
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const map = readMap();
  const board = ownerBoard(map);
  const ledger = worktreeLedger();
  const generatedAtHkt = hktTimestamp();
  const baseline = {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "--short", "HEAD"]),
    dirtyMap: map.outputPaths?.latestJson ?? "coordination/release-intake/latest-A25-dirty-tree-map.json",
    dirtyMapGeneratedAt: map.generatedAt,
    dirtyMapStatusSignature: map.statusSignature
  };

  const payload = {
    generatedAtHkt,
    baseline,
    objective: "Enterprise dirty-root and worktree hygiene execution board",
    ownerBoard: board,
    worktreeLedger: ledger,
    releaseGate: {
      rule: "A22 must not deploy from a dirty source. Allowed release sources are clean worktree, clean clone, reviewed clean slice, or owner-approved pruned staging package.",
      verifier: "node coordination/release-intake/assert-release-source-clean.mjs"
    },
    lifecycleGate: {
      rule: "A25 worktree registry must have no prunable or missing-path entries. Strict mode additionally fails on dirty/diverged open decisions.",
      verifier: "node coordination/release-intake/assert-worktree-lifecycle.mjs",
      strictVerifier: "node coordination/release-intake/assert-worktree-lifecycle.mjs --strict"
    },
    governanceGates: [
      {
        name: "owner pathspec currency",
        command: "node coordination/release-intake/assert-owner-pathspecs-current.mjs"
      },
      {
        name: "secret/env quarantine",
        command: "node coordination/release-intake/assert-secret-env-quarantine.mjs"
      },
      {
        name: "disposition evidence currency",
        command: "node coordination/release-intake/assert-disposition-evidence-current.mjs"
      },
      {
        name: "effective owner overlay currency",
        command: "node coordination/release-intake/assert-effective-owner-overlay-current.mjs"
      },
      {
        name: "unmapped manual owner proposal currency",
        command: "node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs"
      }
    ],
    artifactQuarantine: [
      "Keep generated evidence in coordination/release-intake, coordination/reports, or ignored staging directories.",
      "Keep raw/private RAG material out of tracked runtime surfaces unless rights and owner approval are documented.",
      "Do not mix local/generated artifacts into runtime app/API/data/public pathspecs."
    ]
  };

  writeJson("latest-A25-worktree-hygiene-dashboard.json", payload);
  writeJson(`${DATE}-A25-worktree-hygiene-dashboard.json`, payload);
  writeMarkdown("latest-A25-worktree-hygiene-dashboard.md", markdown(payload));
  writeMarkdown(`${DATE}-A25-worktree-hygiene-dashboard.md`, markdown(payload));
  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-worktree-hygiene-dashboard.json",
    latestMarkdown: "coordination/release-intake/latest-A25-worktree-hygiene-dashboard.md",
    owners: board.length,
    worktrees: ledger.length,
    prunableWorktrees: ledger.filter((entry) => entry.prunable).length,
    dirtyWorktrees: ledger.filter((entry) => entry.statusCounts.total > 0).length
  }, null, 2));
}

function markdown(payload) {
  return `# ${DATE} A25 Worktree Hygiene Dashboard

Generated: ${payload.generatedAtHkt}

Baseline: \`${payload.baseline.branch}\` at \`${payload.baseline.head}\`

Dirty map: \`${payload.baseline.dirtyMap}\`

Dirty map generated: ${payload.baseline.dirtyMapGeneratedAt}

Status signature: \`${payload.baseline.dirtyMapStatusSignature}\`

## Release Rule

- ${payload.releaseGate.rule}
- Verifier: \`${payload.releaseGate.verifier}\`
- Direct dirty-root preview or production deploy remains blocked.

## Worktree Lifecycle Gate

- ${payload.lifecycleGate.rule}
- Verifier: \`${payload.lifecycleGate.verifier}\`
- Strict verifier: \`${payload.lifecycleGate.strictVerifier}\`

## Governance Integrity Gates

${payload.governanceGates.map((gate) => `- ${gate.name}: \`${gate.command}\``).join("\n")}

## Owner Intake Board

${formatOwnerBoard(payload.ownerBoard)}

## Worktree Lifecycle Ledger

${formatWorktreeLedger(payload.worktreeLedger)}

## Artifact Quarantine

${payload.artifactQuarantine.map((item) => `- ${item}`).join("\n")}

## Operating Rules

- Root \`main\` is an integration inventory until the dirty map is empty or all entries are owner-packaged.
- Every dirty package needs one owner, one pathspec, one acceptance check, and one final state.
- A25 may refresh maps and emit pathspecs; owning agents decide feature/content correctness.
- Stale worktree registry entries should be pruned only after dry-run evidence.
`;
}

main();
