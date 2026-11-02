import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const file = new URL("./currentness.mjs", import.meta.url);
const gate = existsSync(file) ? await import(file.href) : {};
const prior = JSON.parse(readFileSync(path.join(process.env.CA004_TEST_REPO_ROOT ?? process.cwd(), "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/inputs/candidate.json"), "utf8"));
const paths = ["lib/californiaGradeAware.test.ts", "scripts/audit-math-diagram-inventory.ts", "tests/e2e/math-diagram-source-geometry.test.ts"];
function candidate() {
  const value = structuredClone(prior);
  value.sourceCommit = "c".repeat(40); value.sourceTree = "d".repeat(40);
  for (const path of paths) {
    const row = value.files.find(row => row.path === path);
    row.objectId = "e".repeat(40); row.sha256 = "f".repeat(64);
  }
  return value;
}

test("currentness uses an explicit three-file tooling delta without changing the lesson candidate", () => {
  assert.equal(typeof gate.validateCandidateDelta, "function");
  const result = gate.validateCandidateDelta(prior, candidate());
  assert.deepEqual(result.changedPaths, paths);
  assert.equal(result.substantiveContentUnchanged, true);
});
for (const [name, mutate] of [
  ["a fourth file", c => { c.files[0].sha256 = "0".repeat(64); }],
  ["a changed check digest", c => { c.checksDigest = "0".repeat(64); }],
  ["a changed primary mapping", c => { c.mappings[0].topicId = "foreign"; }],
  ["an altered asset witness", c => { c.assets[0].witnesses[0].source.sha256 = "0".repeat(64); }],
  ["lost retirement", c => { c.removals.pop(); }],
  ["a missing bound file", c => { c.files.pop(); }],
  ["an extra bound file", c => { c.files.push({ path: "extra.ts", mode: "100644", objectId: "a".repeat(40), sha256: "b".repeat(64) }); }],
  ["a duplicate bound file", c => { c.files[1] = structuredClone(c.files[0]); }],
  ["changed source mode", c => { c.files.find(r => r.path === paths[0]).mode = "100755"; }],
  ["unknown authority key", c => { c.liveAllowed = true; }]
]) {
  test(`candidate delta rejects ${name}`, () => {
    assert.equal(typeof gate.validateCandidateDelta, "function");
    const c = candidate(); mutate(c);
    assert.throws(() => gate.validateCandidateDelta(prior, c), /CA004_/);
  });
}

test("same old file bytes cannot masquerade as a new three-path candidate delta", () => {
  assert.equal(typeof gate.validateCandidateDelta, "function");
  const c = candidate();
  c.files[c.files.findIndex(r => r.path === paths[0])] = structuredClone(prior.files.find(r => r.path === paths[0]));
  assert.throws(() => gate.validateCandidateDelta(prior, c), /CA004_/);
});

test("phase transitions require exact paths and preserve the original source merge ancestry", () => {
  assert.equal(typeof gate.validatePhaseDelta, "function");
  assert.deepEqual(gate.validatePhaseDelta({actualParents:["c".repeat(40)],expectedParent:"c".repeat(40),actualPaths:["b","a"],expectedPaths:["a","b"]}), ["a","b"]);
  assert.throws(() => gate.validatePhaseDelta({actualParents:["d".repeat(40)],expectedParent:"c".repeat(40),actualPaths:["a"],expectedPaths:["a"]}), /CA004_/);
  assert.throws(() => gate.validatePhaseDelta({actualParents:["c".repeat(40)],expectedParent:"c".repeat(40),actualPaths:["a","foreign"],expectedPaths:["a"]}), /CA004_/);
});

