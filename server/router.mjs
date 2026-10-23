import {readFile} from 'node:fs/promises';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createProvider,ApiError} from './deepseek.mjs';
import {generate} from './service.mjs';
import {CONSENT_VERSION,positions} from '../shared/contracts.js';
const integer=(name,fallback,min=1,max=100000000)=>{
 const n=Number(process.env[name]||fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`Invalid configuration: ${name}`);return n;
};
export function configuration() {
 return {key:process.env.DEEPSEEK_API_KEY||'',readingModel:process.env.DEEPSEEK_MODEL_READING||'deepseek-v4-pro',reviewModel:process.env.DEEPSEEK_MODEL_REVIEW||'deepseek-v4-pro',contextModel:process.env.DEEPSEEK_MODEL_CONTEXT||'deepseek-flash',maxOutput:integer('AI_MAX_OUTPUT_TOKENS',16000,1000,32000),timeout:integer('AI_TOTAL_TIMEOUT_MS',180000,1000,600000),dailyTokens:integer('AI_DAILY_TOKEN_LIMIT',1000000),callLimit:5};
}
const uuid=/^[a-zA-Z0-9_-]{8,80}$/;
export function validateInput(v) {
 const bad=()=>{throw new ApiError('INVALID_INPUT',400);};
 if(!v||v.schemaVersion!==2||!uuid.test(v.requestId)||!uuid.test(v.sessionId)||!['guide','chat','reading','followup'].includes(v.task))bad();
 if(v.consentVersion!==CONSENT_VERSION)throw new ApiError('CONSENT_REQUIRED',403);
 if(!['general','career','love','wellness','dream'].includes(v.topic)||!['general','career','love','wellness','dream','magician'].includes(v.guideId))bad();
 if(typeof v.question!=='string'||!v.question.trim()||v.question.length>500||typeof v.frozenQuestion!=='string'||v.frozenQuestion.length>1000)bad();
 if(!Array.isArray(v.messages)||v.messages.length>40||!v.messages.length)bad();
 let count=0;const ids=new Set();
 for(const m of v.messages){if(!m||!uuid.test(m.id)||ids.has(m.id)||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>6000)bad();ids.add(m.id);count+=m.text.length;}
 if(count>20000||v.messages.at(-1).role!=='user'||v.messages.at(-1).text.trim().length>500)bad();
 if(!Number.isInteger(v.clarificationCount)||v.clarificationCount<0||v.clarificationCount>1)bad();
 if(!Array.isArray(v.spread)||![0,3].includes(v.spread.length))bad();
 if(['reading','followup'].includes(v.task)&&v.spread.length!==3)bad();
 const cards=new Set();
 v.spread.forEach((c,i)=>{if(!c||!Number.isInteger(c.cardId)||c.cardId<0||c.cardId>21||cards.has(c.cardId)||c.position!==positions[i]||typeof c.reversed!=='boolean')bad();cards.add(c.cardId);});
 if(['reading','followup'].includes(v.task)&&!v.frozenQuestion.trim())bad();
 if(v.reading!==null && (!v.reading||typeof v.reading!=='object'||Array.isArray(v.reading)||JSON.stringify(v.reading).length>20000))bad();
 if(v.task==='followup' && v.reading===null)bad();
 // Whitelist fields: no client instructions, upstream URLs or models.
 return {schemaVersion:2,requestId:v.requestId,sessionId:v.sessionId,task:v.task,topic:v.topic,guideId:v.guideId,question:v.question,frozenQuestion:v.frozenQuestion,messages:v.messages.map(({id,role,text})=>({id,role,text})),spread:v.spread.map(({cardId,position,reversed})=>({cardId,position,reversed})),reading:v.reading,clarificationCount:v.clarificationCount};
}
export function createRouter(root,{config=configuration(),provider=createProvider(config),budgetFile=path.join(root,'.aura-budget.json')}={}) {
 const requests=new Map();let active=0, recent=[];
 function reserveTokens(amount, reservationDay=null) {
  const today=new Date().toISOString().slice(0,10);if(reservationDay && reservationDay!==today)return;let budget={day:today,tokens:0};
  try{const saved=JSON.parse(readFileSync(budgetFile,'utf8'));if(saved.day===today){if(!Number.isSafeInteger(saved.tokens)||saved.tokens<0)throw Error();budget=saved;}}
  catch(e){if(e.code!=='ENOENT')throw new ApiError('BUDGET_STATE_INVALID',503);}
  if(budget.tokens+amount>config.dailyTokens)throw new ApiError('BUDGET_EXCEEDED',429);
  budget.tokens=Math.max(0,budget.tokens+amount);
  try{writeFileSync(budgetFile+'.tmp',JSON.stringify(budget),{mode:0o600});renameSync(budgetFile+'.tmp',budgetFile);}catch{throw new ApiError('BUDGET_STATE_INVALID',503);}
 }
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 return async(req,res)=>{
  let timer,controller,heartbeat,owned=false;
  try{
   const address=req.socket.localAddress;
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address))throw new ApiError('LOCAL_ONLY',403);
   const host=req.headers.host;
   if(!host || !['127.0.0.1','localhost','[::1]'].includes(new URL('http://'+host).hostname))throw new ApiError('INVALID_HOST',403);
   const origin=`http://${host}`, url=new URL(req.url,origin);
   if(url.pathname==='/api/config'&&req.method==='GET')return json(res,200,{aiAvailable:!!config.key,provider:'deepseek',consentVersion:CONSENT_VERSION,localOnly:true});
   if(url.pathname==='/api/generations') {
    if(req.method!=='POST')throw new ApiError('METHOD_NOT_ALLOWED',405);
    if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ApiError('ORIGIN_REQUIRED',403);
    if(!config.key)throw new ApiError('AI_UNAVAILABLE',503);
    let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw new ApiError('REQUEST_TOO_LARGE',413);chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');
    let value;try{value=JSON.parse(raw);}catch{throw new ApiError('INVALID_INPUT',400);}
    const input=validateInput(value),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    for(const [id,r]of requests)if(r.until<Date.now())requests.delete(id);
    const old=requests.get(input.requestId);
    if(old)throw new ApiError(old.hash===hash?'REQUEST_ALREADY_USED':'REQUEST_ID_CONFLICT',409);
    if(active)throw new ApiError('REQUEST_IN_PROGRESS',409);
    recent=recent.filter(t=>t>Date.now()-60000);if(recent.length>=10)throw new ApiError('RATE_LIMITED',429);
    recent.push(Date.now());requests.set(input.requestId,{hash,until:Date.now()+300000});active++;owned=true;
    controller=new AbortController();let calls=0,reservedCall=null;const usage={inputTokens:0,outputTokens:0,totalTokens:0},stageTimings=[];
    timer=setTimeout(()=>controller.abort(new ApiError('UPSTREAM_TIMEOUT',504)),config.timeout);
    res.on('close',()=>{if(!res.writableEnded)controller.abort(new ApiError('CANCELLED',499));});
    const control={signal:controller.signal,recordStage(value){stageTimings.push(value);},check(){if(controller.signal.aborted)throw controller.signal.reason;},reserve(amount=65536+config.maxOutput){this.check();if(++calls>config.callLimit)throw new ApiError('CALL_LIMIT',429);reserveTokens(amount);reservedCall={amount,day:new Date().toISOString().slice(0,10)};},usage(value){if(!value)return;for(const [target,key]of [['inputTokens','input_tokens'],['outputTokens','output_tokens'],['totalTokens','total_tokens']])if(Number.isSafeInteger(value[key])&&value[key]>=0)usage[target]+=value[key];if(reservedCall && ['input_tokens','output_tokens','total_tokens'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0) && value.total_tokens===value.input_tokens+value.output_tokens && value.total_tokens<=reservedCall.amount){reserveTokens(value.total_tokens-reservedCall.amount,reservedCall.day);reservedCall=null;}/* Unknown/cancelled usage stays reserved; known completed calls settle actual usage. */}};
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
    let seq=0;const emit=(event,data)=>{if(!res.destroyed)res.write(`event: ${event}\ndata: ${JSON.stringify({requestId:input.requestId,seq:++seq,...data})}\n\n`);};
    heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': keepalive\n\n');},10000);
    const result=await generate(input,provider,control,emit);control.check();result.meta={...result.meta,calls,usage,stageTimings,modelConfig:{reading:config.readingModel,review:config.reviewModel,context:config.contextModel}};emit('done',{result});res.end();return;
   }
   if(url.pathname.startsWith('/api/'))throw new ApiError('NOT_FOUND',404);
   if(!['GET','HEAD'].includes(req.method))throw new ApiError('METHOD_NOT_ALLOWED',405);
   const pathname=decodeURIComponent(url.pathname);
   const entry=pathname==='/'?'index.html':pathname.slice(1);
   const roots=['assets/','client/','shared/'];
   const allowed=['index.html','app.js','core.js','content.js','simulator.js','style.css'];
   const ext=path.extname(entry);
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf'};
   if(entry.split('/').some(p=>p.startsWith('.')||p==='..')||!types[ext]||(!allowed.includes(entry)&&!roots.some(p=>entry.startsWith(p))))throw new ApiError('NOT_FOUND',404);
   const file=path.resolve(root,entry);if(!file.startsWith(root+path.sep))throw new ApiError('NOT_FOUND',404);
   const body=await readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body);
  }catch(error){
   const code=controller?.signal.aborted?controller.signal.reason?.code||'CANCELLED':error.code;
   const safe=error instanceof ApiError||controller?.signal.aborted;
   const payload={error:{code:safe?code:'SERVER_ERROR',message:safe?code:'Request failed',...(Array.isArray(error.details)?{details:error.details}:{}),retryable:!['INVALID_INPUT','CONSENT_REQUIRED','ORIGIN_REQUIRED'].includes(code)}};
   if(res.headersSent){if(!res.destroyed){res.write(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);res.end();}}
   else json(res,error.code==='ENOENT'?404:safe?error.status||502:500,payload);
  }finally{clearTimeout(timer);clearInterval(heartbeat);if(owned)active--;}
 };
}
