import { NextResponse } from "next/server";
import { guardAiTutorExpectedUser } from "@/app/api/ai-tutor/expectedUser";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { resolveStudentAiTutorPolicy } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const expectedUserConflict = guardAiTutorExpectedUser(authenticated, request);
  if (expectedUserConflict) return expectedUserConflict;

  const policy = await resolveStudentAiTutorPolicy(authenticated.user.id);
  const response = NextResponse.json({ policy });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
