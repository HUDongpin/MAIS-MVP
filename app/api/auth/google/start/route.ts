import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { curriculumProfileForTrack } from "@/lib/curriculumProfile";
import { isValidLanguage } from "@/lib/i18n";
import { buildGoogleOAuthAuthorization, type GoogleOAuthRole } from "@/lib/server/googleOAuth";
import type { CurriculumTrack, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);

function errorRedirect(request: Request, error: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("googleError", error);
  return NextResponse.redirect(loginUrl);
}

function googleRole(value: string | null): GoogleOAuthRole {
  return value === "parent" || value === "teacher" || value === "student" ? value : "student";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedCurriculumTrack = url.searchParams.get("curriculumTrack");
  const requestedGrade = url.searchParams.get("grade");
  const requestedLanguage = url.searchParams.get("language");
  const requestedTheme = url.searchParams.get("theme");
  const curriculumTrack = validCurriculumTracks.has(requestedCurriculumTrack as CurriculumTrack)
    ? (requestedCurriculumTrack as CurriculumTrack)
    : undefined;
  const result = await buildGoogleOAuthAuthorization({
    requestUrl: request.url,
    input: {
      next: url.searchParams.get("next") ?? undefined,
      role: googleRole(url.searchParams.get("role")),
      grade: isValidGradeId(requestedGrade) ? requestedGrade : undefined,
      curriculumProfile: curriculumTrack ? curriculumProfileForTrack(curriculumTrack) : undefined,
      language: isValidLanguage(requestedLanguage) ? requestedLanguage : undefined,
      theme: validThemes.has(requestedTheme as ThemeMode) ? (requestedTheme as ThemeMode) : undefined
    }
  });

  if (result.status !== "redirect") return errorRedirect(request, "setup");

  const response = NextResponse.redirect(result.authorizationUrl);
  response.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options);
  return response;
}
