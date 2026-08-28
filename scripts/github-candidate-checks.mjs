import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAIS_GITHUB_REPOSITORY = "HUDongpin/MAIS-MVP";
export const MAIS_GITHUB_REPOSITORY_ID = 1_287_988_109;
export const GITHUB_ACTIONS_APP_ID = 15_368;
export const RELEASE_REQUIRED_GITHUB_CHECKS = Object.freeze([
  "snapshot",
  "validate",
  "postgres-integration",
  "visualization-browser",
  "teacher-notice-outbox-postgres16",
  "resend-webhook-postgres-integration",
  "teacher-parent-e2e"
]);
export const RELEASE_REQUIRED_PROTECTED_GITHUB_CHECKS = Object.freeze([
  "validate",
  "promotion-shadow-gate"
]);

const SHA1_PATTERN = /^[a-f0-9]{40}$/u;
const CHECK_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _./()-]{0,99}$/u;
const GITHUB_JOB_URL_PATTERN = /^https:\/\/github\.com\/HUDongpin\/MAIS-MVP\/actions\/runs\/([1-9][0-9]{0,18})\/job\/([1-9][0-9]{0,18})$/u;
const EXPECTED_CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const EXPECTED_PROMOTION_WORKFLOW_PATH = ".github/workflows/promotion-shadow.yml";
const EXPECTED_PROMOTION_WORKFLOW_NAME = "promotion-shadow-gate";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GITHUB_API_ORIGIN = "https://api.github.com";
const GITHUB_REQUEST_TIMEOUT_MS = 15_000;
const GITHUB_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const GITHUB_TOKEN_MIN_LENGTH = 20;
const GITHUB_TOKEN_MAX_LENGTH = 2_048;
const GIT_OUTPUT_LIMIT_BYTES = 2 * 1024 * 1024;
const MAX_GITHUB_CHECK_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const GITHUB_CHILD_BASE_ENV_KEYS = Object.freeze([
  "CI",
  "COLORTERM",
  "COMSPEC",
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "WINDIR"
]);

export function buildGithubCandidateGitEnvironment(env = {}) {
  const child = {};
  for (const key of GITHUB_CHILD_BASE_ENV_KEYS) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return {
    ...child,
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_VALUE_0: "false",
    GIT_CONFIG_VALUE_1: "/dev/null",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0"
  };
}

export async function verifyGithubCandidateChecks(options = {}) {
  try {
    return await verifyGithubCandidateChecksInternal(options);
  } catch {
    throw new Error("GitHub exact-SHA candidate verification failed; details redacted.");
  }
}

