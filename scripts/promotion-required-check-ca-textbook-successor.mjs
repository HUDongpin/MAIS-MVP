#!/usr/bin/env node
// Exact PR304 activation. Native operations always execute the immutable X tree.
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,lstatSync,realpathSync,existsSync,mkdirSync,readdirSync,renameSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const BASE='32f53da1b13b2c1fd28ae4eec1807fd355cc4c17';
export const SOURCE='98d086c83aa4d37d819d4121570b7526c8cb9c06';
export const RELEASE='9e6c971b4f80a2729a8b5892f33c133338a83809';
export const EXECUTION='bdb33bfa3734bc12725c46c7818056e0bce2378b';
export const STORAGE='9ccd3e9e66258334351af3221c01a6f988dc4392';
export const ROOT='coordination/integration/ca-textbook-successor';
export const PREFIX=ROOT+'/attempts/ca-textbook-002';
export const ACTIVATION=ROOT+'/activation/ca-textbook-002';
export const MARKER=ACTIVATION+'/admission.json';
export const SCRIPT='scripts/promotion-required-check-ca-textbook-successor.mjs';
export const MANIFEST=PREFIX+'/manifest.json';
export const MANIFEST_SHA='a3a5c3d41a73797875eedf8956c8c6e2beba17329b1728ef19d9cab0043759a3';
export const LEDGER_SHA='825d6485f3ea7e23d99b8a2690b1ba5d283927a29ffb6f23c259e7ccb5ea6f87';
export const BUNDLE='a96c8b6f95ef95508c35720e54f3b771e9b12194d735c41a4358d8cae1a77659';
export const CANDIDATE='2c24f1895be6ad16b6877b77def687d5d8959fa7eeaff360085a9ee4d5853402';
export const CODE_PATHS=Object.freeze([SCRIPT,'.github/workflows/promotion-shadow.yml',ACTIVATION+'/activation.test.mjs'].sort());
export const REVIEW_FILES=Object.freeze(['a11','a23'].flatMap(r=>[ACTIVATION+'/'+r+'.json',ACTIVATION+'/'+r+'.md']).sort());
export const RECEIPT_PATHS=Object.freeze([PREFIX+'/canonical-receipt.json',PREFIX+'/receipts/fresh.json',PREFIX+'/receipts/replay.json']);
export const RECEIPT_HASHES=Object.freeze(['aaf2402c96a752227880927f9715c7eed189d94861005a74708d609d03f463aa','f9c4429f318bebc0c915edd98bfbc868a547e6c602f29cdfdc25b7107d211c9d','97763730bf13fe7420a10c38d50fa27f5d9f5a6d4076f02964c72290e27c47dd']);
export const REVIEWERS=Object.freeze({A11:'/root/pr304_native_a11',A23:'/root/pr304_native_a23'});
export const PERMISSIONS=Object.freeze({liveAllowed:false,deployAllowed:false,historicalAuthorityTransferred:false,finalizationProven:false});
const HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const ENV=Object.freeze({PATH:'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_GRAFT_FILE:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',LC_ALL:'C'});
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function need(ok,code){if(!ok){const e=new Error(code);e.code=code;throw e;}}
export function stable(v){
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  need(v!==undefined&&(typeof v!=='number'||Number.isFinite(v)),'CA_ACTIVATION_JSON');return JSON.stringify(v);
}
export const digest=v=>hash(Buffer.from(stable(v)));
export const same=(a,b,c)=>need(stable(a)===stable(b),c);
export const keys=(v,k,c)=>{need(v&&typeof v==='object'&&!Array.isArray(v),c);same(Object.keys(v).sort(),[...k].sort(),c);};
const relative=p=>{need(typeof p==='string'&&!p.startsWith('/')&&!p.includes('\\')&&!p.includes('\0')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'),'CA_ACTIVATION_PATH');return p;};
const time=t=>{need(typeof t==='string'&&Number.isFinite(Date.parse(t))&&new Date(t).toISOString()===t&&Date.parse(t)<=Date.now(),'CA_ACTIVATION_TIME');return Date.parse(t);};
function rawGit(root,...args){
  const entry=path.join(root,'.git'),stat=lstatSync(entry);need(!stat.isSymbolicLink(),'CA_ACTIVATION_GIT');
  const gitDir=stat.isDirectory()?realpathSync(entry):realpathSync(path.resolve(root,readFileSync(entry,'utf8').match(/^gitdir: ([^\r\n\0]+)\n?$/)?.[1]??'INVALID'));
  return execFileSync('/usr/bin/git',['--no-replace-objects','--literal-pathspecs','--no-optional-locks','--git-dir='+gitDir,'--work-tree='+root,'-c','core.worktree='+root,'-c','core.fsmonitor=false',...args],{cwd:root,env:ENV,maxBuffer:128*1024*1024,timeout:60000});
}
function regular(root,file){
  relative(file);const absolute=path.join(root,file),s=lstatSync(absolute);
  need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=32*1024*1024&&realpathSync(absolute)===absolute,'CA_ACTIVATION_FILE');return readFileSync(absolute);
}
export function eventBinding(name,event,head,release,parents,treeMatches){
  need(event.repository?.full_name==='HUDongpin/MAIS-MVP','CA_ACTIVATION_REPOSITORY');
  need(HEX40.test(head)&&HEX40.test(release),'CA_ACTIVATION_EVENT');
  if(name==='pull_request'){
    const pr=event.pull_request;
    need(event.number===304&&pr?.number===304&&pr.base?.ref==='main'&&pr.base?.sha===BASE&&pr.head?.sha===head&&head===release&&pr.base.repo?.full_name==='HUDongpin/MAIS-MVP'&&pr.head.repo?.full_name==='HUDongpin/MAIS-MVP','CA_ACTIVATION_PR');
    return {event:'pull_request',pullRequestNumber:304,base:BASE,head,release};
  }
  need(name==='push'&&event.ref==='refs/heads/main'&&event.before===BASE&&event.after===head&&head!==release,'CA_ACTIVATION_MAIN');
  same(parents,[BASE,release],'CA_ACTIVATION_MAIN_PARENTS');need(treeMatches,'CA_ACTIVATION_MAIN_TREE');
  return {event:'push',pullRequestNumber:null,base:BASE,head,release};
}
export function validateAdmissionShape(a){
  keys(a,['schemaVersion','baseCommit','sourceCommit','checkerReleaseCommit','executionCommit','candidateDigest','manifestSha256','storageCommit','receipts','codeCommit','codeFiles','codeDigest','reviews','permissions'],'CA_ACTIVATION_RECORD');
  need(a.schemaVersion==='ca-textbook-activation.v1'&&a.baseCommit===BASE&&a.sourceCommit===SOURCE&&a.checkerReleaseCommit===RELEASE&&a.executionCommit===EXECUTION&&a.candidateDigest===CANDIDATE&&a.manifestSha256===MANIFEST_SHA&&a.storageCommit===STORAGE&&HEX40.test(a.codeCommit)&&HEX64.test(a.codeDigest),'CA_ACTIVATION_BINDING');
  same(a.permissions,PERMISSIONS,'CA_ACTIVATION_PERMISSIONS');
  need(Array.isArray(a.receipts)&&a.receipts.length===3,'CA_ACTIVATION_RECEIPTS');
  same(a.receipts.map(t=>t.path),RECEIPT_PATHS,'CA_ACTIVATION_RECEIPTS');
  for(const [i,t] of a.receipts.entries()){keys(t,['path','storageCommit','sha256'],'CA_ACTIVATION_TRANSPORT');need(t.storageCommit===STORAGE&&t.sha256===RECEIPT_HASHES[i],'CA_ACTIVATION_TRANSPORT');}
  need(Array.isArray(a.codeFiles)&&Array.isArray(a.reviews),'CA_ACTIVATION_RECORD');
  same(a.codeFiles.map(f=>f.path),CODE_PATHS,'CA_ACTIVATION_CODE_SCOPE');
  for(const f of a.codeFiles){keys(f,['path','mode','objectId','sha256'],'CA_ACTIVATION_CODE_BINDING');need(['100644','100755'].includes(f.mode)&&HEX40.test(f.objectId)&&HEX64.test(f.sha256),'CA_ACTIVATION_CODE_BINDING');}
  need(digest(a.codeFiles)===a.codeDigest,'CA_ACTIVATION_CODE_DIGEST');
  same(a.reviews.map(r=>r.path),['a11','a23'].map(r=>ACTIVATION+'/'+r+'.json'),'CA_ACTIVATION_REVIEW_SCOPE');
  for(const r of a.reviews){keys(r,['path','sha256'],'CA_ACTIVATION_REVIEW_REF');need(HEX64.test(r.sha256),'CA_ACTIVATION_REVIEW_REF');}
  return a;
}
export function validateActivationReview(r,a,role,codeTime,sealTime){
  keys(r,['schemaVersion','role','reviewer','reviewedAt','codeCommit','codeDigest','executionCommit','storageCommit','receiptBindingsDigest','report','result'],'CA_ACTIVATION_REVIEW');
  need(r.schemaVersion==='ca-textbook-activation-review.v1'&&r.role===role&&r.reviewer===REVIEWERS[role]&&r.codeCommit===a.codeCommit&&r.codeDigest===a.codeDigest&&r.result==='approved-for-activation','CA_ACTIVATION_REVIEW');
  need(r.executionCommit===EXECUTION&&r.storageCommit===a.storageCommit&&r.receiptBindingsDigest===digest(a.receipts),'CA_ACTIVATION_REVIEW_BINDING');
  need(time(r.reviewedAt)>=codeTime&&Math.floor(time(r.reviewedAt)/1000)<=sealTime/1000,'CA_ACTIVATION_REVIEW_TIME');
  keys(r.report,['path','sha256'],'CA_ACTIVATION_REVIEW_REPORT');
  need(r.report.path===ACTIVATION+'/'+role.toLowerCase()+'.md'&&HEX64.test(r.report.sha256),'CA_ACTIVATION_REVIEW_REPORT');
  return r;
}
export function validateReviewHistory(repo,codeCommit,sealCommit){
  for(const file of REVIEW_FILES){
    repo.absent(codeCommit,file);
    need(repo.addition(file)===sealCommit,'CA_ACTIVATION_REVIEW_HISTORY');
  }
}
export function compareActivationReceipts(stored,fresh,replay,proof,runPrefix,compare){
  need(fresh.runId===runPrefix+'-fresh'&&replay.runId===runPrefix+'-replay','CA_ACTIVATION_RUN_ID');
  const storedComparison=compare(stored,proof),freshComparison=compare([stored[0],fresh,replay],proof);
  need(storedComparison.semanticDigest===freshComparison.semanticDigest,'CA_ACTIVATION_COMPARISON');
  return {storedComparison,freshComparison};
}
export function validateVerificationResponse(value,transport,proof,stored,seenReplayIds){
  keys(value,['schemaVersion','result','transport','binding','semanticDigest','replayRunId','liveAllowed'],'CA_ACTIVATION_VERIFICATION_SCHEMA');
  need(value.schemaVersion==='ca-textbook-verification.v1'&&value.result==='pass'&&value.liveAllowed===false,'CA_ACTIVATION_VERIFICATION_SCHEMA');
  same(value.transport,transport,'CA_ACTIVATION_VERIFICATION_TRANSPORT');
  same(value.binding,proof,'CA_ACTIVATION_VERIFICATION_BINDING');
  need(HEX64.test(value.semanticDigest)&&value.semanticDigest===stored.semanticDigest,'CA_ACTIVATION_VERIFICATION');
  need(typeof value.replayRunId==='string'&&/^verify-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.replayRunId)&&!seenReplayIds.has(value.replayRunId),'CA_ACTIVATION_VERIFICATION_REPLAY');
  seenReplayIds.add(value.replayRunId);
  return value;
}
export function verifyArtifactInventory(root,runs,parse,decisionBytes=null){
  const dir=lstatSync(root);
  need(dir.isDirectory()&&!dir.isSymbolicLink()&&realpathSync(root)===root&&(dir.mode&0o777)===0o700,'CA_ACTIVATION_ARTIFACT_ROOT');
  same(runs.map(r=>[r.label,r.operation]),[['validate','validate'],['fresh','shadow'],['replay','shadow'],['verify-canonical','verify-receipt'],['verify-fresh','verify-receipt'],['verify-replay','verify-receipt']],'CA_ACTIVATION_RUN_INVENTORY');
  const expected=new Map();
  for(const run of runs){
    keys(run,['label','operation','startedAt','completedAt','elapsedMs','exitCode','signal','stdout','stderr'],'CA_ACTIVATION_RUN_RECORD');
    need(run.exitCode===0&&run.signal===null&&Number.isFinite(run.elapsedMs)&&run.elapsedMs>=0&&time(run.startedAt)<=time(run.completedAt),'CA_ACTIVATION_RUN_RECORD');
    for(const channel of ['stdout','stderr']){
      const record=run[channel];keys(record,['name','sha256','bytes'],'CA_ACTIVATION_ARTIFACT_BINDING');
      need(record.name===run.label+'.'+channel&&HEX64.test(record.sha256)&&Number.isInteger(record.bytes)&&record.bytes>=0&&record.bytes<=32*1024*1024,'CA_ACTIVATION_ARTIFACT_BINDING');
      need(channel!=='stderr'||record.bytes===0,'CA_ACTIVATION_ARTIFACT_STDERR');
      expected.set(record.name,record);
    }
  }
  const runsBytes=Buffer.from(JSON.stringify(runs,null,2)+'\n');
  expected.set('runs.json',{name:'runs.json',sha256:hash(runsBytes),bytes:runsBytes.length,expectedBytes:runsBytes});
  if(decisionBytes!==null){need(Buffer.isBuffer(decisionBytes),'CA_ACTIVATION_DECISION_BYTES');expected.set('decision.json',{name:'decision.json',sha256:hash(decisionBytes),bytes:decisionBytes.length,expectedBytes:decisionBytes});}
  same(readdirSync(root).sort(),[...expected.keys()].sort(),'CA_ACTIVATION_ARTIFACT_INVENTORY');
  const bindings=[];
  for(const name of [...expected.keys()].sort()){
    const file=path.join(root,name),stat=lstatSync(file),record=expected.get(name);
    need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&realpathSync(file)===file&&(stat.mode&0o777)===0o600&&stat.size===record.bytes,'CA_ACTIVATION_ARTIFACT_FILE');
    const bytes=readFileSync(file);need(bytes.length===record.bytes&&hash(bytes)===record.sha256&&(!record.expectedBytes||bytes.equals(record.expectedBytes)),'CA_ACTIVATION_ARTIFACT_DRIFT');
    if(name==='runs.json')same(parse(bytes),runs,'CA_ACTIVATION_RUN_RECORD');
    bindings.push({name,sha256:record.sha256,bytes:record.bytes});
  }
  return bindings;
}
async function bootstrap(root){
  need(root===realpathSync(root)&&path.isAbsolute(root),'CA_ACTIVATION_ROOT');
  const parserBytes=rawGit(root,'show',BASE+':scripts/promotion-workflow-json-guard.mjs');
  need(hash(parserBytes)==='b7b919123df63442012446f704bd454f0721b2dcbed4f8aa824d4d5180ce88e5','CA_ACTIVATION_PARSER');
  const {parsePromotionWorkflowJsonBytes:parse}=await import('data:text/javascript;base64,'+parserBytes.toString('base64'));
  const ledgerBytes=rawGit(root,'show',EXECUTION+':'+PREFIX+'/checker-release.json');need(hash(ledgerBytes)===LEDGER_SHA,'CA_ACTIVATION_LEDGER');
  const ledger=parse(ledgerBytes);need(ledger.releaseCommit===RELEASE&&ledger.bundleDigest===BUNDLE&&ledger.version==='ca-textbook-successor.v2','CA_ACTIVATION_LEDGER');
  const head=rawGit(root,'rev-parse','HEAD').toString().trim();
  for(const f of ledger.files){
    const bytes=rawGit(root,'show',RELEASE+':'+relative(f.path));
    need(hash(bytes)===f.sha256&&bytes.equals(regular(root,f.path))&&bytes.equals(rawGit(root,'show',head+':'+f.path)),'CA_ACTIVATION_CHECKER_DRIFT');
    const row=`${f.mode} blob ${f.objectId}\t${f.path}\0`;
    need(rawGit(root,'ls-tree','-z',RELEASE,'--',f.path).toString()===row&&rawGit(root,'ls-tree','-z',head,'--',f.path).toString()===row&&(lstatSync(path.join(root,f.path)).mode&0o111?'100755':'100644')===f.mode,'CA_ACTIVATION_CHECKER_MODE');
  }
  const {Repository,dependency}=await import(pathToFileURL(path.join(root,ROOT,'repository.mjs')));
  const {compareReceipts,verifyReceiptRecord}=await import(pathToFileURL(path.join(root,ROOT,'receipts.mjs')));
  const repo=new Repository(root);repo.clean();same([dependency(root).binding],ledger.dependencies,'CA_ACTIVATION_DEPENDENCY');
  return {repo,parse,compareReceipts,verifyReceiptRecord,ledger};
}
async function preflight(root,eventName,eventPath){
  const ctx=await bootstrap(root),{repo,parse}=ctx;
  const release=repo.addition(MARKER);
  const data=(ref,binding)=>{const value=repo.read(ref,binding);need(value.mode==='100644','CA_ACTIVATION_DATA_MODE');return value;};
  const a=validateAdmissionShape(parse(data(release,{path:MARKER}).bytes));
  repo.ancestor(EXECUTION,a.storageCommit);repo.ancestor(a.storageCommit,a.codeCommit);
  same(repo.parents(a.codeCommit),[a.storageCommit],'CA_ACTIVATION_CODE_PARENT');
  same(repo.changed(EXECUTION,a.storageCommit),[...RECEIPT_PATHS].sort(),'CA_ACTIVATION_STORAGE_SCOPE');
  same(repo.changed(a.storageCommit,a.codeCommit),CODE_PATHS,'CA_ACTIVATION_CODE_SCOPE');
  same(repo.parents(release),[a.codeCommit],'CA_ACTIVATION_SEAL_PARENT');
  same(repo.changed(a.codeCommit,release),[MARKER,...REVIEW_FILES].sort(),'CA_ACTIVATION_SEAL_SCOPE');
  repo.absent(a.codeCommit,MARKER);
  validateReviewHistory(repo,a.codeCommit,release);
  for(const f of a.codeFiles){repo.read(a.codeCommit,f);repo.read(release,f);}
  for(const [index,ref] of a.reviews.entries()){
    const r=parse(data(release,ref).bytes),role=['A11','A23'][index];
    validateActivationReview(r,a,role,repo.time(a.codeCommit),repo.time(release));data(release,r.report);
  }
  const receipts=a.receipts.map(t=>{const file=repo.read(t.storageCommit,{path:t.path,sha256:t.sha256},false);need(file.mode==='100644','CA_ACTIVATION_RECEIPT_MODE');repo.read(release,{path:t.path,mode:file.mode,objectId:file.objectId,sha256:file.sha256});return parse(file.bytes);});
  const event=parse(readFileSync(eventPath));
  const binding=eventBinding(eventName,event,repo.head,release,repo.parents(repo.head),repo.tree(repo.head)===repo.tree(release));
  return {...ctx,admission:a,receipts,event:binding};
}
const outside=(root,other)=>{const rel=path.relative(root,other);return rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel);};
async function check(ctx,executionRoot,artifactRoot){
  const {repo,parse,admission,receipts,compareReceipts}=ctx;
  need(path.isAbsolute(executionRoot)&&realpathSync(executionRoot)===executionRoot&&outside(repo.root,executionRoot)&&outside(executionRoot,repo.root),'CA_ACTIVATION_EXECUTION_ROOT');
  const {Repository}=await import(pathToFileURL(path.join(repo.root,ROOT,'repository.mjs')));
  const execution=new Repository(executionRoot);need(execution.head===EXECUTION,'CA_ACTIVATION_EXECUTION');execution.clean();
  need(hash(execution.blob(EXECUTION,MANIFEST).bytes)===MANIFEST_SHA,'CA_ACTIVATION_MANIFEST');
  for(const f of ctx.ledger.files)execution.read(RELEASE,f);
  need(path.isAbsolute(artifactRoot)&&!existsSync(artifactRoot)&&outside(repo.root,artifactRoot)&&outside(executionRoot,artifactRoot)&&realpathSync(path.dirname(artifactRoot))===path.dirname(artifactRoot),'CA_ACTIVATION_ARTIFACT_ROOT');
  mkdirSync(artifactRoot,{mode:0o700});
  const runs=[];
  let decisionWriteAttempted=false;
  const save=(name,bytes)=>{writeFileSync(path.join(artifactRoot,name),bytes,{flag:'wx',mode:0o600});return {name,sha256:hash(bytes),bytes:bytes.length};};
  function invoke(label,operation,extra=[]){
    const args=[path.join(executionRoot,ROOT,'promotion.mjs'),operation,'--repo',executionRoot,'--manifest',MANIFEST,...extra],startedAt=new Date().toISOString(),start=Date.now();
    const result=spawnSync(process.execPath,args,{cwd:executionRoot,env:{...ENV,NODE_ENV:'test'},timeout:({validate:60000,shadow:120000,'verify-receipt':180000}[operation])+15000,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
    const stdout=result.stdout??Buffer.alloc(0),stderr=result.stderr??Buffer.alloc(0);
    const record={label,operation,startedAt,completedAt:new Date().toISOString(),elapsedMs:Date.now()-start,exitCode:result.status,signal:result.signal??null,stdout:save(label+'.stdout',stdout),stderr:save(label+'.stderr',stderr)};runs.push(record);
    const nextRuns=path.join(artifactRoot,'runs.next.json');
    writeFileSync(nextRuns,JSON.stringify(runs,null,2)+'\n',{flag:'wx',mode:0o600});
    renameSync(nextRuns,path.join(artifactRoot,'runs.json'));
    need(!result.error&&result.status===0&&stderr.length===0,'CA_ACTIVATION_NATIVE_FAILED');
    const value=parse(stdout);need(value.result==='pass'&&value.liveAllowed===false,'CA_ACTIVATION_NATIVE_OUTPUT');return value;
  }
  try{
    const validation=invoke('validate','validate');
    need(validation.proof.executionCommit===EXECUTION&&validation.proof.sourceCommit===SOURCE&&validation.proof.baseCommit===BASE&&validation.proof.checkerReleaseCommit===RELEASE&&validation.proof.checkerBundleDigest===BUNDLE&&validation.proof.candidateDigest===CANDIDATE&&validation.proof.manifest.sha256===MANIFEST_SHA,'CA_ACTIVATION_NATIVE_BINDING');
    const runPrefix='ca304-'+randomUUID();
    const fresh=invoke('fresh','shadow',['--run-id',runPrefix+'-fresh','--execute']);
    const replay=invoke('replay','shadow',['--run-id',runPrefix+'-replay','--execute']);
    const seenReplayIds=new Set([...receipts.map(receipt=>receipt.runId),fresh.runId,replay.runId]);
    for(const [i,t] of admission.receipts.entries()){
      const verified=invoke('verify-'+['canonical','fresh','replay'][i],'verify-receipt',['--path',t.path,'--storage-commit',t.storageCommit,'--sha256',t.sha256,'--execute']);
      validateVerificationResponse(verified,t,validation.proof,receipts[i],seenReplayIds);
    }
    const {storedComparison,freshComparison}=compareActivationReceipts(receipts,fresh,replay,validation.proof,runPrefix,compareReceipts);
    repo.clean();execution.clean();
    const artifactBindings=verifyArtifactInventory(artifactRoot,runs,parse);
    const result={schemaVersion:'ca-textbook-required-check.v1',result:'pass',scope:'exact-pr304-native-required-check',event:ctx.event,executionCommit:EXECUTION,sourceCommit:SOURCE,checkerReleaseCommit:RELEASE,checkerBundleDigest:BUNDLE,candidateDigest:CANDIDATE,manifestSha256:MANIFEST_SHA,storageCommit:admission.storageCommit,storedComparison,freshComparison,runCount:runs.length,artifactBindings,artifactSetDigest:digest(artifactBindings),permissions:PERMISSIONS};
    const decisionBytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
    decisionWriteAttempted=true;save('decision.json',decisionBytes);verifyArtifactInventory(artifactRoot,runs,parse,decisionBytes);return result;
  }catch(error){
    let rejectedDecision=null;
    if(decisionWriteAttempted&&existsSync(path.join(artifactRoot,'decision.json'))){
      rejectedDecision='rejected-decision-'+randomUUID()+'.json';
      need(!existsSync(path.join(artifactRoot,rejectedDecision)),'CA_ACTIVATION_FAILURE_CUSTODY');
      renameSync(path.join(artifactRoot,'decision.json'),path.join(artifactRoot,rejectedDecision));
    }
    save('failure.json',Buffer.from(JSON.stringify({result:'blocked',code:/^CA_[A-Z_]+$/.test(error.code??'')?error.code:'CA_ACTIVATION_FAILED',event:ctx.event,rejectedDecision,permissions:PERMISSIONS})+'\n'));throw error;
  }
}
async function main(){
  need(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH&&process.execArgv.every(a=>!/^--?(?:loader|import|require|experimental-loader)/.test(a)),'CA_ACTIVATION_LOADER');
  const [operation,...args]=process.argv.slice(2);need(['select','check'].includes(operation),'CA_ACTIVATION_USAGE');
  const allowed=operation==='select'?['repo','event-name','event-path']:['repo','event-name','event-path','execution','artifact-root'],options={};
  for(let i=0;i<args.length;i+=2){const key=args[i]?.startsWith('--')?args[i].slice(2):'';need(allowed.includes(key)&&!Object.hasOwn(options,key)&&args[i+1]&&!args[i+1].startsWith('--'),'CA_ACTIVATION_USAGE');options[key]=args[i+1];}
  need(allowed.every(k=>options[k]),'CA_ACTIVATION_USAGE');
  need(fileURLToPath(import.meta.url)===path.join(options.repo,SCRIPT),'CA_ACTIVATION_ENTRYPOINT');
  const ctx=await preflight(options.repo,options['event-name'],options['event-path']);
  if(operation==='select')process.stdout.write('ca-textbook-002\n');
  else process.stdout.write(JSON.stringify(await check(ctx,options.execution,options['artifact-root']))+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  process.stdout.write(JSON.stringify({result:'blocked',code:/^CA_[A-Z_]+$/.test(error.code??'')?error.code:'CA_ACTIVATION_FAILED',permissions:PERMISSIONS})+'\n');process.exitCode=2;
});
