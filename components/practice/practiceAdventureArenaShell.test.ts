import { readFileSync } from "node:fs";
import { join } from "node:path";
import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

const shellSource = readFileSync(
  join(process.cwd(), "components/practice/PracticeAdventureArenaShell.tsx"),
  "utf8"
);

test("omits the old Practice Arena stats sidebar labels", () => {
  for (const sidebarLabel of ["Current Streak", "Keep it going!", "Accuracy"]) {
    ok(!shellSource.includes(sidebarLabel), `Expected PracticeAdventureArenaShell to omit ${sidebarLabel}`);
  }
});

test("omits the hero Choose Topic button label", () => {
  ok(!shellSource.includes("Choose Topic"), "Expected PracticeAdventureArenaShell to omit the hero Choose Topic button");
});

test("offers exactly two clear mode choices wired to the existing practice flows", () => {
  equal(
    shellSource.match(/data-practice-mode-choice=/g)?.length ?? 0,
    2,
    "The landing chooser must expose exactly two mode choices"
  );
  ok(
    shellSource.includes('data-practice-mode-choice="guided"'),
    "The guided Unit Exercise door needs a stable mode marker"
  );
  ok(
    shellSource.includes('data-practice-mode-choice="explore"'),
    "The Free Exploration door needs a stable mode marker"
  );
  ok(shellSource.includes("onClick={handleStartMission}"), "The guided door must use the real mission-start handler");
  ok(shellSource.includes('onModeChange("unit")'), "The mission-start handler must enter Unit Exercise mode");
  ok(shellSource.includes("onStartMission();"), "The mission-start handler must preserve the existing Practice Arena callback");
  ok(
    shellSource.includes("onClick={handleOpenExplore}"),
    "The exploration door must reveal the existing island flow"
  );
  ok(shellSource.includes('onModeChange("explore")'), "The exploration door must enter the controlled Explore mode");
  ok(shellSource.includes("mode: PracticeAdventureArenaMode"), "The shell must receive its selected mode from the page");
  ok(shellSource.includes("onModeChange: (mode: PracticeAdventureArenaMode) => void"), "Mode changes need an explicit page-owned callback");
});

test("keeps prototype labels out of the two-door chooser", () => {
  ok(shellSource.includes("Where do you want to go?"), "The chooser needs the approved two-door heading");
  ok(!shellSource.includes('en: "Practice Arena"'), "The chooser must omit the Practice Arena eyebrow above its heading");
  ok(!shellSource.includes("Concept C"), "The internal Concept C label must not be visible");
  ok(!shellSource.includes("Two clear doors"), "The internal two-clear-doors label must not be visible");
});

test("uses Nova as the landing progress star without a question-count eyebrow", () => {
  ok(
    shellSource.includes('import { NovaCompanion } from "@/components/practice/NovaCompanion";'),
    "The landing trail must reuse the product's Nova star companion"
  );
  ok(shellSource.includes("<NovaCompanion"), "The landing trail must render Nova above its active step");
  ok(!shellSource.includes("Question 1 of 5"), "The landing preview must not show a Question 1 of 5 label");
});

test("shows the real five-star reward loop on the guided choice", () => {
  ok(
    shellSource.includes('import { PracticeStarReward } from "@/components/practice/PracticeQuestPager";'),
    "The guided choice should reuse the real Practice Arena reward component"
  );
  ok(shellSource.includes("data-practice-reward-preview"), "The reward preview needs a stable browser marker");
  ok(shellSource.includes("<PracticeStarReward"), "The guided choice must render the star reward at first glance");
  ok(shellSource.includes("correctCount={0}"), "The chooser reward should begin at zero earned stars");
  ok(shellSource.includes("total={5}"), "The chooser reward should advertise all five available stars");
});

