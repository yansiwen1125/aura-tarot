// Offline conversation simulator. No model, network request, or hidden memory.
// Context is derived only from this session's user messages, so reloads are reproducible.
import { guides, guideFor, pick } from "./content.js";

const controls =
  /^(?:我想抽三张牌[。.]?|我想先继续聊聊[。.]?|I want to choose tarot cards\.?|No, I want to chat with you|Yes, I do|More .+ guidance|Clarify .+ advice)$/i;
const promptChips = new Set([
  ...Object.values(guides).flatMap((g) => g.followups),
  "What is one concrete step I can take?",
  "Can you explain the Now card?",
  "What should I watch out for in this spread?",
  "可以给我一个具体的行动计划吗？",
  "现在位的牌具体是什么意思？",
  "这组牌提醒我留意什么？",
]);
const isControl = (text) => controls.test(text) || promptChips.has(text);
const meta =
  /记得|说过什么|刚才说|前面说|remember|what did i (?:say|tell)|what have i told|具体|详细|简单|简短|没听懂|不明白|换个|什么意思|不是|不对|谢谢|感谢|怎么办|怎么做|然后呢|继续|more|clarify|explain|shorter|simpler|summari[sz]e|plan|steps|thank|what next|what should i do|how do i start|how can i start/i;
const greeting = /^(?:hi|hello|hey|你好|嗨|在吗|哈喽)[!！?.。\s]*$/i;
const chinese = (text) => /[\u3400-\u9fff]/u.test(text);
const shorten = (text) =>
  Array.from(text.trim()).slice(0, 64).join("") +
  (Array.from(text.trim()).length > 64 ? "…" : "");
const activeGuide = (s) =>
  s.guide === "magician"
    ? "career"
    : ["general", "career", "love", "wellness", "dream"].includes(s.guide)
      ? s.guide
      : s.topic;
const zhNames = [
  "愚者",
  "魔术师",
  "女祭司",
  "皇后",
  "皇帝",
  "教皇",
  "恋人",
  "战车",
  "力量",
  "隐者",
  "命运之轮",
  "正义",
  "倒吊人",
  "死神",
  "节制",
  "恶魔",
  "高塔",
  "星星",
  "月亮",
  "太阳",
  "审判",
  "世界",
];
const zhMeaning = [
  [
    "给新的可能性留一点空间，先试一步，再决定是否继续。",
    "好奇可以保留，但行动前先确认信息和可承受的代价。",
  ],
  [
    "把已经拥有的能力、资源和帮助组织起来，变成一次具体行动。",
    "不要把“还没完全准备好”当成不能开始；先把力气集中在一件事上。",
  ],
  [
    "给自己一点安静，分清自己的感受与外界的期待。",
    "直觉值得听见，也需要用已经知道的事实来核对。",
  ],
  [
    "让照顾、时间和支持成为行动的一部分，而不只是要求自己付出。",
    "留意是否一直在照顾别人，却把自己的需要放在最后。",
  ],
  [
    "建立一个可执行的边界或安排，让局面更清晰。",
    "检查某个过于严格的标准，是否已经不适合眼前的现实。",
  ],
  [
    "辨认真正认可的价值，再判断他人的建议是否适合自己。",
    "允许自己质疑沿用已久的规则，不必因为别人都这样就照做。",
  ],
  [
    "让选择与你真正重视的需要一致，并给双方表达的空间。",
    "看看口头期待、实际行动和内心需要之间，有没有不一致。",
  ],
  [
    "选定一个能控制的方向，再把目标拆成眼前一步。",
    "先重新确认方向，别用不断忙碌来替代选择。",
  ],
  [
    "用耐心承接不安，温和而明确地表达自己的需要。",
    "勇气也包括承认疲惫，不必一直靠硬撑证明自己。",
  ],
  [
    "暂时放下别人的判断，给自己一点独立整理的时间。",
    "如果反复思考已经变成封闭自己，可以引入一个可信的外部视角。",
  ],
  [
    "环境可能在变化，先抓住自己仍能影响的一件事。",
    "变化不明朗时，用一个稳定的小安排帮助自己落地。",
  ],
  [
    "把已经发生的事实与自己的推测分开，再做判断。",
    "审视自己是否背负了并不公平的评价标准。",
  ],
  [
    "允许自己暂停，从另一个角度理解现在的处境。",
    "留意等待是在争取空间，还是让重要的行动一再推迟。",
  ],
  [
    "让一个旧阶段慢慢结束，为新的安排腾出位置。",
    "放下可以是渐进的，不需要用一次激烈决定完成所有改变。",
  ],
  [
    "通过小幅调整，让两个相互拉扯的需要都得到一点照顾。",
    "节奏可能需要重新校准，先从一个最基本的需要开始。",
  ],
  [
    "辨认反复限制自己的习惯或期待，而不是责备自己。",
    "用一个小边界松动旧模式，给自己增加选择。",
  ],
  [
    "当原有判断受到挑战时，回到可靠的信息，重新确认基础。",
    "先处理真正需要关注的部分，避免仓促做出剧烈变化。",
  ],
  [
    "寻找一个能反复回到的小支持，让信心慢慢积累。",
    "希望不需要立刻变成乐观，先做一件照顾自己的小事。",
  ],
  [
    "承认不确定的感受，但不要把它当成已经发生的事实。",
    "给模糊的感觉一点时间，并用实际信息核对猜测。",
  ],
  [
    "留意让你感到轻松或有活力的事，并给它一点位置。",
    "不需要先证明自己足够好，才允许自己轻松一下。",
  ],
  [
    "整理已经学到的经验，用它支持下一次选择。",
    "把复盘与自责分开，过去的决定不需要定义现在的你。",
  ],
  [
    "先承认已经完成的一部分，再决定下一阶段的重点。",
    "允许仍有未完成的细节，已经取得的进展仍然成立。",
  ],
];