async function verifyGithubCandidateChecksInternal(options) {
  assertVerifierOptions(options);
  const candidateSha = String(options.candidateSha ?? "").trim().toLowerCase();
  const expectedTreeSha = String(options.expectedTreeSha ?? "").trim().toLowerCase();
  if (!SHA1_PATTERN.test(candidateSha) || !SHA1_PATTERN.test(expectedTreeSha)) {
    throw new Error("invalid candidate binding");
  }
  const repoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? runQuietCommand;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function" || typeof runCommand !== "function") {
    throw new Error("provider dependencies unavailable");
  }
  const requestTimeoutMs = options.requestTimeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? GITHUB_MAX_RESPONSE_BYTES;
  if (
    !Number.isSafeInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1 ||
    requestTimeoutMs > 60_000 ||
    !Number.isSafeInteger(maxResponseBytes) ||
    maxResponseBytes < 1 ||
    maxResponseBytes > GITHUB_MAX_RESPONSE_BYTES
  ) {
    throw new Error("invalid request bounds");
  }

  await assertLocalCandidateBinding({ candidateSha, expectedTreeSha, env, repoRoot, runCommand });
  const token = await resolveGithubToken({ env, repoRoot, runCommand });
  const repositoryPath = `/repos/${MAIS_GITHUB_REPOSITORY}`;
  const urls = Object.freeze({
    repository: `${GITHUB_API_ORIGIN}${repositoryPath}`,
    commit: `${GITHUB_API_ORIGIN}${repositoryPath}/commits/${candidateSha}`,
    mainRef: `${GITHUB_API_ORIGIN}${repositoryPath}/git/ref/heads/main`,
    protection: `${GITHUB_API_ORIGIN}${repositoryPath}/branches/main/protection`,
    checks: `${GITHUB_API_ORIGIN}${repositoryPath}/commits/${candidateSha}/check-runs?filter=latest&per_page=100`
  });
  const requestOptions = { fetchImpl, maxResponseBytes, requestTimeoutMs, token };
  const repositoryPayload = await fetchGithubJson(urls.repository, requestOptions);
  const commitPayload = await fetchGithubJson(urls.commit, requestOptions);
  const mainRefPayload = await fetchGithubJson(urls.mainRef, requestOptions);
  const protectionPayload = await fetchGithubJson(urls.protection, requestOptions);
  const checkRunsPayload = await fetchGithubJson(urls.checks, requestOptions);
  const { actionsRunId } = selectReleaseCheckEvidence(candidateSha, checkRunsPayload);
  const { actionsRunId: promotionActionsRunId } = selectPromotionCheckEvidence(
    candidateSha,
    checkRunsPayload
  );
  const actionsRunUrl = `${GITHUB_API_ORIGIN}${repositoryPath}/actions/runs/${actionsRunId}`;
  const promotionActionsRunUrl =
    `${GITHUB_API_ORIGIN}${repositoryPath}/actions/runs/${promotionActionsRunId}`;
  const actionsRunPayload = await fetchGithubJson(actionsRunUrl, requestOptions);
  const promotionRunPayload = await fetchGithubJson(promotionActionsRunUrl, requestOptions);
  const finalMainRefPayload = await fetchGithubJson(urls.mainRef, requestOptions);

  validatePrivateRepository(repositoryPayload);
  validateProviderCommit(commitPayload, candidateSha, expectedTreeSha);
  validateMainRef(mainRefPayload, candidateSha);
  validateMainRef(finalMainRefPayload, candidateSha);
  const requiredStatusChecks = validateMainProtection(protectionPayload);
  const evidence = validateGithubCandidateEvidence({
    candidateSha,
    expectedTreeSha,
    repositoryPayload,
    commitPayload,
    protectionPayload: requiredStatusChecks,
    checkRunsPayload,
    actionsRunPayload,
    promotionRunPayload
  });
  await assertLocalCandidateBinding({ candidateSha, expectedTreeSha, env, repoRoot, runCommand });

  return {
    ...evidence,
    mainRef: "refs/heads/main"
  };
}

function assertVerifierOptions(options) {
  const allowed = new Set([
    "candidateSha",
    "expectedTreeSha",
    "repoRoot",
    "env",
    "fetchImpl",
    "runCommand",
    "requestTimeoutMs",
    "maxResponseBytes"
  ]);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("invalid verifier options");
  }
  if (Object.keys(options).some((key) => !allowed.has(key))) {
    throw new Error("unsupported verifier option");
  }
}

async function assertLocalCandidateBinding({ candidateSha, expectedTreeSha, env, repoRoot, runCommand }) {
  const gitEnv = buildGithubCandidateGitEnvironment(env);
  const commandOptions = { cwd: repoRoot, env: gitEnv, maxOutputBytes: GIT_OUTPUT_LIMIT_BYTES };
  const objectFormat = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--show-object-format"],
    commandOptions
  );
  const head = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", "HEAD"],
    commandOptions
  );
  const tree = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", `${candidateSha}^{tree}`],
    commandOptions
  );
  const status = await runCommand(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    commandOptions
  );
  if (
    objectFormat.trim() !== "sha1" ||
    head.trim().toLowerCase() !== candidateSha ||
    tree.trim().toLowerCase() !== expectedTreeSha ||
    !status ||
    status.exitCode !== 0 ||
    toBuffer(status.stdout).length !== 0
  ) {
    throw new Error("local candidate binding changed");
  }
}

async function runCommandText(runCommand, command, args, options) {
  const result = await runCommand(command, args, options);
  if (!result || result.exitCode !== 0) throw new Error("read-only command failed");
  const output = toBuffer(result.stdout);
  if (output.length > options.maxOutputBytes) throw new Error("read-only command output exceeded limit");
  return output.toString("utf8");
}

async function resolveGithubToken({ env, repoRoot, runCommand }) {
  for (const candidate of [env.GITHUB_TOKEN, env.GH_TOKEN]) {
    if (isValidGithubToken(candidate)) return candidate;
  }
  const result = await runCommand(
    "gh",
    ["auth", "token", "--hostname", "github.com"],
    {
      cwd: repoRoot,
      env: buildGithubCliEnvironment(env),
      maxOutputBytes: 4 * 1024,
      silent: true
    }
  );
  if (!result || result.exitCode !== 0) throw new Error("GitHub token unavailable");
  const tokenOutput = toBuffer(result.stdout);
  if (tokenOutput.length > 4 * 1024) throw new Error("GitHub token unavailable");
  const candidate = tokenOutput.toString("utf8").trim();
  if (!isValidGithubToken(candidate)) throw new Error("GitHub token unavailable");
  return candidate;
}

