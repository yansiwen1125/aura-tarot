import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generate,verifyFacts} from '../server/service.mjs';
import {createProvider} from '../server/deepseek.mjs';
import {createRouter,validateInput} from '../server/router.mjs';
import {readingSchema,schemaErrors,validateReading,reviewPass,CONSENT_VERSION} from '../shared/contracts.js';
import {events} from '../shared/sse.js';
import {evidenceFor} from '../shared/tarot-catalog.js';
import {generateRequest} from '../client/ai-client.js';
import {loadSaved,saveSaved,prepare,SESSION_KEY} from '../client/storage.js';
import {newSession} from '../core.js';
export const input=()=>({schemaVersion:2,requestId:crypto.randomUUID(),sessionId:crypto.randomUUID(),consentVersion:CONSENT_VERSION,task:'reading',topic:'career',guideId:'career',question:'我不想离职，如何应对临时需求？',frozenQuestion:'如何在当前岗位应对临时需求？',messages:[{id:'message-00001',role:'user',text:'我不想离职，如何应对临时需求？'}],spread:[{cardId:0,position:'past',reversed:false},{cardId:1,position:'now',reversed:true},{cardId:14,position:'future',reversed:false}],reading:null,clarificationCount:0});
export const facts={facts:[{id:'f1',messageId:'message-00001',quote:'我不想离职',statement:'用户不想离职'}],unknowns:['具体沟通情况未知'],route:'normal'};
export const reading=()=>({summary:'**先确认需求优先级**，而非急于离职。',understanding:'你提到不想离职，希望应对临时需求。',cards:input().spread.map((c,i)=>({...c,interpretation:'这张牌提示**确认任务边界**，再整理当前问题。',factIds:['f1'],meaningIds:[evidenceFor(input().spread)[i].meaningId]})),synthesis:{text:'开放尝试与聚焦行动可以结合，通过一个小实验找到平衡。',factIds:['f1'],meaningIds:['0:upright','1:reversed']},uncertainties:['还不知道经理如何回应沟通。'],challenges:['不要将变更直接等同于自己的能力不足。'],actions:[{step:'列出当前需求和变更',when:'明天开始工作前',observe:'确认最常发生的变化'},{step:'确认优先顺序',when:'下次收到临时任务时',observe:'双方是否对先后次序一致'}],followups:['如何沟通优先级？','如何记录需求？','我能先做哪一步？']});
export const approved={hardPass:true,scores:{fidelity:4,meaning:4,relevance:4,depth:4,action:4},issues:[]};
const control=()=>({signal:new AbortController().signal,check(){},reserve(){},usage(){}});
export function mockProvider(overrides={}) {
 const calls=[];
 return {calls,async json(stage,schema,rules,data,c){c.reserve(50);calls.push(stage);if(overrides[stage])return overrides[stage](data);if(stage==='facts')return structuredClone(facts);if(stage==='review')return structuredClone(approved);if(stage==='guide')return {text:'我们可以先整理你的关切。',nextAction:'offer_draw'};return reading();},async stream(rules,data,c,onDelta){c.reserve(50);onDelta('你可以');onDelta('先说说。');return {text:'你可以先说说。',nextAction:'continue_chat'};}};
}
test('reading pipeline verifies exact facts and publishes only reviewed unchanged cards',async()=>{
 const p=mockProvider(),i=input(),result=await generate(i,p,control());
 assert.deepEqual(p.calls,['facts','generate','review']);assert.equal(result.meta.reviewed,true);assert.equal(schemaErrors(result.reading,readingSchema).length,0);assert.deepEqual(result.reading.cards.map(({cardId,position,reversed})=>({cardId,position,reversed})),i.spread);
});
test('invalid card triggers one revision, semantic failure never becomes success',async()=>{
 const p=mockProvider({generate:()=>({...reading(),cards:reading().cards.map((c,i)=>i?c:{...c,cardId:21})})});
 await generate(input(),p,control());assert.deepEqual(p.calls,['facts','generate','revise','review']);
 const fail=mockProvider({review:()=>({...approved,hardPass:false,issues:['synthesis: invented user history']})});
 await assert.rejects(()=>generate(input(),fail,control()),/QUALITY_CHECK_FAILED/);assert.equal(fail.calls.filter(x=>x==='revise').length,1);assert.equal(fail.calls.length,5);
});
test('fact references cannot cite assistant claims, invented quotes or duplicate IDs',()=>{
 for(const fact of [{...facts.facts[0],quote:'用户想离职'},{...facts.facts[0],messageId:'unknown-message'}])assert.throws(()=>verifyFacts({...facts,facts:[fact]},input().messages),/INVALID_FACT_REFERENCE/);
 assert.throws(()=>verifyFacts({...facts,facts:[facts.facts[0],facts.facts[0]]},input().messages));
 const errors=validateReading({...reading(),cards:reading().cards.map((c,i)=>i?c:{...c,meaningIds:['0:reversed']})},input().spread,facts,evidenceFor(input().spread));assert(errors.length);
 assert.equal(reviewPass({...approved,hardPass:false}),false);assert.equal(reviewPass({...approved,scores:{...approved.scores,fidelity:2}}),false);
});
test('cancellation prevents publication before review and clarification is bounded',async()=>{
 let count=0;const c=control();c.check=()=>{if(++count===4)throw Error('CANCELLED');};
 await assert.rejects(()=>generate(input(),mockProvider(),c),/CANCELLED/);
 const i={...input(),task:'guide',spread:[],clarificationCount:1};
 const p=mockProvider({guide:()=>({text:'可以开始探索。',nextAction:'clarify'})});assert.equal((await generate(i,p,control())).reply.nextAction,'offer_draw');
});
test('input boundary rejects repeated cards, fake directions, consent and excessive context',()=>{
 const v=input();assert(validateInput(v));
 for(const patch of [{spread:[v.spread[0],v.spread[0],v.spread[2]]},{spread:v.spread.map(c=>({...c,reversed:'false'}))},{consentVersion:'old'},{messages:[{...v.messages[0],text:'x'.repeat(21000)}]},{guideId:'override-system'},{task:'followup',reading:null}])assert.throws(()=>validateInput({...v,...patch}));
});
test('SSE decoding handles split UTF8 and frames; missing completion is an error',async()=>{
 const bytes=new TextEncoder().encode('event: delta\r\ndata: {"text":"你好"}\r\n\r\nevent: done\ndata: {}\n\n');
 const stream=new ReadableStream({start(c){for(const b of bytes)c.enqueue(Uint8Array.of(b));c.close();}});
 const result=[];for await(const e of events(stream))result.push(e);assert.equal(JSON.parse(result[0].data).text,'你好');assert.equal(result.length,2);
 const i=input();const body=`event: delta\ndata: ${JSON.stringify({requestId:i.requestId,seq:1,text:'部分'})}\n\n`;
 await assert.rejects(()=>generateRequest(i,new AbortController().signal,()=>{},async()=>new Response(body,{headers:{'Content-Type':'text/event-stream'}})),/INCOMPLETE_OUTPUT/);
});
test('provider retains split UTF8, ignores reasoning, enforces completed JSON and opaque errors',async()=>{
 let payload;
 const config={key:'test-key',readingModel:'test',reviewModel:'test',contextModel:'test',maxOutput:2000};
 const response={status:'completed',output:[{type:'reasoning',content:[{type:'reasoning_text',text:'private'}]},{type:'message',content:[{type:'output_text',text:'{"text":"你好"}'}]}]};
 const p=createProvider(config,async(url,options)=>{payload=JSON.parse(options.body);const bytes=new TextEncoder().encode(JSON.stringify(response));return new Response(new ReadableStream({start(c){for(const b of bytes)c.enqueue(Uint8Array.of(b));c.close();}}));});
 assert.deepEqual(await p.json('facts',{},'rules',{},control()),{text:'你好'});assert.equal(payload.text.format.type,'json_schema');
 const bad=createProvider(config,async()=>new Response(JSON.stringify({...response,status:'incomplete'})));
 await assert.rejects(()=>bad.json('facts',{},'rules',{},control()),/INCOMPLETE_OUTPUT/);
 const rate=createProvider(config,async()=>new Response('sensitive upstream text',{status:429}));await assert.rejects(()=>rate.json('facts',{},'rules',{},control()),/UPSTREAM_RATE_LIMITED/);
});
function memoryStorage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
test('v1 migration preserves originals, identifiers and interrupted state; null clears safely',()=>{
 const store=memoryStorage(),s=newSession('career');s.messages=[{role:'user',text:'我的问题'}];const raw=JSON.stringify(s);store.setItem('aura.session.v1',raw);
 const loaded=loadSaved(store);assert(loaded.session.messages[0].id);assert.equal(loaded.session.messages[0].source,'demo');
 saveSaved(store,loaded.session,[]);assert.equal(store.getItem('aura.session.v1'),raw);assert.equal(loadSaved(store).session.id,s.id);
 loaded.session.request={status:'streaming'};saveSaved(store,loaded.session,[]);assert.equal(loadSaved(store).session.request.status,'interrupted');
 saveSaved(store,null,[]);assert.equal(loadSaved(store).session,null);assert(store.getItem(SESSION_KEY));
});
test('HTTP integration protects private files, deduplicates, persists budget and returns complete SSE',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'aura-test-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const budgetFile=path.join(temp,'budget.json'),config={key:'test',maxOutput:2000,timeout:2000,dailyTokens:10000,callLimit:5};
 const p=mockProvider();const server=http.createServer(createRouter(path.resolve('.'),{config,provider:p,budgetFile}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const origin=`http://127.0.0.1:${server.address().port}`;
 for(const file of ['/server/deepseek.mjs','/.env','/docs/PRD-v2.md','/server.mjs','/%2e%2e%2f.env'])assert.equal((await fetch(origin+file)).status,404);
 assert.equal((await fetch(origin+'/shared/contracts.js')).status,200);
 const headers={Origin:origin,'Content-Type':'application/json'},i=input();
 const wrong=await fetch(origin+'/api/generations',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:JSON.stringify(i)});assert.equal(wrong.status,403);
 const response=await fetch(origin+'/api/generations',{method:'POST',headers,body:JSON.stringify(i)});const text=await response.text();assert.match(text,/event: done/);assert.doesNotMatch(text,/test-key/);
 assert.equal((await fetch(origin+'/api/generations',{method:'POST',headers,body:JSON.stringify(i)})).status,409);
 assert.equal(JSON.parse(await readFile(budgetFile,'utf8')).tokens,150);
});

 test('presentation hides internal citation markers without changing verified reference arrays', async()=>{
 const {reportToLegacy}=await import('../client/ai-client.js');
 const original=reading();original.understanding='你提到暂时不离职（f1）。';
 const meta={grounding:{facts:[{id:'f1'}],meanings:[]}};
 const shown=reportToLegacy(original,meta);
 assert.equal(shown.detail.understanding,'你提到暂时不离职。');
 assert.deepEqual(shown.detail.cards[0].factIds,['f1']);
 assert.equal(shown.originalReport.understanding,'你提到暂时不离职（f1）。');
 });

 test('demo fallback preserves frozen cards and does not hide cancellations or quality failures',async()=>{
 const {demoResponse,shouldUseDemo}=await import('../client/demo-fallback.js');
 for(const code of ['UPSTREAM_AUTH_FAILED','AI_UNAVAILABLE','UPSTREAM_TIMEOUT'])assert(shouldUseDemo(new Error(code)));
 assert(!shouldUseDemo(new Error('QUALITY_CHECK_FAILED')));
 assert(!shouldUseDemo(new DOMException('cancelled','AbortError')));
 const original=input();const snapshot=JSON.stringify(original);
 const result=demoResponse(original,'UPSTREAM_AUTH_FAILED');
 assert.equal(result.demoReading.source,'demo');
 assert.match(result.demoReading.steps[0].text,/愚者（正位）/);
 assert.match(result.demoReading.steps[1].text,/魔术师（逆位）/);
 assert.match(result.demoReading.steps[2].text,/节制（正位）/);
 assert.equal(JSON.stringify(original),snapshot);
 });
 test('upstream authorization failure is classified without exposing the key or raw body',async()=>{
 const p=createProvider({key:'test-secret',maxOutput:2000},async()=>new Response('secret diagnostic',{status:401}));
 await assert.rejects(()=>p.json('facts',{},'rules',{},control()),error=>error.code==='UPSTREAM_AUTH_FAILED'&&!error.message.includes('secret'));
 });

