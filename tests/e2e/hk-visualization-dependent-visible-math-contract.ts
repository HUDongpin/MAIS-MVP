import { createHash } from "node:crypto";
import { isProxy } from "node:util/types";

export type HkVisualizationDependentVisibleMathSequenceId =
  | "p1-number-bond-known-part"
  | "p1-add-step"
  | "p1-subtract-step"
  | "p2-payment-at-least-price"
  | "p4-divisor-within-number"
  | "p5-first-proper-fraction"
  | "p5-second-proper-fraction"
  | "p5-third-proper-fraction"
  | "p5-visible-volume-layers"
  | "s3-identity-a-projects-b"
  | "s3-identity-b-projects-a";

export type HkVisualizationDependentVisibleMathLanguage =
  | "en"
  | "zh"
  | "zh-Hans";

export type HkVisualizationDependentVisibleMathTheme = "dark" | "light";

export type HkVisualizationDependentVisibleMathContract = Readonly<{
  elementCount: number;
  expectedHashes: Readonly<Record<
    HkVisualizationDependentVisibleMathLanguage,
    string
  >>;
  occurrence: number;
  vizName: string;
}>;

type AttributeTuple = readonly [string, string];

type VisibleMathNode = Readonly<{
  geometryAttributes: readonly AttributeTuple[];
  learnerVisible: true;
  parentIndex: number;
  semanticAttributes: readonly AttributeTuple[];
  tagName: string;
  textHash: string;
}>;

const LANGUAGES = Object.freeze([
  "en",
  "zh",
  "zh-Hans",
] as const satisfies readonly HkVisualizationDependentVisibleMathLanguage[]);

function normalizedText(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function textHash(value: string) {
  return createHash("sha256").update(normalizedText(value)).digest("hex");
}

function attributes(
  entries: readonly (readonly [string, string | number | boolean])[],
) {
  return Object.freeze(entries.map(([name, value]) =>
    Object.freeze([name, String(value)] as const)
  ).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
}

function node(args: Readonly<{
  geometry?: readonly (readonly [string, string | number])[];
  parentIndex: number;
  semantic?: readonly (readonly [string, string | number | boolean])[];
  tagName: string;
  text?: string;
}>): VisibleMathNode {
  return Object.freeze({
    geometryAttributes: attributes(args.geometry ?? []),
    learnerVisible: true as const,
    parentIndex: args.parentIndex,
    semanticAttributes: attributes(args.semantic ?? []),
    tagName: args.tagName,
    textHash: textHash(args.text ?? ""),
  });
}

function hashNodes(nodes: readonly VisibleMathNode[]) {
  return createHash("sha256").update(JSON.stringify(nodes)).digest("hex");
}

function finiteState(
  state: Readonly<Record<string, number>>,
  key: string,
) {
  const value = state[key];
  if (!Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error(`Dependent visible-math state ${key} must be finite.`);
  }
  return value;
}

function owner(
  vizName: string,
  occurrence: number,
  nodesForLanguage: (
    language: HkVisualizationDependentVisibleMathLanguage,
  ) => readonly VisibleMathNode[],
): HkVisualizationDependentVisibleMathContract {
  const byLanguage = Object.fromEntries(LANGUAGES.map((language) => {
    const nodes = Object.freeze([...nodesForLanguage(language)]);
    if (nodes.length < 1 || nodes[0]?.parentIndex !== -1) {
      throw new Error(
        `Dependent visible-math owner ${vizName} has invalid root topology.`,
      );
    }
    nodes.forEach((candidate, index) => {
      if (
        candidate.parentIndex < -1 ||
        candidate.parentIndex >= index ||
        (index > 0 && candidate.parentIndex < 0)
      ) {
        throw new Error(
          `Dependent visible-math owner ${vizName} has invalid parent topology.`,
        );
      }
    });
    return [language, hashNodes(nodes)] as const;
  })) as Record<HkVisualizationDependentVisibleMathLanguage, string>;
  const counts = LANGUAGES.map((language) => nodesForLanguage(language).length);
  if (new Set(counts).size !== 1) {
    throw new Error(
      `Dependent visible-math owner ${vizName} changed topology by language.`,
    );
  }
  return Object.freeze({
    elementCount: counts[0],
    expectedHashes: Object.freeze(byLanguage),
    occurrence,
    vizName,
  });
}

function gcd(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : gcd(right, left % right);
}

function lcm(left: number, right: number) {
  return Math.abs(left * right) / gcd(left, right);
}

function numberBondContracts(state: Readonly<Record<string, number>>) {
  const total = finiteState(state, "total");
  const known = finiteState(state, "knownPart");
  const missing = total - known;
  const counters = Array.from({ length: 20 }, (_, index) => node({
    geometry: [
      ["cx", (index % 10) * 48],
      ["cy", Math.floor(index / 10) * 48],
      ["r", 16],
    ],
    parentIndex: 0,
    semantic: [
      ["data-viz-name", "counter"],
      [
        "data-viz-part",
        index < total ? (index < known ? "known" : "missing") : "empty",
      ],
    ],
    tagName: "circle",
  }));
  const partOwner = (vizName: string, value: number, x: number) => owner(
    vizName,
    0,
    () => Object.freeze([
      node({
        parentIndex: -1,
        semantic: [["data-viz-name", vizName]],
        tagName: "g",
      }),
      node({
        geometry: [["cx", x], ["cy", 300], ["r", 38]],
        parentIndex: 0,
        tagName: "circle",
      }),
      node({
        geometry: [["text-anchor", "middle"], ["x", x], ["y", 311]],
        parentIndex: 0,
        tagName: "text",
        text: String(value),
      }),
    ]),
  );
  return Object.freeze([
    owner("counter-set", 0, () => Object.freeze([
      node({
        geometry: [["transform", "translate(76 66)"]],
        parentIndex: -1,
        semantic: [
          ["data-viz-name", "counter-set"],
          ["data-viz-total", total],
        ],
        tagName: "g",
      }),
      ...counters,
    ])),
    partOwner("known-part-node", known, 170),
    partOwner("missing-part-node", missing, 470),
  ]);
}

function addSubtractContracts(
  state: Readonly<Record<string, number>>,
  operation: string,
) {
  const start = finiteState(state, "start");
  const step = finiteState(state, "step");
  const end = operation === "add" ? start + step : start - step;
  const startX = 70 + start * 25;
  if (step === 0) {
    return Object.freeze([owner("stationary-point", 0, () => Object.freeze([
      node({
        geometry: [["cx", startX], ["cy", 245], ["r", 15]],
        parentIndex: -1,
        semantic: [
          ["data-viz-name", "stationary-point"],
          ["data-viz-value", start],
        ],
        tagName: "circle",
      }),
    ]))]);
  }
  const endX = 70 + end * 25;
  const path =
    `M${startX} 220 Q${(startX + endX) / 2} ${120 - Math.abs(endX - startX) * 0.08} ${endX} 220`;
  return Object.freeze([owner("directed-jump", 0, () => Object.freeze([
    node({
      geometry: [["d", path]],
      parentIndex: -1,
      semantic: [
        ["data-viz-end", end],
        ["data-viz-name", "directed-jump"],
        ["data-viz-operation", operation],
        ["data-viz-start", start],
        ["data-viz-step", step],
      ],
      tagName: "path",
    }),
  ]))]);
}

function moneyContracts(state: Readonly<Record<string, number>>) {
  const price = finiteState(state, "price");
  const payment = finiteState(state, "payment");
  const barWidth = 488;
  const priceWidth = barWidth * price / payment;
  return Object.freeze([
    owner("payment-bar", 0, () => Object.freeze([node({
      geometry: [["height", 70], ["width", barWidth], ["x", 76], ["y", 228]],
      parentIndex: -1,
      semantic: [
        ["data-viz-name", "payment-bar"],
        ["data-viz-payment", payment],
      ],
      tagName: "rect",
    })])),
    owner("price-segment", 0, () => Object.freeze([node({
      geometry: [["height", 70], ["width", priceWidth], ["x", 76], ["y", 228]],
      parentIndex: -1,
      semantic: [
        ["data-viz-name", "price-segment"],
        ["data-viz-price", price],
      ],
      tagName: "rect",
    })])),
  ]);
}

function remainderContract(state: Readonly<Record<string, number>>) {
  const dividend = finiteState(state, "firstNumber");
  const divisor = finiteState(state, "candidateDivisor");
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const factor = remainder === 0;
  const prefix = `${dividend} ÷ ${divisor} = ${quotient} r ${remainder} · `;
  const suffix = {
    en: factor ? "✓ factor" : "✕ not a factor",
    zh: factor ? "✓ 因數" : "✕ 不是因數",
    "zh-Hans": factor ? "✓ 因数" : "✕ 不是因数",
  } as const;
  return Object.freeze([owner("remainder-test", 0, (language) => Object.freeze([
    node({
      parentIndex: -1,
      semantic: [
        ["data-viz-dividend", dividend],
        ["data-viz-divisor", divisor],
        ["data-viz-is-factor", factor],
        ["data-viz-name", "remainder-test"],
        ["data-viz-quotient", quotient],
        ["data-viz-remainder", remainder],
      ],
      tagName: "g",
    }),
    node({
      geometry: [["height", 58], ["width", 408], ["x", 116], ["y", 273]],
      parentIndex: 0,
      tagName: "rect",
    }),
    node({
      geometry: [["text-anchor", "middle"], ["x", 320], ["y", 308]],
      parentIndex: 0,
      tagName: "text",
      text: `${prefix}${suffix[language]}`,
    }),
  ]))]);
}

function fractionContracts(
  state: Readonly<Record<string, number>>,
  operation: "add" | "subtract",
) {
  const prefixes = ["first", "second", "third"] as const;
  const fractions = prefixes.map((prefix) => ({
    denominator: finiteState(state, `${prefix}Denominator`),
    numerator: finiteState(state, `${prefix}Numerator`),
  }));
  const commonDenominator = fractions.reduce(
    (current, fraction) => lcm(current, fraction.denominator),
    1,
  );
  return Object.freeze(fractions.map((fraction, row) => {
    const y = 52 + row * 70;
    const pieceWidth = 360 / commonDenominator;
    const commonNumerator =
      fraction.numerator * commonDenominator / fraction.denominator;
    return owner("source-fraction-bar", row, () => {
      const nodes: VisibleMathNode[] = [
        node({
          parentIndex: -1,
          semantic: [
            ["data-viz-common-denominator", commonDenominator],
            ["data-viz-common-numerator", commonNumerator],
            ["data-viz-denominator", fraction.denominator],
            ["data-viz-name", "source-fraction-bar"],
            ["data-viz-numerator", fraction.numerator],
          ],
          tagName: "g",
        }),
        node({
          geometry: [["height", 44], ["width", 360], ["x", 170], ["y", y]],
          parentIndex: 0,
          tagName: "rect",
        }),
      ];
      for (let index = 0; index < commonDenominator; index += 1) {
        nodes.push(node({
          geometry: [
            ["height", 44],
            ["width", pieceWidth],
            ["x", 170 + index * pieceWidth],
            ["y", y],
          ],
          parentIndex: 0,
          semantic: [
            ["data-viz-filled", index < commonNumerator],
            ["data-viz-name", "common-partition-part"],
          ],
          tagName: "rect",
        }));
      }
      nodes.push(node({
        geometry: [["text-anchor", "middle"], ["x", 94], ["y", y + 28]],
        parentIndex: 0,
        tagName: "text",
        text:
          `${fraction.numerator}/${fraction.denominator} ≡ ${commonNumerator}/${commonDenominator}`,
      }));
      if (row > 0) {
        nodes.push(node({
          geometry: [["text-anchor", "middle"], ["x", 151], ["y", y + 29]],
          parentIndex: 0,
          tagName: "text",
          text: operation === "add" ? "+" : "−",
        }));
      }
      return Object.freeze(nodes);
    });
  }));
}

function volumeContracts(state: Readonly<Record<string, number>>) {
  const length = finiteState(state, "length");
  const width = finiteState(state, "width");
  const height = finiteState(state, "height");
  const visibleLayers = finiteState(state, "visibleLayers");
  const layerSize = length * width;
  const volume = layerSize * height;
  const originX = 320;
  const originY = 258;
  const stepX = 22;
  const stepY = 11;
  const layerRise = 25;
  const cubes = Array.from({ length: visibleLayers }, (_, z) =>
    Array.from({ length: width }, (_, row) =>
      Array.from({ length }, (_, column) => ({ z, row, column }))
    )
  ).flat(2).sort((left, right) =>
    left.z - right.z ||
    (left.row + left.column) - (right.row + right.column) ||
    left.row - right.row
  );
  return Object.freeze([owner("layer-stack", 0, () => {
    const nodes: VisibleMathNode[] = [node({
      parentIndex: -1,
      semantic: [
        ["data-viz-layer-size", layerSize],
        ["data-viz-name", "layer-stack"],
        ["data-viz-total-layers", height],
        ["data-viz-visible-layers", visibleLayers],
        ["data-viz-volume", volume],
      ],
      tagName: "g",
    })];
    for (const { z, row, column } of cubes) {
      const wrapperIndex = nodes.length;
      nodes.push(node({
        parentIndex: 0,
        semantic: [["data-viz-layer", z + 1]],
        tagName: "g",
      }));
      const cubeIndex = nodes.length;
      nodes.push(node({
        parentIndex: wrapperIndex,
        semantic: [["data-viz-name", "unit-cube"]],
        tagName: "g",
      }));
      const x = originX + (column - row) * stepX;
      const y = originY + (column + row) * stepY - z * layerRise;
      const half = 22;
      const rise = 22 * 0.52;
      const cubeHeight = 22 * 1.08;
      for (const points of [
        `${x},${y - cubeHeight} ${x + half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x - half},${y - cubeHeight + rise}`,
        `${x - half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x},${y} ${x - half},${y - rise}`,
        `${x + half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x},${y} ${x + half},${y - rise}`,
      ]) {
        nodes.push(node({
          geometry: [["points", points]],
          parentIndex: cubeIndex,
          tagName: "polygon",
        }));
      }
    }
    return Object.freeze(nodes);
  })]);
}

function identityContracts(state: Readonly<Record<string, number>>) {
  const a = finiteState(state, "a");
  const b = finiteState(state, "b");
  const area = (a + b) ** 2;
  const scale = 270 / (a + b);
  const wholeSize = (a + b) * scale;
  const aSize = a * scale;
  const bSize = b * scale;
  const left = (640 - wholeSize) / 2;
  const top = (400 - wholeSize) / 2;
  const rect = (
    parentIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    semantic: readonly (readonly [string, string | number])[] = [],
  ) => node({
    geometry: [["height", height], ["width", width], ["x", x], ["y", y]],
    parentIndex,
    semantic,
    tagName: "rect",
  });
  return Object.freeze([owner("identity-square-whole", 0, () => Object.freeze([
    node({
      parentIndex: -1,
      semantic: [
        ["data-viz-a", a],
        ["data-viz-area", area],
        ["data-viz-b", b],
        ["data-viz-name", "identity-square-whole"],
      ],
      tagName: "g",
    }),
    rect(0, left, top, aSize, aSize, [
      ["data-viz-area", a ** 2],
      ["data-viz-name", "identity-a2"],
    ]),
    node({
      parentIndex: 0,
      semantic: [
        ["data-viz-area", 2 * a * b],
        ["data-viz-name", "identity-cross-parts"],
      ],
      tagName: "g",
    }),
    rect(2, left + aSize, top, bSize, aSize),
    rect(2, left, top + aSize, aSize, bSize),
    rect(0, left + aSize, top + aSize, bSize, bSize, [
      ["data-viz-area", b ** 2],
      ["data-viz-name", "identity-b2"],
    ]),
    rect(0, left, top, wholeSize, wholeSize),
  ]))]);
}

export function buildHkVisualizationDependentVisibleMathContracts(args: Readonly<{
  fractionOperation?: "add" | "subtract";
  modeId: string;
  sequenceId: HkVisualizationDependentVisibleMathSequenceId;
  state: Readonly<Record<string, number>>;
}>): readonly HkVisualizationDependentVisibleMathContract[] {
  switch (args.sequenceId) {
    case "p1-number-bond-known-part":
      return numberBondContracts(args.state);
    case "p1-add-step":
    case "p1-subtract-step":
      if (args.modeId !== "add" && args.modeId !== "subtract") {
        throw new Error("Dependent visible-math add/subtract mode is invalid.");
      }
      return addSubtractContracts(args.state, args.modeId);
    case "p2-payment-at-least-price":
      return moneyContracts(args.state);
    case "p4-divisor-within-number":
      return remainderContract(args.state);
    case "p5-first-proper-fraction":
    case "p5-second-proper-fraction":
    case "p5-third-proper-fraction":
      return fractionContracts(
        args.state,
        args.fractionOperation ?? "subtract",
      );
    case "p5-visible-volume-layers":
      return volumeContracts(args.state);
    case "s3-identity-a-projects-b":
    case "s3-identity-b-projects-a":
      return identityContracts(args.state);
  }
}

export type HkVisualizationDependentVisibleMathPaint = Readonly<{
  fill: HkVisualizationDependentVisibleMathColor;
  fillOpacity: number;
  opacity: number;
  stroke: HkVisualizationDependentVisibleMathColor;
  strokeOpacity: number;
  strokeWidth: number;
}>;

export type HkVisualizationDependentVisibleMathColor =
  | Readonly<{ kind: "none" }>
  | Readonly<{
      alpha: number;
      blue: number;
      green: number;
      kind: "solid-srgb";
      red: number;
    }>;

export type HkVisualizationDependentVisibleMathWrapper = Readonly<{
  animationName: "none";
  clipPath: "none";
  contentVisibility: "visible";
  cssTransform: "none";
  display: "block" | "grid";
  filter: "none";
  isolation: "auto";
  mask: "none";
  mixBlendMode: "normal";
  opacity: number;
  overflowX: "auto" | "visible";
  overflowY: "auto" | "visible";
  perspective: "none";
  role:
    | "primary-model"
    | "primary-model-grid"
    | "primary-scrollport"
    | "primary-surface-column"
    | "primary-svg-frame"
    | "secondary-compact-frame"
    | "secondary-model"
    | "secondary-model-grid"
    | "secondary-panport"
    | "secondary-surface"
    | "secondary-surface-column";
  rotate: "none";
  scale: "none";
  tagName: string;
  topicId: string;
  transitionDuration: "0s";
  translate: "none";
  visibility: "visible";
  zoom: number;
}>;

export type HkVisualizationDependentVisibleMathProjectionNode = Readonly<{
  computedGeometry: readonly AttributeTuple[];
  computedRender: Readonly<{
    alignmentBaseline: string;
    baselineShift: string;
    dominantBaseline: string;
    fontFamily: string;
    fontSize: string;
    fontStretch: string;
    fontStyle: string;
    fontWeight: string;
    isolation: string;
    letterSpacing: string;
    markerEnd: string;
    markerMid: string;
    markerStart: string;
    mixBlendMode: string;
    paintOrder: string;
    shapeRendering: string;
    strokeDasharray: string;
    strokeDashoffset: string;
    strokeLinecap: string;
    strokeLinejoin: string;
    strokeMiterlimit: string;
    textAnchor: string;
    textRendering: string;
    vectorEffect: string;
    wordSpacing: string;
  }>;
  coordinateMatrix: readonly number[];
  geometryAttributes: readonly AttributeTuple[];
  learnerVisible: boolean;
  paint: HkVisualizationDependentVisibleMathPaint | null;
  opacityFactors: Readonly<{
    localOpacity: number;
    svgAncestorOpacityProduct: number;
    wrapperOpacityProduct: number;
  }>;
  parentIndex: number;
  semanticAttributes: readonly AttributeTuple[];
  tagName: string;
  textHash: string;
}>;

export type HkVisualizationDependentVisibleMathProjection = Readonly<{
  nodes: readonly HkVisualizationDependentVisibleMathProjectionNode[];
  surface: Readonly<{
    ancestryScaleSummary: Readonly<{
      ancestorHash: string;
      chainCount: number;
      effectHash: string;
      entryCount: number;
      policyVersion: "visible-math-ancestry-scale-summary.v1";
      scaleHash: string;
      scaleWitnessCount: 3;
    }>;
    documentAncestorAudit: Readonly<{
      bodyOverflowX: "hidden";
      clippingAncestorCount: 2;
      opacityProduct: number;
      policy: "safe-effects-through-document-element-v3";
    }>;
    ownerProjection: Readonly<{
      ariaLabelHash: string;
      attributeCount: number;
      attributeNames: readonly string[];
      attributeSummaryHash: string;
      dataVizInteractive: "absent" | "false" | "true";
      effectPolicy: "safe-owner-effects-v2";
      opacity: number;
      role: "group" | "img";
      surfaceIdentity: string;
      titleDescTopology: readonly Readonly<{
        tagName: "desc" | "title";
        textHash: string;
      }>[];
    }>;
    preserveAspectRatio: string;
    scrollportCssTransform: "none";
    svgCssTransform: "none";
    viewBox: Readonly<{ height: number; width: number; x: number; y: number }>;
    viewportMatrix: readonly number[];
    wrapperTopology: readonly HkVisualizationDependentVisibleMathWrapper[];
  }>;
}>;

export type HkVisualizationDependentVisibleMathExpectedProjection = Readonly<{
  captureRoot: "parent" | "self";
  contractId: string;
  hash: string;
  occurrence: number;
  projection: HkVisualizationDependentVisibleMathProjection;
  selector: string;
}>;

export type HkVisualizationDependentVisibleMathAggregateContract = Readonly<{
  contractIds: readonly string[];
  elementCount: number;
  expectedAncestryScaleSummaries: Readonly<Record<
    HkVisualizationDependentVisibleMathLanguage,
    Readonly<Record<
      HkVisualizationDependentVisibleMathTheme,
      HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary
    >>
  >>;
  expectedHashes: Readonly<Record<
    HkVisualizationDependentVisibleMathLanguage,
    Readonly<Record<HkVisualizationDependentVisibleMathTheme, string>>
  >>;
  selectors: readonly Readonly<{
    captureRoot: "parent" | "self";
    contractId: string;
    occurrence: number;
    selector: string;
  }>[];
}>; 

export type HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary =
  Readonly<{
    chainCount: number;
    contractCount: number;
    entryCount: number;
    hash: string;
    policyVersion: "visible-math-aggregate-ancestry-scale-summary.v1";
    scaleWitnessCount: number;
  }>;

export type HkVisualizationDependentVisibleMathAggregateObservation = Readonly<{
  ancestryScaleSummary: HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary;
  elementCount: number;
  hash: string;
}>;

type ExpectedProjectionArgs = Readonly<{
  fractionOperation?: "add" | "subtract";
  language?: HkVisualizationDependentVisibleMathLanguage;
  modeId: string;
  sequenceId: HkVisualizationDependentVisibleMathSequenceId;
  state: Readonly<Record<string, number>>;
  theme?: HkVisualizationDependentVisibleMathTheme;
}>;

const VISIBLE_MATH_NUMERIC_QUANTUM = 1e-9;
const VISIBLE_MATH_MIN_EFFECTIVE_ALPHA = 1e-4;
const VISIBLE_MATH_MAX_NODES = 768;
const VISIBLE_MATH_MAX_ATTRIBUTES_PER_NODE = 32;
const VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTES_PER_ENTRY = 64;
const VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTES_PER_CHAIN = 192;
const VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTE_BYTES_PER_CHAIN = 16_384;
const VISIBLE_MATH_MAX_STRING_BYTES = 512;
const VISIBLE_MATH_MAX_HASH_NODE_COUNT = 65_536;
const VISIBLE_MATH_MAX_HASH_STRING_BYTES = 262_144;
const VISIBLE_MATH_MAX_HASH_PAYLOAD_BYTES = 524_288;
const VISIBLE_MATH_MAX_HASH_OBJECT_KEYS = 64;
const VISIBLE_MATH_MATRIX_LENGTH = 6;
const VISIBLE_MATH_SHA256 = /^[0-9a-f]{64}$/u;
const VISIBLE_MATH_GEOMETRY_ATTRIBUTES = Object.freeze(new Set([
  "cx", "cy", "d", "font-size", "font-weight", "height", "points", "r",
  "rx", "ry", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
  "text-anchor", "transform", "width", "x", "x1", "x2", "y", "y1",
  "y2",
]));
const VISIBLE_MATH_NUMERIC_GEOMETRY_ATTRIBUTES = Object.freeze(new Set([
  "cx", "cy", "font-size", "font-weight", "height", "r", "rx", "ry",
  "stroke-dasharray", "width", "x", "x1", "x2", "y", "y1", "y2",
]));
const VISIBLE_MATH_TOKEN_GEOMETRY_ATTRIBUTES = Object.freeze(new Set([
  "d", "points", "transform",
]));
const VISIBLE_MATH_EXACT_GEOMETRY_ATTRIBUTES = Object.freeze(new Set([
  "stroke-linecap", "stroke-linejoin", "text-anchor",
]));
const VISIBLE_MATH_PRIMITIVES = Object.freeze(new Set([
  "circle", "ellipse", "line", "path", "polygon", "polyline", "rect",
  "text",
]));
const VISIBLE_MATH_ACCESSIBILITY_NODES = Object.freeze(new Set(["desc", "title"]));

/**
 * Resource pre-limits cover enumerable string-key data delivered by the
 * browser/JSON transport. Direct object callers remain subject to the exact
 * Reflect.ownKeys rejection seam for non-enumerable and symbol keys; ECMAScript
 * exposes no O(1) intrinsic count for an already-materialized hidden key set.
 */
export const HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_RESOURCE_GUARANTEE =
  "enumerable-transport-fields-v1" as const;

export const HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS =
  Object.freeze({
    aggregatePayloadBytes: 2_097_152,
    arrayItems: VISIBLE_MATH_MAX_NODES,
    objectKeys: VISIBLE_MATH_MAX_HASH_OBJECT_KEYS,
    projectionCount: 8,
    projectionNodes: VISIBLE_MATH_MAX_HASH_NODE_COUNT,
    projectionPayloadBytes: VISIBLE_MATH_MAX_HASH_PAYLOAD_BYTES,
    stringBytes: 256,
  } as const);

export function auditHkVisualizationDependentVisibleMathBrowserTransport(
  projections: readonly unknown[],
) {
  const limits =
    HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS;
  denseArray(
    "Dependent visible-math browser transport projections",
    projections,
    limits.projectionCount,
  );
  let aggregatePayloadBytes = 2 + Math.max(0, projections.length - 1);
  const encoder = new TextEncoder();
  const auditProjection = (projection: unknown) => {
    const activeObjects = new WeakSet<object>();
    const stringMetricsCache = new Map<
      string,
      readonly [byteLength: number, jsonByteLength: number]
    >();
    let nodeCount = 0;
    let payloadBytes = 0;
    const accountPayloadBytes = (byteLength: number) => {
      payloadBytes += byteLength;
      if (payloadBytes > limits.projectionPayloadBytes) {
        throw new Error(
          "Dependent visible-math browser transport projection payload exceeded its budget.",
        );
      }
    };
    const accountString = (candidate: string) => {
      if (candidate.length > limits.stringBytes) {
        throw new Error(
          "Dependent visible-math browser transport string exceeded its bound.",
        );
      }
      const cachedMetrics = stringMetricsCache.get(candidate);
      const byteLength = cachedMetrics?.[0] ?? encoder.encode(candidate).byteLength;
      if (byteLength > limits.stringBytes) {
        throw new Error(
          "Dependent visible-math browser transport string exceeded its bound.",
        );
      }
      const jsonByteLength = cachedMetrics?.[1] ?? (() => {
        const serializedString = JSON.stringify(candidate);
        return byteLength + serializedString.length - candidate.length;
      })();
      if (!cachedMetrics && stringMetricsCache.size < 2_048) {
        stringMetricsCache.set(candidate, [byteLength, jsonByteLength]);
      }
      accountPayloadBytes(jsonByteLength);
    };
    const visit = (candidate: unknown): void => {
      nodeCount += 1;
      if (nodeCount > limits.projectionNodes) {
        throw new Error(
          "Dependent visible-math browser transport projection node budget was exceeded.",
        );
      }
      if (candidate === null) {
        accountPayloadBytes(4);
        return;
      }
      if (typeof candidate === "string") {
        accountString(candidate);
        return;
      }
      if (typeof candidate === "number") {
        if (!Number.isFinite(candidate)) {
          throw new Error(
            "Dependent visible-math browser transport requires finite numbers.",
          );
        }
        accountPayloadBytes(String(candidate).length);
        return;
      }
      if (typeof candidate === "boolean") {
        accountPayloadBytes(candidate ? 4 : 5);
        return;
      }
      if (typeof candidate !== "object" || isProxy(candidate)) {
        throw new Error(
          "Dependent visible-math browser transport requires plain data.",
        );
      }
      if (activeObjects.has(candidate)) {
        throw new Error(
          "Dependent visible-math browser transport forbids cycles.",
        );
      }
      activeObjects.add(candidate);
      try {
        if (Array.isArray(candidate)) {
          denseArray(
            "Dependent visible-math browser transport array",
            candidate,
            limits.arrayItems,
          );
          accountPayloadBytes(2 + Math.max(0, candidate.length - 1));
          for (let index = 0; index < candidate.length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(
              candidate,
              String(index),
            );
            if (!descriptor || !("value" in descriptor)) {
              throw new Error(
                "Dependent visible-math browser transport requires data properties.",
              );
            }
            visit(descriptor.value);
          }
          return;
        }
        if (Object.getPrototypeOf(candidate) !== Object.prototype) {
          throw new Error(
            "Dependent visible-math browser transport requires plain objects.",
          );
        }
        let enumerableOwnKeyCount = 0;
        for (const key in candidate) {
          if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
            throw new Error(
              "Dependent visible-math browser transport forbids inherited keys.",
            );
          }
          enumerableOwnKeyCount += 1;
          if (enumerableOwnKeyCount > limits.objectKeys) {
            throw new Error(
              "Dependent visible-math browser transport object-key budget was exceeded.",
            );
          }
        }
        const keys = Reflect.ownKeys(candidate);
        if (
          keys.length !== enumerableOwnKeyCount ||
          keys.length > limits.objectKeys ||
          keys.some((key) => typeof key !== "string")
        ) {
          throw new Error(
            "Dependent visible-math browser transport requires exact enumerable string keys.",
          );
        }
        accountPayloadBytes(2 + Math.max(0, keys.length - 1));
        for (const key of keys as string[]) {
          const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
            throw new Error(
              "Dependent visible-math browser transport requires enumerable data properties.",
            );
          }
          accountString(key);
          accountPayloadBytes(1);
          visit(descriptor.value);
        }
      } finally {
        activeObjects.delete(candidate);
      }
    };
    visit(projection);
    return payloadBytes;
  };
  for (const projection of projections) {
    aggregatePayloadBytes += auditProjection(projection);
    if (aggregatePayloadBytes > limits.aggregatePayloadBytes) {
      throw new Error(
        "Dependent visible-math browser transport aggregate payload exceeded its budget.",
      );
    }
  }
  return Object.freeze({
    aggregatePayloadBytes,
    projectionCount: projections.length,
  });
}

