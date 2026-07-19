import type { Grade } from "./types";

/**
 * Grades 3 – 5  (Upper Elementary band).
 * Multiplication/division, fractions as numbers, decimals, area & volume.
 */

export const grade3: Grade = {
  id: "3",
  label: "Grade 3",
  focus:
    "Multiplication and division within 100, fractions as numbers, and area.",
  band: "upper",
  domains: [
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading: "Represent and solve problems involving multiplication and division",
          standards: [
            { id: "3.OA.A.1", description: "Interpret products of whole numbers." },
            { id: "3.OA.A.2", description: "Interpret whole-number quotients." },
            {
              id: "3.OA.A.3",
              description:
                "Use multiplication and division within 100 to solve word problems.",
            },
            {
              id: "3.OA.A.4",
              description:
                "Find the unknown number in a multiplication or division equation.",
            },
          ],
        },
        {
          letter: "B",
          heading:
            "Understand properties of multiplication and the multiplication/division relationship",
          standards: [
            {
              id: "3.OA.B.5",
              description: "Apply properties of operations to multiply and divide.",
            },
            {
              id: "3.OA.B.6",
              description: "Understand division as an unknown-factor problem.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Multiply and divide within 100",
          standards: [
            { id: "3.OA.C.7", description: "Fluently multiply and divide within 100." },
          ],
        },
        {
          letter: "D",
          heading:
            "Solve problems involving the four operations, and identify patterns in arithmetic",
          standards: [
            {
              id: "3.OA.D.8",
              description: "Solve two-step word problems using the four operations.",
            },
            {
              id: "3.OA.D.9",
              description: "Identify arithmetic patterns and explain them.",
            },
          ],
        },
      ],
    },
    {
      code: "NBT",
      name: "Number & Operations in Base Ten",
      clusters: [
        {
          letter: "A",
          heading:
            "Use place value understanding and properties to perform multi-digit arithmetic",
          standards: [
            {
              id: "3.NBT.A.1",
              description: "Round whole numbers to the nearest 10 or 100.",
            },
            { id: "3.NBT.A.2", description: "Fluently add and subtract within 1000." },
            {
              id: "3.NBT.A.3",
              description: "Multiply one-digit numbers by multiples of 10.",
            },
          ],
        },
      ],
    },
    {
      code: "NF",
      name: "Number & Operations — Fractions",
      clusters: [
        {
          letter: "A",
          heading: "Develop understanding of fractions as numbers",
          standards: [
            {
              id: "3.NF.A.1",
              description:
                "Understand 1/b as one part when a whole is split into b equal parts.",
            },
            {
              id: "3.NF.A.2",
              description: "Understand a fraction as a number on the number line.",
            },
            {
              id: "3.NF.A.3",
              description: "Explain fraction equivalence and compare fractions.",
            },
          ],
        },
      ],
    },
    {
      code: "MD",
      name: "Measurement & Data",
      clusters: [
        {
          letter: "A",
          heading: "Solve problems involving measurement and estimation",
          standards: [
            {
              id: "3.MD.A.1",
              description: "Tell and write time to the minute; solve interval problems.",
            },
            {
              id: "3.MD.A.2",
              description: "Measure and estimate liquid volumes and masses.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Represent and interpret data",
          standards: [
            { id: "3.MD.B.3", description: "Draw scaled picture and bar graphs." },
            {
              id: "3.MD.B.4",
              description:
                "Generate measurement data to halves and quarters of an inch; line plots.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Geometric measurement: understand concepts of area",
          standards: [
            {
              id: "3.MD.C.5",
              description: "Recognize area as an attribute measured with unit squares.",
            },
            { id: "3.MD.C.6", description: "Measure areas by counting unit squares." },
            {
              id: "3.MD.C.7",
              description: "Relate area to multiplication and to addition.",
            },
          ],
        },
        {
          letter: "D",
          heading: "Geometric measurement: recognize perimeter",
          standards: [
            {
              id: "3.MD.D.8",
              description: "Solve problems involving perimeters of polygons.",
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
          heading: "Reason with shapes and their attributes",
          standards: [
            {
              id: "3.G.A.1",
              description: "Understand that shared attributes can define a shape category.",
            },
            {
              id: "3.G.A.2",
              description: "Partition shapes into equal areas; name each part as a fraction.",
            },
          ],
        },
      ],
    },
  ],
};

export const grade4: Grade = {
  id: "4",
  label: "Grade 4",
  focus:
    "Multi-digit multiplication and division, fraction equivalence, and decimals.",
  band: "upper",
  domains: [
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading: "Use the four operations with whole numbers to solve problems",
          standards: [
            {
              id: "4.OA.A.1",
              description: "Interpret a multiplication equation as a comparison.",
            },
            {
              id: "4.OA.A.2",
              description: "Solve multiplicative-comparison word problems.",
            },
            {
              id: "4.OA.A.3",
              description: "Solve multistep word problems; interpret remainders.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Gain familiarity with factors and multiples",
          standards: [
            {
              id: "4.OA.B.4",
              description: "Find factor pairs; recognize prime and composite numbers.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Generate and analyze patterns",
          standards: [
            {
              id: "4.OA.C.5",
              description: "Generate a number or shape pattern that follows a rule.",
            },
          ],
        },
      ],
    },
    {
      code: "NBT",
      name: "Number & Operations in Base Ten",
      clusters: [
        {
          letter: "A",
          heading: "Generalize place value understanding for multi-digit whole numbers",
          standards: [
            {
              id: "4.NBT.A.1",
              description: "A digit's value is ten times the place to its right.",
            },
            {
              id: "4.NBT.A.2",
              description: "Read, write, and compare multi-digit numbers.",
            },
            {
              id: "4.NBT.A.3",
              description: "Round multi-digit whole numbers to any place.",
            },
          ],
        },
        {
          letter: "B",
          heading:
            "Use place value understanding and properties to perform multi-digit arithmetic",
          standards: [
            {
              id: "4.NBT.B.4",
              description: "Fluently add and subtract multi-digit whole numbers.",
            },
            {
              id: "4.NBT.B.5",
              description:
                "Multiply up to four digits by one digit and two digits by two digits.",
            },
            {
              id: "4.NBT.B.6",
              description: "Find quotients with up to four-digit dividends.",
            },
          ],
        },
      ],
    },
    {
      code: "NF",
      name: "Number & Operations — Fractions",
      clusters: [
        {
          letter: "A",
          heading: "Extend understanding of fraction equivalence and ordering",
          standards: [
            {
              id: "4.NF.A.1",
              description:
                "Explain why a/b = (n×a)/(n×b); recognize equivalent fractions.",
            },
            {
              id: "4.NF.A.2",
              description:
                "Compare fractions with different numerators and denominators.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Build fractions from unit fractions",
          standards: [
            {
              id: "4.NF.B.3",
              description: "Understand adding/subtracting fractions as joining parts.",
            },
            {
              id: "4.NF.B.4",
              description: "Multiply a fraction by a whole number.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Understand decimal notation for fractions; compare decimal fractions",
          standards: [
            {
              id: "4.NF.C.5",
              description: "Add fractions with denominators 10 and 100.",
            },
            {
              id: "4.NF.C.6",
              description: "Use decimal notation for fractions with denominators 10 or 100.",
            },
            { id: "4.NF.C.7", description: "Compare two decimals to hundredths." },
          ],
        },
      ],
    },
    {
      code: "MD",
      name: "Measurement & Data",
      clusters: [
        {
          letter: "A",
          heading: "Solve problems involving measurement and conversion",
          standards: [
            {
              id: "4.MD.A.1",
              description: "Know relative sizes of units; convert within a system.",
            },
            {
              id: "4.MD.A.2",
              description: "Solve measurement word problems, including fractions.",
            },
            {
              id: "4.MD.A.3",
              description: "Apply area and perimeter formulas for rectangles.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Represent and interpret data",
          standards: [
            {
              id: "4.MD.B.4",
              description: "Make a line plot of fractional measurement data.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Geometric measurement: understand angles and measure them",
          standards: [
            {
              id: "4.MD.C.5",
              description: "Understand angles and how they are measured.",
            },
            {
              id: "4.MD.C.6",
              description: "Measure and sketch angles with a protractor.",
            },
            { id: "4.MD.C.7", description: "Recognize angle measure as additive." },
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
          heading:
            "Draw and identify lines and angles; classify shapes by their lines and angles",
          standards: [
            {
              id: "4.G.A.1",
              description:
                "Draw points, lines, rays, angles, and perpendicular/parallel lines.",
            },
            {
              id: "4.G.A.2",
              description: "Classify two-dimensional figures by their lines and angles.",
            },
            { id: "4.G.A.3", description: "Recognize and draw lines of symmetry." },
          ],
        },
      ],
    },
  ],
};

export const grade5: Grade = {
  id: "5",
  label: "Grade 5",
  focus:
    "Operations with fractions and decimals, the place-value system, and volume.",
  band: "upper",
  domains: [
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading: "Write and interpret numerical expressions",
          standards: [
            {
              id: "5.OA.A.1",
              description: "Use parentheses, brackets, or braces; evaluate expressions.",
            },
            {
              id: "5.OA.A.2",
              description: "Write and interpret expressions without evaluating them.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Analyze patterns and relationships",
          standards: [
            {
              id: "5.OA.B.3",
              description: "Generate two numerical patterns; graph the ordered pairs.",
            },
          ],
        },
      ],
    },
    {
      code: "NBT",
      name: "Number & Operations in Base Ten",
      clusters: [
        {
          letter: "A",
          heading: "Understand the place value system",
          standards: [
            {
              id: "5.NBT.A.1",
              description:
                "A digit is 10× the place to its right and 1/10 of the place to its left.",
            },
            {
              id: "5.NBT.A.2",
              description: "Explain patterns when multiplying or dividing by powers of 10.",
            },
            {
              id: "5.NBT.A.3",
              description: "Read, write, and compare decimals to thousandths.",
            },
            { id: "5.NBT.A.4", description: "Round decimals to any place." },
          ],
        },
        {
          letter: "B",
          heading:
            "Perform operations with multi-digit whole numbers and decimals to hundredths",
          standards: [
            {
              id: "5.NBT.B.5",
              description: "Fluently multiply multi-digit whole numbers.",
            },
            {
              id: "5.NBT.B.6",
              description: "Find quotients with up to four-digit dividends.",
            },
            {
              id: "5.NBT.B.7",
              description: "Add, subtract, multiply, and divide decimals to hundredths.",
            },
          ],
        },
      ],
    },
    {
      code: "NF",
      name: "Number & Operations — Fractions",
      clusters: [
        {
          letter: "A",
          heading: "Use equivalent fractions to add and subtract fractions",
          standards: [
            {
              id: "5.NF.A.1",
              description: "Add and subtract fractions with unlike denominators.",
            },
            {
              id: "5.NF.A.2",
              description: "Solve word problems adding and subtracting fractions.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Apply understanding to multiply and divide fractions",
          standards: [
            {
              id: "5.NF.B.3",
              description: "Interpret a fraction as division of numerator by denominator.",
            },
            {
              id: "5.NF.B.4",
              description: "Multiply a fraction or whole number by a fraction.",
            },
            {
              id: "5.NF.B.5",
              description: "Interpret multiplication as scaling (resizing).",
            },
            {
              id: "5.NF.B.6",
              description: "Solve real-world problems multiplying fractions.",
            },
            {
              id: "5.NF.B.7",
              description:
                "Divide unit fractions by whole numbers and whole numbers by unit fractions.",
            },
          ],
        },
      ],
    },
    {
      code: "MD",
      name: "Measurement & Data",
      clusters: [
        {
          letter: "A",
          heading: "Convert like measurement units within a system",
          standards: [
            {
              id: "5.MD.A.1",
              description: "Convert among different-sized standard measurement units.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Represent and interpret data",
          standards: [
            {
              id: "5.MD.B.2",
              description: "Make a line plot of fractional measurements; solve problems.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Geometric measurement: understand concepts of volume",
          standards: [
            {
              id: "5.MD.C.3",
              description: "Recognize volume as an attribute measured with unit cubes.",
            },
            { id: "5.MD.C.4", description: "Measure volumes by counting unit cubes." },
            {
              id: "5.MD.C.5",
              description: "Relate volume to multiplication and addition (V = l × w × h).",
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
          heading: "Graph points on the coordinate plane to solve problems",
          standards: [
            {
              id: "5.G.A.1",
              description: "Understand the coordinate plane and ordered pairs.",
            },
            {
              id: "5.G.A.2",
              description: "Graph points in the first quadrant to solve problems.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Classify two-dimensional figures by their properties",
          standards: [
            {
              id: "5.G.B.3",
              description: "Attributes of a category belong to all its subcategories.",
            },
            {
              id: "5.G.B.4",
              description: "Classify two-dimensional figures in a hierarchy.",
            },
          ],
        },
      ],
    },
  ],
};
