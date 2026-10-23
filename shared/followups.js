// Suggestions are messages the USER can send to Aura, not interview questions.
export function isUserFollowup(text) {
 if(typeof text!=='string'||!text.trim()||text.length>160)return false;
 const value=text.trim();
 const limit=/[\u3400-\u9fff]/u.test(value)?30:60;
 if(value.length>limit || /…|\.\.\./u.test(value))return false;
 if(/[你您]/u.test(value) && !/[你您](?:能|可以|觉得|认为|建议|刚才|提到|说的|会如何|会怎样|是怎么)/u.test(value))return false;
 return !/^(?:请问[，,\s]*)?(?:你|您)(?:目前|现在|最近|是否|是|有|的|想|在|过去|通常|希望|已经|能否提供)/u.test(value)
  && !/^(?:目前|现在|最近).*(?:学生|在职|待业|转行|背景|工作是什么)/u.test(value)
  && !/^(?:what (?:is|are|was|were) your|are you|do you|did you|have you|tell me (?:about|your)|could you (?:tell|share|describe)|can you (?:tell|share|describe))/i.test(value);
}
const normalize=text=>text.toLowerCase().replace(/[\s\p{P}]/gu,'');
export function userFollowups(generated,messages=[],zh=true,context={}) {
 const asked=new Set(messages.filter(m=>m.role==='user').map(m=>normalize(m.text||'')));
 const seen=new Set();
 const choices=[];
 const topicText=[context.question||'',...messages.filter(m=>m.role==='user').slice(-3).map(m=>m.text)].join(' ');
 let relevant=[];
 if(zh) {
  if(/求职|找(?:到)?工作|面试|简历|job search|job hunt/i.test(topicText))relevant=['我现在应该优先准备什么？','我的求职方向该怎么选？','如果投递一直没有回应，我可以怎么调整？'];
  else if(/需求|经理|工作压力|工作安排|manager|workload/i.test(topicText))relevant=['临时需求又变了，我该怎么和经理沟通？','我该如何确认任务的优先级？','我可以怎么减少工作中的自责和压力？'];
  else if(/关系|伴侣|感情|恋爱/i.test(topicText))relevant=['我该怎么表达自己在这段关系中的需要？','我可以留意哪些信号，再决定下一步？','如果沟通没有进展，我该怎么调整？'];
 }
 const defaults=zh?[...relevant,
  '我现在最值得先做的一件事是什么？',
  '我应该重点留意哪些现实信号？',
  '如果暂时没有进展，我可以怎么调整？',
  '可以帮我把下一步拆成更小的行动吗？',
  '我该如何判断这个方向是否适合自己？',
 ]:[
  'What should I focus on first in my situation?',
  'What practical signs should I pay attention to?',
  'How can I adjust if I do not see progress?',
  'Can you help me break my next step into smaller actions?',
  'How can I tell whether this direction is right for me?',
 ];
 for(const text of [...(Array.isArray(generated)?generated:[]),...defaults]) {
  if(!isUserFollowup(text))continue;
  const key=normalize(text);
  if(asked.has(key)||seen.has(key))continue;
  seen.add(key);choices.push(text.trim());if(choices.length===3)break;
 }
 // In a long conversation it is better to offer fewer useful choices than repeat.
 return choices;
}
