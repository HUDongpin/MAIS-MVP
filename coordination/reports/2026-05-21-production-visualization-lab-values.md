# Production Visualization Lab Value Sweep

- Date: 2026-05-21
- Target: https://www.mais.hk/visualization-lab
- Scope: Production-only read-only QA sweep for Visualization Lab controls.
- Definition of every value: every runtime discrete value per visible control, plus pairwise min/max combinations with dependent bounds re-queried.
- Mutation guard: skips `Mark explored` so production visualization-session progress is not written.

## desktop-chrome

- Status: Passed
- Started: 2026-05-21T10:03:58.588Z
- Ended: 2026-05-21T10:06:30.428Z
- States checked: 2799
- Distinct controls found: 76
- Non-mutating buttons exercised: 27

### Count Verification

| Source | Count |
| --- | --- |
| Home page visualization metric | 25 |
| Visualization page advertised count | 26 |
| Discovered lab sections | 26 |
| Minimum expected lab sections | 25 |

### Lab Coverage

| Lab | Controls | Buttons | States | Failures |
| --- | --- | --- | --- | --- |
| Counting and Number Bonds (p1-counting-number-bonds) | range:Total objects12 [2..20 step 1]<br>range:Known part7 [1..11 step 1]<br>range:Total objects5 [2..20 step 1]<br>range:Known part2 [1..4 step 1]<br>range:Total objects10 [2..20 step 1]<br>range:Known part5 [1..9 step 1]<br>range:Total objects20 [2..20 step 1]<br>range:Known part10 [1..19 step 1] | Make 5<br>Make 10<br>Make 20 | 139 | 0 |
| Number Line Steps (p1-addition-subtraction) | range:Start number3 [2..8 step 1]<br>range:Jump size2 [1..5 step 1]<br>range:Start number8 [5..5 step 1]<br>range:Jump size5 [1..5 step 1]<br>range:Start number5 [5..5 step 1] | Jump forward<br>Jump back | 39 | 0 |
| Shape Pattern Explorer (p1-shapes-patterns) | None | Check the next shape | 2 | 0 |
| Base-Ten Place Value Grid (p2-place-value) | range:Hundreds2 [0..3 step 1]<br>range:Tens4 [0..9 step 1]<br>range:Ones3 [0..9 step 1] | None | 37 | 0 |
| Multiplication Array Model (p2-multiplication-foundations) | range:Rows3 [1..5 step 1]<br>range:Columns4 [1..6 step 1] | None | 16 | 0 |
| Length and Data Explorer (p2-length-data) | range:Object A6 [1..12 step 1]<br>range:Object B9 [1..12 step 1]<br>range:Object C12 [1..12 step 1] | None | 49 | 0 |
| Fraction Bar Explorer (p3-fractions-intro) | range:Equal parts4 [2..6 step 1]<br>range:Shaded parts2 [1..4 step 1] | None | 14 | 0 |
| Geometry and Pattern Explorer (p3-geometry-patterns) | range:Mirror distance3 [2..6 step 1]<br>range:Growing steps3 [2..5 step 1]<br>range:Right-angle marker4 [3..6 step 1] | None | 26 | 0 |
| Decimal Number Line (p4-decimals) | range:Tenths3 [0..9 step 1]<br>range:Hundredths7 [0..9 step 1] | None | 25 | 0 |
| Angle Explorer (p4-angles) | range:Angle size90 [20..160 step 1] | None | 142 | 0 |
| Area Model Explorer (p4-perimeter-area) | range:Rows3 [1..5 step 1]<br>range:Columns4 [1..7 step 1] | None | 17 | 0 |
| Fraction Operation Bars (p5-fractions-operations) | range:Equal parts4 [2..12 step 1]<br>range:Shaded parts2 [1..4 step 1] | None | 20 | 0 |
| Volume Layer Builder (p5-volume) | range:Layers3 [1..5 step 1] | None | 6 | 0 |
| Charts and Averages Simulator (p5-charts-averages) | range:D16 [1..15 step 1]<br>range:D28 [1..15 step 1]<br>range:D310 [1..15 step 1]<br>range:D412 [1..15 step 1]<br>range:D59 [1..15 step 1] | None | 116 | 0 |
| Percent and Ratio Bar (p6-percentages) | range:Percent65 [0..100 step 1]<br>range:Ratio part A2 [1..8 step 1]<br>range:Ratio part B3 [1..8 step 1] | None | 130 | 0 |
| Speed Coordinate Demo (p6-speed) | range:Speed (km/h)4 [1..6 step 1]<br>range:Time (hours)5 [1..6 step 1] | None | 17 | 0 |
| Geometry Explorer (angles) | None | Reset triangle | 2 | 0 |
| Coordinate Plane Demo (coordinates) | number:x [-8..8 step 1]<br>number:y [-6..6 step 1] | Add point<br>Original<br>Translate (+2, +1)<br>Reflect in y-axis<br>Reset plane | 210 | 0 |
| Probability Simulator (probability-s2) | None | Roll 1<br>Roll 20<br>Reset simulation | 4 | 0 |
| Function Graph Explorer (quadratic-patterns) | range:a: stretch / flip1 [-3..3 step 0.1]<br>range:b: horizontal shift-2 [-6..6 step 0.1]<br>range:c: y-intercept-3 [-8..8 step 0.1] | None | 356 | 0 |
| Function Model Comparer (functions) | range:Growth strength1 [0.4..2 step 0.1]<br>range:Vertical shift0 [-3..5 step 0.5]<br>range:Growth strength2 [0.4..2 step 0.1]<br>range:Vertical shift5 [-3..5 step 0.5] | Polynomial<br>Exponential<br>Logarithmic | 156 | 0 |
| Function Model Comparer (advanced-functions) | range:Growth strength1 [0.4..2 step 0.1]<br>range:Vertical shift0 [-3..5 step 0.5]<br>range:Growth strength2 [0.4..2 step 0.1]<br>range:Vertical shift5 [-3..5 step 0.5] | Polynomial<br>Exponential<br>Logarithmic | 156 | 0 |
| Trig Wave Explorer (trigonometry-s5) | range:Amplitude2 [0.5..3.5 step 0.1]<br>range:Period180 [90..540 step 15]<br>range:Phase shift30 [-180..180 step 15] | None | 100 | 0 |
| Tangent and Rate Lab (differentiation-intro) | range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Tangent point x5.5The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1] | Tangent<br>Normal | 324 | 0 |
| Calculus and Statistics Lab (calculus) | range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Tangent point x5.5The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1] | Tangent<br>Normal | 324 | 0 |
| Normal Distribution Z-Score Explorer (statistics-s6) | range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1]<br>range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Standard deviation18 [4..18 step 1]<br>range:Observed value90 [20..90 step 1] | Tangent<br>Normal | 372 | 0 |

