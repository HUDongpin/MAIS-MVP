#!/usr/bin/env node

/**
 * Independent explanation audit for the P6-S6 portion of the MAIS-authored
 * ccss-textbook-practice-v1 pack.
 *
 * Independence contract:
 *   1. The 474-entry expectation ledger below was derived from prompt.en and
 *      options[].en before explanation text was inspected.
 *   2. buildIndependentReview() receives a deliberately narrow projection that
 *      contains no answer, acceptedAnswers, explanation, independentAnswer, or
 *      independentSolution fields.
 *   3. explanation.en is read only after the independent expectation and
 *      coverage gates have completed. The stored answer is never read.
 *   4. Every reviewed explanation is pinned by SHA-256. Changed explanation
 *      text is unreviewed and fails closed until A18 reviews the new wording.
 *
 * This script is read-only. It reports defects; it never edits the pack.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PACK_PATH = path.join(
  REPO_ROOT,
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
);

const TARGET_GRADES = new Set(["P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
const EXPECTED_GRADE_COUNTS = Object.freeze({
  P6: 69,
  S1: 60,
  S2: 66,
  S3: 84,
  S4: 90,
  S5: 51,
  S6: 54,
});
const EXPECTED_TOTAL = 474;

/**
 * A18-reviewed, grade-scoped digests over each sorted student-visible
 * {id, grade, sourceLessonSlug, type, promptEn, optionEnglish, diagram}
 * projection. They bind both the answer expectations and explanation review
 * snapshots to the exact prompt/options/diagram context that was reviewed.
 */
const REVIEWED_VISIBLE_INPUT_SHA256 = Object.freeze({
  all: "d2a6861d43a94ca044f3cf2bdaeb8022707fcbb69143c8e4708a559c9d934162",
  P6: "1ec48c55fff8ef4eeb2251b46af46783e7083d06d8135c400cb9a01bbb7e045b",
  S1: "1c92c7e74619a903a34be9298cac2307bfc589471b34238b6cf6599944c572a6",
  S2: "6f96526ce0628b07ea935ff90385b39585e89915df4033fd74fed67ae7dfba08",
  S3: "3598a0c2beaade55b32fffa53509184fd17eaa2d6bf910018dbee1f6864c63cf",
  S4: "86704c8494307b0d7c647b0cee65c953b5d702a8e60d21db14203598cb334c92",
  S5: "c54538d2099e5bdb83d0ca6f2dbec05324914cc904325d713da985873dd406b3",
  S6: "2b736011cf6b44b1fe7eaff6de76b35cf285c3e1860359b3655a162ca4805c08",
});

const MC = (optionIndex, reason) => ({ kind: "multiple-choice", optionIndex, reason });
const FILL = (expected, reason) => ({ kind: "fill-in", expected: String(expected), reason });

const LESSON_LEDGER = new Map();

function lesson(slug, q01, q02, q03) {
  if (LESSON_LEDGER.has(slug)) {
    throw new Error(`Duplicate independent lesson ledger: ${slug}`);
  }
  LESSON_LEDGER.set(slug, [q01, q02, q03]);
}

function allFirst(slug, reason01, reason02, reason03) {
  lesson(slug, MC(0, reason01), MC(0, reason02), MC(0, reason03));
}

// P6: Grade 6 Common Core progression.
lesson(
  "ratio-double-number-line",
  MC(1, "Multiplying both terms of 2:3 by 2 gives 4:6."),
  FILL(4, "Six eggs are two groups of three, so flour is 2 x 2 = 4 cups."),
  FILL(4, "The unit rate is 12 divided by 3 = 4 miles per hour."),
);
lesson(
  "unit-rate",
  FILL(2, "Six dollars divided by three apples is 2 dollars per apple."),
  FILL(4, "Twelve miles divided by three hours is 4 miles per hour."),
  FILL(2.5, "Ten dollars divided by four notebooks is 2.5 dollars each."),
);
lesson(
  "percents",
  FILL(18, "Thirty percent of 60 is 0.30 x 60 = 18."),
  MC(0, "Fifty percent is one half."),
  FILL(20, "Twenty-five percent is one quarter, and one quarter of 80 is 20."),
);
lesson(
  "divide-fractions",
  MC(0, "Dividing 3/4 by 1/8 gives 3/4 x 8 = 6."),
  MC(0, "Division by 2/3 is multiplication by its reciprocal 3/2."),
  FILL(2, "Two one-quarter parts fit in one half."),
);
lesson(
  "divide-multidigit",
  FILL(197, "24 x 197 = 4728."),
  FILL(25, "15 x 25 = 375."),
  FILL(80, "12 x 80 = 960."),
);
lesson(
  "decimal-arithmetic",
  FILL(3, "1.2 divided by 0.4 equals 3."),
  FILL(0.15, "Three tenths times five tenths is fifteen hundredths."),
  FILL(4.25, "2.5 + 1.75 = 4.25."),
);
lesson(
  "gcf-lcm",
  FILL(6, "Six is the greatest factor shared by 12 and 18."),
  FILL(12, "Twelve is the first common multiple of 4 and 6."),
  MC(0, "Factoring 6 from both addends uses the distributive property."),
);
lesson(
  "negative-numbers",
  MC(0, "Five degrees below zero is represented by negative five."),
  FILL(7, "The additive opposite of -7 is 7."),
  MC(0, "A debt is represented by a negative amount, here -20."),
);
lesson(
  "absolute-value",
  FILL(8, "Absolute value is distance from zero, so |-8| = 8."),
  MC(0, "On the number line -6 is less than -3."),
  MC(0, "The magnitudes are 6 and 3, so |-6| is greater."),
);
lesson(
  "exponents",
  FILL(81, "3 to the fourth power is 3 x 3 x 3 x 3 = 81."),
  FILL(25, "5 squared is 25."),
  MC(0, "The exponent 5 denotes five factors of 2."),
);
lesson(
  "variables-expressions",
  FILL(17, "Substitution gives 3 x 4 + 5 = 17."),
  FILL(11, "Substitution gives 2 x 6 - 1 = 11."),
  MC(0, "Seven is the numerical coefficient multiplying y."),
);
allFirst(
  "equivalent-expressions",
  "Distributing 3 gives 3x + 6.",
  "Combining like terms gives 7x.",
  "Equivalent expressions agree for every allowed x.",
);
lesson(
  "solve-one-step-equations",
  FILL(7, "Subtracting 5 from both sides gives x = 7."),
  FILL(5, "Dividing both sides by 4 gives x = 5."),
  FILL(11, "Adding 3 to both sides gives x = 11."),
);
lesson(
  "inequalities",
  MC(0, "Testing every numeric option against x > 3 leaves only 5; 3, 1, and 2 fail."),
  MC(0, "A non-strict endpoint x >= 2 is shown with a closed circle."),
  MC(0, "x < 4 contains every number strictly less than 4."),
);
lesson(
  "dependent-independent",
  MC(0, "In y = 2x, y changes in response to x and is dependent."),
  FILL(10, "Substituting x = 5 into y = 2x gives y = 10."),
  MC(0, "The independent variable is the chosen input."),
);
lesson(
  "area-triangles",
  FILL(12, "Triangle area is one half of 6 x 4, which is 12."),
  MC(0, "Triangle area is one half times base times perpendicular height."),
  FILL(15, "One half of 10 x 3 is 15."),
);
lesson(
  "volume-fractional",
  FILL(24, "Rectangular-prism volume is 2 x 3 x 4 = 24."),
  FILL(6, "The box volume is 1.5 x 2 x 2 = 6."),
  MC(0, "A rectangular prism's volume is length x width x height."),
);
lesson(
  "polygons-coordinate",
  FILL(6, "The horizontal distance from x = 2 to x = 8 is 6."),
  FILL(4, "The rectangle's horizontal width is 5 - 1 = 4."),
  FILL(3, "The rectangle's vertical height is 4 - 1 = 3."),
);
lesson(
  "surface-area-nets",
  FILL(54, "Six square faces of area 9 have total area 54."),
  MC(0, "Surface area is the total area of all exterior faces."),
  FILL(52, "2 x (6 + 8 + 12) = 52."),
);
allFirst(
  "statistical-questions",
  "Class heights anticipate variable data and form a statistical question.",
  "A statistical question anticipates variability in its answers.",
  "A distribution is described by center, spread, and shape.",
);
lesson(
  "mean-median",
  FILL(5, "The mean is the stated sum 25 divided by 5."),
  FILL(5, "The middle ordered value is 5."),
  MC(0, "Range is a measure of spread or variability."),
);
allFirst(
  "data-displays",
  "The middle line of a box plot marks the median.",
  "A histogram groups numerical observations into intervals or bins.",
  "A dot plot displays each individual observed value.",
);
lesson(
  "four-quadrant-plane",
  MC(1, "A negative x-coordinate and positive y-coordinate locate Quadrant II."),
  MC(0, "Reflection across the y-axis negates x only, giving (-5, 2)."),
  MC(1, "Both coordinates are negative in Quadrant III."),
);

// S1: Grade 7 Common Core progression.
lesson(
  "integer-arrows",
  FILL(-3, "Starting at -8 and moving right 5 gives -3."),
  FILL(0, "Six and negative six are additive inverses."),
  MC(1, "Adding a negative moves left on a horizontal number line."),
);
lesson(
  "complex-unit-rates",
  FILL(2, "One half divided by one quarter is 2 miles per hour."),
  FILL(1.5, "Three quarters divided by one half is 3/2 cups per hour."),
  MC(0, "A unit rate for fractional quantities is found by division."),
);
lesson(
  "proportional-relationships",
  MC(0, "The coefficient 3 is the constant of proportionality in y = 3x."),
  MC(0, "A proportional graph is linear and passes through the origin."),
  FILL(24, "Substituting x = 6 into y = 4x gives 24."),
);
lesson(
  "percent-problems",
  FILL(30, "A 25 percent discount leaves 75 percent of 40, or 30."),
  FILL(46, "Fifteen percent of 40 is 6, so the total is 46."),
  FILL(40, "A 20 percent discount removes 10 from 50, leaving 40."),
);
lesson(
  "multiply-divide-integers",
  FILL(-12, "A negative times a positive is negative, with magnitude 12."),
  FILL(3, "A negative divided by a negative is positive: 6/2 = 3."),
  MC(0, "The product of two negative factors is positive."),
);
lesson(
  "rational-operations",
  FILL(35, "The signed balance is 50 - 30 + 15 = 35."),
  FILL(-15, "Descending 5 meters from -10 gives -15."),
  FILL(5, "A rise of 9 from -4 gives 5."),
);
allFirst(
  "linear-expressions",
  "The distributive property gives 3x + 6.",
  "Combining like x-terms gives 7x.",
  "The greatest common factor 3 gives 3(2x + 3).",
);
lesson(
  "multistep-rational",
  FILL(12, "Four pizzas cost 48; after 25 percent off the cost is 36; 36/3 = 12."),
  FILL(9, "Ten percent off 20 leaves 18, and half is 9."),
  MC(0, "Estimation is a valid reasonableness check for a multistep result."),
);
lesson(
  "two-step-equations",
  FILL(5, "Subtract 4 then divide by 3: x = 5."),
  FILL(8, "Add 5 then divide by 2: x = 8."),
  MC(0, "Undo the additive q term before undoing multiplication by p."),
);
lesson(
  "scale-drawings",
  FILL(12, "Four drawing units at 3 feet each represent 12 feet."),
  MC(0, "Area scales by the square of the length factor: 3 squared = 9."),
  FILL(30, "Six centimeters at 5 meters each represent 30 meters."),
);
allFirst(
  "construct-triangles",
  "Two plus three is not greater than eight, so no triangle is possible.",
  "Each pair of 5, 6, and 7 satisfies the triangle inequality.",
  "The two shorter sides must sum to more than the longest side.",
);
allFirst(
  "cross-sections",
  "A plane parallel to a cube face produces a square.",
  "A cross-section depends on the slicing plane's orientation and position.",
  "A plane cutting off one cube corner intersects three faces in a triangle.",
);
lesson(
  "angle-relationships",
  FILL(40, "Complementary angles sum to 90, so 90 - 50 = 40."),
  FILL(70, "Supplementary angles sum to 180, so 180 - 110 = 70."),
  MC(0, "Vertical angles formed by intersecting lines are congruent."),
);
lesson(
  "area-volume-surface",
  FILL(30, "Prism volume is base area 6 times perpendicular height 5."),
  FILL(48, "Prism volume is base area 12 times perpendicular height 4."),
  MC(0, "Every prism has volume equal to base area times perpendicular height."),
);
allFirst(
  "sampling",
  "A random sample supports inference about a large population.",
  "A larger random sample generally reduces sampling variability.",
  "Random selection helps a sample represent its population.",
);
allFirst(
  "compare-populations",
  "Little overlap relative to similar spreads is evidence of a meaningful difference.",
  "Population comparisons use both center and variability.",
  "A mean difference large relative to spread is evidence, not proof, of a population difference.",
);
lesson(
  "probability-basics",
  MC(0, "Probability zero denotes an impossible event in the model."),
  FILL(0.5, "A fair coin has one head among two equally likely outcomes."),
  MC(0, "Experimental probability is estimated from repeated trials."),
);
lesson(
  "probability-models",
  MC(0, "Each face of a fair die has the same probability, making the model uniform."),
  FILL(3, "Three of the six objects are red, so the requested numerator is 3."),
  MC(0, "Probabilities across all outcomes in a model sum to 1."),
);
lesson(
  "compound-events",
  FILL(36, "Two dice have 6 x 6 = 36 ordered outcomes."),
  MC(0, "Six ordered pairs sum to 7, out of 36 equally likely pairs."),
  FILL(3, "The sums (1,3), (2,2), and (3,1) are the three ways to make 4."),
);
lesson(
  "circle-pi",
  MC(1, "The circumference-to-diameter ratio of every circle is pi."),
  FILL(31.4, "Using 2 x 3.14 x 5 gives circumference 31.4."),
  MC(0, "Circle area is pi times the square of the radius."),
);

// S2: Grade 8 Common Core progression.
lesson(
  "slope-explorer",
  FILL(2, "Slope is rise divided by run: 6/3 = 2."),
  MC(1, "In slope-intercept form the x coefficient is the slope, here 4."),
  MC(2, "A vertical line has zero run, so its slope is undefined."),
);
allFirst(
  "rational-irrational",
  "The square root of 2 is irrational, unlike the other listed numbers.",
  "A repeating decimal can be expressed as a fraction and is rational.",
  "The square root of 9 is 3, an integer and therefore rational.",
);
lesson(
  "approximate-irrationals",
  MC(0, "One squared is below 2 and two squared is above 2."),
  MC(0, "Three squared is 9 and four squared is 16, bracketing 10."),
  FILL(7, "Seven squared is 49 below 50, while eight squared is 64 above it."),
);
lesson(
  "integer-exponents",
  FILL(5, "Multiplying like bases adds exponents: 3 + 2 = 5."),
  FILL(1, "Any nonzero base to the zero power equals 1."),
  MC(0, "A negative exponent takes the reciprocal: 2^-3 = 1/8."),
);
lesson(
  "roots",
  FILL(8, "Eight is the principal square root of 64."),
  FILL(3, "Three cubed is 27."),
  MC(0, "Both 5 and -5 square to 25, so the solutions are plus or minus 5."),
);
lesson(
  "scientific-notation",
  FILL(3000, "Three times one thousand is 3000."),
  MC(0, "Multiply coefficients to 6 and add exponents to obtain 6 x 10^5."),
  MC(0, "Moving the decimal four places gives 4.5 x 10^4."),
);
lesson(
  "slope-unit-rate",
  MC(0, "For positive proportional relationships, greater steepness means a greater unit rate."),
  MC(0, "The slope of a proportional graph is its constant unit rate."),
  FILL(4, "A line through the origin and (3,12) has slope 12/3 = 4."),
);
lesson(
  "linear-equations",
  FILL(2, "Rearranging 3x + 2 = x + 6 gives 2x = 4 and x = 2."),
  MC(0, "The contradiction 0 = 5 means no value can solve the equation."),
  MC(0, "The identity 0 = 0 means every allowed x is a solution."),
);
allFirst(
  "systems-of-equations",
  "A simultaneous solution is represented by the intersection of the two lines.",
  "Distinct parallel lines never intersect, so the system has no solution.",
  "Equating x + 1 and -x + 5 gives x = 2 and y = 3.",
);
lesson(
  "functions-intro",
  MC(0, "A function associates each input with exactly one output."),
  MC(0, "A rate of 3 exceeds a rate of 2, so function B grows faster."),
  FILL(9, "Substituting x = 4 gives y = 2(4) + 1 = 9."),
);
lesson(
  "construct-linear-function",
  MC(0, "In y = mx + b, b is the output at x = 0 and hence the initial value."),
  FILL(17, "Starting at 5 and growing 3 per day for four days gives 5 + 12 = 17."),
  MC(0, "The coefficient of x is the rate of change, 4."),
);
allFirst(
  "graph-stories",
  "A horizontal segment has zero change in the represented quantity.",
  "Curvature indicates that slope, and therefore rate of change, varies.",
  "A graph that slopes downward left to right represents a decreasing quantity.",
);
allFirst(
  "transformations",
  "Reflection across the x-axis changes y to -y, giving (3,-5).",
  "Translations, reflections, and rotations are rigid motions that preserve size and shape.",
  "A 90-degree counterclockwise rotation maps (2,0) to (0,2).",
);
allFirst(
  "congruence",
  "Rigid motions preserve all lengths and angles and establish congruence.",
  "Congruent figures have equal corresponding side lengths and angles.",
  "A non-unit dilation changes lengths and therefore does not preserve congruence.",
);
lesson(
  "similarity",
  MC(0, "A dilation preserves angle measures while changing nonzero lengths."),
  FILL(12, "A scale factor of 3 sends length 4 to 12."),
  MC(0, "Similar figures have equal corresponding angles and proportional sides."),
);
lesson(
  "triangle-angles",
  FILL(65, "The third angle is 180 - 55 - 60 = 65 degrees."),
  FILL(180, "Every Euclidean triangle has interior-angle sum 180 degrees."),
  MC(0, "Two equal corresponding angles establish triangle similarity by AA."),
);
lesson(
  "pythagorean-theorem",
  FILL(5, "The hypotenuse is sqrt(3^2 + 4^2) = 5."),
  FILL(10, "The hypotenuse is sqrt(6^2 + 8^2) = 10."),
  MC(0, "For a right triangle with hypotenuse c, a^2 + b^2 = c^2."),
);
lesson(
  "distance-formula",
  FILL(5, "The coordinate differences 3 and 4 form a 3-4-5 triangle."),
  FILL(5, "The coordinate differences are 3 and 4, so the distance is 5."),
  MC(0, "The distance formula applies the Pythagorean theorem to coordinate differences."),
);
allFirst(
  "volume-3d",
  "Cylinder volume is base area pi r squared times height.",
  "A cone with the same base and height has one third the cylinder's volume.",
  "Sphere volume is four thirds pi r cubed.",
);
allFirst(
  "scatter-plots",
  "Increasing y as x increases describes a positive association.",
  "A scatter plot with no trend shows no association.",
  "A point far from the overall pattern is an outlier.",
);
lesson(
  "line-of-best-fit",
  MC(0, "The slope of a best-fit line is the predicted rate of change."),
  FILL(80, "Substituting x = 5 gives 6(5) + 50 = 80."),
  MC(0, "A representative best-fit line balances points through the middle of the data."),
);
allFirst(
  "two-way-tables",
  "A two-way table cross-classifies observations by two categorical variables.",
  "Relative frequency is a frequency divided by an appropriate total.",
  "Substantially different row percentages are evidence of an association.",
);

