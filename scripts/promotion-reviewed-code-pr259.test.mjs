import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, mkdirSync, chmodSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { ADMISSION, BASE, SOURCE, PREDECESSOR, SOURCE_INVENTORY, OBSERVATION_SHA, CODE_PATHS, EVIDENCE_PATHS, DIRECTORY, PERMISSIONS, COMMANDS, hash, inventory, preflight, assertEventComposition, verifyTestRecords, assertMaterializedTree, verifyDecision } from './promotion-reviewed-code-pr259.mjs';
import { stable } from './promotion-required-check-legacy-successor-v1.mjs';
import { parsePromotionWorkflowJsonBytes } from './promotion-workflow-json-guard.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const observationText="{\n  \"expectedRuntimePolicy\": {\n    \"coveredFileCount\": 3885,\n    \"coveredFilesDigest\": \"b30df1639176ec1f26b48b20ac4f79113531e54c7dd750c71ede927b35ead679\",\n    \"classificationsDigest\": \"c33ae381ea1b6f913a6c717365a89b7ba2543bc67349f101d6c48544cf86ae72\",\n    \"frameworkEntrypointCount\": 314,\n    \"seedCount\": 329,\n    \"reachablePathCount\": 1502,\n    \"reachablePathsDigest\": \"029d460af6fa3f553af4f1349ac42429268e14a5d8e4fab017ada4cb22752174\",\n    \"edgeCount\": 3686,\n    \"edgeDigest\": \"8a4f097f6b6f65d5c410fbf743b03ac59eaa01eb39d8545a0826bc8cb330362a\",\n    \"topologyEdgeCount\": 3683,\n    \"topologyEdgeDigest\": \"38ce31f9fec9eeddafdfad47afcedb45904ad7bc376f7c8fe66dd3a47de63cb2\",\n    \"nextDynamicCallCount\": 489,\n    \"nextDynamicLiteralImportCount\": 951,\n    \"nextDynamicNonliteralImportCount\": 0,\n    \"nextDynamicCallsiteDigest\": \"8657ee596ddd3ef60a4e531a5359de0ef78fe3896dd90cb4b85fc013da3aed20\",\n    \"fsReadAllowlistCount\": 5,\n    \"fsReadAllowlistDigest\": \"42e1993fc0afb9984b9f1aaebc67b0f73920c800e41eff3790093fb248bb88ab\",\n    \"zeroBaselineCallCount\": 0\n  },\n  \"canonicalAudit\": {\n    \"schemaVersion\": \"promotion-legacy-conflict-union-audit.v1\",\n    \"candidateLikeCount\": 37,\n    \"candidateSetDigest\": \"6e8cbaea92a7fa4f50d7efbe95849171381624ab553a1eacdea53dd55490f84f\",\n    \"directConflictCount\": 0,\n    \"directConflictDigest\": \"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945\",\n    \"correlatedConflictCount\": 3,\n    \"correlatedConflictDigest\": \"5c70180d917630ca4957db1b4c72e3461ec4a34fb7bcccd313378b164fa948bb\",\n    \"ambiguousConflictCount\": 2,\n    \"ambiguousConflictDigest\": \"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\",\n    \"reachableCandidateLikeCount\": 5,\n    \"knownConflictCount\": 0,\n    \"newConflictCount\": 3,\n    \"opaqueConflictCount\": 2,\n    \"reachableConflictDigest\": \"67dbef280ec8966db3936ef19609a1a78d2dc4871b2e88fe70ad3a282395c4c1\",\n    \"newConflictDigest\": \"5c70180d917630ca4957db1b4c72e3461ec4a34fb7bcccd313378b164fa948bb\",\n    \"opaqueConflictDigest\": \"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\",\n    \"secondaryBlockedCondition\": {\n      \"code\": \"LEGACY_DISCOVERY_INCOMPLETE\",\n      \"conflictCount\": 2,\n      \"conflictDigest\": \"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\"\n    },\n    \"auditDigest\": \"e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91\"\n  },\n  \"canonicalAuditDigest\": \"e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91\"\n}\n";
const digest=value=>hash(Buffer.from(stable(value)));
const git=(cwd,...args)=>execFileSync('/usr/bin/git',args,{cwd,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',LC_ALL:'C'},maxBuffer:128*1024*1024}).toString('utf8').trim();
const write=(root,file,bytes)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),bytes);};

