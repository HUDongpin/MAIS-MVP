import type { ReactNode } from "react";
import type { LocalizedText } from "../../../types";
import type {
  BinaryPolynomialWork,
  CollectLikeTermsWork,
  EquationSolveWork,
  ExpansionWork,
  FactorizationWork,
  FractionSimplificationWork,
  PolynomialState,
  SubstitutionWork,
  SymbolicExpressionsModel,
} from "./SymbolicExpressionsModel";

type SymbolicVisualKind =
  | "area-expansion"
  | "area-factorization"
  | "binary-polynomial"
  | "collect-like-terms"
  | "equation-balance"
  | "fraction-cancellation"
  | "substitution-flow";

export type SymbolicVisualMark = {
  coefficient: number;
  degree: number;
  exact: string;
  markId: string;
  name:
    | "algebra-tile"
    | "area-cell"
    | "equation-step"
    | "fraction-step"
    | "substitution-step"
    | "zero-expression";
  owner: "symbolic-expressions";
  sign: "negative" | "positive" | "zero";
  stage: string;
  unitCount: number;
  unitIndex: number;
  unitValue: -1 | 0 | 1;
};

type SupportedReceiptBase = {
  markCount: number;
  marks: SymbolicVisualMark[];
  status: "supported";
};

export type CollectLikeTermsVisualReceipt = SupportedReceiptBase & {
  coefficientResidual: number[];
  kind: "collect-like-terms";
  resultCoefficients: number[];
};

export type BinaryPolynomialVisualReceipt = SupportedReceiptBase & {
  coefficientResidual: number[];
  kind: "binary-polynomial";
  operator: "+" | "−";
  resultCoefficients: number[];
};

export type SymbolicAreaCell = SymbolicVisualMark & {
  absoluteAreaUnits: number;
  column: number;
  height: number;
  leftCoefficient: number;
  leftDegree: number;
  rightCoefficient: number;
  rightDegree: number;
  row: number;
  width: number;
  x: number;
  y: number;
};

export type ExpansionVisualReceipt = SupportedReceiptBase & {
  cells: SymbolicAreaCell[];
  coefficientResidual: number[];
  factors: [number[], number[]];
  kind: "area-expansion";
  resultCoefficients: number[];
};

export type FactorizationVisualReceipt = SupportedReceiptBase & {
  cells: SymbolicAreaCell[];
  coefficientResidual: number[];
  factorCoefficients: number[];
  kind: "area-factorization";
  originalCoefficients: number[];
  quotientCoefficients: number[];
};

export type SubstitutionVisualReceipt = SupportedReceiptBase & {
  contributions: Array<{
    coefficient: number;
    degree: number;
    exact: string;
    power: string;
  }>;
  kind: "substitution-flow";
  polynomialCoefficients: number[];
  residual: string;
  result: string;
  value: string;
};

export type FractionCancellationVisualReceipt = SupportedReceiptBase & {
  cancellationSteps: Array<{
    afterDenominator: string;
    afterNumerator: string;
    beforeDenominator: string;
    beforeNumerator: string;
    factor: string;
    index: number;
  }>;
  commonFactorCoefficients: number[];
  equivalenceResidual: number[];
  kind: "fraction-cancellation";
  originalDenominator: string;
  originalDomainCondition: string;
  originalNumerator: string;
  originalRationalExclusions: string[];
  retainedOriginalRestrictions: true;
  simplifiedDenominator: string;
  simplifiedNumerator: string;
};

export type EquationBalanceVisualReceipt = SupportedReceiptBase & {
  balance: {
    beam: {
      leftY: number;
      rightY: number;
    };
    leftValue: string;
    residual: string;
    rightValue: string;
    status: "balanced" | "unbalanced";
  };
  candidate: {
    isSolution: boolean;
    residual: string;
    value: string;
  } | null;
  crossResidualCoefficients: number[];
  equationKind: "fractional-linear" | "linear";
  kind: "equation-balance";
  leftDomainCondition: string | null;
  originalEquation: string;
  rationalExclusions: string[];
  rightDomainCondition: string | null;
  solution: string;
  solutionResidual: string;
};

export type UnsupportedSymbolicVisualReceipt = {
  kind:
    | "area-expansion"
    | "area-factorization"
    | "binary-polynomial"
    | "collect-like-terms";
  reason:
    | "tile-count-exceeds-visual-domain"
    | "zero-factor-has-no-area-partition";
  status: "unsupported";
};

