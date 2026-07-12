import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const adventureIslandSource = readFileSync(join(process.cwd(), "components/gamification/AdventureIslandGame.tsx"), "utf8");

test("Adventure Island recovers Practice Arena round payload from durable per-user storage", () => {
  assert.match(adventureIslandSource, /completedPracticeRoundStorageKey/);
  assert.match(adventureIslandSource, /const sessionPayload = readAdventureRoundPayload\(window\.sessionStorage\.getItem\(adventureRoundStorageKey\)\)/);
  assert.match(
    adventureIslandSource,
    /const localPayload = sessionPayload \? null : readAdventureRoundPayload\(window\.localStorage\.getItem\(completedPracticeRoundStorageKey\(currentUser\?\.id\)\)\)/
  );
  assert.match(adventureIslandSource, /if \(!sessionPayload && localPayload\) \{/);
  assert.match(adventureIslandSource, /window\.sessionStorage\.setItem\(adventureRoundStorageKey, JSON\.stringify\(localPayload\)\)/);
});

test("Adventure Island uses stored Practice Arena round questions before the slow topic question fetch", () => {
  assert.match(adventureIslandSource, /function readAdventureRoundQuestions\(payload: AdventureRoundPayload \| null\)/);
  assert.match(adventureIslandSource, /const payloadQuestions = readAdventureRoundQuestions\(nextPayload\)/);
  assert.match(
    adventureIslandSource,
    /const nextQuestions = payloadQuestions\.length >= trophyRequiredDefeats\s*\? payloadQuestions\s*:\s*readQuestions/
  );
});

test("Adventure Island renderer failures do not demote a verified unlock back to locked", () => {
  assert.doesNotMatch(adventureIslandSource, /setLoadErrorCode\("phaser-timeout"\)[\s\S]{0,260}setGamePhase\("locked"\)/);
  assert.doesNotMatch(adventureIslandSource, /setLoadErrorCode\("phaser-runtime"\)[\s\S]{0,260}setGamePhase\("locked"\)/);
});
