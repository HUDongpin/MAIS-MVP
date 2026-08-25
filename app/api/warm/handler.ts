import { NextResponse } from "next/server";

import { authorizeCronBearer } from "@/lib/server/cronAuthorization";

type WarmRouteDependencies = {
  getStorageReadinessSnapshot: () => Promise<{ durableReady?: boolean } | null>;
  now?: () => number;
  readCronSecret: () => string | undefined;
};

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export function createWarmRouteHandler({
  getStorageReadinessSnapshot: readStorageReadinessSnapshot,
  now = Date.now,
  readCronSecret
}: WarmRouteDependencies) {
  return async function handleWarmRequest(request: Request) {
    let secret: string | undefined;
    try {
      secret = readCronSecret();
    } catch {
      return NextResponse.json(
        { error: "Warm endpoint unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    if (!secret) {
      return NextResponse.json(
        { error: "Warm endpoint unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    const authorization = authorizeCronBearer(
      request.headers.get("authorization"),
      secret
    );
    if (authorization === "unavailable") {
      return NextResponse.json(
        { error: "Warm endpoint unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    if (authorization === "unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401, headers: privateNoStoreHeaders }
      );
    }

    const startedAt = now();
    let storageReady = false;
    try {
      const snapshot = await readStorageReadinessSnapshot();
      storageReady = Boolean(snapshot?.durableReady);
    } catch {
      storageReady = false;
    }

    return NextResponse.json(
      { warm: true, storageReady, warmedInMs: Math.max(0, now() - startedAt) },
      { headers: privateNoStoreHeaders }
    );
  };
}
