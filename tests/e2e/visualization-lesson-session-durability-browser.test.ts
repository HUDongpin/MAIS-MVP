import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type {
  APIRequestContext,
  APIResponse,
  BrowserContext,
  Frame,
  Locator,
  Page,
  Request,
  Response,
  TestInfo,
} from "@playwright/test";

import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import {
  learningAnalyticsBoundaryLineageStorageKey,
  learningAnalyticsClearFenceStorageKey,
  learningAnalyticsGenerationHandshakeStorageKey,
  learningAnalyticsGenerationStorageKey,
  learningAnalyticsGenerationTransitionStorageKey,
} from "../../lib/learningAnalytics";
import {
  VisualizationLessonTerminalDeadlineError,
} from "./visualization-lesson-session-durability";
import {
  VisualizationLessonBrowserDurabilityError,
  createVisualizationLessonDurabilityBrowserAdapter,
  prepareVisualizationLessonLearnerProfileBeforeArm,
  type VisualizationLessonBrowserFirstInteractionReceipt,
  type VisualizationLessonControlObserverStopReceipt,
  type VisualizationLessonRealControlFence,
} from "./visualization-lesson-session-durability-browser";

const repositoryRoot = process.cwd();
const userId = "student-browser-adapter";
const moduleId = "configured-visualization-lab" as const;
const selectedTopicId = "pep-junior-s1-upper-rational-numbers";
const siblingTopicId = "bnu-junior-s1-upper-rational-numbers";
const lessonSlug = lessonSlugForTopicId(selectedTopicId);
const grade = "S1";
const source = "coordinate-plane";
const mountedAt = "2026-08-11T08:00:00.000Z";
const completedAt = "2026-08-11T08:09:10.000Z";
const origin = "http://127.0.0.1:3100";
const modeControlKey = "comparison-mode";
const resetControlKey = selectedTopicId;

