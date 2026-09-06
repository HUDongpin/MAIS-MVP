import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFluentWithin20MakingTen,
  buildFluentWithin20Strategy,
  type FluentWithin20FrameCell
} from "./fluentWithin20MakingTen";

function countCells(
  cells: FluentWithin20FrameCell[] | null,
  source: "first" | "second",
  role?: "original" | "anchor" | "moved" | "remaining"
) {
  return (cells ?? []).filter((cell) =>
    cell?.source === source && (role === undefined || cell.role === role)
  ).length;
}

test("the default 8 + 7 model preserves both operands, moves 2 blue counters, and shows 10 + 5", () => {
  const display = buildFluentWithin20MakingTen(8, 7);

  assert.equal(display.active, true);
  assert.deepEqual(display.anchor, { source: "first", value: 8 });
  assert.deepEqual(display.donor, { source: "second", value: 7 });
  assert.equal(display.moved, 2);
  assert.equal(display.remaining, 5);
  assert.equal(display.fillEquation, "8 + 2 = 10");
  assert.equal(display.splitEquation, "7 = 2 + 5");
  assert.equal(display.makeTenEquation, "8 + 7 = 10 + 5 = 15");
  assert.equal(countCells(display.originalFirstFrame, "first", "original"), 8);
  assert.equal(countCells(display.originalSecondFrame, "second", "original"), 7);
  assert.equal(countCells(display.madeTenFrame, "first", "anchor"), 8);
  assert.equal(countCells(display.madeTenFrame, "second", "moved"), 2);
  assert.equal(countCells(display.remainderFrame, "second", "remaining"), 5);
  assert.equal(
    display.ariaLabel,
    "Making a ten diagram for 8 plus 7: keep 8 orange counters together, split 7 blue counters into 2 and 5, move 2 blue counters to make 10, then add the remaining 5 to make 15."
  );
});

test("a crossing-ten double keeps the doubles strategy available while showing a natural 4 and 2 split", () => {
  const display = buildFluentWithin20MakingTen(6, 6);

  assert.equal(display.active, true);
  assert.deepEqual(display.anchor, { source: "first", value: 6 });
  assert.deepEqual(display.donor, { source: "second", value: 6 });
  assert.equal(display.moved, 4);
  assert.equal(display.remaining, 2);
  assert.equal(display.splitEquation, "6 = 4 + 2");
  assert.equal(display.makeTenEquation, "6 + 6 = 10 + 2 = 12");
});

test("a crossing-ten near double anchors the larger addend instead of moving extra counters", () => {
  const display = buildFluentWithin20MakingTen(6, 7);

  assert.equal(display.active, true);
  assert.deepEqual(display.anchor, { source: "second", value: 7 });
  assert.deepEqual(display.donor, { source: "first", value: 6 });
  assert.equal(display.moved, 3);
  assert.equal(display.remaining, 3);
  assert.equal(display.fillEquation, "7 + 3 = 10");
  assert.equal(display.splitEquation, "6 = 3 + 3");
  assert.equal(display.makeTenEquation, "6 + 7 = 10 + 3 = 13");
  assert.equal(countCells(display.madeTenFrame, "second", "anchor"), 7);
  assert.equal(countCells(display.madeTenFrame, "first", "moved"), 3);
  assert.equal(countCells(display.remainderFrame, "first", "remaining"), 3);
});

test("4 + 8 and 8 + 4 use the same natural decomposition while preserving operand color sources", () => {
  const first = buildFluentWithin20MakingTen(4, 8);
  const commuted = buildFluentWithin20MakingTen(8, 4);

  for (const display of [first, commuted]) {
    assert.equal(display.active, true);
    assert.equal(display.anchor.value, 8);
    assert.equal(display.donor.value, 4);
    assert.equal(display.moved, 2);
    assert.equal(display.remaining, 2);
    assert.equal(display.fillEquation, "8 + 2 = 10");
  }
  assert.deepEqual(first.anchor, { source: "second", value: 8 });
  assert.deepEqual(first.donor, { source: "first", value: 4 });
  assert.deepEqual(commuted.anchor, { source: "first", value: 8 });
  assert.deepEqual(commuted.donor, { source: "second", value: 4 });
  assert.equal(countCells(first.madeTenFrame, "first", "moved"), 2);
  assert.equal(countCells(commuted.madeTenFrame, "second", "moved"), 2);
});

