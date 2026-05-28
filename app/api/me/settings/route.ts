import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { updateUserSettings } from "@/lib/server/userStore";
import { isValidLanguage } from "@/lib/i18n";
import type { GradeId, ThemeMode } from "@/types";

export const runtime = "nodejs";

const validThemes = new Set<ThemeMode>(["dark", "light"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ settings: authenticated.settings });
}

export async function PATCH(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const requestedGrade = isValidGradeId(body.selectedGrade) ? (body.selectedGrade as GradeId) : undefined;
  const patch = {
    language: isValidLanguage(body.language) ? body.language : undefined,
    theme: validThemes.has(body.theme as ThemeMode) ? (body.theme as ThemeMode) : undefined,
    selectedGrade: authenticated.user.role === "student" ? authenticated.user.grade : requestedGrade
  };

  const updated = await updateUserSettings(authenticated.user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: updated.user, settings: updated.settings });
}
