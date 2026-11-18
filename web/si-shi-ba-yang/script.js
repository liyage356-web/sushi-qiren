const sceneEntries = {
  person: {
    kicker: "人物小记 · 壹",
    title: "俞六",
    subtitle: "先把糖做讲究，再把路走出来",
    body:
      "俞六做得出四十八种颜色、味道各异的药糖，却不善吆喝。挑担里的每只糖盒、每把铜勺，都先替他把“讲究”两个字说了出来。",
    tags: ["耐心", "琢磨", "手艺人"],
    image: "assets/yu-liu.jpg",
    imageAlt: "俞六挑着药糖担子走在天津老街的插画",
    number: "01",
    source: "依据《四十八样》设计方案中的人物线与道具描述整理，不作为原著引文。",
    announcement: "已翻开俞六的人物札记",
  },
  craft: {
    kicker: "器物小记 · 贰",
    title: "盒、勺与纸兜",
    subtitle: "卖糖的手艺，也藏在器物里",
    body:
      "糖盒盛放各样药糖，铜勺取糖，纸兜接住客人挑中的口味。等这副担子装上双桶与龙头，寻常买卖才慢慢变成街上的绝活。",
    tags: ["药糖盒", "铜勺", "纸兜"],
    image: "assets/candy-tools.jpg",
    imageAlt: "药糖盒、铜勺和纸兜的水墨器物插画",
    number: "02",
    source: "器物名称与用途依据设计方案和素材图标注整理；挑担组装互动已在第二阶段开放。",
    announcement: "已翻开药糖器物的札记",
  },
  street: {
    kicker: "街景小记 · 叁",
    title: "天津卫老街",
    subtitle: "河埠、铺面与街坊围成的舞台",
    body:
      "海河边的街市连接码头、商铺与寻常人家。摊前的每一次停步、每一句闲谈，都可能把一门手艺推到众人眼前，也可能把它淹没在热闹里。",
    tags: ["海河", "街市", "市井"],
    image: "assets/crowd.jpg",
    imageAlt: "天津老街坊围看表演、欢笑喝彩的水墨群像",
    number: "03",
    source: "场景氛围依据项目视觉设定与现有街景素材整理，不代表完整原著段落。",
    announcement: "已翻开天津卫街景的札记",
  },
};

const candyStories = [
  {
    id: "cha-gao",
    name: "茶膏糖",
    motto: "乌润回甘，先苦后甜",
    description:
      "茶香先收进膏里，再慢慢熬成糖块。入口不是一股脑的甜，先有一点老茶的涩，随后才回甘。",
    notes: ["清润", "回甘", "老茶香"],
    image: "assets/candy-12/01-茶膏糖.png",
  },
  {
    id: "dan-gui",
    name: "丹桂糖",
    motto: "金桂入糖，甜里透香",
    description:
      "桂花细，糖体温。丹桂糖不靠浓甜压人，嚼开了才有花香浮上来，是柜里很讲火候的一味。",
    notes: ["桂花香", "温甜", "细润"],
    image: "assets/candy-12/02-丹桂糖.png",
  },
  {
    id: "xian-jiang",
    name: "鲜姜糖",
    motto: "辛香醒神，甜里带暖",
    description:
      "姜味不躲，刚入口就能尝出来。老辈人用它驱寒暖胃，俞六则把它做成一块有劲儿的糖。",
    notes: ["鲜姜", "微辛", "暖口"],
    image: "assets/candy-12/03-鲜姜糖.png",
  },
  {
    id: "mei-gui",
    name: "玫瑰糖",
    motto: "花香细软，色如胭脂",
    description:
      "玫瑰的花气被糖裹住，颜色红里带紫。它不抢舌头的先，越到后头，香气越稳。",
    notes: ["玫瑰", "花香", "胭脂色"],
    image: "assets/candy-12/04-玫瑰糖.png",
  },
  {
    id: "dou-kou",
    name: "豆蔻糖",
    motto: "清芬微辛，越嚼越香",
    description:
      "豆蔻的香气提得清，糖体却做得厚实。先闻是草木气，嚼开以后，甜味才一点点接上来。",
    notes: ["豆蔻", "清芬", "厚实"],
    image: "assets/candy-12/05-豆蔻糖.png",
  },
  {
    id: "ju-pi",
    name: "橘皮糖",
    motto: "酸甜里有一点陈皮劲",
    description:
      "橘皮把甜味往回收了一寸，留下清爽和一点苦香。看似寻常，最见俞六配料时的分寸。",
    notes: ["橘皮", "微苦", "清爽"],
    image: "assets/candy-12/06-橘皮糖.png",
  },
  {
    id: "bo-he",
    name: "薄荷糖",
    motto: "一口清凉，甜味收得干净",
    description:
      "薄荷先凉，甜味随后，不黏在嘴里。街上来往的人停一停，含上一块，精神也跟着回来。",
    notes: ["清凉", "提神", "回甜"],
    image: "assets/candy-12/07-薄荷糖.png",
  },
  {
    id: "suan-mei",
    name: "酸梅糖",
    motto: "酸甜压舌，余味生津",
    description:
      "酸梅的劲儿比甜味更先到，口里一紧，随后才慢慢化开。这种先酸后甜，是药糖里很利落的一味。",
    notes: ["酸梅", "生津", "余味长"],
    image: "assets/candy-12/08-酸梅糖.png",
  },
  {
    id: "ya-li",
    name: "鸭梨糖",
    motto: "清甜果香，口感温和",
    description:
      "鸭梨的清甜被收进浅黄色糖块里。本味资料待补，当前只依据图录保留糖名、植物与糖块样式。",
    notes: ["鸭梨", "清甜", "资料待补"],
    image: "assets/candy-12/09-鸭梨糖.png",
  },
  {
    id: "pi-pa",
    name: "枇杷糖",
    motto: "果香柔和，甜味圆润",
    description:
      "枇杷糖以金黄糖块对应枇杷果实。本味资料待补，暂不作额外的食养或历史说明。",
    notes: ["枇杷", "果香", "资料待补"],
    image: "assets/candy-12/10-枇杷糖.png",
  },
  {
    id: "xi-gua",
    name: "西瓜糖",
    motto: "瓜香清亮，甜而不腻",
    description:
      "西瓜糖以红色糖块映出西瓜瓤色。此处只按图录记录外观与糖名，详细风味资料待补。",
    notes: ["西瓜", "清甜", "资料待补"],
    image: "assets/candy-12/11-西瓜糖.png",
  },
  {
    id: "ying-tao",
    name: "樱桃糖",
    motto: "樱红晶莹，酸甜可辨",
    description:
      "樱桃的深红色落在糖块上，与枝头果实相呼应。详细资料尚未提供，暂不作功效说明。",
    notes: ["樱桃", "樱红", "资料待补"],
    image: "assets/candy-12/12-樱桃糖.png",
  },
];

const assemblySteps = [
  {
    title: "双桶落肩",
    action: "装双桶",
    body:
      "两只空桶柜分挂扁担两端。刘二爷先看桶身是否相平，再让绳结吃住力。",
    caption: "双桶已落肩，扁担有了两头的分量。",
    label: "双桶已挂好",
  },
  {
    title: "横梁承肩",
    action: "放横梁",
    body:
      "扁担横梁从零件栏拖到左侧院落。放在两只桶柜上方即可，不必追着固定位置对准。",
    caption: "扁担横梁已经落在双桶之上，挑担轮廓立住了。",
    label: "扁担横梁已放好",
  },
  {
    title: "龙头相向",
    action: "安龙头",
    body:
      "两只龙头可以自由放在画布内。仍建议让它们一左一右望向中间，显出“二龙戏珠”的意思。",
    caption: "两只龙头一左一右，已经望向中间。",
    label: "两只龙头已装好",
  },
  {
    title: "金珠与挂饰",
    action: "放挂饰",
    body:
      "金珠、左右链条和两只红绒球都可以自由摆放。落位后仍能继续拖动，直到你满意为止。",
    caption: "金珠与挂饰都已落定，红绒球轻轻荡了一下。",
    label: "金珠、链条和红绒球已摆好",
  },
  {
    title: "金漆落字",
    action: "挂招牌",
    body:
      "最后把“俞家药糖·四十八样”落在两只桶柜上。四十八格、四十八味，这副担子才算齐。",
    caption: "金漆字落定，一担四十八样终于成了。",
    label: "四十八样招牌已挂好，挑担组装完成",
  },
];

const walkRoutePoints = [
  { x: 50, y: 48 },
  { x: 34, y: 70 },
  { x: 22, y: 52 },
  { x: 34, y: 28 },
  { x: 50, y: 48 },
  { x: 66, y: 70 },
  { x: 78, y: 52 },
  { x: 66, y: 28 },
  { x: 50, y: 48 },
];

const walkActionPlan = [
  "left",
  "left",
  "left",
  "switch",
  "right",
  "right",
  "right",
  "switch",
];

const walkPoseStates = [
  {
    sprite: 0,
    stage: "起势",
    name: "守担而立",
    description: "两脚站稳，先看左右两只桶柜。",
  },
  {
    sprite: 1,
    stage: "第一步",
    name: "左肩探步",
    description: "重心先向左压，扁担随肩头轻轻起落。",
  },
  {
    sprite: 2,
    stage: "第二步",
    name: "探身取糖",
    description: "手指搭住盒盖，铜勺顺着桶沿探出去。",
  },
  {
    sprite: 3,
    stage: "第三步",
    name: "绕桶回身",
    description: "脚步不停，借回身的劲把两只桶稳在身侧。",
  },
  {
    sprite: 1,
    stage: "换手",
    name: "中心换劲",
    description: "两圈在正中交叉，执担的手一换，步子仍不散。",
  },
  {
    sprite: 2,
    stage: "第五步",
    name: "右圈取糖",
    description: "换过手，沿右侧桶柜再走一圈。",
  },
  {
    sprite: 3,
    stage: "第六步",
    name: "右肩回身",
    description: "双桶跟着身子荡开，红绒球也甩出一点弧线。",
  },
  {
    sprite: 1,
    stage: "第七步",
    name: "收步并担",
    description: "绕回桶后，两手重新把扁担找平。",
  },
  {
    sprite: 0,
    stage: "收势",
    name: "八字走成",
    description: "脚步停稳，左右两圈合成一个清清楚楚的八字。",
  },
];

