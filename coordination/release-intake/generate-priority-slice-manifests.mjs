#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "coordination/release-intake");
const MAP_PATH = path.join(OUT_DIR, "latest-A25-dirty-tree-map.json");

const shirleenPaths = [
  "app/dashboard/page.tsx",
  "components/lesson/StudentLessonEntryPage.tsx",
  "lib/server/internalCaliforniaFastLogin.ts",
  "lib/server/userStore/studentActivityPersistence.ts",
  "lib/server/internalCaliforniaFastLogin.test.ts",
  "lib/server/userStoreStudentActivityPersistence.test.ts",
  "components/lesson/lessonAccessPolicy.test.ts",
  "tests/e2e/reported-bug-source-regressions.test.ts",
  "coordination/reports/2026-06-26-A22-shirleen-lesson-production-readiness.md",
  "coordination/reports/2026-06-26-A22-shirleen-lesson-production-deploy.md",
  "coordination/session-logs/2026-06-25-A12-A08-A02-A05-lesson-entry-bugfix.md"
];

const a06DirectPriorityPaths = [
  "components/visualizations/three/manim/mathEvidenceHarness.ts",
  "components/visualizations/three/manim/mathMobjectLayout.ts",
  "components/visualizations/three/manim/mathMobjectLayout.test.ts",
  "components/visualizations/three/manim/mathEvidenceHarness.test.ts",
  "components/visualizations/three/ThreeDLabCanvas.tsx",
  "components/visualizations/three/threeDCanvasContract.test.ts",
  "components/visualizations/three/threeDCanvasSurfaceContract.ts",
  "components/visualizations/three/manim/mathAlwaysMethodUpdater.ts",
  "components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts",
  "components/visualizations/three/manim/mathAlwaysRedraw.ts",
  "components/visualizations/three/manim/mathAlwaysRedraw.test.ts",
  "components/visualizations/three/manim/mathUpdaterRegistry.ts",
  "coordination/session-logs/2026-06-26-A06.md"
];

const a06DependencyRoots = [
  "components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts",
  "components/visualizations/three/manim/mathAlwaysRedraw.test.ts",
  "components/visualizations/three/manim/mathMobjectLayout.test.ts",
  "components/visualizations/three/manim/mathEvidenceHarness.test.ts",
  "components/visualizations/three/threeDCanvasContract.test.ts",
  "components/visualizations/three/ThreeDLabCanvas.tsx",
  "components/visualizations/three/threeDCanvasSurfaceContract.ts"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function git(command) {
  return execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
}

function dirtyEntry(mapByPath, filePath) {
  const entry = mapByPath.get(filePath);
  if (entry) return entry;
  return {
    status: "--",
    path: filePath,
    owner: "not dirty/not mapped",
    slice: "not dirty/not mapped"
  };
}

function resolveRelativeImport(fromPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.normalize(path.join(path.dirname(fromPath), specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx")
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(ROOT, candidate)) && fs.statSync(path.join(ROOT, candidate)).isFile()) ?? null;
}

function dependencyClosure(roots, mapByPath) {
  const seen = new Set();
  const queue = [...roots];
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    const absolute = path.join(ROOT, current);
    if (!fs.existsSync(absolute)) continue;
    seen.add(current);

    const source = fs.readFileSync(absolute, "utf8");
    let match;
    while ((match = importPattern.exec(source))) {
      const resolved = resolveRelativeImport(current, match[1]);
      if (resolved && resolved.startsWith("components/visualizations/three/")) queue.push(relPath(path.join(ROOT, resolved)));
    }
  }

  return [...seen]
    .filter((filePath) => mapByPath.has(filePath))
    .sort((left, right) => left.localeCompare(right));
}

function summarizeEntries(entries) {
  const byOwner = {};
  const bySlice = {};
  for (const entry of entries) {
    byOwner[entry.owner] = (byOwner[entry.owner] ?? 0) + 1;
    bySlice[entry.slice] = (bySlice[entry.slice] ?? 0) + 1;
  }
  return { byOwner, bySlice };
}

function table(entries) {
  return [
    "| Status | Path | Owner | Slice |",
    "| --- | --- | --- | --- |",
    ...entries.map((entry) => `| \`${entry.status.trim() || "M"}\` | \`${entry.path}\` | ${entry.owner} | ${entry.slice} |`)
  ].join("\n");
}

function writePathspec(fileName, paths) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${paths.join("\n")}\n`);
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(fileName, content) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${content.trimEnd()}\n`);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const map = readJson(MAP_PATH);
const mapByPath = new Map(map.entries.map((entry) => [entry.path, entry]));
const baseline = {
  branch: git("git rev-parse --abbrev-ref HEAD"),
  head: git("git rev-parse --short HEAD")
};
const generatedAtHkt = git("date '+%Y-%m-%d %H:%M:%S %Z'");

