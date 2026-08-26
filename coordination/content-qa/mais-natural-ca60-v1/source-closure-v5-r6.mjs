import { execFile as nodeExecFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";

const execFileAsync = promisify(nodeExecFile);
const SCANNABLE = /\.(?:c?js|mjs|ts|tsx)$/u;

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

export function importSpecifiersV5R6(text) {
  const specifiers = new Set();
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) {
    for (const match of text.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers].sort(compare);
}

function candidates(importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  requireCondition(!base.startsWith("/") && !base.split("/").includes(".."), `unsafe relative import from ${importer}`);
  return [base, `${base}.mjs`, `${base}.js`, `${base}.json`, `${base}/index.mjs`, `${base}/index.js`];
}

async function resolveRelativeImport({ importer, specifier, exists }) {
  for (const candidate of candidates(importer, specifier)) if (await exists(candidate)) return candidate;
  throw new TypeError(`unresolved relative import ${specifier} from ${importer}`);
}

export async function collectTransitiveSourceClosureV5R6({ entryPoints, readBytes, exists }) {
  requireCondition(Array.isArray(entryPoints) && entryPoints.length > 0 && typeof readBytes === "function"
    && typeof exists === "function", "transitive source closure inputs are invalid");
  const queue = [...new Set(entryPoints)].sort(compare);
  const visited = new Set();
  const edges = [];
  while (queue.length > 0) {
    const sourcePath = queue.shift();
    if (visited.has(sourcePath)) continue;
    requireCondition(await exists(sourcePath), `registered production entrypoint or dependency is absent: ${sourcePath}`);
    visited.add(sourcePath);
    if (!SCANNABLE.test(sourcePath)) continue;
    const text = Buffer.from(await readBytes(sourcePath)).toString("utf8");
    for (const specifier of importSpecifiersV5R6(text)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = await resolveRelativeImport({ importer: sourcePath, specifier, exists });
      edges.push({ importer: sourcePath, specifier, resolved });
      if (!visited.has(resolved)) queue.push(resolved);
    }
    queue.sort(compare);
  }
  const paths = [...visited].sort(compare);
  const sortedEdges = edges.sort((left, right) => compare(canonicalJsonV5R3(left), canonicalJsonV5R3(right)));
  return Object.freeze({
    paths: Object.freeze(paths),
    edges: Object.freeze(sortedEdges),
    importEdgeCount: sortedEdges.length,
    importClosureRootHash: sha256V5R3(canonicalJsonV5R3({ paths, edges: sortedEdges })),
  });
}

export async function collectGitSourceClosureV5R6({ repoRoot, commit, entryPoints }) {
  requireCondition(path.isAbsolute(repoRoot) && /^[0-9a-f]{40}$/u.test(commit ?? ""),
    "Git source closure requires an absolute repository and exact commit");
  const cache = new Map();
  async function readBytes(sourcePath) {
    if (!cache.has(sourcePath)) {
      const result = await execFileAsync("git", ["show", `${commit}:${sourcePath}`], {
        cwd: repoRoot,
        encoding: null,
        maxBuffer: 64 * 1024 * 1024,
      });
      cache.set(sourcePath, Buffer.from(result.stdout));
    }
    return cache.get(sourcePath);
  }
  async function exists(sourcePath) {
    try { await readBytes(sourcePath); return true; } catch { return false; }
  }
  return collectTransitiveSourceClosureV5R6({ entryPoints, readBytes, exists });
}

export async function collectFilesystemSourceClosureV5R6({ repoRoot, entryPoints }) {
  requireCondition(path.isAbsolute(repoRoot), "filesystem source closure requires an absolute repository path");
  async function exists(sourcePath) {
    try { await access(path.join(repoRoot, sourcePath)); return true; } catch { return false; }
  }
  return collectTransitiveSourceClosureV5R6({
    entryPoints,
    exists,
    readBytes: (sourcePath) => readFile(path.join(repoRoot, sourcePath)),
  });
}

export async function sourceManifestFromGitV5R6({ repoRoot, commit, paths }) {
  const rows = [];
  for (const sourcePath of [...paths].sort(compare)) {
    const result = await execFileAsync("git", ["show", `${commit}:${sourcePath}`], {
      cwd: repoRoot,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024,
    });
    const bytes = Buffer.from(result.stdout);
    rows.push({ path: sourcePath, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) });
  }
  return Object.freeze(rows);
}

export function sourceManifestRootV5R6(manifest) {
  return sha256V5R3(canonicalJsonV5R3(manifest));
}