const walkStepStates = [
  {
    phase: "当前动作",
    title: "左绕起势",
    body: "从双桶正中向左探步，扁担随身体轻轻压低。",
    caption: "两手扶稳，先从左圈起势。",
  },
  {
    phase: "第一步完成",
    title: "左肩沉下去",
    body: "换左肩吃劲，步子沿外圈再走一段。",
    caption: "左肩一沉，桶身跟着往里收。",
  },
  {
    phase: "第二步完成",
    title: "绕到桶外侧",
    body: "不急着回身，再把左圈走满半程。",
    caption: "人与桶保持一臂距离，铜勺才好取糖。",
  },
  {
    phase: "左圈走满",
    title: "回正，准备换手",
    body: "走到两圈交叉处，手劲要换，脚下不能乱。",
    caption: "回到正中，下一拍该换手。",
  },
  {
    phase: "换手完成",
    title: "右圈起势",
    body: "右手接过劲儿，沿右圈向外探步。",
    caption: "左右手一交，担子仍要平。",
  },
  {
    phase: "第五步完成",
    title: "右肩接过担",
    body: "脚步顺势绕到另一侧，动作不能断。",
    caption: "右圈过半，脚步和铜勺还合在一处。",
  },
  {
    phase: "第六步完成",
    title: "从桶后回身",
    body: "把式最讲究这一下转身，快里有稳。",
    caption: "从桶后收步，双桶荡开又落稳。",
  },
  {
    phase: "右圈走满",
    title: "回正，收最后一拍",
    body: "回到交叉处，最后一次换手便能收势。",
    caption: "最后一拍，把两只桶稳稳收在身侧。",
  },
  {
    phase: "走八字完成",
    title: "左右两圈，成了一个八",
    body: "取糖、转身和换手连成一套，街坊这才看出门道。",
    caption: "步子收住，围观的人已经挤到街沿。",
  },
];

const walkActionNames = {
  left: "左绕",
  right: "右绕",
  switch: "换手",
};

const innovationScenes = [
  {
    phase: "当前情势 · 街口被仿",
    title: "别人也挑双桶，也会绕八字",
    body:
      "双桶、龙头和走法都能照着做。相似的担子一多，俞六原先靠“新鲜”聚来的人，便又散回几家摊前。再靠原样可守不住。",
    day: "街口第 3 天",
    mark: "学样的人多了",
    caption: "双桶、龙头和八字路线，街口已经有人照着学。",
    image: "assets/innovation-candy-peddler.png",
    imageAlt: "俞六在天津街市守着药糖摊，街坊围看糖柜",
    galleryTitle: "街口药糖摊",
    galleryCaption:
      "场景导览画稿：用街口摊前的人情场面承接“绝活被仿”的情势，不对应逐字原文。",
    galleryAlt: "俞六在天津街市药糖摊后接待围观街坊，摊上摆满玻璃糖盒",
    action: "看俞六怎么变法",
  },
  {
    phase: "后院问计 · 刘二爷点一句",
    title: "真绝活，还得往里再走一层",
    body:
      "刘二爷提醒他：别人能把担子做得像，也能把路学得熟；要把“四十八样”真正立住，还得在买卖与人情里添一层自己的琢磨。",
    day: "刘二爷后院",
    mark: "光有形似还不够",
    caption: "刘二爷看的是形，更看挑起担子以后藏着的心思。",
    image: "assets/innovation-talk.webp",
    imageAlt: "刘二爷指着药糖摊与俞六交谈，提醒他继续琢磨绝活",
    galleryTitle: "老少街谈药糖摊",
    galleryCaption:
      "场景导览画稿：表现刘二爷与俞六谈药糖、议把式的情境，不作为原著对话引文。",
    galleryAlt: "俞六托腮听刘二爷说话，两人隔着一整排玻璃药糖盒交谈",
    action: "去后院问刘二爷",
  },
  {
    phase: "三页变法 · 先选一项",
    title: "三样新招，挑哪页先看？",
    body:
      "选择只决定阅读先后，不生成另一条故事线。无论先翻哪一页，最后都要回到俞六真正走过的三步：添人情、改把式、配天津话。",
    day: "刘二爷后院",
    mark: "三个法子，一层层来",
    caption: "外形可以相似，俞六还要把买卖、动作和语言接成一整套。",
    image: "assets/innovation-talk.webp",
    imageAlt: "刘二爷与俞六在药糖摊前商量新的卖糖法子",
    galleryTitle: "议绝活",
    galleryCaption:
      "场景导览画稿：承接刘二爷点醒俞六、引出三项改进的叙事节点。",
    galleryAlt: "刘二爷与俞六在玻璃药糖柜前相对而坐，正在商量卖糖绝活",
    action: "",
  },
];

const innovationChoices = {
  reward: {
    label: "先翻人情这一页",
    title: "纸兜里再饶半块",
    body:
      "甜头不必多。多饶半块，是让顾客临走时记住这份厚道，也让买卖不只停在“甜不甜”上。",
  },
  routine: {
    label: "先翻动作这一页",
    title: "把取糖和走八字拧成一套",
    body:
      "绕桶、探身、取糖、换手要连成一气。旁人只学一条路线，学不全手上和脚下合起来的节奏。",
  },
  language: {
    label: "先翻语言这一页",
    title: "请刘二爷给脚步配词",
    body:
      "天津话押着步子说，热闹里又添一层幽默。六句词的来由讲清楚后，去第五阶段逐句念完。",
  },
};

const wordLineData = [
  {
    text: "天津药糖家家好",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-01.mp3",
    phase: "第一句 · 药糖满街",
    title: "天津药糖家家好",
    summary: "先把天津药糖的名头叫响，再把俞家这一担推到众人眼前。",
    stage: "起声 · 一声落地",
    caption: "第一句落下，俞六顺着词拍向前迈出一步。",
  },
  {
    text: "四十八样数第一",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-02.mp3",
    phase: "第二句 · 四十八样",
    title: "四十八样数第一",
    summary: "一句点到“四十八样”，俞六的担子与别家的糖摊立刻分出了高下。",
    stage: "第二声 · 街头正名",
    caption: "第二句压住街声，双桶药糖在人群里显了出来。",
  },
  {
    text: "一色一味块块香",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-03.mp3",
    phase: "第三句 · 一色一味",
    title: "一色一味块块香",
    summary: "色、味、香都被词句点到，挑担里的讲究不再只靠眼睛去看。",
    stage: "第三声 · 色味都全",
    caption: "第三句念罢，糖柜里的颜色和香气像一同亮了起来。",
  },
  {
    text: "再饶半块随您意",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-04.mp3",
    phase: "第四句 · 多饶半块",
    title: "再饶半块随您意",
    summary: "买卖里多一分人情，顾客听见的不只是夸口，也是一点实在的厚道。",
    stage: "第四声 · 人情到了",
    caption: "第四句带着笑意落地，街坊听懂了这份爽利。",
  },
  {
    text: "俞家能耐不传女",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-05.mp3",
    phase: "第五句 · 家传能耐",
    title: "俞家能耐不传女",
    summary: "词句拐进俞家的家教与能耐，天津式的幽默也跟着翻上来。",
    stage: "第五声 · 家传有说法",
    caption: "第五句一转，众人先是愣了一下，随即笑出了声。",
  },
  {
    text: "谁我儿子谁学艺",
    audioFile:
      "../../public/assets/forty-eight/tianjin-lyrics/audio/tianjin-line-06.mp3",
    phase: "第六句 · 收声立名",
    title: "谁我儿子谁学艺",
    summary: "最后一句收得响亮，把药糖、把式和天津人的机灵一并立住。",
    stage: "六句收声 · 街坊叫好",
    caption: "第六句落定，俞六收住步子，围观街坊齐声叫好。",
  },
];

const wordPositions = [
  { left: 15, bottom: 13, scale: 0.9 },
  { left: 22, bottom: 16, scale: 0.92 },
  { left: 30, bottom: 19, scale: 0.95 },
  { left: 40, bottom: 23, scale: 0.98 },
  { left: 51, bottom: 27, scale: 1 },
  { left: 62, bottom: 31, scale: 1.03 },
  { left: 74, bottom: 35, scale: 1.06 },
];

const experience = document.querySelector("body");
const sceneCanvas = document.querySelector("#sceneCanvas");
const yuLiuLayer = document.querySelector("#yuLiuLayer");
const sceneDetail = document.querySelector("#sceneDetail");
const sceneSeals = [...document.querySelectorAll("[data-scene-key]")];
const detailKicker = document.querySelector("#detailKicker");
const detailTitle = document.querySelector("#detailTitle");
const detailSubtitle = document.querySelector("#detailSubtitle");
const detailBody = document.querySelector("#detailBody");
const detailTags = document.querySelector("#detailTags");
const detailSource = document.querySelector("#detailSource");
const detailImage = document.querySelector("#detailImage");
const detailNumber = document.querySelector("#detailNumber");
const soundToggle = document.querySelector("#soundToggle");
const motionToggle = document.querySelector("#motionToggle");
const enterSceneButton = document.querySelector("#enterSceneButton");
const continueButton = document.querySelector("#continueButton");
const restartButton = document.querySelector("#restartButton");
const readingEntry = document.querySelector("#readingEntry");
const readingEntryBottom = document.querySelector("#readingEntryBottom");
const readingShortcut = document.querySelector("#readingShortcut");
const phaseTwoReading = document.querySelector("#phaseTwoReading");
const mediaDialog = document.querySelector("#mediaDialog");
const readingDialog = document.querySelector("#readingDialog");
const readingText = document.querySelector("#readingText");
const readingMeta = document.querySelector("#readingMeta");
const originalStory =
  window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["si-shi-ba-yang"];