function buildGithubCliEnvironment(env = {}) {
  const child = {};
  for (const key of [
    ...GITHUB_CHILD_BASE_ENV_KEYS,
    "GH_CONFIG_DIR",
    "HOME",
    "USERPROFILE",
    "XDG_CONFIG_HOME"
  ]) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return {
    ...child,
    GH_PROMPT_DISABLED: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0"
  };
}

function isValidGithubToken(value) {
  return typeof value === "string" &&
    value.length >= GITHUB_TOKEN_MIN_LENGTH &&
    value.length <= GITHUB_TOKEN_MAX_LENGTH &&
    !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value);
}

async function fetchGithubJson(url, { fetchImpl, maxResponseBytes, requestTimeoutMs, token }) {
  assertFixedGithubApiUrl(url);
  const controller = new AbortController();
  let timeoutId;
  const timeoutFailure = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("GitHub API request timed out"));
    }, requestTimeoutMs);
  });
  try {
    const response = await Promise.race([
      fetchImpl(url, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "user-agent": "MAIS-release-exact-sha-gate/1"
        }
      }),
      timeoutFailure
    ]);
    if (
      !response ||
      response.status !== 200 ||
      response.redirected === true ||
      (response.url && response.url !== url) ||
      !response.headers ||
      typeof response.headers.get !== "function" ||
      !String(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")
    ) {
      throw new Error("GitHub API response contract failed");
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength !== null) {
      const parsedLength = Number(contentLength);
      if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maxResponseBytes) {
        throw new Error("GitHub API response exceeded byte limit");
      }
    }
    const bytes = await readBoundedBody(response, maxResponseBytes, controller.signal);
    return JSON.parse(bytes.toString("utf8"));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readBoundedBody(response, maxResponseBytes, signal) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("GitHub API response body was unavailable");
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw new Error("GitHub API response timed out");
      const { done, value } = await readStreamChunkWithAbort(reader, signal);
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxResponseBytes) {
        await reader.cancel();
        throw new Error("GitHub API response exceeded byte limit");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // The top-level verifier returns one stable redacted error.
    }
    throw error;
  } finally {
    try {
      reader.releaseLock?.();
    } catch {
      // A pending/errored stream may already have released its reader lock.
    }
  }
  return Buffer.concat(chunks, total);
}

function readStreamChunkWithAbort(reader, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("GitHub API response timed out"));
      return;
    }
    const onAbort = () => reject(new Error("GitHub API response timed out"));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(reader.read()).then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function assertFixedGithubApiUrl(url) {
  const raw = String(url ?? "");
  const parsed = new URL(raw);
  const repositoryPath = `/repos/${MAIS_GITHUB_REPOSITORY}`;
  const fixedPath = parsed.pathname === repositoryPath ||
    parsed.pathname === `${repositoryPath}/git/ref/heads/main` ||
    parsed.pathname === `${repositoryPath}/branches/main/protection` ||
    new RegExp(`^${repositoryPath}/commits/[0-9a-f]{40}$`, "u").test(parsed.pathname);
  const checkRunsPath = new RegExp(
    `^${repositoryPath}/commits/[0-9a-f]{40}/check-runs$`,
    "u"
  ).test(parsed.pathname);
  const actionsRunPath = new RegExp(
    `^${repositoryPath}/actions/runs/[1-9][0-9]{0,18}$`,
    "u"
  ).test(parsed.pathname);
  if (
    raw !== parsed.href ||
    parsed.origin !== GITHUB_API_ORIGIN ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.hash ||
    (!fixedPath && !checkRunsPath && !actionsRunPath) ||
    (fixedPath && parsed.search !== "") ||
    (checkRunsPath && parsed.search !== "?filter=latest&per_page=100") ||
    (actionsRunPath && parsed.search !== "")
  ) {
    throw new Error("GitHub API URL was outside the fixed allowlist");
  }
}

