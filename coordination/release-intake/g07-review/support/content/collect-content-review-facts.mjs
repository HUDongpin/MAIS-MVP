import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root='/Volumes/Starship/MAIS的衍生文件/MAIS-main-wt';
const target='7f692278989b4bf45496d239bccb9263326b5453';
const actor='/root/s5_quality_review/s7_binding_contract';
const directory=path.dirname(fileURLToPath(import.meta.url));
const pointer=fs.readFileSync(path.join(root,'.git'),'utf8').trim();
assert.match(pointer,/^gitdir: /);
const gitDir=path.resolve(root,pointer.slice(8));
const git=(args)=>execFileSync('git',['--no-optional-locks','--no-replace-objects',`--git-dir=${gitDir}`,`--work-tree=${root}`,'-c',`core.worktree=${root}`,'-c','core.fsmonitor=false',...args],{cwd:root,maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
const blob=(commit,p)=>git(['show',`${commit}:${p}`]);
const hash=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const jblob=(commit,p)=>JSON.parse(blob(commit,p));
const identity=()=>({head:git(['rev-parse','HEAD']).toString().trim(),status:git(['status','--porcelain=v1','--untracked-files=all']).toString()});
const before=identity(); assert.equal(before.head,target); assert.equal(before.status,'');
const scriptRawSha256=hash(fs.readFileSync(fileURLToPath(import.meta.url)));
for(const p of ['coordination/integration/promotion-gate-lib.mjs','coordination/integration/v2/promotion-gate-v2-lib.mjs']) assert.deepEqual(fs.readFileSync(path.join(root,p)),blob(target,p));
let fetchAttempts=0;
globalThis.fetch=()=>{fetchAttempts++;throw new Error('Network is forbidden during this read-only review');};
const base=await import(pathToFileURL(path.join(root,'coordination/integration/promotion-gate-lib.mjs')).href);
const v2=await import(pathToFileURL(path.join(root,'coordination/integration/v2/promotion-gate-v2-lib.mjs')).href);
const workflowPath='.github/workflows/promotion-shadow.yml';
const workflowBytes=blob(target,workflowPath);
const manifestPath=workflowBytes.toString().match(/^      PROMOTION_MANIFEST: (.+)$/m)?.[1]; assert.ok(manifestPath);
const manifestBytes=blob(target,manifestPath),manifest=JSON.parse(manifestBytes),baseline=manifest.targetBaselineCommit,source=manifest.sourceCommit;
assert.equal(baseline,'929f6c2bfe1e4185c746b1c75a2e09a196f44a3f');
for(const commit of [source,baseline,manifest.checkerRelease.releaseCommit]) git(['merge-base','--is-ancestor',commit,target]);
const records=[],fileBindings=[],aggregateArtifacts=[];
for(const item of [{kind:'package',path:manifest.candidatePackage.path,rawFileSha256:manifest.candidatePackage.rawSha256},...manifest.candidateArtifacts]){
 const raw=blob(target,item.path),value=JSON.parse(raw),rawSha256=hash(raw);
 assert.equal(rawSha256,item.rawFileSha256);
 const modeObject=git(['ls-tree',target,'--',item.path]).toString().trim();assert.match(modeObject,/^100644 blob /);
 const comparison=[source,baseline,target].map(commit=>({commit,rawSha256:hash(blob(commit,item.path)),gitBlob:git(['rev-parse',`${commit}:${item.path}`]).toString().trim()}));
 assert.ok(comparison.every(x=>x.rawSha256===rawSha256));
 const entry={kind:item.kind,path:item.path,rawSha256,comparison,regularTrackedBlob:true};
 if(item.kind!=='package'){
  entry.recordSha256=base.fingerprint(value);assert.equal(entry.recordSha256,item.recordSha256);
  entry.recordId=value.id;assert.equal(value.id,item.id);
  records.push({binding:item,value,loaded:{bytes:raw,rawSha256}});
  aggregateArtifacts.push({kind:item.kind,id:item.id,path:item.path,rawFileSha256:rawSha256,recordSha256:entry.recordSha256});
 }
 fileBindings.push(entry);
}
const candidatePackage=jblob(target,manifest.candidatePackage.path);
const candidateDigest=base.fingerprint({packageId:candidatePackage.packageId,candidateVersion:candidatePackage.candidateVersion,artifacts:aggregateArtifacts});
assert.equal(candidateDigest,manifest.candidateDigest);
assert.equal(candidatePackage.status,'candidate-only');assert.deepEqual(candidatePackage.authorizations,{shadowAllowed:true,integrationAllowed:false,liveAllowed:false,previewAllowed:false,deployAllowed:false});
const parentSourceRecords=records.map(({binding,value})=>{
 const ref=value.sourceRecord;
 assert.ok(ref.path.startsWith('coordination/content-qa/us-ca-math-rag-v2-candidate/'));
 const observations=[source,baseline,target].map(commit=>{
  const raw=blob(commit,ref.path);let record=JSON.parse(raw);
  for(const part of ref.jsonPointer.slice(1).split('/'))record=record[part.replaceAll('~1','/').replaceAll('~0','~')];
  const recordSha256=base.fingerprint(record);assert.equal(recordSha256,ref.recordSha256);assert.equal(record.id,ref.id);
  return {commit,parentFileRawSha256:hash(raw),recordSha256,recordIdMatches:true};
 });
 return {kind:binding.kind,path:ref.path,jsonPointer:ref.jsonPointer,expectedRecordSha256:ref.recordSha256,observations,privateCorpusRead:false};
});
const checkerFiles=v2.PROMOTION_V2_CHECKER_BUNDLE_PATHS.map(p=>{
 const current=blob(target,p),rawSha256=hash(current); assert.equal(hash(blob(baseline,p)),rawSha256); assert.equal(hash(blob(manifest.checkerRelease.releaseCommit,p)),rawSha256);
 return {path:p,rawSha256};
});
const checkerBundleDigest=v2.computeV2CheckerBundleDigest(checkerFiles);assert.equal(checkerBundleDigest,manifest.checkerRelease.bundleDigest);
assert.equal(hash(blob(target,manifest.checkerRelease.ledgerPath)),manifest.checkerRelease.ledgerRawSha256);
const selectedRoles=['A04','A05','A18','A21','A24'];const evidenceByRole=new Map();const priorEvidence=[];
for(const role of selectedRoles){
 const binding=manifest.evidenceBindings.find(x=>x.role===role),raw=blob(target,binding.evidencePath),evidence=JSON.parse(raw);
 assert.equal(hash(raw),binding.rawSha256);assert.equal(base.fingerprint({role:evidence.role,result:evidence.result,candidateDigest:evidence.candidateDigest,sourceCommit:evidence.sourceCommit,targetBaselineCommit:evidence.targetBaselineCommit,checkerVersion:evidence.checkerVersion,semanticPayload:evidence.semanticPayload}),binding.semanticDigest);
 assert.deepEqual(raw,blob(binding.reviewedCommit,binding.evidencePath));git(['merge-base','--is-ancestor',binding.reviewedCommit,target]);
 const originalPath=`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/inputs/evidence/${path.posix.basename(binding.evidencePath)}`;
 const originalRaw=blob(target,originalPath),original=JSON.parse(originalRaw);
 const originalManifestPath='coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json';
 const originalBinding=jblob(target,originalManifestPath).evidenceBindings.find(x=>x.role===role);
 assert.equal(hash(originalRaw),originalBinding.rawSha256);assert.deepEqual(originalRaw,blob(originalBinding.reviewedCommit,originalPath));
 const keys=Object.keys(evidence.semanticPayload).filter(k=>!['baselineReaffirmation','checkerCurrentnessRevalidation','checkerUpgradeReason'].includes(k));
 const carryFields=keys.map(key=>({field:key,originalEqualsCurrentWrapper:base.fingerprint(original.semanticPayload[key])===base.fingerprint(evidence.semanticPayload[key])}));
 assert.ok(carryFields.every(x=>x.originalEqualsCurrentWrapper));
 evidenceByRole.set(role,evidence);
 priorEvidence.push({role,current:{path:binding.evidencePath,rawSha256:hash(raw),reviewedCommit:binding.reviewedCommit,producedAt:evidence.producedAt,targetBaselineCommit:evidence.targetBaselineCommit,evidenceId:evidence.evidenceId,semanticDigest:binding.semanticDigest},original:{path:originalPath,rawSha256:hash(originalRaw),reviewedCommit:originalBinding.reviewedCommit,producedAt:original.producedAt,targetBaselineCommit:original.targetBaselineCommit,evidenceId:original.evidenceId},carryFields});
}
const candidate={candidatePackage,records,aggregateArtifacts,candidateDigest};
const contentProof=v2.validateV2ContentSemantics(candidate,evidenceByRole);
const outputs=v2.buildV2ShadowDtos(candidate);
const p=records.find(x=>x.binding.kind==='practice').value,l=records.find(x=>x.binding.kind==='lesson').value;
const pd=outputs.find(x=>x.dto.schemaVersion==='shadow-practice-dto.v2').dto,ld=outputs.find(x=>x.dto.schemaVersion==='shadow-lesson-dto.v2').dto;
const preservation={practice:['prompt','answer','acceptedAnswers','acceptedAnswerPolicy','solutionSteps','misconceptionFeedback','assessedStandardIds','prerequisiteStandardIds'].map(key=>({field:key,equal:base.fingerprint(p[key])===base.fingerprint(pd[key])})),lesson:['title','objective','prerequisiteCheck','conceptExplanation','workedExample','guidedPractice','independentPractice','remediation','assessedStandardIds','prerequisiteStandardIds'].map(key=>({field:key,equal:base.fingerprint(l[key])===base.fingerprint(ld[key])}))};
assert.ok(Object.values(preservation).flat().every(x=>x.equal)); assert.ok(outputs.every(x=>x.dto.liveAllowed===false));
assert.equal(outputs.at(-1).dto.defaultsUsed.length,0);
const dtoProof={mode:'pure functions in memory; no Shadow execution or output directory',outputs:outputs.map(x=>({path:x.path,schemaVersion:x.dto.schemaVersion,digest:base.fingerprint(x.dto),liveAllowed:x.dto.liveAllowed})),preservation,defaultsUsed:[],inputRecordsUnchanged:records.every(x=>base.fingerprint(x.value)===x.binding.recordSha256)};
assert.ok(dtoProof.inputRecordsUnchanged);
const keyPaths=(value,prefix='')=>Object.entries(value??{}).flatMap(([key,child])=>{const current=prefix+'/'+key;return [current,...(child&&typeof child==='object'?keyPaths(child,current):[])];});
const exactLayer={pattern:'bitmap|image|illustration|asset|svg|plotly|coordinate|formula-overlay|exact-layer',records:records.map(({binding,value})=>({kind:binding.kind,id:binding.id,fieldPathCount:keyPaths(value).length,matches:keyPaths(value).filter(p=>/(?:bitmap|image|illustration|asset|svg|plotly|coordinate|formula-overlay|exact-layer)/iu.test(p))}))};
assert.ok(exactLayer.records.every(x=>x.matches.length===0));
const compatibilityPath=manifest.liveReachability.compatibilityManifestPath;const compatibilityBytes=blob(target,compatibilityPath);assert.equal(hash(compatibilityBytes),manifest.liveReachability.compatibilityManifestRawSha256);
const observation=await base.observeCanonicalRuntimePolicy(root,JSON.parse(compatibilityBytes));
const runtimePolicy=v2.projectV2RuntimePolicy(observation);
for(const f of observation.snapshot.files)assert.equal(hash(blob(target,f.path)),f.rawSha256);
const reachablePaths=[...observation.graph.reachablePaths].sort(),reachableSet=new Set(reachablePaths);
const needles=[candidatePackage.packageId,manifest.pilotUnitId,...manifest.candidateArtifacts.flatMap(x=>[x.id,x.path])];
const hits=[];let searchableSourceCount=0;
for(const sourcePath of reachablePaths){
 if(!/\.(?:[cm]?[jt]sx?|json)$/u.test(sourcePath))continue;
 searchableSourceCount++;const sourceText=blob(target,sourcePath).toString();
 for(const needle of needles)if(sourceText.includes(needle))hits.push({sourcePath,needleDigest:base.fingerprint(needle)});
}
const candidateReachablePaths=fileBindings.map(x=>x.path).filter(p=>reachableSet.has(p));
const checkerAdapterReachable=reachableSet.has('coordination/integration/v2/promotion-gate-v2-lib.mjs');
assert.equal(hits.length,0);assert.equal(candidateReachablePaths.length,0);assert.equal(checkerAdapterReachable,false);
assert.equal(runtimePolicy.nextDynamicNonliteralImportCount,0);assert.equal(runtimePolicy.zeroBaselineCallCount,0);
const protectedRoots=['app','components','data','lib','public','middleware.ts','next.config.ts','tsconfig.json'];
const changed=git(['diff','--name-only','-z',baseline,target,'--',...protectedRoots]).toString().split('\0').filter(Boolean).sort();
const runtimeChanged=changed.filter(p=>!p.startsWith('tests/')&&!/(?:^|\/)__tests__(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(p));
const changedBindings=runtimeChanged.map(p=>{let beforeRaw=null;try{beforeRaw=blob(baseline,p);}catch{}const afterRaw=blob(target,p);return {path:p,beforeRawSha256:beforeRaw?hash(beforeRaw):null,afterRawSha256:hash(afterRaw),diffRawSha256:hash(git(['diff','--no-ext-diff',baseline,target,'--',p])),candidateIdentityHits:needles.filter(x=>afterRaw.toString().includes(x)).length};});
assert.equal(runtimeChanged.length,12);assert.ok(changedBindings.every(x=>x.candidateIdentityHits===0));
const designPath=path.join(directory,'..','S7-native-resolution-design.json'),designBytes=fs.readFileSync(designPath),design=JSON.parse(designBytes);
assert.deepEqual(runtimeChanged,design.runtimeDelta.runtimeChangedPaths);assert.deepEqual(runtimePolicy,design.runtimeDelta.observed);
const after=identity();assert.deepEqual(after,before);assert.equal(fetchAttempts,0);
const result={schemaVersion:'mais-s7-content-role-facts.v1',reviewedAt:new Date().toISOString(),actor:{taskId:actor,kind:'Codex AI subagent',scopeRoles:selectedRoles,distinctReviewerCount:1,originalCandidateGenerator:false,humanSignature:false,identityMachineAuthenticated:false},targetBaselineCommit:target,sourceBaselineCommit:baseline,candidateSourceCommit:source,workflow:{path:workflowPath,rawSha256:hash(workflowBytes)},sourceManifest:{path:manifestPath,rawSha256:hash(manifestBytes)},candidatePackageId:candidatePackage.packageId,candidateDigest,fileBindings,parentSourceRecords,checker:{version:manifest.checkerVersion,bundleDigest:checkerBundleDigest,files:checkerFiles,ledgerRawSha256:manifest.checkerRelease.ledgerRawSha256},priorEvidence,contentProof:{...contentProof,claim:'fresh execution of existing deterministic content assertions against unchanged records and historically bound role evidence; not a new independent A18 math, curriculum or language review'},dtoProof,exactLayer,runtime:{runtimePolicy,runtimePolicyDigest:base.fingerprint(runtimePolicy),trackedCoveredFilesVerified:observation.snapshot.files.length,searchableSourceCount,needleCount:needles.length,selectedIdentityHits:hits,candidateReachablePaths,checkerAdapterReachable,protectedChangedPaths:changed,runtimeChangedPaths:runtimeChanged,changedBindings,claim:'fresh native read-only runtime scan plus exact target Git object text search; not A23 legacy acceptance or Shadow'},referenceDesign:{path:designPath,rawSha256:hash(designBytes),freshRuntimePolicyEqualsDesign:true},execution:{scriptPath:fileURLToPath(import.meta.url),scriptRawSha256,nodeVersion:process.version,parser:observation.loaderPolicy.parser,before,after,fetchAttempts,appRuntimeExecuted:false,shadowExecuted:false,providerCalls:0,privateCorpusRead:false,environmentFilesRead:false,gitMutations:false,repositoryWrites:false},limits:['A18 mathematical, curriculum and language judgments are historical carry-forward only; no new standards/rights/language review.','Candidate-only and English-only blockers remain; no live integration, rendering, deployment or learner browser proof.','Runtime/legacy gate and actual nine-role/index/commit acceptance remain separate A23/A25 work.','This is one identified AI reviewer across five routing scopes; no five-person or human-signature claim.']};
const destination=path.join(directory,'content-review-facts.json');fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'pass',factsPath:destination,rawSha256:hash(fs.readFileSync(destination)),candidateDigest,sourceRecordCount:parentSourceRecords.length,roles:priorEvidence.map(x=>x.role),answerAssertions:contentProof.acceptedAnswerAssertions.length,dtoCount:outputs.length,exactLayerMatches:exactLayer.records.flatMap(x=>x.matches).length,reachablePaths:runtimePolicy.reachablePathCount,candidateIdentityHits:hits.length,runtimeChangedPaths:runtimeChanged.length,repositoryUnchanged:true}));
