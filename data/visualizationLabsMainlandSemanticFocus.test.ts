import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  mainlandNarrowedSemanticPromiseLabIds,
  visualizationLabByLabId
} from "./visualizationLabs";
import { topics } from "./topics";

type OracleEntry = {
  labId: string;
};

type SemanticOracle = {
  entries: OracleEntry[];
};

const oracle = JSON.parse(
  readFileSync(
    new URL("../coordination/content-qa/mainland-visualization-semantic-oracle.v1.json", import.meta.url),
    "utf8"
  )
) as SemanticOracle;

const oracleIds = oracle.entries.map((entry) => entry.labId).sort();
const narrowIds = [...mainlandNarrowedSemanticPromiseLabIds].sort();

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function localizedProjection(value: { en?: string; zh?: string; zhHans?: string } | undefined) {
  return {
    en: value?.en ?? "",
    zh: value?.zh ?? "",
    zhHans: value?.zhHans ?? ""
  };
}

const internalAuditWording =
  /(?:audit|oracle|renderer|fallback|repair.required|partial coverage|internal|still required|not implemented|審核|审核|內部|内部|部分覆蓋|部分覆盖|尚未實作|尚未实现)/iu;

const staleBroadPromiseWording =
  /(?:consolidat(?:e|es|ion)|integrat(?:e|es|ion)|mixed(?:-| )topic|general review|review tasks|mathematical induction|base conversion|radical notation|sum and difference formulas|double-angle formulas|inverse-function reasoning|normal-distribution|binomial expansion|conditional probability|surface-area reasoning|line-conic relationships|polar-coordinate connections|parameter constraints|綜合複習任務|综合复习任务|數學歸納法|数学归纳法|換底|换底|根式記號|根式记号|和差公式|倍角公式|反函數推理|反函数推理|常態分佈|正态分布|二項式展開|二项式展开|條件概率|条件概率|表面積推理|表面积推理|直線與圓錐曲線|直线与圆锥曲线|極坐標|极坐标|參數限制|参数限制)/iu;

const pureMathematicalFormulae = new Set([
  "a:b = ka:kb <-> a/b = ka/kb",
  "A(w)=w(P/2−w); A′(P/4)=0",
  "a/b = c/d <-> ad = bc",
  "a²+b²=c²",
  "f(x)=x³−3x+k; f′(x)=3x²−3",
  "f′(x)=lim[h->0](f(x+h)−f(x))/h",
  "n·P + d = 0",
  "P(n,r)=n!/(n−r)!; C(n,r)=n!/[r!(n−r)!]",
  "P=(cos θ, sin θ) -> y=sin θ; T=2π",
  "sin²θ + cos²θ ≡ 1",
  "x ∈ D -> f(x) ∈ R",
  "x∈A; ax+b ≷ 0; y=ax²+bx+c",
  "y=aˣ <-> x=log_a(y)",
  "Σp(x)=1; E(X)=Σxp(x); Var(X)=Σ(x−μ)²p(x)"
]);

const knownEnglishFormulaProse =
  /\b(?:and|angle|arc|area|arithmetic|bar|bars|category|columns|count|days|decimal|direction|dividend|divisor|domain|elapsed|ellipse|endpoint|exact|experimental|formula|fraction|geometric|grid|height|hour|hundredths|hyperbola|jump|law|layers|left|length|linked|matching|mean|measure|minutes|multi-digit|net|next|ones|operation|opposite|parabola|parallel|pattern|polygon|probability|product|quotient|range|recurrence|reference|relation|remainder|right|rows|same|scaled|sector|signed|solid|spread|start|state|strategy|successes|sum|tens|tenths|term|total|trials|unit|units|views|width)\b/iu;

test("production freezes exactly 108 independently selected Mainland promise IDs", () => {
  assert.equal(oracleIds.length, 335);
  assert.equal(new Set(oracleIds).size, 335);
  assert.equal(narrowIds.length, 108);
  assert.equal(new Set(narrowIds).size, 108);
  assert.equal(
    sha256(JSON.stringify(narrowIds)),
    "093dcb9b53d70c092d06dec2a6ddd1103eba7367e04bffb78e21c2eebc30f7fd"
  );
  const oracleIdSet = new Set(oracleIds);
  assert.equal(narrowIds.every((labId) => oracleIdSet.has(labId)), true);
});

