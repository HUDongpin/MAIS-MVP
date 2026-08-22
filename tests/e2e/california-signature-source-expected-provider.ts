import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locator } from "@playwright/test";
import ts from "typescript";
import {
  assertCaliforniaSignatureSourceTargetsResolved,
  CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256,
  CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
  CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY,
  CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION,
  resolveCaliforniaSignatureNumericEndpoints,
  type CaliforniaSignatureBenchControlBlueprint,
  type CaliforniaSignatureControlSite,
  type CaliforniaSignatureResolvedNumericEndpoints,
  type CaliforniaSignatureRuntimeEndpoint,
  type CaliforniaSignatureSemanticInteractionRegistryEntry,
  type CaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
  instrumentCaliforniaSignatureBenchSource
} from "./california-signature-qa-instrumentation";
import {
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import {
  resolveCaliforniaSignatureProductProjectRoot
} from "./california-signature-product-root";
import type {
  CaliforniaSignatureNavigationContract,
  CaliforniaSignatureSourceExpectedContext,
  CaliforniaSignatureSourceExpectedControl,
  CaliforniaSignatureSourceExpectedProvider
} from "./california-signature-exhaustive-qa";

export { CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY };

type VirtualNode = {
  children: unknown[];
  element: FakeElement;
  props: Record<string, unknown>;
  type: string;
};

type HookSlot =
  | { kind: "effect"; cleanup?: (() => void) | void; deps?: readonly unknown[] }
  | { kind: "memo"; deps?: readonly unknown[]; value: unknown }
  | { kind: "ref"; value: { current: unknown } }
  | { kind: "state"; value: unknown };

type FakeEvent = {
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  currentTarget: FakeElement;
  key: string;
  pointerId: number;
  preventDefault(): void;
  stopPropagation(): void;
  target: FakeElement;
  type: string;
};

type FakeElement = {
  addEventListener(name: string, listener: (event: FakeEvent) => void): void;
  clientHeight: number;
  clientWidth: number;
  dispatch(name: string, event: FakeEvent): void;
  focus(): void;
  getBoundingClientRect(): {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
    x: number;
    y: number;
  };
  getContext(kind: string): unknown;
  height: number;
  releasePointerCapture(pointerId: number): void;
  removeEventListener(name: string, listener: (event: FakeEvent) => void): void;
  setPointerCapture(pointerId: number): void;
  style: Record<string, unknown>;
  value: unknown;
  width: number;
};

type SourceEngine = {
  activate(control: CaliforniaSignatureSourceExpectedControl, endpoint: string): void;
  activateStart(control: CaliforniaSignatureSourceExpectedControl, endpoint: string): void;
  controls(): CaliforniaSignatureSourceExpectedControl[];
  isDisabled(control: CaliforniaSignatureSourceExpectedControl): boolean;
  mutationCount(): number;
  navigation: CaliforniaSignatureNavigationContract;
  resetMutationCount(): void;
  stateSignature(): string;
};

const compiledSourceCache = new Map<string, string>();

function sameDependencies(left: readonly unknown[] | undefined, right: readonly unknown[] | undefined) {
  if (left === undefined || right === undefined || left.length !== right.length) return false;
  return left.every((value, index) => Object.is(value, right[index]));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceOracleSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceHandlerRef(site: CaliforniaSignatureControlSite) {
  return site.endpointTargets.map((target) =>
    `${target.name}=${target.sourceExpression}`
  ).join(";");
}

function navigationContractFromSource(
  bench: CaliforniaSignatureBenchControlBlueprint
): CaliforniaSignatureNavigationContract {
  const exactlyOne = (role: string, candidates: readonly CaliforniaSignatureControlSite[]) => {
    if (candidates.length !== 1) {
      throw new Error(`${bench.benchId}: source navigation ${role} resolves to ${candidates.length} sites`);
    }
    return candidates[0]!.siteKey;
  };
  const answer = bench.controlSites.filter((site) =>
    site.renderCollections.includes("current.choices") ||
    /onClick=\{\(\) => (?:choose\((?:i|orig)\)|answer\(i\))\}/.test(site.sourceText) &&
      site.renderCollections.length > 0
  );
  const back = bench.controlSites.filter((site) =>
    /onClick=\{goBack\}/.test(site.sourceText) ||
    /onClick=\{\(\) => (?:setStep\(\(s\) => Math\.max\(0, s - 1\)\)|goto\(step - 1\))\}/.test(site.sourceText)
  );
  const next = bench.controlSites.filter((site) =>
    /onClick=\{goNext\}/.test(site.sourceText) ||
    /onClick=\{\(\) => (?:setStep\(\(s\) => Math\.min\(STEPS\.length - 1, s \+ 1\)\)|goto\(step \+ 1\))\}/.test(site.sourceText)
  );
  const contract = {
    answerSiteKey: exactlyOne("answer", answer),
    backSiteKey: exactlyOne("back", back),
    nextSiteKey: exactlyOne("next", next)
  };
  if (new Set(Object.values(contract)).size !== 3) {
    throw new Error(`${bench.benchId}: source navigation roles alias one JSX site`);
  }
  return contract;
}

function sourceEventProperty(eventName: string) {
  const properties = {
    change: "onChange",
    click: "onClick",
    contextmenu: "onContextMenu",
    keydown: "onKeyDown",
    pointercancel: "onPointerCancel",
    pointerdown: "onPointerDown",
    pointerleave: "onPointerLeave",
    pointermove: "onPointerMove",
    pointerup: "onPointerUp"
  } as const;
  return properties[eventName as keyof typeof properties];
}

function compileInstrumentedBench(bench: CaliforniaSignatureBenchControlBlueprint) {
  const cached = compiledSourceCache.get(bench.sourceSha256);
  if (cached) return cached;
  const productSource = readFileSync(path.join(
    resolveCaliforniaSignatureProductProjectRoot(),
    bench.sourcePath
  ), "utf8");
  const instrumented = instrumentCaliforniaSignatureBenchSource(bench, productSource);
  const compiled = ts.transpileModule(instrumented, {
    compilerOptions: {
      allowJs: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      jsxFactory: "__caCreateElement",
      jsxFragmentFactory: "__caFragment",
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: bench.sourcePath,
    reportDiagnostics: true
  });
  if (compiled.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
    throw new Error(`${bench.sourcePath}: source-executed JSX compilation failed`);
  }
  compiledSourceCache.set(bench.sourceSha256, compiled.outputText);
  return compiled.outputText;
}

function createSourceEngine(
  bench: CaliforniaSignatureBenchControlBlueprint,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[] =
    CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY
): SourceEngine {
  const compiled = compileInstrumentedBench(bench);
  const sites = new Map(bench.controlSites.map((site) => [site.siteKey, site]));
  const slots: HookSlot[] = [];
  let cursor = 0;
  let dirty = false;
  let mutationCounter = 0;
  let renderedRoot: unknown = null;
  let pendingEffects: Array<() => void> = [];
  const elementsByIdentity = new Map<string, FakeElement>();
  const elementsByRef = new WeakMap<object, FakeElement>();

  const mutate = () => { mutationCounter += 1; };
  const makeCanvasContext = () => {
    const gradient = { addColorStop() {} };
    const target: Record<string, unknown> = {
      canvas: null,
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      getImageData: () => ({ data: new Uint8ClampedArray(4), height: 1, width: 1 }),
      measureText: (text: unknown) => ({
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        width: String(text ?? "").length * 7
      })
    };
    return new Proxy(target, {
      get(record, property) {
        if (property in record) return record[property as string];
        return (..._args: unknown[]) => { mutate(); };
      },
      set(record, property, value) {
        record[property as string] = value;
        mutate();
        return true;
      }
    });
  };
  const makeElement = (type: string, props: Record<string, unknown>): FakeElement => {
    const listeners = new Map<string, Set<(event: FakeEvent) => void>>();
    const context = makeCanvasContext();
    const style = new Proxy<Record<string, unknown>>({}, {
      set(record, property, value) {
        record[property as string] = value;
        mutate();
        return true;
      }
    });
    const element: FakeElement = {
      addEventListener(name, listener) {
        const group = listeners.get(name) ?? new Set();
        group.add(listener);
        listeners.set(name, group);
      },
      clientHeight: 420,
      clientWidth: 640,
      dispatch(name, event) {
        for (const listener of listeners.get(name) ?? []) listener(event);
      },
      focus() { mutate(); },
      getBoundingClientRect() {
        return { bottom: 420, height: 420, left: 0, right: 640, top: 0, width: 640, x: 0, y: 0 };
      },
      getContext() { return context; },
      height: Number(props.height ?? 420),
      releasePointerCapture() { mutate(); },
      removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
      setPointerCapture() { mutate(); },
      style,
      value: props.value ?? "",
      width: Number(props.width ?? 640)
    };
    (context as Record<string, unknown>).canvas = element;
    return element;
  };

  const hooks = {
    useCallback<T extends (...args: never[]) => unknown>(callback: T, deps?: readonly unknown[]) {
      return hooks.useMemo(() => callback, deps) as T;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index];
      const changed = previous?.kind !== "effect" || deps === undefined ||
        !sameDependencies(previous.deps, deps);
      if (!changed) return;
      if (previous?.kind === "effect" && typeof previous.cleanup === "function") previous.cleanup();
      slots[index] = { deps, kind: "effect" };
      pendingEffects.push(() => {
        const slot = slots[index];
        if (slot?.kind === "effect") slot.cleanup = effect();
      });
    },
    useMemo<T>(factory: () => T, deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index];
      if (previous?.kind === "memo" && deps !== undefined && sameDependencies(previous.deps, deps)) {
        return previous.value as T;
      }
      const value = factory();
      slots[index] = { deps, kind: "memo", value };
      return value;
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      const previous = slots[index];
      if (previous?.kind === "ref") return previous.value as { current: T };
      let current: unknown = initial;
      const value = {} as { current: T };
      Object.defineProperty(value, "current", {
        configurable: false,
        enumerable: true,
        get: () => current,
        set: (next) => {
          if (!Object.is(current, next)) mutate();
          current = next;
        }
      });
      slots[index] = { kind: "ref", value };
      return value;
    },
    useState<T>(initial: T | (() => T)) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous) {
        slots[index] = {
          kind: "state",
          value: typeof initial === "function" ? (initial as () => T)() : initial
        };
      } else if (previous.kind !== "state") {
        throw new Error(`${bench.benchId}: source hook order changed at slot ${index}`);
      }
      const setValue = (next: T | ((value: T) => T)) => {
        const slot = slots[index];
        if (slot?.kind !== "state") throw new Error(`${bench.benchId}: missing source state slot ${index}`);
        const value = typeof next === "function"
          ? (next as (value: T) => T)(slot.value as T)
          : next;
        if (!Object.is(value, slot.value)) {
          slot.value = value;
          dirty = true;
          mutate();
        }
      };
      return [(slots[index] as Extract<HookSlot, { kind: "state" }>).value as T, setValue] as const;
    }
  };

  const fragment = Symbol("california-source-fragment");
  const createElement = (
    type: string | symbol | ((props: Record<string, unknown>) => unknown),
    rawProps: Record<string, unknown> | null,
    ...rawChildren: unknown[]
  ): unknown => {
    const props = { ...(rawProps ?? {}) };
    const children = (rawChildren.length > 0 ? rawChildren : [props.children])
      .flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
    delete props.children;
    if (type === fragment) return children;
    if (typeof type === "function") return type({ ...props, children });
    if (typeof type !== "string") {
      throw new Error(`${bench.benchId}: source JSX contains an unknown symbol element`);
    }
    const ref = props.ref as { current?: unknown } | ((value: unknown) => void) | undefined;
    const attributedIdentity =
      typeof props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE] === "string" &&
      typeof props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE] === "string"
        ? `${props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE]}\0${props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE]}`
        : null;
    let element = attributedIdentity ? elementsByIdentity.get(attributedIdentity) : undefined;
    if (!element && ref && typeof ref === "object") element = elementsByRef.get(ref);
    if (!element) element = makeElement(type, props);
    element.value = props.value ?? element.value;
    element.width = Number(props.width ?? element.width);
    element.height = Number(props.height ?? element.height);
    if (attributedIdentity) elementsByIdentity.set(attributedIdentity, element);
    if (ref && typeof ref === "object") elementsByRef.set(ref, element);
    if (typeof ref === "function") ref(element);
    else if (ref && typeof ref === "object") ref.current = element;
    return { children, element, props, type } satisfies VirtualNode;
  };

  const fakeWindow = {
    addEventListener() {},
    cancelAnimationFrame() {},
    devicePixelRatio: 1,
    matchMedia: () => ({
      addEventListener() {},
      addListener() {},
      matches: false,
      removeEventListener() {},
      removeListener() {}
    }),
    removeEventListener() {},
    requestAnimationFrame: () => 1,
    setTimeout: () => 1,
    speechSynthesis: {
      cancel() {},
      speak() {}
    }
  };
  class FakeSpeechSynthesisUtterance {
    lang = "";
    rate = 1;
    constructor(readonly text: string) {}
  }
  (fakeWindow as typeof fakeWindow & {
    SpeechSynthesisUtterance?: typeof FakeSpeechSynthesisUtterance;
  }).SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
  let randomState = 0x6d2b79f5;
  const fakeMath = Object.create(Math) as Math;
  fakeMath.random = () => {
    randomState |= 0;
    randomState = randomState + 0x6d2b79f5 | 0;
    let value = Math.imul(randomState ^ randomState >>> 15, 1 | randomState);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  class FakeResizeObserver {
    constructor(private readonly callback: () => void) {}
    disconnect() {}
    observe() { this.callback(); }
    unobserve() {}
  }
  const fakeDocument = {
    createElement: (name: string) => makeElement(name, {}),
    documentElement: { style: {} },
    fonts: { ready: Promise.resolve(), status: "loaded" }
  };
  const moduleObject: { exports: { default?: () => unknown } } = { exports: {} };
  const sourceRequire = (name: string) => {
    if (name === "react") return hooks;
    throw new Error(`${bench.sourcePath}: unexpected source-oracle import ${name}`);
  };
  const evaluate = new Function(
    "require", "module", "exports", "__caCreateElement", "__caFragment",
    "window", "document", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame",
    "setTimeout", "clearTimeout", "performance", "Image", "Math", "SpeechSynthesisUtterance", compiled
  );
  evaluate(
    sourceRequire,
    moduleObject,
    moduleObject.exports,
    createElement,
    fragment,
    fakeWindow,
    fakeDocument,
    FakeResizeObserver,
    fakeWindow.requestAnimationFrame,
    fakeWindow.cancelAnimationFrame,
    fakeWindow.setTimeout,
    () => {},
    { now: () => 0 },
    class FakeImage {},
    fakeMath,
    FakeSpeechSynthesisUtterance
  );
  const component = moduleObject.exports.default;
  if (typeof component !== "function") throw new Error(`${bench.sourcePath}: default component is not executable`);

  const settle = () => {
    for (let pass = 0; pass < 25; pass += 1) {
      cursor = 0;
      dirty = false;
      pendingEffects = [];
      renderedRoot = component();
      const effects = pendingEffects;
      pendingEffects = [];
      for (const effect of effects) effect();
      if (!dirty) return;
    }
    throw new Error(`${bench.benchId}: source-executed React state did not settle within 25 renders`);
  };
  settle();

  const virtualNodes = () => {
    const found: VirtualNode[] = [];
    const visit = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== "object" || !("type" in value) || !("children" in value)) return;
      const node = value as VirtualNode;
      found.push(node);
      node.children.forEach(visit);
    };
    visit(renderedRoot);
    return found;
  };
  const attributedNodes = () => virtualNodes().filter((node) =>
    typeof node.props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE] === "string" &&
    typeof node.props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE] === "string"
  );
  const nodeIdentity = (node: VirtualNode) =>
    `${node.props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE]}\0${node.props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE]}`;
  const optionNodes = (select: VirtualNode) => {
    const found: VirtualNode[] = [];
    const visit = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object" || !("type" in value)) return;
      const node = value as VirtualNode;
      if (node.type === "option") found.push(node);
      node.children.forEach(visit);
    };
    select.children.forEach(visit);
    return found;
  };
  const optionValue = (option: VirtualNode) => String(
    option.props.value ?? option.children.filter((child) => typeof child === "string" || typeof child === "number").join("")
  );

  const controls = (): CaliforniaSignatureSourceExpectedControl[] => {
    const nodes = attributedNodes();
    const radioGroups = new Map<string, VirtualNode[]>();
    for (const node of nodes) {
      const site = sites.get(String(node.props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE]));
      if (site?.kind !== "radio") continue;
      const key = `${site.siteKey}\0${String(node.props.name ?? "")}`;
      const group = radioGroups.get(key) ?? [];
      group.push(node);
      radioGroups.set(key, group);
    }
    return nodes.map((node) => {
      const sourceSiteKey = String(node.props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE]);
      const instanceKey = String(node.props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE]);
      const site = sites.get(sourceSiteKey);
      if (!site) throw new Error(`${bench.benchId}: source execution cites unknown site ${sourceSiteKey}`);
      const endpoint = (
        activationEndpoint: string,
        sourceTargetKey: string,
        value: unknown,
        endpointInstanceKey = "direct"
      ) => ({
        activationEndpoint,
        sourceEndpoint: {
          instanceKey: endpointInstanceKey,
          sourceTargetKey,
          value: String(value)
        } satisfies CaliforniaSignatureRuntimeEndpoint
      });
      let pairs: Array<{ activationEndpoint: string; sourceEndpoint: CaliforniaSignatureRuntimeEndpoint }>;
      let numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null = null;
      if (site.kind === "range" || site.kind === "number") {
        const values = resolveCaliforniaSignatureNumericEndpoints(
          site.numericMidpoint,
          node.props.min,
          node.props.max,
          node.props.step,
          `${bench.benchId}/${site.siteKey}/${instanceKey}`
        );
        numericMidpoint = values;
        pairs = site.endpointTargets
          .filter((target) => values.status === "available" || (
            target.name !== "mid" && (values.reachableCardinality === 2 || target.name === "min")
          ))
          .map((target) => {
          const value = values[target.name as "min" | "mid" | "max"];
          if (typeof value !== "string") {
            throw new Error(
              `${bench.benchId}/${site.siteKey}/${instanceKey}: source numeric target ${target.name} is unavailable`
            );
          }
            return endpoint(target.name, target.key, value);
          });
      } else if (site.kind === "checkbox") {
        const off = site.endpointTargets.find((target) => target.name === "false")!;
        const on = site.endpointTargets.find((target) => target.name === "true")!;
        pairs = [endpoint("false", off.key, false), endpoint("true", on.key, true)];
      } else if (site.kind === "select") {
        pairs = optionNodes(node).filter((option) => !option.props.disabled).map((option) => {
          const value = optionValue(option);
          const key = option.props[CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE];
          const optionInstance = option.props[CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE];
          if (typeof key !== "string" || typeof optionInstance !== "string") {
            throw new Error(`${bench.benchId}/${site.siteKey}: source option lacks exact AST identity`);
          }
          return endpoint(`option:${value}`, key, value, optionInstance);
        });
      } else if (site.kind === "radio") {
        const group = radioGroups.get(`${site.siteKey}\0${String(node.props.name ?? "")}`) ?? [];
        const target = site.endpointTargets[0]!;
        pairs = group.map((peer) => {
          const value = String(peer.props.value ?? "");
          return endpoint(
            `option:${value}`,
            target.key,
            value,
            String(peer.props[CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE])
          );
        });
      } else if (site.kind === "textarea") {
        const minimum = site.endpointTargets.find((target) => target.name === "minimum")!;
        const maximum = site.endpointTargets.find((target) => target.name === "maximum")!;
        pairs = [
          endpoint("minimum", minimum.key, node.props.minLength ?? 0),
          endpoint("maximum", maximum.key, node.props.maxLength)
        ];
      } else {
        pairs = site.endpointTargets.map((target) =>
          endpoint(target.name, target.key, target.name)
        );
      }
      return {
        endpoints: pairs.map((pair) => pair.activationEndpoint),
        instanceKey,
        kind: site.kind,
        numericMidpoint,
        sourceConditionKeys: site.sourceConditionKeys,
        sourceEndpoints: pairs.map((pair) => pair.sourceEndpoint),
        sourceSiteKey
      };
    });
  };

  const exactNode = (control: CaliforniaSignatureSourceExpectedControl) => {
    const matches = attributedNodes().filter((node) => nodeIdentity(node) ===
      `${control.sourceSiteKey}\0${control.instanceKey}`);
    if (matches.length !== 1) {
      throw new Error(
        `${bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: source execution resolves ${matches.length} nodes`
      );
    }
    return matches[0]!;
  };
  const dispatch = (node: VirtualNode, eventName: string, init: Partial<FakeEvent> = {}) => {
    const event: FakeEvent = {
      button: init.button ?? 0,
      buttons: init.buttons ?? 1,
      clientX: init.clientX ?? 320,
      clientY: init.clientY ?? 210,
      currentTarget: node.element,
      key: init.key ?? "",
      pointerId: init.pointerId ?? 1,
      preventDefault: () => { mutate(); },
      stopPropagation: () => { mutate(); },
      target: node.element,
      type: eventName
    };
    const property = sourceEventProperty(eventName);
    const handler = property ? node.props[property] : undefined;
    if (typeof handler === "function") (handler as (event: FakeEvent) => void)(event);
    node.element.dispatch(eventName, event);
    if (dirty) settle();
  };
  const activate = (
    control: CaliforniaSignatureSourceExpectedControl,
    endpointName: string,
    semanticStartOnly = false
  ) => {
    let node = exactNode(control);
    const site = sites.get(control.sourceSiteKey)!;
    if (site.kind === "action-button") dispatch(node, "click");
    else if (site.kind === "press-button") {
      dispatch(node, "click");
      if (endpointName === "restore") {
        node = exactNode(control);
        dispatch(node, "click");
      }
    } else if (site.kind === "range" || site.kind === "number") {
      const values = resolveCaliforniaSignatureNumericEndpoints(
        site.numericMidpoint,
        node.props.min,
        node.props.max,
        node.props.step,
        `${bench.benchId}/${site.siteKey}/${control.instanceKey}`
      );
      const value = values[endpointName as keyof typeof values];
      if (typeof value !== "string") {
        throw new Error(`${bench.benchId}/${site.siteKey}: unknown numeric endpoint ${endpointName}`);
      }
      node.element.value = value;
      dispatch(node, "change", { currentTarget: node.element, target: node.element });
    } else if (site.kind === "checkbox") {
      (node.element as FakeElement & { checked?: boolean }).checked = endpointName === "true";
      dispatch(node, "change", { currentTarget: node.element, target: node.element });
    } else if (site.kind === "select") {
      const value = endpointName.slice("option:".length);
      node.element.value = value;
      dispatch(node, "change", { currentTarget: node.element, target: node.element });
    } else if (site.kind === "radio") {
      const value = endpointName.slice("option:".length);
      const peer = attributedNodes().find((candidate) =>
        candidate.props[CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE] === control.sourceSiteKey &&
        String(candidate.props.name ?? "") === String(node.props.name ?? "") &&
        String(candidate.props.value ?? "") === value
      );
      if (!peer) throw new Error(`${bench.benchId}/${site.siteKey}: source radio endpoint ${value} is missing`);
      (peer.element as FakeElement & { checked?: boolean }).checked = true;
      dispatch(peer, "change", { currentTarget: peer.element, target: peer.element });
    } else if (site.kind === "textarea") {
      const length = Number(endpointName === "minimum" ? node.props.minLength ?? 0 : node.props.maxLength);
      node.element.value = "7".repeat(length);
      dispatch(node, "change", { currentTarget: node.element, target: node.element });
    } else {
      const entry = registry.find((candidate) =>
        candidate.benchId === bench.benchId && candidate.siteKey === site.siteKey
      );
      const action = entry?.endpointActions.find((candidate) => candidate.activationEndpoint === endpointName);
      if (!action) throw new Error(`${bench.benchId}/${site.siteKey}: no semantic action for ${endpointName}`);
      for (const step of semanticStartOnly ? action.steps.slice(0, 1) : action.steps) {
        node = exactNode(control);
        if (step.type === "key") dispatch(node, "keydown", { key: step.key });
        else dispatch(node, step.event, {
          button: step.event === "contextmenu" ? 2 : 0,
          buttons: step.event === "pointerup" || step.event === "pointerleave" ? 0 : 1,
          clientX: step.x * 640,
          clientY: step.y * 420
        });
      }
    }
  };

  const navigation = navigationContractFromSource(bench);
  return {
    activate,
    activateStart: (control, endpoint) => activate(control, endpoint, true),
    controls,
    isDisabled: (control) => Boolean(exactNode(control).props.disabled),
    mutationCount: () => mutationCounter,
    navigation,
    resetMutationCount: () => { mutationCounter = 0; },
    stateSignature: () => stableJson(slots.flatMap((slot, index) =>
      slot.kind === "state" ? [{ index, value: slot.value }] : []
    ))
  };
}

