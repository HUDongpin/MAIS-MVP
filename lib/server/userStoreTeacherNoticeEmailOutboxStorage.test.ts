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
    /getPostgresClient\(\)\.begin\(async \(sql\) =>[\s\S]*runTeacherNoticeEmailOutboxPostgresAttestedTransaction\(\s*sql/
  );
  assert.ok(
    publication.indexOf("runTeacherNoticeEmailOutboxPostgresAttestedTransaction(") <
      publication.indexOf("readPostgresDatabaseFrom(sql"),
    "publication DML must follow the in-transaction lock and attestation helper"
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
});

test("publication writes app_state and immutable outbox rows in one physical transaction", async () => {
  const source = await readFile(rootPath, "utf8");
  const section = sourceSection(
    source,
    "async function mutateDatabaseWithTeacherNoticeEmailOutbox",
    "async function claimTeacherNoticeEmailOutboxItem"
  );
  assert.doesNotMatch(section, /await ensureTeacherNoticeEmailOutboxPostgresSchema\(\)/);
  assert.match(section, /runTeacherNoticeEmailOutboxPostgresAttestedTransaction/);
  assert.match(section, /getPostgresClient\(\)\.begin/);
  assert.match(section, /readPostgresDatabaseFrom\(sql, true, true\)/);
  assert.match(section, /writePostgresDatabaseWith\(sql, database, true\)/);
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
  const section = sourceSection(
    source,
    "async function claimTeacherNoticeEmailOutboxItem",
    "async function completeTeacherNoticeEmailOutboxItem"
  );
  const appStateLock = section.indexOf("FOR UPDATE OF app_state");
  const skipLocked = section.indexOf("FOR UPDATE SKIP LOCKED");
  assert.ok(appStateLock >= 0, "claim must lock authoritative app_state");
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
