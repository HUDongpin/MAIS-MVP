// Exact post-source custody. Evidence is data at fixed typed paths, never an open subtree.
import { ROOT, BUNDLE_PATHS, ROLES } from "./constants.mjs";
import { need, same, unique } from "./common.mjs";
import { validateSchema } from "./schema.mjs";
export const releasePaths = () =>
  [
    ...BUNDLE_PATHS.filter((file) => file.startsWith(ROOT + "/")),
    ROOT + "/README.md",
    ROOT + "/lifecycle-A23-20261029.md",
  ].sort();
export function validateReleaseInventory(repo, m) {
  repo.ancestor(m.sourceCommit, m.checkerReleaseCommit);
  need(
    !repo
      .entries(m.sourceCommit)
      .some((row) => row.path.startsWith(ROOT + "/")),
    "CA_SOURCE_NAMESPACE",
  );
  const expected = releasePaths();
  same(
    repo.changed(m.sourceCommit, m.checkerReleaseCommit),
    expected,
    "CA_RELEASE_SCOPE",
  );
  for (const file of expected) {
    repo.absent(m.sourceCommit, file);
    repo.read(m.checkerReleaseCommit, { path: file });
  }
  return expected;
}
export function collectEvidenceArtifacts(repo, m) {
  validateSchema("manifest", m);
  const prefix = ROOT + "/attempts/" + m.attemptId,
    ep = prefix + "/evidence",
    files = new Map();
  const add = (binding, expected) => {
    validateSchema("reference", binding);
    need(binding.path === expected, "CA_EVIDENCE_PATH");
    need(!files.has(expected), "CA_EVIDENCE_DUPLICATE");
    const file = repo.read(m.evidenceCommit, binding);
    need(file.mode === "100644", "CA_EVIDENCE_MODE");
    files.set(expected, binding);
    return binding;
  };
  const json = (binding, expected, schema) => {
    add(binding, expected);
    const value = repo.json(m.evidenceCommit, binding);
    if (schema) validateSchema(schema, value);
    return value;
  };
  const ledger = json(
    m.checkerLedger,
    ROOT + "/checker-releases.json",
    "ledger",
  );
  const c = json(m.candidate, prefix + "/inputs/candidate.json", "candidate");
  json(m.registry, prefix + "/inputs/registry.json");
  const disposition = json(
    m.disposition,
    prefix + "/inputs/disposition.json",
    "disposition",
  );
  json(
    disposition.audit,
    prefix + "/inputs/canonical-audit.json",
    "canonical-audit",
  );
  const index = json(
    m.evidenceIndex,
    prefix + "/inputs/evidence-index.json",
    "index",
  );
  same(
    index.entries.map((row) => row.role),
    ROLES,
    "CA_EVIDENCE_ROLES",
  );
  same(
    ledger.reviews.map((ref) => ref.path),
    ["a11", "a23"].map((role) => ep + "/checker/" + role + ".json"),
    "CA_EVIDENCE_PATH",
  );
  for (const [i, binding] of ledger.reviews.entries()) {
    const role = ["a11", "a23"][i],
      review = json(
        binding,
        ep + "/checker/" + role + ".json",
        "release-review",
      );
    need(review.role.toLowerCase() === role, "CA_EVIDENCE_ROLE");
    add(review.report, ep + "/checker/" + role + ".md");
  }
  for (const [i, asset] of c.assets.entries())
    add(
      asset.coverageReport,
      ep + "/assets/old-" + String(i + 1).padStart(2, "0") + ".md",
    );
  for (const row of index.entries) {
    const lower = row.role.toLowerCase(),
      record = json(row.record, ep + "/roles/" + lower + ".json", "evidence");
    need(record.role === row.role, "CA_EVIDENCE_ROLE");
    validateSchema(record.role, record.details);
    add(record.report, ep + "/roles/" + lower + ".md");
    const d = record.details;
    if (row.role === "A18" && d.previous105Review)
      add(d.previous105Review, ep + "/a18/previous-105-review.md");
    if (row.role === "A24") {
      add(d.baselineInventory, ep + "/a24/baseline-inventory.json");
      add(d.currentInventory, ep + "/a24/current-inventory.json");
    }
    if (row.role === "A11")
      for (const [i, regression] of d.regressions.entries())
        add(
          regression.report,
          ep + "/a11/regression-" + String(i + 1).padStart(3, "0") + ".txt",
        );
    if (row.role === "A22") {
      add(d.attestation, ep + "/a22/build-attestation.json");
      if (d.buildLog) add(d.buildLog, ep + "/a22/build.log");
    }
  }
  const records = [...files.values()].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  unique(records.map((row) => row.path));
  return records;
}
export function validateEvidenceInventory(repo, m) {
  repo.ancestor(m.checkerReleaseCommit, m.evidenceCommit);
  const records = collectEvidenceArtifacts(repo, m),
    paths = records.map((row) => row.path);
  same(
    repo.changed(m.checkerReleaseCommit, m.evidenceCommit),
    paths,
    "CA_EVIDENCE_SCOPE",
  );
  for (const file of paths) {
    repo.absent(m.checkerReleaseCommit, file);
    const addition = repo.addition(file);
    repo.ancestor(m.checkerReleaseCommit, addition);
    repo.ancestor(addition, m.evidenceCommit);
  }
  const prefix = ROOT + "/attempts/" + m.attemptId;
  if (repo.head !== m.evidenceCommit) {
    same(repo.parents(repo.head), [m.evidenceCommit], "CA_EXECUTION_PARENT");
    same(
      repo.changed(m.evidenceCommit, repo.head),
      [prefix + "/manifest.json", prefix + "/successor.json"].sort(),
      "CA_EXECUTION_SCOPE",
    );
  }
  return records;
}
