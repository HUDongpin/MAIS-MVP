import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  runExplicitVisualizationSessionPostgresMutation,
  visualizationSessionProjectionPrimaryKeyMigrationAction
} from "@/lib/server/userStore";

test("Postgres visualization-session projection migrates only the exact legacy primary key", () => {
  assert.equal(visualizationSessionProjectionPrimaryKeyMigrationAction([{
    constraint_name: "projection_visualization_sessions_pkey",
    column_names: ["user_id", "module_id", "topic_id"]
  }]), "migrate-legacy");
  assert.equal(visualizationSessionProjectionPrimaryKeyMigrationAction([{
    constraint_name: "projection_visualization_sessions_pkey",
    column_names: ["user_id", "module_id", "topic_id", "source"]
  }]), "current");

  for (const unexpected of [
    [],
    [{
      constraint_name: "custom_visualization_sessions_pkey",
      column_names: ["user_id", "module_id", "topic_id"]
    }],
    [{
      constraint_name: "projection_visualization_sessions_pkey",
      column_names: ["user_id", "module_id"]
    }],
    [{
      constraint_name: "projection_visualization_sessions_pkey",
      column_names: ["user_id", "module_id", "source", "topic_id"]
    }],
    [
      {
        constraint_name: "projection_visualization_sessions_pkey",
        column_names: ["user_id", "module_id", "topic_id"]
      },
      {
        constraint_name: "unexpected_second_pkey",
        column_names: ["source"]
      }
    ]
  ]) {
    assert.throws(
      () => visualizationSessionProjectionPrimaryKeyMigrationAction(unexpected),
      /Unexpected visualization-session projection primary-key/
    );
  }
});

test("Postgres projection uses the complete session identity and fail-closed migration", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const tableStart = source.indexOf("CREATE TABLE IF NOT EXISTS projection_visualization_sessions");
  const tableEnd = source.indexOf("CREATE TABLE IF NOT EXISTS projection_school_memberships", tableStart);
  const tableContract = source.slice(tableStart, tableEnd);
  const syncStart = source.indexOf("const visualizationSessions = database.visualization_sessions.map");
  const syncEnd = source.indexOf("const schoolMemberships =", syncStart);
  const syncContract = source.slice(syncStart, syncEnd);

  assert.notEqual(tableStart, -1);
  assert.notEqual(tableEnd, -1);
  assert.match(tableContract, /PRIMARY KEY \(user_id, module_id, topic_id, source\)/);
  assert.match(tableContract, /LOCK TABLE projection_visualization_sessions IN ACCESS EXCLUSIVE MODE/);
  assert.match(tableContract, /source IS NULL/);
  assert.match(tableContract, /source <> BTRIM\(source\)/);
  assert.match(tableContract, /CHAR_LENGTH\(source\) > 256/);
  assert.match(tableContract, /NOT \(source = ANY\(\$\{canonicalVisualizationSessionProjectionSources\}\)\)/);
  assert.match(tableContract, /visualizationSessionProjectionPrimaryKeyMigrationAction\(primaryKeys\)/);
  assert.match(tableContract, /DROP CONSTRAINT projection_visualization_sessions_pkey/);
  assert.match(tableContract, /ADD CONSTRAINT projection_visualization_sessions_pkey[\s\S]*PRIMARY KEY \(user_id, module_id, topic_id, source\)/);

  assert.match(syncContract, /ON CONFLICT \(user_id, module_id, topic_id, source\) DO UPDATE SET/);
  assert.doesNotMatch(syncContract, /source = excluded\.source/);
  assert.match(syncContract, /user_id \|\| chr\(31\) \|\| module_id \|\| chr\(31\) \|\| topic_id \|\| chr\(31\) \|\| source/);
  assert.match(syncContract, /projectionCompositeKey\(row\.user_id, row\.module_id, row\.topic_id, row\.source\)/);
});