function engineForContext(
  context: CaliforniaSignatureSourceExpectedContext,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[] =
    CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY
) {
  const engine = createSourceEngine(context.bench, registry);
  const targetIndex = context.bench.lessonSteps.findIndex((step) => step.key === context.stepKey);
  if (targetIndex < 0) throw new Error(`${context.bench.benchId}: unknown source lesson state ${context.stepKey}`);
  for (let index = 0; index < targetIndex; index += 1) {
    const answer = engine.controls().find((control) => control.sourceSiteKey === engine.navigation.answerSiteKey);
    if (!answer) throw new Error(`${context.bench.benchId}: answer source site is absent at lesson step ${index}`);
    engine.activate(answer, answer.endpoints[0]!);
    const next = engine.controls().find((control) => control.sourceSiteKey === engine.navigation.nextSiteKey);
    if (!next) throw new Error(`${context.bench.benchId}: next source site is absent at lesson step ${index}`);
    engine.activate(next, next.endpoints[0]!);
  }
  for (const replay of context.branchPath) {
    const control = engine.controls().find((candidate) =>
      candidate.sourceSiteKey === replay.sourceSiteKey && candidate.instanceKey === replay.instanceKey
    );
    if (!control) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}: source replay lost ${replay.sourceSiteKey}/${replay.instanceKey}`
      );
    }
    const endpointIndex = control.endpoints.indexOf(replay.endpoint);
    if (endpointIndex < 0 || stableJson(control.sourceEndpoints[endpointIndex]) !== stableJson(replay.sourceEndpoint)) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}: source replay endpoint identity drifted for ${replay.endpoint}`
      );
    }
    engine.activate(control, replay.endpoint);
  }
  engine.resetMutationCount();
  return engine;
}

