import fs from "node:fs";
import path from "node:path";

const learnerFields = ["promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"];

export const hjbPrimaryA18Corrections = Object.freeze({
  "hjb-primary-ds-v1-p1-125": {
    answer: "平十法",
    acceptedAnswers: ["分拆减数", "分拆减数法", "平十", "平十法", "splitting the subtrahend", "bridge-to-ten method"],
    explanationZhHans: "把减数8拆成7和1，先减7凑成10，再减1得9。这种方法叫平十法，也叫分拆减数法。"
  },
  "hjb-primary-ds-v1-p1-128": {
    answer: "平十法",
    acceptedAnswers: ["连减", "连减法", "分拆减数", "分拆减数法", "平十", "平十法", "successive subtraction", "splitting the subtrahend", "bridge-to-ten method"],
    explanationZhHans: "把减数7拆成2和5，先减2凑成10，再减5得5。这是连减法，也叫平十法或分拆减数法。"
  },
  "hjb-primary-ds-v1-p2-028": {
    promptZhHans: "下面哪个金额正好等于3元8角？",
    optionsZhHans: ["3.3元", "3.7元", "3.8元", "3.9元"],
    answer: "3.8元",
    acceptedAnswers: ["3.8元", "3.8 yuan"],
    explanationZhHans: "8角=0.8元，所以3元8角=3.8元，只有第三个选项正确。"
  },
  "hjb-primary-ds-v1-p2-064": {
    promptZhHans: "以操场为原点O(0,0)，向东为x轴正方向，向北为y轴正方向。图书馆在(0,2)，花坛在(2,0)，校门在(0,-2)。小明在图书馆东面1格，小红在操场北面1格，小刚在花坛西面1格，小丽在校门南面1格。谁和小明在以操场为中心的同一个方向？",
    optionsZhHans: ["小红", "小刚", "小丽", "没有人"],
    answer: "没有人",
    acceptedAnswers: ["没有人", "无人", "No one"],
    explanationZhHans: "小明在(1,2)，相对操场在东北方向；小红在(0,1)，小刚在(1,0)，小丽在(0,-3)，分别在北、东、南方向。因此没有人与小明方向相同。"
  },
  "hjb-primary-ds-v1-p2-120": {
    promptZhHans: "早晨太阳从东方升起。小杰面向太阳，说：“前面是东，后面是西，左面是北，右面是南。”他说得对吗？请完整写出判断和四个方向。",
    answer: "对；前面是东，后面是西，左面是北，右面是南。",
    acceptedAnswers: ["对；前面是东，后面是西，左面是北，右面是南。", "正确；前面是东，后面是西，左面是北，右面是南。", "Correct; east is in front, west is behind, north is to the left, and south is to the right."],
    explanationZhHans: "早晨太阳从东方升起，面向太阳就是面向东；面向东时，后面是西，左面是北，右面是南，所以小杰的说法完全正确。"
  },
  "hjb-primary-ds-v1-p2-124": {
    promptZhHans: "复习课上，老师让同学们把下面的算式按运算符号分类：①3×5，②2+2+2，③4×6，④5+5+5。下面哪种分类正确？",
    optionsZhHans: ["乘法算式：①③；加法算式：②④", "乘法算式：①④；加法算式：②③", "乘法算式：②③；加法算式：①④", "乘法算式：①②；加法算式：③④"],
    answer: "乘法算式：①③；加法算式：②④",
    acceptedAnswers: ["乘法算式：①③；加法算式：②④", "Multiplication: 1 and 3; addition: 2 and 4"],
    explanationZhHans: "①和③含乘号，是乘法算式；②和④含加号，是加法算式。因此第一种分类正确。"
  },
  "hjb-primary-ds-v1-p2-138": {
    promptZhHans: "小丽用一根长20厘米的绳子沿课桌长边连续量3次。第三次量到课桌边缘时，有5厘米绳子超出桌边。课桌长边是多少厘米？请列式计算。",
    answer: "20×3-5=55（厘米）",
    acceptedAnswers: ["20×3-5=55（厘米）", "20×3-5=55厘米", "20×3-5=55 cm"],
    explanationZhHans: "三次绳长共20×3=60（厘米），其中5厘米超出桌边，不属于课桌长度，所以课桌长边是60-5=55（厘米）。"
  },
  "hjb-primary-ds-v1-p2-201": {
    promptZhHans: "用数字卡片3、0、5、8各一次摆出一个四位数，要求这个数只读一个零，并且千位上的数字比百位上的数字小。下面哪个数符合要求？",
    optionsZhHans: ["3508", "3085", "5083", "8053"],
    answer: "3508",
    acceptedAnswers: ["3508"],
    explanationZhHans: "3508读作“三千五百零八”，只读一个零，并且千位3小于百位5。其余三个数的百位都是0，千位数字都大于0，不符合条件。"
  },
  "hjb-primary-ds-v1-p3-011": {
    promptZhHans: "小马虎把528看成582，与196相加得到778。请依次写出百位、十位、个位的变化，并求正确的和。",
    answer: "百位不变，十位多了6个十，个位少了6个一；正确的和是724。",
    acceptedAnswers: ["百位不变，十位多了6个十，个位少了6个一；正确的和是724。", "百位不变，十位多6个十，个位少6个一；正确的和是724。", "The hundreds digit is unchanged, the tens increase by six tens, and the ones decrease by six ones; the correct sum is 724."],
    explanationZhHans: "582比528多54：百位不变，十位由2变8，多6个十；个位由8变2，少6个一，净增加60-6=54。因此正确的和是778-54=724。"
  },
  "hjb-primary-ds-v1-p3-040": {
    promptZhHans: "老师把一些铅笔分给小朋友，每人分4支正好分完；每人分6支也正好分完。铅笔的数量可能是多少支？",
    optionsZhHans: ["18支", "24支", "30支", "42支"],
    answer: "24支",
    acceptedAnswers: ["24支", "24 pencils"],
    explanationZhHans: "铅笔数必须同时是4和6的倍数，也就是12的倍数。四个选项中只有24是12的倍数，所以选第二项。"
  },
  "hjb-primary-ds-v1-p3-108": {
    promptZhHans: "一根绳子对折一次，使两端重合，再在折后绳子的中点剪一刀，同时剪断两层。展开后，依次填写段数和从一端到另一端各段占原绳长的分数，格式为“___段；___，___，___”。",
    answer: "3段；1/4，1/2，1/4",
    acceptedAnswers: ["3段；1/4，1/2，1/4", "3段；1/4、1/2、1/4", "3 pieces; 1/4, 1/2, 1/4"],
    explanationZhHans: "折后中点对应原绳的1/4和3/4位置，一刀同时形成两个切口。展开后共有3段，长度依次是原绳的1/4、1/2、1/4。"
  },
  "hjb-primary-ds-v1-p3-237": {
    promptZhHans: "学校要给一块长8米、宽5米的长方形花坛围上篱笆。下面哪个说法正确？",
    optionsZhHans: ["篱笆长40米", "篱笆长26米", "花坛面积是26平方米", "花坛面积是45平方米"],
    answer: "篱笆长26米",
    acceptedAnswers: ["篱笆长26米", "The fence is 26 m long"],
    explanationZhHans: "篱笆长度是花坛周长，(8+5)×2=26（米）；花坛面积是8×5=40（平方米）。因此只有第二项正确。"
  },
  "hjb-primary-ds-v1-p3-249": {
    promptZhHans: "三（2）班最喜欢各运动项目的人数为：足球12人，篮球8人，乒乓球10人，羽毛球6人。下面哪个说法正确？",
    optionsZhHans: ["喜欢足球的人数是喜欢羽毛球人数的3倍", "喜欢篮球的人数比喜欢乒乓球的少2人", "喜欢乒乓球的人数比喜欢篮球的多4人", "喜欢篮球的人数最少"],
    answer: "喜欢篮球的人数比喜欢乒乓球的少2人",
    acceptedAnswers: ["喜欢篮球的人数比喜欢乒乓球的少2人", "Basketball has 2 fewer students than table tennis"],
    explanationZhHans: "10-8=2，所以喜欢篮球的比喜欢乒乓球的少2人。12不是6的3倍，10只比8多2，人数最少的是羽毛球。因此只有第二项正确。"
  },
  "hjb-primary-ds-v1-p4-048": {
    promptZhHans: "小华和小明各有一块同样大小的长方形蛋糕。小华吃了2/8，小明吃了3/8。依次填写吃得更多的人和比较理由，格式为“___；___”。",
    answer: "小明；整体相同、分母相同，分子3>2，所以3/8>2/8。",
    acceptedAnswers: ["小明；整体相同、分母相同，分子3>2，所以3/8>2/8。", "小明；两块蛋糕同样大，分母相同，3>2，所以3/8>2/8。", "Xiaoming; the wholes and denominators are the same, and 3>2, so 3/8>2/8."],
    explanationZhHans: "两块蛋糕同样大，整体相同；两个分数的分母同为8，所以可以直接比较分子。3>2，因此3/8>2/8，小明吃得更多。"
  },
  "hjb-primary-ds-v1-p4-099": {
    promptZhHans: "用量角器量∠AOB时，射线OA与量角器右端的0°刻度线重合，射线OB经过内圈130°、外圈50°的同一条刻度线。小圆读130°，小方读50°。依次填写角度、读对的人和理由，格式为“___；___；___”。",
    answer: "130°；小圆；OA对准右端0°，应从右端0°起读内圈刻度。",
    acceptedAnswers: ["130°；小圆；OA对准右端0°，应从右端0°起读内圈刻度。", "130度；小圆；OA对准右端0度，应读内圈130度。", "130°; Xiaoyuan; OA aligns with 0° on the right, so read the inner scale starting from that right-hand 0° mark."],
    explanationZhHans: "读量角器时要从与角的一边重合的0°刻度起读。OA对准右端0°，因此沿内圈从右向左读到OB是130°，小圆正确。"
  },
  "hjb-primary-ds-v1-p4-147": {
    promptZhHans: "学校图书馆新买来故事书和科技书共240本，故事书的本数是科技书的3倍。故事书和科技书各有多少本？",
    answer: "科技书60本，故事书180本",
    acceptedAnswers: [
      "科技书60本，故事书180本",
      "科技书：60本；故事书：180本",
      "科技书：240÷(3+1)=60（本），故事书：60×3=180（本）"
    ],
    explanationZhHans: "科技书和故事书共有240本，故事书本数是科技书的3倍。把科技书本数看作1份，故事书就是3份，共4份。科技书有240÷4=60（本），故事书有60×3=180（本）。"
  },
  "hjb-primary-ds-v1-p4-188": {
    promptZhHans: "折线统计图的纵轴以115为起始刻度线，每相邻两条刻度线相差5。若星期二的数据是135，且不把115这条起始线计入向上的条数，135应画在115上方第几条刻度线上？",
    answer: "第4条刻度线",
    acceptedAnswers: ["第4条刻度线", "第4条", "4", "the 4th gridline"],
    explanationZhHans: "135-115=20，20÷5=4。不计115起始线，135在它上方第4条刻度线上。"
  },
  "hjb-primary-ds-v1-p4-199": {
    promptZhHans: "某地连续6个月每月1日记录的平均气温分别为：1月2℃，2月5℃，3月9℃，4月14℃，5月19℃，6月24℃。下面哪个说法正确？",
    optionsZhHans: ["记录的平均气温一直下降", "3月1日到4月1日上升了6℃", "6月1日记录的平均气温最高，为24℃", "1月1日到2月1日上升了2℃"],
    answer: "6月1日记录的平均气温最高，为24℃",
    acceptedAnswers: ["6月1日记录的平均气温最高，为24℃", "The highest recorded average temperature was 24°C on June 1"],
    explanationZhHans: "六个记录值依次上升，最高记录值是6月1日的24℃。3月1日到4月1日上升5℃，1月1日到2月1日上升3℃，所以只有第三项正确。"
  },
  "hjb-primary-ds-v1-p4-236": {
    promptZhHans: "一个小数恰有两位小数。用“五舍六入”法保留一位小数，即百分位是0至5时舍去，是6至9时向十分位进1。所得结果是3.5，这个两位小数最大是多少？",
    answer: "3.55",
    acceptedAnswers: ["3.55"],
    explanationZhHans: "要使原数尽量大且舍去百分位后仍为3.5，十分位取5，百分位最多取5。因此最大是3.55；若百分位是6，就会进位得到3.6。"
  },
  "hjb-primary-ds-v1-p5-036": {
    promptZhHans: "学校图书馆里，故事书本数是科技书的3倍。故事书借出15本后，剩下的故事书比科技书多55本。科技书和故事书原来各有多少本？请按“科技书___本；故事书___本”的格式填写。",
    answer: "科技书35本；故事书105本",
    acceptedAnswers: ["科技书35本；故事书105本", "科技书35本，故事书105本", "35 science books; 105 storybooks"],
    explanationZhHans: "设科技书有x本，则故事书有3x本。根据题意列方程3x-15=x+55，解得x=35，故事书有3×35=105本。检验：105-15-35=55。"
  },
  "hjb-primary-ds-v1-p5-099": {
    promptZhHans: "下面是四（1）班第一小组5名同学1分钟跳绳的成绩记录（单位：下）：\n小杰：132  小雅：145  小宇：128  小婷：150  小浩：135\n\n该校把五年级学生1分钟跳绳130下作为“整体较好”的参考线。\n（1）这5名同学1分钟跳绳的平均成绩是多少下？\n（2）根据平均成绩，你认为这个小组的跳绳水平怎么样？请用数据说明你的结论。"
  },
  "hjb-primary-ds-v1-p5-105": {
    promptZhHans: "某商店星期一到星期日卖出的书包数依次是8、6、9、7、10、12、11个。依次填写日平均数和高于平均数的星期，格式为“平均___个；星期___”。",
    answer: "平均9个；星期五、星期六、星期日",
    acceptedAnswers: ["平均9个；星期五、星期六、星期日", "日平均9个；星期五、星期六、星期日", "mean 9; Friday, Saturday, and Sunday"],
    explanationZhHans: "总数是8+6+9+7+10+12+11=63，平均数是63÷7=9。只有星期五10个、星期六12个、星期日11个高于9；星期三9个等于平均数，不算高于。"
  },
  "hjb-primary-ds-v1-p5-106": {
    promptZhHans: "五（1）班第一小组6名同学1分钟跳绳的次数是120、135、110、125、130、140。关于这组数据，下面哪个说法正确？",
    optionsZhHans: ["平均数是130次", "平均数是125次", "平均数约127次", "平均数是128次"],
    answer: "平均数约127次",
    acceptedAnswers: ["平均数约127次", "平均数约为127次", "The mean is about 127"],
    explanationZhHans: "总次数是120+135+110+125+130+140=760，平均数是760÷6≈126.67，取整约为127次。因此第三项正确。"
  },
  "hjb-primary-ds-v1-p5-125": {
    promptZhHans: "环保小组上周5个上学日收集废纸5.2、4.8、5.0、5.6、4.4千克。本周也按5个上学日估算，假设每天收集量约等于上周日平均数；每千克废纸可换0.8千克再生纸。依次填写上周日平均数和本周约能换的再生纸质量。",
    answer: "日平均5千克；本周约换20千克再生纸",
    acceptedAnswers: ["日平均5千克；本周约换20千克再生纸", "平均5千克；本周大约换20千克再生纸", "daily mean 5 kg; about 20 kg of recycled paper this week"],
    explanationZhHans: "上周总量是5.2+4.8+5.0+5.6+4.4=25（千克），日平均是25÷5=5（千克）。本周5个上学日估计收集5×5=25（千克），可换25×0.8=20（千克）再生纸。"
  },
  "hjb-primary-ds-v1-p5-126": {
    promptZhHans: "6名同学1分钟跳绳的成绩是145、138、152、140、148、155下。（1）求平均数，结果保留两位小数；（2）说明这个平均数表示什么。请完整填写两项。",
    answer: "（1）146.33下；（2）表示这6名同学1分钟跳绳的整体水平。",
    acceptedAnswers: ["（1）146.33下；（2）表示这6名同学1分钟跳绳的整体水平。", "146.33下；表示这6名同学1分钟跳绳的整体水平。", "(1) 146.33 jumps; (2) it represents the overall one-minute jump-rope performance of the six students."],
    explanationZhHans: "总成绩是145+138+152+140+148+155=878（下），平均数是878÷6=439/3≈146.33（下）。平均数用于表示这6名同学1分钟跳绳的整体水平。"
  },
  "hjb-primary-ds-v1-p5-148": {
    promptZhHans: "下面哪个数既是42的因数，又是7的倍数？",
    optionsZhHans: ["12", "21", "28", "35"],
    answer: "21",
    acceptedAnswers: ["21"],
    explanationZhHans: "21×2=42，所以21是42的因数；21=7×3，所以21也是7的倍数。其余三个选项不同时满足两个条件。"
  },
  "hjb-primary-ds-v1-p6-052": {
    promptZhHans: "下面哪组中的两个比可以组成比例？",
    optionsZhHans: ["6:10和9:15", "20:5和1:4", "0.5:0.2和3:2", "1.2:0.4和0.6:0.3"],
    answer: "6:10和9:15",
    acceptedAnswers: ["6:10和9:15", "6:10 and 9:15"],
    explanationZhHans: "6:10=3:5，9:15=3:5，两个比相等，可以组成比例。其余各组的两个比值分别不相等，所以只有第一项正确。"
  },
  "hjb-primary-ds-v1-p6-205": {
    promptZhHans: "方程2(x-3)=8去括号后得到下面哪个方程？",
    optionsZhHans: ["x - 3 = 4", "2x - 3 = 8", "x - 3 = 8", "2x - 6 = 8"],
    answer: "2x - 6 = 8",
    acceptedAnswers: ["2x - 6 = 8", "2x-6=8"],
    explanationZhHans: "用乘法分配律把2分别乘括号内的x和-3，得到2x-6=8，所以选第四项。"
  },
  "hjb-primary-ds-v1-p6-207": {
    optionsZhHans: ["2x+1=5", "3x-4=5", "4x-3=8", "5x+2=18"],
    answer: "3x-4=5",
    acceptedAnswers: ["3x-4=5", "3x-4 = 5", "B"],
    explanationZhHans: "把x=3分别代入四个方程：2×3+1=7≠5；3×3-4=5；4×3-3=9≠8；5×3+2=17≠18。只有第二个方程成立，所以解为x=3的是3x-4=5。"
  },
  "hjb-primary-ds-v1-p6-213": {
    promptZhHans: "方程2(x-4)=10两边同时除以2后得到下面哪个方程？",
    optionsZhHans: ["x - 4 = 5", "2x - 4 = 10", "x - 4 = 10", "2x - 8 = 10"],
    answer: "x - 4 = 5",
    acceptedAnswers: ["x - 4 = 5", "x-4=5"],
    explanationZhHans: "方程两边同时除以2，左边2(x-4)÷2=x-4，右边10÷2=5，得到x-4=5，所以选第一项。"
  }
});