test("post-merge acceptance binds actual ordered parents and exact release tree", () => {
  assert.equal(typeof gate.validateMergeBinding, "function");
  const v={baseCommit:"a".repeat(40),releaseCommit:"b".repeat(40),mergeCommit:"c".repeat(40),mergeParents:["a".repeat(40),"b".repeat(40)],releaseTree:"d".repeat(40),mergeTree:"d".repeat(40)};
  gate.validateMergeBinding(v);
  assert.throws(() => gate.validateMergeBinding({...v,mergeParents:[v.releaseCommit,v.baseCommit]}), /CA004_/);
  assert.throws(() => gate.validateMergeBinding({...v,mergeTree:"e".repeat(40)}), /CA004_/);
});

const ledger = JSON.parse(readFileSync(path.join(process.env.CA004_TEST_REPO_ROOT ?? process.cwd(), "coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/checker-release.json"), "utf8"));
function observationBundle() {
  const files=structuredClone(ledger.files);
  for(const name of ["package.json","package-lock.json"]){const row=files.find(r=>r.path===name);row.objectId="e".repeat(40);row.sha256="f".repeat(64);}
  return {files,dependencies:structuredClone(ledger.dependencies)};
}
test("new observation bundle preserves original code while binding exact reviewed package inputs",()=>{
  assert.equal(typeof gate.validateObservationBundle,"function");
  const b=observationBundle();const result=gate.validateObservationBundle(ledger,b,b.files.filter(r=>["package.json","package-lock.json"].includes(r.path)));
  assert.equal(result.preservedCodeFiles,31);assert.equal(result.packageInputs,2);
});
for(const [name,mutate] of [
 ["parser/code drift",b=>{b.files[0].sha256="0".repeat(64);}],
 ["foreign extra code",b=>{b.files.push({path:"foreign.mjs",mode:"100644",objectId:"a".repeat(40),sha256:"b".repeat(64)});}],
 ["TypeScript dependency substitution",b=>{b.dependencies[0].treeDigest="0".repeat(64);}],
 ["added external capability",b=>{b.liveAllowed=true;}]
])test(`observation bundle rejects ${name}`,()=>{
 assert.equal(typeof gate.validateObservationBundle,"function");const b=observationBundle();const inputs=structuredClone(b.files.filter(r=>["package.json","package-lock.json"].includes(r.path)));mutate(b);assert.throws(()=>gate.validateObservationBundle(ledger,b,inputs),/CA004_/);
});
test("observation package files cannot differ from the actual source binding",()=>{
 assert.equal(typeof gate.validateObservationBundle,"function");const b=observationBundle(),inputs=structuredClone(b.files.filter(r=>["package.json","package-lock.json"].includes(r.path)));inputs[0].sha256="0".repeat(64);assert.throws(()=>gate.validateObservationBundle(ledger,b,inputs),/CA004_/);
});

