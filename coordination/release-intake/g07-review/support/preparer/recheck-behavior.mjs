import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const sourceRoot='/Volumes/Starship/MAIS的衍生文件/MAIS-dirty-convergence-wt';
const req=createRequire(path.join(sourceRoot,'package.json')),ts=req('typescript');
const base=await import(pathToFileURL(path.join(sourceRoot,'coordination/integration/promotion-gate-lib.mjs')).href);
const tools=await import(pathToFileURL(path.join(sourceRoot,'scripts/promotion-runtime-topology-review.mjs')).href);
const preparer=await import(pathToFileURL(path.join(sourceRoot,'scripts/rebase-promotion-baseline.mjs')).href);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const paths=['scripts/rebase-promotion-baseline.mjs','scripts/rebase-promotion-baseline.test.mjs','scripts/promotion-runtime-topology-review.mjs','scripts/promotion-runtime-topology-review.test.mjs','coordination/reports/2026-09-06-A23-reviewed-runtime-topology-contract.md'];
const snapshot=()=>paths.map(p=>({path:p,rawSha256:sha(fs.readFileSync(path.join(sourceRoot,p)))}));
const before=snapshot();
const input=fs.readFileSync(path.join(sourceRoot,'scripts/promotion-runtime-topology-review.test.mjs'),'utf8');
const ast=ts.createSourceFile('fixture.mjs',input,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const neededFunctions=new Set(['sortedEdges','observation','fixture','build','reviewFixture']),neededConstants=new Set(['roles','h','sourceCommit','targetCommit','edge']);
const declarations=ast.statements.filter(n=>(ts.isFunctionDeclaration(n)&&neededFunctions.has(n.name?.text))||(ts.isVariableStatement(n)&&n.declarationList.declarations.every(d=>ts.isIdentifier(d.name)&&neededConstants.has(d.name.text)))).map(n=>n.getText(ast));
const factory=Function('assert','crypto','fingerprint','RUNTIME_CLASSIFICATION_KINDS','tools','Buffer',declarations.join('\n')+'\nreturn {reviewFixture};')(assert,crypto,base.fingerprint,base.RUNTIME_CLASSIFICATION_KINDS,tools,Buffer);
const prepare=f=>tools.prepareReviewedTopologyEvidence({indexPin:f.indexPin,context:f.context,readCommitted:f.readCommitted,assertAncestor:async()=>{}});
const results=[];
for(const value of ['2027-02-31T01:00:00.000Z','2027-02-29T01:00:00.000Z','2100-02-29T01:00:00.000Z','2028-04-31T01:00:00.000Z','2028-02-29T24:00:00.000Z','2028-00-15T01:00:00.000Z','2028-13-15T01:00:00.000Z','2028-02-00T01:00:00.000Z','2028-02-29T01:60:00.000Z','2028-02-29T01:00:00.000+24:00']){
 const f=factory.reviewFixture();f.records[0].reviewedAt=value;f.records[0].evidence.producedAt=value;f.refresh();await assert.rejects(()=>prepare(f),/date is invalid/);results.push({kind:'date',case:value,result:'rejected-as-required'});
}
for(const value of ['2028-02-29T12:00:00.000Z','2400-02-29T12:00:00.000Z','2028-02-29T12:34:56.789+08:00','2028-02-29T12:34:56.789-04:30']){
 const f=factory.reviewFixture();f.records[0].reviewedAt=value;f.records[0].evidence.producedAt=value;f.refresh();const out=await prepare(f);assert.equal(out.evidence[0].value.producedAt,value);results.push({kind:'date',case:value,result:'accepted-as-required'});
}
{
 const f=factory.reviewFixture(),record=f.records[0],entry=record.fieldDisposition.find(x=>x.mode==='fresh');const key=entry.evidence.reviewedCommit+':'+entry.evidence.path;const fact=JSON.parse(f.material.get(key).bytes);fact.producedAt='2027-02-31T01:00:00.000Z';const pin=f.put(entry.evidence.path,fact,entry.evidence.reviewedCommit);entry.evidence.rawSha256=pin.rawSha256;entry.evidence.producedAt=fact.producedAt;record.reviewedAt='2028-03-01T01:00:00.000Z';record.evidence.producedAt=record.reviewedAt;f.refresh();await assert.rejects(()=>prepare(f),/date is invalid/);results.push({kind:'date',case:'calendar-invalid fresh fact with valid later review',result:'rejected-as-required'});
}
const root=fs.realpathSync(fs.mkdtempSync('/private/tmp/mais-s7-independent-files-'));
const contents={'app/page.tsx':Buffer.from('export default 1;\n'),'lib/quiet.ts':Buffer.from('export const answer = 1;\n'),'public/pixel.bin':Buffer.from([0,1,2]),'middleware.ts':Buffer.from('export const middleware = 1;\n'),'next.config.ts':Buffer.from('export default {};\n'),'tsconfig.json':Buffer.from('{}\n'),'tsconfig.next.json':Buffer.from('{}\n')};
for(const [p,b]of Object.entries(contents)){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),b,{mode:0o644});}
const hashRow=p=>({path:p,rawSha256:sha(contents[p])});
const records=Object.entries(contents).map(([p,b])=>({path:p,mode:'100644',objectId:crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')})).sort((a,b)=>a.path<b.path?-1:1);
const observation={snapshot:{files:['app/page.tsx','lib/quiet.ts','public/pixel.bin'].map(hashRow)},specialFiles:[hashRow('middleware.ts')],sensitiveAnchors:['app/page.tsx',...base.RUNTIME_RESOLVER_CONFIG_PATHS].map(hashRow)};
const check=(actual=observation,sourceRecords=records)=>preparer.verifyRuntimeObservationBytes({root,targetRecords:sourceRecords,expectedObservation:observation,actualObservation:actual});
const cleanDigest=check();results.push({kind:'physical',case:'complete native resolver anchor positive including tsconfig.next.json',result:'accepted-as-required',digest:cleanDigest});
for(const p of ['lib/quiet.ts','public/pixel.bin','tsconfig.next.json']){
 fs.writeFileSync(path.join(root,p),Buffer.concat([contents[p],Buffer.from('x')]));assert.throws(()=>check(),/byte|object/);fs.writeFileSync(path.join(root,p),contents[p]);results.push({kind:'physical',case:'changed content '+p,result:'rejected-as-required'});
}
for(const p of ['app/page.tsx','tsconfig.next.json']){fs.chmodSync(path.join(root,p),0o755);assert.throws(()=>check(),/mode/);fs.chmodSync(path.join(root,p),0o644);results.push({kind:'physical',case:'changed executable mode '+p,result:'rejected-as-required'});}
for(const field of ['snapshot','specialFiles','sensitiveAnchors']){const actual=structuredClone(observation);(field==='snapshot'?actual.snapshot.files:actual[field])[0].rawSha256='0'.repeat(64);assert.throws(()=>check(actual),/byte|snapshot|anchor/);results.push({kind:'physical',case:'mismatched native '+field,result:'rejected-as-required'});}
assert.throws(()=>check(observation,records.filter(x=>x.path!=='tsconfig.next.json')),/inventory/);results.push({kind:'physical',case:'omit target Git resolver record',result:'rejected-as-required'});
const p=path.join(root,'lib/quiet.ts');fs.renameSync(p,p+'.original');fs.symlinkSync('quiet.ts.original',p);assert.throws(()=>check(),/symlink|canonical/);fs.unlinkSync(p);fs.renameSync(p+'.original',p);results.push({kind:'physical',case:'final-component symlink',result:'rejected-as-required'});
fs.renameSync(path.join(root,'lib'),path.join(root,'real-lib'));fs.symlinkSync('real-lib',path.join(root,'lib'));assert.throws(()=>check(),/symlink|canonical/);fs.unlinkSync(path.join(root,'lib'));fs.renameSync(path.join(root,'real-lib'),path.join(root,'lib'));results.push({kind:'physical',case:'ancestor symlink',result:'rejected-as-required'});
// Keep a strict upper wall-clock bound around the unchanged exported function:
// the previously observed stable-FIFO case must now reject before blocking open.
fs.renameSync(p,p+'.original');execFileSync('mkfifo',[p]);let began=Date.now();assert.throws(()=>check(),/non-regular|not regular/);assert.ok(Date.now()-began<1000);fs.unlinkSync(p);fs.renameSync(p+'.original',p);results.push({kind:'physical',case:'stable final FIFO',result:'rejected-without-blocking'});
const originalRead=fs.readSync;let changed=false;
try{fs.readSync=function(...args){const count=originalRead.apply(this,args);if(!changed){changed=true;fs.appendFileSync(path.join(root,'app/page.tsx'),'x');}return count;};assert.throws(()=>check(),/size changed|file changed|content differs/);}finally{fs.readSync=originalRead;fs.writeFileSync(path.join(root,'app/page.tsx'),contents['app/page.tsx']);}
results.push({kind:'physical',case:'controlled growth during bounded descriptor read',result:'rejected-as-required'});
const originalOpen=fs.openSync;let switched=false;
try{fs.openSync=function(file,flags,...rest){if(file===p&&!switched){assert.ok(flags&fs.constants.O_NONBLOCK);assert.ok(flags&fs.constants.O_NOFOLLOW);switched=true;fs.renameSync(p,p+'.original');execFileSync('mkfifo',[p]);}return originalOpen.call(this,file,flags,...rest);};began=Date.now();assert.throws(()=>check(),/not regular|non-regular/);assert.ok(Date.now()-began<1000);}finally{fs.openSync=originalOpen;if(switched){fs.unlinkSync(p);fs.renameSync(p+'.original',p);}}
results.push({kind:'physical',case:'controlled final FIFO replacement immediately before open',result:'rejected-without-blocking'});
assert.equal(check(),cleanDigest);assert.deepEqual(snapshot(),before);
const report={schemaVersion:'mais-s7-independent-recheck-behavior.v1',at:new Date().toISOString(),reviewer:'/root/s5_quality_review/s7_binding_contract',sourcePaths:before,results,total:results.length,physicalFixtureRoot:root,sourceUnchanged:true,method:'Independent boundary mutations on exact exported functions; only original in-memory review fixture declarations are reused. All filesystem mutations are in one new /private/tmp fixture, no Git/index flag or source mutation.',fullCollector:false,actualRoleIndex:false,writeEvidence:false,writeBindings:false,shadow:false};
fs.writeFileSync('/private/tmp/mais-s7-review/recheck-behavior.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({total:results.length,dateCases:results.filter(x=>x.kind==='date').length,physicalCases:results.filter(x=>x.kind==='physical').length,sourceUnchanged:true}));