function sha256Bytes(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function expectedButtonClick(controlKey: string) {
  return {
    controlKey,
    eventTypes: ["pointerup", "click"] as const,
  };
}

type FakeRootState = {
  activeLabId: string | null;
  controls: Array<{
    ariaPressed: string | null;
    dataPressed: Array<readonly [string, string | null]>;
    key: string;
    max: string | null;
    min: string | null;
    options: Array<{ disabled: boolean; selected: boolean; value: string }>;
    step: string | null;
    tag: string;
    type: string | null;
    value: string | null;
  }>;
  count: number;
  matchesRootSelector: boolean;
  moduleId: string | null;
  sessionOwner: string | null;
  topicId: string | null;
  visible: boolean;
};

type FakeObserver = {
  events: Array<{
    controlKey: string;
    key: string | null;
    sequence: number;
    type: "change" | "click" | "input" | "keyup" | "pointerup";
  }>;
  initialStorage: Array<{ key: string; raw: string }>;
  listenerErrors: string[];
  navigationDrifts: Array<{
    after: string;
    before: string;
    kind: string;
    sequence: number;
  }>;
  storageEvents: Array<{
    key: string | null;
    newValue: string | null;
    oldValue: string | null;
    sequence: number;
    url: string;
  }>;
  topologyEvents: Array<{
    kind: "dom-auxiliary-created" | "window-open";
    sequence: number;
    tagName: string | null;
    targetUrl: string | null;
  }>;
  storageError: string | null;
  version: 1;
};

class FakeRequest {
  failureText: string | null = null;

  constructor(
    private readonly requestUrl: string,
    private readonly requestMethod: string,
    private readonly bytes: string | null,
    private readonly requestHeaders: Record<string, string> = {},
  ) {}

  url() {
    return this.requestUrl;
  }

  method() {
    return this.requestMethod;
  }

  postData() {
    return this.bytes;
  }

  headers() {
    return { ...this.requestHeaders };
  }

  failure() {
    return this.failureText === null ? null : { errorText: this.failureText };
  }
}

class FakeResponse {
  constructor(
    private readonly owner: FakeRequest,
    private readonly responseStatus: number,
    private readonly readText: () => Promise<string>,
  ) {}

  request() {
    return this.owner as unknown as Request;
  }

  status() {
    return this.responseStatus;
  }

  async text() {
    return await this.readText();
  }
}

class FakeApiResponse {
  constructor(
    private readonly responseStatus: number,
    private readonly responseBytes: string,
    private readonly responseUrl: string,
  ) {}

  status() {
    return this.responseStatus;
  }

  async text() {
    return this.responseBytes;
  }

  url() {
    return this.responseUrl;
  }
}

class FakeApiRequestContext {
  sessionResponseBytes = JSON.stringify({ sessions: [] });
  sessionResponseUrl: string | null = null;
  replayResponseBytes = "";
  replayResponseUrl: string | null = null;
  replayStatus = 200;
  fetchBodies: string[] = [];
  learnerProfileResponseBytes: string | null = null;
  learnerProfileStatus = 200;
  learnerProfileResponseUrl = `${origin}/api/me/learner-profile`;
  patchBodies: unknown[] = [];
  onLearnerProfilePatch: (() => void) | null = null;
  onReplayFetch: (() => void) | null = null;

  async get(url: string) {
    assert.equal(url, `${origin}/api/visualization-sessions`);
    return new FakeApiResponse(
      200,
      this.sessionResponseBytes,
      this.sessionResponseUrl ?? url,
    ) as unknown as APIResponse;
  }

  async fetch(url: string, options: { data?: unknown; method?: string }) {
    assert.equal(url, `${origin}/api/visualization-sessions`);
    assert.equal(options.method, "POST");
    assert.equal(typeof options.data, "string");
    this.fetchBodies.push(options.data as string);
    this.onReplayFetch?.();
    return new FakeApiResponse(
      this.replayStatus,
      this.replayResponseBytes,
      this.replayResponseUrl ?? url,
    ) as unknown as APIResponse;
  }

  async patch(url: string, options: { data?: unknown }) {
    assert.equal(url, `${origin}/api/me/learner-profile`);
    this.patchBodies.push(
      typeof options.data === "string" ? JSON.parse(options.data) : structuredClone(options.data),
    );
    this.onLearnerProfilePatch?.();
    const timestamp = new Date().toISOString();
    const responseBytes = this.learnerProfileResponseBytes ?? JSON.stringify({
      learnerProfile: {
        answers: { challenge: "balanced", goal: "repair", help: "hint" },
        initializedFrom: "login-onboarding",
        questionnaireVersion: "learner-start-v1",
        skippedAt: timestamp,
        status: "skipped",
        updatedAt: timestamp,
        userId,
      },
      shouldShowOnboarding: false,
    });
    return new FakeApiResponse(
      this.learnerProfileStatus,
      responseBytes,
      this.learnerProfileResponseUrl,
    ) as unknown as APIResponse;
  }
}

class FakeRoot {
  constructor(readonly state: FakeRootState) {}

  async evaluate(_callback: unknown, argument: { operation?: string }) {
    assert.equal(argument.operation, "visualization-durability-root-snapshot");
    const { count: _count, ...snapshot } = this.state;
    return structuredClone(snapshot);
  }
}

type PageEvent =
  | "frameattached"
  | "framedetached"
  | "framenavigated"
  | "popup"
  | "request"
  | "requestfailed"
  | "requestfinished"
  | "response";

class FakeBrowserContext {
  readonly currentPages: FakePage[] = [];
  readonly listeners = new Map<"page", Array<(page: FakePage) => unknown>>();
  removedPageListeners = 0;

  registerInitialPage(page: FakePage) {
    this.currentPages.push(page);
  }

  pages() {
    return [...this.currentPages] as unknown as Page[];
  }

  on(event: "page", listener: (page: Page) => unknown) {
    assert.equal(event, "page");
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener as unknown as (page: FakePage) => unknown);
    this.listeners.set(event, listeners);
    return this as unknown as BrowserContext;
  }

  off(event: "page", listener: (page: Page) => unknown) {
    assert.equal(event, "page");
    const listeners = this.listeners.get(event) ?? [];
    const index = listeners.indexOf(listener as unknown as (page: FakePage) => unknown);
    if (index >= 0) {
      listeners.splice(index, 1);
      this.removedPageListeners += 1;
    }
    return this as unknown as BrowserContext;
  }

  async emitPage(page: FakePage) {
    if (!this.currentPages.includes(page)) this.currentPages.push(page);
    for (const listener of this.listeners.get("page") ?? []) await listener(page);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  closePage(page: FakePage) {
    const index = this.currentPages.indexOf(page);
    if (index >= 0) this.currentPages.splice(index, 1);
  }

  replaceCurrentPageWithoutEvent(page: FakePage) {
    this.currentPages.splice(0, this.currentPages.length, page);
  }
}

class FakeFrame {
  constructor(
    private readonly owner: FakePage,
    private readonly parent: FakeFrame | null,
    private readUrl: () => string,
  ) {}

  page() {
    return this.owner as unknown as Page;
  }

  parentFrame() {
    return this.parent as unknown as Frame | null;
  }

  url() {
    return this.readUrl();
  }

  navigate(url: string) {
    this.readUrl = () => url;
  }
}

class FakePage {
  readonly api = new FakeApiRequestContext();
  readonly observer: FakeObserver = {
    events: [],
    initialStorage: [],
    listenerErrors: [],
    navigationDrifts: [],
    storageEvents: [],
    topologyEvents: [],
    storageError: null,
    version: 1,
  };
  readonly storage: Array<{ key: string; raw: string }>;
  readonly externalStorageEvents: Array<{
    key: string | null;
    newValue: string | null;
    oldValue: string | null;
    url: string;
  }> = [];
  externalStorageEventDelivery: "immediate" | "queued" = "immediate";
  readonly pendingExternalStorageEvents: Array<
    readonly [key: string | null, oldValue: string | null, newValue: string | null]
  > = [];
  private readonly sharedStorageBacking: Array<{ key: string; raw: string }>;
  readonly listeners = new Map<PageEvent, Array<(value: unknown) => unknown>>();
  readonly mainFrameIdentity: FakeFrame;
  readonly frameIdentities: FakeFrame[];
  currentMainFrameIdentity: FakeFrame;
  contextIdentity: object;
  initScriptSource = "";
  readonly removedListeners = new Map<PageEvent, number>();
  readonly barrierHooks: Array<() => Promise<void>> = [];
  readonly finalSealAfterSnapshotHooks: Array<() => Promise<void>> = [];
  readonly finalSealBeforeConfirmationHooks: Array<() => Promise<void>> = [];
  readonly observerReadHooks: Array<() => Promise<void>> = [];
  readonly controlObserverStopAfterValidationHooks: Array<() => void> = [];
  readonly controlObserverStopAfterRemovalHooks: Array<() => void> = [];
  readonly controlObserverStopBeforeValidationHooks: Array<() => void> = [];
  activeSeal: {
    digests: {
      locationSha256: string;
      observerSha256: string;
      storageSha256: string;
    } | null;
    epoch: number;
    postSealViolations: Array<{ epoch: number; kind: string; sequence: number }>;
    sealId: string;
    state: "sealing" | "sealed";
  } | null = null;
  private currentUrlValue = "about:blank";
  initScriptCount = 0;
  controlObserverActive = false;
  private controlObserverFrozenEventCountValue = 0;
  private controlObserverLedgerFrozenValue = false;
  controlObserverRemovalCount = 0;
  controlObserverStopCalls = 0;
  controlObserverStopFailure: "after-removal" | "before-removal" | null = null;
  controlObserverStopReturnTransform: ((receipt: unknown) => unknown) | null = null;
  private controlObserverStopReceiptValue: VisualizationLessonControlObserverStopReceipt | null = null;
  applicationTopologyObserverInstalled = false;
  applicationTopologyObserverStopCalls = 0;
  browserObserverCleanupError: Error | null = null;
  readonly applicationTopologyTags = new Set<string>();
  closedShadowTopologyObserverInstalled = false;
  sealEpoch = 0;
  sealSequence = 0;
  storageEventObserverInstalled = false;
  storageEventObserverStopCalls = 0;

  constructor(
    readonly root: FakeRoot,
    contextIdentity: object = new FakeBrowserContext(),
    registerWithContext = true,
  ) {
    this.contextIdentity = contextIdentity;
    this.mainFrameIdentity = new FakeFrame(this, null, () => this.currentUrl);
    this.currentMainFrameIdentity = this.mainFrameIdentity;
    this.frameIdentities = [this.mainFrameIdentity];
    if (registerWithContext && contextIdentity instanceof FakeBrowserContext) {
      contextIdentity.registerInitialPage(this);
    }
    this.sharedStorageBacking = [];
    this.storage = new Proxy<Array<{ key: string; raw: string }>>(this.sharedStorageBacking, {
      deleteProperty: (target, property) => {
        const deleted = Reflect.deleteProperty(target, property);
        if (property !== "length") this.recordCoveredChange(`localStorage.delete:${String(property)}`);
        return deleted;
      },
      set: (target, property, value) => {
        const changed = Reflect.set(target, property, value);
        if (property !== "length") this.recordCoveredChange(`localStorage.set:${String(property)}`);
        return changed;
      },
    });
  }

  get currentUrl() {
    return this.currentUrlValue;
  }

  get controlObserverStopReceipt() {
    return this.controlObserverStopReceiptValue;
  }

  get controlObserverFrozenEventCount() {
    return this.controlObserverFrozenEventCountValue;
  }

  get controlObserverLedgerFrozen() {
    return this.controlObserverLedgerFrozenValue;
  }

  private exactControlObserverLedger(expectedEvents: unknown) {
    if (!Array.isArray(expectedEvents)) return false;
    const liveArrayKeys = Reflect.ownKeys(this.observer.events);
    const expectedArrayKeys = Reflect.ownKeys(expectedEvents);
    if (
      liveArrayKeys.length !== 5 ||
      expectedArrayKeys.length !== 5 ||
      liveArrayKeys.some((key, index) => key !== ["0", "1", "2", "3", "length"][index]) ||
      expectedArrayKeys.some((key, index) => key !== ["0", "1", "2", "3", "length"][index])
    ) return false;
    const expectedTypes = ["pointerup", "click", "pointerup", "click"];
    return this.observer.events.every((event, index) => {
      const expected = expectedEvents[index] as FakeObserver["events"][number] | undefined;
      if (expected === undefined) return false;
      const eventKeys = Reflect.ownKeys(event);
      const expectedKeys = Reflect.ownKeys(expected);
      const exactKeys = ["controlKey", "key", "sequence", "type"].sort().join("\u0000");
      return eventKeys.length === 4 &&
        expectedKeys.length === 4 &&
        eventKeys.every((key): key is string => typeof key === "string") &&
        expectedKeys.every((key): key is string => typeof key === "string") &&
        [...eventKeys].sort().join("\u0000") === exactKeys &&
        [...expectedKeys].sort().join("\u0000") === exactKeys &&
        event.controlKey === expected.controlKey &&
        event.key === null &&
        expected.key === null &&
        event.sequence === index + 1 &&
        expected.sequence === index + 1 &&
        event.type === expectedTypes[index] &&
        expected.type === expectedTypes[index];
    });
  }

  private freezeControlObserverLedger(expectedEvents: unknown) {
    if (!this.exactControlObserverLedger(expectedEvents)) {
      throw new Error("fake control observer ledger does not match trusted exact cleanup evidence");
    }
    if (this.controlObserverLedgerFrozen) {
      if (
        !Object.isFrozen(this.observer.events) ||
        !this.observer.events.every((event) => Object.isFrozen(event)) ||
        this.controlObserverFrozenEventCount !== 4 ||
        !this.exactControlObserverLedger(expectedEvents)
      ) throw new Error("fake control observer frozen ledger lifecycle drifted");
      return this.controlObserverFrozenEventCount;
    }
    for (const event of this.observer.events) Object.freeze(event);
    if (
      !this.observer.events.every((event) => Object.isFrozen(event)) ||
      !this.exactControlObserverLedger(expectedEvents)
    ) throw new Error("fake control observer original events did not freeze exactly");
    Object.freeze(this.observer.events);
    if (
      !Object.isFrozen(this.observer.events) ||
      !this.observer.events.every((event) => Object.isFrozen(event)) ||
      !this.exactControlObserverLedger(expectedEvents)
    ) throw new Error("fake control observer original ledger did not freeze exactly");
    this.controlObserverFrozenEventCountValue = 4;
    this.controlObserverLedgerFrozenValue = true;
    return this.controlObserverFrozenEventCount;
  }

  forceControlObserverStopReceiptForTest(
    receipt: VisualizationLessonControlObserverStopReceipt | null,
  ) {
    this.controlObserverStopReceiptValue = receipt;
  }

  set currentUrl(value: string) {
    if (value === this.currentUrlValue) return;
    this.currentUrlValue = value;
    this.recordCoveredChange(`location:${value}`);
  }

  get request() {
    return this.api as unknown as APIRequestContext;
  }

  context() {
    return this.contextIdentity;
  }

  mainFrame() {
    return this.currentMainFrameIdentity as unknown as Frame;
  }

  frames() {
    return [...this.frameIdentities] as unknown as Frame[];
  }

  url() {
    return this.currentUrl;
  }

  on(event: PageEvent, listener: (value: never) => unknown) {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener as (value: unknown) => unknown);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: PageEvent, listener: (value: never) => unknown) {
    const listeners = this.listeners.get(event) ?? [];
    const index = listeners.indexOf(listener as (value: unknown) => unknown);
    if (index >= 0) {
      listeners.splice(index, 1);
      this.removedListeners.set(event, (this.removedListeners.get(event) ?? 0) + 1);
    }
    return this;
  }

  async openAuxiliaryPage(url = "about:blank") {
    assert.equal(this.contextIdentity instanceof FakeBrowserContext, true);
    const auxiliary = new FakePage(
      new FakeRoot(defaultRootState()),
      this.contextIdentity,
      false,
    );
    auxiliary.currentUrl = url;
    await (this.contextIdentity as FakeBrowserContext).emitPage(auxiliary);
    return auxiliary;
  }

  async openAndClosePopup(url = "about:blank") {
    const popup = await this.openAuxiliaryPage(url);
    await this.emit("popup", popup);
    (this.contextIdentity as FakeBrowserContext).closePage(popup);
    return popup;
  }

  async attachAuxiliaryFrame(url = "about:blank") {
    const frame = new FakeFrame(this, this.mainFrameIdentity, () => url);
    this.frameIdentities.push(frame);
    await this.emit("frameattached", frame);
    return frame;
  }

  async navigateAuxiliaryFrame(frame: FakeFrame, url: string) {
    frame.navigate(url);
    await this.emit("framenavigated", frame);
  }

  async detachAuxiliaryFrame(frame: FakeFrame) {
    const index = this.frameIdentities.indexOf(frame);
    if (index >= 0) this.frameIdentities.splice(index, 1);
    await this.emit("framedetached", frame);
  }

  replaceMainFrameWithoutEvent() {
    const replacement = new FakeFrame(this, null, () => this.currentUrl);
    this.currentMainFrameIdentity = replacement;
    this.frameIdentities.splice(0, this.frameIdentities.length, replacement);
  }

  async addInitScript(
    _callback: unknown,
    argument?: {
      auxiliaryElementTags?: readonly string[];
      observeClosedShadowTopology?: boolean;
      observeApplicationTopology?: boolean;
      observeStorageEvents?: boolean;
    },
  ) {
    this.initScriptCount += 1;
    this.initScriptSource = String(_callback);
    this.applicationTopologyObserverInstalled =
      argument?.observeApplicationTopology === true;
    this.applicationTopologyTags.clear();
    for (const tagName of argument?.auxiliaryElementTags ?? []) {
      this.applicationTopologyTags.add(tagName);
    }
    this.closedShadowTopologyObserverInstalled =
      argument?.observeClosedShadowTopology === true &&
      this.initScriptSource.includes("Element.prototype.attachShadow") &&
      this.initScriptSource.includes("applicationTopologyObserver.observe(shadowRoot");
    this.storageEventObserverInstalled = argument?.observeStorageEvents === true;
    this.controlObserverActive = true;
  }

  locator() {
    return {
      count: async () => this.root.state.count,
    } as unknown as Locator;
  }

  async evaluate(
    _callback: unknown,
    argument: {
      adapterId?: string;
      eventsSha256?: string;
      expectedEvents?: FakeObserver["events"];
      operation?: string;
      removedEventTypes?: readonly string[];
      sealId?: string;
      stopId?: string;
    },
  ): Promise<unknown> {
    if (argument.operation === "visualization-durability-animation-barrier") {
      const hook = this.barrierHooks.shift();
      if (hook) await hook();
      return undefined;
    }
    if (argument.operation === "visualization-durability-observer") {
      const hook = this.observerReadHooks.shift();
      if (hook) await hook();
      const location = new URL(this.currentUrl);
      return structuredClone({
        controlObserverActive: this.controlObserverActive,
        controlObserverFrozenEventCount: this.controlObserverFrozenEventCount,
        controlObserverLedgerFrozen: this.controlObserverLedgerFrozen,
        controlObserverRemovalCount: this.controlObserverRemovalCount,
        controlObserverStopReceipt: this.controlObserverStopReceipt,
        events: this.observer.events,
        initialStorage: this.observer.initialStorage,
        listenerErrors: this.observer.listenerErrors,
        location: {
          hash: location.hash,
          href: location.href,
          origin: location.origin,
          pathname: location.pathname,
          search: location.search,
        },
        navigationDrifts: this.observer.navigationDrifts,
        storageError: this.observer.storageError,
        storageEvents: this.observer.storageEvents,
        topologyEvents: this.observer.topologyEvents,
        version: this.observer.version,
      });
    }
    if (argument.operation === "visualization-durability-control-observer-stop") {
      const beforeValidationHook = this.controlObserverStopBeforeValidationHooks.shift();
      if (beforeValidationHook) beforeValidationHook();
      const expectedEvents = argument.expectedEvents;
      const exactDenseLedger = () => {
        const arrayKeys = Reflect.ownKeys(this.observer.events);
        if (
          arrayKeys.length !== 5 ||
          arrayKeys[0] !== "0" ||
          arrayKeys[1] !== "1" ||
          arrayKeys[2] !== "2" ||
          arrayKeys[3] !== "3" ||
          arrayKeys[4] !== "length"
        ) return false;
        return this.observer.events.every((event, index) => {
          const eventKeys = Reflect.ownKeys(event);
          return eventKeys.length === 4 &&
            [...eventKeys].sort().join("\u0000") ===
              ["controlKey", "key", "sequence", "type"].sort().join("\u0000") &&
            expectedEvents?.[index] !== undefined &&
            JSON.stringify(event) === JSON.stringify(expectedEvents[index]);
        });
      };
      if (
        argument.adapterId === undefined ||
        argument.eventsSha256 === undefined ||
        argument.stopId === undefined ||
        !Array.isArray(argument.removedEventTypes) ||
        !Array.isArray(expectedEvents) ||
        expectedEvents.length !== 4 ||
        this.controlObserverActive !== true ||
        this.controlObserverFrozenEventCount !== 0 ||
        this.controlObserverLedgerFrozen !== false ||
        this.controlObserverRemovalCount !== 0 ||
        this.controlObserverStopReceipt !== null ||
        !exactDenseLedger()
      ) {
        throw new Error("control observer cannot stop from a non-exact active four-event state");
      }
      const afterValidationHook = this.controlObserverStopAfterValidationHooks.shift();
      if (afterValidationHook) afterValidationHook();
      if (this.controlObserverStopFailure === "before-removal") {
        throw new Error("fake control observer stop failed before removal");
      }
      this.controlObserverActive = false;
      this.controlObserverRemovalCount += 1;
      this.controlObserverStopCalls += 1;
      this.recordCoveredChange("control-observer-stop");
      const afterRemovalHook = this.controlObserverStopAfterRemovalHooks.shift();
      if (afterRemovalHook) afterRemovalHook();
      if (this.controlObserverStopFailure === "after-removal") {
        throw new Error("fake control observer stop failed after removal");
      }
      if (!exactDenseLedger()) {
        throw new Error("control observer ledger or lifecycle changed during atomic removal");
      }
      if (
        this.freezeControlObserverLedger(expectedEvents) !== 4 ||
        !exactDenseLedger() ||
        !Object.isFrozen(this.observer.events) ||
        !this.observer.events.every((event) => Object.isFrozen(event))
      ) {
        throw new Error("original control event ledger did not freeze with exact dense keys and values");
      }
      this.controlObserverStopReceiptValue = Object.freeze({
        active: false,
        adapterId: argument.adapterId,
        eventCount: 4,
        events: Object.freeze(
          this.observer.events.map((event) => Object.freeze({ ...event })),
        ) as unknown as VisualizationLessonControlObserverStopReceipt["events"],
        eventsSha256: argument.eventsSha256,
        lastSequence: 4,
        removalCount: 1,
        removedEventTypes: Object.freeze(
          [...argument.removedEventTypes],
        ) as unknown as VisualizationLessonControlObserverStopReceipt["removedEventTypes"],
        removedExactlyOnce: true,
        removedListenerCount: 5,
        stopId: argument.stopId,
      });
      const returnedReceipt = structuredClone(this.controlObserverStopReceipt);
      return this.controlObserverStopReturnTransform === null
        ? returnedReceipt
        : this.controlObserverStopReturnTransform(returnedReceipt);
    }
    if (argument.operation === "visualization-durability-final-seal-snapshot") {
      const sealId = `${argument.adapterId}:${++this.sealSequence}`;
      const epoch = this.sealEpoch;
      this.activeSeal = {
        digests: null,
        epoch,
        postSealViolations: [],
        sealId,
        state: "sealing",
      };
      const hook = this.observerReadHooks.shift();
      if (hook) await hook();
      const location = new URL(this.currentUrl);
      const locationReceipt = {
        hash: location.hash,
        href: location.href,
        origin: location.origin,
        pathname: location.pathname,
        search: location.search,
      };
      const observer = structuredClone({
        controlObserverActive: this.controlObserverActive,
        controlObserverFrozenEventCount: this.controlObserverFrozenEventCount,
        controlObserverLedgerFrozen: this.controlObserverLedgerFrozen,
        controlObserverRemovalCount: this.controlObserverRemovalCount,
        controlObserverStopReceipt: this.controlObserverStopReceipt,
        events: this.observer.events,
        initialStorage: this.observer.initialStorage,
        listenerErrors: this.observer.listenerErrors,
        location: locationReceipt,
        navigationDrifts: this.observer.navigationDrifts,
        storageError: this.observer.storageError,
        storageEvents: this.observer.storageEvents,
        topologyEvents: this.observer.topologyEvents,
        version: this.observer.version,
      });
      const storage = this.trackedStorageEntries();
      const afterSnapshotHook = this.finalSealAfterSnapshotHooks.shift();
      if (afterSnapshotHook) await afterSnapshotHook();
      const digests = {
        locationSha256: sha256Bytes(JSON.stringify(locationReceipt)),
        observerSha256: sha256Bytes(JSON.stringify(observer)),
        storageSha256: sha256Bytes(JSON.stringify(storage)),
      };
      const valid =
        this.activeSeal.sealId === sealId &&
        this.sealEpoch === epoch &&
        this.activeSeal.postSealViolations.length === 0;
      this.activeSeal.digests = digests;
      if (valid) this.activeSeal.state = "sealed";
      return structuredClone({
        observer,
        seal: {
          digests,
          epoch,
          postSealViolations: this.activeSeal.postSealViolations,
          sealId,
          state: valid ? "sealed" : "invalid",
        },
        storage,
      });
    }
    if (argument.operation === "visualization-durability-final-seal-confirm") {
      if (this.activeSeal === null || this.activeSeal.sealId !== argument.sealId) return null;
      const beforeConfirmationHook = this.finalSealBeforeConfirmationHooks.shift();
      if (beforeConfirmationHook) await beforeConfirmationHook();
      const confirmationMatched =
        this.activeSeal.state === "sealed" &&
        this.activeSeal.epoch === this.sealEpoch &&
        this.activeSeal.postSealViolations.length === 0 &&
        this.applicationTopologyObserverInstalled &&
        this.controlObserverActive === false &&
        this.controlObserverFrozenEventCount === 4 &&
        this.controlObserverLedgerFrozen === true &&
        this.controlObserverRemovalCount === 1 &&
        this.controlObserverStopReceipt !== null &&
        Object.isFrozen(this.observer.events) &&
        this.observer.events.every((event) => Object.isFrozen(event)) &&
        this.storageEventObserverInstalled;
      if (confirmationMatched) {
        this.applicationTopologyObserverInstalled = false;
        this.applicationTopologyObserverStopCalls += 1;
        this.storageEventObserverInstalled = false;
        this.storageEventObserverStopCalls += 1;
      }
      return structuredClone({
        ...this.activeSeal,
        applicationTopologyObserverRemoved:
          confirmationMatched && !this.applicationTopologyObserverInstalled,
        confirmationMatched,
        currentEpoch: this.sealEpoch,
        observer: {
          controlObserverActive: this.controlObserverActive,
          controlObserverFrozenEventCount: this.controlObserverFrozenEventCount,
          controlObserverLedgerFrozen: this.controlObserverLedgerFrozen,
          controlObserverRemovalCount: this.controlObserverRemovalCount,
          controlObserverStopReceipt: this.controlObserverStopReceipt,
          events: this.observer.events,
          initialStorage: this.observer.initialStorage,
          listenerErrors: this.observer.listenerErrors,
          location: {
            hash: new URL(this.currentUrl).hash,
            href: new URL(this.currentUrl).href,
            origin: new URL(this.currentUrl).origin,
            pathname: new URL(this.currentUrl).pathname,
            search: new URL(this.currentUrl).search,
          },
          navigationDrifts: this.observer.navigationDrifts,
          storageError: this.observer.storageError,
          storageEvents: this.observer.storageEvents,
          topologyEvents: this.observer.topologyEvents,
          version: this.observer.version,
        },
        snapshots: {},
        storage: this.trackedStorageEntries(),
        storageObserverRemoved: confirmationMatched,
      });
    }
    if (argument.operation === "visualization-durability-browser-observer-cleanup") {
      if (this.browserObserverCleanupError !== null) {
        throw this.browserObserverCleanupError;
      }
      if (this.applicationTopologyObserverInstalled) {
        this.applicationTopologyObserverInstalled = false;
        this.applicationTopologyObserverStopCalls += 1;
      }
      if (this.controlObserverActive) {
        this.controlObserverActive = false;
        this.controlObserverRemovalCount += 1;
        this.controlObserverStopCalls += 1;
        this.recordCoveredChange("control-observer-stop");
      }
      let controlObserverLedgerFreezeError: string | null = null;
      if (argument.expectedEvents !== null && argument.expectedEvents !== undefined) {
        try {
          this.freezeControlObserverLedger(argument.expectedEvents);
        } catch (error) {
          controlObserverLedgerFreezeError = String(error);
        }
      }
      const controlObserverLedgerObjectFrozen =
        Object.isFrozen(this.observer.events) &&
        this.observer.events.every((event) => Object.isFrozen(event));
      if (this.storageEventObserverInstalled) {
        this.storageEventObserverInstalled = false;
        this.storageEventObserverStopCalls += 1;
      }
      return {
        applicationTopologyObserverRemoved: !this.applicationTopologyObserverInstalled,
        controlEventListenerRemoved: !this.controlObserverActive,
        controlObserverFrozenEventCount: this.controlObserverFrozenEventCount,
        controlObserverLedgerFrozen: this.controlObserverLedgerFrozen,
        controlObserverLedgerFreezeError,
        controlObserverLedgerObjectFrozen,
        controlObserverRemovalCount: this.controlObserverRemovalCount,
        storageEventListenerRemoved: !this.storageEventObserverInstalled,
      };
    }
    if (argument.operation === "visualization-durability-storage") {
      return this.trackedStorageEntries();
    }
    throw new Error(`unexpected FakePage.evaluate operation ${String(argument.operation)}`);
  }

  async emit(event: PageEvent, value: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      await listener(value);
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  recordCoveredChange(kind: string) {
    this.sealEpoch += 1;
    if (this.activeSeal !== null) {
      this.activeSeal.postSealViolations.push({
        epoch: this.sealEpoch,
        kind,
        sequence: this.activeSeal.postSealViolations.length + 1,
      });
    }
  }

  setStorageFromExternalSameOriginDocument(key: string, raw: string) {
    const existing = this.sharedStorageBacking.find((entry) => entry.key === key);
    const oldValue = existing?.raw ?? null;
    if (existing) existing.raw = raw;
    else this.sharedStorageBacking.push({ key, raw });
    this.externalStorageEvents.push({
      key,
      newValue: raw,
      oldValue,
      url: `${origin}/external-storage-writer`,
    });
    this.deliverExternalStorageEvent(key, oldValue, raw);
  }

  removeStorageFromExternalSameOriginDocument(key: string) {
    const index = this.sharedStorageBacking.findIndex((entry) => entry.key === key);
    const oldValue = index < 0 ? null : this.sharedStorageBacking[index]!.raw;
    if (index >= 0) this.sharedStorageBacking.splice(index, 1);
    this.externalStorageEvents.push({
      key,
      newValue: null,
      oldValue,
      url: `${origin}/external-storage-writer`,
    });
    this.deliverExternalStorageEvent(key, oldValue, null);
  }

  clearStorageFromExternalSameOriginDocument() {
    this.sharedStorageBacking.splice(0, this.sharedStorageBacking.length);
    this.externalStorageEvents.push({
      key: null,
      newValue: null,
      oldValue: null,
      url: `${origin}/external-storage-writer`,
    });
    this.deliverExternalStorageEvent(null, null, null);
  }

  private trackedStorageEntries() {
    return this.sharedStorageBacking
      .filter(({ key }) =>
        key.startsWith("mais:visualization-session-") ||
        key.startsWith("mais:learning-analytics-"),
      )
      .map((entry) => structuredClone(entry))
      .sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  }

  private deliverExternalStorageEvent(
    key: string | null,
    oldValue: string | null,
    newValue: string | null,
  ) {
    if (this.externalStorageEventDelivery === "queued") {
      this.pendingExternalStorageEvents.push([key, oldValue, newValue]);
      return;
    }
    if (!this.storageEventObserverInstalled) return;
    const tracked = key === null || key.startsWith("mais:visualization-session-") ||
      key.startsWith("mais:learning-analytics-");
    if (!tracked) return;
    this.observer.storageEvents.push({
      key,
      newValue,
      oldValue,
      sequence: this.observer.storageEvents.length + 1,
      url: `${origin}/external-storage-writer`,
    });
    this.recordCoveredChange(`storage-event:${key ?? "clear"}`);
  }

  flushPendingExternalStorageEvents() {
    const pending = this.pendingExternalStorageEvents.splice(
      0,
      this.pendingExternalStorageEvents.length,
    );
    this.externalStorageEventDelivery = "immediate";
    for (const [key, oldValue, newValue] of pending) {
      this.deliverExternalStorageEvent(key, oldValue, newValue);
    }
  }

  addObserverError(message: string) {
    this.observer.listenerErrors.push(message);
    this.recordCoveredChange(`observer-error:${message}`);
  }

  addApplicationTopologyEvent(
    kind: "dom-auxiliary-created" | "window-open",
    tagName: string | null,
    targetUrl: string | null,
  ) {
    this.observer.topologyEvents.push({
      kind,
      sequence: this.observer.topologyEvents.length + 1,
      tagName,
      targetUrl,
    });
    this.recordCoveredChange(`application-topology:${kind}:${tagName ?? targetUrl ?? "unknown"}`);
  }

  attemptApplicationWindowOpen(targetUrl: string) {
    if (!this.applicationTopologyObserverInstalled) return;
    this.addApplicationTopologyEvent("window-open", null, targetUrl);
  }

  attemptApplicationAuxiliaryElement(tagName: string) {
    if (
      !this.applicationTopologyObserverInstalled ||
      !this.applicationTopologyTags.has(tagName)
    ) return;
    this.addApplicationTopologyEvent("dom-auxiliary-created", tagName, null);
  }

  attemptClosedShadowParserAuxiliaryMarkup(...tagNames: readonly string[]) {
    if (!this.closedShadowTopologyObserverInstalled) return;
    for (const tagName of tagNames) this.attemptApplicationAuxiliaryElement(tagName);
  }

  addHistoryDrift(kind = "history.pushState") {
    this.observer.navigationDrifts.push({
      after: `${origin}/student/lessons/${lessonSlug}?late-history=1`,
      before: `${origin}/student/lessons/${lessonSlug}`,
      kind,
      sequence: this.observer.navigationDrifts.length + 1,
    });
    this.recordCoveredChange(kind);
  }

  addControlEvent(
    type: FakeObserver["events"][number]["type"] = "input",
    controlKey = "value",
    key: string | null = null,
  ) {
    if (!this.controlObserverActive) return false;
    this.forceControlEvent(type, controlKey, key);
    return true;
  }

  forceControlEvent(
    type: FakeObserver["events"][number]["type"] = "input",
    controlKey = "value",
    key: string | null = null,
  ) {
    this.observer.events.push({
      controlKey,
      key,
      sequence: this.observer.events.length + 1,
      type,
    });
    this.recordCoveredChange(`control:${type}:${controlKey}`);
  }

  addButtonClick(controlKey: string) {
    this.addControlEvent("pointerup", controlKey);
    this.addControlEvent("click", controlKey);
  }

  addButtonClickFromAttributes(
    attributes: Readonly<Record<string, string | null | undefined>>,
  ) {
    const controlKey =
      attributes["data-viz-parameter"] ??
      attributes["data-viz-mode"] ??
      attributes["data-viz-action"] ??
      attributes["data-viz-reset-topic-id"] ??
      attributes.name ??
      attributes.id ??
      attributes["aria-label"] ??
      "";
    assert.notEqual(controlKey, "", "fake learner control must expose an observer key");
    this.addButtonClick(controlKey);
    return controlKey;
  }
}

function rewardKey(topicId = selectedTopicId) {
  const digest = createHash("sha256")
    .update(JSON.stringify([userId, moduleId, topicId]), "utf8")
    .digest("hex");
  return `visualization-complete:v2:${digest}`;
}

function mountPayload() {
  return {
    gamification_events: [],
    learning_events: [],
    lesson_progress: [
      {
        lesson_slug: lessonSlug,
        status: "in-progress",
        topic_id: selectedTopicId,
        user_id: userId,
      },
    ],
    reward_point_ledger: [],
    visualization_events: [],
    visualization_sessions: [],
  };
}

function completedPayload() {
  const payload = mountPayload();
  payload.visualization_sessions.push({
    completed_at: completedAt,
    explored: true,
    module_id: moduleId,
    source,
    topic_id: selectedTopicId,
    updated_at: completedAt,
    user_id: userId,
  } as never);
  payload.reward_point_ledger.push({
    amount: 20,
    created_at: completedAt,
    reason: "visualization-complete",
    source_key: rewardKey(),
    student_id: userId,
  } as never);
  payload.gamification_events.push({
    created_at: completedAt,
    economy_version: "v1",
    id: "gamification-browser-adapter",
    reward_points: 20,
    source: "visualization-complete",
    source_key: rewardKey(),
    status: "awarded",
    student_id: userId,
    xp: 45,
  } as never);
  return payload;
}

function sessionEvidence() {
  return {
    completedAt,
    explored: true,
    moduleId,
    source,
    topicId: selectedTopicId,
    updatedAt: completedAt,
  };
}

function durableAck(overrides: Record<string, unknown> = {}) {
  return {
    acknowledgedUserId: userId,
    durablyPersisted: true,
    session: sessionEvidence(),
    ...overrides,
  };
}

function writeAppState(
  databasePath: string,
  payload: unknown,
  revision: number,
  updatedAt: string,
) {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL)",
    );
    database.prepare(
      "INSERT INTO app_state (id, revision, updated_at, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, updated_at = excluded.updated_at, payload = excluded.payload",
    ).run("primary", revision, updatedAt, JSON.stringify(payload));
  } finally {
    database.close();
  }
}

