import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { k5ItemTemplates, type K5GeneratedItem } from "../lib/itemTemplates/k5Templates";

const packageId = "us-ca-k5-verified-templates-v4";
const outputDir = path.join(process.cwd(), "coordination/content-qa", packageId);
const gradeNumber: Record<string, string> = { K: "K", P1: "1", P2: "2", P3: "3", P4: "4", P5: "5" };
const sha256File = (file: string) => createHash("sha256").update(readFileSync(path.join(process.cwd(), file))).digest("hex");

function explain({ templateId, prompt, answer, params: p }: K5GeneratedItem): string {
  switch (templateId) {
    case "k5_count_next": return `Count one more than ${p.n}: ${p.n} + 1 = ${answer}.`;
    case "k5_count_before": return `If an unknown number plus 1 equals ${p.n}, subtract 1 from ${p.n}: ${p.n} - 1 = ${answer}.`;
    case "k5_skip_count": return `The count increases by ${p.step}; ${p.start} + ${p.step} = ${answer}.`;
    case "k5_compare_numbers": return `${Math.max(p.a, p.b)} is greater because it is farther along the number line than ${Math.min(p.a, p.b)}.`;
    case "k5_teen_ones": return `Take away one ten from ${p.n}: ${p.n} - 10 = ${answer} ones.`;
    case "k5_add_within_10":
    case "k5_add_within_20":
    case "k5_add_within_100":
    case "k5_add_within_1000": return `Combine the two amounts: ${p.a} + ${p.b} = ${answer}.`;
    case "k5_sub_within_10":
    case "k5_sub_within_20":
    case "k5_sub_within_100":
    case "k5_sub_within_1000": return `Take ${p.b} away from ${p.a}: ${p.a} - ${p.b} = ${answer}.`;
    case "k5_make_ten": return `The two parts must total 10: 10 - ${p.a} = ${answer}.`;
    case "k5_decompose_within_ten": return `Subtract the known part from the whole: ${p.total} - ${p.part} = ${answer}.`;
    case "k5_arithmetic_pattern": return `Each term increases by ${p.step}; after ${p.start + 3 * p.step}, add ${p.step} to get ${answer}.`;
    case "k5_mult_fact": return `${p.a} equal groups of ${p.b} give ${p.a} × ${p.b} = ${answer}.`;
    case "k5_div_fact": return `Use the related multiplication fact: ${p.b} × ${p.q} = ${p.b * p.q}, so the quotient is ${answer}.`;
    case "k5_missing_factor": return `Divide the product by the known factor: ${p.a * p.q} ÷ ${p.a} = ${answer}.`;
    case "k5_multi_digit_multiply": {
      const tens = Math.floor(p.b / 10) * 10;
      const ones = p.b % 10;
      return `Split ${p.b} into ${tens} + ${ones}: ${p.a} × ${tens} + ${p.a} × ${ones} = ${answer}.`;
    }
    case "k5_divide_multi_digit": return `Check the quotient by multiplication: ${p.b} × ${p.q} = ${p.b * p.q}, so ${p.b * p.q} ÷ ${p.b} = ${answer}.`;
    case "k5_multiply_power_of_ten": return `Multiplying by ${p.power} shifts each digit left by ${String(p.power).length - 1} places: ${p.a} × ${p.power} = ${answer}.`;
    case "k5_place_value_digit": return `The ${Math.floor(p.n / p.place) % 10} in the ${p.place === 100 ? "hundreds" : p.place === 10 ? "tens" : "ones"} place is worth ${Math.floor(p.n / p.place) % 10} × ${p.place} = ${answer}.`;
    case "k5_round_to_ten": return `The ones digit of ${p.n} is ${p.n % 10}, which is ${p.n % 10 < 5 ? "below 5; round down" : "at least 5; round up"} to ${answer}.`;
    case "k5_round_to_hundred": return `The last two digits of ${p.n} are ${p.n % 100}, which is ${p.n % 100 < 50 ? "below 50; round down" : "at least 50; round up"} to ${answer}.`;
    case "k5_equivalent_fraction_numerator": return `Multiply the denominator by ${p.factor}; multiply the numerator by the same number: ${p.num} × ${p.factor} = ${answer}.`;
    case "k5_add_fractions_like": return `The denominators are both ${p.den}, so add only the numerators: ${p.a} + ${p.b} = ${answer}; the sum is ${answer}/${p.den}.`;
    case "k5_fraction_of_number": return `One of ${p.den} equal parts of ${p.whole} is ${p.whole} ÷ ${p.den} = ${p.whole / p.den}; take ${p.num} such parts to get ${answer}.`;
    case "k5_unit_fraction_parts": return `${p.den} equal parts of size 1/${p.den} make ${p.den}/${p.den}, which is one whole.`;
    case "k5_length_conversion": return `Each meter has 100 centimeters, so ${p.meters} × 100 = ${answer} centimeters.`;
    case "k5_elapsed_minutes": {
      const times = prompt.match(/starts at (\d+:\d+) and ends at (\d+:\d+)/);
      if (!times) throw new Error(`No clock times in ${templateId}`);
      const [startHour, startMinute] = times[1].split(":").map(Number);
      const [endHour, endMinute] = times[2].split(":").map(Number);
      return `Convert both times to minutes and subtract: (${endHour} × 60 + ${endMinute}) - (${startHour} × 60 + ${startMinute}) = ${answer} minutes.`;
    }
    case "k5_money_cents": return `Quarters, dimes, and nickels are worth 25, 10, and 5 cents: ${p.quarters} × 25 + ${p.dimes} × 10 + ${p.nickels} × 5 = ${answer} cents.`;
    case "k5_rectangle_perimeter": return `A rectangle has two sides of each length: 2 × (${p.w} + ${p.h}) = ${answer} cm.`;
    case "k5_rectangle_area": return `Multiply the side lengths to count square units: ${p.w} × ${p.h} = ${answer} square cm.`;
    case "k5_prism_volume": return `Multiply the three edge lengths: ${p.a} × ${p.b} × ${p.c} = ${answer} cubic units.`;
    case "k5_polygon_sides": return `Count the straight edges of the named polygon; it has ${p.sides} sides.`;
    case "k5_word_number": return `The number word in the question names the numeral ${p.n}.`;
    default: throw new Error(`Missing explanation for ${templateId}`);
  }
}

