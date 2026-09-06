import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { PROTOCOL_ID, PROTOCOL_VERSION, SOURCE_BASELINE } from "./protocol-design.mjs";

export const OWNER_AUTHORIZATION_EXACT_V2 = "批准 MAIS-RSI-LITE-CAL-V2 正式执行：168 次 core successful calls 加 21 次 repeat successful calls，使用 DeepSeek deepseek-v4-pro；允许外发冻结的候选题审查内容；硬上限为 25 美元、220 次 provider attempts、4,000 万 tokens；不部署、不提交或推送 Git。";
export const HARD_CAPS_V2 = Object.freeze({ currencyCapUsd: 25, providerAttemptCap: 220, tokenCap: 40_000_000 });
export const SUCCESS_TARGETS_V2 = Object.freeze({ core: 168, repeat: 21, total: 189 });

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isGitObjectId(value) {
  return typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
}

function safeRelativePath(value) {
  return typeof value === "string"
    && value !== ""
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/).includes("..");
}

export function createFormalAuthorizationV2({
  candidateReadinessReceipt,
  repeatPlan,
  codeManifest,
  worktreeIdentity,
  createdAt = new Date().toISOString()
}) {
  if (!candidateReadinessReceipt || !repeatPlan || !Array.isArray(codeManifest) || !worktreeIdentity) throw new Error("Formal V2 authorization inputs are incomplete.");
  const body = {
    receiptType: "MAIS_RSI_LITE_CAL_V2_FORMAL_OWNER_AUTHORIZATION",
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    createdAt,
    ownerAuthorizationExact: OWNER_AUTHORIZATION_EXACT_V2,
    candidateBinding: {
      candidateSetSha256: candidateReadinessReceipt.candidateSetSha256,
      bundleReadinessReceiptSha256: candidateReadinessReceipt.receiptSha256,
      packageCount: candidateReadinessReceipt.packageFileCount,
      coreSuccessfulProviderCalls: candidateReadinessReceipt.coreSuccessfulProviderCalls
    },
    repeatBinding: {
      repeatPlanSha256: repeatPlan.repeatPlanSha256,
      successfulProviderCalls: repeatPlan.successfulProviderCalls
    },
    provider: {
      name: "DeepSeek",
      model: "deepseek-v4-pro",
      role: "machine-quality-reviewer",
      liveProviderAuthorized: true
    },
    egress: {
      frozenCandidateReviewContentToDeepSeek: true,
      destination: "DeepSeek API",
      derivedReviewContentIncluded: true
    },
    hardCaps: { ...HARD_CAPS_V2 },
    successTargets: { ...SUCCESS_TARGETS_V2 },
    retryReserveAttempts: HARD_CAPS_V2.providerAttemptCap - SUCCESS_TARGETS_V2.total,
    executionControls: {
      maxAttemptsPerRole: 2,
      coreConcurrency: 6,
      repeatConcurrency: 3,
      persistentBudgetLedgerRequired: true,
      atomicRunReceiptsRequired: true,
      resumeVerificationRequired: true,
      goldUnavailableUntilCoreAndRepeatCommitted: true
    },
    boundaries: {
      candidateOnlyResearchCalibration: true,
      productionAuthorized: false,
      deploymentAuthorized: false,
      gitStageAuthorized: false,
      gitCommitAuthorized: false,
      gitPushAuthorized: false
    },
    worktreeIdentity: structuredClone(worktreeIdentity),
    codeManifest: codeManifest.map((row) => ({ ...row })),
    codeManifestSha256: canonicalSha256(codeManifest)
  };
  return { ...body, authorizationSha256: canonicalSha256(body) };
}

