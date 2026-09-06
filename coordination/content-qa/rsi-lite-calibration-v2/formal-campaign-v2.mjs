import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { ARMS, PROTOCOL_ID, PROTOCOL_VERSION, ROLE_CALLS_PER_RUN, SOURCE_BASELINE } from "./protocol-design.mjs";
import { runPackageRepeatV2, runPackageV2 } from "./formal-runner-v2.mjs";
import { validateCoreReceiptV2, validateRepeatReceiptV2, validateOfflineEvidenceV2 } from "./scoring.mjs";

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
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

function repeatRows(sealedManifest, candidateSetSha256) {
  const rows = [];
  for (const region of ["CA", "HK", "MAINLAND"]) {
    const bundleIds = [...new Set(sealedManifest.packageAssignments
      .filter((row) => row.region === region && row.status === "defect-bearing")
      .map((row) => row.latentBundleId))]
      .sort((left, right) => canonicalSha256(`${candidateSetSha256}|${region}|${left}`)
        .localeCompare(canonicalSha256(`${candidateSetSha256}|${region}|${right}`)));
    if (bundleIds.length === 0) throw new Error(`No defect-bearing bundle is available for repeat selection in ${region}.`);
    const latentBundleId = bundleIds[0];
    for (const arm of ["B_PRIME", "C0_PRIME"]) {
      const assignment = sealedManifest.packageAssignments.find((row) => row.region === region && row.latentBundleId === latentBundleId && row.arm === arm);
      if (!assignment) throw new Error(`Repeat selection is missing ${region} ${arm}.`);
      rows.push({
        repeatGroupId: `repeat-v2-${canonicalSha256(`${candidateSetSha256}|${assignment.packageId}|${arm}`).slice(0, 20)}`,
        originalPackageId: assignment.packageId,
        latentBundleId,
        region,
        arm,
        providerCalls: ROLE_CALLS_PER_RUN[arm],
        repeatIndex: 1,
        selectionTiming: "precommitted-before-core-provider-results",
        sameFrozenProjectionRequired: true,
        sameRequestParametersRequired: true,
        distinctProviderResponseRequired: true
      });
    }
  }
  return rows.sort((left, right) => left.repeatGroupId.localeCompare(right.repeatGroupId));
}

export function buildRepeatPlanV2({ sealedManifest, candidateSetSha256 }) {
  if (!sealedManifest || typeof sealedManifest !== "object" || !Array.isArray(sealedManifest.packageAssignments)) throw new Error("Sealed manifest package assignments are required.");
  if (!isSha256(candidateSetSha256) || sealedManifest.candidateSetSha256 !== candidateSetSha256) throw new Error("Repeat plan candidate-set binding is invalid.");
  const packageRepeats = repeatRows(sealedManifest, candidateSetSha256);
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    candidateSetSha256,
    status: "repeat-plan-precommitted-before-provider-results",
    selectionAlgorithm: "sha256-ranked-first-defect-bearing-bundle-per-region-v1",
    packageRepeats,
    successfulProviderCalls: packageRepeats.reduce((sum, row) => sum + row.providerCalls, 0),
    includedInCoreEstimand: false
  };
  return { ...body, repeatPlanSha256: canonicalSha256(body) };
}

export function validateRepeatPlanV2(repeatPlan, sealedManifest, candidateSetSha256) {
  const issues = [];
  const push = (code, detail) => issues.push({ code, detail });
  if (!repeatPlan || typeof repeatPlan !== "object") return [{ code: "repeat-plan-shape", detail: "Repeat plan must be an object." }];
  const { repeatPlanSha256, ...body } = repeatPlan;
  if (repeatPlanSha256 !== canonicalSha256(body)) push("repeat-plan-hash", "Repeat plan self-hash drifted.");
  if (repeatPlan.protocolId !== PROTOCOL_ID || repeatPlan.protocolVersion !== PROTOCOL_VERSION || repeatPlan.candidateSetSha256 !== candidateSetSha256) push("repeat-plan-binding", "Repeat plan protocol or candidate binding drifted.");
  const expected = repeatRows(sealedManifest, candidateSetSha256);
  if (canonicalSha256(repeatPlan.packageRepeats) !== canonicalSha256(expected)) push("repeat-selection-drift", "Repeat package selection drifted from the precommitted algorithm.");
  if (repeatPlan.packageRepeats?.length !== 6 || repeatPlan.successfulProviderCalls !== 21) push("repeat-denominator", "Repeat plan must contain six packages and 21 successful provider calls.");
  return issues;
}

