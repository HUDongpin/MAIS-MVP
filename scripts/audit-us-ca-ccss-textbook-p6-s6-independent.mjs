#!/usr/bin/env node

/**
 * Independent answer audit for the P6-S6 portion of the MAIS-authored
 * ccss-textbook-practice-v1 pack.
 *
 * Independence contract:
 *   1. The expectation ledger below was derived from prompt.en and options[].en.
 *   2. buildIndependentReview() receives a deliberately narrow projection that
 *      contains no answer, acceptedAnswers, explanation, independentAnswer, or
 *      independentSolution fields.
 *   3. Stored answers are read only after all 474 independent expectations have
 *      been built and the coverage gate has passed.
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
 * These A18-reviewed digests bind the manual answer ledger to the exact
 * student-visible inputs that were reviewed. Each digest covers a grade's
 * sorted {id, grade, sourceLessonSlug, type, promptEn, optionEnglish, diagram}
 * projections. A prompt, option, diagram, type, slug, ID, or grade mutation
 * therefore invalidates the review before any stored answer is read.
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

function fail(message) {
  throw new Error(message);
}

function localizedEnglish(value, label) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.en === "string") return value.en;
  fail(`${label} must be a string or a localized object with an en string`);
}

function projectForIndependentReview(question) {
  return Object.freeze({
    id: question.id,
    grade: question.grade,
    sourceLessonSlug: question.sourceLessonSlug,
    type: question.type,
    promptEn: localizedEnglish(question.prompt, `${question.id}.prompt`),
    optionEnglish: Object.freeze(
      (question.options ?? []).map((option, index) =>
        localizedEnglish(option, `${question.id}.options[${index}]`),
      ),
    ),
    diagram: question.diagram ?? null,
  });
}

function questionOrdinal(questionId) {
  const match = /-q(\d{2})$/.exec(questionId);
  if (!match) fail(`Question ID has no qNN suffix: ${questionId}`);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 3) {
    fail(`Question ordinal is outside q01-q03: ${questionId}`);
  }
  return ordinal;
}

/**
 * Build the complete expectation set while the only question representation in
 * scope is the narrow prompt/options projection above. This function cannot
 * inspect stored answers or any generated explanation/independent fields.
 */
