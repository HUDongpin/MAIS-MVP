/**
 * report-bench-usage.mjs — do students actually use the related-lab chip row?
 *
 * Usage:
 *   npm run report:bench-usage -- --file events.json      # an exported events array/JSONL
 *   npm run report:bench-usage -- --file events.json --json
 *
 * WHY THIS EXISTS
 * ---------------
 * 138 of the 192 benches are reachable ONLY through the chip row in
 * `SignatureBenchSwitcher` — never as a topic's `primary`. So whether students
 * touch that row is the difference between a standard being "covered" and being
 * "met", and it is the single fact that decides whether the fan-out mapping is
 * working or whether 72% of the library is effectively invisible.
 *
 * On 2026-07-25 the switch was instrumented (`viz-nav:bench-switch:<BenchId>`).
 * Tracing the read path afterwards turned up the other half of the problem:
 * NOTHING in the repo consumes the navigation channel. Not the new event, and
 * not the pre-existing `open-lab-tile` / grade-selection events either — they
 * had been writing into a table nobody queried. Events without a reader are not
 * instrumentation, they are storage.
 *
 * This is that reader. It is deliberately a file-consuming script rather than a
 * live DB client, matching `fit-bkt-params.mts`: production is Postgres and this
 * is meant to run on an analyst's machine against an export.
 *
 * Export the rows however you normally would, e.g.
 *   SELECT id, user_id, type, source, grade, topic_id, created_at
 *   FROM learning_events
 *   WHERE created_at >= now() - interval '30 days'
 * as a JSON array or JSONL.
 *
 * WHAT TO CONCLUDE
 * ----------------
 * `switchRate` is the headline: the share of lab opens where the student went on
 * to try at least one other bench. A low rate does NOT prove the chip row is
 * broken — it may mean the primary was the right bench — but a rate near zero on
 * fan-out topics means the related benches are not being met, and the coverage
 * number overstates what students see.
 */

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const asJson = args.includes("--json");

if (fileIndex < 0) {
  console.error("report-bench-usage: --file <events.json|.jsonl> is required.");
  console.error("  Export learning_events rows (id, type, source, topic_id, user_id, created_at).");
  process.exit(2);
}

const raw = readFileSync(args[fileIndex + 1], "utf8").trim();
let events;
try {
  events = raw.startsWith("[")
    ? JSON.parse(raw)
    : raw.split("\n").filter(Boolean).map((line) => JSON.parse(line));
} catch (error) {
  console.error(`report-bench-usage: could not parse the export (${String(error)})`);
  process.exit(2);
}

const topicOf = (e) => e.topic_id ?? e.topicId ?? "";
const userOf = (e) => e.user_id ?? e.userId ?? "anonymous";
const timeOf = (e) => e.created_at ?? e.timestamp ?? "";

/* the two signals: a bench switch, and a lab open (either is a "visit") */
const SWITCH = /^viz-nav:bench-switch:(.+)$/;
const OPEN = /^viz-nav:open-[^:]+:(.+)$/;

const switches = [];
const opens = [];
for (const e of events) {
  const topic = topicOf(e);
  const s = SWITCH.exec(topic);
  if (s) { switches.push({ bench: s[1], user: userOf(e), at: timeOf(e) }); continue; }
  const o = OPEN.exec(topic);
  if (o) opens.push({ labId: o[1], user: userOf(e), at: timeOf(e) });
}

const count = (rows, key) => {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/* a lab open is "explored" when that same user emitted at least one switch
   afterwards — the closest thing to a session boundary the schema gives us */
const switchesByUser = new Map();
for (const s of switches) {
  switchesByUser.set(s.user, [...(switchesByUser.get(s.user) ?? []), s.at]);
}
let opensFollowedBySwitch = 0;
for (const o of opens) {
  const times = switchesByUser.get(o.user) ?? [];
  if (times.some((t) => t > o.at)) opensFollowedBySwitch += 1;
}

const byBench = count(switches, "bench");
const byUser = count(switches, "user");
const switchRate = opens.length > 0 ? opensFollowedBySwitch / opens.length : null;

if (asJson) {
  console.log(JSON.stringify({
    events: events.length,
    labOpens: opens.length,
    benchSwitches: switches.length,
    distinctBenchesReached: byBench.length,
    studentsWhoSwitched: byUser.length,
    switchRate,
    byBench: Object.fromEntries(byBench),
  }, null, 2));
  process.exit(0);
}

console.log("bench usage — is the related-lab chip row being used?\n");
console.log(`  events in export        ${events.length}`);
console.log(`  lab opens               ${opens.length}`);
console.log(`  bench switches          ${switches.length}`);
console.log(`  distinct benches reached${String(byBench.length).padStart(6)}`);
console.log(`  students who switched   ${byUser.length}`);
console.log(
  `  switch rate             ${switchRate === null ? "n/a (no opens in export)" : `${(switchRate * 100).toFixed(1)}% of opens led to at least one switch`}\n`
);

if (switches.length === 0) {
  console.log("  No bench-switch events in this export.");
  console.log("  Either the export predates 2026-07-25 (when the switch was first");
  console.log("  instrumented), or students are not using the chip row at all —");
  console.log("  which would mean the 138 switcher-only benches are not being met.");
  process.exit(0);
}

console.log("  most-reached benches:");
for (const [bench, n] of byBench.slice(0, 20)) {
  console.log(`    ${bench.padEnd(28)} ${n}`);
}
if (byBench.length > 20) console.log(`    … and ${byBench.length - 20} more`);
