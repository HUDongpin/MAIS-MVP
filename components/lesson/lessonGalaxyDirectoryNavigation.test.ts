import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directorySource = readFileSync("components/lesson/LessonGalaxyDirectory.tsx", "utf8");
const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");

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

test("lesson visualization areas always expose the next item action", () => {
  assert.match(
    lessonViewSource,
    /const visualizationNextItemAction = renderNextLessonItemButton\(scrollToLessonPracticeItem, nextLessonItemPanelButtonClassName\);/,
    "LessonView should create one shared visualization next-item action."
  );
  assert.match(
    lessonViewSource,
    /const usesConfiguredVisualizationFooterAction = visualizationBlock\?\.visualizationConfig\?\.moduleId === "configured-visualization-lab";/,
    "Configured labs should place the action inside the lab control footer."
  );
  assert.match(
    lessonViewSource,
    /controlFooterAction=\{usesConfiguredVisualizationFooterAction \? visualizationNextItemAction : undefined\}/,
    "ConfiguredVisualizationLab should receive the footer action only when it can render the in-panel slot."
  );
  assert.match(
    lessonViewSource,
    /\{usesConfiguredVisualizationFooterAction \? null : \([\s\S]*\{visualizationNextItemAction\}/,
    "Non-configured visualization modules should still render the next-item action in the lesson visualization area."
  );
});

test("lesson next item scroll reveals the destination follow-up button safely", () => {
  assert.match(
    lessonViewSource,
    /const nextLessonItemClickSafeAreaPx = \d+;/,
    "LessonView should reserve bottom viewport padding for partially visible next-item buttons."
  );
  assert.match(
    lessonViewSource,
    /data-lesson-next-item-button="true"/,
    "Next-item buttons should expose a stable selector for scroll safety checks."
  );
  assert.match(
    lessonViewSource,
    /function revealLastNextLessonItemButton/,
    "LessonView should include a helper that reveals the last next-item button inside the scrolled section."
  );
  assert.match(
    lessonViewSource,
    /scrollBy\(\{\s*top: bottomOverflow/,
    "The helper should scroll by the measured bottom overflow instead of using a fixed jump."
  );
  assert.match(
    lessonViewSource,
    /scrollToLessonSection\([^)]*\{\s*revealLastNextItemButton: true\s*\}/,
    "Next-item section jumps should opt into the safe reveal pass."
  );
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
  assert.match(
    lessonViewSource,
    /title: block\.type === "worked-example"[\s\S]*\? t\(singularWorkedExampleTitle\)[\s\S]*: t\(\{ en: "Concept explanation", zh: "概念說明", zhHans: "概念说明" \}\)/,
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
    /function formatLessonPartTitle/,
    "Lesson directory should use one formatter for Unit.Part menu labels."
  );
  assert.match(
    directorySource,
    /\$\{unitIndex \+ 1\}\.\$\{itemIndex \+ 1\} \$\{title\}/,
    "Lesson part labels should render as 1.1 Concept explanation, 1.2 Worked example, and so on."
  );
  assert.match(
    directorySource,
    /moduleItems\.map\(\(item, itemIndex\) =>/,
    "Lesson menu cards should derive the part number from each item position inside the unit."
  );
  assert.match(
    directorySource,
    /const numberedItemTitle = formatLessonPartTitle\(\{\s*itemIndex,\s*title: item\.title,\s*unitIndex: index\s*\}\);/,
    "Lesson menu cards should combine module index and item index before rendering."
  );
  assert.match(
    directorySource,
    /text=\{numberedItemTitle\}/,
    "The visible menu card title should include the Unit.Part prefix."
  );
  assert.match(
    directorySource,
    /Open \$\{moduleTitle\}: \$\{numberedItemTitle\}/,
    "Cross-unit menu links should expose the same numbered label to assistive technology."
  );
});