export type SymbolicExpressionsVisualReceipt =
  | BinaryPolynomialVisualReceipt
  | CollectLikeTermsVisualReceipt
  | EquationBalanceVisualReceipt
  | ExpansionVisualReceipt
  | FactorizationVisualReceipt
  | FractionCancellationVisualReceipt
  | SubstitutionVisualReceipt
  | UnsupportedSymbolicVisualReceipt;

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const SYMBOLIC_EXPRESSIONS_VISUAL_COPY = {
  collect: localized(
    "Group only tiles with the same variable part",
    "只合併變數部分相同的代數方塊",
    "只合并变量部分相同的代数方块",
  ),
  binary: localized(
    "Keep each degree in its own coefficient column",
    "每個次數各自保留在對應的係數欄",
    "每个次数各自保留在对应的系数栏",
  ),
  expand: localized(
    "Every area cell is one term of the full product",
    "每個面積分格都是完整乘積的一項",
    "每个面积分格都是完整乘积的一项",
  ),
  factor: localized(
    "The factor and quotient reconstruct the original area",
    "因式與商重構原來的完整面積",
    "因式与商重构原来的完整面积",
  ),
  substitute: localized(
    "Substitute once, evaluate every term, then add exactly",
    "代入一次，逐項計算，再作精確相加",
    "代入一次，逐项计算，再作精确相加",
  ),
  fraction: localized(
    "Cancel a common factor while keeping the original restriction",
    "約去公因式，同時保留原式的限制",
    "约去公因式，同时保留原式的限制",
  ),
  solve: localized(
    "Keep both sides balanced and verify the candidate in the original equation",
    "保持等式兩邊平衡，並在原方程中驗證候選值",
    "保持等式两边平衡，并在原方程中验证候选值",
  ),
  unsupported: localized(
    "A zero factor has no non-degenerate area partition. Choose a nonzero factor before using the area diagram.",
    "零因式沒有非退化的面積分割；請先選擇非零因式再使用面積圖。",
    "零因式没有非退化的面积分割；请先选择非零因式再使用面积图。",
  ),
  unsupportedTileCount: localized(
    "This expression needs more algebra tiles than the visual surface can show faithfully. Use a smaller coefficient to inspect every unit tile.",
    "這個代數式需要的代數方塊超出圖面可忠實呈現的數量；請使用較小的係數來逐一檢視每個單位方塊。",
    "这个代数式需要的代数方块超出图面可忠实呈现的数量；请使用较小的系数来逐一查看每个单位方块。",
  ),
} as const;

export const SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY = {
  left: localized(
    "First expression",
    "第一個式",
    "第一个式",
  ),
  result: localized(
    "Combined expression",
    "合併後的式",
    "合并后的式",
  ),
  right: localized(
    "Second expression",
    "第二個式",
    "第二个式",
  ),
  "signed-right": localized(
    "Operation-adjusted expression",
    "按運算調整後的式",
    "按运算调整后的式",
  ),
  source: localized(
    "Original terms",
    "原來的項",
    "原来的项",
  ),
} as const;

type SymbolicAlgebraStage = keyof typeof SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY;

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function signFor(coefficient: number): SymbolicVisualMark["sign"] {
  return coefficient < 0
    ? "negative"
    : coefficient > 0
      ? "positive"
      : "zero";
}

function polynomialMarks(
  polynomial: PolynomialState,
  stage: string,
): SymbolicVisualMark[] {
  return polynomial.coefficients.flatMap((coefficient, degree) => {
    const unitCount = Math.abs(coefficient);
    if (unitCount === 0) return [];
    const unitValue = Math.sign(coefficient) as -1 | 1;
    return Array.from({ length: unitCount }, (_, unitIndex) => ({
      coefficient: unitValue,
      degree,
      exact: `${unitValue}x^${degree}`,
      markId: `${stage}:degree-${degree}:unit-${unitIndex}`,
      name: "algebra-tile" as const,
      owner: "symbolic-expressions" as const,
      sign: signFor(unitValue),
      stage,
      unitCount,
      unitIndex,
      unitValue,
    }));
  });
}

function sourceTermMarks(work: CollectLikeTermsWork): SymbolicVisualMark[] {
  return work.sourceTerms.flatMap((term) => {
    const unitCount = Math.abs(term.coefficient);
    if (unitCount === 0) return [];
    const unitValue = Math.sign(term.coefficient) as -1 | 1;
    return Array.from({ length: unitCount }, (_, unitIndex) => ({
      coefficient: unitValue,
      degree: term.degree,
      exact: `${unitValue}x^${term.degree}`,
      markId: `source:term-${term.sourceIndex}:unit-${unitIndex}`,
      name: "algebra-tile" as const,
      owner: "symbolic-expressions" as const,
      sign: signFor(unitValue),
      stage: "source",
      unitCount,
      unitIndex,
      unitValue,
    }));
  });
}

function zeroExpressionMark(stage: SymbolicAlgebraStage): SymbolicVisualMark {
  return {
    coefficient: 0,
    degree: 0,
    exact: "0",
    markId: `${stage}:zero-expression`,
    name: "zero-expression",
    owner: "symbolic-expressions",
    sign: "zero",
    stage,
    unitCount: 0,
    unitIndex: 0,
    unitValue: 0,
  };
}