export const hjbPrimaryA18CorrectionIds = Object.freeze(Object.keys(hjbPrimaryA18Corrections));

export const hjbPrimaryA18BatchNumberById = Object.freeze({
  "hjb-primary-ds-v1-p1-125": "025", "hjb-primary-ds-v1-p1-128": "026",
  "hjb-primary-ds-v1-p2-028": "056", "hjb-primary-ds-v1-p2-064": "063",
  "hjb-primary-ds-v1-p2-120": "074", "hjb-primary-ds-v1-p2-124": "075",
  "hjb-primary-ds-v1-p2-138": "078", "hjb-primary-ds-v1-p2-201": "091",
  "hjb-primary-ds-v1-p3-011": "103", "hjb-primary-ds-v1-p3-040": "108",
  "hjb-primary-ds-v1-p3-108": "122", "hjb-primary-ds-v1-p3-237": "148",
  "hjb-primary-ds-v1-p3-249": "150", "hjb-primary-ds-v1-p4-048": "160",
  "hjb-primary-ds-v1-p4-099": "170", "hjb-primary-ds-v1-p4-147": "180",
  "hjb-primary-ds-v1-p4-188": "188",
  "hjb-primary-ds-v1-p4-199": "190", "hjb-primary-ds-v1-p4-236": "198",
  "hjb-primary-ds-v1-p5-036": "208", "hjb-primary-ds-v1-p5-099": "220",
  "hjb-primary-ds-v1-p5-105": "221",
  "hjb-primary-ds-v1-p5-106": "222", "hjb-primary-ds-v1-p5-125": "225",
  "hjb-primary-ds-v1-p5-126": "226", "hjb-primary-ds-v1-p5-148": "230",
  "hjb-primary-ds-v1-p6-052": "261", "hjb-primary-ds-v1-p6-205": "291",
  "hjb-primary-ds-v1-p6-207": "292",
  "hjb-primary-ds-v1-p6-213": "293"
});

