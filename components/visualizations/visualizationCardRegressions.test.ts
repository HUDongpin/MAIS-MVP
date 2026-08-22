import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/VisualizationCard.tsx", "utf8");
const providerSource = fs.readFileSync("components/providers/AppProviders.tsx", "utf8");

test("visualization card earns exploration through dwell plus interaction", () => {
  assert.match(source, /const engagedDwellMs = \d+;/);
  assert.match(
    source,
    /setTimeout\(\s*\(\) => setDwellSatisfiedScopeKey\(stateScopeKey\),\s*engagedDwellMs\s*\)/
  );
  assert.match(source, /data-viz-card-body/);
  assert.match(source, /onPointerDownCapture=\{handleBodyEngagement\}/);
  assert.match(source, /onKeyDownCapture=\{handleBodyEngagement\}/);
  // The recording effect must require every gate, not just a ready runtime.
  assert.match(source, /if \(!autoExplore \|\| !dwellSatisfied \|\| !interacted\) return;/);
  assert.match(source, /data-viz-explore-gate/);
});

test("visualization card resets the engagement gate per exact session scope", () => {
  assert.match(source, /setDwellSatisfiedScopeKey\(null\);\s*\n\s*setInteractionScopeKey\(null\);/);
  assert.match(source, /\}, \[stateScopeKey\]\);/);
});

test("visualization card keeps the manual mark-explored button removed", () => {
  assert.doesNotMatch(source, /en: "Mark explored"/);
  assert.doesNotMatch(source, /data-viz-mark-explored-button/);
});

