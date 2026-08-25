/**
 * Gate: California lesson illustrations are loadable, correctly sized, and
 * described.
 *
 * Round 14 opened this lens after the owner deleted a Grade 1 concept image
 * that drew 9 stickers where every label around it said 8, and whose ten-frame
 * held 10 counters under a "= 11". Nothing in the repo would have caught it,
 * and nothing would have caught the broken reference its deletion left behind
 * either.
 *
 * Hard failures are the things that are wrong no matter who looks at them:
 *   - src does not exist on disk           -> a broken image on the page
 *   - topicId matches no California lesson -> the record is addressed to nothing
 *   - declared width/height disagree with the asset's own viewBox
 *                                          -> the browser scales it, distorting
 *                                             counts a child is asked to count
 *   - alt text missing/empty, or the SVG carries no <title>/<desc>
 *                                          -> unusable with a screen reader
 *
 * Unreachable slots are REPORTED BUT DO NOT FAIL. An illustration only renders
 * inside a `concept` or `worked-example` block (LessonView.tsx
 * `lessonIllustrationSlotForBlock`). Both California records sit on a page that
 * has neither, so neither has ever reached a student. That is a real thing to
 * know, but it is not a content error the way a wrong number is -- resolving it
 * means either authoring a new block onto a live lesson or discarding authored
 * art, and both are the owner's call. Failing the build on it would force one
 * of those choices by default. Same reasoning as round 13's readability lens:
 * a gate should fail on content that is wrong, not on content that is absent.
 */
import fs from "node:fs";
import path from "node:path";

import { usCaliforniaLessonIllustrations } from "../data/usCaliforniaLessonIllustrations";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";

const repoRoot = path.resolve(import.meta.dirname, "..");
const seeds = usCaliforniaLessonSeeds as Array<{
  topicId: string;
  blocks: Array<{ type: string }>;
}>;
const records = usCaliforniaLessonIllustrations as Array<{
  id: string;
  topicId: string;
  slot: string;
  src: string;
  width: number;
  height: number;
  alt: unknown;
}>;

const defects: string[] = [];
const unreachable: string[] = [];

/** `alt` is a localized record; every locale on it must carry real text. */
function altStrings(alt: unknown): string[] {
  if (typeof alt === "string") return [alt];
  if (alt && typeof alt === "object") return Object.values(alt as Record<string, unknown>).filter((v): v is string => typeof v === "string");
  return [];
}

for (const record of records) {
  const where = `${record.id}`;
  const absolute = path.join(repoRoot, "public", record.src);

  if (!fs.existsSync(absolute)) {
    defects.push(`${where}: src does not exist on disk -- ${record.src}`);
    continue;
  }

  const seed = seeds.find((s) => s.topicId === record.topicId);
  if (!seed) {
    defects.push(`${where}: topicId "${record.topicId}" matches no California lesson`);
  } else if (!seed.blocks.some((b) => b.type === record.slot)) {
    unreachable.push(`${where}: page has no "${record.slot}" block, so this never renders`);
  }

  const alts = altStrings(record.alt);
  if (alts.length === 0) {
    defects.push(`${where}: alt text is missing`);
  } else {
    // One line per record, not per locale -- a blank `alt` is blank in every
    // locale at once and repeating it just pads the count.
    const blank = alts.filter((value) => value.trim().length === 0).length;
    if (blank > 0) defects.push(`${where}: alt text is empty in ${blank} of ${alts.length} locale(s)`);
  }

  if (!(record.width > 0) || !(record.height > 0)) {
    defects.push(`${where}: declared width/height must both be positive`);
  }

  if (record.src.endsWith(".svg")) {
    const markup = fs.readFileSync(absolute, "utf8");
    const viewBox = /viewBox="([^"]+)"/.exec(markup);
    if (!viewBox) {
      defects.push(`${where}: SVG has no viewBox, so its aspect ratio is undefined`);
    } else {
      const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
      const [, , vbWidth, vbHeight] = parts;
      if (parts.length !== 4 || !Number.isFinite(vbWidth) || !Number.isFinite(vbHeight)) {
        defects.push(`${where}: SVG viewBox is malformed -- "${viewBox[1]}"`);
      } else {
        // Compare ratios, not raw values: a correctly-proportioned asset may be
        // declared at any scale, but a mismatched ratio means the browser
        // stretches the drawing.
        const declared = record.width / record.height;
        const intrinsic = vbWidth / vbHeight;
        if (Math.abs(declared - intrinsic) > 0.01) {
          defects.push(
            `${where}: declared ${record.width}x${record.height} (ratio ${declared.toFixed(3)}) does not match viewBox ${vbWidth}x${vbHeight} (ratio ${intrinsic.toFixed(3)}) -- the drawing will be stretched`
          );
        }
      }
    }
    if (!/<title[\s>]/.test(markup)) defects.push(`${where}: SVG has no <title>`);
    if (!/<desc[\s>]/.test(markup)) defects.push(`${where}: SVG has no <desc>`);
  }
}

console.log(`audit-us-ca-lesson-illustrations: ${records.length} illustration record(s) across ${seeds.length} California lessons`);

// A gate that checks nothing must not report success. If the data file is ever
// emptied or its export renamed, this is the line that catches it.
if (records.length === 0) {
  console.error("✗ checked nothing -- expected at least one California illustration record");
  process.exit(2);
}

if (unreachable.length > 0) {
  console.log(`\nunreachable slots (reported, not a failure -- see this file's header):`);
  for (const line of unreachable) console.log(`  ${line}`);
  const renderable = seeds.filter((s) => s.blocks.some((b) => b.type === "concept" || b.type === "worked-example")).length;
  console.log(`  ${renderable} of ${seeds.length} California pages have a block that could render an illustration.`);
}

if (defects.length > 0) {
  console.error(`\n✗ ${defects.length} illustration defect(s)`);
  for (const line of defects) console.error(`  ${line}`);
  process.exit(1);
}

console.log("\n✓ every illustration loads, is proportioned to its asset, and is described");
