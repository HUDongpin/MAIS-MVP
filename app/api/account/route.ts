import { NextResponse } from "next/server";
import { ACCOUNT_ERASURE_CONFIRMATION_PHRASE } from "@/lib/accountErasure";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import {
  authRateLimitRules,
  consumeAuthRateLimit,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { eraseUserAccount } from "@/lib/server/userStore";

export const runtime = "nodejs";

/**
 * Phrase the caller must echo back. Guards against a mis-fired client and, since
 * it has to arrive in a JSON body, against a cross-site form post — a simple
 * cross-origin request cannot set `content-type: application/json`.
 *
 * Shared with the deletion page so the form and the check cannot drift.
 */
const CONFIRMATION_PHRASE = ACCOUNT_ERASURE_CONFIRMATION_PHRASE;

const deniedStatus: Record<string, number> = {
  "subject-not-found": 404,
  "requester-not-found": 401,
  "not-authorized": 403,
  "seeded-account-protected": 409,
  "media-erasure-failed": 503
};

/**
 * Account deletion / data erasure.
 *
 * Erasure is immediate and irreversible; there is no soft-delete window, because
 * a district DPA's destruction clause has to be technically honourable on
 * request. The account holder, an active guardian, and a school admin may all
 * invoke it — under COPPA the right belongs to the parent, not only to the child
 * holding the login.
 */
export async function DELETE(request: Request) {
  return withAuthRouteJsonBoundary("account-delete", () => handleAccountDelete(request));
}

async function handleAccountDelete(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rateLimited = consumeAuthRateLimit({
    request,
    scope: "account-delete-user",
    subject: authenticated.user.id,
    rule: authRateLimitRules.accountDeleteUser
  });
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { confirmation, subjectId } = (body ?? {}) as { confirmation?: unknown; subjectId?: unknown };
  if (confirmation !== CONFIRMATION_PHRASE) {
    return NextResponse.json(
      {
        code: "confirmation-required",
        error: `Send { "confirmation": "${CONFIRMATION_PHRASE}" } to confirm this permanently erases the account.`
      },
      { status: 400 }
    );
  }

  const targetId = typeof subjectId === "string" && subjectId.trim() ? subjectId.trim() : authenticated.user.id;

  const result = await eraseUserAccount({
    requesterId: authenticated.user.id,
    subjectId: targetId
  });

  if (result.status === "denied") {
    return NextResponse.json(
      { code: result.code, error: result.message },
      { status: deniedStatus[result.code] ?? 403 }
    );
  }

  const response = NextResponse.json({ receipt: result.receipt });

  // The subject's own session is now backed by a user record that no longer
  // exists; clear it so the browser stops presenting a dead credential.
  if (targetId === authenticated.user.id) {
    response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(request, 0) });
  }

  return response;
}
