import { progressText, progressEventText } from "./shared/language.js";
import { userFollowups } from "./shared/followups.js";
import { demoResponse, shouldUseDemo } from "./client/demo-fallback.js";
import { loadSaved, saveSaved, prepare } from "./client/storage.js";
import { generateRequest, reportToLegacy } from "./client/ai-client.js";
import { CONSENT_VERSION, readingSchema, schemaErrors } from "./shared/contracts.js";
const aiMode = "ai";
let aiConsent = null, activeAI = null;
try { aiConsent=localStorage.getItem('aura.consent.v2'); } catch {}
import {
  topics,
  deck,
  newSession,
  selectCard,
  cardsFor,
  validateSession,
  readingFor,
  safeReply,
  chatTitle,
  guideName,
  guidanceFor,
  historyEntry,
  guideIdFor,
  followupsFor,
  replyFor,
  isVague,
} from "./core.js";
import { guides, guideFor, possessive } from "./content.js";
import { conversationContext, cardDescription } from "./simulator.js";
const $ = (s) => document.querySelector(s),
  app = $("#app");
function fitScreen() {
  document.documentElement.style.setProperty(
    "--screen-scale",
    String(Math.min(1, innerWidth / 393, innerHeight / 852)),
  );
}
fitScreen();
window.addEventListener("resize", fitScreen);

let archive = [],
  returnView = "home";
let deckShift = 0,
  suppressFanClickUntil = 0,
  loadingProgress = 0;
let busyLabel = "",
  session = null,
  view = "home",
  busy = false,
  error = "",
  storageNotice = "",
  timer = null,
  loadingInterval = null,
  retryTask = null;
let regenerationTimer = null;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function fanPose(index, shift = deckShift) {
  const radius = 360,
    theta = (index - 10.5) * 5.5 + shift / 7;
  const radians = (theta * Math.PI) / 180;
  const x = radius * Math.sin(radians),
    k = Math.min(1, (x / 464) ** 2);
  return `--fan-x:${x.toFixed(2)}px;--fan-y:${(265 * (1 - Math.sqrt(1 - k))).toFixed(2)}px;--fan-angle:${(theta * 0.82).toFixed(2)}deg;--fan-layer:${index};--lift:0px`;
}
function layoutFan() {
  document
    .querySelectorAll(".fan-card")
    .forEach((card, i) => card.setAttribute("style", fanPose(i)));
}
try {
 const saved=loadSaved(localStorage); session=saved.session; archive=saved.archive;
 if(saved.skipped)storageNotice=`${saved.skipped} damaged history records were skipped; original data retained.`;
 if(session) view=["drawing","selected","revealing"].includes(session.phase)?"draw":"chat";
} catch {storageNotice="Saved records could not be restored. Original v1 data is retained.";}
function save() {
 try {saveSaved(localStorage,session,archive);} catch {storageNotice="Local storage unavailable; keep this tab open to preserve progress.";}
}
function announce(text) {
  $("#announcer").textContent = text;
}
const icon = (name) => {
  const asset = {
    topicRight: "topic-right",
    arrow: "right",
    back: "back",
    share: "share",
    shuffle: "shuffle",
    send: "send",
    thumbup: "thumbup",
    thumbdown: "thumbdown",
    copy: "copy",
    refresh: "refresh",
    spark: "spark",
    chevron: "chevron",
    right: "right",
  }[name];
  if (!asset) throw new Error(`Missing original Figma icon: ${name}`);
  return `<img class="ui-icon" src="assets/icons/${asset}.svg" alt="" aria-hidden="true">`;
};
// Use the current, corrected artwork from the local tarot material library.
function cardArt(id, back = false, subject = false) {
  const card = deck[id] || deck[17];
  const number = String(card.id).padStart(2, "0");
  const source = `assets/tarot/${back ? "back" : subject ? "subject-" + number : number}.png`;
  return `<img class="tarot-art ${subject ? "tarot-subject" : ""}" src="${source}${back ? "?v=figma-2061-32119" : ""}" alt="${back ? "" : esc(card.name)}" ${back ? 'aria-hidden="true"' : ""} draggable="false">`;
}
function avatarArt(id) {
  return `<img class="avatar-art" src="assets/tarot/avatars/${String(id).padStart(2, "0")}.png" alt="${esc(deck[id].name)}" draggable="false">`;
}
const primary = (label, action, disabled = false) =>
  `<button class="primary" data-action="${action}" ${disabled ? "disabled" : ""}>${label}${icon("arrow")}</button>`;
function statusBar() {
  return '<div class="status-bar figma-status" aria-hidden="true"><img src="assets/icons/status.svg" alt=""></div>';
}
function homeIndicator() {
  return '<div class="home-indicator" aria-hidden="true"><span></span></div>';
}
function header(title) {
  return `<header class="app-header">${view === "loading" ? '<span class="header-spacer" aria-hidden="true"></span>' : `<button class="icon-button" data-action="back" aria-label="${view === "draw" ? "Back to conversation" : returnView === "history" ? "Back to history" : "Back to home"}">${icon("back")}</button>`}<h2>${esc(title)}</h2><span class="header-spacer" aria-hidden="true"></span></header>`;
}
function bottomNav(active) {
  return `<nav class="bottom-nav figma-nav" aria-label="Main navigation"><img class="figma-nav-art" src="assets/v5/${active === "history" ? "navigation-history" : "navigation"}.svg" alt="" aria-hidden="true"><button data-action="home" aria-label="Home" ${active === "home" ? 'aria-current="page"' : ""}><span class="sr-only">Home</span></button><button disabled aria-label="Today, coming later"><span class="sr-only">Today</span></button><button data-action="${session ? "resume" : "general"}" aria-label="${session ? "Continue your reading" : "Start a general reading"}"><span class="sr-only">Chat</span></button><button disabled aria-label="Heal, coming later"><span class="sr-only">Heal</span></button><button data-action="history" aria-label="History" ${active === "history" ? 'aria-current="page"' : ""}><span class="sr-only">History</span></button></nav>`;
}
const chevronRight =
  '<svg class="history-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="#D1D1D1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function historySessions() {
  return [...(session?.messages.length ? [session] : []), ...archive].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}