test("uses a slightly wider high-contrast chooser layout", () => {
  ok(shellSource.includes("data-practice-chooser-heading"), "The chooser heading needs a stable contrast marker");
  ok(shellSource.includes("bg-white/95"), "The chooser heading must sit on a high-contrast light surface");
  ok(shellSource.includes("data-practice-chooser-grid"), "The compact chooser grid needs a stable browser marker");
  ok(shellSource.includes("max-w-[1180px]"), "The two choices should use the approved slightly wider desktop width");
  ok(shellSource.includes("sm:h-52 lg:h-56"), "The chooser previews should use bounded heights instead of card-width aspect sizing");
});

test("uses distinct semantic icons for the two chooser actions", () => {
  equal(
    shellSource.match(/data-practice-cta-icon=/g)?.length ?? 0,
    2,
    "Each chooser action should have exactly one leading icon"
  );
  ok(
    shellSource.includes('data-practice-cta-icon="unit-exercise"'),
    "Unit Exercise should use its own exercise-sheet icon"
  );
  ok(
    shellSource.includes('data-practice-cta-icon="free-exploration"'),
    "Free Exploration should use its own compass icon"
  );
  ok(shellSource.includes("<UnitExerciseIcon"), "The Unit Exercise action must render the semantic exercise icon");
  ok(shellSource.includes("<FreeExplorationIcon"), "The Free Exploration action must render the semantic compass icon");
  ok(!shellSource.includes("function PracticeIcon"), "The ambiguous crossed-tools icon should be removed");
});

test("gives the guided door a light, relaxing surface instead of a dark-blue card", () => {
  const markerIndex = shellSource.indexOf('data-practice-mode-choice="guided"');
  ok(markerIndex >= 0, "The guided door marker is required before its surface can be checked");

  const openingTagStart = shellSource.lastIndexOf("<", markerIndex);
  const openingTagEnd = shellSource.indexOf(">", markerIndex);
  const guidedDoorOpeningTag = shellSource.slice(openingTagStart, openingTagEnd + 1);
  ok(
    guidedDoorOpeningTag.includes("bg-gradient-to-br from-sky-50 via-white to-emerald-50"),
    "The guided door must declare the approved relaxing light gradient"
  );
  ok(
    !/bg-(?:slate|blue|indigo)-(?:800|900|950)/.test(guidedDoorOpeningTag),
    "The guided door must not return to the prototype's dark-blue treatment"
  );
});

test("keeps the complete chooser preview while using the approved Explore map crop", () => {
  const previewStart = shellSource.indexOf("data-practice-map-preview");
  const previewEnd = shellSource.indexOf("</article>", previewStart);
  const chooserMapSource = shellSource.slice(previewStart, previewEnd);
  const exploreMapStart = shellSource.indexOf("data-practice-explore-map");
  const exploreMapEnd = shellSource.indexOf("</div>", exploreMapStart);
  const exploreMapSource = shellSource.slice(exploreMapStart, exploreMapEnd);

  ok(previewStart >= 0, "The compact chooser map needs a stable browser marker");
  ok(chooserMapSource.includes("sm:h-52 lg:h-56"), "The chooser map must use the compact bounded height");
  ok(chooserMapSource.includes("object-contain"), "The complete chooser island map must fit inside its surface");
  ok(!chooserMapSource.includes("object-cover"), "The chooser island map must not use an object-cover crop");
  ok(exploreMapStart >= 0, "The Explore map needs a stable target-layout marker");
  ok(exploreMapSource.includes("min-h-[530px]"), "The desktop Explore map must keep the prototype's stable height");
  ok(exploreMapSource.includes("object-cover"), "The Explore map must use the approved Variant A framing");
});

test("lets learners return to the two-door chooser from either practice surface", () => {
  ok(shellSource.includes("Adjust practice"), "The target Explore panel needs its Adjust practice action");
  ok(shellSource.includes("data-adjust-practice"), "The Explore action needs a stable browser marker");
  ok(shellSource.includes("onClick={handleAdjustPractice}"), "Adjust practice must use the real chooser-return handler");
  ok(shellSource.includes('onModeChange("chooser")'), "Adjust practice must return through the controlled mode callback");
});

