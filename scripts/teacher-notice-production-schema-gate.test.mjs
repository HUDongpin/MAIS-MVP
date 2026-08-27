import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  applyMaisProductionSchemaOperations,
  assertTeacherNoticeProductionSchemaConfirmation,
  applyTeacherNoticeProductionSchema,
  buildTeacherNoticeProductionSchemaGitEnvironment,
  buildTeacherNoticeProductionSchemaPlan,
  buildTeacherNoticeProductionSchemaPreflightEvidence,
  preflightTeacherNoticeProductionSchema,
  teacherNoticeProductionSchemaFailureComponent,
  teacherNoticeProductionSchemaFailureReason,
  teacherNoticeProductionSchemaFailureStage,
  teacherNoticeProductionSchemaPartialReasonComponent
} from "./teacher-notice-production-schema-gate.mjs";

const candidateSha = "a".repeat(40);
const expectedTreeSha = "b".repeat(40);
const targetFingerprint = "c".repeat(64);
const productionUrl = "postgresql://secret-user:secret-password@db.example.invalid:5432/secret-production?sslmode=require";

function injectedProductionEnvironment(overrides = {}) {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_REPOSITORY: "HUDongpin/MAIS-MVP",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_ID: "123456789",
    GITHUB_SHA: candidateSha,
    GITHUB_WORKFLOW_REF:
      "HUDongpin/MAIS-MVP/.github/workflows/production-deploy.yml@refs/heads/main",
    MAIS_PRODUCTION_SCHEMA_ENV_SOURCE: "vercel-api-pull-v1",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    ...overrides
  };
}