export function buildCorePlanV2({ sealedManifest, candidateSetSha256, authorizationBinding, repeatPlan }) {
  const repeatIssues = validateRepeatPlanV2(repeatPlan, sealedManifest, candidateSetSha256);
  if (repeatIssues.length > 0) throw new Error(`Repeat plan is invalid (${repeatIssues.map((row) => row.code).join(",")}).`);
  if (!authorizationBinding || typeof authorizationBinding !== "object") throw new Error("Core plan authorization binding is required.");
  const repeatByPackage = new Map(repeatPlan.packageRepeats.map((row) => [row.originalPackageId, row]));
  return sealedManifest.packageAssignments.map((row) => ({
    ...structuredClone(row),
    candidateSetSha256,
    authorizationBinding: structuredClone(authorizationBinding),
    repeatGroupId: repeatByPackage.get(row.packageId)?.repeatGroupId ?? null
  })).sort((left, right) => left.packageId.localeCompare(right.packageId));
}

export function validateCorePlanV2(plan) {
  if (!Array.isArray(plan) || plan.length !== 72) throw new Error("V2 core plan requires exactly 72 package rows.");
  const ids = plan.map((row) => row?.packageId);
  if (ids.some((id) => typeof id !== "string" || id === "") || new Set(ids).size !== 72) throw new Error("V2 core plan package IDs are invalid or duplicated.");
  const counts = Object.fromEntries(ARMS.map((arm) => [arm, plan.filter((row) => row.arm === arm).length]));
  if (ARMS.some((arm) => counts[arm] !== 24)) throw new Error(`V2 core plan must contain 24 packages per arm: ${JSON.stringify(counts)}.`);
  if (plan.reduce((sum, row) => sum + ROLE_CALLS_PER_RUN[row.arm], 0) !== 168) throw new Error("V2 core plan must require exactly 168 successful provider calls.");
  for (const row of plan) {
    if (!isSha256(row.contentSha256) || !isSha256(row.candidateSetSha256)) throw new Error(`V2 core plan hashes are invalid for ${row.packageId}.`);
    if (!row.authorizationBinding || typeof row.authorizationBinding !== "object") throw new Error(`V2 authorization binding is absent for ${row.packageId}.`);
    if (row.repeatGroupId !== null && (typeof row.repeatGroupId !== "string" || row.repeatGroupId === "")) throw new Error(`V2 repeat group is invalid for ${row.packageId}.`);
  }
  if (plan.filter((row) => row.repeatGroupId !== null).length !== 6) throw new Error("V2 core plan must prebind exactly six repeat packages.");
  return counts;
}