const dialogClose = document.querySelector("#dialogClose");
const readingClose = document.querySelector("#readingClose");
const readingDialogConfirm = document.querySelector("#readingDialogConfirm");
const dialogImage = document.querySelector("#dialogImage");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogCaption = document.querySelector("#dialogCaption");
const liveMessage = document.querySelector("#liveMessage");
const cabinetShell = document.querySelector("#cabinetShell");
const candyGrid = document.querySelector("#candyGrid");
const candyProgress = document.querySelector("#candyProgress");
const candyDots = document.querySelector("#candyDots");
const candyCollectionLabel = document.querySelector("#candyCollectionLabel");
const candyName = document.querySelector("#candyName");
const candyIndex = document.querySelector("#candyIndex");
const candyMotto = document.querySelector("#candyMotto");
const candyDescription = document.querySelector("#candyDescription");
const candyNotes = document.querySelector("#candyNotes");
const candyPreview = document.querySelector("#candyPreview");
const candyPreviewImage = document.querySelector("#candyPreviewImage");
const assemblyStage = document.querySelector("#assemblyStage");
const assemblyStepButtons = [
  ...document.querySelectorAll(".assembly-step-list [data-assembly-step]"),
];
const assemblyStageNumber = document.querySelector("#assemblyStageNumber");
const assemblyStageCaption = document.querySelector("#assemblyStageCaption");
const assemblyStepTitle = document.querySelector("#assemblyStepTitle");
const assemblyStepBody = document.querySelector("#assemblyStepBody");
const assemblyAdvance = document.querySelector("#assemblyAdvance");
const assemblyComplete = document.querySelector("#assemblyComplete");
const assemblyReset = document.querySelector("#assemblyReset");
const assemblyCompleteReset = document.querySelector("#assemblyCompleteReset");
const assemblyContinueReading = document.querySelector(
  "#assemblyContinueReading",
);
const walkStage = document.querySelector("#walkStage");
const walkFigure = document.querySelector("#walkFigure");
const walkTracedRoute = document.querySelector("#walkTracedRoute");
const walkWaypoints = [...document.querySelectorAll("[data-walk-point]")];
const walkMarkers = [...document.querySelectorAll("[data-walk-step-marker]")];
const walkActionButtons = [...document.querySelectorAll("[data-walk-action]")];
const walkStepLabel = document.querySelector("#walkStepLabel");
const walkProgress = document.querySelector("#walkProgress");
const walkStageCaption = document.querySelector("#walkStageCaption");
const walkInstruction = document.querySelector("#walkInstruction");
const walkPhaseLabel = document.querySelector("#walkPhaseLabel");
const walkActionTitle = document.querySelector("#walkActionTitle");
const walkActionBody = document.querySelector("#walkActionBody");
const poseMedia = document.querySelector("#poseMedia");
const poseSprite = document.querySelector("#poseSprite");
const poseNumber = document.querySelector("#poseNumber");
const poseStage = document.querySelector("#poseStage");
const poseName = document.querySelector("#poseName");
const poseDescription = document.querySelector("#poseDescription");
const walkComplete = document.querySelector("#walkComplete");
const walkReset = document.querySelector("#walkReset");
const walkReplay = document.querySelector("#walkReplay");
const innovationExperience = document.querySelector("#innovationExperience");
const innovationBeatButtons = [
  ...document.querySelectorAll(".innovation-beats [data-innovation-step]"),
];
const innovationSceneImage = document.querySelector("#innovationSceneImage");
const innovationSceneDay = document.querySelector("#innovationSceneDay");
const innovationSceneMark = innovationSceneImage
  .closest(".innovation-frame")
  .querySelector(".innovation-scene-mark strong");
const innovationSceneCaption = document.querySelector("#innovationSceneCaption");
const innovationGallery = document.querySelector("#innovationGallery");
const innovationPhase = document.querySelector("#innovationPhase");
const innovationPanelTitle = document.querySelector("#innovationPanelTitle");
const innovationBody = document.querySelector("#innovationBody");
const innovationMentorNote = document.querySelector("#innovationMentorNote");
const innovationNext = document.querySelector("#innovationNext");
const innovationNextLabel = document.querySelector("#innovationNextLabel");
const innovationChoicePanel = document.querySelector("#innovationChoicePanel");
const innovationChoiceButtons = [
  ...document.querySelectorAll("[data-innovation-choice]"),
];
const innovationChoiceCopy = document.querySelector("#innovationChoiceCopy");
const innovationChoiceLabel = document.querySelector("#innovationChoiceLabel");
const innovationChoiceTitle = document.querySelector("#innovationChoiceTitle");
const innovationChoiceBody = document.querySelector("#innovationChoiceBody");
const innovationOrderButton = document.querySelector("#innovationOrderButton");
const innovationOrderButtonLabel = document.querySelector(
  "#innovationOrderButtonLabel",
);
const innovationOrderItems = [
  ...document.querySelectorAll("[data-innovation-order]"),
];
const innovationReset = document.querySelector("#innovationReset");
const innovationResolution = document.querySelector("#innovationResolution");
const innovationReplay = document.querySelector("#innovationReplay");
const innovationReading = document.querySelector("#innovationReading");
const wordStage = document.querySelector("#wordStage");
const wordWalker = document.querySelector("#wordWalker");
const wordStageBeat = document.querySelector("#wordStageBeat");
const wordStageCaption = document.querySelector("#wordStageCaption");
const wordPathSteps = [...document.querySelectorAll("[data-word-path-step]")];
const wordApplause = document.querySelector("#wordApplause");
const wordLineItems = [...document.querySelectorAll("[data-word-line]")];
const wordsPhase = document.querySelector("#wordsPhase");
const wordsPanelTitle = document.querySelector("#wordsPanelTitle");
const wordCurrentLine = document.querySelector("#wordCurrentLine");
const wordProgress = document.querySelector("#wordProgress");
const wordProgressFill = document.querySelector("#wordProgressFill");
const wordProgressLabel = document.querySelector("#wordProgressLabel");
const wordBack = document.querySelector("#wordBack");
const wordNext = document.querySelector("#wordNext");
const wordNextLabel = document.querySelector("#wordNextLabel");
const wordReplay = document.querySelector("#wordReplay");
const wordComplete = document.querySelector("#wordComplete");
const wordReplayComplete = document.querySelector("#wordReplayComplete");
const wordsReading = document.querySelector("#wordsReading");
const wordContinueStory = document.querySelector("#wordContinueStory");
const wordLineButtons = [
  ...document.querySelectorAll("[data-word-line-play]"),
];
const wordAudioStatus = document.querySelector("#wordAudioStatus");
const wordPause = document.querySelector("#wordPause");
const wordAudioReplay = document.querySelector("#wordAudioReplay");
const wordMute = document.querySelector("#wordMute");
const wordVolume = document.querySelector("#wordVolume");
const dialectToggle = document.querySelector("#dialectToggle");
const dialectNotice = document.querySelector("#dialectNotice");

let currentSceneKey = "person";
let motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let ambientContext = null;
let ambientGain = null;
let ambientSource = null;
let soundEnabled = false;
let toastTimer = null;
let pointerFrame = null;
let detailUpdateTimer = null;
let dragPointerId = null;
let dragStartX = 0;
let dragStartOffset = 0;
let candyDetailTimer = null;
let assemblyStep = 0;
let walkStep = 0;
let walkAnimationTimer = null;
let walkNudgeTimer = null;
let innovationStep = 0;
let innovationSceneTimer = null;
let innovationSequenceTimers = [];
let innovationChoice = null;
let innovationStoryComplete = false;
let wordStep = 0;
let wordStepTimer = null;
let wordUnlockedCount = 1;
let wordActiveIndex = null;
let wordPlaybackState = "idle";
let wordLaughTimer = null;
let wordFeedbackTriggered = false;
const wordCompletedLines = new Set();
const wordTextFallbackLines = new Set();
const wordAudioFailures = new Set();
const wordAudioManager =
  typeof window.TianjinLyricsAudio === "function"
    ? new window.TianjinLyricsAudio({
        root: "",
        lineFiles: wordLineData.map((line) => line.audioFile),
        cueFiles: {
          laugh:
            "../../public/assets/forty-eight/tianjin-lyrics/audio/crowd-laugh.mp3",
          cheer:
            "../../public/assets/forty-eight/tianjin-lyrics/audio/crowd-cheer.mp3",
        },
        volume: 0.9,
        onLeave: () => {
          if (wordActiveIndex !== null || wordPlaybackState === "playing") {
            stopWordPlayback({ reason: "leave", announce: false });
          }
        },
      })
    : null;
const CANDY_STORAGE_KEY = "sushi-qiren:candy-identified:v1";
const validCandyIds = new Set(candyStories.map((candy) => candy.id));

function loadViewedCandies() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(CANDY_STORAGE_KEY) || "[]",
    );
    const viewed = new Set();
    if (!Array.isArray(stored)) return viewed;

    stored.forEach((entry) => {
      if (typeof entry === "string" && validCandyIds.has(entry)) {
        viewed.add(entry);
        return;
      }

      if (
        Number.isInteger(entry) &&
        entry >= 0 &&
        entry < candyStories.length
      ) {
        viewed.add(candyStories[entry].id);
      }
    });
    return viewed;
  } catch {
    return new Set();
  }
}

function saveViewedCandies() {
  try {
    window.localStorage.setItem(
      CANDY_STORAGE_KEY,
      JSON.stringify([...viewedCandies]),
    );
  } catch {
    // Reading and clicking still work when storage is unavailable.
  }
}

const viewedCandies = loadViewedCandies();

function announce(message) {
  window.clearTimeout(toastTimer);
  liveMessage.textContent = message;
  liveMessage.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    liveMessage.classList.remove("is-visible");
  }, 2200);
}

function renderCandyDots() {
  const dots = candyStories.map((candy, index) => {
    const dot = document.createElement("span");
    dot.className = "candy-dot";
    dot.dataset.candyIndex = String(index);
    dot.setAttribute("aria-hidden", "true");
    return dot;
  });
  candyDots.replaceChildren(...dots);
}

function renderCandyGrid() {
  const boxes = candyStories.map((candy, index) => {
    const button = document.createElement("button");
    button.className = "candy-box";
    button.type = "button";
    button.dataset.candyIndex = String(index);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `打开第${index + 1}盒，${candy.name}`);

    const art = document.createElement("span");
    art.className = "candy-box__art";
    art.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = candy.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    art.append(image);

    const number = document.createElement("span");
    number.className = "candy-box__number";
    number.textContent = String(index + 1).padStart(2, "0");
    number.setAttribute("aria-hidden", "true");

    const status = document.createElement("span");
    status.className = "candy-box__status";
    status.textContent = "已识";
    status.setAttribute("aria-hidden", "true");

    button.append(art, number, status);
    button.addEventListener("click", () => {
      setCandy(index, { announce: true });
    });
    return button;
  });

  candyGrid.replaceChildren(...boxes);
}