function exactPlainObject(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${label} must be an exact plain object.`);
  }
  let enumerableOwnKeyCount = 0;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${label} exact schema forbids inherited keys.`);
    }
    enumerableOwnKeyCount += 1;
    if (enumerableOwnKeyCount > expectedKeys.length) {
      throw new Error(`${label} exact schema keys drifted.`);
    }
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error(`${label} exact schema forbids symbol keys.`);
  }
  const expectedKeySet = new Set(expectedKeys);
  if (
    ownKeys.length !== expectedKeys.length ||
    (ownKeys as string[]).some((key) => !expectedKeySet.has(key))
  ) {
    throw new Error(`${label} exact schema keys drifted.`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error(`${label}.${key} must be an own enumerable data property.`);
    }
  }
}

function denseArray(
  label: string,
  value: unknown,
  maximumLength: number,
): asserts value is unknown[] {
  if (
    !Array.isArray(value) ||
    isProxy(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    !Number.isSafeInteger(value.length) ||
    !Number.isSafeInteger(maximumLength) ||
    maximumLength < 0
  ) {
    throw new Error(`${label} must be a plain dense array.`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthDescriptor ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.value !== value.length ||
    lengthDescriptor.enumerable ||
    value.length > maximumLength
  ) {
    throw new Error(`${label} dense-array schema exceeded its bounded length.`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error(`${label} dense schema forbids symbol keys.`);
  }
  if (ownKeys.length !== value.length + 1) {
    throw new Error(`${label} must contain only exact dense indices and length.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error(`${label}[${index}] must be an own enumerable data property.`);
    }
  }
}

function boundedString(label: string, value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > VISIBLE_MATH_MAX_STRING_BYTES ||
    new TextEncoder().encode(value).byteLength > VISIBLE_MATH_MAX_STRING_BYTES
  ) {
    throw new Error(`${label} must be a bounded string.`);
  }
  return value;
}

function boundedDescriptorSafeJson(label: string, value: unknown) {
  const encoder = new TextEncoder();
  const stringMetricsCache = new Map<
    string,
    readonly [byteLength: number, jsonByteLength: number]
  >();
  const activeObjects = new WeakSet<object>();
  let nodeCount = 0;
  let payloadBytes = 0;
  let stringBytes = 0;
  const accountPayloadBytes = (byteLength: number) => {
    payloadBytes += byteLength;
    if (payloadBytes > VISIBLE_MATH_MAX_HASH_PAYLOAD_BYTES) {
      throw new Error(`${label} exceeded its bounded hash payload budget.`);
    }
  };
  const accountJsonString = (candidate: string) => {
    if (candidate.length > VISIBLE_MATH_MAX_STRING_BYTES) {
      throw new Error(`${label} contains an over-budget string.`);
    }
    const cachedMetrics = stringMetricsCache.get(candidate);
    const byteLength = cachedMetrics?.[0] ?? encoder.encode(candidate).byteLength;
    if (byteLength > VISIBLE_MATH_MAX_STRING_BYTES) {
      throw new Error(`${label} contains an over-budget string.`);
    }
    stringBytes += byteLength;
    if (stringBytes > VISIBLE_MATH_MAX_HASH_STRING_BYTES) {
      throw new Error(`${label} exceeded its cumulative string budget.`);
    }
    // The primitive is already bounded, so native string serialization cannot
    // materialize an unbounded value. Combining its UTF-16 growth with the
    // already-measured UTF-8 bytes is exact except for lone surrogates, which it
    // conservatively overcounts (and therefore remains fail-closed).
    const jsonByteLength = cachedMetrics?.[1] ?? (() => {
      const serializedString = JSON.stringify(candidate);
      return byteLength + serializedString.length - candidate.length;
    })();
    if (!cachedMetrics && stringMetricsCache.size < 2_048) {
      stringMetricsCache.set(candidate, [byteLength, jsonByteLength]);
    }
    accountPayloadBytes(jsonByteLength);
  };
  const visit = (candidate: unknown): unknown => {
    nodeCount += 1;
    if (nodeCount > VISIBLE_MATH_MAX_HASH_NODE_COUNT) {
      throw new Error(`${label} exceeded its bounded hash node budget.`);
    }
    if (candidate === null) {
      accountPayloadBytes(4);
      return null;
    }
    if (typeof candidate === "string") {
      accountJsonString(candidate);
      return candidate;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate) || Object.is(candidate, -0)) {
        throw new Error(`${label} contains a noncanonical number.`);
      }
      accountPayloadBytes(String(candidate).length);
      return candidate;
    }
    if (typeof candidate === "boolean") {
      accountPayloadBytes(candidate ? 4 : 5);
      return candidate;
    }
    if (typeof candidate !== "object" || isProxy(candidate)) {
      throw new Error(`${label} requires descriptor-safe plain data.`);
    }
    if (activeObjects.has(candidate)) {
      throw new Error(`${label} descriptor-safe schema forbids cycles.`);
    }
    activeObjects.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        denseArray(label, candidate, VISIBLE_MATH_MAX_NODES);
        accountPayloadBytes(2 + Math.max(0, candidate.length - 1));
        const canonical: unknown[] = [];
        Object.setPrototypeOf(canonical, null);
        for (let index = 0; index < candidate.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(
            candidate,
            String(index),
          );
          if (!descriptor || !("value" in descriptor)) {
            throw new Error(`${label} requires descriptor-safe array data.`);
          }
          canonical[index] = visit(descriptor.value);
        }
        return canonical;
      }
      if (Object.getPrototypeOf(candidate) !== Object.prototype) {
        throw new Error(`${label} requires descriptor-safe plain data.`);
      }
      let enumerableOwnKeyCount = 0;
      for (const key in candidate) {
        if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
          throw new Error(`${label} descriptor-safe schema forbids inherited keys.`);
        }
        enumerableOwnKeyCount += 1;
        if (enumerableOwnKeyCount > VISIBLE_MATH_MAX_HASH_OBJECT_KEYS) {
          throw new Error(`${label} exceeded its bounded object-key budget.`);
        }
      }
      const keys = Reflect.ownKeys(candidate);
      if (
        keys.length !== enumerableOwnKeyCount ||
        keys.length > VISIBLE_MATH_MAX_HASH_OBJECT_KEYS ||
        keys.some((key) => typeof key !== "string")
      ) {
        throw new Error(`${label} requires exact enumerable string data keys.`);
      }
      accountPayloadBytes(2 + Math.max(0, keys.length - 1));
      const canonical = Object.create(null) as Record<string, unknown>;
      (keys as string[]).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new Error(`${label} requires descriptor-safe plain data.`);
        }
        accountJsonString(key);
        accountPayloadBytes(1);
        canonical[key] = visit(descriptor.value);
      });
      return canonical;
    } finally {
      activeObjects.delete(candidate);
    }
  };
  const canonical = visit(value);
  const serialized = JSON.stringify(canonical);
  if (typeof serialized !== "string" || serialized.length > payloadBytes) {
    throw new Error(`${label} exceeded its bounded hash payload budget.`);
  }
  return serialized;
}

function canonicalNumber(label: string, value: unknown) {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value.trim())
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} numeric value must be finite and malformed-free.`);
  }
  if (Math.abs(numeric) > 1_000_000_000) {
    throw new Error(`${label} numeric value exceeded its bounded magnitude.`);
  }
  if (Object.is(numeric, -0) || (typeof value === "string" && /^-0(?:\.0*)?(?:e[+-]?0+)?$/iu.test(value.trim()))) {
    throw new Error(`${label} numeric value rejects negative zero.`);
  }
  const rounded = Math.round(numeric / VISIBLE_MATH_NUMERIC_QUANTUM) *
    VISIBLE_MATH_NUMERIC_QUANTUM;
  if (!Number.isFinite(rounded)) {
    throw new Error(`${label} canonical numeric value must be finite.`);
  }
  if (Object.is(rounded, -0)) return 0;
  return Number(rounded.toFixed(9));
}

function canonicalNumberString(label: string, value: unknown) {
  const numeric = canonicalNumber(label, value);
  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(9).replace(/0+$/u, "").replace(/\.$/u, "");
}

const VISIBLE_MATH_NUMBER_TOKEN =
  "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const VISIBLE_MATH_ASCII_WSP = "[\\x20\\t\\r\\n\\f]";

function trimAsciiWhitespace(value: string) {
  return value.replace(/^[\x20\t\r\n\f]+|[\x20\t\r\n\f]+$/gu, "");
}

function exactNumericTokens(label: string, value: unknown) {
  const text = trimAsciiWhitespace(boundedString(label, value));
  if (!text || /[^\x00-\x7f]/u.test(text)) {
    throw new Error(`${label} separator grammar permits ASCII whitespace only.`);
  }
  const numberPattern = new RegExp(VISIBLE_MATH_NUMBER_TOKEN, "uy");
  const separatorPattern = new RegExp(
    `(?:${VISIBLE_MATH_ASCII_WSP}*,${VISIBLE_MATH_ASCII_WSP}*|${VISIBLE_MATH_ASCII_WSP}+)`,
    "uy",
  );
  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    numberPattern.lastIndex = cursor;
    const number = numberPattern.exec(text);
    if (!number) {
      throw new Error(`${label} numeric token or separator is malformed.`);
    }
    tokens.push(number[0]);
    cursor = numberPattern.lastIndex;
    if (cursor === text.length) break;
    separatorPattern.lastIndex = cursor;
    const separator = separatorPattern.exec(text);
    if (!separator) {
      throw new Error(`${label} comma-wsp separator is malformed.`);
    }
    cursor = separatorPattern.lastIndex;
    if (cursor === text.length) {
      throw new Error(`${label} trailing separator is forbidden.`);
    }
  }
  return tokens;
}

function canonicalTokenGeometry(label: string, value: unknown) {
  const text = trimAsciiWhitespace(boundedString(label, value));
  if (!text) {
    throw new Error(`${label} geometry token string is malformed.`);
  }
  if (label.endsWith(".points")) {
    const tokens = exactNumericTokens(label, text);
    if (tokens.length < 4 || tokens.length % 2 !== 0 || tokens.length > 2_048) {
      throw new Error(`${label} points geometry requires bounded coordinate pairs.`);
    }
    return tokens.map((token, index) =>
      canonicalNumberString(`${label}[${index}]`, token)
    ).reduce((result, token, index) =>
      result + (index === 0 ? "" : index % 2 === 0 ? " " : ",") + token,
    "");
  }
  if (label.endsWith(".transform")) {
    const transform = text.match(/^translate\(([\s\S]*)\)$/u);
    if (!transform || /[^\x00-\x7f]/u.test(transform[1])) {
      throw new Error(`${label} transform geometry is outside the exact grammar.`);
    }
    const tokens = exactNumericTokens(label, transform[1]);
    if (tokens.length < 1 || tokens.length > 2) {
      throw new Error(`${label} transform geometry requires one or two coordinates.`);
    }
    const x = canonicalNumberString(`${label}.x`, tokens[0]);
    const y = canonicalNumberString(`${label}.y`, tokens[1] ?? "0");
    return `translate(${x} ${y})`;
  }
  if (label.endsWith(".d")) {
    // Exact11 uses only absolute M/L/Q with every repeated segment carrying an
    // explicit command. Relative, implicit-repeat, and all other SVG commands
    // are intentionally rejected instead of being normalized into a different
    // geometric meaning.
    if (/[^\x00-\x7f]/u.test(text) || text[0] !== "M") {
      throw new Error(`${label} path geometry is malformed.`);
    }
    const numberPattern = new RegExp(VISIBLE_MATH_NUMBER_TOKEN, "uy");
    const separatorPattern = new RegExp(
      `(?:${VISIBLE_MATH_ASCII_WSP}*,${VISIBLE_MATH_ASCII_WSP}*|${VISIBLE_MATH_ASCII_WSP}+)`,
      "uy",
    );
    const output: string[] = [];
    let cursor = 0;
    let commandCount = 0;
    while (cursor < text.length) {
      const command = text[cursor];
      if (commandCount === 0 ? command !== "M" : command !== "L" && command !== "Q") {
        throw new Error(`${label} path command topology drifted.`);
      }
      output.push(command);
      cursor += 1;
      while (cursor < text.length && /[\x20\t\r\n\f]/u.test(text[cursor])) cursor += 1;
      const arity = command === "Q" ? 4 : 2;
      for (let parameter = 0; parameter < arity; parameter += 1) {
        if (parameter > 0) {
          separatorPattern.lastIndex = cursor;
          const separator = separatorPattern.exec(text);
          if (!separator) {
            throw new Error(`${label} path parameter separator is malformed.`);
          }
          cursor = separatorPattern.lastIndex;
        }
        numberPattern.lastIndex = cursor;
        const number = numberPattern.exec(text);
        if (!number) {
          throw new Error(`${label} path command arity drifted.`);
        }
        output.push(canonicalNumberString(`${label}[${output.length}]`, number[0]));
        cursor = numberPattern.lastIndex;
      }
      commandCount += 1;
      if (cursor === text.length) break;
      while (cursor < text.length && /[\x20\t\r\n\f]/u.test(text[cursor])) cursor += 1;
      if (cursor === text.length || (text[cursor] !== "L" && text[cursor] !== "Q")) {
        throw new Error(`${label} path command separator is malformed.`);
      }
    }
    if (commandCount < 2 || output.length > 2_048) {
      throw new Error(`${label} path geometry is incomplete or exceeded its cap.`);
    }
    return output.join(" ");
  }
  throw new Error(`${label} token geometry has no exact grammar.`);
}

function canonicalGeometryValue(label: string, name: string, value: unknown) {
  if (!VISIBLE_MATH_GEOMETRY_ATTRIBUTES.has(name)) {
    throw new Error(`${label} geometry attribute is outside the exact allowlist.`);
  }
  if (VISIBLE_MATH_NUMERIC_GEOMETRY_ATTRIBUTES.has(name)) {
    if (name === "stroke-dasharray") {
      const text = trimAsciiWhitespace(boundedString(label, value));
      if (text === "none") return text;
      const tokens = exactNumericTokens(label, text);
      if (tokens.length === 0) {
        throw new Error(`${label} geometry dash array is malformed.`);
      }
      const canonical = tokens.map((token, index) =>
        canonicalNumber(`${label}[${index}]`, token)
      );
      if (canonical.some((entry) => entry < 0) || canonical.every((entry) => entry === 0)) {
        throw new Error(`${label} geometry dash array requires nonnegative, nonzero lengths.`);
      }
      return canonical.map((entry) => canonicalNumberString(label, entry)).join(" ");
    }
    return canonicalNumberString(label, value);
  }
  if (VISIBLE_MATH_TOKEN_GEOMETRY_ATTRIBUTES.has(name)) {
    return canonicalTokenGeometry(label, value);
  }
  if (VISIBLE_MATH_EXACT_GEOMETRY_ATTRIBUTES.has(name)) {
    const text = boundedString(label, value).trim();
    if (!text || !/^[a-zA-Z-]+$/u.test(text)) {
      throw new Error(`${label} exact geometry token is malformed.`);
    }
    return text;
  }
  throw new Error(`${label} geometry attribute has no canonicalizer.`);
}

function canonicalAttributeTuples(
  label: string,
  value: unknown,
  kind: "geometry" | "semantic",
) {
  denseArray(label, value, VISIBLE_MATH_MAX_ATTRIBUTES_PER_NODE);
  let prior = "";
  return Object.freeze(value.map((tuple, index) => {
    denseArray(`${label}[${index}]`, tuple, 2);
    if (tuple.length !== 2) {
      throw new Error(`${label}[${index}] must be an exact pair.`);
    }
    const name = boundedString(`${label}[${index}][0]`, tuple[0]);
    if (!name || (index > 0 && name <= prior)) {
      throw new Error(`${label} requires strict unique canonical name order.`);
    }
    prior = name;
    if (kind === "semantic" && !name.startsWith("data-viz-")) {
      throw new Error(`${label} semantic attributes must be data-viz owned.`);
    }
    const canonicalValue = kind === "geometry"
      ? canonicalGeometryValue(`${label}.${name}`, name, tuple[1])
      : boundedString(`${label}.${name}`, tuple[1]);
    return Object.freeze([name, canonicalValue] as const);
  }));
}

const VISIBLE_MATH_COMPUTED_RENDER_KEYS = Object.freeze([
  "alignmentBaseline", "baselineShift", "dominantBaseline", "fontFamily",
  "fontSize", "fontStretch", "fontStyle", "fontWeight", "isolation",
  "letterSpacing", "markerEnd", "markerMid", "markerStart", "mixBlendMode",
  "paintOrder", "shapeRendering", "strokeDasharray", "strokeDashoffset",
  "strokeLinecap", "strokeLinejoin", "strokeMiterlimit", "textAnchor",
  "textRendering", "vectorEffect", "wordSpacing",
] as const);

function canonicalComputedLength(
  label: string,
  value: unknown,
  keyword?: string,
) {
  const text = boundedString(label, value).trim();
  if (keyword !== undefined && text === keyword) return keyword;
  const numeric = text.replace(/px$/u, "");
  return canonicalNumberString(label, numeric);
}

const VISIBLE_MATH_COMPUTED_GEOMETRY_KEYS = Object.freeze({
  circle: Object.freeze(["cx", "cy", "r"] as const),
  path: Object.freeze(["d"] as const),
  rect: Object.freeze(["height", "rx", "ry", "width", "x", "y"] as const),
  text: Object.freeze(["x", "y"] as const),
});

function canonicalComputedGeometry(
  label: string,
  value: unknown,
  tagName: string,
) {
  const keys = VISIBLE_MATH_COMPUTED_GEOMETRY_KEYS[
    tagName as keyof typeof VISIBLE_MATH_COMPUTED_GEOMETRY_KEYS
  ] ?? Object.freeze([] as const);
  denseArray(label, value, keys.length);
  if (value.length !== keys.length) {
    throw new Error(`${label} tag-aware computed geometry key count drifted.`);
  }
  return Object.freeze(keys.map((name, index) => {
    const tuple = value[index];
    denseArray(`${label}[${index}]`, tuple, 2);
    if (tuple.length !== 2 || tuple[0] !== name) {
      throw new Error(`${label} requires exact tag-aware computed geometry order.`);
    }
    const rawValue = boundedString(`${label}.${name}`, tuple[1]).trim();
    const canonicalValue = name === "d"
      ? canonicalGeometryValue(
          `${label}.${name}`,
          name,
          rawValue.match(/^path\(\s*(["'])(.*)\1\s*\)$/u)?.[2] ?? rawValue,
        )
      : (name === "rx" || name === "ry") && rawValue === "auto"
        ? "auto"
        : canonicalComputedLength(`${label}.${name}`, rawValue);
    return Object.freeze([name, canonicalValue] as const);
  }));
}

function expectedComputedGeometry(
  tagName: string,
  geometryRecord: Readonly<Record<string, string>>,
) {
  const keys = VISIBLE_MATH_COMPUTED_GEOMETRY_KEYS[
    tagName as keyof typeof VISIBLE_MATH_COMPUTED_GEOMETRY_KEYS
  ] ?? Object.freeze([] as const);
  return canonicalComputedGeometry(
    "expected projection computed geometry",
    keys.map((name) => {
      const value = geometryRecord[name] ??
        ((name === "rx" || name === "ry") ? "auto" :
          (name === "x" || name === "y") ? "0" : undefined);
      if (value === undefined) {
        throw new Error(
          `Expected ${tagName} computed geometry requires ${name}.`,
        );
      }
      return [name, value];
    }),
    tagName,
  );
}

function canonicalComputedRender(label: string, value: unknown) {
  exactPlainObject(label, value, VISIBLE_MATH_COMPUTED_RENDER_KEYS);
  const text = (key: typeof VISIBLE_MATH_COMPUTED_RENDER_KEYS[number]) =>
    boundedString(`${label}.${key}`, value[key]).trim().replace(/\s+/gu, " ");
  const dasharrayText = text("strokeDasharray");
  const strokeDasharray = dasharrayText === "none"
    ? "none"
    : exactNumericTokens(
        `${label}.strokeDasharray`,
        dasharrayText.replace(/px/gu, ""),
      ).map((token, index) => canonicalNumberString(
        `${label}.strokeDasharray[${index}]`,
        token,
      )).join(" ");
  const fontStretchText = text("fontStretch");
  const baselineShiftText = text("baselineShift");
  return Object.freeze({
    alignmentBaseline: text("alignmentBaseline"),
    baselineShift: ["0", "0px", "baseline"].includes(baselineShiftText)
      ? "0" : baselineShiftText,
    dominantBaseline: text("dominantBaseline"),
    fontFamily: text("fontFamily").replace(/\s*,\s*/gu, ","),
    fontSize: canonicalComputedLength(`${label}.fontSize`, value.fontSize),
    fontStretch: fontStretchText === "normal" ? "100%" : fontStretchText,
    fontStyle: text("fontStyle"),
    fontWeight: canonicalNumberString(`${label}.fontWeight`, value.fontWeight),
    isolation: text("isolation"),
    letterSpacing: canonicalComputedLength(
      `${label}.letterSpacing`,
      value.letterSpacing,
      "normal",
    ),
    markerEnd: text("markerEnd"),
    markerMid: text("markerMid"),
    markerStart: text("markerStart"),
    mixBlendMode: text("mixBlendMode"),
    paintOrder: text("paintOrder"),
    shapeRendering: text("shapeRendering"),
    strokeDasharray,
    strokeDashoffset: canonicalComputedLength(
      `${label}.strokeDashoffset`,
      value.strokeDashoffset,
    ),
    strokeLinecap: text("strokeLinecap"),
    strokeLinejoin: text("strokeLinejoin"),
    strokeMiterlimit: canonicalNumberString(
      `${label}.strokeMiterlimit`,
      value.strokeMiterlimit,
    ),
    textAnchor: text("textAnchor"),
    textRendering: text("textRendering"),
    vectorEffect: text("vectorEffect"),
    wordSpacing: canonicalComputedLength(
      `${label}.wordSpacing`,
      value.wordSpacing,
      "normal",
    ),
  });
}

function canonicalOpacityFactors(label: string, value: unknown) {
  exactPlainObject(label, value, [
    "localOpacity", "svgAncestorOpacityProduct", "wrapperOpacityProduct",
  ]);
  const localOpacity = canonicalNumber(`${label}.localOpacity`, value.localOpacity);
  const svgAncestorOpacityProduct = canonicalNumber(
    `${label}.svgAncestorOpacityProduct`,
    value.svgAncestorOpacityProduct,
  );
  const wrapperOpacityProduct = canonicalNumber(
    `${label}.wrapperOpacityProduct`,
    value.wrapperOpacityProduct,
  );
  if (
    [localOpacity, svgAncestorOpacityProduct, wrapperOpacityProduct]
      .some((factor) => factor < 0 || factor > 1)
  ) {
    throw new Error(`${label} opacity factor moved outside 0..1.`);
  }
  return Object.freeze({
    localOpacity,
    svgAncestorOpacityProduct,
    wrapperOpacityProduct,
  });
}

function canonicalComputedColor(
  label: string,
  value: string,
): HkVisualizationDependentVisibleMathColor {
  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "transparent") {
    return Object.freeze({ kind: "none" as const });
  }
  const match = normalized.match(
    /^rgba?\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?\s*\)$/u,
  );
  if (!match || (normalized.startsWith("rgba(") && match[4] === undefined)) {
    throw new Error(`${label} computed paint must be a final solid sRGB color.`);
  }
  const [red, green, blue] = match.slice(1, 4).map((entry, index) =>
    canonicalNumber(`${label}.channel[${index}]`, entry)
  );
  const alpha = canonicalNumber(`${label}.alpha`, match[4] ?? 1);
  if (
    [red, green, blue].some((channel) => channel < 0 || channel > 255) ||
    alpha < 0 || alpha > 1
  ) {
    throw new Error(`${label} computed solid sRGB channel is outside bounds.`);
  }
  if (alpha === 0) return Object.freeze({ kind: "none" as const });
  return Object.freeze({
    alpha,
    blue,
    green,
    kind: "solid-srgb" as const,
    red,
  });
}

function canonicalPaint(label: string, value: unknown, tagName: string) {
  if (value === null) return null;
  exactPlainObject(label, value, [
    "clipPath", "fill", "fillOpacity", "filter", "mask", "opacity",
    "stroke", "strokeOpacity", "strokeWidth",
  ]);
  for (const key of ["clipPath", "filter", "mask"] as const) {
    if (boundedString(`${label}.${key}`, value[key]).trim() !== "none") {
      throw new Error(`${label}.${key} unsupported paint effect is forbidden.`);
    }
  }
  const fillValue = boundedString(`${label}.fill`, value.fill);
  const strokeValue = boundedString(`${label}.stroke`, value.stroke);
  const fillRelevant = tagName !== "line" && tagName !== "polyline";
  const strokeRelevant = true;
  const fillColor = fillRelevant
    ? canonicalComputedColor(`${label}.fill`, fillValue)
    : Object.freeze({ kind: "none" as const });
  const strokeColor = strokeRelevant
    ? canonicalComputedColor(`${label}.stroke`, strokeValue)
    : Object.freeze({ kind: "none" as const });
  const fillOpacity = canonicalNumber(`${label}.fillOpacity`, value.fillOpacity);
  const strokeOpacity = canonicalNumber(`${label}.strokeOpacity`, value.strokeOpacity);
  const opacity = canonicalNumber(`${label}.opacity`, value.opacity);
  const rawStrokeWidth = canonicalNumber(`${label}.strokeWidth`, value.strokeWidth);
  if (
    fillOpacity < 0 || fillOpacity > 1 ||
    strokeOpacity < 0 || strokeOpacity > 1 ||
    opacity < 0 || opacity > 1 ||
    rawStrokeWidth < 0
  ) {
    throw new Error(`${label} paint numeric bounds drifted.`);
  }
  const fillAlpha = fillColor.kind === "solid-srgb"
    ? fillColor.alpha * fillOpacity * opacity
    : 0;
  const strokeAlpha = strokeColor.kind === "solid-srgb"
    ? strokeColor.alpha * strokeOpacity * opacity
    : 0;
  const fill = fillAlpha >= VISIBLE_MATH_MIN_EFFECTIVE_ALPHA
    ? fillColor
    : Object.freeze({ kind: "none" as const });
  const stroke = strokeAlpha >= VISIBLE_MATH_MIN_EFFECTIVE_ALPHA
    ? strokeColor
    : Object.freeze({ kind: "none" as const });
  if (stroke.kind === "solid-srgb" && rawStrokeWidth <= 0) {
    throw new Error(`${label} painted stroke requires positive width.`);
  }
  if (fill.kind === "none" && stroke.kind === "none") {
    throw new Error(`${label} critical primitive is below the learner-visible alpha threshold.`);
  }
  return Object.freeze({
    fill,
    fillOpacity,
    opacity,
    stroke,
    strokeOpacity,
    strokeWidth: stroke.kind === "solid-srgb" ? rawStrokeWidth : 0,
  });
}

function canonicalMatrix(label: string, value: unknown) {
  denseArray(label, value, VISIBLE_MATH_MATRIX_LENGTH);
  if (value.length !== VISIBLE_MATH_MATRIX_LENGTH) {
    throw new Error(`${label} coordinate matrix must contain six values.`);
  }
  return Object.freeze(value.map((entry, index) =>
    canonicalNumber(`${label}[${index}]`, entry)
  ));
}

function canonicalRect(label: string, value: unknown) {
  exactPlainObject(label, value, ["height", "width", "x", "y"]);
  const rect = Object.freeze({
    height: canonicalNumber(`${label}.height`, value.height),
    width: canonicalNumber(`${label}.width`, value.width),
    x: canonicalNumber(`${label}.x`, value.x),
    y: canonicalNumber(`${label}.y`, value.y),
  });
  if (rect.height <= 0 || rect.width <= 0) {
    throw new Error(`${label} requires positive width and height.`);
  }
  return rect;
}

function canonicalCssNone(label: string, value: unknown): "none" {
  if (boundedString(label, value).trim().toLowerCase() !== "none") {
    throw new Error(`${label} CSS transform must remain none.`);
  }
  return "none";
}

const VISIBLE_MATH_WRAPPER_ROLES = Object.freeze(new Set([
  "primary-model", "primary-model-grid", "primary-scrollport",
  "primary-surface-column", "primary-svg-frame", "secondary-compact-frame",
  "secondary-model", "secondary-model-grid", "secondary-panport",
  "secondary-surface", "secondary-surface-column",
]));

function exactKeyword<T extends string>(
  label: string,
  value: unknown,
  allowed: readonly T[],
): T {
  const text = boundedString(label, value).trim() as T;
  if (!allowed.includes(text)) {
    throw new Error(`${label} exact computed keyword drifted.`);
  }
  return text;
}

function canonicalWrapperTopology(label: string, value: unknown) {
  denseArray(label, value, 6);
  if (value.length < 5 || value.length > 6) {
    throw new Error(`${label} is outside the exact primary/secondary wrapper range.`);
  }
  const roles = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const entryLabel = `${label}[${index}]`;
    exactPlainObject(entryLabel, candidate, [
      "animationName", "clipPath", "contentVisibility", "cssTransform",
      "display", "filter", "isolation", "mask", "mixBlendMode", "opacity",
      "overflowX", "overflowY", "perspective", "role", "rotate", "scale",
      "tagName", "topicId", "transitionDuration", "translate", "visibility",
      "zoom",
    ]);
    const role = boundedString(`${entryLabel}.role`, candidate.role);
    if (!VISIBLE_MATH_WRAPPER_ROLES.has(role) || roles.has(role)) {
      throw new Error(`${entryLabel}.role exact structural identity drifted.`);
    }
    roles.add(role);
    const tagName = boundedString(`${entryLabel}.tagName`, candidate.tagName).toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/u.test(tagName)) {
      throw new Error(`${entryLabel}.tagName is malformed.`);
    }
    const topicId = boundedString(`${entryLabel}.topicId`, candidate.topicId);
    if ((role.endsWith("-model")) !== Boolean(topicId)) {
      throw new Error(`${entryLabel}.topicId must bind exactly one model endpoint.`);
    }
    for (const key of ["clipPath", "filter", "mask"] as const) {
      if (boundedString(`${entryLabel}.${key}`, candidate[key]).trim() !== "none") {
        throw new Error(`${entryLabel}.${key} unsupported wrapper effect is forbidden.`);
      }
    }
    const opacity = canonicalNumber(`${entryLabel}.opacity`, candidate.opacity);
    const zoom = canonicalNumber(`${entryLabel}.zoom`, candidate.zoom);
    if (opacity < VISIBLE_MATH_MIN_EFFECTIVE_ALPHA || opacity > 1 || zoom !== 1) {
      throw new Error(`${entryLabel} opacity/zoom moved outside exact safe bounds.`);
    }
    return Object.freeze({
      animationName: exactKeyword(`${entryLabel}.animationName`, candidate.animationName, ["none"]),
      clipPath: "none" as const,
      contentVisibility: exactKeyword(`${entryLabel}.contentVisibility`, candidate.contentVisibility, ["visible"]),
      cssTransform: canonicalCssNone(`${entryLabel}.cssTransform`, candidate.cssTransform),
      display: exactKeyword(`${entryLabel}.display`, candidate.display, ["block", "grid"]),
      filter: "none" as const,
      isolation: exactKeyword(`${entryLabel}.isolation`, candidate.isolation, ["auto"]),
      mask: "none" as const,
      mixBlendMode: exactKeyword(`${entryLabel}.mixBlendMode`, candidate.mixBlendMode, ["normal"]),
      opacity,
      overflowX: exactKeyword(`${entryLabel}.overflowX`, candidate.overflowX, ["auto", "visible"]),
      overflowY: exactKeyword(`${entryLabel}.overflowY`, candidate.overflowY, ["auto", "visible"]),
      perspective: exactKeyword(`${entryLabel}.perspective`, candidate.perspective, ["none"]),
      role: role as HkVisualizationDependentVisibleMathWrapper["role"],
      rotate: exactKeyword(`${entryLabel}.rotate`, candidate.rotate, ["none"]),
      scale: exactKeyword(`${entryLabel}.scale`, candidate.scale, ["none"]),
      tagName,
      topicId,
      transitionDuration: exactKeyword(`${entryLabel}.transitionDuration`, candidate.transitionDuration, ["0s"]),
      translate: exactKeyword(`${entryLabel}.translate`, candidate.translate, ["none"]),
      visibility: exactKeyword(`${entryLabel}.visibility`, candidate.visibility, ["visible"]),
      zoom,
    });
  }));
}

