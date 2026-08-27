import process from "node:process";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
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

    if (command === "force-bootstrap") {
      await store.__userStoreAiTutorPostgresTestHooks.forceBootstrap();
      return { bootstrapped: true };
    }

    if (command === "strict-readiness") {
      const sql = createDirectIntegrationClient();
      try {
        return {
          ready: await store.probePostgresDurableReadinessStrict(sql as never, {
            id: "primary",
            tenantId: "platform",
            stateKind: "app-snapshot",
            schemaVersion: 1
          }) === true
        };
      } finally {
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "production-schema-inspect") {
      const sql = createDirectIntegrationClient();
      try {
        return {
          state: await store.inspectPostgresStorageSchemaForProductionGate(sql)
        };
      } finally {
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "production-schema-complete-legacy") {
      const sql = createDirectIntegrationClient();
      try {
        await store.__userStorePostgresStorageReadinessTestHooks
          .completeLegacyReadinessMarker(sql);
        return { completed: true };
      } finally {
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "production-schema-upgrade-legacy-v1") {
      const sql = createDirectIntegrationClient();
      try {
        await store.__userStorePostgresStorageReadinessTestHooks
          .upgradeLegacyV1CompatibilityAndReadiness(sql);
        return { upgraded: true };
      } finally {
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "hot-auth-readiness") {
      const sql = createDirectIntegrationClient();
      try {
        return {
          ready: await store.countPostgresHotAuthRowsForAdminDiagnostics(sql as never) !== null
        };
      } finally {
        await sql.end({ timeout: 5 });
      }
    }

    if (command === "reattest-readiness") {
      await store.__userStorePostgresStorageReadinessTestHooks.reattestCurrentSnapshot();
      return { reattested: true };
    }

    if (command === "read-full-snapshot") {
      await store.__userStorePostgresStorageReadinessTestHooks.readCurrentSnapshot();
      return { read: true };
    }

    if (command === "guardian-invitation-read") {
      return {
        invitations: await store.__userStorePostgresStorageReadinessTestHooks
          .readGuardianInvitationProjection()
      };
    }

    if (command === "full-snapshot-rewrite") {
      await store.__userStorePostgresStorageReadinessTestHooks.rewriteCurrentSnapshot();
      return { rewritten: true };
    }

    if (command === "full-snapshot-fault") {
      const mode = input.mode;
      if (
        mode !== "suppress-returning"
        && mode !== "rewrite-returning"
        && mode !== "post-returning-drift"
      ) {
        throw new Error("Full snapshot fault mode is invalid.");
      }
      const stages: string[] = [];
      store.__userStorePostgresStorageReadinessTestHooks.configureFullWriterFault({
        mode,
        observeStage: (stage) => {
          stages.push(stage);
        }
      });
      try {
        await store.__userStorePostgresStorageReadinessTestHooks.rewriteCurrentSnapshot();
        return { rejected: false, stages };
      } catch {
        return {
          rejected: true,
          rejectedAt: stages.at(-1) ?? "before-capability",
          stages
        };
      } finally {
        store.__userStorePostgresStorageReadinessTestHooks.clearFullWriterFault();
      }
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
      const sql = createDirectIntegrationClient();

      const captureRollbackEvidence = async () => {
        const [stateRows, markerRows, authUserRows, tokenRows] = await Promise.all([
          sql<Array<Record<string, unknown>>>`
            SELECT
              id,
              tenant_id,
              state_kind,
              schema_version,
              revision::text AS revision,
              payload,
              updated_at::text AS updated_at
            FROM public.app_state
            WHERE id = 'primary'
            ORDER BY id
          `,
          sql<Array<Record<string, unknown>>>`
            SELECT
              state_id,
              tenant_id,
              state_kind,
              schema_version,
              state_revision::text AS state_revision,
              contract_version,
              attested_at::text AS attested_at
            FROM public.app_state_readiness_markers
            WHERE state_id = 'primary'
            ORDER BY state_id, tenant_id, state_kind, schema_version
          `,
          sql<Array<Record<string, unknown>>>`
            SELECT
              id,
              username,
              normalized_username,
              email,
              normalized_email,
              password_hash,
              password_salt,
              school_id,
              password_must_change,
              session_revision,
              disabled_at,
              role,
              created_at
            FROM public.auth_users
            WHERE id = ${userId}
            ORDER BY id
          `,
          sql<Array<Record<string, unknown>>>`
            SELECT id, user_id, token_hash, expires_at, used_at, created_at
            FROM public.auth_password_reset_tokens
            WHERE user_id = ${userId}
            ORDER BY created_at, id
          `
        ]);
        if (stateRows.length !== 1 || authUserRows.length !== 1) {
          throw new Error("Session rollback evidence is unavailable.");
        }
        return { stateRows, markerRows, authUserRows, tokenRows };
      };

      const originalEvidence = await captureRollbackEvidence();
      try {
        const fixtureCreatedAt = new Date().toISOString();
        const cleanupTokenRecords = [
          {
            id: `integration-reset-cleanup-used-${randomUUID()}`,
            user_id: userId,
            token_hash: `integration-reset-cleanup-used-${randomUUID()}`,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            used_at: fixtureCreatedAt,
            created_at: fixtureCreatedAt
          },
          {
            id: `integration-reset-cleanup-expired-${randomUUID()}`,
            user_id: userId,
            token_hash: `integration-reset-cleanup-expired-${randomUUID()}`,
            expires_at: new Date(Date.now() - 60_000).toISOString(),
            used_at: null,
            created_at: fixtureCreatedAt
          },
          {
            id: `integration-reset-cleanup-malformed-${randomUUID()}`,
            user_id: userId,
            token_hash: `integration-reset-cleanup-malformed-${randomUUID()}`,
            expires_at: "not-a-timestamp",
            used_at: null,
            created_at: fixtureCreatedAt
          }
        ];
        const cleanupTokenIds = cleanupTokenRecords.map((record) => record.id);
        await sql.begin(async (fixtureSql) => {
          const fixtureStateRows = await fixtureSql<Array<{ revision: unknown }>>`
            UPDATE public.app_state AS state
            SET payload = state.payload || pg_catalog.jsonb_build_object(
                  'password_reset_tokens',
                  CASE
                    WHEN pg_catalog.jsonb_typeof(state.payload->'password_reset_tokens') = 'array'
                      THEN state.payload->'password_reset_tokens'
                    ELSE '[]'::pg_catalog.jsonb
                  END || ${fixtureSql.json(cleanupTokenRecords)}::pg_catalog.jsonb
                ),
                revision = revision + 1,
                updated_at = pg_catalog.now()
            WHERE state.id = 'primary'
              AND state.tenant_id = 'platform'
              AND state.state_kind = 'app-snapshot'
              AND state.schema_version = 1
            RETURNING revision
          `;
          if (fixtureStateRows.length !== 1) {
            throw new Error("Session rollback cleanup fixture could not be installed.");
          }
          await fixtureSql`
            INSERT INTO public.auth_password_reset_tokens ${fixtureSql(
              cleanupTokenRecords,
              "id",
              "user_id",
              "token_hash",
              "expires_at",
              "used_at",
              "created_at"
            )}
          `;
          const fixtureHotRows = await fixtureSql<Array<{ count: number }>>`
            SELECT COUNT(*)::int AS count
            FROM public.auth_password_reset_tokens
            WHERE id = ANY(${cleanupTokenIds}::text[])
          `;
          if (fixtureHotRows[0]?.count !== cleanupTokenIds.length) {
            throw new Error("Session rollback cleanup fixture did not reach the hot table.");
          }
        });
        await store.__userStorePostgresStorageReadinessTestHooks.reattestCurrentSnapshot();

        const request = await store.createPasswordResetRequest(identifier);
        if (!request) throw new Error("Session rollback reset request was not created.");
        const requestTokenHash = hashAuthPasswordResetToken(request.token);
        const rollbackBaseline = await captureRollbackEvidence();
        const baselinePayload = rollbackBaseline.stateRows[0]?.payload;
        const baselineTokens = baselinePayload
          && typeof baselinePayload === "object"
          && !Array.isArray(baselinePayload)
          && Array.isArray((baselinePayload as Record<string, unknown>).password_reset_tokens)
          ? (baselinePayload as { password_reset_tokens: Array<Record<string, unknown>> }).password_reset_tokens
          : [];
        const baselineHotRequestRows = rollbackBaseline.tokenRows.filter(
          (record) => record.token_hash === requestTokenHash
        );
        const baselineSnapshotRequestRows = baselineTokens.filter(
          (record) => record.token_hash === requestTokenHash
        );
        const cleanupSymmetric = cleanupTokenIds.every((id) => (
          !rollbackBaseline.tokenRows.some((record) => record.id === id)
          && !baselineTokens.some((record) => record.id === id)
        ))
          && baselineHotRequestRows.length === 1
          && baselineSnapshotRequestRows.length === 1
          && baselineHotRequestRows[0]?.id === baselineSnapshotRequestRows[0]?.id;

        await store.__userStorePostgresStorageReadinessTestHooks.rewriteCurrentSnapshot();
        const afterFullRewrite = await captureRollbackEvidence();
        const rewrittenPayload = afterFullRewrite.stateRows[0]?.payload;
        const rewrittenTokens = rewrittenPayload
          && typeof rewrittenPayload === "object"
          && !Array.isArray(rewrittenPayload)
          && Array.isArray((rewrittenPayload as Record<string, unknown>).password_reset_tokens)
          ? (rewrittenPayload as { password_reset_tokens: Array<Record<string, unknown>> }).password_reset_tokens
          : [];
        const fullRewriteDidNotResurrect = cleanupTokenIds.every((id) => (
          !afterFullRewrite.tokenRows.some((record) => record.id === id)
          && !rewrittenTokens.some((record) => record.id === id)
        ));
        const resetRollbackBaseline = afterFullRewrite;

        let resetRolledBack = false;
        store.__userStorePostgresStorageReadinessTestHooks.failPasswordResetBeforeStateWrite = () => {
          throw new Error("Integration password reset rollback failpoint.");
        };
        try {
          await store.resetUserPassword(request.token, "integration-rollback-password-12345");
        } catch (error) {
          resetRolledBack = error instanceof Error
            && error.message === "Integration password reset rollback failpoint.";
        } finally {
          store.__userStorePostgresStorageReadinessTestHooks.failPasswordResetBeforeStateWrite = null;
        }
        const afterRollback = await captureRollbackEvidence();
        return {
          resetRolledBack,
          stateExact: isDeepStrictEqual(afterRollback.stateRows, resetRollbackBaseline.stateRows),
          markerExact: isDeepStrictEqual(afterRollback.markerRows, resetRollbackBaseline.markerRows),
          authExact: isDeepStrictEqual(afterRollback.authUserRows, resetRollbackBaseline.authUserRows),
          tokensExact: isDeepStrictEqual(afterRollback.tokenRows, resetRollbackBaseline.tokenRows),
          cleanupSymmetric,
          fullRewriteDidNotResurrect
        };
      } finally {
        store.__userStorePostgresStorageReadinessTestHooks.failPasswordResetBeforeStateWrite = null;
        const originalState = originalEvidence.stateRows[0];
        const originalAuthUser = originalEvidence.authUserRows[0];
        if (!originalState || !originalAuthUser) {
          throw new Error("Session rollback restoration evidence is unavailable.");
        }
        await sql.begin(async (restoreSql) => {
          const restoredStateRows = await restoreSql<Array<{ id: string }>>`
            UPDATE public.app_state
            SET tenant_id = ${originalState.tenant_id as string},
                state_kind = ${originalState.state_kind as string},
                schema_version = ${originalState.schema_version as number},
                revision = ${originalState.revision as string}::bigint,
                payload = ${restoreSql.json(
                  originalState.payload as Parameters<postgres.Sql["json"]>[0]
                )}::pg_catalog.jsonb,
                updated_at = ${originalState.updated_at as string}::pg_catalog.timestamptz
            WHERE id = ${originalState.id as string}
            RETURNING id
          `;
          if (restoredStateRows.length !== 1) {
            throw new Error("Session rollback state restoration failed.");
          }
          await restoreSql`DELETE FROM public.auth_password_reset_tokens WHERE user_id = ${userId}`;
          if (originalEvidence.tokenRows.length > 0) {
            await restoreSql`
              INSERT INTO public.auth_password_reset_tokens ${restoreSql(
                originalEvidence.tokenRows,
                "id",
                "user_id",
                "token_hash",
                "expires_at",
                "used_at",
                "created_at"
              )}
            `;
          }
          await restoreSql`
            INSERT INTO public.auth_users ${restoreSql(
              [originalAuthUser],
              "id",
              "username",
              "normalized_username",
              "email",
              "normalized_email",
              "password_hash",
              "password_salt",
              "school_id",
              "password_must_change",
              "session_revision",
              "disabled_at",
              "role",
              "created_at"
            )}
            ON CONFLICT (id) DO UPDATE SET
              username = excluded.username,
              normalized_username = excluded.normalized_username,
              email = excluded.email,
              normalized_email = excluded.normalized_email,
              password_hash = excluded.password_hash,
              password_salt = excluded.password_salt,
              school_id = excluded.school_id,
              password_must_change = excluded.password_must_change,
              session_revision = excluded.session_revision,
              disabled_at = excluded.disabled_at,
              role = excluded.role,
              created_at = excluded.created_at
          `;
          await restoreSql`
            DELETE FROM public.app_state_readiness_markers
            WHERE state_id = 'primary'
          `;
          if (originalEvidence.markerRows.length > 0) {
            await restoreSql`
              INSERT INTO public.app_state_readiness_markers ${restoreSql(
                originalEvidence.markerRows,
                "state_id",
                "tenant_id",
                "state_kind",
                "schema_version",
                "state_revision",
                "contract_version",
                "attested_at"
              )}
            `;
          }
        });
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