function areaCells(
  left: PolynomialState,
  right: PolynomialState,
): SymbolicAreaCell[] {
  const leftTerms = left.coefficients
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => coefficient !== 0);
  const rightTerms = right.coefficients
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => coefficient !== 0);
  const totalHeightUnits = leftTerms.reduce(
    (sum, { coefficient }) => sum + Math.abs(coefficient),
    0,
  );
  const totalWidthUnits = rightTerms.reduce(
    (sum, { coefficient }) => sum + Math.abs(coefficient),
    0,
  );
  let heightOffset = 0;
  return leftTerms.flatMap(
    ({ coefficient: leftCoefficient, degree: leftDegree }, row) => {
      const height = (170 * Math.abs(leftCoefficient)) / totalHeightUnits;
      let widthOffset = 0;
      const cells = rightTerms.map(
        ({ coefficient: rightCoefficient, degree: rightDegree }, column) => {
          const coefficient = leftCoefficient * rightCoefficient;
          const degree = leftDegree + rightDegree;
          const width =
            (560 * Math.abs(rightCoefficient)) / totalWidthUnits;
          const cell: SymbolicAreaCell = {
            absoluteAreaUnits: Math.abs(coefficient),
            coefficient,
            column,
            degree,
            exact: `${leftCoefficient}x^${leftDegree} × ${rightCoefficient}x^${rightDegree} = ${coefficient}x^${degree}`,
            height,
            leftCoefficient,
            leftDegree,
            markId: `area:r${row}:c${column}`,
            name: "area-cell",
            owner: "symbolic-expressions",
            rightCoefficient,
            rightDegree,
            row,
            sign: signFor(coefficient),
            stage: "product",
            unitCount: 1,
            unitIndex: 0,
            unitValue: signFor(coefficient) === "negative" ? -1 : 1,
            width,
            x: 80 + widthOffset,
            y: 35 + heightOffset,
          };
          widthOffset += width;
          return cell;
        },
      );
      heightOffset += height;
      return cells;
    },
  );
}

function polynomialIsZero(polynomial: PolynomialState) {
  return polynomial.isZero;
}

function buildCollectReceipt(
  model: SymbolicExpressionsModel,
  work: CollectLikeTermsWork,
): CollectLikeTermsVisualReceipt | UnsupportedSymbolicVisualReceipt {
  if (model.result.kind !== "polynomial") {
    throw new RangeError("collect-like-terms requires a polynomial result");
  }
  const marks = [
    ...sourceTermMarks(work),
    ...(model.result.polynomial.isZero
      ? [zeroExpressionMark("result")]
      : polynomialMarks(model.result.polynomial, "result")),
  ];
  if (marks.length > 1_024) {
    return {
      kind: "collect-like-terms",
      reason: "tile-count-exceeds-visual-domain",
      status: "unsupported",
    };
  }
  return {
    coefficientResidual: [...work.coefficientResidual],
    kind: "collect-like-terms",
    markCount: marks.length,
    marks,
    resultCoefficients: [...model.result.polynomial.coefficients],
    status: "supported",
  };
}

function buildBinaryReceipt(
  model: SymbolicExpressionsModel,
  work: BinaryPolynomialWork,
): BinaryPolynomialVisualReceipt | UnsupportedSymbolicVisualReceipt {
  if (model.result.kind !== "polynomial") {
    throw new RangeError("binary polynomial work requires a polynomial result");
  }
  const marks = [
    ...polynomialMarks(work.left, "left"),
    ...polynomialMarks(work.right, "right"),
    ...polynomialMarks(work.signedRight, "signed-right"),
    ...(model.result.polynomial.isZero
      ? [zeroExpressionMark("result")]
      : polynomialMarks(model.result.polynomial, "result")),
  ];
  if (marks.length > 1_024) {
    return {
      kind: "binary-polynomial",
      reason: "tile-count-exceeds-visual-domain",
      status: "unsupported",
    };
  }
  return {
    coefficientResidual: [...work.coefficientResidual],
    kind: "binary-polynomial",
    markCount: marks.length,
    marks,
    operator: work.operator === "+" ? "+" : "−",
    resultCoefficients: [...model.result.polynomial.coefficients],
    status: "supported",
  };
}

function buildExpansionReceipt(
  model: SymbolicExpressionsModel,
  work: ExpansionWork,
): ExpansionVisualReceipt | UnsupportedSymbolicVisualReceipt {
  if (model.result.kind !== "polynomial") {
    throw new RangeError("expansion requires a polynomial result");
  }
  if (work.factors.some(polynomialIsZero)) {
    return {
      kind: "area-expansion",
      reason: "zero-factor-has-no-area-partition",
      status: "unsupported",
    };
  }
  const cells = areaCells(work.factors[0], work.factors[1]);
  return {
    cells,
    coefficientResidual: [...work.coefficientResidual],
    factors: [
      [...work.factors[0].coefficients],
      [...work.factors[1].coefficients],
    ],
    kind: "area-expansion",
    markCount: cells.length,
    marks: cells,
    resultCoefficients: [...model.result.polynomial.coefficients],
    status: "supported",
  };
}