function setCandy(index, options = {}) {
  const candy = candyStories[index];
  if (!candy) return;

  if (options.markViewed !== false) {
    viewedCandies.add(candy.id);
    saveViewedCandies();
  }
  cabinetShell.classList.add("is-open");

  candyGrid.querySelectorAll(".candy-box").forEach((button) => {
    const buttonIndex = Number(button.dataset.candyIndex);
    const isCurrent = buttonIndex === index;
    button.setAttribute("aria-pressed", String(isCurrent));
    button.classList.toggle(
      "is-viewed",
      viewedCandies.has(candyStories[buttonIndex].id),
    );
  });

  const updateCopy = () => {
    candyName.textContent = candy.name;
    candyIndex.textContent = `第${
      ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"][
        index
      ]
    }盒`;
    candyMotto.textContent = candy.motto;
    candyDescription.textContent = candy.description;
    candyNotes.replaceChildren(
      ...candy.notes.map((note) => {
        const item = document.createElement("li");
        item.textContent = note;
        return item;
      }),
    );
    candyPreviewImage.onload = () => {
      candyPreview.classList.remove("is-media-missing");
    };
    candyPreviewImage.onerror = () => {
      candyPreview.classList.add("is-media-missing");
    };
    candyPreviewImage.src = candy.image;
    candyPreviewImage.alt = `${candy.name}植物与糖块插画`;
    candyPreview.classList.remove("is-changing");
  };

  window.clearTimeout(candyDetailTimer);
  if (options.instant || !motionEnabled) {
    updateCopy();
  } else {
    candyPreview.classList.add("is-changing");
    candyDetailTimer = window.setTimeout(updateCopy, 120);
  }

  candyDots.querySelectorAll(".candy-dot").forEach((dot) => {
    dot.classList.toggle(
      "is-found",
      viewedCandies.has(candyStories[Number(dot.dataset.candyIndex)].id),
    );
  });

  const foundCount = viewedCandies.size;
  candyProgress.textContent = String(foundCount);
  candyDots.setAttribute("aria-valuenow", String(foundCount));
  candyCollectionLabel.textContent =
    foundCount === candyStories.length
      ? "十二样已识，可以接着装担"
      : foundCount === 1
        ? "头一回开柜，先尝一盒"
        : `还差 ${candyStories.length - foundCount} 样，四十八格已经起头`;

  if (options.announce) {
    announce(
      foundCount === candyStories.length
        ? "十二样药糖已识全，可以继续装挑担"
        : `已翻开${candy.name}，识得 ${foundCount} 样`,
    );
  }
}

function setAssemblyStep(nextStep, options = {}) {
  const clampedStep = Math.max(
    0,
    Math.min(assemblySteps.length, Number(nextStep) || 0),
  );
  assemblyStep = clampedStep;
  assemblyStage.dataset.assemblyStep = String(clampedStep);
  assemblyStage.classList.toggle(
    "is-complete",
    clampedStep === assemblySteps.length,
  );

  const isComplete = clampedStep === assemblySteps.length;
  assemblyStageNumber.textContent = isComplete
    ? "成担"
    : clampedStep === 0
      ? "未装"
      : ["", "壹", "贰", "叁", "肆", "伍"][clampedStep];
  assemblyStageCaption.textContent =
    clampedStep === 0
      ? "左侧只留院落背景，桶柜和其他零件都还在右侧零件栏。"
      : assemblySteps[clampedStep - 1].caption;
  assemblyStage.setAttribute(
    "aria-label",
    clampedStep === 0
      ? "尚未开始组装的空院落，桶柜、横梁、龙头、金珠、红绒球和招牌都还在右侧"
      : assemblySteps[clampedStep - 1].label,
  );

  assemblyStepButtons.forEach((button) => {
    const buttonStep = Number(button.dataset.assemblyStep);
    const isDone = buttonStep <= clampedStep;
    const isCurrent = buttonStep === clampedStep + 1;
    button.classList.toggle("is-done", isDone);
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-disabled", String(!isDone && !isCurrent));
    if (isDone) {
      button.setAttribute(
        "aria-label",
        `${assemblySteps[buttonStep - 1].title}，已完成`,
      );
    } else if (isCurrent) {
      button.setAttribute(
        "aria-label",
        `${assemblySteps[buttonStep - 1].title}，当前可安装`,
      );
    } else {
      button.setAttribute(
        "aria-label",
        `${assemblySteps[buttonStep - 1].title}，请先完成前一步`,
      );
    }
  });

  if (isComplete) {
    assemblyStepTitle.textContent = "招牌落定，一担齐了";
    assemblyStepBody.textContent =
      "双桶平衡，二龙相望，金珠居中。金漆字正在显出来，听担子轻轻定住。";
    assemblyAdvance.hidden = true;
    const finaleState =
      window.dragonAssemblyComponent?.getSnapshot?.().finaleState;
    assemblyComplete.hidden = finaleState
      ? finaleState !== "complete"
      : false;
  } else {
    const next = assemblySteps[clampedStep];
    assemblyStepTitle.textContent =
      clampedStep === 0 ? "先装两只桶柜" : `下一步：${next.title}`;
    assemblyStepBody.textContent = next.body;
    assemblyAdvance.hidden = false;
    assemblyAdvance.firstChild.textContent = `${next.action} `;
    assemblyComplete.hidden = true;
  }

  if (options.announce) {
    announce(
      isComplete
        ? "四十八样挑担组装完成，二龙戏珠已落定"
        : `${assemblySteps[clampedStep - 1].title}完成`,
    );
  }
}

window.assemblyStageBridge = Object.freeze({
  render(step, options = {}) {
    setAssemblyStep(step, { ...options, fromComponent: true });
  },
  getStep: () => assemblyStep,
  announce: (message) => announce(message),
});

function setWalkStep(nextStep, options = {}) {
  const clampedStep = Math.max(
    0,
    Math.min(walkActionPlan.length, Number(nextStep) || 0),
  );
  const isComplete = clampedStep === walkActionPlan.length;
  const state = walkStepStates[clampedStep];
  const pose = walkPoseStates[clampedStep];
  const point = walkRoutePoints[clampedStep];
  const nextPoint = walkRoutePoints[Math.min(clampedStep + 1, walkRoutePoints.length - 1)];
  const nextAction = walkActionPlan[clampedStep];

  walkStep = clampedStep;
  walkStage.dataset.walkStep = String(clampedStep);
  walkStage.classList.toggle("is-complete", isComplete);
  walkStage.setAttribute(
    "aria-label",
    isComplete
      ? "俯视街口，俞六已经走完左右两圈，围观街坊出现在桶柜后方"
      : `俯视街口，俞六走八字进行到第 ${clampedStep} 步，${state.title}`,
  );

  walkFigure.style.setProperty("--walk-x", `${point.x}%`);
  walkFigure.style.setProperty("--walk-y", `${point.y}%`);
  const lean = isComplete
    ? 0
    : Math.max(-10, Math.min(10, (nextPoint.x - point.x) * 0.45));
  walkFigure.style.setProperty("--walk-angle", `${lean}deg`);
  walkTracedRoute.style.strokeDashoffset = String(1 - clampedStep / walkActionPlan.length);

  walkWaypoints.forEach((marker) => {
    const markerStep = Number(marker.dataset.walkPoint);
    marker.classList.toggle("is-done", markerStep < clampedStep);
    marker.classList.toggle("is-current", markerStep === clampedStep);
  });

  walkMarkers.forEach((marker) => {
    const markerStep = Number(marker.dataset.walkStepMarker);
    marker.classList.toggle("is-done", markerStep <= clampedStep);
    marker.classList.toggle("is-current", markerStep === clampedStep + 1 && !isComplete);
  });

  walkActionButtons.forEach((button) => {
    const action = button.dataset.walkAction;
    const isCurrent = action === nextAction;
    button.classList.toggle("is-current", isCurrent);
    button.classList.toggle("is-used", walkActionPlan.slice(0, clampedStep).includes(action));
    button.dataset.currentAction = String(isCurrent);
  });

  poseMedia.dataset.poseIndex = String(pose.sprite);
  poseSprite.alt = `俞六${pose.name}的动作切片`;
  poseNumber.textContent = isComplete ? "收" : ["起", "一", "二", "三", "换", "五", "六", "七", "八"][clampedStep];
  poseStage.textContent = pose.stage;
  poseName.textContent = pose.name;
  poseDescription.textContent = pose.description;

  walkProgress.textContent = String(clampedStep);
  walkStepLabel.textContent = isComplete
    ? "八字已成"
    : clampedStep === 0
      ? "未起势"
      : `已走 ${clampedStep} 步`;
  walkStageCaption.textContent = state.caption;
  walkPhaseLabel.textContent = state.phase;
  walkActionTitle.textContent = state.title;
  walkActionBody.textContent = state.body;
  walkComplete.hidden = !isComplete;

  if (isComplete) {
    walkInstruction.textContent =
      "左右两圈收在同一个“八”里。街坊已经围上看，第三阶段完成。";
  } else {
    walkInstruction.textContent =
      clampedStep === 0
        ? "点击高亮的“左绕”，让俞六沿左圈走出第一步。"
        : `接下来点“${walkActionNames[nextAction]}”，走到下一个朱印节点。`;
  }

  window.clearTimeout(walkAnimationTimer);
  walkStage.classList.remove("is-stepping");
  if (options.animate && motionEnabled) {
    void walkStage.offsetWidth;
    walkStage.classList.add("is-stepping");
    walkAnimationTimer = window.setTimeout(() => {
      walkStage.classList.remove("is-stepping");
    }, 560);
  }

  if (options.announce) {
    announce(
      isComplete
        ? "八步走成，左右两圈合成八字，街坊开始喝彩"
        : `${walkActionNames[walkActionPlan[clampedStep - 1]]}完成，第 ${clampedStep} 步`,
    );
  }
}

function updateInnovationGallery(scene) {
  innovationGallery.dataset.galleryImage = scene.image;
  innovationGallery.dataset.galleryTitle = scene.galleryTitle;
  innovationGallery.dataset.galleryCaption = scene.galleryCaption;
  innovationGallery.dataset.galleryAlt = scene.galleryAlt;
}

