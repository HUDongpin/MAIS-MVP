import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cardSource = fs.readFileSync(
  "components/visualizations/VisualizationCard.tsx",
  "utf8",
);
const providerSource = fs.readFileSync(
  "components/providers/AppProviders.tsx",
  "utf8",
);

// These tests pin source ordering and identity fences. They do not replace a
// browser test that exercises localStorage, lifecycle events, or real requests.

test("visualization card earns exploration through dwell plus interaction", () => {
  assert.match(cardSource, /const engagedDwellMs = \d+;/);
  assert.match(
    cardSource,
    /setTimeout\([\s\S]*?\(\) =>\s*setDwellSatisfiedScopeKey\(stateScopeKey\),\s*engagedDwellMs,?\s*\)/,
  );
  assert.match(cardSource, /data-viz-card-body/);
  assert.match(cardSource, /onPointerDownCapture=\{handleBodyEngagement\}/);
  assert.match(cardSource, /onKeyDownCapture=\{handleBodyEngagement\}/);
  // The recording effect must require every gate, not just a ready runtime.
  assert.match(
    cardSource,
    /if \(!autoExplore \|\| !dwellSatisfied \|\| !interacted\) return;/,
  );
  assert.match(cardSource, /data-viz-explore-gate/);
});

test("source contract: visualization state is scoped by exact user, module, topic, and source identity", () => {
  const scopeStart = cardSource.indexOf("const stateScopeKey = useMemo(");
  const scopeEnd = cardSource.indexOf(
    "const previousStateScopeKey",
    scopeStart,
  );
  const scopeSource = cardSource.slice(scopeStart, scopeEnd);

  assert.notEqual(scopeStart, -1);
  assert.notEqual(scopeEnd, -1);
  assert.match(
    scopeSource,
    /JSON\.stringify\(\[\s*currentUser\?\.id \?\? "guest",\s*explorationScopeKey \?\? "",\s*moduleId,\s*topicId,\s*analyticsSource,?\s*\]\)/,
  );
  assert.match(
    scopeSource,
    /\[analyticsSource, currentUser\?\.id, explorationScopeKey, moduleId, topicId\]/,
  );

  const resetStart = cardSource.indexOf("setDwellSatisfiedScopeKey(null);");
  const resetEnd = cardSource.indexOf("\n\n  useEffect(() => {", resetStart);
  const resetSource = cardSource.slice(resetStart, resetEnd);
  assert.match(
    resetSource,
    /setDwellSatisfiedScopeKey\(null\);\s*setInteractionScopeKey\(null\);\s*autoExploredScopeRef\.current = null;\s*completionRecordedScopeRef\.current = null;\s*\}, \[stateScopeKey\]\);/,
  );
  assert.match(
    cardSource,
    /const dwellSatisfied = dwellSatisfiedScopeKey === stateScopeKey;\s*const interacted = interactionScopeKey === stateScopeKey;/,
  );
  assert.match(
    cardSource,
    /if \(autoExploredScopeRef\.current === stateScopeKey\) return;\s*autoExploredScopeRef\.current = stateScopeKey;/,
  );
});

test("visualization card keeps the manual mark-explored button removed", () => {
  assert.doesNotMatch(cardSource, /en: "Mark explored"/);
  assert.doesNotMatch(cardSource, /data-viz-mark-explored-button/);
});

test("learner card uses a solid auditable panel without backdrop blur", () => {
  assert.match(
    cardSource,
    /className="soft-panel overflow-hidden bg-white p-4 dark:bg-slate-950 sm:p-6"/,
  );
  assert.doesNotMatch(
    cardSource,
    /className="glass-panel overflow-hidden p-4 sm:p-6"/,
  );
});