test("all 108 live focus/formula promises are localized, focused, and student-facing", () => {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  for (const labId of narrowIds) {
    const lab = visualizationLabByLabId.get(labId);
    const topic = topicById.get(labId);
    assert.ok(lab, `${labId}: catalog lab must exist`);
    assert.ok(topic, `${labId}: topic must exist`);

    const focus = lab.templateConfig.focus;
    const formula = lab.templateConfig.formula;
    assert.ok(focus.en.trim(), `${labId}: English focus`);
    assert.ok(focus.zh.trim(), `${labId}: Traditional Chinese focus`);
    assert.ok(focus.zhHans?.trim(), `${labId}: Simplified Chinese focus`);
    assert.ok(formula?.en.trim(), `${labId}: English formula`);
    assert.ok(formula?.zh.trim(), `${labId}: Traditional Chinese formula`);
    assert.ok(formula?.zhHans?.trim(), `${labId}: Simplified Chinese formula`);
    assert.notEqual(focus.en, topic.description.en, `${labId}: focus must narrow the broad topic description`);

    const learnerPromise = [
      focus.en,
      focus.zh,
      focus.zhHans ?? "",
      formula?.en ?? "",
      formula?.zh ?? "",
      formula?.zhHans ?? ""
    ].join(" ");
    assert.doesNotMatch(learnerPromise, internalAuditWording, `${labId}: no internal audit language`);
    assert.doesNotMatch(learnerPromise, staleBroadPromiseWording, `${labId}: no stale omitted-mode promise`);
  }
});

test("the exact 68 formulas with English prose have real Traditional and Simplified Chinese learner copy", () => {
  const proseIds = narrowIds.filter((labId) => {
    const formula = visualizationLabByLabId.get(labId)?.templateConfig.formula;
    assert.ok(formula, `${labId}: formula must exist`);
    return !pureMathematicalFormulae.has(formula.en);
  });

  assert.equal(proseIds.length, 68);
  assert.equal(
    sha256(JSON.stringify(proseIds)),
    "798033896628b003aea3ad39b2a7018dfacb3145f73abd49f357fb0a05a71dbe"
  );

  for (const labId of proseIds) {
    const formula = visualizationLabByLabId.get(labId)?.templateConfig.formula;
    assert.ok(formula, `${labId}: formula must exist`);
    assert.match(formula.en, knownEnglishFormulaProse, `${labId}: independently classified English prose`);
    assert.notEqual(formula.zh, formula.en, `${labId}: Traditional Chinese must not copy English prose`);
    assert.notEqual(formula.zhHans, formula.en, `${labId}: Simplified Chinese must not copy English prose`);
    assert.doesNotMatch(formula.zh, knownEnglishFormulaProse, `${labId}: no English prose in Traditional Chinese`);
    assert.doesNotMatch(formula.zhHans ?? "", knownEnglishFormulaProse, `${labId}: no English prose in Simplified Chinese`);
  }

  const pureSymbolIds = narrowIds.filter((labId) => {
    const formula = visualizationLabByLabId.get(labId)?.templateConfig.formula;
    assert.ok(formula, `${labId}: formula must exist`);
    return pureMathematicalFormulae.has(formula.en);
  });
  assert.equal(pureSymbolIds.length, 40);
  assert.equal(
    sha256(JSON.stringify(pureSymbolIds)),
    "703270eb3bd4b6d2187de458dc080419a9a3c3560f7632146048c8d8b344f40a"
  );
});

test("the English formulas for all 108 narrowed promises keep their reviewed source identity", () => {
  const englishFormulaProjection = narrowIds.map((labId) => {
    const formula = visualizationLabByLabId.get(labId)?.templateConfig.formula;
    assert.ok(formula, `${labId}: formula must exist`);
    return { labId, formula: formula.en };
  });
  assert.equal(
    sha256(JSON.stringify(englishFormulaProjection)),
    "6550f0c6f438b0135a352cfcf3e946d755e42fbc6faf5b7eff28c845f6314e54"
  );
});

test("the stable 227-ID complement is not relabelled as focus narrowing", () => {
  const narrowed = new Set<string>(mainlandNarrowedSemanticPromiseLabIds);
  const protectedIds = oracleIds.filter((labId) => !narrowed.has(labId));
  assert.equal(protectedIds.length, 227);
  assert.equal(
    sha256(JSON.stringify(protectedIds)),
    "d8db8974794352346510bf2f2d7d4dbcc142b2f437693ee5710f9fc25aa6539a"
  );
  for (const labId of protectedIds) {
    assert.equal(narrowed.has(labId), false, `${labId}: protected catalog promise stays untouched`);
  }
});

test("the exact 108 three-language focus/formula projection remains reviewable", () => {
  const promiseProjection = narrowIds.map((labId) => {
    const lab = visualizationLabByLabId.get(labId);
    assert.ok(lab, `${labId}: catalog lab must exist`);
    return {
      labId,
      focus: localizedProjection(lab.templateConfig.focus),
      formula: localizedProjection(lab.templateConfig.formula)
    };
  });
  assert.equal(
    sha256(JSON.stringify(promiseProjection)),
    "19fbdf7c27fc62cccee9ed3f0f679cb2e97aad73639dae18dec1909b07194682"
  );
});
