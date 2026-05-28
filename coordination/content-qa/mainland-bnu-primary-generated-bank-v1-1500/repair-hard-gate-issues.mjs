import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const questionsCsv = path.join(__dirname, "questions.csv");
const questionPack = path.join(__dirname, "question-pack.json");
const repairReport = path.join(__dirname, "s18-hard-gate-remediation-report.md");

const headers = [
  "id",
  "batch",
  "grade",
  "semester",
  "topicId",
  "unitTitle",
  "volume",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "assessmentPatternCardIds",
  "paperPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
  "reviewNotes"
];

const standardReviewNotes =
  "S18 BNU primary V1 automated source-distance/structure gate passed with 300-row grade sample queue generated; candidate QA package only, not approved for public integration.";

const originalHardGateIssueCount = 40;
const residualRerunIssueIds = ["bnu-primary-ds-v1-p1-215", "bnu-primary-ds-v1-p2-109", "bnu-primary-ds-v1-p3-073", "bnu-primary-ds-v1-p6-140"];

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows) {
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function answerSet(answer, extra = []) {
  return Array.from(new Set([answer, ...extra].filter((value) => String(value ?? "").trim())));
}

const repairs = {
  "bnu-primary-ds-v1-p1-103": {
    optionsZhHans: ["10+3", "12+2", "15-2", "18-5"],
    answer: "12+2",
    acceptedAnswers: ["12+2"],
    explanationZhHans: "12+2=14。10+3=13，15-2=13，18-5=13，所以得数是14的算式只有12+2。"
  },
  "bnu-primary-ds-v1-p1-131": {
    answer: "对",
    acceptedAnswers: answerSet("对", ["算得对", "小乐算得对"]),
    explanationZhHans: "12可以分成10和2，先算10-5=5，再算5+2=7。12-5=7，所以小乐的方法和得数都正确。"
  },
  "bnu-primary-ds-v1-p1-215": {
    optionsZhHans: ["30+20", "45+6", "60-10", "20+30"],
    answer: "45+6",
    acceptedAnswers: ["45+6"],
    explanationZhHans: "45+6=51，是五十多。30+20=50，60-10=50，20+30=50，都不是五十多。所以答案是45+6。"
  },
  "bnu-primary-ds-v1-p2-010": {
    optionsZhHans: ["40+25", "30+34", "50+14", "45+21"],
    answer: "40+25",
    acceptedAnswers: ["40+25"],
    explanationZhHans: "37+28=65。40+25=65，30+34=64，50+14=64，45+21=66，所以得数相等的是40+25。"
  },
  "bnu-primary-ds-v1-p2-109": {
    optionsZhHans: ["6×7", "5×8", "9×4", "7×5"],
    answer: "6×7",
    acceptedAnswers: ["6×7"],
    explanationZhHans: "6×7=42，5×8=40，9×4=36，7×5=35。结果最大的是6×7。"
  },
  "bnu-primary-ds-v1-p3-175": {
    answer: "25×42",
    acceptedAnswers: ["25×42"],
    explanationZhHans: "19×49=931，21×51=1071，22×48=1056，25×42=1050。它们与1000的差分别是69、71、56、50，所以25×42的积最接近1000。"
  },
  "bnu-primary-ds-v1-p3-183": {
    optionsZhHans: ["10袋25千克的大米", "100个1千克的西瓜", "50个20千克的小朋友", "200个4千克的书包"],
    answer: "50个20千克的小朋友",
    acceptedAnswers: ["50个20千克的小朋友"],
    explanationZhHans: "1吨=1000千克。10袋25千克是250千克，100个1千克是100千克，50个20千克是1000千克，200个4千克是800千克。所以最接近1吨的是50个20千克的小朋友。"
  },
  "bnu-primary-ds-v1-p3-073": {
    promptZhHans: "下面哪个图形的周长最长？",
    optionsZhHans: ["长7厘米、宽3厘米的长方形", "边长5厘米的正方形", "长6厘米、宽4厘米的长方形", "长10厘米、宽2厘米的长方形"],
    answer: "长10厘米、宽2厘米的长方形",
    acceptedAnswers: ["长10厘米、宽2厘米的长方形"],
    explanationZhHans: "长7厘米、宽3厘米的长方形周长是(7+3)×2=20厘米；边长5厘米的正方形周长是5×4=20厘米；长6厘米、宽4厘米的长方形周长是(6+4)×2=20厘米；长10厘米、宽2厘米的长方形周长是(10+2)×2=24厘米，所以它的周长最长。"
  },
  "bnu-primary-ds-v1-p4-009": {
    answer: "8600402",
    acceptedAnswers: ["8600402"],
    explanationZhHans: "要组成最大的七位数，最高位尽量放大数字。8600402读作八百六十万零四百零二，读出两个零，并且比其他满足条件的排列更大。所以最大是8600402。"
  },
  "bnu-primary-ds-v1-p4-010": {
    answer: "4005600",
    acceptedAnswers: ["4005600"],
    explanationZhHans: "4005600读作四百万五千六百，一个零也不读；4005060读作四百万五千零六十，4056000读作四百零五万六千，4000560读作四百万零五百六十。一个零也不读的是4005600。"
  },
  "bnu-primary-ds-v1-p4-011": {
    answer: "80530006，八千零五十三万零六",
    acceptedAnswers: answerSet("80530006，八千零五十三万零六", ["80530006；八千零五十三万零六", "写作80530006，读作八千零五十三万零六"]),
    explanationZhHans: "8个千万是80000000，5个十万是500000，3个万是30000，6个一是6，合起来是80530006，读作八千零五十三万零六。"
  },
  "bnu-primary-ds-v1-p4-013": {
    optionsZhHans: ["6006060", "6006600", "6060060", "6606000"],
    answer: "6060060",
    acceptedAnswers: ["6060060"],
    explanationZhHans: "6006060读作六百万六千零六十，读一个零；6006600读作六百万六千六百，不读零；6060060读作六百零六万零六十，读两个零；6606000读作六百六十万六千，不读零。所以答案是6060060。"
  },
  "bnu-primary-ds-v1-p4-014": {
    answer: "84999，75000",
    acceptedAnswers: answerSet("84999，75000", ["84999,75000", "最大84999，最小75000", "最大是84999，最小是75000"]),
    explanationZhHans: "省略万位后面的尾数约是8万，最小的数是75000，因为75000四舍五入到万位是8万；最大的数是84999，因为84999四舍五入到万位仍是8万。"
  },
  "bnu-primary-ds-v1-p4-017": {
    answer: "55，35",
    acceptedAnswers: answerSet("55，35", ["55,35", "55；35", "比平角小55°，比直角大35°"]),
    explanationZhHans: "平角是180°，180°-125°=55°；直角是90°，125°-90°=35°。所以这个角比平角小55°，比直角大35°。"
  },
  "bnu-primary-ds-v1-p4-028": {
    promptZhHans: "点A、B、C在同一条直线上，A在最左边，B在A和C之间。下面哪条射线与射线AB是同一条射线？",
    optionsZhHans: ["射线AC", "射线BA", "射线BC", "射线CA"],
    answer: "射线AC",
    acceptedAnswers: ["射线AC"],
    explanationZhHans: "射线AB的端点是A，方向从A经过B向右延伸。因为C也在A的右侧，所以射线AC和射线AB端点相同、方向相同，是同一条射线。"
  },
  "bnu-primary-ds-v1-p4-069": {
    answer: "D镇在A城的东偏南方向，大约42千米。",
    acceptedAnswers: answerSet("D镇在A城的东偏南方向，大约42千米。", ["东偏南，约42千米", "东偏南方向，约42千米"]),
    explanationZhHans: "汽车先向东50千米，再向西20千米，最终在A城东边30千米；同时向南30千米。D镇在A城的东偏南45°方向，直线距离约为√(30²+30²)≈42千米。"
  },
  "bnu-primary-ds-v1-p4-244": {
    optionsZhHans: ["3.6 + 2.48 = 5.98", "5 - 1.26 = 3.74", "12.3 + 7 = 12.37", "8.4 - 3.15 = 5.35"],
    answer: "5 - 1.26 = 3.74",
    acceptedAnswers: ["5 - 1.26 = 3.74"],
    explanationZhHans: "5可以看作5.00，5.00-1.26=3.74。其他选项中，3.6+2.48=6.08，12.3+7=19.3，8.4-3.15=5.25，所以只有5-1.26=3.74正确。"
  },
  "bnu-primary-ds-v1-p5-104": {
    answer: "公平。因为数字1和2出现的可能性相同，小明和小红赢的机会一样，不需要修改规则。",
    acceptedAnswers: answerSet("公平。因为数字1和2出现的可能性相同，小明和小红赢的机会一样，不需要修改规则。", ["公平", "游戏公平", "公平，因为小明和小红赢的可能性相同"]),
    explanationZhHans: "骰子上1、2、3各有2个面，掷出每个数字的可能性相等。小明赢对应数字1，小红赢对应数字2，两人赢的可能性相同，所以游戏公平，不需要修改规则。"
  },
  "bnu-primary-ds-v1-p5-119": {
    answer: "大船7条，小船0条",
    acceptedAnswers: answerSet("大船7条，小船0条", ["7条大船，0条小船", "租7条大船，不租小船", "大船7条"]),
    explanationZhHans: "大船每人租金约10÷6≈1.67元，小船每人租金8÷4=2元，优先租大船更省钱。42÷6=7，租7条大船正好坐满，租金70元，是最省钱的方案。"
  },
  "bnu-primary-ds-v1-p5-150": {
    answer: "126",
    acceptedAnswers: answerSet("126", ["126平方米"]),
    explanationZhHans: "顶面面积是9×6=54平方米，四面墙壁面积是(9×3+6×3)×2=90平方米，合计54+90=144平方米。扣除门窗面积18平方米，粉刷面积是144-18=126平方米。"
  },
  "bnu-primary-ds-v1-p5-202": {
    promptZhHans: "小华从家出发，先向东走200米到达超市，再向东偏北60°方向走150米到达书店。书店在小华家的什么方向？大约多少米？（结果保留整数）",
    answer: "东偏北约25°方向，约304米",
    acceptedAnswers: answerSet("东偏北约25°方向，约304米", ["东偏北25°，304米", "东偏北25度，304米", "东偏北约25°，约304米"]),
    explanationZhHans: "第二段向东偏北60°走150米，向东分量约为150×cos60°=75米，向北分量约为150×sin60°≈130米。总向东约275米，向北约130米，方向约为东偏北25°，距离约为√(275²+130²)≈304米。"
  },
  "bnu-primary-ds-v1-p5-204": {
    answer: "西偏北约6°方向，约361米",
    acceptedAnswers: answerSet("西偏北约6°方向，约361米", ["西偏北6°，361米", "西偏北6度，361米", "西偏北约6°，约361米"]),
    explanationZhHans: "第一段向北偏西50°走300米，向北分量约193米，向西分量约230米。第二段向南偏西40°走200米，向南分量约153米，向西分量约129米。合起来向西约359米，向北约40米，方向约为西偏北6°，距离约361米。"
  },
  "bnu-primary-ds-v1-p5-206": {
    promptZhHans: "小芳从家出发，先向东偏南30°方向走400米到达邮局，再向东偏北60°方向走300米到达书店。书店在小芳家的什么方向？大约多少米？（结果保留整数）",
    answer: "东偏北约7°方向，约500米",
    acceptedAnswers: answerSet("东偏北约7°方向，约500米", ["东偏北7°，500米", "东偏北7度，500米", "东偏北约7°，约500米"]),
    explanationZhHans: "第一段向东分量约400×cos30°=346米，向南分量200米。第二段向东分量300×cos60°=150米，向北分量约300×sin60°=260米。合起来向东约496米，向北约60米，方向约为东偏北7°，距离约500米。"
  },
  "bnu-primary-ds-v1-p5-208": {
    answer: "东偏南约1°方向，约401米",
    acceptedAnswers: answerSet("东偏南约1°方向，约401米", ["东偏南1°，401米", "东偏南1度，401米", "东偏南约1°，约401米"]),
    explanationZhHans: "第一段向北偏东45°走200米，向北和向东分量都约为141米。第二段向东偏南30°走300米，向东分量约260米，向南分量150米。合起来向东约401米，向南约9米，所以方向约为东偏南1°，距离约401米。"
  },
  "bnu-primary-ds-v1-p5-228": {
    promptZhHans: "下面是某商店一周内两种饮料的销售数量统计表（单位：瓶）：\n周一：可乐30，雪碧25；周二：可乐35，雪碧28；周三：可乐40，雪碧32；周四：可乐38，雪碧30；周五：可乐45，雪碧35；周六：可乐50，雪碧40；周日：可乐55，雪碧45。\n这一周可乐平均每天比雪碧大约多卖______瓶。（结果保留一位小数）",
    answer: "8.3",
    acceptedAnswers: answerSet("8.3", ["约8.3", "8.3瓶", "约8.3瓶"]),
    explanationZhHans: "可乐总销量是30+35+40+38+45+50+55=293瓶，雪碧总销量是25+28+32+30+35+40+45=235瓶。可乐一周共多卖58瓶，平均每天多卖58÷7≈8.3瓶。"
  },
  "bnu-primary-ds-v1-p5-230": {
    answer: "约27.9",
    acceptedAnswers: answerSet("约27.9", ["27.9", "27.9分钟", "约27.9分钟"]),
    explanationZhHans: "一周做作业总时间是30+35+40+30+25+20+15=195分钟。195÷7≈27.9，所以她这一周平均每天做作业约27.9分钟。"
  },
  "bnu-primary-ds-v1-p6-018": {
    answer: "87.92",
    acceptedAnswers: answerSet("87.92", ["87.92平方米"]),
    explanationZhHans: "喷水池半径是37.68÷3.14÷2=6米，水泥路外圆半径是6+2=8米。水泥路面积为3.14×(8²-6²)=3.14×28=87.92平方米。"
  },
  "bnu-primary-ds-v1-p6-024": {
    answer: "200",
    acceptedAnswers: answerSet("200", ["200千克"]),
    explanationZhHans: "设这批苹果原来有x千克。第一天后剩下2/3x；第二天后剩下2/3x×(1-2/5)=2/5x；第三天后剩下2/5x×(1-1/2)=1/5x。1/5x=40，所以x=200。"
  },
  "bnu-primary-ds-v1-p6-041": {
    promptZhHans: "用5个同样的小正方体搭成一个立体图形。从正面看有两列，左列高1个、右列高2个；从左面看有两列，靠前一列高2个、靠后一列高1个。这个立体图形有几种不同的搭法？",
    explanationZhHans: "正面视图要求左右两列最高分别为1个和2个，左面视图要求前后两列最高分别为2个和1个。在用5个小正方体的条件下，满足这两个视图的摆法有两种，所以答案是2种。"
  },
  "bnu-primary-ds-v1-p6-042": {
    promptZhHans: "一个立体图形由6个同样的小正方体组成。从上面看，底面是2行2列的正方形；从正面看有两列，左列高3个、右列高1个。请你描述这个立体图形可能的一种搭法。",
    answer: "第一层放4个小正方体摆成田字形，第二层在左前位置放1个，第三层在左前位置再放1个",
    acceptedAnswers: answerSet("第一层放4个小正方体摆成田字形，第二层在左前位置放1个，第三层在左前位置再放1个", ["底层4个摆成田字形，左前位置再向上叠2个"]),
    explanationZhHans: "从上面看是2行2列，说明第一层可以放4个小正方体。要使正面左列高3个、右列高1个，可以在左前位置继续向上叠2个，共6个小正方体。"
  },
  "bnu-primary-ds-v1-p6-043": {
    promptZhHans: "一个立体图形由一些同样的小正方体搭成。从上面看，底面是2行2列的正方形；从正面看有两列，左列高2个、右列高1个；从左面看有两列，靠前一列高2个、靠后一列高1个。这个立体图形最少需要几个小正方体？",
    answer: "5个",
    acceptedAnswers: ["5个"],
    explanationZhHans: "从上面看底面有4个位置，每个位置至少放1个小正方体。为了让正面左列和左面靠前一列都达到2层，只需在左前位置再叠1个小正方体，所以最少需要4+1=5个。"
  },
  "bnu-primary-ds-v1-p6-044": {
    promptZhHans: "用同样的小正方体搭一个立体图形。从上面看，底面有3个位置，形状像字母L：前排左、右各1个，后排左1个；从正面看有两列，左列高2个、右列高1个。搭这个立体图形最少需要___个小正方体，最多需要___个小正方体。",
    explanationZhHans: "底面有3个位置。正面左列对应前排左和后排左两个位置，至少其中一个位置要叠到2层，所以最少需要3+1=4个；这两个位置都可以叠到2层，所以最多需要3+2=5个。"
  },
  "bnu-primary-ds-v1-p6-045": {
    promptZhHans: "一个立体图形从正面看有两列，左列高1个、右列高2个；从上面看有两个位置，左右排成一行。请说明这个立体图形可能是什么样子，并写出从右面看到的形状（用文字描述）。",
    answer: "这个立体图形可以左边放1个小正方体，右边上下叠2个小正方体。从右面看是一列，高2个。",
    acceptedAnswers: answerSet("这个立体图形可以左边放1个小正方体，右边上下叠2个小正方体。从右面看是一列，高2个。", ["左边1个，右边叠2个；从右面看是一列2个"]),
    explanationZhHans: "从上面看有左右两个位置，正面右列高2个，说明右边位置上下叠2个；左列高1个，说明左边位置放1个。从右面看时，两列重合成一列，高2个。"
  },
  "bnu-primary-ds-v1-p6-046": {
    promptZhHans: "用4个同样的小正方体搭成一个立体图形。从正面看有三列，左列高1个、中列高2个、右列高1个；从左面看只有一列，高2个。下面哪个立体图形符合要求？",
    explanationZhHans: "第一层放3个成一排，第二层在中间放1个时，从正面看正好是左1个、中2个、右1个；从左面看所有小正方体在同一排，只看到一列，高2个。"
  },
  "bnu-primary-ds-v1-p6-047": {
    promptZhHans: "一个立体图形由一些同样的小正方体搭成。从上面看，底面是2行2列的正方形；从正面看有两列，左列高2个、右列高1个；从左面看有两列，靠前一列高2个、靠后一列高1个。搭这个立体图形需要___个小正方体。",
    explanationZhHans: "从上面看底面有4个位置，每个位置至少1个。正面左列和左面靠前一列都需要2层，只要在左前位置再叠1个，就同时满足两个视图，所以一共需要5个小正方体。"
  },
  "bnu-primary-ds-v1-p6-048": {
    promptZhHans: "用同样的小正方体搭一个立体图形，使得从上面看是2行2列的正方形，从正面看有两列，左列高2个、右列高1个。请写出两种不同的搭法，并说明每种搭法用了几个小正方体。",
    answer: "搭法一：底层放4个成田字形，第二层在左前位置放1个，共5个。搭法二：底层放4个成田字形，第二层在左后位置放1个，共5个。",
    acceptedAnswers: answerSet("搭法一：底层放4个成田字形，第二层在左前位置放1个，共5个。搭法二：底层放4个成田字形，第二层在左后位置放1个，共5个。", ["左前位置叠1个或左后位置叠1个，两种搭法都用5个"]),
    explanationZhHans: "从上面看是2行2列，底层先放4个。正面左列需要高2个，右列高1个，所以可以在左前位置叠1个，也可以在左后位置叠1个，得到两种不同搭法，每种都用5个。"
  },
  "bnu-primary-ds-v1-p6-049": {
    promptZhHans: "一个立体图形由3个同样的小正方体搭成。从正面看有两层，底层2个、上层1个；从上面看有两个位置。下面哪个图形不可能是从左面看到的形状？",
    explanationZhHans: "这个立体图形一共只有3个小正方体，所以从左面看到的小正方形最多也只有3个。不可能看到由4个小正方形组成、左边一列2个且右边一列2个的形状。"
  },
  "bnu-primary-ds-v1-p6-050": {
    promptZhHans: "用同样的小正方体搭一个立体图形。从正面看有两列，左列高2个、右列高1个；从左面看有两列，靠前一列高2个、靠后一列高1个。这个立体图形最少需要___个小正方体。",
    explanationZhHans: "要让正面左列和左面靠前一列都高2个，可以在左前位置叠2个小正方体；还需要一个右侧底层位置和一个靠后底层位置来满足两个视图，所以最少需要4个。"
  },
  "bnu-primary-ds-v1-p6-051": {
    promptZhHans: "在一个前后两排、左右两列的4个位置中，用若干个小正方体搭成一个立体图形。从正面看有两列，左列高2个、右列高1个；从左面看有两列，靠前一列高2个、靠后一列高1个。要搭成这样的立体图形，最少需要多少个小正方体？最多需要多少个小正方体？请写出你的推理过程。",
    explanationZhHans: "最少时，让两个2层要求共用左前位置：左前放2个，右前放1个，左后放1个，共4个。最多时，在不改变视图最高层数的前提下，左前和左后都可放2个，右前和右后各放1个，共6个。"
  },
  "bnu-primary-ds-v1-p6-052": {
    promptZhHans: "用5个同样大小的小正方体搭成一个立体图形。从正面看有三列，左列高1个、中列高2个、右列高1个；从左面看有两列，靠前一列高1个、靠后一列高2个。下面哪个立体图形符合要求？",
    explanationZhHans: "选项B中，第一层前排左1个，后排左中右各1个，第二层在后排中1个。从正面看是左1个、中2个、右1个；从左面看是前排1个、后排2个，符合要求。"
  },
  "bnu-primary-ds-v1-p6-053": {
    promptZhHans: "一个立体图形由若干个相同的小正方体搭成。从上面看有4个位置：前排左、中、右各1个，后排中间1个；从正面看有三列，左列高1个、中列高2个、右列高1个。这个立体图形一共有（    ）个小正方体。",
    explanationZhHans: "从上面看有4个底面位置，每个位置至少放1个。正面中列高2个，需要在中间某个位置再叠1个小正方体，所以一共有4+1=5个。"
  },
  "bnu-primary-ds-v1-p6-054": {
    promptZhHans: "用4个同样的小正方体搭成一个立体图形。小明从正面看到三列，左列高1个、中列高2个、右列高1个；从左面看到一列，高2个。请你想一想，小明搭的立体图形可能是什么样子的？用文字描述一种可能的搭法。",
    explanationZhHans: "第一层放3个小正方体排成一排，第二层在中间一个小正方体的上面放1个。这样从正面看是左1个、中2个、右1个；从左面看是一列，高2个。"
  },
  "bnu-primary-ds-v1-p6-140": {
    answer: "正确，跑道一圈长317米。",
    acceptedAnswers: answerSet("正确，跑道一圈长317米。", ["正确", "317米", "算式和结果正确", "小亮的做法正确"]),
    explanationZhHans: "两端半圆可以合成一个圆，直径是50米，圆周长是3.14×50=157米。再加上两条直道80×2=160米，跑道一圈长160+157=317米，所以小亮的列式和结果正确。"
  },
  "bnu-primary-ds-v1-p6-221": {
    promptZhHans: "学校“数学好玩”活动小组要设计一个无盖的圆柱形环保垃圾桶，要求容积至少为20升。他们找到三种废旧材料：材料A是长62.8厘米、宽40厘米的长方形铁皮；材料B是边长50厘米的正方形铁皮；材料C是长80厘米、宽40厘米的长方形铁皮。小组成员提出以下四种设计方案，请你判断哪种方案能满足容积要求且容积最大？（不考虑接缝和厚度，π取3.14）",
    answer: "用材料C，以长边为底面周长，宽为高，制作垃圾桶",
    acceptedAnswers: ["用材料C，以长边为底面周长，宽为高，制作垃圾桶"],
    explanationZhHans: "方案A容积为12.56升，方案B容积为15.7升，方案C容积约为20.38升，方案D容积约为8升。只有方案C达到至少20升的要求，并且在四个方案中容积最大，所以选择方案C。"
  }
};

const rows = readJsonl(questionsJsonl).map((row) => ({
  ...row,
  sourceDistanceStatus: "passed-auto-source-scan",
  mathQaStatus: "pending-s18-review",
  terminologyQaStatus: "pending-s18-review",
  manualQaStatus: "pending-s18-review",
  reviewNotes: standardReviewNotes
}));

const byId = new Map(rows.map((row) => [row.id, row]));
const missingIds = Object.keys(repairs).filter((id) => !byId.has(id));
if (missingIds.length) throw new Error(`Missing repair IDs: ${missingIds.join(", ")}`);

for (const [id, patch] of Object.entries(repairs)) {
  Object.assign(byId.get(id), patch);
}

const errors = [];
for (const id of Object.keys(repairs)) {
  const row = byId.get(id);
  if (!row.answer || !Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) {
    errors.push(`${id}: answer must be included in acceptedAnswers`);
  }
  if (row.type === "multiple-choice") {
    if (!Array.isArray(row.optionsZhHans) || row.optionsZhHans.length !== 4) errors.push(`${id}: multiple-choice must have 4 options`);
    if (new Set(row.optionsZhHans).size !== row.optionsZhHans.length) errors.push(`${id}: duplicate options`);
    if (!row.optionsZhHans.includes(row.answer)) errors.push(`${id}: answer is not one of the options`);
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    errors.push(`${id}: non-multiple-choice row must not have options`);
  }
}

if (errors.length) {
  throw new Error(`Repair validation failed:\n${errors.join("\n")}`);
}

fs.writeFileSync(questionsJsonl, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeCsv(questionsCsv, rows);
fs.writeFileSync(questionPack, `${JSON.stringify({ questions: rows }, null, 2)}\n`);

const unsolvableIds = Object.keys(repairs).filter((id) => byId.get(id).solvable === "no");
const report = `# S18 Hard-Gate Remediation Report - Mainland BNU Primary V1

- Date: 2026-05-27
- Session ID: S18
- Strategy: minimal repair; preserve IDs, grades, types, topics, and candidate package scope.
- Original hard-gate rows repaired: ${originalHardGateIssueCount}
- Residual rerun rows repaired: ${residualRerunIssueIds.length}
- Total edited rows: ${Object.keys(repairs).length}
- Candidate data edited: \`questions.jsonl\`, \`questions.csv\`, \`question-pack.json\`
- App integration status: candidate-only; not approved for public integration.

## Repair Summary

- Fixed 15 missing-condition / unsolvable rows by replacing blank visual references with complete textual conditions.
- Fixed 25 solvable-but-answer-mismatch rows by correcting answers, accepted answers, explanations, or single-choice distractors.
- Fixed ${residualRerunIssueIds.length} additional residual rows found by forced reruns: \`${residualRerunIssueIds.join("`, `")}\`.
- Kept all row IDs, grade counts, type counts, evidence card IDs, and assessment pattern card IDs unchanged.

## Repaired IDs

${Object.keys(repairs).map((id) => `- \`${id}\``).join("\n")}

## Verification Status

- Deterministic audit: pending rerun.
- DeepSeek V4 Pro hard-gate rerun: pending rerun with \`--force\`.
- Final decision: pending.

## Notes

- Row \`bnu-primary-ds-v1-p3-175\` was repaired to the mathematically correct answer \`25×42\`; the earlier model rationale incorrectly named \`19×49\`.
- Row \`bnu-primary-ds-v1-p3-183\` also needed a distractor change because the old \`200个5千克的书包\` option equaled 1 ton.
- Row \`bnu-primary-ds-v1-p6-221\` was repaired by changing the capacity requirement from at least 30 L to at least 20 L so exactly one existing option satisfies the condition.
`;

fs.writeFileSync(repairReport, report);
console.log(
  JSON.stringify({
    event: "bnu-v1-hard-gate-repair-complete",
    repairedRows: Object.keys(repairs).length,
    outputFiles: ["questions.jsonl", "questions.csv", "question-pack.json", path.basename(repairReport)]
  })
);
