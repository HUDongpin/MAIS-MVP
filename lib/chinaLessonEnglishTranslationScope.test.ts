import assert from "node:assert/strict";
import test from "node:test";
import { productionLessonSeeds } from "../data/lessons";
import { mainlandPepHighLessonSeeds } from "../data/mainlandPepHighLessons";
import { mainlandPepJuniorLessonSeeds } from "../data/mainlandPepJuniorLessons";
import { mainlandPepPrimaryRagV1Questions } from "../data/mainlandPepPrimaryQuestions";
import { mainlandPepPrimaryLessonSeeds } from "../data/mainlandPepPrimaryLessons";
import { questions } from "../data/questions";

test("BNU/HJB generated English translations never overwrite curated PEP question English", () => {
  const directById = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const runtimePepPrimary = questions.filter((question) => directById.has(question.id));

  assert.equal(runtimePepPrimary.length, mainlandPepPrimaryRagV1Questions.length);
  runtimePepPrimary.forEach((question) => {
    const direct = directById.get(question.id);
    assert.ok(direct, `${question.id} should remain in the PEP primary runtime bank`);
    assert.equal(question.topic.en, direct.topic.en, `${question.id} topic English was overwritten by another publisher's dictionary`);
    assert.equal(question.prompt.en, direct.prompt.en, `${question.id} prompt English was overwritten by another publisher's dictionary`);
    assert.equal(question.explanation.en, direct.explanation.en, `${question.id} explanation English was overwritten by another publisher's dictionary`);
    assert.deepEqual(
      question.options?.map((option) => option.en),
      direct.options?.map((option) => option.en),
      `${question.id} option English was overwritten by another publisher's dictionary`
    );
  });
});

test("BNU/HJB generated English translations never overwrite curated PEP lesson English", () => {
  const rawPepSeeds = [...mainlandPepPrimaryLessonSeeds, ...mainlandPepJuniorLessonSeeds, ...mainlandPepHighLessonSeeds];
  const runtimeById = new Map(productionLessonSeeds.map((seed) => [seed.topicId, seed]));

  rawPepSeeds.forEach((raw) => {
    const runtime = runtimeById.get(raw.topicId);
    assert.ok(runtime, `${raw.topicId} should remain in the production lesson inventory`);
    assert.deepEqual(
      {
        title: runtime.title.en,
        description: runtime.description.en,
        blocks: runtime.blocks.map((block) => ({
          title: block.title.en,
          content: block.content?.en,
          items: block.items?.map((item) => item.en)
        }))
      },
      {
        title: raw.title.en,
        description: raw.description.en,
        blocks: raw.blocks.map((block) => ({
          title: block.title.en,
          content: block.content?.en,
          items: block.items?.map((item) => item.en)
        }))
      },
      `${raw.topicId} lesson English was overwritten by another publisher's dictionary`
    );
  });
});