function clonedPatch(patch) {
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}

export function applyHjbPrimaryA18Corrections(rows) {
  if (!Array.isArray(rows)) throw new TypeError("HJB Primary A18 corrections require an array of questions");
  const counts = new Map();
  const corrected = rows.map((row) => {
    const patch = hjbPrimaryA18Corrections[row?.id];
    if (!patch) return row;
    counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
    return { ...row, ...clonedPatch(patch) };
  });
  for (const id of hjbPrimaryA18CorrectionIds) {
    if (counts.get(id) !== 1) throw new Error(`Expected exactly one HJB Primary A18 row for ${id}; found ${counts.get(id) ?? 0}`);
  }
  return corrected;
}

function learnerSurface(row) {
  return Object.fromEntries(learnerFields.map((field) => [field, Array.isArray(row[field]) ? [...row[field]] : row[field]]));
}

function atomicWrite(filePath, content) {
  const temporaryPath = `${filePath}.a18-${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, filePath);
}

export function syncHjbPrimaryA18TargetBatches(questions, batchDirectory, { write = true } = {}) {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const written = [];
  for (const id of hjbPrimaryA18CorrectionIds) {
    const source = questionById.get(id);
    if (!source) throw new Error(`Missing corrected HJB Primary A18 source row ${id}`);
    const batchNumber = hjbPrimaryA18BatchNumberById[id];
    const filePath = path.join(batchDirectory, `batch-${batchNumber}.json`);
    const document = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const targetIndexes = document.questions.flatMap((row, index) => row.id === id ? [index] : []);
    if (targetIndexes.length !== 1) throw new Error(`${filePath} must contain ${id} exactly once`);
    const targetIndex = targetIndexes[0];
    const originalOtherRows = document.questions.filter((_, index) => index !== targetIndex);
    document.questions[targetIndex] = { ...document.questions[targetIndex], ...learnerSurface(source) };
    const finalOtherRows = document.questions.filter((_, index) => index !== targetIndex);
    if (JSON.stringify(finalOtherRows) !== JSON.stringify(originalOtherRows)) {
      throw new Error(`Refusing non-target batch mutation in ${filePath}`);
    }
    const content = `${JSON.stringify(document, null, 2)}\n`;
    if (write) atomicWrite(filePath, content);
    written.push({ filePath, content });
  }
  return written;
}
