require('tsx/cjs');
const path=require('node:path'),fsp=require('node:fs/promises');
const actualWrite=fsp.writeFile;
let paused=false;
fsp.writeFile=async function(file,...rest){
  if(!paused&&String(file).endsWith('.bin')){
    paused=true;
    process.send({event:'lease-admitted-before-binary',file});
    await new Promise(resolve=>process.once('message',message=>{if(message?.event!=='resume')throw new Error('Unexpected synthetic message');resolve();}));
  }
  return actualWrite.call(this,file,...rest);
};
const media=require(path.join(process.cwd(),'lib/server/mediaObjectStore.ts'));
process.once('message',async message=>{
  try{
    const result=await media.storeMediaObjectFromDataUrl({...message.input,now:new Date('2026-10-01T00:00:00.000Z')});
    process.send({event:'completed',result});
    process.disconnect();
  }catch(error){process.send({event:'error',error:String(error)});process.exitCode=1;process.disconnect();}
});
