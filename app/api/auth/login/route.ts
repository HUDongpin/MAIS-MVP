import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import {
  authRateLimitRules,
  consumeAuthRateLimit,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";
import { sessionSecretMissingResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { shouldCompleteCurriculumTrackSelectionForLogin } from "@/lib/server/authLoginFlow";
import { authenticateInternalCaliforniaFastLogin } from "@/lib/server/internalCaliforniaFastLogin";
import { isValidLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, curriculumTrackForProfile, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import type { CurriculumProfile, CurriculumTrack, TextbookPublisher, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const visibleLoginPublishers = new Set<TextbookPublisher>([
  "MAINLAND_PEP",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
  "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
  "HK_UNITED_PRIME_MIA",
  "HK_EPH_MIF",
  "US_CA_MATH"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVisibleLoginCurriculumProfile(profile: CurriculumProfile | undefined): profile is CurriculumProfile {
  return Boolean(profile && visibleLoginPublishers.has(profile.publisher));
}

function settingsMatch(
  settings: { selectedGrade: unknown; language: unknown; theme: unknown },
  selectedGrade: string,
  language: string,
  theme: string
) {
  return settings.selectedGrade === selectedGrade && settings.language === language && settings.theme === theme;
}

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-login", () => handleLogin(request));
}

async function handleLogin(request: Request) {
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

  const ipRateLimit = consumeAuthRateLimit({
    request,
    scope: "login-ip",
    rule: authRateLimitRules.loginIp
  });
  if (ipRateLimit) return ipRateLimit;

  const identifierRateLimit = consumeAuthRateLimit({
    request,
    scope: "login-identifier",
    subject: username,
    rule: authRateLimitRules.loginIdentifier
  });
  if (identifierRateLimit) return identifierRateLimit;

  const internalCaliforniaFastLogin = await authenticateInternalCaliforniaFastLogin({
    username,
    password,
    grade: body.grade,
    curriculumTrack: body.curriculumTrack,
    curriculumProfile: body.curriculumProfile,
    language: body.language,
    theme: body.theme
  });
  if (internalCaliforniaFastLogin?.status === "invalid") {
    return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
  }
  if (internalCaliforniaFastLogin?.status === "authenticated") {
    const response = NextResponse.json(internalCaliforniaFastLogin.session);
    try {
      await setSessionCookie(response, internalCaliforniaFastLogin.session.user.id, request);
    } catch {
      return sessionSecretMissingResponse();
    }
    return response;
  }

  const rawSelectedCurriculumTrack = validCurriculumTracks.has(body.curriculumTrack as CurriculumTrack)
    ? (body.curriculumTrack as CurriculumTrack)
    : undefined;
  const rawSelectedCurriculumProfile = isRecord(body.curriculumProfile)
    ? normalizeCurriculumProfile(body.curriculumProfile, curriculumProfileForTrack(rawSelectedCurriculumTrack))
    : rawSelectedCurriculumTrack
      ? curriculumProfileForTrack(rawSelectedCurriculumTrack)
      : undefined;
  const selectedCurriculumProfile = isVisibleLoginCurriculumProfile(rawSelectedCurriculumProfile)
    ? rawSelectedCurriculumProfile
    : undefined;
  const selectedCurriculumTrack = selectedCurriculumProfile ? curriculumTrackForProfile(selectedCurriculumProfile) : undefined;
  const hasCurriculumSelection = Boolean(selectedCurriculumTrack || selectedCurriculumProfile);
  let flexibleExampleAccountApplied = false;
  const authStore = await import("@/lib/server/userStore/auth");
  const studentActivityStore = await import("@/lib/server/userStore/studentActivity");
  let authenticated: Awaited<ReturnType<typeof authStore.authenticateUserForLogin>> | undefined;

  if (hasCurriculumSelection) {
    const flexibleExampleAccount = await authStore.authenticateFlexibleExampleAccountForLogin({
      username,
      password,
      curriculumProfile: selectedCurriculumProfile,
      selectedGrade: isValidGradeId(body.grade) ? body.grade : undefined,
      language: isValidLanguage(body.language) ? body.language : undefined,
      theme: validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : undefined
    });

    if (flexibleExampleAccount.status === "authenticated") {
      flexibleExampleAccountApplied = true;
      authenticated = flexibleExampleAccount;
    } else if (flexibleExampleAccount.status === "invalid") {
      authenticated = flexibleExampleAccount;
    }
  }

  authenticated ??= await authStore.authenticateUserForLogin(username, password);

  if (
    shouldCompleteCurriculumTrackSelectionForLogin({
      authenticatedStatus: authenticated.status,
      flexibleExampleAccountApplied,
      hasCurriculumSelection
    })
  ) {
    const curriculumSelection = await authStore.completeStudentCurriculumTrackSelection({
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
    ? isValidGradeId(body.grade)
      ? body.grade
      : authenticated.session.user.grade
    : requestedGrade;
  const language = isValidLanguage(body.language) ? body.language : authenticated.session.settings.language;
  const theme = validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : authenticated.session.settings.theme;
  let sessionData = authenticated.session;
  let lessonEntryDatabase = authenticated.database;
  if (!settingsMatch(authenticated.session.settings, selectedGrade, language, theme)) {
    sessionData = (await authStore.updateUserSettings(authenticated.session.user.id, { selectedGrade, language, theme })) ?? authenticated.session;
    lessonEntryDatabase = undefined;
  }
  const lessonEntryTarget = sessionData.user.role === "student"
    ? await studentActivityStore.getLessonEntryTargetForLogin(
        sessionData.user.id,
        sessionData.settings.selectedGrade,
        sessionData.user.curriculumProfile,
        lessonEntryDatabase
      )
    : null;
  const response = NextResponse.json({ ...sessionData, lessonEntryTarget });
  try {
    await setSessionCookie(response, sessionData.user.id, request);
  } catch {
    return sessionSecretMissingResponse();
  }

  return response;
}
