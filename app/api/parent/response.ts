import { NextResponse } from "next/server";

export function parentPrivateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  return response;
}

export function parentPersistenceUnavailable() {
  return parentPrivateJson(
    { error: "Parent data temporarily unavailable." },
    { status: 503 }
  );
}
