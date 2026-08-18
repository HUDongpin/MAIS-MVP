import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { deleteUserAccount } from "@/lib/server/userStore";

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

  const result = await deleteUserAccount(authenticated.user.id);

  if (result.status === "not-found") {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (result.status === "blocked") {
    return NextResponse.json({ code: "deletion-blocked", blockers: result.blockers }, { status: 409 });
  }

  const response = NextResponse.json({
    ok: true,
    deletedAt: new Date().toISOString(),
    recordsRemoved: result.summary.totalRemoved
  });
  // The session is now unusable; clear it so the browser does not keep sending it.
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(request, 0) });
  return response;
}
