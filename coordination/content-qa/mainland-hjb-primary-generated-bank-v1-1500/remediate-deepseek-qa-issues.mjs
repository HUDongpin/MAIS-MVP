import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const questionsCsv = path.join(__dirname, "questions.csv");
const questionPackJson = path.join(__dirname, "question-pack.json");
const batchDir = path.join(__dirname, "batches");

const remediationNote =
  "S18 remediated after DeepSeek-v4-pro QA on 2026-05-25; candidate QA package only, not approved for public integration.";

const updates = {
  "hjb-primary-ds-v1-p1-016": {
    promptZhHans:
      "在数学课上，老师要求小朋友先和同桌说一说，再举手回答。老师问：“教室里有3个红气球和2个蓝气球，红气球比蓝气球多几个？”下面哪个做法既符合老师要求，又回答正确？",
    optionsZhHans: [
      "A. 不和同桌交流，马上说“多1个”",
      "B. 先和同桌说一说，再举手回答“多2个”",
      "C. 先和同桌说一说，再举手回答“多1个”",
      "D. 先和同桌说一说，再说“红气球少1个”"
    ],
    answer: "C. 先和同桌说一说，再举手回答“多1个”",
    acceptedAnswers: ["C. 先和同桌说一说，再举手回答“多1个”"],
    explanationZhHans: "老师要求先交流再回答。3比2多1，所以红气球比蓝气球多1个，只有C既符合要求又回答正确。"
  },
  "hjb-primary-ds-v1-p1-064": {
    optionsZhHans: ["5 + 3 = 8", "5 - 3 = 2", "8 - 5 = 3", "5 + 4 = 9"],
    answer: "5 + 3 = 8",
    acceptedAnswers: ["5 + 3 = 8"],
    explanationZhHans: "求一共有多少支铅笔，要把两人的铅笔合起来，用加法。小明5支，小红3支，所以正确算式是5+3=8。"
  },
  "hjb-primary-ds-v1-p1-224": {
    answer: "红",
    acceptedAnswers: ["红", "红色"],
    explanationZhHans: "彩旗每3面为一组：红、黄、蓝。10÷3=3组余1面，余1就是下一组的第1面，所以第10面是红色。"
  },
  "hjb-primary-ds-v1-p1-236": {
    answer: "两道题都算对了",
    acceptedAnswers: ["两道题都算对了", "两道都对", "两题都正确", "第一题和第二题都算对了"],
    explanationZhHans:
      "第一题45+8，先加5凑成50，再加3得53，正确。第二题62-9，先减2得60，再减7得53，也正确。所以两道题都算对了。"
  },
  "hjb-primary-ds-v1-p1-239": {
    promptZhHans: "计算34 + 9时，下面哪种方法体现了“先加10，再减1”的简便想法？",
    answer: "先算34+10=44，再算44-1=43",
    acceptedAnswers: ["先算34+10=44，再算44-1=43"],
    explanationZhHans: "把9看作10-1，就可以先算34+10=44，再算44-1=43。这个方法正是“先加10，再减1”。"
  },
  "hjb-primary-ds-v1-p1-244": {
    optionsZhHans: ["11时55分", "12时08分", "11时45分", "12时10分"],
    answer: "11时55分",
    acceptedAnswers: ["11时55分"],
    explanationZhHans: "11时55分与12时相差5分钟，12时08分相差8分钟，11时45分相差15分钟，12时10分相差10分钟，所以最接近的是11时55分。"
  },
  "hjb-primary-ds-v1-p2-032": {
    answer: "2元2角",
    acceptedAnswers: ["2元2角", "2元，2角"],
    explanationZhHans: "小明有5元+3元+1元=9元。玩具车6元8角，9元-6元8角=2元2角，所以够买，应找回2元2角。"
  },
  "hjb-primary-ds-v1-p2-013": {
    optionsZhHans: [
      "十位 6 退 1 变成 5，个位 3 加 10 变成 13，13 减 7 得 6，十位 5 减 2 得 3，结果是 36",
      "十位 6 不变，个位 3 减 7 不够，直接写 6，结果是 46",
      "十位 6 退 1 变成 5，个位 3 变成 13，13 减 7 得 6，十位 6 减 2 得 4，结果是 46",
      "十位 6 退 1 变成 5，个位 3 加 10 变成 13，13 减 7 得 6，十位 5 减 3 得 2，结果是 26"
    ],
    answer: "十位 6 退 1 变成 5，个位 3 加 10 变成 13，13 减 7 得 6，十位 5 减 2 得 3，结果是 36",
    acceptedAnswers: ["十位 6 退 1 变成 5，个位 3 加 10 变成 13，13 减 7 得 6，十位 5 减 2 得 3，结果是 36"],
    explanationZhHans: "63-27中，个位3减7不够，要从十位退1，个位变成13，十位6变成5。13-7=6，5-2=3，所以结果是36，只有A完整且正确。"
  },
  "hjb-primary-ds-v1-p2-040": {
    promptZhHans: "小芳付给售货员5元，买一块2元8角的橡皮。售货员应该找回多少钱？",
    optionsZhHans: ["2元2角", "3元2角", "2元8角", "1元2角"],
    answer: "2元2角",
    acceptedAnswers: ["2元2角", "2元，2角"],
    explanationZhHans: "5元可以看作4元10角。4元10角减2元8角等于2元2角，所以售货员应该找回2元2角。"
  },
  "hjb-primary-ds-v1-p2-019": {
    promptZhHans:
      "小明计算 90 - 45 时，个位 0 减 5 不够减，他从十位退 1 当 10，个位变成 10 减 5 得 5；十位 9 退 1 后剩 8，再减 4 得 4，所以他得到 45。下面哪句话说得对？",
    answer: "个位 0 减 5 不够减，应该从十位退 1 当 10，但十位是 9，退 1 后应该剩 8，他算对了",
    acceptedAnswers: ["个位 0 减 5 不够减，应该从十位退 1 当 10，但十位是 9，退 1 后应该剩 8，他算对了"],
    explanationZhHans: "90-45，个位0减5不够，向十位借1，十位9借1剩8，个位10-5=5，十位8-4=4，得45。小明的计算过程和结果都是正确的。"
  },
  "hjb-primary-ds-v1-p2-071": {
    promptZhHans: "每盘有4个苹果，有3盘。一共有（ ）个苹果。乘法算式可以写成：______。",
    answer: "12；4×3=12",
    acceptedAnswers: ["12；4×3=12", "12；3×4=12", "一共有12个苹果，4×3=12", "一共有12个苹果，3×4=12"],
    explanationZhHans: "每盘4个，3盘就是3个4，用乘法4×3=12，也可以写成3×4=12。"
  },
  "hjb-primary-ds-v1-p2-076": {
    optionsZhHans: ["4×7=28", "4+7=11", "28−4=24", "7+4=11"],
    answer: "4×7=28",
    acceptedAnswers: ["4×7=28"],
    explanationZhHans: "4个盒子一共28支，每个盒子有7支。表示总数可以用4×7=28。其他选项不是表示4个7的乘法。"
  },
  "hjb-primary-ds-v1-p2-095": {
    promptZhHans: "按“是否主要生活在水中”把下面的动物分成两类：猫、狗、金鱼、鸟、马。一类是（ ），另一类是（ ）。",
    answer: "主要生活在水中的：金鱼；不主要生活在水中的：猫、狗、鸟、马",
    acceptedAnswers: [
      "主要生活在水中的：金鱼；不主要生活在水中的：猫、狗、鸟、马",
      "水中生活：金鱼；不在水中生活：猫、狗、鸟、马",
      "金鱼；猫、狗、鸟、马"
    ],
    explanationZhHans: "按是否主要生活在水中分类，金鱼主要生活在水中；猫、狗、鸟、马不主要生活在水中。"
  },
  "hjb-primary-ds-v1-p2-101": {
    promptZhHans: "小丽把班级图书角的书按种类整理：故事书有9本，科普书有6本，漫画书有4本。图书角这三类书一共有多少本？",
    answer: "19本",
    acceptedAnswers: ["19本", "19"],
    explanationZhHans: "把三类书的数量相加：9+6+4=19（本），所以图书角这三类书一共有19本。"
  },
  "hjb-primary-ds-v1-p2-107": {
    promptZhHans:
      "按“是否主要生活在水中”把下面的动物分成两类，并写出分类标准。动物：金鱼、燕子、蝴蝶、鲨鱼、老鹰、蜻蜓。第一类：______，第二类：______。分类标准：______。",
    answer: "第一类：金鱼、鲨鱼；第二类：燕子、蝴蝶、老鹰、蜻蜓；分类标准：是否主要生活在水中",
    acceptedAnswers: [
      "第一类：金鱼、鲨鱼；第二类：燕子、蝴蝶、老鹰、蜻蜓；分类标准：是否主要生活在水中",
      "金鱼、鲨鱼；燕子、蝴蝶、老鹰、蜻蜓；是否主要生活在水中",
      "水中生活：金鱼、鲨鱼；不在水中生活：燕子、蝴蝶、老鹰、蜻蜓"
    ],
    explanationZhHans: "金鱼、鲨鱼主要生活在水中；燕子、蝴蝶、老鹰、蜻蜓不主要生活在水中，所以可以按是否主要生活在水中分类。"
  },
  "hjb-primary-ds-v1-p2-154": {
    promptZhHans: "下面哪种情况表示“12里面有几个4”，可以用除法算式“12÷4=3”解决？",
    optionsZhHans: [
      "把12支铅笔平均分给3个同学，每人分到几支？",
      "把12支铅笔平均分给6个同学，每人分到几支？",
      "有12支铅笔，每3支放一盒，可以放几盒？",
      "有12支铅笔，每4支放一盒，可以放几盒？"
    ],
    answer: "有12支铅笔，每4支放一盒，可以放几盒？",
    acceptedAnswers: ["有12支铅笔，每4支放一盒，可以放几盒？"],
    explanationZhHans: "“12里面有几个4”就是每4支放一盒，求可以放几盒，用12÷4=3。"
  },
  "hjb-primary-ds-v1-p2-160": {
    promptZhHans: "下面哪个问题表示“把15平均分成3份，求每份是多少”，可以用“15÷3”来解决？",
    optionsZhHans: [
      "把15个气球平均分给3个小朋友，每人分几个？",
      "有15个气球，送给小朋友3个，还剩几个？",
      "有15个气球，每5个扎成一束，可以扎成几束？",
      "小明有15个气球，小红有3个气球，小明比小红多几个？"
    ],
    answer: "把15个气球平均分给3个小朋友，每人分几个？",
    acceptedAnswers: ["把15个气球平均分给3个小朋友，每人分几个？"],
    explanationZhHans: "把15个气球平均分给3个小朋友，求每人几个，就是15÷3。其他选项分别用减法或15÷5解决。"
  },
  "hjb-primary-ds-v1-p2-223": {
    answer: "900 - 410",
    acceptedAnswers: ["900 - 410", "900-410"],
    explanationZhHans: "320+190=510，800-290=510，150+360=510，900-410=490。只有900-410的得数比500小。"
  },
  "hjb-primary-ds-v1-p3-044": {
    explanationZhHans: "先加1小时：下午2:40到下午3:40；再加50分钟：下午3:40到下午4:30。所以结束时间是下午4:30。"
  },
  "hjb-primary-ds-v1-p3-047": {
    explanationZhHans: "9:10出发，路上35分钟，到图书馆是9:45；看书1小时20分钟后是11:05；返回再用35分钟，到家是11:40。"
  },
  "hjb-primary-ds-v1-p3-051": {
    answer: "7:57",
    acceptedAnswers: ["7:57", "7时57分", "7点57分"],
    explanationZhHans: "走到一半用15÷2=7.5分钟，原路返回也用7.5分钟，拿作业本2分钟，再从家到学校用15分钟，总用时7.5+7.5+2+15=32分钟。7:25加32分钟是7:57。"
  },
  "hjb-primary-ds-v1-p3-052": {
    answer: "10:53",
    acceptedAnswers: ["10:53", "10时53分"],
    explanationZhHans: "题目已说明小丽的上场时间是10:45，朗诵时长8分钟，所以结束时间是10:45+8分钟=10:53。"
  },
  "hjb-primary-ds-v1-p3-070": {
    promptZhHans: "下面哪道题的积的个位是0？",
    answer: "4 × 270",
    acceptedAnswers: ["4 × 270", "4×270"],
    explanationZhHans: "3×214=642，6×152=912，4×270=1080，5×183=915。只有1080的个位是0，所以选4×270。"
  },
  "hjb-primary-ds-v1-p3-079": {
    promptZhHans: "计算258×4，下面哪个结果正确？",
    optionsZhHans: ["1032", "1232", "1002", "932"],
    answer: "1032",
    acceptedAnswers: ["1032"],
    explanationZhHans: "258×4：8×4=32，个位写2进3；5×4+3=23，十位写3进2；2×4+2=10，所以结果是1032。"
  },
  "hjb-primary-ds-v1-p3-137": {
    promptZhHans: "计算48÷4时，可以想：48里面有（ ）个4，商是（ ）。用乘法验算：（ ）×4=48。",
    answer: "12，12，12",
    acceptedAnswers: ["12，12，12", "12,12,12", "12 12 12"],
    explanationZhHans: "因为12×4=48，所以48里面有12个4，48÷4的商是12。验算时用12×4=48。"
  },
  "hjb-primary-ds-v1-p3-139": {
    optionsZhHans: ["A. 79÷4", "B. 82÷4", "C. 75÷4", "D. 88÷4"],
    answer: "A. 79÷4",
    acceptedAnswers: ["A. 79÷4", "79÷4"],
    explanationZhHans: "79与80相差1，82与80相差2，75与80相差5，88与80相差8。估算时把被除数看作80最合适的是79÷4。"
  },
  "hjb-primary-ds-v1-p3-140": {
    promptZhHans: "计算96÷8时，商是（ ）。用乘法验算：（ ）×8=96。",
    answer: "12，12",
    acceptedAnswers: ["12，12", "12,12", "12 12"],
    explanationZhHans: "96÷8=12。验算时用商乘除数，12×8=96，所以计算正确。"
  },
  "hjb-primary-ds-v1-p3-146": {
    promptZhHans: "计算48÷3时，可以想：3×（ ）=48，所以48÷3=（ ）。",
    answer: "16，16",
    acceptedAnswers: ["16，16", "16,16", "16 16"],
    explanationZhHans: "因为3×16=48，所以48÷3=16。"
  },
  "hjb-primary-ds-v1-p3-227": {
    optionsZhHans: ["绘画小组的人数比舞蹈小组多2人", "书法小组的人数最少", "合唱小组的人数比书法小组多8人", "舞蹈小组的人数比绘画小组少2人"],
    answer: "书法小组的人数最少",
    acceptedAnswers: ["书法小组的人数最少"],
    explanationZhHans: "各小组人数是合唱18人、绘画15人、舞蹈12人、书法9人，书法小组人数最少。其他说法中的差值都不正确。"
  },
  "hjb-primary-ds-v1-p3-229": {
    optionsZhHans: ["跳绳达标人数最多", "仰卧起坐达标人数最多", "跑步达标人数比立定跳远达标人数多3人", "跳绳达标人数比仰卧起坐达标人数多8人"],
    answer: "跳绳达标人数最多",
    acceptedAnswers: ["跳绳达标人数最多"],
    explanationZhHans: "比较人数：30>28>25>20，跳绳达标人数最多。仰卧起坐不是最多，跑步比立定跳远少3人，跳绳比仰卧起坐多10人。"
  },
  "hjb-primary-ds-v1-p3-231": {
    optionsZhHans: ["喜欢草莓的人数最多，是15人", "喜欢香蕉的人数比苹果多3人", "喜欢橘子的人数最多，是5人", "喜欢草莓的人数比橘子多9人"],
    answer: "喜欢草莓的人数最多，是15人",
    acceptedAnswers: ["喜欢草莓的人数最多，是15人"],
    explanationZhHans: "草莓15人最多。香蕉比苹果多12-8=4人，不是3人；橘子5人最少；草莓比橘子多15-5=10人，不是9人。"
  },
  "hjb-primary-ds-v1-p3-235": {
    optionsZhHans: ["小宇跳得最多，是148下", "小杰比小文多跳6下", "小琪跳得最少，是139下", "小宇比小琪多跳8下"],
    answer: "小宇跳得最多，是148下",
    acceptedAnswers: ["小宇跳得最多，是148下"],
    explanationZhHans: "比较数据：148>142>139>135，所以小宇跳得最多。小杰比小文多7下，小文跳得最少，小宇比小琪多9下。"
  },
  "hjb-primary-ds-v1-p4-013": {
    optionsZhHans: ["A. 72 ÷ □ = 8", "B. 96 ÷ □ = 12", "C. 84 ÷ □ = 7", "D. 99 ÷ □ = 9"],
    answer: "C. 84 ÷ □ = 7",
    acceptedAnswers: ["C. 84 ÷ □ = 7"],
    explanationZhHans: "根据除法关系，□=被除数÷商。A中□=9，B中□=8，C中□=12，D中□=11，所以C中的□代表的数最大。"
  },
  "hjb-primary-ds-v1-p4-052": {
    answer: "第二根更长",
    acceptedAnswers: ["第二根更长"],
    explanationZhHans: "绳子同样长，比较2/5和3/7。通分：2/5=14/35，3/7=15/35，14/35<15/35，所以3/7更大，第二根剪下的部分更长。"
  },
  "hjb-primary-ds-v1-p4-154": {
    optionsZhHans: ["9×(4×25)", "36×20+36×5", "30×25+6×25", "36×5+5"],
    answer: "36×5+5",
    acceptedAnswers: ["36×5+5"],
    explanationZhHans: "9×(4×25)=36×25，36×20+36×5=36×25，30×25+6×25=36×25；36×5+5=185，与36×25=900不相等。"
  },
  "hjb-primary-ds-v1-p4-157": {
    optionsZhHans: ["36×20+5", "9×(4×25)", "30×25+6", "36×5+5"],
    answer: "9×(4×25)",
    acceptedAnswers: ["9×(4×25)"],
    explanationZhHans: "36×25=9×4×25=9×(4×25)，体现了先把36拆成9×4，再与25结合计算。其他选项的值都不等于36×25。"
  },
  "hjb-primary-ds-v1-p4-173": {
    answer: "正确，得数是5.05。",
    acceptedAnswers: ["正确，得数是5.05。", "正确，5.05", "正确"],
    explanationZhHans: "3.25+1.8要把小数点对齐，1.8可看作1.80。3.25+1.80=5.05，小明的计算过程和结果都是正确的。"
  },
  "hjb-primary-ds-v1-p4-185": {
    optionsZhHans: ["一直上升", "先上升后下降再上升", "先下降后上升", "一直下降"],
    answer: "先上升后下降再上升",
    acceptedAnswers: ["先上升后下降再上升"],
    explanationZhHans: "从周一到周六，气温25→26先上升，26→24下降，24→27→28→30又上升，所以变化趋势是先上升后下降再上升。"
  },
  "hjb-primary-ds-v1-p4-230": {
    promptZhHans:
      "小雅在整理本学期数学知识时，需要完成以下任务：\n1. 将小数 3.148 用“五舍六入”法保留一位小数，结果是（ ）。\n2. 在同一平面内，如果直线 a 垂直于直线 b，直线 b 垂直于直线 c，那么直线 a 与直线 c 的位置关系是（ ）。\n3. 观察下面折线统计图描述的数据：某城市2024年1月至6月的月平均气温分别为5℃、8℃、14℃、21℃、25℃、28℃。从几月到几月气温上升最快？答：（ ）月到（ ）月。\n请按顺序填写三个答案，用中文分号“；”隔开。",
    answer: "3.1；平行；3月到4月",
    acceptedAnswers: ["3.1；平行；3月到4月"],
    explanationZhHans: "1. 3.148保留一位小数，看百分位是4，舍去，结果为3.1。2. 同一平面内，垂直于同一直线的两条直线互相平行，所以a∥c。3. 相邻月份温差为3℃、6℃、7℃、4℃、3℃，上升最快的是3月到4月。"
  },
  "hjb-primary-ds-v1-p4-232": {
    acceptedAnswers: ["4.60"],
    explanationZhHans: "4.596精确到百分位，要看千分位。千分位是6，百分位9向前进1，结果写作4.60，保留到百分位要写出末尾的0。"
  },
  "hjb-primary-ds-v1-p4-235": {
    promptZhHans: "下面是某地一周内每天最高气温的折线统计图数据：星期一25°C，星期二26°C，星期三27°C，星期四28°C，星期五29°C，星期六30°C，星期日31°C。这一周最高气温的总体变化趋势是怎样的？",
    answer: "持续上升",
    acceptedAnswers: ["持续上升"],
    explanationZhHans: "从星期一到星期日，最高气温依次为25、26、27、28、29、30、31，每天都比前一天高，所以总体变化趋势是持续上升。"
  },
  "hjb-primary-ds-v1-p4-243": {
    promptZhHans: "下面是四（1）班同学最喜欢的水果人数统计：苹果12人，香蕉8人，橘子10人，葡萄6人。要清楚比较喜欢每种水果的人数，下面说法正确的是？",
    optionsZhHans: ["条形统计图更适合比较不同水果的人数", "折线统计图最适合表示水果种类", "水果种类是连续变化的量", "不能用统计图表示这些数据"],
    answer: "条形统计图更适合比较不同水果的人数",
    acceptedAnswers: ["条形统计图更适合比较不同水果的人数"],
    explanationZhHans: "水果种类是离散类别，要比较各类人数，条形统计图更合适；折线统计图更常用于表示连续变化趋势。"
  },
  "hjb-primary-ds-v1-p4-246": {
    optionsZhHans: ["3.44", "3.55", "3.62", "3.66"],
    answer: "3.55",
    acceptedAnswers: ["3.55"],
    explanationZhHans: "五舍六入保留一位小数，看百分位。3.55百分位是5，舍去后得3.5；3.44得3.4，3.62得3.6，3.66得3.7。"
  },
  "hjb-primary-ds-v1-p4-249": {
    promptZhHans: "用数对表示位置时，小军在教室的位置是（4，3），他的右侧同桌与他在同一行、相邻一列。下面哪个数对可能是他右侧同桌的位置？",
    answer: "（5，3）",
    acceptedAnswers: ["（5，3）", "(5,3)"],
    explanationZhHans: "右侧同桌与小军在同一行，所以第二个数仍是3；右侧相邻一列，列数从4变为5，因此位置是（5，3）。"
  },
  "hjb-primary-ds-v1-p4-250": {
    optionsZhHans: ["1.95", "2.14", "1.96", "2.15"],
    answer: "1.96",
    acceptedAnswers: ["1.96"],
    explanationZhHans: "五舍六入保留一位小数，看百分位。1.96百分位是6，十分位9入1后向个位进1，得2.0。其他选项分别得1.9、2.1、2.1。"
  },
  "hjb-primary-ds-v1-p5-006": {
    promptZhHans: "小杰用一根长12.5米的彩带包装礼物。他先剪下2.8米，剩下的彩带平均分成3段。每段彩带长多少米？先估算，再列式计算，结果保留两位小数。",
    answer: "3.23米",
    acceptedAnswers: ["3.23米", "3.23"],
    explanationZhHans: "先估算：12.5-2.8≈10，10÷3≈3.3。精确计算：12.5-2.8=9.7，9.7÷3=3.233…，保留两位小数约为3.23米。"
  },
  "hjb-primary-ds-v1-p5-010": {
    promptZhHans: "下面哪个算式的积最大？",
    answer: "0.7×0.8",
    acceptedAnswers: ["0.7×0.8", "0.7 x 0.8", "0.7*0.8"],
    explanationZhHans: "分别计算：0.7×0.8=0.56，1.2×0.05=0.06，0.25×0.4=0.1，0.03×0.9=0.027。0.56最大，所以选0.7×0.8。"
  },
  "hjb-primary-ds-v1-p5-013": {
    optionsZhHans: ["0.42 × 0.73", "4.2 × 0.073", "42 × 0.0073", "0.042 × 0.73"],
    answer: "0.042 × 0.73",
    acceptedAnswers: ["0.042 × 0.73", "0.042×0.73", "D"],
    explanationZhHans: "前三个算式的积都是0.3066；0.042×0.73=0.03066，明显更小，所以积最小的是0.042×0.73。"
  },
  "hjb-primary-ds-v1-p5-080": {
    promptZhHans: "一个平行四边形的一条底边长15厘米，这条底边上的高是8厘米。这个平行四边形的面积是多少平方厘米？",
    answer: "120",
    acceptedAnswers: ["120", "120平方厘米"],
    explanationZhHans: "平行四边形面积=底×高。底边15厘米，对应的高8厘米，所以面积=15×8=120平方厘米。"
  },
  "hjb-primary-ds-v1-p5-096": {
    promptZhHans: "下面是五年级（1）班第一小组6名同学1分钟跳绳的成绩（单位：下）：\n148，152，139，145，150，140。\n（1）这组数据的平均数是多少？结果保留一位小数。\n（2）根据平均数，你能得出什么结论？请用数据说明。",
    answer: "（1）平均数约是145.7下；（2）结论合理即可，例如：这组同学的平均跳绳成绩约为145.7下，大部分同学的成绩在140下以上，整体水平较好。",
    acceptedAnswers: ["（1）平均数约是145.7下；（2）结论合理即可，例如：这组同学的平均跳绳成绩约为145.7下，大部分同学的成绩在140下以上，整体水平较好。", "平均数约145.7下，结论合理即可。", "145.7下，结论合理即可。"],
    explanationZhHans: "平均数=(148+152+139+145+150+140)÷6=874÷6≈145.7（下）。结论应围绕平均数说明整体水平，例如多数同学接近或超过140下。"
  },
  "hjb-primary-ds-v1-p5-098": {
    promptZhHans: "下面是五年级（1）班第一小组6名同学1分钟跳绳的成绩记录（单位：下）：\n小杰：142  小雅：138  小浩：145  小雯：140  小凯：136  小婷：149\n请计算这组数据的平均数，结果四舍五入取整，并回答：这个平均数表示什么？",
    answer: "平均数约是142下。它表示这6名同学1分钟跳绳的整体水平，相当于把总次数平均分给每个人。",
    acceptedAnswers: ["平均数约是142下。它表示这6名同学1分钟跳绳的整体水平，相当于把总次数平均分给每个人。", "平均数约142下，表示这组同学跳绳的平均成绩。", "142下，代表这组数据的平均水平。"],
    explanationZhHans: "总次数为142+138+145+140+136+149=850下，850÷6≈141.67，四舍五入取整约为142下。平均数反映这组数据的整体水平。"
  },
  "hjb-primary-ds-v1-p5-119": {
    answer: "五（1）班平均每组收集的废电池多，多1.25节。",
    acceptedAnswers: ["五（1）班平均每组收集的废电池多，多1.25节。", "五（1）班多，多1.25节。", "五（1）班平均多1.25节。"],
    explanationZhHans: "五（1）班平均：(28+32+30+34)÷4=31节；五（2）班平均：(26+31+29+33)÷4=29.75节。31-29.75=1.25节，所以五（1）班平均每组多1.25节。"
  },
  "hjb-primary-ds-v1-p5-185": {
    promptZhHans: "学校合唱队有男生24人，女生36人。男生人数是女生的几分之几？下面哪个最简分数是正确的？",
    answer: "2/3",
    acceptedAnswers: ["2/3"],
    explanationZhHans: "男生人数是女生人数的24/36，分子和分母同时除以12，得到最简分数2/3。"
  },
  "hjb-primary-ds-v1-p5-220": {
    promptZhHans: "下面是某地2023年各月平均气温的折线统计图数据：1月2℃，2月5℃，3月10℃，4月16℃，5月22℃，6月28℃，7月30℃，8月29℃，9月25℃，10月18℃，11月10℃，12月4℃。从几月到几月气温上升最快？若有多组上升幅度相同，请写最早出现的一组。",
    answer: "3月到4月",
    acceptedAnswers: ["3月到4月", "三月到四月"],
    explanationZhHans: "相邻月份中，3月到4月、4月到5月、5月到6月都上升6℃。题目要求若有多组相同写最早出现的一组，所以填3月到4月。"
  },
  "hjb-primary-ds-v1-p5-226": {
    promptZhHans: "下表记录了某城市2024年1月至6月的月平均气温。\n\n| 月份 | 1月 | 2月 | 3月 | 4月 | 5月 | 6月 |\n|------|-----|-----|-----|-----|-----|-----|\n| 气温（℃） | 2 | 5 | 10 | 16 | 22 | 28 |\n\n根据表中数据，气温上升最快的相邻两个月是______月和______月。若有多组上升幅度相同，请写最早出现的一组。",
    answer: "3,4",
    acceptedAnswers: ["3,4", "3月和4月", "3月、4月"],
    explanationZhHans: "相邻两月温差为3℃、5℃、6℃、6℃、6℃。最大上升幅度是6℃，最早出现的是3月到4月，所以填3月和4月。"
  },
  "hjb-primary-ds-v1-p6-008": {
    answer: "3",
    acceptedAnswers: ["3", "三个"],
    explanationZhHans: "奇数有1、9、13、21、27、31；合数有9、21、27。既是奇数又是合数的是9、21、27，共3个。注意1既不是质数也不是合数。"
  },
  "hjb-primary-ds-v1-p6-013": {
    optionsZhHans: ["2", "8", "11", "15"],
    answer: "15",
    acceptedAnswers: ["15"],
    explanationZhHans: "2是质数且偶数，8是合数但不是奇数，11是质数，15=3×5，既是合数又是奇数，所以选15。"
  },
  "hjb-primary-ds-v1-p6-015": {
    promptZhHans: "有一箱苹果，数量不少于40个且不多于50个。如果2个2个地数，正好数完；如果5个5个地数，也正好数完。这箱苹果可能有多少个？请写出所有可能的答案。",
    answer: "40,50",
    acceptedAnswers: ["40,50", "40和50", "40、50"],
    explanationZhHans: "既是2的倍数又是5的倍数，就是10的倍数。不少于40且不多于50的10的倍数有40和50，所以可能是40个或50个。"
  },
  "hjb-primary-ds-v1-p6-028": {
    optionsZhHans: ["3/4 + 1/6 = 4/10", "3/4 + 1/6 = 9/12 + 2/12 = 11/12", "3/4 + 1/6 = 3/10 + 1/10 = 4/10", "3/4 + 1/6 = 18/24 + 6/24 = 24/24"],
    answer: "3/4 + 1/6 = 9/12 + 2/12 = 11/12",
    acceptedAnswers: ["3/4 + 1/6 = 9/12 + 2/12 = 11/12"],
    explanationZhHans: "3/4和1/6先通分到12，3/4=9/12，1/6=2/12，所以和为11/12。其他选项通分或相加结果不正确。"
  },
  "hjb-primary-ds-v1-p6-120": {
    promptZhHans: "六（1）班同学在“最喜欢的课间活动”调查中，统计结果如下：跳绳12人，踢毽子8人，下棋6人，阅读4人。请写出一个正确说法，并说明理由。",
    answer: "喜欢跳绳的人数最多，占总人数的40%。",
    acceptedAnswers: ["喜欢跳绳的人数最多，占总人数的40%。", "跳绳人数最多，占40%。", "跳绳最多，占40%。"],
    explanationZhHans: "总人数为12+8+6+4=30人。跳绳12人，占比12÷30=0.4=40%，且人数最多，所以这个说法正确。"
  },
  "hjb-primary-ds-v1-p6-122": {
    promptZhHans:
      "一个不透明的袋子里装有红、黄、蓝三种颜色的球共20个，除颜色外完全相同。下表是摸球试验的记录（每次摸出一个球，记录颜色后放回并摇匀）：\n\n| 颜色 | 红 | 黄 | 蓝 |\n|------|----|----|----|\n| 次数 | 8  | 12 | 5  |\n\n根据试验数据，摸到哪种颜色的球的可能性比摸到蓝球的可能性大？请填一种颜色。",
    answer: "黄球",
    acceptedAnswers: ["黄球", "黄色球", "黄"],
    explanationZhHans: "试验中黄球摸出12次，蓝球摸出5次，12大于5，所以摸到黄球的可能性比摸到蓝球的可能性大。"
  },
  "hjb-primary-ds-v1-p6-143": {
    promptZhHans: "一个圆锥形粮堆，底面半径是3米，高是1.2米。如果每立方米粮食重0.75吨，这堆粮食大约重多少吨？（π取3.14，结果保留一位小数）",
    answer: "8.5",
    acceptedAnswers: ["8.5", "8.5吨"],
    explanationZhHans: "圆锥体积=1/3×3.14×3²×1.2=11.304立方米。粮食重量=11.304×0.75=8.478吨，保留一位小数约为8.5吨。"
  }
};

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function atomicWrite(filePath, text) {
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, text);
  fs.renameSync(tempPath, filePath);
}

