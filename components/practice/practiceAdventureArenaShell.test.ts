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
  ok(
    shellSource.includes("onModeChange: (mode: PracticeAdventureArenaMode) => void"),
    "Mode changes need an explicit page-owned callback"
  );
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

test("uses a high-contrast chooser with distinct semantic action icons", () => {
  ok(shellSource.includes("data-practice-chooser-heading"), "The chooser heading needs a stable contrast marker");
  ok(shellSource.includes("bg-white/95"), "The chooser heading must sit on a high-contrast light surface");
  ok(shellSource.includes("data-practice-chooser-grid"), "The chooser grid needs a stable browser marker");
  equal(
    shellSource.match(/data-practice-cta-icon=/g)?.length ?? 0,
    2,
    "Each chooser action should have exactly one leading icon"
  );
  ok(shellSource.includes('data-practice-cta-icon="unit-exercise"'));
  ok(shellSource.includes('data-practice-cta-icon="free-exploration"'));
  ok(shellSource.includes("<UnitExerciseIcon"), "Unit Exercise must render its semantic exercise icon");
  ok(shellSource.includes("<FreeExplorationIcon"), "Free Exploration must render its semantic compass icon");
  ok(!shellSource.includes("function PracticeIcon"), "The ambiguous crossed-tools icon should remain removed");
});

test("prioritizes the above-the-fold chooser map preview", () => {
  const previewStart = shellSource.indexOf("data-practice-map-preview");
  const previewSource = shellSource.slice(previewStart, previewStart + 900);

  ok(previewStart >= 0, "The chooser map preview must remain available");
  ok(
    previewSource.includes("priority"),
    "The above-the-fold chooser map must be prioritized so Next does not emit an LCP warning"
  );
});

test("lets learners return to the chooser from Explore while Unit keeps an accessible mode marker", () => {
  ok(shellSource.includes("data-adjust-practice"), "Explore needs a stable chooser-return control");
  ok(shellSource.includes("onClick={handleAdjustPractice}"), "Explore must use the real chooser-return handler");
  ok(shellSource.includes('onModeChange("chooser")'), "Explore must return through the controlled mode callback");

  const unitBranchStart = shellSource.indexOf('if (mode === "unit")');
  const unitBranchEnd = shellSource.indexOf("\n  return (", unitBranchStart + 1);
  const unitBranch = shellSource.slice(unitBranchStart, unitBranchEnd);
  ok(unitBranchStart >= 0, "The controlled Unit branch must remain available");
  ok(unitBranch.includes('data-practice-mode="unit"'), "Unit mode needs a stable semantic marker");
  ok(unitBranch.includes('className="sr-only"'), "The shell must preserve zero-visual Unit semantics");
});

test("keeps the Explore destination heading programmatically focusable", () => {
  const exploreBranchStart = shellSource.indexOf('data-practice-mode="explore"');
  const exploreBranch = shellSource.slice(exploreBranchStart);
  const exploreHeading = exploreBranch.match(/<h1 id="practice-adventure-title"[^>]*>/)?.[0] ?? "";

  ok(exploreBranchStart >= 0, "The controlled Explore branch must remain available");
  ok(exploreHeading, "Explore must render the destination heading used by the mode-change focus handler");
  ok(
    exploreHeading.includes("tabIndex={-1}"),
    "Explore's destination heading must accept programmatic focus after the learner changes mode"
  );
});

test("localizes the focused Explore destination heading", () => {
  const exploreBranchStart = shellSource.indexOf('data-practice-mode="explore"');
  const exploreBranch = shellSource.slice(exploreBranchStart);

  ok(exploreBranch.includes('en: "Practice Arena — Free Exploration"'));
  ok(exploreBranch.includes('zh: "練習競技場－自由探索"'));
  ok(exploreBranch.includes('zhHans: "练习竞技场－自由探索"'));
});

test("does not offer a confirmed-unavailable Guided destination as an active action", () => {
  ok(shellSource.includes("unitStatus: PracticeUnitMissionStatus"));
  ok(shellSource.includes('disabled={unitStatus === "unavailable"}'));
  ok(shellSource.includes("data-unit-exercise-door-status"));
  ok(shellSource.includes('en: "Available"'));
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

test("renders map regions as clickable buttons instead of decorative labels", () => {
  ok(!shellSource.includes("const mapLabels"), "Expected the hardcoded decorative mapLabels list to be removed");
  ok(shellSource.includes("onRegionSelect(status.region.id)"), "Expected region pins and chips to call onRegionSelect");
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
});

test("exposes star-flight anchors and a pulse state on region pins and chips", () => {
  ok(shellSource.includes("data-island-region-pin={status.region.id}"), "Map pins need a stable anchor for the star flight");
  ok(shellSource.includes("data-island-region-chip={status.region.id}"), "Chips need a stable anchor for the star flight");
  ok(shellSource.includes("pulseRegionId === status.region.id ? regionPulseClassName : null"), "The awarded region must pulse after the flight");
  ok(shellSource.includes("motion-safe:animate-pulse"), "The pulse must respect reduced-motion preferences");
});

test("renders island regions as quest cards instead of the flat chip pills", () => {
  ok(shellSource.includes('className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"'), "Regions must lay out as a responsive quest-card grid");
  ok(shellSource.includes("data-island-region-quest-tone={tone}"), "Cards must expose their derived quest tone for tests and styling");
  ok(shellSource.includes("Island quests"), "The quest-card section needs a heading");
  ok(!shellSource.includes('"focus-ring flex min-h-11 items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5"'), "The old region chip pill styling must be gone");
});

test("derives quest status from island data rather than hardcoded labels", () => {
  ok(shellSource.includes("function resolveRegionQuestTone"), "Quest tone must be derived in one place");
  ok(shellSource.includes("if (status.locked) return \"locked\";"), "A locked region must read as locked");
  ok(shellSource.includes("if (status.stars >= practiceIslandMaxStarsPerRegion) return \"complete\";"), "Three stars must read as complete");
  ok(shellSource.includes("if (status.region.kind === \"adaptive\") return \"recommended\";"), "The AI-picked region carries the single recommended highlight");
  ok(shellSource.includes("if (status.stars > 0) return \"progress\";"), "Partial stars must read as in progress");
});

test("quest cards keep the star economy and stay clickable into practice", () => {
  ok(shellSource.includes("<RegionStars stars={status.stars} starClassName=\"size-4\" />"), "Cards must show the real earned stars");
  ok(shellSource.includes("practiceIslandMaxStarsPerRegion) * 100"), "The card progress bar must be driven by earned stars");
  ok(shellSource.includes("onClick={() => onRegionSelect(status.region.id)}"), "Cards must start the region's practice round");
  ok(shellSource.includes("regionQuestActionLabel"), "Cards need a status-aware call to action");
});

test("surfaces both practice games on the map with locked and unlocked states", () => {
  ok(shellSource.includes("studentPracticeGameHrefs.adventureIsland"), "Adventure Island marker must link to the real game route");
  ok(shellSource.includes("studentPracticeGameHrefs.fishingMaster"), "Fishing Master marker must link to the real game route");
  ok(shellSource.includes('data-testid={`island-game-${marker.id}`}'), "Map markers need stable test ids");
  ok(shellSource.includes('data-testid={`island-game-chip-${marker.id}`}'), "Chip-row game entries need stable test ids");
  ok(shellSource.includes("islandGameLockedHint"), "Locked games must explain the 4-of-5 unlock rule");
  ok(shellSource.includes("games[marker.unlockedKey]"), "Marker state must come from the games prop, not be hardcoded");
});
