import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import {
  getAuthenticatedUserForSession
} from "@/lib/server/userStore/auth";
import type { StudentSession } from "@/types";

function readCookie(header: string | null, name: string) {
  if (!header) return null;

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const expectedUserHeaderName = "x-mais-expected-user-id";

export const PARENT_PRODUCTION_CERTIFICATION_HEADER =
  "X-MAIS-Production-Certification";
export const PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER =
  "X-MAIS-Production-Instance-Proof";
export const PARENT_PRODUCTION_CERTIFICATION_MODE =
  "parent-idempotency-v1";

const productionCertificationSecretMinimumLength = 32;
const productionCertificationSecretMaximumLength = 512;
const productionCertificationDisallowedSecretPattern = /[\s\u0000-\u001f\u007f-\u009f]/u;
const productionCertificationInstanceProofPattern = /^v1\.[A-Za-z0-9_-]{22}$/u;
const productionCertificationInstanceProofGlobalKey =
  "__maisParentProductionCertificationInstanceProofV1";

type GlobalWithParentProductionCertification = typeof globalThis & {
  [productionCertificationInstanceProofGlobalKey]?: string;
};

export type ParentProductionCertificationRuntime = {
  vercelEnvironment?: string;
  healthSecret?: string;
  instanceProof?: string;
};

type AuthenticatedUserIdentity = {
  user: {
    id: string;
  };
};

type ExpectedUserGuardOptions = {
  requireConstraint?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expectedUserIdsMatch(expectedUserId: unknown, authenticatedUserId: string) {
  if (typeof expectedUserId !== "string") return false;

  const expectedDigest = createHash("sha256").update(expectedUserId, "utf8").digest();
  const authenticatedDigest = createHash("sha256").update(authenticatedUserId, "utf8").digest();
  const constantTimeDigestMatch = timingSafeEqual(expectedDigest, authenticatedDigest);

  // Keep exact string equality as the authority; the constant-time digest check
  // prevents an early content-dependent exit for equal-length identifiers.
  return constantTimeDigestMatch && expectedUserId === authenticatedUserId;
}

function configuredProductionCertificationValue<
  K extends keyof ParentProductionCertificationRuntime
>(
  runtime: ParentProductionCertificationRuntime,
  key: K,
  fallback: ParentProductionCertificationRuntime[K]
) {
  return Object.prototype.hasOwnProperty.call(runtime, key)
    ? runtime[key]
    : fallback;
}

function isConfiguredProductionCertificationSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= productionCertificationSecretMinimumLength &&
    value.length <= productionCertificationSecretMaximumLength &&
    value === value.trim() &&
    !productionCertificationDisallowedSecretPattern.test(value)
  );
}

function productionCertificationBearerMatches(
  authorization: string | null,
  secret: unknown
) {
  if (!isConfiguredProductionCertificationSecret(secret)) return false;
  const actualDigest = createHash("sha256").update(authorization ?? "", "utf8").digest();
  const expectedDigest = createHash("sha256").update(`Bearer ${secret}`, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function currentProductionCertificationInstanceProof() {
  const processGlobal = globalThis as GlobalWithParentProductionCertification;
  const existing = processGlobal[productionCertificationInstanceProofGlobalKey];
  if (
    typeof existing === "string" &&
    productionCertificationInstanceProofPattern.test(existing)
  ) {
    return existing;
  }

  const created = `v1.${randomBytes(16).toString("base64url")}`;
  Object.defineProperty(processGlobal, productionCertificationInstanceProofGlobalKey, {
    configurable: false,
    enumerable: false,
    value: created,
    writable: false
  });
  return created;
}

/**
 * Returns an opaque, process-stable proof only for the internal production
 * certification request. Callers must invoke this after authenticating the
 * parent and enforcing the expected-user guard; ordinary responses never need
 * or receive an execution-instance identifier.
 */
export function resolveParentProductionCertificationInstanceProof(
  request: Request,
  runtime: ParentProductionCertificationRuntime = {}
) {
  const vercelEnvironment = configuredProductionCertificationValue(
    runtime,
    "vercelEnvironment",
    process.env.VERCEL_ENV
  );
  if (vercelEnvironment !== "production" || request.method !== "POST") return null;
  if (
    request.headers.get(PARENT_PRODUCTION_CERTIFICATION_HEADER) !==
    PARENT_PRODUCTION_CERTIFICATION_MODE
  ) {
    return null;
  }

  const healthSecret = configuredProductionCertificationValue(
    runtime,
    "healthSecret",
    process.env.TEACHER_NOTICE_HEALTH_SECRET
  );
  if (!productionCertificationBearerMatches(request.headers.get("authorization"), healthSecret)) {
    return null;
  }

  const instanceProof = configuredProductionCertificationValue(
    runtime,
    "instanceProof",
    currentProductionCertificationInstanceProof()
  );
  return (
    typeof instanceProof === "string" &&
    productionCertificationInstanceProofPattern.test(instanceProof)
  )
    ? instanceProof
    : null;
}

export function expectedUserConstraintsFromRequest(request: Request): unknown[] {
  const constraints: unknown[] = [];
  const headerConstraint = request.headers.get(expectedUserHeaderName);
  if (headerConstraint !== null) constraints.push(headerConstraint);

  const url = new URL(request.url);
  constraints.push(...url.searchParams.getAll("expectedUserId"));
  return constraints;
}

export function bodyExpectedUserConstraints(body: unknown): unknown[] {
  if (!isRecord(body) || !Object.prototype.hasOwnProperty.call(body, "expectedUserId")) {
    return [];
  }
  return [body.expectedUserId];
}

export function guardExpectedAuthenticatedUser(
  authenticated: AuthenticatedUserIdentity,
  constraints: readonly unknown[],
  options: ExpectedUserGuardOptions = {}
) {
  if (
    (!options.requireConstraint || constraints.length > 0) &&
    constraints.every((constraint) => expectedUserIdsMatch(constraint, authenticated.user.id))
  ) {
    return null;
  }

  return Response.json(
    {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    },
    {
      status: 409,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

export async function requireAuthenticatedUser(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return getAuthenticatedUserFromToken(token);
}

export async function getAuthenticatedUserFromToken(token?: string | null) {
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return getAuthenticatedUserForSession(payload.sub, payload.sr);
}

function throwIfAiTutorAuthenticationAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException("AI Tutor authentication was aborted.", "AbortError");
  }
}

export async function requireAiTutorAuthenticatedUser(request: Request, signal: AbortSignal) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return getAiTutorAuthenticatedUserFromToken(token, signal);
}

export async function getAiTutorAuthenticatedUserFromToken(
  token: string | null | undefined,
  signal: AbortSignal
) {
  if (!token) return null;
  throwIfAiTutorAuthenticationAborted(signal);

  const payload = await verifySessionToken(token);
  if (!payload) return null;
  throwIfAiTutorAuthenticationAborted(signal);

  return getAuthenticatedUserForSession(payload.sub, payload.sr, signal);
}

export function canAccessTeacherArea(user?: Pick<StudentSession, "role"> | null) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function canAccessParentArea(user?: Pick<StudentSession, "role"> | null) {
  return user?.role === "parent";
}

export async function requireTeacherUser(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!canAccessTeacherArea(authenticated?.user)) return null;

  return authenticated;
}

export async function requireParentUser(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!canAccessParentArea(authenticated?.user)) return null;

  return authenticated;
}
