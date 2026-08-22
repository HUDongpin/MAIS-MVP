import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

test("login native select options keep explicit contrast in dark mode dropdowns", async () => {
  const page = await source("app/login/page.tsx");

  assert.match(page, /loginSelectOptionClassName/);
  assert.match(page, /<option key=\{publisher\} value=\{publisher\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /<option key=\{grade\.id\} value=\{grade\.id\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /bg-white text-slate-950/);
  assert.match(page, /dark:bg-slate-950 dark:text-white/);
});

test("legacy Visualization Lab route still activates the Visualization Lab nav item", async () => {
  const navbar = await source("components/layout/Navbar.tsx");

  assert.match(navbar, /activePaths: \[studentVisualizationToolsPath, "\/visualization-lab"\]/);
});

test("teacher class creation form keeps compact labels on one line", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /lg:grid-cols-\[minmax\(180px,1\.2fr\)_120px_180px_minmax\(220px,1fr\)_auto\]/);
  assert.match(view, /whitespace-nowrap/);
});

test("teacher mastery-target controls stack before cramped desktop widths", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /2xl:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(0,0\.8fr\)\]/);
  assert.match(view, /className="focus-ring min-h-11 w-full min-w-0 rounded-2xl/);
  assert.doesNotMatch(view, /lg:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(180px,0\.8fr\)\]/);
});

test("adaptive knowledge galaxy avoids horizontal overflow on personalized learning", async () => {
  const galaxy = await source("components/dashboard/AdaptiveKnowledgeGalaxy.tsx");

  assert.match(galaxy, /className="mt-7 min-w-0 overflow-hidden pb-2"/);
  assert.match(galaxy, /className="relative h-\[28rem\] min-w-0 sm:h-\[31rem\]"/);
  assert.doesNotMatch(galaxy, /mt-7 overflow-x-auto pb-2/);
  assert.doesNotMatch(galaxy, /sm:min-w-\[58rem\]/);
});

test("about Mission Setup renders a five-question preview from real question data", async () => {
  // The preview now flows through buildPracticeMissionPreviewSample (a small
  // grade-stratified sample instead of the full question bank in the RSC
  // payload); the sample builder is where the answer field must stay omitted.
  const aboutPage = await source("app/about/page.tsx");
  const setup = await source("components/practice/PracticeMissionSetupControls.tsx");
  const sample = await source("lib/practiceMissionPreviewSample.ts");

  assert.match(aboutPage, /buildPracticeMissionPreviewSample\(questions\)/);
  assert.match(aboutPage, /questionPreviewItems=\{practiceMissionPreviewItems\}/);
  assert.match(setup, /data-practice-mission-preview-card/);
  assert.match(setup, /\.slice\(0, 5\)/);
  assert.doesNotMatch(sample, /answer: question\.answer/);
  assert.doesNotMatch(aboutPage, /answer: question\.answer/);
});

test("public practice mission showcase does not present a logged-out checkpoint as in progress", async () => {
  const showcase = await source("components/practice/PersonalizedPracticeMissionShowcase.tsx");

  assert.match(showcase, /Personalized Practice Mission/);
  assert.match(showcase, /Start/);
  assert.match(showcase, /Ready/);
  assert.doesNotMatch(showcase, /In progress/);
  assert.doesNotMatch(showcase, /Round progress|Personalized set progress|aria-valuenow/);
});

test("student assignments route exposes the final heading while assignments load", async () => {
  // The heading-while-loading state now lives ONLY in StudentAssignmentsView's
  // isLoading branch (initial state, so SSR emits it directly). The former
  // route-level loading.tsx duplicated the same copy and was removed because a
  // segment-level loading file carries the hidden-segment streaming race (see
  // the loading-file test below).
  const assignmentsView = await source("components/dashboard/StudentAssignmentsView.tsx");

  const loadingStart = assignmentsView.indexOf("if (isLoading)");
  const nextBranch = assignmentsView.indexOf("if (!currentUser", loadingStart);
  assert.ok(loadingStart >= 0 && nextBranch > loadingStart);
  const loadingBranch = assignmentsView.slice(loadingStart, nextBranch);

  assert.match(loadingBranch, /My assignments/);
  assert.match(loadingBranch, /Loading assignments/);
});

