const deck = [
  { n: "0", name: "愚人", en: "The Fool", symbol: "☄", keywords: "新开始、冒险、自由、未知", upright: "你正站在一个新阶段的入口。牌面不是让你盲目跳下去，而是提醒你：旧地图已经不够用了，新的路需要边走边确认。", reversed: "你想要自由，但可能还没准备好承担自由的后果。先补足现实条件，再谈出发。", advice: "今天先做一个小尝试，不要一下把全部筹码推出去。" },
  { n: "I", name: "魔术师", en: "The Magician", symbol: "✦", keywords: "启动、资源、表达、显化", upright: "你手上并不是没有工具，而是需要把想法变成动作。真正的转机来自主动表达和资源整合。", reversed: "能量有，但散了。也要警惕只说不做，或被漂亮话带偏。", advice: "列出你已经拥有的三样资源，并立刻使用其中一样。" },
  { n: "II", name: "女祭司", en: "The High Priestess", symbol: "☾", keywords: "直觉、秘密、等待、潜意识", upright: "答案还在水面下。现在不适合逼问结果，适合观察细节，听见你心里已经知道但还没承认的声音。", reversed: "你可能被焦虑盖住了直觉，越猜越乱。先让噪声降下来。", advice: "暂停追问外界，把真正让你不安的那一点写下来。" },
  { n: "III", name: "皇后", en: "The Empress", symbol: "✿", keywords: "丰盛、滋养、魅力、创造", upright: "这张牌带来柔软的生长力。你不需要用力证明价值，真正有生命力的东西会在被滋养后自然长出来。", reversed: "你可能把照顾别人放在自己前面，丰盛变成了消耗。", advice: "先照顾身体和感受，再处理关系或任务。" },
  { n: "IV", name: "皇帝", en: "The Emperor", symbol: "♜", keywords: "秩序、边界、责任、结构", upright: "局面需要结构。不是情绪不重要，而是没有边界和规则时，再深的感受也承接不住。", reversed: "控制欲或责任缺位正在影响局面。有人想掌控，却不一定愿意承担。", advice: "把条件、时间、底线说清楚。" },
  { n: "V", name: "教皇", en: "The Hierophant", symbol: "⚜", keywords: "承诺、传统、学习、价值观", upright: "这件事需要进入更正式的秩序：承诺、规则、学习或价值对齐。只靠感觉不够。", reversed: "你可能被旧规则困住，或者为了形式牺牲真实感受。", advice: "问问自己：我遵守的是价值，还是恐惧？" },
  { n: "VI", name: "恋人", en: "The Lovers", symbol: "♡", keywords: "选择、吸引、契约、价值一致", upright: "恋人不是桃花，是选择。牌面把重点放在价值是否一致，而不是短暂心动。", reversed: "吸引还在，但选择摇摆。关系或事件里可能存在价值冲突、犹豫或第三种诱惑。", advice: "别问哪个更诱人，问哪个更接近真实的你。" },
  { n: "VII", name: "战车", en: "The Chariot", symbol: "⟡", keywords: "推进、意志、突破、方向", upright: "能量正在向前。只要方向一致，你有机会突破卡住的局面。", reversed: "你可能冲得太快，或内心两股力量在拉扯，导致车轮打滑。", advice: "先统一方向，再加速。" },
  { n: "VIII", name: "力量", en: "Strength", symbol: "♌", keywords: "勇气、耐心、温柔控制、韧性", upright: "真正的力量不是硬压，而是能和情绪、欲望、恐惧共处。温柔在这里比强硬更有效。", reversed: "你可能在强装没事，或把脆弱压得太久，反而失控。", advice: "用一句温和但坚定的话表达你的需要。" },
  { n: "IX", name: "隐士", en: "The Hermit", symbol: "⚝", keywords: "独处、内省、真相、灯", upright: "你需要把灯拿回自己手里。外界声音越多，越要回到内在判断。", reversed: "独处可能变成逃避，沉默可能变成断联或自我封闭。", advice: "给自己一段安静时间，但不要彻底切断求助。" },
  { n: "X", name: "命运之轮", en: "Wheel of Fortune", symbol: "◎", keywords: "转机、周期、变化、机会", upright: "轮子正在转。外部变量会推动局面变化，顺势比硬抗更重要。", reversed: "你可能卡在旧循环里，用同样方式期待不同结果。", advice: "识别那个重复出现的模式，并换一个回应。" },
  { n: "XI", name: "正义", en: "Justice", symbol: "⚖", keywords: "公平、因果、契约、清算", upright: "事情需要回到事实、边界和责任。情绪可以被听见，但决定要建立在清晰之上。", reversed: "信息不对等或责任失衡正在制造不安。", advice: "把证据、承诺和责任列出来，不要只凭感觉判定。" },
  { n: "XII", name: "倒吊人", en: "The Hanged Man", symbol: "⇵", keywords: "暂停、换角度、等待、臣服", upright: "现在的卡住不是惩罚，而是旧视角不够用了。停一下，反而能看见新的解法。", reversed: "等待可能已经变成无意义拖延，你需要分清暂停和逃避。", advice: "换一个问题问自己：如果不急着赢，我能看见什么？" },
  { n: "XIII", name: "死神", en: "Death", symbol: "✧", keywords: "结束、转化、退场、重生", upright: "死神不是结束，是旧身份退场。某种旧模式已经无法继续维持。", reversed: "你知道该结束或改变，却还在拖着不放。", advice: "删掉一个已经失效的旧动作，为新阶段腾位置。" },
  { n: "XIV", name: "节制", en: "Temperance", symbol: "♒", keywords: "调和、疗愈、平衡、节奏", upright: "节制不是忍，是重新调匀。局面需要慢修复，而不是立刻要结果。", reversed: "能量失衡，节奏混乱。你可能在两个极端之间摆荡。", advice: "今天只做一件能让节奏回来的小事。" },
  { n: "XV", name: "恶魔", en: "The Devil", symbol: "♑", keywords: "执念、欲望、束缚、成瘾", upright: "恶魔不是外面来的，是你明知道痛还舍不得松手的那根链子。强吸引不等于健康连接。", reversed: "你正在看见束缚，也许已经开始松绑。", advice: "承认你被什么吸住，比假装不在乎更有力量。" },
  { n: "XVI", name: "高塔", en: "The Tower", symbol: "⚡", keywords: "崩塌、真相、破局、清醒", upright: "高塔不是毁灭，是假的东西撑不住了。真相来得突然，但它会清理虚假的安全感。", reversed: "崩塌被延迟，内部其实已经裂开。", advice: "别再粉饰裂缝，先处理最明显的问题。" },
  { n: "XVII", name: "星星", en: "The Star", symbol: "✩", keywords: "希望、疗愈、远方、信念", upright: "星星不是立刻好起来，是你终于重新相信远方。疗愈正在发生，只是速度很轻。", reversed: "你暂时看不见希望，但这不代表希望不存在。", advice: "给未来留一盏小灯，不要急着证明一切都好了。" },
  { n: "XVIII", name: "月亮", en: "The Moon", symbol: "☽", keywords: "迷雾、梦境、恐惧、潜意识", upright: "月亮不是答案，是迷雾。现在的信息不够清楚，恐惧和投射容易放大问题。", reversed: "迷雾开始散，但你需要时间消化浮上来的真相。", advice: "先别急着下结论，记录事实和想象的区别。" },
  { n: "XIX", name: "太阳", en: "The Sun", symbol: "☀", keywords: "清晰、快乐、公开、生命力", upright: "太阳让事情见光。关系、机会或状态有变明朗的趋势，真实比猜测更有力量。", reversed: "有光，但你可能接不住；好事被怀疑打了折。", advice: "把一件事说清楚、做明亮，不要再让它藏在阴影里。" },
  { n: "XX", name: "审判", en: "Judgement", symbol: "♬", keywords: "觉醒、复盘、重启、召唤", upright: "这不是简单回头，而是一次复盘和升级。旧事可能被唤醒，但必须用新方式回应。", reversed: "你听见了召唤，却还在拖延或逃避复盘。", advice: "诚实回答：如果重来一次，我会换哪种方式？" },
  { n: "XXI", name: "世界", en: "The World", symbol: "◌", keywords: "完成、整合、圆满、毕业", upright: "一个阶段正在完成。世界不是永远拥有，而是这一课终于完整。", reversed: "差最后一步收尾，或你还不愿承认某个周期已经结束。", advice: "把该收尾的事收好，新的门才会打开。" }
];

