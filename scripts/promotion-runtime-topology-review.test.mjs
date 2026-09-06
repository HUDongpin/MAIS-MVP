import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { fingerprint, RUNTIME_CLASSIFICATION_KINDS } from "../coordination/integration/promotion-gate-lib.mjs";
const tools = await import("./promotion-runtime-topology-review.mjs").catch((error) => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});
const roles = ["A21", "A18", "A23", "A04", "A05", "A11", "A22", "A24", "A25"];
const h = (letter, length = 64) => letter.repeat(length);
const sourceCommit = h("1", 40), targetCommit = h("2", 40);
const edge = (from, to, kind = "import") => ({ from, specifier: `@/${to.slice(0, -3)}`, to, kind, typeOnly: false });
function sortedEdges(edges) { return [...edges].sort((a, b) => [a.from,a.specifier,a.to,a.kind,"0"].join("\0").localeCompare([b.from,b.specifier,b.to,b.kind,"0"].join("\0"), "en")); }
function observation(paths, rawEdges, entrypoints) {
  const coveredPaths = [...paths].sort(), reachablePaths = [...paths].sort(), frameworkEntrypoints = [...entrypoints].sort();
  const edges = sortedEdges(rawEdges);
  const topologyEdges = [...new Map(edges.map(({ from, to }) => [from + "\0" + to, { from, to }])).values()].sort((a,b) => a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : 1);
  const classifications = RUNTIME_CLASSIFICATION_KINDS.map(kind=>({kind,count:kind==="runtime-code"?paths.length:0,pathsDigest:fingerprint(kind==="runtime-code"?coveredPaths:[])}));
  const policy = { coveredFileCount: coveredPaths.length, coveredFilesDigest: fingerprint(coveredPaths), classificationsDigest: fingerprint(classifications),
    frameworkEntrypointCount: frameworkEntrypoints.length, seedCount: frameworkEntrypoints.length,
    reachablePathCount: reachablePaths.length, reachablePathsDigest: fingerprint(reachablePaths), edgeCount: edges.length, edgeDigest: fingerprint(edges),
    topologyEdgeCount: topologyEdges.length, topologyEdgeDigest: fingerprint(topologyEdges),
    nextDynamicCallCount: 0, nextDynamicLiteralImportCount: 0, nextDynamicNonliteralImportCount: 0, nextDynamicCallsiteDigest: fingerprint([]),
    fsReadAllowlistCount: 0, fsReadAllowlistDigest: fingerprint([]), zeroBaselineCallCount: 0 };
  return { policy, coveredPaths, classifications, frameworkEntrypoints, runtimeSeeds: frameworkEntrypoints, reachablePaths, edges, topologyEdges,
    fsReadAllowlist: [], nextDynamicCalls: [], zeroBaselineCalls: [], unresolvedCalls: [],
    resolverPolicyDigest: h("a"), frameworkBoundaryDigest: h("b") };
}
function fixture() {
  const source = observation(["app/page.tsx", "lib/a.ts"], [edge("app/page.tsx", "lib/a.ts")], ["app/page.tsx"]);
  const target = observation(["app/page.tsx", "lib/a.ts", "app/api/monitor/route.ts", "lib/monitor.ts"], [
    ...source.edges, edge("app/page.tsx", "lib/monitor.ts"), edge("app/page.tsx", "lib/monitor.ts", "export"), edge("app/api/monitor/route.ts", "lib/monitor.ts")
  ], ["app/page.tsx", "app/api/monitor/route.ts"]);
  const file = (raw) => ({ mode: "100644", objectId: h(raw, 40), rawSha256: h(raw) });
  const sourceFiles = [{path: "app/page.tsx",mode:"100644",objectId:h("6",40)},{path:"lib/a.ts",mode:"100644",objectId:h("9",40)}];
  const targetFiles = [{path:"app/api/monitor/route.ts",mode:"100644",objectId:h("5",40)},{path:"app/page.tsx",mode:"100644",objectId:h("7",40)},{path:"lib/a.ts",mode:"100644",objectId:h("9",40)},{path:"lib/monitor.ts",mode:"100644",objectId:h("8",40)}];
  return { sourceCommit, targetCommit, sourceFiles, targetFiles, sourceExpectedPolicy: structuredClone(source.policy), sourceObservation: source, targetObservation: target,
    sourceTreeDigest: fingerprint(sourceFiles), targetTreeDigest: fingerprint(targetFiles),
    changedFiles: [ { path: "app/api/monitor/route.ts", before: null, after: file("5") }, { path: "app/page.tsx", before: file("6"), after: file("7") }, { path: "lib/monitor.ts", before: null, after: file("8") } ],
    immutableBindings: { candidateDigest: h("9"), sourceCommit: h("3", 40), checkerVersion: "promotion-gate-shadow-v2.6", checkerBundleDigest: h("a"), checkerReleaseCommit: h("4",40), compatibilityManifestRawSha256: h("b"), legacyRegistryRawSha256: h("c") },
    nativeSemanticProof: { canonicalAuditDigest: h("d"), resolutionProofsDigest: h("e"), selectedIdentityHits: 0, resolutionCount: 18, approvedProjectionCount: 3, dereachedCount: 15, liveAllowed: false },
    scannerBindings: [{ path: "coordination/integration/promotion-gate-lib.mjs", rawSha256: h("f") }] };
}
function build(input) { assert.equal(typeof tools.buildRuntimeTopologyReview, "function", "explicit topology preparation proof is missing"); return tools.buildRuntimeTopologyReview(input); }

