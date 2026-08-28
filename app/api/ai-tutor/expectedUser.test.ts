import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { guardAiTutorExpectedUser } from "./expectedUser";

const authenticated = { user: { id: "student-a" } };

test("authenticated AI Tutor requests fail closed when expected identity is omitted", async () => {
  const response = guardAiTutorExpectedUser(
    authenticated,
    new Request("https://mais.test/api/ai-tutor/resolve", { method: "POST" }),
    { input: "Explain fractions" }
  );

  assert.ok(response);
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
});

test("authenticated AI Tutor requests accept matching header and body constraints", () => {
  const response = guardAiTutorExpectedUser(
    authenticated,
    new Request("https://mais.test/api/ai-tutor/resolve", {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "student-a" }
    }),
    { expectedUserId: "student-a", input: "Explain fractions" }
  );

  assert.equal(response, null);
});

test("authenticated AI Tutor requests reject a mismatching or internally conflicting constraint", () => {
  const mismatching = guardAiTutorExpectedUser(
    authenticated,
    new Request("https://mais.test/api/ai-tutor/voice", {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "student-b" }
    }),
    { expectedUserId: "student-b" }
  );
  assert.equal(mismatching?.status, 409);

  const conflicting = guardAiTutorExpectedUser(
    authenticated,
    new Request("https://mais.test/api/ai-tutor/speech", {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "student-a" }
    }),
    { expectedUserId: "student-b" }
  );
  assert.equal(conflicting?.status, 409);
});

test("guest AI Tutor chat keeps its existing registration flow without an expected identity", () => {
  const response = guardAiTutorExpectedUser(
    null,
    new Request("https://mais.test/api/ai-tutor/resolve", { method: "POST" }),
    { input: "Can I try Nova?" }
  );

  assert.equal(response, null);
});

test("all authenticated AI Tutor surfaces guard expected identity before account policy or writes", async () => {
  const routeRoot = join(process.cwd(), "app/api/ai-tutor");
  const [edge, resolver, classroomPolicy, speech, voice] = await Promise.all([
    readFile(join(routeRoot, "route.ts"), "utf8"),
    readFile(join(routeRoot, "resolve/route.ts"), "utf8"),
    readFile(join(routeRoot, "classroom-policy/route.ts"), "utf8"),
    readFile(join(routeRoot, "speech/route.ts"), "utf8"),
    readFile(join(routeRoot, "voice/route.ts"), "utf8")
  ]);

  assert.match(edge, /request\.headers\.get\("x-mais-expected-user-id"\)/);
  assert.match(edge, /headers\.set\("X-MAIS-Expected-User-Id", expectedUserId\)/);

  const resolverAuth = resolver.indexOf("authenticate: async (_admissionRequest, signal)");
  const resolverGuard = resolver.indexOf("guardAiTutorExpectedUser(authenticated, _admissionRequest, body)", resolverAuth);
  const resolverPolicy = resolver.indexOf("resolveStudentAiTutorPolicy(authenticated.user.id", resolverAuth);
  assert.ok(resolverAuth >= 0 && resolverGuard > resolverAuth && resolverPolicy > resolverGuard);

  for (const [name, source] of [
    ["classroom policy", classroomPolicy],
    ["speech", speech],
    ["voice", voice]
  ] as const) {
    const guard = source.indexOf("guardAiTutorExpectedUser(");
    const policy = source.indexOf("resolveStudentAiTutorPolicy(");
    assert.ok(guard >= 0, `${name} must enforce expected identity`);
    assert.ok(policy > guard, `${name} must enforce identity before classroom policy lookup`);
  }

  for (const [name, source] of [["speech", speech], ["voice", voice]] as const) {
    const guard = source.indexOf("guardAiTutorExpectedUser(");
    const rateLimit = source.indexOf("consumeAiCapabilityRateLimit(");
    assert.ok(rateLimit > guard, `${name} must enforce identity before consuming rate limits`);
  }
});
