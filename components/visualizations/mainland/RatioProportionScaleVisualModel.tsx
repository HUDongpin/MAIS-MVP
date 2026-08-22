import type { ReactNode } from "react";
import type { LocalizedText } from "../../../types";
import type {
  RatioProportionScaleMode,
  RatioProportionScaleState,
  RatioProportionScaleUnit,
} from "./RatioProportionScaleModel";

type UnsupportedRatioProportionScaleVisualReceipt = {
  kind: RatioProportionScaleMode;
  reason: "applicable-model-invariant-not-verified";
  status: "unsupported";
};

export type EquivalentRatiosVisualReceipt = {
  crossProducts: { left: string; right: string };
  firstRatio: { antecedent: string; consequent: string };
  kind: "equivalent-ratios";
  scaleFactor: string;
  secondRatio: { antecedent: string; consequent: string };
  status: "supported";
};

export type DirectProportionVisualReceipt = {
  constantK: { first: string; second: string };
  crossProducts: { left: string; right: string };
  firstPair: { dependent: string; independent: string };
  kind: "direct-proportion";
  scaleFactor: string;
  secondPair: { dependent: string; independent: string };
  status: "supported";
};

export type InverseProportionVisualReceipt = {
  constantProduct: { first: string; second: string };
  firstPair: { first: string; second: string };
  kind: "inverse-proportion";
  scaleFactor: string;
  secondPair: { first: string; second: string };
  status: "supported";
};

export type ScaleDrawingVisualReceipt = {
  actualDimension: { length: string; unit: RatioProportionScaleUnit };
  actualInDrawingUnits: {
    length: string;
    unit: RatioProportionScaleUnit;
  };
  drawingDimension: { length: string; unit: RatioProportionScaleUnit };
  kind: "scale-drawing";
  reconstructionInDrawingUnits: string;
  scaleFactor: string;
  scaleRatio: { actual: string; drawing: string };
  status: "supported";
  unitConversion: {
    actualUnitInMillimetres: string;
    drawingUnitInMillimetres: string;
  };
};

export type RatioProportionScaleVisualReceipt =
  | DirectProportionVisualReceipt
  | EquivalentRatiosVisualReceipt
  | InverseProportionVisualReceipt
  | ScaleDrawingVisualReceipt
  | UnsupportedRatioProportionScaleVisualReceipt;

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const RATIO_PROPORTION_SCALE_VISUAL_COPY = {
  actualLength: localized("Actual length", "實際長度", "实际长度"),
  constant: localized("Invariant", "不變量", "不变量"),
  directProportion: localized(
    "Two points on one direct-proportion ray",
    "同一正比例射線上的兩個點",
    "同一正比例射线上的两个点",
  ),
  drawingLength: localized("Drawing length", "圖上長度", "图上长度"),
  equivalentRatios: localized(
    "Scale both parts by the same factor",
    "把比的兩項乘以同一倍數",
    "把比的两项乘以同一倍数",
  ),
  firstPair: localized("First pair", "第一組", "第一组"),
  firstRatio: localized("First ratio", "第一個比", "第一个比"),
  inverseProportion: localized(
    "Reciprocal scaling preserves the product",
    "互為倒數的縮放保持乘積不變",
    "互为倒数的缩放保持乘积不变",
  ),
  scaleDrawing: localized(
    "Convert the scale drawing to the actual length",
    "把圖上長度換算為實際長度",
    "把图上长度换算为实际长度",
  ),
  scaleFactor: localized("Scale factor", "縮放倍數", "缩放倍数"),
  secondPair: localized("Second pair", "第二組", "第二组"),
  secondRatio: localized("Second ratio", "第二個比", "第二个比"),
  unsupported: localized(
    "This state cannot be shown as verified because its mathematical invariant is not confirmed.",
    "此狀態的數學不變量尚未確認，因此不能顯示為已驗證圖形。",
    "此状态的数学不变量尚未确认，因此不能显示为已验证图形。",
  ),
} as const;

const INVARIANT_FOR_MODE = {
  "direct-proportion": "direct-proportion-constant",
  "equivalent-ratios": "equivalent-ratio-cross-products",
  "inverse-proportion": "inverse-proportion-product",
  "scale-drawing": "scale-drawing-unit-conversion",
} as const;