test("topology review accepts exact addition-only graph with import/re-export multiplicity", () => {
  const input = fixture(), copy = structuredClone(input), p = build(input);
  assert.equal(p.schemaVersion, "promotion-runtime-topology-review.v1");
  assert.deepEqual(p.delta.addedReachablePaths, ["app/api/monitor/route.ts", "lib/monitor.ts"]);
  assert.equal(p.delta.addedEdges.length, 3); assert.equal(p.delta.addedTopologyEdges.length, 2);
  assert.equal(p.targetPolicy.edgeCount - p.targetPolicy.topologyEdgeCount, 1);
  assert.equal(p.preparationEvidenceOnly, true); assert.equal(p.liveAllowed, false);
  assert.equal(p.proofDigest, fingerprint(Object.fromEntries(Object.entries(p).filter(([key]) => key !== "proofDigest"))));
  assert.deepEqual(input, copy);
});

test("S7-N03 source expected policy cannot be replaced by an unchecked target policy", () => {
  const i=fixture(); i.sourceExpectedPolicy.coveredFilesDigest=h("0"); assert.throws(()=>build(i), /source expected/u);
});
test("S7-N05 complete graph lists must reproduce every declared digest and count", () => {
  for (const change of [(i)=>i.targetObservation.reachablePaths.pop(),(i)=>i.targetObservation.edges.pop(),(i)=>i.targetObservation.runtimeSeeds.pop(),(i)=>i.targetObservation.frameworkEntrypoints.pop(),(i)=>i.targetObservation.topologyEdges.pop()]) {
    const i=fixture();change(i);assert.throws(()=>build(i),/inventory|projection|policy/u);
  }
});
test("S7-N05 removed old nodes or edges are outside this explicit mode even if all target hashes are recomputed", () => {
  const i=fixture();i.targetObservation=observation(["app/page.tsx","lib/monitor.ts"],[edge("app/page.tsx","lib/monitor.ts")],["app/page.tsx"]);
  assert.throws(()=>build(i),/addition-only/u);
});
test("S7-N06 same-node edits and all added covered files must be present in the bound file delta", () => {
  const i=fixture();i.changedFiles=i.changedFiles.filter(x=>x.path!=="lib/monitor.ts");assert.throws(()=>build(i),/changed file|delta/u);
  const j=fixture();j.changedFiles.push({...j.changedFiles[0]});assert.throws(()=>build(j),/duplicate|canonical/u);
});
test("S7-N04 changed file objects require regular modes, exact identities and safe paths", () => {
  for (const mutate of [(i)=>i.changedFiles[0].after.mode="120000",(i)=>i.changedFiles[0].path="../escape.ts",(i)=>i.changedFiles[0].after.rawSha256="unknown",(i)=>i.changedFiles[0].after.extra=true]) {
    const i=fixture();mutate(i);assert.throws(()=>build(i),/file|schema|path/u);
  }
});
test("S7-N07 raw duplicate edges cannot be discarded to force equality with topology", () => {
  const i=fixture();i.targetObservation.policy.edgeCount=i.targetObservation.policy.topologyEdgeCount;
  assert.throws(()=>build(i),/policy|inventory/u);
});
test("S7-N08 dynamic and zero-baseline loader blind spots remain fail closed", () => {
  for(const key of ["nextDynamicNonliteralImportCount","zeroBaselineCallCount"]){const i=fixture();i.targetObservation.policy[key]=1;assert.throws(()=>build(i),/loader|policy/u)}
  const i=fixture();i.targetObservation.unresolvedCalls=[{path:"lib/monitor.ts",call:"dynamic"}];assert.throws(()=>build(i),/unresolved/u);
});
test("S7-N09 fs-read capability and source-bound next dynamic inventory must remain exact", () => {
  const i=fixture();i.targetObservation.fsReadAllowlist=[{callee:"fs.readFile"}];assert.throws(()=>build(i),/loader|policy|inventory/u);
  const j=fixture();j.targetObservation.policy.nextDynamicCallsiteDigest=h("1");assert.throws(()=>build(j),/policy|inventory/u);
});
test("S7-N10 resolver or frozen framework boundary changes cannot be called graph-only additions", () => {
  for(const key of ["resolverPolicyDigest","frameworkBoundaryDigest"]){const i=fixture();i.targetObservation[key]=h("0");assert.throws(()=>build(i),/boundary|resolver/u)}
});
test("S7-N11 native semantic scan must retain candidate isolation and the legacy resolution contract", () => {
  for(const mutate of [(i)=>i.nativeSemanticProof.selectedIdentityHits=1,(i)=>i.nativeSemanticProof.liveAllowed=true,(i)=>i.nativeSemanticProof.resolutionCount=17,(i)=>i.nativeSemanticProof.approvedProjectionCount=4]){
    const i=fixture();mutate(i);assert.throws(()=>build(i),/semantic/u)
  }
});
test("S7-N21 exact distinct source and target commits are required", () => {
  for(const target of [sourceCommit,"main","unknown"]){const i=fixture();i.targetCommit=target;assert.throws(()=>build(i),/commit/u)}
});
test("S7-N22 observations are bounded and unknown contract fields are rejected", () => {
  const i=fixture();i.extra=true;assert.throws(()=>build(i),/schema/u);
  const j=fixture();j.targetObservation.policy.edgeCount=Infinity;assert.throws(()=>build(j),/policy/u);
});


