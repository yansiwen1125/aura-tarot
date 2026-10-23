import {validateSession} from '../core.js';
export const SESSION_KEY='aura.session.v2', HISTORY_KEY='aura.history.v2';
export function prepare(s) {
 s.schemaVersion=2;
 s.messages.forEach(m=>{m.id ||= crypto.randomUUID();m.source ||= 'demo';});
 if(s.reading)s.reading.source ||= 'demo';
 if(s.request?.status==='pending'||s.request?.status==='streaming')s.request.status='interrupted';
 return s;
}
function decode(raw) {
 const value=JSON.parse(raw);
 if(value.schemaVersion===2 && Object.hasOwn(value,'data')) return value.data;
 throw new Error('Invalid v2 storage');
}
export function loadSaved(storage) {
 const current=storage.getItem(SESSION_KEY), history=storage.getItem(HISTORY_KEY);
 let session=current?decode(current):JSON.parse(storage.getItem('aura.session.v1')||'null');
 let archive=history?decode(history):JSON.parse(storage.getItem('aura.history.v1')||'[]');
 if(session&&!validateSession(session))throw new Error('Invalid session');
 if(!Array.isArray(archive))throw new Error('Invalid history');
 const skipped=archive.filter(s=>!validateSession(s)).length;
 archive=archive.filter(validateSession).slice(0,30).map(prepare);
 if(session)prepare(session);
 return {session,archive,skipped};
}
export function saveSaved(storage,session,archive) {
 // Preserve all v1 keys. Write archive before current; either remains independently valid.
 storage.setItem(HISTORY_KEY,JSON.stringify({schemaVersion:2,data:archive}));
 storage.setItem(SESSION_KEY,JSON.stringify({schemaVersion:2,data:session}));
}