test("Postgres exact visualization no-ops roll back every pre-mutator write", async () => {
  type FakeTransaction = { pending: string[] };
  const committed: string[][] = [];
  const rolledBack: string[][] = [];
  let writeCalls = 0;

  const begin = async (
    callback: (transaction: unknown) => Promise<unknown>
  ) => {
    const transaction: FakeTransaction = { pending: [] };
    try {
      const result = await callback(transaction);
      committed.push([...transaction.pending]);
      return result;
    } catch (error) {
      rolledBack.push([...transaction.pending]);
      throw error;
    }
  };
  const readDatabase = async (transaction: unknown) => {
    const typedTransaction = transaction as FakeTransaction;
    typedTransaction.pending.push("normalization-write", "projection-sync");
    return { sessionCount: 1 };
  };
  const writeDatabase = async (transaction: unknown) => {
    writeCalls += 1;
    (transaction as FakeTransaction).pending.push("session-write");
  };
  const clearDatabaseIndex = () => undefined;

  const noOpValue = await runExplicitVisualizationSessionPostgresMutation({
    begin,
    clearDatabaseIndex,
    readDatabase,
    writeDatabase,
    mutator: async (database) => ({
      changed: false as const,
      value: { sessionCount: database.sessionCount }
    })
  });
  assert.deepEqual(noOpValue, { sessionCount: 1 });
  assert.deepEqual(committed, []);
  assert.deepEqual(rolledBack, [["normalization-write", "projection-sync"]]);
  assert.equal(writeCalls, 0);

  const changedValue = await runExplicitVisualizationSessionPostgresMutation({
    begin,
    clearDatabaseIndex,
    readDatabase,
    writeDatabase,
    mutator: async (database) => ({
      changed: true as const,
      value: { sessionCount: database.sessionCount + 1 }
    })
  });
  assert.deepEqual(changedValue, { sessionCount: 2 });
  assert.deepEqual(committed, [[
    "normalization-write",
    "projection-sync",
    "session-write"
  ]]);
  assert.equal(writeCalls, 1);

  await assert.rejects(
    runExplicitVisualizationSessionPostgresMutation({
      begin,
      clearDatabaseIndex,
      readDatabase,
      writeDatabase,
      mutator: async () => {
        throw new Error("visualization hook failed");
      }
    }),
    /visualization hook failed/
  );
  assert.deepEqual(rolledBack, [
    ["normalization-write", "projection-sync"],
    ["normalization-write", "projection-sync"]
  ]);
  assert.equal(writeCalls, 1);
});

test("Postgres visualization rollback accepts only the exact per-call sentinel identity", async () => {
  const dependencies = {
    clearDatabaseIndex: () => undefined,
    readDatabase: async () => ({ sessionCount: 1 }),
    writeDatabase: async () => undefined,
    mutator: async () => ({
      changed: false as const,
      value: { trusted: true }
    })
  };
  const exactThrown: unknown[] = [];
  const exactValue = await runExplicitVisualizationSessionPostgresMutation({
    ...dependencies,
    begin: async (callback) => {
      try {
        return await callback({});
      } catch (error) {
        exactThrown.push(error);
        assert.equal(Object.isFrozen(error), true);
        assert.equal(Reflect.set(error as object, "value", { injected: true }), false);
        throw error;
      }
    }
  });
  assert.deepEqual(exactValue, { trusted: true });
  assert.equal(exactThrown.length, 1);

  for (const transform of [
    () => Object.create(Object.getPrototypeOf(exactThrown[0])) as object,
    () => Object.assign(Object.create(null) as object, { value: { injected: true } }),
    () => new Error("rollback replacement")
  ]) {
    const replacement = transform();
    await assert.rejects(
      runExplicitVisualizationSessionPostgresMutation({
        ...dependencies,
        begin: async (callback) => {
          try {
            return await callback({});
          } catch {
            throw replacement;
          }
        }
      }),
      (error) => error === replacement
    );
  }
});

