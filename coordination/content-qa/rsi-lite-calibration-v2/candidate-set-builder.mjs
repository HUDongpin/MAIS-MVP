import { createHash, randomUUID } from "node:crypto";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  auditCalibrationDesign,
  auditCandidateContent,
  buildCalibrationDesign
} from "../rsi-lite-calibration-v1/calibration-design.mjs";
import {
  ARMS,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  ROLE_CALLS_PER_RUN,
  SOURCE_BASELINE
} from "./protocol-design.mjs";

const FAMILY_ACCEPTED_CODE = Object.freeze({
  F1: "ANSWER_INDEPENDENT_MISMATCH",
  F2: "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS",
  F3: "EXPLANATION_STEP_MISMATCH",
  F4: "ACCEPTED_ANSWER_FALSE_REJECT",
  F5: "EVIDENCE_LABEL_MISMATCH",
  F6: "LANGUAGE_SEMANTIC_MISMATCH",
  F7: "CURRICULUM_GRADE_PUBLISHER_MISMATCH",
  F8: "TEMPLATE_IDENTITY_LEAKAGE",
  F9: "ORACLE_PROVENANCE_CONTAMINATION"
});

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalSha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableStringify(value))
    .digest("hex");
}

function deterministicShuffle(values, seed, label) {
  return [...values].sort((left, right) => (
    canonicalSha256(`${seed}|${label}|${stableStringify(left)}`)
      .localeCompare(canonicalSha256(`${seed}|${label}|${stableStringify(right)}`))
  ));
}

function v2PackageId(masterSeed, bundleId, variantId) {
  return `pkgv2-${canonicalSha256(`${masterSeed}|${bundleId}|${variantId}`).slice(0, 20)}`;
}

function v2LatentDefectId(masterSeed, bundleId, family) {
  return `ldv2-${canonicalSha256(`${masterSeed}|${bundleId}|${family}`).slice(0, 20)}`;
}

function v2DefectInstanceId(masterSeed, latentDefectId, packageId) {
  return `div2-${canonicalSha256(`${masterSeed}|${latentDefectId}|${packageId}`).slice(0, 20)}`;
}

function sourceWave(masterSeed, waveIndex, itemsPerPackage) {
  const waveSeed = canonicalSha256(`${masterSeed}|v1-synthetic-kernel-wave-${waveIndex + 1}`);
  const design = buildCalibrationDesign({ seed: waveSeed, itemsPerPackage });
  const audit = auditCalibrationDesign(design);
  if (audit.length > 0) throw new Error(`Source compiler wave ${waveIndex + 1} failed its frozen audit: ${audit.map((row) => row.code).join(",")}`);
  return { waveIndex, waveSeedCommitmentSha256: canonicalSha256(waveSeed), design };
}

function v2Content(sourceContent, packageId) {
  return {
    ...structuredClone(sourceContent),
    packageId,
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    executionStatus: "frozen-not-yet-authorized"
  };
}