export function sumReceiptUsageV2(receipts) {
  const totals = {
    providerCalls: 0,
    providerAttempts: 0,
    failedProviderAttempts: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    apiCostUsd: 0,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0,
    liveLatencyMilliseconds: 0,
    browserLaunches: 0,
    childProcesses: 0
  };
  for (const receipt of receipts) {
    const usage = receipt?.resourceUsage ?? {};
    totals.providerCalls += usage.providerCalls ?? 0;
    totals.providerAttempts += usage.providerAttempts ?? usage.providerCalls ?? 0;
    totals.failedProviderAttempts += usage.failedProviderAttempts ?? 0;
    totals.promptCacheHitTokens += usage.promptCacheHitTokens ?? 0;
    totals.promptCacheMissTokens += usage.promptCacheMissTokens ?? 0;
    totals.outputTokens += usage.outputTokens ?? 0;
    totals.apiCostUsd = Number((totals.apiCostUsd + (usage.apiCostUsd ?? 0)).toFixed(9));
    totals.conservativeFailureDebitTokens += usage.conservativeFailureDebitTokens ?? 0;
    totals.conservativeFailureDebitUsd = Number((totals.conservativeFailureDebitUsd + (usage.conservativeFailureDebitUsd ?? 0)).toFixed(9));
    totals.liveLatencyMilliseconds += usage.liveLatencyMilliseconds ?? 0;
    totals.browserLaunches += usage.browserLaunches ?? 0;
    totals.childProcesses += usage.childProcesses ?? 0;
  }
  totals.totalTokens = totals.promptCacheHitTokens + totals.promptCacheMissTokens + totals.outputTokens;
  return totals;
}

function expectedMatches(receipt, expected) {
  return Object.entries(expected).every(([key, value]) => (
    key === "authorizationBinding"
      ? canonicalSha256(receipt.authorizationBinding) === canonicalSha256(value)
      : receipt[key] === value
  ));
}

async function protectedJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(filePath, 0o600);
}

export async function readCommittedRunV2({ collectionRoot, expected, expectedPackage, originalReceipt }) {
  if (!path.isAbsolute(collectionRoot)) throw new Error("Committed-run collection root must be absolute.");
  const runDirectory = path.join(collectionRoot, expected.runId);
  if (!(await exists(runDirectory))) return null;
  let marker;
  let receipt;
  try {
    marker = JSON.parse(await readFile(path.join(runDirectory, "COMMITTED.json"), "utf8"));
    receipt = JSON.parse(await readFile(path.join(runDirectory, "receipt.json"), "utf8"));
  } catch {
    throw new Error(`Committed V2 run is partial or unreadable: ${expected.runId}.`);
  }
  const { markerSha256, ...markerBody } = marker;
  const { receiptSha256, ...receiptBody } = receipt;
  if (
    markerSha256 !== canonicalSha256(markerBody)
    || receiptSha256 !== canonicalSha256(receiptBody)
    || marker.receiptSha256 !== receiptSha256
    || marker.receiptFileCanonicalSha256 !== canonicalSha256(receipt)
    || marker.authorizationBindingSha256 !== canonicalSha256(receipt.authorizationBinding)
    || !expectedMatches(receipt, expected)
  ) throw new Error(`Committed V2 run failed resume verification: ${expected.runId}.`);
  validateOfflineEvidenceV2(receipt);
  if (receipt.runKind === "core") validateCoreReceiptV2(receipt, expectedPackage);
  else if (receipt.runKind === "repeat") validateRepeatReceiptV2(receipt, originalReceipt, expectedPackage);
  else throw new Error("Unsupported offline receipt run kind.");
  return { runDirectory, receipt };
}