export async function inspectCaliforniaSignatureSourceExpectedControls(
  context: CaliforniaSignatureSourceExpectedContext
) {
  return engineForContext(context).controls();
}

function sourceActiveEndpoints(
  context: CaliforniaSignatureSourceExpectedContext,
  expected: CaliforniaSignatureSourceExpectedControl,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[]
) {
  const source = engineForContext(context, registry);
  const sourceControl = source.controls().find((candidate) =>
    candidate.sourceSiteKey === expected.sourceSiteKey && candidate.instanceKey === expected.instanceKey
  );
  if (!sourceControl) {
    throw new Error(
      `${context.bench.benchId}/${context.stepKey}: requested source control is missing ` +
      `${expected.sourceSiteKey}/${expected.instanceKey}`
    );
  }
  if (source.isDisabled(sourceControl)) return [];
  if (sourceControl.kind !== "interaction-surface") return sourceControl.endpoints;
  const active: string[] = [];
  for (const endpoint of sourceControl.endpoints) {
    const probe = engineForContext(context, registry);
    const probeControl = probe.controls().find((candidate) =>
      candidate.sourceSiteKey === sourceControl.sourceSiteKey && candidate.instanceKey === sourceControl.instanceKey
    )!;
    probe.resetMutationCount();
    probe.activateStart(probeControl, endpoint);
    if (probe.mutationCount() > 0) active.push(endpoint);
  }
  return active;
}

function sourceSemanticActivitySignature(
  context: CaliforniaSignatureSourceExpectedContext,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[]
) {
  const controls = engineForContext(context, registry).controls()
    .filter((control) => control.kind === "interaction-surface");
  return stableJson(controls.map((control) => ({
    activeEndpoints: sourceActiveEndpoints(context, control, registry),
    instanceKey: control.instanceKey,
    sourceSiteKey: control.sourceSiteKey
  })).sort((left, right) => stableJson(left).localeCompare(stableJson(right))));
}

function sourceControlShape(engine: SourceEngine) {
  return stableJson(engine.controls().map((candidate) => ({
    disabled: engine.isDisabled(candidate),
    endpoints: candidate.endpoints,
    instanceKey: candidate.instanceKey,
    kind: candidate.kind,
    numericMidpoint: candidate.numericMidpoint,
    sourceEndpoints: candidate.sourceEndpoints,
    sourceSiteKey: candidate.sourceSiteKey
  })).sort((left, right) => stableJson(left).localeCompare(stableJson(right))));
}

type CaliforniaSignatureSourceBranchTransition = {
  branchPath: CaliforniaSignatureSourceExpectedContext["branchPath"];
  endpoint: string;
};

/**
 * Returns the first source-state transition reachable by repeating each exact
 * endpoint.  Repetition is needed for authored actions such as dealing every
 * card: intermediate hook states can preserve the same rendered control shape
 * while still progressing toward a source guard.  The limit comes only from
 * AST-proven source cardinalities, never a bench/count allowlist.
 */
function sourceBranchTransitions(
  context: CaliforniaSignatureSourceExpectedContext,
  control: CaliforniaSignatureSourceExpectedControl,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[]
) {
  const baselineEngine = engineForContext(context, registry);
  const baselineShape = sourceControlShape(baselineEngine);
  const baselineActivity = sourceSemanticActivitySignature(context, registry);
  const navigation = baselineEngine.navigation;
  if ([navigation.answerSiteKey, navigation.backSiteKey, navigation.nextSiteKey].includes(control.sourceSiteKey)) {
    return [];
  }
  const transitions: CaliforniaSignatureSourceBranchTransition[] = [];
  for (const endpoint of control.endpoints) {
    const engine = engineForContext(context, registry);
    let branchPath = [...context.branchPath];
    const replayLimit = Math.max(
      2,
      ...context.bench.controlSites.map((site) => site.expectedMultiplicity),
      ...context.bench.controlSites.flatMap((site) =>
        site.endpointTargets.map((target) => target.expectedMultiplicity)
      )
    ) + 1;
    for (let replay = 0; replay < replayLimit; replay += 1) {
      const sourceControl = engine.controls().find((candidate) =>
        candidate.sourceSiteKey === control.sourceSiteKey && candidate.instanceKey === control.instanceKey
      );
      if (!sourceControl || engine.isDisabled(sourceControl)) break;
      const endpointIndex = sourceControl.endpoints.indexOf(endpoint);
      const sourceEndpoint = sourceControl.sourceEndpoints[endpointIndex];
      if (!sourceEndpoint) break;
      engine.resetMutationCount();
      engine.activate(sourceControl, endpoint);
      if (engine.mutationCount() === 0) break;
      branchPath = [...branchPath, {
        endpoint,
        instanceKey: sourceControl.instanceKey,
        sourceEndpoint,
        sourceSiteKey: sourceControl.sourceSiteKey
      }];
      const branchContext = { ...context, branchPath };
      const shape = sourceControlShape(engine);
      const activity = sourceSemanticActivitySignature(branchContext, registry);
      if (shape !== baselineShape || activity !== baselineActivity) {
        transitions.push({ branchPath, endpoint });
        break;
      }
    }
  }
  return transitions;
}

