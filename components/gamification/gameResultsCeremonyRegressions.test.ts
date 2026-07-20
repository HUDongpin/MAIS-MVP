import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
import { test } from "node:test";

const ceremonySource = readFileSync(
  join(process.cwd(), "components/gamification/GameResultsCeremony.tsx"),
  "utf8"
);
const adventureSource = readFileSync(
  join(process.cwd(), "components/gamification/AdventureIslandGame.tsx"),
  "utf8"
);
const fishingSource = readFileSync(
  join(process.cwd(), "components/gamification/FishingGame.tsx"),
  "utf8"
);

test("the ceremony never intercepts clicks or blocks assertions beneath it", () => {
  ok(ceremonySource.includes("pointer-events-none"), "the overlay must stay non-interactive");
  ok(ceremonySource.includes('aria-live="polite"'), "screen readers must hear the result");
  ok(ceremonySource.includes("data-stars={starCount}"), "the earned star count must be observable");
});

test("the ceremony plays stars one at a time and respects reduced motion", () => {
  ok(ceremonySource.includes("ceremonyStarDelayMs(index)"), "stars must land staggered, not all at once");
  ok(ceremonySource.includes('playSound("star")'), "each earned star needs its chime");
  ok(ceremonySource.includes('playSound("combo3")'), "a new best deserves the top-tier fanfare");
  ok(ceremonySource.includes("useReducedMotion"), "reduced-motion players skip the choreography");
  ok(ceremonySource.includes("soundPlayedRef"), "ceremony sounds must fire once per run, not per re-render");
  ok(ceremonySource.includes("starCount > 0"), "zero-star runs get no confetti");
});

test("the ceremony can surface server-paid bonuses without blocking anything", () => {
  ok(ceremonySource.includes("bonusLine"), "the ceremony needs a bonus line slot");
  ok(ceremonySource.includes("-bonus"), "the bonus line needs a stable testid suffix");
});

test("Adventure Island runs the ceremony with client-evident stars and a persisted best", () => {
  ok(adventureSource.includes("GameResultsCeremony"), "the trophy celebration must be the shared ceremony");
  ok(adventureSource.includes("adventureRunStars"), "stars come from the shared spec");
  ok(adventureSource.includes('bestRunKey("adventure-island"'), "best runs are tracked per topic");
  ok(adventureSource.includes("gameBestStorageKey(currentUser?.id)"), "best runs persist per user");
  ok(adventureSource.includes('testId="adventure-island-clear-celebration"'), "the e2e-visible testid must survive");
  ok(
    adventureSource.indexOf("setCeremony({ stars: runStars") < adventureSource.indexOf("await fetch(adventureIslandApiPath"),
    "the ceremony must start before the reward submit round-trip, not after"
  );
});

test("Fishing Master stars follow the server-confirmed coins", () => {
  ok(fishingSource.includes("GameResultsCeremony"), "the settlement must gain the shared ceremony");
  ok(fishingSource.includes("fishingRunStars(result.coins)"), "stars must use the server-verified coin count");
  ok(fishingSource.includes('bestRunKey("fishing-master"'), "best runs are tracked per topic");
  ok(fishingSource.includes('testId="fishing-results-ceremony"'), "the fishing ceremony needs its own testid");
  ok(fishingSource.includes('data-testid="fishing-settlement-panel"'), "the e2e-asserted settlement panel must remain");
});
