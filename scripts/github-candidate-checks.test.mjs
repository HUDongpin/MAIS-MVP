import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

import {
  GITHUB_ACTIONS_APP_ID,
  MAIS_GITHUB_REPOSITORY,
  MAIS_GITHUB_REPOSITORY_ID,
  RELEASE_REQUIRED_GITHUB_CHECKS,
  buildGithubCandidateGitEnvironment,
  validateGithubCandidateEvidence,
  verifyGithubCandidateChecks
} from "./github-candidate-checks.mjs";

const candidateSha = "a".repeat(40);
const expectedTreeSha = "b".repeat(40);
const githubToken = "github_pat_fixture_token_never_output_1234567890";
const repositoryApiUrl = `https://api.github.com/repos/${MAIS_GITHUB_REPOSITORY}`;
const actionsRunId = 123;
const workflowId = 456;
const promotionActionsRunId = 124;
const promotionWorkflowId = 457;
const promotionCheckName = "promotion-shadow-gate";

test("candidate verifier Git children receive no provider credentials or hostile Git helpers", () => {
  const env = buildGithubCandidateGitEnvironment({
    PATH: "/fixture/bin",
    TMPDIR: "/tmp/github-candidate-fixture",
    GITHUB_TOKEN: githubToken,
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
    GIT_CONFIG_GLOBAL: "/tmp/hostile-global-gitconfig"
  });
  assert.equal(env.PATH, "/fixture/bin");
  assert.equal(env.TMPDIR, "/tmp/github-candidate-fixture");
  assert.equal(env.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(env.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(env.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(env.GIT_CONFIG_VALUE_0, "false");
  assert.equal(env.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(env.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(env.GIT_OPTIONAL_LOCKS, "0");
  for (const key of [
    "GITHUB_TOKEN",
    "VERCEL_TOKEN",
    "POSTGRES_URL",
    "RESEND_API_KEY",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM"
  ]) {
    assert.equal(env[key], undefined);
  }
});

function fixture() {
  const now = Date.now();
  const startedAt = new Date(now - 60_000).toISOString();
  const completedAt = new Date(now - 30_000).toISOString();
  return {
    candidateSha,
    expectedTreeSha,
    repositoryPayload: {
      id: MAIS_GITHUB_REPOSITORY_ID,
      full_name: MAIS_GITHUB_REPOSITORY,
      default_branch: "main",
      archived: false
    },
    commitPayload: {
      sha: candidateSha,
      html_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}/commit/${candidateSha}`,
      commit: { tree: { sha: expectedTreeSha } }
    },
    protectionPayload: {
      strict: false,
      contexts: ["validate", promotionCheckName],
      checks: [
        { context: "validate", app_id: GITHUB_ACTIONS_APP_ID },
        { context: promotionCheckName, app_id: GITHUB_ACTIONS_APP_ID }
      ]
    },
    checkRunsPayload: {
      total_count: RELEASE_REQUIRED_GITHUB_CHECKS.length + 1,
      check_runs: [
        ...RELEASE_REQUIRED_GITHUB_CHECKS.map((name, index) => ({
          id: 10_000 + index,
          name,
          head_sha: candidateSha,
          status: "completed",
          conclusion: "success",
          started_at: startedAt,
          completed_at: completedAt,
          details_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/${actionsRunId}/job/${10_000 + index}`,
          app: { id: GITHUB_ACTIONS_APP_ID, slug: "github-actions" }
        })),
        {
          id: 20_000,
          name: promotionCheckName,
          head_sha: candidateSha,
          status: "completed",
          conclusion: "success",
          started_at: startedAt,
          completed_at: completedAt,
          details_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/${promotionActionsRunId}/job/20000`,
          app: { id: GITHUB_ACTIONS_APP_ID, slug: "github-actions" }
        }
      ]
    },
    actionsRunPayload: {
      id: actionsRunId,
      name: "CI",
      path: ".github/workflows/ci.yml",
      event: "push",
      status: "completed",
      conclusion: "success",
      head_branch: "main",
      head_sha: candidateSha,
      run_attempt: 1,
      workflow_id: workflowId,
      url: `${repositoryApiUrl}/actions/runs/${actionsRunId}`,
      html_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/${actionsRunId}`,
      jobs_url: `${repositoryApiUrl}/actions/runs/${actionsRunId}/jobs`,
      workflow_url: `${repositoryApiUrl}/actions/workflows/${workflowId}`,
      repository: {
        id: MAIS_GITHUB_REPOSITORY_ID,
        full_name: MAIS_GITHUB_REPOSITORY
      },
      head_repository: {
        id: MAIS_GITHUB_REPOSITORY_ID,
        full_name: MAIS_GITHUB_REPOSITORY
      }
    },
    promotionRunPayload: {
      id: promotionActionsRunId,
      name: promotionCheckName,
      path: ".github/workflows/promotion-shadow.yml",
      event: "push",
      status: "completed",
      conclusion: "success",
      head_branch: "main",
      head_sha: candidateSha,
      run_attempt: 1,
      workflow_id: promotionWorkflowId,
      url: `${repositoryApiUrl}/actions/runs/${promotionActionsRunId}`,
      html_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/${promotionActionsRunId}`,
      jobs_url: `${repositoryApiUrl}/actions/runs/${promotionActionsRunId}/jobs`,
      workflow_url: `${repositoryApiUrl}/actions/workflows/${promotionWorkflowId}`,
      repository: {
        id: MAIS_GITHUB_REPOSITORY_ID,
        full_name: MAIS_GITHUB_REPOSITORY
      },
      head_repository: {
        id: MAIS_GITHUB_REPOSITORY_ID,
        full_name: MAIS_GITHUB_REPOSITORY
      }
    }
  };
}

function providerFixture() {
  const value = fixture();
  value.repositoryPayload = {
    ...value.repositoryPayload,
    name: "MAIS-MVP",
    private: true,
    visibility: "private",
    disabled: false,
    url: repositoryApiUrl,
    html_url: `https://github.com/${MAIS_GITHUB_REPOSITORY}`,
    owner: { login: "HUDongpin" }
  };
  value.commitPayload.url = `${repositoryApiUrl}/commits/${candidateSha}`;
  value.mainRefPayload = {
    ref: "refs/heads/main",
    url: `${repositoryApiUrl}/git/refs/heads/main`,
    object: {
      type: "commit",
      sha: candidateSha,
      url: `${repositoryApiUrl}/git/commits/${candidateSha}`
    }
  };
  value.protectionPayload = {
    url: `${repositoryApiUrl}/branches/main/protection`,
    required_status_checks: {
      ...value.protectionPayload,
      url: `${repositoryApiUrl}/branches/main/protection/required_status_checks`,
      contexts_url: `${repositoryApiUrl}/branches/main/protection/required_status_checks/contexts`
    },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false }
  };
  return value;
}

function createProviderHarness(overrides = {}) {
  const value = providerFixture();
  Object.assign(value, overrides);
  const urls = {
    repository: repositoryApiUrl,
    commit: `${repositoryApiUrl}/commits/${candidateSha}`,
    mainRef: `${repositoryApiUrl}/git/ref/heads/main`,
    protection: `${repositoryApiUrl}/branches/main/protection`,
    checks: `${repositoryApiUrl}/commits/${candidateSha}/check-runs?filter=latest&per_page=100`,
    actionsRun: `${repositoryApiUrl}/actions/runs/${actionsRunId}`,
    promotionActionsRun: `${repositoryApiUrl}/actions/runs/${promotionActionsRunId}`
  };
  const payloads = new Map([
    [urls.repository, value.repositoryPayload],
    [urls.commit, value.commitPayload],
    [urls.mainRef, value.mainRefPayload],
    [urls.protection, value.protectionPayload],
    [urls.checks, value.checkRunsPayload],
    [urls.actionsRun, value.actionsRunPayload],
    [urls.promotionActionsRun, value.promotionRunPayload]
  ]);
  const requests = [];
  const gitCalls = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const payload = payloads.get(url);
    assert.ok(payload, `unexpected GitHub API URL: ${url}`);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  const runCommand = async (command, args, options) => {
    gitCalls.push({ command, args, options });
    assert.equal(command, "git");
    if (args[0] === "status") return { exitCode: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    if (args.includes("--show-object-format")) {
      return { exitCode: 0, stdout: Buffer.from("sha1\n"), stderr: Buffer.alloc(0) };
    }
    if (args.at(-1) === "HEAD") {
      return { exitCode: 0, stdout: Buffer.from(`${candidateSha}\n`), stderr: Buffer.alloc(0) };
    }
    if (String(args.at(-1)).endsWith("^{tree}")) {
      return { exitCode: 0, stdout: Buffer.from(`${expectedTreeSha}\n`), stderr: Buffer.alloc(0) };
    }
    throw new Error("unexpected Git command");
  };
  return { fetchImpl, gitCalls, payloads, requests, runCommand, urls, value };
}

test("read-only provider verification binds clean local Git, main, private repo, protection, CI, and promotion checks", async () => {
  const harness = createProviderHarness();
  const evidence = await verifyGithubCandidateChecks({
    candidateSha,
    expectedTreeSha,
    env: { GITHUB_TOKEN: githubToken },
    fetchImpl: harness.fetchImpl,
    repoRoot: "/fixture/repo",
    runCommand: harness.runCommand
  });

  assert.equal(evidence.verified, true);
  assert.equal(evidence.candidateSha, candidateSha);
  assert.equal(evidence.treeSha, expectedTreeSha);
  assert.equal(evidence.mainRef, "refs/heads/main");
  assert.equal(evidence.releaseChecks.length, 7);
  assert.equal(evidence.promotionCheck.name, promotionCheckName);
  assert.equal(evidence.promotionWorkflow.path, ".github/workflows/promotion-shadow.yml");
  assert.deepEqual(harness.requests.map(({ url }) => url), [
    harness.urls.repository,
    harness.urls.commit,
    harness.urls.mainRef,
    harness.urls.protection,
    harness.urls.checks,
    harness.urls.actionsRun,
    harness.urls.promotionActionsRun,
    harness.urls.mainRef
  ]);
  assert.ok(harness.requests.every(({ init }) => init.method === "GET" && init.redirect === "error"));
  assert.ok(harness.requests.every(({ init }) => init.headers.authorization === `Bearer ${githubToken}`));
  assert.ok(harness.gitCalls.every(({ options }) =>
    options.env.GIT_NO_LAZY_FETCH === "1" && options.env.GIT_TERMINAL_PROMPT === "0"
  ));
  assert.equal(JSON.stringify(evidence).includes(githubToken), false);
});

test("provider verification rejects wrong main/repository/protection, stale success, or a newer failed check", async () => {
  const scenarios = [
    (harness) => {
      harness.value.mainRefPayload.object.sha = "c".repeat(40);
    },
    (harness) => {
      harness.value.repositoryPayload.private = false;
      harness.value.repositoryPayload.visibility = "public";
    },
    (harness) => {
      harness.value.protectionPayload.allow_force_pushes.enabled = true;
    },
    (harness) => {
      const policy = harness.value.protectionPayload.required_status_checks;
      policy.contexts.push("unexpected-release-gate");
      policy.checks.push({ context: "unexpected-release-gate", app_id: GITHUB_ACTIONS_APP_ID });
      const template = harness.value.checkRunsPayload.check_runs[0];
      harness.value.checkRunsPayload.check_runs.push({
        ...template,
        id: 88_888,
        name: "unexpected-release-gate"
      });
      harness.value.checkRunsPayload.total_count += 1;
    },
    (harness) => {
      const validateRun = harness.value.checkRunsPayload.check_runs.find((run) => run.name === "validate");
      validateRun.started_at = new Date(Date.now() - 9 * 24 * 60 * 60 * 1_000).toISOString();
      validateRun.completed_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1_000).toISOString();
    },
    (harness) => {
      const validateRun = harness.value.checkRunsPayload.check_runs.find((run) => run.name === "validate");
      harness.value.checkRunsPayload.check_runs.push({
        ...validateRun,
        id: 99_999,
        conclusion: "failure"
      });
      harness.value.checkRunsPayload.total_count += 1;
    },
    (harness) => {
      harness.value.actionsRunPayload.path = ".github/workflows/colliding-checks.yml";
    },
    (harness) => {
      harness.value.actionsRunPayload.event = "pull_request";
    },
    (harness) => {
      harness.value.promotionRunPayload.path = ".github/workflows/colliding-checks.yml";
    },
    (harness) => {
      harness.value.promotionRunPayload.event = "pull_request";
    }
  ];

  for (const mutate of scenarios) {
    const harness = createProviderHarness();
    mutate(harness);
    await assert.rejects(
      () => verifyGithubCandidateChecks({
        candidateSha,
        expectedTreeSha,
        env: { GITHUB_TOKEN: githubToken },
        fetchImpl: harness.fetchImpl,
        repoRoot: "/fixture/repo",
        runCommand: harness.runCommand
      }),
      /GitHub exact-SHA candidate verification failed; details redacted\./u
    );
  }
});

test("provider verification rejects arbitrary URL overrides before token-bearing fetch", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      apiBaseUrl: "https://attacker.example.test/private",
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new Error("must not fetch");
      },
      repoRoot: "/fixture/repo",
      runCommand: createProviderHarness().runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
  assert.equal(fetchCalls, 0);
});

