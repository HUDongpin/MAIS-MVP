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
    "A ten-frame is a box with ten spots. Tap a spot to add a counter, and count out loud: one, two, three! The last number you say tells how many counters there are in all. When the frame is full, you have made a whole ten.",
  "count-to-100":
    "The hundred chart shows every number from one to one hundred. Count by ones, or jump a whole row at a time to count by tens: ten, twenty, thirty! You can start counting from any number — just keep going forward.",
  "compare-groups":
    "Two groups want to know: who has more? Match them up one to one, like partners holding hands. If one group has extras left over, that group is greater. If they match exactly, the groups are equal.",
  "number-bonds":
    "Every number has smaller numbers hiding inside it. Break a number into two parts, then put the parts back together to make the whole again. Try all the ways to make five — and then find the two partners that make ten!",
  "teen-numbers":
    "Teen numbers are sneaky — but they all have the same secret. Every teen number, from eleven to nineteen, is one full ten and some extra ones. Fourteen is a ten and four more. Can you find the ten hiding in your number?",
  "compare-length":
    "Which pencil is longer? Line them up so they start at the very same spot — that is the fair way to compare. Then look at the ends: the one that sticks out farther is longer, and the other one is shorter.",
  "sort-and-count":
    "A big mixed pile is hard to count. Sort it first! Put the same things together in groups, then count each group. Now you can see which group has the most and which has the fewest.",
  "flat-shapes":
    "Shapes have names, and a shape keeps its name no matter how you turn it. Pick a shape, then count its straight sides and its corners. A triangle always has three sides and three corners, even when it is upside down!",
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
    "Numbers keep going past one hundred: one hundred one, one hundred two, all the way to one hundred twenty! Start counting from any number and keep going. Can you read the big numbers along the way?",
  "tens-and-ones":
    "Every two-digit number is built from tens and ones. Forty-seven is four ten-rods and seven little ones. Build a number with blocks — then find ten more and ten less in your head!",
  "compare-two-digit":
    "Which number is bigger? Look at the tens first! More tens wins. If the tens tie, check the ones. Then write >, =, or < between the two numbers.",
  "add-within-100":
    "Add big numbers with blocks: put the ones with the ones and the tens with the tens. If you collect ten little ones, bundle them into a brand-new ten!",
  "order-and-measure":
    "Line up your objects and measure them with same-size units. Then put them in order: shortest, medium, longest. Fair measuring means every unit is the same size, with no gaps!",
  "telling-time":
    "A clock has two hands. The short hand tells the hour. When the long hand points straight up, it is something o'clock. When it points straight down, it is half past. What time is it now?",
  "picture-graph":
    "A picture graph shows groups with little pictures. Count the pictures in each row to see how many. Which group has the most? How many more does it have?",
  "shape-attributes":
    "What makes a triangle a triangle? Three straight sides and three corners — always! Color does not matter. Size does not matter. Turn it any way you like: if it has three sides, it is still a triangle.",
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
    "Is your number odd or even? Pair everything up! If every object finds a partner, the number is even. If one is left standing alone, the number is odd.",
  "arrays-repeated-addition":
    "An array is a tidy rectangle of rows. Count one row, then add it again and again: four plus four plus four. Adding equal rows is the secret start of multiplication!",
  "place-value-blocks":
    "Build any number up to nine hundred ninety-nine! Snap together big hundred-squares, ten-rods, and little ones. The digits of the number tell you exactly which blocks to grab.",
  "skip-counting":
    "Count in jumps! By fives: five, ten, fifteen. By tens: ten, twenty, thirty. By hundreds: one hundred, two hundred, three hundred! Watch which digit changes with every jump.",
  "compare-three-digit":
    "Big numbers compare in order: hundreds first, then tens, then ones. Three hundred twenty-four versus three hundred nineteen? The hundreds tie, so check the tens — twenty beats ten!",
  "add-subtract-regroup":
    "Sometimes the ones pile up past nine — so carry a ten! Sometimes there are not enough ones — so borrow a ten. Regrouping is just trading tens and ones to make the math work.",
  "add-four-numbers":
    "Four numbers at once? No problem! Stack them up, add all the ones, carry if you need to, then add all the tens. One column at a time gets it done.",
  "add-subtract-1000":
    "Add and subtract really big numbers with hundreds, tens, and ones. Work place by place, and trade blocks when you regroup. The blocks show exactly why carrying and borrowing work!",
  "mental-10-100":
    "Here is a magic trick: to add ten, only the tens digit changes. To add a hundred, only the hundreds digit changes! Watch the number, change one digit, and you have the answer in your head.",
  "measure-with-ruler":
    "Line up the zero end of the ruler with your object — that is the fair start. Then read the number at the other end. Try measuring in two different units: the smaller the unit, the bigger the count!",
  "estimate-compare-length":
    "First guess: about how long is it? Then measure and check your guess. To find how much longer one object is, subtract the short length from the long one.",
  "length-number-line":
    "Lengths live on the number line too! Start at a number, jump forward to add length, jump back to take it away. Where do you land?",
  "time-five-minutes":
    "Count around the clock by fives: five, ten, fifteen minutes! The long hand tells the minutes, the short hand tells the hour. And remember — morning times are a.m., afternoon and night are p.m.",
  "money":
    "Count your money! Quarters are twenty-five cents, dimes are ten, nickels are five, pennies are one. Count the big coins first, then write your total with the dollar or cent sign.",
  "line-plot":
    "Measure lots of things, then stack an X for each measurement above the number line. The taller the stack, the more times that length came up. What length happened most?",
  "bar-graph":
    "A bar graph shows groups as tall bars. But careful — read the scale! Each step might count by twos or fives. Read the bar's height on the scale to find its number.",
  "shapes-by-attributes":
    "Shapes tell you their names with their sides and angles. Three sides? Triangle. Four sides? Quadrilateral. Five? Pentagon. Six? Hexagon. Count the sides and say the name!",
  "rows-and-columns":
    "Fill a rectangle with same-size squares — rows going across, columns going down. Count them all! Covering a shape with squares is the very beginning of area.",
  "equal-shares":
    "Split a shape into equal shares: halves, thirds, or fourths. Here is the surprise — equal shares can look different but still be the same size! Fair shares are about size, not shape.",

  // ---- Upper grades (authored where the summary is too thin for read-aloud) ----
  "roots":
    "Roots undo powers. If x squared is 25, then x is the square root of 25 — that is 5, and don't forget negative 5. If x cubed is 27, then x is the cube root of 27, which is 3."
};