const VISIBLE_MATH_SURFACE_EFFECT_KEYS = Object.freeze([
  "animationDuration", "animationName", "backdropFilter", "clip", "clipPath",
  "contain", "contentVisibility", "cssTransform", "display", "filter",
  "isolation", "mask", "maskImage", "mixBlendMode", "opacity",
  "overflowX", "overflowY", "perspective", "rotate", "scale",
  "transitionDuration", "transitionProperty", "translate", "visibility",
  "webkitBackdropFilter", "zoom",
] as const);

function canonicalZeroTimeList(label: string, value: unknown) {
  const text = boundedString(label, value).trim();
  if (!text || text.split(",").some((entry) => entry.trim() !== "0s")) {
    throw new Error(`${label} must remain an exact zero-duration list.`);
  }
  return text;
}

function canonicalSurfaceEffectAudit(
  label: string,
  value: unknown,
  overflow: Readonly<{
    x: readonly string[];
    y: readonly string[];
  }> = { x: ["auto", "visible"], y: ["auto", "visible"] },
  exactBackdrop: Readonly<{
    backdropFilter: string;
    webkitBackdropFilter: string;
  }> = { backdropFilter: "none", webkitBackdropFilter: "none" },
) {
  exactPlainObject(label, value, VISIBLE_MATH_SURFACE_EFFECT_KEYS);
  for (const key of [
    "animationName", "clipPath", "cssTransform", "filter",
    "mask", "maskImage", "perspective", "rotate", "scale", "translate",
  ] as const) {
    if (boundedString(`${label}.${key}`, value[key]).trim().toLowerCase() !== "none") {
      throw new Error(`${label}.${key} non-default render effect is forbidden.`);
    }
  }
  const backdropFilter = boundedString(
    `${label}.backdropFilter`,
    value.backdropFilter,
  ).trim().toLowerCase();
  const webkitBackdropFilter = boundedString(
    `${label}.webkitBackdropFilter`,
    value.webkitBackdropFilter,
  ).trim().toLowerCase();
  if (
    backdropFilter !== exactBackdrop.backdropFilter ||
    webkitBackdropFilter !== exactBackdrop.webkitBackdropFilter
  ) {
    throw new Error(`${label} backdrop render effect drifted from its exact structural authority.`);
  }
  const clip = boundedString(`${label}.clip`, value.clip).trim().toLowerCase();
  if (clip !== "auto" && clip !== "none") {
    throw new Error(`${label}.clip non-default clipping is forbidden.`);
  }
  const contain = boundedString(`${label}.contain`, value.contain).trim().toLowerCase();
  if (contain !== "none") {
    throw new Error(`${label}.contain non-default containment is forbidden.`);
  }
  if (
    boundedString(`${label}.contentVisibility`, value.contentVisibility).trim() !== "visible" ||
    boundedString(`${label}.visibility`, value.visibility).trim() !== "visible"
  ) {
    throw new Error(`${label} hidden visibility/content-visibility is forbidden.`);
  }
  const display = boundedString(`${label}.display`, value.display).trim();
  if (![
    "block", "flex", "flow-root", "grid", "inline", "inline-block",
    "inline-flex", "inline-grid", "table",
  ].includes(display)) {
    throw new Error(`${label}.display is outside the exact visible display allowlist.`);
  }
  const overflowX = boundedString(`${label}.overflowX`, value.overflowX).trim();
  const overflowY = boundedString(`${label}.overflowY`, value.overflowY).trim();
  if (!overflow.x.includes(overflowX) || !overflow.y.includes(overflowY)) {
    throw new Error(`${label} clipping overflow drifted from its exact policy.`);
  }
  if (
    boundedString(`${label}.mixBlendMode`, value.mixBlendMode).trim() !== "normal" ||
    boundedString(`${label}.isolation`, value.isolation).trim() !== "auto"
  ) {
    throw new Error(`${label} blend/isolation effect is forbidden.`);
  }
  const animationDuration = canonicalZeroTimeList(
    `${label}.animationDuration`,
    value.animationDuration,
  );
  const transitionDuration = canonicalZeroTimeList(
    `${label}.transitionDuration`,
    value.transitionDuration,
  );
  const transitionProperty = boundedString(
    `${label}.transitionProperty`,
    value.transitionProperty,
  ).trim();
  const opacity = canonicalNumber(`${label}.opacity`, value.opacity);
  const zoom = canonicalNumber(`${label}.zoom`, value.zoom);
  if (opacity < VISIBLE_MATH_MIN_EFFECTIVE_ALPHA || opacity > 1 || zoom !== 1) {
    throw new Error(`${label} opacity/zoom moved outside exact safe bounds.`);
  }
  return Object.freeze({
    animationDuration,
    animationName: "none" as const,
    backdropFilter,
    clip,
    clipPath: "none" as const,
    contain: "none" as const,
    contentVisibility: "visible" as const,
    cssTransform: "none" as const,
    display,
    filter: "none" as const,
    isolation: "auto" as const,
    mask: "none" as const,
    maskImage: "none" as const,
    mixBlendMode: "normal" as const,
    opacity,
    overflowX,
    overflowY,
    perspective: "none" as const,
    rotate: "none" as const,
    scale: "none" as const,
    transitionDuration,
    transitionProperty,
    translate: "none" as const,
    visibility: "visible" as const,
    webkitBackdropFilter,
    zoom,
  });
}

