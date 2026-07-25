import { NextResponse } from "next/server";
import { defaultStudentAccommodations } from "@/lib/accommodations";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentAccommodations } from "@/lib/server/userStore";

export const runtime = "nodejs";

// Resolves the effective accommodations for the signed-in student, so the
// learning experience (practice, lessons) can apply them. Per-user and never
// cached; non-students simply receive the standard (no-op) defaults.
export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const accommodations = authenticated.user.role === "student"
    ? await getStudentAccommodations(authenticated.user.id)
    : { ...defaultStudentAccommodations };

  const response = NextResponse.json({ accommodations });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", "Cookie");
  return response;
}
