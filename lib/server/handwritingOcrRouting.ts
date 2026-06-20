import type { HandwritingRecognitionProvider } from "../handwritingRecognition";

export type HandwritingOcrRoutingCandidate = {
  text: string;
  confidence: number | null;
  provider: HandwritingRecognitionProvider;
};

export type SimpletexRoutingAssessment = {
  canAutoAccept: boolean;
  shouldUpgradeToMathpix: boolean;
  reasons: string[];
};

export type RoutedCandidateSelection = {
  candidate: HandwritingOcrRoutingCandidate;
  forceReview: boolean;
  reason?: string;
};

const defaultSimpletexAutoAcceptConfidence = 0.88;
const decimalCommaTokenPattern = /\d+(?:,\d+)+/g;
const thousandsSeparatorPattern = /^\d{1,3}(?:,\d{3})+$/;
const variablePattern = /[A-Za-z]/;
const mathStructurePattern = /[=+\-*/^()]|sqrt\(/;
const suspiciousSingleDigitDotPattern = /(^|[=+\-*/(])[1-9]\.[1-9]($|[=+\-*/^)])/;
const repeatedDecimalDotPattern = /\d\.\d+\.\d/;
const longNumericEquationPattern = /^[0-9+\-*/^=().]+$/;

export function normalizeOcrDecimalSeparators(value: string) {
  return value.replace(decimalCommaTokenPattern, (token) => {
    if (!token.startsWith("0,") && thousandsSeparatorPattern.test(token)) return token;
    return token.replace(/,/g, ".");
  });
}

export function assessSimpletexRouting(
  candidate: HandwritingOcrRoutingCandidate,
  options: {
    autoAcceptConfidence?: number;
  } = {}
): SimpletexRoutingAssessment {
  const autoAcceptConfidence = options.autoAcceptConfidence ?? defaultSimpletexAutoAcceptConfidence;
  const text = candidate.text.trim();
  const reasons: string[] = [];

  if (candidate.confidence === null) {
    reasons.push("missing-confidence");
  } else if (candidate.confidence < autoAcceptConfidence) {
    reasons.push("low-confidence");
  }

  if (hasSuspiciousMultiplicationDot(text)) {
    reasons.push("possible-multiplication-dot");
  }

  if (looksLikeLostVariableEquation(text)) {
    reasons.push("possible-lost-variable");
  }

  const canAutoAccept = text.length > 0
    && candidate.confidence !== null
    && candidate.confidence >= autoAcceptConfidence
    && reasons.length === 0;

  return {
    canAutoAccept,
    shouldUpgradeToMathpix: shouldUpgradeToMathpix(text, canAutoAccept, reasons),
    reasons
  };
}

export function selectRoutedHandwritingCandidate({
  simpletex,
  mathpix,
  simpletexAssessment,
  simpletexAutoAcceptConfidence = defaultSimpletexAutoAcceptConfidence,
  mathpixAutoAcceptConfidence = 0.7
}: {
  simpletex: HandwritingOcrRoutingCandidate;
  mathpix: HandwritingOcrRoutingCandidate | null;
  simpletexAssessment: SimpletexRoutingAssessment;
  simpletexAutoAcceptConfidence?: number;
  mathpixAutoAcceptConfidence?: number;
}): RoutedCandidateSelection {
  if (!mathpix) {
    return {
      candidate: simpletex,
      forceReview: !simpletexAssessment.canAutoAccept,
      reason: simpletexAssessment.canAutoAccept ? undefined : reviewReason(simpletexAssessment.reasons)
    };
  }

  if (simpletex.text === mathpix.text) {
    const mathpixIsMoreConfident = confidenceValue(mathpix) > confidenceValue(simpletex);
    const candidate = mathpixIsMoreConfident ? mathpix : simpletex;
    return {
      candidate,
      forceReview: !canAutoAccept(candidate, candidate.provider === "mathpix" ? mathpixAutoAcceptConfidence : simpletexAutoAcceptConfidence),
      reason: undefined
    };
  }

  if (
    simpletexAssessment.reasons.includes("possible-multiplication-dot")
    && containsMultiplicationSymbol(mathpix.text)
    && !hasSuspiciousMultiplicationDot(mathpix.text)
  ) {
    return {
      candidate: mathpix,
      forceReview: !canAutoAccept(mathpix, mathpixAutoAcceptConfidence),
      reason: "Mathpix resolved a likely multiplication-symbol confusion."
    };
  }

  if (
    simpletexAssessment.reasons.includes("possible-lost-variable")
    && !containsVariable(simpletex.text)
    && containsVariable(mathpix.text)
  ) {
    return {
      candidate: mathpix,
      forceReview: !canAutoAccept(mathpix, mathpixAutoAcceptConfidence),
      reason: "Mathpix restored a likely variable token."
    };
  }

  return {
    candidate: simpletex,
    forceReview: true,
    reason: "SimpleTex and Mathpix disagree; ask the learner to confirm the candidate."
  };
}

function shouldUpgradeToMathpix(text: string, canAutoAcceptSimpletex: boolean, reasons: string[]) {
  if (canAutoAcceptSimpletex) return false;
  if (reasons.includes("possible-multiplication-dot")) return true;
  if (reasons.includes("possible-lost-variable")) return true;
  return mathStructurePattern.test(text);
}

function hasSuspiciousMultiplicationDot(text: string) {
  return repeatedDecimalDotPattern.test(text) || suspiciousSingleDigitDotPattern.test(text);
}

function looksLikeLostVariableEquation(text: string) {
  return text.includes("=")
    && text.length >= 14
    && !containsVariable(text)
    && longNumericEquationPattern.test(text);
}

function containsVariable(text: string) {
  return variablePattern.test(text.replace(/\\[A-Za-z]+/g, ""));
}

function containsMultiplicationSymbol(text: string) {
  return text.includes("*");
}

function canAutoAccept(candidate: HandwritingOcrRoutingCandidate, threshold: number) {
  return candidate.text.trim().length > 0
    && candidate.confidence !== null
    && candidate.confidence >= threshold;
}

function confidenceValue(candidate: HandwritingOcrRoutingCandidate) {
  return candidate.confidence ?? -1;
}

function reviewReason(reasons: string[]) {
  if (!reasons.length) return "Recognition requires review before auto-filling.";
  return `Recognition requires review: ${reasons.join(", ")}.`;
}