// Situation-specific lenses, questions and doable actions. Each row is a bilingual pair.
const scenarios = [
  {
    id: "jobsearch",
    topic: "career",
    re: /求职|找工作|投递|简历|招聘|面试|offer|job search|job hunt|looking for (?:a )?job|resume|interview|application/i,
    label: ["求职进展", "your job search"],
    frame: [
      "你想知道的不只是结果，也是在等反馈的这段时间，还能做些什么。",
      "You are looking for a result, but also for something you can do while feedback is uncertain.",
    ],
    question: [
      "现在卡在投递没回应、面试，还是拿到机会后的选择？",
      "Where is the bottleneck: getting replies, interviews, or choosing between opportunities?",
    ],
    actions: [
      [
        "挑一份最近想投的职位，只标出它最看重的三项能力。",
        "Choose one role and mark its three most important requirements.",
      ],
      [
        "给每项能力配一个真实案例，把你做了什么、结果是什么各写一句。",
        "Match each requirement with one real example of what you did and what changed.",
      ],
      [
        "先改好这一份申请，再记录反馈，暂时不把单次结果当成对自己的评价。",
        "Improve that one application and track feedback without treating one outcome as a verdict on your worth.",
      ],
    ],
    lens: [
      [
        "看看之前的尝试留下了哪些可复用的经验。",
        "Look for useful evidence from earlier applications.",
      ],
      [
        "把注意力放在能改善的一次申请或一次沟通上。",
        "Focus on one application or conversation you can improve.",
      ],
      [
        "把下一步当成验证方向的实验，而不是必须成功的考试。",
        "Treat the next step as a test of direction, rather than a verdict.",
      ],
    ],
  },
  {
    id: "workload",
    topic: "career",
    re: /加班|老板|领导|同事|工作压力|忙不过|工作量|绩效|burnout at work|boss|manager|workload|deadline|overwork|work pressure/i,
    label: ["工作里的压力与边界", "pressure and boundaries at work"],
    frame: [
      "任务很多时，很容易把“完成不了”理解成“我不够好”；我们可以先看任务与资源是否匹配。",
      "When demands pile up, an overloaded schedule can start to feel like a personal failure. It helps to look at the demands and resources separately.",
    ],
    question: [
      "最消耗你的是任务量、优先级不清，还是和某个人的相处？",
      "What is draining you most: volume, unclear priorities, or a particular interaction?",
    ],
    actions: [
      [
        "把手头任务写下来，标出真正有截止时间的两项。",
        "List the tasks and mark the two with real deadlines.",
      ],
      [
        "向相关的人确认：“如果这两件事冲突，哪件优先？”",
        "Ask the relevant person which task takes priority if the two conflict.",
      ],
      [
        "为一项新增任务说明取舍：“可以接，但原来的哪项需要延后？”",
        "For a new request, ask which existing task should move back to make room.",
      ],
    ],
    lens: [
      [
        "分清哪些压力来自任务，哪些来自对自己的要求。",
        "Separate workload from the expectations you place on yourself.",
      ],
      [
        "先让优先级可见，再决定把精力放在哪里。",
        "Make priorities visible before deciding where to spend your energy.",
      ],
      [
        "观察明确一次边界后，节奏是否有所变化。",
        "Notice whether one clear boundary changes the pace.",
      ],
    ],
  },
  {
    id: "distance",
    topic: "love",
    re: /不回|不回复|冷淡|忽冷忽热|消息|联系少|不联系|不理我|忽视|reply|replies|distant|mixed signals|ghost|texting|not text/i,
    label: ["联系中的距离感", "distance in this connection"],
    frame: [
      "回复变少会让人想填补空白，但现在能确认的是沟通发生了变化，还不能直接知道对方在想什么。",
      "Less contact leaves space for worry. What you can observe is a change in communication; their reasons are still uncertain.",
    ],
    question: [
      "这是最近才出现的变化，还是你们一直有不同的联系节奏？",
      "Is this a recent change, or have your communication rhythms always differed?",
    ],
    actions: [
      [
        "分两列写下具体发生的事和自己的猜测，例如“隔天回复”和“已经不在乎我”。",
        "Separate an observation such as a next-day reply from an interpretation such as “they do not care.”",
      ],
      [
        "选一个平静的时机表达：“最近联系少了，我有些不确定，想知道你的感受。”",
        "At a calm moment, describe the change and ask how they are feeling without assigning a motive.",
      ],
      [
        "表达后给对方回应的空间，同时观察行动是否持续回应你的需要。",
        "Allow space for an answer and observe whether their actions consistently meet your needs.",
      ],
    ],
    lens: [
      [
        "回看你们原有的相处节奏，判断变化在哪里。",
        "Compare this with the rhythm you had before.",
      ],
      [
        "用事实和一次清楚的表达替代反复猜测。",
        "Use an observation and a clear request instead of repeated guessing.",
      ],
      [
        "更值得观察的是持续的回应，而非一次快慢。",
        "Look for consistency rather than the speed of one reply.",
      ],
    ],
  },
  {
    id: "breakup",
    topic: "love",
    re: /分手|复合|前任|失恋|break.?up|ex partner|reconcil|getting back/i,
    label: ["关系结束与是否重来", "an ending and whether to reconnect"],
    frame: [
      "想念一个人，和重新开始是否适合自己，是两个可以分开看待的问题。",
      "Missing someone and deciding whether to restart the relationship are two different questions.",
    ],
    question: [
      "你更想念那个人本身，还是关系曾带来的熟悉和陪伴？",
      "Do you miss this person, or the familiarity and companionship the relationship gave you?",
    ],
    actions: [
      [
        "写下最想念的一件事，以及关系中最难承受的一件事。",
        "Write down one thing you miss and one thing that was difficult to live with.",
      ],
      [
        "问自己：导致结束的问题，有什么已经发生的改变，而不只是承诺？",
        "Identify what has actually changed about the reason things ended, beyond promises.",
      ],
      [
        "先决定一个保护自己的边界，再考虑是否联系。",
        "Choose a boundary that protects you before deciding whether to make contact.",
      ],
    ],
    lens: [
      [
        "承认这段关系带来的意义，也承认当时的困难。",
        "Acknowledge both what mattered and what was difficult.",
      ],
      [
        "把想念与重启关系需要的条件分开。",
        "Separate longing from the conditions needed to restart.",
      ],
      [
        "把注意力放在可观察的改变上，不替对方预设承诺。",
        "Look for observable change rather than assuming a commitment.",
      ],
    ],
  },
  {
    id: "rest",
    topic: "wellness",
    re: /失眠|睡不着|睡眠|熬夜|疲惫|累|精疲力尽|sleep|insomnia|exhaust|tired|drained|rest without/i,
    label: ["疲惫与休息", "fatigue and recovery"],
    frame: [
      "先不用把恢复也变成一项必须完成的任务，我们可以从今天少消耗一点开始。",
      "Recovery does not have to become another task to perform well. Start with one source of strain you can reduce today.",
    ],
    question: [
      "更困扰你的是停不下来，还是已经休息却仍觉得疲惫？",
      "Is it harder to slow down, or do you still feel depleted after resting?",
    ],
    actions: [
      [
        "从今天的安排里找出一件可以推迟或缩小的事。",
        "Choose one thing today that can be postponed or made smaller.",
      ],
      [
        "给自己留一小段不处理任务和消息的时间。",
        "Protect a short period without tasks or messages.",
      ],
      [
        "记录这次调整后自己的感受，再决定明天是否继续。",
        "Notice how you feel after the adjustment before deciding what to repeat tomorrow.",
      ],
    ],
    lens: [
      [
        "留意长期的消耗，而不是只责备今天状态不好。",
        "Notice accumulated demands rather than judging one difficult day.",
      ],
      [
        "回应一个最基本的需要，先不追求全面改变。",
        "Respond to one basic need instead of attempting a complete reset.",
      ],
      [
        "寻找能持续的小节奏，不要求立刻恢复到最佳状态。",
        "Look for a sustainable rhythm rather than an instant return to full capacity.",
      ],
    ],
  },
  {
    id: "dream",
    topic: "dream",
    re: /梦|噩梦|dream|nightmare/i,
    label: ["梦里的感受", "the feeling in your dream"],
    frame: [
      "我不会把梦当成将发生的预告；更有用的线索是，哪个画面或感受一直留在你心里。",
      "I would not treat the dream as a forecast. A more useful clue is the image or feeling that stayed with you.",
    ],
    question: [
      "醒来后最明显的是害怕、失落、轻松，还是别的感觉？",
      "What stayed with you on waking: fear, sadness, relief, or something else?",
    ],
    actions: [
      [
        "只记下最清楚的一个画面，不急着给每个符号找答案。",
        "Write down one clear image without trying to decode every symbol.",
      ],
      [
        "给当时的感受取一个名字，再看看最近何时也有过它。",
        "Name the feeling and notice when you have felt something similar while awake.",
      ],
      [
        "如果找不到联系，先把它保留为一个问题，不必勉强解释。",
        "If no connection appears, leave it as a question rather than forcing an explanation.",
      ],
    ],
    lens: [
      [
        "寻找这个感受与近期经历之间可能的联系。",
        "Look for possible links with recent experiences.",
      ],
      [
        "把梦中的情绪与醒来后的事实区分开。",
        "Distinguish the emotion in the dream from facts in waking life.",
      ],
      [
        "让记录帮助你观察变化，而不是增加对预兆的担心。",
        "Use notes to observe changes, rather than to search for omens.",
      ],
    ],
  },
  {
    id: "decision",
    topic: "general",
    re: /选择|决定|纠结|犹豫|辞职|跳槽|转行|要不要|二选一|choose|choice|decision|quit|resign|change career|switch/i,
    label: ["一个难做的选择", "a difficult choice"],
    frame: [
      "可以先不急着选对，把每个选项的需要、代价和可逆性弄清楚，选择会具体一些。",
      "Before finding the “right” answer, clarify what each option serves, what it costs, and how reversible it is.",
    ],
    question: [
      "这几个选项里，你最不想失去的是什么？",
      "What matters most to preserve across the options?",
    ],
    actions: [
      [
        "写下每个选项满足的一个需要和最担心的一个代价。",
        "Write down one need each option serves and one cost you worry about.",
      ],
      [
        "区分哪些信息已经确认，哪些还可以通过沟通或尝试获得。",
        "Separate confirmed facts from questions you can still investigate.",
      ],
      [
        "先做一次小范围、可撤回的尝试，再决定是否投入更多。",
        "Try a small, reversible step before committing further.",
      ],
    ],
    lens: [
      [
        "看看以往的选择中，哪些标准仍然适合你。",
        "Notice which standards from earlier choices still fit.",
      ],
      [
        "先补齐一个会影响决定的信息缺口。",
        "Fill one information gap that could change the decision.",
      ],
      [
        "给决定留出复查点，允许根据新信息调整。",
        "Set a review point so new information can change the plan.",
      ],
    ],
  },
];
const defaults = {
  general: {
    label: ["你目前的方向", "your current direction"],
    question: [
      "最近哪件事最占据你的心思？",
      "What has been taking up the most space in your mind?",
    ],
  },
  career: {
    label: ["工作的下一步", "your next step at work"],
    question: [
      "你现在最需要的是明确方向、获得机会，还是减轻压力？",
      "Do you most need direction, an opportunity, or less pressure?",
    ],
  },
  love: {
    label: ["关系里的需要", "your needs in this connection"],
    question: [
      "你希望这段关系多一点什么？",
      "What would you like more of in this connection?",
    ],
  },
  wellness: {
    label: ["自己的状态", "how you have been feeling"],
    question: ["今天哪一部分最需要被照顾？", "What most needs care today?"],
  },
  dream: {
    label: ["内心的感受", "what has been on your mind"],
    question: [
      "哪个画面或感受最让你在意？",
      "Which image or feeling matters most to you?",
    ],
  },
};