function cancelInnovationSequence() {
  innovationSequenceTimers.forEach((timer) => window.clearTimeout(timer));
  innovationSequenceTimers = [];
  innovationOrderItems.forEach((item) => item.classList.remove("is-revealed"));
  innovationOrderButton.disabled = false;
  innovationOrderButton.classList.remove("is-playing");
  innovationOrderButtonLabel.textContent = "照故事顺序看三招";
  innovationResolution.hidden = true;
  innovationExperience.classList.remove("is-story-complete", "is-story-playing");
  innovationStoryComplete = false;
}

function setInnovationStep(nextStep, options = {}) {
  const clampedStep = Math.max(
    0,
    Math.min(innovationScenes.length - 1, Number(nextStep) || 0),
  );
  const scene = innovationScenes[clampedStep];

  if (!options.keepSequence) {
    window.clearTimeout(innovationSceneTimer);
    cancelInnovationSequence();
  }

  innovationStep = clampedStep;
  innovationExperience.dataset.innovationStep = String(clampedStep);
  innovationBeatButtons.forEach((button) => {
    const isCurrent = Number(button.dataset.innovationStep) === clampedStep;
    button.toggleAttribute("aria-current", isCurrent);
    if (isCurrent) {
      button.setAttribute("aria-current", "step");
    }
  });

  innovationPhase.textContent = scene.phase;
  innovationPanelTitle.textContent = scene.title;
  innovationBody.textContent = scene.body;
  innovationSceneDay.textContent = scene.day;
  innovationSceneMark.textContent = scene.mark;
  innovationSceneCaption.textContent = scene.caption;
  innovationMentorNote.hidden = clampedStep !== 1;
  innovationChoicePanel.hidden = clampedStep !== 2;
  innovationNext.hidden = clampedStep === 2;
  innovationNextLabel.textContent = scene.action;
  updateInnovationGallery(scene);

  const applySceneMedia = () => {
    innovationSceneImage.src = scene.image;
    innovationSceneImage.alt = scene.imageAlt;
    innovationSceneImage.closest(".innovation-frame").classList.remove("is-changing");
  };

  if (motionEnabled && innovationSceneImage.getAttribute("src") !== scene.image) {
    const frame = innovationSceneImage.closest(".innovation-frame");
    frame.classList.add("is-changing");
    innovationSceneTimer = window.setTimeout(applySceneMedia, 150);
  } else {
    applySceneMedia();
  }

  if (options.announce) {
    announce(
      clampedStep === 0
        ? "回到街口被仿那天"
        : clampedStep === 1
          ? "刘二爷提醒：模样能学，心里的琢磨学不走"
          : "三项变法已展开，选择只决定先看哪一页",
    );
  }
}

function selectInnovationChoice(key) {
  const choice = innovationChoices[key];
  if (!choice) return;

  innovationChoice = key;
  innovationChoiceButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.innovationChoice === key),
    );
  });
  innovationChoiceCopy.hidden = false;
  innovationChoiceLabel.textContent = choice.label;
  innovationChoiceTitle.textContent = choice.title;
  innovationChoiceBody.textContent = choice.body;
  announce(`${choice.label}：${choice.title}`);
}

function finishInnovationSequence() {
  innovationOrderItems.forEach((item) => item.classList.add("is-revealed"));
  innovationResolution.hidden = false;
  innovationExperience.classList.remove("is-story-playing");
  innovationExperience.classList.add("is-story-complete");
  innovationOrderButton.disabled = false;
  innovationOrderButton.classList.remove("is-playing");
  innovationOrderButtonLabel.textContent = "再顺一遍三招";
  innovationStoryComplete = true;

  innovationSceneDay.textContent = "三招已齐";
  innovationSceneMark.textContent = "担子有了自己的门道";
  innovationSceneCaption.textContent =
    "人情、把式和天津话叠在一起，俞六又把“四十八样”往前推了一步。";
  innovationSceneImage.src = "assets/signature-carry.webp";
  innovationSceneImage.alt =
    "刘二爷与俞六在院中看着装饰龙头、金珠和红绒球的双桶药糖挑担";
  innovationGallery.dataset.galleryImage = "assets/signature-carry.webp";
  innovationGallery.dataset.galleryTitle = "俞六与刘二爷看新担";
  innovationGallery.dataset.galleryCaption =
    "场景导览画稿：用院中双桶挑担承接三项创新合流后的结果，不对应逐字原文。";
  innovationGallery.dataset.galleryAlt =
    "刘二爷与俞六在院中看着装饰龙头、金珠和红绒球的双桶药糖挑担";
  announce("三招顺着故事走完，一担四十八样又添了新的门道");
}

function playInnovationSequence() {
  if (innovationSequenceTimers.length) return;

  innovationResolution.hidden = true;
  innovationOrderItems.forEach((item) => item.classList.remove("is-revealed"));
  innovationOrderButton.disabled = true;
  innovationOrderButton.classList.add("is-playing");
  innovationOrderButtonLabel.textContent = "正在顺故事往下走";
  innovationExperience.classList.add("is-story-playing");
  innovationExperience.classList.remove("is-story-complete");

  if (!motionEnabled) {
    finishInnovationSequence();
    return;
  }

  [0, 620, 1240].forEach((delay, index) => {
    const timer = window.setTimeout(() => {
      innovationOrderItems[index].classList.add("is-revealed");
    }, delay);
    innovationSequenceTimers.push(timer);
  });

  const completeTimer = window.setTimeout(() => {
    innovationSequenceTimers = [];
    finishInnovationSequence();
  }, 1880);
  innovationSequenceTimers.push(completeTimer);
}

function resetInnovationExperience(options = {}) {
  window.clearTimeout(innovationSceneTimer);
  cancelInnovationSequence();
  innovationChoice = null;
  innovationChoiceButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  innovationChoiceCopy.hidden = true;
  innovationChoiceLabel.textContent = "先看这一页";
  innovationChoiceTitle.textContent = "";
  innovationChoiceBody.textContent = "";
  setInnovationStep(0);

  if (options.focus) innovationBeatButtons[0].focus();
  if (options.announce) announce("已回到绝活被仿那天");
}

function renderWordLines() {
  wordLineItems.forEach((item, index) => {
    const line = wordLineData[index];
    const button = item.querySelector("[data-word-line-play]");
    const copy = button?.querySelector("p");
    if (!line || !button || !copy) return;

    const characters = [...line.text].map((character, characterIndex) => {
      const span = document.createElement("span");
      span.textContent = character;
      span.style.setProperty("--word-char", String(characterIndex));
      span.setAttribute("aria-hidden", "true");
      return span;
    });

    copy.className = "word-line-text";
    copy.replaceChildren(...characters);
    button.setAttribute("aria-label", `${line.phase}：${line.text}`);
  });
}

function wordLineUnlocked(index) {
  return index < wordUnlockedCount || wordCompletedLines.has(index);
}

function wordLineStateCopy(index) {
  if (wordActiveIndex === index && wordPlaybackState === "playing") {
    return "正在播放";
  }
  if (wordActiveIndex === index && wordPlaybackState === "paused") {
    return "已暂停";
  }
  if (wordCompletedLines.has(index)) {
    return wordTextFallbackLines.has(index) ? "文字已读 · 录音缺失" : "已念完";
  }
  if (wordAudioFailures.has(index)) return "录音缺失 · 可继续文字";
  return wordLineUnlocked(index) ? "点击播放" : "听上句后解锁";
}

function setWordAudioStatus(message, state = wordPlaybackState) {
  wordPlaybackState = state;
  wordStage.dataset.voiceState = state;
  wordStage.classList.toggle("is-voice-loading", state === "loading");
  wordStage.classList.toggle("is-voice-playing", state === "playing");
  wordStage.classList.toggle("is-voice-paused", state === "paused");
  wordStage.classList.toggle("is-voice-error", state === "error");
  if (state !== "playing") wordStage.classList.remove("is-stepping");
  wordAudioStatus.textContent = message;
}

function renderWordState() {
  const completedCount = wordCompletedLines.size;
  const complete = completedCount === wordLineData.length;

  wordLineItems.forEach((item, index) => {
    const button = item.querySelector("[data-word-line-play]");
    const stateCopy = item.querySelector(".word-line-state");
    const revealed =
      wordCompletedLines.has(index) ||
      index < wordUnlockedCount ||
      index === wordActiveIndex ||
      wordTextFallbackLines.has(index);
    const unlocked = wordLineUnlocked(index);
    const current = wordActiveIndex === index;

    item.classList.toggle("is-revealed", revealed);
    item.classList.toggle("is-current", current);
    item.classList.toggle("is-locked", !unlocked);
    item.classList.toggle("is-completed", wordCompletedLines.has(index));
    item.classList.toggle(
      "is-text-fallback",
      wordTextFallbackLines.has(index),
    );
    item.classList.toggle(
      "is-unavailable",
      wordAudioFailures.has(index) &&
        !wordCompletedLines.has(index),
    );
    item.setAttribute("aria-hidden", "false");

    if (button) {
      button.disabled = !unlocked;
      button.setAttribute(
        "aria-label",
        `${wordLineData[index].phase}：${wordLineData[index].text}，${wordLineStateCopy(index)}`,
      );
    }
    if (stateCopy) stateCopy.textContent = wordLineStateCopy(index);

    if (current) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });

  wordPathSteps.forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.toggle("is-passed", wordCompletedLines.has(index));
    step.classList.toggle("is-current", wordActiveIndex === index);
  });

  wordProgress.setAttribute("aria-valuenow", String(completedCount));
  wordProgressLabel.textContent = `已念 ${completedCount} / ${wordLineData.length}`;
  wordProgressFill.style.width = `${(completedCount / wordLineData.length) * 100}%`;
  wordStage.classList.toggle("is-complete", complete);
  wordApplause.hidden = !complete;
  wordComplete.hidden = !complete;
  wordBack.disabled = wordActiveIndex === null || wordActiveIndex === 0;
  wordPause.disabled = wordPlaybackState !== "playing";
  wordAudioReplay.disabled = wordActiveIndex === null;

  const activeFailed =
    wordActiveIndex !== null && wordAudioFailures.has(wordActiveIndex);
  const nextIndex = wordCompletedLines.has(wordActiveIndex)
    ? wordActiveIndex + 1
    : wordActiveIndex ?? 0;
  const canPlayNext =
    !complete &&
    wordPlaybackState !== "playing" &&
    wordPlaybackState !== "loading" &&
    wordLineUnlocked(Math.min(nextIndex, wordLineData.length - 1));

  wordNext.disabled = !canPlayNext && !activeFailed;
  if (complete) {
    wordNextLabel.textContent = "六句已念完";
  } else if (wordPlaybackState === "playing") {
    wordNextLabel.textContent = "正在播放…";
  } else if (wordPlaybackState === "loading") {
    wordNextLabel.textContent = "载入录音…";
  } else if (wordPlaybackState === "paused") {
    wordNextLabel.textContent = "继续播放";
  } else if (activeFailed) {
    wordNextLabel.textContent = "继续读下一句";
  } else {
    const playIndex =
      wordActiveIndex !== null && !wordCompletedLines.has(wordActiveIndex)
        ? wordActiveIndex
        : Math.min(wordUnlockedCount - 1, wordLineData.length - 1);
    wordNextLabel.textContent = `播放第${["一", "二", "三", "四", "五", "六"][playIndex]}句`;
  }

  wordStage.setAttribute(
    "aria-label",
    complete
      ? "天津六句词已念完，街坊先笑后喝彩"
      : `天津六句词已念完 ${completedCount} 句，共六句`,
  );
}

