#!/usr/bin/env node
// Content-quality audit for the live US math practice banks (CA, AR, FL).
//
// Coverage and per-pack mode:
//   - us-ca-k5-knowledge-point-practice-v1      authored  (K-G5 knowledge-point practice)
//   - ccss-textbook-practice-v1                 authored  (CCSS interactive-lesson practice, K-G12)
//   - us-ca-math-g6-g12-generated-bank-v2-1500  templated (every item carries generationTemplate)
//   - us-ar-math-k-g5-generated-bank-v1-1500    inferred  (free-form; solvers matched by prompt shape)
//   - us-ar-math-g6-g12-generated-bank-v1-1500  inferred
//   - us-fl-math-middle-school-textbooks-v1     mathfact  (each problem carries a machine-checkable mathFact)
//
// Checks:
//   PASS A (all packs)  structural key integrity: answer/options/acceptedAnswers
//                       coherence, duplicate or multi-correct options.
//   PASS B (templated)  independent re-solve of every generated item FROM THE
//                       STUDENT-VISIBLE PROMPT TEXT (per-template parsers), so
//                       prompt/parameter drift is caught, not just key drift.
//        (inferred)     the same solvers matched by prompt shape; an item is only
//                       judged when every matching solver agrees, and a
//                       disagreement with the key is P1 (review), not P0.
//        (mathfact)     mathFact.expression is evaluated and must equal
//                       mathFact.expected, mathFact.actual, and the answer key.
//   PASS C (all packs)  arithmetic claims inside explanations ("a op b = c")
//                       re-verified exactly.
//
// Usage: node scripts/audit-us-math-item-quality.mjs [--json out.json]
// Exits non-zero when any P0/P1 finding exists so it can run as a gate.

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);

// Flattens the FL textbook pack's books -> chapters -> practiceSets -> problems
// into question-shaped rows the shared passes understand.
function floridaQuestions(pack) {
  const questions = [];
  for (const book of pack.books) {
    for (const chapter of book.chapters) {
      for (const practiceSet of chapter.practiceSets ?? []) {
        for (const problem of practiceSet.problems ?? []) {
          questions.push({
            id: `${chapter.id}:${practiceSet.id}:${problem.id}`,
            batch: "us-fl-ms-v1",
            type: "fill-in",
            prompt: { en: problem.prompt },
            answer: problem.answer,
            acceptedAnswers: problem.acceptedAnswers ?? [],
            explanation: { en: problem.explanation },
            mathFact: problem.mathFact
          });
        }
      }
    }
  }
  return questions;
}

const flPack = require("../data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json");
const packs = [
  {
    name: "us-ca-k5-knowledge-point-practice-v1",
    mode: "authored",
    pack: require("../data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json")
  },
  {
    name: "ccss-textbook-practice-v1",
    mode: "authored",
    pack: require("../data/generated-content/ccss-textbook-practice-v1/question-pack.json")
  },
  {
    name: "us-ca-math-g6-g12-generated-bank-v2-1500",
    mode: "templated",
    pack: require("../data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json")
  },
  {
    name: "us-ar-math-k-g5-generated-bank-v1-1500",
    mode: "inferred",
    pack: require("../data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json")
  },
  {
    name: "us-ar-math-g6-g12-generated-bank-v1-1500",
    mode: "inferred",
    pack: require("../data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json")
  },
  {
    name: "us-fl-math-middle-school-textbooks-v1",
    mode: "mathfact",
    pack: flPack,
    questions: floridaQuestions(flPack)
  }
];

const findings = [];
const seenFindings = new Set();
function flag(question, pass, severity, issue, detail) {
  const key = `${question.id}|${issue}|${detail}`;
  if (seenFindings.has(key)) return;
  seenFindings.add(key);
  findings.push({ pack: question.batch, id: question.id, pass, severity, issue, detail });
}

// ---------- numeric helpers ----------

function normalizePromptText(text) {
  return text
    .replace(/[−–—]/g, "-") // unicode minus, en dash, em dash
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1") // thousands separators
    .replace(/\s+/g, " ")
    .trim();
}

// Parses "3", "-4.5", "3/4", "-5/2", "$12", "12 cm" -> number (or null).
// stripPrefix controls whether variable prefixes like "x =" are removed; keep
// them when comparing MC options, where "x = 0" and "y = 0" are distinct claims.
function parseNumeric(raw, { stripPrefix = true } = {}) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[−–—]/g, "-");
  if (stripPrefix) s = s.replace(/^(?:[a-z]|f\(-?\d+\)|p̂|ŷ)\s*=\s*/i, "");
  else if (/=/.test(s)) return null;
  s = s.replace(/^\$/, "").replace(/,/g, "");
  s = s.replace(
    /\s*(cm\^?3|cm\^?2|cm³|cm²|m\^?2|m²|cm|mm|km\/h|km|m\/s|mph|miles per hour|meters per second|square meters|cubic centimeters|units|unit|tickets|ticket|degrees|°|dollars|hours|hour|marbles|students|bacteria|cards|counters)\s*\.?$/i,
    ""
  );
  s = s.trim();
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  if (/^-?\d+(?:\.\d+)?(?:e-?\d+)?$/.test(s)) return Number(s);
  return null;
}

// Looser variant for free-form banks: also accepts "6 cups" / "$25 total" —
// a single number followed by arbitrary unit words. Returns null for anything
// structured ("3:5", "x = 2 or 3") so unjudgeable answers are skipped.
function parseNumericLoose(raw) {
  const strict = parseNumeric(raw);
  if (strict != null) return strict;
  const m = String(raw ?? "")
    .trim()
    .replace(/−/g, "-")
    .match(/^\$?(-?\d+(?:\.\d+)?)(?:\s+[A-Za-z][A-Za-z .\/²³]*)?$/);
  return m ? Number(m[1]) : null;
}

function nearlyEqual(a, b, tol = 1e-6) {
  if (a === b) return true;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function isSimplestFraction(raw) {
  const m = String(raw).trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!m) return true; // integers/decimals: nothing to simplify
  return gcd(Number(m[1]), Number(m[2])) === 1;
}

