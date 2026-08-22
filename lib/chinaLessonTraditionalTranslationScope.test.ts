import assert from "node:assert/strict";
import test from "node:test";
import {
  chinaLessonTraditionalTranslation,
  chinaLessonTraditionalTranslationKey,
  normalizeChinaLessonTraditionalSemantics
} from "../data/chinaLessonTraditionalTranslations";
import { reviewPages } from "../scripts/review-china-lesson-page-content";
import type { LocalizedText } from "../types";

const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

function assertMappedTraditional(value: LocalizedText | undefined, context: string) {
  if (!value) return;
  const source = value.zhHans?.trim() || value.zh.trim();
  if (!source || !cjkPattern.test(source)) return;
  const translated = chinaLessonTraditionalTranslation(source);
  assert.ok(translated, `${context}: missing Traditional map entry for ${chinaLessonTraditionalTranslationKey(source)}`);
  assert.equal(value.zh.trim(), translated, `${context}: runtime zh does not use the reviewed Traditional mapping`);
}

test("every learner-visible Mainland localized source resolves through the Traditional map", () => {
  const pages = reviewPages("zh").filter((page) => page.scope !== "hong-kong");
  assert.equal(pages.length, 335);

  pages.forEach((page) => {
    const prefix = `${page.scope}/${page.topic.id}`;
    assertMappedTraditional(page.topic.title, `${prefix}.topic.title`);
    assertMappedTraditional(page.topic.description, `${prefix}.topic.description`);
    assertMappedTraditional(page.seed.title, `${prefix}.lesson.title`);
    assertMappedTraditional(page.seed.description, `${prefix}.lesson.description`);
    page.seed.blocks.forEach((block, blockIndex) => {
      assertMappedTraditional(block.title, `${prefix}.blocks[${blockIndex}].title`);
      assertMappedTraditional(block.content, `${prefix}.blocks[${blockIndex}].content`);
      block.items?.forEach((item, itemIndex) =>
        assertMappedTraditional(item, `${prefix}.blocks[${blockIndex}].items[${itemIndex}]`)
      );
    });
    page.practice.forEach((question, questionIndex) => {
      const questionPrefix = `${prefix}.practice[${questionIndex}](${question.id})`;
      assertMappedTraditional(question.topic, `${questionPrefix}.topic`);
      assertMappedTraditional(question.prompt, `${questionPrefix}.prompt`);
      question.options?.forEach((option, optionIndex) =>
        assertMappedTraditional(option, `${questionPrefix}.options[${optionIndex}]`)
      );
      assertMappedTraditional(question.explanation, `${questionPrefix}.explanation`);
      question.questionAssets?.forEach((asset, assetIndex) => {
        assertMappedTraditional(asset.alt, `${questionPrefix}.assets[${assetIndex}].alt`);
        assertMappedTraditional(asset.caption, `${questionPrefix}.assets[${assetIndex}].caption`);
      });
    });
  });
});

test("PEP sources without an authored zhHans field still receive Traditional and Simplified runtime values", () => {
  const pepPrimary = reviewPages("zh", "pep-primary")[0];
  assert.equal(pepPrimary.topic.title.zh, "20以內數感");
  assert.equal(pepPrimary.topic.title.zhHans, "20以内数感");
  assert.equal(pepPrimary.seed.title.zh, "20以內數感");
  assert.equal(pepPrimary.seed.title.zhHans, "20以内数感");

  const pepHigh = reviewPages("zh", "pep-high")[0];
  assert.equal(pepHigh.topic.title.zh, "集合與常用邏輯用語");
  assert.equal(pepHigh.topic.title.zhHans, "集合与常用逻辑用语");
});

