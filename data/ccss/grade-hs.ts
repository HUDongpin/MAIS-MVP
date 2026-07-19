import type { Grade } from "./types";

/**
 * High School (Grades 9–12).
 *
 * CCSS organizes high school by five *conceptual categories* rather than by
 * grade level. Each domain carries `category` so the UI can group them.
 * Standard counts here match the official CCSS-M enumeration exactly
 * (e.g. A-APR = 7, A-REI = 12, F-IF = 9, G-CO = 13, N-VM = 12, G-GMD = 4).
 */

export const gradeHS: Grade = {
  id: "HS",
  label: "High School",
  focus:
    "Algebra, functions, geometry, and statistics — the conceptual categories that prepare students for college and careers.",
  band: "high",
  domains: [
    // ---------------- Number & Quantity ----------------
    {
      code: "N-RN",
      name: "The Real Number System",
      category: "Number & Quantity",
      clusters: [
        {
          letter: "A",
          heading: "Extend the properties of exponents to rational exponents",
          standards: [
            {
              id: "N-RN.1",
              description: "Explain rational exponents via the properties of integer exponents.",
            },
            {
              id: "N-RN.2",
              description: "Rewrite expressions using radicals and rational exponents.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Use properties of rational and irrational numbers",
          standards: [
            {
              id: "N-RN.3",
              description: "Explain why sums/products of rational and irrational numbers behave as they do.",
            },
          ],
        },
      ],
    },
    {
      code: "N-Q",
      name: "Quantities",
      category: "Number & Quantity",
      clusters: [
        {
          letter: "A",
          heading: "Reason quantitatively and use units to solve problems",
          standards: [
            {
              id: "N-Q.1",
              description: "Use units to guide the solution of multi-step problems.",
            },
            {
              id: "N-Q.2",
              description: "Define appropriate quantities for descriptive modeling.",
            },
            {
              id: "N-Q.3",
              description: "Choose a level of accuracy appropriate to measurement limits.",
            },
          ],
        },
      ],
    },
    {
      code: "N-CN",
      name: "The Complex Number System",
      category: "Number & Quantity",
      clusters: [
        {
          letter: "A",
          heading: "Perform arithmetic operations with complex numbers",
          standards: [
            { id: "N-CN.1", description: "Know there is a complex number i with i² = −1." },
            { id: "N-CN.2", description: "Add, subtract, and multiply complex numbers." },
            { id: "N-CN.3", description: "Find conjugates, moduli, and quotients of complex numbers." },
          ],
        },
        {
          letter: "B",
          heading: "Represent complex numbers on the complex plane",
          standards: [
            { id: "N-CN.4", description: "Represent complex numbers in rectangular and polar form." },
            { id: "N-CN.5", description: "Represent operations on complex numbers geometrically." },
            { id: "N-CN.6", description: "Compute distances and midpoints in the complex plane." },
          ],
        },
        {
          letter: "C",
          heading: "Use complex numbers in polynomial identities and equations",
          standards: [
            { id: "N-CN.7", description: "Solve quadratic equations with complex solutions." },
            { id: "N-CN.8", description: "Extend polynomial identities to the complex numbers." },
            { id: "N-CN.9", description: "Know the Fundamental Theorem of Algebra." },
          ],
        },
      ],
    },
    {
      code: "N-VM",
      name: "Vector & Matrix Quantities",
      category: "Number & Quantity",
      clusters: [
        {
          letter: "A",
          heading: "Represent and model with vector quantities",
          standards: [
            { id: "N-VM.1", description: "Recognize vectors as having magnitude and direction." },
            { id: "N-VM.2", description: "Find components of a vector between two points." },
            { id: "N-VM.3", description: "Solve problems using vectors." },
          ],
        },
        {
          letter: "B",
          heading: "Perform operations on vectors",
          standards: [
            { id: "N-VM.4", description: "Add and subtract vectors." },
            { id: "N-VM.5", description: "Multiply a vector by a scalar." },
          ],
        },
        {
          letter: "C",
          heading: "Perform operations on matrices and use matrices in applications",
          standards: [
            { id: "N-VM.6", description: "Use matrices to represent and manipulate data." },
            { id: "N-VM.7", description: "Multiply matrices by scalars." },
            { id: "N-VM.8", description: "Add, subtract, and multiply matrices." },
            { id: "N-VM.9", description: "Understand matrix multiplication properties." },
            { id: "N-VM.10", description: "Understand the role of the zero and identity matrices." },
            { id: "N-VM.11", description: "Multiply a matrix by a vector to transform it." },
            { id: "N-VM.12", description: "Work with 2×2 matrices as transformations of the plane." },
          ],
        },
      ],
    },
    // ---------------- Algebra ----------------
    {
      code: "A-SSE",
      name: "Seeing Structure in Expressions",
      category: "Algebra",
      clusters: [
        {
          letter: "A",
          heading: "Interpret the structure of expressions",
          standards: [
            { id: "A-SSE.1", description: "Interpret parts of an expression in context." },
            { id: "A-SSE.2", description: "Use structure to rewrite an expression." },
          ],
        },
        {
          letter: "B",
          heading: "Write expressions in equivalent forms to solve problems",
          standards: [
            { id: "A-SSE.3", description: "Rewrite an expression to reveal properties (factor, complete the square)." },
            { id: "A-SSE.4", description: "Derive and use the formula for a finite geometric series." },
          ],
        },
      ],
    },
    {
      code: "A-APR",
      name: "Arithmetic with Polynomials & Rational Expressions",
      category: "Algebra",
      clusters: [
        {
          letter: "A",
          heading: "Perform arithmetic operations on polynomials",
          standards: [
            { id: "A-APR.1", description: "Add, subtract, and multiply polynomials (closure)." },
          ],
        },
        {
          letter: "B",
          heading: "Understand the relationship between zeros and factors of polynomials",
          standards: [
            { id: "A-APR.2", description: "Apply the Remainder Theorem." },
            { id: "A-APR.3", description: "Use zeros to construct a rough graph of a polynomial." },
          ],
        },
        {
          letter: "C",
          heading: "Use polynomial identities to solve problems",
          standards: [
            { id: "A-APR.4", description: "Prove and use polynomial identities." },
            { id: "A-APR.5", description: "Know and apply the Binomial Theorem." },
          ],
        },
        {
          letter: "D",
          heading: "Rewrite rational expressions",
          standards: [
            { id: "A-APR.6", description: "Rewrite rational expressions using division." },
            { id: "A-APR.7", description: "Add, subtract, multiply, and divide rational expressions." },
          ],
        },
      ],
    },
    {
      code: "A-CED",
      name: "Creating Equations",
      category: "Algebra",
      clusters: [
        {
          letter: "A",
          heading: "Create equations that describe numbers or relationships",
          standards: [
            { id: "A-CED.1", description: "Create equations and inequalities in one variable." },
            { id: "A-CED.2", description: "Create equations in two variables and graph them." },
            { id: "A-CED.3", description: "Represent constraints by equations, inequalities, or systems." },
            { id: "A-CED.4", description: "Rearrange formulas to highlight a quantity of interest." },
          ],
        },
      ],
    },
    {
      code: "A-REI",
      name: "Reasoning with Equations & Inequalities",
      category: "Algebra",
      clusters: [
        {
          letter: "A",
          heading: "Understand solving equations as a process of reasoning",
          standards: [
            { id: "A-REI.1", description: "Explain each step in solving an equation." },
            { id: "A-REI.2", description: "Solve simple rational and radical equations." },
          ],
        },
        {
          letter: "B",
          heading: "Solve equations and inequalities in one variable",
          standards: [
            { id: "A-REI.3", description: "Solve linear equations and inequalities in one variable." },
            { id: "A-REI.4", description: "Solve quadratic equations by several methods." },
          ],
        },
        {
          letter: "C",
          heading: "Solve systems of equations",
          standards: [
            { id: "A-REI.5", description: "Justify the elimination method for systems." },
            { id: "A-REI.6", description: "Solve systems of linear equations." },
            { id: "A-REI.7", description: "Solve a linear–quadratic system algebraically and graphically." },
            { id: "A-REI.8", description: "Represent a system of linear equations as a matrix equation." },
            { id: "A-REI.9", description: "Solve systems using inverse matrices." },
          ],
        },
        {
          letter: "D",
          heading: "Represent and solve equations and inequalities graphically",
          standards: [
            { id: "A-REI.10", description: "Understand a graph as the set of solutions of an equation." },
            { id: "A-REI.11", description: "Explain why x-values where f(x)=g(x) are solutions." },
            { id: "A-REI.12", description: "Graph the solution set of a linear inequality/system." },
          ],
        },
      ],
    },
    // ---------------- Functions ----------------
    {
      code: "F-IF",
      name: "Interpreting Functions",
      category: "Functions",
      clusters: [
        {
          letter: "A",
          heading: "Understand the concept of a function and use function notation",
          standards: [
            { id: "F-IF.1", description: "Understand a function as a rule assigning one output to each input." },
            { id: "F-IF.2", description: "Use function notation and evaluate functions." },
            { id: "F-IF.3", description: "Recognize sequences as functions on the integers." },
          ],
        },
        {
          letter: "B",
          heading: "Interpret functions that arise in applications",
          standards: [
            { id: "F-IF.4", description: "Interpret key features of graphs and tables in context." },
            { id: "F-IF.5", description: "Relate the domain of a function to its context." },
            { id: "F-IF.6", description: "Calculate and interpret average rate of change." },
          ],
        },
        {
          letter: "C",
          heading: "Analyze functions using different representations",
          standards: [
            { id: "F-IF.7", description: "Graph functions and show key features." },
            { id: "F-IF.8", description: "Rewrite a function to reveal properties (e.g., vertex form)." },
            { id: "F-IF.9", description: "Compare properties of two functions shown different ways." },
          ],
        },
      ],
    },
    {
      code: "F-BF",
      name: "Building Functions",
      category: "Functions",
      clusters: [
        {
          letter: "A",
          heading: "Build a function that models a relationship between two quantities",
          standards: [
            { id: "F-BF.1", description: "Write a function that describes a relationship." },
            { id: "F-BF.2", description: "Write arithmetic and geometric sequences recursively and explicitly." },
          ],
        },
        {
          letter: "B",
          heading: "Build new functions from existing functions",
          standards: [
            { id: "F-BF.3", description: "Identify the effect of transformations f(x)+k, kf(x), f(kx), f(x+k)." },
            { id: "F-BF.4", description: "Find inverse functions." },
            { id: "F-BF.5", description: "Understand the inverse relationship between exponents and logarithms." },
          ],
        },
      ],
    },
    {
      code: "F-LE",
      name: "Linear, Quadratic & Exponential Models",
      category: "Functions",
      clusters: [
        {
          letter: "A",
          heading: "Construct and compare linear, quadratic, and exponential models",
          standards: [
            { id: "F-LE.1", description: "Distinguish situations modeled by linear vs. exponential functions." },
            { id: "F-LE.2", description: "Construct linear and exponential functions from data." },
            { id: "F-LE.3", description: "Observe that exponential growth eventually exceeds polynomial growth." },
          ],
        },
        {
          letter: "B",
          heading: "Interpret expressions for functions in terms of the situation",
          standards: [
            { id: "F-LE.4", description: "Use logarithms to solve exponential models." },
            { id: "F-LE.5", description: "Interpret the parameters of a linear or exponential function." },
          ],
        },
      ],
    },
    {
      code: "F-TF",
      name: "Trigonometric Functions",
      category: "Functions",
      clusters: [
        {
          letter: "A",
          heading: "Extend the domain of trigonometric functions using the unit circle",
          standards: [
            { id: "F-TF.1", description: "Understand radian measure as arc length on the unit circle." },
            { id: "F-TF.2", description: "Extend trig functions to all real numbers via the unit circle." },
            { id: "F-TF.3", description: "Use special triangles to find exact trig values." },
            { id: "F-TF.4", description: "Use the unit circle to explain symmetry and periodicity." },
          ],
        },
        {
          letter: "B",
          heading: "Model periodic phenomena with trigonometric functions",
          standards: [
            { id: "F-TF.5", description: "Model periodic phenomena with specified amplitude, period, midline." },
            { id: "F-TF.6", description: "Restrict domains so trig functions have inverses." },
            { id: "F-TF.7", description: "Use inverse functions to solve trigonometric equations." },
          ],
        },
        {
          letter: "C",
          heading: "Prove and apply trigonometric identities",
          standards: [
            { id: "F-TF.8", description: "Prove and use the Pythagorean identity sin²θ + cos²θ = 1." },
            { id: "F-TF.9", description: "Prove and use addition and subtraction formulas." },
          ],
        },
      ],
    },
    // ---------------- Geometry ----------------
    {
      code: "G-CO",
      name: "Congruence",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Experiment with transformations in the plane",
          standards: [
            { id: "G-CO.1", description: "Define angle, circle, line, and related terms precisely." },
            { id: "G-CO.2", description: "Represent transformations as functions of the plane." },
            { id: "G-CO.3", description: "Describe rotations and reflections that carry a figure onto itself." },
            { id: "G-CO.4", description: "Define rotations, reflections, and translations." },
            { id: "G-CO.5", description: "Draw the image of a figure under a transformation." },
          ],
        },
        {
          letter: "B",
          heading: "Understand congruence in terms of rigid motions",
          standards: [
            { id: "G-CO.6", description: "Use rigid motions to decide whether figures are congruent." },
            { id: "G-CO.7", description: "Show triangle congruence via corresponding parts." },
            { id: "G-CO.8", description: "Explain ASA, SAS, and SSS from rigid motions." },
          ],
        },
        {
          letter: "C",
          heading: "Prove geometric theorems",
          standards: [
            { id: "G-CO.9", description: "Prove theorems about lines and angles." },
            { id: "G-CO.10", description: "Prove theorems about triangles." },
            { id: "G-CO.11", description: "Prove theorems about parallelograms." },
          ],
        },
        {
          letter: "D",
          heading: "Make geometric constructions",
          standards: [
            { id: "G-CO.12", description: "Make formal constructions with compass and straightedge." },
            { id: "G-CO.13", description: "Construct inscribed regular polygons." },
          ],
        },
      ],
    },
    {
      code: "G-SRT",
      name: "Similarity, Right Triangles & Trigonometry",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Understand similarity in terms of similarity transformations",
          standards: [
            { id: "G-SRT.1", description: "Verify properties of dilations." },
            { id: "G-SRT.2", description: "Define similarity via similarity transformations." },
            { id: "G-SRT.3", description: "Use the AA criterion for triangle similarity." },
          ],
        },
        {
          letter: "B",
          heading: "Prove theorems involving similarity",
          standards: [
            { id: "G-SRT.4", description: "Prove theorems about triangles using similarity." },
            { id: "G-SRT.5", description: "Use congruence and similarity criteria to solve problems." },
          ],
        },
        {
          letter: "C",
          heading: "Define trigonometric ratios and solve right-triangle problems",
          standards: [
            { id: "G-SRT.6", description: "Define trig ratios from side ratios in similar right triangles." },
            { id: "G-SRT.7", description: "Explain the relationship between sine and cosine of complementary angles." },
            { id: "G-SRT.8", description: "Use trig ratios and the Pythagorean Theorem in applications." },
          ],
        },
        {
          letter: "D",
          heading: "Apply trigonometry to general triangles",
          standards: [
            { id: "G-SRT.9", description: "Derive the area formula (1/2)ab·sin(C)." },
            { id: "G-SRT.10", description: "Prove and apply the Laws of Sines and Cosines." },
            { id: "G-SRT.11", description: "Use the Laws of Sines and Cosines to solve problems." },
          ],
        },
      ],
    },
    {
      code: "G-C",
      name: "Circles",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Understand and apply theorems about circles",
          standards: [
            { id: "G-C.1", description: "Prove that all circles are similar." },
            { id: "G-C.2", description: "Identify and describe relationships among angles, radii, and chords." },
            { id: "G-C.3", description: "Construct inscribed and circumscribed circles of a triangle." },
            { id: "G-C.4", description: "Construct a tangent line to a circle." },
          ],
        },
        {
          letter: "B",
          heading: "Find arc lengths and areas of sectors of circles",
          standards: [
            { id: "G-C.5", description: "Relate arc length and sector area to radius and central angle." },
          ],
        },
      ],
    },
    {
      code: "G-GPE",
      name: "Expressing Geometric Properties with Equations",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Translate between the geometric description and the equation of a conic",
          standards: [
            { id: "G-GPE.1", description: "Derive the equation of a circle from the distance formula." },
            { id: "G-GPE.2", description: "Derive the equation of a parabola from focus and directrix." },
            { id: "G-GPE.3", description: "Derive equations of ellipses and hyperbolas." },
          ],
        },
        {
          letter: "B",
          heading: "Use coordinates to prove geometric theorems algebraically",
          standards: [
            { id: "G-GPE.4", description: "Use coordinates to prove simple geometric theorems." },
            { id: "G-GPE.5", description: "Prove the slope criteria for parallel and perpendicular lines." },
            { id: "G-GPE.6", description: "Find a point partitioning a segment in a given ratio." },
            { id: "G-GPE.7", description: "Use coordinates to compute perimeters and areas." },
          ],
        },
      ],
    },
    {
      code: "G-GMD",
      name: "Geometric Measurement & Dimension",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Explain volume formulas and use them to solve problems",
          standards: [
            { id: "G-GMD.1", description: "Give informal arguments for circumference, area, and volume formulas." },
            { id: "G-GMD.2", description: "Give an informal argument for volume formulas (Cavalieri's principle)." },
            { id: "G-GMD.3", description: "Use volume formulas for cylinders, pyramids, cones, and spheres." },
          ],
        },
        {
          letter: "B",
          heading: "Visualize relationships between two- and three-dimensional objects",
          standards: [
            { id: "G-GMD.4", description: "Identify cross-sections of solids and solids of revolution." },
          ],
        },
      ],
    },
    {
      code: "G-MG",
      name: "Modeling with Geometry",
      category: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Apply geometric concepts in modeling situations",
          standards: [
            { id: "G-MG.1", description: "Use geometric shapes to describe objects." },
            { id: "G-MG.2", description: "Apply density concepts based on area and volume." },
            { id: "G-MG.3", description: "Apply geometric methods to solve design problems." },
          ],
        },
      ],
    },
    // ---------------- Statistics & Probability ----------------
    {
      code: "S-ID",
      name: "Interpreting Categorical & Quantitative Data",
      category: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Summarize, represent, and interpret data on a single variable",
          standards: [
            { id: "S-ID.1", description: "Represent data with dot plots, histograms, and box plots." },
            { id: "S-ID.2", description: "Compare center and spread of two or more data sets." },
            { id: "S-ID.3", description: "Interpret differences in shape, center, and spread; account for outliers." },
            { id: "S-ID.4", description: "Use the normal distribution to estimate population percentages." },
          ],
        },
        {
          letter: "B",
          heading: "Summarize, represent, and interpret data on two variables",
          standards: [
            { id: "S-ID.5", description: "Summarize categorical data in two-way frequency tables." },
            { id: "S-ID.6", description: "Fit a function to data and analyze residuals." },
          ],
        },
        {
          letter: "C",
          heading: "Interpret linear models",
          standards: [
            { id: "S-ID.7", description: "Interpret the slope and intercept of a linear model." },
            { id: "S-ID.8", description: "Compute and interpret the correlation coefficient." },
            { id: "S-ID.9", description: "Distinguish between correlation and causation." },
          ],
        },
      ],
    },
    {
      code: "S-IC",
      name: "Making Inferences & Justifying Conclusions",
      category: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Understand and evaluate random processes underlying experiments",
          standards: [
            { id: "S-IC.1", description: "Understand statistics as reasoning about a population from a sample." },
            { id: "S-IC.2", description: "Decide if a model is consistent with data from a process." },
          ],
        },
        {
          letter: "B",
          heading: "Make inferences and justify conclusions from studies",
          standards: [
            { id: "S-IC.3", description: "Distinguish surveys, experiments, and observational studies." },
            { id: "S-IC.4", description: "Use sample data to estimate a population mean or proportion." },
            { id: "S-IC.5", description: "Compare two treatments using randomized experiments." },
            { id: "S-IC.6", description: "Evaluate reports based on data." },
          ],
        },
      ],
    },
    {
      code: "S-CP",
      name: "Conditional Probability & the Rules of Probability",
      category: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Understand independence and conditional probability",
          standards: [
            { id: "S-CP.1", description: "Describe events as subsets using unions, intersections, complements." },
            { id: "S-CP.2", description: "Use the multiplication rule to test independence." },
            { id: "S-CP.3", description: "Understand conditional probability P(A|B)." },
            { id: "S-CP.4", description: "Construct and interpret two-way frequency tables." },
            { id: "S-CP.5", description: "Explain conditional probability and independence in context." },
          ],
        },
        {
          letter: "B",
          heading: "Use the rules of probability to compute probabilities of compound events",
          standards: [
            { id: "S-CP.6", description: "Find conditional probabilities as fractions of outcomes." },
            { id: "S-CP.7", description: "Apply the Addition Rule P(A or B)." },
            { id: "S-CP.8", description: "Apply the general Multiplication Rule." },
            { id: "S-CP.9", description: "Use permutations and combinations to compute probabilities." },
          ],
        },
      ],
    },
    {
      code: "S-MD",
      name: "Using Probability to Make Decisions",
      category: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Calculate expected values and use them to solve problems",
          standards: [
            { id: "S-MD.1", description: "Define a random variable and graph its distribution." },
            { id: "S-MD.2", description: "Calculate the expected value of a random variable." },
            { id: "S-MD.3", description: "Compute expected value from a theoretical probability distribution." },
            { id: "S-MD.4", description: "Compute expected value from an empirical distribution." },
          ],
        },
        {
          letter: "B",
          heading: "Use probability to evaluate outcomes of decisions",
          standards: [
            { id: "S-MD.5", description: "Weigh outcomes of decisions using expected values and payoffs." },
            { id: "S-MD.6", description: "Use probabilities to make fair decisions." },
            { id: "S-MD.7", description: "Analyze decisions and strategies using probability concepts." },
          ],
        },
      ],
    },
  ],
};
