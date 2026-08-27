import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createPostgresSchemaReadinessGate } from "@/lib/server/userStore/postgresSchemaReadiness";

function sourceSection(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

type CapturedStatement = {
  transaction: number;
  text: string;
  values: unknown[];
};

type FakeTransaction = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

type FakeClient = FakeTransaction & {
  begin<T>(operation: (sql: FakeTransaction) => Promise<T>): Promise<T>;
};

type StorageCatalogState =
  | "ready"
  | "empty"
  | "legacy"
  | "missing-app-state-column"
  | "missing-marker-column"
  | "wrong-type"
  | "wrong-nullability"
  | "wrong-relation-kind"
  | "missing-primary-key"
  | "wrong-primary-key"
  | "unvalidated-primary-key";

type HotAuthCatalogState =
  | "ready"
  | "missing-column"
  | "wrong-primary-key"
  | "wrong-relation-kind"
  | "unlogged"
  | "row-security"
  | "forced-row-security";

type StorageCatalogColumnContract = {
  table:
    | "app_state"
    | "app_state_readiness_markers"
    | "auth_schema_migrations"
    | "ai_tutor_message_journal"
    | "ai_tutor_usage_journal";
  column: string;
  type: string;
  nullable: boolean;
  primaryKey: string[];
};

type StorageCatalogRow = {
  relation_name: string;
  column_name: string;
  relation_kind: string | null;
  relation_persistence: string | null;
  relation_row_security: boolean | null;
  relation_force_row_security: boolean | null;
  actual_column_name: string | null;
  actual_type_kind: string | null;
  actual_type_name: string | null;
  actual_type_namespace: string | null;
  actual_type_oid: number | null;
  actual_is_nullable: boolean | null;
  primary_key_columns: string[] | null;
  primary_key_constraint_count: number | null;
  primary_key_deferrable: boolean | null;
  primary_key_deferred: boolean | null;
  primary_key_index_dependency_exact: boolean | null;
  primary_key_index_exact: boolean | null;
  primary_key_validated: boolean | null;
};

type StorageInvalidationCatalogRow = {
  function_dependency_exact: boolean | null;
  function_config: string[] | null;
  function_language: string | null;
  function_name: string | null;
  function_owner_matches_relation: boolean | null;
  function_result_type: string | null;
  function_schema: string | null;
  function_security_definer: boolean | null;
  function_source: string | null;
  function_volatility: string | null;
  relation_kind: string | null;
  relation_dependency_exact: boolean | null;
  rewrite_rule_count: number | null;
  trigger_enabled: string | null;
  trigger_argument_count: number | null;
  trigger_arguments_empty: boolean | null;
  trigger_definition: string | null;
  trigger_name: string | null;
  trigger_type: number | null;
  trigger_update_columns: string[] | null;
};

const canonicalInvalidationTriggerDefinition =
  "CREATE TRIGGER app_state_readiness_invalidate AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version ON public.app_state FOR EACH ROW EXECUTE FUNCTION invalidate_app_state_readiness_marker()";
const canonicalCompatibilityTriggerDefinition =
  "CREATE TRIGGER app_state_ai_tutor_compatibility BEFORE INSERT OR UPDATE OF payload ON public.app_state FOR EACH ROW WHEN ((new.id = 'primary'::text)) EXECUTE FUNCTION sync_ai_tutor_compatibility_from_state()";

type StorageStateRow = {
  id: string;
  tenant_id: string;
  state_kind: string;
  schema_version: number;
  revision: number;
};

type StorageMarkerRow = {
  state_id: string;
  tenant_id: string;
  state_kind: string;
  schema_version: number;
  state_revision: number;
  contract_version: number | null;
};

type StorageMarkerFixture = {
  stateRows: StorageStateRow[];
  markerRows: StorageMarkerRow[];
  migrationVersions: number[];
};

const storageCatalogContract: StorageCatalogColumnContract[] = [
  { table: "app_state", column: "id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "tenant_id", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "state_kind", type: "text", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "schema_version", type: "int4", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "revision", type: "int8", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "payload", type: "jsonb", nullable: false, primaryKey: ["id"] },
  { table: "app_state", column: "updated_at", type: "timestamptz", nullable: false, primaryKey: ["id"] },
  { table: "app_state_readiness_markers", column: "state_id", type: "text", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "tenant_id", type: "text", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "state_kind", type: "text", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "schema_version", type: "int4", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "state_revision", type: "int8", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "contract_version", type: "int4", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
  { table: "app_state_readiness_markers", column: "attested_at", type: "timestamptz", nullable: false, primaryKey: ["state_id", "tenant_id", "state_kind", "schema_version"] },
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
];

const pgCatalogTypeOids: Record<string, number> = {
  bool: 16,
  int8: 20,
  int4: 23,
  float8: 701,
  text: 25,
  timestamptz: 1184,
  jsonb: 3802
};

function storageCatalogRowsForState(state: StorageCatalogState): StorageCatalogRow[] {
  const rows = storageCatalogContract.map((entry): StorageCatalogRow => ({
    relation_name: entry.table,
    column_name: entry.column,
    relation_kind: "r",
    relation_persistence: "p",
    relation_row_security: false,
    relation_force_row_security: false,
    actual_column_name: entry.column,
    actual_type_kind: "b",
    actual_type_name: entry.type,
    actual_type_namespace: "pg_catalog",
    actual_type_oid: pgCatalogTypeOids[entry.type] ?? null,
    actual_is_nullable: entry.nullable,
    primary_key_columns: [...entry.primaryKey],
    primary_key_constraint_count: 1,
    primary_key_deferrable: false,
    primary_key_deferred: false,
    primary_key_index_dependency_exact: true,
    primary_key_index_exact: true,
    primary_key_validated: true
  }));

  if (state === "empty") return [];
  if (state === "legacy") {
    return rows.filter((row) => row.relation_name === "app_state" && row.column_name !== "revision");
  }
  if (state === "missing-app-state-column") {
    return rows.filter((row) => !(row.relation_name === "app_state" && row.column_name === "revision"));
  }
  if (state === "missing-marker-column") {
    return rows.filter((row) => !(
      row.relation_name === "app_state_readiness_markers" && row.column_name === "contract_version"
    ));
  }

  const driftedRows = structuredClone(rows);
  if (state === "wrong-type") {
    const revision = driftedRows.find((row) =>
      row.relation_name === "app_state" && row.column_name === "revision"
    );
    if (revision) revision.actual_type_name = "int4";
  } else if (state === "wrong-nullability") {
    const updatedAt = driftedRows.find((row) =>
      row.relation_name === "app_state" && row.column_name === "updated_at"
    );
    if (updatedAt) updatedAt.actual_is_nullable = true;
  } else if (state === "wrong-relation-kind") {
    for (const row of driftedRows) {
      if (row.relation_name === "app_state_readiness_markers") row.relation_kind = "v";
    }
  } else if (state === "missing-primary-key") {
    for (const row of driftedRows) {
      if (row.relation_name === "auth_schema_migrations") {
        row.primary_key_columns = null;
        row.primary_key_validated = null;
      }
    }
  } else if (state === "wrong-primary-key") {
    for (const row of driftedRows) {
      if (row.relation_name === "app_state_readiness_markers") {
        row.primary_key_columns = ["state_id", "tenant_id", "schema_version", "state_kind"];
      }
    }
  } else if (state === "unvalidated-primary-key") {
    for (const row of driftedRows) {
      if (row.relation_name === "app_state") row.primary_key_validated = false;
    }
  }
  return driftedRows;
}

function readyStorageInvalidationCatalogRow(): StorageInvalidationCatalogRow {
  return {
    function_dependency_exact: true,
    function_config: ["search_path=pg_catalog, public"],
    function_language: "plpgsql",
    function_name: "invalidate_app_state_readiness_marker",
    function_owner_matches_relation: true,
    function_result_type: "trigger",
    function_schema: "public",
    function_security_definer: false,
    function_source: `
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          DELETE FROM public.app_state_readiness_markers
          WHERE state_id IN (OLD.id, NEW.id);
        ELSE
          DELETE FROM public.app_state_readiness_markers
          WHERE state_id = NEW.id;
        END IF;
        RETURN NEW;
      END
    `,
    function_volatility: "v",
    relation_kind: "r",
    relation_dependency_exact: true,
    rewrite_rule_count: 0,
    trigger_enabled: "O",
    trigger_argument_count: 0,
    trigger_arguments_empty: true,
    trigger_definition: canonicalInvalidationTriggerDefinition,
    trigger_name: "app_state_readiness_invalidate",
    trigger_type: 21,
    trigger_update_columns: ["id", "payload", "revision", "tenant_id", "state_kind", "schema_version"]
  };
}

function currentCompatibilityFunctionSource() {
  const source = readFileSync(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const match = source.match(
    /CREATE OR REPLACE FUNCTION public\.sync_ai_tutor_compatibility_from_state\(\)[\s\S]*?AS \$function\$\n([\s\S]*?)\n\s*\$function\$/u
  );
  assert.ok(match?.[1], "canonical AI Tutor compatibility function source must be discoverable");
  return match[1];
}

function legacyV1CompatibilityFunctionSource() {
  return readFileSync(
    path.join(
      process.cwd(),
      "scripts/fixtures/postgres-legacy-v1-compatibility-function.sql"
    ),
    "utf8"
  );
}

function readyStorageCompatibilityCatalogRow(): StorageInvalidationCatalogRow {
  return {
    function_config: ["search_path=pg_catalog, public"],
    function_dependency_exact: true,
    function_language: "plpgsql",
    function_name: "sync_ai_tutor_compatibility_from_state",
    function_owner_matches_relation: true,
    function_result_type: "trigger",
    function_schema: "public",
    function_security_definer: false,
    function_source: currentCompatibilityFunctionSource(),
    function_volatility: "v",
    relation_dependency_exact: true,
    relation_kind: "r",
    rewrite_rule_count: 0,
    trigger_enabled: "O",
    trigger_argument_count: 0,
    trigger_arguments_empty: true,
    trigger_definition: canonicalCompatibilityTriggerDefinition,
    trigger_name: "app_state_ai_tutor_compatibility",
    trigger_type: 23,
    trigger_update_columns: ["payload"]
  };
}

function legacyV1StorageCompatibilityCatalogRow(): StorageInvalidationCatalogRow {
  return {
    ...readyStorageCompatibilityCatalogRow(),
    function_config: null,
    function_source: legacyV1CompatibilityFunctionSource()
  };
}

test("reviewed legacy v1 compatibility fixture remains bound to its production fingerprint", () => {
  const normalized = legacyV1CompatibilityFunctionSource().replace(/\s+/gu, " ").trim();
  assert.equal(
    createHash("sha256").update(normalized).digest("hex"),
    "0e7449b917d004feb44700d9e003a72e1bf958c57bf9804739a3c9a0ad9830ea"
  );
  const legacyRow = legacyV1StorageCompatibilityCatalogRow();
  assert.equal(legacyRow.function_config, null);
  assert.notEqual(
    legacyRow.function_source,
    readyStorageCompatibilityCatalogRow().function_source
  );
});

function readyStorageTriggerCatalogRows(
  invalidation = readyStorageInvalidationCatalogRow()
) {
  return [invalidation, readyStorageCompatibilityCatalogRow()];
}

function createReadyStorageMarkerFixture(): StorageMarkerFixture {
  return {
    stateRows: [{
      id: "primary",
      tenant_id: "platform",
      state_kind: "app-snapshot",
      schema_version: 1,
      revision: 11
    }],
    markerRows: [{
      state_id: "primary",
      tenant_id: "platform",
      state_kind: "app-snapshot",
      schema_version: 1,
      state_revision: 11,
      contract_version: 1
    }],
    migrationVersions: [4]
  };
}

function storageMarkerFixtureWith(
  mutate: (fixture: StorageMarkerFixture) => void
): StorageMarkerFixture {
  const fixture = createReadyStorageMarkerFixture();
  mutate(fixture);
  return fixture;
}

function storageMarkerFixtureMatchesPredicate(
  fixture: StorageMarkerFixture,
  values: unknown[]
) {
  if (values.length !== 6) return false;
  const [requestedId, requestedTenant, requestedKind, requestedSchema, contractVersion, migrationVersion] = values;
  if (
    typeof requestedId !== "string"
    || typeof requestedTenant !== "string"
    || typeof requestedKind !== "string"
    || typeof requestedSchema !== "number"
    || typeof contractVersion !== "number"
    || typeof migrationVersion !== "number"
  ) {
    return false;
  }

  return fixture.stateRows.some((stateRow) =>
    stateRow.id === requestedId
    && stateRow.tenant_id === requestedTenant
    && stateRow.state_kind === requestedKind
    && stateRow.schema_version === requestedSchema
    && fixture.markerRows.some((markerRow) =>
      markerRow.state_id === stateRow.id
      && markerRow.tenant_id === stateRow.tenant_id
      && markerRow.state_kind === stateRow.state_kind
      && markerRow.schema_version === stateRow.schema_version
      && markerRow.state_revision === stateRow.revision
      && markerRow.contract_version === contractVersion
    )
    && fixture.migrationVersions.includes(migrationVersion)
  );
}

function createExecutor({
  catalogErrors = [],
  catalogRows,
  catalogState = "ready",
  finalSnapshot = null,
  hotAuthCatalogStates = ["ready"],
  invalidationCatalogRows = [
    readyStorageInvalidationCatalogRow(),
    readyStorageCompatibilityCatalogRow()
  ],
  markerFixture = createReadyStorageMarkerFixture()
}: {
  catalogErrors?: unknown[];
  catalogRows?: StorageCatalogRow[];
  catalogState?: StorageCatalogState;
  finalSnapshot?: unknown;
  hotAuthCatalogStates?: HotAuthCatalogState[];
  invalidationCatalogRows?: StorageInvalidationCatalogRow[];
  markerFixture?: StorageMarkerFixture;
} = {}) {
  const statements: CapturedStatement[] = [];
  let catalogProbeCount = 0;
  let hotAuthCatalogProbeCount = 0;
  let transactionCount = 0;

  const client = Object.assign(
    async (_strings: TemplateStringsArray, ..._values: unknown[]) => [] as Record<string, unknown>[],
    {
      async begin<T>(operation: (sql: FakeTransaction) => Promise<T>) {
        transactionCount += 1;
        const transaction = transactionCount;
        const sql: FakeTransaction = async (strings, ...values) => {
          const text = strings.join("$value");
          statements.push({ transaction, text, values });
          if (text.includes("postgres_storage_readiness_catalog_probe")) {
            catalogProbeCount += 1;
            const error = catalogErrors[catalogProbeCount - 1];
            if (error) throw error;
            return structuredClone(catalogRows ?? storageCatalogRowsForState(catalogState));
          }
          if (text.includes("postgres_storage_readiness_invalidation_probe")) {
            return structuredClone(invalidationCatalogRows);
          }
          if (text.includes("postgres_storage_readiness_marker_probe")) {
            return [{ ready: storageMarkerFixtureMatchesPredicate(markerFixture, values) }];
          }
          if (text.includes("postgres_storage_readiness_current_snapshot")) {
            return [{ payload: finalSnapshot }];
          }
          if (text.includes("postgres_storage_readiness_complete_snapshot_revision")) {
            return [{ revision: markerFixture.stateRows[0]?.revision ?? 11 }];
          }
          if (text.includes("postgres_storage_readiness_marker_attestation")) {
            return [{ state_revision: Number(values.at(-1)) }];
          }
          if (text.includes("postgres_hot_auth_readiness_catalog_probe")) {
            const state = hotAuthCatalogStates[
              Math.min(hotAuthCatalogProbeCount, hotAuthCatalogStates.length - 1)
            ];
            hotAuthCatalogProbeCount += 1;
            return [{ schema_ready: state === "ready" }];
          }
          if (text.includes("postgres_hot_auth_readiness_count_probe")) {
            return [{
              auth_users: 4,
              auth_student_profiles: 2,
              auth_user_settings: 2,
              auth_password_reset_tokens: 1
            }];
          }
          return [];
        };
        return operation(sql);
      }
    }
  ) as FakeClient;

  return {
    client,
    statements,
    hotAuthCatalogProbeCount: () => hotAuthCatalogProbeCount,
    transactionCount: () => transactionCount
  };
}

type ReadinessStateInput = {
  id: string;
  schemaVersion: number;
  stateKind: string;
  tenantId: string;
};

const state: ReadinessStateInput = {
  id: "primary",
  tenantId: "platform",
  stateKind: "app-snapshot",
  schemaVersion: 1
};

test("durable readiness observes only catalog, marker, and revision metadata", async () => {
  const readiness = await import("@/lib/server/userStore");
  const fake = createExecutor();

  assert.equal(await readiness.probePostgresDurableReadinessStrict(fake.client, state), true);
  assert.equal(fake.transactionCount(), 1);

  const transactionStatements = fake.statements.filter((statement) => statement.transaction === 1);
  const orderedMarkers = [
    "postgres_storage_readiness_catalog_probe",
    "postgres_storage_readiness_invalidation_probe",
    "postgres_storage_readiness_marker_probe",
    "postgres_hot_auth_readiness_catalog_probe"
  ];
  let previousIndex = -1;
  for (const marker of orderedMarkers) {
    const index = transactionStatements.findIndex((statement) => statement.text.includes(marker));
    assert.ok(index > previousIndex, `${marker} must run in-order in the same transaction`);
    previousIndex = index;
  }
  assert.equal(
    transactionStatements.some((statement) =>
      statement.text.includes("postgres_hot_auth_readiness_count_probe")
    ),
    false,
    "operational readiness must not scan tenant rows"
  );
});

test("durable readiness locks both journals and attests canonical hot-auth primary keys", async () => {
  const readiness = await import("@/lib/server/userStore");
  const fake = createExecutor();

  assert.ok(await readiness.probePostgresDurableReadinessStrict(fake.client, state));
  const lockStatement = fake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_relation_observation_lock")
  );
  assert.match(lockStatement?.text ?? "", /public\.ai_tutor_message_journal/u);
  assert.match(lockStatement?.text ?? "", /public\.ai_tutor_usage_journal/u);

  const hotAuthCatalog = fake.statements.find((statement) =>
    statement.text.includes("postgres_hot_auth_readiness_catalog_probe")
  );
  assert.match(hotAuthCatalog?.text ?? "", /pg_catalog\.pg_constraint/u);
  assert.match(hotAuthCatalog?.text ?? "", /primary_constraint\.contype = 'p'/u);
  assert.match(hotAuthCatalog?.text ?? "", /primary_constraint\.condeferrable/u);
  assert.match(hotAuthCatalog?.text ?? "", /primary_constraint\.condeferred/u);
  assert.match(hotAuthCatalog?.text ?? "", /primary_index\.indisprimary/u);
  assert.match(hotAuthCatalog?.text ?? "", /primary_index\.indimmediate/u);
  assert.match(hotAuthCatalog?.text ?? "", /pg_catalog\.pg_depend/u);

  assert.match(hotAuthCatalog?.text ?? "", /relation\.relkind = 'r'/u);
  assert.match(hotAuthCatalog?.text ?? "", /relation\.relpersistence = 'p'/u);
  assert.match(hotAuthCatalog?.text ?? "", /relation\.relrowsecurity IS FALSE/u);
  assert.match(hotAuthCatalog?.text ?? "", /relation\.relforcerowsecurity IS FALSE/u);

  for (const catalogState of [
    "wrong-primary-key",
    "wrong-relation-kind",
    "unlogged",
    "row-security",
    "forced-row-security"
  ] as const) {
    assert.equal(
      await readiness.probePostgresDurableReadinessStrict(
        createExecutor({ hotAuthCatalogStates: [catalogState] }).client,
        state
      ),
      null,
      catalogState
    );
  }
});

test("hot-auth primary-key allowlist preserves composite order through one JSONB parameter", async () => {
  const store = await import("@/lib/server/userStore");
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const catalogProbe = sourceSection(
    source,
    "async function postgresHotAuthReadinessCatalogIsComplete(",
    "async function countPostgresHotAuthReadinessRows("
  );
  assert.match(
    catalogProbe,
    /pg_catalog\.jsonb_array_elements\(\s*\$\{primaryKeyAllowlistJson\}::pg_catalog\.text::pg_catalog\.jsonb\s*\) WITH ORDINALITY/u
  );
  assert.match(
    catalogProbe,
    /pg_catalog\.jsonb_array_elements_text\(primary_key_entry\.entry->'columns'\) WITH ORDINALITY/u
  );
  assert.match(catalogProbe, /ORDER BY primary_key_column\.ordinality/u);
  assert.match(catalogProbe, /::pg_catalog\.text\[\] AS primary_key_columns/u);
  assert.doesNotMatch(catalogProbe, /::text\[\]\[\]/u);
  assert.match(catalogProbe, /FROM pg_catalog\.pg_constraint AS primary_constraint/u);
  assert.match(catalogProbe, /LEFT JOIN pg_catalog\.pg_index AS primary_index/u);

  const hooks = store.__userStorePostgresStorageReadinessTestHooks as
    typeof store.__userStorePostgresStorageReadinessTestHooks & {
      attestHotAuthPrimaryKeyAllowlist?: (
        sql: FakeTransaction,
        allowlist: Array<{ table: string; columns: string[] }>
      ) => Promise<boolean>;
    };
  assert.equal(typeof hooks.attestHotAuthPrimaryKeyAllowlist, "function");

  const actualCompositeColumns = ["tenant_id", "user_id"];
  const run = async (columns: string[]) => {
    const statements: CapturedStatement[] = [];
    const sql: FakeTransaction = async (strings, ...values) => {
      const text = strings.join("$value");
      statements.push({ transaction: 1, text, values });
      const jsonParameters = values.filter((value): value is string => {
        if (typeof value !== "string") return false;
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) && parsed.some((entry) => entry?.table === "fixture_composite");
        } catch {
          return false;
        }
      });
      assert.equal(jsonParameters.length, 1, "the complete PK allowlist must be one bound JSON document");
      assert.doesNotMatch(text, /fixture_composite|tenant_id|user_id/u,
        "allowlist identifiers must never be interpolated into SQL source");
      const parsed = JSON.parse(jsonParameters[0]) as Array<{ table: string; columns: string[] }>;
      return [{
        schema_ready:
          parsed.length === 1 &&
          parsed[0]?.table === "fixture_composite" &&
          JSON.stringify(parsed[0]?.columns) === JSON.stringify(actualCompositeColumns)
      }];
    };
    const result = await hooks.attestHotAuthPrimaryKeyAllowlist?.(sql, [{
      table: "fixture_composite",
      columns
    }]);
    return { result, statements };
  };

  const ordered = await run(["tenant_id", "user_id"]);
  assert.equal(ordered.result, true, "a two-column primary key must preserve its declared order");
  assert.equal(ordered.statements.length, 1);
  assert.equal((await run(["user_id", "tenant_id"])).result, false,
    "the same primary-key columns in the wrong order must fail closed");
});

test("every metadata readiness call uses one bounded scalar catalog and exact revision marker probe", async () => {
  const readiness = await import("@/lib/server/userStore");
  const fake = createExecutor();

  assert.equal(await readiness.probePostgresStorageReadiness(fake.client, state), true);
  assert.equal(await readiness.probePostgresStorageReadiness(fake.client, state), true);
  assert.equal(fake.transactionCount(), 2, "external readiness must not cache a stale success");

  for (let transaction = 1; transaction <= fake.transactionCount(); transaction += 1) {
    const transactionStatements = fake.statements.filter((statement) => statement.transaction === transaction);
    assert.match(
      transactionStatements[0]?.text ?? "",
      /SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY/u
    );
    assert.match(transactionStatements[1]?.text ?? "", /set_config\('lock_timeout', '1000ms', true\)/u);
    assert.match(transactionStatements[1]?.text ?? "", /set_config\('statement_timeout', '5000ms', true\)/u);
    assert.match(
      transactionStatements[1]?.text ?? "",
      /pg_catalog\.set_config\('search_path', 'pg_catalog, public', true\)/u
    );
    assert.match(transactionStatements[2]?.text ?? "", /postgres_storage_contract_shared_advisory_lock/u);
    assert.match(transactionStatements[2]?.text ?? "", /pg_advisory_xact_lock_shared/u);
    assert.match(transactionStatements[3]?.text ?? "", /postgres_storage_readiness_relation_observation_lock/u);
    assert.match(transactionStatements[3]?.text ?? "", /LOCK TABLE\s+public\.app_state/u);
    assert.match(transactionStatements[4]?.text ?? "", /postgres_storage_readiness_catalog_probe/u);
    assert.match(transactionStatements[5]?.text ?? "", /postgres_storage_readiness_invalidation_probe/u);
    assert.match(transactionStatements[6]?.text ?? "", /postgres_storage_readiness_marker_probe/u);
  }

  const executedSql = fake.statements.map((statement) => statement.text).join("\n");
  assert.doesNotMatch(executedSql, /\bpayload\b/iu);
  assert.match(executedSql, /marker\.state_revision = state\.revision/u);
  assert.match(executedSql, /marker\.tenant_id = state\.tenant_id/u);
  assert.match(executedSql, /marker\.state_kind = state\.state_kind/u);
  assert.match(executedSql, /marker\.schema_version = state\.schema_version/u);

  const catalogStatement = fake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_catalog_probe")
  );
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_namespace/u);
  assert.match(catalogStatement?.text ?? "", /namespace\.nspname = 'public'/u);
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_class/u);
  assert.match(catalogStatement?.text ?? "", /relation\.relkind::text AS relation_kind/u);
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_attribute/u);
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_type/u);
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_constraint/u);
  assert.match(catalogStatement?.text ?? "", /primary_constraint\.contype = 'p'/u);
  assert.match(catalogStatement?.text ?? "", /primary_constraint\.convalidated/u);
  assert.match(
    catalogStatement?.text ?? "",
    /unnest\(primary_constraint\.conkey\) WITH ORDINALITY/u
  );
  assert.match(catalogStatement?.text ?? "", /ORDER BY primary_key_column\.ordinality/u);

  const [tables, columns] = catalogStatement?.values ?? [];
  assert.equal(Array.isArray(tables), true);
  assert.equal(Array.isArray(columns), true);
  assert.deepEqual(
    (tables as string[]).map((table, index) => ({
      table,
      column: (columns as string[])[index]
    })),
    storageCatalogContract.map(({ table, column }) => ({ table, column }))
  );

  const invalidationStatement = fake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_invalidation_probe")
  );
  assert.match(invalidationStatement?.text ?? "", /pg_catalog\.pg_trigger/u);
  assert.match(invalidationStatement?.text ?? "", /pg_catalog\.pg_proc/u);
  assert.match(invalidationStatement?.text ?? "", /pg_catalog\.pg_language/u);
  assert.match(invalidationStatement?.text ?? "", /pg_catalog\.pg_attribute/u);
  assert.match(invalidationStatement?.text ?? "", /trigger\.tgtype::integer/u);
  assert.match(invalidationStatement?.text ?? "", /trigger\.tgenabled::text/u);
  assert.match(invalidationStatement?.text ?? "", /trigger_function\.prosecdef/u);
  assert.match(invalidationStatement?.text ?? "", /trigger_function\.provolatile::text/u);
  assert.match(invalidationStatement?.text ?? "", /trigger_function\.proconfig/u);
  assert.match(invalidationStatement?.text ?? "", /trigger_function\.prosrc/u);
  assert.doesNotMatch(invalidationStatement?.text ?? "", /\bpayload\s*(?:,|FROM|AS|\))/iu);

  const markerStatement = fake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_marker_probe")
  );
  assert.deepEqual(markerStatement?.values, ["primary", "platform", "app-snapshot", 1, 1, 4]);
  assert.match(markerStatement?.text ?? "", /SELECT EXISTS \(/u);
  assert.match(markerStatement?.text ?? "", /FROM public\.app_state AS state/u);
  assert.match(markerStatement?.text ?? "", /public\.app_state_readiness_markers AS marker/u);
  assert.match(markerStatement?.text ?? "", /FROM public\.auth_schema_migrations/u);
  assert.match(markerStatement?.text ?? "", /ON marker\.state_id = state\.id/u);
  assert.match(markerStatement?.text ?? "", /marker\.tenant_id = state\.tenant_id/u);
  assert.match(markerStatement?.text ?? "", /marker\.state_kind = state\.state_kind/u);
  assert.match(markerStatement?.text ?? "", /marker\.schema_version = state\.schema_version/u);
  assert.match(markerStatement?.text ?? "", /marker\.state_revision = state\.revision/u);
  assert.match(markerStatement?.text ?? "", /WHERE state\.id = \$value/u);
  assert.match(markerStatement?.text ?? "", /state\.tenant_id = \$value/u);
  assert.match(markerStatement?.text ?? "", /state\.state_kind = \$value/u);
  assert.match(markerStatement?.text ?? "", /state\.schema_version = \$value/u);
  assert.match(markerStatement?.text ?? "", /marker\.contract_version = \$value/u);
  assert.match(markerStatement?.text ?? "", /FROM public\.auth_schema_migrations\s+WHERE version = \$value/u);
});

