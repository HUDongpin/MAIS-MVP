import { grades } from "@/data/grades";
import type { CurriculumTrack, Difficulty, GradeId, Language, LocalizedText } from "@/types";

export const languageValues = ["en", "zh", "zh-Hans"] as const satisfies readonly Language[];

export const traditionalToSimplifiedMap: Record<string, string> = {
  佈: "布",
  佔: "占",
  佇: "伫",
  來: "来",
  侖: "仑",
  側: "侧",
  備: "备",
  傳: "传",
  價: "价",
  儀: "仪",
  優: "优",
  兒: "儿",
  內: "内",
  兩: "两",
  冊: "册",
  凍: "冻",
  刪: "删",
  別: "别",
  則: "则",
  創: "创",
  劇: "剧",
  劑: "剂",
  動: "动",
  務: "务",
  勵: "励",
  勸: "劝",
  勻: "匀",
  勢: "势",
  個: "个",
  區: "区",
  協: "协",
  參: "参",
  問: "问",
  啟: "启",
  單: "单",
  員: "员",
  嘗: "尝",
  器: "器",
  嚴: "严",
  圍: "围",
  圖: "图",
  團: "团",
  國: "国",
  圓: "圆",
  報: "报",
  場: "场",
  塊: "块",
  塗: "涂",
  增: "增",
  壓: "压",
  壞: "坏",
  壘: "垒",
  壯: "壮",
  壽: "寿",
  夾: "夹",
  奬: "奖",
  奮: "奋",
  學: "学",
  實: "实",
  寫: "写",
  寬: "宽",
  對: "对",
  導: "导",
  將: "将",
  專: "专",
  尋: "寻",
  層: "层",
  屬: "属",
  帳: "账",
  嶄: "崭",
  幫: "帮",
  幣: "币",
  幹: "干",
  幾: "几",
  庫: "库",
  廣: "广",
  廳: "厅",
  彈: "弹",
  彙: "汇",
  徑: "径",
  從: "从",
  復: "复",
  徵: "征",
  恆: "恒",
  恢: "恢",
  悅: "悦",
  惡: "恶",
  惱: "恼",
  愛: "爱",
  愜: "惬",
  感: "感",
  態: "态",
  慣: "惯",
  慮: "虑",
  慶: "庆",
  應: "应",
  懶: "懒",
  戲: "戏",
  戶: "户",
  戰: "战",
  才: "才",
  批: "批",
  承: "承",
  技: "技",
  折: "折",
  拋: "抛",
  按: "按",
  掃: "扫",
  掌: "掌",
  掛: "挂",
  採: "采",
  換: "换",
  揮: "挥",
  損: "损",
  搖: "摇",
  搜: "搜",
  搶: "抢",
  據: "据",
  擇: "择",
  擊: "击",
  擬: "拟",
  擴: "扩",
  攜: "携",
  攝: "摄",
  擲: "掷",
  數: "数",
  整: "整",
  敵: "敌",
  斂: "敛",
  斷: "断",
  於: "于",
  時: "时",
  晉: "晋",
  暫: "暂",
  曆: "历",
  書: "书",
  會: "会",
  朧: "胧",
  東: "东",
  極: "极",
  標: "标",
  樣: "样",
  構: "构",
  樞: "枢",
  機: "机",
  檔: "档",
  檢: "检",
  權: "权",
  歡: "欢",
  步: "步",
  歸: "归",
  殼: "壳",
  每: "每",
  氣: "气",
  決: "决",
  沒: "没",
  沖: "冲",
  況: "况",
  洩: "泄",
  測: "测",
  準: "准",
  滾: "滚",
  滿: "满",
  漢: "汉",
  漸: "渐",
  演: "演",
  潛: "潜",
  潤: "润",
  點: "点",
  營: "营",
  無: "无",
  熱: "热",
  燈: "灯",
  獎: "奖",
  獨: "独",
  獲: "获",
  現: "现",
  環: "环",
  球: "球",
  畫: "画",
  異: "异",
  當: "当",
  狀: "状",
  疊: "叠",
  發: "发",
  登: "登",
  監: "监",
  盤: "盘",
  盡: "尽",
  直: "直",
  相: "相",
  看: "看",
  着: "着",
  矯: "矫",
  確: "确",
  碼: "码",
  礎: "础",
  禮: "礼",
  稅: "税",
  積: "积",
  穩: "稳",
  空: "空",
  突: "突",
  端: "端",
  筆: "笔",
  策: "策",
  答: "答",
  節: "节",
  範: "范",
  篩: "筛",
  簽: "签",
  簡: "简",
  籤: "签",
  籍: "籍",
  類: "类",
  粵: "粤",
  精: "精",
  紙: "纸",
  線: "线",
  練: "练",
  絕: "绝",
  維: "维",
  綁: "绑",
  縮: "缩",
  總: "总",
  統: "统",
  繁: "繁",
  繫: "系",
  續: "续",
  纜: "缆",
  缺: "缺",
  網: "网",
  羅: "罗",
  習: "习",
  聯: "联",
  聲: "声",
  聰: "聪",
  聽: "听",
  肅: "肃",
  背: "背",
  腦: "脑",
  臨: "临",
  與: "与",
  舉: "举",
  舊: "旧",
  藏: "藏",
  藝: "艺",
  處: "处",
  號: "号",
  術: "术",
  衝: "冲",
  補: "补",
  裝: "装",
  見: "见",
  規: "规",
  視: "视",
  親: "亲",
  覺: "觉",
  觸: "触",
  訂: "订",
  計: "计",
  訊: "讯",
  記: "记",
  設: "设",
  訪: "访",
  評: "评",
  詞: "词",
  試: "试",
  話: "话",
  該: "该",
  詳: "详",
  詢: "询",
  認: "认",
  語: "语",
  說: "说",
  課: "课",
  調: "调",
  談: "谈",
  請: "请",
  論: "论",
  諮: "咨",
  講: "讲",
  證: "证",
  識: "识",
  譯: "译",
  護: "护",
  變: "变",
  讓: "让",
  負: "负",
  財: "财",
  貢: "贡",
  費: "费",
  責: "责",
  資: "资",
  質: "质",
  賽: "赛",
  賺: "赚",
  贏: "赢",
  起: "起",
  趨: "趋",
  跡: "迹",
  蹟: "迹",
  蹤: "踪",
  跟: "跟",
  躍: "跃",
  較: "较",
  載: "载",
  輔: "辅",
  輕: "轻",
  輸: "输",
  轉: "转",
  辦: "办",
  辭: "辞",
  這: "这",
  連: "连",
  週: "周",
  進: "进",
  運: "运",
  過: "过",
  達: "达",
  遙: "遥",
  適: "适",
  選: "选",
  遲: "迟",
  邊: "边",
  郵: "邮",
  醫: "医",
  釋: "释",
  針: "针",
  鈕: "钮",
  錄: "录",
  錯: "错",
  鍵: "键",
  鐘: "钟",
  鎖: "锁",
  鏈: "链",
  關: "关",
  開: "开",
  間: "间",
  隊: "队",
  階: "阶",
  隨: "随",
  雙: "双",
  難: "难",
  離: "离",
  險: "险",
  隱: "隐",
  電: "电",
  需: "需",
  頁: "页",
  項: "项",
  頂: "顶",
  順: "顺",
  預: "预",
  領: "领",
  題: "题",
  額: "额",
  顯: "显",
  風: "风",
  飛: "飞",
  饋: "馈",
  餘: "余",
  鞏: "巩",
  強: "强",
  體: "体",
  高: "高",
  鬆: "松",
  黨: "党",
  為: "为",
  裏: "里",
  裡: "里",
  閱: "阅",
  讀: "读",
  並: "并",
  係: "系",
  儲: "储",
  兌: "兑",
  劃: "划",
  匯: "汇",
  後: "后",
  緊: "紧",
  條: "条",
  橫: "横",
  業: "业",
  減: "减",
  溫: "温",
  湊: "凑",
  產: "产",
  稱: "称",
  組: "组",
  結: "结",
  經: "经",
  績: "绩",
  繼: "继",
  複: "复",
  級: "级",
  萬: "万",
  薦: "荐",
  製: "制",
  註: "注",
  誤: "误",
  許: "许",
  議: "议",
  還: "还",
  遠: "远",
  錢: "钱",
  鉛: "铅",
  門: "门",
  覆: "复",
  覽: "览",
  須: "须",
  頭: "头",
  頻: "频",
  驗: "验",
  驟: "骤",
  齊: "齐",
  齡: "龄",
  麼: "么",
  審: "审",
  長: "长",
  紀: "纪",
  溝: "沟",
  師: "师"
};