const topicCopy = {
  general: { label: "综合指引", prefix: "围绕你的整体状态，" },
  love: { label: "感情卡池", prefix: "放在感情关系里，" },
  career: { label: "事业卡池", prefix: "放在事业与机会里，" },
  study: { label: "学业卡池", prefix: "放在学习与成长里，" },
  self: { label: "自我卡池", prefix: "放在自我探索里，" }
};

const question = document.querySelector("#question");
const charCount = document.querySelector("#charCount");
const drawButton = document.querySelector("#drawButton");
const buttonText = document.querySelector("#buttonText");
const resetButton = document.querySelector("#resetButton");
const portal = document.querySelector("#portal");
const card = document.querySelector("#card");
const resultPanel = document.querySelector("#resultPanel");
const cardNumber = document.querySelector("#cardNumber");
const cardSymbol = document.querySelector("#cardSymbol");
const cardName = document.querySelector("#cardName");
const cardEnglish = document.querySelector("#cardEnglish");
const cardOrientation = document.querySelector("#cardOrientation");
const topicBadge = document.querySelector("#topicBadge");
const keywords = document.querySelector("#keywords");
const meaning = document.querySelector("#meaning");
const advice = document.querySelector("#advice");

question.addEventListener("input", () => {
  charCount.textContent = question.value.length;
});

