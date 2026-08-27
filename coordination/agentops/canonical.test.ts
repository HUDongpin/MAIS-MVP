import assert from "node:assert/strict";
import test from "node:test";

test("canonical JSON and digest are stable across recursive key ordering", async () => {
  const { canonicalJson, sha256Digest } = await import("./canonical");
  const first = { z: 1, a: { y: 2, x: [3, null, true] } };
  const reordered = { a: { x: [3, null, true], y: 2 }, z: 1 };

  assert.equal(
    canonicalJson(first),
    '{"a":{"x":[3,null,true],"y":2},"z":1}',
  );
  assert.equal(canonicalJson(first), canonicalJson(reordered));
  assert.equal(sha256Digest(first), sha256Digest(reordered));
});

test("canonical JSON rejects accessor-backed values without executing getters", async () => {
  const { canonicalJson } = await import("./canonical");
  let getterCalls = 0;
  const input: Record<string, unknown> = {};
  Object.defineProperty(input, "secret", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-run";
    },
  });

  assert.throws(() => canonicalJson(input), /data property|accessor/i);
  assert.equal(getterCalls, 0);
});

test("canonical JSON rejects accessor-backed array entries without reading them", async () => {
  const { canonicalJson } = await import("./canonical");
  let getterCalls = 0;
  const input: unknown[] = [];
  Object.defineProperty(input, 0, {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-run";
    },
  });
  input.length = 1;

  assert.throws(() => canonicalJson(input), /data property|accessor/i);
  assert.equal(getterCalls, 0);
});

test("canonical JSON rejects cycles, hidden fields, symbols, and array extras", async () => {
  const { canonicalJson } = await import("./canonical");

  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic), /cycle|circular/i);

  const hidden = { visible: true };
  Object.defineProperty(hidden, "hidden", {
    enumerable: false,
    value: "must-affect-or-fail",
  });
  assert.throws(() => canonicalJson(hidden), /enumerable|hidden|property/i);

  const symbolBacked = { visible: true } as Record<PropertyKey, unknown>;
  symbolBacked[Symbol("hidden")] = "must-affect-or-fail";
  assert.throws(() => canonicalJson(symbolBacked), /symbol|property/i);

  const arrayWithExtra = [1] as number[] & { command?: string };
  arrayWithExtra.command = "git push";
  assert.throws(() => canonicalJson(arrayWithExtra), /array|property|extra/i);
});

test("canonical JSON rejects prototype-sensitive keys", async () => {
  const { canonicalJson } = await import("./canonical");
  const input = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;

  assert.throws(() => canonicalJson(input), /unsafe|prototype|key/i);
});
