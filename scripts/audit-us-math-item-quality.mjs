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
  },
  t_ar_altitude_to_hypotenuse(p) {
    if (!/(?:angle C is (?:a right angle|the right angle|90)|right angle at C)/.test(p)) return null;
    if (!/CD is perpendicular to AB/.test(p)) return null;
    if (!/(?:Find|What is) the length of CD/.test(p)) return null;
    const side = (name) => {
      let mm = p.match(rx(F`\b${name} = (\d+(?:\.\d+)?)`));
      if (mm) return num(mm, 1);
      mm = p.match(rx(F`length of (?:leg |side |the hypotenuse |hypotenuse )?${name} is (\d+(?:\.\d+)?)`));
      return mm ? num(mm, 1) : null;
    };
    const AC = side("AC"), BC = side("BC"), AB = side("AB");
    if (AC != null && BC != null) {
      const h = Math.hypot(AC, BC);
      if (AB != null && Math.abs(AB - h) > 1e-9) return null;
      return (AC * BC) / h;
    }
    if (AB != null && BC != null && AB > BC) {
      const other = Math.sqrt(AB * AB - BC * BC);
      return (BC * other) / AB;
    }
    if (AB != null && AC != null && AB > AC) {
      const other = Math.sqrt(AB * AB - AC * AC);
      return (AC * other) / AB;
    }
    return null;
  },
  t_ar_bestfit_exponential_residual(p) {
    // The model must be a BARE exponential immediately followed by ", where t is
    // in years" so compound models ("... + A * sin(Bt + C)") and two-model
    // prompts cannot be read as if they were the single exponential.
    const model = p.match(
      rx(F`P\(t\) ?= ?(\d+(?:\.\d+)?) ?[*·]? ?e\^[({]?(-?\d+(?:\.\d+)?)t[)}]?, where t is in years`)
    );
    if (!model) return null;
    const at = p.match(rx(F`(?:Calculate|Compute) the residual at t ?= ?(-?\d+(?:\.\d+)?)`));
    if (!at) return null;
    const t = num(at, 1);
    // The observed value must carry an EXPLICIT observation time, and it must be
    // the same t the residual is asked for; otherwise refuse rather than guess.
    let m = p.match(rx(F`actual population at t ?= ?(-?\d+(?:\.\d+)?) is (\d+(?:\.\d+)?)`));
    if (!m) m = p.match(rx(F`After (\d+(?:\.\d+)?) years?,? the actual population is (\d+(?:\.\d+)?)`));
    if (!m) m = p.match(rx(F`At t ?= ?(-?\d+(?:\.\d+)?), the actual population is (\d+(?:\.\d+)?)`));
    if (!m) return null;
    if (num(m, 1) !== t) return null;
    const residual = num(m, 2) - num(model, 1) * Math.exp(num(model, 2) * t);
    return /Round to the nearest whole number/i.test(p) ? Math.round(residual) : residual;
  },
  t_ar_bestfit_predict_score(p) {
    const m = p.match(
      rx(F`line of best fit has equation y = (-?\d+(?:\.\d+)?)x ([+-]) (\d+(?:\.\d+)?), where x is hours studied and y is (?:the )?test score\. What is the predicted test score for a student who studies (-?\d+(?:\.\d+)?) hours`)
    );
    return m ? num(m, 1) * num(m, 4) + signed(m[2], num(m, 3)) : null;
  },
  t_ar_circle_arc_length_radius(p) {
    const m = p.match(rx(F`central angle of (\d+(?:\.\d+)?)° intercepts an arc of length (\d+(?:\.\d+)?)π (?:cm|units)\.`));
    return m ? (num(m, 2) * 360) / (2 * num(m, 1)) : null;
  },
  t_ar_circle_arc_probability(p) {
    const m = p.match(rx(F`central angle of (\d+(?:\.\d+)?)° intercepts an arc\.`));
    return m ? num(m, 1) / 360 : null;
  },
  t_ar_circle_chord_center_distance(p) {
    const r = p.match(rx(F`radius (?:of )?(\d+(?:\.\d+)?)(?= |\.|,)`));
    const c =
      p.match(rx(F`[Cc]hord(?: AB)? is (\d+(?:\.\d+)?) (?:cm|units) long`)) ||
      p.match(rx(F`[Cc]hord(?: AB)? of length (\d+(?:\.\d+)?) (?:cm|units)`));
    if (!r || !c) return null;
    const half = num(c, 1) / 2;
    const sq = num(r, 1) ** 2 - half * half;
    return sq >= 0 ? Math.sqrt(sq) : null;
  },
  t_ar_circle_chord_diameter_leg(p) {
    if (!rx(F`AC is a diameter`).test(p)) return null;
    const c =
      p.match(rx(F`[Cc]hord AB of length (\d+(?:\.\d+)?) (?:cm|units)`)) ||
      p.match(rx(F`[Cc]hord AB is (\d+(?:\.\d+)?) (?:cm|units) long`));
    const d = p.match(rx(F`distance from (?:the )?cent(?:er|re) O to (?:the )?chord(?: AB)? is (\d+(?:\.\d+)?) (?:cm|units)`));
    if (!c || !d) return null;
    const chord = num(c, 1);
    const radius = Math.sqrt((chord / 2) ** 2 + num(d, 1) ** 2);
    const sq = (2 * radius) ** 2 - chord ** 2;
    return sq >= 0 ? Math.sqrt(sq) : null;
  },
  t_ar_circle_chord_radius(p) {
    const c = p.match(rx(F`[Cc]hord(?: AB)? (?:of length |is )(\d+(?:\.\d+)?) (?:cm|units)`));
    if (!c) return null;
    const d =
      p.match(rx(F`(\d+(?:\.\d+)?) (?:cm|units) (?:away )?from (?:the )?cent(?:er|re)`)) ||
      p.match(rx(F`distance from (?:the )?(?:cent(?:er|re)|O)(?: O)? to (?:the )?(?:chord(?: AB)?|AB) is (\d+(?:\.\d+)?) (?:cm|units)`)) ||
      p.match(rx(F`distance from (?:the )?cent(?:er|re) is (\d+(?:\.\d+)?) (?:cm|units)`)) ||
      p.match(rx(F`OM = (\d+(?:\.\d+)?) (?:cm|units)`));
    if (!d) return null;
    const half = num(c, 1) / 2;
    return Math.sqrt(half * half + num(d, 1) ** 2);
  },
  t_ar_circle_eq_center_x(p) {
    const m = p.match(
      rx(F`circle has the equation \(x ([+-]) (\d+(?:\.\d+)?)\)\^2 \+ \(y [+-] \d+(?:\.\d+)?\)\^2 = \d+(?:\.\d+)?\.`)
    );
    if (m) return m[1] === "-" ? num(m, 2) : -num(m, 2);
    return rx(F`circle has the equation x\^2 \+ y\^2 = \d+(?:\.\d+)?\.`).test(p) ? 0 : null;
  },
  t_ar_circle_eq_center_y(p) {
    const m = p.match(
      rx(F`circle has the equation \(x [+-] \d+(?:\.\d+)?\)\^2 \+ \(y ([+-]) (\d+(?:\.\d+)?)\)\^2 = \d+(?:\.\d+)?\.`)
    );
    if (m) return m[1] === "-" ? num(m, 2) : -num(m, 2);
    return rx(F`circle has the equation x\^2 \+ y\^2 = \d+(?:\.\d+)?\.`).test(p) ? 0 : null;
  },
  t_ar_circle_eq_radius(p) {
    const m = p.match(
      rx(F`circle has the equation (?:x|\(x [+-] \d+(?:\.\d+)?\))\^2 \+ (?:y|\(y [+-] \d+(?:\.\d+)?\))\^2 = (\d+(?:\.\d+)?)\.`)
    );
    return m ? Math.sqrt(num(m, 1)) : null;
  },
  t_ar_circle_inscribed_angle(p) {
    const m = p.match(
      rx(F`central angle of (\d+(?:\.\d+)?)° intercepts an arc\. What is the measure of the inscribed angle that intercepts the same arc`)
    );
    return m ? num(m, 1) / 2 : null;
  },
  t_ar_circle_scaled_central_angle(p) {
    const m = p.match(
      rx(F`central angle of (\d+(?:\.\d+)?)° intercepts an arc\. A second circle has a radius (two|three|four|five|six|ten|\d+(?:\.\d+)?) times as large\.`)
    );
    if (!m) return null;
    const words = { two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };
    const k = Object.prototype.hasOwnProperty.call(words, m[2]) ? words[m[2]] : Number(m[2]);
    return k > 0 ? num(m, 1) / k : null;
  },
  t_ar_circle_sector_area_pi314(p) {
    if (!rx(F`Use π ≈ 3\.14`).test(p)) return null;
    const m = p.match(rx(F`central angle of (\d+(?:\.\d+)?)°\. The radius is (\d+(?:\.\d+)?) cm\.`));
    return m ? (num(m, 1) / 360) * 3.14 * num(m, 2) ** 2 : null;
  },
  t_ar_claims_t_stat_mean_claim(p) {
    if (/p-value|critical value|degrees of freedom|two-sample|two sample|paired|confidence interval|margin of error|standard error/i.test(p)) return null;
    const sizes = new Set();
    for (const s of p.matchAll(/(?:tests|testing|random sample of|sample of|surveys|surveyed) (\d+) /g)) sizes.add(s[1]);
    if (sizes.size !== 1) return null;
    // Unit backreference (\2) keeps hypothesised mean, sample mean and sd on one scale.
    const m = p.match(
      rx(F`claims (?:that )?the (?:average|mean) [a-z ]{0,60}?is (\d+(?:\.\d+)?) ([a-z]+)\.[\s\S]{0,120}?random sample of (\d+) [\s\S]{0,120}?mean [a-z ]{0,30}?of (\d+(?:\.\d+)?) \2 and an? (?:sample )?standard deviation of (\d+(?:\.\d+)?) \2`)
    );
    if (!m) return null;
    const mu0 = num(m, 1);
    const n = num(m, 3);
    const mean = num(m, 4);
    const sd = num(m, 5);
    if (!(n > 1) || !(sd > 0)) return null;
    return (mean - mu0) / (sd / Math.sqrt(n)); // one-sample t
  },
  t_ar_claims_t_stat_pct_increase(p) {
    // Guard on the ASK: identical setup text also supports "find the p-value",
    // "what is the critical value", "how many degrees of freedom", "standard
    // error", and two-sample/paired variants - all different numbers. Bail on
    // any of them rather than gamble on which one the pack stored.
    if (/p-value|critical value|degrees of freedom|two-sample|two sample|paired|confidence interval|margin of error|standard error/i.test(p)) return null;
    // Refuse when the prompt names more than one candidate sample size
    // ("tests 3 formulations ... a random sample of 40 cars"): the lazy match
    // would latch onto the first number and silently compute a wrong t.
    const sizes = new Set();
    for (const s of p.matchAll(/(?:tests|testing|random sample of|sample of|surveys|surveyed) (\d+) /g)) sizes.add(s[1]);
    if (sizes.size !== 1) return null;
    const m = p.match(
      rx(F`claims[^.]{0,140}?by at least (\d+(?:\.\d+)?)%\.[\s\S]{0,200}?(?:tests|random sample of) (\d+) [\s\S]{0,200}?mean(?: productivity)?(?: increase| change)?(?: was| of) (\d+(?:\.\d+)?)% with (?:an?|the) (?:sample )?standard deviation of (\d+(?:\.\d+)?)%`)
    );
    if (!m) return null;
    const mu0 = num(m, 1);
    const n = num(m, 2);
    const mean = num(m, 3);
    const sd = num(m, 4);
    if (!(n > 1) || !(sd > 0)) return null;
    return (mean - mu0) / (sd / Math.sqrt(n)); // one-sample t
  },
  t_ar_conditional_two_color_draw(p) {
    const setup = p.match(
      rx(F`A bag contains (\d+) ([a-z]+) marbles and (\d+) ([a-z]+) marbles\. Two marbles are drawn (?:at random )?without replacement\.`)
    );
    if (!setup) return null;
    const counts = { [setup[2]]: Number(setup[1]), [setup[4]]: Number(setup[3]) };
    const total = Number(setup[1]) + Number(setup[3]);
    let first = null, second = null;
    let a = p.match(rx(F`Given that the first marble drawn is ([a-z]+), what is the probability that the second marble is (?:also )?([a-z]+)\?`));
    if (a) { first = a[1]; second = a[2]; }
    if (!a) {
      a = p.match(rx(F`What is the probability that the second marble is ([a-z]+) given that the first marble drawn (?:was|is) ([a-z]+)\?`));
      if (a) { second = a[1]; first = a[2]; }
    }
    if (first == null || counts[first] == null || counts[second] == null) return null;
    if (total < 2) return null;
    const remaining = second === first ? counts[second] - 1 : counts[second];
    return remaining / (total - 1);
  },
  t_ar_enlarged_rectangle_area(p) {
    const m = p.match(
      rx(F`A rectangle has a length of (\d+(?:\.\d+)?) (cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units) and a width of (\d+(?:\.\d+)?) \2\. (?:It is|If the rectangle is) enlarged by a scale factor of (\d+(?:\.\d+)?)[,.] ?(?:w|W)hat is the area of the enlarged rectangle`)
    );
    if (!m) return null;
    const k = num(m, 4);
    return num(m, 1) * num(m, 3) * k * k;
  },
  t_ar_field_trip_budget(p) {
    let a = null, b = null;
    let m = p.match(rx(F`expression C = (\d+(?:\.\d+)?)n \+ (\d+(?:\.\d+)?)\.`));
    if (m) { a = num(m, 1); b = num(m, 2); }
    if (!m) {
      m = p.match(rx(F`expression C = (\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?)n\.`));
      if (m) { b = num(m, 1); a = num(m, 2); }
    }
    if (a == null || a === 0) return null;
    const ask = p.match(
      rx(F`(?:has a budget of|spends) \$(\d+(?:\.\d+)?)(?: in total)?, (?:what is the maximum number of students|how many students went)`)
    );
    if (!ask) return null;
    const n = (num(ask, 1) - b) / a;
    return Number.isInteger(n) && n > 0 ? n : null;
  },
  t_ar_garden_width_from_area(p) {
    const m = p.match(
      rx(F`length that is (\d+(?:\.\d+)?) (?:meters|feet|metres|m|ft) more than twice its width\. The area of the garden is (\d+(?:\.\d+)?) square (?:meters|feet|metres)\. Find the width of the garden`)
    );
    if (!m) return null;
    const k = num(m, 1), A = num(m, 2);
    const disc = k * k + 8 * A;
    if (disc < 0) return null;
    return (-k + Math.sqrt(disc)) / 4;
  },
  t_ar_given_conditional_percent(p) {
    const m = p.match(
      rx(F`Among (?:the )?students who play a sport, (\d+(?:\.\d+)?)% are also in the band\..*probability that (?:a randomly selected student|the student) is in the band given that the student plays a sport`)
    );
    return m ? num(m, 1) / 100 : null;
  },
  t_ar_growth_damped_cos_reach(p) {
    const m = p.match(rx(F`Q\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}] ?\*? ?cos\(π ?t ?\/ ?(\d+(?:\.\d+)?)\)`));
    if (!m) return null;
    const ask = p.match(rx(F`first positive time t when the population reaches (\d+(?:\.\d+)?) rabbits`));
    if (!ask) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places|nearest hundredth/.test(p) ? 2 : null;
    if (d === null) return null;
    const C = num(m, 1);
    const r = num(m, 2);
    const period = num(m, 3);
    const target = num(ask, 1);
    const f = (t) => C * Math.exp(r * t) * Math.cos((Math.PI * t) / period) - target;
    let prev = f(0);
    if (prev === 0) return null;
    for (let x = 0.0005; x <= 60.0001; x += 0.0005) {
      const cur = f(x);
      if (cur === 0 || (prev < 0) !== (cur < 0)) {
        let lo = x - 0.0005;
        let hi = x;
        let flo = prev;
        for (let i = 0; i < 100; i += 1) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if ((flo < 0) !== (fm < 0)) hi = mid;
          else { lo = mid; flo = fm; }
        }
        return Number(((lo + hi) / 2).toFixed(d));
      }
      prev = cur;
    }
    return null;
  },
  t_ar_growth_doubling_period_k(p) {
    if (!/P\(t\) = a \* b\^\(t\/k\)/.test(p)) return null;
    const m = p.match(rx(F`doubles every (\d+(?:\.\d+)?) hours`));
    return m ? num(m, 1) : null;
  },
  t_ar_growth_doubling_population(p) {
    const d = p.match(rx(F`doubles every (\d+(?:\.\d+)?) hours`));
    if (!d) return null;
    const a = p.match(rx(F`(?:initial population is|Initially there are) (\d+(?:\.\d+)?)`));
    if (!a) return null;
    const t = p.match(rx(F`(?:[Ff]ind|[Dd]etermine) the population after (\d+(?:\.\d+)?) hours`));
    if (!t) return null;
    return num(a, 1) * 2 ** (num(t, 1) / num(d, 1));
  },
  t_ar_growth_exp_avg_rate(p) {
    if (/Q\(t\)/.test(p)) return null;
    const m = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    if (!m) return null;
    const ask = p.match(rx(F`average rate of change of the population from t = (\d+(?:\.\d+)?) to t = (\d+(?:\.\d+)?)`));
    if (!ask) return null;
    const a = num(ask, 1);
    const b = num(ask, 2);
    if (a === b) return null;
    const f = (x) => num(m, 1) * Math.exp(num(m, 2) * x);
    const v = (f(b) - f(a)) / (b - a);
    if (/nearest whole number|nearest integer/.test(p)) return Math.round(v);
    if (/one decimal place|nearest tenth/.test(p)) return Number(v.toFixed(1));
    if (/two decimal places|nearest hundredth/.test(p)) return Number(v.toFixed(2));
    return null;
  },
  t_ar_growth_exp_exceeds_seasonal_max(p) {
    const s = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?) ?(?:sin|cos)\(`));
    const e = p.match(rx(F`Q\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    if (!s || !e) return null;
    if (!/greater than the maximum of the seasonal model/.test(p)) return null;
    const t = Math.log((num(s, 1) + num(s, 2)) / num(e, 1)) / num(e, 2);
    if (!Number.isFinite(t) || t <= 0) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places|nearest hundredth/.test(p) ? 2 : null;
    return d === null ? null : Number(t.toFixed(d));
  },
  t_ar_growth_exp_reach_time(p) {
    if (/Q\(t\)/.test(p)) return null;
    const m = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    if (!m) return null;
    const ask = p.match(rx(F`After how many (?:months|hours|years|days) will the population reach (\d+(?:\.\d+)?)`));
    if (!ask) return null;
    const t = Math.log(num(ask, 1) / num(m, 1)) / num(m, 2);
    if (!Number.isFinite(t) || t <= 0) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places|nearest hundredth/.test(p) ? 2 : /three decimal places/.test(p) ? 3 : null;
    return d === null ? null : Number(t.toFixed(d));
  },
  t_ar_growth_exp_reach_year(p) {
    if (/Q\(t\)/.test(p)) return null;
    const m = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}], where t is the number of years since (\d{4})`));
    if (!m) return null;
    const ask = p.match(rx(F`Find the year when the population reaches (\d+(?:\.\d+)?)`));
    if (!ask) return null;
    const t = Math.log(num(ask, 1) / num(m, 1)) / num(m, 2);
    if (!Number.isFinite(t) || t < 0) return null;
    return Math.floor(num(m, 3) + t);
  },
  t_ar_growth_match_exp_rate(p) {
    const a = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    const b = p.match(rx(F`Q\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({]k ?t[)}]`));
    if (!a || !b) return null;
    const ask = p.match(rx(F`After (\d+(?:\.\d+)?) (?:hours|months|years|days), both populations are equal\. Find the value of k`));
    if (!ask) return null;
    const h = num(ask, 1);
    if (h === 0) return null;
    const k = (Math.log(num(a, 1) / num(b, 1)) + num(a, 2) * h) / h;
    if (!Number.isFinite(k)) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places/.test(p) ? 2 : /three decimal places/.test(p) ? 3 : null;
    return d === null ? null : Number(k.toFixed(d));
  },
  t_ar_growth_seasonal_exp_intersect(p) {
    const s = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?) ?sin\(π ?t ?\/ ?(\d+(?:\.\d+)?)\)`));
    const e = p.match(rx(F`Q\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    if (!s || !e) return null;
    if (!/the two models predict the same population|the two populations equal for the first time|the two populations are equal/.test(p)) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places|nearest hundredth/.test(p) ? 2 : null;
    if (d === null) return null;
    const A = num(s, 1);
    const B = num(s, 2);
    const period = num(s, 3);
    const C = num(e, 1);
    const r = num(e, 2);
    const f = (t) => A + B * Math.sin((Math.PI * t) / period) - C * Math.exp(r * t);
    let prev = f(0);
    if (prev === 0) return null;
    for (let x = 0.001; x <= 240.0001; x += 0.001) {
      const cur = f(x);
      if (cur === 0 || (prev < 0) !== (cur < 0)) {
        let lo = x - 0.001;
        let hi = x;
        let flo = prev;
        for (let i = 0; i < 100; i += 1) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if ((flo < 0) !== (fm < 0)) hi = mid;
          else { lo = mid; flo = fm; }
        }
        return Number(((lo + hi) / 2).toFixed(d));
      }
      prev = cur;
    }
    return null;
  },
  t_ar_growth_seasonal_max(p) {
    if (/minimum/i.test(p) || /Q\(t\)/.test(p)) return null;
    const m = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?) ?(?:sin|cos)\(`));
    return m ? num(m, 1) + num(m, 2) : null;
  },
  t_ar_growth_two_exp_intersect(p) {
    const a = p.match(rx(F`P\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    const b = p.match(rx(F`Q\(t\) = (\d+(?:\.\d+)?) ?\*? ?e\^[({](\d+(?:\.\d+)?) ?t[)}]`));
    if (!a || !b) return null;
    if (!/At what time t .*do the two models predict the same population/.test(p)) return null;
    const dr = num(b, 2) - num(a, 2);
    if (dr === 0) return null;
    const t = Math.log(num(a, 1) / num(b, 1)) / dr;
    if (!Number.isFinite(t) || t <= 0) return null;
    const d = /one decimal place|nearest tenth/.test(p) ? 1 : /two decimal places|nearest hundredth/.test(p) ? 2 : /three decimal places/.test(p) ? 3 : null;
    return d === null ? null : Number(t.toFixed(d));
  },
  t_ar_hypotenuse_plain_legs(p) {
    const m = p.match(rx(F`right triangle has legs of lengths? (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?)\. (?:What is|Find) the length of the hypotenuse`));
    return m ? Math.hypot(num(m, 1), num(m, 2)) : null;
  },
  t_ar_legs_offset_hypotenuse(p) {
    let m = p.match(rx(F`right triangle has legs of length x and x\+(\d+(?:\.\d+)?), and hypotenuse of length (\d+(?:\.\d+)?)\. Find the positive value of x`));
    let d, h;
    if (m) { d = num(m, 1); h = num(m, 2); }
    if (!m) {
      m = p.match(
        rx(F`the length of one leg is (\d+(?:\.\d+)?) units? (?:longer|more) than the other leg\. The hypotenuse is (\d+(?:\.\d+)?) units\. Find the length of the shorter leg`)
      );
      if (m) { d = num(m, 1); h = num(m, 2); }
    }
    if (!m) return null;
    const disc = 4 * d * d - 8 * (d * d - h * h);
    if (disc < 0) return null;
    const x = (-2 * d + Math.sqrt(disc)) / 4;
    return x > 0 ? x : null;
  },
  t_ar_map_scale_distance(p) {
    const norm = (u) => u.replace(/e?s$/, "");
    const s = p.match(
      rx(F`(\d+(?:\.\d+)?) (inch|inches|centimeter|centimeters|cm) (?::|represents|representing) (\d+(?:\.\d+)?) (miles|mile|kilometers|kilometres|km|feet|meters)\b`)
    );
    if (!s) return null;
    const d = p.match(rx(F`(\d+(?:\.\d+)?) (inch|inches|centimeter|centimeters|cm) apart on the map`));
    if (!d) return null;
    if (norm(s[2]) !== norm(d[2])) return null;
    if (!/(?:W|w)hat is the actual distance/.test(p)) return null;
    const per = Number(s[1]);
    if (per === 0) return null;
    return (Number(d[1]) / per) * Number(s[3]);
  },
  t_ar_mean_labeled_list(p) {
    if (/round(?:ed)? (?:your answer )?to the nearest (?:whole|integer|unit|dollar|ten|hundred)/i.test(p)) return null;
    const m = p.match(rx(F`((?:-?\d+(?:\.\d+)?, ){2,}-?\d+(?:\.\d+)?)\. (?:What is|Find) the mean`));
    if (!m) return null;
    const values = m[1].split(",").map((v) => Number(v.trim()));
    return values.reduce((t, v) => t + v, 0) / values.length;
  },
  t_ar_median_labeled_list(p) {
    const m = p.match(rx(F`((?:-?\d+(?:\.\d+)?, ){2,}-?\d+(?:\.\d+)?)\. (?:What is|Find) the median`));
    if (!m) return null;
    const values = m[1].split(",").map((v) => Number(v.trim())).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  },
  t_ar_miles_per_gallon_scale(p) {
    const m = p.match(
      rx(F`travels (\d+(?:\.\d+)?) miles (?:using|on) (\d+(?:\.\d+)?) gallons of gasoline\. At this rate, how many miles can (?:the car|it) travel (?:using|on) (\d+(?:\.\d+)?) gallons`)
    );
    if (!m) return null;
    return (num(m, 1) / num(m, 2)) * num(m, 3);
  },
  t_ar_pack_unit_price(p) {
    const m = p.match(
      rx(F`sells (?:([a-z]+) in packs of )?(\d+(?:\.\d+)?) ?([a-z]*) for \$(\d+(?:\.\d+)?)\. At this rate, (?:how much (?:would|do|does) (\d+(?:\.\d+)?)|what is the cost of (\d+(?:\.\d+)?))`)
    );
    if (!m) return null;
    const n = num(m, 2), price = num(m, 4);
    const target = m[5] != null ? Number(m[5]) : m[6] != null ? Number(m[6]) : null;
    if (target == null || n === 0) return null;
    return (price / n) * target;
  },
  t_ar_parabola_a_from_vertex_point(p) {
    let m = p.match(
      rx(F`parabola has vertex \((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\) and passes through the point \((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)\. Find the value of a in the vertex form equation y = a\(x - h\)\^2 \+ k`)
    );
    if (!m) {
      m = p.match(
        rx(F`quadratic function f\(x\)=ax\^2\+bx\+c has vertex at \((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\) and passes through the point \((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)\. Find the value of a`)
      );
    }
    if (!m) return null;
    const h = num(m, 1), k = num(m, 2), x = num(m, 3), y = num(m, 4);
    const den = (x - h) ** 2;
    if (den === 0) return null;
    return (y - k) / den;
  },
  t_ar_perp_slope_two_points(p) {
    const m = p.match(
      rx(F`points [A-Z]?\((-?\d+), (-?\d+)\) and [A-Z]?\((-?\d+), (-?\d+)\)\. (?:What is|Find) the slope of a line perpendicular to (?:it|this line)`)
    );
    if (!m) return null;
    const dy = num(m, 4) - num(m, 2);
    if (dy === 0) return null;
    return -(num(m, 3) - num(m, 1)) / dy;
  },
  t_ar_prism_surface_area(p) {
    const m = p.match(
      rx(F`rectangular prism has a length of (\d+(?:\.\d+)?) (cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units), a width of (\d+(?:\.\d+)?) \2, and a height of (\d+(?:\.\d+)?) \2\. What is (?:its surface area|the surface area of the prism)`)
    );
    if (!m) return null;
    const l = num(m, 1), w = num(m, 3), h = num(m, 4);
    return 2 * (l * w + l * h + w * h);
  },
  t_ar_prism_volume_lwh(p) {
    const m = p.match(
      rx(F`rectangular prism has a length of (\d+(?:\.\d+)?) (cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units), a width of (\d+(?:\.\d+)?) \2, and a height of (\d+(?:\.\d+)?) \2\. What is (?:its volume|the volume of the prism)`)
    );
    return m ? num(m, 1) * num(m, 3) * num(m, 4) : null;
  },
  t_ar_profit_poly_accumulated(p) {
    // total profit accumulated over [a, b] = definite integral of P
    if (!/total (?:accumulated profit|profit accumulated)/.test(p)) return null;
    const span = p.match(rx(F`from [tx] ?= ?(-?\d+(?:\.\d+)?) to [tx] ?= ?(-?\d+(?:\.\d+)?)`));
    if (!span) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    const A = (v) => (a3 / 4) * v ** 4 + (a2 / 3) * v ** 3 + (a1 / 2) * v ** 2 + a0 * v;
    const total = A(num(span, 2)) - A(num(span, 1));
    if (/nearest thousand dollars/.test(p) && /in thousands of dollars/.test(p)) return Math.round(total);
    if (/two decimal places/.test(p)) return Math.round(total * 100) / 100;
    return total;
  },
  t_ar_profit_poly_argmax(p) {
    // the value of the model's OWN variable (production level in the stated
    // scale, month number, or time t) at which profit is maximised
    if (!/(?:production level(?: [tx])?(?: \(in hundreds(?: of units)?\))? that maximizes profit|number of units \(in hundreds\) that (?:maximizes|yields)|which production level (?:yields the maximum profit|should (?:the company|they) choose)|month in which the profit is maximized|time [tx] in \[\d+, ?\d+\] when the profit is (?:at a maximum|maximized))/.test(p)) return null;
    // compound asks ("...and state the maximum profit") are not a single number
    if (/most rapidly|and state the maximum profit|What is the maximum profit\?|and what is a key limitation|maximum profit in dollars/.test(p)) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`between [tx] ?= ?(-?\d+(?:\.\d+)?) and [tx] ?= ?(-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`month number \((\d+) to (\d+)\)`)) ||
      p.match(rx(F`between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?) hundred units`));
    if (d) {
      lo = num(d, 1); hi = num(d, 2);
    } else {
      const w = p.match(rx(F`first (\d+) months`));
      const u = p.match(rx(F`limited to between (\d+) and (\d+) units`));
      if (w) { lo = 0; hi = num(w, 1); }
      else if (u && /\(in hundreds\)/.test(p)) { lo = num(u, 1) / 100; hi = num(u, 2) / 100; }
      else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    }
    if (!(hi > lo)) return null;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    let best;
    if (/local (?:maximum|max)/.test(p)) {
      const locs = [];
      if (a3 !== 0) {
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) {
          if (r >= lo && r <= hi && 6 * a3 * r + 2 * a2 < 0) locs.push(r);
        }
      } else {
        if (!(a2 < 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) locs.push(v);
      }
      if (locs.length !== 1) return null;
      best = locs[0];
    } else {
      const cands = [lo];
      if (Number.isFinite(hi)) cands.push(hi);
      if (a3 !== 0) {
        if (!Number.isFinite(hi) && a3 > 0) return null;
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) if (r >= lo && r <= hi) cands.push(r);
        }
      } else {
        if (a2 === 0 || (!Number.isFinite(hi) && a2 > 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) cands.push(v);
      }
      best = cands[0];
      for (const c of cands) if (P(c) > P(best)) best = c;
      if (cands.some((c) => Math.abs(P(c) - P(best)) < 1e-9 && Math.abs(c - best) > 1e-9)) return null;
    }
    return best;
  },
  t_ar_profit_poly_argmax_units(p) {
    // x is defined in hundreds of units and the ask wants the raw unit count
    if (!/number of units (?:\(to the nearest whole unit\) )?that (?:maximizes profit|yields the maximum profit)/.test(p)) return null;
    if (!/where [tx] is the number of units produced \(in hundreds\)/.test(p)) return null;
    // a second "(in hundreds" means the ask itself is stated in hundreds
    if ((p.match(/\(in hundreds/g) || []).length !== 1) return null;
    if (/most rapidly|and state the maximum profit|What is the maximum profit\?|and what is a key limitation/.test(p)) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`between [tx] ?= ?(-?\d+(?:\.\d+)?) and [tx] ?= ?(-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`month number \((\d+) to (\d+)\)`)) ||
      p.match(rx(F`between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?) hundred units`));
    if (d) {
      lo = num(d, 1); hi = num(d, 2);
    } else {
      const w = p.match(rx(F`first (\d+) months`));
      const u = p.match(rx(F`limited to between (\d+) and (\d+) units`));
      if (w) { lo = 0; hi = num(w, 1); }
      else if (u && /\(in hundreds\)/.test(p)) { lo = num(u, 1) / 100; hi = num(u, 2) / 100; }
      else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    }
    if (!(hi > lo)) return null;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    let best;
    if (/local (?:maximum|max)/.test(p)) {
      const locs = [];
      if (a3 !== 0) {
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) {
          if (r >= lo && r <= hi && 6 * a3 * r + 2 * a2 < 0) locs.push(r);
        }
      } else {
        if (!(a2 < 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) locs.push(v);
      }
      if (locs.length !== 1) return null;
      best = locs[0];
    } else {
      const cands = [lo];
      if (Number.isFinite(hi)) cands.push(hi);
      if (a3 !== 0) {
        if (!Number.isFinite(hi) && a3 > 0) return null;
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) if (r >= lo && r <= hi) cands.push(r);
        }
      } else {
        if (a2 === 0 || (!Number.isFinite(hi) && a2 > 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) cands.push(v);
      }
      best = cands[0];
      for (const c of cands) if (P(c) > P(best)) best = c;
      if (cands.some((c) => Math.abs(P(c) - P(best)) < 1e-9 && Math.abs(c - best) > 1e-9)) return null;
    }
    return best * 100;
  },
  t_ar_profit_poly_break_even_year(p) {
    if (!/In which year does the company break even \(profit equals zero\)/.test(p)) return null;
    const base = p.match(rx(F`years since (?:the start of )?(\d{4})`));
    if (!base) return null;
    const m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (!m) return null;
    const a2 = num(m, 1);
    const a1 = signed(m[2], num(m, 3));
    const a0 = signed(m[4], num(m, 5));
    const disc = a1 * a1 - 4 * a2 * a0;
    if (disc < 0) return null;
    const s = Math.sqrt(disc);
    const roots = [(-a1 + s) / (2 * a2), (-a1 - s) / (2 * a2)].filter((r) => r >= 0).sort((x, y) => x - y);
    if (!roots.length) return null;
    if (Math.abs(roots[0] - Math.round(roots[0])) > 1e-9) return null;
    return num(base, 1) + Math.round(roots[0]);
  },
  t_ar_profit_poly_fastest_decrease(p) {
    // for a cubic with a3 < 0, P' is concave down, so its minimum over a closed
    // interval sits at an endpoint; a tie means the ask has two answers
    if (!/profit is decreasing most rapidly/.test(p)) return null;
    if (/Which calculus concept/.test(p)) return null;
    const m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (!m) return null;
    const a3 = num(m, 1);
    const a2 = signed(m[2], num(m, 3));
    const a1 = signed(m[4], num(m, 5));
    if (a3 >= 0) return null;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`));
    if (!d) return null;
    const lo = num(d, 1);
    const hi = num(d, 2);
    if (!(hi > lo)) return null;
    const slope = (v) => 3 * a3 * v ** 2 + 2 * a2 * v + a1;
    if (Math.abs(slope(lo) - slope(hi)) < 1e-9) return null;
    return slope(lo) < slope(hi) ? lo : hi;
  },
  t_ar_profit_poly_fastest_increase(p) {
    // for a cubic with a3 < 0, P' peaks at the inflection point t = -a2/(3*a3)
    if (!/profit is increasing most rapidly/.test(p)) return null;
    if (/Which calculus concept/.test(p)) return null;
    const m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (!m) return null;
    const a3 = num(m, 1);
    const a2 = signed(m[2], num(m, 3));
    if (a3 >= 0) return null;
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`));
    if (d) { lo = num(d, 1); hi = num(d, 2); }
    else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    const inflection = -a2 / (3 * a3);
    if (inflection < lo || inflection > hi) return null;
    return inflection;
  },
  t_ar_profit_poly_first_below_year(p) {
    // first whole year (t = 0, 1, 2, ...) whose modelled profit is under the threshold
    const limit = p.match(rx(F`[Ii]n which year does the profit first fall below \$(\d+(?:\.\d+)?)`));
    if (!limit) return null;
    if (!/in thousands of dollars/.test(p)) return null;
    const base = p.match(rx(F`years since (?:the start of )?(\d{4})`));
    if (!base) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    const threshold = num(limit, 1) / 1000;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    for (let t = 0; t <= 100; t += 1) if (P(t) < threshold) return num(base, 1) + t;
    return null;
  },
  t_ar_profit_poly_max_value(p) {
    // the maximum value of P itself, in the units P is stated in
    if (!/(?:Find|Determine|What is|what is) the maximum (?:daily |weekly |monthly )?profit|maximum profit predicted by this model/.test(p)) return null;
    if (/maximum (?:daily |weekly |monthly )?profit in dollars|and when|when does it occur|state the maximum|production level that maximizes|number of units that (?:maximizes|yields)|which production level/.test(p)) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`between [tx] ?= ?(-?\d+(?:\.\d+)?) and [tx] ?= ?(-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`month number \((\d+) to (\d+)\)`)) ||
      p.match(rx(F`between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?) hundred units`));
    if (d) {
      lo = num(d, 1); hi = num(d, 2);
    } else {
      const w = p.match(rx(F`first (\d+) months`));
      const u = p.match(rx(F`limited to between (\d+) and (\d+) units`));
      if (w) { lo = 0; hi = num(w, 1); }
      else if (u && /\(in hundreds\)/.test(p)) { lo = num(u, 1) / 100; hi = num(u, 2) / 100; }
      else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    }
    if (!(hi > lo)) return null;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    let best;
    if (/local (?:maximum|max)/.test(p)) {
      const locs = [];
      if (a3 !== 0) {
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) {
          if (r >= lo && r <= hi && 6 * a3 * r + 2 * a2 < 0) locs.push(r);
        }
      } else {
        if (!(a2 < 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) locs.push(v);
      }
      if (locs.length !== 1) return null;
      best = locs[0];
    } else {
      const cands = [lo];
      if (Number.isFinite(hi)) cands.push(hi);
      if (a3 !== 0) {
        if (!Number.isFinite(hi) && a3 > 0) return null;
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) if (r >= lo && r <= hi) cands.push(r);
        }
      } else {
        if (a2 === 0 || (!Number.isFinite(hi) && a2 > 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) cands.push(v);
      }
      best = cands[0];
      for (const c of cands) if (P(c) > P(best)) best = c;
      if (cands.some((c) => Math.abs(P(c) - P(best)) < 1e-9 && Math.abs(c - best) > 1e-9)) return null;
    }
    const value = P(best);
    if (/nearest thousand dollars/.test(p) && /in thousands of dollars/.test(p)) return Math.round(value);
    if (/nearest dollar/.test(p) && /P \(in dollars\)|profit P \(in dollars\)/.test(p)) return Math.round(value);
    return value;
  },
  t_ar_profit_poly_max_value_dollars(p) {
    // P is stated in thousands of dollars and the ask demands plain dollars
    if (!/maximum (?:daily |weekly |monthly )?profit in dollars/.test(p)) return null;
    if (!/in thousands of dollars/.test(p)) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`between [tx] ?= ?(-?\d+(?:\.\d+)?) and [tx] ?= ?(-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`month number \((\d+) to (\d+)\)`)) ||
      p.match(rx(F`between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?) hundred units`));
    if (d) {
      lo = num(d, 1); hi = num(d, 2);
    } else {
      const w = p.match(rx(F`first (\d+) months`));
      const u = p.match(rx(F`limited to between (\d+) and (\d+) units`));
      if (w) { lo = 0; hi = num(w, 1); }
      else if (u && /\(in hundreds\)/.test(p)) { lo = num(u, 1) / 100; hi = num(u, 2) / 100; }
      else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    }
    if (!(hi > lo)) return null;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    let best;
    if (/local (?:maximum|max)/.test(p)) {
      const locs = [];
      if (a3 !== 0) {
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) {
          if (r >= lo && r <= hi && 6 * a3 * r + 2 * a2 < 0) locs.push(r);
        }
      } else {
        if (!(a2 < 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) locs.push(v);
      }
      if (locs.length !== 1) return null;
      best = locs[0];
    } else {
      const cands = [lo];
      if (Number.isFinite(hi)) cands.push(hi);
      if (a3 !== 0) {
        if (!Number.isFinite(hi) && a3 > 0) return null;
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) if (r >= lo && r <= hi) cands.push(r);
        }
      } else {
        if (a2 === 0 || (!Number.isFinite(hi) && a2 > 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) cands.push(v);
      }
      best = cands[0];
      for (const c of cands) if (P(c) > P(best)) best = c;
      if (cands.some((c) => Math.abs(P(c) - P(best)) < 1e-9 && Math.abs(c - best) > 1e-9)) return null;
    }
    return P(best) * 1000;
  },
  t_ar_profit_poly_max_year(p) {
    // "In which year does the profit reach its maximum" for P(t) with t = years since YYYY
    if (!/(?:In which year does the profit reach (?:its |a )?(?:local )?maximum|year (?:when|in which) the profit reaches (?:its |a )?(?:local )?maximum)/.test(p)) return null;
    const base = p.match(rx(F`years since (?:the start of )?(\d{4})`));
    if (!base) return null;
    let a3 = 0, a2 = 0, a1 = 0, a0 = 0;
    let m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^3 ([+-]) (\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
    if (m) {
      a3 = num(m, 1); a2 = signed(m[2], num(m, 3)); a1 = signed(m[4], num(m, 5)); a0 = signed(m[6], num(m, 7));
    } else {
      m = p.match(rx(F`P\([tx]\) = (-?\d+(?:\.\d+)?)[tx]\^2 ([+-]) (\d+(?:\.\d+)?)[tx] ([+-]) (\d+(?:\.\d+)?)(?![\d.^])`));
      if (!m) return null;
      a2 = num(m, 1); a1 = signed(m[2], num(m, 3)); a0 = signed(m[4], num(m, 5));
    }
    let lo = 0, hi = Infinity;
    const d =
      p.match(rx(F`(-?\d+(?:\.\d+)?) ≤ [tx] ≤ (-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`interval \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`[tx] in \[(-?\d+(?:\.\d+)?), ?(-?\d+(?:\.\d+)?)\]`)) ||
      p.match(rx(F`between [tx] ?= ?(-?\d+(?:\.\d+)?) and [tx] ?= ?(-?\d+(?:\.\d+)?)`)) ||
      p.match(rx(F`month number \((\d+) to (\d+)\)`)) ||
      p.match(rx(F`between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?) hundred units`));
    if (d) {
      lo = num(d, 1); hi = num(d, 2);
    } else {
      const w = p.match(rx(F`first (\d+) months`));
      const u = p.match(rx(F`limited to between (\d+) and (\d+) units`));
      if (w) { lo = 0; hi = num(w, 1); }
      else if (u && /\(in hundreds\)/.test(p)) { lo = num(u, 1) / 100; hi = num(u, 2) / 100; }
      else if (/model is valid for|can produce|limited to|between \d+ and \d+|first \d+ (?:months|weeks|years)/.test(p)) return null;
    }
    if (!(hi > lo)) return null;
    const P = (v) => a3 * v ** 3 + a2 * v ** 2 + a1 * v + a0;
    let best;
    if (/local (?:maximum|max)/.test(p)) {
      // the ask is a LOCAL maximum: endpoints do not qualify, only critical
      // points with P'' < 0, and it must be unique.
      const locs = [];
      if (a3 !== 0) {
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) {
          if (r >= lo && r <= hi && 6 * a3 * r + 2 * a2 < 0) locs.push(r);
        }
      } else {
        if (!(a2 < 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) locs.push(v);
      }
      if (locs.length !== 1) return null;
      best = locs[0];
    } else {
      const cands = [lo];
      if (Number.isFinite(hi)) cands.push(hi);
      if (a3 !== 0) {
        if (!Number.isFinite(hi) && a3 > 0) return null;
        const disc = 4 * a2 * a2 - 12 * a3 * a1;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          for (const r of [(-2 * a2 + s) / (6 * a3), (-2 * a2 - s) / (6 * a3)]) if (r >= lo && r <= hi) cands.push(r);
        }
      } else {
        if (a2 === 0 || (!Number.isFinite(hi) && a2 > 0)) return null;
        const v = -a1 / (2 * a2);
        if (v >= lo && v <= hi) cands.push(v);
      }
      best = cands[0];
      for (const c of cands) if (P(c) > P(best)) best = c;
      if (cands.some((c) => Math.abs(P(c) - P(best)) < 1e-9 && Math.abs(c - best) > 1e-9)) return null;
    }
    if (Math.abs(best - Math.round(best)) > 1e-9) return null;
    return num(base, 1) + Math.round(best);
  },
  t_ar_projectile_ground_time(p) {
    const m = p.match(
      rx(F`h\(t\) = (-\d+(?:\.\d+)?)t\^2 ([+-]) (\d+(?:\.\d+)?)t ([+-]) (\d+(?:\.\d+)?)\. Find the time (?:\(in seconds\) )?when the ball hits the ground\b`)
    );
    if (!m) return null;
    const a = num(m, 1);
    const b = signed(m[2], num(m, 3));
    const c = signed(m[4], num(m, 5));
    if (!(a < 0)) return null;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const larger = Math.max((-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a));
    return larger > 0 ? larger : null;
  },
  t_ar_projectile_height_at_time(p) {
    const m = p.match(
      rx(F`h\(t\) = (-\d+(?:\.\d+)?)t\^2 ([+-]) (\d+(?:\.\d+)?)t ([+-]) (\d+(?:\.\d+)?)\. (?:What is|Find) the height of the ball after (\d+(?:\.\d+)?) seconds?\b`)
    );
    if (!m) return null;
    const a = num(m, 1);
    const b = signed(m[2], num(m, 3));
    const c = signed(m[4], num(m, 5));
    const t = num(m, 6);
    return a * t * t + b * t + c;
  },
  t_ar_projectile_max_height(p) {
    const m = p.match(
      rx(F`h\(t\) = (-\d+(?:\.\d+)?)t\^2 \+ (\d+(?:\.\d+)?)t ([+-]) (\d+(?:\.\d+)?)\. (?:What is|Find) the maximum height (?:reached by the ball|the ball reaches)\b`)
    );
    if (!m) return null;
    const a = num(m, 1);
    const b = num(m, 2);
    const c = signed(m[3], num(m, 4));
    if (!(a < 0) || !(b > 0)) return null;
    return c - (b * b) / (4 * a);
  },
  t_ar_projectile_time_at_max(p) {
    const m = p.match(
      rx(F`h\(t\) = (-\d+(?:\.\d+)?)t\^2 \+ (\d+(?:\.\d+)?)t [+-] \d+(?:\.\d+)?\. (?:At what time does the ball reach its maximum height|After how many seconds does the ball reach its maximum height|Find the time when the ball reaches its maximum height)\b`)
    );
    if (!m) return null;
    const a = num(m, 1);
    const b = num(m, 2);
    if (!(a < 0) || !(b > 0)) return null;
    return -b / (2 * a);
  },
  t_ar_recipe_ratio(p) {
    const setup = p.match(
      rx(F`A recipe (?:calls for|uses|needs) (\d+(?:\.\d+)?(?:/\d+)?) cups? of ([a-z]+) for every (\d+(?:\.\d+)?(?:/\d+)?) cups? of ([a-z]+)\.`)
    );
    if (!setup) return null;
    const frac = (v) => {
      const f = String(v).match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
      if (f) return Number(f[1]) / Number(f[2]);
      return /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : null;
    };
    const qa = frac(setup[1]), qb = frac(setup[3]);
    if (qa == null || qb == null || qa === 0 || qb === 0) return null;
    const ia = setup[2], ib = setup[4];
    let want = null, given = null, k = null;
    let a = p.match(rx(F`How many cups of ([a-z]+) are needed for (\d+(?:\.\d+)?) cups? of ([a-z]+)\?`));
    if (a) { want = a[1]; k = Number(a[2]); given = a[3]; }
    if (!a) {
      a = p.match(
        rx(F`If you (?:want to )?(?:use|make a batch using|make a larger batch using|want to use) (\d+(?:\.\d+)?) cups? of ([a-z]+), how many cups of ([a-z]+) (?:are needed|do you need)`)
      );
      if (a) { k = Number(a[1]); given = a[2]; want = a[3]; }
    }
    if (want == null) return null;
    if (want === ia && given === ib) return (qa / qb) * k;
    if (want === ib && given === ia) return (qb / qa) * k;
    return null;
  },
  t_ar_recipe_scale_count(p) {
    const m = p.match(
      rx(F`A recipe (?:calls for|uses|needs) (\d+(?:\.\d+)?) cups? of ([a-z]+) to make (\d+(?:\.\d+)?) ([a-z]+)\. (?:How many cups of \2 are needed (?:to make|for) (\d+(?:\.\d+)?) \4|If you want to make (\d+(?:\.\d+)?) \4, how many cups of \2 do you need)`)
    );
    if (!m) return null;
    const target = m[5] != null ? Number(m[5]) : m[6] != null ? Number(m[6]) : null;
    if (target == null) return null;
    return (num(m, 1) / num(m, 3)) * target;
  },
  t_ar_rect_width_from_perimeter(p) {
    const m = p.match(
      rx(F`A rectangle has a length that is (\d+(?:\.\d+)?) times its width\. (?:The perimeter is|If the perimeter is) (\d+(?:\.\d+)?) (?:cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units)[,.] ?(?:w|W)hat is the width`)
    );
    if (!m) return null;
    const k = num(m, 1);
    return num(m, 2) / (2 * (k + 1));
  },
  t_ar_rectangle_area_lw(p) {
    const m = p.match(
      rx(F`A rectangle has a length of (\d+(?:\.\d+)?) (cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units) and a width of (\d+(?:\.\d+)?) \2\. What is (?:its area|the area(?: of the rectangle)?)\b`)
    );
    return m ? num(m, 1) * num(m, 3) : null;
  },
  t_ar_rectangle_perimeter_lw(p) {
    const m = p.match(
      rx(F`A rectangle has a length of (\d+(?:\.\d+)?) (cm|centimeters|centimetres|mm|m|meters|metres|km|inches|inch|in|feet|ft|foot|yards|units) and a width of (\d+(?:\.\d+)?) \2\. What is (?:its perimeter|the perimeter(?: of the rectangle)?)\b`)
    );
    return m ? 2 * (num(m, 1) + num(m, 3)) : null;
  },
  t_ar_sampling_population_estimate(p) {
    if (/expression|\$|sum of|\bnot\b|difference|percent|more than|fewer/.test(p)) return null;
    if (/fraction|proportion|probability|ratio|what portion|decimal|margin of error/.test(p)) return null;
    if (/in the sample|of the sample|within the sample/.test(p)) return null;
    const sm = p.match(rx(F`random sample of (\d+)`));
    if (!sm) return null;
    const n = num(sm, 1);
    const km =
      p.match(rx(F`(?:shows?|showed|found|finds|reveals?|revealed|indicates?) that (\d+)`)) ||
      p.match(rx(F`surveyed, and (\d+)`));
    if (!km) return null;
    const k = num(km, 1);
    const counts = [
      ...new Set(
        [
          ...p.matchAll(
            /(\d+)(?: students| residents| of them| seventh graders| people)? (?:prefer|say|walk|plan|support|have|choose|like|own|report)/g
          )
        ].map((m) => Number(m[1]))
      )
    ];
    if (counts.length > 1) return null;
    const pops = [];
    for (const pattern of [
      F`(?:school|town|city|district) (?:of|with) (\d+)`,
      F`(?:school|town|city|district) has (\d+)`,
      F`[Tt]here are (\d+) [a-z ]+ in the (?:school|town|city|district)`
    ]) {
      const m = p.match(rx(pattern));
      if (m) pops.push(num(m, 1));
    }
    if (!pops.length) return null;
    if (pops.some((v) => v !== pops[0])) return null;
    const N = pops[0];
    if (!(n > 0 && k >= 0 && k <= n && N > n)) return null;
    return (k / n) * N;
  },
  t_ar_sampling_scale_fence_cost(p) {
    const m = p.match(
      rx(F`scale of 1 cm : (\d+(?:\.\d+)?) m\. The drawing has a perimeter of (\d+(?:\.\d+)?) cm\..*costs \$(\d+(?:\.\d+)?) per meter`)
    );
    return m ? num(m, 2) * num(m, 1) * num(m, 3) : null;
  },
  t_ar_sampling_supporters_plus_fence_cost(p) {
    const dm = p.match(
      rx(F`scale drawing of a rectangular park has dimensions (\d+(?:\.\d+)?) cm by (\d+(?:\.\d+)?) cm\. The scale is 1 cm : (\d+(?:\.\d+)?) m\.`)
    );
    const cm = p.match(rx(F`cost of fencing is \$(\d+(?:\.\d+)?) per meter`));
    const sm = p.match(rx(F`random sample of (\d+) residents found that (\d+) support`));
    const tm = p.match(rx(F`town has (\d+) residents`));
    if (!dm || !cm || !sm || !tm) return null;
    const scale = num(dm, 3);
    const perimeter = 2 * (num(dm, 1) + num(dm, 2)) * scale;
    const supporters = (num(sm, 2) / num(sm, 1)) * num(tm, 1);
    return supporters + perimeter * num(cm, 1);
  },
  t_ar_sampling_t_statistic(p) {
    if (/two-sample|two samples|second sample|population proportion|paired/.test(p)) return null;
    if (/p-value|critical value|confidence interval|margin of error|degrees of freedom/.test(p)) return null;
    const nm = p.match(rx(F`random sample of (\d+)`)) || p.match(rx(F`tests (\d+) [a-z]+`));
    const xm = p.match(rx(F`mean (?:[a-z]+ ){0,2}of (-?\d+(?:\.\d+)?)`));
    const sm = p.match(rx(F`standard deviation of (-?\d+(?:\.\d+)?)`));
    if (!nm || !xm || !sm) return null;
    const mus = [];
    for (const pattern of [
      F`by at least (-?\d+(?:\.\d+)?)%`,
      F`claims that the average [a-z ]+ is (-?\d+(?:\.\d+)?)`,
      F`H0: (?:μ|mu) = (-?\d+(?:\.\d+)?)`
    ]) {
      const m = p.match(rx(pattern));
      if (m) mus.push(num(m, 1));
    }
    if (!mus.length || mus.some((v) => v !== mus[0])) return null;
    const n = num(nm, 1);
    const s = num(sm, 1);
    if (!(n > 1 && s > 0)) return null;
    return (num(xm, 1) - mus[0]) / (s / Math.sqrt(n));
  },
  t_ar_scale_drawing_area(p) {
    const s = p.match(rx(F`1 (cm|inches|inch|in|mm) (?::|represents) (\d+(?:\.\d+)?) (?:m|meters|metres|km|kilometers|feet|ft|yards)\b`));
    if (!s) return null;
    const k = Number(s[2]);
    const du = s[1];
    const head = p.match(rx(F`^(.*?)\. What is the (?:actual area of the [a-z]+|area of the actual [a-z]+) in square [a-z]+\?`));
    if (!head) return null;
    const seg = head[1];
    const pats = [
      rx(F`(\d+(?:\.\d+)?) ${du} long and (\d+(?:\.\d+)?) ${du} wide$`),
      rx(F`(\d+(?:\.\d+)?) ${du} by (\d+(?:\.\d+)?) ${du}$`),
      rx(F`length (?:of |is )?(\d+(?:\.\d+)?) ${du} and (?:a |the )?width (?:of |is )?(\d+(?:\.\d+)?) ${du}$`)
    ];
    for (const pat of pats) {
      const d = seg.match(pat);
      if (d) return k * Number(d[1]) * (k * Number(d[2]));
    }
    return null;
  },
  t_ar_scale_drawing_fence_cost(p) {
    if (/gate|strand|residents|expression|perimeter of \d/.test(p)) return null;
    if (!/(?:What is the total cost of the fence|How much will it cost to fence the entire [a-z]+|How much will the fencing cost)/.test(p)) return null;
    const s = p.match(rx(F`1 (cm|inch|inches|in) : (\d+(?:\.\d+)?) (?:m|meters|metres|feet|ft)\b`));
    if (!s) return null;
    const k = Number(s[2]);
    const du = s[1];
    const c = p.match(rx(F`(?:costs|cost of fencing is|costs about) \$(\d+(?:\.\d+)?) per (?:meter|metre|foot|ft)`));
    if (!c) return null;
    const pats = [
      rx(F`(?:a )?length of (\d+(?:\.\d+)?) ${du} and a width of (\d+(?:\.\d+)?) ${du}`),
      rx(F`length (\d+(?:\.\d+)?) ${du} and width (\d+(?:\.\d+)?) ${du}`),
      rx(F`dimensions (\d+(?:\.\d+)?) ${du} by (\d+(?:\.\d+)?) ${du}`),
      rx(F`measures (\d+(?:\.\d+)?) ${du} by (\d+(?:\.\d+)?) ${du}`),
      rx(F`is (\d+(?:\.\d+)?) ${du} long and (\d+(?:\.\d+)?) ${du} wide`)
    ];
    for (const pat of pats) {
      const d = p.match(pat);
      if (d) return 2 * (k * Number(d[1]) + k * Number(d[2])) * Number(c[1]);
    }
    return null;
  },
  t_ar_slope_invariant_image(p) {
    const m = p.match(rx(F`points [A-Z]?\((-?\d+), (-?\d+)\) and [A-Z]?\((-?\d+), (-?\d+)\)\.(.*)$`));
    if (!m) return null;
    const rest = m[5];
    if (/reflect|rotat|across|stretch|shear|y = x/.test(rest)) return null;
    if (!/(?:is translated|a translation|translation of|dilation centered at the origin)/.test(rest)) return null;
    if (!/(?:What is|Find|what is|find) the slope of (?:the (?:resulting|image|translated|new) line|the image line|the image of the line)/.test(rest)) return null;
    const dx = num(m, 3) - num(m, 1);
    if (dx === 0) return null;
    return (num(m, 4) - num(m, 2)) / dx;
  },
  t_ar_submarine_elevation(p) {
    const base = p.match(rx(F`submarine is at an elevation of (-\d+(?:\.\d+)?) (meters|feet|metres|ft|m)\b`));
    if (!base) return null;
    const e = num(base, 1);
    const u = base[2];
    let m = p.match(rx(F`It descends another (\d+(?:\.\d+)?) ${u}\. What is its (?:new|final) elevation`));
    if (m) return e - num(m, 1);
    m = p.match(rx(F`It ascends (\d+(?:\.\d+)?) ${u},? (?:and )?then descends (\d+(?:\.\d+)?) ${u}\. What is (?:its|the submarine's) (?:new |final )?elevation`));
    if (m) return e + num(m, 1) - num(m, 2);
    m = p.match(
      rx(F`It descends at a constant rate of (\d+(?:\.\d+)?) ${u} per minute\. After (\d+(?:\.\d+)?) minutes, what is (?:its|the submarine's) elevation`)
    );
    if (m) return e - num(m, 1) * num(m, 2);
    return null;
  },
  t_ar_triangle_abc_acd_area_probability(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`CD is (?:perpendicular to AB|the altitude)`).test(p)) return null;
    const m = p.match(
      rx(F`AD = (\d+(?:\.\d+)?) and DB = (\d+(?:\.\d+)?), find the probability that a point chosen uniformly at random inside triangle ABC lies in triangle ACD`)
    );
    return m ? num(m, 1) / (num(m, 1) + num(m, 2)) : null;
  },
  t_ar_triangle_abc_altitude_from_hyp_leg(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`CD is (?:perpendicular to AB|the altitude)`).test(p)) return null;
    if (!rx(F`(?:Find|What is) the length of CD`).test(p)) return null;
    if (rx(F`(?:AC = |length of (?:side |leg )?AC is )\d`).test(p)) return null;
    const ab = p.match(rx(F`(?:AB = |length of (?:the )?(?:hypotenuse |side |leg )?AB is )(\d+(?:\.\d+)?)`));
    const bc = p.match(rx(F`(?:BC = |length of (?:side |leg )?BC is )(\d+(?:\.\d+)?)`));
    if (!ab || !bc) return null;
    const hyp = num(ab, 1);
    const leg = num(bc, 1);
    if (!(hyp > leg)) return null;
    return (leg * Math.sqrt(hyp * hyp - leg * leg)) / hyp;
  },
  t_ar_triangle_abc_altitude_from_legs(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`CD is (?:perpendicular to AB|the altitude)`).test(p)) return null;
    if (!rx(F`(?:Find|What is) the length of CD`).test(p)) return null;
    const ac = p.match(rx(F`(?:AC = |length of (?:side |leg )?AC is )(\d+(?:\.\d+)?)`));
    const bc = p.match(rx(F`(?:BC = |length of (?:side |leg )?BC is )(\d+(?:\.\d+)?)`));
    if (!ac || !bc) return null;
    if (rx(F`(?:AB = |length of (?:the )?(?:hypotenuse |side |leg )?AB is )\d`).test(p)) return null;
    const legA = num(ac, 1);
    const legB = num(bc, 1);
    return (legA * legB) / Math.hypot(legA, legB);
  },
  t_ar_triangle_abc_altitude_geometric_mean(p) {
    if (!/right angle|angle C is right|right triangle|angle C is 90°/.test(p)) return null;
    if (!/altitude|perpendicular to AB/.test(p)) return null;
    let m = p.match(rx(F`AD = (\d+(?:\.\d+)?) and DB = (\d+(?:\.\d+)?), (?:find|what is) the length of CD`));
    if (!m) {
      m = p.match(
        rx(F`altitude from C to hypotenuse AB divides AB into segments of lengths (\d+(?:\.\d+)?) cm and (\d+(?:\.\d+)?) cm\. Find the length of the altitude`)
      );
    }
    return m ? Math.sqrt(num(m, 1) * num(m, 2)) : null;
  },
  t_ar_triangle_abc_angle_bisector_bd(p) {
    const m = p.match(
      rx(F`In triangle ABC, AB = (\d+(?:\.\d+)?), BC = (\d+(?:\.\d+)?), and angle B = 90°\. Point D lies on BC such that AD bisects angle BAC\. Find the length of BD`)
    );
    if (!m) return null;
    const ab = num(m, 1);
    const bc = num(m, 2);
    return (bc * ab) / (ab + Math.hypot(ab, bc));
  },
  t_ar_triangle_abc_cos_a_from_sin_a(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    const m = p.match(rx(F`sin A = (\d+(?:\.\d+)?)/(\d+(?:\.\d+)?), (?:find|what is) cos A`));
    if (!m) return null;
    const sinA = num(m, 1) / num(m, 2);
    return sinA > 0 && sinA < 1 ? Math.sqrt(1 - sinA * sinA) : null;
  },
  t_ar_triangle_abc_cos_b_from_sin_a(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    const m = p.match(rx(F`sin A = (\d+(?:\.\d+)?)/(\d+(?:\.\d+)?), (?:find|what is) cos B`));
    if (!m) return null;
    const sinA = num(m, 1) / num(m, 2);
    return sinA > 0 && sinA < 1 ? sinA : null;
  },
  t_ar_triangle_abc_hyp_segment_ad(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`CD is (?:perpendicular to AB|the altitude to the hypotenuse)`).test(p)) return null;
    if (!rx(F`(?:Find|What is) the length of AD`).test(p)) return null;
    const ab = p.match(rx(F`(?:AB = |length of (?:the )?(?:hypotenuse |side |leg )?AB is )(\d+(?:\.\d+)?)`));
    const bc = p.match(rx(F`(?:BC = |length of (?:side |leg )?BC is )(\d+(?:\.\d+)?)`));
    if (!ab || !bc) return null;
    const hyp = num(ab, 1);
    const leg = num(bc, 1);
    if (!(hyp > leg)) return null;
    return (hyp * hyp - leg * leg) / hyp;
  },
  t_ar_triangle_abc_hypotenuse_c(p) {
    const m = p.match(
      rx(F`angle C is the right angle\. Side a = (\d+(?:\.\d+)?) and side b = (\d+(?:\.\d+)?)\. Find the length of the hypotenuse c`)
    );
    return m ? Math.hypot(num(m, 1), num(m, 2)) : null;
  },
  t_ar_triangle_abc_law_of_sines_bc(p) {
    const m = p.match(
      rx(F`In triangle ABC, angle A is (\d+(?:\.\d+)?)°, angle B is (\d+(?:\.\d+)?)°, and side AB (?:is|=) (\d+(?:\.\d+)?)(?: cm)?\. (?:Find|What is) the length of side BC`)
    );
    if (!m) return null;
    const angleA = num(m, 1);
    const angleB = num(m, 2);
    const angleC = 180 - angleA - angleB;
    if (angleA <= 0 || angleB <= 0 || angleC <= 0) return null;
    const rad = Math.PI / 180;
    const value = (num(m, 3) * Math.sin(angleA * rad)) / Math.sin(angleC * rad);
    return /nearest tenth/.test(p) ? Math.round(value * 10) / 10 : value;
  },
  t_ar_triangle_abc_leg_from_difference(p) {
    const m = p.match(
      rx(F`length of leg AC is (\d+(?:\.\d+)?) units longer than leg BC\. The hypotenuse AB is (\d+(?:\.\d+)?) units\. What is the length of leg BC`)
    );
    if (!m) return null;
    const diff = num(m, 1);
    const hyp = num(m, 2);
    const disc = 2 * hyp * hyp - diff * diff;
    if (disc < 0) return null;
    const value = (Math.sqrt(disc) - diff) / 2;
    return value > 0 ? value : null;
  },
  t_ar_triangle_abc_missing_leg_ac(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`(?:Find|What is) the length of side AC`).test(p)) return null;
    const ab = p.match(rx(F`(?:AB = |length of (?:the )?(?:hypotenuse |side |leg )?AB is )(\d+(?:\.\d+)?)`));
    const bc = p.match(rx(F`(?:BC = |length of (?:side |leg )?BC is )(\d+(?:\.\d+)?)`));
    if (!ab || !bc) return null;
    const hyp = num(ab, 1);
    const leg = num(bc, 1);
    if (!(hyp > leg)) return null;
    return Math.sqrt(hyp * hyp - leg * leg);
  },
  t_ar_triangle_abc_parallel_bisector_de(p) {
    const m = p.match(
      rx(F`In triangle ABC, angle A is (\d+(?:\.\d+)?)°, angle B is (\d+(?:\.\d+)?)°, and side AB (?:is|=) (\d+(?:\.\d+)?)(?: cm)?\. A point D lies on BC such that AD is the angle bisector of angle A\. A point E lies on AC such that DE is parallel to AB\. Find the length of DE`)
    );
    if (!m) return null;
    const angleA = num(m, 1);
    const angleB = num(m, 2);
    const angleC = 180 - angleA - angleB;
    if (angleA <= 0 || angleB <= 0 || angleC <= 0) return null;
    const rad = Math.PI / 180;
    const ab = num(m, 3);
    const ac = (ab * Math.sin(angleB * rad)) / Math.sin(angleC * rad);
    return (ab * ac) / (ab + ac);
  },
  t_ar_triangle_abc_sin_a(p) {
    if (!/angle C is 90°|angle C is a right angle|angle C is the right angle|right angle at C/.test(p)) return null;
    if (!rx(F`(?:Find|What is)(?: the value of)? sin A`).test(p)) return null;
    const ab = p.match(rx(F`(?:AB = |length of (?:the )?(?:hypotenuse |side |leg )?AB is )(\d+(?:\.\d+)?)`));
    const bc = p.match(rx(F`(?:BC = |length of (?:side |leg )?BC is )(\d+(?:\.\d+)?)`));
    if (!ab || !bc) return null;
    const hyp = num(ab, 1);
    const opp = num(bc, 1);
    if (!(hyp > opp)) return null;
    return opp / hyp;
  },
  t_ar_triangle_abc_third_angle(p) {
    const m = p.match(rx(F`In triangle ABC, angle A is (\d+(?:\.\d+)?)° and angle B is (\d+(?:\.\d+)?)°\.`));
    if (!m) return null;
    const angleC = 180 - num(m, 1) - num(m, 2);
    if (angleC <= 0) return null;
    if (rx(F`What is the measure of angle C`).test(p)) return angleC;
    if (rx(F`triangle DEF is similar to triangle ABC\. What is the measure of angle F in triangle DEF`).test(p)) return angleC;
    return null;
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
  t_unit_rate: /unit rate|per hour/,
  t_ar_altitude_to_hypotenuse: /length of CD/,
  t_ar_bestfit_exponential_residual: /(?:Calculate|Compute) the residual at t/,
  t_ar_bestfit_predict_score: /predicted test score/,
  t_ar_circle_arc_length_radius: /(?:[Ff]ind|What is) the radius of the circle/,
  t_ar_circle_arc_probability: /probability that the point lies on the intercepted arc/,
  t_ar_circle_chord_center_distance: /(?:[Ff]ind|What is) the distance from (?:the )?(?:cent(?:er|re)|O)(?: of the circle)?(?: O)? to (?:the )?chord/,
  t_ar_circle_chord_diameter_leg: /length of BC/,
  t_ar_circle_chord_radius: /(?:F|f)ind the radius of the circle|What is the radius of the circle/,
  t_ar_circle_eq_center_x: /x-coordinate of the center/,
  t_ar_circle_eq_center_y: /y-coordinate of the center/,
  t_ar_circle_eq_radius: /radius of the circle/,
  t_ar_circle_inscribed_angle: /inscribed angle that intercepts the same arc/,
  t_ar_circle_scaled_central_angle: /measure of the central angle in the second circle that intercepts an arc of the same length/,
  t_ar_circle_sector_area_pi314: /area of the sector formed by this angle/,
  t_ar_claims_t_stat_mean_claim: /test statistic/,
  t_ar_claims_t_stat_pct_increase: /test statistic/,
  t_ar_conditional_two_color_draw: /probability/,
  t_ar_enlarged_rectangle_area: /enlarged rectangle/,
  t_ar_field_trip_budget: /maximum number of students|how many students went/,
  t_ar_garden_width_from_area: /width of the garden/,
  t_ar_given_conditional_percent: /probability/,
  t_ar_growth_damped_cos_reach: /first positive time/,
  t_ar_growth_doubling_period_k: /What is the value of k/,
  t_ar_growth_doubling_population: /population after \d+(?:\.\d+)? hours/,
  t_ar_growth_exp_avg_rate: /average rate of change/,
  t_ar_growth_exp_exceeds_seasonal_max: /maximum of the seasonal model/,
  t_ar_growth_exp_reach_time: /how many .* will the population reach/,
  t_ar_growth_exp_reach_year: /Find the year when the population reaches/,
  t_ar_growth_match_exp_rate: /value of k/,
  t_ar_growth_seasonal_exp_intersect: /same population|populations equal/,
  t_ar_growth_seasonal_max: /(?:What is|Find|Determine) the maximum population/,
  t_ar_growth_two_exp_intersect: /same population/,
  t_ar_hypotenuse_plain_legs: /hypotenuse/,
  t_ar_legs_offset_hypotenuse: /positive value of x|shorter leg/,
  t_ar_map_scale_distance: /actual distance/,
  t_ar_mean_labeled_list: /mean/,
  t_ar_median_labeled_list: /median/,
  t_ar_miles_per_gallon_scale: /At this rate/,
  t_ar_pack_unit_price: /At this rate/,
  t_ar_parabola_a_from_vertex_point: /value of a\b/,
  t_ar_perp_slope_two_points: /perpendicular/,
  t_ar_prism_surface_area: /surface area/,
  t_ar_prism_volume_lwh: /volume/,
  t_ar_profit_poly_accumulated: /total (?:accumulated profit|profit accumulated)/,
  t_ar_profit_poly_argmax: /maximiz|maximum profit|at a maximum/,
  t_ar_profit_poly_argmax_units: /maximizes profit|yields the maximum profit/,
  t_ar_profit_poly_break_even_year: /break even/,
  t_ar_profit_poly_fastest_decrease: /decreasing most rapidly/,
  t_ar_profit_poly_fastest_increase: /increasing most rapidly/,
  t_ar_profit_poly_first_below_year: /first fall below/,
  t_ar_profit_poly_max_value: /maximum (?:daily |weekly |monthly )?profit/,
  t_ar_profit_poly_max_value_dollars: /maximum (?:daily |weekly |monthly )?profit in dollars/,
  t_ar_profit_poly_max_year: /which year|year when the profit/,
  t_ar_projectile_ground_time: /hits the ground/,
  t_ar_projectile_height_at_time: /height of the ball after/,
  t_ar_projectile_max_height: /maximum height/,
  t_ar_projectile_time_at_max: /maximum height/,
  t_ar_recipe_ratio: /how many cups/i,
  t_ar_recipe_scale_count: /how many cups/i,
  t_ar_rect_width_from_perimeter: /width/,
  t_ar_rectangle_area_lw: /area/,
  t_ar_rectangle_perimeter_lw: /perimeter/,
  t_ar_sampling_population_estimate: /[Ee]stimate|about how many|would you expect/,
  t_ar_sampling_scale_fence_cost: /total cost/,
  t_ar_sampling_supporters_plus_fence_cost: /sum of the estimated number of supporters and the fencing cost/,
  t_ar_sampling_t_statistic: /test statistic/,
  t_ar_scale_drawing_area: /actual area/,
  t_ar_scale_drawing_fence_cost: /cost of the fenc|cost to fence|fencing cost/,
  t_ar_slope_invariant_image: /slope of the (?:resulting|image|translated|new) line|slope of the image of the line/,
  t_ar_submarine_elevation: /elevation/,
  t_ar_triangle_abc_acd_area_probability: /probability/,
  t_ar_triangle_abc_altitude_from_hyp_leg: /length of CD/,
  t_ar_triangle_abc_altitude_from_legs: /length of CD/,
  t_ar_triangle_abc_altitude_geometric_mean: /length of (?:CD|the altitude)/,
  t_ar_triangle_abc_angle_bisector_bd: /length of BD/,
  t_ar_triangle_abc_cos_a_from_sin_a: /cos A/,
  t_ar_triangle_abc_cos_b_from_sin_a: /cos B/,
  t_ar_triangle_abc_hyp_segment_ad: /length of AD/,
  t_ar_triangle_abc_hypotenuse_c: /hypotenuse c/,
  t_ar_triangle_abc_law_of_sines_bc: /length of side BC/,
  t_ar_triangle_abc_leg_from_difference: /length of leg BC/,
  t_ar_triangle_abc_missing_leg_ac: /length of side AC/,
  t_ar_triangle_abc_parallel_bisector_de: /length of DE/,
  t_ar_triangle_abc_sin_a: /sin A/,
  t_ar_triangle_abc_third_angle: /measure of angle/
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
// ("...= 26? Wait recalc: ..." or "...= 26? Actually -128+240=112...").
// Student-visible fields must never carry it.
const LEAK_RE =
  /\bwait,|\bwait no\b|\bwait recalc|\brecalc\b|\brecompute\b|\bhmm\b|\boops\b|let me re|let's re-?c|\?\s*actually\b|\bactually,? that(?:'s| is) (?:not )?(?:correct|right|wrong)\b|\bscratch that\b|\bon second thought\b/i;

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
