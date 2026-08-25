import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken, verifySessionToken } from "@/lib/session";

const testSecret = "session-revision-test-secret";
const now = Date.UTC(2026, 7, 23, 8, 0, 0);

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signLegacyPayload(payload: Record<string, unknown>) {
  const encoder = new TextEncoder();
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(testSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = base64UrlEncode(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)))
  );
  return `${encodedPayload}.${signature}`;
}

test("session tokens carry subject, revision, unique JTI, issued-at, and expiry claims", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = testSecret;

  try {
    const first = await createSessionToken({ userId: "student-1", sessionRevision: 7, now });
    const second = await createSessionToken({ userId: "student-1", sessionRevision: 7, now });
    const firstPayload = await verifySessionToken(first, now);
    const secondPayload = await verifySessionToken(second, now);

    assert.deepEqual(
      firstPayload && {
        sub: firstPayload.sub,
        sr: firstPayload.sr,
        iat: firstPayload.iat,
        exp: firstPayload.exp
      },
      {
        sub: "student-1",
        sr: 7,
        iat: now,
        exp: now + 7 * 24 * 60 * 60 * 1000
      }
    );
    assert.equal(typeof firstPayload?.jti, "string");
    assert.ok((firstPayload?.jti.length ?? 0) >= 16);
    assert.notEqual(firstPayload?.jti, secondPayload?.jti);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("session verification fails closed for signed legacy and malformed revision claims", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = testSecret;

  try {
    const legacy = await signLegacyPayload({
      sub: "student-1",
      exp: now + 60_000
    });
    const missingJti = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      iat: now,
      exp: now + 60_000
    });
    const invalidRevision = await signLegacyPayload({
      sub: "student-1",
      sr: 0,
      jti: "session-jti",
      iat: now,
      exp: now + 60_000
    });

    assert.equal(await verifySessionToken(legacy, now), null);
    assert.equal(await verifySessionToken(missingJti, now), null);
    assert.equal(await verifySessionToken(invalidRevision, now), null);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("session verification bounds JTI shape, clock skew, and signed lifetime", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = testSecret;
  const validJti = "123e4567-e89b-42d3-a456-426614174000";

  try {
    const valid = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      jti: validJti,
      iat: now,
      exp: now + 60_000
    });
    const malformedJti = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      jti: "not-a-random-uuid",
      iat: now,
      exp: now + 60_000
    });
    const futureIssued = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      jti: validJti,
      iat: now + 5 * 60_000 + 1,
      exp: now + 6 * 60_000
    });
    const excessiveLifetime = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      jti: validJti,
      iat: now,
      exp: now + 7 * 24 * 60 * 60 * 1000 + 1
    });
    const fractionalIssuedAt = await signLegacyPayload({
      sub: "student-1",
      sr: 1,
      jti: validJti,
      iat: now + 0.5,
      exp: now + 60_000
    });

    assert.equal((await verifySessionToken(valid, now))?.jti, validJti);
    assert.equal(await verifySessionToken(malformedJti, now), null);
    assert.equal(await verifySessionToken(futureIssued, now), null);
    assert.equal(await verifySessionToken(excessiveLifetime, now), null);
    assert.equal(await verifySessionToken(fractionalIssuedAt, now), null);
    assert.equal(await verifySessionToken(`${valid}.trailing-segment`, now), null);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});
