import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathpixStrokePayload,
  isConfidentHandwritingCandidate,
  isEmptyHandwritingRecognitionText,
  normalizeHandwritingText,
  recognizeLocalNumericDraft,
  sanitizeHandwritingStrokes,
  type HandwritingStroke
} from "./handwritingRecognition";

const digit25Strokes: HandwritingStroke[] = [
  {
    tool: "pen",
    points: [
      { x: 180, y: 80 },
      { x: 262, y: 58 },
      { x: 353, y: 64 },
      { x: 398, y: 112 },
      { x: 330, y: 158 },
      { x: 182, y: 234 },
      { x: 410, y: 242 }
    ]
  },
  {
    tool: "pen",
    points: [
      { x: 774, y: 70 },
      { x: 592, y: 70 },
      { x: 592, y: 148 },
      { x: 717, y: 146 },
      { x: 797, y: 188 },
      { x: 774, y: 236 },
      { x: 672, y: 260 },
      { x: 581, y: 246 }
    ]
  }
];

const ambiguousScreenshotLike25Strokes: HandwritingStroke[] = [
  digit25Strokes[0],
  {
    tool: "pen",
    points: [
      { x: 830, y: 83 },
      { x: 582, y: 152 },
      { x: 589, y: 202 },
      { x: 819, y: 192 },
      { x: 736, y: 181 },
      { x: 692, y: 245 },
      { x: 656, y: 236 }
    ]
  }
];

const screenshotLike23Strokes: HandwritingStroke[] = [
  {
    tool: "pen",
    points: [
      { x: 813, y: 880 },
      { x: 830, y: 850 },
      { x: 865, y: 835 },
      { x: 925, y: 826 },
      { x: 980, y: 830 },
      { x: 1018, y: 865 },
      { x: 1018, y: 900 },
      { x: 965, y: 975 },
      { x: 900, y: 1025 },
      { x: 860, y: 1038 },
      { x: 1024, y: 1038 }
    ]
  },
  {
    tool: "pen",
    points: [
      { x: 1105, y: 812 },
      { x: 1200, y: 800 },
      { x: 1290, y: 785 },
      { x: 1362, y: 785 },
      { x: 1374, y: 825 },
      { x: 1320, y: 895 },
      { x: 1255, y: 908 },
      { x: 1220, y: 911 },
      { x: 1300, y: 906 },
      { x: 1350, y: 944 },
      { x: 1376, y: 990 },
      { x: 1370, y: 1020 },
      { x: 1300, y: 1049 },
      { x: 1160, y: 1045 }
    ]
  }
];

const closeSeparated23Strokes: HandwritingStroke[] = [
  {
    tool: "pen",
    points: [
      { x: 407, y: 440 },
      { x: 415, y: 425 },
      { x: 433, y: 417 },
      { x: 463, y: 413 },
      { x: 490, y: 415 },
      { x: 509, y: 433 },
      { x: 509, y: 450 },
      { x: 483, y: 488 },
      { x: 450, y: 513 },
      { x: 430, y: 519 },
      { x: 512, y: 519 }
    ]
  },
  {
    tool: "pen",
    points: [
      { x: 542, y: 406 },
      { x: 590, y: 400 },
      { x: 635, y: 392 },
      { x: 671, y: 392 },
      { x: 677, y: 412 },
      { x: 650, y: 448 },
      { x: 618, y: 454 },
      { x: 600, y: 456 },
      { x: 640, y: 453 },
      { x: 665, y: 472 },
      { x: 678, y: 495 },
      { x: 675, y: 510 },
      { x: 640, y: 525 },
      { x: 570, y: 522 }
    ]
  }
];

const browserDrawnClose23Strokes: HandwritingStroke[] = [
  {
    tool: "pen",
    points: [
      { x: 275.63, y: 97.92 },
      { x: 286.88, y: 80.64 },
      { x: 315, y: 72 },
      { x: 376.88, y: 69.12 },
      { x: 427.5, y: 72 },
      { x: 455.63, y: 89.28 },
      { x: 455.63, y: 106.56 },
      { x: 405, y: 149.76 },
      { x: 354.38, y: 187.2 },
      { x: 303.75, y: 207.36 },
      { x: 461.25, y: 207.36 }
    ]
  },
  {
    tool: "pen",
    points: [
      { x: 489.38, y: 63.36 },
      { x: 562.5, y: 57.6 },
      { x: 630, y: 51.84 },
      { x: 680.63, y: 51.84 },
      { x: 691.88, y: 72 },
      { x: 658.13, y: 115.2 },
      { x: 613.13, y: 135.36 },
      { x: 579.38, y: 144 },
      { x: 630, y: 141.12 },
      { x: 675, y: 161.28 },
      { x: 697.5, y: 190.08 },
      { x: 691.88, y: 207.36 },
      { x: 641.25, y: 224.64 },
      { x: 562.5, y: 221.76 }
    ]
  }
];

const normal4Stroke: HandwritingStroke[] = [
  {
    tool: "pen",
    points: [
      { x: 278, y: 108 },
      { x: 218, y: 162 },
      { x: 290, y: 162 },
      { x: 278, y: 108 },
      { x: 278, y: 194 }
    ]
  }
];

