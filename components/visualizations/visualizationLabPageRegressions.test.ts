import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/VisualizationLabPage.tsx", "utf8");
const directShellSource = fs.readFileSync("components/visualizations/PremiumThreeDDirectRouteShell.tsx", "utf8");
const cardSource = fs.readFileSync("components/visualizations/VisualizationCard.tsx", "utf8");
const routeShellSource = fs.readFileSync("components/visualizations/VisualizationLabRouteShell.tsx", "utf8");
const loadingSource = fs.readFileSync("components/visualizations/VisualizationLabLoading.tsx", "utf8");
const signatureAdapterSource = fs.readFileSync("components/visualizations/SignatureLabAdapter.tsx", "utf8");

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

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
  const capstoneBypassIndex = source.indexOf('if (lab.curriculumTrack === "CAPSTONE" && isPremiumThreeDTopicPageLab(lab))');

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

test("standalone visualization loading exposes the direct-entry workspace selector", () => {
  assert.match(source, /suppressLoadingWorkspaceSelector\?: boolean/);
  assert.match(source, /function getInitialVisualizationLabRequestedLabId\(/);
  assert.match(source, /const loadingWorkspaceLabId = getInitialVisualizationLabRequestedLabId\(/);
  assert.match(source, /const loadingWorkspaceSectionId = loadingWorkspaceLabId;/);
  assert.match(
    source,
    /id=\{loadingWorkspaceSectionId \? `lab-example-\$\{loadingWorkspaceSectionId\}` : undefined\}[\s\S]{0,280}data-viz-catalog-deferred/
  );
  assert.match(source, /data-viz-panel-mode="loading"/);
  assert.match(source, /data-viz-requested-lab-id=\{loadingWorkspaceLabId \?\? ""\}/);
});

test("visualization route shell owns the only visible catalog loading workspace", () => {
  assert.match(source, /if \(props\.suppressLoadingWorkspaceSelector && !catalogLoadFailed\) return null;/);
  assert.match(source, /if \(catalogLoadFailed\) \{\s*return <VisualizationCatalogLoadError requestedLabId=\{loadingWorkspaceLabId\} \/>;/);
  assert.match(
    routeShellSource,
    /id=\{requestedLabId \? `lab-example-\$\{requestedLabId\}` : undefined\}[\s\S]{0,420}data-viz-panel-mode="loading"/
  );
});

test("visualization catalog load failures replace the outer loader with one actionable error workspace", () => {
  assert.match(source, /if \(!catalog && !catalogLoadFailed\) return;/);
  assert.match(source, /\[catalog, catalogLoadFailed, onRouteShellReady\]/);
  assert.match(source, /data-viz-catalog-load-status="error"/);
  assert.match(source, /data-viz-panel-mode="error"/);
  assert.match(source, /data-viz-retry-catalog-load/);
  assert.match(source, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
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

test("learner shell navigation and sharing controls keep a 44px hit target", () => {
  for (const selector of [
    "data-viz-back-to-control-panel-link",
    "data-viz-copy-lab-link",
    "data-viz-copy-lab-snapshot"
  ]) {
    const controlPattern = new RegExp(`${selector}[\\s\\S]{0,700}className="[^"]*min-h-11[^"]*min-w-11`);
    assert.match(source, controlPattern, `${selector} must preserve a 44 by 44 minimum learner hit target`);
  }
});

test("premium direct actions and signature tabs keep a 44px hit target", () => {
  for (const selector of ["data-viz-open-full-lab-directory-link", "data-viz-open-practice-link"]) {
    const controlPattern = new RegExp(`${selector}[\\s\\S]{0,500}className="[^"]*min-h-11[^"]*min-w-11`);
    assert.match(directShellSource, controlPattern, `${selector} must preserve a 44 by 44 minimum hit target`);
  }
  assert.match(source, /data-viz-signature-bench-id=\{benchId\}[\s\S]{0,1200}className=\{`min-h-11/);
  for (const control of ["button", "input", "select"]) {
    assert.match(
      source,
      new RegExp(`\\[&_\\[data-viz-keyboard-equivalent\\]_${control}\\]:min-h-11`),
      `signature keyboard-equivalent ${control} controls must inherit a 44px hit area`
    );
  }
  assert.match(source, /\[&_\[data-viz-keyboard-equivalent\]_button\]:min-w-11/);
  assert.match(source, /\[&_\[data-viz-keyboard-equivalent\]_select\]:min-w-11/);
});

test("premium direct shell describes the learner surface without claiming every route renders 3D", () => {
  assert.match(
    directShellSource,
    /en: "Premium Visualization Lab", zh: "Premium 可視化實驗", zhHans: "Premium 可视化实验"/
  );
  assert.doesNotMatch(directShellSource, /Premium 3D (?:lab|實驗|实验)/);
});

test("catalog mission and curriculum controls keep a 44px hit target outside the lab workspace", () => {
  assert.match(
    source,
    /data-viz-mission-strip-lab=\{lab\.labId\}[\s\S]{0,700}className=\{cn\([\s\S]{0,180}min-h-11 min-w-11/
  );
  assert.match(
    source,
    /data-viz-track-filter-button[\s\S]{0,500}className=\{cn\([\s\S]{0,180}min-h-11 min-w-11/
  );
});

test("the lab workspace gives real controls a 44px touch-target floor at every viewport", () => {
  const requiredUtilities = [
    "[&_button]:min-h-11",
    "[&_button]:min-w-11",
    "[&_select]:min-h-11",
    "[&_select]:min-w-11",
    "[&_input:not([type=range])]:min-h-11",
    "[&_input:not([type=range])]:min-w-11",
    "[&_input[type=range]]:min-h-11",
    "[&_input[type=range]]:min-w-0",
    "[&_a[role=button]]:min-h-11",
    "[&_a[role=button]]:min-w-11"
  ];

  assert.match(source, /data-viz-lab-workspace/);
  for (const selector of requiredUtilities) {
    assert.ok(source.includes(selector), selector + " must remain on the stable lab workspace wrapper");
  }
  assert.doesNotMatch(source, /\[&_input\[type=range\]\]:min-w-11/);
  assert.match(directShellSource, /data-viz-lab-workspace/);
  for (const utility of requiredUtilities) {
    assert.ok(directShellSource.includes(utility), "premium direct workspace must include " + utility);
  }
});

test("signature learner states use auditable opaque paint instead of group compositing", () => {
  assert.match(signatureAdapterSource, /const signatureLearnerContrastCss =/);
  assert.match(signatureAdapterSource, /\.btn:disabled,[\s\S]{0,1600}opacity: 1 !important;/);
  assert.match(signatureAdapterSource, /\.choice\.dim[\s\S]{0,700}background: #f1f5f9 !important;/);
  assert.match(signatureAdapterSource, /\.choice\.correct[\s\S]{0,260}background: #eaf5ef !important;[\s\S]{0,260}color: #166534 !important;/);
  assert.match(signatureAdapterSource, /\.choice\.wrong[\s\S]{0,260}background: #eef2f6 !important;[\s\S]{0,260}color: #475569 !important;/);
  assert.match(signatureAdapterSource, /:is\(\.stage, \.sorter-card, \.net, \.chbox\)[\s\S]{0,180}background-image: none !important;/);
  assert.doesNotMatch(signatureAdapterSource, /:is\([^)]*\.swatch\.none/);
  assert.match(signatureAdapterSource, /\.swatch\.none[\s\S]{0,360}background-image: linear-gradient\(/);
  assert.match(signatureAdapterSource, /:is\(\.btn, \.chipbtn, \.obtn, \.seg-btn, \.segb, \.segbtn\):hover[\s\S]{0,100}filter: none !important;/);
  assert.match(signatureAdapterSource, /\.jbtn:hover[\s\S]{0,180}filter: none !important;[\s\S]{0,180}outline: 2px solid currentColor !important;/);
  assert.match(signatureAdapterSource, /\.el:hover[\s\S]{0,180}transform: none !important;[\s\S]{0,180}outline: 2px solid currentColor !important;/);
  assert.match(signatureAdapterSource, /\.lens\.on[\s\S]{0,180}box-shadow: none !important;/);
  assert.match(signatureAdapterSource, /\.stamp[\s\S]{0,260}opacity: 1 !important;[\s\S]{0,260}color: #166534 !important;/);
  assert.match(signatureAdapterSource, /\.nameplate \.name\.flash[\s\S]{0,100}opacity: 1 !important;/);
  assert.match(signatureAdapterSource, /\.route:not\(\.on\)[\s\S]{0,360}background-color: #f1f5f9 !important;/);
  assert.match(signatureAdapterSource, /\.soon:not\(\.live\)[\s\S]{0,100}color: #475569 !important;/);
  assert.match(signatureAdapterSource, /\.easy[\s\S]{0,180}background: #fef3c7 !important;[\s\S]{0,120}color: #713f12 !important;/);
  assert.doesNotMatch(signatureAdapterSource, /className="[^"]*shadow-inner/);
  assert.doesNotMatch(cardSource, /className="glass-panel/);
  assert.match(cardSource, /className="[^"]*bg-white[^"]*dark:bg-slate-900/);
  assert.match(source, /className="rounded-\[1\.35rem\] bg-white p-4[^"]*dark:bg-slate-950/);
});

test("signature learner accent palette passes normal-text contrast in tabs, DOM, and Canvas", () => {
  assert.match(
    signatureAdapterSource,
    /"#2e8b6f": "#166534",\s*"#3f74a6": "#245b8f"/
  );
  assert.match(
    signatureAdapterSource,
    /\[role='tab'\]\[aria-selected='true'\][\s\S]{0,180}background: #0e7490 !important;[\s\S]{0,120}color: #ffffff !important;/
  );
  assert.match(
    signatureAdapterSource,
    /\[style\*='color: rgb\(63, 116, 166\)'\][\s\S]{0,180}color: #245b8f !important;/
  );
  assert.match(
    signatureAdapterSource,
    /\[style\*='color: rgb\(46, 139, 111\)'\][\s\S]{0,180}color: #166534 !important;/
  );
  assert.match(
    signatureAdapterSource,
    /\.btn\.ghost\.on:not\(:disabled\)[\s\S]{0,180}background: #166534 !important;[\s\S]{0,120}color: #ffffff !important;/
  );
  assert.match(signatureAdapterSource, /function installAccessibleSignatureCanvasPalette\(/);
  assert.match(
    signatureAdapterSource,
    /useLayoutEffect\(\(\) => \{[\s\S]{0,260}canvases\.map\(installAccessibleSignatureCanvasPalette\)/
  );
  assert.doesNotMatch(signatureAdapterSource, /CanvasRenderingContext2D\.prototype\.[A-Za-z]+\s*=/);

  const paper = "#eff1ee";
  for (const foreground of ["#0e7490", "#245b8f", "#166534"]) {
    assert.ok(
      contrastRatio(foreground, paper) >= 4.5,
      `${foreground} must retain at least 4.5:1 against the darkest signature paper token`
    );
  }
  assert.ok(contrastRatio("#ffffff", "#0e7490") >= 4.5);
});

test("signature lab mount stays side-effect free until a learner action", () => {
  assert.doesNotMatch(
    signatureAdapterSource,
    /useEffect\(\(\) => \{\s*recordLearningEvent\(\{ type: "visualization-probe"/
  );
  assert.match(
    signatureAdapterSource,
    /const handleReset = useCallback\(\(\) => \{[\s\S]{0,220}type: "visualization-reset"/
  );
  assert.match(source, /onBenchSwitch=\{\(benchId\) => recordVisualizationNavigationEvent\("bench-switch", benchId\)\}/);
});
test("signature tabs share one stable tabpanel target", () => {
  assert.match(source, /const panelId = `\$\{switcherDomId\}-panel`;/);
  assert.match(source, /aria-controls=\{panelId\}/);
  assert.match(source, /<div\s+id=\{panelId\}[\s\S]{0,180}role=\{benchIds\.length > 1 \? "tabpanel" : undefined\}/);
  assert.doesNotMatch(source, /panel-\$\{resolvedActiveBenchId\}/);
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
  assert.match(source, /resolveVisualizationLabDisplayCopy\(lab, language\)/);
  assert.match(source, /title: displayCatalogText\(compact \? compactTitle\(copy\.title\) : copy\.title\)/);
});

test("catalog, recommendation, mission, active, and direct surfaces consume shared display disambiguation", () => {
  assert.match(source, /displayDisambiguator=\{displayCopy\.disambiguator\}/);
  assert.match(source, /recommendedDisplayCopy\?\.disambiguator/);
  assert.match(source, /const displayCopy = displayLabCopy\(lab, true\);/);
  assert.match(source, /activeDirectoryDisplayCopy\?\.disambiguator/);
  assert.ok((source.match(/data-viz-display-disambiguator/g) ?? []).length >= 4);
  assert.match(directShellSource, /resolveVisualizationLabDisplayCopy\(lab, language\)/);
  assert.match(directShellSource, /displayCopy\.disambiguator/);
  assert.match(directShellSource, /data-viz-display-disambiguator/);
});

test("active and premium card headings expose the disambiguated accessible title", () => {
  assert.match(cardSource, /accessibleTitle\?: string/);
  assert.match(cardSource, /aria-label=\{accessibleTitle && accessibleTitle !== title \? accessibleTitle : undefined\}/);
  assert.match(source, /accessibleTitle=\{[\s\S]{0,180}activeDirectoryDisplayCopy\?\.accessibleTitle/);
  assert.match(directShellSource, /accessibleTitle=\{displayCopy\.accessibleTitle\}/);
});

test("loading, active, and premium workspaces localize their accessible label", () => {
  for (const workspaceSource of [source, routeShellSource, directShellSource]) {
    assert.match(workspaceSource, /zh: "可視化實驗室工作區"/);
    assert.match(workspaceSource, /zhHans: "可视化实验室工作区"/);
  }
  assert.match(loadingSource, /zh: "可視化實驗室"/);
  assert.match(loadingSource, /zhHans: "可视化实验室"/);
  assert.match(loadingSource, /zh: "正在準備可視化內容…"/);
  assert.match(loadingSource, /zhHans: "正在准备可视化内容…"/);
});

test("signature runtime loading is localized and dark-mode legible", () => {
  const runtimeStart = source.indexOf("function LabRuntimeLoading()");
  const runtimeEnd = source.indexOf("\nfunction GradeChip", runtimeStart);
  assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart);
  const runtimeLoadingSource = source.slice(runtimeStart, runtimeEnd);

  assert.match(runtimeLoadingSource, /const \{ t \} = useSettings\(\);/);
  assert.match(runtimeLoadingSource, /data-viz-lab-runtime-loading/);
  assert.match(runtimeLoadingSource, /role="status"/);
  assert.match(runtimeLoadingSource, /en: "Loading lab runtime…", zh: "正在載入實驗…", zhHans: "正在加载实验…"/);
  assert.match(runtimeLoadingSource, /dark:border-cyan-300\/25/);
  assert.match(runtimeLoadingSource, /dark:bg-cyan-300\/10/);
  assert.match(runtimeLoadingSource, /dark:text-cyan-100/);
});

test("the active detail shell retains dark-mode surfaces and controls", () => {
  assert.match(source, /data-lab-id=\{activeDirectoryLab\.labId\}[\s\S]{0,420}dark:bg-slate-950/);
  assert.doesNotMatch(source, /data-lab-id=\{activeDirectoryLab\.labId\}[\s\S]{0,420}(?:bg-white\/95|dark:bg-slate-950\/95)/);
  for (const token of [
    "dark:border-white/10",
    "dark:bg-blue-300/10",
    "dark:bg-amber-300/10",
    "dark:bg-cyan-300/10",
    "dark:bg-violet-300/10"
  ]) {
    assert.ok(source.includes(token), "active detail shell must retain " + token);
  }
});

test("switching to a related bench is reported as navigation telemetry", () => {
  // 128 of the 192 benches are reachable only through this chip row, so whether
  // students use it is the difference between "covered" and "met". Before
  // 2026-07-25 the click emitted nothing and the question was unanswerable.
  assert.match(source, /onBenchSwitch\?: \(benchId: SignatureLabId\) => void/);
  assert.match(source, /onBenchSwitch=\{\(benchId\) => recordVisualizationNavigationEvent\("bench-switch", benchId\)\}/);
  // it rides the existing mouse-click/navigation channel — no schema change
  assert.match(source, /function recordVisualizationNavigationEvent\(action: string, detail: string\)/);
  // re-selecting the bench already showing is not a switch and must not report
  assert.match(source, /if \(benchId === resolvedActiveBenchId\) return;\s*\n\s*onBenchSwitch\?\.\(benchId\);/);
});
