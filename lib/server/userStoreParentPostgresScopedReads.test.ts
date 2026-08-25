import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const userStorePath = path.join(process.cwd(), "lib/server/userStore.ts");

test("parent Postgres reads use a family-scoped query without a full snapshot fallback", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);

  assert.notEqual(scopedStart, -1);
  assert.notEqual(scopedEnd, -1);
  assert.match(scopedSource, /await ensurePostgresStateTable\(\);/);
  assert.match(scopedSource, /WITH scoped_state AS MATERIALIZED \(/);
  assert.equal((scopedSource.match(/FROM app_state AS state/g) ?? []).length, 1);
  assert.match(scopedSource, /state\.payload->'guardian_links' AS guardian_links/);
  assert.match(scopedSource, /FROM projection_users/);
  assert.match(scopedSource, /NULLIF\(projected_user\.record->>'disabled_at', ''\) IS NULL/);
  assert.match(scopedSource, /FROM scoped_state\s+CROSS JOIN authorized_parent\s+LIMIT 1/);
  assert.match(scopedSource, /FROM projection_lesson_progress/);
  assert.match(scopedSource, /FROM practice_attempts/);
  assert.match(scopedSource, /FROM mistake_book_items/);
  assert.match(scopedSource, /FROM learning_events/);
  assert.doesNotMatch(scopedSource, /readPostgresDatabase|readDatabase\(\)/);
  assert.doesNotMatch(scopedSource, /SELECT\s+(?:state\.)?payload(?!->)/);
});

test("parent scoped reads guarantee reusable hot-activity schema readiness before the snapshot query", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);
  const readinessCall = scopedSource.indexOf("await ensurePostgresStudentActivityTables();");
  const scopedQuery = scopedSource.indexOf("WITH scoped_state AS MATERIALIZED (");

  assert.match(
    source,
    /import \{[^}]*ensurePostgresStudentActivityTables[^}]*\} from "@\/lib\/server\/practiceAttemptStore";/
  );
  assert.notEqual(readinessCall, -1, "cold Postgres must create the three activity tables before reading them");
  assert.notEqual(scopedQuery, -1);
  assert.ok(readinessCall < scopedQuery, "schema readiness must finish before the one scoped MVCC snapshot starts");
  for (const table of ["practice_attempts", "mistake_book_items", "learning_events"]) {
    assert.match(scopedSource, new RegExp(`FROM ${table}`));
  }
});

test("parent authority CTEs require projection scalar keys to equal their JSON record keys", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);
  const parityPairs = [
    ["projected_user.id", "projected_user.record->>'id'"],
    ["projected_user.role", "projected_user.record->>'role'"],
    ["projected_enrollment.id", "projected_enrollment.record->>'id'"],
    ["projected_enrollment.class_id", "projected_enrollment.record->>'class_id'"],
    ["projected_enrollment.student_id", "projected_enrollment.record->>'student_id'"],
    ["projected_class.id", "projected_class.record->>'id'"],
    ["projected_class.teacher_id", "projected_class.record->>'teacher_id'"],
    ["projected_class.grade", "projected_class.record->>'grade'"],
    ["projected_message.id", "projected_message.record->>'id'"],
    ["projected_message.teacher_id", "projected_message.record->>'teacher_id'"],
    ["projected_message.class_id", "NULLIF(projected_message.record->>'class_id', '')"],
    ["projected_message.student_id", "projected_message.record->>'student_id'"],
    ["projected_profile.user_id", "projected_profile.record->>'user_id'"],
    ["projected_profile.grade", "projected_profile.record->>'grade'"],
    ["projected_membership.user_id", "projected_membership.record->>'user_id'"],
    ["projected_membership.class_id", "NULLIF(projected_membership.record->>'class_id', '')"],
    ["projected_membership.role", "projected_membership.record->>'role'"],
    ["projected_assignment.id", "projected_assignment.record->>'id'"],
    ["projected_assignment.class_id", "projected_assignment.record->>'class_id'"],
    ["projected_submission.id", "projected_submission.record->>'id'"],
    ["projected_submission.assignment_id", "projected_submission.record->>'assignment_id'"],
    ["projected_submission.student_id", "projected_submission.record->>'student_id'"]
  ] as const;

  for (const [scalar, recordField] of parityPairs) {
    const escapedScalar = scalar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedRecord = recordField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      scopedSource,
      new RegExp(`${escapedScalar} IS NOT DISTINCT FROM ${escapedRecord}`),
      `${scalar} must fail closed when its projection record drifts`
    );
  }

  assert.equal(
    (scopedSource.match(/FROM projection_student_profiles AS projected_profile/g) ?? []).length,
    1,
    "student grades must consume the already parity-filtered profile CTE"
  );
  assert.match(
    scopedSource,
    /student_grades AS \(\s*SELECT profile_record->>'grade' AS grade\s*FROM student_profile_records\s*WHERE profile_record->>'user_id' IN \(SELECT student_id FROM student_ids\)/,
    "topic grade scope must derive only from parity-filtered student profile records"
  );
});

