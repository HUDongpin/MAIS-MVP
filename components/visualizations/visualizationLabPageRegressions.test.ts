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

test("visualization lab renders catalog copy through Simplified Chinese conversion", () => {
  assert.match(source, /function displayCatalogText\(value: string\)/);
  assert.match(source, /return simplifyChineseText\(value, language\);/);
  assert.match(source, /title=\{displayCatalogText\(compactTitle\(text\(lab\.title\)\)\)\}/);
  assert.match(source, /\{displayCatalogText\(compactTitle\(text\(recommendedLab\.title\)\)\)\}/);
  assert.match(source, /title=\{displayCatalogText\(text\(activeDirectoryLab\.title\)\)\}/);
});
