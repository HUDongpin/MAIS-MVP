import type { LocalizedText } from "@/types";

export type CaliforniaHighSchoolWorkedExample = {
  exampleId: string;
  title: string;
  kind: string;
  renderer: string;
  prompt: LocalizedText;
  answer: LocalizedText;
  solutionSteps: Readonly<Record<"en" | "zh" | "zhHans", readonly string[]>>;
  checks: readonly { id: string; type: string; tolerance?: number; expression: string; expected: number | string }[];
  exactLayerSrc: string;
  copyReviewStatus: string;
  qaStatus: string;
  s24VisualReviewDecision: string;
  placementStatus: string;
};

export type CaliforniaHighSchoolTextbookChapter = {
  chapterId: string;
  grade: "S3" | "S4" | "S5" | "S6";
  usGradeLabel: string;
  order: number;
  domainCode: string;
  conceptualCategory: string;
  pathwayLabel: string;
  prerequisiteDomains: readonly string[];
  modelingOpportunities: readonly string[];
  title: LocalizedText;
  standards: readonly string[];
  concept: {
    src: string;
    alt: LocalizedText;
    s18Decision: string;
    s09Decision: string;
    sourceDistanceDecision: string;
    productionApproval: string;
  };
  workedExamples: readonly CaliforniaHighSchoolWorkedExample[];
  s05PlacementDecision: string;
  releaseStatus: string;
};

type CaliforniaHighSchoolChapterPlacement = {
  domainCode: string;
  conceptualCategory: string;
  pathwayLabel: string;
  prerequisiteDomains: readonly string[];
  modelingOpportunities: readonly string[];
};

