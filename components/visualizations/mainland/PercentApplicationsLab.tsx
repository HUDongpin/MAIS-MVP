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
  PERCENT_APPLICATIONS_LAB_IDS,
  PERCENT_APPLICATIONS_MODEL_CONTRACT,
  buildPercentApplicationsState,
  type PercentApplicationsInput,
  type PercentApplicationsLabId,
  type PercentApplicationsMode,
  type PercentApplicationsState,
} from "./PercentApplicationsModel";
import {
  PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT,
  PercentApplicationsControlDomainError,
  auditPercentApplicationsControlTransition,
  createPercentApplicationsControlDomainState,
  percentApplicationsControlContractFor,
  planPercentApplicationsControlTransition,
  type PercentApplicationsControlDomainErrorCode,
  type PercentApplicationsControlDomainRequest,
  type PercentApplicationsControlDomainState,
  type PercentApplicationsControlTransitionReceipt,
  type PercentApplicationsNumericControlId,
  type PercentApplicationsVisibleControlId,
} from "./PercentApplicationsControlDomain";
import { PercentApplicationsVisualModel } from "./PercentApplicationsVisualModel";

export const MAINLAND_PERCENT_APPLICATIONS_LAB_IDS =
  PERCENT_APPLICATIONS_LAB_IDS;

const MAINLAND_PERCENT_APPLICATIONS_LAB_ID_SET = new Set<string>(
  MAINLAND_PERCENT_APPLICATIONS_LAB_IDS,
);

