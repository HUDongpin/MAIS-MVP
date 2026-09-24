import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { devNull } from "node:os";
import path from "node:path";

const hashPattern = /^[a-f0-9]{40}$/u;
const zeroHash = "0".repeat(40);
const modes = new Set(["000000", "100644", "100755", "120000", "160000", "040000"]);
const maxBytes = 32 * 1024 * 1024;
const maxCommits = 10_000;
const maxCollectionMs = 120_000;
function fail(code) { throw new Error(code); }
function text(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes) fail("HISTORY_BYTES");
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("HISTORY_UTF8"); }
}
function safePath(value) {
  if (typeof value !== "string" || !value || value.length > 4096 || path.posix.isAbsolute(value)
    || /[\u0000-\u001f\u007f\\:]/u.test(value)
    || value.split("/").some((part) => !part || part === "." || part === "..")
    || Buffer.from(value).toString("utf8") !== value) fail("HISTORY_PATH");
  return value;
}

export function parsePromotionHistoryGraph(bytes) {
  const value = text(bytes);
  const commits = new Map();
  if (value === "") return commits;
  if (!value.endsWith("\n") || value.includes("\0")) fail("HISTORY_GRAPH");
  for (const row of value.slice(0, -1).split("\n")) {
    const [commit, ...parents] = row.split(" ");
    if (!hashPattern.test(commit) || parents.some((parent) => !hashPattern.test(parent) || parent === commit)
      || new Set(parents).size !== parents.length || commits.has(commit)) fail("HISTORY_GRAPH");
    commits.set(commit, parents);
    if (commits.size > maxCommits) fail("HISTORY_GRAPH_LIMIT");
  }
  return commits;
}

export function parsePromotionRawChanges(bytes, selectedPaths, commit) {
  const value = text(bytes);
  if (value === "") return [];
  if (!value.endsWith("\0") || !hashPattern.test(commit)) fail("HISTORY_RAW");
  const tokens = value.slice(0, -1).split("\0");
  if (tokens.length % 2) fail("HISTORY_RAW");
  const seen = new Set();
  const changes = [];
  for (let index = 0; index < tokens.length; index += 2) {
    const raw = tokens[index].match(/^:([0-7]{6}) ([0-7]{6}) ([a-f0-9]{40}) ([a-f0-9]{40}) ([ADMT])$/u);
    if (!raw || !["A", "D", "M", "T"].includes(raw[5]) || !modes.has(raw[1]) || !modes.has(raw[2])) fail("HISTORY_RAW");
    const changedPath = tokens[index + 1];
    if (!selectedPaths.has(changedPath) || seen.has(changedPath)) fail("HISTORY_PATH");
    safePath(changedPath); seen.add(changedPath);
    const oldAbsent = raw[1] === "000000" && raw[3] === zeroHash;
    const newAbsent = raw[2] === "000000" && raw[4] === zeroHash;
    if ((raw[1] === "000000") !== (raw[3] === zeroHash) || (raw[2] === "000000") !== (raw[4] === zeroHash)
      || (raw[5] === "A" ? !oldAbsent || newAbsent : raw[5] === "D" ? oldAbsent || !newAbsent : oldAbsent || newAbsent)) fail("HISTORY_RAW");
    changes.push({ commit, status: raw[5], oldMode: raw[1], newMode: raw[2], oldBlob: raw[3], newBlob: raw[4], path: changedPath });
  }
  return changes;
}