function validatePrivateRepository(payload) {
  if (
    payload?.id !== MAIS_GITHUB_REPOSITORY_ID ||
    payload?.name !== "MAIS-MVP" ||
    payload?.full_name !== MAIS_GITHUB_REPOSITORY ||
    payload?.private !== true ||
    payload?.visibility !== "private" ||
    payload?.default_branch !== "main" ||
    payload?.archived !== false ||
    payload?.disabled !== false ||
    payload?.owner?.login !== "HUDongpin" ||
    payload?.url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}` ||
    payload?.html_url !== `https://github.com/${MAIS_GITHUB_REPOSITORY}`
  ) {
    throw new Error("private repository identity mismatch");
  }
}

function validateProviderCommit(payload, candidateSha, expectedTreeSha) {
  if (
    payload?.sha !== candidateSha ||
    payload?.commit?.tree?.sha !== expectedTreeSha ||
    payload?.url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/commits/${candidateSha}` ||
    payload?.html_url !== `https://github.com/${MAIS_GITHUB_REPOSITORY}/commit/${candidateSha}`
  ) {
    throw new Error("provider commit identity mismatch");
  }
}

function validateMainRef(payload, candidateSha) {
  if (
    payload?.ref !== "refs/heads/main" ||
    payload?.url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/git/refs/heads/main` ||
    payload?.object?.type !== "commit" ||
    payload?.object?.sha !== candidateSha ||
    payload?.object?.url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/git/commits/${candidateSha}`
  ) {
    throw new Error("main ref did not match candidate");
  }
}

function validateMainProtection(payload) {
  const expectedProtectionUrl = `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/branches/main/protection`;
  if (
    payload?.url !== expectedProtectionUrl ||
    payload?.required_status_checks?.url !== `${expectedProtectionUrl}/required_status_checks` ||
    payload?.required_status_checks?.contexts_url !== `${expectedProtectionUrl}/required_status_checks/contexts` ||
    payload?.allow_force_pushes?.enabled !== false ||
    payload?.allow_deletions?.enabled !== false
  ) {
    throw new Error("main branch protection identity mismatch");
  }
  validateProtection(payload.required_status_checks);
  return payload.required_status_checks;
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value ?? ""), "utf8");
}

function runQuietCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const maxOutputBytes = options.maxOutputBytes ?? GIT_OUTPUT_LIMIT_BYTES;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let exceeded = false;
    const commandTimeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Read-only provider command timed out; details redacted."));
    }, 15_000);
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        exceeded = true;
        child.kill("SIGTERM");
        return;
      }
      stdoutChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > maxOutputBytes) {
        exceeded = true;
        child.kill("SIGTERM");
      }
    });
    child.on("error", () => {
      clearTimeout(commandTimeout);
      reject(new Error("Read-only provider command failed; details redacted."));
    });
    child.on("close", (exitCode) => {
      clearTimeout(commandTimeout);
      if (exceeded) {
        reject(new Error("Read-only provider command exceeded output limit; details redacted."));
        return;
      }
      resolve({
        exitCode,
        stdout: Buffer.concat(stdoutChunks, stdoutBytes),
        stderr: Buffer.alloc(0)
      });
    });
  });
}

