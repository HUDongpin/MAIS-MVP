import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../userStore.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("userStore.ts", source, ts.ScriptTarget.Latest, true);
const names = ["normalizeLockedPostgresState", "readPostgresDatabaseForMutation", "mutateDatabase"];
const parts = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(parts.length, names.length);

function fixture({ incomplete = false, failWrite = false } = {}) {
  const events = [], original = { users: [{ id: "target" }], lesson_progress: [] };
  let normalized, committed;
  const sql = async () => [];
  const context = { exports: {}, storageProvider: "postgres", databaseIndexCache: new WeakMap(),
    hasAuthorityInstallation: async () => false, validateMutationActor: async () => undefined,
    validateMutationDeadline: () => {}, bindCommittedSessionGeneration: async () => {},
    ensurePostgresStateTable: async () => {}, currentPostgresStorageReadinessState: () => ({}),
    acquirePostgresStorageMutationCapability: async () => { events.push("guard"); return { previousRevision: 1 }; },
    postgresStudentActivityExclusiveLockQuery: async () => { events.push("activity-lock"); },
    selectPostgresStateRows: async (_, locked) => { assert.equal(locked, true); events.push("select-lock"); return [{ payload: original }]; },
    postgresStorageSnapshotContractIsComplete: () => !incomplete, parseStoredStatePayload: value => value,
    hasCoreTables: () => true, normalizeDatabase: value => structuredClone(value),
    overlayPostgresAiTutorJournals: value => value, overlayPostgresHotAuthRowsIfEnabled: async (_, value) => value,
    overlayPostgresStudentActivity: async (_, value) => { normalized = value; return value; },
    syncPostgresHotAuthTablesWith: async () => { events.push("auth-pre"); },
    syncPostgresProjectionTablesWith: async () => { events.push("projection-pre"); },
    getPostgresClient: () => ({ begin: callback => callback(sql) }),
    writePostgresDatabaseWith: async (_, value, capability) => {
      events.push("final-write"); assert.equal(capability.previousRevision, 1);
      if (failWrite) throw new Error("synthetic failed full write");
      events.push("projection-final"); committed = structuredClone(value);
    }
  };
  vm.runInNewContext(ts.transpileModule(parts.map(node => node.getText(ast)).join("\n"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText + `\nexports.parts = {${names.join(",")}};`, context);
  return { ...context.exports.parts, events, sql, original, normalized: () => normalized, committed: () => committed };
}

test("generic JSON mutator keeps guards/overlay/auth sync and defers projections to its final full write", async () => {
  const state = fixture();
  const result = await state.mutateDatabase(database => {
    state.events.push("mutator"); database.lesson_progress.push({ user_id: "target", status: "completed" }); return "completed";
  });
  assert.equal(result, "completed");
  assert.deepEqual(state.events, ["guard", "activity-lock", "select-lock", "auth-pre", "mutator", "final-write", "projection-final"]);
  assert.equal(state.committed().lesson_progress[0].status, "completed");
  assert.deepEqual(state.original.lesson_progress, []);
});

test("default account/outbox locked normalization retains pre-mutation projection repair", async () => {
  const state = fixture(); await state.normalizeLockedPostgresState(state.sql);
  assert.deepEqual(state.events, ["select-lock", "auth-pre", "projection-pre"]);
  const ordinary = fixture(); await ordinary.readPostgresDatabaseForMutation(ordinary.sql, true);
  assert.deepEqual(ordinary.events, ["guard", "activity-lock", "select-lock", "auth-pre", "projection-pre"]);
});

test("incomplete state or failed mutator never reaches deferred final write", async () => {
  const incomplete = fixture({ incomplete: true }); let calls = 0;
  await assert.rejects(incomplete.mutateDatabase(() => { calls++; }), /snapshot is incomplete/);
  assert.equal(calls, 0); assert.equal(incomplete.events.includes("final-write"), false);
  const state = fixture();
  await assert.rejects(state.mutateDatabase(() => { throw new Error("synthetic failed mutator"); }), /failed mutator/);
  assert.equal(state.events.includes("final-write"), false); assert.equal(state.events.includes("projection-pre"), false);
  assert.equal(state.committed(), undefined);
});

test("failed final full write propagates without a success acknowledgement", async () => {
  const state = fixture({ failWrite: true });
  await assert.rejects(state.mutateDatabase(database => { database.lesson_progress.push({ status: "completed" }); }), /failed full write/);
  assert.equal(state.committed(), undefined); assert.equal(state.events.includes("projection-final"), false);
});