type PrcSimplifiedPhraseRule = {
  source: string;
  replacement: string;
  reason: string;
};

export const prcSimplifiedPhraseRules: readonly PrcSimplifiedPhraseRule[] = [
  { source: "小一至小六", replacement: "小学一年级至六年级", reason: "Mainland grade-band label" },
  { source: "小一至中六", replacement: "小学一年级至高中三年级", reason: "Mainland grade-band label" },
  { source: "中一至中六", replacement: "初一至高三", reason: "Mainland grade-band label" },
  { source: "小一", replacement: "小学一年级", reason: "Mainland grade label" },
  { source: "小二", replacement: "小学二年级", reason: "Mainland grade label" },
  { source: "小三", replacement: "小学三年级", reason: "Mainland grade label" },
  { source: "小四", replacement: "小学四年级", reason: "Mainland grade label" },
  { source: "小五", replacement: "小学五年级", reason: "Mainland grade label" },
  { source: "小六", replacement: "小学六年级", reason: "Mainland grade label" },
  { source: "中一", replacement: "初一", reason: "Mainland grade label" },
  { source: "中二", replacement: "初二", reason: "Mainland grade label" },
  { source: "中三", replacement: "初三", reason: "Mainland grade label" },
  { source: "中四", replacement: "高一", reason: "Mainland grade label" },
  { source: "中五", replacement: "高二", reason: "Mainland grade label" },
  { source: "中六", replacement: "高三", reason: "Mainland grade label" },
  { source: "升中", replacement: "小升初", reason: "Mainland transition wording" },
  { source: "视觉化", replacement: "可视化", reason: "Mainland product/education wording" },
  { source: "课节", replacement: "课时", reason: "Mainland classroom wording" },
  { source: "导学课时", replacement: "导学课", reason: "Avoid over-literal class-period wording" },
  { source: "完整实验室", replacement: "完整实验", reason: "Mainland learning-tool wording" },
  { source: "电邮", replacement: "邮箱", reason: "Mainland account wording" },
  { source: "账户", replacement: "账号", reason: "Mainland account wording" },
  { source: "用户名称", replacement: "用户名", reason: "Mainland account wording" },
  { source: "连系", replacement: "联系", reason: "Mainland wording" },
  { source: "登入", replacement: "登录", reason: "Mainland account wording" },
  { source: "甚么", replacement: "什么", reason: "Mainland wording" },
  { source: "搜寻", replacement: "搜索", reason: "Mainland UI wording" },
  { source: "待复", replacement: "待回复", reason: "Mainland teacher inbox wording" },
  { source: "回馈", replacement: "反馈", reason: "Mainland UI wording" },
  { source: "伫列", replacement: "队列", reason: "Mainland UI queue wording" },
  { source: "拖曳", replacement: "拖动", reason: "Mainland interaction wording" },
  { source: "滑杆", replacement: "滑块", reason: "Mainland interaction wording" },
  { source: "私隐", replacement: "隐私", reason: "Mainland privacy wording" },
  { source: "适性", replacement: "自适应", reason: "Mainland adaptive-learning wording" },
  { source: "十进位", replacement: "十进制", reason: "Mainland math terminology" },
  { source: "位值", replacement: "数位", reason: "Mainland primary math terminology" },
  { source: "周界", replacement: "周长", reason: "Mainland math terminology" },
  { source: "棒形", replacement: "条形", reason: "Mainland chart terminology" },
  { source: "二次函数即时图像", replacement: "二次函数动态图象", reason: "Mainland math graph terminology" },
  { source: "常态分布", replacement: "正态分布", reason: "Mainland statistics terminology" },
  { source: "函数图像", replacement: "函数图象", reason: "Mainland math graph terminology" },
  { source: "图像探索器", replacement: "图象探索器", reason: "Mainland math graph terminology" }
] as const;

