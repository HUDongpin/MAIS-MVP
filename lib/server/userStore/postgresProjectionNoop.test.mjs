import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Low-space contracts exercise the authored synchronizer, without pretending
// to execute PostgreSQL's null/JSONB semantics. Native controls are in
// studentActivityPostgresIntegration.test.mjs and require its guarded fixture.
const source = readFileSync(new URL("../userStore.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("userStore.ts", source, ts.ScriptTarget.Latest, true);
const names = ["postgresProjectionRecord", "postgresBulkInsertBatchSize", "upsertPostgresProjectionRows",
  "deleteMissingPostgresProjectionRows", "deleteMissingPostgresProjectionCompositeRows", "syncPostgresProjectionTablesWith"];
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(functions.length, names.length);
const variables = ast.statements.flatMap(node => ts.isVariableStatement(node)
  ? node.declarationList.declarations.filter(item => ["maxPostgresParametersPerStatement", "projectionCompositeKey"].includes(item.name.getText(ast))) : []);
assert.equal(variables.length, 2);
const sync = functions.find(node => node.name.text === "syncPostgresProjectionTablesWith");
function visit(node, callback) { callback(node); ts.forEachChild(node, child => visit(child, callback)); }
const queries = new Map(), keys = new Set();
visit(sync, node => {
  if (ts.isTaggedTemplateExpression(node)) {
    const text = node.template.getText(ast);
    const table = /INSERT INTO (projection_\w+)/.exec(text)?.[1];
    if (table) queries.set(table, text);
  }
  if (ts.isPropertyAccessExpression(node) && node.expression.getText(ast) === "database") keys.add(node.name.text);
});
function recorder(enabled = true) {
  const calls = [];
  const sql = (strings, ...values) => {
    if (!Array.isArray(strings) || !Object.hasOwn(strings, "raw")) return { rows: strings, columns: values };
    calls.push({ text: strings.join("?"), values }); return Promise.resolve([]);
  };
  sql.json = value => ({ json: value });
  sql.unsafe = (text, values = []) => { calls.push({ text, values }); return Promise.resolve([]); };
  const context = { exports: {}, postgresProjectionTablesShadowSyncEnabled: () => enabled, hasAuthorityInstallation: async () => false,
    retiredAuthorityProjection: () => false };
  vm.runInNewContext(ts.transpileModule(functions.map(node => node.getText(ast))
    .concat(variables.map(node => `const ${node.getText(ast)};`)).join("\n"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText + "\nexports.sync = syncPostgresProjectionTablesWith;", context);
  return { calls, sql, run: database => context.exports.sync(sql, database) };
}
const empty = () => Object.fromEntries([...keys].map(key => [key, []]));

for (const [table, columns, conflict] of [
  ["projection_questions", ["grade", "topic_id", "curriculum_track", "curriculum_region", "textbook_publisher", "record"], "id"],
  ["projection_lesson_progress", ["lesson_slug", "status", "updated_at", "record"], "user_id, topic_id"]
]) test(`${table} skips only a null-safe equality of every updated column`, () => {
  const query = queries.get(table);
  assert.ok(query);
  assert.ok(query.includes(`ON CONFLICT (${conflict}) DO UPDATE SET`));
  const updated = [...query.split("DO UPDATE SET")[1].split("WHERE")[0].matchAll(/(\w+)\s*=\s*excluded\.(\w+)/g)];
  assert.deepEqual(updated.map(match => match[1]), columns);
  assert.ok(updated.every(match => match[1] === match[2]));
  const predicate = query.match(/WHERE\s*\(([\s\S]*?)\)\s*IS DISTINCT FROM\s*\(([\s\S]*?)\)/);
  assert.ok(predicate, "missing null-safe no-op predicate");
  const target = predicate[1].split(",").map(item => item.trim());
  const incoming = predicate[2].split(",").map(item => item.trim());
  assert.deepEqual(target, columns.map(column => `${table}.${column}`));
  assert.deepEqual(incoming, columns.map(column => `excluded.${column}`));
});

test("authored synchronizer retains account composite keys, nulls, JSON records and scoped deletions", async () => {
  const fixture = empty();
  fixture.questions = [{ id: "q", grade: "P1", topic_id: "topic", curriculum_track: "HK", payload: { answer: "4" } }];
  fixture.lesson_progress = ["target", "other"].map(user_id => ({ user_id, topic_id: "same-topic", status: "in_progress", updated_at: "2026-10-02T00:00:00Z" }));
  const recorded = recorder(); await recorded.run(fixture);
  const question = recorded.calls.find(call => /INSERT INTO projection_questions/.test(call.text)).values[0];
  assert.deepEqual(Array.from(question.columns), ["id", "grade", "topic_id", "curriculum_track", "curriculum_region", "textbook_publisher", "record"]);
  assert.equal(question.rows[0].curriculum_region, null); assert.equal(question.rows[0].textbook_publisher, null);
  assert.equal(question.rows[0].record.json, fixture.questions[0]);
  const progress = recorded.calls.find(call => /INSERT INTO projection_lesson_progress/.test(call.text)).values[0];
  assert.deepEqual(Array.from(progress.rows, row => [row.user_id, row.topic_id, row.lesson_slug]), [["target", "same-topic", null], ["other", "same-topic", null]]);
  const deletion = recorded.calls.find(call => call.text.startsWith("DELETE FROM projection_lesson_progress"));
  assert.equal(deletion.text, "DELETE FROM projection_lesson_progress WHERE NOT (user_id || chr(31) || topic_id = ANY($1))");
  assert.deepEqual(Array.from(deletion.values[0]), ["target\x1fsame-topic", "other\x1fsame-topic"]);
  recorded.calls.length = 0; await recorded.run(empty());
  for (const table of ["projection_questions", "projection_lesson_progress"]) {
    assert.ok(recorded.calls.some(call => call.text === `DELETE FROM ${table}`));
    assert.equal(recorded.calls.some(call => call.text.includes(`INSERT INTO ${table}`)), false);
  }
});

test("authored synchronizer retains parameter batching and disabled-shadow behavior", async () => {
  const fixture = empty();
  fixture.questions = Array.from({ length: 9286 }, (_, id) => ({ id: `q-${id}`, grade: "P1", topic_id: "topic", curriculum_track: "HK" }));
  const recorded = recorder(); await recorded.run(fixture);
  const batches = recorded.calls.filter(call => /INSERT INTO projection_questions/.test(call.text)).map(call => call.values[0]);
  assert.deepEqual(batches.map(batch => batch.rows.length), [9285, 1]);
  assert.ok(batches.every(batch => batch.rows.length * batch.columns.length <= 65000));
  const disabled = recorder(false); await disabled.run(fixture); assert.equal(disabled.calls.length, 0);
});