test("the unchanged real capsule accepts a new exact package-bound release without borrowing old phase authority", async () => {
  const repoRoot=process.env.CA004_TEST_REPO_ROOT ?? process.cwd();
  const moduleUrl=name=>pathToFileURL(path.join(repoRoot,"coordination/integration/ca-textbook-successor",name)).href;
  const {registeredFixture}=await import(moduleUrl("test-fixtures.mjs"));
  const {Repository,dependency}=await import(moduleUrl("repository.mjs"));
  const {runCapturedObserver}=await import(moduleUrl("capsule.mjs"));
  const {BUNDLE_PATHS}=await import(moduleUrl("constants.mjs"));
  const {digest}=await import(moduleUrl("common.mjs"));
  await registeredFixture(async f=>{
    const originalLedger=structuredClone(f.ledger);
    const packageJson=JSON.parse(readFileSync(path.join(f.root,"package.json"),"utf8"));
    packageJson.dependencies.next="15.5.28";
    const lock=JSON.parse(readFileSync(path.join(f.root,"package-lock.json"),"utf8"));
    lock.packages[""].dependencies.next="15.5.28";
    lock.packages["node_modules/next"].version="15.5.28";
    f.write("package.json",JSON.stringify(packageJson));f.write("package-lock.json",JSON.stringify(lock));
    const observedRelease=f.commit(["package.json","package-lock.json"]);
    const repo=new Repository(f.root);
    await assert.rejects(runCapturedObserver(repo,f.m,f.registry,originalLedger.dependencies[0]),/CA_WORKTREE_DRIFT/);
    const files=BUNDLE_PATHS.map(file=>{const {bytes,...b}=repo.blob(observedRelease,file);return b;});
    const dependencies=[dependency(f.root).binding];
    gate.validateObservationBundle(originalLedger,{files,dependencies},files.filter(f=>["package.json","package-lock.json"].includes(f.path)));
    const observerInput={...f.m,sourceCommit:observedRelease,sourceTree:repo.tree(observedRelease),checkerReleaseCommit:observedRelease,checkerBundleDigest:digest({files,dependencies})};
    const result=await runCapturedObserver(repo,observerInput,f.registry,dependencies[0]);
    assert.equal(result.dependencyResolution.checkerReleaseCommit,observedRelease);
    assert.equal(result.dependencyResolution.checkerBundleDigest,observerInput.checkerBundleDigest);
    assert.equal(result.dependencyResolution.version,"5.8.3");
    assert.equal(result.dependencyResolution.entryExecuted,true);
    assert.equal(result.dependencyResolution.sourceSnapshotExecuted,false);
    assert.equal(result.dependencyResolution.codeAndDataSeparated,true);
    // This synthetic fixture proves the capsule/package transport interface only;
    // current C graph acceptance still needs a real immutable-source diagnostic.
  },{realTypescript:true});
});

test("current observation cannot replace the original canonical audit with a freshly rehashed changed audit",()=>{
 assert.equal(typeof gate.validateCanonicalAuditIdentity,"function");
 const audit={auditDigest:"a".repeat(64),knownConflictCount:0,opaqueConflictCount:3};
 gate.validateCanonicalAuditIdentity(audit,audit);
 assert.throws(()=>gate.validateCanonicalAuditIdentity(audit,{...audit,knownConflictCount:1,auditDigest:"b".repeat(64)}),/CA004_/);
});

test("observed source tree equality covers every path outside the enumerated metadata delta",()=>{
 assert.equal(typeof gate.validateObservedTreeProjection,"function");
 const row=(path,id)=>({path,mode:"100644",objectId:id.repeat(40)});
 const source=[row("app/page.tsx","a"),row("package.json","b"),row("tsconfig.json","c")];
 const added=row("coordination/integration/ca-textbook-currentness-v1/evidence.json","d");
 const observed=[...source,added];
 const delta=[{path:added.path,before:null,after:added}];
 gate.validateObservedTreeProjection(source,observed,delta,[added.path]);
 assert.throws(()=>gate.validateObservedTreeProjection(source,[{...source[0],objectId:"e".repeat(40)},...observed.slice(1)],delta,[added.path]),/CA004_/);
 assert.throws(()=>gate.validateObservedTreeProjection(source,[source[0],{...source[1],objectId:"f".repeat(40)},...observed.slice(2)],delta,[added.path]),/CA004_/);
 assert.throws(()=>gate.validateObservedTreeProjection(source,[source[0],source[1],{...source[2],objectId:"f".repeat(40)},added],delta,[added.path]),/CA004_/);
 assert.throws(()=>gate.validateObservedTreeProjection(source,observed,[...delta,{path:"app/page.tsx",before:source[0],after:source[0]}],[added.path]),/CA004_/);
});