export function validateGithubCandidateEvidence({
  candidateSha,
  expectedTreeSha,
  repositoryPayload,
  commitPayload,
  protectionPayload,
  checkRunsPayload,
  actionsRunPayload,
  promotionRunPayload
}) {
  if (!SHA1_PATTERN.test(candidateSha) || !SHA1_PATTERN.test(expectedTreeSha)) {
    throw new Error("GitHub candidate evidence failed: candidate or tree SHA was invalid.");
  }
  if (
    repositoryPayload?.id !== MAIS_GITHUB_REPOSITORY_ID ||
    repositoryPayload?.full_name !== MAIS_GITHUB_REPOSITORY ||
    repositoryPayload?.default_branch !== "main" ||
    repositoryPayload?.archived !== false
  ) {
    throw new Error("GitHub candidate evidence failed: repository identity did not match.");
  }
  if (
    commitPayload?.sha !== candidateSha ||
    commitPayload?.commit?.tree?.sha !== expectedTreeSha ||
    commitPayload?.html_url !== `https://github.com/${MAIS_GITHUB_REPOSITORY}/commit/${candidateSha}`
  ) {
    throw new Error("GitHub candidate evidence failed: provider commit or tree did not match the local candidate.");
  }

  const protectedChecks = validateProtection(protectionPayload);
  if (
    protectedChecks.length !== RELEASE_REQUIRED_PROTECTED_GITHUB_CHECKS.length ||
    RELEASE_REQUIRED_PROTECTED_GITHUB_CHECKS.some((context) =>
      !protectedChecks.some((check) =>
        check.context === context && check.appId === GITHUB_ACTIONS_APP_ID
      )
    ) ||
    protectedChecks.some((check) =>
      check.appId !== GITHUB_ACTIONS_APP_ID ||
      !RELEASE_REQUIRED_PROTECTED_GITHUB_CHECKS.includes(check.context)
    )
  ) {
    throw new Error("GitHub candidate evidence failed: main protection contained an unexpected release context.");
  }
  const { actionsRunId, selected } = selectReleaseCheckEvidence(
    candidateSha,
    checkRunsPayload
  );
  const {
    actionsRunId: promotionActionsRunId,
    selected: promotionCheck
  } = selectPromotionCheckEvidence(candidateSha, checkRunsPayload);
  const workflow = validateGithubActionsRun(
    actionsRunPayload,
    actionsRunId,
    candidateSha
  );
  const promotionWorkflow = validatePromotionGithubActionsRun(
    promotionRunPayload,
    promotionActionsRunId,
    candidateSha
  );

  return {
    verified: true,
    repository: MAIS_GITHUB_REPOSITORY,
    repositoryId: MAIS_GITHUB_REPOSITORY_ID,
    candidateSha,
    treeSha: expectedTreeSha,
    protectedChecks: protectedChecks.map((check) => check.context),
    releaseChecks: selected,
    workflow,
    promotionCheck,
    promotionWorkflow
  };
}

function selectReleaseCheckEvidence(candidateSha, checkRunsPayload) {
  validateCheckRunsPayload(checkRunsPayload);
  const requiredChecks = new Map(
    RELEASE_REQUIRED_GITHUB_CHECKS.map((name) => [name, GITHUB_ACTIONS_APP_ID])
  );
  const selected = [];
  const actionsRunIds = new Set();
  for (const [name, appId] of requiredChecks) {
    const check = selectLatestRequiredCheck(candidateSha, checkRunsPayload, name, appId);
    actionsRunIds.add(check.actionsRunId);
    selected.push(check);
  }
  if (actionsRunIds.size !== 1) {
    throw new Error(
      "GitHub candidate evidence failed: required checks did not belong to one trusted Actions run."
    );
  }
  return { actionsRunId: [...actionsRunIds][0], selected };
}

function selectPromotionCheckEvidence(candidateSha, checkRunsPayload) {
  validateCheckRunsPayload(checkRunsPayload);
  const selected = selectLatestRequiredCheck(
    candidateSha,
    checkRunsPayload,
    EXPECTED_PROMOTION_WORKFLOW_NAME,
    GITHUB_ACTIONS_APP_ID
  );
  return { actionsRunId: selected.actionsRunId, selected };
}

function validateCheckRunsPayload(checkRunsPayload) {
  if (
    !checkRunsPayload ||
    typeof checkRunsPayload !== "object" ||
    !Number.isSafeInteger(checkRunsPayload.total_count) ||
    checkRunsPayload.total_count < 1 ||
    !Array.isArray(checkRunsPayload.check_runs) ||
    checkRunsPayload.check_runs.length < 1 ||
    checkRunsPayload.check_runs.length > 100 ||
    checkRunsPayload.total_count !== checkRunsPayload.check_runs.length
  ) {
    throw new Error("GitHub candidate evidence failed: check-run response was invalid or incomplete.");
  }
}

function selectLatestRequiredCheck(candidateSha, checkRunsPayload, name, appId) {
  const candidates = checkRunsPayload.check_runs
    .filter((run) => run?.name === name)
    .sort((left, right) => Number(right.id ?? 0) - Number(left.id ?? 0));
  const latest = candidates[0];
  const detailsMatch = String(latest?.details_url ?? "").match(GITHUB_JOB_URL_PATTERN);
  const actionsRunId = Number(detailsMatch?.[1]);
  if (
    !latest ||
    !Number.isSafeInteger(latest.id) ||
    latest.id < 1 ||
    latest.head_sha !== candidateSha ||
    latest.status !== "completed" ||
    latest.conclusion !== "success" ||
    latest.app?.id !== appId ||
    latest.app?.slug !== "github-actions" ||
    !Number.isSafeInteger(actionsRunId) ||
    actionsRunId < 1 ||
    !isValidCompletedInterval(latest.started_at, latest.completed_at)
  ) {
    throw new Error(`GitHub candidate evidence failed: required check ${name} was not a latest successful exact-SHA GitHub Actions run.`);
  }
  return {
    actionsRunId,
    appId,
    checkRunId: latest.id,
    completedAt: latest.completed_at,
    name
  };
}

