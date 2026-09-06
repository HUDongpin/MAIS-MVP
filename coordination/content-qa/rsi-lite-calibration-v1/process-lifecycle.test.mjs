import assert from "node:assert/strict";
import test from "node:test";

import { ProcessTimeoutError, runBoundedProcess } from "./process-lifecycle.mjs";

test("bounded child process returns collected output after a normal exit", async () => {
  const result = await runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write('ok'); process.stderr.write('note')"],
    timeoutMilliseconds: 2_000,
    label: "normal-test-child"
  });
  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "ok");
  assert.equal(result.stderr, "note");
});

test("timeout escalates after grace, waits for exit, and leaves no live child", async () => {
  const started = Date.now();
  let timeoutError;
  try {
    await runBoundedProcess({
      executable: process.execPath,
      args: ["-e", "process.on('SIGTERM', () => {}); process.stdout.write('ready\\n'); setInterval(() => {}, 1000)"],
      readyPattern: "ready\n",
      startupTimeoutMilliseconds: 2_000,
      timeoutMilliseconds: 5,
      terminationGraceMilliseconds: 60,
      label: "ignores-term-test-child"
    });
    assert.fail("Expected the bounded process to time out.");
  } catch (error) {
    timeoutError = error;
  }

  assert.ok(timeoutError instanceof ProcessTimeoutError);
  assert.equal(timeoutError.timedOut, true);
  assert.equal(timeoutError.phase, "runtime");
  assert.equal(timeoutError.terminationEscalated, true);
  assert.equal(timeoutError.finalSignal, "SIGKILL");
  assert.match(timeoutError.stdout, /ready/);
  assert.ok(Number.isInteger(timeoutError.childPid) && timeoutError.childPid > 0);
  assert.ok(Date.now() - started < 2_000);
  assert.throws(() => process.kill(timeoutError.childPid, 0), (error) => error?.code === "ESRCH");
});

test("bounded child receives input and honors the caller-provided environment without parent secrets", async () => {
  const result = await runBoundedProcess({
    executable: process.execPath,
    args: ["-e", "let s=''; process.stdin.on('data', c => s += c); process.stdin.on('end', () => process.stdout.write(JSON.stringify({s, keys:Object.keys(process.env).sort()})))"],
    input: "fixture-input",
    options: { env: { LANG: "C" } },
    timeoutMilliseconds: 2_000,
    label: "input-test-child"
  });
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.s, "fixture-input");
  assert.ok(parsed.keys.includes("LANG"));
  assert.ok(parsed.keys.every((key) => key === "LANG" || key === "__CF_USER_TEXT_ENCODING"));
});