function focusWordLine(index, options = {}) {
  const clampedIndex = Math.max(
    0,
    Math.min(wordLineData.length - 1, Number(index) || 0),
  );
  const line = wordLineData[clampedIndex];
  const position = wordPositions[clampedIndex + 1];
  wordActiveIndex = clampedIndex;
  wordStep = clampedIndex + 1;
  wordStage.dataset.wordStep = String(wordStep);
  wordStage.dataset.stepParity = clampedIndex % 2 === 0 ? "odd" : "even";
  wordStage.classList.add("is-stepping");
  window.clearTimeout(wordStepTimer);
  wordStepTimer = window.setTimeout(
    () => wordStage.classList.remove("is-stepping"),
    motionEnabled ? 760 : 0,
  );

  wordWalker.style.setProperty("--word-left", `${position.left}%`);
  wordWalker.style.setProperty("--word-bottom", `${position.bottom}%`);
  wordWalker.style.setProperty("--word-scale", String(position.scale));

  wordStageBeat.textContent = line.stage;
  wordStageCaption.textContent = line.caption;
  wordsPhase.textContent = line.phase;
  wordsPanelTitle.textContent = line.title;
  wordCurrentLine.textContent = line.summary;
  renderWordState();

  if (options.announce) {
    announce(`${line.phase}：${line.text}`);
  }
}

function setWordAudioTiming(duration) {
  if (!duration) return;
  wordStage.style.setProperty(
    "--word-audio-duration",
    `${Math.max(0.8, duration)}s`,
  );
  wordStage.style.setProperty(
    "--word-sway-duration",
    `${Math.max(1, Math.min(2.6, duration / 3))}s`,
  );
}

function wordPlaybackHandlers(index) {
  return {
    onStart: ({ duration }) => {
      if (wordActiveIndex !== index) return;
      focusWordLine(index);
      setWordAudioTiming(duration);
      setWordAudioStatus(
        `正在播放：${wordLineData[index].text}`,
        "playing",
      );
      dialectNotice.textContent = "正在播放天津话录音";
      renderWordState();
    },
    onDuration: ({ duration }) => {
      setWordAudioTiming(duration);
    },
    onEnded: () => completeWordLine(index, { fromAudio: true }),
    onPause: () => {
      if (wordActiveIndex !== index) return;
      setWordAudioStatus(
        `已暂停：${wordLineData[index].text}。点击“继续播放”接着听。`,
        "paused",
      );
      renderWordState();
    },
    onError: () => {
      if (wordActiveIndex !== index) return;
      wordAudioFailures.add(index);
      setWordAudioStatus(
        `第${["一", "二", "三", "四", "五", "六"][index]}句方言录音缺失。文字仍可继续阅读，不会播放合成替代音。`,
        "error",
      );
      dialectNotice.textContent = "部分天津话录音不可用，已保留文字阅读";
      renderWordState();
    },
  };
}

function playWordLine(index, options = {}) {
  if (!wordLineUnlocked(index)) {
    setWordAudioStatus("请先听完上一句，再播放这一句。", "idle");
    return;
  }
  if (!wordAudioManager) {
    focusWordLine(index);
    wordAudioFailures.add(index);
    setWordAudioStatus(
      "当前浏览器无法初始化音频。文字仍可阅读，不会播放替代声音。",
      "error",
    );
    renderWordState();
    return;
  }
  focusWordLine(index, { announce: options.announce });
  setWordAudioStatus(`正在载入第${["一", "二", "三", "四", "五", "六"][index]}句录音…`, "loading");
  renderWordState();
  const handlers = wordPlaybackHandlers(index);
  const playback = options.replay
    ? wordAudioManager.replayLine(index, handlers)
    : wordAudioManager.playLine(index, handlers);
  playback.catch(() => handlers.onError());
}

function completeWordLine(index, options = {}) {
  const firstCompletion = !wordCompletedLines.has(index);
  wordCompletedLines.add(index);
  if (options.fromAudio) wordTextFallbackLines.delete(index);
  else wordTextFallbackLines.add(index);
  if (options.fromAudio) wordAudioFailures.delete(index);
  wordUnlockedCount = Math.min(
    wordLineData.length,
    Math.max(wordUnlockedCount, index + 2),
  );
  wordActiveIndex = index;
  setWordAudioStatus(
    firstCompletion
      ? `第${["一", "二", "三", "四", "五", "六"][index]}句已念完。下一句已解锁，等待你点击。`
      : `第${["一", "二", "三", "四", "五", "六"][index]}句重听完成。`,
    "idle",
  );
  dialectNotice.textContent =
    wordTextFallbackLines.size > 0
      ? "部分录音缺失，已按文字模式继续"
      : "点击已解锁词句播放，不会自动发声";
  renderWordState();
  if (wordCompletedLines.size === wordLineData.length) {
    triggerWordCompletion();
  }
}

function continueWordAsText() {
  if (wordActiveIndex === null || !wordAudioFailures.has(wordActiveIndex)) {
    return;
  }
  completeWordLine(wordActiveIndex, { fromAudio: false });
  announce(
    `第${["一", "二", "三", "四", "五", "六"][wordActiveIndex]}句已按文字模式读过`,
  );
}

function triggerWordCompletion() {
  if (wordFeedbackTriggered) return;
  wordFeedbackTriggered = true;
  wordStage.classList.remove("is-voice-playing", "is-stepping");
  wordStage.classList.add("is-completing");
  wordApplause.hidden = false;
  wordComplete.hidden = false;
  const allAudioComplete =
    wordTextFallbackLines.size === 0 &&
    wordCompletedLines.size === wordLineData.length;

  if (!allAudioComplete) {
    setWordAudioStatus(
      "六句词已按文字读毕。缺失的方言录音没有被合成声音替代。",
      "idle",
    );
    dialectNotice.textContent = "文字阅读已完成；部分天津话录音待补";
    announce("天津六句词已按文字读毕，可进入下一段故事");
    return;
  }

  setWordAudioStatus("六句词已念完，街坊笑了。", "idle");
  wordAudioManager?.stopCue();
  wordAudioManager?.playCue("laugh", {
    onEnded: () => {
      window.clearTimeout(wordLaughTimer);
      wordLaughTimer = window.setTimeout(() => {
        wordAudioManager?.playCue("cheer", {
          onError: () => {
            setWordAudioStatus(
              "六句词已念完；喝彩录音未能加载。",
              "idle",
            );
          },
        });
      }, motionEnabled ? 520 : 0);
    },
    onError: () => {
      setWordAudioStatus("六句词已念完；街坊笑声录音未能加载。", "idle");
    },
  });
  announce("天津六句词已念完，街坊先笑后喝彩");
}

function stopWordPlayback(options = {}) {
  window.clearTimeout(wordLaughTimer);
  wordLaughTimer = null;
  wordAudioManager?.stopAll("manual");
  wordStage.classList.remove(
    "is-voice-loading",
    "is-voice-playing",
    "is-voice-paused",
    "is-voice-error",
    "is-stepping",
    "is-completing",
  );
  if (wordActiveIndex !== null) {
    wordActiveIndex = null;
  }
  setWordAudioStatus(
    options.reason === "leave"
      ? "已离开六句词，语音播放已停止。"
      : "语音已停止。",
    "idle",
  );
  renderWordState();
  if (options.announce) announce("六句词语音已停止");
}

function resetWords(options = {}) {
  stopWordPlayback();
  window.clearTimeout(wordStepTimer);
  wordCompletedLines.clear();
  wordTextFallbackLines.clear();
  wordAudioFailures.clear();
  wordUnlockedCount = 1;
  wordActiveIndex = null;
  wordStep = 0;
  wordFeedbackTriggered = false;
  wordStage.dataset.wordStep = "0";
  wordStage.dataset.stepParity = "odd";
  wordStage.classList.remove("is-complete", "is-completing");
  wordWalker.style.setProperty("--word-left", `${wordPositions[0].left}%`);
  wordWalker.style.setProperty("--word-bottom", `${wordPositions[0].bottom}%`);
  wordWalker.style.setProperty("--word-scale", String(wordPositions[0].scale));
  wordStageBeat.textContent = "起势 · 未开口";
  wordStageCaption.textContent = "俞六站稳担子，先等第一句起声。";
  wordsPhase.textContent = "第一句 · 未起声";
  wordsPanelTitle.textContent = "天津药糖家家好";
  wordCurrentLine.textContent = "点击第一句播放天津话录音，俞六会随声音向前一步。";
  wordApplause.hidden = true;
  wordComplete.hidden = true;
  dialectNotice.textContent = "点击已解锁词句播放，不会自动发声";
  setWordAudioStatus("点击第一句开始；音频不会自动播放。", "idle");
  renderWordState();
  if (options.focus) wordNext.focus();
  if (options.announce) announce("已回到六句词的起势");
}

