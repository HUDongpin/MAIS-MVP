import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClientErrorReport, clientErrorFromReport } from "../server/clientErrorReport";
import { buildErrorMonitorEvent, sendErrorMonitorEvent } from "../server/errorMonitor";
import { classifyObservedError } from "./errorPolicy";

test("browser runtime prefixes never preserve arbitrary error text or identity paths", () => {
  for (const prefix of ["", "Error: ", "failed to fetch ", "cannot read properties ", "timeout "]) {
    const report = normalizeClientErrorReport({
      name: "privateLearnerAlias", message: `${prefix}the pupil shared a private draft`,
      route: "/teacher/students/private-learner", source: "unhandledrejection",
      stack: "Error\n at privateLearnerAlias (https://example.test/student/private-learner:1:2)"
    });
    assert.ok(report);
    const event = buildErrorMonitorEvent(clientErrorFromReport(report), {
      scope: "client", route: report.route, kind: report.source
    });
    assert.doesNotMatch(JSON.stringify({ report, event }), /private|shared a|pupil|example\.test/i);
    assert.equal(event.scope, "client");
  }
});

test("server capture emits classification and bounded numeric facts, never arbitrary values", () => {
  const error = new Error("Error: the pupil shared a private draft");
  error.name = "privateLearnerAlias";
  error.stack = "Error\n at privateLearnerAlias (/student/private-learner:1:2)";
  const event = buildErrorMonitorEvent(error, {
    scope: "api-route", route: "/api/auth/login", kind: "private-class-name",
    tags: { source: "private-class-name", runtime: "nodejs" },
    extra: { durationMs: 12, operation: "private-class-name", stackHead: "private-class-name" }
  });
  assert.doesNotMatch(JSON.stringify(event), /private|shared a|pupil/i);
  assert.equal(event.tags.route, "/api/auth/login");
  assert.equal(event.extra.durationMs, 12);
});

test("observation accepts only the four additional static auth endpoints", () => {
  for (const route of ["/api/me", "/api/auth/password-change", "/api/auth/password-reset/request", "/api/auth/password-reset/confirm"]) {
    const event = buildErrorMonitorEvent(new Error("synthetic"), { scope: "auth-route", route });
    assert.equal(event.tags.route, route);
    for (const untrusted of [`${route}/private-learner`, `${route}?user=private-learner`, `https://private-learner.test${route}`]) {
      const scrubbed = buildErrorMonitorEvent(new Error("synthetic"), { scope: "auth-route", route: untrusted });
      assert.doesNotMatch(JSON.stringify(scrubbed), /private-learner/);
    }
  }
});

test("datastore hook classifications remain fixed through actual mocked transport bytes", async () => {
  for (const [code, kind] of [["CONNECT_TIMEOUT", "postgres-connect-timeout"], ["57014", "postgres-statement-timeout"], ["ECONNRESET", "postgres-connection"], ["private-sql-code", "unhandled-error"]]) {
    const error = Object.assign(new Error("private pupil draft postgres://private-user:private-password@private-host/db"), { code });
    error.name = "private-person";
    error.stack = "/private/person/session";
    const event = buildErrorMonitorEvent(error, {
      scope: "datastore", route: "userStore.writePostgresDatabase", kind: classifyObservedError(error),
      tags: { storage: "postgres" }, extra: { operation: "app_state-update", durationMs: 4 }
    });
    assert.equal(event.tags.kind, kind);
    let sends = 0;
    const result = await sendErrorMonitorEvent({
      event, env: { ERROR_MONITOR_WEBHOOK_URL: "https://sink.example.test" },
      rateLimitKey: "o3-private-wire-fixture",
      fetchImpl: async (_url, init) => {
        sends += 1;
        const bytes = String(init?.body);
        assert.doesNotMatch(bytes, /private|pupil|draft/);
        assert.match(bytes, /app_state-update/);
        assert.match(bytes, new RegExp(kind));
        return new Response(null, { status: 204 });
      }
    });
    assert.equal(result.status, "sent"); assert.equal(sends, 1);
  }
});