export const californiaHighSchoolTextbookDraft = {
  "packageId": "us-ca-high-school-textbook-repair-v1-route-draft-data",
  "sourcePackageId": "us-ca-high-school-textbook-repair-v1-s05-placement-preview",
  "generatedAt": "2026-06-13T04:54:58.074Z",
  "routePolicy": {
    "reviewRoute": "/lesson/california-high-school-textbook/review",
    "reviewRouteRobots": "noindex,nofollow",
    "studentRouteAllowed": false,
    "liveNoindexRouteIntegrated": true,
    "liveNoindexRouteBrowserQaPassed": true,
    "productionApproval": "not-approved-for-production-integration"
  },
  "gates": {
    "s18Content": "candidate-localized-needs-final-human-release-approval",
    "s09Copy": "concept-background-copy-cleared-and-worked-example-copy-candidate-reviewed",
    "s05Placement": "preview-ready-for-owner-review-not-live",
    "s24ExactLayer": "candidate-visual-qa-pass-for-s05-preview-only",
    "s05LiveRouteAcceptance": "required-before-production-release",
    "s11s22BrowserRelease": "live-noindex-route-browser-qa-pass-not-production-release",
    "finalProductionRelease": "not-approved-owner-final-acceptance-required"
  },
  "chapters": [
    {
      "chapterId": "us-ca-math-s3-chapter-01",
      "grade": "S3",
      "usGradeLabel": "Grade 9",
      "order": 1,
      "title": {
        "en": "Equations from Context",
        "zh": "情境中的方程",
        "zhHans": "情境中的方程"
      },
      "standards": [
        "CA.CCSS.Math.HS.N-RN"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-01/concept.webp",
        "alt": {
          "en": "Equations from Context concept background for internal review",
          "zh": "情境中的方程概念背景，僅供內部審查",
          "zhHans": "情境中的方程概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s3-chapter-01-repair-worked-01",
          "title": "Worked example 1",
          "kind": "equation-flow",
          "renderer": "svg-katex",
          "prompt": {
            "en": "School fundraiser tickets cost a fixed $12 setup fee plus $4 per ticket. The total is $40. How many tickets were sold?",
            "zh": "學校籌款門票有 12 美元固定設置費，另每張票 4 美元。總費用是 40 美元。售出了多少張票？",
            "zhHans": "学校筹款门票有 12 美元固定设置费，另每张票 4 美元。总费用是 40 美元。售出了多少张票？"
          },
          "answer": {
            "en": "t = 7",
            "zh": "t = 7",
            "zhHans": "t = 7"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: t = 7"
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：t = 7"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：t = 7"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "4 * 7 + 12",
              "expected": 40
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-01/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s3-chapter-01-repair-worked-02",
          "title": "Worked example 2",
          "kind": "equation-flow",
          "renderer": "svg-katex",
          "prompt": {
            "en": "A bike-share ride costs $6 to unlock plus $2.50 per mile. The rider pays $21. How many miles did the rider travel?",
            "zh": "共享單車行程收取 6 美元解鎖費，另每英里 2.50 美元。騎行者共支付 21 美元。騎行了多少英里？",
            "zhHans": "共享单车行程收取 6 美元解锁费，另每英里 2.50 美元。骑行者共支付 21 美元。骑行了多少英里？"
          },
          "answer": {
            "en": "m = 6",
            "zh": "m = 6",
            "zhHans": "m = 6"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: m = 6"
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：m = 6"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：m = 6"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2.5 * 6 + 6",
              "expected": 21
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-01/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s3-chapter-02",
      "grade": "S3",
      "usGradeLabel": "Grade 9",
      "order": 2,
      "title": {
        "en": "Function Notation and Interpretation",
        "zh": "函數記號與解讀",
        "zhHans": "函数记号与解读"
      },
      "standards": [
        "CA.CCSS.Math.HS.A-CED"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-02/concept.webp",
        "alt": {
          "en": "Function Notation and Interpretation concept background for internal review",
          "zh": "函數記號與解讀概念背景，僅供內部審查",
          "zhHans": "函数记号与解读概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s3-chapter-02-repair-worked-01",
          "title": "Worked example 1",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "For f(n) = 2n + 5, where n is the number of practice sets, find f(8) and interpret it.",
            "zh": "對於 f(n) = 2n + 5，其中 n 是練習組數，求 f(8) 並解釋其意義。",
            "zhHans": "对于 f(n) = 2n + 5，其中 n 是练习组数，求 f(8) 并解释其意义。"
          },
          "answer": {
            "en": "f(8) = 21",
            "zh": "f(8) = 21",
            "zhHans": "f(8) = 21"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: f(8) = 21"
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：f(8) = 21"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：f(8) = 21"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 8 + 5",
              "expected": 21
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-02/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s3-chapter-02-repair-worked-02",
          "title": "Worked example 2",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A storage tank has g(h) = 120 - 15h liters after h hours. Find g(4) and interpret the domain.",
            "zh": "儲水箱在 h 小時後有 g(h) = 120 - 15h 升水。求 g(4)，並解釋定義域。",
            "zhHans": "储水箱在 h 小时后有 g(h) = 120 - 15h 升水。求 g(4)，并解释定义域。"
          },
          "answer": {
            "en": "g(4) = 60 liters; h is limited to times before the tank is empty.",
            "zh": "g(4) = 60 升；h 限於水箱未空之前的時間。",
            "zhHans": "g(4) = 60 升；h 限于水箱未空之前的时间。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: g(4) = 60 liters; h is limited to times before the tank is empty."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：g(4) = 60 升；h 限於水箱未空之前的時間。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：g(4) = 60 升；h 限于水箱未空之前的时间。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "120 - 15 * 4",
              "expected": 60
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-02/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s3-chapter-03",
      "grade": "S3",
      "usGradeLabel": "Grade 9",
      "order": 3,
      "title": {
        "en": "Linear and Quadratic Models",
        "zh": "一次與二次模型",
        "zhHans": "一次与二次模型"
      },
      "standards": [
        "CA.CCSS.Math.HS.A-REI"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-03/concept.webp",
        "alt": {
          "en": "Linear and Quadratic Models concept background for internal review",
          "zh": "一次與二次模型概念背景，僅供內部審查",
          "zhHans": "一次与二次模型概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s3-chapter-03-repair-worked-01",
          "title": "Worked example 1",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A linear model C(w) = 35 + 12w gives club costs after w weeks. Find C(6) and identify the initial value.",
            "zh": "線性模型 C(w) = 35 + 12w 表示 w 週後社團費用。求 C(6)，並指出初始值。",
            "zhHans": "线性模型 C(w) = 35 + 12w 表示 w 周后社团费用。求 C(6)，并指出初始值。"
          },
          "answer": {
            "en": "C(6) = 107; the initial value is 35.",
            "zh": "C(6) = 107；初始值是 35。",
            "zhHans": "C(6) = 107；初始值是 35。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: C(6) = 107; the initial value is 35."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：C(6) = 107；初始值是 35。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：C(6) = 107；初始值是 35。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "35 + 12 * 6",
              "expected": 107
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-03/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s3-chapter-03-repair-worked-02",
          "title": "Worked example 2",
          "kind": "quadratic-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A ball height is h(t) = -16t^2 + 48t + 5. Find the maximum height time using the vertex.",
            "zh": "球的高度為 h(t) = -16t^2 + 48t + 5。用頂點求最大高度出現的時間。",
            "zhHans": "球的高度为 h(t) = -16t^2 + 48t + 5。用顶点求最大高度出现的时间。"
          },
          "answer": {
            "en": "The vertex time is 1.5 seconds and h(1.5) = 41.",
            "zh": "頂點時間是 1.5 秒，且 h(1.5) = 41。",
            "zhHans": "顶点时间是 1.5 秒，且 h(1.5) = 41。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: The vertex time is 1.5 seconds and h(1.5) = 41."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：頂點時間是 1.5 秒，且 h(1.5) = 41。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：顶点时间是 1.5 秒，且 h(1.5) = 41。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "-16 * 1.5 ** 2 + 48 * 1.5 + 5",
              "expected": 41
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-03/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s3-chapter-04",
      "grade": "S3",
      "usGradeLabel": "Grade 9",
      "order": 4,
      "title": {
        "en": "Coordinate Geometry Methods",
        "zh": "坐標幾何方法",
        "zhHans": "坐标几何方法"
      },
      "standards": [
        "CA.CCSS.Math.HS.F-IF"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-04/concept.webp",
        "alt": {
          "en": "Coordinate Geometry Methods concept background for internal review",
          "zh": "坐標幾何方法概念背景，僅供內部審查",
          "zhHans": "坐标几何方法概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s3-chapter-04-repair-worked-01",
          "title": "Worked example 1",
          "kind": "coordinate-plane",
          "renderer": "svg",
          "prompt": {
            "en": "Points A(-2, 3) and B(4, 7) define a segment. Find the slope and midpoint.",
            "zh": "點 A(-2, 3) 和 B(4, 7) 確定一條線段。求斜率和中點。",
            "zhHans": "点 A(-2, 3) 和 B(4, 7) 确定一条线段。求斜率和中点。"
          },
          "answer": {
            "en": "slope = 2/3; midpoint = (1, 5).",
            "zh": "斜率 = 2/3；中點 = (1, 5)。",
            "zhHans": "斜率 = 2/3；中点 = (1, 5)。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: slope = 2/3; midpoint = (1, 5)."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：斜率 = 2/3；中點 = (1, 5)。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：斜率 = 2/3；中点 = (1, 5)。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(7 - 3) / (4 - -2)",
              "expected": 0.6666666666666666
            },
            {
              "id": "e1-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(-2 + 4) / 2",
              "expected": 1
            },
            {
              "id": "e1-check-3",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(3 + 7) / 2",
              "expected": 5
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-04/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s3-chapter-04-repair-worked-02",
          "title": "Worked example 2",
          "kind": "coordinate-plane",
          "renderer": "svg",
          "prompt": {
            "en": "Line l passes through (1, -2) and (5, 6). Find its slope and equation.",
            "zh": "直線 l 經過 (1, -2) 和 (5, 6)。求它的斜率和方程。",
            "zhHans": "直线 l 经过 (1, -2) 和 (5, 6)。求它的斜率和方程。"
          },
          "answer": {
            "en": "slope = 2; equation y = 2x - 4.",
            "zh": "斜率 = 2；方程為 y = 2x - 4。",
            "zhHans": "斜率 = 2；方程为 y = 2x - 4。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: slope = 2; equation y = 2x - 4."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：斜率 = 2；方程為 y = 2x - 4。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：斜率 = 2；方程为 y = 2x - 4。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(6 - -2) / (5 - 1)",
              "expected": 2
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 1 - 4",
              "expected": -2
            },
            {
              "id": "e2-check-3",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 5 - 4",
              "expected": 6
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-04/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s3-chapter-05",
      "grade": "S3",
      "usGradeLabel": "Grade 9",
      "order": 5,
      "title": {
        "en": "Modeling with Evidence",
        "zh": "用證據建模",
        "zhHans": "用证据建模"
      },
      "standards": [
        "CA.CCSS.Math.HS.G-GPE"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-05/concept.webp",
        "alt": {
          "en": "Modeling with Evidence concept background for internal review",
          "zh": "用證據建模概念背景，僅供內部審查",
          "zhHans": "用证据建模概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s3-chapter-05-repair-worked-01",
          "title": "Worked example 1",
          "kind": "data-model",
          "renderer": "svg",
          "prompt": {
            "en": "A data pattern has points (0, 3), (2, 7), and (4, 11). Use a linear model to predict y when x = 6.",
            "zh": "一組數據點為 (0, 3)、(2, 7) 和 (4, 11)。用線性模型預測 x = 6 時的 y 值。",
            "zhHans": "一组数据点为 (0, 3)、(2, 7) 和 (4, 11)。用线性模型预测 x = 6 时的 y 值。"
          },
          "answer": {
            "en": "The model y = 2x + 3 predicts y = 15.",
            "zh": "模型 y = 2x + 3 預測 y = 15。",
            "zhHans": "模型 y = 2x + 3 预测 y = 15。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: The model y = 2x + 3 predicts y = 15."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：模型 y = 2x + 3 預測 y = 15。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：模型 y = 2x + 3 预测 y = 15。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 6 + 3",
              "expected": 15
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-05/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s3-chapter-05-repair-worked-02",
          "title": "Worked example 2",
          "kind": "data-model",
          "renderer": "svg",
          "prompt": {
            "en": "A model predicts 25 minutes for a task, but the observed time is 27 minutes. Find and interpret the residual.",
            "zh": "某模型預測任務需 25 分鐘，但實際觀察時間是 27 分鐘。求殘差並解釋。",
            "zhHans": "某模型预测任务需 25 分钟，但实际观察时间是 27 分钟。求残差并解释。"
          },
          "answer": {
            "en": "residual = 2 minutes; the task took 2 minutes longer than predicted.",
            "zh": "殘差 = 2 分鐘；任務比預測多用 2 分鐘。",
            "zhHans": "残差 = 2 分钟；任务比预测多用 2 分钟。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: residual = 2 minutes; the task took 2 minutes longer than predicted."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：殘差 = 2 分鐘；任務比預測多用 2 分鐘。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：残差 = 2 分钟；任务比预测多用 2 分钟。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "27 - 25",
              "expected": 2
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-05/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s4-chapter-01",
      "grade": "S4",
      "usGradeLabel": "Grade 10",
      "order": 6,
      "title": {
        "en": "Congruence and Proof",
        "zh": "全等與證明",
        "zhHans": "全等与证明"
      },
      "standards": [
        "CA.CCSS.Math.HS.G-CO"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-01/concept.webp",
        "alt": {
          "en": "Congruence and Proof concept background for internal review",
          "zh": "全等與證明概念背景，僅供內部審查",
          "zhHans": "全等与证明概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s4-chapter-01-repair-worked-01",
          "title": "Worked example 1",
          "kind": "geometry-proof",
          "renderer": "svg",
          "prompt": {
            "en": "Triangles ABC and DEF have AB = DE, AC = DF, and angle A = angle D. Name the congruence reason.",
            "zh": "三角形 ABC 和 DEF 滿足 AB = DE、AC = DF，且角 A = 角 D。說明全等理由。",
            "zhHans": "三角形 ABC 和 DEF 满足 AB = DE、AC = DF，且角 A = 角 D。说明全等理由。"
          },
          "answer": {
            "en": "Triangle ABC is congruent to triangle DEF by SAS.",
            "zh": "三角形 ABC 與三角形 DEF 由 SAS 全等。",
            "zhHans": "三角形 ABC 与三角形 DEF 由 SAS 全等。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: Triangle ABC is congruent to triangle DEF by SAS."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：三角形 ABC 與三角形 DEF 由 SAS 全等。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：三角形 ABC 与三角形 DEF 由 SAS 全等。"
            ]
          },
          "checks": [],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-01/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s4-chapter-01-repair-worked-02",
          "title": "Worked example 2",
          "kind": "geometry-proof",
          "renderer": "svg",
          "prompt": {
            "en": "Triangles JKL and MNO have angle J = angle M, JK = MN, and angle K = angle N. Name the congruence reason.",
            "zh": "三角形 JKL 和 MNO 滿足角 J = 角 M、JK = MN，且角 K = 角 N。說明全等理由。",
            "zhHans": "三角形 JKL 和 MNO 满足角 J = 角 M、JK = MN，且角 K = 角 N。说明全等理由。"
          },
          "answer": {
            "en": "Triangle JKL is congruent to triangle MNO by ASA.",
            "zh": "三角形 JKL 與三角形 MNO 由 ASA 全等。",
            "zhHans": "三角形 JKL 与三角形 MNO 由 ASA 全等。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: Triangle JKL is congruent to triangle MNO by ASA."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：三角形 JKL 與三角形 MNO 由 ASA 全等。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：三角形 JKL 与三角形 MNO 由 ASA 全等。"
            ]
          },
          "checks": [],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-01/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s4-chapter-02",
      "grade": "S4",
      "usGradeLabel": "Grade 10",
      "order": 7,
      "title": {
        "en": "Similarity and Right-Triangle Reasoning",
        "zh": "相似與直角三角形推理",
        "zhHans": "相似与直角三角形推理"
      },
      "standards": [
        "CA.CCSS.Math.HS.G-SRT"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-02/concept.webp",
        "alt": {
          "en": "Similarity and Right-Triangle Reasoning concept background for internal review",
          "zh": "相似與直角三角形推理概念背景，僅供內部審查",
          "zhHans": "相似与直角三角形推理概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s4-chapter-02-repair-worked-01",
          "title": "Worked example 1",
          "kind": "geometry-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "Triangle ABC has side lengths 3, 4, 5. Triangle DEF has side lengths 6, 8, 10. Find the scale factor from ABC to DEF.",
            "zh": "三角形 ABC 的邊長為 3、4、5；三角形 DEF 的邊長為 6、8、10。求從 ABC 到 DEF 的比例因子。",
            "zhHans": "三角形 ABC 的边长为 3、4、5；三角形 DEF 的边长为 6、8、10。求从 ABC 到 DEF 的比例因子。"
          },
          "answer": {
            "en": "scale factor = 2.",
            "zh": "比例因子 = 2。",
            "zhHans": "比例因子 = 2。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: scale factor = 2."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：比例因子 = 2。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：比例因子 = 2。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "6 / 3",
              "expected": 2
            },
            {
              "id": "e1-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "8 / 4",
              "expected": 2
            },
            {
              "id": "e1-check-3",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "10 / 5",
              "expected": 2
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-02/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s4-chapter-02-repair-worked-02",
          "title": "Worked example 2",
          "kind": "geometry-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A right triangle has legs 9 and 12. Find the hypotenuse.",
            "zh": "一個直角三角形的兩條直角邊長為 9 和 12。求斜邊長。",
            "zhHans": "一个直角三角形的两条直角边长为 9 和 12。求斜边长。"
          },
          "answer": {
            "en": "hypotenuse = 15.",
            "zh": "斜邊長 = 15。",
            "zhHans": "斜边长 = 15。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: hypotenuse = 15."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：斜邊長 = 15。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：斜边长 = 15。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "Math.sqrt(9 ** 2 + 12 ** 2)",
              "expected": 15
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-02/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s4-chapter-03",
      "grade": "S4",
      "usGradeLabel": "Grade 10",
      "order": 8,
      "title": {
        "en": "Circle Geometry",
        "zh": "圓的幾何",
        "zhHans": "圆的几何"
      },
      "standards": [
        "CA.CCSS.Math.HS.G-C"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-03/concept.webp",
        "alt": {
          "en": "Circle Geometry concept background for internal review",
          "zh": "圓的幾何概念背景，僅供內部審查",
          "zhHans": "圆的几何概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s4-chapter-03-repair-worked-01",
          "title": "Worked example 1",
          "kind": "circle-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A circle has radius 6 and central angle 60 degrees. Find the arc length in terms of pi.",
            "zh": "一個圓的半徑為 6，圓心角為 60 度。求弧長，用 pi 表示。",
            "zhHans": "一个圆的半径为 6，圆心角为 60 度。求弧长，用 pi 表示。"
          },
          "answer": {
            "en": "arc length = 2pi.",
            "zh": "弧長 = 2pi。",
            "zhHans": "弧长 = 2pi。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: arc length = 2pi."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：弧長 = 2pi。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：弧长 = 2pi。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 6 * (60 / 360)",
              "expected": 2
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-03/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s4-chapter-03-repair-worked-02",
          "title": "Worked example 2",
          "kind": "circle-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A tangent point is 13 units from the circle center, and the radius is 5. Find the tangent segment length.",
            "zh": "切點到圓心的距離為 13，半徑為 5。求切線段長度。",
            "zhHans": "切点到圆心的距离为 13，半径为 5。求切线段长度。"
          },
          "answer": {
            "en": "tangent length = 12.",
            "zh": "切線段長度 = 12。",
            "zhHans": "切线段长度 = 12。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: tangent length = 12."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：切線段長度 = 12。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：切线段长度 = 12。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "Math.sqrt(13 ** 2 - 5 ** 2)",
              "expected": 12
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-03/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s4-chapter-04",
      "grade": "S4",
      "usGradeLabel": "Grade 10",
      "order": 9,
      "title": {
        "en": "Quadratic Structure",
        "zh": "二次式結構",
        "zhHans": "二次式结构"
      },
      "standards": [
        "CA.CCSS.Math.HS.A-SSE"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-04/concept.webp",
        "alt": {
          "en": "Quadratic Structure concept background for internal review",
          "zh": "二次式結構概念背景，僅供內部審查",
          "zhHans": "二次式结构概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s4-chapter-04-repair-worked-01",
          "title": "Worked example 1",
          "kind": "quadratic-graph",
          "renderer": "svg",
          "prompt": {
            "en": "Factor x^2 - 5x + 6 and name the zeros.",
            "zh": "分解 x^2 - 5x + 6，並說出零點。",
            "zhHans": "分解 x^2 - 5x + 6，并说出零点。"
          },
          "answer": {
            "en": "x^2 - 5x + 6 = (x - 2)(x - 3); zeros are 2 and 3.",
            "zh": "x^2 - 5x + 6 = (x - 2)(x - 3)；零點是 2 和 3。",
            "zhHans": "x^2 - 5x + 6 = (x - 2)(x - 3)；零点是 2 和 3。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: x^2 - 5x + 6 = (x - 2)(x - 3); zeros are 2 and 3."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：x^2 - 5x + 6 = (x - 2)(x - 3)；零點是 2 和 3。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：x^2 - 5x + 6 = (x - 2)(x - 3)；零点是 2 和 3。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 ** 2 - 5 * 2 + 6",
              "expected": 0
            },
            {
              "id": "e1-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "3 ** 2 - 5 * 3 + 6",
              "expected": 0
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-04/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s4-chapter-04-repair-worked-02",
          "title": "Worked example 2",
          "kind": "quadratic-graph",
          "renderer": "svg",
          "prompt": {
            "en": "For f(x) = x^2 - 6x + 5, find the vertex.",
            "zh": "對於 f(x) = x^2 - 6x + 5，求頂點。",
            "zhHans": "对于 f(x) = x^2 - 6x + 5，求顶点。"
          },
          "answer": {
            "en": "vertex = (3, -4).",
            "zh": "頂點 = (3, -4)。",
            "zhHans": "顶点 = (3, -4)。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: vertex = (3, -4)."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：頂點 = (3, -4)。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：顶点 = (3, -4)。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "3 ** 2 - 6 * 3 + 5",
              "expected": -4
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-04/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s4-chapter-05",
      "grade": "S4",
      "usGradeLabel": "Grade 10",
      "order": 10,
      "title": {
        "en": "Conditional Probability",
        "zh": "條件概率",
        "zhHans": "条件概率"
      },
      "standards": [
        "CA.CCSS.Math.HS.S-CP"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-05/concept.webp",
        "alt": {
          "en": "Conditional Probability concept background for internal review",
          "zh": "條件概率概念背景，僅供內部審查",
          "zhHans": "条件概率概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "ocr-warning-human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s4-chapter-05-repair-worked-01",
          "title": "Worked example 1",
          "kind": "probability-table",
          "renderer": "svg",
          "prompt": {
            "en": "In a two-way table, 12 students ride the bus and 8 of those also attend tutoring. Find P(tutoring | bus).",
            "zh": "在一個雙向表中，12 名學生乘校車，其中 8 人也參加輔導。求 P(參加輔導 | 乘校車)。",
            "zhHans": "在一个双向表中，12 名学生乘校车，其中 8 人也参加辅导。求 P(参加辅导 | 乘校车)。"
          },
          "answer": {
            "en": "P(tutoring | bus) = 8/12 = 2/3.",
            "zh": "P(參加輔導 | 乘校車) = 8/12 = 2/3。",
            "zhHans": "P(参加辅导 | 乘校车) = 8/12 = 2/3。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: P(tutoring | bus) = 8/12 = 2/3."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：P(參加輔導 | 乘校車) = 8/12 = 2/3。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：P(参加辅导 | 乘校车) = 8/12 = 2/3。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "8 / 12",
              "expected": 0.6666666666666666
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-05/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s4-chapter-05-repair-worked-02",
          "title": "Worked example 2",
          "kind": "probability-tree",
          "renderer": "svg",
          "prompt": {
            "en": "Event A has probability 0.40. Given A, event B has probability 0.25. Find P(A and B).",
            "zh": "事件 A 的概率為 0.40。在 A 已發生的條件下，事件 B 的概率為 0.25。求 P(A 且 B)。",
            "zhHans": "事件 A 的概率为 0.40。在 A 已发生的条件下，事件 B 的概率为 0.25。求 P(A 且 B)。"
          },
          "answer": {
            "en": "P(A and B) = 0.10.",
            "zh": "P(A 且 B) = 0.10。",
            "zhHans": "P(A 且 B) = 0.10。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: P(A and B) = 0.10."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：P(A 且 B) = 0.10。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：P(A 且 B) = 0.10。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.4 * 0.25",
              "expected": 0.1
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s4-chapter-05/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s5-chapter-01",
      "grade": "S5",
      "usGradeLabel": "Grade 11",
      "order": 11,
      "title": {
        "en": "Function Transformations and Inverses",
        "zh": "函數變換與反函數",
        "zhHans": "函数变换与反函数"
      },
      "standards": [
        "CA.CCSS.Math.HS.F-BF"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-01/concept.webp",
        "alt": {
          "en": "Function Transformations and Inverses concept background for internal review",
          "zh": "函數變換與反函數概念背景，僅供內部審查",
          "zhHans": "函数变换与反函数概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s5-chapter-01-repair-worked-01",
          "title": "Worked example 1",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "Let f(x) = x^2 and g(x) = f(x - 3) + 2. Find the vertex of g.",
            "zh": "令 f(x) = x^2，且 g(x) = f(x - 3) + 2。求 g 的頂點。",
            "zhHans": "令 f(x) = x^2，且 g(x) = f(x - 3) + 2。求 g 的顶点。"
          },
          "answer": {
            "en": "vertex = (3, 2).",
            "zh": "頂點 = (3, 2)。",
            "zhHans": "顶点 = (3, 2)。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: vertex = (3, 2)."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：頂點 = (3, 2)。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：顶点 = (3, 2)。"
            ]
          },
          "checks": [],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-01/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s5-chapter-01-repair-worked-02",
          "title": "Worked example 2",
          "kind": "equation-flow",
          "renderer": "svg-katex",
          "prompt": {
            "en": "Find the inverse of h(x) = 2x - 5.",
            "zh": "求 h(x) = 2x - 5 的反函數。",
            "zhHans": "求 h(x) = 2x - 5 的反函数。"
          },
          "answer": {
            "en": "h^{-1}(x) = (x + 5) / 2.",
            "zh": "h^{-1}(x) = (x + 5) / 2。",
            "zhHans": "h^{-1}(x) = (x + 5) / 2。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: h^{-1}(x) = (x + 5) / 2."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：h^{-1}(x) = (x + 5) / 2。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：h^{-1}(x) = (x + 5) / 2。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(9 + 5) / 2",
              "expected": 7
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 * 7 - 5",
              "expected": 9
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-01/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s5-chapter-02",
      "grade": "S5",
      "usGradeLabel": "Grade 11",
      "order": 12,
      "title": {
        "en": "Exponential and Logarithmic Models",
        "zh": "指數與對數模型",
        "zhHans": "指数与对数模型"
      },
      "standards": [
        "CA.CCSS.Math.HS.F-LE"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-02/concept.webp",
        "alt": {
          "en": "Exponential and Logarithmic Models concept background for internal review",
          "zh": "指數與對數模型概念背景，僅供內部審查",
          "zhHans": "指数与对数模型概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s5-chapter-02-repair-worked-01",
          "title": "Worked example 1",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A quantity follows P(t) = 500(1.08)^t. Estimate P(3).",
            "zh": "某數量遵循 P(t) = 500(1.08)^t。估算 P(3)。",
            "zhHans": "某数量遵循 P(t) = 500(1.08)^t。估算 P(3)。"
          },
          "answer": {
            "en": "P(3) is about 630.",
            "zh": "P(3) 約為 630。",
            "zhHans": "P(3) 约为 630。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: P(3) is about 630."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：P(3) 約為 630。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：P(3) 约为 630。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "500 * 1.08 ** 3",
              "expected": 629.856
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-02/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s5-chapter-02-repair-worked-02",
          "title": "Worked example 2",
          "kind": "equation-flow",
          "renderer": "svg-katex",
          "prompt": {
            "en": "Solve 3 * 2^t = 24.",
            "zh": "求解 3 * 2^t = 24。",
            "zhHans": "解方程 3 * 2^t = 24。"
          },
          "answer": {
            "en": "t = 3.",
            "zh": "t = 3。",
            "zhHans": "t = 3。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: t = 3."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：t = 3。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：t = 3。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "3 * 2 ** 3",
              "expected": 24
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-02/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s5-chapter-03",
      "grade": "S5",
      "usGradeLabel": "Grade 11",
      "order": 13,
      "title": {
        "en": "Trigonometric Functions and Graphs",
        "zh": "三角函數與圖像",
        "zhHans": "三角函数与图像"
      },
      "standards": [
        "CA.CCSS.Math.HS.F-TF"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-03/concept.webp",
        "alt": {
          "en": "Trigonometric Functions and Graphs concept background for internal review",
          "zh": "三角函數與圖像概念背景，僅供內部審查",
          "zhHans": "三角函数与图像概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s5-chapter-03-repair-worked-01",
          "title": "Worked example 1",
          "kind": "trig-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A tide model is y = 3sin((2pi/12)(t - 2)) + 5. Name the amplitude, period, and midline.",
            "zh": "潮汐模型為 y = 3sin((2pi/12)(t - 2)) + 5。說出振幅、週期和中線。",
            "zhHans": "潮汐模型为 y = 3sin((2pi/12)(t - 2)) + 5。说出振幅、周期和中线。"
          },
          "answer": {
            "en": "amplitude = 3; period = 12; midline y = 5.",
            "zh": "振幅 = 3；週期 = 12；中線為 y = 5。",
            "zhHans": "振幅 = 3；周期 = 12；中线为 y = 5。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: amplitude = 3; period = 12; midline y = 5."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：振幅 = 3；週期 = 12；中線為 y = 5。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：振幅 = 3；周期 = 12；中线为 y = 5。"
            ]
          },
          "checks": [],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-03/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s5-chapter-03-repair-worked-02",
          "title": "Worked example 2",
          "kind": "trig-graph",
          "renderer": "svg",
          "prompt": {
            "en": "For y = 4cos((pi/6)x) + 1, find the period and y(0).",
            "zh": "對於 y = 4cos((pi/6)x) + 1，求週期和 y(0)。",
            "zhHans": "对于 y = 4cos((pi/6)x) + 1，求周期和 y(0)。"
          },
          "answer": {
            "en": "period = 12; y(0) = 5.",
            "zh": "週期 = 12；y(0) = 5。",
            "zhHans": "周期 = 12；y(0) = 5。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: period = 12; y(0) = 5."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：週期 = 12；y(0) = 5。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：周期 = 12；y(0) = 5。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "4 * Math.cos(0) + 1",
              "expected": 5
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-03/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s5-chapter-04",
      "grade": "S5",
      "usGradeLabel": "Grade 11",
      "order": 14,
      "title": {
        "en": "Data Modeling and Residuals",
        "zh": "數據建模與殘差",
        "zhHans": "数据建模与残差"
      },
      "standards": [
        "CA.CCSS.Math.HS.S-ID"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-04/concept.webp",
        "alt": {
          "en": "Data Modeling and Residuals concept background for internal review",
          "zh": "數據建模與殘差概念背景，僅供內部審查",
          "zhHans": "数据建模与残差概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s5-chapter-04-repair-worked-01",
          "title": "Worked example 1",
          "kind": "data-model",
          "renderer": "svg",
          "prompt": {
            "en": "A regression model predicts y = 1.5x + 4. At x = 6, the observed value is 14. Find the residual.",
            "zh": "回歸模型預測 y = 1.5x + 4。當 x = 6 時，觀察值為 14。求殘差。",
            "zhHans": "回归模型预测 y = 1.5x + 4。当 x = 6 时，观察值为 14。求残差。"
          },
          "answer": {
            "en": "predicted = 13; residual = 1.",
            "zh": "預測值 = 13；殘差 = 1。",
            "zhHans": "预测值 = 13；残差 = 1。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: predicted = 13; residual = 1."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：預測值 = 13；殘差 = 1。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：预测值 = 13；残差 = 1。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "1.5 * 6 + 4",
              "expected": 13
            },
            {
              "id": "e1-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "14 - 13",
              "expected": 1
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-04/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s5-chapter-04-repair-worked-02",
          "title": "Worked example 2",
          "kind": "data-model",
          "renderer": "svg",
          "prompt": {
            "en": "Model A has squared-error total 18. Model B has squared-error total 12. Which model fits this data better?",
            "zh": "模型 A 的平方誤差總和為 18。模型 B 的平方誤差總和為 12。哪個模型較適合這組數據？",
            "zhHans": "模型 A 的平方误差总和为 18。模型 B 的平方误差总和为 12。哪个模型较适合这组数据？"
          },
          "answer": {
            "en": "Model B fits better because it has the smaller squared-error total.",
            "zh": "模型 B 較適合，因為它的平方誤差總和較小。",
            "zhHans": "模型 B 较适合，因为它的平方误差总和较小。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: Model B fits better because it has the smaller squared-error total."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：模型 B 較適合，因為它的平方誤差總和較小。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：模型 B 较适合，因为它的平方误差总和较小。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "12 < 18 ? 1 : 0",
              "expected": 1
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-04/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s5-chapter-05",
      "grade": "S5",
      "usGradeLabel": "Grade 11",
      "order": 15,
      "title": {
        "en": "Statistical Inference and Claims",
        "zh": "統計推斷與論證",
        "zhHans": "统计推断与论证"
      },
      "standards": [
        "CA.CCSS.Math.HS.S-IC"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-05/concept.webp",
        "alt": {
          "en": "Statistical Inference and Claims concept background for internal review",
          "zh": "統計推斷與論證概念背景，僅供內部審查",
          "zhHans": "统计推断与论证概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s5-chapter-05-repair-worked-01",
          "title": "Worked example 1",
          "kind": "interval-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A sample proportion is 0.56 with margin of error 0.08. Give the confidence interval.",
            "zh": "樣本比例為 0.56，誤差範圍為 0.08。寫出信賴區間。",
            "zhHans": "样本比例为 0.56，误差范围为 0.08。写出置信区间。"
          },
          "answer": {
            "en": "interval = [0.48, 0.64].",
            "zh": "區間 = [0.48, 0.64]。",
            "zhHans": "区间 = [0.48, 0.64]。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: interval = [0.48, 0.64]."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：區間 = [0.48, 0.64]。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：区间 = [0.48, 0.64]。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.56 - 0.08",
              "expected": 0.48
            },
            {
              "id": "e1-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.56 + 0.08",
              "expected": 0.64
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-05/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s5-chapter-05-repair-worked-02",
          "title": "Worked example 2",
          "kind": "interval-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A sample mean is 72 with margin of error 3. Give the confidence interval and check whether 70 is plausible.",
            "zh": "樣本平均數為 72，誤差範圍為 3。寫出信賴區間，並判斷 70 是否合理。",
            "zhHans": "样本平均数为 72，误差范围为 3。写出置信区间，并判断 70 是否合理。"
          },
          "answer": {
            "en": "interval = [69, 75]; 70 is inside the interval.",
            "zh": "區間 = [69, 75]；70 在區間內。",
            "zhHans": "区间 = [69, 75]；70 在区间内。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: interval = [69, 75]; 70 is inside the interval."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：區間 = [69, 75]；70 在區間內。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：区间 = [69, 75]；70 在区间内。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "72 - 3",
              "expected": 69
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "72 + 3",
              "expected": 75
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s5-chapter-05/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s6-chapter-01",
      "grade": "S6",
      "usGradeLabel": "Grade 12",
      "order": 16,
      "title": {
        "en": "Quantities, Units, and Precision",
        "zh": "數量、單位與精確度",
        "zhHans": "数量、单位与精确度"
      },
      "standards": [
        "CA.CCSS.Math.HS.N-Q"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-01/concept.webp",
        "alt": {
          "en": "Quantities, Units, and Precision concept background for internal review",
          "zh": "數量、單位與精確度概念背景，僅供內部審查",
          "zhHans": "数量、单位与精确度概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s6-chapter-01-repair-worked-01",
          "title": "Worked example 1",
          "kind": "units-diagram",
          "renderer": "svg-katex",
          "prompt": {
            "en": "A rectangle is measured as 2.4 m by 1.5 m. Find the area with square-meter units.",
            "zh": "一個長方形量得長 2.4 m、寬 1.5 m。求面積，並使用平方公尺單位。",
            "zhHans": "一个长方形量得长 2.4 m、宽 1.5 m。求面积，并使用平方米单位。"
          },
          "answer": {
            "en": "area = 3.6 m^2.",
            "zh": "面積 = 3.6 m^2。",
            "zhHans": "面积 = 3.6 m^2。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: area = 3.6 m^2."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：面積 = 3.6 m^2。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：面积 = 3.6 m^2。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2.4 * 1.5",
              "expected": 3.6
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-01/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s6-chapter-01-repair-worked-02",
          "title": "Worked example 2",
          "kind": "interval-diagram",
          "renderer": "svg",
          "prompt": {
            "en": "A length is reported as 12.4 cm to the nearest tenth. Give the possible measurement interval.",
            "zh": "某長度按最接近的十分之一公分記為 12.4 cm。寫出可能的測量區間。",
            "zhHans": "某长度按最接近的十分之一厘米记为 12.4 cm。写出可能的测量区间。"
          },
          "answer": {
            "en": "interval = [12.35, 12.45) cm.",
            "zh": "區間 = [12.35, 12.45) cm。",
            "zhHans": "区间 = [12.35, 12.45) cm。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: interval = [12.35, 12.45) cm."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：區間 = [12.35, 12.45) cm。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：区间 = [12.35, 12.45) cm。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "12.4 - 0.05",
              "expected": 12.35
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "12.4 + 0.05",
              "expected": 12.45
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-01/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s6-chapter-02",
      "grade": "S6",
      "usGradeLabel": "Grade 12",
      "order": 17,
      "title": {
        "en": "Polynomial Structure and Behavior",
        "zh": "多項式結構與行為",
        "zhHans": "多项式结构与行为"
      },
      "standards": [
        "CA.CCSS.Math.HS.A-APR"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-02/concept.webp",
        "alt": {
          "en": "Polynomial Structure and Behavior concept background for internal review",
          "zh": "多項式結構與行為概念背景，僅供內部審查",
          "zhHans": "多项式结构与行为概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s6-chapter-02-repair-worked-01",
          "title": "Worked example 1",
          "kind": "polynomial-graph",
          "renderer": "svg-katex",
          "prompt": {
            "en": "For p(x) = x^3 - 4x^2 + x + 6, verify that x = 2 is a zero.",
            "zh": "對於 p(x) = x^3 - 4x^2 + x + 6，驗證 x = 2 是零點。",
            "zhHans": "对于 p(x) = x^3 - 4x^2 + x + 6，验证 x = 2 是零点。"
          },
          "answer": {
            "en": "p(2) = 0, so x - 2 is a factor.",
            "zh": "p(2) = 0，因此 x - 2 是因式。",
            "zhHans": "p(2) = 0，因此 x - 2 是因式。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: p(2) = 0, so x - 2 is a factor."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：p(2) = 0，因此 x - 2 是因式。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：p(2) = 0，因此 x - 2 是因式。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "2 ** 3 - 4 * 2 ** 2 + 2 + 6",
              "expected": 0
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-02/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s6-chapter-02-repair-worked-02",
          "title": "Worked example 2",
          "kind": "polynomial-graph",
          "renderer": "svg-katex",
          "prompt": {
            "en": "A cubic is written (x + 1)(x - 3)(x - 4). Name the zeros.",
            "zh": "一個三次多項式寫成 (x + 1)(x - 3)(x - 4)。說出零點。",
            "zhHans": "一个三次多项式写成 (x + 1)(x - 3)(x - 4)。说出零点。"
          },
          "answer": {
            "en": "zeros are -1, 3, and 4.",
            "zh": "零點是 -1、3 和 4。",
            "zhHans": "零点是 -1、3 和 4。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: zeros are -1, 3, and 4."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：零點是 -1、3 和 4。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：零点是 -1、3 和 4。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(-1 + 1) * (-1 - 3) * (-1 - 4)",
              "expected": 0
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(3 + 1) * (3 - 3) * (3 - 4)",
              "expected": 0
            },
            {
              "id": "e2-check-3",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(4 + 1) * (4 - 3) * (4 - 4)",
              "expected": 0
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-02/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s6-chapter-03",
      "grade": "S6",
      "usGradeLabel": "Grade 12",
      "order": 18,
      "title": {
        "en": "Decision Statistics",
        "zh": "決策統計",
        "zhHans": "决策统计"
      },
      "standards": [
        "CA.CCSS.Math.HS.S-MD"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-03/concept.webp",
        "alt": {
          "en": "Decision Statistics concept background for internal review",
          "zh": "決策統計概念背景，僅供內部審查",
          "zhHans": "决策统计概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s6-chapter-03-repair-worked-01",
          "title": "Worked example 1",
          "kind": "decision-table",
          "renderer": "svg",
          "prompt": {
            "en": "A decision has a 0.30 chance of gaining 40 points and a 0.70 chance of losing 10 points. Find the expected value.",
            "zh": "某決策有 0.30 的機率獲得 40 分，0.70 的機率失去 10 分。求期望值。",
            "zhHans": "某决策有 0.30 的概率获得 40 分，0.70 的概率失去 10 分。求期望值。"
          },
          "answer": {
            "en": "expected value = 5 points.",
            "zh": "期望值 = 5 分。",
            "zhHans": "期望值 = 5 分。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: expected value = 5 points."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：期望值 = 5 分。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：期望值 = 5 分。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.3 * 40 + 0.7 * -10",
              "expected": 5
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-03/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s6-chapter-03-repair-worked-02",
          "title": "Worked example 2",
          "kind": "decision-table",
          "renderer": "svg",
          "prompt": {
            "en": "Strategy A has expected score 0.6(80) + 0.4(20). Strategy B has expected score 0.5(70) + 0.5(50). Which is larger?",
            "zh": "策略 A 的期望分數為 0.6(80) + 0.4(20)。策略 B 的期望分數為 0.5(70) + 0.5(50)。哪個較大？",
            "zhHans": "策略 A 的期望分数为 0.6(80) + 0.4(20)。策略 B 的期望分数为 0.5(70) + 0.5(50)。哪个较大？"
          },
          "answer": {
            "en": "A = 56 and B = 60, so Strategy B is larger.",
            "zh": "A = 56，B = 60，因此策略 B 較大。",
            "zhHans": "A = 56，B = 60，因此策略 B 较大。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: A = 56 and B = 60, so Strategy B is larger."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：A = 56，B = 60，因此策略 B 較大。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：A = 56，B = 60，因此策略 B 较大。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.6 * 80 + 0.4 * 20",
              "expected": 56
            },
            {
              "id": "e2-check-2",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "0.5 * 70 + 0.5 * 50",
              "expected": 60
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-03/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s6-chapter-04",
      "grade": "S6",
      "usGradeLabel": "Grade 12",
      "order": 19,
      "title": {
        "en": "Function Analysis and Rates",
        "zh": "函數分析與變化率",
        "zhHans": "函数分析与变化率"
      },
      "standards": [
        "CA.CCSS.Math.HS.F-IF"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-04/concept.webp",
        "alt": {
          "en": "Function Analysis and Rates concept background for internal review",
          "zh": "函數分析與變化率概念背景，僅供內部審查",
          "zhHans": "函数分析与变化率概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s6-chapter-04-repair-worked-01",
          "title": "Worked example 1",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "A function has f(2) = 10 and f(6) = 26. Find the average rate of change.",
            "zh": "某函數滿足 f(2) = 10 且 f(6) = 26。求平均變化率。",
            "zhHans": "某函数满足 f(2) = 10 且 f(6) = 26。求平均变化率。"
          },
          "answer": {
            "en": "average rate of change = 4.",
            "zh": "平均變化率 = 4。",
            "zhHans": "平均变化率 = 4。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: average rate of change = 4."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：平均變化率 = 4。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：平均变化率 = 4。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "(26 - 10) / (6 - 2)",
              "expected": 4
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-04/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s6-chapter-04-repair-worked-02",
          "title": "Worked example 2",
          "kind": "function-graph",
          "renderer": "svg",
          "prompt": {
            "en": "For h(t) = t^2 + 2t, find the average rate of change from t = 1 to t = 4.",
            "zh": "對於 h(t) = t^2 + 2t，求 t = 1 到 t = 4 的平均變化率。",
            "zhHans": "对于 h(t) = t^2 + 2t，求 t = 1 到 t = 4 的平均变化率。"
          },
          "answer": {
            "en": "average rate of change = 7.",
            "zh": "平均變化率 = 7。",
            "zhHans": "平均变化率 = 7。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: average rate of change = 7."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：平均變化率 = 7。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：平均变化率 = 7。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "((4 ** 2 + 2 * 4) - (1 ** 2 + 2 * 1)) / (4 - 1)",
              "expected": 7
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-04/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    },
    {
      "chapterId": "us-ca-math-s6-chapter-05",
      "grade": "S6",
      "usGradeLabel": "Grade 12",
      "order": 20,
      "title": {
        "en": "Capstone Modeling",
        "zh": "總結性建模",
        "zhHans": "总结性建模"
      },
      "standards": [
        "CA.CCSS.Math.HS.Modeling"
      ],
      "concept": {
        "src": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-05/concept.webp",
        "alt": {
          "en": "Capstone Modeling concept background for internal review",
          "zh": "總結性建模概念背景，僅供內部審查",
          "zhHans": "总结性建模概念背景，仅供内部审查"
        },
        "s18Decision": "bg-candidate-accepted-for-s05-placement-review",
        "s09Decision": "human-cleared-no-readable-student-copy",
        "sourceDistanceDecision": "candidate-cleared-no-official-source-motifs-found",
        "productionApproval": "not-approved-for-production-integration"
      },
      "workedExamples": [
        {
          "exampleId": "us-ca-math-s6-chapter-05-repair-worked-01",
          "title": "Worked example 1",
          "kind": "data-model",
          "renderer": "svg",
          "prompt": {
            "en": "A planning model uses y = 18w + 120 for total supplies after w weeks. Predict y when w = 5 and state the assumption.",
            "zh": "某規劃模型用 y = 18w + 120 表示 w 週後的總物資量。預測 w = 5 時的 y，並說明假設。",
            "zhHans": "某规划模型用 y = 18w + 120 表示 w 周后的总物资量。预测 w = 5 时的 y，并说明假设。"
          },
          "answer": {
            "en": "y = 210; the model assumes a constant weekly increase.",
            "zh": "y = 210；模型假設每週固定增加。",
            "zhHans": "y = 210；模型假设每周固定增加。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: y = 210; the model assumes a constant weekly increase."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：y = 210；模型假設每週固定增加。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：y = 210；模型假设每周固定增加。"
            ]
          },
          "checks": [
            {
              "id": "e1-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "18 * 5 + 120",
              "expected": 210
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-05/worked-example-1.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        },
        {
          "exampleId": "us-ca-math-s6-chapter-05-repair-worked-02",
          "title": "Worked example 2",
          "kind": "quadratic-graph",
          "renderer": "svg",
          "prompt": {
            "en": "Revenue is R(p) = p(120 - 4p). Find the price p that maximizes revenue and the maximum revenue.",
            "zh": "收益為 R(p) = p(120 - 4p)。求使收益最大的價格 p 和最大收益。",
            "zhHans": "收益为 R(p) = p(120 - 4p)。求使收益最大的价格 p 和最大收益。"
          },
          "answer": {
            "en": "p = 15; maximum revenue = 900.",
            "zh": "p = 15；最大收益 = 900。",
            "zhHans": "p = 15；最大收益 = 900。"
          },
          "solutionSteps": {
            "en": [
              "Identify the quantities and the representation needed for the question.",
              "Use the displayed equation, diagram, table, or graph to compute the requested value.",
              "Final result: p = 15; maximum revenue = 900."
            ],
            "zh": [
              "辨識題目中的數量與需要使用的表示方式。",
              "使用方程、圖、表格或圖像計算所求的量。",
              "最後結果：p = 15；最大收益 = 900。"
            ],
            "zhHans": [
              "识别题目中的数量与需要使用的表示方式。",
              "使用方程、图、表格或图像计算所求的量。",
              "最后结果：p = 15；最大收益 = 900。"
            ]
          },
          "checks": [
            {
              "id": "e2-check-1",
              "type": "numeric",
              "tolerance": 1e-9,
              "expression": "15 * (120 - 4 * 15)",
              "expected": 900
            }
          ],
          "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/us-ca-math-s6-chapter-05/worked-example-2.svg",
          "copyReviewStatus": "s09-candidate-copy-reviewed-by-codex",
          "qaStatus": "candidate-localized-needs-s18-review",
          "s24VisualReviewDecision": "candidate-visual-qa-pass-for-s05-preview-only",
          "placementStatus": "s05-preview-only-s24-candidate-visual-qa-pass-final-release-approval-required"
        }
      ],
      "s05PlacementDecision": "approved-for-internal-placement-preview-only",
      "releaseStatus": "live-noindex-route-integrated-not-production-approved"
    }
  ]
} as const;

const californiaHighSchoolChapterPlacementById: Record<string, CaliforniaHighSchoolChapterPlacement> = {
  "us-ca-math-s3-chapter-01": {
    domainCode: "A-CED",
    conceptualCategory: "Algebra",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.EE", "8.F"],
    modelingOpportunities: ["Write and interpret equations from contextual constraints."]
  },
  "us-ca-math-s3-chapter-02": {
    domainCode: "F-IF",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.F", "A-CED"],
    modelingOpportunities: ["Interpret function notation in tables, graphs, and verbal contexts."]
  },
  "us-ca-math-s3-chapter-03": {
    domainCode: "F-LE",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.F", "F-IF"],
    modelingOpportunities: ["Compare linear and exponential change using contextual rates."]
  },
  "us-ca-math-s3-chapter-04": {
    domainCode: "G-GPE",
    conceptualCategory: "Geometry",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.G", "A-CED"],
    modelingOpportunities: ["Use coordinates to justify geometric relationships."]
  },
  "us-ca-math-s3-chapter-05": {
    domainCode: "S-ID",
    conceptualCategory: "Statistics and Probability",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.SP"],
    modelingOpportunities: ["Summarize and interpret data from a meaningful context."]
  },
  "us-ca-math-s4-chapter-01": {
    domainCode: "G-CO",
    conceptualCategory: "Geometry",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.G", "G-GPE"],
    modelingOpportunities: ["Reason about transformations and congruence with diagrams."]
  },
  "us-ca-math-s4-chapter-02": {
    domainCode: "G-SRT",
    conceptualCategory: "Geometry",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.G", "G-CO"],
    modelingOpportunities: ["Use similarity and right-triangle relationships in measurement contexts."]
  },
  "us-ca-math-s4-chapter-03": {
    domainCode: "G-C",
    conceptualCategory: "Geometry",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["G-CO", "G-SRT"],
    modelingOpportunities: ["Connect circle relationships to diagram-based evidence."]
  },
  "us-ca-math-s4-chapter-04": {
    domainCode: "A-SSE",
    conceptualCategory: "Algebra",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["A-CED", "A-REI"],
    modelingOpportunities: ["Choose useful algebraic forms for contextual expressions."]
  },
  "us-ca-math-s4-chapter-05": {
    domainCode: "S-CP",
    conceptualCategory: "Statistics and Probability",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["S-ID"],
    modelingOpportunities: ["Represent chance processes and conditional probability decisions."]
  },
  "us-ca-math-s5-chapter-01": {
    domainCode: "F-BF",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["F-IF", "F-LE"],
    modelingOpportunities: ["Build functions from contextual or recursive relationships."]
  },
  "us-ca-math-s5-chapter-02": {
    domainCode: "F-LE",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["F-IF", "A-SSE"],
    modelingOpportunities: ["Model growth and decay with interpretable parameters."]
  },
  "us-ca-math-s5-chapter-03": {
    domainCode: "F-TF",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["G-SRT", "F-IF"],
    modelingOpportunities: ["Use trigonometric functions to model periodic or geometric contexts."]
  },
  "us-ca-math-s5-chapter-04": {
    domainCode: "S-ID",
    conceptualCategory: "Statistics and Probability",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["S-ID", "A-CED"],
    modelingOpportunities: ["Fit and interpret data relationships with attention to residuals."]
  },
  "us-ca-math-s5-chapter-05": {
    domainCode: "S-IC",
    conceptualCategory: "Statistics and Probability",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["S-ID", "S-CP"],
    modelingOpportunities: ["Use samples and simulations to support claims."]
  },
  "us-ca-math-s6-chapter-01": {
    domainCode: "N-Q",
    conceptualCategory: "Number and Quantity",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["8.EE", "A-CED"],
    modelingOpportunities: ["Track quantities, units, and precision in a modeling context."]
  },
  "us-ca-math-s6-chapter-02": {
    domainCode: "A-APR",
    conceptualCategory: "Algebra",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["A-SSE", "A-REI"],
    modelingOpportunities: ["Use polynomial structure to represent and solve applied problems."]
  },
  "us-ca-math-s6-chapter-03": {
    domainCode: "S-MD",
    conceptualCategory: "Statistics and Probability",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["S-CP", "S-IC"],
    modelingOpportunities: ["Evaluate expected value and decisions under uncertainty."]
  },
  "us-ca-math-s6-chapter-04": {
    domainCode: "F-IF",
    conceptualCategory: "Functions",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["F-BF", "F-LE"],
    modelingOpportunities: ["Interpret function features from equations, tables, and graphs."]
  },
  "us-ca-math-s6-chapter-05": {
    domainCode: "Modeling",
    conceptualCategory: "Modeling",
    pathwayLabel: "High school pathway preview",
    prerequisiteDomains: ["A-CED", "F-IF", "S-ID"],
    modelingOpportunities: ["Choose assumptions, compute, interpret, and revise a mathematical model."]
  }
};

export const californiaHighSchoolTextbookChapters =
  californiaHighSchoolTextbookDraft.chapters.map((chapter) => {
    const placement = californiaHighSchoolChapterPlacementById[chapter.chapterId];
    return {
      ...chapter,
      ...placement,
      standards: [`CA.CCSS.Math.HS.${placement.domainCode}`]
    };
  }) satisfies readonly CaliforniaHighSchoolTextbookChapter[];
