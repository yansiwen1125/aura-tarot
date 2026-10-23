import test from 'node:test';
import assert from 'node:assert/strict';
import {responseLanguage, progressText, progressEventText} from '../shared/language.js';
import {generate} from '../server/service.mjs';
const context = text => ({messages:[{role:'user',text}]});
test('progress follows latest user language across language switches and draw controls',()=>{
 const i={messages:[{role:'user',text:'我想找工作'},{role:'assistant',text:'中文回答'},{role:'user',text:'What should I do next?'}]};
 assert.equal(responseLanguage(i),'en');
 i.messages.push({role:'user',text:'我想抽三张牌。'});
 assert.equal(responseLanguage(i),'en');
 assert.equal(progressText('connect',i),'Connecting to DeepSeek');
 i.messages.push({role:'user',text:'现在应该怎么办？'});
 assert.equal(responseLanguage(i),'zh');
 assert.equal(responseLanguage(context('请用英文回答这个问题')),'en');
 assert.equal(responseLanguage(context('Please reply in Chinese')),'zh');
});
test('server progress stays English independently of question language',async()=>{
 for(const [text,expected] of [['What should I do?','Responding to your question'],['我该怎么办？','Responding to your question']]){
  const events=[];
  await generate({...context(text),task:'chat'},{stream:async()=>({text:'ok'})},{check(){}},(event,data)=>events.push([event,data]));
  assert.equal(events[0][1].text,expected);
 }
});

test('new and legacy server stages always display English interface copy',()=>{
 assert.equal(progressEventText({stage:'reading',text:'正在整理解读'}),'Interpreting your cards');
 assert.equal(progressEventText({text:'正在整理解读'}),'Interpreting your cards');
 assert.equal(progressEventText({text:'未知阶段'}),'Preparing your response');
});
