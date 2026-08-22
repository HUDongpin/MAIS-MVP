import type { LocalizedText } from "@/types";

export type MainlandHjbPrimaryLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandHjbPrimaryLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandHjbPrimaryLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

export const mainlandHjbPrimaryLessonIllustrations = [
  {
    "id": "hjb-primary-p1-upper-school-math-habits-concept",
    "topicId": "hjb-primary-p1-upper-school-math-habits",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-school-math-habits/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A tidy math-learning scene shows counters, tool cards, checking arrows, and observation cues. The theme matches the HJB unit Becoming a Primary Student and Math Learning Habits.",
      "zh": "整洁的数学学习场景展示计数片、工具卡片、检查箭头和观察线索。主题对应沪教版《我是小学生与数学学习习惯》。",
      "zhHans": "整洁的数学学习场景展示计数片、工具卡片、检查箭头和观察线索。主题对应沪教版《我是小学生与数学学习习惯》。"
    },
    "caption": {
      "en": "Good math habits begin with observing, explaining, checking, and using tools.",
      "zh": "良好的数学习惯从观察、表达、检查和使用工具开始。",
      "zhHans": "良好的数学习惯从观察、表达、检查和使用工具开始。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-school-math-habits"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-school-math-habits-worked-example",
    "topicId": "hjb-primary-p1-upper-school-math-habits",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-school-math-habits/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "A tidy math-learning scene shows counters, tool cards, checking arrows, and observation cues. The visual is arranged as a worked-example workspace for the HJB unit Becoming a Primary Student and Math Learning Habits.",
      "zh": "整洁的数学学习场景展示计数片、工具卡片、检查箭头和观察线索。画面以例题工作区方式对应沪教版《我是小学生与数学学习习惯》。",
      "zhHans": "整洁的数学学习场景展示计数片、工具卡片、检查箭头和观察线索。画面以例题工作区方式对应沪教版《我是小学生与数学学习习惯》。"
    },
    "caption": {
      "en": "Good math habits begin with observing, explaining, checking, and using tools. In a worked example, connect the model, the steps, and the check.",
      "zh": "良好的数学习惯从观察、表达、检查和使用工具开始。例题中要把模型、步骤和检查连起来。",
      "zhHans": "良好的数学习惯从观察、表达、检查和使用工具开始。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-school-math-habits"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-solids-introduction-concept",
    "topicId": "hjb-primary-p1-upper-solids-introduction",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-solids-introduction/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The theme matches the HJB unit Understanding Solid Shapes.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《认识立体图形》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《认识立体图形》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume.",
      "zh": "立体图形要分清结构、表面积和体积。",
      "zhHans": "立体图形要分清结构、表面积和体积。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-solids-introduction"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-solids-introduction-worked-example",
    "topicId": "hjb-primary-p1-upper-solids-introduction",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-solids-introduction/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The visual is arranged as a worked-example workspace for the HJB unit Understanding Solid Shapes.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《认识立体图形》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《认识立体图形》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume. In a worked example, connect the model, the steps, and the check.",
      "zh": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。",
      "zhHans": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-solids-introduction"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-10-number-sense-concept",
    "topicId": "hjb-primary-p1-upper-within-10-number-sense",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-10-number-sense/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The theme matches the HJB unit Understanding Numbers within 10.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《10以内数的认识》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《10以内数的认识》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-10-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-10-number-sense-worked-example",
    "topicId": "hjb-primary-p1-upper-within-10-number-sense",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-10-number-sense/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The visual is arranged as a worked-example workspace for the HJB unit Understanding Numbers within 10.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《10以内数的认识》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《10以内数的认识》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position. In a worked example, connect the model, the steps, and the check.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-10-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-10-add-sub-concept",
    "topicId": "hjb-primary-p1-upper-within-10-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-10-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The theme matches the HJB unit Addition and Subtraction within 10.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《10以内数的加减法》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《10以内数的加减法》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-10-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-10-add-sub-worked-example",
    "topicId": "hjb-primary-p1-upper-within-10-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-10-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The visual is arranged as a worked-example workspace for the HJB unit Addition and Subtraction within 10.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《10以内数的加减法》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《10以内数的加减法》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result. In a worked example, connect the model, the steps, and the check.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-10-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-20-number-add-sub-concept",
    "topicId": "hjb-primary-p1-upper-within-20-number-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-20-number-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The theme matches the HJB unit Numbers within 20 and Non-Regrouping Addition and Subtraction.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《20以内的数与不进位不退位加减》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《20以内的数与不进位不退位加减》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-20-number-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-within-20-number-add-sub-worked-example",
    "topicId": "hjb-primary-p1-upper-within-20-number-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-within-20-number-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The visual is arranged as a worked-example workspace for the HJB unit Numbers within 20 and Non-Regrouping Addition and Subtraction.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《20以内的数与不进位不退位加减》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《20以内的数与不进位不退位加减》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result. In a worked example, connect the model, the steps, and the check.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-within-20-number-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-review-concept",
    "topicId": "hjb-primary-p1-upper-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The theme matches the HJB unit Grade 1 Volume 1 Review and Consolidation.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《一年级上册整理与复习》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《一年级上册整理与复习》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume.",
      "zh": "立体图形要分清结构、表面积和体积。",
      "zhHans": "立体图形要分清结构、表面积和体积。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-review"
    ]
  },
  {
    "id": "hjb-primary-p1-upper-review-worked-example",
    "topicId": "hjb-primary-p1-upper-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-upper-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The visual is arranged as a worked-example workspace for the HJB unit Grade 1 Volume 1 Review and Consolidation.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《一年级上册整理与复习》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《一年级上册整理与复习》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume. In a worked example, connect the model, the steps, and the check.",
      "zh": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。",
      "zhHans": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-upper-review"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-20-regrouping-concept",
    "topicId": "hjb-primary-p1-lower-within-20-regrouping",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-20-regrouping/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The theme matches the HJB unit Addition and Subtraction within 20 (II).",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《20以内数的加减法（二）》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《20以内数的加减法（二）》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-20-regrouping"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-20-regrouping-worked-example",
    "topicId": "hjb-primary-p1-lower-within-20-regrouping",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-20-regrouping/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The visual is arranged as a worked-example workspace for the HJB unit Addition and Subtraction within 20 (II).",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《20以内数的加减法（二）》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《20以内数的加减法（二）》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result. In a worked example, connect the model, the steps, and the check.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-20-regrouping"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-100-number-sense-concept",
    "topicId": "hjb-primary-p1-lower-within-100-number-sense",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-100-number-sense/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The theme matches the HJB unit Numbers within 100.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《100以内的数》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《100以内的数》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-100-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-100-number-sense-worked-example",
    "topicId": "hjb-primary-p1-lower-within-100-number-sense",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-100-number-sense/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The visual is arranged as a worked-example workspace for the HJB unit Numbers within 100.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《100以内的数》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《100以内的数》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position. In a worked example, connect the model, the steps, and the check.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-100-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-100-add-sub-concept",
    "topicId": "hjb-primary-p1-lower-within-100-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-100-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The theme matches the HJB unit Addition and Subtraction within 100 (I).",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《100以内数的加减法（一）》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《100以内数的加减法（一）》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-within-100-add-sub-worked-example",
    "topicId": "hjb-primary-p1-lower-within-100-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-within-100-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The visual is arranged as a worked-example workspace for the HJB unit Addition and Subtraction within 100 (I).",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《100以内数的加减法（一）》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《100以内数的加减法（一）》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result. In a worked example, connect the model, the steps, and the check.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-within-100-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-time-introduction-concept",
    "topicId": "hjb-primary-p1-lower-time-introduction",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-time-introduction/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Introductory Time.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《时间的初步认识》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《时间的初步认识》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-time-introduction"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-time-introduction-worked-example",
    "topicId": "hjb-primary-p1-lower-time-introduction",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-time-introduction/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Introductory Time.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《时间的初步认识》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《时间的初步认识》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-time-introduction"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-length-measurement-concept",
    "topicId": "hjb-primary-p1-lower-length-measurement",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-length-measurement/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Comparing and Measuring Length.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《长度的比较与测量》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《长度的比较与测量》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-length-measurement"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-length-measurement-worked-example",
    "topicId": "hjb-primary-p1-lower-length-measurement",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-length-measurement/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Comparing and Measuring Length.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《长度的比较与测量》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《长度的比较与测量》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-length-measurement"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-body-rulers-math-square-concept",
    "topicId": "hjb-primary-p1-lower-body-rulers-math-square",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-body-rulers-math-square/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Body-Based Measures and Math Square.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《身体上的尺子与数学广场》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《身体上的尺子与数学广场》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-body-rulers-math-square"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-body-rulers-math-square-worked-example",
    "topicId": "hjb-primary-p1-lower-body-rulers-math-square",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-body-rulers-math-square/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Body-Based Measures and Math Square.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《身体上的尺子与数学广场》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《身体上的尺子与数学广场》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-body-rulers-math-square"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-review-concept",
    "topicId": "hjb-primary-p1-lower-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 1 Volume 2 Review and Consolidation.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《一年级下册整理与复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《一年级下册整理与复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-review"
    ]
  },
  {
    "id": "hjb-primary-p1-lower-review-worked-example",
    "topicId": "hjb-primary-p1-lower-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 1 Volume 2 Review and Consolidation.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《一年级下册整理与复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《一年级下册整理与复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p1-lower-review"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-within-100-add-sub-concept",
    "topicId": "hjb-primary-p2-upper-within-100-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-within-100-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Addition and Subtraction within 100 (II).",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《100以内数的加减法（二）》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《100以内数的加减法（二）》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-within-100-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-within-100-add-sub-worked-example",
    "topicId": "hjb-primary-p2-upper-within-100-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-within-100-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Addition and Subtraction within 100 (II).",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《100以内数的加减法（二）》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《100以内数的加减法（二）》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-within-100-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-money-shopping-concept",
    "topicId": "hjb-primary-p2-upper-money-shopping",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-money-shopping/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Toy coins, a shopping tray, direction arrows, and position tiles show everyday quantity relationships. The theme matches the HJB unit Renminbi and Shopping Applications.",
      "zh": "玩具硬币、购物托盘、方向箭头和位置方块展示生活数量关系。主题对应沪教版《人民币与购物应用》。",
      "zhHans": "玩具硬币、购物托盘、方向箭头和位置方块展示生活数量关系。主题对应沪教版《人民币与购物应用》。"
    },
    "caption": {
      "en": "Everyday math starts by identifying units and positions before explaining change.",
      "zh": "生活数学要先认清单位和位置，再解释数量变化。",
      "zhHans": "生活数学要先认清单位和位置，再解释数量变化。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-money-shopping"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-money-shopping-worked-example",
    "topicId": "hjb-primary-p2-upper-money-shopping",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-money-shopping/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Toy coins, a shopping tray, direction arrows, and position tiles show everyday quantity relationships. The visual is arranged as a worked-example workspace for the HJB unit Renminbi and Shopping Applications.",
      "zh": "玩具硬币、购物托盘、方向箭头和位置方块展示生活数量关系。画面以例题工作区方式对应沪教版《人民币与购物应用》。",
      "zhHans": "玩具硬币、购物托盘、方向箭头和位置方块展示生活数量关系。画面以例题工作区方式对应沪教版《人民币与购物应用》。"
    },
    "caption": {
      "en": "Everyday math starts by identifying units and positions before explaining change. In a worked example, connect the model, the steps, and the check.",
      "zh": "生活数学要先认清单位和位置，再解释数量变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "生活数学要先认清单位和位置，再解释数量变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-money-shopping"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-school-position-direction-concept",
    "topicId": "hjb-primary-p2-upper-school-position-direction",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-school-position-direction/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit School Directions and Position Language.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《校园方位与位置表达》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《校园方位与位置表达》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-school-position-direction"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-school-position-direction-worked-example",
    "topicId": "hjb-primary-p2-upper-school-position-direction",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-school-position-direction/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit School Directions and Position Language.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《校园方位与位置表达》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《校园方位与位置表达》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-school-position-direction"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-multiplication-facts-concept",
    "topicId": "hjb-primary-p2-upper-multiplication-facts",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-multiplication-facts/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Multiplication Facts.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《表内乘法》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《表内乘法》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-multiplication-facts-worked-example",
    "topicId": "hjb-primary-p2-upper-multiplication-facts",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-multiplication-facts/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Multiplication Facts.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《表内乘法》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《表内乘法》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-multiplication-facts"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-classification-concept",
    "topicId": "hjb-primary-p2-upper-classification",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-classification/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Sorting and Organizing.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《分类与整理》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《分类与整理》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-classification"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-classification-worked-example",
    "topicId": "hjb-primary-p2-upper-classification",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-classification/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Sorting and Organizing.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《分类与整理》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《分类与整理》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-classification"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-math-square-review-concept",
    "topicId": "hjb-primary-p2-upper-math-square-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-math-square-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 2 Volume 1 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《二年级上册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《二年级上册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p2-upper-math-square-review-worked-example",
    "topicId": "hjb-primary-p2-upper-math-square-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-upper-math-square-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 2 Volume 1 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《二年级上册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《二年级上册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-upper-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-division-facts-concept",
    "topicId": "hjb-primary-p2-lower-division-facts",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-division-facts/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Division Facts.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《表内除法》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《表内除法》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-division-facts"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-division-facts-worked-example",
    "topicId": "hjb-primary-p2-lower-division-facts",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-division-facts/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Division Facts.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《表内除法》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《表内除法》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-division-facts"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-time-concept",
    "topicId": "hjb-primary-p2-lower-time",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-time/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Finding Time.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《时间在哪里》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《时间在哪里》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-time"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-time-worked-example",
    "topicId": "hjb-primary-p2-lower-time",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-time/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Finding Time.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《时间在哪里》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《时间在哪里》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-time"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-within-10000-number-sense-concept",
    "topicId": "hjb-primary-p2-lower-within-10000-number-sense",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-within-10000-number-sense/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The theme matches the HJB unit Numbers within 10,000.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《万以内的数》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。主题对应沪教版《万以内的数》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-within-10000-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-within-10000-number-sense-worked-example",
    "topicId": "hjb-primary-p2-lower-within-10000-number-sense",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-within-10000-number-sense/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Place-value blocks, counters, ten-frame structure, and a number-line path support number sense. The visual is arranged as a worked-example workspace for the HJB unit Numbers within 10,000.",
      "zh": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《万以内的数》。",
      "zhHans": "位值块、计数片、十格结构和数线路径帮助理解数感。画面以例题工作区方式对应沪教版《万以内的数》。"
    },
    "caption": {
      "en": "Read the quantity structure first, then explain composition and position. In a worked example, connect the model, the steps, and the check.",
      "zh": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。",
      "zhHans": "先看清数量结构，再把数的组成和位置说清楚。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-within-10000-number-sense"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-two-three-digit-add-sub-concept",
    "topicId": "hjb-primary-p2-lower-two-three-digit-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-two-three-digit-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The theme matches the HJB unit Addition and Subtraction of Two- and Three-Digit Numbers.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《两位数与三位数的加减法》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。主题对应沪教版《两位数与三位数的加减法》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-two-three-digit-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-two-three-digit-add-sub-worked-example",
    "topicId": "hjb-primary-p2-lower-two-three-digit-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-two-three-digit-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Grouped counters, regrouping trays, part-whole bars, and movement paths show calculation thinking. The visual is arranged as a worked-example workspace for the HJB unit Addition and Subtraction of Two- and Three-Digit Numbers.",
      "zh": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《两位数与三位数的加减法》。",
      "zhHans": "分组计数片、重组托盘、部分整体条和进退路径展示运算思路。画面以例题工作区方式对应沪教版《两位数与三位数的加减法》。"
    },
    "caption": {
      "en": "Decide the quantity relationship first, then use a model to check the result. In a worked example, connect the model, the steps, and the check.",
      "zh": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。",
      "zhHans": "运算前先判断数量关系，再用模型检查结果是否合理。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-two-three-digit-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-math-square-review-concept",
    "topicId": "hjb-primary-p2-lower-math-square-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-math-square-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 2 Volume 2 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《二年级下册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《二年级下册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p2-lower-math-square-review-worked-example",
    "topicId": "hjb-primary-p2-lower-math-square-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p2-lower-math-square-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 2 Volume 2 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《二年级下册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《二年级下册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p2-lower-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-review-place-value-operations-concept",
    "topicId": "hjb-primary-p3-upper-review-place-value-operations",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-review-place-value-operations/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 3 Volume 1 Review and Number Operations.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级上册复习与数的运算》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级上册复习与数的运算》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-review-place-value-operations"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-review-place-value-operations-worked-example",
    "topicId": "hjb-primary-p3-upper-review-place-value-operations",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-review-place-value-operations/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 3 Volume 1 Review and Number Operations.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级上册复习与数的运算》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级上册复习与数的运算》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-review-place-value-operations"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-multiplication-division-extension-concept",
    "topicId": "hjb-primary-p3-upper-multiplication-division-extension",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-multiplication-division-extension/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Multiplication and Division.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《乘与除》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《乘与除》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-multiplication-division-extension"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-multiplication-division-extension-worked-example",
    "topicId": "hjb-primary-p3-upper-multiplication-division-extension",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-multiplication-division-extension/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Multiplication and Division.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《乘与除》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《乘与除》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-multiplication-division-extension"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-time-measurement-concept",
    "topicId": "hjb-primary-p3-upper-time-measurement",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-time-measurement/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Time and Schedule Reasoning.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《时间与日程推理》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《时间与日程推理》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-time-measurement"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-time-measurement-worked-example",
    "topicId": "hjb-primary-p3-upper-time-measurement",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-time-measurement/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Time and Schedule Reasoning.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《时间与日程推理》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《时间与日程推理》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-time-measurement"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-one-digit-multiplication-concept",
    "topicId": "hjb-primary-p3-upper-one-digit-multiplication",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-one-digit-multiplication/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Multiplication by a One-Digit Number.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《用一位数乘》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《用一位数乘》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-one-digit-multiplication"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-one-digit-multiplication-worked-example",
    "topicId": "hjb-primary-p3-upper-one-digit-multiplication",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-one-digit-multiplication/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Multiplication by a One-Digit Number.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《用一位数乘》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《用一位数乘》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-one-digit-multiplication"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-rectangle-square-geometry-concept",
    "topicId": "hjb-primary-p3-upper-rectangle-square-geometry",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-rectangle-square-geometry/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit Rectangles and Squares.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《长方形与正方形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《长方形与正方形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-rectangle-square-geometry"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-rectangle-square-geometry-worked-example",
    "topicId": "hjb-primary-p3-upper-rectangle-square-geometry",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-rectangle-square-geometry/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit Rectangles and Squares.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《长方形与正方形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《长方形与正方形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-rectangle-square-geometry"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-fraction-introduction-concept",
    "topicId": "hjb-primary-p3-upper-fraction-introduction",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-fraction-introduction/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The theme matches the HJB unit Introductory Fractions.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《分数的初步认识》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《分数的初步认识》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-fraction-introduction"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-fraction-introduction-worked-example",
    "topicId": "hjb-primary-p3-upper-fraction-introduction",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-fraction-introduction/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The visual is arranged as a worked-example workspace for the HJB unit Introductory Fractions.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《分数的初步认识》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《分数的初步认识》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts. In a worked example, connect the model, the steps, and the check.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-fraction-introduction"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-math-square-review-concept",
    "topicId": "hjb-primary-p3-upper-math-square-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-math-square-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 3 Volume 1 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级上册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级上册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p3-upper-math-square-review-worked-example",
    "topicId": "hjb-primary-p3-upper-math-square-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-upper-math-square-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 3 Volume 1 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级上册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级上册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-upper-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-review-multiplication-division-concept",
    "topicId": "hjb-primary-p3-lower-review-multiplication-division",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-review-multiplication-division/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Grade 3 Volume 2 Review and Multiplication-Division.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《三年级下册复习与乘除运算》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《三年级下册复习与乘除运算》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-review-multiplication-division"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-review-multiplication-division-worked-example",
    "topicId": "hjb-primary-p3-lower-review-multiplication-division",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-review-multiplication-division/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Grade 3 Volume 2 Review and Multiplication-Division.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《三年级下册复习与乘除运算》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《三年级下册复习与乘除运算》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-review-multiplication-division"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-two-digit-multiplication-division-concept",
    "topicId": "hjb-primary-p3-lower-two-digit-multiplication-division",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-two-digit-multiplication-division/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Two-Digit Multiplication, Division, and Problem Solving.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《两位数乘除与问题解决》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《两位数乘除与问题解决》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-two-digit-multiplication-division"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-two-digit-multiplication-division-worked-example",
    "topicId": "hjb-primary-p3-lower-two-digit-multiplication-division",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-two-digit-multiplication-division/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Two-Digit Multiplication, Division, and Problem Solving.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《两位数乘除与问题解决》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《两位数乘除与问题解决》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-two-digit-multiplication-division"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-decimal-introduction-concept",
    "topicId": "hjb-primary-p3-lower-decimal-introduction",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-decimal-introduction/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The theme matches the HJB unit Introductory Decimals.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数的初步认识》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数的初步认识》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-decimal-introduction"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-decimal-introduction-worked-example",
    "topicId": "hjb-primary-p3-lower-decimal-introduction",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-decimal-introduction/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The visual is arranged as a worked-example workspace for the HJB unit Introductory Decimals.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数的初步认识》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数的初步认识》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts. In a worked example, connect the model, the steps, and the check.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-decimal-introduction"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-area-measurement-concept",
    "topicId": "hjb-primary-p3-lower-area-measurement",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-area-measurement/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Area and Perimeter.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《面积与周长》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《面积与周长》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-area-measurement"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-area-measurement-worked-example",
    "topicId": "hjb-primary-p3-lower-area-measurement",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-area-measurement/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Area and Perimeter.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《面积与周长》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《面积与周长》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-area-measurement"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-data-statistics-concept",
    "topicId": "hjb-primary-p3-lower-data-statistics",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-data-statistics/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Data Organization and Statistical Representation.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《数据整理与统计表达》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《数据整理与统计表达》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-data-statistics"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-data-statistics-worked-example",
    "topicId": "hjb-primary-p3-lower-data-statistics",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-data-statistics/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Data Organization and Statistical Representation.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《数据整理与统计表达》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《数据整理与统计表达》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-data-statistics"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-math-square-review-concept",
    "topicId": "hjb-primary-p3-lower-math-square-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-math-square-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 3 Volume 2 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级下册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《三年级下册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p3-lower-math-square-review-worked-example",
    "topicId": "hjb-primary-p3-lower-math-square-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p3-lower-math-square-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 3 Volume 2 Math Square and Review.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级下册数学广场与整理复习》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《三年级下册数学广场与整理复习》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p3-lower-math-square-review"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-review-operations-fractions-concept",
    "topicId": "hjb-primary-p4-upper-review-operations-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-review-operations-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《复习与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《复习与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-review-operations-fractions"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-review-operations-fractions-worked-example",
    "topicId": "hjb-primary-p4-upper-review-operations-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-review-operations-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《复习与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《复习与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-review-operations-fractions"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-large-numbers-measurement-concept",
    "topicId": "hjb-primary-p4-upper-large-numbers-measurement",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-large-numbers-measurement/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Numbers and Measurement.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《数与量》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《数与量》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-large-numbers-measurement"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-large-numbers-measurement-worked-example",
    "topicId": "hjb-primary-p4-upper-large-numbers-measurement",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-large-numbers-measurement/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Numbers and Measurement.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《数与量》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《数与量》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-large-numbers-measurement"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-fraction-extension-concept",
    "topicId": "hjb-primary-p4-upper-fraction-extension",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-fraction-extension/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Introductory Fractions (II).",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《分数的初步认识（二）》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《分数的初步认识（二）》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-fraction-extension"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-fraction-extension-worked-example",
    "topicId": "hjb-primary-p4-upper-fraction-extension",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-fraction-extension/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Introductory Fractions (II).",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《分数的初步认识（二）》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《分数的初步认识（二）》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-fraction-extension"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-four-operations-problem-solving-concept",
    "topicId": "hjb-primary-p4-upper-four-operations-problem-solving",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-four-operations-problem-solving/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Four Operations with Whole Numbers.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《整数的四则运算》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《整数的四则运算》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-four-operations-problem-solving"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-four-operations-problem-solving-worked-example",
    "topicId": "hjb-primary-p4-upper-four-operations-problem-solving",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-four-operations-problem-solving/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Four Operations with Whole Numbers.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《整数的四则运算》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《整数的四则运算》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-four-operations-problem-solving"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-geometry-circle-lines-angles-concept",
    "topicId": "hjb-primary-p4-upper-geometry-circle-lines-angles",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-geometry-circle-lines-angles/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Geometry Practice.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《几何小实践》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《几何小实践》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-geometry-circle-lines-angles"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-geometry-circle-lines-angles-worked-example",
    "topicId": "hjb-primary-p4-upper-geometry-circle-lines-angles",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-geometry-circle-lines-angles/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Geometry Practice.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《几何小实践》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《几何小实践》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-geometry-circle-lines-angles"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-review-integration-concept",
    "topicId": "hjb-primary-p4-upper-review-integration",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-review-integration/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 4 Volume 1 Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《四年级上册整理与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《四年级上册整理与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-review-integration"
    ]
  },
  {
    "id": "hjb-primary-p4-upper-review-integration-worked-example",
    "topicId": "hjb-primary-p4-upper-review-integration",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-upper-review-integration/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 4 Volume 1 Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《四年级上册整理与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《四年级上册整理与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-upper-review-integration"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-review-operation-properties-concept",
    "topicId": "hjb-primary-p4-lower-review-operation-properties",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-review-operation-properties/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《复习与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《复习与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-review-operation-properties"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-review-operation-properties-worked-example",
    "topicId": "hjb-primary-p4-lower-review-operation-properties",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-review-operation-properties/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《复习与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《复习与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-review-operation-properties"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-decimals-meaning-add-sub-concept",
    "topicId": "hjb-primary-p4-lower-decimals-meaning-add-sub",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-decimals-meaning-add-sub/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The theme matches the HJB unit Understanding Decimals, Addition, and Subtraction.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数的认识与加减法》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数的认识与加减法》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-decimals-meaning-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-decimals-meaning-add-sub-worked-example",
    "topicId": "hjb-primary-p4-lower-decimals-meaning-add-sub",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-decimals-meaning-add-sub/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The visual is arranged as a worked-example workspace for the HJB unit Understanding Decimals, Addition, and Subtraction.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数的认识与加减法》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数的认识与加减法》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts. In a worked example, connect the model, the steps, and the check.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-decimals-meaning-add-sub"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-line-statistics-concept",
    "topicId": "hjb-primary-p4-lower-line-statistics",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-line-statistics/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Statistics.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《统计》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《统计》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-line-statistics"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-line-statistics-worked-example",
    "topicId": "hjb-primary-p4-lower-line-statistics",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-line-statistics/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Statistics.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《统计》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《统计》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-line-statistics"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-vertical-parallel-lines-concept",
    "topicId": "hjb-primary-p4-lower-vertical-parallel-lines",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-vertical-parallel-lines/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit Geometry Practice.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《几何小实践》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《几何小实践》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-vertical-parallel-lines"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-vertical-parallel-lines-worked-example",
    "topicId": "hjb-primary-p4-lower-vertical-parallel-lines",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-vertical-parallel-lines/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit Geometry Practice.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《几何小实践》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《几何小实践》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-vertical-parallel-lines"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-review-integration-concept",
    "topicId": "hjb-primary-p4-lower-review-integration",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-review-integration/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Grade 4 Volume 2 Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《四年级下册整理与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《四年级下册整理与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-review-integration"
    ]
  },
  {
    "id": "hjb-primary-p4-lower-review-integration-worked-example",
    "topicId": "hjb-primary-p4-lower-review-integration",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p4-lower-review-integration/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Grade 4 Volume 2 Review and Extension.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《四年级下册整理与提高》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《四年级下册整理与提高》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p4-lower-review-integration"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-decimal-operations-concept",
    "topicId": "hjb-primary-p5-upper-decimal-operations",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-decimal-operations/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The theme matches the HJB unit Decimal Multiplication, Division, and Estimation.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数乘除法与估算》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《小数乘除法与估算》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-decimal-operations"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-decimal-operations-worked-example",
    "topicId": "hjb-primary-p5-upper-decimal-operations",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-decimal-operations/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The visual is arranged as a worked-example workspace for the HJB unit Decimal Multiplication, Division, and Estimation.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数乘除法与估算》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《小数乘除法与估算》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts. In a worked example, connect the model, the steps, and the check.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-decimal-operations"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-equations-relationships-concept",
    "topicId": "hjb-primary-p5-upper-equations-relationships",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-equations-relationships/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The theme matches the HJB unit Using Letters for Numbers and Simple Equations.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《用字母表示数与简易方程》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《用字母表示数与简易方程》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-equations-relationships"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-equations-relationships-worked-example",
    "topicId": "hjb-primary-p5-upper-equations-relationships",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-equations-relationships/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The visual is arranged as a worked-example workspace for the HJB unit Using Letters for Numbers and Simple Equations.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《用字母表示数与简易方程》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《用字母表示数与简易方程》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step. In a worked example, connect the model, the steps, and the check.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-equations-relationships"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-plane-figure-area-concept",
    "topicId": "hjb-primary-p5-upper-plane-figure-area",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-plane-figure-area/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit Area of Plane Figures.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《平面图形面积》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《平面图形面积》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-plane-figure-area"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-plane-figure-area-worked-example",
    "topicId": "hjb-primary-p5-upper-plane-figure-area",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-plane-figure-area/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit Area of Plane Figures.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《平面图形面积》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《平面图形面积》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-plane-figure-area"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-data-average-concept",
    "topicId": "hjb-primary-p5-upper-data-average",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-data-average/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Data Organization and Averages.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《数据整理与平均数》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《数据整理与平均数》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-data-average"
    ]
  },
  {
    "id": "hjb-primary-p5-upper-data-average-worked-example",
    "topicId": "hjb-primary-p5-upper-data-average",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-upper-data-average/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Data Organization and Averages.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《数据整理与平均数》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《数据整理与平均数》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-upper-data-average"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-factors-multiples-concept",
    "topicId": "hjb-primary-p5-lower-factors-multiples",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-factors-multiples/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The theme matches the HJB unit Factors, Multiples, and Number Structure.",
      "zh": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《因数、倍数与数的结构》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。主题对应沪教版《因数、倍数与数的结构》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups.",
      "zh": "乘除法模型要先保证每组数量相同。",
      "zhHans": "乘除法模型要先保证每组数量相同。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-factors-multiples"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-factors-multiples-worked-example",
    "topicId": "hjb-primary-p5-lower-factors-multiples",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-factors-multiples/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Equal groups transform into arrays, rows, columns, and partial rectangles. The visual is arranged as a worked-example workspace for the HJB unit Factors, Multiples, and Number Structure.",
      "zh": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《因数、倍数与数的结构》。",
      "zhHans": "相同小组转化为阵列、行列和部分矩形。画面以例题工作区方式对应沪教版《因数、倍数与数的结构》。"
    },
    "caption": {
      "en": "Multiplication and division models begin with equal-size groups. In a worked example, connect the model, the steps, and the check.",
      "zh": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。",
      "zhHans": "乘除法模型要先保证每组数量相同。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-factors-multiples"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-fractions-equivalence-operations-concept",
    "topicId": "hjb-primary-p5-lower-fractions-equivalence-operations",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-fractions-equivalence-operations/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The theme matches the HJB unit Fraction Meaning, Properties, Addition, and Subtraction.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《分数意义、性质与加减》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。主题对应沪教版《分数意义、性质与加减》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-fractions-equivalence-operations"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-fractions-equivalence-operations-worked-example",
    "topicId": "hjb-primary-p5-lower-fractions-equivalence-operations",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-fractions-equivalence-operations/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Fraction circles, fraction bars, decimal strips, equivalent partitions, and balanced parts show number meaning. The visual is arranged as a worked-example workspace for the HJB unit Fraction Meaning, Properties, Addition, and Subtraction.",
      "zh": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《分数意义、性质与加减》。",
      "zhHans": "分数圆、分数条、小数条、等值分割和平衡部分展示数的意义。画面以例题工作区方式对应沪教版《分数意义、性质与加减》。"
    },
    "caption": {
      "en": "Fractions and decimals begin with the whole, the unit, and equal parts. In a worked example, connect the model, the steps, and the check.",
      "zh": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。",
      "zhHans": "分数和小数都要先确认整体、单位和等分关系。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-fractions-equivalence-operations"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-cuboid-cube-concept",
    "topicId": "hjb-primary-p5-lower-cuboid-cube",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-cuboid-cube/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The theme matches the HJB unit Cuboids, Cubes, and Volume.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《长方体、正方体与体积》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《长方体、正方体与体积》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume.",
      "zh": "立体图形要分清结构、表面积和体积。",
      "zhHans": "立体图形要分清结构、表面积和体积。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-cuboid-cube"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-cuboid-cube-worked-example",
    "topicId": "hjb-primary-p5-lower-cuboid-cube",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-cuboid-cube/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The visual is arranged as a worked-example workspace for the HJB unit Cuboids, Cubes, and Volume.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《长方体、正方体与体积》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《长方体、正方体与体积》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume. In a worked example, connect the model, the steps, and the check.",
      "zh": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。",
      "zhHans": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-cuboid-cube"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-statistics-review-concept",
    "topicId": "hjb-primary-p5-lower-statistics-review",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-statistics-review/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Statistical Representation and Integrated Applications.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《统计表达与综合应用》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《统计表达与综合应用》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-statistics-review"
    ]
  },
  {
    "id": "hjb-primary-p5-lower-statistics-review-worked-example",
    "topicId": "hjb-primary-p5-lower-statistics-review",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p5-lower-statistics-review/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Statistical Representation and Integrated Applications.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《统计表达与综合应用》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《统计表达与综合应用》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p5-lower-statistics-review"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-divisibility-concept",
    "topicId": "hjb-primary-p6-upper-divisibility",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-divisibility/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The theme matches the HJB unit Divisibility of Numbers.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《数的整除》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《数的整除》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-divisibility"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-divisibility-worked-example",
    "topicId": "hjb-primary-p6-upper-divisibility",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-divisibility/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The visual is arranged as a worked-example workspace for the HJB unit Divisibility of Numbers.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《数的整除》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《数的整除》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step. In a worked example, connect the model, the steps, and the check.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-divisibility"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-fractions-concept",
    "topicId": "hjb-primary-p6-upper-fractions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-fractions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Fractions.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《分数》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《分数》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-fractions"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-fractions-worked-example",
    "topicId": "hjb-primary-p6-upper-fractions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-fractions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Fractions.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《分数》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《分数》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-fractions"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-ratio-proportion-concept",
    "topicId": "hjb-primary-p6-upper-ratio-proportion",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-ratio-proportion/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Ratio and Proportion.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《比和比例》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《比和比例》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-ratio-proportion"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-ratio-proportion-worked-example",
    "topicId": "hjb-primary-p6-upper-ratio-proportion",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-ratio-proportion/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Ratio and Proportion.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《比和比例》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《比和比例》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-ratio-proportion"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-circle-sector-concept",
    "topicId": "hjb-primary-p6-upper-circle-sector",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-circle-sector/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit Circles and Sectors.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《圆和扇形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《圆和扇形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-circle-sector"
    ]
  },
  {
    "id": "hjb-primary-p6-upper-circle-sector-worked-example",
    "topicId": "hjb-primary-p6-upper-circle-sector",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-upper-circle-sector/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit Circles and Sectors.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《圆和扇形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《圆和扇形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-upper-circle-sector"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-ratio-proportion-concept",
    "topicId": "hjb-primary-p6-lower-ratio-proportion",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-ratio-proportion/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Ratio and Proportion.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《比与比例》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《比与比例》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-ratio-proportion"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-ratio-proportion-worked-example",
    "topicId": "hjb-primary-p6-lower-ratio-proportion",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-ratio-proportion/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Ratio and Proportion.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《比与比例》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《比与比例》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-ratio-proportion"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-circle-sector-concept",
    "topicId": "hjb-primary-p6-lower-circle-sector",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-circle-sector/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The theme matches the HJB unit Circles and Sectors.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《圆与扇形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。主题对应沪教版《圆与扇形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-circle-sector"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-circle-sector-worked-example",
    "topicId": "hjb-primary-p6-lower-circle-sector",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-circle-sector/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Flat shapes, line segments, angle arms, line pairs, and arrows show geometric relationships. The visual is arranged as a worked-example workspace for the HJB unit Circles and Sectors.",
      "zh": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《圆与扇形》。",
      "zhHans": "平面图形、线段、角的两边、平行垂直线组和移动箭头展示几何关系。画面以例题工作区方式对应沪教版《圆与扇形》。"
    },
    "caption": {
      "en": "Geometry reasoning combines shape features, position relationships, and measurement clues. In a worked example, connect the model, the steps, and the check.",
      "zh": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。",
      "zhHans": "几何判断要同时看形状特征、位置关系和测量线索。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-circle-sector"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-probability-statistics-concept",
    "topicId": "hjb-primary-p6-lower-probability-statistics",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-probability-statistics/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The theme matches the HJB unit Probability and Statistical Graphs.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《可能性与统计图表》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。主题对应沪教版《可能性与统计图表》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-probability-statistics"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-probability-statistics-worked-example",
    "topicId": "hjb-primary-p6-lower-probability-statistics",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-probability-statistics/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Original bar charts, dot plots, category tokens, an average balance, and probability tiles show statistical thinking. The visual is arranged as a worked-example workspace for the HJB unit Probability and Statistical Graphs.",
      "zh": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《可能性与统计图表》。",
      "zhHans": "原创条形图、点图、分类标记、平均数天平和可能性方块展示统计思路。画面以例题工作区方式对应沪教版《可能性与统计图表》。"
    },
    "caption": {
      "en": "Read data by matching categories to values before comparing and interpreting. In a worked example, connect the model, the steps, and the check.",
      "zh": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。",
      "zhHans": "读数据要先配对类别与数值，再比较和解释结论。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-probability-statistics"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-cylinder-cone-concept",
    "topicId": "hjb-primary-p6-lower-cylinder-cone",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-cylinder-cone/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The theme matches the HJB unit Cylinders and Cones.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《圆柱与圆锥》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《圆柱与圆锥》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume.",
      "zh": "立体图形要分清结构、表面积和体积。",
      "zhHans": "立体图形要分清结构、表面积和体积。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-cylinder-cone"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-cylinder-cone-worked-example",
    "topicId": "hjb-primary-p6-lower-cylinder-cone",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-cylinder-cone/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The visual is arranged as a worked-example workspace for the HJB unit Cylinders and Cones.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《圆柱与圆锥》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《圆柱与圆锥》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume. In a worked example, connect the model, the steps, and the check.",
      "zh": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。",
      "zhHans": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-cylinder-cone"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-linear-systems-concept",
    "topicId": "hjb-primary-p6-lower-linear-systems",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-linear-systems/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The theme matches the HJB unit Systems of Linear Equations in Two Unknowns.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《二元一次方程组》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《二元一次方程组》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-linear-systems"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-linear-systems-worked-example",
    "topicId": "hjb-primary-p6-lower-linear-systems",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-linear-systems/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The visual is arranged as a worked-example workspace for the HJB unit Systems of Linear Equations in Two Unknowns.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《二元一次方程组》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《二元一次方程组》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step. In a worked example, connect the model, the steps, and the check.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-linear-systems"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-rational-numbers-concept",
    "topicId": "hjb-primary-p6-lower-rational-numbers",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-rational-numbers/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The theme matches the HJB unit Rational Numbers.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《有理数》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。主题对应沪教版《有理数》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together.",
      "zh": "比例推理要保持对应量同步变化。",
      "zhHans": "比例推理要保持对应量同步变化。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-rational-numbers"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-rational-numbers-worked-example",
    "topicId": "hjb-primary-p6-lower-rational-numbers",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-rational-numbers/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Paired bars, scale strips, proportional grids, and matching arrows show ratio relationships. The visual is arranged as a worked-example workspace for the HJB unit Rational Numbers.",
      "zh": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《有理数》。",
      "zhHans": "配对条、比例尺、比例网格和对应箭头展示比与比例关系。画面以例题工作区方式对应沪教版《有理数》。"
    },
    "caption": {
      "en": "Proportional reasoning keeps corresponding quantities changing together. In a worked example, connect the model, the steps, and the check.",
      "zh": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。",
      "zhHans": "比例推理要保持对应量同步变化。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-rational-numbers"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-simple-algebraic-expressions-concept",
    "topicId": "hjb-primary-p6-lower-simple-algebraic-expressions",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-simple-algebraic-expressions/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The theme matches the HJB unit Simple Algebraic Expressions.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《简单的代数式》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《简单的代数式》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-simple-algebraic-expressions"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-simple-algebraic-expressions-worked-example",
    "topicId": "hjb-primary-p6-lower-simple-algebraic-expressions",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-simple-algebraic-expressions/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The visual is arranged as a worked-example workspace for the HJB unit Simple Algebraic Expressions.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《简单的代数式》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《简单的代数式》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step. In a worked example, connect the model, the steps, and the check.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-simple-algebraic-expressions"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-linear-equations-inequalities-concept",
    "topicId": "hjb-primary-p6-lower-linear-equations-inequalities",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-linear-equations-inequalities/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The theme matches the HJB unit Linear Equations in One Unknown.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《一元一次方程》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。主题对应沪教版《一元一次方程》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-linear-equations-inequalities"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-linear-equations-inequalities-worked-example",
    "topicId": "hjb-primary-p6-lower-linear-equations-inequalities",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-linear-equations-inequalities/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Balance scales, unknown-value tiles, relationship arrows, paired paths, and coordinate cues show algebraic relationships. The visual is arranged as a worked-example workspace for the HJB unit Linear Equations in One Unknown.",
      "zh": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《一元一次方程》。",
      "zhHans": "天平、未知量方块、关系箭头、成对路径和简单坐标线索展示代数关系。画面以例题工作区方式对应沪教版《一元一次方程》。"
    },
    "caption": {
      "en": "Algebra reasoning preserves equality while tracking the unknown step by step. In a worked example, connect the model, the steps, and the check.",
      "zh": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。",
      "zhHans": "代数推理要保持等量关系，并逐步追踪未知量。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-linear-equations-inequalities"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-segments-angles-concept",
    "topicId": "hjb-primary-p6-lower-segments-angles",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-segments-angles/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The theme matches the HJB unit Line Segments and Angles.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《线段与角》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。主题对应沪教版《线段与角》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared.",
      "zh": "测量时要看清单位、起点和比较对象。",
      "zhHans": "测量时要看清单位、起点和比较对象。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-segments-angles"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-segments-angles-worked-example",
    "topicId": "hjb-primary-p6-lower-segments-angles",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-segments-angles/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Rulers, measuring strips, comparison bars, unit tiles, and clock arcs show measurement reasoning. The visual is arranged as a worked-example workspace for the HJB unit Line Segments and Angles.",
      "zh": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《线段与角》。",
      "zhHans": "尺子、测量条、比较条、单位块和钟面弧线展示测量推理。画面以例题工作区方式对应沪教版《线段与角》。"
    },
    "caption": {
      "en": "Measurement depends on the unit, the start point, and the object being compared. In a worked example, connect the model, the steps, and the check.",
      "zh": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。",
      "zhHans": "测量时要看清单位、起点和比较对象。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-segments-angles"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-cuboid-concept",
    "topicId": "hjb-primary-p6-lower-cuboid",
    "slot": "concept",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-cuboid/concept.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The theme matches the HJB unit Cuboids.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《长方体》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。主题对应沪教版《长方体》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume.",
      "zh": "立体图形要分清结构、表面积和体积。",
      "zhHans": "立体图形要分清结构、表面积和体积。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-cuboid"
    ]
  },
  {
    "id": "hjb-primary-p6-lower-cuboid-worked-example",
    "topicId": "hjb-primary-p6-lower-cuboid",
    "slot": "worked-example",
    "src": "/lesson-illustrations/mainland-hjb-primary/hjb-primary-p6-lower-cuboid/worked-example.png",
    "width": 1600,
    "height": 900,
    "alt": {
      "en": "Cuboids, cubes, cylinders, cones, nets, unit cubes, and shaded faces show spatial reasoning. The visual is arranged as a worked-example workspace for the HJB unit Cuboids.",
      "zh": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《长方体》。",
      "zhHans": "长方体、正方体、圆柱、圆锥、展开图、单位立方体和阴影面展示空间推理。画面以例题工作区方式对应沪教版《长方体》。"
    },
    "caption": {
      "en": "Solid-geometry work separates structure, surface area, and volume. In a worked example, connect the model, the steps, and the check.",
      "zh": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。",
      "zhHans": "立体图形要分清结构、表面积和体积。例题中要把模型、步骤和检查连起来。"
    },
    "ragCardIds": [
      "hjb-primary-p6-lower-cuboid"
    ]
  }
] satisfies MainlandHjbPrimaryLessonIllustration[];