function historyView() {
  const items = historySessions().map(historyEntry);
  return `<div class="history-screen"><h1 class="history-title">History</h1>${items.length ? `<ol class="history-list">${items.map((h) => `<li class="history-item"><span class="history-dot" aria-hidden="true"></span><button class="history-card" data-action="open-history" data-id="${esc(h.id)}"><span class="history-text"><span class="history-head"><strong>${esc(h.title)}</strong><time>${h.date}</time></span><span class="history-tags">${h.tags.map((t) => `<span><b>${esc(t)}</b></span>`).join("")}</span></span><span class="history-art">${cardArt(h.cardId)}</span>${chevronRight}</button></li>`).join("")}</ol>` : `<p class="history-empty">Your readings will appear here.</p>`}${bottomNav("history")}</div>`;
}
function home() {
  return `<div class="home-screen"><section class="home-intro"><p>Hello, Sally!</p><h1>What guidance<br>to get today?</h1></section><section class="topics" aria-label="Choose a topic">${topics.map((t) => `<button class="topic" data-action="topic" data-id="${t.id}"><span class="topic-picture">${avatarArt(t.card)}</span><span class="topic-name">${t.name}</span>${icon("topicRight")}</button>`).join("")}</section>${bottomNav("home")}</div>`;
}
function guideCards() {
  const current = guideIdFor(session);
  const order = [
    session.topic,
    ...topics.map((t) => t.id).filter((id) => id !== session.topic),
  ];
  return `<div class="guide-cards">${order
    .map((id) => {
      const g = guideFor(id);
      return `<button class="guide-card ${current === id ? "selected" : ""}" data-action="guide" data-guide="${id}" aria-pressed="${current === id}"><span>${esc(g.label)}</span><div><div class="guide-figure">${cardArt(g.card, false, true)}</div><p>${esc(g.blurb)}</p></div></button>`;
    })
    .join("")}</div>`;
}
let regenKey = null,
  toastTimer = null;
const actionIcon = (name, label, attrs) =>
  `<button type="button" class="action-button" aria-label="${label}" ${attrs}><span class="action-icon" style="--icon:url('assets/icons/${name}.svg')" aria-hidden="true"></span></button>`;
function latestReplyKey() {
  if (busy || streaming) return null;
  const post = session.messages
    .map((m, i) => [m, i])
    .filter(([m]) => m.role === "assistant");
  const lastPost = post.filter(([m]) => m.afterReading).at(-1);
  if (lastPost) return String(lastPost[1]);
  if (session.reading) return "reading";
  return post.length ? String(post.at(-1)[1]) : null;
}
function messageActions(key, feedback) {
  if (String(key) !== latestReplyKey()) return "";
  const busyNow = busy || streaming || regenKey !== null;
  return `<div class="message-actions">${actionIcon("thumbup", "Good response", `data-action="feedback" data-key="${key}" data-value="up" aria-pressed="${feedback === "up"}"`)}${actionIcon("thumbdown", "Bad response", `data-action="feedback" data-key="${key}" data-value="down" aria-pressed="${feedback === "down"}"`)}${actionIcon("copy", "Copy", `data-action="copy" data-key="${key}"`)}${actionIcon("refresh", "Regenerate", `data-action="regen" data-key="${key}" ${busyNow ? "disabled" : ""}`)}</div>`;
}
const thinkingBubble = (label) =>
  `<div class="bubble thinking">${label}<i></i><i></i><i></i></div>`;