test("schema gate Git children receive no provider or confirmation credentials", async () => {
  const parentEnv = {
    ...injectedProductionEnvironment(),
    TMPDIR: "/tmp/schema-gate-fixture",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
    POSTGRES_URL: productionUrl,
    RESEND_API_KEY: "fixture-resend-key-not-real",
    QWEN_API_KEY: "fixture-qwen-key-not-real",
    GITHUB_TOKEN: "fixture-github-token-not-real"
  };
  const childEnv = buildTeacherNoticeProductionSchemaGitEnvironment(parentEnv);
  assert.equal(childEnv.PATH, parentEnv.PATH);
  assert.equal(childEnv.TMPDIR, parentEnv.TMPDIR);
  assert.equal(childEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(childEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(childEnv.GIT_OPTIONAL_LOCKS, "0");
  for (const key of [
    "VERCEL_TOKEN",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM",
    "POSTGRES_URL",
    "RESEND_API_KEY",
    "QWEN_API_KEY",
    "GITHUB_TOKEN"
  ]) {
    assert.equal(childEnv[key], undefined, `${key} must not reach a schema-gate Git child`);
  }

  const gitEnvironments = [];
  const runner = cleanGitRunner();
  await preflightTeacherNoticeProductionSchema(preflightDependencies({
    env: parentEnv,
    runCommand: async (command, args, options) => {
      assert.equal(command, "git");
      gitEnvironments.push(options.env);
      return runner(command, args, options);
    }
  }));
  assert.equal(gitEnvironments.length, 8);
  for (const env of gitEnvironments) {
    assert.deepEqual(env, childEnv);
  }
});

function cleanGitRunner() {
  return async (_command, args) => {
    const joined = args.join(" ");
    if (joined === "rev-parse --show-object-format") {
      return { exitCode: 0, stdout: Buffer.from("sha1\n") };
    }
    if (joined === "rev-parse --verify HEAD") {
      return { exitCode: 0, stdout: Buffer.from(`${candidateSha}\n`) };
    }
    if (joined === `rev-parse --verify ${candidateSha}^{tree}`) {
      return { exitCode: 0, stdout: Buffer.from(`${expectedTreeSha}\n`) };
    }
    if (joined === "status --porcelain=v1 -z --untracked-files=all") {
      return { exitCode: 0, stdout: Buffer.alloc(0) };
    }
    throw new Error(`unexpected test command: ${joined}`);
  };
}

function providerPullFetchJson({
  buildUrlValue,
  projectAccountId = "team_i9xhhYXUeYBOCLcfWBjTqlYG",
  productionUrlValue = productionUrl,
  pullPayload
} = {}) {
  return async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.vercel.com");
    assert.equal(parsed.searchParams.get("teamId"), "team_i9xhhYXUeYBOCLcfWBjTqlYG");
    if (parsed.pathname === "/v9/projects/prj_rjuY7fXculXzklpoG1L8xg7Tfdr1") {
      return {
        accountId: projectAccountId,
        id: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
        name: "mais-mvp"
      };
    }
    assert.equal(
      parsed.pathname,
      "/v3/env/pull/prj_rjuY7fXculXzklpoG1L8xg7Tfdr1/production"
    );
    assert.equal(parsed.searchParams.get("source"), "vercel-cli:env:run");
    return pullPayload ?? {
      env: {
        HK_MATH_ENABLE_DEMO_USER: "false",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: productionUrlValue
      },
      buildEnv: {
        HK_MATH_ENABLE_DEMO_USER: "false",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: buildUrlValue ?? productionUrlValue
      }
    };
  };
}

function databaseInspection(overrides = {}) {
  const {
    databaseIdentity: identityOverrides = {},
    statistics: statisticOverrides = {},
    ...stateOverrides
  } = overrides;
  return {
    appStorageSeedMode: "demo-disabled",
    appStorageState: "exact",
    databaseIdentity: {
      databaseName: "secret-production",
      databaseOid: "16401",
      serverVersionNum: "160004",
      ...identityOverrides
    },
    heartbeatState: "empty",
    outboxState: "exact",
    statistics: {
      indexBytes: "8192",
      rowEstimate: "42",
      tableBytes: "16384",
      ...statisticOverrides
    },
    webhookState: "upgradeable",
    ...stateOverrides
  };
}

function preflightDependencies(overrides = {}) {
  return {
    candidateSha,
    connectPostgres: async () => ({ end: async () => {} }),
    expectedTreeSha,
    env: injectedProductionEnvironment(),
    fetchJsonImpl: providerPullFetchJson(),
    inspectDatabase: async () => databaseInspection(),
    readTokenImpl: async () => "vct_test_token_value_1234567890",
    repoRoot: process.cwd(),
    runCommand: cleanGitRunner(),
    ...overrides
  };
}

test("builds the exact production migration plan from independently attested schema states", () => {
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "empty",
      heartbeatState: "empty",
      outboxState: "empty",
      webhookState: "empty"
    }),
    [
      "app-storage-install-v1",
      "outbox-install-v2",
      "webhook-install-v3",
      "heartbeat-install-v2"
    ]
  );
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "empty",
      outboxState: "exact",
      webhookState: "upgradeable"
    }),
    ["webhook-v2-to-v3", "heartbeat-install-v2"]
  );
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "v1",
      outboxState: "exact",
      webhookState: "exact"
    }),
    ["heartbeat-v1-to-v2"]
  );
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "exact",
      outboxState: "exact",
      webhookState: "exact"
    }),
    []
  );
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "legacy-no-readiness-marker",
      heartbeatState: "exact",
      outboxState: "exact",
      webhookState: "exact"
    }),
    ["app-storage-complete-readiness-v1"]
  );
  assert.deepEqual(
    buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "legacy-v1-compatibility-no-readiness-marker",
      heartbeatState: "exact",
      outboxState: "exact",
      webhookState: "exact"
    }),
    ["app-storage-upgrade-legacy-compat-readiness-v2"]
  );
  assert.throws(
    () => buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "partial",
      outboxState: "exact",
      webhookState: "exact"
    }),
    /rejected/u
  );
  assert.throws(
    () => buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "exact",
      outboxState: "partial",
      webhookState: "exact"
    }),
    /rejected/u
  );
  assert.throws(
    () => buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState: "exact",
      outboxState: "empty",
      webhookState: "upgradeable"
    }),
    /rejected/u
  );
  assert.throws(
    () => buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "partial",
      heartbeatState: "exact",
      outboxState: "exact",
      webhookState: "exact"
    }),
    /rejected/u
  );
});

