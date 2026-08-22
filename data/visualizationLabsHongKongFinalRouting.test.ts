import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrimaryVisualizationLabForTopic,
  hongKongThreeDCandidateLabIds,
  visualizationLabCatalog
} from "./visualizationLabs";

const expectedRoutes = {
  "p2-length-data": {
    templateId: "statistics-distribution",
    title: {
      en: "Metres and One-to-one Pictograms Visual Lab",
      zh: "米與一對一象形圖視覺化實驗",
      zhHans: "米与一对一象形图可视化实验"
    },
    description: {
      en: "Measure length in metres and read a one-to-one pictogram where exactly 1 icon represents 1 object.",
      zh: "以米量度長度，並閱讀嚴格的一對一象形圖；每 1 個圖示只代表 1 個物件。",
      zhHans: "以米测量长度，并阅读严格的一对一象形图；每 1 个图标只代表 1 个物体。"
    },
    focus: {
      en: "Measure in metres and compare pictogram counts using the fixed key 1 icon = 1 object.",
      zh: "以米量度，並用固定圖例「1 個圖示 = 1 個物件」比較象形圖數量。",
      zhHans: "以米测量，并用固定图例“1 个图标 = 1 个物体”比较象形图数量。"
    },
    formula: {
      en: "1 icon = 1 object; length in metres",
      zh: "1 個圖示 = 1 個物件；長度用米",
      zhHans: "1 个图标 = 1 个物体；长度用米"
    }
  },
  "p3-measurement": {
    templateId: "clock-money-data",
    title: {
      en: "Measurement and Bar Charts Visual Lab",
      zh: "度量與棒形圖視覺化實驗",
      zhHans: "测量与条形图可视化实验"
    },
    description: {
      en: "Convert one physical quantity between compatible metric units; separately read categorical bar heights from one zero-based shared scale.",
      zh: "在相容的公制度量單位之間換算同一物理量；另行從同一個由零開始的共用刻度閱讀分類棒高。",
      zhHans: "在兼容的公制测量单位之间换算同一物理量；另行从同一个由零开始的共用刻度阅读分类条高。"
    },
    focus: {
      en: "Keep each measurement within one physical dimension, and keep each category count aligned to its own bar height.",
      zh: "讓每次度量保持在同一物理量內，並讓每個類別數量與其棒高保持一致。",
      zhHans: "让每次测量保持在同一物理量内，并让每个类别数量与其条高保持一致。"
    },
    formula: {
      en: "same quantity ↔ compatible units; category count ↔ zero-based bar height",
      zh: "同一物理量 ↔ 相容單位；類別數量 ↔ 由零開始的棒高",
      zhHans: "同一物理量 ↔ 兼容单位；类别数量 ↔ 由零开始的条高"
    }
  },
  "p4-large-numbers": {
    templateId: "array-area",
    title: {
      en: "Factors, Multiples, HCF and LCM Visual Lab",
      zh: "因數、倍數、最大公因數與最小公倍數視覺化實驗",
      zhHans: "因数、倍数、最大公因数与最小公倍数可视化实验"
    },
    description: {
      en: "For positive integers, list complete factor pairs and positive multiples, test divisibility by zero remainder, and identify HCF and LCM from common lists.",
      zh: "對正整數列出完整因數配對和正倍數，以餘數為零檢驗整除，並從共同列表辨認最大公因數和最小公倍數。",
      zhHans: "对正整数列出完整因数配对和正倍数，以余数为零检验整除，并从共同列表辨认最大公因数和最小公倍数。"
    },
    focus: {
      en: "Use factor-pair cards, a zero-remainder test, common-list intersections, and the least positive common multiple.",
      zh: "使用因數配對卡、餘數為零檢驗、共同列表交集和最小正公倍數。",
      zhHans: "使用因数配对卡、余数为零检验、共同列表交集和最小正公倍数。"
    },
    formula: {
      en: "d is a factor of n iff n = dq + r and r = 0; HCF = greatest common factor; LCM = least positive common multiple",
      zh: "當且僅當 n = dq + r 且 r = 0 時，d 是 n 的因數；HCF = 最大公因數；LCM = 最小正公倍數",
      zhHans: "当且仅当 n = dq + r 且 r = 0 时，d 是 n 的因数；HCF = 最大公因数；LCM = 最小正公倍数"
    }
  },
  "p4-angles": {
    templateId: "angle-geometry",
    title: {
      en: "Quadrilateral Families and Shape Composition Visual Lab",
      zh: "四邊形家族與圖形拼組視覺化實驗",
      zhHans: "四边形家族与图形拼组可视化实验"
    },
    description: {
      en: "Classify quadrilateral families from their properties, then compose and decompose shapes.",
      zh: "根據圖形性質分類四邊形家族，再拼合和分拆圖形。",
      zhHans: "根据图形性质分类四边形家族，再拼合和拆分图形。"
    },
    focus: {
      en: "Connect side, angle, and parallel-line properties to quadrilateral families and shape composition.",
      zh: "把邊、角和平行線性質連繫到四邊形家族與圖形拼組。",
      zhHans: "把边、角和平行线性质联系到四边形家族与图形拼组。"
    },
    formula: {
      en: "properties -> quadrilateral family; parts -> composite shape",
      zh: "圖形性質 -> 四邊形家族；部分 -> 組合圖形",
      zhHans: "图形性质 -> 四边形家族；部分 -> 组合图形"
    }
  },
  "p5-rates": {
    templateId: "measurement-scale",
    title: {
      en: "Unitary Method for Unit Price Visual Lab",
      zh: "用歸一法求單位價格視覺化實驗",
      zhHans: "用归一法求单位价格可视化实验"
    },
    description: {
      en: "Use the unitary method to find one unit first, then calculate and compare unit prices.",
      zh: "用歸一法先求一個單位，再計算和比較單位價格。",
      zhHans: "用归一法先求一个单位，再计算和比较单位价格。"
    },
    focus: {
      en: "Divide a total cost by its quantity to find and compare unit prices.",
      zh: "用總價除以數量，求出並比較單位價格。",
      zhHans: "用总价除以数量，求出并比较单位价格。"
    },
    formula: {
      en: "unitary method: total cost / quantity = unit price",
      zh: "歸一法：總價 / 數量 = 單位價格",
      zhHans: "归一法：总价 / 数量 = 单位价格"
    }
  },
  "p6-percentages": {
    templateId: "fraction-bar",
    title: {
      en: "Fractions, Decimals and Percentages Visual Lab",
      zh: "分數、小數與百分數視覺化實驗",
      zhHans: "分数、小数与百分数可视化实验"
    },
    description: {
      en: "Convert among fractions, decimals, and percentages, and connect each form to the same part-whole quantity.",
      zh: "在分數、小數和百分數之間轉換，並把每種表示連繫到同一個部分與整體數量。",
      zhHans: "在分数、小数和百分数之间转换，并把每种表示联系到同一个部分与整体数量。"
    },
    focus: {
      en: "Represent one part-whole quantity as an equivalent fraction, decimal, and percentage.",
      zh: "把同一個部分與整體數量表示成等值的分數、小數和百分數。",
      zhHans: "把同一个部分与整体数量表示成等值的分数、小数和百分数。"
    },
    formula: {
      en: "p% = p/100 = decimal; change = base × p/100; final = base ± change",
      zh: "p% = p/100 = 小數；改變量 = 原數 × p/100；結果 = 原數 ± 改變量",
      zhHans: "p% = p/100 = 小数；改变量 = 原数 × p/100；结果 = 原数 ± 改变量"
    }
  },
  "p6-ratio-proportion": {
    templateId: "statistics-distribution",
    title: {
      en: "Mean, Fair Sharing and Broken-line Graphs Visual Lab",
      zh: "平均數、公平分配與折線圖視覺化實驗",
      zhHans: "平均数、公平分配与折线图可视化实验"
    },
    description: {
      en: "Interpret the mean as a fair share and connect ordered data points with a broken-line graph.",
      zh: "把平均數理解為公平分配，並用折線圖連接有順序的數據點。",
      zhHans: "把平均数理解为公平分配，并用折线图连接有顺序的数据点。"
    },
    focus: {
      en: "Redistribute a total fairly to find the mean, then read changes in a broken-line graph.",
      zh: "公平重新分配總數以求平均數，再閱讀折線圖中的變化。",
      zhHans: "公平重新分配总数以求平均数，再阅读折线图中的变化。"
    },
    formula: {
      en: "mean = total / count = fair share; ordered points -> broken-line graph",
      zh: "平均數 = 總數 / 個數 = 公平分配；有序數據點 -> 折線圖",
      zhHans: "平均数 = 总数 / 个数 = 公平分配；有序数据点 -> 折线图"
    }
  }
} as const;

