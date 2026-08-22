import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import {
  curriculumProfileForPublisher,
  curriculumProfileForTrack,
  isTextbookPublisher
} from "@/lib/curriculumProfile";
import { isValidLanguage } from "@/lib/i18n";
import { isGoogleStudentSelfServiceGradeAllowed } from "@/lib/googleStudentOAuthPolicy";
import { requireAuthenticatedUser as defaultRequireAuthenticatedUser } from "@/lib/server/auth";
import {
  buildGoogleOAuthAuthorization,
  GOOGLE_OAUTH_LINK_REAUTH_COOKIE,
  isGoogleOAuthStudentSetupAllowed,
  verifyGoogleOAuthLinkReauth as defaultVerifyGoogleOAuthLinkReauth,
  type GoogleOAuthRole
} from "@/lib/server/googleOAuth";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";
import type { CurriculumTrack, StudentSession, ThemeMode } from "@/types";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);
const googleOAuthStartFields = [
  "next",
  "role",
  "grade",
  "curriculumTrack",
  "publisher",
  "studentAge13OrOlder",
  "language",
  "theme"
] as const;

export type GoogleOAuthStartDependencies = {
  requireAuthenticatedUser: (request: Request) => Promise<{
    user: Pick<StudentSession, "id" | "role" | "grade" | "curriculumProfile">;
  } | null>;
  verifyGoogleOAuthLinkReauth?: (input: {
    cookieValue: string;
    userId: string;
  }) => Promise<{ status: "valid" } | { status: "invalid" }>;
};

const defaultDependencies: GoogleOAuthStartDependencies = {
  requireAuthenticatedUser: defaultRequireAuthenticatedUser,
  verifyGoogleOAuthLinkReauth: defaultVerifyGoogleOAuthLinkReauth
};

function hardenOAuthResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function oauthRedirect(request: Request, destination: string | URL) {
  return NextResponse.redirect(destination, request.method === "POST" ? 303 : 307);
}

function errorRedirect(request: Request, error: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("googleError", error);
  return hardenOAuthResponse(oauthRedirect(request, loginUrl));
}

function readCookie(header: string | null, name: string) {
  if (!header) return "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return "";
  }
}

function clearGoogleLinkReauthCookie(response: NextResponse, request: Request) {
  response.cookies.set(GOOGLE_OAUTH_LINK_REAUTH_COOKIE, "", sessionCookieOptions(request, 0));
  return response;
}

function reauthRedirect(request: Request, baseUrl: string, error: string) {
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("googleError", error);
  loginUrl.searchParams.set("next", "/login?googleLink=1");
  return hardenOAuthResponse(clearGoogleLinkReauthCookie(oauthRedirect(request, loginUrl), request));
}

function googleRole(value: string | null): GoogleOAuthRole {
  return value === "parent" || value === "teacher" || value === "student" ? value : "student";
}

function googleRoleForAuthenticatedUser(role: StudentSession["role"]): GoogleOAuthRole {
  if (role === "student" || role === "parent") return role;
  return "teacher";
}