function prepareRun() {
  const runRoot = path.join(
    repositoryRoot,
    ".tmp",
    `visualization-browser-adapter-${process.pid}`,
    randomUUID(),
  );
  const outputDir = path.join(runRoot, "test-results");
  const testOutputDir = path.join(outputDir, "fake-test");
  const databasePath = path.join(runRoot, "database", "app.sqlite");
  const pathManifestPath = path.join(runRoot, "evidence", "starship-path-manifest.json");
  mkdirSync(path.dirname(databasePath), { recursive: true });
  mkdirSync(path.dirname(pathManifestPath), { recursive: true });
  mkdirSync(testOutputDir, { recursive: true });
  const paths = {
    browserProfileEvidencePath: path.join(runRoot, "evidence", "browser-profile.json"),
    browserProcessEvidencePath: path.join(runRoot, "evidence", "browser-processes.json"),
    browserTempDir: path.join(runRoot, "browser-temp"),
    crashDumpDir: path.join(runRoot, "crash-dumps"),
    databasePath,
    e2eRunRoot: runRoot,
    nextDistDir: path.join(runRoot, "next-dist"),
    nextTsconfigPath: path.join(repositoryRoot, `tsconfig.vba-${process.pid}.tmp.json`),
    nodeCompileCacheDir: path.join(runRoot, "node-cache"),
    npmCacheDir: path.join(runRoot, "npm-cache"),
    outputDir,
    pathManifestPath,
    reportDir: path.join(runRoot, "report"),
    repositoryRoot,
    serverCommandOwnerPidPath: path.join(runRoot, "server", "owner.pid"),
    serverLogPath: path.join(runRoot, "server", "server.log"),
  };
  writeFileSync(pathManifestPath, JSON.stringify({
    contract: {
      mutablePathsOnlyOnStarship: true,
      serverCommandOwnerPidSemantics: "shell-command-owner-that-execs-npm-start",
      starshipRoot: "/Volumes/Starship",
    },
    paths,
    runId: `vba-${process.pid}`,
    schemaVersion: 1,
    process: { cwd: repositoryRoot, pid: process.pid, ppid: process.ppid },
    status: "preflight-passed",
  }));
  process.env.PLAYWRIGHT_PATH_MANIFEST_PATH = pathManifestPath;
  writeAppState(databasePath, mountPayload(), 7, mountedAt);
  return { databasePath, paths, testOutputDir };
}

function defaultRootState(): FakeRootState {
  return {
    activeLabId: selectedTopicId,
    controls: [
      {
        ariaPressed: null,
        dataPressed: [
          ["data-viz-mode-active", null],
          ["data-viz-strand-active", null],
          ["data-viz-active", null],
        ],
        key: "value",
        max: "10",
        min: "-10",
        options: [],
        step: "1",
        tag: "input",
        type: "range",
        value: "0",
      },
    ],
    count: 1,
    matchesRootSelector: true,
    moduleId,
    sessionOwner: "first-control-interaction",
    topicId: selectedTopicId,
    visible: true,
  };
}

function fakeTestInfo(outputDir: string, projectOutputDir = path.dirname(outputDir)) {
  return {
    outputDir,
    project: { name: "desktop-chrome", outputDir: projectOutputDir },
    title: "fake visualization durability adapter",
  } as unknown as TestInfo;
}

function createAdapterForPage(
  page: FakePage,
  run: ReturnType<typeof prepareRun>,
  appOrigin = origin,
) {
  return createVisualizationLessonDurabilityBrowserAdapter({
    page: page as unknown as Page,
    testInfo: fakeTestInfo(run.testOutputDir, run.paths.outputDir),
    expected: {
      appOrigin,
      grade,
      lessonSlug,
      moduleId,
      selectedTopicId,
      siblingTopicIds: [siblingTopicId],
      source,
      userId,
    },
    databasePath: run.databasePath,
    rootSelector: `[data-viz-active-lab-id="${selectedTopicId}"]`,
    controlSelector: "input[data-viz-parameter], button[data-viz-mode]",
    readRuntimeDigest: async () => ({ exact: "runtime-digest" }),
  });
}

function jsonRequest(
  pathname: string,
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return new FakeRequest(
    `${origin}${pathname}`,
    "POST",
    JSON.stringify(body),
    headers,
  );
}

async function finishNetworkRequest(
  page: FakePage,
  request: FakeRequest,
  body: unknown,
  status = 200,
) {
  await page.emit("request", request);
  await page.emit(
    "response",
    new FakeResponse(request, status, async () => JSON.stringify(body)) as unknown as Response,
  );
  await page.emit("requestfinished", request as unknown as Request);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function finishNetworkBytes(
  page: FakePage,
  request: FakeRequest,
  bytes: string,
  status = 200,
) {
  await page.emit("request", request);
  await page.emit(
    "response",
    new FakeResponse(request, status, async () => bytes) as unknown as Response,
  );
  await page.emit("requestfinished", request as unknown as Request);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

type Harness = ReturnType<typeof createHarness>;

function createHarness({
  rootState = defaultRootState(),
  runtimeDigest,
}: {
  rootState?: FakeRootState;
  runtimeDigest?: () => unknown;
} = {}) {
  const run = prepareRun();
  const root = new FakeRoot(rootState);
  const page = new FakePage(root);
  const adapter = runtimeDigest
    ? createVisualizationLessonDurabilityBrowserAdapter({
        page: page as unknown as Page,
        testInfo: fakeTestInfo(run.testOutputDir, run.paths.outputDir),
        expected: {
          appOrigin: origin,
          grade,
          lessonSlug,
          moduleId,
          selectedTopicId,
          siblingTopicIds: [siblingTopicId],
          source,
          userId,
        },
        databasePath: run.databasePath,
        rootSelector: `[data-viz-active-lab-id="${selectedTopicId}"]`,
        controlSelector: "input[data-viz-parameter], button[data-viz-mode]",
        readRuntimeDigest: async () => runtimeDigest(),
      })
    : createAdapterForPage(page, run);
  return { adapter, page, root: root as unknown as Locator, run };
}

async function armAndNavigate(harness: Harness) {
  const learnerProfileSetup = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: harness.page as unknown as Page,
    userId,
  });
  await harness.adapter.armBeforeNavigation({ learnerProfileSetup });
  assert.equal(harness.page.initScriptCount, 1);
  harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}`;
}

async function emitLessonStart(page: FakePage) {
  await finishNetworkRequest(
    page,
    jsonRequest("/api/lesson-progress", { action: "start", slug: lessonSlug }),
    {
      lesson: {
        slug: lessonSlug,
        status: "in-progress",
        topicId: selectedTopicId,
      },
    },
  );
}

async function emitEmptyHandshake(page: FakePage) {
  await finishNetworkRequest(
    page,
    jsonRequest("/api/learning-events", { events: [], generation: 0 }),
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: userId,
      dispositions: [],
      durablyPersisted: true,
      generation: 0,
    },
  );
}

async function emitPageView(page: FakePage, ackOverride: unknown = null) {
  const event = {
    grade: "S1",
    id: "page-view-browser-adapter",
    source: "lesson",
    timestamp: mountedAt,
    topicId: `student-lessons-${lessonSlug}`,
    type: "page-view",
  };
  const ack = ackOverride ?? {
    accepted: 1,
    acknowledgedEventIds: [event.id],
    acknowledgedUserId: userId,
    dispositions: [{ disposition: "inserted", id: event.id }],
    durablyPersisted: true,
    generation: 0,
  };
  await finishNetworkRequest(
    page,
    jsonRequest("/api/learning-events", { events: [event], generation: 0 }),
    ack,
  );
}

async function emitMountWrites(
  harness: Harness,
  { includePageView = true }: { includePageView?: boolean } = {},
) {
  await emitLessonStart(harness.page);
  await emitEmptyHandshake(harness.page);
  if (includePageView) await emitPageView(harness.page);
}

async function terminalMount(harness: Harness) {
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  return await harness.adapter.waitForMountTerminal({
    deadlineMs: 500,
    includeRaw: true,
    root: harness.root,
  });
}

async function emitFirstSessionPost(
  harness: Harness,
  responseBody: unknown = durableAck(),
) {
  writeAppState(harness.run.databasePath, completedPayload(), 8, completedAt);
  harness.page.api.sessionResponseBytes = JSON.stringify({ sessions: [sessionEvidence()] });
  const request = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  await finishNetworkRequest(harness.page, request, responseBody);
  return request;
}

async function terminalFirstControl(harness: Harness) {
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await emitFirstSessionPost(harness);
  return await harness.adapter.finishFirstRealControl({
    fence,
    includeRaw: true,
    root: harness.root,
  });
}

async function terminalSecondControl(harness: Harness) {
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  return await harness.adapter.finishSecondRealControl({
    fence,
    root: harness.root,
  });
}

async function armedSecondControlForC10() {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  return { fence, harness };
}

async function armC9Control(ordinal: 1 | 2) {
  const harness = createHarness();
  await terminalMount(harness);
  if (ordinal === 2) await terminalFirstControl(harness);
  const controlKey = ordinal === 1 ? modeControlKey : resetControlKey;
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(controlKey),
    ordinal,
  });
  return { controlKey, fence, harness };
}

async function finishC9Control(
  harness: Harness,
  fence: VisualizationLessonRealControlFence,
  ordinal: 1 | 2,
) {
  if (ordinal === 1) {
    return await harness.adapter.finishFirstRealControl({
      fence,
      includeRaw: true,
      root: harness.root,
    });
  }
  return await harness.adapter.finishSecondRealControl({
    fence,
    root: harness.root,
  });
}

async function fullBrowserFlow() {
  const harness = createHarness();
  await terminalMount(harness);
  const first = await terminalFirstControl(harness);
  await terminalSecondControl(harness);
  return { first, harness };
}

function productionValidProtocolStorageEntries() {
  return [
    { key: learningAnalyticsGenerationStorageKey(userId), raw: JSON.stringify(0) },
    {
      key: learningAnalyticsClearFenceStorageKey(userId),
      raw: JSON.stringify({
        baseGeneration: 0,
        clearedCompletionStorageKeys: [],
        clearedStorageKeys: [],
        completionClaims: [],
        deleteAttemptedAt: null,
        phase: "prepared",
        requestId: "clear-request",
        requestedAt: mountedAt,
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsGenerationHandshakeStorageKey(userId),
      raw: JSON.stringify({
        existingUnconfirmedEventIds: [],
        generation: 0,
        phase: "prepared",
        requestId: "handshake-request",
        startedAt: mountedAt,
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsGenerationTransitionStorageKey(userId),
      raw: JSON.stringify({
        boundaryClearedAt: mountedAt,
        clearedCompletionStorageKeys: [],
        completionClaims: [],
        fromGeneration: 0,
        kind: "forward-clear",
        phase: "prepared",
        preparedAt: mountedAt,
        preserveAllUnconfirmed: false,
        preserveEventIds: [],
        preserveUnconfirmedStorageKeys: [],
        quarantineConfirmedStorageKeys: [],
        quarantineEventIds: [],
        quarantineUnconfirmedStorageKeys: [],
        toGeneration: 1,
        transitionId: "transition-request",
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsBoundaryLineageStorageKey(userId),
      raw: JSON.stringify({
        generation: 0,
        preservedBoundaryTokens: ["boundary-request"],
        userId,
        version: 1,
      }),
    },
  ];
}

function completedMutationRequest(
  pathname: string,
  body: unknown = { reviewerProbe: true },
) {
  return new FakeRequest(
    `${origin}${pathname}`,
    "POST",
    JSON.stringify(body),
    { "content-type": "application/json" },
  );
}

async function flowWithCompletedPostMountMutation(pathname: string, body?: unknown) {
  const harness = createHarness();
  await terminalMount(harness);
  await finishNetworkRequest(
    harness.page,
    completedMutationRequest(pathname, body),
    { acceptedReviewerProbe: true },
  );
  await terminalFirstControl(harness);
  await terminalSecondControl(harness);
  return harness;
}

test("browser durability adapter rejects an off-Starship database before navigation", () => {
  assert.throws(
    () =>
      createVisualizationLessonDurabilityBrowserAdapter({
        page: {} as never,
        testInfo: {} as never,
        expected: {
          appOrigin: origin,
          grade,
          userId,
          moduleId,
          selectedTopicId,
          siblingTopicIds: [siblingTopicId],
          lessonSlug,
          source,
        },
        databasePath: "/tmp/browser-adapter.sqlite",
        rootSelector: "[data-viz-active-lab-id]",
        controlSelector: "[data-viz-parameter]",
        readRuntimeDigest: async () => ({}),
      }),
    /STARSHIP_DATABASE_PATH/,
  );
});

test("learner profile preparation PATCHes the exact skipped setup before adapter arm", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: page as unknown as Page,
    userId,
  });
  assert.deepEqual(page.api.patchBodies, [{
    answers: { challenge: "balanced", goal: "repair", help: "hint" },
    status: "skipped",
  }]);
  assert.equal(receipt.status, "skipped");
  assert.equal(receipt.shouldShowOnboarding, false);
  assert.equal(receipt.userId, userId);
  assert.equal(page.url(), "about:blank");
});

test("learner profile preparation rejects a non-200 PATCH acknowledgement", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  page.api.learnerProfileStatus = 409;
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({ appOrigin: origin, page: page as unknown as Page, userId }),
    /status is not exactly 200/i,
  );
});

test("learner profile preparation rejects malformed response bytes", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  page.api.learnerProfileResponseBytes = "{not-json";
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({ appOrigin: origin, page: page as unknown as Page, userId }),
    /response JSON parsing failed/i,
  );
});

test("learner profile preparation rejects a 200 response with the wrong body contract", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  page.api.learnerProfileResponseBytes = JSON.stringify({
    learnerProfile: { status: "completed", userId },
    shouldShowOnboarding: true,
  });
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({ appOrigin: origin, page: page as unknown as Page, userId }),
    /learner profile setup learnerProfile keys are not exact|exact skipped identity/i,
  );
});

test("learner profile preparation rejects stale server skippedAt and updatedAt timestamps", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  page.api.learnerProfileResponseBytes = JSON.stringify({
    learnerProfile: {
      answers: { challenge: "balanced", goal: "repair", help: "hint" },
      initializedFrom: "login-onboarding",
      questionnaireVersion: "learner-start-v1",
      skippedAt: "2020-01-01T00:00:00.000Z",
      status: "skipped",
      updatedAt: "2020-01-01T00:00:00.000Z",
      userId,
    },
    shouldShowOnboarding: false,
  });
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({
      appOrigin: origin,
      page: page as unknown as Page,
      userId,
    }),
    /exact skipped identity|timestamp|fresh/i,
  );
});

test("learner profile preparation rejects a request that exceeds its bounded preparation window", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  const baseTime = Date.parse("2026-08-11T08:00:00.000Z");
  const serverTime = new Date(baseTime + 1).toISOString();
  page.api.learnerProfileResponseBytes = JSON.stringify({
    learnerProfile: {
      answers: { challenge: "balanced", goal: "repair", help: "hint" },
      initializedFrom: "login-onboarding",
      questionnaireVersion: "learner-start-v1",
      skippedAt: serverTime,
      status: "skipped",
      updatedAt: serverTime,
      userId,
    },
    shouldShowOnboarding: false,
  });
  const originalNow = Date.now;
  let calls = 0;
  try {
    Date.now = () => calls++ === 0 ? baseTime : baseTime + 30_001;
    await assert.rejects(
      prepareVisualizationLessonLearnerProfileBeforeArm({
        appOrigin: origin,
        page: page as unknown as Page,
        userId,
      }),
      /preparation window|fresh/i,
    );
  } finally {
    Date.now = originalNow;
  }
});

test("learner profile preparation fails if navigation happened before or during its PATCH", async () => {
  const alreadyNavigated = new FakePage(new FakeRoot(defaultRootState()));
  alreadyNavigated.currentUrl = `${origin}/student/lessons/${lessonSlug}`;
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({
      appOrigin: origin,
      page: alreadyNavigated as unknown as Page,
      userId,
    }),
    /must run before navigation/i,
  );

  const navigatesDuringPatch = new FakePage(new FakeRoot(defaultRootState()));
  navigatesDuringPatch.api.onLearnerProfilePatch = () => {
    navigatesDuringPatch.currentUrl = `${origin}/student/lessons/${lessonSlug}`;
  };
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({
      appOrigin: origin,
      page: navigatesDuringPatch as unknown as Page,
      userId,
    }),
    /navigated the page unexpectedly/i,
  );
});

test("learner profile preparation rejects a response URL with any origin or target drift", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  page.api.learnerProfileResponseUrl = "https://127.0.0.1:3100/api/me/learner-profile?redirected=1";
  await assert.rejects(
    prepareVisualizationLessonLearnerProfileBeforeArm({
      appOrigin: origin,
      page: page as unknown as Page,
      userId,
    }),
    /response URL|origin|target/i,
  );
});

test("adapter arm rejects a verified receipt from a different Page in the same context", async () => {
  const contextIdentity = {};
  const setupPage = new FakePage(new FakeRoot(defaultRootState()), contextIdentity);
  const targetPage = new FakePage(new FakeRoot(defaultRootState()), contextIdentity);
  const run = prepareRun();
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: setupPage as unknown as Page,
    userId,
  });
  const adapter = createAdapterForPage(targetPage, run);
  await assert.rejects(
    adapter.armBeforeNavigation({ learnerProfileSetup: receipt }),
    /Page\/context|verified learner profile/i,
  );
});

test("C8 adapter arm rejects a context that already contains a second Page", async () => {
  const context = new FakeBrowserContext();
  const page = new FakePage(new FakeRoot(defaultRootState()), context);
  new FakePage(new FakeRoot(defaultRootState()), context);
  const run = prepareRun();
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: page as unknown as Page,
    userId,
  });

  await assert.rejects(
    createAdapterForPage(page, run).armBeforeNavigation({
      learnerProfileSetup: receipt,
    }),
    /browser topology[\s\S]*(?:pageCount=2|pages=2|exactly one Page)/i,
  );
});

test("C8 adapter arm rejects a Page that already contains an auxiliary Frame", async () => {
  const page = new FakePage(new FakeRoot(defaultRootState()));
  await page.attachAuxiliaryFrame();
  const run = prepareRun();
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: page as unknown as Page,
    userId,
  });

  await assert.rejects(
    createAdapterForPage(page, run).armBeforeNavigation({
      learnerProfileSetup: receipt,
    }),
    /browser topology[\s\S]*(?:frameCount=2|frames=2|exactly one main Frame)/i,
  );
});

test("adapter arm rejects learner-profile receipts prepared for a different scheme or port", async () => {
  const run = prepareRun();
  const page = new FakePage(new FakeRoot(defaultRootState()));
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: page as unknown as Page,
    userId,
  });
  for (const driftedOrigin of ["https://127.0.0.1:3100", "http://127.0.0.1:3999"]) {
    await assert.rejects(
      createAdapterForPage(page, run, driftedOrigin).armBeforeNavigation({
        learnerProfileSetup: receipt,
      }),
      /app origin|verified learner profile|Page\/context/i,
    );
  }
});

test("a verified learner-profile receipt is consumed by exactly one adapter arm", async () => {
  const run = prepareRun();
  const page = new FakePage(new FakeRoot(defaultRootState()));
  const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
    appOrigin: origin,
    page: page as unknown as Page,
    userId,
  });
  await createAdapterForPage(page, run).armBeforeNavigation({ learnerProfileSetup: receipt });
  await assert.rejects(
    createAdapterForPage(page, run).armBeforeNavigation({ learnerProfileSetup: receipt }),
    /unconsumed|verified learner profile/i,
  );
});

test("adapter arm rejects a verified learner-profile receipt after its freshness window", async () => {
  const run = prepareRun();
  const page = new FakePage(new FakeRoot(defaultRootState()));
  const baseTime = Date.parse("2026-08-11T08:00:00.000Z");
  page.api.learnerProfileResponseBytes = JSON.stringify({
    learnerProfile: {
      answers: { challenge: "balanced", goal: "repair", help: "hint" },
      initializedFrom: "login-onboarding",
      questionnaireVersion: "learner-start-v1",
      skippedAt: new Date(baseTime).toISOString(),
      status: "skipped",
      updatedAt: new Date(baseTime).toISOString(),
      userId,
    },
    shouldShowOnboarding: false,
  });
  const originalNow = Date.now;
  try {
    Date.now = () => baseTime;
    const receipt = await prepareVisualizationLessonLearnerProfileBeforeArm({
      appOrigin: origin,
      page: page as unknown as Page,
      userId,
    });
    Date.now = () => baseTime + 30_001;
    await assert.rejects(
      createAdapterForPage(page, run).armBeforeNavigation({ learnerProfileSetup: receipt }),
      /fresh|verified learner profile/i,
    );
  } finally {
    Date.now = originalNow;
  }
});

test("adapter arm rejects a structurally plausible but unverified learner-profile receipt", async () => {
  const harness = createHarness();
  await assert.rejects(
    harness.adapter.armBeforeNavigation({
      learnerProfileSetup: {
        method: "PATCH",
        pathname: "/api/me/learner-profile",
        requestBodySha256: "0".repeat(64),
        responseBytes: "{}",
        responseSha256: "0".repeat(64),
        shouldShowOnboarding: false,
        status: "skipped",
        statusCode: 200,
        userId,
      } as never,
    }),
    /verified learner profile setup|learner profile.*receipt/i,
  );
});

test("browser durability adapter rejects a lesson slug not derived from selectedTopicId", () => {
  const run = prepareRun();
  const root = new FakeRoot(defaultRootState());
  const page = new FakePage(root);
  assert.throws(
    () => createVisualizationLessonDurabilityBrowserAdapter({
      page: page as unknown as Page,
      testInfo: fakeTestInfo(run.testOutputDir, run.paths.outputDir),
      expected: {
        appOrigin: origin,
        grade,
        lessonSlug: "fabricated-but-nonempty-slug",
        moduleId,
        selectedTopicId,
        siblingTopicIds: [siblingTopicId],
        source,
        userId,
      },
      databasePath: run.databasePath,
      rootSelector: `[data-viz-active-lab-id="${selectedTopicId}"]`,
      controlSelector: "[data-viz-parameter]",
      readRuntimeDigest: async () => ({}),
    }),
    /lessonSlug.*lessonSlugForTopicId|derived lesson slug/i,
  );
});

test("mount closes only after the exact root, real control, ACKs, stable digest, empty storage, API, and raw state agree", async () => {
  const harness = createHarness();
  const receipt = await terminalMount(harness);
  assert.equal(receipt.rawIncluded, true);
  assert.equal(receipt.durability?.terminal, true);
  assert.equal(receipt.root.controls.length, 1);
  assert.deepEqual(receipt.storage.entries, []);
  assert.deepEqual(receipt.initialStorage.entries, []);
});

test("post-mount malformed analytics protocol controls are poison and hard-fail", async () => {
  const malformedEntries = [
    { key: learningAnalyticsGenerationStorageKey(userId), raw: JSON.stringify({ generation: 0 }) },
    { key: learningAnalyticsClearFenceStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsGenerationHandshakeStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsGenerationTransitionStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsBoundaryLineageStorageKey(userId), raw: JSON.stringify({ generation: 0 }) },
  ];
  for (const malformedEntry of malformedEntries) {
    const harness = createHarness();
    await armAndNavigate(harness);
    await emitMountWrites(harness);
    harness.page.storage.push(malformedEntry);
    await assert.rejects(
      harness.adapter.waitForMountTerminal({
        deadlineMs: 500,
        includeRaw: true,
        root: harness.root,
      }),
      /protocol.*poison|schema.*invalid|corrupt/i,
    );
  }
});

test("post-mount production-valid protocol controls remain audited outside outbox evidence", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  harness.page.storage.push(...productionValidProtocolStorageEntries());
  const receipt = await harness.adapter.waitForMountTerminal({
    deadlineMs: 500,
    includeRaw: true,
    root: harness.root,
  });
  assert.equal(receipt.storage.protocolControlEntries.length, 5);
  assert.equal(receipt.storage.outboxEntries.length, 0);
  assert.equal(receipt.durability?.terminal, true);
});

test("an empty analytics handshake never substitutes for the required non-empty lesson page-view ACK", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness, { includePageView: false });
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 35,
      includeRaw: true,
      root: harness.root,
    }),
    (error: unknown) => {
      assert.equal(error instanceof VisualizationLessonTerminalDeadlineError, true);
      assert.equal(
        (error as VisualizationLessonTerminalDeadlineError).lastReceipt.pending.includes(
          "lesson-page-view-not-acknowledged",
        ),
        true,
      );
      return true;
    },
  );
});

test("C4 mount phase requires exactly one audited analytics handshake", async () => {
  const missingHarness = createHarness();
  await armAndNavigate(missingHarness);
  await emitLessonStart(missingHarness.page);
  await emitPageView(missingHarness.page);
  await assert.rejects(
    missingHarness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: missingHarness.root,
    }),
    /mount mutation ledger|analytics[- ]handshake/i,
  );

  const duplicateHarness = createHarness();
  await armAndNavigate(duplicateHarness);
  await emitMountWrites(duplicateHarness);
  await emitEmptyHandshake(duplicateHarness.page);
  await assert.rejects(
    duplicateHarness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: duplicateHarness.root,
    }),
    /mount mutation ledger|analytics[- ]handshake/i,
  );
});

test("C4 mount phase rejects a non-exact analytics handshake ACK", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitLessonStart(harness.page);
  await finishNetworkRequest(
    harness.page,
    jsonRequest("/api/learning-events", { events: [], generation: 0 }),
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: userId,
      dispositions: [],
      durablyPersisted: false,
      generation: 0,
    },
  );
  await emitPageView(harness.page);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /analytics handshake ACK/i,
  );
});

test("C5 mount phase rejects all five noncanonical semantic write permutations", async () => {
  const wrongOrders = [
    ["start", "page-view", "handshake"],
    ["handshake", "start", "page-view"],
    ["handshake", "page-view", "start"],
    ["page-view", "start", "handshake"],
    ["page-view", "handshake", "start"],
  ] as const;
  for (const order of wrongOrders) {
    const harness = createHarness();
    await armAndNavigate(harness);
    for (const write of order) {
      if (write === "start") await emitLessonStart(harness.page);
      if (write === "handshake") await emitEmptyHandshake(harness.page);
      if (write === "page-view") await emitPageView(harness.page);
    }
    await assert.rejects(
      harness.adapter.waitForMountTerminal({
        deadlineMs: 100,
        includeRaw: true,
        root: harness.root,
      }),
      /semantic mount mutation order|lesson-start.*handshake.*page-view/i,
    );
  }
});

test("C5 mount phase rejects duplicate or missing writes while the honest order remains terminal", async () => {
  const duplicateStart = createHarness();
  await armAndNavigate(duplicateStart);
  await emitLessonStart(duplicateStart.page);
  await emitLessonStart(duplicateStart.page);
  await emitEmptyHandshake(duplicateStart.page);
  await emitPageView(duplicateStart.page);
  await assert.rejects(
    duplicateStart.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: duplicateStart.root }),
    /mount emitted 2 lesson-progress start writes|mount mutation ledger/i,
  );

  const duplicatePageView = createHarness();
  await armAndNavigate(duplicatePageView);
  await emitLessonStart(duplicatePageView.page);
  await emitEmptyHandshake(duplicatePageView.page);
  await emitPageView(duplicatePageView.page);
  await emitPageView(duplicatePageView.page);
  await assert.rejects(
    duplicatePageView.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: duplicatePageView.root }),
    /mount emitted 2 non-empty page-view writes|mount mutation ledger/i,
  );

  const missingStart = createHarness();
  await armAndNavigate(missingStart);
  await emitEmptyHandshake(missingStart.page);
  await emitPageView(missingStart.page);
  await assert.rejects(
    missingStart.adapter.waitForMountTerminal({ deadlineMs: 35, includeRaw: true, root: missingStart.root }),
    /lesson-progress-start-not-acknowledged/i,
  );

  const honest = createHarness();
  const receipt = await terminalMount(honest);
  assert.equal(receipt.networkRequestCount, 3);
});

test("a fabricated page-view with an extra key cannot satisfy the mount lifecycle", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitLessonStart(harness.page);
  await emitEmptyHandshake(harness.page);
  const event = {
    fabricated: true,
    grade: "S1",
    id: "page-view-fabricated-extra-key",
    source: "lesson",
    timestamp: mountedAt,
    topicId: `student-lessons-${lessonSlug}`,
    type: "page-view",
  };
  await finishNetworkRequest(
    harness.page,
    jsonRequest("/api/learning-events", { events: [event], generation: 0 }),
    {
      accepted: 1,
      acknowledgedEventIds: [event.id],
      acknowledgedUserId: userId,
      dispositions: [{ disposition: "inserted", id: event.id }],
      durablyPersisted: true,
      generation: 0,
    },
  );
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /mount write allowlist failed|page-view.*exact/i,
  );
});

test("a lesson page-view for the wrong grade cannot satisfy the mount lifecycle", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitLessonStart(harness.page);
  await emitEmptyHandshake(harness.page);
  const event = {
    grade: "P1",
    id: "page-view-wrong-grade",
    source: "lesson",
    timestamp: mountedAt,
    topicId: `student-lessons-${lessonSlug}`,
    type: "page-view",
  };
  await finishNetworkRequest(
    harness.page,
    jsonRequest("/api/learning-events", { events: [event], generation: 0 }),
    {
      accepted: 1,
      acknowledgedEventIds: [event.id],
      acknowledgedUserId: userId,
      dispositions: [{ disposition: "inserted", id: event.id }],
      durablyPersisted: true,
      generation: 0,
    },
  );
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /mount write allowlist failed|page-view.*exact/i,
  );
});

test("mount refuses a navigated lesson pathname that is not the derived lesson slug", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}-wrong`;
  await emitMountWrites(harness);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /lesson page URL|lesson pathname|navigated.*lesson/i,
  );
});