function canonicalOwnerAttributeContract(
  label: string,
  value: unknown,
  viewBox: Readonly<{ height: number; width: number; x: number; y: number }>,
  preserveAspectRatio: string,
  rawSurfaceIdentity: unknown,
) {
  denseArray(label, value, 8);
  if (value.length < 5 || value.length > 8) {
    throw new Error(`${label} owner attribute count is outside its exact bound.`);
  }
  const attributes = new Map<string, string>();
  for (let index = 0; index < value.length; index += 1) {
    const tuple = value[index];
    denseArray(`${label}[${index}]`, tuple, 2);
    if (tuple.length !== 2) {
      throw new Error(`${label}[${index}] must be an exact attribute tuple.`);
    }
    const name = boundedString(`${label}[${index}][0]`, tuple[0]);
    const attributeValue = boundedString(`${label}[${index}][1]`, tuple[1]);
    if (attributes.has(name)) {
      throw new Error(`${label}.${name} owner attribute is duplicated.`);
    }
    attributes.set(name, attributeValue);
  }
  const primaryNames = [
    "aria-label", "class", "data-viz-surface", "preserveAspectRatio", "role",
    "viewBox",
  ];
  const secondaryNames = [
    "aria-label", "class", "data-hk-viz-surface", "data-viz-interactive",
    "data-viz-surface", "role", "viewBox",
  ];
  const actualNames = [...attributes.keys()].sort();
  const primary = JSON.stringify(actualNames) === JSON.stringify(primaryNames);
  const secondary = JSON.stringify(actualNames) === JSON.stringify(secondaryNames);
  if (!primary && !secondary) {
    throw new Error(`${label} contains an unknown owner render attribute or omitted an exact owner attribute.`);
  }
  const ariaLabel = attributes.get("aria-label")
    ?.normalize("NFC").replace(/\s+/gu, " ").trim() ?? "";
  if (!ariaLabel || attributes.get("data-viz-surface") !== "") {
    throw new Error(`${label} owner accessibility/surface identity drifted.`);
  }
  const expectedViewBox = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  if (attributes.get("viewBox")?.trim().replace(/\s+/gu, " ") !== expectedViewBox) {
    throw new Error(`${label}.viewBox drifted from the canonical surface viewBox.`);
  }
  const surfaceIdentity = boundedString(
    `${label}.surfaceIdentity`,
    rawSurfaceIdentity,
  ).trim();
  if (!surfaceIdentity) {
    throw new Error(`${label}.surfaceIdentity must be independently populated.`);
  }
  let dataVizInteractive: "absent" | "false" | "true";
  let role: "group" | "img";
  if (primary) {
    if (
      attributes.get("class") !== "block h-auto min-h-[360px] w-full min-w-[640px]" ||
      attributes.get("preserveAspectRatio") !== preserveAspectRatio ||
      attributes.get("role") !== "img"
    ) {
      throw new Error(`${label} primary owner attribute contract drifted.`);
    }
    dataVizInteractive = "absent";
    role = "img";
  } else {
    const interactive = attributes.get("data-viz-interactive");
    const secondaryRole = attributes.get("role");
    if (
      attributes.get("class") !== "aspect-[8/5] h-auto w-full min-w-[640px]" ||
      attributes.get("data-hk-viz-surface") !== surfaceIdentity ||
      (interactive !== "false" && interactive !== "true") ||
      (secondaryRole !== "group" && secondaryRole !== "img") ||
      (interactive === "true") !== (secondaryRole === "group")
    ) {
      throw new Error(`${label} secondary owner attribute contract drifted.`);
    }
    dataVizInteractive = interactive;
    role = secondaryRole;
  }
  const canonicalAttributes = Object.freeze(actualNames.map((name) =>
    Object.freeze([
      name,
      name === "aria-label"
        ? ariaLabel
        : name === "viewBox"
          ? expectedViewBox
          : name === "preserveAspectRatio"
            ? preserveAspectRatio
            : attributes.get(name)!,
    ] as const)
  ));
  return Object.freeze({
    ariaLabelHash: createHash("sha256").update(ariaLabel).digest("hex"),
    attributeCount: canonicalAttributes.length,
    attributeNames: Object.freeze([...actualNames]),
    attributeSummaryHash: createHash("sha256")
      .update(JSON.stringify(canonicalAttributes)).digest("hex"),
    dataVizInteractive,
    role,
    surfaceIdentity,
  });
}

function canonicalTitleDescTopology(label: string, value: unknown) {
  denseArray(label, value, 8);
  if (value.length > 8) {
    throw new Error(`${label} title/desc topology exceeded its exact bound.`);
  }
  return Object.freeze(value.map((candidate, index) => {
    const entryLabel = `${label}[${index}]`;
    exactPlainObject(entryLabel, candidate, ["tagName", "textHash"]);
    const tagName = boundedString(`${entryLabel}.tagName`, candidate.tagName).toLowerCase();
    if (tagName !== "title" && tagName !== "desc") {
      throw new Error(`${entryLabel}.tagName must be title or desc.`);
    }
    const textHash = boundedString(`${entryLabel}.textHash`, candidate.textHash);
    if (!VISIBLE_MATH_SHA256.test(textHash)) {
      throw new Error(`${entryLabel}.textHash must be lowercase SHA-256.`);
    }
    return Object.freeze({ tagName, textHash });
  }));
}

function canonicalDocumentAncestorAudit(label: string, value: unknown) {
  denseArray(label, value, 24);
  if (value.length < 2 || value.length > 24) {
    throw new Error(`${label} must be a bounded chain through documentElement.`);
  }
  let opacityProduct = 1;
  let bodyCount = 0;
  let clippingAncestorCount = 0;
  let attributeEntryCount = 0;
  let attributeBytes = 0;
  const canonicalAncestors: Array<Readonly<{
    attributes: readonly (readonly [string, string])[];
    role: string;
    tagName: string;
  }>> = [];
  const canonicalEffects: unknown[] = [];
  value.forEach((candidate, index) => {
    const entryLabel = `${label}[${index}]`;
    exactPlainObject(entryLabel, candidate, [
      ...VISIBLE_MATH_SURFACE_EFFECT_KEYS, "attributes", "role", "tagName",
    ]);
    const role = boundedString(`${entryLabel}.role`, candidate.role);
    const tagName = boundedString(`${entryLabel}.tagName`, candidate.tagName).toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/u.test(tagName)) {
      throw new Error(`${entryLabel}.tagName is malformed.`);
    }
    if (index === 0 && role !== "model-parent") {
      throw new Error(`${entryLabel} must begin at the model parent.`);
    }
    if (index === value.length - 1) {
      if (role !== "document-element" || tagName !== "html") {
        throw new Error(`${entryLabel} must terminate at documentElement/html.`);
      }
    } else if (index > 0 && role !== "ancestor" && role !== "body") {
      throw new Error(`${entryLabel}.role structural identity drifted.`);
    }
    if (role === "body") {
      bodyCount += 1;
      if (tagName !== "body" || index !== value.length - 2) {
        throw new Error(`${entryLabel} body adjacency drifted.`);
      }
    }
    denseArray(
      `${entryLabel}.attributes`,
      candidate.attributes,
      VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTES_PER_ENTRY,
    );
    let structuralClass = "";
    let priorAttributeName = "";
    const canonicalAttributes: Array<readonly [string, string]> = [];
    for (let attributeIndex = 0; attributeIndex < candidate.attributes.length; attributeIndex += 1) {
      const tuple = candidate.attributes[attributeIndex];
      denseArray(`${entryLabel}.attributes[${attributeIndex}]`, tuple, 2);
      if (tuple.length !== 2) {
        throw new Error(`${entryLabel}.attributes[${attributeIndex}] must be a tuple.`);
      }
      const name = boundedString(
        `${entryLabel}.attributes[${attributeIndex}][0]`,
        tuple[0],
      );
      const attributeValue = boundedString(
        `${entryLabel}.attributes[${attributeIndex}][1]`,
        tuple[1],
      );
      if (!name || (attributeIndex > 0 && name <= priorAttributeName)) {
        throw new Error(
          `${entryLabel}.attributes requires strict unique canonical name order.`,
        );
      }
      priorAttributeName = name;
      attributeEntryCount += 1;
      attributeBytes += new TextEncoder().encode(name).byteLength +
        new TextEncoder().encode(attributeValue).byteLength;
      if (
        attributeEntryCount > VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTES_PER_CHAIN ||
        attributeBytes > VISIBLE_MATH_MAX_ANCESTOR_ATTRIBUTE_BYTES_PER_CHAIN
      ) {
        throw new Error(`${label} cumulative ancestor attribute budget was exceeded.`);
      }
      canonicalAttributes.push(Object.freeze([name, attributeValue] as const));
      if (name === "class") {
        structuralClass = attributeValue;
      }
      if (
        name === "style" ||
        !(
          name === "class" || name === "dir" || name === "id" ||
          name === "lang" || name.startsWith("aria-") ||
          name.startsWith("data-")
        )
      ) {
        throw new Error(`${entryLabel}.${name} unknown ancestor render attribute is forbidden.`);
      }
    }
    const knownVisualizationRootClip =
      role === "ancestor" &&
      tagName === "div" &&
      structuralClass ===
        "min-h-full overflow-hidden bg-transparent text-slate-950";
    const knownVisualizationCardClip =
      role === "ancestor" &&
      tagName === "section" &&
      structuralClass === "glass-panel overflow-hidden p-4 sm:p-6";
    if (knownVisualizationRootClip || knownVisualizationCardClip) {
      clippingAncestorCount += 1;
    }
    const effectOpacity = canonicalSurfaceEffectAudit(
      `${entryLabel}.effects`,
      Object.fromEntries(
        VISIBLE_MATH_SURFACE_EFFECT_KEYS.map((key) => [key, candidate[key]]),
      ),
      role === "body"
        ? { x: ["hidden"], y: ["auto", "visible"] }
        : knownVisualizationRootClip || knownVisualizationCardClip
          ? { x: ["hidden"], y: ["hidden"] }
          : { x: ["auto", "visible"], y: ["auto", "visible"] },
      knownVisualizationCardClip
        ? {
            backdropFilter: "blur(12px)",
            webkitBackdropFilter: "blur(12px)",
          }
        : { backdropFilter: "none", webkitBackdropFilter: "none" },
    );
    canonicalAncestors.push(Object.freeze({
      attributes: Object.freeze(canonicalAttributes),
      role,
      tagName,
    }));
    canonicalEffects.push(effectOpacity);
    opacityProduct = canonicalNumber(
      `${entryLabel}.cumulativeOpacityProduct`,
      opacityProduct * effectOpacity.opacity,
    );
  });
  if (bodyCount !== 1 || clippingAncestorCount !== 2) {
    throw new Error(
      `${label} must contain exact body and visualization-root clipping topology.`,
    );
  }
  return Object.freeze({
    ancestrySummary: Object.freeze({
      ancestorHash: createHash("sha256")
        .update(JSON.stringify(canonicalAncestors)).digest("hex"),
      chainCount: value.length,
      effectHash: createHash("sha256")
        .update(JSON.stringify(canonicalEffects)).digest("hex"),
      entryCount: attributeEntryCount,
    }),
    audit: Object.freeze({
      bodyOverflowX: "hidden" as const,
      clippingAncestorCount: 2 as const,
      opacityProduct,
      policy: "safe-effects-through-document-element-v3" as const,
    }),
  });
}

