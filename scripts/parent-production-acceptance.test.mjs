import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseYaml } from "yaml";

import {
  buildParentProductionAcceptanceRuntime,
  deriveSyntheticFamilyAccounts,
  inspectParentPrivateResponseHeaders,
  inspectProductionSessionCookie,
  inspectSessionIssuanceResponseHeaders,
  loadParentProductionReleaseRecord,
  parentProductionAcceptanceConfirmation,
  parseParentProductionAcceptanceArgs,
  readBoundedJson,
  readParentProductionAcceptanceRuntime,
  runParentProductionAcceptance,
  selectSingleResendTestDelivery,
  validateConcurrentParentMessageEvidence,
  validateParentProductionReleaseRecord,
  validateResendTestDeliveryEvidence,
  validateParentProductionAcceptanceExecutionId,
  validateTeacherNoticeHealthProgress
} from "./parent-production-acceptance.mjs";

const candidateSha = "a".repeat(40);
const treeSha = "b".repeat(40);
const familyId = "mais-synthetic-family-parent-acceptance-01";
const target = "https://www.mais.hk";
const releaseRecordPath = "/tmp/mais-parent-production-release-record.json";
const deploymentId = "dpl_FixtureParentAcceptance123456";
const deploymentUrl = "https://mais-parent-acceptance-fixture.vercel.app";
const validRuntime = Object.freeze({
  CRON_SECRET: "c".repeat(48),
  TEACHER_NOTICE_HEALTH_SECRET: "h".repeat(48),
  TEACHER_NOTICE_RESEND_API_KEY: `re_${"r".repeat(40)}`,
  TEACHER_NOTICE_EMAIL_ENABLED: "true",
  TEACHER_NOTICE_ALLOWED_ORIGIN: target,
  TEACHER_NOTICE_BASE_URL: target,
  TEACHER_NOTICE_FROM: "MAIS <teacher-notices@example.test>",
  HK_MATH_STORAGE_PROVIDER: "postgres",
  WECOM_NOTIFICATIONS_ENABLED: "false"
});

function bindingArgs(overrides = {}) {
  const selected = {
    candidateSha,
    familyId,
    target,
    treeSha,
    ...overrides
  };
  return [
    "--candidate-sha",
    selected.candidateSha,
    "--tree-sha",
    selected.treeSha,
    "--release-record",
    releaseRecordPath,
    "--target",
    selected.target,
    "--synthetic-test-family-id",
    selected.familyId,
    "--allow-production-writes",
    "--allow-resend-test-delivery",
    "--confirmation",
    parentProductionAcceptanceConfirmation(selected)
  ];
}

function replaceArgument(argv, flag, value) {
  const copy = [...argv];
  const index = copy.indexOf(flag);
  assert.notEqual(index, -1);
  copy[index + 1] = value;
  return copy;
}

function exactReleaseRecord() {
  const exactSchema = {
    candidateSha,
    expectedTreeSha: treeSha,
    appStorageState: "exact",
    outboxState: "exact",
    webhookState: "exact",
    heartbeatState: "exact",
    operations: [],
    postgresMajor: 17
  };
  return {
    candidateSha,
    target: "production",
    inspectVerified: true,
    providerGitShaVerified: true,
    providerSourceVerified: true,
    promotionVerified: true,
    productionOrigins: ["https://www.mais.ac", "https://www.mais.hk"],
    finalProductionDeployment: {
      deploymentId,
      deploymentUrl,
      productionAliases: ["https://www.mais.ac", "https://www.mais.hk"]
    },
    preDeployGithubEvidence: {
      candidateSha,
      treeSha,
      verified: true
    },
    prePromotionGithubEvidence: {
      candidateSha,
      treeSha,
      verified: true
    },
    prePromotionSchemaEvidence: {
      ...exactSchema,
      mode: "preflight",
      mutation: false,
      network: true
    },
    productionSchemaApplyEvidence: {
      candidateSha,
      expectedTreeSha: treeSha,
      mode: "apply",
      mutation: true,
      network: true,
      operations: [],
      sameConnectionPostflight: exactSchema,
      postflight: exactSchema
    },
    productionReadOnlySmokes: ["https://www.mais.ac", "https://www.mais.hk"].map((baseUrl) => ({
      baseUrl,
      readOnly: true,
      requestCount: 7,
      checks: [
        ["landing", 200],
        ["about", 200],
        ["login", 200],
        ["parent-entry", 307],
        ["parent-foundation", 403],
        ["session", 401],
        ["warm", 401]
      ].map(([id, status]) => ({ id, status }))
    }))
  };
}