export function conversationContext(s, prompt = "") {
  const messages = (s.messages || []).filter(
    (m) => m.role === "user" && !isControl(m.text),
  );
  let utterances = messages.map((m) => m.text);
  if (prompt && !isControl(prompt) && utterances.at(-1) !== prompt)
    utterances.push(prompt);
  if (!utterances.length && s.question) utterances = [s.question];
  const corrected = utterances.map((t) =>
    t.replace(
      /^[\s\S]*?(?:不是[\s\S]*?而是|其实是|我说的是|I mean|actually it'?s)\s*/i,
      "",
    ),
  );
  const hasDetail = (t) =>
    /[0-9一二三四五六七八九十]+(?:个?月|年|天|周)|我(?:最近|已经|现在|觉得|其实|在)|对方|他|她|my |i (?:have|am|feel|was)|it has been/i.test(
      t,
    );
  const concrete = corrected.filter(
    (t) =>
      !greeting.test(t) &&
      !/^(?:现在位|过去位|未来位|这组牌|这张牌)/.test(t) &&
      (!meta.test(t) || scenarios.some((x) => x.re.test(t)) || hasDetail(t)) &&
      t.length > 4,
  );
  const facts = concrete.length
    ? concrete
    : corrected.filter((t) => !greeting.test(t) && !meta.test(t));
  const explicit = utterances.at(-1) || prompt;
  const lang = /用英文|英语回答|in english/i.test(explicit)
    ? "en"
    : /用中文|中文回答|in chinese/i.test(explicit)
      ? "zh"
      : chinese(facts.at(-1) || s.question || explicit)
        ? "zh"
        : "en";
  const zh = lang === "zh",
    ix = zh ? 0 : 1,
    guide = activeGuide(s);
  let situation;
  for (const fact of [...facts].reverse()) {
    situation = scenarios.find((x) => x.re.test(fact));
    if (situation) break;
  }
  if (!situation) {
    const d = defaults[guide] || defaults.general;
    const g = guideFor(guide);
    situation = {
      id: guide,
      topic: guide,
      ...d,
      frame: [
        "可以把这个大问题拆成“我在意什么”和“我能做什么”两部分。",
        "We can separate what matters to you from what you can act on.",
      ],
      actions: g.points
        .slice(0, 3)
        .map((p, i) => [
          [
            "把最在意的一件事写清楚，暂时不用解决全部问题。",
            "区分你能影响的部分和需要他人回应的部分。",
            "选择一个今天能做的小步骤，之后再看它是否有帮助。",
          ][i],
          p[1],
        ]),
      lens: [
        [
          "留意过去的经历如何影响眼前的期待。",
          "Notice how earlier experiences shape your expectations.",
        ],
        [
          "把注意力放回现在能观察和调整的部分。",
          "Return to what you can observe and adjust now.",
        ],
        [
          "用一次小行动收集反馈，再决定下一步。",
          "Use one small action to learn before deciding what comes next.",
        ],
      ],
    };
  }
  if (
    situation.id === "jobsearch" &&
    /没有回复|没有回应|没回复|没回应|没消息|no replies|no responses/i.test(
      facts.join(" "),
    )
  )
    situation = {
      ...situation,
      question: [
        "你主要在投什么岗位？简历里有没有一个能直接对应岗位要求的项目案例？",
        "Which roles are you targeting, and does your application show a concrete example that matches their requirements?",
      ],
    };
  return {
    lang,
    zh,
    ix,
    guide,
    situation,
    facts,
    focus: situation.label[ix],
    question: situation.question[ix],
    quote: facts.at(-1) ? shorten(facts.at(-1)) : "",
  };
}
const line = (pair, c) => pair[c.ix];
const steps = (c) =>
  c.situation.actions.map((p, i) => `${i + 1}. ${line(p, c)}`).join("\n");
export function cardDescription(card, zh = false) {
  if (!zh)
    return `${card.name}${card.reversed ? " (Reversed)" : " (Upright)"}: ${card.reversed ? card.reversedMeaning : card.upright}`;
  return `${zhNames[card.id]}（${card.reversed ? "逆位" : "正位"}）：${zhMeaning[card.id][card.reversed ? 1 : 0]}`;
}
function relevantCard(cards, prompt) {
  const named = cards.findIndex(
    (c) =>
      prompt.toLowerCase().includes(c.name.toLowerCase()) ||
      prompt.includes(zhNames[c.id]),
  );
  if (named >= 0) return named;
  return /过去|之前|past|before/i.test(prompt)
    ? 0
    : /未来|下一|接下来|future|next|will/i.test(prompt)
      ? 2
      : 1;
}
export function simulatedReply(
  s,
  prompt = "",
  kind = "chat",
  variant = 0,
  cards = [],
) {
  const c = conversationContext(s, prompt),
    g = guideFor(c.guide),
    zh = c.zh;
  const previous = (s.messages || [])
    .filter((m) => m.role === "assistant")
    .map((m) => m.text);
  // Rebuilding an earlier reply must never see later user messages (core supplies a prefix).
  const n = variant + previous.length;
  const anchor = c.quote
    ? zh
      ? `你提到“${c.quote}”。`
      : `You mentioned “${c.quote}”. `
    : "";
  const lead = pick(
    zh
      ? [
          "我们先把这件事放慢一点看。",
          "我想先回应你最在意的部分。",
          "这次我们可以换一个更具体的角度。",
        ]
      : [
          "Let’s take this one step at a time.",
          "Let’s focus on the part that matters most to you.",
          "We can make this more concrete.",
        ],
    n,
  );
  const action = line(
    c.situation.actions[
      (variant + previous.length) % c.situation.actions.length
    ],
    c,
  );
  let detail = c.situation.frame[c.ix];
  const voice = {
    general: [
      "先保留一点尝试的余地，不必马上确定全部答案。",
      "Leave room for a small experiment before committing to the whole path.",
    ],
    career: [
      "把注意力放在已有的能力和能验证的下一步上。",
      "Connect a skill you already have with one step you can test.",
    ],
    love: [
      "先照顾真实的需要，再看怎样向对方表达。",
      "Start with what you need, then consider how to express it.",
    ],
    wellness: [
      "先选一个负担更小的调整，不要求自己一次恢复。",
      "Choose a smaller adjustment without expecting an instant reset.",
    ],
    dream: [
      "先听见画面带来的感受，不急着替它下结论。",
      "Notice the feeling the image brings before deciding what it means.",
    ],
  }[c.guide];
  if (
    /能力不够|不够好|没用|没价值|not good enough|not capable|worthless/i.test(
      prompt,
    )
  )
    detail = zh
      ? "迟迟没有得到想要的反馈，很容易开始怀疑自己。但眼下的结果还不足以评价你整个人；我们可以先找一个具体环节来核对，而不是把所有原因都归到能力上。"
      : "A lack of feedback can turn into self-doubt. It does not give enough information to judge your overall ability; let’s examine one specific part of the process.";
  if (
    /记得|说过什么|刚才说|前面说|remember|what did i (?:say|tell)|what have i told/i.test(
      prompt,
    )
  ) {
    const remembered = c.facts
      .slice(-2)
      .map((t) => `“${shorten(t)}”`)
      .join(zh ? "；" : " and ");
    return remembered
      ? zh
        ? `记得，在这段对话里你提到：${remembered}。\n我们可以继续围绕${c.focus}，不用从头说。你想先接着哪一部分聊？`
        : `In this conversation you mentioned ${remembered}.\nWe can keep working on ${c.focus}. Which part would you like to return to?`
      : zh
        ? "这段对话里你还没有讲到具体的处境。你愿意从现在最在意的一件事说起吗？"
        : "You have not shared a specific situation in this conversation yet. What would you like me to understand first?";
  }
  if (greeting.test(prompt))
    return zh
      ? `你好，我在。我会用${zhNames[g.card]}的视角陪你整理想法。\n${c.question}`
      : `Hi, I’m here. We can use ${g.name} as a lens for reflection.\n${c.question}`;
  if (/^(谢谢|感谢|thank you|thanks)[!！.。\s]*$/i.test(prompt))
    return zh
      ? "不客气。刚才有哪一点对你有用，可以先留住它；暂时没有答案的部分，我们也可以慢慢聊。"
      : "You’re welcome. Keep whichever part felt useful; we can take the unanswered parts slowly.";
  if (
    /^(?:我也?不知道|不知道|说不清|还没想好|i don.?t know|not sure)[。.!！\s]*$/i.test(
      prompt,
    )
  )
    return zh
      ? `没关系，先不用讲得很完整。我们只选一个方向：${c.question}`
      : `That is okay; you do not need a complete explanation. ${c.question}`;
  if (
    /^(?:我想|我要|可以)?(?:抽牌|选牌)|^(?:let.?s|i want to) draw/i.test(prompt)
  )
    return zh
      ? "好，就带着你目前的问题选三张牌。它们会分别作为过去、现在和接下来方向的观察角度。"
      : "Let’s draw three cards with your question in mind, looking at the past, the present, and a possible direction forward.";
  if (
    /你是.*ai|真人|真实.*ai|接了.*模型|are you (?:an? )?ai|real model|real person/i.test(
      prompt,
    )
  )
    return zh
      ? "我是 Aura 的本地模拟对话，会根据这段对话里的信息和抽到的牌组织回应，目前没有连接真实 AI 模型。你可以继续补充处境，我会在这个范围内帮你梳理。"
      : "This is Aura’s local conversation simulator. I use this conversation and the selected cards to compose replies; no live AI model is connected.";
  if (
    /天气|股票价格|今日新闻|写代码|weather|stock price|latest news|write (?:me )?code/i.test(
      prompt,
    )
  )
    return zh
      ? "我这里没有实时查询或通用问答能力，不能可靠地回答这个问题。如果它和你眼下的一个选择有关，你可以说说具体的困扰，我们可以从这个部分继续。"
      : "I cannot look up live information or handle general-purpose tasks here. If this relates to a choice you are facing, tell me that part and we can reflect on it.";
  if (
    /(?<!是)不是|^不对|你.*(?:不准确|误解|听错)|not what i|you misunderstood|that'?s wrong/i.test(
      prompt,
    )
  )
    return zh
      ? `谢谢你纠正我，我先不沿用刚才的理解。${c.quote ? `按你这次补充的“${c.quote}”，我们重新看。` : ""}\n${c.question}`
      : `Thank you for correcting me. I will set the earlier interpretation aside.${c.quote ? ` Taking your update, “${c.quote}”, as the starting point:` : ""}\n${c.question}`;
  if (
    /简单|简短|一句话|太长|shorter|simpler|one sentence|summari[sz]e/i.test(
      prompt,
    )
  )
    return zh
      ? `简单说：先围绕${c.focus}做一件能验证现实的小事。${action}`
      : `The short version: take one small step that gives you useful information about ${c.focus}. ${action}`;
  if (
    /具体|怎么做|怎么办|计划|步骤|行动|第一步|plan|steps|what should i do|how do i start|how can i start|next move|where should i begin/i.test(
      prompt,
    ) &&
    !/什么意思|解释.*牌|牌.*解释|explain|what.*mean/i.test(prompt)
  ) {
    const card = cards.length === 3 ? cards[relevantCard(cards, prompt)] : null;
    return `${zh ? `可以，我们把${c.focus}拆成接下来能做的三步。` : `Let’s turn ${c.focus} into three manageable steps.`}\n${steps(c)}${variant % 2 ? (zh ? "\n先完成第一步就好，得到一点反馈后，再决定后两步的节奏。" : "\nStart with the first step and use what you learn to set the pace for the next two.") : ""}${card ? `\n\n${zh ? "放回你的牌阵里，" : "In your spread, "}${cardDescription(card, zh)}` : ""}`;
  }
  if (
    /没听懂|不明白|什么意思|为什么|换个|clarify|explain|what.*mean|why/i.test(
      prompt,
    )
  ) {
    const card = cards.length === 3 ? cards[relevantCard(cards, prompt)] : null;
    return `${zh ? "我换一种说法。" : "Let me put it another way. "}${card ? cardDescription(card, zh) : detail}\n\n${zh ? `放到${c.focus}这件事上，可以先这样做：` : `For ${c.focus}, this could look like: `}${action}\n${c.question}`;
  }
  if (
    /一定|肯定|会不会|多久|什么时候|能不能成功|will i|will they|when will|guarantee/i.test(
      prompt,
    )
  )
    return `${anchor}${zh ? "我没法确定一个未来结果或时间点，也不会用牌替你做承诺。我们可以把问题改成：什么变化会让事情更接近你想要的方向？" : "I cannot promise an outcome or a date. A more useful question is what would move things closer to the direction you want."}\n\n${cards.length === 3 ? cardDescription(cards[2], zh) + "\n" : ""}${action}\n${c.question}`;
  const emotion =
    /焦虑|害怕|担心|难过|失落|紧张|anxious|afraid|worr|sad|nervous/i.test(
      prompt,
    )
      ? zh
        ? "你提到的这份不安可以先被看见，不需要马上逼自己乐观。"
        : "There is room for the worry you described; you do not have to force a positive interpretation. "
      : "";
  if (cards.length === 3) {
    const pos = relevantCard(cards, prompt),
      card = cards[pos];
    return `${lead}\n${anchor}${emotion}\n${zh ? ["过去位", "现在位", "未来位"][pos] : ["Past", "Now", "Future"][pos]} · ${cardDescription(card, zh)}\n\n${line(c.situation.lens[pos], c)} ${action}\n${c.question}`;
  }
  if (kind === "clarify" && !c.quote) return `${lead}\n${c.question}`;
  const turn = c.facts.length;
  const closing =
    kind === "ready" && turn === 1
      ? zh
        ? "你可以再说一点细节；也可以带着这个问题选三张牌，看看有哪些值得留意的角度。"
        : "You can share a little more, or draw three cards to explore a few angles on this question."
      : c.question;
  return `${lead}\n${anchor}${emotion}${detail}${c.situation.id === c.guide ? " " + line(voice, c) : ""}\n\n${kind === "guidance" || kind === "chat" ? `${zh ? "**先试一个小步骤：**" : `${g.name} — **One small step:** `}${action}\n` : ""}${closing}`;
}