test("Card outbox, A08 provider, route, storage, and reward form one exact durable contract", async () => {
  const [card, provider, route, requestBody, rootStore, persistence, rewards] = await Promise.all([
    readFile(path.join(process.cwd(), "components/visualizations/VisualizationCard.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "app/api/visualization-sessions/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/api/visualization-sessions/requestBody.ts"), "utf8"),
    readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8"),
    readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "lib/server/userStore/gamificationRewardRedemptionPersistence.ts"), "utf8")
  ]);

  assert.match(card, /const sessionRecord: VisualizationSessionOutboxRecord = \{[\s\S]*userId: currentUser\.id,[\s\S]*moduleId,[\s\S]*topicId,[\s\S]*source: analyticsSource,[\s\S]*queuedAt: Date\.now\(\)/);
  assert.match(card, /queueVisualizationSessionOutbox\(window\.localStorage, sessionRecord\)/);
  assert.doesNotMatch(card, /fetch\("\/api\/visualization-sessions"/);

  const providerPostStart = provider.indexOf('fetch("/api/visualization-sessions"');
  const providerPostEnd = provider.indexOf("const payload:", providerPostStart);
  const providerPost = provider.slice(providerPostStart, providerPostEnd);
  assert.notEqual(providerPostStart, -1);
  assert.match(providerPost, /"X-MAIS-Visualization-User-Id": encodeURIComponent\(record\.userId\)/);
  assert.match(providerPost, /body: JSON\.stringify\(\{[\s\S]*moduleId: record\.moduleId,[\s\S]*topicId: record\.topicId,[\s\S]*source: record\.source[\s\S]*\}\)/);

  assert.match(route, /const visualizationSessionRequestKeys = \[[\s\S]*"moduleId",[\s\S]*"source",[\s\S]*"topicId"/);
  assert.match(route, /request\.headers\.get\("x-mais-visualization-user-id"\)/);
  assert.match(route, /ownerUserId !== authenticated\.user\.id/);
  assert.match(route, /await parseExactVisualizationSessionRequestBody\(request\)/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.match(route, /if \(!isEligibleVisualizationSession\(identity\)\)/);
  assert.match(route, /if \(!isVisualizationSessionEligibleForLearner\(identity, authenticated\.user\)\)/);
  assert.match(route, /const session = await markVisualizationSession\(/);
  assert.match(route, /acknowledgedUserId: authenticated\.user\.id,[\s\S]*durablyPersisted: true,[\s\S]*session: serializeVisualizationSession\(session\)/);

  assert.match(requestBody, /request\.body\.getReader\(\)/);
  assert.match(requestBody, /new TextDecoder\("utf-8", \{ fatal: true/);
  assert.match(requestBody, /seenKeys\.has\(key\)/);
  assert.match(requestBody, /totalBytes > maxVisualizationSessionRequestBodyBytes/);

  assert.match(persistence, /candidate\.user_id === userId &&[\s\S]*candidate\.module_id === moduleId &&[\s\S]*candidate\.topic_id === topicId &&[\s\S]*candidate\.source === source/);
  assert.match(persistence, /session\?\.completed_at[\s\S]*changed: false as const/);
  assert.match(persistence, /return \{ changed: true as const, value: \{ \.\.\.session \} \}/);
  assert.equal(
    persistence.match(/return runVisualizationSessionMutation\(/g)?.length,
    1,
    "the explicit no-op mutation primitive is visualization-session-only"
  );
  assert.match(persistence, /await afterMarkVisualizationSession\?\.\(database/);
  assert.doesNotMatch(persistence, /Visualization session side effect failed/);

  const genericMutationStart = rootStore.indexOf("async function mutateDatabase<T>");
  const rollbackHelperStart = rootStore.indexOf("export async function runExplicitVisualizationSessionPostgresMutation");
  const explicitMutationStart = rootStore.indexOf("async function mutateVisualizationSessionDatabase<T>");
  const explicitMutationEnd = rootStore.indexOf("const toAuthenticatedUser", explicitMutationStart);
  const sqliteCasStart = rootStore.indexOf("async function runSqliteSnapshotCasMutationWithIdentity<T>");
  const sqliteCasEnd = rootStore.indexOf("async function runSqliteSnapshotCasMutation<T>", sqliteCasStart);
  const genericMutation = rootStore.slice(genericMutationStart, rollbackHelperStart);
  const rollbackHelper = rootStore.slice(rollbackHelperStart, explicitMutationStart);
  const explicitMutation = rootStore.slice(explicitMutationStart, explicitMutationEnd);
  const sqliteCas = rootStore.slice(sqliteCasStart, sqliteCasEnd);
  const sqliteMutatorStart = sqliteCas.indexOf("outcome = await mutator(database, parsed)");
  const sqliteTransactionStart = sqliteCas.indexOf('storage.exec("BEGIN IMMEDIATE")', sqliteMutatorStart);
  const sqlitePreTransactionMutator = sqliteCas.slice(sqliteMutatorStart, sqliteTransactionStart);
  assert.notEqual(sqliteCasStart, -1);
  assert.notEqual(sqliteCasEnd, -1);
  assert.notEqual(sqliteMutatorStart, -1);
  assert.notEqual(sqliteTransactionStart, -1);
  assert.doesNotMatch(genericMutation, /outcome\.changed/);
  assert.match(genericMutation, /runSqliteSnapshotCasMutation\([\s\S]*retrySafe: false/);
  assert.match(sqlitePreTransactionMutator, /catch \(error\)[\s\S]*databaseIndexCache\.delete\(database\)[\s\S]*throw error/);
  assert.doesNotMatch(sqlitePreTransactionMutator, /clearSqliteReadCache|BEGIN IMMEDIATE|UPDATE app_state|COMMIT|cacheSqliteDatabase/);
  assert.match(sqliteCas, /storage\.exec\("BEGIN IMMEDIATE"\)[\s\S]*WHERE id = \? AND revision = \?[\s\S]*storage\.exec\("COMMIT"\)[\s\S]*cacheSqliteDatabase\(database, committedIdentity\)/);
  assert.match(sqliteCas, /catch \(error\)[\s\S]*rollbackSqliteTransaction\(storage\)[\s\S]*databaseIndexCache\.delete\(database\)[\s\S]*clearSqliteReadCache\(\)[\s\S]*isSqliteBusyError\(error\)[\s\S]*continue;[\s\S]*throw error/);
  assert.match(sqliteCas, /sqliteStateRevision\(currentRow\) !== baseRevision[\s\S]*if \(!retrySafe\) throw new SqliteSnapshotRevisionConflictError\(\)[\s\S]*continue/);
  assert.match(sqliteCas, /clearSqliteReadCache\(\);[\s\S]*throw new Error\("SQLite snapshot mutation exhausted its revision retries\."\)/);
  assert.match(rollbackHelper, /const exactNoopRollback = Object\.freeze\(Object\.create\(null\) as object\)/);
  assert.match(rollbackHelper, /if \(!outcome\.changed\)[\s\S]*exactNoopValue = outcome\.value[\s\S]*throw exactNoopRollback/);
  assert.match(rollbackHelper, /error === exactNoopRollback && hasExactNoopValue[\s\S]*return exactNoopValue/);
  assert.doesNotMatch(rollbackHelper, /instanceof|error\.value/);
  assert.match(explicitMutation, /runExplicitVisualizationSessionPostgresMutation<Database, T>\(\{/);
  assert.match(explicitMutation, /readPostgresDatabaseFrom\([\s\S]*true,[\s\S]*true/);
  assert.match(explicitMutation, /runSqliteSnapshotCasMutation\([\s\S]*retrySafe: true/);
  assert.match(rewards, /JSON\.stringify\(\[userId, moduleId, topicId, source\]\)/);
  assert.match(rewards, /visualization-complete:v3:/);
});
