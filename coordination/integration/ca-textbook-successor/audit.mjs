import {
  readFileSync,
  readdirSync,
  lstatSync,
  realpathSync,
  openSync,
  fstatSync,
  closeSync,
  constants as fsConstants,
} from "node:fs";
import path from "node:path";
import {
  parse,
  need,
  same,
  digest,
  hash,
  relative,
  unique,
} from "./common.mjs";
import { validateSchema } from "./schema.mjs";
import { PRIOR_REGISTRY_SHA, OLD_PROJECTION } from "./constants.mjs";

const transition = parse(
  readFileSync(new URL("./canonical-transition.json", import.meta.url)),
);
validateSchema("canonical-transition", transition);
need(
  transition.historicalRegistrySha256 === PRIOR_REGISTRY_SHA,
  "CA_AUDIT_HISTORY",
);
const sorted = (rows) =>
  [...rows].sort((a, b) =>
    a.packagePathDigest < b.packagePathDigest
      ? -1
      : a.packagePathDigest > b.packagePathDigest
        ? 1
        : 0,
  );
function auditFor(correlated) {
  const opaque = transition.opaquePreserved;
  const body = {
    schemaVersion: "promotion-legacy-conflict-union-audit.v1",
    candidateLikeCount: transition.candidatePaths.length,
    candidateSetDigest: digest(transition.candidatePaths),
    directConflictCount: 0,
    directConflictDigest: digest([]),
    correlatedConflictCount: correlated.length,
    correlatedConflictDigest: digest(correlated),
    ambiguousConflictCount: opaque.length,
    ambiguousConflictDigest: digest(opaque),
    reachableCandidateLikeCount: correlated.length + opaque.length,
    knownConflictCount: 0,
    newConflictCount: correlated.length,
    opaqueConflictCount: opaque.length,
    reachableConflictDigest: digest(sorted([...correlated, ...opaque])),
    newConflictDigest: digest(correlated),
    opaqueConflictDigest: digest(opaque),
    secondaryBlockedCondition: {
      code: "LEGACY_DISCOVERY_INCOMPLETE",
      conflictCount: opaque.length,
      conflictDigest: digest(opaque),
    },
  };
  return { ...body, auditDigest: digest(body) };
}
unique(transition.candidatePaths);
same(
  transition.candidatePaths,
  [...transition.candidatePaths].sort(),
  "CA_AUDIT_HISTORY",
);
for (const rows of [
  transition.correlatedBefore,
  transition.correlatedAfter,
  transition.opaquePreserved,
]) {
  same(rows, sorted(rows), "CA_AUDIT_HISTORY");
  unique(rows.map((row) => row.packagePathDigest));
}
need(
  transition.retiredCorrelation.packagePathDigest ===
    digest(
      "coordination/content-qa/us-ca-math-middle-school-textbooks-v2/lessons.json",
    ) &&
    transition.retiredCorrelation.correlatedRuntimePathDigest ===
      digest(OLD_PROJECTION),
  "CA_AUDIT_RETIREMENT",
);
const retired = transition.correlatedBefore.filter(
  (row) => digest(row) === digest(transition.retiredCorrelation),
);
need(retired.length === 1, "CA_AUDIT_RETIREMENT");
same(
  transition.correlatedAfter,
  transition.correlatedBefore.filter(
    (row) => digest(row) !== digest(transition.retiredCorrelation),
  ),
  "CA_AUDIT_RETIREMENT",
);
same(
  transition.before,
  auditFor(transition.correlatedBefore),
  "CA_AUDIT_HISTORY",
);
same(
  transition.after,
  auditFor(transition.correlatedAfter),
  "CA_AUDIT_HISTORY",
);
export function canonicalAuditExpectation(phase = "after") {
  need(phase === "before" || phase === "after", "CA_AUDIT_PHASE");
  return structuredClone(transition[phase]);
}
export function validateCanonicalAudit(audit, phase = "after") {
  validateSchema("canonical-audit", audit);
  const { auditDigest, ...body } = audit;
  need(digest(body) === auditDigest, "CA_AUDIT_SELF_DIGEST");
  same(audit, canonicalAuditExpectation(phase), "CA_AUDIT_TRANSITION");
  return audit;
}