function plainText(key) {
  if (key === "reading") {
    const r = session.reading;
    return [
      "Interpretation",
      ...[...r.steps.map((s) => s.text), r.action].map(
        (t, i) => `${i + 1}. ${t}`,
      ),
    ].join("\n");
  }
  return session.messages[Number(key)].text.replace(/\*\*(.+?)\*\*/g, "$1");
}
function toast(text, duration = 1600) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  $(".app-surface").append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), duration);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.cssText = "position:fixed;opacity:0";
    document.body.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    t.remove();
    return ok;
  }
}
function keepScroll(fn) {
  const top = $("#chat-scroll")?.scrollTop;
  fn();
  const el = $("#chat-scroll");
  if (el && top != null) el.scrollTop = top;
}
function message(m) {
  const idx = session.messages.indexOf(m);
  return `<div class="message ${m.role}" lang="${/[\u3400-\u9fff]/.test(m.text) ? "zh-CN" : "en"}">${m.role === "assistant" ? `<span class="avatar">${avatarArt(guideFor(guideIdFor(session)).card)}</span>` : ""}<div class="message-content">${regenKey === String(idx) ? thinkingBubble("Thinking") : `<div class="bubble ${streaming?.idx === idx ? "is-streaming" : ""}" data-msg="${idx}">${formatText(streaming?.idx === idx ? streaming.text : m.text)}${messageSource(m)}</div>`}${m.role === "assistant" ? messageActions(idx, m.feedback) : `<div class="message-time">${new Date(m.timestamp || session.createdAt).toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false }).replaceAll("-", ".").slice(0, 16)}</div>`}</div></div>`;
}
function cardRow() {
  return `<div class="result-cards">${cardsFor(session)
    .map((c, i) => {
      const open = (session.detailCards || []).includes(i);
      return `<figure><button class="result-art ${open ? "detail-open" : ""}" data-action="card-detail" data-index="${i}" aria-label="${esc(c.name)}, ${c.reversed ? "reversed" : "upright"}, ${open ? "show card" : "show meaning"}"><div class="result-flip"><div class="result-front ${c.reversed ? "reversed" : ""}">${cardArt(c.id)}</div><div class="card-detail-face" aria-hidden="${!open}"><strong>${esc(c.name)} (${c.reversed ? "Reversed" : "Upright"})</strong><p>${esc(
        conversationContext(session).zh
          ? cardDescription(
              { ...c, reversedMeaning: deck[c.id].reversed },
              true,
            )
              .split("：")
              .slice(1)
              .join("：")
          : c.reversed
            ? deck[c.id].reversed
            : c.upright,
      )}</p></div></div></button><figcaption>${["Past", "Now", "Future"][i]}</figcaption></figure>`;
    })
    .join("")}</div>`;
}
function reading() {
  const r = session.reading;
  return `<section class="reading-block"><h3>Cards</h3>${cardRow()}${readingNotice(r)}${r ? `<h3 class="interpretation-heading">Summary${session.readingInput?'<button class="reinterpret-button" data-action="reinterpret" aria-label="Read again"'+(busy?' disabled':'')+'>Read again</button>':''}</h3><p class="reading-intro">${formatText(r.intro)}</p>${regenKey === "reading" ? thinkingBubble("Interpreting your cards") : `<div class="interpretation">${r.steps.map((step,i)=>`<div class="reading-reason"><span class="step-number">${i+1}</span><div class="reading-reason-body"><h4>${esc(readingStepHeading(i))}</h4><p>${formatText(step.text)}</p></div></div>`).join('')}</div>`}${readingActions(r)}${messageActions("reading", session.readingFeedback)}<button class="accordion" data-action="challenge" aria-expanded="${session.challengeOpen}">Challenging Aspects<span class="${session.challengeOpen ? "rotated" : ""}">${icon("chevron")}</span></button>${session.challengeOpen ? `<div class="challenge-text"><span>1</span><p>${formatText(r.challenge)}</p></div>` : ""}` : ""}</section>`;
}
function composer() {
  const sendControl = streaming || activeAI
    ? stopControl('composer-stop')
    : `<button aria-label="Send question" type="submit" ${busy || regenKey !== null || !session.draft.trim() || session.draft.trim().length > 500 ? "disabled" : ""}><img class="send-button-art" src="assets/icons/send-button.svg" alt="" aria-hidden="true"></button>`;
  const started = session.messages.length > 0;
  return `<div class="composer-wrap"><form id="question-form"><label class="sr-only" for="question">${session.reading ? "Ask a follow-up question" : "Your question"}</label><div class="composer"><textarea id="question" rows="1" placeholder="${started ? "Continue asking..." : "Ask me anything"}" ${busy ? "disabled" : ""}>${esc(session.draft)}</textarea>${sendControl}</div><div class="composer-meta"><span>AI can make mistakes, so double-check its responses</span><span id="count" class="${session.draft.length > 500 ? "over-limit" : ""}" ${session.draft.length <= 500 ? "hidden" : ""}>${session.draft.length}/500</span></div><span class="sr-only">${aiMode === "ai" ? "Connected DeepSeek AI; necessary context is sent to the provider." : "Local demo; no connected AI."}</span></form></div>`;
}
function chat() {
  const zh = conversationContext(session).zh;
  const pre = session.messages.filter((m) => !m.afterReading),
    post = session.messages.filter((m) => m.afterReading);
  const canDraw =
    ["ready", "guiding"].includes(session.phase) && !busy && !streaming;
  return `<div class="chat-screen ${!session.messages.length ? "empty-chat" : ""}">${header(chatTitle(session))}<div class="scroll-content" id="chat-scroll">${!session.messages.length ? guideCards() : ""}${pre.map(message).join("")}${canDraw ? `<div class="draw-invite"><button data-action="draw">${"Choose three cards"} ${icon("right")}</button><button data-action="keep-chat">${"Keep chatting"} ${icon("right")}</button></div>` : ""}${session.phase === "chatting" && !busy && !streaming ? `<div class="draw-invite"><button data-action="draw">${"I want to choose tarot cards"} ${icon("right")}</button><button data-action="followup" data-question="More ${possessive(guideName(session))} guidance">More ${possessive(guideName(session))} guidance ${icon("right")}</button><button data-action="followup" data-question="Clarify ${possessive(guideName(session))} advice">Clarify ${possessive(guideName(session))} advice ${icon("right")}</button></div>` : ""}${["drawing", "selected", "revealing"].includes(session.phase) && !busy ? `<div class="draw-invite"><button data-action="draw">Continue choosing your cards ${icon("right")}</button></div>` : ""}${["reading", "followup"].includes(session.phase) ? reading() : ""}${post.map(message).join("")}${busy ? `<div class="message assistant"><span class="avatar">${avatarArt(guideFor(guideIdFor(session)).card)}</span><div class="bubble thinking">${esc(busyLabel || (session.phase === "reading" ? "Interpreting your cards" : "Thinking"))}<i></i><i></i><i></i></div></div>` : ""}${error ? `<div class="error" role="alert">${esc(error)}<button data-action="retry">Try again ${icon("refresh")}</button></div>` : ""}${session.phase === "reading" && !busy && !session.reading && !error ? `<div class="draw-invite">${primary("Generate your interpretation", "interpret")}</div>` : ""}${
    session.reading && !busy && !streaming
      ? `<div class="followups ${post.some((m) => m.role === "assistant") ? "after-message" : ""}">${suggestedUserQuestions(session, zh)
          .map(
            (q) =>
              `<button data-action="followup" data-question="${esc(q)}"><span class="followup-label">${esc(q)}</span>${icon("right")}</button>`,
          )
          .join("")}</div>`
      : ""
  }<div class="scroll-end"></div></div>${["question", "guiding", "ready", "chatting", "reading", "followup"].includes(session.phase) ? composer() : ""}</div>`;
}
function draw() {
  return `<div class="draw-screen">${header("Choose cards")}<div class="draw-content"><span class="fan-ellipse fan-ellipse-top" aria-hidden="true"></span><span class="fan-ellipse fan-ellipse-bottom" aria-hidden="true"></span><div class="tarot-table"><div class="table-inner"><span class="table-star top">✦</span><span class="table-star bottom">✦</span></div><div class="card-slots">${[
    0, 1, 2,
  ]
    .map((i) => {
      const chosen = session.selected[i] !== undefined,
        c = chosen ? cardsFor(session)[i] : null;
      return `<div class="slot-wrap"><div class="card-slot ${chosen ? "filled" : ""}" aria-label="${["Past", "Now", "Future"][i]}${chosen ? ": selected" : ", not selected"}">${chosen ? `<div class="flip-inner"><div class="flip-back">${cardArt(c.id, true)}</div></div>` : ""}</div><b>${["Past", "Now", "Future"][i]}</b></div>`;
    })
    .join(
      "",
    )}</div></div><div class="draw-instructions"><p>Take a deep breath and focus on the question</p><p>Choose the cards you want</p></div><div class="fan" aria-label="Choose from the tarot deck">${session.order.map((c, i) => `<button class="fan-card ${session.selected.includes(i) ? "taken" : ""}" data-action="select" data-index="${i}" style="${fanPose(i)}" aria-label="Choose card ${i + 1}" ${session.selected.includes(i) ? "disabled" : ""}>${cardArt(c.id, true)}</button>`).join("")}</div><div class="fan-slider" aria-hidden="true"><span></span></div><p class="fan-caption">Swipe left and right to view more cards<br>Drag up to reveal the selected card</p></div></div>`;
}
function loading() {
  return `<div class="draw-screen loading-screen">${header("Loading")}<div class="loading-content"><div class="loading-card" aria-hidden="true">${cardArt(cardsFor(session)[1]?.id ?? 17, true)}</div><div class="loading-copy" role="status" aria-live="polite">Analyzing the Result... <span id="loading-percent">${loadingProgress}%</span></div></div></div>`;
}
const decoStars = {
  history: [
    ["stroke-plain", 30, 242],
    ["filled-plain", 10, 369],
    ["filled-plain", 31, 229],
  ],
  home: [["filled-plain", 10, 361]],
  draw: [
    ["filled-plain", 11, 414],
    ["combo-2", 332, 466],
  ],
  loading: [["stroke-plain", 30, 242]],
};
const stars = () =>
  (decoStars[view] || [])
    .map(
      ([n, x, y]) =>
        `<img class="deco-star" src="assets/stars/${n}.svg" alt="" aria-hidden="true" style="left:${x}px;top:${y}px">`,
    )
    .join("");