export async function writeCommittedRunV2({ collectionRoot, receipt, expectedPackage, originalReceipt }) {
  if (!path.isAbsolute(collectionRoot)) throw new Error("Committed-run collection root must be absolute.");
  if (!receipt || typeof receipt !== "object" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,180}$/.test(receipt.runId ?? "")) throw new Error("V2 receipt has no safe run ID.");
  const { receiptSha256, ...body } = receipt;
  if (receiptSha256 !== canonicalSha256(body)) throw new Error("V2 receipt self-hash is invalid.");
  validateOfflineEvidenceV2(receipt);
  if (receipt.runKind === "core") validateCoreReceiptV2(receipt, expectedPackage);
  else if (receipt.runKind === "repeat") validateRepeatReceiptV2(receipt, originalReceipt, expectedPackage);
  else throw new Error("Unsupported offline receipt run kind.");
  await mkdir(collectionRoot, { recursive: true, mode: 0o700 });
  await chmod(collectionRoot, 0o700);
  const expected = Object.fromEntries(["runId", "runKind", "packageId", "arm", "candidateSetSha256", "authorizationBinding", "inputSha256", "status"]
    .filter((key) => Object.hasOwn(receipt, key))
    .map((key) => [key, receipt[key]]));
  const existing = await readCommittedRunV2({ collectionRoot, expected, expectedPackage, originalReceipt });
  if (existing) {
    if (existing.receipt.receiptSha256 !== receipt.receiptSha256) throw new Error(`Refusing conflicting committed V2 run overwrite: ${receipt.runId}.`);
    return { runDirectory: existing.runDirectory, resumed: true, receiptSha256 };
  }
  const staging = path.join(collectionRoot, `.${receipt.runId}.staging-${process.pid}-${randomUUID()}`);
  await mkdir(staging, { mode: 0o700 });
  try {
    await protectedJson(path.join(staging, "receipt.json"), receipt);
    const markerBody = {
      protocolId: receipt.protocolId ?? null,
      protocolVersion: receipt.protocolVersion ?? null,
      runId: receipt.runId,
      runKind: receipt.runKind,
      candidateSetSha256: receipt.candidateSetSha256,
      authorizationBindingSha256: canonicalSha256(receipt.authorizationBinding),
      receiptSha256,
      receiptFileCanonicalSha256: canonicalSha256(receipt),
      complete: true
    };
    await protectedJson(path.join(staging, "COMMITTED.json"), { ...markerBody, markerSha256: canonicalSha256(markerBody) });
    const runDirectory = path.join(collectionRoot, receipt.runId);
    await rename(staging, runDirectory);
    return { runDirectory, resumed: false, receiptSha256 };
  } catch (error) {
    if (await exists(staging)) await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function writeSingletonReceipt(filePath, receipt, hashKey) {
  if (await exists(filePath)) {
    const stored = JSON.parse(await readFile(filePath, "utf8"));
    const { [hashKey]: storedHash, ...storedBody } = stored;
    if (storedHash !== canonicalSha256(storedBody) || storedHash !== receipt[hashKey]) throw new Error(`Existing singleton receipt conflicts: ${path.basename(filePath)}.`);
    return stored;
  }
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await protectedJson(temporary, receipt);
  await rename(temporary, filePath);
  await chmod(filePath, 0o600);
  return receipt;
}

function coreExpected(row) {
  return {
    runId: `v2-core-${row.arm.toLowerCase()}-${row.packageId}`,
    runKind: "core",
    packageId: row.packageId,
    arm: row.arm,
    candidateSetSha256: row.candidateSetSha256,
    authorizationBinding: row.authorizationBinding,
    inputSha256: row.contentSha256,
    status: "formal-core-run-complete"
  };
}

function repeatExpected(row, coreReceipt) {
  return {
    runId: `v2-repeat-${row.repeatGroupId}-${String(row.repeatIndex).padStart(2, "0")}`,
    runKind: "repeat",
    packageId: row.originalPackageId,
    arm: row.arm,
    candidateSetSha256: coreReceipt.candidateSetSha256,
    authorizationBinding: coreReceipt.authorizationBinding,
    status: "formal-repeat-run-complete"
  };
}

function orderedPlan(plan, candidateSetSha256, label) {
  return [...plan].sort((left, right) => canonicalSha256(`${candidateSetSha256}|${label}|${left.packageId ?? left.originalPackageId}`)
    .localeCompare(canonicalSha256(`${candidateSetSha256}|${label}|${right.packageId ?? right.originalPackageId}`)));
}

function timeBounds(receipts) {
  const starts = receipts.map((row) => row.startedAt).filter(Boolean).sort();
  const completions = receipts.map((row) => row.completedAt).filter(Boolean).sort();
  return { startedAt: starts[0] ?? null, completedAt: completions.at(-1) ?? null };
}

export async function collectCommittedCoreReceiptsV2({ outputRoot, corePlan, loadPackage }) {
  if (typeof loadPackage !== "function") throw new Error("An independent expected-package loader is required for core resume.");
  const collectionRoot = path.join(outputRoot, "core");
  const receipts = [];
  for (const row of corePlan) {
    const committed = await readCommittedRunV2({ collectionRoot, expected: coreExpected(row), expectedPackage: await loadPackage(row.packageId) });
    if (committed) receipts.push(committed.receipt);
  }
  return receipts;
}

export async function collectCommittedRepeatReceiptsV2({ outputRoot, repeatPlan, coreReceipts, loadPackage }) {
  if (typeof loadPackage !== "function") throw new Error("An independent expected-package loader is required for repeat resume.");
  const coreByPackage = new Map(coreReceipts.map((row) => [row.packageId, row]));
  const collectionRoot = path.join(outputRoot, "repeats");
  const receipts = [];
  for (const row of repeatPlan.packageRepeats) {
    const core = coreByPackage.get(row.originalPackageId);
    if (!core) continue;
    const committed = await readCommittedRunV2({ collectionRoot, expected: repeatExpected(row, core), originalReceipt: core, expectedPackage: await loadPackage(core.packageId) });
    if (committed) receipts.push(committed.receipt);
  }
  return receipts;
}

export async function runCoreCampaignV2({
  corePlan,
  outputRoot,
  loadPackage,
  providerAdapter,
  budgetLedger,
  concurrency = 6,
  maxAttemptsPerRole = 2,
  onProgress = () => {}
}) {
  const counts = validateCorePlanV2(corePlan);
  if (!path.isAbsolute(outputRoot)) throw new Error("V2 campaign output root must be absolute.");
  if (typeof loadPackage !== "function" || typeof onProgress !== "function") throw new Error("V2 campaign callbacks are invalid.");
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 12) throw new Error("V2 core concurrency must be from one through twelve.");
  const collectionRoot = path.join(outputRoot, "core");
  const receiptByPackage = new Map((await collectCommittedCoreReceiptsV2({ outputRoot, corePlan, loadPackage })).map((row) => [row.packageId, row]));
  const pending = orderedPlan(corePlan.filter((row) => !receiptByPackage.has(row.packageId)), corePlan[0].candidateSetSha256, "core-order");
  let cursor = 0;
  let firstError = null;
  async function worker() {
    while (firstError === null) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const row = pending[index];
      try {
        const packageContent = await loadPackage(row.packageId);
        if (!packageContent || packageContent.packageId !== row.packageId || packageContent.questions?.length !== 100 || packageContent.lessons?.length !== 2) throw new Error(`Formal V2 package denominator drifted: ${row.packageId}.`);
        const receipt = await runPackageV2({ planRow: row, packageContent, providerAdapter, budgetLedger, maxAttemptsPerRole });
        await writeCommittedRunV2({ collectionRoot, receipt, expectedPackage: packageContent });
        receiptByPackage.set(row.packageId, receipt);
        const usage = sumReceiptUsageV2([...receiptByPackage.values()]);
        if (typeof budgetLedger.reconcileCommittedUsage === "function") budgetLedger.reconcileCommittedUsage(usage);
        await onProgress({ phase: "core", packageId: row.packageId, arm: row.arm, committedRuns: receiptByPackage.size, targetRuns: 72, successfulProviderCalls: usage.providerCalls, providerAttempts: budgetLedger.snapshot().providerCalls });
      } catch (error) {
        firstError ??= error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, pending.length)) }, () => worker()));
  if (firstError) throw firstError;
  const receipts = [...receiptByPackage.values()].sort((left, right) => left.packageId.localeCompare(right.packageId));
  const resourceUsage = sumReceiptUsageV2(receipts);
  if (receipts.length !== 72 || resourceUsage.providerCalls !== 168) throw new Error(`V2 core denominator incomplete (${receipts.length} runs, ${resourceUsage.providerCalls} successful calls).`);
  if (resourceUsage.browserLaunches !== 0 || resourceUsage.childProcesses !== 0) throw new Error("V2 content-only core unexpectedly used browser or child-process execution.");
  const times = timeBounds(receipts);
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: corePlan[0].candidateSetSha256,
    authorizationBinding: structuredClone(corePlan[0].authorizationBinding),
    status: "formal-72-core-run-campaign-complete",
    executionMode: "offline-mock",
    evidenceClass: "synthetic-calibration",
    liveProviderUsed: false,
    formalExecutionAuthorized: false,
    providerCallsSimulated: true,
    ...times,
    runCount: 72,
    runCountsByArm: counts,
    successfulProviderCalls: 168,
    runReceipts: receipts.map((row) => ({ packageId: row.packageId, arm: row.arm, receiptSha256: row.receiptSha256 })),
    resourceUsage,
    includedInCoreEstimand: true,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  const campaign = { ...body, campaignReceiptSha256: canonicalSha256(body) };
  await writeSingletonReceipt(path.join(outputRoot, "CORE-CAMPAIGN-COMMITTED.json"), campaign, "campaignReceiptSha256");
  return { ...campaign, receipts };
}