function setSceneEntry(key, options = {}) {
  const entry = sceneEntries[key];
  if (!entry) return;

  currentSceneKey = key;
  sceneSeals.forEach((button) => {
    const isActive = button.dataset.sceneKey === key;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-expanded", String(isActive));
  });

  window.clearTimeout(detailUpdateTimer);
  sceneDetail.classList.remove("is-updating");
  void sceneDetail.offsetWidth;
  sceneDetail.classList.add("is-updating");

  detailUpdateTimer = window.setTimeout(() => {
    detailKicker.textContent = entry.kicker;
    detailTitle.textContent = entry.title;
    detailSubtitle.textContent = entry.subtitle;
    detailBody.textContent = entry.body;
    detailTags.replaceChildren(
      ...entry.tags.map((tag) => {
        const item = document.createElement("li");
        item.textContent = tag;
        return item;
      }),
    );
    detailSource.textContent = entry.source;
    detailImage.src = entry.image;
    detailImage.alt = entry.imageAlt;
    detailNumber.textContent = entry.number;
    sceneDetail.classList.remove("is-updating");
  }, motionEnabled ? 150 : 0);

  if (options.announce) announce(entry.announcement);
}

function setMotionEnabled(enabled) {
  motionEnabled = enabled;
  experience.classList.toggle("motion-off", !enabled);
  motionToggle.setAttribute("aria-pressed", String(enabled));
  motionToggle.setAttribute("aria-label", enabled ? "关闭页面动画" : "开启页面动画");
  motionToggle.textContent = enabled ? "动画 · 开" : "动画 · 关";
}

function createAmbientSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  ambientContext = new AudioContextClass();
  const bufferLength = ambientContext.sampleRate * 2;
  const buffer = ambientContext.createBuffer(1, bufferLength, ambientContext.sampleRate);
  const samples = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < bufferLength; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.982 + white * 0.018;
    samples[index] = previous * 0.62;
  }

  ambientSource = ambientContext.createBufferSource();
  ambientSource.buffer = buffer;
  ambientSource.loop = true;

  const lowpass = ambientContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 410;
  lowpass.Q.value = 0.4;

  const highpass = ambientContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 75;

  ambientGain = ambientContext.createGain();
  ambientGain.gain.value = 0.02;

  ambientSource
    .connect(lowpass)
    .connect(highpass)
    .connect(ambientGain)
    .connect(ambientContext.destination);
  ambientSource.start();
  return true;
}

async function setSoundEnabled(enabled) {
  if (enabled && !ambientContext && !createAmbientSound()) {
    soundEnabled = false;
    soundToggle.setAttribute("aria-pressed", "false");
    soundToggle.setAttribute("aria-label", "当前浏览器不支持环境声");
    soundToggle.textContent = "街声 · 不可用";
    announce("当前浏览器无法生成环境声");
    return;
  }

  if (enabled && ambientContext) {
    await ambientContext.resume();
    soundEnabled = true;
  } else if (!enabled && ambientContext) {
    await ambientContext.suspend();
    soundEnabled = false;
  }

  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.setAttribute(
    "aria-label",
    soundEnabled ? "关闭街巷环境声" : "开启街巷环境声",
  );
  soundToggle.textContent = soundEnabled ? "街声 · 开" : "街声 · 关";
  announce(soundEnabled ? "街巷环境声已开启" : "街巷环境声已关闭");
}

function openReadingDialog(targetId) {
  readingDialog.scrollTop = 0;
  if (typeof readingDialog.showModal === "function") {
    readingDialog.showModal();
    readingClose.focus();
  } else {
    readingDialog.setAttribute("open", "");
  }
  if (typeof targetId === "string") {
    window.requestAnimationFrame(() => {
      const target = readingText.querySelector(`#${targetId}`);
      if (!target) return;
      readingDialog.scrollTo({
        top: Math.max(0, target.offsetTop - 120),
        behavior: "auto",
      });
      readingDialog.dispatchEvent(new Event("scroll"));
    });
  }
}

function renderOriginalReading() {
  readingText.replaceChildren();
  if (!originalStory) {
    const message = document.createElement("p");
    message.textContent =
      "未找到《四十八样》的原文数据，请检查 web/data/original-text.js。";
    readingText.append(message);
    readingMeta.textContent = "原文数据缺失";
    return;
  }

  originalStory.paragraphs.forEach((paragraph) => {
    const element = document.createElement("p");
    element.id = paragraph.paragraphId;
    element.dataset.sceneIds = paragraph.sceneIds.join(" ");
    element.dataset.sourceVerified = String(paragraph.sourceVerified);
    element.textContent = paragraph.content;
    readingText.append(element);
  });
  readingMeta.textContent = "摘自冯骥才著《俗世奇人》原文片段";
}

function closeReadingDialog() {
  if (typeof readingDialog.close === "function") {
    readingDialog.close();
  } else {
    readingDialog.removeAttribute("open");
  }
  readingEntry.focus();
}

function openMediaDialog(button) {
  dialogImage.src = button.dataset.galleryImage;
  dialogImage.alt = button.dataset.galleryAlt || "";
  dialogTitle.textContent = button.dataset.galleryTitle || "素材图稿";
  dialogCaption.textContent = button.dataset.galleryCaption || "";
  mediaDialog.querySelector(".dialog-media").classList.remove("is-missing");
  if (typeof mediaDialog.showModal === "function") {
    mediaDialog.showModal();
    dialogClose.focus();
  } else {
    mediaDialog.setAttribute("open", "");
  }
}

function closeMediaDialog() {
  if (typeof mediaDialog.close === "function") {
    mediaDialog.close();
  } else {
    mediaDialog.removeAttribute("open");
  }
}

function registerImageFallbacks() {
  document.querySelectorAll("[data-media-shell]").forEach((shell) => {
    const image = shell.querySelector("img");
    if (!image) return;

    const markMissing = () => shell.classList.add("is-missing");
    if (image.complete && image.naturalWidth === 0) markMissing();
    image.addEventListener("error", markMissing, { once: true });
    image.addEventListener("load", () => shell.classList.remove("is-missing"));
  });
}

function registerWordImageFallbacks() {
  wordStage.querySelectorAll("[data-word-image]").forEach((image) => {
    const fallback = document.getElementById(image.dataset.wordFallback);
    const markMissing = () => {
      image.classList.add("is-missing");
      image.setAttribute("aria-hidden", "true");
      if (fallback) fallback.hidden = false;
    };

    if (image.complete && image.naturalWidth === 0) markMissing();
    image.addEventListener("error", markMissing, { once: true });
    image.addEventListener("load", () => {
      image.classList.remove("is-missing");
      image.removeAttribute("aria-hidden");
      if (fallback) fallback.hidden = true;
    });
  });
}

function setupParallax() {
  if (!sceneCanvas) return;

  sceneCanvas.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartOffset = Number.parseFloat(
      sceneCanvas.style.getPropertyValue("--parallax-x"),
    ) || 0;
    sceneCanvas.classList.add("is-dragging");
    sceneCanvas.setPointerCapture(event.pointerId);
  });

  sceneCanvas.addEventListener("pointermove", (event) => {
    if (event.pointerId === dragPointerId) {
      const offset = Math.max(-13, Math.min(13, dragStartOffset + event.clientX - dragStartX));
      sceneCanvas.style.setProperty("--parallax-x", `${offset}px`);
      sceneCanvas.style.setProperty("--person-x", `${offset * -0.45}px`);
      return;
    }

    if (!motionEnabled || event.pointerType !== "mouse") return;
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);

    pointerFrame = window.requestAnimationFrame(() => {
      const bounds = sceneCanvas.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      sceneCanvas.style.setProperty("--parallax-x", `${x * -9}px`);
      sceneCanvas.style.setProperty("--parallax-y", `${y * -6}px`);
      sceneCanvas.style.setProperty("--person-x", `${x * -4}px`);
    });
  });

  function stopDragging(event) {
    if (event.pointerId !== dragPointerId) return;
    if (sceneCanvas.hasPointerCapture(event.pointerId)) {
      sceneCanvas.releasePointerCapture(event.pointerId);
    }
    dragPointerId = null;
    sceneCanvas.classList.remove("is-dragging");
  }

  sceneCanvas.addEventListener("pointerup", stopDragging);
  sceneCanvas.addEventListener("pointercancel", stopDragging);

  sceneCanvas.addEventListener("pointerleave", () => {
    if (dragPointerId !== null) return;
    sceneCanvas.style.setProperty("--parallax-x", "0px");
    sceneCanvas.style.setProperty("--parallax-y", "0px");
    sceneCanvas.style.setProperty("--person-x", "0px");
  });
}

sceneSeals.forEach((button) => {
  button.addEventListener("click", () => {
    setSceneEntry(button.dataset.sceneKey, { announce: true });
  });
});

soundToggle.addEventListener("click", () => {
  void setSoundEnabled(!soundEnabled);
});

motionToggle.addEventListener("click", () => {
  setMotionEnabled(!motionEnabled);
  announce(motionEnabled ? "页面动画已开启" : "页面动画已关闭");
});

enterSceneButton.addEventListener("click", () => {
  document.querySelector("#streetScene").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  window.setTimeout(() => sceneSeals[0].focus({ preventScroll: true }), 500);
});

continueButton.addEventListener("click", () => {
  document.querySelector("#manuscripts").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
});

restartButton.addEventListener("click", () => {
  setSceneEntry("person");
  setCandy(1, { instant: true, markViewed: false });
  if (window.dragonAssemblyComponent?.reset) {
    window.dragonAssemblyComponent.reset({ announce: false, focus: false });
  } else {
    setAssemblyStep(0);
  }
  setWalkStep(0);
  resetInnovationExperience();
  resetWords();
  sceneCanvas.style.setProperty("--parallax-x", "0px");
  sceneCanvas.style.setProperty("--parallax-y", "0px");
  sceneCanvas.style.setProperty("--person-x", "0px");
  document.querySelector(".opening").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  announce("已回到卷首，第五阶段的进度也已重置");
});

[
  readingEntry,
  readingEntryBottom,
  readingShortcut,
  phaseTwoReading,
  innovationReading,
  wordsReading,
].forEach((button) => {
  button.addEventListener("click", openReadingDialog);
});

renderOriginalReading();
readingClose.addEventListener("click", closeReadingDialog);
readingDialogConfirm.addEventListener("click", closeReadingDialog);
dialogClose.addEventListener("click", closeMediaDialog);