test("catalog and invalidation probes reject same-name domains, trigger predicates, and arguments", async () => {
  const readiness = await import("@/lib/server/userStore");

  const domainRows = storageCatalogRowsForState("ready");
  const domainColumn = domainRows.find((row) => (
    row.relation_name === "app_state" && row.column_name === "id"
  ));
  assert.ok(domainColumn);
  domainColumn.actual_type_kind = "d";
  domainColumn.actual_type_namespace = "public";
  domainColumn.actual_type_oid = 90_001;
  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(
      createExecutor({ catalogRows: domainRows }).client,
      state
    ),
    false,
    "a public domain named text must not attest as pg_catalog.text"
  );

  for (const [name, mutate] of [
    ["WHEN(false)", (row: StorageInvalidationCatalogRow) => {
      row.trigger_definition = canonicalInvalidationTriggerDefinition.replace(
        "FOR EACH ROW",
        "FOR EACH ROW WHEN (false)"
      );
    }],
    ["trigger arguments", (row: StorageInvalidationCatalogRow) => {
      row.trigger_argument_count = 1;
      row.trigger_arguments_empty = false;
    }]
  ] as const) {
    const row = readyStorageInvalidationCatalogRow();
    mutate(row);
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(
        createExecutor({ invalidationCatalogRows: readyStorageTriggerCatalogRows(row) }).client,
        state
      ),
      false,
      name
    );
  }
});