export async function runRepeatCampaignV2({
  repeatPlan,
  coreReceipts,
  loadPackage,
  outputRoot,
  providerAdapter,
  budgetLedger,
  concurrency = 3,
  maxAttemptsPerRole = 2,
  onProgress = () => {}
}) {
  const coreByPackage = new Map(coreReceipts.map((row) => [row.packageId, row]));
  const existing = await collectCommittedRepeatReceiptsV2({ outputRoot, repeatPlan, coreReceipts, loadPackage });
  const receiptByGroup = new Map(existing.map((row) => [row.repeatGroupId, row]));
  const pending = orderedPlan(repeatPlan.packageRepeats.filter((row) => !receiptByGroup.has(row.repeatGroupId)), repeatPlan.candidateSetSha256, "repeat-order");
  const collectionRoot = path.join(outputRoot, "repeats");
  let cursor = 0;
  let firstError = null;
  async function worker() {
    while (firstError === null) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const row = pending[index];
      try {
        const core = coreByPackage.get(row.originalPackageId);
        if (!core) throw new Error(`Repeat core receipt is missing: ${row.originalPackageId}.`);
        const expectedPackage = await loadPackage(core.packageId);
        const receipt = await runPackageRepeatV2({ originalReceipt: core, expectedPackage, repeatPlanRow: row, providerAdapter, budgetLedger, maxAttemptsPerRole });
        await writeCommittedRunV2({ collectionRoot, receipt, expectedPackage, originalReceipt: core });
        receiptByGroup.set(row.repeatGroupId, receipt);
        const combinedUsage = sumReceiptUsageV2([...coreReceipts, ...receiptByGroup.values()]);
        if (typeof budgetLedger.reconcileCommittedUsage === "function") budgetLedger.reconcileCommittedUsage(combinedUsage);
        await onProgress({ phase: "repeat", repeatGroupId: row.repeatGroupId, arm: row.arm, committedRuns: receiptByGroup.size, targetRuns: 6, successfulProviderCalls: sumReceiptUsageV2([...receiptByGroup.values()]).providerCalls, providerAttempts: budgetLedger.snapshot().providerCalls });
      } catch (error) {
        firstError ??= error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, pending.length)) }, () => worker()));
  if (firstError) throw firstError;
  const receipts = [...receiptByGroup.values()].sort((left, right) => left.repeatGroupId.localeCompare(right.repeatGroupId));
  const resourceUsage = sumReceiptUsageV2(receipts);
  if (receipts.length !== 6 || resourceUsage.providerCalls !== 21) throw new Error(`V2 repeat denominator incomplete (${receipts.length} runs, ${resourceUsage.providerCalls} successful calls).`);
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: repeatPlan.candidateSetSha256,
    authorizationBinding: structuredClone(coreReceipts[0]?.authorizationBinding),
    repeatPlanSha256: repeatPlan.repeatPlanSha256,
    status: "formal-21-call-repeat-campaign-complete",
    executionMode: "offline-mock",
    evidenceClass: "synthetic-calibration",
    liveProviderUsed: false,
    formalExecutionAuthorized: false,
    providerCallsSimulated: true,
    repeatRunCount: 6,
    successfulProviderCalls: 21,
    runReceipts: receipts.map((row) => ({ repeatGroupId: row.repeatGroupId, packageId: row.packageId, arm: row.arm, receiptSha256: row.receiptSha256 })),
    resourceUsage,
    includedInCoreEstimand: false,
    productionAuthorized: false,
    deploymentAuthorized: false,
    gitCommitAuthorized: false,
    gitPushAuthorized: false
  };
  const campaign = { ...body, campaignReceiptSha256: canonicalSha256(body) };
  await writeSingletonReceipt(path.join(outputRoot, "REPEAT-CAMPAIGN-COMMITTED.json"), campaign, "campaignReceiptSha256");
  return { ...campaign, receipts };
}