function reviewFixture() {
  const proof=build(fixture()), reviewCommit=h("3",40), producedAt="2026-09-06T01:00:00.000Z", oldDate="2026-08-27T01:00:00.000Z";
  const material=new Map();
  const put=(path,value,at=reviewCommit)=>{const bytes=Buffer.from(JSON.stringify(value)+"\n"),rawSha256=crypto.createHash("sha256").update(bytes).digest("hex");
    material.set(at+":"+path,{bytes,mode:"100644",objectId:crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex")});return {path,reviewedCommit:at,rawSha256};};
  const contracts={A21:"promotion-a21-candidate.v2",A18:"promotion-a18-shadow-qa.v2",A23:"promotion-a23-shadow-readiness.v2",A04:"promotion-a04-practice-semantics.v2",A05:"promotion-a05-lesson-semantics.v2",A11:"promotion-a11-shadow-preflight.v2",A22:"promotion-a22-shadow-isolation-preflight.v2",A24:"promotion-a24-exact-layer.v2",A25:"promotion-a25-release-intake.v2"};
  const context={sourceManifest:{path:"coordination/source-manifest.json",rawSha256:h("4")},sourceBaselineCommit:sourceCommit,targetBaselineCommit:targetCommit,
    revisionRoot:"coordination/revision",candidateDigest:proof.immutableBindings.candidateDigest,sourceCommit:proof.immutableBindings.sourceCommit,
    checkerVersion:proof.immutableBindings.checkerVersion,checkerBundleDigest:proof.immutableBindings.checkerBundleDigest,
    runtimeTopologyProof:proof,legacyRegistryPath:"coordination/revision/inputs/legacy-resolution-registry.v2.6.json",legacyRegistryRawSha256:h("8"),sourceEvidenceBindings:[]};
  const reviewer=put("reviews/identity.json",{reviewerIdentity:"fixture-independent-reviewer",producedAt,targetBaselineCommit:targetCommit});
  const reviews=[], records=[];
  for(const role of roles){
    const source={schemaVersion:"promotion-evidence.v2",evidenceId:"old-"+role,role,result:role==="A24"?"not_applicable":"pass",producedAt:oldDate,
      candidateDigest:context.candidateDigest,sourceCommit:context.sourceCommit,targetBaselineCommit:sourceCommit,checkerVersion:context.checkerVersion,
      semanticPayload:{contractVersion:contracts[role],liveAllowed:false,stableFact:{number:2},...(role==="A24"?{rationale:"The unchanged candidate has no deterministic exact layer fields."}:{})}};
    const sourceRef=put("old/"+role+".json",source,h("5",40));context.sourceEvidenceBindings.push({role,evidencePath:sourceRef.path,reviewedCommit:sourceRef.reviewedCommit,rawSha256:sourceRef.rawSha256,expectedResult:source.result});
    const evidence={...structuredClone(source),evidenceId:"new-"+role,producedAt,targetBaselineCommit:targetCommit,semanticPayload:{...source.semanticPayload,baselineContentReview:{reviewed:true,deltaDigest:proof.deltaDigest}}};
    if(["A23","A25"].includes(role))Object.assign(evidence.semanticPayload,{targetBaselineCommit:targetCommit,legacyResolutionRegistryPath:context.legacyRegistryPath,legacyResolutionRegistryRawSha256:context.legacyRegistryRawSha256});
    const facts=put("facts/"+role+".json",{producedAt,targetBaselineCommit:targetCommit,values:evidence.semanticPayload});
    const fieldDisposition=Object.keys(evidence.semanticPayload).map(field=>({field,mode:Object.hasOwn(source.semanticPayload,field)?"carry-forward":"fresh",
      evidence:{...(Object.hasOwn(source.semanticPayload,field)?sourceRef:facts),producedAt:Object.hasOwn(source.semanticPayload,field)?oldDate:producedAt,valuePointer:(Object.hasOwn(source.semanticPayload,field)?"/semanticPayload/":"/values/")+field,targetBaselinePointer:"/targetBaselineCommit"},rationale:"Reviewed exact unchanged candidate facts or this target's actual fixture observation."}));
    const record={schemaVersion:"promotion-baseline-role-review.v1",role,reviewedAt:producedAt,reviewer:{identity:"fixture-independent-reviewer",reference:reviewer},
      sourceEvidence:{...sourceRef,producedAt:oldDate,targetBaselineCommit:sourceCommit},evidence,fieldDisposition};
    const recordRef=put("reviews/"+role+".json",record);reviews.push({role,recordPath:recordRef.path,reviewedCommit:recordRef.reviewedCommit,rawSha256:recordRef.rawSha256});records.push(record);
  }
  const justification=put("reviews/justification.json",{producedAt,targetBaselineCommit:targetCommit,reason:"Fixture-only review, no actual authority."});
  const index={schemaVersion:"promotion-baseline-review-index.v1",sourceManifest:context.sourceManifest,sourceBaselineCommit:sourceCommit,targetBaselineCommit:targetCommit,revisionRoot:context.revisionRoot,
    candidateDigest:context.candidateDigest,sourceCommit:context.sourceCommit,checkerVersion:context.checkerVersion,checkerBundleDigest:context.checkerBundleDigest,
    runtimeTopologyProofDigest:proof.proofDigest,targetRuntimePolicyDigest:proof.targetPolicyDigest,legacyRegistryRawSha256:context.legacyRegistryRawSha256,justification,reviews};
  const indexRef=put("reviews/index.json",index);const indexPin={path:indexRef.path,reviewCommit:indexRef.reviewedCommit,rawSha256:indexRef.rawSha256};
  const readCommitted=async ref=>{const result=material.get(ref.reviewedCommit+":"+ref.path);if(!result)throw Error("fixture missing committed artifact");return result;};
  const refresh=()=>{for(let n=0;n<records.length;n++){const row=index.reviews[n];if(!row)continue;const pin=put(row.recordPath,records[n],row.reviewedCommit);row.rawSha256=pin.rawSha256;}const pin=put(indexPin.path,index,indexPin.reviewCommit);indexPin.rawSha256=pin.rawSha256;};
  return {context,index,indexPin,material,records,put,readCommitted,refresh};
}
async function prepare(f){assert.equal(typeof tools.prepareReviewedTopologyEvidence,"function","FEATURE_NOT_IMPLEMENTED");return tools.prepareReviewedTopologyEvidence({indexPin:f.indexPin,context:f.context,readCommitted:f.readCommitted,assertAncestor:async()=>{}});}

test("role evidence is built from reviewed new values and all nine bind one fixed index/proof pin",async()=>{
  const f=reviewFixture(),out=await prepare(f);assert.equal(out.evidence.length,9);
  for(const e of out.evidence){assert.equal(e.value.targetBaselineCommit,targetCommit);assert.deepEqual(e.value.semanticPayload.baselineReaffirmation.baselineReviewIndex,f.indexPin);
    assert.equal(e.value.semanticPayload.baselineReaffirmation.runtimePolicyReaffirmation.proofDigest,f.context.runtimeTopologyProof.proofDigest);
    assert.equal(e.value.producedAt,"2026-09-06T01:00:00.000Z");assert.equal(e.value.semanticPayload.stableFact.number,2);}
  const again=await prepare(f);assert.deepEqual(out.evidence.map(e=>e.bytes),again.evidence.map(e=>e.bytes));
});
test("S7-N01 authoritative review JSON rejects duplicate keys, invalid UTF8, overflow and unknown keys",async()=>{
  for(const bytes of [Buffer.from('{"schemaVersion":1,"schemaVersion":2}'),Buffer.from([255]),Buffer.from('{"number":1e999}')]){
    const f=reviewFixture();const old=f.material.get(f.indexPin.reviewCommit+":"+f.indexPin.path);f.material.set(f.indexPin.reviewCommit+":"+f.indexPin.path,{...old,bytes,objectId:crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex")});f.indexPin.rawSha256=crypto.createHash("sha256").update(bytes).digest("hex");await assert.rejects(()=>prepare(f),/JSON|review/u);
  }
  const f=reviewFixture();f.index.extra=true;f.refresh();await assert.rejects(()=>prepare(f),/schema/u);
});
test("S7-N13 index cannot switch candidate, source, checker, baseline or exact topology proof",async()=>{
  for(const field of ["candidateDigest","sourceCommit","checkerVersion","checkerBundleDigest","targetBaselineCommit","runtimeTopologyProofDigest","targetRuntimePolicyDigest","legacyRegistryRawSha256"]){const f=reviewFixture();f.index[field]="wrong";f.refresh();await assert.rejects(()=>prepare(f),/binding|schema|digest|commit/u);}
});
test("S7-N14 names and pass booleans cannot replace an existing committed review artifact",async()=>{
  const f=reviewFixture();f.index.reviews[0].recordPath="reviews/missing.json";f.refresh();f.material.delete(f.index.reviews[0].reviewedCommit+":"+f.index.reviews[0].recordPath);await assert.rejects(()=>prepare(f),/missing|committed/u);
  const j=reviewFixture();j.records[0].reviewer.reference.rawSha256=h("0");j.refresh();await assert.rejects(()=>prepare(j),/artifact|hash|digest/u);
});
test("S7-N15 every payload fact has an exact non-overlapping fresh or historical value pointer",async()=>{
  for(const change of [(f)=>f.records[0].fieldDisposition.pop(),(f)=>f.records[0].fieldDisposition.push(f.records[0].fieldDisposition[0]),(f)=>f.records[0].fieldDisposition[0].evidence.valuePointer="/missing",(f)=>f.records[0].evidence.semanticPayload.stableFact.number=99]){
    const f=reviewFixture();change(f);f.refresh();await assert.rejects(()=>prepare(f),/field|pointer|value/u);
  }
});
test("S7-N15 historical carry forward retains original date/source and cannot launder current execution claims",async()=>{
  const f=reviewFixture();f.records[0].fieldDisposition[0].evidence.producedAt="2026-09-06T01:00:00.000Z";f.refresh();await assert.rejects(()=>prepare(f),/date|historical/u);
  const j=reviewFixture();const record=j.records.find(x=>x.role==="A22");record.evidence.semanticPayload.productionBuild={result:"pass"};record.fieldDisposition.push({...record.fieldDisposition[0],field:"productionBuild"});j.refresh();await assert.rejects(()=>prepare(j),/current|historical|value/u);
});
test("S7-N16 exact nine roles and role/result identities cannot be replaced or duplicated",async()=>{
  const f=reviewFixture();f.index.reviews.pop();f.refresh();await assert.rejects(()=>prepare(f),/role/u);
  const j=reviewFixture();j.records[0].role="A99";j.refresh();await assert.rejects(()=>prepare(j),/role|identity/u);
});
test("S7-N17 and N18 full prepared bytes are bound, including evidenceId/time and review-index pin",async()=>{
  const f=reviewFixture(),out=await prepare(f);assert.equal(typeof tools.verifyPreparedTopologyEvidence,"function");
  const committed=new Map(out.evidence.map(e=>[e.role,e.bytes]));assert.doesNotThrow(()=>tools.verifyPreparedTopologyEvidence(out,committed));
  for(const field of ["producedAt","evidenceId"]){const copy=new Map(committed),value=JSON.parse(copy.get("A21"));value[field]="changed";copy.set("A21",Buffer.from(JSON.stringify(value)));assert.throws(()=>tools.verifyPreparedTopologyEvidence(out,copy),/exact.*bytes/u);}
  const j=reviewFixture();j.indexPin.rawSha256=h("0");await assert.rejects(()=>prepare(j),/hash|digest/u);
});
test("S7-N04 committed review records reject non-regular modes and forged Git object identity",async()=>{
  for(const mutation of [x=>x.mode="120000",x=>x.objectId=h("0",40)]){const f=reviewFixture();mutation(f.material.get(f.indexPin.reviewCommit+":"+f.indexPin.path));await assert.rejects(()=>prepare(f),/regular|object/u);}
});


test("native import-equals references keep their raw kind instead of weakening the graph",()=>{
  const i=fixture();const e=i.targetObservation.edges.map(x=>x.from==="app/api/monitor/route.ts"?{...x,kind:"import-equals"}:x);
  i.targetObservation=observation(i.targetObservation.coveredPaths,e,i.targetObservation.frameworkEntrypoints);assert.equal(build(i).targetPolicy.edgeCount,4);
});
test("unknown runtime classifications are rejected even with consistently recomputed policy digests",()=>{
  const i=fixture();i.targetObservation.classifications[0].kind="unknown";i.targetObservation.policy.classificationsDigest=fingerprint(i.targetObservation.classifications);assert.throws(()=>build(i),/classification/u);
});
test("review preparation refuses a forged context proof even if index repeats its claimed digest",async()=>{
  const f=reviewFixture();f.context.runtimeTopologyProof.delta.addedEdges=[];await assert.rejects(()=>prepare(f),/proof.*digest/u);
});


test("binding phase recovers its index from all nine committed evidence bodies, never later HEAD",async()=>{
  const f=reviewFixture(),prepared=await prepare(f);assert.equal(typeof tools.recoverCommittedTopologyReviewIndex,"function","FEATURE_NOT_IMPLEMENTED");
  const bytes=new Map(prepared.evidence.map(x=>[x.role,x.bytes]));assert.deepEqual(tools.recoverCommittedTopologyReviewIndex(bytes,f.indexPin.path),f.indexPin);
  for(const mutate of [
    (items)=>items.delete("A22"),
    (items)=>{const value=JSON.parse(items.get("A22"));value.semanticPayload.baselineReaffirmation.baselineReviewIndex.reviewCommit=h("9",40);items.set("A22",Buffer.from(JSON.stringify(value)));},
    (items)=>{const value=JSON.parse(items.get("A22"));value.role="A21";items.set("A22",Buffer.from(JSON.stringify(value)));}
  ]){const items=new Map(bytes);mutate(items);assert.throws(()=>tools.recoverCommittedTopologyReviewIndex(items,f.indexPin.path),/role|pin|index/u);}
  assert.throws(()=>tools.recoverCommittedTopologyReviewIndex(bytes,"reviews/alternate.json"),/index/u);
});

test("review dates reject normalized nonexistent calendar dates and 24-hour overflow", async () => {
  for (const invalid of ["2027-02-31T01:00:00.000Z", "2026-02-29T01:00:00.000Z", "2026-09-06T24:00:00.000Z"]) {
    const f = reviewFixture();
    for (const record of f.records) { record.reviewedAt = invalid; record.evidence.producedAt = invalid; }
    f.refresh();
    await assert.rejects(() => prepare(f), /date.*invalid/u);
  }
  const leap = reviewFixture();
  for (const record of leap.records) { record.reviewedAt = "2028-02-29T01:00:00.000Z"; record.evidence.producedAt = record.reviewedAt; }
  leap.refresh();
  assert.equal((await prepare(leap)).evidence.length, 9);
});
