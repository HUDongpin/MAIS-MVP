import { NextResponse } from "next/server";
import { sameOriginPath } from "@/lib/safeRedirectPath";
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
  sessionCookieFailureResponse,
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
    | { status: "parental-consent-required" }
    | { status: "invalid" }
    | { status: "created" | "linked" | "authenticated"; session: GoogleCallbackAuthenticatedSession; sessionRevision: number }
  >;
  setSessionCookie: (
    response: NextResponse,
    userId: string,
    request: Request,
    expectedSessionRevision: number
  ) => Promise<void>;
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

/**
 * Resolves the signed state's `next` into the path this callback redirects to.
 *
 * `sameOriginPath` is the off-origin boundary and runs first: the sink below is
 * `NextResponse.redirect(new URL(targetPath, request.url))`, which resolves
 * `/\evil.example` to `https://evil.example/` exactly as a browser does, so
 * only the URL parser can decide what a `next` value means. The per-role prefix
 * filter that follows is the product rule about which workspace a role may
 * open, not an off-origin defence: it rejected `/\evil.example` for teachers
 * and parents only because that path does not start with their prefix, and
 * students have no such restriction. The `next` value reaching this guard came
 * out of the signed OAuth state, so it is attacker-chosen at `/login` and
 * tamper-proof afterwards, not trusted.
 *
 * Exported for `redirectTarget.test.ts`, which walks the off-origin matrix
 * against this guard directly rather than re-deriving it from the handler.
 */
export function safeWorkspaceTarget(value: string, role?: "student" | "teacher" | "parent" | "admin") {
  const target = sameOriginPath(value);
  if (!target) return workspaceForRole(role);
  if (role === "teacher" || role === "admin") {
    return nextPathStartsWith(target, "/teacher") ? target : workspaceForRole(role);
  }
  if (role === "parent") return nextPathStartsWith(target, "/parent") ? target : workspaceForRole(role);
  if (role === "student" && (nextPathStartsWith(target, "/teacher") || nextPathStartsWith(target, "/parent"))) {
    return workspaceForRole(role);
  }
  return target;
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
  // A new child account cannot be created from a bare Google sign-in: guardian
  // consent is captured on the registration form, so send them there.
  if (authenticated.status === "parental-consent-required") {
    return redirectToLogin(request, "parental_consent_required");
  }
  if (authenticated.status === "invalid") return redirectToLogin(request, "account_invalid");

  const targetPath = safeWorkspaceTarget(pendingState.payload.next, authenticated.session.user.role);
  const response = NextResponse.redirect(new URL(targetPath, request.url));
  clearGoogleStateCookie(response, request);
  try {
    await dependencies.setSessionCookie(
      response,
      authenticated.session.user.id,
      request,
      authenticated.sessionRevision
    );
  } catch (error) {
    const failureResponse = sessionCookieFailureResponse(error, request, {
      committedAction: authenticated.status === "created"
        ? "account-created"
        : authenticated.status === "linked"
          ? "identity-linked"
          : undefined
    });
    clearGoogleStateCookie(failureResponse, request);
    return failureResponse;
  }
  return response;
}