function buildFactorReceipt(
  work: FactorizationWork,
): FactorizationVisualReceipt | UnsupportedSymbolicVisualReceipt {
  if (polynomialIsZero(work.factor) || polynomialIsZero(work.quotient)) {
    return {
      kind: "area-factorization",
      reason: "zero-factor-has-no-area-partition",
      status: "unsupported",
    };
  }
  const cells = areaCells(work.factor, work.quotient);
  return {
    cells,
    coefficientResidual: [...work.coefficientResidual],
    factorCoefficients: [...work.factor.coefficients],
    kind: "area-factorization",
    markCount: cells.length,
    marks: cells,
    originalCoefficients: [...work.original.coefficients],
    quotientCoefficients: [...work.quotient.coefficients],
    status: "supported",
  };
}

function nodeMark(
  name: SymbolicVisualMark["name"],
  stage: string,
  exact: string,
  index: number,
): SymbolicVisualMark {
  return {
    coefficient: 0,
    degree: 0,
    exact,
    markId: `${stage}:${index}`,
    name,
    owner: "symbolic-expressions",
    sign: "zero",
    stage,
    unitCount: 1,
    unitIndex: 0,
    unitValue: 0,
  };
}

function buildSubstitutionReceipt(
  model: SymbolicExpressionsModel,
  work: SubstitutionWork,
): SubstitutionVisualReceipt {
  if (model.result.kind !== "rational") {
    throw new RangeError("substitution requires an exact rational result");
  }
  const marks = [
    ...work.contributions.map((contribution, index) =>
      nodeMark(
        "substitution-step",
        "contribution",
        contribution.contribution.text,
        index,
      ),
    ),
    nodeMark("substitution-step", "sum", model.result.value.text, work.contributions.length),
  ];
  return {
    contributions: work.contributions.map((contribution) => ({
      coefficient: contribution.coefficient,
      degree: contribution.degree,
      exact: contribution.contribution.text,
      power: contribution.power.text,
    })),
    kind: "substitution-flow",
    markCount: marks.length,
    marks,
    polynomialCoefficients: [...work.polynomial.coefficients],
    residual: work.residual.text,
    result: model.result.value.text,
    status: "supported",
    value: work.value.text,
  };
}

function buildFractionReceipt(
  work: FractionSimplificationWork,
): FractionCancellationVisualReceipt {
  const factor = work.cancelledFactors[0]?.factor;
  if (!factor) throw new RangeError("fraction cancellation needs a common factor");
  const cancellationSteps = work.cancelledFactors.map((step, index) => ({
    afterDenominator: step.after.denominator.text,
    afterNumerator: step.after.numerator.text,
    beforeDenominator: step.before.denominator.text,
    beforeNumerator: step.before.numerator.text,
    factor: step.factor.text,
    index,
  }));
  const marks = [
    ...cancellationSteps.flatMap((step) => [
      nodeMark(
        "fraction-step",
        `cancel-${step.index}-before-numerator`,
        step.beforeNumerator,
        step.index * 5,
      ),
      nodeMark(
        "fraction-step",
        `cancel-${step.index}-before-denominator`,
        step.beforeDenominator,
        step.index * 5 + 1,
      ),
      nodeMark(
        "fraction-step",
        `cancel-${step.index}-factor`,
        step.factor,
        step.index * 5 + 2,
      ),
      nodeMark(
        "fraction-step",
        `cancel-${step.index}-after-numerator`,
        step.afterNumerator,
        step.index * 5 + 3,
      ),
      nodeMark(
        "fraction-step",
        `cancel-${step.index}-after-denominator`,
        step.afterDenominator,
        step.index * 5 + 4,
      ),
    ]),
    nodeMark(
      "fraction-step",
      "original-domain",
      work.domain.condition,
      cancellationSteps.length * 5,
    ),
  ];
  return {
    cancellationSteps,
    commonFactorCoefficients: [...factor.coefficients],
    equivalenceResidual: [...work.equivalence.coefficientResidual],
    kind: "fraction-cancellation",
    markCount: marks.length,
    marks,
    originalDenominator: work.original.denominator.text,
    originalDomainCondition: work.domain.condition,
    originalNumerator: work.original.numerator.text,
    originalRationalExclusions: work.domain.rationalExclusions.map(
      ({ text }) => text,
    ),
    retainedOriginalRestrictions: work.domain.retainedOriginalRestrictions,
    simplifiedDenominator: work.simplified.denominator.text,
    simplifiedNumerator: work.simplified.numerator.text,
    status: "supported",
  };
}

