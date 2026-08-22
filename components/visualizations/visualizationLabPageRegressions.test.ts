import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");

test("visualization lab detail view omits the Start Practice CTA", () => {
  assert.doesNotMatch(source, /data-viz-start-practice-link/);
  assert.doesNotMatch(source, /Start Practice/);
});

test("visualization lab detail view omits the external sharing safeguard sentence", () => {
  assert.doesNotMatch(source, /Safeguard review is recorded/);
  assert.doesNotMatch(source, /teacher approval is required before external sharing/);
});

test("visualization lab grade chips use US K-G12 labels for US curriculum", () => {
  assert.match(source, /formatUnitedStatesGradeLabel\(grade, language, true\)/);
  assert.match(source, /function displayGradeChipLabel\(grade: GradeId\)/);
  assert.match(source, /label=\{displayGradeChipLabel\(grade\)\}/);
});

test("visualization lab current grade badge uses US K-G12 labels for US curriculum profiles", () => {
  assert.match(source, /formatUnitedStatesGradeLabel\(grade, language, true\)/);
  assert.match(source, /currentUser\.curriculumProfile\.region === "US"/);
  assert.match(source, /unitedStatesCurriculumTracks\.has\(currentUser\.curriculumTrack\)/);
  assert.match(source, /Current grade[\s\S]*\{activeGradeLabel\}/);
});

test("visualization lab scopes US curriculum users before cross-region capstone labs", () => {
  assert.match(source, /function isUnitedStatesMathUser\(currentUser: StudentSession\)/);
  assert.match(source, /return lab\.curriculumTrack === "US" && lab\.publisher === publisher;/);

  const usScopeIndex = source.indexOf("if (isUnitedStatesMathUser(currentUser))");
  const capstoneBypassIndex = source.indexOf('if (lab.curriculumTrack === "CAPSTONE" && lab.threeD?.premiumLaunch)');

  assert.notEqual(usScopeIndex, -1);
  assert.notEqual(capstoneBypassIndex, -1);
  assert.ok(usScopeIndex < capstoneBypassIndex);
});

test("visualization lab initializes US grade label mode before deriving active grade labels", () => {
  const modeIndex = source.indexOf("const useUnitedStatesGradeLabels");
  const activeGradeIndex = source.indexOf("const activeGradeLabel");

  assert.notEqual(modeIndex, -1);
  assert.notEqual(activeGradeIndex, -1);
  assert.ok(modeIndex < activeGradeIndex);
});

test("visualization lab direct-entry workspace owns the stable lab-example selector", () => {
  assert.match(source, /const workspaceSectionLabId =/);
  assert.match(source, /panelMode === "lab"/);
  assert.match(source, /requestedLabId \?\? activeDirectoryLab\?\.labId \?\? activeLabId/);
  assert.match(
    source,
    /<section\s+ref=\{panelRef\}[\s\S]{0,360}id=\{workspaceSectionLabId \? `lab-example-\$\{workspaceSectionLabId\}` : undefined\}/
  );
  assert.doesNotMatch(
    source,
    /<section\s+id=\{`lab-example-\$\{activeDirectoryLab\.labId\}`\}[\s\S]{0,320}data-lab-id=\{activeDirectoryLab\.labId\}/
  );
});