test("trigger attestation uses exact PostgreSQL 16 definitions for OLD and NEW predicates", async () => {
  const readiness = await import("@/lib/server/userStore");
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const invalidationProbe = sourceSection(
    source,
    "async function postgresStorageTriggerContractsAreComplete(",
    "async function postgresStorageReadinessInvalidationIsComplete("
  );
  assert.match(
    invalidationProbe,
    /pg_catalog\.pg_get_triggerdef\(trigger\.oid, false\) AS trigger_definition/u
  );
  assert.doesNotMatch(
    invalidationProbe,
    /pg_catalog\.pg_get_expr\(trigger\.tgqual, trigger\.tgrelid\)/u,
    "OLD/NEW trigger predicates cannot be deparsed as a single-relation expression"
  );
  assert.match(invalidationProbe, /JOIN pg_catalog\.pg_trigger AS trigger/u);
  assert.match(invalidationProbe, /function_namespace\.nspname::text AS function_schema/u);

  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(createExecutor().client, state),
    true,
    "the exact two-trigger PostgreSQL 16 allowlist must attest"
  );
  for (const [name, definition] of [
    ["OLD.id predicate", canonicalCompatibilityTriggerDefinition.replace("new.id", "old.id")],
    ["NEW.id inequality", canonicalCompatibilityTriggerDefinition.replace("new.id =", "new.id <>")],
    [
      "missing WHEN",
      "CREATE TRIGGER app_state_ai_tutor_compatibility BEFORE INSERT OR UPDATE OF payload ON public.app_state FOR EACH ROW EXECUTE FUNCTION sync_ai_tutor_compatibility_from_state()"
    ]
  ] as const) {
    const compatibility = readyStorageCompatibilityCatalogRow();
    compatibility.trigger_definition = definition;
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(
        createExecutor({
          invalidationCatalogRows: [readyStorageInvalidationCatalogRow(), compatibility]
        }).client,
        state
      ),
      false,
      name
    );
  }

  const invalidation = readyStorageInvalidationCatalogRow();
  invalidation.trigger_definition = canonicalInvalidationTriggerDefinition.replace(
    "AFTER INSERT OR UPDATE",
    "BEFORE INSERT OR UPDATE"
  );
  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(
      createExecutor({
        invalidationCatalogRows: [invalidation, readyStorageCompatibilityCatalogRow()]
      }).client,
      state
    ),
    false,
    "the invalidation trigger definition must also match exactly"
  );
});

test("app_state trigger and rule attestation is closed-world for both canonical triggers", async () => {
  const readiness = await import("@/lib/server/userStore");

  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(createExecutor().client, state),
    true
  );
  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(
      createExecutor({ invalidationCatalogRows: [readyStorageInvalidationCatalogRow()] }).client,
      state
    ),
    false,
    "the compatibility trigger is part of the closed-world allowlist"
  );

  const extraTrigger = readyStorageInvalidationCatalogRow();
  extraTrigger.trigger_name = "unexpected_user_trigger";
  assert.equal(
    await readiness.probePostgresStorageReadinessStrict(
      createExecutor({
        invalidationCatalogRows: [...readyStorageTriggerCatalogRows(), extraTrigger]
      }).client,
      state
    ),
    false,
    "any third non-internal trigger must fail closed"
  );

  for (const [name, mutate] of [
    ["user rewrite rule", (row: StorageInvalidationCatalogRow) => { row.rewrite_rule_count = 1; }],
    ["compatibility WHEN", (row: StorageInvalidationCatalogRow) => {
      row.trigger_definition = canonicalCompatibilityTriggerDefinition.replace(
        "WHEN ((new.id = 'primary'::text))",
        "WHEN (false)"
      );
    }],
    ["compatibility body", (row: StorageInvalidationCatalogRow) => { row.function_source = "BEGIN RETURN NEW; END"; }],
    ["function dependency", (row: StorageInvalidationCatalogRow) => { row.function_dependency_exact = false; }],
    ["relation dependency", (row: StorageInvalidationCatalogRow) => { row.relation_dependency_exact = false; }]
  ] as const) {
    const compatibility = readyStorageCompatibilityCatalogRow();
    mutate(compatibility);
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(
        createExecutor({
          invalidationCatalogRows: [readyStorageInvalidationCatalogRow(), compatibility]
        }).client,
        state
      ),
      false,
      name
    );
  }
});

