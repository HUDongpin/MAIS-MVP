import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import postgres from "postgres";

import type { TeacherNoticeResendWebhookEnvelope } from "./teacherNoticeResendWebhook";
import {
  maintainTeacherNoticeResendWebhookPostgres,
  maintainTeacherNoticeResendWebhookSqlite,
  persistTeacherNoticeResendWebhookEventPostgres,
  persistTeacherNoticeResendWebhookEventSqlite,
  type TeacherNoticeResendWebhookMaintenanceOptions,
  type TeacherNoticeResendWebhookMaintenanceResult
} from "./userStore/teacherNoticeResendWebhookPersistence";

type PersistResult = { status: "applied" | "unmatched" | "replayed" | "stale" };

type PersistenceOptions = {
  env?: Record<string, string | undefined>;
  sqlitePersist?: (
    dbPath: string,
    event: TeacherNoticeResendWebhookEnvelope
  ) => Promise<PersistResult>;
  postgresPersist?: (
    postgresUrl: string,
    event: TeacherNoticeResendWebhookEnvelope
  ) => Promise<PersistResult>;
};

type MaintenanceLimits = TeacherNoticeResendWebhookMaintenanceOptions & {
  reconciliationLimit: number;
  retentionLimit: number;
};
type MaintenanceOptions = {
  env?: Record<string, string | undefined>;
  sqliteMaintain?: (
    dbPath: string,
    limits: MaintenanceLimits
  ) => Promise<TeacherNoticeResendWebhookMaintenanceResult>;
  postgresMaintain?: (
    postgresUrl: string,
    limits: MaintenanceLimits
  ) => Promise<TeacherNoticeResendWebhookMaintenanceResult>;
};

let postgresClient: postgres.Sql | null = null;
let postgresClientUrl: string | null = null;

function defaultDbDirectory(env: Record<string, string | undefined>): string {
  if (env.VERCEL || env.VERCEL_ENV) return path.join(tmpdir(), "hk-math-lab");
  return path.join(process.cwd(), ".local");
}

function configuredStorageProvider(
  env: Record<string, string | undefined>
): "sqlite" | "postgres" {
  const provider = env.HK_MATH_STORAGE_PROVIDER?.trim().toLowerCase() || "sqlite";
  if (provider !== "sqlite" && provider !== "postgres") {
    throw new Error("Teacher notice webhook storage provider is unsupported.");
  }
  return provider;
}

async function sqlitePersistence(
  dbPath: string,
  event: TeacherNoticeResendWebhookEnvelope
): Promise<PersistResult> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  return persistTeacherNoticeResendWebhookEventSqlite(dbPath, event);
}

async function postgresPersistence(
  postgresUrl: string,
  event: TeacherNoticeResendWebhookEnvelope
): Promise<PersistResult> {
  if (!postgresClient || postgresClientUrl !== postgresUrl) {
    if (postgresClient) await postgresClient.end({ timeout: 1 });
    postgresClient = postgres(postgresUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
    postgresClientUrl = postgresUrl;
  }
  return persistTeacherNoticeResendWebhookEventPostgres(postgresClient, event);
}

async function postgresMaintenance(
  postgresUrl: string,
  limits: MaintenanceLimits
): Promise<TeacherNoticeResendWebhookMaintenanceResult> {
  if (!postgresClient || postgresClientUrl !== postgresUrl) {
    if (postgresClient) await postgresClient.end({ timeout: 1 });
    postgresClient = postgres(postgresUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
    postgresClientUrl = postgresUrl;
  }
  return maintainTeacherNoticeResendWebhookPostgres(postgresClient, limits);
}

export function createTeacherNoticeResendWebhookPersistence(
  options: PersistenceOptions = {}
) {
  const env = options.env ?? process.env;
  const sqlitePersist = options.sqlitePersist ?? sqlitePersistence;
  const postgresPersist = options.postgresPersist ?? postgresPersistence;

  return async function persistTeacherNoticeResendWebhook(
    event: TeacherNoticeResendWebhookEnvelope
  ): Promise<PersistResult> {
    if (configuredStorageProvider(env) === "postgres") {
      const postgresUrl = env.POSTGRES_URL?.trim();
      if (!postgresUrl) {
        throw new Error("POSTGRES_URL is required when HK_MATH_STORAGE_PROVIDER=postgres.");
      }
      return postgresPersist(postgresUrl, event);
    }

    const dbPath = env.HK_MATH_DB_PATH?.trim()
      ? path.resolve(env.HK_MATH_DB_PATH)
      : path.join(
          path.resolve(env.HK_MATH_DB_DIR?.trim() || defaultDbDirectory(env)),
          "hk-math-db.sqlite"
        );
    return sqlitePersist(dbPath, event);
  };
}

export const persistTeacherNoticeResendWebhook =
  createTeacherNoticeResendWebhookPersistence();

export function createTeacherNoticeResendWebhookMaintenance(
  options: MaintenanceOptions = {}
) {
  const env = options.env ?? process.env;
  const sqliteMaintain = options.sqliteMaintain ?? maintainTeacherNoticeResendWebhookSqlite;
  const postgresMaintain = options.postgresMaintain ?? postgresMaintenance;
  return async function maintainTeacherNoticeResendWebhookForConfiguredStore(
    limits: MaintenanceLimits
  ): Promise<TeacherNoticeResendWebhookMaintenanceResult> {
    if (configuredStorageProvider(env) === "postgres") {
      const postgresUrl = env.POSTGRES_URL?.trim();
      if (!postgresUrl) {
        throw new Error("POSTGRES_URL is required when HK_MATH_STORAGE_PROVIDER=postgres.");
      }
      return postgresMaintain(postgresUrl, limits);
    }
    const dbPath = env.HK_MATH_DB_PATH?.trim()
      ? path.resolve(env.HK_MATH_DB_PATH)
      : path.join(
          path.resolve(env.HK_MATH_DB_DIR?.trim() || defaultDbDirectory(env)),
          "hk-math-db.sqlite"
        );
    return sqliteMaintain(dbPath, limits);
  };
}

export const maintainTeacherNoticeResendWebhook =
  createTeacherNoticeResendWebhookMaintenance();
