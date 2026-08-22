import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const practicePageSource = readFileSync(join(process.cwd(), "app/practice/page.tsx"), "utf8");
const practiceQuestionCardSource = readFileSync(join(process.cwd(), "components/practice/PracticeQuestionCard.tsx"), "utf8");
const practiceQuestPagerSource = readFileSync(join(process.cwd(), "components/practice/PracticeQuestPager.tsx"), "utf8");

test("Practice Arena omits the California beta status summary panel", () => {
  assert.doesNotMatch(practicePageSource, /CaliforniaPracticeBetaPanel/);
  assert.doesNotMatch(practicePageSource, /California Math Practice Beta status/);
  assert.doesNotMatch(practicePageSource, /Practice beta/);
  assert.doesNotMatch(practicePageSource, /Active filter/);
  assert.doesNotMatch(practicePageSource, /Diagnostic flow/);
});

test("Practice Arena keeps free-selection controls reachable after an empty catalog load", () => {
  assert.match(
    practicePageSource,
    /const canFallbackToFreeSelection = questionCatalogLoaded && adaptivePlanSettled && !questionCatalogError && !adaptivePlan;/,
    "Expected free selection to unlock after a successful catalog load, even when the selected grade has no catalog rows."
  );
  assert.doesNotMatch(
    practicePageSource,
    /const canFallbackToFreeSelection = questionCatalogCount > 0 && !adaptivePlan;/,
    "A zero-count catalog must not hide the only controls that let guests broaden Practice Arena filters."
  );
});

test("Practice Arena never flashes the mission-setup filters while the adaptive decision is in flight", () => {
  // A dedicated settled flag distinguishes "adaptive plan still loading" (adaptivePlan === null
  // because the fetch is in flight) from "no adaptive plan applies" (loaded, none matches).
  assert.match(
    practicePageSource,
    /const \[adaptivePlanSettled, setAdaptivePlanSettled\] = useState\(false\);/,
    "Expected a settled flag so an in-flight adaptive fetch is not mistaken for 'no plan applies'."
  );

  // Free-selection filters may only unlock once the adaptive decision has settled.
  assert.match(
    practicePageSource,
    /const canFallbackToFreeSelection = questionCatalogLoaded && adaptivePlanSettled && !questionCatalogError && !adaptivePlan;/,
    "Free-selection filters must stay gated behind adaptivePlanSettled so they never mount before the adaptive round arrives."
  );

  // Clearing the plan for a fresh load must clear the settled flag in the same batch,
  // otherwise the filters mount for one render before the flag catches up.
  assert.match(
    practicePageSource,
    /setAdaptivePlan\(null\);\s*\n\s*setAdaptiveLoadError\(""\);\s*\n\s*setAdaptivePlanSettled\(false\);\s*\n\s*setLessonContextReady\(false\);/,
    "Resetting for a new load must clear adaptivePlanSettled alongside the plan, not a render later."
  );

  // Every terminal path of the adaptive load (no user, non-student, success, failure) must
  // settle the decision; the !lessonContextReady early-return must intentionally leave it unsettled.
  const settledTrueCount = (practicePageSource.match(/setAdaptivePlanSettled\(true\)/g) ?? []).length;
  assert.ok(
    settledTrueCount >= 4,
    `Expected every terminal adaptive-load path to mark the decision settled, saw ${settledTrueCount}.`
  );

  // A stable skeleton fills the mission-setup area while the decision is unsettled, instead of
  // toggling between an empty area, the filters, and the adaptive round.
  assert.match(
    practicePageSource,
    /const showMissionSetupSkeleton =\s*\n\s*!adaptivePlan && !shouldShowFreeSelection && !questionCatalogError && !missionSetupDecisionSettled;/,
    "A skeleton must cover the in-flight window so the setup area resolves to exactly one mode."
  );
  assert.match(
    practicePageSource,
    /data-testid="mission-setup-skeleton"/,
    "The mission-setup skeleton must be present for the in-flight decision state."
  );
});

