# 沪教版小学题目插图需求统计（S18）

- Date: 2026-05-27
- Session ID: S18
- Source: `coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json`
- Scope: 沪教版小学 P1-P6 题库，报告与清单生成；不生成图片，不修改题库源码，不修改 `types/index.ts`。
- Inventory outputs: `question-illustration-inventory.csv`, `question-illustration-inventory.json`

## Executive Summary

本次统计覆盖沪教版小学题库 1,500 题，P1-P6 各 250 题。当前源题库中可识别的题目插图、图片或通用视觉提示字段为 0 个。

按教学产品口径，建议优先为 1,145 题配置题目插图，占 76.3%。其中 A 必须配图 607 题，B 强烈建议配图 538 题，C 可纯文字或暂缓 355 题。

## Tier Definition

| Tier | Meaning | Usage |
| --- | --- | --- |
| A_required | 没有图会明显影响理解或作答 | GPT Image2 第一批；优先处理数一数、积木、钟面、方位、统计图、几何图形、展开图、面积/体积示意。 |
| B_strong_recommended | 文字可作答，但插图显著改善小学生体验 | GPT Image2 第二批；重点覆盖低年级具象场景与中高年级视觉模型。 |
| C_optional_or_text_only | 纯文字、计算或符号推理为主 | A/B 完成后再评估；默认暂缓。 |

## Counts

### Overall Tier Counts

| needTier | count | share |
| --- | --- | --- |
| A_required | 607 | 40.5% |
| B_strong_recommended | 538 | 35.9% |
| C_optional_or_text_only | 355 | 23.7% |

### Grade x Tier

| grade | total | A_required | B_strong_recommended | C_optional_or_text_only | A+B share |
| --- | --- | --- | --- | --- | --- |
| P1 | 250 | 123 | 127 | 0 | 100.0% |
| P2 | 250 | 123 | 127 | 0 | 100.0% |
| P3 | 250 | 78 | 114 | 58 | 76.8% |
| P4 | 250 | 100 | 73 | 77 | 69.2% |
| P5 | 250 | 117 | 33 | 100 | 60.0% |
| P6 | 250 | 66 | 64 | 120 | 52.0% |

### Question Type Counts

| questionType | count |
| --- | --- |
| fill-in | 540 |
| multiple-choice | 600 |
| short-answer | 360 |

### Difficulty Counts

| difficulty | count |
| --- | --- |
| Challenge | 216 |
| Core | 661 |
| Exam | 70 |
| Foundation | 553 |

## Visual Categories

| visualCategory | count |
| --- | --- |
| text_calculation_only | 317 |
| plane_geometry | 235 |
| counting_manipulatives | 122 |
| money_shopping | 120 |
| fraction_area_model | 110 |
| time_clock | 102 |
| array_multiplication_division | 98 |
| solid_shapes_blocks | 91 |
| sorting_data_chart | 85 |
| circle_sector_model | 52 |
| measurement_ruler | 48 |
| position_map | 45 |
| probability_scene | 27 |
| equation_number_model | 25 |
| ratio_proportion_model | 23 |

## Top A/B Units For GPT Image2 Planning

| grade | volume | unitTitle | needTier | count |
| --- | --- | --- | --- | --- |
| P5 | 五年级上册 | 平面图形面积 | A_required | 31 |
| P5 | 五年级下册 | 长方体、正方体与体积 | B_strong_recommended | 28 |
| P5 | 五年级下册 | 统计表达与综合应用 | A_required | 26 |
| P2 | 二年级上册 | 校园方位与位置表达 | A_required | 23 |
| P4 | 四年级下册 | 统计 | A_required | 22 |
| P5 | 五年级上册 | 数据整理与平均数 | A_required | 22 |
| P1 | 一年级上册 | 10以内数的加减法 | B_strong_recommended | 19 |
| P1 | 一年级上册 | 认识立体图形 | A_required | 19 |
| P1 | 一年级下册 | 长度的比较与测量 | A_required | 19 |
| P6 | 六年级下册 | 可能性与统计图表 | A_required | 18 |
| P1 | 一年级下册 | 时间的初步认识 | A_required | 17 |
| P3 | 三年级上册（老课本暂用） | 时间与日程推理 | B_strong_recommended | 17 |
| P4 | 四年级上册 | 分数的初步认识（二） | B_strong_recommended | 17 |
| P2 | 二年级上册 | 100以内数的加减法（二） | B_strong_recommended | 16 |
| P2 | 二年级上册 | 人民币与购物应用 | B_strong_recommended | 16 |
| P2 | 二年级下册 | 表内除法 | B_strong_recommended | 16 |
| P3 | 三年级上册（老课本暂用） | 乘与除 | B_strong_recommended | 16 |
| P4 | 四年级上册 | 几何小实践 | B_strong_recommended | 16 |
| P4 | 四年级上册 | 四年级上册整理与提高 | B_strong_recommended | 16 |
| P6 | 6年级上册 | 圆和扇形 | B_strong_recommended | 16 |
| P3 | 三年级上册（老课本暂用） | 三年级上册数学广场与整理复习 | B_strong_recommended | 15 |
| P4 | 四年级下册 | 四年级下册整理与提高 | A_required | 15 |
| P6 | 六年级下册 | 圆柱与圆锥 | B_strong_recommended | 15 |
| P6 | 六年级下册 | 长方体 | B_strong_recommended | 15 |

