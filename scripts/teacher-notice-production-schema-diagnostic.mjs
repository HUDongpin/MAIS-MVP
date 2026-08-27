import { createHash } from "node:crypto";

const storageContractAdvisoryLockKey = "mais-postgres-storage-contract-v1";
const canonicalRelationNames = Object.freeze([
  "app_state",
  "app_state_readiness_markers",
  "auth_schema_migrations",
  "ai_tutor_message_journal",
  "ai_tutor_usage_journal",
  "auth_users",
  "auth_student_profiles",
  "auth_user_settings",
  "auth_password_reset_tokens"
]);
const legacyRelationNames = Object.freeze(
  canonicalRelationNames.filter((name) => name !== "app_state_readiness_markers")
);
const compatibilityTriggerName = "app_state_ai_tutor_compatibility";
const compatibilityFunctionName = "sync_ai_tutor_compatibility_from_state";
const invalidationTriggerName = "app_state_readiness_invalidate";
const invalidationFunctionName = "invalidate_app_state_readiness_marker";
const canonicalCompatibilitySourceSha256 =
  "1306f5dabdda23815ef8f255f8c70f5aa72a8395fa0cdf985cd723245510bede";
const legacyV1CompatibilitySourceSha256 =
  "0e7449b917d004feb44700d9e003a72e1bf958c57bf9804739a3c9a0ad9830ea";
const compatibilityTriggerDefinition =
  "CREATE TRIGGER app_state_ai_tutor_compatibility BEFORE INSERT OR UPDATE OF payload ON public.app_state FOR EACH ROW WHEN ((new.id = 'primary'::text)) EXECUTE FUNCTION sync_ai_tutor_compatibility_from_state()";
