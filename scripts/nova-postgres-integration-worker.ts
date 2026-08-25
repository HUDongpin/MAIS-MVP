import process from "node:process";

import type {
  AITutorMessageRecord,
  AITutorUsageRecord
} from "@/lib/server/userStore/aiGovernancePersistence";

const resultPrefix = "NOVA_POSTGRES_INTEGRATION_RESULT=";
type UserStoreModule = typeof import("@/lib/server/userStore");
let loadedStore: UserStoreModule | null = null;

function assertTestDatabaseBoundary() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Nova PostgreSQL integration worker requires NODE_ENV=test.");
  }
  const configuredUrl = process.env.POSTGRES_URL?.trim();
  if (!configuredUrl) throw new Error("Nova PostgreSQL integration worker requires POSTGRES_URL.");
  const parsedUrl = new URL(configuredUrl);
  if (!["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
    throw new Error("Nova PostgreSQL integration worker refuses non-local databases.");
  }
  if (parsedUrl.pathname !== "/mais_nova_ci") {
    throw new Error("Nova PostgreSQL integration worker refuses an unexpected database name.");
  }
  if (
    process.env.HK_MATH_STORAGE_PROVIDER !== "postgres"
    || process.env.HK_MATH_POSTGRES_HOT_AUTH_TABLES !== "true"
  ) {
    throw new Error("Nova PostgreSQL integration worker requires the Postgres hot-path configuration.");
  }
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function writeResult(value: unknown) {
  process.stdout.write(`${resultPrefix}${JSON.stringify(value)}\n`);
}

function requiredAdmissionDeadline(name: string) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(value) || value < 250 || value > 4_000) {
    throw new Error(`Nova PostgreSQL integration worker requires ${name}.`);
  }
  return value;
}

async function runTimedAdmissionStep<T>(
  stage: "auth" | "policy" | "rate",
  action: () => Promise<T>
) {
  const startedAt = performance.now();
  try {
    const value = await action();
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      value
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : "";
    const kind = (
      (error instanceof DOMException && error.name === "AbortError")
      || /aborted|timed out/i.test(message)
    ) ? "aborted" : "failed";
    throw new Error(`${stage} admission ${kind} after ${elapsedMs}ms.`);
  }
}

async function main() {
  assertTestDatabaseBoundary();
  const command = process.argv[2];
  const inputText = await readStdin();
  const input = inputText.trim() ? JSON.parse(inputText) as Record<string, unknown> : {};
  const store = await import("@/lib/server/userStore");
  loadedStore = store;

  try {
    if (command === "readiness") {
      await store.__userStoreAiTutorPostgresTestHooks.ensureSchema();
      return {
        provider: "postgres",
        schemaReady: true
      };
    }

    if (command === "policy") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const signal = AbortSignal.timeout(1_500);
      return store.resolveStudentAiTutorPolicy(userId, { signal });
    }

    if (command === "admission") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const authDeadlineMs = requiredAdmissionDeadline("AI_TUTOR_AUTH_ADMISSION_DEADLINE_MS");
      const policyDeadlineMs = requiredAdmissionDeadline(
        "AI_TUTOR_CLASSROOM_POLICY_ADMISSION_DEADLINE_MS"
      );
      const rateDeadlineMs = requiredAdmissionDeadline(
        "AI_TUTOR_RATE_LIMIT_ADMISSION_DEADLINE_MS"
      );
      const authenticatedStep = await runTimedAdmissionStep("auth", () => (
        store.getAuthenticatedUserByIdForAiTutorAdmission(
          userId,
          AbortSignal.timeout(authDeadlineMs)
        )
      ));
      const authenticated = authenticatedStep.value;
      if (!authenticated || authenticated.user.id !== userId) {
        throw new Error("AI Tutor authentication admission returned no matching user.");
      }
      const policyStep = await runTimedAdmissionStep("policy", () => (
        store.resolveStudentAiTutorPolicy(userId, {
          signal: AbortSignal.timeout(policyDeadlineMs)
        })
      ));
      const rateStep = await runTimedAdmissionStep("rate", () => (
        store.consumeAiCapabilityRateLimit({
          capability: "ai-tutor-chat",
          rules: [
            { name: "minute", max: 100, windowMs: 60_000 },
            { name: "hour", max: 1_000, windowMs: 3_600_000 }
          ],
          signal: AbortSignal.timeout(rateDeadlineMs),
          userId
        })
      ));
      return {
        policyMode: policyStep.value.mode,
        rateAllowed: rateStep.value.allowed,
        stageMs: {
          auth: authenticatedStep.elapsedMs,
          policy: policyStep.elapsedMs,
          rate: rateStep.elapsedMs
        }
      };
    }

    if (command === "quota") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const sinceIso = typeof input.sinceIso === "string" ? input.sinceIso : "";
      return { tokens: await store.getAITutorTokenUsageSince(userId, sinceIso) };
    }

    if (command === "write-message") {
      const result = await store.__userStoreAiTutorPostgresTestHooks.recordMessage(
        input as AITutorMessageRecord
      );
      return { result };
    }

    if (command === "write-usage") {
      const result = await store.__userStoreAiTutorPostgresTestHooks.recordUsage(
        input as AITutorUsageRecord
      );
      return { result };
    }

    throw new Error("Unsupported Nova PostgreSQL integration command.");
  } finally {
    await store.__userStoreAiTutorPostgresTestHooks.closePostgresClients();
  }
}

main().then((result) => {
  writeResult(result);
}).catch(async (error: unknown) => {
  if (loadedStore) {
    await loadedStore.__userStoreAiTutorPostgresTestHooks.closePostgresClients().catch(() => undefined);
  }
  const message = error instanceof Error ? error.message : "Unknown integration worker failure.";
  process.exitCode = 1;
  writeResult({ error: message });
});
