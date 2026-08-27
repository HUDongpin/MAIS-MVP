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

export const teacherNoticeProductionSchemaPartialComponents = Object.freeze([
  "relation-set",
  "legacy-relation-contract",
  "legacy-compatibility-contract",
  "legacy-readiness-artifact",
  "legacy-other-contract",
  "current-readiness-contract",
  "state-changed",
  "unknown"
]);

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
      return "legacy-other-contract";
    }
    if (hasExactNames(relations, canonicalRelationNames)) {
      return "current-readiness-contract";
    }
    return "relation-set";
  });
}
