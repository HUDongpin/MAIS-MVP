import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const batchDir = path.join(__dirname, "batches");
const outputDir = path.join(__dirname, "codex-qa-from-batch-061");
const reportJson = path.join(outputDir, "codex-qa-adjudication.json");
const reportCsv = path.join(outputDir, "codex-qa-adjudication.csv");
const reportMd = path.join(outputDir, "codex-qa-adjudication.md");

const startQaBatch = 61;
const qaBatchSize = 12;

const adjudications = [
  {
    id: "pep-junior-v3-s2-k09-mc-024",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "题目是七年级绝对值比较，和 S2 一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "对于一次函数 y=2x-3，当 x 分别取 -1，0，2，4 时，函数值最大的是哪一个 x 对应的函数值？",
      optionsZhHans: ["x=-1", "x=0", "x=2", "x=4"],
      answer: "x=4",
      acceptedAnswers: ["x=4", "4"],
      explanationZhHans: "分别代入得：x=-1 时 y=-5，x=0 时 y=-3，x=2 时 y=1，x=4 时 y=5。最大函数值是5，对应 x=4。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-026",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为分式化简，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "某网约车起步价10元，超过3 km后每增加1 km收费2元。若行驶里程为 x km（x>3），车费 y 元与 x 的关系式是？",
      optionsZhHans: ["y=2x+4", "y=2x+10", "y=3x+2", "y=10x+2"],
      answer: "y=2x+4",
      acceptedAnswers: ["y=2x+4", "y = 2x + 4"],
      explanationZhHans: "超过3 km后的收费为2(x-3)元，总车费 y=10+2(x-3)=2x+4。因此关系式是 y=2x+4。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-027",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为等腰三角形性质，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "一次函数 y=kx+b 的图象经过点(0,2)和(3,8)，则 k 的值是？",
      optionsZhHans: ["1", "2", "3", "6"],
      answer: "2",
      acceptedAnswers: ["2"],
      explanationZhHans: "一次函数的斜率 k=(8-2)/(3-0)=6/3=2，所以 k 的值是2。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-028",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为勾股定理，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "一组数据为 6，8，10，10，12，则这组数据的众数是？",
      optionsZhHans: ["8", "10", "11", "12"],
      answer: "10",
      acceptedAnswers: ["10"],
      explanationZhHans: "众数是一组数据中出现次数最多的数。10出现2次，其他数各出现1次，所以众数是10。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-029",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为坐标平移，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "对于一次函数 y=-x+5，下列说法正确的是？",
      optionsZhHans: ["y随x的增大而增大", "y随x的增大而减小", "图象经过原点", "函数值恒为5"],
      answer: "y随x的增大而减小",
      acceptedAnswers: ["y随x的增大而减小"],
      explanationZhHans: "一次函数 y=-x+5 的一次项系数为 -1，小于0，所以 y随x的增大而减小。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-031",
    qaBatch: 61,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["copy_risk", "template_repetition"],
    rationale: "原题与同批次前题高度重复，需要换成新的线性应用场景。",
    question: {
      promptZhHans: "某蓄水池当前有水120 m³，每小时排水8 m³。若 t 小时后剩余水量为 y m³，则 y=120-8t。当剩余水量为72 m³时，t 的值是？",
      optionsZhHans: ["4", "6", "8", "10"],
      answer: "6",
      acceptedAnswers: ["6", "6小时"],
      explanationZhHans: "把 y=72 代入 y=120-8t，得72=120-8t，8t=48，t=6。因此 t 的值是6。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-032",
    qaBatch: 62,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["ambiguous_mc"],
    rationale: "原选项中 28 和 32 都会导致众数不唯一，单选题不唯一。",
    question: {
      promptZhHans: "某校八年级5个班参加植树活动，各班植树棵数分别为：30，32，28，30，x。已知这组数据的众数只有30，则 x 的值不可能是以下哪个数？",
      optionsZhHans: ["28", "30", "34", "36"],
      answer: "28",
      acceptedAnswers: ["28"],
      explanationZhHans: "已有数据中30出现2次，32和28各出现1次。若x=28，则28也出现2次，众数不是只有30；若x=30，30出现3次；若x=34或36，30仍是唯一出现2次的数。所以 x 的值不可能是28。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-mc-033",
    qaBatch: 62,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "Codex复核认为不等式解法和答案均正确，DeepSeek自我修正后应判为误报。"
  },
  {
    id: "pep-junior-v3-s2-k09-fi-028",
    qaBatch: 64,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为二次根式化简，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "一次函数 y=-2x+7 中，当 x=3 时，y 的值为____。",
      optionsZhHans: [],
      answer: "1",
      acceptedAnswers: ["1"],
      explanationZhHans: "把 x=3 代入 y=-2x+7，得 y=-2×3+7=1。因此 y 的值为1。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-sa-002",
    qaBatch: 65,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["answer_mismatch", "math_error"],
    rationale: "答案写甲班更稳定，但方差计算说明乙班更稳定。",
    question: {
      promptZhHans: "某校八年级两个班各10名学生的数学测验成绩（满分100分）如下：\n甲班：78, 85, 92, 67, 88, 75, 90, 83, 79, 81\n乙班：82, 86, 91, 73, 89, 80, 94, 77, 84, 88\n分别计算两个班的平均分，并说明哪个班的成绩更稳定。",
      optionsZhHans: [],
      answer: "甲班平均分81.8，乙班平均分84.4，乙班更稳定",
      acceptedAnswers: ["甲班平均分81.8，乙班平均分84.4，乙班更稳定", "甲班81.8，乙班84.4，乙班稳定", "甲班81.8分，乙班84.4分，乙班更稳定"],
      explanationZhHans: "甲班总分为818，平均分为81.8；乙班总分为844，平均分为84.4。甲班方差为50.96，乙班方差为38.24。乙班方差较小，成绩波动更小，所以乙班更稳定。故答案为甲班平均分81.8，乙班平均分84.4，乙班更稳定。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-sa-016",
    qaBatch: 66,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["grade_mismatch"],
    rationale: "原题为二次根式化简，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "某打印店有两种收费方案：方案甲收取20元服务费，每张4元；方案乙不收服务费，每张6元。设打印 x 张时两种方案费用分别为 y甲、y乙。\n（1）写出 y甲、y乙 关于 x 的关系式；\n（2）当打印多少张时两种方案费用相同；\n（3）打印15张时选择哪种方案更省钱？",
      optionsZhHans: [],
      answer: "（1）y甲=4x+20，y乙=6x；（2）10张；（3）方案甲更省钱",
      acceptedAnswers: ["（1）y甲=4x+20，y乙=6x；（2）10张；（3）方案甲更省钱", "y甲=4x+20，y乙=6x；10张；方案甲"],
      explanationZhHans: "方案甲每张4元并收20元服务费，所以 y甲=4x+20；方案乙每张6元，所以 y乙=6x。令4x+20=6x，得x=10。打印15张时，方案甲费用为4×15+20=80元，方案乙费用为6×15=90元，所以方案甲更省钱。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-sa-017",
    qaBatch: 66,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["grade_mismatch"],
    rationale: "原题为勾股定理逆定理，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "已知一次函数的图象经过点(2,7)和(5,16)。\n（1）求这个一次函数的解析式；\n（2）判断点(10,31)是否在该函数图象上，并说明理由。",
      optionsZhHans: [],
      answer: "解析式为 y=3x+1，点(10,31)在图象上",
      acceptedAnswers: ["解析式为 y=3x+1，点(10,31)在图象上", "y=3x+1，在图象上", "y = 3x + 1，点(10,31)在图象上"],
      explanationZhHans: "设一次函数为 y=kx+b。由两点可得 k=(16-7)/(5-2)=3。代入点(2,7)，得7=3×2+b，b=1，所以解析式为 y=3x+1。当x=10时，y=3×10+1=31，所以点(10,31)在图象上。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-sa-018",
    qaBatch: 66,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["grade_mismatch"],
    rationale: "原题涉及三角函数和平行四边形面积，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "某小组8名学生一次数学小测的成绩为：76，80，82，84，84，86，90，94。求这组数据的中位数和众数，并说明计算过程。",
      optionsZhHans: [],
      answer: "中位数为84，众数为84",
      acceptedAnswers: ["中位数为84，众数为84", "中位数84，众数84", "84，84"],
      explanationZhHans: "这组数据已经按从小到大排列，共8个数，中位数是第4个和第5个数的平均数，即(84+84)/2=84。84出现2次，次数最多，所以众数为84。因此中位数为84，众数为84。"
    }
  },
  {
    id: "pep-junior-v3-s2-k09-sa-027",
    qaBatch: 67,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["grade_mismatch"],
    rationale: "原题为平行四边形证明，和一次函数与数据分析单元不匹配。",
    question: {
      promptZhHans: "某水箱开始排水后，剩余水量 y（升）与排水时间 t（分钟）成一次函数关系。已知 t=2 时 y=84，t=5 时 y=60。\n（1）求 y 与 t 的函数关系式；\n（2）水箱排空需要多少分钟？",
      optionsZhHans: [],
      answer: "（1）y=-8t+100；（2）12.5分钟",
      acceptedAnswers: ["（1）y=-8t+100；（2）12.5分钟", "y=-8t+100，12.5分钟", "y = -8t + 100，12.5分钟"],
      explanationZhHans: "设 y=kt+b。由(2,84)和(5,60)得 k=(60-84)/(5-2)=-8。代入84=-8×2+b，得b=100，所以 y=-8t+100。排空时 y=0，得 -8t+100=0，t=12.5。因此水箱排空需要12.5分钟。"
    }
  },
  {
    id: "pep-junior-v3-s3-k10-mc-010",
    qaBatch: 68,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["ambiguous_mc", "grade_mismatch"],
    rationale: "原题有多个“不一定正确”的选项，且与 S3 K10 单元不匹配。",
    question: {
      promptZhHans: "一元二次方程 x²-5x+6=0 的两个根是？",
      optionsZhHans: ["x=1或x=6", "x=2或x=3", "x=-2或x=-3", "x=0或x=5"],
      answer: "x=2或x=3",
      acceptedAnswers: ["x=2或x=3", "2和3", "x=3或x=2"],
      explanationZhHans: "分解因式得 x²-5x+6=(x-2)(x-3)。令(x-2)(x-3)=0，得x=2或x=3。"
    }
  },
  {
    id: "pep-junior-v3-s3-k10-fi-016",
    qaBatch: 74,
    codexStatus: "repair",
    severity: "minor",
    issueTags: ["copy_risk"],
    rationale: "原题与同单元弦心距题重复风险较高，换成二次函数顶点题。",
    question: {
      promptZhHans: "二次函数 y=x²-4x+1 的图象顶点的横坐标是____。",
      optionsZhHans: [],
      answer: "2",
      acceptedAnswers: ["2"],
      explanationZhHans: "二次函数 y=x²-4x+1 中，a=1，b=-4，顶点横坐标为 -b/(2a)=4/2=2。因此顶点的横坐标是2。"
    }
  },
  {
    id: "pep-junior-v3-s3-k10-sa-030",
    qaBatch: 81,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["math_error", "answer_mismatch"],
    rationale: "Codex复核发现旋转证明结论不成立，需要替换为本单元可验证题。",
    question: {
      promptZhHans: "已知二次函数 y=x²-4x+3。\n（1）求图象的顶点坐标；\n（2）求图象与 x 轴的交点坐标。",
      optionsZhHans: [],
      answer: "顶点坐标为(2,-1)，与x轴的交点为(1,0)和(3,0)",
      acceptedAnswers: ["顶点坐标为(2,-1)，与x轴的交点为(1,0)和(3,0)", "顶点(2,-1)，交点(1,0)、(3,0)", "顶点坐标(2,-1)，x轴交点(1,0)和(3,0)"],
      explanationZhHans: "配方得 y=x²-4x+3=(x-2)²-1，所以顶点坐标为(2,-1)。令y=0，得x²-4x+3=0，即(x-1)(x-3)=0，解得x=1或x=3，因此与x轴的交点为(1,0)和(3,0)。"
    }
  },
  {
    id: "pep-junior-v3-s3-k10-sa-032",
    qaBatch: 81,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目答案与解析均为120°，旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k10-sa-036",
    qaBatch: 81,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目答案与解析均为3√2，旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k10-sa-066",
    qaBatch: 84,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目已为1760且方程检验正确，旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k11-mc-012",
    qaBatch: 85,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["ambiguous_mc", "missing_condition", "grade_mismatch"],
    rationale: "原三视图描述不够唯一，且与 K11 反比例函数、相似、锐角三角函数单元不匹配。",
    question: {
      promptZhHans: "在Rt△ABC中，∠C=90°，AC=3，BC=4，则 sinA 的值是（ ）",
      optionsZhHans: ["3/5", "4/5", "3/4", "5/4"],
      answer: "4/5",
      acceptedAnswers: ["4/5", "0.8"],
      explanationZhHans: "在Rt△ABC中，AB=√(3²+4²)=5。对于∠A，所对的直角边是BC=4，斜边是AB=5，所以 sinA=4/5。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-mc-013",
    qaBatch: 85,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["ambiguous_mc"],
    rationale: "原题未限定 k 的正负，面积只确定 |k|，选项 8 和 -8 均可能。",
    question: {
      promptZhHans: "在平面直角坐标系中，点A是反比例函数y=k/x（k>0，x>0）图象上一点，AB⊥x轴于点B，点C是y轴上一点，且△ABC的面积为4，则k的值为（ ）",
      optionsZhHans: ["4", "-4", "8", "-8"],
      answer: "8",
      acceptedAnswers: ["8"],
      explanationZhHans: "设A(a,k/a)，其中a>0且k>0，则B(a,0)，AB=k/a。点C在y轴上，C到直线AB的距离为a，所以△ABC面积=1/2×(k/a)×a=k/2。由k/2=4，得k=8。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-mc-024",
    qaBatch: 86,
    codexStatus: "repair",
    severity: "major",
    issueTags: ["math_error", "answer_mismatch", "missing_condition"],
    rationale: "原三视图题选项无正确答案且与 K11 单元不匹配。",
    question: {
      promptZhHans: "阳光下，一根竖直旗杆在水平地面上的影长为10 m，此时太阳光线与地面的夹角为45°。旗杆的高度是（ ）",
      optionsZhHans: ["5 m", "10 m", "10√2 m", "20 m"],
      answer: "10 m",
      acceptedAnswers: ["10 m", "10米", "10"],
      explanationZhHans: "旗杆、影子和太阳光线构成直角三角形。tan45°=旗杆高度/影长=1，所以旗杆高度=10×1=10 m。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-mc-030",
    qaBatch: 86,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "在当前表述下，俯视图为2×2满格且主视图每列最高2，最多8个小正方体成立；旧 DeepSeek fail 为误判。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-024",
    qaBatch: 91,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目已修复为15且解释正确，旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-030",
    qaBatch: 92,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前答案5和解释一致，底层2×2满格、左列最高2右列最高1时最少5个成立。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-036",
    qaBatch: 92,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["missing_condition", "ambiguous_mc"],
    rationale: "仅凭正面和左面视图不能唯一确定几何体表面积。",
    question: {
      promptZhHans: "在Rt△ABC中，∠C=90°，∠A的正切值为3/4。若∠A的邻边AC=8，则∠A的对边BC=____。",
      optionsZhHans: [],
      answer: "6",
      acceptedAnswers: ["6"],
      explanationZhHans: "tanA=BC/AC=3/4，且AC=8，所以BC/8=3/4，解得BC=6。因此∠A的对边BC=6。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-fi-044",
    qaBatch: 93,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["math_error", "answer_mismatch"],
    rationale: "AD/AB=3/7 与 AE/AC=4/9 不相等，不能证明相似。",
    question: {
      promptZhHans: "在△ABC中，点D、E分别在边AB、AC上，且AD=3，DB=6，AE=4，EC=8，则 AD/AB 与 AE/AC 的共同值为____。",
      optionsZhHans: [],
      answer: "1/3",
      acceptedAnswers: ["1/3", "三分之一"],
      explanationZhHans: "AB=AD+DB=3+6=9，AC=AE+EC=4+8=12，所以AD/AB=3/9=1/3，AE/AC=4/12=1/3。因此共同值为1/3。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-fi-049",
    qaBatch: 93,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前旋转和平移计算为(-2,-3)，答案与解释一致。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-054",
    qaBatch: 94,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前圆台侧面积为63π/5，公式和计算一致。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-064",
    qaBatch: 95,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目经过点(0,17)，a=5，a+b+c=2，答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-fi-066",
    qaBatch: 95,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前长方体正前方可见面积为5×3=15，答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-007",
    qaBatch: 95,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前一次函数过B(-1,-2)和(3,4)，解得m=1.5、n=-0.5、m+n=1，答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-013",
    qaBatch: 96,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["math_error", "missing_condition"],
    rationale: "原题中OA与x轴负半轴上的OB不可能垂直，条件矛盾。",
    question: {
      promptZhHans: "在平面直角坐标系中，点A(1,3)在反比例函数 y=k/x 的图象上。过点A作AB⊥x轴，垂足为B；过点A作AC⊥y轴，垂足为C。求k的值，并求矩形OBAC的面积。",
      optionsZhHans: [],
      answer: "k=3，矩形OBAC的面积为3",
      acceptedAnswers: ["k=3，矩形OBAC的面积为3", "k=3，面积为3", "3，3"],
      explanationZhHans: "点A(1,3)在反比例函数 y=k/x 上，所以k=1×3=3。点B为(1,0)，点C为(0,3)，矩形OBAC的两条邻边长分别为1和3，面积为1×3=3。因此k=3，矩形OBAC的面积为3。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-sa-015",
    qaBatch: 96,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题目为等腰三角形中线高线计算，答案√17正确；虽非强K11题，但不构成数学错误。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-016",
    qaBatch: 96,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前矩形周长方程解得P(1,6)或P(6,1)，答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-017",
    qaBatch: 96,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前方位角计算得PB=20海里，答案与解释一致。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-025",
    qaBatch: 97,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["math_error", "missing_condition"],
    rationale: "题面写C在y轴，但解答按C在x轴处理；若C在y轴，面积条件不成立。",
    question: {
      promptZhHans: "在平面直角坐标系中，反比例函数 y=4/x（x>0）的图象上有一点A，过A作AB⊥x轴于B。点C是x轴上一点，且△ABC的面积为6。若点A的横坐标为2，求点C的坐标。",
      optionsZhHans: [],
      answer: "C(8,0)或C(-4,0)",
      acceptedAnswers: ["C(8,0)或C(-4,0)", "(8,0)或(-4,0)", "C(-4,0)或C(8,0)"],
      explanationZhHans: "由A在y=4/x上，且横坐标为2，得A(2,2)，所以B(2,0)，AB=2。设C(c,0)，点C到直线AB的距离为|c-2|。△ABC的面积为1/2×2×|c-2|=|c-2|=6，解得c=8或c=-4。因此C(8,0)或C(-4,0)。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-sa-039",
    qaBatch: 98,
    codexStatus: "repair",
    severity: "blocker",
    issueTags: ["missing_condition"],
    rationale: "过P作x轴垂线不可能交竖直线段AB，应为交线段AC。",
    question: {
      promptZhHans: "在平面直角坐标系中，反比例函数 y=k/x（k≠0）的图象经过点 A(3,4)。过点 A 作 x 轴的垂线，垂足为 B，过点 A 作 y 轴的垂线，垂足为 C。连接 BC。点 P 是线段 BC 上一点（不与端点重合），过点 P 作 x 轴的垂线，交反比例函数图象于点 Q，交线段 AC 于点 R。设点 P 的横坐标为 m（0<m<3）。\n（1）求 k 的值；\n（2）用含 m 的代数式表示线段 QR 的长；\n（3）当 QR=1 时，求点 P 的坐标。",
      optionsZhHans: [],
      answer: "（1）k=12；（2）QR=12/m-4；（3）P的坐标为(12/5,4/5)",
      acceptedAnswers: ["（1）k=12；（2）QR=12/m-4；（3）P的坐标为(12/5,4/5)", "k=12；QR=12/m-4；P(12/5,4/5)", "（1）k = 12；（2）QR = 12/m - 4；（3）P 的坐标为 (12/5, 4/5)"],
      explanationZhHans: "（1）点A(3,4)在反比例函数上，得4=k/3，所以k=12。\n（2）B(3,0)，C(0,4)，直线BC的解析式为 y=-4/3x+4。点P横坐标为m，则P的纵坐标为 -4m/3+4。点Q在反比例函数上，纵坐标为12/m；点R在线段AC上，纵坐标为4。因为0<m<3，所以12/m>4，QR=12/m-4。\n（3）令12/m-4=1，得m=12/5。此时P的纵坐标为 -4/3×12/5+4=4/5，所以P的坐标为(12/5,4/5)。"
    }
  },
  {
    id: "pep-junior-v3-s3-k11-sa-042",
    qaBatch: 98,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前直线BC解析式为 y=-3/2x+3，答案与解释一致。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-044",
    qaBatch: 99,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题面已删除10米条件，12米解法成立；旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-045",
    qaBatch: 99,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题面已改为垂足坐标与反比例函数求参，答案正确；旧 DeepSeek fail 为修复前缓存。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-047",
    qaBatch: 99,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "Codex复核仰角测高计算正确，答案10√3+11.5成立。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-049",
    qaBatch: 99,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题面已改为求k与矩形面积，不再要求反比例函数经过y轴点，答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-057",
    qaBatch: 100,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "Codex按向量旋转复核，当前答案(-4,2)正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-059",
    qaBatch: 100,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前利息公式已明确百分数换算，48000元答案正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-062",
    qaBatch: 100,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前答案为旗杆12米、k=3，正切与反比例函数计算正确。"
  },
  {
    id: "pep-junior-v3-s3-k11-sa-067",
    qaBatch: 100,
    codexStatus: "pass",
    severity: "none",
    issueTags: [],
    rationale: "当前题面已删除矛盾的相似比条件，k=-6、m=-6正确。"
  }
];

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function appendNote(existing, note) {
  const parts = String(existing ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.includes(note)) parts.push(note);
  return parts.join("; ");
}

function batchFileNameForQuestionIndex(index) {
  return `batch-${String(Math.floor(index / 10) + 1).padStart(3, "0")}.json`;
}

function validateRepair(question, patch) {
  if (!patch.question) throw new Error(`missing repair question for ${patch.id}`);
  const q = patch.question;
  for (const field of ["promptZhHans", "answer", "explanationZhHans"]) {
    if (typeof q[field] !== "string" || !q[field].trim()) throw new Error(`${patch.id} missing ${field}`);
  }
  if (!Array.isArray(q.optionsZhHans)) throw new Error(`${patch.id} optionsZhHans must be array`);
  if (!Array.isArray(q.acceptedAnswers) || !q.acceptedAnswers.length) throw new Error(`${patch.id} missing acceptedAnswers`);
  if (question.type === "multiple-choice") {
    if (q.optionsZhHans.length !== 4) throw new Error(`${patch.id} MC must have 4 options`);
    if (new Set(q.optionsZhHans).size !== 4) throw new Error(`${patch.id} MC options duplicate`);
    if (q.optionsZhHans.filter((option) => option === q.answer).length !== 1) {
      throw new Error(`${patch.id} MC answer must match exactly one option`);
    }
  } else if (q.optionsZhHans.length) {
    throw new Error(`${patch.id} non-MC options must be empty`);
  }
}

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  console.warn(JSON.stringify({ event: "codex-qa-061-start", adjudications: adjudications.length }));
  const questions = readJsonl(questionsJsonl);
  const rowById = new Map(questions.map((question, index) => [question.id, { question, index }]));
  const repairItems = adjudications.filter((item) => item.codexStatus === "repair");
  for (const item of repairItems) {
    const found = rowById.get(item.id);
    if (!found) throw new Error(`missing question row for ${item.id}`);
    validateRepair(found.question, item);
  }

  const batchFiles = Array.from(
    new Set(repairItems.map((item) => batchFileNameForQuestionIndex(rowById.get(item.id).index)))
  ).sort();
  console.warn(JSON.stringify({ event: "codex-qa-061-apply-start", repairItems: repairItems.length, batchFiles: batchFiles.length }));
  let appliedRows = 0;
  for (const fileName of batchFiles) {
    console.warn(JSON.stringify({ event: "codex-qa-061-apply-batch", fileName }));
    const filePath = path.join(batchDir, fileName);
    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let changed = false;
    const nextQuestions = (record.questions ?? []).map((question) => {
      const item = repairItems.find((candidate) => candidate.id === question.id);
      if (!item) return question;
      changed = true;
      appliedRows += 1;
      return {
        ...question,
        promptZhHans: item.question.promptZhHans,
        optionsZhHans: item.question.optionsZhHans,
        answer: item.question.answer,
        acceptedAnswers: item.question.acceptedAnswers,
        explanationZhHans: item.question.explanationZhHans,
        mathQaStatus: "needs-review",
        reviewNotes: appendNote(question.reviewNotes, "codex-qa-from-batch-061:repair")
      };
    });
    if (changed) writeJson(filePath, { ...record, questions: nextQuestions });
  }

  const statusCounts = adjudications.reduce((counts, item) => {
    counts[item.codexStatus] = (counts[item.codexStatus] ?? 0) + 1;
    return counts;
  }, {});
  const severityCounts = adjudications.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
  const report = {
    generatedAt: new Date().toISOString(),
    scope: "mainland-pep-junior-v3-1200-codex-qa-from-deepseek-batch-061",
    startQaBatch,
    qaBatchSize,
    reviewedExistingNonPassRows: adjudications.length,
    repairedRows: repairItems.length,
    appliedRows,
    touchedGenerationBatchFiles: batchFiles.length,
    statusCounts,
    severityCounts,
    adjudications: adjudications.map((item) => ({
      id: item.id,
      qaBatch: item.qaBatch,
      codexStatus: item.codexStatus,
      severity: item.severity,
      issueTags: item.issueTags,
      rationale: item.rationale,
      repairedPromptZhHans: item.question?.promptZhHans ?? null,
      repairedAnswer: item.question?.answer ?? null
    }))
  };
  console.warn(JSON.stringify({ event: "codex-qa-061-write-report", appliedRows }));
  writeJson(reportJson, report);
  writeCsv(
    reportCsv,
    report.adjudications,
    ["qaBatch", "id", "codexStatus", "severity", "issueTags", "rationale", "repairedPromptZhHans", "repairedAnswer"]
  );
  fs.writeFileSync(
    reportMd,
    [
      "# Codex QA Adjudication From DeepSeek Batch 061",
      "",
      `- Generated at: ${report.generatedAt}`,
      `- Scope: QA batches ${startQaBatch}-100, using existing non-pass findings plus Codex adjudication on current v3 content`,
      `- Reviewed existing non-pass rows: ${report.reviewedExistingNonPassRows}`,
      `- Repaired rows: ${report.repairedRows}`,
      `- Applied rows: ${report.appliedRows}`,
      `- Touched generation batch files: ${report.touchedGenerationBatchFiles}`,
      `- Status counts: ${JSON.stringify(statusCounts)}`,
      `- Severity counts: ${JSON.stringify(severityCounts)}`,
      "",
      "This is a Codex takeover artifact. DeepSeek batch caches after batch 077 remain stale until a future full force rerun; this report records Codex adjudication against the current `questions.jsonl` content."
    ].join("\n")
  );
  console.log(JSON.stringify({ event: "codex-qa-from-batch-061-complete", ...report }, null, 2));
}

main();