test("PEP decimal-ribbon explanation uses the reviewed Traditional mapping on the runtime lesson page", () => {
  const simplifiedExplanation = "小数点对齐计算：1.5+2.7=4.2米。";
  const traditionalExplanation = "小數點對齊計算：1.5+2.7=4.2米。";
  assert.equal(chinaLessonTraditionalTranslation(simplifiedExplanation), traditionalExplanation);

  const page = reviewPages("zh", "pep-primary")
    .find((candidate) => candidate.topic.id === "pep-primary-p4-lower-decimals-average");
  assert.ok(page);
  const runtimeQuestion = page.practice.find((question) => question.id === "pep-primary-p4-l-fi-101");
  assert.ok(runtimeQuestion);
  assert.equal(runtimeQuestion.explanation.en, "Line up decimal places: 1.5+2.7=4.2.");
  assert.equal(runtimeQuestion.explanation.zhHans, simplifiedExplanation);
  assert.equal(runtimeQuestion.explanation.zh, traditionalExplanation);

  const displayedQuestion = (page.payload.displayedPractice as Array<{
    id: string;
    explanationShownAfterAttempt: string;
  }>).find((question) => question.id === "pep-primary-p4-l-fi-101");
  assert.ok(displayedQuestion);
  assert.equal(displayedQuestion.explanationShownAfterAttempt, traditionalExplanation);
});

test("Traditional runtime feedback and Hong Kong geometry copy do not leak Simplified classifiers or edge terminology", () => {
  type DisplayedPractice = {
    id: string;
    prompt: string;
    explanationShownAfterAttempt: string;
    correctAnswerShownAfterWrongAttempt: string;
  };
  const practiceFor = (scope: Parameters<typeof reviewPages>[1], topicId: string) => {
    const page = reviewPages("zh", scope).find((candidate) => candidate.topic.id === topicId);
    assert.ok(page, `${scope}/${topicId} should remain in the exact review inventory`);
    return page.payload.displayedPractice as DisplayedPractice[];
  };

  const bnuFeedback = practiceFor("bnu-primary", "bnu-primary-p6-lower-cylinders-cones")
    .find((question) => question.id === "bnu-primary-ds-v1-p6-146");
  assert.ok(bnuFeedback);
  assert.equal(bnuFeedback.correctAnswerShownAfterWrongAttempt, "43噸");

  const hjbFeedback = practiceFor("hjb-primary", "hjb-primary-p5-lower-fractions-equivalence-operations")
    .find((question) => question.id === "hjb-primary-ds-v1-p5-159");
  assert.ok(hjbFeedback);
  assert.equal(hjbFeedback.correctAnswerShownAfterWrongAttempt, "3顆");

  const hongKongCube = practiceFor("hong-kong", "p5-volume")
    .find((question) => question.id === "graph-p5-volume-cube");
  assert.ok(hongKongCube);
  assert.match(hongKongCube.prompt, /一條稜長/u);
  assert.match(hongKongCube.explanationShownAfterAttempt, /每條稜長/u);
  assert.doesNotMatch(`${hongKongCube.prompt} ${hongKongCube.explanationShownAfterAttempt}`, /棱/u);
});

test("Traditional semantic conversion uses 書籤 for the learner-facing bookmark noun", () => {
  assert.equal(normalizeChinaLessonTraditionalSemantics("晨晨擺了8行書簽"), "晨晨擺了8行書籤");
  const multiplicationPage = reviewPages("zh", "pep-primary")
    .find((page) => page.topic.id === "pep-primary-p2-upper-multiplication-arrays");
  assert.ok(multiplicationPage);
  const bookmarkQuestion = multiplicationPage.payload.displayedPractice as Array<{
    id: string;
    prompt: string;
    explanationShownAfterAttempt: string;
  }>;
  const displayed = bookmarkQuestion.find((question) => question.id === "pep-primary-p2-u-mc-001");
  assert.ok(displayed);
  assert.match(displayed.prompt, /書籤/u);
  assert.doesNotMatch(displayed.prompt, /書簽/u);
  assert.match(displayed.explanationShownAfterAttempt, /8×2=16/u);
  assert.doesNotMatch(displayed.explanationShownAfterAttempt, /8x2/iu);
});

test("Traditional semantic conversion preserves the official Hong Kong unit 厘米", () => {
  assert.equal(normalizeChinaLessonTraditionalSemantics("長3釐米、面積9平方釐米"), "長3厘米、面積9平方厘米");
  const ratioPage = reviewPages("zh", "pep-primary")
    .find((page) => page.topic.id === "pep-primary-p6-lower-ratio-proportion-scale");
  assert.ok(ratioPage);
  const payload = JSON.stringify(ratioPage.payload);
  assert.match(payload, /厘米/u);
  assert.doesNotMatch(payload, /釐米/u);
});