export function isMainlandPercentApplicationsLabId(
  labId: string,
): labId is PercentApplicationsLabId {
  return MAINLAND_PERCENT_APPLICATIONS_LAB_ID_SET.has(labId);
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

export const PERCENT_APPLICATIONS_MODE_ALLOWLIST = deepFreeze({
  "bnu-primary-p6-upper-percentage-applications": [
    "find-part",
    "find-whole",
    "increase",
    "decrease",
    "discount",
    "inverse",
  ],
  "pep-primary-p6-upper-percent-fractions": [
    "convert",
    "find-part",
    "find-whole",
    "increase",
    "decrease",
    "discount",
  ],
} as const satisfies Record<
  PercentApplicationsLabId,
  readonly PercentApplicationsMode[]
>);

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const PERCENT_APPLICATIONS_COPY = {
  eyebrow: localized(
    "Exact percentage lab",
    "精確百分數實驗",
    "精确百分数实验",
  ),
  title: localized(
    "See the whole percentage relationship",
    "看清完整的百分數關係",
    "看清完整的百分数关系",
  ),
  goal: localized(
    "Change one exact value and use the equation together with the diagram to verify the result.",
    "改變一個精確數值，並用等式和圖形一起驗證結果。",
    "改变一个精确数值，并用等式和图形一起验证结果。",
  ),
  panHint: localized(
    "On a narrow screen, scroll inside the laboratory surface to see every control.",
    "在較窄螢幕上，可在實驗區內橫向捲動以查看全部控制項。",
    "在较窄屏幕上，可在实验区内横向滚动以查看全部控件。",
  ),
  topicTitles: {
    "bnu-primary-p6-upper-percentage-applications": localized(
      "Percentage applications",
      "百分數的應用",
      "百分数的应用",
    ),
    "pep-primary-p6-upper-percent-fractions": localized(
      "Fractions, decimals, and percentages",
      "分數、小數與百分數",
      "分数、小数与百分数",
    ),
  },
  modes: {
    convert: localized("Convert representations", "表示形式互換", "表示形式互换"),
    "find-part": localized("Find the part", "求部分量", "求部分量"),
    "find-whole": localized("Find the whole", "求整體量", "求整体量"),
    increase: localized("Percentage increase", "百分數增加", "百分数增加"),
    decrease: localized("Percentage decrease", "百分數減少", "百分数减少"),
    discount: localized("Discount", "折扣", "折扣"),
    inverse: localized("Recover the original", "逆推原值", "逆推原值"),
  },
  controls: {
    amount: localized("Known part", "已知部分", "已知部分"),
    base: localized("Whole or original value", "整體量或原值", "整体量或原值"),
    newValue: localized("Observed new value", "已知的新值", "已知的新值"),
    rate: localized("Percentage rate", "百分率", "百分率"),
    inverseDirection: localized("Direction of the change", "改變方向", "改变方向"),
  },
  directions: {
    increase: localized("Increase", "增加", "增加"),
    decrease: localized("Decrease", "減少", "减少"),
  },
  equation: localized("Exact visible equation", "可見的精確等式", "可见的精确等式"),
  controlsHeading: localized("Try another exact state", "試算另一個精確狀態", "试算另一个精确状态"),
  reset: localized("Reset percentage model", "重設百分數模型", "重置百分数模型"),
} as const;

export type PercentApplicationsLabRejection =
  | PercentApplicationsControlDomainErrorCode
  | "MODE_NOT_ALLOWED";

export type PercentApplicationsLabUiState = Readonly<{
  domainState: PercentApplicationsControlDomainState;
  lastRejection: PercentApplicationsLabRejection | null;
  receipt: PercentApplicationsControlTransitionReceipt;
}>;

export type PercentApplicationsLabProps = {
  controlFooterAction?: ReactNode;
  initialInput?: PercentApplicationsInput;
  labId: string;
};

function inputFromDomainState(
  state: PercentApplicationsControlDomainState,
): PercentApplicationsInput {
  return {
    amount: state.amount,
    base: state.base,
    inverseDirection: state.inverseDirection,
    labId: state.labId,
    mode: state.mode,
    newValue: state.newValue,
    rateBasisPoints: state.rateBasisPoints,
  };
}

function domainStateFromInput(
  input: PercentApplicationsInput,
): PercentApplicationsControlDomainState {
  return {
    amount: input.amount,
    base: input.base,
    inverseDirection: input.inverseDirection,
    labId: input.labId,
    mode: input.mode,
    newValue: input.newValue,
    rateBasisPoints: input.rateBasisPoints,
  };
}

function allowedModesForLab(labId: PercentApplicationsLabId) {
  return PERCENT_APPLICATIONS_MODE_ALLOWLIST[
    labId
  ] as readonly PercentApplicationsMode[];
}

function transitionReceiptForState(
  state: PercentApplicationsControlDomainState,
) {
  const plan = planPercentApplicationsControlTransition(state, {
    controllerId: "mode",
    kind: "controller",
    value: state.mode,
  });
  return auditPercentApplicationsControlTransition(plan, plan.expected);
}

export function resetPercentApplicationsLabInput(
  labId: PercentApplicationsLabId,
): PercentApplicationsInput {
  const initial = createPercentApplicationsControlDomainState(labId);
  const resetMode: PercentApplicationsMode =
    labId === "pep-primary-p6-upper-percent-fractions"
      ? "convert"
      : "find-part";
  const plan = planPercentApplicationsControlTransition(initial, {
    controllerId: "mode",
    kind: "controller",
    value: resetMode,
  });
  return deepFreeze(inputFromDomainState(plan.expected));
}

export function createPercentApplicationsLabUiState(
  labId: PercentApplicationsLabId,
  initialInput: PercentApplicationsInput = resetPercentApplicationsLabInput(
    labId,
  ),
): PercentApplicationsLabUiState {
  if (
    initialInput.labId !== labId ||
    !allowedModesForLab(labId).includes(initialInput.mode)
  ) {
    throw new PercentApplicationsControlDomainError(
      "INVALID_STATE",
      "The initial percentage state does not belong to this topic and mode allowlist.",
    );
  }
  buildPercentApplicationsState(initialInput);
  const domainState = domainStateFromInput(initialInput);
  const receipt = transitionReceiptForState(domainState);
  return deepFreeze({
    domainState: receipt.observed,
    lastRejection: null,
    receipt,
  });
}

export function reducePercentApplicationsLabUiState(
  current: PercentApplicationsLabUiState,
  request: PercentApplicationsControlDomainRequest,
): PercentApplicationsLabUiState {
  if (request.kind === "reset") {
    return createPercentApplicationsLabUiState(current.domainState.labId);
  }
  if (
    request.kind === "controller" &&
    request.controllerId === "mode" &&
    !allowedModesForLab(current.domainState.labId).includes(
      request.value as PercentApplicationsMode,
    )
  ) {
    return deepFreeze({ ...current, lastRejection: "MODE_NOT_ALLOWED" });
  }
  try {
    const plan = planPercentApplicationsControlTransition(
      current.domainState,
      request,
    );
    const receipt = auditPercentApplicationsControlTransition(
      plan,
      plan.expected,
    );
    buildPercentApplicationsState(inputFromDomainState(receipt.observed));
    return deepFreeze({
      domainState: receipt.observed,
      lastRejection: null,
      receipt,
    });
  } catch (error) {
    if (error instanceof PercentApplicationsControlDomainError) {
      return deepFreeze({ ...current, lastRejection: error.code });
    }
    throw error;
  }
}

function serializeDomainState(state: PercentApplicationsControlDomainState) {
  return JSON.stringify({
    amount: state.amount,
    base: state.base,
    inverseDirection: state.inverseDirection,
    labId: state.labId,
    mode: state.mode,
    newValue: state.newValue,
    rateBasisPoints: state.rateBasisPoints,
  });
}

function percentText(basisPoints: number) {
  const whole = Math.floor(basisPoints / 100);
  const hundredths = basisPoints % 100;
  if (hundredths === 0) return `${whole}%`;
  if (hundredths % 10 === 0) return `${whole}.${hundredths / 10}%`;
  return `${whole}.${String(hundredths).padStart(2, "0")}%`;
}

function decimalText(basisPoints: number) {
  const whole = Math.floor(basisPoints / 10_000);
  const remainder = basisPoints % 10_000;
  if (remainder === 0) return String(whole);
  return `${whole}.${String(remainder).padStart(4, "0").replace(/0+$/u, "")}`;
}

function NumberControl({
  controlId,
  label,
  maximum,
  minimum,
  onChange,
  output,
  value,
}: {
  controlId: PercentApplicationsNumericControlId;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  output: string;
  value: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="flex items-center justify-between gap-3 text-xs font-black text-slate-700 dark:text-slate-200">
        <span>{label}</span>
        <output htmlFor={id} className="font-mono text-sm text-sky-700 dark:text-sky-300">{output}</output>
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
      />
    </label>
  );
}

function VisibleEquation({
  model,
  t,
}: {
  model: PercentApplicationsState;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = model.visibleReceipt;
  let equation: string;
  if (receipt.kind === "conversion") {
    equation = `${receipt.fraction.text} = ${decimalText(model.rate.basisPoints)} = ${percentText(model.rate.basisPoints)}`;
  } else if (receipt.kind === "find-part") {
    equation = `${receipt.base.text} × ${receipt.rate.text} = ${receipt.part.text}`;
  } else if (receipt.kind === "find-whole") {
    equation = `${receipt.knownPart.text} ÷ ${receipt.rate.text} = ${receipt.whole.text}`;
  } else if (receipt.kind === "percent-change") {
    equation = `${receipt.original.text} ${receipt.direction === "increase" ? "+" : "−"} ${receipt.absoluteChange.text} = ${receipt.newValue.text}`;
  } else if (receipt.kind === "discount") {
    equation = `${receipt.originalPrice.text} − ${receipt.discountAmount.text} = ${receipt.salePrice.text}`;
  } else {
    equation = `${receipt.original.text} × ${receipt.multiplier.text} = ${receipt.observedNewValue.text}`;
  }
  return (
    <article
      data-viz-visible-equation="true"
      data-viz-visible-receipt={receipt.kind}
      className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950"
    >
      <h3 className="text-sm font-black text-sky-950 dark:text-sky-100">
        {t(PERCENT_APPLICATIONS_COPY.equation)}
      </h3>
      <p className="mt-3 break-words font-mono text-xl font-black text-slate-950 dark:text-white">
        {equation}
      </p>
    </article>
  );
}

function checkedInitialInput(
  labId: PercentApplicationsLabId,
  initialInput: PercentApplicationsInput | undefined,
) {
  const candidate = initialInput ?? resetPercentApplicationsLabInput(labId);
  try {
    createPercentApplicationsLabUiState(labId, candidate);
    return candidate;
  } catch {
    return null;
  }
}

function AllowedPercentApplicationsLab({
  controlFooterAction,
  initialInput,
  labId,
}: {
  controlFooterAction?: ReactNode;
  initialInput: PercentApplicationsInput;
  labId: PercentApplicationsLabId;
}) {
  const { t } = useSettings();
  const [uiState, setUiState] = useState<PercentApplicationsLabUiState>(() =>
    createPercentApplicationsLabUiState(labId, initialInput),
  );
  const { domainState, receipt } = uiState;
  const modelInput = useMemo(
    () => inputFromDomainState(domainState),
    [domainState],
  );
  const model = useMemo(
    () => buildPercentApplicationsState(modelInput),
    [modelInput],
  );
  const contract = percentApplicationsControlContractFor(
    domainState.mode,
    domainState.inverseDirection,
  );

  function dispatch(request: PercentApplicationsControlDomainRequest) {
    setUiState((current) =>
      reducePercentApplicationsLabUiState(current, request),
    );
  }

  function updateNumeric(
    controlId: PercentApplicationsNumericControlId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value = Number(event.currentTarget.value);
    dispatch({ controlId, kind: "control", value });
  }

  const visibleControls =
    contract.visibleControls as readonly PercentApplicationsVisibleControlId[];
  const numericControls = visibleControls.filter(
    (control): control is PercentApplicationsNumericControlId =>
      control !== "inverse-direction",
  );

  return (
    <section
      data-mainland-percent-applications="true"
      data-viz-topic-id={labId}
      data-viz-family={model.family}
      data-viz-model={model.version}
      data-viz-configured-model={model.version}
      data-viz-configured-state={serializeDomainState(domainState)}
      data-viz-state={serializeDomainState(domainState)}
      data-viz-mode={model.mode}
      data-viz-range-domain-id={PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.id}
      data-viz-domain-version={PERCENT_APPLICATIONS_CONTROL_DOMAIN_CONTRACT.version}
      data-viz-domain-requested={serializeDomainState(receipt.requested)}
      data-viz-domain-expected={serializeDomainState(receipt.expected)}
      data-viz-domain-observed={serializeDomainState(receipt.observed)}
      data-viz-domain-match={String(receipt.matchesExpected)}
      data-viz-domain-projection-count={receipt.projections.length}
      data-viz-domain-projection-reasons={receipt.projections.map(({ reason }) => reason).join(",")}
      data-viz-domain-rejection={uiState.lastRejection ?? undefined}
      className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-3 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-5"
    >
      <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          {t(PERCENT_APPLICATIONS_COPY.eyebrow)}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
          {t(PERCENT_APPLICATIONS_COPY.topicTitles[labId])}
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {t(PERCENT_APPLICATIONS_COPY.goal)}
        </p>
      </header>

      <p data-viz-pan-hint="true" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        {t(PERCENT_APPLICATIONS_COPY.panHint)}
      </p>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div data-viz-local-scroll="horizontal" tabIndex={0} className="min-w-0 overflow-x-auto rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <div className="grid min-w-[38rem] gap-4">
            <nav className="grid grid-cols-2 gap-2 md:grid-cols-3" aria-label={t(PERCENT_APPLICATIONS_COPY.title)}>
              {allowedModesForLab(labId).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-viz-mode-button="true"
                  data-viz-mode={mode}
                  aria-pressed={domainState.mode === mode}
                  className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  onClick={() => dispatch({ controllerId: "mode", kind: "controller", value: mode })}
                >
                  {t(PERCENT_APPLICATIONS_COPY.modes[mode])}
                </button>
              ))}
            </nav>
            <VisibleEquation model={model} t={t} />
            <PercentApplicationsVisualModel model={model} t={t} />
          </div>
        </div>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {t(PERCENT_APPLICATIONS_COPY.controlsHeading)}
          </h3>
          <div className="mt-3 grid gap-3">
            {numericControls.map((controlId) => {
              const isRate = controlId === "rate-basis-points";
              const value =
                controlId === "amount"
                  ? domainState.amount
                  : controlId === "base"
                    ? domainState.base
                    : controlId === "new-value"
                      ? domainState.newValue
                      : domainState.rateBasisPoints;
              const label =
                controlId === "amount"
                  ? t(PERCENT_APPLICATIONS_COPY.controls.amount)
                  : controlId === "base"
                    ? t(PERCENT_APPLICATIONS_COPY.controls.base)
                    : controlId === "new-value"
                      ? t(PERCENT_APPLICATIONS_COPY.controls.newValue)
                      : t(PERCENT_APPLICATIONS_COPY.controls.rate);
              return (
                <NumberControl
                  key={controlId}
                  controlId={controlId}
                  label={label}
                  minimum={isRate ? contract.rate.min : 0}
                  maximum={isRate ? contract.rate.max : 1_000_000}
                  onChange={(event) => updateNumeric(controlId, event)}
                  output={isRate ? percentText(value) : String(value)}
                  value={value}
                />
              );
            })}

            {visibleControls.includes("inverse-direction") ? (
              <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <legend className="px-1 text-xs font-black text-slate-700 dark:text-slate-200">
                  {t(PERCENT_APPLICATIONS_COPY.controls.inverseDirection)}
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["increase", "decrease"] as const).map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      data-viz-direction-button="true"
                      data-viz-direction={direction}
                      aria-pressed={domainState.inverseDirection === direction}
                      className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      onClick={() => dispatch({ controllerId: "inverse-direction", kind: "controller", value: direction })}
                    >
                      {t(PERCENT_APPLICATIONS_COPY.directions[direction])}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <button
              type="button"
              data-viz-reset-model="true"
              data-viz-reset-module-id="configured-visualization-lab"
              data-viz-reset-topic-id={labId}
              className="focus-ring min-h-11 min-w-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              onClick={() => dispatch({ kind: "reset" })}
            >
              {t(PERCENT_APPLICATIONS_COPY.reset)}
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

export function PercentApplicationsLab(props: PercentApplicationsLabProps) {
  if (!isMainlandPercentApplicationsLabId(props.labId)) return null;
  const initialInput = checkedInitialInput(props.labId, props.initialInput);
  if (!initialInput) return null;
  return (
    <AllowedPercentApplicationsLab
      key={props.labId}
      controlFooterAction={props.controlFooterAction}
      initialInput={initialInput}
      labId={props.labId}
    />
  );
}
