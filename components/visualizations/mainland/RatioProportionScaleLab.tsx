"use client";

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type { LocalizedText } from "../../../types";
import { useSettings } from "../../providers/AppProviders";
import {
  RATIO_PROPORTION_SCALE_LAB_ID,
  RATIO_PROPORTION_SCALE_MODEL_CONTRACT,
  RATIO_PROPORTION_SCALE_MODES,
  buildRatioProportionScaleState,
  type RatioProportionScaleInput,
  type RatioProportionScaleMode,
  type RatioProportionScaleState,
  type RatioProportionScaleUnit,
} from "./RatioProportionScaleModel";
import {
  RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT,
  RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT,
  RatioProportionScaleControlDomainError,
  auditRatioProportionScaleControlTransition,
  createRatioProportionScaleAcceptedActionReceipt,
  createRatioProportionScaleControlDomainState,
  createRatioProportionScaleRejectedActionReceipt,
  getRatioProportionScaleControlDomainDescriptor,
  planRatioProportionScaleControlTransition,
  type RatioProportionScaleActionReceipt,
  type RatioProportionScaleControlDomainErrorCode,
  type RatioProportionScaleControlDomainRequest,
  type RatioProportionScaleControlDomainState,
  type RatioProportionScaleControlTransitionReceipt,
  type RatioProportionScaleNumericControlId,
  type RatioProportionScaleUnitControlId,
} from "./RatioProportionScaleControlDomain";
import { RatioProportionScaleVisualModel } from "./RatioProportionScaleVisualModel";

export const MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS = deepFreeze([
  RATIO_PROPORTION_SCALE_LAB_ID,
] as const);

const MAINLAND_RATIO_PROPORTION_SCALE_LAB_ID_SET = new Set<string>(
  MAINLAND_RATIO_PROPORTION_SCALE_LAB_IDS,
);

