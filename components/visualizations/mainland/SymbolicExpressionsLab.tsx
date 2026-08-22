"use client";

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { LocalizedText } from "../../../types";
import { useSettings } from "../../providers/AppProviders";
import {
  SYMBOLIC_EXPRESSIONS_LAB_IDS,
  SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST,
  buildSymbolicExpressionsModel,
  type SymbolicExpressionsLabId,
  type SymbolicInvariantId,
  type SymbolicExpressionsMode,
  type SymbolicExpressionsModel,
} from "./SymbolicExpressionsModel";
import {
  SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT,
  SymbolicExpressionsControlDomainError,
  auditSymbolicExpressionsControlTransition,
  buildSymbolicExpressionsScenarioInput,
  createSymbolicExpressionsControlDomainState,
  planSymbolicExpressionsControlTransition,
  symbolicExpressionsControlDescriptorFor,
  type SymbolicExpressionsControlDomainErrorCode,
  type SymbolicExpressionsControlDomainRequest,
  type SymbolicExpressionsControlDomainState,
  type SymbolicExpressionsControlProjection,
  type SymbolicExpressionsControlTransitionReceipt,
  type SymbolicExpressionsScenarioControlId,
} from "./SymbolicExpressionsControlDomain";
import { SymbolicExpressionsVisualModel } from "./SymbolicExpressionsVisualModel";
import {
  createMainlandPhysicalCommitHandlers,
  type MainlandPhysicalCommitRecorder,
} from "./MainlandPhysicalCommitAnalytics";

export const MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS =
  SYMBOLIC_EXPRESSIONS_LAB_IDS;

const MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_ID_SET = new Set<string>(
  MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_IDS,
);