const hotAuthSchemaVersion = 4;
const postgresBuiltinTypeOids = Object.freeze({
  bool: 16,
  int8: 20,
  int4: 23,
  float8: 701,
  text: 25,
  timestamptz: 1184,
  jsonb: 3802
});
const legacyStorageRequiredColumns = Object.freeze([
  { table: "app_state", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "tenant_id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "state_kind", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "schema_version", type: "int4", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "revision", type: "int8", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "payload", type: "jsonb", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "updated_at", type: "timestamptz", nullable: false, primaryKey: ["id"] },
  { table: "auth_schema_migrations", column: "version", type: "int4", nullable: false, primaryKey: ["version"] },
  { table: "auth_schema_migrations", column: "applied_at", type: "timestamptz", nullable: false, primaryKey: ["version"] },
  { table: "ai_tutor_message_journal", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_message_journal", column: "user_id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_message_journal", column: "created_at", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_message_journal", column: "record", type: "jsonb", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_usage_journal", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_usage_journal", column: "user_id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_usage_journal", column: "created_at", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_usage_journal", column: "accounted_tokens", type: "float8", nullable: false, primaryKey: ["id"] },
  { table: "ai_tutor_usage_journal", column: "record", type: "jsonb", nullable: false, primaryKey: ["id"] }
]);
const hotAuthRequiredColumns = Object.freeze([
  { table: "auth_users", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "username", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "normalized_username", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "email", type: "text", nullable: true, primaryKey: ["id"] },
  { table: "auth_users", column: "normalized_email", type: "text", nullable: true, primaryKey: ["id"] },
  { table: "auth_users", column: "password_hash", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "password_salt", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "school_id", type: "text", nullable: true, primaryKey: ["id"] },
  { table: "auth_users", column: "password_must_change", type: "bool", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "session_revision", type: "int4", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "disabled_at", type: "text", nullable: true, primaryKey: ["id"] },
  { table: "auth_users", column: "role", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_users", column: "created_at", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_student_profiles", column: "user_id", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "name", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "grade", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "curriculum_track", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "curriculum_region", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "textbook_publisher", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "parent_invite_code", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "avatar_id", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "avatar_image_data_url", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_student_profiles", column: "avatar_media_object_key", type: "text", nullable: true, primaryKey: ["user_id"] },
  { table: "auth_user_settings", column: "user_id", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_user_settings", column: "language", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_user_settings", column: "theme", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_user_settings", column: "selected_grade", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_user_settings", column: "updated_at", type: "text", nullable: false, primaryKey: ["user_id"] },
  { table: "auth_password_reset_tokens", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_password_reset_tokens", column: "user_id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_password_reset_tokens", column: "token_hash", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_password_reset_tokens", column: "expires_at", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "auth_password_reset_tokens", column: "used_at", type: "text", nullable: true, primaryKey: ["id"] },
  { table: "auth_password_reset_tokens", column: "created_at", type: "text", nullable: false, primaryKey: ["id"] }
]);

export const legacySnapshotRequiredArrayKeys = Object.freeze([
  "adaptive_recommendation_cache",
  "adaptive_skill_state",
  "ai_governance_events",
  "ai_tutor_messages",
  "ai_tutor_usage",
  "assessment_submissions",
  "assessments",
  "assignment_grading_runs",
  "assignment_submission_attempts",
  "assignment_teacher_reviews",
  "assignments",
  "attempts",
  "auth_identities",
  "class_enrollments",
  "class_roster_profiles",
  "classroom_work_samples",
  "forum_audit_events",
  "forum_notifications",
  "forum_reports",
  "forum_threads",
  "gamification_events",
  "guardian_invitations",
  "guardian_links",
  "learner_profiles",
  "learning_event_clears",
  "learning_events",
  "lesson_blocks",
  "lesson_progress",
  "lessons",
  "mistakes",
  "nova_lens_policy_events",
  "nova_lens_runs",
  "password_reset_tokens",
  "prep_team_shares",
  "prep_teams",
  "provisioning_batches",
  "provisioning_row_results",
  "questions",
  "reward_campaigns",
  "reward_catalog",
  "reward_point_ledger",
  "reward_redemptions",
  "school_memberships",
  "schools",
  "student_profiles",
  "submissions",
  "teacher_class_collaborators",
  "teacher_classes",
  "teacher_lesson_kits",
  "teacher_live_prompts",
  "teacher_live_responses",
  "teacher_live_sessions",
  "teacher_live_tool_states",
  "teacher_mastery_targets",
  "teacher_message_entries",
  "teacher_messages",
  "teacher_notice_delivery_attempts",
  "teacher_notice_recipients",
  "teacher_notices",
  "teacher_reminder_runs",
  "teacher_reports",
  "teacher_review_lessons",
  "teaching_resources",
  "term_archives",
  "topics",
  "user_settings",
  "users",
  "visualization_events",
  "visualization_sessions"
]);
export const legacySnapshotRequiredObjectKeys = Object.freeze(["nova_lens_policy"]);

export const teacherNoticeProductionSchemaPartialComponents = Object.freeze([
  "relation-set",
  "legacy-relation-contract",
  "legacy-catalog-contract",
  "legacy-compatibility-contract",
  "legacy-hot-auth-contract",
  "legacy-readiness-artifact",
  "legacy-snapshot-contract",
  "legacy-snapshot-required-collections",
  "legacy-snapshot-malformed-collections",
  "legacy-snapshot-missing-collections",
  "legacy-snapshot-record-contract",
  "legacy-snapshot-shape",
  "legacy-other-contract",
  "current-readiness-contract",
  "state-changed",
  "unknown"
]);

function safeSchemaCount(value, upperBound) {
  return Number.isInteger(value) && value >= 0 && value <= upperBound
    ? value
    : null;
}

export function classifyLegacySnapshotShapeForProductionDiagnostic(rows) {
  if (!Array.isArray(rows) || rows.length !== 1) return "legacy-snapshot-shape";
  const row = rows[0];
  const missingArrays = safeSchemaCount(
    row?.missing_required_array_count,
    legacySnapshotRequiredArrayKeys.length
  );
  const malformedArrays = safeSchemaCount(
    row?.malformed_required_array_count,
    legacySnapshotRequiredArrayKeys.length
  );
  const missingObjects = safeSchemaCount(
    row?.missing_required_object_count,
    legacySnapshotRequiredObjectKeys.length
  );
  const malformedObjects = safeSchemaCount(
    row?.malformed_required_object_count,
    legacySnapshotRequiredObjectKeys.length
  );
  if (
    row?.payload_type !== "object"
    || row?.revision_valid !== true
    || missingArrays === null
    || malformedArrays === null
    || missingObjects === null
    || malformedObjects === null
  ) return "legacy-snapshot-shape";
  if (malformedArrays > 0 || malformedObjects > 0) {
    return "legacy-snapshot-malformed-collections";
  }
  if (missingArrays > 0 || missingObjects > 0) {
    return "legacy-snapshot-missing-collections";
  }
  return "legacy-snapshot-record-contract";
}

function normalizedPostgresDefinition(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : null;
}

function hasExactNames(rows, expectedNames) {
  if (!Array.isArray(rows) || rows.length !== expectedNames.length) return false;
  const actualNames = new Set(rows.map((row) => row?.relation_name));
  return expectedNames.every((name) => actualNames.has(name));
}

function physicalRelationsAreExact(rows) {
  return rows.every((row) =>
    row?.relation_kind === "r"
    && row?.relation_persistence === "p"
    && row?.relation_row_security === false
    && row?.relation_force_row_security === false
  );
}

function primaryKeyAllowlistJson(requiredColumns) {
  const primaryKeys = new Map();
  for (const required of requiredColumns) {
    const existing = primaryKeys.get(required.table);
    if (existing && JSON.stringify(existing) !== JSON.stringify(required.primaryKey)) {
      throw new Error("Postgres production schema diagnostic contract was rejected.");
    }
    primaryKeys.set(required.table, required.primaryKey);
  }
  return JSON.stringify(
    [...primaryKeys].map(([table, columns]) => ({ table, columns }))
  );
}

async function catalogContractIsReviewed(sql, requiredColumns) {
  const primaryKeys = primaryKeyAllowlistJson(requiredColumns);
  const rows = await sql`
    /* teacher_notice_production_schema_partial_catalog_diagnostic */
    WITH required_columns(table_name, column_name, type_name, type_oid, is_nullable_int) AS (
      SELECT required.*
      FROM ROWS FROM (
        pg_catalog.unnest(${requiredColumns.map((entry) => entry.table)}::text[]),
        pg_catalog.unnest(${requiredColumns.map((entry) => entry.column)}::text[]),
        pg_catalog.unnest(${requiredColumns.map((entry) => entry.type)}::text[]),
        pg_catalog.unnest(${requiredColumns.map((entry) => postgresBuiltinTypeOids[entry.type])}::oid[]),
        pg_catalog.unnest(${requiredColumns.map((entry) => entry.nullable ? 1 : 0)}::int4[])
      ) AS required(table_name, column_name, type_name, type_oid, is_nullable_int)
    ), required_primary_keys(table_name, primary_key_columns) AS (
      SELECT
        primary_key_entry.entry->>'table' AS table_name,
        ARRAY(
          SELECT primary_key_column.column_name
          FROM pg_catalog.jsonb_array_elements_text(primary_key_entry.entry->'columns')
            WITH ORDINALITY AS primary_key_column(column_name, ordinality)
          ORDER BY primary_key_column.ordinality
        )::pg_catalog.text[] AS primary_key_columns
      FROM pg_catalog.jsonb_array_elements(
        ${primaryKeys}::pg_catalog.text::pg_catalog.jsonb
      ) WITH ORDINALITY AS primary_key_entry(entry, ordinality)
      ORDER BY primary_key_entry.ordinality
    )
    SELECT
      NOT EXISTS (
        SELECT 1
        FROM required_columns AS required
        LEFT JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.nspname = 'public'
        LEFT JOIN pg_catalog.pg_class AS relation
          ON relation.relnamespace = namespace.oid
         AND relation.relname::text = required.table_name
         AND relation.relkind = 'r'
         AND relation.relpersistence = 'p'
         AND relation.relrowsecurity IS FALSE
         AND relation.relforcerowsecurity IS FALSE
        LEFT JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = relation.oid
         AND attribute.attname::text = required.column_name
         AND attribute.attnum > 0
         AND NOT attribute.attisdropped
        LEFT JOIN pg_catalog.pg_type AS column_type
          ON column_type.oid = attribute.atttypid
        LEFT JOIN pg_catalog.pg_namespace AS type_namespace
          ON type_namespace.oid = column_type.typnamespace
        WHERE relation.oid IS NULL
           OR attribute.attname IS NULL
           OR column_type.typname::text IS DISTINCT FROM required.type_name
           OR attribute.atttypid IS DISTINCT FROM required.type_oid
           OR type_namespace.nspname IS DISTINCT FROM 'pg_catalog'
           OR column_type.typtype IS DISTINCT FROM 'b'
           OR attribute.attnotnull IS DISTINCT FROM (required.is_nullable_int = 0)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM required_primary_keys AS required
        LEFT JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.nspname = 'public'
        LEFT JOIN pg_catalog.pg_class AS relation
          ON relation.relnamespace = namespace.oid
         AND relation.relname::text = required.table_name
         AND relation.relkind = 'r'
         AND relation.relpersistence = 'p'
         AND relation.relrowsecurity IS FALSE
         AND relation.relforcerowsecurity IS FALSE
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT pg_catalog.count(*)::pg_catalog.int4
              FROM pg_catalog.pg_constraint AS counted_primary_constraint
              WHERE counted_primary_constraint.conrelid = relation.oid
                AND counted_primary_constraint.contype = 'p'
            ) AS primary_key_constraint_count,
            ARRAY(
              SELECT primary_key_attribute.attname::text
              FROM pg_catalog.unnest(primary_constraint.conkey) WITH ORDINALITY
                AS primary_key_column(attribute_number, ordinality)
              INNER JOIN pg_catalog.pg_attribute AS primary_key_attribute
                ON primary_key_attribute.attrelid = primary_constraint.conrelid
               AND primary_key_attribute.attnum = primary_key_column.attribute_number
               AND primary_key_attribute.attnum > 0
               AND NOT primary_key_attribute.attisdropped
              ORDER BY primary_key_column.ordinality
            ) AS primary_key_columns,
            primary_constraint.convalidated AS primary_key_validated,
            primary_constraint.condeferrable AS primary_key_deferrable,
            primary_constraint.condeferred AS primary_key_deferred,
            primary_index.indisprimary,
            primary_index.indisunique,
            primary_index.indimmediate,
            primary_index.indisvalid,
            primary_index.indisready,
            primary_index.indislive,
            primary_index.indpred IS NULL AS primary_index_nonpartial,
            primary_index.indexprs IS NULL AS primary_index_not_expression,
            primary_index_relation.relkind = 'i' AS primary_index_relation_kind_exact,
            primary_index_relation.relnamespace = relation.relnamespace
              AS primary_index_namespace_exact,
            primary_index_access_method.amname = 'btree' AS primary_index_access_method_exact,
            (
              SELECT pg_catalog.count(*) = 1
              FROM pg_catalog.pg_depend AS index_dependency
              WHERE index_dependency.classid = 'pg_catalog.pg_class'::pg_catalog.regclass
                AND index_dependency.objid = primary_constraint.conindid
                AND index_dependency.refclassid = 'pg_catalog.pg_constraint'::pg_catalog.regclass
                AND index_dependency.refobjid = primary_constraint.oid
                AND index_dependency.deptype = 'i'
            ) AS primary_index_dependency_exact
          FROM pg_catalog.pg_constraint AS primary_constraint
          LEFT JOIN pg_catalog.pg_index AS primary_index
            ON primary_index.indexrelid = primary_constraint.conindid
           AND primary_index.indrelid = relation.oid
          LEFT JOIN pg_catalog.pg_class AS primary_index_relation
            ON primary_index_relation.oid = primary_constraint.conindid
          LEFT JOIN pg_catalog.pg_am AS primary_index_access_method
            ON primary_index_access_method.oid = primary_index_relation.relam
          WHERE primary_constraint.conrelid = relation.oid
            AND primary_constraint.contype = 'p'
          GROUP BY
            primary_constraint.oid,
            primary_index.indexrelid,
            primary_index.indisprimary,
            primary_index.indisunique,
            primary_index.indimmediate,
            primary_index.indisvalid,
            primary_index.indisready,
            primary_index.indislive,
            primary_index.indpred,
            primary_index.indexprs,
            primary_index_relation.relkind,
            primary_index_relation.relnamespace,
            primary_index_access_method.amname
        ) AS primary_key ON TRUE
        WHERE relation.oid IS NULL
           OR primary_key.primary_key_constraint_count IS DISTINCT FROM 1
           OR primary_key.primary_key_columns IS DISTINCT FROM required.primary_key_columns
           OR primary_key.primary_key_validated IS DISTINCT FROM TRUE
           OR primary_key.primary_key_deferrable IS DISTINCT FROM FALSE
           OR primary_key.primary_key_deferred IS DISTINCT FROM FALSE
           OR primary_key.indisprimary IS DISTINCT FROM TRUE
           OR primary_key.indisunique IS DISTINCT FROM TRUE
           OR primary_key.indimmediate IS DISTINCT FROM TRUE
           OR primary_key.indisvalid IS DISTINCT FROM TRUE
           OR primary_key.indisready IS DISTINCT FROM TRUE
           OR primary_key.indislive IS DISTINCT FROM TRUE
           OR primary_key.primary_index_nonpartial IS DISTINCT FROM TRUE
           OR primary_key.primary_index_not_expression IS DISTINCT FROM TRUE
           OR primary_key.primary_index_relation_kind_exact IS DISTINCT FROM TRUE
           OR primary_key.primary_index_namespace_exact IS DISTINCT FROM TRUE
           OR primary_key.primary_index_access_method_exact IS DISTINCT FROM TRUE
           OR primary_key.primary_index_dependency_exact IS DISTINCT FROM TRUE
      ) AS schema_ready
  `;
  return rows.length === 1 && rows[0]?.schema_ready === true;
}

async function hotAuthContractIsReviewed(sql) {
  if (!await catalogContractIsReviewed(sql, hotAuthRequiredColumns)) return false;
  const rows = await sql`
    /* teacher_notice_production_schema_partial_hot_auth_marker_diagnostic */
    SELECT EXISTS (
      SELECT 1
      FROM public.auth_schema_migrations
      WHERE version = ${hotAuthSchemaVersion}
    ) AS schema_version_present
  `;
  return rows.length === 1 && rows[0]?.schema_version_present === true;
}

function compatibilityTriggerIsReviewed(row) {
  if (!row || row.trigger_name !== compatibilityTriggerName) return false;
  const sourceSha256 = createHash("sha256")
    .update(normalizedPostgresDefinition(row.function_source) ?? "")
    .digest("hex");
  const canonicalFunction = sourceSha256 === canonicalCompatibilitySourceSha256
    && Array.isArray(row.function_config)
    && row.function_config.length === 1
    && row.function_config[0] === "search_path=pg_catalog, public";
  const legacyV1Function = sourceSha256 === legacyV1CompatibilitySourceSha256
    && row.function_config === null;
  return Boolean(
    row.relation_kind === "r"
    && row.rewrite_rule_count === 0
    && row.trigger_enabled === "O"
    && row.trigger_type === 23
    && normalizedPostgresDefinition(row.trigger_definition)
      === compatibilityTriggerDefinition
    && row.trigger_argument_count === 0
    && row.trigger_arguments_empty === true
    && Array.isArray(row.trigger_update_columns)
    && row.trigger_update_columns.length === 1
    && row.trigger_update_columns[0] === "payload"
    && row.function_schema === "public"
    && row.function_name === compatibilityFunctionName
    && row.function_result_type === "trigger"
    && row.function_language === "plpgsql"
    && row.function_security_definer === false
    && row.function_volatility === "v"
    && row.function_owner_matches_relation === true
    && row.function_dependency_exact === true
    && row.relation_dependency_exact === true
    && (canonicalFunction || legacyV1Function)
  );
}

export async function diagnosePostgresStoragePartialSchemaForProductionGate(client) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Postgres production schema diagnostic client was rejected.");
  }
  return client.begin("isolation level repeatable read read only", async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(${storageContractAdvisoryLockKey}, 0)
    )`;
    const relations = await sql`
      /* teacher_notice_production_schema_partial_relation_diagnostic */
      SELECT
        relation.relname::text AS relation_name,
        relation.relkind::text AS relation_kind,
        relation.relpersistence::text AS relation_persistence,
        relation.relrowsecurity AS relation_row_security,
        relation.relforcerowsecurity AS relation_force_row_security
      FROM pg_catalog.pg_namespace AS namespace
      INNER JOIN pg_catalog.pg_class AS relation
        ON relation.relnamespace = namespace.oid
      WHERE namespace.nspname = 'public'
        AND relation.relname::text = ANY(${[...canonicalRelationNames]}::text[])
      ORDER BY relation.relname
    `;
    if (relations.length === 0) return "state-changed";
    if (hasExactNames(relations, legacyRelationNames)) {
      if (!physicalRelationsAreExact(relations)) return "legacy-relation-contract";
      if (!await catalogContractIsReviewed(sql, legacyStorageRequiredColumns)) {
        return "legacy-catalog-contract";
      }
      const triggers = await sql`
        /* teacher_notice_production_schema_partial_trigger_diagnostic */
        SELECT
          relation.relkind::text AS relation_kind,
          (
            SELECT pg_catalog.count(*)::pg_catalog.int4
            FROM pg_catalog.pg_rewrite AS rewrite_rule
            WHERE rewrite_rule.ev_class = relation.oid
          ) AS rewrite_rule_count,
          trigger.tgname::text AS trigger_name,
          trigger.tgenabled::text AS trigger_enabled,
          trigger.tgtype::pg_catalog.int4 AS trigger_type,
          pg_catalog.pg_get_triggerdef(trigger.oid, false) AS trigger_definition,
          trigger.tgnargs::pg_catalog.int4 AS trigger_argument_count,
          pg_catalog.octet_length(trigger.tgargs) = 0 AS trigger_arguments_empty,
          ARRAY(
            SELECT trigger_attribute.attname::text
            FROM pg_catalog.unnest(trigger.tgattr::pg_catalog.int2[])
              WITH ORDINALITY AS trigger_column(attribute_number, ordinality)
            INNER JOIN pg_catalog.pg_attribute AS trigger_attribute
              ON trigger_attribute.attrelid = relation.oid
             AND trigger_attribute.attnum = trigger_column.attribute_number
             AND trigger_attribute.attnum > 0
             AND NOT trigger_attribute.attisdropped
            ORDER BY trigger_column.ordinality
          ) AS trigger_update_columns,
          function_namespace.nspname::text AS function_schema,
          trigger_function.proname::text AS function_name,
          pg_catalog.format_type(trigger_function.prorettype, NULL) AS function_result_type,
          function_language.lanname::text AS function_language,
          trigger_function.prosecdef AS function_security_definer,
          trigger_function.provolatile::text AS function_volatility,
          trigger_function.proconfig AS function_config,
          trigger_function.prosrc AS function_source,
          trigger_function.proowner = relation.relowner AS function_owner_matches_relation,
          (
            SELECT pg_catalog.count(*) = 1
            FROM pg_catalog.pg_depend AS function_dependency
            WHERE function_dependency.classid = 'pg_catalog.pg_trigger'::pg_catalog.regclass
              AND function_dependency.objid = trigger.oid
              AND function_dependency.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass
              AND function_dependency.refobjid = trigger.tgfoid
              AND function_dependency.deptype = 'n'
          ) AS function_dependency_exact,
          (
            SELECT pg_catalog.count(*) = 1
            FROM pg_catalog.pg_depend AS relation_dependency
            WHERE relation_dependency.classid = 'pg_catalog.pg_trigger'::pg_catalog.regclass
              AND relation_dependency.objid = trigger.oid
              AND relation_dependency.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
              AND relation_dependency.refobjid = relation.oid
              AND relation_dependency.deptype = 'a'
          ) AS relation_dependency_exact
        FROM pg_catalog.pg_namespace AS namespace
        INNER JOIN pg_catalog.pg_class AS relation
          ON relation.relnamespace = namespace.oid
         AND relation.relname = 'app_state'
        LEFT JOIN pg_catalog.pg_trigger AS trigger
          ON trigger.tgrelid = relation.oid
         AND NOT trigger.tgisinternal
        LEFT JOIN pg_catalog.pg_proc AS trigger_function
          ON trigger_function.oid = trigger.tgfoid
        LEFT JOIN pg_catalog.pg_namespace AS function_namespace
          ON function_namespace.oid = trigger_function.pronamespace
        LEFT JOIN pg_catalog.pg_language AS function_language
          ON function_language.oid = trigger_function.prolang
        WHERE namespace.nspname = 'public'
      `;
      if (triggers.some((row) => row?.trigger_name === invalidationTriggerName)) {
        return "legacy-readiness-artifact";
      }
      if (triggers.length !== 1 || !compatibilityTriggerIsReviewed(triggers[0])) {
        return "legacy-compatibility-contract";
      }
      if (!await hotAuthContractIsReviewed(sql)) {
        return "legacy-hot-auth-contract";
      }
      const readinessArtifacts = await sql`
        /* teacher_notice_production_schema_partial_readiness_artifact_diagnostic */
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc AS routine
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = routine.pronamespace
          WHERE namespace.nspname = 'public'
            AND routine.proname::text = ${invalidationFunctionName}
        ) AS invalidation_function_present
      `;
      if (
        readinessArtifacts.length !== 1
        || readinessArtifacts[0]?.invalidation_function_present !== false
      ) return "legacy-readiness-artifact";
      try {
        const snapshotRows = await sql`
          /* teacher_notice_production_schema_partial_snapshot_shape_diagnostic */
          SELECT
            pg_catalog.jsonb_typeof(state.payload) AS payload_type,
            state.revision >= 1 AS revision_valid,
            (
              SELECT pg_catalog.count(*)::pg_catalog.int4
              FROM pg_catalog.unnest(${legacySnapshotRequiredArrayKeys}::text[])
                AS required_array(key)
              WHERE NOT (state.payload ? required_array.key)
            ) AS missing_required_array_count,
            (
              SELECT pg_catalog.count(*)::pg_catalog.int4
              FROM pg_catalog.unnest(${legacySnapshotRequiredArrayKeys}::text[])
                AS required_array(key)
              WHERE state.payload ? required_array.key
                AND pg_catalog.jsonb_typeof(state.payload -> required_array.key)
                  IS DISTINCT FROM 'array'
            ) AS malformed_required_array_count,
            (
              SELECT pg_catalog.count(*)::pg_catalog.int4
              FROM pg_catalog.unnest(${legacySnapshotRequiredObjectKeys}::text[])
                AS required_object(key)
              WHERE NOT (state.payload ? required_object.key)
            ) AS missing_required_object_count,
            (
              SELECT pg_catalog.count(*)::pg_catalog.int4
              FROM pg_catalog.unnest(${legacySnapshotRequiredObjectKeys}::text[])
                AS required_object(key)
              WHERE state.payload ? required_object.key
                AND pg_catalog.jsonb_typeof(state.payload -> required_object.key)
                  IS DISTINCT FROM 'object'
            ) AS malformed_required_object_count
          FROM public.app_state AS state
          WHERE state.id = 'primary'
            AND state.tenant_id = 'platform'
            AND state.state_kind = 'app-snapshot'
            AND state.schema_version = 1
            AND (SELECT pg_catalog.count(*) FROM public.app_state) = 1
        `;
        return classifyLegacySnapshotShapeForProductionDiagnostic(snapshotRows);
      } catch {
        return "legacy-snapshot-contract";
      }
    }
    if (hasExactNames(relations, canonicalRelationNames)) {
      return "current-readiness-contract";
    }
    return "relation-set";
  });
}