test("reviewed Hong Kong mathematics terms use 係數 and 餘數 rather than mixed-script variants", () => {
  assert.equal(
    chinaLessonTraditionalTranslation("先找公因式：系数6、-9、3的最大公约数是3，字母部分都有x^2y，故公因式为3x^2y。提取后剩余2x - 3y + 1。"),
    "先找公因式：係數6、-9、3的最大公約數是3，字母部分都有x^2y，故公因式為3x^2y。提取後剩餘2x - 3y + 1。"
  );
  assert.equal(
    chinaLessonTraditionalTranslation("计算672÷24时，老师要求采用“把24看作25试商，再根据余数调整”的方法。下面哪一项完整记录了这种方法？"),
    "計算672÷24時，老師要求採用“把24看作25試商，再根據餘數調整”的方法。下面哪一項完整記錄了這種方法？"
  );
  assert.equal(
    chinaLessonTraditionalTranslation("按指定方法把24看作25，第二步试商7后余数等于除数，说明商小了1，应改商8，最终672÷24=28。"),
    "按指定方法把24看作25，第二步試商7後餘數等於除數，說明商小了1，應改商8，最終672÷24=28。"
  );
});

test("newly reviewed Mainland sources preserve Hong Kong geometry and location terms", () => {
  assert.equal(
    chinaLessonTraditionalTranslation("两点的横坐标相同，所以 l 是竖直直线，斜率不存在；直线上每一点都满足 x=3。"),
    "兩點的橫座標相同，所以 l 是豎直直線，斜率不存在；直線上每一點都滿足 x=3。"
  );
  assert.equal(
    chinaLessonTraditionalTranslation("圆 C 的圆心为 O(0,0)，半径为 2。圆心到直线 l 的距离 d=|-12|/√(3²+4²)=12/5>2，所以直线与圆没有公共点，二者相离。"),
    "圓 C 的圓心為 O(0,0)，半徑為 2。圓心到直線 l 的距離 d=|-12|/√(3²+4²)=12/5>2，所以直線與圓沒有公共點，兩者相離。"
  );
  assert.equal(
    chinaLessonTraditionalTranslation("一个不透明的袋子里装有4个红球和1个蓝球，这些球除颜色外完全相同。小刚从袋子里随机摸出一个球，记录颜色后放回并摇匀，然后再随机摸出一个球。求两次摸球中至少有一次摸出红球的概率。"),
    "一個不透明的袋子裡裝有4個紅球和1個藍球，這些球除顏色外完全相同。小剛從袋子裡隨機摸出一個球，記錄顏色後放回並搖勻，然後再隨機摸出一個球。求兩次摸球中至少有一次摸出紅球的概率。"
  );
});

test("the explicit HJB jump-rope benchmark has a reviewed Traditional rendering", () => {
  const simplified = "下面是四（1）班第一小组5名同学1分钟跳绳的成绩记录（单位：下）：\n小杰：132  小雅：145  小宇：128  小婷：150  小浩：135\n\n该校把五年级学生1分钟跳绳130下作为“整体较好”的参考线。\n（1）这5名同学1分钟跳绳的平均成绩是多少下？\n（2）根据平均成绩，你认为这个小组的跳绳水平怎么样？请用数据说明你的结论。";
  const traditional = "下面是四（1）班第一小組5名同學1分鐘跳繩的成績記錄（單位：下）：\n小傑：132  小雅：145  小宇：128  小婷：150  小浩：135\n\n該校把五年級學生1分鐘跳繩130下作為「整體較好」的參考線。\n（1）這5名同學1分鐘跳繩的平均成績是多少下？\n（2）根據平均成績，你認為這個小組的跳繩水平怎麼樣？請用數據說明你的結論。";
  assert.equal(chinaLessonTraditionalTranslation(simplified), traditional);
});
