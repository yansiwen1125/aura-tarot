import {readingSchema,schemaErrors} from "./shared/contracts.js";
import { guides, guideFor } from "./content.js";
import {
  simulatedReply,
  simulatedReading,
  suggestedFollowups,
} from "./simulator.js";
export const topics = [
  {
    id: "general",
    name: "General",
    sub: "A little clarity, wherever you are",
    icon: "✧",
    card: 0,
    question: "What deserves my attention right now?",
  },
  {
    id: "career",
    name: "Career",
    sub: "Find your own way forward",
    icon: "☀",
    card: 1,
    question: "How can I navigate the pressure at work?",
  },
  {
    id: "love",
    name: "Love",
    sub: "Make room for what you feel",
    icon: "♡",
    card: 6,
    question: "What can I learn about my feelings in this relationship?",
  },
  {
    id: "wellness",
    name: "Wellness",
    sub: "Come back to yourself",
    icon: "❋",
    card: 14,
    question: "How can I take better care of my energy?",
  },
  {
    id: "dream",
    name: "Dream",
    sub: "Listen to your inner world",
    icon: "☾",
    card: 18,
    question: "What feelings might my recurring dream be reflecting?",
  },
];
export { deck } from "./shared/tarot-catalog.js";
import { deck } from "./shared/tarot-catalog.js";
export function random() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0] / 4294967296;
}
export function newSession(topic) {
  const order = deck.map((c) => ({ id: c.id, reversed: random() < 0.5 }));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    version: 1,
    id: crypto.randomUUID(),
    topic,
    phase: "question",
    question: "",
    draft: "",
    messages: [],
    order,
    selected: [],
    revealed: [],
    reading: null,
    challengeOpen: false,
    createdAt: Date.now(),
  };
}
export function selectCard(s, index) {
  if (
    s.phase !== "drawing" ||
    s.selected.length >= 3 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 22 ||
    s.selected.includes(index)
  )
    return false;
  s.selected.push(index);
  if (s.selected.length === 3) s.phase = "selected";
  return true;
}
export function revealCard(s, index) {
  if (
    s.phase !== "revealing" ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 3 ||
    s.revealed.includes(index)
  )
    return false;
  s.revealed.push(index);
  return true;
}
export function cardsFor(s) {
  return s.selected.map((i) => ({
    ...deck[s.order[i].id],
    reversed: s.order[i].reversed,
  }));
}
export function validateSession(s) {
  const phases = [
    "question",
    "guiding",
    "ready",
    "chatting",
    "drawing",
    "selected",
    "revealing",
    "loading",
    "reading",
    "followup",
  ];
  if (
    !s ||
    s.version !== 1 ||
    !topics.some((t) => t.id === s.topic) ||
    !phases.includes(s.phase)
  )
    return false;
  if (
    typeof s.id !== "string" ||
    typeof s.question !== "string" ||
    s.question.length > 500 ||
    typeof s.draft !== "string"
  )
    return false;
  if (!Number.isFinite(s.createdAt) || s.createdAt < 0) return false;
  if (
    s.detailCards !== undefined &&
    (!Array.isArray(s.detailCards) ||
      !s.detailCards.every((i) => Number.isInteger(i) && i >= 0 && i < 3))
  )
    return false;
  if (
    s.readingVariant !== undefined &&
    (!Number.isInteger(s.readingVariant) || s.readingVariant < 0)
  )
    return false;
  if (
    !Array.isArray(s.messages) ||
    !s.messages.every(
      (m) =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.text === "string",
    )
  )
    return false;
  if (
    !Array.isArray(s.order) ||
    s.order.length !== 22 ||
    !s.order.every(
      (c) =>
        c &&
        Number.isInteger(c.id) &&
        c.id >= 0 &&
        c.id < 22 &&
        typeof c.reversed === "boolean",
    )
  )
    return false;
  if (new Set(s.order.map((c) => c.id)).size !== 22) return false;
  if (
    !Array.isArray(s.selected) ||
    s.selected.length > 3 ||
    new Set(s.selected).size !== s.selected.length ||
    !s.selected.every((i) => Number.isInteger(i) && i >= 0 && i < 22)
  )
    return false;
  if (
    !Array.isArray(s.revealed) ||
    new Set(s.revealed).size !== s.revealed.length ||
    !s.revealed.every(
      (i) => Number.isInteger(i) && i >= 0 && i < s.selected.length,
    )
  )
    return false;
  if (
    ["selected", "revealing", "loading", "reading", "followup"].includes(
      s.phase,
    ) &&
    s.selected.length !== 3
  )
    return false;
  if (["reading", "followup"].includes(s.phase) && s.revealed.length !== 3)
    return false;
  if (
    s.reading &&
    (typeof s.reading.intro !== "string" ||
      typeof s.reading.challenge !== "string" ||
      typeof s.reading.action !== "string" ||
      !Array.isArray(s.reading.steps) ||
      s.reading.steps.length !== 3 ||
      !s.reading.steps.every(
        (r) => r && typeof r.title === "string" && typeof r.text === "string",
      ))
  )
    return false;
  if (s.reading?.detail && schemaErrors(s.reading.detail, readingSchema).length) return false;
  return s.phase !== "followup" || !!s.reading;
}
const titleRules = [
  [/anxi|worr|stress|panic|calm|焦虑|担心|压力|紧张/i, "Anxious Mind"],
  [
    /love|relationship|partner|crush|breakup|感情|恋爱|关系|分手|喜欢/i,
    "Matters of the Heart",
  ],
  [/job|work|career|boss|interview|工作|职业|事业|面试|老板/i, "Work & Path"],
  [/sleep|tired|health|energy|rest|睡眠|疲惫|健康|休息/i, "Gentle Energy"],
  [/dream|nightmare|梦/i, "Inner Dreams"],
];
export function chatTitle(s) {
  const t = topics.find((t) => t.id === guideIdFor(s));
  if (!s.question) return t.name;
  return titleRules.find(([re]) => re.test(s.question))?.[1] || t.name;
}
export function historyEntry(s) {
  const cards = s.selected.length === 3 ? cardsFor(s) : [];
  const d = new Date(s.createdAt);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    id: s.id,
    title: chatTitle(s),
    date: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`,
    tags: cards.length
      ? cards.map((c) => c.name.replace(/^The /, ""))
      : [topics.find((t) => t.id === s.topic).name],
    cardId: cards.length
      ? cards[1].id
      : topics.find((t) => t.id === s.topic).card,
  };
}
export function safeReply(q) {
  if (
    /suicid|kill myself|self.harm|end my life|自杀|自残|不想活/.test(
      q.toLowerCase(),
    )
  )
    return /[\u4e00-\u9fff]/.test(q)
      ? "你的安全比抽牌更重要。如果你现在可能伤害自己或他人，请立即联系当地紧急服务，或者让一位信任的人陪在你身边。我们先暂停抽牌，关注眼下能获得的支持。"
      : "Your safety matters more than a reading. If you might hurt yourself or someone else, contact local emergency services or a trusted person who can stay with you now. We can pause the cards and focus on finding support.";
  if (
    /diagnos|medication|cancer|invest|stock|lawsuit|诊断|药物|投资|股票|诉讼/.test(
      q.toLowerCase(),
    )
  )
    return /[\u4e00-\u9fff]/.test(q)
      ? "牌不能代替医疗诊断，也不适合替你作法律或投资决定。具体判断需要有资质的专业人士。我们可以先整理你的担忧，以及你想向对方确认的问题。"
      : "Cards cannot diagnose a condition or decide a medical, legal, or financial question. A qualified professional can help with those decisions. We can use this space to name your feelings and prepare questions to ask them.";
  return null;
}

// ---- Replies: everything below speaks in the voice of the session's guide (defaults to the chosen topic) ----
export const guideIdFor = (s) =>
  guides[s.guide] ? s.guide : s.guide === "magician" ? "career" : s.topic;
export const guideName = (s) => guideFor(guideIdFor(s)).short;
const simulatorCards = (s) =>
  cardsFor(s).map((c) => ({ ...c, reversedMeaning: deck[c.id].reversed }));
export function followupsFor(s) {
  return suggestedFollowups(s);
}
export function guidanceFor(s, variant = 0) {
  return simulatedReply(s, "", "guidance", variant);
}
export function chatReply(s, q, variant = 0) {
  return simulatedReply(s, q, "chat", variant);
}
export function isVague(q) {
  const latin = (q.match(/[A-Za-z]+/g) || []).length,
    cjk = (q.match(/[\u4e00-\u9fff]/g) || []).length;
  return latin < 4 && cjk < 6;
}
export function readyReply(s, variant = 0) {
  return simulatedReply(s, s.question, "ready", variant);
}
export function clarifyReply(s) {
  return simulatedReply(s, s.question, "clarify");
}
export function readingFor(s, variant = 0) {
  return simulatedReading(s, simulatorCards(s), variant);
}
export function followupFor(s, q, variant = 0) {
  return simulatedReply(s, q, "followup", variant, simulatorCards(s));
}
export function replyFor(s, kind, prompt, variant = 0) {
  if (!["ready", "clarify", "guidance", "chat", "followup"].includes(kind))
    return null;
  return simulatedReply(
    s,
    prompt,
    kind,
    variant,
    s.selected.length === 3 ? simulatorCards(s) : [],
  );
}