function buildIndependentReview(independentQuestions) {
  const errors = [];
  const byId = new Map();
  const observedSlugs = new Set();

  for (const question of independentQuestions) {
    if (byId.has(question.id)) {
      errors.push(`duplicate question ID: ${question.id}`);
      continue;
    }

    observedSlugs.add(question.sourceLessonSlug);
    const lessonEntries = LESSON_LEDGER.get(question.sourceLessonSlug);
    if (!lessonEntries) {
      errors.push(`no lesson ledger for ${question.id} (${question.sourceLessonSlug})`);
      continue;
    }

    const ordinal = questionOrdinal(question.id);
    const expectation = lessonEntries[ordinal - 1];
    if (!expectation) {
      errors.push(`no q${String(ordinal).padStart(2, "0")} expectation for ${question.id}`);
      continue;
    }
    if (typeof expectation.reason !== "string" || expectation.reason.trim().length < 8) {
      errors.push(`missing transparent reason for ${question.id}`);
      continue;
    }

    if (expectation.kind === "multiple-choice") {
      if (question.type !== "multiple-choice") {
        errors.push(`${question.id}: ledger says multiple-choice but pack type is ${question.type}`);
        continue;
      }
      const expectedOption = question.optionEnglish[expectation.optionIndex];
      if (typeof expectedOption !== "string") {
        errors.push(
          `${question.id}: option index ${expectation.optionIndex} is unavailable (options=${question.optionEnglish.length})`,
        );
        continue;
      }
      byId.set(question.id, {
        ...expectation,
        expected: expectedOption,
        method: "independent-manual-ledger",
        promptEn: question.promptEn,
        grade: question.grade,
      });
      continue;
    }

    if (expectation.kind === "fill-in") {
      if (question.type !== "fill-in") {
        errors.push(`${question.id}: ledger says fill-in but pack type is ${question.type}`);
        continue;
      }
      byId.set(question.id, {
        ...expectation,
        method: "independent-manual-ledger",
        promptEn: question.promptEn,
        grade: question.grade,
      });
      continue;
    }

    if (expectation.kind === "ambiguous") {
      if (question.type !== "multiple-choice") {
        errors.push(`${question.id}: ambiguous ledger entry is not multiple-choice`);
        continue;
      }
      const validOptions = expectation.optionIndices.map((index) => question.optionEnglish[index]);
      if (validOptions.some((option) => typeof option !== "string")) {
        errors.push(`${question.id}: ambiguous ledger references an unavailable option`);
        continue;
      }
      byId.set(question.id, {
        ...expectation,
        validOptions,
        method: "independent-manual-ledger",
        promptEn: question.promptEn,
        grade: question.grade,
      });
      continue;
    }

    errors.push(`${question.id}: unknown expectation kind ${String(expectation.kind)}`);
  }

  for (const slug of LESSON_LEDGER.keys()) {
    if (!observedSlugs.has(slug)) errors.push(`ledger lesson absent from target pack: ${slug}`);
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

function canonicalOptionText(value) {
  return expandSuperscripts(value)
    .normalize("NFKC")
    .replace(/[−–—]/gu, "-")
    .replace(/[×·]/gu, "*")
    .replace(/⁄/gu, "/")
    .replace(/π/gu, "pi")
    .replace(/θ/gu, "theta")
    .replace(/√/gu, "sqrt")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

function approximatelyEqual(left, right) {
  const tolerance = 1e-10 * Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= tolerance;
}

/**
 * Parse a complete scalar option without executing repository text. This
 * intentionally supports the representations used by this pack: signed
 * integers/decimals, fractions, percents, currency/degree values, and
 * coefficient-times-power-of-ten scientific notation.
 */
function parseScalarOption(value) {
  let normalized = expandSuperscripts(value)
    .normalize("NFKC")
    .replace(/[−–—]/gu, "-")
    .replace(/[×·]/gu, "*")
    .replace(/⁄/gu, "/")
    .trim();

  const unit = normalized.includes("°") ? "degree" : normalized.includes("$") ? "currency" : null;
  normalized = normalized.replace(/[$°\s,]/gu, "");

  let percent = false;
  if (normalized.endsWith("%")) {
    percent = true;
    normalized = normalized.slice(0, -1);
  }

  const scientific = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\*10\^([+-]?\d+)$/u.exec(
    normalized,
  );
  if (scientific) {
    const coefficient = Number(scientific[1]);
    const exponent = Number(scientific[2]);
    const number = coefficient * 10 ** exponent;
    if (!Number.isFinite(number)) return null;
    return {
      value: percent ? number / 100 : number,
      unit,
      notation: "scientific",
      coefficient,
      exponent,
      canonicalScientific:
        coefficient !== 0 && Math.abs(coefficient) >= 1 && Math.abs(coefficient) < 10,
    };
  }

  const fraction = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/u.exec(
    normalized,
  );
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    const number = numerator / denominator;
    return {
      value: percent ? number / 100 : number,
      unit,
      notation: percent ? "percent" : "fraction",
    };
  }

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(normalized)) return null;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return {
    value: percent ? number / 100 : number,
    unit,
    notation: percent ? "percent" : "decimal",
  };
}

function optionMeetsPromptRepresentation(question, option) {
  if (!/\bscientific\s+notation\b/iu.test(question.promptEn)) return true;
  const scalar = parseScalarOption(option);
  return scalar?.notation === "scientific" && scalar.canonicalScientific === true;
}

function semanticOptionEquivalence(left, right) {
  if (canonicalOptionText(left) === canonicalOptionText(right)) {
    return { equivalent: true, method: "canonical-math-text" };
  }

  const leftScalar = parseScalarOption(left);
  const rightScalar = parseScalarOption(right);
  if (
    leftScalar &&
    rightScalar &&
    leftScalar.unit === rightScalar.unit &&
    approximatelyEqual(leftScalar.value, rightScalar.value)
  ) {
    return { equivalent: true, method: "numeric-representation" };
  }

  return { equivalent: false, method: null };
}

function relationMatches(operator, left, right) {
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  if (operator === ">=" || operator === "≥") return left >= right;
  if (operator === "<=" || operator === "≤") return left <= right;
  return false;
}

function promptDefinedValidIndices(question) {
  const match = /\bwhich\s+value\s+makes\s+[a-z]\s*(>=|<=|>|<|≥|≤)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s+true\b/iu.exec(
    question.promptEn,
  );
  if (!match) return null;
  const boundary = Number(match[2]);
  const validIndices = question.optionEnglish.flatMap((option, index) => {
    const scalar = parseScalarOption(option);
    return scalar && scalar.unit === null && relationMatches(match[1], scalar.value, boundary)
      ? [index]
      : [];
  });
  return {
    validIndices,
    method: `prompt relation ${match[1]} ${boundary}`,
  };
}

/**
 * General MC cardinality audit. It is deliberately answer-free: the expected
 * option comes from the manual ledger, while all candidate comparisons use
 * only visible options and prompt representation constraints.
 */
function auditMultipleChoiceCardinality(question, expectation) {
  if (question.type !== "multiple-choice" || expectation?.kind !== "multiple-choice") {
    return null;
  }

  const expectedOption = question.optionEnglish[expectation.optionIndex];
  const equivalentToExpected = [];
  for (let index = 0; index < question.optionEnglish.length; index += 1) {
    const option = question.optionEnglish[index];
    if (!optionMeetsPromptRepresentation(question, option)) continue;
    const equivalence = semanticOptionEquivalence(expectedOption, option);
    if (equivalence.equivalent) {
      equivalentToExpected.push({ index, option, method: equivalence.method });
    }
  }

  const issues = [];
  if (equivalentToExpected.length !== 1) {
    issues.push(
      `reviewed answer has ${equivalentToExpected.length} semantically equivalent eligible option(s)`,
    );
  } else if (equivalentToExpected[0].index !== expectation.optionIndex) {
    issues.push(
      `only equivalent option is index ${equivalentToExpected[0].index}, not reviewed index ${expectation.optionIndex}`,
    );
  }

  const promptRule = promptDefinedValidIndices(question);
  if (promptRule && promptRule.validIndices.length !== 1) {
    issues.push(
      `${promptRule.method} matched ${promptRule.validIndices.length} option(s)`,
    );
  } else if (promptRule && promptRule.validIndices[0] !== expectation.optionIndex) {
    issues.push(
      `${promptRule.method} selects index ${promptRule.validIndices[0]}, not reviewed index ${expectation.optionIndex}`,
    );
  }

  return {
    issues,
    equivalentToExpected,
    promptRule,
  };
}

function normalizeText(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[−–—]/gu, "-")
    .replace(/[×·]/gu, "*")
    .replace(/π/gu, "pi")
    .replace(/θ/gu, "theta")
    .replace(/√/gu, "sqrt")
    .replace(/[$,%°]/gu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();
}

function parseFiniteNumber(value) {
  const normalized = String(value)
    .normalize("NFKC")
    .replace(/[−–—]/gu, "-")
    .replace(/[$,%°\s,]/gu, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function storedAnswerMatches(expectation, storedAnswer) {
  if (storedAnswer === null || storedAnswer === undefined) return false;

  if (expectation.kind === "fill-in") {
    const expectedNumber = parseFiniteNumber(expectation.expected);
    const actualNumber = parseFiniteNumber(storedAnswer);
    if (expectedNumber !== null && actualNumber !== null) {
      const tolerance = 1e-10 * Math.max(1, Math.abs(expectedNumber), Math.abs(actualNumber));
      return Math.abs(expectedNumber - actualNumber) <= tolerance;
    }
  }

  return normalizeText(expectation.expected) === normalizeText(storedAnswer);
}

function summarizeCounts(targetQuestions, reviewById) {
  const gradeCounts = Object.fromEntries(Object.keys(EXPECTED_GRADE_COUNTS).map((grade) => [grade, 0]));
  for (const question of targetQuestions) gradeCounts[question.grade] += 1;
  return {
    target: targetQuestions.length,
    reviewed: reviewById.size,
    unreviewed: targetQuestions.length - reviewById.size,
    gradeCounts,
  };
}

function runSelfTest() {
  const baseQuestion = {
    id: "self-test-equivalent-distractor-q01",
    grade: "P6",
    sourceLessonSlug: "self-test-equivalent-distractor",
    type: "multiple-choice",
    promptEn: "Which option is equal to one half?",
    optionEnglish: ["1/2", "2", "3"],
    diagram: { type: "number-line", points: [{ value: 0.5, label: "A" }] },
  };
  const expectation = {
    kind: "multiple-choice",
    optionIndex: 0,
    expected: "1/2",
    reason: "One half is the reviewed result.",
  };

  const reviewedDigest = visibleInputDigest([baseQuestion]);
  const reviewed = { all: reviewedDigest, P6: reviewedDigest };
  assert.deepEqual(auditReviewedVisibleInputs([baseQuestion], reviewed).errors, []);

  const driftMutations = [
    { ...baseQuestion, promptEn: "Which option is equal to two thirds?" },
    { ...baseQuestion, optionEnglish: ["1/2", "0.5", "3"] },
    {
      ...baseQuestion,
      diagram: { type: "number-line", points: [{ value: 0.6, label: "A" }] },
    },
  ];
  for (const mutation of driftMutations) {
    assert.ok(
      auditReviewedVisibleInputs([mutation], reviewed).errors.length > 0,
      "every prompt/options/diagram mutation must invalidate the reviewed digest",
    );
  }

  const equivalentDistractor = {
    ...baseQuestion,
    optionEnglish: ["1/2", "0.5", "3"],
  };
  const equivalentResult = auditMultipleChoiceCardinality(equivalentDistractor, expectation);
  assert.deepEqual(
    equivalentResult.equivalentToExpected.map(({ index }) => index),
    [0, 1],
  );
  assert.ok(equivalentResult.issues.length > 0);

  const scientificNotation = {
    ...baseQuestion,
    id: "self-test-scientific-notation-q01",
    promptEn: "45,000 in scientific notation is…",
    optionEnglish: ["4.5 × 10⁴", "45 × 10³", "4.5 × 10⁵", "0.45 × 10⁶"],
    diagram: null,
  };
  const scientificExpectation = { ...expectation, expected: "4.5 × 10⁴" };
  assert.deepEqual(
    auditMultipleChoiceCardinality(scientificNotation, scientificExpectation).issues,
    [],
    "mathematically equal but noncanonical notation is not a valid scientific-notation answer",
  );
  const duplicateScientificAnswer = {
    ...scientificNotation,
    optionEnglish: ["4.5 × 10⁴", "4.50 × 10⁴", "4.5 × 10⁵", "0.45 × 10⁶"],
  };
  assert.ok(
    auditMultipleChoiceCardinality(duplicateScientificAnswer, scientificExpectation).issues.length >
      0,
  );

  const relationalQuestion = {
    ...baseQuestion,
    id: "self-test-relational-cardinality-q01",
    promptEn: "Which value makes x > 3 true?",
    optionEnglish: ["5", "3", "1", "2"],
    diagram: null,
  };
  const relationalExpectation = { ...expectation, expected: "5" };
  assert.deepEqual(
    auditMultipleChoiceCardinality(relationalQuestion, relationalExpectation).issues,
    [],
  );
  const twoRelationalAnswers = {
    ...relationalQuestion,
    optionEnglish: ["5", "4", "1", "2"],
  };
  assert.ok(
    auditMultipleChoiceCardinality(twoRelationalAnswers, relationalExpectation).issues.length > 0,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        audit: "US-CA CCSS textbook practice P6-S6 independent answer audit self-test",
        passed: true,
        checks: {
          reviewedDigestBaseline: 1,
          visibleInputDriftMutationsRejected: driftMutations.length,
          equivalentDistractorRejected: 1,
          scientificNotationConstraintPreserved: 1,
          duplicateCanonicalScientificAnswerRejected: 1,
          relationalCardinalityMutationRejected: 1,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function main() {
  // The independent ledger above is fully constructed before this pack read.
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8"));
  if (!pack || !Array.isArray(pack.questions)) fail("Pack must contain a questions array");

  const targetQuestions = pack.questions.filter((question) => TARGET_GRADES.has(question.grade));
  const independentQuestions = targetQuestions.map(projectForIndependentReview);
  const independentById = new Map(independentQuestions.map((question) => [question.id, question]));
  const { byId: reviewById, errors: coverageErrors } = buildIndependentReview(independentQuestions);
  const counts = summarizeCounts(targetQuestions, reviewById);
  const visibleInputReview = auditReviewedVisibleInputs(independentQuestions);
  coverageErrors.push(...visibleInputReview.errors);

  if (counts.target !== EXPECTED_TOTAL) {
    coverageErrors.push(`target count is ${counts.target}; expected ${EXPECTED_TOTAL}`);
  }
  for (const [grade, expectedCount] of Object.entries(EXPECTED_GRADE_COUNTS)) {
    if (counts.gradeCounts[grade] !== expectedCount) {
      coverageErrors.push(
        `${grade} count is ${counts.gradeCounts[grade]}; expected ${expectedCount}`,
      );
    }
  }
  if (independentById.size !== targetQuestions.length) {
    coverageErrors.push(
      `target IDs are not unique: ${independentById.size} unique for ${targetQuestions.length} rows`,
    );
  }
  if (reviewById.size !== EXPECTED_TOTAL) {
    coverageErrors.push(`review ledger covers ${reviewById.size}; expected ${EXPECTED_TOTAL}`);
  }

  // Cardinality checks still use only the answer-free independent projection.
  const algorithmicAmbiguities = [];
  for (const question of independentQuestions) {
    const expectation = reviewById.get(question.id);
    const result = auditMultipleChoiceCardinality(question, expectation);
    if (result && result.issues.length !== 0) {
      algorithmicAmbiguities.push({
        id: question.id,
        grade: question.grade,
        promptEn: question.promptEn,
        reviewedOptionIndex: expectation?.optionIndex,
        equivalentOptions: result.equivalentToExpected,
        promptRule: result.promptRule,
        reason: result.issues.join("; "),
      });
    }
  }

  const ledgerAmbiguities = [...reviewById.entries()]
    .filter(([, expectation]) => expectation.kind === "ambiguous")
    .map(([id, expectation]) => ({
      id,
      grade: expectation.grade,
      promptEn: expectation.promptEn,
      validOptions: expectation.validOptions,
      reason: expectation.reason,
    }));
  const ambiguities = [...ledgerAmbiguities, ...algorithmicAmbiguities];

  // Independence boundary: stored answer is first accessed only below, after
  // expectations, coverage checks, and semantic ambiguity checks are complete.
  const mismatches = [];
  for (const question of targetQuestions) {
    const expectation = reviewById.get(question.id);
    if (!expectation || expectation.kind === "ambiguous") continue;
    if (!storedAnswerMatches(expectation, question.answer)) {
      mismatches.push({
        id: question.id,
        grade: question.grade,
        type: question.type,
        promptEn: expectation.promptEn,
        expected: expectation.expected,
        storedAnswer: question.answer,
        reason: expectation.reason,
      });
    }
  }

  const report = {
    audit: "US-CA CCSS textbook practice P6-S6 independent answer audit",
    packPath: path.relative(REPO_ROOT, PACK_PATH),
    packageId: pack.packageId,
    schemaVersion: pack.schemaVersion,
    independence: {
      sourceFields: [
        "id",
        "grade",
        "sourceLessonSlug",
        "type",
        "prompt.en",
        "options[].en",
        "diagram",
      ],
      excludedAsCorrectnessSources: [
        "answer",
        "acceptedAnswers",
        "explanation",
        "independentAnswer",
        "independentSolution",
      ],
      comparisonFieldReadAfterCoverage: "answer",
      reviewedVisibleInputSha256: REVIEWED_VISIBLE_INPUT_SHA256,
      currentVisibleInputSha256: visibleInputReview.actualDigests,
      multipleChoiceCardinality:
        "all MC options checked for canonical/numeric equivalence; prompt relations and scientific-notation form constraints are enforced when present",
    },
    counts: {
      ...counts,
      mismatch: mismatches.length,
      ambiguous: ambiguities.length,
      coverageErrors: coverageErrors.length,
    },
    coverageErrors,
    mismatchIds: mismatches.map((item) => item.id),
    ambiguousIds: ambiguities.map((item) => item.id),
    mismatches,
    ambiguities,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (
    counts.unreviewed !== 0 ||
    coverageErrors.length !== 0 ||
    mismatches.length !== 0 ||
    ambiguities.length !== 0
  ) {
    process.exitCode = 1;
  }
}

try {
  if (process.argv.includes("--self-test")) runSelfTest();
  else main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(
      {
        audit: "US-CA CCSS textbook practice P6-S6 independent answer audit",
        fatal: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
}
