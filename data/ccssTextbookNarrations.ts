/**
 * Hand-authored read-aloud narrations for ported CCSS textbook lessons,
 * keyed by lesson slug. The generated registry falls back to the lesson's
 * `summary` when a slug has no entry here, so this file only carries scripts
 * that improve on the summary — kid-voiced, concrete, and read-aloud paced.
 *
 * HAND-EDITED — safe to extend; never overwritten by the generator.
 * Priority order for authoring: K first, then G1–G2 (the read-aloud band).
 */
export const ccssTextbookNarrationOverrides: Record<string, string> = {
  "counting-ten-frame":
    "A ten-frame is a box with ten spots. Tap a spot to fill every place up to it, and count out loud: one, two, three! When counters are present, the last number you say tells how many there are in all; an empty frame has zero counters. When the frame is full, you have made a whole ten.",
  "count-to-100":
    "The hundred chart shows every number from one to one hundred. Count by ones, or jump a whole row at a time to count by tens: ten, twenty, thirty! You can start counting from any number — just keep going forward.",
  "compare-groups":
    "Two groups want to know: who has more? Match them up one to one, like partners holding hands. If one group has extras left over, that group is greater. If they match exactly, the groups are equal.",
  "number-bonds":
    "A whole number can be broken into two parts, and one part may be zero. Put the parts back together to make the whole again. Try all the ways to make five — and then find two partners that make ten!",
  "teen-numbers":
    "The numbers from eleven through nineteen all have the same secret: each is one full ten and some extra ones. Fourteen is a ten and four more. Can you find the ten hiding in your number?",
  "compare-length":
    "Which pencil is longer? Line them up so they start at the very same spot — that is the fair way to compare. Then look at the ends: the one that sticks out farther is longer, and the other one is shorter.",
  "sort-and-count":
    "A big mixed pile is hard to count. Sort it first! Put the same things together in groups, then count each group. Now you can see which group has the most and which has the fewest — or which groups are tied.",
  "flat-shapes":
    "Shapes have names, and a shape keeps its name no matter how you turn it. Pick a shape and study its attributes. A circle has a curved edge and no straight sides or corners. A triangle is closed and has three straight sides. Squares and rectangles both have four straight sides and four right-angle corners, while a square has four equal sides.",
  "compose-shapes":
    "Small shapes can team up to build bigger ones. Two triangles can make a square. Two squares can make a rectangle! Join the shapes together and see what new shape you can build.",
  "position-words":
    "Where is the ball? Position words tell us! The ball can be above the box, below the box, or beside the box. Move the ball around and say its position out loud.",

  // ---- Grade 1 ----
  "make-ten-to-add":
    "Eight plus five looks tricky — but ten makes it easy! First fill the ten-frame up to ten. Then add what is left over. Eight plus five becomes ten plus three, and ten plus three is easy: thirteen!",
  "add-subtract-stories":
    "Every math story hides a number sentence. Some stories put things together, and some take things away. Read the story, decide what is happening, and write the number sentence that tells it.",
  "count-on-count-back":
    "The number line is a hopping trail! To add, start at your number and hop forward. To subtract, hop back. Count each hop out loud and see where you land.",
  "missing-addend":
    "Eight take away three is really a riddle: three plus what makes eight? Find the missing part that finishes the whole. When you know the missing part, you know the answer!",
  "equal-sign-balance":
    "The equal sign means the same as — like a balance scale with equal weight on both sides. If one side is heavier, it is not equal! Find the number that makes both sides balance perfectly.",
  "count-to-120":
    "Numbers keep going past one hundred: one hundred one, one hundred two, all the way to one hundred twenty! Start counting from any number and keep going until you reach one hundred twenty. Can you read the big numbers along the way?",
  "tens-and-ones":
    "Every two-digit number is built from tens and ones. Forty-seven is four ten-rods and seven little ones. Build a number with blocks — then find ten more and ten less in your head!",
  "compare-two-digit":
    "Which number is bigger? Look at the tens first! More tens wins. If the tens tie, check the ones. Then write >, =, or < between the two numbers.",
  "add-within-100":
    "Add big numbers with blocks: put the ones with the ones and the tens with the tens. If you collect ten little ones, bundle them into a brand-new ten!",
  "order-and-measure":
    "Line up your objects and measure them with same-size units. Then put them in order from shortest to longest. If two lengths match, they tie and share the same place in the order. Fair measuring means every unit is the same size, with no gaps!",
  "telling-time":
    "A clock has two hands. The short hand tells the hour. When the long hand points straight up, it is something o'clock. When it points straight down, it is half past. What time is it now?",
  "picture-graph":
    "A picture graph shows groups with little pictures. Count the pictures in each row to see how many. Which group or groups have the most? Are any rows tied? When one row is larger, subtract to find how many more it has.",
  "shape-attributes":
    "What makes a triangle a triangle? It is a closed, flat shape with three straight sides and three corners. Color and size do not matter. Turn it any way you like: it is still a triangle.",
  "compose-2d":
    "Shapes love to team up! Put a triangle on top of a square and you build a house. Join two trapezoids and you get a hexagon. What new shape can you build?",
  "partition-shapes":
    "Cut a shape into equal shares! Two equal parts are halves. Four equal parts are fourths. The parts must be exactly the same size — that is what makes the shares fair.",

  // ---- Grade 2 ----
  "word-problems-100":
    "A tape diagram is a picture that holds a story's numbers. Draw the whole, draw the parts, and see what is missing. Then decide: do you add, or do you subtract?",
  "fluent-within-20":
    "Be a mental-math ninja! Use doubles: six plus six is twelve. Use near-doubles: six plus seven is one more, thirteen. Or make a ten first. Pick your favorite trick and add fast!",
  "odd-even":
    "Is your number odd or even? Pair everything up! If every object finds a partner, the number is even. If one is left standing alone, the number is odd. Zero is even because it has no unpaired objects.",
  "arrays-repeated-addition":
    "An array is a tidy rectangle of rows. Count one row, then add it again and again: four plus four plus four. Adding equal rows is the secret start of multiplication!",
  "place-value-blocks":
    "Build any number up to nine hundred ninety-nine! Snap together big hundred-squares, ten-rods, and little ones. The digits of the number tell you exactly which blocks to grab.",
  "skip-counting":
    "Count in jumps! By fives: five, ten, fifteen. By tens: ten, twenty, thirty. By hundreds: one hundred, two hundred, three hundred! Each jump adds the same amount. At ninety plus ten, ten tens regroup as one hundred; at nine hundred plus one hundred, ten hundreds regroup as one thousand.",
  "compare-three-digit":
    "Big numbers compare in order: hundreds first, then tens, then ones. Three hundred twenty-four versus three hundred nineteen? The hundreds tie, so check the tens — twenty beats ten!",
  "add-subtract-regroup":
    "Sometimes the ones pile up past nine — so carry a ten! Sometimes there are not enough ones — so borrow a ten. Regrouping is just trading tens and ones to make the math work.",
  "add-four-numbers":
    "Four numbers at once? No problem! Stack them up, add all the ones, carry if you need to, then add all the tens. One column at a time gets it done.",
  "add-subtract-1000":
    "Add and subtract really big numbers with hundreds, tens, and ones. Work place by place, and trade blocks when you regroup. The blocks show exactly why carrying and borrowing work!",
  "mental-10-100":
    "Here is a mental-math shortcut: adding or subtracting ten changes the number of tens while the ones stay the same. If the tens cross a hundred boundary, regroup and change the hundreds too. Adding or subtracting a hundred changes the hundreds while the tens and ones stay the same.",
  "measure-with-ruler":
    "Line up the zero end of the ruler with your object — that is the fair start. Then read the number at the other end. Try measuring in two different units: the smaller the unit, the bigger the count!",
  "estimate-compare-length":
    "First guess: about how long is it? Then measure and check your guess. To find how much longer one object is, subtract the short length from the long one.",
  "length-number-line":
    "Lengths live on the number line too! Start at a number, jump forward to add length, jump back to take it away. Where do you land?",
  "time-five-minutes":
    "Count around the clock by fives: five, ten, fifteen minutes! The long hand tells the minutes, and the short hand tells the hour. A.m. starts at midnight and ends just before noon; p.m. starts at noon and ends just before midnight.",
  "money":
    "Count your money! Quarters are twenty-five cents, dimes are ten, nickels are five, pennies are one. Count the big coins first, then write your total with the dollar or cent sign.",
  "line-plot":
    "Measure lots of things, then stack an X for each measurement above the number line. The taller the stack, the more times that length came up. One stack may be tallest, or several stacks may tie for the most common length. An empty plot has no most common length yet.",
  "bar-graph":
    "A bar graph shows groups as bars. Read each bar against the numbered scale to find its value. On this graph every unit of height counts as one vote, and the printed labels mark the even values. Bars with the same height are tied.",
  "shapes-by-attributes":
    "Shapes tell you their names with their sides and angles. Three sides? Triangle. Four sides? Quadrilateral. Five? Pentagon. Six? Hexagon. Count the sides and say the name!",
  "rows-and-columns":
    "Fill a rectangle with same-size squares — rows going across, columns going down. Count them all! Covering a shape with squares is the very beginning of area.",
  "equal-shares":
    "Split a shape into equal shares: halves, thirds, or fourths. Here is the surprise — equal shares can look different but still be the same size! Fair shares are about size, not shape.",

  // ---- Grade 3–5 corrections where the generated summary is too broad ----
  "add-subtract-fractions":
    "Join or separate fractions made of the same-size pieces. Keep the common denominator, work with the numerators, and rename an improper result as a mixed number or a whole number when appropriate.",

  // ---- Upper grades (authored where the summary is too thin for read-aloud) ----
  "roots":
    "Roots undo powers. The principal square root of 25 is 5. The equation x squared equals 25 has two solutions: x equals 5 and x equals negative 5. The principal cube root of 27 is 3.",
  "multiply-divide-integers":
    "For nonzero signed numbers, like signs give a positive product or quotient and unlike signs give a negative one. A product with zero is zero, and zero divided by a nonzero number is zero. Division by zero is undefined.",
  "area-volume-surface":
    "For any prism, volume equals base area times the perpendicular distance between the two parallel bases: V equals B times H. For this right triangular prism, find one triangular base area first, then multiply by the perpendicular prism height.",
  "pythagorean-theorem":
    "For a right triangle, a squared plus b squared equals c squared. The squares drawn on the three sides illustrate the area relationship. A complete area proof also shows a dissection or rearrangement that makes the two leg-square areas equal the hypotenuse-square area.",
  "volume-3d":
    "A cylinder has volume pi r squared h, and a cone with the same base and perpendicular height has one third of that volume. A sphere of radius r has two thirds the volume of its circumscribed cylinder of radius r and height two r.",
  "geometric-series":
    "For a finite geometric series, call the first term a, the ratio r, and the number of terms n. The sum is a times r to the n minus one, divided by r minus one, when r is not one. When r equals one, all terms have value a; the sum is a times n.",
  "remainder-theorem":
    "Division of p of x by the factor x minus a leaves the function value at that input as the remainder. When this value is zero, the input is a root. A root of odd multiplicity crosses the x-axis; a root of even multiplicity touches the axis and turns.",
  "rational-expressions":
    "Factor rational expressions before canceling, but keep every value excluded by the original denominators. After fully reducing, an excluded zero appears as a hole only if the reduced denominator is nonzero there; if the reduced denominator is still zero, the point remains a vertical asymptote or pole. Simplifying never restores an excluded input.",
  "complex-conjugates":
    "The conjugate of a plus b i is a minus b i, and their product is a squared plus b squared. This gives the modulus and supports complex division, but a reciprocal or quotient is defined only when its denominator is not zero.",
  "complex-plane":
    "Plot a plus b i at the point a comma b. Addition is vector addition, and the modulus is distance from the origin. A nonzero complex number has a direction angle called its argument; zero has modulus zero but no defined argument.",
  "vectors":
    "A vector from a tail to a tip has components delta x and delta y. Its magnitude is the Pythagorean length. A nonzero vector has a direction angle, but the zero vector has magnitude zero and no defined direction angle.",
  "matrix-transformations":
    "A two-by-two matrix transforms points in the plane. The absolute value of its determinant is the unsigned area scale factor. A negative determinant reverses orientation, while determinant zero collapses area.",
  "laws-sines-cosines":
    "The Law of Cosines handles two sides with their included angle, or all three sides. The Law of Sines uses opposite side-angle pairs. These laws solve sufficiently specified triangles, but the side-side-angle case may have zero, one, or two solutions.",
  "study-design":
    "Random sampling supports generalizing from a sample to a population. Random assignment in a well-conducted experiment makes treatment groups comparable in expectation and can support causal inference when the evidence is unlikely under chance. Observational association alone does not establish cause.",
  "compare-treatments":
    "A randomization test compares the observed treatment difference with a distribution made by reassigning treatment labels. A difference far in the tail gives evidence against a no-effect explanation. A fixed toy cutoff is not a p-value or a complete significance test.",
  "decisions-probability":
    "Expected value compares long-run average payoffs. A positive expected net is favorable for a risk-neutral repeated-play comparison, but it does not predict one play or include a person's risk, affordability, and preferences.",
  "quadratic-vertex-form":
    "When the coefficient a does not equal zero, y equals a times x minus h squared plus k is a parabola with vertex h comma k. If the coefficient becomes zero, the graph is the constant line y equals k, so it is not a quadratic and has no unique vertex or axis of symmetry."
};
