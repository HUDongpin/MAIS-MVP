import { createHmac, randomBytes as nodeRandomBytes, timingSafeEqual } from "node:crypto";
import type { CurriculumProfile, GradeId, Language, ThemeMode } from "@/types";

export const GOOGLE_OAUTH_STATE_COOKIE = "mais_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleOAuthRole = "student" | "parent" | "teacher";

type GoogleOAuthEnv = Record<string, string | undefined>;

type GoogleOAuthStatePayload = {
  state: string;
  nonce: string;
  next: string;
  role: GoogleOAuthRole;
  grade?: GradeId;
  curriculumProfile?: CurriculumProfile;
  language?: Language;
  theme?: ThemeMode;
  exp: number;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleJsonWebKey = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

type JsonWebKeySet = {
  keys: GoogleJsonWebKey[];
};

export type VerifiedGoogleProfile = {
  subject: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
};

function envValue(env: GoogleOAuthEnv | undefined, key: string) {
  return env?.[key] ?? process.env[key];
}

function readGoogleOAuthConfig(env?: GoogleOAuthEnv): GoogleOAuthConfig | null {
  const enabled = envValue(env, "GOOGLE_OAUTH_ENABLED");
  if (!enabled || !["1", "true", "yes", "on"].includes(enabled.trim().toLowerCase())) return null;

  const clientId = envValue(env, "GOOGLE_OAUTH_CLIENT_ID")?.trim() ?? "";
  const clientSecret = envValue(env, "GOOGLE_OAUTH_CLIENT_SECRET")?.trim() ?? "";
  const redirectUri = envValue(env, "GOOGLE_OAUTH_REDIRECT_URI")?.trim() ?? "";
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function readStateSecret(env?: GoogleOAuthEnv) {
  return (
    envValue(env, "GOOGLE_OAUTH_STATE_SECRET") ??
    envValue(env, "AUTH_SESSION_SECRET") ??
    envValue(env, "NEXTAUTH_SECRET") ??
    ""
  );
}

function base64UrlEncode(value: Uint8Array | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

function randomBase64Url(size: number, randomBytes: (size: number) => Uint8Array) {
  return base64UrlEncode(randomBytes(size));
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function normalizeRole(value: unknown): GoogleOAuthRole {
  return value === "parent" || value === "teacher" || value === "student" ? value : "student";
}

function isSecureRequestUrl(requestUrl: string) {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function sealGoogleOAuthState(payload: GoogleOAuthStatePayload, secret: string) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function parseJwtPart(value: string) {
  try {
    return JSON.parse(base64UrlDecode(value).toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isGoogleIssuer(value: unknown) {
  return value === "accounts.google.com" || value === "https://accounts.google.com";
}

function jwkAlgorithmAllowsRs256(jwk: GoogleJsonWebKey) {
  return (!jwk.alg || jwk.alg === "RS256") && (!jwk.use || jwk.use === "sig");
}

export async function buildGoogleOAuthAuthorization({
  env,
  requestUrl,
  input,
  now = Date.now(),
  randomBytes = nodeRandomBytes
}: {
  env?: GoogleOAuthEnv;
  requestUrl: string;
  input: {
    next?: string;
    role?: GoogleOAuthRole;
    grade?: GradeId;
    curriculumProfile?: CurriculumProfile;
    language?: Language;
    theme?: ThemeMode;
  };
  now?: number;
  randomBytes?: (size: number) => Uint8Array;
}) {
  const config = readGoogleOAuthConfig(env);
  const stateSecret = readStateSecret(env);
  if (!config || !stateSecret) return { status: "setup-missing" as const };

  const state = randomBase64Url(32, randomBytes);
  const nonce = randomBase64Url(32, randomBytes);
  const payload: GoogleOAuthStatePayload = {
    state,
    nonce,
    next: safeNextPath(input.next),
    role: normalizeRole(input.role),
    grade: input.grade,
    curriculumProfile: input.curriculumProfile,
    language: input.language,
    theme: input.theme,
    exp: now + GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS * 1000
  };
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("prompt", "select_account");

  return {
    status: "redirect" as const,
    authorizationUrl: authorizationUrl.toString(),
    cookie: {
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: sealGoogleOAuthState(payload, stateSecret),
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isSecureRequestUrl(requestUrl),
        path: "/" as const,
        maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS
      }
    }
  };
}

export async function verifyGoogleOAuthState({
  env,
  state,
  cookieValue,
  now = Date.now()
}: {
  env?: GoogleOAuthEnv;
  state: string;
  cookieValue: string;
  now?: number;
}) {
  const stateSecret = readStateSecret(env);
  if (!stateSecret || !state || !cookieValue) return { status: "invalid" as const };

  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) return { status: "invalid" as const };
  if (!constantTimeEqual(signature, sign(encodedPayload, stateSecret))) return { status: "invalid" as const };

  const payload = parseJwtPart(encodedPayload) as Partial<GoogleOAuthStatePayload> | null;
  if (!payload || payload.state !== state || typeof payload.nonce !== "string" || typeof payload.exp !== "number") {
    return { status: "invalid" as const };
  }
  if (payload.exp <= now) return { status: "invalid" as const };

  return {
    status: "valid" as const,
    payload: {
      ...payload,
      next: safeNextPath(payload.next),
      role: normalizeRole(payload.role)
    } as GoogleOAuthStatePayload
  };
}

export async function verifyGoogleIdToken({
  idToken,
  clientId,
  expectedNonce,
  jwks,
  now = Date.now()
}: {
  idToken: string;
  clientId: string;
  expectedNonce: string;
  jwks: JsonWebKeySet;
  now?: number;
}) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return { status: "invalid" as const };

  const header = parseJwtPart(encodedHeader);
  const payload = parseJwtPart(encodedPayload);
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return { status: "invalid" as const };

  const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid && jwkAlgorithmAllowsRs256(candidate));
  if (!jwk) return { status: "invalid" as const };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!verified) return { status: "invalid" as const };

  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (
    !isGoogleIssuer(payload.iss) ||
    payload.aud !== clientId ||
    payload.nonce !== expectedNonce ||
    exp <= Math.floor(now / 1000) ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    !email ||
    payload.email_verified !== true
  ) {
    return { status: "invalid" as const };
  }

  return {
    status: "valid" as const,
    profile: {
      subject: payload.sub,
      email,
      emailVerified: true,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined
    } satisfies VerifiedGoogleProfile
  };
}

export async function exchangeGoogleAuthorizationCode({
  code,
  config,
  fetcher = fetch
}: {
  code: string;
  config: GoogleOAuthConfig;
  fetcher?: typeof fetch;
}) {
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!response.ok) return { status: "invalid" as const };
  const body = await response.json().catch(() => null) as { id_token?: unknown } | null;
  return typeof body?.id_token === "string"
    ? { status: "ok" as const, idToken: body.id_token }
    : { status: "invalid" as const };
}

export async function fetchGoogleJwks({ fetcher = fetch }: { fetcher?: typeof fetch } = {}) {
  const response = await fetcher("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as JsonWebKeySet | null;
  return body && Array.isArray(body.keys) ? body : null;
}

export function getGoogleOAuthConfig(env?: GoogleOAuthEnv) {
  return readGoogleOAuthConfig(env);
}
