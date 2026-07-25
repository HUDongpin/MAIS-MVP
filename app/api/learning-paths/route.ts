import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getStudentLearningPaths } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const paths = await getStudentLearningPaths(authenticated.user.id);
  return NextResponse.json({ paths: paths ?? [] });
}
