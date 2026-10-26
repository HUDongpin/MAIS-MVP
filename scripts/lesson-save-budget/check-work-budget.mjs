import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const profile=JSON.parse(readFileSync(process.argv[2],'utf8'));
assert.notEqual(profile.jsonMeasured,false,'JSON counters must be active for a work-volume assertion');assert.ok(profile.saves.every(s=>s.jsonCosts.stringifyCalls>0&&s.jsonCosts.parseCalls>0));
assert.equal(profile.syntheticOnly,true);assert.equal(profile.durableReadback,true);assert.equal(profile.scopedMeasured,26);
assert.ok(profile.canonicalPayloadBytes>3_800_000&&profile.canonicalPayloadBytes<4_000_000,'the frozen v12 synthetic workload is required');
// For this frozen fixture, one frozen expected JSON snapshot replaces two
// repeated serializations and one full RETURNING payload parse. This checks
// actual runtime work, independently of wall-clock scheduling noise.
const measured=profile.saves.map(s=>({iteration:s.iteration,stringifyBytes:s.jsonCosts.stringifyBytes,parseBytes:s.jsonCosts.parseBytes}));
console.log(JSON.stringify({limits:{stringifyBytes:25_000_000,parseBytes:22_000_000},measured}));
for(const row of measured){assert.ok(row.stringifyBytes<=25_000_000,'serialization work exceeds 25 MB/save');assert.ok(row.parseBytes<=22_000_000,'readback and clone parsing exceeds 22 MB/save');}