test("combined apply runs the canonical app bootstrap before notice DDL and restores production seed secrets", { concurrency: false }, async () => {
  const originalPassword = process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD;
  delete process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD;
  const stages = [];
  const client = { begin: async () => undefined };
  const productionEnvironment = {
    HK_MATH_ENABLE_DEMO_USER: "false",
    HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
    HK_MATH_STORAGE_PROVIDER: "postgres",
    MAIS_BOOTSTRAP_ADMIN_PASSWORD: "fixture-bootstrap-password-never-output"
  };

  try {
    await applyMaisProductionSchemaOperations(
      client,
      [
        "app-storage-install-v1",
        "outbox-install-v2",
        "webhook-install-v3",
        "heartbeat-install-v2"
      ],
      productionEnvironment,
      {
        applyAppStorageSchema: async (receivedClient, expectedState) => {
          assert.equal(receivedClient, client);
          assert.equal(expectedState, "empty");
          assert.equal(
            process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD,
            productionEnvironment.MAIS_BOOTSTRAP_ADMIN_PASSWORD
          );
          stages.push("app-storage");
        },
        applyTeacherNoticeSchema: async (receivedClient, operations) => {
          assert.equal(receivedClient, client);
          assert.deepEqual(operations, [
            "outbox-install-v2",
            "webhook-install-v3",
            "heartbeat-install-v2"
          ]);
          assert.equal(process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD, undefined);
          stages.push("teacher-notice");
        }
      }
    );
    assert.deepEqual(stages, ["app-storage", "teacher-notice"]);
    assert.equal(process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD, undefined);
  } finally {
    if (originalPassword === undefined) delete process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD;
    else process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD = originalPassword;
  }

  await assert.rejects(
    applyMaisProductionSchemaOperations(
      client,
      ["outbox-install-v2", "app-storage-install-v1"],
      productionEnvironment,
      {
        applyAppStorageSchema: async () => { throw new Error("must not run"); },
        applyTeacherNoticeSchema: async () => { throw new Error("must not run"); }
      }
    ),
    /operation plan/u
  );

  const legacyStages = [];
  await applyMaisProductionSchemaOperations(
    client,
    ["app-storage-complete-readiness-v1"],
    productionEnvironment,
    {
      applyAppStorageSchema: async (receivedClient, expectedState) => {
        assert.equal(receivedClient, client);
        assert.equal(expectedState, "legacy-no-readiness-marker");
        legacyStages.push("app-storage-readiness");
      },
      applyTeacherNoticeSchema: async () => {
        throw new Error("must not run");
      }
    }
  );
  assert.deepEqual(legacyStages, ["app-storage-readiness"]);

  const legacyV1Stages = [];
  await applyMaisProductionSchemaOperations(
    client,
    ["app-storage-upgrade-legacy-compat-readiness-v2"],
    productionEnvironment,
    {
      applyAppStorageSchema: async (receivedClient, expectedState) => {
        assert.equal(receivedClient, client);
        assert.equal(
          expectedState,
          "legacy-v1-compatibility-no-readiness-marker"
        );
        legacyV1Stages.push("app-storage-legacy-v1-upgrade");
      },
      applyTeacherNoticeSchema: async () => {
        throw new Error("must not run");
      }
    }
  );
  assert.deepEqual(legacyV1Stages, ["app-storage-legacy-v1-upgrade"]);

  await assert.rejects(
    applyMaisProductionSchemaOperations(
      client,
      ["app-storage-install-v1", "app-storage-complete-readiness-v1"],
      productionEnvironment,
      {
        applyAppStorageSchema: async () => { throw new Error("must not run"); },
        applyTeacherNoticeSchema: async () => { throw new Error("must not run"); }
      }
    ),
    /operation plan/u
  );
});

test("binds the production confirmation to SHA, tree, target, plan, and preflight digest", () => {
  const evidence = buildTeacherNoticeProductionSchemaPreflightEvidence({
    appStorageSeedMode: "demo-disabled",
    appStorageState: "empty",
    candidateSha,
    expectedTreeSha,
    heartbeatState: "empty",
    outboxState: "empty",
    postgresMajor: 16,
    statistics: {
      indexBytes: "2048",
      rowEstimate: "9",
      tableBytes: "4096"
    },
    targetFingerprint,
    webhookState: "empty"
  });

  assert.deepEqual(evidence.operations, [
    "app-storage-install-v1",
    "outbox-install-v2",
    "webhook-install-v3",
    "heartbeat-install-v2"
  ]);
  assert.equal(evidence.schemaVersion, 4);
  assert.equal(evidence.appStorageSeedMode, "demo-disabled");
  assert.equal(evidence.appStorageState, "empty");
  assert.equal(evidence.outboxState, "empty");
  assert.match(evidence.preflightDigest, /^[a-f0-9]{64}$/u);
  assert.match(
    evidence.requiredConfirmation,
    /^confirm:mais-production-schema:v4:/u
  );
  assert.doesNotThrow(() => assertTeacherNoticeProductionSchemaConfirmation(
    evidence,
    evidence.requiredConfirmation
  ));

  const changed = buildTeacherNoticeProductionSchemaPreflightEvidence({
    appStorageSeedMode: "demo-disabled",
    appStorageState: "exact",
    candidateSha,
    expectedTreeSha,
    heartbeatState: "exact",
    outboxState: "exact",
    postgresMajor: 16,
    statistics: evidence.statistics,
    targetFingerprint,
    webhookState: "empty"
  });
  assert.throws(
    () => assertTeacherNoticeProductionSchemaConfirmation(
      changed,
      evidence.requiredConfirmation
    ),
    /confirmation/u
  );
  const changedSeedMode = buildTeacherNoticeProductionSchemaPreflightEvidence({
    appStorageSeedMode: "demo-enabled",
    appStorageState: "empty",
    candidateSha,
    expectedTreeSha,
    heartbeatState: "empty",
    outboxState: "empty",
    postgresMajor: 16,
    statistics: evidence.statistics,
    targetFingerprint,
    webhookState: "empty"
  });
  assert.throws(
    () => assertTeacherNoticeProductionSchemaConfirmation(
      changedSeedMode,
      evidence.requiredConfirmation
    ),
    /confirmation/u
  );
});

