import type { Grade } from "./types";

/**
 * Grades 6 – 8  (Middle School band).
 * Ratios & proportional reasoning, the rational-number system, expressions &
 * equations, and — beginning in Grade 8 — functions.
 */

export const grade6: Grade = {
  id: "6",
  label: "Grade 6",
  focus:
    "Ratios and rates, dividing fractions, negative numbers, and one-variable equations.",
  band: "middle",
  domains: [
    {
      code: "RP",
      name: "Ratios & Proportional Relationships",
      clusters: [
        {
          letter: "A",
          heading: "Understand ratio concepts and use ratio reasoning to solve problems",
          standards: [
            { id: "6.RP.A.1", description: "Understand the concept of a ratio." },
            {
              id: "6.RP.A.2",
              description: "Understand a unit rate a/b associated with a ratio.",
            },
            {
              id: "6.RP.A.3",
              description:
                "Use ratio and rate reasoning (tables, tape diagrams, double number lines).",
            },
          ],
        },
      ],
    },
    {
      code: "NS",
      name: "The Number System",
      clusters: [
        {
          letter: "A",
          heading: "Divide fractions by fractions",
          standards: [
            {
              id: "6.NS.A.1",
              description: "Divide fractions by fractions and interpret the result.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Compute fluently and find common factors and multiples",
          standards: [
            { id: "6.NS.B.2", description: "Fluently divide multi-digit numbers." },
            {
              id: "6.NS.B.3",
              description: "Fluently add, subtract, multiply, and divide decimals.",
            },
            {
              id: "6.NS.B.4",
              description: "Find greatest common factor and least common multiple.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Extend understanding of numbers to rational numbers",
          standards: [
            {
              id: "6.NS.C.5",
              description: "Use positive and negative numbers for opposite quantities.",
            },
            {
              id: "6.NS.C.6",
              description: "Understand a rational number as a point on the number line.",
            },
            {
              id: "6.NS.C.7",
              description: "Understand ordering and absolute value of rational numbers.",
            },
            {
              id: "6.NS.C.8",
              description: "Solve problems by graphing points in all four quadrants.",
            },
          ],
        },
      ],
    },
    {
      code: "EE",
      name: "Expressions & Equations",
      clusters: [
        {
          letter: "A",
          heading: "Apply arithmetic understanding to algebraic expressions",
          standards: [
            {
              id: "6.EE.A.1",
              description: "Write and evaluate expressions with whole-number exponents.",
            },
            {
              id: "6.EE.A.2",
              description: "Write, read, and evaluate expressions with variables.",
            },
            {
              id: "6.EE.A.3",
              description: "Use properties of operations to write equivalent expressions.",
            },
            {
              id: "6.EE.A.4",
              description: "Identify when two expressions are equivalent.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Reason about and solve one-variable equations and inequalities",
          standards: [
            {
              id: "6.EE.B.5",
              description: "Solving an equation means finding values that make it true.",
            },
            {
              id: "6.EE.B.6",
              description: "Use variables to represent numbers and write expressions.",
            },
            {
              id: "6.EE.B.7",
              description: "Solve equations of the form x + p = q and px = q.",
            },
            {
              id: "6.EE.B.8",
              description: "Write an inequality for a constraint; graph its solutions.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Represent relationships between dependent and independent variables",
          standards: [
            {
              id: "6.EE.C.9",
              description: "Use variables to represent two related, changing quantities.",
            },
          ],
        },
      ],
    },
    {
      code: "G",
      name: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Solve problems involving area, surface area, and volume",
          standards: [
            {
              id: "6.G.A.1",
              description: "Find areas of polygons by composing and decomposing.",
            },
            {
              id: "6.G.A.2",
              description: "Find volumes of right rectangular prisms with fractional edges.",
            },
            {
              id: "6.G.A.3",
              description: "Draw polygons in the coordinate plane; find side lengths.",
            },
            {
              id: "6.G.A.4",
              description: "Use nets of 3-D figures to find surface area.",
            },
          ],
        },
      ],
    },
    {
      code: "SP",
      name: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Develop understanding of statistical variability",
          standards: [
            {
              id: "6.SP.A.1",
              description: "Recognize a statistical question anticipates variability.",
            },
            {
              id: "6.SP.A.2",
              description: "A data set has a distribution: center, spread, and shape.",
            },
            {
              id: "6.SP.A.3",
              description: "Distinguish measures of center from measures of variability.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Summarize and describe distributions",
          standards: [
            {
              id: "6.SP.B.4",
              description: "Display numerical data in dot plots, histograms, box plots.",
            },
            {
              id: "6.SP.B.5",
              description: "Summarize numerical data sets in relation to their context.",
            },
          ],
        },
      ],
    },
  ],
};

export const grade7: Grade = {
  id: "7",
  label: "Grade 7",
  focus:
    "Proportional relationships, operations with rational numbers, and probability.",
  band: "middle",
  domains: [
    {
      code: "RP",
      name: "Ratios & Proportional Relationships",
      clusters: [
        {
          letter: "A",
          heading: "Analyze proportional relationships and use them to solve problems",
          standards: [
            {
              id: "7.RP.A.1",
              description: "Compute unit rates, including ratios of fractions.",
            },
            {
              id: "7.RP.A.2",
              description: "Recognize and represent proportional relationships.",
            },
            {
              id: "7.RP.A.3",
              description: "Solve multistep ratio and percent problems.",
            },
          ],
        },
      ],
    },
    {
      code: "NS",
      name: "The Number System",
      clusters: [
        {
          letter: "A",
          heading: "Add, subtract, multiply, and divide rational numbers",
          standards: [
            { id: "7.NS.A.1", description: "Add and subtract rational numbers." },
            { id: "7.NS.A.2", description: "Multiply and divide rational numbers." },
            {
              id: "7.NS.A.3",
              description: "Solve real-world problems with rational-number operations.",
            },
          ],
        },
      ],
    },
    {
      code: "EE",
      name: "Expressions & Equations",
      clusters: [
        {
          letter: "A",
          heading: "Use properties of operations to generate equivalent expressions",
          standards: [
            {
              id: "7.EE.A.1",
              description: "Add, subtract, factor, and expand linear expressions.",
            },
            {
              id: "7.EE.A.2",
              description: "Rewrite an expression to show how quantities are related.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Solve problems using numerical and algebraic expressions and equations",
          standards: [
            {
              id: "7.EE.B.3",
              description: "Solve multistep problems with rational numbers.",
            },
            {
              id: "7.EE.B.4",
              description: "Use variables to solve equations and inequalities (px + q).",
            },
          ],
        },
      ],
    },
    {
      code: "G",
      name: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Draw, construct, and describe geometrical figures",
          standards: [
            {
              id: "7.G.A.1",
              description: "Solve problems involving scale drawings of figures.",
            },
            {
              id: "7.G.A.2",
              description: "Draw geometric shapes with given conditions.",
            },
            {
              id: "7.G.A.3",
              description: "Describe cross-sections of three-dimensional figures.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Solve problems involving angle measure, area, surface area, and volume",
          standards: [
            {
              id: "7.G.B.4",
              description: "Use area and circumference formulas for a circle.",
            },
            {
              id: "7.G.B.5",
              description: "Use angle relationships to solve for unknown angles.",
            },
            {
              id: "7.G.B.6",
              description: "Solve area, volume, and surface-area problems.",
            },
          ],
        },
      ],
    },
    {
      code: "SP",
      name: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Use random sampling to draw inferences about a population",
          standards: [
            {
              id: "7.SP.A.1",
              description: "Use sampling to gain information about a population.",
            },
            {
              id: "7.SP.A.2",
              description: "Use data from a sample to draw inferences.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Draw informal comparative inferences about two populations",
          standards: [
            {
              id: "7.SP.B.3",
              description: "Assess the visual overlap of two data distributions.",
            },
            {
              id: "7.SP.B.4",
              description: "Compare two populations by center and variability.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Investigate chance processes and probability models",
          standards: [
            {
              id: "7.SP.C.5",
              description: "Understand probability as a number between 0 and 1.",
            },
            {
              id: "7.SP.C.6",
              description: "Approximate probability by collecting data.",
            },
            {
              id: "7.SP.C.7",
              description: "Develop a probability model and use it.",
            },
            {
              id: "7.SP.C.8",
              description: "Find probabilities of compound events.",
            },
          ],
        },
      ],
    },
  ],
};

export const grade8: Grade = {
  id: "8",
  label: "Grade 8",
  focus:
    "Linear equations and functions, the Pythagorean Theorem, and transformations.",
  band: "middle",
  domains: [
    {
      code: "NS",
      name: "The Number System",
      clusters: [
        {
          letter: "A",
          heading: "Know that there are irrational numbers and approximate them",
          standards: [
            {
              id: "8.NS.A.1",
              description: "Distinguish rational from irrational numbers.",
            },
            {
              id: "8.NS.A.2",
              description: "Approximate irrationals and locate them on a number line.",
            },
          ],
        },
      ],
    },
    {
      code: "EE",
      name: "Expressions & Equations",
      clusters: [
        {
          letter: "A",
          heading: "Work with radicals and integer exponents",
          standards: [
            {
              id: "8.EE.A.1",
              description: "Apply the properties of integer exponents.",
            },
            {
              id: "8.EE.A.2",
              description: "Use square-root and cube-root symbols to solve equations.",
            },
            {
              id: "8.EE.A.3",
              description: "Use scientific notation for very large or small numbers.",
            },
            {
              id: "8.EE.A.4",
              description: "Perform operations with numbers in scientific notation.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Understand connections between proportional relationships, lines, and linear equations",
          standards: [
            {
              id: "8.EE.B.5",
              description: "Graph proportional relationships; interpret slope as unit rate.",
            },
            {
              id: "8.EE.B.6",
              description: "Use similar triangles to derive y = mx and y = mx + b.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Analyze and solve linear equations and pairs of simultaneous linear equations",
          standards: [
            {
              id: "8.EE.C.7",
              description: "Solve linear equations in one variable.",
            },
            {
              id: "8.EE.C.8",
              description: "Analyze and solve pairs of simultaneous linear equations.",
            },
          ],
        },
      ],
    },
    {
      code: "F",
      name: "Functions",
      clusters: [
        {
          letter: "A",
          heading: "Define, evaluate, and compare functions",
          standards: [
            {
              id: "8.F.A.1",
              description: "A function assigns exactly one output to each input.",
            },
            {
              id: "8.F.A.2",
              description: "Compare properties of two functions shown different ways.",
            },
            {
              id: "8.F.A.3",
              description: "Know that y = mx + b defines a linear function.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Use functions to model relationships between quantities",
          standards: [
            {
              id: "8.F.B.4",
              description: "Construct a function to model a linear relationship.",
            },
            {
              id: "8.F.B.5",
              description: "Describe qualitatively the relationship shown by a graph.",
            },
          ],
        },
      ],
    },
    {
      code: "G",
      name: "Geometry",
      clusters: [
        {
          letter: "A",
          heading: "Understand congruence and similarity using transformations",
          standards: [
            {
              id: "8.G.A.1",
              description: "Verify properties of rotations, reflections, and translations.",
            },
            {
              id: "8.G.A.2",
              description: "Understand congruence via sequences of transformations.",
            },
            {
              id: "8.G.A.3",
              description: "Describe the effect of transformations using coordinates.",
            },
            {
              id: "8.G.A.4",
              description: "Understand similarity via transformations.",
            },
            {
              id: "8.G.A.5",
              description: "Use angle facts about triangles and parallel lines.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Understand and apply the Pythagorean Theorem",
          standards: [
            {
              id: "8.G.B.6",
              description: "Explain a proof of the Pythagorean Theorem.",
            },
            {
              id: "8.G.B.7",
              description: "Apply the Pythagorean Theorem to find side lengths.",
            },
            {
              id: "8.G.B.8",
              description: "Find the distance between two points in the plane.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Solve problems involving volume of cylinders, cones, and spheres",
          standards: [
            {
              id: "8.G.C.9",
              description: "Use volume formulas for cylinders, cones, and spheres.",
            },
          ],
        },
      ],
    },
    {
      code: "SP",
      name: "Statistics & Probability",
      clusters: [
        {
          letter: "A",
          heading: "Investigate patterns of association in bivariate data",
          standards: [
            {
              id: "8.SP.A.1",
              description: "Construct and interpret scatter plots.",
            },
            {
              id: "8.SP.A.2",
              description: "Fit a straight line to bivariate measurement data.",
            },
            {
              id: "8.SP.A.3",
              description: "Use the equation of a linear model to solve problems.",
            },
            {
              id: "8.SP.A.4",
              description: "Find associations in bivariate categorical data.",
            },
          ],
        },
      ],
    },
  ],
};