test("sole signature benches retain the canonical active-bench wrapper", () => {
  assert.doesNotMatch(source, /activeHasRelatedBenches/);
  assert.match(
    source,
    /activeSignatureAssignment\s*\?\s*\(\s*<SignatureBenchSwitcher/,
    "a signature topic with no related chips still needs its active bench identity and runtime wrapper"
  );
});

test("visualization lab direct-entry seeds workspace state before effects", () => {
  assert.match(source, /type VisualizationLabInitialRouteState =/);
  assert.match(source, /function buildInitialVisualizationLabRouteState\(/);
  assert.match(source, /const initialRouteState = buildInitialVisualizationLabRouteState\(/);
  assert.match(source, /useState<PanelMode>\(initialRouteState\.panelMode\)/);
  assert.match(source, /useState<VisualizationTrackFilter>\(initialRouteState\.trackFilter\)/);
  assert.match(source, /useState<GradeId \| null>\(initialRouteState\.activeDirectoryGrade\)/);
  assert.match(source, /useState<string \| null>\(initialRouteState\.activeLabId\)/);
  assert.match(source, /useState<DirectLinkStatus>\(initialRouteState\.directLinkStatus\)/);
  assert.match(source, /useState<string \| null>\(initialRouteState\.requestedLabId\)/);
  assert.doesNotMatch(source, /useState<PanelMode>\("control"\)/);
});

test("visualization lab waits for session settings before canonicalizing a learner route", () => {
  assert.match(
    source,
    /const \{ currentUser, language, recordLearningEvent, selectedGrade, settingsReady, t, text \} = useSettings\(\);/
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!settingsReady\) return;\s+function openLabFromLocation\(\)/
  );
  assert.match(
    source,
    /\[activeGroup\.grade, currentUser, curriculumScopedGroups, initialGrade, initialLabId, settingsReady\]/
  );
});

test("visualization lab gives signature benches an opaque host card", () => {
  assert.match(source, /opaqueSurface=\{activeDirectoryLab\.moduleId === "signature-lab"\}/);
});

test("visualization lab shell keeps signature tabs and header controls accessible", () => {
  assert.match(source, /min-h-11 rounded-full border px-3\.5 py-1\.5/);
  assert.match(source, /border-cyan-700 bg-cyan-700 text-white/);
  assert.doesNotMatch(source, /<span className="ml-1\.5 opacity-70">· primary<\/span>/);
  assert.match(source, /<span className="pointer-events-none ml-1\.5">· primary<\/span>/);
  assert.match(source, /data-viz-back-to-control-panel-link[\s\S]{0,260}min-h-11/);
  assert.match(source, /data-viz-copy-lab-link[\s\S]{0,640}disabled:bg-slate-100 disabled:text-slate-700/);
  assert.match(source, /data-viz-copy-lab-snapshot[\s\S]{0,640}disabled:bg-slate-100 disabled:text-slate-700/);
});

test("visualization lab catalog loading shell exposes the direct-entry workspace selector", () => {
  assert.match(source, /suppressLoadingWorkspaceSelector\?: boolean/);
  assert.match(source, /function getInitialVisualizationLabRequestedLabId\(/);
  assert.match(source, /const loadingWorkspaceLabId = getInitialVisualizationLabRequestedLabId\(/);
  assert.match(source, /const loadingWorkspaceSectionId = props\.suppressLoadingWorkspaceSelector \? null : loadingWorkspaceLabId;/);
  assert.match(
    source,
    /id=\{loadingWorkspaceSectionId \? `lab-example-\$\{loadingWorkspaceSectionId\}` : undefined\}[\s\S]{0,280}data-viz-catalog-deferred/
  );
  assert.match(source, /data-viz-panel-mode="loading"/);
  assert.match(source, /data-viz-requested-lab-id=\{loadingWorkspaceLabId \?\? ""\}/);
});

test("visualization lab notifies the route shell once the dynamic page mounts", () => {
  assert.match(source, /onRouteShellReady\?: \(\) => void/);
  assert.match(source, /const \{ onRouteShellReady \} = props;/);
  assert.match(source, /useLayoutEffect\(\(\) => \{[\s\S]{0,120}onRouteShellReady\?\.\(\);/);
});

test("visualization lab tiles choose emoji from CCSS standards with template fallback", () => {
  assert.match(source, /function labTileEmojiForLab\(lab: FeaturedLabDefinition\)/);
  assert.match(source, /lab\.californiaAlignment\?\.standardIds/);
  assert.match(source, /visualizationTemplateEmoji\[lab\.templateId\]/);
  assert.match(source, /data-viz-lab-emoji/);
  assert.match(source, /emoji=\{labTileEmojiForLab\(lab\)\}/);
  assert.doesNotMatch(source, /labTileGlyphForLab/);
});

test("visualization lab tiles render CCSS-style cards instead of sticker logos", () => {
  assert.doesNotMatch(source, /from "@\/components\/visualizations\/labLogoArt"/);
  assert.doesNotMatch(source, /labLogoArtByGlyph/);
  assert.doesNotMatch(source, /LiquidGlassLabLogo/);
  assert.match(source, /from "@\/data\/visualizationLabEmoji"/);
  assert.match(source, /function labTileBandForGrade\(grade: GradeId\)/);
  assert.match(source, /standardIds\.slice\(0, 3\)/);
  assert.match(source, /\{categoryChipLabel\}/);
});

test("visualization lab tiles do not show index-based fake progress", () => {
  assert.doesNotMatch(source, /function progressForIndex/);
  assert.doesNotMatch(source, /\{progress\.done\}\/\{progress\.total\}/);
  assert.match(source, /isExplored=\{exploredSessionIds\.has\(buildVisualizationSessionModuleId\(lab\)\)\}/);
  assert.match(source, /\{isExplored \? exploredLabel : readyLabel\}/);
});

test("visualization lab tiles localize status labels instead of English-only copy", () => {
  assert.doesNotMatch(source, /\{isExplored \? "Explored" : "Ready"\}/);
  assert.match(source, /const exploredLabel = t\(\{ en: "Explored", zh: "已探索", zhHans: "已探索" \}\);/);
  assert.match(source, /const readyLabel = t\(\{ en: "Ready", zh: "待探索", zhHans: "待探索" \}\);/);
  assert.match(source, /exploredLabel=\{exploredLabel\}/);
  assert.match(source, /readyLabel=\{readyLabel\}/);
});

test("visualization lab next-up recommendation resumes from the first unexplored lab", () => {
  assert.match(source, /const firstUnexploredLab = useMemo\(/);
  assert.match(source, /if \(!currentUser\) return null;/);
  assert.match(source, /visibleLabs\.find\(\(lab\) => !exploredSessionIds\.has\(buildVisualizationSessionModuleId\(lab\)\)\)/);
  assert.match(source, /const recommendedLab = firstUnexploredLab \?\? visibleLabs\[1\] \?\? activeDirectoryLab \?\? visibleLabs\[0\] \?\? null;/);
  assert.doesNotMatch(source, /const recommendedLab = visibleLabs\[1\]/);
});

test("visualization lab hero renders the next-up preview card with mission progress", () => {
  assert.match(source, /data-viz-next-up-card/);
  assert.match(source, /data-viz-next-up-progress-based=\{String\(recommendedLabIsProgressBased\)\}/);
  assert.match(source, /data-viz-mission-progress-explored=\{missionExploredCount\}/);
  assert.match(source, /data-viz-mission-progress-total=\{missionTotalCount\}/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuenow=\{missionExploredCount\}/);
  assert.match(source, /currentUser && missionTotalCount > 0/);
});

test("visualization lab hero fills the center gap with an animated visualization teaser", () => {
  assert.match(source, /function VisualizationHeroTeaser\(\{ eyebrow, tagline \}/);
  assert.match(source, /data-viz-hero-teaser/);
  // Only rendered where the gap exists; narrow layouts stack title -> card.
  assert.match(source, /<div className="hidden min-w-0 flex-1 lg:flex">/);
  assert.match(source, /<VisualizationHeroTeaser eyebrow=\{heroTeaserEyebrow\} tagline=\{heroTeaserTagline\} \/>/);
  // GPU-light, reduced-motion-safe house keyframes only — no lab runtime.
  assert.match(source, /className="animate-pulseGlow"/);
  assert.match(source, /className="animate-float"/);
  // The old centered void relied on justify-between; the three-zone row drops it.
  assert.match(source, /lg:flex-row lg:items-stretch lg:gap-8/);
  assert.doesNotMatch(source, /lg:flex-row lg:items-stretch lg:justify-between lg:gap-10/);
});

test("visualization lab surfaces the mission labs as a preview strip beneath the hero", () => {
  assert.match(source, /data-viz-mission-strip\b/);
  assert.match(source, /data-viz-mission-strip-total=\{missionTotalCount\}/);
  assert.match(source, /data-viz-mission-strip-explored=\{missionExploredCount\}/);
  assert.match(source, /data-viz-mission-strip-lab=\{lab\.labId\}/);
  assert.match(source, /selectDirectoryLab\(lab, "mission-strip"\)/);
  // Same student-scoped gate as the hero progress bar.
  assert.match(source, /currentUser && missionTotalCount > 0/);
});

test("visualization lab pins the signed-in student's grade at the head of the rail", () => {
  assert.match(source, /const ownGrade = currentUser \? currentUserGrade : null;/);
  assert.match(source, /data-viz-grade-chip-pinned=\{String\(pinned\)\}/);
  assert.match(source, /pinnedLabel=\{yourGradeLabel\}/);
  assert.match(source, /gradeIds\.filter\(\(grade\) => grade !== ownGrade\)\.map\(/);
  assert.match(source, /data-viz-back-to-my-grade/);
  assert.match(source, /data-viz-switch-to-my-grade/);
});

test("visualization lab merges the pickers into one scroll-snap section", () => {
  assert.match(source, /snap-x snap-mandatory/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /sm:flex-wrap sm:overflow-visible/);
  assert.doesNotMatch(source, /Pick your grade/);
  assert.doesNotMatch(source, /Pick a lab/);
  assert.match(source, /Choose your lab/);
  assert.match(source, /ref=\{labGridRef\}/);
});

test("visualization lab hero drops the intro sentence", () => {
  assert.doesNotMatch(source, /finish an observation mission/);
  assert.doesNotMatch(source, /introText/);
});

test("visualization lab grade badge flips to Browsing off the account grade", () => {
  assert.match(source, /const browsingOtherGrade = Boolean\(ownGrade && \(activeDirectoryGroup\?\.grade \?\? activeGroup\.grade\) !== ownGrade\);/);
  assert.match(source, /data-viz-grade-context-mode=\{browsingOtherGrade \? "browsing" : "current"\}/);
  assert.match(source, /\{ en: "Browsing", zh: "正在瀏覽", zhHans: "正在浏览" \}/);
});

test("visualization lab mobile rail hints overflow with an edge fade", () => {
  assert.match(source, /mask-image:linear-gradient\(to_right,black_calc\(100%-2\.5rem\),transparent\)/);
  assert.match(source, /sm:\[mask-image:none\]/);
});

test("visualization lab records entry-point navigation analytics on the existing schema", () => {
  assert.match(source, /function recordVisualizationNavigationEvent\(action: string, detail: string\)/);
  assert.match(source, /type: "mouse-click",\s*source: "navigation",\s*topicId: `viz-nav:\$\{action\}:\$\{detail\}`/);
  assert.match(source, /selectDirectoryLab\(recommendedLab, "start-quest"\)/);
  assert.match(source, /selectDirectoryLab\(recommendedLab, "next-up-card"\)/);
  assert.match(source, /selectDirectoryLab\(lab, "lab-tile"\)/);
  assert.match(source, /selectDirectoryLab\(lab, "mission-strip"\)/);
  assert.match(source, /selectDirectoryGrade\(ownGradeGroup, "grade-rail-pinned"\)/);
  assert.match(source, /selectDirectoryGrade\(ownGradeGroup, "back-to-my-grade"\)/);
  assert.match(source, /selectDirectoryGrade\(ownGradeGroup, "empty-state"\)/);
  assert.match(source, /recordVisualizationNavigationEvent\(`open-\$\{entryPoint\}`, lab\.labId\)/);
  assert.match(source, /recordVisualizationNavigationEvent\(entryPoint, group\.grade\)/);
});

test("visualization lab keeps lab-scoped probes alongside navigation analytics", () => {
  assert.match(source, /recordVisualizationWorkflowEvent\(lab\);/);
  assert.match(source, /type: "visualization-probe",\s*source: lab\?\.analyticsSource \?\? "visualization-lab"/);
});

test("visualization lab scales controls for young learners without touching lab tiles", () => {
  assert.match(source, /const youngLearnerGrades = new Set<GradeId>\(\["K", "P1", "P2"\]\);/);
  assert.match(source, /const youngLearnerMode = Boolean\(ownGrade && youngLearnerGrades\.has\(ownGrade\)\);/);
  assert.match(source, /data-viz-young-learner-mode=\{String\(youngLearnerMode\)\}/);
  assert.match(source, /youngLearnerMode \? "min-h-\[3\.75rem\] px-8 text-xl" : "min-h-\[3\.25rem\] px-7 text-lg"/);
  assert.match(source, /large \? "h-14 min-w-\[3\.9rem\] px-5 text-lg" : "h-12 min-w-\[3\.4rem\] px-4 text-base"/);
  assert.match(source, /large=\{youngLearnerMode\}/);
  const labTileStart = source.indexOf("function LabTile");
  const labTileEnd = source.indexOf("export function VisualizationLabPage");
  assert.ok(labTileStart !== -1 && labTileEnd > labTileStart);
  assert.doesNotMatch(source.slice(labTileStart, labTileEnd), /youngLearnerMode/);
});

test("visualization lab renders catalog copy through Simplified Chinese conversion", () => {
  assert.match(source, /function displayCatalogText\(value: string\)/);
  assert.match(source, /return simplifyChineseText\(value, language\);/);
  assert.match(source, /title=\{displayCatalogText\(compactTitle\(text\(lab\.title\)\)\)\}/);
  assert.match(source, /\{displayCatalogText\(compactTitle\(text\(recommendedLab\.title\)\)\)\}/);
  assert.match(source, /title=\{displayCatalogText\(text\(activeDirectoryLab\.title\)\)\}/);
});

test("switching to a related bench is reported as navigation telemetry", () => {
  // 138 of the 192 benches are reachable only through this chip row, so whether
  // students use it is the difference between "covered" and "met". Before
  // 2026-07-25 the click emitted nothing and the question was unanswerable.
  assert.match(source, /onBenchSwitch\?: \(benchId: SignatureLabId\) => void/);
  assert.match(source, /onBenchSwitch=\{\(benchId\) => recordVisualizationNavigationEvent\("bench-switch", benchId\)\}/);
  // it rides the existing mouse-click/navigation channel — no schema change
  assert.match(source, /function recordVisualizationNavigationEvent\(action: string, detail: string\)/);
  // re-selecting the bench already showing is not a switch and must not report
  assert.match(source, /if \(benchId === activeBenchId\) return;\s*\n\s*onBenchSwitch\?\.\(benchId\);/);
});
