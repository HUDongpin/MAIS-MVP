# EASE Question Assets Without Question Images

- Date: 2026-05-28
- Session ID: S18
- Purpose: Identify questions under `public/ease_question_assets` that do not have local question-image assets, for later RAG ingestion.
- Source data: `data/ease/ease_questions_all.json`
- Asset root: `public/ease_question_assets`
- Source snapshot timestamp: `2026-05-28T01:14:39.066Z`

## Counting Scope

This report counts only question directories already present under `public/ease_question_assets`.

- Total local question asset directories: 1,010
- Directories with at least one local `questionImages` file: 1,000
- Directories without local `questionImages` files: 10
- Cross-check against JSON metadata: all 10 listed questions have `files.questionImages.length === 0`.
- Important note: these 10 questions do not have question images, but each has 1 local `standardAnswerImages` file.

## Question IDs

Count: 10

Question IDs:

```text
24
32
204
395
582
100000187
100000190
100000193
100000194
100000196
```

Comma-separated:

```text
24, 32, 204, 395, 582, 100000187, 100000190, 100000193, 100000194, 100000196
```

## Summary Table

| Question ID | Level | Grade | Type | Difficulty | Topic | Knowledge Point | Origin | Question Images | Standard Answer Images |
| --- | --- | ---: | --- | ---: | --- | --- | --- | ---: | ---: |
| 24 | junior_secondary | 7 | FRQ | 2 | 數據的表達 / Presentation of data | 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms | The Mission Covenant Church Holm Glad College | 0 | 1 |
| 32 | junior_secondary | 7 | FRQ | 2 | 數據的表達 / Presentation of data | 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms | The Mission Covenant Church Holm Glad College | 0 | 1 |
| 204 | junior_secondary | 7 | FRQ | 3 | 直角坐標系 / Rectangular coordinate system | 認識變換對直角坐標平面上的點的影響 / recognise the effect of transformations on a point in the rectangular coordinate plane | The Mission Covenant Church Holm Glad College | 0 | 1 |
| 395 | junior_secondary | 7 | FRQ | 2 | 數據的表達 / Presentation of data | 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms | The Mission Covenant Church Holm Glad College | 0 | 1 |
| 582 | junior_secondary | 7 | FRQ | 2 | 數據的表達 / Presentation of data | 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms | The Mission Covenant Church Holm Glad College | 0 | 1 |
| 100000187 | junior_secondary | 7 | FRQ | 2 | 多項式 / Polynomials | 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials | ELCHK Lutheran Secondary School | 0 | 1 |
| 100000190 | junior_secondary | 7 | FRQ | 1 | 多項式 / Polynomials | 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials | ELCHK Lutheran Secondary School | 0 | 1 |
| 100000193 | junior_secondary | 7 | FRQ | 1 | 多項式 / Polynomials | 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials | ELCHK Lutheran Secondary School | 0 | 1 |
| 100000194 | junior_secondary | 7 | FRQ | 1 | 多項式 / Polynomials | 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials | ELCHK Lutheran Secondary School | 0 | 1 |
| 100000196 | junior_secondary | 7 | FRQ | 1 | 多項式 / Polynomials | 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials | ELCHK Lutheran Secondary School | 0 | 1 |

## RAG-Ready Question Records

### Question 24

- Question ID: 24
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 2
- Topic: 數據的表達 / Presentation of data
- Knowledge point: 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms
- Origin: The Mission Covenant Church Holm Glad College
- Local question images: none
- Local standard answer image: `public/ease_question_assets/24/standardAnswerImages/01-24a.png`

Question text:

```text
以下所示為兩名玩家在某遊戲中的每局得分（以分為單位）。
        玩家A：
29        12        23        22        13        32        37        26        41        9
        玩家B：
12        7        10        24        8        30        8        14        14        28
(a) 完成以下背靠背幹葉圖以表示以上數據。
(b) 誰的表現普遍較佳，玩家A還是玩家B？試解釋你的答案。
```

Standard answer text:

```text
(a)
[@]24a.png[@]
(b) 從背靠背幹葉圖可見，玩家A的得分普遍較高。因此，玩家A的表現普遍較佳。
```

### Question 32

- Question ID: 32
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 2
- Topic: 數據的表達 / Presentation of data
- Knowledge point: 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms
- Origin: The Mission Covenant Church Holm Glad College
- Local question images: none
- Local standard answer image: `public/ease_question_assets/32/standardAnswerImages/01-32a.png`

Question text:

```text
以下所示為兩組運動員在一次花式溜冰比賽中的得分。
        A組
        9        12        13        8        13        9        9        7        6        9

B組
        12        7        10        12        8        13        8        14        14        7

完成以下的背靠背幹葉圖來表達以上的數據。
```

Standard answer text:

```text
[@]32a.png[@]
```

### Question 204

- Question ID: 204
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 3
- Topic: 直角坐標系 / Rectangular coordinate system
- Knowledge point: 認識變換對直角坐標平面上的點的影響 / recognise the effect of transformations on a point in the rectangular coordinate plane
- Origin: The Mission Covenant Church Holm Glad College
- Local question images: none
- Local standard answer image: `public/ease_question_assets/204/standardAnswerImages/01-204a.png`