function assertRegistryExact(
  manifest: CaliforniaSignatureSourceManifest,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[]
) {
  const sourceSites = manifest.benches.flatMap((bench) => bench.controlSites
    .filter((site) => site.kind === "interaction-surface")
    .map((site) => ({ bench, site })));
  const registryKeys = registry.map((entry) => `${entry.benchId}\0${entry.siteKey}`);
  if (new Set(registryKeys).size !== registryKeys.length) {
    throw new Error("semantic interaction registry contains duplicate source sites");
  }
  for (const { bench, site } of sourceSites) {
    const entry = registry.find((candidate) =>
      candidate.benchId === bench.benchId && candidate.siteKey === site.siteKey
    );
    if (!entry) throw new Error(`${bench.benchId}/${site.siteKey}: semantic source site is missing from registry`);
    if (entry.sourceHandlerRef !== sourceHandlerRef(site)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: semantic handler drift`);
    }
    const actualTargets = entry.endpointActions.map((action) => action.sourceEventTargetKey).sort();
    const expectedTargets = site.endpointTargets.map((target) => target.key).sort();
    if (stableJson(actualTargets) !== stableJson(expectedTargets)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: semantic endpoint target drift`);
    }
    if (entry.endpointActions.some((action) => action.steps.length === 0)) {
      throw new Error(`${bench.benchId}/${site.siteKey}: semantic action sequence is empty`);
    }
  }
  const sourceKeys = new Set(sourceSites.map(({ bench, site }) => `${bench.benchId}\0${site.siteKey}`));
  const stale = registryKeys.filter((key) => !sourceKeys.has(key));
  if (stale.length > 0) throw new Error(`semantic registry cites stale source site ${stale[0]}`);
}

export function createCaliforniaSignatureSourceExpectedProvider(options: {
  interactionRegistry?: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[];
} = {}): CaliforniaSignatureSourceExpectedProvider {
  const registry = options.interactionRegistry ?? CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY;
  return {
    async activeEndpoints({ context, control }) {
      const expected = engineForContext(context, registry).controls().find((candidate) =>
        candidate.sourceSiteKey === control.sourceSiteKey && candidate.instanceKey === control.instanceKey
      );
      if (!expected) {
        throw new Error(
          `${context.bench.benchId}/${context.stepKey}: requested source control is missing ` +
          `${control.sourceSiteKey}/${control.instanceKey}`
        );
      }
      return sourceActiveEndpoints(context, expected, registry);
    },
    async activateNonFormEndpoint({ context, control, endpoint, root }) {
      const entry = registry.find((candidate) =>
        candidate.benchId === context.bench.benchId && candidate.siteKey === control.sourceSiteKey
      );
      const action = entry?.endpointActions.find((candidate) => candidate.activationEndpoint === endpoint);
      if (!entry || !action) {
        throw new Error(`${context.bench.benchId}/${control.sourceSiteKey}: no exact semantic action for ${endpoint}`);
      }
      const target = root.locator(
        `[${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(control.sourceSiteKey)}]` +
        `[${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}=${JSON.stringify(control.instanceKey)}]`
      );
      if (await target.count() !== 1) {
        throw new Error(`${context.bench.benchId}/${control.sourceSiteKey}: semantic action target is not unique`);
      }
      const rect = await target.boundingBox();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        throw new Error(`${context.bench.benchId}/${control.sourceSiteKey}: semantic action target has no box`);
      }
      for (const step of action.steps) {
        if (step.type === "key") {
          await target.focus();
          await target.press(step.key);
          continue;
        }
        await target.dispatchEvent(step.event, {
          bubbles: !["pointerleave"].includes(step.event),
          button: step.event === "contextmenu" ? 2 : 0,
          buttons: ["pointerup", "pointerleave", "pointercancel"].includes(step.event) ? 0 : 1,
          clientX: rect.x + rect.width * step.x,
          clientY: rect.y + rect.height * step.y,
          pointerId: 1,
          pointerType: "mouse"
        });
      }
    },
    async assertReady(manifest) {
      if (manifest.schemaVersion !== CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION) {
        throw new Error(
          `California signature source schema v${manifest.schemaVersion} is rejected; ` +
          `expected v${CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION}`
        );
      }
      if (manifest.componentSourceSha256 !== CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256) {
        throw new Error("California signature source identity drift");
      }
      assertRegistryExact(manifest, registry);
      assertCaliforniaSignatureSourceTargetsResolved(manifest);
      for (const bench of manifest.benches) navigationContractFromSource(bench);
    },
    async branchEndpoints({ context, control }) {
      return sourceBranchTransitions(context, control, registry)
        .map((transition) => transition.endpoint);
    },
    async expectedControls(context) {
      return engineForContext(context, registry).controls();
    },
    async navigationContract(bench) {
      return navigationContractFromSource(bench);
    },
    async resolveRuntimeControls({ context, controls }) {
      const expected = engineForContext(context, registry).controls();
      const expectedByIdentity = new Map(expected.map((control) => [
        `${control.sourceSiteKey}\0${control.instanceKey}`,
        control
      ]));
      return controls.map((control) => {
        const source = expectedByIdentity.get(`${control.sourceSiteKey}\0${control.instanceKey}`);
        if (!source) {
          throw new Error(
            `${context.bench.benchId}/${context.stepKey}: runtime invented ` +
            `${control.sourceSiteKey}/${control.instanceKey}`
          );
        }
        const endpointMap = new Map(source.endpoints.map((endpoint, index) => [
          endpoint,
          source.sourceEndpoints[index]!
        ]));
        const sourceEndpoints = control.endpoints.map((endpoint) => {
          const sourceEndpoint = endpointMap.get(endpoint);
          if (!sourceEndpoint) {
            throw new Error(
              `${context.bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: ` +
              `runtime invented endpoint ${endpoint}`
            );
          }
          return sourceEndpoint;
        });
        return {
          ...control,
          numericMidpoint: source.numericMidpoint,
          sourceConditionKeys: source.sourceConditionKeys,
          sourceEndpoints
        };
      });
    },
    async settleEndpoint({ root }) {
      await root.page().evaluate(() => new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      ));
    }
  };
}

export type CaliforniaSignatureSourceExpectedSweep = {
  activeSemanticEndpoints: number;
  authoredControls: number;
  authoredEndpoints: number;
  authoredStates: number;
  branchCoverageProofs: readonly string[];
  branchControls: number;
  branchEndpoints: number;
  branchFrontierExpected: number;
  branchFrontierRemaining: number;
  branchFrontierVisited: number;
  branchStates: number;
  inactiveZeroEndpointControls: readonly string[];
  reachableControlSites: number;
  semanticEndpoints: number;
};

/**
 * Executes the source IR independently of the runtime DOM.  It proves every
 * authored state and every source-reachable branch stays below the AST-derived
 * control/endpoint ceilings, then keeps branching until every source site and
 * every reviewed semantic endpoint has been active in at least one reachable
 * source state.  No bench/count allowlist participates in the proof.
 */
