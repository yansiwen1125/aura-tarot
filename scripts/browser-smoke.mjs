// Browser integration with a deterministic upstream. No real API calls or user storage.
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRouter} from '../server/router.mjs';
import {evidenceFor} from '../shared/tarot-catalog.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const temp=await mkdtemp(path.join(os.tmpdir(),'aura-browser-'));
let delay=0;
const provider={async json(stage,schema,rules,data,control){
 control.reserve(50);
 if(delay)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,delay);control.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(control.signal.reason);},{once:true});});
 if(stage==='facts')return {facts:[],unknowns:['具体背景未知'],route:'normal'};
 if(stage==='guide')return {text:'听起来你希望在当前岗位应对需求变化。我们可以用三张牌探索。',nextAction:'offer_draw'};
 if(stage==='review')return {hardPass:true,scores:{fidelity:4,meaning:4,relevance:4,depth:4,action:4},issues:[]};
 if(data.task==='followup')return {text:'可以先列出当前任务，再与经理确认优先顺序。',nextAction:'continue_chat',followups:['我该怎么确认任务的截止时间？','如果经理不愿意排序，我还能怎么沟通？','我可以怎样减少返工？']};
 const evidence=evidenceFor(data.spread);
 return {summary:'可以**先确认优先级**，再整理需求变化。',understanding:'背景有限，因此以下仅提供反思角度。',cards:data.spread.map((c,i)=>({...c,interpretation:`${evidence[i].name} 提醒你**先明确任务边界**。`,factIds:[],meaningIds:[evidence[i].meaningId]})),synthesis:{text:'开放尝试和稳步调整可以相互支持。',factIds:[],meaningIds:evidence.slice(0,2).map(x=>x.meaningId)},uncertainties:['尚不清楚具体的沟通情况。'],challenges:['留意过度自责。'],actions:[{step:'记录需求变化',when:'明天工作前',observe:'是否更清晰'},{step:'确认优先级',when:'下次接任务时',observe:'双方是否一致'}],followups:['你目前是学生、在职、待业还是转行？最近一段专业或工作背景是什么？','如何记录变化？','如何表达边界？']};
},async stream(rules,data,control,onDelta){control.reserve(50);onDelta('先说说你');await new Promise(r=>setTimeout(r,100));control.check();onDelta('最在意的部分。');return {text:'先说说你最在意的部分。',nextAction:'continue_chat'};}};
const server=http.createServer(createRouter(path.resolve('.'),{provider,config:{key:'test-not-real',maxOutput:2000,timeout:10000,dailyTokens:1000000,callLimit:5},budgetFile:path.join(temp,'budget.json')}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('aura.mode.v2','demo'));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 assert.equal(await page.locator('.ai-mode-bar').count(),0);
 await page.locator('[data-action="topic"][data-id="career"]').click();
 await page.locator('#question').fill('我不想离职，如何应对临时需求？');
 await page.locator('#question-form button[type="submit"]').click();
 await page.getByRole('button',{name:'Agree and continue'}).waitFor();
 for(const viewport of [{width:360,height:780},{width:1200,height:900},{width:393,height:852}]) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(()=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--screen-scale'))-Math.min(1,innerWidth/393,innerHeight/852))<0.0001);
  const bounds=await page.locator('.modal').evaluate(el=>{
   const modal=el.getBoundingClientRect(),app=document.querySelector('#app').getBoundingClientRect();
   return {within:modal.left>=app.left && modal.right<=app.right && modal.top>=app.top && modal.bottom<=app.bottom,ratio:modal.width/app.width};
  });
  assert(bounds.within && bounds.ratio<0.8);
 }
 await mkdir('docs/previews/v2.0',{recursive:true});
 await page.waitForTimeout(250);
 await page.screenshot({path:'docs/previews/v2.0/modal-fixed.png'});
 assert.equal(await page.getByRole('button',{name:'Close dialog'}).locator('svg').count(),1);
 await page.getByRole('button',{name:'Close dialog'}).click();
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.equal(await page.locator('#question').inputValue(),'我不想离职，如何应对临时需求？');
 await page.locator('#question-form button[type="submit"]').click();await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0);
 await page.locator('#question-form button[type="submit"]').click();
 await page.getByRole('button',{name:'Agree and continue'}).click();
 await page.locator('[data-action="draw"]').first().waitFor();
 await page.locator('[data-action="draw"]').first().click();
 assert.match(await page.getByRole('dialog').innerText(),/Your question/);
 assert.doesNotMatch(await page.getByRole('dialog').innerText(),/[\u3400-\u9fff]/u);
 await page.getByRole('button',{name:'Confirm and draw'}).click();
 await page.locator('.fan-card').first().waitFor();
 const layout=()=>page.locator('.draw-content').evaluate(el=>({scrollTop:el.scrollTop,tableY:el.querySelector('.tarot-table').getBoundingClientRect().y,arcY:el.querySelector('.fan-ellipse-top').getBoundingClientRect().y}));
 for(const viewport of [{width:360,height:780},{width:393,height:852},{width:430,height:932}]) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(()=>Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--screen-scale'))-Math.min(1,innerWidth/393,innerHeight/852))<0.0001);
  const before=await layout();
  await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,130);await page.waitForTimeout(100);
  assert.deepEqual(await layout(),before,'draw canvas must not scroll independently');
 }
 await page.setViewportSize({width:393,height:852});
 await mkdir('docs/previews/v2.0',{recursive:true});
 await page.screenshot({path:'docs/previews/v2.0/draw-fixed.png'});

 // Horizontal drag changes the fan while the cloth and arcs stay fixed.
 const fixedLayout=await layout();
 const pose=await page.locator('.fan-card').nth(10).getAttribute('style');
 await page.mouse.move(190,650);await page.mouse.down();await page.mouse.move(245,650,{steps:5});await page.mouse.up();
 assert.notEqual(await page.locator('.fan-card').nth(10).getAttribute('style'),pose);
 assert.deepEqual(await layout(),fixedLayout);
 await page.waitForTimeout(280); // Drag suppresses click activation for 250ms.
 // Invoke the same buttons without fighting intentionally overlapping fan cards.
 delay=150;
 for(const i of [0,1,2])await page.locator(`.fan-card[data-index="${i}"]`).evaluate(el=>el.click());
 await page.locator('.reading-status').filter({hasText:'Interpreting your cards'}).waitFor();
 assert.equal(await page.locator('.reading-status').filter({hasText:'Local'}).count(),0);
 assert.equal(await page.locator('.message.user .message-source').count(),0);
 assert.equal(await page.locator('.generation-stop').first().locator('svg').count(),1);
 assert.equal(await page.locator('.bubble .generation-stop').count(),0);
 assert.equal(await page.locator('#question').count(),1);
 assert.equal(await page.locator('.composer-stop').count(),1);
 await page.screenshot({path:'docs/previews/v2.0/loading-composer.png'});
 const inlineStopStyle=await page.locator('.generation-stop').first().evaluate(el=>{
  const css=getComputedStyle(el),svg=getComputedStyle(el.querySelector('svg'));
  return [css.width,css.height,css.color,css.borderRadius,svg.width,svg.height,svg.backgroundColor,svg.borderColor];
 });

 delay=0;
 await page.locator('.reading-intro').waitFor();
 assert.match(await page.locator('.reading-intro').textContent(),/优先级/);
 assert.equal(await page.locator('.reading-intro strong').count(),1);
 assert.equal(await page.locator('.reading-reason strong').count(),3);
 assert.equal(await page.locator('.reading-actions li').count(),2);
 assert.equal(await page.locator('.interpretation .step-number').count(),3);
 assert.equal(await page.locator('.reading-reason h4').count(),3);
 const readingStyle=await page.evaluate(()=>{
  const css=selector=>getComputedStyle(document.querySelector(selector));
  const left=selector=>document.querySelector(selector).getBoundingClientRect().left;
  return {card:css('.reading-reason h4').fontSize,intro:css('.reading-intro').fontSize,action:css('.reading-actions h4').fontSize,offset:left('.reading-block .action-button')-left('.reading-intro'),button:document.querySelector('.reinterpret-button').textContent,buttonSize:css('.reinterpret-button').fontSize,buttonWeight:css('.reinterpret-button').fontWeight,titleColor:css('.reading-reason h4').color,actionGap:css('.reading-actions h4').marginBottom,noticeWidth:css('.reading-status').width};
 });
 assert.deepEqual(readingStyle,{card:'16px',intro:'14px',action:'16px',offset:0,button:'Read again',buttonSize:'14px',buttonWeight:'400',titleColor:'rgb(52, 50, 57)',actionGap:'4px',noticeWidth:'306px'});
 const alignment=await page.evaluate(()=>{
  const reason=document.querySelector('.reading-reason');
  const number=reason.querySelector('.step-number').getBoundingClientRect(),title=reason.querySelector('h4').getBoundingClientRect(),body=reason.querySelector('p').getBoundingClientRect();
  return {center:Math.abs((number.top+number.bottom-title.top-title.bottom)/2),indent:Math.abs(title.left-body.left),summaryGap:getComputedStyle(document.querySelector('.interpretation-heading')).marginBottom};
 });
 assert(alignment.center<1);assert(alignment.indent<1);assert.equal(alignment.summaryGap,'4px');
 await page.locator('[data-action="card-detail"]').first().click();
 await page.locator('[data-action="challenge"]').click();
 const polish=await page.evaluate(()=>{
  const css=s=>getComputedStyle(document.querySelector(s));
  return {background:css('.card-detail-face').backgroundColor,art:css('.detail-open .result-front').visibility,intro:css('.reading-intro').color,line:css('.reading-intro').lineHeight,button:css('.reinterpret-button').color,heading:css('.accordion').marginTop,panel:css('.challenge-text').marginTop};
 });
 assert.deepEqual(polish,{background:'rgba(255, 238, 240, 0.8)',art:'hidden',intro:'rgb(0, 0, 0)',line:'19.6px',button:'rgb(117, 117, 117)',heading:'16px',panel:'16px'});
 await page.locator('[data-action="challenge"]').click();


 const order=await page.evaluate(()=>{
  const selectors=['.interpretation-heading','.reading-intro','.reading-reason','.reading-actions'];
  return selectors.map(selector=>document.querySelector(selector).getBoundingClientRect().top);
 });assert(order.every((y,i)=>i===0||y>order[i-1]));
 assert.equal(await page.getByText('完整解读与依据',{exact:true}).count(),0);
 assert.equal(await page.locator('.followups button').filter({hasText:'你目前是学生'}).count(),0);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data);
 await page.locator('#question').fill('明天我具体可以怎么做？');await page.locator('#question-form button[type="submit"]').click();
 await page.getByText('可以先列出当前任务，再与经理确认优先顺序。',{exact:false}).waitFor();
 await page.locator('.followups button').filter({hasText:'我该怎么确认任务的截止时间？'}).waitFor();
 const followupLayout=await page.evaluate(()=>{
  const bubble=document.querySelector('.message.assistant:has(+ .followups.after-message) .bubble').getBoundingClientRect();
  const chips=[...document.querySelectorAll('.followups.after-message > button')].map(el=>el.getBoundingClientRect());
  return {aligned:chips.every(r=>Math.abs(r.left-bubble.left)<1 && r.right<=bubble.right+1),margin:getComputedStyle(document.querySelector('.reading-block + .message.user')).marginTop};
 });
 assert.equal(followupLayout.aligned,true);assert.equal(followupLayout.margin,'20px');
 await page.reload();await page.locator('.reading-intro').waitFor();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data);
 assert.deepEqual(after.order,before.order);assert.deepEqual(after.selected,before.selected);
 // Regenerate uses the original immutable snapshot, not later user messages.
 await page.locator('[data-action="regen"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data.request.status==='succeeded');
 // Reinterpretation uses the frozen question/cards plus the latest user context.
 await page.getByRole('button',{name:'Read again',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data.request.status==='succeeded');
 const updatedReading=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data);
 assert.equal(updatedReading.readingInput.messages.at(-1).role,'user');
 assert.deepEqual(updatedReading.order,before.order);
 // Slow request cancellation keeps the old report and never rewrites the new owner.
 delay=4000;
 await page.locator('#question').fill('我想再具体一些');await page.locator('#question-form button[type="submit"]').click();
 await page.locator('.composer-stop').waitFor();
 const composerStopStyle=await page.locator('.composer-stop').evaluate(el=>{
  const css=getComputedStyle(el),svg=getComputedStyle(el.querySelector('svg'));
  return [css.width,css.height,css.color,css.borderRadius,svg.width,svg.height,svg.backgroundColor,svg.borderColor];
 });
 assert.deepEqual(composerStopStyle,inlineStopStyle);

 await page.locator('[data-action="stop-generation"]').first().click();
 assert.match(await page.locator('.error').textContent(),/stopped/);
 delay=0;
 await page.locator('[data-action="retry"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data.request.status==='succeeded');
 for(const width of [360,393,430]) {
  await page.setViewportSize({width,height:852});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await mkdir('docs/previews/v2.0',{recursive:true});
 await page.locator('.reading-intro').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.waitForTimeout(700);
 await page.screenshot({path:'docs/previews/v2.0/mock-reading.png'});
 // Simulate a revoked key for one followup, without changing the user's .env.
 await page.route('**/api/generations',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:{code:'UPSTREAM_AUTH_FAILED'}})}));
 await page.locator('#question').fill('如果明天任务又变化了怎么办？');await page.locator('#question-form button[type="submit"]').click();
 await page.locator('.toast').filter({hasText:'Showing a demo response'}).waitFor();
 assert.equal(await page.locator('.message-source').last().textContent(),'Demo response');
 const fallback=await page.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data);
 assert.equal(fallback.messages.at(-1).source,'demo');assert.equal(fallback.request.status,'succeeded');
 assert.deepEqual(fallback.selected,before.selected);assert.equal(await page.locator('.error').count(),0);
 await page.unroute('**/api/generations');
 await page.locator('#question').fill('明天先做什么？');await page.locator('#question-form button[type="submit"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data.messages.at(-1).source==='ai' && JSON.parse(localStorage.getItem('aura.session.v2')).data.request.status==='succeeded');
 const chip=page.locator('.followups button').first();const chipText=(await chip.textContent()).trim();
 assert(!chipText.startsWith('你目前'));
 await chip.click();
 await page.waitForFunction(text=>{
  const s=JSON.parse(localStorage.getItem('aura.session.v2')).data;
  return s.request.status==='succeeded' && s.messages.filter(m=>m.role==='user').at(-1).text===text;
 },chipText);
 assert.equal(await page.locator('.followups button').filter({hasText:chipText}).count(),0);
 // Missing local configuration also falls back instead of blocking the first question.
 const offline=await browser.newPage({viewport:{width:393,height:852}});
 await offline.addInitScript(()=>localStorage.setItem('aura.consent.v2','2026-10-21'));
 await offline.route('**/api/generations',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'AI_UNAVAILABLE'}})}));
 await offline.goto(`http://127.0.0.1:${server.address().port}`);
 await offline.locator('[data-action="topic"][data-id="general"]').click();
 await offline.locator('#question').fill('我最近该如何调整自己的状态？');await offline.locator('#question-form button[type="submit"]').click();
 await offline.locator('.toast').filter({hasText:'Showing a demo response'}).waitFor();
 assert.equal(await offline.locator('.message.assistant').count(),1);
 await offline.locator('[data-action="draw"]').first().click();await offline.getByRole('button',{name:'Confirm and draw'}).click();await offline.locator('.fan-card').first().waitFor();
 const fixedSpread=await offline.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data.order.slice(0,3));
 for(const i of [0,1,2])await offline.locator(`.fan-card[data-index="${i}"]`).evaluate(el=>el.click());
 await offline.locator('.reading-block .reading-intro').waitFor();
 const demoReading=await offline.evaluate(()=>JSON.parse(localStorage.getItem('aura.session.v2')).data);
 assert.equal(demoReading.reading.source,'demo');assert.deepEqual(demoReading.order.slice(0,3),fixedSpread);
 assert.equal(demoReading.messages.filter(m=>m.role==='user').length,2);
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: default AI, consent, draw scroll alignment, reading, followup, cancellation, refresh, auth/unavailable fallback and recovery; mock upstream only.');
} finally {await browser?.close();await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
