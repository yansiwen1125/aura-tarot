import {events} from '../shared/sse.js';
export async function generateRequest(input,signal,onEvent,fetcher=fetch) {
 const response=await fetcher('/api/generations',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify(input)});
 if(!response.ok){let code='NETWORK_ERROR';try{code=(await response.json()).error.code;}catch{}throw new Error(code);}
 let result, seq=0;
 if(!response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('INVALID_STREAM');
 for await(const event of events(response.body)) {
  const data=JSON.parse(event.data);
  if(event.event==='error'){const error=new Error(data.error?.code||'UPSTREAM_ERROR');error.details=data.error?.details;throw error;}
  if(data.requestId!==input.requestId)throw new Error('REQUEST_MISMATCH');
  if(!Number.isInteger(data.seq)||data.seq<=seq)throw new Error('INVALID_SEQUENCE');seq=data.seq;
  if(event.event==='done') {result=data.result;break;}
  onEvent(event.event,data);
 }
 if(!result)throw new Error('INCOMPLETE_OUTPUT');
 return result;
}
export function cleanReportText(text, meta) {
 let result=text;
 for(const fact of meta?.grounding?.facts||[])result=result.split(`（${fact.id}）`).join('').split(`(${fact.id})`).join('');
 for(const meaning of meta?.grounding?.meanings||[]) {
  result=result.split(`（${meaning.meaningId}）`).join('').split(`(${meaning.meaningId})`).join('');
  const quoted=meaning.meaning.replace(/[.]$/, '');
  result=result.split(`含义是：${quoted}`).join('').split(`含义是：${meaning.meaning}`).join('');
 }
 return result.replace(/。{2,}/g,'。').replace(/^[。\s]+|[\s]+$/g,'');
}
export function reportToLegacy(r,meta) {
 // Presentation cleanup only: retain the original reviewed report and reference arrays.
 const clean=value=>typeof value==='string'?cleanReportText(value,meta):Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,['factIds','meaningIds'].includes(k)?v:clean(v)])):value;
 const original=r;r=clean(r);
 return {intro:r.summary,steps:r.cards.map(c=>({title:c.position,text:c.interpretation})),action:r.actions.map(a=>`${a.step}\n${a.when}\n${a.observe}`).join('\n\n'),challenge:r.challenges.join('\n\n'),detail:r,originalReport:original,source:'ai',meta};
}