function projectionHash(projection: HkVisualizationDependentVisibleMathProjection) {
  return createHash("sha256")
    .update(boundedDescriptorSafeJson("Dependent visible-math projection", projection))
    .digest("hex");
}

export function projectHkVisualizationDependentVisibleMathRawProjection(
  raw: unknown,
) {
  exactPlainObject("dependent visible-math raw projection", raw, ["nodes", "surface"]);
  denseArray(
    "dependent visible-math raw projection.nodes",
    raw.nodes,
    VISIBLE_MATH_MAX_NODES,
  );
  if (raw.nodes.length < 1 || raw.nodes.length > VISIBLE_MATH_MAX_NODES) {
    throw new Error("Dependent visible-math raw projection node count is outside its bounded range.");
  }
  const nodes = Object.freeze(raw.nodes.map((candidate, index) => {
    const label = `dependent visible-math raw projection.nodes[${index}]`;
    exactPlainObject(label, candidate, [
      "computedGeometry", "computedRender", "coordinateMatrix", "cssTransform",
      "effectivePaint", "geometryAttributes", "learnerVisible", "opacityFactors",
      "parentIndex", "semanticAttributes", "tagName", "textHash",
      "unsupportedIntermediateTransform",
    ]);
    if (candidate.unsupportedIntermediateTransform !== false) {
      throw new Error(`${label} unsupported intermediate transform is forbidden.`);
    }
    canonicalCssNone(`${label}.cssTransform`, candidate.cssTransform);
    const parentIndex = canonicalNumber(`${label}.parentIndex`, candidate.parentIndex);
    if (
      !Number.isInteger(parentIndex) ||
      (index === 0 ? parentIndex !== -1 : parentIndex < 0 || parentIndex >= index)
    ) {
      throw new Error(`${label}.parentIndex exact topology drifted.`);
    }
    const tagName = boundedString(`${label}.tagName`, candidate.tagName).toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/u.test(tagName)) {
      throw new Error(`${label}.tagName is malformed.`);
    }
    const accessibilityNode = VISIBLE_MATH_ACCESSIBILITY_NODES.has(tagName);
    if (
      accessibilityNode ? candidate.learnerVisible !== false : candidate.learnerVisible !== true
    ) {
      throw new Error(`${label} hidden critical descendant/accessibility topology drifted.`);
    }
    const primitive = VISIBLE_MATH_PRIMITIVES.has(tagName);
    if (primitive !== (candidate.effectivePaint !== null)) {
      throw new Error(`${label}.effectivePaint primitive topology drifted.`);
    }
    const hash = boundedString(`${label}.textHash`, candidate.textHash);
    if (!VISIBLE_MATH_SHA256.test(hash)) {
      throw new Error(`${label}.textHash must be lowercase SHA-256.`);
    }
    return Object.freeze({
      computedGeometry: canonicalComputedGeometry(
        `${label}.computedGeometry`,
        candidate.computedGeometry,
        tagName,
      ),
      computedRender: canonicalComputedRender(
        `${label}.computedRender`,
        candidate.computedRender,
      ),
      coordinateMatrix: canonicalMatrix(`${label}.coordinateMatrix`, candidate.coordinateMatrix),
      geometryAttributes: canonicalAttributeTuples(
        `${label}.geometryAttributes`,
        candidate.geometryAttributes,
        "geometry",
      ),
      learnerVisible: accessibilityNode ? false : true,
      paint: canonicalPaint(
        `${label}.effectivePaint`,
        candidate.effectivePaint,
        tagName,
      ),
      opacityFactors: canonicalOpacityFactors(
        `${label}.opacityFactors`,
        candidate.opacityFactors,
      ),
      parentIndex,
      semanticAttributes: canonicalAttributeTuples(
        `${label}.semanticAttributes`,
        candidate.semanticAttributes,
        "semantic",
      ),
      tagName,
      textHash: hash,
    });
  }));
  exactPlainObject("dependent visible-math raw projection.surface", raw.surface, [
    "documentAncestors", "layoutSize", "ownerProjection",
    "preserveAspectRatio", "renderedSize", "scrollportCssTransform",
    "svgCssTransform", "viewBox", "viewportMatrix", "wrapperTopology",
  ]);
  const viewBox = canonicalRect(
    "dependent visible-math raw projection.surface.viewBox",
    raw.surface.viewBox,
  );
  exactPlainObject(
    "dependent visible-math raw projection.surface.renderedSize",
    raw.surface.renderedSize,
    ["height", "width"],
  );
  const renderedSize = canonicalRect(
    "dependent visible-math raw projection.surface.renderedSize",
    {
      height: raw.surface.renderedSize.height,
      width: raw.surface.renderedSize.width,
      x: 0,
      y: 0,
    },
  );
  exactPlainObject(
    "dependent visible-math raw projection.surface.layoutSize",
    raw.surface.layoutSize,
    ["height", "width"],
  );
  const layoutSize = canonicalRect(
    "dependent visible-math raw projection.surface.layoutSize",
    {
      height: raw.surface.layoutSize.height,
      width: raw.surface.layoutSize.width,
      x: 0,
      y: 0,
    },
  );
  if (
    Math.abs(renderedSize.height - layoutSize.height) > 0.75 ||
    Math.abs(renderedSize.width - layoutSize.width) > 0.75
  ) {
    throw new Error(
      "Dependent visible-math rendered size drifted from its independent layout size.",
    );
  }
  const preserveAspectRatio = boundedString(
    "dependent visible-math raw projection.surface.preserveAspectRatio",
    raw.surface.preserveAspectRatio,
  ).trim().replace(/\s+/gu, " ");
  if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max) (?:meet|slice))$/u.test(preserveAspectRatio)) {
    throw new Error("Dependent visible-math preserveAspectRatio is malformed.");
  }
  exactPlainObject(
    "dependent visible-math raw projection.surface.ownerProjection",
    raw.surface.ownerProjection,
    ["attributes", "computedEffects", "surfaceIdentity", "titleDescTopology"],
  );
  const ownerAttributes = canonicalOwnerAttributeContract(
    "dependent visible-math raw projection.surface.ownerProjection.attributes",
    raw.surface.ownerProjection.attributes,
    viewBox,
    preserveAspectRatio,
    raw.surface.ownerProjection.surfaceIdentity,
  );
  const ownerEffects = canonicalSurfaceEffectAudit(
    "dependent visible-math raw projection.surface.ownerProjection.computedEffects",
    raw.surface.ownerProjection.computedEffects,
  );
  const ownerOpacity = ownerEffects.opacity;
  const ownerTitleDescTopology = canonicalTitleDescTopology(
    "dependent visible-math raw projection.surface.ownerProjection.titleDescTopology",
    raw.surface.ownerProjection.titleDescTopology,
  );
  const documentAncestors = canonicalDocumentAncestorAudit(
    "dependent visible-math raw projection.surface.documentAncestors",
    raw.surface.documentAncestors,
  );
  const documentAncestorAudit = documentAncestors.audit;
  const rawViewportMatrix = canonicalMatrix(
    "dependent visible-math raw projection.surface.viewportMatrix",
    raw.surface.viewportMatrix,
  );
  const sx = renderedSize.width / viewBox.width;
  const sy = renderedSize.height / viewBox.height;
  const scale = preserveAspectRatio === "none" ? null :
    preserveAspectRatio.endsWith("slice") ? Math.max(sx, sy) : Math.min(sx, sy);
  const expectedA = scale ?? sx;
  const expectedD = scale ?? sy;
  const horizontal = preserveAspectRatio.startsWith("xMin") ? 0 :
    preserveAspectRatio.startsWith("xMax") ? renderedSize.width - viewBox.width * expectedA :
      (renderedSize.width - viewBox.width * expectedA) / 2;
  const vertical = preserveAspectRatio.includes("YMin") ? 0 :
    preserveAspectRatio.includes("YMax") ? renderedSize.height - viewBox.height * expectedD :
      (renderedSize.height - viewBox.height * expectedD) / 2;
  const expectedE = horizontal - viewBox.x * expectedA;
  const expectedF = vertical - viewBox.y * expectedD;
  const viewportMatrix = Object.freeze([
    rawViewportMatrix[0] / expectedA,
    rawViewportMatrix[1] / expectedA,
    rawViewportMatrix[2] / expectedD,
    rawViewportMatrix[3] / expectedD,
    (rawViewportMatrix[4] - expectedE) / expectedA,
    (rawViewportMatrix[5] - expectedF) / expectedD,
  ].map((value, index) => canonicalNumber(`normalized viewport matrix[${index}]`, value)));
  const wrapperTopology = canonicalWrapperTopology(
    "dependent visible-math raw projection.surface.wrapperTopology",
    raw.surface.wrapperTopology,
  );
  const wrapperOpacityProduct = canonicalNumber(
    "dependent visible-math wrapper opacity product",
    wrapperTopology.reduce((product, entry) => product * entry.opacity, 1),
  );
  for (const [index, node] of nodes.entries()) {
    if (
      Math.abs(
        node.opacityFactors.wrapperOpacityProduct - wrapperOpacityProduct,
      ) > VISIBLE_MATH_NUMERIC_QUANTUM
    ) {
      throw new Error(
        `dependent visible-math raw projection.nodes[${index}] wrapper opacity factor drifted from the exact wrapper topology.`,
      );
    }
    const exactCumulativeOpacity = canonicalNumber(
      `dependent visible-math raw projection.nodes[${index}] exact cumulative opacity`,
      node.opacityFactors.localOpacity *
        node.opacityFactors.svgAncestorOpacityProduct *
        node.opacityFactors.wrapperOpacityProduct * ownerOpacity *
        documentAncestorAudit.opacityProduct,
    );
    if (
      node.paint !== null &&
      Math.abs(node.paint.opacity - exactCumulativeOpacity) >
        VISIBLE_MATH_NUMERIC_QUANTUM
    ) {
      throw new Error(
        `dependent visible-math raw projection.nodes[${index}].effectivePaint opacity omitted an exact node/SVG/wrapper/owner/document factor.`,
      );
    }
  }
  const scaleHash = createHash("sha256").update(JSON.stringify({
    fitRatios: [sx / expectedA, sy / expectedD].map((value, index) =>
      canonicalNumber(`normalized scale fit ratio[${index}]`, value)
    ),
    layoutAgreement: [
      layoutSize.width / renderedSize.width,
      layoutSize.height / renderedSize.height,
    ].map((value, index) =>
      canonicalNumber(`normalized layout agreement[${index}]`, value)
    ),
    preserveAspectRatio,
    viewportMatrix,
  })).digest("hex");
  const ancestryScaleSummary = Object.freeze({
    ...documentAncestors.ancestrySummary,
    policyVersion: "visible-math-ancestry-scale-summary.v1" as const,
    scaleHash,
    scaleWitnessCount: 3 as const,
  });
  const projection = Object.freeze({
    nodes,
    surface: Object.freeze({
      ancestryScaleSummary,
      documentAncestorAudit,
      ownerProjection: Object.freeze({
        ...ownerAttributes,
        effectPolicy: "safe-owner-effects-v2" as const,
        opacity: ownerOpacity,
        titleDescTopology: ownerTitleDescTopology,
      }),
      preserveAspectRatio,
      scrollportCssTransform: canonicalCssNone(
        "dependent visible-math raw projection.surface.scrollportCssTransform",
        raw.surface.scrollportCssTransform,
      ),
      svgCssTransform: canonicalCssNone(
        "dependent visible-math raw projection.surface.svgCssTransform",
        raw.surface.svgCssTransform,
      ),
      viewBox,
      viewportMatrix,
      wrapperTopology,
    }),
  }) satisfies HkVisualizationDependentVisibleMathProjection;
  return Object.freeze({ hash: projectionHash(projection), projection });
}

type ProjectionNodeArgs = Readonly<{
  geometry?: readonly (readonly [string, string | number])[];
  matrix?: readonly number[];
  paint?: HkVisualizationDependentVisibleMathPaint;
  parentIndex: number;
  semantic?: readonly (readonly [string, string | number | boolean])[];
  tagName: string;
  text?: string;
}>;

const IDENTITY_MATRIX = Object.freeze([1, 0, 0, 1, 0, 0]);
const EXPECTED_VISIBLE_MATH_FONT_FAMILY =
  'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

function expectedPaint(args: Readonly<{
  fill?: "none" | "painted";
  fillOpacity?: number;
  opacity?: number;
  stroke?: "none" | "painted";
  strokeOpacity?: number;
  strokeWidth?: number;
}> = {}): HkVisualizationDependentVisibleMathPaint {
  const fill = args.fill ?? "painted";
  const stroke = args.stroke ?? "none";
  const strokeWidth = stroke === "painted"
    ? canonicalNumber("expected paint stroke width", args.strokeWidth ?? 1)
    : 0;
  if (fill === "none" && stroke === "none") {
    throw new Error("Expected critical primitive cannot be fully unpainted.");
  }
  const placeholder = (state: "none" | "painted") => state === "none"
    ? Object.freeze({ kind: "none" as const })
    : Object.freeze({
        alpha: 1,
        blue: 0,
        green: 0,
        kind: "solid-srgb" as const,
        red: 0,
      });
  return Object.freeze({
    fill: placeholder(fill),
    fillOpacity: canonicalNumber("expected paint fill opacity", args.fillOpacity ?? 1),
    opacity: canonicalNumber("expected paint opacity", args.opacity ?? 1),
    stroke: placeholder(stroke),
    strokeOpacity: canonicalNumber("expected paint stroke opacity", args.strokeOpacity ?? 1),
    strokeWidth,
  });
}

function expectedProjectionNode(args: ProjectionNodeArgs) {
  const geometry = [...(args.geometry ?? [])]
    .map(([name, value]) => [name, String(value)] as const)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const semantic = [...(args.semantic ?? [])]
    .map(([name, value]) => [name, String(value)] as const)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const primitive = VISIBLE_MATH_PRIMITIVES.has(args.tagName);
  if (primitive !== Boolean(args.paint)) {
    throw new Error(`Expected projection node ${args.tagName} paint topology drifted.`);
  }
  const geometryRecord = Object.fromEntries(geometry);
  const computedRender = Object.freeze({
    alignmentBaseline: "auto",
    baselineShift: "0",
    dominantBaseline: "auto",
    fontFamily: EXPECTED_VISIBLE_MATH_FONT_FAMILY,
    fontSize: geometryRecord["font-size"] ?? "16",
    fontStretch: "100%",
    fontStyle: "normal",
    fontWeight: geometryRecord["font-weight"] ?? "400",
    isolation: "auto",
    letterSpacing: "normal",
    markerEnd: "none",
    markerMid: "none",
    markerStart: "none",
    mixBlendMode: "normal",
    paintOrder: "normal",
    shapeRendering: "auto",
    strokeDasharray: geometryRecord["stroke-dasharray"] ?? "none",
    strokeDashoffset: "0",
    strokeLinecap: geometryRecord["stroke-linecap"] ?? "butt",
    strokeLinejoin: geometryRecord["stroke-linejoin"] ?? "miter",
    strokeMiterlimit: "4",
    textAnchor: geometryRecord["text-anchor"] ?? "start",
    textRendering: "auto",
    vectorEffect: "none",
    wordSpacing: "0",
  });
  return Object.freeze({
    computedGeometry: expectedComputedGeometry(args.tagName, geometryRecord),
    computedRender,
    coordinateMatrix: canonicalMatrix(
      "expected projection coordinate matrix",
      [...(args.matrix ?? IDENTITY_MATRIX)],
    ),
    geometryAttributes: canonicalAttributeTuples(
      "expected projection geometry attributes",
      geometry,
      "geometry",
    ),
    learnerVisible: true as const,
    paint: args.paint ?? null,
    opacityFactors: Object.freeze({
      localOpacity: args.paint?.opacity ?? 1,
      svgAncestorOpacityProduct: 1,
      wrapperOpacityProduct: 1,
    }),
    parentIndex: args.parentIndex,
    semanticAttributes: canonicalAttributeTuples(
      "expected projection semantic attributes",
      semantic,
      "semantic",
    ),
    tagName: args.tagName,
    textHash: textHash(args.text ?? ""),
  }) satisfies HkVisualizationDependentVisibleMathProjectionNode;
}

