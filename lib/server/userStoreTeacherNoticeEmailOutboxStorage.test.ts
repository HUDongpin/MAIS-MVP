import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootPath = path.join(process.cwd(), "lib/server/userStore.ts");

function sourceSection(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing source section start: ${start}`);
  assert.ok(endIndex > startIndex, `missing source section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("the authority-conflict fixture binds its validated JSON snapshot as text before jsonb", async () => {
  const [source, integrationFixture] = await Promise.all([
    readFile(rootPath, "utf8"),
    readFile(
      path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
      "utf8"
    )
  ]);
  const authorityWorker = sourceSection(
    integrationFixture,
    "function runPostgresAuthorityConflictWorker(",
    "function runPostgresPublicationAtomicityWorker("
  );

  assert.match(authorityWorker, /\[JSON\.stringify\(payload\)\]/);
  assert.match(
    authorityWorker,
    /payload = \$1::pg_catalog\.text::pg_catalog\.jsonb/,
    "postgres.js must bind the already-serialized fixture snapshot as text before PostgreSQL parses it as jsonb"
  );
  assert.doesNotMatch(
    authorityWorker,
    /payload = \$1::pg_catalog\.jsonb/,
    "a direct jsonb cast double-serializes the fixture parameter into a JSON scalar string"
  );
  assert.match(
    authorityWorker,
    /await sql\.unsafe\([\s\S]*UPDATE public\.app_state SET payload[\s\S]*\[JSON\.stringify\(payload\)\][\s\S]*\);\s*await store\.__userStorePostgresStorageReadinessTestHooks\.reattestCurrentSnapshot\(\);/,
    "the synthetic direct state update must invalidate normally and then re-attest through the test-only readiness hook"
  );
  assert.equal(
    (authorityWorker.match(/__userStorePostgresStorageReadinessTestHooks\.reattestCurrentSnapshot\(\)/g) ?? []).length,
    1,
    "every authority replacement flows through one helper-owned re-attestation call"
  );
  assert.match(
    source,
    /IF pg_catalog\.jsonb_typeof\(new_state_payload\) IS DISTINCT FROM 'object' THEN[\s\S]*RAISE EXCEPTION 'Primary app state payload must be a JSON object\.'/,
    "the production compatibility trigger must continue to reject scalar payload snapshots"
  );
});

test("the authority worker reports only ordered safe progress and uses inactivity plus hard watchdogs", async () => {
  const integrationFixture = await readFile(
    path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
    "utf8"
  );
  const authorityWorker = sourceSection(
    integrationFixture,
    "function runPostgresAuthorityConflictWorker(",
    "function runPostgresPublicationAtomicityWorker("
  );
  const expectedStages = [
    "schema-ready",
    "conflict-co-teacher-viewer-complete",
    "conflict-active-revoked-complete",
    "authority-reset",
    "evidence-attempt-queued",
    "evidence-cutoff-queued",
    "evidence-mutated",
    "evidence-sweep-complete",
    "complete"
  ];
  assert.deepEqual(
    Array.from(authorityWorker.matchAll(/emitStage\("([a-z-]+)"\)/g), (match) => match[1]),
    expectedStages
  );
  const orderedMilestones = [
    "await store.__userStoreAiTutorPostgresTestHooks.ensureSchema()",
    'emitStage("schema-ready")',
    'const coTeacherViewer = await runConflict("co-teacher-viewer"',
    'emitStage("conflict-co-teacher-viewer-complete")',
    'const activeRevoked = await runConflict("active-revoked"',
    'emitStage("conflict-active-revoked-complete")',
    "await replaceAuthorityConflict([])",
    'emitStage("authority-reset")',
    'const attemptLimitNoticeId = await queueEvidenceFixture("attempt-limit")',
    'emitStage("evidence-attempt-queued")',
    'const deliveryCutoffNoticeId = await queueEvidenceFixture("delivery-cutoff")',
    'emitStage("evidence-cutoff-queued")',
    'emitStage("evidence-mutated")',
    "const evidenceSweep = {",
    'emitStage("evidence-sweep-complete")',
    "await sql.end({ timeout: 5 })",
    'emitStage("complete")'
  ];
  let previous = -1;
  for (const milestone of orderedMilestones) {
    const position = authorityWorker.indexOf(milestone, previous + 1);
    assert.ok(position > previous, `authority worker milestone is missing or out of order: ${milestone}`);
    previous = position;
  }
  assert.match(authorityWorker, /createPostgresAuthorityWorkerStageTracker/);
  assert.match(authorityWorker, /createPostgresAuthorityWorkerWatchdog\([\s\S]*inactivityTimeoutMs:\s*75_000[\s\S]*hardTimeoutMs:\s*240_000/);
  assert.match(authorityWorker, /tracker\.observeLine\(line\)/);
  assert.match(authorityWorker, /watchdog\.recordProgress\(\)/);
  assert.match(authorityWorker, /let lastStage:\s*PostgresAuthorityWorkerStage \| null = null/);
  assert.match(authorityWorker, /lastStage = stage/);
  assert.match(authorityWorker, /child\.kill\("SIGKILL"\)/);
  assert.match(authorityWorker, /finishOnce/);
  assert.match(
    authorityWorker,
    /const safeStageSummary = \(\) => postgresAuthorityWorkerSafeStageSummary\(lastStage\)/
  );
  assert.match(
    authorityWorker,
    /const safeErrorName = \(value: unknown\) => postgresAuthorityWorkerSafeErrorName\(value\)/
  );
  assert.match(authorityWorker, /onTimeout:[\s\S]*safeStageSummary\(\)/);
  assert.match(authorityWorker, /child\.on\("error"[\s\S]*safeErrorName\(error\)[\s\S]*safeStageSummary\(\)/);
  assert.match(authorityWorker, /code !== 0[\s\S]*safeErrorName\(stderr\)[\s\S]*safeStageSummary\(\)/);
  assert.match(authorityWorker, /!marker[\s\S]*MissingResult[\s\S]*safeStageSummary\(\)/);
  assert.match(authorityWorker, /JSON\.parse[\s\S]*catch \(error\)[\s\S]*safeStageSummary\(\)/);
  assert.doesNotMatch(authorityWorker, /stderr\.slice|\$\{stderr\}/);
  assert.doesNotMatch(authorityWorker, /\},\s*60_000\)/);
});

test("the storage-capability claim test wrapper runs once and requires post-operation attestation", async () => {
  const store = await import("@/lib/server/userStore");
  type ProbeOptions = {
    environment: { NODE_ENV?: string };
    sql: unknown;
    wrapper: null | ((sql: unknown, operation: () => Promise<unknown>) => Promise<unknown>);
    operation: () => Promise<unknown>;
    reattest: (sql: unknown) => Promise<boolean>;
  };
  const hooks = store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks as unknown as {
    runClaimOperationWrapperContractProbe?: (options: ProbeOptions) => Promise<unknown>;
  };
  const probe = hooks.runClaimOperationWrapperContractProbe;
  assert.equal(typeof probe, "function");
  if (!probe) return;

  const transactionSql = Object.freeze({ transaction: "fixture" });
  const events: string[] = [];
  const value = await probe({
    environment: { NODE_ENV: "test" },
    sql: transactionSql,
    wrapper: async (sql, operation) => {
      assert.equal(sql, transactionSql);
      events.push("wrapper");
      const result = await operation();
      events.push("wrapper-complete");
      return result;
    },
    operation: async () => {
      events.push("operation");
      return "claimed";
    },
    reattest: async (sql) => {
      assert.equal(sql, transactionSql);
      events.push("reattest");
      return true;
    }
  });
  assert.equal(value, "claimed");
  assert.deepEqual(events, ["wrapper", "operation", "wrapper-complete", "reattest"]);

  const productionEvents: string[] = [];
  assert.equal(await probe({
    environment: { NODE_ENV: "production" },
    sql: transactionSql,
    wrapper: async () => {
      productionEvents.push("wrapper");
      throw new Error("production must not invoke the test wrapper");
    },
    operation: async () => {
      productionEvents.push("operation");
      return "production";
    },
    reattest: async () => {
      productionEvents.push("reattest");
      return true;
    }
  }), "production");
  assert.deepEqual(productionEvents, ["operation"]);

  const operationFailure = new Error("operation failed");
  let failureReattested = false;
  await assert.rejects(probe({
    environment: { NODE_ENV: "test" },
    sql: transactionSql,
    wrapper: async (_sql, operation) => {
      try {
        await operation();
      } catch {
        return "swallowed";
      }
      return "unexpected";
    },
    operation: async () => { throw operationFailure; },
    reattest: async () => {
      failureReattested = true;
      return true;
    }
  }), (error) => error === operationFailure);
  assert.equal(failureReattested, false);

  await assert.rejects(probe({
    environment: { NODE_ENV: "test" },
    sql: transactionSql,
    wrapper: async (_sql, operation) => operation(),
    operation: async () => "claimed",
    reattest: async () => false
  }), /could not be re-attested/i);

  await assert.rejects(probe({
    environment: { NODE_ENV: "test" },
    sql: transactionSql,
    wrapper: async () => "fabricated",
    operation: async () => "claimed",
    reattest: async () => true
  }), /exactly once/i);

  await assert.rejects(probe({
    environment: { NODE_ENV: "test" },
    sql: transactionSql,
    wrapper: async (_sql, operation) => {
      await operation();
      return operation();
    },
    operation: async () => "claimed",
    reattest: async () => true
  }), /exactly once/i);
});

test("the claim test wrapper drains every started operation and closes late invocation races", async () => {
  const store = await import("@/lib/server/userStore");
  type ProbeOptions = {
    environment: { NODE_ENV?: string };
    sql: unknown;
    wrapper: null | ((sql: unknown, operation: () => Promise<unknown>) => Promise<unknown>);
    operation: () => Promise<unknown>;
    reattest: (sql: unknown) => Promise<boolean>;
  };
  const probe = (store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks as unknown as {
    runClaimOperationWrapperContractProbe: (options: ProbeOptions) => Promise<unknown>;
  }).runClaimOperationWrapperContractProbe;
  const transactionSql = Object.freeze({ transaction: "race-fixture" });
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((accept, decline) => {
      resolve = accept;
      reject = decline;
    });
    return { promise, resolve, reject };
  };
  const settle = <T>(promise: Promise<T>) => promise.then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason: unknown) => ({ status: "rejected" as const, reason })
  );
  const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
  process.on("unhandledRejection", onUnhandled);
  try {
    for (const wrapperKind of ["synchronous", "asynchronous"] as const) {
      const wrapperError = new Error(`${wrapperKind} pre-operation SQL failure`);
      let operationStarts = 0;
      let reattests = 0;
      const result = await settle(probe({
        environment: { NODE_ENV: "test" },
        sql: transactionSql,
        wrapper: wrapperKind === "synchronous"
          ? (() => { throw wrapperError; })
          : (async () => {
              await Promise.resolve();
              throw wrapperError;
            }),
        operation: async () => {
          operationStarts += 1;
          return "must not run";
        },
        reattest: async () => {
          reattests += 1;
          return true;
        }
      }));
      assert.equal(result.status, "rejected");
      assert.equal(result.status === "rejected" ? result.reason : null, wrapperError);
      assert.equal(operationStarts, 0);
      assert.equal(reattests, 0);
    }

    const operationError = new Error("delayed operation failure");
    const wrapperError = new Error("early wrapper failure");
    const delayedFailure = deferred<never>();
    let earlyThrowReattests = 0;
    let earlyThrowSettled = false;
    const earlyThrowOutcome = settle(probe({
      environment: { NODE_ENV: "test" },
      sql: transactionSql,
      wrapper: async (_sql, operation) => {
        void operation();
        throw wrapperError;
      },
      operation: () => delayedFailure.promise,
      reattest: async () => {
        earlyThrowReattests += 1;
        return true;
      }
    }));
    void earlyThrowOutcome.then(() => { earlyThrowSettled = true; });
    await Promise.resolve();
    await Promise.resolve();
    const earlyThrowSettledBeforeOperation = earlyThrowSettled;
    delayedFailure.reject(operationError);
    const earlyThrowResult = await earlyThrowOutcome;
    await nextTurn();
    assert.equal(earlyThrowSettledBeforeOperation, false);
    assert.deepEqual(earlyThrowResult, { status: "rejected", reason: operationError });
    assert.equal(earlyThrowReattests, 0);

    for (const outcomeKind of ["fulfilled", "rejected"] as const) {
      const delayed = deferred<string>();
      const delayedError = new Error("delayed early-return rejection");
      let settledBeforeRelease = false;
      let reattests = 0;
      const outcome = settle(probe({
        environment: { NODE_ENV: "test" },
        sql: transactionSql,
        wrapper: async (_sql, operation) => {
          void operation();
          return "wrapper-returned-early";
        },
        operation: () => delayed.promise,
        reattest: async () => {
          reattests += 1;
          return true;
        }
      }));
      void outcome.then(() => { settledBeforeRelease = true; });
      await Promise.resolve();
      await Promise.resolve();
      const wasSettled = settledBeforeRelease;
      if (outcomeKind === "fulfilled") delayed.resolve("real-operation-result");
      else delayed.reject(delayedError);
      const result = await outcome;
      assert.equal(wasSettled, false);
      if (outcomeKind === "fulfilled") {
        assert.deepEqual(result, { status: "fulfilled", value: "real-operation-result" });
        assert.equal(reattests, 1);
      } else {
        assert.deepEqual(result, { status: "rejected", reason: delayedError });
        assert.equal(reattests, 0);
      }
    }

    const synchronousError = new Error("synchronous operation failure");
    let synchronousReattests = 0;
    assert.deepEqual(await settle(probe({
      environment: { NODE_ENV: "test" },
      sql: transactionSql,
      wrapper: async (_sql, operation) => {
        try {
          await operation();
        } catch {
          return "swallowed synchronous failure";
        }
        return "unexpected";
      },
      operation: () => { throw synchronousError; },
      reattest: async () => {
        synchronousReattests += 1;
        return true;
      }
    })), { status: "rejected", reason: synchronousError });
    assert.equal(synchronousReattests, 0);

    const firstPending = deferred<string>();
    let duplicateSettled = false;
    let duplicateReattests = 0;
    const duplicateOutcome = settle(probe({
      environment: { NODE_ENV: "test" },
      sql: transactionSql,
      wrapper: async (_sql, operation) => {
        void operation();
        try {
          await operation();
        } catch {
          return "duplicate rejected";
        }
        return "unexpected";
      },
      operation: () => firstPending.promise,
      reattest: async () => {
        duplicateReattests += 1;
        return true;
      }
    }));
    void duplicateOutcome.then(() => { duplicateSettled = true; });
    await Promise.resolve();
    await Promise.resolve();
    const duplicateSettledBeforeFirst = duplicateSettled;
    firstPending.resolve("first completed");
    const duplicateResult = await duplicateOutcome;
    assert.equal(duplicateSettledBeforeFirst, false);
    assert.equal(duplicateResult.status, "rejected");
    assert.match(
      duplicateResult.status === "rejected" && duplicateResult.reason instanceof Error
        ? duplicateResult.reason.message
        : "",
      /exactly once/i
    );
    assert.equal(duplicateReattests, 0);

    let lateOperation: (() => Promise<unknown>) | undefined;
    let lateOperationStarts = 0;
    const lateResult = await settle(probe({
      environment: { NODE_ENV: "test" },
      sql: transactionSql,
      wrapper: async (_sql, operation) => {
        lateOperation = operation;
        return "returned before invocation";
      },
      operation: async () => {
        lateOperationStarts += 1;
        return "must not run";
      },
      reattest: async () => true
    }));
    assert.equal(lateResult.status, "rejected");
    assert.ok(lateOperation);
    const lateInvocation = await settle(lateOperation!());
    assert.equal(lateInvocation.status, "rejected");
    assert.equal(lateOperationStarts, 0);
    assert.equal(unhandled.length, 0);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("the authority evidence mutation is transaction-wrapped after capability and restored before re-attestation", async () => {
  const [source, integrationFixture] = await Promise.all([
    readFile(rootPath, "utf8"),
    readFile(
      path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
      "utf8"
    )
  ]);
  const claimWrapper = sourceSection(
    source,
    "async function runTeacherNoticeEmailOutboxPostgresClaimOperationWithTestWrapper",
    "async function withTeacherNoticeEmailOutboxPostgresDeadline"
  );
  assert.match(claimWrapper, /environment\.NODE_ENV !== "test" \|\| !wrapper/);
  assert.match(claimWrapper, /await wrapper\(sql, runOperation\)/);
  assert.match(claimWrapper, /let invocationCount = 0/);
  assert.match(claimWrapper, /let closed = false/);
  assert.match(claimWrapper, /Promise\.resolve\(\)\.then\(operation\)/);
  assert.match(claimWrapper, /operationOutcomePromise = startedOperation\.then/);
  assert.match(claimWrapper, /catch \(error\)[\s\S]*wrapperRejected = true[\s\S]*wrapperError = error/);
  assert.match(claimWrapper, /closed = true/);
  assert.match(claimWrapper, /const observedOperationOutcomePromise = operationOutcomePromise[\s\S]*const operationOutcome = observedOperationOutcomePromise[\s\S]*await observedOperationOutcomePromise/);
  const operationErrorAt = claimWrapper.indexOf('operationOutcome.status === "rejected"');
  const preOperationWrapperErrorAt = claimWrapper.indexOf(
    "if (wrapperRejected && !observedOperationOutcomePromise)",
    operationErrorAt
  );
  const contractErrorAt = claimWrapper.indexOf("if (contractError)", preOperationWrapperErrorAt);
  const wrapperErrorAt = claimWrapper.indexOf("if (wrapperRejected)", contractErrorAt);
  const reattestAt = claimWrapper.indexOf("await reattest(sql)", wrapperErrorAt);
  assert.ok(
    operationErrorAt >= 0 && operationErrorAt < preOperationWrapperErrorAt &&
      preOperationWrapperErrorAt < contractErrorAt && contractErrorAt < wrapperErrorAt &&
      wrapperErrorAt < reattestAt,
    "operation errors must win first, pre-operation wrapper errors must retain identity, and no failed path may re-attest"
  );
  assert.match(claimWrapper, /await reattest\(sql\)/);
  assert.match(claimWrapper, /could not be re-attested/);

  const deadlineLane = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks"
  );
  const storageBranch = sourceSection(
    deadlineLane,
    "if (storageCapabilityRequired)",
    "return runTeacherNoticeEmailOutboxPostgresAttestedTransaction"
  );
  const transactionAt = storageBranch.indexOf("runTeacherNoticeEmailOutboxPostgresPublicationTransaction");
  const wrapperAt = storageBranch.indexOf("runTeacherNoticeEmailOutboxPostgresClaimOperationWithTestWrapper");
  const operationAt = storageBranch.indexOf("deadlineBoundOperation(transactionSql)");
  assert.ok(transactionAt >= 0 && transactionAt < wrapperAt && wrapperAt < operationAt);
  assert.match(storageBranch, /process\.env/);
  assert.match(storageBranch, /claimOperationWrapper/);
  assert.match(
    storageBranch,
    /hasTeacherNoticeEmailOutboxPostgresSchema\(reattestSql,[\s\S]*transactionConfigured:\s*true/
  );

  const authorityWorker = sourceSection(
    integrationFixture,
    "function runPostgresAuthorityConflictWorker(",
    "function runPostgresPublicationAtomicityWorker("
  );
  const fixtureWrapper = sourceSection(
    authorityWorker,
    "claimOperationWrapper = async",
    "let evidenceAggregate"
  );
  const orderedMilestones = [
    "pg_catalog.pg_get_constraintdef",
    "constraintRows.length !== 1",
    'definition.startsWith("CHECK (")',
    "DROP CONSTRAINT teacher_notice_email_outbox_state_fields_ck",
    "attemptLimitNoticeId",
    "deliveryCutoffNoticeId",
    'emitStage("evidence-mutated")',
    "await operation()",
    "ADD CONSTRAINT teacher_notice_email_outbox_state_fields_ck"
  ];
  let previous = -1;
  for (const milestone of orderedMilestones) {
    const position = fixtureWrapper.indexOf(milestone, previous + 1);
    assert.ok(position > previous, `authority transaction wrapper milestone is missing or out of order: ${milestone}`);
    previous = position;
  }
  assert.match(fixtureWrapper, /constraint_record\.contype = 'c'/);
  assert.match(fixtureWrapper, /constraint_record\.convalidated = TRUE/);
  assert.doesNotMatch(fixtureWrapper, /NOT VALID/);
  assert.match(authorityWorker, /finally \{\s*store\.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks\s*\.claimOperationWrapper = null;\s*\}/);
  assert.doesNotMatch(
    sourceSection(authorityWorker, 'emitStage("evidence-cutoff-queued")', "claimOperationWrapper = async"),
    /DROP CONSTRAINT|UPDATE public\.teacher_notice_email_outbox/
  );
});

test("publication and storage-aware claim share one bounded three-part mutation budget", async () => {
  const source = await readFile(rootPath, "utf8");
  const publication = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function queueTeacherNoticeEmail"
  );

  assert.match(publication, /const transactionTimeouts = postgresMutationTransactionTimeouts\(\)/);
  assert.match(publication, /lockTimeout:\s*`\$\{transactionTimeouts\.lockTimeoutMs\}ms`/);
  assert.match(publication, /statementTimeout:\s*`\$\{transactionTimeouts\.statementTimeoutMs\}ms`/);
  assert.match(publication, /idleTransactionTimeout:\s*`\$\{transactionTimeouts\.statementTimeoutMs\}ms`/);
  assert.doesNotMatch(publication, /lockTimeout:\s*["']1000ms["']/);
  assert.doesNotMatch(publication, /statementTimeout:\s*["']5000ms["']/);

  const [store, persistence] = await Promise.all([
    import("@/lib/server/userStore"),
    import("./userStore/teacherNoticeEmailOutboxPersistence")
  ]);
  const resolveTimeouts = store.__userStorePostgresStorageReadinessTestHooks
    .resolveMutationTransactionTimeouts;
  const transactionSettings = persistence.teacherNoticeEmailOutboxPostgresTransactionSettings;
  const resolveSettings = (environment: Record<string, string | undefined>) => {
    const timeouts = resolveTimeouts(environment);
    return transactionSettings({
      lockTimeout: `${timeouts.lockTimeoutMs}ms`,
      statementTimeout: `${timeouts.statementTimeoutMs}ms`,
      idleTransactionTimeout: `${timeouts.statementTimeoutMs}ms`
    });
  };

  assert.deepEqual(resolveSettings({
    NODE_ENV: "production",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "5000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "10000"
  }), {
    searchPath: "pg_catalog, public",
    lockTimeout: "1000ms",
    statementTimeout: "5000ms",
    idleTransactionTimeout: "5000ms"
  });
  assert.deepEqual(resolveSettings({
    NODE_ENV: "test",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "5000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "10000"
  }), {
    searchPath: "pg_catalog, public",
    lockTimeout: "5000ms",
    statementTimeout: "10000ms",
    idleTransactionTimeout: "10000ms"
  });
});

test("the lock-order fixture nests its paired transaction, barrier, hook, and child budgets", async () => {
  const [source, integrationFixture, store] = await Promise.all([
    readFile(rootPath, "utf8"),
    readFile(
      path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
      "utf8"
    ),
    import("@/lib/server/userStore")
  ]);
  const resolveTimeouts = store.__userStorePostgresStorageReadinessTestHooks
    .resolveMutationTransactionTimeouts;
  assert.deepEqual(resolveTimeouts({
    NODE_ENV: "test",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "30000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "45000"
  }), {
    lockTimeoutMs: 30_000,
    statementTimeoutMs: 45_000
  });
  assert.deepEqual(resolveTimeouts({
    NODE_ENV: "production",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "30000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "45000"
  }), {
    lockTimeoutMs: 1_000,
    statementTimeoutMs: 5_000
  });
  assert.deepEqual(resolveTimeouts({
    NODE_ENV: "test",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "45000"
  }), {
    lockTimeoutMs: 1_000,
    statementTimeoutMs: 5_000
  });

  const hooks = sourceSection(
    source,
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  const claimHook = sourceSection(
    hooks,
    "async claimNextForLockOrderProbe()",
    "async runLegacyTerminalMaintenanceLockOrderProbe("
  );
  const legacyHook = sourceSection(
    hooks,
    "async runLegacyTerminalMaintenanceLockOrderProbe(",
    "async runAlterTableBarrierProbe("
  );
  const worker = sourceSection(
    integrationFixture,
    "function runPostgresPublicationClaimLockOrderWorker(",
    "function runPostgresOutboxMigrationWorker("
  );
  const numericLiteral = (section: string, pattern: RegExp, label: string) => {
    const match = section.match(pattern);
    assert.ok(match?.[1], `missing ${label}`);
    return Number(match[1].replaceAll("_", ""));
  };
  const budgets = {
    lock: numericLiteral(worker, /MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS:\s*"(\d+)"/, "fixture lock budget"),
    barrier: numericLiteral(worker, /label \+ " timed out"\)\),\s*(\d[\d_]*)\)/, "fixture barrier budget"),
    statement: numericLiteral(worker, /MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS:\s*"(\d+)"/, "fixture statement budget"),
    claimHook: numericLiteral(claimHook, /deadlineAtMs:\s*startedAt \+ (\d[\d_]*)/, "claim hook deadline"),
    legacyHook: numericLiteral(legacyHook, /deadlineAtMs:\s*startedAt \+ (\d[\d_]*)/, "legacy hook deadline"),
    child: numericLiteral(worker, /PostgreSQL publication and claim lock-order worker timed out\."\)\);\s*\},\s*(\d[\d_]*)\)/, "fixture child budget")
  };
  assert.deepEqual(budgets, {
    lock: 30_000,
    barrier: 15_000,
    statement: 45_000,
    claimHook: 50_000,
    legacyHook: 50_000,
    child: 60_000
  });
  assert.ok(
    budgets.barrier < budgets.lock &&
      budgets.lock < budgets.statement &&
      budgets.statement < budgets.claimHook &&
      budgets.statement < budgets.legacyHook &&
      budgets.claimHook < budgets.child &&
      budgets.legacyHook < budgets.child
  );
  assert.match(
    legacyHook,
    /postgresMutationTransactionTimeouts\(\)[\s\S]*configureTeacherNoticeEmailOutboxPostgresTransaction\([\s\S]*statementTimeoutMs[\s\S]*idleTransactionTimeout:[\s\S]*statementTimeoutMs[\s\S]*await onTerminalTupleLocked/
  );
  assert.match(legacyHook, /SET LOCAL lock_timeout = '250ms'/);
  assert.doesNotMatch(worker, /catch[\s\S]{0,300}CONNECTION_CLOSED/);
  assert.match(worker, /legacyBlockedCode !== "55P03" && legacyBlockedCode !== "40P01"/);
  assert.match(worker, /const settleImmediately = \$\{settlePostgresLockOrderProbePromise\.toString\(\)\}/);
  for (const promiseName of [
    "legacyPublicationSettled",
    "legacyClaimSettled",
    "fixedPublicationSettled",
    "fixedClaimSettled"
  ]) {
    assert.match(worker, new RegExp(`const ${promiseName} = settleImmediately\\(`));
  }
  assert.match(worker, /if \(fixedPublicationOutcome\.status === "rejected"\) throw fixedPublicationOutcome\.reason/);
  assert.match(worker, /if \(fixedClaimOutcome\.status === "rejected"\) throw fixedClaimOutcome\.reason/);
});

test("the publication outbox-DML test barrier is ordered, awaitable, and always cleaned up", async () => {
  const [source, integrationFixture, store] = await Promise.all([
    readFile(rootPath, "utf8"),
    readFile(
      path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
      "utf8"
    ),
    import("@/lib/server/userStore")
  ]);
  const publication = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function queueTeacherNoticeEmail"
  );
  const stateWriteAt = publication.indexOf("await writePostgresDatabaseWith(sql, database, storageCapability)");
  const barrierAt = publication.indexOf("beforePublicationOutboxDml");
  const outboxInsertAt = publication.indexOf("insertTeacherNoticeEmailOutboxRowsPostgres(sql, prepared.rows)");
  assert.ok(
    stateWriteAt >= 0 && stateWriteAt < barrierAt && barrierAt < outboxInsertAt,
    "the test-only barrier must run after the full state write and immediately before outbox DML"
  );
  assert.match(
    publication,
    /if \(process\.env\.NODE_ENV === "test"\) \{\s*await __userStoreTeacherNoticeEmailOutboxPostgresTestHooks\s*\.beforePublicationOutboxDml\?\.\(\);\s*\}/
  );

  const worker = sourceSection(
    integrationFixture,
    "function runPostgresPublicationClaimLockOrderWorker(",
    "function runPostgresOutboxMigrationWorker("
  );
  for (const deferredName of [
    "legacyPublicationReachedOutboxDml",
    "allowLegacyPublicationOutboxDml"
  ]) {
    assert.match(worker, new RegExp(`const ${deferredName} = deferred\\(\\)`));
  }
  assert.match(
    worker,
    /beforePublicationOutboxDml = async \(\) => \{\s*legacyPublicationReachedOutboxDml\.resolve\(\);\s*await allowLegacyPublicationOutboxDml\.promise;\s*\}/
  );
  const releaseCapabilityAt = worker.indexOf("allowLegacyPublicationDml.resolve()");
  const reachedOutboxAt = worker.indexOf(
    'await waitFor(legacyPublicationReachedOutboxDml.promise, "legacy publication outbox DML barrier")'
  );
  const releaseOutboxAt = worker.indexOf("allowLegacyPublicationOutboxDml.resolve()", reachedOutboxAt);
  const observeTupleAt = worker.indexOf("const legacyPublicationWaitObserved = await observeExactLockWait(");
  const releaseStateAt = worker.indexOf("allowLegacyStateLock.resolve()", observeTupleAt);
  assert.ok(
    releaseCapabilityAt >= 0 && releaseCapabilityAt < reachedOutboxAt && reachedOutboxAt < releaseOutboxAt &&
      releaseOutboxAt < observeTupleAt && observeTupleAt < releaseStateAt,
    "legacy fixture must release capability, reach the pre-DML barrier, release it, observe the tuple wait, then release state"
  );
  assert.match(
    worker,
    /beforePublicationOutboxDml = null;[\s\S]*let fixedPublicationPid/
  );
  const finallySection = sourceSection(worker, "} finally {", "})().catch((error) => {");
  assert.match(finallySection, /allowLegacyPublicationOutboxDml\.resolve\(\)/);
  assert.match(finallySection, /beforePublicationOutboxDml = null/);

  type BarrierHooks = typeof store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks & {
    beforePublicationOutboxDml: null | (() => void | Promise<void>);
  };
  const hooks = store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks as BarrierHooks;
  let release: () => void = () => undefined;
  let reached = false;
  hooks.beforePublicationOutboxDml = async () => {
    reached = true;
    await new Promise<void>((resolve) => { release = resolve; });
  };
  try {
    const running = Promise.resolve(hooks.beforePublicationOutboxDml());
    let settled = false;
    void running.then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(reached, true);
    assert.equal(settled, false);
    release();
    await running;
    assert.equal(settled, true);
  } finally {
    hooks.beforePublicationOutboxDml = null;
  }
});

test("userStore continuously attests the private outbox while DDL remains an explicit migration", async () => {
  const source = await readFile(rootPath, "utf8");
  assert.match(source, /teacherNoticeEmailOutboxSqliteSchema/);
  assert.match(source, /teacherNoticeEmailOutboxPostgresSchemaStatements/);
  assert.match(source, /sqlite\.exec\(teacherNoticeEmailOutboxSqliteSchema\)/);
  const migration = sourceSection(
    source,
    "async function migrateTeacherNoticeEmailOutboxPostgresSchema()",
    "const ensureTeacherNoticeEmailOutboxPostgresSchema"
  );
  assert.match(migration, /runTeacherNoticeEmailOutboxAtomicMigration/);
  assert.match(migration, /configureTeacherNoticeEmailOutboxPostgresTransaction\(migrationSql,[\s\S]*lockTimeout:\s*"1000ms"[\s\S]*statementTimeout:\s*"5000ms"/);
  assert.match(migration, /pg_catalog\.pg_advisory_xact_lock[\s\S]*pg_catalog\.hashtextextended[\s\S]*teacherNoticeEmailOutboxPostgresAdvisoryKey/);
  assert.match(migration, /teacherNoticeEmailOutboxPostgresSchemaStatements/);
  assert.match(migration, /attest:\s*\(migrationSql\)\s*=>\s*hasTeacherNoticeEmailOutboxPostgresSchema\(migrationSql,[\s\S]*transactionConfigured:\s*true/);
  assert.ok(
    migration.indexOf("teacherNoticeEmailOutboxPostgresSchemaStatements") <
      migration.indexOf("hasTeacherNoticeEmailOutboxPostgresSchema(migrationSql,"),
    "exact catalog and marker attestation must execute after DDL but before the migration transaction commits"
  );
  assert.doesNotMatch(migration, /SELECT\s+payload|FOR\s+UPDATE/iu);
  const runtimeReadiness = sourceSection(
    source,
    "const ensureTeacherNoticeEmailOutboxPostgresSchema",
    "function parseStoredStatePayload"
  );
  assert.match(runtimeReadiness, /createContinuousTeacherNoticeEmailOutboxReadiness/);
  assert.match(runtimeReadiness, /hasTeacherNoticeEmailOutboxPostgresSchema/);
  assert.doesNotMatch(runtimeReadiness, /teacherNoticeEmailOutboxPostgresSchemaStatements|\.unsafe\(|migrateTeacherNoticeEmailOutboxPostgresSchema/);
  const marker = sourceSection(
    source,
    "async function hasTeacherNoticeEmailOutboxPostgresSchema(",
    "async function migrateTeacherNoticeEmailOutboxPostgresSchema()"
  );
  assert.match(marker, /pg_attribute/);
  assert.match(marker, /pg_attrdef/);
  assert.match(marker, /relkind/);
  assert.match(marker, /relpersistence/);
  assert.match(marker, /relrowsecurity/);
  assert.match(marker, /relforcerowsecurity/);
  assert.match(marker, /format_type/);
  assert.match(marker, /teacher_notice_email_outbox_eligible_idx/);
  assert.match(marker, /teacher_notice_email_outbox_provider_message_uq/);
  assert.match(marker, /pg_index/);
  assert.match(marker, /pg_am/);
  assert.match(marker, /pg_opclass/);
  assert.match(marker, /opcnamespace/);
  assert.match(marker, /opcintype/);
  assert.match(marker, /opcmethod/);
  assert.match(marker, /indoption/);
  assert.match(marker, /indcollation/);
  assert.match(marker, /pg_collation/);
  assert.match(marker, /indisvalid/);
  assert.match(marker, /indisready/);
  assert.match(marker, /indislive/);
  assert.match(marker, /indimmediate/);
  assert.match(marker, /indisprimary/);
  assert.match(marker, /indpred/);
  assert.match(marker, /indkey/);
  assert.match(marker, /convalidated/);
  assert.match(marker, /condeferrable AS "deferrable"/);
  assert.match(marker, /'deferrable', "deferrable"/);
  assert.match(marker, /pg_get_expr/);
  assert.match(marker, /defaultExpression/);
  assert.match(marker, /teacher_notice_email_outbox_schema_migrations/);
  assert.match(marker, /FROM public\.teacher_notice_email_outbox_schema_migrations/);
  assert.match(marker, /markerRows/);
  assert.match(marker, /attestTeacherNoticeEmailOutboxPostgresCatalog/);
  assert.match(marker, /configureTeacherNoticeEmailOutboxPostgresTransaction\(sql,[\s\S]*lockTimeout,[\s\S]*statementTimeout/);
  assert.doesNotMatch(marker, /::regclass/);
  assert.doesNotMatch(marker, /pg_get_constraintdef\([^)]*\)\s+LIKE|LIKE\s+'%/,
    "catalog readiness must not accept keyword-only CHECK lookalikes");
  assert.match(migration, /hasTeacherNoticeEmailOutboxPostgresSchema/);
  const schemaModule = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts"),
    "utf8"
  );
  const atomicMigration = sourceSection(
    schemaModule,
    "export async function runTeacherNoticeEmailOutboxAtomicMigration",
    "// Terminal rows retain"
  );
  assert.match(atomicMigration, /await migrate\(sql\)/);
  assert.match(atomicMigration, /if \(!await attest\(sql\)\)/);
  assert.match(atomicMigration, /could not be attested/i);
  assert.ok(
    atomicMigration.indexOf("await migrate(sql)") < atomicMigration.indexOf("await attest(sql)"),
    "a failed exact attestation must throw before the migration transaction can commit"
  );
  assert.match(schemaModule, /CREATE TABLE IF NOT EXISTS public\.teacher_notice_email_outbox_schema_migrations/);
  assert.match(schemaModule, /teacherNoticeEmailOutboxPostgresAdvisoryKey\s*=\s*"mais-teacher-notice-email-outbox-v2"/);
  assert.match(schemaModule, /teacherNoticeEmailOutboxWebhookPostgresAdvisoryKey\s*=\s*"mais-resend-teacher-notice-webhook-v2"/);
  assert.match(schemaModule, /teacherNoticeEmailOutboxProviderMappingAdvisoryPrefix\s*=\s*"mais-resend-teacher-notice-webhook-v2:"/);
  assert.match(schemaModule, /teacherNoticeEmailOutboxExpectedPostgresCatalog/);
  assert.match(schemaModule, /teacher_notice_email_outbox_pkey/);
  assert.match(schemaModule, /teacher_notice_email_outbox_state_fields_ck/);
  assert.match(schemaModule, /teacher_notice_email_outbox_delivery_revision_uq/);
  assert.match(schemaModule, /CREATE UNIQUE INDEX IF NOT EXISTS teacher_notice_email_outbox_provider_message_uq[\s\S]*provider_message_id[\s\S]*WHERE provider_message_id IS NOT NULL/);

  const databaseType = sourceSection(source, "type Database =", "type DatabaseIndexes =");
  assert.doesNotMatch(databaseType, /teacher_notice_email_outbox/);
  const initialDatabase = sourceSection(source, "function createInitialDatabase()", "function readPublicContentDatabase()");
  assert.doesNotMatch(initialDatabase, /teacher_notice_email_outbox/);
});

test("every PostgreSQL outbox mutation locks and attests inside its physical transaction before DML", async () => {
  const source = await readFile(rootPath, "utf8");
  const transactionHelper = sourceSection(
    source,
    "async function runTeacherNoticeEmailOutboxPostgresAttestedTransaction",
    "async function hasTeacherNoticeEmailOutboxPostgresSchema("
  );
  const configureAt = transactionHelper.indexOf("configureTeacherNoticeEmailOutboxPostgresTransaction");
  const advisoryAt = transactionHelper.indexOf("teacherNoticeEmailOutboxPostgresAdvisoryKey");
  const webhookAdvisoryAt = transactionHelper.indexOf("teacherNoticeEmailOutboxWebhookPostgresAdvisoryKey");
  const providerAdvisoryAt = transactionHelper.indexOf("teacherNoticeEmailOutboxProviderMappingAdvisoryPrefix");
  const outboxLockAt = transactionHelper.indexOf(
    "LOCK TABLE public.teacher_notice_email_outbox IN ROW EXCLUSIVE MODE"
  );
  const markerLockAt = transactionHelper.indexOf(
    "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE"
  );
  const attestAt = transactionHelper.indexOf("hasTeacherNoticeEmailOutboxPostgresSchema");
  assert.ok(
    configureAt >= 0 && configureAt < advisoryAt && advisoryAt < webhookAdvisoryAt &&
      webhookAdvisoryAt < providerAdvisoryAt && providerAdvisoryAt < outboxLockAt &&
      outboxLockAt < markerLockAt && markerLockAt < attestAt,
    "outbox schema, webhook schema, provider mapping, relation locks, and exact attestation must be globally ordered"
  );
  assert.match(transactionHelper, /runTeacherNoticeEmailOutboxAttestedTransaction/);

  const publication = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function queueTeacherNoticeEmail"
  );
  assert.doesNotMatch(
    publication,
    /await ensureTeacherNoticeEmailOutboxPostgresSchema\(\)/,
    "publication must not attest before opening the transaction that performs its DML"
  );
  assert.match(
    publication,
    /getPostgresClient\(\)\.begin\(async \(sql\) =>[\s\S]*runTeacherNoticeEmailOutboxPostgresPublicationTransaction\(\s*sql/
  );
  assert.ok(
    publication.indexOf("runTeacherNoticeEmailOutboxPostgresPublicationTransaction(") <
      publication.indexOf("normalizeLockedPostgresState(sql"),
    "publication state reads and DML must follow the combined in-transaction lock and attestation helper"
  );

  const deadlineLane = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks"
  );
  assert.match(deadlineLane, /lane\.begin\(async \(sql\) =>[\s\S]*runTeacherNoticeEmailOutboxPostgresAttestedTransaction\(\s*sql/);
  assert.doesNotMatch(deadlineLane, /const ready = await hasTeacherNoticeEmailOutboxPostgresSchema/);

  const migration = sourceSection(
    source,
    "async function migrateTeacherNoticeEmailOutboxPostgresSchema()",
    "const ensureTeacherNoticeEmailOutboxPostgresSchema"
  );
  assert.match(migration, /pg_catalog\.pg_advisory_xact_lock\(/,
    "migration must take the exclusive counterpart to DML's shared advisory lock");
  const hooks = sourceSection(
    source,
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(hooks, /runAlterTableBarrierProbe/);
  assert.match(hooks, /runProviderMappingBarrierProbe/);
  assert.match(hooks, /runLegacyTerminalMaintenanceLockOrderProbe/);
  assert.match(hooks, /status IN \('provider-accepted', 'blocked', 'dead-letter'\)[\s\S]*pii_expires_at <= pg_catalog\.clock_timestamp\(\)[\s\S]*RETURNING id/);
  assert.match(hooks, /SET LOCAL lock_timeout = '250ms'[\s\S]*FROM public\.app_state AS app_state[\s\S]*FOR UPDATE OF app_state/);
  assert.match(hooks, /UPDATE public\.teacher_notice_email_outbox[\s\S]*WHERE FALSE[\s\S]*await onLocked\(\)/);
  const integrationFixture = await readFile(
    path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
    "utf8"
  );
  assert.match(integrationFixture, /runPostgresAlterTableBarrierWorker/);
  assert.match(integrationFixture, /runPostgresProviderMappingBarrierWorker/);
  assert.match(integrationFixture, /teacher_notice_email_outbox_provider_message_uq/);
  assert.match(integrationFixture, /hostile_shadow\.teacher_notice_email_outbox_provider_message_uq/);
  assert.match(integrationFixture, /ALTER TABLE public\.teacher_notice_email_outbox ADD COLUMN barrier_during_transaction/);
  assert.match(integrationFixture, /mais-resend-teacher-notice-webhook-v2:/);
  assert.match(integrationFixture, /SET UNLOGGED/);
  assert.match(integrationFixture, /ENABLE ROW LEVEL SECURITY/);
  assert.match(integrationFixture, /FORCE ROW LEVEL SECURITY/);
  assert.match(integrationFixture, /blockedCode:\s*"55P03"/);
  assert.match(integrationFixture, /runPostgresPublicationAtomicityWorker/);
  assert.match(integrationFixture, /runPostgresPublicationClaimLockOrderWorker/);
  assert.match(integrationFixture, /pg_catalog\.pg_blocking_pids/);
  assert.match(integrationFixture, /FROM pg_catalog\.pg_locks AS waiting/);
  assert.match(integrationFixture, /JOIN pg_catalog\.pg_locks AS holder/);
  assert.match(integrationFixture, /FROM pg_catalog\.pg_stat_activity AS activity/);
  assert.match(integrationFixture, /runLegacyTerminalMaintenanceLockOrderProbe/);
  assert.match(integrationFixture, /last_error_code = 'provider-invalid-request'/);
  assert.match(integrationFixture, /pii_expires_at = pg_catalog\.clock_timestamp\(\) - INTERVAL '1 second'/);
  assert.match(integrationFixture, /failAfterPublicationOutboxInsert/);
  assert.match(integrationFixture, /post-returning-drift/);
  assert.match(integrationFixture, /fullWriterRolledBack:\s*true/);
  assert.match(integrationFixture, /outboxInsertRolledBack:\s*true/);
  assert.match(integrationFixture, /legacyPublicationQueued:\s*0/);
  assert.match(integrationFixture, /legacyPublicationReused:\s*1/);
  assert.match(integrationFixture, /legacyPublicationRecovered:\s*0/);
  assert.match(integrationFixture, /fixedPublicationQueued:\s*0/);
  assert.match(integrationFixture, /fixedPublicationReused:\s*1/);
  assert.match(integrationFixture, /fixedPublicationRecovered:\s*0/);
  assert.match(integrationFixture, /legacyPublicationWaitObserved:\s*true/);
  assert.match(integrationFixture, /fixedClaimWaitObserved:\s*true/);
  assert.match(integrationFixture, /durableUnique:\s*true/);
  assert.match(integrationFixture, /terminalEvidenceExact:\s*true/);
  assert.match(integrationFixture, /terminalPiiPurged:\s*true/);
  assert.match(integrationFixture, /leaseAbsent:\s*true/);
  assert.match(integrationFixture, /sameTerminalTuple:\s*true/);
  assert.match(integrationFixture, /stateMarkerConsistent:\s*true/);
});

test("publication writes app_state and immutable outbox rows in one physical transaction", async () => {
  const source = await readFile(rootPath, "utf8");
  const section = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.doesNotMatch(section, /await ensureTeacherNoticeEmailOutboxPostgresSchema\(\)/);
  assert.match(section, /runTeacherNoticeEmailOutboxPostgresPublicationTransaction/);
  assert.match(section, /getPostgresClient\(\)\.begin/);
  assert.match(section, /async \(sql, storageCapability\) =>[\s\S]*normalizeLockedPostgresState\(sql\)/);
  assert.match(section, /writePostgresDatabaseWith\(sql, database, storageCapability\)/);
  assert.match(
    section,
    /insertTeacherNoticeEmailOutboxRowsPostgres\(sql, prepared\.rows\)[\s\S]*failAfterPublicationOutboxInsert/
  );
  assert.doesNotMatch(section, /readPostgresDatabaseFrom\(sql/);
  assert.doesNotMatch(section, /writePostgresDatabaseWith\(sql, database, true\)/);
  assert.match(section, /insertTeacherNoticeEmailOutboxRowsPostgres\(sql/);
  assert.match(section, /withSqliteImmediateTransaction/);
  assert.match(section, /writeSqliteDatabaseWithConnection/);
  assert.match(section, /insertTeacherNoticeEmailOutboxRowsSqlite/);
  const insertHelpers = sourceSection(
    source,
    "function insertTeacherNoticeEmailOutboxRowsSqlite",
    "function prepareTeacherNoticeEmailOutboxRows"
  );
  assert.match(insertHelpers, /ON CONFLICT[\s\S]*DO NOTHING/);
  assert.match(insertHelpers, /attestTeacherNoticeEmailOutboxRow/);
  assert.match(insertHelpers, /validateTeacherNoticeEmailOutboxRow/);
  assert.doesNotMatch(insertHelpers, /row\.status === "retryable"[\s\S]*SET status = 'pending'/);
  assert.doesNotMatch(section, /deliverTeacherNoticeEmail|fetch\(/);
  assert.match(section, /noEligibleResult/);
  assert.match(section, /prepared\.noEligible/);

  const testHooks = sourceSection(
    source,
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(testHooks, /failAfterPublicationOutboxInsert/);
  assert.match(testHooks, /queueNoticeEmailForAtomicityProbe/);

  const queueSection = sourceSection(
    source,
    "async function queueTeacherNoticeEmail",
    "async function postgresTeacherNoticeEmailClaimDatabase"
  );
  assert.match(queueSection, /teacherCanMutateOperationsClassFromTeacherOpsOperations/);
  assert.doesNotMatch(queueSection, /notice\.teacher_id\s*!==\s*teacherId/,
    "the current actor must not be forced to equal the stable notice author");
});

test("PostgreSQL worker mutations use an awaited disposable lane and fresh database clock", async () => {
  const source = await readFile(rootPath, "utf8");
  const lane = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(lane, /postgres\(postgresUrl/);
  assert.match(lane, /max:\s*1/);
  assert.match(lane, /connect_timeout/);
  assert.match(lane, /runTeacherNoticeEmailOutboxPostgresAttestedTransaction/);
  const transactionConfiguration = sourceSection(
    source,
    "async function configureTeacherNoticeEmailOutboxPostgresTransaction(",
    "async function hasTeacherNoticeEmailOutboxPostgresSchema("
  );
  assert.match(transactionConfiguration, /idle_in_transaction_session_timeout/);
  assert.match(transactionConfiguration, /statement_timeout/);
  assert.match(transactionConfiguration, /lock_timeout/);
  assert.match(lane, /await lane\.end\(/);
  assert.doesNotMatch(lane, /Promise\.race/,
    "mutating database work must rely on the bounded database lane, not an orphaning timer race");

  const workerMutations = sourceSection(
    source,
    "async function claimTeacherNoticeEmailOutboxItem",
    "const teacherNoticeEmailOutboxWorker"
  );
  assert.ok((workerMutations.match(/withTeacherNoticeEmailOutboxPostgresDeadline/g) ?? []).length >= 3,
    "claim, no-contact release, and completion must each use the isolated lane");
  assert.doesNotMatch(workerMutations, /getPostgresClient\(\)\.begin/);
  assert.match(workerMutations, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(workerMutations, /lease_expires_at\s*=\s*pg_catalog\.clock_timestamp\(\)\s*\+\s*pg_catalog\.make_interval/);
  const postgresClaim = sourceSection(
    workerMutations,
    'if (storageProvider === "postgres")',
    "const cutoffAt = new Date(Date.parse(now) - teacherNoticeEmailOutboxCutoffMs)"
  );
  assert.doesNotMatch(postgresClaim, /new Date\(Date\.parse\(now\) \+ teacherNoticeEmailOutboxLeaseMs\)/,
    "PostgreSQL leases must not derive from the caller's stale wall clock");
  const hooks = sourceSection(
    source,
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(hooks, /migrateSchema:\s*migrateTeacherNoticeEmailOutboxPostgresSchema/);
  assert.match(hooks, /runDeadlineRollbackProbe/);
  assert.match(hooks, /withTeacherNoticeEmailOutboxPostgresDeadline/);
  assert.match(hooks, /pg_sleep/);
});

test("hostile PostgreSQL search_path cannot redirect outbox schema, readiness, or runtime DML", async () => {
  const source = await readFile(rootPath, "utf8");
  const schemaModule = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts"),
    "utf8"
  );
  const readiness = sourceSection(
    source,
    "async function hasTeacherNoticeEmailOutboxPostgresSchema(",
    "const ensureTeacherNoticeEmailOutboxPostgresSchema"
  );
  const publication = sourceSection(
    source,
    "async function insertTeacherNoticeEmailOutboxRowsPostgres(",
    "function prepareTeacherNoticeEmailOutboxRows"
  );
  const transaction = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function queueTeacherNoticeEmail"
  );
  const worker = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "const teacherNoticeEmailOutboxWorker"
  );
  const transactionConfiguration = sourceSection(
    source,
    "async function configureTeacherNoticeEmailOutboxPostgresTransaction(",
    "async function hasTeacherNoticeEmailOutboxPostgresSchema("
  );
  const postgresClaim = sourceSection(
    source,
    "async function claimTeacherNoticeEmailOutboxItem(",
    "const cutoffAt = new Date(Date.parse(now) - teacherNoticeEmailOutboxCutoffMs)"
  );
  const release = sourceSection(
    source,
    "async function releaseTeacherNoticeEmailOutboxItemWithoutProviderContact(",
    "async function completeTeacherNoticeEmailOutboxItem("
  );
  const postgresRelease = sourceSection(
    release,
    'if (storageProvider === "postgres")',
    "\n  if (!teacherNoticeEmailOutboxDeadlineHasAnyTime(deadline)) return false;"
  );
  const completion = sourceSection(
    source,
    "async function completeTeacherNoticeEmailOutboxItem(",
    "const teacherNoticeEmailOutboxWorker"
  );
  const postgresCompletion = sourceSection(
    completion,
    'if (storageProvider === "postgres")',
    "\n  return withSqliteImmediateTransaction"
  );
  const postgresOutboxSource = [
    readiness, publication, transaction, postgresClaim, postgresRelease, postgresCompletion
  ].join("\n");

  assert.match(schemaModule, /teacherNoticeEmailOutboxPostgresSafeSearchPath\s*=\s*["']pg_catalog, public["']/);
  assert.match(transactionConfiguration, /pg_catalog\.set_config\('search_path'/);
  assert.ok((source.match(/configureTeacherNoticeEmailOutboxPostgresTransaction\(/g) ?? []).length >= 4,
    "readiness, migration, and the shared publication/worker transaction helper must use fixed settings");
  assert.doesNotMatch(
    postgresOutboxSource,
    /\b(?:FROM|JOIN|INTO|UPDATE|TABLE|DELETE\s+FROM)\s+(?!public\.)(?:teacher_notice_email_outbox(?:_schema_migrations|_deadline_probe)?|app_state)\b/iu
  );
  assert.doesNotMatch(
    readiness,
    /\b(?:FROM|JOIN)\s+(?!pg_catalog\.)pg_(?:class|namespace|attribute|attrdef|constraint|index|am|opclass|collation|trigger|rewrite|inherits)\b/iu
  );
  assert.doesNotMatch(
    postgresOutboxSource,
    /(?<!pg_catalog\.)\b(?:clock_timestamp|make_interval|jsonb_typeof|jsonb_array_elements|jsonb_build_object|jsonb_agg|pg_sleep|set_config|to_regclass|obj_description|format_type|pg_get_expr|pg_get_constraintdef)\s*\(/iu
  );
  assert.match(schemaModule, /CREATE TABLE IF NOT EXISTS public\.teacher_notice_email_outbox\b/);
  assert.match(schemaModule, /CREATE TABLE IF NOT EXISTS public\.teacher_notice_email_outbox_schema_migrations\b/);
  assert.match(schemaModule, /ON public\.teacher_notice_email_outbox\b/);
  assert.match(schemaModule, /\bpg_catalog\.(?:text|int4|bool|timestamptz)\b/);
  assert.ok((worker.match(/UPDATE public\.teacher_notice_email_outbox/g) ?? []).length >= 4,
    "claim, release, and completion must target the attested public outbox relation");
});

test("claim transactions revalidate app_state first, use provider-specific locking, and never perform provider I/O", async () => {
  const source = await readFile(rootPath, "utf8");
  const deadlineWrapper = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "export const __userStoreTeacherNoticeEmailOutboxPostgresTestHooks"
  );
  const section = sourceSection(
    source,
    "async function claimTeacherNoticeEmailOutboxItem",
    "async function completeTeacherNoticeEmailOutboxItem"
  );
  assert.match(
    deadlineWrapper,
    /storageCapabilityRequired[\s\S]*runTeacherNoticeEmailOutboxPostgresPublicationTransaction/u,
    "the deadline wrapper must route storage-aware claims through the same ordered storage+outbox helper as publication"
  );
  assert.match(
    deadlineWrapper,
    /storageCapabilityRequired\s*&&\s*process\.env\.NODE_ENV === "test"[\s\S]*postgresMutationTransactionTimeouts\(\)/u,
    "only a test storage-capability claim may consume the bounded mutation timeout override"
  );
  assert.match(
    deadlineWrapper,
    /productionPostgresMutationLockTimeoutMs[\s\S]*productionPostgresMutationStatementTimeoutMs/u,
    "unset and production storage-capability claims must retain the 1000/5000 contract"
  );
  assert.doesNotMatch(
    deadlineWrapper,
    /catch[\s\S]{0,300}(?:55P03|lock_not_available)/u,
    "a relation lock timeout must remain a failure rather than being treated as claim success"
  );
  const integrationFixture = await readFile(
    path.join(process.cwd(), "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"),
    "utf8"
  );
  const lockOrderWorker = sourceSection(
    integrationFixture,
    "function runPostgresPublicationClaimLockOrderWorker(",
    "function runPostgresOutboxMigrationWorker("
  );
  assert.match(lockOrderWorker, /MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS:\s*"30000"/u);
  assert.match(lockOrderWorker, /MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS:\s*"45000"/u);
  assert.match(lockOrderWorker, /legacyBlockedCode !== "55P03" && legacyBlockedCode !== "40P01"/u,
    "the legacy probe must still require a real bounded PostgreSQL lock failure");
  assert.match(
    section,
    /withTeacherNoticeEmailOutboxPostgresDeadline\(deadline, true,[\s\S]*storageCapabilityRequired:\s*true/u,
    "claim must explicitly opt into the storage capability lock protocol"
  );
  const appStateLock = section.indexOf("FOR UPDATE OF app_state");
  const firstOutboxDelete = section.indexOf("DELETE FROM public.teacher_notice_email_outbox");
  const firstOutboxUpdate = section.indexOf("UPDATE public.teacher_notice_email_outbox");
  const skipLocked = section.indexOf("FOR UPDATE SKIP LOCKED");
  assert.ok(appStateLock >= 0, "claim must lock authoritative app_state");
  assert.ok(
    firstOutboxDelete > appStateLock && firstOutboxUpdate > appStateLock,
    "claim must not mutate or lock an outbox row before its storage capability has locked app_state"
  );
  assert.ok(skipLocked > appStateLock, "app_state must be locked before an outbox row");
  assert.match(section, /withTeacherNoticeEmailOutboxPostgresDeadline\(deadline, true/);
  assert.match(section, /withSqliteImmediateTransaction/);
  assert.match(section, /randomUUID\(\)/);
  assert.match(section, /teacherNoticeEmailOutboxLeaseMs/);
  assert.match(section, /validateTeacherNoticeEmailOutboxClaim/);
  assert.match(section, /teacher_class_collaborators/);
  assert.match(section, /school_memberships/);
  const scopedClaim = sourceSection(
    source,
    "async function postgresTeacherNoticeEmailClaimDatabase",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(scopedClaim, /UNION[\s\S]*authority_collaborators[\s\S]*UNION[\s\S]*authority_memberships/);
  assert.doesNotMatch(
    scopedClaim,
    /collaborator_record->>'class_id'\s*=\s*\$\{row\.class_id\}[\s\S]{0,120}collaborator_record->>'teacher_id'\s*=\s*\$\{row\.teacher_id\}/,
    "claim must load every current class collaborator, not only a past actor"
  );
  assert.doesNotMatch(
    scopedClaim,
    /membership_record->>'class_id'\s*=\s*\$\{row\.class_id\}[\s\S]{0,120}membership_record->>'user_id'\s*=\s*\$\{row\.teacher_id\}/,
    "claim must load every current class membership, not only a past actor"
  );
  assert.match(section, /teacherNoticeEmailOutboxInvalidQuarantineLimit/);
  assert.match(section, /quarantined-invalid-row/);
  assert.match(section, /deadline:\s*TeacherNoticeEmailOutboxDeadline/);
  assert.ok(
    (section.match(/teacherNoticeEmailOutboxDeadlineHasClaimReserve/g) ?? []).length >= 8,
    "claim must recheck the absolute deadline across schema, lock, sweep, quarantine, authority, and lease stages"
  );
  const leaseCreation = section.indexOf("const leaseToken = randomUUID()");
  const preLeaseDeadline = section.lastIndexOf("teacherNoticeEmailOutboxDeadlineHasClaimReserve", leaseCreation);
  assert.ok(preLeaseDeadline >= 0 && preLeaseDeadline < leaseCreation,
    "claim must return before creating a lease when the provider reserve is unavailable");
  const lane = sourceSection(
    source,
    "async function withTeacherNoticeEmailOutboxPostgresDeadline",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.match(lane, /teacherNoticeEmailOutboxDeadlineStatementTimeoutMs/,
    "PostgreSQL claim statements must be capped by the remaining monotonic margin");
  const postgresExpiredLease = section.indexOf("WHERE status = 'leased' AND lease_expires_at <=");
  const postgresDeliveryWindow = section.indexOf("WHERE status IN ('pending', 'retryable')");
  assert.ok(postgresExpiredLease >= 0 && postgresDeliveryWindow > postgresExpiredLease,
    "only expired leases may be reclaimed before delivery-window sweeping");
  assert.doesNotMatch(section, /status IN \('pending', 'leased', 'retryable'\)/);
  const quarantineUpdates = section.match(/SET status = 'dead-letter', last_error_code = 'quarantined-invalid-row'[\s\S]{0,500}/g) ?? [];
  assert.ok(quarantineUpdates.length >= 2, "both PostgreSQL and SQLite must quarantine malformed rows");
  for (const update of quarantineUpdates) {
    assert.match(update, /completed_at\s*=\s*COALESCE\((?:outbox\.)?completed_at,/,
      "quarantine must preserve prior completion evidence");
    assert.doesNotMatch(update, /provider_message_id\s*=/);
    assert.doesNotMatch(update, /last_http_status\s*=/);
  }
  assert.doesNotMatch(section, /deliverTeacherNoticeEmail|fetch\(/);
});

test("completion and no-contact release are lease-token CAS operations and never mark the notice sent", async () => {
  const source = await readFile(rootPath, "utf8");
  const section = sourceSection(
    source,
    "async function completeTeacherNoticeEmailOutboxItem",
    "const teacherNoticeEmailOutboxWorker"
  );
  assert.match(section, /status = 'leased'/);
  assert.match(section, /lease_token =/);
  assert.match(section, /withTeacherNoticeEmailOutboxPostgresDeadline\(deadline, false/);
  assert.match(section, /providerMessageId:\s*completion\.status === "provider-accepted"[\s\S]*completion\.providerMessageId/,
    "accepted completion must enter the provider-mapping lock lane with its exact provider identifier");
  assert.match(section, /withSqliteImmediateTransaction/);
  assert.match(section, /Number\(result\.changes\) === 1|rows\.length === 1/);
  assert.doesNotMatch(section, /teacher_notices|sent_at/);
  assert.doesNotMatch(section, /app_state|storageCapabilityRequired/,
    "completion is outbox-only and must not acquire the cross-contract storage capability");

  const releaseSection = sourceSection(
    source,
    "async function releaseTeacherNoticeEmailOutboxItemWithoutProviderContact",
    "async function completeTeacherNoticeEmailOutboxItem"
  );
  assert.match(releaseSection, /status = 'leased'/);
  assert.match(releaseSection, /lease_token =/);
  assert.match(releaseSection, /previousStatus/);
  assert.match(releaseSection, /previousAttemptCount/);
  assert.match(releaseSection, /previousNextAttemptAt/);
  assert.match(releaseSection, /deadline:\s*TeacherNoticeEmailOutboxDeadline/);
  assert.match(releaseSection, /teacherNoticeEmailOutboxDeadlineHasAnyTime/);
  assert.match(releaseSection, /withTeacherNoticeEmailOutboxPostgresDeadline\(deadline, false/,
    "PostgreSQL no-contact release must use the deadline-bounded disposable lane");
  assert.match(releaseSection, /attempt_count\s*=\s*\$\{previousAttemptCount\}/);
  assert.match(releaseSection, /attempt_count\s*=\s*\$\{previousAttemptCount \+ 1\}/);
  assert.match(releaseSection, /next_attempt_at\s*=\s*\$\{previousNextAttemptAt\}/);
  assert.match(releaseSection, /lease_token = NULL/);
  assert.match(releaseSection, /lease_expires_at = NULL/);
  assert.doesNotMatch(releaseSection, /attempt_count\s*=\s*attempt_count\s*-\s*1/,
    "no-contact release must restore an attested pre-claim value, not blindly decrement");
  assert.doesNotMatch(releaseSection, /last_error_code\s*=/,
    "no-contact release must preserve retry evidence");
  assert.doesNotMatch(releaseSection, /last_http_status\s*=/,
    "no-contact release must preserve provider evidence");
  assert.match(releaseSection, /Number\(result\.changes\) === 1|rows\.length === 1/);
  assert.doesNotMatch(releaseSection, /deliverTeacherNoticeEmail|fetch\(/);
  assert.doesNotMatch(releaseSection, /app_state|storageCapabilityRequired/,
    "no-contact release is outbox-only and must not acquire the cross-contract storage capability");

  const workerSection = sourceSection(
    source,
    "const teacherNoticeEmailOutboxWorker",
    "const teacherReminderPolicy"
  );
  assert.match(workerSection, /deliverTeacherNoticeEmail/);
  assert.match(workerSection, /claimTeacherNoticeEmailOutboxItem/);
  assert.match(workerSection, /releaseTeacherNoticeEmailOutboxItemWithoutProviderContact/);
  assert.match(workerSection, /completeTeacherNoticeEmailOutboxItem/);
});
