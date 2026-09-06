import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { collectPromotionReaffirmationHistory } from '/Volumes/Starship/MAIS-g07-wt/scripts/promotion-reaffirmation-history.mjs';

const out='/private/tmp/mais-history-review/recheck';
const source='/Volumes/Starship/MAIS-g07-wt';
const run='/Volumes/Starship/MAIS的衍生文件/MAIS-local-topology-recovery-20260902T0212HKT/RUN-20260906T163352HKT';
const original=JSON.parse(fs.readFileSync('/private/tmp/mais-history-review/graft-observation.json','utf8'));
const graft=path.join(original.fixture,'.git/info/grafts');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const graftBefore=sha(fs.readFileSync(graft));
const git=(...args)=>execFileSync('git',['--no-optional-locks','--no-replace-objects',...args],{cwd:original.fixture,encoding:'utf8',env:{PATH:process.env.PATH,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',LC_ALL:'C'}}).trim();
const rawParents=git('cat-file','-p',original.head).split('\n').filter(x=>x.startsWith('parent ')).map(x=>x.slice(7));
assert.deepEqual(rawParents,original.physicalParents);
const binding=original.accepted.changes.find(x=>x.path==='authority/manifest.json').commit;
const evidence=git('cat-file','-p',binding).split('\n').find(x=>x.startsWith('parent ')).slice(7);
const results=[];
const previous=process.env.GIT_GRAFT_FILE;
for(const [name,override] of [['default-existing-original-graft',undefined],['explicit-graft-override',graft],['unavailable-graft-override',path.join(out,'does-not-exist')]]){
  if(override===undefined) delete process.env.GIT_GRAFT_FILE; else process.env.GIT_GRAFT_FILE=override;
  let error;
  try{collectPromotionReaffirmationHistory({repoRoot:original.fixture,evidenceCommit:evidence,manifestPath:'authority/manifest.json',descriptorPath:'authority/descriptor.json',receiptPath:'authority/receipt.json'});}catch(e){error=e.message;}
  assert.equal(error,'AUTHORITY_MERGE_CHANGE');results.push({name,result:'PASS',error});
}
if(previous===undefined)delete process.env.GIT_GRAFT_FILE;else process.env.GIT_GRAFT_FILE=previous;
const facts=JSON.parse(fs.readFileSync(run+'/S7-role-reviews/content-review-facts.json','utf8'));
const manifestPath=facts.sourceManifest.path,folder=path.posix.dirname(manifestPath);
const heads=['7f692278989b4bf45496d239bccb9263326b5453','b583fd91543627f86a9b4b7ed8288506fad38102'];
const fixed=heads.map(headCommit=>{const r=collectPromotionReaffirmationHistory({repoRoot:source,evidenceCommit:'a71743684442a80e83aacec550d5cbc1f45d9eda',headCommit,manifestPath,descriptorPath:folder+'/reaffirmation.v2.json',receiptPath:folder+'/promotion-shadow-receipt.v2.json'});return {headCommit,commits:r.commits.size,merges:r.mergeCount,changes:r.changes};});
assert.deepEqual(fixed[0].changes,fixed[1].changes);
assert.deepEqual(fixed[0].changes,JSON.parse(fs.readFileSync('/private/tmp/mais-history-review/fixed-history.json','utf8')).rows[0].changes);
results.push({name:'main7f-and-b583-original-authority-events-unchanged',result:'PASS'});
const graftAfter=sha(fs.readFileSync(graft));assert.equal(graftAfter,graftBefore);
const report={actor:'/root/s5_quality_review/s7_binding_contract',at:new Date().toISOString(),helperSha256:sha(fs.readFileSync(source+'/scripts/promotion-reaffirmation-history.mjs')),originalFixture:original.fixture,rawParents,evidenceCommit:evidence,graftBeforeSha256:graftBefore,graftAfterSha256:graftAfter,originalFixtureGraftUnmodified:true,results,fixed,pass:results.length,fail:0};
fs.writeFileSync(out+'/independent-graft-recheck.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