export function validateFormalAuthorizationV2(authorization) {
  const issues = [];
  const push = (code, detail) => issues.push({ code, detail });
  if (!authorization || typeof authorization !== "object" || Array.isArray(authorization)) return [{ code: "authorization-shape", detail: "Formal authorization must be an object." }];
  const { authorizationSha256, ...body } = authorization;
  if (authorizationSha256 !== canonicalSha256(body)) push("authorization-hash", "Formal authorization self-hash drifted.");
  if (authorization.protocolId !== PROTOCOL_ID || authorization.protocolVersion !== PROTOCOL_VERSION || authorization.sourceBaseline !== SOURCE_BASELINE) push("protocol-binding", "Formal authorization protocol binding drifted.");
  if (authorization.ownerAuthorizationExact !== OWNER_AUTHORIZATION_EXACT_V2) push("owner-instruction", "Exact owner authorization text drifted.");
  if (canonicalSha256(authorization.hardCaps) !== canonicalSha256(HARD_CAPS_V2)) push("hard-caps", "Owner hard caps drifted.");
  if (canonicalSha256(authorization.successTargets) !== canonicalSha256(SUCCESS_TARGETS_V2)) push("success-targets", "Successful-call targets drifted.");
  if (authorization.retryReserveAttempts !== 31) push("retry-reserve", "Provider-attempt retry reserve must be 31.");
  if (authorization.provider?.name !== "DeepSeek" || authorization.provider?.model !== "deepseek-v4-pro" || authorization.provider?.liveProviderAuthorized !== true) push("provider-binding", "Authorized provider or model drifted.");
  if (authorization.egress?.frozenCandidateReviewContentToDeepSeek !== true || authorization.egress?.destination !== "DeepSeek API") push("egress-binding", "Authorized external-egress scope drifted.");
  if (authorization.candidateBinding?.packageCount !== 72 || authorization.candidateBinding?.coreSuccessfulProviderCalls !== 168 || !isSha256(authorization.candidateBinding?.candidateSetSha256) || !isSha256(authorization.candidateBinding?.bundleReadinessReceiptSha256)) push("candidate-binding", "Frozen candidate binding is invalid.");
  if (authorization.repeatBinding?.successfulProviderCalls !== 21 || !isSha256(authorization.repeatBinding?.repeatPlanSha256)) push("repeat-binding", "Repeat-plan binding is invalid.");
  if (authorization.executionControls?.maxAttemptsPerRole !== 2 || authorization.executionControls?.coreConcurrency !== 6 || authorization.executionControls?.repeatConcurrency !== 3 || authorization.executionControls?.persistentBudgetLedgerRequired !== true || authorization.executionControls?.goldUnavailableUntilCoreAndRepeatCommitted !== true) push("execution-controls", "Formal execution controls drifted.");
  if (authorization.boundaries?.productionAuthorized !== false || authorization.boundaries?.deploymentAuthorized !== false || authorization.boundaries?.gitStageAuthorized !== false || authorization.boundaries?.gitCommitAuthorized !== false || authorization.boundaries?.gitPushAuthorized !== false) push("forbidden-boundary", "A forbidden deployment or Git mutation was authorized.");
  if (!Array.isArray(authorization.codeManifest) || authorization.codeManifest.length === 0 || authorization.codeManifest.some((row) => !safeRelativePath(row.path) || !isSha256(row.sha256))) push("code-manifest", "Authorization code manifest is invalid.");
  if (authorization.codeManifestSha256 !== canonicalSha256(authorization.codeManifest)) push("code-manifest-hash", "Authorization code manifest commitment drifted.");
  if (!authorization.worktreeIdentity?.trackedDiffAbsent || !isGitObjectId(authorization.worktreeIdentity?.head) || typeof authorization.worktreeIdentity?.absolutePath !== "string") push("worktree-binding", "Isolated worktree identity is invalid.");
  return issues;
}

export async function createCodeManifestV2({ worktreeRoot, paths }) {
  if (!path.isAbsolute(worktreeRoot) || !Array.isArray(paths) || paths.length === 0) throw new Error("Code-manifest inputs are invalid.");
  const unique = [...new Set(paths)].sort();
  if (unique.some((value) => !safeRelativePath(value))) throw new Error("Code manifest contains an unsafe path.");
  return Promise.all(unique.map(async (relativePath) => ({
    path: relativePath,
    sha256: canonicalSha256(await readFile(path.join(worktreeRoot, relativePath)))
  })));
}

export async function verifyAuthorizationCodeFilesV2({ authorization, worktreeRoot }) {
  if (!path.isAbsolute(worktreeRoot)) throw new Error("Worktree root must be absolute.");
  for (const row of authorization.codeManifest ?? []) {
    if (!safeRelativePath(row.path)) throw new Error(`Unsafe authorized code path: ${row.path}.`);
    const observed = canonicalSha256(await readFile(path.join(worktreeRoot, row.path)));
    if (observed !== row.sha256) throw new Error(`Formal V2 code drifted: ${row.path}.`);
  }
  return true;
}

export function authorizationBindingV2(authorization) {
  return {
    authorizationSha256: authorization.authorizationSha256,
    candidateSetSha256: authorization.candidateBinding.candidateSetSha256,
    bundleReadinessReceiptSha256: authorization.candidateBinding.bundleReadinessReceiptSha256,
    repeatPlanSha256: authorization.repeatBinding.repeatPlanSha256,
    codeManifestSha256: authorization.codeManifestSha256
  };
}

export async function writeFormalAuthorizationV2({ authorization, outputPath }) {
  if (!path.isAbsolute(outputPath)) throw new Error("Formal authorization output path must be absolute.");
  const issues = validateFormalAuthorizationV2(authorization);
  if (issues.length > 0) throw new Error(`Formal authorization is invalid (${issues.map((row) => row.code).join(",")}).`);
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  try {
    await access(outputPath);
    const stored = JSON.parse(await readFile(outputPath, "utf8"));
    if (stored.authorizationSha256 !== authorization.authorizationSha256) throw new Error("Stored formal authorization conflicts with the requested authorization.");
    return stored;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const temporary = `${outputPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(authorization, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporary, 0o600);
  await rename(temporary, outputPath);
  await chmod(outputPath, 0o600);
  return authorization;
}