function writeJsonl(filePath, rows) {
  atomicWrite(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  atomicWrite(filePath, `${lines.join("\n")}\n`);
}

function mergeQuestion(row, patch) {
  const next = { ...row, ...patch };
  next.optionsZhHans = next.type === "multiple-choice" ? next.optionsZhHans ?? [] : [];
  next.acceptedAnswers = Array.from(new Set([next.answer, ...(next.acceptedAnswers ?? [])].filter(Boolean)));
  next.reviewNotes = remediationNote;
  return next;
}

function batchNumberForId(id) {
  const match = id.match(/p(\d)-(\d{3})$/);
  if (!match) throw new Error(`Cannot infer batch for ${id}`);
  return (Number(match[1]) - 1) * 50 + Math.ceil(Number(match[2]) / 5);
}

const rows = readJsonl(questionsJsonl);
const rowById = new Map(rows.map((row) => [row.id, row]));

for (const id of Object.keys(updates)) {
  if (!rowById.has(id)) throw new Error(`Missing question ${id}`);
  rowById.set(id, mergeQuestion(rowById.get(id), updates[id]));
}

const remediatedRows = rows.map((row) => rowById.get(row.id));
writeJsonl(questionsJsonl, remediatedRows);
atomicWrite(questionPackJson, `${JSON.stringify({ questions: remediatedRows }, null, 2)}\n`);
writeCsv(questionsCsv, remediatedRows, [
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
]);

const updatedBatchNumbers = new Set(Object.keys(updates).map(batchNumberForId));
const batchSize = 5;
for (let index = 0; index < remediatedRows.length; index += batchSize) {
  const batchNumber = index / batchSize + 1;
  const batchId = `batch-${String(batchNumber).padStart(3, "0")}`;
  const batchPath = path.join(batchDir, `${batchId}.json`);
  atomicWrite(batchPath, `${JSON.stringify({ batchId, questions: remediatedRows.slice(index, index + batchSize) }, null, 2)}\n`);
}

console.log(`Remediated ${Object.keys(updates).length} DeepSeek QA issue rows and rebuilt ${remediatedRows.length / batchSize} batch caches (${updatedBatchNumbers.size} touched by id).`);