function expectedSurface(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  language: HkVisualizationDependentVisibleMathLanguage = "en",
  theme: HkVisualizationDependentVisibleMathTheme = "light",
) {
  const height = sequenceId.startsWith("s3-") ? 400 : 360;
  const topicId = sequenceId === "p1-number-bond-known-part"
    ? "p1-counting-number-bonds"
    : sequenceId === "p1-add-step" || sequenceId === "p1-subtract-step"
      ? "p1-addition-subtraction"
      : sequenceId === "p2-payment-at-least-price"
        ? "p2-money-time"
        : sequenceId === "p4-divisor-within-number"
          ? "p4-large-numbers"
          : sequenceId === "p5-visible-volume-layers"
            ? "p5-volume"
            : sequenceId.startsWith("p5-")
              ? "p5-fractions-operations"
              : "identities-square-patterns";
  const ownerLabels = {
    "p1-counting-number-bonds": {
      en: "Number bond counters and part-whole diagram",
      zh: "數的組合計數物和部分—整體圖",
      "zh-Hans": "数的组合计数物和部分—整体图",
    },
    "p1-addition-subtraction": {
      en: "Addition and subtraction number-line walk",
      zh: "加減法數線步行",
      "zh-Hans": "加减法数线步行",
    },
    "p2-money-time": {
      en: "Hong Kong dollar payment and change bar",
      zh: "港幣付款和找續長條",
      "zh-Hans": "港币付款和找零长条",
    },
    "p4-large-numbers": {
      en: "Factor pairs and common HCF/LCM lists",
      zh: "因數對與 HCF／LCM 公共列表",
      "zh-Hans": "因数对与 HCF／LCM 公共列表",
    },
    "p5-fractions-operations": {
      en: "Unlike fraction bars converted to a common partition and combined",
      zh: "異分母分數條轉成共同分割後合併",
      "zh-Hans": "异分母分数条转成共同分割后合并",
    },
    "p5-volume": {
      en: "Cuboid built from visible unit-cube layers",
      zh: "由可見單位立方體層建成的長方體",
      "zh-Hans": "由可见单位正方体层建成的长方体",
    },
    "identities-square-patterns": {
      en: "Exact area model for square identities",
      zh: "平方恆等式的精確面積模型",
      "zh-Hans": "平方恒等式的精确面积模型",
    },
  } as const;
  const ownerLabel = ownerLabels[topicId][language];
  const secondary = sequenceId.startsWith("s3-");
  const surfaceIdentity = secondary ? "identity-square-patterns" : topicId;
  const productAuthority = {
    "p1-counting-number-bonds": {
      analyticsSource: "coordinate-plane",
      grade: "P1",
    },
    "p1-addition-subtraction": {
      analyticsSource: "coordinate-plane",
      grade: "P1",
    },
    "p2-money-time": {
      analyticsSource: "probability",
      grade: "P2",
    },
    "p4-large-numbers": {
      analyticsSource: "geometry",
      grade: "P4",
    },
    "p5-fractions-operations": {
      analyticsSource: "geometry",
      grade: "P5",
    },
    "p5-volume": {
      analyticsSource: "geometry",
      grade: "P5",
    },
    "identities-square-patterns": {
      analyticsSource: "geometry",
      grade: "S3",
    },
  } as const;
  const { analyticsSource, grade } = productAuthority[topicId];
  const labHref = `/visualization-lab?grade=${grade}&track=all&lab=${topicId}`;
  const workspaceLabel = {
    en: "Visualization Lab workspace",
    zh: "可視化實驗室工作區",
    "zh-Hans": "可视化实验室工作区",
  } as const;
  const htmlLanguage = {
    en: "en-HK",
    zh: "zh-Hant-HK",
    "zh-Hans": "zh-Hans-CN",
  } as const;
  const roles: readonly HkVisualizationDependentVisibleMathWrapper["role"][] =
    sequenceId.startsWith("s3-")
      ? [
          "secondary-panport", "secondary-surface", "secondary-compact-frame",
          "secondary-surface-column", "secondary-model-grid", "secondary-model",
        ]
      : [
          "primary-scrollport", "primary-svg-frame", "primary-surface-column",
          "primary-model-grid", "primary-model",
        ];
  const wrapperTopology = Object.freeze(roles.map((role) => {
    const scrollport = role === "primary-scrollport" || role === "secondary-panport";
    return Object.freeze({
      animationName: "none" as const,
      clipPath: "none" as const,
      contentVisibility: "visible" as const,
      cssTransform: "none" as const,
      display: role.endsWith("-model-grid") ? "grid" as const : "block" as const,
      filter: "none" as const,
      isolation: "auto" as const,
      mask: "none" as const,
      mixBlendMode: "normal" as const,
      opacity: 1,
      overflowX: scrollport ? "auto" as const : "visible" as const,
      overflowY: scrollport ? "auto" as const : "visible" as const,
      perspective: "none" as const,
      role,
      rotate: "none" as const,
      scale: "none" as const,
      tagName: role === "secondary-model" ? "section" : "div",
      topicId: role.endsWith("-model") ? topicId : "",
      transitionDuration: "0s" as const,
      translate: "none" as const,
      visibility: "visible" as const,
      zoom: 1,
    });
  }));
  const viewBox = Object.freeze({ height, width: 640, x: 0, y: 0 });
  const preserveAspectRatio = "xMidYMid meet";
  const ownerAttributes = canonicalOwnerAttributeContract(
    "expected dependent visible-math owner attributes",
    secondary
      ? [
          ["aria-label", ownerLabel],
          ["class", "aspect-[8/5] h-auto w-full min-w-[640px]"],
          ["data-hk-viz-surface", surfaceIdentity],
          ["data-viz-interactive", "false"],
          ["data-viz-surface", ""],
          ["role", "img"],
          ["viewBox", `0 0 640 ${height}`],
        ]
      : [
          ["aria-label", ownerLabel],
          ["class", "block h-auto min-h-[360px] w-full min-w-[640px]"],
          ["data-viz-surface", ""],
          ["preserveAspectRatio", preserveAspectRatio],
          ["role", "img"],
          ["viewBox", `0 0 640 ${height}`],
        ],
    viewBox,
    preserveAspectRatio,
    surfaceIdentity,
  );
  const safeEffects = Object.freeze({
    animationDuration: "0s",
    animationName: "none",
    backdropFilter: "none",
    clip: "auto",
    clipPath: "none",
    contain: "none",
    contentVisibility: "visible",
    cssTransform: "none",
    display: "block",
    filter: "none",
    isolation: "auto",
    mask: "none",
    maskImage: "none",
    mixBlendMode: "normal",
    opacity: "1",
    overflowX: "visible",
    overflowY: "visible",
    perspective: "none",
    rotate: "none",
    scale: "none",
    transitionDuration: "0s",
    transitionProperty: "all",
    translate: "none",
    visibility: "visible",
    webkitBackdropFilter: "none",
    zoom: "1",
  });
  const expectedAncestors = canonicalDocumentAncestorAudit(
    "expected dependent visible-math document ancestors",
    [
      {
        ...safeEffects,
        attributes: [
          ["class", "min-w-0"],
          ["data-hk-viz-dispatcher", "v1"],
          ["data-hk-viz-dispatcher-lab-id", topicId],
          ["data-hk-viz-dispatcher-target", secondary ? "secondary" : "primary"],
        ],
        role: "model-parent",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [
          ["class", "min-w-0"],
          ["data-viz-lesson-session-owner", "external-card"],
          ["data-viz-module-id", "configured-visualization-lab"],
          ["data-viz-production-renderer", "hk-dedicated"],
          ["data-viz-topic-id", topicId],
        ],
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [["data-viz-card-body", ""]],
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [
          ["class", "glass-panel overflow-hidden p-4 sm:p-6"],
          ["data-viz-card", ""],
          ["data-viz-explore-gate", "engaged"],
          ["data-viz-module-id", `${analyticsSource}:${topicId}:${topicId}`],
          ["data-viz-save-state", "saved"],
          ["data-viz-topic-id", topicId],
        ],
        backdropFilter: "blur(12px)",
        overflowX: "hidden",
        overflowY: "hidden",
        role: "ancestor",
        tagName: "section",
        webkitBackdropFilter: "blur(12px)",
      },
      {
        ...safeEffects,
        attributes: [["class", "min-w-0"]],
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [
          [
            "class",
            "rounded-[1.35rem] bg-white/95 p-4 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 sm:p-7",
          ],
          ["data-lab-id", topicId],
          ["data-viz-copy-controls-ready", "true"],
          ["data-viz-current-grade", grade],
          ["data-viz-current-track", "HK"],
          ["data-viz-direct-lab-href", labHref],
        ],
        role: "ancestor",
        tagName: "section",
      },
      {
        ...safeEffects,
        attributes: [
          ["aria-label", workspaceLabel[language]],
          ["class", "scroll-mt-24"],
          ["data-viz-active-grade", grade],
          ["data-viz-active-lab-id", topicId],
          ["data-viz-direct-lab-href", labHref],
          ["data-viz-lab-runtime-status", "lab"],
          ["data-viz-link-status", "ok"],
          ["data-viz-panel-mode", "lab"],
          ["data-viz-requested-lab-id", topicId],
          ["data-viz-young-learner-mode", "false"],
          ["id", `lab-example-${topicId}`],
        ],
        role: "ancestor",
        tagName: "section",
      },
      {
        ...safeEffects,
        attributes: [[
          "class",
          "relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:py-8",
        ]],
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [[
          "class",
          "min-h-full overflow-hidden bg-transparent text-slate-950",
        ]],
        overflowX: "hidden",
        overflowY: "hidden",
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [["class", "flex-1 pb-20 sm:pb-0"]],
        role: "ancestor",
        tagName: "main",
      },
      {
        ...safeEffects,
        attributes: [["class", "relative z-10 flex min-h-screen flex-col"]],
        display: "flex",
        role: "ancestor",
        tagName: "div",
      },
      {
        ...safeEffects,
        attributes: [["class", "overflow-x-hidden"]],
        overflowX: "hidden",
        overflowY: "auto",
        role: "body",
        tagName: "body",
      },
      {
        ...safeEffects,
        attributes: theme === "dark"
          ? [["class", "dark"], ["lang", htmlLanguage[language]]]
          : [["lang", htmlLanguage[language]]],
        role: "document-element",
        tagName: "html",
      },
    ],
  );
  const scaleHash = createHash("sha256").update(JSON.stringify({
    fitRatios: [1, 1],
    layoutAgreement: [1, 1],
    preserveAspectRatio,
    viewportMatrix: IDENTITY_MATRIX,
  })).digest("hex");
  return Object.freeze({
    ancestryScaleSummary: Object.freeze({
      ...expectedAncestors.ancestrySummary,
      policyVersion: "visible-math-ancestry-scale-summary.v1" as const,
      scaleHash,
      scaleWitnessCount: 3 as const,
    }),
    documentAncestorAudit: expectedAncestors.audit,
    ownerProjection: Object.freeze({
      ...ownerAttributes,
      effectPolicy: "safe-owner-effects-v2" as const,
      opacity: 1,
      titleDescTopology: Object.freeze([]),
    }),
    preserveAspectRatio,
    scrollportCssTransform: "none" as const,
    svgCssTransform: "none" as const,
    viewBox,
    viewportMatrix: IDENTITY_MATRIX,
    wrapperTopology,
  });
}

function expectedProjectionContract(args: Readonly<{
  captureRoot?: "parent" | "self";
  contractId: string;
  nodes: readonly HkVisualizationDependentVisibleMathProjectionNode[];
  occurrence?: number;
  selector: string;
  sequenceId: HkVisualizationDependentVisibleMathSequenceId;
}>): HkVisualizationDependentVisibleMathExpectedProjection {
  if (args.nodes.length < 1 || args.nodes.length > VISIBLE_MATH_MAX_NODES) {
    throw new Error(`Expected projection ${args.contractId} node count is outside its bounded range.`);
  }
  args.nodes.forEach((candidate, index) => {
    if (
      (index === 0 && candidate.parentIndex !== -1) ||
      (index > 0 && (candidate.parentIndex < 0 || candidate.parentIndex >= index))
    ) {
      throw new Error(`Expected projection ${args.contractId} parent topology drifted.`);
    }
  });
  const projection = Object.freeze({
    nodes: Object.freeze([...args.nodes]),
    surface: expectedSurface(args.sequenceId),
  }) satisfies HkVisualizationDependentVisibleMathProjection;
  return Object.freeze({
    captureRoot: args.captureRoot ?? "self",
    contractId: args.contractId,
    hash: projectionHash(projection),
    occurrence: args.occurrence ?? 0,
    projection,
    selector: args.selector,
  });
}

function primaryPrimitivePaint(
  fill: "none" | "painted",
  stroke: "none" | "painted",
  strokeWidth = 0,
  opacity = 1,
) {
  return expectedPaint({ fill, opacity, stroke, strokeWidth });
}

function expectedNumberBondProjections(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
) {
  const total = finiteState(state, "total");
  const known = finiteState(state, "knownPart");
  const missing = total - known;
  const translated = Object.freeze([1, 0, 0, 1, 76, 66]);
  const counterNodes = [
    expectedProjectionNode({
      geometry: [["transform", "translate(76 66)"]],
      matrix: translated,
      parentIndex: -1,
      semantic: [["data-viz-name", "counter-set"], ["data-viz-total", total]],
      tagName: "g",
    }),
    ...Array.from({ length: 20 }, (_, index) => {
      const filled = index < total;
      const part = index < known ? "known" : "missing";
      return expectedProjectionNode({
        geometry: [
          ["cx", (index % 10) * 48],
          ["cy", Math.floor(index / 10) * 48],
          ["r", 16],
          ...(!filled ? [["stroke-dasharray", "5 4"]] as const : []),
        ],
        matrix: translated,
        paint: primaryPrimitivePaint("painted", "painted", 3),
        parentIndex: 0,
        semantic: [
          ["data-viz-name", "counter"],
          ["data-viz-part", filled ? part : "empty"],
        ],
        tagName: "circle",
      });
    }),
  ];
  const partNode = (contractId: string, value: number, x: number, radius: number, fontSize: number) =>
    expectedProjectionContract({
      contractId,
      nodes: Object.freeze([
        expectedProjectionNode({
          parentIndex: -1,
          semantic: [["data-viz-name", contractId]],
          tagName: "g",
        }),
        expectedProjectionNode({
          parentIndex: 0,
          tagName: "g",
        }),
        expectedProjectionNode({
          geometry: [["cx", x], ["cy", contractId === "whole-node" ? 220 : 300], ["r", radius]],
          paint: primaryPrimitivePaint("painted", "painted", 3),
          parentIndex: 1,
          tagName: "circle",
        }),
        expectedProjectionNode({
          geometry: [
            ["font-size", fontSize], ["font-weight", 900],
            ["text-anchor", "middle"], ["x", x],
            ["y", contractId === "whole-node" ? 232 : 311],
          ],
          paint: primaryPrimitivePaint("painted", "none"),
          parentIndex: 1,
          tagName: "text",
          text: String(value),
        }),
      ]),
      selector: `[data-viz-name="${contractId}"]`,
      sequenceId,
    });
  const connector = (contractId: string, d: string) => expectedProjectionContract({
    contractId,
    nodes: Object.freeze([expectedProjectionNode({
      geometry: [["d", d], ["stroke-linecap", "round"]],
      paint: primaryPrimitivePaint("none", "painted", 7),
      parentIndex: -1,
      semantic: [["data-viz-name", contractId]],
      tagName: "path",
    })]),
    selector: `[data-viz-name="${contractId}"]`,
    sequenceId,
  });
  return Object.freeze([
    expectedProjectionContract({
      contractId: "counter-set",
      nodes: Object.freeze(counterNodes),
      selector: '[data-viz-name="counter-set"]',
      sequenceId,
    }),
    partNode("whole-node", total, 320, 42, 32),
    partNode("known-part-node", known, 170, 38, 28),
    partNode("missing-part-node", missing, 470, 38, 28),
    connector("known-connector", "M260 238 L190 282"),
    connector("missing-connector", "M380 238 L450 282"),
  ]);
}

function expectedAddSubtractProjections(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
  operation: "add" | "subtract",
) {
  const start = finiteState(state, "start");
  const step = finiteState(state, "step");
  const end = operation === "add" ? start + step : start - step;
  const startX = 70 + start * 25;
  const endX = 70 + end * 25;
  const single = (
    contractId: string,
    nodeValue: HkVisualizationDependentVisibleMathProjectionNode,
  ) => expectedProjectionContract({
    contractId,
    nodes: Object.freeze([nodeValue]),
    selector: `[data-viz-name="${contractId}"]`,
    sequenceId,
  });
  if (step === 0) {
    return Object.freeze([single("stationary-point", expectedProjectionNode({
      geometry: [["cx", startX], ["cy", 245], ["r", 15]],
      paint: primaryPrimitivePaint("painted", "painted", 3),
      parentIndex: -1,
      semantic: [["data-viz-name", "stationary-point"], ["data-viz-value", start]],
      tagName: "circle",
    }))]);
  }
  const jumpPath =
    `M${startX} 220 Q${(startX + endX) / 2} ${120 - Math.abs(endX - startX) * 0.08} ${endX} 220`;
  const arrowPoints = operation === "add"
    ? `${endX},220 ${endX - 18},208 ${endX - 15},231`
    : `${endX},220 ${endX + 18},208 ${endX + 15},231`;
  return Object.freeze([
    single("directed-jump", expectedProjectionNode({
      geometry: [["d", jumpPath], ["stroke-linecap", "round"]],
      paint: primaryPrimitivePaint("none", "painted", 9),
      parentIndex: -1,
      semantic: [
        ["data-viz-end", end], ["data-viz-name", "directed-jump"],
        ["data-viz-operation", operation], ["data-viz-start", start],
        ["data-viz-step", step],
      ],
      tagName: "path",
    })),
    single("jump-arrowhead", expectedProjectionNode({
      geometry: [["points", arrowPoints]],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: -1,
      semantic: [["data-viz-name", "jump-arrowhead"]],
      tagName: "polygon",
    })),
    single("start-point", expectedProjectionNode({
      geometry: [["cx", startX], ["cy", 245], ["r", 10]],
      paint: primaryPrimitivePaint("painted", "painted", 3),
      parentIndex: -1,
      semantic: [["data-viz-name", "start-point"]],
      tagName: "circle",
    })),
    single("end-point", expectedProjectionNode({
      geometry: [["cx", endX], ["cy", 245], ["r", 12]],
      paint: primaryPrimitivePaint("painted", "painted", 3),
      parentIndex: -1,
      semantic: [["data-viz-name", "end-point"]],
      tagName: "circle",
    })),
  ]);
}

function expectedMoneyProjections(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
) {
  const price = finiteState(state, "price");
  const payment = finiteState(state, "payment");
  const change = payment - price;
  const barWidth = 488;
  const priceWidth = barWidth * price / payment;
  const changeWidth = barWidth * change / payment;
  const segment = (
    contractId: string,
    vizName: string,
    valueAttribute: string,
    value: number,
    x: number,
    width: number,
    label: string,
    labelThreshold: number,
  ) => {
    const nodes = [
      expectedProjectionNode({ parentIndex: -1, tagName: "g" }),
      expectedProjectionNode({
        geometry: [["height", 70], ["rx", 16], ["width", width], ["x", x], ["y", 228]],
        paint: primaryPrimitivePaint("painted", "none"),
        parentIndex: 0,
        semantic: [["data-viz-name", vizName], [valueAttribute, value]],
        tagName: "rect",
      }),
      ...(width >= labelThreshold ? [expectedProjectionNode({
        geometry: [
          ["font-size", 17], ["font-weight", 900], ["text-anchor", "middle"],
          ["x", x + width / 2], ["y", 270],
        ],
        paint: primaryPrimitivePaint("painted", "none"),
        parentIndex: 0,
        tagName: "text",
        text: label,
      })] : []),
    ];
    return expectedProjectionContract({
      captureRoot: "parent",
      contractId,
      nodes: Object.freeze(nodes),
      selector: `[data-viz-name="${vizName}"]`,
      sequenceId,
    });
  };
  const projections = [
    expectedProjectionContract({
      contractId: "payment-bar",
      nodes: Object.freeze([expectedProjectionNode({
        geometry: [["height", 70], ["rx", 16], ["width", barWidth], ["x", 76], ["y", 228]],
        paint: primaryPrimitivePaint("painted", "painted", 3),
        parentIndex: -1,
        semantic: [["data-viz-name", "payment-bar"], ["data-viz-payment", payment]],
        tagName: "rect",
      })]),
      selector: '[data-viz-name="payment-bar"]',
      sequenceId,
    }),
    segment(
      "price-segment-model", "price-segment", "data-viz-price", price,
      76, priceWidth, `HK$${price}`, 72,
    ),
  ];
  if (change > 0) {
    projections.push(segment(
      "change-segment-model", "change-segment", "data-viz-change", change,
      76 + priceWidth, changeWidth, `+HK$${change}`, 82,
    ));
  }
  return Object.freeze(projections);
}