test("a restored history drift remains an irreversible mount failure", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  harness.page.observer.navigationDrifts.push({
    after: `${origin}/student/lessons/${lessonSlug}?transient=1`,
    before: `${origin}/student/lessons/${lessonSlug}`,
    kind: "history.pushState",
    sequence: 1,
  });
  await assert.rejects(
    harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
    /history|navigation.*drift|irreversible/i,
  );
});

test("a restored main-frame navigation remains an irreversible post-mount failure", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}?transient=1`;
  await harness.page.emit("framenavigated", harness.page.mainFrameIdentity);
  harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}`;
  await assert.rejects(
    harness.adapter.armRealControl({
      expectedButtonClick: expectedButtonClick(modeControlKey),
      ordinal: 1,
    }),
    /main-frame navigation drift|hard browser evidence/i,
  );
});

test("a local app API mutation from the wrong scheme, host, or port cannot join the durability receipt", async () => {
  for (const driftedOrigin of [
    "https://127.0.0.1:3100",
    "http://localhost:3100",
    "http://127.0.0.1:3999",
  ]) {
    const harness = createHarness();
    await armAndNavigate(harness);
    await finishNetworkRequest(
      harness.page,
      new FakeRequest(
        `${driftedOrigin}/api/learning-events`,
        "POST",
        JSON.stringify({ events: [], generation: 0 }),
        { "content-type": "application/json" },
      ),
      {
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: userId,
        dispositions: [],
        durablyPersisted: true,
        generation: 0,
      },
    );
    await emitMountWrites(harness);
    await assert.rejects(
      harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
      /origin|scheme\/host\/port/i,
    );
  }
});

test("a query-bearing lesson-progress mutation cannot satisfy the exact durability target", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await finishNetworkRequest(
    harness.page,
    new FakeRequest(
      `${origin}/api/lesson-progress?fabricated=1`,
      "POST",
      JSON.stringify({ action: "start", slug: lessonSlug }),
      { "content-type": "application/json" },
    ),
    { lesson: { slug: lessonSlug, status: "in-progress", topicId: selectedTopicId } },
  );
  await emitEmptyHandshake(harness.page);
  await emitPageView(harness.page);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
    /query|hash|exact.*target|URL/i,
  );
});

test("query or hash drift is rejected for learning-events and visualization-session mutations", async () => {
  const mountHarness = createHarness();
  await armAndNavigate(mountHarness);
  await emitLessonStart(mountHarness.page);
  await finishNetworkRequest(
    mountHarness.page,
    new FakeRequest(
      `${origin}/api/learning-events#fabricated`,
      "POST",
      JSON.stringify({ events: [], generation: 0 }),
      { "content-type": "application/json" },
    ),
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: userId,
      dispositions: [],
      durablyPersisted: true,
      generation: 0,
    },
  );
  await emitPageView(mountHarness.page);
  await assert.rejects(
    mountHarness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: mountHarness.root,
    }),
    /search\/hash|target is not exact|URL/i,
  );

  const sessionHarness = createHarness();
  await terminalMount(sessionHarness);
  const fence = await sessionHarness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  sessionHarness.page.addButtonClick(modeControlKey);
  writeAppState(sessionHarness.run.databasePath, completedPayload(), 8, completedAt);
  sessionHarness.page.api.sessionResponseBytes = JSON.stringify({ sessions: [sessionEvidence()] });
  await finishNetworkRequest(
    sessionHarness.page,
    new FakeRequest(
      `${origin}/api/visualization-sessions?fabricated=1`,
      "POST",
      JSON.stringify({ moduleId, source, topicId: selectedTopicId }),
      {
        "content-type": "application/json",
        "x-mais-visualization-user-id": encodeURIComponent(userId),
      },
    ),
    durableAck(),
  );
  await assert.rejects(
    sessionHarness.adapter.finishFirstRealControl({
      fence,
      includeRaw: true,
      root: sessionHarness.root,
    }),
    /search\/hash|target is not exact|URL/i,
  );
});

test("a completed same-origin mutation with a 4xx or 5xx response hard-fails browser durability", async () => {
  for (const status of [409, 503]) {
    const harness = createHarness();
    await armAndNavigate(harness);
    await finishNetworkRequest(
      harness.page,
      jsonRequest("/api/learning-events", { events: [], generation: 0 }),
      { error: "rejected" },
      status,
    );
    await emitMountWrites(harness);
    await assert.rejects(
      harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
      new RegExp(`non-2xx.*${status}|mutation.*${status}|status.*${status}`, "i"),
    );
  }
});

test("a completed same-origin non-API mutation cannot evade the non-2xx gate", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await finishNetworkRequest(
    harness.page,
    new FakeRequest(
      `${origin}/student/lessons/${lessonSlug}`,
      "POST",
      JSON.stringify({ serverAction: "forged" }),
      { "content-type": "application/json" },
    ),
    { error: "rejected" },
    422,
  );
  await emitMountWrites(harness);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
    /non-2xx.*422|mutation.*422|status.*422/i,
  );
});

test("a fabricated first-session ACK cannot authorize browser durability", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await emitFirstSessionPost(harness, durableAck({ acknowledgedUserId: "fabricated-user" }));
  await assert.rejects(
    harness.adapter.finishFirstRealControl({ fence, includeRaw: true, root: harness.root }),
    /browser session ACK\/API identity is not exact/i,
  );
});

test("request and response JSON parsing failures are hard evidence failures", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  const malformedRequest = new FakeRequest(
    `${origin}/api/lesson-progress`,
    "POST",
    "{not-json",
    { "content-type": "application/json" },
  );
  await finishNetworkBytes(harness.page, malformedRequest, "{also-not-json");
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /hard browser evidence failure.*parsing failed/i,
  );
});

test("APIRequestContext session rereads reject response URL drift before accepting bytes", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  harness.page.api.sessionResponseUrl = `${origin}/api/visualization-sessions?redirected=1`;
  await assert.rejects(
    harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
    /API response URL target drifted/i,
  );
});

