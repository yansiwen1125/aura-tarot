import {userFollowups} from '../shared/followups.js';
import {newSession,deck,readingFor,replyFor,safeReply,isVague} from '../core.js';

const unavailableCodes=new Set(['AI_UNAVAILABLE','UPSTREAM_AUTH_FAILED','UPSTREAM_ERROR','UPSTREAM_RATE_LIMITED','UPSTREAM_TIMEOUT','NETWORK_ERROR','INCOMPLETE_OUTPUT','INVALID_STREAM','SERVER_ERROR','BUDGET_EXCEEDED','BUDGET_STATE_INVALID','CALL_LIMIT']);
export function shouldUseDemo(error) {
 return error?.name!=='AbortError' && (unavailableCodes.has(error?.message) || error instanceof TypeError);
}
export function demoResponse(input,reason) {
 const s=newSession(input.topic);
 Object.assign(s,{guide:input.guideId,question:input.frozenQuestion||input.question,messages:input.messages.map(m=>({...m})),phase:input.task==='chat'?'chatting':'ready'});
 if(input.spread.length===3) {
  const ids=new Set(input.spread.map(c=>c.cardId));
  s.order=[...input.spread.map(c=>({id:c.cardId,reversed:c.reversed})),...deck.filter(c=>!ids.has(c.id)).map(c=>({id:c.id,reversed:false}))];
  s.selected=[0,1,2];s.revealed=[0,1,2];s.reading=input.reading;
 }
 const meta={mode:'demo',fallbackReason:reason};
 const prompt=input.messages.at(-1)?.text||input.question;
 const safety=safeReply(prompt);
 if(safety)return {reply:{text:safety,nextAction:'support'},meta};
 if(input.task==='reading')return {demoReading:{...readingFor(s),source:'demo',meta},meta};
 const kind=input.task==='followup'?'followup':input.task==='chat'?'chat':!input.clarificationCount && isVague(prompt)?'clarify':'ready';
 return {reply:{text:replyFor(s,kind,prompt),nextAction:kind==='clarify'?'clarify':kind==='ready'?'offer_draw':'continue_chat',...(input.task==='followup'?{followups:userFollowups([],input.messages,/[\u3400-\u9fff]/u.test(prompt),{question:input.frozenQuestion||input.question})}:{})},meta};
}