function hasVerifiedInvariant(model: RatioProportionScaleState) {
  const expectedId = INVARIANT_FOR_MODE[model.mode];
  return model.invariants.some(
    (receipt) =>
      receipt.id === expectedId &&
      receipt.applicable === true &&
      receipt.holds === true &&
      receipt.status === "pass",
  );
}

export function buildRatioProportionScaleVisualReceipt(
  model: RatioProportionScaleState,
): RatioProportionScaleVisualReceipt {
  if (!hasVerifiedInvariant(model)) {
    return {
      kind: model.mode,
      reason: "applicable-model-invariant-not-verified",
      status: "unsupported",
    };
  }
  const receipt = model.visibleReceipt;
  switch (receipt.kind) {
    case "equivalent-ratios":
      return {
        crossProducts: {
          left: receipt.crossProducts.firstASecondB.text,
          right: receipt.crossProducts.firstBSecondA.text,
        },
        firstRatio: {
          antecedent: receipt.firstRatio.antecedent.text,
          consequent: receipt.firstRatio.consequent.text,
        },
        kind: receipt.kind,
        scaleFactor: receipt.scaleFactor.text,
        secondRatio: {
          antecedent: receipt.secondRatio.antecedent.text,
          consequent: receipt.secondRatio.consequent.text,
        },
        status: "supported",
      };
    case "direct-proportion":
      return {
        constantK: {
          first: receipt.constantK.first.text,
          second: receipt.constantK.second.text,
        },
        crossProducts: {
          left: receipt.crossProducts.firstDependentSecondIndependent.text,
          right: receipt.crossProducts.firstIndependentSecondDependent.text,
        },
        firstPair: {
          dependent: receipt.firstPair.dependent.text,
          independent: receipt.firstPair.independent.text,
        },
        kind: receipt.kind,
        scaleFactor: receipt.scaleFactor.text,
        secondPair: {
          dependent: receipt.secondPair.dependent.text,
          independent: receipt.secondPair.independent.text,
        },
        status: "supported",
      };
    case "inverse-proportion":
      return {
        constantProduct: {
          first: receipt.constantProductK.first.text,
          second: receipt.constantProductK.second.text,
        },
        firstPair: {
          first: receipt.firstPair.first.text,
          second: receipt.firstPair.second.text,
        },
        kind: receipt.kind,
        scaleFactor: receipt.scaleFactor.text,
        secondPair: {
          first: receipt.secondPair.first.text,
          second: receipt.secondPair.second.text,
        },
        status: "supported",
      };
    case "scale-drawing":
      return {
        actualDimension: {
          length: receipt.actualDimension.length.text,
          unit: receipt.actualDimension.unit,
        },
        actualInDrawingUnits: {
          length: receipt.actualInDrawingUnits.length.text,
          unit: receipt.actualInDrawingUnits.unit,
        },
        drawingDimension: {
          length: receipt.drawingDimension.length.text,
          unit: receipt.drawingDimension.unit,
        },
        kind: receipt.kind,
        reconstructionInDrawingUnits:
          receipt.reconstructionInDrawingUnits.text,
        scaleFactor: receipt.scaleFactor.text,
        scaleRatio: {
          actual: receipt.scaleRatio.actual.text,
          drawing: receipt.scaleRatio.drawing.text,
        },
        status: "supported",
        unitConversion: {
          actualUnitInMillimetres:
            receipt.unitConversion.actualUnitInMillimetres.text,
          drawingUnitInMillimetres:
            receipt.unitConversion.drawingUnitInMillimetres.text,
        },
      };
  }
}

function numericRational(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    throw new RangeError(`Invalid exact visual rational ${value}.`);
  }
  return numerator! / denominator!;
}