// Exactly the JSON inputs consumed by the unchanged discovery observer. Resolver
// JSONC is intentionally left to its authenticated TypeScript resolver parser.
const canonicalNames = new Set([
  "candidate-package.json",
  "lessons.json",
  "package.json",
  "question-pack.json",
  "safe-card-drafts.json",
  "s04-practice-question-briefs.json",
  "s04-question-candidate-pack.json",
  "s04-representative-practice-candidates.json",
  "s05-lesson-candidate-pack.json",
  "s05-representative-lesson-candidates.json",
  "s05-textbook-lesson-briefs.json",
  "textbook-pack.json",
]);
const excludedSegments = new Set([
  "batches",
  "repair-batches",
  "repair_batches",
  "deepseek-v4-pro-full-rag-qa",
]);
export function strictConsumer(root, file) {
  relative(file);
  need(realpathSync(root) === root, "CA_OBSERVER_PATH");
  let cursor = root;
  for (const segment of file.split("/")) {
    cursor = path.join(cursor, segment);
    need(!lstatSync(cursor).isSymbolicLink(), "CA_OBSERVER_PATH");
  }
  need(realpathSync(cursor) === cursor, "CA_OBSERVER_PATH");
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    fd = openSync(cursor, flags);
  try {
    const before = fstatSync(fd, { bigint: true });
    need(
      before.isFile() && before.nlink === 1n && before.size <= 33554432n,
      "CA_OBSERVER_FILE",
    );
    const bytes = readFileSync(fd);
    const after = fstatSync(fd, { bigint: true }),
      leaf = lstatSync(cursor, { bigint: true });
    need(
      before.dev === after.dev &&
        before.ino === after.ino &&
        before.size === after.size &&
        before.mtimeNs === after.mtimeNs &&
        leaf.dev === before.dev &&
        leaf.ino === before.ino &&
        !leaf.isSymbolicLink(),
      "CA_OBSERVER_FILE",
    );
    try {
      parse(bytes);
    } catch {
      need(false, "CA_OBSERVER_JSON_INVALID");
    }
    return { path: file, sha256: hash(bytes) };
  } finally {
    closeSync(fd);
  }
}
export function strictStaticConsumers(root, registry, additional = []) {
  const files = new Set(["package.json", ...additional]);
  let visited = 0;
  function walk(rel, publicRoot) {
    relative(rel);
    const current = path.join(root, rel),
      stat = lstatSync(current);
    need(!stat.isSymbolicLink(), "CA_OBSERVER_PATH");
    need(++visited <= 100000, "CA_OBSERVER_SCAN_LIMIT");
    if (stat.isDirectory()) {
      for (const child of readdirSync(current).sort())
        walk(rel + "/" + child, publicRoot);
      return;
    }
    need(stat.isFile() && stat.nlink === 1, "CA_OBSERVER_FILE");
    const parts = rel.split("/");
    if (
      rel.endsWith(".json") &&
      (publicRoot ||
        (canonicalNames.has(parts.at(-1)) &&
          !parts.some((p) => excludedSegments.has(p))))
    )
      files.add(rel);
  }
  for (const rootPath of [
    "coordination/content-qa",
    "data/generated-content",
    "data/rag",
  ])
    walk(rootPath, false);
  walk("public", true);
  for (const row of registry.resolutions) {
    files.add(row.candidate.path);
    if (row.liveProjection) files.add(row.liveProjection.path);
    if (row.historicalProjection) files.add(row.historicalProjection.path);
  }
  return [...files].sort().map((file) => strictConsumer(root, file));
}
export function strictReachableConsumers(root, reachable, already) {
  const previous = new Map(already.map((row) => [row.path, row]));
  for (const file of [...reachable].filter((p) => p.endsWith(".json")).sort()) {
    const current = strictConsumer(root, file);
    if (previous.has(file))
      same(current, previous.get(file), "CA_OBSERVER_JSON_DRIFT");
    previous.set(file, current);
  }
  return [...previous.values()].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
}
