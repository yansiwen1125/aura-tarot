// Original Aura reflection meanings; not a predictive knowledge source.
const names = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
];
const meanings = [
  [
    "openness",
    "Try one small, unfamiliar step without needing to know the whole path.",
    "Pause before committing; curiosity works best with a little preparation.",
  ],
  [
    "resourcefulness",
    "Notice a skill or resource you already have, and put it to gentle use.",
    "Choose one practical step instead of waiting for perfect confidence.",
  ],
  [
    "intuition",
    "Make a quiet moment to distinguish your own feelings from outside expectations.",
    "Check what you know against what you are imagining.",
  ],
  [
    "care",
    "Give yourself the care and time you would offer someone you love.",
    "Look at where giving too much may be leaving you depleted.",
  ],
  [
    "structure",
    "A small, realistic boundary can give you room to breathe.",
    "Let a rigid expectation soften enough to fit your real needs.",
  ],
  [
    "beliefs",
    "Ask which values genuinely support the choice in front of you.",
    "You are allowed to question advice that no longer fits.",
  ],
  [
    "connection",
    "Name what matters to you before deciding how to connect with others.",
    "Notice a gap between your choices and the things you value.",
  ],
  [
    "direction",
    "Choose a manageable direction and take it at your own pace.",
    "Slow down enough to decide where you actually want to go.",
  ],
  [
    "gentle courage",
    "Meet a difficult feeling with patience rather than self-criticism.",
    "Make rest part of courage; you do not have to push through everything.",
  ],
  [
    "reflection",
    "A little time away from outside opinions may help you hear yourself.",
    "Seek a trusted perspective if reflection starts to feel like isolation.",
  ],
  [
    "change",
    "Focus on one thing you can influence while circumstances shift.",
    "An uncertain period can be a reason to ground yourself in small routines.",
  ],
  [
    "balance",
    "Separate what happened from the story you are telling yourself about it.",
    "Consider whether you are holding yourself to an unfair standard.",
  ],
  [
    "perspective",
    "Give yourself permission to pause and look from another angle.",
    "Notice whether waiting is creating space or keeping you stuck.",
  ],
  [
    "transition",
    "Consider what you are ready to release so a new routine can take root.",
    "An ending can be gradual; you do not have to force a change today.",
  ],
  [
    "steadiness",
    "Bring two competing needs together through a small, sustainable adjustment.",
    "Your balance may need recalibrating; begin with one basic need.",
  ],
  [
    "patterns",
    "Notice a habit or expectation that makes your choices feel smaller.",
    "One tiny boundary can loosen a pattern that no longer supports you.",
  ],
  [
    "reassessment",
    "If an assumption is shifting, rebuild around what is actually reliable.",
    "Check what needs attention before making a dramatic change.",
  ],
  [
    "renewal",
    "Look for one modest source of encouragement you can return to.",
    "Hope can begin as a small act of care, even without certainty.",
  ],
  [
    "uncertainty",
    "Name a feeling without treating it as proof of what will happen.",
    "Give unclear feelings time and check assumptions with real information.",
  ],
  [
    "warmth",
    "Make room for one simple activity that brings ease or enjoyment.",
    "Ease does not have to be earned; a small good moment still counts.",
  ],
  [
    "understanding",
    "Reflect on what you have learned without judging your past self.",
    "Notice if self-judgement is making it harder to choose a fresh start.",
  ],
  [
    "integration",
    "Recognise one piece of progress before looking for the next goal.",
    "Let unfinished details coexist with the progress you have made.",
  ],
];
export const deck = names.map((name, id) => ({
  id,
  name,
  numeral: [
    "0",
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
    "XVII",
    "XVIII",
    "XIX",
    "XX",
    "XXI",
  ][id],
  keyword: meanings[id][0],
  upright: meanings[id][1],
  reversed: meanings[id][2],
}));

export const catalogVersion = "aura-reflection-22-v1";
export function evidenceFor(spread) {
 return spread.map(c => ({...c, name:deck[c.cardId].name, meaningId:`${c.cardId}:${c.reversed ? "reversed" : "upright"}`, meaning: c.reversed ? deck[c.cardId].reversed : deck[c.cardId].upright, keyword:deck[c.cardId].keyword}));
}