function buildEquationReceipt(
  work: EquationSolveWork,
): EquationBalanceVisualReceipt {
  const stageExacts: Array<{ exact: string; stage: string }> = [
    { exact: work.original.left.text, stage: "left-side" },
    { exact: work.original.right.text, stage: "right-side" },
    { exact: work.crossEquation.leftProduct.text, stage: "left-cross-product" },
    { exact: work.crossEquation.rightProduct.text, stage: "right-cross-product" },
    { exact: work.solution.text, stage: "solution" },
  ];
  if (work.candidateCheck) {
    stageExacts.push({
      exact: work.candidateCheck.residual.text,
      stage: "candidate-residual",
    });
  }
  const fractional = work.equationKind === "fractional-linear";
  if (fractional) {
    stageExacts.push(
      { exact: work.domain.leftCondition, stage: "left-domain" },
      { exact: work.domain.rightCondition, stage: "right-domain" },
    );
    work.domain.rationalExclusions.forEach((exclusion) => {
      stageExacts.push({
        exact: `x ≠ ${exclusion.text}`,
        stage: "excluded-value",
      });
    });
  }
  const marks = stageExacts.map(({ exact, stage }, index) =>
    nodeMark("equation-step", stage, exact, index),
  );
  const balanceCheck = work.candidateCheck ?? work.solutionCheck;
  const balanced = balanceCheck.residual.numerator === 0;
  const residualSign = Math.sign(balanceCheck.residual.numerator);
  const tilt = balanced
    ? 0
    : Math.min(
        18,
        6 +
          Math.ceil(
            (12 * Math.abs(balanceCheck.residual.numerator)) /
              balanceCheck.residual.denominator,
          ),
      );
  const leftY = 103 + residualSign * tilt;
  const rightY = 103 - residualSign * tilt;
  return {
    balance: {
      beam: { leftY, rightY },
      leftValue: balanceCheck.leftValue.text,
      residual: balanceCheck.residual.text,
      rightValue: balanceCheck.rightValue.text,
      status: balanced ? "balanced" : "unbalanced",
    },
    candidate: work.candidateCheck
      ? {
          isSolution: work.candidateCheck.isSolution,
          residual: work.candidateCheck.residual.text,
          value: work.candidateCheck.candidate.text,
        }
      : null,
    crossResidualCoefficients: [
      ...work.crossEquation.residualPolynomial.coefficients,
    ],
    equationKind: work.equationKind,
    kind: "equation-balance",
    leftDomainCondition: fractional ? work.domain.leftCondition : null,
    markCount: marks.length,
    marks,
    originalEquation: work.original.text,
    rationalExclusions: work.domain.rationalExclusions.map(({ text }) => text),
    rightDomainCondition: fractional ? work.domain.rightCondition : null,
    solution: work.solution.text,
    solutionResidual: work.solutionCheck.residual.text,
    status: "supported",
  };
}

export function buildSymbolicExpressionsVisualReceipt(
  model: SymbolicExpressionsModel,
): SymbolicExpressionsVisualReceipt {
  let receipt: SymbolicExpressionsVisualReceipt;
  switch (model.work.kind) {
    case "collect-like-terms":
      receipt = buildCollectReceipt(model, model.work);
      break;
    case "binary-polynomial":
      receipt = buildBinaryReceipt(model, model.work);
      break;
    case "expansion":
      receipt = buildExpansionReceipt(model, model.work);
      break;
    case "factorization":
      receipt = buildFactorReceipt(model.work);
      break;
    case "substitution":
      receipt = buildSubstitutionReceipt(model, model.work);
      break;
    case "fraction-simplification":
      receipt = buildFractionReceipt(model.work);
      break;
    case "equation-solve":
      receipt = buildEquationReceipt(model.work);
      break;
  }
  if (receipt.status === "supported" && receipt.markCount <= 0) {
    throw new RangeError(`${receipt.kind} must expose nonzero painted marks`);
  }
  return deepFreeze(receipt);
}

function visualCopyFor(kind: SymbolicVisualKind) {
  switch (kind) {
    case "collect-like-terms":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.collect;
    case "binary-polynomial":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.binary;
    case "area-expansion":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.expand;
    case "area-factorization":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.factor;
    case "substitution-flow":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.substitute;
    case "fraction-cancellation":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.fraction;
    case "equation-balance":
      return SYMBOLIC_EXPRESSIONS_VISUAL_COPY.solve;
  }
}

function markFill(sign: SymbolicVisualMark["sign"]) {
  return sign === "positive" ? "#0f766e" : sign === "negative" ? "#be123c" : "#64748b";
}

function algebraStageCopy(stage: string): LocalizedText {
  if (!(stage in SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY)) {
    throw new RangeError(`Unsupported learner-visible algebra stage ${stage}.`);
  }
  return SYMBOLIC_EXPRESSIONS_VISUAL_STAGE_COPY[stage as SymbolicAlgebraStage];
}

