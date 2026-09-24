import assert from "node:assert/strict";
import test from "node:test";
import { reportClientErrorPayload } from "../../components/observability/ClientErrorReporter";

test("the browser transport strips sensitive values before its first same-origin POST", async () => {
  const previous = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = async (_url, init) => { bodies.push(String(init?.body)); return new Response(null, { status: 204 }); };
  try {
    reportClientErrorPayload({ name: "privateAlias", message: "Error: private learner note", route: "/teacher/private", stack: "private frame", source: "window.onerror" });
    assert.equal(bodies.length, 1);
    assert.doesNotMatch(bodies[0], /private|learner|frame/);
  } finally { globalThis.fetch = previous; }
});
