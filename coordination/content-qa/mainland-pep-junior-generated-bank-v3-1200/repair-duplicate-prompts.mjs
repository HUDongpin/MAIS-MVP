import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(__dirname, "batches");

const updates = {
  "pep-junior-v3-s3-k11-mc-007": {
    promptZhHans: "计算反比例函数化简中常见的整式积 (x+2)(x-3) 的结果是（ ）"
  },
  "pep-junior-v3-s1-k03-sa-010": {
    promptZhHans: "一个角的补角比它的余角的2倍多10°，求这个角的度数。",
    answer: "10°",
    acceptedAnswers: ["10°", "10度", "10"],
    explanationZhHans: "设这个角为x°，则它的补角为(180-x)°，余角为(90-x)°。根据题意得：180-x=2(90-x)+10。化简得180-x=190-2x，移项得x=10，所以这个角是10°。"
  },
  "pep-junior-v3-s1-k03-sa-014": {
    promptZhHans: "一个角的补角比它的余角的2倍多20°，求这个角的度数。",
    answer: "20°",
    acceptedAnswers: ["20°", "20度", "20"],
    explanationZhHans: "设这个角为x°，则补角为(180-x)°，余角为(90-x)°。由题意得180-x=2(90-x)+20，即180-x=200-2x，解得x=20。所以这个角的度数为20°。"
  },
  "pep-junior-v3-s2-k06-sa-011": {
    promptZhHans: "已知两个三角形的三边分别对应为3 cm、4 cm、5 cm和3 cm、4 cm、5 cm，判断这两个三角形是否全等，并写出依据。",
    answer: "全等，依据SSS",
    acceptedAnswers: ["全等，依据SSS", "全等，三边对应相等", "两个三角形全等，SSS"],
    explanationZhHans: "两个三角形的三边长度分别对应相等，满足三边对应相等的全等判定条件SSS，所以这两个三角形全等。"
  },
  "pep-junior-v3-s1-k03-mc-007": {
    promptZhHans: "关于直线、射线和线段，下列说法正确的是（ ）"
  },
  "pep-junior-v3-s1-k03-mc-017": {
    promptZhHans: "关于几何图形延长的说法，正确的是（ ）"
  },
  "pep-junior-v3-s2-k06-mc-026": {
    promptZhHans: "关于三角形全等判定，下列说法正确的是（ ）"
  },
  "pep-junior-v3-s1-k03-mc-018": {
    promptZhHans: "下列立体图形中，属于四棱柱的是（ ）"
  },
  "pep-junior-v3-s1-k04-sa-023": {
    promptZhHans: "直线a∥b，直线c与a、b相交，若一组同旁内角中的∠1=65°，求另一角∠2的度数。",
    answer: "115°",
    acceptedAnswers: ["115°", "115度", "115"],
    explanationZhHans: "两直线平行，同旁内角互补，所以∠1+∠2=180°。已知∠1=65°，则∠2=180°-65°=115°。"
  },
  "pep-junior-v3-s3-k10-mc-037": {
    promptZhHans: "在实数3.14、√4、π、22/7中，无理数是（ ）"
  },
  "pep-junior-v3-s3-k10-mc-067": {
    promptZhHans: "在实数√4、3.14、π/2、0.1010010001中，无理数是（ ）"
  },
  "pep-junior-v3-s2-k06-fi-015": {
    promptZhHans: "某三角形的两个内角分别为40°和65°，则第三个内角为______°。",
    answer: "75",
    acceptedAnswers: ["75", "75°", "75度"],
    explanationZhHans: "三角形内角和为180°，所以第三个内角为180°-40°-65°=75°。"
  },
  "pep-junior-v3-s2-k06-sa-015": {
    promptZhHans: "在△ABC中，∠A=45°，∠B=65°，则∠C的外角等于多少度？",
    answer: "110°",
    acceptedAnswers: ["110°", "110度", "110"],
    explanationZhHans: "三角形的一个外角等于与它不相邻的两个内角之和，所以∠C的外角=∠A+∠B=45°+65°=110°。"
  },
  "pep-junior-v3-s2-k07-mc-006": {
    promptZhHans: "在下列图形中，一般情况下不是轴对称图形的是（ ）"
  },
  "pep-junior-v3-s2-k07-mc-005": {
    promptZhHans: "已知△ABC和△DEF满足AB=DE、∠A=∠D，添加下列哪个条件仍不能判定两三角形全等（ ）"
  },
  "pep-junior-v3-s2-k07-mc-002": {
    promptZhHans: "若分式(x²-4)/(x+2)的值等于0，则满足条件的x为（ ）"
  },
  "pep-junior-v3-s2-k06-sa-027": {
    promptZhHans: "在△ABC中，∠A=48°，∠B=62°，求∠C的度数。",
    answer: "70°",
    acceptedAnswers: ["70°", "70度", "70"],
    explanationZhHans: "三角形内角和为180°，所以∠C=180°-48°-62°=70°。"
  },
  "pep-junior-v3-s2-k06-sa-030": {
    promptZhHans: "已知△ABC和△DEF中，AB=DE，BC=EF，AC=DF，说明两个三角形是否全等并写出依据。",
    answer: "△ABC≅△DEF，依据SSS",
    acceptedAnswers: ["△ABC≅△DEF，依据SSS", "全等，依据SSS", "三边对应相等，两个三角形全等"],
    explanationZhHans: "AB=DE，BC=EF，AC=DF，三组对应边分别相等，满足SSS全等判定，所以△ABC≅△DEF。"
  },
  "pep-junior-v3-s2-k07-mc-010": {
    promptZhHans: "判断x²-4x+4的因式分解，下列正确的是（ ）"
  },
  "pep-junior-v3-s2-k07-mc-021": {
    promptZhHans: "判断x²+4x+4的因式分解，下列正确的是（ ）"
  },
  "pep-junior-v3-s2-k07-mc-030": {
    promptZhHans: "下列四个代数式的因式分解中，正确的是（ ）"
  },
  "pep-junior-v3-s2-k08-mc-025": {
    promptZhHans: "在平行四边形ABCD中，∠B=130°，则∠D的度数为（ ）",
    answer: "130°",
    acceptedAnswers: ["130°", "130度"],
    explanationZhHans: "平行四边形的对角相等，∠D与∠B是对角，所以∠D=∠B=130°。"
  },
  "pep-junior-v3-s2-k08-mc-033": {
    promptZhHans: "下列二次根式化简后与√3同类的是（ ）"
  },
  "pep-junior-v3-s2-k09-mc-006": {
    promptZhHans: "在平行四边形ABCD中，∠B比∠A小40°，则∠C的度数为（ ）"
  },
  "pep-junior-v3-s2-k09-sa-016": {
    promptZhHans: "化简二次根式：√75 - √12 + √27。",
    answer: "6√3",
    acceptedAnswers: ["6√3", "6倍根号3"],
    explanationZhHans: "√75=5√3，√12=2√3，√27=3√3，所以原式=5√3-2√3+3√3=6√3。"
  },
  "pep-junior-v3-s3-k10-mc-065": {
    promptZhHans: "二次函数y=-2(x+1)²-3的顶点坐标为（ ）"
  },
  "pep-junior-v3-s3-k10-sa-005": {
    promptZhHans: "同时抛掷两枚质地均匀的硬币，求恰有一枚正面朝上的概率。",
    answer: "1/2",
    acceptedAnswers: ["1/2", "0.5"],
    explanationZhHans: "两枚硬币的等可能结果为（正，正）、（正，反）、（反，正）、（反，反）共4种。恰有一枚正面朝上的结果有2种，所以概率为2/4=1/2。"
  },
  "pep-junior-v3-s3-k10-sa-031": {
    promptZhHans: "已知关于x的一元二次方程x²-(2k-1)x+k²-k=0。求证：无论k取何实数，该方程总有两个不相等的实数根。",
    answer: "证明：Δ=(2k-1)²-4(k²-k)=1>0，所以方程总有两个不相等的实数根。",
    acceptedAnswers: ["证明：Δ=(2k-1)²-4(k²-k)=1>0，所以方程总有两个不相等的实数根。", "Δ=1>0，方程总有两个不相等的实数根"],
    explanationZhHans: "对于方程x²-(2k-1)x+k²-k=0，判别式Δ=[-(2k-1)]²-4(k²-k)=(2k-1)²-4k²+4k=4k²-4k+1-4k²+4k=1。因为1>0，所以无论k取何实数，方程总有两个不相等的实数根。"
  },
  "pep-junior-v3-s3-k10-sa-056": {
    promptZhHans: "用配方法解方程：x²+4x-5=0。",
    answer: "x₁=1, x₂=-5",
    acceptedAnswers: ["x₁=1, x₂=-5", "x₁=-5, x₂=1", "x=1 或 x=-5", "x=-5 或 x=1"],
    explanationZhHans: "移项得x²+4x=5。两边同时加上(4/2)²=4，得x²+4x+4=9，即(x+2)²=9。开平方得x+2=±3，所以x=1或x=-5。"
  }
};

let changed = 0;
for (const filename of fs.readdirSync(batchDir)) {
  if (!/^batch-\d{3}\.json$/.test(filename)) continue;
  const filePath = path.join(batchDir, filename);
  const batch = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let touched = false;
  batch.questions = batch.questions.map((question) => {
    const update = updates[question.id];
    if (!update) return question;
    touched = true;
    changed += 1;
    return { ...question, ...update };
  });
  if (touched) fs.writeFileSync(filePath, `${JSON.stringify(batch, null, 2)}\n`);
}

const expected = Object.keys(updates).length;
if (changed !== expected) {
  throw new Error(`Expected to update ${expected} rows, updated ${changed}`);
}

console.log(`Updated ${changed} duplicate prompt rows in batch caches.`);