export async function auditCaliforniaSignatureSourceExpectedManifest(
  manifest: CaliforniaSignatureSourceManifest,
  options: {
    interactionRegistry?: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[];
  } = {}
): Promise<CaliforniaSignatureSourceExpectedSweep> {
  const registry = options.interactionRegistry ?? CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY;
  assertRegistryExact(manifest, registry);
  assertCaliforniaSignatureSourceTargetsResolved(manifest);
  const missingSites = new Set(manifest.benches.flatMap((bench) =>
    bench.controlSites.map((site) => `${bench.benchId}\0${site.siteKey}`)
  ));
  const expectedSemantic = new Set(registry.flatMap((entry) =>
    entry.endpointActions.map((action) =>
      `${entry.benchId}\0${entry.siteKey}\0${action.activationEndpoint}`
    )
  ));
  const activeSemantic = new Set<string>();
  const branchCoverageProofs = new Set<string>();
  const inactiveZeroEndpointControls = new Set<string>();
  let authoredControls = 0;
  let authoredEndpoints = 0;
  let authoredStates = 0;
  let branchControls = 0;
  let branchEndpoints = 0;
  let branchStates = 0;

  const inspectContext = (
    context: CaliforniaSignatureSourceExpectedContext,
    phase: "authored" | "branch"
  ) => {
    const engine = engineForContext(context, registry);
    const controls = engine.controls();
    if (phase === "authored") {
      authoredStates += 1;
      authoredControls += controls.length;
      authoredEndpoints += controls.reduce((sum, control) => sum + control.sourceEndpoints.length, 0);
    } else {
      branchStates += 1;
      branchControls += controls.length;
      branchEndpoints += controls.reduce((sum, control) => sum + control.sourceEndpoints.length, 0);
    }
    const sites = new Map(context.bench.controlSites.map((site) => [site.siteKey, site]));
    const siteCounts = new Map<string, number>();
    const controlIdentities = new Set<string>();
    for (const control of controls) {
      const site = sites.get(control.sourceSiteKey);
      if (!site) {
        throw new Error(
          `${context.bench.benchId}/${context.stepKey}: source execution invented site ${control.sourceSiteKey}`
        );
      }
      const identity = `${control.sourceSiteKey}\0${control.instanceKey}`;
      if (controlIdentities.has(identity)) {
        throw new Error(`${context.bench.benchId}/${context.stepKey}: duplicate source control ${identity}`);
      }
      controlIdentities.add(identity);
      const sourceSiteIdentity = `${context.bench.benchId}\0${control.sourceSiteKey}`;
      if (missingSites.delete(sourceSiteIdentity) && phase === "branch") {
        branchCoverageProofs.add(`site:${sourceSiteIdentity}`);
      }
      siteCounts.set(control.sourceSiteKey, (siteCounts.get(control.sourceSiteKey) ?? 0) + 1);
      const targetCounts = new Map<string, number>();
      for (const endpoint of control.sourceEndpoints) {
        const target = site.endpointTargets.find((candidate) => candidate.key === endpoint.sourceTargetKey);
        if (!target) {
          throw new Error(
            `${context.bench.benchId}/${site.siteKey}: source execution invented endpoint target ` +
            endpoint.sourceTargetKey
          );
        }
        targetCounts.set(endpoint.sourceTargetKey, (targetCounts.get(endpoint.sourceTargetKey) ?? 0) + 1);
      }
      for (const target of site.endpointTargets) {
        const actual = targetCounts.get(target.key) ?? 0;
        if (!target.multiplicityIsExact || actual > target.expectedMultiplicity) {
          throw new Error(
            `${context.bench.benchId}/${context.stepKey}/${site.siteKey}/${target.key}: ` +
            `source-executed endpoint ceiling ${actual}/${target.expectedMultiplicity}`
          );
        }
      }
      if (control.sourceEndpoints.length === 0) {
        if (!engine.isDisabled(control) || !["radio", "select"].includes(control.kind)) {
          throw new Error(
            `${context.bench.benchId}/${context.stepKey}/${site.siteKey}: ` +
            "source-active control has no executable endpoints"
          );
        }
        inactiveZeroEndpointControls.add(
          `${context.bench.benchId}\0${context.stepKey}\0${site.siteKey}\0${control.instanceKey}`
        );
      }
      if (control.kind === "interaction-surface") {
        for (const endpoint of sourceActiveEndpoints(context, control, registry)) {
          const semanticIdentity = `${context.bench.benchId}\0${site.siteKey}\0${endpoint}`;
          if (!activeSemantic.has(semanticIdentity) && phase === "branch") {
            branchCoverageProofs.add(`semantic:${semanticIdentity}`);
          }
          activeSemantic.add(semanticIdentity);
        }
      }
    }
    for (const [siteKey, actual] of siteCounts) {
      const site = sites.get(siteKey)!;
      if (!site.multiplicityIsExact || actual > site.expectedMultiplicity) {
        throw new Error(
          `${context.bench.benchId}/${context.stepKey}/${site.siteKey}: ` +
          `source-executed control ceiling ${actual}/${site.expectedMultiplicity}`
        );
      }
    }
    return controls;
  };

  for (const bench of manifest.benches) {
    for (const step of bench.lessonSteps) {
      inspectContext({ bench, branchPath: [], stepKey: step.key }, "authored");
    }
  }

  const benchNeedsBranch = (bench: CaliforniaSignatureBenchControlBlueprint) =>
    [...missingSites].some((key) => key.startsWith(`${bench.benchId}\0`)) ||
    [...expectedSemantic].some((key) =>
      key.startsWith(`${bench.benchId}\0`) && !activeSemantic.has(key)
    );

  for (const bench of manifest.benches.filter(benchNeedsBranch)) {
    const depthLimit = Math.max(
      8,
      ...bench.controlSites.map((site) => site.expectedMultiplicity),
      ...bench.controlSites.flatMap((site) =>
        site.endpointTargets.map((target) => target.expectedMultiplicity)
      )
    ) + 2;
    const contextLimit = Math.max(256, bench.controlSites.length * bench.lessonSteps.length * 32);
    let inspectedForBench = 0;
    // Seed every authored step before expanding any branch.  A target guarded
    // by a later lesson step must not force an exhaustive permutation search
    // inside step zero before that authored state gets a chance to run.
    const initialContexts = bench.lessonSteps.map((step): CaliforniaSignatureSourceExpectedContext => ({
        bench,
        branchPath: [],
        stepKey: step.key
    }));
    const queue: Array<{
      context: CaliforniaSignatureSourceExpectedContext;
      controls: readonly CaliforniaSignatureSourceExpectedControl[];
    }> = initialContexts.map((context) => ({
      context,
      controls: engineForContext(context, registry).controls()
    }));
    const queued = new Set(initialContexts.map((context) =>
      `${context.stepKey}\0${engineForContext(context, registry).stateSignature()}`
    ));
    while (queue.length > 0 && benchNeedsBranch(bench)) {
      const { context, controls } = queue.shift()!;
      for (const control of controls) {
        const active = new Set(sourceActiveEndpoints(context, control, registry));
        const transitions = sourceBranchTransitions(context, control, registry);
        for (const transition of transitions) {
          if (!active.has(transition.endpoint)) continue;
          const branchPath = transition.branchPath;
          if (branchPath.length > depthLimit) {
            throw new Error(
              `${bench.benchId}/${context.stepKey}: source branch depth exceeded ` +
              `${depthLimit} before coverage closed`
            );
          }
          const branchContext = { bench, branchPath, stepKey: context.stepKey };
          const stateKey = `${context.stepKey}\0${engineForContext(branchContext, registry).stateSignature()}`;
          if (queued.has(stateKey)) continue;
          queued.add(stateKey);
          const branchControls = inspectContext(branchContext, "branch");
          inspectedForBench += 1;
          if (inspectedForBench > contextLimit) {
            throw new Error(
              `${bench.benchId}: source branch sweep exceeded ${contextLimit} states before coverage closed`
            );
          }
          if (benchNeedsBranch(bench)) {
            queue.push({ context: branchContext, controls: branchControls });
          }
          if (!benchNeedsBranch(bench)) break;
        }
        if (!benchNeedsBranch(bench)) break;
      }
    }
  }

  const inactiveSemantic = [...expectedSemantic].filter((key) => !activeSemantic.has(key));
  if (missingSites.size > 0 || inactiveSemantic.length > 0) {
    throw new Error(
      `California source sweep left ${missingSites.size} control site(s) and ` +
      `${inactiveSemantic.length} semantic endpoint(s) unreachable: ` +
      [...missingSites, ...inactiveSemantic].slice(0, 12).join("; ")
    );
  }
  return {
    activeSemanticEndpoints: activeSemantic.size,
    authoredControls,
    authoredEndpoints,
    authoredStates,
    branchCoverageProofs: [...branchCoverageProofs].sort(),
    branchControls,
    branchEndpoints,
    branchFrontierExpected: branchStates,
    branchFrontierRemaining: 0,
    branchFrontierVisited: branchStates,
    branchStates,
    inactiveZeroEndpointControls: [...inactiveZeroEndpointControls].sort(),
    reachableControlSites: manifest.counts.controlSites,
    semanticEndpoints: expectedSemantic.size
  };
}

export const CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION = 3;
export const CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_PER_STATE_HARD_CAP = 8_192;
export const CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_TOTAL_HARD_CAP = 250_000;

/** Every control family the source oracle handles without a DOM fallback. */
export const CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_CONTROL_KINDS = [
  "action-button",
  "checkbox",
  "interaction-surface",
  "number",
  "press-button",
  "radio",
  "range",
  "select",
  "textarea"
] as const satisfies readonly CaliforniaSignatureSourceExpectedControl["kind"][];

export type CaliforniaSignatureSourceEvidenceOraclePhase =
  | "functional"
  | "layout"
  | "structural";

export type CaliforniaSignatureSourceEvidenceOracleEndpoint = {
  activationEndpoint: string;
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint;
};

export type CaliforniaSignatureSourceEvidenceOracleCanvasSurface = {
  bindingKeys: readonly string[];
  canvasCount: number;
  requiredPhases: readonly CaliforniaSignatureSourceEvidenceOraclePhase[];
  surfaceKey: "signature-canvas";
};

export type CaliforniaSignatureSourceEvidenceOracleControl = {
  activeEndpoints: readonly CaliforniaSignatureSourceEvidenceOracleEndpoint[];
  allEndpoints: readonly CaliforniaSignatureSourceEvidenceOracleEndpoint[];
  benchId: string;
  branchPath: readonly CaliforniaSignatureSourceExpectedContext["branchPath"][number][];
  disabled: boolean;
  instanceKey: string;
  key: string;
  kind: CaliforniaSignatureSourceExpectedControl["kind"];
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  sourceConditionKeys: readonly string[];
  sourceSiteKey: string;
  stateKey: string;
  stepKey: string;
};

export type CaliforniaSignatureSourceEvidenceOracleState = {
  benchId: string;
  branchPath: readonly CaliforniaSignatureSourceExpectedContext["branchPath"][number][];
  controls: readonly CaliforniaSignatureSourceEvidenceOracleControl[];
  key: string;
  kind: "authored" | "branch";
  sourceStateSha256: string;
  stepKey: string;
};

export type CaliforniaSignatureSourceEvidenceOracleCombinationActivation = {
  activationEndpoint: string;
  controlKind: CaliforniaSignatureSourceExpectedControl["kind"];
  instanceKey: string;
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  sourceConditionKeys: readonly string[];
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint;
  sourceSiteKey: string;
};

export type CaliforniaSignatureSourceEvidenceOracleCombination = {
  activations: readonly [
    CaliforniaSignatureSourceEvidenceOracleCombinationActivation,
    CaliforniaSignatureSourceEvidenceOracleCombinationActivation
  ];
  stateKey: string;
};

/**
 * One phase/axis-independent expected evidence identity.  The exhaustive
 * runner expands the declared phases over its frozen axes; it must never use
 * browser evidence to create or shrink this set.
 */
export type CaliforniaSignatureSourceEvidenceOracleRow = {
  activationEndpoint: string | null;
  benchId: string;
  branchPath: readonly CaliforniaSignatureSourceExpectedContext["branchPath"][number][];
  canvasSurface: CaliforniaSignatureSourceEvidenceOracleCanvasSurface | null;
  combinationActivations: CaliforniaSignatureSourceEvidenceOracleCombination["activations"] | null;
  controlKind: CaliforniaSignatureSourceExpectedControl["kind"] | null;
  instanceKey: string | null;
  key: string;
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  phases: readonly CaliforniaSignatureSourceEvidenceOraclePhase[];
  rowKind: "authored-state" | "combination" | "control" | "endpoint";
  sourceConditionKeys: readonly string[];
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint | null;
  sourceSiteKey: string | null;
  stepKey: string;
};

export type CaliforniaSignatureSourceExpectedEvidenceOracle = {
  blueprintSha256: string;
  canvasContractSha256: string;
  componentSourceSha256: string;
  counts: {
    authoredStates: number;
    branchStates: number;
    canvasReceiptRows: number;
    combinationOccurrences: number;
    controlOccurrences: number;
    endpointOccurrences: number;
    evidenceControlRows: number;
    evidenceCombinationRows: number;
    evidenceEndpointRows: number;
    evidenceRows: number;
    evidenceStateRows: number;
    numericAvailableOccurrences: number;
    numericOccurrences: number;
    numericUnavailableContracts: number;
    numericUnavailableOccurrences: number;
    numericUnavailableSites: number;
    reachableStates: number;
  };
  evidenceKeysSha256: string;
  frontierRemaining: 0;
  pairwisePeak: {
    rowCount: number;
    stateKey: string;
  };
  schemaVersion: typeof CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION;
  states: readonly CaliforniaSignatureSourceEvidenceOracleState[];
};

type CaliforniaSignatureSourceOracleEndpointCase = {
  control: CaliforniaSignatureSourceEvidenceOracleControl;
  endpoint: CaliforniaSignatureSourceEvidenceOracleEndpoint;
};

function sourceOracleControlIdentity(control: CaliforniaSignatureSourceEvidenceOracleControl) {
  return `${control.sourceSiteKey}\0${control.instanceKey}`;
}

function sourceOracleCombinationActivation(
  control: CaliforniaSignatureSourceEvidenceOracleControl,
  endpoint: CaliforniaSignatureSourceEvidenceOracleEndpoint
): CaliforniaSignatureSourceEvidenceOracleCombinationActivation {
  return {
    activationEndpoint: endpoint.activationEndpoint,
    controlKind: control.kind,
    instanceKey: control.instanceKey,
    numericMidpoint: control.numericMidpoint,
    sourceConditionKeys: [...control.sourceConditionKeys],
    sourceEndpoint: { ...endpoint.sourceEndpoint },
    sourceSiteKey: control.sourceSiteKey
  };
}

