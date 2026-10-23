// Explicit, paid smoke test using synthetic content. No API key is read here.
import {mkdir,writeFile} from 'node:fs/promises';
import {generateRequest} from '../client/ai-client.js';
const origin=process.env.AURA_TEST_ORIGIN||'http://127.0.0.1:4196';
const question='我入职两个月，经理经常临时改需求。我担心自己能力不够，但暂时不想换工作。我能如何调整沟通和工作安排？';
const base={schemaVersion:2,sessionId:crypto.randomUUID(),consentVersion:'2026-10-21',topic:'career',guideId:'career',question,frozenQuestion:'如何在当前岗位应对临时需求、调整沟通并减少自责？',messages:[{id:crypto.randomUUID(),role:'user',text:question}],spread:[{cardId:1,position:'past',reversed:false},{cardId:11,position:'now',reversed:true},{cardId:14,position:'future',reversed:false}],reading:null,clarificationCount:0};
if(process.env.AURA_TEST_SCENARIO==='career-direction') {
 base.question='我想了解未来的求职方向，应该优先考虑什么样的岗位？';
 base.frozenQuestion=base.question;
 base.messages=[{id:crypto.randomUUID(),role:'user',text:base.question}];
 base.spread=[{cardId:18,position:'past',reversed:false},{cardId:20,position:'now',reversed:true},{cardId:4,position:'future',reversed:false}];
}
const report={date:'2026-10-22',synthetic:true,scenario:process.env.AURA_TEST_SCENARIO||'workload',tests:[]};
const tasks=(process.env.AURA_TEST_TASKS||'chat,reading,followup').split(',');
async function run(task,input){
 const start=Date.now();console.log(`${task}: started`);
 try{
  const result=await generateRequest({...input,task,requestId:crypto.randomUUID()},AbortSignal.timeout(200000),(event,data)=>{if(event==='stage')console.log(`${task}: ${data.text}`);},(url,options)=>fetch(origin+url,{...options,headers:{...options.headers,Origin:origin}}));
  const record={task,status:'passed',durationMs:Date.now()-start,result};report.tests.push(record);
  console.log(JSON.stringify({task,status:'passed',durationMs:record.durationMs,calls:result.meta?.calls,usage:result.meta?.usage,characters:JSON.stringify(result.reading||result.reply).length}));return result;
 }catch(error){report.tests.push({task,status:'failed',durationMs:Date.now()-start,code:error.message,details:error.details});console.log(JSON.stringify({task,status:'failed',code:error.message,details:error.details}));return null;}
}
if(tasks.includes('chat'))await run('chat',{...base,spread:[],frozenQuestion:''});
const reading=await run('reading',base);
if(reading?.reading && tasks.includes('followup')){
 const messages=[...base.messages,{id:crypto.randomUUID(),role:'assistant',text:reading.reading.summary},{id:crypto.randomUUID(),role:'user',text:'请记住，我现在不想离职。明天可以先采取哪两个具体步骤？'}];
 await run('followup',{...base,messages,reading:reading.reading});
}
await mkdir('docs/previews/v2.0',{recursive:true});await writeFile(process.env.AURA_TEST_REPORT||'docs/previews/v2.0/live-check.json',JSON.stringify(report,null,2));
if(report.tests.some(t=>t.status!=='passed'))process.exitCode=1;