Question text:

```text
(a)請在直角坐標平面圖上畫出點  A(1, 2)。
(b)若在直角坐標平面上的點  A(1, 2) 向右平移 2單位後到達 B 點，求B的坐標。並在直角坐標平面圖上畫出B點 。
(c)若C點是點A沿 y軸的反射影像，求 C 的坐標。
(d)若 A 點依順時針方向繞原點旋轉 90°至 D 點，求 D 點的坐標。並在直角坐標平面圖上畫出D點 。
```

Standard answer text:

```text
(a)[@]204a.png[@] (b)3,2 (c)-1,2  (d)2,1
```

### Question 395

- Question ID: 395
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 2
- Topic: 數據的表達 / Presentation of data
- Knowledge point: 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms
- Origin: The Mission Covenant Church Holm Glad College
- Local question images: none
- Local standard answer image: `public/ease_question_assets/395/standardAnswerImages/01-395a.png`

Question text:

```text
以下是15個奇異果的重量（以g為單位）。
94	76	85	63	78	71	75	68
64	60	92	79	81	85	62

製作一個幹葉圖來顯示以上數據。
(a)有多少個奇異果的重量少於75 g？
(b)求最重與最輕的奇異果的重量之差。
```

Standard answer text:

```text
[@]395a.png[@] ;75g;34g
```

### Question 582

- Question ID: 582
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 2
- Topic: 數據的表達 / Presentation of data
- Knowledge point: 闡釋幹葉圖和直方圖 / interpret stem-and-leaf diagrams and histograms
- Origin: The Mission Covenant Church Holm Glad College
- Local question images: none
- Local standard answer image: `public/ease_question_assets/582/standardAnswerImages/01-582a.png`

Question text:

```text
以下是旭文在過去兩星期等候某巴士所花的時間（以分鐘為單位）：
12
10
21
5
23
31
16

24
8
12
25
19
23
31

(a)	製作一個幹葉圖來表達以上數據。
(b)	求最長與最短等候時間之差。
```

Standard answer text:

```text
(a) [@]582a.png[@] (b) 26
```

### Question 100000187

- Question ID: 100000187
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 2
- Topic: 多項式 / Polynomials
- Knowledge point: 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials
- Origin: ELCHK Lutheran Secondary School
- Local question images: none
- Local standard answer image: `public/ease_question_assets/100000187/standardAnswerImages/01-a-1.png`

Question text:

```text
(6h\:–\:5)\:–\:(8h\:+\:2)
```

Standard answer text:

```text
–2h–7
```

### Question 100000190

- Question ID: 100000190
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 1
- Topic: 多項式 / Polynomials
- Knowledge point: 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials
- Origin: ELCHK Lutheran Secondary School
- Local question images: none
- Local standard answer image: `public/ease_question_assets/100000190/standardAnswerImages/01-a-1.png`

Question text:

```text
(–3x\:–\:5y\:+\:2z)\:–\:(–2x\:–\:y\:+\:z)
```

Standard answer text:

```text
-x-4y+z
```

### Question 100000193

- Question ID: 100000193
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 1
- Topic: 多項式 / Polynomials
- Knowledge point: 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials
- Origin: ELCHK Lutheran Secondary School
- Local question images: none
- Local standard answer image: `public/ease_question_assets/100000193/standardAnswerImages/01-a-1.png`

Question text:

```text
(2a^2+a+3)+(–2–2a+a^2)
```

Standard answer text:

```text
3a^2–a+1
```

### Question 100000194

- Question ID: 100000194
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 1
- Topic: 多項式 / Polynomials
- Knowledge point: 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials
- Origin: ELCHK Lutheran Secondary School
- Local question images: none
- Local standard answer image: `public/ease_question_assets/100000194/standardAnswerImages/01-a-1.png`

Question text:

```text
(–3–8ab^2–8a^3+5a^2b)–(12a^3–3a^2b+4)
```

Standard answer text:

```text
–20a^3+8a^2b–8ab^2–7
```

### Question 100000196

- Question ID: 100000196
- Level: junior_secondary
- Grade: 7
- Question type: FRQ
- Difficulty: 1
- Topic: 多項式 / Polynomials
- Knowledge point: 進行多項式的加、減、乘及其混合運算 / perform addition, subtraction, multiplication and their mixed operations of polynomials
- Origin: ELCHK Lutheran Secondary School
- Local question images: none
- Local standard answer image: `public/ease_question_assets/100000196/standardAnswerImages/01-a-1.png`

Question text:

```text
(w^2+3+w)–(–3+w+w^2)
```

Standard answer text:

```text
6
```

## Verification Commands

The inventory was verified by comparing local files under `public/ease_question_assets/<id>/questionImages` against `data/ease/ease_questions_all.json`.

Result:

```text
asset question dirs: 1010
dirs with q images: 1000
dirs without q images: 10
q image count mismatches vs JSON: 0
```
