import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validateAttempt } from "./contract.mjs";
import { Repository } from "./repository.mjs";
import { validateSchema } from "./schema.mjs";
import { ROOT, ZERO_EFFECTS, BUNDLE_PATHS } from "./constants.mjs";
import {
  digest,
  stable,
  hash,
  need,
  same,
  time,
  relative,
  unique,
} from "./common.mjs";
export const semantics = (r) => ({
  binding: r.binding,
  effects: r.effects,
  rehearsal: r.rehearsal,
  lifecycleState: r.lifecycleState,
  liveAllowed: r.liveAllowed,
});
export function sealReceipt(binding, runId, outputDigest) {
  const r = {
    schemaVersion: "ca-textbook-receipt.v1",
    mode: "shadow",
    result: "pass",
    runId,
    producedAt: new Date().toISOString(),
    binding: structuredClone(binding),
    effects: { ...ZERO_EFFECTS },
    rehearsal: { outputDigest, temporaryOnly: true, rollbackComplete: true },
    lifecycleState: "shadow_ready",
    liveAllowed: false,
  };
  r.semanticDigest = digest(semantics(r));
  r.rawDigest = digest(r);
  validateSchema("receipt", r);
  return r;
}
export function verifyReceiptRecord(receipt, binding) {
  validateSchema("receipt", receipt);
  time(receipt.producedAt);
  same(receipt.binding, binding, "CA_RECEIPT_BINDING");
  same(receipt.effects, ZERO_EFFECTS, "CA_SIDE_EFFECTS");
  const { rawDigest, ...raw } = receipt;
  need(
    digest(raw) === rawDigest &&
      digest(semantics(receipt)) === receipt.semanticDigest,
    "CA_RECEIPT_DIGEST",
  );
  return receipt;
}
export function compareReceipts(receipts, binding) {
  need(receipts.length === 3, "CA_RECEIPT_COVERAGE");
  for (const r of receipts) verifyReceiptRecord(r, binding);
  unique(receipts.map((r) => r.runId));
  same(
    receipts.map((r) => r.semanticDigest),
    Array(3).fill(receipts[0].semanticDigest),
    "CA_REPLAY_MISMATCH",
  );
  return {
    semanticDigest: receipts[0].semanticDigest,
    comparisonDigest: digest(
      receipts.map((r) => ({ runId: r.runId, rawDigest: r.rawDigest })),
    ),
    distinctExecutions: 3,
  };
}
export async function shadowAttempt(root, manifestPath, runId) {
  need(/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,95}$/u.test(runId), "CA_RUN_ID");
  const before = await validateAttempt(root, manifestPath),
    temporary = mkdtempSync(path.join(realpathSync("/tmp"), "CA-shadow-"));
  let outputDigest;
  try {
    need(!temporary.startsWith(root + "/"), "CA_TEMP");
    const output = Buffer.from(
      stable({
        candidateDigest: before.proof.candidateDigest,
        dispositionDigest: before.proof.dispositionDigest,
        lessonCount: 35,
        checkCount: 105,
        liveAllowed: false,
      }) + "\n",
    );
    writeFileSync(path.join(temporary, "projection.json"), output, {
      flag: "wx",
      mode: 0o600,
    });
    need(
      readFileSync(path.join(temporary, "projection.json")).equals(output),
      "CA_REHEARSAL",
    );
    outputDigest = hash(output);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  need(!existsSync(temporary), "CA_ROLLBACK");
  const after = await validateAttempt(root, manifestPath);
  same(after.proof, before.proof, "CA_SOURCE_MOVED");
  return sealReceipt(before.proof, runId, outputDigest);
}
export function readStoredReceipt(repo, m, proof, transport) {
  validateSchema("transport", transport);
  relative(transport.path);
  const prefix = path.posix.dirname(m.canonicalReceiptPath);
  need(
    transport.path === m.canonicalReceiptPath ||
      new RegExp(
        "^" +
          prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "/receipts/[a-zA-Z0-9_-]+[.]json$",
      ).test(transport.path),
    "CA_RECEIPT_PATH",
  );
  need(transport.storageCommit !== proof.executionCommit, "CA_RECEIPT_STORAGE");
  repo.ancestor(proof.executionCommit, transport.storageCommit);
  repo.absent(proof.executionCommit, transport.path);
  need(
    repo
      .changed(proof.executionCommit, transport.storageCommit)
      .every(
        (p) =>
          p === m.canonicalReceiptPath || p.startsWith(prefix + "/receipts/"),
      ),
    "CA_RECEIPT_STORAGE_DELTA",
  );
  const stored = repo.read(
    transport.storageCommit,
    { path: transport.path, sha256: transport.sha256 },
    false,
  );
  need(stored.mode === "100644", "CA_RECEIPT_MODE");
  const bytes = stored.bytes;
  const r = repo.json(
    transport.storageCommit,
    { path: transport.path, sha256: transport.sha256 },
    false,
  );
  verifyReceiptRecord(r, proof);
  need(
    time(r.producedAt) >= repo.time(proof.executionCommit) &&
      Math.floor(time(r.producedAt) / 1000) <=
        repo.time(transport.storageCommit) / 1000,
    "CA_RECEIPT_TIME",
  );
  return {
    receipt: r,
    bytes,
    binding: {
      path: stored.path,
      mode: stored.mode,
      objectId: stored.objectId,
      sha256: stored.sha256,
    },
  };
}
export async function verifyStoredReceipt(root, manifestPath, transport) {
  const validation = await validateAttempt(root, manifestPath),
    repo = new Repository(root),
    m = repo.json(repo.head, { path: manifestPath });
  const stored = readStoredReceipt(repo, m, validation.proof, transport);
  const replay = await shadowAttempt(
    root,
    manifestPath,
    "verify-" + randomUUID(),
  );
  need(
    replay.runId !== stored.receipt.runId &&
      replay.semanticDigest === stored.receipt.semanticDigest,
    "CA_REPLAY_MISMATCH",
  );
  return {
    schemaVersion: "ca-textbook-verification.v1",
    result: "pass",
    transport,
    binding: validation.proof,
    semanticDigest: stored.receipt.semanticDigest,
    replayRunId: replay.runId,
    liveAllowed: false,
  };
}
export function validateFinalizationProofs(repo, input, proof, receipts, m) {
  validateSchema("finalization", input);
  need(input.manifestPath === proof.manifest.path, "CA_FINAL_MANIFEST");
  need(
    input.releaseInventoryDigest === digest(input.releaseFiles),
    "CA_RELEASE_INVENTORY",
  );
  repo.ancestor(proof.executionCommit, input.releaseCommit);
  const prefix = path.posix.dirname(m.canonicalReceiptPath);
  need(input.releaseCommit !== proof.executionCommit, "CA_ACTIVATION_MISSING");
  const changed = repo.changed(proof.executionCommit, input.releaseCommit);
  const registeredReceipts = new Set(input.receipts.map((t) => t.path));
  const activationFiles = changed.filter((p) => !registeredReceipts.has(p));
  unique(input.releaseFiles.map((f) => f.path));
  same(
    input.releaseFiles.map((f) => f.path).sort(),
    activationFiles,
    "CA_FINAL_RELEASE_SCOPE",
  );
  for (const required of [
    "scripts/promotion-required-check-ca-textbook-successor.mjs",
    ".github/workflows/promotion-shadow.yml",
  ])
    need(activationFiles.includes(required), "CA_ACTIVATION_MISSING");
  for (const f of input.releaseFiles) {
    need(
      f.path.startsWith(ROOT + "/activation/") ||
        f.path ===
          "scripts/promotion-required-check-ca-textbook-successor.mjs" ||
        f.path === ".github/workflows/promotion-shadow.yml",
      "CA_FINAL_RELEASE_SCOPE",
    );
    repo.read(input.releaseCommit, f, false);
  }
  for (const file of BUNDLE_PATHS)
    need(
      repo.blob(input.releaseCommit, file).objectId ===
        repo.blob(proof.checkerReleaseCommit, file).objectId,
      "CA_FINAL_CODE_DRIFT",
    );
  const finalRefs = [...input.evidence, input.prProof, input.mainProof];
  unique(finalRefs.map((r) => r.path));
  for (const ref of finalRefs)
    need(
      ref.path.startsWith(prefix + "/finalization/"),
      "CA_FINAL_EVIDENCE_PATH",
    );
  repo.ancestor(input.releaseCommit, repo.head);
  const verified = [],
    hashes = input.receipts.map((t) => t.sha256);
  for (const ref of input.evidence) {
    const e = repo.json(repo.head, ref);
    validateSchema("finalization-evidence", e);
    need(
      e.executionCommit === proof.executionCommit &&
        e.releaseCommit === input.releaseCommit &&
        e.releaseInventoryDigest === input.releaseInventoryDigest,
      "CA_FINAL_EVIDENCE",
    );
    same(e.receiptHashes, hashes, "CA_FINAL_RECEIPTS");
    need(
      Math.floor(time(e.reviewedAt) / 1000) <= repo.time(repo.head) / 1000,
      "CA_FINAL_EVIDENCE_TIME",
    );
    need(
      e.report.path.startsWith(prefix + "/finalization/"),
      "CA_FINAL_EVIDENCE_PATH",
    );
    repo.read(repo.head, e.report);
    verified.push(e);
  }
  same(
    verified.map((e) => e.role).sort(),
    ["A11", "A22", "A23", "A25"],
    "CA_FINAL_ROLES",
  );
  unique(
    verified
      .filter((e) => ["A11", "A23"].includes(e.role))
      .map((e) => e.reviewer),
  );
  need(
    verified
      .filter((e) => ["A11", "A23"].includes(e.role))
      .every(
        (e) =>
          !m.sourceAuthors.includes(e.reviewer) &&
          !m.checkerAuthors.includes(e.reviewer),
      ),
    "CA_AUTHOR_REVIEW",
  );
  const pr = repo.json(repo.head, input.prProof),
    main = repo.json(repo.head, input.mainProof);
  for (const r of [pr, main]) {
    validateSchema("ci-proof", r);
    unique(r.checks.map((c) => c.name));
    same(
      r.checks.map((c) => c.name).sort(),
      [
        "snapshot",
        "validate",
        "postgres-integration",
        "visualization-browser",
        "teacher-notice-outbox-postgres16",
        "resend-webhook-postgres-integration",
        "teacher-parent-e2e",
        "promotion-shadow-gate",
      ].sort(),
      "CA_REQUIRED_CHECKS",
    );
    need(
      time(r.observedAt) >= repo.time(r.head) &&
        Math.floor(time(r.observedAt) / 1000) <= repo.time(repo.head) / 1000,
      "CA_CI_TIME",
    );
    need(
      r.checks.every((c) => c.head === r.head),
      "CA_CI_HEAD",
    );
  }
  need(
    pr.event === "pull_request" &&
      pr.pullRequestNumber === 304 &&
      pr.head === input.releaseCommit &&
      pr.base === proof.baseCommit,
    "CA_PR_BINDING",
  );
  need(
    main.event === "push" &&
      main.pullRequestNumber === null &&
      main.base === proof.baseCommit,
    "CA_MAIN_BINDING",
  );
  same(
    repo.parents(main.head),
    [proof.baseCommit, input.releaseCommit],
    "CA_MAIN_PARENTS",
  );
  need(repo.tree(main.head) === repo.tree(input.releaseCommit), "CA_MAIN_TREE");
  repo.ancestor(main.head, repo.head);
  const after = Math.max(
    repo.time(input.releaseCommit),
    repo.time(main.head),
    time(pr.observedAt),
    time(main.observedAt),
    ...input.receipts.map((t) => repo.time(t.storageCommit)),
  );
  for (const review of verified)
    need(time(review.reviewedAt) >= after, "CA_FINAL_EVIDENCE_TIME");
  verifyReceiptContinuity(repo, input, proof, receipts, m, main.head);
  const permitted = new Set([
    prefix + "/finalization-input.json",
    ...finalRefs.map((r) => r.path),
    ...verified.map((e) => e.report.path),
  ]);
  need(
    repo.changed(input.releaseCommit, repo.head).every((p) => permitted.has(p)),
    "CA_FINAL_STORAGE_DELTA",
  );
  for (const file of BUNDLE_PATHS)
    need(
      repo.blob(repo.head, file).objectId ===
        repo.blob(proof.checkerReleaseCommit, file).objectId,
      "CA_FINAL_CODE_DRIFT",
    );
  return { records: verified, mainCommit: main.head };
}
export function verifyReceiptContinuity(
  repo,
  input,
  proof,
  receipts,
  m,
  mainCommit,
) {
  need(
    input.receipts.length === 3 &&
      input.receipts[0].path === m.canonicalReceiptPath,
    "CA_CANONICAL_REQUIRED",
  );
  unique(input.receipts.map((t) => t.path));
  compareReceipts(receipts, proof);
  const prefix = path.posix.dirname(m.canonicalReceiptPath),
    paths = input.receipts.map((t) => t.path).sort(),
    commits = [input.releaseCommit, mainCommit, repo.head];
  for (const storage of new Set(input.receipts.map((t) => t.storageCommit))) {
    const found = repo
      .entries(storage)
      .map((row) => row.path)
      .filter(
        (file) =>
          file === m.canonicalReceiptPath ||
          file.startsWith(prefix + "/receipts/"),
      );
    need(
      found.every((file) => paths.includes(file)),
      "CA_RECEIPT_STORAGE_SCOPE",
    );
  }
  for (const ref of commits) {
    const actual = repo
      .entries(ref)
      .map((row) => row.path)
      .filter(
        (file) =>
          file === m.canonicalReceiptPath ||
          file.startsWith(prefix + "/receipts/"),
      )
      .sort();
    same(actual, paths, "CA_RECEIPT_TREE_SCOPE");
  }
  for (const [i, transport] of input.receipts.entries()) {
    const stored = readStoredReceipt(repo, m, proof, transport);
    same(stored.receipt, receipts[i], "CA_FINAL_RECEIPT_RECORD");
    for (const ref of commits) {
      repo.ancestor(transport.storageCommit, ref);
      const current = repo.read(ref, stored.binding, false);
      need(
        current.bytes.equals(stored.bytes) &&
          current.sha256 === transport.sha256 &&
          current.mode === stored.binding.mode &&
          current.objectId === stored.binding.objectId,
        "CA_RECEIPT_TREE_DRIFT",
      );
    }
  }
}
export async function finalizeFromTransport(root, manifestPath, transport) {
  validateSchema("transport", transport);
  const validation = await validateAttempt(root, manifestPath),
    executionRepo = new Repository(root),
    m = executionRepo.json(executionRepo.head, { path: manifestPath }),
    prefix = path.posix.dirname(manifestPath);
  need(
    transport.path === prefix + "/finalization-input.json" &&
      transport.storageCommit !== validation.proof.executionCommit,
    "CA_FINAL_PATH",
  );
  executionRepo.ancestor(
    validation.proof.executionCommit,
    transport.storageCommit,
  );
  const input = executionRepo.json(
    transport.storageCommit,
    { path: transport.path, sha256: transport.sha256 },
    false,
  );
  validateSchema("finalization", input);
  need(
    input.receipts[0].path === m.canonicalReceiptPath,
    "CA_CANONICAL_REQUIRED",
  );
  unique(input.receipts.map((t) => t.path));
  const receipts = [];
  for (const t of input.receipts) {
    executionRepo.ancestor(t.storageCommit, transport.storageCommit);
    receipts.push(
      readStoredReceipt(executionRepo, m, validation.proof, t).receipt,
    );
    await verifyStoredReceipt(root, manifestPath, t);
  }
  const comparison = compareReceipts(receipts, validation.proof);
  // Read finalization records only from the explicitly transported immutable commit.
  const bound = Object.create(executionRepo);
  bound.head = transport.storageCommit;
  bound.json = (ref, binding) => executionRepo.json(ref, binding, false);
  bound.read = (ref, binding) => executionRepo.read(ref, binding, false);
  const final = validateFinalizationProofs(
    bound,
    input,
    validation.proof,
    receipts,
    m,
  );
  const closure = {
    schemaVersion: "ca-textbook-closure.v1",
    binding: validation.proof,
    receipts: input.receipts,
    receiptHashes: input.receipts.map((t) => t.sha256),
    finalizationEvidenceDigest: digest({
      comparison,
      records: final.records,
      pr: input.prProof,
      main: input.mainProof,
    }),
    mainCommit: final.mainCommit,
    finalizationCommit: transport.storageCommit,
    sourceCurrent: true,
    lifecycleState: "shadow_passed",
    liveAllowed: false,
  };
  closure.closureDigest = digest(closure);
  validateSchema("closure", closure);
  executionRepo.clean();
  return sealFinalization(closure);
}
export function verifyClosureRecord(closure, expected) {
  validateSchema("closure", closure);
  const { closureDigest, ...body } = closure;
  need(digest(body) === closureDigest, "CA_CLOSURE_DIGEST");
  same(closure, expected, "CA_CLOSURE_FORGED");
  return true;
}
export function sealFinalization(closure) {
  validateSchema("closure", closure);
  const registration = {
    type: "registered",
    state: "shadow_ready",
    commit: closure.binding.executionCommit,
    previousEventDigest: null,
    bindingDigest: digest(closure.binding),
    closureDigest: null,
    liveAllowed: false,
  };
  registration.eventDigest = digest(registration);
  const completion = {
    type: "finalized",
    state: "shadow_passed",
    commit: closure.finalizationCommit,
    previousEventDigest: registration.eventDigest,
    bindingDigest: digest(closure.binding),
    closureDigest: closure.closureDigest,
    liveAllowed: false,
  };
  completion.eventDigest = digest(completion);
  const registry = {
    schemaVersion: "ca-textbook-lifecycle-registry.v1",
    binding: closure.binding,
    events: [registration, completion],
    state: "shadow_passed",
    closureDigest: closure.closureDigest,
    liveAllowed: false,
  };
  registry.registryDigest = digest(registry);
  const output = {
    schemaVersion: "ca-textbook-finalization-result.v1",
    result: "pass",
    closure,
    registry,
    lifecycleState: "shadow_passed",
    liveAllowed: false,
  };
  validateSchema("finalization-result", output);
  return output;
}
export function verifyFinalizationRecord(output, expected) {
  validateSchema("finalization-result", output);
  same(output, expected, "CA_FINALIZATION_FORGED");
  verifyClosureRecord(output.closure, expected.closure);
  const { registryDigest, ...registry } = output.registry;
  need(digest(registry) === registryDigest, "CA_REGISTRY_DIGEST");
  let previous = null;
  for (const event of output.registry.events) {
    const { eventDigest, ...body } = event;
    need(
      event.previousEventDigest === previous && digest(body) === eventDigest,
      "CA_EVENT_CHAIN",
    );
    previous = eventDigest;
  }
  same(output, sealFinalization(output.closure), "CA_LIFECYCLE_BINDING");
  return true;
}