test("preflight binds clean local Git, fixed Vercel production env, and read-only database evidence without leaking target identity", async () => {
  let connectedUrl = null;
  let closed = false;
  const evidence = await preflightTeacherNoticeProductionSchema({
    candidateSha,
    connectPostgres: async (url) => {
      connectedUrl = url;
      return { end: async () => { closed = true; } };
    },
    expectedTreeSha,
    env: injectedProductionEnvironment(),
    fetchJsonImpl: providerPullFetchJson(),
    inspectDatabase: async () => ({
      appStorageSeedMode: "demo-disabled",
      appStorageState: "empty",
      databaseIdentity: {
        databaseName: "secret-production",
        databaseOid: "16401",
        serverVersionNum: "160004"
      },
      heartbeatState: "empty",
      outboxState: "empty",
      statistics: {
        indexBytes: "8192",
        rowEstimate: "42",
        tableBytes: "16384"
      },
      webhookState: "empty"
    }),
    readTokenImpl: async () => "vct_test_token_value_1234567890",
    repoRoot: process.cwd(),
    runCommand: cleanGitRunner()
  });

  assert.equal(connectedUrl, productionUrl);
  assert.equal(closed, true);
  assert.equal(evidence.outboxState, "empty");
  assert.equal(evidence.appStorageState, "empty");
  assert.equal(evidence.appStorageSeedMode, "demo-disabled");
  assert.equal(evidence.webhookState, "empty");
  assert.equal(evidence.heartbeatState, "empty");
  assert.match(evidence.targetFingerprint, /^[a-f0-9]{64}$/u);
  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(productionUrl), false);
  assert.equal(serialized.includes("secret-user"), false);
  assert.equal(serialized.includes("secret-password"), false);
  assert.equal(serialized.includes("secret-production"), false);
});

test("protected production preflight pulls one exact runtime and build URL without reading the ciphertext list API", async () => {
  let connectedUrl = null;
  let pullReads = 0;
  const baseFetch = providerPullFetchJson();
  const evidence = await preflightTeacherNoticeProductionSchema(preflightDependencies({
    connectPostgres: async (url) => {
      connectedUrl = url;
      return { end: async () => {} };
    },
    env: injectedProductionEnvironment(),
    fetchJsonImpl: async (url, token, options) => {
      const pathname = new URL(url).pathname;
      assert.equal(pathname.endsWith("/env"), false);
      if (pathname.startsWith("/v3/env/pull/")) pullReads += 1;
      return baseFetch(url, token, options);
    }
  }));

  assert.equal(connectedUrl, productionUrl);
  assert.equal(pullReads, 1);
  assert.equal(evidence.candidateSha, candidateSha);
  assert.equal(evidence.expectedTreeSha, expectedTreeSha);
});

test("production provider pull fails closed before connecting outside the protected exact-main workflow", async () => {
  for (const env of [
    injectedProductionEnvironment({ MAIS_PRODUCTION_SCHEMA_ENV_SOURCE: "local-shell" }),
    injectedProductionEnvironment({ GITHUB_REF: "refs/heads/feature" }),
    injectedProductionEnvironment({ GITHUB_SHA: "d".repeat(40) }),
    injectedProductionEnvironment({ GITHUB_WORKFLOW_REF: "HUDongpin/MAIS-MVP/.github/workflows/ci.yml@refs/heads/main" }),
    injectedProductionEnvironment({ GITHUB_RUN_ID: "0" }),
    injectedProductionEnvironment({ GITHUB_RUN_ATTEMPT: "not-a-number" })
  ]) {
    let connected = false;
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies({
        connectPostgres: async () => {
          connected = true;
          return { end: async () => {} };
        },
        env
      })),
      /details redacted/u
    );
    assert.equal(connected, false);
  }
});

