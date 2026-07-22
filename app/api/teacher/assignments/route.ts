import { NextResponse } from "next/server";
import { isValidLanguage } from "@/lib/i18n";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  createTeacherAssessment,
  createTeacherAssignment,
  getTeacherAssignments,
  getTeacherClassDetailData
} from "@/lib/server/userStore";
import {
  generateTeacherAssignmentAssessment,
  TeacherAssignmentGenerationError
} from "@/lib/server/teacherAssignmentGeneration";
import type { AssignmentContentType } from "@/types";

export const runtime = "nodejs";

const validContentTypes = new Set<AssignmentContentType>(["lesson", "practice", "visualization", "resource", "assessment"]);

function statusForGenerationError(error: unknown) {
  if (!(error instanceof TeacherAssignmentGenerationError)) return 500;
  if (error.code === "missing-config") return 503;
  return 502;
}

function publicErrorForGenerationError(error: unknown) {
  if (!(error instanceof TeacherAssignmentGenerationError)) return "assignment-generation-failed";
  return `assignment-generation-${error.code}`;
}

function generationQuestionCount(value: unknown) {
  const count = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 5;
  return Math.max(1, Math.min(10, count));
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const assignments = await getTeacherAssignments(authenticated.user.id);
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    classId?: unknown;
    studentIds?: unknown;
    groupId?: unknown;
    title?: unknown;
    description?: unknown;
    contentType?: unknown;
    targetId?: unknown;
    dueAt?: unknown;
    allowRetake?: unknown;
    showAnswers?: unknown;
    countTowardsGrade?: unknown;
    language?: unknown;
    llmGenerate?: unknown;
    questionCount?: unknown;
    imageDataUrl?: unknown;
    imageFileName?: unknown;
  } | null;
  const contentType = validContentTypes.has(body?.contentType as AssignmentContentType)
    ? (body?.contentType as AssignmentContentType)
    : null;
  const language = isValidLanguage(body?.language) ? body.language : undefined;

  if (!body || typeof body.classId !== "string" || typeof body.title !== "string" || !contentType) {
    return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" && body.groupId.trim() ? body.groupId.trim() : undefined;

  if (body.llmGenerate === true) {
    const classDetail = await getTeacherClassDetailData(authenticated.user.id, body.classId);
    if (!classDetail) return NextResponse.json({ error: "not-found" }, { status: 404 });

    const enrolledStudentIds = new Set(classDetail.students.map((student) => student.studentId));
    const group = groupId ? classDetail.groups.find((candidate) => candidate.id === groupId) : undefined;
    if (groupId && !group) return NextResponse.json({ error: "group-not-found" }, { status: 404 });
    const requestedStudentIds = group
      ? group.memberStudentIds.filter((studentId) => enrolledStudentIds.has(studentId))
      : Array.isArray(body.studentIds)
        ? body.studentIds.filter((studentId): studentId is string => typeof studentId === "string" && enrolledStudentIds.has(studentId))
        : undefined;
    if ((group || Array.isArray(body.studentIds)) && !requestedStudentIds?.length) {
      return NextResponse.json({ error: "no-students" }, { status: 400 });
    }
    if (!enrolledStudentIds.size) {
      return NextResponse.json({ error: "no-students" }, { status: 400 });
    }

    let generated;
    try {
      generated = await generateTeacherAssignmentAssessment({
        title: body.title,
        description: typeof body.description === "string" ? body.description : "",
        contentType,
        targetId: typeof body.targetId === "string" ? body.targetId : undefined,
        className: classDetail.class.name,
        grade: classDetail.class.grade,
        dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
        questionCount: generationQuestionCount(body.questionCount),
        imageDataUrl: typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
        imageFileName: typeof body.imageFileName === "string" ? body.imageFileName : undefined
      });
    } catch (error) {
      return NextResponse.json(
        { error: publicErrorForGenerationError(error) },
        { status: statusForGenerationError(error) }
      );
    }

    const generatedTitle = generated.title.zhHans ?? generated.title.zh ?? generated.title.en;
    const generatedDescription = generated.description.zhHans ?? generated.description.zh ?? generated.description.en;
    const assessmentResult = await createTeacherAssessment({
      teacherId: authenticated.user.id,
      classId: body.classId,
      title: generatedTitle || body.title,
      type: "quiz",
      sourceType: "mixed",
      paperSections: generated.sections,
      statusIntent: "publish",
      opensAt: null,
      closesAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
      timeLimitMinutes: null,
      maxAttempts: body.allowRetake ? 2 : 1,
      randomizeQuestionOrder: true,
      showAnswersImmediately: Boolean(body.showAnswers),
      gradeWeight: 10
    });

    if (assessmentResult.status !== "created") {
      const status = assessmentResult.status === "forbidden" ? 403 : assessmentResult.status === "not-found" ? 404 : 400;
      return NextResponse.json({ error: assessmentResult.status }, { status });
    }

    const assignmentResult = await createTeacherAssignment({
      teacherId: authenticated.user.id,
      classId: body.classId,
      studentIds: requestedStudentIds,
      title: body.title,
      description: typeof body.description === "string" && body.description.trim() ? body.description : generatedDescription,
      contentType: "assessment",
      targetId: assessmentResult.assessment.id,
      dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
      allowRetake: Boolean(body.allowRetake),
      showAnswers: Boolean(body.showAnswers),
      countTowardsGrade: body.countTowardsGrade !== false,
      language
    });

    if (assignmentResult.status !== "created") {
      const status = assignmentResult.status === "forbidden" ? 403 : assignmentResult.status === "not-found" ? 404 : 400;
      return NextResponse.json({ error: assignmentResult.status }, { status });
    }

    return NextResponse.json({
      assignment: assignmentResult.assignment,
      assessment: assessmentResult.assessment,
      generation: {
        provider: generated.provider,
        model: generated.model,
        usedImage: generated.usedImage,
        questionCount: generated.sections.reduce((count, section) => count + section.items.length, 0),
        usage: generated.usage
      }
    }, { status: 201 });
  }

  let studentIds = Array.isArray(body.studentIds)
    ? body.studentIds.filter((studentId): studentId is string => typeof studentId === "string")
    : undefined;
  if (groupId) {
    const classDetail = await getTeacherClassDetailData(authenticated.user.id, body.classId);
    if (!classDetail) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const group = classDetail.groups.find((candidate) => candidate.id === groupId);
    if (!group) return NextResponse.json({ error: "group-not-found" }, { status: 404 });
    if (!group.memberStudentIds.length) return NextResponse.json({ error: "no-students" }, { status: 400 });
    studentIds = group.memberStudentIds;
  }

  const result = await createTeacherAssignment({
    teacherId: authenticated.user.id,
    classId: body.classId,
    studentIds,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    contentType,
    targetId: typeof body.targetId === "string" ? body.targetId : undefined,
    dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
    allowRetake: Boolean(body.allowRetake),
    showAnswers: Boolean(body.showAnswers),
    countTowardsGrade: body.countTowardsGrade !== false,
    language
  });

  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assignment: result.assignment }, { status: 201 });
}