function manifestFixture(){return {schemaVersion:"ca004-manifest.v1",attemptId:"ca-textbook-004",pullRequestNumber:308,baseCommit:"4847c89770f4a735c395773616f1d1a4a413152f",sourceCommit:"54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e",sourceTree:"d53bd544a4da00c7243a561b61635967e8f7b899",checkerInnerCommit:"1".repeat(40),checkerReleaseCommit:"2".repeat(40),checkerBundleDigest:"3".repeat(64),evidenceCommit:"4".repeat(40),candidateDigest:"fda75f734941c94020fe069fb6791efa22fa84c625eb0019eba906f69c17e8ea",data:gate.NATIVE_EVIDENCE_PATHS?.map(path=>({path,sha256:"5".repeat(64)})),sourceAuthors:["/root","/root/low_frequency_release","/root/health_diagnosis","original-pr225-authors"],checkerAuthors:["/root/content_release_review","/root/health_diagnosis"],liveAllowed:false};}
test("CA004 Manifest pins actual C and PR308 while leaving actual later commit identities to bound evidence",()=>{
 assert.equal(typeof gate.validateManifest,"function");gate.validateManifest(manifestFixture());
});
for(const [name,change] of [["different source",m=>{m.sourceCommit="a".repeat(40);}],["different PR",m=>{m.pullRequestNumber=999;}],["live permission",m=>{m.liveAllowed=true;}],["foreign data path",m=>{m.data[0].path="foreign.json";}],["duplicate data path",m=>{m.data[1]=m.data[0];}],["unknown authority",m=>{m.deployAllowed=true;}]])test(`Manifest rejects ${name}`,()=>{
 assert.equal(typeof gate.validateManifest,"function");const m=manifestFixture();change(m);assert.throws(()=>gate.validateManifest(m),/CA004_/);
});

function proofFixture(){return {sourceCommit:gate.SOURCE,sourceTree:gate.SOURCE_TREE,candidateDigest:gate.CANDIDATE_DIGEST,checkerReleaseCommit:"1".repeat(40),checkerBundleDigest:"2".repeat(64),evidenceCommit:"3".repeat(40),executionCommit:"4".repeat(40),executionTree:"5".repeat(40),manifestSha256:"6".repeat(64),observerBundleDigest:"7".repeat(64),policyDigest:"8".repeat(64),auditDigest:"9".repeat(64),historicalClosureDigest:"a".repeat(64),runtimeDigest:"b".repeat(64)};}
test("closed Shadow receipts bind the exact proof and distinct executions without live authority",()=>{
 assert.equal(typeof gate.sealReceipt,"function");const p=proofFixture();const receipts=["synthetic-one","synthetic-two","synthetic-three"].map(id=>gate.sealReceipt(p,id,"c".repeat(64)));
 assert.equal(gate.compareReceipts(receipts,p).distinctExecutions,3);
 assert.throws(()=>gate.compareReceipts([receipts[0],receipts[0],receipts[2]],p),/CA004_/);
 const changed=structuredClone(receipts[0]);changed.liveAllowed=true;assert.throws(()=>gate.verifyReceiptRecord(changed,p),/CA004_/);
 const another=structuredClone(receipts[0]);another.binding.sourceCommit="d".repeat(40);assert.throws(()=>gate.verifyReceiptRecord(another,p),/CA004_/);
 const digestForgery=structuredClone(receipts[0]);digestForgery.rehearsal.rollbackComplete=false;delete digestForgery.rawDigest;digestForgery.rawDigest=gate.digest(digestForgery);assert.throws(()=>gate.verifyReceiptRecord(digestForgery,p),/CA004_/);
});

test("caller-provided green check summaries and invented response hashes have no provider authority",()=>{
 assert.throws(()=>gate.validateCiProviderProjection({schemaVersion:"ca004-ci-provider.v1",checks:[],responses:[{sha256:"0".repeat(64)}]},"a".repeat(40),"b".repeat(40)),/CA004_CI_UNISSUED/);
});
test("finalization rejects null proof payloads even after the caller recomputes a top-level digest",()=>{
 const old={schemaVersion:"ca004-finalization.v1",result:"pass",binding:proofFixture(),receipts:null,receiptComparison:null,currentObservation:null,externalEvidence:null,lifecycleState:"shadow_passed",currentness:"current",liveBoundary:"unproven",liveAllowed:false};old.finalizationDigest=gate.digest(old);
 assert.throws(()=>gate.verifyFinalizationRecord(old),/CA004_/);
 assert.throws(()=>gate.verifyFinalizationRecord({schemaVersion:"ca004-finalization-result.v1",result:"pass",closure:null,registry:null,lifecycleState:"shadow_passed",liveAllowed:false}),/CA004_/);
});

