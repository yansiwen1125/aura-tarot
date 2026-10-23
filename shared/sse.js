// Incremental UTF-8/SSE parser shared by the upstream adapter and browser.
export async function* events(body) {
 const reader=body.getReader(), decoder=new TextDecoder();
 let buffer='';
 try {
  while(true) {
   const {value,done}=await reader.read();
   buffer+=decoder.decode(value,{stream:!done});
   buffer=buffer.replace(/\r\n/g,'\n');
   let end;
   while((end=buffer.indexOf('\n\n'))>=0) {
    const frame=buffer.slice(0,end); buffer=buffer.slice(end+2);
    const lines=frame.split('\n');
    const data=lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
    if (data) yield {event:lines.find(l=>l.startsWith('event:'))?.slice(6).trim()||'message', data};
   }
   if (buffer.length>1024*1024) throw new Error('STREAM_TOO_LARGE');
   if(done) break;
  }
 } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
