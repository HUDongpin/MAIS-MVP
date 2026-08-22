import type { ReactNode } from "react";
import type { LocalizedText } from "../../../types";
import type {
  PercentApplicationsState,
  PercentApplicationsVisibleReceipt,
} from "./PercentApplicationsModel";

type PercentVisualKind = PercentApplicationsVisibleReceipt["kind"];

type UnsupportedPercentVisualReceipt = {
  kind: Exclude<PercentVisualKind, "conversion">;
  reason: "zero-magnitude-has-no-positive-area";
  status: "unsupported";
};

export type PercentConversionVisualReceipt = {
  decimal: string;
  filledWholeCells: number;
  fraction: string;
  gridCount: number;
  kind: "conversion";
  partialCellBasisPoints: number;
  percentText: string;
  status: "supported";
  totalCells: number;
};

export type PercentPartVisualReceipt = {
  kind: "find-part";
  part: string;
  rate: string;
  reconstruction: string;
  status: "supported";
  whole: string;
};

export type PercentWholeVisualReceipt = {
  kind: "find-whole";
  knownPart: string;
  rate: string;
  reconstruction: string;
  status: "supported";
  whole: string;
};

export type PercentChangeVisualReceipt = {
  absoluteChange: string;
  direction: "decrease" | "increase";
  kind: "percent-change";
  multiplier: string;
  newValue: string;
  original: string;
  reconstruction: string;
  status: "supported";
};

export type PercentDiscountVisualReceipt = {
  discountAmount: string;
  discountRate: string;
  kind: "discount";
  originalPrice: string;
  reconstruction: string;
  salePrice: string;
  status: "supported";
};

export type PercentInverseVisualReceipt = {
  direction: "decrease" | "increase";
  forwardCheck: string;
  kind: "inverse";
  multiplier: string;
  observedNewValue: string;
  original: string;
  status: "supported";
};

export type PercentApplicationsVisualReceipt =
  | PercentConversionVisualReceipt
  | PercentPartVisualReceipt
  | PercentWholeVisualReceipt
  | PercentChangeVisualReceipt
  | PercentDiscountVisualReceipt
  | PercentInverseVisualReceipt
  | UnsupportedPercentVisualReceipt;

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const PERCENT_APPLICATIONS_VISUAL_COPY = {
  conversion: localized(
    "Fraction, decimal, and percent are the same quantity",
    "分數、小數和百分數表示相同數量",
    "分数、小数和百分数表示相同数量",
  ),
  percentGrid: localized(
    "Each full square is one percent; a partial square shows hundredths of one percent",
    "每個完整方格表示百分之一；部分方格表示百分之一的百分之一",
    "每个完整方格表示百分之一；部分方格表示百分之一的百分之一",
  ),
  partWhole: localized(
    "Compare the whole with its percentage part",
    "比較整體與所佔的百分數部分",
    "比较整体与所占的百分数部分",
  ),
  percentChange: localized(
    "Original value, amount of change, and new value",
    "原值、改變量和新值",
    "原值、改变量和新值",
  ),
  discount: localized(
    "Original price, discount amount, and sale price",
    "原價、折扣金額和售價",
    "原价、折扣金额和售价",
  ),
  inverse: localized(
    "Reconstruct the original value from the observed value",
    "由已知的新值重構原值",
    "由已知的新值重构原值",
  ),
  whole: localized("Whole", "整體", "整体"),
  part: localized("Part", "部分", "部分"),
  knownPart: localized("Known part", "已知部分", "已知部分"),
  original: localized("Original", "原值", "原值"),
  change: localized("Change", "改變量", "改变量"),
  newValue: localized("New value", "新值", "新值"),
  originalPrice: localized("Original price", "原價", "原价"),
  discountAmount: localized("Discount amount", "折扣金額", "折扣金额"),
  salePrice: localized("Sale price", "售價", "售价"),
  observedValue: localized("Observed value", "已知的新值", "已知的新值"),
  unsupported: localized(
    "A positive length is required before an area or bar can represent this state.",
    "需要正的長度，面積或長條才可表示目前狀態。",
    "需要正的长度，面积或长条才可表示当前状态。",
  ),
} as const;

function exactDecimal(basisPoints: number) {
  const whole = Math.floor(basisPoints / 10_000);
  const remainder = basisPoints % 10_000;
  if (remainder === 0) return String(whole);
  return `${whole}.${String(remainder).padStart(4, "0").replace(/0+$/u, "")}`;
}

function unsupported(
  kind: Exclude<PercentVisualKind, "conversion">,
): UnsupportedPercentVisualReceipt {
  return {
    kind,
    reason: "zero-magnitude-has-no-positive-area",
    status: "unsupported",
  };
}