export function traditionalToSimplified(text: string) {
  return Array.from(text).map((char) => traditionalToSimplifiedMap[char] ?? char).join("");
}

export function applyPrcSimplifiedGlossary(text: string) {
  return prcSimplifiedPhraseRules.reduce(
    (current, rule) => current.split(rule.source).join(rule.replacement),
    text
  );
}

export function toPrcSimplifiedText(text: string) {
  return applyPrcSimplifiedGlossary(traditionalToSimplified(text));
}

export function simplifyChineseText(text: string, language: Language) {
  return language === "zh-Hans" ? toPrcSimplifiedText(text) : text;
}

export function isValidLanguage(value: unknown): value is Language {
  return languageValues.includes(value as Language);
}

export function isChineseLanguage(language: Language) {
  return language === "zh" || language === "zh-Hans";
}

export function localeForLanguage(language: Language) {
  if (language === "zh") return "zh-Hant-HK";
  if (language === "zh-Hans") return "zh-Hans-CN";
  return "en-HK";
}

export function textForLanguage(value: LocalizedText, language: Language) {
  if (language === "en") return value.en;
  if (language === "zh-Hans" && value.zhHans) return value.zhHans;
  return simplifyChineseText(value.zh, language);
}

export const gradeLabels = Object.fromEntries(grades.map((grade) => [grade.id, grade.name])) as Record<GradeId, LocalizedText>;

export const compactGradeLabels = Object.fromEntries(
  grades.map((grade) => [grade.id, { en: grade.id, zh: grade.name.zh, zhHans: grade.name.zhHans }])
) as Record<GradeId, LocalizedText>;

const unitedStatesGradeNumberById: Record<GradeId, number | null> = {
  K: null,
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
  P6: 6,
  S1: 7,
  S2: 8,
  S3: 9,
  S4: 10,
  S5: 11,
  S6: 12
};

