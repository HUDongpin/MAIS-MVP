import assert from "node:assert/strict";
import test from "node:test";

import { sameOriginPath } from "@/lib/safeRedirectPath";

/**
 * The off-origin matrix for the shared `?next=` guard.
 *
 * Every case here is checked twice: once against `sameOriginPath`, and once
 * against a plausible deployment origin to show what the value would have done
 * in a browser. The second assertion is the point — it is what makes
 * `/\evil.example` demonstrably an open redirect rather than a claim about the
 * WHATWG parser, and it keeps the matrix honest if the parser ever changes.
 *
 * The four call-site guards each repeat the small subset of this matrix that
 * matters for their own fallback and role filter. This file owns the breadth.
 */

const DEPLOYMENT_ORIGIN = "https://mais.example.com";

function originOf(value: string) {
  try {
    return new URL(value, DEPLOYMENT_ORIGIN).origin;
  } catch {
    return null;
  }
}

/** Spellings of "leave the app". The first was caught before; the rest were not. */
const offOriginTargets = [
  "//evil.example",
  "//evil.example/path",
  "///evil.example",
  "/\\evil.example",
  "/\\evil.example/path",
  "/\\\\evil.example",
  "/\\/evil.example",
  "/\\evil.example\\path",
  // Tab, newline and carriage return are stripped before parsing, so these
  // reduce to a protocol-relative URL after the guard has already looked.
  "/\t/evil.example",
  "/\n//evil.example",
  "/\r//evil.example"
];

/** Absolute URLs, which never start with `/` and so are rejected before parsing. */
const absoluteTargets = [
  "https://evil.example",
  "http://evil.example",
  "https://evil.example/path",
  "\\\\evil.example",
  "//evil.example:8443",
  "javascript:alert(document.domain)",
  "data:text/html,<script>alert(1)</script>"
];

test("every off-origin spelling is rejected, and would have left the app", () => {
  for (const value of offOriginTargets) {
    assert.equal(
      originOf(value),
      "https://evil.example",
      `${JSON.stringify(value)} is expected to resolve off-origin — that is why it must be rejected`
    );
    assert.equal(sameOriginPath(value), null, JSON.stringify(value));
  }
});

test("an absolute or non-http target is rejected", () => {
  for (const value of absoluteTargets) {
    assert.notEqual(originOf(value), DEPLOYMENT_ORIGIN, JSON.stringify(value));
    assert.equal(sameOriginPath(value), null, JSON.stringify(value));
  }
});

test("a relative target is rejected even though it resolves on-origin", () => {
  // Deliberate: all four guards only ever accepted absolute in-app paths, so
  // the shared helper cannot start accepting more than they did.
  for (const value of ["dashboard", "./dashboard", "../admin", "?next=/x", "#top", ""]) {
    assert.equal(sameOriginPath(value), null, JSON.stringify(value));
  }
});

test("a non-string target is rejected", () => {
  for (const value of [null, undefined, 0, 1, true, {}, [], ["/dashboard"], new URL(DEPLOYMENT_ORIGIN)]) {
    assert.equal(sameOriginPath(value), null, JSON.stringify(value));
  }
});

test("an in-app path survives, with its query and fragment", () => {
  assert.equal(sameOriginPath("/"), "/");
  assert.equal(sameOriginPath("/dashboard"), "/dashboard");
  assert.equal(sameOriginPath("/teacher/gradebook?classId=c1#top"), "/teacher/gradebook?classId=c1#top");
  assert.equal(sameOriginPath("/student/lessons/fractions"), "/student/lessons/fractions");
});

test("the returned path is normalized, so a role filter cannot be dot-segmented past", () => {
  // Without this, `/teacher/../admin` passes a `/teacher` prefix filter and
  // then opens `/admin`, because the sink resolves the dot segments afterwards.
  assert.equal(sameOriginPath("/teacher/../admin"), "/admin");
  assert.equal(sameOriginPath("/teacher/./gradebook"), "/teacher/gradebook");
  assert.equal(sameOriginPath("/parent/../../teacher"), "/teacher");
});

test("percent-encoded separators stay one ordinary path segment", () => {
  // Not off-origin in any sink, so these are kept rather than rejected: the
  // encoded form is exactly how a path segment containing `\` or `/` is spelt.
  for (const value of ["/%5Cevil.example", "/%2F%2Fevil.example", "/%09/evil.example"]) {
    assert.equal(originOf(value), DEPLOYMENT_ORIGIN, JSON.stringify(value));
    assert.equal(sameOriginPath(value), value, JSON.stringify(value));
  }
  assert.equal(sameOriginPath("/ /evil.example"), "/%20/evil.example");
});

test("the probe origin cannot be smuggled into the result", () => {
  // The helper resolves against a throwaway origin, so a value that names that
  // origin does resolve on-origin — and still cannot escape, because only the
  // path is returned and the sink resolves it against the real deployment.
  assert.equal(sameOriginPath("/\\mais.invalid/evil"), "/evil");
  assert.equal(originOf("/evil"), DEPLOYMENT_ORIGIN);

  // Userinfo, not a host: `evil.example` here is credentials for mais.invalid.
  assert.equal(sameOriginPath("/\\evil.example@mais.invalid/x"), "/x");
});