test("provider verification rejects redirects and oversized response bodies", async () => {
  const redirectHarness = createProviderHarness();
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async (_url, init) => {
        assert.equal(init.redirect, "error");
        return new Response("", {
          status: 302,
          headers: { location: "https://attacker.example.test/collect" }
        });
      },
      repoRoot: "/fixture/repo",
      runCommand: redirectHarness.runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );

  const largeHarness = createProviderHarness();
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async () => new Response(
        JSON.stringify({ oversized: "x".repeat(1_024) }),
        { status: 200, headers: { "content-type": "application/json" } }
      ),
      maxResponseBytes: 128,
      repoRoot: "/fixture/repo",
      runCommand: largeHarness.runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
});

test("provider verification never relays fetch errors, arbitrary URLs, or tokens", async () => {
  const harness = createProviderHarness();
  const privateDiagnostic = `network failure ${githubToken} https://attacker.example.test/collect`;
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async () => {
        throw new Error(privateDiagnostic);
      },
      repoRoot: "/fixture/repo",
      runCommand: harness.runCommand
    }),
    (error) => {
      assert.equal(error.message, "GitHub exact-SHA candidate verification failed; details redacted.");
      assert.doesNotMatch(error.message, /github_pat|attacker|network failure/u);
      return true;
    }
  );
});

