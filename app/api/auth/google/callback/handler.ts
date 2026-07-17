import { NextResponse } from "next/server";
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
      next: string;
      role: "student" | "parent" | "teacher";
      grade?: GradeId;
      curriculumProfile?: CurriculumProfile;
      language?: Language;
      theme?: ThemeMode;
    };
  }>;
  getGoogleOAuthConfig: () => GoogleOAuthConfig | null;
  exchangeGoogleAuthorizationCode: (input: {
    code: string;
    config: GoogleOAuthConfig;
  }) => Promise<{ status: "ok"; idToken: string } | { status: "invalid" }>;
  fetchGoogleJwks: () => Promise<{ keys: JsonWebKey[] } | null>;
  verifyGoogleIdToken: (input: {
    idToken: string;
    clientId: string;
    expectedNonce: string;
    jwks: { keys: JsonWebKey[] };
  }) => Promise<{ status: "valid"; profile: VerifiedGoogleProfile } | { status: "invalid" }>;
  authenticateGoogleIdentityForLogin: (input: {
    providerSubject: string;
    email: string;
    emailVerified: true;
    displayName?: string;
    requestedRole: "student" | "parent" | "teacher";
    grade?: GradeId;
    curriculumProfile?: CurriculumProfile;
    language?: Language;
    theme?: ThemeMode;
  }) => Promise<
    | { status: "teacher-invite-required" }
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

function redirectToLogin(request: Request, error: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("googleError", error);
  return NextResponse.redirect(loginUrl);
}

function workspaceForRole(role?: "student" | "teacher" | "parent" | "admin") {
  if (role === "teacher" || role === "admin") return "/teacher";
  if (role === "parent") return "/parent/connect";
  return "/dashboard";
}

function nextPathStartsWith(value: string, root: string) {
  return value === root || value.startsWith(`${root}/`);
}

function safeWorkspaceTarget(value: string, role?: "student" | "teacher" | "parent" | "admin") {
  if (!value.startsWith("/") || value.startsWith("//")) return workspaceForRole(role);
  if (role === "teacher" || role === "admin") {
    return nextPathStartsWith(value, "/teacher") ? value : workspaceForRole(role);
  }
  if (role === "parent") return nextPathStartsWith(value, "/parent") ? value : workspaceForRole(role);
  if (role === "student" && (nextPathStartsWith(value, "/teacher") || nextPathStartsWith(value, "/parent"))) {
    return workspaceForRole(role);
  }
  return value;
}

function clearGoogleStateCookie(response: NextResponse, request: Request) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    ...sessionCookieOptions(request, 0)
  });
}

export async function handleGoogleOAuthCallback(
  request: Request,
  dependencies: GoogleCallbackDependencies = defaultDependencies
) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (url.searchParams.get("error")) return redirectToLogin(request, "provider_denied");
  if (!state || !code) return redirectToLogin(request, "state_invalid");

  const pendingState = await dependencies.verifyGoogleOAuthState({
    state,
    cookieValue: readCookie(request.headers.get("cookie"), GOOGLE_OAUTH_STATE_COOKIE)
  });
  if (pendingState.status !== "valid") return redirectToLogin(request, "state_invalid");

  const config = dependencies.getGoogleOAuthConfig();
  if (!config) return redirectToLogin(request, "setup");

  const token = await dependencies.exchangeGoogleAuthorizationCode({ code, config });
  if (token.status !== "ok") return redirectToLogin(request, "provider_token_invalid");

  const jwks = await dependencies.fetchGoogleJwks();
  if (!jwks) return redirectToLogin(request, "provider_jwks_unavailable");

  const verified = await dependencies.verifyGoogleIdToken({
    idToken: token.idToken,
    clientId: config.clientId,
    expectedNonce: pendingState.payload.nonce,
    jwks
  });
  if (verified.status !== "valid") return redirectToLogin(request, "provider_identity_invalid");

  const authenticated = await dependencies.authenticateGoogleIdentityForLogin({
    providerSubject: verified.profile.subject,
    email: verified.profile.email,
    emailVerified: verified.profile.emailVerified,
    displayName: verified.profile.name,
    requestedRole: pendingState.payload.role,
    grade: pendingState.payload.grade,
    curriculumProfile: pendingState.payload.curriculumProfile,
    language: pendingState.payload.language,
    theme: pendingState.payload.theme
  });

  if (authenticated.status === "teacher-invite-required") {
    return redirectToLogin(request, "teacher_invite_required");
  }
  if (authenticated.status === "invalid") return redirectToLogin(request, "account_invalid");

  const targetPath = safeWorkspaceTarget(pendingState.payload.next, authenticated.session.user.role);
  const response = NextResponse.redirect(new URL(targetPath, request.url));
  clearGoogleStateCookie(response, request);
  try {
    await dependencies.setSessionCookie(response, authenticated.session.user.id, request);
  } catch {
    return sessionSecretMissingResponse();
  }
  return response;
}
