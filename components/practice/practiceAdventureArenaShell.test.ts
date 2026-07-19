import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
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

test("centers the remaining hero Start Mission button", () => {
  ok(
    shellSource.includes('className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"'),
    "Expected the hero CTA row to center the remaining Start Mission button"
  );
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

test("surfaces both practice games on the map with locked and unlocked states", () => {
  ok(shellSource.includes("studentPracticeGameHrefs.adventureIsland"), "Adventure Island marker must link to the real game route");
  ok(shellSource.includes("studentPracticeGameHrefs.fishingMaster"), "Fishing Master marker must link to the real game route");
  ok(shellSource.includes('data-testid={`island-game-${marker.id}`}'), "Map markers need stable test ids");
  ok(shellSource.includes('data-testid={`island-game-chip-${marker.id}`}'), "Chip-row game entries need stable test ids");
  ok(shellSource.includes("islandGameLockedHint"), "Locked games must explain the 4-of-5 unlock rule");
  ok(shellSource.includes("games[marker.unlockedKey]"), "Marker state must come from the games prop, not be hardcoded");
});