// ---------- PASS B: per-template independent solvers (G6-G12) ----------
// Each solver re-derives the answer from prompt.en (normalized). Returning
// null means "could not parse" and the item is flagged for manual review.

const F = String.raw;
function rx(pattern) {
  return new RegExp(pattern);
}
function num(m, i) {
  return Number(m[i]);
}
function signed(op, v) {
  return op === "-" ? -v : v;
}

const templateSolvers = {
  t_amplitude(p) {
    const m = p.match(rx(F`y = (-?\d+(?:\.\d+)?) ?sin\((-?\d+(?:\.\d+)?)x\)`));
    return m ? Math.abs(num(m, 1)) : null;
  },
  t_arc_length(p) {
    const m = p.match(rx(F`radius (\d+(?:\.\d+)?) cm.*central angle of (\d+(?:\.\d+)?)`));
    return m ? (num(m, 2) / 360) * 2 * 3.14 * num(m, 1) : null;
  },
  t_avg_rate_of_change(p) {
    const m = p.match(rx(F`f\(x\) = x\^2, .*from x = (-?\d+) to x = (-?\d+)`));
    return m ? num(m, 1) + num(m, 2) : null; // (b^2-a^2)/(b-a) = a+b
  },
  t_break_even(p) {
    const m = p.match(
      rx(F`sells for \$(\d+(?:\.\d+)?) per unit; variable cost is \$(\d+(?:\.\d+)?) per unit and fixed costs are \$(\d+(?:\.\d+)?)`)
    );
    return m ? num(m, 3) / (num(m, 1) - num(m, 2)) : null;
  },
  t_circle_circumference(p) {
    const m = p.match(rx(F`diameter of (\d+(?:\.\d+)?) cm`));
    if (m) return 3.14 * num(m, 1);
    const r = p.match(rx(F`radius of (\d+(?:\.\d+)?) cm`));
    return r ? 2 * 3.14 * num(r, 1) : null;
  },
  t_compare_integers(p) {
    const m = p.match(rx(F`(least|greatest): (-?\d+), (-?\d+), or (-?\d+)`));
    if (!m) return null;
    const values = [num(m, 2), num(m, 3), num(m, 4)];
    return m[1] === "least" ? Math.min(...values) : Math.max(...values);
  },
  t_conditional_probability(p) {
    const m = p.match(rx(F`(\d+) students play a sport, and (\d+) of those also play music`));
    return m ? num(m, 2) / num(m, 1) : null;
  },
  t_consecutive_integers(p) {
    const m = p.match(rx(F`sum of three consecutive integers is (-?\d+)\. What is the (middle|largest|smallest)`));
    if (!m) return null;
    const mid = num(m, 1) / 3;
    return m[2] === "middle" ? mid : m[2] === "largest" ? mid + 1 : mid - 1;
  },
  t_constant_of_proportionality(p) {
    const m = p.match(rx(F`y = (-?\d+(?:\.\d+)?) when x = (-?\d+(?:\.\d+)?)`));
    return m ? num(m, 1) / num(m, 2) : null;
  },
  t_discriminant(p) {
    const m = p.match(rx(F`discriminant of (\d*)x\^2 ([+-]) (\d+)x ([+-]) (\d+) = 0`));
    if (!m) return null;
    const a = m[1] ? Number(m[1]) : 1;
    const b = signed(m[2], num(m, 3));
    const c = signed(m[4], num(m, 5));
    return b * b - 4 * a * c;
  },
  t_distance_points(p) {
    const m = p.match(rx(F`points \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)`));
    return m ? Math.hypot(num(m, 3) - num(m, 1), num(m, 4) - num(m, 2)) : null;
  },
  t_distribute_equation(p) {
    const m = p.match(rx(F`(\d+)\(x ([+-]) (\d+)\) = (-?\d+)`));
    return m ? num(m, 4) / num(m, 1) - signed(m[2], num(m, 3)) : null;
  },
  t_doubling_growth(p) {
    const m = p.match(rx(F`doubles every (\d+) hours\. It starts at (\d+)\..*after (\d+) hours`));
    return m ? num(m, 2) * 2 ** (num(m, 3) / num(m, 1)) : null;
  },
  t_evaluate_cubic(p) {
    const m = p.match(rx(F`p\(x\) = x\^3 ([+-]) (\d+)x at x = (-?\d+)`));
    return m ? num(m, 3) ** 3 + signed(m[1], num(m, 2)) * num(m, 3) : null;
  },
  t_evaluate_linear_expr(p) {
    const m = p.match(rx(F`expression (\d+)x ([+-]) (\d+) when x = (-?\d+)`));
    return m ? num(m, 1) * num(m, 4) + signed(m[2], num(m, 3)) : null;
  },
  t_evaluate_y_mx_b(p) {
    const m = p.match(rx(F`y = (-?\d+)x ([+-]) (\d+), what is the value of y when x = (-?\d+)`));
    return m ? num(m, 1) * num(m, 4) + signed(m[2], num(m, 3)) : null;
  },
  t_expected_value(p) {
    const m = p.match(rx(F`ticket costs \$(\d+(?:\.\d+)?)\. One of every (\d+) tickets wins \$(\d+(?:\.\d+)?)`));
    return m ? num(m, 3) / num(m, 2) - num(m, 1) : null;
  },
  t_exterior_angle(p) {
    const m = p.match(rx(F`remote interior angles measure (\d+)° and (\d+)°`));
    return m ? num(m, 1) + num(m, 2) : null;
  },
  t_fraction_product(p) {
    const m = p.match(rx(F`(\d+)/(\d+) \* (\d+)/(\d+)`));
    return m ? (num(m, 1) * num(m, 3)) / (num(m, 2) * num(m, 4)) : null;
  },
  t_fx_evaluate(p) {
    const m = p.match(rx(F`f\(x\) = (\d+)x ([+-]) (\d+), find f\((-?\d+)\)`));
    return m ? num(m, 1) * num(m, 4) + signed(m[2], num(m, 3)) : null;
  },
  t_fx_solve(p) {
    const m = p.match(rx(F`f\(x\) = (\d+)x ([+-]) (\d+), solve f\(x\) = (-?\d+)`));
    return m ? (num(m, 4) - signed(m[2], num(m, 3))) / num(m, 1) : null;
  },
  t_hypotenuse(p) {
    const m = p.match(rx(F`legs of (\d+(?:\.\d+)?) cm and (\d+(?:\.\d+)?) cm`));
    return m ? Math.hypot(num(m, 1), num(m, 2)) : null;
  },
  t_integer_chain(p) {
    const m = p.match(rx(F`Evaluate: (-?\d+) - \(-(\d+)\) \+ \(-(\d+)\)`));
    return m ? num(m, 1) + num(m, 2) - num(m, 3) : null;
  },
  t_inverse_linear(p) {
    const m = p.match(rx(F`f\(x\) = (\d+)x ([+-]) (\d+)\. What is f⁻¹\((-?\d+)\)`));
    return m ? (num(m, 4) - signed(m[2], num(m, 3))) / num(m, 1) : null;
  },
  t_kmh_to_ms(p) {
    const m = p.match(rx(F`Convert (\d+(?:\.\d+)?) km/h`));
    return m ? (num(m, 1) * 1000) / 3600 : null;
  },
  t_larger_root(p) {
    const m = p.match(rx(F`x\^2 ([+-]) (\d+)x ([+-]) (\d+) = 0\. What is the (larger|smaller) root`));
    if (!m) return null;
    const b = signed(m[1], num(m, 2));
    const c = signed(m[3], num(m, 4));
    const disc = b * b - 4 * c;
    if (disc < 0) return null;
    const r1 = (-b + Math.sqrt(disc)) / 2;
    const r2 = (-b - Math.sqrt(disc)) / 2;
    return m[5] === "larger" ? Math.max(r1, r2) : Math.min(r1, r2);
  },
  t_log_value(p) {
    const m = p.match(rx(F`log_(\d+)\((\d+)\)`));
    if (!m) return null;
    const v = Math.log(num(m, 2)) / Math.log(num(m, 1));
    return Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v;
  },
  t_marble_probability(p) {
    const m = p.match(rx(F`(\d+) marbles and (\d+) of them are red`));
    return m ? num(m, 2) / num(m, 1) : null;
  },
  t_mean_of_list(p) {
    const m = p.match(rx(F`data values ((?:-?\d+(?:\.\d+)?, )+-?\d+(?:\.\d+)?)\. What is the mean`));
    if (!m) return null;
    const values = m[1].split(",").map((v) => Number(v.trim()));
    return values.reduce((total, v) => total + v, 0) / values.length;
  },
  t_median_of_list(p) {
    const m = p.match(rx(F`data set ((?:-?\d+(?:\.\d+)?, )+-?\d+(?:\.\d+)?)`));
    if (!m) return null;
    const values = m[1]
      .split(",")
      .map((v) => Number(v.trim()))
      .sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  },
  t_midpoint(p) {
    const m = p.match(rx(F`([xy])-coordinate of the midpoint of the segment from \((-?\d+), (-?\d+)\) to \((-?\d+), (-?\d+)\)`));
    if (!m) return null;
    return m[1] === "x" ? (num(m, 2) + num(m, 4)) / 2 : (num(m, 3) + num(m, 5)) / 2;
  },
  t_one_step_equation(p) {
    let m = p.match(rx(F`Solve for x: x ([+-]) (\d+) = (-?\d+)`));
    if (m) return num(m, 3) - signed(m[1], num(m, 2));
    m = p.match(rx(F`Solve for x: (\d+)x = (-?\d+)`));
    if (m) return num(m, 2) / num(m, 1);
    return null;
  },
  t_opposite_abs(p) {
    let m = p.match(rx(F`value of \|(-?\d+)\|`));
    if (m) return Math.abs(num(m, 1));
    m = p.match(rx(F`opposite of (-?\d+(?:\.\d+)?(?:\/\d+)?)`));
    if (m) {
      const value = parseNumeric(m[1]);
      return value == null ? null : -value;
    }
    return null;
  },
  t_percent_of(p) {
    const m = p.match(rx(F`What is (\d+(?:\.\d+)?)% of (\d+(?:\.\d+)?)`));
    return m ? (num(m, 1) / 100) * num(m, 2) : null;
  },
  t_period_degrees(p) {
    const m = p.match(rx(F`period, in degrees, of y = (?:-?\d+ )?sin\((\d+)x\)`));
    return m ? 360 / num(m, 1) : null;
  },
  t_perpendicular_slope(p) {
    let m = p.match(rx(F`has slope (-?\d+)/(\d+)\.`));
    if (m) return -num(m, 2) / num(m, 1);
    m = p.match(rx(F`has slope (-?\d+)\.`));
    if (m) return -1 / num(m, 1);
    return null;
  },
  t_predict_from_fit(p) {
    const m = p.match(rx(F`ŷ = (-?\d+)x ([+-]) (\d+)\. What value does the line predict when x = (-?\d+)`));
    return m ? num(m, 1) * num(m, 4) + signed(m[2], num(m, 3)) : null;
  },
  t_prism_volume(p) {
    // anchored on "rectangular prism is" so composite-solid problems that list
    // one prism's dimensions but ask for a combined volume are not matched
    const m = p.match(rx(F`rectangular prism is (\d+(?:\.\d+)?) cm long, (\d+(?:\.\d+)?) cm wide, and (\d+(?:\.\d+)?) cm tall`));
    return m ? num(m, 1) * num(m, 2) * num(m, 3) : null;
  },
  t_probability_complement(p) {
    const m = p.match(rx(F`rains tomorrow is (\d+)/(\d+)`));
    return m ? 1 - num(m, 1) / num(m, 2) : null;
  },
  t_profit_at_q(p) {
    const m = p.match(rx(F`P = \((\d+) - (\d+)\)q - (\d+), where q is units sold\. What is the profit when q = (\d+)`));
    return m ? (num(m, 1) - num(m, 2)) * num(m, 4) - num(m, 3) : null;
  },
  t_quadratic_evaluate(p) {
    const m = p.match(rx(F`y = x\^2 ([+-]) (\d+)x ([+-]) (\d+), what is the value of y when x = (-?\d+)`));
    if (!m) return null;
    const k = num(m, 5);
    return k * k + signed(m[1], num(m, 2)) * k + signed(m[3], num(m, 4));
  },
  t_reflect_point(p) {
    const m = p.match(rx(F`point \((-?\d+), (-?\d+)\) is reflected over the ([xy])-axis\. What is the ([xy])-coordinate`));
    if (!m) return null;
    const x = num(m, 1);
    const y = num(m, 2);
    const [rx2, ry] = m[3] === "x" ? [x, -y] : [-x, y];
    return m[4] === "x" ? rx2 : ry;
  },
  t_residual_linear(p) {
    const m = p.match(rx(F`ŷ = (-?\d+)x ([+-]) (\d+)\. At x = (-?\d+) the observed value is (-?\d+)`));
    return m ? num(m, 5) - (num(m, 1) * num(m, 4) + signed(m[2], num(m, 3))) : null;
  },
  t_sample_proportion(p) {
    const m = p.match(rx(F`sample of (\d+) students, (\d+) prefer`));
    return m ? num(m, 2) / num(m, 1) : null;
  },
  t_sampling_mean(p) {
    const m = p.match(rx(F`population has mean (-?\d+(?:\.\d+)?)`));
    return m ? num(m, 1) : null;
  },
  t_scale_area(p) {
    const m = p.match(rx(F`scale 1 cm : (\d+) m\. The drawing is (\d+) cm long and (\d+) cm wide`));
    return m ? num(m, 1) * num(m, 2) * (num(m, 1) * num(m, 3)) : null;
  },
  t_sector_area(p) {
    const m = p.match(rx(F`radius (\d+(?:\.\d+)?) cm.*sector with a central angle of (\d+(?:\.\d+)?)`));
    return m ? (num(m, 2) / 360) * 3.14 * num(m, 1) ** 2 : null;
  },
  t_shifted_square(p) {
    const m = p.match(rx(F`g\(x\) = f\(x - (\d+)\) ([+-]) (\d+)\. What is g\((-?\d+)\)`));
    return m ? (num(m, 4) - num(m, 1)) ** 2 + signed(m[2], num(m, 3)) : null;
  },
  t_sig_figs(p) {
    const m = p.match(rx(F`measures (\d+(?:\.\d+)?) m by (\d+(?:\.\d+)?) m\..*two significant figures`));
    if (!m) return null;
    const area = num(m, 1) * num(m, 2);
    const digits = Math.floor(Math.log10(Math.abs(area)));
    const factor = 10 ** (digits - 1);
    return Math.round(area / factor) * factor;
  },
  t_similar_sides(p) {
    const m = p.match(
      rx(F`sides (\d+) cm and (\d+) cm\..*scale factor of (\d+), and the side matching (\d+) cm measures (\d+) cm\. How long is the side matching (\d+) cm`)
    );
    if (!m) return null;
    // internal consistency: measured side must equal matching side x factor
    if (num(m, 5) !== num(m, 4) * num(m, 3)) return { inconsistent: `stated ${m[4]}->${m[5]} but factor ${m[3]}` };
    return num(m, 6) * num(m, 3);
  },
  t_simple_system(p) {
    const m = p.match(rx(F`sum of (-?\d+) and a difference of (\d+)\. What is the (larger|smaller)`));
    if (!m) return null;
    return m[3] === "larger" ? (num(m, 1) + num(m, 2)) / 2 : (num(m, 1) - num(m, 2)) / 2;
  },
  t_slope_two_points(p) {
    // "slope of the/this line" only — perpendicular-slope follow-ups ask for
    // "the slope of a line perpendicular to it" and must not match
    const m = p.match(rx(F`points \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)\. (?:What is|Find) the slope of th(?:e|is) line`));
    return m ? (num(m, 4) - num(m, 2)) / (num(m, 3) - num(m, 1)) : null;
  },
  t_solve_both_sides(p) {
    const m = p.match(rx(F`Solve for x: (\d+)x ([+-]) (\d+) = (\d+)x ([+-]) (\d+)`));
    if (!m) return null;
    const a = num(m, 1);
    const b = signed(m[2], num(m, 3));
    const c = num(m, 4);
    const d = signed(m[5], num(m, 6));
    if (a === c) return null;
    return (d - b) / (a - c);
  },
  t_solve_proportion(p) {
    let m = p.match(rx(F`proportion: (\d+)/(\d+) = x/(\d+)`));
    if (m) return (num(m, 1) * num(m, 3)) / num(m, 2);
    m = p.match(rx(F`proportion: x/(\d+) = (\d+)/(\d+)`));
    if (m) return (num(m, 1) * num(m, 2)) / num(m, 3);
    m = p.match(rx(F`proportion: (\d+)/(\d+) = (\d+)/x`));
    if (m) return (num(m, 2) * num(m, 3)) / num(m, 1);
    return null;
  },
  t_sse_compare(p) {
    const m = p.match(rx(F`Model f has a sum of squared residuals of (\d+(?:\.\d+)?), and model g has (\d+(?:\.\d+)?)`));
    if (!m) return null;
    return { text: num(m, 1) < num(m, 2) ? "f" : "g" };
  },
  t_sum_of_roots(p) {
    const m = p.match(rx(F`\(x ([+-]) (\d+)\)\(x ([+-]) (\d+)\)\(x ([+-]) (\d+)\) = 0`));
    if (!m) return null;
    return -signed(m[1], num(m, 2)) - signed(m[3], num(m, 4)) - signed(m[5], num(m, 6));
  },
  t_third_angle(p) {
    const m = p.match(rx(F`angles of a triangle measure (\d+(?:\.\d+)?)° and (\d+(?:\.\d+)?)°`));
    return m ? 180 - num(m, 1) - num(m, 2) : null;
  },
  t_ticket_count(p) {
    const m = p.match(rx(F`cost \$(\d+(?:\.\d+)?) each plus a one-time \$(\d+(?:\.\d+)?) booking fee\. A group paid \$(\d+(?:\.\d+)?)`));
    return m ? (num(m, 3) - num(m, 2)) / num(m, 1) : null;
  },
  t_translate_point(p) {
    const m = p.match(
      rx(F`point \((-?\d+), (-?\d+)\) is translated (\d+) units? (right|left) and (\d+) units? (up|down)\. What is the ([xy])-coordinate`)
    );
    if (!m) return null;
    const x = num(m, 1) + (m[4] === "right" ? num(m, 3) : -num(m, 3));
    const y = num(m, 2) + (m[6] === "up" ? num(m, 5) : -num(m, 5));
    return m[7] === "x" ? x : y;
  },
  t_triangle_area(p) {
    const m = p.match(rx(F`base of (\d+(?:\.\d+)?) cm and a height of (\d+(?:\.\d+)?) cm`));
    return m ? (num(m, 1) * num(m, 2)) / 2 : null;
  },
  t_trig_ratio(p) {
    const m = p.match(rx(F`side opposite angle A is (\d+) and the side adjacent to angle A is (\d+)\. What is (tan|sin|cos) A`));
    if (!m) return null;
    const opp = num(m, 1);
    const adj = num(m, 2);
    const hyp = Math.hypot(opp, adj);
    if (m[3] === "tan") return opp / adj;
    if (m[3] === "sin") return opp / hyp;
    return adj / hyp;
  },
  t_two_draws(p) {
    const m = p.match(rx(F`(\d+) marbles, (\d+) of them red\..*without replacement.*both are red`));
    if (!m) return null;
    const total = num(m, 1);
    const red = num(m, 2);
    return (red / total) * ((red - 1) / (total - 1));
  },
  t_two_step_equation(p) {
    const m = p.match(rx(F`Solve for x: (\d+)x ([+-]) (\d+) = (-?\d+)`));
    return m ? (num(m, 4) - signed(m[2], num(m, 3))) / num(m, 1) : null;
  },
  t_unit_rate(p) {
    const m = p.match(rx(F`travels (\d+(?:\.\d+)?) miles in (\d+(?:\.\d+)?) hours`));
    return m ? num(m, 1) / num(m, 2) : null;
  },
  t_vertex_max_value(p) {
    const m = p.match(rx(F`maximum value of f\(x\) = -\(x - (\d+)\)\^2 \+ (\d+)`));
    return m ? num(m, 2) : null;
  },
  t_vertex_x(p) {
    const m = p.match(rx(F`parabola y = (\d*)x\^2 ([+-]) (\d+)x, at what value of x is the vertex`));
    if (!m) return null;
    const a = m[1] ? Number(m[1]) : 1;
    return -signed(m[2], num(m, 3)) / (2 * a);
  },
  t_z_score(p) {
    const m = p.match(rx(F`mean (-?\d+(?:\.\d+)?) and standard deviation (\d+(?:\.\d+)?)\. What is the z-score of a value of (-?\d+(?:\.\d+)?)`));
    return m ? (num(m, 3) - num(m, 1)) / num(m, 2) : null;
  }
};

