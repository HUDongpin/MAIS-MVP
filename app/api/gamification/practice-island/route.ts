import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { awardStudentPracticeIslandStars, getStudentPracticeIslandStars } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const stars = await getStudentPracticeIslandStars(authenticated.user.id);
  if (!stars) return NextResponse.json({ error: "Practice Island stars unavailable." }, { status: 404 });

  return NextResponse.json({ stars });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 403 });

  const result = await awardStudentPracticeIslandStars({
    studentId: authenticated.user.id,
    regionId: typeof body.regionId === "string" ? body.regionId : "",
    stars: typeof body.stars === "number" ? body.stars : 0
  });

  if (!result) return NextResponse.json({ error: "Practice Island stars unavailable." }, { status: 404 });

  const statusCode = {
    awarded: 201,
    unchanged: 200,
    "invalid-region": 422,
    "invalid-stars": 422
  }[result.status];

  return NextResponse.json(result, { status: statusCode });
}
