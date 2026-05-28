import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const packages = {
  v1: path.join(root, "coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500"),
  v2: path.join(root, "coordination/content-qa/mainland-bnu-primary-generated-bank-v2-1500")
};

const columns = [
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

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeQuestionsCsv(filePath, rows) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function patchRows(packageDir, patches) {
  const jsonlPath = path.join(packageDir, "questions.jsonl");
  const csvPath = path.join(packageDir, "questions.csv");
  const rows = readJsonl(jsonlPath);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const changed = [];

  for (const [id, patch] of Object.entries(patches)) {
    const row = byId.get(id);
    if (!row) throw new Error(`Missing row ${id}`);
    Object.assign(row, patch);
    changed.push(id);
  }

  writeJsonl(jsonlPath, rows);
  writeQuestionsCsv(csvPath, rows);
  return changed;
}

const v1Patches = {
  "bnu-primary-ds-v1-p1-023": {
    promptZhHans: "一个西瓜需要两只手抱，一个苹果一只手就能拿起。哪个比较重？填：____重。",
    answer: "西瓜",
    acceptedAnswers: ["西瓜", "西瓜重"],
    explanationZhHans: "题目说明西瓜需要两只手抱，苹果一只手就能拿起，所以西瓜比较重。"
  },
  "bnu-primary-ds-v1-p1-025": {
    promptZhHans: "下面哪盘水果的个数最少？\nA. 5个苹果\nB. 4个香蕉\nC. 6个橘子\nD. 2个桃子",
    answer: "D",
    acceptedAnswers: ["D", "2个桃子"],
    explanationZhHans: "比较数量：2小于4、5和6，所以2个桃子最少。"
  },
  "bnu-primary-ds-v1-p1-050": {
    promptZhHans: "把下面的水果按“是不是红色”分成两类。水果：苹果、香蕉、草莓、橘子。分类标准是______。",
    answer: "是不是红色",
    acceptedAnswers: ["是不是红色", "是否是红色", "按是否是红色分类"],
    explanationZhHans: "苹果和草莓可以归为红色水果，香蕉和橘子不是红色水果，所以分类标准是是不是红色。"
  },
  "bnu-primary-ds-v1-p1-051": {
    promptZhHans: "下面有一些水果：苹果、香蕉、橘子、草莓。请按“是不是红色”分成两组，并写出每组有哪些水果。",
    answer: "红色组：苹果、草莓；不是红色组：香蕉、橘子。",
    acceptedAnswers: [
      "红色组：苹果、草莓；不是红色组：香蕉、橘子。",
      "苹果、草莓一组，香蕉、橘子一组",
      "红色：苹果、草莓；非红色：香蕉、橘子"
    ],
    explanationZhHans: "苹果和草莓是红色，香蕉和橘子不是红色，所以按是不是红色分成两组。"
  },
  "bnu-primary-ds-v1-p1-052": {
    promptZhHans: "下面这些动物：猫、狗、金鱼、小鸟。按“会不会飞”分类，下面哪种分法是正确的？",
    optionsZhHans: ["小鸟一组，猫、狗、金鱼一组", "猫和狗一组，金鱼和小鸟一组", "猫和小鸟一组，狗和金鱼一组", "四种动物全放在一组"],
    answer: "小鸟一组，猫、狗、金鱼一组",
    acceptedAnswers: ["小鸟一组，猫、狗、金鱼一组"],
    explanationZhHans: "小鸟会飞，猫、狗、金鱼不会飞，所以按会不会飞分类应把小鸟单独放一组。"
  },
  "bnu-primary-ds-v1-p1-053": {
    promptZhHans: "小丽把一些图形分成两组：第一组有圆形；第二组有三角形、正方形、长方形、平行四边形。她可能是按什么标准分的？填在横线上：按______分类。",
    answer: "是否由曲线围成",
    acceptedAnswers: ["是否由曲线围成", "是否有曲线", "是不是圆形", "是否由直线围成"],
    explanationZhHans: "圆形由曲线围成，三角形、正方形、长方形和平行四边形都由直线围成，所以可以按是否由曲线围成分类。"
  },
  "bnu-primary-ds-v1-p1-054": {
    promptZhHans: "教室里有这些物品：铅笔、橡皮、尺子、跳绳、皮球、毽子。请按用途把它们分成学习用品和运动用品两类，并说出分类标准。",
    answer: "学习用品：铅笔、橡皮、尺子；运动用品：跳绳、皮球、毽子。分类标准是用途。",
    acceptedAnswers: [
      "学习用品：铅笔、橡皮、尺子；运动用品：跳绳、皮球、毽子。分类标准是用途。",
      "铅笔、橡皮、尺子一组；跳绳、皮球、毽子一组；按用途分"
    ],
    explanationZhHans: "铅笔、橡皮、尺子主要用于学习，跳绳、皮球、毽子主要用于运动，所以按用途分成两类。"
  },
  "bnu-primary-ds-v1-p1-057": {
    promptZhHans: "下面有一些玩具：塑料皮球、塑料积木、布娃娃、布沙包。请按材质把它们分成两类，写出每类有哪些玩具，并说出分类标准。",
    answer: "塑料类：塑料皮球、塑料积木；布类：布娃娃、布沙包。分类标准是材质。",
    acceptedAnswers: [
      "塑料类：塑料皮球、塑料积木；布类：布娃娃、布沙包。分类标准是材质。",
      "塑料皮球和塑料积木一组，布娃娃和布沙包一组，按材质分"
    ],
    explanationZhHans: "题目已经说明皮球和积木是塑料材质，娃娃和沙包是布材质，所以按材质分成塑料类和布类。"
  },
  "bnu-primary-ds-v1-p1-059": {
    promptZhHans: "老师把一些同学分成两组：第一组是穿红色衣服的同学；第二组是穿蓝色、黄色、绿色衣服的同学。老师可能是按什么标准分的？填在横线上：按______分类。",
    answer: "衣服是不是红色",
    acceptedAnswers: ["衣服是不是红色", "是否穿红色衣服", "是不是穿红色衣服"],
    explanationZhHans: "第一组都穿红色衣服，第二组都不是红色衣服，所以分类标准是衣服是不是红色。"
  },
  "bnu-primary-ds-v1-p1-136": {
    optionsZhHans: ["8", "12", "9", "7"],
    answer: "9",
    acceptedAnswers: ["9"],
    explanationZhHans: "10-8=2，12-10=2，10-9=1，10-7=3。差最小的是9，所以9最接近10。"
  },
  "bnu-primary-ds-v1-p1-138": {
    promptZhHans: "书本放在桌子中间，文具盒放在书本上面，橡皮放在文具盒右面。请用“上、下、左、右”填空：文具盒在书本的____面，橡皮在文具盒的____面。",
    answer: "上，右",
    acceptedAnswers: ["上，右", "上 右", "上、右"],
    explanationZhHans: "题目说明文具盒放在书本上面，橡皮放在文具盒右面，所以应填“上，右”。"
  },
  "bnu-primary-ds-v1-p1-199": {
    promptZhHans: "把4个同样的小正方形排成2行2列，可以拼成一个什么图形？",
    answer: "正方形",
    acceptedAnswers: ["正方形"],
    explanationZhHans: "2行2列的小正方形四边一样长，拼成的是一个大正方形。"
  },
  "bnu-primary-ds-v1-p1-204": {
    promptZhHans: "把4个完全一样的正方形排成一行，可以拼成一个什么图形？请写出这个图形的名称。",
    answer: "长方形",
    acceptedAnswers: ["长方形"],
    explanationZhHans: "4个完全一样的正方形排成一行，长比宽大，所以拼成一个长方形。"
  },
  "bnu-primary-ds-v1-p2-175": {
    optionsZhHans: ["4980", "5090", "6010", "4900"],
    answer: "5090",
    acceptedAnswers: ["5090"],
    explanationZhHans: "5090比5000大、比6000小；4980和4900小于5000，6010大于6000，所以只有5090符合条件。"
  },
  "bnu-primary-ds-v1-p2-197": {
    optionsZhHans: ["900 - 399", "256 + 189", "723 - 248", "345 + 128"],
    answer: "900 - 399",
    acceptedAnswers: ["900 - 399"],
    explanationZhHans: "900-399=501>500；256+189=445<500；723-248=475<500；345+128=473<500，所以只有900-399的结果大于500。"
  },
  "bnu-primary-ds-v1-p3-233": {
    optionsZhHans: ["喜欢苹果的人数比香蕉多3人。", "喜欢草莓的人数最多，有15人。", "喜欢西瓜的人数比草莓少4人。", "喜欢苹果和香蕉的总人数是22人。"],
    answer: "喜欢草莓的人数最多，有15人。",
    acceptedAnswers: ["喜欢草莓的人数最多，有15人。"],
    explanationZhHans: "苹果12人，香蕉8人，草莓15人，西瓜10人。草莓人数最多且是15人；12-8=4不是3，15-10=5不是4，12+8=20不是22。"
  },
  "bnu-primary-ds-v1-p4-138": {
    answer: "对，说法正确。",
    acceptedAnswers: ["对，说法正确。", "对", "正确", "说法正确"],
    explanationZhHans: "锐角小于90°，直角等于90°，钝角大于90°小于180°。∠1=35°是锐角，∠2=90°是直角，∠3=120°是钝角，判断都正确。"
  },
  "bnu-primary-ds-v1-p4-233": {
    promptZhHans: "四（3）班第一小组6名同学的身高数据如下（单位：厘米）：135, 142, 138, 140, 137, 148。下面哪种说法是正确的？",
    answer: "这组数据的平均数是140厘米。",
    acceptedAnswers: ["这组数据的平均数是140厘米。"],
    explanationZhHans: "计算总和：135+142+138+140+137+148=840，840÷6=140，所以平均数是140厘米。"
  },
  "bnu-primary-ds-v1-p5-011": {
    promptZhHans: "小明在计算一道小数除法时，把被除数 12.6 的小数点向右移动了一位，除数 0.7 的小数点也向右移动了一位，得到的结果是 18。他检查后发现两数的小数点同时右移一位，商不变。正确的商是多少？",
    answer: "18",
    acceptedAnswers: ["18", "18.0"],
    explanationZhHans: "被除数和除数的小数点都向右移动一位，相当于同时乘10，商不变。所以正确的商是18。"
  },
  "bnu-primary-ds-v1-p5-058": {
    optionsZhHans: ["三角形", "梯形", "平行四边形", "圆"],
    answer: "平行四边形",
    acceptedAnswers: ["平行四边形"],
    explanationZhHans: "平行四边形面积=底×高。三角形面积=底×高÷2，梯形面积=(上底+下底)×高÷2，圆的面积不用底×高计算。"
  },
  "bnu-primary-ds-v1-p5-227": {
    optionsZhHans: ["喜欢足球的人数是羽毛球的2倍", "喜欢篮球的人数比乒乓球多2人", "全班共有46人", "喜欢乒乓球的人数最少"],
    answer: "喜欢篮球的人数比乒乓球多2人",
    acceptedAnswers: ["喜欢篮球的人数比乒乓球多2人"],
    explanationZhHans: "篮球12人，乒乓球10人，12-10=2，所以多2人。足球15人不是羽毛球8人的2倍；总人数15+12+10+8=45人，不是46人；羽毛球8人最少，不是乒乓球最少。"
  },
  "bnu-primary-ds-v1-p6-163": {
    optionsZhHans: ["6:10和9:15", "20:5和1:4", "0.6:0.2和2:1", "1.2:0.4和1.5:1"],
    answer: "6:10和9:15",
    acceptedAnswers: ["6:10和9:15"],
    explanationZhHans: "6:10=0.6，9:15=0.6，比值相等，能组成比例。其他选项的两个比比值不相等。"
  },
  "bnu-primary-ds-v1-p6-172": {
    optionsZhHans: ["6:10和9:15", "20:5和1:4", "1/2:1/3和4:3", "0.6:0.2和3/4:1/2"],
    answer: "6:10和9:15",
    acceptedAnswers: ["6:10和9:15"],
    explanationZhHans: "6:10=0.6，9:15=0.6，比值相等，能组成比例。其他选项的两个比比值不相等，不能组成比例。"
  },
  "bnu-primary-ds-v1-p6-182": {
    promptZhHans: "一个图形先向右平移5格，再向下平移3格。请填空：这个图形先向____平移5格，再向____平移3格。",
    answer: "右，下",
    acceptedAnswers: ["右，下", "右、下", "右 下"],
    explanationZhHans: "题目说明先向右平移5格，再向下平移3格，所以应填“右，下”。"
  },
  "bnu-primary-ds-v1-p1-145": {
    promptZhHans: "计算 8 + 7 时，下面哪种方法先把 8 凑成 10？",
    optionsZhHans: [
      "把7分成2和5，8+2=10，10+5=15",
      "把7分成3和4，8+3=11，11+4=15",
      "把8分成4和4，7+4=11，11+4=15",
      "把7分成1和6，8+1=9，9+6=15"
    ],
    answer: "把7分成2和5，8+2=10，10+5=15",
    acceptedAnswers: ["把7分成2和5，8+2=10，10+5=15"],
    explanationZhHans: "要先把8凑成10，需要从7里分出2，8+2=10，再加剩下的5，得到15。"
  },
  "bnu-primary-ds-v1-p1-151": {
    promptZhHans: "计算 8 + 6 时，下面哪种方法先把 8 凑成 10？",
    optionsZhHans: [
      "把6分成2和4，先算8+2=10，再算10+4=14",
      "把6分成3和3，先算8+3=11，再算11+3=14",
      "把8分成2和6，先算6+2=8，再算8+6=14",
      "先算8+1=9，再算9+5=14"
    ],
    answer: "把6分成2和4，先算8+2=10，再算10+4=14",
    acceptedAnswers: ["把6分成2和4，先算8+2=10，再算10+4=14"],
    explanationZhHans: "8需要再加2才能凑成10，所以把6分成2和4，先算8+2=10，再算10+4=14。"
  },
  "bnu-primary-ds-v1-p1-157": {
    promptZhHans: "计算 7 + 8 时，下面哪种方法是把 8 拆开，先把 7 凑成 10？",
    optionsZhHans: [
      "把8分成2和6，先算7+2=9，再算9+6=15",
      "把8分成3和5，先算7+3=10，再算10+5=15",
      "把8分成4和4，先算7+4=11，再算11+4=15",
      "把7分成3和4，先算8+3=11，再算11+4=15"
    ],
    answer: "把8分成3和5，先算7+3=10，再算10+5=15",
    acceptedAnswers: ["把8分成3和5，先算7+3=10，再算10+5=15"],
    explanationZhHans: "7需要再加3才能凑成10，所以把8分成3和5，先算7+3=10，再算10+5=15。"
  },
  "bnu-primary-ds-v1-p2-032": {
    promptZhHans: "草莓排成3行，每行4个。填空：每行有____个草莓，有____行，一共有____个草莓。加法算式：____，乘法算式：____。",
    answer: "每行有4个草莓，有3行，一共有12个草莓。加法算式：4+4+4=12，乘法算式：3×4=12或4×3=12。",
    acceptedAnswers: [
      "每行有4个草莓，有3行，一共有12个草莓。加法算式：4+4+4=12，乘法算式：3×4=12或4×3=12。",
      "每行有4个草莓，有3行，一共有12个草莓。加法算式：4+4+4=12，乘法算式：3×4=12。",
      "每行有4个草莓，有3行，一共有12个草莓。加法算式：4+4+4=12，乘法算式：4×3=12。"
    ],
    explanationZhHans: "题目说明草莓排成3行，每行4个，是3个4。加法是4+4+4=12，乘法可以写成3×4=12或4×3=12。"
  },
  "bnu-primary-ds-v1-p2-044": {
    promptZhHans: "有3排花盆，每排摆4盆。请写出加法算式和乘法算式。\n加法算式：____________________\n乘法算式：____________________",
    answer: "加法算式：4+4+4=12，乘法算式：3×4=12",
    acceptedAnswers: [
      "加法算式：4+4+4=12，乘法算式：3×4=12",
      "加法算式：4+4+4=12，乘法算式：4×3=12"
    ],
    explanationZhHans: "3排花盆，每排4盆，就是3个4相加，加法为4+4+4=12，乘法为3×4=12或4×3=12。"
  },
  "bnu-primary-ds-v1-p2-058": {
    promptZhHans: "小杰在方格纸上把一个三角形向右平移4格。原来在左边的顶点A平移后，移动方向和格数是什么？",
    optionsZhHans: ["向右4格", "向左4格", "向上4格", "向下4格"],
    answer: "向右4格",
    acceptedAnswers: ["向右4格"],
    explanationZhHans: "图形整体向右平移4格，图形上的每个点也都向右平移4格，所以顶点A向右移动4格。"
  },
  "bnu-primary-ds-v1-p2-073": {
    promptZhHans: "下面哪道算式的得数与2×4相等？",
    optionsZhHans: ["4×2", "3×3", "5×2", "2×5"],
    answer: "4×2",
    acceptedAnswers: ["4×2"],
    explanationZhHans: "2×4=8，4×2=8，所以4×2的得数与2×4相等。"
  },
  "bnu-primary-ds-v1-p2-112": {
    optionsZhHans: ["7+9", "9×7", "7×8", "9×8"],
    answer: "9×7",
    acceptedAnswers: ["9×7"],
    explanationZhHans: "7×9和9×7根据乘法交换律结果相等，都是63。其他选项的结果不是63。"
  },
  "bnu-primary-ds-v1-p2-241": {
    optionsZhHans: ["9人", "8人", "7人", "6人"],
    answer: "9人",
    acceptedAnswers: ["9人"],
    explanationZhHans: "苹果：正正正表示15人，梨：正一表示6人，15-6=9人。"
  },
  "bnu-primary-ds-v1-p2-243": {
    optionsZhHans: ["15人", "10人", "5人", "20人"],
    answer: "15人",
    acceptedAnswers: ["15人"],
    explanationZhHans: "红色：正正正正表示20人，黄色：正表示5人，20-5=15人。"
  },
  "bnu-primary-ds-v1-p2-244": {
    optionsZhHans: ["9人", "8人", "7人", "6人"],
    answer: "9人",
    acceptedAnswers: ["9人"],
    explanationZhHans: "小猫：正正正表示15人，小鸟：正一表示6人，15-6=9人。"
  },
  "bnu-primary-ds-v1-p2-245": {
    optionsZhHans: ["14人", "9人", "12人", "20人"],
    answer: "14人",
    acceptedAnswers: ["14人"],
    explanationZhHans: "春天：正正正正表示20人，冬天：正一表示6人，20-6=14人。"
  },
  "bnu-primary-ds-v1-p2-246": {
    optionsZhHans: ["19人", "15人", "16人", "25人"],
    answer: "19人",
    acceptedAnswers: ["19人"],
    explanationZhHans: "数学：正正正正正表示25人，美术：正一表示6人，25-6=19人。"
  },
  "bnu-primary-ds-v1-p2-247": {
    optionsZhHans: ["10人", "5人", "6人", "15人"],
    answer: "10人",
    acceptedAnswers: ["10人"],
    explanationZhHans: "积木：正正正表示15人，汽车：正表示5人，15-5=10人。"
  },
  "bnu-primary-ds-v1-p2-248": {
    optionsZhHans: ["14人", "9人", "12人", "20人"],
    answer: "14人",
    acceptedAnswers: ["14人"],
    explanationZhHans: "牛奶：正正正正表示20人，水：正一表示6人，20-6=14人。"
  },
  "bnu-primary-ds-v1-p2-249": {
    optionsZhHans: ["19人", "15人", "16人", "25人"],
    answer: "19人",
    acceptedAnswers: ["19人"],
    explanationZhHans: "童话：正正正正正表示25人，历史：正一表示6人，25-6=19人。"
  },
  "bnu-primary-ds-v1-p2-250": {
    optionsZhHans: ["10人", "5人", "6人", "15人"],
    answer: "10人",
    acceptedAnswers: ["10人"],
    explanationZhHans: "薯片：正正正表示15人，饼干：正表示5人，15-5=10人。"
  },
  "bnu-primary-ds-v1-p3-003": {
    promptZhHans: "小明有50元，买一个书包用了34元，剩下的钱买了4本同样的笔记本。每本笔记本多少元？请写出分步算式和综合算式。",
    answer: "分步：50−34=16（元），16÷4=4（元）；综合：(50−34)÷4=4（元）",
    acceptedAnswers: [
      "分步：50−34=16（元），16÷4=4（元）；综合：(50−34)÷4=4（元）",
      "分步：50-34=16元，16÷4=4元；综合：(50-34)÷4=4元"
    ],
    explanationZhHans: "先求剩下的钱：50−34=16元，再平均分成4份：16÷4=4元。综合算式要先算减法，所以写成(50−34)÷4=4。"
  },
  "bnu-primary-ds-v1-p3-205": {
    optionsZhHans: ["边长6厘米的正方形", "长14厘米、宽2厘米的长方形", "长5厘米、宽6厘米的长方形", "边长7厘米的正方形"],
    answer: "长14厘米、宽2厘米的长方形",
    acceptedAnswers: ["长14厘米、宽2厘米的长方形"],
    explanationZhHans: "原长方形面积=7×4=28平方厘米。长14厘米、宽2厘米的长方形面积是14×2=28平方厘米，与原长方形面积相等。"
  },
  "bnu-primary-ds-v1-p4-120": {
    answer: "不公平。因为质数有2、3、5、7共4张，合数只有8这一张。可以改为：抽到2或3甲胜，抽到7或8乙胜，抽到5重抽，这样双方各有2张获胜牌。",
    acceptedAnswers: [
      "不公平。因为质数有2、3、5、7共4张，合数只有8这一张。可以改为：抽到2或3甲胜，抽到7或8乙胜，抽到5重抽，这样双方各有2张获胜牌。",
      "不公平。抽到2或3甲胜，抽到7或8乙胜，抽到5重抽。"
    ],
    explanationZhHans: "原规则中甲有4张获胜牌，乙只有1张获胜牌，不公平。把获胜牌改成甲2张、乙2张，剩下1张重抽，双方机会相等。"
  },
  "bnu-primary-ds-v1-p4-169": {
    optionsZhHans: ["等边三角形", "等腰三角形", "不等边三角形", "无法按边分类"],
    answer: "不等边三角形",
    acceptedAnswers: ["不等边三角形"],
    explanationZhHans: "已知两边为3厘米和4厘米，夹角是90°，第三边是5厘米。三条边长度都不相等，所以按边分类是不等边三角形。"
  },
  "bnu-primary-ds-v1-p4-172": {
    optionsZhHans: ["A. 只有一组对边平行的四边形", "B. 两组对边分别平行的四边形", "C. 只有一组邻边相等的四边形", "D. 四条边都不相等的四边形"],
    answer: "B. 两组对边分别平行的四边形",
    acceptedAnswers: ["B. 两组对边分别平行的四边形"],
    explanationZhHans: "平行四边形的定义是两组对边分别平行，所以一定是平行四边形的是B。"
  },
  "bnu-primary-ds-v1-p4-220": {
    promptZhHans: "设原来车上有x人，一辆公交车到站后，下车c人，上车8人，现在车上有25人。请列出方程。",
    answer: "x - c + 8 = 25",
    acceptedAnswers: ["x - c + 8 = 25", "x-c+8=25"],
    explanationZhHans: "原来有x人，下车c人后剩x-c人，再上车8人，现在是25人，所以方程是x-c+8=25。"
  },
  "bnu-primary-ds-v1-p5-093": {
    answer: "红色或蓝色",
    acceptedAnswers: ["红色或蓝色", "红色和蓝色", "红色、蓝色"],
    explanationZhHans: "转盘共8份，红色3份，黄色2份，蓝色3份。红色和蓝色份数相同且最多，所以停在红色或蓝色区域的可能性最大。"
  },
  "bnu-primary-ds-v1-p5-131": {
    promptZhHans: "小明用一根彩带制作手工，第一次用去 2/5 米，第二次用去 1/3 米，两次一共用去多少米？结果用最简分数表示。",
    answer: "11/15",
    acceptedAnswers: ["11/15", "11/15米"],
    explanationZhHans: "两次用去的长度相加：2/5+1/3。通分得2/5=6/15，1/3=5/15，相加得11/15米。"
  },
  "bnu-primary-ds-v1-p5-208": {
    acceptedAnswers: [
      "东偏南约1°方向，约401米",
      "东偏南约1度方向，约401米",
      "东偏南约1°，约401米",
      "东偏南约1度，约401米"
    ],
    explanationZhHans: "第一段向北偏东45°走200米，向北和向东分量都约为141米。第二段向东偏南30°走300米，向东分量约260米，向南分量150米。合起来向东约401米、向南约9米，所以方向约为东偏南1°，距离约401米。"
  }
};

const v2Patches = {
  "bnu-primary-ds-v2-p1-046": {
    optionsZhHans: ["4+3=7", "4-3=1", "7-3=4", "3+5=8"],
    explanationZhHans: "原来有4支，又得到3支，合起来用加法：4+3=7。"
  },
  "bnu-primary-ds-v2-p1-057": {
    answer: "按颜色分，可以分成四类：红色有苹果、草莓；黄色有香蕉；橙色有橘子；紫色有葡萄。",
    acceptedAnswers: [
      "按颜色分，可以分成四类：红色有苹果、草莓；黄色有香蕉；橙色有橘子；紫色有葡萄。",
      "红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：葡萄。",
      "分成四类：苹果和草莓，香蕉，橘子，葡萄。"
    ],
    explanationZhHans: "按通常颜色看，苹果和草莓是红色，香蕉是黄色，橘子是橙色，葡萄是紫色，所以可以分成四类。"
  },
  "bnu-primary-ds-v2-p1-060": {
    promptZhHans: "妈妈买了一些水果，有苹果、香蕉、橘子、紫葡萄和草莓。请你按水果的颜色分一分，并写出分类结果。",
    answer: "按颜色分：红色——苹果、草莓；黄色——香蕉；橙色——橘子；紫色——紫葡萄。",
    acceptedAnswers: [
      "按颜色分：红色——苹果、草莓；黄色——香蕉；橙色——橘子；紫色——紫葡萄。",
      "红色：苹果、草莓；黄色：香蕉；橙色：橘子；紫色：紫葡萄。",
      "按颜色分类：红色有苹果和草莓，黄色有香蕉，橙色有橘子，紫色有紫葡萄。"
    ],
    explanationZhHans: "先观察每种水果的颜色：苹果和草莓是红色，香蕉是黄色，橘子是橙色，紫葡萄是紫色。按颜色分类，把相同颜色的水果放在一起。"
  },
  "bnu-primary-ds-v2-p1-129": {
    promptZhHans: "小红的课程表写着：上午10时上数学课，下午2时上美术课。小红说：“上午10时和下午2时我都在学校上课。”她说的对吗？请说明理由。",
    answer: "对，因为课程表说明上午10时和下午2时她都在学校上课。",
    acceptedAnswers: ["对，因为课程表说明上午10时和下午2时她都在学校上课。", "对，两个时间都在学校上课。"],
    explanationZhHans: "题目给出的课程表明确说明上午10时上数学课，下午2时上美术课，所以这两个时间她都在学校上课。"
  },
  "bnu-primary-ds-v2-p1-171": {
    promptZhHans: "桌子上从左到右放着一个圆柱形的笔筒和一个正方体的橡皮。小丽从正面看这两个物体，她看到的形状是什么样的？请用一句话描述。",
    explanationZhHans: "从正面看，圆柱形笔筒显示为长方形，正方体橡皮显示为正方形。题目说明笔筒在左、橡皮在右，所以看到长方形在左，正方形在右。"
  },
  "bnu-primary-ds-v2-p1-175": {
    promptZhHans: "小华从正面看一个高和底面直径相等的圆柱，看到的是一个正方形；他又从上面看，看到的是一个圆形。这个物体是什么？",
    explanationZhHans: "高和底面直径相等的圆柱从正面看可以是正方形，从上面看是圆形，所以这个物体是圆柱。"
  },
  "bnu-primary-ds-v2-p2-060": {
    promptZhHans: "用两个同样的长方形（长是宽的2倍）沿不同边拼接，可以拼成什么图形？请写出两种：______、______。",
    explanationZhHans: "两个长是宽的2倍的同样长方形，沿长边拼接可以拼成正方形，沿短边拼接可以拼成长方形。"
  },
  "bnu-primary-ds-v2-p3-080": {
    answer: "约1600个字",
    acceptedAnswers: ["约1600个字", "约1600", "1600"],
    explanationZhHans: "每页大约203个字，可把203看作200，200×8=1600，所以这篇文章大约有1600个字。"
  },
  "bnu-primary-ds-v2-p3-115": {
    optionsZhHans: ["0.09", "0.99", "1.02", "0.9"],
    answer: "0.99",
    acceptedAnswers: ["0.99"],
    explanationZhHans: "0.09离1差0.91，0.99差0.01，1.02差0.02，0.9差0.1。差最小的是0.99，所以0.99最接近1。"
  },
  "bnu-primary-ds-v2-p4-036": {
    answer: "估算：1440千米；精确：1416千米",
    acceptedAnswers: ["估算：1440千米；精确：1416千米", "估算1440千米，精确1416千米", "约1440千米，1416千米"],
    explanationZhHans: "估算时把118看作120，120×12=1440，所以大约1440千米。精确计算：118×12=1416。"
  },
  "bnu-primary-ds-v2-p5-240": {
    promptZhHans: "学校图书室有故事书和科技书共544本，其中故事书的本数是科技书的3/5。科技书有多少本？",
    answer: "340",
    acceptedAnswers: ["340", "340本"],
    explanationZhHans: "设科技书有x本，则故事书有3/5 x本。x + 3/5 x = 544，8/5 x = 544，x = 544 × 5/8 = 340。所以科技书有340本。"
  }
};

const changed = {
  v1: patchRows(packages.v1, v1Patches),
  v2: patchRows(packages.v2, v2Patches)
};

console.log(JSON.stringify({ event: "bnu-primary-remediation-complete", changed }, null, 2));
