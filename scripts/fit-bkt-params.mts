/**
 * Fit per-skill BKT parameters from recorded practice attempts.
 *
 * The adaptive engine ships GLOBAL constants (prior/learn/slip/guess), the same
 * for every skill. `lib/adaptiveLearningFit.ts` can estimate them per skill by
 * maximum likelihood; this is the runner that points that fitter at real data,
 * so calibration is one command once the pilot has generated attempts.
 *
 * Usage:
 *   npm run fit:bkt                          # read practice_attempts via POSTGRES_URL
 *   npm run fit:bkt -- --file rows.json      # read a JSON / NDJSON / CSV export
 *   npm run fit:bkt -- --out fitted.json     # also write fitted params as JSON
 *   npm run fit:bkt -- --since 2027-01-01    # only attempts on/after this date
 *   npm run fit:bkt -- --min-sequences 30 --min-attempts 150
 *
 * Grain: `practice_attempts` records `topic_id`, while the engine tracks skills
 * as `topic:stage`. Fitting is therefore per TOPIC, and the result applies to
 * that topic's foundation/fluency/transfer skills alike. Reported quality is
 * in-sample unless --holdout is passed, which fits on a random 80% of learners
 * and scores the held-out 20%.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  datasetLogLikelihood,
  evaluateFitQuality,
  fitAllSkills,
  globalDefaultBktParams,
  groupAttemptsBySkill,
  type PracticeAttemptRow,
  type ResponseSequence
} from "../lib/adaptiveLearningFit";

type Options = {
  file: string | null;
  out: string | null;
  since: string | null;
  minSequences: number;
  minAttempts: number;
  holdout: boolean;
  json: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    file: null,
    out: null,
    since: null,
    minSequences: 30,
    minAttempts: 150,
    holdout: false,
    json: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[(i += 1)];
    if (arg === "--file") options.file = next();
    else if (arg === "--out") options.out = next();
    else if (arg === "--since") options.since = next();
    else if (arg === "--min-sequences") options.minSequences = Number(next());
    else if (arg === "--min-attempts") options.minAttempts = Number(next());
    else if (arg === "--holdout") options.holdout = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npm run fit:bkt -- [--file <json|ndjson|csv>] [--out <json>] [--since <iso>]\n" +
          "                        [--min-sequences N] [--min-attempts N] [--holdout] [--json]"
      );
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

// --- loading ----------------------------------------------------------------

function truthy(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "t" || text === "1" || text === "yes";
}

function normalizeRow(raw: Record<string, unknown>): PracticeAttemptRow | null {
  const userId = raw.user_id ?? raw.userId;
  const topicId = raw.topic_id ?? raw.topicId;
  const isCorrect = raw.is_correct ?? raw.isCorrect;
  const createdAt = raw.created_at ?? raw.createdAt;
  if (userId == null || topicId == null || isCorrect == null || createdAt == null) return null;
  return {
    user_id: String(userId),
    topic_id: String(topicId),
    is_correct: truthy(isCorrect),
    created_at: String(createdAt)
  };
}

/** Minimal CSV reader: handles a header row, quoted fields and escaped quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length || record.length) {
    record.push(field);
    rows.push(record);
  }
  const [header, ...body] = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (!header) return [];
  return body.map((row) => Object.fromEntries(header.map((key, index) => [key.trim(), row[index] ?? ""])));
}

function loadFromFile(path: string): PracticeAttemptRow[] {
  const text = readFileSync(path, "utf8").trim();
  let raw: Record<string, unknown>[];
  if (path.endsWith(".csv")) raw = parseCsv(text);
  else if (text.startsWith("[")) raw = JSON.parse(text);
  else raw = text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return raw.map(normalizeRow).filter((row): row is PracticeAttemptRow => row !== null);
}

async function loadFromPostgres(since: string | null): Promise<PracticeAttemptRow[]> {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL is not set. Point it at the database holding practice_attempts, " +
        "or pass --file with an exported JSON/CSV of those rows."
    );
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 2, idle_timeout: 20, connect_timeout: 10, prepare: false });
  try {
    const rows = since
      ? await sql`
          SELECT user_id, topic_id, is_correct, created_at
          FROM practice_attempts
          WHERE created_at >= ${since}
          ORDER BY user_id, created_at ASC
        `
      : await sql`
          SELECT user_id, topic_id, is_correct, created_at
          FROM practice_attempts
          ORDER BY user_id, created_at ASC
        `;
    return (rows as unknown as Record<string, unknown>[])
      .map(normalizeRow)
      .filter((row): row is PracticeAttemptRow => row !== null);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// --- reporting ---------------------------------------------------------------

function splitHoldout(sequences: ResponseSequence[]) {
  // Deterministic split: every 5th learner is held out.
  const train = sequences.filter((_, index) => index % 5 !== 0);
  const test = sequences.filter((_, index) => index % 5 === 0);
  return { train, test };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = options.file ? loadFromFile(options.file) : await loadFromPostgres(options.since);
  const filtered = options.since && options.file
    ? rows.filter((row) => new Date(row.created_at) >= new Date(options.since as string))
    : rows;

  if (!filtered.length) {
    console.log(
      "\nNo practice attempts found. Nothing to fit yet — the engine keeps its global " +
        "defaults (prior=%s learn=%s slip=%s guess=%s).\n",
      globalDefaultBktParams.prior,
      globalDefaultBktParams.learn,
      globalDefaultBktParams.slip,
      globalDefaultBktParams.guess
    );
    return;
  }

  const bySkill = groupAttemptsBySkill(filtered);
  const fits = fitAllSkills(bySkill, {
    minSequences: options.minSequences,
    minAttempts: options.minAttempts
  });

  const report = fits.map((fit) => {
    const sequences = bySkill.get(fit.skillId) ?? [];
    let params = fit.params;
    let scored = sequences;
    if (options.holdout && !fit.usedFallback) {
      const { train, test } = splitHoldout(sequences);
      params = fitAllSkills(new Map([[fit.skillId, train]]), {
        minSequences: 0,
        minAttempts: 0
      })[0].params;
      scored = test;
    }
    const fitted = evaluateFitQuality(params, scored);
    const global = evaluateFitQuality(globalDefaultBktParams, scored);
    return {
      skillId: fit.skillId,
      params,
      learners: fit.sequenceCount,
      attempts: fit.attemptCount,
      usedFallback: fit.usedFallback,
      brier: fitted.brier,
      brierGlobal: global.brier,
      nll: fitted.meanNegLogLikelihood,
      nllGlobal: global.meanNegLogLikelihood,
      logLikelihood: datasetLogLikelihood(params, sequences)
    };
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const fittedCount = report.filter((row) => !row.usedFallback).length;
    console.log(
      `\nPer-skill BKT fit — ${filtered.length} attempts, ${bySkill.size} skills ` +
        `(${fittedCount} fitted, ${report.length - fittedCount} below the data floor ` +
        `of ${options.minSequences} learners / ${options.minAttempts} attempts)` +
        `${options.holdout ? " — held-out scoring" : " — in-sample scoring"}\n`
    );
    console.log(
      "  skill                          learners  attempts   prior  learn   slip  guess    Brier  (global)  Δ"
    );
    for (const row of report) {
      const flag = row.usedFallback ? "  [global default — thin data]" : "";
      const delta = row.brierGlobal - row.brier;
      console.log(
        `  ${row.skillId.slice(0, 30).padEnd(30)} ${String(row.learners).padStart(8)} ${String(row.attempts).padStart(9)}` +
          `  ${row.params.prior.toFixed(3)} ${row.params.learn.toFixed(3)}  ${row.params.slip.toFixed(3)} ${row.params.guess.toFixed(3)}` +
          `   ${row.brier.toFixed(3)}   ${row.brierGlobal.toFixed(3)}  ${delta >= 0 ? "+" : ""}${delta.toFixed(3)}${flag}`
      );
    }
    const scoredRows = report.filter((row) => !row.usedFallback);
    if (scoredRows.length) {
      const mean = (pick: (row: (typeof report)[number]) => number) =>
        scoredRows.reduce((sum, row) => sum + pick(row), 0) / scoredRows.length;
      console.log(
        `\n  mean Brier: fitted ${mean((r) => r.brier).toFixed(4)} vs global ${mean((r) => r.brierGlobal).toFixed(4)}` +
          `   |   mean NLL: fitted ${mean((r) => r.nll).toFixed(4)} vs global ${mean((r) => r.nllGlobal).toFixed(4)}`
      );
      console.log(
        "\n  A fit only earns its place if it beats the global default on held-out data " +
          "(run again with --holdout).\n"
      );
    } else {
      console.log("\n  No skill cleared the data floor yet — every skill keeps the global defaults.\n");
    }
  }

  if (options.out) {
    const payload = {
      generatedAt: new Date().toISOString(),
      globalDefaults: globalDefaultBktParams,
      dataFloor: { minSequences: options.minSequences, minAttempts: options.minAttempts },
      skills: report
    };
    writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`  wrote ${options.out}\n`);
  }
}

main().catch((error) => {
  console.error(`\nfit:bkt failed — ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