export function isMainlandRatioProportionScaleLabId(
  labId: string,
): labId is typeof RATIO_PROPORTION_SCALE_LAB_ID {
  return MAINLAND_RATIO_PROPORTION_SCALE_LAB_ID_SET.has(labId);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const RATIO_PROPORTION_SCALE_COPY = {
  controls: {
    actualUnit: localized("Actual unit", "實際單位", "实际单位"),
    drawingLength: localized("Drawing length", "圖上長度", "图上长度"),
    drawingUnit: localized("Drawing unit", "圖上單位", "图上单位"),
    ratioA: localized("First quantity", "第一項", "第一项"),
    ratioB: localized("Second quantity", "第二項", "第二项"),
    scaleFactor: localized("Scale factor", "縮放倍數", "缩放倍数"),
  },
  controlsHeading: localized(
    "Try another exact state",
    "試算另一個精確狀態",
    "试算另一个精确状态",
  ),
  equation: localized(
    "Exact visible relationship",
    "可見的精確關係",
    "可见的精确关系",
  ),
  eyebrow: localized(
    "Exact ratio and scale lab",
    "精確比與比例尺實驗",
    "精确比与比例尺实验",
  ),
  goal: localized(
    "Change one quantity, then use the equation and the diagram together to verify what stays invariant.",
    "改變一個數量，再用等式和圖形一起驗證哪個關係保持不變。",
    "改变一个数量，再用等式和图形一起验证哪个关系保持不变。",
  ),
  modes: {
    "direct-proportion": localized("Direct proportion", "正比例", "正比例"),
    "equivalent-ratios": localized("Equivalent ratios", "等值比", "等值比"),
    "inverse-proportion": localized("Inverse proportion", "反比例", "反比例"),
    "scale-drawing": localized("Scale drawing", "比例圖", "比例图"),
  },
  panHint: localized(
    "On a narrow screen, scroll inside the laboratory surface to see every control.",
    "在較窄螢幕上，可在實驗區內橫向捲動以查看全部控制項。",
    "在较窄屏幕上，可在实验区内横向滚动以查看全部控件。",
  ),
  reset: localized(
    "Reset ratio and scale model",
    "重設比與比例尺模型",
    "重置比与比例尺模型",
  ),
  title: localized(
    "See the invariant in ratios and scale drawings",
    "看清比與比例圖中的不變關係",
    "看清比与比例图中的不变关系",
  ),
  topicTitle: localized(
    "Ratios, proportions, and scale drawings",
    "比、正反比例與比例圖",
    "比、正反比例与比例图",
  ),
} as const;

export type RatioProportionScaleLabUiState = Readonly<{
  actionReceipt: RatioProportionScaleActionReceipt;
  domainState: RatioProportionScaleControlDomainState;
  lastRejection: RatioProportionScaleControlDomainErrorCode | null;
  receipt: RatioProportionScaleControlTransitionReceipt;
}>;

export type RatioProportionScaleLabProps = {
  controlFooterAction?: ReactNode;
  initialInput?: RatioProportionScaleInput;
  labId: string;
};

function inputFromDomainState(
  state: RatioProportionScaleControlDomainState,
): RatioProportionScaleInput {
  return {
    actualUnit: state.actualUnit,
    drawingLength: state.drawingLength,
    drawingUnit: state.drawingUnit,
    labId: state.labId,
    mode: state.mode,
    ratioA: state.ratioA,
    ratioB: state.ratioB,
    scaleFactor: state.scaleFactor,
  };
}

function domainStateFromInput(
  input: RatioProportionScaleInput,
): RatioProportionScaleControlDomainState {
  return {
    actualUnit: input.actualUnit,
    drawingLength: input.drawingLength,
    drawingUnit: input.drawingUnit,
    labId: input.labId,
    mode: input.mode,
    ratioA: input.ratioA,
    ratioB: input.ratioB,
    scaleFactor: input.scaleFactor,
  };
}

function transitionReceiptForState(
  state: RatioProportionScaleControlDomainState,
) {
  const plan = planRatioProportionScaleControlTransition(state, {
    controllerId: "mode",
    kind: "controller",
    value: state.mode,
  });
  return auditRatioProportionScaleControlTransition(plan, plan.expected);
}

function acceptedActionReceipt(
  before: RatioProportionScaleControlDomainState,
  receipt: RatioProportionScaleControlTransitionReceipt,
) {
  return createRatioProportionScaleAcceptedActionReceipt({
    before,
    expected: receipt.expected,
    observed: receipt.observed,
    projections: receipt.projections,
    request: receipt.request,
    requested: receipt.requested,
  });
}

export function resetRatioProportionScaleLabInput(
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID,
): RatioProportionScaleInput {
  const state = createRatioProportionScaleControlDomainState(
    labId,
    "equivalent-ratios",
  );
  return deepFreeze(inputFromDomainState(state));
}

export function createRatioProportionScaleLabUiState(
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID,
  initialInput: RatioProportionScaleInput =
    resetRatioProportionScaleLabInput(labId),
): RatioProportionScaleLabUiState {
  if (initialInput.labId !== labId) {
    throw new RatioProportionScaleControlDomainError(
      "INVALID_STATE",
      "The initial ratio/proportion/scale state does not belong to this topic.",
    );
  }
  buildRatioProportionScaleState(initialInput);
  const domainState = domainStateFromInput(initialInput);
  const receipt = transitionReceiptForState(domainState);
  return deepFreeze({
    actionReceipt: createRatioProportionScaleAcceptedActionReceipt({
      before: domainState,
      expected: receipt.expected,
      observed: receipt.observed,
      projections: receipt.projections,
      request: { kind: "initial" },
      requested: receipt.requested,
    }),
    domainState: receipt.observed,
    lastRejection: null,
    receipt,
  });
}

export function reduceRatioProportionScaleLabUiState(
  current: RatioProportionScaleLabUiState,
  request: RatioProportionScaleControlDomainRequest,
): RatioProportionScaleLabUiState {
  if (request.kind === "reset") {
    const reset = createRatioProportionScaleLabUiState(current.domainState.labId);
    return deepFreeze({
      ...reset,
      actionReceipt: createRatioProportionScaleAcceptedActionReceipt({
        before: current.domainState,
        expected: reset.domainState,
        observed: reset.domainState,
        projections: [],
        request,
        requested: reset.domainState,
      }),
    });
  }
  try {
    const plan = planRatioProportionScaleControlTransition(
      current.domainState,
      request,
    );
    const receipt = auditRatioProportionScaleControlTransition(
      plan,
      plan.expected,
    );
    buildRatioProportionScaleState(inputFromDomainState(receipt.observed));
    return deepFreeze({
      actionReceipt: acceptedActionReceipt(current.domainState, receipt),
      domainState: receipt.observed,
      lastRejection: null,
      receipt,
    });
  } catch (error) {
    if (error instanceof RatioProportionScaleControlDomainError) {
      return deepFreeze({
        ...current,
        actionReceipt: createRatioProportionScaleRejectedActionReceipt({
          before: current.domainState,
          rejection: error.code,
          request,
        }),
        lastRejection: error.code,
      });
    }
    throw error;
  }
}

function serializeDomainState(state: RatioProportionScaleControlDomainState) {
  return JSON.stringify({
    actualUnit: state.actualUnit,
    drawingLength: state.drawingLength,
    drawingUnit: state.drawingUnit,
    labId: state.labId,
    mode: state.mode,
    ratioA: state.ratioA,
    ratioB: state.ratioB,
    scaleFactor: state.scaleFactor,
  });
}

function RangeControl({
  controlId,
  label,
  maximum,
  minimum,
  onChange,
  value,
}: {
  controlId: RatioProportionScaleNumericControlId;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: number;
}) {
  const id = useId();
  return (
    <label
      className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
      htmlFor={id}
    >
      <span className="flex items-center justify-between gap-3 text-xs font-black text-slate-700 dark:text-slate-200">
        <span>{label}</span>
        <output className="font-mono text-sm text-sky-700 dark:text-sky-300" htmlFor={id}>
          {value}
        </output>
      </span>
      <input
        data-viz-control-kind="range"
        data-viz-parameter={controlId}
        id={id}
        max={maximum}
        min={minimum}
        onChange={onChange}
        step={1}
        type="range"
        value={value}
        className="focus-ring mt-2 min-h-11 w-full min-w-0 accent-sky-600"
      />
    </label>
  );
}

function UnitControl({
  controlId,
  label,
  onChange,
  options,
  value,
}: {
  controlId: RatioProportionScaleUnitControlId;
  label: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly RatioProportionScaleUnit[];
  value: RatioProportionScaleUnit;
}) {
  const id = useId();
  return (
    <label
      className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
      htmlFor={id}
    >
      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <select
        data-viz-control-kind="unit"
        data-viz-parameter={controlId}
        id={id}
        onChange={onChange}
        value={value}
        className="focus-ring mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      >
        {options.map((unit) => (
          <option
            data-viz-unit-option={`${controlId}:${unit}`}
            key={unit}
            value={unit}
          >
            {unit}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisibleEquation({
  model,
  t,
}: {
  model: RatioProportionScaleState;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = model.visibleReceipt;
  let equation: string;
  switch (receipt.kind) {
    case "equivalent-ratios":
      equation = `${receipt.firstRatio.antecedent.text} : ${receipt.firstRatio.consequent.text} = ${receipt.secondRatio.antecedent.text} : ${receipt.secondRatio.consequent.text}; ${receipt.crossProducts.firstASecondB.text} = ${receipt.crossProducts.firstBSecondA.text}`;
      break;
    case "direct-proportion":
      equation = `(${receipt.firstPair.independent.text}, ${receipt.firstPair.dependent.text}) → (${receipt.secondPair.independent.text}, ${receipt.secondPair.dependent.text}); k = ${receipt.constantK.first.text}`;
      break;
    case "inverse-proportion":
      equation = `${receipt.firstPair.first.text} × ${receipt.firstPair.second.text} = ${receipt.secondPair.first.text} × ${receipt.secondPair.second.text} = ${receipt.constantProductK.first.text}`;
      break;
    case "scale-drawing":
      equation = `${receipt.drawingDimension.length.text} ${receipt.drawingDimension.unit} × ${receipt.scaleFactor.text} = ${receipt.actualInDrawingUnits.length.text} ${receipt.actualInDrawingUnits.unit} = ${receipt.actualDimension.length.text} ${receipt.actualDimension.unit}`;
      break;
  }
  return (
    <article
      className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"
      data-viz-visible-equation="true"
      data-viz-visible-receipt={receipt.kind}
    >
      <h3 className="text-sm font-black text-sky-950 dark:text-sky-100">
        {t(RATIO_PROPORTION_SCALE_COPY.equation)}
      </h3>
      <p className="mt-3 break-words font-mono text-xl font-black text-slate-950 dark:text-white">
        {equation}
      </p>
    </article>
  );
}

function checkedInitialInput(
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID,
  initialInput: RatioProportionScaleInput | undefined,
) {
  const candidate = initialInput ?? resetRatioProportionScaleLabInput(labId);
  try {
    createRatioProportionScaleLabUiState(labId, candidate);
    return candidate;
  } catch {
    return null;
  }
}

function AllowedRatioProportionScaleLab({
  controlFooterAction,
  initialInput,
  labId,
}: {
  controlFooterAction?: ReactNode;
  initialInput: RatioProportionScaleInput;
  labId: typeof RATIO_PROPORTION_SCALE_LAB_ID;
}) {
  const { t } = useSettings();
  const [uiState, setUiState] = useState<RatioProportionScaleLabUiState>(() =>
    createRatioProportionScaleLabUiState(labId, initialInput),
  );
  const { actionReceipt, domainState, receipt } = uiState;
  const modelInput = useMemo(
    () => inputFromDomainState(domainState),
    [domainState],
  );
  const model = useMemo(
    () => buildRatioProportionScaleState(modelInput),
    [modelInput],
  );
  const descriptor = getRatioProportionScaleControlDomainDescriptor(
    labId,
    domainState.mode,
  );

  function dispatch(request: RatioProportionScaleControlDomainRequest) {
    setUiState((current) =>
      reduceRatioProportionScaleLabUiState(current, request),
    );
  }

  const numericControls = Object.keys(
    descriptor.numericDomains,
  ) as RatioProportionScaleNumericControlId[];
  const unitControls = Object.keys(
    descriptor.unitDomains,
  ) as RatioProportionScaleUnitControlId[];

  function numericValue(controlId: RatioProportionScaleNumericControlId) {
    if (controlId === "ratio-a") return domainState.ratioA;
    if (controlId === "ratio-b") return domainState.ratioB;
    if (controlId === "scale-factor") return domainState.scaleFactor;
    return domainState.drawingLength;
  }

  function numericLabel(controlId: RatioProportionScaleNumericControlId) {
    if (controlId === "ratio-a") {
      return t(RATIO_PROPORTION_SCALE_COPY.controls.ratioA);
    }
    if (controlId === "ratio-b") {
      return t(RATIO_PROPORTION_SCALE_COPY.controls.ratioB);
    }
    if (controlId === "scale-factor") {
      return t(RATIO_PROPORTION_SCALE_COPY.controls.scaleFactor);
    }
    return t(RATIO_PROPORTION_SCALE_COPY.controls.drawingLength);
  }

  return (
    <section
      className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-3 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-5"
      data-mainland-ratio-proportion-scale="true"
      data-viz-configured-model={RATIO_PROPORTION_SCALE_MODEL_CONTRACT.version}
      data-viz-configured-state={serializeDomainState(domainState)}
      data-viz-action-before={JSON.stringify(actionReceipt.before)}
      data-viz-action-expected={JSON.stringify(actionReceipt.expected)}
      data-viz-action-observed={JSON.stringify(actionReceipt.observed)}
      data-viz-action-projections={JSON.stringify(actionReceipt.projections)}
      data-viz-action-receipt={JSON.stringify(actionReceipt)}
      data-viz-action-receipt-version={
        RATIO_PROPORTION_SCALE_ACTION_RECEIPT_CONTRACT.id
      }
      data-viz-action-rejection={actionReceipt.rejection ?? "none"}
      data-viz-action-request={JSON.stringify(actionReceipt.request)}
      data-viz-action-requested={JSON.stringify(actionReceipt.requested)}
      data-viz-action-status={actionReceipt.status}
      data-viz-domain-contract-id={
        RATIO_PROPORTION_SCALE_CONTROL_DOMAIN_CONTRACT.id
      }
      data-viz-domain-expected={serializeDomainState(receipt.expected)}
      data-viz-domain-match={String(receipt.matchesExpected)}
      data-viz-domain-observed={serializeDomainState(receipt.observed)}
      data-viz-domain-projection-count={receipt.projections.length}
      data-viz-domain-rejection={uiState.lastRejection ?? undefined}
      data-viz-domain-requested={serializeDomainState(receipt.requested)}
      data-viz-domain-version={descriptor.domainVersion}
      data-viz-family={model.family}
      data-viz-mode={model.mode}
      data-viz-model={model.version}
      data-viz-range-domain-id={descriptor.domainId}
      data-viz-state={serializeDomainState(domainState)}
      data-viz-topic-id={labId}
    >
      <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          {t(RATIO_PROPORTION_SCALE_COPY.eyebrow)}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
          {t(RATIO_PROPORTION_SCALE_COPY.topicTitle)}
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {t(RATIO_PROPORTION_SCALE_COPY.goal)}
        </p>
      </header>

      <p
        className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        data-viz-pan-hint="true"
      >
        {t(RATIO_PROPORTION_SCALE_COPY.panHint)}
      </p>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div
          className="min-w-0 overflow-x-auto rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          data-viz-local-scroll="horizontal"
          tabIndex={0}
        >
          <div className="grid min-w-[38rem] gap-4">
            <nav
              aria-label={t(RATIO_PROPORTION_SCALE_COPY.title)}
              className="grid grid-cols-2 gap-2 md:grid-cols-4"
            >
              {RATIO_PROPORTION_SCALE_MODES.map((mode) => (
                <button
                  aria-pressed={domainState.mode === mode}
                  data-viz-mode-button="true"
                  data-viz-mode={mode}
                  className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  key={mode}
                  onClick={() =>
                    dispatch({
                      controllerId: "mode",
                      kind: "controller",
                      value: mode,
                    })
                  }
                  type="button"
                >
                  {t(RATIO_PROPORTION_SCALE_COPY.modes[mode])}
                </button>
              ))}
            </nav>
            <VisibleEquation model={model} t={t} />
            <RatioProportionScaleVisualModel model={model} t={t} />
          </div>
        </div>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {t(RATIO_PROPORTION_SCALE_COPY.controlsHeading)}
          </h3>
          <div className="mt-3 grid gap-3">
            {numericControls.map((controlId) => {
              const domain = descriptor.numericDomains[controlId];
              if (!domain) return null;
              return (
                <RangeControl
                  controlId={controlId}
                  key={controlId}
                  label={numericLabel(controlId)}
                  maximum={domain.max}
                  minimum={domain.min}
                  onChange={(event) =>
                    dispatch({
                      controlId,
                      kind: "control",
                      value: Number(event.currentTarget.value),
                    })
                  }
                  value={numericValue(controlId)}
                />
              );
            })}

            {unitControls.map((controlId) => {
              const domain = descriptor.unitDomains[controlId];
              if (!domain) return null;
              const value =
                controlId === "drawing-unit"
                  ? domainState.drawingUnit
                  : domainState.actualUnit;
              const label =
                controlId === "drawing-unit"
                  ? t(RATIO_PROPORTION_SCALE_COPY.controls.drawingUnit)
                  : t(RATIO_PROPORTION_SCALE_COPY.controls.actualUnit);
              return (
                <UnitControl
                  controlId={controlId}
                  key={controlId}
                  label={label}
                  onChange={(event) =>
                    dispatch({
                      controllerId: controlId,
                      kind: "controller",
                      value: event.currentTarget
                        .value as RatioProportionScaleUnit,
                    })
                  }
                  options={domain.options}
                  value={value}
                />
              );
            })}

            <button
              data-viz-reset-model="true"
              data-viz-reset-module-id="configured-visualization-lab"
              data-viz-reset-topic-id={labId}
              className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              onClick={() => dispatch({ kind: "reset" })}
              type="button"
            >
              {t(RATIO_PROPORTION_SCALE_COPY.reset)}
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

export function RatioProportionScaleLab(
  props: RatioProportionScaleLabProps,
) {
  if (!isMainlandRatioProportionScaleLabId(props.labId)) return null;
  const initialInput = checkedInitialInput(props.labId, props.initialInput);
  if (!initialInput) return null;
  return (
    <AllowedRatioProportionScaleLab
      controlFooterAction={props.controlFooterAction}
      initialInput={initialInput}
      key={props.labId}
      labId={props.labId}
    />
  );
}
