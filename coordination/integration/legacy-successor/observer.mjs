// Closed read-only worker. Its parent supplies a Git-object snapshot and a
// minimal environment; the app, candidates and providers are never executed.
import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { fingerprint, sha256, stableJson, readAuthoritativeFile, observeCanonicalRuntimePolicy } from "../promotion-gate-lib.mjs";
import { collectV2RuntimeAndLegacyProof } from "../v2/promotion-gate-v2-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "../../../scripts/promotion-workflow-json-guard.mjs";

const [root, inputPath] = process.argv.slice(2);
try {
  if (!path.isAbsolute(root ?? "") || inputPath !== path.join(root, "observer-input.json")) throw new Error("SUCCESSOR_OBSERVER_ARGUMENT_INVALID");
  const config = parsePromotionWorkflowJsonBytes(await readFile(inputPath));
  const verify = async () => {
    const rows = [];
    for (const record of config.records) {
      const file = await readAuthoritativeFile(root, record.path);
      const mode = ((await lstat(path.join(root, record.path))).mode & 0o111) ? "100755" : "100644";
      if (sha256(file.bytes) !== record.rawSha256 || mode !== record.mode) throw new Error("SUCCESSOR_SEALED_INPUT_DRIFT");
      rows.push([record.path, record.mode, record.rawSha256]);
    }
    return fingerprint(rows);
  };
  const before = await verify();
  // Parse exactly the JSON consumers of the frozen observer. Unused audit
  // reports and opaque runtime data remain byte/mode authenticated, not parsed.
  const strict = async file => parsePromotionWorkflowJsonBytes((await readAuthoritativeFile(root, file)).bytes);
  // Resolver configs are JSONC, authenticated by raw bytes and parsed by the
  // release-bound TypeScript resolver observer, not by a JSON decoder.
  const compatibility = await strict(config.observerManifest.liveReachability.compatibilityManifestPath);
  const registry = await strict(config.observerManifest.legacyResolution.registryPath);
  const canonicalNames = new Set(["candidate-package.json", "lessons.json", "package.json", "question-pack.json", "safe-card-drafts.json", "s04-practice-question-briefs.json", "s04-question-candidate-pack.json", "s04-representative-practice-candidates.json", "s05-lesson-candidate-pack.json", "s05-representative-lesson-candidates.json", "s05-textbook-lesson-briefs.json", "textbook-pack.json"]);
  const excludedSegments = new Set(["batches", "repair-batches", "repair_batches", "deepseek-v4-pro-full-rag-qa"]);
  const semanticPaths = new Set();
  for (const {path: file} of config.records) {
    const segments = file.split("/");
    if ((file.startsWith("coordination/content-qa/") || file.startsWith("data/generated-content/") || file.startsWith("data/rag/")) && canonicalNames.has(segments.at(-1)) && !segments.some(x => excludedSegments.has(x))) semanticPaths.add(file);
    if (file.startsWith("public/") && file.endsWith(".json")) semanticPaths.add(file);
  }
  for (const row of registry.resolutions) {
    semanticPaths.add(row.candidate.path);
    if (row.liveProjection) semanticPaths.add(row.liveProjection.path);
  }
  for (const file of [...semanticPaths].sort()) await strict(file);
  const observation = await observeCanonicalRuntimePolicy(root, compatibility);
  for (const file of observation.graph.reachablePaths) if (file.endsWith(".json")) await strict(file);
  const runtime = await collectV2RuntimeAndLegacyProof(root, config.observerManifest, config.executionCommit);
  if (await verify() !== before) throw new Error("SUCCESSOR_SEALED_INPUT_DRIFT");
  process.stdout.write(`${JSON.stringify({ result: "pass", proof: runtime.proof, sourceSnapshotDigest: before, liveAllowed: false })}\n`);
} catch (error) {
  const code = /^[A-Z][A-Z0-9_]{2,95}$/u.test(error.code ?? error.message ?? "") ? error.code ?? error.message : "SUCCESSOR_OBSERVER_INTERNAL";
  process.stdout.write(`${JSON.stringify({ result: "blocked", code, liveAllowed: false })}\n`); process.exitCode = 2;
}
