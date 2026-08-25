import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const componentSource = readFileSync(join(process.cwd(), "components/gamification/ProgressRewardsDesignPreview.tsx"), "utf8");
const routeSource = readFileSync(join(process.cwd(), "app/design-preview/progress-rewards/page.tsx"), "utf8");

test("preview combines growth and rewards in one always-visible dashboard", () => {
  assert.match(componentSource, /Progress & Rewards/);
  assert.match(componentSource, /Today’s goals/);
  assert.match(componentSource, /Reward shop/);
  assert.match(componentSource, /Achievement shelf/);
  assert.match(componentSource, /XP builds your level/);
  assert.doesNotMatch(componentSource, /<details/);
  assert.doesNotMatch(componentSource, /Open motivation hub/);
  assert.doesNotMatch(componentSource, /Open reward shop/);
});

test("preview exposes zero, active, and teacher-review states without real API writes", () => {
  assert.match(componentSource, /New learner/);
  assert.match(componentSource, /Active learner/);
  assert.match(componentSource, /Reward pending/);
  assert.match(componentSource, /Preview only/);
  assert.match(componentSource, /No request will be sent from this preview/);
  assert.match(componentSource, /No real points were reserved/);
  assert.match(componentSource, /teacher approval/i);
  assert.doesNotMatch(componentSource, /fetch\s*\(/);
  assert.doesNotMatch(componentSource, /api\/rewards\/redeem/);
});

test("design preview route renders the unified component", () => {
  assert.match(routeSource, /ProgressRewardsDesignPreview/);
  assert.match(routeSource, /Progress & Rewards Design Preview/);
  assert.match(routeSource, /robots/);
  assert.match(routeSource, /NODE_ENV === "production"/);
  assert.match(routeSource, /notFound\(\)/);
});