function AlgebraTiles({
  marks,
  t,
}: {
  marks: readonly SymbolicVisualMark[];
  t: (copy: LocalizedText) => string;
}) {
  const stages = [...new Set(marks.map(({ stage }) => stage))];
  const columns = 35;
  const cellWidth = 18;
  const cellHeight = 18;
  return (
    <>
      {marks.map((mark) => {
        const stageIndex = stages.indexOf(mark.stage);
        const stageMarks = marks.filter(
          (candidate) => candidate.stage === mark.stage,
        );
        const withinStage = stageMarks.findIndex(
          (candidate) => candidate.markId === mark.markId,
        );
        const x = 45 + (withinStage % columns) * cellWidth;
        const y = 30 + stageIndex * 112 + Math.floor(withinStage / columns) * cellHeight;
        const width = mark.degree === 0 ? 12 : mark.degree === 1 ? 16 : 13;
        const height = mark.degree === 0 ? 12 : mark.degree === 1 ? 8 : 13;
        return (
          <g key={mark.markId}>
            {withinStage === 0 ? (
              <text
                data-viz-algebra-stage-label={mark.stage}
                x={16}
                y={y + 10}
                fill="#0f172a"
                fontSize={10}
                fontWeight={800}
              >
                {t(algebraStageCopy(mark.stage))}
              </text>
            ) : null}
            {mark.name === "zero-expression" ? (
              <>
                <circle
                  data-viz-painted-mark="true"
                  data-viz-name="zero-expression"
                  data-viz-owner={mark.owner}
                  data-viz-stage={mark.stage}
                  data-viz-zero-result="true"
                  cx={x + 14}
                  cy={y + 14}
                  r={13}
                  fill="#f8fafc"
                  stroke="#475569"
                  strokeWidth={2}
                />
                <text
                  x={x + 14}
                  y={y + 19}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize={14}
                  fontWeight={900}
                >
                  0
                </text>
              </>
            ) : (
              <>
                <rect
                  data-viz-painted-mark="true"
                  data-viz-name={mark.name}
                  data-viz-owner={mark.owner}
                  data-viz-stage={mark.stage}
                  data-viz-coefficient={mark.coefficient}
                  data-viz-unit-value={mark.unitValue}
                  data-viz-unit-index={mark.unitIndex}
                  data-viz-unit-count={mark.unitCount}
                  data-viz-degree={mark.degree}
                  data-viz-variable-part={
                    mark.degree === 0 ? "unit" : mark.degree === 1 ? "x" : `x^${mark.degree}`
                  }
                  data-viz-sign={mark.sign}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={2}
                  fill={markFill(mark.sign)}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
                <text x={x + width / 2} y={y + height / 2 + 3} textAnchor="middle" fill="#ffffff" fontSize={7} fontWeight={800}>
                  {mark.unitValue > 0 ? "+" : "−"}
                </text>
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

function AreaPartition({ cells }: { cells: readonly SymbolicAreaCell[] }) {
  return (
    <>
      {cells.map((cell) => {
        return (
          <g key={cell.markId}>
            <rect
              data-viz-painted-mark="true"
              data-viz-name="area-cell"
              data-viz-owner={cell.owner}
              data-viz-row={cell.row}
              data-viz-column={cell.column}
              data-viz-coefficient={cell.coefficient}
              data-viz-degree={cell.degree}
              data-viz-absolute-area-units={cell.absoluteAreaUnits}
              x={cell.x}
              y={cell.y}
              width={cell.width}
              height={cell.height}
              fill={markFill(cell.sign)}
              stroke="#0f172a"
              strokeWidth={2}
            />
            <text x={cell.x + cell.width / 2} y={cell.y + cell.height / 2 + 5} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight={800}>
              {cell.exact}
            </text>
          </g>
        );
      })}
    </>
  );
}

function FlowNodes({ marks }: { marks: readonly SymbolicVisualMark[] }) {
  return (
    <>
      {marks.map((mark, index) => {
        const x = 26 + index * Math.max(92, 650 / marks.length);
        return (
          <g key={mark.markId}>
            {index > 0 ? (
              <path d={`M ${x - 30} 98 H ${x - 6}`} stroke="#0369a1" strokeWidth={3} markerEnd="url(#symbolic-arrow)" />
            ) : null}
            <rect
              data-viz-painted-mark="true"
              data-viz-name={mark.name}
              data-viz-owner={mark.owner}
              data-viz-stage={mark.stage}
              x={x}
              y={58}
              width={78}
              height={78}
              rx={12}
              fill="#e0f2fe"
              stroke="#0369a1"
              strokeWidth={2}
            />
            <text x={x + 39} y={103} textAnchor="middle" fill="#0c4a6e" fontSize={12} fontWeight={800}>
              {mark.exact.length > 12 ? `${mark.exact.slice(0, 11)}…` : mark.exact}
            </text>
          </g>
        );
      })}
    </>
  );
}

function FractionCancellationDiagram({
  receipt,
}: {
  receipt: FractionCancellationVisualReceipt;
}) {
  return (
    <>
      {receipt.cancellationSteps.map((step) => {
        const y = 22 + step.index * 76;
        const boxes = [
          ["before-numerator", step.beforeNumerator, 25, y, 165, 28],
          ["before-denominator", step.beforeDenominator, 25, y + 34, 165, 28],
          ["factor", step.factor, 260, y + 17, 110, 32],
          ["after-numerator", step.afterNumerator, 445, y, 165, 28],
          ["after-denominator", step.afterDenominator, 445, y + 34, 165, 28],
        ] as const;
        return (
          <g key={step.index}>
            <path d={`M 20 ${y + 31} H 195`} stroke="#0f172a" strokeWidth={2} />
            <path d={`M 440 ${y + 31} H 615`} stroke="#0f172a" strokeWidth={2} />
            <path d={`M 205 ${y + 31} H 248`} stroke="#0369a1" strokeWidth={3} markerEnd="url(#symbolic-arrow)" />
            <path d={`M 382 ${y + 31} H 428`} stroke="#0369a1" strokeWidth={3} markerEnd="url(#symbolic-arrow)" />
            {boxes.map(([stage, exact, x, boxY, width, height]) => (
              <g key={stage}>
                <rect
                  data-viz-painted-mark="true"
                  data-viz-name="fraction-step"
                  data-viz-owner="symbolic-expressions"
                  data-viz-stage={`cancel-${step.index}-${stage}`}
                  data-viz-cancellation-index={step.index}
                  x={x}
                  y={boxY}
                  width={width}
                  height={height}
                  rx={7}
                  fill="#e0f2fe"
                  stroke="#0369a1"
                  strokeWidth={2}
                />
                <text x={x + width / 2} y={boxY + height / 2 + 4} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight={800}>
                  {exact}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      <g>
        <rect
          data-viz-painted-mark="true"
          data-viz-name="fraction-step"
          data-viz-owner="symbolic-expressions"
          data-viz-stage="original-domain"
          x={190}
          y={receipt.cancellationSteps.length * 76 + 28}
          width={340}
          height={38}
          rx={8}
          fill="#fef3c7"
          stroke="#b45309"
          strokeWidth={2}
        />
        <text x={360} y={receipt.cancellationSteps.length * 76 + 52} textAnchor="middle" fill="#0f172a" fontSize={12} fontWeight={800}>
          {receipt.originalDomainCondition}
        </text>
      </g>
    </>
  );
}

function EquationBalanceDiagram({
  receipt,
}: {
  receipt: EquationBalanceVisualReceipt;
}) {
  const position = new Map(
    receipt.marks.map((mark) => [mark.stage, mark] as const),
  );
  const boxes = [
    ["left-side", 55, 35, 200, 48],
    ["right-side", 465, 35, 200, 48],
    ["left-cross-product", 90, 142, 160, 44],
    ["right-cross-product", 470, 142, 160, 44],
    ["solution", 280, 142, 150, 44],
    ["candidate-residual", 280, 200, 150, 38],
  ] as const;
  const domainMarks = receipt.marks.filter(
    ({ stage }) => stage === "left-domain" || stage === "right-domain",
  );
  const exclusionMarks = receipt.marks.filter(
    ({ stage }) => stage === "excluded-value",
  );
  return (
    <>
      <path
        data-viz-name="equation-balance-beam"
        data-viz-balance-status={receipt.balance.status}
        data-viz-balance-left-value={receipt.balance.leftValue}
        data-viz-balance-right-value={receipt.balance.rightValue}
        data-viz-balance-residual={receipt.balance.residual}
        d={`M 95 ${receipt.balance.beam.leftY} L 625 ${receipt.balance.beam.rightY}`}
        stroke="#0f172a"
        strokeWidth={5}
      />
      <path d="M 360 103 L 330 138 H 390 Z" fill="#64748b" />
      <path
        d={`M 155 83 V ${receipt.balance.beam.leftY} M 565 83 V ${receipt.balance.beam.rightY}`}
        stroke="#0f172a"
        strokeWidth={3}
      />
      {boxes.map(([stage, x, y, width, height]) => {
        const mark = position.get(stage);
        if (!mark) return null;
        return (
          <g key={stage}>
            <rect
              data-viz-painted-mark="true"
              data-viz-name="equation-step"
              data-viz-owner={mark.owner}
              data-viz-stage={stage}
              x={x}
              y={y}
              width={width}
              height={height}
              rx={9}
              fill={stage === "candidate-residual" ? "#fef3c7" : "#e0f2fe"}
              stroke={stage === "candidate-residual" ? "#b45309" : "#0369a1"}
              strokeWidth={2}
            />
            <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight={800}>
              {mark.exact.length > 22 ? `${mark.exact.slice(0, 21)}…` : mark.exact}
            </text>
          </g>
        );
      })}
      {domainMarks.map((mark, index) => {
        const x = index === 0 ? 55 : 375;
        return (
          <g key={mark.stage}>
            <rect
              data-viz-painted-mark="true"
              data-viz-name="equation-step"
              data-viz-owner={mark.owner}
              data-viz-stage={mark.stage}
              x={x}
              y={258}
              width={290}
              height={42}
              rx={8}
              fill="#fef3c7"
              stroke="#b45309"
              strokeWidth={2}
            />
            <text x={x + 145} y={284} textAnchor="middle" fill="#78350f" fontSize={12} fontWeight={800}>
              {mark.exact}
            </text>
          </g>
        );
      })}
      {exclusionMarks.map((mark, index) => {
        const x = 80 + (index % 4) * 155;
        const y = 318 + Math.floor(index / 4) * 48;
        return (
          <g key={`${mark.stage}:${index}`}>
            <rect
              data-viz-painted-mark="true"
              data-viz-name="equation-step"
              data-viz-owner={mark.owner}
              data-viz-stage="excluded-value"
              data-viz-visual-equation-exclusion={receipt.rationalExclusions[index]}
              x={x}
              y={y}
              width={130}
              height={36}
              rx={8}
              fill="#fee2e2"
              stroke="#be123c"
              strokeWidth={2}
            />
            <text x={x + 65} y={y + 23} textAnchor="middle" fill="#881337" fontSize={12} fontWeight={800}>
              {mark.exact}
            </text>
          </g>
        );
      })}
    </>
  );
}

function VisualShell({
  children,
  receipt,
  summary,
  viewBoxHeight,
}: {
  children: ReactNode;
  receipt: Exclude<SymbolicExpressionsVisualReceipt, UnsupportedSymbolicVisualReceipt>;
  summary: string;
  viewBoxHeight: number;
}) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-black text-slate-900 dark:text-white">{summary}</p>
      <svg
        aria-label={summary}
        data-viz-symbolic-visual={receipt.kind}
        data-viz-geometry-receipt={JSON.stringify(receipt)}
        data-viz-owner="symbolic-expressions"
        data-viz-painted-mark-count={receipt.markCount}
        role="img"
        viewBox={`0 0 720 ${viewBoxHeight}`}
        className="mt-2 block h-auto w-full min-w-0 rounded-lg bg-white"
      >
        <defs>
          <marker id="symbolic-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#0369a1" />
          </marker>
        </defs>
        <rect width="720" height={viewBoxHeight} fill="#ffffff" />
        {children}
      </svg>
      <figcaption className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
        {summary}
      </figcaption>
    </figure>
  );
}

export function SymbolicExpressionsVisualModel({
  model,
  t,
}: {
  model: SymbolicExpressionsModel;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = buildSymbolicExpressionsVisualReceipt(model);
  if (receipt.status === "unsupported") {
    return (
      <aside
        data-viz-symbolic-visual-status="unsupported"
        data-viz-symbolic-visual-kind={receipt.kind}
        data-viz-unsupported-reason={receipt.reason}
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        {t(
          receipt.reason === "tile-count-exceeds-visual-domain"
            ? SYMBOLIC_EXPRESSIONS_VISUAL_COPY.unsupportedTileCount
            : SYMBOLIC_EXPRESSIONS_VISUAL_COPY.unsupported,
        )}
      </aside>
    );
  }
  const summary = t(visualCopyFor(receipt.kind));
  const children =
    receipt.kind === "area-expansion" || receipt.kind === "area-factorization" ? (
      <AreaPartition cells={receipt.cells} />
    ) : receipt.kind === "collect-like-terms" || receipt.kind === "binary-polynomial" ? (
      <AlgebraTiles marks={receipt.marks} t={t} />
    ) : receipt.kind === "fraction-cancellation" ? (
      <FractionCancellationDiagram receipt={receipt} />
    ) : receipt.kind === "equation-balance" ? (
      <EquationBalanceDiagram receipt={receipt} />
    ) : (
      <FlowNodes marks={receipt.marks} />
    );
  const viewBoxHeight =
    receipt.kind === "collect-like-terms" || receipt.kind === "binary-polynomial"
      ? Math.max(
          250,
          new Set(receipt.marks.map(({ stage }) => stage)).size * 112 + 26,
        )
      : receipt.kind === "fraction-cancellation"
        ? receipt.cancellationSteps.length * 76 + 94
        : receipt.kind === "equation-balance"
          ? receipt.equationKind === "fractional-linear"
            ? 390 + Math.max(0, Math.ceil(receipt.rationalExclusions.length / 4) - 1) * 48
            : 250
          : 250;
  return (
    <VisualShell
      receipt={receipt}
      summary={summary}
      viewBoxHeight={viewBoxHeight}
    >
      {children}
    </VisualShell>
  );
}
