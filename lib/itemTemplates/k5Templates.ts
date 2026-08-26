import type { GradeId } from "../../types";

/**
 * Verified K-5 item template families.
 *
 * WHY THIS EXISTS: `scripts/audit-us-math-item-quality.mjs` can independently
 * re-solve an item only when the item names a `generationTemplate` and a solver
 * exists that re-derives the answer FROM THE STUDENT-VISIBLE PROMPT. Before this
 * module, exactly one of the sixteen question packs in the repo carried any
 * `generationTemplate` at all — `us-ca-math-g6-g12-generated-bank-v2-1500`,
 * 1,500 items, 67 families, grades 6-12 only. Every K-5 pack, California's
 * included, carried zero:
 *
 *   ccss-textbook-practice-v1                        810 items, 0 templated
 *   us-ca-k5-knowledge-point-practice-v1             492 items, 0 templated
 *   us-ca-math-k-g5-generated-bank-v3-deepseek-1500  1500 items, 0 templated
 *   us-ar-math-k-g5-generated-bank-v1-1500           1500 items, 0 templated
 *
 * So California's much-cited 100% independent re-solve rate is a grades-6-12
 * fact, and there was no verified K-5 asset for any state to inherit. Arkansas
 * K-5 — 174 of its 209 topics — could never pass a launch gate that requires
 * verified practice, no matter how good its crosswalk was.
 *
 * This is a SHARED asset, not a per-state one: every state that adopts a K-5
 * concept inherits the family that verifies it, so the cost is paid once.
 *
 * THE CONTRACT each family keeps:
 *   generate(seed) is deterministic — same seed, same item, forever.
 *   solve(prompt) re-derives the answer by PARSING THE PROMPT TEXT, never by
 *   reading stored parameters. That is what makes it an independent check:
 *   if the prompt and the key drift apart, the solver catches it.
 */

export type K5GeneratedItem = {
  templateId: string;
  prompt: string;
  answer: number;
  /** The parameters used, for provenance. Solvers must never read these. */
  params: Record<string, number>;
};

export type K5ItemTemplate = {
  id: string;
  grades: readonly GradeId[];
  /** CCSS ids this family generates practice for. */
  ccss: readonly string[];
  generate: (seed: number) => K5GeneratedItem;
  /** Independent re-solve from the prompt text alone. `null` = not my shape. */
  solve: (prompt: string) => number | null;
};

/**
 * Deterministic pseudo-random source. A plain LCG rather than `Math.random`, so
 * a seed always reproduces the same item — a generated bank has to be
 * regenerable byte-for-byte to be auditable.
 */
function rng(seed: number) {
  let state = (seed * 1664525 + 1013904223) >>> 0;
  return (min: number, max: number) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}

function item(templateId: string, prompt: string, answer: number, params: Record<string, number>): K5GeneratedItem {
  return { templateId, prompt, answer, params };
}

/** Parse helper: first capture group as a number, or null when no match. */
function parse(prompt: string, pattern: RegExp, compute: (nums: number[]) => number): number | null {
  const match = prompt.match(pattern);
  if (!match) return null;
  const nums = match.slice(1).map((value) => Number(value.replace(/,/g, "")));
  if (nums.some((value) => Number.isNaN(value))) return null;
  return compute(nums);
}