function render(scroll = false) {
  app.innerHTML = `<div class="app-surface" data-view="${view}">${stars()}${statusBar()}${storageNotice ? `<div class="storage-notice" role="status">${esc(storageNotice)}</div>` : ""}${view === "home" ? home() : view === "history" ? historyView() : view === "draw" ? draw() : view === "loading" ? loading() : chat()}${homeIndicator()}</div>`;
  if (scroll)
    requestAnimationFrame(() => {
      const el = $("#chat-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    });
}
function modalCloseButton() {
 return '<button type="button" class="modal-close" aria-label="Close dialog"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>';
}
function mountModal(el) {
 const layer=document.createElement('div');layer.className='modal-layer';
 const previousFocus=document.activeElement;
 const surface=app.querySelector('.app-surface');
 const title=el.querySelector('h3');title.id=`modal-${crypto.randomUUID()}`;title.tabIndex=-1;
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby',title.id);
 layer.append(el);app.append(layer);if(surface)surface.inert=true;
 const close=()=>{
  layer.remove();if(surface)surface.inert=false;
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 };
 layer.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  if(e.key==='Tab'){
   const controls=[...el.querySelectorAll('button:not(:disabled),textarea,input,[tabindex="0"]')];
   const first=controls[0],last=controls.at(-1);
   if(e.shiftKey && (document.activeElement===first || document.activeElement===title)){e.preventDefault();last?.focus();}
   else if(!e.shiftKey && (document.activeElement===last || document.activeElement===title)){e.preventDefault();first?.focus();}
  }
 });
 el.querySelector('.modal-close').onclick=close;
 el.querySelector('.cancel').onclick=close;
 title.focus({preventScroll:true});
 return close;
}
function dialog(title, body, confirmLabel, callback) {
 const el=document.createElement('section');el.className='modal';
 el.innerHTML=`${modalCloseButton()}<span class="modal-star">${icon("spark")}</span><h3>${esc(title)}</h3><p>${esc(body)}</p><button class="primary confirm">${esc(confirmLabel)}</button><button class="text-button cancel">Cancel</button>`;
 const close=mountModal(el);
 el.querySelector('.confirm').onclick=()=>{close();callback();};
}
function about() {
  dialog(
    "A little space for you",
    aiMode === "ai" ? "DeepSeek AI receives your question and necessary conversation context. History stays in this browser; provider data policies also apply. Avoid sensitive personal details. Readings are reflection, not predictions." : "Local demo with scripted replies. No questions are sent to an AI provider. Readings are reflection, not predictions.",
    "Back to my moment",
    () => {},
  );
}
let streaming = null,
  streamTimer = null;
function formatText(text) {
  let t = String(text ?? "");
  if ((t.match(/\*\*/g) || []).length % 2) t += "**";
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*\*/g, "")
    .replace(/\n/g, "<br>");
}
function stopStream() {
  clearInterval(streamTimer);
  streamTimer = null;
  streaming = null;
}
function startStream(idx) {
  stopStream();
  const full = session.messages[idx]?.text || "";
  const parts = Array.from(full);
  let shown = 0;
  streaming = { idx, text: "" };
  keepScroll(() => render());
  const el = $("#chat-scroll");
  if (el) el.scrollTop = el.scrollHeight;
  streamTimer = setInterval(() => {
    shown = Math.min(
      parts.length,
      shown + (/[\u3400-\u9fff]/.test(full) ? 3 : 6),
    );
    streaming.text = parts.slice(0, shown).join("");
    const bubble = document.querySelector(`.bubble[data-msg="${idx}"]`);
    const sc = $("#chat-scroll");
    const nearBottom =
      sc && sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
    if (bubble) bubble.innerHTML = formatText(streaming.text);
    if (sc && nearBottom) sc.scrollTop = sc.scrollHeight;
    if (shown >= parts.length) {
      stopStream();
      render(true);
    }
  }, 32);
}
const thinkTime = (text) =>
  450 +
  Math.min(850, Array.from(String(text || "")).length * 9) +
  Math.round(Math.random() * 180);