test("partial capability locks exact state before fresh catalog and locked marker evidence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const relationSection = sourceSection(
    source,
    "async function lockPostgresStorageMutationRelations(",
    "async function acquirePostgresStorageMutationCapabilityAfterLocks("
  );
  const attestationSection = sourceSection(
    source,
    "async function acquirePostgresStorageMutationCapabilityAfterLocks(",
    "export async function acquirePostgresStorageMutationCapability("
  );
  const wrapperSection = sourceSection(
    source,
    "export async function acquirePostgresStorageMutationCapability(",
    "export async function advancePostgresStorageReadinessAfterMutation("
  );
  const advisoryLock = wrapperSection.indexOf("acquirePostgresStorageContractSharedAdvisoryLock(sql)");
  const relationLockCall = wrapperSection.indexOf("lockPostgresStorageMutationRelations(sql)");
  const attestationCall = wrapperSection.indexOf("acquirePostgresStorageMutationCapabilityAfterLocks(sql, state)");
  const relationLock = relationSection.indexOf("postgres_storage_readiness_relation_lock");
  const stateLock = attestationSection.indexOf("postgres_storage_readiness_state_lock");
  const catalog = attestationSection.indexOf("postgresStorageReadinessCatalogIsComplete(sql)");
  const invalidation = attestationSection.indexOf("postgresStorageReadinessInvalidationIsComplete(sql)");
  const evidence = attestationSection.indexOf("postgres_storage_readiness_mutation_capability");

  assert.notEqual(advisoryLock, -1, "capability must enter the cooperative schema protocol first");
  assert.notEqual(relationLockCall, -1, "capability must invoke the shared relation-lock phase");
  assert.notEqual(attestationCall, -1, "capability must invoke the row/catalog attestation phase last");
  assert.notEqual(relationLock, -1, "capability must hold DDL-conflicting relation locks");
  assert.notEqual(stateLock, -1, "capability must lock the exact state tuple/revision");
  assert.notEqual(catalog, -1);
  assert.notEqual(invalidation, -1);
  assert.notEqual(evidence, -1);
  assert.equal(advisoryLock < relationLockCall, true);
  assert.equal(relationLockCall < attestationCall, true);
  assert.equal(stateLock < catalog, true);
  assert.equal(catalog < invalidation, true);
  assert.equal(invalidation < evidence, true);
  assert.match(attestationSection, /FOR KEY SHARE OF marker, migration/u);
  assert.match(relationSection, /public\.ai_tutor_message_journal/u);
  assert.match(relationSection, /public\.ai_tutor_usage_journal/u);
  assert.match(relationSection, /public\.auth_password_reset_tokens/u);
  assert.match(
    relationSection,
    /IN SHARE ROW EXCLUSIVE MODE(?! NOWAIT)/u,
    "writers must serialize before the row lock with a table mode compatible with their own later DML"
  );
  assert.doesNotMatch(
    relationSection,
    /IN SHARE MODE/u,
    "a shared table lock lets a queued row-lock waiter deadlock the leader during lock upgrade"
  );
  assert.doesNotMatch(`${relationSection}\n${attestationSection}\n${wrapperSection}`, /SELECT\s+(?:state\.)?payload\b/iu);
});

test("readiness rejects trigger or invalidation-function drift before the marker probe", async () => {
  const readiness = await import("@/lib/server/userStore");
  const drifts: Array<[string, (row: StorageInvalidationCatalogRow) => void]> = [
    ["missing trigger", (row) => { row.trigger_name = null; }],
    ["disabled trigger", (row) => { row.trigger_enabled = "D"; }],
    ["wrong trigger timing/events", (row) => { row.trigger_type = 17; }],
    ["missing payload update column", (row) => {
      row.trigger_update_columns = row.trigger_update_columns?.filter((column) => column !== "payload") ?? null;
    }],
    ["wrong relation kind", (row) => { row.relation_kind = "v"; }],
    ["wrong function", (row) => { row.function_name = "other_function"; }],
    ["wrong function owner", (row) => { row.function_owner_matches_relation = false; }],
    ["security definer", (row) => { row.function_security_definer = true; }],
    ["wrong language", (row) => { row.function_language = "sql"; }],
    ["wrong result type", (row) => { row.function_result_type = "boolean"; }],
    ["wrong volatility", (row) => { row.function_volatility = "s"; }],
    ["unsafe search path", (row) => { row.function_config = null; }],
    ["wrong function body", (row) => {
      row.function_source = "BEGIN RETURN NEW; END";
    }]
  ];

  for (const [name, mutate] of drifts) {
    const row = readyStorageInvalidationCatalogRow();
    mutate(row);
    const fake = createExecutor({ invalidationCatalogRows: readyStorageTriggerCatalogRows(row) });
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(fake.client, state),
      false,
      name
    );
    assert.equal(
      fake.statements.some((statement) =>
        statement.text.includes("postgres_storage_readiness_marker_probe")
      ),
      false,
      `${name} must fail closed before trusting an old marker`
    );
  }

  const missingFake = createExecutor({ invalidationCatalogRows: [] });
  assert.equal(await readiness.probePostgresStorageReadinessStrict(missingFake.client, state), false);
});

test("marker readiness is derived from the exact requested state instead of a configured result", async () => {
  const readiness = await import("@/lib/server/userStore");
  for (const probeState of [
    { ...state, id: "different-state" },
    { ...state, tenantId: "different-tenant" },
    { ...state, stateKind: "different-kind" },
    { ...state, schemaVersion: 2 }
  ]) {
    const fake = createExecutor();
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(fake.client, probeState),
      false
    );
  }
});

test("strict storage readiness distinguishes absent or drifted state from executor failures", async () => {
  const readiness = await import("@/lib/server/userStore");
  for (const catalogState of [
    "empty",
    "legacy",
    "missing-app-state-column",
    "missing-marker-column",
    "wrong-type",
    "wrong-nullability",
    "wrong-relation-kind",
    "missing-primary-key",
    "wrong-primary-key",
    "unvalidated-primary-key"
  ] as const) {
    const fake = createExecutor({ catalogState });
    assert.equal(await readiness.probePostgresStorageReadinessStrict(fake.client, state), false);
    const executedSql = fake.statements.map((statement) => statement.text).join("\n");
    assert.doesNotMatch(executedSql, /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/iu);
    assert.doesNotMatch(executedSql, /pg_advisory_xact_lock\s*\(/iu);
    assert.equal(
      fake.statements.some((statement) =>
        statement.text.includes("postgres_storage_readiness_marker_probe")
      ),
      false,
      `${catalogState} must fail closed before the marker probe`
    );
  }

  const markerDrifts: Array<{ name: string; fixture: StorageMarkerFixture }> = [
    {
      name: "missing app-state row",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.stateRows = []; })
    },
    {
      name: "missing marker row",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows = []; })
    },
    {
      name: "stale marker revision",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].state_revision = 10; })
    },
    {
      name: "wrong marker state id",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].state_id = "other"; })
    },
    {
      name: "wrong marker tenant",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].tenant_id = "other"; })
    },
    {
      name: "wrong marker kind",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].state_kind = "other"; })
    },
    {
      name: "wrong marker schema",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].schema_version = 2; })
    },
    {
      name: "missing marker contract version",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].contract_version = null; })
    },
    {
      name: "wrong marker contract version",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].contract_version = 2; })
    },
    {
      name: "missing exact auth migration version",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.migrationVersions = []; })
    },
    {
      name: "wrong auth migration version",
      fixture: storageMarkerFixtureWith((fixture) => { fixture.migrationVersions = [5]; })
    }
  ];
  for (const markerDrift of markerDrifts) {
    const fake = createExecutor({ markerFixture: markerDrift.fixture });
    assert.equal(await readiness.probePostgresStorageReadinessStrict(fake.client, state), false);
    assert.match(
      fake.statements.at(-1)?.text ?? "",
      /postgres_storage_readiness_marker_probe/u,
      markerDrift.name
    );
  }
});

test("storage catalog rejects type and nullability drift for every required column", async () => {
  const readiness = await import("@/lib/server/userStore");

  for (let index = 0; index < storageCatalogContract.length; index += 1) {
    const wrongTypeRows = storageCatalogRowsForState("ready");
    wrongTypeRows[index].actual_type_name = wrongTypeRows[index].actual_type_name === "text"
      ? "int4"
      : "text";
    const wrongTypeFake = createExecutor({ catalogRows: wrongTypeRows });
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(wrongTypeFake.client, state),
      false,
      `${storageCatalogContract[index].table}.${storageCatalogContract[index].column} type drift`
    );

    const wrongNullabilityRows = storageCatalogRowsForState("ready");
    wrongNullabilityRows[index].actual_is_nullable = !wrongNullabilityRows[index].actual_is_nullable;
    const wrongNullabilityFake = createExecutor({ catalogRows: wrongNullabilityRows });
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(wrongNullabilityFake.client, state),
      false,
      `${storageCatalogContract[index].table}.${storageCatalogContract[index].column} nullability drift`
    );
  }
});

test("storage catalog rejects non-canonical physical relation state for every storage table", async () => {
  const readiness = await import("@/lib/server/userStore");
  const relationNames = [...new Set(storageCatalogContract.map((entry) => entry.table))];
  const drifts: Array<[string, (row: StorageCatalogRow) => void]> = [
    ["partitioned", (row) => { row.relation_kind = "p"; }],
    ["unlogged", (row) => { row.relation_persistence = "u"; }],
    ["temporary", (row) => { row.relation_persistence = "t"; }],
    ["row security", (row) => { row.relation_row_security = true; }],
    ["forced row security", (row) => { row.relation_force_row_security = true; }]
  ];

  for (const relationName of relationNames) {
    for (const [name, mutate] of drifts) {
      const rows = storageCatalogRowsForState("ready");
      for (const row of rows) {
        if (row.relation_name === relationName) mutate(row);
      }
      assert.equal(
        await readiness.probePostgresStorageReadinessStrict(
          createExecutor({ catalogRows: rows }).client,
          state
        ),
        false,
        `${relationName}: ${name}`
      );
    }
  }
});