function githubFixture({badApp=false,failedRun=false,movedMain=false}={}) {
  const M="a".repeat(40),H="b".repeat(40),api="/repos/HUDongpin/MAIS-MVP",payloads=new Map(),calls=[];
  payloads.set(api,{id:1287988109,full_name:"HUDongpin/MAIS-MVP",html_url:"https://github.com/HUDongpin/MAIS-MVP"});
  payloads.set(api+"/pulls/308",{number:308,state:"closed",merged:true,merge_commit_sha:M,head:{sha:H,repo:{id:1287988109}},base:{sha:gate.BASE,ref:"main",repo:{id:1287988109}}});
  payloads.set(api+"/git/ref/heads/main",{ref:"refs/heads/main",object:{sha:M}});
  for(const [phase,head,event,k] of [["pr",H,"pull_request",100],["main",M,"push",200]]){
    const check_runs=gate.REQUIRED_CHECKS.map((name,index)=>({id:k*10+index,name,head_sha:head,status:"completed",conclusion:"success",app:{id:badApp?999:15368,slug:"github-actions"},completed_at:"2026-11-01T00:00:00Z",details_url:`https://github.com/HUDongpin/MAIS-MVP/actions/runs/${k+(name==="promotion-shadow-gate"?1:0)}/job/${1000+k+index}`}));
    payloads.set(api+"/commits/"+head+"/check-runs?filter=all&per_page=100",{total_count:check_runs.length,check_runs});
    for(const promotion of [false,true]){const id=k+(promotion?1:0);payloads.set(api+"/actions/runs/"+id,{id,head_sha:head,event,path:promotion?".github/workflows/promotion-shadow.yml":".github/workflows/ci.yml",repository:{id:1287988109},head_repository:{id:1287988109},status:"completed",conclusion:failedRun?"failure":"success",run_attempt:1});}
  }
  const token="fixture-github-token-not-real-123456789";
  const fetchImpl=async(url,options)=>{
    const parsed=new URL(url);assert.equal(parsed.origin,"https://api.github.com");assert.equal(options.method,"GET");assert.equal(options.redirect,"error");assert.equal(options.headers.authorization,"Bearer "+token);calls.push(parsed.pathname+parsed.search);
    const value=structuredClone(payloads.get(parsed.pathname+parsed.search));assert.ok(value,"only exact repo endpoints are requested");
    if(movedMain&&calls.filter(p=>p.endsWith("/git/ref/heads/main")).length===2)value.object.sha="c".repeat(40);
    return new Response(JSON.stringify(value),{status:200,headers:{"content-type":"application/json"}});
  };
  return {M,H,token,fetchImpl,calls};
}
test("GitHub collector reconciles bounded authenticated responses and issues an immutable projection",async()=>{
  const f=githubFixture();const provider=await gate.collectGithubEvidence({mergeCommit:f.M,releaseCommit:f.H,token:f.token,fetchImpl:f.fetchImpl});
  assert.equal(f.calls.length,10);assert.equal(provider.checks.length,16);assert.ok(provider.responses.every(row=>row.sha256!=="0".repeat(64)));
  assert.match(gate.validateCiProviderProjection(provider,f.M,f.H).ciBindingDigest,/^[a-f0-9]{64}$/);
  assert.throws(()=>gate.validateCiProviderProjection(structuredClone(provider),f.M,f.H),/CA004_CI_UNISSUED/);
  assert.throws(()=>{provider.checks[0].conclusion="failure";},TypeError);
});
for(const [name,option] of [["foreign check app",{badApp:true}],["failed Actions run",{failedRun:true}],["main moved during observation",{movedMain:true}]])test(`GitHub collector rejects ${name} before issuing authority`,async()=>{
  const f=githubFixture(option);await assert.rejects(gate.collectGithubEvidence({mergeCommit:f.M,releaseCommit:f.H,token:f.token,fetchImpl:f.fetchImpl}),/CA004_GITHUB_/);
});
test("GitHub collector rejects missing authentication before any network request",async()=>{
  const f=githubFixture();await assert.rejects(gate.collectGithubEvidence({mergeCommit:f.M,releaseCommit:f.H,token:"short",fetchImpl:f.fetchImpl}),/CA004_GITHUB_AUTH/);assert.equal(f.calls.length,0);
});

