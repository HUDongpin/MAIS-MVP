import { NextResponse } from "next/server";
import { safeRelativeAppPath } from "@/lib/authRedirect";
import {
  exchangeGoogleAuthorizationCode as defaultExchangeGoogleAuthorizationCode,
  fetchGoogleJwks as defaultFetchGoogleJwks,
  getGoogleOAuthConfig as defaultGetGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleIdToken as defaultVerifyGoogleIdToken,
  verifyGoogleOAuthState as defaultVerifyGoogleOAuthState,
  type GoogleOAuthConfig,
  type VerifiedGoogleProfile
} from "@/lib/server/googleOAuth";
import { requireAuthenticatedUser as defaultRequireAuthenticatedUser } from "@/lib/server/auth";
import {
  sessionCookieOptions,
  sessionSecretMissingResponse,
  setSessionCookie as defaultSetSessionCookie
} from "@/lib/server/sessionCookie";
import { authenticateGoogleIdentityForLogin as defaultAuthenticateGoogleIdentityForLogin } from "@/lib/server/userStore";
import type { CurriculumProfile, GradeId, Language, ThemeMode } from "@/types";

type GoogleCallbackAuthenticatedSession = {
  user: {
    id: string;
    role?: "student" | "teacher" | "parent" | "admin";
  };
};

export type GoogleCallbackDependencies = {
  verifyGoogleOAuthState: (input: {
    state: string;
    cookieValue: string;
  }) => Promise<{
    status: "invalid";
  } | {
    status: "valid";
    payload: {
      nonce: string;
      codeVerifier: string;
      linkUserId?: string;
      next: string;
      role: "student" | "parent" | "teacher";
      studentAge13OrOlder?: true;
      grade?: GradeId;
      curriculumProfile?: CurriculumProfile;
      language?: Language;
      theme?: ThemeMode;
    };
  }>;
  getGoogleOAuthConfig: () => GoogleOAuthConfig | null;
  exchangeGoogleAuthorizationCode: (input: {
    code: string;
    codeVerifier: string;
    config: GoogleOAuthConfig;
  }) => Promise<{ status: "ok"; idToken: string } | { status: "invalid" }>;
  fetchGoogleJwks: () => Promise<{ keys: JsonWebKey[] } | null>;
  verifyGoogleIdToken: (input: {
    idToken: string;
    clientId: string;
    expectedNonce: string;
    jwks: { keys: JsonWebKey[] };
  }) => Promise<{ status: "valid"; profile: VerifiedGoogleProfile } | { status: "invalid" }>;
  requireAuthenticatedUser?: (request: Request) => Promise<{ user: { id: string } } | null>;
  authenticateGoogleIdentityForLogin: (input: {
    providerSubject: string;
    email: string;
    emailVerified: true;
    emailAuthoritative: boolean;
    authenticatedUserId?: string;
    displayName?: string;
    requestedRole: "student" | "parent" | "teacher";
    studentAge13OrOlder?: boolean;
    grade?: GradeId;
    curriculumProfile?: CurriculumProfile;
    language?: Language;
    theme?: ThemeMode;
  }) => Promise<
    | { status: "teacher-invite-required" }
    | { status: "account-link-required" }
    | { status: "account-link-conflict" }
    | { status: "account-link-email-mismatch" }
    | { status: "invalid" }
    | { status: "created" | "linked" | "authenticated"; session: GoogleCallbackAuthenticatedSession }
  >;
  setSessionCookie: (response: NextResponse, userId: string, request: Request) => Promise<void>;
};

const defaultDependencies: GoogleCallbackDependencies = {
  verifyGoogleOAuthState: defaultVerifyGoogleOAuthState,
  getGoogleOAuthConfig: defaultGetGoogleOAuthConfig,
  exchangeGoogleAuthorizationCode: defaultExchangeGoogleAuthorizationCode,
  fetchGoogleJwks: defaultFetchGoogleJwks,
  verifyGoogleIdToken: defaultVerifyGoogleIdToken,
  requireAuthenticatedUser: defaultRequireAuthenticatedUser,
  authenticateGoogleIdentityForLogin: defaultAuthenticateGoogleIdentityForLogin,
  setSessionCookie: defaultSetSessionCookie
};

function readCookie(header: string | null, name: string) {
  if (!header) return "";

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function redirectToLogin(request: Request, error: string, resumeGoogleLink = false) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("googleError", error);
  if (resumeGoogleLink) loginUrl.searchParams.set("next", "/login?googleLink=1");
  return finalizeCallbackResponse(NextResponse.redirect(loginUrl), request);
}