function expectedFactorPairProjection(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
  language: HkVisualizationDependentVisibleMathLanguage,
) {
  const firstNumber = finiteState(state, "firstNumber");
  const divisor = finiteState(state, "candidateDivisor");
  const factorPairs = Array.from(
    { length: Math.floor(Math.sqrt(firstNumber)) },
    (_, index) => index + 1,
  ).filter((candidate) => firstNumber % candidate === 0)
    .map((candidate) => [candidate, firstNumber / candidate] as const);
  const factorCount = Array.from({ length: firstNumber }, (_, index) => index + 1)
    .filter((candidate) => firstNumber % candidate === 0).length;
  const classification = firstNumber === 1 ? "neither" : factorCount === 2 ? "prime" : "composite";
  const classificationLabel = {
    en: classification === "neither" ? "neither prime nor composite" : classification,
    zh: classification === "neither" ? "既非質數亦非合數" : classification === "prime" ? "質數" : "合數",
    "zh-Hans": classification === "neither" ? "既非质数也非合数" : classification === "prime" ? "质数" : "合数",
  } as const;
  const quotient = Math.floor(firstNumber / divisor);
  const remainder = firstNumber % divisor;
  const nodes: HkVisualizationDependentVisibleMathProjectionNode[] = [
    expectedProjectionNode({
      parentIndex: -1,
      semantic: [
        ["data-viz-complete", true], ["data-viz-name", "factor-pair-array"],
        ["data-viz-number", firstNumber], ["data-viz-pair-count", factorPairs.length],
      ],
      tagName: "g",
    }),
  ];
  factorPairs.forEach(([left, right], index) => {
    const groupIndex = nodes.length;
    const x = 76 + (index % 3) * 176;
    const y = 58 + Math.floor(index / 3) * 68;
    nodes.push(expectedProjectionNode({
      parentIndex: 0,
      semantic: [
        ["data-viz-left", left], ["data-viz-name", "factor-pair"],
        ["data-viz-right", right],
      ],
      tagName: "g",
    }));
    nodes.push(expectedProjectionNode({
      geometry: [["height", 48], ["rx", 14], ["width", 150], ["x", x], ["y", y]],
      paint: primaryPrimitivePaint("painted", "painted", 3),
      parentIndex: groupIndex,
      tagName: "rect",
    }));
    nodes.push(expectedProjectionNode({
      geometry: [
        ["font-size", 18], ["font-weight", 900], ["text-anchor", "middle"],
        ["x", x + 75], ["y", y + 31],
      ],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: groupIndex,
      tagName: "text",
      text: `${left} × ${right}`,
    }));
  });
  const classificationIndex = nodes.length;
  nodes.push(expectedProjectionNode({
    parentIndex: 0,
    semantic: [
      ["data-viz-classification", classification],
      ["data-viz-name", "number-classification"],
    ],
    tagName: "g",
  }));
  nodes.push(expectedProjectionNode({
    geometry: [["height", 44], ["rx", 14], ["width", 296], ["x", 172], ["y", 207]],
    paint: primaryPrimitivePaint("painted", "painted", 3),
    parentIndex: classificationIndex,
    tagName: "rect",
  }));
  nodes.push(expectedProjectionNode({
    geometry: [
      ["font-size", 16], ["font-weight", 900], ["text-anchor", "middle"],
      ["x", 320], ["y", 235],
    ],
    paint: primaryPrimitivePaint("painted", "none"),
    parentIndex: classificationIndex,
    tagName: "text",
    text: `${firstNumber}: ${classificationLabel[language]}`,
  }));
  const remainderIndex = nodes.length;
  nodes.push(expectedProjectionNode({
    parentIndex: 0,
    semantic: [
      ["data-viz-dividend", firstNumber], ["data-viz-divisor", divisor],
      ["data-viz-is-factor", remainder === 0], ["data-viz-name", "remainder-test"],
      ["data-viz-quotient", quotient], ["data-viz-remainder", remainder],
    ],
    tagName: "g",
  }));
  nodes.push(expectedProjectionNode({
    geometry: [["height", 58], ["rx", 18], ["width", 408], ["x", 116], ["y", 273]],
    paint: primaryPrimitivePaint("painted", "painted", 3),
    parentIndex: remainderIndex,
    tagName: "rect",
  }));
  const suffix = {
    en: remainder === 0 ? "✓ factor" : "✕ not a factor",
    zh: remainder === 0 ? "✓ 因數" : "✕ 不是因數",
    "zh-Hans": remainder === 0 ? "✓ 因数" : "✕ 不是因数",
  } as const;
  nodes.push(expectedProjectionNode({
    geometry: [
      ["font-size", 18], ["font-weight", 900], ["text-anchor", "middle"],
      ["x", 320], ["y", 308],
    ],
    paint: primaryPrimitivePaint("painted", "none"),
    parentIndex: remainderIndex,
    tagName: "text",
    text: `${firstNumber} ÷ ${divisor} = ${quotient} r ${remainder} · ${suffix[language]}`,
  }));
  return Object.freeze([expectedProjectionContract({
    contractId: "factor-pair-array",
    nodes: Object.freeze(nodes),
    selector: '[data-viz-name="factor-pair-array"]',
    sequenceId,
  })]);
}

function fractionProjectionState(state: Readonly<Record<string, number>>) {
  const fractions = (["first", "second", "third"] as const).map((prefix) => ({
    denominator: finiteState(state, `${prefix}Denominator`),
    numerator: finiteState(state, `${prefix}Numerator`),
  }));
  const commonDenominator = fractions.reduce(
    (current, fraction) => lcm(current, fraction.denominator),
    1,
  );
  return Object.freeze({
    commonDenominator,
    fractions: Object.freeze(fractions.map((fraction) => Object.freeze({
      ...fraction,
      commonNumerator:
        fraction.numerator * commonDenominator / fraction.denominator,
    }))),
  });
}

function expectedFractionProjections(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
  operation: "add" | "subtract",
) {
  const { commonDenominator, fractions } = fractionProjectionState(state);
  const symbol = operation === "add" ? "+" : "−";
  const source = fractions.map((fraction, row) => {
    const y = 52 + row * 70;
    const pieceWidth = 360 / commonDenominator;
    const nodes: HkVisualizationDependentVisibleMathProjectionNode[] = [
      expectedProjectionNode({
        parentIndex: -1,
        semantic: [
          ["data-viz-common-denominator", commonDenominator],
          ["data-viz-common-numerator", fraction.commonNumerator],
          ["data-viz-denominator", fraction.denominator],
          ["data-viz-name", "source-fraction-bar"],
          ["data-viz-numerator", fraction.numerator],
        ],
        tagName: "g",
      }),
      expectedProjectionNode({
        geometry: [["height", 44], ["rx", 10], ["width", 360], ["x", 170], ["y", y]],
        paint: primaryPrimitivePaint("painted", "painted", 3),
        parentIndex: 0,
        tagName: "rect",
      }),
    ];
    for (let index = 0; index < commonDenominator; index += 1) {
      nodes.push(expectedProjectionNode({
        geometry: [
          ["height", 44], ["width", pieceWidth],
          ["x", 170 + index * pieceWidth], ["y", y],
        ],
        paint: primaryPrimitivePaint(
          index < fraction.commonNumerator ? "painted" : "none",
          "painted",
          commonDenominator > 24 ? 0.65 : 1.2,
        ),
        parentIndex: 0,
        semantic: [
          ["data-viz-filled", index < fraction.commonNumerator],
          ["data-viz-name", "common-partition-part"],
        ],
        tagName: "rect",
      }));
    }
    nodes.push(expectedProjectionNode({
      geometry: [
        ["font-size", 13], ["font-weight", 900], ["text-anchor", "middle"],
        ["x", 94], ["y", y + 28],
      ],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: 0,
      tagName: "text",
      text:
        `${fraction.numerator}/${fraction.denominator} ≡ ${fraction.commonNumerator}/${commonDenominator}`,
    }));
    if (row > 0) {
      nodes.push(expectedProjectionNode({
        geometry: [
          ["font-size", 20], ["font-weight", 900], ["text-anchor", "middle"],
          ["x", 151], ["y", y + 29],
        ],
        paint: primaryPrimitivePaint("painted", "none"),
        parentIndex: 0,
        tagName: "text",
        text: symbol,
      }));
    }
    return expectedProjectionContract({
      contractId: `source-fraction-bar:${row}`,
      nodes: Object.freeze(nodes),
      occurrence: row,
      selector: '[data-viz-name="source-fraction-bar"]',
      sequenceId,
    });
  });
  const sign = operation === "add" ? 1 : -1;
  const resultNumerator =
    fractions[0].commonNumerator +
    sign * fractions[1].commonNumerator +
    sign * fractions[2].commonNumerator;
  const resultValue = resultNumerator / commonDenominator;
  const resultX = 320 + Math.max(-3, Math.min(3, resultValue)) * 82;
  const resultNodes: HkVisualizationDependentVisibleMathProjectionNode[] = [
    expectedProjectionNode({
      parentIndex: -1,
      semantic: [
        ["data-viz-common-denominator", commonDenominator],
        ["data-viz-name", "signed-result-line"],
        ["data-viz-result-numerator", resultNumerator],
      ],
      tagName: "g",
    }),
    expectedProjectionNode({
      geometry: [["x1", 74], ["x2", 566], ["y1", 302], ["y2", 302]],
      paint: primaryPrimitivePaint("none", "painted", 5),
      parentIndex: 0,
      tagName: "line",
    }),
  ];
  for (const value of [-3, -2, -1, 0, 1, 2, 3]) {
    const tickGroupIndex = resultNodes.length;
    resultNodes.push(expectedProjectionNode({
      parentIndex: 0,
      tagName: "g",
    }));
    resultNodes.push(expectedProjectionNode({
      geometry: [
        ["x1", 320 + value * 82], ["x2", 320 + value * 82],
        ["y1", 290], ["y2", 314],
      ],
      paint: primaryPrimitivePaint("none", "painted", value === 0 ? 4 : 2),
      parentIndex: tickGroupIndex,
      tagName: "line",
    }));
    resultNodes.push(expectedProjectionNode({
      geometry: [
        ["font-size", 13], ["text-anchor", "middle"],
        ["x", 320 + value * 82], ["y", 340],
      ],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: tickGroupIndex,
      tagName: "text",
      text: String(value),
    }));
  }
  resultNodes.push(expectedProjectionNode({
    geometry: [
      ["stroke-linecap", "round"], ["x1", 320], ["x2", resultX],
      ["y1", 302], ["y2", 302],
    ],
    paint: primaryPrimitivePaint("none", "painted", 15),
    parentIndex: 0,
    semantic: [["data-viz-name", "signed-result-bar"]],
    tagName: "line",
  }));
  resultNodes.push(expectedProjectionNode({
    geometry: [["cx", resultX], ["cy", 302], ["r", 13]],
    paint: primaryPrimitivePaint("painted", "painted", 3),
    parentIndex: 0,
    semantic: [["data-viz-name", "result-marker"], ["data-viz-value", resultValue]],
    tagName: "circle",
  }));
  return Object.freeze([
    ...source,
    expectedProjectionContract({
      contractId: "signed-result-line",
      nodes: Object.freeze(resultNodes),
      selector: '[data-viz-name="signed-result-line"]',
      sequenceId,
    }),
  ]);
}

function expectedVolumeProjections(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
) {
  const length = finiteState(state, "length");
  const width = finiteState(state, "width");
  const height = finiteState(state, "height");
  const visibleLayers = finiteState(state, "visibleLayers");
  const layerSize = length * width;
  const volume = layerSize * height;
  const originX = 320;
  const originY = 258;
  const stepX = 22;
  const stepY = 11;
  const layerRise = 25;
  const topY = originY - 24;
  const footprintPoints =
    `${originX},${topY} ${originX + length * stepX},${topY + length * stepY} ` +
    `${originX + (length - width) * stepX},${topY + (length + width) * stepY} ` +
    `${originX - width * stepX},${topY + width * stepY}`;
  const footprint = expectedProjectionContract({
    contractId: "cuboid-footprint",
    nodes: Object.freeze([
      expectedProjectionNode({
        parentIndex: -1,
        semantic: [
          ["data-viz-height", height], ["data-viz-length", length],
          ["data-viz-name", "cuboid-footprint"], ["data-viz-volume", volume],
          ["data-viz-width", width],
        ],
        tagName: "g",
      }),
      expectedProjectionNode({
        geometry: [["points", footprintPoints], ["stroke-dasharray", "8 6"]],
        paint: primaryPrimitivePaint("painted", "painted", 4),
        parentIndex: 0,
        tagName: "polygon",
      }),
    ]),
    selector: '[data-viz-name="cuboid-footprint"]',
    sequenceId,
  });
  const stackNodes: HkVisualizationDependentVisibleMathProjectionNode[] = [
    expectedProjectionNode({
      parentIndex: -1,
      semantic: [
        ["data-viz-layer-size", layerSize], ["data-viz-name", "layer-stack"],
        ["data-viz-total-layers", height],
        ["data-viz-visible-layers", visibleLayers],
        ["data-viz-volume", volume],
      ],
      tagName: "g",
    }),
  ];
  const cubes = Array.from({ length: visibleLayers }, (_, z) =>
    Array.from({ length: width }, (_, row) =>
      Array.from({ length }, (_, column) => ({ column, row, z }))
    )
  ).flat(2).sort((left, right) =>
    left.z - right.z ||
    (left.row + left.column) - (right.row + right.column) ||
    left.row - right.row
  );
  for (const { column, row, z } of cubes) {
    const layerIndex = stackNodes.length;
    stackNodes.push(expectedProjectionNode({
      parentIndex: 0,
      semantic: [["data-viz-layer", z + 1]],
      tagName: "g",
    }));
    const cubeIndex = stackNodes.length;
    stackNodes.push(expectedProjectionNode({
      parentIndex: layerIndex,
      semantic: [["data-viz-name", "unit-cube"]],
      tagName: "g",
    }));
    const x = originX + (column - row) * stepX;
    const y = originY + (column + row) * stepY - z * layerRise;
    const half = 22;
    const rise = 22 * 0.52;
    const cubeHeight = 22 * 1.08;
    const polygons = [
      `${x},${y - cubeHeight} ${x + half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x - half},${y - cubeHeight + rise}`,
      `${x - half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x},${y} ${x - half},${y - rise}`,
      `${x + half},${y - cubeHeight + rise} ${x},${y - cubeHeight + rise * 2} ${x},${y} ${x + half},${y - rise}`,
    ];
    for (const points of polygons) {
      stackNodes.push(expectedProjectionNode({
        geometry: [["points", points]],
        paint: primaryPrimitivePaint("painted", "painted", 1.5),
        parentIndex: cubeIndex,
        tagName: "polygon",
      }));
    }
  }
  const arrowTop = originY - (height - 1) * layerRise - 42;
  const dimensionNodes = Object.freeze([
    expectedProjectionNode({
      parentIndex: -1,
      semantic: [["data-viz-name", "dimension-arrows"]],
      tagName: "g",
    }),
    expectedProjectionNode({
      geometry: [["x1", 94], ["x2", 94], ["y1", arrowTop], ["y2", 306]],
      paint: primaryPrimitivePaint("none", "painted", 5),
      parentIndex: 0,
      tagName: "line",
    }),
    expectedProjectionNode({
      geometry: [["points", `94,${arrowTop} 84,${arrowTop + 20} 104,${arrowTop + 20}`]],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: 0,
      tagName: "polygon",
    }),
    ...([
      [70, 210, `h=${height}`], [500, 326, `l=${length}`],
      [164, 326, `w=${width}`],
    ] as const).map(([x, y, text]) => expectedProjectionNode({
      geometry: [
        ["font-size", 18], ["font-weight", 900], ["text-anchor", "middle"],
        ["x", x], ["y", y],
      ],
      paint: primaryPrimitivePaint("painted", "none"),
      parentIndex: 0,
      tagName: "text",
      text,
    })),
  ]);
  return Object.freeze([
    footprint,
    expectedProjectionContract({
      contractId: "layer-stack",
      nodes: Object.freeze(stackNodes),
      selector: '[data-viz-name="layer-stack"]',
      sequenceId,
    }),
    expectedProjectionContract({
      contractId: "dimension-arrows",
      nodes: dimensionNodes,
      selector: '[data-viz-name="dimension-arrows"]',
      sequenceId,
    }),
  ]);
}

function expectedIdentityProjection(
  sequenceId: HkVisualizationDependentVisibleMathSequenceId,
  state: Readonly<Record<string, number>>,
) {
  const a = finiteState(state, "a");
  const b = finiteState(state, "b");
  const area = (a + b) ** 2;
  const scale = 270 / (a + b);
  const wholeSize = (a + b) * scale;
  const aSize = a * scale;
  const bSize = b * scale;
  const left = (640 - wholeSize) / 2;
  const top = (400 - wholeSize) / 2;
  const rect = (
    parentIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    opacity: number,
    strokeWidth: number,
    semantic: readonly (readonly [string, string | number])[] = [],
    fill: "none" | "painted" = "painted",
  ) => expectedProjectionNode({
    geometry: [["height", height], ["width", width], ["x", x], ["y", y]],
    paint: primaryPrimitivePaint(fill, "painted", strokeWidth, opacity),
    parentIndex,
    semantic,
    tagName: "rect",
  });
  return Object.freeze([expectedProjectionContract({
    contractId: "identity-square-whole",
    nodes: Object.freeze([
      expectedProjectionNode({
        parentIndex: -1,
        semantic: [
          ["data-viz-a", a], ["data-viz-area", area], ["data-viz-b", b],
          ["data-viz-name", "identity-square-whole"],
        ],
        tagName: "g",
      }),
      rect(0, left, top, aSize, aSize, 0.76, 3, [
        ["data-viz-area", a ** 2], ["data-viz-name", "identity-a2"],
      ]),
      expectedProjectionNode({
        parentIndex: 0,
        semantic: [
          ["data-viz-area", 2 * a * b],
          ["data-viz-name", "identity-cross-parts"],
        ],
        tagName: "g",
      }),
      rect(2, left + aSize, top, bSize, aSize, 0.76, 3),
      rect(2, left, top + aSize, aSize, bSize, 0.72, 3),
      rect(0, left + aSize, top + aSize, bSize, bSize, 0.78, 3, [
        ["data-viz-area", b ** 2], ["data-viz-name", "identity-b2"],
      ]),
      rect(0, left, top, wholeSize, wholeSize, 1, 7, [], "none"),
    ]),
    selector: '[data-viz-name="identity-square-whole"]',
    sequenceId,
  })]);
}

type ExpectedColorRole =
  | "axis" | "axisStrong" | "cubeLeft" | "cubeRight" | "cubeTop"
  | "darkBlue" | "darkBrown" | "darkGreen" | "emptyFill" | "gridStrong"
  | "hardComposite" | "hardFactor" | "hardNonFactor" | "hardPrime"
  | "identityAmber" | "identityPurple" | "main" | "change" | "result"
  | "parameter" | "attention" | "reference" | "panelStroke" | "pointStroke" | "softFill"
  | "text" | "textMuted" | "tickText" | "unitCubeStroke";