// Ask-keyword guards: several solvers key off a numeric setup ("legs of 5 cm
// and 12 cm") that other questions could share while asking something else.
// Requiring the ask keyword makes them safe to run in try-all inference mode.
const solverGuards = {
  t_arc_length: /arc/,
  t_circle_circumference: /circumference/,
  t_distance_points: /distance/,
  t_hypotenuse: /hypotenuse/,
  t_marble_probability: /probability/,
  t_mean_of_list: /mean/,
  t_median_of_list: /median/,
  t_prism_volume: /volume/,
  t_scale_area: /area/,
  t_sector_area: /sector/,
  t_sum_of_roots: /sum of the roots/,
  t_third_angle: /third angle/,
  t_triangle_area: /area/,
  t_unit_rate: /unit rate|per hour/
};
for (const [name, guard] of Object.entries(solverGuards)) {
  const base = templateSolvers[name];
  templateSolvers[name] = (p) => (guard.test(p) ? base(p) : null);
}

// Try-all inference for free-form banks: run every solver over the prompt and
// only judge the item when all solvers that parsed agree on one value.
function inferSolve(prompt) {
  const matches = [];
  for (const [name, solver] of Object.entries(templateSolvers)) {
    let value;
    try {
      value = solver(prompt);
    } catch {
      value = null;
    }
    if (value == null || typeof value === "object") continue;
    matches.push({ name, value });
  }
  if (!matches.length) return null;
  const first = matches[0].value;
  if (!matches.every((match) => nearlyEqual(match.value, first, 1e-9))) {
    return { ambiguous: matches.map((match) => match.name) };
  }
  return { value: first, solvers: matches.map((match) => match.name) };
}

