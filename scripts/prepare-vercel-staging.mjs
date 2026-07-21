#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_STAGING_ROOT = path.join(REPO_ROOT, ".tmp", "vercel-staging");

const REQUIRED_ROOT_FILES = [
  ".vercelignore",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "public/robots.txt",
  "scripts/next-clean-build.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.next.json"
];

const REQUIRED_DIRECTORIES = [
  "app",
  "components",
  "data",
  "lib",
  "types",
  "public/audio",
  "public/lesson-illustrations",
  "public/ease_question_assets",
  "public/practice"
];

// public/games is not bulk-included: most of that tree is unreferenced design
// snapshots. Only these five files are referenced by live game runtime code
// (Mighty Tank Battle, Math Virus Blaster, Math Match Quest) and already serve
// production; each is validated and shipped explicitly. public/auth and
// public/forum-assets were removed by 7de8503d6d and are no longer referenced,
// so they are dropped from the required set.
const REQUIRED_GAME_ASSET_FILES = [
  "public/games/math-match-quest/board-reference.png",
  "public/games/math-match-quest/map-reference.png",
  "public/games/math-virus-blaster/math-master-virus-blaster-design.png",
  "public/games/mighty-tank-battle/desktop-reference.png",
  "public/games/mighty-tank-battle/mobile-reference.png"
];

const FORBIDDEN_ROOTS = new Set([
  ".git",
  ".local",
  ".tmp",
  ".vercel",
  "coordination",
  "node_modules",
  "private",
  "Users"
]);

const FORBIDDEN_BASENAMES = new Set([
  ".DS_Store",
  "All API Keys.docx",
  "default accounts.md"
]);

export async function prepareVercelStaging(options = {}) {
  const runId = sanitizePathSegment(options.runId ?? process.env.VERCEL_STAGING_RUN_ID ?? timestampRunId());
  const stagingRoot = path.resolve(options.stagingRoot ?? process.env.VERCEL_STAGING_ROOT ?? DEFAULT_STAGING_ROOT);
  assertSafeStagingRoot(stagingRoot);
  const stagingDir = path.join(stagingRoot, runId);
  const dryRun = Boolean(options.dryRun);

  await assertMainlandPepQuestionIllustrationsAreNotDeployable();

  const plannedFiles = await collectDeployableFiles();
  const forbiddenFiles = plannedFiles.filter((file) => isForbiddenDeployPath(file.relativePath));
  if (forbiddenFiles.length > 0) {
    throw new Error(
      [
        "Refusing to prepare Vercel staging because forbidden paths were selected:",
        ...forbiddenFiles.slice(0, 20).map((file) => `- ${file.relativePath}`),
        forbiddenFiles.length > 20 ? `- ...and ${forbiddenFiles.length - 20} more` : ""
      ].filter(Boolean).join("\n")
    );
  }

  if (!dryRun) {
    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.mkdir(stagingDir, { recursive: true });
    for (const file of plannedFiles) {
      const destination = path.join(stagingDir, file.relativePath);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(file.absolutePath, destination);
    }
  }

  const summary = {
    stagingDir,
    dryRun,
    fileCount: plannedFiles.length,
    totalBytes: plannedFiles.reduce((total, file) => total + file.size, 0),
    forbiddenPathCount: forbiddenFiles.length,
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    }
  };

  if (!dryRun) {
    await fs.writeFile(
      path.join(stagingDir, "vercel-staging-manifest.json"),
      `${JSON.stringify({
        ...summary,
        createdAt: new Date().toISOString(),
        files: plannedFiles.map((file) => ({
          path: file.relativePath,
          bytes: file.size
        }))
      }, null, 2)}\n`
    );
  }

  return summary;
}