export function buildV2CandidateSet({ masterSeed, itemsPerPackage = 100 }) {
  if (typeof masterSeed !== "string" || masterSeed.length < 32) throw new Error("V2 master seed must contain at least 32 characters.");
  if (!Number.isSafeInteger(itemsPerPackage) || itemsPerPackage < 80 || itemsPerPackage > 120) throw new Error("itemsPerPackage must be from 80 through 120.");
  const waves = [0, 1].map((waveIndex) => sourceWave(masterSeed, waveIndex, itemsPerPackage));
  const latentBundles = [];
  const packageAssignments = [];
  const packages = [];
  const latentDefects = [];
  const instances = [];

  for (const wave of waves) {
    const { design } = wave;
    for (const sourceBundle of design.sealedManifest.latentBundles) {
      const bundleId = `${sourceBundle.region}-W${wave.waveIndex + 1}-${sourceBundle.stratumId}`;
      latentBundles.push({
        ...structuredClone(sourceBundle),
        id: bundleId,
        sourceWave: wave.waveIndex + 1,
        sourceBundleId: sourceBundle.id,
        matchedVersionCount: 3
      });
      const sourceAssignments = design.sealedManifest.packageAssignments.filter((row) => row.latentBundleId === sourceBundle.id);
      const selectedVariants = deterministicShuffle(
        sourceAssignments.map((row) => row.variantId),
        masterSeed,
        `${bundleId}|selected-variants`
      ).slice(0, 3);
      const armOrder = deterministicShuffle(ARMS, masterSeed, `${bundleId}|arm-order`);
      const packageMappings = [];
      selectedVariants.forEach((variantId, index) => {
        const sourceAssignment = sourceAssignments.find((row) => row.variantId === variantId);
        const sourcePackage = design.packages.find((row) => row.packageId === sourceAssignment.packageId);
        const arm = armOrder[index];
        const packageId = v2PackageId(masterSeed, bundleId, variantId);
        const content = v2Content(sourcePackage.content, packageId);
        const contentSha256 = canonicalSha256(content);
        packageAssignments.push({
          packageId,
          latentBundleId: bundleId,
          region: sourceBundle.region,
          stratumId: sourceBundle.stratumId,
          variantId,
          arm,
          providerCalls: ROLE_CALLS_PER_RUN[arm],
          status: sourceBundle.status,
          defectBlock: sourceBundle.defectBlock,
          publisher: sourceBundle.publisher,
          sourceWave: wave.waveIndex + 1,
          sourcePackageId: sourcePackage.packageId,
          contentSha256
        });
        packages.push({ packageId, content, contentSha256 });
        packageMappings.push({ sourcePackageId: sourcePackage.packageId, packageId, arm, variantId });
      });

      const sourceDefects = design.goldLedger.latentDefects.filter((row) => row.latentBundleId === sourceBundle.id);
      for (const sourceDefect of sourceDefects) {
        const latentDefectId = v2LatentDefectId(masterSeed, bundleId, sourceDefect.family);
        latentDefects.push({
          ...structuredClone(sourceDefect),
          id: latentDefectId,
          latentBundleId: bundleId,
          sourceWave: wave.waveIndex + 1,
          sourceLatentDefectId: sourceDefect.id,
          acceptedCodes: [FAMILY_ACCEPTED_CODE[sourceDefect.family]]
        });
        for (const mapping of packageMappings) {
          const sourceInstance = design.goldLedger.instances.find((row) => (
            row.latentDefectId === sourceDefect.id && row.packageId === mapping.sourcePackageId
          ));
          if (!sourceInstance) throw new Error(`Missing source defect instance for ${sourceDefect.id}:${mapping.sourcePackageId}.`);
          instances.push({
            ...structuredClone(sourceInstance),
            id: v2DefectInstanceId(masterSeed, latentDefectId, mapping.packageId),
            latentDefectId,
            packageId: mapping.packageId,
            arm: mapping.arm,
            variantId: mapping.variantId,
            sourceWave: wave.waveIndex + 1,
            sourceInstanceId: sourceInstance.id,
            acceptedCodes: [FAMILY_ACCEPTED_CODE[sourceInstance.family]]
          });
        }
      }
    }
  }

  packages.sort((left, right) => left.packageId.localeCompare(right.packageId));
  packageAssignments.sort((left, right) => left.packageId.localeCompare(right.packageId));
  latentBundles.sort((left, right) => left.id.localeCompare(right.id));
  latentDefects.sort((left, right) => left.id.localeCompare(right.id));
  instances.sort((left, right) => left.id.localeCompare(right.id));
  const candidateRows = packages.map((row) => ({ packageId: row.packageId, contentSha256: row.contentSha256 }));
  const candidateSetSha256 = canonicalSha256(candidateRows);
  const seedCommitmentSha256 = canonicalSha256(masterSeed);
  const counts = {
    independentClusters: latentBundles.length,
    packages: packages.length,
    questions: packages.reduce((sum, row) => sum + row.content.questions.length, 0),
    lessons: packages.reduce((sum, row) => sum + row.content.lessons.length, 0),
    browserRoutes: 0,
    coreSuccessfulProviderCalls: packageAssignments.reduce((sum, row) => sum + row.providerCalls, 0)
  };
  const publicManifest = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "candidate-only-frozen",
    executionStatus: "not-yet-bound-to-formal-authorization",
    estimandScope: "content-surfaces-only",
    sourceEvidencePolicy: "generated-original-synthetic-no-protected-source-wording",
    seedCommitmentSha256,
    candidateSetSha256,
    counts,
    packages: packages.map((row) => ({
      packageId: row.packageId,
      contentSha256: row.contentSha256,
      questionCount: row.content.questions.length,
      lessonCount: row.content.lessons.length,
      browserRouteCount: 0,
      status: "candidate-only"
    }))
  };
  const sealedManifest = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "sealed-controller-only",
    seedCommitmentSha256,
    candidateSetSha256,
    itemsPerPackage,
    sourceCompiler: {
      kernelProtocolId: "MAIS-RSI-LITE-CAL-V1",
      kernelProtocolVersion: "1.1.1-f2-r",
      waves: waves.map((wave) => ({
        wave: wave.waveIndex + 1,
        seedCommitmentSha256: wave.waveSeedCommitmentSha256,
        sourceCandidateSetSha256: wave.design.candidateSetSha256
      }))
    },
    latentBundles,
    packageAssignments
  };
  const goldLedger = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "sealed-synthetic-induced-gold-not-independent-natural-labels",
    seedCommitmentSha256,
    candidateSetSha256,
    latentDefects,
    instances
  };
  return {
    seedCommitmentSha256,
    candidateSetSha256,
    publicManifest,
    sealedManifest,
    goldLedger,
    packages
  };
}

