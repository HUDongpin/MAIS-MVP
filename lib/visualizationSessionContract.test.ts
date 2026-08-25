import assert from "node:assert/strict";
import test from "node:test";
import {
  isCanonicalVisualizationSessionIdentity,
  maxVisualizationSessionIdentityLength
} from "./visualizationSessionContract";

const malformedUtf16Identities = [
  "\uD800",
  "\uDBFF",
  "\uDC00",
  "\uDFFF",
  "\uD800A",
  "A\uDC00",
  "\uD800\uD800",
  "\uDC00\uDC00",
  "\uDC00\uD800",
  "\uD83D\uDE00\uD800",
  "\uDC00\uD83D\uDE00",
  "\uD800\uD83D\uDE00",
  "\uD83D\uDE00\uDC00"
] as const;

test("publishes the 256 UTF-16 code-unit identity limit", () => {
  assert.equal(maxVisualizationSessionIdentityLength, 256);
});

test("rejects empty and whitespace-only identities", () => {
  for (const value of ["", " ", "\t", "\n", "\r\n", "\u00A0", "\uFEFF", " \t\n "]) {
    assert.equal(isCanonicalVisualizationSessionIdentity(value), false, JSON.stringify(value));
  }
});

test("accepts canonical identities at the UTF-16 length boundary", () => {
  assert.equal(isCanonicalVisualizationSessionIdentity("a"), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("a".repeat(255)), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("a".repeat(256)), true);
});

test("rejects canonical identities above the UTF-16 length boundary", () => {
  assert.equal(isCanonicalVisualizationSessionIdentity("a".repeat(257)), false);
});

test("rejects leading or trailing whitespace instead of rewriting identity", () => {
  for (const value of [
    " session-1",
    "session-1 ",
    "\tsession-1",
    "session-1\n",
    "\u00A0session-1",
    "session-1\uFEFF"
  ]) {
    assert.equal(isCanonicalVisualizationSessionIdentity(value), false, JSON.stringify(value));
  }

  assert.equal(isCanonicalVisualizationSessionIdentity("session 1"), true);
});

test("accepts valid BMP identities", () => {
  for (const value of ["session-1", "香港數學-S1-代數", "數".repeat(256), "A-0_./:數學"]) {
    assert.equal(isCanonicalVisualizationSessionIdentity(value), true, value);
  }
});

test("accepts valid surrogate pairs and counts each pair as two UTF-16 code units", () => {
  assert.equal("😀".length, 2);
  assert.equal(isCanonicalVisualizationSessionIdentity("😀"), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("lab-😀-🧮-數學"), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("😀".repeat(128)), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("😀".repeat(129)), false);
});

test("rejects lone and incorrectly ordered UTF-16 surrogate code units", () => {
  for (const value of malformedUtf16Identities) {
    assert.equal(isCanonicalVisualizationSessionIdentity(value), false, JSON.stringify(value));
  }
});

test("rejects malformed UTF-16 without leaking encodeURIComponent URIError behavior", () => {
  for (const value of malformedUtf16Identities) {
    assert.throws(() => encodeURIComponent(value), URIError, JSON.stringify(value));
    assert.doesNotThrow(() => isCanonicalVisualizationSessionIdentity(value), JSON.stringify(value));
    assert.equal(isCanonicalVisualizationSessionIdentity(value), false, JSON.stringify(value));
  }

  for (const value of ["session-1", "香港數學", "😀", "lab-😀-數學"]) {
    assert.doesNotThrow(() => encodeURIComponent(value), JSON.stringify(value));
    assert.equal(isCanonicalVisualizationSessionIdentity(value), true, JSON.stringify(value));
  }
});

test("rejects non-string identity values", () => {
  for (const value of [undefined, null, 0, 256, true, {}, [], Symbol("session")]) {
    assert.equal(isCanonicalVisualizationSessionIdentity(value), false);
  }
});
