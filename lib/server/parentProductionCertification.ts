import { randomBytes } from "node:crypto";

import { authorizeCronBearer } from "@/lib/server/cronAuthorization";

export const PARENT_PRODUCTION_CERTIFICATION_HEADER =
  "X-MAIS-Production-Certification";
export const PARENT_PRODUCTION_CERTIFICATION_INSTANCE_HEADER =
  "X-MAIS-Production-Instance-Proof";
export const PARENT_PRODUCTION_CERTIFICATION_MODE =
  "parent-idempotency-v1";

const instanceProofPattern = /^v1\.[A-Za-z0-9_-]{22}$/u;
const instanceProofGlobalKey = "__maisParentProductionCertificationInstanceProofV1";

type GlobalWithParentProductionCertification = typeof globalThis & {
  [instanceProofGlobalKey]?: string;
};

export type ParentProductionCertificationRuntime = {
  vercelEnvironment?: string;
  healthSecret?: string;
  instanceProof?: string;
};

function currentProcessInstanceProof() {
  const processGlobal = globalThis as GlobalWithParentProductionCertification;
  const existing = processGlobal[instanceProofGlobalKey];
  if (typeof existing === "string" && instanceProofPattern.test(existing)) {
    return existing;
  }

  const created = `v1.${randomBytes(16).toString("base64url")}`;
  Object.defineProperty(processGlobal, instanceProofGlobalKey, {
    configurable: false,
    enumerable: false,
    value: created,
    writable: false
  });
  return created;
}

function configuredValue<K extends keyof ParentProductionCertificationRuntime>(
  runtime: ParentProductionCertificationRuntime,
  key: K,
  fallback: ParentProductionCertificationRuntime[K]
) {
  return Object.prototype.hasOwnProperty.call(runtime, key)
    ? runtime[key]
    : fallback;
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
  const vercelEnvironment = configuredValue(
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

  const healthSecret = configuredValue(
    runtime,
    "healthSecret",
    process.env.TEACHER_NOTICE_HEALTH_SECRET
  );
  if (
    authorizeCronBearer(request.headers.get("authorization"), healthSecret) !==
    "authorized"
  ) {
    return null;
  }

  const instanceProof = configuredValue(
    runtime,
    "instanceProof",
    currentProcessInstanceProof()
  );
  return typeof instanceProof === "string" && instanceProofPattern.test(instanceProof)
    ? instanceProof
    : null;
}
