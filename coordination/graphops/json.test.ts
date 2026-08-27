import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, sha256Digest } from "./index";

test("canonicalizes JSON recursively and produces a stable SHA-256 digest", () => {
  const first = { z: 1, a: { y: 2, x: [3, null, true] } };
  const reordered = { a: { x: [3, null, true], y: 2 }, z: 1 };
  const expected = '{"a":{"x":[3,null,true],"y":2},"z":1}';

  assert.equal(canonicalJson(first), expected);
  assert.equal(canonicalJson(reordered), expected);
  assert.equal(
    sha256Digest(first),
    "2800e9c9169be6556ce73897827d7494ae9ee6f47f60aa27169667fd3c9eb24f",
  );
  assert.equal(sha256Digest(first), sha256Digest(reordered));
});

test("rejects values that cannot cross a JSON contract boundary", () => {
  assert.throws(() => canonicalJson({ value: undefined }), /not JSON-serializable/);
  assert.throws(() => canonicalJson({ value: Number.NaN }), /finite JSON numbers/);
  assert.throws(() => canonicalJson({ value: new Date() }), /plain JSON objects/);

  const circular: { self?: unknown } = {};
  circular.self = circular;
  assert.throws(() => canonicalJson(circular), /circular reference/);

  const accessorArray: unknown[] = [];
  Object.defineProperty(accessorArray, 0, {
    enumerable: true,
    get() {
      return "must-not-run";
    },
  });
  accessorArray.length = 1;
  assert.throws(
    () => canonicalJson(accessorArray),
    /enumerable data property/i,
  );
});