test("token resolution uses only GITHUB_TOKEN, GH_TOKEN, or silent gh auth token", async () => {
  const directTokenHarness = createProviderHarness();
  let directFetchCalls = 0;
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: {},
      fetchImpl: async () => {
        directFetchCalls += 1;
        throw new Error("must not fetch");
      },
      repoRoot: "/fixture/repo",
      runCommand: directTokenHarness.runCommand,
      token: githubToken
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
  assert.equal(directFetchCalls, 0);

  const fallbackHarness = createProviderHarness();
  const ghCalls = [];
  const runCommand = async (command, args, options) => {
    if (command === "gh") {
      ghCalls.push({ args, options });
      return { exitCode: 0, stdout: Buffer.from(`${githubToken}\n`), stderr: Buffer.alloc(0) };
    }
    return fallbackHarness.runCommand(command, args, options);
  };
  const evidence = await verifyGithubCandidateChecks({
    candidateSha,
    expectedTreeSha,
    env: {},
    fetchImpl: fallbackHarness.fetchImpl,
    repoRoot: "/fixture/repo",
    runCommand
  });
  assert.equal(evidence.verified, true);
  assert.equal(ghCalls.length, 1);
  assert.deepEqual(ghCalls[0].args, ["auth", "token", "--hostname", "github.com"]);
  assert.equal(ghCalls[0].options.silent, true);
  assert.equal(ghCalls[0].options.env.GH_PROMPT_DISABLED, "1");
});

