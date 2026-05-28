import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { sessionSecretMissingResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { createParentUser, createStudentUser, getLessonEntryTarget } from "@/lib/server/userStore";
import { isValidLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import type { CurriculumTrack, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : "";
  const requestedRole = typeof body.role === "string" ? body.role : "student";
  if (requestedRole === "teacher" || requestedRole === "admin") {
    return NextResponse.json({ error: "Teacher and admin accounts must be created by an administrator." }, { status: 403 });
  }
  if (requestedRole !== "student" && requestedRole !== "parent") {
    return NextResponse.json({ error: "Unsupported registration role." }, { status: 400 });
  }

  if (requestedRole === "parent") {
    const result = await createParentUser({
      name,
      username: username || email,
      email,
      password,
      language: isValidLanguage(body.language) ? body.language : undefined,
      theme: validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : undefined
    });

    if (result.status === "duplicate") {
      return NextResponse.json({ error: "An account with this email or username already exists." }, { status: 409 });
    }
    if (result.status !== "created") {
      return NextResponse.json({ error: "Name, email, and a password of at least 5 characters are required." }, { status: 400 });
    }

    const response = NextResponse.json(result.session);
    try {
      await setSessionCookie(response, result.session.user.id, request);
    } catch {
      return sessionSecretMissingResponse();
    }

    return response;
  }

  const grade = body.grade;
  const curriculumTrack = validCurriculumTracks.has(body.curriculumTrack as CurriculumTrack)
    ? (body.curriculumTrack as CurriculumTrack)
    : undefined;
  const curriculumProfile = isRecord(body.curriculumProfile)
    ? normalizeCurriculumProfile(body.curriculumProfile, curriculumProfileForTrack(curriculumTrack))
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack)
      : undefined;
  if (!name || !username || password.length < 5 || !isValidGradeId(grade) || !curriculumProfile) {
    return NextResponse.json({ error: "Name, user name, grade, curriculum track, and a password of at least 5 characters are required." }, { status: 400 });
  }

  const result = await createStudentUser({
    name,
    username,
    email,
    password,
    grade,
    curriculumProfile,
    curriculumTrack,
    language: isValidLanguage(body.language) ? body.language : undefined,
    theme: validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : undefined
  });

  if (result.status === "duplicate") {
    return NextResponse.json({ error: "An account with this email or username already exists." }, { status: 409 });
  }
  if (result.status !== "created") {
    return NextResponse.json({ error: "Could not create account." }, { status: 400 });
  }

  const lessonEntryTarget = await getLessonEntryTarget(result.session.user.id, result.session.user.grade, result.session.user.curriculumProfile);
  const response = NextResponse.json({ ...result.session, lessonEntryTarget });
  try {
    await setSessionCookie(response, result.session.user.id, request);
  } catch {
    return sessionSecretMissingResponse();
  }

  return response;
}
