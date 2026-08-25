import { timingSafeEqual } from "node:crypto";

const captureTokenPattern = /^[a-f0-9]{64}$/;

export function isValidMaisManimCaptureToken(value: unknown): value is string {
  return typeof value === "string" && captureTokenPattern.test(value);
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "127.0.0.1"
    || normalized === "localhost"
    || normalized === "::1"
    || normalized === "[::1]";
}

function tokensMatch(expectedToken: string, suppliedToken: string) {
  const expectedBytes = Buffer.from(expectedToken, "ascii");
  const suppliedBytes = Buffer.from(suppliedToken, "ascii");
  return expectedBytes.byteLength === suppliedBytes.byteLength
    && timingSafeEqual(expectedBytes, suppliedBytes);
}

type CaptureHarnessGateConfig = {
  enabled: string | undefined;
  expectedToken: string | undefined;
  nodeEnv: string | undefined;
};

type CaptureHarnessAttempt = {
  hostname: string;
  suppliedToken: string | null | undefined;
};

type CaptureHarnessDecision =
  | { allowed: true }
  | { allowed: false; reason: "not-found" };

/**
 * Creates a process-local, single-use authorization gate for the isolated
 * capture harness. Every denial is intentionally indistinguishable from a
 * missing route. Production is fail-closed even if an environment flag is
 * accidentally carried into a deployment.
 */
export function createMaisManimCaptureHarnessGate({
  enabled,
  expectedToken,
  nodeEnv
}: CaptureHarnessGateConfig) {
  const configured = enabled === "1"
    && nodeEnv !== "production"
    && isValidMaisManimCaptureToken(expectedToken);
  let consumed = false;

  return {
    consume({ hostname, suppliedToken }: CaptureHarnessAttempt): CaptureHarnessDecision {
      if (
        !configured
        || consumed
        || !isLoopbackHostname(hostname)
        || !isValidMaisManimCaptureToken(suppliedToken)
        || !tokensMatch(expectedToken, suppliedToken)
      ) {
        return { allowed: false, reason: "not-found" };
      }
      consumed = true;
      return { allowed: true };
    }
  };
}