test("non-crossing and already-ten boundaries keep only the original operand frames", () => {
  for (const [first, second] of [
    [1, 1], [5, 5], [4, 6], [10, 1], [1, 10], [10, 10]
  ]) {
    const display = buildFluentWithin20MakingTen(first, second);

    assert.equal(display.active, false);
    assert.equal(display.moved, null);
    assert.equal(display.remaining, null);
    assert.equal(display.fillEquation, null);
    assert.equal(display.splitEquation, null);
    assert.equal(display.makeTenEquation, null);
    assert.equal(display.madeTenFrame, null);
    assert.equal(display.remainderFrame, null);
    assert.doesNotMatch(display.ariaLabel, /move 0/iu);
    assert.equal(countCells(display.originalFirstFrame, "first", "original"), first);
    assert.equal(countCells(display.originalSecondFrame, "second", "original"), second);
  }
});

test("all 1 through 10 operand pairs conserve every counter and commute mathematically", () => {
  for (let first = 1; first <= 10; first += 1) {
    for (let second = 1; second <= 10; second += 1) {
      const display = buildFluentWithin20MakingTen(first, second);
      const commuted = buildFluentWithin20MakingTen(second, first);
      const shouldMakeTen = first < 10 && second < 10 && first + second > 10;

      assert.equal(display.active, shouldMakeTen, `${first} + ${second} active`);
      assert.equal(countCells(display.originalFirstFrame, "first", "original"), first);
      assert.equal(countCells(display.originalSecondFrame, "second", "original"), second);
      assert.equal(display.originalFirstFrame.length, 10);
      assert.equal(display.originalSecondFrame.length, 10);
      assert.equal(display.anchor.value, Math.max(first, second));
      assert.equal(display.donor.value, Math.min(first, second));
      assert.equal(display.sum, first + second);
      assert.ok(display.sum >= 2 && display.sum <= 20);

      assert.deepEqual(
        {
          active: display.active,
          anchor: display.anchor.value,
          donor: display.donor.value,
          moved: display.moved,
          remaining: display.remaining,
          sum: display.sum
        },
        {
          active: commuted.active,
          anchor: commuted.anchor.value,
          donor: commuted.donor.value,
          moved: commuted.moved,
          remaining: commuted.remaining,
          sum: commuted.sum
        },
        `${first} + ${second} commutes`
      );

      if (!display.active) continue;
      assert.ok(display.moved !== null && display.moved > 0);
      assert.ok(display.remaining !== null && display.remaining > 0);
      assert.equal(display.anchor.value + display.moved, 10);
      assert.equal(display.moved + display.remaining, display.donor.value);
      assert.equal(
        countCells(display.madeTenFrame, "first")
          + countCells(display.remainderFrame, "first"),
        first
      );
      assert.equal(
        countCells(display.madeTenFrame, "second")
          + countCells(display.remainderFrame, "second"),
        second
      );
      assert.equal((display.madeTenFrame ?? []).filter(Boolean).length, 10);
      assert.equal((display.remainderFrame ?? []).filter(Boolean).length, display.remaining);
      assert.equal(display.madeTenFrame?.length, 10);
      assert.equal(display.remainderFrame?.length, 10);
    }
  }
});

test("all 100 states retain the existing doubles, near-double, make-ten, count-on priority", () => {
  const counts = new Map<string, number>();
  for (let first = 1; first <= 10; first += 1) {
    for (let second = 1; second <= 10; second += 1) {
      const strategy = buildFluentWithin20Strategy(
        first,
        second,
        buildFluentWithin20MakingTen(first, second)
      );
      counts.set(strategy.name, (counts.get(strategy.name) ?? 0) + 1);
      assert.equal(
        strategy.name,
        buildFluentWithin20Strategy(
          second,
          first,
          buildFluentWithin20MakingTen(second, first)
        ).name,
        `${first} + ${second} strategy must commute`
      );
    }
  }

  assert.deepEqual(Object.fromEntries(counts), {
    "Count on": 48,
    Doubles: 10,
    "Make a ten": 24,
    "Near double": 18
  });
  assert.equal(buildFluentWithin20Strategy(8, 7).name, "Near double");
  assert.equal(buildFluentWithin20Strategy(6, 6).name, "Doubles");
  assert.deepEqual(buildFluentWithin20Strategy(4, 8), {
    hint: "Fill a ten: 8 + 2 = 10. Split 4 into 2 + 2, then 10 + 2 = 12.",
    name: "Make a ten"
  });
  assert.equal(buildFluentWithin20Strategy(4, 6).name, "Count on");
});