// S3: high-school algebra, functions, geometry, and statistics progression.
lesson(
  "rational-exponents",
  FILL(2, "The cube root of 8 is 2."),
  FILL(27, "9^(3/2) is (sqrt(9))^3 = 3^3 = 27."),
  MC(0, "The fifth root of x cubed is x raised to 3/5."),
);
allFirst(
  "real-number-closure",
  "Adding a nonzero rational to sqrt(2) remains irrational.",
  "sqrt(2) times itself equals 2, a rational number.",
  "A nonzero rational multiple of an irrational number is irrational.",
);
lesson(
  "rewrite-expressions",
  MC(0, "Adding and subtracting 9 gives (x + 3)^2 - 4."),
  FILL(-4, "In vertex form (x + 3)^2 - 4, the vertex y-coordinate is -4."),
  MC(0, "Vertex form exposes the vertex and therefore the parabola's minimum or maximum."),
);
lesson(
  "create-equations",
  FILL(17, "The taxi cost is 5 + 3(4) = 17 dollars."),
  MC(0, "The fixed charge 5 is the value at zero miles and the y-intercept."),
  FILL(7, "Solving 5 + 3m = 26 gives 3m = 21 and m = 7."),
);
allFirst(
  "constraints-formulas",
  "Multiplying by 2 and dividing by nonzero b gives h = 2A/b.",
  "Dividing d = rt by nonzero r gives t = d/r.",
  "At most 50 means the amount is less than or equal to 50.",
);
lesson(
  "solve-equations-steps",
  FILL(4, "Combining like terms gives 2x = 8, so x = 4."),
  MC(0, "Subtracting equal quantities from both sides is the subtraction property of equality."),
  MC(0, "Division by a negative reverses an inequality's direction."),
);
lesson(
  "rational-radical-equations",
  FILL(13, "Squaring gives x + 3 = 16, hence x = 13, which checks."),
  MC(0, "Squaring is not reversible without conditions and can introduce extraneous roots."),
  MC(0, "Candidate roots of radical or rational equations must be checked in the original."),
);
lesson(
  "solve-quadratics",
  MC(0, "Factoring gives (x - 2)(x - 3) = 0, so x is 2 or 3."),
  MC(0, "A negative discriminant produces a complex-conjugate pair rather than real roots."),
  FILL(0, "For x^2 - 4x + 4, b^2 - 4ac = 16 - 16 = 0."),
);
lesson(
  "systems-elimination",
  MC(0, "Adding the equations cancels y immediately."),
  MC(0, "A row-replacement operation preserves the solution set."),
  FILL(3, "Adding gives 3x = 9, so x = 3."),
);
lesson(
  "linear-quadratic-systems",
  MC(0, "Intersection points have equal y-values, so set x^2 = x + 2."),
  MC(0, "A line and parabola can have zero, one tangent, or two intersections."),
  FILL(2, "x^2 - x - 2 factors as (x - 2)(x + 1), giving two real roots."),
);
lesson(
  "matrix-equations",
  MC(0, "A linear system's coefficient form is Ax = b."),
  MC(0, "Left-multiplying by A inverse gives x = A^-1 b."),
  FILL(5, "The determinant is 2 x 3 - 1 x 1 = 5."),
);
allFirst(
  "graphs-and-solutions",
  "A graph consists exactly of coordinate pairs satisfying its equation.",
  "Equality f(x) = g(x) occurs where the two graphs intersect.",
  "Solutions in x are the x-coordinates of graph intersections.",
);
allFirst(
  "graph-inequalities",
  "A linear inequality in two variables selects one half-plane bounded by a line.",
  "A strict inequality excludes its boundary, which is drawn dashed.",
  "A system requires all inequalities simultaneously, so the shaded regions overlap.",
);
lesson(
  "function-notation",
  FILL(7, "f(3) = 2(3) + 1 = 7."),
  MC(0, "A function assigns every domain input exactly one output."),
  MC(0, "A sequence is indexed by discrete counting-number or integer inputs."),
);
allFirst(
  "interpret-function-graphs",
  "An increasing interval rises as x moves left to right.",
  "Average rate of change is output change divided by input change.",
  "A contextual function's domain must represent meaningful possible inputs.",
);
allFirst(
  "compare-functions",
  "Rate 5 is greater than slope 3, so g grows faster.",
  "Rate of change and intercept provide comparable structural features across representations.",
  "When zero is the starting input, its output is the starting value.",
);
allFirst(
  "equation-of-circle",
  "Distance r from center (h,k) gives (x-h)^2 + (y-k)^2 = r^2.",
  "The radius is the positive square root of 25, namely 5.",
  "Completing the square converts an expanded circle equation to center-radius form.",
);
allFirst(
  "conic-sections",
  "A parabola is equidistant from a focus and a directrix.",
  "An ellipse has constant sum of distances to two foci.",
  "A hyperbola has constant absolute difference of distances to two foci.",
);
lesson(
  "coordinate-proofs",
  MC(0, "Nonvertical parallel lines have equal slopes."),
  MC(0, "Finite nonzero slopes of perpendicular lines are negative reciprocals with product -1."),
  FILL(2, "The negative reciprocal of 2 is -1/2, so the requested denominator is 2."),
);
lesson(
  "partition-segment",
  MC(0, "One third of the displacement B - A added to A locates the point."),
  MC(0, "The midpoint is halfway from A to B, corresponding to t = 1/2."),
  FILL(4, "The midpoint x-coordinate is (0 + 8)/2 = 4."),
);
lesson(
  "coordinate-perimeter-area",
  FILL(5, "The segment has coordinate changes 3 and 4, so its length is 5."),
  MC(0, "The shoelace formula calculates polygon area from vertex coordinates."),
  MC(0, "Coordinate perimeter is the sum of distance-formula lengths for all sides."),
);
allFirst(
  "statistical-displays",
  "A dot plot explicitly places a mark for every individual data value.",
  "A box plot is determined by the five-number summary.",
  "A histogram displays the overall shape of a quantitative distribution.",
);
allFirst(
  "compare-distributions",
  "The median is resistant to extreme outliers.",
  "A larger standard deviation indicates greater spread about the mean.",
  "A large outlier pulls the mean more than resistant measures such as the median.",
);
lesson(
  "normal-distribution",
  FILL(68, "The empirical rule places about 68 percent within one standard deviation."),
  FILL(95, "The empirical rule places about 95 percent within two standard deviations."),
  MC(0, "A normal distribution is symmetric and bell-shaped."),
);
allFirst(
  "two-way-frequencies",
  "A joint relative frequency uses the grand total as denominator.",
  "A conditional relative frequency conditions on a row or column total.",
  "Different conditional distributions are evidence of association.",
);
allFirst(
  "fit-function-residuals",
  "A residual is observed or actual value minus model-predicted value.",
  "Least squares minimizes the sum of squared residuals.",
  "A curved residual pattern indicates remaining structure and a poor linear model.",
);
lesson(
  "linear-model-interpretation",
  MC(0, "The coefficient 8 means cost increases by 8 dollars for each GB."),
  MC(0, "The intercept is the cost when the explanatory variable GB is zero."),
  FILL(44, "At 3 GB the cost is 20 + 8(3) = 44."),
);
allFirst(
  "correlation",
  "r = -0.9 is close to -1 and indicates a strong negative linear relationship.",
  "A correlation coefficient is bounded between -1 and +1.",
  "Correlation supports association but does not by itself establish causation.",
);

// S4: high-school algebra, geometry, and probability progression.
allFirst(
  "interpret-expressions",
  "In compound growth, 1 + r is the per-period growth factor.",
  "x^4 - 16 is (x^2)^2 - 4^2 and factors as (x^2 - 4)(x^2 + 4).",
  "An exponent t denotes repeated multiplication of the base 1 + r.",
);
lesson(
  "geometric-series",
  FILL(80, "The stated terms sum to 2 + 6 + 18 + 54 = 80."),
  MC(0, "The finite geometric sum is a(r^n - 1)/(r - 1), equivalent to a(1-r^n)/(1-r)."),
  FILL(31, "The stated powers of two sum to 1 + 2 + 4 + 8 + 16 = 31."),
);
allFirst(
  "precise-definitions",
  "A circle is the locus of points at one fixed distance from its center.",
  "An angle consists of two rays sharing a common endpoint.",
  "Perpendicular lines intersect to form right angles.",
);
allFirst(
  "transformations-as-functions",
  "Reflection across the y-axis maps x to -x and leaves y unchanged.",
  "Rigid motions preserve both distances and angle measures.",
  "The rule (x,y) to (-y,x) is a 90-degree counterclockwise rotation.",
);
lesson(
  "figure-symmetry",
  FILL(6, "A regular hexagon has three vertex-axis and three edge-axis symmetries."),
  FILL(4, "A square maps to itself under four rotations in one full turn."),
  MC(0, "A figure symmetry is precisely a motion mapping the figure onto itself."),
);
allFirst(
  "congruence-criteria",
  "SAS is a valid triangle-congruence criterion; SSA and angle-only data are not.",
  "Rigid motions preserve lengths and angles and establish congruence.",
  "CPCTC concludes corresponding parts of congruent triangles are congruent.",
);
lesson(
  "prove-angle-theorems",
  MC(0, "Vertical angles are congruent."),
  FILL(110, "Same-side interior angles are supplementary, so 180 - 70 = 110."),
  MC(0, "Alternate interior angles made by a transversal of parallel lines are equal."),
);
lesson(
  "prove-triangle-theorems",
  FILL(180, "The interior angles of a Euclidean triangle sum to 180 degrees."),
  MC(0, "The base angles opposite equal sides of an isosceles triangle are equal."),
  MC(0, "A triangle midsegment is parallel to and half the length of the third side."),
);
allFirst(
  "prove-parallelogram-theorems",
  "Opposite sides of a parallelogram are congruent.",
  "The diagonals of every parallelogram bisect one another.",
  "A diagonal divides a parallelogram into useful congruent triangles for proof.",
);
allFirst(
  "constructions",
  "Intersections of equal-radius arcs centered at A and B are equidistant from A and B.",
  "A circle's radius steps around its circumference as six equal chords, forming a regular hexagon.",
  "Classical Euclidean constructions use an unmarked straightedge and compass.",
);
lesson(
  "dilations",
  FILL(12, "A scale factor of 3 multiplies length 4 to produce 12."),
  MC(0, "Dilations preserve angle measures but generally change lengths and areas."),
  MC(0, "A positive scale factor below one reduces every length and shrinks the figure."),
);
allFirst(
  "similarity-transformations",
  "Two equal corresponding angles establish triangle similarity by AA.",
  "Similar figures have equal corresponding angles and proportional sides.",
  "A similarity can be composed from a dilation and a rigid motion.",
);
allFirst(
  "similarity-proofs",
  "A line parallel to one triangle side divides the other two sides proportionally.",
  "The parallel line creates corresponding equal angles, so the small triangle is similar to the whole.",
  "The altitude to a right triangle's hypotenuse creates two triangles similar to the original.",
);
allFirst(
  "trig-ratios",
  "In a right triangle sine is opposite divided by hypotenuse.",
  "Complementary-angle identity gives sin 40 degrees = cos 50 degrees.",
  "Right triangles sharing an acute angle are similar, making their side ratios angle-dependent constants.",
);
lesson(
  "solve-right-triangles",
  MC(0, "Tangent relates the opposite and adjacent legs."),
  FILL(5, "The 3-4 right triangle has hypotenuse 5."),
  MC(0, "An angle of elevation is measured upward from a horizontal line of sight."),
);
lesson(
  "triangle-area-sine",
  MC(0, "With two sides and their included angle, area is one half ab sin C."),
  FILL(10, "One half of 4 x 5 x sin 90 degrees is 10."),
  MC(0, "The sine area formula uses the angle included between the two given sides."),
);
allFirst(
  "laws-sines-cosines",
  "The Law of Cosines is c^2 = a^2 + b^2 - 2ab cos C.",
  "At C = 90 degrees, cos C = 0 and the formula becomes the Pythagorean theorem.",
  "The Law of Sines pairs each side with the sine of its opposite angle.",
);
lesson(
  "circle-angles",
  FILL(40, "An inscribed angle subtending the same arc is half the 80-degree central angle."),
  FILL(90, "An angle inscribed in a semicircle is a right angle."),
  MC(0, "All circles differ only by dilation and rigid motion, so they are similar."),
);
allFirst(
  "circle-constructions",
  "The incenter is the common point of a triangle's angle bisectors.",
  "The circumcenter is the common point of a triangle's perpendicular bisectors.",
  "A tangent is perpendicular to the radius drawn to the tangency point.",
);
allFirst(
  "arc-length-sector",
  "Ninety degrees is one quarter of a full 360-degree circle.",
  "For theta in radians, arc length is radius times theta.",
  "Sector area is the central-angle fraction of the full circle area.",
);
allFirst(
  "volume-arguments",
  "Cavalieri's principle gives equal volume from equal-height corresponding cross-sections.",
  "An oblique cylinder and right cylinder with equal base area and height have equal volume.",
  "A cylinder can be viewed as a stack of thin circular disks.",
);
allFirst(
  "volume-formulas",
  "A cone has one third the volume of a cylinder with equal base and height.",
  "Sphere volume is four thirds pi r cubed.",
  "Pyramid volume is one third times base area times perpendicular height.",
);
allFirst(
  "solids-cross-sections",
  "A cone slice parallel to its circular base is a circle.",
  "Rotating a rectangle about one edge generates a cylinder.",
  "Rotating a semicircle about its diameter generates a sphere.",
);
allFirst(
  "set-operations-events",
  "A union contains outcomes in A, B, or both.",
  "An intersection contains outcomes common to both A and B.",
  "A complement contains all sample-space outcomes outside A.",
);
lesson(
  "independence",
  MC(0, "Independent events satisfy P(A intersection B) = P(A)P(B)."),
  FILL(0.25, "For independent events, 0.5 x 0.5 = 0.25."),
  MC(0, "P(A given B) = P(A) is a defining condition for independence when defined."),
);
allFirst(
  "conditional-probability",
  "Conditional probability is P(A intersection B) divided by P(B).",
  "Reversing the conditioning event generally changes the conditional probability.",
  "Conditioning restricts the sample space to B, making B the denominator event.",
);
allFirst(
  "two-way-probability",
  "A joint cell probability uses the table's grand total.",
  "A conditional probability uses the relevant row or column total.",
  "If conditioning on bike changes the ride probability, the events are not independent.",
);
lesson(
  "addition-rule",
  MC(0, "The overlap must be subtracted: P(A union B) = P(A)+P(B)-P(A intersection B)."),
  MC(0, "Mutually exclusive events have zero overlap, leaving the sum of probabilities."),
  FILL(0.7, "0.5 + 0.4 - 0.2 = 0.7."),
);
allFirst(
  "multiplication-rule",
  "The general rule is P(A intersection B) = P(A)P(B given A).",
  "Independence means conditioning on A leaves P(B) unchanged.",
  "Without replacement changes the composition, so the second probability changes.",
);
lesson(
  "permutations-combinations",
  MC(0, "Ordered selections are counted by permutations."),
  FILL(60, "5P3 = 5 x 4 x 3 = 60."),
  FILL(6, "4C2 = 4 x 3 / 2 = 6."),
);

// S5: advanced functions, trigonometry, and statistical inference.
lesson(
  "build-functions",
  MC(0, "The sequence starts at 3 and adds 2 at each subsequent index."),
  FILL(11, "a5 = 3 + (5 - 1) x 2 = 11."),
  MC(0, "Successive nonzero terms of a geometric sequence have a constant ratio."),
);
allFirst(
  "inverse-functions",
  "Solving y = 2x + 3 for x gives the inverse (x - 3)/2.",
  "Interchanging input and output reflects a graph across y = x.",
  "Logarithmic and exponential functions undo one another.",
);
lesson(
  "construct-linear-exponential",
  MC(0, "A fixed additive change per equal step defines a linear pattern."),
  MC(0, "The multiplier 1.1 is the growth factor corresponding to 10 percent growth."),
  FILL(160, "At t = 3, the model gives 100 + 20(3) = 160."),
);
lesson(
  "logarithms",
  FILL(3, "Two cubed equals 8, so log base 2 of 8 is 3."),
  FILL(3, "Ten cubed equals 1000, so log base 10 of 1000 is 3."),
  MC(0, "A logarithm returns the exponent needed to obtain its argument."),
);
allFirst(
  "special-angle-values",
  "The unit-circle sine value at 30 degrees is 1/2.",
  "The unit-circle cosine value at 45 degrees is sqrt(2)/2.",
  "At 45 degrees the equal legs give tangent 1.",
);
allFirst(
  "trig-symmetry",
  "Cosine is even, so cos(-theta) = cos(theta).",
  "Sine has period 2pi, so sin(theta + 2pi) = sin(theta).",
  "Supplementary-angle symmetry gives sin(180 degrees - theta) = sin(theta).",
);
lesson(
  "periodic-models",
  MC(0, "The amplitude of A sin(...) + D is the nonnegative magnitude |A|."),
  MC(0, "Vertical shift D = 3 makes the midline y = 3."),
  FILL(5, "The maximum is midline 3 plus amplitude 2, giving 5."),
);
lesson(
  "inverse-trig",
  MC(0, "Unrestricted sine repeats values and is not one-to-one."),
  FILL(30, "The principal angle in [-90,90] degrees with sine 1/2 is 30 degrees."),
  MC(0, "The standard real principal range of arcsine is [-90 degrees, 90 degrees]."),
);
allFirst(
  "trig-identities",
  "The Pythagorean identity is sin^2(theta) + cos^2(theta) = 1.",
  "Unit-circle coordinates and the Pythagorean theorem yield the identity.",
  "The sine addition identity is sin A cos B + cos A sin B.",
);
allFirst(
  "sampling-inference",
  "A sample statistic estimates an unknown population parameter.",
  "Larger random samples generally have less sampling variability.",
  "Simulation can assess whether observed data are plausible under a model.",
);
allFirst(
  "study-design",
  "Randomized experiments can support causal inference under their design assumptions.",
  "Random sampling supports generalization from a sample to its population.",
  "An observational study can establish association but not causation by itself.",
);
allFirst(
  "estimate-population",
  "With other factors fixed, larger samples reduce standard error and margin of error.",
  "Across repeated samples, about 95 percent of intervals made by the procedure capture the true value.",
  "Fifty-two percent plus or minus three percentage points spans 49 to 55 percent.",
);
allFirst(
  "compare-treatments",
  "Random assignment allocates experimental subjects to treatments.",
  "Statistical significance means the observed difference exceeds what chance variation would usually produce.",
  "A control group supplies a baseline against which to compare the treatment.",
);
allFirst(
  "evaluate-reports",
  "Collection and sampling methods are essential for judging a statistic's validity.",
  "An observational association can be confounded and does not prove coffee caused longevity.",
  "A relative-improvement claim needs a control comparison and sample-size context.",
);
lesson(
  "quadratic-vertex-form",
  MC(0, "Vertex form y = (x - 3)^2 + 2 has vertex (3,2)."),
  MC(1, "A negative leading scale factor reflects the parabola so it opens downward."),
  FILL(-4, "x + 4 is x - (-4), so the vertex x-coordinate is -4."),
);
lesson(
  "exponential-vs-linear",
  MC(1, "Increasing x by one multiplies 2^x by 2."),
  FILL(81, "At x = 4, 3^x = 3^4 = 81."),
  MC(1, "An increasing exponential with base above one eventually exceeds any linear function."),
);
lesson(
  "unit-circle",
  MC(1, "The unit-circle point at angle theta is (cos theta, sin theta)."),
  FILL(1, "The x-coordinate at 0 degrees is cos 0 = 1."),
  MC(1, "Every unit-circle point satisfies cos^2(theta) + sin^2(theta) = 1."),
);