document.querySelectorAll("[data-gallery-image]").forEach((button) => {
  button.addEventListener("click", () => openMediaDialog(button));
});

assemblyStepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const requestedStep = Number(button.dataset.assemblyStep);
    if (window.dragonAssemblyComponent?.focusStage) {
      window.dragonAssemblyComponent.focusStage(requestedStep);
      return;
    }
    if (requestedStep === assemblyStep + 1) {
      setAssemblyStep(requestedStep, { announce: true });
      return;
    }
    if (requestedStep <= assemblyStep) {
      announce(
        requestedStep === assemblyStep
          ? `${assemblySteps[requestedStep - 1].title}已经装好`
          : "这处零件已经装好，接着装下一处即可",
      );
      return;
    }
    announce(`先把第 ${assemblyStep + 1} 步装好，再动这一件`);
  });
});

assemblyAdvance.addEventListener("click", () => {
  if (window.dragonAssemblyComponent?.autoInstallCurrentStage) {
    window.dragonAssemblyComponent.autoInstallCurrentStage();
    return;
  }
  if (assemblyStep < assemblySteps.length) {
    setAssemblyStep(assemblyStep + 1, { announce: true });
  }
});

function resetAssemblyExperience() {
  if (window.dragonAssemblyComponent?.reset) {
    window.dragonAssemblyComponent.reset({ announce: true, focus: true });
  } else {
    setAssemblyStep(0);
    assemblyStepButtons[0].focus();
    announce("挑担已经拆开，可以重新装配");
  }
}

assemblyReset.addEventListener("click", resetAssemblyExperience);
assemblyCompleteReset?.addEventListener("click", resetAssemblyExperience);
assemblyContinueReading?.addEventListener("click", () => {
  const targetId = "si-shi-ba-yang-p14";
  const hasTarget = Boolean(readingText.querySelector(`#${targetId}`));
  openReadingDialog(hasTarget ? targetId : undefined);
  announce(
    hasTarget
      ? "已打开第三章原文，定位到刘二爷夸赞挑担的一段"
      : "对应原文暂未导入，请补充《四十八样》第三章的原文段落后再试",
  );
});

walkActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.walkAction;
    const expectedAction = walkActionPlan[walkStep];

    if (walkStep >= walkActionPlan.length) {
      announce("八字已经走成，可以重新摆步再看一遍");
      walkReplay.focus();
      return;
    }

    if (action !== expectedAction) {
      window.clearTimeout(walkNudgeTimer);
      button.classList.remove("is-nudged");
      void button.offsetWidth;
      button.classList.add("is-nudged");
      walkNudgeTimer = window.setTimeout(() => {
        button.classList.remove("is-nudged");
      }, 380);
      announce(`这一拍先不要急，当前该做的是${walkActionNames[expectedAction]}`);
      walkInstruction.textContent = `脚步还停在当前节点。先点“${walkActionNames[expectedAction]}”。`;
      return;
    }

    setWalkStep(walkStep + 1, { animate: true, announce: true });
  });
});

walkReset.addEventListener("click", () => {
  setWalkStep(0);
  walkActionButtons[0].focus();
  announce("八字路线已回到起势，可以重新走");
});

walkReplay.addEventListener("click", () => {
  setWalkStep(0);
  document.querySelector("#walkFigureEight").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  window.setTimeout(() => walkActionButtons[0].focus({ preventScroll: true }), 460);
  announce("已回到起势，再走一遍八字");
});

innovationBeatButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setInnovationStep(button.dataset.innovationStep, { announce: true });
  });
});

innovationNext.addEventListener("click", () => {
  if (innovationStep >= innovationScenes.length - 1) return;
  setInnovationStep(innovationStep + 1, { announce: true });
});

innovationChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectInnovationChoice(button.dataset.innovationChoice);
  });
});

innovationOrderButton.addEventListener("click", () => {
  if (innovationStoryComplete) {
    cancelInnovationSequence();
  }
  playInnovationSequence();
});

innovationReset.addEventListener("click", () => {
  resetInnovationExperience({ focus: true, announce: true });
  document.querySelector("#innovationStage").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
});

innovationReplay.addEventListener("click", () => {
  setInnovationStep(2);
  document.querySelector("#innovationStage").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  window.setTimeout(playInnovationSequence, motionEnabled ? 520 : 0);
  announce("回到三页变法，再顺故事看一遍");
});

wordNext.addEventListener("click", () => {
  if (
    !wordAudioManager ||
    wordPlaybackState === "playing" ||
    wordPlaybackState === "loading"
  ) {
    return;
  }
  if (
    wordPlaybackState === "paused" &&
    wordActiveIndex !== null
  ) {
    setWordAudioStatus(
      `继续播放：${wordLineData[wordActiveIndex].text}`,
      "loading",
    );
    wordAudioManager.resumeLine(
      wordPlaybackHandlers(wordActiveIndex),
    );
    return;
  }
  if (
    wordActiveIndex !== null &&
    wordAudioFailures.has(wordActiveIndex) &&
    !wordCompletedLines.has(wordActiveIndex)
  ) {
    continueWordAsText();
    return;
  }
  const nextIndex =
    wordActiveIndex !== null && wordCompletedLines.has(wordActiveIndex)
      ? wordActiveIndex + 1
      : wordActiveIndex ?? 0;
  if (nextIndex >= wordLineData.length) return;
  playWordLine(nextIndex, { announce: true });
});

wordBack.addEventListener("click", () => {
  if (wordActiveIndex === null || wordActiveIndex === 0) return;
  playWordLine(wordActiveIndex - 1, { announce: true });
});

wordLineButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.wordLinePlay);
    if (!Number.isInteger(index) || !wordLineUnlocked(index)) return;
    if (
      wordActiveIndex === index &&
      wordPlaybackState === "playing"
    ) {
      setWordAudioStatus(
        `“${wordLineData[index].text}”正在播放；可暂停或重听。`,
        "playing",
      );
      return;
    }
    if (
      wordActiveIndex === index &&
      wordPlaybackState === "paused"
    ) {
      wordNext.click();
      return;
    }
    playWordLine(index, { announce: true });
  });
});

wordPause.addEventListener("click", () => {
  wordAudioManager?.pauseLine();
});

wordAudioReplay.addEventListener("click", () => {
  if (wordActiveIndex === null) return;
  playWordLine(wordActiveIndex, { announce: true, replay: true });
});

function syncWordMute(muted) {
  wordAudioManager?.setMuted(muted);
  wordMute.setAttribute("aria-pressed", String(muted));
  wordMute.textContent = muted ? "取消静音" : "静音";
  dialectToggle.setAttribute("aria-checked", String(!muted));
  dialectToggle.lastChild.textContent = muted ? " 语音静音" : " 语音开启";
}

wordMute.addEventListener("click", () => {
  syncWordMute(wordMute.getAttribute("aria-pressed") !== "true");
});

dialectToggle.addEventListener("click", () => {
  syncWordMute(dialectToggle.getAttribute("aria-checked") === "true");
});

wordVolume.addEventListener("input", () => {
  const volume = wordAudioManager?.setVolume(wordVolume.value);
  if (volume !== undefined) {
    wordAudioStatus.textContent = `语音音量 ${Math.round(volume * 100)}%`;
  }
});

wordReplay.addEventListener("click", () => {
  resetWords({ announce: true });
  document.querySelector("#wordsStage").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  window.setTimeout(() => wordNext.focus({ preventScroll: true }), 320);
});

wordReplayComplete.addEventListener("click", () => {
  resetWords({ announce: true });
  document.querySelector("#wordsStage").scrollIntoView({
    behavior: motionEnabled ? "smooth" : "auto",
    block: "start",
  });
  window.setTimeout(() => wordNext.focus({ preventScroll: true }), 320);
});

wordContinueStory.addEventListener("click", () => {
  stopWordPlayback();
  const nextChapterButton = document.querySelector(
    '#sishiChapterNav [data-sishi-page="chapter7"]',
  );
  if (nextChapterButton) {
    nextChapterButton.click();
  } else {
    window.location.hash = "#sishi/chapter7";
  }
});

[readingDialog, mediaDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (mediaDialog.open) closeMediaDialog();
  if (readingDialog.open) closeReadingDialog();
});

const wordPageObserver = new MutationObserver(() => {
  const pageName = document.body.dataset.sishiPage;
  if (
    pageName &&
    pageName !== "chapter6" &&
    (wordActiveIndex !== null || wordPlaybackState !== "idle")
  ) {
    stopWordPlayback({ reason: "leave" });
  }
});
wordPageObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["data-sishi-page"],
});

window.addEventListener(
  "pagehide",
  (event) => {
    stopWordPlayback({ reason: "leave" });
    if (!event.persisted) wordAudioManager?.destroy();
  },
  { once: true },
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

setSceneEntry(currentSceneKey);
setMotionEnabled(motionEnabled);
registerImageFallbacks();
registerWordImageFallbacks();
setupParallax();
renderCandyDots();
renderCandyGrid();
setCandy(1, { instant: true, markViewed: false });
setAssemblyStep(0);
setWalkStep(0);
setInnovationStep(0);
renderWordLines();
resetWords();

window.wordLyricsController = Object.freeze({
  getSnapshot: () => ({
    activeIndex: wordActiveIndex,
    playbackState: wordPlaybackState,
    unlockedCount: wordUnlockedCount,
    completed: [...wordCompletedLines],
    textFallback: [...wordTextFallbackLines],
    audioFailures: [...wordAudioFailures],
    feedbackTriggered: wordFeedbackTriggered,
    step: wordStep,
    audio: wordAudioManager?.getSnapshot?.() || null,
  }),
  playLine: (index) => playWordLine(index, { announce: true }),
  pause: () => wordAudioManager?.pauseLine(),
  resume: () =>
    wordAudioManager?.resumeLine(
      wordActiveIndex === null
        ? {}
        : wordPlaybackHandlers(wordActiveIndex),
    ),
  stop: () => stopWordPlayback(),
  reset: () => resetWords(),
});

const candyImageProbe = new Image();
candyImageProbe.addEventListener("error", () => {
  cabinetShell.classList.add("is-media-missing");
  candyPreview.classList.add("is-media-missing");
});
candyImageProbe.src = candyStories[0].image;