test("paired finalization closes the exact proof and two-event Registry; nested forgeries remain rejected",async()=>{
  const f=githubFixture(),provider=await gate.collectGithubEvidence({mergeCommit:f.M,releaseCommit:f.H,token:f.token,fetchImpl:f.fetchImpl});
  // Exact previously observed C projection, reused as synthetic test data only.
  const diagnostic={"projection":{"policyDigest":"0a27a0c36c6256121cc5a13166b2d6809f7cfbeb3a0d4464ccdae93c2f54b505","auditDigest":"b20edcfbfd4ea4a09243e467128a4c54ecb8c363faa93fc022fa571904120df4","jsonConsumerCount":65,"jsonConsumerDigest":"c601bed8c6f9dfa2d32973289147e558e84324d32defbc6ed594ddaa5eeac8c3","mappingsDigest":"636a7684bbc9ae04e16e4e6103c0f87f398bfa5de5884ef078c7f27a3d70f15e","witnessMembershipDigest":"257102962aff1c1844def2f9f35180c5d37a2052dda3551b8a8b390613c77bff","rawDetectedLoaders":4,"reviewedStorageLoaders":4,"unclassifiedLoaders":0,"storageLoaderPartitionDigest":"ebde0b1704369fb76edd2b6518deece3b940a589538b92d34a8d637e64a00238","issuedObservationDigest":"a9f4f4ef3cff23fed86fab780f5ba70807c6681da379df98bedc2c323de2d6ed","dependencyResolutionDigest":"eeacd303dd17981d10ead253edb9c7a7b8c1d0aff5c8902ab3dee35fcc1a11c9","retiredProjectionUnreachable":true,"newLessonCount":35,"effects":{"network":0,"provider":0,"database":0,"deploy":0,"liveWrites":0}}};
  const raw={"dependencyResolution":{"schemaVersion":"ca-dependency-resolution.v1","strategy":"explicit-captured-file-url","entryRelativePath":"node_modules/typescript/lib/typescript.js","entrySha256":"dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0","dependencyTreeDigest":"5d20297c46dda5c56c1634b953e2fd33972c9dab2e6426fd0d1d8ccc119610dd","version":"5.8.3","checkerReleaseCommit":"54d6080cfb7c137c03a83ba5da1c5d1bb7256b5e","checkerBundleDigest":"4035acd0f9dbce53803755cdec48778d52b4ea1b6278da4341e69185a3380e11","entryExecuted":true,"sourceSnapshotExecuted":false,"codeAndDataSeparated":true}};
  const proof=proofFixture();proof.observerBundleDigest="4035acd0f9dbce53803755cdec48778d52b4ea1b6278da4341e69185a3380e11";proof.policyDigest=diagnostic.projection.policyDigest;proof.auditDigest=diagnostic.projection.auditDigest;proof.historicalClosureDigest="d6d6068c0b6a293b986d5c2d4309b2a22164d00b54353cf3a11e0d5938bab64f";
  const runtime={...diagnostic.projection,dependencyResolutionDigest:gate.digest({...raw.dependencyResolution,checkerReleaseCommit:proof.checkerReleaseCommit,checkerBundleDigest:proof.observerBundleDigest})};proof.runtimeDigest=gate.digest(runtime);
  const observation={schemaVersion:"ca004-current-observation.v1",sourceCommit:gate.SOURCE,sourceTree:gate.SOURCE_TREE,executionCommit:f.M,observedHead:f.M,observedTree:"d".repeat(40),event:"push",receiptStorage:f.H,treeProjectionDigest:"e".repeat(64),runtime,registryDigest:"8706d9312d41725f7a0ba5cbc91356b78639119be4611c500a3619abeafb34c9",liveAllowed:false};
  const receipts=gate.RECEIPT_PATHS.map((path,index)=>({path,storageCommit:f.H,sha256:["c","d","e"][index].repeat(64)}));
  const ci=gate.validateCiProviderProjection(provider,f.M,f.H);
  const m=manifestFixture();m.checkerReleaseCommit=proof.checkerReleaseCommit;m.checkerBundleDigest=proof.checkerBundleDigest;
  const ctx={m,executionCommit:proof.executionCommit,repo:{time:()=>Date.parse("2026-11-01T00:00:00.000Z")}};
  const text="Synthetic post-merge fixture only; never a real review.";
  const input={schemaVersion:"ca004-finalization-evidence.v1",mergeCommit:f.M,reviews:["A11","A23","A22","A25"].map(role=>({schemaVersion:"ca004-postmerge-review.v1",role,reviewer:gate.REVIEWERS[role],reviewedAt:"2026-11-01T01:00:00.000Z",sourceCommit:gate.SOURCE,candidateDigest:gate.CANDIDATE_DIGEST,checkerReleaseCommit:m.checkerReleaseCommit,checkerBundleDigest:m.checkerBundleDigest,executionCommit:proof.executionCommit,mergeCommit:f.M,receiptHashes:receipts.map(r=>r.sha256),ciBindingDigest:ci.ciBindingDigest,report:{text,sha256:gate.hash(Buffer.from(text))},decision:"approved-for-exact-ca004-finalization",liveAllowed:false})),ownerAuthorization:{schemaVersion:"ca004-owner-release-auth.v1",releaseSha:f.M,target:"production:www.mais.ac,www.mais.hk",actions:["deploy","promote","enable-hourly-scheduler"],reference:"owner-chat-01a19836-d9ec-7151-b60f-9481ac983f11",recordedAt:"2026-11-01T01:00:00.000Z"}};
  const evidence=gate.validatePostMergeEvidence(input,ctx,observation,receipts,provider);
  const closure={schemaVersion:"ca004-closure.v1",binding:proof,receipts,receiptComparison:{semanticDigest:"f".repeat(64),comparisonDigest:"a".repeat(64),distinctExecutions:3},currentObservation:observation,externalEvidence:evidence,acquisitionContext:{workflowRef:"HUDongpin/MAIS-MVP/.github/workflows/ca004-currentness-finalize.yml@refs/heads/main",runId:123,runAttempt:1,head:f.M,event:"workflow_dispatch",providerOrigin:"https://api.github.com"},lifecycleState:"shadow_passed",currentness:"current",liveBoundary:"unproven",liveAllowed:false};closure.closureDigest=gate.digest(closure);
  const result=gate.sealFinalization(closure),expected={provider,binding:proof,observation,evidenceDigest:evidence.evidenceDigest};
  assert.equal(gate.verifyFinalizationRecord(result,expected),result);
  assert.deepEqual(result.registry.events.map(row=>row.type),["registered","finalized"]);
  for(const field of ["receipts","receiptComparison","currentObservation","externalEvidence"]){const broken=structuredClone(closure);broken[field]=null;delete broken.closureDigest;broken.closureDigest=gate.digest(broken);assert.throws(()=>gate.sealFinalization(broken),/CA004_/);}
  const wrongChain=structuredClone(result);wrongChain.registry.events[1].previousEventDigest="0".repeat(64);assert.throws(()=>gate.verifyFinalizationRecord(wrongChain,expected),/CA004_/);
  assert.throws(()=>gate.verifyFinalizationRecord(result,{...expected,provider:structuredClone(provider)}),/CA004_CI_UNISSUED/);
  assert.throws(()=>gate.validatePostMergeEvidence({...input,provider},ctx,observation,receipts,provider),/CA004_FINAL_EVIDENCE_SCHEMA/);
  const wrongReviewer=structuredClone(input);wrongReviewer.reviews[0].reviewer="/root";assert.throws(()=>gate.validatePostMergeEvidence(wrongReviewer,ctx,observation,receipts,provider),/CA004_FINAL_REVIEW/);
});