const mainlandHjbPrimaryLessonIllustrationByTopicAndSlot = new Map(
  mainlandHjbPrimaryLessonIllustrations.map((illustration) => [
    `${illustration.topicId}:${illustration.slot}`,
    illustration
  ])
);

// A18 whole-page visual review found that these broad template families teach
// a different domain, or introduce representations above the page's grade.
// Keep both slots off learner pages until topic-specific replacements pass
// visual and curriculum QA; the source inventory remains available for repair.
const suppressedMainlandHjbPrimaryLessonIllustrationTopicIds = new Set([
  "hjb-primary-p1-upper-solids-introduction",
  "hjb-primary-p1-upper-review",
  "hjb-primary-p1-lower-length-measurement",
  "hjb-primary-p1-lower-body-rulers-math-square",
  "hjb-primary-p1-lower-review",
  "hjb-primary-p2-upper-school-position-direction",
  "hjb-primary-p2-upper-within-100-add-sub",
  "hjb-primary-p2-upper-classification",
  "hjb-primary-p2-upper-math-square-review",
  "hjb-primary-p2-lower-math-square-review",
  "hjb-primary-p3-upper-review-place-value-operations",
  "hjb-primary-p3-upper-time-measurement",
  "hjb-primary-p3-upper-math-square-review",
  "hjb-primary-p3-lower-math-square-review",
  "hjb-primary-p4-upper-review-operations-fractions",
  "hjb-primary-p4-upper-fraction-extension",
  "hjb-primary-p4-upper-four-operations-problem-solving",
  "hjb-primary-p4-upper-review-integration",
  "hjb-primary-p4-lower-review-operation-properties",
  "hjb-primary-p4-lower-review-integration",
  "hjb-primary-p6-upper-divisibility",
  "hjb-primary-p6-upper-fractions",
  "hjb-primary-p6-lower-rational-numbers"
]);

export function getMainlandHjbPrimaryLessonIllustration(
  topicId: string,
  slot: MainlandHjbPrimaryLessonIllustrationSlot
) {
  if (suppressedMainlandHjbPrimaryLessonIllustrationTopicIds.has(topicId)) return null;
  return mainlandHjbPrimaryLessonIllustrationByTopicAndSlot.get(`${topicId}:${slot}`) ?? null;
}
