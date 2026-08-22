import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CALIFORNIA_LEARNER_INTERACTIVE_SELECTOR,
  CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX,
  CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR,
  isCaliforniaTouchTargetBelowMinimum
} from "./california-visualization-qa-helpers";

const helperPath = "tests/e2e/california-visualization-qa-helpers.ts";
const canaryPath = "tests/e2e/california-visualization-ui-audit.test.ts";
const exhaustivePath = "tests/e2e/california-signature-exhaustive-qa.ts";
const exhaustiveSpecPath = "tests/e2e/california-signature-exhaustive.spec.ts";
const broadSpecPath = "tests/e2e/california-visualization-labs.spec.ts";
const helperSource = fs.readFileSync(helperPath, "utf8");
const canarySource = fs.readFileSync(canaryPath, "utf8");
const exhaustiveSource = fs.readFileSync(exhaustivePath, "utf8");
const exhaustiveSpecSource = fs.readFileSync(exhaustiveSpecPath, "utf8");
const broadSpecSource = fs.readFileSync(broadSpecPath, "utf8");

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing source boundary: ${start}`);
  assert.ok(endIndex > startIndex, `missing source boundary: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertCanaryLabels(labels: readonly string[]) {
  for (const label of labels) {
    assert.match(canarySource, new RegExp(`aria-label=["']${label}["']`), label);
  }
}

