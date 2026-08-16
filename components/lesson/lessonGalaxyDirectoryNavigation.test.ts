import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directorySource = readFileSync("components/lesson/LessonGalaxyDirectory.tsx", "utf8");
const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");
const lessonPracticeAutoAdvanceSource = readFileSync("components/lesson/lessonPracticeAutoAdvance.ts", "utf8");
const practiceArenaSource = readFileSync("app/practice/page.tsx", "utf8");
const practiceQuestPagerSource = readFileSync("components/practice/PracticeQuestPager.tsx", "utf8");
const worldMenuSource = readFileSync("components/lesson/worlds/WorldMenu.tsx", "utf8");
const worldThemeSource = readFileSync("components/lesson/worlds/worldThemes.ts", "utf8");
const configuredVisualizationLabSource = readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

test("map and list lesson quick jumps delegate one LessonView-owned callback", () => {
  for (const [name, source] of [
    ["WorldMenu", worldMenuSource],
    ["LessonGalaxyDirectory", directorySource]
  ] as const) {
    assert.match(
      source,
      /onSelectLessonItem: \(targetId: string\) => void;/,
      `${name} must require the shared LessonView quick-jump callback.`
    );
    assert.match(
      source,
      /onClick=\{\(\) => onSelectLessonItem\(item\.targetId\)\}/,
      `${name} must pass the selected target id to the shared callback.`
    );
    assert.equal(
      source.includes("document.getElementById"),
      false,
      `${name} must not choose a document-level scroll target.`
    );
    assert.equal(
      source.includes("scrollIntoView"),
      false,
      `${name} must not scroll the document directly.`
    );
  }

  assert.match(
    worldMenuSource,
    /<LessonGalaxyDirectory[\s\S]*?onSelectLessonItem=\{onSelectLessonItem\}/,
    "List view must receive the same callback as the world-map quick jumps."
  );
  assert.match(
    lessonViewSource,
    /function handleLessonItemSelect\(targetId: string\)/,
    "LessonView must own the pane-aware quick-jump behavior."
  );
  assert.match(
    lessonViewSource,
    /<WorldMenu[\s\S]*?onSelectLessonItem=\{handleLessonItemSelect\}/,
    "LessonView must pass its one pane-aware callback into WorldMenu."
  );
});

test("desktop lesson directory and content are bounded independent scroll panes", () => {
  assert.match(lessonViewSource, /data-lesson-pane-layout="true"/);
  assert.match(lessonViewSource, /data-lesson-directory-pane="true"/);
  assert.match(lessonViewSource, /data-lesson-content-pane="true"/);
  assert.match(
    lessonViewSource,
    /const lessonDesktopPaneLayoutClassName =\s*"lg:h-\[calc\(100dvh-8rem\)\] lg:min-h-0 lg:overflow-hidden";/,
    "Only desktop should bound the two-column lesson layout to the available viewport."
  );
  assert.match(
    lessonViewSource,
    /const lessonDesktopScrollablePaneClassName =\s*"lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain";/,
    "Only desktop should give each pane its own vertical scroll root."
  );
  assert.match(
    lessonViewSource,
    /data-lesson-directory-pane="true"[\s\S]*?lessonDesktopScrollablePaneClassName/,
    "The directory wrapper must own the desktop left-pane scrolling."
  );
  assert.match(
    lessonViewSource,
    /data-lesson-content-pane="true"[\s\S]*?lessonDesktopScrollablePaneClassName/,
    "The content wrapper must own the desktop right-pane scrolling."
  );
  assert.equal(
    lessonViewSource.includes("lg:sticky"),
    false,
    "The left directory must no longer stay attached to the shared window scroll."
  );
});

