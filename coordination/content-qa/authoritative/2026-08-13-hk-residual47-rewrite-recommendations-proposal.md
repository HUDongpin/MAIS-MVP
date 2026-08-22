# HK residual47 — exact rewrite recommendations

Scope: 28 residual rows. Twenty-seven expose assessment-authoring/template voice; one of those also has an EN/ZH correct-option mismatch, and one additional decimal row has an unstated representation restriction. Except for the two explicitly enumerated exceptions, change only `explanation.en` and `explanation.zh`; preserve prompt, answer, accepted answers, option order/content, diagram, topic/grade/difficulty/type, and all other fields. Each material learner-facing change requires a new generation and immutable resolution of the listed old ID. Version targets must be chosen only after a collision check.

## Exact recommended bilingual explanations

### `supp-p1-counting-number-bonds-common-check-v2`

- `options[0].en` and `answer`: `Check whether the question asks for the number before, the number after, or a missing part`
- Preserve `options[0].zh`: `檢查題目問的是前一個數、後一個數，還是缺少的數`
- EN explanation: `Check whether the question asks for the number before, the number after, or a missing part. In \(4+\square=9\), the missing part is 5 because \(4+5=9\); the number before 16 is 15, while the number after 16 is 17.`
- ZH explanation: `先分辨題目問的是前一個數、後一個數，還是缺少的數。在 \(4+\square=9\) 中，因為 \(4+5=9\)，所以缺少的數是 5；16 的前一個數是 15，後一個數則是 17。`

### `supp-p1-addition-subtraction-common-check-v2`

- EN: `Check the story action before choosing addition or subtraction. Getting more means add, while giving away or removing means subtract; for example, getting 2 more than 5 gives \(5+2=7\).`
- ZH: `先檢查故事動作，再決定用加法還是減法。數量增加便用加法，送出或取走便用減法；例如 5 張再得到 2 張，即 \(5+2=7\)。`

### `supp-p1-measurement-time-common-check-v2`

- EN: `Check the unit or clock hand before answering. The long hand at 6 means 30 minutes past the hour, while the long hand at 12 means an o’clock time; the short hand identifies the hour.`
- ZH: `作答前先檢查單位或鐘面指針。長針指向 6 表示過了 30 分鐘，長針指向 12 表示整點；短針則指出小時。`

### `supp-p2-place-value-common-check-v2`

- EN: `Check that each digit is placed in the correct place value. In 735, the 7 means 7 hundreds; in 507, the zero keeps the tens place, so it must not be read as 57.`
- ZH: `檢查每個數字是否放在正確位值。在 735 中，7 表示 7 個百；在 507 中，0 保留十位，所以不能把 507 讀成 57。`

### `supp-p2-multiplication-foundations-common-check-v2`

- EN: `Check the size of each group and the number of groups. Five groups with 2 objects in each group mean \(5\times2=10\); every group must stay the same size.`
- ZH: `檢查每組數量和組數。5 組、每組 2 件物件表示 \(5\times2=10\)；點算時每組大小必須保持相同。`

### `supp-p2-money-time-common-check-v2`

- EN: `Check whether the answer should be money or time. Change from HK$10 after paying HK$6 is \(10-6=4\), so the answer is HK$4; adding 30 minutes to 2:30 gives the time 3:00.`
- ZH: `檢查答案應是金錢還是時間。用港幣 10 元支付港幣 6 元，找續是 \(10-6=4\)，所以答案是港幣 4 元；2:30 加 30 分鐘則得到時間 3:00。`

### `supp-p3-multiplication-division-common-check-v2`

- EN: `Check whether a remainder is smaller than the divisor. Since \(47=4\times11+3\) and \(3<4\), quotient 11 remainder 3 is valid; if the remainder were at least 4, another group of 4 could be made.`
- ZH: `檢查餘數是否小於除數。因為 \(47=4\times11+3\) 而且 \(3<4\)，所以商 11 餘 3 是合理的；若餘數大於或等於 4，便仍可再分成一組 4。`

### `supp-p3-fractions-intro-common-check-v2`

- EN: `Check that the denominator names the equal parts. The denominator 3 in \(1/3\) means the whole is divided into three equal parts; multiplying both numerator and denominator by 2 gives the equivalent fraction \(2/3=4/6\).`
- ZH: `檢查分母是否表示等份總數。\(1/3\) 的分母 3 表示整體分成三等份；分子和分母同乘 2，可得等值分數 \(2/3=4/6\)。`

### `supp-p3-measurement-common-check-v2`

- EN: `Check whether units need converting before calculating. Convert quantities to the same unit first: \(2\text{ L}=2000\text{ mL}\); quantities already in centimetres can be added directly, as in \(35+20=55\text{ cm}\).`
- ZH: `計算前檢查是否需要換算單位。先把各數量換成相同單位：\(2\text{ 升}=2000\text{ 毫升}\)；若兩個長度同以厘米表示，便可直接相加，例如 \(35+20=55\text{ 厘米}\)。`

### `supp-p3-geometry-patterns-common-check-v2`