test("apply re-fetches the Vercel target, revalidates the clean SHA/tree, applies only the confirmed operations, and post-attests exact state", async () => {
  let appStorageState = "empty";
  let outboxState = "empty";
  let webhookState = "empty";
  let heartbeatState = "empty";
  let environmentReads = 0;
  let inspections = 0;
  const fetchJsonImpl = async (url, token, options) => {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/v3/env/pull/")) environmentReads += 1;
    return providerPullFetchJson()(url, token, options);
  };
  const dependencies = {
    candidateSha,
    connectPostgres: async () => ({ end: async () => {} }),
    env: injectedProductionEnvironment(),
    expectedTreeSha,
    fetchJsonImpl,
    inspectDatabase: async () => {
      inspections += 1;
      return {
        appStorageSeedMode: "demo-disabled",
        appStorageState,
        databaseIdentity: {
          databaseName: "secret-production",
          databaseOid: "16401",
          serverVersionNum: "160004"
        },
        heartbeatState,
        outboxState,
        statistics: {
          indexBytes: "8192",
          rowEstimate: inspections === 5 ? "43" : "42",
          tableBytes: "16384"
        },
        webhookState
      };
    },
    readTokenImpl: async () => "vct_test_token_value_1234567890",
    repoRoot: process.cwd(),
    runCommand: cleanGitRunner()
  };
  const preflight = await preflightTeacherNoticeProductionSchema(dependencies);
  const appliedOperations = [];
  const result = await applyTeacherNoticeProductionSchema({
    ...dependencies,
    applyMigrations: async (_client, operations) => {
      appliedOperations.push(...operations);
      appStorageState = "exact";
      outboxState = "exact";
      webhookState = "exact";
      heartbeatState = "exact";
    },
    confirmation: preflight.requiredConfirmation
  });

  assert.deepEqual(appliedOperations, [
    "app-storage-install-v1",
    "outbox-install-v2",
    "webhook-install-v3",
    "heartbeat-install-v2"
  ]);
  assert.equal(result.preflightDigest, preflight.preflightDigest);
  assert.equal(result.postflight.outboxState, "exact");
  assert.equal(result.postflight.appStorageState, "exact");
  assert.equal(result.postflight.webhookState, "exact");
  assert.equal(result.postflight.heartbeatState, "exact");
  assert.equal(result.sameConnectionPostflight.statistics.rowEstimate, "42");
  assert.equal(result.postflight.statistics.rowEstimate, "43");
  assert.equal(environmentReads, 4);
  assert.equal(inspections, 5);
  assert.equal(JSON.stringify(result).includes("secret-password"), false);
});

test("target fingerprint binds canonical database identity and never derives from rotated credentials", async () => {
  const first = await preflightTeacherNoticeProductionSchema(preflightDependencies());
  const rotated = await preflightTeacherNoticeProductionSchema(preflightDependencies({
    fetchJsonImpl: providerPullFetchJson({
      productionUrlValue:
        "postgresql://rotated-user:rotated-password@DB.EXAMPLE.INVALID/secret-production?sslmode=require"
    })
  }));

  assert.equal(rotated.targetFingerprint, first.targetFingerprint);
  assert.equal(rotated.preflightDigest, first.preflightDigest);
  assert.equal(JSON.stringify(rotated).includes("rotated"), false);
});

test("preflight rejects mismatched runtime and build POSTGRES_URL values before connecting", async () => {
  let connected = false;
  await assert.rejects(
    preflightTeacherNoticeProductionSchema(preflightDependencies({
      connectPostgres: async () => {
        connected = true;
        return { end: async () => {} };
      },
      fetchJsonImpl: providerPullFetchJson({
        buildUrlValue:
          "postgresql://other-user:other-password@other.example.invalid:5432/secret-production?sslmode=require"
      })
    })),
    /details redacted/u
  );
  assert.equal(connected, false);
});

