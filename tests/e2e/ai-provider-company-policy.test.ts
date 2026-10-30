import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyTutorProviderPolicyProof } from "@/lib/server/tutorProviderPolicyProof";

type Case = {
  route: string;
  region: "US" | "HK" | "MAINLAND";
  role?: "student" | "teacher" | "admin";
  method?: "GET" | "POST";
  subjectRegion?: "US" | "HK" | null;
  classRegion?: "US" | "HK";
  noUsKey?: boolean;
  providerFailure?: boolean;
  image?: boolean;
  proofRegion?: "US" | "HK";
  foreignImage?: boolean;
  body?: Record<string, unknown>;
};

function executeRoute(input: Case) {
  const temporary = mkdtempSync(path.join(tmpdir(), "mais-provider-policy-"));
  const script = `
    import { mock } from "node:test";
    import { createHash } from "node:crypto";
    import { createRequire } from "node:module";
    const fixture = ${JSON.stringify(input)};
    const calls = [], sockets = [], events = [], unexpectedNetwork = [];
    const require = createRequire(import.meta.url);
    for (const name of ["node:http", "node:https"]) {
      const transport = require(name);
      for (const method of ["request", "get"]) transport[method] = () => { unexpectedNetwork.push(name + ":" + method); throw new Error("Unmocked network transport in fixture"); };
    }
    const authenticated = { user: {
      id: "fixture-user", name: "Fixture", role: fixture.role ?? "student", grade: "P3",
      curriculumTrack: fixture.region === "US" ? "US_CA_MATH" : fixture.region === "MAINLAND" ? "MAINLAND_PEP_HIGH" : "HK",
      curriculumProfile: { region: fixture.region, publisher: fixture.region === "US" ? "US_CA_MATH" : fixture.region === "MAINLAND" ? "MAINLAND_PEP" : "HK_UNITED_PRIME_MIA" },
      providerPolicyRegion: fixture.region
    }, settings: { language: "en", theme: "dark", selectedGrade: "P3" } };
    mock.module("@/lib/server/auth", { namedExports: {
      requireAuthenticatedUser: async () => authenticated,
      requireAiTutorAuthenticatedUser: async () => authenticated,
      canAccessTeacherArea: () => true,
      bodyExpectedUserConstraints: () => ["fixture-user"],
      expectedUserConstraintsFromRequest: () => ["fixture-user"],
      guardExpectedAuthenticatedUser: () => null
    } });
    const policy = { mode: "open", perStudentMinuteLimit: 30, perStudentHourLimit: 60 };
    mock.module("@/lib/server/userStore", { namedExports: {
      consumeAiCapabilityRateLimit: async () => ({ allowed: true, remaining: 20, resetAt: new Date(), retryAfterSeconds: 0 }),
      resolveStudentAiTutorPolicy: async () => policy,
      getAITutorTokenUsageSince: async () => 0,
      buildAITutorDatabaseContext: async () => ({ text: "", deterministicSummary: null, includedScopes: [], deniedScopes: [], subjectUserId: "fixture-subject", ...(Object.hasOwn(fixture, "subjectRegion") ? { providerPolicyRegion: fixture.subjectRegion } : {}) }),
      recordAiGovernanceEvent: async value => { events.push(value); },
      recordContentSafetyFlag: async value => { events.push({ safetyFlag: value }); },
      recordAITutorMessage: async () => {}, recordAITutorUsage: async () => {},
      getNovaLensPolicy: async () => ({ enabled: true, allowedRoles: ["student", "teacher", "parent", "admin"], enabledSurfaces: ["general"], maxSelectionLength: 1800, blockedPatterns: [] }),
      listNovaLensRunsForUser: async () => [], recordNovaLensRun: async () => ({ id: "fixture-run" }),
      getTeacherAssignments: async () => [],
      getTeacherClassDetailData: async () => ({ class: { id: "fixture-class", name: "Fixture Class", grade: "P3", curriculumProfile: { region: fixture.classRegion ?? fixture.region }, curriculumTrack: (fixture.classRegion ?? fixture.region) === "US" ? "US_CA_MATH" : "HK" }, students: [{ studentId: "fixture-student" }], groups: [] }),
      createTeacherAssessment: async () => ({ status: "not-found" }),
      createTeacherAssignment: async () => ({ status: "not-found" })
    } });
    class MockSocket { constructor(url) { sockets.push(String(url)); throw new Error("fixture WebSocket stop"); } }
    globalThis.WebSocket = MockSocket;
    mock.module("ws", { defaultExport: MockSocket });
    mock.module(require.resolve("ws"), { defaultExport: MockSocket });
    if (fixture.foreignImage) mock.module("@/lib/server/mediaObjectStore", { namedExports: {
      mediaObjectOwnerHash: value => createHash("sha256").update(value).digest("hex"),
      mediaObjectReferenceFromUnknown: () => ({ kind: "object-reference", objectKey: "ai-tutor-ocr/other/image.png", mimeType: "image/png", byteLength: 100, encrypted: true, scanStatus: "passed", retentionExpiresAt: new Date(Date.now() + 86400000).toISOString() }),
      readStoredMediaObject: async () => ({ status: "ok", metadata: { ownerHash: createHash("sha256").update("other-user").digest("hex"), mimeType: "image/png" }, bytes: Buffer.from("fixture image") })
    } });
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), redirect: init?.redirect, body: typeof init?.body === "string" ? init.body : "form-data" });
      if (fixture.providerFailure) return new Response("fixture failure", { status: 503 });
      if (String(url).includes("mathpix")) return Response.json({ text: "x+1", latex_styled: "x+1", confidence: 0.99 });
      if (String(url).includes("simpletex")) return Response.json({ status: true, res: { latex: "x+1", conf: 0.99 } });
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      if (body.input && !body.messages) return Response.json({ results: [{ flagged: false, categories: { violence: false } }] });
      return Response.json({ model: body.model, choices: [{ finish_reason: "stop", message: { content: "Try adding two and three. What total do you get?" } }], usage: { prompt_tokens: 10, completion_tokens: 12, total_tokens: 22 } });
    };
    const route = await import("./" + fixture.route);
    const body = { expectedUserId: "fixture-user", input: "Help me add 2 and 3.", text: "Two plus three is five.", audio: Buffer.alloc(320).toString("base64"), language: "en", grade: "P3", region: "HK", curriculumProfile: { region: "HK" }, context: { curriculumTrack: "HK", mode: "general", title: "Addition" }, ...fixture.body };
    if (fixture.proofRegion) {
      const { createTutorProviderPolicyProof } = await import("@/lib/server/tutorProviderPolicyProof");
      body.providerPolicyProof = createTutorProviderPolicyProof("fixture-user", body.text, fixture.proofRegion);
    }
    const method = fixture.method ?? "POST";
    let request;
    if (fixture.image) {
      const form = new FormData(); form.set("payload", JSON.stringify(body)); form.set("attachments", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCfcAAAAASUVORK5CYII=", "base64")], "fixture.png", { type: "image/png" }));
      request = new Request("http://localhost/fixture", { method, body: form });
    } else request = new Request("http://localhost/fixture", { method, headers: { "content-type": "application/json", "X-MAIS-Expected-User-Id": "fixture-user" }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
    const response = await route[method](request);
    const responseText = await response.text();
    process.stdout.write("RESULT_JSON:" + JSON.stringify({ status: response.status, body: JSON.parse(responseText), headers: Object.fromEntries(response.headers.entries()), calls, sockets, events, unexpectedNetwork }) + "\\n");
  `;
  try {
    const result = spawnSync(process.execPath, ["--no-warnings", "--experimental-test-module-mocks", "--import", "tsx", "--input-type=module", "-e", script], {
      cwd: process.cwd(), encoding: "utf8", timeout: 30_000,
      env: {
        PATH: process.env.PATH ?? "", HOME: temporary, TMPDIR: temporary,
        NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1", AUTH_SESSION_SECRET: "fixture-session-secret",
        HK_MATH_DB_DIR: temporary, HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_ENABLE_DEMO_USER: "false",
        QWEN_API_KEY: "fixture-qwen", QWEN_API_URL: "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions",
        QWEN_REALTIME_API_URL: "wss://dashscope-us.aliyuncs.com/api-ws/v1/realtime",
        QWEN_ASR_REALTIME_API_URL: "wss://dashscope-us.aliyuncs.com/api-ws/v1/realtime",
        DEEPINFRA_API_KEY: "fixture-deepinfra",
        OPENROUTER_API_KEY: input.noUsKey ? "" : "fixture-openrouter", OPENROUTER_MODEL: "openai/fixture",
        DEEPSEEK_API_KEY: "fixture-deepseek", AI_TUTOR_PREFERRED_TEXT_PROVIDER: "qwen",
        AI_TUTOR_PROVIDER_PROFILE: "runtime", AI_MEDIA_REQUIRE_ENCRYPTION: "false", AI_MEDIA_REQUIRE_PASSED_SCAN: "false",
        SIMPLETEX_UAT: "fixture-simpletex", SIMPLETEX_MAX_ATTEMPTS: "1", SIMPLETEX_RETRY_DELAY_MS: "0",
        MATHPIX_APP_ID: "fixture-mathpix", MATHPIX_APP_KEY: input.noUsKey ? "" : "fixture-mathpix",
        HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED: "true",
        TUTOR_MODERATION_API_URL: "https://api.deepseek.com/moderations", TUTOR_MODERATION_API_KEY: "fixture-moderation",
        EDUHK_LLM_BASE_URL: "https://eduhk-fixture.example", EDUHK_ITEM_GENERATE_APP_ID: "fixture-app", EDUHK_ITEM_GENERATE_API_KEY: "fixture-primary", EDUHK_ITEM_GENERATE_APP_ID_2: "fixture-app-2", EDUHK_ITEM_GENERATE_API_KEY_2: "fixture-secondary"
      }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const line = result.stdout.split("\n").find(l => l.startsWith("RESULT_JSON:"));
    assert.ok(line, result.stdout);
    const output = JSON.parse(line.slice("RESULT_JSON:".length));
    assert.deepEqual(output.unexpectedNetwork, [], "every outbound transport must be mocked");
    return output as {
      status: number; body: Record<string, any>; headers: Record<string, string>;
      calls: Array<{ url: string; redirect?: string; body: string }>; sockets: string[]; events: unknown[];
    };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

for (const route of ["app/api/ai-tutor/voice/route.ts", "app/api/ai-tutor/speech/route.ts", "app/api/lesson-audio/route.ts"]) {
  test(`US refuses the Alibaba capability before any network operation: ${route}`, () => {
    const result = executeRoute({ route, region: "US" });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "AI_PROVIDER_REGION_UNAVAILABLE");
    assert.deepEqual(result.calls, []); assert.deepEqual(result.sockets, []);
  });
}

test("HK and Mainland speech keep the configured Alibaba path", () => {
  for (const region of ["HK", "MAINLAND"] as const) {
    const result = executeRoute({ route: "app/api/ai-tutor/speech/route.ts", region });
    assert.equal(result.status, 502, "mock socket stops the accepted provider request");
    assert.equal(result.sockets.length, 1);
  }
});

test("a US-target reply cannot be read through Alibaba by an HK teacher", () => {
  const restricted = executeRoute({ route: "app/api/ai-tutor/voice/route.ts", region: "HK", role: "teacher", proofRegion: "US" });
  assert.equal(restricted.status, 503); assert.deepEqual(restricted.calls, []); assert.deepEqual(restricted.sockets, []);
  const own = executeRoute({ route: "app/api/ai-tutor/voice/route.ts", region: "HK", role: "teacher", proofRegion: "HK" });
  assert.equal(own.sockets.length, 1, `a valid HK reply retains its configured voice path: ${JSON.stringify(own)}`);
  const missing = executeRoute({ route: "app/api/ai-tutor/voice/route.ts", region: "HK", role: "teacher" });
  assert.deepEqual(missing.calls, []); assert.deepEqual(missing.sockets, []);
});

test("US tutor text and image ignore forged HK request context", () => {
  for (const image of [false, true]) {
    const result = executeRoute({ route: "app/api/ai-tutor/resolve/route.ts", region: "US", image });
    assert.equal(result.status, 200);
    assert.ok(result.calls.length > 0);
    assert.equal(typeof result.body.providerPolicyProof, "string");
    assert.ok(result.calls.every(c => new URL(c.url).hostname === "openrouter.ai" && c.redirect === "error"));
    for (const call of result.calls) {
      const payload = JSON.parse(call.body);
      assert.equal(payload.provider.allow_fallbacks, false);
      assert.ok(!payload.provider.only.includes("alibaba"));
    }
  }
});

test("US tutor failures and missing keys never fall back to Alibaba", () => {
  const failed = executeRoute({ route: "app/api/ai-tutor/resolve/route.ts", region: "US", providerFailure: true });
  assert.ok(failed.calls.length > 0);
  assert.ok(failed.calls.every(c => new URL(c.url).hostname === "openrouter.ai"));
  const keyless = executeRoute({ route: "app/api/ai-tutor/resolve/route.ts", region: "US", noUsKey: true });
  assert.deepEqual(keyless.calls, []);
});

test("an HK teacher's authorized US target keeps the restrictive tutor policy", () => {
  const result = executeRoute({ route: "app/api/ai-tutor/resolve/route.ts", region: "HK", role: "teacher", subjectRegion: "US", body: { targetStudentId: "fixture-subject" } });
  assert.ok(result.calls.length > 0);
  assert.ok(result.calls.every(c => new URL(c.url).hostname === "openrouter.ai"));
});

test("US OCR skips SimpleTex and uses the allowed Mathpix endpoint", () => {
  const result = executeRoute({ route: "app/api/handwriting-recognition/route.ts", region: "US", body: {
    strokes: [{ tool: "pen", points: [{ x: 5, y: 5 }, { x: 30, y: 35 }, { x: 8, y: 50 }] }],
    imageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCfcAAAAASUVORK5CYII="
  } });
  assert.equal(result.status, 200); assert.equal(result.body.provider, "mathpix");
  assert.deepEqual(result.calls.map(c => new URL(c.url).hostname), ["api.mathpix.com"]);
  assert.equal(result.calls[0].redirect, "error");
});

test("another owner's stored OCR image cannot inherit an HK admin's unrestricted routing", () => {
  const result = executeRoute({ route: "app/api/handwriting-recognition/route.ts", region: "HK", role: "admin", foreignImage: true, body: { imageObject: { objectKey: "ai-tutor-ocr/other/image.png" } } });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.ok(result.calls.length > 0);
  assert.ok(result.calls.every(call => new URL(call.url).hostname === "openrouter.ai"));
});

test("client-supplied old history is not forwarded without server policy provenance", () => {
  const result = executeRoute({ route: "app/api/ai-tutor/resolve/route.ts", region: "HK", body: { messages: [{ role: "tutor", content: "PRIVATE_OLD_US_CONTEXT" }] } });
  assert.ok(result.calls.length > 0);
  assert.ok(result.calls.every(call => !call.body.includes("PRIVATE_OLD_US_CONTEXT")));
});

test("US Nova Lens uses an allowed service and HK retains DeepSeek", () => {
  for (const region of ["US", "HK"] as const) {
    const result = executeRoute({ route: "app/api/nova-lens/runs/route.ts", region, body: { selectedText: "two plus three", action: "explain", surface: "general" } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.calls.map(c => new URL(c.url).hostname), [region === "US" ? "openrouter.ai" : "api.deepseek.com"]);
  }
});

test("Nova Lens signs the final region for read-aloud, including a restricted subject", () => {
  const previous = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "fixture-session-secret";
  try {
    for (const region of ["US", "HK", "MAINLAND"] as const) {
      const result = executeRoute({ route: "app/api/nova-lens/runs/route.ts", region, body: { selectedText: "two plus three", action: "explain", surface: "general" } });
      assert.equal(result.status, 200);
      assert.equal(verifyTutorProviderPolicyProof("fixture-user", result.body.reply, result.body.providerPolicyProof), region);
    }
    const targeted = executeRoute({ route: "app/api/nova-lens/runs/route.ts", region: "HK", role: "teacher", subjectRegion: "US", body: { selectedText: "two plus three", action: "explain", surface: "general" } });
    assert.equal(verifyTutorProviderPolicyProof("fixture-user", targeted.body.reply, targeted.body.providerPolicyProof), "US");
  } finally { previous === undefined ? delete process.env.AUTH_SESSION_SECRET : process.env.AUTH_SESSION_SECRET = previous; }
});

test("teacher generation binds an authorized US class even for an HK teacher", () => {
  const result = executeRoute({ route: "app/api/teacher/assignments/route.ts", region: "HK", role: "teacher", classRegion: "US", providerFailure: true,
    body: { llmGenerate: true, classId: "fixture-class", title: "Addition", contentType: "practice" } });
  assert.equal(result.status, 502);
  assert.deepEqual(result.calls.map(c => new URL(c.url).hostname), ["openrouter.ai"]);
});

test("US EdUHK proxy generation sends neither of its two requests", () => {
  const result = executeRoute({ route: "app/api/teacher/question-generation/route.ts", region: "US", role: "teacher", body: { prompt: "Create an addition question." } });
  assert.equal(result.status, 503); assert.deepEqual(result.calls, []);
});

test("capability status is private and differs by authenticated region", () => {
  const us = executeRoute({ route: "app/api/ai-tutor/status/route.ts", region: "US", method: "GET" });
  const hk = executeRoute({ route: "app/api/ai-tutor/status/route.ts", region: "HK", method: "GET" });
  assert.equal(us.body.voice.configured, false); assert.equal(hk.body.voice.configured, true);
  assert.equal(us.body.text.provider, "openrouter"); assert.equal(hk.body.text.provider, "qwen");
  for (const result of [us, hk]) {
    assert.equal(result.headers["cache-control"], "private, no-store");
    assert.equal(result.headers["cdn-cache-control"], undefined);
    assert.deepEqual(result.calls, []);
  }
});
