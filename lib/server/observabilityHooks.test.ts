import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createContext, Script } from "node:vm";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";
import { NextResponse } from "next/server";
import { buildErrorMonitorEvent, type ErrorMonitorContext } from "./errorMonitor";
import { classifyObservedError } from "../observability/errorPolicy";

type Capture = { error: unknown; context: ErrorMonitorContext };
type Callable = (...args: any[]) => any;
const sourceRoot = process.cwd();

// Execute the real module, or named real AST declarations for the two large modules.
// Imports are closed-world mocks: loading storage, a provider or the network is an error.
async function loadBoundary(relativePath: string, options: {
  names?: string[]; globals?: Record<string, unknown>; capture?: Callable;
} = {}) {
  const original = await readFile(path.join(sourceRoot, relativePath), "utf8");
  let source = original;
  if (options.names) {
    const ast = ts.createSourceFile(relativePath, original, ts.ScriptTarget.Latest, true);
    const selected = options.names.map((name) => {
      const matches = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
      assert.equal(matches.length, 1, `exact real declaration required: ${name}`);
      return matches[0].getText(ast);
    });
    source = `${selected.join("\n")}\nmodule.exports = { ${options.names.join(", ")} };`;
  }
  const captures: Capture[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const capture = options.capture ?? ((error: unknown, context: ErrorMonitorContext) => captures.push({ error, context }));
  const modules: Record<string, unknown> = {
    "next/server": { NextResponse }, "crypto": { createHash },
    "@/lib/server/rateLimit": { consumeInMemoryRateLimit: () => { throw new Error("unexpected rate-limit call"); } },
    "@/lib/server/errorMonitor": { captureServerError: capture },
    "@/lib/observability/errorPolicy": { classifyObservedError }
  };
  const exports = {};
  const context = createContext({
    exports, module: { exports },
    require: (id: string) => { assert.ok(Object.hasOwn(modules, id), `unmocked import: ${id}`); return modules[id]; },
    Request, Response, Headers, NextResponse, ReadableStream, TextEncoder, TextDecoder, AbortController,
    URL, Date, JSON, Promise, console: { error() {}, info() {} }, process: { env: {} },
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    captureServerError: capture, classifyObservedError,
    fetch: () => { throw new Error("unexpected network call"); },
    ...options.globals
  });
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  new Script(javascript, { filename: relativePath }).runInContext(context);
  return { api: (context.module as { exports: Record<string, Callable> }).exports, captures, timers };
}

async function drainUntil(check: () => boolean) {
  for (let index = 0; index < 100; index += 1) {
    if (check()) return;
    await Promise.resolve();
  }
  assert.ok(check(), "mock operation did not reach its bounded checkpoint");
}

function request(stream = false, signal?: AbortSignal) {
  return new Request("https://mais.test/api/ai-tutor", {
    method: "POST", body: JSON.stringify({ input: "synthetic input" }), signal,
    headers: { Accept: stream ? "text/event-stream" : "application/json", "X-MAIS-Expected-User-Id": "synthetic-student" }
  });
}
function finalEvents(text: string) {
  return [...text.matchAll(/event: final\ndata: (.+)\n\n/g)].map((match) => JSON.parse(match[1]));
}
function privateHeaders(response: Response) {
  for (const name of ["Cache-Control", "CDN-Cache-Control", "Vercel-CDN-Cache-Control"]) {
    assert.equal(response.headers.get(name), "private, no-store");
  }
}

test("auth internal failures capture all nine static routes without losing private responses", async () => {
  const boundary = await loadBoundary("lib/server/authRouteGuards.ts");
  const routes = {
    "auth-me": "/api/me", "auth-password-change": "/api/auth/password-change",
    "auth-login": "/api/auth/login", "auth-logout-all": "/api/auth/logout-all",
    "auth-password-reset-request": "/api/auth/password-reset/request",
    "auth-password-reset-confirm": "/api/auth/password-reset/confirm",
    "auth-register": "/api/auth/register", "auth-session-state": "/api/auth/session-state",
    "auth-logout": "/api/auth/logout"
  };
  const failure = Object.assign(new Error("private pupil text"), { code: "CONNECT_TIMEOUT" });
  for (const [label, route] of Object.entries(routes)) {
    const response = await boundary.api.withAuthRouteJsonBoundary(label, async () => { throw failure; });
    assert.equal(response.status, 503); privateHeaders(response);
    assert.deepEqual(await response.json(), {
      code: "auth-service-unavailable", error: "Authentication service is temporarily unavailable. Please try again."
    });
    assert.equal(boundary.captures.at(-1)?.context.route, route);
    assert.equal(boundary.captures.at(-1)?.error, failure);
    const event = buildErrorMonitorEvent(failure, boundary.captures.at(-1)!.context);
    assert.equal(event.tags.route, route);
    assert.equal(event.tags.status, "503");
    assert.doesNotMatch(JSON.stringify(event), /private pupil/);
  }
  assert.equal(boundary.captures.length, 9);
});

test("auth returned expected outcomes and unknown labels never widen monitoring", async () => {
  const boundary = await loadBoundary("lib/server/authRouteGuards.ts");
  for (const status of [200, 400, 401, 403, 409, 429]) {
    const response = await boundary.api.withAuthRouteJsonBoundary("auth-login", async () => NextResponse.json({ status }, { status }));
    assert.equal(response.status, status); privateHeaders(response);
  }
  assert.equal(boundary.captures.length, 0);
  await boundary.api.withAuthRouteJsonBoundary("private-person/identifier", async () => { throw new Error("synthetic"); });
  assert.equal(boundary.captures[0]?.context.route, "unknown");
});

for (const stream of [false, true]) {
  test(`edge ${stream ? "SSE" : "buffered"} active transport rejection captures logical503`, async () => {
    const failure = new Error("private transport payload");
    const boundary = await loadBoundary("app/api/ai-tutor/route.ts", {
      globals: { fetch: async () => { throw failure; } }
    });
    const response = await boundary.api.POST(request(stream));
    if (stream) {
      assert.equal(response.status, 200);
      const text = await response.text();
      assert.equal(finalEvents(text).length, 1);
      assert.equal(finalEvents(text)[0].status, 503);
      assert.equal(finalEvents(text)[0].ok, false);
      assert.doesNotMatch(text, /provider-start/);
    } else { assert.equal(response.status, 503); assert.equal(response.headers.get("Cache-Control"), "private, no-store"); }
    assert.equal(boundary.captures.length, 1);
    assert.equal(boundary.captures[0].error, failure);
    assert.equal(boundary.captures[0].context.status, 503);
    assert.equal(boundary.captures[0].context.tags?.phase, stream ? "stream" : "buffered");
    assert.equal(boundary.timers.size, 0);
  });
}

test("edge forwards expected identity and returned statuses without new captures", async () => {
  for (const stream of [false, true]) for (const status of [400, 401, 403, 409, 429, 503]) {
    const boundary = await loadBoundary("app/api/ai-tutor/route.ts", { globals: {
      fetch: async (_url: URL, init: RequestInit) => {
        assert.equal(new Headers(init.headers).get("X-MAIS-Expected-User-Id"), "synthetic-student");
        assert.equal(init.cache, "no-store");
        return Response.json({ error: "synthetic expected outcome" }, { status });
      }
    } });
    const response = await boundary.api.POST(request(stream));
    const observedStatus = stream ? finalEvents(await response.text())[0].status : response.status;
    assert.equal(observedStatus, status); assert.equal(boundary.captures.length, 0);
  }
});

function resolverGlobals(handle: Callable) {
  return {
    handleAITutorPost: handle,
    wantsAITutorEventStream: (req: Request) => req.headers.get("accept") === "text/event-stream",
    resolveAITutorTotalDeadlineMs: () => 8000,
    encodeAITutorSSE: (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    buildDeadlineTutorFallbackBody: () => ({ reply: "synthetic deadline", mode: "deadline-fallback" }),
    buildUnexpectedTutorFallbackBody: () => ({ reply: "synthetic failure", mode: "unexpected-fallback" }),
    recordAITutorHardDeadlineTimeout: () => {}, redactedErrorKind: () => "redacted",
    readJsonResponseBody: (response: Response) => response.json()
  };
}
async function resolver(handle: Callable, capture?: Callable) {
  return loadBoundary("app/api/ai-tutor/resolve/route.ts", {
    names: ["streamAITutorPost", "POST"], globals: resolverGlobals(handle), capture
  });
}

for (const stream of [false, true]) {
  test(`resolver ${stream ? "SSE" : "buffered"} unexpected rejection captures current final status`, async () => {
    const failure = new Error("private resolver payload");
    const boundary = await resolver(async () => { throw failure; });
    const response = await boundary.api.POST(request(stream));
    const status = stream ? finalEvents(await response.text())[0].status : response.status;
    assert.equal(status, stream ? 500 : 503);
    assert.equal(boundary.captures.length, 1);
    assert.equal(boundary.captures[0].context.status, status);
    assert.equal(boundary.captures[0].context.tags?.phase, stream ? "stream" : "buffered");
    assert.equal(boundary.captures[0].error, failure);
    assert.ok(Number.isFinite(boundary.captures[0].context.extra?.durationMs));
    assert.equal(boundary.timers.size, 0);
  });
}

test("resolver returned admission and identity outcomes do not become uncaught captures", async () => {
  for (const stream of [false, true]) for (const status of [200, 400, 403, 409, 429, 503]) {
    const boundary = await resolver(async () => Response.json({ status }, { status }));
    const response = await boundary.api.POST(request(stream));
    assert.equal(stream ? finalEvents(await response.text())[0].status : response.status, status);
    assert.equal(boundary.captures.length, 0);
  }
});

for (const kind of ["edge", "resolver"] as const) {
  test(`${kind} pre-aborted streams never enter work or capture`, async () => {
    let entered = false;
    const handle = async () => { entered = true; throw new Error("must not run"); };
    const boundary = kind === "edge" ? await loadBoundary("app/api/ai-tutor/route.ts", { globals: { fetch: handle } }) : await resolver(handle);
    const incoming = new AbortController(); incoming.abort();
    const response = await boundary.api.POST(request(true, incoming.signal));
    assert.equal(await response.text(), "");
    assert.equal(entered, false); assert.equal(boundary.captures.length, 0);
    assert.equal(boundary.timers.size, 0);
  });
  for (const mode of ["incoming-abort", "consumer-cancel", "deadline"] as const) {
    test(`${kind} stream ${mode} suppresses late captures and closes once`, async () => {
      let entered = false; let workSignal: AbortSignal | undefined;
      let reject!: (error: unknown) => void;
      const pending = new Promise((_resolve, rejectPromise) => { reject = rejectPromise; });
      const handle = (_input: unknown, init: { signal: AbortSignal }) => { entered = true; workSignal = init.signal; return pending; };
      const boundary = kind === "edge"
        ? await loadBoundary("app/api/ai-tutor/route.ts", { globals: { fetch: handle } })
        : await resolver(handle);
      const incoming = new AbortController();
      const response = await boundary.api.POST(request(true, incoming.signal));
      const reader = response.body!.getReader();
      await reader.read();
      await drainUntil(() => entered);
      if (mode === "incoming-abort") incoming.abort();
      else if (mode === "consumer-cancel") await reader.cancel();
      else { assert.equal(boundary.timers.size, 1); [...boundary.timers.values()][0](); }
      assert.equal(workSignal?.aborted, true);
      reject(Object.assign(new Error("synthetic late rejection"), { name: "AbortError" }));
      await drainUntil(() => boundary.timers.size === 0);
      const chunks: string[] = [];
      for (;;) { const next = await reader.read(); if (next.done) break; chunks.push(new TextDecoder().decode(next.value)); }
      const finals = finalEvents(chunks.join(""));
      assert.equal(finals.length, mode === "deadline" ? 1 : 0);
      if (mode === "deadline") assert.equal(finals[0].status, 503);
      assert.equal(boundary.captures.length, 0);
    });
  }
  test(`${kind} buffered cancellation and deadline keep fallback without captures`, async () => {
    for (const deadline of [false, true]) {
      let entered = false; let signal: AbortSignal | undefined;
      const handle = (_input: unknown, init: { signal: AbortSignal }) => {
        entered = true; signal = init.signal;
        return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("synthetic abort")), { once: true }));
      };
      const boundary = kind === "edge" ? await loadBoundary("app/api/ai-tutor/route.ts", { globals: { fetch: handle } }) : await resolver(handle);
      const incoming = new AbortController();
      const responsePromise = boundary.api.POST(request(false, incoming.signal));
      await drainUntil(() => entered);
      if (deadline) [...boundary.timers.values()][0](); else incoming.abort();
      const response = await responsePromise;
      assert.equal(signal?.aborted, true); assert.equal(response.status, 503);
      assert.equal(boundary.captures.length, 0); assert.equal(boundary.timers.size, 0);
    }
  });
}