test("production-write authorization is exact-family, exact-target, exact-SHA, and runtime-secret bound", () => {
  const parsed = parseParentProductionAcceptanceArgs(bindingArgs(), validRuntime);
  assert.deepEqual(parsed, {
    candidateSha,
    treeSha,
    releaseRecordPath,
    target,
    syntheticFamilyId: familyId,
    allowProductionWrites: true,
    allowResendTestDelivery: true,
    confirmation: parentProductionAcceptanceConfirmation({ candidateSha, familyId, target, treeSha })
  });

  const rejected = [
    bindingArgs().filter((argument) => argument !== "--allow-production-writes"),
    bindingArgs().filter((argument) => argument !== "--allow-resend-test-delivery"),
    replaceArgument(bindingArgs(), "--target", "https://mais.hk"),
    replaceArgument(bindingArgs(), "--synthetic-test-family-id", "ordinary-family"),
    [...bindingArgs().slice(0, -1), "ALLOW_MAIS_PARENT_PRODUCTION_ACCEPTANCE:wrong"],
    [...bindingArgs(), "--recipient", "person@example.com"]
  ];
  for (const argv of rejected) {
    assert.throws(
      () => parseParentProductionAcceptanceArgs(argv, validRuntime),
      /production acceptance|unknown argument|approved production origin|synthetic test family/i
    );
  }

  for (const missing of Object.keys(validRuntime).filter((key) => key !== "WECOM_NOTIFICATIONS_ENABLED")) {
    assert.throws(
      () => parseParentProductionAcceptanceArgs(bindingArgs(), { ...validRuntime, [missing]: "" }),
      /credential.*unavailable|runtime.*unavailable/i
    );
  }
  assert.throws(
    () => parseParentProductionAcceptanceArgs(bindingArgs(), {
      ...validRuntime,
      WECOM_NOTIFICATIONS_ENABLED: "true"
    }),
    /runtime.*unavailable|WeCom.*disabled/i
  );
});

test("each acceptance workflow attempt has a bounded replay-safe execution identity", () => {
  assert.equal(validateParentProductionAcceptanceExecutionId("123456789:1"), "123456789:1");
  for (const value of ["", "0:1", "1:0", "01:1", "1:01", "1", "1:1:1", "abc:1", "1:-1"]) {
    assert.throws(
      () => validateParentProductionAcceptanceExecutionId(value),
      /execution identity/i
    );
  }
});

test("release record must prove exact source, provider, aliases, Postgres schema, and both read-only smokes", () => {
  assert.deepEqual(
    validateParentProductionReleaseRecord(exactReleaseRecord(), { candidateSha, treeSha }),
    {
      candidateSha,
      treeSha,
      postgresMajor: 17,
      productionOrigins: ["https://www.mais.ac", "https://www.mais.hk"],
      providerBound: true,
      schemaExact: true,
      readOnlySmokeBound: true
    }
  );

  const mutations = [
    (record) => { record.candidateSha = "c".repeat(40); },
    (record) => { record.preDeployGithubEvidence.treeSha = "c".repeat(40); },
    (record) => { record.providerSourceVerified = false; },
    (record) => { record.prePromotionSchemaEvidence.operations = ["unexpected"]; },
    (record) => { record.productionSchemaApplyEvidence.postflight.heartbeatState = "partial"; },
    (record) => { record.productionReadOnlySmokes[1].checks[4].status = 500; },
    (record) => { record.finalProductionDeployment.productionAliases = ["https://www.mais.hk"]; },
    (record) => { record.finalProductionDeployment.deploymentId = "not-a-deployment"; },
    (record) => { record.finalProductionDeployment.deploymentUrl = "https://attacker.example"; }
  ];
  for (const mutate of mutations) {
    const record = structuredClone(exactReleaseRecord());
    mutate(record);
    assert.throws(
      () => validateParentProductionReleaseRecord(record, { candidateSha, treeSha }),
      /release record.*failed/i
    );
  }
});