function formalProtocolOwnerIssues(source: string, label: string) {
  const issues: string[] = [];
  if (!/test\s+as\s+base/.test(source)) {
    issues.push(`${label}: must alias the Playwright base test instead of importing direct built-in test`);
  }
  if (!/const\s+test\s*=\s*base\.extend/.test(source)) {
    issues.push(`${label}: must create an extended formal test fixture`);
  }
  if (!/californiaVisualizationUiAuditProtocolOwner/.test(source)) {
    issues.push(`${label}: missing the named automatic protocol-owner fixture`);
  }
  if (!/californiaVisualizationUiAuditProtocolOwner\s*:\s*\[\s*async\s*\(\s*\{\s*context\s*\}/.test(source)) {
    issues.push(`${label}: protocol-owner fixture must depend on BrowserContext, not Page`);
  }
  if (!/installCaliforniaVisualizationUiAuditProtocolEpoch\(context\)/.test(source)) {
    issues.push(`${label}: BrowserContext protocol owner is not installed`);
  }
  if (!/expect\(\s*installCaliforniaVisualizationUiAuditProtocolEpoch\(context\)[\s\S]{0,240}?\.toBe\(true\)/.test(source)) {
    issues.push(`${label}: fixture must fail closed unless installation preceded Page creation`);
  }
  if (!/\{\s*auto\s*:\s*true\s*\}\s*\]/.test(source)) {
    issues.push(`${label}: protocol-owner fixture must be automatic`);
  }
  const fixtureIndex = source.indexOf("base.extend");
  const firstDeclarationIndex = [source.indexOf("test.describe"), source.indexOf("for (const workPackage")]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
  if (fixtureIndex < 0 || firstDeclarationIndex < 0 || fixtureIndex > firstDeclarationIndex) {
    issues.push(`${label}: automatic protocol owner must be declared before formal tests`);
  }
  return issues;
}

test("California learner touch targets use one exact 44px desktop and mobile minimum", () => {
  assert.equal(CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX, 44);
  for (const measurement of [
    { height: 38, width: 136 },
    { height: 38, width: 120 },
    { height: 38, width: 91 },
    { height: 16, width: 160 },
    { height: 160, width: 38 },
    { height: 44, width: Number.NaN },
    { height: 44, width: 43.99 },
    { height: 43.99, width: 44 }
  ]) {
    assert.equal(isCaliforniaTouchTargetBelowMinimum(measurement), true);
  }
  assert.equal(isCaliforniaTouchTargetBelowMinimum({ height: 44, width: 44 }), false);

  for (const selector of [
    "button",
    "a[href]",
    'input:not([type="hidden" i])',
    "select",
    "textarea",
    "summary",
    "audio[controls]",
    "video[controls]",
    '[contenteditable]:not([contenteditable="false" i])'
  ]) {
    assert.ok(CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR.includes(selector), selector);
  }
  for (const role of [
    "button",
    "checkbox",
    "combobox",
    "gridcell",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "scrollbar",
    "searchbox",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "textbox",
    "treeitem"
  ]) {
    assert.ok(CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR.includes(`[role~="${role}" i]`), role);
  }
  assert.ok(CALIFORNIA_LEARNER_INTERACTIVE_SELECTOR.includes("[tabindex]"));
  assert.doesNotMatch(helperSource, /options\.viewport === "mobile" \? 44/);
  assert.doesNotMatch(helperSource, /touchTargetProbeOffsets|CALIFORNIA_TOUCH_TARGET_PROBE_OFFSETS/);
});

test("early audit initialization retains shadow roots and exact live listener identity", () => {
  const initSource = sourceBetween(
    helperSource,
    "export async function installCaliforniaVisualizationUiAuditInit",
    "export async function collectVisualizationUiFindings"
  );
  assert.match(initSource, /String\.raw`\(\(\) => \{/);
  assert.match(initSource, /page\.addInitScript\(\{ content: installSource \}\)/);
  assert.match(initSource, /page\.evaluate\(installSource\)/);
  assert.match(helperSource, /export function installCaliforniaVisualizationUiAuditProtocolEpoch/);
  assert.ok(
    initSource.indexOf("installCaliforniaVisualizationUiAuditProtocolEpoch(page.context())") <
      initSource.indexOf("page.addInitScript"),
    "the protocol owner must install before the per-Page DOM observation payload"
  );
  const canaryPageFactory = sourceBetween(
    canarySource,
    "async function createCaliforniaVisualizationUiAuditPage",
    "async function setViewportEnvironmentFixture"
  );
  assert.ok(
    canaryPageFactory.indexOf("installCaliforniaVisualizationUiAuditProtocolEpoch(context)") <
      canaryPageFactory.indexOf("context.newPage()"),
    "formal UI audit fixtures must install the BrowserContext protocol owner before Page creation"
  );
  assert.match(canaryPageFactory, /install before the BrowserContext creates a Page/);
  assert.match(helperSource, /californiaVisualizationUiAuditInitPages = new WeakSet<Page>/);
  assert.match(initSource, /Element\.prototype\.attachShadow/);
  assert.match(initSource, /registry\.shadowRoots\.set\(this, root\)/);
  assert.match(initSource, /registry\.shadowModes\.set\(this, init\.mode\)/);
  assert.match(initSource, /EventTarget\.prototype\.addEventListener/);
  assert.match(initSource, /EventTarget\.prototype\.removeEventListener/);
  assert.match(initSource, /capture \? "capture" : "bubble"/);
  assert.match(initSource, /listeners\.add\(callback\)/);
  assert.match(initSource, /listeners\.delete\(callback\)/);
  assert.match(initSource, /listenersByKey\.delete\(key\)/);
  assert.match(initSource, /registry\.directPointerListeners\.delete\(this\)/);

  assert.match(helperSource, /const retainedShadowRoot = \(target: Element\)/);
  assert.match(helperSource, /target\.shadowRoot \?\? auditRegistry\?\.shadowRoots\.get\(target\)/);
  assert.match(helperSource, /shadow\?\.elementFromPoint\(x, y\)/);
  assert.match(helperSource, /const composedParentElement = \(target: Element\)/);
  assert.match(helperSource, /root instanceof ShadowRoot \? root\.host : null/);
  assert.match(helperSource, /shadow-observation-unavailable:/);
  assert.match(helperSource, /early-registry-required/);
  assert.match(exhaustiveSource, /installCaliforniaVisualizationUiAuditInit,/);
  const exhaustivePrepare = sourceBetween(
    exhaustiveSource,
    "export async function prepareCaliforniaSignatureExhaustivePage",
    "export async function registerCaliforniaSignatureAxisStudent"
  );
  assert.ok(
    exhaustivePrepare.indexOf("await installCaliforniaVisualizationUiAuditInit(page)") <
      exhaustivePrepare.indexOf("await page.addInitScript"),
    "the shadow/event audit must install before any exhaustive-page application script"
  );
  assert.match(broadSpecSource, /installCaliforniaVisualizationUiAuditInit,/);
  const broadDescribe = sourceBetween(
    broadSpecSource,
    'test.describe("California Visualization Labs durable QA"',
    'test("viewport-segment contrast and explored-state settle contract canary"'
  );
  assert.match(
    broadDescribe,
    /test\.beforeEach\(async \(\{ page \}\) => \{[\s\S]*await installCaliforniaVisualizationUiAuditInit\(page\)/
  );

  assertCanaryLabels([
    "post-open-shadow-small",
    "post-closed-shadow-positive",
    "post-closed-shadow-small",
    "post-nested-closed-shadow-small",
    "post-navigation-early-closed-small",
    "post-unobserved-closed-host"
  ]);
  for (const phrase of [
    "SHADOW ALPHA",
    "SHADOW BRAVO",
    "early-registry-required",
    "post-removed-listener-owner",
    "add then exact removeEventListener"
  ]) {
    assert.match(canarySource, new RegExp(phrase));
  }
});

test("formal California browser specs install the protocol owner before built-in Page creation", () => {
  assert.deepEqual([
    ...formalProtocolOwnerIssues(broadSpecSource, broadSpecPath),
    ...formalProtocolOwnerIssues(exhaustiveSpecSource, exhaustiveSpecPath)
  ], [], "direct built-in {page} fixture use is not formal protocol-epoch closure");
});

test("semantic inventory reports invisible, zero-box, CSS-overridden, iframe, and native-label states", () => {
  const inventorySource = sourceBetween(
    helperSource,
    "const enabled = (target: Element)",
    "for (const equivalentRoot"
  );
  assert.match(inventorySource, /target\.matches\(":disabled"\)/);
  assert.match(inventorySource, /closestComposed\(target, "\[inert\]"\)/);
  assert.doesNotMatch(inventorySource, /aria-disabled/);
  assert.match(inventorySource, /target\.matches\(controlSelector\)/);
  assert.match(inventorySource, /"tabIndex" in target/);
  assert.match(inventorySource, /touch-target-invisible-focusable:/);
  assert.match(inventorySource, /keyboard-focus-trap/);
  assert.match(inventorySource, /zero-principal-box/);
  assert.match(inventorySource, /display-contents/);
  assert.match(inventorySource, /const controls = inventoriedControls\.filter/);
  assert.doesNotMatch(inventorySource, /html\.hidden/);

  const labelSource = sourceBetween(
    helperSource,
    "const interactiveHitTargetsFor = (control: HTMLElement)",
    "const legacyClipEliminatesPaint"
  );
  assert.match(labelSource, /labelableControl\.labels/);
  assert.match(labelSource, /label\.control === control/);
  assert.match(labelSource, /composedContains\(rootElement, label\)/);
  assert.match(labelSource, /candidateScore >= bestScore/);
  assert.doesNotMatch(labelSource, /rectFromEdges/);
  assert.match(labelSource, /never unioning disjoint label rectangles/);
  assert.match(helperSource, /const exactAssociatedNativeControlHit =/);
  assert.match(helperSource, /target\.control === control/);

  assertCanaryLabels([
    "post-opacity-focus-trap",
    "post-zero-box-focus-trap",
    "post-hidden-override-small",
    "post-default-focusable-iframe",
    "post-external-check",
    "post-implicit-check",
    "post-small-label-check",
    "post-disjoint-label-check",
    "post-native-listbox"
  ]);
  assert.match(canarySource, /disjoint labels must never be rectangle-unioned/);
  assert.match(canarySource, /text-form-clipped-x:select\(post-native-listbox\)/);
});

test("core ownership is complete, cap-bounded, top-hit based, and descendant-aware", () => {
  const ownershipSource = sourceBetween(
    helperSource,
    "const ownershipPartitionCoordinates = (",
    "for (const control of controls) {"
  );
  assert.match(ownershipSource, /const xBoundaries = \[coreRect\.left, coreRect\.right\]/);
  assert.match(ownershipSource, /const yBoundaries = \[coreRect\.top, coreRect\.bottom\]/);
  assert.match(ownershipSource, /if \(ordered\.length > 128\) return null/);
  assert.match(ownershipSource, /xCoordinates\.length \* yCoordinates\.length > 32_768/);
  assert.match(ownershipSource, /const devicePixelCoordinates = \(start: number, end: number\)/);
  assert.match(ownershipSource, /for \(let pixel = firstPixel; pixel < lastPixel; pixel \+= 1\)/);
  assert.match(ownershipSource, /deepElementFromPoint\(x, y\)/);
  assert.match(ownershipSource, /touch-target-core-cell-blocked:/);
  assert.match(ownershipSource, /touch-target-core-partition-limit:/);
  assert.match(ownershipSource, /ownershipFailure && boundaryLimitAxes/);
  assert.match(ownershipSource, /ownershipFailure && cellProductLimit/);
  assert.match(ownershipSource, /nativeSelectOptionHit/);
  assert.match(ownershipSource, /hit instanceof HTMLOptionElement/);
  assert.match(ownershipSource, /touch-target-core-owned-descendant-intercepts:/);
  assert.match(ownershipSource, /candidate\.matches\(options\.semanticInteractiveSelector\)/);
  assert.match(ownershipSource, /getComputedStyle\(candidate\)\.cursor === "pointer"/);
  assert.match(ownershipSource, /__reactProps\$/);
  assert.match(ownershipSource, /nativePointerProperty/);
  assert.match(ownershipSource, /registeredPointerListener/);
  assert.doesNotMatch(ownershipSource, /touch-target-core-pseudo-unsupported:/);
  assert.doesNotMatch(ownershipSource, /touch-target-core-owned-descendant-unsupported:/);

  assertCanaryLabels([
    "post-pseudo-safe",
    "post-rounded-behind-safe",
    "post-129-behind-safe",
    "post-actual-top-hit-blocked",
    "post-actual-top-hit-blocker",
    "post-ordinary-owned-control",
    "post-semantic-owner",
    "post-listener-owner",
    "post-react-owner",
    "post-cursor-owner",
    "post-property-owner",
    "post-removed-listener-owner"
  ]);
  assert.match(canarySource, /ordinary nonsemantic visual descendant/);
  assert.match(canarySource, /independently active top hit/);
});

test("each touch audit emits signed counters and bounded duration aggregates", () => {
  assert.match(helperSource, /CALIFORNIA_TOUCH_AUDIT_ALGORITHM_SHA256/);
  assert.match(helperSource, /export async function collectVisualizationUiAuditEvidence/);
  assert.match(helperSource, /auditStartedAt = performance\.now\(\)/);
  for (const counter of [
    "auditedControlCount",
    "coreHitTestCount",
    "devicePixelFallbackControlCount",
    "partitionLimitFallbackControlCount",
    "pseudoFallbackControlCount",
    "unsupportedGeometryFallbackControlCount"
  ]) {
    assert.match(helperSource, new RegExp(counter));
  }
  assert.match(helperSource, /receiptSha256: sha256Text\(stableJson\(unsignedEvidence\)\)/);
  assert.match(helperSource, /export async function collectVisualizationUiFindings/);
  assert.match(helperSource, /collectVisualizationUiAuditEvidence\(root, axis\)\)\.findings/);
  assert.match(helperSource, /export function summarizeCaliforniaTouchAuditEvidence/);
  assert.match(helperSource, /durationP50Ms: percentile\(0\.5\)/);
  assert.match(helperSource, /durationP95Ms: percentile\(0\.95\)/);
  assert.match(helperSource, /fallbackAuditCount:/);
  assert.match(helperSource, /fallbackControlCount:/);
  assert.match(helperSource, /touchAudit: audit\.touchAudit/);
  assertCanaryLabels([
    "post-telemetry-partition-control",
    "post-telemetry-pseudo-control"
  ]);
  assert.match(canarySource, /pseudo\.touchAudit\.coreHitTestCount >= 44 \* 44/);
  assert.match(canarySource, /summary\.durationP50Ms/);
  assert.match(canarySource, /summary\.durationP95Ms/);
  assert.match(canarySource, /summary\.durationMaxMs/);
});

test("viewport-only interactive text uses a reversible settled re-audit without weakening hard clips", () => {
  const recheckSource = sourceBetween(
    helperSource,
    "async function prepareCaliforniaViewportRecheck",
    "export async function collectVisualizationUiAuditEvidence"
  );
  const viewportSource = sourceBetween(
    helperSource,
    "const viewportAuditToken =",
    "const evaluated = {"
  );
  assert.match(helperSource, /structured-viewport-recheck/);
  assert.match(viewportSource, /__californiaVisualizationViewportAudits/);
  assert.match(viewportSource, /viewportClipped/);
  assert.match(viewportSource, /softAncestorClipped/);
  assert.match(viewportSource, /hardAncestorClipped/);
  assert.match(viewportSource, /hardAncestorClipped \|\| \(!viewportClipped && !softAncestorClipped\)/);
  assert.match(recheckSource, /scrollIntoView\(\{ behavior: "auto", block: "center", inline: "center" \}\)/);
  assert.match(recheckSource, /for \(let frame = 0; frame < 12; frame \+= 1\)/);
  assert.match(recheckSource, /stableFrames >= 2/);
  assert.match(recheckSource, /const collectAuditRoots =/);
  assert.match(recheckSource, /currentRegistry\?\.shadowHosts/);
  assert.match(recheckSource, /observer\.observe\(auditRoot/);
  assert.match(recheckSource, /attributeOldValue: true/);
  assert.match(recheckSource, /characterDataOldValue: true/);
  assert.match(recheckSource, /journal\.phase = "restore"/);
  assert.match(recheckSource, /performOwnedMutation/);
  assert.match(recheckSource, /waitForQuiescentFence/);
  assert.ok(
    recheckSource.lastIndexOf("await waitForQuiescentFence()") <
      recheckSource.lastIndexOf("observer.disconnect()"),
    "mutation observation must remain active through the final post-restore quiescent fence"
  );
  assert.match(recheckSource, /data-california-visualization-audit-mirror/);
  assert.match(recheckSource, /auditRecords\.some\(\(record\) => !internalAuditMutation\(record\)\)/);
  assert.match(recheckSource, /for \(const record of \[\.\.\.records\]\.reverse\(\)\)/);
  assert.match(recheckSource, /record\.target\.insertBefore\(removed, insertionPoint\)/);
  assert.match(recheckSource, /let intendedAncestor: Element \| null = candidate\.target/);
  assert.match(recheckSource, /treeRoot\.nodeType === Node\.DOCUMENT_FRAGMENT_NODE && "host" in treeRoot/);
  assert.match(recheckSource, /style\.fontVariationSettings/);
  assert.match(recheckSource, /style\.getPropertyValue\("zoom"\)/);
  assert.match(recheckSource, /Array\.from\(sheet\.cssRules\)\.map\(\(rule\) => rule\.cssText\)/);
  assert.match(recheckSource, /state\.sheet\.disabled !== state\.disabled/);
  assert.match(recheckSource, /root\.adoptedStyleSheets/);
  assert.match(recheckSource, /defaultChecked/);
  assert.match(recheckSource, /indeterminate/);
  assert.match(recheckSource, /selectionDirection/);
  assert.match(recheckSource, /returnValue/);
  assert.match(recheckSource, /:popover-open/);
  assert.match(recheckSource, /const deepActiveChains =/);
  assert.match(recheckSource, /fontDescriptorKeys/);
  assert.match(recheckSource, /setState\.document\.fonts\.delete\(font\)/);
  assert.match(recheckSource, /fontState\.set\.add\(fontState\.font\)/);
  assert.match(recheckSource, /focus\.call\(focusTarget, \{ preventScroll: true \}\)/);
  assert.match(recheckSource, /initialEnvironmentFingerprint/);
  assert.match(recheckSource, /const initialHistoryState = structuredClone\(history\.state\)/);
  assert.match(recheckSource, /deepStructuredEqual\(history\.state, initialHistoryState\)/);
  assert.match(recheckSource, /history\.replaceState\(structuredClone\(initialHistoryState\)/);
  assert.doesNotMatch(recheckSource, /historyStateFingerprint/);
  assert.match(viewportSource, /touch-target-environment-restore-failed:/);
  assert.match(viewportSource, /candidateFindingRecords/);
  assert.match(viewportSource, /category: CandidateFindingCategory/);
  assert.match(viewportSource, /findingIndex: number/);
  assert.match(viewportSource, /record\.category === "viewport-text-clip" \|\| record\.category === "touch"/);
  assert.match(viewportSource, /entry\.baselineIndex === null \|\| !baselineReplaceIndices\.has\(entry\.baselineIndex\)/);
  assert.match(viewportSource, /touch-target-layout-mutated:/);
  assert.match(viewportSource, /touch-target-layout-unstable:/);
  assert.match(viewportSource, /touch-target-scroll-restore-failed:/);
  assert.match(recheckSource, /state\.element\.scrollLeft !== state\.left/);
  assert.match(recheckSource, /state\.element\.scrollTop !== state\.top/);
  assert.match(recheckSource, /window\.scrollX !== initialWindowScroll\.x/);
  assert.match(recheckSource, /window\.scrollY !== initialWindowScroll\.y/);
  assert.doesNotMatch(viewportSource, /finding\.includes\(viewportTag\)/);
  assert.doesNotMatch(helperSource, /viewportTagPattern/);
  assert.doesNotMatch(viewportSource, /new Set\(mergedFindings/);
  assertCanaryLabels([
    "post-viewport-only",
    "post-nested-viewport-only",
    "post-plain-offscreen-text",
    "post-css-clipped-control",
    "post-mutating-viewport-control",
    "post-fixed-collision-candidate",
    "post-external-font-candidate",
    "post-cssom-environment-candidate",
    "post-overlay-history-candidate",
    "post-direct-shadow-viewport",
    "post-literal-{california-viewport-recheck-0}-unrelated",
    "post-same-label-control",
    "post-multiple-first",
    "post-multiple-second",
    "restore-head-candidate",
    "unrelated-scroll-candidate",
    "shadow-state-candidate",
    "composed-scroll-candidate",
    "smooth-snap-candidate",
    "history-map-candidate",
    "sheet-disabled-candidate",
    "form-property-candidate",
    "dialog-value-candidate",
    "shadow-focus-candidate",
    "fontface-descriptor-candidate",
    "identity-swap-candidate",
    "closed-clean-candidate",
    "epoch-font-metrics-candidate",
    "epoch-canvas-candidate",
    "epoch-waapi-candidate",
    "epoch-iframe-candidate",
    "epoch-media-candidate",
    "epoch-css-animation-candidate",
    "epoch-late-timer-candidate",
    "epoch-late-raf-candidate",
    "epoch-same-cssom-candidate",
    "epoch-print-candidate",
    "epoch-color-one-way-candidate",
    "epoch-color-roundtrip-candidate",
    "epoch-protocol-color-candidate",
    "epoch-viewport-resize-candidate"
  ]);
  assert.match(canarySource, /plain offscreen text must not inherit the interactive viewport recheck exemption/);
  assert.match(canarySource, /a real overflow-hidden clip must remain red/);
  assert.match(canarySource, /scroll-driven layout mutation must fail closed/);
  assert.match(canarySource, /every ancestor and window scroll axis must be restored exactly/);
  assert.match(canarySource, /must not erase a collision visible at the user's original scroll position/);
  assert.match(canarySource, /document\/head\/style\/font state and scroll must be restored/);
  assert.match(canarySource, /CSSOM rules, adopted stylesheets, FontFaceSet membership, and scroll must all restore/);
  assert.match(canarySource, /dialog, popover, current history URL\/state, and scroll must restore/);
  assert.match(canarySource, /irreversible extra history entry must remain fail-closed/);
  assert.match(canarySource, /direct ShadowRoot child must restore every composed light-DOM scroll ancestor/);
  assert.match(canarySource, /internal identifier must remain unrelated evidence/);
  assert.match(canarySource, /same-label controls must retain two identity-distinct failure receipts/);
  assert.match(canarySource, /restore-phase head style mutation is restored and rejected/);
  assert.match(canarySource, /every unrelated light-DOM scroller is restored exactly/);
  assert.match(canarySource, /retained shadow style, form, and scroll state are restored/);
  assert.match(canarySource, /smooth snap containers and sticky or fixed paint restore without exemptions/);
  assert.match(canarySource, /non-JSON history state is restored by deep structured identity/);
  assert.match(canarySource, /form defaults, indeterminate, and selection state are restored/);
  assert.match(canarySource, /target removal, reparenting, and same-markup identity swap are reversed/);
  assert.match(canarySource, /clean closed-shadow properties and fractional RTL scroll remain byte-stable/);
});

test("viewport environment epochs cover non-DOM state, async lineage, frames, and media round trips", () => {
  const recheckSource = sourceBetween(
    helperSource,
    "type CaliforniaViewportExternalEnvironmentEpochState",
    "export async function collectVisualizationUiAuditEvidence"
  );
  for (const contract of [
    /"ascentOverride", "descentOverride"/,
    /"lineGapOverride", "sizeAdjust"/,
    /canvas\.getContext\("2d", \{ willReadFrequently: true \}\)/,
    /context\.getImageData\(0, 0, canvas\.width, canvas\.height\)/,
    /context\.putImageData\(canvasState\.bitmap, 0, 0\)/,
    /defaultPlaybackRate/,
    /preservesPitch/,
    /currentDocument\.getAnimations\(\)/,
    /auditRoot\.getAnimations\(\)/,
    /animation\.playbackRate !== state\.playbackRate/,
    /element\.localName !== "iframe"/,
    /HTMLIFrameElement\)\.contentDocument/,
    /pendingAsyncTasks: new Set<number>\(\)/,
    /journal\.lineageDepth/,
    /nativeSetTimeout/,
    /nativeRequestAnimationFrame/,
    /journal\.pendingAsyncTasks\.size === 0/,
    /installStyleDeclarationProxy/,
    /journal\.nonDomMutationEpoch/,
    /collectMediaQueries/,
    /rule\.conditionText/,
    /rule\.media\.mediaText/,
    /mediaQueryList\.addEventListener\("change", listener\)/,
    /journal\.mediaChangeEpoch/,
    /installCaliforniaViewportExternalEnvironmentEpoch/,
    /installedState\.emulateMediaEpochs/,
    /installedState\.setViewportSizeEpochs/,
    /californiaViewportMutatingProtocolMethods/,
    /"Emulation\.setEmulatedMedia"/,
    /new WeakMap<BrowserContext, CaliforniaViewportProtocolContextEpochState>/,
    /if \(existing\) return existing\.installedBeforePageCreation/,
    /const installedBeforePageCreation = context\.pages\(\)\.length === 0/,
    /protocolContextState\.connectionState\.registrations\.set\(key, state\)/,
    /connection\.sendMessageToServer/,
    /object\?\._type === "CDPSession" && method === "send"/,
    /Reflect\.apply\(originalSendMessageToServer/,
    /externalEpoch\.protocolEpoch > 0/,
    /restoration = \{ \.\.\.restoration, layoutMutated: true \}/,
    /releaseCaliforniaViewportExternalEnvironmentEpoch/
  ]) {
    assert.match(recheckSource, contract);
  }
  assert.ok(
    recheckSource.indexOf("installCaliforniaViewportExternalEnvironmentEpoch(page, externalEpochKey)") <
      recheckSource.indexOf("prepared = await root.evaluate"),
    "publisher-side environment epochs must be armed before the in-page audit scroll"
  );
  assert.ok(
    recheckSource.lastIndexOf("readCaliforniaViewportExternalEnvironmentEpoch") <
      recheckSource.lastIndexOf("releaseCaliforniaViewportExternalEnvironmentEpoch"),
    "publisher-side epochs must remain live through restore and be released afterward"
  );
  for (const title of [
    "FontFace metric overrides restore and reject the changed environment",
    "canvas bitmap mutation restores and remains fail closed",
    "WAAPI state mutation restores and remains fail closed",
    "same-origin iframe form, canvas, and scroll state restore and fail closed",
    "media properties restore and remain fail closed",
    "CSSAnimation and CSSTransition state restore and fail closed",
    "late timer lineage remains pending through the restore fence",
    "nested eight-frame rAF lineage remains pending through the restore fence",
    "same-return CSSOM mutation increments a monotonic non-DOM epoch",
    "print media emulation during audit remains fail closed",
    "same-return color-scheme change increments a monotonic publisher epoch",
    "pre-captured CDP color-scheme round trip increments a protocol epoch",
    "layout and visual viewport mutation increments a publisher epoch"
  ]) {
    assert.match(canarySource, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(canarySource, /const rawProtocolSend = protocolSession\.send\.bind\(protocolSession\)/);
});

test("geometry handling rejects real transforms, clipping, masks, SVG, and unsafe rounded paint only", () => {
  for (const contract of [
    /new DOMMatrixReadOnly\(style\.transform\)/,
    /!matrix\.is2D/,
    /style\.perspective/,
    /style\.clipPath/,
    /getPropertyValue\("mask-image"\)/,
    /paint-containment/,
    /rounded-overflow-clip/,
    /overflow-clip-margin/,
    /fragmented-target-client-rects/,
    /svg-target-geometry/,
    /non-html-target-geometry/
  ]) {
    assert.match(helperSource, contract);
  }
  assert.match(helperSource, /current !== target &&[\s\S]{0,160}!roundedSafeInteriorContains\(current, target\)/);
  assert.match(helperSource, /const pointWithinRoundedTargetHitShape =/);
  assert.match(helperSource, /touch-target-core-overlay-unsupported:/);
  assert.match(helperSource, /for \(const reason of new Set\(hitReasons\)\)/);

  assertCanaryLabels([
    "direct-svg-path-target",
    "direct-svg-circle-target",
    "fragmented-inline-target",
    "rounded-html-target",
    "post-rounded-safe-control",
    "post-rounded-clipped-control"
  ]);
  assert.match(canarySource, /post-rounded-safe-control[\s\S]*assert\.deepEqual/);
  assert.match(canarySource, /post-rounded-clipped-control[\s\S]*rounded-overflow-clip/);
});

test("visible text uses measured DOM and form glyph runs with clipping and paint fail-closed evidence", () => {
  const formSource = sourceBetween(
    helperSource,
    "const deterministicFormTextRun = (",
    "const describeTextRun"
  );
  assert.match(helperSource, /const deepTextNodes =/);
  assert.match(helperSource, /document\.createRange\(\)/);
  assert.match(helperSource, /text-outside-workspace:/);
  assert.match(helperSource, /text-clipped-by-viewport:/);
  assert.match(formSource, /target\.value \|\| target\.placeholder/);
  assert.match(formSource, /target\.multiple \|\| target\.size > 1/);
  assert.match(formSource, /Array\.from\(target\.options\)/);
  assert.match(formSource, /Array\.from\(target\.selectedOptions\)/);
  assert.match(formSource, /typography\.textAlign/);
  assert.match(formSource, /typography\.direction/);
  assert.match(formSource, /typography\.textIndent/);
  assert.match(formSource, /singleLineVerticalOffset/);
  assert.match(formSource, /usableTextRect\.height - mirrorRect\.height/);
  assert.match(formSource, /target\.scrollLeft/);
  assert.match(formSource, /target\.scrollTop/);
  assert.match(formSource, /text-form-clipped-x:/);
  assert.match(formSource, /text-form-clipped-y:/);
  assert.match(helperSource, /text-generated-content-unsupported:/);
  assert.match(helperSource, /getComputedStyle\(origin, "::marker"\)/);
  assert.match(helperSource, /browserGeneratedMarker/);
  assert.match(helperSource, /input\.type\.toLowerCase\(\) === "image"|type\.toLowerCase\(\) === "image"/);
  assert.match(helperSource, /broken-replaced-content:/);
  for (const reason of ["filter", "text-shadow", "text-stroke", "clip-path", "mask-image"]) {
    assert.ok(helperSource.includes(reason), reason);
  }

  assertCanaryLabels([
    "post-centered-input",
    "post-centered-select",
    "post-centered-input-hit",
    "post-centered-select-hit",
    "post-right-aligned-input",
    "post-rtl-start-input",
    "post-indented-input",
    "post-scrolled-input",
    "post-multiline-textarea",
    "post-stroked-text",
    "post-shadowed-text",
    "post-filtered-text",
    "post-workspace-clipped-text",
    "post-workspace-clipped-form",
    "native-select-positive",
    "native-search-positive",
    "broken-alt-image",
    "marker-text-list"
  ]);
  assert.match(canarySource, /vertically centered glyph line rather than the whole content box/);
  assert.match(canarySource, /genuine centered-line overlay/);
});

test("deep light and shadow traversal is iterative and deterministically fail-closed", () => {
  const traversalSource = sourceBetween(
    helperSource,
    "const traversalLimitFindings",
    "const rectOf = (target: Element)"
  );
  assert.match(traversalSource, /maximumDeepTraversalNodes = 50_000/);
  assert.match(traversalSource, /maximumDeepTraversalDepth = 256/);
  assert.match(traversalSource, /const pending =/);
  assert.match(traversalSource, /while \(pending\.length > 0\)/);
  assert.match(traversalSource, /visited\.has\(entry\.node\)/);
  assert.match(traversalSource, /node-cap-/);
  assert.match(traversalSource, /depth-cap-/);
  assert.match(traversalSource, /hit-test-shadow/);
  assert.doesNotMatch(traversalSource, /const visit =/);
  assert.match(helperSource, /findings\.push\(\.\.\.traversalLimitFindings\)/);
  assert.match(canarySource, /"<div>"\.repeat\(270\)/);
  assert.match(canarySource, /ui-audit-traversal-limit:elements:depth-cap-256/);
  assert.match(canarySource, /ui-audit-traversal-limit:text:depth-cap-256/);
});