drawButton.addEventListener("click", drawCard);
resetButton.addEventListener("click", () => {
  resultPanel.classList.add("hidden");
  card.classList.remove("revealed");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function getTopic() {
  return document.querySelector('input[name="topic"]:checked').value;
}

function pickCard() {
  const cardIndex = Math.floor(Math.random() * deck.length);
  const isReversed = Math.random() < 0.38;
  return { ...deck[cardIndex], isReversed };
}

function drawCard() {
  const pulled = pickCard();
  const topic = getTopic();
  const userQuestion = question.value.trim();

  drawButton.disabled = true;
  drawButton.classList.add("is-loading");
  buttonText.textContent = "星轨校准中...";
  resultPanel.classList.add("hidden");
  card.classList.remove("revealed");
  card.classList.add("shaking");
  portal.classList.add("summoning");

  setTimeout(() => {
    renderCard(pulled, topic, userQuestion);
    card.classList.add("revealed");
  }, 850);

  setTimeout(() => {
    card.classList.remove("shaking");
    portal.classList.remove("summoning");
    drawButton.disabled = false;
    drawButton.classList.remove("is-loading");
    buttonText.textContent = "再次开启星轨";
    resultPanel.classList.remove("hidden");
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 1500);
}

function renderCard(pulled, topic, userQuestion) {
  const orientation = pulled.isReversed ? "逆位" : "正位";
  const topicInfo = topicCopy[topic];
  const baseMeaning = pulled.isReversed ? pulled.reversed : pulled.upright;
  const questionLine = userQuestion
    ? `你问的是：“${escapeText(userQuestion)}”。`
    : "你没有输入具体问题，所以这张牌会作为今日星轨指引。";

  cardNumber.textContent = pulled.n;
  cardSymbol.textContent = pulled.symbol;
  cardName.textContent = pulled.name;
  cardEnglish.textContent = pulled.en;
  cardOrientation.textContent = orientation;

  topicBadge.textContent = `${topicInfo.label} · ${orientation}`;
  keywords.textContent = pulled.keywords;
  meaning.textContent = `${questionLine}${topicInfo.prefix}${baseMeaning} 这不是一个绝对判决，而是当前能量更偏向的方向。`;
  advice.textContent = `${pulled.advice} 如果你想改变趋势，先从这个最小动作开始，而不是等待外界替你给答案。`;
}

function escapeText(text) {
  return text.replace(/[<>]/g, "");
}