export function auditV2CandidateSet(candidate) {
  const issues = [];
  const push = (code, detail) => issues.push({ code, detail });
  if (!candidate || typeof candidate !== "object") return [{ code: "candidate-shape", detail: "Candidate set must be an object." }];
  const { publicManifest, sealedManifest, goldLedger, packages } = candidate;
  if (publicManifest?.protocolId !== PROTOCOL_ID || publicManifest?.protocolVersion !== PROTOCOL_VERSION) push("protocol-binding", "Public protocol binding drifted.");
  if (!Array.isArray(sealedManifest?.latentBundles) || sealedManifest.latentBundles.length !== 24) push("bundle-count", "Expected 24 latent bundles.");
  if (!Array.isArray(sealedManifest?.packageAssignments) || sealedManifest.packageAssignments.length !== 72) push("assignment-count", "Expected 72 package assignments.");
  if (!Array.isArray(packages) || packages.length !== 72) push("package-count", "Expected 72 packages.");
  for (const region of ["CA", "HK", "MAINLAND"]) {
    if (sealedManifest?.latentBundles?.filter((row) => row.region === region).length !== 8) push("region-balance", `Expected eight ${region} bundles.`);
  }
  for (const arm of ARMS) {
    if (sealedManifest?.packageAssignments?.filter((row) => row.arm === arm).length !== 24) push("arm-balance", `Expected 24 ${arm} assignments.`);
  }
  if (sealedManifest?.packageAssignments?.some((row) => !ARMS.includes(row.arm))) push("unknown-arm", "Candidate contains a removed or unknown arm.");
  if (sealedManifest?.packageAssignments?.reduce((sum, row) => sum + row.providerCalls, 0) !== 168) push("core-call-count", "Expected 168 core provider calls.");
  for (const bundle of sealedManifest?.latentBundles ?? []) {
    const assignments = sealedManifest.packageAssignments.filter((row) => row.latentBundleId === bundle.id);
    if (assignments.length !== 3 || new Set(assignments.map((row) => row.arm)).size !== 3 || new Set(assignments.map((row) => row.variantId)).size !== 3) {
      push("triplet-topology", bundle.id);
      continue;
    }
    const rows = assignments.map((assignment) => packages.find((row) => row.packageId === assignment.packageId));
    if (rows.some((row) => !row)) {
      push("triplet-package", bundle.id);
      continue;
    }
    for (let index = 0; index < sealedManifest.itemsPerPackage; index += 1) {
      const contracts = rows.map((row) => stableStringify(row.content.questions[index]?.homologyContract));
      if (new Set(contracts).size !== 1) push("homology-drift", `${bundle.id}:${index}`);
    }
  }
  const allSurfaceIds = new Set();
  for (const row of packages ?? []) {
    if (row.content?.protocolId !== PROTOCOL_ID || row.content?.protocolVersion !== PROTOCOL_VERSION || row.content?.packageId !== row.packageId) push("content-binding", row.packageId);
    if (canonicalSha256(row.content) !== row.contentSha256) push("content-hash", row.packageId);
    const assignment = sealedManifest.packageAssignments.find((candidateRow) => candidateRow.packageId === row.packageId);
    if (!assignment || assignment.contentSha256 !== row.contentSha256) push("assignment-content-hash", row.packageId);
    const expectedFamilies = goldLedger.instances.filter((instance) => instance.packageId === row.packageId).map((instance) => instance.family).sort();
    const observed = auditCandidateContent(row.content);
    const observedFamilies = observed.filter((finding) => finding.family !== "NATURAL").map((finding) => finding.family).sort();
    const natural = observed.filter((finding) => finding.family === "NATURAL");
    if (natural.length > 0) push("natural-content-defect", `${row.packageId}:${natural.map((finding) => finding.code).join(",")}`);
    if (stableStringify(expectedFamilies) !== stableStringify(observedFamilies)) push("defect-observability", row.packageId);
    for (const question of row.content.questions ?? []) {
      if (allSurfaceIds.has(question.id)) push("duplicate-surface-id", question.id);
      allSurfaceIds.add(question.id);
      if (!new Set(["multiple-choice", "fill-in", "short-answer"]).has(question.type)) push("question-type", question.id);
      if (question.type === "multiple-choice" && (!Array.isArray(question.options) || question.options.length < 2)) push("multiple-choice-options", question.id);
      if (question.type !== "multiple-choice" && question.options !== undefined) push("non-multiple-choice-options", question.id);
    }
  }
  if (!Array.isArray(goldLedger?.latentDefects) || goldLedger.latentDefects.length !== 108) push("latent-defect-count", "Expected 108 latent defects.");
  if (!Array.isArray(goldLedger?.instances) || goldLedger.instances.length !== 324) push("defect-instance-count", "Expected 324 defect instances.");
  for (const [latentDefectId, defectInstances] of Map.groupBy(goldLedger?.instances ?? [], (row) => row.latentDefectId)) {
    if (defectInstances.length !== 3 || new Set(defectInstances.map((row) => row.arm)).size !== 3) push("matched-defect", latentDefectId);
    if (defectInstances.some((row) => row.acceptedCodes?.[0] !== FAMILY_ACCEPTED_CODE[row.family])) push("accepted-code", latentDefectId);
  }
  const candidateRows = (packages ?? []).map((row) => ({ packageId: row.packageId, contentSha256: row.contentSha256 })).sort((left, right) => left.packageId.localeCompare(right.packageId));
  if (candidate.candidateSetSha256 !== canonicalSha256(candidateRows) || publicManifest?.candidateSetSha256 !== candidate.candidateSetSha256 || sealedManifest?.candidateSetSha256 !== candidate.candidateSetSha256 || goldLedger?.candidateSetSha256 !== candidate.candidateSetSha256) {
    push("candidate-set-hash", "Candidate-set commitment drifted.");
  }
  return issues;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function writeProtectedJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(filePath, 0o600);
}

