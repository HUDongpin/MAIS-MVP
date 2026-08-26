export type FluentWithin20OperandSource = "first" | "second";

export type FluentWithin20FrameCell = {
  role: "original" | "anchor" | "moved" | "remaining";
  source: FluentWithin20OperandSource;
} | null;

export type FluentWithin20Operand = {
  source: FluentWithin20OperandSource;
  value: number;
};

export type FluentWithin20MakingTenDisplay = {
  active: boolean;
  anchor: FluentWithin20Operand;
  ariaLabel: string;
  donor: FluentWithin20Operand;
  fillEquation: string | null;
  madeTenFrame: FluentWithin20FrameCell[] | null;
  makeTenEquation: string | null;
  moved: number | null;
  originalFirstFrame: FluentWithin20FrameCell[];
  originalSecondFrame: FluentWithin20FrameCell[];
  remainderFrame: FluentWithin20FrameCell[] | null;
  remaining: number | null;
  splitEquation: string | null;
  sum: number;
};

export type FluentWithin20Strategy = {
  hint: string;
  name: "Count on" | "Doubles" | "Make a ten" | "Near double";
};

function frameCells(
  count: number,
  source: FluentWithin20OperandSource,
  role: Exclude<FluentWithin20FrameCell, null>["role"]
): FluentWithin20FrameCell[] {
  return Array.from({ length: 10 }, (_, index) =>
    index < count ? { role, source } : null
  );
}

function colorName(source: FluentWithin20OperandSource) {
  return source === "first" ? "orange" : "blue";
}

export function buildFluentWithin20MakingTen(
  first: number,
  second: number
): FluentWithin20MakingTenDisplay {
  const sum = first + second;
  const anchor: FluentWithin20Operand = first >= second
    ? { source: "first", value: first }
    : { source: "second", value: second };
  const donor: FluentWithin20Operand = anchor.source === "first"
    ? { source: "second", value: second }
    : { source: "first", value: first };
  const active = first < 10 && second < 10 && sum > 10;
  const moved = active ? 10 - anchor.value : null;
  const remaining = moved === null ? null : donor.value - moved;
  const madeTenFrame = moved === null
    ? null
    : [
        ...frameCells(anchor.value, anchor.source, "anchor").slice(0, anchor.value),
        ...frameCells(moved, donor.source, "moved").slice(0, moved)
      ];
  const remainderFrame = remaining === null
    ? null
    : frameCells(remaining, donor.source, "remaining");

  return {
    active,
    anchor,
    ariaLabel: active && moved !== null && remaining !== null
      ? `Making a ten diagram for ${first} plus ${second}: keep ${anchor.value} ${colorName(anchor.source)} counters together, split ${donor.value} ${colorName(donor.source)} counters into ${moved} and ${remaining}, move ${moved} ${colorName(donor.source)} counters to make 10, then add the remaining ${remaining} to make ${sum}.`
      : `Original ten-frame diagram: the first frame shows ${first} orange counters and the second frame shows ${second} blue counters. ${first} plus ${second} equals ${sum}.`,
    donor,
    fillEquation: moved === null ? null : `${anchor.value} + ${moved} = 10`,
    madeTenFrame,
    makeTenEquation: remaining === null
      ? null
      : `${first} + ${second} = 10 + ${remaining} = ${sum}`,
    moved,
    originalFirstFrame: frameCells(first, "first", "original"),
    originalSecondFrame: frameCells(second, "second", "original"),
    remainderFrame,
    remaining,
    splitEquation: moved === null || remaining === null
      ? null
      : `${donor.value} = ${moved} + ${remaining}`,
    sum
  };
}

export function buildFluentWithin20Strategy(
  first: number,
  second: number,
  makingTen = buildFluentWithin20MakingTen(first, second)
): FluentWithin20Strategy {
  const sum = first + second;
  if (first === second) {
    return {
      hint: `${first} + ${first} is a double you can memorize = ${sum}.`,
      name: "Doubles"
    };
  }
  if (Math.abs(first - second) === 1) {
    const smaller = Math.min(first, second);
    return {
      hint: `${first} + ${second} = ${smaller} + ${smaller} + 1 = ${2 * smaller} + 1 = ${sum}.`,
      name: "Near double"
    };
  }
  if (makingTen.active) {
    return {
      hint: `Fill a ten: ${makingTen.fillEquation}. Split ${makingTen.donor.value} into ${makingTen.moved} + ${makingTen.remaining}, then 10 + ${makingTen.remaining} = ${sum}.`,
      name: "Make a ten"
    };
  }
  return {
    hint: `Start at ${Math.max(first, second)} and count on ${Math.min(first, second)} = ${sum}.`,
    name: "Count on"
  };
}
