import { NextResponse } from "next/server";
import { isActiveDifficulty } from "@/lib/difficulty";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherAssessmentBuilderQuestions } from "@/lib/server/userStore";
import type { Difficulty, QuestionType } from "@/types";

export const runtime = "nodejs";

const validQuestionTypes = new Set<QuestionType>(["multiple-choice", "fill-in", "short-answer", "graph"]);
const validSources = new Set(["question-bank", "mistakes"]);

function csv(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "";
  const source = validSources.has(url.searchParams.get("source") ?? "") ? (url.searchParams.get("source") as "question-bank" | "mistakes") : "question-bank";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
  if (!classId) return NextResponse.json({ error: "Class is required." }, { status: 400 });

  const result = await getTeacherAssessmentBuilderQuestions({
    teacherId: authenticated.user.id,
    classId,
    source,
    topicIds: csv(url.searchParams.get("topicIds")),
    difficulties: csv(url.searchParams.get("difficulties")).filter(isActiveDifficulty),
    questionTypes: csv(url.searchParams.get("questionTypes")).filter((questionType): questionType is QuestionType => validQuestionTypes.has(questionType as QuestionType)),
    keyword: url.searchParams.get("keyword") ?? "",
    page,
    pageSize
  });

  if (!result) return NextResponse.json({ error: "Question bank unavailable." }, { status: 404 });
  return NextResponse.json(result);
}