test("preflight rejects drifted or unsafe production app-storage bootstrap settings before connecting", async () => {
  for (const pullPayload of [
    {
      env: {
        HK_MATH_ENABLE_DEMO_USER: "false",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: productionUrl
      },
      buildEnv: {
        HK_MATH_ENABLE_DEMO_USER: "true",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: productionUrl
      }
    },
    {
      env: {
        HK_MATH_ENABLE_DEMO_USER: "yes",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: productionUrl
      },
      buildEnv: {
        HK_MATH_ENABLE_DEMO_USER: "yes",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_URL: productionUrl
      }
    },
    {
      env: { POSTGRES_URL: productionUrl },
      buildEnv: { POSTGRES_URL: productionUrl }
    }
  ]) {
    let connected = false;
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies({
        connectPostgres: async () => {
          connected = true;
          return { end: async () => {} };
        },
        fetchJsonImpl: providerPullFetchJson({ pullPayload })
      })),
      /details redacted/u
    );
    assert.equal(connected, false);
  }
});

test("preflight safely binds the explicitly enabled production demo seed mode", async () => {
  const pullPayload = {
    env: {
      HK_MATH_ENABLE_DEMO_USER: "true",
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    },
    buildEnv: {
      HK_MATH_ENABLE_DEMO_USER: "true",
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    }
  };
  const evidence = await preflightTeacherNoticeProductionSchema(preflightDependencies({
    fetchJsonImpl: providerPullFetchJson({ pullPayload })
  }));
  assert.equal(evidence.appStorageSeedMode, "demo-enabled");
  assert.equal(JSON.stringify(evidence).includes("HK_MATH_ENABLE_DEMO_USER"), false);
});

test("preflight safely binds the current missing-variable demo default", async () => {
  const pullPayload = {
    env: {
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    },
    buildEnv: {
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    }
  };
  const evidence = await preflightTeacherNoticeProductionSchema(preflightDependencies({
    fetchJsonImpl: providerPullFetchJson({ pullPayload })
  }));
  assert.equal(evidence.appStorageSeedMode, "demo-enabled-default");
});

test("preflight preserves the production empty-string demo setting exactly", async () => {
  const pullPayload = {
    env: {
      HK_MATH_ENABLE_DEMO_USER: "",
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    },
    buildEnv: {
      HK_MATH_ENABLE_DEMO_USER: "",
      HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: productionUrl
    }
  };
  const evidence = await preflightTeacherNoticeProductionSchema(preflightDependencies({
    fetchJsonImpl: providerPullFetchJson({ pullPayload })
  }));
  assert.equal(evidence.appStorageSeedMode, "demo-enabled-empty");
});

test("preflight rejects malformed provider-pull payloads and missing production URLs", async () => {
  for (const pullPayload of [
    { env: [], buildEnv: { POSTGRES_URL: productionUrl } },
    { env: {}, buildEnv: { POSTGRES_URL: productionUrl } },
    { env: { POSTGRES_URL: productionUrl }, buildEnv: {} }
  ]) {
    const baseFetch = providerPullFetchJson({ pullPayload });
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies({
        fetchJsonImpl: async (url, token, options) => {
          return baseFetch(url, token, options);
        }
      })),
      /details redacted/u
    );
  }
});

test("preflight fails closed for wrong Vercel ownership, PostgreSQL below 16, and partial schemas", async () => {
  const cases = [
    preflightDependencies({
      fetchJsonImpl: providerPullFetchJson({ projectAccountId: "team_wrong" })
    }),
    preflightDependencies({
      inspectDatabase: async () => databaseInspection({
        databaseIdentity: { serverVersionNum: "150012" }
      })
    }),
    preflightDependencies({
      inspectDatabase: async () => databaseInspection({
        outboxState: "partial"
      })
    }),
    preflightDependencies({
      inspectDatabase: async () => databaseInspection({ webhookState: "partial" })
    }),
    preflightDependencies({
      inspectDatabase: async () => databaseInspection({ heartbeatState: "partial" })
    }),
    preflightDependencies({
      inspectDatabase: async () => databaseInspection({ appStorageState: "partial" })
    })
  ];
  for (const options of cases) {
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(options),
      (error) => {
        assert.equal(error.message.includes("secret"), false);
        assert.match(error.message, /details redacted/u);
        return true;
      }
    );
  }
});

test("dirty local candidate fails before any Vercel or PostgreSQL access", async () => {
  let providerRead = false;
  let connected = false;
  const dirtyRunner = cleanGitRunner();
  await assert.rejects(
    preflightTeacherNoticeProductionSchema(preflightDependencies({
      connectPostgres: async () => {
        connected = true;
        return { end: async () => {} };
      },
      fetchJsonImpl: async (...args) => {
        providerRead = true;
        return providerPullFetchJson()(...args);
      },
      runCommand: async (command, args, options) => {
        if (args[0] === "status") {
          return { exitCode: 0, stdout: Buffer.from("?? private-secret\0") };
        }
        return dirtyRunner(command, args, options);
      }
    })),
    /details redacted/u
  );
  assert.equal(providerRead, false);
  assert.equal(connected, false);
});

