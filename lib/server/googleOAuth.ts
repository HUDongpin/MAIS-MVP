import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes as nodeRandomBytes
} from "node:crypto";
import { isValidGradeId } from "@/data/grades";
import { safeRelativeAppPath } from "@/lib/authRedirect";
import { isGoogleStudentSelfServiceGradeAllowed } from "@/lib/googleStudentOAuthPolicy";
import { PUBLIC_SITE_URLS } from "@/lib/publicSiteIdentity";
import type { CurriculumProfile, GradeId, Language, TextbookPublisher, ThemeMode } from "@/types";

export const GOOGLE_OAUTH_STATE_COOKIE = "mais_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
export const GOOGLE_OAUTH_LINK_REAUTH_COOKIE = "mais_google_link_reauth";
export const GOOGLE_OAUTH_LINK_REAUTH_MAX_AGE_SECONDS = 5 * 60;
export const GOOGLE_OAUTH_PROVIDER_TIMEOUT_MS = 10_000;

export type GoogleOAuthRole = "student" | "parent" | "teacher";

type GoogleOAuthEnv = Record<string, string | undefined>;

type GoogleOAuthStatePayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  linkUserId?: string;
  next: string;
  role: GoogleOAuthRole;
  studentAge13OrOlder?: true;
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
  emailAuthoritative: boolean;
  hostedDomain?: string;
  name?: string;
  picture?: string;
};

const supportedNewGoogleStudentPublishers = new Set<TextbookPublisher>([
  "MAINLAND_PEP",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
  "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
  "HK_UNITED_PRIME_MIA",
  "HK_EPH_MIF",
  "US_CA_MATH"
]);

export function isGoogleOAuthStudentSetupAllowed(
  grade: unknown,
  curriculumProfile: CurriculumProfile | undefined,
  studentAge13OrOlder = false
) {
  return Boolean(
    curriculumProfile &&
    isValidGradeId(grade) &&
    studentAge13OrOlder &&
    isGoogleStudentSelfServiceGradeAllowed(grade) &&
    supportedNewGoogleStudentPublishers.has(curriculumProfile.publisher) &&
    (curriculumProfile.region === "US" || grade !== "K")
  );
}

function envValue(env: GoogleOAuthEnv | undefined, key: string) {
  return env?.[key] ?? process.env[key];
}

function isProductionOAuthRuntime(env?: GoogleOAuthEnv) {
  const vercelEnvironment = envValue(env, "VERCEL_ENV")?.trim().toLowerCase();
  return vercelEnvironment === "production" || (
    !vercelEnvironment && envValue(env, "NODE_ENV")?.trim().toLowerCase() === "production"
  );
}

function readGoogleOAuthConfig(env?: GoogleOAuthEnv): GoogleOAuthConfig | null {
  const enabled = envValue(env, "GOOGLE_OAUTH_ENABLED");
  if (!enabled || !["1", "true", "yes", "on"].includes(enabled.trim().toLowerCase())) return null;

  const clientId = envValue(env, "GOOGLE_OAUTH_CLIENT_ID")?.trim() ?? "";
  const clientSecret = envValue(env, "GOOGLE_OAUTH_CLIENT_SECRET")?.trim() ?? "";
  const redirectUri = envValue(env, "GOOGLE_OAUTH_REDIRECT_URI")?.trim() ?? "";
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const redirectUrl = new URL(redirectUri);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(redirectUrl.hostname);
    const isProductionRuntime = isProductionOAuthRuntime(env);
    if (
      (redirectUrl.protocol !== "https:" && !(redirectUrl.protocol === "http:" && isLoopback)) ||
      redirectUrl.pathname !== "/api/auth/google/callback" ||
      redirectUrl.username ||
      redirectUrl.password ||
      redirectUrl.search ||
      redirectUrl.hash ||
      (isProductionRuntime && redirectUri !== PUBLIC_SITE_URLS.googleOAuthCallback)
    ) {
      return null;
    }
    return { clientId, clientSecret, redirectUri: redirectUrl.toString() };
  } catch {
    return null;
  }
}

