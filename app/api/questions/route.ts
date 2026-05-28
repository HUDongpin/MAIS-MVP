import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { curriculumProfilesEqual, curriculumProfileForTrack, defaultCurriculumProfile, isTextbookPublisher, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getPublicQuestions } from "@/lib/server/userStore";
import type { CurriculumTrack, Difficulty, GradeId, TextbookPublisher } from "@/types";

export const runtime = "nodejs";

const validDifficulties = new Set<Difficulty>(["Foundation", "Core", "Challenge", "Exam"]);
const validCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grade = url.searchParams.get("grade");
  const topicId = url.searchParams.get("topicId");
  const difficulty = url.searchParams.get("difficulty");
  const curriculumTrack = url.searchParams.get("curriculumTrack");
  const publisher = url.searchParams.get("publisher");
  const authenticated = await requireAuthenticatedUser(request);

  if (grade && !isValidGradeId(grade)) {
    return NextResponse.json({ error: "Invalid grade filter." }, { status: 400 });
  }

  if (difficulty && !validDifficulties.has(difficulty as Difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty filter." }, { status: 400 });
  }

  if (curriculumTrack && !validCurriculumTracks.has(curriculumTrack as CurriculumTrack)) {
    return NextResponse.json({ error: "Invalid curriculum track filter." }, { status: 400 });
  }

  if (publisher && !isTextbookPublisher(publisher)) {
    return NextResponse.json({ error: "Invalid textbook publisher filter." }, { status: 400 });
  }

  const queryCurriculumProfile = publisher
    ? normalizeCurriculumProfile({ publisher: publisher as TextbookPublisher })
    : curriculumTrack
      ? curriculumProfileForTrack(curriculumTrack as CurriculumTrack)
      : undefined;

  if (authenticated && queryCurriculumProfile && !curriculumProfilesEqual(authenticated.user.curriculumProfile, queryCurriculumProfile)) {
    return NextResponse.json({ questions: [] });
  }

  if (!authenticated && queryCurriculumProfile && !curriculumProfilesEqual(defaultCurriculumProfile, queryCurriculumProfile)) {
    return NextResponse.json({ questions: [] });
  }

  const questions = await getPublicQuestions({
    grade: grade ? (grade as GradeId) : undefined,
    topicId: topicId || undefined,
    difficulty: difficulty ? (difficulty as Difficulty) : undefined,
    curriculumTrack: authenticated ? undefined : curriculumTrack ? (curriculumTrack as CurriculumTrack) : undefined,
    curriculumProfile: authenticated?.user.curriculumProfile ?? queryCurriculumProfile
  });

  return NextResponse.json({ questions });
}