test("same-route concurrent requests retain request-object identity until both response bytes and requestfinished arrive", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  const concurrent = jsonRequest("/api/lesson-progress", {
    action: "start",
    slug: lessonSlug,
  });
  let releaseResponse!: (value: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });
  await harness.page.emit("request", concurrent as unknown as Request);
  await harness.page.emit(
    "response",
    new FakeResponse(concurrent, 200, async () => await responseBytes) as unknown as Response,
  );
  await harness.page.emit("requestfinished", concurrent as unknown as Request);

  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 35,
      includeRaw: true,
      root: harness.root,
    }),
    (error: unknown) => {
      assert.equal(error instanceof VisualizationLessonTerminalDeadlineError, true);
      assert.equal(
        (error as VisualizationLessonTerminalDeadlineError).lastReceipt.pending.includes(
          "relevant-write-in-flight",
        ),
        true,
      );
      return true;
    },
  );
  releaseResponse(JSON.stringify({ lesson: { slug: lessonSlug, status: "in-progress", topicId: selectedTopicId } }));
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test("any versioned outbox, quarantine, corrupt, or completion storage parse failure fails closed", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  harness.page.storage.push({
    key: `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(userId)}:confirmed:bad`,
    raw: "{bad-json",
  });
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 100,
      includeRaw: true,
      root: harness.root,
    }),
    /storage JSON parsing failed/i,
  );
});

test("all protocol-control and outbox families are included in the exact pre-navigation empty-state gate", async () => {
  const encodedUserId = encodeURIComponent(userId);
  const staleEntries = [
    {
      key: learningAnalyticsGenerationStorageKey(userId),
      raw: JSON.stringify(0),
    },
    {
      key: learningAnalyticsClearFenceStorageKey(userId),
      raw: JSON.stringify({
        baseGeneration: 0,
        clearedCompletionStorageKeys: [],
        clearedStorageKeys: [],
        completionClaims: [],
        deleteAttemptedAt: null,
        phase: "prepared",
        requestId: "stale-clear",
        requestedAt: mountedAt,
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsGenerationHandshakeStorageKey(userId),
      raw: JSON.stringify({
        existingUnconfirmedEventIds: [],
        generation: 0,
        phase: "prepared",
        requestId: "stale-handshake",
        startedAt: mountedAt,
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsGenerationTransitionStorageKey(userId),
      raw: JSON.stringify({
        boundaryClearedAt: mountedAt,
        clearedCompletionStorageKeys: [],
        completionClaims: [],
        fromGeneration: 0,
        kind: "forward-clear",
        phase: "prepared",
        preparedAt: mountedAt,
        preserveAllUnconfirmed: false,
        preserveEventIds: [],
        preserveUnconfirmedStorageKeys: [],
        quarantineConfirmedStorageKeys: [],
        quarantineEventIds: [],
        quarantineUnconfirmedStorageKeys: [],
        toGeneration: 1,
        transitionId: "stale-transition",
        userId,
        version: 2,
      }),
    },
    {
      key: learningAnalyticsBoundaryLineageStorageKey(userId),
      raw: JSON.stringify({
        generation: 0,
        preservedBoundaryTokens: [],
        userId,
        version: 1,
      }),
    },
    {
      key: `mais:learning-analytics-outbox:v2:${encodedUserId}:stale-event/generation/0`,
      raw: JSON.stringify({ id: "stale-confirmed" }),
    },
    {
      key: `mais:learning-analytics-unconfirmed-outbox:v1:${encodedUserId}:stale-event/generation/0`,
      raw: JSON.stringify({ id: "stale-unconfirmed" }),
    },
    {
      key: `mais:visualization-session-outbox:v1:${encodedUserId}/${encodeURIComponent(moduleId)}/${encodeURIComponent(selectedTopicId)}/revision/${encodeURIComponent(source)}/1`,
      raw: JSON.stringify({
        moduleId,
        queuedAt: 1,
        source,
        topicId: selectedTopicId,
        userId,
      }),
    },
  ];
  for (const staleEntry of staleEntries) {
    const harness = createHarness();
    harness.page.observer.initialStorage = [staleEntry];
    await armAndNavigate(harness);
    await emitMountWrites(harness);
    await assert.rejects(
      harness.adapter.waitForMountTerminal({
        deadlineMs: 100,
        includeRaw: false,
        root: harness.root,
      }),
      /pre-navigation durability storage must be exactly empty/i,
    );
  }
});

test("zero visible enabled learner controls remains pending until the explicit deadline", async () => {
  const rootState = defaultRootState();
  rootState.controls = [];
  const harness = createHarness({ rootState });
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 35,
      includeRaw: true,
      root: harness.root,
    }),
    (error: unknown) => {
      assert.equal(error instanceof VisualizationLessonTerminalDeadlineError, true);
      assert.equal(
        (error as VisualizationLessonTerminalDeadlineError).lastReceipt.pending.includes(
          "learner-control-not-ready",
        ),
        true,
      );
      return true;
    },
  );
});

test("a renderer digest that never repeats cannot be converted into a sleep-based pass", async () => {
  let revision = 0;
  const harness = createHarness({ runtimeDigest: () => ({ revision: ++revision }) });
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 35,
      includeRaw: true,
      root: harness.root,
    }),
    (error: unknown) => {
      assert.equal(error instanceof VisualizationLessonTerminalDeadlineError, true);
      assert.equal(
        (error as VisualizationLessonTerminalDeadlineError).lastReceipt.pending.includes(
          "terminal-digest-not-stable",
        ),
        true,
      );
      return true;
    },
  );
});

test("the second UI fence rejects an absent real control event", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /second real-control event is absent/i,
  );
});

test("C9 both fences reject an exact button click observed on a different learner control", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const { fence, harness } = await armC9Control(ordinal);
      harness.page.addButtonClick(`different-control-${ordinal}`);
      assert.deepEqual(
        harness.page.observer.events.slice(fence.eventCount).map(({ type }) => type),
        ["pointerup", "click"],
        "the fake Playwright button-click contract must emit pointerup then click",
      );
      await assert.rejects(
        finishC9Control(harness, fence, ordinal),
        /expected.*control|control.*key|button click/i,
      );
    });
  }
});

test("C9 both fences reject an extra other-control input before, between, or after the click", async (t) => {
  for (const ordinal of [1, 2] as const) {
    for (const position of ["before", "between", "after"] as const) {
      await t.test(`ordinal ${ordinal} extra ${position}`, async () => {
        const { controlKey, fence, harness } = await armC9Control(ordinal);
        const addExtra = () => harness.page.addControlEvent(
          "input",
          `other-range-${ordinal}`,
        );
        if (position === "before") addExtra();
        harness.page.addControlEvent("pointerup", controlKey);
        if (position === "between") addExtra();
        harness.page.addControlEvent("click", controlKey);
        if (position === "after") addExtra();

        await assert.rejects(
          finishC9Control(harness, fence, ordinal),
          /exactly 2 observer events|button click/i,
        );
      });
    }
  }
});

test("C9 both fences reject a duplicate click on the expected control", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const { controlKey, fence, harness } = await armC9Control(ordinal);
      harness.page.addButtonClick(controlKey);
      harness.page.addControlEvent("click", controlKey);

      await assert.rejects(
        finishC9Control(harness, fence, ordinal),
        /exactly 2 observer events|button click/i,
      );
    });
  }
});

test("C9 both fences reject a missing pointerup or missing click", async (t) => {
  for (const ordinal of [1, 2] as const) {
    for (const missing of ["pointerup", "click"] as const) {
      await t.test(`ordinal ${ordinal} missing ${missing}`, async () => {
        const { controlKey, fence, harness } = await armC9Control(ordinal);
        harness.page.addControlEvent(
          missing === "pointerup" ? "click" : "pointerup",
          controlKey,
        );

        await assert.rejects(
          finishC9Control(harness, fence, ordinal),
          /exactly 2 observer events|exact button click/i,
        );
      });
    }
  }
});

test("C9 both fences reject reversed click then pointerup event order", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const { controlKey, fence, harness } = await armC9Control(ordinal);
      harness.page.addControlEvent("click", controlKey);
      harness.page.addControlEvent("pointerup", controlKey);

      await assert.rejects(
        finishC9Control(harness, fence, ordinal),
        /observer delta is not exact|button click/i,
      );
    });
  }
});

test("C9 both fences reject a non-null keyboard key on button-click evidence", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const { controlKey, fence, harness } = await armC9Control(ordinal);
      harness.page.addControlEvent("pointerup", controlKey, "Enter");
      harness.page.addControlEvent("click", controlKey);

      await assert.rejects(
        finishC9Control(harness, fence, ordinal),
        /observer delta is not exact|"key":"Enter"|button click/i,
      );
    });
  }
});

test("C9 both fences reject a sequence gap or duplicate sequence", async (t) => {
  for (const ordinal of [1, 2] as const) {
    for (const defect of ["gap", "duplicate"] as const) {
      await t.test(`ordinal ${ordinal} ${defect}`, async () => {
        const { controlKey, fence, harness } = await armC9Control(ordinal);
        harness.page.addButtonClick(controlKey);
        const clickEvent = harness.page.observer.events[fence.eventCount + 1]!;
        clickEvent.sequence = defect === "gap"
          ? fence.eventCount + 3
          : fence.eventCount + 1;

        await assert.rejects(
          finishC9Control(harness, fence, ordinal),
          /observer delta is not exact|sequence|button click/i,
        );
      });
    }
  }
});

test("C9 public API requires exact expected identity at arm and forbids finish-time self-attestation", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  if (false) {
    // @ts-expect-error C9 producers must bind expected control identity when arming.
    void harness.adapter.armRealControl({ ordinal: 1 });
  }
  const armUnknown = harness.adapter.armRealControl as unknown as (
    input: unknown,
  ) => Promise<unknown>;
  const malformedArms: unknown[] = [
    { ordinal: 1 },
    {
      expectedButtonClick: expectedButtonClick(modeControlKey),
      fabricated: true,
      ordinal: 1,
    },
    {
      expectedButtonClick: {
        ...expectedButtonClick(modeControlKey),
        fabricated: true,
      },
      ordinal: 1,
    },
    ...["", " padded", "not/canonical"].map((controlKey) => ({
      expectedButtonClick: expectedButtonClick(controlKey),
      ordinal: 1,
    })),
    ...[
      [],
      ["click", "pointerup"],
      ["pointerup", "click", "input"],
    ].map((eventTypes) => ({
      expectedButtonClick: { controlKey: modeControlKey, eventTypes },
      ordinal: 1,
    })),
  ];
  const eventTypesWithExtraKey = ["pointerup", "click"];
  Object.assign(eventTypesWithExtraKey, { fabricated: true });
  malformedArms.push({
    expectedButtonClick: {
      controlKey: modeControlKey,
      eventTypes: eventTypesWithExtraKey,
    },
    ordinal: 1,
  });
  for (const malformed of malformedArms) {
    await assert.rejects(
      armUnknown(malformed),
      /keys are not exact|canonical|exact button-click tuple|exactly \[pointerup, click\]/i,
    );
  }

  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await emitFirstSessionPost(harness);
  if (false) {
    void harness.adapter.finishFirstRealControl({
      fence,
      includeRaw: true,
      root: harness.root,
      // @ts-expect-error C9 finish cannot self-attest a different expected identity.
      expectedButtonClick: expectedButtonClick("finish-time-forgery"),
    });
  }
  const finishUnknown = harness.adapter.finishFirstRealControl as unknown as (
    input: unknown,
  ) => Promise<unknown>;
  await assert.rejects(
    finishUnknown({
      expectedButtonClick: expectedButtonClick("finish-time-forgery"),
      fence,
      includeRaw: true,
      root: harness.root,
    }),
    /finish input keys are not exact/i,
  );
});

test("C9 both fences snapshot and freeze mutable caller expectations before awaiting", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const harness = createHarness();
      await terminalMount(harness);
      if (ordinal === 2) await terminalFirstControl(harness);
      const controlKey = ordinal === 1 ? modeControlKey : resetControlKey;
      const mutableExpected: {
        controlKey: string;
        eventTypes: ["pointerup", "click"];
      } = {
        controlKey,
        eventTypes: ["pointerup", "click"],
      };
      const fencePromise = harness.adapter.armRealControl({
        expectedButtonClick: mutableExpected,
        ordinal,
      });
      mutableExpected.controlKey = "caller-mutated-key";
      (mutableExpected.eventTypes as string[]).reverse();
      const fence = await fencePromise;

      assert.notEqual(fence.expectedControl, mutableExpected);
      assert.deepEqual(fence.expectedControl, expectedButtonClick(controlKey));
      assert.equal(Object.isFrozen(fence.expectedControl), true);
      assert.equal(Object.isFrozen(fence.expectedControl.eventTypes), true);
      harness.page.addButtonClick(controlKey);
      if (ordinal === 1) await emitFirstSessionPost(harness);
      const receipt = await finishC9Control(harness, fence, ordinal);
      assert.deepEqual(receipt.expectedControl, expectedButtonClick(controlKey));
    });
  }
});

test("C9 both fences reject foreign, fabricated-expectation, and stale reuse", async (t) => {
  for (const ordinal of [1, 2] as const) {
    await t.test(`ordinal ${ordinal}`, async () => {
      const primary = await armC9Control(ordinal);
      const foreign = await armC9Control(ordinal);
      primary.harness.page.addButtonClick(primary.controlKey);
      if (ordinal === 1) await emitFirstSessionPost(primary.harness);

      await assert.rejects(
        finishC9Control(primary.harness, foreign.fence, ordinal),
        /control fence is foreign, stale, or fabricated/i,
      );

      const fabricatedFence = structuredClone(primary.fence) as {
        -readonly [Key in keyof VisualizationLessonRealControlFence]:
          VisualizationLessonRealControlFence[Key];
      };
      fabricatedFence.expectedControl = expectedButtonClick("fabricated-control");
      await assert.rejects(
        finishC9Control(
          primary.harness,
          fabricatedFence as VisualizationLessonRealControlFence,
          ordinal,
        ),
        /control fence is foreign, stale, or fabricated/i,
      );

      await finishC9Control(primary.harness, primary.fence, ordinal);
      await assert.rejects(
        finishC9Control(primary.harness, primary.fence, ordinal),
        /may finish exactly once/i,
      );
    });
  }
});

test("C9 mode then reset button clicks expose exact frozen control identity and events", async () => {
  const harness = createHarness();
  await terminalMount(harness);

  const observerFallback = [
    'control.getAttribute("data-viz-parameter")',
    'control.getAttribute("data-viz-mode")',
    'control.getAttribute("data-viz-action")',
    'control.getAttribute("data-viz-reset-topic-id")',
    'control.getAttribute("name")',
    "control.id",
    'control.getAttribute("aria-label")',
  ];
  let fallbackCursor = -1;
  for (const fallback of observerFallback) {
    const next = harness.page.initScriptSource.indexOf(fallback, fallbackCursor);
    assert.ok(next > fallbackCursor, `observer fallback is absent or reordered: ${fallback}`);
    fallbackCursor = next;
  }

  const firstFence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  assert.equal(
    harness.page.addButtonClickFromAttributes({
      "aria-label": "fallback-must-not-win",
      "data-viz-mode": modeControlKey,
    }),
    modeControlKey,
  );
  await emitFirstSessionPost(harness);
  const first = await harness.adapter.finishFirstRealControl({
    fence: firstFence,
    includeRaw: true,
    root: harness.root,
  });

  const secondFence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  assert.equal(
    harness.page.addButtonClickFromAttributes({
      "aria-label": "fallback-must-not-win",
      "data-viz-reset-topic-id": resetControlKey,
    }),
    resetControlKey,
  );
  const second = await harness.adapter.finishSecondRealControl({
    fence: secondFence,
    root: harness.root,
  });

  assert.deepEqual(first.expectedControl, expectedButtonClick(modeControlKey));
  assert.deepEqual(first.controlEvents, [
    { controlKey: modeControlKey, key: null, sequence: 1, type: "pointerup" },
    { controlKey: modeControlKey, key: null, sequence: 2, type: "click" },
  ]);
  assert.deepEqual(second.expectedControl, expectedButtonClick(resetControlKey));
  assert.deepEqual(second.controlEvents, [
    { controlKey: resetControlKey, key: null, sequence: 3, type: "pointerup" },
    { controlKey: resetControlKey, key: null, sequence: 4, type: "click" },
  ]);
  for (const value of [
    firstFence,
    firstFence.expectedControl,
    firstFence.expectedControl.eventTypes,
    first,
    first.expectedControl,
    first.controlEvents,
    ...first.controlEvents,
    secondFence,
    secondFence.expectedControl,
    secondFence.expectedControl.eventTypes,
    second,
    second.expectedControl,
    second.controlEvents,
    ...second.controlEvents,
  ]) assert.equal(Object.isFrozen(value), true);

  const final = await harness.adapter.finalReceipt();
  assert.deepEqual(final.expectedControl, {
    first: expectedButtonClick(modeControlKey),
    second: expectedButtonClick(resetControlKey),
  });
  assert.deepEqual(final.controlEvents, {
    first: first.controlEvents,
    second: second.controlEvents,
  });
  assert.equal(Object.isFrozen(final.expectedControl), true);
  assert.equal(Object.isFrozen(final.controlEvents), true);
});

test("C9 raw replay rejects a structurally identical fabricated first receipt", async () => {
  const { first, harness } = await fullBrowserFlow();
  const fabricated = structuredClone(first) as VisualizationLessonBrowserFirstInteractionReceipt;
  harness.page.api.replayResponseBytes = first.response.bytes;

  await assert.rejects(
    harness.adapter.replayFirstDeliveryExactly({ first: fabricated }),
    /exact first receipt|this adapter's exact first receipt/i,
  );
});

test("C10 producer plan controls after the atomic stop do not extend the exact two-click ledger", async () => {
  const { harness } = await fullBrowserFlow();
  const stoppedEvents = structuredClone(harness.page.observer.events);
  const stoppedEpoch = harness.page.sealEpoch;

  assert.equal(harness.page.addControlEvent("pointerup", "post-probe-mode"), false);
  assert.equal(harness.page.addControlEvent("click", "post-probe-mode"), false);
  assert.equal(harness.page.addControlEvent("input", "post-probe-range"), false);
  assert.equal(harness.page.addControlEvent("change", "post-probe-range"), false);
  assert.equal(harness.page.addControlEvent("pointerup", resetControlKey), false);
  assert.equal(harness.page.addControlEvent("click", resetControlKey), false);
  assert.deepEqual(harness.page.observer.events, stoppedEvents);
  assert.equal(harness.page.sealEpoch, stoppedEpoch);

  const final = await harness.adapter.finalReceipt();
  assert.deepEqual(final.controlEvents, {
    first: [
      { controlKey: modeControlKey, key: null, sequence: 1, type: "pointerup" },
      { controlKey: modeControlKey, key: null, sequence: 2, type: "click" },
    ],
    second: [
      { controlKey: resetControlKey, key: null, sequence: 3, type: "pointerup" },
      { controlKey: resetControlKey, key: null, sequence: 4, type: "click" },
    ],
  });
});

test("C10 atomic stop rejects a mutated first-click prefix before sealing the second receipt", async () => {
  const { fence, harness } = await armedSecondControlForC10();
  harness.page.observer.events[0] = {
    ...harness.page.observer.events[0]!,
    controlKey: "mutated-first-prefix",
  };

  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /atomic control observer stop|non-exact active four-event state|first-plus-second/i,
  );
  assert.equal(harness.page.controlObserverActive, false);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverStopReceipt, null);
});

