// Conversation content follows the user; application progress defaults to English.
const controls = /^(?:我想抽三张牌[。！!]?|我想先继续聊聊[。！!]?|I want to choose tarot cards[.!]?|Choose three cards[.!]?|Keep chatting[.!]?)$/i;
export function responseLanguage(input) {
 const messages = (input.messages || []).filter(m => m.role === 'user' && m.text?.trim() && !controls.test(m.text.trim()));
 const text = messages.at(-1)?.text || input.frozenQuestion || input.question || '';
 if (/(?:用|使用)(?:英文|英语)|(?:answer|respond|reply)\s+in\s+English/i.test(text)) return 'en';
 if (/(?:用|使用)(?:中文|汉语)|(?:answer|respond|reply)\s+in\s+Chinese/i.test(text)) return 'zh';
 return /[\u3400-\u9fff]/u.test(text) ? 'zh' : 'en';
}
const progress = {
 en: {connect:'Connecting to DeepSeek', chat:'Responding to your question', understand:'Understanding your question', reply:'Preparing your response', reading:'Interpreting your cards', followup:'Exploring your follow-up', review:'Checking your reading', revise:'Refining your reading'},
 zh: {connect:'正在连接 DeepSeek', chat:'正在回应你的问题', understand:'正在理解问题', reply:'正在整理回应', reading:'正在整理解读', followup:'正在整理追问', review:'正在检查内容', revise:'正在修订解读'}
};
export function progressText(stage, input) { return progress.en[stage]; }

// Accept older running servers while keeping interface copy in English.
export function progressEventText(data) {
 if (progress.en[data.stage]) return progress.en[data.stage];
 const legacy = Object.keys(progress.zh).find(key => progress.zh[key] === data.text);
 return legacy ? progress.en[legacy] : (/^[\x00-\x7F…·’]+$/.test(data.text || '') ? data.text : 'Preparing your response');
}

// Validate visible prose only; reference IDs and quoted source facts are not output language.
export function outputLanguageErrors(value, language) {
 if (language !== 'en') return [];
 const fields=value.cards ? [value.summary,...value.cards.map(c=>c.interpretation),...(value.actions||[]).map(a=>a.step),...(value.challenges||[]),...(value.followups||[])] : [value.text,...(value.followups||[])];
 return fields.flatMap((text,i)=>{
  const prose=String(text||'').replace(/[“「「][^”」]*[”」]/g,'');
  const chinese=(prose.match(/[\u3400-\u9fff]/gu)||[]).length;
  return chinese>=8 && chinese/Math.max(1,prose.replace(/\s/g,'').length)>.2 ? [`language[${i}]: respond in English; translate the Chinese prose`] : [];
 });
}
