import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { authenticateUserForLogin, completeStudentCurriculumTrackSelection, getLessonEntryTarget, updateUserSettings } from "@/lib/server/userStore";
import { isValidLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import type { CurriculumTrack, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSecureRequest(request: Request) {
  return request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Email/username and password are required." }, { status: 400 });
  }

  const selectedCurriculumTrack = validCurriculumTracks.has(body.curriculumTrack as CurriculumTrack)
    ? (body.curriculumTrack as CurriculumTrack)
    : undefined;
  const selectedCurriculumProfile = isRecord(body.curriculumProfile)
    ? normalizeCurriculumProfile(body.curriculumProfile, curriculumProfileForTrack(selectedCurriculumTrack))
    : undefined;
  const hasCurriculumSelection = Boolean(selectedCurriculumTrack || selectedCurriculumProfile);
  let authenticated = await authenticateUserForLogin(username, password);

  if (hasCurriculumSelection && (authenticated.status === "authenticated" || authenticated.status === "requires-curriculum-track")) {
    const curriculumSelection = await completeStudentCurriculumTrackSelection({
      username,
      password,
      curriculumTrack: selectedCurriculumTrack,
      curriculumProfile: selectedCurriculumProfile,
      selectedGrade: isValidGradeId(body.grade) ? body.grade : undefined,
      language: isValidLanguage(body.language) ? body.language : undefined,
      theme: validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : undefined
    });

    if (curriculumSelection.status === "authenticated" || authenticated.status === "requires-curriculum-track") {
      authenticated = curriculumSelection;
    }
  }

  if (authenticated.status === "invalid") {
    return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
  }

  if (authenticated.status === "requires-curriculum-track") {
    return NextResponse.json({
      requiresCurriculumTrack: true,
      user: authenticated.user
    });
  }

  const requestedGrade = isValidGradeId(body.grade) ? body.grade : authenticated.session.settings.selectedGrade;
  const selectedGrade = authenticated.session.user.role === "student"
    ? authenticated.session.user.grade
    : requestedGrade;
  const language = isValidLanguage(body.language) ? body.language : authenticated.session.settings.language;
  const theme = validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : authenticated.session.settings.theme;
  const sessionData =
    (await updateUserSettings(authenticated.session.user.id, { selectedGrade, language, theme })) ?? authenticated.session;
  let token: string;
  try {
    token = await createSessionToken(sessionData.user.id);
  } catch {
    return NextResponse.json(
      { error: "Server session secret is not configured." },
      { status: 500 }
    );
  }

  const lessonEntryTarget = sessionData.user.role === "student"
    ? await getLessonEntryTarget(sessionData.user.id, sessionData.user.grade, sessionData.user.curriculumProfile)
    : null;
  const response = NextResponse.json({ ...sessionData, lessonEntryTarget });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  return response;
}
