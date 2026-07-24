#!/usr/bin/env node
/**
 * Print the adaptive-engine evaluation report (plan item P2-2).
 * Compiles the TS eval module on the fly via the repo's tsx-free tsc harness is
 * unnecessary here — this runner imports the compiled output produced by
 * `npm run eval:adaptive`. Kept tiny: format the AdaptiveEvalReport for humans.
 */
import { runAdaptiveEval, runSustainedMasteryComparison } from "../.tmp/adaptive-eval/lib/adaptiveLearningEval.js";

const report = runAdaptiveEval();

console.log("\nAdaptive engine evaluation (BKT core) — deterministic\n");
console.log(`  mastery threshold: ${report.masteryThreshold}`);
console.log(
  `  diligent   (p=${report.diligent.trueMastery}): mastery at step ${report.diligent.reachedMasteryAtStep}` +
    ` — final pMastery ${report.diligent.finalPMastery.toFixed(3)}`
);
console.log(
  `  persistent-wrong        : mastery at step ${report.persistentWrong.reachedMasteryAtStep ?? "never"}` +
    ` — final pMastery ${report.persistentWrong.finalPMastery.toFixed(3)}`
);
console.log(`  consecutive-correct to mastery: ${report.streakToMastery}`);
console.log(
  `  monotonicity: correct ${report.monotonicity.correctPMastery.toFixed(3)} > wrong ` +
    `${report.monotonicity.wrongPMastery.toFixed(3)} = ${report.monotonicity.correctRaisesAboveWrong}`
);
console.log("\n  checks:");
let allPassed = true;
for (const check of report.checks) {
  allPassed = allPassed && check.passed;
  console.log(`   ${check.passed ? "✓" : "✗"} ${check.description}`);
  console.log(`       ${check.detail}`);
}
if (report.findings.length > 0) {
  console.log("\n  findings (calibration, A15/A16 review — not pass/fail):");
  for (const finding of report.findings) console.log(`   • ${finding}`);
}
console.log("");

// Mastery-confirmation gate — CI guard on the shipped isMasteryConfirmed rule
// (pMastery >= threshold AND correctStreak >= confirmationStreak). Shows the
// false- vs true-mastery tradeoff across confirmation-streak sizes.
const sustained = runSustainedMasteryComparison();
console.log(
  `Mastery-confirmation gate (shipped streak=${sustained.confirmationStreak}) — P(mastered within ${sustained.horizon} attempts)\n`
);
const label = (s) => (s === 1 ? "current" : `streak-${s}`);
console.log(`  true p  | ${sustained.streaks.map((s) => label(s).padStart(9)).join(" | ")}`);
for (const row of sustained.rows) {
  const cells = sustained.streaks.map((s) => `${(row.probByStreak[s] * 100).toFixed(1)}%`.padStart(9)).join(" | ");
  const tag = row.trueP <= 0.5 ? "  non-master" : row.trueP >= 0.85 ? "  true master" : "";
  console.log(`   ${row.trueP.toFixed(2)}   | ${cells}${tag}`);
}
console.log(
  `\n  diligent (p=0.95) E[step|mastered]: ` +
    sustained.streaks.map((s) => `${label(s)}=${sustained.diligentExpectedStep[s]?.toFixed(1)}`).join("  ")
);
console.log("\n  checks:");
for (const check of sustained.checks) {
  allPassed = allPassed && check.passed;
  console.log(`   ${check.passed ? "✓" : "✗"} ${check.description}`);
  console.log(`       ${check.detail}`);
}
console.log(`\n  recommendation: ${sustained.recommendation}\n`);

if (!allPassed) {
  console.error("Adaptive eval: one or more checks FAILED");
  process.exit(1);
}
console.log("Adaptive eval: all checks passed\n");