function validateGithubActionsRun(payload, actionsRunId, candidateSha) {
  return validateTrustedGithubActionsRun(payload, actionsRunId, candidateSha, {
    expectedName: "CI",
    expectedPath: EXPECTED_CI_WORKFLOW_PATH,
    label: "CI"
  });
}

function validatePromotionGithubActionsRun(payload, actionsRunId, candidateSha) {
  return validateTrustedGithubActionsRun(payload, actionsRunId, candidateSha, {
    expectedName: EXPECTED_PROMOTION_WORKFLOW_NAME,
    expectedPath: EXPECTED_PROMOTION_WORKFLOW_PATH,
    label: "promotion"
  });
}

function validateTrustedGithubActionsRun(
  payload,
  actionsRunId,
  candidateSha,
  { expectedName, expectedPath, label }
) {
  const workflowId = payload?.workflow_id;
  const allowedEvent = payload?.event === "push" || payload?.event === "workflow_dispatch";
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.id !== actionsRunId ||
    payload.name !== expectedName ||
    payload.path !== expectedPath ||
    !allowedEvent ||
    payload.status !== "completed" ||
    payload.conclusion !== "success" ||
    payload.head_branch !== "main" ||
    payload.head_sha !== candidateSha ||
    !Number.isSafeInteger(payload.run_attempt) ||
    payload.run_attempt < 1 ||
    !Number.isSafeInteger(workflowId) ||
    workflowId < 1 ||
    payload.url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/actions/runs/${actionsRunId}` ||
    payload.html_url !== `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/${actionsRunId}` ||
    payload.jobs_url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/actions/runs/${actionsRunId}/jobs` ||
    payload.workflow_url !== `${GITHUB_API_ORIGIN}/repos/${MAIS_GITHUB_REPOSITORY}/actions/workflows/${workflowId}` ||
    payload.repository?.id !== MAIS_GITHUB_REPOSITORY_ID ||
    payload.repository?.full_name !== MAIS_GITHUB_REPOSITORY ||
    payload.head_repository?.id !== MAIS_GITHUB_REPOSITORY_ID ||
    payload.head_repository?.full_name !== MAIS_GITHUB_REPOSITORY
  ) {
    throw new Error(
      `GitHub candidate evidence failed: required checks were not bound to the trusted ${label} Actions run.`
    );
  }
  return {
    event: payload.event,
    path: expectedPath,
    runAttempt: payload.run_attempt,
    runId: actionsRunId,
    workflowId
  };
}

function validateProtection(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.strict !== "boolean" ||
    !Array.isArray(payload.checks) ||
    payload.checks.length < 1 ||
    payload.checks.length > 50 ||
    !Array.isArray(payload.contexts)
  ) {
    throw new Error("GitHub candidate evidence failed: main branch protection check policy was invalid.");
  }
  const seen = new Set();
  const checks = payload.checks.map((entry) => {
    const context = entry?.context;
    const appId = entry?.app_id;
    if (
      !CHECK_NAME_PATTERN.test(String(context ?? "")) ||
      !Number.isSafeInteger(appId) ||
      appId < 1 ||
      seen.has(context)
    ) {
      throw new Error("GitHub candidate evidence failed: main branch protection check policy was invalid.");
    }
    seen.add(context);
    return { context, appId };
  });
  const legacyContexts = [...payload.contexts].sort();
  if (
    legacyContexts.length !== checks.length ||
    legacyContexts.some((context, index) => context !== checks.map((check) => check.context).sort()[index]) ||
    !checks.some((check) => check.context === "validate" && check.appId === GITHUB_ACTIONS_APP_ID)
  ) {
    throw new Error("GitHub candidate evidence failed: protected validate context was absent or ambiguous.");
  }
  return checks;
}

function isValidCompletedInterval(startedAt, completedAt) {
  const started = Date.parse(String(startedAt ?? ""));
  const completed = Date.parse(String(completedAt ?? ""));
  const now = Date.now();
  return Number.isFinite(started) &&
    Number.isFinite(completed) &&
    completed >= started &&
    completed >= now - MAX_GITHUB_CHECK_AGE_MS &&
    completed <= now + 5 * 60_000;
}
