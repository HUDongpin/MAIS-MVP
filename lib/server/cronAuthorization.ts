import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuthorizationDecision =
  | "authorized"
  | "unauthorized"
  | "unavailable";

const cronSecretMinimumLength = 32;
const cronSecretMaximumLength = 512;
const disallowedWhitespaceOrControlPattern = /[\s\u0000-\u001f\u007f-\u009f]/u;

function isConfiguredCronSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= cronSecretMinimumLength &&
    value.length <= cronSecretMaximumLength &&
    value === value.trim() &&
    !disallowedWhitespaceOrControlPattern.test(value)
  );
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function constantTimeCronBearerMatches(
  authorization: string | null,
  secret: unknown
): boolean {
  if (typeof secret !== "string") return false;
  const actualDigest = digest(authorization ?? "");
  const expectedDigest = digest(`Bearer ${secret}`);
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function authorizeCronBearer(
  authorization: string | null,
  configuredSecret: unknown
): CronAuthorizationDecision {
  if (!isConfiguredCronSecret(configuredSecret)) return "unavailable";
  return constantTimeCronBearerMatches(authorization, configuredSecret)
    ? "authorized"
    : "unauthorized";
}