test("removes the standalone Unit header while preserving a zero-visual mode marker", () => {
  const unitBranchStart = shellSource.indexOf('if (mode === "unit")');
  const unitBranchEnd = shellSource.indexOf("\n  return (", unitBranchStart + 1);
  const unitBranch = shellSource.slice(unitBranchStart, unitBranchEnd);

  ok(unitBranchStart >= 0, "The controlled Unit branch must remain available");
  ok(unitBranch.includes('data-practice-mode="unit"'), "Unit mode still needs its stable page marker");
  ok(unitBranch.includes('className="sr-only"'), "The shell must keep only zero-visual Unit semantics");
  ok(!unitBranch.includes("<button"), "The detached Choose mode button must be removed from the shell");
  ok(!unitBranch.includes("rounded-2xl"), "The detached rounded Unit header panel must be removed");
  ok(!shellSource.includes("Change mode"), "The obsolete Change mode wording must be removed");
});

test("omits the Practice Arena grade selector panel", () => {
  for (const gradeSelectorText of ["Select Grade", "Primary", "Secondary", "role=\"radiogroup\""]) {
    ok(!shellSource.includes(gradeSelectorText), `Expected PracticeAdventureArenaShell to omit ${gradeSelectorText}`);
  }
});

test("omits the Topic Missions panel", () => {
  for (const topicMissionsText of ["Topic Missions", "adventure-topic-missions", "View all"]) {
    ok(!shellSource.includes(topicMissionsText), `Expected PracticeAdventureArenaShell to omit ${topicMissionsText}`);
  }
});

test("implements the Variant A Explore heading and two-column map-detail layout", () => {
  ok(shellSource.includes("data-practice-explore-heading"), "The Explore heading needs a stable target marker");
  ok(shellSource.includes("Explore the math island."), "The approved Explore title must be present");
  ok(
    shellSource.includes("Choose a region. There is no set order and no timer."),
    "The approved no-order and no-timer guidance must be present"
  );
  ok(shellSource.includes("data-practice-island-progress"), "The header needs the dynamic island progress badge");
  ok(shellSource.includes("data-practice-explore-layout"), "The map-detail grid needs a stable browser marker");
  ok(
    shellSource.includes("lg:grid-cols-[minmax(0,1.65fr)_minmax(265px,0.55fr)]"),
    "The desktop Explore surface must preserve the prototype's 3:1 map-detail ratio"
  );
  ok(shellSource.includes("max-w-[1240px]"), "The Explore surface must use the prototype's readable content width");
});

test("renders map regions as synchronized buttons instead of decorative labels", () => {
  ok(!shellSource.includes("const mapLabels"), "Expected the hardcoded decorative mapLabels list to be removed");
  equal(
    shellSource.match(/onClick=\{\(\) => setSelectedRegionId\(status\.region\.id\)\}/g)?.length ?? 0,
    2,
    "The map pin and quest card must update the same selected-region state"
  );
  equal(
    shellSource.match(/aria-pressed=\{selected\}/g)?.length ?? 0,
    2,
    "Both synchronized controls must expose the same pressed state"
  );
  ok(
    shellSource.includes('from "@/data/practiceIslandRegions"'),
    "Expected the shell to consume the shared island region definitions"
  );
});

test("shows real star counts instead of the hardcoded 2-of-3 rating", () => {
  ok(!shellSource.includes("opacity-45"), "Expected the fake dimmed third star to be removed");
  ok(shellSource.includes("index < stars"), "Expected star icons to fill from the earned star count");
});

test("keeps regions reachable on small screens via the chip row", () => {
  ok(shellSource.includes('role="group"'), "Expected a grouped chip row for the island regions");
  ok(shellSource.includes('aria-live="polite"'), "Expected a polite live region for region notices");
  ok(shellSource.includes("max-[840px]:min-h-[500px]"), "The map must retain a stable tablet height");
  ok(shellSource.includes("max-[620px]:min-h-[390px]"), "The map must retain a usable phone height");
  ok(shellSource.includes("min-[841px]:grid-cols-3"), "The quest list must collapse below the desktop grid breakpoint");
});