export function simulatedReading(s, cards, variant = 0) {
  const c = conversationContext({
      ...s,
      messages: s.messages.filter((m) => !m.afterReading),
    }),
    zh = c.zh;
  return {
    intro: zh
      ? `这次围绕${c.focus}${c.quote ? `（你提到“${c.quote}”）` : ""}来读牌。把它看成三个观察角度，未来位表示可以关注的方向，不是确定的结果。`
      : `This reading focuses on ${c.focus}${c.quote ? `, including your words “${c.quote}”` : ""}. The three positions are perspectives; the future card is a direction to explore, not a fixed outcome.`,
    steps: cards.map((card, i) => ({
      title: ["Past", "Now", "Future"][i],
      text: `${cardDescription(card, zh)} ${line(c.situation.lens[i], c)}${variant % 2 ? ` ${line(c.situation.actions[i], c)}` : ""}`,
    })),
    challenge: zh
      ? `在${c.focus}上，留意不要把不确定当成对自己的定论。${zhMeaning[cards[1].id][cards[1].reversed ? 1 : 0]} ${cards.some((x) => x.reversed) ? "逆位提示的是调整空间，不是失败。" : "牌之间的差异，也可以帮助你分清感受与行动。"}`
      : `For ${c.focus}, avoid treating uncertainty as a verdict on yourself. ${cards[1].reversed ? cards[1].reversedMeaning : cards[1].upright} Look for an adjustment you can make rather than a prediction you must accept.`,
    action:
      (zh ? "接下来可以做：" : "A next step: ") +
      line(c.situation.actions[variant % c.situation.actions.length], c),
  };
}
export function suggestedFollowups(s) {
  const c = conversationContext(s);
  if (c.zh)
    return s.reading
      ? [
          "可以给我一个具体的行动计划吗？",
          "现在位的牌具体是什么意思？",
          "这组牌提醒我留意什么？",
        ]
      : ["我想再说一点细节", "能给我一个具体建议吗？", "换个角度帮我看看"];
  return s.reading
    ? [
        "What is one concrete step I can take?",
        "Can you explain the Now card?",
        "What should I watch out for in this spread?",
      ]
    : guideFor(c.guide).followups;
}
