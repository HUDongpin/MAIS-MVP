import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { getActiveUserSessionRevision } from "@/lib/server/userStore/auth";

export type SessionCookieIssuanceErrorCode =
  | "authenticated-revision-invalid"
  | "account-inactive"
  | "revision-mismatch"
  | "storage-unavailable"
  | "session-service-unavailable";

export class SessionCookieIssuanceError extends Error {
  readonly code: SessionCookieIssuanceErrorCode;

  constructor(code: SessionCookieIssuanceErrorCode) {
    super("The authenticated session cookie could not be issued.");
    this.name = "SessionCookieIssuanceError";
    this.code = code;
  }
}

function shouldUseSecureCookie(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  return forwardedProto === "https" || new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookie(request)
  };
}

export function clearSessionCookie(response: NextResponse, request: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(request, 0)
  });
}

export function sessionCookieFailureResponse(
  error: unknown,
  request: Request,
  context: { committedAction?: "account-created" | "identity-linked" | "password-updated" } = {}
) {
  const code = error instanceof SessionCookieIssuanceError
    ? error.code
    : "session-service-unavailable";
  const accountStateFailure = code === "account-inactive";
  const revisionFailure = code === "authenticated-revision-invalid" || code === "revision-mismatch";
  const status = accountStateFailure ? 401 : revisionFailure ? 409 : 503;

  const committedMessage = context.committedAction === "password-updated"
    ? "Your password was updated, but this device could not stay signed in. Sign in again with your new password."
    : context.committedAction === "account-created"
      ? "Your account was created, but this device could not be signed in. Sign in again with your new account."
      : context.committedAction === "identity-linked"
        ? "Your Google identity was linked, but this device could not be signed in. Sign in again with Google."
        : null;
  const response = NextResponse.json(
    {
      code: context.committedAction === "password-updated"
        ? "account-updated-session-refresh-required"
        : context.committedAction === "account-created"
          ? "account-created-session-refresh-required"
          : context.committedAction === "identity-linked"
            ? "identity-linked-session-refresh-required"
          : accountStateFailure
            ? "session-account-inactive"
            : revisionFailure
              ? "session-state-changed"
              : "session-service-unavailable",
      error: committedMessage ?? (
        accountStateFailure
          ? "This account is no longer active. Sign in again when account access is restored."
          : revisionFailure
            ? "The account session changed while signing in. Sign in again."
            : "Sign-in is temporarily unavailable. Try again later."
      ),
      ...(context.committedAction === "account-created" ? { accountCreated: true } : {}),
      ...(context.committedAction === "identity-linked" ? { identityLinked: true } : {}),
      ...(context.committedAction === "password-updated" ? { accountUpdated: true } : {})
    },
    { status }
  );
  clearSessionCookie(response, request);
  return response;
}

export async function setSessionCookie(
  response: NextResponse,
  userId: string,
  request: Request,
  expectedSessionRevision: number
) {
  if (!Number.isSafeInteger(expectedSessionRevision) || expectedSessionRevision < 1) {
    throw new SessionCookieIssuanceError("authenticated-revision-invalid");
  }
  let sessionRevision: number | null;
  try {
    sessionRevision = await getActiveUserSessionRevision(userId);
  } catch {
    throw new SessionCookieIssuanceError("storage-unavailable");
  }
  if (sessionRevision === null) {
    throw new SessionCookieIssuanceError("account-inactive");
  }
  if (expectedSessionRevision !== sessionRevision) {
    throw new SessionCookieIssuanceError("revision-mismatch");
  }

  let token: string;
  try {
    token = await createSessionToken({ userId, sessionRevision });
  } catch {
    throw new SessionCookieIssuanceError("session-service-unavailable");
  }
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions(request, SESSION_MAX_AGE_SECONDS)
  });
}