test("apply rejects a Vercel database target change between confirmed preflight and mutation", async () => {
  let environmentReads = 0;
  let mutated = false;
  const changedUrl =
    "postgresql://new-user:new-password@other.example.invalid:5432/secret-production?sslmode=require";
  const fetchJsonImpl = async (url, token, options) => {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith("/v3/env/pull/")) {
      return providerPullFetchJson()(url, token, options);
    }
    environmentReads += 1;
    return providerPullFetchJson({
      productionUrlValue: environmentReads >= 3 ? changedUrl : productionUrl
    })(url, token, options);
  };
  const dependencies = preflightDependencies({ fetchJsonImpl });
  const preflight = await preflightTeacherNoticeProductionSchema(dependencies);

  await assert.rejects(
    applyTeacherNoticeProductionSchema({
      ...dependencies,
      applyMigrations: async () => { mutated = true; },
      confirmation: preflight.requiredConfirmation
    }),
    /details redacted/u
  );
  assert.equal(mutated, false);
});

test("apply rejects a wrong target-bound confirmation before any migration", async () => {
  let mutated = false;
  const dependencies = preflightDependencies();
  await assert.rejects(
    applyTeacherNoticeProductionSchema({
      ...dependencies,
      applyMigrations: async () => { mutated = true; },
      confirmation: "confirm:teacher-notice-production-schema:wrong"
    }),
    /details redacted/u
  );
  assert.equal(mutated, false);
});

test("provider and database errors are redacted even when dependencies contain credentials", async () => {
  const sensitiveDiagnostic =
    "secret-user secret-password db.example.invalid secret-production";
  for (const overrides of [
    {
      fetchJsonImpl: async () => { throw new Error(sensitiveDiagnostic); }
    },
    {
      inspectDatabase: async () => { throw new Error(sensitiveDiagnostic); }
    }
  ]) {
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies(overrides)),
      (error) => {
        assert.equal(error.message.includes("secret"), false);
        assert.equal(error.message.includes("db.example.invalid"), false);
        assert.match(error.message, /details redacted/u);
        return true;
      }
    );
  }
});

test("preflight preserves only an allowlisted stage code across provider and database failures", async () => {
  const sensitiveDiagnostic =
    "secret-user secret-password db.example.invalid secret-production";
  const cases = [
    {
      expectedStage: "provider-project-read",
      overrides: {
        fetchJsonImpl: async () => { throw new Error(sensitiveDiagnostic); }
      }
    },
    {
      expectedStage: "postgres-inspect",
      overrides: {
        inspectDatabase: async () => { throw new Error(sensitiveDiagnostic); }
      }
    },
    {
      expectedStage: "postgres-connect",
      overrides: {
        connectPostgres: async () => { throw new Error(sensitiveDiagnostic); }
      }
    }
  ];

  for (const { expectedStage, overrides } of cases) {
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies(overrides)),
      (error) => {
        assert.equal(teacherNoticeProductionSchemaFailureStage(error), expectedStage);
        assert.equal(error.message.includes("secret"), false);
        assert.equal(error.message.includes("db.example.invalid"), false);
        return true;
      }
    );
  }

  assert.equal(
    teacherNoticeProductionSchemaFailureStage(new Error(sensitiveDiagnostic)),
    "unknown"
  );
  assert.equal(
    teacherNoticeProductionSchemaFailureReason(
      Object.assign(new Error(sensitiveDiagnostic), { reason: "webhook-partial" })
    ),
    "unknown"
  );
  assert.equal(
    teacherNoticeProductionSchemaFailureComponent(
      Object.assign(new Error(sensitiveDiagnostic), {
        component: "legacy-compatibility-contract"
      })
    ),
    "unknown"
  );
});

