// A small, deterministic task brief. No extra model call or invented user profile.
export function readingPlan(input,facts) {
 const question=input.frozenQuestion||input.question;
 const direction=/方向|适合.{0,8}(工作|岗位|行业)|职业选择|career direction|which (job|career)/i.test(question);
 const choice=/选择|选哪|要不要|还是|whether|choose between/i.test(question);
 return {
  userQuestion:question,
  task:direction?'direction':choice?'decision':'understanding_and_next_step',
  knownUserContext:facts.facts.map(({id,statement})=>({id,statement})),
  unknownContext:facts.unknowns.slice(0,2),
  priority:direction?'Answer what to prioritize when screening directions. If background is missing, offer at most two conditional work-environment hypotheses and explicit screening criteria; do not invent a profession or turn this into anxiety counselling.':choice?'Compare the actual alternatives and their tradeoffs under the stated constraints; do not give a generic self-improvement plan.':'Answer the exact question, connect the cards into one useful thread, then suggest the smallest relevant action.',
  structure:['direct answer','three linked reasons grounded in the actual cards and known context','one or two immediate actions'],
 };
}

export function focusedReadingErrors(reading) {
 const fields=[reading.summary,...reading.cards.map(c=>c.interpretation)];
 const errors=[];
 fields.forEach((text,i)=>{
  if(!/\*\*[^*]+\*\*/u.test(text))errors.push(`visible[${i}]: bold a short key conclusion`);
 });
 if(reading.actions.length>2)errors.push('actions: choose at most two priorities');
 const prose=[...fields,...reading.actions.map(a=>a.step)].join('');
 if(/[\u3400-\u9fff]/u.test(prose) && prose.replace(/\*/g,'').length>900)errors.push('visible answer: remove repetition and narrow the main point');
 return errors;
}