test("bounded readiness records require actual independent identities, report bytes and post-R2 chronology",()=>{
  const m=manifestFixture(),reviewedAt="2026-11-01T01:00:00.000Z",report=Buffer.from("Synthetic readiness fixture, never approval.");
  const ctx={m,repo:{time:ref=>Date.parse(ref===m.checkerReleaseCommit?"2026-11-01T00:00:00.000Z":"2026-11-01T02:00:00.000Z")}};
  const record={schemaVersion:"ca004-review.v1",role:"A11",reviewer:gate.REVIEWERS.A11,reviewedAt,sourceCommit:gate.SOURCE,sourceTree:gate.SOURCE_TREE,candidateDigest:gate.CANDIDATE_DIGEST,checkerReleaseCommit:m.checkerReleaseCommit,checkerBundleDigest:m.checkerBundleDigest,report:{path:gate.PREFIX+"/evidence/a11.md",sha256:gate.hash(report)},decision:"approved-for-ca004-bounded-readiness",scope:"source-regression-and-checker-freeze",liveAllowed:false};
  gate.validateEvidenceRecord(record,"A11",ctx,report);
  for(const mutate of [r=>{r.reviewer="/root";},r=>{r.reviewedAt="2026-10-31T23:59:59.000Z";},r=>{r.reviewedAt="2026-11-01T03:00:00.000Z";},r=>{r.report.sha256="0".repeat(64);},r=>{r.deployAllowed=true;},r=>{r.checkerReleaseCommit="9".repeat(40);}]){const changed=structuredClone(record);mutate(changed);assert.throws(()=>gate.validateEvidenceRecord(changed,"A11",ctx,report),/CA004_/);}
});
test("phase inventories stay finite and receipt dates cannot predate X or postdate storage",()=>{
  assert.equal(gate.CODE_PATHS.length,5);assert.equal(gate.OUTER_CODE_PATHS.length,5);assert.equal(gate.EVIDENCE_PATHS.length,26);assert.equal(gate.EXECUTION_PATHS.length,2);assert.equal(gate.RECEIPT_PATHS.length,3);
  assert.ok(gate.OUTER_CODE_PATHS.includes("scripts/release-governance.test.mjs"));
  const start=Date.parse("2026-11-01T00:00:00.000Z"),end=start+1000;
  gate.validateReceiptChronology({producedAt:"2026-11-01T00:00:00.999Z"},start,end);
  assert.throws(()=>gate.validateReceiptChronology({producedAt:"2026-10-31T23:59:59.999Z"},start,end),/CA004_RECEIPT_TIME/);
  assert.throws(()=>gate.validateReceiptChronology({producedAt:"2026-11-01T00:00:02.000Z"},start,end),/CA004_RECEIPT_TIME/);
});
test("standalone entry authenticates phases and reviews before the captured child and grants tokens only to finalize",()=>{
  const source=readFileSync(new URL("./promotion.mjs",import.meta.url),"utf8");
  assert.ok(source.indexOf('CA004_BOOTSTRAP_REVIEW_TIME')<source.indexOf('owned=mkdtempSync'));
  assert.match(source,/operation==="finalize"\)for\(const name of \["GITHUB_TOKEN"/);
  assert.doesNotMatch(source,/VERCEL_TOKEN|POSTGRES_URL|OPENAI_API_KEY|TEACHER_NOTICE_HEALTH_SECRET/);
  assert.match(source,/!process\.env\.NODE_OPTIONS && !process\.env\.NODE_PATH/);
});
