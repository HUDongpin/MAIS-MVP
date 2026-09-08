import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const suiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const skills = [
  "mais-content-promotion-gate",
  "mais-content-qa-approval-workflow",
  "mais-natural-sample-evaluation",
  "mais-release-hygiene-deploy-workflow",
  "mais-rsi-machine-qa-workflow",
];

const sourceFileBySkill = new Map(
  skills.map((skill) => [skill, `${skill}/evals/trigger-evals.json`]),
);

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(suiteRoot, relativePath), "utf8"));
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

test("routing oracle exactly covers and partitions the immutable 100-query corpus", () => {
  const oracle = readJson("routing-oracle.json");
  assert.equal(oracle.schemaVersion, "1.0");
  assert.deepEqual(oracle.skills, skills);
  assert.ok(Array.isArray(oracle.cases));
  assert.equal(oracle.cases.length, 100);

  const evalsByFile = new Map();
  for (const [skill, sourceFile] of sourceFileBySkill) {
    const evaluations = readJson(sourceFile);
    assert.equal(evaluations.length, 20, `${skill} must retain 20 trigger queries`);
    assert.equal(
      evaluations.filter(({ should_trigger: value }) => value === true).length,
      10,
      `${skill} must retain 10 positive trigger queries`,
    );
    assert.equal(
      evaluations.filter(({ should_trigger: value }) => value === false).length,
      10,
      `${skill} must retain 10 negative trigger queries`,
    );
    evalsByFile.set(sourceFile, evaluations);
  }

  const expectedCaseKeys = new Set();
  for (const [sourceFile, evaluations] of evalsByFile) {
    evaluations.forEach((_evaluation, sourceIndex) => {
      expectedCaseKeys.add(`${sourceFile}#${sourceIndex}`);
    });
  }

  const ids = new Set();
  const queries = new Set();
  const observedCaseKeys = new Set();
  let positives = 0;
  let negatives = 0;

  const exactCaseKeys = [
    "allowedFollowupSkills",
    "expectedExternalLane",
    "expectedPrimarySkill",
    "id",
    "mustNotTrigger",
    "query",
    "shouldTrigger",
    "sourceCandidateSkill",
    "sourceFile",
    "sourceIndex",
  ].sort();

  for (const entry of oracle.cases) {
    assert.deepEqual(Object.keys(entry).sort(), exactCaseKeys, `${entry.id} has an unexpected field set`);
    assert.match(entry.id, /^(?:promotion|content-qa|natural|release|rsi)-(?:positive|negative)-\d{2}$/u);
    assert.equal(ids.has(entry.id), false, `duplicate routing ID: ${entry.id}`);
    ids.add(entry.id);

    assert.ok(skills.includes(entry.sourceCandidateSkill), `${entry.id} has an invalid source Skill`);
    assert.equal(
      entry.sourceFile,
      sourceFileBySkill.get(entry.sourceCandidateSkill),
      `${entry.id} source file does not match its candidate Skill`,
    );
    assert.ok(Number.isInteger(entry.sourceIndex) && entry.sourceIndex >= 0, `${entry.id} has an invalid source index`);

    const sourceEvaluations = evalsByFile.get(entry.sourceFile);
    assert.ok(entry.sourceIndex < sourceEvaluations.length, `${entry.id} source index is out of range`);
    const sourceEvaluation = sourceEvaluations[entry.sourceIndex];
    assert.equal(entry.query, sourceEvaluation.query, `${entry.id} query text drifted from its immutable source`);
    assert.equal(
      entry.shouldTrigger,
      sourceEvaluation.should_trigger,
      `${entry.id} binary label drifted from its immutable source`,
    );

    const caseKey = `${entry.sourceFile}#${entry.sourceIndex}`;
    assert.equal(observedCaseKeys.has(caseKey), false, `${entry.id} duplicates ${caseKey}`);
    observedCaseKeys.add(caseKey);
    assert.equal(queries.has(entry.query), false, `${entry.id} duplicates another query string`);
    queries.add(entry.query);

    assert.equal(typeof entry.shouldTrigger, "boolean", `${entry.id} shouldTrigger must be boolean`);
    if (entry.shouldTrigger) {
      positives += 1;
      assert.equal(
        entry.expectedPrimarySkill,
        entry.sourceCandidateSkill,
        `${entry.id} positive case must select its source candidate Skill`,
      );
    } else {
      negatives += 1;
      assert.notEqual(
        entry.expectedPrimarySkill,
        entry.sourceCandidateSkill,
        `${entry.id} negative case cannot select its source candidate Skill`,
      );
    }

    assert.ok(Array.isArray(entry.allowedFollowupSkills), `${entry.id} allowedFollowupSkills must be an array`);
    assert.ok(Array.isArray(entry.mustNotTrigger), `${entry.id} mustNotTrigger must be an array`);
    assert.deepEqual(
      entry.allowedFollowupSkills,
      sortedUnique(entry.allowedFollowupSkills),
      `${entry.id} allowed follow-up Skills must be sorted and unique`,
    );
    assert.deepEqual(
      entry.mustNotTrigger,
      sortedUnique(entry.mustNotTrigger),
      `${entry.id} must-not-trigger Skills must be sorted and unique`,
    );
    for (const name of [...entry.allowedFollowupSkills, ...entry.mustNotTrigger]) {
      assert.ok(skills.includes(name), `${entry.id} contains an unknown Skill name`);
    }

    if (entry.expectedPrimarySkill === null) {
      assert.equal(typeof entry.expectedExternalLane, "string", `${entry.id} needs an external lane`);
      assert.match(entry.expectedExternalLane, /^[A-Za-z0-9][A-Za-z0-9-]*$/u, `${entry.id} external lane is not a safe stable label`);
    } else {
      assert.ok(skills.includes(entry.expectedPrimarySkill), `${entry.id} expected primary Skill is invalid`);
      assert.equal(entry.expectedExternalLane, null, `${entry.id} suite-owned case cannot also claim an external lane`);
      assert.equal(
        entry.mustNotTrigger.includes(entry.expectedPrimarySkill),
        false,
        `${entry.id} expected primary Skill cannot be in mustNotTrigger`,
      );
      assert.equal(
        entry.allowedFollowupSkills.includes(entry.expectedPrimarySkill),
        false,
        `${entry.id} expected primary Skill cannot also be a follow-up`,
      );
    }

    if (!entry.shouldTrigger) {
      assert.ok(
        entry.mustNotTrigger.includes(entry.sourceCandidateSkill),
        `${entry.id} negative source candidate must be explicitly forbidden`,
      );
    }

    for (const allowed of entry.allowedFollowupSkills) {
      assert.equal(
        entry.mustNotTrigger.includes(allowed),
        false,
        `${entry.id} follow-up Skill cannot also be forbidden`,
      );
    }

    const partition = [
      ...(entry.expectedPrimarySkill === null ? [] : [entry.expectedPrimarySkill]),
      ...entry.allowedFollowupSkills,
      ...entry.mustNotTrigger,
    ];
    assert.deepEqual(
      sortedUnique(partition),
      [...skills].sort(),
      `${entry.id} must classify all five Skills exactly once`,
    );
    assert.equal(partition.length, skills.length, `${entry.id} five-way partition contains overlap`);
  }

  assert.equal(ids.size, 100);
  assert.equal(queries.size, 100);
  assert.equal(positives, 50);
  assert.equal(negatives, 50);
  assert.deepEqual([...observedCaseKeys].sort(), [...expectedCaseKeys].sort());
});
