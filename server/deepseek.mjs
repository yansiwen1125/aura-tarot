import { events } from '../shared/sse.js';
export class ApiError extends Error {
 constructor(code, status=502) {super(code);this.code=code;this.status=status;}
}
export function createProvider(config, fetcher=fetch) {
 const url='https://api.deepseek.com/responses';
 async function request(payload, control) {
  control.reserve(Buffer.byteLength(JSON.stringify(payload))+payload.max_output_tokens);
  const response=await fetcher(url,{method:'POST',signal:control.signal,headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok) {await response.body?.cancel();throw new ApiError([401,403].includes(response.status)?'UPSTREAM_AUTH_FAILED':response.status===429?'UPSTREAM_RATE_LIMITED':'UPSTREAM_ERROR');}
  return response;
 }
 function payload(model,instructions,input) {
  return {model,instructions,input:JSON.stringify(input),max_output_tokens:config.maxOutput,reasoning:{effort:'high'}};
 }
 return {
  async json(stage,schema,instructions,input,control) {
   const model=['facts','guide'].includes(stage)?config.contextModel:stage==='review'?config.reviewModel:config.readingModel;
   const effort=stage==='revise'?'high':'none';
   const started=Date.now();
   const stageOutputCap=stage==='facts'?2000:stage==='guide'?1200:stage==='review'?2000:stage==='revise'?8000:4096;
   const response=await request({...payload(model,instructions+' Return only JSON matching the provided schema.',input),max_output_tokens:Math.min(config.maxOutput,stageOutputCap),reasoning:{effort},text:{format:{type:'json_schema',name:stage,schema}}},control);
   // Response size is capped before parsing; do not retain upstream reasoning.
   let raw='';const decoder=new TextDecoder();
   for await(const chunk of response.body) {raw+=decoder.decode(chunk,{stream:true});if(raw.length>2*1024*1024) throw new ApiError('UPSTREAM_TOO_LARGE');}
   raw+=decoder.decode();
   let value;try {value=JSON.parse(raw);}catch{throw new ApiError('INVALID_OUTPUT');}
   control.usage(value.usage);
   control.recordStage?.({stage,model,effort,durationMs:Date.now()-started});
   if(value.status!=='completed') throw new ApiError('INCOMPLETE_OUTPUT');
   const text=(value.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
   try {return JSON.parse(text);}catch{const error=new ApiError('INVALID_OUTPUT');error.details=[`${stage}: ${text.trim()?'invalid JSON':'empty text response'}`];throw error;}
  },
  async stream(instructions,input,control,onDelta) {
   const response=await request({...payload(config.contextModel,instructions,input),reasoning:{effort:'none'},stream:true},control);
   let complete=false, text='';
   for await(const event of events(response.body)) {
    let data;try{data=JSON.parse(event.data);}catch{throw new ApiError('INVALID_STREAM');}
    const type=data.type||event.event;
    if(type==='response.output_text.delta') {if(typeof data.delta!=='string')throw new ApiError('INVALID_STREAM');text+=data.delta;if(text.length>12000)throw new ApiError('OUTPUT_TOO_LARGE');onDelta(data.delta);}
    if(type==='response.completed') {complete=true;control.usage(data.response?.usage);}
    if(['response.failed','response.incomplete','error'].includes(type)) throw new ApiError('INCOMPLETE_OUTPUT');
   }
   if(!complete || !text.trim())throw new ApiError('INCOMPLETE_OUTPUT');
   return {text,nextAction:'continue_chat'};
  }
 };
}