function run(task, prompt = "") {
  if (busy) return;
  busy = true;
  busyLabel = "Putting your question in context";
  error = "";
  retryTask = task;
  render(true);
  const before = session.messages.length;
  timer = setTimeout(() => {
    busy = false;
    busyLabel = "";
    try {
      task();
      retryTask = null;
      save();
      const last = session.messages.length - 1;
      if (
        session.messages.length > before &&
        session.messages[last].role === "assistant"
      )
        startStream(last);
      else render(true);
    } catch {
      error =
        "We couldn’t finish that response. Your question and cards are safe here.";
      render(true);
    }
  }, thinkTime(prompt));
}
function submit(raw) {
  if (!ensureMode(() => submit(raw))) return;
  const text = raw.trim();
  if (
    !text ||
    text.length > 500 ||
    busy ||
    streaming ||
    regenKey !== null ||
    !["question", "guiding", "ready", "chatting", "followup"].includes(
      session.phase,
    )
  )
    return;
  const after = !!session.reading;
  session.messages.push({
    role: "user",
    text,
    afterReading: after,
    timestamp: Date.now(),
  });
  session.draft = "";
  if (!session.question) session.question = text;
  session.phase = after
    ? "followup"
    : session.phase === "chatting"
      ? "chatting"
      : "guiding";
  save();
  if (aiMode === 'ai') { requestAI(after?'followup':session.phase==='chatting'?'chat':'guide'); return; }
  const task = () => completeReply(text, after);
  run(task, text);
}
function completeReply(text, after) {
  const special = safeReply(text);
  const chatting =
    session.phase === "chatting" ||
    /先聊|不想抽牌|暂时不抽|只想聊|just (?:want to )?talk|rather chat|no cards/i.test(
      text,
    );
  const firstQuestion =
    session.messages.filter((m) => m.role === "user").length === 1;
  const kind = special
    ? null
    : after
      ? "followup"
      : chatting
        ? "chat"
        : firstQuestion && isVague(text)
          ? "clarify"
          : "ready";
  const reply = special || replyFor(session, kind, text, 0);
  session.messages.push({
    role: "assistant",
    text: reply,
    afterReading: after,
    timestamp: Date.now(),
    ...(kind ? { kind, prompt: text, variant: 0 } : {}),
  });
  session.phase = after
    ? "followup"
    : special
      ? "question"
      : chatting
        ? "chatting"
        : "ready";
}
function finishedCopy() {
  return conversationContext(session).zh
    ? "三张牌已经选好了，我们一起看看它们和你的问题有什么联系。"
    : "You’ve finished drawing your cards.";
}
function interpret() {
  if(aiMode === 'ai') { requestAI('reading'); return; }
  if (session.revealed.length !== 3) return;
  if (session.messages.at(-1)?.text !== finishedCopy())
    session.messages.push({
      role: "assistant",
      text: finishedCopy(),
      timestamp: Date.now(),
    });
  view = "chat";
  session.phase = "reading";
  save();
  run(() => {
    session.reading = readingFor(session);
    session.phase = "followup";
  });
}
function finishAnalysis() {
  clearInterval(loadingInterval);
  loadingInterval = null;
  session.revealed = [0, 1, 2];
  if (session.messages.at(-1)?.text !== finishedCopy())
    session.messages.push({
      role: "assistant",
      text: finishedCopy(),
      timestamp: Date.now(),
    });
  session.reading = readingFor(session);
  session.phase = "followup";
  view = "chat";
  loadingProgress = 100;
  save();
  render();
  requestAnimationFrame(() => {
    const el = $("#chat-scroll"),
      block = $(".reading-block");
    if (el && block)
      el.scrollTop +=
        block.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
  });
  announce("Your reading is ready");
}
function beginAnalysis() {
  if(aiMode === 'ai') {
    session.revealed=[0,1,2]; session.phase='reading'; view='chat'; save(); requestAI('reading'); return;
  }
  clearTimeout(timer);
  clearInterval(loadingInterval);
  loadingProgress = 0;
  session.phase = "loading";
  view = "loading";
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  save();
  render();
  loadingInterval = setInterval(() => {
    loadingProgress = Math.min(96, loadingProgress + 4);
    const percent = $("#loading-percent");
    if (percent) percent.textContent = `${loadingProgress}%`;
  }, 50);
  timer = setTimeout(finishAnalysis, 1300);
}
function archiveCurrent() {
  if (session?.messages.length) {
    archive = [session, ...archive.filter((s) => s.id !== session.id)].slice(
      0,
      30,
    );
  }
}
function cancelRegeneration() {
  clearTimeout(regenerationTimer);
  regenerationTimer = null;
  regenKey = null;
}
function start(topic) {
  cancelAI();
  cancelRegeneration();
  stopStream();
  archiveCurrent();
  returnView = "home";
  deckShift = 0;
  busyLabel = "";
  regenKey = null;
  clearTimeout(timer);
  clearInterval(loadingInterval);
  loadingInterval = null;
  busy = false;
  retryTask = null;
  error = "";
  session = prepare(newSession(topic));
  view = "chat";
  save();
  render();
}
app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  if (a === "select" && Date.now() < suppressFanClickUntil) return;
  if (a === "stop-generation") {
    if(activeAI) { cancelAI(); save(); keepScroll(render); return; }
    if (!streaming) return;
    const { idx, text } = streaming;
    if (text.trim()) session.messages[idx].text = text;
    stopStream();
    save();
    keepScroll(render);
    announce(
      conversationContext(session).zh ? "Response stopped" : "Response stopped",
    );
    return;
  }
  if (a === "about") return about();
  if (a === "home") {
    cancelAI();
    view = "home";
    render();
    return;
  }
  if (a === "history") {
    cancelAI();
    view = "history";
    render();
    return;
  }
  if (a === "open-history") {
    const id = b.dataset.id;
    if (busy) return;
    cancelRegeneration();
    stopStream();
    if (session?.id !== id) {
      const picked = archive.find((s) => s.id === id);
      if (!picked) return;
      archiveCurrent();
      archive = archive.filter((s) => s.id !== id);
      session = picked;
      regenKey = null;
      error = "";
      retryTask = null;
    }
    returnView = "history";
    view = ["drawing", "selected", "revealing"].includes(session.phase)
      ? "draw"
      : "chat";
    save();
    render(true);
    return;
  }

  if (a === "general") {
    start("general");
    return;
  }
  if (a === "topic") {
    start(b.dataset.id);
    return;
  }
  if (a === "resume") {
    view = ["drawing", "selected", "revealing"].includes(session.phase)
      ? "draw"
      : session.phase === "loading"
        ? "loading"
        : "chat";
    render();
    return;
  }
  if (a === "back") {
    cancelAI();
    if (view === "loading") return;
    if (view === "draw") view = "chat";
    else {
      view = returnView;
      returnView = "home";
    }
    render();
    return;
  }
  if (a === "guide") {
    if (busy || streaming || !guides[b.dataset.guide]) return;
    const left = $(".guide-cards").scrollLeft;
    session.guide = b.dataset.guide;
    save();
    render();
    $(".guide-cards").scrollLeft = left;
    return;
  }
  if (a === "example") {
    session.draft = topics.find((t) => t.id === session.topic).question;
    save();
    render();
    $("#question").focus();
    return;
  }
  if (a === "edit") {
    cancelAI(); delete session.frozenQuestion;
    session.draft = session.question;
    session.question = "";
    session.messages = [];
    session.phase = "question";
    save();
    render();
    $("#question").focus();
    return;
  }
  if (a === "keep-chat") {
    if (busy || !ensureMode(()=>b.click())) return;
    session.messages.push({
      role: "user",
      text: conversationContext(session).zh
        ? "我想先继续聊聊"
        : "No, I want to chat with you",
      timestamp: Date.now(),
    });
    session.phase = "chatting";
    save();
    if(aiMode === 'ai') { if(ensureMode(()=>requestAI('chat')))requestAI('chat');return; }
    run(
      () =>
        session.messages.push({
          role: "assistant",
          text: guidanceFor(session),
          timestamp: Date.now(),
          kind: "guidance",
          prompt: "",
          variant: 0,
        }),
      "guidance",
    );
    return;
  }
  if (a === "draw") {
    if (busy || streaming || !ensureMode(()=>b.click())) return;
    if(aiMode === 'ai' && !session.frozenQuestion && session.selected.length === 0) {
      confirmQuestion(); return;
    }
    if (["ready", "guiding", "chatting"].includes(session.phase)) {
      session.messages.push({
        role: "user",
        text: conversationContext(session).zh
          ? "我想抽三张牌。"
          : "I want to choose tarot cards.",
        timestamp: Date.now(),
      });
      session.phase = "drawing";
      save();
      busy = true;
      busyLabel = "Loading tarot cards......";
      render(true);
      timer = setTimeout(() => {
        busy = false;
        busyLabel = "";
        view = "draw";
        render();
      }, 900);
      return;
    }
    view = "draw";
    save();
    render();
    return;
  }
  if (a === "select") {
    if (selectCard(session, Number(b.dataset.index))) {
      if (session.selected.length === 3) beginAnalysis();
      else {
        save();
        render();
        announce(`${session.selected.length} of 3 cards selected`);
      }
    }
    return;
  }
  if(a === 'reinterpret') {
    if(busy || streaming)return;
    requestAI('reading','reading');return;
  }
  if (a === "interpret") {
    interpret();
    return;
  }
  if (a === "card-detail") {
    const i = Number(b.dataset.index);
    session.detailCards ||= [];
    session.detailCards = session.detailCards.includes(i)
      ? session.detailCards.filter((n) => n !== i)
      : [...session.detailCards, i];
    const scroll = $("#chat-scroll").scrollTop;
    save();
    render();
    $("#chat-scroll").scrollTop = scroll;
    return;
  }
  if (a === "challenge") {
    session.challengeOpen = !session.challengeOpen;
    const scroll = $("#chat-scroll").scrollTop;
    save();
    render();
    $("#chat-scroll").scrollTop = scroll;
    return;
  }
  if (a === "followup") {
    submit(b.dataset.question);
    return;
  }
  if (a === "feedback") {
    const k = b.dataset.key,
      v = b.dataset.value;
    const cur =
      k === "reading"
        ? session.readingFeedback
        : session.messages[Number(k)].feedback;
    const next = cur === v ? null : v;
    if (k === "reading") session.readingFeedback = next;
    else session.messages[Number(k)].feedback = next;
    save();
    keepScroll(render);
    if (next) toast("Thanks for your feedback");
    return;
  }
  if (a === "copy") {
    copyText(plainText(b.dataset.key)).then((ok) =>
      toast(ok ? "Copied" : "Copy failed"),
    );
    return;
  }
  if (a === "regen") {
    if (busy || streaming || regenKey !== null) return;
    if(aiMode !== 'ai' && (b.dataset.key==='reading'?session.reading?.source:session.messages[Number(b.dataset.key)]?.source)==='ai') {toast('Please retry to generate an AI response.');return;}
    if(aiMode === 'ai') {
      const key=b.dataset.key;
      const snap=key==='reading'?session.readingInput:session.messages[Number(key)]?.inputSnapshot;
      if(!snap) {toast('Please send a new question to continue.');return;}
      if(ensureMode(()=>requestAI(snap.task,key,snap)))requestAI(snap.task,key,snap);
      return;
    }
    const owner = session;
    const k = b.dataset.key;
    regenKey = k;
    keepScroll(render);
    regenerationTimer = setTimeout(() => {
      regenerationTimer = null;
      if (session !== owner) return;
      regenKey = null;
      if (k === "reading") {
        session.readingVariant = (session.readingVariant || 0) + 1;
        session.reading = readingFor(session, session.readingVariant);
        delete session.readingFeedback;
        save();
        keepScroll(render);
      } else {
        const i = Number(k),
          m = session.messages[i];
        if (m.kind) {
          m.variant = (m.variant || 0) + 1;
          m.text =
            replyFor(
              { ...session, messages: session.messages.slice(0, i) },
              m.kind,
              m.prompt,
              m.variant,
            ) || m.text;
        }
        m.timestamp = Date.now();
        delete m.feedback;
        save();
        startStream(i);
      }
      announce("Response regenerated");
    }, thinkTime(""));
    return;
  }
  if (a === "retry") {
    if(aiMode==='ai') {
      if(ensureMode(()=>retryAI()))retryAI();return;
    }
    if (retryTask) run(retryTask);
    else if (session.phase === "reading") interpret();
    return;
  }
  if (a === "clear")
    return dialog(
      "Clear your saved reading?",
      "This removes the current conversation and cards from this browser. This cannot be undone.",
      "Clear reading",
      () => {
        cancelAI();
        session = null;
        error = "";
        save();
        view = "home";
        render();
      },
    );
  if (a === "new")
    dialog(
      "Begin a new exploration?",
      "This will replace your current reading. Your conversations remain in History on this device.",
      "Start a new reading",
      () => {
        cancelRegeneration();
        stopStream();
        archiveCurrent();
        cancelAI();
        session = null;
        error = "";
        save();
        view = "home";
        render();
      },
    );
});
let fanGesture = null;
app.addEventListener("pointerdown", (e) => {
  const fan = e.target.closest(".fan");
  if (!fan) return;
  fanGesture = {
    x: e.clientX,
    y: e.clientY,
    start: deckShift,
    scale:
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--screen-scale",
        ),
      ) || 1,
    target: e.target.closest("[data-action=select]")?.dataset.index,
    moved: false,
  };
});
app.addEventListener("pointermove", (e) => {
  if (!fanGesture) return;
  $(".fan")?.classList.add("dragging");
  const dx = (e.clientX - fanGesture.x) / fanGesture.scale,
    dy = (e.clientY - fanGesture.y) / fanGesture.scale;
  if (Math.abs(dx) > 8) {
    fanGesture.moved = true;
    deckShift = Math.max(-200, Math.min(200, fanGesture.start + dx));
    layoutFan();
  }
  const active = document.querySelector(
    `.fan-card[data-index="${fanGesture.target}"]`,
  );
  if (active && dy < 0)
    active.style.setProperty("--lift", Math.max(-122, dy) + "px");
});
function finishFan(e) {
  $(".fan")?.classList.remove("dragging");
  if (!fanGesture) return;
  const g = fanGesture;
  fanGesture = null;
  document
    .querySelector(`.fan-card[data-index="${g.target}"]`)
    ?.style.setProperty("--lift", "0px");
  if (g.moved) suppressFanClickUntil = Date.now() + 250;
  if ((e.clientY - g.y) / g.scale < -45 && g.target !== undefined) {
    suppressFanClickUntil = Date.now() + 250;
    if (selectCard(session, Number(g.target))) {
      if (session.selected.length === 3) beginAnalysis();
      else {
        save();
        render();
        announce(`${session.selected.length} of 3 cards selected`);
      }
    }
  }
}
window.addEventListener("pointerup", finishFan);
window.addEventListener("pointercancel", () => {
  if (fanGesture)
    document
      .querySelector(`.fan-card[data-index="${fanGesture.target}"]`)
      ?.style.setProperty("--lift", "0px");
  fanGesture = null;
});
app.addEventListener("input", (e) => {
  if (e.target.id === "question") {
    session.draft = e.target.value;
    save();
    const len = session.draft.trim().length;
    $("#count").hidden = len <= 500;
    $("#count").textContent = `${session.draft.length}/500`;
    $("#count").classList.toggle("over-limit", len > 500);
    const send = $("#question-form button[type='submit']");
    if (send)
      send.disabled =
        busy || streaming || regenKey !== null || !len || len > 500;
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
  }
});
app.addEventListener("keydown", (e) => {
  if (
    e.target.id === "question" &&
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.isComposing &&
    e.keyCode !== 229
  ) {
    e.preventDefault();
    submit(e.target.value);
  }
});
app.addEventListener("submit", (e) => {
  if (e.target.id === "question-form") {
    e.preventDefault();
    submit($("#question").value);
  }
});