## Validation

| Check | Result |
| --- | --- |
| Total questions equals 1,500 | PASS |
| P1-P6 each equals 250 | PASS |
| Tier totals sum to 1,500 | PASS |
| Current diagram/image-like markers equal 0 | PASS |
| Inventory JSON row shape uses fixed requested fields | PASS |
| CSV header uses fixed requested fields | PASS |
| S18 tier spot-check reviewed: 20 IDs per grade | PASS |

## Spot-Check Samples

These deterministic samples were reviewed for S18 manual tier sanity checking. Each grade includes 20 IDs spanning the 250-row grade block.

| grade | sampleQuestionIds |
| --- | --- |
| P1 | hjb-primary-ds-v1-p1-001, hjb-primary-ds-v1-p1-013, hjb-primary-ds-v1-p1-025, hjb-primary-ds-v1-p1-037, hjb-primary-ds-v1-p1-049, hjb-primary-ds-v1-p1-061, hjb-primary-ds-v1-p1-073, hjb-primary-ds-v1-p1-085, hjb-primary-ds-v1-p1-097, hjb-primary-ds-v1-p1-109, hjb-primary-ds-v1-p1-121, hjb-primary-ds-v1-p1-133, hjb-primary-ds-v1-p1-145, hjb-primary-ds-v1-p1-157, hjb-primary-ds-v1-p1-169, hjb-primary-ds-v1-p1-181, hjb-primary-ds-v1-p1-193, hjb-primary-ds-v1-p1-205, hjb-primary-ds-v1-p1-217, hjb-primary-ds-v1-p1-229 |
| P2 | hjb-primary-ds-v1-p2-001, hjb-primary-ds-v1-p2-013, hjb-primary-ds-v1-p2-025, hjb-primary-ds-v1-p2-037, hjb-primary-ds-v1-p2-049, hjb-primary-ds-v1-p2-061, hjb-primary-ds-v1-p2-073, hjb-primary-ds-v1-p2-085, hjb-primary-ds-v1-p2-097, hjb-primary-ds-v1-p2-109, hjb-primary-ds-v1-p2-121, hjb-primary-ds-v1-p2-133, hjb-primary-ds-v1-p2-145, hjb-primary-ds-v1-p2-157, hjb-primary-ds-v1-p2-169, hjb-primary-ds-v1-p2-181, hjb-primary-ds-v1-p2-193, hjb-primary-ds-v1-p2-205, hjb-primary-ds-v1-p2-217, hjb-primary-ds-v1-p2-229 |
| P3 | hjb-primary-ds-v1-p3-001, hjb-primary-ds-v1-p3-013, hjb-primary-ds-v1-p3-025, hjb-primary-ds-v1-p3-037, hjb-primary-ds-v1-p3-049, hjb-primary-ds-v1-p3-061, hjb-primary-ds-v1-p3-073, hjb-primary-ds-v1-p3-085, hjb-primary-ds-v1-p3-097, hjb-primary-ds-v1-p3-109, hjb-primary-ds-v1-p3-121, hjb-primary-ds-v1-p3-133, hjb-primary-ds-v1-p3-145, hjb-primary-ds-v1-p3-157, hjb-primary-ds-v1-p3-169, hjb-primary-ds-v1-p3-181, hjb-primary-ds-v1-p3-193, hjb-primary-ds-v1-p3-205, hjb-primary-ds-v1-p3-217, hjb-primary-ds-v1-p3-229 |
| P4 | hjb-primary-ds-v1-p4-001, hjb-primary-ds-v1-p4-013, hjb-primary-ds-v1-p4-025, hjb-primary-ds-v1-p4-037, hjb-primary-ds-v1-p4-049, hjb-primary-ds-v1-p4-061, hjb-primary-ds-v1-p4-073, hjb-primary-ds-v1-p4-085, hjb-primary-ds-v1-p4-097, hjb-primary-ds-v1-p4-109, hjb-primary-ds-v1-p4-121, hjb-primary-ds-v1-p4-133, hjb-primary-ds-v1-p4-145, hjb-primary-ds-v1-p4-157, hjb-primary-ds-v1-p4-169, hjb-primary-ds-v1-p4-181, hjb-primary-ds-v1-p4-193, hjb-primary-ds-v1-p4-205, hjb-primary-ds-v1-p4-217, hjb-primary-ds-v1-p4-229 |
| P5 | hjb-primary-ds-v1-p5-001, hjb-primary-ds-v1-p5-013, hjb-primary-ds-v1-p5-025, hjb-primary-ds-v1-p5-037, hjb-primary-ds-v1-p5-049, hjb-primary-ds-v1-p5-061, hjb-primary-ds-v1-p5-073, hjb-primary-ds-v1-p5-085, hjb-primary-ds-v1-p5-097, hjb-primary-ds-v1-p5-109, hjb-primary-ds-v1-p5-121, hjb-primary-ds-v1-p5-133, hjb-primary-ds-v1-p5-145, hjb-primary-ds-v1-p5-157, hjb-primary-ds-v1-p5-169, hjb-primary-ds-v1-p5-181, hjb-primary-ds-v1-p5-193, hjb-primary-ds-v1-p5-205, hjb-primary-ds-v1-p5-217, hjb-primary-ds-v1-p5-229 |
| P6 | hjb-primary-ds-v1-p6-001, hjb-primary-ds-v1-p6-013, hjb-primary-ds-v1-p6-025, hjb-primary-ds-v1-p6-037, hjb-primary-ds-v1-p6-049, hjb-primary-ds-v1-p6-061, hjb-primary-ds-v1-p6-073, hjb-primary-ds-v1-p6-085, hjb-primary-ds-v1-p6-097, hjb-primary-ds-v1-p6-109, hjb-primary-ds-v1-p6-121, hjb-primary-ds-v1-p6-133, hjb-primary-ds-v1-p6-145, hjb-primary-ds-v1-p6-157, hjb-primary-ds-v1-p6-169, hjb-primary-ds-v1-p6-181, hjb-primary-ds-v1-p6-193, hjb-primary-ds-v1-p6-205, hjb-primary-ds-v1-p6-217, hjb-primary-ds-v1-p6-229 |

## Recommended GPT Image2 Production Order

1. Start with all `A_required` rows, grouped by `visualCategory`, because these are most likely to need a picture to make the question clear.
2. Generate reusable scene/template families before one-off variants: counting manipulatives, solid shapes, clocks, rulers, money, classroom/location maps, arrays, charts, plane geometry, fraction area models, and 3D solids.
3. Treat text/math labels as overlay candidates where precision matters, especially clocks, charts, coordinates, dimensions, fractions, and geometry labels.
4. Move to `B_strong_recommended` after A assets pass S18 content QA.
5. Leave `C_optional_or_text_only` as a later enhancement queue.

## Notes

- The classification is intentionally conservative for primary-school learning: it counts teaching-value illustrations, not only strictly necessary diagrams.
- Tier and visual-category classification use prompt, unit title, and concept IDs so the report matches the planned baseline and avoids over-broad production grouping.
- `needTier` is the decision field for production priority; `visualCategory` is a planning aid for batching GPT Image2 prompts and should be reviewed again before final prompt writing.
- The inventory keeps `assetStatus=not-generated` for every row because GPT Image2 generation is intentionally outside this task.
- Future app integration should use a separate image-manifest/type design rather than editing the current question bank directly.
