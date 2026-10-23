import test from "node:test";
import assert from "node:assert/strict";
import {
  newSession,
  selectCard,
  revealCard,
  cardsFor,
  validateSession,
  readingFor,
  topics,
  safeReply,
  followupFor,
  chatTitle,
  guidanceFor,
  chatReply,
  historyEntry,
  readyReply,
  followupsFor,
  isVague,
} from "../core.js";
test("every topic creates a recoverable shuffled deck of 22 unique cards", () => {
  for (const t of topics) {
    const s = newSession(t.id);
    assert.equal(validateSession(s), true);
    assert.equal(new Set(s.order.map((c) => c.id)).size, 22);
    assert(s.order.every((c) => typeof c.reversed === "boolean"));
  }
});
test("selection rejects repeats, invalid positions, and a fourth card", () => {
  const s = newSession("general");
  assert.equal(selectCard(s, 1), false);
  s.phase = "drawing";
  assert.equal(selectCard(s, -1), false);
  assert.equal(selectCard(s, 1.5), false);
  assert.equal(selectCard(s, 22), false);
  assert.equal(selectCard(s, 0), true);
  assert.equal(selectCard(s, 0), false);
  assert.equal(selectCard(s, 7), true);
  assert.equal(selectCard(s, 21), true);
  assert.equal(selectCard(s, 8), false);
  assert.equal(s.phase, "selected");
  assert.equal(new Set(cardsFor(s).map((c) => c.id)).size, 3);
});
test("reveal and reload preserve the cards, orientation, and progress", () => {
  const s = newSession("love");
  s.phase = "drawing";
  [2, 6, 9].forEach((i) => selectCard(s, i));
  assert.equal(revealCard(s, 0), false);
  s.phase = "revealing";
  assert.equal(revealCard(s, 3), false);
  assert.equal(revealCard(s, 0), true);
  assert.equal(revealCard(s, 0), false);
  const copy = JSON.parse(JSON.stringify(s));
  assert(validateSession(copy));
  assert.deepEqual(cardsFor(copy), cardsFor(s));
  assert.deepEqual(copy.revealed, [0]);
  revealCard(copy, 1);
  revealCard(copy, 2);
  copy.phase = "reading";
  copy.reading = readingFor(copy);
  copy.phase = "followup";
  assert(validateSession(copy));
  const before = JSON.stringify(copy.order);
  assert(followupFor(copy, "What can I do tomorrow?").length > 0);
  assert.equal(JSON.stringify(copy.order), before);
  assert.equal(copy.reading.steps.length, 3);
  copy.reading.steps.forEach((r, i) =>
    assert(r.text.includes(cardsFor(copy)[i].name)),
  );
});
test("corrupt sessions are rejected before rendering", () => {
  assert.equal(validateSession(null), false);
  const s = newSession("career");
  s.order[1] = s.order[0];
  assert.equal(validateSession(s), false);
  const r = newSession("dream");
  r.phase = "reading";
  assert.equal(validateSession(r), false);
});
test("risk and professional decision prompts receive a grounded response", () => {
  assert(safeReply("I want to kill myself").includes("safety"));
  assert(safeReply("Should I invest in a stock?").includes("professional"));
  assert.equal(safeReply("What can I reflect on today?"), null);
});
test("chat title follows the question in English or Chinese, falling back to the topic", () => {
  const s = newSession("career");
  assert.equal(chatTitle(s), "Career");
  s.question = "I feel anxious about work";
  assert.equal(chatTitle(s), "Anxious Mind");
  s.question = "最近工作压力很大";
  assert.equal(chatTitle(s), "Anxious Mind");
  s.question = "What should I learn next?";
  assert.equal(chatTitle(s), "Career");
});
test("chat branch follows the chosen guide and keeps the deck untouched", () => {
  const s = newSession("general");
  s.question = "How to calm my anxious mind?";
  s.phase = "chatting";
  assert(validateSession(s));
  const before = JSON.stringify(s.order);
  assert(guidanceFor(s).includes("The Fool"));
  assert(guidanceFor(s).includes("**One small step:**"));
  assert(chatReply(s, "More Fool’s guidance").includes("**"));
  s.guide = "career";
  assert(guidanceFor(s).includes("The Magician"));
  s.guide = "magician";
  assert(
    guidanceFor(s).includes("The Magician"),
    "old saved sessions still map to the Magician",
  );
  assert.equal(JSON.stringify(s.order), before);
});
test("each topic answers in its own voice and suggests its own follow-ups", () => {
  const expected = {
    general: "The Fool",
    career: "The Magician",
    love: "The Lovers",
    wellness: "Temperance",
    dream: "The Moon",
  };
  const seen = new Set();
  for (const t of topics) {
    const s = newSession(t.id);
    s.question = "Something has been on my mind for a while now";
    assert(guidanceFor(s).includes(expected[t.id]));
    assert(readyReply(s).includes("draw three cards"));
    const f = followupsFor(s);
    assert.equal(f.length, 3);
    f.forEach((q) => seen.add(q));
    s.phase = "drawing";
    [0, 1, 2].forEach((i) => selectCard(s, i));
    const r = readingFor(s);
    r.steps.forEach((step, i) =>
      assert(step.text.includes(cardsFor(s)[i].name)),
    );
    assert.notEqual(
      readingFor(s, 1).steps[0].text,
      r.steps[0].text,
      "regenerating rewords the reading",
    );
  }
  assert.equal(seen.size, 15, "follow-up chips differ between topics");
  assert.equal(
    topics.find((t) => t.id === "general").card,
    0,
    "General uses The Fool",
  );
});
test("vague first questions get a clarifying reply in English or Chinese", () => {
  assert(isVague("hi"));
  assert(isVague("工作"));
  assert(!isVague("最近工作压力很大怎么办"));
  assert(!isVague("How can I handle my workload?"));
});
test('history entries show title, date and the drawn cards without "The"', () => {
  const s = newSession("love");
  s.question = "Will I meet my future lover?";
  s.createdAt = new Date(2025, 9, 9).getTime();
  let h = historyEntry(s);
  assert.equal(h.date, "2025.10.09");
  assert.deepEqual(h.tags, ["Love"]);
  s.phase = "drawing";
  [0, 1, 2].forEach((i) => selectCard(s, i));
  h = historyEntry(s);
  assert.equal(h.tags.length, 3);
  assert(h.tags.every((t) => !t.startsWith("The ")));
  assert.equal(h.cardId, cardsFor(s)[1].id);
});
test("the chat title follows the selected guide card", () => {
  const s = newSession("career");
  assert.equal(chatTitle(s), "Career");
  s.guide = "love";
  assert.equal(chatTitle(s), "Love");
  s.question = "What should I learn next?";
  assert.equal(chatTitle(s), "Love");
});

test("invalid persisted timestamps, detail indexes and regeneration counters are rejected", () => {
  for (const field of [
    { createdAt: "yesterday" },
    { createdAt: -1 },
    { detailCards: "0" },
    { detailCards: [3] },
    { readingVariant: -1 },
  ]) {
    assert.equal(
      validateSession({ ...newSession("general"), ...field }),
      false,
    );
  }
  const s = newSession("general");
  s.detailCards = [0, 2];
  s.readingVariant = 2;
  assert.equal(validateSession(s), true);
});