export function isMainlandSymbolicExpressionsLabId(
  labId: string,
): labId is SymbolicExpressionsLabId {
  return MAINLAND_SYMBOLIC_EXPRESSIONS_LAB_ID_SET.has(labId);
}

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const SYMBOLIC_EXPRESSIONS_COPY = {
  eyebrow: localized(
    "Exact symbolic reasoning lab",
    "精確代數推理實驗",
    "精确代数推理实验",
  ),
  goal: localized(
    "Change one finite scenario value, then verify the equation and diagram from the same exact model.",
    "改變一個有限情境數值，再用同一個精確模型核對等式與圖形。",
    "改变一个有限情境数值，再用同一个精确模型核对等式与图形。",
  ),
  panHint: localized(
    "On a narrow screen, scroll inside this laboratory surface to see every step.",
    "在較窄螢幕上，可在實驗區內橫向捲動以查看所有步驟。",
    "在较窄屏幕上，可在实验区内横向滚动以查看所有步骤。",
  ),
  topicTitles: {
    "bnu-junior-s1-upper-algebraic-expressions": localized(
      "Algebraic expressions",
      "代數式",
      "代数式",
    ),
    "bnu-junior-s2-lower-algebraic-fractions-equations": localized(
      "Algebraic fractions and equations",
      "分式與分式方程",
      "分式与分式方程",
    ),
    "hjb-junior-s1-upper-algebraic-fractions": localized(
      "Algebraic fractions",
      "分式",
      "分式",
    ),
    "hjb-junior-s1-upper-polynomial-add-subtract": localized(
      "Polynomial addition and subtraction",
      "整式加減",
      "整式加减",
    ),
    "hjb-primary-p6-lower-simple-algebraic-expressions": localized(
      "Simple algebraic expressions",
      "簡單代數式",
      "简单代数式",
    ),
    "pep-junior-s1-upper-expressions-linear-equations": localized(
      "Expressions and linear equations",
      "整式與一元一次方程",
      "整式与一元一次方程",
    ),
    "pep-junior-s2-upper-polynomials-fractions": localized(
      "Products, factors, and algebraic fractions",
      "整式乘法、因式分解與分式",
      "整式乘法、因式分解与分式",
    ),
  },
  modes: {
    add: localized("Add polynomials", "整式相加", "整式相加"),
    "collect-like-terms": localized("Collect like terms", "合併同類項", "合并同类项"),
    expand: localized("Expand a product", "展開乘積", "展开乘积"),
    factor: localized("Factor a polynomial", "因式分解", "因式分解"),
    "fraction-simplify": localized("Simplify a fraction", "分式約分", "分式约分"),
    solve: localized("Solve and check", "求解並驗證", "求解并验证"),
    substitute: localized("Substitute a value", "代入求值", "代入求值"),
    subtract: localized("Subtract polynomials", "整式相減", "整式相减"),
  },
  controlsHeading: localized(
    "Try another exact scenario",
    "試算另一個精確情境",
    "试算另一个精确情境",
  ),
  controls: {
    "candidate-denominator": localized("Candidate denominator", "候選值分母", "候选值分母"),
    "candidate-numerator": localized("Candidate numerator", "候選值分子", "候选值分子"),
    "coefficient-a": localized("First coefficient", "第一個係數", "第一个系数"),
    "coefficient-b": localized("Second coefficient", "第二個係數", "第二个系数"),
    "coefficient-c": localized("Third coefficient", "第三個係數", "第三个系数"),
    "coefficient-d": localized("Fourth coefficient", "第四個係數", "第四个系数"),
    "constant-a": localized("First constant", "第一個常數", "第一个常数"),
    "constant-b": localized("Second constant", "第二個常數", "第二个常数"),
    "domain-denominator": localized("Test-value denominator", "檢驗值分母", "检验值分母"),
    "domain-numerator": localized("Test-value numerator", "檢驗值分子", "检验值分子"),
    "excluded-root": localized("Excluded denominator root", "分母禁值", "分母禁值"),
    "value-denominator": localized("Substitution denominator", "代入值分母", "代入值分母"),
    "value-numerator": localized("Substitution numerator", "代入值分子", "代入值分子"),
  },
  equation: localized(
    "Equation reconstructed from the exact receipt",
    "由精確收據重構的等式",
    "由精确收据重构的等式",
  ),
  invariantHeading: localized(
    "Checks for this mode",
    "本模式的核對項目",
    "本模式的核对项目",
  ),
  invariantLabels: {
    "algebraic-fraction-domain": localized(
      "Original denominator restrictions",
      "原分母限制",
      "原分母限制",
    ),
    "algebraic-fraction-equivalence": localized(
      "Fraction equivalence",
      "分式等價",
      "分式等价",
    ),
    "equation-substitution-residual": localized(
      "Substitution check",
      "代入核對",
      "代入核对",
    ),
    "like-term-coefficient-conservation": localized(
      "Like-term coefficient conservation",
      "同類項係數守恆",
      "同类项系数守恒",
    ),
    "polynomial-expansion": localized(
      "Full coefficient reconstruction",
      "完整係數重構",
      "完整系数重构",
    ),
    "polynomial-visible-tiles": localized(
      "Visible algebra tiles",
      "可見代數方塊",
      "可见代数方块",
    ),
  } satisfies Record<SymbolicInvariantId, LocalizedText>,
  invariantStatus: {
    failed: localized("Needs correction", "需要修正", "需要修正"),
    "not-applicable": localized(
      "Not used in this mode",
      "本模式不使用",
      "本模式不使用",
    ),
    passed: localized("Checked", "已核對", "已核对"),
  },
  rejection: localized(
    "That value does not define a valid state for this exact scenario.",
    "該數值不能構成這個精確情境的有效狀態。",
    "该数值不能构成这个精确情境的有效状态。",
  ),
  reset: localized(
    "Reset symbolic model",
    "重設代數模型",
    "重置代数模型",
  ),
} as const;

export type SymbolicExpressionsLabRejection =
  SymbolicExpressionsControlDomainErrorCode;