if(session?.request && ['interrupted','failed','stopped'].includes(session.request.status)) {
 error='The previous request was interrupted. Retry with the same cards.';
}
render();
if(session && (["selected","revealing","loading"].includes(session.phase) || (session.phase==='drawing' && session.selected.length===3))) {
 if(aiMode==='ai' || session.request) {
   session.revealed=[0,1,2];session.phase='reading';view='chat';
   error='Your cards are saved. Retry to generate your reading.';save();render();
 } else beginAnalysis();
}

function ensureMode(continuation) {
 // Default to AI; unavailable service is handled by a per-request demo fallback.
 if(aiConsent!==CONSENT_VERSION){
  dialog('Enable DeepSeek AI','Your question, relevant conversation and cards will be sent to DeepSeek. History is saved in this browser. DeepSeek’s data policy applies. Avoid sharing sensitive personal information.','Agree and continue',()=>{
   aiConsent=CONSENT_VERSION;try{localStorage.setItem('aura.consent.v2',aiConsent);}catch{}
   continuation();
  });return false;
 }
 return true;
}
function confirmQuestion() {
 const el=document.createElement('section');el.className='modal';
 el.innerHTML=`${modalCloseButton()}<h3>Your question</h3><p>Refine your question using our conversation. It will stay fixed once you draw the cards.</p><textarea aria-label="Your question" maxlength="1000">${esc(session.question)}</textarea><button class="primary confirm">Confirm and draw</button><button class="text-button cancel">Keep editing</button>`;
 const owner=session;
 const close=mountModal(el);
 el.querySelector('.confirm').onclick=()=>{
  const question=el.querySelector('textarea').value.trim();if(!question||session!==owner)return;
  session.frozenQuestion=question;save();close();document.querySelector('[data-action="draw"]')?.click();
 };
}
function cancelAI() {
 const running=activeAI;if(!running)return;
 activeAI=null;running.controller.abort();
 running.owner.request.status='stopped';
 if(running.message && running.owner.messages.includes(running.message)) {
  if(running.target)running.owner.messages.splice(running.owner.messages.indexOf(running.message),1);
  else running.message.status='stopped';
 }
 busy=false;busyLabel='';error='Generation stopped. Your question and cards are saved. You can retry.';save();
}
function buildAIInput(task,existing=null) {
 prepare(session);
 const messages=session.messages.filter(m=>m.status!=='stopped'&&m.status!=='failed').map(m=>({id:m.id,role:m.role,text:m.text}));
 if(task==='reading' && !existing)while(messages.at(-1)?.role==='assistant')messages.pop();
 if(messages.length>40 || messages.reduce((n,m)=>n+m.text.length,0)>20000)throw new Error('CONTEXT_LIMIT');
 return existing?structuredClone(existing):{schemaVersion:2,sessionId:session.id,task,topic:session.topic,guideId:session.guide||session.topic,question:session.question,frozenQuestion:session.frozenQuestion||'',messages,spread:session.selected.length===3?cardsFor(session).map((c,i)=>({cardId:c.id,position:['past','now','future'][i],reversed:c.reversed})):[],reading:task==='followup'?(session.reading?.detail||session.reading):null,clarificationCount:Math.min(1,session.clarificationCount||0)};
}
function retryAI() {
 const r=session.request;
 if(r?.snapshot)requestAI(r.snapshot.task,r.targetKey,r.snapshot);
 else if(session.selected.length===3)requestAI('reading');
 else requestAI(session.phase==='chatting'?'chat':session.reading?'followup':'guide');
}
async function requestAI(task,targetKey=null,existing=null) {
 if(activeAI || busy)return;
 if(!ensureMode(()=>requestAI(task,targetKey,existing)))return;
 let input;
 try{input=buildAIInput(task,existing);}catch(e){error=aiError(e.message);render();return;}
 input.requestId=crypto.randomUUID();input.consentVersion=CONSENT_VERSION;
 const owner=session,controller=new AbortController();
 const target=targetKey!==null && targetKey!=='reading'?owner.messages[Number(targetKey)]:null;
 const running={owner,controller,requestId:input.requestId,target,message:null};activeAI=running;
 owner.request={status:'pending',snapshot:input,targetKey};
 busy=true;busyLabel=progressText('connect',input);error='';save();render(true);
 let lastSaved=0;
 const current=()=>activeAI===running && session===owner;
 let fallbackNotice="";
 try{
  let result;
  try {
  result=await generateRequest(input,controller.signal,(event,data)=>{
   if(!current())return;
   if(event==='stage'){busyLabel=progressEventText(data);render(true);}
   if(event==='delta'){
    if(!running.message){running.message={id:crypto.randomUUID(),role:'assistant',text:'',source:'ai',status:'streaming',timestamp:Date.now(),afterReading:!!owner.reading};owner.messages.push(running.message);}
    running.message.text+=data.text;owner.request.status='streaming';
    // Render at most once per animation frame; do not replay completed text.
    if(!running.frame)running.frame=requestAnimationFrame(()=>{running.frame=null;if(current())render(true);});
    if(Date.now()-lastSaved>700){lastSaved=Date.now();save();}
   }
  });
  } catch(networkError) {
   if(!current() || controller.signal.aborted)throw networkError;
   if(!shouldUseDemo(networkError))throw networkError;
   if(running.message)owner.messages=owner.messages.filter(m=>m!==running.message);
   running.message=null;
   result=demoResponse(input,networkError.message);
   fallbackNotice=networkError.message==='UPSTREAM_AUTH_FAILED'?'AI authentication failed. Showing a demo response.':'AI is temporarily unavailable. Showing a demo response.';
  }
  if(!current())return;
  if(result.demoReading){
   owner.reading=result.demoReading;owner.readingInput=input;owner.revealed=[0,1,2];owner.phase='followup';delete owner.readingFeedback;
  }else if(result.reading){
   if(schemaErrors(result.reading,readingSchema).length || result.reading.cards.some((c,i)=>['cardId','position','reversed'].some(k=>c[k]!==input.spread[i][k])))throw new Error('INVALID_OUTPUT');
   owner.reading=reportToLegacy(result.reading,result.meta);owner.readingInput=input;owner.revealed=[0,1,2];owner.phase='followup';delete owner.readingFeedback;
  }else if(result.reply && typeof result.reply.text==='string' && result.reply.text.trim()){
   const m=target||running.message||{id:crypto.randomUUID(),role:'assistant',afterReading:task==='followup'};
   if(!owner.messages.includes(m))owner.messages.push(m);
   if(target && running.message)owner.messages=owner.messages.filter(x=>x!==running.message);
   owner.messages.forEach(x=>{delete x.inputSnapshot;});
   Object.assign(m,{text:result.reply.text,source:result.meta?.mode==='demo'?'demo':'ai',status:'succeeded',timestamp:Date.now(),meta:result.meta,suggestions:result.reply.followups||null,inputSnapshot:input});delete m.feedback;
   if(result.reply.nextAction==='clarify')owner.clarificationCount=1;
   owner.phase=task==='followup'?'followup':result.reply.nextAction==='support'?'question':result.reply.nextAction==='clarify'?'guiding':task==='chat'?'chatting':'ready';
  }else throw new Error('INVALID_OUTPUT');
  owner.request.status='succeeded';view='chat';
 }catch(e){
  if(!current())return;
  owner.request.status='failed';
  if(running.message){if(target)owner.messages=owner.messages.filter(m=>m!==running.message);else running.message.status='failed';}
  error=aiError(e.message);view='chat';
 }finally{
  if(current()){activeAI=null;busy=false;busyLabel='';save();render(true);if(fallbackNotice)toast(fallbackNotice,3500);}
 }
}
function aiError(code) {
 const messages={AI_UNAVAILABLE:'AI is unavailable. Please try again later.',QUALITY_CHECK_FAILED:'The reading did not pass our quality check. Your question and cards are saved. Please retry.',BUDGET_EXCEEDED:'Today’s AI usage limit has been reached. You can still view your history.',UPSTREAM_TIMEOUT:'The request timed out. Your question and cards are saved. Please retry.',CONTEXT_LIMIT:'This conversation has reached its limit. Start a new exploration; your history is saved.',REQUEST_IN_PROGRESS:'A request is already in progress. Please try again shortly.',UPSTREAM_RATE_LIMITED:'AI is busy. Please try again shortly.'};
 return messages[code]||'The request could not be completed. Your question and cards are saved. Please retry.';
}

