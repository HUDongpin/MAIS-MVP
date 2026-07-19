import { deepEqual } from "node:assert/strict";
import { test } from "node:test";
import { countingDotCardQuantitiesFor, extractCountingDotQuantities } from "./countingDotCards";
import type { CountingDotCardQuestion } from "./countingDotCards";

function kQuestion(promptEn: string, overrides: Partial<CountingDotCardQuestion> = {}): CountingDotCardQuestion {
  return {
    grade: "K",
    prompt: { en: promptEn, zh: promptEn },
    ...overrides
  };
}

test("extracts each mentioned dot quantity in order", () => {
  deepEqual(
    extractCountingDotQuantities("One card has 10 dots. Another card has 12 dots. How many dots are on the card that has more?"),
    [10, 12]
  );
  deepEqual(extractCountingDotQuantities("A card shows 1 dot."), [1]);
});

test("extracts other countable classroom objects the K bank uses", () => {
  deepEqual(extractCountingDotQuantities("Count the collection: 10 cubes are on a mat. How many objects are on the mat?"), [10]);
  deepEqual(extractCountingDotQuantities("Count the collection: 5 tiles are on a mat."), [5]);
  deepEqual(extractCountingDotQuantities("Count the collection: 8 stickers are on a mat."), [8]);
  deepEqual(extractCountingDotQuantities("Count the collection: 9 cards are on a mat."), [9]);
  deepEqual(extractCountingDotQuantities("Count to 10 out loud."), [], "bare numbers without objects stay text-only");
});

test("rejects prompts without dots, too many quantities, or uncountable numbers", () => {
  deepEqual(extractCountingDotQuantities("What is 3 + 4?"), []);
  deepEqual(extractCountingDotQuantities("Cards have 1 dot, 2 dots, 3 dots, 4 dots."), [], "more than three cards is visual noise");
  deepEqual(extractCountingDotQuantities("A poster shows 100 dots."), [], "dots above twenty are not countable for K");
  deepEqual(extractCountingDotQuantities("The pattern uses 0 dots."), []);
});

test("only K and P1 questions without existing visuals get dot cards", () => {
  deepEqual(countingDotCardQuantitiesFor(kQuestion("One card has 10 dots. Another has 12 dots.")), [10, 12]);
  deepEqual(countingDotCardQuantitiesFor(kQuestion("One card has 10 dots.", { grade: "P1" })), [10]);
  deepEqual(countingDotCardQuantitiesFor(kQuestion("One card has 10 dots.", { grade: "P2" })), [], "P2+ reads the words instead");
  deepEqual(
    countingDotCardQuantitiesFor(kQuestion("One card has 10 dots.", { diagram: { kind: "bar-chart" } as unknown as CountingDotCardQuestion["diagram"] })),
    [],
    "questions with a real diagram keep it"
  );
  deepEqual(
    countingDotCardQuantitiesFor(
      kQuestion("One card has 10 dots.", {
        questionAssets: [{ kind: "image", src: "/x.png", alt: { en: "", zh: "" } } as NonNullable<CountingDotCardQuestion["questionAssets"]>[number]]
      })
    ),
    [],
    "questions with an illustration keep it"
  );
});
