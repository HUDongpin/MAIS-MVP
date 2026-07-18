#!/usr/bin/env node
/**
 * Print the adaptive-engine evaluation report (plan item P2-2).
 * Compiles the TS eval module on the fly via the repo's tsx-free tsc harness is
 * unnecessary here — this runner imports the compiled output produced by
 * `npm run eval:adaptive`. Kept tiny: format the AdaptiveEvalReport for humans.
 */
import { runAdaptiveEval } from "../.tmp/adaptive-eval/lib/adaptiveLearningEval.js";

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
if (!allPassed) {
  console.error("Adaptive eval: one or more checks FAILED");
  process.exit(1);
}
console.log("Adaptive eval: all checks passed\n");