function readStateSecret(env?: GoogleOAuthEnv) {
  const dedicatedStateSecret = (envValue(env, "GOOGLE_OAUTH_STATE_SECRET") ?? "").trim();
  const sessionSecret = (
    envValue(env, "AUTH_SESSION_SECRET") ??
    envValue(env, "NEXTAUTH_SECRET") ??
    ""
  ).trim();
  if (isProductionOAuthRuntime(env)) {
    return (
      dedicatedStateSecret.length >= 32 &&
      sessionSecret.length >= 32 &&
      dedicatedStateSecret !== sessionSecret
    ) ? dedicatedStateSecret : "";
  }

  const secret = dedicatedStateSecret || sessionSecret;
  return secret.length >= 32 ? secret : "";
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

function safeNextPath(value: unknown) {
  return safeRelativeAppPath(value, "/dashboard");
}

function normalizeRole(value: unknown): GoogleOAuthRole {
  return value === "parent" || value === "teacher" || value === "student" ? value : "student";
}

function normalizeLinkUserId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= 256 ? normalized : undefined;
}

function isSecureRequestUrl(requestUrl: string) {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function oauthStateEncryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function sealGoogleOAuthState(
  payload: object,
  secret: string,
  randomBytes: (size: number) => Uint8Array
) {
  const iv = Buffer.from(randomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", oauthStateEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const authenticationTag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${authenticationTag.toString("base64url")}`;
}

function openGoogleOAuthState(cookieValue: string, secret: string) {
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return null;
  const [version, encodedIv, encodedCiphertext, encodedAuthenticationTag] = parts;
  if (
    version !== "v1" ||
    !isCanonicalBase64Url(encodedIv) ||
    !isCanonicalBase64Url(encodedCiphertext) ||
    !isCanonicalBase64Url(encodedAuthenticationTag)
  ) {
    return null;
  }

  try {
    const iv = base64UrlDecode(encodedIv);
    const ciphertext = base64UrlDecode(encodedCiphertext);
    const authenticationTag = base64UrlDecode(encodedAuthenticationTag);
    if (iv.length !== 12 || ciphertext.length === 0 || authenticationTag.length !== 16) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      oauthStateEncryptionKey(secret),
      iv
    );
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString("utf8");
    return JSON.parse(plaintext) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createGoogleOAuthLinkReauth({
  env,
  requestUrl,
  userId,
  now = Date.now(),
  randomBytes = nodeRandomBytes
}: {
  env?: GoogleOAuthEnv;
  requestUrl: string;
  userId: string;
  now?: number;
  randomBytes?: (size: number) => Uint8Array;
}) {
  const stateSecret = readStateSecret(env);
  const normalizedUserId = normalizeLinkUserId(userId);
  if (!stateSecret || !normalizedUserId) return { status: "setup-missing" as const };

  return {
    status: "ready" as const,
    cookie: {
      name: GOOGLE_OAUTH_LINK_REAUTH_COOKIE,
      value: sealGoogleOAuthState({
        purpose: "google-link-reauth",
        userId: normalizedUserId,
        exp: now + GOOGLE_OAUTH_LINK_REAUTH_MAX_AGE_SECONDS * 1000
      }, stateSecret, randomBytes),
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isSecureRequestUrl(requestUrl),
        path: "/" as const,
        maxAge: GOOGLE_OAUTH_LINK_REAUTH_MAX_AGE_SECONDS
      }
    }
  };
}

export async function verifyGoogleOAuthLinkReauth({
  env,
  cookieValue,
  userId,
  now = Date.now()
}: {
  env?: GoogleOAuthEnv;
  cookieValue: string;
  userId: string;
  now?: number;
}) {
  const stateSecret = readStateSecret(env);
  const normalizedUserId = normalizeLinkUserId(userId);
  if (!stateSecret || !cookieValue || !normalizedUserId) return { status: "invalid" as const };

  const payload = openGoogleOAuthState(cookieValue, stateSecret);
  if (
    payload?.purpose !== "google-link-reauth" ||
    payload.userId !== normalizedUserId ||
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    return { status: "invalid" as const };
  }
  return { status: "valid" as const };
}

function isCanonicalBase64Url(value: string | undefined): value is string {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  return base64UrlEncode(base64UrlDecode(value)) === value;
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
    linkUserId?: string;
    role?: GoogleOAuthRole;
    studentAge13OrOlder?: boolean;
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

  const requestUrlValue = new URL(requestUrl);
  const callbackUrl = new URL(config.redirectUri);
  if (requestUrlValue.origin !== callbackUrl.origin) {
    const canonicalUrl = new URL("/api/auth/google/start", callbackUrl.origin);
    canonicalUrl.search = requestUrlValue.search;
    return {
      status: "canonical-redirect" as const,
      canonicalUrl: canonicalUrl.toString()
    };
  }

  const state = randomBase64Url(32, randomBytes);
  const nonce = randomBase64Url(32, randomBytes);
  const codeVerifier = randomBase64Url(32, randomBytes);
  const linkUserId = normalizeLinkUserId(input.linkUserId);
  const payload: GoogleOAuthStatePayload = {
    state,
    nonce,
    codeVerifier,
    ...(linkUserId ? { linkUserId } : {}),
    next: safeNextPath(input.next),
    role: normalizeRole(input.role),
    ...(input.studentAge13OrOlder === true ? { studentAge13OrOlder: true as const } : {}),
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
  authorizationUrl.searchParams.set("code_challenge", createHash("sha256").update(codeVerifier).digest("base64url"));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("prompt", "select_account");

  return {
    status: "redirect" as const,
    authorizationUrl: authorizationUrl.toString(),
    cookie: {
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: sealGoogleOAuthState(payload, stateSecret, randomBytes),
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

  const payload = openGoogleOAuthState(cookieValue, stateSecret) as Partial<GoogleOAuthStatePayload> | null;
  const linkUserId = normalizeLinkUserId(payload?.linkUserId);
  if (
    !payload ||
    payload.state !== state ||
    typeof payload.nonce !== "string" ||
    typeof payload.codeVerifier !== "string" ||
    (payload.linkUserId !== undefined && !linkUserId) ||
    typeof payload.exp !== "number"
  ) {
    return { status: "invalid" as const };
  }
  if (payload.exp <= now) return { status: "invalid" as const };

  return {
    status: "valid" as const,
    payload: {
      ...payload,
      ...(linkUserId ? { linkUserId } : {}),
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
  const tokenParts = idToken.split(".");
  if (tokenParts.length !== 3) return { status: "invalid" as const };
  const [encodedHeader, encodedPayload, encodedSignature] = tokenParts;
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
  const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const hostedDomain = typeof payload.hd === "string" ? payload.hd.trim().toLowerCase() : "";
  const emailDomain = email.includes("@") ? email.slice(email.lastIndexOf("@") + 1) : "";
  if (
    !isGoogleIssuer(payload.iss) ||
    payload.aud !== clientId ||
    (payload.azp !== undefined && payload.azp !== clientId) ||
    payload.nonce !== expectedNonce ||
    exp <= Math.floor(now / 1000) ||
    !issuedAt ||
    issuedAt > Math.floor(now / 1000) + 5 * 60 ||
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
      emailAuthoritative: emailDomain === "gmail.com" || Boolean(hostedDomain && hostedDomain === emailDomain),
      hostedDomain: hostedDomain || undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined
    } satisfies VerifiedGoogleProfile
  };
}

export async function exchangeGoogleAuthorizationCode({
  code,
  codeVerifier,
  config,
  fetcher = fetch,
  timeoutMs = GOOGLE_OAUTH_PROVIDER_TIMEOUT_MS
}: {
  code: string;
  codeVerifier: string;
  config: GoogleOAuthConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(timeoutMs),
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
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

export async function fetchGoogleJwks({
  fetcher = fetch,
  timeoutMs = GOOGLE_OAUTH_PROVIDER_TIMEOUT_MS
}: {
  fetcher?: typeof fetch;
  timeoutMs?: number;
} = {}) {
  const response = await fetcher("https://www.googleapis.com/oauth2/v3/certs", {
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null) as JsonWebKeySet | null;
  return body && Array.isArray(body.keys) ? body : null;
}

export function getGoogleOAuthConfig(env?: GoogleOAuthEnv) {
  return readGoogleOAuthConfig(env);
}
