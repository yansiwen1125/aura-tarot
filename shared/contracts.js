export const CONSENT_VERSION = '2026-10-21';
export const positions = ['past', 'now', 'future'];
export const str = (maxLength = 2000) => ({type:'string', minLength:1, maxLength});
export const arr = (items, minItems = 0, maxItems = 10) => ({type:'array', items, minItems, maxItems});
export const obj = properties => ({type:'object', properties, required:Object.keys(properties), additionalProperties:false});
const enumeration = values => ({type:'string', enum:values});
export const factSchema = obj({facts:arr(obj({id:str(40), messageId:str(80), quote:str(1000), statement:str(1000)}),0,15), unknowns:arr(str(500),0,8), route:enumeration(['normal','support'])});
const basis = {factIds:arr(str(40),0,15), meaningIds:arr(str(80),1,3)};
export const readingSchema = obj({
 summary:str(1200), understanding:str(2000),
 cards:arr(obj({cardId:{type:'integer', minimum:0, maximum:21}, position:enumeration(positions), reversed:{type:'boolean'}, interpretation:str(2500), ...basis}),3,3),
 synthesis:obj({text:str(3000), ...basis}), uncertainties:arr(str(700),0,4),
 challenges:arr(str(1000),1,3), actions:arr(obj({step:str(1000), when:str(500), observe:str(700)}),1,3), followups:arr(str(500),3,3)
});
export const reviewSchema = obj({hardPass:{type:'boolean'}, scores:obj({fidelity:{type:'integer',minimum:0,maximum:4}, meaning:{type:'integer',minimum:0,maximum:4}, relevance:{type:'integer',minimum:0,maximum:4}, depth:{type:'integer',minimum:0,maximum:4}, action:{type:'integer',minimum:0,maximum:4}}), issues:arr(str(1200),0,12)});
export const conversationSchema = obj({text:str(6000), nextAction:enumeration(['clarify','offer_draw','continue_chat','support'])});
export function schemaErrors(value, schema, path = '$') {
 const errors = [];
 const fail = () => errors.push(`${path}: invalid ${schema.type}`);
 if (schema.type === 'object') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path}: expected object`];
  for (const k of schema.required) if (!Object.hasOwn(value,k)) errors.push(`${path}.${k}: required`);
  for (const k of Object.keys(value)) if (!Object.hasOwn(schema.properties,k)) errors.push(`${path}.${k}: unknown`);
  for (const [k,s] of Object.entries(schema.properties)) if (Object.hasOwn(value,k)) errors.push(...schemaErrors(value[k],s,`${path}.${k}`));
 } else if (schema.type === 'array') {
  if (!Array.isArray(value)) return [`${path}: expected array`];
  if (value.length < schema.minItems || value.length > schema.maxItems) fail();
  value.forEach((x,i)=>errors.push(...schemaErrors(x,schema.items,`${path}[${i}]`)));
 } else if (schema.type === 'string') {
  if (typeof value !== 'string' || value.trim().length < (schema.minLength || 0) || value.length > schema.maxLength || (schema.enum && !schema.enum.includes(value))) fail();
 } else if (schema.type === 'integer') {
  if (!Number.isInteger(value) || value < schema.minimum || value > schema.maximum) fail();
 } else if (schema.type === 'boolean' && typeof value !== 'boolean') fail();
 return errors;
}
export function validateReading(reading, spread, facts, evidence) {
 const errors = schemaErrors(reading, readingSchema);
 if (errors.length) return errors;
 const ids = new Set(facts.facts.map(f=>f.id));
 const meanings = new Set(evidence.map(e=>e.meaningId));
 reading.cards.forEach((c,i)=>{
  if (['cardId','position','reversed'].some(k=>c[k]!==spread[i][k])) errors.push(`cards[${i}]: spread mismatch`);
  if (c.meaningIds.length !== 1 || c.meaningIds[0] !== evidence[i].meaningId) errors.push(`cards[${i}]: wrong meaning`);
 });
 for (const section of [...reading.cards,reading.synthesis]) {
  if (section.factIds.some(id=>!ids.has(id))) errors.push('unknown fact reference');
  if (section.meaningIds.some(id=>!meanings.has(id))) errors.push('unknown meaning reference');
 }
 if (new Set(reading.synthesis.meaningIds).size < 2) errors.push('synthesis must connect two cards');
 return errors;
}
export function reviewPass(review) {
 if (schemaErrors(review,reviewSchema).length) return false;
 const s=review.scores;
 return review.hardPass && review.issues.length===0 && Object.values(s).every(n=>n>=3) && (s.fidelity*.30+s.meaning*.25+s.relevance*.20+s.depth*.15+s.action*.10)*25>=85;
}

export const followupReplySchema = obj({...conversationSchema.properties, followups:arr(str(160),3,3)});

// New generation contract; the broader persisted contract retains old 3-action reports.
export const focusedReadingSchema = obj({...readingSchema.properties,actions:arr(readingSchema.properties.actions.items,1,2)});