export function buildPercentApplicationsVisualReceipt(
  model: PercentApplicationsState,
): PercentApplicationsVisualReceipt {
  const receipt = model.visibleReceipt;
  switch (receipt.kind) {
    case "conversion": {
      const gridCount = Math.max(
        1,
        Math.ceil(model.rate.basisPoints / 10_000),
      );
      return {
        decimal: exactDecimal(model.rate.basisPoints),
        filledWholeCells: Math.floor(model.rate.basisPoints / 100),
        fraction: receipt.fraction.text,
        gridCount,
        kind: "conversion",
        partialCellBasisPoints: model.rate.basisPoints % 100,
        percentText: receipt.percentText,
        status: "supported",
        totalCells: gridCount * 100,
      };
    }
    case "find-part":
      if (receipt.base.numerator === 0) return unsupported(receipt.kind);
      return {
        kind: receipt.kind,
        part: receipt.part.text,
        rate: receipt.rate.text,
        reconstruction: receipt.reconstruction.text,
        status: "supported",
        whole: receipt.base.text,
      };
    case "find-whole":
      if (receipt.whole.numerator === 0) return unsupported(receipt.kind);
      return {
        kind: receipt.kind,
        knownPart: receipt.knownPart.text,
        rate: receipt.rate.text,
        reconstruction: receipt.reconstruction.text,
        status: "supported",
        whole: receipt.whole.text,
      };
    case "percent-change":
      if (receipt.original.numerator === 0) return unsupported(receipt.kind);
      return {
        absoluteChange: receipt.absoluteChange.text,
        direction: receipt.direction,
        kind: receipt.kind,
        multiplier: receipt.multiplier.text,
        newValue: receipt.newValue.text,
        original: receipt.original.text,
        reconstruction: receipt.reconstruction.text,
        status: "supported",
      };
    case "discount":
      if (receipt.originalPrice.numerator === 0) return unsupported(receipt.kind);
      return {
        discountAmount: receipt.discountAmount.text,
        discountRate: receipt.discountRate.text,
        kind: receipt.kind,
        originalPrice: receipt.originalPrice.text,
        reconstruction: receipt.reconstruction.text,
        salePrice: receipt.salePrice.text,
        status: "supported",
      };
    case "inverse":
      if (receipt.observedNewValue.numerator === 0) return unsupported(receipt.kind);
      return {
        direction: receipt.direction,
        forwardCheck: receipt.forwardCheck.text,
        kind: receipt.kind,
        multiplier: receipt.multiplier.text,
        observedNewValue: receipt.observedNewValue.text,
        original: receipt.original.text,
        status: "supported",
      };
  }
}

function numericRational(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);
  return numerator! / denominator!;
}

function VisualShell({
  children,
  kind,
  label,
  markCount,
  receipt,
  summary,
  viewBox = "0 0 720 260",
}: {
  children: ReactNode;
  kind: PercentVisualKind;
  label: string;
  markCount: number;
  receipt: PercentApplicationsVisualReceipt;
  summary: string;
  viewBox?: string;
}) {
  if (!Number.isSafeInteger(markCount) || markCount <= 0) {
    throw new RangeError(`${kind} must expose a nonzero painted-mark receipt`);
  }
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
      <svg
        aria-label={`${label}. ${summary}`}
        data-viz-percent-visual={kind}
        data-viz-geometry-receipt={JSON.stringify(receipt)}
        data-viz-owner="percent-applications"
        data-viz-painted-mark-count={markCount}
        data-viz-svg-background="opaque"
        role="img"
        viewBox={viewBox}
        className="mt-2 block h-auto w-full min-w-0 rounded-lg bg-white"
      >
        <rect width="100%" height="100%" fill="#ffffff" />
        {children}
      </svg>
      <figcaption className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
        {summary}
      </figcaption>
    </figure>
  );
}

