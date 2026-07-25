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
