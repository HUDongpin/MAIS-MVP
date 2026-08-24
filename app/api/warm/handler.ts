import { NextResponse } from "next/server";

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
    const secret = readCronSecret()?.trim();
    if (!secret) {
      return NextResponse.json(
        { error: "Warm endpoint unavailable." },
        { status: 503, headers: privateNoStoreHeaders }
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
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
