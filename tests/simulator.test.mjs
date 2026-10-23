import test from "node:test";
import assert from "node:assert/strict";
import {
  newSession,
  replyFor,
  selectCard,
  readingFor,
  cardsFor,
  followupsFor,
  safeReply,
} from "../core.js";
import { conversationContext, cardDescription } from "../simulator.js";
function say(s, text, kind = "chat") {
  s.messages.push({ role: "user", text, afterReading: !!s.reading });
  if (!s.question) s.question = text;
  const answer = replyFor(s, kind, text);
  s.messages.push({ role: "assistant", text: answer });
  return answer;
}
function draw(s) {
  s.phase = "drawing";
  [0, 1, 2].forEach((i) => selectCard(s, i));
  s.revealed = [0, 1, 2];
  s.reading = readingFor(s);
  s.phase = "followup";
}
test("Chinese concrete details and time are remembered across follow-up questions", () => {
  const s = newSession("career");
  say(s, "我最近在找工作，投了很多简历都没有回复，很焦虑", "ready");
  const answer = say(s, "已经三个月了，我觉得是不是自己能力不够");
  assert.match(answer, /三个月/);
  assert.match(answer, /怀疑自己/);
  assert.doesNotMatch(answer, /谢谢你纠正/);
  const memory = say(s, "你记得我前面说过什么吗？");
  assert.match(memory, /简历/);
  assert.match(memory, /三个月/);
  assert.doesNotMatch(memory, /记得我前面/);
  assert.deepEqual(
    conversationContext(JSON.parse(JSON.stringify(s))).facts,
    conversationContext(s).facts,
  );
});
test("action plans match the actual situation rather than only the chosen guide", () => {
  const s = newSession("general");
  say(s, "我投递了很多简历但是没有回复");
  const a = say(s, "具体怎么做？");
  assert.match(a, /1\./);
  assert.match(a, /2\./);
  assert.match(a, /3\./);
  assert.match(a, /申请|岗位|职位/);
  const l = newSession("love");
  say(l, "他最近不回复我的消息，越来越冷淡");
  const b = say(l, "给我一个具体的计划");
  assert.match(b, /猜测|观察|回复/);
  assert.doesNotMatch(b, /简历/);
  assert.notEqual(a, b);
});
test("greetings, corrections and topic changes do not invent user facts", () => {
  const s = newSession("dream");
  assert.match(say(s, "你好"), /你好/);
  assert.equal(conversationContext(s).facts.length, 0);
  say(s, "最近总做噩梦");
  const a = say(s, "不是梦的问题，而是我在找工作，投了很多简历");
  assert.match(a, /纠正/);
  assert.equal(conversationContext(s).situation.id, "jobsearch");
  assert.doesNotMatch(conversationContext(s).quote, /梦的问题/);
});
test("simplification and uncertainty prompts use distinct responses", () => {
  const s = newSession("career");
  say(s, "我最近在找工作");
  assert.match(say(s, "什么时候一定能找到工作？"), /没法确定/);
  assert.match(say(s, "简单一点，一句话"), /^简单说/);
  assert.match(say(s, "你是真实的AI吗？"), /没有连接真实/);
});
test("English questions stay English and a short Chinese command does not erase earlier context", () => {
  const s = newSession("career");
  say(s, "I am looking for a job and getting no replies");
  assert.equal(conversationContext(s).lang, "en");
  assert.match(say(s, "What should I do next?"), /application|role/);
  const z = newSession("love");
  say(z, "最近对方越来越冷淡，不回我的消息");
  draw(z);
  assert.equal(
    conversationContext(z, "Can you explain the Now card?").lang,
    "zh",
  );
  assert.match(
    replyFor(z, "followup", "Can you explain the Now card?"),
    /换一种说法/,
  );
  assert.equal(
    conversationContext(z, "What’s my next career move?").lang,
    "zh",
  );
  const chineseMeaning = replyFor(z, "followup", "现在位的牌具体是什么意思？");
  assert.match(chineseMeaning, /换一种说法/);
  assert.doesNotMatch(chineseMeaning, /拆成接下来能做的三步/);
});
test("readings and card-specific follow-ups preserve chosen cards and orientation", () => {
  const s = newSession("career");
  say(s, "How can I improve my job search?");
  draw(s);
  const before = JSON.stringify(s.order);
  const cards = cardsFor(s);
  s.reading.steps.forEach((step, i) =>
    assert.match(step.text, new RegExp(cards[i].name)),
  );
  assert.match(s.reading.intro, /job search/);
  const q = `Can you explain ${cards[0].name}?`;
  assert.match(replyFor(s, "followup", q), new RegExp(cards[0].name));
  assert.equal(JSON.stringify(s.order), before);
  assert.notEqual(readingFor(s, 1).steps[0].text, s.reading.steps[0].text);
});
test("reading regeneration keeps the original question when a later message changes topic", () => {
  const s = newSession("career");
  say(s, "我在找工作，面试一直没有结果");
  draw(s);
  say(s, "我现在想聊分手后是否复合", "followup");
  assert.equal(conversationContext(s).situation.id, "breakup");
  assert.match(readingFor(s, 1).intro, /求职/);
});
test("suggested prompts remain in the conversation language and safety overrides stay available", () => {
  const s = newSession("wellness");
  say(s, "我最近很累，睡不着");
  draw(s);
  assert(followupsFor(s).every((x) => /[\u4e00-\u9fff]/.test(x)));
  assert.match(safeReply("我不想活了"), /安全/);
  assert.match(safeReply("帮我诊断一下"), /专业/);
  assert.match(
    cardDescription({ id: 18, reversed: true }, true),
    /月亮（逆位）/,
  );
});
