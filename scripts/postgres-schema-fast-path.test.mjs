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

  assert.notEqual(bootstrapStart, -1);
  assert.notEqual(bootstrapEnd, -1);
  assert.notEqual(markerInsert, -1);
  assert.equal(markerInsert, bootstrapSource.lastIndexOf("INSERT INTO auth_schema_migrations"));
  assert.equal(markerInsert > bootstrapSource.lastIndexOf("CREATE INDEX IF NOT EXISTS"), true);
  assert.equal(markerInsert > bootstrapSource.lastIndexOf("CREATE TABLE IF NOT EXISTS"), true);
});
