import type { ReactNode } from "react";
import type { LocalizedText } from "../../../types";
import type {
  ExactFraction,
  FractionOperationsModel,
  FractionPhysicalInterpretationApplicability,
} from "./FractionOperationsModel";

export type FractionOperationsVisualKind =
  | "area-grid"
  | "part-of-quantity"
  | "scaling"
  | "measurement-division"
  | "sharing-division";

type UnsupportedReason = Extract<
  FractionPhysicalInterpretationApplicability,
  { status: "unsupported" }
>["reason"];

type UnsupportedVisualReceipt<K extends FractionOperationsVisualKind> = {
  kind: K;
  reason: UnsupportedReason;
  status: "unsupported";
};

export type FractionAreaGridVisualReceipt = {
  cellsPerUnit: number;
  columnFactor: string;
  columns: number;
  kind: "area-grid";
  remainingCells: number;
  rowFactor: string;
  rows: number;
  selectedCells: number;
  selectedColumns: number;
  selectedRows: number;
  status: "supported";
  totalGridCells: number;
  wholeUnits: number;
};

export type FractionPartOfQuantityVisualReceipt = {
  factor: string;
  kind: "part-of-quantity";
  partitionDenominator: number;
  partitionReconstruction: string;
  product: string;
  selectedCount: number;
  selectionReconstruction: string;
  startingQuantity: string;
  status: "supported";
  unitShare: string;
};

export type FractionScalingVisualReceipt = {
  factor: string;
  kind: "scaling";
  product: string;
  scaleDirection: "enlarge" | "preserve" | "reduce";
  startingValue: string;
  status: "supported";
};

export type FractionMeasurementVisualReceipt = {
  available: string;
  fullGroups: number;
  kind: "measurement-division";
  numberOfGroups: string;
  remainderOfUnit: string;
  status: "supported";
  unitSize: string;
};

export type FractionSharingVisualReceipt = {
  groupCount: number;
  kind: "sharing-division";
  sharePerGroup: string;
  status: "supported";
  total: string;
};

export type FractionOperationsVisualReceipt =
  | FractionAreaGridVisualReceipt
  | FractionPartOfQuantityVisualReceipt
  | FractionScalingVisualReceipt
  | FractionMeasurementVisualReceipt
  | FractionSharingVisualReceipt
  | UnsupportedVisualReceipt<FractionOperationsVisualKind>;

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const FRACTION_OPERATIONS_VISUAL_COPY = {
  areaGrid: localized(
    "Area grid: row fraction × column fraction",
    "面積方格：橫向分數 × 縱向分數",
    "面积方格：横向分数 × 纵向分数",
  ),
  selectedCells: localized(
    "Double-shaded cells show the product",
    "雙重陰影方格表示乘積",
    "双重阴影方格表示乘积",
  ),
  partOfQuantity: localized(
    "Partition the starting quantity, then select equal shares",
    "先把原量等分，再選取相同份量",
    "先把原量等分，再选取相同份量",
  ),
  unitShare: localized("One equal share", "一個等份", "一个等份"),
  scaling: localized(
    "Compare the starting length with its scaled length",
    "比較原長度與縮放後長度",
    "比较原长度与缩放后长度",
  ),
  startingLength: localized("Starting length", "原長度", "原长度"),
  scaledLength: localized("Scaled length", "縮放後長度", "缩放后长度"),
  measurement: localized(
    "Count how many unit-size groups fit in the available amount",
    "數出總量可包含多少個單位量",
    "数出总量可包含多少个单位量",
  ),
  completeGroup: localized("Complete unit group", "完整單位組", "完整单位组"),
  partialGroup: localized("Partial unit group", "不足一個單位組", "不足一个单位组"),
  sharing: localized(
    "Share the total equally among whole-number groups",
    "把總量平均分給整數個組",
    "把总量平均分给整数个组",
  ),
  equalShare: localized("Equal share", "每組等份", "每组等份"),
} as const;