test("provider requests abort on timeout without relaying token-bearing errors", async () => {
  const harness = createProviderHarness();
  let observedSignal;
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GH_TOKEN: githubToken },
      fetchImpl: async (_url, init) => {
        observedSignal = init.signal;
        return await new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new Error(`timeout leaked ${githubToken}`));
          }, { once: true });
        });
      },
      repoRoot: "/fixture/repo",
      requestTimeoutMs: 5,
      runCommand: harness.runCommand
    }),
    (error) => {
      assert.equal(error.message, "GitHub exact-SHA candidate verification failed; details redacted.");
      assert.doesNotMatch(error.message, /github_pat|timeout leaked/u);
      return true;
    }
  );
  assert.equal(observedSignal.aborted, true);
});

test("provider response streaming is bounded by the same timeout and rejects an arbitrary final URL", async () => {
  const bodyHarness = createProviderHarness();
  let cancelled = false;
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async () => ({
        status: 200,
        redirected: false,
        url: "",
        headers: new Headers({ "content-type": "application/json" }),
        body: {
          getReader() {
            return {
              read: async () => await new Promise(() => {}),
              cancel: async () => { cancelled = true; },
              releaseLock() {}
            };
          }
        }
      }),
      repoRoot: "/fixture/repo",
      requestTimeoutMs: 5,
      runCommand: bodyHarness.runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
  assert.equal(cancelled, true);

  const urlHarness = createProviderHarness();
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: async () => {
        const response = new Response(JSON.stringify(urlHarness.value.repositoryPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
        Object.defineProperty(response, "url", { value: "https://attacker.example.test/collect" });
        return response;
      },
      repoRoot: "/fixture/repo",
      runCommand: urlHarness.runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
});

test("candidate verification fails if main or local HEAD changes during the read-only proof", async () => {
  const mainHarness = createProviderHarness();
  let mainReads = 0;
  const mainFetch = async (url, init) => {
    if (url === mainHarness.urls.mainRef) {
      mainReads += 1;
      const payload = structuredClone(mainHarness.value.mainRefPayload);
      if (mainReads === 2) payload.object.sha = "c".repeat(40);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    return mainHarness.fetchImpl(url, init);
  };
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: mainFetch,
      repoRoot: "/fixture/repo",
      runCommand: mainHarness.runCommand
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );

  const localHarness = createProviderHarness();
  let headReads = 0;
  const driftingGit = async (command, args, options) => {
    if (command === "git" && args.at(-1) === "HEAD") {
      headReads += 1;
      return {
        exitCode: 0,
        stdout: Buffer.from(`${headReads === 1 ? candidateSha : "c".repeat(40)}\n`),
        stderr: Buffer.alloc(0)
      };
    }
    return localHarness.runCommand(command, args, options);
  };
  await assert.rejects(
    () => verifyGithubCandidateChecks({
      candidateSha,
      expectedTreeSha,
      env: { GITHUB_TOKEN: githubToken },
      fetchImpl: localHarness.fetchImpl,
      repoRoot: "/fixture/repo",
      runCommand: driftingGit
    }),
    /GitHub exact-SHA candidate verification failed; details redacted\./u
  );
});

test("candidate evidence binds the GitHub repository, commit tree, branch policy, and all release checks", () => {
  const evidence = validateGithubCandidateEvidence(fixture());
  assert.equal(evidence.verified, true);
  assert.equal(evidence.candidateSha, candidateSha);
  assert.equal(evidence.treeSha, expectedTreeSha);
  assert.deepEqual(evidence.protectedChecks, ["validate", promotionCheckName]);
  assert.deepEqual(
    evidence.releaseChecks.map((check) => check.name),
    RELEASE_REQUIRED_GITHUB_CHECKS
  );
  assert.equal(evidence.workflow.path, ".github/workflows/ci.yml");
  assert.equal(evidence.workflow.runId, actionsRunId);
  assert.equal(evidence.workflow.event, "push");
  assert.equal(evidence.promotionCheck.actionsRunId, promotionActionsRunId);
  assert.equal(evidence.promotionWorkflow.path, ".github/workflows/promotion-shadow.yml");
  assert.equal(evidence.promotionWorkflow.runId, promotionActionsRunId);
  assert.equal(evidence.promotionWorkflow.event, "push");
});

test("same-SHA same-name checks from a wrong or mixed Actions workflow cannot satisfy release", () => {
  const wrongWorkflow = fixture();
  wrongWorkflow.actionsRunPayload.path = ".github/workflows/colliding-checks.yml";
  assert.throws(
    () => validateGithubCandidateEvidence(wrongWorkflow),
    /workflow|Actions run/i
  );

  const mixedRuns = fixture();
  mixedRuns.checkRunsPayload.check_runs[0].details_url =
    `https://github.com/${MAIS_GITHUB_REPOSITORY}/actions/runs/999/job/10000`;
  assert.throws(
    () => validateGithubCandidateEvidence(mixedRuns),
    /workflow|Actions run/i
  );

  const wrongPromotionWorkflow = fixture();
  wrongPromotionWorkflow.promotionRunPayload.path = ".github/workflows/colliding-checks.yml";
  assert.throws(
    () => validateGithubCandidateEvidence(wrongPromotionWorkflow),
    /promotion|Actions run/i
  );
});

test("wrong repository, commit, or Git tree fails closed", () => {
  for (const mutate of [
    (value) => { value.repositoryPayload.id += 1; },
    (value) => { value.commitPayload.sha = "c".repeat(40); },
    (value) => { value.commitPayload.commit.tree.sha = "d".repeat(40); },
    (value) => { value.commitPayload.html_url = "https://example.test/spoof"; }
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => validateGithubCandidateEvidence(value), /GitHub candidate evidence failed/i);
  }
});

test("branch protection must keep only the trusted validate and promotion contexts", () => {
  const missing = fixture();
  missing.protectionPayload = { strict: false, contexts: [], checks: [] };
  assert.throws(() => validateGithubCandidateEvidence(missing), /protection/i);

  const wrongApp = fixture();
  wrongApp.protectionPayload.checks[0].app_id = 1;
  assert.throws(() => validateGithubCandidateEvidence(wrongApp), /validate context/i);

  const missingPromotion = fixture();
  missingPromotion.protectionPayload.contexts = ["validate"];
  missingPromotion.protectionPayload.checks = [
    { context: "validate", app_id: GITHUB_ACTIONS_APP_ID }
  ];
  assert.throws(() => validateGithubCandidateEvidence(missingPromotion), /protection|promotion/i);

  const wrongPromotionApp = fixture();
  wrongPromotionApp.protectionPayload.checks[1].app_id = 1;
  assert.throws(() => validateGithubCandidateEvidence(wrongPromotionApp), /protection|release context/i);
});

test("promotion protection cannot be satisfied by a stale, failed, incomplete, or wrong-app check", () => {
  for (const changed of [
    { conclusion: "failure" },
    { conclusion: null, status: "in_progress", completed_at: null },
    { head_sha: "c".repeat(40) },
    { details_url: "https://example.test/job/1" },
    { app: { id: 1, slug: "other" } }
  ]) {
    const value = fixture();
    const current = value.checkRunsPayload.check_runs.find((run) => run.name === promotionCheckName);
    Object.assign(current, changed, { id: 99_999 });
    value.checkRunsPayload.check_runs.push({
      ...fixture().checkRunsPayload.check_runs.find((run) => run.name === promotionCheckName),
      id: 1
    });
    value.checkRunsPayload.total_count += 1;
    assert.throws(
      () => validateGithubCandidateEvidence(value),
      /promotion-shadow-gate|promotion/i
    );
  }
});

test("a stale success cannot hide a newer failed or incomplete required check", () => {
  for (const changed of [
    { conclusion: "failure" },
    { conclusion: null, status: "in_progress", completed_at: null },
    { head_sha: "c".repeat(40) },
    { details_url: "https://example.test/job/1" }
  ]) {
    const value = fixture();
    const current = value.checkRunsPayload.check_runs.find((run) => run.name === "validate");
    Object.assign(current, changed, { id: 99_999 });
    value.checkRunsPayload.check_runs.push({
      ...current,
      ...fixture().checkRunsPayload.check_runs.find((run) => run.name === "validate"),
      id: 1
    });
    value.checkRunsPayload.total_count += 1;
    assert.throws(() => validateGithubCandidateEvidence(value), /required check validate/i);
  }

  const wrongAppOnly = fixture();
  wrongAppOnly.checkRunsPayload.check_runs.find((run) => run.name === "validate").app = {
    id: 1,
    slug: "other"
  };
  assert.throws(
    () => validateGithubCandidateEvidence(wrongAppOnly),
    /required check validate/i
  );
});

test("every supplemental production release check is mandatory", () => {
  for (const name of RELEASE_REQUIRED_GITHUB_CHECKS) {
    const value = fixture();
    value.checkRunsPayload.check_runs = value.checkRunsPayload.check_runs.filter((run) => run.name !== name);
    value.checkRunsPayload.total_count -= 1;
    assert.throws(() => validateGithubCandidateEvidence(value), new RegExp(`required check ${name}`, "iu"));
  }
});

test("same-SHA production jobs run for PR, merge queue, main push, and explicit full validation", async () => {
  const ciText = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const workflow = YAML.parse(ciText);
  const fullMatrix =
    "${{ github.event_name == 'pull_request' || github.event_name == 'merge_group' || (github.event_name == 'push' && github.ref == 'refs/heads/main') || (github.event_name == 'workflow_dispatch' && inputs.full_validation) }}";
  for (const jobName of RELEASE_REQUIRED_GITHUB_CHECKS.filter((name) => name !== "snapshot")) {
    assert.equal(workflow.jobs[jobName]?.if, fullMatrix, `${jobName} must run on the complete release event matrix`);
  }
});
