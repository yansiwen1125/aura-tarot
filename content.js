// Scripted copy for the five topics. Each topic has its own guide card, voice, reading lens and follow-ups,
// so every reply after picking a topic on the home screen stays inside that theme.
// Arrays hold alternative wordings; the variant index (bumped by "regenerate") picks between them.

export const guides = {
  general: {
    card: 0,
    name: "The Fool",
    short: "Fool",
    theme: "new beginnings",
    label: "Ask Fool about general life",
    blurb:
      "Curious and fresh-hearted, the Fool helps you begin a new chapter with lightness, trust, and a beginner’s courage.",
    ready: [
      "It sounds like you are standing at the edge of something new. The Fool can help you look at it with fresh eyes.",
      "Thank you for bringing this here. Beginnings can feel exciting and uncertain at the same time, and the Fool is good company for both.",
    ],
    clarify:
      "I’m here with you. What feels most uncertain right now—a decision, a change, or simply a feeling? You can share a little more, or draw with the question as it is.",
    points: [
      [
        "Begin Lightly",
        "You do not need the whole map to take the first step.",
      ],
      [
        "Trust the Open Road",
        "Let a little uncertainty feel like space, not danger.",
      ],
      [
        "Pack Only What Matters",
        "Leave behind one worry that is not yours to carry.",
      ],
      [
        "Stay Curious",
        "Ask “what could this teach me?” before “what if it goes wrong?”",
      ],
    ],
    more: [
      [
        "Say Yes to Something Small",
        "Try one unfamiliar thing this week, just to see how it feels.",
      ],
      [
        "Notice the Signs",
        "Write down what keeps catching your attention lately.",
      ],
      [
        "Laugh at the Stumbles",
        "Missteps are part of every journey worth taking.",
      ],
    ],
    clarifyGuide:
      "The Fool’s advice is simple: you are allowed to begin before you feel ready. Choose the smallest step that moves you toward what you want, take it with curiosity, and let the next step reveal itself.",
    chat: [
      "That makes sense. New chapters rarely arrive with clear instructions. The Fool would say the not-knowing is part of the adventure—what is one thing you are curious about here?",
      "I hear you. Sometimes the bravest thing is simply to begin. If nothing could go wrong, what would you try first?",
    ],
    positions: [
      [
        "Looking back, {card} set this journey in motion with {keyword}.",
        "What brought you here: {card}, a story of {keyword}.",
      ],
      [
        "Right now, {card} asks you to meet {keyword} with an open heart.",
        "At this threshold, {card} highlights {keyword}.",
      ],
      [
        "Ahead, {card} suggests {keyword} could open a new door.",
        "The next step may carry the energy of {card}: {keyword}.",
      ],
    ],
    challenge: [
      "Be careful not to wait for perfect certainty before you move.",
      "Notice if fear of a misstep is keeping you standing still.",
    ],
    action: [
      "Today, write down one small “first step” you could take this week—then choose a day for it.",
      "Pick one tiny experiment for tomorrow, something you can try in under fifteen minutes.",
    ],
    followups: [
      "Where should I begin?",
      "What am I ready to leave behind?",
      "How can I trust the next step?",
    ],
    advice: [
      "Start with the step that feels lightest, not the one that feels most impressive.",
      "Let go of one expectation that belongs to someone else.",
      "Give yourself permission to change direction once you learn more.",
    ],
  },
  career: {
    card: 1,
    name: "The Magician",
    short: "Magician",
    theme: "drive and action",
    label: "Ask Magician about your career",
    blurb:
      "Its powerful energy clarifies your career direction, unlocks inner potential, and empowers you to turn professional dreams into reality.",
    ready: [
      "It sounds like work has been asking a lot of you lately. The Magician can help you see where your energy and skills can move things forward.",
      "Thank you for sharing that. Career questions often hide a deeper one about direction, and the Magician is good at bringing it into focus.",
    ],
    clarify:
      "I’m here with you. Is this about a decision, a workload, or a feeling about where your work is heading? Share a little more, or draw with the question as it is.",
    points: [
      ["Name Your Tools", "List the skills and support you already have."],
      ["Focus Your Will", "Choose one clear intention for this week."],
      ["Act Small, Act Now", "Turn that intention into a twenty-minute task."],
      ["Trust Your Craft", "Notice what you do well and build on it."],
    ],
    more: [
      ["Clear the Table", "Put aside one task that does not need you today."],
      [
        "Ask for a Tool",
        "Reach out for the help or information you are missing.",
      ],
      ["Mark the Progress", "Write down one thing you moved forward today."],
    ],
    clarifyGuide:
      "The Magician’s advice comes down to this: you already hold more tools than you think. Pick one goal, match it with one skill you trust, and take a concrete action today, however small.",
    chat: [
      "That sounds like a lot to hold. The Magician would ask: which part of this is actually within your control right now? Let’s start there.",
      "I hear the pressure in that. When work feels heavy, naming one clear priority can return some of your power. What would that priority be?",
    ],
    positions: [
      [
        "In your recent work, {card} points to {keyword}.",
        "What shaped your path so far: {card}, a lesson in {keyword}.",
      ],
      [
        "At work right now, {card} highlights {keyword}.",
        "Your current role is coloured by {card} and its theme of {keyword}.",
      ],
      [
        "For your next career step, {card} suggests {keyword}.",
        "Your professional future may call on {keyword}, as {card} suggests.",
      ],
    ],
    challenge: [
      "Watch for saying yes to everything—your energy is a resource too.",
      "Be careful not to measure your worth only by today’s output.",
    ],
    action: [
      "Before tomorrow starts, choose the one task that would make the biggest difference and give it your first focused hour.",
      "Write down three strengths you used this month, and one place you could use them more visibly.",
    ],
    followups: [
      "What’s my next career move?",
      "How do I use my strengths?",
      "How can I handle work pressure?",
    ],
    advice: [
      "Lead with the skill you enjoy using most—it usually grows fastest.",
      "Ask for clarity on expectations before you take on more.",
      "Protect one block of focused time each day, even if it is short.",
    ],
  },
  love: {
    card: 6,
    name: "The Lovers",
    short: "Lovers",
    theme: "love and connection",
    label: "Ask Lovers about love",
    blurb:
      "Warm and honest, the Lovers help you hear what your heart needs—inviting closeness, clear choices, and mutual care.",
    ready: [
      "It sounds like this connection matters a lot to you. The Lovers can help you look at what your heart is asking for.",
      "Thank you for trusting me with this. Matters of the heart are tender, and the Lovers can bring a gentle kind of clarity.",
    ],
    clarify:
      "I’m here with you. Is this about a partner, someone new, or how you feel about love right now? You can share a little more, or draw with the question as it is.",
    points: [
      [
        "Listen to Your Heart",
        "Name what you truly want, not what you think you should want.",
      ],
      [
        "Speak Honestly",
        "Share one feeling plainly, without testing or guessing.",
      ],
      [
        "Honour Both Sides",
        "A healthy bond makes room for your needs and theirs.",
      ],
      [
        "Choose with Care",
        "Let your choices reflect the love you want to receive.",
      ],
    ],
    more: [
      [
        "Notice the Small Gestures",
        "Connection often lives in everyday kindness.",
      ],
      [
        "Hold Your Boundaries Softly",
        "Saying what you need is an act of love, too.",
      ],
      ["Love Yourself First", "Give yourself the warmth you hope to find."],
    ],
    clarifyGuide:
      "The Lovers’ advice is about alignment: closeness grows when what you feel, what you say, and what you do point in the same direction. Start by naming one honest feeling.",
    chat: [
      "That sounds tender. The Lovers would gently ask: what do you hope this connection gives you, and what are you ready to give back?",
      "I hear how much this means to you. Sometimes clarity in love begins with being honest with ourselves first. What do you wish they understood?",
    ],
    positions: [
      [
        "In what you have felt before, {card} reflects {keyword}.",
        "Your past in love carries a theme of {keyword}, shown by {card}.",
      ],
      [
        "In this connection now, {card} brings {keyword} forward.",
        "Right now, your heart is meeting {card} and its sense of {keyword}.",
      ],
      [
        "Going forward in love, {card} invites {keyword}.",
        "What may grow between you: {card}, pointing to {keyword}.",
      ],
    ],
    challenge: [
      "Be careful not to read every silence as a sign of distance.",
      "Notice if you are giving more than you are receiving.",
    ],
    action: [
      "This week, share one honest feeling with the person this question is about—keep it short and kind.",
      "Write down what makes you feel truly cared for, and notice where you already receive it.",
    ],
    followups: [
      "How can I open up more?",
      "What does this connection need?",
      "How do I honour my own needs?",
    ],
    advice: [
      "Start with a feeling rather than a conclusion: “I feel…” opens doors that “You always…” closes.",
      "Make space for their side without losing sight of yours.",
      "Choose one small gesture of care and offer it without expecting a return.",
    ],
  },
  wellness: {
    card: 14,
    name: "Temperance",
    short: "Temperance",
    theme: "balance and healing",
    label: "Ask Temperance about wellness",
    blurb:
      "Patient and soothing, Temperance helps you find balance again, blending rest and effort so body and mind can heal.",
    ready: [
      "It sounds like your energy has been stretched. Temperance can help you find a gentler balance.",
      "Thank you for checking in with yourself. Temperance is all about healing at a pace your body and mind can trust.",
    ],
    clarify:
      "I’m here with you. Is this more about rest, stress, or how you have been feeling in your body lately? Share a little more, or draw with the question as it is.",
    points: [
      [
        "Find the Middle Way",
        "Notice where you swing between too much and too little.",
      ],
      [
        "Blend Rest and Effort",
        "Pair every demanding task with a moment of recovery.",
      ],
      ["Listen to Your Body", "Ask what it needs before you push through."],
      ["Heal Gradually", "Small, steady habits do more than dramatic changes."],
    ],
    more: [
      [
        "Slow Your Breath",
        "Breathe in for four counts and out for six, three times.",
      ],
      [
        "Hydrate and Pause",
        "A glass of water and a short pause can reset a heavy afternoon.",
      ],
      [
        "Speak Kindly to Yourself",
        "Name the worry, then answer it as you would a close friend.",
      ],
    ],
    clarifyGuide:
      "Temperance’s advice is about pace: healing happens through gentle adjustments, not big overhauls. Choose one small habit that supports you and practise it a little each day.",
    chat: [
      "That sounds tiring. Temperance would remind you that balance is not perfection—it is coming back to centre again and again. What helps you feel even a little steadier?",
      "I hear you. When everything feels like too much, the kindest step is often the smallest one. What could you take off your plate today?",
    ],
    positions: [
      [
        "What you have been carrying: {card}, a sign of {keyword}.",
        "The past few weeks were shaped by {card} and {keyword}.",
      ],
      [
        "Your energy right now reflects {card} and {keyword}.",
        "In body and mind today, {card} brings {keyword} to the surface.",
      ],
      [
        "As you heal, {card} points toward {keyword}.",
        "Balance may return through {keyword}, the gift of {card}.",
      ],
    ],
    challenge: [
      "Be careful not to treat rest as something you must earn.",
      "Notice if you are trying to fix everything at once.",
    ],
    action: [
      "Tonight, choose one calming ritual—a warm shower, a short walk, or ten minutes without screens—and protect it.",
      "Plan tomorrow with one built-in pause, and treat it as an appointment with yourself.",
    ],
    followups: [
      "How to stay balanced?",
      "What does my body need now?",
      "How can I rest without guilt?",
    ],
    advice: [
      "Notice the first sign of tiredness and respond early, rather than waiting for exhaustion.",
      "Swap one draining habit for a gentler one this week.",
      "Let rest be part of the plan, not a reward at the end.",
    ],
  },
  dream: {
    card: 18,
    name: "The Moon",
    short: "Moon",
    theme: "dreams and the subconscious",
    label: "Ask Moon about your dreams",
    blurb:
      "Mysterious and intuitive, the Moon guides you through dreams and hidden feelings to hear what your subconscious says.",
    ready: [
      "Dreams like this often carry feelings we have not named yet. The Moon can help you listen to what yours might be saying.",
      "Thank you for sharing your dream. The Moon is at home in the in-between places, where images speak before words do.",
    ],
    clarify:
      "I’m here with you. What do you remember most from the dream—a place, a person, or a feeling? Share a little more, or draw with the question as it is.",
    points: [
      [
        "Write It Down",
        "Capture the dream as soon as you wake, even in fragments.",
      ],
      [
        "Follow the Feeling",
        "The emotion in a dream often matters more than the plot.",
      ],
      [
        "Look for Echoes",
        "Ask where that feeling shows up in your waking life.",
      ],
      [
        "Trust Your Intuition",
        "Your first sense of what it means is worth noting.",
      ],
    ],
    more: [
      ["Set an Intention", "Before sleep, ask your mind one gentle question."],
      [
        "Notice Symbols",
        "Recurring places or objects may be pointing at something.",
      ],
      [
        "Be Patient with Mystery",
        "Not every dream needs to be solved at once.",
      ],
    ],
    clarifyGuide:
      "The Moon’s advice is to listen before you interpret. Notice the strongest feeling in your dream, then ask where you have felt it recently while awake—that is usually where the message lives.",
    chat: [
      "That is a vivid image. The Moon would ask how the dream made you feel when you woke up—often that feeling is the real message.",
      "I hear you. Recurring dreams can be the subconscious knocking a little louder. Has anything in your waking life felt similar lately?",
    ],
    positions: [
      [
        "Beneath the dream, {card} hints at {keyword}.",
        "What the dream draws from: {card}, a memory of {keyword}.",
      ],
      [
        "In your waking life now, {card} reflects {keyword}.",
        "The feeling behind the dream today is shaped by {card} and {keyword}.",
      ],
      [
        "As the dream unfolds, {card} points toward {keyword}.",
        "What your subconscious may be preparing: {card}, with its theme of {keyword}.",
      ],
    ],
    challenge: [
      "Be careful not to read the dream as a literal prediction.",
      "Notice if you are dismissing a feeling because it seems irrational.",
    ],
    action: [
      "Keep a notebook by your bed for the next three nights and write down the first feeling you wake with.",
      "Before sleep tonight, take three slow breaths and ask yourself one question about this dream.",
    ],
    followups: [
      "What is my dream telling me?",
      "Why does this dream keep returning?",
      "How can I listen to my intuition?",
    ],
    advice: [
      "Pay attention to the moment in the dream where your feeling changes—that turning point is often the key.",
      "Compare the dream’s mood with how you have felt this week.",
      "Treat your intuition like a quiet friend: listen first, judge later.",
    ],
  },
};

export const guideIds = Object.keys(guides);
export const guideFor = (id) => guides[id] || guides.general;
export const pick = (list, variant = 0) =>
  list[((variant % list.length) + list.length) % list.length];
export const possessive = (name) =>
  name.endsWith("s") ? `${name}’` : `${name}’s`;
