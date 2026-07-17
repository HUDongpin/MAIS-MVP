import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicLessonEntryTargetForGrade } from "@/components/lesson/lessonEntryTarget";
import { californiaHighSchoolTextbookChapters, californiaHighSchoolTextbookDraft } from "@/data/usCaliforniaHighSchoolLessonIllustrations";
import { productionLessonByTopicId } from "@/data/lessons";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import { authenticateInternalCaliforniaFastLogin } from "@/lib/server/internalCaliforniaFastLogin";

const californiaProfile = { region: "US", publisher: "US_CA_MATH" } as const;

test("California curriculum labels use English U.S. grade names instead of P/S grade aliases", () => {
  assert.equal(formatGradeLabelForCurriculum("K", "en", "US_CA_MATH"), "Kindergarten");
  assert.equal(formatGradeLabelForCurriculum("P1", "en", "US_CA_MATH", true), "G1");
  assert.equal(formatGradeLabelForCurriculum("S1", "en", "US_CA_MATH"), "Grade 7");
  assert.equal(formatGradeLabelForCurriculum("S6", "zh", "US_CA_MATH"), "Grade 12");
});

test("California practice and onboarding surfaces do not render Primary/Secondary grade labels", () => {
  const missionSetup = readFileSync("components/practice/PracticeMissionSetupControls.tsx", "utf8");
  const radarSelect = readFileSync("components/practice/PracticeGradeRadarSelect.tsx", "utf8");
  const loginPage = readFileSync("app/login/page.tsx", "utf8");
  const registerPage = readFileSync("app/register/page.tsx", "utf8");

  assert.match(missionSetup, /currentUser/);
  assert.match(missionSetup, /formatGradeLabelForCurriculum\(grade\.id,\s*language,\s*curriculumTrack/);
  assert.match(missionSetup, /formatGradeLabelForCurriculum\(topicOption\.grade,\s*language,\s*curriculumTrack/);
  assert.doesNotMatch(missionSetup, /text\(grade\.name\)/);
  assert.doesNotMatch(radarSelect, /return grade\.id;/);
  assert.match(radarSelect, /formatGradeLabelForCurriculum\(grade\.id,\s*language,\s*curriculumTrack/);
  assert.match(loginPage, /const defaultUnitedStatesLoginGrade: GradeId = "K"/);
  assert.match(registerPage, /useState<GradeId>\("K"\)/);
});

test("California lesson entry does not expose candidate-only lesson seeds as live lessons", async () => {
  const nonReadyCaliforniaSeeds = usCaliforniaLessonSeeds.filter((lesson) => !lesson.productionReady);
  const leakedSeeds = nonReadyCaliforniaSeeds
    .filter((lesson) => productionLessonByTopicId.has(lesson.topicId))
    .map((lesson) => lesson.topicId);

  assert.ok(nonReadyCaliforniaSeeds.length > 0, "California should still retain candidate lesson seeds for QA");
  assert.deepEqual(leakedSeeds, []);
  const p1EntryTarget = publicLessonEntryTargetForGrade("P1", californiaProfile);
  assert.ok(p1EntryTarget, "approved California Grade 1 beta lesson should remain reachable");
  assert.equal(p1EntryTarget.grade, "P1");
  assert.equal(productionLessonByTopicId.has(p1EntryTarget.topicId), true);

  const fastLogin = await authenticateInternalCaliforniaFastLogin({
    username: "Student Jon",
    password: "12345",
    grade: "P1",
    curriculumProfile: californiaProfile
  });
  assert.equal(fastLogin?.status, "authenticated");
  if (fastLogin?.status === "authenticated") {
    assert.deepEqual(fastLogin.session.lessonEntryTarget, p1EntryTarget);
  }
});

test("California high school preview remains review-only and stores pathway metadata", () => {
  const publicRoute = readFileSync("app/lesson/california-high-school-textbook/page.tsx", "utf8");
  const studentRoute = readFileSync("app/student/lessons/california-high-school-textbook/page.tsx", "utf8");
  const reviewPage = readFileSync("components/lesson/CaliforniaHighSchoolTextbookPage.tsx", "utf8");

  assert.equal(californiaHighSchoolTextbookDraft.routePolicy.studentRouteAllowed, false);
  assert.match(publicRoute, /redirect\("\/lesson\/california-high-school-textbook\/review"\)/);
  assert.match(studentRoute, /redirect\(studentRoadmapPath\)/);
  assert.doesNotMatch(publicRoute, /CaliforniaHighSchoolTextbookStudentPage/);
  assert.doesNotMatch(studentRoute, /CaliforniaHighSchoolTextbookStudentPage/);
  assert.match(reviewPage, /pathwayLabel/);
  assert.match(reviewPage, /conceptualCategory/);

  const expectedDomains = new Map([
    ["us-ca-math-s3-chapter-01", "A-CED"],
    ["us-ca-math-s3-chapter-02", "F-IF"],
    ["us-ca-math-s3-chapter-03", "F-LE"],
    ["us-ca-math-s3-chapter-04", "G-GPE"],
    ["us-ca-math-s3-chapter-05", "S-ID"],
    ["us-ca-math-s4-chapter-01", "G-CO"],
    ["us-ca-math-s4-chapter-02", "G-SRT"],
    ["us-ca-math-s4-chapter-03", "G-C"],
    ["us-ca-math-s4-chapter-04", "A-SSE"],
    ["us-ca-math-s4-chapter-05", "S-CP"],
    ["us-ca-math-s5-chapter-01", "F-BF"],
    ["us-ca-math-s5-chapter-02", "F-LE"],
    ["us-ca-math-s5-chapter-03", "F-TF"],
    ["us-ca-math-s5-chapter-04", "S-ID"],
    ["us-ca-math-s5-chapter-05", "S-IC"],
    ["us-ca-math-s6-chapter-01", "N-Q"],
    ["us-ca-math-s6-chapter-02", "A-APR"],
    ["us-ca-math-s6-chapter-03", "S-MD"],
    ["us-ca-math-s6-chapter-04", "F-IF"],
    ["us-ca-math-s6-chapter-05", "Modeling"]
  ]);

  californiaHighSchoolTextbookChapters.forEach((chapter) => {
    const expectedDomain = expectedDomains.get(chapter.chapterId);
    assert.ok(expectedDomain, `${chapter.chapterId} has an expected California high-school domain`);
    assert.equal((chapter as Record<string, unknown>).domainCode, expectedDomain);
    assert.equal(typeof (chapter as Record<string, unknown>).conceptualCategory, "string");
    assert.equal(typeof (chapter as Record<string, unknown>).pathwayLabel, "string");
    assert.equal(Array.isArray((chapter as Record<string, unknown>).prerequisiteDomains), true);
    assert.deepEqual(chapter.standards, [`CA.CCSS.Math.HS.${expectedDomain}`]);
  });
});

test("California middle school replacement page presents domain overviews, not a complete course claim", () => {
  const middleSchoolPage = readFileSync("components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx", "utf8");

  assert.match(middleSchoolPage, /Domain overview beta/);
  assert.match(middleSchoolPage, /cluster coverage/i);
  assert.doesNotMatch(middleSchoolPage, /complete California/i);
});