// ---------- PASS A: structural key integrity ----------

// Free-form items like "Write a digit that makes the inequality true" have
// several legitimately different accepted answers — alias agreement with the
// canonical answer is expected to fail there.
const MULTI_ANSWER_PROMPT_RE = /makes the \w+ true|write a (?:digit|whole number|number)|fill in the blank with a digit|name a \w+|give (?:a|any) \w+/i;
// When the ask constrains the FORM of the answer, a numerically equal option
// in a different form is a deliberate distractor, not a second key.
const FORMAT_CUE_RE = /denominator \d+|with denominator|as a decimal|as hundredths|as tenths|in simplest form|expanded form|as a percent|as an improper fraction|as a mixed number/i;

function auditStructure(question, mode) {
  const answer = String(question.answer ?? "").trim();
  if (!answer) {
    flag(question, "A", "P0", "empty-answer", "answer field is empty");
    return;
  }
  if (!question.prompt?.en?.trim()) {
    flag(question, "A", "P0", "empty-prompt", "prompt.en is empty");
    return;
  }

  const accepted = (question.acceptedAnswers ?? []).map((a) => String(a).trim());
  if (!accepted.includes(answer)) {
    flag(question, "A", "P1", "answer-not-in-accepted", `answer "${answer}" missing from acceptedAnswers`);
  }
  const indep = String(question.independentAnswer ?? "").trim();
  const answerValue = parseNumeric(answer);
  if (indep && indep !== answer) {
    const indepValue = parseNumeric(indep);
    const numericMatch = answerValue != null && indepValue != null && nearlyEqual(answerValue, indepValue);
    if (!numericMatch && !accepted.includes(indep)) {
      flag(question, "A", "P1", "independent-answer-mismatch", `independentAnswer "${indep}" vs answer "${answer}"`);
    }
  }
  // accepted aliases must agree numerically with the answer when both parse;
  // for "about"-style items the canonical answer may be the alias rounded to
  // its own precision (e.g. answer "31" accepting the exact "31.4").
  // Skipped for free-form ("inferred") banks, where acceptedAnswers is a
  // grading rubric of alternate solution forms (t = 4 vs the year 2024, a raw
  // product next to its sig-fig rounding), not aliases of one value.
  const multiAnswer = MULTI_ANSWER_PROMPT_RE.test(question.prompt?.en ?? "");
  if (answerValue != null && !multiAnswer && mode !== "inferred") {
    const decimals = (answer.split(".")[1] ?? "").length;
    for (const alias of accepted) {
      const aliasValue = parseNumeric(alias);
      if (aliasValue == null) continue;
      const agrees =
        nearlyEqual(aliasValue, answerValue, 1e-3) ||
        Number(aliasValue.toFixed(decimals)) === answerValue;
      if (!agrees) {
        flag(question, "A", "P1", "accepted-alias-disagrees", `alias "${alias}" != answer "${answer}"`);
      }
    }
  }

  if (question.type === "multiple-choice") {
    const options = (question.options ?? []).map((o) => String(o.en ?? o).trim());
    if (options.length < 2) {
      flag(question, "A", "P0", "too-few-options", `only ${options.length} options`);
      return;
    }
    const stringMatches = options.filter((option) => accepted.includes(option) || option === answer);
    const matches = options.filter((option) => {
      if (accepted.includes(option) || option === answer) return true;
      const optionValue = parseNumeric(option, { stripPrefix: false });
      return optionValue != null && answerValue != null && nearlyEqual(optionValue, answerValue);
    });
    if (matches.length === 0) {
      flag(question, "A", "P0", "correct-option-missing", `answer "${answer}" not among options [${options.join(" | ")}]`);
    } else if (matches.length > 1) {
      if (stringMatches.length <= 1 && FORMAT_CUE_RE.test(question.prompt?.en ?? "")) {
        flag(
          question,
          "A",
          "P2",
          "format-equal-option",
          `options [${matches.join(" | ")}] are numerically equal; only the format cue in the ask disambiguates`
        );
      } else {
        flag(question, "A", "P0", "multiple-correct-options", `options [${matches.join(" | ")}] all equal the answer`);
      }
    }
    const seen = new Map();
    for (const option of options) {
      const key = parseNumeric(option, { stripPrefix: false }) ?? option.toLowerCase();
      if (seen.has(key)) {
        // duplicates involving the key are covered by multiple-correct above;
        // equal-value distractor pairs are usually deliberate misconception
        // probes (0.7 vs 0.70), so they are advisory only
        const involvesAnswer = matches.includes(option) || matches.includes(seen.get(key));
        if (involvesAnswer && FORMAT_CUE_RE.test(question.prompt?.en ?? "")) {
          // already reported as format-equal-option
        } else {
          flag(
            question,
            "A",
            involvesAnswer ? "P1" : "P2",
            involvesAnswer ? "duplicate-options" : "duplicate-distractors",
            `"${seen.get(key)}" and "${option}" are the same value`
          );
        }
      }
      seen.set(key, option);
    }
  }
}

