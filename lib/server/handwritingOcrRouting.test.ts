import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSimpletexRouting,
  normalizeOcrDecimalSeparators,
  selectRoutedHandwritingCandidate,
  type HandwritingOcrRoutingCandidate
} from "./handwritingOcrRouting";

function candidate(
  provider: HandwritingOcrRoutingCandidate["provider"],
  text: string,
  confidence: number | null
): HandwritingOcrRoutingCandidate {
  return { provider, text, confidence };
}

test("OCR decimal comma normalization fixes handwritten decimal outputs without rewriting thousands separators", () => {
  assert.equal(normalizeOcrDecimalSeparators("0,9+0,1"), "0.9+0.1");
  assert.equal(normalizeOcrDecimalSeparators("0,123+0"), "0.123+0");
  assert.equal(normalizeOcrDecimalSeparators("1,34+5,67"), "1.34+5.67");
  assert.equal(normalizeOcrDecimalSeparators("1,000+2"), "1,000+2");
});

test("clean high-confidence SimpleTex candidate stays on the cheaper primary channel", () => {
  const assessment = assessSimpletexRouting(candidate("simpletex", "52+100", 0.94));

  assert.equal(assessment.canAutoAccept, true);
  assert.equal(assessment.shouldUpgradeToMathpix, false);
  assert.deepEqual(assessment.reasons, []);
});

test("SimpleTex candidate with likely multiplication-dot confusion upgrades to Mathpix", () => {
  const assessment = assessSimpletexRouting(candidate("simpletex", "2+2.2", null));

  assert.equal(assessment.canAutoAccept, false);
  assert.equal(assessment.shouldUpgradeToMathpix, true);
  assert.ok(assessment.reasons.includes("missing-confidence"));
  assert.ok(assessment.reasons.includes("possible-multiplication-dot"));
});

test("normalized leading-zero decimals do not trigger Mathpix upgrade by themselves", () => {
  const assessment = assessSimpletexRouting(candidate("simpletex", normalizeOcrDecimalSeparators("0,9+0,1"), 0.93));

  assert.equal(assessment.canAutoAccept, true);
  assert.equal(assessment.shouldUpgradeToMathpix, false);
});

test("long numeric equation without variables upgrades because SimpleTex may have dropped a variable", () => {
  const assessment = assessSimpletexRouting(candidate("simpletex", "901+315=3020-274027", 0.91));

  assert.equal(assessment.canAutoAccept, false);
  assert.equal(assessment.shouldUpgradeToMathpix, true);
  assert.ok(assessment.reasons.includes("possible-lost-variable"));
});

test("Mathpix is selected when it resolves a SimpleTex multiplication-symbol risk", () => {
  const simpletex = candidate("simpletex", "73/4+(3.3)", null);
  const assessment = assessSimpletexRouting(simpletex);
  const selected = selectRoutedHandwritingCandidate({
    simpletex,
    mathpix: candidate("mathpix", "73/4+(3*3)", 0.97),
    simpletexAssessment: assessment
  });

  assert.equal(selected.candidate.provider, "mathpix");
  assert.equal(selected.candidate.text, "73/4+(3*3)");
  assert.equal(selected.forceReview, false);
});

test("Mathpix is selected when it restores a likely missing variable", () => {
  const simpletex = candidate("simpletex", "901+315=3020-274027", 0.91);
  const assessment = assessSimpletexRouting(simpletex);
  const selected = selectRoutedHandwritingCandidate({
    simpletex,
    mathpix: candidate("mathpix", "901+315=302a-274027", 1),
    simpletexAssessment: assessment
  });

  assert.equal(selected.candidate.provider, "mathpix");
  assert.equal(selected.candidate.text, "901+315=302a-274027");
  assert.equal(selected.forceReview, false);
});

test("provider disagreement stays in review when Mathpix does not resolve a specific risk", () => {
  const simpletex = candidate("simpletex", "26*3", 0.6);
  const assessment = assessSimpletexRouting(simpletex);
  const selected = selectRoutedHandwritingCandidate({
    simpletex,
    mathpix: candidate("mathpix", ".263", 0.99),
    simpletexAssessment: assessment
  });

  assert.equal(selected.candidate.provider, "simpletex");
  assert.equal(selected.forceReview, true);
});

test("LaTeX command text is not treated as a restored variable", () => {
  const simpletex = candidate("simpletex", "901+315=3020-274027", 0.91);
  const assessment = assessSimpletexRouting(simpletex);
  const selected = selectRoutedHandwritingCandidate({
    simpletex,
    mathpix: candidate("mathpix", "901+315=-1,-\\ldots-\\ldots,47.15+", 0.99),
    simpletexAssessment: assessment
  });

  assert.equal(selected.candidate.provider, "simpletex");
  assert.equal(selected.forceReview, true);
});
