#!/usr/bin/env node
/**
 * Interaction-copy QA gate for the ported CCSS interactive lessons — the lesson
 * core the California math lesson page renders.
 *
 * Static prose is covered by `audit-ccss-lesson-classes.mjs` and the assignment
 * contract test; this gate covers what those cannot see: the sentences the
 * lesson *builds from live control values*, which read correctly at the seed
 * value and break at the ends of their own sliders.
 *
 * Rules:
 *   1. plural agreement — a readout that interpolates a control whose minimum
 *      is 1 must not hard-code a plural noun ("1 rows", "1 apples")
 *   2. standard citation — a CCSS code named in a lesson's Math Check must be
 *      one the lesson is registered under in ccssTextbookRegistry
 *
 * SCOPE: rule 1 is a cheap pre-check, not the authority. It can only link a
 * readout to its control when the minimum is declared inline
 * (`<Stepper … min={1}>`, `<input min={1}>`). Lessons that wrap their controls
 * in a bespoke component — `ratio-double-number-line`'s `Control`, which floors
 * at 1 via `Math.max(1, value - 1)` — are invisible to it, and so are readouts
 * whose noun is separated from its value by markup. Those were found only by
 * rendering the page. `scripts/audit-us-ca-lesson-page-runtime.mjs` drives every
 * control to its floor in a browser and is the authoritative check; run it
 * before claiming this class is clean.
 *
 * Usage: node scripts/audit-ccss-lesson-interaction.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = process.env.CCSS_LESSON_DIR
  ? path.resolve(process.env.CCSS_LESSON_DIR)
  : path.join(root, "components/lesson/ccss/lessons");
const registrySource = readFileSync(path.join(root, "data/ccssTextbookRegistry.ts"), "utf8");
const mathCheckSource = readFileSync(path.join(root, "components/lesson/ccss/MathCheck.tsx"), "utf8");

const findings = [];
const coverage = {
  statefulButtons: 0,
  boundedStepperButtons: 0,
  mathCheckComponents: 0,
  axisNoQuadrantReadouts: 0,
  disclosureButtons: 0,
  glyphChoiceButtons: 0,
};
const coveredFiles = {
  statefulButtons: new Set(),
  boundedStepperButtons: new Set(),
};

function jsxAttributeMap(attributes, sourceFile) {
  return new Map(
    attributes.properties
      .filter((attribute) => ts.isJsxAttribute(attribute))
      .map((attribute) => [attribute.name.getText(sourceFile), attribute])
  );
}

function jsxAttributeText(attributes, name, sourceFile) {
  return attributes.get(name)?.initializer?.getText(sourceFile) ?? "";
}

function collectUseStatePairs(sourceFile) {
  const pairs = [];

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isArrayBindingPattern(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      /(^|\.)useState$/.test(node.initializer.expression.getText(sourceFile))
    ) {
      const [stateBinding, setterBinding] = node.name.elements;
      const state = stateBinding?.name?.getText(sourceFile);
      const setter = setterBinding?.name?.getText(sourceFile);
      if (state && setter) pairs.push({ state, setter });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return pairs;
}

function isInsideCollection(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isCallExpression(parent) &&
      ((ts.isPropertyAccessExpression(parent.expression) && parent.expression.name.text === "map") ||
        (ts.isPropertyAccessExpression(parent.expression) &&
          parent.expression.expression.getText() === "Array" &&
          parent.expression.name.text === "from"))
    ) {
      return true;
    }
  }
  return false;
}

function collectVisualAttributeText(node, sourceFile) {
  let text = "";

  function visit(current) {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const opening = ts.isJsxElement(current) ? current.openingElement : current;
      const attributes = jsxAttributeMap(opening.attributes, sourceFile);
      text += ` ${jsxAttributeText(attributes, "style", sourceFile)}`;
      text += ` ${jsxAttributeText(attributes, "className", sourceFile)}`;
    }
    ts.forEachChild(current, visit);
  }

  visit(node);
  return text;
}

function inspectStatefulButtons(file, source, sourceFile) {
  const statePairs = collectUseStatePairs(sourceFile);

  function visit(node) {
    const isButton =
      (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "button") ||
      (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "button");

    if (isButton) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const attributes = jsxAttributeMap(opening.attributes, sourceFile);
      const onClick = jsxAttributeText(attributes, "onClick", sourceFile);
      const ariaLabel = jsxAttributeText(attributes, "aria-label", sourceFile);
      const visualText = collectVisualAttributeText(node, sourceFile);
      const invokedPairs = statePairs.filter(({ setter }) => onClick.includes(setter));
      const directStateStyling = invokedPairs.some(({ state }) =>
        new RegExp(`\\b${state}\\b`).test(visualText)
      );
      const mappedDerivedStyling =
        isInsideCollection(node) && invokedPairs.length > 0 && visualText.includes("?");

      if (directStateStyling || mappedDerivedStyling) {
        coverage.statefulButtons += 1;
        coveredFiles.statefulButtons.add(file);
        const isBooleanToggle = invokedPairs.some(({ setter }) =>
          new RegExp(`${setter}\\(\\(\\w+\\)\\s*=>\\s*!\\w+\\)`).test(onClick.replace(/\\s+/g, ""))
        );
        const hasPressedState = attributes.has("aria-pressed");
        const hasDisclosureState = attributes.has("aria-expanded");

        if ((!isBooleanToggle && !hasPressedState) || (isBooleanToggle && !hasPressedState && !hasDisclosureState)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
          findings.push({
            rule: "button-selected-state",
            where: `${file}:${line + 1}`,
            detail: isBooleanToggle
              ? "stateful toggle has visual state but no aria-pressed/aria-expanded"
              : "current choice is visually styled but the button has no aria-pressed"
          });
        }
      }

      if (
        /(?:Math\.(?:min|max)|\bclamp)\s*\(/.test(onClick) &&
        /(?:Increase|Decrease)/.test(ariaLabel)
      ) {
        coverage.boundedStepperButtons += 1;
        coveredFiles.boundedStepperButtons.add(file);
        if (!attributes.has("disabled")) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
          findings.push({
            rule: "bounded-stepper-disabled-state",
            where: `${file}:${line + 1}`,
            detail: "bounded increase/decrease control clamps to its current value but never becomes disabled"
          });
        }
      }

      if (attributes.has("aria-expanded")) {
        coverage.disclosureButtons += 1;
        const ariaControls = jsxAttributeText(attributes, "aria-controls", sourceFile);
        const controlledIds = [...ariaControls.matchAll(/\b[A-Za-z]\w*Id\b/g)].map((match) => match[0]);
        const missingIds = controlledIds.filter((id) => !new RegExp(`id=\\{${id}\\}`).test(source));
        if (!ariaControls || controlledIds.length === 0 || missingIds.length > 0) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
          findings.push({
            rule: "disclosure-controls",
            where: `${file}:${line + 1}`,
            detail: !ariaControls
              ? "aria-expanded disclosure has no aria-controls"
              : `aria-controls does not resolve to stable useId-backed target(s): ${missingIds.join(", ") || ariaControls}`
          });
        }
      }

      const buttonSource = node.getText(sourceFile);
      const hasLiteralMultiplyDivideGlyphs = buttonSource.includes('"×"') && buttonSource.includes('"÷"');
      const rendersMultiplyDivideSymbolVariable =
        buttonSource.includes("{sym}") &&
        source.includes('["mul", "×"]') &&
        source.includes('["div", "÷"]');
      if (onClick && (hasLiteralMultiplyDivideGlyphs || rendersMultiplyDivideSymbolVariable)) {
        coverage.glyphChoiceButtons += 1;
        if (!/(?:Multiply|Multiplication)/.test(ariaLabel) || !/(?:Divide|Division)/.test(ariaLabel)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
          findings.push({
            rule: "glyph-choice-name",
            where: `${file}:${line + 1}`,
            detail: "multiply/divide glyph choices need descriptive Multiplication/Division accessible names"
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

// Nouns whose singular is the bare word minus a trailing "s". Deliberately a
// closed list: an open-ended "word ending in s" rule flags too much prose.
const NOUNS = [
  "cubes", "counters", "squares", "units", "sides", "corners", "parts", "pieces",
  "rows", "columns", "shares", "tens", "ones", "hundreds", "groups", "objects",
  "items", "apples", "spoons", "cups", "batches", "steps", "jumps", "minutes",
  "hours", "degrees", "points", "packs", "pens", "triangles", "circles",
  "rectangles", "blocks", "tiles", "dots", "bars", "students", "vans", "seats",
  "coins", "cents", "miles", "copies", "layers", "faces", "edges", "terms",
  "factors", "multiples", "solutions", "roots", "trials", "cookies", "rods"
].join("|");

// "1 times x" is idiomatic multiplication language, so "times" is not listed.

for (const file of readdirSync(lessonDir).sort()) {
  if (!file.endsWith(".tsx")) continue;
  const src = readFileSync(path.join(lessonDir, file), "utf8");
  const lines = src.split("\n");
  const sourceFile = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  inspectStatefulButtons(file, src, sourceFile);

  if (file === "four-quadrant-plane.tsx") {
    coverage.axisNoQuadrantReadouts += 1;
    const legacyInlineContract =
      /quadrant\s*===\s*"none"\s*\?[\s\S]{0,400}on an axis and in no quadrant[\s\S]{0,400}Quadrant\s*\{quadrant\}/.test(src);
    const pointLocationContract = [
      "const location = pointLocation(p)",
      "is <strong>{location}</strong>",
      'if (p.x === 0 && p.y === 0) return "at the origin, on both axes and in no quadrant"',
      'if (p.y === 0) return "on the x-axis and in no quadrant"',
      'if (p.x === 0) return "on the y-axis and in no quadrant"'
    ].every((fragment) => src.includes(fragment));
    if (!legacyInlineContract && !pointLocationContract) {
      findings.push({
        rule: "axis-no-quadrant-copy",
        where: file,
        detail: "visible point readout does not handle an axis point as being in no quadrant"
      });
    }
  }

  // --- 1. plural agreement on controls that bottom out at 1 ---------------
  const oneVars = new Set();
  const collect = (re) => {
    for (const m of src.matchAll(re)) oneVars.add(m[1]);
  };
  collect(/<Stepper[^>]*?value=\{(\w+)\}[^>]*?min=\{1\}/gs);
  collect(/<Stepper[^>]*?min=\{1\}[^>]*?value=\{(\w+)\}/gs);
  collect(/min=\{1\}[^\n]*?value=\{(\w+)\}/g);
  collect(/value=\{(\w+)\}[^\n]*?min=\{1\}/g);

  for (const variable of [...oneVars].sort()) {
    const readout = new RegExp(
      `\\{${variable}\\}(?:\\{" "\\})?\\s*(?:</strong>\\s*(?:\\{" "\\})?\\s*)?(${NOUNS})\\b`,
      "g"
    );
    const templated = new RegExp(`\\$\\{${variable}\\}\\s+(${NOUNS})\\b`, "g");
    const guard = new RegExp(`${variable}\\s*===\\s*1`);

    lines.forEach((line, index) => {
      if (guard.test(line)) return;
      for (const re of [readout, templated]) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          findings.push({
            rule: "plural-agreement",
            where: `${file}:${index + 1}`,
            detail: `"${variable}" bottoms out at 1 but the readout hard-codes "${m[1]}"`
          });
        }
      }
    });
  }

  // --- 2. Math Check cites only standards the lesson is registered under ---
  const start = src.indexOf("<MathCheck");
  if (start < 0) {
    findings.push({ rule: "missing-math-check", where: file, detail: "no MathCheck block" });
    continue;
  }
  const mathCheck = src.slice(start, src.indexOf("</MathCheck>", start));
  const cited = new Set(
    [...mathCheck.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[1])
  );
  if (!cited.size) continue;

  const slug = file.replace(/\.tsx$/, "");
  const entry = new RegExp(`"${slug}":\\s*\\{[\\s\\S]*?standardIds:\\s*\\[([^\\]]*)\\]`).exec(registrySource);
  if (!entry) continue;
  const declared = [...entry[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  for (const code of [...cited].sort()) {
    const consistent = declared.some((d) => d === code || d.startsWith(code) || code.startsWith(d));
    if (!consistent) {
      findings.push({
        rule: "standard-citation",
        where: file,
        detail: `Math Check cites ${code}; lesson is registered under ${declared.join(", ") || "(none)"}`
      });
    }
  }
}

const total = readdirSync(lessonDir).filter((f) => f.endsWith(".tsx")).length;

coverage.mathCheckComponents += 1;
if (/<aside\b/.test(mathCheckSource) || !/<section\b/.test(mathCheckSource) || !/<h3\b/.test(mathCheckSource)) {
  findings.push({
    rule: "math-check-structure",
    where: "components/lesson/ccss/MathCheck.tsx",
    detail: "MathCheck must be a non-landmark section with a real h3, not a complementary aside"
  });
}

console.log(`audit-ccss-lesson-interaction: ${total} interactive lessons`);
console.log(`  stateful choice/toggle buttons inspected: ${coverage.statefulButtons} across ${coveredFiles.statefulButtons.size} files`);
console.log(`  bounded stepper buttons inspected: ${coverage.boundedStepperButtons} across ${coveredFiles.boundedStepperButtons.size} files`);
console.log(`  shared MathCheck components inspected: ${coverage.mathCheckComponents}`);
console.log(`  axis/no-quadrant readouts inspected: ${coverage.axisNoQuadrantReadouts}`);
console.log(`  aria-expanded disclosures inspected: ${coverage.disclosureButtons}`);
console.log(`  multiply/divide glyph choices inspected: ${coverage.glyphChoiceButtons}`);
if (coverage.statefulButtons === 0) {
  findings.push({
    rule: "coverage",
    where: "components/lesson/ccss/lessons",
    detail: "stateful button audit inspected zero controls"
  });
}
if (coverage.boundedStepperButtons === 0) {
  findings.push({
    rule: "coverage",
    where: "components/lesson/ccss/lessons",
    detail: "bounded stepper audit inspected zero controls"
  });
}
if (coverage.mathCheckComponents === 0) {
  findings.push({
    rule: "coverage",
    where: "components/lesson/ccss/MathCheck.tsx",
    detail: "MathCheck structure audit inspected zero components"
  });
}
if (coverage.axisNoQuadrantReadouts === 0) {
  findings.push({
    rule: "coverage",
    where: "four-quadrant-plane.tsx",
    detail: "axis/no-quadrant copy audit inspected zero readouts"
  });
}
if (coverage.disclosureButtons === 0) {
  findings.push({
    rule: "coverage",
    where: "components/lesson/ccss/lessons",
    detail: "aria-expanded disclosure audit inspected zero controls"
  });
}
if (coverage.glyphChoiceButtons === 0) {
  findings.push({
    rule: "coverage",
    where: "components/lesson/ccss/lessons",
    detail: "multiply/divide glyph-choice audit inspected zero controls"
  });
}
if (!findings.length) {
  console.log("✓ no interaction-copy defects");
  process.exit(0);
}

const byRule = new Map();
for (const finding of findings) {
  byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
}
for (const [rule, list] of [...byRule].sort()) {
  console.log(`\n${rule}: ${list.length}`);
  for (const finding of list) console.log(`  ${finding.where} — ${finding.detail}`);
}
console.log(`\n✗ ${findings.length} interaction-copy defect(s)`);
process.exit(1);