export async function handleGoogleOAuthStart(
  request: Request,
  dependencies: GoogleOAuthStartDependencies = defaultDependencies,
  options: {
    params?: URLSearchParams;
    studentSetupConfirmed?: boolean;
    studentAge13OrOlder?: boolean;
  } = {}
) {
  const url = new URL(request.url);
  const params = options.params ?? url.searchParams;
  const effectiveRequestUrl = new URL(request.url);
  effectiveRequestUrl.search = params.toString();
  const requestedCurriculumTrack = params.get("curriculumTrack");
  const requestedPublisher = params.get("publisher");
  const requestedGrade = params.get("grade");
  const requestedLanguage = params.get("language");
  const requestedTheme = params.get("theme");
  const requestedRole = googleRole(params.get("role"));
  const curriculumTrack = validCurriculumTracks.has(requestedCurriculumTrack as CurriculumTrack)
    ? (requestedCurriculumTrack as CurriculumTrack)
    : undefined;
  const requestedCurriculumProfile = requestedPublisher !== null
    ? isTextbookPublisher(requestedPublisher)
      ? curriculumProfileForPublisher(requestedPublisher)
      : undefined
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack)
      : undefined;
  const requestedValidGrade = isValidGradeId(requestedGrade) ? requestedGrade : undefined;
  const studentAge13OrOlder = options.studentAge13OrOlder === true;

  let authenticatedUser: Awaited<ReturnType<GoogleOAuthStartDependencies["requireAuthenticatedUser"]>>;
  try {
    authenticatedUser = await dependencies.requireAuthenticatedUser(request);
  } catch {
    return errorRedirect(request, "account_unavailable");
  }
  const role = authenticatedUser
    ? googleRoleForAuthenticatedUser(authenticatedUser.user.role)
    : requestedRole;
  const grade = role === "student"
    ? authenticatedUser?.user.grade ?? requestedValidGrade
    : undefined;
  const curriculumProfile = role === "student"
    ? authenticatedUser?.user.curriculumProfile ?? requestedCurriculumProfile
    : undefined;
  if (
    role === "student" &&
    (
      !grade ||
      !curriculumProfile ||
      (!authenticatedUser && options.studentSetupConfirmed !== true)
    )
  ) {
    return errorRedirect(request, "student_setup_required");
  }
  if (
    role === "student" &&
    (!studentAge13OrOlder || !isGoogleStudentSelfServiceGradeAllowed(grade))
  ) {
    return errorRedirect(request, "student_age_authorization_required");
  }
  if (
    role === "student" &&
    !authenticatedUser &&
    !isGoogleOAuthStudentSetupAllowed(grade, curriculumProfile, studentAge13OrOlder)
  ) {
    return errorRedirect(request, "student_setup_required");
  }
  let linkReauthValid = false;
  if (authenticatedUser) {
    try {
      const verifiedReauth = await (dependencies.verifyGoogleOAuthLinkReauth ?? defaultVerifyGoogleOAuthLinkReauth)({
        cookieValue: readCookie(request.headers.get("cookie"), GOOGLE_OAUTH_LINK_REAUTH_COOKIE),
        userId: authenticatedUser.user.id
      });
      linkReauthValid = verifiedReauth.status === "valid";
    } catch {
      linkReauthValid = false;
    }
  }
  const result = await buildGoogleOAuthAuthorization({
    requestUrl: effectiveRequestUrl.toString(),
    input: {
      next: params.get("next") ?? undefined,
      linkUserId: linkReauthValid ? authenticatedUser?.user.id : undefined,
      role,
      studentAge13OrOlder: role === "student" ? studentAge13OrOlder : undefined,
      grade,
      curriculumProfile,
      language: isValidLanguage(requestedLanguage) ? requestedLanguage : undefined,
      theme: validThemes.has(requestedTheme as ThemeMode) ? (requestedTheme as ThemeMode) : undefined
    }
  });

  if (result.status === "canonical-redirect") {
    if (authenticatedUser) {
      return reauthRedirect(request, result.canonicalUrl, "canonical_reauth_required");
    }
    if (role === "student" && options.studentSetupConfirmed) {
      const canonicalLoginUrl = new URL("/login", result.canonicalUrl);
      canonicalLoginUrl.searchParams.set("googleError", "student_setup_required");
      return hardenOAuthResponse(oauthRedirect(request, canonicalLoginUrl));
    }
    return hardenOAuthResponse(oauthRedirect(request, result.canonicalUrl));
  }
  if (result.status !== "redirect") return errorRedirect(request, "setup");
  if (authenticatedUser && !linkReauthValid) {
    return reauthRedirect(request, request.url, "reauth_required");
  }

  const response = oauthRedirect(request, result.authorizationUrl);
  response.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options);
  if (authenticatedUser) clearGoogleLinkReauthCookie(response, request);
  return hardenOAuthResponse(response);
}

export async function handleGoogleOAuthStartPost(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    request.headers.get("origin") !== requestOrigin ||
    !contentType.startsWith("application/x-www-form-urlencoded")
  ) {
    return hardenOAuthResponse(NextResponse.json(
      { error: "invalid_oauth_start_request" },
      { status: 403 }
    ));
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return hardenOAuthResponse(NextResponse.json(
      { error: "invalid_oauth_start_request" },
      { status: 400 }
    ));
  }

  const params = new URLSearchParams();
  for (const field of googleOAuthStartFields) {
    const value = formData.get(field);
    if (typeof value === "string") params.set(field, value);
  }

  return handleGoogleOAuthStart(request, defaultDependencies, {
    params,
    studentSetupConfirmed: formData.get("setupConfirmed") === "true",
    studentAge13OrOlder: formData.get("studentAge13OrOlder") === "true"
  });
}
