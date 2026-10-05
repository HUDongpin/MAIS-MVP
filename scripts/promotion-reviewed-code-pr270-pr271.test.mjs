import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, mkdirSync, chmodSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { ADMISSION, BASE, SOURCE, PREDECESSOR, PR270, PR271, MERGE270, PR270_INVENTORY, PR271_INVENTORY, SOURCE_INVENTORY, OBSERVATION_SHA, CODE_PATHS, EVIDENCE_PATHS, PR270_PATHS, PR271_PATHS, DIRECTORY, PERMISSIONS, COMMANDS, PULL_REQUEST, HISTORICAL_BASE, hash, inventory, preflight, assertEventComposition, verifyTestRecords, assertMaterializedTree, verifyDecision } from './promotion-reviewed-code-pr270-pr271.mjs';
import { SOURCE as PR259_SOURCE, DIRECTORY as PR259_DIRECTORY } from './promotion-reviewed-code-pr259.mjs';
import { stable } from './promotion-required-check-legacy-successor-v1.mjs';
import { parsePromotionWorkflowJsonBytes } from './promotion-workflow-json-guard.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const observationText="{\"canonicalAudit\":{\"ambiguousConflictCount\":2,\"ambiguousConflictDigest\":\"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\",\"auditDigest\":\"e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91\",\"candidateLikeCount\":37,\"candidateSetDigest\":\"6e8cbaea92a7fa4f50d7efbe95849171381624ab553a1eacdea53dd55490f84f\",\"correlatedConflictCount\":3,\"correlatedConflictDigest\":\"5c70180d917630ca4957db1b4c72e3461ec4a34fb7bcccd313378b164fa948bb\",\"directConflictCount\":0,\"directConflictDigest\":\"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945\",\"knownConflictCount\":0,\"newConflictCount\":3,\"newConflictDigest\":\"5c70180d917630ca4957db1b4c72e3461ec4a34fb7bcccd313378b164fa948bb\",\"opaqueConflictCount\":2,\"opaqueConflictDigest\":\"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\",\"reachableCandidateLikeCount\":5,\"reachableConflictDigest\":\"67dbef280ec8966db3936ef19609a1a78d2dc4871b2e88fe70ad3a282395c4c1\",\"schemaVersion\":\"promotion-legacy-conflict-union-audit.v1\",\"secondaryBlockedCondition\":{\"code\":\"LEGACY_DISCOVERY_INCOMPLETE\",\"conflictCount\":2,\"conflictDigest\":\"0f76afacc72945f16565c534b44f690a76aefa223b8a153801a03d388c396634\"}},\"canonicalAuditDigest\":\"e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91\",\"expectedRuntimePolicy\":{\"classificationsDigest\":\"f753a8dabb95158e57f539a32f77a91390999d9979b13ac8569deb8fce862386\",\"coveredFileCount\":3886,\"coveredFilesDigest\":\"bfe9d0038d061fac7220de3a630b28dd8f5092d36c96ac2c1172dbf2ab845d94\",\"edgeCount\":3686,\"edgeDigest\":\"8a4f097f6b6f65d5c410fbf743b03ac59eaa01eb39d8545a0826bc8cb330362a\",\"frameworkEntrypointCount\":314,\"fsReadAllowlistCount\":5,\"fsReadAllowlistDigest\":\"42e1993fc0afb9984b9f1aaebc67b0f73920c800e41eff3790093fb248bb88ab\",\"nextDynamicCallCount\":489,\"nextDynamicCallsiteDigest\":\"8657ee596ddd3ef60a4e531a5359de0ef78fe3896dd90cb4b85fc013da3aed20\",\"nextDynamicLiteralImportCount\":951,\"nextDynamicNonliteralImportCount\":0,\"reachablePathCount\":1502,\"reachablePathsDigest\":\"029d460af6fa3f553af4f1349ac42429268e14a5d8e4fab017ada4cb22752174\",\"seedCount\":329,\"topologyEdgeCount\":3683,\"topologyEdgeDigest\":\"38ce31f9fec9eeddafdfad47afcedb45904ad7bc376f7c8fe66dd3a47de63cb2\",\"zeroBaselineCallCount\":0}}\n";
const digest=value=>hash(Buffer.from(stable(value)));
const git=(cwd,...args)=>execFileSync('/usr/bin/git',args,{cwd,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',LC_ALL:'C'},maxBuffer:128*1024*1024}).toString('utf8').trim();
const write=(rootDir,file,bytes)=>{mkdirSync(path.dirname(path.join(rootDir,file)),{recursive:true});writeFileSync(path.join(rootDir,file),bytes);};

// Synthetic reviewer records below are test fixtures, never acceptance evidence.
function fixture(run, mutate=()=>{}, extraTooling=[]) {
 const temporary=realpathSync(mkdtempSync(path.join(os.tmpdir(),'pr270-pr271-gate-test-')));
 const repo=path.join(temporary,'repo');mkdirSync(repo);
 try {
  git(repo,'init','-q','--initial-branch=fixture');
  git(repo,'config','user.name','Synthetic Gate Fixture');git(repo,'config','user.email','fixture@example.invalid');
  const common=git(root,'rev-parse','--path-format=absolute','--git-common-dir');
  write(repo,'.git/objects/info/alternates',path.join(common,'objects')+'\n');
  git(repo,'config','core.sparseCheckout','true');
  write(repo,'.git/info/sparse-checkout',[...CODE_PATHS, 'scripts/promotion-required-check-legacy-successor-v1.mjs', 'scripts/promotion-workflow-json-guard.mjs', 'scripts/promotion-reviewed-code-pr259.mjs'].map(x=>'/'+x).join('\n')+'\n/'+DIRECTORY+'/\n');
  git(repo,'checkout','--detach','-q',PREDECESSOR);
  for(const file of CODE_PATHS)write(repo,file,readFileSync(path.join(root,file)));
  for(const file of extraTooling)write(repo,file,'unreviewed tooling byte\n');
  git(repo,'add','--sparse','--',...CODE_PATHS,...extraTooling);git(repo,'commit','-q','-m','Synthetic tooling release');
  const release=git(repo,'rev-parse','HEAD'),toolingDigest=digest(inventory(repo,PREDECESSOR,release));
  const checks='{"syntheticFixture":true}\n';write(repo,`${DIRECTORY}/source-checks.json`,checks);
  write(repo,`${DIRECTORY}/source-observation.json`,observationText);
  const reviews={};
  for(const [role,id] of [['A11','/root/a11_pr270_pr271_review'],['A23','/root/a23_pr270_pr271_review']]) {
   const reportPath=`${DIRECTORY}/${role.toLowerCase()}-review.md`,decisionPath=`${DIRECTORY}/${role.toLowerCase()}-review.json`;
   const report=`Synthetic ${role} unit-test fixture. Not approval.\n`;write(repo,reportPath,report);
   const review={schemaVersion:'promotion-reviewed-code-review.v1',role,reviewerIdentity:id,reviewedAt:'2026-10-05T00:00:00.000Z',reviewedSource:SOURCE,reviewedTooling:release,toolingDigest,sourceInventoryDigest:SOURCE_INVENTORY,pr270InventoryDigest:PR270_INVENTORY,pr271InventoryDigest:PR271_INVENTORY,observationRawSha256:OBSERVATION_SHA,checksRawSha256:hash(Buffer.from(checks)),result:'approved-for-ordinary-code-required-check',report:{path:reportPath,rawSha256:hash(Buffer.from(report))},liveAllowed:false};
   mutate({kind:'review',role,value:review,repo});
   const bytes=JSON.stringify(review)+'\n';write(repo,decisionPath,bytes);
   reviews[role]={decisionRawSha256:hash(Buffer.from(bytes)),reportRawSha256:hash(Buffer.from(report))};
  }
  const admission={schemaVersion:'promotion-reviewed-code-pr270-pr271.v1',baseCommit:BASE,sourceCommit:SOURCE,sourceTree:git(repo,'rev-parse',`${SOURCE}^{tree}`),pr270Commit:PR270,pr271Commit:PR271,merge270Commit:MERGE270,pr270InventoryDigest:PR270_INVENTORY,pr271InventoryDigest:PR271_INVENTORY,sourceInventoryDigest:SOURCE_INVENTORY,toolingRelease:release,toolingTree:git(repo,'rev-parse',`${release}^{tree}`),toolingDigest,observationRawSha256:OBSERVATION_SHA,checksRawSha256:hash(Buffer.from(checks)),reviews,permissions:PERMISSIONS};
  mutate({kind:'admission',value:admission,repo});write(repo,ADMISSION,JSON.stringify(admission)+'\n');
  git(repo,'add','--',...EVIDENCE_PATHS);git(repo,'commit','-q','-m','Synthetic evidence');
  const evidence=git(repo,'rev-parse','HEAD'),eventPath=path.join(temporary,'event.json');
  const event=()=>({number:PULL_REQUEST,pull_request:{base:{sha:BASE},head:{sha:git(repo,'rev-parse','HEAD')}}});
  const check=()=>{writeFileSync(eventPath,JSON.stringify(event()));return preflight({repoRoot:repo,eventName:'pull_request',eventPath});};
  run({repo,check,release,evidence,eventPath,event,temporary});
 } finally {rmSync(temporary,{recursive:true,force:true});}
}

test('immutable disjoint source inventories and observation are pinned to the reviewed objects',()=>{
 assert.equal(PR259_SOURCE,'92482cab6931706b45733b04a0fa7ac9cdc975a7');
 assert.equal(PR259_DIRECTORY,'coordination/integration/reviewed-code/pr259-v3');
 assert.equal(digest(inventory(root,BASE,PR270)),PR270_INVENTORY);
 assert.equal(digest(inventory(root,BASE,PR271)),PR271_INVENTORY);
 assert.equal(digest(inventory(root,BASE,SOURCE)),SOURCE_INVENTORY);
 assert.equal(hash(Buffer.from(observationText)),OBSERVATION_SHA);
 assert.equal(PR270_PATHS.length,6);assert.equal(PR271_PATHS.length,8);
 assert.equal(PR270_PATHS.some(file=>PR271_PATHS.includes(file)),false);
 assert.equal(CODE_PATHS.length,4);assert.equal(EVIDENCE_PATHS.length,7);
 assert.equal(PERMISSIONS.liveAllowed,false);assert.equal(PERMISSIONS.integrationAllowed,false);
 assert.equal(PERMISSIONS.previewAllowed,false);assert.equal(PERMISSIONS.deployAllowed,false);
});
test('real Git exact tooling/evidence chain admits the combined source without touching shared refs',()=>fixture(({check,evidence})=>assert.equal(check().admissionCommit,evidence)));
test('one-byte source drift in either pull request is rejected by full-tree binding',()=>{
 for(const file of ['app/login/page.tsx','lib/server/userStore/teacherOpsClassPersistence.ts'])fixture(({repo,check})=>{
  write(repo,file,git(repo,'show',`${SOURCE}:${file}`)+'\n// unreviewed runtime mutation\n');
  git(repo,'add','--sparse','--',file);git(repo,'commit','-q','-m','Synthetic source drift');
  assert.throws(check,/REVIEWED_CODE_COMPOSITION/);
 });
});
test('a new public candidate copy is not an ordinary-code exemption',()=>fixture(({repo,check})=>{
 write(repo,'public/new-candidate.json','{"candidate":true}\n');git(repo,'add','--sparse','--','public/new-candidate.json');git(repo,'commit','-q','-m','Synthetic public injection');
 assert.throws(check,/REVIEWED_CODE_COMPOSITION/);
}));
test('an extra tooling file is rejected before evidence can launder it',()=>fixture(({check})=>assert.throws(check,/REVIEWED_CODE_TOOLING_PATHS/),()=>{},['docs/unreviewed-tooling.md']));
test('source pull request numbers and the preserved PR259 number are not this admission',()=>fixture(({repo,eventPath,evidence})=>{
 for(const number of [270,271,259]){
  writeFileSync(eventPath,JSON.stringify({number,pull_request:{base:{sha:BASE},head:{sha:evidence}}}));
  assert.throws(()=>preflight({repoRoot:repo,eventName:'pull_request',eventPath}),/REVIEWED_CODE_PR_BASE/);
 }
}));
test('unreviewed changed base, even with valid source ancestry, is rejected',()=>{
 const event={number:PULL_REQUEST,pull_request:{base:{sha:SOURCE},head:{sha:'a'.repeat(40)}}};
 assert.throws(()=>assertEventComposition('pull_request',event,{head:'a'.repeat(40),headDescendsEvidence:true,baseAncestorHead:true,headTree:'tree',evidenceTree:'tree'}),/REVIEWED_CODE_PR_BASE/);
});
test('post-merge main with the exact combined composition passes; conflict resolution and other branches fail',()=>{
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
 fixture(({check})=>assert.throws(check,/REVIEWED_CODE_PERMISSION/),item=>{if(item.kind==='admission')item.value.permissions={...PERMISSIONS,deployAllowed:true};});
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
 const dir=realpathSync(mkdtempSync(path.join(os.tmpdir(),'pr270-pr271-proof-test-')));
 try {
  const rows=COMMANDS.map(([name,args])=>{writeFileSync(path.join(dir,`${name}.stdout`),'pass\n');writeFileSync(path.join(dir,`${name}.stderr`),'');return{name,args,exitCode:0,stdoutSha256:hash(Buffer.from('pass\n')),stderrSha256:hash(Buffer.alloc(0))};});
  assert.doesNotThrow(()=>verifyTestRecords(dir,rows));
  assert.throws(()=>verifyTestRecords(dir,rows.slice(1)),/REVIEWED_CODE_TEST_SET/);
  assert.throws(()=>verifyTestRecords(dir,rows.map((x,i)=>i?x:{...x,exitCode:1})),/REVIEWED_CODE_TEST_EXIT/);
  assert.throws(()=>verifyTestRecords(dir,rows.map((x,i)=>i?x:{...x,args:['--version']})),/REVIEWED_CODE_TEST_COMMAND/);
  writeFileSync(path.join(dir,'link.stdout'),'forged\n');assert.throws(()=>verifyTestRecords(dir,rows),/REVIEWED_CODE_TEST_BYTES/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('selector keeps the PR259 contract and adds a stricter combined mode without skipping the job',()=>{
 const current=YAML.parse(readFileSync(path.join(root,'.github/workflows/promotion-shadow.yml'),'utf8'));
 const job=current.jobs['promotion-shadow-gate'];
 assert.equal(job.name,'promotion-shadow-gate');assert.equal(job.if,undefined);
 assert.equal(current.on.workflow_dispatch,undefined);assert.equal(current.on.pull_request?.paths,undefined);
 const named=name=>job.steps.find(x=>x.name===name);
 const select=named('Select exact Promotion contract').run;
 assert.match(select,/promotion-reviewed-code-pr270-pr271\.mjs select/);
 assert.match(select,/promotion-reviewed-code-pr259\.mjs select/);
 assert.match(select,/promotion-required-check-legacy-successor-v1\.mjs select/);
 assert.match(select,/reviewed-code-pr270-pr271/);
 for(const name of ['Test exact PR270/PR271 reviewed-code contract','Check current PR270/PR271 composition','Prepare historical baseline for PR270/PR271 reviewed code','Verify historical non-live chain for PR270/PR271 reviewed code','Finalize PR270/PR271 reviewed-code decision'])assert.equal(named(name).if,"${{ steps.contract.outputs.mode == 'reviewed-code-pr270-pr271' }}");
 assert.equal(named('Enforce PR270/PR271 reviewed-code required check').if,"${{ always() && steps.contract.outputs.mode == 'reviewed-code-pr270-pr271' }}");
 assert.match(named('Enforce PR270/PR271 reviewed-code required check').run,/promotion-reviewed-code-pr270-pr271\.mjs verify/);
 assert.match(named('Verify historical non-live chain for PR270/PR271 reviewed code').run,/promotion-required-check-legacy-successor-v1\.mjs.*evaluate/);
 assert.match(named('Prepare historical baseline for PR270/PR271 reviewed code').run,/03717842b19e8b8fa9a3a2dbecf1b359bb842233/);
 assert.match(named('Prepare historical baseline for PR270/PR271 reviewed code').run,/npm ci --ignore-scripts/);
 assert.doesNotMatch(named('Prepare historical baseline for PR270/PR271 reviewed code').run,/ln -s/);
 assert.equal(named('Test exact reviewed-code contract').if,"${{ steps.contract.outputs.mode == 'reviewed-code' }}");
 for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
 assert.equal(HISTORICAL_BASE,'03717842b19e8b8fa9a3a2dbecf1b359bb842233');
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
 const invoke=()=>spawnSync(process.execPath,[path.join(repo,'scripts/promotion-reviewed-code-pr270-pr271.mjs'),'finalize','--repo',repo,'--event-name','pull_request','--event-path',eventPath,'--artifact-root',artifacts,'--baseline-artifacts',native],{cwd:repo,encoding:'utf8',env:{...process.env,RUNNER_TEMP:temporary}});
 let result=invoke();assert.equal(result.status,2);assert.match(result.stderr,/ENOENT/);assert.doesNotMatch(result.stdout,/"result":"pass"/);
 const tests=COMMANDS.map(([name,args])=>{writeFileSync(path.join(artifacts,`${name}.stdout`),'pass\n',{mode:0o600});writeFileSync(path.join(artifacts,`${name}.stderr`),'',{mode:0o600});return{name,args,exitCode:0,stdoutSha256:hash(Buffer.from('pass\n')),stderrSha256:hash(Buffer.alloc(0))};});
 const proof={schemaVersion:'promotion-reviewed-code-current.v1',event:{...context.event,headCommit:BASE},sourceCommit:SOURCE,pr270Commit:PR270,pr271Commit:PR271,admissionCommit:context.admissionCommit,tests,observation:{}};
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
 const expected={result:'pass',scope:'exact-pr270-pr271-ordinary-code-only',permissions:PERMISSIONS,decisionDigest:'fixed'};
 assert.doesNotThrow(()=>verifyDecision(structuredClone(expected),expected));
 assert.throws(()=>verifyDecision({...expected,permissions:{...PERMISSIONS,liveAllowed:true},decisionDigest:'rehashed'},expected),/REVIEWED_CODE_DECISION_MISMATCH/);
 assert.throws(()=>verifyDecision({...expected,scope:'all-lessons'},expected),/REVIEWED_CODE_DECISION_MISMATCH/);
 assert.throws(()=>verifyDecision({...expected,scope:'exact-pr259-ordinary-code-only'},expected),/REVIEWED_CODE_DECISION_MISMATCH/);
});
