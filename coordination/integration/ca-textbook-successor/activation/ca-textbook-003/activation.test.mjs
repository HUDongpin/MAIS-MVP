// Synthetic authority mutations and pure receipt comparisons only; not live approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,realpathSync,rmSync,unlinkSync,symlinkSync,linkSync,chmodSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {
  BASE,SOURCE,RELEASE,EXECUTION,ACTIVATION,MARKER,SCRIPT,MANIFEST_SHA,CANDIDATE,
  CODE_PATHS,REVIEW_FILES,RECEIPT_PATHS,REVIEWERS,PERMISSIONS,hash,digest,eventBinding,
  validateAdmissionShape,validateActivationReview,compareActivationReceipts,
} from '../../../../../scripts/promotion-required-check-ca-textbook-successor.mjs';
import {parse} from '../../common.mjs';
import {sealReceipt,compareReceipts} from '../../receipts.mjs';
import {Repository} from '../../repository.mjs';
const L='a'.repeat(40),M='b'.repeat(40),F='51fc0b1503c4aa2b00c0d431347362c6d9d9a788',A='d'.repeat(40),H='e'.repeat(64);
const receiptHashes=['3dff990fc57c23b1b914590a63d9c56baf936c9e13bd3c2abd54fc3cd50dce5c','e7069503a8d43e9f9b0ed07882e4c959b2b9bf7adc9027559694f278a0b8ad72','5b3d0ac7e51e4b7c9e54e12848bd99ef12d41d07d59b87b10b5a9e8d2d905592'];
const repository={full_name:'HUDongpin/MAIS-MVP'};
const pr=()=>({repository,number:304,pull_request:{number:304,base:{ref:'main',sha:BASE,repo:repository},head:{sha:L,repo:repository}}});
const push=()=>({repository,ref:'refs/heads/main',before:BASE,after:M});
test('exact PR304 and ordered same-tree main events are admitted',()=>{
  assert.equal(eventBinding('pull_request',pr(),L,L,[],false).pullRequestNumber,304);
  assert.equal(eventBinding('push',push(),M,L,[BASE,L],true).pullRequestNumber,null);
});
for(const [name,mutate] of [
  ['other PR',e=>{e.number=305;}],['wrong base',e=>{e.pull_request.base.sha=F;}],
  ['wrong head',e=>{e.pull_request.head.sha=F;}],['fork source',e=>{e.pull_request.head.repo={full_name:'other/repo'};}],
  ['other repository',e=>{e.repository={full_name:'other/repo'};}],['non-main target',e=>{e.pull_request.base.ref='other';}],
])test('PR event rejects '+name,()=>{const e=pr();mutate(e);assert.throws(()=>eventBinding('pull_request',e,L,L,[],false));});
test('main rejects squash, reversed parents, changed tree, wrong ref and moved base',()=>{
  for(const parents of [[BASE],[L,BASE],[F,L]])assert.throws(()=>eventBinding('push',push(),M,L,parents,true));
  assert.throws(()=>eventBinding('push',push(),M,L,[BASE,L],false));
  for(const mutate of [e=>{e.ref='refs/heads/other';},e=>{e.before=F;},e=>{e.after=F;}]){const e=push();mutate(e);assert.throws(()=>eventBinding('push',e,M,L,[BASE,L],true));}
});
function admission(){
  const codeFiles=CODE_PATHS.map(p=>({path:p,mode:'100644',objectId:'f'.repeat(40),sha256:H}));
  return {schemaVersion:'ca-textbook-activation.v1',baseCommit:BASE,sourceCommit:SOURCE,checkerReleaseCommit:RELEASE,executionCommit:EXECUTION,candidateDigest:CANDIDATE,manifestSha256:MANIFEST_SHA,storageCommit:F,receipts:RECEIPT_PATHS.map((p,i)=>({path:p,storageCommit:F,sha256:receiptHashes[i]})),codeCommit:A,codeFiles,codeDigest:digest(codeFiles),reviews:['a11','a23'].map(r=>({path:ACTIVATION+'/'+r+'.json',sha256:H})),permissions:{...PERMISSIONS}};
}
test('closed activation record accepts its exact shape only',()=>{
  const a=admission();assert.equal(validateAdmissionShape(a),a);
  for(const mutate of [a=>{a.extra=true;},a=>{a.permissions.liveAllowed=true;},a=>{a.sourceCommit=F;},a=>{a.executionCommit=F;},a=>{a.candidateDigest=H;},a=>{a.receipts[1].path=a.receipts[0].path;},a=>{a.receipts[1].storageCommit=A;},a=>{a.receipts.push(a.receipts[0]);},a=>{a.codeFiles.reverse();a.codeDigest=digest(a.codeFiles);},a=>{a.codeFiles[0].path='app/page.tsx';a.codeDigest=digest(a.codeFiles);},a=>{a.reviews.reverse();}]){
    const a=admission();mutate(a);assert.throws(()=>validateAdmissionShape(a));
  }
});
function review(role,a,at){return {schemaVersion:'ca-textbook-activation-review.v1',role,reviewer:REVIEWERS[role],reviewedAt:new Date(at).toISOString(),codeCommit:a.codeCommit,codeDigest:a.codeDigest,executionCommit:EXECUTION,storageCommit:a.storageCommit,receiptBindingsDigest:digest(a.receipts),report:{path:ACTIVATION+'/'+role.toLowerCase()+'.md',sha256:H},result:'approved-for-activation'};}
test('post-code review requires distinct fixed identity, exact F/X/code and bounded chronology',()=>{
  const a=admission(),seal=Math.floor(Date.now()/1000)*1000,code=seal-10000;
  for(const role of ['A11','A23']){
    const r=review(role,a,code+1000);assert.equal(validateActivationReview(r,a,role,code,seal),r);
    for(const mutate of [r=>{r.reviewer='/root';},r=>{r.codeCommit=F;},r=>{r.executionCommit=F;},r=>{r.storageCommit=A;},r=>{r.receiptBindingsDigest='0'.repeat(64);},r=>{r.reviewedAt=new Date(code-1).toISOString();},r=>{r.reviewedAt=new Date(seal+10000).toISOString();},r=>{r.report.path=ACTIVATION+'/other.md';},r=>{r.extra=true;}]){
      const r=review(role,a,code+1000);mutate(r);assert.throws(()=>validateActivationReview(r,a,role,code,seal));
    }
  }
});
const sourceRoot=new URL('../../../../../',import.meta.url);
const stored=RECEIPT_PATHS.map(p=>parse(readFileSync(new URL(p,sourceRoot))));
const proof=stored[0].binding,out=stored[0].rehearsal.outputDigest,prefix='synthetic-activation-test';
test('activation compares stored canonical with newly generated fresh and replay',()=>{
  const fresh=sealReceipt(proof,prefix+'-fresh',out),replay=sealReceipt(proof,prefix+'-replay',out);
  const value=compareActivationReceipts(stored,fresh,replay,proof,prefix,compareReceipts);
  assert.equal(value.storedComparison.semanticDigest,value.freshComparison.semanticDigest);
  assert.throws(()=>compareActivationReceipts(stored,sealReceipt(proof,prefix+'-fresh','1'.repeat(64)),replay,proof,prefix,compareReceipts));
  assert.throws(()=>compareActivationReceipts(stored,stored[1],replay,proof,prefix,compareReceipts));
  assert.throws(()=>compareActivationReceipts(stored,fresh,sealReceipt({...proof,sourceCommit:F},prefix+'-replay',out),proof,prefix,compareReceipts));
});
test('CLI rejects unexpected authority parameters without echoing raw input',()=>{
  const script=fileURLToPath(new URL(SCRIPT,sourceRoot));
  for(const args of [['select','--override','secret-sentinel'],['check','--timeout','secret-sentinel'],['check']]){
    const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});
    assert.equal(r.status,2);assert.equal(r.stdout.includes('secret-sentinel'),false);assert.equal(parse(Buffer.from(r.stdout)).permissions.liveAllowed,false);
  }
});

