import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClientErrorReport, clientErrorFromReport } from "../server/clientErrorReport";
import { buildErrorMonitorEvent } from "../server/errorMonitor";

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