function canonicalFraction(value: ExactFraction): string {
  return `${value.numerator}/${value.denominator}`;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function canonicalPair(numerator: number, denominator: number): string {
  if (denominator === 0) throw new RangeError("visual fraction denominator is zero");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${(sign * numerator) / divisor}/${Math.abs(denominator) / divisor}`;
}

function unsupported<K extends FractionOperationsVisualKind>(
  kind: K,
  applicability: Extract<
    FractionPhysicalInterpretationApplicability,
    { status: "unsupported" }
  >,
): UnsupportedVisualReceipt<K> {
  return { kind, reason: applicability.reason, status: "unsupported" };
}

export function buildFractionOperationsVisualReceipt(
  model: FractionOperationsModel,
  kind: FractionOperationsVisualKind,
): FractionOperationsVisualReceipt {
  if (
    kind === "area-grid" ||
    kind === "part-of-quantity" ||
    kind === "scaling"
  ) {
    const multiplication = model.operationInterpretation.multiplication;
    if (!multiplication) {
      throw new RangeError(`${kind} requires a multiplication interpretation`);
    }
    if (kind === "area-grid") {
      const { area } = multiplication;
      if (area.applicability.status === "unsupported") {
        return unsupported(kind, area.applicability);
      }
      return {
        cellsPerUnit: area.cellsPerUnit,
        columnFactor: canonicalFraction(area.columnFactor),
        columns: area.columnUnitCount * area.columns,
        kind,
        remainingCells: area.remainingCells,
        rowFactor: canonicalFraction(area.rowFactor),
        rows: area.rowUnitCount * area.rows,
        selectedCells: area.overlapCells,
        selectedColumns: area.selectedColumns,
        selectedRows: area.selectedRows,
        status: "supported",
        totalGridCells: area.totalGridCells,
        wholeUnits: area.wholeUnits,
      };
    }
    if (kind === "part-of-quantity") {
      const { repeatedGroup } = multiplication;
      if (repeatedGroup.applicability.status === "unsupported") {
        return unsupported(kind, repeatedGroup.applicability);
      }
      return {
        factor: canonicalFraction(repeatedGroup.factor),
        kind,
        partitionDenominator: repeatedGroup.partitionDenominator,
        partitionReconstruction: canonicalFraction(
          repeatedGroup.partitionReconstructedStarting,
        ),
        product: canonicalFraction(multiplication.product),
        selectedCount: repeatedGroup.selectedCount,
        selectionReconstruction: canonicalFraction(
          repeatedGroup.selectedReconstructedProduct,
        ),
        startingQuantity: canonicalFraction(repeatedGroup.startingQuantity),
        status: "supported",
        unitShare: canonicalFraction(repeatedGroup.unitShare),
      };
    }
    const { scaling } = multiplication;
    if (scaling.applicability.status === "unsupported") {
      return unsupported(kind, scaling.applicability);
    }
    return {
      factor: canonicalFraction(scaling.factor),
      kind,
      product: canonicalFraction(scaling.product),
      scaleDirection: scaling.scaleDirection,
      startingValue: canonicalFraction(scaling.startingValue),
      status: "supported",
    };
  }

  const division = model.operationInterpretation.division;
  if (!division) throw new RangeError(`${kind} requires a division interpretation`);
  if (kind === "measurement-division") {
    const { measurement } = division;
    if (measurement.applicability.status === "unsupported") {
      return unsupported(kind, measurement.applicability);
    }
    const quotientNumerator = measurement.numberOfGroups.numerator;
    const quotientDenominator = measurement.numberOfGroups.denominator;
    return {
      available: canonicalFraction(measurement.available),
      fullGroups: Math.floor(quotientNumerator / quotientDenominator),
      kind,
      numberOfGroups: canonicalFraction(measurement.numberOfGroups),
      remainderOfUnit: canonicalPair(
        quotientNumerator % quotientDenominator,
        quotientDenominator,
      ),
      status: "supported",
      unitSize: canonicalFraction(measurement.unitSize),
    };
  }

  const { sharing } = division;
  if (sharing.applicability.status === "unsupported") {
    return unsupported(kind, sharing.applicability);
  }
  return {
    groupCount: sharing.groupCount.numerator,
    kind,
    sharePerGroup: canonicalFraction(sharing.sharePerGroup),
    status: "supported",
    total: canonicalFraction(sharing.total),
  };
}

function numericFraction(value: string): number {
  const [numerator, denominator] = value.split("/").map(Number);
  return numerator! / denominator!;
}

function geometryReceipt(receipt: FractionOperationsVisualReceipt): string {
  return JSON.stringify(receipt);
}

function VisualShell({
  attributes,
  children,
  kind,
  label,
  markCount,
  receipt,
  summary,
  viewBox = "0 0 720 220",
}: {
  attributes?: Record<string, string | number>;
  children: ReactNode;
  kind: FractionOperationsVisualKind;
  label: string;
  markCount: number;
  receipt: FractionOperationsVisualReceipt;
  summary: string;
  viewBox?: string;
}) {
  if (!Number.isSafeInteger(markCount) || markCount <= 0) {
    throw new RangeError(`${kind} must expose a nonzero painted-mark receipt`);
  }
  return (
    <figure
      data-viz-visual-figure={kind}
      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
    >
      <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
      <svg
        aria-label={`${label}. ${summary}`}
        data-viz-fraction-visual={kind}
        data-viz-geometry-receipt={geometryReceipt(receipt)}
        data-viz-owner={kind}
        data-viz-painted-mark-count={markCount}
        data-viz-svg-background="opaque"
        {...attributes}
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

function AreaGrid({
  receipt,
  t,
}: {
  receipt: FractionAreaGridVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const width = 660;
  const height = 156;
  const cellWidth = width / receipt.columns;
  const cellHeight = height / receipt.rows;
  const rowUnitSize = Number(receipt.rowFactor.split("/")[1]);
  const columnUnitSize = Number(receipt.columnFactor.split("/")[1]);
  const marks: ReactNode[] = [];
  for (let row = 0; row < receipt.rows; row += 1) {
    for (let column = 0; column < receipt.columns; column += 1) {
      const selected = row < receipt.selectedRows && column < receipt.selectedColumns;
      const unitRow = Math.floor(row / rowUnitSize);
      const unitColumn = Math.floor(column / columnUnitSize);
      marks.push(
        <rect
          key={`${row}:${column}`}
          data-viz-painted-mark="true"
          data-viz-name="fraction-area-cell"
          data-viz-owner="area-grid"
          data-viz-row={row}
          data-viz-column={column}
          data-viz-selected={String(selected)}
          data-viz-unit-row={Number.isFinite(unitRow) ? unitRow : 0}
          data-viz-unit-column={Number.isFinite(unitColumn) ? unitColumn : 0}
          x={30 + column * cellWidth}
          y={34 + row * cellHeight}
          width={cellWidth}
          height={cellHeight}
          fill={selected ? "#0f766e" : "#f8fafc"}
          stroke={selected ? "#134e4a" : "#64748b"}
          strokeWidth={selected ? 2.4 : 1.1}
        />,
      );
    }
  }
  return (
    <VisualShell
      attributes={{
        "data-viz-cells-per-unit": receipt.cellsPerUnit,
        "data-viz-overlap-cells": receipt.selectedCells,
        "data-viz-remaining-cells": receipt.remainingCells,
        "data-viz-whole-units": receipt.wholeUnits,
      }}
      kind="area-grid"
      label={t(FRACTION_OPERATIONS_VISUAL_COPY.areaGrid)}
      markCount={receipt.totalGridCells}
      receipt={receipt}
      summary={`${t(FRACTION_OPERATIONS_VISUAL_COPY.selectedCells)}: ${receipt.selectedCells}/${receipt.cellsPerUnit} = ${receipt.wholeUnits} + ${receipt.remainingCells}/${receipt.cellsPerUnit}`}
    >
      {marks}
    </VisualShell>
  );
}

function PartOfQuantity({
  receipt,
  t,
}: {
  receipt: FractionPartOfQuantityVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const markCount = Math.max(receipt.partitionDenominator, receipt.selectedCount, 1);
  const gap = 5;
  const usableWidth = 660 - gap * (markCount - 1);
  const shareWidth = usableWidth / markCount;
  return (
    <VisualShell
      attributes={{
        "data-viz-group-count": receipt.selectedCount,
        "data-viz-group-value": receipt.unitShare,
        "data-viz-reconstructed-magnitude": receipt.product,
      }}
      kind="part-of-quantity"
      label={t(FRACTION_OPERATIONS_VISUAL_COPY.partOfQuantity)}
      markCount={markCount}
      receipt={receipt}
      summary={`${receipt.factor} × ${receipt.startingQuantity}: ${t(FRACTION_OPERATIONS_VISUAL_COPY.unitShare)} = ${receipt.unitShare}; ${receipt.selectedCount} × ${receipt.unitShare} = ${receipt.product}`}
    >
      {Array.from({ length: markCount }, (_, index) => (
        <rect
          key={index}
          data-viz-painted-mark="true"
          data-viz-name="fraction-partition-share"
          data-viz-owner="part-of-quantity"
          data-viz-share-index={index}
          data-viz-selected={String(index < receipt.selectedCount)}
          x={30 + index * (shareWidth + gap)}
          y={72}
          width={shareWidth}
          height={82}
          rx={8}
          fill={index < receipt.selectedCount ? "#2563eb" : "#e2e8f0"}
          stroke="#1e3a8a"
          strokeWidth={index < receipt.partitionDenominator ? 2.4 : 1.2}
          strokeDasharray={index < receipt.selectedCount ? undefined : "7 5"}
        />
      ))}
    </VisualShell>
  );
}

function Scaling({
  receipt,
  t,
}: {
  receipt: FractionScalingVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const starting = numericFraction(receipt.startingValue);
  const product = numericFraction(receipt.product);
  const maximum = Math.max(starting, product, 1);
  const startWidth = (starting / maximum) * 580;
  const resultWidth = (product / maximum) * 580;
  return (
    <VisualShell
      attributes={{
        "data-viz-factor": receipt.factor,
        "data-viz-scale-direction": receipt.scaleDirection,
        "data-viz-starting-value": receipt.startingValue,
      }}
      kind="scaling"
      label={t(FRACTION_OPERATIONS_VISUAL_COPY.scaling)}
      markCount={4}
      receipt={receipt}
      summary={`${receipt.startingValue} × ${receipt.factor} = ${receipt.product}`}
    >
      <line data-viz-painted-mark="true" data-viz-name="fraction-scaling-axis" data-viz-owner="scaling" x1="70" x2="650" y1="174" y2="174" stroke="#475569" strokeWidth="3" />
      <rect data-viz-painted-mark="true" data-viz-name="fraction-scaling-start" data-viz-owner="scaling" x="70" y="52" width={Math.max(startWidth, 2)} height="34" rx="8" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />
      <rect data-viz-painted-mark="true" data-viz-name="fraction-scaling-result" data-viz-owner="scaling" x="70" y="112" width={Math.max(resultWidth, 2)} height="34" rx="8" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
      <path data-viz-painted-mark="true" data-viz-name="fraction-scaling-correspondence" data-viz-owner="scaling" d={`M ${70 + startWidth} 87 Q ${70 + Math.max(startWidth, resultWidth) + 22} 100 ${70 + resultWidth} 111`} fill="none" stroke="#7c3aed" strokeWidth="3" strokeDasharray="7 5" />
      <text x="76" y="46" fill="#0f172a" fontSize="16" fontWeight="700">{t(FRACTION_OPERATIONS_VISUAL_COPY.startingLength)}: {receipt.startingValue}</text>
      <text x="76" y="108" fill="#0f172a" fontSize="16" fontWeight="700">{t(FRACTION_OPERATIONS_VISUAL_COPY.scaledLength)}: {receipt.product}</text>
    </VisualShell>
  );
}

function MeasurementDivision({
  receipt,
  t,
}: {
  receipt: FractionMeasurementVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const [remainderNumerator] = receipt.remainderOfUnit.split("/").map(Number);
  const hasRemainder = remainderNumerator! > 0;
  const semanticGroups = receipt.fullGroups + (hasRemainder ? 1 : 0);
  const markCount = Math.max(semanticGroups, 1);
  const gap = 5;
  const width = (660 - gap * (markCount - 1)) / markCount;
  return (
    <VisualShell
      attributes={{
        "data-viz-available": receipt.available,
        "data-viz-number-of-groups": receipt.numberOfGroups,
        "data-viz-unit-size": receipt.unitSize,
      }}
      kind="measurement-division"
      label={t(FRACTION_OPERATIONS_VISUAL_COPY.measurement)}
      markCount={markCount}
      receipt={receipt}
      summary={`${receipt.available} ÷ ${receipt.unitSize} = ${receipt.numberOfGroups}`}
    >
      {Array.from({ length: markCount }, (_, index) => {
        const isFull = index < receipt.fullGroups;
        return (
          <rect
            key={index}
            data-viz-painted-mark="true"
            data-viz-name={semanticGroups === 0 ? "fraction-measurement-empty" : "fraction-measurement-group"}
            data-viz-owner="measurement-division"
            data-viz-group-index={index}
            data-viz-complete={String(isFull)}
            x={30 + index * (width + gap)}
            y={72}
            width={width}
            height={82}
            rx={8}
            fill={isFull ? "#0f766e" : semanticGroups === 0 ? "#ffffff" : "#f59e0b"}
            stroke="#134e4a"
            strokeWidth="2.4"
            strokeDasharray={isFull ? undefined : "8 5"}
          />
        );
      })}
      <text x="36" y="48" fill="#0f172a" fontSize="16" fontWeight="700">
        {hasRemainder
          ? `${t(FRACTION_OPERATIONS_VISUAL_COPY.partialGroup)}: ${receipt.remainderOfUnit}`
          : `${t(FRACTION_OPERATIONS_VISUAL_COPY.completeGroup)}: ${receipt.fullGroups}`}
      </text>
    </VisualShell>
  );
}

function SharingDivision({
  receipt,
  t,
}: {
  receipt: FractionSharingVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const columns = Math.min(receipt.groupCount, 12);
  const rows = Math.ceil(receipt.groupCount / columns);
  const cellWidth = 660 / columns;
  const cellHeight = 150 / rows;
  return (
    <VisualShell
      attributes={{
        "data-viz-group-count": receipt.groupCount,
        "data-viz-share-per-group": receipt.sharePerGroup,
        "data-viz-total": receipt.total,
      }}
      kind="sharing-division"
      label={t(FRACTION_OPERATIONS_VISUAL_COPY.sharing)}
      markCount={receipt.groupCount}
      receipt={receipt}
      summary={`${receipt.total} ÷ ${receipt.groupCount} = ${receipt.sharePerGroup}; ${t(FRACTION_OPERATIONS_VISUAL_COPY.equalShare)}`}
    >
      {Array.from({ length: receipt.groupCount }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const radius = Math.max(9, Math.min(cellWidth, cellHeight) * 0.31);
        return (
          <circle
            key={index}
            data-viz-painted-mark="true"
            data-viz-name="fraction-sharing-group"
            data-viz-owner="sharing-division"
            data-viz-group-index={index}
            data-viz-share={receipt.sharePerGroup}
            cx={30 + column * cellWidth + cellWidth / 2}
            cy={42 + row * cellHeight + cellHeight / 2}
            r={radius}
            fill="#7c3aed"
            stroke="#4c1d95"
            strokeWidth="3"
          />
        );
      })}
    </VisualShell>
  );
}

export function FractionOperationsVisualModel({
  kind,
  model,
  t,
}: {
  kind: FractionOperationsVisualKind;
  model: FractionOperationsModel;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = buildFractionOperationsVisualReceipt(model, kind);
  if (receipt.status === "unsupported") return null;
  if (receipt.kind === "area-grid") return <AreaGrid receipt={receipt} t={t} />;
  if (receipt.kind === "part-of-quantity") {
    return <PartOfQuantity receipt={receipt} t={t} />;
  }
  if (receipt.kind === "scaling") return <Scaling receipt={receipt} t={t} />;
  if (receipt.kind === "measurement-division") {
    return <MeasurementDivision receipt={receipt} t={t} />;
  }
  return <SharingDivision receipt={receipt} t={t} />;
}
