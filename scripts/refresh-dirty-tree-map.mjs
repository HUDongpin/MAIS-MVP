#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_REPORT_DIR = path.join(REPO_ROOT, "coordination", "release-intake");
const DEFAULT_LATEST_JSON = path.join(DEFAULT_REPORT_DIR, "latest-A25-dirty-tree-map.json");
const DEFAULT_LATEST_MARKDOWN = path.join(DEFAULT_REPORT_DIR, "latest-A25-dirty-tree-map.md");
const DEFAULT_REASON = "release hygiene dirty-tree refresh";

const TRANSIENT_DIRTY_PATH_RULES = [
  /\.baiduyun\.uploading\.cfg$/
];

const OWNER_RULES = [
  [/^coordination\/release-intake(?:\/|$)/, "A25 git hygiene and release intake"],
  [/^coordination\/integration(?:\/|$)/, "A23 integration and promotion lead"],
  [/^tests\/e2e(?:\/|$)/, "A11 QA and release quality"],
  [/^(?:playwright\.config\.ts|\.vercelignore|tsconfig\.next\.json)$/, "A22 production reliability and release engineering"],
  [/^scripts\/(?:release-|deploy-vercel|prepare-vercel|cleanup-generated-artifacts|next-clean-build)/, "A22 production reliability and release engineering"],
  [/^scripts\/refresh-dirty-tree-map\.mjs$/, "A25 git hygiene and release intake"],
  [/^scripts\/bug-triage\.js$/, "A10 tooling, docs, and report"],
  [/^scripts\/resend-local-smoke\.mjs$/, "A22 production reliability and release engineering"],
  [/^scripts\/ai-tutor-live-latency-smoke\.mjs$/, "A07 AI tutor lead"],
  [/^scripts\/generate-us-ca-lesson-audio\.mjs$/, "A05 lesson lead"],
  [/^scripts\/dashboard-(?:latency-smoke|smoke-auth-precheck|ui-loading-smoke)(?:\.test)?\.mjs$/, "A02 dashboard lead"],
  [/^(?:scripts\/run-analytics-tests\.mjs|tsconfig\.analytics\.json)$/, "A08 state and analytics lead"],
  [/^(?:next-env\.d\.ts|design-qa\.md)$/, "A10 tooling, docs, and report"],
  [/^Technical-Review(?:\/|$)/, "A10 tooling, docs, and report"],
  [/^(?:package(?:-lock)?\.json|README\.md|AGENTS\.md|\.gitignore|next\.config\.ts|tsconfig\.json|tailwind\.config\.ts|postcss\.config\.mjs|app\/globals\.css|docs\/)/, "A10 tooling, docs, and report"],
  [/^coordination\/reports\/.*(?:release|[as]22|[AS]22)/i, "A22 production reliability and release engineering"],
  [/^coordination\/(?:reports|session-logs|blockers|decisions)(?:\/|$)/, "A10 tooling, docs, and report"],
  [/^coordination\/content-qa\/.*(?:illustration|exact|overlay|[AS]24|[as]24)/i, "A24 illustration exact-layer"],
  [/^coordination\/content-qa(?:\/|$)/, "A18 curriculum QA / A21 content pipeline"],
  [/^coordination\/research(?:\/|$)/, "A16 research and learning science"],
  [/^(?:data\/generated-content|data\/rag|lib\/rag)(?:\/|$)/, "A21 content pipeline and RAG operations"],
  [/^scripts\/(?:build-|audit-mainland|query-us-ca-private|storage-admin)/, "A21 content pipeline and RAG operations"],
  [/^public\/question-illustrations(?:\/|$)/, "A24 illustration exact-layer"],
  [/^(?:app\/api\/ai-tutor|components\/ai|\.env\.local\.example)(?:\/|$)/, "A07 AI tutor lead"],
  [/^(?:app\/api\/adaptive-learning|lib\/adaptiveLearning(?:\.test)?\.ts)(?:\/|$)/, "A15 adaptive engine lead"],
  [/^(?:app\/api|lib\/server|middleware\.ts)(?:\/|$)/, "A12 backend/API platform"],
  [/^(?:app\/teacher|components\/teacher)(?:\/|$)/, "A13 teacher console"],
  [/^(?:app\/parent|components\/parent)(?:\/|$)/, "A14 parent console"],
  [/^(?:app\/games|app\/student\/practice\/games|components\/games|data\/gameBasedLearning|lib\/gameBasedLearning|components\/gamification\/(?:FishingGame|AdventureIslandGame|QuadraticBonusGame)|app\/practice\/(?:fishing-game|quadratic-bonus|adventure-island|super-platformer-like)|public\/games)(?:\/|$)/, "A20 game design and game-based learning"],
  [/^(?:components\/gamification|data\/gamification|lib\/gamification)(?:\/|$)/, "A17 gamification and motivation"],
  [/^(?:app\/practice|app\/mistake-book|components\/practice|data\/questions|public\/practice)(?:\/|$)/, "A04 practice lead"],
  [/^(?:app\/lesson|components\/lesson|data\/lessons|data\/.*Lessons|data\/.*LessonIllustrations)(?:\/|$)/, "A05 lesson lead"],
  [/^public\/audio\/lessons(?:\/|$)/, "A05 lesson lead"],
  [/^(?:app\/visualization-lab|app\/student\/tools\/visualizations|components\/visualizations|data\/visualizationLabs|lib\/math)(?:\/|$)/, "A06 visualization lead"],
  [/^(?:app\/learning-path|app\/secondary-roadmap|app\/primary-roadmap|components\/learning|data\/grades|data\/topics|data\/.*Topics|data\/.*Roadmap)(?:\/|$)/, "A03 curriculum roadmap lead"],
  [/^(?:app\/dashboard|app\/progress|components\/dashboard|components\/cards|data\/progress|data\/learningAnalytics)(?:\/|$)/, "A02 dashboard lead"],
  [/^lib\/i18n\.ts$/, "A09 copy, i18n, accessibility"],
  [/^(?:components\/providers\/AppProviders|lib\/learningAnalytics|lib\/utils|types\/index)(?:\.test)?\.ts$/, "A08 state and analytics lead"],
  [/^(?:app\/(?:layout|page|login|register|forgot-password|reset-password|change-password|about|not-found)|components\/layout|components\/home|components\/background|components\/ui\/(?:ThemeToggle|LanguageToggle)|public\/auth)(?:\/|\.tsx|\.ts|$)/, "A01 app shell lead"],
  [/^(?:components\/providers\/AppProviders\.tsx|components\/providers\/.*\.test\.ts)$/, "A08 state and analytics lead"],
  [/^lib\/difficulty(?:\.test)?\.ts$/, "A08 state and analytics lead"],
  [/^(?:app\/adaptive-learning|app\/personalized-learning|lib\/curriculumProfile\.ts)(?:\/|$)/, "A15 adaptive engine lead"],
  [/^(?:app\/assessment\/|app\/student\/(?:assessments|assignments)\/)/, "A02 dashboard lead"],
  [/^app\/student\/lessons(?:\/|$)/, "A05 lesson lead"],
  [/^(?:app\/forum|components\/forum|data\/forum\.ts|lib\/forum\.ts|public\/forum-assets)(?:\/|$)/, "A12 backend/API platform"],
  [/^app\/messages(?:\/|$)/, "A14 parent console"],
  [/^(?:app\/student\/roadmap(?:\/.*)?|components\/ui\/(?:CurriculumTrackSelector|GradeSelector)\.tsx|data\/grades\.ts|data\/topics\.ts|data\/.*Topics\.ts|data\/.*Roadmap\.ts)$/, "A03 curriculum roadmap lead"],
  [/^(?:data\/questions\.ts|data\/.*Questions\.ts|lib\/.*QuestionBank\.test\.ts|lib\/fullQuestionBankSolvability\.test\.ts|lib\/questionBankSolvability\.ts|data\/hongKongEasePracticeQuestions\.ts|lib\/mainlandPepQuestionAssets\.ts)$/, "A04 practice lead"],
  [/^(?:data\/lessons\.ts|data\/.*Lessons\.ts|data\/.*LessonIllustrations\.ts|lib\/guestLessonLinks\.ts|lib\/lessonLinks\.ts|data\/usCaliforniaMicroLessons\.ts|data\/usCaliforniaLessons\.test\.ts|data\/productionLessonsNearTransfer\.test\.ts)$/, "A05 lesson lead"],
  [/^public\/audio\/lessons(?:\/|$)/, "A05 lesson lead"],
  [/^data\/visualizationLabs\.ts$/, "A06 visualization lead"],
  [/^(?:data\/gameBasedLearning\.ts|data\/mathVirusBlaster\.ts|data\/mightyTankBattle\.ts|lib\/gameBasedLearning(?:\.test)?\.ts)$/, "A20 game design and game-based learning"],
  [/^lib\/californiaGradeAware\.test\.ts$/, "A18 curriculum QA / A21 content pipeline"],
  [/^data\/hkChinese(?:Exceptions|Glossary)\.ts$/, "A09 copy, i18n, accessibility"],
  [/^lib\/mvpReadiness\.test\.ts$/, "A11 QA and release quality"],
  [/^components\/ui\/PasswordInputWithReveal\.tsx$/, "A01 app shell lead"],
  [/^data\/usCaliforniaKnowledgePoints\.ts$/, "A18 curriculum QA / A21 content pipeline"],
  [/^components\/math(?:\/|$)/, "A09 copy, i18n, accessibility"],
  [/^lib\/loginRedirect\.test\.ts$/, "A01 app shell lead"],
  [/^lib\/parentConstraints\.ts$/, "A14 parent console"],
  [/^(?:app\/icon\.(?:png|svg)|public\/robots\.txt)$/, "A01 app shell lead"],
  [/^public\/lesson-illustrations(?:\/|$)/, "A24 illustration exact-layer"],
  [/^video-plan(?:\/|$)/, "A10 tooling, docs, and report"],
  [/^(?:app|components|data|lib|public|types)(?:\/|$)/, "Unmapped runtime owner review needed"]
];

