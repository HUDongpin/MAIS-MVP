#!/usr/bin/env node

import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_DIST_DIR = ".next";
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 768 * 1024 * 1024;

const FORBIDDEN_MARKERS = [
  "@cortex-js/compute-engine",
  "cortex-js/compute-engine",
  "complex-esm",
  "ComputeEngine",
  "BoxedExpression",
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function parseDistArg(argv, env) {
  const index = argv.indexOf("--dist");
  if (index >= 0) {
    const value = argv[index + 1]?.trim();
    if (!value || argv[index + 2]?.startsWith("--dist")) {
      throw new Error("--dist requires one repository-relative build directory.");
    }
    return value;
  }
  return env.NEXT_DIST_DIR?.trim() || DEFAULT_DIST_DIR;
}

function resolveInsideRepository(repoRoot, relativePath) {
  if (path.isAbsolute(relativePath)) {
    throw new Error("The Next build directory must be repository-relative.");
  }
  const root = path.resolve(repoRoot);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("The Next build directory must be a generated child of the repository.");
  }
  return target;
}

async function listRegularFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing a symlink in client build evidence: ${fullPath}`);
      }
      if (entry.isDirectory()) await visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  await visit(root);
  return files.sort();
}

function isClientManifest(relativePath) {
  return (
    relativePath === "build-manifest.json" ||
    relativePath === "app-build-manifest.json" ||
    relativePath === "react-loadable-manifest.json" ||
    relativePath.endsWith("client-reference-manifest.js") ||
    relativePath.endsWith("middleware-build-manifest.js") ||
    relativePath.endsWith("middleware-react-loadable-manifest.js")
  );
}

function findForbiddenMarker(buffer) {
  for (const marker of FORBIDDEN_MARKERS) {
    if (buffer.includes(Buffer.from(marker, "utf8"))) return marker;
  }
  return null;
}

async function scanFiles(files, distRoot) {
  let totalBytes = 0;
  for (const file of files) {
    const metadata = await lstat(file);
    if (!metadata.isFile()) throw new Error(`Client evidence is not a regular file: ${file}`);
    if (metadata.size > MAX_FILE_BYTES) {
      throw new Error(`Client evidence file exceeds ${MAX_FILE_BYTES} bytes: ${file}`);
    }
    totalBytes += metadata.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(`Client evidence exceeds the ${MAX_TOTAL_BYTES}-byte scan budget.`);
    }
    const content = await readFile(file);
    const marker = findForbiddenMarker(content);
    if (marker !== null) {
      const relative = toPosix(path.relative(distRoot, file));
      throw new Error(
        `Server-only math CAS marker ${JSON.stringify(marker)} found in client evidence ${relative}.`,
      );
    }
  }
  return totalBytes;
}

/**
 * Scan every emitted learner chunk (including source-map traces when present)
 * and every Next client-reference/build manifest. Server chunks and their NFT
 * traces are intentionally outside scope because the CAS is allowed there.
 */
export async function checkMathKernelClientBundle({
  repoRoot = REPO_ROOT,
  distDir = DEFAULT_DIST_DIR,
} = {}) {
  const distRoot = resolveInsideRepository(repoRoot, distDir);
  const chunksRoot = path.join(distRoot, "static", "chunks");
  const canonicalDist = await realpath(distRoot).catch(() => null);
  const canonicalChunks = await realpath(chunksRoot).catch(() => null);
  if (canonicalDist === null || canonicalChunks === null) {
    throw new Error(`Missing Next client chunks at ${toPosix(path.relative(repoRoot, chunksRoot))}. Run npm run build first.`);
  }
  const relativeChunks = path.relative(canonicalDist, canonicalChunks);
  if (relativeChunks === ".." || relativeChunks.startsWith(`..${path.sep}`)) {
    throw new Error("Next client chunks resolve outside the selected build directory.");
  }

  const chunkFiles = await listRegularFiles(canonicalChunks);
  if (chunkFiles.length === 0) throw new Error("Next emitted no learner static chunks to inspect.");
  const allBuildFiles = await listRegularFiles(canonicalDist);
  const manifestFiles = allBuildFiles.filter((file) =>
    isClientManifest(toPosix(path.relative(canonicalDist, file))),
  );
  if (manifestFiles.length === 0) {
    throw new Error("Next emitted no client build/reference manifests to inspect.");
  }
  const uniqueFiles = [...new Set([...chunkFiles, ...manifestFiles])].sort();
  const bytesScanned = await scanFiles(uniqueFiles, canonicalDist);
  return Object.freeze({
    schemaVersion: 1,
    distDir: toPosix(path.relative(path.resolve(repoRoot), canonicalDist)),
    chunkFileCount: chunkFiles.length,
    clientManifestCount: manifestFiles.length,
    uniqueFileCount: uniqueFiles.length,
    bytesScanned,
    forbiddenMarkers: Object.freeze([...FORBIDDEN_MARKERS]),
  });
}

async function main() {
  const distDir = parseDistArg(process.argv.slice(2), process.env);
  const result = await checkMathKernelClientBundle({ distDir });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
