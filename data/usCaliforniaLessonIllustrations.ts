import type { LocalizedText } from "@/types";

export type UsCaliforniaLessonIllustrationSlot = "concept" | "worked-example";

export type UsCaliforniaLessonIllustration = {
  id: string;
  topicId: string;
  slot: UsCaliforniaLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  preserveRasterFidelity?: boolean;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

function localized(en: string): LocalizedText {
  return { en, zh: en, zhHans: en };
}

export const usCaliforniaLessonIllustrations = [
  {
    id: "us-ca-math-p1-1-oa-add-subtract-concept",
    topicId: "us-ca-math-p1-1-oa-add-subtract",
    slot: "concept",
    // Was add-subtract-stories-single-panel-source-hd.png, deleted: it drew 9
    // blue stickers where every label around it said 8, and its ten-frame held
    // 7 blue + 3 green = 10 counters under a "= 11" — a ten-frame cannot hold
    // 11. In a Grade 1 lesson about counting objects into an equation, a child
    // counting either manipulative got a different number from the page.
    // This SVG tells the same story and draws it correctly: 8 stickers, then 3
    // more, 11 in total (verified by counting its <use> elements).
    src: "/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-concrete-to-abstract.svg",
    width: 1600,
    height: 900,
    alt: localized(
      "Grade 1 addition model showing 8 blue stickers joined with 3 green stickers, counted as 11 and written as 8 + 3 = 11."
    ),
    caption: localized(""),
    ragCardIds: [
      "us-ca-k-g5-tx-v1-p1-1-oa-add-subtract",
      "us-ca-math-p1-1-oa-add-subtract",
      "1.OA.A.1",
      "1.OA.C.5",
      "1.OA.C.6"
    ]
  },
  {
    id: "us-ca-math-p1-1-oa-add-subtract-worked-example",
    topicId: "us-ca-math-p1-1-oa-add-subtract",
    slot: "worked-example",
    src: "/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/lena-7-plus-4-stickers-worked-example.svg",
    width: 1600,
    height: 900,
    alt: localized(
      "Lena starts with 7 stickers on her page and gets 4 more stickers from an envelope, making 11 stickers altogether."
    ),
    caption: localized(
      "Lena has 7 stickers, gets 4 more, and now has 11 stickers: 7 + 4 = 11."
    ),
    ragCardIds: [
      "us-ca-k-g5-tx-v1-p1-1-oa-add-subtract",
      "us-ca-math-p1-1-oa-add-subtract",
      "1.OA.A.1",
      "1.OA.A.2",
      "1.OA.C.6"
    ]
  }
] satisfies UsCaliforniaLessonIllustration[];

const usCaliforniaLessonIllustrationByTopicAndSlot = new Map(
  usCaliforniaLessonIllustrations.map((illustration) => [
    `${illustration.topicId}:${illustration.slot}`,
    illustration
  ])
);

export function getUsCaliforniaLessonIllustration(
  topicId: string,
  slot: UsCaliforniaLessonIllustrationSlot
) {
  return usCaliforniaLessonIllustrationByTopicAndSlot.get(`${topicId}:${slot}`) ?? null;
}