// S6: advanced number, algebra, modeling, and probability progression.
lesson(
  "units-quantities",
  FILL(120, "Two hours at 60 minutes per hour equals 120 minutes."),
  MC(0, "Conversion factors are oriented so original feet and seconds units cancel."),
  FILL(15840, "Three miles at 5280 feet per mile equals 15840 feet."),
);
allFirst(
  "complex-numbers",
  "The imaginary unit is defined by i^2 = -1.",
  "Adding real and imaginary parts gives 3 + 2i.",
  "The conjugate product is 1 - i^2 = 2.",
);
lesson(
  "complex-conjugates",
  MC(0, "Complex conjugation changes the sign of the imaginary part only."),
  FILL(5, "The modulus is sqrt(3^2 + 4^2) = 5."),
  FILL(25, "A complex number times its conjugate is 3^2 + 4^2 = 25."),
);
allFirst(
  "complex-plane",
  "The real part 2 is horizontal and imaginary part 3 is vertical, so move right 2 and up 3.",
  "Vector addition of two complex-plane points is represented by a parallelogram.",
  "The coordinate midpoint is the average (z + w)/2.",
);
allFirst(
  "complex-solutions",
  "x^2 = -1 gives x = plus or minus i.",
  "A negative real discriminant produces nonreal complex-conjugate roots.",
  "Counting multiplicity, a degree-n polynomial has exactly n complex roots.",
);
lesson(
  "vectors",
  MC(0, "Subtracting initial coordinates from terminal coordinates gives <3,4>."),
  FILL(5, "The magnitude is sqrt(3^2 + 4^2) = 5."),
  MC(0, "A vector is characterized by both magnitude and direction."),
);
allFirst(
  "vector-operations",
  "Componentwise addition gives <2+3,1+4> = <5,5>.",
  "Scalar multiplication gives <3x2,3x(-1)> = <6,-3>.",
  "Multiplication by -1 preserves magnitude and reverses direction.",
);
allFirst(
  "matrices",
  "Scalar multiplication multiplies every matrix entry by the scalar.",
  "Matrix addition is defined only for matrices with identical dimensions.",
  "An AB entry is the dot product of a row of A with a column of B.",
);
allFirst(
  "matrix-algebra",
  "Matrix multiplication is generally noncommutative, so AB usually differs from BA.",
  "The identity matrix is the multiplicative identity, so AI = A.",
  "Multiplying by the zero matrix produces the zero matrix when dimensions conform.",
);
lesson(
  "matrix-transformations",
  MC(0, "A 2-by-2 matrix maps plane vectors to plane vectors as a linear transformation."),
  FILL(4, "The determinant is 2 x 2 - 0 x 0 = 4, the area scale factor."),
  MC(0, "A negative determinant reverses orientation."),
);
allFirst(
  "polynomial-operations",
  "Combining like terms gives x^2 + 5x + 1.",
  "Distributing gives x^2 + 5x + 6.",
  "Polynomials are closed under multiplication.",
);
lesson(
  "remainder-theorem",
  MC(0, "The Remainder Theorem gives remainder p(a) on division by x - a."),
  MC(0, "By the Factor Theorem, p(3)=0 makes x - 3 a factor."),
  FILL(2, "The distinct linear factors give roots 1 and 4, and the graph crosses at both."),
);
allFirst(
  "polynomial-identities",
  "Expanding (a-b)^2 gives a^2 - 2ab + b^2.",
  "The binomial coefficients for power 3 are 1, 3, 3, 1.",
  "The product of conjugate binomials is the difference of squares a^2 - b^2.",
);
allFirst(
  "rational-expressions",
  "Factoring the numerator as (x+2)(x+3) gives x+3 where defined.",
  "The least common denominator of x and x+1 is x(x+1).",
  "Rational expressions are closed under the four arithmetic operations where divisors are nonzero.",
);
allFirst(
  "geometric-modeling",
  "A tree trunk is approximately cylindrical.",
  "Physical density is mass divided by volume.",
  "Population per square mile is an areal density.",
);
allFirst(
  "random-variables",
  "A random variable assigns a numerical value to each outcome.",
  "Seven has six representations and is the most likely two-dice sum.",
  "A probability distribution assigns total probability 1.",
);
lesson(
  "expected-value",
  MC(0, "Expected value is the sum of outcomes weighted by their probabilities."),
  FILL(5, "The expected payoff is 10(0.5) + 0(0.5) = 5 dollars."),
  MC(0, "Expected value is the long-run average outcome per repeated trial."),
);
lesson(
  "decisions-probability",
  MC(0, "A fair game has zero expected net gain for the player."),
  FILL(-0.5, "Expected winnings are 10(0.15)=1.5; subtracting the 2-dollar cost gives -0.5."),
  MC(0, "Negative player expected value means the game favors the house over repeated play."),
);

const semanticRule = (claim, reviewedExplanationSha256, failure) =>
  Object.freeze({ claim, reviewedExplanationSha256, failure });