### Warnings

- Home page visualization count is 25, while the visualization page rendered 26 lab sections.

### Runtime Issues

- None

### Functional Failures

- None


### Fatal Error

- None

## mobile-chrome

- Status: Passed
- Started: 2026-05-21T10:06:31.373Z
- Ended: 2026-05-21T10:09:03.788Z
- States checked: 2799
- Distinct controls found: 76
- Non-mutating buttons exercised: 27

### Count Verification

| Source | Count |
| --- | --- |
| Home page visualization metric | 25 |
| Visualization page advertised count | 26 |
| Discovered lab sections | 26 |
| Minimum expected lab sections | 25 |

### Lab Coverage

| Lab | Controls | Buttons | States | Failures |
| --- | --- | --- | --- | --- |
| Counting and Number Bonds (p1-counting-number-bonds) | range:Total objects12 [2..20 step 1]<br>range:Known part7 [1..11 step 1]<br>range:Total objects5 [2..20 step 1]<br>range:Known part2 [1..4 step 1]<br>range:Total objects10 [2..20 step 1]<br>range:Known part5 [1..9 step 1]<br>range:Total objects20 [2..20 step 1]<br>range:Known part10 [1..19 step 1] | Make 5<br>Make 10<br>Make 20 | 139 | 0 |
| Number Line Steps (p1-addition-subtraction) | range:Start number3 [2..8 step 1]<br>range:Jump size2 [1..5 step 1]<br>range:Start number8 [5..5 step 1]<br>range:Jump size5 [1..5 step 1]<br>range:Start number5 [5..5 step 1] | Jump forward<br>Jump back | 39 | 0 |
| Shape Pattern Explorer (p1-shapes-patterns) | None | Check the next shape | 2 | 0 |
| Base-Ten Place Value Grid (p2-place-value) | range:Hundreds2 [0..3 step 1]<br>range:Tens4 [0..9 step 1]<br>range:Ones3 [0..9 step 1] | None | 37 | 0 |
| Multiplication Array Model (p2-multiplication-foundations) | range:Rows3 [1..5 step 1]<br>range:Columns4 [1..6 step 1] | None | 16 | 0 |
| Length and Data Explorer (p2-length-data) | range:Object A6 [1..12 step 1]<br>range:Object B9 [1..12 step 1]<br>range:Object C12 [1..12 step 1] | None | 49 | 0 |
| Fraction Bar Explorer (p3-fractions-intro) | range:Equal parts4 [2..6 step 1]<br>range:Shaded parts2 [1..4 step 1] | None | 14 | 0 |
| Geometry and Pattern Explorer (p3-geometry-patterns) | range:Mirror distance3 [2..6 step 1]<br>range:Growing steps3 [2..5 step 1]<br>range:Right-angle marker4 [3..6 step 1] | None | 26 | 0 |
| Decimal Number Line (p4-decimals) | range:Tenths3 [0..9 step 1]<br>range:Hundredths7 [0..9 step 1] | None | 25 | 0 |
| Angle Explorer (p4-angles) | range:Angle size90 [20..160 step 1] | None | 142 | 0 |
| Area Model Explorer (p4-perimeter-area) | range:Rows3 [1..5 step 1]<br>range:Columns4 [1..7 step 1] | None | 17 | 0 |
| Fraction Operation Bars (p5-fractions-operations) | range:Equal parts4 [2..12 step 1]<br>range:Shaded parts2 [1..4 step 1] | None | 20 | 0 |
| Volume Layer Builder (p5-volume) | range:Layers3 [1..5 step 1] | None | 6 | 0 |
| Charts and Averages Simulator (p5-charts-averages) | range:D16 [1..15 step 1]<br>range:D28 [1..15 step 1]<br>range:D310 [1..15 step 1]<br>range:D412 [1..15 step 1]<br>range:D59 [1..15 step 1] | None | 116 | 0 |
| Percent and Ratio Bar (p6-percentages) | range:Percent65 [0..100 step 1]<br>range:Ratio part A2 [1..8 step 1]<br>range:Ratio part B3 [1..8 step 1] | None | 130 | 0 |
| Speed Coordinate Demo (p6-speed) | range:Speed (km/h)4 [1..6 step 1]<br>range:Time (hours)5 [1..6 step 1] | None | 17 | 0 |
| Geometry Explorer (angles) | None | Reset triangle | 2 | 0 |
| Coordinate Plane Demo (coordinates) | number:x [-8..8 step 1]<br>number:y [-6..6 step 1] | Add point<br>Original<br>Translate (+2, +1)<br>Reflect in y-axis<br>Reset plane | 210 | 0 |
| Probability Simulator (probability-s2) | None | Roll 1<br>Roll 20<br>Reset simulation | 4 | 0 |
| Function Graph Explorer (quadratic-patterns) | range:a: stretch / flip1 [-3..3 step 0.1]<br>range:b: horizontal shift-2 [-6..6 step 0.1]<br>range:c: y-intercept-3 [-8..8 step 0.1] | None | 356 | 0 |
| Function Model Comparer (functions) | range:Growth strength1 [0.4..2 step 0.1]<br>range:Vertical shift0 [-3..5 step 0.5]<br>range:Growth strength2 [0.4..2 step 0.1]<br>range:Vertical shift5 [-3..5 step 0.5] | Polynomial<br>Exponential<br>Logarithmic | 156 | 0 |
| Function Model Comparer (advanced-functions) | range:Growth strength1 [0.4..2 step 0.1]<br>range:Vertical shift0 [-3..5 step 0.5]<br>range:Growth strength2 [0.4..2 step 0.1]<br>range:Vertical shift5 [-3..5 step 0.5] | Polynomial<br>Exponential<br>Logarithmic | 156 | 0 |
| Trig Wave Explorer (trigonometry-s5) | range:Amplitude2 [0.5..3.5 step 0.1]<br>range:Period180 [90..540 step 15]<br>range:Phase shift30 [-180..180 step 15] | None | 100 | 0 |
| Tangent and Rate Lab (differentiation-intro) | range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Tangent point x5.5The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1] | Tangent<br>Normal | 324 | 0 |
| Calculus and Statistics Lab (calculus) | range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Tangent point x5.5The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1] | Tangent<br>Normal | 324 | 0 |
| Normal Distribution Z-Score Explorer (statistics-s6) | range:Mean50 [30..70 step 1]<br>range:Standard deviation10 [4..18 step 1]<br>range:Observed value65 [20..90 step 1]<br>range:Tangent point x2The tangent line is the local linear model. Its gradient is the instantaneous rate of change. [-3.5..5.5 step 0.1]<br>range:Standard deviation18 [4..18 step 1]<br>range:Observed value90 [20..90 step 1] | Tangent<br>Normal | 372 | 0 |

### Warnings

- Home page visualization count is 25, while the visualization page rendered 26 lab sections.

### Runtime Issues

- None

### Functional Failures

- None


### Fatal Error

- None
