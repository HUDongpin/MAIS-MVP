import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import {
  authRateLimitRules,
  consumeAuthRateLimit,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";
import { sessionSecretMissingResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import {
  createParentUser,
  createStudentUser,
  createTeacherUser,
  getStorageReadinessSnapshot
} from "@/lib/server/userStore/auth";
import { getLessonEntryTarget } from "@/lib/server/userStore/studentActivity";
import { isValidLanguage } from "@/lib/i18n";
import { curriculumProfileForTrack, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import type { CurriculumTrack, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function durableStorageRegistrationBlockResponse() {
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return null;

  const storage = await getStorageReadinessSnapshot();
  if (storage.provider === "postgres" && storage.durableReady) return null;

  return NextResponse.json({
    code: "durable-storage-required",
    error: "Real user registration requires durable Postgres storage in this deployment environment.",
    storage: {
      provider: storage.provider,
      status: storage.status,
      durableReady: storage.durableReady,
      configuredPath: storage.configuredPath,
      configuredUrl: "configuredUrl" in storage ? storage.configuredUrl : undefined,
      runtime: storage.runtime,
      usingTmpFallback: storage.usingTmpFallback
    }
  }, { status: 503 });
}

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-register", () => handleRegister(request));
}

async function handleRegister(request: Request) {
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
  if (requestedRole === "admin") {
    return NextResponse.json({ error: "Admin accounts must be created by an administrator." }, { status: 403 });
  }
  if (requestedRole !== "student" && requestedRole !== "teacher" && requestedRole !== "parent") {
    return NextResponse.json({ error: "Unsupported registration role." }, { status: 400 });
  }

  const ipRateLimit = consumeAuthRateLimit({
    request,
    scope: "register-ip",
    rule: authRateLimitRules.registerIp
  });
  if (ipRateLimit) return ipRateLimit;

  if (requestedRole === "parent") {
    if (!name || !(username || email) || password.length < 5) {
      return NextResponse.json({ error: "Name, email, and a password of at least 5 characters are required." }, { status: 400 });
    }

    const storageBlock = await durableStorageRegistrationBlockResponse();
    if (storageBlock) return storageBlock;

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

  const storageBlock = await durableStorageRegistrationBlockResponse();
  if (storageBlock) return storageBlock;

  const createUser = requestedRole === "teacher" ? createTeacherUser : createStudentUser;
  const result = await createUser({
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

  const responseBody = requestedRole === "student"
    ? {
        ...result.session,
        lessonEntryTarget: await getLessonEntryTarget(result.session.user.id, result.session.settings.selectedGrade, result.session.user.curriculumProfile)
      }
    : result.session;
  const response = NextResponse.json(responseBody);
  try {
    await setSessionCookie(response, result.session.user.id, request);
  } catch {
    return sessionSecretMissingResponse();
  }

  return response;
}