const EXPECTED_FIXED_COLORS = Object.freeze({
  attention: [251, 113, 133, 1],
  change: [245, 158, 11, 1],
  cubeLeft: [34, 211, 238, 1],
  cubeRight: [14, 165, 233, 1],
  cubeTop: [103, 232, 249, 1],
  darkBlue: [8, 47, 73, 1],
  darkBrown: [69, 26, 3, 1],
  darkGreen: [5, 46, 22, 1],
  hardComposite: [167, 139, 250, 0.24],
  hardFactor: [52, 211, 153, 0.25],
  hardNonFactor: [251, 113, 133, 0.2],
  hardPrime: [52, 211, 153, 0.24],
  identityAmber: [250, 204, 21, 1],
  identityPurple: [192, 132, 252, 1],
  main: [34, 211, 238, 1],
  parameter: [167, 139, 250, 1],
  reference: [100, 116, 139, 1],
  result: [52, 211, 153, 1],
  unitCubeStroke: [15, 23, 42, 1],
} satisfies Readonly<Record<string, readonly [number, number, number, number]>>);

const EXPECTED_THEME_COLORS = Object.freeze({
  light: Object.freeze({
    axis: [71, 85, 105, 0.72], axisStrong: [51, 65, 85, 1],
    emptyFill: [15, 23, 42, 0.07], gridStrong: [15, 23, 42, 0.18],
    panelStroke: [15, 23, 42, 0.16], pointStroke: [15, 23, 42, 1],
    softFill: [14, 165, 233, 0.1],
    text: [15, 23, 42, 1], textMuted: [71, 85, 105, 1],
    tickText: [100, 116, 139, 1],
  }),
  dark: Object.freeze({
    axis: [255, 255, 255, 0.38], axisStrong: [255, 255, 255, 0.72],
    emptyFill: [255, 255, 255, 0.08], gridStrong: [255, 255, 255, 0.16],
    panelStroke: [255, 255, 255, 0.1], pointStroke: [255, 255, 255, 1],
    softFill: [255, 255, 255, 0.14],
    text: [248, 250, 252, 1], textMuted: [255, 255, 255, 0.72],
    tickText: [255, 255, 255, 0.6],
  }),
} satisfies Readonly<Record<
  HkVisualizationDependentVisibleMathTheme,
  Readonly<Record<string, readonly [number, number, number, number]>>
>>);

function expectedColor(
  role: ExpectedColorRole | null,
  theme: HkVisualizationDependentVisibleMathTheme,
): HkVisualizationDependentVisibleMathColor {
  if (role === null) return Object.freeze({ kind: "none" as const });
  const tuple = EXPECTED_FIXED_COLORS[role as keyof typeof EXPECTED_FIXED_COLORS] ??
    EXPECTED_THEME_COLORS[theme][role as keyof typeof EXPECTED_THEME_COLORS.light];
  if (!tuple) throw new Error(`Dependent visible-math expected color role ${role} is missing.`);
  const [red, green, blue, alpha] = tuple;
  return Object.freeze({ alpha, blue, green, kind: "solid-srgb" as const, red });
}

function attributeRecord(
  tuples: readonly (readonly [string, string])[],
): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(tuples));
}

function expectedPaintRoles(
  args: ExpectedProjectionArgs,
  contractId: string,
  nodes: readonly HkVisualizationDependentVisibleMathProjectionNode[],
  node: HkVisualizationDependentVisibleMathProjectionNode,
  index: number,
): readonly [ExpectedColorRole | null, ExpectedColorRole | null] {
  const semantic = attributeRecord(node.semanticAttributes);
  const geometry = attributeRecord(node.geometryAttributes);
  const parent = node.parentIndex >= 0 ? nodes[node.parentIndex] : null;
  const parentSemantic = parent ? attributeRecord(parent.semanticAttributes) : {};
  if (args.sequenceId === "p1-number-bond-known-part") {
    if (contractId === "counter-set") {
      const part = semantic["data-viz-part"];
      return part === "empty"
        ? ["emptyFill", "panelStroke"]
        : [part === "known" ? "main" : "change", "pointStroke"];
    }
    if (contractId === "known-connector" || contractId === "missing-connector") {
      return [null, contractId === "known-connector" ? "main" : "change"];
    }
    if (node.tagName === "circle") {
      return [contractId === "whole-node" ? "result" : contractId === "known-part-node" ? "main" : "change", "pointStroke"];
    }
    return [contractId === "whole-node" ? "darkGreen" : contractId === "known-part-node" ? "darkBlue" : "darkBrown", null];
  }
  if (args.sequenceId === "p1-add-step" || args.sequenceId === "p1-subtract-step") {
    const operationRole = args.modeId === "add" ? "main" : "change";
    if (contractId === "directed-jump") return [null, operationRole];
    if (contractId === "jump-arrowhead") return [operationRole, null];
    if (contractId === "start-point") return ["parameter", "pointStroke"];
    return ["result", "pointStroke"];
  }
  if (args.sequenceId === "p2-payment-at-least-price") {
    if (contractId === "payment-bar") return ["emptyFill", "axisStrong"];
    if (node.tagName === "rect") return [contractId.startsWith("price-") ? "main" : "change", null];
    return [contractId.startsWith("price-") ? "darkBlue" : "darkBrown", null];
  }
  if (args.sequenceId === "p4-divisor-within-number") {
    if (node.tagName === "text") return ["text", null];
    if (parentSemantic["data-viz-name"] === "factor-pair") return ["softFill", "main"];
    if (parentSemantic["data-viz-name"] === "number-classification") {
      const classification = parentSemantic["data-viz-classification"];
      return [classification === "prime" ? "hardPrime" : classification === "composite" ? "hardComposite" : "softFill", classification === "prime" ? "result" : classification === "composite" ? "parameter" : "reference"];
    }
    const factor = parentSemantic["data-viz-is-factor"] === "true";
    return [factor ? "hardFactor" : "hardNonFactor", factor ? "result" : "attention"];
  }
  if (args.sequenceId.startsWith("p5-") && args.sequenceId !== "p5-visible-volume-layers") {
    const row = contractId.startsWith("source-fraction-bar:")
      ? Number(contractId.split(":")[1]) : -1;
    const rowRole = (["main", "change", "parameter"] as const)[row] ?? "main";
    if (contractId.startsWith("source-fraction-bar:")) {
      if (semantic["data-viz-name"] === "common-partition-part") {
        return [semantic["data-viz-filled"] === "true" ? rowRole : null, "gridStrong"];
      }
      if (node.tagName === "rect") return ["emptyFill", "axisStrong"];
      return [geometry.x === "151" ? "textMuted" : rowRole, null];
    }
    const resultRole = Number(attributeRecord(nodes[0].semanticAttributes)["data-viz-result-numerator"]) >= 0
      ? "result" : "attention";
    if (semantic["data-viz-name"] === "signed-result-bar") return [null, resultRole];
    if (semantic["data-viz-name"] === "result-marker") return [resultRole, "pointStroke"];
    if (node.tagName === "text") return ["tickText", null];
    return [null, index === 1 ? "axisStrong" : "axis"];
  }
  if (args.sequenceId === "p5-visible-volume-layers") {
    if (contractId === "cuboid-footprint") return ["softFill", "parameter"];
    if (contractId === "dimension-arrows") {
      return node.tagName === "line" ? [null, "change"] : node.tagName === "polygon" ? ["change", null] : ["text", null];
    }
    const siblings = nodes.filter((candidate) => candidate.parentIndex === node.parentIndex && candidate.tagName === "polygon");
    const face = siblings.indexOf(node);
    return [face === 0 ? "cubeTop" : face === 1 ? "cubeLeft" : "cubeRight", "unitCubeStroke"];
  }
  if (args.sequenceId.startsWith("s3-")) {
    if (index === 1) return ["main", "pointStroke"];
    if (index === 3) return ["identityAmber", "pointStroke"];
    if (index === 4) return ["identityPurple", "pointStroke"];
    if (index === 5) return ["result", "pointStroke"];
    return [null, "axisStrong"];
  }
  throw new Error(`Dependent visible-math expected paint role is missing for ${args.sequenceId}/${contractId}/${index}.`);
}

function bindExpectedProjectionPaint(
  args: ExpectedProjectionArgs,
  expected: readonly HkVisualizationDependentVisibleMathExpectedProjection[],
) {
  const theme = args.theme ?? "light";
  return Object.freeze(expected.map((item) => {
    const nodes = Object.freeze(item.projection.nodes.map((node, index) => {
      if (node.paint === null) return node;
      const [fillRole, strokeRole] = expectedPaintRoles(
        args, item.contractId, item.projection.nodes, node, index,
      );
      if (
        (node.paint.fill.kind === "none") !== (fillRole === null) ||
        (node.paint.stroke.kind === "none") !== (strokeRole === null)
      ) {
        throw new Error(
          `Dependent visible-math expected paint-channel topology drifted for ${item.contractId}/${index}.`,
        );
      }
      return Object.freeze({
        ...node,
        paint: Object.freeze({
          ...node.paint,
          fill: expectedColor(fillRole, theme),
          stroke: expectedColor(strokeRole, theme),
        }),
      });
    }));
    const projection = Object.freeze({
      ...item.projection,
      nodes,
      surface: expectedSurface(
        args.sequenceId,
        args.language ?? "en",
        args.theme ?? "light",
      ),
    });
    return Object.freeze({ ...item, hash: projectionHash(projection), projection });
  }));
}

export function buildHkVisualizationDependentVisibleMathExpectedProjections(
  args: ExpectedProjectionArgs,
): readonly HkVisualizationDependentVisibleMathExpectedProjection[] {
  const language = args.language ?? "en";
  const expected = (() => {
    switch (args.sequenceId) {
    case "p1-number-bond-known-part":
      return expectedNumberBondProjections(args.sequenceId, args.state);
    case "p1-add-step":
    case "p1-subtract-step": {
      if (args.modeId !== "add" && args.modeId !== "subtract") {
        throw new Error("Dependent visible-math add/subtract mode is invalid.");
      }
      return expectedAddSubtractProjections(
        args.sequenceId,
        args.state,
        args.modeId,
      );
    }
    case "p2-payment-at-least-price":
      return expectedMoneyProjections(args.sequenceId, args.state);
    case "p4-divisor-within-number":
      return expectedFactorPairProjection(args.sequenceId, args.state, language);
    case "p5-first-proper-fraction":
    case "p5-second-proper-fraction":
    case "p5-third-proper-fraction":
      return expectedFractionProjections(
        args.sequenceId,
        args.state,
        args.fractionOperation ?? "subtract",
      );
    case "p5-visible-volume-layers":
      return expectedVolumeProjections(args.sequenceId, args.state);
    case "s3-identity-a-projects-b":
    case "s3-identity-b-projects-a":
      return expectedIdentityProjection(args.sequenceId, args.state);
    }
  })();
  if (!expected) throw new Error("Dependent visible-math sequence has no expected projection builder.");
  return bindExpectedProjectionPaint(args, expected);
}

function aggregateProjectionItems(
  items: readonly Readonly<{
    ancestryScaleSummary: HkVisualizationDependentVisibleMathProjection["surface"]["ancestryScaleSummary"];
    contractId: string;
    elementCount: number;
    hash: string;
  }>[],
) {
  denseArray("dependent visible-math aggregate items", items, 32);
  if (items.length < 1 || items.length > 32) {
    throw new Error("Dependent visible-math aggregate contract count is outside its bounded range.");
  }
  let total = 0;
  let chainCount = 0;
  let entryCount = 0;
  let scaleWitnessCount = 0;
  const seen = new Set<string>();
  const canonical = items.map((item, index) => {
    exactPlainObject(`dependent visible-math aggregate item[${index}]`, item, [
      "ancestryScaleSummary", "contractId", "elementCount", "hash",
    ]);
    const contractId = boundedString(
      `dependent visible-math aggregate item[${index}].contractId`,
      item.contractId,
    );
    if (!contractId || seen.has(contractId)) {
      throw new Error("Dependent visible-math aggregate contract IDs must be exact and unique.");
    }
    seen.add(contractId);
    const elementCount = canonicalNumber(
      `dependent visible-math aggregate item[${index}].elementCount`,
      item.elementCount,
    );
    if (!Number.isInteger(elementCount) || elementCount < 1) {
      throw new Error("Dependent visible-math aggregate element count must be positive integer.");
    }
    const hash = boundedString(
      `dependent visible-math aggregate item[${index}].hash`,
      item.hash,
    );
    if (!VISIBLE_MATH_SHA256.test(hash)) {
      throw new Error("Dependent visible-math aggregate item hash must be SHA-256.");
    }
    const summaryLabel =
      `dependent visible-math aggregate item[${index}].ancestryScaleSummary`;
    exactPlainObject(summaryLabel, item.ancestryScaleSummary, [
      "ancestorHash", "chainCount", "effectHash", "entryCount",
      "policyVersion", "scaleHash", "scaleWitnessCount",
    ]);
    if (
      item.ancestryScaleSummary.policyVersion !==
        "visible-math-ancestry-scale-summary.v1"
    ) {
      throw new Error(`${summaryLabel}.policyVersion drifted.`);
    }
    const itemChainCount = canonicalNumber(
      `${summaryLabel}.chainCount`,
      item.ancestryScaleSummary.chainCount,
    );
    const itemEntryCount = canonicalNumber(
      `${summaryLabel}.entryCount`,
      item.ancestryScaleSummary.entryCount,
    );
    const itemScaleWitnessCount = canonicalNumber(
      `${summaryLabel}.scaleWitnessCount`,
      item.ancestryScaleSummary.scaleWitnessCount,
    );
    if (
      !Number.isInteger(itemChainCount) || itemChainCount < 1 ||
      !Number.isInteger(itemEntryCount) || itemEntryCount < itemChainCount ||
      itemScaleWitnessCount !== 3
    ) {
      throw new Error(`${summaryLabel} exact counts drifted.`);
    }
    for (const key of ["ancestorHash", "effectHash", "scaleHash"] as const) {
      const digest = boundedString(
        `${summaryLabel}.${key}`,
        item.ancestryScaleSummary[key],
      );
      if (!VISIBLE_MATH_SHA256.test(digest)) {
        throw new Error(`${summaryLabel}.${key} requires lowercase SHA-256.`);
      }
    }
    total += elementCount;
    if (total > VISIBLE_MATH_MAX_NODES * 32) {
      throw new Error("Dependent visible-math aggregate element budget was exceeded.");
    }
    chainCount += itemChainCount;
    entryCount += itemEntryCount;
    scaleWitnessCount += itemScaleWitnessCount;
    return Object.freeze({
      ancestryScaleSummary: Object.freeze({
        ancestorHash: item.ancestryScaleSummary.ancestorHash,
        chainCount: itemChainCount,
        effectHash: item.ancestryScaleSummary.effectHash,
        entryCount: itemEntryCount,
        policyVersion: "visible-math-ancestry-scale-summary.v1" as const,
        scaleHash: item.ancestryScaleSummary.scaleHash,
        scaleWitnessCount: 3 as const,
      }),
      contractId,
      elementCount,
      hash,
    });
  });
  const ancestryScaleSummary = Object.freeze({
    chainCount,
    contractCount: canonical.length,
    entryCount,
    hash: createHash("sha256").update(boundedDescriptorSafeJson(
      "Dependent visible-math aggregate ancestry summary",
      canonical.map((item) => ({
        ancestryScaleSummary: item.ancestryScaleSummary,
        contractId: item.contractId,
      })),
    )).digest("hex"),
    policyVersion: "visible-math-aggregate-ancestry-scale-summary.v1" as const,
    scaleWitnessCount,
  });
  return Object.freeze({
    ancestryScaleSummary,
    elementCount: total,
    hash: createHash("sha256").update(boundedDescriptorSafeJson(
      "Dependent visible-math aggregate projection items",
      canonical,
    )).digest("hex"),
  });
}

export function aggregateHkVisualizationDependentVisibleMathActualProjections(
  projections: readonly Readonly<{
    contractId: string;
    projection: HkVisualizationDependentVisibleMathProjection;
  }>[],
): HkVisualizationDependentVisibleMathAggregateObservation {
  denseArray("dependent visible-math actual projections", projections, 32);
  return aggregateProjectionItems(projections.map((entry, index) => {
    exactPlainObject(`dependent visible-math actual projection[${index}]`, entry, [
      "contractId", "projection",
    ]);
    const { contractId, projection } = entry;
    const hash = projectionHash(projection);
    return Object.freeze({
      ancestryScaleSummary: projection.surface.ancestryScaleSummary,
      contractId,
      elementCount: projection.nodes.length,
      hash,
    });
  }));
}

export function buildHkVisualizationDependentVisibleMathAggregateContract(
  args: Omit<ExpectedProjectionArgs, "language">,
): HkVisualizationDependentVisibleMathAggregateContract {
  const themes = ["dark", "light"] as const;
  const byLanguage = Object.fromEntries(LANGUAGES.map((language) => [
    language,
    Object.freeze(Object.fromEntries(themes.map((theme) => {
      const expected = buildHkVisualizationDependentVisibleMathExpectedProjections({
        ...args,
        language,
        theme,
      });
      return [theme, aggregateProjectionItems(expected.map((item) => Object.freeze({
        ancestryScaleSummary: item.projection.surface.ancestryScaleSummary,
        contractId: item.contractId,
        elementCount: item.projection.nodes.length,
        hash: item.hash,
      })))] as const;
    }))),
  ] as const)) as Record<
    HkVisualizationDependentVisibleMathLanguage,
    Readonly<Record<
      HkVisualizationDependentVisibleMathTheme,
      HkVisualizationDependentVisibleMathAggregateObservation
    >>
  >;
  const en = buildHkVisualizationDependentVisibleMathExpectedProjections({
    ...args,
    language: "en",
    theme: "light",
  });
  for (const language of LANGUAGES) {
    for (const theme of themes) {
      const current = buildHkVisualizationDependentVisibleMathExpectedProjections({
        ...args,
        language,
        theme,
      });
      if (
        current.length !== en.length ||
        current.some((item, index) =>
          item.captureRoot !== en[index].captureRoot ||
          item.contractId !== en[index].contractId ||
          item.occurrence !== en[index].occurrence ||
          item.selector !== en[index].selector ||
          item.projection.nodes.length !== en[index].projection.nodes.length
        ) ||
        byLanguage[language][theme].elementCount !== byLanguage.en.light.elementCount
      ) {
        throw new Error("Dependent visible-math exact topology drifted by language/theme.");
      }
    }
  }
  return Object.freeze({
    contractIds: Object.freeze(en.map(({ contractId }) => contractId)),
    elementCount: byLanguage.en.light.elementCount,
    expectedAncestryScaleSummaries: Object.freeze(Object.fromEntries(
      LANGUAGES.map((language) => [
        language,
        Object.freeze(Object.fromEntries(themes.map((theme) => [
          theme,
          byLanguage[language][theme].ancestryScaleSummary,
        ]))),
      ]),
    )) as HkVisualizationDependentVisibleMathAggregateContract[
      "expectedAncestryScaleSummaries"
    ],
    expectedHashes: Object.freeze(Object.fromEntries(LANGUAGES.map((language) => [
      language,
      Object.freeze(Object.fromEntries(themes.map((theme) =>
        [theme, byLanguage[language][theme].hash]
      )) as Record<HkVisualizationDependentVisibleMathTheme, string>),
    ])) as Record<
      HkVisualizationDependentVisibleMathLanguage,
      Readonly<Record<HkVisualizationDependentVisibleMathTheme, string>>
    >),
    selectors: Object.freeze(en.map(({
      captureRoot, contractId, occurrence, selector,
    }) =>
      Object.freeze({ captureRoot, contractId, occurrence, selector })
    )),
  });
}