function labFor(topicId: keyof typeof expectedRoutes) {
  const lab = getPrimaryVisualizationLabForTopic(topicId);
  assert.ok(lab, `${topicId} must remain in the visualization catalog`);
  return lab;
}

test("A18 FINAL HK routes expose exact catalog title, focus, description, formula, and template promises", () => {
  for (const [topicId, expected] of Object.entries(expectedRoutes) as Array<
    [keyof typeof expectedRoutes, (typeof expectedRoutes)[keyof typeof expectedRoutes]]
  >) {
    const lab = labFor(topicId);
    assert.equal(lab.curriculumTrack, "HK", topicId);
    assert.equal(lab.templateId, expected.templateId, topicId);
    assert.deepEqual(lab.title, expected.title, `${topicId} title`);
    assert.deepEqual(lab.description, expected.description, `${topicId} description`);
    assert.deepEqual(lab.templateConfig?.focus, expected.focus, `${topicId} focus`);
    assert.deepEqual(lab.templateConfig?.formula, expected.formula, `${topicId} formula`);
  }
});

function learnerPromise(topicId: keyof typeof expectedRoutes) {
  const lab = labFor(topicId);
  return [
    ...Object.values(lab.title),
    ...Object.values(lab.description),
    ...Object.values(lab.templateConfig?.focus ?? {}),
    ...Object.values(lab.templateConfig?.formula ?? {})
  ].join(" ");
}

