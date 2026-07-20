import { NextResponse } from "next/server";
import { buildClassSkyMap } from "@/lib/classSkyMap";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherClassSkyMaterials } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { classId } = await params;
  const materials = await getTeacherClassSkyMaterials({ teacherId: authenticated.user.id, classId });
  if (!materials) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  // Aggregate before responding: only cluster-level heat and counts leave the server.
  const classSky = buildClassSkyMap({ topics: materials.topics, students: materials.students });

  return NextResponse.json({
    classSky,
    className: materials.className,
    classGrade: materials.classGrade,
    curriculumTrack: materials.curriculumTrack,
    generatedAt: materials.generatedAt
  });
}