test("visualization card persists an earned session through the central durable outbox", () => {
  const recordStart = source.indexOf("const sessionRecord: VisualizationSessionOutboxRecord");
  const queueStart = source.indexOf(
    "queueVisualizationSessionOutbox(window.localStorage, sessionRecord)",
    recordStart
  );
  const wakeStart = source.indexOf(
    "window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName))",
    queueStart
  );

  assert.notEqual(recordStart, -1, "the Card must build one exact durable session record");
  assert.ok(
    recordStart < queueStart && queueStart < wakeStart,
    "the Card must durably queue before waking the central provider"
  );
  assert.match(
    source.slice(recordStart, queueStart),
    /userId: currentUser\.id,\s*moduleId,\s*topicId,\s*source: analyticsSource,\s*queuedAt: Date\.now\(\)/
  );
  assert.doesNotMatch(source, /fetch\("\/api\/visualization-sessions"/);

  assert.match(
    providerSource,
    /window\.addEventListener\(visualizationSessionOutboxUpdatedEventName, handleOutboxUpdate\)/
  );
  assert.match(
    providerSource,
    /fetch\("\/api\/visualization-sessions", \{[\s\S]*?keepalive: true/
  );
});

test("visualization card accepts provider results only for its exact session identity", () => {
  assert.match(
    source,
    /isVisualizationSessionOutboxRecord\(record\) &&\s*record\.userId === currentUser\.id &&\s*record\.moduleId === moduleId &&\s*record\.topicId === topicId &&\s*record\.source === analyticsSource/
  );
  assert.match(
    source,
    /window\.addEventListener\(\s*visualizationSessionOutboxAcknowledgedEventName,\s*handleAcknowledged\s*\)/
  );
  assert.match(
    source,
    /window\.addEventListener\(\s*visualizationSessionOutboxFailedEventName,\s*handleFailed\s*\)/
  );
  assert.match(
    source,
    /const handleAcknowledged = \(event: Event\) => \{\s*if \(!matchesCurrentScope\(event\)\) return;[\s\S]*?notifyExplored\(\);[\s\S]*?setSaveState\("saved"\);\s*\}/
  );
  const failedHandlerStart = source.indexOf("const handleFailed = (event: Event) => {");
  const failedHandlerEnd = source.indexOf("\n\n    window.addEventListener(", failedHandlerStart);
  const failedHandlerSource = source.slice(failedHandlerStart, failedHandlerEnd);
  assert.match(failedHandlerSource, /!matchesCurrentScope\(event\)/);
  assert.match(
    failedHandlerSource,
    /activeStateScopeKeyRef\.current !== stateScopeKey/
  );
  assert.match(
    failedHandlerSource,
    /autoExploredScopeRef\.current = null;\s*setSaveState\("error"\);/
  );

  const providerPost = providerSource.indexOf('fetch("/api/visualization-sessions", {');
  const providerValidation = providerSource.indexOf(
    "if (!isVisualizationSessionOutboxAcknowledgement(response.status, payload, record))",
    providerPost
  );
  const providerAcknowledge = providerSource.indexOf(
    "acknowledgeVisualizationSessionOutbox(",
    providerValidation
  );
  const providerFailure = providerSource.indexOf(
    "dispatchSessionResult(visualizationSessionOutboxFailedEventName, record)",
    providerAcknowledge
  );
  assert.ok(
    providerPost < providerValidation &&
      providerValidation < providerAcknowledge &&
      providerAcknowledge < providerFailure,
    "the existing provider must validate the exact durable ACK before deletion and retain failures"
  );
});

test("visualization completion telemetry is once-only and follows durable session queueing", () => {
  assert.match(
    source,
    /beginVisualizationCompletionTelemetryOnce\(\s*window\.localStorage,\s*currentUser\.id,\s*moduleId,\s*topicId,\s*window\.crypto\.randomUUID\(\)\s*\)/
  );
  assert.match(
    source,
    /if \(completionRecordedScopeRef\.current === requestScopeKey\) return;/
  );
  assert.match(
    source,
    /eventId: completion\.marker\.eventId,\s*eventTimestamp: completion\.marker\.eventTimestamp/
  );
  assert.match(
    source,
    /if \(persistence === "confirmed" \|\| persistence === "unconfirmed"\) \{\s*completeVisualizationCompletionTelemetryOnce\(\s*window\.localStorage,\s*completion\.marker\s*\);\s*\}/
  );

  const queueStart = source.indexOf(
    "queueVisualizationSessionOutbox(window.localStorage, sessionRecord)"
  );
  const completionStart = source.indexOf("recordCompletionOnce();", queueStart);
  const wakeStart = source.indexOf(
    "window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName))",
    completionStart
  );
  assert.ok(
    queueStart < completionStart && completionStart < wakeStart,
    "authenticated telemetry must follow durable queueing and precede delivery wakeup"
  );
});

test("visualization engagement state is fenced by exact user, module, topic, and source identity", () => {
  const scopeStart = source.indexOf("const stateScopeKey = useMemo(");
  const scopeEnd = source.indexOf("const previousStateScopeKey", scopeStart);
  const scopeSource = source.slice(scopeStart, scopeEnd);

  assert.notEqual(scopeStart, -1);
  assert.notEqual(scopeEnd, -1);
  assert.match(
    scopeSource,
    /JSON\.stringify\(\[\s*currentUser\?\.id \?\? "guest",\s*explorationScopeKey \?\? "",\s*moduleId,\s*topicId,\s*analyticsSource\s*\]\)/
  );
  assert.match(
    scopeSource,
    /\[analyticsSource, currentUser\?\.id, explorationScopeKey, moduleId, topicId\]/
  );
  assert.match(
    source,
    /const dwellSatisfied = dwellSatisfiedScopeKey === stateScopeKey;\s*const interacted = interactionScopeKey === stateScopeKey;/
  );
  assert.match(
    source,
    /setDwellSatisfiedScopeKey\(null\);\s*setInteractionScopeKey\(null\);\s*autoExploredScopeRef\.current = null;\s*completionRecordedScopeRef\.current = null;\s*\}, \[stateScopeKey\]\);/
  );
});

test("visualization persistence failures remain retryable without host callback interference", () => {
  assert.match(
    source,
    /const notifyExplored = useCallback\(\(\) => \{\s*try \{\s*onExplored\?\.\(moduleId\);\s*\} catch \{[\s\S]*?\}\s*\}, \[moduleId, onExplored\]\);/
  );

  const guestStart = source.indexOf(
    'if (!currentUser && typeof window !== "undefined")',
    source.indexOf("const recordExplored = useCallback")
  );
  const guestEnd = source.indexOf(
    'if (!currentUser || typeof window === "undefined") return;',
    guestStart
  );
  const guestSource = source.slice(guestStart, guestEnd);
  assert.match(
    guestSource,
    /try \{\s*window\.localStorage\.setItem\(localExploredStorageKey, "1"\);\s*\} catch \{\s*if \(activeStateScopeKeyRef\.current === requestScopeKey\) \{\s*autoExploredScopeRef\.current = null;\s*setSaveState\("error"\);/
  );
  assert.match(
    source,
    /setSaveState\(\(current\) => current === "error" \? "idle" : current\);/
  );
});

test("mount and focus cannot create a visualization session", () => {
  const queueCalls = source.match(/queueVisualizationSessionOutbox\(/g) ?? [];
  const recorderStart = source.indexOf("const recordExplored = useCallback");
  const recorderEnd = source.indexOf("\n\n  useEffect(() => {", recorderStart);
  const queueStart = source.indexOf("queueVisualizationSessionOutbox(");

  assert.equal(queueCalls.length, 1);
  assert.ok(recorderStart < queueStart && queueStart < recorderEnd);
  assert.doesNotMatch(source, /onFocus(?:Capture)?=|addEventListener\("focus"/);
  assert.match(source, /if \(!autoExplore \|\| !dwellSatisfied \|\| !interacted\) return;/);
});
