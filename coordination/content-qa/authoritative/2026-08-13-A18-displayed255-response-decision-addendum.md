# A18 Displayed-255 Response Adjudication — Decision Addendum

Status: `HOLD / NOT AUTHORIZED FOR INTAKE`

Date: 2026-08-13 HKT

This addendum freezes the only two implementation choices left open by the
response and assessment adjudication report:

```text
/Volumes/Starship/MAIS-hk-content-qa-wt/coordination/content-qa/2026-08-13-A18-displayed255-response-assessment-adjudication.md
SHA-256 e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281
```

It does not change that report's exact 16-ID/18-instance disposition, source
bindings, three `NOT DEFECT` decisions, version/history requirements, or HOLD
boundary. It supplies one mandatory choice for the P5 tank response contract
and clarifies the accessibility-equivalence rule for the P4 number line.

## 1. `supp-p5-volume-key-fact-v2`: mandatory unit policy

The implementation must use the following bilingual prompt meaning:

- EN: `A cuboid tank has volume 48 cm^3, length 4 cm, and width 3 cm. What is its height? Give your answer with a length unit.`
- ZH: `一個長方體水箱的體積是 48 立方厘米，長 4 厘米、闊 3 厘米。高是多少？答案須附上長度單位。`

The response contract must be `quantity` with target `4 cm`,
`unitPolicy: "convertible"`, and no bare-number allowance.

Required positives:

```text
4 cm
4cm
0.04 m
40 mm
```

Required hard negatives:

```text
4
0.04 cm
4 cm^2
4 cm^3
12 cm
```

The explanation must identify height as the unknown and divide the volume by
the base area:

```text
h = 48 / (4 x 3) = 4 cm
```

This resolves the prior two-policy branch. An exact-centimetre policy is not
permitted under this final contract.

## 2. `graph-p4-decimals-number-line`: accessibility parity

The assessment asks a learner to read a plotted position and express it as a
decimal. A nonvisual learner must receive the same mathematical source data as
a learner who can inspect the plotted point. Therefore the exact ordinal tick
position is required accessibility information; withholding it would make the
question unsolvable nonvisually. Stating the ordinal position is not a direct
answer leak as long as the renderer does not perform the final decimal
calculation.

Required solve-able semantic wording:

- EN: `Number line from 3 to 4 in intervals of 0.1. Point P is on the seventh small tick after 3.`
- ZH: `數線由 3 至 4，每小格表示 0.1。點 P 位於 3 之後第七個小刻度。`
- ZH-Hans: `数轴从 3 到 4，每小格表示 0.1。点 P 位于 3 之后第七个小刻度。`

The ordinal may be conveyed in a visible caption or an equivalent
screen-reader semantic table, but all supported learners must receive the same
range, interval, point label, and ordinal position. The repair must not merely
hide or delete semantic information.

Before submission, no caption, accessible name, table cell, hidden text, or
serialized learner-facing semantic field may contain the computed result in
any of these forms:

```text
P = 3.7
P equals 3.7
P represents 3.7
P 是 3.7
P 等於 3.7
P 代表 3.7
P 等于 3.7
```

The post-answer explanation may show the calculation `3 + 7 x 0.1 = 3.7`.
The pre-answer figure semantics must stop at the input representation and leave
that calculation to the learner.

## 3. Acceptance boundary

The isolated successor must bind this addendum by SHA, add positive and
hard-negative source tests, and obtain real Starship-only render/browser proof
for the pre-answer number-line semantics. Recipient intake remains HOLD until
the complete displayed-question successor closure and two independent
post-repair zero sweeps are approved.
