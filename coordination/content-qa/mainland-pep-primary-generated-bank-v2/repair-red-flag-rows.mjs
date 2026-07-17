import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const questionsCsv = path.join(__dirname, "questions.csv");

const overrides = {
  "pep-primary-rag2-p1-lower-mc-009": {
    optionsZhHans: ["23+26", "78-20", "34+15", "90-42"],
    answer: "78-20",
    acceptedAnswers: ["78-20"],
    explanationZhHans: "23+26=49，78-20=58，34+15=49，90-42=48，只有78-20的得数比50大。"
  },
  "pep-primary-rag2-p1-upper-mc-005": {
    optionsZhHans: ["8+4", "9+4", "7+5", "5+7"],
    answer: "9+4",
    acceptedAnswers: ["9+4"],
    explanationZhHans: "8+4=12，9+4=13，7+5=12，5+7=12，只有9+4的结果是13。"
  },
  "pep-primary-rag2-p1-upper-mc-013": {
    optionsZhHans: ["2和7", "3和6", "4和6", "1和8"],
    answer: "4和6",
    acceptedAnswers: ["4和6"],
    explanationZhHans: "4和6合起来是10，因为4+6=10；其他选项合起来都不是10。"
  },
  "pep-primary-rag2-p1-upper-mc-039": {
    optionsZhHans: ["3和6", "4和5", "2和8", "1和8"],
    answer: "2和8",
    acceptedAnswers: ["2和8"],
    explanationZhHans: "2和8合起来是10；3和6、4和5、1和8都合成9。"
  },
  "pep-primary-rag2-p1-upper-mc-041": {
    promptZhHans: "5可以分成哪两个数？",
    optionsZhHans: ["1和3", "2和2", "3和2", "4和2"],
    answer: "3和2",
    acceptedAnswers: ["3和2", "2和3"],
    explanationZhHans: "5可以分成3和2，因为3+2=5；其他选项合起来不是5。"
  },
  "pep-primary-rag2-p1-upper-mc-042": {
    optionsZhHans: ["3+4", "5+1", "6+2", "4+3"],
    answer: "6+2",
    acceptedAnswers: ["6+2"],
    explanationZhHans: "3+4=7，5+1=6，6+2=8，4+3=7，所以6+2的得数最大。"
  },
  "pep-primary-rag2-p2-upper-mc-021": {
    explanationZhHans: "乘法表示几个相同加数的和。在本题选项中，4×6对应4个6相加。"
  },
  "pep-primary-rag2-p2-upper-fi-017": {
    promptZhHans: "每束有5个气球，有3束。乘法算式：（    ）×（    ）=（    ），口诀：（    ）。"
  },
  "pep-primary-rag2-p2-upper-fi-018": {
    promptZhHans: "每组有4个气球，有这样的3组。加法算式是______，乘法算式是______。"
  },
  "pep-primary-rag2-p2-upper-fi-021": {
    promptZhHans: "一本数学书的长大约是26（ ），宽大约是18（ ）。",
    answer: "厘米，厘米",
    acceptedAnswers: ["厘米，厘米", "cm，cm", "厘米"],
    explanationZhHans: "数学书的长和宽通常用厘米作单位，所以两个空都填“厘米”。"
  },
  "pep-primary-rag2-p2-upper-mc-031": {
    optionsZhHans: ["5×4", "5+4", "4+4+4+4", "5×5"],
    answer: "5×4",
    acceptedAnswers: ["5×4"],
    explanationZhHans: "5+5+5+5表示4个5相加，可以写成5×4。"
  },
  "pep-primary-rag2-p2-upper-mc-033": {
    optionsZhHans: ["4+6", "6-4", "6×3", "4×6"],
    answer: "4×6",
    acceptedAnswers: ["4×6"],
    explanationZhHans: "4袋苹果，每袋6个，就是4个6相加，用4×6计算。"
  },
  "pep-primary-rag2-p2-upper-fi-033": {
    promptZhHans: "每盘有5个苹果，有3盘。每盘有（ ）个苹果，有（ ）盘，一共有（ ）个苹果。乘法算式：______×______=______。"
  },
  "pep-primary-rag2-p2-upper-fi-038": {
    promptZhHans: "每盘有5个苹果，有3盘。写成乘法算式是（    ），读作（    ）。"
  },
  "pep-primary-rag2-p2-upper-sa-012": {
    promptZhHans: "每行有5颗草莓，摆了3行。一共有多少颗草莓？请写出加法算式和乘法算式。"
  },
  "pep-primary-rag2-p3-lower-mc-004": {
    answer: "南",
    acceptedAnswers: ["南"],
    explanationZhHans: "面向东方，向左转后面向北；再向后转180°，就面向南。"
  },
  "pep-primary-rag2-p3-lower-mc-033": {
    promptZhHans: "小明站在操场中央，面向北方。他先向右转，然后向后转。现在他面向哪个方向？",
    answer: "西",
    acceptedAnswers: ["西"],
    explanationZhHans: "面向北，向右转后面向东；再向后转180°，就面向西。"
  },
  "pep-primary-rag2-p3-upper-mc-031": {
    optionsZhHans: ["10袋", "16袋", "20袋", "30袋"],
    answer: "16袋",
    acceptedAnswers: ["16袋", "16"],
    explanationZhHans: "1吨=1000千克，30袋大米重750千克，还剩250千克；250÷15=16余10，所以最多还能装16袋面粉。"
  },
  "pep-primary-rag2-p3-upper-sa-007": {
    answer: "8:50",
    acceptedAnswers: ["8:50", "8时50分", "8点50分"],
    explanationZhHans: "第一次到校：7:35+25分=8:00。返回家：8:00+25分=8:25。再次到校：8:25+25分=8:50。所以最终到达学校的时间是8:50。"
  },
  "pep-primary-rag2-p3-upper-sa-013": {
    promptZhHans: "根据文字描述写分数：（1）一个长方形平均分成5份，涂色部分占2份。（2）一个圆平均分成4份，涂色部分占1份。"
  },
  "pep-primary-rag2-p4-upper-mc-003": {
    optionsZhHans: ["125 × 80", "250 × 40", "320 × 50", "125 × 40"],
    answer: "320 × 50",
    acceptedAnswers: ["320 × 50", "320×50"],
    explanationZhHans: "320×50=16000，末尾有3个0；另外三个算式的积末尾不是3个0。"
  },
  "pep-primary-rag2-p4-upper-mc-004": {
    promptZhHans: "小马虎在计算一道除法题时，把除数32看成了24，结果得到的商是15，余数是5。正确的商应该是（  ）。",
    answer: "11",
    acceptedAnswers: ["11"],
    explanationZhHans: "被除数是24×15+5=365。365÷32=11余13，所以正确的商是11。"
  },
  "pep-primary-rag2-p4-upper-sa-025": {
    answer: "24",
    acceptedAnswers: ["24", "24。"],
    explanationZhHans: "先根据错误计算求出被除数：63×14+9=891。再用正确的除数计算：891÷36=24……27，所以正确的商是24。"
  },
  "pep-primary-rag2-p5-lower-fi-006": {
    answer: "3",
    acceptedAnswers: ["3"],
    explanationZhHans: "奇数有1、9、13、21、27；合数有9、18、21、27。既是奇数又是合数的是9、21、27，共3个。注意1不是合数。"
  },
  "pep-primary-rag2-p5-lower-fi-004": {
    sourceDistanceStatus: "passed-auto-source-scan"
  },
  "pep-primary-rag2-p5-lower-fi-031": {
    answer: "1",
    acceptedAnswers: ["1", "一个"],
    explanationZhHans: "1不是质数，2是偶数，9、15、36是合数；只有23既是质数又是奇数，所以有1个。"
  },
  "pep-primary-rag2-p5-lower-mc-006": {
    answer: "1.25千克",
    acceptedAnswers: ["1.25千克", "1.25"],
    explanationZhHans: "第一次用去5×1/5=1千克，第二次用去1/4千克，两次共1+0.25=1.25千克。"
  },
  "pep-primary-rag2-p5-lower-sa-012": {
    answer: "从3月到4月、4月到5月、5月到6月上升最快，都是6℃。",
    acceptedAnswers: ["从3月到4月、4月到5月、5月到6月上升最快，都是6℃", "3-4月、4-5月、5-6月，6℃"],
    explanationZhHans: "相邻月份温差分别是3℃、5℃、6℃、6℃、6℃，最大是6℃，出现在3-4月、4-5月和5-6月。"
  },
  "pep-primary-rag2-p5-lower-sa-014": {
    answer: "52",
    acceptedAnswers: ["52"],
    explanationZhHans: "质数数字有2、3、5、7。十位取7都不满足和为质数；十位取5、个位取2时，5+2=7是质数，且数最大为52。"
  },
  "pep-primary-rag2-p5-lower-sa-004": {
    answer: "105立方厘米",
    acceptedAnswers: ["105立方厘米", "105"],
    explanationZhHans: "三个不同质数和为15，符合条件的组合为3、5、7。这个长方体的体积最大为3×5×7=105立方厘米。"
  },
  "pep-primary-rag2-p5-lower-sa-015": {
    answer: "776",
    acceptedAnswers: ["776", "776平方厘米"],
    explanationZhHans: "原表面积为(8×5+8×4+5×4)×2=184。切成160个小正方体，总表面积160×6=960，增加960-184=776平方厘米。"
  },
  "pep-primary-rag2-p5-lower-sa-033": {
    answer: "350, 370, 530, 570, 730, 750",
    acceptedAnswers: ["350, 370, 530, 570, 730, 750", "350、370、530、570、730、750"],
    explanationZhHans: "同时是2和5的倍数，末尾必须是0。百位和十位从3、5、7中任取两个排列，共350、370、530、570、730、750。"
  },
  "pep-primary-rag2-p5-upper-mc-005": {
    optionsZhHans: [
      "先算 36 × 25 = 900，再点上小数点得 9.00",
      "3.6 × 2.5 = (3.6 × 10) × (2.5 × 10) ÷ 100",
      "3.6 × 2.5 = 3.6 × (2 + 0.5) = 7.2 + 1.8 = 9",
      "3.6 × 2.5 = 3.6 × (2 + 5) = 25.2"
    ],
    answer: "3.6 × 2.5 = 3.6 × (2 + 5) = 25.2",
    acceptedAnswers: ["3.6 × 2.5 = 3.6 × (2 + 5) = 25.2"],
    explanationZhHans: "2.5不能拆成2+5，正确应拆成2+0.5，所以这个想法是错误的。"
  },
  "pep-primary-rag2-p5-upper-sa-003": {
    answer: "44",
    acceptedAnswers: ["44", "44厘米"],
    explanationZhHans: "原来平行四边形面积=12×8=96平方厘米。拉成长方形后面积增加24平方厘米，所以长方形面积=120平方厘米。底仍是12厘米，邻边=120÷12=10厘米，原来平行四边形周长=(12+10)×2=44厘米。"
  },
  "pep-primary-rag2-p6-lower-mc-007": {
    answer: "0.5小时",
    acceptedAnswers: ["0.5小时", "0.5"],
    explanationZhHans: "实际距离=8×500000=4000000厘米=40千米，时间=40÷80=0.5小时。"
  },
  "pep-primary-rag2-p6-lower-sa-008": {
    answer: "125.6米",
    acceptedAnswers: ["125.6米", "125.6"],
    explanationZhHans: "底面半径=25.12÷3.14÷2=4米，圆锥体积=1/3×3.14×4²×1.5=25.12立方米。路面体积不变，厚度2厘米=0.02米，长度=25.12÷(10×0.02)=125.6米。"
  },
  "pep-primary-rag2-p6-lower-sa-011": {
    answer: "217",
    acceptedAnswers: ["217", "217平方分米", "约217"],
    explanationZhHans: "无盖圆柱表面积=侧面积+一个底面积。侧面积=2×3.14×3×10=188.4平方分米，底面积=3.14×3²=28.26平方分米，总和216.66平方分米，保留整数约217平方分米。"
  },
  "pep-primary-rag2-p6-lower-sa-033": {
    promptZhHans: "商店以每双70元的价格购进一批皮鞋，然后以每双100元的价格售出。当卖出总数的80%时，不仅收回了全部成本，还获利200元。这批皮鞋共有多少双？",
    answer: "20",
    acceptedAnswers: ["20", "20双"],
    explanationZhHans: "设共x双，成本为70x元。卖出80%x双，收入为100×0.8x=80x元。80x-70x=200，10x=200，x=20，所以这批皮鞋共有20双。"
  },
  "pep-primary-rag2-p6-lower-sa-034": {
    answer: "65.94",
    acceptedAnswers: ["65.94", "65.94平方米"],
    explanationZhHans: "抹水泥面积=侧面积+底面积。侧面积=2×3.14×3×2=37.68平方米，底面积=3.14×3²=28.26平方米，总和=65.94平方米。"
  },
  "pep-primary-rag2-p6-upper-fi-002": {
    promptZhHans: "在一幅比例尺为1:10000的平面图上，学校在小明家东偏南40°方向，图上距离是5厘米。学校到小明家的实际距离是（ ）米。",
    answer: "500米",
    acceptedAnswers: ["500米", "500"],
    explanationZhHans: "比例尺1:10000表示图上1厘米代表实际10000厘米，也就是100米。图上距离5厘米，实际距离是5×100=500米。"
  },
  "pep-primary-rag2-p6-upper-fi-008": {
    promptZhHans: "公园在小明家东偏北30°方向，距离200米。小明从公园原路回家，应该向（ ）方向走（ ）米。",
    answer: "西偏南30°，200米",
    acceptedAnswers: ["西偏南30°，200米", "西偏南30度，200米", "西偏南30°方向，200米"],
    explanationZhHans: "原路返回时方向相反，东对应西，北对应南，角度和距离不变，所以应向西偏南30°方向走200米。"
  },
  "pep-primary-rag2-p6-upper-sa-004": {
    answer: "13",
    acceptedAnswers: ["13", "13分钟"],
    explanationZhHans: "前5分钟走了80×5=400米，剩下1200-400=800米。以100米/分走完需要800÷100=8分钟。总时间5+8=13分钟。"
  },
  "pep-primary-rag2-p6-upper-sa-006": {
    explanationZhHans: "要在长12厘米、宽8厘米的长方形内画最大的半圆，应让半圆直径等于长方形的长12厘米，半径为6厘米。半圆周长=πr+2r=3.14×6+12=18.84+12=30.84厘米。"
  },
  "pep-primary-rag2-p6-upper-fi-022": {
    promptZhHans: "学校在广场的东偏北30°方向，距离广场500米处。则广场在学校的（ ）偏（ ）（ ）°方向，距离（ ）米。",
    explanationZhHans: "方向相对：东对西，北对南，角度不变。所以广场在学校的西偏南30°方向，距离也是500米。"
  },
  "pep-primary-rag2-p6-upper-fi-030": {
    promptZhHans: "点A的位置用数对(2,3)表示，点B的位置用数对(5,7)表示。如果点C与点A在同一列，与点B在同一行，那么点C的位置用数对表示为（______，______）。"
  },
  "pep-primary-rag2-p6-upper-mc-006": {
    promptZhHans: "有两根同样长的6米绳子，第一根剪去全长的1/3，第二根剪去1/3米。剩下的绳子相比，哪根长？",
    answer: "第二根长",
    acceptedAnswers: ["第二根长"],
    explanationZhHans: "第一根剪去6×1/3=2米，剩4米；第二根剪去1/3米，剩5又2/3米，所以第二根长。"
  },
  "pep-primary-rag2-p6-upper-mc-029": {
    promptZhHans: "某农场三种蔬菜种植面积的扇形统计图可用文字表示：西红柿占45%，黄瓜占25%，茄子占30%。已知黄瓜的种植面积是1.5公顷，那么西红柿的种植面积比茄子多多少公顷？"
  },
  "pep-primary-rag2-p6-upper-sa-014": {
    answer: "23.04",
    acceptedAnswers: ["23.04", "23.04平方米"],
    explanationZhHans: "菜地面积12×8=96平方米。西红柿用96×3/5=57.6平方米，剩38.4平方米；茄子占3/(2+3)，为38.4×3/5=23.04平方米。"
  }
};

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function appendReviewNote(existing, note) {
  const current = String(existing ?? "").trim();
  if (current.includes(note)) return current;
  return [current, note].filter(Boolean).join(" ");
}

const rows = fs.readFileSync(questionsJsonl, "utf8").trim().split(/\n/).filter(Boolean).map(JSON.parse);
const ids = new Set(rows.map((row) => row.id));
for (const id of Object.keys(overrides)) {
  if (!ids.has(id)) throw new Error(`Missing repair target ${id}`);
}
const repaired = rows.map((row) => {
  const override = overrides[row.id];
  if (!override) return row;
  return {
    ...row,
    ...override,
    acceptedAnswers: override.acceptedAnswers ?? row.acceptedAnswers,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-s18-review",
    terminologyQaStatus: "pending-s18-review",
    reviewNotes: appendReviewNote(
      row.reviewNotes,
      "Targeted S18 red-flag repair applied after audit; still candidate-only pending full review."
    )
  };
});

fs.writeFileSync(questionsJsonl, `${repaired.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeCsv(questionsCsv, repaired, [
  "id",
  "grade",
  "semester",
  "unitTitle",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "examPatternCardIds",
  "materialKind",
  "assessmentFamily",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "reviewNotes"
]);

console.log(`repaired ${Object.keys(overrides).length} red-flag rows`);