const ordinalWord = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const k5ItemTemplates: readonly K5ItemTemplate[] = [
  // --- Counting and cardinality -------------------------------------------
  {
    id: "k5_count_next",
    grades: ["K", "P1"],
    ccss: ["K.CC.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const n = r(1, 98);
      return item("k5_count_next", `What number comes right after ${n}?`, n + 1, { n });
    },
    solve: (p) => parse(p, /^What number comes right after (\d+)\?$/, ([n]) => n + 1)
  },
  {
    id: "k5_count_before",
    grades: ["K", "P1"],
    ccss: ["K.CC.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const n = r(2, 99);
      return item("k5_count_before", `What number comes right before ${n}?`, n - 1, { n });
    },
    solve: (p) => parse(p, /^What number comes right before (\d+)\?$/, ([n]) => n - 1)
  },
  {
    id: "k5_skip_count",
    grades: ["K", "P1", "P2"],
    ccss: ["K.CC.A.1", "2.NBT.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const step = [2, 5, 10][r(0, 2)];
      const start = step * r(1, 12);
      return item(
        "k5_skip_count",
        `Skip count by ${step}s. What number comes after ${start}?`,
        start + step,
        { step, start }
      );
    },
    solve: (p) => parse(p, /^Skip count by (\d+)s\. What number comes after (\d+)\?$/, ([step, start]) => start + step)
  },
  {
    id: "k5_compare_numbers",
    grades: ["K", "P1"],
    ccss: ["K.CC.C.7", "1.NBT.B.3"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(1, 99);
      let b = r(1, 99);
      if (b === a) b = a === 99 ? a - 1 : a + 1;
      return item("k5_compare_numbers", `Which number is greater, ${a} or ${b}?`, Math.max(a, b), { a, b });
    },
    solve: (p) => parse(p, /^Which number is greater, (\d+) or (\d+)\?$/, ([a, b]) => Math.max(a, b))
  },
  {
    id: "k5_teen_ones",
    grades: ["K", "P1"],
    ccss: ["K.NBT.A.1", "1.NBT.B.2"],
    generate: (seed) => {
      const r = rng(seed);
      const ones = r(1, 9);
      const n = 10 + ones;
      return item("k5_teen_ones", `${n} is made of one ten and how many ones?`, ones, { n });
    },
    solve: (p) => parse(p, /^(\d+) is made of one ten and how many ones\?$/, ([n]) => n - 10)
  },

  // --- Addition and subtraction -------------------------------------------
  {
    id: "k5_add_within_10",
    grades: ["K", "P1"],
    ccss: ["K.OA.A.2", "1.OA.C.6"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(1, 5);
      const b = r(1, 10 - a);
      return item("k5_add_within_10", `What is ${a} + ${b}?`, a + b, { a, b });
    },
    solve: (p) => parse(p, /^What is (\d+) \+ (\d+)\?$/, ([a, b]) => a + b)
  },
  {
    id: "k5_sub_within_10",
    grades: ["K", "P1"],
    ccss: ["K.OA.A.2", "1.OA.C.6"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(2, 10);
      const b = r(1, a - 1);
      return item("k5_sub_within_10", `What is ${a} - ${b}?`, a - b, { a, b });
    },
    solve: (p) => parse(p, /^What is (\d+) - (\d+)\?$/, ([a, b]) => a - b)
  },
  {
    id: "k5_make_ten",
    grades: ["K", "P1"],
    ccss: ["K.OA.A.4", "1.OA.C.6"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(1, 9);
      return item("k5_make_ten", `What number added to ${a} makes 10?`, 10 - a, { a });
    },
    solve: (p) => parse(p, /^What number added to (\d+) makes 10\?$/, ([a]) => 10 - a)
  },
  {
    id: "k5_decompose_within_ten",
    grades: ["K", "P1"],
    ccss: ["K.OA.A.3"],
    generate: (seed) => {
      const r = rng(seed);
      const total = r(3, 10);
      const part = r(1, total - 1);
      return item("k5_decompose_within_ten", `${total} = ${part} + what number?`, total - part, { total, part });
    },
    solve: (p) => parse(p, /^(\d+) = (\d+) \+ what number\?$/, ([total, part]) => total - part)
  },
  {
    id: "k5_add_within_20",
    grades: ["P1", "P2"],
    ccss: ["1.OA.C.6", "2.OA.B.2"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(6, 14);
      const b = r(2, 20 - a);
      return item("k5_add_within_20", `Add: ${a} + ${b} = ?`, a + b, { a, b });
    },
    solve: (p) => parse(p, /^Add: (\d+) \+ (\d+) = \?$/, ([a, b]) => a + b)
  },
  {
    id: "k5_sub_within_20",
    grades: ["P1", "P2"],
    ccss: ["1.OA.C.6", "2.OA.B.2"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(11, 20);
      const b = r(2, 9);
      return item("k5_sub_within_20", `Subtract: ${a} - ${b} = ?`, a - b, { a, b });
    },
    solve: (p) => parse(p, /^Subtract: (\d+) - (\d+) = \?$/, ([a, b]) => a - b)
  },
  {
    id: "k5_add_within_100",
    grades: ["P1", "P2"],
    ccss: ["1.NBT.C.4", "2.NBT.B.5"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(11, 60);
      const b = r(11, 99 - a);
      return item("k5_add_within_100", `Find the sum of ${a} and ${b}.`, a + b, { a, b });
    },
    solve: (p) => parse(p, /^Find the sum of (\d+) and (\d+)\.$/, ([a, b]) => a + b)
  },
  {
    id: "k5_sub_within_100",
    grades: ["P2"],
    ccss: ["2.NBT.B.5"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(40, 99);
      const b = r(11, a - 10);
      return item("k5_sub_within_100", `Find the difference of ${a} and ${b}.`, a - b, { a, b });
    },
    solve: (p) => parse(p, /^Find the difference of (\d+) and (\d+)\.$/, ([a, b]) => a - b)
  },
  {
    id: "k5_add_within_1000",
    grades: ["P2", "P3"],
    ccss: ["2.NBT.B.7", "3.NBT.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(120, 600);
      const b = r(120, 999 - a);
      return item("k5_add_within_1000", `Add: ${a} + ${b}`, a + b, { a, b });
    },
    solve: (p) => parse(p, /^Add: (\d+) \+ (\d+)$/, ([a, b]) => a + b)
  },
  {
    id: "k5_sub_within_1000",
    grades: ["P2", "P3"],
    ccss: ["2.NBT.B.7", "3.NBT.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(400, 999);
      const b = r(110, a - 100);
      return item("k5_sub_within_1000", `Subtract: ${a} - ${b}`, a - b, { a, b });
    },
    solve: (p) => parse(p, /^Subtract: (\d+) - (\d+)$/, ([a, b]) => a - b)
  },
  {
    id: "k5_arithmetic_pattern",
    grades: ["P3", "P4"],
    ccss: ["3.OA.D.9", "4.OA.C.5"],
    generate: (seed) => {
      const r = rng(seed);
      const start = r(2, 12);
      const step = r(2, 9);
      const terms = [start, start + step, start + 2 * step, start + 3 * step];
      return item(
        "k5_arithmetic_pattern",
        `A pattern starts at ${terms[0]} and adds ${step} each time: ${terms.join(", ")}. What is the next number?`,
        start + 4 * step,
        { start, step }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^A pattern starts at (\d+) and adds (\d+) each time: [\d, ]+\. What is the next number\?$/,
        ([start, step]) => start + 4 * step
      )
  },

  // --- Multiplication and division ----------------------------------------
  {
    id: "k5_mult_fact",
    grades: ["P3", "P4"],
    ccss: ["3.OA.C.7"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(2, 12);
      const b = r(2, 12);
      return item("k5_mult_fact", `What is ${a} x ${b}?`, a * b, { a, b });
    },
    solve: (p) => parse(p, /^What is (\d+) x (\d+)\?$/, ([a, b]) => a * b)
  },
  {
    id: "k5_div_fact",
    grades: ["P3", "P4"],
    ccss: ["3.OA.C.7", "3.OA.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const b = r(2, 12);
      const q = r(2, 12);
      return item("k5_div_fact", `What is ${b * q} divided by ${b}?`, q, { b, q });
    },
    solve: (p) => parse(p, /^What is (\d+) divided by (\d+)\?$/, ([a, b]) => a / b)
  },
  {
    id: "k5_missing_factor",
    grades: ["P3", "P4"],
    ccss: ["3.OA.A.4"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(2, 12);
      const q = r(2, 12);
      return item("k5_missing_factor", `${a} x ? = ${a * q}. What is the missing factor?`, q, { a, q });
    },
    solve: (p) => parse(p, /^(\d+) x \? = (\d+)\. What is the missing factor\?$/, ([a, product]) => product / a)
  },
  {
    id: "k5_multi_digit_multiply",
    grades: ["P4", "P5"],
    ccss: ["4.NBT.B.5", "5.NBT.B.5"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(12, 99);
      const b = r(11, 39);
      return item("k5_multi_digit_multiply", `Multiply: ${a} x ${b}`, a * b, { a, b });
    },
    solve: (p) => parse(p, /^Multiply: (\d+) x (\d+)$/, ([a, b]) => a * b)
  },
  {
    id: "k5_divide_multi_digit",
    grades: ["P4", "P5"],
    ccss: ["4.NBT.B.6", "5.NBT.B.6"],
    generate: (seed) => {
      const r = rng(seed);
      const b = r(3, 25);
      const q = r(4, 40);
      return item("k5_divide_multi_digit", `Divide: ${b * q} / ${b}`, q, { b, q });
    },
    solve: (p) => parse(p, /^Divide: (\d+) \/ (\d+)$/, ([a, b]) => a / b)
  },
  {
    id: "k5_multiply_power_of_ten",
    grades: ["P4", "P5"],
    ccss: ["5.NBT.A.2"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(2, 99);
      const power = [10, 100, 1000][r(0, 2)];
      return item("k5_multiply_power_of_ten", `What is ${a} x ${power}?`, a * power, { a, power });
    },
    // Deliberately the same surface shape as k5_mult_fact: both compute a
    // product, so the two solvers agree wherever both parse. Agreement, not
    // exclusivity, is the invariant the self-test enforces.
    solve: (p) => parse(p, /^What is (\d+) x (\d+)\?$/, ([a, b]) => a * b)
  },

  // --- Place value and rounding -------------------------------------------
  {
    id: "k5_place_value_digit",
    grades: ["P2", "P3", "P4"],
    ccss: ["2.NBT.A.1", "4.NBT.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const digit = r(1, 9);
      const place = [1, 10, 100, 1000][r(0, 3)];
      const filler = r(1, 9);
      const n = digit * place + (place === 1 ? filler * 10 : filler);
      return item(
        "k5_place_value_digit",
        `In the number ${n}, what is the value of the digit in the ${placeName(place)} place?`,
        digit * place,
        { n, place, digit }
      );
    },
    solve: (p) => {
      const match = p.match(/^In the number (\d+), what is the value of the digit in the (ones|tens|hundreds|thousands) place\?$/);
      if (!match) return null;
      const n = Number(match[1]);
      const place = placeValue(match[2]);
      return Math.floor(n / place) % 10 * place;
    }
  },
  {
    id: "k5_round_to_ten",
    grades: ["P3"],
    ccss: ["3.NBT.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const n = r(11, 989);
      return item("k5_round_to_ten", `Round ${n} to the nearest ten.`, Math.round(n / 10) * 10, { n });
    },
    solve: (p) => parse(p, /^Round (\d+) to the nearest ten\.$/, ([n]) => Math.round(n / 10) * 10)
  },
  {
    id: "k5_round_to_hundred",
    grades: ["P3", "P4"],
    ccss: ["3.NBT.A.1", "4.NBT.A.3"],
    generate: (seed) => {
      const r = rng(seed);
      const n = r(120, 9800);
      return item("k5_round_to_hundred", `Round ${n} to the nearest hundred.`, Math.round(n / 100) * 100, { n });
    },
    solve: (p) => parse(p, /^Round (\d+) to the nearest hundred\.$/, ([n]) => Math.round(n / 100) * 100)
  },

  // --- Fractions -----------------------------------------------------------
  {
    id: "k5_equivalent_fraction_numerator",
    grades: ["P3", "P4"],
    ccss: ["3.NF.A.3", "4.NF.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const den = r(2, 9);
      const num = r(1, den - 1 || 1);
      const factor = r(2, 6);
      return item(
        "k5_equivalent_fraction_numerator",
        `Complete the equivalent fraction: ${num}/${den} = ?/${den * factor}. What is the missing numerator?`,
        num * factor,
        { num, den, factor }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^Complete the equivalent fraction: (\d+)\/(\d+) = \?\/(\d+)\. What is the missing numerator\?$/,
        ([num, den, newDen]) => (num * newDen) / den
      )
  },
  {
    id: "k5_add_fractions_like",
    grades: ["P4"],
    ccss: ["4.NF.B.3"],
    generate: (seed) => {
      const r = rng(seed);
      const den = r(3, 12);
      const a = r(1, den - 2 || 1);
      const b = r(1, den - a - 1 || 1);
      return item(
        "k5_add_fractions_like",
        `What is ${a}/${den} + ${b}/${den}? Write only the numerator, in ${ordinalDen(den)}.`,
        a + b,
        { a, b, den }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^What is (\d+)\/(\d+) \+ (\d+)\/(\d+)\? Write only the numerator, in [a-z-]+\.$/,
        ([a, denA, b, denB]) => (denA === denB ? a + b : Number.NaN)
      )
  },
  {
    id: "k5_fraction_of_number",
    grades: ["P4", "P5"],
    ccss: ["4.NF.B.4", "5.NF.B.4"],
    generate: (seed) => {
      const r = rng(seed);
      const den = [2, 3, 4, 5, 6][r(0, 4)];
      const num = r(1, den - 1 || 1);
      const whole = den * r(2, 12);
      return item("k5_fraction_of_number", `What is ${num}/${den} of ${whole}?`, (whole / den) * num, { num, den, whole });
    },
    solve: (p) => parse(p, /^What is (\d+)\/(\d+) of (\d+)\?$/, ([num, den, whole]) => (whole / den) * num)
  },
  {
    id: "k5_unit_fraction_parts",
    grades: ["P3"],
    ccss: ["3.NF.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const den = r(2, 12);
      return item(
        "k5_unit_fraction_parts",
        `A whole is cut into equal parts and each part is 1/${den} of the whole. How many parts make the whole?`,
        den,
        { den }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^A whole is cut into equal parts and each part is 1\/(\d+) of the whole\. How many parts make the whole\?$/,
        ([den]) => den
      )
  },

  // --- Measurement and data -----------------------------------------------
  {
    id: "k5_length_conversion",
    grades: ["P4", "P5"],
    ccss: ["4.MD.A.1", "5.MD.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const meters = r(2, 40);
      return item("k5_length_conversion", `How many centimetres are in ${meters} metres?`, meters * 100, { meters });
    },
    solve: (p) => parse(p, /^How many centimetres are in (\d+) metres\?$/, ([m]) => m * 100)
  },
  {
    id: "k5_elapsed_minutes",
    grades: ["P3"],
    ccss: ["3.MD.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const startHour = r(1, 11);
      const startMin = r(0, 30);
      const length = r(5, 55);
      const endMin = startMin + length;
      const endHour = startHour + Math.floor(endMin / 60);
      return item(
        "k5_elapsed_minutes",
        `A lesson starts at ${pad(startHour)}:${pad(startMin)} and ends at ${pad(endHour)}:${pad(endMin % 60)}. How many minutes long is it?`,
        length,
        { length }
      );
    },
    solve: (p) => {
      const match = p.match(/^A lesson starts at (\d+):(\d+) and ends at (\d+):(\d+)\. How many minutes long is it\?$/);
      if (!match) return null;
      const [, h1, m1, h2, m2] = match.map(Number) as unknown as number[];
      return h2 * 60 + m2 - (h1 * 60 + m1);
    }
  },
  {
    id: "k5_money_cents",
    grades: ["P2"],
    ccss: ["2.MD.C.8"],
    generate: (seed) => {
      const r = rng(seed);
      const quarters = r(0, 3);
      const dimes = r(0, 5);
      const nickels = r(0, 4);
      return item(
        "k5_money_cents",
        `You have ${quarters} quarters, ${dimes} dimes and ${nickels} nickels. How many cents is that?`,
        quarters * 25 + dimes * 10 + nickels * 5,
        { quarters, dimes, nickels }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^You have (\d+) quarters, (\d+) dimes and (\d+) nickels\. How many cents is that\?$/,
        ([q, d, n]) => q * 25 + d * 10 + n * 5
      )
  },
  {
    id: "k5_rectangle_perimeter",
    grades: ["P3", "P4"],
    ccss: ["3.MD.D.8"],
    generate: (seed) => {
      const r = rng(seed);
      const w = r(2, 20);
      const h = r(2, 20);
      return item("k5_rectangle_perimeter", `A rectangle is ${w} cm by ${h} cm. What is its perimeter in cm?`, 2 * (w + h), { w, h });
    },
    solve: (p) => parse(p, /^A rectangle is (\d+) cm by (\d+) cm\. What is its perimeter in cm\?$/, ([w, h]) => 2 * (w + h))
  },
  {
    id: "k5_rectangle_area",
    grades: ["P3", "P4"],
    ccss: ["3.MD.C.7"],
    generate: (seed) => {
      const r = rng(seed);
      const w = r(2, 20);
      const h = r(2, 20);
      return item("k5_rectangle_area", `A rectangle is ${w} cm by ${h} cm. What is its area in square cm?`, w * h, { w, h });
    },
    solve: (p) => parse(p, /^A rectangle is (\d+) cm by (\d+) cm\. What is its area in square cm\?$/, ([w, h]) => w * h)
  },
  {
    id: "k5_prism_volume",
    grades: ["P5"],
    ccss: ["5.MD.C.5"],
    generate: (seed) => {
      const r = rng(seed);
      const a = r(2, 12);
      const b = r(2, 12);
      const c = r(2, 12);
      return item(
        "k5_prism_volume",
        `A box measures ${a} by ${b} by ${c} units. What is its volume in cubic units?`,
        a * b * c,
        { a, b, c }
      );
    },
    solve: (p) =>
      parse(
        p,
        /^A box measures (\d+) by (\d+) by (\d+) units\. What is its volume in cubic units\?$/,
        ([a, b, c]) => a * b * c
      )
  },
  {
    id: "k5_polygon_sides",
    grades: ["P1", "P2", "P3"],
    ccss: ["2.G.A.1"],
    generate: (seed) => {
      const r = rng(seed);
      const shapes = [
        { name: "triangle", sides: 3 },
        { name: "quadrilateral", sides: 4 },
        { name: "pentagon", sides: 5 },
        { name: "hexagon", sides: 6 },
        { name: "octagon", sides: 8 }
      ];
      const shape = shapes[r(0, shapes.length - 1)];
      return item("k5_polygon_sides", `How many sides does a ${shape.name} have?`, shape.sides, { sides: shape.sides });
    },
    solve: (p) => {
      const match = p.match(/^How many sides does a (triangle|quadrilateral|pentagon|hexagon|octagon) have\?$/);
      if (!match) return null;
      return { triangle: 3, quadrilateral: 4, pentagon: 5, hexagon: 6, octagon: 8 }[match[1] as "triangle"];
    }
  },
  {
    id: "k5_word_number",
    grades: ["K", "P1"],
    ccss: ["K.CC.A.3"],
    generate: (seed) => {
      const r = rng(seed);
      const n = r(1, 10);
      return item("k5_word_number", `Write the number for "${ordinalWord[n]}".`, n, { n });
    },
    solve: (p) => {
      const match = p.match(/^Write the number for "([a-z]+)"\.$/);
      if (!match) return null;
      const index = ordinalWord.indexOf(match[1]);
      return index === -1 ? null : index;
    }
  }
];

function placeName(place: number): string {
  return place === 1 ? "ones" : place === 10 ? "tens" : place === 100 ? "hundreds" : "thousands";
}

function placeValue(name: string): number {
  return name === "ones" ? 1 : name === "tens" ? 10 : name === "hundreds" ? 100 : 1000;
}

function ordinalDen(den: number): string {
  const names: Record<number, string> = {
    3: "thirds",
    4: "fourths",
    5: "fifths",
    6: "sixths",
    7: "sevenths",
    8: "eighths",
    9: "ninths",
    10: "tenths",
    11: "elevenths",
    12: "twelfths"
  };
  return names[den] ?? `${den}ths`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export const k5TemplatesById: ReadonlyMap<string, K5ItemTemplate> = new Map(
  k5ItemTemplates.map((template) => [template.id, template])
);

/**
 * Try every solver against a prompt and return a value only when all solvers
 * that parsed it agree — the same rule the existing item audit uses for
 * free-form banks. Disagreement means the families overlap ambiguously and the
 * item cannot be judged.
 */
export function inferK5Answer(prompt: string): { value: number; solvers: string[] } | { ambiguous: string[] } | null {
  const matches: { id: string; value: number }[] = [];
  for (const template of k5ItemTemplates) {
    let value: number | null = null;
    try {
      value = template.solve(prompt);
    } catch {
      value = null;
    }
    if (value === null || Number.isNaN(value)) continue;
    matches.push({ id: template.id, value });
  }
  if (matches.length === 0) return null;
  const first = matches[0].value;
  if (!matches.every((match) => Math.abs(match.value - first) < 1e-9)) {
    return { ambiguous: matches.map((match) => match.id) };
  }
  return { value: first, solvers: matches.map((match) => match.id) };
}
