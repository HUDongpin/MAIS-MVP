import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { curriculumProfilesEqual, curriculumProfileForTrack, defaultCurriculumProfile, isTextbookPublisher, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { isActiveDifficulty } from "@/lib/difficulty";
import { getPublicQuestionsFromStore, getQuestionTopicCatalogFromStore } from "@/lib/server/questionStore";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { CurriculumTrack, Difficulty, GradeId, TextbookPublisher } from "@/types";

export const runtime = "nodejs";

const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);
const validSummaries = new Set(["topic-catalog"]);
const anonymousQuestionPreviewLimit = 20;

function jsonWithApiSurfaceHeaders(body: unknown) {
  const response = NextResponse.json(body);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", "Cookie");
  return response;
}

function emptyQuestionsResponse(summary: string | null) {
  if (summary === "topic-catalog") return NextResponse.json({ topics: [], totalQuestions: 0 });
  return NextResponse.json({ questions: [] });
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function resolveAuthenticatedUser(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;

  // Loaded dynamically so the hot question route keeps its lightweight static
  // module graph (same pattern as app/student/lessons/route.ts) while the
  // authenticated curriculum-scope guard below still sees the real user.
  const { getAuthenticatedUserFromToken } = await import("@/lib/server/auth");
  return getAuthenticatedUserFromToken(token);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grade = url.searchParams.get("grade");
  const topicId = url.searchParams.get("topicId");
  const difficulty = url.searchParams.get("difficulty");
  const curriculumTrack = url.searchParams.get("curriculumTrack");
  const publisher = url.searchParams.get("publisher");
  const summary = url.searchParams.get("summary");
  const authenticated = await resolveAuthenticatedUser(request);

  if (grade && !isValidGradeId(grade)) {
    return NextResponse.json({ error: "Invalid grade filter." }, { status: 400 });
  }

  if (difficulty && !isActiveDifficulty(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty filter." }, { status: 400 });
  }

  if (curriculumTrack && !validCurriculumTracks.has(curriculumTrack as CurriculumTrack)) {
    return NextResponse.json({ error: "Invalid curriculum track filter." }, { status: 400 });
  }

  if (publisher && !isTextbookPublisher(publisher)) {
    return NextResponse.json({ error: "Invalid textbook publisher filter." }, { status: 400 });
  }

  if (summary && !validSummaries.has(summary)) {
    return NextResponse.json({ error: "Invalid question summary." }, { status: 400 });
  }

  const queryCurriculumProfile = publisher
    ? normalizeCurriculumProfile({ publisher: publisher as TextbookPublisher })
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack as CurriculumTrack)
      : undefined;

  // Authenticated learners stay scoped to their own curriculum profile: query
  // params cannot widen the question bank to another curriculum.
  if (authenticated && queryCurriculumProfile && !curriculumProfilesEqual(authenticated.user.curriculumProfile, queryCurriculumProfile)) {
    return emptyQuestionsResponse(summary);
  }

  if (!authenticated && queryCurriculumProfile && !curriculumProfilesEqual(defaultCurriculumProfile, queryCurriculumProfile)) {
    return emptyQuestionsResponse(summary);
  }

  const questionFilters = {
    grade: grade ? (grade as GradeId) : undefined,
    topicId: topicId || undefined,
    difficulty: difficulty ? (difficulty as Difficulty) : undefined,
    curriculumProfile: authenticated?.user.curriculumProfile ?? queryCurriculumProfile ?? defaultCurriculumProfile
  };

  if (summary === "topic-catalog") {
    return jsonWithApiSurfaceHeaders(await getQuestionTopicCatalogFromStore(questionFilters));
  }

  const questions = await getPublicQuestionsFromStore(questionFilters);

  if (!authenticated) {
    const previewQuestions = questions.slice(0, anonymousQuestionPreviewLimit);
    return jsonWithApiSurfaceHeaders({
      questions: previewQuestions,
      limited: questions.length > previewQuestions.length,
      limit: anonymousQuestionPreviewLimit,
      requiresSignInForFullAccess: questions.length > previewQuestions.length,
      totalAvailable: questions.length
    });
  }

  return jsonWithApiSurfaceHeaders({ questions });
}