test("parent scoped SQL uses a transaction-local database statement timeout and the private 503 boundary", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);
  const responseSource = await readFile(path.join(process.cwd(), "app/api/parent/response.ts"), "utf8");
  const handlerSources = await Promise.all([
    readFile(path.join(process.cwd(), "app/api/parent/handlers.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/api/parent/messageHandlers.ts"), "utf8")
  ]);

  assert.match(source, /const parentPostgresScopedReadStatementTimeoutMs = 5_000;/);
  assert.match(scopedSource, /getPostgresClient\(\)\.begin\(async \(sql\) => \{/);
  assert.match(
    scopedSource,
    /set_config\(\s*'statement_timeout',\s*\$\{`\$\{parentPostgresScopedReadStatementTimeoutMs\}ms`\},\s*true\s*\)/
  );
  assert.equal((scopedSource.match(/WITH scoped_state AS MATERIALIZED \(/g) ?? []).length, 1);
  assert.equal((scopedSource.match(/FROM app_state AS state/g) ?? []).length, 1);
  assert.doesNotMatch(scopedSource, /Promise\.race|AbortController|\.cancel\(\)|\.end\(\)/);
  assert.match(responseSource, /\{ error: "Parent data temporarily unavailable\." \}[\s\S]*status: 503/);
  for (const handlerSource of handlerSources) {
    assert.match(handlerSource, /catch \{[\s\S]*return parentPersistenceUnavailable\(\);/);
  }
});

test("parent scoped SQL validates app-state metadata before filtering family-owned records", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);

  assert.match(scopedSource, /state\.id = \$\{stateRecordId\}/);
  assert.match(scopedSource, /state\.tenant_id = \$\{stateTenantId\}/);
  assert.match(scopedSource, /state\.state_kind = \$\{stateKind\}/);
  assert.match(scopedSource, /state\.schema_version = \$\{schemaVersion\}/);
  assert.match(scopedSource, /jsonb_typeof\(state\.payload\) = 'object'/);
  assert.match(scopedSource, /link_record->>'parent_id' = \$\{parentId\}/);
  assert.match(scopedSource, /link_record->>'status' = 'active'/);
  assert.match(scopedSource, /projected_message\.record->>'guardian_id' = \$\{parentId\}/);
  assert.match(
    scopedSource,
    /entry_record->>'sender_id' = \$\{parentId\}[\s\S]*entry_record->>'recipient_id' = \$\{parentId\}/
  );
  assert.match(scopedSource, /recipient_record->>'guardian_id' = \$\{parentId\}/);
  assert.match(
    scopedSource,
    /NULLIF\(report_record->>'class_id', ''\) IS NULL[\s\S]*report_record->>'class_id' IN \(SELECT class_id FROM class_ids\)/
  );
  assert.match(
    scopedSource,
    /state\.payload->'assignment_submission_attempts' AS assignment_submission_attempts/
  );
  assert.match(
    scopedSource,
    /attempt_record->>'submission_id' IN \(SELECT submission_id FROM submission_ids\)/
  );
});

test("parent scoped reads reject malformed projected collection results instead of returning partial data", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);

  assert.match(source, /const parentPostgresScopedCollectionKeys = \[/);
  assert.match(
    scopedSource,
    /parentPostgresScopedCollectionKeys\.some\(\(key\) => !Array\.isArray\(rawRow\[key\]\)\)/
  );
  assert.match(scopedSource, /const row = scopeParentPostgresCollections\(rawRow, parentId\);/);
  assert.match(scopedSource, /throw new Error\("Parent Postgres scoped state is unavailable\."\)/);
});

test("parent scoped SQL rejects every malformed app-state collection required by the result", async () => {
  const source = await readFile(userStorePath, "utf8");
  const scopedStart = source.indexOf("async function readParentPostgresScopedDatabase(parentId: string)");
  const scopedEnd = source.indexOf("async function readParentDatabaseForRead(parentId: string)", scopedStart);
  const scopedSource = source.slice(scopedStart, scopedEnd);
  const requiredSnapshotArrays = [
    "guardian_links",
    "teacher_reports",
    "teacher_message_entries",
    "teacher_notices",
    "teacher_notice_recipients",
    "teacher_review_lessons",
    "assignment_submission_attempts",
    "assignment_grading_runs"
  ];

  for (const collection of requiredSnapshotArrays) {
    assert.match(
      scopedSource,
      new RegExp(`jsonb_typeof\\(state\\.payload->'${collection}'\\) = 'array'`),
      `${collection} must fail closed when its app-state value is missing or malformed`
    );
  }
});

test("parent GET stores receive the parent id while SQLite and mutation reads keep the legacy reader", async () => {
  const source = await readFile(userStorePath, "utf8");
  const fallbackStart = source.indexOf("async function readParentDatabaseForRead(parentId: string)");
  const fallbackEnd = source.indexOf("const parentAccessPersistenceStore", fallbackStart);
  const fallbackSource = source.slice(fallbackStart, fallbackEnd);
  const domainPaths = [
    "lib/server/userStore/parentFoundationPersistence.ts",
    "lib/server/userStore/parentReportPersistence.ts",
    "lib/server/userStore/parentMessagePersistence.ts",
    "lib/server/userStore/parentNoticePersistence.ts"
  ];

  assert.match(
    fallbackSource,
    /if \(storageProvider !== "postgres"\) return readDatabase\(\);\s+return readParentPostgresScopedDatabase\(parentId\);/
  );
  assert.equal(
    (source.match(/readParentDatabase: readParentDatabaseForRead/g) ?? []).length,
    4
  );

  for (const domainPath of domainPaths) {
    const domainSource = await readFile(path.join(process.cwd(), domainPath), "utf8");
    assert.match(domainSource, /readParentDatabase\?: \(parentId: string\) => Promise</);
    assert.match(domainSource, /const loadParentDatabase = readParentDatabase \?\?/);
    assert.match(domainSource, /await loadParentDatabase\(parentId\)/);
    assert.match(domainSource, /readDatabase: \(\) => Promise/);
  }
});