/**
 * Emit the complete unordered cross-control endpoint product for one exact
 * source state. Navigation controls are excluded because they leave the state;
 * every other enabled learner control participates without sampling.
 */
export function buildCaliforniaSignatureSourcePairwiseCombinations(
  state: CaliforniaSignatureSourceEvidenceOracleState,
  navigation: CaliforniaSignatureNavigationContract,
  hardCap = CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_PER_STATE_HARD_CAP
): readonly CaliforniaSignatureSourceEvidenceOracleCombination[] {
  if (!Number.isSafeInteger(hardCap) || hardCap < 0) {
    throw new Error(`${state.benchId}/${state.stepKey}: pairwise hard cap is invalid: ${hardCap}`);
  }
  const navigationSites = new Set([
    navigation.answerSiteKey,
    navigation.backSiteKey,
    navigation.nextSiteKey
  ]);
  const controls = state.controls
    .filter((control) =>
      !control.disabled && control.activeEndpoints.length > 0 && !navigationSites.has(control.sourceSiteKey)
    )
    .sort((left, right) => {
      const leftIdentity = sourceOracleControlIdentity(left);
      const rightIdentity = sourceOracleControlIdentity(right);
      return leftIdentity < rightIdentity ? -1 : leftIdentity > rightIdentity ? 1 : 0;
    });
  const controlIdentities = controls.map(sourceOracleControlIdentity);
  if (new Set(controlIdentities).size !== controlIdentities.length) {
    throw new Error(`${state.benchId}/${state.stepKey}/${state.key}: pairwise controls are not uniquely attributed`);
  }

  let expectedCount = 0;
  for (let left = 0; left < controls.length; left += 1) {
    for (let right = left + 1; right < controls.length; right += 1) {
      expectedCount += controls[left]!.activeEndpoints.length * controls[right]!.activeEndpoints.length;
    }
  }
  if (expectedCount > hardCap) {
    throw new Error(
      `${state.benchId}/${state.stepKey}/${state.key}: exact pairwise endpoint product ${expectedCount} ` +
      `exceeds fail-closed per-state cap ${hardCap}`
    );
  }

  const combinations: CaliforniaSignatureSourceEvidenceOracleCombination[] = [];
  for (let left = 0; left < controls.length; left += 1) {
    const leftControl = controls[left]!;
    for (let right = left + 1; right < controls.length; right += 1) {
      const rightControl = controls[right]!;
      for (const leftEndpoint of leftControl.activeEndpoints) {
        for (const rightEndpoint of rightControl.activeEndpoints) {
          combinations.push({
            activations: [
              sourceOracleCombinationActivation(leftControl, leftEndpoint),
              sourceOracleCombinationActivation(rightControl, rightEndpoint)
            ],
            stateKey: state.key
          });
        }
      }
    }
  }
  if (combinations.length !== expectedCount) {
    throw new Error(
      `${state.benchId}/${state.stepKey}/${state.key}: pairwise matrix ${combinations.length}/${expectedCount} is not exact`
    );
  }
  const identities = combinations.map((combination) => stableJson(combination));
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${state.benchId}/${state.stepKey}/${state.key}: pairwise matrix contains duplicate identities`);
  }
  return combinations;
}

function cloneSourceReplayPath(
  branchPath: CaliforniaSignatureSourceExpectedContext["branchPath"]
): CaliforniaSignatureSourceExpectedContext["branchPath"] {
  return branchPath.map((replay) => ({
    ...replay,
    sourceEndpoint: { ...replay.sourceEndpoint }
  }));
}

/** Canonical key consumed by the later phase/axis expansion. */
export function californiaSignatureSourceEvidenceOracleRowKey(
  row: Omit<CaliforniaSignatureSourceEvidenceOracleRow, "canvasSurface" | "key" | "phases">
) {
  return sourceOracleSha256(stableJson({
    activationEndpoint: row.activationEndpoint,
    benchId: row.benchId,
    branchPath: row.branchPath,
    combinationActivations: row.combinationActivations,
    controlKind: row.controlKind,
    instanceKey: row.instanceKey,
    numericMidpoint: row.numericMidpoint,
    rowKind: row.rowKind,
    sourceConditionKeys: row.sourceConditionKeys,
    sourceEndpoint: row.sourceEndpoint,
    sourceSiteKey: row.sourceSiteKey,
    stepKey: row.stepKey
  }));
}

function sourceOracleControlKey(options: {
  benchId: string;
  branchPath: CaliforniaSignatureSourceExpectedContext["branchPath"];
  control: CaliforniaSignatureSourceExpectedControl;
  stepKey: string;
}) {
  return stableJson({
    benchId: options.benchId,
    branchPath: options.branchPath,
    instanceKey: options.control.instanceKey,
    kind: options.control.kind,
    sourceSiteKey: options.control.sourceSiteKey,
    stepKey: options.stepKey
  });
}

function sourceOracleStateKey(context: CaliforniaSignatureSourceExpectedContext) {
  return stableJson({
    benchId: context.bench.benchId,
    branchPath: context.branchPath,
    stepKey: context.stepKey
  });
}

function inspectSourceOracleState(
  context: CaliforniaSignatureSourceExpectedContext,
  registry: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[]
) {
  const engine = engineForContext(context, registry);
  const stateKey = sourceOracleStateKey(context);
  const controls = engine.controls().map((control): CaliforniaSignatureSourceEvidenceOracleControl => {
    const sourceSite = context.bench.controlSites.find((site) => site.siteKey === control.sourceSiteKey);
    if (!sourceSite) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}: source oracle cites unknown site ${control.sourceSiteKey}`
      );
    }
    if (control.endpoints.length !== control.sourceEndpoints.length) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
        `source activation/target cardinality ${control.endpoints.length}/${control.sourceEndpoints.length}`
      );
    }
    if (new Set(control.endpoints).size !== control.endpoints.length) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
        "source activation endpoints are not unique"
      );
    }
    const allEndpoints = control.endpoints.map((activationEndpoint, index) => {
      const sourceEndpoint = control.sourceEndpoints[index];
      if (!sourceEndpoint) {
        throw new Error(
          `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}/` +
          `${activationEndpoint}: source endpoint is missing`
        );
      }
      return { activationEndpoint, sourceEndpoint: { ...sourceEndpoint } };
    });
    const disabled = engine.isDisabled(control);
    const activeEndpointNames = disabled
      ? []
      : control.kind === "interaction-surface"
        ? sourceActiveEndpoints(context, control, registry)
        : [...control.endpoints];
    const activeEndpoints = activeEndpointNames.map((activationEndpoint) => {
      const exact = allEndpoints.find((endpoint) => endpoint.activationEndpoint === activationEndpoint);
      if (!exact) {
        throw new Error(
          `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
          `active source endpoint ${activationEndpoint} lacks an exact target`
        );
      }
      return exact;
    });
    return {
      activeEndpoints,
      allEndpoints,
      benchId: context.bench.benchId,
      branchPath: cloneSourceReplayPath(context.branchPath),
      disabled,
      instanceKey: control.instanceKey,
      key: sourceOracleControlKey({
        benchId: context.bench.benchId,
        branchPath: context.branchPath,
        control,
        stepKey: context.stepKey
      }),
      kind: control.kind,
      numericMidpoint: control.numericMidpoint,
      sourceConditionKeys: [...control.sourceConditionKeys],
      sourceSiteKey: control.sourceSiteKey,
      stateKey,
      stepKey: context.stepKey
    };
  });
  if (new Set(controls.map((control) => control.key)).size !== controls.length) {
    throw new Error(`${context.bench.benchId}/${context.stepKey}: source oracle contains duplicate controls`);
  }
  return {
    controls,
    state: {
      benchId: context.bench.benchId,
      branchPath: cloneSourceReplayPath(context.branchPath),
      controls,
      key: stateKey,
      kind: context.branchPath.length === 0 ? "authored" as const : "branch" as const,
      sourceStateSha256: sourceOracleSha256(stableJson({
        controls: controls.map((control) => ({
          activeEndpoints: control.activeEndpoints,
          allEndpoints: control.allEndpoints,
          disabled: control.disabled,
          instanceKey: control.instanceKey,
          kind: control.kind,
          numericMidpoint: control.numericMidpoint,
          sourceConditionKeys: control.sourceConditionKeys,
          sourceSiteKey: control.sourceSiteKey
        })),
        sourceState: engine.stateSignature(),
        stepKey: context.stepKey
      })),
      stepKey: context.stepKey
    }
  };
}

function canvasSurfaceForOracleRow(
  canvasContract: CaliforniaCanvasGraphicsSourceContract,
  benchId: string,
  rowKind: CaliforniaSignatureSourceEvidenceOracleRow["rowKind"]
): CaliforniaSignatureSourceEvidenceOracleCanvasSurface | null {
  const bindingKeys = canvasContract.bindings
    .filter((binding) => binding.benchId === benchId)
    .map((binding) => binding.key)
    .sort();
  if (bindingKeys.length === 0) return null;
  return {
    bindingKeys,
    canvasCount: bindingKeys.length,
    requiredPhases: rowKind === "authored-state"
      ? ["structural"]
      : rowKind === "endpoint" || rowKind === "combination" ? ["layout"] : [],
    surfaceKey: "signature-canvas"
  };
}

function sourceOracleRow(
  canvasContract: CaliforniaCanvasGraphicsSourceContract,
  row: Omit<CaliforniaSignatureSourceEvidenceOracleRow, "canvasSurface" | "key">
): CaliforniaSignatureSourceEvidenceOracleRow {
  const withoutDerived = {
    activationEndpoint: row.activationEndpoint,
    benchId: row.benchId,
    branchPath: cloneSourceReplayPath(row.branchPath),
    combinationActivations: row.combinationActivations
      ? row.combinationActivations.map((activation) => ({
          ...activation,
          numericMidpoint: activation.numericMidpoint ? { ...activation.numericMidpoint } : null,
          sourceConditionKeys: [...activation.sourceConditionKeys],
          sourceEndpoint: { ...activation.sourceEndpoint }
        })) as unknown as CaliforniaSignatureSourceEvidenceOracleCombination["activations"]
      : null,
    controlKind: row.controlKind,
    instanceKey: row.instanceKey,
    numericMidpoint: row.numericMidpoint,
    rowKind: row.rowKind,
    sourceConditionKeys: [...row.sourceConditionKeys],
    sourceEndpoint: row.sourceEndpoint ? { ...row.sourceEndpoint } : null,
    sourceSiteKey: row.sourceSiteKey,
    stepKey: row.stepKey
  };
  return {
    ...withoutDerived,
    canvasSurface: canvasSurfaceForOracleRow(canvasContract, row.benchId, row.rowKind),
    key: californiaSignatureSourceEvidenceOracleRowKey(withoutDerived),
    phases: [...row.phases]
  };
}

function sourceOracleEndpointCasesByStep(
  states: readonly CaliforniaSignatureSourceEvidenceOracleState[]
) {
  const endpointCasesByStep = new Map<
    string,
    Map<string, CaliforniaSignatureSourceOracleEndpointCase>
  >();
  for (const state of states) {
    const stepIdentity = `${state.benchId}\0${state.stepKey}`;
    const endpointCases = endpointCasesByStep.get(stepIdentity) ?? new Map();
    endpointCasesByStep.set(stepIdentity, endpointCases);
    for (const control of state.controls) {
      for (const endpoint of control.activeEndpoints) {
        const caseKey = stableJson({
          activationEndpoint: endpoint.activationEndpoint,
          branchPath: control.branchPath,
          instanceKey: control.instanceKey,
          sourceEndpoint: endpoint.sourceEndpoint,
          sourceSiteKey: control.sourceSiteKey
        });
        endpointCases.set(caseKey, { control, endpoint });
      }
    }
  }
  return new Map([...endpointCasesByStep].map(([key, cases]) => {
    const sorted = [...cases.values()].sort((left, right) => {
      const leftKey = stableJson(left);
      const rightKey = stableJson(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
    return [key, sorted] as const;
  }));
}

function* iterateSourceOracleRowsFromStates(options: {
  benchIds?: ReadonlySet<string>;
  canvasContract: CaliforniaCanvasGraphicsSourceContract;
  manifest: CaliforniaSignatureSourceManifest;
  states: readonly CaliforniaSignatureSourceEvidenceOracleState[];
}): Generator<CaliforniaSignatureSourceEvidenceOracleRow> {
  const states = options.benchIds
    ? options.states.filter((state) => options.benchIds!.has(state.benchId))
    : options.states;
  const endpointCasesByStep = sourceOracleEndpointCasesByStep(states);
  let combinationOccurrences = 0;
  for (const bench of options.manifest.benches) {
    if (options.benchIds && !options.benchIds.has(bench.benchId)) continue;
    const exercised = new Set<string>();
    const recordedControls = new Set<string>();
    for (const step of bench.lessonSteps) {
      yield sourceOracleRow(options.canvasContract, {
        activationEndpoint: null,
        benchId: bench.benchId,
        branchPath: [],
        combinationActivations: null,
        controlKind: null,
        instanceKey: null,
        numericMidpoint: null,
        phases: ["functional", "layout", "structural"],
        rowKind: "authored-state",
        sourceConditionKeys: [],
        sourceEndpoint: null,
        sourceSiteKey: null,
        stepKey: step.key
      });
      const endpointCases = endpointCasesByStep.get(`${bench.benchId}\0${step.key}`) ?? [];
      for (const endpointCase of endpointCases) {
        const site = bench.controlSites.find((candidate) =>
          candidate.siteKey === endpointCase.control.sourceSiteKey
        );
        if (!site) {
          throw new Error(
            `${bench.benchId}/${step.key}: source evidence oracle cites unknown site ` +
            endpointCase.control.sourceSiteKey
          );
        }
        const stepIdentity = site.lessonChoiceMultiplicity ? step.key : null;
        const exerciseIdentity = stableJson({
          activationEndpoint: endpointCase.endpoint.activationEndpoint,
          branchPath: endpointCase.control.branchPath,
          instanceKey: endpointCase.control.instanceKey,
          sourceConditionKeys: endpointCase.control.sourceConditionKeys,
          sourceEndpoint: endpointCase.endpoint.sourceEndpoint,
          sourceSiteKey: endpointCase.control.sourceSiteKey,
          step: stepIdentity
        });
        if (exercised.has(exerciseIdentity)) continue;
        exercised.add(exerciseIdentity);
        const controlIdentity = stableJson({
          branchPath: endpointCase.control.branchPath,
          instanceKey: endpointCase.control.instanceKey,
          sourceConditionKeys: endpointCase.control.sourceConditionKeys,
          sourceEndpoints: endpointCase.control.allEndpoints,
          sourceSiteKey: endpointCase.control.sourceSiteKey,
          step: stepIdentity
        });
        if (!recordedControls.has(controlIdentity)) {
          recordedControls.add(controlIdentity);
          yield sourceOracleRow(options.canvasContract, {
            activationEndpoint: null,
            benchId: bench.benchId,
            branchPath: endpointCase.control.branchPath,
            combinationActivations: null,
            controlKind: endpointCase.control.kind,
            instanceKey: endpointCase.control.instanceKey,
            numericMidpoint: endpointCase.control.numericMidpoint,
            phases: ["functional", "layout"],
            rowKind: "control",
            sourceConditionKeys: endpointCase.control.sourceConditionKeys,
            sourceEndpoint: null,
            sourceSiteKey: endpointCase.control.sourceSiteKey,
            stepKey: step.key
          });
        }
        yield sourceOracleRow(options.canvasContract, {
          activationEndpoint: endpointCase.endpoint.activationEndpoint,
          benchId: bench.benchId,
          branchPath: endpointCase.control.branchPath,
          combinationActivations: null,
          controlKind: endpointCase.control.kind,
          instanceKey: endpointCase.control.instanceKey,
          numericMidpoint: endpointCase.control.numericMidpoint,
          phases: ["functional", "layout"],
          rowKind: "endpoint",
          sourceConditionKeys: endpointCase.control.sourceConditionKeys,
          sourceEndpoint: endpointCase.endpoint.sourceEndpoint,
          sourceSiteKey: endpointCase.control.sourceSiteKey,
          stepKey: step.key
        });
      }
    }
    for (const state of states.filter((state) => state.benchId === bench.benchId)) {
      const combinations = buildCaliforniaSignatureSourcePairwiseCombinations(
        state,
        navigationContractFromSource(bench)
      );
      combinationOccurrences += combinations.length;
      if (combinationOccurrences > CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_TOTAL_HARD_CAP) {
        throw new Error(
          `${state.benchId}/${state.stepKey}/${state.key}: cumulative exact pairwise endpoint product ` +
          `${combinationOccurrences} exceeds fail-closed total cap ` +
          `${CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_TOTAL_HARD_CAP}`
        );
      }
      for (const combination of combinations) {
        yield sourceOracleRow(options.canvasContract, {
          activationEndpoint: null,
          benchId: state.benchId,
          branchPath: state.branchPath,
          combinationActivations: combination.activations,
          controlKind: null,
          instanceKey: null,
          numericMidpoint: null,
          phases: ["layout"],
          rowKind: "combination",
          sourceConditionKeys: [...new Set(combination.activations.flatMap(
            (activation) => activation.sourceConditionKeys
          ))].sort(),
          sourceEndpoint: null,
          sourceSiteKey: null,
          stepKey: state.stepKey
        });
      }
    }
  }
}

/**
 * Build the independent expected side of the exhaustive evidence ledger.
 * Every state and endpoint comes from executing the frozen authored source;
 * no DOM, browser receipt, runtime snapshot, label, index, or geometry is read.
 */
export async function buildCaliforniaSignatureSourceExpectedEvidenceOracle(
  manifest: CaliforniaSignatureSourceManifest,
  options: {
    canvasContract?: CaliforniaCanvasGraphicsSourceContract;
    interactionRegistry?: readonly CaliforniaSignatureSemanticInteractionRegistryEntry[];
  } = {}
): Promise<CaliforniaSignatureSourceExpectedEvidenceOracle> {
  if (manifest.schemaVersion !== CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION) {
    throw new Error(
      `California signature source oracle rejects schema v${manifest.schemaVersion}; ` +
      `expected v${CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION}`
    );
  }
  if (manifest.componentSourceSha256 !== CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256) {
    throw new Error("California signature source oracle component identity drift");
  }
  if (manifest.blueprintSha256 !== CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256) {
    throw new Error("California signature source oracle blueprint identity drift");
  }
  const registry = options.interactionRegistry ?? CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY;
  const canvasContract = options.canvasContract ?? buildCaliforniaCanvasGraphicsSourceContract();
  if (canvasContract.sourceSha256 !== manifest.componentSourceSha256) {
    throw new Error("California signature source oracle Canvas/component identity drift");
  }
  assertRegistryExact(manifest, registry);
  assertCaliforniaSignatureSourceTargetsResolved(manifest);

  const states: CaliforniaSignatureSourceEvidenceOracleState[] = [];
  const missingSites = new Set(manifest.benches.flatMap((bench) =>
    bench.controlSites.map((site) => `${bench.benchId}\0${site.siteKey}`)
  ));
  const expectedSemantic = new Set(registry.flatMap((entry) =>
    entry.endpointActions.map((action) =>
      `${entry.benchId}\0${entry.siteKey}\0${action.activationEndpoint}`
    )
  ));
  const activeSemantic = new Set<string>();
  const recordContext = (context: CaliforniaSignatureSourceExpectedContext) => {
    const inspected = inspectSourceOracleState(context, registry);
    states.push(inspected.state);
    for (const control of inspected.controls) {
      missingSites.delete(`${context.bench.benchId}\0${control.sourceSiteKey}`);
      for (const endpoint of control.activeEndpoints) {
        if (control.kind === "interaction-surface") {
          activeSemantic.add(
            `${context.bench.benchId}\0${control.sourceSiteKey}\0${endpoint.activationEndpoint}`
          );
        }
      }
    }
    return inspected.controls;
  };

  // The 1,255 authored lesson states are always part of the expected side.
  for (const bench of manifest.benches) {
    for (const step of bench.lessonSteps) {
      recordContext({ bench, branchPath: [], stepKey: step.key });
    }
  }

  const benchNeedsBranch = (bench: CaliforniaSignatureBenchControlBlueprint) =>
    [...missingSites].some((key) => key.startsWith(`${bench.benchId}\0`)) ||
    [...expectedSemantic].some((key) =>
      key.startsWith(`${bench.benchId}\0`) && !activeSemantic.has(key)
    );
  // Expand only the exact source frontier required to expose every guarded
  // site and every reviewed semantic endpoint. This is the same independently
  // source-derived frontier whose frozen audit closes at 46 states; it avoids
  // inventing a browser/runtime Cartesian product as the expected set.
  for (const bench of manifest.benches.filter(benchNeedsBranch)) {
    const depthLimit = Math.max(
      8,
      ...bench.controlSites.map((site) => site.expectedMultiplicity),
      ...bench.controlSites.flatMap((site) =>
        site.endpointTargets.map((target) => target.expectedMultiplicity)
      )
    ) + 2;
    const contextLimit = Math.max(256, bench.controlSites.length * bench.lessonSteps.length * 32);
    let inspectedForBench = 0;
    const initialContexts = bench.lessonSteps.map((step): CaliforniaSignatureSourceExpectedContext => ({
      bench,
      branchPath: [],
      stepKey: step.key
    }));
    const queue: Array<{
      context: CaliforniaSignatureSourceExpectedContext;
      controls: readonly CaliforniaSignatureSourceExpectedControl[];
    }> = initialContexts.map((context) => ({
      context,
      controls: engineForContext(context, registry).controls()
    }));
    const queued = new Set(initialContexts.map((context) =>
      `${context.stepKey}\0${engineForContext(context, registry).stateSignature()}`
    ));
    while (queue.length > 0 && benchNeedsBranch(bench)) {
      const { context, controls } = queue.shift()!;
      for (const control of controls) {
        const active = new Set(sourceActiveEndpoints(context, control, registry));
        for (const transition of sourceBranchTransitions(context, control, registry)) {
          if (!active.has(transition.endpoint)) continue;
          if (transition.branchPath.length > depthLimit) {
            throw new Error(
              `${bench.benchId}/${context.stepKey}: source evidence oracle branch depth exceeded ${depthLimit}`
            );
          }
          const branchContext: CaliforniaSignatureSourceExpectedContext = {
            bench,
            branchPath: transition.branchPath,
            stepKey: context.stepKey
          };
          const stateIdentity =
            `${context.stepKey}\0${engineForContext(branchContext, registry).stateSignature()}`;
          if (queued.has(stateIdentity)) continue;
          queued.add(stateIdentity);
          recordContext(branchContext);
          const branchControls = engineForContext(branchContext, registry).controls();
          inspectedForBench += 1;
          if (inspectedForBench > contextLimit) {
            throw new Error(
              `${bench.benchId}: source evidence oracle exceeded ${contextLimit} states ` +
              "before its branch frontier closed"
            );
          }
          if (benchNeedsBranch(bench)) {
            queue.push({ context: branchContext, controls: branchControls });
          }
          if (!benchNeedsBranch(bench)) break;
        }
        if (!benchNeedsBranch(bench)) break;
      }
    }
  }

  const inactiveSemantic = [...expectedSemantic].filter((key) => !activeSemantic.has(key));
  if (missingSites.size > 0 || inactiveSemantic.length > 0) {
    throw new Error(
      `California source evidence oracle left ${missingSites.size} site(s) and ` +
      `${inactiveSemantic.length} semantic endpoint(s) outside its branch frontier`
    );
  }

  if (new Set(states.map((state) => state.key)).size !== states.length) {
    throw new Error("California signature source evidence oracle contains duplicate reachable state keys");
  }

  let combinationOccurrences = 0;
  let pairwisePeak = { rowCount: 0, stateKey: "" };
  const benchesById = new Map<string, CaliforniaSignatureBenchControlBlueprint>(
    manifest.benches.map((bench) => [bench.benchId, bench])
  );
  for (const state of states) {
    const bench = benchesById.get(state.benchId);
    if (!bench) throw new Error(`California signature source oracle lost bench ${state.benchId}`);
    const combinations = buildCaliforniaSignatureSourcePairwiseCombinations(
      state,
      navigationContractFromSource(bench)
    );
    if (combinations.length > pairwisePeak.rowCount) {
      pairwisePeak = { rowCount: combinations.length, stateKey: state.key };
    }
    combinationOccurrences += combinations.length;
    if (combinationOccurrences > CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_TOTAL_HARD_CAP) {
      throw new Error(
        `${state.benchId}/${state.stepKey}/${state.key}: cumulative exact pairwise endpoint product ` +
        `${combinationOccurrences} exceeds fail-closed total cap ` +
        `${CALIFORNIA_SIGNATURE_PAIRWISE_ROWS_TOTAL_HARD_CAP}`
      );
    }
  }

  const evidenceKeys: string[] = [];
  let canvasReceiptRows = 0;
  let evidenceControlRows = 0;
  let evidenceCombinationRows = 0;
  let evidenceEndpointRows = 0;
  let evidenceStateRows = 0;
  for (const row of iterateSourceOracleRowsFromStates({
    canvasContract,
    manifest,
    states
  })) {
    evidenceKeys.push(row.key);
    if ((row.canvasSurface?.requiredPhases.length ?? 0) > 0) canvasReceiptRows += 1;
    if (row.rowKind === "authored-state") evidenceStateRows += 1;
    else if (row.rowKind === "control") evidenceControlRows += 1;
    else if (row.rowKind === "endpoint") evidenceEndpointRows += 1;
    else evidenceCombinationRows += 1;
  }
  if (new Set(evidenceKeys).size !== evidenceKeys.length) {
    throw new Error("California signature source evidence oracle contains duplicate expected evidence keys");
  }
  const sortedEvidenceKeys = [...evidenceKeys].sort();
  const numericOccurrences = states.flatMap((state) => state.controls.filter(
    (control) => control.numericMidpoint !== null
  ));
  const numericUnavailable = numericOccurrences.filter(
    (control) => control.numericMidpoint?.status === "unavailable"
  );
  const numericUnavailableContracts = new Set(numericUnavailable.map((control) => stableJson({
    benchId: control.benchId,
    instanceKey: control.instanceKey,
    numericMidpoint: control.numericMidpoint,
    sourceSiteKey: control.sourceSiteKey
  })));
  const numericUnavailableSites = new Set(numericUnavailable.map(
    (control) => `${control.benchId}\0${control.sourceSiteKey}`
  ));
  return {
    blueprintSha256: manifest.blueprintSha256,
    canvasContractSha256: canvasContract.contractSha256,
    componentSourceSha256: manifest.componentSourceSha256,
    counts: {
      authoredStates: states.filter((state) => state.kind === "authored").length,
      branchStates: states.filter((state) => state.kind === "branch").length,
      canvasReceiptRows,
      combinationOccurrences,
      controlOccurrences: states.reduce((sum, state) => sum + state.controls.length, 0),
      endpointOccurrences: states.reduce((sum, state) => sum +
        state.controls.reduce((controlSum, control) => controlSum + control.activeEndpoints.length, 0), 0),
      evidenceControlRows,
      evidenceCombinationRows,
      evidenceEndpointRows,
      evidenceRows: evidenceKeys.length,
      evidenceStateRows,
      numericAvailableOccurrences: numericOccurrences.length - numericUnavailable.length,
      numericOccurrences: numericOccurrences.length,
      numericUnavailableContracts: numericUnavailableContracts.size,
      numericUnavailableOccurrences: numericUnavailable.length,
      numericUnavailableSites: numericUnavailableSites.size,
      reachableStates: states.length
    },
    evidenceKeysSha256: sourceOracleSha256(sortedEvidenceKeys.join("\n")),
    frontierRemaining: 0,
    pairwisePeak,
    schemaVersion: CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
    states
  };
}

export function* iterateCaliforniaSignatureSourceEvidenceOracleRows(options: {
  benchIds?: readonly string[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}): Generator<CaliforniaSignatureSourceEvidenceOracleRow> {
  if (options.oracle.schemaVersion !== CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION) {
    throw new Error("California signature source evidence iterator schema drifted");
  }
  if (options.oracle.blueprintSha256 !== options.manifest.blueprintSha256 ||
      options.oracle.componentSourceSha256 !== options.manifest.componentSourceSha256) {
    throw new Error("California signature source evidence iterator source identity drifted");
  }
  const canvasContract = buildCaliforniaCanvasGraphicsSourceContract();
  if (canvasContract.contractSha256 !== options.oracle.canvasContractSha256 ||
      canvasContract.sourceSha256 !== options.oracle.componentSourceSha256) {
    throw new Error("California signature source evidence iterator Canvas identity drifted");
  }
  const benchIds = options.benchIds ? new Set(options.benchIds) : undefined;
  if (benchIds) {
    if (benchIds.size !== options.benchIds!.length) {
      throw new Error("California signature source evidence iterator repeats a bench");
    }
    const known = new Set<string>(options.manifest.benches.map((bench) => bench.benchId));
    for (const benchId of benchIds) {
      if (!known.has(benchId)) {
        throw new Error(`California signature source evidence iterator cites unknown bench ${benchId}`);
      }
    }
  }
  const evidenceKeys: string[] = [];
  for (const row of iterateSourceOracleRowsFromStates({
    benchIds,
    canvasContract,
    manifest: options.manifest,
    states: options.oracle.states
  })) {
    evidenceKeys.push(row.key);
    yield row;
  }
  if (!benchIds) {
    if (evidenceKeys.length !== options.oracle.counts.evidenceRows) {
      throw new Error(
        `California signature source evidence iterator row count drifted ` +
        `${evidenceKeys.length}/${options.oracle.counts.evidenceRows}`
      );
    }
    if (new Set(evidenceKeys).size !== evidenceKeys.length) {
      throw new Error("California signature source evidence iterator contains duplicate keys");
    }
    const digest = sourceOracleSha256(evidenceKeys.sort().join("\n"));
    if (digest !== options.oracle.evidenceKeysSha256) {
      throw new Error("California signature source evidence iterator aggregate digest drifted");
    }
  }
}

/**
 * Compare later browser/ledger core keys with the independent source oracle.
 * Missing, extra, and duplicate actual rows all fail closed.
 */
export function assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(
  manifest: CaliforniaSignatureSourceManifest,
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle,
  actualKeys: readonly string[],
  label = "California signature source expected evidence oracle"
) {
  const expectedKeys = [...iterateCaliforniaSignatureSourceEvidenceOracleRows({ manifest, oracle })]
    .map((row) => row.key);
  if (new Set(expectedKeys).size !== expectedKeys.length) {
    throw new Error(`${label}: expected source oracle contains duplicate keys`);
  }
  const expectedDigest = sourceOracleSha256([...expectedKeys].sort().join("\n"));
  if (expectedDigest !== oracle.evidenceKeysSha256) {
    throw new Error(`${label}: expected source oracle digest drifted`);
  }
  if (new Set(actualKeys).size !== actualKeys.length) {
    throw new Error(`${label}: actual evidence contains duplicate keys`);
  }
  const expected = new Set(expectedKeys);
  const actual = new Set(actualKeys);
  const missing = expectedKeys.filter((key) => !actual.has(key));
  const extra = actualKeys.filter((key) => !expected.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label}: source expected vs actual evidence is not exact; ` +
      `missing=${missing.length} extra=${extra.length}; ` +
      `firstMissing=${missing[0] ?? "none"}; firstExtra=${extra[0] ?? "none"}`
    );
  }
  return {
    evidenceKeysSha256: expectedDigest,
    evidenceRows: expectedKeys.length
  };
}

export const californiaSignatureSourceExpectedProvider =
  createCaliforniaSignatureSourceExpectedProvider();