async function verifyStoredCandidate(candidate, outputRoot) {
  const receiptPath = path.join(outputRoot, "BUNDLE-READINESS.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const { receiptSha256, ...body } = receipt;
  if (receiptSha256 !== canonicalSha256(body)) throw new Error("Stored bundle-readiness receipt self-hash is invalid.");
  if (receipt.candidateSetSha256 !== candidate.candidateSetSha256 || receipt.packageFileCount !== candidate.packages.length) throw new Error("Stored candidate set conflicts with the requested freeze.");
  const publicManifest = JSON.parse(await readFile(path.join(outputRoot, "public-manifest.json"), "utf8"));
  const sealedManifest = JSON.parse(await readFile(path.join(outputRoot, "sealed-manifest.json"), "utf8"));
  const goldLedger = JSON.parse(await readFile(path.join(outputRoot, "gold-ledger.json"), "utf8"));
  if (canonicalSha256(publicManifest) !== receipt.publicManifestSha256 || canonicalSha256(sealedManifest) !== receipt.sealedManifestSha256 || canonicalSha256(goldLedger) !== receipt.goldLedgerSha256) throw new Error("Stored candidate manifests drifted from readiness receipt.");
  for (const row of candidate.packages) {
    const stored = JSON.parse(await readFile(path.join(outputRoot, "packages", `${row.packageId}.json`), "utf8"));
    if (canonicalSha256(stored) !== row.contentSha256) throw new Error(`Stored package drifted: ${row.packageId}`);
  }
  return receipt;
}

export async function writeFrozenV2CandidateSet({ candidate, outputRoot }) {
  if (!path.isAbsolute(outputRoot)) throw new Error("Frozen candidate output root must be absolute.");
  const audit = auditV2CandidateSet(candidate);
  if (audit.length > 0) throw new Error(`Candidate set failed readiness audit: ${audit.map((row) => row.code).join(",")}`);
  if (await exists(outputRoot)) return verifyStoredCandidate(candidate, outputRoot);
  const parent = path.dirname(outputRoot);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  await chmod(parent, 0o700);
  const stagingRoot = await mkdtemp(path.join(parent, `.${path.basename(outputRoot)}.staging-`));
  await chmod(stagingRoot, 0o700);
  try {
    const packageRoot = path.join(stagingRoot, "packages");
    await mkdir(packageRoot, { mode: 0o700 });
    await chmod(packageRoot, 0o700);
    await writeProtectedJson(path.join(stagingRoot, "public-manifest.json"), candidate.publicManifest);
    await writeProtectedJson(path.join(stagingRoot, "sealed-manifest.json"), candidate.sealedManifest);
    await writeProtectedJson(path.join(stagingRoot, "gold-ledger.json"), candidate.goldLedger);
    for (const row of candidate.packages) {
      await writeProtectedJson(path.join(packageRoot, `${row.packageId}.json`), row.content);
    }
    const body = {
      receiptType: "MAIS_RSI_LITE_V2_BUNDLE_READINESS",
      protocolId: PROTOCOL_ID,
      protocolVersion: PROTOCOL_VERSION,
      sourceBaseline: SOURCE_BASELINE,
      status: "candidate-only-bundles-frozen-offline-ready",
      candidateSetSha256: candidate.candidateSetSha256,
      seedCommitmentSha256: candidate.seedCommitmentSha256,
      publicManifestSha256: canonicalSha256(candidate.publicManifest),
      sealedManifestSha256: canonicalSha256(candidate.sealedManifest),
      goldLedgerSha256: canonicalSha256(candidate.goldLedger),
      packageFileCount: candidate.packages.length,
      questionCount: candidate.publicManifest.counts.questions,
      lessonCount: candidate.publicManifest.counts.lessons,
      latentBundleCount: candidate.sealedManifest.latentBundles.length,
      matchedTripletCount: candidate.sealedManifest.latentBundles.length,
      coreSuccessfulProviderCalls: 168,
      auditIssueCount: 0,
      sourceEvidencePolicy: candidate.publicManifest.sourceEvidencePolicy,
      formalExecutionAuthorized: false,
      liveProviderAuthorized: false,
      productionAuthorized: false,
      deploymentAuthorized: false,
      gitCommitAuthorized: false,
      gitPushAuthorized: false,
      writerNonce: randomUUID()
    };
    const receipt = { ...body, receiptSha256: canonicalSha256(body) };
    await writeProtectedJson(path.join(stagingRoot, "BUNDLE-READINESS.json"), receipt);
    await rename(stagingRoot, outputRoot);
    await chmod(outputRoot, 0o700);
    return verifyStoredCandidate(candidate, outputRoot);
  } catch (error) {
    if (await exists(stagingRoot)) await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}