export function formatUnitedStatesGradeLabel(grade: GradeId, language: Language, compact = false) {
  const gradeNumber = unitedStatesGradeNumberById[grade];
  const label: LocalizedText =
    gradeNumber === null
      ? compact
        ? { en: "K", zh: "K", zhHans: "K" }
        : { en: "Kindergarten", zh: "Kindergarten", zhHans: "Kindergarten" }
      : compact
        ? { en: `G${gradeNumber}`, zh: `G${gradeNumber}`, zhHans: `G${gradeNumber}` }
        : { en: `Grade ${gradeNumber}`, zh: `${gradeNumber} 年級`, zhHans: `${gradeNumber} 年级` };

  return textForLanguage(label, language);
}

function isUnitedStatesCurriculumTrack(curriculumTrack: CurriculumTrack) {
  return curriculumTrack === "US_CA_MATH" || curriculumTrack === "US_NC_MATH" || curriculumTrack === "US_AR_MATH" || curriculumTrack === "US_FL_MATH";
}

const firstGrade = grades[0];
const lastGrade = grades[grades.length - 1];

export const gradeRangeLabels: LocalizedText = {
  en: `${firstGrade.id}-${lastGrade.id}`,
  zh: `${firstGrade.name.zh}至${lastGrade.name.zh}`,
  zhHans: `${firstGrade.name.zhHans}至${lastGrade.name.zhHans}`
};

export const expandedGradeRangeLabels: LocalizedText = {
  en: `${firstGrade.name.en} to ${lastGrade.name.en}`,
  zh: `${firstGrade.name.zh}至${lastGrade.name.zh}`,
  zhHans: `${firstGrade.name.zhHans}至${lastGrade.name.zhHans}`
};

export const difficultyLabels: Record<Difficulty, LocalizedText> = {
  Low: { en: "Low", zh: "低", zhHans: "低" },
  Medium: { en: "Medium", zh: "中", zhHans: "中" },
  High: { en: "High", zh: "高", zhHans: "高" }
};

export const demoLearnerName: LocalizedText = {
  en: "HK Student Peter",
  zh: "彼得同學",
  zhHans: "彼得同学"
};

export const dayLabels: Record<string, LocalizedText> = {
  Mon: { en: "Mon", zh: "一" },
  Tue: { en: "Tue", zh: "二" },
  Wed: { en: "Wed", zh: "三" },
  Thu: { en: "Thu", zh: "四" },
  Fri: { en: "Fri", zh: "五" },
  Sat: { en: "Sat", zh: "六" },
  Sun: { en: "Sun", zh: "日" }
};

export function formatGradeLabel(grade: GradeId, language: Language, compact = false) {
  return textForLanguage((compact ? compactGradeLabels : gradeLabels)[grade], language);
}

const mainlandGradeLabels: Partial<Record<GradeId, LocalizedText>> = {
  P1: { en: "P1", zh: "小一", zhHans: "小一" },
  P2: { en: "P2", zh: "小二", zhHans: "小二" },
  P3: { en: "P3", zh: "小三", zhHans: "小三" },
  P4: { en: "P4", zh: "小四", zhHans: "小四" },
  P5: { en: "P5", zh: "小五", zhHans: "小五" },
  P6: { en: "P6", zh: "小六", zhHans: "小六" },
  S1: { en: "S1", zh: "初一", zhHans: "初一" },
  S2: { en: "S2", zh: "初二", zhHans: "初二" },
  S3: { en: "S3", zh: "初三", zhHans: "初三" },
  S4: { en: "S4", zh: "高一" },
  S5: { en: "S5", zh: "高二" },
  S6: { en: "S6", zh: "高三" }
};

export function formatGradeLabelForCurriculum(
  grade: GradeId,
  language: Language,
  curriculumTrack: CurriculumTrack,
  compact = false
) {
  if (curriculumTrack === "US_CA_MATH") return formatUnitedStatesGradeLabel(grade, "en", compact);
  if (isUnitedStatesCurriculumTrack(curriculumTrack)) return formatUnitedStatesGradeLabel(grade, language, compact);

  const label = curriculumTrack === "MAINLAND_PEP_HIGH" ? mainlandGradeLabels[grade] : undefined;
  return label ? textForLanguage(label, language) : formatGradeLabel(grade, language, compact);
}

export function formatGradeRange(language: Language, compact = false) {
  return textForLanguage(compact ? gradeRangeLabels : expandedGradeRangeLabels, language);
}

export function formatDifficultyLabel(difficulty: Difficulty, language: Language) {
  return textForLanguage(difficultyLabels[difficulty], language);
}

export function formatLearnerName(name: string, language: Language) {
  return name === demoLearnerName.en ? textForLanguage(demoLearnerName, language) : name;
}

export function formatDayLabel(day: string, language: Language) {
  const label = dayLabels[day];
  return label ? textForLanguage(label, language) : day;
}

export function formatTrendLabel(trend: string, language: Language) {
  if (language === "en") return trend;
  return textForLanguage({ en: trend, zh: trend.replace(" this week", " 本週") }, language);
}

