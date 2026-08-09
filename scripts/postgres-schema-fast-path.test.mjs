import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const userStoreSource = readFileSync("lib/server/userStore.ts", "utf8");

test("userStore wires the migration marker probe ahead of the schema bootstrap", () => {
  assert.match(
    userStoreSource,
    /import \{ createPostgresSchemaReadinessGate \} from "@\/lib\/server\/userStore\/postgresSchemaReadiness";/
  );
  assert.match(userStoreSource, /async function hasCurrentPostgresSchemaMarker\(\)/);
  assert.match(userStoreSource, /FROM auth_schema_migrations\s+WHERE version = \$\{hotAuthSchemaVersion\}/);
  assert.match(userStoreSource, /to_regclass\('public\.app_state'\) IS NOT NULL/);
  assert.match(userStoreSource, /async function bootstrapPostgresStateTables\(\)/);
  assert.match(
    userStoreSource,
    /const ensurePostgresStateTable = createPostgresSchemaReadinessGate\(\{\s+readCurrentMarker: hasCurrentPostgresSchemaMarker,\s+bootstrap: bootstrapPostgresStateTables\s+\}\);/
  );
  assert.doesNotMatch(userStoreSource, /let postgresReady: Promise<void> \| null/);
});

test("schema bootstrap records the current marker as its final SQL statement", () => {
  const bootstrapStart = userStoreSource.indexOf("async function bootstrapPostgresStateTables()");
  const bootstrapEnd = userStoreSource.indexOf("function parseStoredStatePayload", bootstrapStart);
  const bootstrapSource = userStoreSource.slice(bootstrapStart, bootstrapEnd);
  const markerInsert = bootstrapSource.indexOf("INSERT INTO auth_schema_migrations");
  const novaRateLedgerTable = bootstrapSource.indexOf(
    "CREATE TABLE IF NOT EXISTS ai_governance_rate_limit_events"
  );
  const novaRateLedgerIndex = bootstrapSource.indexOf(
    "CREATE INDEX IF NOT EXISTS ai_governance_rate_limit_events_user_capability_idx"
  );
  const novaRateLedgerBackfill = bootstrapSource.indexOf(
    "INSERT INTO ai_governance_rate_limit_events"
  );
  const schemaSqlStatements = bootstrapSource.match(/(?:await |return )?sql(?:<[^`]+>)?`/g) ?? [];

  assert.notEqual(bootstrapStart, -1);
  assert.notEqual(bootstrapEnd, -1);
  assert.notEqual(markerInsert, -1);
  assert.notEqual(novaRateLedgerTable, -1);
  assert.notEqual(novaRateLedgerIndex, -1);
  assert.notEqual(novaRateLedgerBackfill, -1);
  assert.equal(schemaSqlStatements.length, 71);
  assert.equal(markerInsert, bootstrapSource.lastIndexOf("INSERT INTO auth_schema_migrations"));
  assert.equal(markerInsert > bootstrapSource.lastIndexOf("CREATE INDEX IF NOT EXISTS"), true);
  assert.equal(markerInsert > bootstrapSource.lastIndexOf("CREATE TABLE IF NOT EXISTS"), true);
  assert.equal(markerInsert > novaRateLedgerBackfill, true);
});
