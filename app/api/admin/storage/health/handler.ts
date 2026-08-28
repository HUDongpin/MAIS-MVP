import { NextResponse } from "next/server";
import type { requireAuthenticatedUser } from "@/lib/server/auth";
import type { getStorageReadinessSnapshot } from "@/lib/server/userStore";

type StorageHealthRouteDependencies = {
  authenticate: typeof requireAuthenticatedUser;
  readStorageReadinessSnapshot: typeof getStorageReadinessSnapshot;
};

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

type StorageReadinessSnapshot = Awaited<ReturnType<typeof getStorageReadinessSnapshot>>;

function storageHealthSafeDto(snapshot: StorageReadinessSnapshot) {
  const counts = snapshot.hotAuthTables.counts;
  return {
    configuredPath: snapshot.configuredPath,
    configuredUrl: "configuredUrl" in snapshot && snapshot.configuredUrl === true,
    durableReady: snapshot.durableReady,
    hotAuthTables: {
      counts: counts
        ? {
            auth_password_reset_tokens: counts.auth_password_reset_tokens,
            auth_student_profiles: counts.auth_student_profiles,
            auth_user_settings: counts.auth_user_settings,
            auth_users: counts.auth_users
          }
        : null,
      mode: snapshot.hotAuthTables.mode,
      readEnabled: snapshot.hotAuthTables.readEnabled,
      shadowSyncOnPostgres: snapshot.hotAuthTables.shadowSyncOnPostgres,
      tablesReady: snapshot.hotAuthTables.tablesReady
    },
    provider: snapshot.provider,
    runtime: snapshot.runtime,
    status: snapshot.status,
    usingTmpFallback: snapshot.usingTmpFallback
  };
}

export function createStorageHealthRouteHandler({
  authenticate,
  readStorageReadinessSnapshot
}: StorageHealthRouteDependencies) {
  return async function handleStorageHealthRequest(request: Request) {
    let authenticated: Awaited<ReturnType<typeof authenticate>>;
    try {
      authenticated = await authenticate(request);
    } catch {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    if (!authenticated) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: privateNoStoreHeaders }
      );
    }

    if (authenticated.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin role required." },
        { status: 403, headers: privateNoStoreHeaders }
      );
    }

    try {
      const snapshot = await readStorageReadinessSnapshot({ includeDiagnosticsCounts: true });
      return NextResponse.json(
        { storage: storageHealthSafeDto(snapshot) },
        { headers: privateNoStoreHeaders }
      );
    } catch {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
  };
}