function VisualShell({
  children,
  kind,
  label,
  markCount,
  receipt,
  summary,
}: {
  children: ReactNode;
  kind: RatioProportionScaleMode;
  label: string;
  markCount: number;
  receipt: Exclude<
    RatioProportionScaleVisualReceipt,
    UnsupportedRatioProportionScaleVisualReceipt
  >;
  summary: string;
}) {
  if (!Number.isSafeInteger(markCount) || markCount <= 0) {
    throw new RangeError(`${kind} must expose a nonzero painted-mark receipt.`);
  }
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-black text-slate-900 dark:text-white">
        {label}
      </p>
      <svg
        aria-label={`${label}. ${summary}`}
        className="mt-2 block h-auto w-full min-w-0 rounded-lg bg-white"
        data-viz-geometry-receipt={JSON.stringify(receipt)}
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark-count={markCount}
        data-viz-ratio-proportion-scale-visual={kind}
        data-viz-svg-background="opaque"
        data-viz-verified="true"
        role="img"
        viewBox="0 0 720 280"
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

function EquivalentRatiosVisual({
  receipt,
  t,
}: {
  receipt: EquivalentRatiosVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const bars = [
    {
      exact: receipt.firstRatio.antecedent,
      label: `${t(RATIO_PROPORTION_SCALE_VISUAL_COPY.firstRatio)} A`,
      role: "first-antecedent",
    },
    {
      exact: receipt.firstRatio.consequent,
      label: `${t(RATIO_PROPORTION_SCALE_VISUAL_COPY.firstRatio)} B`,
      role: "first-consequent",
    },
    {
      exact: receipt.secondRatio.antecedent,
      label: `${t(RATIO_PROPORTION_SCALE_VISUAL_COPY.secondRatio)} A`,
      role: "second-antecedent",
    },
    {
      exact: receipt.secondRatio.consequent,
      label: `${t(RATIO_PROPORTION_SCALE_VISUAL_COPY.secondRatio)} B`,
      role: "second-consequent",
    },
  ];
  const maximum = Math.max(...bars.map(({ exact }) => numericRational(exact)));
  const summary = `${receipt.firstRatio.antecedent}:${receipt.firstRatio.consequent} = ${receipt.secondRatio.antecedent}:${receipt.secondRatio.consequent}; ${receipt.crossProducts.left} = ${receipt.crossProducts.right}`;
  return (
    <VisualShell
      kind={receipt.kind}
      label={t(RATIO_PROPORTION_SCALE_VISUAL_COPY.equivalentRatios)}
      markCount={5}
      receipt={receipt}
      summary={summary}
    >
      {bars.map((bar, index) => {
        const y = 42 + index * 52;
        return (
          <g key={bar.role}>
            <text
              fill="#0f172a"
              fontSize="14"
              fontWeight="750"
              x="72"
              y={y - 6}
            >
              {bar.label}: {bar.exact}
            </text>
            <rect
              data-viz-exact={bar.exact}
              data-viz-name="ratio-bar"
              data-viz-owner="ratio-proportion-scale"
              data-viz-painted-mark="true"
              data-viz-role={bar.role}
              fill={index < 2 ? "#2563eb" : "#16a34a"}
              height="22"
              rx="6"
              stroke="#0f172a"
              strokeWidth="2"
              width={(numericRational(bar.exact) / maximum) * 520}
              x="72"
              y={y}
            />
          </g>
        );
      })}
      <path
        d="M 620 68 C 680 90 680 150 620 172"
        data-viz-factor={receipt.scaleFactor}
        data-viz-name="ratio-scale-arrow"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="5"
      />
      <text fill="#581c87" fontSize="15" fontWeight="800" x="635" y="125">
        × {receipt.scaleFactor}
      </text>
    </VisualShell>
  );
}

function DirectProportionVisual({
  receipt,
  t,
}: {
  receipt: DirectProportionVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const firstX = numericRational(receipt.firstPair.independent);
  const firstY = numericRational(receipt.firstPair.dependent);
  const secondX = numericRational(receipt.secondPair.independent);
  const secondY = numericRational(receipt.secondPair.dependent);
  const maxX = Math.max(firstX, secondX);
  const maxY = Math.max(firstY, secondY);
  const point = (x: number, y: number) => ({
    x: 82 + (x / maxX) * 520,
    y: 226 - (y / maxY) * 170,
  });
  const firstPoint = point(firstX, firstY);
  const secondPoint = point(secondX, secondY);
  const summary = `(${receipt.firstPair.independent}, ${receipt.firstPair.dependent}) → (${receipt.secondPair.independent}, ${receipt.secondPair.dependent}); k = ${receipt.constantK.first}`;
  return (
    <VisualShell
      kind={receipt.kind}
      label={t(RATIO_PROPORTION_SCALE_VISUAL_COPY.directProportion)}
      markCount={5}
      receipt={receipt}
      summary={summary}
    >
      <line
        data-viz-name="direct-axis"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        stroke="#334155"
        strokeWidth="3"
        x1="82"
        x2="630"
        y1="226"
        y2="226"
      />
      <line
        data-viz-name="direct-axis"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        stroke="#334155"
        strokeWidth="3"
        x1="82"
        x2="82"
        y1="226"
        y2="38"
      />
      <line
        data-viz-constant={receipt.constantK.first}
        data-viz-name="direct-ray"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        stroke="#7c3aed"
        strokeWidth="4"
        x1="82"
        x2={secondPoint.x}
        y1="226"
        y2={secondPoint.y}
      />
      {[
        {
          exact: `(${receipt.firstPair.independent},${receipt.firstPair.dependent})`,
          label: t(RATIO_PROPORTION_SCALE_VISUAL_COPY.firstPair),
          point: firstPoint,
          role: "first",
        },
        {
          exact: `(${receipt.secondPair.independent},${receipt.secondPair.dependent})`,
          label: t(RATIO_PROPORTION_SCALE_VISUAL_COPY.secondPair),
          point: secondPoint,
          role: "second",
        },
      ].map((entry) => (
        <g key={entry.role}>
          <circle
            cx={entry.point.x}
            cy={entry.point.y}
            data-viz-exact={entry.exact}
            data-viz-name="direct-point"
            data-viz-owner="ratio-proportion-scale"
            data-viz-painted-mark="true"
            data-viz-role={entry.role}
            fill={entry.role === "first" ? "#2563eb" : "#16a34a"}
            r="9"
            stroke="#0f172a"
            strokeWidth="2"
          />
          <text
            fill="#0f172a"
            fontSize="14"
            fontWeight="750"
            x={Math.min(entry.point.x + 12, 520)}
            y={entry.point.y - 10}
          >
            {entry.label}: {entry.exact}
          </text>
        </g>
      ))}
      <text fill="#581c87" fontSize="16" fontWeight="800" x="450" y="260">
        {t(RATIO_PROPORTION_SCALE_VISUAL_COPY.constant)} k = {receipt.constantK.first}
      </text>
    </VisualShell>
  );
}

function InverseProportionVisual({
  receipt,
  t,
}: {
  receipt: InverseProportionVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const pairs = [receipt.firstPair, receipt.secondPair];
  const maxFirst = Math.max(...pairs.map((pair) => numericRational(pair.first)));
  const maxSecond = Math.max(...pairs.map((pair) => numericRational(pair.second)));
  const summary = `${receipt.firstPair.first} × ${receipt.firstPair.second} = ${receipt.secondPair.first} × ${receipt.secondPair.second} = ${receipt.constantProduct.first}`;
  return (
    <VisualShell
      kind={receipt.kind}
      label={t(RATIO_PROPORTION_SCALE_VISUAL_COPY.inverseProportion)}
      markCount={3}
      receipt={receipt}
      summary={summary}
    >
      {pairs.map((pair, index) => {
        const width = (numericRational(pair.first) / maxFirst) * 230;
        const height = (numericRational(pair.second) / maxSecond) * 150;
        const x = index === 0 ? 72 : 414;
        const y = 212 - height;
        return (
          <g key={index === 0 ? "first" : "second"}>
            <rect
              data-viz-area={
                index === 0
                  ? receipt.constantProduct.first
                  : receipt.constantProduct.second
              }
              data-viz-first={pair.first}
              data-viz-name="inverse-area"
              data-viz-owner="ratio-proportion-scale"
              data-viz-painted-mark="true"
              data-viz-second={pair.second}
              fill={index === 0 ? "#2563eb" : "#16a34a"}
              height={height}
              opacity="0.88"
              stroke="#0f172a"
              strokeWidth="3"
              width={width}
              x={x}
              y={y}
            />
            <text fill="#0f172a" fontSize="15" fontWeight="800" x={x} y="238">
              {index === 0
                ? t(RATIO_PROPORTION_SCALE_VISUAL_COPY.firstPair)
                : t(RATIO_PROPORTION_SCALE_VISUAL_COPY.secondPair)}
              : {pair.first} × {pair.second}
            </text>
          </g>
        );
      })}
      <path
        d="M 320 130 C 350 90 370 90 400 130"
        data-viz-factor={receipt.scaleFactor}
        data-viz-name="inverse-transform-arrow"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="5"
      />
      <text fill="#581c87" fontSize="15" fontWeight="800" x="322" y="82">
        × {receipt.scaleFactor}, ÷ {receipt.scaleFactor}
      </text>
    </VisualShell>
  );
}

function ScaleDrawingVisual({
  receipt,
  t,
}: {
  receipt: ScaleDrawingVisualReceipt;
  t: (copy: LocalizedText) => string;
}) {
  const drawingLength = numericRational(receipt.drawingDimension.length);
  const actualInDrawingUnits = numericRational(
    receipt.actualInDrawingUnits.length,
  );
  const maximum = Math.max(drawingLength, actualInDrawingUnits);
  const scale = 520 / maximum;
  const summary = `${receipt.drawingDimension.length} ${receipt.drawingDimension.unit} × ${receipt.scaleFactor} = ${receipt.actualInDrawingUnits.length} ${receipt.actualInDrawingUnits.unit} = ${receipt.actualDimension.length} ${receipt.actualDimension.unit}`;
  return (
    <VisualShell
      kind={receipt.kind}
      label={t(RATIO_PROPORTION_SCALE_VISUAL_COPY.scaleDrawing)}
      markCount={3}
      receipt={receipt}
      summary={summary}
    >
      <text fill="#0f172a" fontSize="15" fontWeight="800" x="72" y="52">
        {t(RATIO_PROPORTION_SCALE_VISUAL_COPY.drawingLength)}: {receipt.drawingDimension.length} {receipt.drawingDimension.unit}
      </text>
      <line
        data-viz-exact={receipt.drawingDimension.length}
        data-viz-name="scale-length"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        data-viz-role="drawing"
        data-viz-unit={receipt.drawingDimension.unit}
        stroke="#2563eb"
        strokeLinecap="round"
        strokeWidth="8"
        x1="72"
        x2={72 + drawingLength * scale}
        y1="76"
        y2="76"
      />
      <path
        d="M 335 100 C 350 125 350 135 335 160"
        data-viz-factor={receipt.scaleFactor}
        data-viz-name="scale-conversion-arrow"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="5"
      />
      <text fill="#581c87" fontSize="15" fontWeight="800" x="360" y="134">
        × {receipt.scaleFactor}
      </text>
      <text fill="#0f172a" fontSize="15" fontWeight="800" x="72" y="190">
        {t(RATIO_PROPORTION_SCALE_VISUAL_COPY.actualLength)}: {receipt.actualDimension.length} {receipt.actualDimension.unit}
      </text>
      <line
        data-viz-actual-exact={receipt.actualDimension.length}
        data-viz-actual-unit={receipt.actualDimension.unit}
        data-viz-exact={receipt.actualInDrawingUnits.length}
        data-viz-name="scale-length"
        data-viz-owner="ratio-proportion-scale"
        data-viz-painted-mark="true"
        data-viz-role="actual-in-drawing-units"
        data-viz-unit={receipt.actualInDrawingUnits.unit}
        stroke="#16a34a"
        strokeLinecap="round"
        strokeWidth="8"
        x1="72"
        x2={72 + actualInDrawingUnits * scale}
        y1="216"
        y2="216"
      />
      <text fill="#0f172a" fontSize="14" fontWeight="750" x="72" y="248">
        {receipt.actualInDrawingUnits.length} {receipt.actualInDrawingUnits.unit} = {receipt.actualDimension.length} {receipt.actualDimension.unit}
      </text>
    </VisualShell>
  );
}

export function RatioProportionScaleVisualModel({
  model,
  t,
}: {
  model: RatioProportionScaleState;
  t: (copy: LocalizedText) => string;
}) {
  const receipt = buildRatioProportionScaleVisualReceipt(model);
  if (receipt.status === "unsupported") {
    return (
      <aside
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        data-viz-ratio-proportion-scale-visual-status="unsupported"
        data-viz-unsupported-kind={receipt.kind}
        data-viz-unsupported-reason={receipt.reason}
      >
        {t(RATIO_PROPORTION_SCALE_VISUAL_COPY.unsupported)}
      </aside>
    );
  }
  switch (receipt.kind) {
    case "equivalent-ratios":
      return <EquivalentRatiosVisual receipt={receipt} t={t} />;
    case "direct-proportion":
      return <DirectProportionVisual receipt={receipt} t={t} />;
    case "inverse-proportion":
      return <InverseProportionVisual receipt={receipt} t={t} />;
    case "scale-drawing":
      return <ScaleDrawingVisual receipt={receipt} t={t} />;
  }
}
