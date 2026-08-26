import { NextResponse } from "next/server";
import {
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser
} from "@/lib/server/auth";

type ParentAuthenticatedIdentity = { user: { id: string } };

function applyParentPrivateCacheBoundary(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  return response;
}

export function parentPrivateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  return applyParentPrivateCacheBoundary(response);
}

export function guardExpectedParentUser(
  authenticated: ParentAuthenticatedIdentity,
  request: Request
) {
  const constraints = expectedUserConstraintsFromRequest(request);
  const conflict = guardExpectedAuthenticatedUser(
    authenticated,
    constraints.length > 0 ? constraints : [null]
  );
  return conflict ? applyParentPrivateCacheBoundary(conflict) : null;
}

export function parentPersistenceUnavailable() {
  return parentPrivateJson(
    { error: "Parent data temporarily unavailable." },
    { status: 503 }
  );
}