// Synthetic reviewer records below are test fixtures, never acceptance evidence.
// A sparse disposable repo reads immutable objects from the original repository;
// all new commits/indices/refs belong exclusively to the disposable fixture.
function fixture(run, mutate=()=>{}) {
 const temporary=realpathSync(mkdtempSync(path.join(os.tmpdir(),'pr259-gate-test-')));
 const repo=path.join(temporary,'repo');mkdirSync(repo);
 try {
  git(repo,'init','-q','--initial-branch=fixture');
  git(repo,'config','user.name','Synthetic Gate Fixture');git(repo,'config','user.email','fixture@example.invalid');
  const common=git(root,'rev-parse','--path-format=absolute','--git-common-dir');
  write(repo,'.git/objects/info/alternates',path.join(common,'objects')+'\n');
  git(repo,'config','core.sparseCheckout','true');
  write(repo,'.git/info/sparse-checkout',[...CODE_PATHS, 'scripts/promotion-required-check-legacy-successor-v1.mjs', 'scripts/promotion-workflow-json-guard.mjs'].map(x=>'/'+x).join('\n')+'\n/'+DIRECTORY+'/\n');
  git(repo,'checkout','--detach','-q',PREDECESSOR);
  for(const file of CODE_PATHS)write(repo,file,readFileSync(path.join(root,file)));
  git(repo,'add','--',...CODE_PATHS);git(repo,'commit','-q','-m','Synthetic tooling release');
  const release=git(repo,'rev-parse','HEAD'),toolingDigest=digest(inventory(repo,PREDECESSOR,release));
  const checks='{"syntheticFixture":true}\n';write(repo,`${DIRECTORY}/source-checks.json`,checks);
  write(repo,`${DIRECTORY}/source-observation.json`,observationText);
  const reviews={};
  for(const [role,id] of [['A11','/root/a11_integration_review'],['A23','/root/a23_gate_review']]) {
   const reportPath=`${DIRECTORY}/${role.toLowerCase()}-review.md`,decisionPath=`${DIRECTORY}/${role.toLowerCase()}-review.json`;
   const report=`Synthetic ${role} unit-test fixture. Not approval.\n`;write(repo,reportPath,report);
   const review={schemaVersion:'promotion-reviewed-code-review.v1',role,reviewerIdentity:id,reviewedAt:'2026-10-01T00:00:00.000Z',reviewedSource:SOURCE,reviewedTooling:release,toolingDigest,sourceInventoryDigest:SOURCE_INVENTORY,observationRawSha256:OBSERVATION_SHA,checksRawSha256:hash(Buffer.from(checks)),result:'approved-for-ordinary-code-required-check',report:{path:reportPath,rawSha256:hash(Buffer.from(report))},liveAllowed:false};
   mutate({kind:'review',role,value:review,repo});
   const bytes=JSON.stringify(review)+'\n';write(repo,decisionPath,bytes);
   reviews[role]={decisionRawSha256:hash(Buffer.from(bytes)),reportRawSha256:hash(Buffer.from(report))};
  }
  const admission={schemaVersion:'promotion-reviewed-code-pr259.v3',baseCommit:BASE,sourceCommit:SOURCE,sourceTree:git(repo,'rev-parse',`${SOURCE}^{tree}`),sourceInventoryDigest:SOURCE_INVENTORY,toolingRelease:release,toolingTree:git(repo,'rev-parse',`${release}^{tree}`),toolingDigest,observationRawSha256:OBSERVATION_SHA,checksRawSha256:hash(Buffer.from(checks)),reviews,permissions:PERMISSIONS};
  mutate({kind:'admission',value:admission,repo});write(repo,ADMISSION,JSON.stringify(admission)+'\n');
  git(repo,'add','--',...EVIDENCE_PATHS);git(repo,'commit','-q','-m','Synthetic evidence');
  const evidence=git(repo,'rev-parse','HEAD'),eventPath=path.join(temporary,'event.json');
  const event=()=>({number:259,pull_request:{base:{sha:BASE},head:{sha:git(repo,'rev-parse','HEAD')}}});
  const check=()=>{writeFileSync(eventPath,JSON.stringify(event()));return preflight({repoRoot:repo,eventName:'pull_request',eventPath});};
  run({repo,check,release,evidence,eventPath,event,temporary});
 } finally {rmSync(temporary,{recursive:true,force:true});}
}

