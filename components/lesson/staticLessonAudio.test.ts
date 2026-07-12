import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { lessonSlugForTopicId } from "@/lib/lessonLinks";
import { lessonUsesStaticAudioOnly, staticLessonAudioUrlForBlock } from "./staticLessonAudio";

test("staticLessonAudioUrlForBlock serves US California concept audio from stable public assets", () => {
  const lesson = {
    curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
    publisher: "US_CA_MATH",
    slug: "us-ca-math-p1-1-oa-add-subtract"
  } as const;
  const block = {
    id: "us-ca-math-p1-1-oa-add-subtract-concept",
    type: "concept"
  } as const;

  assert.equal(lessonUsesStaticAudioOnly(lesson), true);
  assert.equal(
    staticLessonAudioUrlForBlock(lesson, block),
    "/audio/lessons/us-ca-math/us-ca-math-p1-1-oa-add-subtract/us-ca-math-p1-1-oa-add-subtract-concept.mp3"
  );
});

test("staticLessonAudioUrlForBlock leaves non-US and non-audio lesson blocks on the existing dynamic path", () => {
  assert.equal(
    staticLessonAudioUrlForBlock(
      {
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        publisher: "HK_UNITED_PRIME_MIA",
        slug: "quadratic-functions"
      } as const,
      { id: "quadratic-functions-concept", type: "concept" } as const
    ),
    null
  );
  assert.equal(
    staticLessonAudioUrlForBlock(
      {
        curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
        publisher: "US_CA_MATH",
        slug: "us-ca-math-p1-1-oa-add-subtract"
      } as const,
      { id: "us-ca-math-p1-1-oa-add-subtract-worked-example", type: "worked-example" } as const
    ),
    null
  );
});

test("current US California lesson concept audio is fully pre-generated as static assets", async () => {
  const expectedAssets = usCaliforniaLessonSeeds.flatMap((lesson) => {
    const slug = lessonSlugForTopicId(lesson.topicId);

    return lesson.blocks
      .filter((block) => block.type === "concept" && block.content?.en)
      .map((block) => {
        const blockId = `${slug}-${block.idSuffix}`;
        return path.join(
          process.cwd(),
          "public/audio/lessons/us-ca-math",
          slug,
          `${blockId}.mp3`
        );
      });
  });
  const missingOrEmpty: string[] = [];

  for (const assetPath of expectedAssets) {
    try {
      const stats = await stat(assetPath);
      if (!stats.isFile() || stats.size <= 0) {
        missingOrEmpty.push(path.relative(process.cwd(), assetPath));
      }
    } catch {
      missingOrEmpty.push(path.relative(process.cwd(), assetPath));
    }
  }

  assert.equal(expectedAssets.length, 76);
  assert.deepEqual(missingOrEmpty, []);
});