- EN: `Check that the figure is closed and count its straight sides before naming it. A closed plane figure with four straight sides is a quadrilateral; a triangle with all three sides equal is an equilateral triangle.`
- ZH: `為圖形命名前，先檢查它是否封閉，並數清楚直邊數目。有四條直邊的封閉平面圖形是四邊形；三條邊全部相等的三角形是等邊三角形。`

### `supp-p4-large-numbers-common-check-v2`

- EN: `Verify that every factor leaves remainder 0 and every common result works for both numbers. A common factor must divide both numbers exactly, and a common multiple must be a multiple of both; for 12 and 18, the H.C.F. is 6 and the first common multiple is 36.`
- ZH: `檢查每個因數都能整除而餘數為 0，並核對公因數或公倍數同時適用於兩個數。公因數必須能整除兩數，公倍數必須同時是兩數的倍數；12 和 18 的最大公因數是 6，首個公倍數是 36。`

### `supp-p4-decimals-common-check-v2`

- EN: `Keep the decimal point aligned in every step so digits with the same place value are compared or calculated together. For example, \(4.60-1.20=3.40\), and \(0.5=0.50>0.47\).`
- ZH: `每一步都要對齊小數點，使相同位值的數字互相比較或運算。例如，\(4.60-1.20=3.40\)，而 \(0.5=0.50>0.47\)。`

### `supp-p4-decimals-guided-example`

- EN prompt: `Find \(4.6-1.2\). Give your answer as a decimal.`
- ZH prompt: `計算 \(4.6-1.2\)，並以小數作答。`
- Preserve answer `3.4`, explanation, and the strict dimensionless-decimal grader. This closes the present mismatch in which the prompt does not request a representation but production grading rejects the mathematically equivalent `17/5`.

### `supp-p4-angles-first-step-v2`

- EN: `Identify the quadrilateral’s side and angle relationships before choosing a family name. A square satisfies the definitions of both a rectangle and a rhombus, but a rectangle or rhombus is not necessarily a square.`
- ZH: `選擇四邊形類別前，先辨認各邊和各角的關係。正方形同時符合長方形和菱形的定義，但長方形或菱形不一定是正方形。`

### `supp-p4-angles-common-check-v2`

- EN: `Check the direction of each family inclusion and do not assume its converse. Every square is a rectangle and a rhombus, but a parallelogram with four equal sides is only guaranteed to be a rhombus, not a square.`
- ZH: `檢查各類別包含關係的方向，不要擅自把關係逆轉。每個正方形都是長方形和菱形，但四條邊相等的平行四邊形只能確定是菱形，不一定是正方形。`

### `supp-p4-perimeter-area-common-check-v2`

- EN: `Use linear units for perimeter and square units for area. Perimeter measures the outside boundary and is reported in centimetres; area measures a surface, so \(6\times4-3\times2=18\) is reported in square centimetres.`
- ZH: `周界用長度單位，面積用平方單位。周界量度外圍，以厘米作答；面積量度表面，所以 \(6\times4-3\times2=18\) 要以平方厘米作答。`

### `supp-p5-fractions-operations-common-check-v2`

- EN: `Simplify the final fraction when possible. After using a common denominator, divide the numerator and denominator by any common factor; \(7/12\) has no common factor greater than 1, so it is already in simplest form.`
- ZH: `答案如可約簡，要化成最簡分數。通分並完成運算後，把分子和分母同除以公因數；\(7/12\) 沒有大於 1 的公因數，所以已是最簡分數。`

### `supp-p5-volume-common-check-v2`

- EN: `Multiply length, width, and height instead of adding the edge lengths. For a cuboid, \(V=lwh\); if \(V=48\text{ cm}^3\), \(l=4\text{ cm}\), and \(w=3\text{ cm}\), then \(h=48\div(4\times3)=4\text{ cm}\).`
- ZH: `要把長、闊和高相乘，不是把邊長相加。長方體的 \(V=lwh\)；若 \(V=48\text{ 立方厘米}\)、\(l=4\text{ 厘米}\)、\(w=3\text{ 厘米}\)，則 \(h=48\div(4\times3)=4\text{ 厘米}\)。`

### `supp-p5-rates-common-check-v2`

- EN: `State the price for one item, not the total pack price. Divide the pack price by the number of items: \(18\div3=6\) and \(48\div8=6\), so the unit price is HK$6 per item.`
- ZH: `答案要寫一件的單價，不是整包總價。用整包總價除以物件數量：\(18\div3=6\)，而 \(48\div8=6\)，所以每件的單價是港幣 6 元。`

### `supp-p6-percentages-common-check-v2`

- EN: `Add the percentage amount for an increase and subtract it for a decrease. Since \(25\%\) of 60 is 15, a 25% increase gives \(60+15=75\); a 25% decrease would give \(60-15=45\).`
- ZH: `增加時加上百分數所代表的數量，減少時則把它減去。因為 60 的 \(25\%\) 是 15，所以增加 \(25\%\) 後是 \(60+15=75\)；減少 \(25\%\) 則是 \(60-15=45\)。`

### `supp-p6-speed-common-check-v2`

