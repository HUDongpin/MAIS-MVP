import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const userStoreSource = readFileSync("lib/server/userStore.ts", "utf8");
const warmRouteSource = readFileSync("app/api/warm/route.ts", "utf8");
const warmHandlerSource = readFileSync("app/api/warm/handler.ts", "utf8");
const storageHealthRouteSource = readFileSync("app/api/admin/storage/health/route.ts", "utf8");
const storageHealthHandlerSource = readFileSync("app/api/admin/storage/health/handler.ts", "utf8");
const storageAdminSource = readFileSync("scripts/storage-admin-snapshot-merge.mjs", "utf8");

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

function exportedConstNames(source) {
  return [...source.matchAll(/\bexport\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)/gu)]
    .map((match) => match[1]);
}

test("warm handler has a read-only dependency boundary and never invokes the schema initializer", () => {
  const verifierSource = sourceSection(
    userStoreSource,
    "async function runPostgresDurableReadinessWithinDeadline(",
    "async function hasCurrentPostgresSchemaMarker()"
  );
  assert.doesNotMatch(
    verifierSource,
    /ensurePostgresStateTable|bootstrapPostgresStateTables|pg_advisory_xact_lock|\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i
  );
  assert.match(verifierSource, /probePostgresDurableReadinessStrict\(/);
  assert.doesNotMatch(verifierSource, /SELECT\s+(?:state\.)?payload\b|FOR\s+UPDATE/i);
  assert.match(warmHandlerSource, /export function createWarmRouteHandler\(/);
  assert.match(warmHandlerSource, /if \(!secret\)[\s\S]*status: 503/);
  assert.match(warmHandlerSource, /Cache-Control["']?: ["']private, no-store, max-age=0["']/);
  assert.doesNotMatch(warmHandlerSource, /ensurePostgresStateTable|bootstrapPostgresStateTables/);
  const boundedProbeSource = sourceSection(
    userStoreSource,
    "async function withBoundedPostgresReadinessTransaction",
    "async function postgresStorageReadinessCatalogIsComplete"
  );
  const readOnlyIndex = boundedProbeSource.indexOf(
    "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"
  );
  const timeoutIndex = boundedProbeSource.indexOf("set_config('lock_timeout', '1000ms', true)");
  assert.notEqual(readOnlyIndex, -1);
  assert.equal(readOnlyIndex < timeoutIndex, true, "read-only mode must precede every probe query");
});

test("readiness route modules only assemble server handlers through Next-supported exports", () => {
  assert.deepEqual(exportedConstNames(storageHealthRouteSource), ["runtime", "GET"]);
  assert.match(
    storageHealthRouteSource,
    /import \{ createStorageHealthRouteHandler \} from ["']\.\/handler["']/u
  );
  assert.match(storageHealthRouteSource, /export const GET = createStorageHealthRouteHandler\(\{/u);
  assert.doesNotMatch(
    storageHealthRouteSource,
    /\bexport\s+(?:async\s+)?function\b|\bexport\s+(?:type|interface|class)\b|NextResponse|privateNoStoreHeaders|storageHealthSafeDto/u
  );
  assert.match(storageHealthHandlerSource, /export function createStorageHealthRouteHandler\(/u);
  assert.match(
    storageHealthHandlerSource,
    /Cache-Control["']?: ["']private, no-store, max-age=0["']/u
  );
  assert.match(storageHealthHandlerSource, /function storageHealthSafeDto\(/u);

  assert.deepEqual(exportedConstNames(warmRouteSource), ["runtime", "dynamic", "GET"]);
  assert.match(
    warmRouteSource,
    /import \{ createWarmRouteHandler \} from ["']\.\/handler["']/u
  );
  assert.match(warmRouteSource, /export const GET = createWarmRouteHandler\(\{/u);
  assert.doesNotMatch(
    warmRouteSource,
    /\bexport\s+(?:async\s+)?function\b|\bexport\s+(?:type|interface|class)\b|NextResponse|privateNoStoreHeaders/u
  );
  assert.match(warmHandlerSource, /export function createWarmRouteHandler\(/u);
});

test("userStore wires the migration marker probe ahead of the schema bootstrap", () => {
  assert.match(
    userStoreSource,
    /import \{[\s\S]*createPostgresSchemaReadinessGate,[\s\S]*runPostgresBootstrapWithContentionRecovery[\s\S]*\} from "@\/lib\/server\/userStore\/postgresSchemaReadiness";/
  );
  assert.match(userStoreSource, /async function hasCurrentPostgresSchemaMarker\(\)/);
  assert.match(
    userStoreSource,
    /async function hasCurrentPostgresSchemaMarker\(\) \{\s+return \(await probePostgresDurableReadinessStrict\([\s\S]*?\)\) === true;\s+\}/
  );
  assert.match(
    userStoreSource,
    /async function getPostgresHotAuthReadinessSnapshot\([\s\S]*includeDiagnosticsCounts[\s\S]*await runPostgresDurableReadinessWithinDeadline\(/
  );
  const durableSnapshotSource = sourceSection(
    userStoreSource,
    "async function getPostgresHotAuthReadinessSnapshot(",
    "async function runPostgresHotAuthBackfillForAdmin"
  );
  assert.match(
    durableSnapshotSource,
    /runPostgresDurableReadinessWithinDeadline\(\s*includeDiagnosticsCounts\s*\)/u
  );
  assert.match(userStoreSource, /FROM public\.auth_schema_migrations\s+WHERE version = \$\{hotAuthSchemaVersion\}/);
  const catalogProbeStart = userStoreSource.indexOf("/* postgres_storage_readiness_catalog_probe */");
  const catalogProbeEnd = userStoreSource.indexOf(
    "async function postgresStorageReadinessMarkerIsCurrent",
    catalogProbeStart
  );
  const catalogProbeSource = userStoreSource.slice(catalogProbeStart, catalogProbeEnd);
  assert.notEqual(catalogProbeStart, -1);
  assert.notEqual(catalogProbeEnd, -1);
  assert.match(catalogProbeSource, /pg_catalog\.pg_namespace/);
  assert.match(catalogProbeSource, /namespace\.nspname = 'public'/);
  assert.match(catalogProbeSource, /relation\.relkind::text AS relation_kind/);
  assert.match(catalogProbeSource, /pg_catalog\.pg_type/);
  assert.match(catalogProbeSource, /pg_catalog\.pg_constraint/);
  assert.match(catalogProbeSource, /primary_constraint\.contype = 'p'/);
  assert.match(catalogProbeSource, /primary_constraint\.convalidated/);
  assert.match(catalogProbeSource, /unnest\(primary_constraint\.conkey\) WITH ORDINALITY/);
  assert.doesNotMatch(catalogProbeSource, /state\.payload|SELECT\s+payload|jsonb_/i);
  const markerProbeStart = userStoreSource.indexOf("/* postgres_storage_readiness_marker_probe */");
  const markerProbeEnd = userStoreSource.indexOf(
    "export async function probePostgresStorageReadinessStrict",
    markerProbeStart
  );
  const markerProbeSource = userStoreSource.slice(markerProbeStart, markerProbeEnd);
  assert.notEqual(markerProbeStart, -1);
  assert.notEqual(markerProbeEnd, -1);
  assert.match(markerProbeSource, /SELECT EXISTS \(/);
  assert.match(markerProbeSource, /ON marker\.state_id = state\.id/);
  assert.match(markerProbeSource, /marker\.tenant_id = state\.tenant_id/);
  assert.match(markerProbeSource, /marker\.state_kind = state\.state_kind/);
  assert.match(markerProbeSource, /marker\.schema_version = state\.schema_version/);
  assert.match(markerProbeSource, /marker\.state_revision = state\.revision/);
  assert.match(markerProbeSource, /WHERE state\.id = \$\{state\.id\}/);
  assert.match(markerProbeSource, /state\.tenant_id = \$\{state\.tenantId\}/);
  assert.match(markerProbeSource, /state\.state_kind = \$\{state\.stateKind\}/);
  assert.match(markerProbeSource, /state\.schema_version = \$\{state\.schemaVersion\}/);
  assert.match(
    markerProbeSource,
    /marker\.contract_version = \$\{postgresStorageReadinessContractVersion\}/
  );
  assert.match(
    markerProbeSource,
    /FROM public\.auth_schema_migrations\s+WHERE version = \$\{hotAuthSchemaVersion\}/
  );
  assert.match(userStoreSource, /async function bootstrapPostgresStateTables\(\)/);
  assert.match(
    userStoreSource,
    /const ensurePostgresStateTable = createPostgresSchemaReadinessGate\(\{\s+readCurrentMarker: hasCurrentPostgresSchemaMarker,\s+bootstrap: \(\) => runPostgresBootstrapWithContentionRecovery\(\{[\s\S]*bootstrap: bootstrapPostgresStateTables,[\s\S]*readCurrentMarker: hasCurrentPostgresSchemaMarker[\s\S]*\}\)\s+\}\);/
  );
  assert.doesNotMatch(userStoreSource, /let postgresReady: Promise<void> \| null/);
});

test("schema bootstrap is one canonical, bounded, validated readiness path", () => {
  const bootstrapSource = sourceSection(
    userStoreSource,
    "async function bootstrapPostgresStateTables()",
    "const ensurePostgresStateTable"
  );
  const defaultLockTimeout = bootstrapSource.indexOf('lockTimeout: "1000ms"');
  const defaultStatementTimeout = bootstrapSource.indexOf('statementTimeout: "5000ms"');
  const timeoutStatement = bootstrapSource.indexOf("set_config('lock_timeout', ${lockTimeout}, true)");
  const statementTimeout = bootstrapSource.indexOf("set_config('statement_timeout', ${statementTimeout}, true)");
  const advisoryLock = bootstrapSource.indexOf("pg_advisory_xact_lock");
  const appStateTable = bootstrapSource.indexOf("CREATE TABLE IF NOT EXISTS public.app_state (");
  const readinessMarkerTable = bootstrapSource.indexOf(
    "CREATE TABLE IF NOT EXISTS public.app_state_readiness_markers"
  );
  const hotAuthTable = bootstrapSource.indexOf("CREATE TABLE IF NOT EXISTS public.auth_users");
  const authMigrationTable = bootstrapSource.indexOf(
    "CREATE TABLE IF NOT EXISTS public.auth_schema_migrations"
  );
  const snapshotRead = bootstrapSource.indexOf("const readinessSnapshotRows");
  const fullValidation = bootstrapSource.indexOf(
    "validateCompletePostgresStorageSnapshot(readinessSnapshot)"
  );
  const authMarkerInsert = bootstrapSource.indexOf("INSERT INTO auth_schema_migrations");
  const validatedMarkerAttestation = bootstrapSource.indexOf(
    "await attestValidatedPostgresStorageSnapshot("
  );
  const firstMigrationStatement = bootstrapSource.indexOf("await migrationSql`");
  const secondMigrationStatement = bootstrapSource.indexOf(
    "await migrationSql`",
    firstMigrationStatement + 1
  );

  for (const index of [
    timeoutStatement,
    statementTimeout,
    defaultLockTimeout,
    defaultStatementTimeout,
    advisoryLock,
    appStateTable,
    readinessMarkerTable,
    hotAuthTable,
    authMigrationTable,
    snapshotRead,
    fullValidation,
    authMarkerInsert,
    validatedMarkerAttestation
  ]) {
    assert.notEqual(index, -1);
  }
  assert.equal(timeoutStatement < advisoryLock, true, "lock timeout must precede advisory locking");
  assert.equal(statementTimeout < advisoryLock, true, "statement timeout must precede advisory locking");
  assert.equal(firstMigrationStatement < timeoutStatement, true, "timeouts must be the first SQL statement");
  assert.equal(secondMigrationStatement < advisoryLock, true, "the advisory lock must be the second SQL statement");
  assert.equal(advisoryLock < appStateTable, true, "the advisory lock must precede canonical DDL");
  assert.equal(appStateTable < readinessMarkerTable, true);
  assert.equal(readinessMarkerTable < hotAuthTable, true);
  assert.equal(authMigrationTable < snapshotRead, true);
  assert.equal(snapshotRead < fullValidation, true);
  assert.equal(fullValidation < authMarkerInsert, true);
  assert.equal(authMarkerInsert < validatedMarkerAttestation, true);
  assert.equal(
    validatedMarkerAttestation,
    bootstrapSource.lastIndexOf("await "),
    "validated readiness attestation must be the final bootstrap operation"
  );
  assert.equal(
    (userStoreSource.match(/CREATE TABLE IF NOT EXISTS public\.app_state_readiness_markers/g) ?? []).length,
    1,
    "readiness marker DDL must exist only in canonical bootstrap"
  );
  assert.doesNotMatch(
    bootstrapSource,
    /CREATE TABLE IF NOT EXISTS\s+(?!public\.)[a-z_]/iu,
    "canonical bootstrap must never create a relation through the ambient search_path"
  );
  assert.doesNotMatch(
    bootstrapSource,
    /ALTER TABLE\s+(?!public\.)[a-z_]/iu,
    "canonical bootstrap must never alter a relation through the ambient search_path"
  );
  assert.doesNotMatch(
    bootstrapSource,
    /CREATE INDEX IF NOT EXISTS[^`]+?\sON\s+(?!public\.)[a-z_]/giu,
    "canonical bootstrap indexes must bind their target relation to public"
  );
  assert.match(
    bootstrapSource,
    /pg_catalog\.set_config\('search_path', 'pg_catalog, public', true\)/u
  );
  assert.doesNotMatch(
    userStoreSource,
    /ensurePostgresStorageMetadataSchema|createPostgresStorageReadinessGate|bootstrapPostgresMetadataSurface/
  );
  assert.match(userStoreSource, /validateCompletePostgresStorageSnapshot\(/);
  assert.match(userStoreSource, /attestValidatedPostgresStorageSnapshot\(/);
});

test("production schema gate reuses the canonical bootstrap with an empty-state lock and strict postflight", () => {
  const canonicalBootstrapSource = sourceSection(
    userStoreSource,
    "async function bootstrapPostgresStateTablesOnClient(",
    "const ensurePostgresStateTable"
  );
  const inspectSource = sourceSection(
    userStoreSource,
    "export async function inspectPostgresStorageSchemaForProductionGate(",
    "export async function applyPostgresStorageSchemaForProductionGate("
  );
  const applySource = sourceSection(
    userStoreSource,
    "export async function applyPostgresStorageSchemaForProductionGate(",
    "async function configureTeacherNoticeEmailOutboxPostgresTransaction("
  );

  const exclusiveLock = canonicalBootstrapSource.indexOf("postgres_storage_contract_exclusive_advisory_lock");
  const emptyStateCheck = canonicalBootstrapSource.indexOf("postgres_storage_production_gate_empty_check");
  const firstDdl = canonicalBootstrapSource.indexOf("CREATE TABLE IF NOT EXISTS public.app_state");
  assert.notEqual(exclusiveLock, -1);
  assert.notEqual(emptyStateCheck, -1);
  assert.notEqual(firstDdl, -1);
  assert.equal(exclusiveLock < emptyStateCheck && emptyStateCheck < firstDdl, true);
  assert.match(inspectSource, /REPEATABLE READ, READ ONLY/u);
  assert.match(inspectSource, /acquirePostgresStorageContractSharedAdvisoryLock/u);
  assert.match(inspectSource, /postgresStorageReadinessCatalogIsComplete/u);
  assert.match(inspectSource, /postgresHotAuthReadinessCatalogIsComplete/u);
  assert.doesNotMatch(inspectSource, /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/iu);
  assert.match(`${inspectSource}\n${applySource}`, /MAIS_PRODUCTION_APP_STORAGE_SCHEMA_GATE/u);
  assert.match(`${inspectSource}\n${applySource}`, /GITHUB_REF_PROTECTED/u);
  assert.match(applySource, /expectedState: "empty"/u);
  assert.match(applySource, /bootstrapPostgresStateTablesOnClient/u);
  assert.match(applySource, /postflightState !== "exact"/u);
});

test("canonical bootstrap installs one transactional marker invalidation trigger with a locked-down function", () => {
  const bootstrapSource = sourceSection(
    userStoreSource,
    "async function bootstrapPostgresStateTables()",
    "const ensurePostgresStateTable"
  );
  const markerTableIndex = bootstrapSource.indexOf("CREATE TABLE IF NOT EXISTS public.app_state_readiness_markers");
  const functionIndex = bootstrapSource.indexOf(
    "CREATE OR REPLACE FUNCTION public.invalidate_app_state_readiness_marker()"
  );
  const triggerIndex = bootstrapSource.indexOf("CREATE TRIGGER app_state_readiness_invalidate");
  const firstPayloadMutationIndex = bootstrapSource.indexOf("UPDATE public.app_state");

  assert.notEqual(markerTableIndex, -1);
  assert.equal(markerTableIndex < functionIndex, true);
  assert.equal(functionIndex < triggerIndex, true);
  assert.equal(triggerIndex < firstPayloadMutationIndex, true);
  assert.match(
    bootstrapSource,
    /CREATE OR REPLACE FUNCTION public\.invalidate_app_state_readiness_marker\(\)\s+RETURNS trigger\s+LANGUAGE plpgsql\s+VOLATILE\s+SECURITY INVOKER\s+SET search_path = pg_catalog, public/iu
  );
  assert.match(
    bootstrapSource,
    /IF TG_OP = 'UPDATE' THEN[\s\S]*DELETE FROM public\.app_state_readiness_markers\s+WHERE state_id IN \(OLD\.id, NEW\.id\);[\s\S]*ELSE[\s\S]*WHERE state_id = NEW\.id;[\s\S]*RETURN NEW;/iu
  );
  assert.match(
    bootstrapSource,
    /CREATE TRIGGER app_state_readiness_invalidate\s+AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version\s+ON public\.app_state\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.invalidate_app_state_readiness_marker\(\)/iu
  );
  assert.equal(
    (bootstrapSource.match(/CREATE TRIGGER app_state_readiness_invalidate/g) ?? []).length,
    1,
    "there must be one canonical invalidation trigger DDL path"
  );
  assert.match(userStoreSource, /\/\* postgres_storage_readiness_invalidation_probe \*\//);
});

test("partial writers use one opaque CAS capability and full writers validate exactly once", () => {
  for (const [startMarker, endMarker] of [
    ["async function recordAITutorMessageFromPostgresJournal(", "async function recordAITutorUsageFromPostgresJournal("],
    ["async function recordAITutorUsageFromPostgresJournal(", "async function closeAiTutorPostgresClientsForIntegrationTest("],
    ["async function createPasswordResetRequestInPostgresHotTables(", "export const createPasswordResetRequest"],
    ["async function resetUserPasswordInPostgresHotTables(", "export const resetUserPassword"]
  ]) {
    const writerSource = sourceSection(userStoreSource, startMarker, endMarker);
    assert.match(writerSource, /acquirePostgresStorageMutationCapability\(/);
    assert.match(writerSource, /advancePostgresStorageReadinessAfterMutation\(/);
    assert.match(writerSource, /AND state\.revision = \$\{storageCapability\.previousRevision\}/);
    assert.match(writerSource, /RETURNING state\.revision/);
    assert.doesNotMatch(writerSource, /SELECT\s+(?:state\.)?payload\b/i);
    assert.doesNotMatch(writerSource, /attestCurrentPostgresStorageSnapshot/);
  }

  const fullWriterSource = sourceSection(
    userStoreSource,
    "async function writePostgresDatabaseWith",
    "async function readDatabase"
  );
  assert.equal(
    (fullWriterSource.match(/validateCompletePostgresStorageSnapshot\(writtenState\.payload\)/g) ?? []).length,
    1,
    "the actual returned snapshot must be normalized/validated once"
  );
  assert.match(
    fullWriterSource,
    /RETURNING[\s\S]*state\.payload,[\s\S]*state\.revision[\s\S]*state\.payload = [\s\S]*AS payload_matches/iu
  );
  assert.match(fullWriterSource, /writtenState\.payload_matches !== true/u);
  assert.match(fullWriterSource, /advancePostgresStorageReadinessAfterMutation\(/);
  assert.doesNotMatch(fullWriterSource, /attestCompletePostgresStorageSnapshot\(/);
});

test("storage admin apply is transactional, revision-CAS safe, and can only invalidate readiness", () => {
  const transactionSource = sourceSection(
    storageAdminSource,
    "export async function applyMergedSnapshotInTransaction(",
    "async function applyMergedSnapshotToPostgres("
  );
  const applySource = sourceSection(
    storageAdminSource,
    "async function applyMergedSnapshotToPostgres(",
    "function fakeSnapshot("
  );
  assert.match(applySource, /return await sql\.begin\(async \(transactionSql\) =>/);
  assert.match(applySource, /applyMergedSnapshotInTransaction\(transactionSql, snapshot, expectedCurrentDatabase\)/);
  assert.match(transactionSource, /SELECT\s+revision,\s+payload[\s\S]*FOR UPDATE OF app_state/iu);
  assert.match(transactionSource, /UPDATE public\.app_state[\s\S]*revision = \$\{currentRevision\}/iu);
  assert.match(transactionSource, /revision = public\.app_state\.revision \+ 1/);
  assert.match(transactionSource, /RETURNING public\.app_state\.revision/);
  assert.match(
    transactionSource,
    /DELETE FROM public\.app_state_readiness_markers[\s\S]*WHERE state_id = 'primary'/iu
  );
  assert.doesNotMatch(transactionSource, /INSERT INTO app_state_readiness_markers|attest/i);
  assert.doesNotMatch(transactionSource, /\b(?:CREATE|ALTER|DROP)\b|INSERT INTO app_state/iu);
  const updateIndex = transactionSource.indexOf("UPDATE public.app_state");
  const invalidationIndex = transactionSource.indexOf("DELETE FROM public.app_state_readiness_markers");
  assert.equal(updateIndex < invalidationIndex, true);
});

test("storage admin executor rejects stale CAS and only reports not-ready after marker deletion", async () => {
  const { applyMergedSnapshotInTransaction } = await import("./storage-admin-snapshot-merge.mjs");
  const currentDatabase = { users: [{ id: "current" }] };
  const mergedSnapshot = {
    schemaVersion: 1,
    database: { users: [{ id: "current" }, { id: "imported" }] }
  };

  function createExecutor({ currentPayload = currentDatabase, updateRows = [{ revision: 12 }] } = {}) {
    const statements = [];
    const sql = async (strings, ...values) => {
      const text = strings.join("$value");
      statements.push({ text, values });
      if (/SELECT\s+revision,\s+payload/iu.test(text)) {
        return [{ revision: 11, payload: structuredClone(currentPayload) }];
      }
      if (/UPDATE public\.app_state/iu.test(text)) return structuredClone(updateRows);
      if (/DELETE FROM public\.app_state_readiness_markers/iu.test(text)) return [];
      return [];
    };
    return { sql, statements };
  }

  const success = createExecutor();
  assert.deepEqual(
    await applyMergedSnapshotInTransaction(success.sql, mergedSnapshot, currentDatabase),
    { revision: 12, storageReady: false }
  );
  assert.deepEqual(
    success.statements.map(({ text }) =>
      /set_config/iu.test(text) ? "timeouts"
        : /SELECT\s+revision,\s+payload/iu.test(text) ? "lock"
          : /UPDATE public\.app_state/iu.test(text) ? "cas-update"
            : /DELETE FROM public\.app_state_readiness_markers/iu.test(text) ? "invalidate"
              : "unknown"
    ),
    ["timeouts", "lock", "cas-update", "invalidate"]
  );
  const updateStatement = success.statements.find(({ text }) => /UPDATE public\.app_state/iu.test(text));
  assert.ok(updateStatement);
  assert.equal(updateStatement.values.includes(11), true);
  assert.equal(updateStatement.values.includes(1), true);
  assert.equal(
    updateStatement.values.includes(JSON.stringify(currentDatabase)),
    true,
    "the exported snapshot remains a concrete compare-and-swap token"
  );

  const stale = createExecutor({ updateRows: [] });
  await assert.rejects(
    applyMergedSnapshotInTransaction(stale.sql, mergedSnapshot, currentDatabase),
    /^Error: Target app_state changed while the merged snapshot was being applied\.$/u
  );
  assert.equal(
    stale.statements.some(({ text }) => /DELETE FROM public\.app_state_readiness_markers/iu.test(text)),
    false,
    "a stale CAS must abort before any success report or follow-up marker operation"
  );

  const mismatched = createExecutor({ currentPayload: { users: [{ id: "other" }] } });
  await assert.rejects(
    applyMergedSnapshotInTransaction(mismatched.sql, mergedSnapshot, currentDatabase),
    /^Error: Target app_state differs from --current snapshot/u
  );
  assert.equal(
    mismatched.statements.some(({ text }) => /UPDATE public\.app_state/iu.test(text)),
    false
  );
});