const shirleenEntries = shirleenPaths.map((filePath) => dirtyEntry(mapByPath, filePath));
const a06ClosurePaths = dependencyClosure(a06DependencyRoots, mapByPath);
const a06PathspecPaths = [...new Set([...a06ClosurePaths, "coordination/session-logs/2026-06-26-A06.md"])].sort((left, right) => left.localeCompare(right));
const a06ClosureEntries = a06PathspecPaths.map((filePath) => dirtyEntry(mapByPath, filePath));
const a06DirectEntries = a06DirectPriorityPaths.map((filePath) => dirtyEntry(mapByPath, filePath));

const commonEvidence = {
  dirtyMap: {
    path: map.outputPaths?.reportJson ?? "coordination/release-intake/latest-A25-dirty-tree-map.json",
    markdownPath: map.outputPaths?.reportMarkdown ?? "coordination/release-intake/latest-A25-dirty-tree-map.md",
    latestJson: map.outputPaths?.latestJson ?? "coordination/release-intake/latest-A25-dirty-tree-map.json",
    latestMarkdown: map.outputPaths?.latestMarkdown ?? "coordination/release-intake/latest-A25-dirty-tree-map.md",
    generatedAt: map.generatedAt,
    statusSignature: map.statusSignature,
    expandedStatusEntries: map.statusCounts?.expandedStatusEntries,
    collapsedStatusEntries: map.statusCounts?.collapsedStatusEntries
  },
  baseline
};

const shirleenManifest = {
  generatedAtHkt,
  slice: "shirleen-release-source-control-closure",
  agents: ["A10", "A25"],
  status: "ready for exact clean/pruned review package; production fix already live per A22 evidence",
  ...commonEvidence,
  pathspecFile: "coordination/release-intake/2026-06-26-A25-shirleen-release-slice.pathspec",
  entries: shirleenEntries,
  summary: summarizeEntries(shirleenEntries),
  verification: [
    {
      command: "node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts lib/server/userStoreStudentActivityPersistence.test.ts components/lesson/lessonAccessPolicy.test.ts tests/e2e/reported-bug-source-regressions.test.ts",
      result: "passed, 66/66"
    },
    {
      command: "npm run type-check -- --pretty false",
      result: "passed"
    }
  ],
  exclusions: [
    "unrelated app/API/data dirty files",
    "generated/content/RAG backlog",
    "local/generated artifacts",
    "secret/env files"
  ]
};

const a06Manifest = {
  generatedAtHkt,
  slice: "a06-type-check-closure",
  agents: ["A10", "A25"],
  status: "current root type-check and focused A06 tests pass; clean package requires dependency closure review because many A06 files are untracked",
  ...commonEvidence,
  pathspecFile: "coordination/release-intake/2026-06-26-A25-a06-type-fix-slice.pathspec",
  directPriorityEntries: a06DirectEntries,
  dependencyRoots: a06DependencyRoots,
  dependencyClosureDirtyCount: a06ClosureEntries.length,
  dependencyClosureEntries: a06ClosureEntries,
  summary: summarizeEntries(a06ClosureEntries),
  verification: [
    {
      command: "npm run type-check -- --pretty false",
      result: "passed"
    },
    {
      command: "./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts components/visualizations/three/manim/mathAlwaysRedraw.test.ts components/visualizations/three/manim/mathMobjectLayout.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts",
      result: "passed, exit 0"
    }
  ],
  risk: [
    "The dependency closure currently contains 148 dirty paths; this is not a small review package.",
    "A06 should either accept this as a Manim v2 feature closure or extract a smaller type-fix patch in an isolated worktree."
  ]
};

writePathspec("2026-06-26-A25-shirleen-release-slice.pathspec", shirleenEntries.map((entry) => entry.path));
writePathspec("2026-06-26-A25-a06-type-fix-slice.pathspec", a06PathspecPaths);
writeJson("2026-06-26-A25-shirleen-release-slice-manifest.json", shirleenManifest);
writeJson("2026-06-26-A25-a06-type-fix-slice-manifest.json", a06Manifest);

writeMarkdown("2026-06-26-A25-shirleen-release-slice-manifest.md", `
# 2026-06-26 A25 Shirleen Release Slice Manifest

- Generated: ${generatedAtHkt}
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: \`${baseline.branch}\` at \`${baseline.head}\`
- Dirty map snapshot: \`${commonEvidence.dirtyMap.path}\`
- Moving latest pointer: \`${commonEvidence.dirtyMap.latestJson}\`
- Status signature: \`${commonEvidence.dirtyMap.statusSignature}\`
- Status: ready for exact clean/pruned review package; production fix already live per A22 evidence.
- Pathspec: \`coordination/release-intake/2026-06-26-A25-shirleen-release-slice.pathspec\`

## Exact Files

${table(shirleenEntries)}

## Current Verification

- \`node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts lib/server/userStoreStudentActivityPersistence.test.ts components/lesson/lessonAccessPolicy.test.ts tests/e2e/reported-bug-source-regressions.test.ts\`: passed, 66/66.
- \`npm run type-check -- --pretty false\`: passed.

## Review Notes

- Treat this as source-control closure for the A22 production fix already live on \`www.mais.ac\` and \`www.mais.hk\`.
- Use the exact pathspec only; do not sweep neighboring dirty runtime files into this package.
- A02/A05/A12/A11/A22 should confirm the broad \`app/dashboard/page.tsx\` and extracted \`lib/server/userStore/studentActivityPersistence.ts\` changes before commit/PR.
`);