test("A18 FINAL HK routes remove superseded catalog promises", () => {
  assert.doesNotMatch(learnerPromise("p2-length-data"), /centimet|\bcm\b|bar chart|厘米|棒形圖|条形图|柱形图/iu);
  assert.doesNotMatch(learnerPromise("p4-large-numbers"), /large numbers?|round(?:ing)?|place value|大數|大数|取近似|位值/iu);
  assert.doesNotMatch(learnerPromise("p4-angles"), /classify angles?|estimate angle|degrees?|分類角|分类角|估計角|估计角|度數|度数/iu);
  assert.doesNotMatch(learnerPromise("p5-rates"), /speeds?|other rate|速率|其他率/iu);
  assert.doesNotMatch(learnerPromise("p6-percentages"), /\bold\b|\bnew\b|increase|decrease|percentage change|舊數|旧数|新數|新数|增加|增長|增长|減少|减少|升幅|降幅/iu);
  assert.doesNotMatch(learnerPromise("p6-ratio-proportion"), /ratio|proportion|scale quantities|比例|正反比|按比|縮放|缩放/iu);
});

test("the HK registered 3D candidate inventory remains fourteen false/false audit entries", () => {
  assert.equal(hongKongThreeDCandidateLabIds.length, 14);
  for (const labId of hongKongThreeDCandidateLabIds) {
    const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
    assert.ok(lab, labId);
    assert.equal(lab.curriculumTrack, "HK", labId);
    assert.equal(lab.threeD?.enabled, false, `${labId} enabled`);
    assert.equal(lab.threeD?.premiumLaunch, false, `${labId} premiumLaunch`);
  }
});