const EXPLANATION_RULES = new Map([
  [
    "ccss-textbook-practice-v1-decimal-arithmetic-q03",
    semanticRule(
      "decimal-addition",
      "f81cc215572a1078385fe752b4396d98d455e2db50c8c456bc40e01c19010d6f",
      "The explanation must establish the true equation 2.50 + 1.75 = 4.25.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-percent-problems-q01",
    semanticRule(
      "discount-25-of-40",
      "ef07a5d2695047def42a1d12d9bc29992958d4e36fed9eee6014196c63ae9c8d",
      "The explanation must establish 0.25 x 40 = 10 and 40 - 10 = 30 without a false numeric equation.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-percent-problems-q02",
    semanticRule(
      "tip-15-of-40",
      "4a325a64fcb124792ea2a08281f1d133add7cb1295c6a0f605c00a1e69c902ce",
      "The explanation must establish 0.15 x 40 = 6 and 40 + 6 = 46 without a false numeric equation.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-percent-problems-q03",
    semanticRule(
      "discount-20-of-50",
      "4be1c6d51a600c1da103641217df2f7e95a39c4283c59d1af1138381c677bad8",
      "The explanation must establish 0.20 x 50 = 10 and 50 - 10 = 40 without a false numeric equation.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-scientific-notation-q03",
    semanticRule(
      "scientific-notation-45000",
      "9ca919278a327c58c44f79288c86325c51157d25c95127b0f17c081618b6998a",
      "The explanation must establish the true equation 45,000 = 4.5 x 10^4.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-pythagorean-theorem-q03",
    semanticRule(
      "pythagorean-identity",
      "9d80823c6d0b41919ffc986255c8456f932c6a8712926995bd5cc492e9bf930a",
      "The explanation must assert a^2 + b^2 = c^2 for a right triangle.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-volume-3d-q03",
    semanticRule(
      "sphere-volume",
      "bf8e079c402bc4a310f842e30863356849418439346a861ad404e6eeb58ca206",
      "The explanation must assert V = (4/3) pi r^3 for a sphere.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-geometric-series-q01",
    semanticRule(
      "geometric-sum-80",
      "f90c49ed33aea6cb6960c251c7517a63795a3d5c24a7de962f28f359e8005247",
      "The explanation must establish the true equation 2 + 6 + 18 + 54 = 80.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-systems-elimination-q02",
    semanticRule(
      "equivalent-row-operation",
      "e939f2f4fe5eac73524c54b108639f2866ec806da2835db095e8930529aff8de",
      "The explanation must affirm that adding a multiple is an equivalent row operation preserving the same solutions.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-function-notation-q02",
    semanticRule(
      "function-one-output",
      "46df78f1147261f95971d7a5dc896038cc50ee98df506cdfd1532eed6f3c7295",
      "The explanation must affirm that each input has exactly one output.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-compare-functions-q02",
    semanticRule(
      "compare-linear-features",
      "2a2654aa8fb8e2928bf4499a17fedd96f880e3b7f295c1f6eb15d6987ea19cd6",
      "The explanation must identify rate of change and intercept as the comparable features.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-equation-of-circle-q03",
    semanticRule(
      "complete-square-circle",
      "a8a584312f89881da92011fd4dfae466c3c6d5f57104355465bacef8401dcc8a",
      "The explanation must identify completing the square as the method for revealing center-radius form.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-partition-segment-q01",
    semanticRule(
      "one-third-displacement",
      "e8a1bed48b017e7bfe92494730bf9cdeae8a22ac1b662ba7e79e48ac2125aeca",
      "The explanation must assert A + (1/3)(B - A), or the same one-third displacement relation.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-coordinate-perimeter-area-q02",
    semanticRule(
      "shoelace-area",
      "36ceca4d0d64d2377882c1d7875867b8d01489c36d6e5049f3b8c599a98f88ab",
      "The explanation must affirm that the shoelace formula computes polygon area.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-fit-function-residuals-q01",
    semanticRule(
      "residual-actual-minus-predicted",
      "5531a717e2cbe1d5a225631129cadced53380fda21687f0e96a028d9c7def989",
      "The explanation must assert residual = actual - predicted in that order.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-correlation-q02",
    semanticRule(
      "correlation-range",
      "44307fbe0c75708938a4b1674f53920a65427a286ee3957eebd29c72ad91cccf",
      "The explanation must affirm that correlation ranges from -1 to +1.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-inverse-trig-q03",
    semanticRule(
      "arcsine-principal-range",
      "fb08e1c421174cd11429ffc313ee0fdbb5d6456fcad8e73ca03e1e2de6fd2c4d",
      "The explanation must affirm arcsine's principal range [-90 degrees, 90 degrees].",
    ),
  ],
  [
    "ccss-textbook-practice-v1-trig-identities-q01",
    semanticRule(
      "pythagorean-trig-identity",
      "942ffc452300dcb8ce27a23024ba74a282971d0a35bd11c567a71e4a45083d7f",
      "The explanation must assert sin^2(theta) + cos^2(theta) = 1.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-trig-identities-q03",
    semanticRule(
      "sine-addition-identity",
      "0b76e9f449317475ac52b80b19644e5f2618f55d65eaca64134f36069e104641",
      "The explanation must assert sin(A+B) = sin A cos B + cos A sin B with the plus sign.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-estimate-population-q02",
    semanticRule(
      "confidence-interval-coverage",
      "3ff26ed1e4d9e09dd7e6ef331ab62bff5b4f83fb6b20fc1da081b7b3f6340c48",
      "The explanation must affirm that about 95% of intervals from repeated samples capture the true population value.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-similarity-proofs-q03",
    semanticRule(
      "altitude-aa-similarity",
      "a87ba1d8f777ddc405f38f07d2d54a946b729cdfb38355c04bfd090e77ea9e8e",
      "The explanation must use AA to affirm that both altitude-created triangles are similar to the original.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-laws-sines-cosines-q01",
    semanticRule(
      "law-of-cosines",
      "d00757666b7f57606d43a084a79e5b63a85ed3c260e2873b97e6012fb54aab01",
      "The explanation must assert c^2 = a^2 + b^2 - 2ab cos C, including the minus sign.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-volume-formulas-q02",
    semanticRule(
      "sphere-volume",
      "052a87fbb307a73eb56013df147d6585de9c45bf8c356afdd41b2ea8ca84c82e",
      "The explanation must assert V = (4/3) pi r^3 for a sphere.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-solids-cross-sections-q01",
    semanticRule(
      "parallel-cone-slice",
      "266a2731fe244afdabb608538496922c8cc83ea87b13900a82123a1a302b3992",
      "The explanation must affirm that a cone slice parallel to its base is a circle.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-solids-cross-sections-q02",
    semanticRule(
      "rectangle-rotation",
      "b4735526b02e8f0012eebfb325a1835c9ae83fc92dbd0621e1300f571e9481a4",
      "The explanation must affirm that rotating a rectangle about an edge produces a cylinder.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-solids-cross-sections-q03",
    semanticRule(
      "semicircle-rotation",
      "0b305752636ba57e2570fdfb0cbd01f5e70d915774414c060f15c33de86b5060",
      "The explanation must affirm that rotating a semicircle about its diameter produces a sphere.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-independence-q01",
    semanticRule(
      "independence-product-rule",
      "5463437cc599030326eb635fd226a9524ef903f76847425862fbb9f3feb70ce7",
      "The explanation must assert P(A and B) = P(A)P(B), not a sum or equality of marginals.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-remainder-theorem-q01",
    semanticRule(
      "remainder-theorem",
      "85c0dd85552552ef1003ed955d927267330e30d8b9720c1d610af13a650d4ec7",
      "The explanation must affirm that division by x-a leaves remainder p(a).",
    ),
  ],
  [
    "ccss-textbook-practice-v1-polynomial-identities-q01",
    semanticRule(
      "difference-square-expansion",
      "ba8ea7ef534a5c89917ee529f6bd7e2860ff1d894da44945e2f634b1a1160abd",
      "The explanation must assert (a-b)^2 = a^2 - 2ab + b^2 with both signs correct.",
    ),
  ],
  [
    "ccss-textbook-practice-v1-polynomial-identities-q02",
    semanticRule(
      "pascal-row-cube",
      "dca0ab467e910721270aae9e849fd4498b5b93f7e6bd18ef31d4b4230fa5a894",
      "The explanation must give the ordered Pascal coefficients 1, 3, 3, 1 for power 3.",
    ),
  ],
]);

const EXPLANATION_AMBIGUITIES = new Map();

const REVIEWED_STABLE_EXPLANATION_SHA256 = Object.freeze({
  "ccss-textbook-practice-v1-ratio-double-number-line-q01": "a9ad400942ae9ed1a257daa600ea0fa1a1e3eb2d185fb597107ada7491d10d37",
  "ccss-textbook-practice-v1-ratio-double-number-line-q02": "ee36a9401e9998cad123e298363457db511fdbbdb864bbf6d1676a1e2a2fb1d5",
  "ccss-textbook-practice-v1-ratio-double-number-line-q03": "da9bf70bf7555ed2fb98a6b018c2d11b6bc5ea225d1c9b8a8d6cc5051a209908",
  "ccss-textbook-practice-v1-unit-rate-q01": "cbeb145ad9d18f3717710580e7507ea9c16d6cc68d92d6c02a8ffb72298aeef9",
  "ccss-textbook-practice-v1-unit-rate-q02": "5fb238455eeb42ed4bde1270a51cda8c19c321e8cd3d19e72df1768678ec9f38",
  "ccss-textbook-practice-v1-unit-rate-q03": "278aeacdb7bdaa6d716ca9f39fa558ee37ffc74ba20951af3ab7459156c3b241",
  "ccss-textbook-practice-v1-percents-q01": "e85351101a1717770ba0321dfa43db237f23f8a231a02b04fbeae10f733e282d",
  "ccss-textbook-practice-v1-percents-q02": "d8bf61c1a29a922277824994b8a825225e3ea85b6a598b97cfb1d2d39257a30f",
  "ccss-textbook-practice-v1-percents-q03": "0aaa9a8d4bca1278f55b6f40925cc97eacdff104c5313a1e754009ce2907904b",
  "ccss-textbook-practice-v1-divide-fractions-q01": "693b2770924eac9a2cb5acce3271c29c226a4852c53e582255b2ebbc0650a4ee",
  "ccss-textbook-practice-v1-divide-fractions-q02": "5898001240118143536fdc2b2456a7f071e1889ef68e07b92755d17028f3f39e",
  "ccss-textbook-practice-v1-divide-fractions-q03": "28bc9ec397dd4c9a79201a5526d4ce75b01992c02e959f542a3e1563afffc413",
  "ccss-textbook-practice-v1-divide-multidigit-q01": "50e48025f4f723bea1ea7f1ae67b74b76b2844016cd293f09e78e5e25238977c",
  "ccss-textbook-practice-v1-divide-multidigit-q02": "6fa196016334d4ba2e0ba8984c0088b1590409ec3a9aaf13dd0d76dafe31b0c0",
  "ccss-textbook-practice-v1-divide-multidigit-q03": "1844e619026587cd3204bbdca03e8a56bdeac7a500792adc154736291ffdd251",
  "ccss-textbook-practice-v1-decimal-arithmetic-q01": "67612e4c547ab2df737a187fc37c8d3ad94ae13389d1e266066ab39745439b4f",
  "ccss-textbook-practice-v1-decimal-arithmetic-q02": "2ceb20717067ad08a1f887d1d9f63fcf1c4b6a1731b049637b2882ba333450e4",
  "ccss-textbook-practice-v1-gcf-lcm-q01": "2a75e34191d00583258ce3c6ce92b0ffdb970eadd568f4d757f10e3fac002956",
  "ccss-textbook-practice-v1-gcf-lcm-q02": "fd93a2d33470ac5634dc03b90c040ae98957314b0926755cfed6c1c46ad0e695",
  "ccss-textbook-practice-v1-gcf-lcm-q03": "b3f8a36bd05b2f3948736ed4adb1ae8102984e52907bcfd5af45cc709b981137",
  "ccss-textbook-practice-v1-negative-numbers-q01": "ab7389e5cd24ccfc1cc4939293ba6589848c00de57ad60ef36f8f522bb15e1b0",
  "ccss-textbook-practice-v1-negative-numbers-q02": "e41c4ee0594a5848fafd0039da2efceb1866a318813384de243fcdcbab149531",
  "ccss-textbook-practice-v1-negative-numbers-q03": "9b3fd61fc309d9d53019eeacf132c7050e3ac73b31276ee7cc3bc9826c83962f",
  "ccss-textbook-practice-v1-absolute-value-q01": "2afc5f6bdde5a2f2eb0f3d301ee8ecd0c87f0a983126e736b964547a63c0f1e0",
  "ccss-textbook-practice-v1-absolute-value-q02": "5986d117c7d9233c7227387068f28f517f332e4e886c13e343b9d13d31be88b7",
  "ccss-textbook-practice-v1-absolute-value-q03": "508864e30e49b09a540e1f888579275bd56253c80fd277791c65cb62c7f06748",
  "ccss-textbook-practice-v1-exponents-q01": "73ed9dc5afb436d1a20474ad5966e5cdd14ab976cfa6c40b6bc7756005013ef6",
  "ccss-textbook-practice-v1-exponents-q02": "fcc9a38f8a88b9563901306aca9b62e779fbeabc80c788cb79fa480b59fb63cc",
  "ccss-textbook-practice-v1-exponents-q03": "f82aed979e78248dd76b23a51a8ca63611bd89ca200d4cb95cbc382c51086aa5",
  "ccss-textbook-practice-v1-variables-expressions-q01": "c5b8661c5d03a17f940116796258139b623f9eb2d44d7bae40d23c96ccdc56ba",
  "ccss-textbook-practice-v1-variables-expressions-q02": "d895dd5d77c8cb988ac2704fa3eeeabd25bebf55a6c06550bfa0f07bd47b0694",
  "ccss-textbook-practice-v1-variables-expressions-q03": "d8b02407b98e6ff8bf1aaf73cb8f5eee876d2eafe9d13f2df7223da1d563f538",
  "ccss-textbook-practice-v1-equivalent-expressions-q01": "1290e12a6346cf426d6c494d3ca7442689ec2644640977f79fdee3306962e0ae",
  "ccss-textbook-practice-v1-equivalent-expressions-q02": "bf0342735cd8d05e7c76b0f3f48b8cf0fa339c126a2f3a2747648fef4251e822",
  "ccss-textbook-practice-v1-equivalent-expressions-q03": "1c6e4ec6331a3b003c0446877b36978725aa14f19473a8043860b24dfb2ed08d",
  "ccss-textbook-practice-v1-solve-one-step-equations-q01": "044670aa3bce80a65fe3a157dee5cb8d1f7bef1504cde7bb29f4bcb8d6ee4bf0",
  "ccss-textbook-practice-v1-solve-one-step-equations-q02": "122a55face6d64b8311e54c62cc615892ca65ab7b7d1a35abe62132f76b6bac7",
  "ccss-textbook-practice-v1-solve-one-step-equations-q03": "a41fe9da1bc60a329cba8f7ba67c5b3f009c0f064453e0fb32e03f536fc082b4",
  "ccss-textbook-practice-v1-inequalities-q01": "1f6788f6d2960b4a38fa8bc3fa1125ae6296730b11b6561a9432e00de89b4d7d",
  "ccss-textbook-practice-v1-inequalities-q02": "6247780526b549a1a6d1a48ecfee07fe122db6d7c048983a171bd13039c84e72",
  "ccss-textbook-practice-v1-inequalities-q03": "2757ff9b27cf00c40f61d108304b7fabaf5b430ba12ef5d84b56713d4c52c9c3",
  "ccss-textbook-practice-v1-dependent-independent-q01": "8e1a63e614e84bda22902d3cf2c3d9c9aecf80b41ff242ff668060cb844ca2f8",
  "ccss-textbook-practice-v1-dependent-independent-q02": "94b15a63a12c3de2e0a9a59f23ec87b4f6ae382fdc7dea89c05761e98fe9c6f8",
  "ccss-textbook-practice-v1-dependent-independent-q03": "a3f18d991aec70b3aecbbe300ef36c422f8e7333dcc560deca1aa4e2fb0330b5",
  "ccss-textbook-practice-v1-area-triangles-q01": "bfe4e75750a411e8b9ce0b45e5ecf7630904cb28063f1181f01084ba0af9daf1",
  "ccss-textbook-practice-v1-area-triangles-q02": "fe8ca02e4b0551b53eebb7d5d569c24a3d8bb3f53b785b059a81242f9a8d363c",
  "ccss-textbook-practice-v1-area-triangles-q03": "29415fc4f2bd9a07c691d58df47f06e1981f29b89cc9f35adf66a89581c6b18b",
  "ccss-textbook-practice-v1-volume-fractional-q01": "2f8160d0ec6c4a0b6ce116b275c1c2d93c834ce422e2de7d246220b0eb772c4f",
  "ccss-textbook-practice-v1-volume-fractional-q02": "16d22acac31c710e18657ce1a4d130a7045528c0f577b85699730c6b3158b97a",
  "ccss-textbook-practice-v1-volume-fractional-q03": "fe09ac9f910e202b2e7aa509ecb855c68c8f43fca23102dcb5693f73e6625709",
  "ccss-textbook-practice-v1-polygons-coordinate-q01": "81c91a5cf2522fbfb9bc8e61da07bf9d90b9e5153db9a82f203688d6a314e47d",
  "ccss-textbook-practice-v1-polygons-coordinate-q02": "84905c79c04f26dcaa0efbad70ad52e6a4a875b91f124aca688579390e658cab",
  "ccss-textbook-practice-v1-polygons-coordinate-q03": "d9b07d74f1485fc304f073032634759d9b4289dc6e8fd765091f6e941896fc61",
  "ccss-textbook-practice-v1-surface-area-nets-q01": "a7deaf0f082aba79591bd8da6ef61549ece02b2ad14fc44c0e5b5a5430f39c56",
  "ccss-textbook-practice-v1-surface-area-nets-q02": "14b6d7f50c1b28590d73ae4438254b01a55d9904ebf940aa6593c4c9be1cf55f",
  "ccss-textbook-practice-v1-surface-area-nets-q03": "fd951cea4f4a069ac1de5429821021296d615e62b1ebb91101414738523772b6",
  "ccss-textbook-practice-v1-statistical-questions-q01": "f610c3dbb7bb09afb43b29defcaac5cd3f64326f3132e75c30f95d968c1e733e",
  "ccss-textbook-practice-v1-statistical-questions-q02": "4e2550b75fb79a43a45839a40690c114f26bdb01e9f9efdb1e7bc0339b0f62d1",
  "ccss-textbook-practice-v1-statistical-questions-q03": "ca14ae9bdbfad26d9df093f3ceedef4b795c9f81871a13b2414cb89c1e43c94c",
  "ccss-textbook-practice-v1-mean-median-q01": "d06500bf3d3cbe9d418a0460a44bdfc806dfad66d10c34faed3d65f31efc2e54",
  "ccss-textbook-practice-v1-mean-median-q02": "f7137ea369911c3d19def2ad3a025657fd72e7df72c598d1d15b7ed6f84cd649",
  "ccss-textbook-practice-v1-mean-median-q03": "2c9df6e2a37f795146b467a78c055f417d45208959d10ef19afb327ecd607e6f",
  "ccss-textbook-practice-v1-data-displays-q01": "9045e3aa29d3ca3fcfda022e4773779670fbacb697b6d24ee13e030abba04c8d",
  "ccss-textbook-practice-v1-data-displays-q02": "a70512f79692ced7fb4f1d6f5e5c27ca9636082abec8c3dac22701c3bbb573c6",
  "ccss-textbook-practice-v1-data-displays-q03": "c0258970d65034d9f144d7be00f12cd1d114c72bb717c28e0083b6fde2d7db1d",
  "ccss-textbook-practice-v1-four-quadrant-plane-q01": "8f39710973434b433de4bb6cee60011ffa8bb60bb91dd411e8987e263df7e224",
  "ccss-textbook-practice-v1-four-quadrant-plane-q02": "fe18640138909ea9c2f4970d050198eee3eb07b65cb9d60ea4f8776e4fe778d5",
  "ccss-textbook-practice-v1-four-quadrant-plane-q03": "e1409d863cd5a37de4d1f6efd3f1391dd4924d2b44a09f0aee1c64fa7636a1a8",
  "ccss-textbook-practice-v1-integer-arrows-q01": "fb2cbd18904b7036521277b538733037f921fb7164dea6a35974c64f95886509",
  "ccss-textbook-practice-v1-integer-arrows-q02": "e1f85a5692fcee184df085210f23c432bb16553510f1e5870123794d4364f97c",
  "ccss-textbook-practice-v1-integer-arrows-q03": "4c037804e37ea4c781f0d40b80fe35b35388af91dd55e0ea5ed5292f8cd2452f",
  "ccss-textbook-practice-v1-complex-unit-rates-q01": "df1b97dac5f3a168e288efcc11bac6bf781d160bcd2171aba91999fcaf4ddf31",
  "ccss-textbook-practice-v1-complex-unit-rates-q02": "780cbccbdff1ac4acf17e9a131929def7c9b9866896090c31e9460a26e3b1ad4",
  "ccss-textbook-practice-v1-complex-unit-rates-q03": "4995b8fee8a633d1aed1bebd7042ecf99c4d7c7804bbf21842daf2e80b85732c",
  "ccss-textbook-practice-v1-proportional-relationships-q01": "686f090702f355f5be304df5ce0ed5c319743c73fb8b9b39f5283b27b67aaf6c",
  "ccss-textbook-practice-v1-proportional-relationships-q02": "a4832aa2f03a5c345d5e23e9f628f39a5ce6eae95b9b4242d1005f4c0363ac9d",
  "ccss-textbook-practice-v1-proportional-relationships-q03": "c354abaebd201c128ec4ab40959c6b2528e030fa98ce09fd2b9471a11e0e1db4",
  "ccss-textbook-practice-v1-multiply-divide-integers-q01": "2e528d644e83ac34b2c0cf6d0753c69310b89ff5b66b8ae0fb9ec1392b79f4f9",
  "ccss-textbook-practice-v1-multiply-divide-integers-q02": "cc9d1d5dd100589ba1bfe40a59c6de5e41155d8d940d786d4f14b30abe1025e9",
  "ccss-textbook-practice-v1-multiply-divide-integers-q03": "40c7938b2048b46a1f4f93adab44293611fb8a9d4be3d920626d7ccecc9060a3",
  "ccss-textbook-practice-v1-rational-operations-q01": "7985ca3bdab9a69fe7bed766cee99ee2a0f27d239bed6333d512854d943fe3c3",
  "ccss-textbook-practice-v1-rational-operations-q02": "68722797204d3b62f1da9ca5f6cb9484dd7ce3efc971e2f10e6b18efad9d90d3",
  "ccss-textbook-practice-v1-rational-operations-q03": "6ea3b840bd660405f50b4e7e555e6a352b544ecf24c90dc1f1591a6658957c1d",
  "ccss-textbook-practice-v1-linear-expressions-q01": "1290e12a6346cf426d6c494d3ca7442689ec2644640977f79fdee3306962e0ae",
  "ccss-textbook-practice-v1-linear-expressions-q02": "bf0342735cd8d05e7c76b0f3f48b8cf0fa339c126a2f3a2747648fef4251e822",
  "ccss-textbook-practice-v1-linear-expressions-q03": "55ea48878b9ef789051b79b90ac3ee8d382cacb1a0401a2a099ae855135ed4b0",
  "ccss-textbook-practice-v1-multistep-rational-q01": "4228edc192d7b47d13298f4bdfbb3ee118ece5ed34651154ef51a2e2cb8e9530",
  "ccss-textbook-practice-v1-multistep-rational-q02": "994535b89bd4d886e66b017200805206f2c6b1985ab9d9f26096ae015cd4af98",
  "ccss-textbook-practice-v1-multistep-rational-q03": "7eddad5abe2d1d0f245646f319309da012a54dc6e8d8965d25e95c81ba891a77",
  "ccss-textbook-practice-v1-two-step-equations-q01": "4bd7eb36a190e98d6edae1bfecd2c2f7dc259943accf99ddbe2a326f323f609a",
  "ccss-textbook-practice-v1-two-step-equations-q02": "4c9a1810a19cd3e14813559f5f15b98dc225a3db87e86b72b8ad1e047f5a0ffa",
  "ccss-textbook-practice-v1-two-step-equations-q03": "dda0ec47db596b42f6e72eb46e533746c14e573014f88d089cb614af6a9066aa",
  "ccss-textbook-practice-v1-scale-drawings-q01": "4c46610120150f062a39e4fd0f051b280b4b54adfa2ddcf12c1e2e363cea803d",
  "ccss-textbook-practice-v1-scale-drawings-q02": "7bd1d1d8ef29a2a1fae4bac8954b7bc41ada20ff7478777488a25ae02a2c4dc4",
  "ccss-textbook-practice-v1-scale-drawings-q03": "0abec7e4840ffb4639a66a3c8a9cd00512c4383b2c33ec8bae62b532755dd143",
  "ccss-textbook-practice-v1-construct-triangles-q01": "69de1b9bc1a0556ca0c322c4be6b7be6cf7ec5b9bc8ba8b945d860e92cfe9d6a",
  "ccss-textbook-practice-v1-construct-triangles-q02": "a33c8c9f415e3f42bb6f8baa019a2cbe7405a2cc71b188c23a334ec51a419339",
  "ccss-textbook-practice-v1-construct-triangles-q03": "c684a072b712c09591eff20e94bbb5d2df2b8bbd01f0930c99718b06bea21f9a",
  "ccss-textbook-practice-v1-cross-sections-q01": "054ebefd6f2bbb79b5fa44fe6a6484044b775647f7fcffcbfcdd57c2ba326d91",
  "ccss-textbook-practice-v1-cross-sections-q02": "d2508c78169d9c14ee6563396cc24a1feb469b5382c64f6f9432e4ee9f85e1fb",
  "ccss-textbook-practice-v1-cross-sections-q03": "3822a867f0aeaece4f2375a07df004190ad84f154a827ac2738c96ad8919bb21",
  "ccss-textbook-practice-v1-angle-relationships-q01": "5c8b0d91dace3b6a70c74bc065cdad3dd01ee64f5da9690e2d3879d30840cd0f",
  "ccss-textbook-practice-v1-angle-relationships-q02": "232e9a044f662f7825f50643a3147c5bf3416a2272cd21e5bfbbed4ac632409e",
  "ccss-textbook-practice-v1-angle-relationships-q03": "529a93055ca5eef82805407df1169d00dd5c293601cb433f26e7dd7bf2551061",
  "ccss-textbook-practice-v1-area-volume-surface-q01": "f12e47c37acecf98dcc1bdad18a52b064594f1f3c719d37ed3740325d9965d0e",
  "ccss-textbook-practice-v1-area-volume-surface-q02": "1082bb09c7f3be93257a50d918d614306ca3ba54ef58353121c3b6f52a60747b",
  "ccss-textbook-practice-v1-area-volume-surface-q03": "5888da05cf4d1db201a3c97b31380d68ad925a819c6a01337c695e3221898cc0",
  "ccss-textbook-practice-v1-sampling-q01": "9d7886083f1c3aa45c5a9ff30b3069f20b62d3894be0ddc3df314ac0b6d1457a",
  "ccss-textbook-practice-v1-sampling-q02": "53850799d9d93685eea23ed8bc1855af34ed2c1e1b3c2463eea1eadef07847ba",
  "ccss-textbook-practice-v1-sampling-q03": "cf7be94d0b219c4a0738fdcc89b2c0d4565a63ba5f6c34429ae71b0ec0d88f80",
  "ccss-textbook-practice-v1-compare-populations-q01": "b25efce75151ef1b693de00ce7c058a0125707048a032a61562b5c3b6ca3dd3b",
  "ccss-textbook-practice-v1-compare-populations-q02": "704f84c755e2bbeba6e0fb09a229133c0711bd188c04bfd6469ea273e56bf50a",
  "ccss-textbook-practice-v1-compare-populations-q03": "00a26fc0f266b9239fa7b15321749af6074493f5c88127d69ac6e3065445bf5a",
  "ccss-textbook-practice-v1-probability-basics-q01": "9e7bd83b9be64079a66087a0cd37bae670b9f8913a71ea0b80e0c3cb2411e7a6",
  "ccss-textbook-practice-v1-probability-basics-q02": "6624c143377aa7a6c8bc5b56d9ee63e60d15729a7efa94ab8bba112b1636b3c5",
  "ccss-textbook-practice-v1-probability-basics-q03": "1091ed51445078446e755e2f0b336024ab083f2303fbc481bc98ff8c185798a2",
  "ccss-textbook-practice-v1-probability-models-q01": "adf8b2919c0c2ea5b163daa1f0609824df45a4127891277505b3a90f6cae0616",
  "ccss-textbook-practice-v1-probability-models-q02": "bea68fe3f5f056551bb52c8d2293a87689596170fe75b8ceff42117138234b15",
  "ccss-textbook-practice-v1-probability-models-q03": "981157776dce7da2573e98469b80e419aa7f3207fdbc8b2f8a98bcc27eaec39d",
  "ccss-textbook-practice-v1-compound-events-q01": "17a2097d29ee084c18dca4ad3b884620bd99031526eb743d225f846f0dbf5b6e",
  "ccss-textbook-practice-v1-compound-events-q02": "83cd9b0b8f9cb17c256887ad32c5f7d02257ba00f330cfc6627c1a3de3e63ad9",
  "ccss-textbook-practice-v1-compound-events-q03": "0b4f69e942f73cb1c90ed93534ffe883c4f5b992fcf3f0b47989c4813b84f470",
  "ccss-textbook-practice-v1-circle-pi-q01": "3b40dec8fb283ce141199b62464e8bdc8af5cb9e9950ebb702953f6f66a51721",
  "ccss-textbook-practice-v1-circle-pi-q02": "faecd8f70fcf702d6134c74ab5aadcc003b2bb1bdb3b4d91774004eda17ca19e",
  "ccss-textbook-practice-v1-circle-pi-q03": "5a53f890352d550593d1619559fa2782301b794db1f192788ebe7ef546f48d63",
  "ccss-textbook-practice-v1-slope-explorer-q01": "3c603fe7a132d5a84e8f94437d27574854ef7d71610a98a86c121da04253f447",
  "ccss-textbook-practice-v1-slope-explorer-q02": "25014e7c637e15e8a1eb88a93337f2345dfe9b340711502911cbb75a61641d42",
  "ccss-textbook-practice-v1-slope-explorer-q03": "b3876f78edde3d709c9b2f1d2188cff9c8a3f2bfd68323f7a5b47cd9f6b80892",
  "ccss-textbook-practice-v1-rational-irrational-q01": "707578f5a22bac1b0f54cf5549b20154cf73e2f4e51bde5858432584a3c056b1",
  "ccss-textbook-practice-v1-rational-irrational-q02": "03f97dda8fbc80c033f02f7db853f767b5c5ff749f394decaaa4ad02b9154888",
  "ccss-textbook-practice-v1-rational-irrational-q03": "3ccc62b64832eea6036aec02edb320ca122b26f97b370755262bd5694f235c44",
  "ccss-textbook-practice-v1-approximate-irrationals-q01": "e5b798070aa32d12c3e2020419318d5be9dc98032f54ca8500655fc193ff2bb1",
  "ccss-textbook-practice-v1-approximate-irrationals-q02": "fbf3678f8845a869ca279aea3b8870cc9c384ea4dd394205dad737e7f296d17d",
  "ccss-textbook-practice-v1-approximate-irrationals-q03": "87fb587994f406841f8e41f2b1797fea80c1834de3292d2db3babba631fe6389",
  "ccss-textbook-practice-v1-integer-exponents-q01": "78b2ed7985392fbf2119071f5ef71ea095aae989825dfe727369f4f7edcbef69",
  "ccss-textbook-practice-v1-integer-exponents-q02": "aa48fb655cea69837c27eb19e6b138085dd45a60f2661a7ceb49ab8a8d5b0cb8",
  "ccss-textbook-practice-v1-integer-exponents-q03": "6923291c8c8a729dfc1dbebc35c0b4c179847c5ce1cf132c4025253c51d954fe",
  "ccss-textbook-practice-v1-roots-q01": "6793c2e7aca72f94081827587c38d8d0e9a268309ebb6668f5666f054d9057de",
  "ccss-textbook-practice-v1-roots-q02": "510df66ec4771e76bea6f5dfb6b133c97f757994502c336b3fb37daa24b4c9bc",
  "ccss-textbook-practice-v1-roots-q03": "015d7e13e9e5bfdc4bba73053de7b7d9441c24f302b8b973728a25da86e5e1ee",
  "ccss-textbook-practice-v1-scientific-notation-q01": "fa939000dcd58f4bc02f46e0aa0ed25a45c49183330167c9ff7e8cab9c72af9f",
  "ccss-textbook-practice-v1-scientific-notation-q02": "2d61e12bc559e681c14f35e9db173e77590e126b3f12ee2dc96f5cbef2dde90c",
  "ccss-textbook-practice-v1-slope-unit-rate-q01": "6f82a3a9d6384b5bc66072dbe8fa33d13dc37207db006b51471e9ca8735b1bf8",
  "ccss-textbook-practice-v1-slope-unit-rate-q02": "27a70fd2638ce613784535655ed9b5b88e96a944f56b9a84f328dd374600667a",
  "ccss-textbook-practice-v1-slope-unit-rate-q03": "c31b28c2fb56e47d38afa4cb054b29bd6ea73adb987935197a998f681e5ec4fc",
  "ccss-textbook-practice-v1-linear-equations-q01": "403ebfdc4b081cf02e153fcb221194ab9ed229d8338e08a3c93e9ee644d2e701",
  "ccss-textbook-practice-v1-linear-equations-q02": "c9945e9aebfa41babcc487b283d4039821497a933dfde2ff5b01a4533146bb0d",
  "ccss-textbook-practice-v1-linear-equations-q03": "eaa43e9a718c529873c1966305fcd41bad51a3ca2d1b132613868aa2f43119ab",
  "ccss-textbook-practice-v1-systems-of-equations-q01": "2dc681188bef18fec8d54bff81ae1a5a45a2588cf83a2b921332282635606946",
  "ccss-textbook-practice-v1-systems-of-equations-q02": "1cef79f89994177cbbbfa9d0405a3e39c287468d7ebe6a191646bf94f4b9bb3e",
  "ccss-textbook-practice-v1-systems-of-equations-q03": "f08ca35e8853d8b40360b84628aef63fda1c488d296fcc04c7fad577e73f3867",
  "ccss-textbook-practice-v1-functions-intro-q01": "0b134ad28ff81cc233fbfe6de426724f6615866025cf73e9b27917d6b76c492b",
  "ccss-textbook-practice-v1-functions-intro-q02": "952484dd818f105f8acb50c48f90675369ebd908ddc20708145bf4f609ae9f83",
  "ccss-textbook-practice-v1-functions-intro-q03": "e562e4df9242284824681060f157eec547922f55d85f4caa9fc1a7b378246f09",
  "ccss-textbook-practice-v1-construct-linear-function-q01": "f419ec3818307516bdb602d2a5e5035479d3e82b1353a272efe24c8b1e6f9de2",
  "ccss-textbook-practice-v1-construct-linear-function-q02": "c5b8661c5d03a17f940116796258139b623f9eb2d44d7bae40d23c96ccdc56ba",
  "ccss-textbook-practice-v1-construct-linear-function-q03": "44e531e71f9ae3d8a7da62fb7b24fe3c7afa2d8995daf58d94c8b70c237e99cd",
  "ccss-textbook-practice-v1-graph-stories-q01": "a79c06adfc2704ab9e59faf7bd57f74996ca5e6bfb2e951e508b3c0af563360e",
  "ccss-textbook-practice-v1-graph-stories-q02": "e38daef2c587aefe4b2f91b18de0e015e3ee6655bc9b41f70df611b5f8820568",
  "ccss-textbook-practice-v1-graph-stories-q03": "2caf90c396b805142f7ac705247baaf694c606932e28430bb78b049a5ba07654",
  "ccss-textbook-practice-v1-transformations-q01": "4b3c4d1db5409fceec9ece7e19f3439fb800e8bf1f5f81d30533c9175a996cdd",
  "ccss-textbook-practice-v1-transformations-q02": "3de2271c6ccfea2d665917a3b06b22d410a03c7651c38d21dc858a861122d749",
  "ccss-textbook-practice-v1-transformations-q03": "9898621ed9fc8fcf8ce32409600a30789e101a7eba4cac12fa6b8b7a7c26205e",
  "ccss-textbook-practice-v1-congruence-q01": "4242a27c4c7cb9e46c7489d4937efa3ec151e33a1c78fd253eaf2b893c92603d",
  "ccss-textbook-practice-v1-congruence-q02": "973686299506c27e711c0ebfb6f452560b9fb93d220491ab313481adcc530bf7",
  "ccss-textbook-practice-v1-congruence-q03": "fdb915aa9a5e71878065835391f3c316db0bda8c61484ffc923245c304c1870d",
  "ccss-textbook-practice-v1-similarity-q01": "e8013585033174d9a54495f6685ec8ebbefa42a564a188f9f060aae77f49a92f",
  "ccss-textbook-practice-v1-similarity-q02": "4c46610120150f062a39e4fd0f051b280b4b54adfa2ddcf12c1e2e363cea803d",
  "ccss-textbook-practice-v1-similarity-q03": "a61a76dc5053ddeaf8b8748a5928971695ebf2094dce39f940791b6018183631",
  "ccss-textbook-practice-v1-triangle-angles-q01": "ce2f7c0743d1ca8815ebd9d5041c28169bed7bb7dc0d20fc2bdc570ddd7430a8",
  "ccss-textbook-practice-v1-triangle-angles-q02": "89199e336b855b5459b8713a14031e9579ac399c12a0e9884a7fa835a902745e",
  "ccss-textbook-practice-v1-triangle-angles-q03": "9038410861e35f911fd1883266249c62b8a1ac991a8dc576a8462773b0370aa0",
  "ccss-textbook-practice-v1-pythagorean-theorem-q01": "76922c674bcd32ab6b3ba8a88dba9daadc3acf7e42eee52add677efa3f6aaf7a",
  "ccss-textbook-practice-v1-pythagorean-theorem-q02": "e2048729a5eae082e6c2f25014e9896dd08c7072d076e6955b8b06fa101e6ab0",
  "ccss-textbook-practice-v1-distance-formula-q01": "cdd2ee4aca7336040f8b3e248092a6d29f3706d43925016aad28795f2acd73fa",
  "ccss-textbook-practice-v1-distance-formula-q02": "8941ba40fabe6e486f104a81c8711945bf86e31bd9bcdc42befc2a050aff19fd",
  "ccss-textbook-practice-v1-distance-formula-q03": "a371aa96eab1939245d7693eb768273e2983e41831c517d4651a0c288f1ac304",
  "ccss-textbook-practice-v1-volume-3d-q01": "966e4f63900b401802ec30f9e68982e850daa7c65213e7c57cce16f6d2aea727",
  "ccss-textbook-practice-v1-volume-3d-q02": "8c6b49bec5a1f1f47342dac6361d081c3cfeaf52dd2e850763f1580b15f338ac",
  "ccss-textbook-practice-v1-scatter-plots-q01": "036045dae8a187ceae9f5e16ac82388d7d0eb84e0a8c509439185babf67e07c5",
  "ccss-textbook-practice-v1-scatter-plots-q02": "a995a6f0b52596b88ae79e1fb04e2900708b40f691524962411b18d55f3b3b81",
  "ccss-textbook-practice-v1-scatter-plots-q03": "3747f251cac57649a5627380a830f5455a86448c08b3ddd6daec451a4d1a75c7",
  "ccss-textbook-practice-v1-line-of-best-fit-q01": "ce2225e5ff90ff1d05d824088897eb4081ed456bf64e81ceb2d01465e28a6040",
  "ccss-textbook-practice-v1-line-of-best-fit-q02": "e3ce1d5ad2cb8b51cba6e903e26ffa213359197f8b76ecff3367e9e54ddedc66",
  "ccss-textbook-practice-v1-line-of-best-fit-q03": "5015b436dd95211630e36a54625656da645cb46eab392542c9f75a5654b85788",
  "ccss-textbook-practice-v1-two-way-tables-q01": "13a91704b31f55b32a9478c6fba86a1ca6077bd0f9c1b8e421f1d484f5131584",
  "ccss-textbook-practice-v1-two-way-tables-q02": "fc6673e8dd43915aee7fe89badac07a4b564d534be3aa7e34aed829dcc48e625",
  "ccss-textbook-practice-v1-two-way-tables-q03": "2683a628b8bf39942757abe63a2f74649b1ce858a34f2604da625f6cfd13cd74",
  "ccss-textbook-practice-v1-rational-exponents-q01": "77c79a060e1d0d04614d8cd16089135598c1ef2ca0518e0283e6dea26594bec9",
  "ccss-textbook-practice-v1-rational-exponents-q02": "b817b7460eb8035688945068d1088e3beb0ff4b2faa05c1aaf164ce6dba3de2f",
  "ccss-textbook-practice-v1-rational-exponents-q03": "675e8ed192fda22b021e954e69693d1196322db982e4cfb3c13e67f67c6b37d0",
  "ccss-textbook-practice-v1-real-number-closure-q01": "d851773fa063e667b7cdde8cb5b1735997c73534412296ac247ab37e128614fa",
  "ccss-textbook-practice-v1-real-number-closure-q02": "70b37b413f1c582e4affe750d2533c23a4c057f0223149523246837d656a7e9c",
  "ccss-textbook-practice-v1-real-number-closure-q03": "ba165c886665dcc6b67500cc682dbd1636908d37de5ced3c8487e0a06d06f470",
  "ccss-textbook-practice-v1-units-quantities-q01": "2de4d2d4a5fdd98496f8d194bd3d4aa66c1ad5738a4a52860dae946369c04bdb",
  "ccss-textbook-practice-v1-units-quantities-q02": "f3c3da81b6d7729e53665781410a12e721d6501389f1889652e6f12a48a632a5",
  "ccss-textbook-practice-v1-units-quantities-q03": "d51317a4d5a905214587cb53fb313ff1b996a0fbc53a701d9d8fc483c65f45a0",
  "ccss-textbook-practice-v1-complex-numbers-q01": "ca2e708395aabdc770e3fb2f11f63210d7593a5a9785f8c2cb1ba1695c56459a",
  "ccss-textbook-practice-v1-complex-numbers-q02": "618c810aa52b2fb65f75a8fdee76651b7dfa587c4988cad0b6da77aa4e253f1e",
  "ccss-textbook-practice-v1-complex-numbers-q03": "b739b5508ac9dd210369735fd369c4058db5626efff873288d7109943522b708",
  "ccss-textbook-practice-v1-complex-conjugates-q01": "8b239dd4efda56e68c1c4d7458ff4a174619017c4e6cefbbd55e3f361c310cba",
  "ccss-textbook-practice-v1-complex-conjugates-q02": "68fe9c294ca4feeeb4cbbea9b7cbbdd42cc8fc8321b5e369552185b317ef7635",
  "ccss-textbook-practice-v1-complex-conjugates-q03": "45bfc66efebb3567c1251f3bb2616be0c675a43f523dd166e2635f6422730023",
  "ccss-textbook-practice-v1-complex-plane-q01": "6ada12ad317b16f02a473991bd89f2434a5590c68262770af9a1b020a27400e7",
  "ccss-textbook-practice-v1-complex-plane-q02": "ce057c116f6d4f61177463d5f5c2425a92b3eb1d67be98b25f1b214ac0cdcb4a",
  "ccss-textbook-practice-v1-complex-plane-q03": "a735bf662dd13cb53660311c4cadd7928338429e5d91f63827247ca141b643a9",
  "ccss-textbook-practice-v1-complex-solutions-q01": "084136b8f3f0a49cb87cb6e18f468bdafd9dcf1c72c89fa6d0059005a3529eeb",
  "ccss-textbook-practice-v1-complex-solutions-q02": "ec1ae6ccdc5145968ef57dcab533be057c7306fe446e1c2a1b14c34f6dd10851",
  "ccss-textbook-practice-v1-complex-solutions-q03": "cb10837d95443b5abdfc204b947f613730b3265bc74b95b2fc240a515d9f8a7a",
  "ccss-textbook-practice-v1-vectors-q01": "28edd106f20cfaef40642d717e5b2099f153d88be80511193642819104e36891",
  "ccss-textbook-practice-v1-vectors-q02": "cdd2ee4aca7336040f8b3e248092a6d29f3706d43925016aad28795f2acd73fa",
  "ccss-textbook-practice-v1-vectors-q03": "7e5147bb69473d87b167d44c50ce084e4b85c780f1bcc71be40cfdce9e00b384",
  "ccss-textbook-practice-v1-vector-operations-q01": "e1f8ddaa26674021cf9da51332f8019bc951b02a740438c8e6902021b4068ce6",
  "ccss-textbook-practice-v1-vector-operations-q02": "88e3305e1f12eda5045bd61be96434ab56e88fe45747553ed1b30f2f66882e30",
  "ccss-textbook-practice-v1-vector-operations-q03": "2ddc56d217f8c561161b4b5020e125151b9d7b52494a1225c930a0e8013bfcf3",
  "ccss-textbook-practice-v1-matrices-q01": "46fcc8bbcbf3f5192180dec25eb337a32256285d319e5a808a0be978251446be",
  "ccss-textbook-practice-v1-matrices-q02": "e2c551adb7fb886140f8bf0c5f7820d28b7b85ac500fafbd4b01e61f596f46e5",
  "ccss-textbook-practice-v1-matrices-q03": "45d3113bd25fe1901b1877d5ba5f0fb25353114683839d1545ff52a13b54633c",
  "ccss-textbook-practice-v1-matrix-algebra-q01": "6a13705d5d2df333363a937cb6bff522611abade57c2b2a0bd40a2e665f5dcdc",
  "ccss-textbook-practice-v1-matrix-algebra-q02": "3a7e8d8eead707fd8085f357f86f5bcb6c004f440646866ead2c69c0dd8b9612",
  "ccss-textbook-practice-v1-matrix-algebra-q03": "faaecc0fd1ce071185b57cbc27d1d08c6569f260f63479570eef6349e4256bfd",
  "ccss-textbook-practice-v1-matrix-transformations-q01": "2c2a49e587be5ff5e8469faaeb894d82001a41a18a51593d159107e9d702946f",
  "ccss-textbook-practice-v1-matrix-transformations-q02": "a8132ccbc0c2041fada42f700e45e96f316cbe5504e4e5635faf4dcfeaf7b76d",
  "ccss-textbook-practice-v1-matrix-transformations-q03": "44bef270430598b72d0398485866440af5ad897acf4339d38beaf3eebd2dd18f",
  "ccss-textbook-practice-v1-interpret-expressions-q01": "83d082aed2389c60ff696bf434088e73328d5a001221b2a2138df4c328c2fc2a",
  "ccss-textbook-practice-v1-interpret-expressions-q02": "706bda5e3f2bbe944529a481dffbbba90a8501b77c9bae6d024897d39454143e",
  "ccss-textbook-practice-v1-interpret-expressions-q03": "c893f0b59ebbfa59b00c0be1a263a16530065159fc2c5e81f9acc189d322dc49",
  "ccss-textbook-practice-v1-rewrite-expressions-q01": "f838b4f37c21550ffae1e2623c91e3a91c39dccd856401d6895ff5f69e857b66",
  "ccss-textbook-practice-v1-rewrite-expressions-q02": "cd52671c73a5a2005e7a8aab05e0dd013155e8f2b7b83698546b1f1a56c66a84",
  "ccss-textbook-practice-v1-rewrite-expressions-q03": "1d3dcad74b7a31d2aea8cafb1c7dd17a9a2e7ddf1a20fbd3188c8e9a63857378",
  "ccss-textbook-practice-v1-geometric-series-q02": "7aaee0842a0be344f441bfe79f79ddd516e7be7230e35e1303c5d00fa4804075",
  "ccss-textbook-practice-v1-geometric-series-q03": "a4812483ab8e71fd16fafe794eb2c532de1782868b68f40e3a8c73ad5f5941d5",
  "ccss-textbook-practice-v1-polynomial-operations-q01": "bf0342735cd8d05e7c76b0f3f48b8cf0fa339c126a2f3a2747648fef4251e822",
  "ccss-textbook-practice-v1-polynomial-operations-q02": "a4f049d6a246532a2caeec1e4e0d02c23e482d4d803affbb63efff4e7dd04121",
  "ccss-textbook-practice-v1-polynomial-operations-q03": "5deb79b6f2111dcb351e074cbf144a04e35235f19369115db2fad97c9e4d3338",
  "ccss-textbook-practice-v1-remainder-theorem-q02": "6a3a1e435ad3867d776a81433d13ca4b4a033ed1cc140a5de6a4d017b1249e40",
  "ccss-textbook-practice-v1-remainder-theorem-q03": "8404d93eadbd09ea3c0e9e4ec06f72fafa489f60607eae53d2149d26202209eb",
  "ccss-textbook-practice-v1-polynomial-identities-q03": "480e58c8255362b84dd25098a70c1860a7dd7fcc01bbe81304be405681d45e0b",
  "ccss-textbook-practice-v1-rational-expressions-q01": "589890b2abea54f6022471e785fcd3ad707d91764ad5b1e47b46b594f78f3890",
  "ccss-textbook-practice-v1-rational-expressions-q02": "614a6c56f29e37cae367f80db473cd2b65fa7aca56e41f608efb9cdf988c38c8",
  "ccss-textbook-practice-v1-rational-expressions-q03": "c3a2ba60d4221f1a22d1aa49ba12a10fad55952813f8d40e42c1f4039b29382f",
  "ccss-textbook-practice-v1-create-equations-q01": "75d847f8bed93114b38b19f5ab6fb8c3bd85e0ec519a9dfb615b1d03fa745955",
  "ccss-textbook-practice-v1-create-equations-q02": "d3a649682789d0341626320c515333ebc0734cc63e5619f2116658afa6134539",
  "ccss-textbook-practice-v1-create-equations-q03": "a2f7c4845a2e9e8276f628d1592fb04316f82ee8c0f0400bed1eaa4c5625805b",
  "ccss-textbook-practice-v1-constraints-formulas-q01": "54c652d76d213a1f487ad93630c30b21f0b3b900a845894db5a378d78074474a",
  "ccss-textbook-practice-v1-constraints-formulas-q02": "9072abae1cf01451aecdd8880ab99436f182cd6314f8efbed2c14f7b5531d26e",
  "ccss-textbook-practice-v1-constraints-formulas-q03": "63bf1b1a1f236b8d0c69ee75592b068e3fa6b37750e3164913f8d8ebc0c990a8",
  "ccss-textbook-practice-v1-solve-equations-steps-q01": "466d6c13ab8961cace6fac88bfb431a2db05b9039b8037d9aee29b0e19b75f62",
  "ccss-textbook-practice-v1-solve-equations-steps-q02": "3415486eefaa04d12c7d24294154f2aeebba6961577c31b5c8ab72f65d8b9a0c",
  "ccss-textbook-practice-v1-solve-equations-steps-q03": "2d58d4fbdfe4f5b08c9bd5366da9f405e7ad5da1819608f70a627f425ff804f2",
  "ccss-textbook-practice-v1-rational-radical-equations-q01": "c78c0cc8afda72461236e264fecaa1ed7fc12472030e60b3d7cf4ac1bd5147b8",
  "ccss-textbook-practice-v1-rational-radical-equations-q02": "8eafdfb31cfda9d929c08aa1503313df4a112939ffa5b61cb77a95726a1d5c3b",
  "ccss-textbook-practice-v1-rational-radical-equations-q03": "359a591d090d1947fdf9efe16422e27e3e7f5b1a7b581733a64a4f6c1f5fc4c4",
  "ccss-textbook-practice-v1-solve-quadratics-q01": "3ecbd1e53d77704811a1d89ebd1d62e3dabd1a91452d81f5c461ac3a731ef212",
  "ccss-textbook-practice-v1-solve-quadratics-q02": "4596d4f5a3e68a9939432147f678c5c355ba1043e21dc6e98f8f00c1dbff13b1",
  "ccss-textbook-practice-v1-solve-quadratics-q03": "1bf3c1e645bc1e7c43b88b689fea662fe757aa01370e08c8f7fb88d18b991ff3",
  "ccss-textbook-practice-v1-systems-elimination-q01": "ec108c26b48c1ee25cfa2a7f6a0f91db37369b2e718e83052cf8b27ed1b1dee2",
  "ccss-textbook-practice-v1-systems-elimination-q03": "35ab68387a43a5a5782a9fd3e78605c8a66b8e648eae179fc35a27cace1b140a",
  "ccss-textbook-practice-v1-linear-quadratic-systems-q01": "d7dc430cf46f413c0c547021774e301e06c1d5b46cd9fb1ced1d08f9c89f2f37",
  "ccss-textbook-practice-v1-linear-quadratic-systems-q02": "fcd7ac2406e7f300e686117590071871d262ab5923b9f12931800a9d4d7b6c0f",
  "ccss-textbook-practice-v1-linear-quadratic-systems-q03": "87d3dc36920a953f990d1b892c4f72326dd5280c6a7e26fc4118cf1f70f9e319",
  "ccss-textbook-practice-v1-matrix-equations-q01": "f5ec2e0dcd2802bc72970b59ea5fff755ecd0dd1cb915e5a1d5376192d1a7fa3",
  "ccss-textbook-practice-v1-matrix-equations-q02": "6920b211ae9d3ac665b09a0005e43bafc81de5182816fd051138bb4b2b080942",
  "ccss-textbook-practice-v1-matrix-equations-q03": "c3e07bab820dbc3761aa483864d36dd75525dccce477ab2f27375b9a992cefcc",
  "ccss-textbook-practice-v1-graphs-and-solutions-q01": "1eeac818ce4d4529d146d99a5fe4a363fe150b2bfc5444f5641fa26a0a818043",
  "ccss-textbook-practice-v1-graphs-and-solutions-q02": "955eaf1b3145deb7feffeda6b3b6427d3102fc186fa3ef14f4be9c47bfc82bf8",
  "ccss-textbook-practice-v1-graphs-and-solutions-q03": "714b4ff0d151a40083195f69cf992a3e27f377cd1429957edb5d258ea95b246e",
  "ccss-textbook-practice-v1-graph-inequalities-q01": "2b3876e2efea25b08ca332c105ff6c2190698c2e5318be1da387de606b7690f0",
  "ccss-textbook-practice-v1-graph-inequalities-q02": "b7939e2ac00d033b7f417d38b4dd251ef23376d41cb9b958043a392d0456761d",
  "ccss-textbook-practice-v1-graph-inequalities-q03": "875a119a666751f7c537a9f982517e496bb24adb5ee6fa4d4fae0ac235c23511",
  "ccss-textbook-practice-v1-function-notation-q01": "ed4e45598ce392736b4a5f18458cdab9ccb0e1f52a3cc3a0e133ab63a1798e9c",
  "ccss-textbook-practice-v1-function-notation-q03": "bd62e146a840b5ab1a1e6c454c23a09bf4a719e701a4faf8b3d9b37ea4b1126a",
  "ccss-textbook-practice-v1-interpret-function-graphs-q01": "b7352707b508e6ba5b3b885519198bf7563dd7a5edd5f670e16adca83ad7569c",
  "ccss-textbook-practice-v1-interpret-function-graphs-q02": "cc33c0e969fa2f432b08c4eb0f5427236dc8c367d4abd4cad740bba0edbba9dd",
  "ccss-textbook-practice-v1-interpret-function-graphs-q03": "3873ddbe1f74ba864d3800899424c872d17fd5b0d432cecd910e739f5ebd5785",
  "ccss-textbook-practice-v1-compare-functions-q01": "02b399659487284978418726387c1db6540db9685586b35bcd178915446072c2",
  "ccss-textbook-practice-v1-compare-functions-q03": "cfd9d5f680680b5dc2969eb939a75aab84680fd19f23fb50eab83ac9579af7e7",
  "ccss-textbook-practice-v1-build-functions-q01": "bf3045aac4d13254e31540017fc7c9483bf53c23f2ab966ac4c66811d4d8c026",
  "ccss-textbook-practice-v1-build-functions-q02": "4c6b49c6a2f892e5ef48824dc0ced30d4487a73ab899b352f99b893c96d00ef2",
  "ccss-textbook-practice-v1-build-functions-q03": "9cece722ccc8cf7463e5e79af93c9440ae387462255e7ae67d3187402539bb17",
  "ccss-textbook-practice-v1-inverse-functions-q01": "357010b005560e203c5443ef228d11b9f672f31f365a5d4028a1b92d6f42289c",
  "ccss-textbook-practice-v1-inverse-functions-q02": "9ec344c677785ed242d2338370018e47b8190ae43d310bcaef38e81b1b204d30",
  "ccss-textbook-practice-v1-inverse-functions-q03": "4c6a0ca41eb0df0668c808ff3f04bb143c94a468da1a7e301c9b2f949b003e20",
  "ccss-textbook-practice-v1-construct-linear-exponential-q01": "d8271c666868070613c61fdd13477933ff974ce74a7fdb0224cecdb07b8efc4c",
  "ccss-textbook-practice-v1-construct-linear-exponential-q02": "554e0417556c71099f69776c1fa2a2374ddfa94ca43c496c13a7f0b201b57f35",
  "ccss-textbook-practice-v1-construct-linear-exponential-q03": "00d8bbc24c5ebf1ef438abb73a803cf0b55070495be2e1e71bca95dc8e6408fc",
  "ccss-textbook-practice-v1-logarithms-q01": "bee55fbb21a12349272c7006e0cd17e3ffad1d06051aaa1cae70cc69eac93fd1",
  "ccss-textbook-practice-v1-logarithms-q02": "c57fd1a8080df8bccd20965d116eea8693337058501db6da1683a265c592fea9",
  "ccss-textbook-practice-v1-logarithms-q03": "e3f0ff7cf4b830ba3f3fb1da3a6b9b7cbda992d17286b67002cf82400cd13024",
  "ccss-textbook-practice-v1-special-angle-values-q01": "4228917ea2345122b2b9497229c11622ed4bc7bade014c03d76acda73335354f",
  "ccss-textbook-practice-v1-special-angle-values-q02": "f0d5f4fc4c2eb8683a0d3d9b93161d091ac70c0d3998e45e71587eda4fea985c",
  "ccss-textbook-practice-v1-special-angle-values-q03": "0cd88bbffbf791451c0baddb63117885615b1906a73fae80f5a7fc6d6aad1f81",
  "ccss-textbook-practice-v1-trig-symmetry-q01": "642169e1fbf058b40b410a14881d7c1a849da8a8608b4c8a109c501d43509858",
  "ccss-textbook-practice-v1-trig-symmetry-q02": "b01bb794e4a1b5e8bd8f19e6270584e83e3eadd2df54b567f7d4c64129b42e49",
  "ccss-textbook-practice-v1-trig-symmetry-q03": "58c28a439fa9eae8e908e3f497be34c9a80e2e341b605993187cb75165639ad8",
  "ccss-textbook-practice-v1-periodic-models-q01": "a9cdf265abcf5fb5bde199075b5cf2bfbe467d1f51ded67ab55204d9a4a99c1e",
  "ccss-textbook-practice-v1-periodic-models-q02": "049104412e1f561693846b05f3d8a513e90fd1cf2a0f28dfbdaa785842f852af",
  "ccss-textbook-practice-v1-periodic-models-q03": "e2938d9c99a287dd0135aed2b42b532619bc75f8314759aa4635150c6811848c",
  "ccss-textbook-practice-v1-inverse-trig-q01": "a9ddc53a51cea48e94feda115fb883c6df01808ed29a9f66c6d0dfcf944d4509",
  "ccss-textbook-practice-v1-inverse-trig-q02": "05c0637e3d21ccfaa7c59ac7f799ab229ef376933d36ea52dfa663c23d347c1d",
  "ccss-textbook-practice-v1-trig-identities-q02": "3919c358c7a3ae524ec8bd26692d16cea796de22b5309545b46bc68c8e5da917",
  "ccss-textbook-practice-v1-precise-definitions-q01": "06956f6a022c2be94f166567f72bb55dc3aba102b29b1bd6e6297ff5083e55b2",
  "ccss-textbook-practice-v1-precise-definitions-q02": "a61580125e172daae7c405ca6d10f09a0a624f1ab1bf730fa56d9531960fbc92",
  "ccss-textbook-practice-v1-precise-definitions-q03": "6cddd1ddd214d228239116c010217ae0a56ded3b1e5026d12da38c14804cb99c",
  "ccss-textbook-practice-v1-transformations-as-functions-q01": "3f0fa2222e555e7df71e25740a1e415bd6701a33b98bdbdf5317c64c9597cf28",
  "ccss-textbook-practice-v1-transformations-as-functions-q02": "81513e39e048daa59d9da01cf78cce9704bcf35a147cd29ab66d05a633e856b0",
  "ccss-textbook-practice-v1-transformations-as-functions-q03": "e39f0734c1301f93cc3b88e7ca79a35ead48f302d04fa86d975afa344b40bfd7",
  "ccss-textbook-practice-v1-figure-symmetry-q01": "263daccc8f19f1fa0156fdf2b37083a417d7748ba27f73f4dedeb5254df7921a",
  "ccss-textbook-practice-v1-figure-symmetry-q02": "747b0bc9a7894e9a2baf04c7e3d4cf0704812063e7db00db3567941675dd19a1",
  "ccss-textbook-practice-v1-figure-symmetry-q03": "9f0ee2dcd3d9591638560762181a5ba4281f1bd6d4356d68077c419727bfb963",
  "ccss-textbook-practice-v1-congruence-criteria-q01": "143cf017c5dea5c23d07051e7f7680a143e358451540c84bcc17fe7d310fe3a3",
  "ccss-textbook-practice-v1-congruence-criteria-q02": "4242a27c4c7cb9e46c7489d4937efa3ec151e33a1c78fd253eaf2b893c92603d",
  "ccss-textbook-practice-v1-congruence-criteria-q03": "22254188b4b28e827ee621fb3d072444e8007c322e77db964da76fc6aac15ee8",
  "ccss-textbook-practice-v1-prove-angle-theorems-q01": "ba26447a84149cc5bc81ca7ecc230d3ecac0ddb36b7d0e85ef2c7c136bec0936",
  "ccss-textbook-practice-v1-prove-angle-theorems-q02": "3c322a8accb795121d03fb725e97ad1fd274d8dad64329d96508f396931978f0",
  "ccss-textbook-practice-v1-prove-angle-theorems-q03": "a22eed058cf3ed2deb4c3cf668ad22668a4f8339c34ebefc51c478c8879f914b",
  "ccss-textbook-practice-v1-prove-triangle-theorems-q01": "89199e336b855b5459b8713a14031e9579ac399c12a0e9884a7fa835a902745e",
  "ccss-textbook-practice-v1-prove-triangle-theorems-q02": "ab0c7cd0503a0860ce6b0cfda8595e3328029bd592ce0c1999118299bace0bb4",
  "ccss-textbook-practice-v1-prove-triangle-theorems-q03": "cc5cdd952e88cf396170ee64d0eb6ef571882a7880f1dc1061b57f6215f3c13e",
  "ccss-textbook-practice-v1-prove-parallelogram-theorems-q01": "89316ac41ead88fcb4ed8effb3f8944beaca686c4e7010ed75a2c116e68c8320",
  "ccss-textbook-practice-v1-prove-parallelogram-theorems-q02": "f2b9d638d10007d3c7fddd134282a5b122fa2f01145ec239cb35abe93c27569d",
  "ccss-textbook-practice-v1-prove-parallelogram-theorems-q03": "d520e7cdc397a6657bceced48548e6d7a4b95f21a1b45f914b654f4579718ecd",
  "ccss-textbook-practice-v1-constructions-q01": "255387a2b7c1e60fb9706c03794f050c78cbb4ac168f007510841f401b03183b",
  "ccss-textbook-practice-v1-constructions-q02": "1cc4abc46cfd32c01e7196f4be10ae63a87a94d4ffd473f8006ed9f07af87f3c",
  "ccss-textbook-practice-v1-constructions-q03": "a2d6b51040d8ed6dee7bae9fd329c0485ac0e1ec003c9b3593496f1cde02b6b7",
  "ccss-textbook-practice-v1-dilations-q01": "98f12e7f3c88860cc10bac9983347b1e7436db3923de1bb0a5662c9181a2a63a",
  "ccss-textbook-practice-v1-dilations-q02": "cb408c6fa167f3706cbc06b29b3a64ff83e48e58f758aada1355a5414172ba4d",
  "ccss-textbook-practice-v1-dilations-q03": "0a4b814de95e07cd1c2fc80405fdf36763226a27dd76d7b825093f8f6ee07847",
  "ccss-textbook-practice-v1-similarity-transformations-q01": "d97989947d09eece7553448c37c89be212b187770e5c82986477420409d1b628",
  "ccss-textbook-practice-v1-similarity-transformations-q02": "b173b81b011373f371fdb6fdeaa9036e5de2194db97b9b63bd25ce1e11e5a27a",
  "ccss-textbook-practice-v1-similarity-transformations-q03": "0b5c016d36b0f942f0b990ca58c4125ca747160948ee8b9ae5d8848b2487ee33",
  "ccss-textbook-practice-v1-similarity-proofs-q01": "f9af92a42f72a7dba538594c315ba199a33e3b9c87750298f63956843f0312be",
  "ccss-textbook-practice-v1-similarity-proofs-q02": "0e684a38bb3a095c9d4ec49947d8208a6c89824f1ddcbe7dbf26ab5c32f33859",
  "ccss-textbook-practice-v1-trig-ratios-q01": "c124635ba0ecc82f5f92986efa610d089501da68a774f9f41dc9af0e2649d56f",
  "ccss-textbook-practice-v1-trig-ratios-q02": "da3ad4b1b8219fab937b33dc679ce2de4efb75f3d5dcc3823f7c8202304a5498",
  "ccss-textbook-practice-v1-trig-ratios-q03": "2d71dff1b226b2c8b639b9e9e1c054ea85c392c8dab78112568f6764c1298a2e",
  "ccss-textbook-practice-v1-solve-right-triangles-q01": "08d45e033d8545b5173fe40726fc525d4ea8e5c095e645553f7cef2a18796ae4",
  "ccss-textbook-practice-v1-solve-right-triangles-q02": "c5e8f70c0d5c7e91032febf6415483bfc1ea2149856e309abd2a79b6fd629f88",
  "ccss-textbook-practice-v1-solve-right-triangles-q03": "29095e0f72a46f8c457e37b040c913aba0b6980d3386ed62d694ee50d338797f",
  "ccss-textbook-practice-v1-triangle-area-sine-q01": "a178818dd763fdadac4368472cc3bd9ea0ba4535508d84e272b18f74db30af63",
  "ccss-textbook-practice-v1-triangle-area-sine-q02": "c58e9f8bc4c49ba38424b2915d1f4f1ea1c1dc365fc71d3bedeb81e8caad0614",
  "ccss-textbook-practice-v1-triangle-area-sine-q03": "dcf0876a329fe426c754bbf9160ef4a9ec5e9a382abc8a9d2d7540bca778ee83",
  "ccss-textbook-practice-v1-laws-sines-cosines-q02": "807c3ad6b3f1b53c58f4fd7f0450ec238f30d13a60ff65a6fb0e7d499a37fa62",
  "ccss-textbook-practice-v1-laws-sines-cosines-q03": "bfbdd942aaf975f519718f83547fd8e724306344d65ca785b9c3718d68467d23",
  "ccss-textbook-practice-v1-circle-angles-q01": "b0269de5a3836139372ace16c61c0630f980c9beaae8fe97a199d2dfee2cf359",
  "ccss-textbook-practice-v1-circle-angles-q02": "2d6066de853dd9fd99fd71124ae0aca2afe3c601a6f6399b193942afbbdfbd90",
  "ccss-textbook-practice-v1-circle-angles-q03": "2b7e9f7f6936380f8cfc26dd631b2ccacbba8f1528277ce497ef38bcd5829f0a",
  "ccss-textbook-practice-v1-circle-constructions-q01": "1e3ab1389d68900ac43b43324c454da08e7ad19586a4fe221798715d3006afba",
  "ccss-textbook-practice-v1-circle-constructions-q02": "1d4e3945a8711584a0305a4af69c431595ec476f859529ea2f43d4677e5ff604",
  "ccss-textbook-practice-v1-circle-constructions-q03": "5128f3b7397e880a1f78346a293837e1a9a89b36baf361f22ca48fee5fe94128",
  "ccss-textbook-practice-v1-arc-length-sector-q01": "5608a5a0cda60baa082cb7559fa6561ecb55f2a04c0fba04b17b41069f71f028",
  "ccss-textbook-practice-v1-arc-length-sector-q02": "2fd4ef1ca7e8bd3370d2fc146294b43d05e55cc4cc5ce144a17378659e8c7f65",
  "ccss-textbook-practice-v1-arc-length-sector-q03": "51c98294b1c7edb9560283f0a137513a6f8891faceca7b67eb1321310a0c4929",
  "ccss-textbook-practice-v1-equation-of-circle-q01": "f25e7019041a2e5cf3d7bd49ced8f700639d120b1ba1f1d5934e131a69a78458",
  "ccss-textbook-practice-v1-equation-of-circle-q02": "9d39f37b39cb3c63c5e610e8733fda119ef8694e7603483f131896919e17abfc",
  "ccss-textbook-practice-v1-conic-sections-q01": "88f6d11e4645a3a12687bce81a20e80a69e8a51769ad5dd27c5c408e4740cab5",
  "ccss-textbook-practice-v1-conic-sections-q02": "aef59dc37a8197e9a75278ea1b72889fd17d9141c920b8c73b7c4474734b6c2c",
  "ccss-textbook-practice-v1-conic-sections-q03": "d7036e0621d78be5e086350f75aa9124f8a86b3cac25a7c3c6d28c377c27bf5c",
  "ccss-textbook-practice-v1-coordinate-proofs-q01": "3efe345a082b45cf3a1ad09dc8612d6cb4fe0c857f6cc9d920f4f9ca1cafc4e4",
  "ccss-textbook-practice-v1-coordinate-proofs-q02": "ebfb0cc2df9c2b29b96ca98db470bdcbd2d5a3bbe6bddf4fae40759b9cdb9100",
  "ccss-textbook-practice-v1-coordinate-proofs-q03": "5a17522bddf7d2a3280e8d8674d91436146ac9825225ce3d93950df2e48c1ac4",
  "ccss-textbook-practice-v1-partition-segment-q02": "bb8866a0dd8a65a419935f704ca645772a7bf9735088fff228e0007cf0c5f8b4",
  "ccss-textbook-practice-v1-partition-segment-q03": "9eb16539c488b4defbccb8e10fd7306ec19fec5ae7ed70e03b052fe2d6674d77",
  "ccss-textbook-practice-v1-coordinate-perimeter-area-q01": "ac4bdc216a59353599fb8838569686c73b2be4db127bca45b7417f777e12d44c",
  "ccss-textbook-practice-v1-coordinate-perimeter-area-q03": "ad2597b85357a5bc1720317b66ccbda44e44c845282f8c21885bd7d954875858",
  "ccss-textbook-practice-v1-volume-arguments-q01": "7328ad26d0664f9c13d4051b1994c3f0ced75f871fb025c2757b48d937ec1995",
  "ccss-textbook-practice-v1-volume-arguments-q02": "3729ad1dd858676e9014f6efd90cf3522106be0fa082e04bb82a0a12ad9c7ae1",
  "ccss-textbook-practice-v1-volume-arguments-q03": "966e4f63900b401802ec30f9e68982e850daa7c65213e7c57cce16f6d2aea727",
  "ccss-textbook-practice-v1-volume-formulas-q01": "8c6b49bec5a1f1f47342dac6361d081c3cfeaf52dd2e850763f1580b15f338ac",
  "ccss-textbook-practice-v1-volume-formulas-q03": "8fb2f707faaa55b014ebe9d7f734994910c732ddd29c7eb2e44da5ae338ec9a2",
  "ccss-textbook-practice-v1-geometric-modeling-q01": "7507db3e75b5f63e0041a3dbbed3e41ee20be20a9de13b16aea103a33ac7dc2d",
  "ccss-textbook-practice-v1-geometric-modeling-q02": "49580af8537e3d292af0ae7906b5adfa40add540470477a96d90f269d3cc16b8",
  "ccss-textbook-practice-v1-geometric-modeling-q03": "409a0389e5ced8744863d4381f70ec6a6257c1d67b33d02f3eb264919cbd27fe",
  "ccss-textbook-practice-v1-statistical-displays-q01": "c0258970d65034d9f144d7be00f12cd1d114c72bb717c28e0083b6fde2d7db1d",
  "ccss-textbook-practice-v1-statistical-displays-q02": "24f2a7cbd1ac1a3265cd83f59e0896ab105ecf7d0b7aeda947eb1ece042232ea",
  "ccss-textbook-practice-v1-statistical-displays-q03": "5e63a3831a1952b7d0c681fd45435d9ea3d8e3acb77307567b88d1999aace2b5",
  "ccss-textbook-practice-v1-compare-distributions-q01": "72a3354a074e30130b728fa99735b2600e8c408503b716e5457cddf192e1d05c",
  "ccss-textbook-practice-v1-compare-distributions-q02": "5d347481c7bfb78baf55567c5b3d9c1f711e3540ba1a67b083b3e34f89595c60",
  "ccss-textbook-practice-v1-compare-distributions-q03": "00b0481d83c49ffc8bb1021a964edd1056caa3941463bd8c90f7500dbb75d67e",
  "ccss-textbook-practice-v1-normal-distribution-q01": "17358838cd522920a142d959435be8e15b13a36143839bfa3d93a03bfa4000dc",
  "ccss-textbook-practice-v1-normal-distribution-q02": "ddfc295ab20de8467cd403e47b285fc77c44bbec7253bda7609d58deb13c9485",
  "ccss-textbook-practice-v1-normal-distribution-q03": "928e49ec459189911fc8f023f0d1b1dec513f753f2a1cb7e995ec7213dce0b90",
  "ccss-textbook-practice-v1-two-way-frequencies-q01": "fefd2ff7bfaf3dd0285e5a1181fd9e274048c867fb7467ef7e9c7eb48ed86a01",
  "ccss-textbook-practice-v1-two-way-frequencies-q02": "a6c2779e0148c709ebf204e94c01229d7edabb941a6d6774f4268a732b10a8aa",
  "ccss-textbook-practice-v1-two-way-frequencies-q03": "2683a628b8bf39942757abe63a2f74649b1ce858a34f2604da625f6cfd13cd74",
  "ccss-textbook-practice-v1-fit-function-residuals-q02": "83e63131232eeed2a25a8ca19cb854e6f2639fbcc45b3012e9e620c80d61689d",
  "ccss-textbook-practice-v1-fit-function-residuals-q03": "15465c01c68207ed0ed13abf0423a35564620de2ae01ad72856b7dec8c3094c4",
  "ccss-textbook-practice-v1-linear-model-interpretation-q01": "0b4eeb575a1fcc0c1fe13492236e1c3f09ea4aaf183b037a6e86385186df1a84",
  "ccss-textbook-practice-v1-linear-model-interpretation-q02": "847067c074efff24737c911dedaa5ed3fed941120feee98bd4c07be67c316d37",
  "ccss-textbook-practice-v1-linear-model-interpretation-q03": "fb940b33b1b589b07460607071170f46d277053d17501e21e12c8b7d71b76d9a",
  "ccss-textbook-practice-v1-correlation-q01": "bd551db7d6173f51d8711f58b32ada5a7a5fc685f973ae260a7af56966123437",
  "ccss-textbook-practice-v1-correlation-q03": "1d0549debefd6328dd15b0da0834bdbdaf04276efa6844d0262ce61f0f4ea5eb",
  "ccss-textbook-practice-v1-sampling-inference-q01": "1f6db4a241c62dc85abfdbea25d8e4d481f33c7e98970376cf3186e0ed8e1b59",
  "ccss-textbook-practice-v1-sampling-inference-q02": "6d4eb3c394191c5f246329b61f8e59de1a9761d0fa0703ac768b6d9f458abedb",
  "ccss-textbook-practice-v1-sampling-inference-q03": "a903b285551bc63ded672fcb9f3537ab0e70c3c4a83afa3e364cd46c664ac241",
  "ccss-textbook-practice-v1-study-design-q01": "389d1e6cbc4a16eb3f79f3fbcbbe7903e458abe53389272a42c2139c1b94f4ab",
  "ccss-textbook-practice-v1-study-design-q02": "34f103f80910b768f62f1269c527dd1fc42261312f8e06433dedd8bb9c8aaaa8",
  "ccss-textbook-practice-v1-study-design-q03": "88a7d8afa124c4fa64b4e314ef9fc69d667366b9fa28c48873c1678e9c13d34f",
  "ccss-textbook-practice-v1-estimate-population-q01": "1fa99523a270c43d28e9283c3a04cac32c7933348be8fa769f70e441fccdb524",
  "ccss-textbook-practice-v1-estimate-population-q03": "4ad84ba86e62670021bde0e39c7a1cbdab68328da342cd97a6f6ff8e20c77c7f",
  "ccss-textbook-practice-v1-compare-treatments-q01": "fbece65ec872ac49115328ec634ca6408fef3f0dadadb56d3cdbab71bc3f72a8",
  "ccss-textbook-practice-v1-compare-treatments-q02": "995ef1e8e3d7887f56a79474bd61dfdd3cd3cd30bb0ce7236a41d4a2ec7cd03c",
  "ccss-textbook-practice-v1-compare-treatments-q03": "0f0d897efc459509fe53074521cc7507e2c0d7cda2ee4fe1e71b580dfe15b6e8",
  "ccss-textbook-practice-v1-evaluate-reports-q01": "ed23e36736106129369454a5229dd4103ed2bc5669e06f07376012a8ead29335",
  "ccss-textbook-practice-v1-evaluate-reports-q02": "5202520f9408893eb82f6b07b4e432f48fa8c551f1d5c4367640b891a6b610f8",
  "ccss-textbook-practice-v1-evaluate-reports-q03": "8f1dda550fbe84c33e23d20efc81e23c9507e3cda497035b97ea369e394bf8bc",
  "ccss-textbook-practice-v1-set-operations-events-q01": "30ee70e0fcc05c11e12366e2cc6e766e35284af4ccc5da62a3307cf739701edf",
  "ccss-textbook-practice-v1-set-operations-events-q02": "bc24224af8da6cbed56e086b62bd76e93046abb5529ecf958060891506365b59",
  "ccss-textbook-practice-v1-set-operations-events-q03": "256e7a368245d3d888f41ab6298c681ac4379a4867d0f769003487819ae2ec6b",
  "ccss-textbook-practice-v1-independence-q02": "dea9c8f853db1980f3b8590ad9dae6d9034baef5dcc080bd3844beae85a78638",
  "ccss-textbook-practice-v1-independence-q03": "ca07f39ac4f839e27daacbd8eafc8fb61a4f75d7dc6fe9b7f91f4402dd973143",
  "ccss-textbook-practice-v1-conditional-probability-q01": "cdf72d1ade9e79d04185035532b81b4db096270c8fa72882c8f197d9fa0fc50e",
  "ccss-textbook-practice-v1-conditional-probability-q02": "b5ae5e08e04a4109083bad57594b1f0c60649dd813e4eeb378beacb466125f92",
  "ccss-textbook-practice-v1-conditional-probability-q03": "37001508aae6b35b049bb54c7f9435d1ba1e483a1a575c13aece485bff1a79d0",
  "ccss-textbook-practice-v1-two-way-probability-q01": "fefd2ff7bfaf3dd0285e5a1181fd9e274048c867fb7467ef7e9c7eb48ed86a01",
  "ccss-textbook-practice-v1-two-way-probability-q02": "3282f8cbd47c755dbbce6d43a169c9336ff2a837a93fd9cc06ea2168913d8d5b",
  "ccss-textbook-practice-v1-two-way-probability-q03": "b5949e32ca9a827af6e18546bb621f3ae5ee0bbc12aec93669174f4f28b9b889",
  "ccss-textbook-practice-v1-addition-rule-q01": "bde504e75db16bc01dcdccde1df67bf45e2815305cd2d00420f1b293b3ea09e5",
  "ccss-textbook-practice-v1-addition-rule-q02": "50ac623d249283c202e63c17ce321336eefde838b80ca0fdfb3c77390f0d1a78",
  "ccss-textbook-practice-v1-addition-rule-q03": "c6418bbe0b9ac366ea5d5e90b9ec071dde94d2e9df4254129d076108bb81ae6c",
  "ccss-textbook-practice-v1-multiplication-rule-q01": "b408d64a04e3690872788fecd564e5447ed6eab2bf51c4f79848aa762b9977eb",
  "ccss-textbook-practice-v1-multiplication-rule-q02": "168411e159b40d6ef5ccc98231859c07285f4e86a49f31c0f49a5f332a15327d",
  "ccss-textbook-practice-v1-multiplication-rule-q03": "6472d461a1be440965e181ee5af5e5845143bfe8018249f245351b6188aaa29a",
  "ccss-textbook-practice-v1-permutations-combinations-q01": "fe35cd9f3018da6755ba10ad8c2ebb0dabc31964685ee8f91f2803a1354cc337",
  "ccss-textbook-practice-v1-permutations-combinations-q02": "40eb2dc4ea01354c7b855828b5bae950e01c47cc820df50d52b963c06bd8a745",
  "ccss-textbook-practice-v1-permutations-combinations-q03": "344528ca8fdfc48f0ad575f9b07692b381744024cadd6b21c31e18c0cdf64c69",
  "ccss-textbook-practice-v1-random-variables-q01": "dd770ff341f8c866f0ba7f52e945aca3e0bcf4c90e95b7b22f1cc00e52bbd702",
  "ccss-textbook-practice-v1-random-variables-q02": "83cd9b0b8f9cb17c256887ad32c5f7d02257ba00f330cfc6627c1a3de3e63ad9",
  "ccss-textbook-practice-v1-random-variables-q03": "b6d68ca612112fe014fd2734b71646d556a08ccf13b835f3ba0aacc82a7cc359",
  "ccss-textbook-practice-v1-expected-value-q01": "f764c3f31a4f011e0c341b118c1450dac47968ec0348fa781b4502d9e9fce319",
  "ccss-textbook-practice-v1-expected-value-q02": "cc1a18fe96c6c5f729f548567dc9ab7134c5a53cb73191f79a3f65d607d3e24a",
  "ccss-textbook-practice-v1-expected-value-q03": "773dd75c7a3cee686b5d24c94797fb786ae0c31e7b87e8fa46da61d0546f65ab",
  "ccss-textbook-practice-v1-decisions-probability-q01": "2dffc4aee7ed69677ec6a2e2e83889c6564e35a73d5e52981b86010d59b8cd69",
  "ccss-textbook-practice-v1-decisions-probability-q02": "7f0696de09270fe7e1a96bf0870f6148ac920b5b3fc0686f7784b0a7fda90497",
  "ccss-textbook-practice-v1-decisions-probability-q03": "5fa15c932d27bb242db4ed2a6f0a3d07d3e92bc55a7ee62089d4e97c2f09acc0",
  "ccss-textbook-practice-v1-quadratic-vertex-form-q01": "3df8ce82dfc5f5a78ffec4bba4733844aa808de40858775413fac36112a9f7ef",
  "ccss-textbook-practice-v1-quadratic-vertex-form-q02": "2c10071268fce3e659fb1d6f32665ac1f56723d7f8eb235fdef9e1de36cb4b71",
  "ccss-textbook-practice-v1-quadratic-vertex-form-q03": "a9f67bcd6008b9a7f15fd9d46083d0fd77002db72e1c4a8e2be307951ba0b6a7",
  "ccss-textbook-practice-v1-exponential-vs-linear-q01": "0233b6199c9b54c44967acab41c477b105ffcb8161b3a3b7c9f76687981c60ca",
  "ccss-textbook-practice-v1-exponential-vs-linear-q02": "85b639ee23b7f88c072dcc04f78e670c26d74f0909aeb6966b53f8e4134e2f8e",
  "ccss-textbook-practice-v1-exponential-vs-linear-q03": "ffc9ecaa4518a5c6634e73fb04773b6142bb7ff7fe82a0b0d1a5a3ab71f5c2aa",
  "ccss-textbook-practice-v1-unit-circle-q01": "3d1d9aa222e935e52707720ceacb8dabdcd8afbb785fcb8d00c77ec1f0fb7776",
  "ccss-textbook-practice-v1-unit-circle-q02": "d6e76233e0d4aebc23283e7ee94c0217f04c5ba221e2bc5a31c6cf1dff4a28c2",
  "ccss-textbook-practice-v1-unit-circle-q03": "5debe6128c489e7ea10ba4b65ed74e9d8a42283c0976bca462900fe7ee9ec19b",
});

function fail(message) {
  throw new Error(message);
}

function englishText(value, label) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.en === "string") return value.en;
  fail(label + " must be a string or a localized object with an en string");
}

function questionOrdinal(questionId) {
  const match = /-q(\d{2})$/.exec(questionId);
  if (!match) fail("Question ID has no qNN suffix: " + questionId);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 3) {
    fail("Question ordinal is outside q01-q03: " + questionId);
  }
  return ordinal;
}

function projectForIndependentReview(question) {
  return Object.freeze({
    id: question.id,
    grade: question.grade,
    sourceLessonSlug: question.sourceLessonSlug,
    type: question.type,
    promptEn: englishText(question.prompt, question.id + ".prompt"),
    optionEnglish: Object.freeze(
      (question.options ?? []).map((option, index) =>
        englishText(option, question.id + ".options[" + index + "]"),
      ),
    ),
    diagram: question.diagram ?? null,
  });
}

function buildIndependentReview(independentQuestions) {
  const errors = [];
  const byId = new Map();
  const observedSlugs = new Set();

  for (const question of independentQuestions) {
    if (byId.has(question.id)) {
      errors.push("duplicate question ID: " + question.id);
      continue;
    }
    observedSlugs.add(question.sourceLessonSlug);
    const lessonEntries = LESSON_LEDGER.get(question.sourceLessonSlug);
    if (!lessonEntries) {
      errors.push("no independent lesson ledger for " + question.id);
      continue;
    }
    const expectation = lessonEntries[questionOrdinal(question.id) - 1];
    if (!expectation || typeof expectation.reason !== "string") {
      errors.push("missing independent expectation/reason for " + question.id);
      continue;
    }
    if (expectation.kind === "multiple-choice") {
      if (question.type !== "multiple-choice") {
        errors.push(question.id + ": independent type disagrees with pack type");
        continue;
      }
      const expected = question.optionEnglish[expectation.optionIndex];
      if (typeof expected !== "string") {
        errors.push(question.id + ": independent option index is unavailable");
        continue;
      }
      byId.set(question.id, {
        grade: question.grade,
        promptEn: question.promptEn,
        expected,
        reason: expectation.reason,
      });
      continue;
    }
    if (expectation.kind === "fill-in") {
      if (question.type !== "fill-in") {
        errors.push(question.id + ": independent type disagrees with pack type");
        continue;
      }
      byId.set(question.id, {
        grade: question.grade,
        promptEn: question.promptEn,
        expected: expectation.expected,
        reason: expectation.reason,
      });
      continue;
    }
    errors.push(question.id + ": unsupported independent expectation kind");
  }

  for (const slug of LESSON_LEDGER.keys()) {
    if (!observedSlugs.has(slug)) errors.push("ledger lesson absent from target pack: " + slug);
  }
  return { byId, errors };
}

function canonicalizeForDigest(value) {
  if (Array.isArray(value)) return value.map(canonicalizeForDigest);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeForDigest(value[key])]),
    );
  }
  return value;
}

function sha256Json(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalizeForDigest(value)), "utf8")
    .digest("hex");
}

function reviewedVisibleProjection(question) {
  return {
    id: question.id,
    grade: question.grade,
    sourceLessonSlug: question.sourceLessonSlug,
    type: question.type,
    promptEn: question.promptEn,
    optionEnglish: [...question.optionEnglish],
    diagram: question.diagram ?? null,
  };
}

function visibleInputDigest(independentQuestions) {
  return sha256Json(
    independentQuestions
      .map(reviewedVisibleProjection)
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
}

function auditReviewedVisibleInputs(
  independentQuestions,
  reviewedDigests = REVIEWED_VISIBLE_INPUT_SHA256,
) {
  const actualDigests = {};
  const errors = [];
  for (const [scope, reviewedDigest] of Object.entries(reviewedDigests)) {
    const rows =
      scope === "all"
        ? independentQuestions
        : independentQuestions.filter((question) => question.grade === scope);
    const actualDigest = visibleInputDigest(rows);
    actualDigests[scope] = actualDigest;
    if (actualDigest !== reviewedDigest) {
      errors.push(
        `${scope} visible prompt/options/diagram digest changed after A18 review ` +
          `(reviewed=${reviewedDigest}, current=${actualDigest})`,
      );
    }
  }
  return { actualDigests, errors };
}

const SUPERSCRIPT_DIGITS = Object.freeze({
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
});

function expandSuperscripts(value) {
  return String(value).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/gu, (superscript) => {
    const expanded = [...superscript].map((character) => SUPERSCRIPT_DIGITS[character]).join("");
    return `^${expanded}`;
  });
}

function normalizeForRule(value) {
  return expandSuperscripts(value)
    .normalize("NFKC")
    .replace(/[−–—]/gu, "-")
    .replace(/[×·]/gu, "*")
    .replace(/⁄/gu, "/")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function compactForClaim(value) {
  return normalizeForRule(value)
    .replace(/π/gu, "pi")
    .replace(/θ/gu, "theta")
    .replace(/[$°\s]/gu, "");
}

function tokenizeArithmetic(expression) {
  const tokens = [];
  const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/^]/uy;
  let cursor = 0;
  while (cursor < expression.length) {
    tokenPattern.lastIndex = cursor;
    const match = tokenPattern.exec(expression);
    if (!match) return null;
    tokens.push(match[0]);
    cursor = tokenPattern.lastIndex;
  }
  return tokens;
}

function evaluateArithmetic(expression) {
  const tokens = tokenizeArithmetic(expression);
  if (!tokens || tokens.length === 0) return null;
  let cursor = 0;

  function parsePrimary() {
    const token = tokens[cursor];
    if (token === "(") {
      cursor += 1;
      const value = parseExpression();
      if (tokens[cursor] !== ")") return null;
      cursor += 1;
      return value;
    }
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(token ?? "")) return null;
    cursor += 1;
    return Number(token);
  }

  function parseUnary() {
    const token = tokens[cursor];
    if (token === "+" || token === "-") {
      cursor += 1;
      const value = parseUnary();
      return value === null ? null : token === "-" ? -value : value;
    }
    return parsePrimary();
  }

  function parsePower() {
    const base = parseUnary();
    if (base === null) return null;
    if (tokens[cursor] !== "^") return base;
    cursor += 1;
    const exponent = parsePower();
    if (exponent === null) return null;
    return base ** exponent;
  }

  function parseTerm() {
    let value = parsePower();
    if (value === null) return null;
    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const operator = tokens[cursor];
      cursor += 1;
      const right = parsePower();
      if (right === null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    if (value === null) return null;
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const operator = tokens[cursor];
      cursor += 1;
      const right = parseTerm();
      if (right === null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const value = parseExpression();
  if (cursor !== tokens.length || value === null || !Number.isFinite(value)) return null;
  return value;
}

function approximatelyEqual(left, right) {
  const tolerance = 1e-10 * Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= tolerance;
}

/**
 * Find explicit equations whose two sides are complete numeric arithmetic
 * expressions. Symbolic identities are left to their claim-specific
 * validators; any evaluable false equality fails every semantic rule.
 */
function falseNumericEquations(value) {
  const compact = compactForClaim(value).replace(/,/gu, "");
  const number = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
  const arithmetic = String.raw`[+-]?${number}(?:[+\-*/^][+-]?${number})*`;
  const leftPattern = new RegExp(`(${arithmetic})$`, "u");
  const rightPattern = new RegExp(`^(${arithmetic})`, "u");
  const failures = [];

  for (let index = compact.indexOf("="); index !== -1; index = compact.indexOf("=", index + 1)) {
    const left = leftPattern.exec(compact.slice(0, index))?.[1];
    const right = rightPattern.exec(compact.slice(index + 1))?.[1];
    if (!left || !right) continue;
    const leftValue = evaluateArithmetic(left);
    const rightValue = evaluateArithmetic(right);
    if (leftValue === null || rightValue === null) continue;
    if (!approximatelyEqual(leftValue, rightValue)) {
      failures.push({ equation: `${left}=${right}`, leftValue, rightValue });
    }
  }

  return failures;
}

const NEGATED_CLAIM = /\b(?:not|never|does\s+not|do\s+not|is\s+not|are\s+not|cannot|can't|fails?\s+to)\b/u;

function affirmed(normalized, relation) {
  return relation.test(normalized) && !NEGATED_CLAIM.test(normalized);
}

const SEMANTIC_CLAIM_VALIDATORS = Object.freeze({
  "decimal-addition": (_normalized, compact) => /2\.50?\+1\.75=4\.25/u.test(compact),
  "discount-25-of-40": (_normalized, compact) =>
    /0\.25\*40=10/u.test(compact) && /40-10=30/u.test(compact),
  "tip-15-of-40": (_normalized, compact) =>
    /0\.15\*40=6/u.test(compact) && /40\+6=46/u.test(compact),
  "discount-20-of-50": (_normalized, compact) =>
    /0\.20?\*50=10/u.test(compact) && /50-10=40/u.test(compact),
  "scientific-notation-45000": (_normalized, compact) =>
    /45,?000=4\.5\*10\^4/u.test(compact),
  "pythagorean-identity": (normalized, compact) =>
    affirmed(normalized, /right\s+triangle/u) && /a\^2\+b\^2=c\^2/u.test(compact),
  "sphere-volume": (normalized, compact) =>
    affirmed(normalized, /sphere.*(?:volume|has\s+volume)/u) &&
    /(?:v=)?4\/3\*?pi\*?r\^3/u.test(compact),
  "geometric-sum-80": (_normalized, compact) => /2\+6\+18\+54=80/u.test(compact),
  "equivalent-row-operation": (normalized) =>
    affirmed(
      normalized,
      /adding\s+a\s+multiple.*(?:equivalent\s+row\s+operation.*preserves?\s+the\s+same\s+solutions|preserves?\s+the\s+same\s+solutions.*equivalent)/u,
    ),
  "function-one-output": (normalized) =>
    affirmed(
      normalized,
      /(?:function\s+assigns\s+)?(?:each|every)\s+input\s+(?:has|to)?\s*exactly\s+one\s+output/u,
    ),
  "compare-linear-features": (normalized) =>
    affirmed(
      normalized,
      /compare.*rate\s+of\s+change\s+and\s+(?:y-)?intercept/u,
    ),
  "complete-square-circle": (normalized) =>
    affirmed(
      normalized,
      /completing\s+the\s+square.*(?:rewrites?|reveals?|finds?).*(?:center-radius|center)/u,
    ),
  "one-third-displacement": (normalized, compact) =>
    affirmed(normalized, /(?:one\s+third|1\s*\/\s*3).*displacement/u) &&
    /a\+1\/3\(b-a\)/u.test(compact),
  "shoelace-area": (normalized) =>
    affirmed(
      normalized,
      /shoelace\s+formula.*(?:computes?|finds?|gives?).*polygon(?:'s)?\s+area/u,
    ),
  "residual-actual-minus-predicted": (normalized, compact) =>
    affirmed(normalized, /residual\s+is\s+the\s+signed\s+difference/u) &&
    /residual=actual-predicted/u.test(compact),
  "correlation-range": (normalized, compact) =>
    affirmed(normalized, /correlation\s+ranges?\s+from/u) &&
    /correlationranges?from-1to\+1/u.test(compact),
  "arcsine-principal-range": (normalized, compact) =>
    affirmed(normalized, /arcsin.*principal\s+range/u) &&
    /principalrange\[-90,90\]/u.test(compact),
  "pythagorean-trig-identity": (normalized, compact) =>
    affirmed(normalized, /pythagorean\s+identity/u) &&
    /sin\^2theta\+cos\^2theta=1/u.test(compact),
  "sine-addition-identity": (normalized, compact) =>
    affirmed(normalized, /sine\s+addition\s+identity/u) &&
    /sin\(a\+b\)=sinacosb\+cosasinb/u.test(compact),
  "confidence-interval-coverage": (normalized) =>
    affirmed(
      normalized,
      /repeated\s+samples.*about\s+95%\s+of\s+intervals.*capture.*true\s+population\s+value/u,
    ),
  "altitude-aa-similarity": (normalized) =>
    affirmed(
      normalized,
      /altitude.*matching\s+acute\s+angles.*aa\s+shows\s+both\s+smaller\s+triangles\s+are\s+similar\s+to\s+the\s+original/u,
    ),
  "law-of-cosines": (normalized, compact) =>
    affirmed(normalized, /law\s+of\s+cosines/u) &&
    /c\^2=a\^2\+b\^2-2ab\*?cosc/u.test(compact),
  "parallel-cone-slice": (normalized) =>
    affirmed(
      normalized,
      /slice\s+parallel\s+to\s+a\s+cone(?:'s)?\s+circular\s+base\s+is\s+a\s+circle/u,
    ),
  "rectangle-rotation": (normalized) =>
    affirmed(
      normalized,
      /rotating\s+a\s+rectangle\s+about\s+one\s+edge\s+produces\s+a\s+cylinder/u,
    ),
  "semicircle-rotation": (normalized) =>
    affirmed(
      normalized,
      /rotating\s+a\s+semicircle\s+about\s+its\s+diameter\s+produces\s+a\s+sphere/u,
    ),
  "independence-product-rule": (normalized, compact) =>
    affirmed(normalized, /a\s+and\s+b\s+are\s+independent\s+when/u) &&
    /p\(aandb\)=p\(a\)\*p\(b\)/u.test(compact),
  "remainder-theorem": (normalized, compact) =>
    affirmed(normalized, /remainder\s+theorem/u) &&
    /dividingp\(x\)byx-aleavesremainderp\(a\)/u.test(compact),
  "difference-square-expansion": (normalized, compact) =>
    affirmed(normalized, /expanding\s+both\s+factors/u) &&
    /\(a-b\)\^2=a\^2-2ab\+b\^2/u.test(compact),
  "pascal-row-cube": (normalized) =>
    affirmed(
      normalized,
      /power\s+3.*pascal(?:'s)?\s+triangle\s+gives\s+the\s+coefficients\s+1,\s*3,\s*3,\s*1/u,
    ),
});

function semanticRuleResult(explanationEn, rule) {
  const normalized = normalizeForRule(explanationEn);
  const compact = compactForClaim(explanationEn);
  const validator = SEMANTIC_CLAIM_VALIDATORS[rule.claim];
  const numericEquationFailures = falseNumericEquations(explanationEn);
  const claimPassed = typeof validator === "function" && validator(normalized, compact);
  return {
    passed: claimPassed && numericEquationFailures.length === 0,
    claim: rule.claim,
    claimPassed,
    numericEquationFailures,
  };
}

function sha256(textValue) {
  return crypto.createHash("sha256").update(textValue, "utf8").digest("hex");
}

function runSelfTest() {
  const percentRule = EXPLANATION_RULES.get(
    "ccss-textbook-practice-v1-percent-problems-q01",
  );
  const reviewedPercentExplanation =
    "25% of $40 is 0.25 × $40 = $10; subtract the discount: $40 − $10 = $30.";
  const tokenPreservingFalseEquation =
    "25% of $40 is 0.25 × $40 = $30; subtract the discount: $40 − $10 = $30.";

  assert.equal(semanticRuleResult(reviewedPercentExplanation, percentRule).passed, true);
  assert.equal(
    sha256(reviewedPercentExplanation),
    percentRule.reviewedExplanationSha256,
    "semantic rule must be pinned to the reviewed explanation snapshot",
  );

  const falseEquationResult = semanticRuleResult(tokenPreservingFalseEquation, percentRule);
  assert.equal(falseEquationResult.passed, false);
  assert.deepEqual(
    falseEquationResult.numericEquationFailures.map(({ equation }) => equation),
    ["0.25*40=30"],
  );
  for (const retainedToken of ["25%", "40", "10", "30"]) {
    assert.ok(
      tokenPreservingFalseEquation.includes(retainedToken),
      `negative fixture must retain token ${retainedToken}`,
    );
  }

  const lawOfCosinesRule = EXPLANATION_RULES.get(
    "ccss-textbook-practice-v1-laws-sines-cosines-q01",
  );
  assert.equal(
    semanticRuleResult(
      "The Law of Cosines is c² = a² + b² + 2ab·cos C; the minus sign is essential.",
      lawOfCosinesRule,
    ).passed,
    false,
    "a sign mutation must fail even when all formula tokens and the phrase minus sign remain",
  );

  const functionRule = EXPLANATION_RULES.get(
    "ccss-textbook-practice-v1-function-notation-q02",
  );
  assert.equal(
    semanticRuleResult(
      "By definition, a function does not assign each input exactly one output.",
      functionRule,
    ).passed,
    false,
    "a negated conceptual claim must fail",
  );

  const baseQuestion = {
    id: "self-test-visible-input-q01",
    grade: "P6",
    sourceLessonSlug: "self-test-visible-input",
    type: "multiple-choice",
    promptEn: "Which point represents one half?",
    optionEnglish: ["A", "B", "C"],
    diagram: { type: "number-line", points: [{ value: 0.5, label: "A" }] },
  };
  const reviewedDigest = visibleInputDigest([baseQuestion]);
  const reviewedVisible = { all: reviewedDigest, P6: reviewedDigest };
  assert.deepEqual(auditReviewedVisibleInputs([baseQuestion], reviewedVisible).errors, []);

  const driftMutations = [
    { ...baseQuestion, promptEn: "Which point represents two thirds?" },
    { ...baseQuestion, optionEnglish: ["B", "A", "C"] },
    {
      ...baseQuestion,
      diagram: { type: "number-line", points: [{ value: 0.6, label: "A" }] },
    },
  ];
  for (const mutation of driftMutations) {
    assert.ok(
      auditReviewedVisibleInputs([mutation], reviewedVisible).errors.length > 0,
      "every prompt/options/diagram mutation must invalidate the reviewed digest",
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        audit: "US-CA CCSS textbook practice P6-S6 explanation audit self-test",
        passed: true,
        checks: {
          semanticSnapshotBaseline: 1,
          exactTokenPreservingFalseEquationRejected: 1,
          symbolicSignMutationRejected: 1,
          negatedConceptualClaimRejected: 1,
          visibleInputDriftMutationsRejected: driftMutations.length,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function main() {
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8"));
  if (!pack || !Array.isArray(pack.questions)) fail("Pack must contain a questions array");

  const targetQuestions = pack.questions.filter((question) => TARGET_GRADES.has(question.grade));
  const independentQuestions = targetQuestions.map(projectForIndependentReview);
  const { byId: independentById, errors: coverageErrors } =
    buildIndependentReview(independentQuestions);
  const visibleInputReview = auditReviewedVisibleInputs(independentQuestions);
  coverageErrors.push(...visibleInputReview.errors);

  const gradeCounts = Object.fromEntries(
    Object.keys(EXPECTED_GRADE_COUNTS).map((grade) => [grade, 0]),
  );
  for (const question of targetQuestions) gradeCounts[question.grade] += 1;
  if (targetQuestions.length !== EXPECTED_TOTAL) {
    coverageErrors.push(
      "target count is " + targetQuestions.length + "; expected " + EXPECTED_TOTAL,
    );
  }
  for (const [grade, expectedCount] of Object.entries(EXPECTED_GRADE_COUNTS)) {
    if (gradeCounts[grade] !== expectedCount) {
      coverageErrors.push(
        grade + " count is " + gradeCounts[grade] + "; expected " + expectedCount,
      );
    }
  }
  if (independentById.size !== EXPECTED_TOTAL) {
    coverageErrors.push(
      "independent ledger covers " + independentById.size + "; expected " + EXPECTED_TOTAL,
    );
  }

  const stableHashes = Object.entries(REVIEWED_STABLE_EXPLANATION_SHA256);
  if (stableHashes.length + EXPLANATION_RULES.size !== EXPECTED_TOTAL) {
    coverageErrors.push(
      "review coverage is " +
        (stableHashes.length + EXPLANATION_RULES.size) +
        "; expected " +
        EXPECTED_TOTAL,
    );
  }

  // Independence boundary: explanation.en is first read below. The script never
  // accesses answer, acceptedAnswers, or independent* fields.
  const explanationRows = [];
  for (const question of targetQuestions) {
    try {
      const explanationEn = englishText(
        question.explanation,
        question.id + ".explanation",
      );
      explanationRows.push({
        id: question.id,
        grade: question.grade,
        explanationEn,
        currentHash: sha256(explanationEn),
      });
    } catch (error) {
      coverageErrors.push(
        question.id + ": " + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  const targetIds = new Set(targetQuestions.map((question) => question.id));
  for (const id of Object.keys(REVIEWED_STABLE_EXPLANATION_SHA256)) {
    if (!targetIds.has(id)) coverageErrors.push("stable review ID absent from pack: " + id);
    if (EXPLANATION_RULES.has(id)) {
      coverageErrors.push("ID appears in both stable and semantic review ledgers: " + id);
    }
  }
  for (const [id, semanticRule] of EXPLANATION_RULES.entries()) {
    if (!targetIds.has(id)) coverageErrors.push("semantic review ID absent from pack: " + id);
    if (typeof SEMANTIC_CLAIM_VALIDATORS[semanticRule.claim] !== "function") {
      coverageErrors.push(id + ": unknown semantic claim validator " + semanticRule.claim);
    }
    if (!/^[a-f0-9]{64}$/u.test(semanticRule.reviewedExplanationSha256)) {
      coverageErrors.push(id + ": semantic explanation snapshot is not a SHA-256 digest");
    }
  }

  const reviewed = [];
  const unreviewed = [];
  const defects = [];
  const ambiguities = [];

  for (const row of explanationRows) {
    const independent = independentById.get(row.id);
    const semanticRule = EXPLANATION_RULES.get(row.id);
    if (semanticRule) {
      const semanticResult = semanticRuleResult(row.explanationEn, semanticRule);
      if (!semanticResult.passed) {
        reviewed.push(row);
        defects.push({
          id: row.id,
          grade: row.grade,
          promptEn: independent?.promptEn,
          independentlyExpected: independent?.expected,
          independentReason: independent?.reason,
          explanationEn: row.explanationEn,
          defect: semanticRule.failure,
          semanticResult,
        });
        continue;
      }
      if (semanticRule.reviewedExplanationSha256 !== row.currentHash) {
        unreviewed.push({
          id: row.id,
          grade: row.grade,
          reason:
            "Semantically valid explanation.en changed after A18 review and needs a fresh snapshot review.",
          reviewedHash: semanticRule.reviewedExplanationSha256,
          currentHash: row.currentHash,
          claim: semanticRule.claim,
        });
        continue;
      }
      reviewed.push(row);
      continue;
    }

    const stableHash = REVIEWED_STABLE_EXPLANATION_SHA256[row.id];
    if (typeof stableHash !== "string") {
      unreviewed.push({
        id: row.id,
        grade: row.grade,
        reason: "No A18 explanation review rule or stable snapshot exists.",
      });
      continue;
    }
    if (stableHash !== row.currentHash) {
      unreviewed.push({
        id: row.id,
        grade: row.grade,
        reason: "explanation.en changed after A18 review and needs fresh review.",
        reviewedHash: stableHash,
        currentHash: row.currentHash,
      });
      continue;
    }
    reviewed.push(row);
  }

  for (const [id, ambiguity] of EXPLANATION_AMBIGUITIES.entries()) {
    const row = reviewed.find((candidate) => candidate.id === id);
    if (!row) continue;
    const independent = independentById.get(id);
    ambiguities.push({
      id,
      grade: row.grade,
      promptEn: independent?.promptEn,
      independentlyExpected: independent?.expected,
      independentReason: independent?.reason,
      explanationEn: row.explanationEn,
      ambiguity,
    });
  }

  const passed = reviewed.length - defects.length - ambiguities.length;
  const report = {
    audit: "US-CA CCSS textbook practice P6-S6 independent explanation audit",
    packPath: path.relative(REPO_ROOT, PACK_PATH),
    packageId: pack.packageId,
    schemaVersion: pack.schemaVersion,
    independence: {
      expectedResultSources: [
        "id",
        "grade",
        "sourceLessonSlug",
        "type",
        "prompt.en",
        "options[].en",
        "diagram",
      ],
      explanationReadAfterIndependentCoverage: true,
      forbiddenAsCorrectnessSources: [
        "answer",
        "acceptedAnswers",
        "independentAnswer",
        "independentSolution",
      ],
      reviewMode:
        "30 equation/claim-aware semantic validators plus SHA-256 snapshots for all 474 explanations",
      reviewedVisibleInputSha256: REVIEWED_VISIBLE_INPUT_SHA256,
      currentVisibleInputSha256: visibleInputReview.actualDigests,
    },
    counts: {
      target: targetQuestions.length,
      independentExpected: independentById.size,
      explanationReviewed: reviewed.length,
      explanationUnreviewed: targetQuestions.length - reviewed.length,
      passed,
      defect: defects.length,
      ambiguous: ambiguities.length,
      coverageErrors: coverageErrors.length,
      gradeCounts,
    },
    defectIds: defects.map((item) => item.id),
    ambiguousIds: ambiguities.map((item) => item.id),
    unreviewedIds: unreviewed.map((item) => item.id),
    coverageErrors,
    unreviewed,
    defects,
    ambiguities,
  };

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (
    unreviewed.length !== 0 ||
    defects.length !== 0 ||
    ambiguities.length !== 0 ||
    coverageErrors.length !== 0
  ) {
    process.exitCode = 1;
  }
}

try {
  if (process.argv.includes("--self-test")) runSelfTest();
  else main();
} catch (error) {
  process.stderr.write(
    JSON.stringify(
      {
        audit: "US-CA CCSS textbook practice P6-S6 independent explanation audit",
        fatal: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
}