function ConversionVisual({
  receipt,
  t,
}: {
  receipt: PercentConversionVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const cellSize = 10;
  const gridGap = 18;
  const gridHeight = cellSize * 10;
  const marks: ReactNode[] = [];
  for (let index = 0; index < receipt.totalCells; index += 1) {
    const grid = Math.floor(index / 100);
    const withinGrid = index % 100;
    const row = Math.floor(withinGrid / 10);
    const column = withinGrid % 10;
    marks.push(
      <rect
        key={index}
        data-viz-painted-mark="true"
        data-viz-name="percent-grid-cell"
        data-viz-owner="percent-applications"
        data-viz-cell-index={index}
        data-viz-selected={String(index < receipt.filledWholeCells)}
        x={40 + column * cellSize}
        y={40 + grid * (gridHeight + gridGap) + row * cellSize}
        width={cellSize}
        height={cellSize}
        fill={index < receipt.filledWholeCells ? "#0f766e" : "#f8fafc"}
        stroke="#475569"
        strokeWidth="0.8"
      />,
    );
  }
  if (receipt.partialCellBasisPoints > 0) {
    const index = receipt.filledWholeCells;
    const grid = Math.floor(index / 100);
    const withinGrid = index % 100;
    const row = Math.floor(withinGrid / 10);
    const column = withinGrid % 10;
    marks.push(
      <rect
        key="partial"
        data-viz-painted-mark="true"
        data-viz-name="percent-grid-partial"
        data-viz-owner="percent-applications"
        data-viz-partial-basis-points={receipt.partialCellBasisPoints}
        x={40 + column * cellSize}
        y={40 + grid * (gridHeight + gridGap) + row * cellSize}
        width={(cellSize * receipt.partialCellBasisPoints) / 100}
        height={cellSize}
        fill="#f59e0b"
        stroke="#92400e"
        strokeWidth="0.8"
      />,
    );
  }
  const markCount =
    receipt.totalCells + (receipt.partialCellBasisPoints > 0 ? 1 : 0);
  return (
    <VisualShell
      kind="conversion"
      label={t(PERCENT_APPLICATIONS_VISUAL_COPY.conversion)}
      markCount={markCount}
      receipt={receipt}
      summary={`${receipt.fraction} = ${receipt.decimal} = ${receipt.percentText}. ${t(PERCENT_APPLICATIONS_VISUAL_COPY.percentGrid)}`}
      viewBox={`0 0 720 ${70 + receipt.gridCount * (gridHeight + gridGap)}`}
    >
      {marks}
      <text x="180" y="62" fill="#0f172a" fontSize="20" fontWeight="800">
        {receipt.fraction} = {receipt.decimal} = {receipt.percentText}
      </text>
    </VisualShell>
  );
}

type BarSpec = {
  exact: string;
  label: string;
  name: "discount-value-bar" | "inverse-value-bar" | "percent-change-bar" | "percent-part-whole-bar";
};

function BarVisual({
  bars,
  kind,
  label,
  receipt,
  summary,
}: {
  bars: BarSpec[];
  kind: Exclude<PercentVisualKind, "conversion">;
  label: string;
  receipt: Exclude<PercentApplicationsVisualReceipt, UnsupportedPercentVisualReceipt | PercentConversionVisualReceipt>;
  summary: string;
}) {
  const maximum = Math.max(...bars.map(({ exact }) => numericRational(exact)), 1);
  return (
    <VisualShell
      kind={kind}
      label={label}
      markCount={bars.length}
      receipt={receipt}
      summary={summary}
    >
      {bars.map((bar, index) => {
        const value = numericRational(bar.exact);
        const width = (value / maximum) * 560;
        const y = 54 + index * 62;
        return value === 0 ? (
          <line
            key={bar.label}
            data-viz-painted-mark="true"
            data-viz-name={bar.name}
            data-viz-owner="percent-applications"
            data-viz-exact={bar.exact}
            data-viz-zero="true"
            x1="72"
            x2="72"
            y1={y}
            y2={y + 30}
            stroke="#b45309"
            strokeWidth="4"
          />
        ) : (
          <rect
            key={bar.label}
            data-viz-painted-mark="true"
            data-viz-name={bar.name}
            data-viz-owner="percent-applications"
            data-viz-exact={bar.exact}
            x="72"
            y={y}
            width={width}
            height="30"
            rx="7"
            fill={["#2563eb", "#f59e0b", "#16a34a"][index % 3]}
            stroke="#0f172a"
            strokeWidth="2"
          />
        );
      })}
      {bars.map((bar, index) => (
        <text
          key={`${bar.label}-text`}
          x="78"
          y={48 + index * 62}
          fill="#0f172a"
          fontSize="16"
          fontWeight="750"
        >
          {bar.label}: {bar.exact}
        </text>
      ))}
    </VisualShell>
  );
}

export function PercentApplicationsVisualModel({
  model,
  t,
}: {
  model: PercentApplicationsState;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = buildPercentApplicationsVisualReceipt(model);
  if (receipt.status === "unsupported") {
    return (
      <aside
        data-viz-percent-visual-status="unsupported"
        data-viz-unsupported-kind={receipt.kind}
        data-viz-unsupported-reason={receipt.reason}
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        {t(PERCENT_APPLICATIONS_VISUAL_COPY.unsupported)}
      </aside>
    );
  }
  if (receipt.kind === "conversion") {
    return <ConversionVisual receipt={receipt} t={t} />;
  }
  if (receipt.kind === "find-part") {
    return (
      <BarVisual
        bars={[
          { exact: receipt.whole, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.whole), name: "percent-part-whole-bar" },
          { exact: receipt.part, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.part), name: "percent-part-whole-bar" },
        ]}
        kind={receipt.kind}
        label={t(PERCENT_APPLICATIONS_VISUAL_COPY.partWhole)}
        receipt={receipt}
        summary={`${receipt.whole} × ${receipt.rate} = ${receipt.part}`}
      />
    );
  }
  if (receipt.kind === "find-whole") {
    return (
      <BarVisual
        bars={[
          { exact: receipt.whole, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.whole), name: "percent-part-whole-bar" },
          { exact: receipt.knownPart, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.knownPart), name: "percent-part-whole-bar" },
        ]}
        kind={receipt.kind}
        label={t(PERCENT_APPLICATIONS_VISUAL_COPY.partWhole)}
        receipt={receipt}
        summary={`${receipt.knownPart} ÷ ${receipt.rate} = ${receipt.whole}`}
      />
    );
  }
  if (receipt.kind === "percent-change") {
    return (
      <BarVisual
        bars={[
          { exact: receipt.original, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.original), name: "percent-change-bar" },
          { exact: receipt.absoluteChange, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.change), name: "percent-change-bar" },
          { exact: receipt.newValue, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.newValue), name: "percent-change-bar" },
        ]}
        kind={receipt.kind}
        label={t(PERCENT_APPLICATIONS_VISUAL_COPY.percentChange)}
        receipt={receipt}
        summary={`${receipt.original} ${receipt.direction === "increase" ? "+" : "−"} ${receipt.absoluteChange} = ${receipt.newValue}`}
      />
    );
  }
  if (receipt.kind === "discount") {
    return (
      <BarVisual
        bars={[
          { exact: receipt.originalPrice, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.originalPrice), name: "discount-value-bar" },
          { exact: receipt.discountAmount, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.discountAmount), name: "discount-value-bar" },
          { exact: receipt.salePrice, label: t(PERCENT_APPLICATIONS_VISUAL_COPY.salePrice), name: "discount-value-bar" },
        ]}
        kind={receipt.kind}
        label={t(PERCENT_APPLICATIONS_VISUAL_COPY.discount)}
        receipt={receipt}
        summary={`${receipt.originalPrice} − ${receipt.discountAmount} = ${receipt.salePrice}`}
      />
    );
  }
  const inverseMaximum = Math.max(
    numericRational(receipt.original),
    numericRational(receipt.observedNewValue),
  );
  const originalWidth =
    (numericRational(receipt.original) / inverseMaximum) * 500;
  const observedWidth =
    (numericRational(receipt.observedNewValue) / inverseMaximum) * 500;
  return (
    <VisualShell
      kind={receipt.kind}
      label={t(PERCENT_APPLICATIONS_VISUAL_COPY.inverse)}
      markCount={3}
      receipt={receipt}
      summary={`${receipt.original} × ${receipt.multiplier} = ${receipt.observedNewValue}`}
    >
      <rect data-viz-painted-mark="true" data-viz-name="inverse-value-bar" data-viz-owner="percent-applications" data-viz-exact={receipt.original} x="70" y="66" width={originalWidth} height="38" rx="8" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />
      <path data-viz-painted-mark="true" data-viz-name="inverse-reconstruction-arrow" data-viz-owner="percent-applications" data-viz-multiplier={receipt.multiplier} d={`M ${80 + originalWidth} 85 C 620 85 620 150 ${80 + observedWidth} 150`} fill="none" stroke="#7c3aed" strokeWidth="4" markerEnd="url(#percent-arrow)" />
      <rect data-viz-painted-mark="true" data-viz-name="inverse-value-bar" data-viz-owner="percent-applications" data-viz-exact={receipt.observedNewValue} x="70" y="142" width={observedWidth} height="38" rx="8" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
      <defs><marker id="percent-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed" /></marker></defs>
      <text x="76" y="58" fill="#0f172a" fontSize="16" fontWeight="750">{t(PERCENT_APPLICATIONS_VISUAL_COPY.original)}: {receipt.original}</text>
      <text x="76" y="134" fill="#0f172a" fontSize="16" fontWeight="750">{t(PERCENT_APPLICATIONS_VISUAL_COPY.observedValue)}: {receipt.observedNewValue}</text>
    </VisualShell>
  );
}
