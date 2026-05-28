import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherResource, getTeacherResourceLibraryData } from "@/lib/server/userStore";
import type { Difficulty, GradeId, TeachingResourceType } from "@/types";

export const runtime = "nodejs";

const maxUploadBytes = 25 * 1024 * 1024;
const validDifficulties = new Set<Difficulty>(["Foundation", "Core", "Challenge", "Exam"]);
const validResourceTypes = new Set<TeachingResourceType>([
  "slides",
  "practice",
  "quiz",
  "worksheet",
  "exam-paper",
  "marking-scheme",
  "image",
  "document",
  "other"
]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const data = await getTeacherResourceLibraryData(authenticated.user.id);
  if (!data) return NextResponse.json({ error: "Resources unavailable." }, { status: 404 });

  return NextResponse.json({ resources: data.resources, data });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const title = form?.get("title");
  const grade = form?.get("grade");
  const topicId = form?.get("topicId");
  const difficulty = form?.get("difficulty");
  const type = form?.get("type");

  if (!(file instanceof File) || typeof title !== "string" || typeof grade !== "string" || !isValidGradeId(grade)) {
    return NextResponse.json({ error: "Invalid resource upload." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  const result = await createTeacherResource({
    teacherId: authenticated.user.id,
    title,
    grade: grade as GradeId,
    topicId: typeof topicId === "string" && topicId ? topicId : null,
    difficulty: typeof difficulty === "string" && validDifficulties.has(difficulty as Difficulty)
      ? (difficulty as Difficulty)
      : null,
    type: typeof type === "string" && validResourceTypes.has(type as TeachingResourceType)
      ? (type as TeachingResourceType)
      : null,
    file: {
      name: file.name,
      type: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer())
    }
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ resource: result.resource }, { status: 201 });
}