test("C10 atomic stop rejects an extra event arriving immediately before validation", async () => {
  const { fence, harness } = await armedSecondControlForC10();
  harness.page.controlObserverStopBeforeValidationHooks.push(() => {
    harness.page.forceControlEvent("input", "stop-boundary-before");
  });

  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /atomic control observer stop|non-exact active four-event state/i,
  );
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopReceipt, null);
});

test("C10 atomic stop rejects synchronous event injection between validation and removal", async () => {
  const { fence, harness } = await armedSecondControlForC10();
  harness.page.controlObserverStopAfterValidationHooks.push(() => {
    harness.page.forceControlEvent("click", "stop-boundary-inside");
  });

  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /atomic control observer stop|ledger or lifecycle changed/i,
  );
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopReceipt, null);
});

test("C10 failed stop cleans every observer exactly once before or after control removal", async (t) => {
  for (const failure of ["before-removal", "after-removal"] as const) {
    await t.test(failure, async () => {
      const { fence, harness } = await armedSecondControlForC10();
      const context = harness.page.contextIdentity as FakeBrowserContext;
      harness.page.controlObserverStopFailure = failure;

      await assert.rejects(
        harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
        /atomic control observer stop|fake control observer stop failed/i,
      );
      assert.equal(harness.page.controlObserverActive, false);
      assert.equal(harness.page.controlObserverFrozenEventCount, 4);
      assert.equal(harness.page.controlObserverLedgerFrozen, true);
      assert.equal(harness.page.controlObserverRemovalCount, 1);
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.controlObserverStopReceipt, null);
      assert.equal(Object.isFrozen(harness.page.observer.events), true);
      assert.equal(
        harness.page.observer.events.every((event) => Object.isFrozen(event)),
        true,
      );
      assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
      assert.equal(harness.page.storageEventObserverStopCalls, 1);
      assert.equal(context.removedPageListeners, 1);
      assert.equal(
        [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
        8,
      );
      await assert.rejects(
        harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
        /finish exactly once|already failed/i,
      );
      await assert.rejects(
        harness.adapter.finalReceipt(),
        /requires learner profile setup|second control evidence/i,
      );
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
      assert.equal(harness.page.storageEventObserverStopCalls, 1);
      assert.equal(context.removedPageListeners, 1);
    });
  }
});

test("C10 concurrent and repeated second finishes own one atomic stop", async () => {
  const { fence, harness } = await armedSecondControlForC10();
  const concurrent = await Promise.allSettled([
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
  ]);

  assert.equal(concurrent.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(concurrent.filter(({ status }) => status === "rejected").length, 1);
  const rejected = concurrent.find(({ status }) => status === "rejected");
  assert.match(String(rejected && rejected.status === "rejected" ? rejected.reason : ""), /finish exactly once|already running/i);
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverRemovalCount, 1);

  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /finish exactly once|already sealed/i,
  );
  assert.equal(harness.page.controlObserverStopCalls, 1);
});

test("C10 forged stop return receipts fail closed after one real removal", async (t) => {
  for (const defect of ["missing-key", "extra-key", "wrong-digest"] as const) {
    await t.test(defect, async () => {
      const { fence, harness } = await armedSecondControlForC10();
      harness.page.controlObserverStopReturnTransform = (value) => {
        const forged = value as Record<string, unknown>;
        if (defect === "missing-key") delete forged.eventsSha256;
        if (defect === "extra-key") forged.fabricated = true;
        if (defect === "wrong-digest") forged.eventsSha256 = "0".repeat(64);
        return forged;
      };

      await assert.rejects(
        harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
        /atomic control observer stop receipt|keys are not exact|does not prove/i,
      );
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.controlObserverRemovalCount, 1);
    });
  }
});

test("C10 the protected browser stop receipt rejects structural replacement and remains deeply frozen", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const second = await terminalSecondControl(harness);
  const exactStop = second.controlObserverStop;
  const browserStopBeforeForgery = harness.page.controlObserverStopReceipt;
  const fabricated = structuredClone(exactStop);

  assert.equal(
    Reflect.set(harness.page, "controlObserverStopReceipt", fabricated),
    false,
  );
  assert.equal(harness.page.controlObserverStopReceipt, browserStopBeforeForgery);
  assert.deepEqual(harness.page.controlObserverStopReceipt, exactStop);
  for (const frozen of [
    exactStop,
    exactStop.events,
    ...exactStop.events,
    exactStop.removedEventTypes,
  ]) assert.equal(Object.isFrozen(frozen), true);

  const final = await harness.adapter.finalReceipt();
  assert.equal(final.controlObserverStop, exactStop);
  assert.equal(final.second.controlObserverStop, exactStop);
  assert.deepEqual(final.controlObserverStop, {
    active: false,
    adapterId: exactStop.adapterId,
    eventCount: 4,
    events: [...final.controlEvents.first, ...final.controlEvents.second],
    eventsSha256: exactStop.eventsSha256,
    lastSequence: 4,
    removalCount: 1,
    removedEventTypes: ["change", "click", "input", "keyup", "pointerup"],
    removedExactlyOnce: true,
    removedListenerCount: 5,
    stopId: `${exactStop.adapterId}:control-observer-stop:1`,
  });
  assert.equal(Object.isFrozen(final.controlObserverStop), true);
});

test("C10 final rejects a forced browser stop-receipt mutation after the exact second finish", async () => {
  const { harness } = await fullBrowserFlow();
  const exactStop = harness.page.controlObserverStopReceipt!;
  harness.page.forceControlObserverStopReceiptForTest({
    ...structuredClone(exactStop),
    eventsSha256: "0".repeat(64),
  });

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /interaction observer stop receipt|does not prove|final control observer/i,
  );
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
  assert.equal(harness.page.storageEventObserverStopCalls, 1);
});

