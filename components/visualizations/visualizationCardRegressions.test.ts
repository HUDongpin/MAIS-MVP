import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/VisualizationCard.tsx", "utf8");
const providerSource = fs.readFileSync(
  "components/providers/AppProviders.tsx",
  "utf8",
);

test("visualization card earns exploration through dwell plus interaction", () => {
  assert.match(source, /const engagedDwellMs = \d+;/);
  assert.match(
    source,
    /setTimeout\(\s*\(\) => setDwellSatisfiedScopeKey\(stateScopeKey\),\s*engagedDwellMs\s*\)/,
  );
  assert.match(source, /data-viz-card-body/);
  assert.match(source, /onPointerDownCapture=\{handleBodyEngagement\}/);
  assert.match(source, /onKeyDownCapture=\{handleBodyEngagement\}/);
  // The recording effect must require every gate, not just a ready runtime.
  assert.match(source, /if \(!autoExplore \|\| !dwellSatisfied \|\| !interacted\) return;/);
  assert.match(source, /data-viz-explore-gate/);
});

test("visualization card resets the engagement gate per exact state scope", () => {
  assert.match(
    source,
    /setDwellSatisfiedScopeKey\(null\);\s*\n\s*setInteractionScopeKey\(null\);/,
  );
  assert.match(source, /\}, \[stateScopeKey\]\);/);
});

test("visualization card keeps the manual mark-explored button removed", () => {
  assert.doesNotMatch(source, /en: "Mark explored"/);
  assert.doesNotMatch(source, /data-viz-mark-explored-button/);
});

test("visualization card scopes exploration by user, module, and topic", () => {
  assert.match(
    source,
    /JSON\.stringify\(\[\s*currentUser\?\.id \?\? "guest",\s*explorationScopeKey \?\? "",\s*moduleId,\s*topicId,?\s*\]\)/,
  );
  assert.match(source, /\}, \[stateScopeKey\]\);/);
});

test("visualization card is a durable producer and AppProviders is the only session network owner", () => {
  assert.match(
    source,
    /const sessionRecord: VisualizationSessionOutboxRecord = \{\s*userId: currentUser\.id,\s*moduleId,\s*topicId,\s*source: analyticsSource,\s*queuedAt: Date\.now\(\),?\s*\};/,
  );
  assert.match(
    source,
    /queueVisualizationSessionOutbox\(window\.localStorage, sessionRecord\)/,
  );
  assert.match(
    source,
    /window\.dispatchEvent\(new Event\(visualizationSessionOutboxUpdatedEventName\)\)/,
  );
  assert.doesNotMatch(source, /fetch\("\/api\/visualization-sessions"/);
  assert.match(
    providerSource,
    /fetch\("\/api\/visualization-sessions", \{[\s\S]*?"X-MAIS-Visualization-User-Id": encodeURIComponent\(record\.userId\)[\s\S]*?keepalive: true/,
  );
});

test("visualization card changes save state only for an exact outbox acknowledgement", () => {
  assert.match(
    source,
    /isVisualizationSessionOutboxRecord\(record\)[\s\S]*?record\.userId === currentUser\.id[\s\S]*?record\.moduleId === moduleId[\s\S]*?record\.topicId === topicId/,
  );
  assert.match(
    source,
    /visualizationSessionOutboxAcknowledgedEventName[\s\S]*?setSaveState\("saved"\)/,
  );
  assert.match(
    source,
    /visualizationSessionOutboxFailedEventName[\s\S]*?setSaveState\("error"\)/,
  );
});