test("the real PostgreSQL fixture mutates persistence and both row-security flags", async () => {
  const integrationSource = await readFile(
    path.join(process.cwd(), "lib/server/userStoreNovaPostgresIntegration.test.ts"),
    "utf8"
  );

  assert.match(
    integrationSource,
    /\/\* physical_attestation_set_unlogged_drift \*\/[\s\S]*ALTER TABLE public\.app_state SET UNLOGGED/u
  );
  assert.match(
    integrationSource,
    /\/\* physical_attestation_enable_rls_drift \*\/[\s\S]*ALTER TABLE public\.auth_users ENABLE ROW LEVEL SECURITY/u
  );
  assert.match(
    integrationSource,
    /\/\* physical_attestation_force_rls_drift \*\/[\s\S]*ALTER TABLE public\.auth_users FORCE ROW LEVEL SECURITY/u
  );
  assert.match(integrationSource, /ALTER TABLE public\.app_state SET LOGGED/u);
  assert.match(integrationSource, /ALTER TABLE public\.auth_users DISABLE ROW LEVEL SECURITY/u);
  assert.match(integrationSource, /ALTER TABLE public\.auth_users NO FORCE ROW LEVEL SECURITY/u);
  assert.equal(
    (integrationSource.match(/await assertBootstrapRejectedDuringPhysicalDrift\(/gu) ?? []).length,
    3,
    "each physical drift must also prove the initializer cannot re-attest the unchanged relation"
  );
});

test("the real PostgreSQL fixture forces four writers through the capability table-lock queue", async () => {
  const integrationSource = await readFile(
    path.join(process.cwd(), "lib/server/userStoreNovaPostgresIntegration.test.ts"),
    "utf8"
  );
  const fixture = sourceSection(
    integrationSource,
    "/* four_writer_serialization_barrier */",
    "/* four_writer_serialization_barrier_end */"
  );

  assert.match(fixture, /capabilityBarrier: true/u);
  assert.match(fixture, /mutationLockTimeoutMs: fourWriterMutationLockTimeoutMs/u);
  assert.match(fixture, /mutationStatementTimeoutMs: fourWriterMutationStatementTimeoutMs/u);
  assert.match(fixture, /await waitForAppStateCapabilityTableLock\(sql\)/u);
  assert.match(fixture, /await waitForAppStateCapabilityTableLockQueue\(sql, 3\)/u);
  assert.match(fixture, /await releaseFourWriterCapabilityBarrier\(/u);
  assert.match(fixture, /Promise\.all\(\[/u);
  assert.equal((fixture.match(/runSuccessfulWorker\("write-/gu) ?? []).length, 3);
  assert.doesNotMatch(fixture, /capabilityStateLockHoldMs/u);
  assert.match(integrationSource, /lock\.mode = 'ShareRowExclusiveLock'/u);
  assert.match(
    integrationSource,
    /four independent writers must serialize without a table-lock upgrade deadlock/u
  );
});

test("mutation contention budgets are test-only, bounded, and internally ordered", async () => {
  const store = await import("@/lib/server/userStore");
  const resolveTimeouts = store.__userStorePostgresStorageReadinessTestHooks
    .resolveMutationTransactionTimeouts;

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
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "30000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "45000"
  }), {
    lockTimeoutMs: 30_000,
    statementTimeoutMs: 45_000
  });
  assert.deepEqual(resolveTimeouts({
    NODE_ENV: "test",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "5000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "10000"
  }), {
    lockTimeoutMs: 5_000,
    statementTimeoutMs: 10_000
  });
  for (const environment of [
    {
      NODE_ENV: "test",
      MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "10000"
    },
    {
      NODE_ENV: "test",
      MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "5000"
    },
    {
      NODE_ENV: "test",
      MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "invalid",
      MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "10000"
    },
    {
      NODE_ENV: "test",
      MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "5000",
      MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "60001"
    }
  ]) {
    assert.deepEqual(resolveTimeouts(environment), {
      lockTimeoutMs: 1_000,
      statementTimeoutMs: 5_000
    }, "test timeout overrides must be present, valid, and bounded as one pair");
  }
  assert.deepEqual(resolveTimeouts({
    NODE_ENV: "test",
    MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "10000",
    MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "5000"
  }), {
    lockTimeoutMs: 1_000,
    statementTimeoutMs: 5_000
  });

  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const journalWriters = sourceSection(
    source,
    "async function recordAITutorMessageFromPostgresJournal(",
    "async function closeAiTutorPostgresClientsForIntegrationTest("
  );
  assert.equal(
    (journalWriters.match(/postgresMutationTransactionTimeouts\(\)/gu) ?? []).length,
    2,
    "both journal writers must consume the bounded test-only timeout contract"
  );
  assert.equal(
    (journalWriters.match(/transactionTimeouts\.lockTimeoutMs/gu) ?? []).length,
    2
  );
  assert.equal(
    (journalWriters.match(/transactionTimeouts\.statementTimeoutMs/gu) ?? []).length,
    2
  );
  const capability = sourceSection(
    source,
    "async function acquirePostgresStorageMutationCapabilityAfterLocks(",
    "export async function advancePostgresStorageReadinessAfterMutation("
  );
  const integrationRewrite = sourceSection(
    source,
    "async function rewriteCurrentPostgresStorageSnapshotForIntegrationTest()",
    "async function readDatabase()"
  );
  assert.match(capability, /process\.env\.NODE_ENV === "test"/u);
  assert.match(capability, /MAIS_TEST_POSTGRES_CAPABILITY_BARRIER === "true"/u);
  assert.match(capability, /postgres_storage_capability_integration_barrier/u);
  assert.match(integrationRewrite, /const transactionTimeouts = postgresMutationTransactionTimeouts\(\)/u);
  assert.match(integrationRewrite, /transactionTimeouts\.lockTimeoutMs/u);
  assert.match(integrationRewrite, /transactionTimeouts\.statementTimeoutMs/u);
});

test("storage catalog rejects deferrable or detached primary-key backing indexes", async () => {
  const readiness = await import("@/lib/server/userStore");
  for (const [name, mutate] of [
    ["duplicate primary constraint", (row: StorageCatalogRow) => {
      row.primary_key_constraint_count = 2;
    }],
    ["deferrable primary key", (row: StorageCatalogRow) => { row.primary_key_deferrable = true; }],
    ["initially deferred primary key", (row: StorageCatalogRow) => { row.primary_key_deferred = true; }],
    ["wrong backing index", (row: StorageCatalogRow) => { row.primary_key_index_exact = false; }],
    ["missing internal dependency", (row: StorageCatalogRow) => {
      row.primary_key_index_dependency_exact = false;
    }]
  ] as const) {
    const rows = storageCatalogRowsForState("ready");
    mutate(rows[0]);
    assert.equal(
      await readiness.probePostgresStorageReadinessStrict(
        createExecutor({ catalogRows: rows }).client,
        state
      ),
      false,
      name
    );
  }
});

test("the generic full snapshot path preserves lock order, actual-row defenses, and bounded fault evidence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const start = source.indexOf("async function writePostgresDatabaseWith(");
  const end = source.indexOf("async function readDatabase()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = source.slice(start, end);
  assert.match(section, /storageCapability: PostgresStorageMutationCapability/u);
  assert.doesNotMatch(section, /acquirePostgresStorageMutationCapability\(/u);
  assert.doesNotMatch(section, /\bINSERT\s+INTO\s+(?:public\.)?app_state\b|ON\s+CONFLICT/iu);
  assert.match(section, /UPDATE public\.app_state AS state/u);
  assert.match(section, /state\.tenant_id = \$\{stateTenantId\}/u);
  assert.match(section, /state\.state_kind = \$\{stateKind\}/u);
  assert.match(section, /state\.schema_version = \$\{schemaVersion\}/u);
  assert.match(section, /state\.revision = \$\{storageCapability\.previousRevision\}/u);
  assert.match(section, /RETURNING[\s\S]*state\.id/u);
  assert.match(section, /state_identity_matches/u);
  assert.match(section, /revision_matches/u);
  assert.match(section, /stateRows\.length !== 1/u);
  assert.match(section, /writtenState\.state_identity_matches !== true/u);
  assert.match(section, /writtenState\.revision_matches !== true/u);
  assert.match(section, /validateCompletePostgresStorageSnapshot\(writtenState\.payload\)/u);
  assert.match(section, /postgres_storage_full_writer_final_state/u);
  assert.match(section, /finalStateRows\.length !== 1/u);
  assert.match(section, /advancePostgresStorageReadinessAfterMutation\(/u);

  {
  const lockOrderSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const lockedReadSource = sourceSection(
    lockOrderSource,
    "async function readPostgresDatabaseForMutation(",
    "async function readPostgresDatabaseFrom("
  );
  const writerSource = sourceSection(
    lockOrderSource,
    "async function writePostgresDatabaseWith(",
    "async function rewriteCurrentPostgresStorageSnapshotForIntegrationTest("
  );
  const rewriteSource = sourceSection(
    lockOrderSource,
    "async function rewriteCurrentPostgresStorageSnapshotForIntegrationTest(",
    "async function readDatabase()"
  );
  const mutateSource = sourceSection(
    lockOrderSource,
    "async function mutateDatabase<",
    "type PostgresAiTutorRateLimitEventRow"
  );

  const acquireIndex = lockedReadSource.indexOf("acquirePostgresStorageMutationCapability(");
  const rowLockIndex = lockedReadSource.indexOf("normalizeLockedPostgresState(");
  assert.ok(acquireIndex >= 0 && rowLockIndex > acquireIndex);
  assert.match(lockedReadSource, /return \{ database, storageCapability \}/u);

  assert.doesNotMatch(writerSource, /acquirePostgresStorageMutationCapability\(/u);
  assert.match(writerSource, /storageCapability: PostgresStorageMutationCapability/u);

  for (const [name, section] of [["rewrite", rewriteSource], ["mutate", mutateSource]] as const) {
    const readIndex = section.indexOf("readPostgresDatabaseForMutation(");
    const writeIndex = section.indexOf("writePostgresDatabaseWith(");
    assert.ok(readIndex >= 0 && writeIndex > readIndex, `${name}: generic mutation order`);
    assert.match(
      section,
      /const \{ database, storageCapability \} = await readPostgresDatabaseForMutation\([\s\S]*?writePostgresDatabaseWith\(sql, database, storageCapability\)/u,
      `${name}: one pre-row-lock capability must be reused by the writer`
    );
  }
  }

  {
  const faultSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const writerSource = sourceSection(
    faultSource,
    "async function writePostgresDatabaseWith(",
    "async function rewriteCurrentPostgresStorageSnapshotForIntegrationTest("
  );
  const hookSource = sourceSection(
    faultSource,
    "async function installPostgresFullWriterFaultForIntegrationTest(",
    "async function writePostgresDatabaseWith("
  );
  const postReturningDriftSource = sourceSection(
    faultSource,
    "async function applyPostgresFullWriterPostReturningDriftForIntegrationTest(",
    "async function writePostgresDatabaseWith("
  );

  const capabilityStage = writerSource.indexOf('recordPostgresFullWriterTestStage("capability-acquired")');
  const faultHook = writerSource.indexOf("installPostgresFullWriterFaultForIntegrationTest(sql)");
  const updateStage = writerSource.indexOf('recordPostgresFullWriterTestStage("update-executing")');
  const returningStage = writerSource.indexOf('recordPostgresFullWriterTestStage("returning-received")');
  const returningValidated = writerSource.indexOf('recordPostgresFullWriterTestStage("returning-validated")');
  const postReturningDrift = writerSource.indexOf(
    "applyPostgresFullWriterPostReturningDriftForIntegrationTest(sql)"
  );
  const finalReadStage = writerSource.indexOf('recordPostgresFullWriterTestStage("final-reread-executing")');
  const finalReadReceived = writerSource.indexOf('recordPostgresFullWriterTestStage("final-reread-received")');
  assert.ok(
    capabilityStage >= 0
      && faultHook > capabilityStage
      && updateStage > faultHook
      && returningStage > updateStage
      && returningValidated > returningStage
      && postReturningDrift > returningValidated
      && finalReadStage > postReturningDrift
      && finalReadReceived > finalReadStage
  );

  assert.match(hookSource, /process\.env\.NODE_ENV !== "test"/u);
  assert.match(hookSource, /"suppress-returning"/u);
  assert.match(hookSource, /"rewrite-returning"/u);
  assert.match(hookSource, /"post-returning-drift"/u);
  assert.match(hookSource, /BEFORE UPDATE ON public\.app_state/u);
  assert.doesNotMatch(hookSource, /AFTER UPDATE ON public\.app_state/u);
  assert.match(postReturningDriftSource, /process\.env\.NODE_ENV !== "test"/u);
  assert.match(postReturningDriftSource, /mode !== "post-returning-drift"/u);
  assert.match(postReturningDriftSource, /UPDATE public\.app_state/u);
  assert.match(postReturningDriftSource, /integration_post_returning_drift/u);
  }

  {
  const source = await readFile(
    path.join(process.cwd(), "scripts/nova-postgres-integration-worker.ts"),
    "utf8"
  );
  const section = sourceSection(
    source,
    'if (command === "full-snapshot-fault")',
    'if (command === "policy")'
  );
  assert.match(section, /configureFullWriterFault/u);
  assert.match(section, /rewriteCurrentSnapshot/u);
  assert.match(section, /clearFullWriterFault/u);
  assert.match(section, /rejected: true/u);
  assert.match(section, /rejectedAt: stages\.at\(-1\) \?\? "before-capability"/u);
  assert.match(section, /stages/u);
  assert.doesNotMatch(section, /payload|revision|updated_at|error\.message|String\(error\)/iu);
  }

  {
  const worker = await readFile(
    path.join(process.cwd(), "scripts/nova-postgres-integration-worker.ts"),
    "utf8"
  );
  const integration = await readFile(
    path.join(process.cwd(), "lib/server/userStoreNovaPostgresIntegration.test.ts"),
    "utf8"
  );
  assert.match(
    worker,
    /if \(command === "force-bootstrap"\)[\s\S]*?forceBootstrap\(\)[\s\S]*?bootstrapped: true/u
  );
  assert.match(
    worker,
    /if \(command === "strict-readiness"\)[\s\S]*?probePostgresDurableReadinessStrict\(/u
  );
  const section = sourceSection(
    integration,
    "/* generic_writer_bootstrap_lock_order_barrier */",
    "/* generic_writer_bootstrap_lock_order_barrier_end */"
  );
  const advisoryObserver = sourceSection(
    integration,
    "async function waitForStorageContractAdvisoryLock(",
    "async function waitForBootstrapAdvisoryLock("
  );
  assert.match(section, /acquireFourWriterCapabilityBarrier\(lockOrderBarrierSql\)/u);
  assert.match(section, /capabilityBarrier: true/u);
  assert.match(section, /mutationLockTimeoutMs: fourWriterMutationLockTimeoutMs/u);
  assert.match(section, /mutationStatementTimeoutMs: fourWriterMutationStatementTimeoutMs/u);
  assert.match(section, /waitForStorageContractAdvisoryLock\(sql, \{ granted: false \}\)/u);
  assert.match(advisoryObserver, /hashtextextended\(\$\{storageContractAdvisoryLockKey\}, 0\)/u);
  assert.match(advisoryObserver, /database = \([\s\S]*?pg_catalog\.current_database\(\)/u);
  assert.match(advisoryObserver, /classid::bigint[\s\S]*?objid::bigint[\s\S]*?objsubid = 1/u);
  assert.match(section, /runWorker\("force-bootstrap"\)/u);
  assert.match(section, /releaseFourWriterCapabilityBarrier\(lockOrderBarrierSql\)/u);
  assert.match(section, /Promise\.all\(\[/u);
  assert.match(section, /Promise\.allSettled\(lockOrderWorkers\)/u);
  assert.match(section, /beforeLockOrder\.revision/u);
  assert.match(section, /assertStrictStorageReady\(true\)/u);
  }
});

test("generic full-state, journal, and admin-merge SQL cannot resolve through an ambient search_path", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const adminMergeSource = await readFile(
    path.join(process.cwd(), "scripts/storage-admin-snapshot-merge.mjs"),
    "utf8"
  );
  const fullStateSource = sourceSection(
    source,
    "async function ensureInitialPostgresState(",
    "async function readDatabase()"
  );
  const journalSource = sourceSection(
    source,
    "async function recordAITutorMessageFromPostgresJournal(",
    "async function closeAiTutorPostgresClientsForIntegrationTest("
  );
  const mutationSource = sourceSection(
    source,
    "async function mutateDatabase<",
    "type PostgresAiTutorRateLimitEventRow"
  );
  const adminApplySource = sourceSection(
    adminMergeSource,
    "export async function applyMergedSnapshotInTransaction(",
    "async function applyMergedSnapshotToPostgres("
  );

  for (const relation of [
    "app_state",
    "ai_tutor_message_journal",
    "ai_tutor_usage_journal"
  ]) {
    const ambientRelation = new RegExp(
      `\\b(?:FROM|INTO|JOIN|UPDATE)\\s+${relation}\\b`,
      "iu"
    );
    assert.doesNotMatch(`${fullStateSource}\n${journalSource}`, ambientRelation);
  }
  assert.doesNotMatch(
    `${fullStateSource}\n${journalSource}`,
    /(?<!pg_catalog\.)\bjsonb_agg\s*\(|::jsonb\b/iu
  );
  assert.match(`${mutationSource}\n${fullStateSource}`, /pg_catalog\.set_config\('search_path', 'pg_catalog, public', true\)/u);

  assert.match(adminApplySource, /pg_catalog\.set_config\('search_path', 'pg_catalog, public', true\)/u);
  assert.doesNotMatch(
    adminApplySource,
    /\b(?:FROM|INTO|JOIN|UPDATE|DELETE\s+FROM)\s+(?:app_state|app_state_readiness_markers)\b/iu
  );
  assert.doesNotMatch(adminApplySource, /::jsonb\b/iu);
});

test("ordinary Postgres reads and mutations never normalize an existing incomplete payload", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const lockedReadSource = sourceSection(
    source,
    "async function normalizeLockedPostgresState(",
    "async function readPostgresDatabaseFrom("
  );
  const ordinaryReadSource = sourceSection(
    source,
    "async function readPostgresDatabaseFrom(",
    "async function readPostgresDatabase()"
  );
  const backfillSource = sourceSection(
    source,
    "async function runPostgresHotAuthBackfillForAdmin(",
    "export const buildRedactedAdminStorageSnapshot"
  );

  assert.match(lockedReadSource, /postgresStorageSnapshotContractIsComplete\(rows\[0\]\?\.payload\)/u);
  assert.match(ordinaryReadSource, /postgresStorageSnapshotContractIsComplete\(rows\[0\]\?\.payload\)/u);
  assert.doesNotMatch(
    `${lockedReadSource}\n${ordinaryReadSource}`,
    /ensureInitialPostgresState|createInitialDatabase|writePostgresDatabaseWith/u
  );
  assert.match(backfillSource, /postgresStorageSnapshotContractIsComplete\(rows\[0\]\?\.payload\)/u);
  assert.doesNotMatch(backfillSource, /ensureInitialPostgresState|createInitialDatabase/u);
  assert.equal(
    (source.match(/ensureInitialPostgresState\(/gu) ?? []).length,
    2,
    "only the helper declaration and canonical bootstrap may create a missing state row"
  );
});

test("ordinary Postgres validation rejects JSONB scalar strings outside the versioned cold migration", async () => {
  const readiness = await import("@/lib/server/userStore");
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const bootstrapSource = sourceSection(
    source,
    "async function bootstrapPostgresStateTables()",
    "const ensurePostgresStateTable"
  );
  const completeSnapshot = readiness.__userStorePostgresStorageReadinessTestHooks
    .createCompleteSnapshot();

  assert.equal(readiness.postgresStorageSnapshotContractIsComplete(completeSnapshot), true);
  assert.equal(
    readiness.postgresStorageSnapshotContractIsComplete(JSON.stringify(completeSnapshot)),
    false,
    "a JSONB string must never be parsed by an ordinary read or writer validator"
  );
  assert.doesNotMatch(
    bootstrapSource,
    /WHEN pg_catalog\.jsonb_typeof\(NEW\.payload\) = 'string' THEN/u
  );
  assert.match(
    bootstrapSource,
    /pg_catalog\.jsonb_typeof\(payload\) = 'string'[\s\S]*NOT EXISTS \([\s\S]*FROM public\.auth_schema_migrations[\s\S]*version = \$\{hotAuthSchemaVersion\}/u
  );
});

test("initializer strict probe propagates non-42P01 without bootstrapping while the external wrapper stays private", async () => {
  const readiness = await import("@/lib/server/userStore");
  const permissionError = Object.assign(new Error("sensitive database permission diagnostics"), {
    code: "42501"
  });
  const strictFake = createExecutor({ catalogErrors: [permissionError] });
  let bootstrapCalls = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: () => readiness.probePostgresStorageReadinessStrict(strictFake.client, state),
    bootstrap: async () => {
      bootstrapCalls += 1;
    }
  });

  await assert.rejects(ensureReady(), (actual) => {
    assert.equal(actual, permissionError);
    return true;
  });
  assert.equal(bootstrapCalls, 0);

  const timeoutError = Object.assign(new Error("sensitive pooled timeout diagnostics"), {
    code: "57014"
  });
  const externalFake = createExecutor({ catalogErrors: [timeoutError] });
  assert.equal(await readiness.probePostgresStorageReadiness(externalFake.client, state), false);
  assert.equal(await readiness.probePostgresStorageReadiness(externalFake.client, state), true);
  assert.equal(externalFake.transactionCount(), 2, "the pooled executor remains reusable after timeout");
});

test("42P01 remains the only strict probe error that the initializer may bootstrap", async () => {
  const readiness = await import("@/lib/server/userStore");
  const missingTableError = Object.assign(new Error("missing readiness table"), { code: "42P01" });
  const externalFake = createExecutor({ catalogErrors: [missingTableError] });
  assert.equal(await readiness.probePostgresStorageReadiness(externalFake.client, state), false);
  const externalSql = externalFake.statements.map((statement) => statement.text).join("\n");
  assert.doesNotMatch(externalSql, /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/iu);
  assert.doesNotMatch(externalSql, /pg_advisory_xact_lock\s*\(|\bpayload\b/iu);

  const fake = createExecutor({ catalogErrors: [missingTableError] });
  let bootstrapCalls = 0;
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: () => readiness.probePostgresStorageReadinessStrict(fake.client, state),
    bootstrap: async () => {
      bootstrapCalls += 1;
    }
  });

  await ensureReady();
  assert.equal(bootstrapCalls, 1);
});

test("concurrent cold callers share the canonical schema bootstrap gate", async () => {
  let bootstrapCalls = 0;
  let releaseBootstrap: (() => void) | undefined;
  const bootstrapBarrier = new Promise<void>((resolve) => {
    releaseBootstrap = resolve;
  });
  const ensureReady = createPostgresSchemaReadinessGate({
    readCurrentMarker: async () => false,
    bootstrap: async () => {
      bootstrapCalls += 1;
      await bootstrapBarrier;
    }
  });

  const first = ensureReady();
  const second = ensureReady();
  assert.equal(first, second);
  assert.equal(bootstrapCalls, 0, "the async marker probe runs before bootstrap");
  await Promise.resolve();
  assert.equal(bootstrapCalls, 1);
  releaseBootstrap?.();
  await Promise.all([first, second]);
  assert.equal(bootstrapCalls, 1);
});

test("the real complete snapshot fixture validates before each parent or classroom deletion fails", async () => {
  const readiness = await import("@/lib/server/userStore");
  const completeSnapshot = readiness.__userStorePostgresStorageReadinessTestHooks
    .createCompleteSnapshot();
  assert.equal(readiness.postgresStorageSnapshotContractIsComplete(completeSnapshot), true);

  for (const missingCollection of readiness.postgresStorageCriticalReadinessCollections) {
    const incompleteSnapshot = structuredClone(completeSnapshot) as Record<string, unknown>;
    delete incompleteSnapshot[missingCollection];
    assert.equal(readiness.postgresStorageSnapshotContractIsComplete(incompleteSnapshot), false);

    const fake = createExecutor();
    await fake.client.begin(async (sql) => {
      await assert.rejects(
        readiness.attestCompletePostgresStorageSnapshot(sql, incompleteSnapshot, state),
        /^Error: Postgres storage snapshot is incomplete\.$/u
      );
    });
    assert.equal(
      fake.statements.some((statement) => statement.text.includes("postgres_storage_readiness_marker_attestation")),
      false
    );
  }
});

test("partial writers transfer an opaque attested revision without selecting the full payload", async () => {
  const readiness = await import("@/lib/server/userStore") as Record<string, unknown>;
  assert.equal(
    typeof readiness.acquirePostgresStorageMutationCapability,
    "function",
    "partial writers need one shared scalar capability acquisition contract"
  );
  assert.equal(
    typeof readiness.advancePostgresStorageReadinessAfterMutation,
    "function",
    "controlled writers need one shared atomic marker-advance contract"
  );
  const acquire = readiness.acquirePostgresStorageMutationCapability as (
    sql: FakeTransaction,
    state: ReadinessStateInput
  ) => Promise<unknown>;
  const advance = readiness.advancePostgresStorageReadinessAfterMutation as (
    sql: FakeTransaction,
    capability: unknown,
    currentRevision: number
  ) => Promise<void>;

  function createCapabilityExecutor({
    catalogRows = storageCatalogRowsForState("ready"),
    invalidationCatalogRows = readyStorageTriggerCatalogRows(),
    markerFixture = createReadyStorageMarkerFixture(),
    restoredRevision = 12
  }: {
    catalogRows?: StorageCatalogRow[];
    invalidationCatalogRows?: StorageInvalidationCatalogRow[];
    markerFixture?: StorageMarkerFixture;
    restoredRevision?: number;
  } = {}) {
    const statements: CapturedStatement[] = [];
    const sql: FakeTransaction = async (strings, ...values) => {
      const text = strings.join("$value");
      statements.push({ transaction: 1, text, values });
      if (text.includes("postgres_storage_readiness_state_lock")) {
        const [requestedId, requestedTenant, requestedKind, requestedSchema] = values;
        const requestedState = markerFixture.stateRows.find((row) => (
          row.id === requestedId
          && row.tenant_id === requestedTenant
          && row.state_kind === requestedKind
          && row.schema_version === requestedSchema
        ));
        return requestedState ? [{ revision: requestedState.revision }] : [];
      }
      if (text.includes("postgres_storage_readiness_relation_lock")) return [];
      if (text.includes("postgres_storage_readiness_catalog_probe")) {
        return structuredClone(catalogRows);
      }
      if (text.includes("postgres_storage_readiness_invalidation_probe")) {
        return structuredClone(invalidationCatalogRows);
      }
      if (text.includes("postgres_hot_auth_readiness_catalog_probe")) {
        return [{ schema_ready: true }];
      }
      if (text.includes("postgres_storage_readiness_mutation_capability")) {
        const [migrationVersion, requestedId, requestedTenant, requestedKind, requestedSchema,
          requestedRevision, contractVersion] = values;
        const matches = markerFixture.migrationVersions.includes(Number(migrationVersion))
          && markerFixture.markerRows.some((row) => (
            row.state_id === requestedId
            && row.tenant_id === requestedTenant
            && row.state_kind === requestedKind
            && row.schema_version === requestedSchema
            && row.state_revision === requestedRevision
            && row.contract_version === contractVersion
          ));
        return matches ? [{ revision: requestedRevision }] : [];
      }
      if (text.includes("postgres_storage_readiness_marker_attestation")) {
        return [{ state_revision: restoredRevision }];
      }
      return [];
    };
    return { sql, statements };
  }

  const replayFake = createCapabilityExecutor();
  const replayCapability = await acquire(replayFake.sql, state);
  assert.equal(replayFake.statements.length, 8);
  assert.match(
    replayFake.statements[0]?.text ?? "",
    /pg_catalog\.set_config\('search_path', 'pg_catalog, public', true\)/u
  );
  const relationLockStatement = replayFake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_relation_lock")
  );
  assert.match(relationLockStatement?.text ?? "", /IN SHARE ROW EXCLUSIVE MODE(?! NOWAIT)/u);
  const capabilityStatement = replayFake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_mutation_capability")
  );
  assert.ok(capabilityStatement);
  assert.match(capabilityStatement.text, /SELECT\s+marker\.state_revision AS revision/iu);
  assert.match(capabilityStatement.text, /FOR KEY SHARE OF marker, migration/iu);
  assert.match(capabilityStatement.text, /marker\.state_revision = \$value/u);
  assert.match(capabilityStatement.text, /marker\.contract_version = \$value/u);
  assert.match(capabilityStatement.text, /INNER JOIN public\.auth_schema_migrations AS migration/u);
  assert.deepEqual(capabilityStatement.values, [4, "primary", "platform", "app-snapshot", 1, 11, 1]);
  assert.doesNotMatch(capabilityStatement.text, /SELECT\s+(?:state\.)?payload\b/iu);
  await advance(replayFake.sql, replayCapability, 11);
  assert.equal(
    replayFake.statements.length,
    8,
    "an idempotent replay must preserve the already-valid marker without re-attesting"
  );

  const changedFake = createCapabilityExecutor();
  const changedCapability = await acquire(changedFake.sql, state);
  await advance(changedFake.sql, changedCapability, 12);
  const attestationStatement = changedFake.statements.find((statement) =>
    statement.text.includes("postgres_storage_readiness_marker_attestation")
  );
  assert.ok(attestationStatement);
  assert.match(attestationStatement.text, /current_state\.revision = \$value/u);
  assert.deepEqual(
    attestationStatement.values,
    [1, "primary", "platform", "app-snapshot", 1, 12]
  );
  assert.doesNotMatch(attestationStatement.text, /SELECT\s+(?:current_state\.)?payload\b/iu);

  const capabilityDrifts: Array<[string, StorageMarkerFixture]> = [
    ["missing marker", storageMarkerFixtureWith((fixture) => { fixture.markerRows = []; })],
    ["stale marker", storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].state_revision = 10; })],
    ["wrong tenant", storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].tenant_id = "other"; })],
    ["wrong contract", storageMarkerFixtureWith((fixture) => { fixture.markerRows[0].contract_version = 2; })],
    ["missing migration", storageMarkerFixtureWith((fixture) => { fixture.migrationVersions = []; })]
  ];
  for (const [name, markerFixture] of capabilityDrifts) {
    const absentFake = createCapabilityExecutor({ markerFixture });
    await assert.rejects(
      acquire(absentFake.sql, state),
      /^Error: Postgres storage readiness is unavailable\.$/u,
      name
    );
    assert.equal(
      absentFake.statements.some((statement) =>
        statement.text.includes("postgres_storage_readiness_marker_attestation")
      ),
      false,
      name
    );
  }

  const invalidationDriftFake = createCapabilityExecutor({ invalidationCatalogRows: [] });
  await assert.rejects(
    acquire(invalidationDriftFake.sql, state),
    /^Error: Postgres storage readiness is unavailable\.$/u
  );
  assert.equal(
    invalidationDriftFake.statements.some((statement) =>
      statement.text.includes("postgres_storage_readiness_mutation_capability")
    ),
    false
  );

  const catalogDriftFake = createCapabilityExecutor({
    catalogRows: storageCatalogRowsForState("missing-marker-column")
  });
  await assert.rejects(
    acquire(catalogDriftFake.sql, state),
    /^Error: Postgres storage readiness is unavailable\.$/u
  );
  assert.equal(
    catalogDriftFake.statements.some((statement) =>
      statement.text.includes("postgres_storage_readiness_invalidation_probe")
      || statement.text.includes("postgres_storage_readiness_mutation_capability")
    ),
    false,
    "catalog drift must stop before trigger or marker capability checks"
  );

  const skippedRevisionFake = createCapabilityExecutor();
  const skippedRevisionCapability = await acquire(skippedRevisionFake.sql, state);
  await assert.rejects(
    advance(skippedRevisionFake.sql, skippedRevisionCapability, 13),
    /^Error: Postgres storage readiness is unavailable\.$/u
  );
  assert.equal(
    skippedRevisionFake.statements.some((statement) =>
      statement.text.includes("postgres_storage_readiness_marker_attestation")
    ),
    false
  );

  const forgedFake = createCapabilityExecutor();
  await assert.rejects(
    advance(forgedFake.sql, { previousRevision: 11 }, 12),
    /^Error: Postgres storage readiness is unavailable\.$/u
  );
  assert.equal(forgedFake.statements.length, 0);
});

test("trigger invalidation and transaction rollback preserve the marker capability boundary", async () => {
  const readiness = await import("@/lib/server/userStore") as Record<string, unknown>;
  const acquire = readiness.acquirePostgresStorageMutationCapability as (
    sql: FakeTransaction,
    state: ReadinessStateInput
  ) => Promise<unknown>;
  const advance = readiness.advancePostgresStorageReadinessAfterMutation as (
    sql: FakeTransaction,
    capability: unknown,
    currentRevision: number
  ) => Promise<void>;
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(
    source,
    /AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version\s+ON public\.app_state/iu
  );
  assert.match(
    source,
    /IF TG_OP = 'UPDATE' THEN[\s\S]*WHERE state_id IN \(OLD\.id, NEW\.id\)[\s\S]*ELSE[\s\S]*WHERE state_id = NEW\.id/iu
  );

  function createStatefulExecutor() {
    const durable = { markerRevision: 11 as number | null, payloadVersion: 1, revision: 11 };
    const statements: CapturedStatement[] = [];
    let transactionCount = 0;
    const client = Object.assign(
      async (_strings: TemplateStringsArray, ..._values: unknown[]) => [] as Record<string, unknown>[],
      {
        async begin<T>(operation: (sql: FakeTransaction) => Promise<T>) {
          transactionCount += 1;
          const before = { ...durable };
          const transaction = transactionCount;
          const sql: FakeTransaction = async (strings, ...values) => {
            const text = strings.join("$value");
            statements.push({ transaction, text, values });
            if (text.includes("postgres_storage_readiness_state_lock")) {
              return [{ revision: durable.revision }];
            }
            if (text.includes("postgres_storage_readiness_relation_lock")) return [];
            if (text.includes("postgres_storage_readiness_catalog_probe")) {
              return storageCatalogRowsForState("ready");
            }
            if (text.includes("postgres_storage_readiness_invalidation_probe")) {
              return readyStorageTriggerCatalogRows();
            }
            if (text.includes("postgres_hot_auth_readiness_catalog_probe")) {
              return [{ schema_ready: true }];
            }
            if (text.includes("postgres_storage_readiness_mutation_capability")) {
              const markerFixture: StorageMarkerFixture = {
                stateRows: [{
                  id: "primary",
                  tenant_id: "platform",
                  state_kind: "app-snapshot",
                  schema_version: 1,
                  revision: durable.revision
                }],
                markerRows: durable.markerRevision === null ? [] : [{
                  state_id: "primary",
                  tenant_id: "platform",
                  state_kind: "app-snapshot",
                  schema_version: 1,
                  state_revision: durable.markerRevision,
                  contract_version: 1
                }],
                migrationVersions: [4]
              };
              const [migrationVersion, requestedId, requestedTenant, requestedKind,
                requestedSchema, requestedRevision, contractVersion] = values;
              return markerFixture.migrationVersions.includes(Number(migrationVersion))
                && markerFixture.markerRows.some((row) => (
                  row.state_id === requestedId
                  && row.tenant_id === requestedTenant
                  && row.state_kind === requestedKind
                  && row.schema_version === requestedSchema
                  && row.state_revision === requestedRevision
                  && row.contract_version === contractVersion
                )) ? [{ revision: durable.revision }] : [];
            }
            if (text.includes("test_unknown_payload_update")) {
              durable.payloadVersion += 1;
              durable.markerRevision = null;
              return [{ revision: durable.revision }];
            }
            if (text.includes("test_controlled_payload_update")) {
              durable.payloadVersion += 1;
              durable.revision += 1;
              durable.markerRevision = null;
              return [{ revision: durable.revision }];
            }
            if (/DELETE FROM app_state_readiness_markers/u.test(text)) {
              durable.markerRevision = null;
              return [];
            }
            if (text.includes("postgres_storage_readiness_marker_attestation")) {
              const expectedRevision = Number(values.at(-1));
              if (expectedRevision !== durable.revision) return [];
              durable.markerRevision = expectedRevision;
              return [{ state_revision: expectedRevision }];
            }
            return [];
          };
          try {
            return await operation(sql);
          } catch (error) {
            Object.assign(durable, before);
            throw error;
          }
        }
      }
    ) as FakeClient;
    return { client, durable, statements };
  }

  const unknownWriter = createStatefulExecutor();
  await unknownWriter.client.begin(async (sql) => {
    await acquire(sql, state);
    await sql`
      /* test_unknown_payload_update */
      UPDATE app_state SET payload = payload WHERE id = ${state.id}
      RETURNING revision
    `;
    await assert.rejects(
      acquire(sql, state),
      /^Error: Postgres storage readiness is unavailable\.$/u
    );
  });
  assert.deepEqual(unknownWriter.durable, { markerRevision: null, payloadVersion: 2, revision: 11 });

  const rollbackWriter = createStatefulExecutor();
  await assert.rejects(
    rollbackWriter.client.begin(async (sql) => {
      await sql`
        /* test_unknown_payload_update */
        UPDATE app_state SET payload = payload WHERE id = ${state.id}
        RETURNING revision
      `;
      throw new Error("force rollback");
    }),
    /^Error: force rollback$/u
  );
  assert.deepEqual(rollbackWriter.durable, { markerRevision: 11, payloadVersion: 1, revision: 11 });
  await rollbackWriter.client.begin(async (sql) => {
    await acquire(sql, state);
  });

  const controlledWriter = createStatefulExecutor();
  await controlledWriter.client.begin(async (sql) => {
    const capability = await acquire(sql, state);
    const rows = await sql`
      /* test_controlled_payload_update */
      UPDATE app_state SET payload = payload, revision = revision + 1 WHERE id = ${state.id}
      RETURNING revision
    `;
    await advance(sql, capability, Number(rows[0]?.revision));
  });
  assert.deepEqual(controlledWriter.durable, { markerRevision: 12, payloadVersion: 2, revision: 12 });

  const controlledRollback = createStatefulExecutor();
  await assert.rejects(
    controlledRollback.client.begin(async (sql) => {
      const capability = await acquire(sql, state);
      const rows = await sql`
        /* test_controlled_payload_update */
        UPDATE app_state SET payload = payload, revision = revision + 1 WHERE id = ${state.id}
        RETURNING revision
      `;
      await advance(sql, capability, Number(rows[0]?.revision));
      throw new Error("force rollback after attestation");
    }),
    /^Error: force rollback after attestation$/u
  );
  assert.deepEqual(controlledRollback.durable, { markerRevision: 11, payloadVersion: 1, revision: 11 });
});

test("all bounded partial writers acquire the marker before writes and never reread the full payload", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const sections = [
    [
      "AI message",
      "async function recordAITutorMessageFromPostgresJournal(",
      "async function recordAITutorUsageFromPostgresJournal("
    ],
    [
      "AI usage",
      "async function recordAITutorUsageFromPostgresJournal(",
      "async function closeAiTutorPostgresClientsForIntegrationTest("
    ],
    [
      "password-reset request",
      "async function createPasswordResetRequestInPostgresHotTables(",
      "export const createPasswordResetRequest"
    ],
    [
      "password-reset consume",
      "async function resetUserPasswordInPostgresHotTables(",
      "export const resetUserPassword"
    ]
  ] as const;

  for (const [name, startMarker, endMarker] of sections) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.notEqual(start, -1, `${name}: missing start marker`);
    assert.notEqual(end, -1, `${name}: missing end marker`);
    const section = source.slice(start, end);
    const acquireIndex = section.indexOf("acquirePostgresStorageMutationCapability(");
    const firstMutationIndex = section.search(/\b(?:INSERT INTO|UPDATE|DELETE FROM)\b/u);
    const advanceIndex = section.indexOf("advancePostgresStorageReadinessAfterMutation(");

    assert.notEqual(acquireIndex, -1, `${name}: missing scalar readiness capability`);
    assert.notEqual(firstMutationIndex, -1, `${name}: expected a bounded mutation`);
    assert.equal(
      acquireIndex < firstMutationIndex,
      true,
      `${name}: the previous marker must be validated before the first mutation`
    );
    assert.notEqual(advanceIndex, -1, `${name}: missing marker advance`);
    assert.equal(advanceIndex > firstMutationIndex, true, `${name}: marker advance must follow mutation`);
    assert.doesNotMatch(section, /SELECT\s+(?:state\.)?payload\b/iu, `${name}: full payload reread`);
    assert.doesNotMatch(section, /attestCurrentPostgresStorageSnapshot/u, `${name}: legacy full attestation`);
    assert.match(section, /AND state\.revision = \$\{storageCapability\.previousRevision\}/u);
    assert.match(section, /RETURNING state\.revision/u);
  }
});

test("admin hot-auth diagnostics validates the complete column contract before counting", async () => {
  const readiness = await import("@/lib/server/userStore");
  const fake = createExecutor({ hotAuthCatalogStates: ["ready", "missing-column"] });

  assert.deepEqual(await readiness.countPostgresHotAuthRowsForAdminDiagnostics(fake.client), {
    auth_users: 4,
    auth_student_profiles: 2,
    auth_user_settings: 2,
    auth_password_reset_tokens: 1
  });
  assert.equal(await readiness.countPostgresHotAuthRowsForAdminDiagnostics(fake.client), null);
  assert.equal(fake.transactionCount(), 2);
  assert.equal(fake.hotAuthCatalogProbeCount(), 2);
  assert.match(
    fake.statements[0]?.text ?? "",
    /SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY/u
  );
  assert.match(fake.statements[1]?.text ?? "", /set_config\('lock_timeout', '1000ms', true\)/u);
  assert.match(fake.statements[1]?.text ?? "", /set_config\('statement_timeout', '5000ms', true\)/u);
  assert.match(fake.statements[2]?.text ?? "", /postgres_storage_contract_shared_advisory_lock/u);
  assert.match(fake.statements[3]?.text ?? "", /postgres_storage_readiness_relation_observation_lock/u);
  assert.match(fake.statements[4]?.text ?? "", /postgres_hot_auth_readiness_catalog_probe/u);
  assert.match(fake.statements[5]?.text ?? "", /postgres_hot_auth_readiness_count_probe/u);
  const secondTransactionStatements = fake.statements.filter((statement) => statement.transaction === 2);
  assert.equal(
    secondTransactionStatements.some((statement) =>
      statement.text.includes("postgres_hot_auth_readiness_count_probe")
    ),
    false,
    "a missing required column must stop before the count query"
  );

  const catalogStatement = fake.statements.find((statement) =>
    statement.text.includes("postgres_hot_auth_readiness_catalog_probe")
  );
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_attribute/u);
  assert.match(catalogStatement?.text ?? "", /pg_catalog\.pg_type/u);
  assert.match(catalogStatement?.text ?? "", /auth_schema_migrations/u);
  const [tables, columns, types, typeOids, nullable] = catalogStatement?.values ?? [];
  assert.equal(Array.isArray(tables), true);
  assert.equal(Array.isArray(columns), true);
  assert.equal(Array.isArray(types), true);
  assert.equal(Array.isArray(typeOids), true);
  assert.equal(Array.isArray(nullable), true);
  assert.deepEqual(
    typeOids,
    (types as string[]).map((type) => pgCatalogTypeOids[type])
  );
  assert.deepEqual(
    (tables as string[]).map((table, index) => ({
      table,
      column: (columns as string[])[index],
      type: (types as string[])[index],
      nullable: Boolean((nullable as number[])[index])
    })),
    [
      { table: "auth_users", column: "id", type: "text", nullable: false },
      { table: "auth_users", column: "username", type: "text", nullable: false },
      { table: "auth_users", column: "normalized_username", type: "text", nullable: false },
      { table: "auth_users", column: "email", type: "text", nullable: true },
      { table: "auth_users", column: "normalized_email", type: "text", nullable: true },
      { table: "auth_users", column: "password_hash", type: "text", nullable: false },
      { table: "auth_users", column: "password_salt", type: "text", nullable: false },
      { table: "auth_users", column: "school_id", type: "text", nullable: true },
      { table: "auth_users", column: "password_must_change", type: "bool", nullable: false },
      { table: "auth_users", column: "session_revision", type: "int4", nullable: false },
      { table: "auth_users", column: "disabled_at", type: "text", nullable: true },
      { table: "auth_users", column: "role", type: "text", nullable: false },
      { table: "auth_users", column: "created_at", type: "text", nullable: false },
      { table: "auth_student_profiles", column: "user_id", type: "text", nullable: false },
      { table: "auth_student_profiles", column: "name", type: "text", nullable: false },
      { table: "auth_student_profiles", column: "grade", type: "text", nullable: false },
      { table: "auth_student_profiles", column: "curriculum_track", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "curriculum_region", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "textbook_publisher", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "parent_invite_code", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "avatar_id", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "avatar_image_data_url", type: "text", nullable: true },
      { table: "auth_student_profiles", column: "avatar_media_object_key", type: "text", nullable: true },
      { table: "auth_user_settings", column: "user_id", type: "text", nullable: false },
      { table: "auth_user_settings", column: "language", type: "text", nullable: false },
      { table: "auth_user_settings", column: "theme", type: "text", nullable: false },
      { table: "auth_user_settings", column: "selected_grade", type: "text", nullable: false },
      { table: "auth_user_settings", column: "updated_at", type: "text", nullable: false },
      { table: "auth_password_reset_tokens", column: "id", type: "text", nullable: false },
      { table: "auth_password_reset_tokens", column: "user_id", type: "text", nullable: false },
      { table: "auth_password_reset_tokens", column: "token_hash", type: "text", nullable: false },
      { table: "auth_password_reset_tokens", column: "expires_at", type: "text", nullable: false },
      { table: "auth_password_reset_tokens", column: "used_at", type: "text", nullable: true },
      { table: "auth_password_reset_tokens", column: "created_at", type: "text", nullable: false }
    ]
  );
  assert.doesNotMatch(fake.statements.map((statement) => statement.text).join("\n"), /\bpayload\b/iu);
});

test("production readiness owns a dedicated one-slot client instead of the general pool", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const clientSource = sourceSection(
    source,
    "function createPostgresReadinessClient()",
    "async function hasCurrentPostgresSchemaMarker()"
  );
  const snapshotSource = sourceSection(
    source,
    "async function getPostgresHotAuthReadinessSnapshot(",
    "async function runPostgresHotAuthBackfillForAdmin"
  );

  assert.match(clientSource, /max:\s*1/u);
  assert.match(clientSource, /application_name:\s*"mais-storage-readiness"/u);
  assert.match(clientSource, /await client\.end\(\{ timeout: 0 \}\)/u);
  assert.match(snapshotSource, /runPostgresDurableReadinessWithinDeadline/u);
  assert.doesNotMatch(snapshotSource, /getPostgresClient\(/u);
  assert.doesNotMatch(clientSource, /PendingQuery|\.cancel\(/u);
});

test("the readiness deadline begins before queue admission and destroys a hung dedicated client", async () => {
  const store = await import("@/lib/server/userStore");
  const hooks = store.__userStorePostgresStorageReadinessTestHooks as typeof store.__userStorePostgresStorageReadinessTestHooks & {
    runDeadlineHarness?: (input: {
      client: {
        begin: () => Promise<never>;
        end: (options: { timeout: number }) => Promise<void>;
      };
      deadlineMs: number;
    }) => Promise<unknown>;
  };
  assert.equal(typeof hooks.runDeadlineHarness, "function");

  let rejectBegin: ((error: Error) => void) | null = null;
  let endCalls = 0;
  let endTimeout: number | null = null;
  const client = {
    begin: () => new Promise<never>((_resolve, reject) => {
      rejectBegin = reject;
    }),
    end: async ({ timeout }: { timeout: number }) => {
      endCalls += 1;
      endTimeout = timeout;
      rejectBegin?.(new Error("dedicated readiness client closed"));
    }
  };
  const startedAt = performance.now();
  await assert.rejects(
    hooks.runDeadlineHarness?.({ client, deadlineMs: 25 }),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.ok(performance.now() - startedAt < 250, "the total deadline must include begin and cleanup");
  assert.equal(endCalls, 1);
  assert.equal(endTimeout, 0);
});

test("a queued readiness probe expires without touching either the dedicated or general client", async () => {
  const store = await import("@/lib/server/userStore");
  type DeadlineClient = {
    begin: () => Promise<never>;
    end: (options: { timeout: number }) => Promise<void>;
  };
  const hooks = store.__userStorePostgresStorageReadinessTestHooks as typeof store.__userStorePostgresStorageReadinessTestHooks & {
    createDeadlineHarness?: () => {
      run: (input: { client: DeadlineClient; deadlineMs: number }) => Promise<unknown>;
    };
  };
  assert.equal(typeof hooks.createDeadlineHarness, "function");
  const harness = hooks.createDeadlineHarness?.();
  assert.ok(harness);

  let releaseFirstBegin!: (error: Error) => void;
  let markFirstBegin!: () => void;
  const firstBeginStarted = new Promise<void>((resolve) => {
    markFirstBegin = resolve;
  });
  const firstClient: DeadlineClient = {
    begin: () => {
      markFirstBegin();
      return new Promise<never>((_resolve, reject) => {
        releaseFirstBegin = reject;
      });
    },
    end: async () => releaseFirstBegin(new Error("first readiness client closed"))
  };
  let queuedBeginCalls = 0;
  let queuedEndCalls = 0;
  const queuedClient: DeadlineClient = {
    begin: () => {
      queuedBeginCalls += 1;
      return new Promise<never>(() => undefined);
    },
    end: async () => {
      queuedEndCalls += 1;
    }
  };

  const first = harness.run({ client: firstClient, deadlineMs: 100 });
  void first.catch(() => undefined);
  await firstBeginStarted;
  const queuedStartedAt = performance.now();
  await assert.rejects(
    harness.run({ client: queuedClient, deadlineMs: 25 }),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError"
  );
  assert.ok(performance.now() - queuedStartedAt < 75);
  assert.equal(queuedBeginCalls, 0);
  assert.equal(queuedEndCalls, 0);
  await assert.rejects(first, (error: unknown) => (
    error instanceof DOMException && error.name === "AbortError"
  ));
});