test("C10 post-stop non-control observers remain active and reject every forbidden terminal side effect", async (t) => {
  for (const defect of ["network", "storage", "navigation", "history", "topology"] as const) {
    await t.test(defect, async () => {
      const { harness } = await fullBrowserFlow();
      const context = harness.page.contextIdentity as FakeBrowserContext;
      assert.equal(harness.page.controlObserverActive, false);
      assert.equal(harness.page.controlObserverRemovalCount, 1);
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.applicationTopologyObserverInstalled, true);
      assert.equal(harness.page.storageEventObserverInstalled, true);
      assert.equal(context.listeners.get("page")?.length, 1);
      for (const event of [
        "frameattached",
        "framedetached",
        "framenavigated",
        "popup",
        "request",
        "requestfailed",
        "requestfinished",
        "response",
      ] as const) assert.equal(harness.page.listeners.get(event)?.length, 1);

      if (defect === "network") {
        await finishNetworkRequest(
          harness.page,
          jsonRequest(
            "/api/visualization-sessions",
            { moduleId, source, topicId: selectedTopicId },
            {
              "content-type": "application/json",
              "x-mais-visualization-user-id": encodeURIComponent(userId),
            },
          ),
          durableAck(),
        );
      } else if (defect === "storage") {
        harness.page.setStorageFromExternalSameOriginDocument(
          `mais:visualization-session-outbox-quarantine:v1:${encodeURIComponent(userId)}:post-stop`,
          JSON.stringify({ id: "post-stop-poison" }),
        );
      } else if (defect === "navigation") {
        harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}?post-stop=1`;
      } else if (defect === "history") {
        harness.page.addHistoryDrift("history.replaceState");
      } else {
        harness.page.attemptApplicationWindowOpen(`${origin}/post-stop-popup`);
      }

      await assert.rejects(
        harness.adapter.finalReceipt(),
        /mutation ledger|session POST|storage|poison|lesson page URL|navigation|history|browser topology|window-open/i,
      );
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.controlObserverRemovalCount, 1);
      assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
      assert.equal(harness.page.storageEventObserverStopCalls, 1);
      assert.equal(context.removedPageListeners, 1);
      assert.equal(
        [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
        8,
      );
    });
  }
});

test("C11 atomic stop freezes the original live control ledger and all four original events", async () => {
  const { harness } = await fullBrowserFlow();
  const liveEvents = harness.page.observer.events;
  const firstLiveEvent = liveEvents[0]!;
  const arraySymbol = Symbol("reviewer-array-property");
  const eventSymbol = Symbol("reviewer-event-property");

  const mutationResults = [
    Reflect.defineProperty(liveEvents, "reviewerEnumerable", {
      configurable: true,
      enumerable: true,
      value: "array-extra",
      writable: true,
    }),
    Reflect.defineProperty(liveEvents, arraySymbol, {
      configurable: true,
      enumerable: true,
      value: "array-symbol",
      writable: true,
    }),
    Reflect.defineProperty(firstLiveEvent, "reviewerNonEnumerable", {
      configurable: true,
      enumerable: false,
      value: "event-extra",
      writable: true,
    }),
    Reflect.defineProperty(firstLiveEvent, eventSymbol, {
      configurable: true,
      enumerable: true,
      value: "event-symbol",
      writable: true,
    }),
  ];
  const attemptedArrayKeys = Reflect.ownKeys(liveEvents).map(String);
  const attemptedEventKeys = Reflect.ownKeys(firstLiveEvent).map(String);

  const final = await harness.adapter.finalReceipt();
  assert.deepEqual(
    mutationResults,
    [false, false, false, false],
    `post-stop mutation reached original browser evidence; arrayKeys=${JSON.stringify(attemptedArrayKeys)} eventKeys=${JSON.stringify(attemptedEventKeys)}`,
  );
  assert.deepEqual(Reflect.ownKeys(liveEvents), ["0", "1", "2", "3", "length"]);
  for (const event of liveEvents) {
    assert.deepEqual(Reflect.ownKeys(event), ["controlKey", "key", "sequence", "type"]);
    assert.equal(Object.isFrozen(event), true);
  }
  assert.equal(Object.isFrozen(liveEvents), true);
  assert.deepEqual(final.controlObserverStop.events, liveEvents);
});

test("C11 atomic stop rejects every pre-stop array or event own-key extension", async (t) => {
  for (const defect of [
    "array-enumerable",
    "array-nonenumerable",
    "array-symbol",
    "event-enumerable",
    "event-nonenumerable",
    "event-symbol",
  ] as const) {
    await t.test(defect, async () => {
      const { fence, harness } = await armedSecondControlForC10();
      const context = harness.page.contextIdentity as FakeBrowserContext;
      const liveEvents = harness.page.observer.events;
      const liveEvent = liveEvents[0]!;
      if (defect === "array-enumerable" || defect === "array-nonenumerable") {
        Object.defineProperty(liveEvents, defect, {
          configurable: true,
          enumerable: defect === "array-enumerable",
          value: defect,
          writable: true,
        });
      } else if (defect === "array-symbol") {
        Object.defineProperty(liveEvents, Symbol("array-symbol"), {
          configurable: true,
          enumerable: true,
          value: defect,
          writable: true,
        });
      } else if (defect === "event-enumerable" || defect === "event-nonenumerable") {
        Object.defineProperty(liveEvent, defect, {
          configurable: true,
          enumerable: defect === "event-enumerable",
          value: defect,
          writable: true,
        });
      } else {
        Object.defineProperty(liveEvent, Symbol("event-symbol"), {
          configurable: true,
          enumerable: true,
          value: defect,
          writable: true,
        });
      }

      await assert.rejects(
        harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
        /cleanup also failed; original=.*atomic control observer stop.*could not freeze the trusted exact control ledger/i,
      );
      assert.equal(harness.page.controlObserverActive, false);
      assert.equal(harness.page.controlObserverFrozenEventCount, 0);
      assert.equal(harness.page.controlObserverLedgerFrozen, false);
      assert.equal(harness.page.controlObserverRemovalCount, 1);
      assert.equal(harness.page.controlObserverStopCalls, 1);
      assert.equal(harness.page.controlObserverStopReceipt, null);
      assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
      assert.equal(harness.page.storageEventObserverStopCalls, 1);
      assert.equal(context.removedPageListeners, 1);
      assert.equal(
        [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
        8,
      );
    });
  }
});

test("C11 post-stop define, assignment, push, and splice attempts cannot alter original evidence", async () => {
  const { harness } = await fullBrowserFlow();
  const liveEvents = harness.page.observer.events;
  const liveEvent = liveEvents[0]!;
  const exactBytes = JSON.stringify(liveEvents);
  const exactArrayKeys = Reflect.ownKeys(liveEvents);
  const exactEventKeys = liveEvents.map((event) => Reflect.ownKeys(event));
  const assignmentRejected = Reflect.set(liveEvent, "controlKey", "late-assignment");
  const strictFailures: unknown[] = [];
  for (const attempt of [
    () => Object.defineProperty(liveEvents, "late", { value: true }),
    () => Object.defineProperty(liveEvents, Symbol("late-array"), { value: true }),
    () => Object.defineProperty(liveEvent, "late", { value: true }),
    () => Object.defineProperty(liveEvent, Symbol("late-event"), { value: true }),
    () => liveEvents.push({ controlKey: "late-push", key: null, sequence: 5, type: "click" }),
    () => liveEvents.splice(0, 1),
  ]) {
    try {
      attempt();
    } catch (error) {
      strictFailures.push(error);
    }
  }

  assert.equal(assignmentRejected, false);
  assert.equal(strictFailures.length, 6);
  assert.equal(JSON.stringify(liveEvents), exactBytes);
  assert.deepEqual(Reflect.ownKeys(liveEvents), exactArrayKeys);
  assert.deepEqual(liveEvents.map((event) => Reflect.ownKeys(event)), exactEventKeys);
  assert.equal(Object.isFrozen(liveEvents), true);
  assert.equal(liveEvents.every((event) => Object.isFrozen(event)), true);
  const final = await harness.adapter.finalReceipt();
  assert.deepEqual(final.controlObserverStop.events, liveEvents);
  assert.equal(final.controlObserverStop.eventCount, 4);
});

test("the first UI fence waits for the event-triggered timer-scheduled session POST", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  writeAppState(harness.run.databasePath, completedPayload(), 8, completedAt);
  harness.page.api.sessionResponseBytes = JSON.stringify({ sessions: [sessionEvidence()] });
  const request = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  harness.page.barrierHooks.push(async () => {
    await finishNetworkRequest(harness.page, request, durableAck());
  });
  const receipt = await harness.adapter.finishFirstRealControl({
    fence,
    includeRaw: true,
    root: harness.root,
  });
  assert.equal(receipt.browserSessionPostCount, 1);
});

test("C4 first-control phase rejects any additional mutation beside its one exact session POST", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await finishNetworkRequest(
    harness.page,
    jsonRequest("/api/lesson-progress", { action: "start", slug: lessonSlug }),
    { lesson: { slug: lessonSlug, status: "in-progress", topicId: selectedTopicId } },
  );
  await emitFirstSessionPost(harness);
  await assert.rejects(
    harness.adapter.finishFirstRealControl({
      fence,
      includeRaw: true,
      root: harness.root,
    }),
    /first-control mutation ledger|exactly one.*mutation/i,
  );
});

test("the second UI fence rejects a duplicate browser session POST", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  await finishNetworkRequest(
    harness.page,
    jsonRequest(
      "/api/visualization-sessions",
      { moduleId, source, topicId: selectedTopicId },
      {
        "content-type": "application/json",
        "x-mais-visualization-user-id": encodeURIComponent(userId),
      },
    ),
    durableAck(),
  );
  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /duplicate browser session POST/i,
  );
});

test("C4 second-control phase permits zero new mutations of any route", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  await finishNetworkRequest(
    harness.page,
    jsonRequest("/api/learning-events", { events: [], generation: 0 }),
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: userId,
      dispositions: [],
      durablyPersisted: true,
      generation: 0,
    },
  );
  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /second-control mutation ledger|zero new mutations/i,
  );
});

test("the second UI fence catches a timer-scheduled duplicate that starts during the settle barrier", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  harness.page.barrierHooks.push(async () => {
    await finishNetworkRequest(harness.page, duplicate, durableAck());
  });
  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /duplicate browser session POST/i,
  );
});

test("the second UI fence stays conditionally quiescent long enough to catch a 75ms delayed duplicate", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  const duplicateDone = new Promise<void>((resolve) => {
    setTimeout(() => {
      void finishNetworkRequest(harness.page, duplicate, durableAck()).finally(resolve);
    }, 75);
  });
  const outcome = harness.adapter
    .finishSecondRealControl({ fence, root: harness.root })
    .then(
      (value) => ({ error: null as unknown, value }),
      (error: unknown) => ({ error, value: null }),
    );
  await duplicateDone;
  const settled = await outcome;
  assert.equal(settled.value, null);
  assert.match(String(settled.error), /duplicate browser session POST/i);
});

test("final receipt also requires a fresh condition-based quiescence window", async () => {
  const { harness } = await fullBrowserFlow();
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  const duplicateDone = new Promise<void>((resolve) => {
    setTimeout(() => {
      void finishNetworkRequest(harness.page, duplicate, durableAck()).finally(resolve);
    }, 75);
  });
  const outcome = Promise.resolve(harness.adapter.finalReceipt()).then(
    (value) => ({ error: null as unknown, value }),
    (error: unknown) => ({ error, value: null }),
  );
  await duplicateDone;
  const settled = await outcome;
  assert.equal(settled.value, null);
  assert.match(String(settled.error), /final browser session POST count is not one|duplicate browser session POST/i);
});

test("C5 final seal rereads and rejects all five late malformed analytics protocol markers", async () => {
  const malformedEntries = [
    { key: learningAnalyticsGenerationStorageKey(userId), raw: JSON.stringify({ generation: 0 }) },
    { key: learningAnalyticsClearFenceStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsGenerationHandshakeStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsGenerationTransitionStorageKey(userId), raw: JSON.stringify({ phase: "prepared" }) },
    { key: learningAnalyticsBoundaryLineageStorageKey(userId), raw: JSON.stringify({ generation: 0 }) },
  ];
  for (const malformedEntry of malformedEntries) {
    const { harness } = await fullBrowserFlow();
    harness.page.storage.push(malformedEntry);
    await assert.rejects(
      harness.adapter.finalReceipt(),
      /protocol marker.*poison|production schema.*invalid|final storage/i,
    );
  }
});

test("C5 final seal rejects late poison and live analytics or session outbox families", async () => {
  const encodedUserId = encodeURIComponent(userId);
  const lateEntries = [
    {
      key: `mais:learning-analytics-corrupt-outbox:v1:${encodedUserId}:late`,
      raw: JSON.stringify({ id: "late-corrupt" }),
    },
    {
      key: `mais:learning-analytics-outbox:v2:${encodedUserId}:late/generation/0`,
      raw: JSON.stringify({ id: "late-analytics" }),
    },
    {
      key: `mais:visualization-session-outbox:v1:${encodedUserId}/${encodeURIComponent(moduleId)}/${encodeURIComponent(selectedTopicId)}/revision/${encodeURIComponent(source)}/99`,
      raw: JSON.stringify({ moduleId, source, topicId: selectedTopicId, userId }),
    },
  ];
  for (const lateEntry of lateEntries) {
    const { harness } = await fullBrowserFlow();
    harness.page.storage.push(lateEntry);
    await assert.rejects(
      harness.adapter.finalReceipt(),
      /final storage contains poison|final storage contains live analytics\/session outbox/i,
    );
  }
});

test("C5 final seal accepts and exposes all five production-valid protocol markers", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.storage.push(...productionValidProtocolStorageEntries());
  const final = await harness.adapter.finalReceipt();
  assert.equal(final.storage.protocolControlEntries.length, 5);
  assert.equal(final.storage.outboxEntries.length, 0);
  assert.equal(final.storage.poisonKeys.length, 0);
  assert.equal(Object.isFrozen(final.storage), true);
});

test("C5 final seal rejects a completed duplicate injected during its observer read", async () => {
  const { harness } = await fullBrowserFlow();
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  harness.page.observerReadHooks.push(async () => {
    await finishNetworkRequest(harness.page, duplicate, durableAck());
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final.*session POST count|complete ordered mutation ledger|last-await|duplicate browser session/i,
  );
});

test("C5 final seal waits for a response-pending duplicate injected during observer read before rejection", async () => {
  const { harness } = await fullBrowserFlow();
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  let releaseResponse!: (bytes: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });
  let markHookStarted!: () => void;
  const hookStarted = new Promise<void>((resolve) => {
    markHookStarted = resolve;
  });
  let responseEmission: Promise<void> | null = null;
  harness.page.observerReadHooks.push(async () => {
    await harness.page.emit("request", duplicate as unknown as Request);
    responseEmission = harness.page.emit(
      "response",
      new FakeResponse(duplicate, 200, async () => await responseBytes) as unknown as Response,
    );
    await harness.page.emit("requestfinished", duplicate as unknown as Request);
    markHookStarted();
  });

  let settled = false;
  const outcome = harness.adapter.finalReceipt().then(
    (value) => {
      settled = true;
      return { error: null as unknown, value };
    },
    (error: unknown) => {
      settled = true;
      return { error, value: null };
    },
  );
  await hookStarted;
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  const settledBeforeResponseBytes = settled;
  releaseResponse(JSON.stringify(durableAck()));
  if (responseEmission !== null) await responseEmission;
  const result = await outcome;
  assert.equal(settledBeforeResponseBytes, false, "final must wait for duplicate response bytes");
  assert.equal(result.value, null);
  assert.match(String(result.error), /session POST count|mutation ledger|duplicate browser session/i);
});

test("C5 final seal rejects malformed storage introduced during its observer read", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.observerReadHooks.push(async () => {
    harness.page.storage.push({
      key: learningAnalyticsGenerationHandshakeStorageKey(userId),
      raw: JSON.stringify({ phase: "prepared" }),
    });
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /protocol marker.*poison|production schema.*invalid|final storage/i,
  );
});

test("C5 final seal rejects a restored main-frame drift introduced during its atomic read", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.observerReadHooks.push(async () => {
    harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}?transient-final=1`;
    await harness.page.emit("framenavigated", harness.page.mainFrameIdentity);
    harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}`;
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /main-frame navigation drift|hard browser evidence|irreversible/i,
  );
});

test("C5 final receipt is consumable exactly once", async () => {
  const { harness } = await fullBrowserFlow();
  await harness.adapter.finalReceipt();
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already (?:running|sealed|consumed)/i,
  );
});

test("C5 concurrent final receipt calls permit exactly one seal owner", async () => {
  const { harness } = await fullBrowserFlow();
  const results = await Promise.allSettled([
    harness.adapter.finalReceipt(),
    harness.adapter.finalReceipt(),
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  const rejected = results.find(({ status }) => status === "rejected");
  assert.equal(rejected?.status, "rejected");
  if (rejected?.status === "rejected") {
    assert.match(String(rejected.reason), /final receipt.*exactly once|already running/i);
  }
});

test("C6 final seal waits for a captured safe API GET response task and exposes its exact response hash", async () => {
  const { harness } = await fullBrowserFlow();
  const request = new FakeRequest(
    `${origin}/api/visualization-sessions`,
    "GET",
    null,
  );
  const responseBytesValue = JSON.stringify({ sessions: [sessionEvidence()] });
  let releaseResponse!: (bytes: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });

  await harness.page.emit("request", request as unknown as Request);
  const responseEmission = harness.page.emit(
    "response",
    new FakeResponse(request, 200, async () => await responseBytes) as unknown as Response,
  );
  await harness.page.emit("requestfinished", request as unknown as Request);

  let settled = false;
  const outcome = harness.adapter.finalReceipt().then(
    (value) => {
      settled = true;
      return { error: null as unknown, value };
    },
    (error: unknown) => {
      settled = true;
      return { error, value: null };
    },
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 175));
  const settledBeforeResponseBytes = settled;
  releaseResponse(responseBytesValue);
  await responseEmission;
  const result = await outcome;

  assert.equal(settledBeforeResponseBytes, false, "safe API GET response bytes must precede final seal");
  assert.equal(result.error, null);
  assert.ok(result.value);
  const safeGet = result.value.requests.find(
    ({ method, url }) => method === "GET" && url === `${origin}/api/visualization-sessions`,
  );
  assert.deepEqual(safeGet, {
    finished: true,
    hash: "",
    id: 5,
    method: "GET",
    origin,
    pathname: "/api/visualization-sessions",
    requestBodySha256: null,
    responseSha256: sha256Bytes(responseBytesValue),
    search: "",
    status: 200,
    url: `${origin}/api/visualization-sessions`,
  });
});

test("C6 final seal rejects malformed delayed safe API GET response bytes before sealing", async () => {
  const { harness } = await fullBrowserFlow();
  const request = new FakeRequest(`${origin}/api/visualization-sessions`, "GET", null);
  let releaseResponse!: (bytes: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });
  await harness.page.emit("request", request as unknown as Request);
  const responseEmission = harness.page.emit(
    "response",
    new FakeResponse(request, 200, async () => await responseBytes) as unknown as Response,
  );
  await harness.page.emit("requestfinished", request as unknown as Request);

  let settled = false;
  const outcome = harness.adapter.finalReceipt().then(
    (value) => {
      settled = true;
      return { error: null as unknown, value };
    },
    (error: unknown) => {
      settled = true;
      return { error, value: null };
    },
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 175));
  assert.equal(settled, false, "malformed safe GET bytes must be parsed before final seal");
  releaseResponse("{malformed-safe-get-response");
  await responseEmission;
  const result = await outcome;
  assert.equal(result.value, null);
  assert.match(String(result.error), /response listener failed|response body is not JSON|hard browser evidence/i);
});

test("C6 concurrent final calls keep the unique owner pending on a safe GET response task", async () => {
  const { harness } = await fullBrowserFlow();
  const request = new FakeRequest(`${origin}/api/runtime-durability`, "GET", null);
  const responseBytesValue = JSON.stringify({ durable: true });
  let releaseResponse!: (bytes: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });
  await harness.page.emit("request", request as unknown as Request);
  const responseEmission = harness.page.emit(
    "response",
    new FakeResponse(request, 200, async () => await responseBytes) as unknown as Response,
  );
  await harness.page.emit("requestfinished", request as unknown as Request);

  let ownerSettled = false;
  const owner = harness.adapter.finalReceipt().finally(() => {
    ownerSettled = true;
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already running/i,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 175));
  assert.equal(ownerSettled, false);
  releaseResponse(responseBytesValue);
  await responseEmission;
  const final = await owner;
  const safeGet = final.requests.find(({ url }) => url === `${origin}/api/runtime-durability`);
  assert.equal(safeGet?.responseSha256, sha256Bytes(responseBytesValue));
  assert.equal(safeGet?.status, 200);
});

test("C6 seal rejects an exact session mutation injected after immutable snapshot capture but before evaluate resolution", async () => {
  const { harness } = await fullBrowserFlow();
  const duplicate = jsonRequest(
    "/api/visualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
    {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
  );
  let hookRan = false;
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    hookRan = true;
    await finishNetworkRequest(harness.page, duplicate, durableAck());
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /session POST count|complete ordered mutation ledger|duplicate browser session/i,
  );
  assert.equal(hookRan, true);
});

test("C6 seal rejects an observer error injected after snapshot capture", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.addObserverError("late observer failure");
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /interaction listener failed|late observer failure/i,
  );
});

test("C6 seal rejects restored history drift injected after snapshot capture", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.addHistoryDrift();
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /history\/navigation drift ledger|late-history|history\.pushState/i,
  );
});

test("C6 seal rejects storage poison injected after snapshot capture", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.storage.push({
      key: `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(userId)}:post-seal`,
      raw: JSON.stringify({ id: "post-seal-poison" }),
    });
  });
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final storage contains poison|post-seal-poison|analytics-corrupt/i,
  );
});

test("C6 seal retries one covered epoch change, returns one unique frozen seal, and remains one-shot", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.recordCoveredChange("receipt-covered-state-changed-after-snapshot");
  });
  const final = await harness.adapter.finalReceipt();
  assert.match(final.seal.sealId, /:2$/);
  assert.equal(final.seal.state, "sealed");
  assert.equal(final.seal.postSealViolations.length, 0);
  assert.equal(Number.isSafeInteger(final.seal.epoch), true);
  assert.equal(Number.isSafeInteger(final.seal.terminalEpoch), true);
  assert.equal(final.seal.linearization, "browser-task-sealed-after-immutable-snapshot-digests-and-confirmed-after-125ms");
  for (const digest of [
    final.seal.compositeSha256,
    final.seal.digests.locationSha256,
    final.seal.digests.observerSha256,
    final.seal.digests.storageSha256,
    final.seal.networkSha256,
  ]) assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(final.seal), true);
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already sealed/i,
  );
});

test("C6 a failed post-seal poison attempt cannot be retried through the one-shot final API", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.storage.push({
      key: `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(userId)}:one-shot`,
      raw: JSON.stringify({ id: "one-shot-poison" }),
    });
  });
  await assert.rejects(harness.adapter.finalReceipt(), /final storage contains poison/i);
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already failed/i,
  );
});

test("C5 final ledger retains and rejects every foreign-origin non-safe browser request", async () => {
  for (const { method, url } of [
    { method: "POST", url: "https://foreign.example/api/visualization-sessions" },
    { method: "PATCH", url: "https://foreign.example/student/lessons/foreign" },
    { method: "DELETE", url: "http://external.test/api/learning-events" },
  ]) {
    const { harness } = await fullBrowserFlow();
    await finishNetworkRequest(
      harness.page,
      new FakeRequest(
        url,
        method,
        JSON.stringify({ moduleId, source, topicId: selectedTopicId }),
        { "content-type": "application/json" },
      ),
      { acceptedForeignMutation: true },
    );
    await assert.rejects(
      harness.adapter.finalReceipt(),
      /foreign\.example|external\.test|origin scheme\/host\/port mismatch|foreign-origin non-safe/i,
    );
  }
});

test("reviewer C3-1: final rejects a completed trailing-slash visualization-session mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/visualization-sessions/",
    { moduleId, source, topicId: selectedTopicId },
  );
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /mutation ledger|unauthorized.*mutation|canonical target/i,
  );
});

test("reviewer C3-2: final rejects a completed percent-encoded visualization-session mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/%76isualization-sessions",
    { moduleId, source, topicId: selectedTopicId },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-3: final rejects a completed trailing-slash lesson-progress mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/lesson-progress/",
    { action: "start", slug: lessonSlug },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-4: final rejects a completed percent-encoded lesson-progress mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/%6cesson-progress",
    { action: "start", slug: lessonSlug },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-5: final rejects a completed trailing-slash learning-events mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/learning-events/",
    { events: [], generation: 0 },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-6: final rejects a completed percent-encoded learning-events mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/%6cearning-events",
    { events: [], generation: 0 },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-7: final rejects an extra completed exact lesson-progress mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/lesson-progress",
    { action: "start", slug: lessonSlug },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-8: final rejects an extra completed exact learning-events mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    "/api/learning-events",
    { events: [], generation: 0 },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-9: final rejects a completed same-origin non-API lesson mutation after mount", async () => {
  const harness = await flowWithCompletedPostMountMutation(
    `/student/lessons/${lessonSlug}`,
    { serverAction: "reviewer-probe" },
  );
  await assert.rejects(harness.adapter.finalReceipt(), /mutation ledger/i);
});

test("reviewer C3-10: final waits for delayed unauthorized response bytes before rejecting the complete ledger", async () => {
  const { harness } = await fullBrowserFlow();
  const delayed = completedMutationRequest(
    "/api/visualization-sessions/",
    { moduleId, source, topicId: selectedTopicId },
  );
  let releaseResponse!: (bytes: string) => void;
  const responseBytes = new Promise<string>((resolve) => {
    releaseResponse = resolve;
  });
  await harness.page.emit("request", delayed as unknown as Request);
  await harness.page.emit(
    "response",
    new FakeResponse(delayed, 200, async () => await responseBytes) as unknown as Response,
  );
  await harness.page.emit("requestfinished", delayed as unknown as Request);

  let settled = false;
  const outcome = harness.adapter.finalReceipt().then(
    (value) => {
      settled = true;
      return { error: null as unknown, value };
    },
    (error: unknown) => {
      settled = true;
      return { error, value: null };
    },
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  assert.equal(settled, false, "final must remain pending until delayed response bytes are read");
  releaseResponse(JSON.stringify({ acceptedReviewerProbe: true }));
  const result = await outcome;
  assert.equal(result.value, null);
  assert.match(String(result.error), /mutation ledger/i);
});

test("final receipt rebinds the still-active exact lesson origin and pathname", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.currentUrl = `${origin}/student/lessons/${lessonSlug}-drifted`;
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /navigated lesson page URL is not exact/i,
  );
});

async function replayWith(
  first: VisualizationLessonBrowserFirstInteractionReceipt,
  harness: Harness,
  responseBytes: string,
) {
  harness.page.api.replayResponseBytes = responseBytes;
  return await harness.adapter.replayFirstDeliveryExactly({ first });
}

test("direct replay rejects response-byte drift even when parsed JSON is equivalent", async () => {
  const { first, harness } = await fullBrowserFlow();
  await assert.rejects(
    replayWith(first, harness, `${JSON.stringify(durableAck())}\n`),
    /DUPLICATE_REPLAY_NOT_IDEMPOTENT.*response-bytes/i,
  );
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final coverage and replay evidence are inconsistent/i,
  );
});

test("direct replay rejects APIResponse URL drift before idempotence validation", async () => {
  const { first, harness } = await fullBrowserFlow();
  harness.page.api.replayResponseUrl = `${origin}/api/visualization-sessions?redirected=1`;
  await assert.rejects(
    replayWith(first, harness, JSON.stringify(durableAck())),
    /API response URL target drifted/i,
  );
});

test("direct replay rejects raw app_state revision drift", async () => {
  const { first, harness } = await fullBrowserFlow();
  writeAppState(harness.run.databasePath, completedPayload(), 9, completedAt);
  await assert.rejects(
    replayWith(first, harness, JSON.stringify(durableAck())),
    /DUPLICATE_REPLAY_NOT_IDEMPOTENT.*app-state-revision/i,
  );
});

test("exact browser flow plus byte-identical raw replay yields full-raw-replay coverage", async () => {
  const { first, harness } = await fullBrowserFlow();
  const responseBytes = JSON.stringify(durableAck());
  const replay = await replayWith(first, harness, responseBytes);
  assert.equal(replay.duplicate.idempotent, true);
  assert.deepEqual(harness.page.api.fetchBodies, [first.requestBytes]);
  const final = await harness.adapter.finalReceipt();
  assert.equal(final.coverage, "full-raw-replay");
  assert.equal(final.replay, replay);
  assert.equal(final.browserSessionPostCount, 1);
  assert.equal(final.directReplayCount, 1);
  assert.equal(final.manifest.paths.databasePath, harness.run.databasePath);
  assert.deepEqual(final.identity, {
    appOrigin: origin,
    grade,
    lessonPathname: `/student/lessons/${lessonSlug}`,
    lessonSlug,
    moduleId,
    selectedTopicId,
    siblingTopicIds: [siblingTopicId],
    source,
    userId,
  });
  assert.equal(final.learnerProfileSetup.statusCode, 200);
  assert.equal(final.learnerProfileSetup.status, "skipped");
  assert.equal(final.learnerProfileSetup.shouldShowOnboarding, false);
  assert.deepEqual(final.apiRequests.map(({ method }) => method), [
    "PATCH",
    "GET",
    "GET",
    "POST",
    "GET",
  ]);
  assert.equal(final.apiRequests.every(({ origin: requestOrigin }) => requestOrigin === origin), true);
  assert.equal(final.apiRequests.every(({ pathname, responseUrl, url }) => (
    url === `${origin}${pathname}` && responseUrl === url
  )), true);
  assert.equal(final.apiRequests.every(({ responseBytes, responseSha256, statusCode }) => (
    responseBytes.length > 0 && responseSha256.length === 64 && statusCode === 200
  )), true);
  assert.equal(final.apiRequests.filter(({ method }) => method === "GET").every(({ requestBodySha256, requestBytes }) => (
    requestBodySha256 === null && requestBytes === null
  )), true);
  assert.equal(final.apiRequests.filter(({ method }) => method !== "GET").every(({ requestBodySha256, requestBytes }) => (
    requestBodySha256?.length === 64 && typeof requestBytes === "string" && requestBytes.length > 0
  )), true);
  assert.equal(final.mount.acknowledgements.lessonProgressStart?.origin, origin);
  assert.equal(final.mount.acknowledgements.lessonProgressStart?.pathname, "/api/lesson-progress");
  assert.deepEqual(final.mount.acknowledgements.lessonProgressStart?.requestBody, {
    action: "start",
    slug: lessonSlug,
  });
  assert.match(final.mount.acknowledgements.lessonProgressStart?.responseBytes ?? "", /"in-progress"/);
  assert.equal(final.mount.acknowledgements.lessonPageView?.origin, origin);
  assert.equal(final.mount.acknowledgements.lessonPageView?.pathname, "/api/learning-events");
  assert.equal(
    ((final.mount.acknowledgements.lessonPageView?.requestBody as { events?: unknown[] })?.events?.length),
    1,
  );
  assert.match(final.mount.acknowledgements.lessonPageView?.responseBytes ?? "", /"inserted"/);
  assert.equal(final.first.requestOrigin, origin);
  assert.equal(final.first.requestPathname, "/api/visualization-sessions");
  assert.equal(final.first.requestUrl, `${origin}/api/visualization-sessions`);
  assert.deepEqual(
    final.mutations.map(({ authorizedPhase, method, pathname }) => ({
      authorizedPhase,
      method,
      pathname,
    })),
    [
      { authorizedPhase: "mount", method: "POST", pathname: "/api/lesson-progress" },
      { authorizedPhase: "mount", method: "POST", pathname: "/api/learning-events" },
      { authorizedPhase: "mount", method: "POST", pathname: "/api/learning-events" },
      { authorizedPhase: "first-control", method: "POST", pathname: "/api/visualization-sessions" },
    ],
  );
  assert.equal(final.mutations.every((mutation) => (
    mutation.origin === origin &&
    mutation.url === `${origin}${mutation.pathname}` &&
    mutation.search === "" &&
    mutation.hash === "" &&
    mutation.finished === true &&
    mutation.status === 200 &&
    mutation.requestBodySha256 === sha256Bytes(mutation.requestBytes) &&
    mutation.responseSha256 === sha256Bytes(mutation.responseBytes)
  )), true);
  assert.equal(final.requests.every((request) => request.origin === origin), true);
  assert.equal(final.requests.every((request) => request.url === `${request.origin}${request.pathname}`), true);
  assert.equal(final.requests.every((request) => request.search === "" && request.hash === ""), true);
  assert.deepEqual(final.navigation.historyDrifts, []);
  assert.deepEqual(final.navigation.location, {
    hash: "",
    href: `${origin}/student/lessons/${lessonSlug}`,
    origin,
    pathname: `/student/lessons/${lessonSlug}`,
    search: "",
  });
  assert.equal(final.testOutputDir.startsWith("/Volumes/Starship/"), true);
  assert.equal(Object.isFrozen(final), true);
});

test("browser-only coverage exposes an exact null replay receipt", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  await harness.adapter.waitForMountTerminal({
    deadlineMs: 500,
    includeRaw: false,
    root: harness.root,
  });
  const firstFence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await emitFirstSessionPost(harness);
  await harness.adapter.finishFirstRealControl({
    fence: firstFence,
    includeRaw: false,
    root: harness.root,
  });
  await terminalSecondControl(harness);
  const final = await harness.adapter.finalReceipt();
  assert.equal(final.coverage, "browser");
  assert.equal(final.replay, null);
  assert.equal(final.directReplayCount, 0);
});

test("requestfailed is hard even when another same-route request succeeds", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  const failed = jsonRequest("/api/lesson-progress", { action: "start", slug: lessonSlug });
  failed.failureText = "net::ERR_ABORTED";
  await harness.page.emit("request", failed as unknown as Request);
  await harness.page.emit("requestfailed", failed as unknown as Request);
  await assert.rejects(
    harness.adapter.waitForMountTerminal({ deadlineMs: 100, includeRaw: true, root: harness.root }),
    (error: unknown) => {
      assert.equal(error instanceof VisualizationLessonBrowserDurabilityError, true);
      assert.match(String(error), /requestfailed POST \/api\/lesson-progress: net::ERR_ABORTED/);
      return true;
    },
  );
});

test("C7 external same-origin storage event after immutable snapshot rejects the final receipt", async () => {
  const { harness } = await fullBrowserFlow();
  const externalKey = `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(userId)}:external-document`;
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.setStorageFromExternalSameOriginDocument(
      externalKey,
      JSON.stringify({ id: "external-document-poison" }),
    );
  });

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /storage event|final storage contains poison|post-seal|external-document/i,
  );
  assert.equal(harness.page.externalStorageEvents.length, 1);
  assert.equal(harness.page.externalStorageEvents[0]?.key, externalKey);
});

test("C7 tracked external set-remove events retry the seal and remain exact receipt evidence", async () => {
  const { harness } = await fullBrowserFlow();
  const externalKey = learningAnalyticsGenerationStorageKey(userId);
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.setStorageFromExternalSameOriginDocument(
      externalKey,
      JSON.stringify({ generation: 9, userId, version: 1 }),
    );
    harness.page.removeStorageFromExternalSameOriginDocument(externalKey);
  });

  const final = await harness.adapter.finalReceipt();
  assert.match(final.seal.sealId, /:2$/);
  assert.deepEqual(
    final.storageEvents.map(({ key, newValue, oldValue, sequence, url }) => ({
      key,
      newValue,
      oldValue,
      sequence,
      url,
    })),
    [
      {
        key: externalKey,
        newValue: JSON.stringify({ generation: 9, userId, version: 1 }),
        oldValue: null,
        sequence: 1,
        url: `${origin}/external-storage-writer`,
      },
      {
        key: externalKey,
        newValue: null,
        oldValue: JSON.stringify({ generation: 9, userId, version: 1 }),
        sequence: 2,
        url: `${origin}/external-storage-writer`,
      },
    ],
  );
});

test("C7 external clear emits exact key-null evidence and retries from the clean shared state", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.storage.push(...productionValidProtocolStorageEntries());
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.clearStorageFromExternalSameOriginDocument();
  });

  const final = await harness.adapter.finalReceipt();
  assert.match(final.seal.sealId, /:2$/);
  assert.deepEqual(final.storage.entries, []);
  assert.deepEqual(final.storageEvents, [
    {
      key: null,
      newValue: null,
      oldValue: null,
      sequence: 1,
      url: `${origin}/external-storage-writer`,
    },
  ]);
  assert.equal(harness.page.storageEventObserverInstalled, false);
});

test("C7 tracked set-remove during the active 125ms confirmation window retries the same evidence", async () => {
  const { harness } = await fullBrowserFlow();
  const externalKey = learningAnalyticsGenerationStorageKey(userId);
  const finalPromise = harness.adapter.finalReceipt();
  await new Promise<void>((resolve) => setTimeout(resolve, 175));
  harness.page.setStorageFromExternalSameOriginDocument(
    externalKey,
    JSON.stringify({ generation: 10, userId, version: 1 }),
  );
  harness.page.removeStorageFromExternalSameOriginDocument(externalKey);

  const final = await finalPromise;
  assert.match(final.seal.sealId, /:2$/);
  assert.equal(final.storageEvents.length, 2);
  assert.equal(harness.page.storageEventObserverInstalled, false);
});

test("C7 tracked poison immediately before the final synchronous fresh read is rejected", async () => {
  const { harness } = await fullBrowserFlow();
  const externalKey = `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(userId)}:pre-confirm`;
  harness.page.finalSealBeforeConfirmationHooks.push(async () => {
    harness.page.setStorageFromExternalSameOriginDocument(
      externalKey,
      JSON.stringify({ id: "pre-confirm-poison" }),
    );
  });

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final storage contains poison|pre-confirm|storage event/i,
  );
});

test("C7 unrelated external storage key does not perturb the durability seal", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.finalSealAfterSnapshotHooks.push(async () => {
    harness.page.setStorageFromExternalSameOriginDocument(
      "unrelated:feature-preference",
      JSON.stringify({ theme: "dark" }),
    );
  });

  const final = await harness.adapter.finalReceipt();
  assert.match(final.seal.sealId, /:1$/);
  assert.deepEqual(final.storageEvents, []);
  assert.equal(harness.page.externalStorageEvents.length, 1);
  assert.equal(harness.page.storageEventObserverInstalled, false);
});

test("C8 an auxiliary same-origin writer with queued restored-byte events cannot seal", async () => {
  const { harness } = await fullBrowserFlow();
  const auxiliaryPage = await harness.page.openAuxiliaryPage(
    `${origin}/external-storage-writer`,
  );
  assert.equal(auxiliaryPage.context(), harness.page.context());
  harness.page.externalStorageEventDelivery = "queued";
  const externalKey = learningAnalyticsGenerationStorageKey(userId);
  harness.page.setStorageFromExternalSameOriginDocument(
    externalKey,
    JSON.stringify({ generation: 11, userId, version: 1 }),
  );
  harness.page.removeStorageFromExternalSameOriginDocument(externalKey);
  assert.equal(harness.page.pendingExternalStorageEvents.length, 2);
  assert.deepEqual(harness.page.storage, []);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /auxiliary|browser topology|context page|popup/i,
  );
  assert.equal(harness.page.pendingExternalStorageEvents.length, 2);
  assert.deepEqual(harness.page.storage, []);
});

test("C8 a popup that opens and closes remains a terminal topology violation", async () => {
  const { harness } = await fullBrowserFlow();
  await harness.page.openAndClosePopup(`${origin}/popup-writer`);
  assert.equal((harness.page.contextIdentity as FakeBrowserContext).pages().length, 1);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /context-page[\s\S]*page-popup|page-popup[\s\S]*context-page/i,
  );
});

test("C8 an about-blank iframe attach and removal remains a terminal topology violation", async () => {
  const { harness } = await fullBrowserFlow();
  const frame = await harness.page.attachAuxiliaryFrame();
  await harness.page.detachAuxiliaryFrame(frame);
  assert.equal(harness.page.frames().length, 1);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /frame-attached[\s\S]*frame-detached|frame-detached[\s\S]*frame-attached/i,
  );
});

test("C8 an auxiliary frame navigation from about-blank to same-origin remains terminal", async () => {
  const { harness } = await fullBrowserFlow();
  const frame = await harness.page.attachAuxiliaryFrame();
  await harness.page.navigateAuxiliaryFrame(
    frame,
    `${origin}/external-storage-writer`,
  );

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /frame-attached[\s\S]*auxiliary-frame-navigated|auxiliary-frame-navigated[\s\S]*frame-attached/i,
  );
});

test("C8 final fails closed when the context current Page identity drifts without an event", async () => {
  const { harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  const replacement = new FakePage(
    new FakeRoot(defaultRootState()),
    context,
    false,
  );
  context.replaceCurrentPageWithoutEvent(replacement);
  assert.equal(context.pages().length, 1);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology[\s\S]*(?:identity|bound Page|current Page)/i,
  );
});

test("C8 final fails closed when the bound main Frame identity drifts without an event", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.replaceMainFrameWithoutEvent();
  assert.equal(harness.page.frames().length, 1);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology identity drift[\s\S]*mainFrameMatched=false/i,
  );
});

test("C8 final fails closed when the bound BrowserContext identity drifts", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.contextIdentity = new FakeBrowserContext();

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology identity drift[\s\S]*contextMatched=false/i,
  );
});

test("C8 the honest no-frame producer exposes one bound Page and main Frame through final", async () => {
  const { harness } = await fullBrowserFlow();
  const final = await harness.adapter.finalReceipt();

  assert.deepEqual(final.topology, {
    applicationEvents: [],
    arm: {
      frameCount: 1,
      mainFrameUrl: "about:blank",
      pageCount: 1,
      pageUrl: "about:blank",
    },
    current: {
      frameCount: 1,
      mainFrameUrl: `${origin}/student/lessons/${lessonSlug}`,
      pageCount: 1,
      pageUrl: `${origin}/student/lessons/${lessonSlug}`,
    },
    events: [],
    listenerCleanup: {
      applicationTopologyObserverRemoved: true,
      contextPageListenerRemoved: true,
      pageListenerEvents: [
        "frameattached",
        "framedetached",
        "framenavigated",
        "popup",
        "request",
        "requestfailed",
        "requestfinished",
        "response",
      ],
      removedExactlyOnce: true,
      storageEventListenerRemoved: true,
      totalRemoved: 9,
    },
  });
});

test("C8 successful one-shot final removes every context and Page listener exactly once", async () => {
  const { harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  const final = await harness.adapter.finalReceipt();

  assert.deepEqual(final.topology.listenerCleanup, {
    applicationTopologyObserverRemoved: true,
    contextPageListenerRemoved: true,
    pageListenerEvents: [
      "frameattached",
      "framedetached",
      "framenavigated",
      "popup",
      "request",
      "requestfailed",
      "requestfinished",
      "response",
    ],
    removedExactlyOnce: true,
    storageEventListenerRemoved: true,
    totalRemoved: 9,
  });
  assert.equal(harness.page.applicationTopologyObserverInstalled, false);
  assert.equal(harness.page.storageEventObserverInstalled, false);
  assert.equal(harness.page.controlObserverActive, false);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(context.listeners.get("page")?.length ?? 0, 0);
  assert.equal(context.removedPageListeners, 1);
  for (const event of final.topology.listenerCleanup.pageListenerEvents) {
    assert.equal(harness.page.listeners.get(event)?.length ?? 0, 0);
    assert.equal(harness.page.removedListeners.get(event), 1);
  }
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already sealed/i,
  );
  assert.equal(context.removedPageListeners, 1);
  assert.equal(
    [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
    8,
  );
});

test("C8 failed one-shot final also removes every context and Page listener exactly once", async () => {
  const { harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  await harness.page.openAndClosePopup(`${origin}/failed-final-popup`);

  await assert.rejects(harness.adapter.finalReceipt(), /browser topology/i);
  assert.equal(context.removedPageListeners, 1);
  assert.equal(context.listeners.get("page")?.length ?? 0, 0);
  assert.equal(
    [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
    8,
  );
  assert.equal(harness.page.applicationTopologyObserverInstalled, false);
  assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
  assert.equal(harness.page.storageEventObserverInstalled, false);
  assert.equal(harness.page.storageEventObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverActive, false);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopCalls, 1);
  await assert.rejects(
    harness.adapter.finalReceipt(),
    /final receipt.*exactly once|already failed/i,
  );
  assert.equal(context.removedPageListeners, 1);
  assert.equal(
    [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
    8,
  );
  assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
  assert.equal(harness.page.storageEventObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverStopCalls, 1);
});

test("C8 a failure after browser confirmation does not double-stop any observer", async () => {
  const { harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  harness.page.finalSealBeforeConfirmationHooks.push(async () => {
    context.replaceCurrentPageWithoutEvent(
      new FakePage(new FakeRoot(defaultRootState()), context, false),
    );
  });

  await assert.rejects(harness.adapter.finalReceipt(), /browser topology identity drift/i);
  assert.equal(harness.page.applicationTopologyObserverInstalled, false);
  assert.equal(harness.page.applicationTopologyObserverStopCalls, 1);
  assert.equal(harness.page.storageEventObserverInstalled, false);
  assert.equal(harness.page.storageEventObserverStopCalls, 1);
  assert.equal(harness.page.controlObserverRemovalCount, 1);
  assert.equal(harness.page.controlObserverStopCalls, 1);
  assert.equal(context.removedPageListeners, 1);
  assert.equal(
    [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
    8,
  );
});

test("C8 outer listeners still clean exactly once when failed browser cleanup cannot evaluate", async () => {
  const { harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  harness.page.browserObserverCleanupError = new Error("page execution context destroyed");
  await harness.page.openAndClosePopup(`${origin}/failed-final-destroyed-page`);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology[\s\S]*cleanup|cleanup[\s\S]*browser topology/i,
  );
  assert.equal(context.removedPageListeners, 1);
  assert.equal(context.listeners.get("page")?.length ?? 0, 0);
  assert.equal(
    [...harness.page.removedListeners.values()].reduce((sum, count) => sum + count, 0),
    8,
  );
});

test("C8 an application window-open attempt is irreversible browser topology evidence", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.attemptApplicationWindowOpen(`${origin}/popup-writer`);

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology[\s\S]*window-open|window-open[\s\S]*browser topology/i,
  );
});

test("C8 every iframe frame object and embed creation is irreversible topology evidence", async () => {
  for (const tagName of ["iframe", "frame", "object", "embed"] as const) {
    const { harness } = await fullBrowserFlow();
    harness.page.attemptApplicationAuxiliaryElement(tagName);
    await assert.rejects(
      harness.adapter.finalReceipt(),
      new RegExp(`browser topology[\\s\\S]*dom-auxiliary-created[\\s\\S]*${tagName}`, "i"),
    );
  }
});

test("C8 parser-created object and embed inside a closed shadow root are irreversible", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.attemptClosedShadowParserAuxiliaryMarkup("object", "embed");

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology[\s\S]*dom-auxiliary-created[\s\S]*object[\s\S]*embed/i,
  );
});

test("C8 a closed shadow root with no auxiliary element remains an honest positive", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.attemptClosedShadowParserAuxiliaryMarkup();

  const final = await harness.adapter.finalReceipt();
  assert.deepEqual(final.topology.applicationEvents, []);
  assert.deepEqual(final.topology.events, []);
});

test("C8 bound topology is enforced before a control fence, not only at final", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  await harness.adapter.waitForMountTerminal({
    deadlineMs: 500,
    includeRaw: true,
    root: harness.root,
  });
  const context = harness.page.contextIdentity as FakeBrowserContext;
  context.replaceCurrentPageWithoutEvent(
    new FakePage(new FakeRoot(defaultRootState()), context, false),
  );

  await assert.rejects(
    harness.adapter.armRealControl({
      expectedButtonClick: expectedButtonClick(modeControlKey),
      ordinal: 1,
    }),
    /browser topology identity drift/i,
  );
});

test("C8 bound topology is enforced throughout mount terminal polling", async () => {
  const harness = createHarness();
  await armAndNavigate(harness);
  await emitMountWrites(harness);
  const context = harness.page.contextIdentity as FakeBrowserContext;
  context.replaceCurrentPageWithoutEvent(
    new FakePage(new FakeRoot(defaultRootState()), context, false),
  );

  await assert.rejects(
    harness.adapter.waitForMountTerminal({
      deadlineMs: 500,
      includeRaw: true,
      root: harness.root,
    }),
    /browser topology identity drift/i,
  );
});

test("C8 bound topology is enforced while the first real control settles", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(modeControlKey),
    ordinal: 1,
  });
  harness.page.addButtonClick(modeControlKey);
  await emitFirstSessionPost(harness);
  const context = harness.page.contextIdentity as FakeBrowserContext;
  context.replaceCurrentPageWithoutEvent(
    new FakePage(new FakeRoot(defaultRootState()), context, false),
  );

  await assert.rejects(
    harness.adapter.finishFirstRealControl({
      fence,
      includeRaw: true,
      root: harness.root,
    }),
    /browser topology identity drift/i,
  );
});

test("C8 bound topology is enforced while the second real control settles", async () => {
  const harness = createHarness();
  await terminalMount(harness);
  await terminalFirstControl(harness);
  const fence = await harness.adapter.armRealControl({
    expectedButtonClick: expectedButtonClick(resetControlKey),
    ordinal: 2,
  });
  harness.page.addButtonClick(resetControlKey);
  const context = harness.page.contextIdentity as FakeBrowserContext;
  context.replaceCurrentPageWithoutEvent(
    new FakePage(new FakeRoot(defaultRootState()), context, false),
  );

  await assert.rejects(
    harness.adapter.finishSecondRealControl({ fence, root: harness.root }),
    /browser topology identity drift/i,
  );
});

test("C8 bound topology is enforced throughout direct raw replay", async () => {
  const { first, harness } = await fullBrowserFlow();
  const context = harness.page.contextIdentity as FakeBrowserContext;
  harness.page.api.onReplayFetch = () => {
    context.replaceCurrentPageWithoutEvent(
      new FakePage(new FakeRoot(defaultRootState()), context, false),
    );
  };
  harness.page.api.replayResponseBytes = first.response.bytes;

  await assert.rejects(
    harness.adapter.replayFirstDeliveryExactly({ first }),
    /browser topology identity drift/i,
  );
});

test("C8 final rejects bound main Frame URL drift even when Page identity is stable", async () => {
  const { harness } = await fullBrowserFlow();
  harness.page.mainFrameIdentity.navigate(`${origin}/main-frame-url-drift`);
  assert.equal(
    harness.page.url(),
    `${origin}/student/lessons/${lessonSlug}`,
  );

  await assert.rejects(
    harness.adapter.finalReceipt(),
    /browser topology identity drift[\s\S]*mainFrameUrlMatched=false/i,
  );
});