- EN: `Check whether to divide or multiply using the units. Distance divided by time gives speed, so \(120\text{ km}\div2\text{ h}=60\text{ km/h}\); speed multiplied by time gives distance, so \(6\text{ km/h}\times3\text{ h}=18\text{ km}\).`
- ZH: `按單位檢查應除還是乘。路程除以時間得速率，所以 \(120\text{ 公里}\div2\text{ 小時}=60\text{ 公里每小時}\)；速率乘時間得路程，所以 \(6\text{ 公里每小時}\times3\text{ 小時}=18\text{ 公里}\)。`

### `supp-p6-pre-secondary-problem-solving-common-check-v2`

- EN: `Check that every step answers the final question, not just an intermediate value. Compute the intermediate amount and then apply the remaining change: \(4\times6-9=15\), and \(5\times7+8-6=37\).`
- ZH: `檢查每一步是否通向最終問題，而不只是中途數值。先求中途數量，再處理餘下的改變：\(4\times6-9=15\)，而 \(5\times7+8-6=37\)。`

### `supp-angles-common-check-v2`

- EN: `Write the relevant angle-sum reason before the arithmetic. A triangle’s interior angles total \(180^\circ\), so the missing angle in a triangle with angles \(50^\circ\) and \(70^\circ\) is \(180^\circ-50^\circ-70^\circ=60^\circ\).`
- ZH: `計算前先寫出相關的角和理由。三角形內角和是 \(180^\circ\)，所以另兩角為 \(50^\circ\) 和 \(70^\circ\) 時，餘下角是 \(180^\circ-50^\circ-70^\circ=60^\circ\)。`

### `supp-coordinates-common-check-v2`

- EN: `Do not swap the x- and y-coordinates: an ordered pair is written \((x,y)\). Thus the x-coordinate of \((-4,6)\) is \(-4\), and the signs \((-,+)\) place a point in Quadrant II.`
- ZH: `不要把 x 和 y 坐標倒轉：有序數對按 \((x,y)\) 書寫。因此 \((-4,6)\) 的 x 坐標是 \(-4\)，而符號 \((-,+)\) 表示點位於第二象限。`

### `supp-transformations-common-check-v2`

- EN: `Label original and image points clearly, and apply the stated transformation once from each original point. Translating \((1,2)\) by \((3,-1)\) gives \((4,1)\); reflecting in the x-axis changes only the sign of y.`
- ZH: `清楚標示原像點和影像點，並由每個原像點按題意只作一次變換。把 \((1,2)\) 按 \((3,-1)\) 平移得到 \((4,1)\)；關於 x 軸反射只會改變 y 坐標的符號。`

### `supp-functions-common-check-v2`

- EN: `Substitute the whole input before simplifying, using brackets for a negative input. If \(g(x)=x^2\), then \(g(-3)=(-3)^2=9\); if \(f(x)=3x+2\), then \(f(2)=3(2)+2=8\).`
- ZH: `先完整代入輸入值，再化簡；代入負數時要加括號。若 \(g(x)=x^2\)，則 \(g(-3)=(-3)^2=9\)；若 \(f(x)=3x+2\)，則 \(f(2)=3(2)+2=8\)。`

### `supp-quadratic-patterns-first-step-v2`

- EN: `Look for second differences, the vertex, or the axis of symmetry. Constant second differences identify a quadratic sequence, while the vertex and axis locate a parabola’s centre; for \(y=x^2+2x+1\), \(x=-b/(2a)=-1\).`
- ZH: `先找二階差、頂點或對稱軸。固定的二階差可辨認二次數列，而頂點和對稱軸可確定拋物線的中心位置；對 \(y=x^2+2x+1\)，\(x=-b/(2a)=-1\)。`

### `supp-quadratic-patterns-common-check-v2`

- EN: `Use the sign carefully in vertex form. In \(y=(x-h)^2+k\), the vertex is \((h,k)\), so \(y=(x-3)^2+2\) has vertex \((3,2)\), not \((-3,2)\).`
- ZH: `使用頂點式時要小心括號內的符號。在 \(y=(x-h)^2+k\) 中，頂點是 \((h,k)\)，所以 \(y=(x-3)^2+2\) 的頂點是 \((3,2)\)，不是 \((-3,2)\)。`

## Required repair invariants

- Exact target set: 28 unique IDs / 29 issue instances. The authoring-language set has 27 explanation deltas. `supp-p1-counting-number-bonds-common-check-v2` additionally changes `options[0].en` and `answer`; `supp-p4-decimals-guided-example` changes only the bilingual prompt.
- Hard negatives over every active HK learner payload: `key fact`, `guided example`, `topic-specific error`, `alternatives instead encode`, `misconceptions`, `關鍵知識`, `引導例題`, `本課題`, `其餘選項`, `具體誤解` when used as template/authoring narration. Mathematical uses of ordinary words must be adjudicated field-by-field rather than globally deleted.
- Every old ID must become retired and resolve byte-exact through immutable history; each successor must be active and selected exactly where its old row would have been selected if it enters a lesson surface.
- Re-run residual partition after the repair: HK active 1003 = displayed 255 + EASE 701 + residual 47, with both intersections empty; residual issue count must be zero after independent reread.