const SLICE_RULES = [
  [/^(?:\.vercelignore|playwright\.config\.ts|tsconfig\.next\.json|package(?:-lock)?\.json|next\.config\.ts|scripts\/(?:release-|deploy-vercel|prepare-vercel|cleanup-generated-artifacts|next-clean-build|refresh-dirty-tree-map))/, "release hygiene tooling/config"],
  [/^(?:tests\/e2e|.*\.test\.(?:ts|tsx|mjs|js)$)/, "tests/regression evidence"],
  [/^(?:coordination|README\.md|AGENTS\.md|docs|Technical-Review|video-plan)(?:\/|$)/, "docs/coordination evidence"],
  [/^(?:coordination\/content-qa|data\/generated-content|data\/rag|lib\/rag|scripts\/(?:build-|audit-mainland|query-us-ca-private))/, "generated/content/RAG backlog"],
  [/^(?:\.local|\.tmp|\.next|node_modules|private|Users)(?:\/|$)/, "local/generated quarantine"],
  [/^(?:app|components|data|lib|public|types|middleware\.ts)(?:\/|$)/, "runtime app/API/data/public"],
  [/^\.env/, "secret/env quarantine"]
];

function parseArgs(argv) {
  const options = {
    action: "write",
    json: false,
    noReport: false,
    runId: undefined,
    reason: DEFAULT_REASON,
    reportDir: DEFAULT_REPORT_DIR,
    latestJson: process.env.MAIS_DIRTY_TREE_MAP_JSON
      ? resolveFromRepo(process.env.MAIS_DIRTY_TREE_MAP_JSON)
      : DEFAULT_LATEST_JSON,
    latestMarkdown: DEFAULT_LATEST_MARKDOWN,
    maxAgeMinutes: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--assert-current") {
      options.action = "assert-current";
    } else if (arg === "--no-report") {
      options.noReport = true;
    } else if (arg === "--run-id") {
      options.runId = argv[++index];
    } else if (arg === "--reason") {
      options.reason = argv[++index] ?? DEFAULT_REASON;
    } else if (arg === "--report-dir") {
      options.reportDir = resolveFromRepo(argv[++index]);
    } else if (arg === "--latest-json") {
      options.latestJson = resolveFromRepo(argv[++index]);
    } else if (arg === "--latest-md" || arg === "--latest-markdown") {
      options.latestMarkdown = resolveFromRepo(argv[++index]);
    } else if (arg === "--max-age-minutes") {
      options.maxAgeMinutes = parsePositiveNumber(argv[++index], "max age minutes");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveFromRepo(value) {
  if (!value) throw new Error("Expected a path value.");
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function parsePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function gitOutput(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
}

function gitLines(args) {
  return gitOutput(args)
    .split("\n")
    .filter(Boolean);
}

function isTransientDirtyPath(filePath) {
  const normalized = toPosix(decodeGitQuotedPath(filePath));
  return TRANSIENT_DIRTY_PATH_RULES.some((pattern) => pattern.test(normalized));
}

function filterStatusLines(lines) {
  return lines.filter((line) => !isTransientDirtyPath(parseStatusLine(line).path));
}

function filterPathLines(lines) {
  return lines.filter((line) => !isTransientDirtyPath(line));
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  let filePath = line.slice(3);
  if (filePath.includes(" -> ")) {
    filePath = filePath.split(" -> ").at(-1) ?? filePath;
  }
  return {
    status,
    path: toPosix(filePath)
  };
}

function classify(filePath, rules, fallback) {
  const normalized = toPosix(decodeGitQuotedPath(filePath));
  const match = rules.find(([pattern]) => pattern.test(normalized));
  return match?.[1] ?? fallback;
}

function decodeGitQuotedPath(value) {
  const text = String(value);
  if (!text.startsWith("\"") || !text.endsWith("\"")) return text;

  const bytes = [];
  for (let index = 1; index < text.length - 1;) {
    const char = text[index];
    if (char !== "\\") {
      bytes.push(...Buffer.from(char, "utf8"));
      index += 1;
      continue;
    }

    const octal = text.slice(index + 1, index + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      bytes.push(parseInt(octal, 8));
      index += 4;
      continue;
    }

    const escaped = text[index + 1];
    const simpleEscapes = new Map([
      ["\"", "\""],
      ["\\", "\\"],
      ["n", "\n"],
      ["r", "\r"],
      ["t", "\t"],
      ["b", "\b"],
      ["f", "\f"]
    ]);
    if (simpleEscapes.has(escaped)) {
      bytes.push(...Buffer.from(simpleEscapes.get(escaped), "utf8"));
      index += 2;
      continue;
    }

    bytes.push(...Buffer.from(char, "utf8"));
    index += 1;
  }

  return Buffer.from(bytes).toString("utf8");
}

function buildDirtyTreeMap(reason, outputPaths = {}) {
  const collapsedStatusLines = filterStatusLines(gitLines(["status", "--porcelain=v1"]));
  const expandedStatusLines = filterStatusLines(gitLines(["status", "--porcelain=v1", "-uall"]));
  const untrackedFiles = filterPathLines(gitLines(["ls-files", "--others", "--exclude-standard"]));
  const entries = expandedStatusLines.map((line) => {
    const entry = parseStatusLine(line);
    return {
      ...entry,
      owner: classify(entry.path, OWNER_RULES, "Unmapped/manual owner needed"),
      slice: classify(entry.path, SLICE_RULES, "unmapped/manual")
    };
  });

  const trackedModified = collapsedStatusLines.filter((line) => !line.startsWith("??") && !statusHasDeletion(line)).length;
  const trackedDeleted = collapsedStatusLines.filter((line) => !line.startsWith("??") && statusHasDeletion(line)).length;
  const untrackedStatusEntries = collapsedStatusLines.filter((line) => line.startsWith("??")).length;

  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Hong_Kong",
    sessions: [
      "A25 git hygiene and release intake",
      "A22 production reliability and release engineering",
      "A10 tooling, docs, and report"
    ],
    reason,
    statusSignature: hashLines(expandedStatusLines),
    outputPaths: relativeOutputPaths(outputPaths),
    statusCounts: {
      collapsedStatusEntries: collapsedStatusLines.length,
      expandedStatusEntries: expandedStatusLines.length,
      trackedModified,
      trackedDeleted,
      untrackedStatusEntries,
      untrackedFiles: untrackedFiles.length
    },
    ownerBuckets: countBy(entries, "owner"),
    sliceBuckets: countBy(entries, "slice"),
    releaseHygieneEntries: entries.filter((entry) => entry.slice === "release hygiene tooling/config"),
    entries
  };
}

function hashLines(lines) {
  return crypto.createHash("sha256").update([...lines].sort().join("\0")).digest("hex");
}

function statusHasDeletion(line) {
  const indexStatus = line[0] ?? " ";
  const worktreeStatus = line[1] ?? " ";
  return indexStatus === "D" || worktreeStatus === "D";
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function relativeOutputPaths(outputPaths) {
  return Object.fromEntries(
    Object.entries(outputPaths)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, toRepoRelativePath(value)])
  );
}

async function writeDirtyTreeMap(options) {
  const paths = outputPathsForRun(options);

  await writeOutputs(buildDirtyTreeMap(options.reason, paths), paths, options.noReport);
  const finalMap = buildDirtyTreeMap(options.reason, paths);
  await writeOutputs(finalMap, paths, options.noReport);

  return {
    latestJson: toRepoRelativePath(paths.latestJson),
    latestMarkdown: options.noReport ? undefined : toRepoRelativePath(paths.latestMarkdown),
    reportJson: options.noReport ? undefined : toRepoRelativePath(paths.reportJson),
    reportMarkdown: options.noReport ? undefined : toRepoRelativePath(paths.reportMarkdown),
    statusSignature: finalMap.statusSignature,
    statusCounts: finalMap.statusCounts,
    ownerBuckets: finalMap.ownerBuckets,
    sliceBuckets: finalMap.sliceBuckets
  };
}

function outputPathsForRun(options) {
  const runId = sanitizePathSegment(options.runId ?? timestampRunId());
  const date = hktDateStamp();
  return {
    latestJson: options.latestJson,
    latestMarkdown: options.latestMarkdown,
    reportJson: path.join(options.reportDir, `${date}-A25-dirty-tree-map-${runId}.json`),
    reportMarkdown: path.join(options.reportDir, `${date}-A25-dirty-tree-map-${runId}.md`)
  };
}

async function writeOutputs(map, paths, noReport) {
  await fs.mkdir(path.dirname(paths.latestJson), { recursive: true });
  await fs.writeFile(paths.latestJson, `${JSON.stringify(map, null, 2)}\n`);

  if (noReport) return;

  const markdown = formatMarkdown(map);
  await fs.mkdir(path.dirname(paths.latestMarkdown), { recursive: true });
  await fs.mkdir(path.dirname(paths.reportJson), { recursive: true });
  await fs.writeFile(paths.latestMarkdown, markdown);
  await fs.writeFile(paths.reportJson, `${JSON.stringify(map, null, 2)}\n`);
  await fs.writeFile(paths.reportMarkdown, markdown);
}

function formatMarkdown(map) {
  const lines = [
    `# ${hktDateStamp()} A25 Dirty-Tree Map`,
    "",
    `Generated at: ${map.generatedAt}`,
    `Agents: ${map.sessions.join("; ")}`,
    `Reason: ${map.reason}`,
    `Status signature: \`${map.statusSignature}\``,
    "",
    "## Counts",
    "",
    `- Collapsed status entries: ${map.statusCounts.collapsedStatusEntries}`,
    `- Expanded status entries: ${map.statusCounts.expandedStatusEntries}`,
    `- Tracked modified: ${map.statusCounts.trackedModified}`,
    `- Tracked deleted: ${map.statusCounts.trackedDeleted}`,
    `- Untracked status entries: ${map.statusCounts.untrackedStatusEntries}`,
    `- Untracked files: ${map.statusCounts.untrackedFiles}`,
    "",
    "## Owner Buckets",
    "",
    ...formatBucketTable(map.ownerBuckets, "Owner bucket"),
    "",
    "## Slice Buckets",
    "",
    ...formatBucketTable(map.sliceBuckets, "Slice"),
    "",
    "## Release Hygiene Entries",
    "",
    ...formatEntries(map.releaseHygieneEntries),
    "",
    "## Runtime Release Rule",
    "",
    "- Runtime preview/production release remains blocked until this map is current at preflight time.",
    "- A22 must use a clean worktree, clean clone, reviewed clean release slice, or pruned staging; direct dirty-root deploy remains forbidden.",
    "- A10/A25 should slice the root inventory into runtime app/API/data, tests/regression evidence, docs/coordination evidence, content/RAG backlog, release hygiene tooling/config, and local/generated quarantine.",
    "- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.",
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function formatBucketTable(bucket, label) {
  const rows = [
    `| ${label} | Dirty entries |`,
    "| --- | ---: |"
  ];
  for (const [name, count] of Object.entries(bucket)) {
    rows.push(`| ${name} | ${count} |`);
  }
  return rows;
}

function formatEntries(entries) {
  if (entries.length === 0) {
    return ["No release-hygiene entries detected."];
  }

  const rows = [
    "| Status | Path | Owner |",
    "| --- | --- | --- |"
  ];
  for (const entry of entries.slice(0, 120)) {
    rows.push(`| \`${entry.status.trim() || "M"}\` | \`${entry.path}\` | ${entry.owner} |`);
  }
  if (entries.length > 120) {
    rows.push(`| ... | ${entries.length - 120} additional entries omitted from markdown; see JSON. |  |`);
  }
  return rows;
}

async function assertCurrentDirtyTreeMap(options) {
  const latestJson = options.latestJson;
  const raw = await fs.readFile(latestJson, "utf8").catch((error) => {
    throw new Error(
      [
        `A25 dirty-tree map is missing: ${toRepoRelativePath(latestJson)}`,
        "Run `npm run release:dirty-map -- --reason \"runtime release preflight\"` before any runtime release.",
        error.message
      ].join("\n")
    );
  });

  const saved = JSON.parse(raw);
  const current = buildDirtyTreeMap("runtime release dirty-tree assertion", {
    latestJson,
    latestMarkdown: options.latestMarkdown
  });

  if (saved.statusSignature !== current.statusSignature) {
    throw new Error(
      [
        "A25 dirty-tree map is stale; current git status no longer matches the latest map.",
        `Latest map: ${toRepoRelativePath(latestJson)}`,
        `Saved signature: ${saved.statusSignature}`,
        `Current signature: ${current.statusSignature}`,
        `Saved expanded entries: ${saved.statusCounts?.expandedStatusEntries ?? "unknown"}`,
        `Current expanded entries: ${current.statusCounts.expandedStatusEntries}`,
        "Refresh with `npm run release:dirty-map -- --reason \"runtime release preflight\"` before runtime release."
      ].join("\n")
    );
  }

  if (options.maxAgeMinutes !== undefined) {
    const generatedAt = Date.parse(saved.generatedAt);
    const ageMs = Date.now() - generatedAt;
    const maxAgeMs = options.maxAgeMinutes * 60 * 1000;
    if (!Number.isFinite(generatedAt) || ageMs > maxAgeMs) {
      throw new Error(
        [
          `A25 dirty-tree map is older than ${options.maxAgeMinutes} minutes.`,
          `Latest map: ${toRepoRelativePath(latestJson)}`,
          `Generated at: ${saved.generatedAt ?? "unknown"}`,
          "Refresh it immediately before runtime release."
        ].join("\n")
      );
    }
  }

  return {
    latestJson: toRepoRelativePath(latestJson),
    generatedAt: saved.generatedAt,
    statusSignature: saved.statusSignature,
    statusCounts: current.statusCounts
  };
}

function timestampRunId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function sanitizePathSegment(value) {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized) throw new Error("Run id cannot be empty.");
  return sanitized;
}

function toRepoRelativePath(absolutePath) {
  return toPosix(path.relative(REPO_ROOT, absolutePath));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result =
    options.action === "assert-current"
      ? await assertCurrentDirtyTreeMap(options)
      : await writeDirtyTreeMap(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.action === "assert-current") {
    console.log("A25 dirty-tree map is current for runtime release preflight");
    console.log(`Latest map: ${result.latestJson}`);
    console.log(`Expanded status entries: ${result.statusCounts.expandedStatusEntries}`);
    return;
  }

  console.log("A25 dirty-tree map refreshed");
  console.log(`Latest map: ${result.latestJson}`);
  if (result.reportMarkdown) console.log(`Report: ${result.reportMarkdown}`);
  console.log(`Expanded status entries: ${result.statusCounts.expandedStatusEntries}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