test("release record loader accepts one bounded regular JSON file and rejects links or malformed input", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-parent-acceptance-loader-"));
  try {
    const exactPath = path.join(directory, "release.json");
    const malformedPath = path.join(directory, "malformed.json");
    const linkPath = path.join(directory, "release-link.json");
    await writeFile(exactPath, `${JSON.stringify(exactReleaseRecord())}\n`, "utf8");
    await writeFile(malformedPath, "{not-json}\n", "utf8");
    await symlink(exactPath, linkPath);
    assert.deepEqual(await loadParentProductionReleaseRecord(exactPath), exactReleaseRecord());
    await assert.rejects(
      loadParentProductionReleaseRecord(malformedPath),
      /release record could not be loaded/i
    );
    await assert.rejects(
      loadParentProductionReleaseRecord(linkPath),
      /release record could not be loaded/i
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("provider JSON streaming stops and cancels at the response bound", async () => {
  const chunk = new Uint8Array(128 * 1024).fill(65);
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      if (pulls <= 20) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() {
      cancelled = true;
    }
  });
  await assert.rejects(
    readBoundedJson(new Response(body, {
      status: 200,
      headers: { "content-type": "application/json" }
    })),
    /response exceeded its bound/i
  );
  assert.equal(cancelled, true);
  assert.ok(pulls <= 10, `bounded reader pulled ${pulls} chunks`);
});

test("protected provider pull returns only the exact runtime allowlist and rejects context or parity drift", async () => {
  const toolSha = "c".repeat(40);
  const context = {
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_REPOSITORY: "HUDongpin/MAIS-MVP",
    GITHUB_SHA: toolSha,
    GITHUB_WORKFLOW_REF: "HUDongpin/MAIS-MVP/.github/workflows/parent-production-acceptance.yml@refs/heads/main",
    GITHUB_RUN_ID: "123456789",
    GITHUB_RUN_ATTEMPT: "1",
    MAIS_PARENT_PRODUCTION_ACCEPTANCE_ENV_SOURCE: "vercel-api-pull-v1",
    VERCEL_TOKEN: `vercel_${"v".repeat(40)}`
  };
  const built = buildParentProductionAcceptanceRuntime({
    runtimeEnvironment: validRuntime,
    buildEnvironment: validRuntime,
    target
  });
  assert.deepEqual(built, validRuntime);
  assert.equal(Object.prototype.hasOwnProperty.call(built, "VERCEL_TOKEN"), false);
  const alternateApprovedNoticeOrigin = {
    ...validRuntime,
    TEACHER_NOTICE_ALLOWED_ORIGIN: "https://www.mais.ac",
    TEACHER_NOTICE_BASE_URL: "https://www.mais.ac"
  };
  assert.deepEqual(buildParentProductionAcceptanceRuntime({
    runtimeEnvironment: alternateApprovedNoticeOrigin,
    buildEnvironment: alternateApprovedNoticeOrigin,
    target
  }), alternateApprovedNoticeOrigin);

  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    calls.push({
      pathname: url.pathname,
      searchKeys: [...url.searchParams.keys()].sort(),
      authorizationPresent: /^Bearer [^\s]+$/u.test(init.headers.authorization)
    });
    if (url.pathname.startsWith("/v9/projects/")) {
      return new Response(JSON.stringify({
        id: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
        name: "mais-mvp",
        accountId: "team_i9xhhYXUeYBOCLcfWBjTqlYG"
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname.startsWith("/v3/env/pull/")) {
      return new Response(JSON.stringify({ env: validRuntime, buildEnv: validRuntime }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    if (url.pathname === "/v13/deployments/www.mais.ac" || url.pathname === "/v13/deployments/www.mais.hk") {
      return new Response(JSON.stringify({
        id: deploymentId,
        url: deploymentUrl,
        readyState: "READY",
        target: "production",
        projectId: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
        project: { id: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1", name: "mais-mvp" },
        ownerId: "team_i9xhhYXUeYBOCLcfWBjTqlYG",
        team: { id: "team_i9xhhYXUeYBOCLcfWBjTqlYG", slug: "peter-dongpin-hu-s-projects" }
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(null, { status: 404 });
  };
  assert.deepEqual(await readParentProductionAcceptanceRuntime({
    env: context,
    fetchImpl,
    releaseRecord: exactReleaseRecord(),
    target
  }), validRuntime);
  assert.deepEqual(calls, [
    { pathname: "/v9/projects/prj_rjuY7fXculXzklpoG1L8xg7Tfdr1", searchKeys: ["teamId"], authorizationPresent: true },
    { pathname: "/v3/env/pull/prj_rjuY7fXculXzklpoG1L8xg7Tfdr1/production", searchKeys: ["source", "teamId"], authorizationPresent: true },
    { pathname: "/v13/deployments/www.mais.ac", searchKeys: ["teamId"], authorizationPresent: true },
    { pathname: "/v13/deployments/www.mais.hk", searchKeys: ["teamId"], authorizationPresent: true }
  ]);

  await assert.rejects(
    readParentProductionAcceptanceRuntime({
      env: { ...context, GITHUB_REF_PROTECTED: "false" },
      fetchImpl: async () => { throw new Error("must not fetch"); },
      releaseRecord: exactReleaseRecord(),
      target
    }),
    /provider runtime failed/i
  );
  await assert.rejects(
    readParentProductionAcceptanceRuntime({
      env: context,
      fetchImpl: async (input, init) => {
        const response = await fetchImpl(input, init);
        const url = new URL(String(input));
        if (url.pathname === "/v13/deployments/www.mais.hk") {
          const payload = await response.json();
          payload.id = "dpl_DifferentDeployment123456";
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
        return response;
      },
      releaseRecord: exactReleaseRecord(),
      target
    }),
    /provider runtime failed/i
  );
  await assert.rejects(
    readParentProductionAcceptanceRuntime({
      env: context,
      fetchImpl: async (input, init) => {
        const response = await fetchImpl(input, init);
        const url = new URL(String(input));
        if (url.pathname.startsWith("/v13/deployments/www.mais.")) {
          const payload = await response.json();
          payload.id = "dpl_OtherSharedDeployment123456";
          payload.url = "https://other-shared-fixture.vercel.app";
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
        return response;
      },
      releaseRecord: exactReleaseRecord(),
      target
    }),
    /provider runtime failed/i
  );
  assert.throws(
    () => buildParentProductionAcceptanceRuntime({
      runtimeEnvironment: validRuntime,
      buildEnvironment: { ...validRuntime, TEACHER_NOTICE_BASE_URL: "https://www.mais.ac" },
      target
    }),
    /provider runtime failed/i
  );
});

test("production acceptance workflow is protected-main-only, serialized, exact-artifact-bound, and non-deploying", async () => {
  const workflowPath = path.join(process.cwd(), ".github", "workflows", "parent-production-acceptance.yml");
  const source = await readFile(workflowPath, "utf8");
  const workflow = parseYaml(source);
  assert.equal(workflow.name, "MAIS parent production acceptance");
  assert.deepEqual(workflow.permissions, { actions: "read", contents: "read" });
  assert.deepEqual(workflow.concurrency, {
    group: "mais-production-schema-deploy-promote-v1",
    "cancel-in-progress": false
  });
  const inputs = workflow.on.workflow_dispatch.inputs;
  for (const key of [
    "candidate_sha",
    "candidate_tree_sha",
    "release_run_id",
    "release_run_attempt",
    "synthetic_test_family_id",
    "allow_production_writes",
    "allow_resend_test_delivery",
    "confirmation"
  ]) {
    assert.equal(inputs[key].required, true, `${key} must be explicit`);
  }
  assert.equal(inputs.allow_production_writes.type, "boolean");
  assert.equal(inputs.allow_resend_test_delivery.type, "boolean");
  const job = workflow.jobs.acceptance;
  assert.equal(job.environment, "production");
  assert.equal(job["timeout-minutes"], 45);
  const checkout = job.steps.find((step) => String(step.name).includes("Check out"));
  assert.equal(checkout.uses, "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683");
  assert.deepEqual(checkout.with, {
    ref: "${{ github.sha }}",
    "fetch-depth": 1,
    "persist-credentials": false
  });
  const binding = job.steps.find((step) => step.name === "Bind protected main tooling and exact deployed candidate");
  assert.match(binding.run, /GITHUB_REF_PROTECTED.*true/u);
  assert.match(binding.run, /parent-production-acceptance\.yml@refs\/heads\/main/u);
  assert.match(binding.run, /ALLOW_PRODUCTION_WRITES.*true/u);
  assert.match(binding.run, /ALLOW_RESEND_TEST_DELIVERY.*true/u);
  assert.match(binding.run, /git status --porcelain=v1 --untracked-files=all/u);
  const download = job.steps.find((step) => step.name === "Download exact production release record");
  assert.equal(download.env.RELEASE_RUN_ID, "${{ inputs.release_run_id }}");
  assert.equal(download.env.RELEASE_RUN_ATTEMPT, "${{ inputs.release_run_attempt }}");
  assert.match(download.run, /gh api "repos\/\$GITHUB_REPOSITORY\/actions\/runs\/\$RELEASE_RUN_ID"/u);
  assert.match(download.run, /production-deploy\.yml/u);
  assert.match(download.run, /head_sha/u);
  assert.match(download.run, /conclusion.*success/u);
  assert.match(download.run, /gh run download "\$RELEASE_RUN_ID"/u);
  assert.match(download.run, /mais-production-release-\$RELEASE_RUN_ID-\$RELEASE_RUN_ATTEMPT/u);
  assert.match(download.run, /MAIS_PARENT_RELEASE_RECORD_PATH/u);
  const execute = job.steps.find((step) => step.name === "Run dedicated synthetic-family acceptance");
  assert.equal(execute.env.GITHUB_TOKEN, "${{ secrets.MAIS_RELEASE_GITHUB_TOKEN }}");
  assert.equal(execute.env.MAIS_PARENT_PRODUCTION_ACCEPTANCE_ENV_SOURCE, "vercel-api-pull-v1");
  assert.equal(execute.env.VERCEL_TOKEN, "${{ secrets.VERCEL_TOKEN }}");
  assert.match(execute.run, /node scripts\/parent-production-acceptance\.mjs/u);
  assert.match(execute.run, /--allow-production-writes/u);
  assert.match(execute.run, /--allow-resend-test-delivery/u);
  assert.doesNotMatch(source, /vercel\s+(?:deploy|promote|rollback)|npm run vercel:production|schema-confirm|teacher-notice-production-schema-gate/u);
  const ciSource = await readFile(path.join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8");
  assert.match(ciSource, /scripts\/parent-production-acceptance\.test\.mjs/u);
});

test("synthetic family credentials are deterministic, role-separated, and restricted to Resend test delivery", () => {
  const first = deriveSyntheticFamilyAccounts({
    syntheticFamilyId: familyId,
    secret: validRuntime.TEACHER_NOTICE_HEALTH_SECRET
  });
  const replay = deriveSyntheticFamilyAccounts({
    syntheticFamilyId: familyId,
    secret: validRuntime.TEACHER_NOTICE_HEALTH_SECRET
  });
  assert.deepEqual(first, replay);
  assert.deepEqual(Object.keys(first).sort(), ["parent", "student", "teacher"]);
  assert.match(first.teacher.username, /^mais-prod-[a-f0-9]{16}-teacher@example\.test$/u);
  assert.match(first.student.username, /^mais-prod-[a-f0-9]{16}-student@example\.test$/u);
  assert.match(first.parent.username, /^delivered\+mais-prod-[a-f0-9]{16}@resend\.dev$/u);
  assert.equal(first.parent.email, first.parent.username);
  assert.equal(first.student.email, first.student.username);
  assert.equal(first.teacher.email, first.teacher.username);
  assert.notEqual(first.parent.password, first.student.password);
  assert.notEqual(first.parent.password, first.teacher.password);
  assert.match(first.parent.password, /^Mais![A-Za-z0-9_-]{43}$/u);

  assert.throws(
    () => deriveSyntheticFamilyAccounts({ syntheticFamilyId: "family", secret: validRuntime.TEACHER_NOTICE_HEALTH_SECRET }),
    /synthetic test family/i
  );
  assert.throws(
    () => deriveSyntheticFamilyAccounts({ syntheticFamilyId: familyId, secret: "short" }),
    /credential.*unavailable/i
  );
});

test("production session cookies and private parent responses are inspected without retaining values", () => {
  const cookie = inspectProductionSessionCookie(
    "hk_math_session=opaque-secret-value; Path=/; Expires=Fri, 28 Aug 2027 00:00:00 GMT; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax"
  );
  assert.deepEqual(cookie, {
    name: "hk_math_session",
    domain: "host-only",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    expiresType: "persistent"
  });
  assert.doesNotMatch(JSON.stringify(cookie), /opaque-secret-value/u);

  const issuanceHeaders = new Headers({
    "cache-control": "private, no-store, max-age=0",
    "cdn-cache-control": "private, no-store",
    "content-type": "application/json; charset=utf-8",
    "set-cookie": "hk_math_session=opaque-secret-value; Path=/; Expires=Fri, 28 Aug 2027 00:00:00 GMT; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax",
    "x-vercel-cache": "MISS"
  });
  assert.deepEqual(inspectSessionIssuanceResponseHeaders(issuanceHeaders), {
    ...cookie,
    cacheControlPrivate: true,
    cacheControlNoStore: true,
    contentTypeJson: true,
    vercelCacheSafe: true
  });
  assert.doesNotMatch(JSON.stringify(inspectSessionIssuanceResponseHeaders(issuanceHeaders)), /opaque-secret-value/u);
  assert.throws(
    () => inspectSessionIssuanceResponseHeaders(new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
      "set-cookie": issuanceHeaders.get("set-cookie"),
      "x-vercel-cache": "HIT"
    })),
    /session issuance header contract failed/i
  );

  const headers = new Headers({
    "cache-control": "private, no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-vercel-cache": "MISS"
  });
  assert.deepEqual(inspectParentPrivateResponseHeaders(headers), {
    cacheControlPrivate: true,
    cacheControlNoStore: true,
    contentTypeJson: true,
    noSetCookie: true,
    vercelCacheSafe: true
  });

  for (const unsafe of [
    { "cache-control": "public, max-age=60", "content-type": "application/json" },
    { "cache-control": "private, no-store", "content-type": "application/json", "set-cookie": "leak=1" },
    { "cache-control": "private, no-store", "content-type": "application/json", "x-vercel-cache": "HIT" },
    { "cache-control": "private, no-store", "content-type": "application/json", "x-vercel-cache": "UNEXPECTED" }
  ]) {
    assert.throws(
      () => inspectParentPrivateResponseHeaders(new Headers(unsafe)),
      /private response header contract failed/i
    );
  }
});

function privateHeaders(instanceProof) {
  return new Headers({
    "cache-control": "private, no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-vercel-cache": "MISS",
    "x-mais-production-instance-proof": instanceProof
  });
}

function thread(body, messageCount = 1) {
  return {
    id: "thread-sensitive-id",
    messages: Array.from({ length: messageCount }, (_, index) => ({
      id: `entry-sensitive-${index}`,
      senderRole: "parent",
      body
    }))
  };
}

test("concurrent parent message evidence requires one durable write across at least two production processes", () => {
  const createMarker = "synthetic create marker";
  const create = validateConcurrentParentMessageEvidence({
    kind: "create",
    marker: createMarker,
    responses: [
      { status: 201, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: false, thread: thread(createMarker) } },
      { status: 200, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: true, thread: thread(createMarker) } },
      { status: 200, headers: privateHeaders(`v1.${"B".repeat(22)}`), body: { replayed: true, thread: thread(createMarker) } },
      { status: 200, headers: privateHeaders(`v1.${"B".repeat(22)}`), body: { replayed: true, thread: thread(createMarker) } }
    ]
  });
  assert.deepEqual(create, {
    requestCount: 4,
    createdCount: 1,
    replayedCount: 3,
    distinctInstanceCount: 2,
    persistedExactlyOnce: true
  });
  assert.doesNotMatch(JSON.stringify(create), /thread-sensitive|entry-sensitive|synthetic create marker/u);

  const replyMarker = "synthetic reply marker";
  const reply = validateConcurrentParentMessageEvidence({
    kind: "reply",
    marker: replyMarker,
    responses: [
      {
        status: 201,
        headers: privateHeaders(`v1.${"C".repeat(22)}`),
        body: { replayed: false, entryId: "reply-sensitive-id", thread: thread(replyMarker) }
      },
      {
        status: 200,
        headers: privateHeaders(`v1.${"D".repeat(22)}`),
        body: { replayed: true, entryId: "reply-sensitive-id", thread: thread(replyMarker) }
      }
    ]
  });
  assert.deepEqual(reply, {
    requestCount: 2,
    createdCount: 1,
    replayedCount: 1,
    distinctInstanceCount: 2,
    persistedExactlyOnce: true
  });

  const unsafeCases = [
    [
      { status: 201, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: false, thread: thread(createMarker) } },
      { status: 200, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: true, thread: thread(createMarker) } }
    ],
    [
      { status: 201, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: false, thread: thread(createMarker, 2) } },
      { status: 200, headers: privateHeaders(`v1.${"B".repeat(22)}`), body: { replayed: true, thread: thread(createMarker, 2) } }
    ],
    [
      { status: 201, headers: privateHeaders(`v1.${"A".repeat(22)}`), body: { replayed: false, thread: thread(createMarker) } },
      { status: 200, headers: privateHeaders(`v1.${"B".repeat(22)}`), body: { replayed: true, thread: { ...thread(createMarker), id: "other-thread" } } }
    ]
  ];
  for (const responses of unsafeCases) {
    assert.throws(
      () => validateConcurrentParentMessageEvidence({ kind: "create", marker: createMarker, responses }),
      /concurrent parent message evidence failed/i
    );
  }
});

test("Resend delivery and webhook progress accept only the official delivered test channel", () => {
  const recipient = "delivered+mais-prod-0123456789abcdef@resend.dev";
  const subject = "MAIS synthetic parent delivery acceptance";
  const provider = validateResendTestDeliveryEvidence({
    recipient,
    subject,
    payload: {
      object: "email",
      id: "provider-sensitive-id",
      to: [recipient],
      subject,
      last_event: "delivered",
      created_at: "2026-08-28T10:00:00.000Z"
    }
  });
  assert.deepEqual(provider, {
    officialTestRecipient: true,
    providerAccepted: true,
    providerDelivered: true
  });
  assert.doesNotMatch(JSON.stringify(provider), /provider-sensitive|resend\.dev/u);
  const listed = {
    object: "list",
    has_more: false,
    data: [{
      id: "provider-sensitive-id",
      to: [recipient],
      subject,
      last_event: "delivered",
      created_at: "2026-08-28T10:00:00.000Z"
    }]
  };
  assert.deepEqual(selectSingleResendTestDelivery(listed, { recipient, subject }), {
    id: "provider-sensitive-id",
    delivered: true
  });
  assert.throws(
    () => selectSingleResendTestDelivery({ ...listed, data: [...listed.data, { ...listed.data[0], id: "duplicate-id" }] }, { recipient, subject }),
    /Resend test delivery list evidence failed/i
  );

  const health = (delivered, overrides = {}) => ({
    health: {
      status: "healthy",
      reasons: [],
      observedAt: "2026-08-28T10:05:00.000Z",
      scheduler: {
        heartbeatStatus: "succeeded",
        heartbeatAgeSeconds: 30,
        candidateMatch: true,
        lastFailureAgeSeconds: null
      },
      providerEvents: {
        counts: {
          bounced: 0,
          complained: 0,
          delivered,
          deliveryDelayed: 0,
          failed: 0,
          sent: delivered,
          suppressed: 0
        },
        latestReceivedAt: delivered ? "2026-08-28T10:04:00.000Z" : null,
        windowSeconds: 900
      },
      webhookReconciliation: { unmatchedCount: 0, oldestUnmatchedAgeSeconds: null },
      outbox: {
        actionableCount: 0,
        counts: { blocked: 0, deadLetter: 0, leased: 0, pending: 0, providerAccepted: 1, retryable: 0 },
        oldestActionableAgeSeconds: null,
        recentTerminalCounts: { blocked: 0, deadLetter: 0 },
        staleLeaseCount: 0
      },
      ...overrides
    }
  });
  assert.deepEqual(validateTeacherNoticeHealthProgress({ before: health(0), after: health(1) }), {
    deliveredEventDelta: 1,
    schedulerHealthy: true,
    webhookReconciled: true,
    outboxSettled: true
  });

  assert.throws(
    () => validateResendTestDeliveryEvidence({
      recipient: "person@example.com",
      subject,
      payload: { id: "provider-id", to: ["person@example.com"], subject, last_event: "delivered" }
    }),
    /Resend test delivery evidence failed/i
  );
  assert.throws(
    () => validateTeacherNoticeHealthProgress({ before: health(1), after: health(1) }),
    /teacher notice health progress failed/i
  );
});

test("full acceptance orchestration keeps credentials and durable identifiers out of its report", async () => {
  const state = {
    classCreated: false,
    className: "",
    createCount: 0,
    replyCount: 0,
    noticeCreated: false,
    noticeSubject: "",
    parentRecipient: "",
    providerQueued: false,
    acknowledgedAt: "2026-08-28T10:09:00.000Z"
  };
  const sensitive = {
    teacherId: "teacher-sensitive-id",
    studentId: "student-sensitive-id",
    parentId: "parent-sensitive-id",
    classId: "class-sensitive-id",
    threadId: "thread-sensitive-id",
    entryId: "entry-sensitive-id",
    noticeId: "notice-sensitive-id",
    recipientId: "recipient-sensitive-id",
    providerId: "provider-sensitive-id",
    cookie: "opaque-sensitive-cookie-value",
    invite: `MAIS-${"A".repeat(24)}`
  };
  const roleIds = {
    teacher: sensitive.teacherId,
    student: sensitive.studentId,
    parent: sensitive.parentId
  };
  let instanceCounter = 0;
  let toolingVerificationCalls = 0;
  let deploymentVerificationCalls = 0;
  const cookieFor = (origin, role) => `hk_math_session=opaque-${new URL(origin).hostname}-${role}`;

  const headers = (extra = {}) => new Headers({
    "cache-control": "private, no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-vercel-cache": "MISS",
    ...extra
  });
  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
    status,
    headers: headers(extra)
  });
  const health = (delivered) => ({
    health: {
      status: "healthy",
      reasons: [],
      observedAt: "2026-08-28T10:10:00.000Z",
      scheduler: {
        heartbeatStatus: "succeeded",
        heartbeatAgeSeconds: 10,
        candidateMatch: true,
        lastFailureAgeSeconds: null
      },
      providerEvents: {
        counts: {
          bounced: 0,
          complained: 0,
          delivered,
          deliveryDelayed: 0,
          failed: 0,
          sent: delivered,
          suppressed: 0
        },
        latestReceivedAt: delivered ? "2026-08-28T10:09:30.000Z" : null,
        windowSeconds: 900
      },
      webhookReconciliation: { unmatchedCount: 0, oldestUnmatchedAgeSeconds: null },
      outbox: {
        actionableCount: 0,
        counts: { blocked: 0, deadLetter: 0, leased: 0, pending: 0, providerAccepted: 1, retryable: 0 },
        oldestActionableAgeSeconds: null,
        recentTerminalCounts: { blocked: 0, deadLetter: 0 },
        staleLeaseCount: 0
      }
    }
  });

  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    if (url.hostname === "api.resend.com") {
      assert.equal(init.headers.authorization, `Bearer ${validRuntime.TEACHER_NOTICE_RESEND_API_KEY}`);
      if (url.pathname === "/emails") {
        return json({
          object: "list",
          has_more: false,
          data: state.providerQueued ? [{
            id: sensitive.providerId,
            to: [state.parentRecipient],
            from: "MAIS <teacher-notices@example.test>",
            created_at: "2026-08-28T10:08:00.000Z",
            subject: state.noticeSubject,
            bcc: null,
            cc: null,
            reply_to: null,
            last_event: "delivered",
            scheduled_at: null
          }] : []
        });
      }
      if (url.pathname === `/emails/${sensitive.providerId}`) {
        return json({
          object: "email",
          id: sensitive.providerId,
          to: [state.parentRecipient],
          from: "MAIS <teacher-notices@example.test>",
          created_at: "2026-08-28T10:08:00.000Z",
          subject: state.noticeSubject,
          html: "<p>synthetic</p>",
          text: null,
          bcc: [],
          cc: [],
          reply_to: [],
          last_event: "delivered",
          scheduled_at: null,
          tags: []
        });
      }
    }
    if (url.pathname === "/api/auth/register" && method === "POST") {
      const role = body.role ?? "student";
      if (role === "parent") state.parentRecipient = body.email;
      return json(
        { user: { id: roleIds[role], role, name: body.name, username: body.username } },
        200,
        {
          "set-cookie": `${cookieFor(url.origin, role)}; Path=/; Expires=Fri, 28 Aug 2027 00:00:00 GMT; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`
        }
      );
    }
    if (url.pathname === "/api/auth/login" && method === "POST") {
      const role = body.username.includes("-teacher@")
        ? "teacher"
        : body.username.includes("-student@")
          ? "student"
          : "parent";
      return json(
        { user: { id: roleIds[role], role, name: `Synthetic ${role}`, username: body.username } },
        200,
        {
          "set-cookie": `${cookieFor(url.origin, role)}; Path=/; Expires=Fri, 28 Aug 2027 00:00:00 GMT; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`
        }
      );
    }
    if (url.pathname === "/api/teacher/classes" && method === "GET") {
      return json({
        classes: state.classCreated ? [{ id: sensitive.classId, name: state.className }] : []
      });
    }
    if (url.pathname === "/api/me" && method === "GET") {
      if (init.headers.cookie !== cookieFor(url.origin, "parent")) {
        return json({ error: "Not authenticated." }, 401);
      }
      return json({ user: { id: sensitive.parentId, role: "parent", name: "Synthetic Parent" } });
    }
    if (url.pathname === "/api/teacher/classes" && method === "POST") {
      state.classCreated = true;
      state.className = body.name;
      return json({ class: { id: sensitive.classId, name: state.className } }, 201);
    }
    if (url.pathname === `/api/teacher/classes/${sensitive.classId}/students` && method === "POST") {
      return json({ ok: true }, 201);
    }
    if (
      url.pathname === `/api/teacher/classes/${sensitive.classId}/students/${sensitive.studentId}/guardian-invitations` &&
      method === "POST"
    ) {
      return json({
        invitation: {
          token: sensitive.invite,
          version: 1,
          expiresAt: "2026-08-29T10:00:00.000Z"
        }
      }, 201);
    }
    if (url.pathname === "/api/parent/children/link" && method === "POST") {
      return json({ link: { status: "active" } });
    }
    if (url.pathname === "/api/parent/foundation" && method === "GET") {
      return json({
        data: {
          parent: { id: sensitive.parentId, name: "Synthetic Parent" },
          children: [{ student: { id: sensitive.studentId, name: "Synthetic Student", grade: "S3" } }],
          selectedChild: { student: { id: sensitive.studentId, name: "Synthetic Student", grade: "S3" } },
          totals: { children: 1, activeReports: 0, openMessages: 1, pendingAssignments: 0 }
        }
      });
    }
    if (url.pathname === "/api/parent/messages" && method === "POST") {
      state.createCount += 1;
      instanceCounter += 1;
      const created = state.createCount === 1;
      return json({
        replayed: !created,
        thread: {
          id: sensitive.threadId,
          messages: [{ id: "create-entry-sensitive", senderRole: "parent", body: body.body }]
        }
      }, created ? 201 : 200, {
        "x-mais-production-instance-proof": `v1.${instanceCounter % 2 ? "A".repeat(22) : "B".repeat(22)}`
      });
    }
    if (url.pathname === `/api/parent/messages/${sensitive.threadId}/reply` && method === "POST") {
      state.replyCount += 1;
      instanceCounter += 1;
      const created = state.replyCount === 1;
      return json({
        replayed: !created,
        entryId: sensitive.entryId,
        thread: {
          id: sensitive.threadId,
          messages: [
            { id: "create-entry-sensitive", senderRole: "parent", body: "MAIS synthetic create acceptance" },
            { id: sensitive.entryId, senderRole: "parent", body: body.body }
          ]
        }
      }, created ? 201 : 200, {
        "x-mais-production-instance-proof": `v1.${instanceCounter % 2 ? "A".repeat(22) : "B".repeat(22)}`
      });
    }
    if (url.pathname === "/api/parent/messages" && method === "GET") {
      return json({
        data: {
          threads: [{
            id: sensitive.threadId,
            messages: [
              { id: "create-entry-sensitive", senderRole: "parent", body: "MAIS synthetic create acceptance" },
              { id: sensitive.entryId, senderRole: "parent", body: "MAIS synthetic reply acceptance" }
            ]
          }]
        }
      });
    }
    if (url.pathname === "/api/health/teacher-notices" && method === "GET") {
      return json(health(state.providerQueued ? 1 : 0));
    }
    if (url.pathname === "/api/teacher/notices" && method === "GET") {
      return json({
        notices: state.noticeCreated ? [{
          id: sensitive.noticeId,
          subject: { en: state.noticeSubject, zh: state.noticeSubject },
          recipients: [{ id: sensitive.recipientId }]
        }] : []
      });
    }
    if (url.pathname === "/api/teacher/notices" && method === "POST") {
      state.noticeCreated = true;
      state.noticeSubject = body.subject;
      return json({
        notice: {
          id: sensitive.noticeId,
          subject: { en: state.noticeSubject, zh: state.noticeSubject },
          acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
        }
      }, 201);
    }
    if (url.pathname === `/api/teacher/notices/${sensitive.noticeId}/deliveries` && method === "POST") {
      state.providerQueued = true;
      return json({
        notice: { id: sensitive.noticeId },
        attempt: { id: "attempt-sensitive-id", status: "disabled" },
        email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
      }, 202);
    }
    if (url.pathname === "/api/parent/notices" && method === "GET") {
      return json({
        data: {
          notices: [{
            id: sensitive.noticeId,
            subject: { en: state.noticeSubject, zh: state.noticeSubject },
            recipients: [{
              id: sensitive.recipientId,
              status: "pending",
              acknowledgedAt: null
            }]
          }]
        }
      });
    }
    if (url.pathname === `/api/parent/notices/${sensitive.recipientId}/ack` && method === "POST") {
      return json({
        receipt: {
          recipientId: sensitive.recipientId,
          status: "acknowledged",
          acknowledgedAt: state.acknowledgedAt
        }
      });
    }
    throw new Error(`Unexpected fixture request: ${method} ${url.origin}${url.pathname}`);
  };

  const report = await runParentProductionAcceptance({
    toolingSha: "c".repeat(40),
    toolingTreeSha: "d".repeat(40),
    executionId: "123456789:1",
    candidateSha,
    treeSha,
    syntheticFamilyId: familyId,
    target,
    releaseRecord: exactReleaseRecord(),
    runtime: validRuntime,
    fetchImpl,
    sleep: async () => undefined,
    concurrency: 4,
    maxReplayBatches: 1,
    providerPollAttempts: 1,
    healthPollAttempts: 1,
    verifyToolingChecks: async (input) => {
      toolingVerificationCalls += 1;
      assert.equal(input.candidateSha, "c".repeat(40));
      assert.equal(input.expectedTreeSha, "d".repeat(40));
      return { verified: true };
    },
    verifyCurrentDeployment: async (input) => {
      deploymentVerificationCalls += 1;
      assert.deepEqual(input.releaseRecord, exactReleaseRecord());
      if (deploymentVerificationCalls === 1) {
        assert.equal(state.createCount, 0);
        assert.equal(state.noticeCreated, false);
      } else {
        assert.ok(state.createCount > 0);
        assert.ok(state.replyCount > 0);
        assert.equal(state.noticeCreated, true);
        assert.equal(state.providerQueued, true);
      }
      return { providerBound: true };
    },
    toolingEnv: { GITHUB_TOKEN: "fixture-token" },
    repoRoot: process.cwd()
  });
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.candidateSha, candidateSha);
  assert.equal(report.toolingSha, "c".repeat(40));
  assert.equal(report.toolingTreeSha, "d".repeat(40));
  assert.equal(report.toolingCiBound, true);
  assert.equal(toolingVerificationCalls, 1);
  assert.equal(deploymentVerificationCalls, 2);
  assert.deepEqual(report.currentProductionDeployment, {
    preflightBound: true,
    postflightBound: true
  });
  assert.equal(report.executionId, "123456789:1");
  assert.equal(report.treeSha, treeSha);
  assert.equal(report.syntheticFamilyId, familyId);
  assert.deepEqual(report.accounts, {
    teacher: { role: "teacher", created: true, cookieContract: true },
    student: { role: "student", created: true, cookieContract: true },
    parent: { role: "parent", created: true, cookieContract: true }
  });
  assert.equal(report.family.classReady, true);
  assert.equal(report.cookie.authenticatedAcrossAliases, true);
  assert.equal(report.family.enrollmentReady, true);
  assert.equal(report.family.guardianLinkReady, true);
  assert.equal(report.idempotency.create.distinctInstanceCount, 2);
  assert.equal(report.idempotency.reply.distinctInstanceCount, 2);
  assert.equal(report.notification.provider.providerDelivered, true);
  assert.equal(report.notification.health.deliveredEventDelta, 1);
  assert.equal(report.notification.acknowledged, true);
  const serialized = JSON.stringify(report);
  for (const value of Object.values(sensitive)) {
    assert.doesNotMatch(serialized, new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
  assert.doesNotMatch(serialized, /TEACHER_NOTICE|CRON_SECRET|re_[A-Za-z0-9]|@resend\.dev|@example\.test/u);
});