test('immutable source inventory and observation are pinned to actual reviewed objects',()=>{
 assert.equal(digest(inventory(root,BASE,SOURCE)),SOURCE_INVENTORY);
 assert.equal(hash(Buffer.from(observationText)),OBSERVATION_SHA);
 assert.equal(CODE_PATHS.length,4);assert.equal(EVIDENCE_PATHS.length,7);
 assert.equal(PERMISSIONS.liveAllowed,false);assert.equal(PERMISSIONS.integrationAllowed,false);
});
test('real Git exact tooling/evidence chain admits reviewed source without touching shared refs',()=>fixture(({check,evidence})=>assert.equal(check().admissionCommit,evidence)));
test('one-byte source drift or newly exposed candidate is rejected by full-tree binding',()=>fixture(({repo,check})=>{
 const file='components/lesson/ccss/lessons/unit-rate.tsx';
 write(repo,file,git(repo,'show',`${SOURCE}:${file}`)+'\n// unreviewed runtime mutation\n');
 git(repo,'add','--sparse','--',file);git(repo,'commit','-q','-m','Synthetic source drift');
 assert.throws(check,/REVIEWED_CODE_COMPOSITION/);
}));
test('a new public candidate copy is not an ordinary-code exemption',()=>fixture(({repo,check})=>{
 write(repo,'public/new-candidate.json','{"candidate":true}\n');git(repo,'add','--sparse','--','public/new-candidate.json');git(repo,'commit','-q','-m','Synthetic public injection');
 assert.throws(check,/REVIEWED_CODE_COMPOSITION/);
}));
test('unreviewed changed base, even with valid source ancestry, is rejected',()=>{
 const event={number:259,pull_request:{base:{sha:SOURCE},head:{sha:'a'.repeat(40)}}};
 assert.throws(()=>assertEventComposition('pull_request',event,{head:'a'.repeat(40),headDescendsEvidence:true,baseAncestorHead:true,headTree:'tree',evidenceTree:'tree'}),/REVIEWED_CODE_PR_BASE/);
});
test('post-merge main with exact reviewed composition passes; conflict resolution and other branches fail',()=>{
 const event={before:BASE,after:'a'.repeat(40),ref:'refs/heads/main'};
 const actual={head:event.after,headDescendsEvidence:true,baseAncestorHead:true,baseDescendsBaseline:true,headTree:'tree',evidenceTree:'tree',baseTree:'base'};
 assert.equal(assertEventComposition('push',event,actual).headCommit,event.after);
 assert.doesNotThrow(()=>assertEventComposition('push',{...event,before:'b'.repeat(40)},{...actual,baseTree:'tree'}));
 for(const change of [{headTree:'changed'},{headDescendsEvidence:false},{baseAncestorHead:false},{baseDescendsBaseline:false}])assert.throws(()=>assertEventComposition('push',event,{...actual,...change}));
 assert.throws(()=>assertEventComposition('push',{...event,before:'b'.repeat(40)},actual),/REVIEWED_CODE_PUSH_BASE/);
 assert.throws(()=>assertEventComposition('push',{...event,ref:'refs/heads/other'},actual),/REVIEWED_CODE_PUSH_BASE/);
});
test('rehashed counterfeit role, stale source, false result and publication permissions fail closed',()=>{
 for(const field of ['reviewerIdentity','reviewedSource','result','liveAllowed'])fixture(({check})=>assert.throws(check,/REVIEWED_CODE_REVIEW_BINDING/),item=>{
  if(item.kind==='review'&&item.role==='A23')item.value[field]=field==='liveAllowed'?true:field==='reviewedSource'?BASE:'forged';
 });
 fixture(({check})=>assert.throws(check,/REVIEWED_CODE_PERMISSION/),item=>{if(item.kind==='admission')item.value.permissions={...PERMISSIONS,liveAllowed:true};});
});
test('post-review report mutation, dirty source, and symlink evidence are rejected',()=>{
 fixture(({repo,check})=>{write(repo,`${DIRECTORY}/a11-review.md`,'changed\n');assert.throws(check,/REVIEWED_CODE_DIRTY/);});
 fixture(({repo,check})=>{const file=`${DIRECTORY}/a23-review.md`;rmSync(path.join(repo,file));symlinkSync('a11-review.md',path.join(repo,file));git(repo,'add','--',file);git(repo,'commit','-q','-m','Synthetic symlink');assert.throws(check,/REVIEWED_CODE_COMPOSITION/);});
});
test('delete and re-add of admission cannot counterfeit first-addition history',()=>fixture(({repo,check})=>{
 const saved=readFileSync(path.join(repo,ADMISSION));rmSync(path.join(repo,ADMISSION));git(repo,'add','--',ADMISSION);git(repo,'commit','-q','-m','Synthetic removal');
 write(repo,ADMISSION,saved);git(repo,'add','--',ADMISSION);git(repo,'commit','-q','-m','Synthetic re-add');assert.throws(check,/REVIEWED_CODE_ADMISSION_HISTORY/);
}));
test('strict JSON rejects duplicate keys and invalid UTF-8 rather than accepting forged records',()=>{
 assert.throws(()=>parsePromotionWorkflowJsonBytes(Buffer.from('{"result":"blocked","result":"pass"}')));
 assert.throws(()=>parsePromotionWorkflowJsonBytes(Buffer.from([0xff])));
});
test('current tests require exact commands, outputs and successful exits',()=>{
 const dir=realpathSync(mkdtempSync(path.join(os.tmpdir(),'pr259-proof-test-')));
 try {
  const rows=COMMANDS.map(([name,args])=>{writeFileSync(path.join(dir,`${name}.stdout`),'pass\n');writeFileSync(path.join(dir,`${name}.stderr`),'');return{name,args,exitCode:0,stdoutSha256:hash(Buffer.from('pass\n')),stderrSha256:hash(Buffer.alloc(0))};});
  assert.doesNotThrow(()=>verifyTestRecords(dir,rows));
  assert.throws(()=>verifyTestRecords(dir,rows.slice(1)),/REVIEWED_CODE_TEST_SET/);
  assert.throws(()=>verifyTestRecords(dir,rows.map((x,i)=>i?x:{...x,exitCode:1})),/REVIEWED_CODE_TEST_EXIT/);
  assert.throws(()=>verifyTestRecords(dir,rows.map((x,i)=>i?x:{...x,args:['--version']})),/REVIEWED_CODE_TEST_COMMAND/);
  writeFileSync(path.join(dir,'browser.stdout'),'forged\n');assert.throws(()=>verifyTestRecords(dir,rows),/REVIEWED_CODE_TEST_BYTES/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('required job keeps old workflow legs and mandatory current plus historical proofs',()=>{
 const current=YAML.parse(readFileSync(path.join(root,'.github/workflows/promotion-shadow.yml'),'utf8'));
 const prior=YAML.parse(git(root,'show',`${BASE}:.github/workflows/promotion-shadow.yml`));
 assert.deepEqual(current.on,prior.on);
 const job=current.jobs['promotion-shadow-gate'],before=prior.jobs['promotion-shadow-gate'];
 assert.equal(job.name,'promotion-shadow-gate');assert.equal(job.if,undefined);assert.deepEqual(job.env,before.env);
 for(const old of before.steps){const item=job.steps.find(x=>x.name===old.name);assert.ok(item);if(old.name!=='Select exact Promotion contract')assert.deepEqual(item,old);}
 const named=name=>job.steps.find(x=>x.name===name);
 assert.match(named('Select exact Promotion contract').run,/promotion-required-check-legacy-successor-v1.mjs select/);
 assert.match(named('Select exact Promotion contract').run,/promotion-reviewed-code-pr259.mjs select/);
 for(const name of ['Test exact reviewed-code contract','Check current reviewed lesson composition','Prepare historical baseline for reviewed code','Verify historical non-live chain for reviewed code','Finalize reviewed-code decision'])assert.equal(named(name).if,"${{ steps.contract.outputs.mode == 'reviewed-code' }}");
 assert.equal(named('Enforce reviewed-code required check').if,"${{ always() && steps.contract.outputs.mode == 'reviewed-code' }}");
 assert.match(named('Enforce reviewed-code required check').run,/promotion-reviewed-code-pr259.mjs verify/);
 assert.match(named('Verify historical non-live chain for reviewed code').run,/promotion-required-check-legacy-successor-v1.mjs.*evaluate/);
 for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
});


test('full preflight accepts an actual preserving main merge and unchanged-tree child',()=>fixture(({repo,evidence,eventPath})=>{
 git(repo,'checkout','-q','--detach',BASE);git(repo,'merge','--no-ff','--no-edit',evidence);
 let head=git(repo,'rev-parse','HEAD');
 writeFileSync(eventPath,JSON.stringify({before:BASE,after:head,ref:'refs/heads/main'}));
 assert.equal(preflight({repoRoot:repo,eventName:'push',eventPath}).head,head);
 const before=head;git(repo,'commit','--allow-empty','-q','-m','Synthetic unchanged tree');head=git(repo,'rev-parse','HEAD');
 writeFileSync(eventPath,JSON.stringify({before,after:head,ref:'refs/heads/main'}));
 assert.equal(preflight({repoRoot:repo,eventName:'push',eventPath}).head,head);
}));
test('literal Git binding ignores core.worktree redirect and replacement refs',()=>fixture(({repo,check,evidence,temporary})=>{
 const other=path.join(temporary,'redirect');mkdirSync(other);git(repo,'config','core.worktree',other);
 assert.equal(check().head,evidence);
 git(repo,'config','--unset','core.worktree');
 git(repo,'replace',SOURCE,BASE);
 assert.equal(check().head,evidence);
}));
test('actual execution rejects sparse and hidden index files even if metadata preflight succeeds',()=>fixture(({repo,check,evidence})=>{
 assert.equal(check().head,evidence);
 assert.throws(()=>assertMaterializedTree(repo,evidence),/REVIEWED_CODE_INDEX_FLAGS/);
}));
test('actual CLI finalizer blocks missing proof, wrong event, missing native evidence and cannot emit pass',()=>fixture(({repo,check,eventPath,temporary})=>{
 const context=check(),artifacts=path.join(temporary,'artifacts');mkdirSync(artifacts,{mode:0o700});
 const native=path.join(temporary,'native');mkdirSync(native,{mode:0o700});
 const invoke=()=>spawnSync(process.execPath,[path.join(repo,'scripts/promotion-reviewed-code-pr259.mjs'),'finalize','--repo',repo,'--event-name','pull_request','--event-path',eventPath,'--artifact-root',artifacts,'--baseline-artifacts',native],{cwd:repo,encoding:'utf8',env:{...process.env,RUNNER_TEMP:temporary}});
 let result=invoke();assert.equal(result.status,2);assert.match(result.stderr,/ENOENT/);assert.doesNotMatch(result.stdout,/"result":"pass"/);
 const tests=COMMANDS.map(([name,args])=>{writeFileSync(path.join(artifacts,`${name}.stdout`),'pass\n',{mode:0o600});writeFileSync(path.join(artifacts,`${name}.stderr`),'',{mode:0o600});return{name,args,exitCode:0,stdoutSha256:hash(Buffer.from('pass\n')),stderrSha256:hash(Buffer.alloc(0))};});
 const proof={schemaVersion:'promotion-reviewed-code-current.v1',event:{...context.event,headCommit:BASE},sourceCommit:SOURCE,admissionCommit:context.admissionCommit,tests,observation:{}};
 writeFileSync(path.join(artifacts,'current.json'),JSON.stringify(proof),{mode:0o600});
 result=invoke();assert.equal(result.status,2);assert.match(result.stderr,/REVIEWED_CODE_CURRENT_EVENT/);
 proof.event=context.event;writeFileSync(path.join(artifacts,'current.json'),JSON.stringify(proof));
 result=invoke();assert.equal(result.status,2);assert.match(result.stderr,/ACTIVATION_ARTIFACT_SET/);
 for(const name of ['decision.v1.json','fresh.json','fresh.stderr','native-runs.v1.json','verification.json','verification.stderr'])writeFileSync(path.join(native,name),'{}',{mode:0o600});
 chmodSync(path.join(native,'fresh.json'),0o644);
 result=invoke();assert.equal(result.status,2);assert.match(result.stderr,/ACTIVATION_ARTIFACT_FILE/);
 assert.doesNotMatch(result.stdout,/"result":"pass"/);
}));
test('final decision comparison rejects even rehashed changes to scope or permissions',()=>{
 const expected={result:'pass',scope:'exact-pr259-ordinary-code-only',permissions:PERMISSIONS,decisionDigest:'fixed'};
 assert.doesNotThrow(()=>verifyDecision(structuredClone(expected),expected));
 assert.throws(()=>verifyDecision({...expected,permissions:{...PERMISSIONS,liveAllowed:true},decisionDigest:'rehashed'},expected),/REVIEWED_CODE_DECISION_MISMATCH/);
 assert.throws(()=>verifyDecision({...expected,scope:'all-lessons'},expected),/REVIEWED_CODE_DECISION_MISMATCH/);
});


test('baseline dependency setup keeps the historical worktree genuinely clean',()=>{
 const dir=realpathSync(mkdtempSync(path.join(os.tmpdir(),'pr259-baseline-test-')));
 try {
  git(dir,'init','-q','--initial-branch=fixture');git(dir,'config','user.name','Fixture');git(dir,'config','user.email','fixture@example.invalid');
  writeFileSync(path.join(dir,'.gitignore'),'node_modules/\n');git(dir,'add','--','.gitignore');git(dir,'commit','-q','-m','Synthetic ignore rule');
  symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'));
  assert.equal(git(dir,'status','--porcelain=v1','--untracked-files=all'),'?? node_modules');
  rmSync(path.join(dir,'node_modules'));mkdirSync(path.join(dir,'node_modules'));
  assert.equal(git(dir,'status','--porcelain=v1','--untracked-files=all'),'');
  const workflow=YAML.parse(readFileSync(path.join(root,'.github/workflows/promotion-shadow.yml'),'utf8'));
  const prepare=workflow.jobs['promotion-shadow-gate'].steps.find(x=>x.name==='Prepare historical baseline for reviewed code').run;
  assert.match(prepare,/cd "\$baseline"\n(?: +)?npm ci --ignore-scripts/u);
  assert.doesNotMatch(prepare,/ln -s/u);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