async function writer(failAt?: string, capture?: Callable, invalid?: "returning" | "final") {
  const calls: string[] = [];
  const failure = Object.assign(new Error("private SQL payload"), { code: "57014" });
  const step = (name: string) => { calls.push(name); if (name === failAt) throw failure; };
  const sql = Object.assign(async (strings: TemplateStringsArray) => {
    const query = strings.join("?");
    if (/UPDATE public.app_state/.test(query)) {
      assert.doesNotMatch(query, /INSERT|ON CONFLICT/);
      assert.match(query, /state\.revision = \?/);
      assert.match(query, /state\.tenant_id = \?/);
      step("update"); return invalid === "returning" ? [] : [{ payload: {}, revision: 8, state_identity_matches: true, payload_matches: true, revision_matches: true }];
    }
    assert.match(query, /postgres_storage_full_writer_final_state/);
    step("reread"); return [{ revision: 8, payload_matches: invalid !== "final" }];
  }, { json: (value: unknown) => value });
  const boundary = await loadBoundary("lib/server/userStore.ts", {
    names: ["writePostgresDatabaseWith"], capture, globals: {
      recordPostgresFullWriterTestStage() {}, installPostgresFullWriterFaultForIntegrationTest: async () => {},
      databaseIndexCache: new WeakMap(), postgresDatabasePayload: (db: unknown) => db,
      stateRecordId: "synthetic", stateTenantId: "synthetic", stateKind: "synthetic", schemaVersion: 1,
      safePostgresRevision: (value: unknown) => Number.isSafeInteger(value) ? value : null,
      validateCompletePostgresStorageSnapshot: () => step("validate"),
      applyPostgresFullWriterPostReturningDriftForIntegrationTest: async () => {},
      syncPostgresHotAuthTablesWith: async () => step("hot-auth"),
      syncPostgresProjectionTablesWith: async () => step("projections"),
      advancePostgresStorageReadinessAfterMutation: async () => step("marker")
    }
  });
  return { ...boundary, calls, failure, run: () => boundary.api.writePostgresDatabaseWith(sql, {}, { previousRevision: 7 }) };
}