export const dictionary = {
  nav: {
    home: { en: "Home", zh: "首頁" },
    dashboard: { en: "Dashboard", zh: "學生儀表板" },
    learningPath: { en: "Learning Path", zh: "學習路徑" },
    visualizationLab: { en: "Visualization Lab", zh: "視覺化實驗室" },
    practice: { en: "Practice Arena", zh: "練習場" },
    mistakes: { en: "Mistake Book", zh: "錯題集" },
    progress: { en: "Progress", zh: "學習進度" },
    login: { en: "Log In", zh: "登入" }
  },
	  common: {
    siteName: { en: "MAIS", zh: "MAIS" },
    siteSubtitle: { en: "Mathematics Adaptive Interactive System", zh: "Mathematics Adaptive Interactive System" },
    startLearning: { en: "Start Learning", zh: "開始學習" },
    exploreVisualizations: { en: "Explore Visualizations", zh: "探索視覺化" },
    selectedGrade: { en: "Selected grade", zh: "已選年級" },
    minutes: { en: "min", zh: "分鐘" },
    days: { en: "days", zh: "日" },
    lab: { en: "lab", zh: "個實驗" },
    labs: { en: "labs", zh: "個實驗" },
    mastery: { en: "mastery", zh: "掌握度" },
    selectedLearner: { en: "Selected learner", zh: "已選學生" },
    openLesson: { en: "Open lesson", zh: "開啟課節" },
    checkAnswer: { en: "Check Answer", zh: "檢查答案" },
    reset: { en: "Reset", zh: "重設" },
    completed: { en: "Completed", zh: "已完成" },
    inProgress: { en: "In progress", zh: "進行中" },
    notStarted: { en: "Not started", zh: "未開始" },
    difficulty: { en: "Difficulty", zh: "難度" },
    topic: { en: "Topic", zh: "課題" },
    grade: { en: "Grade", zh: "年級" },
    age: { en: "Age", zh: "年齡" },
	    all: { en: "All", zh: "全部" },
	    overall: { en: "overall", zh: "總體" },
	    viewRoadmap: { en: "View roadmap", zh: "查看路線圖" }
	  },
	  practice: {
	    loginRequired: {
	      en: "Log in before checking answers so your attempts, progress, and mistake book stay private to your account.",
	      zh: "請先登入再檢查答案，作答紀錄、進度和錯題集才會儲存在你的帳戶。"
	    },
	    loginAction: { en: "Log in to check answers", zh: "登入後檢查答案" },
	    checking: { en: "Checking...", zh: "正在檢查..." },
	    loading: { en: "Loading questions...", zh: "正在載入題目..." },
	    noMatchTitle: { en: "No questions match these filters yet.", zh: "暫時沒有符合篩選條件的題目。" },
	    noMatchDesc: { en: "Add more server-side question records to expand coverage.", zh: "新增更多伺服器題庫記錄以擴充覆蓋範圍。" },
	    yourAnswer: { en: "Your answer", zh: "你的答案" },
	    answerPlaceholder: { en: "e.g. 5x", zh: "例如：5x" },
	    correct: { en: "Correct - nice reasoning.", zh: "正確 - 推理清晰。" },
	    notYet: { en: "Not yet - answer:", zh: "未正確 - 答案：" },
	    savedMistake: { en: "Saved to Mistake Book.", zh: "已儲存到錯題集。" },
	    askTutor: { en: "Ask AI Tutor", zh: "詢問 AI Tutor", zhHans: "询问 AI Tutor" }
	  },
	  mistakes: {
    title: { en: "Mistake Book", zh: "錯題集" },
    desc: { en: "Review saved wrong answers, retry questions, and mark mastered items.", zh: "重溫已儲存的錯題，重新作答並標記已掌握項目。" },
    eyebrow: { en: "Personal review", zh: "個人重溫" },
    wrongItems: { en: "wrong-answer records", zh: "條錯題記錄" },
    activeItems: { en: "active review", zh: "待重溫" },
    masteredItems: { en: "mastered", zh: "已掌握" },
    lastAnswer: { en: "Last answer", zh: "上次答案" },
    correctAnswer: { en: "Correct answer", zh: "正確答案" },
    wrongAttempts: { en: "Wrong attempts", zh: "錯誤次數" },
    lastAttempt: { en: "Last attempt", zh: "最近作答" },
    markMastered: { en: "Mark mastered", zh: "標記已掌握" },
    remove: { en: "Remove", zh: "移除" },
	    clear: { en: "Clear all", zh: "清空錯題集" },
	    loading: { en: "Loading mistakes...", zh: "正在載入錯題..." },
    practiceMore: { en: "Go to Practice Arena", zh: "前往練習場" },
    reviewSaved: { en: "Review saved mistakes", zh: "重溫已儲存錯題" },
    emptyTitle: { en: "No wrong answers saved yet.", zh: "暫時未有錯題記錄。" },
    emptyDesc: { en: "Wrong answers from the Practice Arena will be saved here automatically.", zh: "在練習場答錯的題目會自動儲存在這裡。" },
    retryHint: { en: "Retry this question in Practice Arena to turn it into mastered.", zh: "到練習場重新作答，答對後可轉為已掌握。" }
  },
  login: {
    title: { en: "Log in", zh: "登入", zhHans: "登录" },
    username: { en: "Email or username", zh: "電郵或用戶名稱", zhHans: "邮箱或用户名" },
    password: { en: "Password", zh: "密碼" },
    gradeChoice: { en: "Study grade", zh: "學習年級" },
	    submit: { en: "Log In", zh: "登入" },
	    signingIn: { en: "Signing in…", zh: "正在登入…", zhHans: "正在登录…" },
    continue: { en: "Continue to dashboard", zh: "前往學生儀表板" },
    logout: { en: "Log out", zh: "登出" },
    signedIn: { en: "Signed in as", zh: "已登入" },
    demoAccount: {
      en: "MAIS is protected by registered intellectual property rights under the laws of the United States and China. Any unauthorized use is strictly prohibited, including but not limited to copying its features or replicating its user interface.\nCalifornia Math Grade 1 student (Student Shirleen / 12345)\nCalifornia Math Grade 1 teacher (Teacher Scott / 12345)\nMainland PEP S4 student (Student Peter / 12345)\nMainland PEP S4 teacher (Teacher Phoebe / 12345)\nHong Kong DSE UP S4 student (HK Student Peter / 12345)\nHong Kong DSE UP S4 teacher (HK Teacher Chan / 12345)",
      zh: "根據美國和中國法律，MAIS 受已註冊知識產權保護。嚴禁任何未經授權的使用，包括但不限於複製其功能或仿製其用戶介面。\n加州數學 Grade 1 學生（Student Shirleen / 12345）\n加州數學 Grade 1 教師（Teacher Scott / 12345）\n中國內地人教版 S4 學生（Student Peter / 12345）\n中國內地人教版 S4 教師（Teacher Phoebe / 12345）\n中國香港 DSE UP S4 學生（HK Student Peter / 12345）\n中國香港 DSE UP S4 教師（HK Teacher Chan / 12345）",
      zhHans: "根据美国和中国法律，MAIS 受已注册知识产权保护。严禁任何未经授权的使用，包括但不限于复制其功能或仿制其用户界面。\n加州数学 Grade 1 学生（Student Shirleen / 12345）\n加州数学 Grade 1 教师（Teacher Scott / 12345）\n中国大陆人教版 S4 学生（Student Peter / 12345）\n中国大陆人教版 S4 教师（Teacher Phoebe / 12345）\n中国香港 DSE UP S4 学生（HK Student Peter / 12345）\n中国香港 DSE UP S4 教师（HK Teacher Chan / 12345）"
    },
	    invalid: { en: "Check your email/username and password.", zh: "請檢查電郵或用戶名稱和密碼。", zhHans: "请检查邮箱或用户名和密码。" }
	  },
	  lesson: {
	    label: { en: "Lesson", zh: "課節" },
	    notFoundTitle: { en: "Lesson not found", zh: "找不到課節" },
	    notFoundDesc: { en: "This lesson slug is not available in the backend lesson table.", zh: "後端課節資料表沒有這個課節代碼。" },
	    backToRoadmap: { en: "Back to roadmap", zh: "返回學習路線圖" },
	    openFullLab: { en: "Open full lab", zh: "開啟完整實驗室" },
	    difficultyLabel: { en: "Difficulty", zh: "難度" },
	    estimatedTime: { en: "Estimated time", zh: "預計時間" },
	    mastery: { en: "Mastery", zh: "掌握度" },
	    checklist: { en: "Lesson checklist", zh: "課節清單" },
	    markComplete: { en: "Mark lesson complete", zh: "標記課節完成" },
	    visualizationPanel: { en: "Interactive visualization panel", zh: "互動視覺化面板" },
	    noPractice: { en: "No linked practice question yet.", zh: "暫時未連結練習題。" },
	    nextSteps: { en: "Next steps", zh: "下一步" },
	    fallbackReview: { en: "Review your latest attempts before moving on.", zh: "進入下一課前先重溫最近作答。" },
	    fallbackRoadmap: { en: "Open the roadmap to see the next unlocked topic.", zh: "打開學習路線圖查看下一個解鎖課題。" }
	  },
	  aiTutor: {
	    button: { en: "AI Tutor", zh: "AI Tutor", zhHans: "AI Tutor" },
	    ask: { en: "Ask AI Tutor", zh: "詢問 AI Tutor", zhHans: "询问 AI Tutor" },
	    close: { en: "Close AI Tutor", zh: "關閉 AI Tutor", zhHans: "关闭 AI Tutor" },
	    student: { en: "Student", zh: "學生" },
	    placeholder: { en: "Ask for a hint, explanation, feedback, or encouragement...", zh: "輸入提示、解釋、回饋或鼓勵請求..." },
	    thinking: { en: "AI Tutor is thinking...", zh: "AI Tutor 正在思考...", zhHans: "AI Tutor 正在思考..." },
	    liveMode: { en: "Live mode uses the secure server API when DEEPSEEK_API_KEY is set.", zh: "設定 DeepSeek 伺服器金鑰後會使用安全伺服器。" },
	    setupChecking: { en: "Checking AI Tutor setup...", zh: "正在檢查 AI Tutor 設定...", zhHans: "正在检查 AI Tutor 设置..." },
	    liveReady: { en: "AI Tutor ready", zh: "AI Tutor 已就緒", zhHans: "AI Tutor 已就绪" },
	    localHelperMode: { en: "Local helper mode", zh: "本機輔助模式" },
	    send: { en: "Send", zh: "送出" },
	    sending: { en: "Sending...", zh: "正在送出..." },
	    unavailablePrefix: { en: "I could not reach AI Tutor yet", zh: "暫時未能連接 AI Tutor", zhHans: "暂时未能连接 AI Tutor" },
	    fallbackHint: { en: "Here is a local fallback hint for now:", zh: "這裡先提供本機提示：" }
	  },
	  visualization: {
	    eyebrow: { en: "Adjust · Drag · Simulate", zh: "調整 · 拖曳 · 模擬" },
	    directoryEyebrow: { en: "Grade-first visual directory", zh: "按年級瀏覽視覺化" },
	    directoryTitle: { en: "Roadmap visualizations by P1-S6", zh: "小一至中六路線圖視覺化" },
	    directoryDesc: {
	      en: "Start with the full topic map: every grade is grouped into its own route, with topic visual cards and station-level concept clusters.",
	      zh: "先從完整課題地圖開始：每個年級都有自己的路線，並配有課題視覺卡和概念站點。"
	    },
	    deepDiveEyebrow: { en: "Full interactive labs by grade", zh: "按年級排列的完整互動實驗" },
	    deepDiveTitle: { en: "Deep-dive modules grouped by category", zh: "按類別整理的深入模組" },
	    deepDiveDesc: {
	      en: "Use these larger lab panels when a topic needs sliders, dragging, graph reading, or repeated simulations beyond the roadmap preview cards.",
	      zh: "當課題需要滑桿、拖曳、讀圖或重複模擬時，可使用這些比路線圖預覽卡更完整的實驗面板。"
	    },
	    seniorCoverageTitle: { en: "P1-S6 coverage", zh: "小一至中六覆蓋" },
	    seniorCoverageDesc: {
	      en: "Primary labs now cover number lines, place value, arrays, fraction bars, area models, volume, percentages, and ratio.\n\nSecondary labs continue through functions, trigonometry, calculus, and statistics.",
	      zh: "小學實驗現已涵蓋數線、位值、陣列、分數條、面積模型、體積、百分數和比例；中學實驗繼續延伸至函數、三角、微積分和統計。"
	    },
	    interactiveModule: { en: "Interactive module", zh: "互動模組", zhHans: "互动模块" },
	    markExplored: { en: "Mark explored", zh: "標記已探索", zhHans: "标记已探索" }
	  },
	  home: {
    eyebrow: { en: "Mathematics Adaptive Interactive System", zh: "數學適性互動系統" },
    brand: { en: "MAIS", zh: "MAIS" },
    headline: { en: "Personalized interactive math learning", zh: "小一至中六互動數學學習平台", zhHans: "小学一年级至高三的自适应互动数学学习平台" },
    subhead: { en: "A personalized platform for primary and secondary mathematics, featuring adaptive pathways, concept visualization, instant-feedback practice, learning analytics, and gamification.", zh: "面向小一至中六數學，用可視化工具理解概念，透過即時回饋練習鞏固，並在同一個學習空間追蹤進度。", zhHans: "面向小学一年级至高三数学，用可视化工具理解概念，透过即时反馈练习巩固，并在同一个学习空间追踪进度。" },
    gradeSelectorEyebrow: { en: "Grade selector", zh: "選擇年級" },
    gradeSelectorTitle: { en: "Choose your starting point", zh: "選擇學習起點" },
    gradeSelectorText: { en: "Set a grade once, then the dashboard, topics, and practice questions adapt to it.", zh: "選定年級後，儀表板、課題與練習題會同步更新。" },
    stats: {
      grades: { en: "Grades", zh: "年級" },
      labs: { en: "Visualization labs", zh: "互動實驗" },
      questions: { en: "Practice questions", zh: "道練習題" }
    },
    featureTitle: { en: "Interactive learning that makes abstract ideas visible", zh: "讓抽象概念可視化的互動學習" },
    featureText: { en: "Visualization labs connect formulas, diagrams, and exam-style reasoning so students can explore concepts and see how mathematics works.", zh: "可視化實驗把公式、圖像與考試思路連起來，幫助學生探索概念，看見數學如何運作。" },
    features: {
      graphs: {
        title: { en: "Interactive Graphs", zh: "互動圖像" },
        body: { en: "Change parameters and watch equations become shapes.", zh: "調整參數，觀察方程如何變成圖形。" }
      },
      geometry: {
        title: { en: "Geometry Explorer", zh: "幾何探索器" },
        body: { en: "Drag points, compare angles, and make theorem patterns visible.", zh: "拖曳點、比較角度，讓定理規律變得可見。" }
      },
      practice: {
        title: { en: "Step-by-step Practice", zh: "逐步練習" },
        body: { en: "Try focused questions with instant feedback.", zh: "完成精簡題目，立即查看回饋。" }
      },
      progress: {
        title: { en: "Progress Tracking", zh: "學習進度" },
        body: { en: "See mastery, accuracy, and weekly learning rhythm.", zh: "查看掌握度、準確率與每週學習節奏。" }
      },
      readiness: {
        title: { en: "Exam Readiness", zh: "應試準備" },
        body: { en: "Build habits that support college entrance exams", zh: "建立適合高中溫習的學習習慣。" }
      }
    },
    ctaEyebrow: { en: "Ready for class or self-study", zh: "適合課堂與自學" },
    ctaTitle: { en: "Start with visuals, then practise with feedback.", zh: "先看懂，再練習，再追蹤進度。" },
    ctaText: { en: "Choose a grade, open a visualization, and move into practice when the concept is clear.", zh: "先選擇年級，打開視覺化工具理解概念，再進入練習鞏固學習。" }
  },
		  footer: {
				    description: { en: "A math AI system for K-12 math.", zh: "為小一至中六數學而設的互動學習空間。", zhHans: "为小学一年级至高三数学而设的互动学习空间。" },
				    developerCredit: { en: "Developed by Dr. Peter HU Dongpin, an Educational Researcher and Application Developer.", zh: "由教育研究員及應用程式開發者胡冬品博士開發。" },
			    email: { en: "hudongpin@126.com", zh: "hudongpin@126.com" },
			    personalWebsite: { en: "hudongpin.com", zh: "hudongpin.com" },
			    pedaNova: { en: "PedaNova", zh: "培達新知", zhHans: "培达新知" },
			    legalHeading: { en: "Legal and accessibility", zh: "法律與無障礙", zhHans: "法律与无障碍" },
			    privacy: { en: "Privacy Policy", zh: "私隱政策", zhHans: "隐私政策" },
			    terms: { en: "Terms of Service", zh: "服務條款", zhHans: "服务条款" },
			    subprocessors: { en: "Subprocessors", zh: "資料處理商", zhHans: "数据处理方" },
			    accessibility: { en: "Accessibility", zh: "無障礙聲明", zhHans: "无障碍声明" },
			    deleteAccount: { en: "Delete my account", zh: "刪除我的帳戶", zhHans: "删除我的账户" }
		  },
	  dashboard: {
	    welcome: { en: "Welcome back, Explorer", zh: "歡迎回來，數學探索者" },
	    summary: { en: "Push the Galaxy button and we will start to learn.", zh: "按下 Galaxy 按鈕，我們就開始學習。", zhHans: "点击 Galaxy 按钮，我们就开始学习。" },
	    nextLesson: { en: "Recommended next lesson", zh: "建議下一課" },
	    recent: { en: "Recently viewed", zh: "最近瀏覽" },
	    gradeTopics: { en: "Topics for your grade", zh: "你的年級課題" },
	    streak: { en: "Learning streak", zh: "連續學習" },
	    progressOverview: { en: "Progress overview", zh: "進度總覽" },
	    loading: { en: "Loading dashboard data...", zh: "正在載入儀表板資料..." }
	  },
  pages: {
		    learningPathTitle: { en: "Learning Path", zh: "學習路徑" },
	    learningPathDesc: { en: "A P1-S6 roadmap from primary number sense to senior secondary exam readiness.", zh: "由小學數感到高中應試能力的小一至中六路線圖。" },
	    learningPathEyebrow: { en: "P1-S6 roadmap", zh: "小一至中六路線圖" },
	    visualizationTitle: { en: "Visualization Lab", zh: "視覺化實驗室" },
    visualizationDesc: { en: "Adjust, drag, simulate, and observe mathematical patterns in real time.", zh: "調整、拖曳、模擬並即時觀察數學規律。" },
    practiceEyebrow: { en: "Instant feedback", zh: "即時回饋" },
	    practiceTitle: { en: "Practice Arena", zh: "練習場" },
    practiceDesc: { en: "Try personalized practice questions with instant feedback.", zh: "使用可重用題庫資料，進行即時回饋的短練習。" },
	    progressTitle: { en: "Progress", zh: "學習進度" },
    progressDesc: { en: "Live progress from attempts, lesson completion, topic mastery, and learning activity.", zh: "由作答、課節完成、課題掌握度和學習活動生成即時進度。" }
  }
} as const;

export type Dictionary = typeof dictionary;
