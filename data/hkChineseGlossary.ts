export type HkChineseGlossaryDomain =
  | "math"
  | "curriculum"
  | "ui"
  | "role"
  | "assessment"
  | "accessibility"
  | "brand";

export type HkChineseGlossaryEntry = {
  preferredZh: string;
  allowedZh?: readonly string[];
  rejectedZh?: readonly string[];
  domain: HkChineseGlossaryDomain;
  gradeRange?: string;
  sourceRefs: readonly string[];
  notes: string;
};

export const hkChineseSourceReferences = {
  edbMathGlossary2020: {
    title: "教育局《數學科常用英漢辭彙》2020年7月8日版",
    url: "https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/ma/res/Glossary20200708.pdf"
  },
  edbMathGlossaryNotes: {
    title: "教育局數學科英漢辭彙使用說明",
    url: "https://www.edb.gov.hk/tc/curriculum-development/kla/ma/res/glossary-notes.html"
  },
  edbPrimaryLexicalList: {
    title: "教育局香港小學學習字詞表",
    url: "https://www.edbchinese.hk/lexlist_ch/"
  },
  edbChineseCoreWords: {
    title: "教育局中英對照香港學校中文學習基礎字詞",
    url: "https://www.edbchinese.hk/lexlist_en/"
  },
  maisProductDecision: {
    title: "MAIS 既有產品語氣與 coordination/decisions 記錄",
    url: "coordination/decisions/"
  }
} as const;

