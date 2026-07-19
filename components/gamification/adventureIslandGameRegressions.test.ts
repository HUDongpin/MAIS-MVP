import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
import { test } from "node:test";

const gameSource = readFileSync(
  join(process.cwd(), "components/gamification/AdventureIslandGame.tsx"),
  "utf8"
);
const juiceHelperSource = readFileSync(
  join(process.cwd(), "components/gamification/phaserGameJuice.ts"),
  "utf8"
);

test("a defeated enemy plays the kill celebration instead of vanishing in one frame", () => {
  ok(
    !gameSource.includes("this.activeEnemy.disableBody(true, true)"),
    "the old instant-vanish kill must stay gone"
  );
  ok(gameSource.includes("this.playKillEffect(killedEnemy"), "kills must route through playKillEffect");
  ok(gameSource.includes("spawnKillBurst"), "kills need a particle burst");
  ok(gameSource.includes("playKillTumble"), "kills need the squash-and-tumble launch");
  ok(gameSource.includes("shakeCamera"), "kills need the camera punctuation");
});

test("the kill effect never delays the verifiable reward evidence", () => {
  const killBlock = gameSource.slice(
    gameSource.indexOf("if (killedEnemy) {"),
    gameSource.indexOf("} else if (kind === \"contact\")")
  );
  ok(killBlock.includes("defeatedEnemies: this.localStats.defeatedEnemies + 1"), "defeat count must update synchronously");
  ok(killBlock.includes("coins: this.localStats.coins + killCoinReward"), "coin count must update synchronously");
});

test("the hit-stop respects reduced motion and stays guarded against game-over", () => {
  ok(gameSource.includes("prefersReducedMotion()"), "reduced-motion players skip the freeze and tumble");
  ok(gameSource.includes("this.time.delayedCall(killHitStopMs"), "the kill resume must wait out the hit-stop");
  ok(gameSource.includes("fadeOutKill"), "reduced motion still gets a gentle kill acknowledgement");
});

test("combo momentum is tracked and exposed for tests", () => {
  ok(gameSource.includes("comboTierFor(this.comboCount)"), "kill text and sound must escalate with the combo");
  ok(gameSource.includes('root.dataset.combo = String(this.comboCount)'), "the combo must be observable via data-combo");
  ok(gameSource.includes('root.dataset.combo = "0"'), "misses must reset the combo");
  ok(gameSource.includes('root.dataset.killEffect = "active"'), "the kill effect lifecycle must be observable");
});

test("game sound is wired to every key moment with a persisted per-user toggle", () => {
  for (const soundCall of [
    'playGameSound("coin")',
    'playGameSound("pickup")',
    'playGameSound("throw")',
    'playGameSound("hurt")',
    'playGameSound("gameOver")',
    'playGameSound("fanfare")',
    "playGameSound(tier.soundKind)"
  ]) {
    ok(gameSource.includes(soundCall), `expected the game to fire ${soundCall}`);
  }
  ok(gameSource.includes('data-testid="adventure-island-sound-toggle"'), "players need a visible sound toggle");
  ok(gameSource.includes("aria-pressed={soundEnabled}"), "the toggle must expose its state");
  ok(gameSource.includes("gameSoundStorageKey(currentUser?.id)"), "the preference must persist per user");
});

test("M4: the completion submit carries lives evidence and surfaces bonus + relic", () => {
  ok(gameSource.includes("livesRemaining: nextStats.lives"), "the star bonus needs the lives evidence in the payload");
  ok(gameSource.includes("Three-star clear bonus"), "an applied star bonus must be celebrated in the ceremony");
  ok(gameSource.includes('data-testid="adventure-island-relic"'), "the cleared panel must show the topic relic");
});

test("the Phaser juice helpers never import phaser eagerly", () => {
  ok(
    !juiceHelperSource.includes('from "phaser"') && !juiceHelperSource.includes('import("phaser")'),
    "the games lazy-load Phaser with a timeout; helpers must only use the global namespace types"
  );
});
