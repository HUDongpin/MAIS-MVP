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
  assert.match(loginPage, /const defaultLoginGrade: GradeId = "K"/);
  assert.match(registerPage, /useState<GradeId>\("K"\)/);
});

test("California lesson entry exposes the 76 approved seeds and rejects candidate-only seeds", async () => {
  const readyCaliforniaSeeds = usCaliforniaLessonSeeds.filter((lesson) => lesson.productionReady);
  const nonReadyCaliforniaSeeds = usCaliforniaLessonSeeds.filter((lesson) => !lesson.productionReady);
  const leakedSeeds = nonReadyCaliforniaSeeds
    .filter((lesson) => productionLessonByTopicId.has(lesson.topicId))
    .map((lesson) => lesson.topicId);
  const missingReadySeeds = readyCaliforniaSeeds
    .filter((lesson) => !productionLessonByTopicId.has(lesson.topicId))
    .map((lesson) => lesson.topicId);

  assert.equal(usCaliforniaLessonSeeds.length, 76);
  assert.equal(readyCaliforniaSeeds.length, 76);
  assert.equal(nonReadyCaliforniaSeeds.length, 0);
  assert.deepEqual(missingReadySeeds, []);
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

  const expectedPlacements = new Map([
    ["us-ca-math-s3-chapter-01", { domains: ["N-RN", "A-CED"], category: "Number and Quantity / Algebra" }],
    ["us-ca-math-s3-chapter-02", { domains: ["F-IF", "F-BF"], category: "Functions" }],
    ["us-ca-math-s3-chapter-03", { domains: ["A-REI", "A-SSE"], category: "Algebra" }],
    ["us-ca-math-s3-chapter-04", { domains: ["G-GPE"], category: "Geometry" }],
    ["us-ca-math-s3-chapter-05", { domains: ["S-ID"], category: "Statistics and Probability" }],
    ["us-ca-math-s4-chapter-01", { domains: ["G-CO"], category: "Geometry" }],
    ["us-ca-math-s4-chapter-02", { domains: ["G-SRT"], category: "Geometry" }],
    ["us-ca-math-s4-chapter-03", { domains: ["G-C", "G-GMD"], category: "Geometry" }],
    ["us-ca-math-s4-chapter-04", { domains: ["A-SSE"], category: "Algebra" }],
    ["us-ca-math-s4-chapter-05", { domains: ["S-CP"], category: "Statistics and Probability" }],
    ["us-ca-math-s5-chapter-01", { domains: ["F-IF", "F-BF"], category: "Functions" }],
    ["us-ca-math-s5-chapter-02", { domains: ["F-LE"], category: "Functions" }],
    ["us-ca-math-s5-chapter-03", { domains: ["F-TF"], category: "Functions" }],
    ["us-ca-math-s5-chapter-04", { domains: ["S-ID"], category: "Statistics and Probability" }],
    ["us-ca-math-s5-chapter-05", { domains: ["S-IC"], category: "Statistics and Probability" }],
    ["us-ca-math-s6-chapter-01", { domains: ["N-Q"], category: "Number and Quantity" }],
    ["us-ca-math-s6-chapter-02", { domains: ["N-CN", "A-APR"], category: "Number and Quantity / Algebra" }],
    ["us-ca-math-s6-chapter-03", { domains: ["S-MD"], category: "Statistics and Probability" }],
    ["us-ca-math-s6-chapter-04", { domains: ["F-IF", "F-BF"], category: "Functions" }],
    ["us-ca-math-s6-chapter-05", { domains: ["N-VM", "G-MG"], category: "Number and Quantity / Geometry" }]
  ]);

  const actualChapterIds = californiaHighSchoolTextbookChapters
    .map((chapter) => chapter.chapterId)
    .sort();
  const expectedChapterIds = [...expectedPlacements.keys()].sort();
  assert.deepEqual(actualChapterIds, expectedChapterIds);
  assert.equal(new Set(actualChapterIds).size, actualChapterIds.length);
  californiaHighSchoolTextbookChapters.forEach((chapter) => {
    const expectedPlacement = expectedPlacements.get(chapter.chapterId);
    assert.ok(expectedPlacement, `${chapter.chapterId} has an expected California high-school placement`);
    assert.equal((chapter as Record<string, unknown>).domainCode, expectedPlacement.domains.join(" + "));
    assert.equal((chapter as Record<string, unknown>).conceptualCategory, expectedPlacement.category);
    assert.equal(typeof (chapter as Record<string, unknown>).pathwayLabel, "string");
    assert.equal(Array.isArray((chapter as Record<string, unknown>).prerequisiteDomains), true);
    assert.deepEqual(
      chapter.standards,
      expectedPlacement.domains.map((domain) => `CA.CCSS.Math.HS.${domain}`)
    );
  });
});

test("California middle school replacement page presents domain overviews, not a complete course claim", () => {
  const middleSchoolPage = readFileSync("components/lesson/CaliforniaMiddleSchoolReplacementTextbookPage.tsx", "utf8");

  assert.match(middleSchoolPage, /Domain overview beta/);
  assert.match(middleSchoolPage, /cluster coverage/i);
  assert.doesNotMatch(middleSchoolPage, /complete California/i);
});