test('latency profile keeps Pro for readings/review and avoids high reasoning for routine stages',async()=>{
 const sent=[];
 const p=createProvider({key:'test',contextModel:'flash',readingModel:'pro',reviewModel:'pro',maxOutput:8000},async(url,options)=>{
  sent.push(JSON.parse(options.body));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]}));
 });
 for(const stage of ['facts','guide','generate','review','revise'])await p.json(stage,{},'rules',{},control());
 assert.deepEqual(sent.map(x=>x.reasoning.effort),['none','none','none','none','high']);
 assert.deepEqual(sent.map(x=>x.model),['flash','flash','pro','pro','pro']);
});

 test('suggestions speak as the user, fix old interview prompts, and omit already asked questions',async()=>{
 const {userFollowups,isUserFollowup}=await import('../shared/followups.js');
 const bad='你目前是学生、在职、待业还是转行？最近一段专业或工作背景是什么？';
 assert.equal(isUserFollowup(bad),false);
 assert.equal(isUserFollowup('What is your current job?'),false);
 assert.equal(isUserFollowup('Can you help me plan my next step?'),true);
 const result=userFollowups([bad,'你最近的工作背景是什么？','我该如何确认优先级？'],[{role:'user',text:'我该如何确认优先级？'}],true);
 assert.equal(result.length,3);assert(result.every(isUserFollowup));assert(!result.includes(bad));assert(!result.includes('我该如何确认优先级？'));
 const corrected=userFollowups(['这张逆位牌对我的问题有什么提醒？','我明天可以先做什么？'],[],true);
 assert.equal(corrected[0],'这张逆位牌对我的问题有什么提醒？');
 });

 test('interview-style choices are rejected and old invalid suggestions use the actual user topic',async()=>{
 const {userFollowups,isUserFollowup}=await import('../shared/followups.js');
 const interview=['你目前是学生、在职、待业还是转行？','如果只能保留三个工作优先项，你会选兴趣、薪资还是稳定？','过去半年里，哪些任务让你更愿意投入？'];
 assert(interview.every(q=>!isUserFollowup(q)));
 const choices=userFollowups(interview,[],true,{question:'我今年能找到工作吗？'});
 assert(choices.includes('我的求职方向该怎么选？'));assert(!choices.some(q=>q.includes('这张牌')));
 });

 test('focused reading brief follows the user task and preserves earlier three-action records',async()=>{
 const {readingPlan,focusedReadingErrors}=await import('../server/reading-plan.mjs');
 const plan=readingPlan({...input(),frozenQuestion:'我未来的求职方向应该怎么选？'},facts);
 assert.equal(plan.task,'direction');assert.equal(plan.knownUserContext[0].statement,'用户不想离职');
 assert.equal(focusedReadingErrors(reading()).length,0);
 const bad={...reading(),summary:'没有重点的开场',actions:[...reading().actions,reading().actions[0]]};
 assert(focusedReadingErrors(bad).length>=2);
 assert.equal(schemaErrors(bad,readingSchema).length,0,'persisted old three-action reports remain readable');
 });

 test('known usage settles unused reservation while unknown usage stays reserved',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'aura-settle-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const budgetFile=path.join(temp,'budget.json');
 const p=mockProvider();const original=p.json;
 p.json=async(...args)=>{const value=await original(...args);args[4].usage({input_tokens:3,output_tokens:2,total_tokens:5});return value;};
 const server=http.createServer(createRouter(path.resolve('.'),{provider:p,config:{key:'test',maxOutput:2000,timeout:2000,dailyTokens:10000,callLimit:5},budgetFile}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const origin=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(origin+'/api/generations',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input())});
 assert.match(await response.text(),/event: done/);assert.equal(JSON.parse(await readFile(budgetFile,'utf8')).tokens,15);
 });