test("desktop wheel routing stays native to each contained lesson pane", () => {
  assert.match(
    lessonViewSource,
    /const lessonDesktopScrollablePaneClassName =\s*"lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain";/,
    "Each desktop pane must use native vertical overflow and contain scroll chaining at its own boundary."
  );

  const paneLayoutStart = lessonViewSource.indexOf('data-lesson-pane-layout="true"');
  const paneLayoutEnd = lessonViewSource.indexOf(
    "{shouldRenderGalaxyDirectory && lessonMenu.isHidden ?",
    paneLayoutStart
  );
  assert.notEqual(paneLayoutStart, -1, "LessonView must render the bounded two-pane layout.");
  assert.notEqual(paneLayoutEnd, -1, "The source contract must isolate the lesson pane markup.");
  const paneLayoutSource = lessonViewSource.slice(paneLayoutStart, paneLayoutEnd);
  assert.equal(
    paneLayoutSource.includes("onWheel"),
    false,
    "The pane under the pointer must receive native wheel input without a React wheel router."
  );
  assert.equal(
    paneLayoutSource.includes("preventDefault"),
    false,
    "Pane markup must not intercept native wheel behavior."
  );
  assert.equal(
    lessonViewSource.includes("deltaY"),
    false,
    "LessonView must not manually copy wheel deltas between panes."
  );

  const passiveCleanupListeners = [
    ...lessonViewSource.matchAll(/window\.addEventListener\("wheel", cancelOnUserInput, \{ passive: true \}\)/g)
  ];
  assert.equal(
    passiveCleanupListeners.length,
    1,
    "The only LessonView wheel listener may be Bug 2's passive mobile-stabilization cleanup listener."
  );
});

test("lesson mission-trail selection changes only the right pager's local question state", () => {
  assert.match(
    practiceQuestPagerSource,
    /data-testid=\{testId\}[\s\S]*?onClick=\{\(\) => onSelect\(index\)\}/,
    "Mission stones must delegate their zero-based question index through the trail's onSelect callback."
  );
  assert.match(
    lessonViewSource,
    /<PracticeMissionTrail[\s\S]*?currentIndex=\{currentIndex\}[\s\S]*?onSelect=\{goToIndex\}/,
    "Lesson practice must wire mission stones to the pager-local question selector."
  );

  const goToIndexStart = lessonViewSource.indexOf("const goToIndex = useCallback((index: number) => {");
  const goToIndexEnd = lessonViewSource.indexOf("\n  const goToPrevious", goToIndexStart);
  assert.notEqual(goToIndexStart, -1, "LessonQuestionPager must keep one local indexed-selection callback.");
  assert.notEqual(goToIndexEnd, -1, "The source contract must isolate the indexed-selection callback.");
  const goToIndexSource = lessonViewSource.slice(goToIndexStart, goToIndexEnd);

  assert.match(
    goToIndexSource,
    /setCurrentIndex\(clampLessonQuestionIndex\(index, questionCount\)\);/,
    "Selecting a mission stone must update only the pager's current question index."
  );
  for (const forbiddenSideEffect of [
    "lessonDirectoryPaneRef",
    "document.",
    "window.scroll",
    "scrollIntoView",
    "scrollTo(",
    "scrollBy("
  ]) {
    assert.equal(
      goToIndexSource.includes(forbiddenSideEffect),
      false,
      `Mission selection must not contain the side effect ${forbiddenSideEffect}.`
    );
  }
});