function stopControl(className='') {
 return `<button type="button" class="generation-stop ${className}" data-action="stop-generation" aria-label="Stop generation" title="Stop generation"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="7.5" width="9" height="9" rx="1.8" fill="currentColor"/></svg></button>`;
}
function messageSource(m) {
 if(m.role!=='assistant')return '';
 const status=m.status==='stopped'?'Stopped':m.status==='failed'?'Incomplete':'';
 const demo=m.source==='demo';
 if(!status&&!demo)return '';
 return `<small class="message-source">${[demo?'Demo response':null,status].filter(Boolean).join(' · ')}</small>`;
}
function readingNotice(r) {
 const text=!r?'Interpreting your cards…':r.source==='demo'?'Demo reading · for reflection. Click a card to see more.':'AI reading · for reflection. Click a card to see more.';
 return `<p class="reading-status" role="status">${icon('spark')}<span>${text}</span></p>`;
}

function suggestedUserQuestions(s,zh) {
 const latest=s.messages.filter(m=>m.role==='assistant' && m.afterReading && Array.isArray(m.suggestions) && m.status==='succeeded').at(-1);
 return userFollowups(latest?.suggestions || s.reading?.detail?.followups || [],s.messages,zh,{question:s.frozenQuestion||s.question});
}

function readingActions(r) {
 const actions=r.detail?.actions;
 if(Array.isArray(actions))return `<section class="reading-actions"><h4>Next step</h4><ul>${actions.map(a=>`<li>${formatText(a.step)}</li>`).join('')}</ul></section>`;
 return r.action?`<section class="reading-actions"><h4>Next step</h4><p>${formatText(r.action)}</p></section>`:'';
}

function readingStepHeading(index) {
 const c=cardsFor(session)[index];if(!c)return '';
 const label=['Past','Now','Future'][index];
 const name=`${c.name} · ${c.reversed?'Reversed':'Upright'}`;
 return `${label} · ${name}`;
}