test("Practice Arena omits the Mission Setup controls block", () => {
  assert.doesNotMatch(practicePageSource, /PracticeMissionSetupControls/);
  assert.doesNotMatch(practicePageSource, /freeSelectionMissionSetupControls/);
  assert.doesNotMatch(practicePageSource, /afterHeader=\{/);
  assert.doesNotMatch(practicePageSource, /afterHeader\?: ReactNode;/);
  assert.doesNotMatch(practicePageSource, /afterHeader \? <div className="grid gap-5">\{afterHeader\}<\/div> : null/);
  assert.doesNotMatch(practicePageSource, /Mission Setup/);
});

test("Practice Arena owns the chooser mode and returns from Unit Exercise through its mission summary", () => {
  const summaryStart = practicePageSource.indexOf("function PracticeMissionSummary");
  const summaryEnd = practicePageSource.indexOf("type QuestionPagerProps", summaryStart);
  const summarySource = practicePageSource.slice(summaryStart, summaryEnd);

  assert.ok(summaryStart >= 0, "The shared mission summary component must be present.");
  assert.match(practicePageSource, /useState<PracticeAdventureArenaMode>\("chooser"\)/);
  assert.match(practicePageSource, /mode=\{practiceArenaMode\}/);
  assert.match(practicePageSource, /onModeChange=\{handlePracticeArenaModeChange\}/);
  assert.match(summarySource, /data-unit-exercise-mission-summary/);
  assert.match(summarySource, /data-choose-practice-mode/);
  assert.match(summarySource, /data-unit-exercise-mode-label/);
  assert.match(summarySource, /en: "Choose mode", zh: "選擇模式", zhHans: "选择模式"/);
  assert.match(summarySource, /en: "Unit Exercise", zh: "單元練習", zhHans: "单元练习"/);
  assert.match(summarySource, /min-h-11/, "Choose mode must retain a 44px touch target.");
  assert.match(
    practicePageSource,
    /practiceArenaMode === "unit" \? \(\s*<PracticeMissionSummary[\s\S]*?showUnitModeContext[\s\S]*?onChooseMode=\{\(\) => handlePracticeArenaModeChange\("chooser"\)\}/,
    "Unit mode must render the integrated card and return to the chooser through real state."
  );
});

test("Unit Exercise keeps the candidate's roomy large-desktop mission composition", () => {
  const summaryStart = practicePageSource.indexOf("function PracticeMissionSummary");
  const summaryEnd = practicePageSource.indexOf("type QuestionPagerProps", summaryStart);
  const summarySource = practicePageSource.slice(summaryStart, summaryEnd);

  assert.match(practicePageSource, /max-w-\[1650px\]/);
  assert.match(practicePageSource, /2xl:py-8/);
  assert.match(summarySource, /2xl:p-7/);
  assert.match(summarySource, /2xl:min-h-\[52px\]/);
  assert.match(summarySource, /2xl:min-w-\[198px\]/);
  assert.match(summarySource, /2xl:size-\[72px\]/);
  assert.match(summarySource, /2xl:text-2xl/);
  assert.match(practicePageSource, /2xl:min-h-\[393px\]/);
  assert.match(practicePageSource, /roomyOnLargeScreens/);
  assert.match(practiceQuestPagerSource, /2xl:min-w-\[210px\]/);
  assert.match(practiceQuestPagerSource, /2xl:size-14/);
});

test("hidden practice rounds stop reacting while the learner chooses a mode", () => {
  const pagerStart = practicePageSource.indexOf("function QuestionPager");
  const pagerEnd = practicePageSource.indexOf("export default function PracticePage", pagerStart);
  const pagerSource = practicePageSource.slice(pagerStart, pagerEnd);
  const interactionWiringCount = (
    practicePageSource.match(/interactionEnabled=\{practiceArenaMode !== "chooser"\}/g) ?? []
  ).length;

  assert.match(pagerSource, /interactionEnabled = true/);
  assert.match(pagerSource, /if \(!interactionEnabled \|\| !questionCount\) return;/);
  assert.match(pagerSource, /if \(interactionEnabled\) return;\s*clearAutoAdvance\(\);\s*stopReadAloud\(\);/);
  assert.match(pagerSource, /questionStartedAtRef\.current = \{\};/);
  assert.match(pagerSource, /if \(!interactionEnabled \|\| questionCount < 2\) return;/);
  assert.match(pagerSource, /if \(!interactionEnabled\) return;\s*questionStartedAtRef/);
  assert.equal(
    interactionWiringCount,
    2,
    "Both adaptive and free-selection pagers must be inert while the chooser hides them."
  );
});

test("Practice Arena mode changes preserve focus and intentional scroll behavior", () => {
  const handlerStart = practicePageSource.indexOf("const handlePracticeArenaModeChange");
  const handlerEnd = practicePageSource.indexOf("const handleAdventureStartMission", handlerStart);
  const handler = practicePageSource.slice(handlerStart, handlerEnd);

  assert.match(handler, /setPracticeArenaMode\(nextMode\)/);
  assert.match(handler, /nextMode !== "unit"/);
  assert.match(handler, /prefersReducedMotion \? "auto" : "smooth"/);
  assert.match(handler, /"unit-exercise-mission-title"/);
  assert.match(handler, /"practice-adventure-title"/);
  assert.match(handler, /focus\(\{ preventScroll: true \}\)/);
});

test("Practice Arena does not load student adaptive practice for teacher accounts", () => {
  const studentRoleFlagIndex = practicePageSource.indexOf('const isStudentAccount = currentUser?.role === "student";');
  const adaptiveRoleGuardIndex = practicePageSource.indexOf("if (!isStudentAccount) {");
  const adaptiveFetchIndex = practicePageSource.indexOf("fetch(`/api/adaptive-learning/next?");

  assert.ok(studentRoleFlagIndex >= 0, "Expected Practice Arena to define a student-account role flag.");
  assert.ok(adaptiveRoleGuardIndex > studentRoleFlagIndex, "Expected adaptive loading to check the student-account flag.");
  assert.ok(adaptiveFetchIndex > adaptiveRoleGuardIndex, "Expected the role guard to run before the student adaptive fetch.");
});

test("Practice Arena rehydrates the completed game-eligible round after refresh", () => {
  assert.match(practicePageSource, /completedPracticeRoundStorageKey/);
  assert.match(
    practicePageSource,
    /const \[rememberedGameRoundPayload, setRememberedGameRoundPayload\] = useState<PracticeGameRoundPayload \| null>\(null\)/
  );
  assert.match(
    practicePageSource,
    /readPracticeGameRoundPayload\(window\.localStorage\.getItem\(completedPracticeRoundStorageKey\(currentUser\?\.id\)\)\)/
  );
  assert.match(
    practicePageSource,
    /const activeSummaryGameRoundPayload = useMemo\(\s*\(\) => gamePayloadFromPracticeSummary\(activePracticeSummary\),\s*\[activePracticeSummary\]\s*\);/
  );
  assert.match(
    practicePageSource,
    /activeSummaryGameRoundPayload \?\? \(!activePracticeSummary\?\.isComplete \? rememberedGameRoundPayload : null\)/
  );
  assert.match(
    practicePageSource,
    /samePracticeGameRoundPayload\(currentPayload, gameRoundPayload\) \? currentPayload : gameRoundPayload/
  );
  assert.match(
    practicePageSource,
    /window\.localStorage\.setItem\(completedPracticeRoundStorageKey\(currentUser\?\.id\), JSON\.stringify\(gameRoundPayload\)\)/
  );
  assert.match(practicePageSource, /rememberedGameRoundPayload\?\.correctRoundQuestionIds\.length/);
});

test("Practice Arena derives island progress from persisted region stars", () => {
  assert.match(practicePageSource, /const adventureProgressTotal = practiceIslandStarTotalMax;/);
  assert.match(practicePageSource, /practiceIslandStarTotal\(islandStars\)/);
  assert.doesNotMatch(
    practicePageSource,
    /const adventureProgressTotal = 30;/,
    "Island progress must not fall back to the old hardcoded 30-star denominator."
  );
});

test("Practice Arena awards region stars once per completed round", () => {
  assert.match(practicePageSource, /awardedIslandRoundKeysRef\.current\.has\(adaptivePracticeSummary\.roundKey\)/);
  assert.match(practicePageSource, /awardedIslandRoundKeysRef\.current\.has\(freeSelectionPracticeSummary\.roundKey\)/);
  assert.match(practicePageSource, /awardIslandStars\("question-cavern", practiceIslandStarsForAccuracy\(adaptivePracticeSummary\.accuracyPercent\), \{ celebrate: true \}\)/);
  assert.match(practicePageSource, /: "challenge-shore";/);
});

test("Practice Arena wires island region selection into the mission flow", () => {
  assert.match(practicePageSource, /onRegionSelect=\{handleIslandRegionSelect\}/);
  assert.match(practicePageSource, /regions=\{islandRegionStatuses\}/);
  assert.match(practicePageSource, /id="mission-setup-filters"/);
});

test("Practice Arena renders the mission trail with tappable stepping stones", () => {
  // The trail moved into components/practice/PracticeQuestPager.tsx, and the page now passes its
  // test id as a prop. The behaviour this guards is unchanged — verified at runtime, where the
  // active stone carries aria-current="step" and its siblings do not — so the assertions follow
  // the markup rather than the page keeping it inline.
  assert.match(practicePageSource, /testId="mission-trail"/, "the page must still name the trail");
  assert.match(practiceQuestPagerSource, /data-testid=\{testId\}/);
  assert.match(practiceQuestPagerSource, /aria-current=\{isCurrentStone \? "step" : undefined\}/);
  assert.match(practiceQuestPagerSource, /onClick=\{\(\) => onSelect\(index\)\}/);
  assert.doesNotMatch(
    practicePageSource,
    /bg-gradient-to-r from-emerald-400 via-sky-400 to-blue-500/,
    "The exam-style progress bar must stay replaced by the stepping-stone trail."
  );
});

test("Practice Arena hides the numeric Jump form for K-P3 rounds only", () => {
  assert.match(practicePageSource, /const isYoungLearnerRound = isYoungLearnerPracticeRound\(questions\);/);
  assert.match(practicePageSource, /\{isYoungLearnerRound \? null : \(/);
  assert.match(
    practicePageSource,
    /\{t\(\{ en: "Jump to", zh: "跳到題號" \}\)\}/,
    "Older students must keep the Jump form."
  );
});

test("Practice Arena locks the grade to a signed-in student's own profile grade", () => {
  assert.match(
    practicePageSource,
    /const studentFixedGrade = adventureGradeLock\.gradeSelectionDisabled \? studentProfileGrade : null;/
  );
  assert.match(
    practicePageSource,
    /\{!studentFixedGrade \? \(/,
    "The Grade select must stay behind the student grade lock: students practise at their own grade."
  );
});

test("Practice Arena summary switches to kid-register praise for K-P3 rounds", () => {
  assert.match(practicePageSource, /isYoungLearnerPracticeRound\(activePracticeSummary\.results\.map\(\(result\) => result\.question\)\)/);
  assert.match(practicePageSource, /isYoungLearnerSummary\s*\n?\s*\? youngPracticePraise\(activePracticeSummary\.accuracyPercent\)/);
  assert.match(practicePageSource, /data-testid="young-summary-stars"/);
  assert.match(practicePageSource, /data-testid="young-summary-tip"/);
  assert.match(practicePageSource, /youngPracticeStarLine\(activePracticeSummary\.correctCount, activePracticeSummary\.totalQuestions\)/);
  assert.match(
    practicePageSource,
    /metacognitionSuggestion\(activePracticeSummary\.accuracyPercent\)/,
    "Older students must keep the metacognition guidance."
  );
});

test("Practice question card offers read-aloud only for young learners", () => {
  assert.match(practiceQuestionCardSource, /const shouldShowReadAloud = isYoungLearnerPracticeGrade\(question\.grade\);/);
  assert.match(practiceQuestionCardSource, /data-testid="practice-read-aloud"/);
  assert.match(practiceQuestionCardSource, /aria-pressed=\{isReadingAloud\}/);
  assert.match(
    practiceQuestionCardSource,
    /stopPracticeReadAloud\(\);\s*\n\s*setIsReadingAloud\(false\);\s*\n\s*if \(photoInputRef\.current\)/,
    "Speech must stop when the question changes."
  );
  assert.match(practiceQuestionCardSource, /useEffect\(\(\) => \(\) => stopPracticeReadAloud\(\), \[\]\);/);
});

test("Practice Arena syncs island stars with the gamification server for students", () => {
  assert.match(practicePageSource, /fetch\("\/api\/gamification\/practice-island", \{ signal: abortController\.signal \}\)/);
  assert.match(
    practicePageSource,
    /if \(currentUser\?\.role !== "student"\) \{\s*\n\s*setIslandStars\(localRecord\);\s*\n\s*return;/,
    "Guests must stay localStorage-only."
  );
  assert.match(practicePageSource, /method: "POST",\s*\n\s*headers: \{ "Content-Type": "application\/json" \},\s*\n\s*body: JSON\.stringify\(\{ regionId, stars/);
  assert.match(
    practicePageSource,
    /games=\{\{ adventureIslandUnlocked: hasAdventureIslandUnlock, fishingMasterUnlocked: hasFishingGameUnlock \}\}/,
    "The map must receive live game unlock state."
  );
});

test("Practice Arena claims guest-earned stars for the logged-in student", () => {
  assert.match(
    practicePageSource,
    /readPracticeIslandStarRecord\(window\.localStorage\.getItem\(practiceIslandStarStorageKey\(null\)\)\)/,
    "The guest-keyed star record must be read when a student loads the arena."
  );
  assert.match(practicePageSource, /const claimedRecord = mergePracticeIslandStarRecords\(localRecord, guestRecord\);/);
  assert.match(
    practicePageSource,
    /window\.localStorage\.removeItem\(practiceIslandStarStorageKey\(null\)\)/,
    "The guest record must be cleared after it is claimed."
  );
  assert.match(
    practicePageSource,
    /for \(const \[regionId, stars\] of Object\.entries\(claimedRecord\)\)/,
    "Server pushes must compare against the claimed record so guest stars reach the account."
  );
});

test("Practice Arena flies awarded stars from the summary to their map region", () => {
  assert.match(practicePageSource, /\{ celebrate: true \}/, "Summary-driven awards must queue the star flight.");
  assert.match(practicePageSource, /const closePracticeSummary = useCallback\(/);
  assert.doesNotMatch(
    practicePageSource.replace(/pendingStarFlightRef\.current = null;\s*\n\s*setPracticeSummaryOpen\(false\);/, ""),
    /onClick=\{\(\) => setPracticeSummaryOpen\(false\)\}/,
    "Every user-facing summary close control must go through closePracticeSummary."
  );
  assert.match(practicePageSource, /data-testid="island-star-flight"/);
  assert.match(practicePageSource, /pulseRegionId=\{pulseRegionId\}/);
  assert.match(
    practicePageSource,
    /if \(!targetElement \|\| prefersReducedMotion\) \{\s*\n\s*setPulseRegionId\(pending\.regionId\);/,
    "Reduced motion must skip the flight but still highlight the region."
  );
});

test("Practice question card renders counting dot cards for K-P1 counting prompts", () => {
  assert.match(practiceQuestionCardSource, /const dotCardQuantities = countingDotCardQuantitiesFor\(question\);/);
  assert.match(practiceQuestionCardSource, /\{dotCardQuantities\.length \? <CountingDotCards quantities=\{dotCardQuantities\} t=\{t\} \/> : null\}/);
});

test("Practice Arena sound effects default off and persist per user", () => {
  assert.match(practicePageSource, /readPracticeSoundEnabled\(window\.localStorage\.getItem\(practiceSoundStorageKey\(currentUser\?\.id\)\)\)/);
  assert.match(practicePageSource, /\[soundEnabled, setSoundEnabled\] = useState\(false\)/);
  assert.match(practicePageSource, /aria-pressed=\{soundEnabled\}/);
  assert.match(practicePageSource, /playPracticeSound\(isRoundNowComplete \? "complete" : feedback\.correct \? "correct" : "wrong"\)/);
});

test("Practice Arena stores completed round questions with the Adventure Island unlock payload", () => {
  assert.match(practicePageSource, /roundQuestions\?: PublicQuestion\[\]/);
  assert.match(
    practicePageSource,
    /roundQuestions:\s*summary\.results\.map\(\(result\) => result\.question\)/
  );
});

/**
 * D-12: "Start Mission" ran its handler and scrolled nowhere. It passed only "free-selection" to
 * scrollToPracticeSection, which resolves ids with getElementById and silently skips misses —
 * and "free-selection" is a PracticeSummaryMode, never a rendered element id.
 *
 * Asserts the SCROLL TARGETS, not that the button exists. The button always existed and always
 * took the click; that is exactly why the defect survived four drives.
 */
test("Start Mission scrolls to a section that is actually rendered", () => {
  const handler = practicePageSource.slice(
    practicePageSource.indexOf("const handleAdventureStartMission")
  ).slice(0, 900);

  assert.doesNotMatch(
    handler,
    /scrollToPracticeSection\(\s*"free-selection"\s*\)/,
    "passing only the never-rendered id is the D-12 regression"
  );
  assert.match(
    handler,
    /"adaptive-practice-round"/,
    "must fall back to a section that renders"
  );
  assert.match(
    handler,
    /"mission-setup-filters"/,
    "must use the same final fallback as every sibling scrollToPracticeSection call"
  );
});

test("the fallback ids used by Start Mission are rendered on the page", () => {
  for (const id of ["adaptive-practice-round", "mission-setup-filters"]) {
    assert.match(
      practicePageSource,
      new RegExp(`id="${id}"`),
      `${id} must exist as a real element id, or the fallback is decorative`
    );
  }
});