test('English readings enforce output language and repair Chinese prose before publication',async()=>{
 const i=input();i.question=i.frozenQuestion='What will my future relationship be like?';
 i.messages=[{id:'message-00001',role:'user',text:i.question},{id:'message-00002',role:'user',text:'我想抽三张牌。'}];
 const english=reading();english.synthesis.factIds=[];english.summary='**Make room for a new connection** by identifying what you want.';
 english.cards=english.cards.map(c=>({...c,interpretation:'**Look for clear communication** and use real conversations to check your expectations.',factIds:[]}));
 english.actions=[{step:'Name what matters most to you in a relationship.',when:'Now',observe:'A clear priority'}];
 english.challenges=['Avoid assuming what another person feels.'];english.followups=['What should I focus on first?','How can I communicate my needs?','What practical signs should I notice?'];
 const p=mockProvider({facts:()=>({facts:[],unknowns:[],route:'normal'}),generate:()=>{const r=structuredClone(english);r.summary='**先澄清自己的需求**，然后再去理解未来的关系方向，不要急于确定结果。';return r;},revise:()=>structuredClone(english)});
 const json=p.json.bind(p);p.json=async(stage,schema,rules,data,c)=>{assert.match(rules,/Required response language: English/);return json(stage,schema,rules,data,c);};
 const result=await generate(i,p,control());assert.equal(result.reading.summary,english.summary);assert.deepEqual(p.calls,['facts','generate','revise','review']);
 const bad=mockProvider({facts:()=>({facts:[],unknowns:[],route:'normal'}),generate:()=>reading(),revise:()=>reading()});
 await assert.rejects(()=>generate(i,bad,control()),/QUALITY_CHECK_FAILED/);
});
