import { NextResponse } from "next/server";
import { bodyExpectedUserConstraints, expectedUserConstraintsFromRequest, guardExpectedAuthenticatedUser, requireAuthenticatedUser } from "@/lib/server/auth";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { deleteUserAccount, withAuthenticatedMutation } from "@/lib/server/userStore";
import { learnerAuthorityFailureResponse } from "@/lib/server/learnerAuthorityState";

export const runtime = "nodejs";

/**
 * Self-serve account deletion (data-subject erasure).
 *
 * A child's own request is honoured here too: the account holder is whoever the
 * session belongs to. Guardian-initiated deletion of a child's account goes
 * through the admin endpoint, which does not require the child's credentials.
 */
export async function DELETE(request: Request) {
  return withAuthRouteJsonBoundary("me-account-delete", () => handleDelete(request));
}

async function handleDelete(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Deleting an account is irreversible, so require the caller to say so
  // explicitly rather than letting a stray DELETE erase a learner's history.
  let confirmation: unknown = null;
  try {
    confirmation = await request.json();
  } catch {
    confirmation = null;
  }
  const confirmed =
    typeof confirmation === "object" &&
    confirmation !== null &&
    (confirmation as Record<string, unknown>).confirm === "DELETE";
  if (!confirmed) {
    return NextResponse.json(
      { code: "confirmation-required", error: 'Send {"confirm":"DELETE"} to confirm permanent account deletion.' },
      { status: 400 }
    );
  }

  const conflict = guardExpectedAuthenticatedUser(authenticated, [
    ...expectedUserConstraintsFromRequest(request), ...bodyExpectedUserConstraints(confirmation)
  ], { requireConstraint: true });
  if (conflict) {
    return NextResponse.json(await conflict.json(), { status: conflict.status });
  }

  const result = await withAuthenticatedMutation(authenticated, () => deleteUserAccount(authenticated.user.id,
    { expectedGeneration: authenticated.accountGeneration })).catch(learnerAuthorityFailureResponse);
  if (result instanceof Response) return new NextResponse(result.body, { status: result.status, headers: result.headers });

  if (result.status === "not-found") {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (result.status === "blocked") {
    return NextResponse.json({ code: "deletion-blocked", blockers: result.blockers }, { status: 409 });
  }

  const pending = result.mediaPurge.status === "pending";
  const response = NextResponse.json({
    ok: !pending,
    accountDeleted: true,
    mediaPurgePending: pending,
    ...(pending ? { code: "account-media-erasure-pending", error: "Account deleted; physical media erasure is incomplete. An administrator can retry cleanup for this exact account." } : {}),
    deletedAt: new Date().toISOString(),
    recordsRemoved: result.summary.totalRemoved
  }, { status: pending ? 503 : 200 });
  // The session is now unusable; clear it so the browser does not keep sending it.
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(request, 0) });
  return response;
}