function findingKey(row) {
  return `${row.surfaceId}|${row.family}|${row.code}`;
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  return [...left].filter((value) => right.has(value)).length / union.size;
}

export function computeRepeatabilityV2({ coreReceipts, repeatReceipts, expectedPackages }) {
  if (!Array.isArray(expectedPackages)) throw new Error("Repeat scoring requires independent expected packages.");
  const expectedByPackage = new Map(expectedPackages.map((row) => [row.packageId, row]));
  for (const core of coreReceipts) validateCoreReceiptV2(core, expectedByPackage.get(core.packageId));
  const coreByPackage = new Map(coreReceipts.map((row) => [row.packageId, row]));
  const pairs = [];
  for (const repeat of repeatReceipts) {
    const core = coreByPackage.get(repeat.originalPackageId);
    if (!core || core.repeatGroupId !== repeat.repeatGroupId) throw new Error(`Repeatability input is not bound: ${repeat.repeatGroupId}.`);
    validateRepeatReceiptV2(repeat, core, expectedByPackage.get(core.packageId));
    const originalByRole = new Map(core.roleExecutions.filter((row) => row.providerCalls === 1).map((row) => [row.role, row]));
    for (const repeatedExecution of repeat.roleExecutions) {
      const original = originalByRole.get(repeatedExecution.role);
      if (!original) throw new Error(`Original role is missing for repeat ${repeat.repeatGroupId}:${repeatedExecution.role}.`);
      const left = new Set((original.providerReceipt.roleResult.findings ?? []).map(findingKey));
      const right = new Set((repeatedExecution.providerReceipt.roleResult.findings ?? []).map(findingKey));
      pairs.push({
        repeatGroupId: repeat.repeatGroupId,
        packageId: core.packageId,
        region: core.region,
        arm: core.arm,
        role: original.role,
        originalFindingCount: left.size,
        repeatedFindingCount: right.size,
        exactFindingKeyJaccard: jaccard(left, right)
      });
    }
  }
  const mean = pairs.length === 0 ? null : pairs.reduce((sum, row) => sum + row.exactFindingKeyJaccard, 0) / pairs.length;
  return {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    status: "formal-repeatability-analysis-complete",
    callPairs: pairs.length,
    exactFindingKeyAgreement: { jaccardMean: mean },
    pairs,
    includedInCoreEstimand: false,
    interpretation: "Residual provider/reviewer stochasticity on exact frozen projections; repeats do not alter core arm outcomes."
  };
}