test("exposes star-flight anchors and a pulse state on region pins and chips", () => {
  ok(shellSource.includes("data-island-region-pin={status.region.id}"), "Map pins need a stable anchor for the star flight");
  ok(shellSource.includes("data-island-region-chip={status.region.id}"), "Chips need a stable anchor for the star flight");
  ok(shellSource.includes("pulseRegionId === status.region.id ? regionPulseClassName : null"), "The awarded region must pulse after the flight");
  ok(shellSource.includes("motion-safe:animate-pulse"), "The pulse must respect reduced-motion preferences");
});

test("renders the target selected-region detail card and real launch callback", () => {
  ok(shellSource.includes("data-selected-island-region={selectedRegionStatus?.region.id}"), "The detail card must expose its selected region");
  ok(shellSource.includes("Selected region"), "The target selected-region label must be present");
  ok(shellSource.includes("Next quest"), "The target next-quest block must be present");
  ok(shellSource.includes("data-start-selected-region"), "The selected-region CTA needs a stable browser marker");
  ok(shellSource.includes("onClick={handleSelectedQuestStart}"), "The detail CTA must own the launch action");
  ok(
    shellSource.includes("onRegionSelect(selectedRegionStatus.region.id);"),
    "Only the selected-region CTA should enter the real Practice Arena mission flow"
  );
  ok(
    shellSource.includes('document.getElementById("island-quests")?.scrollIntoView'),
    "A locked region must explain itself and return learners to open quests instead of launching"
  );
});

test("renders the compact synchronized three-by-two Island Quests grid", () => {
  ok(shellSource.includes("data-island-quest-list"), "The quest section needs a stable target marker");
  ok(shellSource.includes("Map and list always stay in sync."), "The target synchronization guidance must be present");
  ok(shellSource.includes("min-[841px]:grid-cols-3"), "The desktop list must use three columns");
  ok(shellSource.includes("min-h-[94px]"), "Quest cards must use the compact prototype height");
  ok(
    /"question-cavern",\s*"challenge-shore",\s*"masters-keep"/.test(shellSource),
    "The second row must keep the target Question Cavern, Challenge Shore, Master's Keep order"
  );
  ok(shellSource.includes("questListRegionStatuses.map"), "The rendered grid must consume the target display order");
  ok(!shellSource.includes("data-island-region-quest-tone"), "The former tall status-card contract must be removed");
  ok(!shellSource.includes("practiceIslandMaxStarsPerRegion) * 100"), "Compact cards must not retain the old progress bars");
});

test("uses explicit mutually exclusive border colors for synchronized selected states", () => {
  ok(
    shellSource.includes('selected || recommended ? "border-[#f6be2c]" : "border-white/95"'),
    "Selected map pins must keep their gold border instead of losing it to a base border class"
  );
  ok(
    shellSource.includes('recommended ? "border-[#efcf63] bg-[#fffdf3]" : selected ? "border-[#087ca7]" : "border-[#d8e7ef]"'),
    "Selected list cards must keep their ocean border instead of losing it to a base border class"
  );
});

test("derives visual status, star progress, and locks from production state", () => {
  ok(shellSource.includes('const recommended = status.region.kind === "adaptive";'), "Question Cavern status must come from region kind");
  ok(shellSource.includes('const challenge = status.region.kind === "challenge";'), "Challenge Shore status must come from region kind");
  ok(shellSource.includes("status.locked"), "Master's Keep styling and action must use the real lock state");
  ok(shellSource.includes('<RegionStars stars={status.stars} starClassName="size-3.5" />'), "List cards must show real earned stars");
  ok(shellSource.includes("{progressValue} / {safeProgressTotal}"), "Map progress must use live progress values");
  ok(!shellSource.includes("★ 7 / 18"), "The prototype's static progress must not leak into production");
});

test("keeps the target Explore surface free of unrelated game-marker copy", () => {
  ok(!shellSource.includes("islandGameMarkers"), "Variant A Explore must not add game markers that are absent from the target");
  ok(!shellSource.includes("island-game-chip"), "The target Island Quests grid must contain only its six regions");
});
