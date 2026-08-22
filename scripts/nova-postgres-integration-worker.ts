import process from "node:process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

import type {
  AITutorMessageRecord,
  AITutorUsageRecord
} from "@/lib/server/userStore/aiGovernancePersistence";
import { hashAuthPasswordResetToken } from "@/lib/server/userStore/authSessionPersistence";

const resultPrefix = "NOVA_POSTGRES_INTEGRATION_RESULT=";
type UserStoreModule = typeof import("@/lib/server/userStore");
let loadedStore: UserStoreModule | null = null;

function assertTestDatabaseBoundary(command: string | undefined) {
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
  if (process.env.HK_MATH_STORAGE_PROVIDER !== "postgres") {
    throw new Error("Nova PostgreSQL integration worker requires the Postgres hot-path configuration.");
  }
  const expectedHotAuthFlag = command === "session-flag-off" ? "false" : "true";
  if (process.env.HK_MATH_POSTGRES_HOT_AUTH_TABLES !== expectedHotAuthFlag) {
    throw new Error(`Nova PostgreSQL integration worker requires hot auth ${expectedHotAuthFlag}.`);
  }
}

function createDirectIntegrationClient() {
  const configuredUrl = process.env.POSTGRES_URL;
  if (!configuredUrl) throw new Error("Nova PostgreSQL integration worker requires POSTGRES_URL.");
  return postgres(configuredUrl, {
    connect_timeout: 5,
    idle_timeout: 5,
    max: 1,
    onnotice: () => undefined,
    prepare: false
  });
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
  const command = process.argv[2];
  assertTestDatabaseBoundary(command);
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
      const sessionRevision = typeof input.sessionRevision === "number" ? input.sessionRevision : 0;
      const authDeadlineMs = requiredAdmissionDeadline("AI_TUTOR_AUTH_ADMISSION_DEADLINE_MS");
      const policyDeadlineMs = requiredAdmissionDeadline(
        "AI_TUTOR_CLASSROOM_POLICY_ADMISSION_DEADLINE_MS"
      );
      const rateDeadlineMs = requiredAdmissionDeadline(
        "AI_TUTOR_RATE_LIMIT_ADMISSION_DEADLINE_MS"
      );
      const authenticatedStep = await runTimedAdmissionStep("auth", () => (
        store.getAuthenticatedUserForSession(
          userId,
          sessionRevision,
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

    if (command === "session-flag-off") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const sessionRevision = typeof input.sessionRevision === "number" ? input.sessionRevision : 0;
      const [authenticated, activeRevision] = await Promise.all([
        store.getAuthenticatedUserForSession(userId, sessionRevision),
        store.getActiveUserSessionRevision(userId)
      ]);
      return {
        activeRevision,
        authenticated: authenticated?.user.id === userId
      };
    }

    if (command === "session-reset") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const identifier = typeof input.identifier === "string" ? input.identifier : "";
      const beforeRevision = await store.getActiveUserSessionRevision(userId);
      if (!beforeRevision) throw new Error("Session reset fixture user is unavailable.");
      const request = await store.createPasswordResetRequest(identifier);
      if (!request) throw new Error("Session reset request was not created.");
      const reset = await store.resetUserPassword(request.token, "integration-reset-password-12345");
      if (reset.status !== "reset") throw new Error("Session reset did not commit.");
      const [oldSession, replacementSession, replay] = await Promise.all([
        store.getAuthenticatedUserForSession(userId, beforeRevision),
        store.getAuthenticatedUserForSession(userId, reset.sessionRevision),
        store.resetUserPassword(request.token, "integration-reset-password-replay-12345")
      ]);
      return {
        beforeRevision,
        oldSessionRejected: oldSession === null,
        replacementSessionAccepted: replacementSession?.user.id === userId,
        replayRejected: replay.status === "invalid",
        resetRevision: reset.sessionRevision
      };
    }

    if (command === "session-reset-malformed-expiry") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const beforeRevision = await store.getActiveUserSessionRevision(userId);
      if (!beforeRevision) throw new Error("Malformed-expiry fixture user is unavailable.");

      const sql = createDirectIntegrationClient();
      const token = `integration-malformed-expiry-${randomUUID()}`;
      const tokenId = randomUUID();
      try {
        await sql`
          INSERT INTO auth_password_reset_tokens (
            id,
            user_id,
            token_hash,
            expires_at,
            used_at,
            created_at
          ) VALUES (
            ${tokenId},
            ${userId},
            ${hashAuthPasswordResetToken(token)},
            ${"not-a-timestamp"},
            ${null},
            ${new Date().toISOString()}
          )
        `;

        const reset = await store.resetUserPassword(token, "integration-malformed-password-12345");
        const [afterRevision, tokenRows] = await Promise.all([
          store.getActiveUserSessionRevision(userId),
          sql<Array<{ used_at: string | null }>>`
            SELECT used_at FROM auth_password_reset_tokens WHERE id = ${tokenId}
          `
        ]);
        return {
          resetRejected: reset.status === "invalid",
          revisionUnchanged: afterRevision === beforeRevision,
          tokenStillUnused: tokenRows[0]?.used_at === null
        };
      } finally {
        await sql`DELETE FROM auth_password_reset_tokens WHERE id = ${tokenId}`;
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "session-reset-rollback") {
      const userId = typeof input.userId === "string" ? input.userId : "";
      const identifier = typeof input.identifier === "string" ? input.identifier : "";
      const beforeRevision = await store.getActiveUserSessionRevision(userId);
      if (!beforeRevision) throw new Error("Session rollback fixture user is unavailable.");
      const request = await store.createPasswordResetRequest(identifier);
      if (!request) throw new Error("Session rollback reset request was not created.");

      const sql = createDirectIntegrationClient();
      let snapshotUser: Record<string, unknown> | null = null;
      let tokenId = "";
      try {
        const stateRows = await sql<Array<{ payload: unknown }>>`
          SELECT payload FROM app_state WHERE id = 'primary'
        `;
        const payload = typeof stateRows[0]?.payload === "string"
          ? JSON.parse(stateRows[0].payload) as Record<string, unknown>
          : stateRows[0]?.payload as Record<string, unknown> | undefined;
        const users = Array.isArray(payload?.users) ? payload.users as Array<Record<string, unknown>> : [];
        snapshotUser = users.find((candidate) => candidate.id === userId) ?? null;
        if (!snapshotUser) throw new Error("Session rollback snapshot user is unavailable.");
        const tokenRows = await sql<Array<{ id: string }>>`
          SELECT id
          FROM auth_password_reset_tokens
          WHERE user_id = ${userId}
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `;
        tokenId = tokenRows[0]?.id ?? "";
        if (!tokenId) throw new Error("Session rollback token row is unavailable.");

        await sql`
          UPDATE app_state AS state
          SET payload = jsonb_set(
                state.payload,
                '{users}',
                COALESCE((
                  SELECT jsonb_agg(user_record ORDER BY ordinal)
                  FROM jsonb_array_elements(state.payload->'users')
                    WITH ORDINALITY AS user_records(user_record, ordinal)
                  WHERE user_record->>'id' <> ${userId}
                ), '[]'::jsonb),
                FALSE
              ),
              revision = revision + 1
          WHERE state.id = 'primary'
        `;

        let resetRolledBack = false;
        try {
          await store.resetUserPassword(request.token, "integration-rollback-password-12345");
        } catch {
          resetRolledBack = true;
        }
        const hotRows = await sql<Array<{ session_revision: number }>>`
          SELECT session_revision FROM auth_users WHERE id = ${userId}
        `;
        const tokenState = await sql<Array<{ used_at: string | null }>>`
          SELECT used_at FROM auth_password_reset_tokens WHERE id = ${tokenId}
        `;
        return {
          resetRolledBack,
          revisionUnchanged: hotRows[0]?.session_revision === beforeRevision,
          tokenStillUnused: tokenState[0]?.used_at === null
        };
      } finally {
        if (snapshotUser) {
          await sql`
            UPDATE auth_users
            SET password_hash = ${String(snapshotUser.password_hash ?? "")},
                password_salt = ${String(snapshotUser.password_salt ?? "")},
                password_must_change = ${snapshotUser.password_must_change === true},
                session_revision = ${Number(snapshotUser.session_revision ?? 1)},
                disabled_at = ${typeof snapshotUser.disabled_at === "string" ? snapshotUser.disabled_at : null}
            WHERE id = ${userId}
          `;
          await sql`
            UPDATE app_state AS state
            SET payload = jsonb_set(
                  jsonb_set(
                    state.payload,
                    '{users}',
                    (state.payload->'users') || jsonb_build_array(${JSON.stringify(snapshotUser)}::jsonb),
                    FALSE
                  ),
                  '{password_reset_tokens}',
                  COALESCE((
                    SELECT jsonb_agg(token_record ORDER BY ordinal)
                    FROM jsonb_array_elements(state.payload->'password_reset_tokens')
                      WITH ORDINALITY AS token_records(token_record, ordinal)
                    WHERE token_record->>'id' <> ${tokenId}
                  ), '[]'::jsonb),
                  FALSE
                ),
                revision = revision + 1
            WHERE state.id = 'primary'
          `;
        }
        if (tokenId) {
          await sql`DELETE FROM auth_password_reset_tokens WHERE id = ${tokenId}`;
        }
        await sql.end({ timeout: 5 });
      }
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