test("source contract: non-students complete observationally before session queueing", () => {
  const authenticatedGuardStart = cardSource.indexOf(
    'if (!currentUser || typeof window === "undefined") return;',
  );
  const roleBranchStart = cardSource.indexOf(
    'if (currentUser.role !== "student") {',
    authenticatedGuardStart,
  );
  const sessionRecordStart = cardSource.indexOf(
    "const sessionRecord: VisualizationSessionOutboxRecord",
    authenticatedGuardStart,
  );

  assert.ok(
    authenticatedGuardStart !== -1 &&
      authenticatedGuardStart < roleBranchStart &&
      roleBranchStart < sessionRecordStart,
    "The non-student branch must return before constructing or queueing a session record.",
  );
  const roleBranchSource = cardSource.slice(roleBranchStart, sessionRecordStart);
  assert.match(
    roleBranchSource,
    /notifyExplored\(\);\s*if \(activeStateScopeKeyRef\.current === requestScopeKey\)\s*setSaveState\("saved"\);\s*return;/,
  );
  assert.doesNotMatch(
    roleBranchSource,
    /queueVisualizationSessionOutbox|recordCompletionOnce|recordLearningEvent/,
  );
});

test("source contract: card durably queues while AppProviders is the only session network owner", () => {
  const sessionRecordStart = cardSource.indexOf(
    "const sessionRecord: VisualizationSessionOutboxRecord",
  );
  const queueStart = cardSource.indexOf(
    "queueVisualizationSessionOutbox(window.localStorage, sessionRecord)",
    sessionRecordStart,
  );
  const completionStart = cardSource.indexOf(
    "recordCompletionOnce();",
    queueStart,
  );
  const updateStart = cardSource.indexOf(
    "window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));",
    completionStart,
  );

  assert.notEqual(
    sessionRecordStart,
    -1,
    "Card should create a durable record with exact request identity.",
  );
  assert.ok(
    sessionRecordStart < queueStart &&
      queueStart < completionStart &&
      completionStart < updateStart,
    "Durable queueing and completion marking must precede the central-worker update signal.",
  );

  const sessionRecordSource = cardSource.slice(sessionRecordStart, queueStart);
  assert.match(
    sessionRecordSource,
    /userId: currentUser\.id,\s*moduleId,\s*topicId,\s*source: analyticsSource,\s*queuedAt: Date\.now\(\)/,
  );
  assert.doesNotMatch(cardSource, /fetch\("\/api\/visualization-sessions"/);
  assert.doesNotMatch(cardSource, /acknowledgeVisualizationSessionOutbox/);

  const providerPost = providerSource.indexOf(
    'fetch("/api/visualization-sessions", {',
  );
  assert.notEqual(
    providerPost,
    -1,
    "AppProviders must own visualization-session delivery.",
  );
  assert.match(
    providerSource.slice(providerPost, providerPost + 900),
    /keepalive: true/,
  );
});

test("source contract: failure keeps the durable session, releases its active scope, and uses bounded central retry", () => {
  const queueStart = cardSource.indexOf(
    "queueVisualizationSessionOutbox(window.localStorage, sessionRecord)",
  );
  const catchStart = cardSource.indexOf("    } catch {", queueStart);
  const catchEnd = cardSource.indexOf(
    "window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));",
    catchStart,
  );
  const catchSource = cardSource.slice(catchStart, catchEnd);

  assert.notEqual(catchStart, -1);
  assert.match(
    catchSource,
    /if \(activeStateScopeKeyRef\.current !== requestScopeKey\) return;\s*if \(autoExploredScopeRef\.current === requestScopeKey\) \{\s*autoExploredScopeRef\.current = null;\s*\}\s*setSaveState\("error"\);/,
  );
  assert.doesNotMatch(
    catchSource,
    /acknowledgeVisualizationSessionOutbox|removeItem/,
  );
  assert.match(
    cardSource,
    /const handleBodyEngagement = useCallback\(\(\) => \{\s*setInteractionScopeKey\(stateScopeKey\);\s*setSaveState\(\(current\) => \(?current === "error" \? "idle" : current\)?\);[\s\S]*?\}, \[stateScopeKey\]\);/,
  );

  const retryEffectStart = providerSource.indexOf(
    "const flushUserId = currentUser.id;",
  );
  const retryEffectEnd = providerSource.indexOf(
    "}, [currentUser?.id, currentUser?.role, settingsReady]);",
    retryEffectStart,
  );
  const retrySource = providerSource.slice(retryEffectStart, retryEffectEnd);
  assert.notEqual(
    retryEffectStart,
    -1,
    "AppProviders should own central visualization-session retries.",
  );
  assert.notEqual(
    retryEffectEnd,
    -1,
    "The central retry effect must remain user-identity scoped.",
  );
  assert.match(
    retrySource,
    /readVisualizationSessionOutbox\(window\.localStorage, flushUserId\)/,
  );

  const providerPost = retrySource.indexOf(
    'fetch("/api/visualization-sessions", {',
  );
  const providerValidation = retrySource.indexOf(
    "if (!isVisualizationSessionOutboxAcknowledgement(response.status, payload, record))",
    providerPost,
  );
  const providerAcknowledge = retrySource.indexOf(
    "acknowledgeVisualizationSessionOutbox(",
    providerValidation,
  );
  const providerCatch = retrySource.indexOf(
    "        } catch {",
    providerAcknowledge,
  );
  const providerCatchEnd = retrySource.indexOf(
    "\n        }\n      }\n\n      inFlight = false;",
    providerCatch,
  );
  assert.ok(
    providerPost !== -1 &&
      providerPost < providerValidation &&
      providerValidation < providerAcknowledge &&
      providerAcknowledge < providerCatch &&
      providerCatch < providerCatchEnd,
    "Central retry must validate the exact response before ACK and retain the record on failure.",
  );
  assert.match(
    retrySource.slice(providerPost, providerValidation),
    /"X-MAIS-Visualization-User-Id": encodeURIComponent\(record\.userId\)[\s\S]*body: JSON\.stringify\(\{\s*moduleId: record\.moduleId,\s*topicId: record\.topicId,\s*source: record\.source\s*\}\)/,
  );
  const providerCatchSource = retrySource.slice(
    providerCatch,
    providerCatchEnd,
  );
  assert.match(
    providerCatchSource,
    /failed = true;\s*dispatchSessionResult\(visualizationSessionOutboxFailedEventName, record\);\s*break;/,
  );
  assert.doesNotMatch(
    providerCatchSource,
    /acknowledgeVisualizationSessionOutbox|removeItem/,
  );
  assert.match(
    retrySource,
    /retryAttempt \+= 1;\s*if \(retryAttempt <= 5\) \{\s*scheduleFlush\(Math\.min\(8_000, 1_000 \* \(2 \*\* \(retryAttempt - 1\)\)\)\);\s*\}/,
  );
  assert.match(retrySource, /document\.visibilityState === "hidden"/);
  assert.match(retrySource, /navigator\.onLine === false/);
  assert.match(
    retrySource,
    /window\.addEventListener\(visualizationSessionOutboxUpdatedEventName, handleOutboxUpdate\)/,
  );
  assert.match(
    retrySource,
    /window\.addEventListener\("online", handleOnlineOrVisible\)/,
  );
  assert.match(
    retrySource,
    /document\.addEventListener\("visibilitychange", handleOnlineOrVisible\)/,
  );
});

test("source contract: stale user-A session results cannot update active user-B state", () => {
  assert.match(
    cardSource,
    /return\s*\(\s*isVisualizationSessionOutboxRecord\(record\) &&\s*record\.userId === currentUser\.id &&\s*record\.moduleId === moduleId &&\s*record\.topicId === topicId &&\s*record\.source === analyticsSource\s*\);/,
  );

  const retryEffectStart = providerSource.indexOf(
    "const flushUserId = currentUser.id;",
  );
  const providerValidation = providerSource.indexOf(
    "if (!isVisualizationSessionOutboxAcknowledgement(response.status, payload, record))",
    retryEffectStart,
  );
  const identityFenceBeforeValidation = providerSource.lastIndexOf(
    "if (!sessionDeliveryIsCurrent()) break;",
    providerValidation,
  );
  const identityFenceBeforeAcknowledge = providerSource.indexOf(
    "if (!sessionDeliveryIsCurrent()) break;",
    providerValidation,
  );
  const providerAcknowledge = providerSource.indexOf(
    "acknowledgeVisualizationSessionOutbox(",
    identityFenceBeforeAcknowledge,
  );
  assert.ok(
    providerValidation !== -1 &&
      identityFenceBeforeValidation < providerValidation &&
      providerValidation < identityFenceBeforeAcknowledge &&
      identityFenceBeforeAcknowledge < providerAcknowledge,
    "A provider effect replaced by user B must revalidate exact user/generation identity before interpreting and acknowledging user A's response.",
  );
  const providerCleanupStart = providerSource.indexOf(
    "    return () => {",
    providerAcknowledge,
  );
  const providerCleanupEnd = providerSource.indexOf(
    "  }, [currentUser?.id, currentUser?.role, settingsReady]);",
    providerAcknowledge,
  );
  assert.ok(
    providerAcknowledge < providerCleanupStart &&
      providerCleanupStart < providerCleanupEnd,
  );
  const providerCleanup = providerSource.slice(
    providerCleanupStart,
    providerCleanupEnd,
  );
  assert.match(providerCleanup, /cancelled = true;/);
  assert.doesNotMatch(providerCleanup, /requestController|\.abort\(\)/);
  assert.match(
    providerSource.slice(providerValidation, providerAcknowledge),
    /if \(!sessionDeliveryIsCurrent\(\)\) break;/,
    "An unmounted old-owner effect must ignore its response without aborting the keepalive request.",
  );
});

test("source contract: completion telemetry is once-only per exact identity and follows durable queueing", () => {
  assert.match(
    cardSource,
    /beginVisualizationCompletionTelemetryOnce\(\s*window\.localStorage,\s*currentUser\.id,\s*moduleId,\s*topicId,\s*window\.crypto\.randomUUID\(\),?\s*\)/,
  );

  const completionDefinition = cardSource.indexOf(
    "const recordCompletionOnce = () => {",
  );
  const guestBranch = cardSource.indexOf(
    'if (!currentUser && typeof window !== "undefined")',
    completionDefinition,
  );
  const completionSource = cardSource.slice(completionDefinition, guestBranch);
  assert.match(
    completionSource,
    /if \(completionRecordedScopeRef\.current === requestScopeKey\) return;/,
  );
  assert.match(
    completionSource,
    /if \(completion\.status === "complete"\) \{\s*completionRecordedScopeRef\.current = requestScopeKey;\s*return;\s*\}/,
  );
  assert.match(
    completionSource,
    /eventId: completion\.marker\.eventId,\s*eventTimestamp: completion\.marker\.eventTimestamp,?/,
  );
  assert.match(
    completionSource,
    /if \(persistence === "confirmed" \|\| persistence === "unconfirmed"\) \{\s*completeVisualizationCompletionTelemetryOnce\(\s*window\.localStorage,\s*completion\.marker,?\s*\);\s*\}/,
  );
  assert.doesNotMatch(completionSource, /localStorage\.setItem\([^)]*"1"/);

  const queueStart = cardSource.indexOf(
    "queueVisualizationSessionOutbox(window.localStorage, sessionRecord)",
  );
  const authenticatedCompletion = cardSource.indexOf(
    "recordCompletionOnce();",
    queueStart,
  );
  const updateStart = cardSource.indexOf(
    "window.dispatchEvent(new Event(visualizationSessionOutboxUpdatedEventName));",
    authenticatedCompletion,
  );
  assert.ok(
    queueStart < authenticatedCompletion &&
      authenticatedCompletion < updateStart,
    "Authenticated completion telemetry must only be emitted after its session is durably queued.",
  );
});

test("source contract: guest storage and host callbacks cannot strand durable exploration", () => {
  const notifyStart = cardSource.indexOf(
    "const notifyExplored = useCallback(() => {",
  );
  const notifyEnd = cardSource.indexOf("\n\n  useEffect(() => {", notifyStart);
  const notifySource = cardSource.slice(notifyStart, notifyEnd);
  assert.match(
    notifySource,
    /try \{\s*onExplored\?\.\(moduleId\);\s*\} catch \{[\s\S]*?\}/,
  );

  const guestStart = cardSource.indexOf(
    'if (!currentUser && typeof window !== "undefined")',
    cardSource.indexOf("const recordExplored = useCallback"),
  );
  const guestEnd = cardSource.indexOf(
    'if (!currentUser || typeof window === "undefined") return;',
    guestStart,
  );
  const guestSource = cardSource.slice(guestStart, guestEnd);
  assert.match(
    guestSource,
    /localStorage\.setItem\(localExploredStorageKey, "1"\)[\s\S]*?catch \{\s*if \(activeStateScopeKeyRef\.current === requestScopeKey\) \{\s*autoExploredScopeRef\.current = null;\s*setSaveState\("error"\);/,
  );
  assert.match(
    guestSource,
    /try \{\s*recordCompletionOnce\(\);\s*\} catch \{[\s\S]*?\}\s*notifyExplored\(\);/,
  );
});