// ---------- PASS C: arithmetic claims in explanations ----------
//
// Finds full equality chains like "2*8 + 2 = 16 + 2 = 18" and evaluates every
// segment with proper precedence, flagging only when adjacent segments truly
// disagree. Mixed numbers ("1 1/4") are supported.

const CHAIN_RE = /(?<![\d.\/√*\p{L}$¢:'’′)]|[+\/*-]\s?)(-?[\d.\/ ()+*%-]+)((?:=\s*-?[\d.\/ ()+*%-]+)+)/gu;

// Unit words that legitimately follow a numeric result; any other word after
// the final segment means the "equation" is prose ("15 = 1 ten and 5 ones").
const UNIT_AFTER_RE = /^\s*(?:cm|mm|m|km|kg|g|mph|cents?|degrees?|dollars?|units?|tickets?|miles?|hours?|minutes?|seconds?|square|cubic|meters?|per|m\/s|km\/h)\b/i;
// Phrase endings that mean the first segment is a fragment of a larger prose
// operand ("20% of 120 = ..."), so the first comparison is unreliable.
const FRAGMENT_BEFORE_RE = /(?:\bof|\bis|\bto|\bby|\bfrom|\band|\bmeasures?|\bequals?)\s*$/i;

// Evaluates an arithmetic segment: numbers, fractions, mixed numbers, + - * /
// with standard precedence and parentheses. Returns null if not evaluable.
function evaluateSegment(segment) {
  const text = segment.trim();
  if (!text || !/\d/.test(text)) return null;
  const prepared = text
    // absolute-value pipes: "|-7|" -> "abs(-7)"
    .replace(/\|([^|]+)\|/g, "abs($1)")
    // dangling operators/opens from sentence boundaries: "18. (" -> "18"
    .replace(/[ (+*/.-]+$/, "")
    // mixed number "1 1/4" -> "(1+1/4)"
    .replace(/(\d+)\s+(\d+)\/(\d+)/g, "($1+$2/$3)")
    // written fractions bind tight: "-1 / 2/5" means -1 / (2/5)
    .replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, "($1/$2)");
  if (!/^[-\d.\/ ()+*%]+$/.test(prepared.replace(/abs/g, ""))) return null;
  // guard against pathological input before evaluating
  if (/[a-z]/i.test(prepared.replace(/abs/g, ""))) return null;
  try {
    const value = Function("abs", `"use strict"; return (${prepared});`)(Math.abs);
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

// independentSolution appears as a plain string, a localized object, or an
// array of steps depending on the pack generation vintage.
function independentSolutionText(question) {
  const solution = question.independentSolution;
  if (solution == null) return null;
  if (Array.isArray(solution)) return solution.join(" ");
  if (typeof solution === "object") return Object.values(solution).filter((v) => typeof v === "string").join(" ");
  return String(solution);
}

function auditArithmeticClaims(question, { includeIndependentSolution = true } = {}) {
  const texts = [question.explanation?.en, includeIndependentSolution ? independentSolutionText(question) : null];
  for (const text of texts) {
    if (!text || /[≈~]|round|about|approximately|nearest/i.test(text)) continue;
    const normalized = String(text)
      .replace(/[−–—]/g, "-")
      .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1")
      .replace(/×/g, "*")
      .replace(/·/g, "*")
      .replace(/÷/g, "/")
      .replace(/²/g, "**2")
      .replace(/³/g, "**3")
      .replace(/\^/g, "**")
      .replace(/½/g, "(1/2)")
      .replace(/¼/g, "(1/4)")
      .replace(/¾/g, "(3/4)")
      // K-G5 explanations write multiplication as a spaced letter x: "4 x 3 = 12"
      .replace(/(\d|\))\s+x\s+(\d|\()/gi, "$1 * $2");
    for (const match of normalized.matchAll(CHAIN_RE)) {
      const segments = [match[1], ...match[2].split("=").slice(1)];
      const values = segments.map(evaluateSegment);
      const before = normalized.slice(0, match.index);
      const after = normalized.slice(match.index + match[0].length);
      // A first segment that starts with a dangling operator ("x + 3 = 16"
      // matched from the "+ 3"), follows a word, follows a ratio colon
      // ("120 : 120 = 1 : 1"), or is a minus-continuation of an algebraic
      // expression ("4x² - 240 = 144") is a fragment and cannot be checked.
      const firstUnreliable =
        FRAGMENT_BEFORE_RE.test(before) ||
        /^[+*/]/.test(match[1].trim()) ||
        /\p{L}\s*$/u.test(before) ||
        /:\s*$/.test(before) ||
        (/^-/.test(match[1].trim()) && /[\p{L}\d)²³']\s+$/u.test(before));
      const lastUnreliable = (/^\s*\p{L}/u.test(after) && !UNIT_AFTER_RE.test(after)) || /^\s*:/.test(after);
      // Authored fraction-scaling notation "2×2/3×2 = 4/6" means (2×2)/(3×2);
      // accept a segment when either standard precedence or that fraction
      // reading matches its neighbour.
      const fractionValues = segments.map((segment) => {
        const parts = segment.split("/");
        if (parts.length !== 2 || !/[*]/.test(segment)) return null;
        const numerator = evaluateSegment(parts[0]);
        const denominator = evaluateSegment(parts[1]);
        return numerator != null && denominator != null && denominator !== 0 ? numerator / denominator : null;
      });
      const segmentAgrees = (i, j) => {
        for (const left of [values[i], fractionValues[i]]) {
          for (const right of [values[j], fractionValues[j]]) {
            if (left != null && right != null && nearlyEqual(left, right, 1e-4)) return true;
          }
        }
        return false;
      };
      for (let i = 0; i + 1 < values.length; i += 1) {
        if (i === 0 && firstUnreliable) continue;
        if (i + 2 === values.length && lastUnreliable) continue;
        const left = values[i] ?? fractionValues[i];
        const right = values[i + 1] ?? fractionValues[i + 1];
        if (left == null || right == null) continue;
        if (!segmentAgrees(i, i + 1)) {
          flag(
            question,
            "C",
            "P2",
            "explanation-arithmetic",
            `"${segments[i].trim()} = ${segments[i + 1].trim()}" is false (${left} vs ${right})`
          );
        }
      }
    }
  }
}

// ---------- reasoning-leakage check ----------
// Generated items occasionally retain the generator's chain-of-thought
// ("...= 26? Wait recalc: ..."). Student-visible fields must never carry it.
const LEAK_RE = /\bwait,|\bwait recalc|\brecalc\b|\brecompute\b|\bhmm\b|\boops\b|let me re|let's re-?c/i;

function auditReasoningLeakage(question) {
  const visible = [question.prompt?.en, question.explanation?.en].filter(Boolean).join(" || ");
  if (LEAK_RE.test(visible)) {
    flag(question, "A", "P1", "reasoning-leakage-visible", `chain-of-thought text in student-visible field: "${visible.match(LEAK_RE)[0]}..."`);
  }
  const internal = independentSolutionText(question);
  if (internal && LEAK_RE.test(internal)) {
    flag(question, "A", "P2", "reasoning-leakage-internal", `chain-of-thought text in independentSolution: "${internal.match(LEAK_RE)[0]}..."`);
  }
}

// ---------- run ----------

let templateStats = { solved: 0, unparsed: 0, mismatched: 0 };
const inferStats = {};
let mathFactStats = { verified: 0, unparsed: 0, mismatched: 0 };

function auditTemplated(question) {
  const solver = templateSolvers[question.generationTemplate];
  if (!solver) {
    flag(question, "B", "P2", "no-solver", `no solver for template ${question.generationTemplate}`);
    return;
  }
  const prompt = normalizePromptText(question.prompt.en);
  const solved = solver(prompt);
  if (solved == null) {
    templateStats.unparsed += 1;
    flag(question, "B", "P2", "unparsed-prompt", `solver for ${question.generationTemplate} could not parse prompt: "${question.prompt.en}"`);
    return;
  }
  if (typeof solved === "object" && solved.inconsistent) {
    templateStats.mismatched += 1;
    flag(question, "B", "P0", "prompt-self-inconsistent", solved.inconsistent);
    return;
  }
  const expectedText = typeof solved === "object" ? solved.text : null;
  const answer = String(question.answer).trim();
  if (expectedText != null) {
    if (answer.toLowerCase() !== expectedText) {
      templateStats.mismatched += 1;
      flag(question, "B", "P0", "wrong-answer", `expected "${expectedText}", stored "${answer}"`);
    } else {
      templateStats.solved += 1;
    }
    return;
  }
  const answerValue = parseNumeric(answer);
  if (answerValue == null) {
    flag(question, "B", "P2", "unparseable-answer", `cannot parse stored answer "${answer}"`);
    return;
  }
  const tolerance = question.generationTemplate === "t_arc_length" || question.generationTemplate === "t_sector_area" ? 5e-3 : 1e-6;
  if (!nearlyEqual(answerValue, solved, tolerance)) {
    templateStats.mismatched += 1;
    flag(
      question,
      "B",
      "P0",
      "wrong-answer",
      `independent solve gives ${solved}, stored answer "${answer}" (template ${question.generationTemplate})`
    );
  } else {
    templateStats.solved += 1;
    if (/simplest form|Give a fraction/i.test(question.prompt.en) && !isSimplestFraction(answer)) {
      flag(question, "B", "P1", "not-simplest-form", `answer "${answer}" is not in simplest form but prompt requires it`);
    }
  }
}

function auditInferred(question, stats) {
  const keyValues = [question.answer, ...(question.acceptedAnswers ?? [])]
    .map(parseNumericLoose)
    .filter((value) => value != null);
  if (!keyValues.length) {
    stats.unjudgeable += 1;
    return;
  }
  const inferred = inferSolve(normalizePromptText(question.prompt.en));
  if (!inferred) {
    stats.uncovered += 1;
    return;
  }
  if (inferred.ambiguous) {
    stats.ambiguous += 1;
    return;
  }
  stats.covered += 1;
  if (!keyValues.some((value) => nearlyEqual(value, inferred.value, 5e-3))) {
    stats.mismatched += 1;
    flag(
      question,
      "B",
      "P1",
      "inferred-answer-mismatch",
      `solver ${inferred.solvers.join("+")} gives ${inferred.value}, stored answer "${question.answer}"`
    );
  }
}

function auditMathFact(question) {
  const fact = question.mathFact;
  if (!fact?.expression) {
    flag(question, "B", "P2", "missing-mathfact", "problem has no mathFact.expression");
    return;
  }
  const normalized = String(fact.expression)
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\^/g, "**")
    .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
  // Expressions are often written as chains ("x = 39/3 - 2 = 11"): drop bare
  // variable segments, evaluate the rest, and require them to agree.
  const segments = normalized
    .split("=")
    .map((segment) => segment.trim())
    .filter((segment) => segment && !/^-?[a-z][a-z0-9_()']*$/i.test(segment));
  const segmentValues = segments.map(evaluateSegment);
  let value = null;
  for (const segmentValue of segmentValues) {
    if (segmentValue == null) continue;
    if (value == null) value = segmentValue;
    else if (!nearlyEqual(value, segmentValue, 1e-6)) {
      mathFactStats.mismatched += 1;
      flag(question, "B", "P0", "mathfact-mismatch", `expression "${fact.expression}" contains unequal steps (${value} vs ${segmentValue})`);
      return;
    }
  }
  if (value == null) {
    mathFactStats.unparsed += 1;
    flag(question, "B", "P2", "unparsed-mathfact", `cannot evaluate mathFact expression "${fact.expression}"`);
    return;
  }
  const answer = String(question.answer).trim();
  const decimals = (answer.split(".")[1] ?? "").length;
  const answerValue = parseNumericLoose(answer);
  const problems = [];
  if (!nearlyEqual(value, fact.expected, 1e-6)) problems.push(`expression evaluates to ${value}, expected ${fact.expected}`);
  if (fact.actual != null && !nearlyEqual(fact.actual, fact.expected, 1e-6)) problems.push(`actual ${fact.actual} != expected ${fact.expected}`);
  if (
    answerValue != null &&
    !nearlyEqual(answerValue, fact.expected, 1e-6) &&
    Number(fact.expected.toFixed?.(decimals) ?? fact.expected) !== answerValue
  ) {
    problems.push(`answer "${answer}" disagrees with mathFact expected ${fact.expected}`);
  }
  if (problems.length) {
    mathFactStats.mismatched += 1;
    flag(question, "B", "P0", "mathfact-mismatch", problems.join("; "));
  } else {
    mathFactStats.verified += 1;
  }
}

for (const { name, mode, pack, questions } of packs) {
  const rows = questions ?? pack.questions;
  if (mode === "inferred") inferStats[name] = { covered: 0, uncovered: 0, ambiguous: 0, unjudgeable: 0, mismatched: 0 };
  for (const question of rows) {
    auditStructure(question, mode);
    auditReasoningLeakage(question);
    // For templated items pass B independently re-solves the whole item, and the
    // shorthand independentSolution strings ("middle of 25, 26 ... = 29") are not
    // parseable arithmetic — only check their prose explanations.
    auditArithmeticClaims(question, { includeIndependentSolution: mode !== "templated" });

    if (mode === "templated") auditTemplated(question);
    else if (mode === "inferred") auditInferred(question, inferStats[name]);
    else if (mode === "mathfact") auditMathFact(question);
  }
}

// ---------- report ----------

const bySeverity = { P0: 0, P1: 0, P2: 0 };
for (const finding of findings) bySeverity[finding.severity] += 1;

const totals = packs.map(({ name, mode, pack, questions }) => `${name} [${mode}]: ${(questions ?? pack.questions).length}`).join("\n  ");
console.log(`US math item quality audit (CA / AR / FL)`);
console.log(`  ${totals}`);
console.log(`CA G6-G12 template pass: ${templateStats.solved} solved+matched, ${templateStats.unparsed} unparsed, ${templateStats.mismatched} mismatched`);
for (const [name, stats] of Object.entries(inferStats)) {
  console.log(
    `${name} inference: ${stats.covered} solver-verified, ${stats.uncovered} uncovered, ${stats.ambiguous} ambiguous, ${stats.unjudgeable} unjudgeable, ${stats.mismatched} mismatched`
  );
}
console.log(`FL mathFact pass: ${mathFactStats.verified} verified, ${mathFactStats.unparsed} unparsed, ${mathFactStats.mismatched} mismatched`);
console.log(`Findings: ${findings.length} (P0: ${bySeverity.P0}, P1: ${bySeverity.P1}, P2: ${bySeverity.P2})`);
for (const finding of findings) {
  console.log(`  [${finding.severity}][pass ${finding.pass}] ${finding.id}: ${finding.issue} — ${finding.detail}`);
}

const jsonIndex = process.argv.indexOf("--json");
if (jsonIndex !== -1 && process.argv[jsonIndex + 1]) {
  writeFileSync(process.argv[jsonIndex + 1], JSON.stringify({ summary: bySeverity, templateStats, inferStats, mathFactStats, findings }, null, 2));
  console.log(`Wrote ${process.argv[jsonIndex + 1]}`);
}

process.exit(bySeverity.P0 + bySeverity.P1 > 0 ? 1 : 0);
