import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const practicePageSource = readFileSync(join(process.cwd(), "app/practice/page.tsx"), "utf8");

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
    /const canFallbackToFreeSelection = questionCatalogLoaded && !questionCatalogError && !adaptivePlan;/,
    "Expected free selection to unlock after a successful catalog load, even when the selected grade has no catalog rows."
  );
  assert.doesNotMatch(
    practicePageSource,
    /const canFallbackToFreeSelection = questionCatalogCount > 0 && !adaptivePlan;/,
    "A zero-count catalog must not hide the only controls that let guests broaden Practice Arena filters."
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

test("Practice Arena stores completed round questions with the Adventure Island unlock payload", () => {
  assert.match(practicePageSource, /roundQuestions\?: PublicQuestion\[\]/);
  assert.match(
    practicePageSource,
    /roundQuestions:\s*summary\.results\.map\(\(result\) => result\.question\)/
  );
});