test("preflight preserves only an allowlisted partial-schema reason", async () => {
  const cases = [
    {
      appStoragePartialComponent: "legacy-compatibility-contract",
      appStorageState: "partial",
      expectedComponent: "legacy-compatibility-contract",
      expectedReason: "app-storage-partial"
    },
    { heartbeatState: "partial", expectedReason: "heartbeat-partial" },
    { outboxState: "partial", expectedReason: "outbox-partial" },
    { webhookState: "partial", expectedReason: "webhook-partial" },
    {
      outboxState: "empty",
      webhookState: "upgradeable",
      expectedReason: "outbox-webhook-inconsistent"
    }
  ];

  for (const { expectedComponent = "unknown", expectedReason, ...overrides } of cases) {
    await assert.rejects(
      preflightTeacherNoticeProductionSchema(preflightDependencies({
        inspectDatabase: async () => databaseInspection(overrides)
      })),
      (error) => {
        assert.equal(teacherNoticeProductionSchemaFailureStage(error), "evidence-build");
        assert.equal(teacherNoticeProductionSchemaFailureReason(error), expectedReason);
        assert.equal(
          teacherNoticeProductionSchemaFailureComponent(error),
          expectedComponent
        );
        assert.match(error.message, /details redacted/u);
        assert.equal(error.message.includes("secret"), false);
        return true;
      }
    );
  }
});

test("maps detailed app-storage inspection reasons to fixed safe components", () => {
  const cases = [
    ["app-storage-relation-set-partial", "relation-set"],
    ["app-storage-legacy-physical-relations-partial", "legacy-relation-contract"],
    ["app-storage-legacy-catalog-partial", "legacy-catalog-contract"],
    ["app-storage-legacy-compatibility-partial", "legacy-compatibility-contract"],
    ["app-storage-legacy-hot-auth-partial", "legacy-hot-auth-contract"],
    ["app-storage-legacy-readiness-artifact-partial", "legacy-readiness-artifact"],
    ["app-storage-legacy-snapshot-partial", "legacy-snapshot-contract"],
    ["app-storage-canonical-catalog-partial", "current-catalog-contract"],
    ["app-storage-canonical-invalidation-partial", "current-invalidation-contract"],
    ["app-storage-canonical-marker-partial", "current-marker-contract"],
    ["app-storage-canonical-hot-auth-partial", "current-hot-auth-contract"]
  ];

  for (const [partialReason, expectedComponent] of cases) {
    assert.equal(
      teacherNoticeProductionSchemaPartialReasonComponent(partialReason),
      expectedComponent
    );
    assert.throws(
      () => buildTeacherNoticeProductionSchemaPlan({
        appStoragePartialComponent: expectedComponent,
        appStorageState: "partial",
        heartbeatState: "exact",
        outboxState: "exact",
        webhookState: "exact"
      }),
      (error) => {
        assert.equal(error.component, expectedComponent);
        return true;
      }
    );
  }

  for (const rejected of [
    "",
    "app-storage-private-host-partial",
    "postgresql://secret-user:secret-password@db.example.invalid/secret-production",
    null,
    undefined
  ]) {
    assert.equal(
      teacherNoticeProductionSchemaPartialReasonComponent(rejected),
      "unknown"
    );
  }
});

test("CLI preflight failure emits one fixed safe stage without raw diagnostics", () => {
  const poison = "postgresql://secret-user:secret-password@secret-host/secret-db";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/teacher-notice-production-schema-gate.mjs",
      "--preflight",
      "--candidate-sha=invalid",
      "--expected-tree-sha=invalid"
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        POSTGRES_URL: poison,
        VERCEL_TOKEN: "poison-token-that-must-not-be-used-or-printed"
      }
    }
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(JSON.parse(result.stderr), {
    ok: false,
    status: "teacher-notice-production-schema-gate-failed",
    stage: "input-binding",
    reason: "unknown",
    component: "unknown",
    detail: "redacted"
  });
  assert.equal(`${result.stdout}${result.stderr}`.includes(poison), false);
  assert.equal(`${result.stdout}${result.stderr}`.includes("secret-password"), false);
});

test("CLI dry-run performs no provider or database work and emits only a fixed safe plan", () => {
  const poison = "postgresql://secret-user:secret-password@secret-host/secret-db";
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/teacher-notice-production-schema-gate.mjs", "--dry-run"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        POSTGRES_URL: poison,
        VERCEL_TOKEN: "poison-token-that-must-not-be-used-or-printed"
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output, {
    mode: "dry-run",
    mutation: false,
    network: false,
    ok: true,
    projectId: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
    teamId: "team_i9xhhYXUeYBOCLcfWBjTqlYG"
  });
  assert.equal(`${result.stdout}${result.stderr}`.includes(poison), false);
  assert.equal(`${result.stdout}${result.stderr}`.includes("secret-password"), false);
});