/** Deterministic, English-only review candidate; no live topic mapping is asserted. */
export function generateK5Candidate() {
  const seenPrompts = new Set<string>();
  const questions = k5ItemTemplates.flatMap((template, familyIndex) => {
    const grade = template.grades[0];
    const standardIds = template.ccss.filter((code) => code.startsWith(`${gradeNumber[grade]}.`));
    if (standardIds.length === 0) throw new Error(`${template.id} has no standard for grade ${grade}`);
    const rows = [];
    for (let seedOffset = 0; seedOffset < 1000 && rows.length < 3; seedOffset += 1) {
      const seed = familyIndex * 1000 + seedOffset;
      const generated = template.generate(seed);
      if (seenPrompts.has(generated.prompt)) continue;
      seenPrompts.add(generated.prompt);
      rows.push({
        id: `${packageId}-${String(familyIndex + 1).padStart(2, "0")}-${rows.length + 1}`,
        batch: packageId,
        curriculumTrack: "US_CA_MATH",
        grade,
        topicId: null,
        knowledgePointId: standardIds[0],
        standardIds,
        type: "fill-in",
        difficulty: "Core",
        generationTemplate: template.id,
        generationSeed: seed,
        prompt: { en: generated.prompt },
        answer: String(generated.answer),
        acceptedAnswers: [String(generated.answer)],
        explanation: { en: explain(generated) },
        sourceDistanceStatus: "generated-original",
        mathQaStatus: "pending-a18",
        reviewStatus: "candidate-only"
      });
    }
    if (rows.length !== 3) throw new Error(`${template.id} produced only ${rows.length} unique prompts`);
    return rows;
  });
  return {
    packageId,
    schemaVersion: 1,
    generatedAt: process.env.MAIS_K5_GENERATED_AT ?? new Date().toISOString(),
    generator: "deterministic:k5ItemTemplates-source-bound",
    templateSourceSha256: sha256File("lib/itemTemplates/k5Templates.ts"),
    generationScriptSha256: sha256File("scripts/generate-k5-template-candidate.ts"),
    sessionId: "codex/a21-k5-template-candidate-20260924",
    curriculumTrack: "US_CA_MATH",
    gradeSpan: ["K", "P1", "P2", "P3", "P4", "P5"],
    languageVariant: "en",
    sourceEvidencePolicy: "generated-original-public-ccss-ids-only",
    intendedReleaseSurface: "candidate-practice-only",
    standardsClaimScope: "Each row practices a subskill; no row alone proves full-standard mastery.",
    packageStatus: "candidate-only",
    reviewStatus: "pending-independent-a18",
    integrationStatus: "not-integrated",
    topicMappingStatus: "unmapped",
    questions
  };
}

if (process.argv[1]?.endsWith("generate-k5-template-candidate.ts")) {
  mkdirSync(outputDir, { recursive: true });
  const pack = generateK5Candidate();
  writeFileSync(path.join(outputDir, "question-pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`${pack.packageId}: wrote ${pack.questions.length} candidate rows`);
}