test("local handwriting recognizer reads clear separated 25", () => {
  const result = recognizeLocalNumericDraft(digit25Strokes);

  assert.equal(result?.text, "25");
  assert.equal(result?.provider, "local");
  assert.equal(result?.accepted, true);
});

test("local handwriting recognizer sends screenshot-like 25 vs 6 ambiguity to review", () => {
  const result = recognizeLocalNumericDraft(ambiguousScreenshotLike25Strokes);

  assert.equal(result?.text, "26");
  assert.equal(result?.provider, "local");
  assert.equal(result?.accepted, false);
  assert.equal(isConfidentHandwritingCandidate(result, 0.7), false);
  assert.ok((result?.confidence ?? 1) < 0.7);
});

test("local handwriting recognizer reads screenshot-like 23", () => {
  const result = recognizeLocalNumericDraft(screenshotLike23Strokes);

  assert.equal(result?.text, "23");
  assert.equal(result?.provider, "local");
  assert.equal(result?.accepted, true);
});

test("local handwriting recognizer splits close separated 23 instead of collapsing to 4", () => {
  const result = recognizeLocalNumericDraft(closeSeparated23Strokes);

  assert.equal(result?.text, "23");
  assert.notEqual(result?.text, "4");
});

test("local handwriting recognizer reads browser-drawn close 23", () => {
  const result = recognizeLocalNumericDraft(browserDrawnClose23Strokes);

  assert.equal(result?.text, "23");
  assert.notEqual(result?.text, "4");
});

test("local handwriting recognizer keeps normal handwritten 4 as one digit", () => {
  const result = recognizeLocalNumericDraft(normal4Stroke);

  assert.equal(result?.text, "4");
});

test("handwriting stroke sanitizer strips invalid points and builds Mathpix payload", () => {
  const sanitized = sanitizeHandwritingStrokes([
    {
      tool: "pen",
      points: [
        { x: 1.234, y: 9.876 },
        { x: Number.POSITIVE_INFINITY, y: 4 },
        { x: 3, y: 5 }
      ]
    },
    { tool: "eraser", points: [{ x: 10, y: 12 }] },
    { tool: "pen", points: [] },
    "bad"
  ]);

  assert.deepEqual(sanitized, [
    {
      tool: "pen",
      points: [
        { x: 1.23, y: 9.88 },
        { x: 3, y: 5 }
      ]
    },
    {
      tool: "eraser",
      points: [{ x: 10, y: 12 }]
    }
  ]);
  assert.deepEqual(buildMathpixStrokePayload(sanitized), {
    strokes: {
      strokes: {
        x: [[1.23, 3]],
        y: [[9.88, 5]]
      }
    }
  });
});

test("handwriting text normalization makes provider output checker-friendly", () => {
  assert.equal(normalizeHandwritingText("\\frac{3}{5}"), "3/5");
  assert.equal(normalizeHandwritingText("\\( 5 x \\)"), "5x");
  assert.equal(normalizeHandwritingText("x^{2} + 2x"), "x^2+2x");
  assert.equal(normalizeHandwritingText("\\mathbf{y}=2\\mathbf{x}+1"), "y=2x+1");
  assert.equal(normalizeHandwritingText("\\mathrm{sqrt}(16){=}4"), "sqrt(16)=4");
  assert.equal(normalizeHandwritingText("\\sin 30 = 1/2"), "sin30=1/2");
  assert.equal(normalizeHandwritingText("\\sin30=1/2"), "sin30=1/2");
  assert.equal(normalizeHandwritingText("x^Л2+4x"), "x^2+4x");
  assert.equal(normalizeHandwritingText("\\mathrm{a^\\Lambda2-b^\\Lambda2}"), "a^2-b^2");
  assert.equal(normalizeHandwritingText("\\mathrm{a^{\\Lambda}2-b^{\\Lambda}2}"), "a^2-b^2");
  assert.equal(normalizeHandwritingText("\\mathrm{x}^{\\Lambda}2+4\\mathrm{x}"), "x^2+4x");
  assert.equal(normalizeHandwritingText("a^{\\wedge}2-b^{\\wedge}2"), "a^2-b^2");
  assert.equal(normalizeHandwritingText("a^\\wedge2-b^\\wedge2"), "a^2-b^2");
  assert.equal(normalizeHandwritingText("2\\mathrm{x}+3=9"), "2x+3=9");
  assert.equal(normalizeHandwritingText("\\mathrm{m=4}"), "m=4");
});

test("low-confidence SimpleTex-style output normalizes as a reviewable suggestion", () => {
  const text = normalizeHandwritingText("a^{\\wedge}2-b^{\\wedge}2");

  assert.equal(text, "a^2-b^2");
  assert.equal(text.includes("\\wedge"), false);
  assert.equal(isConfidentHandwritingCandidate({ text, confidence: 0.681 }, 0.7), false);
});

test("handwriting empty provider markers are treated as non-results", () => {
  assert.equal(isEmptyHandwritingRecognitionText("[EMPTY]"), true);
  assert.equal(isEmptyHandwritingRecognitionText(" [docimg] "), true);
  assert.equal(isEmptyHandwritingRecognitionText("23"), false);
});