test("lesson practice alone waits three seconds and invalidates stale automatic navigation", () => {
  assert.match(
    lessonPracticeAutoAdvanceSource,
    /lessonPracticeAutoAdvanceDelayMs = 3_000;/,
    "Lesson practice must keep one explicit 3000ms auto-advance contract."
  );
  assert.match(
    practiceArenaSource,
    /const autoAdvanceDelayMs = 1200;/,
    "Bug 8 must not change Practice Arena's independent auto-advance timing."
  );

  const answeredStart = lessonViewSource.indexOf("const handleAnswered = useCallback(");
  const answeredEnd = lessonViewSource.indexOf("\n\n  const isYoungLearnerRound", answeredStart);
  assert.notEqual(answeredStart, -1, "LessonQuestionPager must keep one answer callback.");
  assert.notEqual(answeredEnd, -1, "The timing contract must isolate the lesson answer callback.");
  const answeredSource = lessonViewSource.slice(answeredStart, answeredEnd);
  assert.match(
    answeredSource,
    /createLessonPracticeAutoAdvanceRequest\(\{[\s\S]*?answeredQuestionId: question\.id,[\s\S]*?lessonSlug: lesson\.slug,[\s\S]*?questionSignature/,
    "Every pending move must be bound to the answered question and current lesson scope."
  );
  assert.equal(
    [...answeredSource.matchAll(/lessonPracticeAutoAdvanceRequestIsActive\(/g)].length,
    2,
    "The lesson scope must be checked both before scheduling and when the timer fires."
  );
  assert.match(
    answeredSource,
    /clearAutoAdvance\(\);\s*autoAdvanceTimerRef\.current = scheduleLessonPracticeAutoAdvance/,
    "A repeated successful answer callback must replace, rather than stack with, its prior timer."
  );
  assert.match(
    answeredSource,
    /resolveLessonPracticeAutoAdvanceIndex\(autoAdvanceRequest/,
    "The timer must resolve against the latest pager state instead of a captured question index."
  );

  assert.equal(
    lessonViewSource.includes("autoAdvanceStateRef.current = {\n    currentIndex"),
    false,
    "An uncommitted concurrent render must not publish a new auto-advance scope."
  );
  const cleanupStart = lessonViewSource.indexOf("useLayoutEffect(() => {\n    const committedAutoAdvanceState");
  const cleanupEnd = lessonViewSource.indexOf("\n\n  useEffect(() => {", cleanupStart + 1);
  assert.notEqual(cleanupStart, -1, "LessonQuestionPager must publish its active scope only after commit.");
  assert.notEqual(cleanupEnd, -1, "The committed-scope guard must end before the keyboard-navigation effect.");
  const cleanupSource = lessonViewSource.slice(cleanupStart, cleanupEnd);
  assert.match(cleanupSource, /autoAdvanceStateRef\.current = committedAutoAdvanceState;/);
  assert.match(
    cleanupSource,
    /if \(autoAdvanceStateRef\.current !== committedAutoAdvanceState\) return;/,
    "Cleanup from an older commit must not invalidate a newer committed scope."
  );
  assert.match(cleanupSource, /isActive: false/);
  assert.match(cleanupSource, /clearAutoAdvance\(\);/);
});

test("teacher-guide menu targets remain inside the right lesson content pane", () => {
  const panelStart = lessonViewSource.indexOf("const lessonContentPanel = (");
  const componentReturn = lessonViewSource.indexOf("\n\n  return (", panelStart);
  assert.notEqual(panelStart, -1, "LessonView must declare its right content panel.");
  assert.notEqual(componentReturn, -1, "LessonView must render after declaring its right content panel.");

  const contentPanelSource = lessonViewSource.slice(panelStart, componentReturn);
  assert.match(
    contentPanelSource,
    /\{lessonTeacherGuideSections\}/,
    "Teacher-guide articles referenced by menu target ids must render inside the scrollable right pane."
  );
  const teacherGuideSectionsStart = lessonViewSource.indexOf("const lessonTeacherGuideSections =");
  assert.notEqual(teacherGuideSectionsStart, -1, "LessonView must keep one reusable teacher-guide section tree.");
  assert.match(
    lessonViewSource.slice(teacherGuideSectionsStart, panelStart),
    /teacherGuideBlocks\.map\(\(block\) =>/,
    "The shared teacher-guide tree must own the menu-targeted articles."
  );
  assert.equal(
    lessonViewSource.slice(componentReturn).includes("teacherGuideBlocks.map((block) =>"),
    false,
    "Teacher-guide targets must not remain in a document-flow section outside the right pane."
  );
});

test("a new lesson slug resets only the right content pane to its beginning", () => {
  const slugEffectStart = lessonViewSource.indexOf("useLayoutEffect(() => {\n    const currentLessonHref");
  const slugEffectEnd = lessonViewSource.indexOf("\n  }, [slug]);", slugEffectStart);
  assert.notEqual(slugEffectStart, -1, "LessonView must keep its slug transition layout effect.");
  assert.notEqual(slugEffectEnd, -1, "The slug transition effect must stay keyed to slug.");

  const slugEffectSource = lessonViewSource.slice(slugEffectStart, slugEffectEnd);
  assert.match(
    slugEffectSource,
    /lessonContentPaneRef\.current\?\.scrollTo\(\{\s*behavior: "auto",\s*top: 0\s*\}\);/,
    "Changing units must not inherit the previous unit's right-pane scrollTop."
  );
  assert.equal(
    slugEffectSource.includes("lessonDirectoryPaneRef.current"),
    false,
    "Changing units must not unexpectedly reposition the learner's grade directory."
  );
});

test("mobile quick jumps stabilize against deferred content growth and clean up every pending observer", () => {
  assert.match(
    lessonViewSource,
    /const mobileLessonTargetStabilizationCleanupRef = useRef<\(\(\) => void\) \| null>\(null\);/,
    "LessonView must own exactly one cleanup handle for the active mobile quick jump."
  );
  assert.match(
    lessonViewSource,
    /function cancelMobileLessonTargetStabilization\(\)/,
    "LessonView must expose one idempotent cleanup path for observers, animation frames, and the hard limit."
  );

  const itemSelectStart = lessonViewSource.indexOf("function handleLessonItemSelect(targetId: string)");
  const scheduleOverviewStart = lessonViewSource.indexOf("function scheduleLessonOverviewScroll", itemSelectStart);
  assert.notEqual(itemSelectStart, -1, "LessonView must keep the shared item-selection callback.");
  assert.notEqual(scheduleOverviewStart, -1, "The source contract must end at the next stable lesson-navigation function.");
  const itemSelectSource = lessonViewSource.slice(itemSelectStart, scheduleOverviewStart);

  assert.match(
    itemSelectSource,
    /cancelMobileLessonTargetStabilization\(\);/,
    "A new selection must stop any observer that belongs to the previous target."
  );
  assert.match(
    itemSelectSource,
    /new ResizeObserver/,
    "Mobile document-flow jumps must react when deferred panels change the content-pane height."
  );
  assert.match(
    itemSelectSource,
    /requestAnimationFrame/,
    "Resize notifications must wait for the resulting layout before measuring the target again."
  );
  assert.match(
    itemSelectSource,
    /createLessonTargetViewportRealignment/,
    "Observer passes must realign only when the target has left the safe viewport region."
  );
  assert.match(
    itemSelectSource,
    /window\.setTimeout\([^,]+, mobileLessonTargetStabilizationMaxMs\)/,
    "An active observer must have a hard lifetime limit instead of watching the lesson indefinitely."
  );
  assert.match(
    itemSelectSource,
    /desktopMediaQuery\.addEventListener\("change", cancelOnDesktopBreakpoint\)/,
    "A mobile observer must stop if the responsive layout changes to desktop."
  );
  for (const eventName of ["pointerdown", "touchstart", "wheel", "keydown"] as const) {
    assert.match(
      itemSelectSource,
      new RegExp(`window\\.addEventListener\\("${eventName}", cancelOnUserInput`),
      `A ${eventName} gesture must hand scroll ownership back to the learner.`
    );
    assert.match(
      itemSelectSource,
      new RegExp(`window\\.removeEventListener\\("${eventName}", cancelOnUserInput`),
      `Cleanup must remove the temporary ${eventName} listener.`
    );
  }
  assert.equal(
    itemSelectSource.includes("preventDefault"),
    false,
    "Stabilization may observe user input for cleanup but must not intercept wheel or touch behavior."
  );
  assert.equal(
    [...itemSelectSource.matchAll(/if \(isCleanedUp\) return;/g)].length,
    3,
    "Cleanup, queued ResizeObserver delivery, and queued animation-frame work must all be idempotent no-ops."
  );

  const slugEffectStart = lessonViewSource.indexOf("useLayoutEffect(() => {\n    const currentLessonHref");
  const slugEffectEnd = lessonViewSource.indexOf("\n  }, [slug]);", slugEffectStart);
  const slugEffectSource = lessonViewSource.slice(slugEffectStart, slugEffectEnd);
  assert.match(
    slugEffectSource,
    /cancelMobileLessonTargetStabilization\(\);/,
    "Changing lesson slugs must stop stabilization for the old target."
  );
  assert.match(
    lessonViewSource,
    /useEffect\(\(\) => \(\) => cancelMobileLessonTargetStabilization\(\), \[\]\);/,
    "Unmounting LessonView must disconnect the observer and cancel pending work."
  );
});

test("unit directory navigation preserves the lesson menu", () => {
  assert.equal(
    directorySource.includes("fromGalaxy=planet"),
    false,
    "Cross-unit directory links must not add the planet-entry query that collapses the left menu."
  );
  assert.equal(
    directorySource.includes("onEnterPlanet?."),
    false,
    "Cross-unit directory links must not write the planet-entry session flag that collapses the left menu."
  );
  assert.match(
    lessonViewSource,
    /const shouldRenderGalaxyDirectory = true;/,
    "LessonView must keep the unit directory layout mounted for every lesson route."
  );
});

test("world unit stops replace numeric lesson emoji through deterministic theme palettes", () => {
  assert.match(
    worldMenuSource,
    /import \{ selectLessonWorldStopMarker \} from "@\/components\/lesson\/worlds\/worldStopMarker";/,
    "WorldMenu must sanitize raw lesson emoji through the shared stop-marker selector."
  );
  assert.match(
    worldMenuSource,
    /return selectLessonWorldStopMarker\(\{\s*candidate: ccssLessonMetasForTopic\(topicId\)\[0\]\?\.emoji,\s*fallback: theme\.fallbackStopEmoji,\s*palette: theme\.stopEmojiPalette,\s*stableKey: topicId\s*\}\);/,
    "The selector must use the raw marker only as an input and choose fallback cartoons deterministically by topic."
  );
  assert.equal(
    worldMenuSource.includes("Math.random"),
    false,
    "Unit stop markers must never change randomly between renders."
  );
  assert.match(
    worldMenuSource,
    /data-lesson-unit-stop-marker="true"/,
    "The decorative marker must expose a stable acceptance-test hook without entering the link's accessible name."
  );
  assert.match(
    worldMenuSource,
    /en: `Unit \$\{index \+ 1\} \$\{stopNoun\}:/,
    "The accessible unit label must retain its explicit Unit N wayfinding text."
  );
  assert.match(
    worldThemeSource,
    /stopEmojiPalette: readonly string\[\];/,
    "Every world theme must own its curated stop-marker palette."
  );
  for (const [themeName, themeId] of [
    ["sproutMeadow", "sprout-meadow"],
    ["voyagerSeas", "voyager-seas"],
    ["skylineHeights", "skyline-heights"],
    ["deepSpace", "deep-space"]
  ] as const) {
    const themeStart = worldThemeSource.indexOf(`const ${themeName}: LessonWorldTheme = {`);
    const nextThemeStart = worldThemeSource.indexOf("\nconst ", themeStart);
    const themeSource = worldThemeSource.slice(themeStart, nextThemeStart < 0 ? undefined : nextThemeStart);
    assert.notEqual(themeStart, -1, `${themeId} must remain configured.`);
    assert.match(themeSource, new RegExp(`id: "${themeId}"`), `${themeName} must retain its world id.`);
    assert.match(themeSource, /stopEmojiPalette: \[[^\]]+\]/, `${themeId} must provide a non-empty curated palette.`);
  }
});

test("unit directory uses grade-level California course names", () => {
  assert.match(
    directorySource,
    /californiaCourseTitleForGrade/,
    "The directory header should use grade-level California course names instead of active unit names."
  );
  assert.equal(
    directorySource.includes("text={cleanLessonDisplayTitle(text(lesson.topic.title))}"),
    false,
    "The directory header must not render the current unit title as the course name."
  );
});

test("lesson directory layout lets content fill the remaining page width", () => {
  assert.equal(
    lessonViewSource.includes("minmax(0,64rem)"),
    false,
    "The lesson directory grid must not cap the content column at 64rem on wide screens."
  );
  assert.equal(
    lessonViewSource.includes("lg:max-w-[64rem]"),
    false,
    "The lesson content wrapper must not keep the old 64rem max width when the page should stretch horizontally."
  );
});

test("lesson content omits the oversized next-item action and its CTA-only visualization API", () => {
  for (const removedConsumerToken of [
    "renderNextLessonItemButton",
    "visualizationNextItemAction",
    "usesConfiguredVisualizationFooterAction",
    "controlFooterAction"
  ]) {
    assert.equal(
      lessonViewSource.includes(removedConsumerToken),
      false,
      `LessonView must not retain CTA-only consumer token ${removedConsumerToken}.`
    );
  }
  assert.equal(configuredVisualizationLabSource.includes("controlFooterAction"), false);
  assert.equal(configuredVisualizationLabSource.includes("data-viz-lesson-action-slot"), false);
  assert.match(lessonViewSource, /<section id="visualization"/, "Removing the CTA must not remove the visualization section.");
  assert.match(lessonViewSource, /id=\{lessonPracticeSectionId\}/, "Removing the CTA must not remove lesson practice.");
});

test("lesson content removes CTA-only copy, hooks, constants, and scroll helpers", () => {
  for (const removedToken of [
    "nextLessonItemButtonBaseClassName",
    "nextLessonItemInlineButtonClassName",
    "nextLessonItemPanelButtonClassName",
    "nextLessonItemClickSafeAreaPx",
    "nextLessonItemScrollRevealDelayMs",
    "data-lesson-next-item-button",
    "revealLastNextLessonItemButton",
    "scrollToNextLessonItem",
    "scrollToLessonItemAfterWorkedExample",
    "scrollToLessonPracticeItem",
    "scrollToLessonSection",
    "Go to next item",
    "前往下一項",
    "前往下一项"
  ]) {
    assert.equal(lessonViewSource.includes(removedToken), false, `LessonView must remove dead CTA token ${removedToken}.`);
  }
});

test("lesson menu item cards omit section labels and generated metadata titles", () => {
  assert.equal(
    directorySource.includes("itemKindLabel"),
    false,
    "Lesson menu cards must not show Concept / Example / Lab / Practice labels above item titles."
  );
  assert.equal(
    directorySource.includes("t(itemKindLabel"),
    false,
    "Lesson menu cards should render only the concise item title."
  );
  assert.match(
    directorySource,
    /title: t\(\{ en: "Concept explanation", zh: "概念說明", zhHans: "概念说明" \}\)/,
    "Other-unit preview menus should use a generic concept title instead of generated textbook metadata."
  );
  // Not anchored on `title:` any more — an `interactive-lesson` branch now sits
  // ahead of these two. The contract being pinned is the pairing itself: a
  // worked example gets the singular worked-example title, anything else falls
  // through to the generic concept title rather than generated textbook metadata.
  assert.match(
    lessonViewSource,
    /block\.type === "worked-example"[\s\S]*?\? t\(singularWorkedExampleTitle\)[\s\S]*?: t\(\{ en: "Concept explanation", zh: "概念說明", zhHans: "概念说明" \}\)/,
    "Current lesson concept menu items should use the generic concept title."
  );
  assert.match(
    lessonViewSource,
    /title: t\(\{ en: "Interactive lab", zh: "互動實驗室", zhHans: "互动实验室" \}\)/,
    "Current lesson visualization menu items should use the generic interactive lab title."
  );
  assert.equal(
    lessonViewSource.includes("compactLessonVisualizationMenuTitle"),
    false,
    "LessonView should not feed generated visualization titles into menu cards."
  );
});

test("lesson menu unit cards omit grade and status metadata", () => {
  assert.equal(
    directorySource.includes("moduleMeta"),
    false,
    "Lesson unit cards must not render compact metadata like P1 / Ready."
  );
  assert.equal(
    directorySource.includes("lessonStatusLabel"),
    false,
    "Lesson unit cards should not derive status labels for the removed metadata row."
  );
  assert.equal(
    directorySource.includes("formatGradeLabel(module.grade"),
    false,
    "Lesson unit cards should not derive grade labels for the removed metadata row."
  );
});

test("lesson menu item cards prefix every part with unit and part numbers", () => {
  assert.match(
    directorySource,
    /import \{ formatLessonPartDisplay \} from "@\/components\/lesson\/lessonPartDisplay";/,
    "The list fallback must use the shared lesson-part display formatter."
  );
  assert.match(
    worldMenuSource,
    /import \{ formatLessonPartDisplay \} from "@\/components\/lesson\/lessonPartDisplay";/,
    "The world map must use the same lesson-part display formatter as list view."
  );
  for (const [name, source] of [
    ["WorldMenu", worldMenuSource],
    ["LessonGalaxyDirectory", directorySource]
  ] as const) {
    assert.match(
      source,
      /formatLessonPartDisplay\(\{\s*itemIndex,\s*title: item\.title,\s*unitIndex: index\s*\}\)\.menuTitle/,
      `${name} must derive its visible Unit.Part title and trailing marker from the shared model.`
    );
  }
  assert.equal(
    directorySource.includes("function formatLessonPartTitle"),
    false,
    "List view must not retain a formatter that can drift from world-map labels."
  );
});

test("right-side target headings share the menu display model without changing raw lesson metadata", () => {
  assert.match(
    lessonViewSource,
    /import \{ formatLessonPartDisplay, type LessonPartDisplay \} from "@\/components\/lesson\/lessonPartDisplay";/,
    "LessonView must consume the same display model as both left-directory views."
  );
  assert.match(
    lessonViewSource,
    /const lessonPartDisplayByTargetId = useMemo\(\(\) => new Map<string, LessonPartDisplay>\(/,
    "LessonView must index one shared display model by the target ids used by quick jumps."
  );
  assert.match(
    lessonViewSource,
    /lessonGalaxyItems\.map\(\(item, itemIndex\) => \[\s*item\.targetId,\s*formatLessonPartDisplay\(\{\s*itemIndex,\s*title: item\.title,\s*unitIndex: activeLessonUnitIndex\s*\}\)\s*\]\)/,
    "Right headings must derive their ordinals and base titles from the same ordered menu items."
  );
  assert.match(
    lessonViewSource,
    /const blockDisplayTitle = lessonPartDisplayByTargetId\.get\(lessonBlockSectionId\(block\.id\)\)\?\.contentTitle \?\? blockTitle;/,
    "Every interactive/concept/example target heading must use its menu-aligned content title."
  );
  assert.match(
    lessonViewSource,
    /<MathText as="h2" text=\{blockDisplayTitle\}/,
    "Visible course-content headings must render the display-only title."
  );
  assert.match(
    lessonViewSource,
    /data-ai-title=\{blockTitle\}/,
    "AI selection metadata must keep the original source title."
  );
  assert.match(
    lessonViewSource,
    /title=\{blockTitle\}/,
    "Audio and internal lesson behavior must keep the original source title."
  );
  assert.match(
    lessonViewSource,
    /const visualizationDisplayTitle = lessonPartDisplayByTargetId\.get\("visualization"\)\?\.contentTitle;/,
    "The visualization target must use its actual menu position, not a hard-coded ordinal."
  );
  assert.match(
    lessonViewSource,
    /<MathText as="h2" text=\{visualizationDisplayTitle\}/,
    "The visualization heading must match the left menu's base title and ordinal."
  );
  assert.match(
    lessonViewSource,
    /const practiceDisplayTitle = lessonPartDisplayByTargetId\.get\(lessonPracticeSectionId\)\?\.contentTitle;/,
    "The practice target must use its actual menu position, not a hard-coded ordinal."
  );
  assert.match(
    lessonViewSource,
    /displayTitle\?: string;/,
    "LessonQuestionPager must accept a display-only menu-aligned heading."
  );
  assert.match(
    lessonViewSource,
    /<LessonQuestionPager[\s\S]*?displayTitle=\{practiceDisplayTitle\}/,
    "The practice target must pass its 2.6-style display title into the existing pager header."
  );
  assert.match(
    lessonViewSource,
    /\{displayTitle \?\? t\(\{ en: "Lesson practice", zh: "課節練習", zhHans: "课时练习" \}\)\}/,
    "The existing pager h2 must show the numbered display title while preserving a localized fallback."
  );
  assert.equal(
    lessonViewSource.includes('<MathText as="h2" text={practiceDisplayTitle}'),
    false,
    "The practice section must not add a second heading outside the pager."
  );
  assert.match(
    lessonViewSource,
    /const teacherGuideDisplayTitle = lessonPartDisplayByTargetId\.get\(lessonBlockSectionId\(block\.id\)\)\?\.contentTitle \?\? text\(block\.title\);/,
    "Teacher/admin-only targets must also use their actual menu position when present."
  );
});