for (const invalid of ["returning", "final"] as const) {
  test(`strict writer ${invalid} attestation failure is preserved and blocks later stages`, async () => {
    const boundary = await writer(undefined, undefined, invalid);
    let original: unknown;
    await assert.rejects(boundary.run(), (error) => {
      original = error;
      assert.match(String(error), /Postgres storage readiness is unavailable/);
      return true;
    });
    assert.equal(boundary.captures.length, 1);
    assert.equal(boundary.captures[0].error, original);
    assert.equal(boundary.calls.at(-1), invalid === "returning" ? "update" : "reread");
    assert.ok(!boundary.calls.includes("marker"));
  });
}

test("capture promises are not awaited by the six product boundaries", async () => {
  let calls = 0;
  const capture = () => { calls += 1; return new Promise(() => {}); };
  const auth = await loadBoundary("lib/server/authRouteGuards.ts", { capture });
  assert.equal((await auth.api.withAuthRouteJsonBoundary("auth-login", async () => { throw new Error("fixture"); })).status, 503);
  for (const stream of [false, true]) {
    for (const boundary of [
      await loadBoundary("app/api/ai-tutor/route.ts", { capture, globals: { fetch: async () => { throw new Error("fixture"); } } }),
      await resolver(async () => { throw new Error("fixture"); }, capture)
    ]) {
      const response = await boundary.api.POST(request(stream));
      if (stream) assert.equal(finalEvents(await response.text()).length, 1);
      else assert.equal(response.status, 503);
    }
  }
  const store = await writer("update", capture);
  await assert.rejects(store.run(), (error) => error === store.failure);
  assert.equal(calls, 6);
});
test("strict full writer success keeps exact operation order and emits no capture", async () => {
  const boundary = await writer(); await boundary.run();
  assert.deepEqual(boundary.calls, ["update", "validate", "hot-auth", "projections", "reread", "marker"]);
  assert.equal(boundary.captures.length, 0);
});
for (const stage of ["update", "validate", "hot-auth", "projections", "reread", "marker"]) {
  test(`strict full writer ${stage} failure captures once and rethrows the same object`, async () => {
    const boundary = await writer(stage);
    await assert.rejects(boundary.run(), (error) => error === boundary.failure);
    assert.equal(boundary.calls.at(-1), stage);
    assert.equal(boundary.captures.length, 1);
    assert.equal(boundary.captures[0].error, boundary.failure);
    assert.equal(boundary.captures[0].context.extra?.operation, "app_state-update");
    const event = buildErrorMonitorEvent(boundary.failure, boundary.captures[0].context);
    assert.equal(event.tags.kind, "postgres-statement-timeout");
    assert.doesNotMatch(JSON.stringify(event), /private SQL/);
  });
}

test("a throwing capture cannot replace auth, tutor or original writer failures", async () => {
  const capture = () => { throw new Error("synthetic observer failure"); };
  const auth = await loadBoundary("lib/server/authRouteGuards.ts", { capture });
  const response = await auth.api.withAuthRouteJsonBoundary("auth-login", async () => { throw new Error("synthetic auth failure"); });
  assert.equal(response.status, 503); privateHeaders(response);
  for (const stream of [false, true]) {
    const edge = await loadBoundary("app/api/ai-tutor/route.ts", { capture, globals: { fetch: async () => { throw new Error("synthetic transport"); } } });
    const node = await resolver(async () => { throw new Error("synthetic resolver"); }, capture);
    for (const [boundary, expected] of [[edge, 503], [node, stream ? 500 : 503]] as const) {
      const result = await boundary.api.POST(request(stream));
      assert.equal(stream ? finalEvents(await result.text())[0].status : result.status, expected);
    }
  }
  const store = await writer("update", capture);
  await assert.rejects(store.run(), (error) => error === store.failure);
});