async function collectDeployableFiles() {
  const files = [];

  for (const rootFile of [...REQUIRED_ROOT_FILES, ...REQUIRED_GAME_ASSET_FILES]) {
    const absolutePath = path.join(REPO_ROOT, rootFile);
    await assertReadablePath(absolutePath, rootFile);
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Required deploy file is not a file: ${rootFile}`);
    }
    files.push({
      absolutePath,
      relativePath: toPosix(rootFile),
      size: stat.size
    });
  }

  for (const directory of REQUIRED_DIRECTORIES) {
    const absoluteDirectory = path.join(REPO_ROOT, directory);
    await assertReadablePath(absoluteDirectory, directory);
    await walkDirectory(absoluteDirectory, async (absolutePath, stat) => {
      const relativePath = toRepoRelativePath(absolutePath);
      if (isForbiddenDeployPath(relativePath)) return;
      files.push({
        absolutePath,
        relativePath,
        size: stat.size
      });
    });
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function walkDirectory(directory, onFile) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRepoRelativePath(absolutePath);
    if (isForbiddenDeployPath(relativePath)) continue;

    if (entry.isDirectory()) {
      await walkDirectory(absolutePath, onFile);
      continue;
    }

    if (entry.isFile()) {
      const stat = await fs.stat(absolutePath);
      await onFile(absolutePath, stat);
    }
  }
}

function isForbiddenDeployPath(relativePath) {
  const normalizedPath = toPosix(relativePath).replace(/^\/+/, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  const basename = segments.at(-1) ?? "";

  if (FORBIDDEN_BASENAMES.has(basename)) return true;
  if (basename.startsWith(".env")) return true;
  if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(basename)) return true;

  if (segments.some((segment) => FORBIDDEN_ROOTS.has(segment))) return true;
  if (segments.some((segment) => segment === "__tests__" || segment === "test" || segment === "tests")) return true;
  if (segments.some((segment) => segment.startsWith(".next"))) return true;
  if (segments.some((segment) => segment.startsWith(".s11"))) return true;

  return (
    normalizedPath === "data/ease" ||
    normalizedPath.startsWith("data/ease/") ||
    normalizedPath === "public/question-illustrations" ||
    normalizedPath.startsWith("public/question-illustrations/")
  );
}

function isInside(absolutePath, root) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeStagingRoot(stagingRoot) {
  if (stagingRoot === REPO_ROOT) {
    throw new Error("Refusing to use the repository root as Vercel staging root.");
  }

  if (
    process.env.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING !== "1" &&
    !isInside(stagingRoot, DEFAULT_STAGING_ROOT)
  ) {
    throw new Error(
      [
        "Refusing to prepare Vercel staging outside .tmp/vercel-staging.",
        `Requested staging root: ${stagingRoot}`,
        "Set MAIS_ALLOW_EXTERNAL_VERCEL_STAGING=1 only for an owner-approved exception."
      ].join("\n")
    );
  }
}

async function assertMainlandPepQuestionIllustrationsAreNotDeployable() {
  const sourcePath = path.join(REPO_ROOT, "lib", "mainlandPepQuestionAssets.ts");
  const source = await fs.readFile(sourcePath, "utf8");
  const approvalsAreEmpty =
    /export\s+const\s+mainlandPepQuestionIllustrationApprovals[\s\S]*?=\s*\[\s*\];/.test(source);

  if (!approvalsAreEmpty) {
    throw new Error(
      [
        "Refusing to exclude public/question-illustrations because Mainland PEP question illustration approvals are no longer empty.",
        "Define an explicit deploy asset policy before preparing Vercel staging."
      ].join("\n")
    );
  }
}

async function assertReadablePath(absolutePath, label) {
  try {
    await fs.access(absolutePath, fsConstants.R_OK);
  } catch {
    throw new Error(`Required deploy input is missing or unreadable: ${label}`);
  }
}

function timestampRunId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
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

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    runId: undefined,
    stagingRoot: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--run-id") {
      args.runId = argv[++index];
    } else if (arg === "--staging-root") {
      args.stagingRoot = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await prepareVercelStaging(args);

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const action = summary.dryRun ? "Dry-run Vercel staging audit passed" : "Prepared Vercel staging package";
  console.log(action);
  console.log(`Staging directory: ${summary.stagingDir}`);
  console.log(`Files: ${summary.fileCount}`);
  console.log(`Size: ${formatBytes(summary.totalBytes)}`);
  console.log(`Forbidden paths: ${summary.forbiddenPathCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