export const hkChineseGlossary = [
  {
    preferredZh: "妙思數",
    allowedZh: ["MAIS"],
    domain: "brand",
    sourceRefs: ["maisProductDecision"],
    notes: "MAIS 的繁體中文產品名。"
  },
  {
    preferredZh: "小一",
    allowedZh: ["小二", "小三", "小四", "小五", "小六", "中一", "中二", "中三", "中四", "中五", "中六"],
    rejectedZh: ["一年級", "七年級"],
    domain: "curriculum",
    gradeRange: "P1-S6",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "香港教育語境使用小一至小六、中一至中六；不要改成內地或美式年級名。"
  },
  {
    preferredZh: "學生",
    allowedZh: ["同學", "學員", "學習者"],
    domain: "role",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "產品角色和學生向 UI 的預設稱呼。"
  },
  {
    preferredZh: "教師",
    allowedZh: ["老師"],
    rejectedZh: ["导师"],
    domain: "role",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "學校職能與正式 UI 預設用教師；學生向語氣可用老師。"
  },
  {
    preferredZh: "家長／監護人",
    allowedZh: ["家長", "監護人"],
    rejectedZh: ["家长", "Parent's Parent"],
    domain: "role",
    sourceRefs: ["maisProductDecision"],
    notes: "成熟市場文案用家長／監護人；MVP 介面可保留家長。"
  },
  {
    preferredZh: "坐標",
    rejectedZh: ["座標", "坐标"],
    domain: "math",
    gradeRange: "P6-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "香港數學教育常用坐標。"
  },
  {
    preferredZh: "概率",
    rejectedZh: ["機率", "几率"],
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "配合香港數學辭彙，不使用台灣常見的機率。"
  },
  {
    preferredZh: "數據",
    allowedZh: ["資料", "資料庫"],
    rejectedZh: ["数据"],
    domain: "math",
    gradeRange: "P1-S6",
    sourceRefs: ["edbMathGlossary2020", "edbChineseCoreWords"],
    notes: "數學、統計和圖表語境用數據；資料可用於一般內容或資料庫。"
  },
  {
    preferredZh: "棒形圖",
    allowedZh: ["棒形圖表", "圖表"],
    rejectedZh: ["長條圖", "柱狀圖"],
    domain: "math",
    gradeRange: "P1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "香港課程圖表語境優先棒形圖。"
  },
  {
    preferredZh: "厘米",
    allowedZh: ["cm"],
    rejectedZh: ["公分"],
    domain: "math",
    gradeRange: "P1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "長度單位用香港教育常用的厘米。"
  },
  {
    preferredZh: "周界",
    rejectedZh: ["周長"],
    domain: "math",
    gradeRange: "P4-S2",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "平面圖形 perimeter 在香港小學常用周界。"
  },
  {
    preferredZh: "面積",
    domain: "math",
    gradeRange: "P4-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "area。"
  },
  {
    preferredZh: "體積",
    domain: "math",
    gradeRange: "P5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "volume。"
  },
  {
    preferredZh: "分數",
    domain: "math",
    gradeRange: "P3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "fraction。"
  },
  {
    preferredZh: "小數",
    domain: "math",
    gradeRange: "P4-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "decimal。"
  },
  {
    preferredZh: "百分數",
    allowedZh: ["百分率"],
    rejectedZh: ["百分比"],
    domain: "math",
    gradeRange: "P6-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "percentage 在香港數學課程常見百分數；百分率可按語境使用。"
  },
  {
    preferredZh: "比例",
    allowedZh: ["比"],
    domain: "math",
    gradeRange: "P6-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "ratio/proportion 相關語境。"
  },
  {
    preferredZh: "速率",
    rejectedZh: ["速度"],
    domain: "math",
    gradeRange: "P6-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "數學 rate/speed 題目優先速率；日常語境才考慮速度。"
  },
  {
    preferredZh: "平均數",
    rejectedZh: ["平均值"],
    domain: "math",
    gradeRange: "P5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "mean/average。"
  },
  {
    preferredZh: "標準差",
    domain: "math",
    gradeRange: "S5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "standard deviation。"
  },
  {
    preferredZh: "常態分佈",
    allowedZh: ["正態分佈"],
    rejectedZh: ["常态分布", "常態分布"],
    domain: "math",
    gradeRange: "S5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "normal distribution；繁中保留分佈。"
  },
  {
    preferredZh: "標準分數",
    allowedZh: ["z-score", "Z-score"],
    domain: "math",
    gradeRange: "S5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "standard score / z-score。"
  },
  {
    preferredZh: "函數",
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "function。"
  },
  {
    preferredZh: "圖像",
    rejectedZh: ["图像"],
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "graph/image 按數學語境用圖像。"
  },
  {
    preferredZh: "幾何",
    domain: "math",
    gradeRange: "P1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "geometry。"
  },
  {
    preferredZh: "代數",
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "algebra。"
  },
  {
    preferredZh: "三角學",
    allowedZh: ["三角函數"],
    domain: "math",
    gradeRange: "S4-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "trigonometry。"
  },
  {
    preferredZh: "微積分",
    allowedZh: ["微分"],
    domain: "math",
    gradeRange: "S5-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "calculus/differentiation。"
  },
  {
    preferredZh: "切線",
    domain: "math",
    gradeRange: "S3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "tangent。"
  },
  {
    preferredZh: "斜率",
    allowedZh: ["梯度"],
    rejectedZh: ["斜率值"],
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "gradient/slope；配合現有產品可接受斜率與梯度。"
  },
  {
    preferredZh: "拋物線",
    domain: "math",
    gradeRange: "S3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "parabola。"
  },
  {
    preferredZh: "截距",
    domain: "math",
    gradeRange: "S3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "intercept。"
  },
  {
    preferredZh: "方程",
    domain: "math",
    gradeRange: "S1-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "equation。"
  },
  {
    preferredZh: "對稱軸",
    domain: "math",
    gradeRange: "P3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "axis of symmetry。"
  },
  {
    preferredZh: "位值",
    allowedZh: ["個位", "十位", "百位"],
    domain: "math",
    gradeRange: "P1-P3",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "place value。"
  },
  {
    preferredZh: "數線",
    domain: "math",
    gradeRange: "P1-S1",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "number line。"
  },
  {
    preferredZh: "乘法",
    allowedZh: ["除法", "加法", "減法", "乘數表"],
    domain: "math",
    gradeRange: "P1-S1",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "基本運算詞。"
  },
  {
    preferredZh: "長方體",
    allowedZh: ["小立方體", "立方單位"],
    rejectedZh: ["長方形盒"],
    domain: "math",
    gradeRange: "P5-S2",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "3D geometry and volume。"
  },
  {
    preferredZh: "角",
    allowedZh: ["銳角", "鈍角", "直角", "角度"],
    domain: "math",
    gradeRange: "P3-S6",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "angle vocabulary。"
  },
  {
    preferredZh: "度量",
    allowedZh: ["測量"],
    domain: "math",
    gradeRange: "P1-S3",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "measurement。"
  },
  {
    preferredZh: "規律",
    allowedZh: ["模式"],
    domain: "math",
    gradeRange: "P1-S3",
    sourceRefs: ["edbMathGlossary2020"],
    notes: "pattern；數學規律優先規律。"
  },
  {
    preferredZh: "課題",
    allowedZh: ["課節", "學習路徑", "學習進度"],
    rejectedZh: ["课题", "课节"],
    domain: "curriculum",
    gradeRange: "P1-S6",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "課程和學習流程用語。"
  },
  {
    preferredZh: "練習",
    allowedZh: ["作答", "答案", "題目", "錯題", "重溫"],
    rejectedZh: ["练习", "答案解析"],
    domain: "assessment",
    gradeRange: "P1-S6",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "練習場、錯題集和作答回饋用語。"
  },
  {
    preferredZh: "測驗",
    allowedZh: ["評估", "考試", "應試"],
    domain: "assessment",
    gradeRange: "P1-S6",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "assessment/exam vocabulary。"
  },
  {
    preferredZh: "班級",
    allowedZh: ["課堂", "課堂模式", "班級邀請"],
    rejectedZh: ["班别", "班级"],
    domain: "ui",
    sourceRefs: ["edbPrimaryLexicalList", "maisProductDecision"],
    notes: "教師工作台和課堂互動用語。"
  },
  {
    preferredZh: "帳戶",
    allowedZh: ["用戶名稱", "電郵", "登入", "登出", "註冊", "密碼"],
    rejectedZh: ["账号", "用户名", "邮箱"],
    domain: "ui",
    sourceRefs: ["edbChineseCoreWords", "maisProductDecision"],
    notes: "帳戶與身份驗證用語使用香港繁中。"
  },
  {
    preferredZh: "儲存",
    allowedZh: ["載入", "開啟", "重設", "更新", "選擇", "搜尋"],
    rejectedZh: ["保存", "加载", "重置"],
    domain: "ui",
    sourceRefs: ["edbChineseCoreWords", "maisProductDecision"],
    notes: "常用 UI 動作用語。"
  },
  {
    preferredZh: "導覽",
    allowedZh: ["返回", "下一步", "總覽", "詳細", "全螢幕", "縮小", "放大"],
    domain: "accessibility",
    sourceRefs: ["edbChineseCoreWords", "maisProductDecision"],
    notes: "導覽和 aria label 相關用語。"
  },
  {
    preferredZh: "視覺化",
    allowedZh: ["互動模組", "實驗室", "探索器", "示範"],
    rejectedZh: ["可视化", "视觉化"],
    domain: "ui",
    sourceRefs: ["maisProductDecision"],
    notes: "產品目前採視覺化實驗室作為固定命名。"
  },
  {
    preferredZh: "智能導師",
    allowedZh: ["AI Tutor", "AI 導師"],
    domain: "ui",
    sourceRefs: ["maisProductDecision"],
    notes: "AI tutor 的學生向稱呼。"
  },
  {
    preferredZh: "適性學習",
    allowedZh: ["自適應學習"],
    rejectedZh: ["自适应学习"],
    domain: "ui",
    sourceRefs: ["maisProductDecision"],
    notes: "MAIS 既有產品命名；如日後轉正式教育市場，可再檢討是否改為適應性學習。"
  },
  {
    preferredZh: "積分",
    allowedZh: ["獎勵", "獎品", "兌換"],
    domain: "ui",
    sourceRefs: ["edbChineseCoreWords", "maisProductDecision"],
    notes: "學生獎勵系統用語。"
  },
  {
    preferredZh: "報告",
    allowedZh: ["紀錄", "分析", "學習分析"],
    domain: "ui",
    sourceRefs: ["edbChineseCoreWords", "maisProductDecision"],
    notes: "教師、家長和學生報告用語。"
  }
] as const satisfies readonly HkChineseGlossaryEntry[];
