# EASE DeepSeek V4 Pro QA Report

- Date: 2026-05-28
- Session ID: S18
- Source: `data/ease/ease_questions_all.json`
- Scope: `pilot-100`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Selected rows: 100
- Reviewed rows: 100
- Skipped rows: 9239
- API-error rows: 0

## Executive Summary

| Metric | Count |
| --- | ---: |
| Total EASE questions | 9339 |
| Selected for this run | 100 |
| Reviewed/result rows | 100 |
| Issue rows | 53 |
| P0 rows | 7 |
| P1 rows | 46 |
| P2 rows | 0 |
| Missing answer-key rows in inventory | 73 |
| Image rows in inventory | 1000 |

Release recommendation: Red: answer-key/solvability release gate is blocked until P0 rows are reviewed or fixed.

## Solvability Status Counts

| Solvability status | Count |
| --- | ---: |
| pass | 60 |
| image-context-required | 39 |
| unsolvable | 1 |

## Answer-Match Status Counts

| Answer-match status | Count |
| --- | ---: |
| pass | 47 |
| not-checkable | 30 |
| missing-answer-key | 17 |
| mismatch | 6 |

## Issue Preview

| Question ID | Type | Grade | Image | Solvability | Answer match | Severity | Reason | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `100000080` | BFQ | 8 | true | image-context-required | not-checkable | P1 | 三角形未知量，需要圖片提供邊長/角度資訊。 | 補充圖片或改為文字描述，使題目可供審查。 |
| `192` | FRQ | 7 | true | image-context-required | not-checkable | P1 | 需數線圖片才能標示相反數，且答案為圖片無法比對。 | 提供圖片描述或以文字指出相反數，使審查可行。 |
| `100000027` | FRQ | 7 | false | unsolvable | missing-answer-key | P0 | 題目文字為空，無法作答。 | 補充完整題目及標準答案。 |
| `100000006` | MCQ | 7 | true | image-context-required | not-checkable | P1 | 问题文本仅为'helloworld'且依赖图像，无法解答 | 提供图像或完整问题文本 |
| `10357` | FRQ | 2 | true | image-context-required | missing-answer-key | P1 | 缺少标准答案，且题目依赖月历图像，无法解题 | 提供标准答案和/或月历图像描述 |
| `10339` | FRQ | 2 | false | pass | missing-answer-key | P1 | 可推断单位为米，但缺少标准答案 | 提供标准答案“米”或确认 |
| `10070` | FRQ | 10 | true | image-context-required | not-checkable | P1 | 需要依賴圖像判斷函數圖形，無法純文本解題。 | 提供圖像或文字描述來取代圖像 |
| `4054` | FRQ | 10 | false | pass | mismatch | P0 | u(-3)=\|2*(-3)+1\|-4=\|-5\|-4=1，正確答案為1，與標準答案9不符。 | 修改標準答案為1 |
| `10069` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 需要從圖像判斷m和n的正負，無法純文本解題。 | 提供圖像或文字描述圖形特徵 |
| `4518` | MCQ | 10 | false | pass | mismatch | P0 | I 錯誤（y=mx+b 為二元一次方程），II 正確，III 正確（一元一次方程僅一解），正確選項應為C，而非A。 | 修改標準答案為C |
| `100000345` | BFQ | 8 | true | image-context-required | not-checkable | P1 | Image required to obtain circle dimensions for circumference. | Provide image description or include radius/diameter in text. |
| `55` | FRQ | 7 | false | pass | mismatch | P0 | Computed HCF=18, LCM=7560, but standardAnswer is '187,560'. | Correct standardAnswer to '18, 7560' or '18,7560'. |
| `104` | MCQ | 7 | true | image-context-required | not-checkable | P1 | 需要查看数线图像以确定P的位置，文本无法解决。 | 提供图像描述或数线信息。 |
| `10318` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 需要查看算柱图像以确定数字，且学校未提供答案。 | 提供图像描述或算柱对应数字，并提供标准答案。 |
| `10329` | FRQ | 3 | false | pass | missing-answer-key | P1 | 三月有31天，12×31=372，但学校未提供答案。 | 提供标准答案372。 |
| `9917` | FRQ | 10 | true | image-context-required | not-checkable | P1 | 需要圖片才能判斷圓內接四邊形 | 提供圖片說明或文字描述 |
| `9937` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 需要圖片才能驗證扇形重疊與幾何關係 | 提供圖片說明或文字描述 |
| `100000346` | BFQ | 8 | true | image-context-required | not-checkable | P1 | Circle area requires radius/diameter, which is in the image; cannot verify. | Provide radius/diameter in text or describe the image. |
| `676` | FRQ | 7 | true | image-context-required | not-checkable | P1 | Question requires marking on a number line provided in image; answer is an image file. | Describe the number line in text or provide an alternative non-image answer key. |
| `820` | MCQ | 7 | true | image-context-required | not-checkable | P1 | 須查看大廈圖片中的樓層標示才能判斷升降機停靠層數，無法單獨從文字確定。 | 補充圖片描述或將題目文字改為獨立可解。 |
| `10326` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 題目要求為圖片填色，缺乏圖片無法作答；亦無標準答案提供。 | 提供圖片描述或改為文字題，並提供答案。 |
| `10317` | FRQ | 3 | false | pass | missing-answer-key | P1 | 標準答案缺失；推算最大五位奇數為66005。 | 補充標準答案。 |
| `9962` | FRQ | 10 | true | image-context-required | not-checkable | P1 | 需圖像判斷何者為圓內接四邊形，無法僅從文字驗證答案。 | 提供圖像或補充文字描述 |
| `4056` | FRQ | 10 | false | pass | mismatch | P0 | 計算 s(3)=√(3²+4)=√13，與標準答案5不符。 | 核對並修正答案爲√13 |
| `10033` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 需圖像中的陰影區域判斷對應的不等式，無法僅從文字驗證。 | 提供圖像或補充直線方程式及陰影側的說明 |
| `4520` | MCQ | 10 | false | pass | mismatch | P0 | I錯誤（一元二次方程圖像非拋物線），II正確，III錯誤（可0、1或2解），正確應爲僅II，無對應選項。 | 修正選項或標準答案，例如新增「僅II」選項 |
| `100000347` | BFQ | 8 | true | image-context-required | not-checkable | P1 | 题目需要图像来提供圆的半径或直径，无法仅从文字求解。 | 提供图像或文字描述圆的尺寸。 |
| `739` | FRQ | 7 | true | image-context-required | not-checkable | P1 | 题目需要数线图像才能标记有向数，答案也为图像，无法检查。 | 提供数线图像或文字描述。 |
| `132` | MCQ | 7 | true | image-context-required | not-checkable | P1 | 题目需要图像才能判断阴影部分比例，无法仅从文字求解。 | 提供图形或描述阴影区域。 |
| `10343` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 需要查看量杯圖片才能得知水瓶A的容量。且標準答案未提供。 | 提供圖片或描述量杯刻度; 添加標準答案。 |
| `10379` | FRQ | 3 | false | pass | missing-answer-key | P1 | 題目可解，但標準答案未提供。 | 添加標準答案 20458。 |
| `10131` | FRQ | 11 | true | image-context-required | not-checkable | P1 | 需要查看圖片中的選項才能判斷哪個圖可能是直線的圖像。 | 提供圖片描述或文字選項。 |
| `4057` | FRQ | 10 | false | pass | mismatch | P0 | 計算得 r(2)=6，但標準答案為 2。 | 更正答案為 6。 |
| `10034` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 需要查看圖片中的陰影區域才能判斷正確選項。 | 提供圖片描述或文字描述各選項的陰影區域。 |
| `100000348` | BFQ | 8 | true | image-context-required | not-checkable | P1 | 需要圖片中的半徑或直徑長度才能計算圓面積。 | 提供圓形的直徑或半徑數據。 |
| `2499` | FRQ | 7 | true | image-context-required | missing-answer-key | P1 | Number line image required for marking; answer key is "***" indicating missing. | Provide the number line image and an answer key. |
| `10344` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 需要圖片比較水位判斷容量大小，且無標準答案。 | 提供圖片描述或標準答案。 |
| `10330` | FRQ | 3 | false | pass | missing-answer-key | P1 | 可解，8x為兩位數80+x，得x=4，但缺少標準答案。 | 提供標準答案為4。 |
| `9978` | FRQ | 12 | true | image-context-required | not-checkable | P1 | 需要幹葉圖和框線圖的圖片才能判斷，無法驗證選項B是否正確。 | 提供圖片或詳細描述。 |
| `10035` | MCQ | 10 | true | image-context-required | not-checkable | P1 | Item requires the graph of the feasible region to determine which inequalities are constraints; cannot inspect image. | Provide a text description of the feasible region or ensure image accessibility. |
| `100000119` | BFQ | 9 | true | image-context-required | not-checkable | P1 | Requires the image to identify what special line PQ is; cannot inspect image. | Provide a text description of the geometric figure. |
| `2500` | FRQ | 7 | true | image-context-required | missing-answer-key | P1 | Requires the number line image to verify placement of points; answer key is missing (placeholder '***'). | Provide the answer key and a text description of the number line or make image accessible. |
| `10345` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 需圖片讀取容器刻度才能判斷容量，且學校未提供標準答案。 | 提供圖片或描述容器刻度，並補充答案。 |
| `10319` | FRQ | 3 | false | pass | missing-answer-key | P1 | 标准答案缺失，但题目可独立求解，计算得299。 | 提供标准答案。 |
| `10230` | FRQ | 12 | true | image-context-required | not-checkable | P1 | 题目依赖茎叶图和箱线图，图像无法查看，无法验证。 | 提供图像描述或标记为图像依赖项。 |
| `10036` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 题目依赖坐标系图像，无法查看三角形区域，无法验证。 | 提供图像描述或标记为图像依赖项。 |
| `100000120` | BFQ | 9 | true | image-context-required | not-checkable | P1 | 題目要求判斷三角形的特殊線，但未提供圖像或文字描述，無法求解。 | 提供圖像描述或替代文本。 |
| `2501` | FRQ | 7 | true | image-context-required | not-checkable | P1 | 題目要求從數線讀取P, Q, R的值，但未提供數線圖像或數學描述。 | 提供數線數值或圖像描述。 |
| `10358` | FRQ | 3 | true | image-context-required | missing-answer-key | P1 | 問題依賴圖片內容，無法僅從文本判斷答案，且標準答案缺失 | 提供圖片內容或補充標準答案 |
| `10388` | FRQ | 3 | false | pass | missing-answer-key | P1 | 標準答案缺失，但問題可解 | 補充標準答案 |
| `10038` | MCQ | 10 | true | image-context-required | not-checkable | P1 | 圖像未提供，無法確定陰影區域OPQR的頂點，從而無法求x+y+5的極大值。 | 提供標明點O、P、Q、R的圖像或文字描述。 |
| `100000128` | BFQ | 9 | true | image-context-required | not-checkable | P1 | 題目依賴圖像判斷PQ的類型，無法僅由文字得出答案。 | 提供圖像或補充幾何條件描述。 |
| `2502` | FRQ | 7 | true | image-context-required | not-checkable | P1 | 題目依賴數線圖像判斷X、Y、Z的值。 | 提供數線圖像或文字描述各點位置。 |

## Completion Check

- Processed non-error + skipped + API-error: 9339
- Expected total: 9339

## Secret Hygiene

- No API key, bearer token, request header, or raw provider transcript is written by this runner.
- Live runs should use a rotated key in `LLM_API_KEY`; do not pass keys as command-line arguments.
- The exposed chat key should be considered compromised and rotated by S19/owner before full QA.