function workspaceForRole(role?: "student" | "teacher" | "parent" | "admin") {
  if (role === "teacher" || role === "admin") return "/teacher/dashboard";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

function nextPathStartsWith(value: string, root: string) {
  return value === root || value.startsWith(`${root}/`);
}

function safeWorkspaceTarget(value: string, role?: "student" | "teacher" | "parent" | "admin") {
  const fallback = workspaceForRole(role);
  const safeValue = safeRelativeAppPath(value, fallback);
  if (role === "teacher" || role === "admin") {
    return nextPathStartsWith(safeValue, "/teacher") ? safeValue : fallback;
  }
  if (role === "parent") return nextPathStartsWith(safeValue, "/parent") ? safeValue : fallback;
  if (role === "student" && (nextPathStartsWith(safeValue, "/teacher") || nextPathStartsWith(safeValue, "/parent"))) {
    return fallback;
  }
  return safeValue;
}

function clearGoogleStateCookie(response: NextResponse, request: Request) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    ...sessionCookieOptions(request, 0)
  });
}

function finalizeCallbackResponse(response: NextResponse, request: Request) {
  clearGoogleStateCookie(response, request);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function handleGoogleOAuthCallback(
  request: Request,
  dependencies: GoogleCallbackDependencies = defaultDependencies
) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!state) return redirectToLogin(request, "state_invalid");

  let pendingState: Awaited<ReturnType<GoogleCallbackDependencies["verifyGoogleOAuthState"]>>;
  try {
    pendingState = await dependencies.verifyGoogleOAuthState({
      state,
      cookieValue: readCookie(request.headers.get("cookie"), GOOGLE_OAUTH_STATE_COOKIE)
    });
  } catch {
    return redirectToLogin(request, "state_invalid");
  }
  if (pendingState.status !== "valid") return redirectToLogin(request, "state_invalid");
  if (url.searchParams.get("error")) return redirectToLogin(request, "provider_denied");
  if (!code) return redirectToLogin(request, "state_invalid");

  const config = dependencies.getGoogleOAuthConfig();
  if (!config) return redirectToLogin(request, "setup");

  let verified: { status: "valid"; profile: VerifiedGoogleProfile } | { status: "invalid" };
  try {
    const token = await dependencies.exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: pendingState.payload.codeVerifier,
      config
    });
    if (token.status !== "ok") return redirectToLogin(request, "provider_token_invalid");

    const jwks = await dependencies.fetchGoogleJwks();
    if (!jwks) return redirectToLogin(request, "provider_jwks_unavailable");

    verified = await dependencies.verifyGoogleIdToken({
      idToken: token.idToken,
      clientId: config.clientId,
      expectedNonce: pendingState.payload.nonce,
      jwks
    });
  } catch {
    return redirectToLogin(request, "provider_unavailable");
  }
  if (verified.status !== "valid") return redirectToLogin(request, "provider_identity_invalid");

  let currentAuthenticatedUser: { user: { id: string } } | null = null;
  try {
    currentAuthenticatedUser = dependencies.requireAuthenticatedUser
      ? await dependencies.requireAuthenticatedUser(request)
      : null;
  } catch {
    return redirectToLogin(request, "account_unavailable");
  }
  const currentAuthenticatedUserId = currentAuthenticatedUser?.user.id;
  if (
    pendingState.payload.linkUserId &&
    pendingState.payload.linkUserId !== currentAuthenticatedUserId
  ) {
    return redirectToLogin(request, "account_link_session_changed");
  }
  const authenticatedUserId = pendingState.payload.linkUserId
    ? currentAuthenticatedUserId
    : undefined;

  let authenticated: Awaited<ReturnType<GoogleCallbackDependencies["authenticateGoogleIdentityForLogin"]>>;
  try {
    authenticated = await dependencies.authenticateGoogleIdentityForLogin({
      providerSubject: verified.profile.subject,
      email: verified.profile.email,
      emailVerified: verified.profile.emailVerified,
      emailAuthoritative: verified.profile.emailAuthoritative,
      authenticatedUserId,
      displayName: verified.profile.name,
      requestedRole: pendingState.payload.role,
      studentAge13OrOlder: pendingState.payload.studentAge13OrOlder === true,
      grade: pendingState.payload.grade,
      curriculumProfile: pendingState.payload.curriculumProfile,
      language: pendingState.payload.language,
      theme: pendingState.payload.theme
    });
  } catch {
    return redirectToLogin(request, "account_unavailable");
  }

  if (authenticated.status === "teacher-invite-required") {
    return redirectToLogin(request, "teacher_invite_required");
  }
  if (authenticated.status === "account-link-required") {
    return redirectToLogin(request, "account_link_required", true);
  }
  if (
    authenticated.status === "account-link-conflict" ||
    authenticated.status === "account-link-email-mismatch"
  ) {
    return redirectToLogin(request, "account_link_failed");
  }
  if (authenticated.status === "invalid") return redirectToLogin(request, "account_invalid");

  const targetPath = safeWorkspaceTarget(pendingState.payload.next, authenticated.session.user.role);
  const response = finalizeCallbackResponse(NextResponse.redirect(new URL(targetPath, request.url)), request);
  try {
    await dependencies.setSessionCookie(response, authenticated.session.user.id, request);
  } catch {
    return finalizeCallbackResponse(sessionSecretMissingResponse(), request);
  }
  return response;
}
