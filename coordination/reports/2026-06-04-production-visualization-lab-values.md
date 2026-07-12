# Production Visualization Lab Value Sweep

- Date: 2026-06-04
- Target: https://www.mais.hk/visualization-lab
- Scope: Production-only read-only QA sweep for Visualization Lab controls.
- Definition of every value: every runtime discrete value per visible control, plus pairwise min/max combinations with dependent bounds re-queried.
- Mutation guard: skips `Mark explored` so production visualization-session progress is not written.

## desktop-chrome

- Status: Failed
- Started: 2026-06-04T01:53:27.885Z
- Ended: 2026-06-04T02:08:29.492Z
- States checked: 2023
- Distinct controls found: 81
- Non-mutating buttons exercised: 77

### Count Verification

| Source | Count |
| --- | --- |
| Home page visualization metric | 389 |
| Visualization page advertised count | 389 |
| Discovered lab sections | 389 |
| Minimum expected lab sections | 100 |

### Lab Coverage

| Lab | Controls | Buttons | States | Failures |
| --- | --- | --- | --- | --- |
| Counting and Number Bonds Visual Lab (p1-counting-number-bonds) | range:Total objects12 [2..20 step 1]<br>range:Known part7 [1..11 step 1]<br>range:Total objects5 [2..20 step 1]<br>range:Known part2 [1..4 step 1]<br>range:Total objects10 [2..20 step 1]<br>range:Known part5 [1..9 step 1]<br>range:Total objects20 [2..20 step 1]<br>range:Known part10 [1..19 step 1] | Make 5<br>Make 10<br>Make 20 | 139 | 0 |
| Addition and Subtraction Visual Lab (p1-addition-subtraction) | range:Start number3 [2..8 step 1]<br>range:Jump size2 [1..5 step 1]<br>range:Start number8 [5..5 step 1]<br>range:Jump size5 [1..5 step 1]<br>range:Start number5 [5..5 step 1] | Jump forward<br>Jump back | 39 | 0 |
| Shapes and Patterns Visual Lab (p1-shapes-patterns) | None | circle<br>triangle<br>square<br>Check the next shape | 5 | 0 |
| Measurement and Time Visual Lab (p1-measurement-time) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| Numbers Within 20 Visual Lab (pep-primary-p1-upper-number-sense) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| Shapes, Position, and Whole Hours Visual Lab (pep-primary-p1-upper-shapes-position-time) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| Numbers Within 100 and Addition/Subtraction Visual Lab (pep-primary-p1-lower-within-100-add-sub) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| Money, Time, and Data Visual Lab (pep-primary-p1-lower-money-data-review) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Numbers in Everyday Life Visual Lab (bnu-primary-p1-upper-life-number-sense) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Comparing Quantities and Attributes Visual Lab (bnu-primary-p1-upper-comparison) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Addition and Subtraction (I) Visual Lab (bnu-primary-p1-upper-within-10-add-sub) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Classification and Sorting Visual Lab (bnu-primary-p1-upper-classification) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Position and Order Visual Lab (bnu-primary-p1-upper-position-order) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Recognizing Shapes Visual Lab (bnu-primary-p1-upper-solid-shapes) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Addition and Subtraction (II) Visual Lab (bnu-primary-p1-upper-within-20-add-sub) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Reading Clocks Visual Lab (bnu-primary-p1-upper-clock-introduction) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Grade 1 Volume 1 Review Visual Lab (bnu-primary-p1-upper-review) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Addition and Subtraction (I) Visual Lab (bnu-primary-p1-lower-within-20-regrouping) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Observing Objects Visual Lab (bnu-primary-p1-lower-observe-objects) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 115 | 0 |
| BNUP Primary: Numbers in Everyday Life Visual Lab (bnu-primary-p1-lower-within-100-number-sense) | range:Model A value5 [1..9 step 1]<br>range:Model B value4 [1..9 step 1]<br>range:Model A value9 [1..9 step 1]<br>range:Model B value9 [1..9 step 1] | Model A<br>Model B<br>Compare A/B<br>Reset model | 93 | 0 |

### Warnings

- None

### Runtime Issues

- None

### Functional Failures

1. BNUP Primary: Numbers in Everyday Life Visual Lab (bnu-primary-p1-lower-within-100-number-sense), button:Reset model, Model B value4=4: Unable to inspect lab health: locator.evaluate: Test ended.
Call log:
[2m  - waiting for locator('[id="lab-example-bnu-primary-p1-lower-within-100-number-sense"]')[22m



### Fatal Error

- locator.screenshot: Target page, context or browser has been closed
