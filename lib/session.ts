export const SESSION_COOKIE_NAME = "hk_math_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  sr: number;
  jti: string;
  iat: number;
  exp: number;
};

export type CreateSessionTokenInput = {
  userId: string;
  sessionRevision: number;
  now?: number;
};

const fallbackSecret = "hk-math-lab-local-development-secret";
const sessionClockSkewMs = 5 * 60 * 1000;
const sessionJtiPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const sessionMaxLifetimeMs = SESSION_MAX_AGE_SECONDS * 1000;
const sessionTokenMaxLength = 4096;

function getSessionSecret() {
  const configuredSecret = process.env.AUTH_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") return null;
  return fallbackSecret;
}

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacSha256(value: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET or NEXTAUTH_SECRET is required in production.");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function createSessionToken({
  userId,
  sessionRevision,
  now = Date.now()
}: CreateSessionTokenInput) {
  if (!userId.trim() || !Number.isSafeInteger(sessionRevision) || sessionRevision < 1) {
    throw new Error("A valid user ID and session revision are required to create a session token.");
  }

  const payload: SessionPayload = {
    sub: userId,
    sr: sessionRevision,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = base64UrlEncode(await hmacSha256(encodedPayload));

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string, now = Date.now()): Promise<SessionPayload | null> {
  if (!Number.isSafeInteger(now) || token.length > sessionTokenMaxLength) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = base64UrlEncode(await hmacSha256(encodedPayload));
  } catch {
    return null;
  }
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Partial<SessionPayload>;
    const { sub, sr, jti, iat, exp } = payload;
    if (
      typeof sub !== "string" ||
      !sub.trim() ||
      typeof sr !== "number" ||
      !Number.isSafeInteger(sr) ||
      sr < 1 ||
      typeof jti !== "string" ||
      !sessionJtiPattern.test(jti) ||
      typeof iat !== "number" ||
      !Number.isSafeInteger(iat) ||
      typeof exp !== "number" ||
      !Number.isSafeInteger(exp)
    ) return null;
    if (exp <= iat) return null;
    if (iat > now + sessionClockSkewMs) return null;
    if (exp - iat > sessionMaxLifetimeMs) return null;
    if (exp <= now) return null;
    return {
      sub,
      sr,
      jti,
      iat,
      exp
    };
  } catch {
    return null;
  }
}
