import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
// Diagnostic copy only: wrappers measure the real functions without changing
// production source, SQL, guard order or outputs. Never log arguments/records.
const [input,output]=process.argv.slice(2);
const source=readFileSync(input,'utf8');
const names=new Set([
 'configurePostgresAccountWriteTransaction','acquirePostgresStorageMutationCapability',
 'ensurePostgresStateTable','selectPostgresStateRows','normalizeDatabase',
 'postgresStorageSnapshotContractIsCompleteWithContent','cloneLessonValue',
 'compactSeedOnlyLessonDatabase','overlayPostgresAiTutorJournals','overlayPostgresHotAuthRowsIfEnabled',
 'overlayPostgresStudentActivity','createScopedLessonContext','scopedLessonNormalizationMatches',
 'postgresLessonContentProjectionsMatchByRecord','readScopedPostgresLessonContext',
 'mergeScopedLessonContext','scopedPostgresLessonPayloadPatch','writePostgresDatabaseWith',
 'validateCompletePostgresStorageSnapshot','syncPostgresHotAuthTablesWith',
 'syncPostgresStudentActivity','syncPostgresProjectionTablesWith',
 'advancePostgresStorageReadinessAfterMutation','clearStudentDashboardCacheForUser',
 'mutateLessonProgressDatabase','afterLessonProgressUpdated','normalizedSeedOnlyLessonContent'
]);
const ast=ts.createSourceFile(input,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let out=source; const edits=[],found=[];
for(const node of ast.statements){
 if(!ts.isFunctionDeclaration(node)||!node.name||!names.has(node.name.text))continue;
 const name=node.name.text,async=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);
 edits.push({start:node.name.getStart(ast),end:node.name.end,text:'__unmeasured_'+name});
 found.push({name,async});
}
for(const node of ast.statements){
 if(!ts.isImportDeclaration(node)||!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings))continue;
 for(const spec of node.importClause.namedBindings.elements){
  const name=spec.name.text;if(!names.has(name)||found.some(x=>x.name===name))continue;
  edits.push({start:spec.getStart(ast),end:spec.end,text:(spec.propertyName?.text??name)+' as __unmeasured_'+name});
  found.push({name,async:true});
 }
}
for(const node of ast.statements){
 if(!ts.isFunctionDeclaration(node)||node.name?.text!=='writePostgresDatabaseWith')continue;
 const visit=n=>{
  if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&['stateRows','finalStateRows'].includes(n.name.text)&&n.initializer&&ts.isAwaitExpression(n.initializer)){
   const expr=n.initializer.expression;
   edits.push({start:n.initializer.getStart(ast),end:n.initializer.end,text:'await __lessonBudgetAsync('+JSON.stringify('writer.'+n.name.text)+', () => '+source.slice(expr.getStart(ast),expr.end)+')'});
  }
  ts.forEachChild(n,visit);
 };visit(node);
}
for(const e of edits.sort((a,b)=>b.start-a.start))out=out.slice(0,e.start)+e.text+out.slice(e.end);
for(const {name,async} of found)out+=`\n${async?'async ':''}function ${name}(...args:any[]){const start=performance.now();try{return ${async?'await ':''}__unmeasured_${name}(...args);}finally{(globalThis as any).__lessonBudgetSpan?.(${JSON.stringify(name)},start,performance.now());}}\n`;
// Mark queue occupancy through commit and cache retirement. Capture timestamps
// only; parallel callers get no private data in their profile.
const marker='return runPostgresLessonProgressTransaction(async () => {';
if(out.split(marker).length!==2)throw new Error('Expected one admission boundary');
out=out.replace(marker,marker+'\n(globalThis as any).__lessonBudgetSpan?.("admission",performance.now(),performance.now());');
out+='\nasync function __lessonBudgetAsync(name:string, run:()=>PromiseLike<any>){const start=performance.now();try{return await run();}finally{(globalThis as any).__lessonBudgetSpan?.(name,start,performance.now());}}\n';
writeFileSync(output,out,{flag:'wx'});
console.log(JSON.stringify({instrumented:found.map(x=>x.name),missing:[...names].filter(x=>!found.some(y=>y.name===x))}));