test("routes without slow server data carry no segment-level loading file", () => {
  // Any segment-level loading.tsx makes Next 15.5 stream the page into a
  // hidden segment (<div hidden id="S:N"> parked at body level) and the
  // vendored React defers the visible swap: $RC only marks the boundary "$~"
  // and queues $RV behind rAF/setTimeout (~300ms nominal, seconds under CPU
  // load). Hydration plus provider updates client-render the boundary first,
  // so the document transiently holds TWO full copies of the page — Playwright
  // strict-mode "resolved to 2 elements" flakes and duplicate-id bugs.
  // None of these routes awaits server data (they SSR client shells that fetch
  // after hydration, or are pure redirects), so a route-level skeleton buys
  // nothing and only carries the race. Verified 2026-07-26 against a prod
  // build: with these files present every route below served '<template
  // id="B:' + '<div hidden id="S:' markers; without them, none did. Only
  // reintroduce a loading.tsx where the route genuinely awaits slow server
  // data, and document why next to it. app/student/lessons was the originally
  // root-caused route (PR #69); its served-HTML marker guard lives at the end
  // of the free-selection test in practice-pager.spec.ts.
  const racyLoadingFiles = [
    "app/adaptive-learning/loading.tsx",
    "app/lesson/loading.tsx",
    "app/personalized-learning/loading.tsx",
    "app/practice/loading.tsx",
    "app/student/assignments/loading.tsx",
    "app/student/lessons/loading.tsx",
    "app/student/tools/visualizations/loading.tsx",
    "app/visualization-lab/loading.tsx"
  ];

  for (const file of racyLoadingFiles) {
    assert.ok(
      !existsSync(join(process.cwd(), file)),
      `${file} reintroduces the hidden-segment streaming race on a route with no slow server data.`
    );
  }
});

test("personalized learning eagerly prepares the assignments route before the All assignments CTA is used", async () => {
  const adaptive = await source("components/dashboard/AdaptiveLearningContent.tsx");

  assert.match(adaptive, /router\.prefetch\(studentAssignmentsPath\)/);
  assert.match(adaptive, /fetch\(studentAssignmentsPath,\s*\{[\s\S]*method: "GET"[\s\S]*\}/);
  assert.match(adaptive, /<Link[\s\S]*href=\{studentAssignmentsPath\}[\s\S]*prefetch=\{true\}/);
});

test("teacher add-student mutation returns refreshed detail for immediate count updates", async () => {
  const route = await source("app/api/teacher/classes/[classId]/students/route.ts");
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(route, /getTeacherClassDetailData/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, detail \}, \{ status: 201 \}\)/);
  assert.match(view, /const \[currentDetail, setCurrentDetail\] = useState\(detail\)/);
  assert.match(view, /if \(payload\?\.detail\) setCurrentDetail\(payload\.detail\)/);
  assert.match(view, /currentDetail\.class\.studentCount/);
});

test("completed lesson progress stores full completion mastery", async () => {
  const persistence = await source("lib/server/userStore/studentActivityPersistence.ts");
  const persistenceTest = await source("lib/server/userStoreStudentActivityPersistence.test.ts");

  assert.match(persistence, /status === "completed"[\s\S]{0,120}Math\.max\(existing\?\.mastery \?\? 0, 100\)/);
  assert.match(persistenceTest, /status: "completed",\n\s+mastery: 100/);
  assert.doesNotMatch(persistence, /Math\.max\(existing\?\.mastery \?\? 0, 85\)/);
});

