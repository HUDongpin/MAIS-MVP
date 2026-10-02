import { numericCorrectionAnswer } from "./arkansas-correctness-solvers.mjs";

// Only an entire, conventionally grouped numeric alias may lose its commas.
// Every other form retains the frozen correction parser's fail-closed result.
const GROUPED_ALIAS = /^\$?-?[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?(?:\s*(?:cm|months?|years?|dollars?))?$/iu;

export function numericCorrectionAuditAlias(answer) {
  const raw = String(answer).trim();
  return numericCorrectionAnswer(GROUPED_ALIAS.test(raw) ? raw.replaceAll(",", "") : answer);
}