export function parsePromotionAuthorityTree(bytes, selectedPaths) {
  const value = text(bytes);
  const entries = new Map();
  if (value === "") return entries;
  if (!value.endsWith("\0")) fail("HISTORY_TREE");
  for (const record of value.slice(0, -1).split("\0")) {
    const match = record.match(/^([0-7]{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/u);
    if (!match || !modes.has(match[1]) || match[1] === "000000" || match[3] === zeroHash) fail("HISTORY_TREE");
    const [, mode, type, blob, file] = match;
    if (!selectedPaths.has(file) || entries.has(file)) fail("HISTORY_PATH");
    safePath(file);
    if ((mode === "040000") !== (type === "tree") || (mode === "160000") !== (type === "commit")) fail("HISTORY_TREE");
    entries.set(file, { mode, type, blob });
  }
  return entries;
}
function sameEntry(left, right) {
  return left?.mode === right?.mode && left?.type === right?.type && left?.blob === right?.blob;
}

/** Collect origins, not synthetic additions relative to a merge's missing parent.
 * The workflow still validates atomic binding, exact blobs and Receipt ordering.
 * All merge parents are inspected; this never relies on combined-diff omission.
 */
export function collectPromotionReaffirmationHistory({ repoRoot, evidenceCommit, headCommit, manifestPath, descriptorPath, receiptPath }) {
  const selectedPaths = new Set([manifestPath, descriptorPath, receiptPath].map(safePath));
  if (selectedPaths.size !== 3) fail("HISTORY_PATH");
  if (!hashPattern.test(evidenceCommit) || (headCommit !== undefined && !hashPattern.test(headCommit))) fail("HISTORY_OBJECT");
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot) || realpathSync(repoRoot) !== repoRoot) fail("HISTORY_ROOT");
  const startedAt = Date.now();
  let bytesRead = 0;
  const readGit = (...args) => {
    if (Date.now() - startedAt >= maxCollectionMs || bytesRead >= maxBytes) fail("HISTORY_BUDGET");
    try {
      const result = execFileSync("git", ["--no-optional-locks", "--no-replace-objects", "--literal-pathspecs", "-c", "core.fsmonitor=false", ...args], {
        cwd: repoRoot, encoding: null, maxBuffer: maxBytes - bytesRead,
        // --no-replace-objects does not disable common-dir info/grafts. Force every
        // read (including ancestry and the evidence cutoff) to use the raw object graph.
        // Do not read, modify or inherit the caller's GIT_GRAFT_FILE or graft contents.
        env: { ...process.env, GIT_GRAFT_FILE: devNull },
        timeout: Math.min(30_000, maxCollectionMs - (Date.now() - startedAt)), stdio: ["ignore", "pipe", "pipe"]
      });
      bytesRead += result.byteLength;
      return result;
    } catch { fail("HISTORY_GIT"); }
  };
  const oneLine = (...args) => {
    const result = text(readGit(...args));
    if (!result.endsWith("\n") || result.slice(0, -1).includes("\n")) fail("HISTORY_GIT_FORMAT");
    return result.slice(0, -1);
  };
  if (realpathSync(oneLine("rev-parse", "--show-toplevel")) !== repoRoot) fail("HISTORY_ROOT");
  if (oneLine("rev-parse", "--is-shallow-repository") !== "false") fail("HISTORY_SHALLOW");
  const initialHead = oneLine("rev-parse", "--verify", "HEAD^{commit}");
  const head = headCommit ?? initialHead;
  for (const commit of [evidenceCommit, head]) {
    if (oneLine("rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`) !== commit) fail("HISTORY_OBJECT");
  }
  try { readGit("merge-base", "--is-ancestor", evidenceCommit, head); }
  catch { fail("HISTORY_ANCESTRY"); }
  // Retain the workflow's fail-closed UTF-8 audit even for unrelated changed paths.
  // Combined records are valid text; authority is checked per parent below.
  text(readGit("show", "--format=%H%x00%P%x00", "--raw", "-z", "--no-abbrev", "--no-renames", `${evidenceCommit}..${head}`));
  const commits = parsePromotionHistoryGraph(readGit("rev-list", "--parents", `${evidenceCommit}..${head}`));
  if (!commits.size || !commits.has(head)) fail("HISTORY_GRAPH");
  const parentsInRange = new Set([...commits.values()].flat().filter((parent) => commits.has(parent)));
  if ([...commits.keys()].filter((commit) => !parentsInRange.has(commit)).length !== 1) fail("HISTORY_GRAPH");
  const visited = new Set();
  const pending = [head];
  while (pending.length) {
    const commit = pending.pop();
    if (visited.has(commit)) continue;
    visited.add(commit);
    for (const parent of commits.get(commit) ?? []) if (commits.has(parent)) pending.push(parent);
  }
  if (visited.size !== commits.size) fail("HISTORY_GRAPH");
  for (const parent of new Set([...commits.values()].flat().filter((parent) => !commits.has(parent)))) {
    try { readGit("merge-base", "--is-ancestor", parent, evidenceCommit); }
    catch { fail("HISTORY_GRAPH_BOUNDARY"); }
  }
  const trees = new Map();
  const treeAt = (commit) => {
    if (!trees.has(commit)) trees.set(commit, parsePromotionAuthorityTree(readGit("ls-tree", "-z", commit, "--", ...selectedPaths), selectedPaths));
    return trees.get(commit);
  };
  const changes = [];
  let mergeCount = 0;
  for (const [commit, parents] of commits) {
    if (parents.length < 2) {
      const revisions = parents.length === 1 ? [parents[0], commit] : ["--root", commit];
      changes.push(...parsePromotionRawChanges(readGit("diff-tree", "--no-commit-id", "--raw", "-r", "-z", "--no-abbrev", "--no-renames", "--no-ext-diff", ...revisions, "--", ...selectedPaths), selectedPaths, commit));
      continue;
    }
    mergeCount += 1;
    const result = treeAt(commit);
    const parentTrees = parents.map(treeAt);
    for (const file of selectedPaths) {
      const entry = result.get(file);
      const prior = parentTrees.map((parent) => parent.get(file)).filter(Boolean);
      if (!entry && prior.length === 0) continue;
      if (!entry || !prior.length || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)
        || prior.some((previous) => !sameEntry(previous, entry))) fail("AUTHORITY_MERGE_CHANGE");
    }
  }
  if (headCommit === undefined && oneLine("rev-parse", "--verify", "HEAD^{commit}") !== initialHead) fail("HISTORY_HEAD_CHANGED");
  return { commits, changes, headCommit: head, mergeCount, bytesRead };
}
