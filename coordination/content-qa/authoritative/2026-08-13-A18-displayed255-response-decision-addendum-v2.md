# A18 Displayed-255 Response Adjudication — Final Decision Addendum v2

Status: `HOLD / NOT AUTHORIZED FOR RECIPIENT INTAKE`

Date: 2026-08-13 HKT

This file is the final implementation supersession for the two P1 gaps found
by independent review of the response and assessment adjudication. The earlier
documents remain immutable audit records:

```text
e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281
  2026-08-13-A18-displayed255-response-assessment-adjudication.md

4c7155b9cb854241df3e570ca79465f841ecd49575426f35c608251c7bc9cbe9
  2026-08-13-A18-displayed255-response-decision-addendum.md
```

For implementation authority, this v2 file supersedes the open tank-policy
branch in the first report and the entire first addendum. All other decisions
from the response report remain in force, including the exact 16 true-defect
IDs / 18 issue instances, the three `NOT DEFECT` rulings, quotient/remainder
contract, decimal-form contract, three distractor replacements, immutable
version history, and HOLD boundary.

The explanation adjudication remains a required member of the same versioned
repair package:

```text
d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55
  2026-08-13-A18-displayed255-explanation-adjudication.md
```

## 1. Additional provenance binding

The multiplication-representation `NOT DEFECT` decisions are independently
supported by `data/questions.ts`, but they also rely on the live lesson's
explicit “number of groups x objects in each group” convention. Bind the
current post-z-score-repair lesson source as provenance only:

```text
b5755aab3f5aad3132e5253a798780e6fee2e73c374d8bf4347fd3291ec78a0d  data/lessons.ts
```

The exercise successor is not authorized to edit or overwrite
`data/lessons.ts`. This binding prevents a later lesson-contract change from
silently invalidating the representation ruling.

## 2. Final P5 tank prompt and unit contract

### Affected ID

`supp-p5-volume-key-fact-v2`

The implementation must use this bilingual prompt meaning:

- EN: `A cuboid tank has volume 48 cm^3, length 4 cm, and width 3 cm. What is its height? Give your answer with a length unit.`
- ZH: `一個長方體水箱的體積是 48 立方厘米，長 4 厘米、闊 3 厘米。高是多少？答案須附上長度單位。`

Do not substitute `rectangular tank`; that phrase may describe only a
rectangular base and does not by itself establish a cuboid.

The response contract is uniquely fixed as:

```text
kind: quantity
target: 4 cm
unitPolicy: convertible
allowBareNumber: false / absent
```

Required positives:

```text
4 cm
4cm
0.04 m
40 mm
40 毫米
```

Required hard negatives:

```text
4
0.04 cm
4 cm^2
4 cm^3
12 cm
```

The explanation must identify height as the unknown and divide volume by base
area:

```text
h = 48 / (4 x 3) = 4 cm
```

### 2.1 Required millimetre parser support

The current response-contract source has length units `cm`, `m`, and `km`, but
does not support `mm` or `毫米`. The repair is therefore incomplete unless the
quantity parser itself adds:

```text
mm: dimension=length, canonical unit=mm, baseFactor=0.001
```

Chinese normalization must map `毫米` to `mm` before the broader `米` rule is
applied. The quantity-token matcher must recognize `mm`. Tests must prove that
`40 mm` and `40 毫米` normalize to the same base length as `4 cm`, while area,
volume, malformed, and bare-number forms remain rejected.

This authorization is limited to the general dimensional unit parser and its
focused tests. It must not alter unrelated money, temperature, speed, area,
volume, or exact-unit contracts.

## 3. Final P4 number-line accessibility contract

### Affected ID

`graph-p4-decimals-number-line`

A nonvisual learner must receive the same source information that the plotted
figure gives a sighted learner. Therefore range, tick interval, point label,
and ordinal tick position are required accessibility data. The semantic layer
must stop before carrying out the decimal calculation.

Required pre-answer meaning:

- EN: `Number line from 3 to 4 in intervals of 0.1. Point P is on the seventh small tick after 3.`
- ZH: `數線由 3 至 4，每小格表示 0.1。點 P 位於 3 之後第七個小刻度。`
- ZH-Hans: `数轴从 3 到 4，每小格表示 0.1。点 P 位于 3 之后第七个小刻度。`

The ordinal tick description is the nonvisual equivalent of the plotted
position, not a computed-answer leak. Before submission, no visible caption,
accessible name, semantic table, hidden text, or serialized learner-facing
field may state any computed-result variant, including:

```text
P = 3.7
P equals 3.7
P represents 3.7
P 是 3.7
P 等於 3.7
P 代表 3.7
P 等于 3.7
```

The post-answer explanation may show `3 + 7 x 0.1 = 3.7`. A source contract,
render-level test, and real Starship-only browser check are all required.

## 4. Preserve the expanded-form learning objective

The response report correctly requires accepting commuted factors and combined
like terms. That mathematical permissiveness must not let a learner echo an
unexpanded prompt where the explicit instruction is `Expand` / `展開`.

### 4.1 Exact IDs requiring expanded form

```text
q18
supp-polynomials-guided-example
hk-s3-identities-square-patterns-1
```

For these three IDs, use an ID-scoped `requireExpanded` invariant or an
equivalent AST-level `expanded-sum-of-monomials` policy in addition to
polynomial equivalence.

The invariant must establish that the submitted expression is a sum of
monomials: no multiplication or power node may retain an addition/subtraction
expression as a factor or base. Harmless outer grouping may be normalized, but
factored products and unexpanded binomial powers must fail even when they are
algebraically equivalent to the answer.

Required hard negatives:

```text
q18:
  (x+3)(x+2)
  (x+2)*(x+3)

supp-polynomials-guided-example:
  x(x+4)
  x*(x+4)

hk-s3-identities-square-patterns-1:
  (a+b)^2
  (b+a)^2
```

Required equivalent expanded positives include:

```text
q18:
  x^2+x*5+6
  6+5*x+x^2

supp-polynomials-guided-example:
  x^2+x*4
  4*x+x^2

hk-s3-identities-square-patterns-1:
  a^2+a*b*2+b^2
  b^2+2*b*a+a^2
```

The other seven algebraic IDs in the response report retain their stated
equivalence contracts but do not inherit `requireExpanded` unless their own
prompt explicitly asks for expansion. All ten still require wrong-sign,
wrong-coefficient, wrong-power, missing-term, and extra-nonzero-term negatives.

## 5. Final authority and gates

The isolated successor must bind all of these exact decision artifacts:

```text
d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55  explanation adjudication
e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281  response adjudication audit record
4c7155b9cb854241df3e570ca79465f841ecd49575426f35c608251c7bc9cbe9  superseded v1 addendum audit record
<this-file-sha>                                                         final decision addendum v2
```

Before recipient intake, the successor must provide TDD RED/GREEN evidence,
exact source/preimage/postimage SHAs, immutable question-version/history
lineage, preservation of all prior EASE contracts, independent EN/ZH read-back,
two complete post-repair displayed-255 zero sweeps, and Starship-only render/
browser evidence. The recipient, lesson source, visualization runtime, global
Playwright configuration, Git index, remote, and deployment remain outside the
authorization.

Until those gates close, the honest status is `needs-repair / HOLD`, and the HK
all-math `/goal` remains open.