export type SymbolicExpressionsLabUiState = Readonly<{
  domainState: SymbolicExpressionsControlDomainState;
  lastRejection: SymbolicExpressionsLabRejection | null;
  receipt: SymbolicExpressionsLabTransitionReceipt;
}>;

export type SymbolicExpressionsLabTransitionReceipt = Readonly<{
  accepted: boolean;
  domainId: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id;
  domainVersion: typeof SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version;
  error: Readonly<{
    causeCode: string | null;
    code: SymbolicExpressionsLabRejection;
  }> | null;
  expected: SymbolicExpressionsControlDomainState;
  matchesExpected: boolean;
  observed: SymbolicExpressionsControlDomainState;
  projections: readonly SymbolicExpressionsControlProjection[];
  request: SymbolicExpressionsControlDomainRequest;
  requested: SymbolicExpressionsControlDomainState;
}>;

export type SymbolicExpressionsLabProps = {
  controlFooterAction?: ReactNode;
  initialState?: SymbolicExpressionsControlDomainState;
  labId: string;
  onLearningEvent?: MainlandPhysicalCommitRecorder;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function allowedModesForLab(labId: SymbolicExpressionsLabId) {
  return SYMBOLIC_EXPRESSIONS_MODE_ALLOWLIST[
    labId
  ] as readonly SymbolicExpressionsMode[];
}

function transitionReceiptForState(
  state: SymbolicExpressionsControlDomainState,
): SymbolicExpressionsLabTransitionReceipt {
  const request = {
    controllerId: "mode" as const,
    kind: "controller" as const,
    value: state.mode,
  };
  const plan = planSymbolicExpressionsControlTransition(state, {
    ...request,
  });
  return acceptedLabReceipt(
    auditSymbolicExpressionsControlTransition(plan, plan.expected),
    request,
  );
}

function acceptedLabReceipt(
  receipt: SymbolicExpressionsControlTransitionReceipt,
  request: SymbolicExpressionsControlDomainRequest,
): SymbolicExpressionsLabTransitionReceipt {
  return {
    accepted: true,
    domainId: receipt.domainId,
    domainVersion: receipt.domainVersion,
    error: null,
    expected: receipt.expected,
    matchesExpected: receipt.matchesExpected,
    observed: receipt.observed,
    projections: receipt.projections,
    request,
    requested: receipt.requested,
  };
}

function rejectedRequestedState(
  current: SymbolicExpressionsControlDomainState,
  request: Exclude<SymbolicExpressionsControlDomainRequest, { kind: "reset" }>,
): SymbolicExpressionsControlDomainState {
  if (request.kind === "controller") {
    return { ...current, mode: request.value };
  }
  const keys: Record<
    SymbolicExpressionsScenarioControlId,
    keyof SymbolicExpressionsControlDomainState
  > = {
    "candidate-denominator": "candidateDenominator",
    "candidate-numerator": "candidateNumerator",
    "coefficient-a": "coefficientA",
    "coefficient-b": "coefficientB",
    "coefficient-c": "coefficientC",
    "coefficient-d": "coefficientD",
    "constant-a": "constantA",
    "constant-b": "constantB",
    "domain-denominator": "domainDenominator",
    "domain-numerator": "domainNumerator",
    "excluded-root": "excludedRoot",
    "value-denominator": "valueDenominator",
    "value-numerator": "valueNumerator",
  };
  return {
    ...current,
    [keys[request.controlId]]: request.value,
  };
}

export function createSymbolicExpressionsLabUiState(
  labId: SymbolicExpressionsLabId,
  initialState: SymbolicExpressionsControlDomainState =
    createSymbolicExpressionsControlDomainState(labId),
): SymbolicExpressionsLabUiState {
  if (
    initialState.labId !== labId ||
    !allowedModesForLab(labId).includes(initialState.mode)
  ) {
    throw new SymbolicExpressionsControlDomainError(
      "INVALID_STATE",
      "The initial symbolic state does not belong to this topic allowlist.",
    );
  }
  buildSymbolicExpressionsModel(buildSymbolicExpressionsScenarioInput(initialState));
  const receipt = transitionReceiptForState(initialState);
  return deepFreeze({
    domainState: receipt.observed,
    lastRejection: null,
    receipt,
  });
}

export function reduceSymbolicExpressionsLabUiState(
  current: SymbolicExpressionsLabUiState,
  request: SymbolicExpressionsControlDomainRequest,
): SymbolicExpressionsLabUiState {
  if (request.kind === "reset") {
    const reset = createSymbolicExpressionsLabUiState(current.domainState.labId);
    return deepFreeze({
      ...reset,
      receipt: {
        ...reset.receipt,
        request,
      },
    });
  }
  try {
    const plan = planSymbolicExpressionsControlTransition(
      current.domainState,
      request,
    );
    const receipt = auditSymbolicExpressionsControlTransition(
      plan,
      plan.expected,
    );
    buildSymbolicExpressionsModel(
      buildSymbolicExpressionsScenarioInput(receipt.observed),
    );
    return deepFreeze({
      domainState: receipt.observed,
      lastRejection: null,
      receipt: acceptedLabReceipt(receipt, request),
    });
  } catch (error) {
    if (error instanceof SymbolicExpressionsControlDomainError) {
      const receipt: SymbolicExpressionsLabTransitionReceipt = {
        accepted: false,
        domainId: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id,
        domainVersion: SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version,
        error: {
          causeCode: error.causeCode,
          code: error.code,
        },
        expected: current.domainState,
        matchesExpected: false,
        observed: current.domainState,
        projections: [],
        request,
        requested: rejectedRequestedState(current.domainState, request),
      };
      return deepFreeze({
        domainState: current.domainState,
        lastRejection: error.code,
        receipt,
      });
    }
    throw error;
  }
}

function serializeDomainState(state: SymbolicExpressionsControlDomainState) {
  return JSON.stringify({
    candidateDenominator: state.candidateDenominator,
    candidateNumerator: state.candidateNumerator,
    coefficientA: state.coefficientA,
    coefficientB: state.coefficientB,
    coefficientC: state.coefficientC,
    coefficientD: state.coefficientD,
    constantA: state.constantA,
    constantB: state.constantB,
    domainDenominator: state.domainDenominator,
    domainNumerator: state.domainNumerator,
    excludedRoot: state.excludedRoot,
    labId: state.labId,
    mode: state.mode,
    valueDenominator: state.valueDenominator,
    valueNumerator: state.valueNumerator,
  });
}

function controlValue(
  state: SymbolicExpressionsControlDomainState,
  controlId: SymbolicExpressionsScenarioControlId,
) {
  switch (controlId) {
    case "candidate-denominator":
      return state.candidateDenominator;
    case "candidate-numerator":
      return state.candidateNumerator;
    case "coefficient-a":
      return state.coefficientA;
    case "coefficient-b":
      return state.coefficientB;
    case "coefficient-c":
      return state.coefficientC;
    case "coefficient-d":
      return state.coefficientD;
    case "constant-a":
      return state.constantA;
    case "constant-b":
      return state.constantB;
    case "domain-denominator":
      return state.domainDenominator;
    case "domain-numerator":
      return state.domainNumerator;
    case "excluded-root":
      return state.excludedRoot;
    case "value-denominator":
      return state.valueDenominator;
    case "value-numerator":
      return state.valueNumerator;
  }
}

function ScenarioNumberControl({
  controlId,
  label,
  maximum,
  minimum,
  onChange,
  onCommit,
  onKeyCommit,
  value,
}: {
  controlId: SymbolicExpressionsScenarioControlId;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCommit: () => void;
  onKeyCommit: (event: KeyboardEvent<HTMLInputElement>) => void;
  value: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="flex items-center justify-between gap-3 text-xs font-black text-slate-700 dark:text-slate-200">
        <span>{label}</span>
        <output htmlFor={id} className="font-mono text-sm text-sky-700 dark:text-sky-300">
          {value}
        </output>
      </span>
      <input
        id={id}
        type="range"
        data-viz-parameter={controlId}
        min={minimum}
        max={maximum}
        step={1}
        value={value}
        className="focus-ring mt-2 min-h-11 w-full min-w-0 accent-sky-600"
        onChange={onChange}
        onPointerUp={onCommit}
        onKeyUp={onKeyCommit}
      />
    </label>
  );
}

function joinSignedExactTerms(terms: readonly string[]) {
  return terms
    .map((term, index) =>
      index === 0
        ? term
        : term.startsWith("-")
          ? `− ${term.slice(1)}`
          : `+ ${term}`,
    )
    .join(" ");
}

function visibleEquation(model: SymbolicExpressionsModel) {
  const work = model.work;
  if (work.kind === "collect-like-terms") {
    if (model.result.kind !== "polynomial") throw new RangeError("invalid result");
    return `${joinSignedExactTerms(work.sourceTerms.map(({ text }) => text))} → ${model.result.polynomial.text}`;
  }
  if (work.kind === "binary-polynomial") {
    if (model.result.kind !== "polynomial") throw new RangeError("invalid result");
    return `${work.left.text} ${work.operator} (${work.right.text}) = ${model.result.polynomial.text}`;
  }
  if (work.kind === "expansion") {
    if (model.result.kind !== "polynomial") throw new RangeError("invalid result");
    return `(${work.factors[0].text})(${work.factors[1].text}) = ${model.result.polynomial.text}`;
  }
  if (work.kind === "factorization") {
    return `${work.original.text} = (${work.factor.text})(${work.quotient.text})`;
  }
  if (work.kind === "substitution") {
    if (model.result.kind !== "rational") throw new RangeError("invalid result");
    return `${work.polynomial.text}, x = ${work.value.text} ⇒ ${joinSignedExactTerms(work.contributions.map(({ contribution }) => contribution.text))} = ${model.result.value.text}`;
  }
  if (work.kind === "fraction-simplification") {
    return `${work.original.text} = ${work.simplified.text}; ${work.domain.condition}`;
  }
  const candidate = work.candidateCheck
    ? `; x = ${work.candidateCheck.candidate.text} ⇒ L − R = ${work.candidateCheck.residual.text}`
    : "";
  const domain =
    work.equationKind === "fractional-linear"
      ? `; ${work.domain.leftCondition}; ${work.domain.rightCondition}; ${work.domain.rationalExclusions.map(({ text }) => `x ≠ ${text}`).join(", ")}`
      : "";
  return `${work.original.text} ⇒ x = ${work.solution.text}${candidate}${domain}`;
}

function VisibleEquation({
  model,
  t,
}: {
  model: SymbolicExpressionsModel;
  t: (copy: LocalizedText) => string;
}) {
  return (
    <article
      data-viz-visible-equation="true"
      data-viz-visible-receipt={model.work.kind}
      data-viz-equation-kind={
        model.work.kind === "equation-solve"
          ? model.work.equationKind
          : undefined
      }
      className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"
    >
      <h3 className="text-sm font-black text-sky-950 dark:text-sky-100">
        {t(SYMBOLIC_EXPRESSIONS_COPY.equation)}
      </h3>
      <p className="mt-3 break-words font-mono text-lg font-black text-slate-950 dark:text-white sm:text-xl">
        {visibleEquation(model)}
      </p>
      {model.work.kind === "equation-solve" &&
      model.work.equationKind === "fractional-linear" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {model.work.domain.rationalExclusions.map(({ text }) => (
            <span
              key={text}
              data-viz-equation-exclusion={text}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs font-black text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
            >
              x ≠ {text}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function InvariantSummary({
  model,
  t,
}: {
  model: SymbolicExpressionsModel;
  t: (copy: LocalizedText) => string;
}) {
  return (
    <section
      data-viz-invariant-summary="true"
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
    >
      <h3 className="text-sm font-black text-slate-950 dark:text-white">
        {t(SYMBOLIC_EXPRESSIONS_COPY.invariantHeading)}
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {model.invariantReceipts.map((receipt) => {
          const neutral = receipt.status === "not-applicable";
          const failed = receipt.status === "failed";
          return (
            <li
              key={receipt.id}
              data-viz-invariant-id={receipt.id}
              data-viz-invariant-status={receipt.status}
              data-viz-invariant-applicable={String(receipt.applicable)}
              data-viz-invariant-holds={
                receipt.holds === null ? undefined : String(receipt.holds)
              }
              className={
                neutral
                  ? "rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  : failed
                    ? "rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
                    : "rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
              }
            >
              <span className="block text-xs font-black">
                {t(SYMBOLIC_EXPRESSIONS_COPY.invariantLabels[receipt.id])}
              </span>
              <span className="mt-1 block text-xs font-bold">
                {t(SYMBOLIC_EXPRESSIONS_COPY.invariantStatus[receipt.status])}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function checkedInitialState(
  labId: SymbolicExpressionsLabId,
  initialState: SymbolicExpressionsControlDomainState | undefined,
) {
  const candidate =
    initialState ?? createSymbolicExpressionsControlDomainState(labId);
  try {
    createSymbolicExpressionsLabUiState(labId, candidate);
    return candidate;
  } catch {
    return null;
  }
}

function AllowedSymbolicExpressionsLab({
  controlFooterAction,
  initialState,
  labId,
  onLearningEvent,
}: {
  controlFooterAction?: ReactNode;
  initialState: SymbolicExpressionsControlDomainState;
  labId: SymbolicExpressionsLabId;
  onLearningEvent?: MainlandPhysicalCommitRecorder;
}) {
  const { t } = useSettings();
  const [uiState, setUiState] = useState<SymbolicExpressionsLabUiState>(() =>
    createSymbolicExpressionsLabUiState(labId, initialState),
  );
  const { domainState, receipt } = uiState;
  const model = useMemo(
    () =>
      buildSymbolicExpressionsModel(
        buildSymbolicExpressionsScenarioInput(domainState),
      ),
    [domainState],
  );
  const descriptor = symbolicExpressionsControlDescriptorFor(
    labId,
    domainState.mode,
  );
  const {
    recordModeCommit,
    recordRangeCommit,
    recordRangeKeyCommit,
    recordResetCommit,
  } = createMainlandPhysicalCommitHandlers(onLearningEvent);

  function dispatch(request: SymbolicExpressionsControlDomainRequest) {
    setUiState((current) =>
      reduceSymbolicExpressionsLabUiState(current, request),
    );
  }

  function updateControl(
    controlId: SymbolicExpressionsScenarioControlId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    dispatch({
      controlId,
      kind: "control",
      value: Number(event.currentTarget.value),
    });
  }

  function selectMode(mode: SymbolicExpressionsMode) {
    dispatch({
      controllerId: "mode",
      kind: "controller",
      value: mode,
    });
    recordModeCommit();
  }

  function reset() {
    dispatch({ kind: "reset" });
    recordResetCommit();
  }

  return (
    <section
      data-mainland-symbolic-expressions="true"
      data-viz-topic-id={labId}
      data-viz-family={model.family}
      data-viz-model={model.version}
      data-viz-configured-model={model.version}
      data-viz-configured-state={serializeDomainState(domainState)}
      data-viz-state={serializeDomainState(domainState)}
      data-viz-mode={model.mode}
      data-viz-range-domain-id={SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.id}
      data-viz-domain-version={SYMBOLIC_EXPRESSIONS_CONTROL_DOMAIN_CONTRACT.version}
      data-viz-domain-accepted={String(receipt.accepted)}
      data-viz-domain-request={JSON.stringify(receipt.request)}
      data-viz-domain-requested={serializeDomainState(receipt.requested)}
      data-viz-domain-expected={serializeDomainState(receipt.expected)}
      data-viz-domain-observed={serializeDomainState(receipt.observed)}
      data-viz-domain-match={String(receipt.matchesExpected)}
      data-viz-domain-projection-count={receipt.projections.length}
      data-viz-domain-projection-reasons={receipt.projections
        .map(({ reason }) => reason)
        .join(",")}
      data-viz-domain-rejection={uiState.lastRejection ?? undefined}
      data-viz-domain-error={receipt.error?.code}
      data-viz-domain-cause={receipt.error?.causeCode ?? undefined}
      className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-3 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-5"
    >
      <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          {t(SYMBOLIC_EXPRESSIONS_COPY.eyebrow)}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
          {t(SYMBOLIC_EXPRESSIONS_COPY.topicTitles[labId])}
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {t(SYMBOLIC_EXPRESSIONS_COPY.goal)}
        </p>
      </header>

      <p data-viz-pan-hint="true" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        {t(SYMBOLIC_EXPRESSIONS_COPY.panHint)}
      </p>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div data-viz-local-scroll="horizontal" tabIndex={0} className="min-w-0 overflow-x-auto rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <div className="grid min-w-[44rem] gap-4">
            <nav className="grid grid-cols-2 gap-2 md:grid-cols-3" aria-label={t(SYMBOLIC_EXPRESSIONS_COPY.topicTitles[labId])}>
              {allowedModesForLab(labId).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-viz-mode-button="true"
                  data-viz-mode={mode}
                  aria-pressed={domainState.mode === mode}
                  className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  onClick={() => selectMode(mode)}
                >
                  {t(SYMBOLIC_EXPRESSIONS_COPY.modes[mode])}
                </button>
              ))}
            </nav>

            <VisibleEquation model={model} t={t} />
            <SymbolicExpressionsVisualModel model={model} t={t} />
            <InvariantSummary model={model} t={t} />
          </div>
        </div>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {t(SYMBOLIC_EXPRESSIONS_COPY.controlsHeading)}
          </h3>
          <div className="mt-3 grid gap-3">
            {descriptor.controls.map((control) => (
              <ScenarioNumberControl
                key={control.controlId}
                controlId={control.controlId}
                label={t(SYMBOLIC_EXPRESSIONS_COPY.controls[control.controlId])}
                maximum={control.max}
                minimum={control.min}
                onChange={(event) => updateControl(control.controlId, event)}
                onCommit={recordRangeCommit}
                onKeyCommit={(event) => recordRangeKeyCommit(event.key, event)}
                value={controlValue(domainState, control.controlId)}
              />
            ))}

            {uiState.lastRejection ? (
              <p role="status" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
                {t(SYMBOLIC_EXPRESSIONS_COPY.rejection)}
              </p>
            ) : null}

            <button
              type="button"
              data-viz-reset-model="true"
              data-viz-reset-module-id="configured-visualization-lab"
              data-viz-reset-topic-id={labId}
              className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              onClick={reset}
            >
              {t(SYMBOLIC_EXPRESSIONS_COPY.reset)}
            </button>

            {controlFooterAction ? (
              <div data-viz-lesson-action-slot>{controlFooterAction}</div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function SymbolicExpressionsLab(props: SymbolicExpressionsLabProps) {
  if (!isMainlandSymbolicExpressionsLabId(props.labId)) return null;
  const initialState = checkedInitialState(props.labId, props.initialState);
  if (!initialState) return null;
  return (
    <AllowedSymbolicExpressionsLab
      key={props.labId}
      controlFooterAction={props.controlFooterAction}
      initialState={initialState}
      labId={props.labId}
      onLearningEvent={props.onLearningEvent}
    />
  );
}