test('ACT-01 rejects a substituted storage commit even with matching internal references',()=>{
  const a=admission();a.storageCommit='1'.repeat(40);for(const t of a.receipts)t.storageCommit=a.storageCommit;
  assert.throws(()=>validateAdmissionShape(a));
});
test('ACT-01 pins all three designated stored receipt byte hashes',()=>{
  const a=admission();a.receipts[0].sha256='2'.repeat(64);assert.throws(()=>validateAdmissionShape(a));
});
test('ACT-01 rejects review paths added, deleted and re-added before the only marker addition',async()=>{
  const gate=await import('../../../../../scripts/promotion-required-check-ca-textbook-successor.mjs');
  assert.equal(typeof gate.validateReviewHistory,'function');
  for(const reused of [false,true]){
    const root=realpathSync(mkdtempSync(path.join(realpathSync(tmpdir()),'ca-activation-history-')));
    const env={PATH:'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_AUTHOR_NAME:'Synthetic',GIT_AUTHOR_EMAIL:'synthetic@example.invalid',GIT_COMMITTER_NAME:'Synthetic',GIT_COMMITTER_EMAIL:'synthetic@example.invalid'};
    const git=(...args)=>execFileSync('/usr/bin/git',args,{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    const write=(file,value)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),value);};
    const commit=files=>{git('add','--',...files);git('commit','-qm','Synthetic history only');return git('rev-parse','HEAD');};
    try{
      git('init','-q','--initial-branch=fixture');git('config','commit.gpgsign','false');git('config','core.hooksPath','/dev/null');
      write('source.txt','synthetic');commit(['source.txt']);
      if(reused){for(const file of REVIEW_FILES)write(file,'old synthetic review');commit(REVIEW_FILES);git('rm','--',...REVIEW_FILES);git('commit','-qm','Retain failed evidence history');}
      write('code.txt','synthetic code');const code=commit(['code.txt']);
      for(const file of REVIEW_FILES)write(file,'new synthetic review');write(MARKER,'synthetic marker');const seal=commit([...REVIEW_FILES,MARKER]);
      const repo=new Repository(root);assert.equal(repo.addition(MARKER),seal);
      if(reused)assert.throws(()=>gate.validateReviewHistory(repo,code,seal),/CA_FIRST_ADD|CA_ACTIVATION_REVIEW_HISTORY/);
      else assert.doesNotThrow(()=>gate.validateReviewHistory(repo,code,seal));
    }finally{rmSync(root,{recursive:true,force:true});}
  }
});
test('ACT-02 binds verification responses to exact transport, proof and distinct replay identity',async()=>{
  const gate=await import('../../../../../scripts/promotion-required-check-ca-textbook-successor.mjs');assert.equal(typeof gate.validateVerificationResponse,'function');
  const transport=admission().receipts[0],good={schemaVersion:'ca-textbook-verification.v1',result:'pass',transport,binding:proof,semanticDigest:stored[0].semanticDigest,replayRunId:'verify-00000000-0000-4000-8000-000000000001',liveAllowed:false};
  const forbidden=stored.map(r=>r.runId);assert.doesNotThrow(()=>gate.validateVerificationResponse(good,transport,proof,stored[0],new Set(forbidden)));
  for(const mutate of [v=>{v.transport.storageCommit=A;},v=>{v.binding.executionCommit=A;},v=>{delete v.binding;},v=>{v.extra=true;},v=>{v.schemaVersion='other';},v=>{v.replayRunId=stored[0].runId;},v=>{v.replayRunId='invalid';},v=>{v.semanticDigest=H;}]){
    const value=structuredClone(good);mutate(value);assert.throws(()=>gate.validateVerificationResponse(value,transport,proof,stored[0],new Set(forbidden)));
  }
  assert.throws(()=>gate.validateVerificationResponse(good,transport,proof,stored[0],new Set([...forbidden,good.replayRunId])));
});
test('A23-ACT-01 rereads the exact artifact inventory and rejects mutations and aliases',async()=>{
  const gate=await import('../../../../../scripts/promotion-required-check-ca-textbook-successor.mjs');assert.equal(typeof gate.verifyArtifactInventory,'function');
  const plans=[['validate','validate'],['fresh','shadow'],['replay','shadow'],['verify-canonical','verify-receipt'],['verify-fresh','verify-receipt'],['verify-replay','verify-receipt']];
  function seed(root){
    const now=new Date().toISOString(),runs=plans.map(([label,operation])=>{
      const save=(suffix,bytes)=>{const name=label+'.'+suffix;writeFileSync(path.join(root,name),bytes,{mode:0o600});return {name,sha256:hash(bytes),bytes:bytes.length};};
      return {label,operation,startedAt:now,completedAt:now,elapsedMs:0,exitCode:0,signal:null,stdout:save('stdout',Buffer.from('{}\n')),stderr:save('stderr',Buffer.alloc(0))};
    });writeFileSync(path.join(root,'runs.json'),JSON.stringify(runs,null,2)+'\n',{mode:0o600});return runs;
  }
  const cases=[null,r=>writeFileSync(path.join(r,'validate.stdout'),'changed'),r=>unlinkSync(path.join(r,'validate.stdout')),r=>writeFileSync(path.join(r,'extra.txt'),'extra',{mode:0o600}),r=>{unlinkSync(path.join(r,'validate.stdout'));symlinkSync('fresh.stdout',path.join(r,'validate.stdout'));},r=>{unlinkSync(path.join(r,'validate.stdout'));linkSync(path.join(r,'fresh.stdout'),path.join(r,'validate.stdout'));},r=>chmodSync(path.join(r,'validate.stdout'),0o644),r=>writeFileSync(path.join(r,'runs.json'),'[]')];
  for(const change of cases){const root=realpathSync(mkdtempSync(path.join(realpathSync(tmpdir()),'ca-artifact-integrity-')));try{const runs=seed(root);if(change){change(root);assert.throws(()=>gate.verifyArtifactInventory(root,runs,parse));}else{
    assert.equal(gate.verifyArtifactInventory(root,runs,parse).length,13);
    const decision=Buffer.from('{"syntheticOnly":true}\n');writeFileSync(path.join(root,'decision.json'),decision,{mode:0o600});
    assert.equal(gate.verifyArtifactInventory(root,runs,parse,decision).length,14);
    writeFileSync(path.join(root,'decision.json'),'changed');assert.throws(()=>gate.verifyArtifactInventory(root,runs,parse,decision));
  }}finally{rmSync(root,{recursive:true,force:true});}}
});
