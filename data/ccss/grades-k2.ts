import type { Grade } from "./types";

/**
 * Kindergarten – Grade 2  (Early Elementary band).
 * Domains, clusters, and standard counts follow the official CCSS-M enumeration.
 */

export const gradeK: Grade = {
  id: "K",
  label: "Kindergarten",
  focus:
    "Counting, cardinality, and the meaning of addition and subtraction within 10.",
  band: "early",
  domains: [
    {
      code: "CC",
      name: "Counting & Cardinality",
      clusters: [
        {
          letter: "A",
          heading: "Know number names and the count sequence",
          standards: [
            { id: "K.CC.A.1", description: "Count to 100 by ones and by tens." },
            {
              id: "K.CC.A.2",
              description: "Count forward beginning from a given number.",
            },
            {
              id: "K.CC.A.3",
              description:
                "Write numerals 0–20 and represent a count of objects with a numeral.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Count to tell the number of objects",
          standards: [
            {
              id: "K.CC.B.4",
              description:
                "Connect counting to cardinality: the last number said tells how many.",
            },
            {
              id: "K.CC.B.5",
              description:
                "Count to answer “how many?” for up to 20 arranged (10 scattered) objects.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Compare numbers",
          standards: [
            {
              id: "K.CC.C.6",
              description:
                "Identify whether one group is greater than, less than, or equal to another (to 10).",
            },
            {
              id: "K.CC.C.7",
              description: "Compare two written numerals between 1 and 10.",
            },
          ],
        },
      ],
    },
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading:
            "Understand addition as putting together, and subtraction as taking apart",
          standards: [
            {
              id: "K.OA.A.1",
              description:
                "Represent addition and subtraction with objects, drawings, or equations.",
            },
            {
              id: "K.OA.A.2",
              description: "Solve addition and subtraction word problems within 10.",
            },
            {
              id: "K.OA.A.3",
              description:
                "Decompose numbers ≤10 into pairs in more than one way.",
            },
            {
              id: "K.OA.A.4",
              description:
                "Find the number that makes 10 when added to a given number.",
            },
            { id: "K.OA.A.5", description: "Fluently add and subtract within 5." },
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
          heading: "Work with numbers 11–19 to gain foundations for place value",
          standards: [
            {
              id: "K.NBT.A.1",
              description:
                "Compose and decompose 11–19 into ten ones and some further ones.",
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
          heading: "Describe and compare measurable attributes",
          standards: [
            {
              id: "K.MD.A.1",
              description:
                "Describe measurable attributes of objects, such as length or weight.",
            },
            {
              id: "K.MD.A.2",
              description:
                "Directly compare two objects with a common measurable attribute.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Classify objects and count objects in categories",
          standards: [
            {
              id: "K.MD.B.3",
              description:
                "Classify objects into categories; count and sort by count.",
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
          heading: "Identify and describe shapes",
          standards: [
            {
              id: "K.G.A.1",
              description:
                "Describe objects using shape names and relative positions.",
            },
            {
              id: "K.G.A.2",
              description: "Name shapes regardless of orientation or size.",
            },
            {
              id: "K.G.A.3",
              description:
                "Identify shapes as two-dimensional (flat) or three-dimensional (solid).",
            },
          ],
        },
        {
          letter: "B",
          heading: "Analyze, compare, create, and compose shapes",
          standards: [
            {
              id: "K.G.B.4",
              description: "Analyze and compare 2-D and 3-D shapes by attributes.",
            },
            {
              id: "K.G.B.5",
              description: "Model shapes in the world by building and drawing.",
            },
            {
              id: "K.G.B.6",
              description: "Compose simple shapes to form larger shapes.",
            },
          ],
        },
      ],
    },
  ],
};

export const grade1: Grade = {
  id: "1",
  label: "Grade 1",
  focus:
    "Addition and subtraction within 20, place value with tens and ones, and measuring length.",
  band: "early",
  domains: [
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading:
            "Represent and solve problems involving addition and subtraction",
          standards: [
            {
              id: "1.OA.A.1",
              description:
                "Use addition and subtraction within 20 to solve word problems.",
            },
            {
              id: "1.OA.A.2",
              description: "Solve word problems adding three whole numbers ≤20.",
            },
          ],
        },
        {
          letter: "B",
          heading:
            "Understand and apply properties of operations and the addition/subtraction relationship",
          standards: [
            {
              id: "1.OA.B.3",
              description:
                "Apply properties of operations as strategies to add and subtract.",
            },
            {
              id: "1.OA.B.4",
              description: "Understand subtraction as an unknown-addend problem.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Add and subtract within 20",
          standards: [
            {
              id: "1.OA.C.5",
              description: "Relate counting to addition and subtraction.",
            },
            {
              id: "1.OA.C.6",
              description: "Add and subtract within 20; be fluent within 10.",
            },
          ],
        },
        {
          letter: "D",
          heading: "Work with addition and subtraction equations",
          standards: [
            {
              id: "1.OA.D.7",
              description:
                "Understand the equal sign; decide whether equations are true.",
            },
            {
              id: "1.OA.D.8",
              description:
                "Find the unknown whole number in an addition or subtraction equation.",
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
          heading: "Extend the counting sequence",
          standards: [
            {
              id: "1.NBT.A.1",
              description: "Count to 120; read, write, and represent numerals.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Understand place value",
          standards: [
            {
              id: "1.NBT.B.2",
              description: "Understand two digits as tens and ones.",
            },
            {
              id: "1.NBT.B.3",
              description: "Compare two two-digit numbers using >, =, <.",
            },
          ],
        },
        {
          letter: "C",
          heading:
            "Use place value understanding and properties to add and subtract",
          standards: [
            {
              id: "1.NBT.C.4",
              description: "Add within 100 using place value and properties.",
            },
            {
              id: "1.NBT.C.5",
              description: "Mentally find 10 more or 10 less than a two-digit number.",
            },
            {
              id: "1.NBT.C.6",
              description: "Subtract multiples of 10 in the range 10–90.",
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
          heading: "Measure lengths indirectly and by iterating length units",
          standards: [
            {
              id: "1.MD.A.1",
              description: "Order three objects by length; compare lengths indirectly.",
            },
            {
              id: "1.MD.A.2",
              description: "Express an object's length as whole length units.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Tell and write time",
          standards: [
            {
              id: "1.MD.B.3",
              description: "Tell and write time in hours and half-hours.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Represent and interpret data",
          standards: [
            {
              id: "1.MD.C.4",
              description:
                "Organize, represent, and interpret data with up to three categories.",
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
              id: "1.G.A.1",
              description: "Distinguish defining from non-defining attributes of shapes.",
            },
            {
              id: "1.G.A.2",
              description: "Compose 2-D and 3-D shapes to create composite shapes.",
            },
            {
              id: "1.G.A.3",
              description:
                "Partition circles and rectangles into two and four equal shares.",
            },
          ],
        },
      ],
    },
  ],
};

export const grade2: Grade = {
  id: "2",
  label: "Grade 2",
  focus:
    "Place value to 1000, fluency in addition and subtraction within 100, and measurement.",
  band: "early",
  domains: [
    {
      code: "OA",
      name: "Operations & Algebraic Thinking",
      clusters: [
        {
          letter: "A",
          heading: "Represent and solve problems involving addition and subtraction",
          standards: [
            {
              id: "2.OA.A.1",
              description:
                "Add and subtract within 100 to solve one- and two-step word problems.",
            },
          ],
        },
        {
          letter: "B",
          heading: "Add and subtract within 20",
          standards: [
            {
              id: "2.OA.B.2",
              description: "Fluently add and subtract within 20 using mental strategies.",
            },
          ],
        },
        {
          letter: "C",
          heading:
            "Work with equal groups of objects to gain foundations for multiplication",
          standards: [
            {
              id: "2.OA.C.3",
              description: "Determine whether a group of objects is odd or even.",
            },
            {
              id: "2.OA.C.4",
              description: "Use repeated addition to find totals in rectangular arrays.",
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
          heading: "Understand place value",
          standards: [
            {
              id: "2.NBT.A.1",
              description: "Understand three digits as hundreds, tens, and ones.",
            },
            {
              id: "2.NBT.A.2",
              description: "Count within 1000; skip-count by 5s, 10s, and 100s.",
            },
            {
              id: "2.NBT.A.3",
              description: "Read and write numbers to 1000 in multiple forms.",
            },
            {
              id: "2.NBT.A.4",
              description: "Compare two three-digit numbers using >, =, <.",
            },
          ],
        },
        {
          letter: "B",
          heading:
            "Use place value understanding and properties to add and subtract",
          standards: [
            {
              id: "2.NBT.B.5",
              description: "Fluently add and subtract within 100.",
            },
            {
              id: "2.NBT.B.6",
              description: "Add up to four two-digit numbers.",
            },
            {
              id: "2.NBT.B.7",
              description: "Add and subtract within 1000 using models and place value.",
            },
            {
              id: "2.NBT.B.8",
              description: "Mentally add or subtract 10 or 100 to a number 100–900.",
            },
            {
              id: "2.NBT.B.9",
              description: "Explain why addition and subtraction strategies work.",
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
          heading: "Measure and estimate lengths in standard units",
          standards: [
            {
              id: "2.MD.A.1",
              description: "Measure length using appropriate tools.",
            },
            {
              id: "2.MD.A.2",
              description: "Measure the same object in two different units.",
            },
            {
              id: "2.MD.A.3",
              description: "Estimate lengths in inches, feet, centimeters, and meters.",
            },
            { id: "2.MD.A.4", description: "Compare the lengths of two objects." },
          ],
        },
        {
          letter: "B",
          heading: "Relate addition and subtraction to length",
          standards: [
            {
              id: "2.MD.B.5",
              description:
                "Use addition and subtraction within 100 to solve length problems.",
            },
            {
              id: "2.MD.B.6",
              description: "Represent whole numbers as lengths on a number line.",
            },
          ],
        },
        {
          letter: "C",
          heading: "Work with time and money",
          standards: [
            {
              id: "2.MD.C.7",
              description: "Tell and write time to the nearest five minutes.",
            },
            {
              id: "2.MD.C.8",
              description: "Solve word problems with dollars and cents.",
            },
          ],
        },
        {
          letter: "D",
          heading: "Represent and interpret data",
          standards: [
            {
              id: "2.MD.D.9",
              description: "Generate measurement data and show it on a line plot.",
            },
            {
              id: "2.MD.D.10",
              description:
                "Draw picture graphs and bar graphs; solve problems using the data.",
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
              id: "2.G.A.1",
              description: "Recognize and draw shapes by specified attributes.",
            },
            {
              id: "2.G.A.2",
              description:
                "Partition a rectangle into rows and columns of same-size squares.",
            },
            {
              id: "2.G.A.3",
              description: "Partition circles and rectangles into halves, thirds, fourths.",
            },
          ],
        },
      ],
    },
  ],
};