test("lesson place-value illustration derives tens and ones from the focus number", async () => {
  const illustration = await source("components/lesson/WorkedExampleIllustration.tsx");

  assert.match(illustration, /const numberMatch = focusText\.match\(\/\\d\+\/\)/);
  assert.match(illustration, /const focusNumber = numberMatch \? Math\.min\(99, Math\.max\(0, Number\(numberMatch\[0\]\)\)\) : 38/);
  assert.match(illustration, /const tens = Math\.floor\(focusNumber \/ 10\)/);
  assert.match(illustration, /const ones = focusNumber % 10/);
  assert.match(illustration, /Array\.from\(\{ length: tens \}/);
  assert.match(illustration, /Array\.from\(\{ length: ones \}/);
});

test("practice answer submissions persist attached work photos, not just accept them", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");
  const route = await source("app/api/attempts/route.ts");
  const store = await source("lib/server/practiceAttemptStore.ts");

  // The original version of this gate asserted only that the client SENT
  // `answerWorkPhotos` and that the route READ them. Both were true while the
  // route dropped the parsed value on the floor and nothing in lib/ ever stored
  // it — the gate was green for months against a feature that did nothing.
  // Assert the effect instead: the value has to reach the store and the column.
  assert.match(card, /answerWorkPhotos:/);
  assert.match(route, /submitQuestionAttemptFast\(\{[\s\S]{0,400}answerWorkPhotos/);
  assert.match(store, /answer_work_photos/);
  assert.match(store, /persistQuestionAttempt\(\{[\s\S]{0,400}answerWorkPhotos/);

  // Photo bytes belong in the governed media-object store (scanned, encrypted,
  // retention-bounded); practice_attempts holds references only.
  assert.match(route, /practice-work-photo\//);
  assert.doesNotMatch(store, /dataUrl/);
});

test("practice photo attachment control is localized in Chinese modes", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");

  assert.match(card, /photoAttachmentCopy/);
  assert.match(card, /zh: "加入相片"/);
  assert.match(card, /zhHans: "添加照片"/);
  assert.match(card, /<span>\{t\(photoAttachmentCopy\.addPhotos\)\}<\/span>/);
  assert.match(card, /aria-label=\{t\(photoAttachmentCopy\.addPhotos\)\}/);
  assert.doesNotMatch(card, /<span>Add photos<\/span>/);
  assert.doesNotMatch(card, /aria-label="Add photos"/);
});

test("student grading surfaces share one non-truncating answer-length contract", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");
  const handwriting = await source("components/practice/HandwritingAnswerBoard.tsx");
  const keyboard = await source("components/practice/MathSoftKeyboard.tsx");
  const assessmentPage = await source("app/student/assessments/[assessmentId]/page.tsx");
  const attemptsRoute = await source("app/api/attempts/route.ts");
  const assessmentRoute = await source("app/api/assessments/[assessmentId]/submit/route.ts");
  const matcher = await source("lib/server/answerMatching.ts");
  const helper = await source("lib/mathSoftKeyboardCalculation.ts");

  for (const clientSource of [card, handwriting, assessmentPage]) {
    assert.match(clientSource, /MAX_ANSWER_LENGTH/);
    assert.match(clientSource, /maxLength=\{MAX_ANSWER_LENGTH\}/);
  }
  assert.match(keyboard, /isAnswerWithinLengthLimit/);
  assert.match(attemptsRoute, /isAnswerWithinLengthLimit/);
  assert.match(assessmentRoute, /isAnswerWithinLengthLimit/);
  assert.match(matcher, /isAnswerWithinLengthLimit/);
  assert.match(helper, /isAnswerWithinLengthLimit\(completed\)/);
  assert.doesNotMatch(attemptsRoute, /selectedAnswer[^\n]+slice\(0,/);
});

test("focused accommodations CI continuously executes long-form teacher grading regressions", async () => {
  const runner = await source("scripts/run-accommodations-tests.mjs");
  const config = await source("tsconfig.accommodations.json");

  assert.match(runner, /userStoreTeacherOpsSubmissionPersistence\.test\.js/);
  assert.match(config, /lib\/server\/userStoreTeacherOpsSubmissionPersistence\.test\.ts/);
  assert.doesNotMatch(runner, /process\.exit\(/);
  assert.match(runner, /if \(!compiled\) return;/);
  assert.match(runner, /if \(!passed\) return;/);
  assert.match(runner, /if \(!routeTestsPassed\) return;/);
  assert.match(runner, /finally\s*\{\s*cleanup\(\);\s*\}/);
});

test("option audits pass learner option text before curated accepted metadata", async () => {
  const bank = await source("lib/questionBankSolvability.ts");
  const practiceAudit = await source("tests/e2e/practice-bank-solvability.spec.ts");
  const productionAudit = await source("tests/e2e/production-question-bank-solvability.spec.ts");

  assert.doesNotMatch(bank, /answerMatches\(acceptedAnswer, option\./);
  assert.doesNotMatch(bank, /answerMatches\(solverAnswer, optionText\)/);
  assert.doesNotMatch(practiceAudit, /answerMatches\(acceptedAnswer, option\./);
  assert.doesNotMatch(productionAudit, /answerMatches\(independentAnswer, option\./);
});

test("required frontend browser gate is wired to the disposable owner-run architecture", async () => {
  const workflow = await source(".github/workflows/ci.yml");
  const packageManifest = JSON.parse(await source("package.json")) as {
    scripts?: Record<string, string>;
  };
  const helper = await source("scripts/playwright-owner-paths.mjs");
  const runner = await source("scripts/run-required-frontend-browser-contracts.mjs");
  const keyboardSpec = await source("tests/e2e/practice-math-keyboard.spec.ts");
  const lessonMenuSpec = await source("tests/e2e/lesson-world-menu.spec.ts");
  const nextConfig = await source("next.config.ts");
  const playwrightConfig = await source("playwright.config.ts");

  assert.equal(
    packageManifest.scripts?.["test:required-browser-harness"],
    "node --test --test-concurrency=1 scripts/bug3-owner-run-plan.test.mjs scripts/playwright-owner-paths.test.mjs scripts/provision-exact-browser-dependencies.test.mjs scripts/required-browser-execution-scope.test.mjs scripts/required-browser-runner.test.mjs scripts/test-fixture-capability.test.mjs"
  );
  assert.equal(
    packageManifest.scripts?.["test:source-regressions"],
    "node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json --test tests/e2e/reported-bug-source-regressions.test.ts"
  );
  assert.equal(
    packageManifest.scripts?.["test:required-browser-source-canary"],
    "node --test scripts/required-browser-source-canary.test.mjs"
  );
  assert.equal(
    packageManifest.scripts?.["test:required-frontend-browser-contracts"],
    "node scripts/run-required-frontend-browser-contracts.mjs"
  );
  assert.match(workflow, /npm run test:required-browser-source-canary/);
  assert.doesNotMatch(workflow, /npm run test:required-browser-harness/);
  const visualizationJob = workflow.match(
    /\n  visualization-browser:[\s\S]+?(?=\n  teacher-parent-e2e:)/
  )?.[0];
  assert.ok(visualizationJob, "visualization-browser job should remain discoverable");
  const teacherParentJob = workflow.match(/\n  teacher-parent-e2e:[\s\S]+$/)?.[0];
  assert.ok(teacherParentJob, "teacher-parent-e2e job should remain discoverable");
  for (const job of [visualizationJob, teacherParentJob]) {
    assert.match(job, /npm run test:required-browser-source-canary/);
    assert.match(job, /npm run test:source-regressions/);
    assert.doesNotMatch(job, /playwright install|playwright test|test:required-frontend-browser-contracts/i);
  }
  assert.doesNotMatch(workflow, /upload-artifact|actions\/cache|\bpost:/i);
  assert.doesNotMatch(workflow, /retention-days|if-no-files-found|\.tmp\/e2e-run-/i);
  assert.equal(
    packageManifest.scripts?.["test:backend"],
    "node scripts/reject-direct-browser-entry.mjs test:backend"
  );
  assert.equal(
    packageManifest.scripts?.["test:e2e"],
    "node scripts/reject-direct-browser-entry.mjs test:e2e"
  );
  assert.match(helper, /export function createValidatedRunPlan/);
  assert.match(helper, /export function bootstrapValidatedRunPlan/);
  assert.match(helper, /export function materializeValidatedRunPlan/);
  assert.match(helper, /export function cleanupValidatedEphemeralLeaves/);
  assert.match(helper, /ephemeralRoot/);
  assert.match(helper, /evidenceRoot/);
  assert.match(helper, /preflight-manifest\.json/);
  assert.match(helper, /validated-summary\.json/);
assert.match(helper, /renameSync\(target, quarantinePath\)/);
assert.match(helper, /cleanup intentionally stops after verified quarantine/);
assert.doesNotMatch(helper, /rmSync\(quarantinePath/);
  assert.match(helper, /afterQuarantineRename/);
  assert.match(nextConfig, /validatePlaywrightOwnerEnvironment/);
  assert.match(nextConfig, /const tsconfigPath = explicitTsconfigPath \|\| "tsconfig\.next\.json"/);
  assert.doesNotMatch(
    nextConfig,
    /\b(?:writeFileSync|renameSync|unlinkSync|rmSync|readdirSync|mkdirSync)\s*\(/
  );
  assert.doesNotMatch(nextConfig, /retainOrphaned|sweepOrphaned|disposableTsconfigForDist/);
assert.doesNotMatch(runner, /rmSync\([^\n]+recursive:\s*true/);
  assert.doesNotMatch(playwrightConfig, /rm -rf|npm run start|MAIS_ALLOW_EXTERNAL_ARTIFACTS/);
  assert.match(playwrightConfig, /webServer:\s*undefined/);
  assert.match(runner, /grep:\s*"Practice math keyboard responsive layout gate"/);
  assert.match(runner, /grep:\s*"Bug 3 desktop lesson pane contract"[\s\S]+minimumSelected:\s*6/);
  assert.match(runner, /grep:\s*"Bug 3 mobile lesson flow contract"[\s\S]+minimumSelected:\s*1/);
  assert.match(
    runner,
    /project:\s*"desktop-chrome"[\s\S]+contracts:\s*\[[\s\S]+visualizationContract,[\s\S]+keyboardRequiredContract,[\s\S]+keyboardResponsiveContract,[\s\S]+bug3DesktopLessonPaneContract/
  );
  assert.match(
    runner,
    /project:\s*"mobile-chrome"[\s\S]+contracts:\s*\[keyboardResponsiveContract,\s*bug3MobileLessonFlowContract\]/
  );
  assert.match(runner, /collectFamily\(project, contract, runEnvironment, \{/);
  assert.match(runner, /grep:\s*"Visualization Lab runtime-ready DOM contract"[\s\S]+minimumSelected:\s*3/);
  assert.match(runner, /grep:\s*"Practice math keyboard required gate"[\s\S]+minimumSelected:\s*2/);
  assert.match(runner, /grep:\s*"Practice math keyboard responsive layout gate"[\s\S]+minimumSelected:\s*2/);
  assert.match(runner, /tuples\.length < minimumSelected/);
  assert.match(runner, /expected at least \$\{minimumSelected\}/);
  assert.match(runner, /minimumPassed:\s*6/);
  assert.match(runner, /minimumPassed:\s*1/);
  assert.match(runner, /--reporter=line/);
  assert.match(runner, /\["json", \{ outputFile:/);
  assert.match(runner, /\["html", \{ open: "never", outputFolder:/);
  assert.match(runner, /assertRequiredBug3Outcomes/);
  assert.match(runner, /validateFinalRequiredBrowserReport/);
  assert.match(runner, /disallowed skip\/fixme/);
  assert.match(runner, /JSON\.parse/);
  assert.match(runner, /writeExecutionConfig/);
  assert.match(runner, /evidencePaths\.finalResults/);
  assert.match(runner, /evidencePaths\.finalReport/);
  assert.match(runner, /evidencePaths\.validatedSummary/);
  assert.match(runner, /sourceFingerprints/);
  assert.match(runner, /assertSourceFingerprintsUnchanged/);
  assert.match(runner, /cleanupValidatedEphemeralLeaves/);
  assert.match(runner, /failureForEvidence/);
  assert.match(runner, /writeAndValidateTerminalSummary/);
  assert.match(runner, /persistSanitizedProcessAuditSample/);
  assert.match(runner, /createBoundedRedactedLog/);
  assert.match(runner, /spawnOwnedProcess/);
  assert.match(runner, /shutdownSpawnOwnedProcesses/);
  assert.match(runner, /processHasOwnerToken/);
  assert.match(runner, /signal:\s*"SIGTERM"/);
  assert.match(runner, /signal:\s*"SIGKILL"/);
  assert.match(runner, /status:\s*"failed"/);
  assert.match(runner, /shutdownClean/);
  assert.match(
    runner,
    /persistProcessState\(\s*plan,\s*processState,\s*processAudits,\s*"final"\s*\)/
  );
  assert.match(runner, /ownedProcesses/);
  assert.match(runner, /selectEvidenceEnvironment/);
  assert.match(runner, /stdio:\s*\["ignore", "pipe", "pipe"\]/);
  assert.match(runner, /stableCiFailureMessage/);
  assert.match(
    runner,
    /main\(\)\.then\([\s\S]+console\.error\(stableCiFailureMessage\(\)\)/
  );
  assert.doesNotMatch(runner, /console\.error\((?:error|primaryError|failure)/);
  assert.match(runner, /randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(runner, /assertCanonicalStarshipBrowserHost/);
  assert.match(runner, /resolveOwnedBrowserCommands/);
  assert.match(runner, /@playwright\/test\/cli/);
  assert.doesNotMatch(runner, /node_modules\/.bin\/playwright/);
  assert.match(playwrightConfig, /validatePlaywrightOwnerEnvironment/);
  assert.match(playwrightConfig, /PLAYWRIGHT_RUN_PLAN_MANIFEST/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract isolates pointer scrolling and clicks"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract reveals the real next-item CTA inside content"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract survives a dynamic CTA chunk delayed beyond 420ms"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract reveals a cold dynamic CTA with reduced motion"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract confines keyboard scrolling to the focused named region"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 desktop lesson pane contract fits short-wide Simplified Chinese geometry"/);
  assert.match(lessonMenuSpec, /test\("Bug 3 mobile lesson flow contract preserves a single document scroller"/);
  assert.match(runner, /shutdownClean[\s\S]+cleanupValidatedEphemeralLeaves/);
  assert.match(keyboardSpec, /topicId: "statistics-s6"/);
  assert.match(keyboardSpec, /questionId: "q12"/);
  assert.match(keyboardSpec, /article\[data-question-id=/);
});

test("required browser outcome parser rejects a selected-but-skipped Bug 3 result", async () => {
  const runnerUrl = pathToFileURL(
    join(process.cwd(), "scripts/run-required-frontend-browser-contracts.mjs")
  );
  runnerUrl.searchParams.set("outcome-unit", String(Date.now()));
  const originalArgv = process.argv;
  process.argv = [originalArgv[0] ?? "node", originalArgv[1] ?? "source-regressions", "--list"];
  let runner: {
    assertRequiredBug3Outcomes?: (
      report: unknown,
      requirements: Array<{
        grep: string;
        label: string;
        minimumPassed: number;
        project: string;
      }>
    ) => unknown;
  };
  try {
    runner = await import(runnerUrl.href) as typeof runner;
  } finally {
    process.argv = originalArgv;
  }
  assert.equal(typeof runner.assertRequiredBug3Outcomes, "function");

  const requirement = [{
    grep: "Bug 3 desktop lesson pane contract",
    label: "Synthetic Bug 3 desktop family",
    minimumPassed: 6,
    project: "desktop-chrome"
  }];
  const syntheticReport = (lastStatus: "passed" | "skipped", expectedStatus: "passed" | "skipped") => ({
    suites: [{
      title: "synthetic.spec.ts",
      specs: Array.from({ length: 6 }, (_, index) => ({
        title: `Bug 3 desktop lesson pane contract synthetic ${index + 1}`,
        tests: [{
          expectedStatus: index === 5 ? expectedStatus : "passed",
          projectName: "desktop-chrome",
          results: [{ status: index === 5 ? lastStatus : "passed" }]
        }]
      }))
    }]
  });

  assert.doesNotThrow(() => runner.assertRequiredBug3Outcomes?.(
    syntheticReport("passed", "passed"),
    requirement
  ));
  assert.throws(
    () => runner.assertRequiredBug3Outcomes?.(
      syntheticReport("skipped", "skipped"),
      requirement
    ),
    /unexpected skipped\/fixme/
  );
});

test("Playwright keeps owner-local Next and temp-tsconfig paths under an absolute Starship run root", async () => {
  const configUrl = pathToFileURL(join(process.cwd(), "playwright.config.ts"));
  configUrl.searchParams.set("owner-path-unit", String(Date.now()));
  const config = await import(configUrl.href) as {
    e2eTempTsconfigContent: (tsconfigPath: string, nextDistDir: string, repoRoot?: string) => {
      compilerOptions: {
        baseUrl: string;
        paths: Record<string, string[]>;
        plugins: Array<{ name: string }>;
      };
      exclude: string[];
      extends: string;
      include: string[];
    };
  };
  const repoRoot = "/Volumes/Starship/MAIS-15-bug-loop-wt";
  const runRoot = `${repoRoot}/.tmp/owner-local-proof`;
  const nextDistInterface = ".tmp/owner-local-proof/next-dist";
  const tsconfigPath = `${runRoot}/generated/tsconfig.playwright.tmp.json`;
  const tempConfig = config.e2eTempTsconfigContent(tsconfigPath, nextDistInterface, repoRoot);
  const configDir = dirname(tsconfigPath);
  assert.equal(resolve(configDir, tempConfig.extends), `${repoRoot}/tsconfig.json`);
  assert.equal(tempConfig.compilerOptions.baseUrl, repoRoot);
  assert.equal(resolve(configDir, tempConfig.compilerOptions.baseUrl), repoRoot);
  assert.deepEqual(tempConfig.compilerOptions.paths, { "@/*": ["./*"] });
  assert.deepEqual(tempConfig.compilerOptions.plugins, [{ name: "next" }]);
  assert.equal(
    join(tempConfig.compilerOptions.baseUrl, tempConfig.compilerOptions.paths["@/*"][0].replace("*", "components/providers/AppProviders")),
    `${repoRoot}/components/providers/AppProviders`
  );
  assert.equal(resolve(configDir, tempConfig.include[0]), `${repoRoot}/next-env.d.ts`);
  assert.equal(resolve(configDir, tempConfig.include.at(-1) ?? ""), `${runRoot}/next-dist/types/**/*.ts`);
  assert.equal(resolve(configDir, tempConfig.exclude[0]), `${repoRoot}/node_modules`);
});

test("source regressions recurse only into the portable no-browser confinement gate", async () => {
  const helper = await source("scripts/playwright-owner-paths.mjs");
  const config = await source("playwright.config.ts");
  const runner = await source("scripts/run-required-frontend-browser-contracts.mjs");

  assert.match(config, /playwright-owner-paths\.mjs/);
  assert.match(runner, /playwright-owner-paths\.mjs/);
  assert.match(helper, /createValidatedRunPlan/);
  assert.match(helper, /validateMaterializedRunPlan/);
  assert.match(helper, /lstatSync/);
  assert.match(helper, /realpathSync/);
  assert.match(helper, /owner root must be fresh and never reused/);
  assert.match(helper, /PLAYWRIGHT_REQUIRED_CONFIG_PATH/);
  assert.match(helper, /PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH/);
  assert.match(helper, /PLAYWRIGHT_SERVICE_LOG_PATH/);
  assert.match(helper, /PLAYWRIGHT_SERVICE_PID_PATH/);
  assert.doesNotMatch(helper, /(?:process\.env|environment)\.HOME\s*=/);

  const childEnvironment: NodeJS.ProcessEnv = { ...process.env, CI: "1" };
  delete childEnvironment.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    ["--test", "scripts/required-browser-source-canary.test.mjs"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: childEnvironment
    }
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /portable canary rejects active browser launch escapes without a browser or owner write/);
  assert.match(output, /ubuntu workflows and source-regression recursion invoke only the portable no-browser canary/);
  assert.match(output, /fail 0/);
});

test("number-line count mode disables Number B instead of exposing an inert slider", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /const comparisonDisabled = templateId === "number-line" && mode === 0/);
  assert.match(lab, /disabled=\{comparisonDisabled\}/);
});

test("equation-balance tokens declare a pan-contained fit contract", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /data-viz-fit-contract="pan-contained"/);
  assert.match(lab, /width="12"/);
  assert.match(lab, /r="6"/);
});

test("student dashboard Lesson shortcut waits for a resolved lesson target", async () => {
  const dashboard = await source("app/dashboard/page.tsx");

  assert.doesNotMatch(dashboard, /studentLessonHref \?\? studentLessonsPath/);
  assert.match(dashboard, /const lessonShortcutReady = currentUser\?\.role !== "student" \|\| Boolean\(studentLessonHref\)/);
  assert.match(dashboard, /disabled=\{!lessonShortcutReady\}/);
});

test("student roadmap uses the personalized current-grade path only for signed-in learners", async () => {
  const roadmap = await source("components/learning/LearningRoadmap.tsx");
  const studentModeIndex = roadmap.indexOf('const isStudentMode = mode === "student" && Boolean(currentUser)');
  const visibleGradesIndex = roadmap.indexOf("const visibleGrades = useMemo");
  const personalizedBranchIndex = roadmap.indexOf("if (isStudentMode)");

  assert.notEqual(studentModeIndex, -1, "Student mode should be gated by a real currentUser.");
  assert.ok(
    studentModeIndex < visibleGradesIndex && visibleGradesIndex < personalizedBranchIndex,
    "The signed-in gate should be applied before grade visibility and personalized path rendering."
  );
  assert.doesNotMatch(roadmap, /const isStudentMode = mode === "student";/);
});

test("student roadmap route shell renders roadmap pages through normal SSR and client boundaries", async () => {
  const shell = await source("components/learning/RoadmapRouteShell.tsx");
  const primaryRoute = await source("app/student/roadmap/primary/page.tsx");

  assert.doesNotMatch(shell, /^"use client";/);
  assert.doesNotMatch(shell, /next\/dynamic/);
  assert.doesNotMatch(shell, /ssr:\s*false/);
  assert.match(shell, /import \{ PrimaryRoadmapPage \} from "@\/components\/learning\/PrimaryRoadmapPage"/);
  assert.match(primaryRoute, /<RoadmapRouteShell kind="primary" \/>/);
});

test("AI Tutor voice uses the Node WebSocket client with explicit provider headers", async () => {
  const voiceRoute = await source("app/api/ai-tutor/voice/route.ts");

  assert.match(voiceRoute, /import WebSocket from "ws"/);
  assert.match(voiceRoute, /import type \{ RawData \} from "ws"/);
  assert.doesNotMatch(voiceRoute, /WebSocket as unknown/);
  assert.match(voiceRoute, /headers: \{[\s\S]*Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(voiceRoute, /socket\.on\("message"/);
  assert.match(voiceRoute, /socket\.once\("error"/);
  assert.match(voiceRoute, /socket\.terminate\(\)/);
  assert.match(voiceRoute, /resolveStudentAiTutorPolicy/);
  assert.match(voiceRoute, /consumeAiCapabilityRateLimit/);
});