writeMarkdown("2026-06-26-A25-a06-type-fix-slice-manifest.md", `
# 2026-06-26 A25 A06 Type-Fix Slice Manifest

- Generated: ${generatedAtHkt}
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: \`${baseline.branch}\` at \`${baseline.head}\`
- Dirty map snapshot: \`${commonEvidence.dirtyMap.path}\`
- Moving latest pointer: \`${commonEvidence.dirtyMap.latestJson}\`
- Status signature: \`${commonEvidence.dirtyMap.statusSignature}\`
- Status: current root type-check and focused A06 tests pass.
- Pathspec: \`coordination/release-intake/2026-06-26-A25-a06-type-fix-slice.pathspec\`

## Direct Priority Files

${table(a06DirectEntries)}

## Dependency Closure

- Dirty dependency-closure paths: \`${a06ClosureEntries.length}\`
- Full closure is recorded in \`coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.json\` and the pathspec file.

## Current Verification

- \`npm run type-check -- --pretty false\`: passed.
- \`./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts components/visualizations/three/manim/mathAlwaysRedraw.test.ts components/visualizations/three/manim/mathMobjectLayout.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts\`: passed with exit 0.

## Review Notes

- The dependency closure is large, so this is not yet a small A06 review package.
- A06 should either accept the closure as the Manim v2 feature/type-check package or extract a smaller type-fix patch in an isolated worktree.
- A10/A25 did not edit A06 runtime code.
`);

const entriesBySlice = {};
for (const entry of map.entries) {
  entriesBySlice[entry.slice] = [...(entriesBySlice[entry.slice] ?? []), entry];
}

const bucketPathspecs = {};
for (const [sliceName, entries] of Object.entries(entriesBySlice)) {
  const sortedEntries = [...entries].sort((left, right) => left.path.localeCompare(right.path));
  const fileName = `2026-06-26-A25-slice-${slug(sliceName)}.pathspec`;
  bucketPathspecs[sliceName] = {
    count: sortedEntries.length,
    pathspecFile: `coordination/release-intake/${fileName}`,
    entries: sortedEntries
  };
  writePathspec(fileName, sortedEntries.map((entry) => entry.path));
}

const bucketManifest = {
  generatedAtHkt,
  purpose: "dirty-root broad slice bucket pathspecs",
  agents: ["A10", "A25"],
  status: "broad current-state bucket pathspecs for release-intake triage; do not commit a bucket wholesale without owner review",
  ...commonEvidence,
  buckets: bucketPathspecs
};

writeJson("2026-06-26-A25-dirty-root-slice-buckets-manifest.json", bucketManifest);

const bucketRows = Object.entries(bucketPathspecs)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([sliceName, bucket]) => `| ${sliceName} | ${bucket.count} | \`${bucket.pathspecFile}\` |`)
  .join("\n");

writeMarkdown("2026-06-26-A25-dirty-root-slice-buckets-manifest.md", `
# 2026-06-26 A25 Dirty Root Slice Buckets Manifest

- Generated: ${generatedAtHkt}
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: \`${baseline.branch}\` at \`${baseline.head}\`
- Dirty map snapshot: \`${commonEvidence.dirtyMap.path}\`
- Moving latest pointer: \`${commonEvidence.dirtyMap.latestJson}\`
- Status signature: \`${commonEvidence.dirtyMap.statusSignature}\`
- Status: broad current-state bucket pathspecs for release-intake triage. Do not commit a bucket wholesale without owner review.

## Bucket Pathspecs

| Slice bucket | Paths | Pathspec |
| --- | ---: | --- |
${bucketRows}

## Use Notes

- These buckets are broad release-intake queues, not ready commits.
- Use the Shirleen and A06 priority manifests for the first two concrete packages.
- Content/RAG, env quarantine, generated/local artifacts, and release hygiene remain separate by design.
`);

console.log("Generated priority slice manifests:");
console.log("coordination/release-intake/2026-06-26-A25-shirleen-release-slice-manifest.md");
console.log("coordination/release-intake/2026-06-26-A25-shirleen-release-slice-manifest.json");
console.log("coordination/release-intake/2026-06-26-A25-shirleen-release-slice.pathspec");
console.log("coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.md");
console.log("coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.json");
console.log("coordination/release-intake/2026-06-26-A25-a06-type-fix-slice.pathspec");
console.log("coordination/release-intake/2026-06-26-A25-dirty-root-slice-buckets-manifest.md");
console.log("coordination/release-intake/2026-06-26-A25-dirty-root-slice-buckets-manifest.json");
