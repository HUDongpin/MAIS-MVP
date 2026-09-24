import assert from "node:assert/strict";
import test from "node:test";
import { clientErrorFromReport, normalizeClientErrorReport } from "./clientErrorReport";
import { buildErrorMonitorEvent } from "./errorMonitor";

test("browser report retains its failure category and route family, not dynamic values", () => {
  assert.deepEqual(normalizeClientErrorReport({ name: "ChunkLoadError", message: "Loading chunk 42 failed private text", route: "/lesson/private-slug", source: "window.onerror", stack: "private stack" }), {
    name: "ChunkLoadError", message: "chunk-load-failed", route: "/lesson/[path]", source: "window.onerror", stack: ""
  });
});
test("non-object reports are rejected", () => {
  for (const input of [null, "private", [], 42, true]) assert.equal(normalizeClientErrorReport(input), null);
});
test("client source and error names use fixed enums", () => {
  const report = normalizeClientErrorReport({ name: "privateAlias", source: "datastore" });
  assert.equal(report?.name, "Error"); assert.equal(report?.source, "client");
  assert.equal(normalizeClientErrorReport({ source: "global-error-boundary" })?.source, "global-error-boundary");
});
test("absolute URLs and unknown routes do not become monitor transactions", () => {
  for (const route of ["https://private.example/x", "javascript:private", "/private/x", "private"]) assert.equal(normalizeClientErrorReport({ route })?.route, "unknown");
  assert.equal(normalizeClientErrorReport({ route: "/api/auth/login?private=private#private" })?.route, "/api/auth/login");
});
test("all recognized prefixes reduce to a bounded category without a free-text suffix", () => {
  for (const prefix of ["Error: ", "Failed to fetch ", "Cannot read properties ", "Minified React error #418 ", "Timeout ", "Loading chunk 1 failed "]) {
    const report = normalizeClientErrorReport({ message: prefix + "private learner note" });
    assert.ok(report); assert.doesNotMatch(report.message, /private|learner/); assert.ok(report.message.length < 40);
  }
});
test("oversized input cannot enlarge the wire report", () => {
  const report = normalizeClientErrorReport({ message: "Failed to fetch " + "x".repeat(50_000), route: "/" + "x".repeat(50_000), stack: "x".repeat(50_000) });
  assert.ok(report); assert.ok(JSON.stringify(report).length < 200); assert.equal(report.stack, "");
});
test("normalization is idempotent and rebuilding Error does not add a runtime stack", () => {
  const report = normalizeClientErrorReport({ message: "Failed to fetch", route: "/teacher/private", source: "client" });
  assert.ok(report); assert.deepEqual(normalizeClientErrorReport(report), report);
  assert.equal(clientErrorFromReport(report).stack, undefined);
});
test("malicious accessors cannot throw out of client normalization", () => {
  const report = normalizeClientErrorReport({ get name() { throw new Error("private"); } });
  assert.equal(report, null);
});
test("client reports cannot assert server scope or arbitrary event metadata", () => {
  const report = normalizeClientErrorReport({ message: "private", scope: "datastore", name: "PostgresError", source: "datastore", route: "/private", extra: { private: "private" } });
  assert.ok(report);
  const event = buildErrorMonitorEvent(clientErrorFromReport(report), { scope: "client", route: report.route, kind: report.source });
  assert.equal(event.scope, "client"); assert.equal(event.tags.route, "unknown"); assert.doesNotMatch(JSON.stringify(event), /private|PostgresError/);
});
