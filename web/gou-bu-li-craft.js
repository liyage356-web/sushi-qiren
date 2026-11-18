(() => {
  "use strict";

  const PHASE = Object.freeze({
    MIXING: "mixing",
    WRAPPING: "wrapping",
    PLEATING: "pleating",
    STEAMING: "steaming",
    COMPLETED: "completed",
  });

  // 所有本篇制作素材只在这里配置，页面与渲染函数不写散落的图片地址。
  const ASSET_ROOT = "../public/assets/goubuli/";
  const ASSETS = Object.freeze({
    [PHASE.MIXING]: {
      background: "scene-mixing.webp",
      subject: "bowl-mixing.webp",
    },
    [PHASE.WRAPPING]: {
      background: "scene-wrapping.webp",
      subject: "dough-wrapping.webp",
    },
    [PHASE.PLEATING]: {
      background: "scene-pleating.webp",
      subject: "baozi-pleating.webp",
    },
    [PHASE.STEAMING]: {
      background: "scene-steaming.webp",
      subject: "steamer-steaming.webp",
    },
  });

  const MIXING_STATE_FILES = Object.freeze([
    "mixing-after-meat.webp",
    "mixing-after-scallion.webp",
    "mixing-after-soup.webp",
    "mixing-ingredients-ready.webp",
    "mixing-chopsticks-in-bowl.webp",
    "mixing-complete.webp",
  ]);

  const MIXING_BACKGROUND_FILES = Object.freeze([
    "scene-mixing-chopsticks.webp",
  ]);

  const WRAPPING_STATE_FILES = Object.freeze([
    "wrap-bg-hand.png",
    "wrap-01.webp",
    "wrap-02.webp",
    "wrap-03.webp",
  ]);

  const WRAPPING_STEPS = Object.freeze([
    {
      id: "dough",
      counter: "第 1 / 3 步",
      title: "取一张包子皮",
      hint: "按住最上面的面皮，拖到左手手心处再松手。",
      copy: "面皮就在眼前。看准最上面那一张，指腹轻托，沿桌面拖进左手掌心。",
      message: "",
      imageFile: WRAPPING_STATE_FILES[0],
      imageAlt: "第一人称制作台，左手空掌等待接过案板上最上层的包子皮",
    },
    {
      id: "filling",
      counter: "第 2 / 3 步",
      title: "放入肉馅",
      hint: "包子皮已经托稳。点一下左侧肉馅碗，放一小勺馅到面皮中央。",
      copy: "馅料不用贪多。落在面皮中央，四周才留得下收边和捏褶的空间。",
      message: "包子皮已托稳。",
      imageFile: WRAPPING_STATE_FILES[1],
      imageAlt: "左手掌心托着一张包子皮，等待放入肉馅",
    },
    {
      id: "ready",
      counter: "第 3 / 3 步",
      title: "右手准备",
      hint: "肉馅已经放好。点击右侧提示，让右手慢慢靠近面皮边缘。",
      copy: "左手托稳，右手从外侧收进来。两边动作要稳，包子才不会歪。",
      message: "肉馅已放在面皮中央。",
      imageFile: WRAPPING_STATE_FILES[2],
      imageAlt: "左手托着放了肉馅的包子皮，右手准备靠近边缘",
    },
    {
      id: "complete",
      counter: "第二道 · 已完成",
      title: "右手已就位",
      hint: "沿着面皮边缘，开始捏出十八道褶。",
      copy: "沿着面皮边缘，右手一推一收，十八道褶要从这一圈开始。",
      message: "右手已就位，十八褶阶段已经解锁。",
      imageFile: WRAPPING_STATE_FILES[3],
      imageAlt: "双手托住面皮与肉馅，准备沿边缘捏出十八道褶",
    },
  ]);

  const WRAPPING_STEP_BY_ID = new Map(
    WRAPPING_STEPS.map((step) => [step.id, step]),
  );

  const STEAMING_STATE_FILES = Object.freeze([
    "steamer-closed.webp",
    "steamer-open.webp",
  ]);

  const PLEATING_STATE_FILES = Object.freeze([
    "pleat-00.webp",
    "pleat-03.webp",
    "pleat-06.webp",
    "pleat-09.webp",
    "pleat-12.webp",
    "pleat-15.webp",
    "pleat-18.webp",
  ]);
  const PLEAT_COUNT_MAX = 18;
  const PLEAT_REVEAL_FILE = "pleat-hand-reveal.png";
  const PROGRESS_SESSION_KEY = "gou-bu-li-craft-progress-v1";
  const PROGRESS_VERSION = 1;

  const MIXING_STEPS = Object.freeze([
    {
      id: "meat",
      counter: "第 1 / 5 步",
      title: "先添猪肉馅",
      hint: "按住左上角的猪肉馅，拖进中央青花碗后松手。",
      copy: "先让肉馅入碗，再谈后面的鲜、香与润。拖错位置时，猪肉馅会自己回到盘里。",
      message: "猪肉馅已经落进碗中。",
      stateFile: null,
    },
    {
      id: "scallion",
      counter: "第 2 / 5 步",
      title: "再撒一把葱花",
      hint: "按住左侧葱花，拖到碗口高亮处再松手。",
      copy: "葱花要一点点提香，别抢了肉馅的本味。",
      message: "葱花已经撒进肉馅。",
      stateFile: MIXING_STATE_FILES[0],
    },
    {
      id: "soup",
      counter: "第 3 / 5 步",
      title: "添一勺鲜汤",
      hint: "按住上方汤碗，向青花碗方向拖动并倾斜。",
      copy: "拖动距离会让汤碗逐渐倾斜；倾到足够角度，汤汁才会落进碗里。",
      message: "一勺鲜汤已经润进肉馅。",
      stateFile: MIXING_STATE_FILES[1],
    },
    {
      id: "fat",
      counter: "第 4 / 5 步",
      title: "拌入猪油丁",
      hint: "按住左下角猪油丁，拖进中央碗里后松手。",
      copy: "油丁要均匀落进碗中，肉馅才会更香、更润。",
      message: "猪油丁已经拌进碗中。",
      stateFile: MIXING_STATE_FILES[2],
      stateView: "scene",
      imageAlt: "排骨汤倒入后，肉馅和葱花浸在汤汁中的青花大碗",
    },
    {
      id: "chopsticks",
      counter: "第 5 / 5 步",
      title: "拿起筷子",
      hint: "食材已经齐了。点一下右侧筷子，准备顺着一个方向搅。",
      copy: "筷子入碗以后，按住碗内绕圈，也可点自动完成。",
      message: "筷子已经落入碗中。按住碗内转圈吧。",
      stateFile: MIXING_STATE_FILES[3],
      backgroundFile: MIXING_BACKGROUND_FILES[0],
      imageAlt: "猪肉、葱花与猪油丁已经齐备，木筷插在青花大碗里",
    },
    {
      id: "stirring",
      counter: "第 5 / 5 步",
      title: "顺着一个方向搅",
      hint: "按住筷子沿碗内圆周拖动，让食材慢慢合匀。",
      copy: "鼠标或手指不要松开，顺着同一方向绕圈；触屏也可点自动完成。",
      message: "正在搅匀肉馅。",
      stateFile: MIXING_STATE_FILES[4],
      stateView: "scene",
      imageAlt: "木筷立在装有猪肉、葱花与猪油丁的青花大碗中",
    },
    {
      id: "complete",
      counter: "第一道 · 已完成",
      title: "肉馅调好了",
      hint: "肉馅已经调匀，鲜汤与猪油都裹进了肉里。可以进入包制了。",
      copy: "这一碗馅已经调匀，下一道工序是把馅稳稳包进面皮。",
      message: "肉馅调好了，已经解锁包制。",
      stateFile: MIXING_STATE_FILES[5],
      stateView: "scene",
      imageAlt: "猪肉、葱花、鲜汤与猪油已经充分调匀的青花大碗",
    },
  ]);

  const MIXING_STEP_BY_ID = new Map(
    MIXING_STEPS.map((step) => [step.id, step]),
  );

  const STAGES = Object.freeze([
    {
      id: PHASE.MIXING,
      order: 1,
      ordinal: "第一道",
      label: "调馅",
      title: "调馅",
      hint: "手腕先稳，让汤汁、猪油与肉馅慢慢合匀。",
      noteTitle: "一碗馅，先要调得香润",
      noteCopy:
        "狗子站在案前，把肉馅、葱花、汤汁与猪油一点点合匀。街坊记住的那股香味，就从这只青花大碗里开始。",
      action: "调好这碗馅",
      completeNote: "这一碗馅已经调匀。",
      artLabel: "第一人称调馅器物",
      caption: "青花碗 · 葱香肉馅",
      subjectAlt: "第一人称视角下，桌案中央的青花调馅碗",
      backgroundAlt: "双手在木桌前拌合青花碗里的葱香肉馅",
    },
    {
      id: PHASE.WRAPPING,
      order: 2,
      ordinal: "第二道",
      label: "包制",
      title: "包制",
      hint: "托稳面皮，收拢边缘，把馅稳稳裹进面中。",
      noteTitle: "掌心托住一只包子的分寸",
      noteCopy:
        "面皮摊在掌心，馅不能贪多，四周还要留出收边的余地。狗子的动作不慌，包子才包得稳。",
      action: "包好这一只",
      completeNote: "面皮已经收拢，馅料稳稳包在其中。",
      artLabel: "第一人称包制面皮",
      caption: "面皮 · 肉馅 · 收拢",
      subjectAlt: "第一人称视角下，掌心托着面皮与肉馅",
      backgroundAlt: "木桌上摆着包子面皮，双手托起一张面皮放入肉馅",
    },
    {
      id: PHASE.PLEATING,
      order: 3,
      ordinal: "第三道",
      label: "十八褶",
      title: "十八褶",
      hint: "指腹一推一收，顺着边沿留出一圈匀称的褶。",
      noteTitle: "十八褶，收的是一圈端正",
      noteCopy:
        "褶子沿边一把把收起来，不多也不少。十八褶不只是好看，更让包子收口严实，出笼后仍旧挺立。",
      action: "收出十八褶",
      completeNote: "一圈十八褶已经收齐。",
      artLabel: "第一人称十八褶包子",
      caption: "竹蒸笼 · 十八褶收口",
      subjectAlt: "第一人称视角下，桌案上收出一圈褶子的包子",
      backgroundAlt: "青花碗、肉馅与摆满十八褶包子的竹蒸笼",
    },
    {
      id: PHASE.STEAMING,
      order: 4,
      ordinal: "第四道",
      label: "揭笼",
      title: "揭笼",
      hint: "笼盖一开，白汽先起；让热气散一散，再看包子。",
      noteTitle: "笼盖一开，香气先出了门",
      noteCopy:
        "调好的馅、包好的皮和收齐的褶，都在这一笼热气里成形。笼盖一开，街坊先闻到的是白汽里的鲜香。",
      action: "掀开笼盖",
      completeNote: "热包子已经出笼。",
      artLabel: "第一人称蒸笼",
      caption: "白汽 · 蒸笼 · 出笼",
      subjectAlt: "第一人称视角下，桌案上的竹蒸笼与笼盖",
      backgroundAlt: "暖色木桌上摆着青花空碗和装满包子的竹蒸笼",
    },
  ]);

  const stageById = new Map(STAGES.map((stage) => [stage.id, stage]));
  const module = document.querySelector("#gouBuliCraftModule");
  const trigger = document.querySelector("#dogCraftBenchOpen");
  if (!module || !trigger) return;

  const canvas = module.querySelector(".gbc-canvas");
  const title = module.querySelector("#gbcStageTitle");
  const ordinal = module.querySelector("#gbcStageOrdinal");
  const hint = module.querySelector("#gbcStageHint");
  const noteTitle = module.querySelector("#gbcNoteTitle");
  const noteCopy = module.querySelector("#gbcNoteCopy");
  const actionButton = module.querySelector("#gbcCraftAction");
  const actionText = module.querySelector("#gbcActionText");
  const backgroundImage = module.querySelector("#gbcBackgroundImage");
  const backgroundFallback = module.querySelector("#gbcBackgroundFallback");
  const backgroundNotice = module.querySelector("#gbcBackgroundNotice");
  const backgroundName = module.querySelector("#gbcBackgroundName");
  const subjectImage = module.querySelector("#gbcSubjectImage");
  const subjectFallback = module.querySelector("#gbcSubjectFallback");
  const subjectName = module.querySelector("#gbcSubjectName");
  const subjectLabel = module.querySelector("#gbcSubjectLabel");
  const ingredientStrip = module.querySelector("#gbcIngredientStrip");
  const completionSeal = module.querySelector("#gbcCompletionSeal");
  const stageCompleteNote = module.querySelector("#gbcStageCompleteNote");
  const closeButton = module.querySelector("#gbcCloseButton");
  const previousStageButton = module.querySelector(
    "#gbcPreviousStageButton",
  );
  const skipStageButton = module.querySelector("#gbcSkipStageButton");
  const restartCourseButton = module.querySelector(
    "#gbcRestartCourseButton",
  );
  const originalButton = module.querySelector("#gbcOriginalButton");
  const soundButton = module.querySelector("#gbcSoundButton");
  const soundLabel = module.querySelector("#gbcSoundLabel");
  const liveStatus = module.querySelector("#gbcLiveStatus");
  const fade = module.querySelector("#gbcFade");
  const mixingLayer = module.querySelector("#gbcMixingLayer");
  const mixingStateImage = module.querySelector("#gbcMixingStateImage");
  const replacementBowlEmpty = module.querySelector(
    "#gbcReplacementBowlEmpty",
  );
  const replacementBowlShell = module.querySelector(
    "#gbcReplacementBowlShell",
  );
  const soupPourBackground = module.querySelector("#gbcSoupPourBackground");
  const soupPourImage = module.querySelector("#gbcSoupPourImage");
  const stirZone = module.querySelector("#gbcStirZone");
  const stirHandle = module.querySelector("#gbcStirHandle");
  const dropHint = module.querySelector("#gbcDropHint");
  const mixingStepCounter = module.querySelector("#gbcMixingStepCounter");
  const mixingStepTitle = module.querySelector("#gbcMixingStepTitle");
  const mixingStepCopy = module.querySelector("#gbcMixingStepCopy");
  const mixingFeedback = module.querySelector("#gbcMixingFeedback");
  const stirProgressWrap = module.querySelector("#gbcStirProgressWrap");
  const stirProgressLabel = module.querySelector("#gbcStirProgressLabel");
  const stirProgressFill = module.querySelector("#gbcStirProgressFill");
  const autoStirButton = module.querySelector("#gbcAutoStirButton");
  const skipMixingButton = module.querySelector("#gbcSkipMixingButton");
  const mixingNextButton = module.querySelector("#gbcMixingNextButton");
  const chopsticksButton = module.querySelector("#gbcChopsticksButton");
  const wrappingLayer = module.querySelector("#gbcWrappingLayer");
  const wrappingStateImages = [
    ...module.querySelectorAll("[data-gbc-wrap-frame]"),
  ];
  const wrapDoughButton = module.querySelector("#gbcWrapDoughButton");
  const wrapHandDrop = module.querySelector("#gbcWrapHandDrop");
  const wrapFillingButton = module.querySelector("#gbcWrapFillingButton");
  const wrapStepCounter = module.querySelector("#gbcWrapStepCounter");
  const wrapStepTitle = module.querySelector("#gbcWrapStepTitle");
  const wrapStepCopy = module.querySelector("#gbcWrapStepCopy");
  const wrapFeedback = module.querySelector("#gbcWrapFeedback");
  const wrapPromptButton = module.querySelector("#gbcWrapPromptButton");
  const wrapReplayButton = module.querySelector("#gbcWrapReplayButton");
  const wrapNextButton = module.querySelector("#gbcWrapNextButton");
  const pleatingLayer = module.querySelector("#gbcPleatingLayer");
  const pleatingStateImages = [
    ...module.querySelectorAll("[data-gbc-pleat-frame]"),
  ];
  const pleatingFallback = module.querySelector("#gbcPleatingFallback");
  const pleatHotspot = module.querySelector("#gbcPleatHotspot");
  const pleatProgressWrap = module.querySelector("#gbcPleatProgressWrap");
  const pleatProgressCount = module.querySelector("#gbcPleatProgressCount");
  const pleatProgressFill = module.querySelector("#gbcPleatProgressFill");
  const pleatStepCounter = module.querySelector("#gbcPleatStepCounter");
  const pleatStepTitle = module.querySelector("#gbcPleatStepTitle");
  const pleatStepCopy = module.querySelector("#gbcPleatStepCopy");
  const pleatFeedback = module.querySelector("#gbcPleatFeedback");
  const pleatReplayButton = module.querySelector("#gbcPleatReplayButton");
  const pleatNextButton = module.querySelector("#gbcPleatNextButton");
  const pleatReveal = module.querySelector("#gbcPleatReveal");
  const pleatRevealImage = module.querySelector(
    "#gbcPleatRevealImage",
  );
  const pleatRevealContinue = module.querySelector(
    "#gbcPleatRevealContinue",
  );
  const steamingLayer = module.querySelector("#gbcSteamingLayer");
  const steamClosedImage = module.querySelector("#gbcSteamClosedImage");
  const steamOpenImage = module.querySelector("#gbcSteamOpenImage");
  const steamLidButton = module.querySelector("#gbcSteamLidButton");
  const steamCounter = module.querySelector("#gbcSteamCounter");
  const steamTitle = module.querySelector("#gbcSteamTitle");
  const steamCopy = module.querySelector("#gbcSteamCopy");
  const steamFeedback = module.querySelector("#gbcSteamFeedback");
  const steamActions = module.querySelector("#gbcSteamActions");
  const steamStoryButton = module.querySelector("#gbcSteamStoryButton");
  const steamReplayButton = module.querySelector("#gbcSteamReplayButton");
  const mixingIngredientButtons = [
    ...module.querySelectorAll("[data-gbc-mixing-ingredient]"),
  ];
  const stageButtons = [
    ...module.querySelectorAll("[data-gbc-stage]"),
  ];
  const resumePrompt = module.querySelector("#gbcResumePrompt");
  const resumeDescription = module.querySelector(
    "#gbcResumeDescription",
  );
  const resumeButton = module.querySelector("#gbcResumeButton");
  const restartFromPromptButton = module.querySelector(
    "#gbcRestartFromPromptButton",
  );
  const originalModal = document.querySelector("#dogOriginalModal");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const completed = Object.fromEntries(
    STAGES.map((stage) => [stage.id, false]),
  );
  const assetInventoryPromise = loadAssetInventory();
  const state = {
    phase: PHASE.MIXING,
    completed,
    mixing: {
      step: "meat",
      used: {
        meat: false,
        scallion: false,
        soup: false,
        fat: false,
      },
      progress: 0,
      busy: false,
      skipped: false,
      feedback: "",
      pointerActive: false,
      lastAngle: null,
      autoFrame: null,
      drag: null,
      tilt: 0,
      assetError: false,
    },
    wrapping: {
      step: "dough",
      busy: false,
      feedback: "",
      imageFile: WRAPPING_STATE_FILES[0],
      transitionVersion: 0,
      drag: null,
    },
    pleating: {
      count: 0,
      busy: false,
      feedback: "",
      imageFile: PLEATING_STATE_FILES[0],
      transitionVersion: 0,
      assetError: false,
      revealPending: false,
    },
    steaming: {
      opened: false,
      busy: false,
      phase: "closed",
      feedback: "",
      transitionVersion: 0,
    },
  };
  const mixing = state.mixing;
  const wrapping = state.wrapping;
  const pleating = state.pleating;
  const steaming = state.steaming;
  const preloadedMixingAssets = preloadMixingAssets();
  const preloadedWrappingAssets = preloadWrappingAssets();
  const preloadedPleatingAssets = preloadPleatingAssets();
  const preloadedSteamingAssets = preloadSteamingAssets();

  let lastFocusBeforeOpen = null;
  let renderVersion = 0;
  let transitionVersion = 0;
  let transitioning = false;
  let soundEnabled = readSoundPreference();
  let pleatAudioContext = null;
  let pendingResume = null;
  let progressSaveSuspended = false;

  function readSoundPreference() {
    try {
      return window.localStorage.getItem("gou-bu-li-craft-sound") === "on";
    } catch {
      return false;
    }
  }

  function saveSoundPreference() {
    try {
      window.localStorage.setItem(
        "gou-bu-li-craft-sound",
        soundEnabled ? "on" : "off",
      );
    } catch {
      // 浏览器禁用存储时，本次页面中的开关状态仍然有效。
    }
  }

  function snapshotProgress() {
    return {
      version: PROGRESS_VERSION,
      phase: state.phase,
      completed: { ...state.completed },
      mixing: {
        step: mixing.step,
        used: { ...mixing.used },
        progress: Math.round(mixing.progress),
        skipped: mixing.skipped,
      },
      wrapping: {
        step: wrapping.step,
        feedback: wrapping.feedback,
      },
      pleating: {
        count: pleating.count,
        feedback: pleating.feedback,
        revealPending: pleating.revealPending,
      },
      steaming: {
        opened: steaming.opened,
        phase: steaming.phase,
      },
      storyPage:
        window.dogBuLiStory?.getCurrentPage?.() || "craft",
      savedAt: Date.now(),
    };
  }

  function hasMeaningfulProgress(progress) {
    if (!progress || progress.version !== PROGRESS_VERSION) return false;
    const completedAny =
      progress.completed &&
      Object.values(progress.completed).some(Boolean);
    const mixingUsed =
      progress.mixing?.used &&
      Object.values(progress.mixing.used).some(Boolean);
    return Boolean(
      completedAny ||
        progress.phase !== PHASE.MIXING ||
        progress.mixing?.step !== "meat" ||
        mixingUsed ||
        Number(progress.mixing?.progress) > 0 ||
        progress.wrapping?.step !== "dough" ||
        Number(progress.pleating?.count) > 0 ||
        progress.steaming?.opened ||
        progress.steaming?.phase !== "closed",
    );
  }

  function readSavedProgress() {
    try {
      const saved = JSON.parse(
        window.sessionStorage.getItem(PROGRESS_SESSION_KEY) || "null",
      );
      return hasMeaningfulProgress(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  function saveProgress() {
    if (module.hidden || progressSaveSuspended) return;
    try {
      window.sessionStorage.setItem(
        PROGRESS_SESSION_KEY,
        JSON.stringify(snapshotProgress()),
      );
    } catch {
      // 本次页面内的制作状态仍然可用。
    }
  }

  function clearSavedProgress() {
    try {
      window.sessionStorage.removeItem(PROGRESS_SESSION_KEY);
    } catch {
      // 浏览器禁用存储时不需要额外清理。
    }
  }

  function describeProgress(progress) {
    if (!progress) return "上次的制作进度已经保存。";
    if (
      progress.phase === PHASE.COMPLETED ||
      progress.completed?.steaming
    ) {
      return "上次已经制作完成。可以继续查看成品，也可以从调馅重新开始。";
    }
    if (progress.phase === PHASE.PLEATING) {
      return `上次停在十八褶，已经捏出 ${Math.max(
        0,
        Math.min(PLEAT_COUNT_MAX, Number(progress.pleating?.count) || 0),
      )} 道褶。`;
    }
    if (progress.phase === PHASE.WRAPPING) {
      return progress.completed?.wrapping
        ? "上次已经完成包制，下一步是十八褶。"
        : "上次停在包制，面皮与肉馅的步骤已经保存。";
    }
    if (progress.phase === PHASE.STEAMING) {
      return "上次停在揭笼，可以接着完成这一笼包子。";
    }
    return `上次停在调馅，搅拌进度 ${Math.max(
      0,
      Math.min(100, Number(progress.mixing?.progress) || 0),
    )}%。`;
  }

  function hideResumePrompt() {
    resumePrompt.hidden = true;
    pendingResume = null;
  }

  function showResumePrompt(progress) {
    pendingResume = progress;
    resumeDescription.textContent = describeProgress(progress);
    resumePrompt.hidden = false;
    window.requestAnimationFrame(() => {
      resumeButton.focus({ preventScroll: true });
    });
  }

  function announce(message) {
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function wait(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function currentStage() {
    if (state.phase === PHASE.COMPLETED) {
      return stageById.get(PHASE.STEAMING);
    }
    return stageById.get(state.phase) || STAGES[0];
  }

  function nextStage(stageId) {
    const stage = stageById.get(stageId);
    return stage ? STAGES[stage.order] || null : null;
  }

  function resolveAsset(filename) {
    return `${ASSET_ROOT}${filename}`;
  }

  function preloadMixingAssets() {
    return Promise.all(
      [...MIXING_STATE_FILES, ...MIXING_BACKGROUND_FILES].map(
        (filename) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ filename, loaded: true });
            image.onerror = () => resolve({ filename, loaded: false });
            image.src = resolveAsset(filename);
          }),
      ),
    );
  }

  function preloadWrappingAssets() {
    return Promise.all(
      WRAPPING_STATE_FILES.map(
        (filename) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ filename, loaded: true });
            image.onerror = () => resolve({ filename, loaded: false });
            image.src = resolveAsset(filename);
          }),
      ),
    );
  }

  function preloadPleatingAssets() {
    return Promise.all(
      PLEATING_STATE_FILES.map(
        (filename) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ filename, loaded: true });
            image.onerror = () => resolve({ filename, loaded: false });
            image.src = resolveAsset(filename);
          }),
      ),
    );
  }

  function preloadSteamingAssets() {
    return Promise.all(
      STEAMING_STATE_FILES.map(
        (filename) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ filename, loaded: true });
            image.onerror = () => resolve({ filename, loaded: false });
            image.src = resolveAsset(filename);
          }),
      ),
    );
  }

  function currentMixingStep() {
    return MIXING_STEP_BY_ID.get(mixing.step) || MIXING_STEPS[0];
  }

  function currentWrappingStep() {
    return WRAPPING_STEP_BY_ID.get(wrapping.step) || WRAPPING_STEPS[0];
  }

  function mixingIsActive() {
    return state.phase === PHASE.MIXING && !completed.mixing;
  }

  function mixingCanInteract() {
    return (
      mixingIsActive() &&
      !mixing.busy &&
      !mixing.skipped &&
      !mixing.assetError
    );
  }

  function isStirringStep() {
    return currentMixingStep().id === "stirring";
  }

  function paintMixingProgress() {
    const value = Math.max(0, Math.min(100, Math.round(mixing.progress)));
    stirProgressLabel.textContent = `搅拌 ${value}%`;
    stirProgressFill.style.width = `${value}%`;
    stirProgressWrap.setAttribute("aria-valuenow", String(value));
  }

  function setMixingAssetError(message) {
    mixing.assetError = true;
    mixing.busy = false;
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    mixing.feedback = message;
    cancelAutoStir();
    renderStage();
    announce(message);
  }

  function renderMixing() {
    const isVisible = state.phase === PHASE.MIXING;
    mixingLayer.hidden = !isVisible;
    if (!isVisible) {
      mixingStateImage.hidden = true;
      replacementBowlEmpty.hidden = true;
      replacementBowlShell.hidden = true;
      return;
    }

    const step = currentMixingStep();
    const isComplete = completed.mixing || step.id === "complete";
    const canInteract = mixingCanInteract();
    const isStirring = step.id === "stirring";
    replacementBowlEmpty.hidden = Boolean(step.stateFile);
    replacementBowlShell.hidden = !step.stateFile;

    hint.textContent = step.hint;
    mixingStepCounter.textContent = step.counter;
    mixingStepTitle.textContent = step.title;
    mixingStepCopy.textContent = step.copy;
    mixingFeedback.textContent = mixing.feedback || "";
    mixingFeedback.classList.toggle(
      "is-error",
      mixing.assetError ||
        Boolean((mixing.feedback || "").includes("未找到")),
    );

    stirProgressWrap.hidden = !isStirring && !isComplete;
    paintMixingProgress();
    autoStirButton.hidden = !isStirring;
    autoStirButton.disabled =
      !canInteract || mixing.progress >= 100 || mixing.autoFrame !== null;
    skipMixingButton.hidden = isComplete;
    mixingNextButton.hidden = !isComplete;

    mixingIngredientButtons.forEach((button) => {
      const ingredient = button.dataset.gbcMixingIngredient;
      const isCurrent = canInteract && step.id === ingredient;
      button.hidden = mixing.used[ingredient] || isComplete;
      button.disabled = !isCurrent;
      button.classList.toggle("is-draggable", isCurrent);
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-disabled", String(!isCurrent));
    });

    const chopsticksAreNext = canInteract && step.id === "chopsticks";
    chopsticksButton.hidden = step.stateView === "scene";
    chopsticksButton.classList.toggle("is-current", chopsticksAreNext);
    chopsticksButton.classList.toggle(
      "is-in-bowl",
      step.id === "stirring" || isComplete,
    );
    chopsticksButton.disabled = !chopsticksAreNext;

    stirZone.classList.toggle("is-active", isStirring && !isComplete);
    stirZone.classList.toggle("is-stirring", mixing.pointerActive);
    stirHandle.hidden = !isStirring || isComplete;
    stirHandle.classList.toggle("is-active", canInteract);
    stirHandle.classList.toggle("is-stirring", mixing.pointerActive);
    stirZone.classList.toggle(
      "is-drop-target",
      Boolean(mixing.drag?.overBowl && !mixing.drag?.triggered),
    );
    dropHint.hidden = !mixing.drag?.overBowl || mixing.drag?.triggered;
    stirZone.tabIndex = isStirring && !isComplete ? 0 : -1;
    stirZone.setAttribute(
      "aria-disabled",
      String(!isStirring || isComplete),
    );

    const stateFile =
      step.id === "stirring" && mixing.progress >= 35
        ? "mixing-state-05.webp"
        : step.stateFile;
    if (stateFile) {
      const source = resolveAsset(stateFile);
      if (mixingStateImage.getAttribute("src") !== source) {
        mixingStateImage.src = source;
      }
      mixingStateImage.alt =
        step.id === "stirring" && mixing.progress >= 35
          ? "筷子搅动后，猪肉、葱花和汤汁开始合匀的青花大碗"
          : step.imageAlt || `调馅进度：${step.title}`;
      mixingStateImage.classList.toggle(
        "is-scene-view",
        step.stateView === "scene",
      );
      mixingStateImage.hidden = false;
      window.requestAnimationFrame(() => {
        if (state.phase === PHASE.MIXING) {
          mixingStateImage.classList.add("is-visible");
        }
      });
    } else {
      mixingStateImage.classList.remove("is-visible", "is-scene-view");
      mixingStateImage.hidden = true;
      mixingStateImage.removeAttribute("src");
      mixingStateImage.alt = "";
    }
  }

  function wrappingIsActive() {
    return state.phase === PHASE.WRAPPING && !completed.wrapping;
  }

  function wrappingCanInteract() {
    return wrappingIsActive() && !wrapping.busy;
  }

  function setWrappingFrameImmediate(filename, alt) {
    const [primary, secondary] = wrappingStateImages;
    if (!primary || !secondary) return;

    primary.hidden = false;
    primary.src = resolveAsset(filename);
    primary.alt = alt;
    primary.classList.add("is-visible");
    secondary.classList.remove("is-visible");
    secondary.hidden = true;
    secondary.removeAttribute("src");
    secondary.alt = "";
    wrapping.imageFile = filename;
  }

  async function crossfadeWrappingFrame(filename, alt, version) {
    await preloadedWrappingAssets;
    const activeFrame =
      wrappingStateImages.find((image) =>
        image.classList.contains("is-visible"),
      ) || wrappingStateImages[0];
    const nextFrame =
      wrappingStateImages.find((image) => image !== activeFrame) ||
      wrappingStateImages[0];
    if (!activeFrame || !nextFrame) return false;

    nextFrame.hidden = false;
    nextFrame.classList.remove("is-visible");
    nextFrame.src = resolveAsset(filename);
    nextFrame.alt = alt;
    try {
      await nextFrame.decode();
    } catch {
      // 解码失败时仍显示新图，避免一次动画错误挡住后续操作。
    }

    if (
      version !== wrapping.transitionVersion ||
      state.phase !== PHASE.WRAPPING
    ) {
      return false;
    }

    // 先让浏览器提交初始透明状态，再切换为交叉淡入。
    void nextFrame.getBoundingClientRect();
    nextFrame.classList.add("is-visible");
    activeFrame.classList.remove("is-visible");
    await wait(reducedMotion.matches ? 0 : 560);

    if (
      version !== wrapping.transitionVersion ||
      state.phase !== PHASE.WRAPPING
    ) {
      return false;
    }

    activeFrame.hidden = true;
    activeFrame.removeAttribute("src");
    activeFrame.alt = "";
    wrapping.imageFile = filename;
    return true;
  }

  function renderWrapping() {
    const isVisible = state.phase === PHASE.WRAPPING;
    wrappingLayer.hidden = !isVisible;
    if (!isVisible) return;

    const step = currentWrappingStep();
    const isComplete = completed.wrapping || step.id === "complete";
    const canInteract = wrappingCanInteract();
    const visibleFrame = wrappingStateImages.find((image) =>
      image.classList.contains("is-visible"),
    );
    if (
      wrapping.imageFile !== step.imageFile ||
      !visibleFrame?.getAttribute("src")
    ) {
      setWrappingFrameImmediate(step.imageFile, step.imageAlt);
    }

    wrappingLayer.dataset.step = step.id;
    wrappingLayer.setAttribute("aria-busy", String(wrapping.busy));
    hint.textContent = step.hint;
    wrapStepCounter.textContent = step.counter;
    wrapStepTitle.textContent = step.title;
    wrapStepCopy.textContent = step.copy;
    wrapFeedback.textContent = wrapping.feedback || "";

    const doughIsCurrent = canInteract && step.id === "dough";
    const fillingIsCurrent = canInteract && step.id === "filling";
    const promptIsCurrent = canInteract && step.id === "ready";
    wrapDoughButton.hidden = !doughIsCurrent;
    wrapDoughButton.disabled = !doughIsCurrent;
    wrapDoughButton.classList.toggle("is-current", doughIsCurrent);
    wrapDoughButton.classList.toggle("is-draggable", doughIsCurrent);
    wrapHandDrop.hidden = !doughIsCurrent || !wrapping.drag;
    wrapHandDrop.classList.toggle(
      "is-target",
      doughIsCurrent && Boolean(wrapping.drag?.overHand),
    );
    wrapFillingButton.hidden = !fillingIsCurrent;
    wrapFillingButton.disabled = !fillingIsCurrent;
    wrapFillingButton.classList.toggle("is-current", fillingIsCurrent);
    wrapPromptButton.hidden = !promptIsCurrent;
    wrapPromptButton.disabled = !promptIsCurrent;
    wrapPromptButton.classList.toggle("is-current", promptIsCurrent);
    wrapReplayButton.disabled = wrapping.busy;
    wrapNextButton.hidden = !isComplete || wrapping.busy;
  }

  function wrapHandDropContainsPoint(clientX, clientY) {
    const point = canvasPointFromClient(clientX, clientY);
    const normalizedX = (point.nx - 0.405) / 0.13;
    const normalizedY = (point.ny - 0.625) / 0.16;
    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }

  function setWrapDoughDragTransform(button, x, y, scale = 1) {
    button.style.setProperty("--gbc-wrap-drag-x", `${x}px`);
    button.style.setProperty("--gbc-wrap-drag-y", `${y}px`);
    button.style.setProperty("--gbc-wrap-drag-scale", String(scale));
  }

  function clearWrapDoughDragTransform(button) {
    button.style.removeProperty("--gbc-wrap-drag-x");
    button.style.removeProperty("--gbc-wrap-drag-y");
    button.style.removeProperty("--gbc-wrap-drag-scale");
  }

  function beginWrapDoughDrag(event) {
    const step = currentWrappingStep();
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }
    if (
      !wrappingCanInteract() ||
      step.id !== "dough" ||
      wrapping.drag
    ) {
      return;
    }

    wrapping.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      overHand: false,
    };
    wrapping.feedback = "按住面皮，拖向左手手心。";
    wrapDoughButton.classList.remove(
      "is-returning",
      "is-dropped",
    );
    wrapDoughButton.classList.add("is-dragging");
    wrapHandDrop.hidden = false;
    wrapHandDrop.classList.remove("is-target");
    wrapDoughButton.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveWrapDoughDrag(event) {
    const drag = wrapping.drag;
    if (
      !drag ||
      drag.pointerId !== event.pointerId ||
      state.phase !== PHASE.WRAPPING
    ) {
      return;
    }

    drag.dx = event.clientX - drag.startX;
    drag.dy = event.clientY - drag.startY;
    drag.overHand = wrapHandDropContainsPoint(
      event.clientX,
      event.clientY,
    );
    setWrapDoughDragTransform(
      wrapDoughButton,
      drag.dx,
      drag.dy,
      drag.overHand ? 1.045 : 1.025,
    );
    wrapHandDrop.classList.toggle("is-target", drag.overHand);
    wrapping.feedback = drag.overHand
      ? "左手已经接住，松手托稳面皮。"
      : "把面皮拖到左手手心处再松手。";
    wrapFeedback.textContent = wrapping.feedback;
    event.preventDefault();
  }

  function returnWrapDoughToSource() {
    wrapHandDrop.hidden = true;
    wrapHandDrop.classList.remove("is-target");
    wrapDoughButton.classList.remove("is-dragging", "is-dropped");
    wrapDoughButton.classList.add("is-returning");
    setWrapDoughDragTransform(wrapDoughButton, 0, 0, 1);
    window.setTimeout(() => {
      wrapDoughButton.classList.remove("is-returning");
      clearWrapDoughDragTransform(wrapDoughButton);
    }, reducedMotion.matches ? 0 : 340);
  }

  function finishWrapDoughDrag(event, cancelled = false) {
    const drag = wrapping.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    wrapping.drag = null;
    if (wrapDoughButton.hasPointerCapture?.(event.pointerId)) {
      wrapDoughButton.releasePointerCapture(event.pointerId);
    }

    const accepted =
      !cancelled &&
      wrapHandDropContainsPoint(event.clientX, event.clientY);
    if (!accepted) {
      wrapping.feedback = "面皮没有落在手心，已经回到面皮堆。";
      wrapFeedback.textContent = wrapping.feedback;
      returnWrapDoughToSource();
      return;
    }

    wrapHandDrop.classList.add("is-target");
    wrapDoughButton.classList.remove("is-dragging");
    wrapDoughButton.classList.add("is-dropped");
    wrapping.feedback = "左手已经托稳面皮。";
    wrapFeedback.textContent = wrapping.feedback;
    void handleWrappingStep("dough");
  }

  async function handleWrappingStep(kind) {
    const step = currentWrappingStep();
    if (
      !wrappingCanInteract() ||
      step.id === "complete" ||
      step.id !== kind
    ) {
      return;
    }

    const currentIndex = WRAPPING_STEPS.findIndex(
      (item) => item.id === step.id,
    );
    const nextStep = WRAPPING_STEPS[currentIndex + 1];
    if (!nextStep) return;

    const version = ++wrapping.transitionVersion;
    wrapping.busy = true;
    renderWrapping();
    const transitioned = await crossfadeWrappingFrame(
      nextStep.imageFile,
      nextStep.imageAlt,
      version,
    );
    if (!transitioned) {
      if (version === wrapping.transitionVersion) {
        wrapping.busy = false;
        renderStage();
      }
      return;
    }

    wrapping.step = nextStep.id;
    wrapping.feedback = nextStep.message;
    wrapping.busy = false;
    if (nextStep.id === "complete") {
      completed.wrapping = true;
    }
    renderStage();
    announce(nextStep.message);
  }

  function resetWrapping() {
    wrapping.transitionVersion += 1;
    wrapping.step = "dough";
    wrapping.busy = false;
    wrapping.drag = null;
    wrapping.feedback = "已回到开头，可以重新体验取皮、放馅和准备捏褶。";
    completed.wrapping = false;
    wrapHandDrop.hidden = true;
    wrapHandDrop.classList.remove("is-target");
    wrapDoughButton.classList.remove(
      "is-dragging",
      "is-dropped",
      "is-returning",
    );
    clearWrapDoughDragTransform(wrapDoughButton);
    setWrappingFrameImmediate(
      WRAPPING_STATE_FILES[0],
      WRAPPING_STEPS[0].imageAlt,
    );
    renderStage();
    announce("包制互动已重新开始");
  }

  function pleatingFrameIndex(count = pleating.count) {
    return Math.max(
      0,
      Math.min(
        PLEATING_STATE_FILES.length - 1,
        Math.floor(count / 3),
      ),
    );
  }

  function pleatingIsActive() {
    return state.phase === PHASE.PLEATING && !completed.pleating;
  }

  function pleatingCanInteract() {
    return (
      pleatingIsActive() &&
      !pleating.busy &&
      !pleating.assetError &&
      pleating.count < PLEAT_COUNT_MAX
    );
  }

  function pleatingCopy() {
    const count = pleating.count;
    if (count >= PLEAT_COUNT_MAX) {
      return {
        counter: "第三道 · 十八褶完成",
        title: "十八道褶，捏出一朵花",
        copy: "褶子一圈收齐，包子口也收得端正。现在可以把它放入蒸笼。",
      };
    }
    if (count === 0) {
      return {
        counter: "第三道 · 0 / 18 褶",
        title: "沿边捏第一褶",
        copy: "包子就在左手掌心。点包子外沿，指腹一推一收，从第一褶开始。",
      };
    }
    if (count % 3 === 0) {
      return {
        counter: `第三道 · ${count} / 18 褶`,
        title: `第 ${count} 道褶已成形`,
        copy: "主形已经跨入下一组褶形。继续沿外侧均匀捏合，别让间距忽宽忽窄。",
      };
    }
    return {
      counter: `第三道 · ${count} / 18 褶`,
      title: "继续沿边收褶",
      copy: `已起 ${count} 褶。下一指仍落在包子外沿，轻轻向中心收拢。`,
    };
  }

  function setPleatingFrameImmediate(filename, alt) {
    const [primary, secondary] = pleatingStateImages;
    if (!primary || !secondary) return;

    primary.hidden = false;
    primary.src = resolveAsset(filename);
    primary.alt = alt;
    primary.classList.add("is-visible");
    secondary.classList.remove("is-visible");
    secondary.hidden = true;
    secondary.removeAttribute("src");
    secondary.alt = "";
    pleating.imageFile = filename;
    pleating.assetError = false;
    pleatingFallback.hidden = true;
  }

  function setPleatingAssetError(hasError) {
    pleating.assetError = hasError;
    pleatingFallback.hidden = !hasError;
    if (hasError) {
      pleating.busy = false;
      pleatHotspot.disabled = true;
      pleatHotspot.classList.remove("is-current");
      announce("褶形素材未找到，请检查素材文件");
    }
  }

  async function crossfadePleatingFrame(filename, alt, version) {
    await preloadedPleatingAssets;
    const activeFrame =
      pleatingStateImages.find((image) =>
        image.classList.contains("is-visible"),
      ) || pleatingStateImages[0];
    const nextFrame =
      pleatingStateImages.find((image) => image !== activeFrame) ||
      pleatingStateImages[0];
    if (!activeFrame || !nextFrame) return false;

    nextFrame.hidden = false;
    nextFrame.classList.remove("is-visible");
    nextFrame.src = resolveAsset(filename);
    nextFrame.alt = alt;
    try {
      await nextFrame.decode();
    } catch {
      if (version === pleating.transitionVersion) {
        setPleatingAssetError(true);
      }
      return false;
    }

    if (
      version !== pleating.transitionVersion ||
      state.phase !== PHASE.PLEATING
    ) {
      return false;
    }

    void nextFrame.getBoundingClientRect();
    nextFrame.classList.add("is-visible");
    activeFrame.classList.remove("is-visible");
    await wait(reducedMotion.matches ? 0 : 210);

    if (
      version !== pleating.transitionVersion ||
      state.phase !== PHASE.PLEATING
    ) {
      return false;
    }

    activeFrame.hidden = true;
    activeFrame.removeAttribute("src");
    activeFrame.alt = "";
    pleating.imageFile = filename;
    pleating.assetError = false;
    pleatingFallback.hidden = true;
    return true;
  }

  function paintPleatingProgress() {
    const count = Math.max(0, Math.min(PLEAT_COUNT_MAX, pleating.count));
    const percent = Math.round((count / PLEAT_COUNT_MAX) * 100);
    pleatProgressCount.textContent = `${count} / ${PLEAT_COUNT_MAX}`;
    pleatProgressFill.style.width = `${percent}%`;
    pleatProgressWrap.setAttribute("aria-valuenow", String(count));
    pleatHotspot.setAttribute(
      "aria-label",
      count >= PLEAT_COUNT_MAX
        ? "十八道褶已经完成"
        : `沿包子外沿捏下一褶，当前已捏 ${count} 褶，共 18 褶`,
    );
  }

  function playPleatSound(count) {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      pleatAudioContext ||= new AudioContextClass();
      if (pleatAudioContext.state === "suspended") {
        void pleatAudioContext.resume();
      }
      const oscillator = pleatAudioContext.createOscillator();
      const gain = pleatAudioContext.createGain();
      const now = pleatAudioContext.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(
        count === PLEAT_COUNT_MAX ? 238 : 176,
        now,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        count === PLEAT_COUNT_MAX ? 164 : 126,
        now + 0.065,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      oscillator.connect(gain);
      gain.connect(pleatAudioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.075);
    } catch {
      // 声音只是辅助反馈，设备不允许音频时不影响捏褶。
    }
  }

  function renderPleating() {
    const isVisible = state.phase === PHASE.PLEATING;
    pleatingLayer.hidden = !isVisible;
    if (!isVisible) {
      pleatReveal.hidden = true;
      pleatReveal.classList.remove("is-visible");
      return;
    }

    const count = Math.max(0, Math.min(PLEAT_COUNT_MAX, pleating.count));
    const isComplete =
      completed.pleating ||
      (count >= PLEAT_COUNT_MAX && !pleating.assetError);
    const showReveal =
      isComplete && pleating.revealPending && !pleating.assetError;
    const canInteract = pleatingCanInteract();
    const sentence = pleating.assetError
      ? {
          counter: "第三道 · 素材缺失",
          title: "褶形素材未找到",
          copy: "请检查 pleat-*.webp 素材文件后刷新页面，互动会保持暂停。",
        }
      : pleatingCopy();
    const frameFile = PLEATING_STATE_FILES[pleatingFrameIndex(count)];
    const visibleFrame = pleatingStateImages.find((image) =>
      image.classList.contains("is-visible"),
    );
    if (
      !pleating.busy &&
      (pleating.imageFile !== frameFile ||
        !visibleFrame?.getAttribute("src"))
    ) {
      setPleatingFrameImmediate(
        frameFile,
        count >= PLEAT_COUNT_MAX
          ? "第一人称视角下，左手托着已经收好十八道褶的包子"
          : `第一人称视角下，双手正在沿包子边缘捏出第 ${count} 道褶`,
      );
    }

    pleatingLayer.dataset.count = String(count);
    pleatingLayer.classList.toggle("is-complete", isComplete);
    pleatingLayer.classList.toggle("has-reveal", showReveal);
    pleatingLayer.setAttribute("aria-busy", String(pleating.busy));
    pleatReveal.hidden = !showReveal;
    pleatReveal.classList.toggle("is-visible", showReveal);
    pleatRevealContinue.disabled = pleating.busy;
    if (
      showReveal &&
      pleatRevealImage.getAttribute("src") !==
        resolveAsset(PLEAT_REVEAL_FILE)
    ) {
      pleatRevealImage.src = resolveAsset(PLEAT_REVEAL_FILE);
    }
    pleatingFallback.hidden = !pleating.assetError;
    paintPleatingProgress();
    pleatStepCounter.textContent = sentence.counter;
    pleatStepTitle.textContent = sentence.title;
    pleatStepCopy.textContent = sentence.copy;
    pleatFeedback.textContent = pleating.feedback || "";
    pleatHotspot.hidden = isComplete;
    pleatHotspot.disabled = !canInteract;
    pleatHotspot.classList.toggle("is-current", canInteract);
    pleatReplayButton.disabled = pleating.busy;
    pleatNextButton.hidden = !isComplete || pleating.busy || showReveal;
    hint.textContent = pleating.assetError
      ? "褶形素材未找到，互动已暂停。"
      : showReveal
        ? "十八道褶已经收齐。看一眼掌心里的包子，再放进蒸笼。"
      : isComplete
        ? "十八道褶已经收齐，可以放入蒸笼了。"
        : "沿包子外沿轻捏十八次，每三次跨入下一组褶形。";
  }

  async function handlePleatClick() {
    if (!pleatingCanInteract()) return;
    const version = ++pleating.transitionVersion;
    const previousFrame = pleatingFrameIndex();
    pleating.count = Math.min(PLEAT_COUNT_MAX, pleating.count + 1);
    const nextFrame = pleatingFrameIndex();
    pleating.busy = true;
    pleating.feedback = "";
    pleatFeedback.textContent = "";
    paintPleatingProgress();
    pleatHotspot.disabled = true;
    pleatingLayer.classList.remove("is-pinching");
    void pleatingLayer.offsetWidth;
    pleatingLayer.classList.add("is-pinching");
    playPleatSound(pleating.count);

    const startedAt = performance.now();
    if (previousFrame !== nextFrame) {
      const transitioned = await crossfadePleatingFrame(
        PLEATING_STATE_FILES[nextFrame],
        `第一人称视角下，双手正在沿包子边缘捏出第 ${pleating.count} 道褶`,
        version,
      );
      if (!transitioned) {
        if (version === pleating.transitionVersion) {
          pleating.busy = false;
          renderStage();
        }
        return;
      }
    }

    const minimumLock = reducedMotion.matches ? 0 : 280;
    const remaining = Math.max(0, minimumLock - (performance.now() - startedAt));
    if (remaining > 0) await wait(remaining);
    if (
      version !== pleating.transitionVersion ||
      state.phase !== PHASE.PLEATING
    ) {
      pleating.busy = false;
      pleatingLayer.classList.remove("is-pinching");
      return;
    }

    pleating.busy = false;
    pleatingLayer.classList.remove("is-pinching");
    if (pleating.count >= PLEAT_COUNT_MAX) {
      completed.pleating = true;
      pleating.revealPending = true;
      pleating.feedback = "十八道褶，捏出一朵花。";
      announce("十八道褶完成，包子已经稳稳托在掌心");
    } else if (pleating.count % 3 === 0) {
      pleating.feedback = `已收 ${pleating.count} 褶，下一步进入新的褶形。`;
      announce(`已捏出 ${pleating.count} 道褶`);
    } else {
      pleating.feedback = `第 ${pleating.count} 褶已起。`;
      announce(`已捏出 ${pleating.count} 道褶`);
    }
    renderStage();
  }

  function pleatFeedbackForEdgeClick(event) {
    if (event.detail === 0 || !Number.isFinite(event.clientX)) {
      return true;
    }
    const rect = pleatHotspot.getBoundingClientRect();
    const normalizedX =
      (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const normalizedY =
      (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const radius = Math.hypot(normalizedX, normalizedY);
    if (radius >= 0.56) return true;
    pleatFeedback.textContent = "沿包子外沿轻捏，不要按在收口中央。";
    return false;
  }

  function resetPleating() {
    pleating.transitionVersion += 1;
    pleating.count = 0;
    pleating.busy = false;
    pleating.feedback = "已回到第一褶，可以重新体验。";
    pleating.assetError = false;
    pleating.revealPending = false;
    pleatingFallback.hidden = true;
    completed.pleating = false;
    pleatingLayer.classList.remove("is-pinching", "is-complete");
    setPleatingFrameImmediate(
      PLEATING_STATE_FILES[0],
      "第一人称视角下，左手托着包子皮与肉馅，准备捏出第一道褶",
    );
    renderStage();
    announce("十八褶互动已重新开始");
  }

  function continueFromPleatReveal() {
    if (
      state.phase !== PHASE.PLEATING ||
      !completed.pleating ||
      !pleating.revealPending ||
      pleating.busy
    ) {
      return;
    }
    pleating.revealPending = false;
    void showStage(PHASE.STEAMING);
  }

  function steamingIsVisible() {
    return (
      state.phase === PHASE.STEAMING ||
      state.phase === PHASE.COMPLETED
    );
  }

  function steamingCanInteract() {
    return (
      state.phase === PHASE.STEAMING &&
      !completed.steaming &&
      !steaming.busy &&
      !steaming.opened
    );
  }

  function setSteamingImages() {
    const closedSource = resolveAsset(STEAMING_STATE_FILES[0]);
    const openSource = resolveAsset(STEAMING_STATE_FILES[1]);
    if (steamClosedImage.getAttribute("src") !== closedSource) {
      steamClosedImage.src = closedSource;
    }
    if (steamOpenImage.getAttribute("src") !== openSource) {
      steamOpenImage.src = openSource;
    }
  }

  function clearSteamingAnimationClasses() {
    steamingLayer.classList.remove(
      "is-lifting",
      "is-half-open",
      "is-opening",
      "is-open",
      "is-steam-rising",
      "is-steam-fading",
      "is-complete",
    );
  }

  function resetSteaming() {
    steaming.transitionVersion += 1;
    steaming.opened = false;
    steaming.busy = false;
    steaming.phase = "closed";
    steaming.feedback = "";
    clearSteamingAnimationClasses();
    setSteamingImages();
    if (steamingIsVisible()) renderStage();
  }

  function steamingCopyForPhase() {
    const copy = {
      closed: {
        counter: "第四道 · 等待揭笼",
        title: "包子蒸好了",
        body: "包子蒸好了，揭开笼盖看看吧。",
        feedback: "",
      },
      lifting: {
        counter: "笼盖将启",
        title: "轻轻抬起笼盖",
        body: "先让笼沿松一松，等白汽找到出口。",
        feedback: "笼盖已经轻轻抬起。",
      },
      half: {
        counter: "白汽渐起",
        title: "笼盖半开",
        body: "热气会从笼口慢慢升起，不用急着把盖子全掀开。",
        feedback: "蒸汽正从蒸笼里缓缓升起。",
      },
      opening: {
        counter: "十八褶显现",
        title: "热包子就要出来了",
        body: "笼盖继续打开，一排十八褶包子已经露了出来。",
        feedback: "完整的十八褶包子已经显现。",
      },
      open: {
        counter: "第四道 · 已完成",
        title: "十八褶，一口鲜",
        body: "皮薄，馅足，刚出笼的热气把鲜味一并送到了眼前。",
        feedback: "白汽渐散，一笼热包子完整出笼。",
      },
      complete: {
        counter: "第四道 · 已完成",
        title: "十八褶，一口鲜",
        body: "皮薄，馅足，刚出笼的热气把鲜味一并送到了眼前。",
        feedback: "白汽渐散，一笼热包子完整出笼。",
      },
    };
    return copy[steaming.phase] || copy.closed;
  }

  function renderSteaming() {
    const isVisible = steamingIsVisible();
    steamingLayer.hidden = !isVisible;
    if (!isVisible) return;

    setSteamingImages();
    const isComplete = completed.steaming || state.phase === PHASE.COMPLETED;
    if (isComplete && !steaming.busy) {
      steaming.opened = true;
      steaming.phase = "complete";
      clearSteamingAnimationClasses();
      steamingLayer.classList.add(
        "is-open",
        "is-steam-fading",
        "is-complete",
      );
    }

    const content = steamingCopyForPhase();
    steamingLayer.dataset.phase = steaming.phase;
    steamingLayer.setAttribute("aria-busy", String(steaming.busy));
    steamCounter.textContent = content.counter;
    steamTitle.textContent = content.title;
    steamCopy.textContent = content.body;
    steamFeedback.textContent = content.feedback;
    steamLidButton.hidden =
      steaming.opened || steaming.busy || isComplete;
    steamLidButton.disabled = !steamingCanInteract();
    steamActions.hidden = !isComplete || steaming.busy;
    steamStoryButton.disabled = !isComplete || steaming.busy;
    steamReplayButton.disabled = !isComplete || steaming.busy;
    hint.textContent = isComplete
      ? "白汽散开，刚蒸好的十八褶包子完整出了笼。"
      : "包子蒸好了，揭开笼盖看看吧。";
  }

  async function handleSteamOpen() {
    if (!steamingCanInteract()) return;
    const version = ++steaming.transitionVersion;
    const shouldAnimate = !reducedMotion.matches;
    steaming.opened = true;
    steaming.busy = true;
    steaming.phase = "lifting";
    steaming.feedback = "笼盖已经轻轻抬起。";
    renderSteaming();
    await preloadedSteamingAssets;
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steamingLayer.classList.add("is-lifting", "is-steam-rising");
    announce("笼盖已经轻轻抬起，蒸汽正从蒸笼里升起");
    await wait(shouldAnimate ? 180 : 0);
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steamingLayer.classList.remove("is-lifting");
    steamingLayer.classList.add("is-half-open");
    steaming.phase = "half";
    renderSteaming();
    await wait(shouldAnimate ? 620 : 0);
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steamingLayer.classList.add("is-opening");
    steaming.phase = "opening";
    renderSteaming();
    announce("十八褶包子已经显现");
    await wait(shouldAnimate ? 620 : 0);
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steamingLayer.classList.remove("is-half-open", "is-opening");
    steamingLayer.classList.add("is-open");
    steaming.phase = "open";
    renderSteaming();
    await wait(shouldAnimate ? 650 : 0);
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steamingLayer.classList.add("is-steam-fading");
    steaming.phase = "complete";
    steaming.feedback = "白汽渐散，一笼热包子完整出笼。";
    renderSteaming();
    await wait(shouldAnimate ? 430 : 80);
    if (
      version !== steaming.transitionVersion ||
      state.phase !== PHASE.STEAMING
    ) {
      return;
    }

    steaming.busy = false;
    completed.steaming = true;
    state.phase = PHASE.COMPLETED;
    renderStage();
    unlockNextStorySegment();
    announce("揭笼完成。十八褶，一口鲜。");
  }

  function continueFromSteam() {
    if (!completed.steaming) return;
    unlockNextStorySegment();
    if (typeof window.dogBuLiStory?.showPage === "function") {
      window.dogBuLiStory.showPage("market");
    } else {
      document.querySelector('[data-dog-next="market"]')?.click();
    }
  }

  function stopAutoStir() {
    if (mixing.autoFrame !== null) {
      window.cancelAnimationFrame(mixing.autoFrame);
      mixing.autoFrame = null;
    }
    autoStirButton.disabled = !isStirringStep() || completed.mixing;
  }

  function completeMixing() {
    if (completed.mixing) return;
    stopAutoStir();
    mixing.progress = 100;
    mixing.step = "complete";
    mixing.busy = false;
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    mixing.feedback = "肉馅已经调好，包制工序已解锁。";
    completed.mixing = true;
    renderStage();
    announce("肉馅调好了，已经解锁包制");
  }

  function setMixingProgress(value) {
    const previousProgress = mixing.progress;
    mixing.progress = Math.max(0, Math.min(100, value));
    paintMixingProgress();
    if (previousProgress < 35 && mixing.progress >= 35) {
      renderMixing();
    }
    if (mixing.progress >= 100 && isStirringStep()) {
      completeMixing();
    }
  }

  function cancelAutoStir() {
    if (mixing.autoFrame !== null) {
      window.cancelAnimationFrame(mixing.autoFrame);
      mixing.autoFrame = null;
    }
  }

  function startAutoStir() {
    if (!mixingCanInteract() || !isStirringStep()) return;
    cancelAutoStir();
    mixing.pointerActive = false;
    const startingProgress = mixing.progress;
    const startingTime = performance.now();
    const duration = Math.max(700, (100 - startingProgress) * 18);
    autoStirButton.disabled = true;

    const tick = (time) => {
      if (!mixingIsActive() || !isStirringStep()) {
        mixing.autoFrame = null;
        return;
      }
      const ratio = Math.min(1, (time - startingTime) / duration);
      const eased = 1 - (1 - ratio) ** 2;
      mixing.progress =
        startingProgress + (100 - startingProgress) * eased;
      paintMixingProgress();
      if (ratio < 1) {
        mixing.autoFrame = window.requestAnimationFrame(tick);
      } else {
        mixing.autoFrame = null;
        setMixingProgress(100);
      }
    };

    mixing.autoFrame = window.requestAnimationFrame(tick);
  }

  function pointerAngle(event) {
    const rect = stirZone.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }

  function handleStirPointerDown(event) {
    if (!mixingCanInteract() || !isStirringStep()) return;
    cancelAutoStir();
    mixing.pointerActive = true;
    mixing.lastAngle = pointerAngle(event);
    stirHandle.setPointerCapture?.(event.pointerId);
    stirZone.classList.add("is-stirring");
    stirHandle.classList.add("is-stirring");
    event.preventDefault();
  }

  function handleStirPointerMove(event) {
    if (!mixing.pointerActive || !mixingIsActive()) return;
    const angle = pointerAngle(event);
    let delta = angle - mixing.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    mixing.lastAngle = angle;
    if (Math.abs(delta) > 72) return;
    setMixingProgress(mixing.progress + Math.abs(delta) / 4.2);
    event.preventDefault();
  }

  function handleStirPointerEnd(event) {
    if (!mixing.pointerActive) return;
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    stirZone.classList.remove("is-stirring");
    stirHandle.classList.remove("is-stirring");
    if (stirHandle.hasPointerCapture?.(event.pointerId)) {
      stirHandle.releasePointerCapture(event.pointerId);
    }
  }

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function canvasPointFromClient(clientX, clientY = clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX.clientX ?? clientX;
    const y = clientX.clientY ?? clientY;
    return {
      x: x - rect.left,
      y: y - rect.top,
      nx: (x - rect.left) / rect.width,
      ny: (y - rect.top) / rect.height,
      width: rect.width,
      height: rect.height,
    };
  }

  function bowlContainsPoint(clientX, clientY) {
    const point = canvasPointFromClient(clientX, clientY);
    const rect = stirZone.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const centerX =
      (rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width;
    const centerY =
      (rect.top + rect.height / 2 - canvasRect.top) / canvasRect.height;
    const radiusX = rect.width * 0.49 / canvasRect.width;
    const radiusY = rect.height * 0.49 / canvasRect.height;
    const normalizedX =
      (point.nx - centerX) / radiusX;
    const normalizedY =
      (point.ny - centerY) / radiusY;
    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }

  function setIngredientDragTransform(
    button,
    x,
    y,
    rotation = 0,
    scale = 1,
  ) {
    button.style.setProperty("--gbc-drag-x", `${x}px`);
    button.style.setProperty("--gbc-drag-y", `${y}px`);
    button.style.setProperty("--gbc-drag-rotate", `${rotation}deg`);
    button.style.setProperty("--gbc-drag-scale", String(scale));
  }

  function clearIngredientDragTransform(button) {
    button.style.removeProperty("--gbc-drag-x");
    button.style.removeProperty("--gbc-drag-y");
    button.style.removeProperty("--gbc-drag-rotate");
    button.style.removeProperty("--gbc-drag-scale");
  }

  function updateDropTarget(drag, overBowl) {
    if (!drag || mixing.drag !== drag) return;
    drag.overBowl = overBowl;
    stirZone.classList.toggle(
      "is-drop-target",
      overBowl && !drag.triggered,
    );
    dropHint.hidden = !overBowl || drag.triggered;
    if (!drag.triggered) {
      mixingFeedback.textContent = overBowl
        ? "已在碗口，松手放入。"
        : drag.ingredient === "soup"
          ? "按住汤碗，向青花碗方向拖动并倾斜。"
          : "拖到中央青花碗，碗口出现高亮后松手。";
    }
  }

  function releaseDragPointer(drag) {
    if (
      drag?.button?.hasPointerCapture?.(drag.pointerId)
    ) {
      drag.button.releasePointerCapture(drag.pointerId);
    }
  }

  function beginIngredientDrag(event, button) {
    const ingredient = button.dataset.gbcMixingIngredient;
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }
    if (
      !mixingCanInteract() ||
      currentMixingStep().id !== ingredient ||
      mixing.drag
    ) {
      return;
    }

    mixing.drag = {
      button,
      ingredient,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      overBowl: false,
      triggered: false,
      tiltProgress: 0,
    };
    const sourceRect = button.getBoundingClientRect();
    const bowlRect = stirZone.getBoundingClientRect();
    mixing.drag.bowlVectorX =
      bowlRect.left + bowlRect.width / 2 -
      (sourceRect.left + sourceRect.width / 2);
    mixing.drag.bowlVectorY =
      bowlRect.top + bowlRect.height / 2 -
      (sourceRect.top + sourceRect.height / 2);
    mixing.tilt = 0;
    mixing.feedback = "";
    button.classList.remove("is-returning", "is-dropped", "is-flying");
    button.classList.add("is-dragging");
    button.setPointerCapture?.(event.pointerId);
    mixingFeedback.textContent =
      ingredient === "soup"
        ? "按住汤碗，向青花碗方向拖动并倾斜。"
        : "拖到中央青花碗，碗口出现高亮后松手。";
    event.preventDefault();
  }

  function moveIngredientDrag(event) {
    const drag = mixing.drag;
    if (
      !drag ||
      drag.pointerId !== event.pointerId ||
      !mixingIsActive()
    ) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.dx = dx;
    drag.dy = dy;

    if (drag.ingredient === "soup") {
      const vectorX = drag.bowlVectorX;
      const vectorY = drag.bowlVectorY;
      const vectorLengthSquared = vectorX ** 2 + vectorY ** 2;
      const projection =
        vectorLengthSquared > 0
          ? (dx * vectorX + dy * vectorY) / vectorLengthSquared
          : 0;
      const vectorLength = Math.sqrt(vectorLengthSquared);
      const lateralDistance =
        vectorLength > 0
          ? Math.abs(dx * vectorY - dy * vectorX) /
            Math.max(1, Math.hypot(dx, dy) * vectorLength)
          : 0;
      const tiltRatio = clamp(projection) *
        (1 - clamp(lateralDistance * 1.15));
      const rotation = 38 * tiltRatio * (vectorX >= 0 ? 1 : -1);
      drag.tiltProgress = tiltRatio;
      mixing.tilt = Math.round(tiltRatio * 100);
      setIngredientDragTransform(
        drag.button,
        dx,
        dy,
        rotation,
        1 + tiltRatio * 0.035,
      );
      updateDropTarget(
        drag,
        tiltRatio >= 0.46 ||
          bowlContainsPoint(event.clientX, event.clientY),
      );
      if (tiltRatio >= 0.78 && !drag.triggered) {
        drag.triggered = true;
        mixing.tilt = 100;
        mixingFeedback.textContent = "汤碗已倾到碗口，汤汁正在落下。";
        stirZone.classList.add("is-drop-target");
        dropHint.hidden = true;
        drag.button.classList.remove("is-dragging");
        mixing.drag = null;
        mixing.tilt = 0;
        releaseDragPointer(drag);
        void handleIngredient(drag.button, { fromDrag: true });
      }
    } else {
      setIngredientDragTransform(
        drag.button,
        dx,
        dy,
        clamp(dx / 18, -4, 4),
        1.045,
      );
      updateDropTarget(
        drag,
        bowlContainsPoint(event.clientX, event.clientY),
      );
    }
    event.preventDefault();
  }

  function returnIngredientToSource(button) {
    button.classList.remove("is-dragging", "is-dropped");
    button.classList.add("is-returning");
    setIngredientDragTransform(button, 0, 0, 0, 1);
    window.setTimeout(() => {
      button.classList.remove("is-returning");
      clearIngredientDragTransform(button);
    }, reducedMotion.matches ? 0 : 340);
  }

  function finishIngredientDrag(event, cancelled = false) {
    const drag = mixing.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    mixing.drag = null;
    mixing.tilt = 0;
    releaseDragPointer(drag);
    stirZone.classList.remove("is-drop-target");
    dropHint.hidden = true;
    drag.button.classList.remove("is-dragging");

    if (drag.triggered) return;
    const accepted =
      !cancelled && bowlContainsPoint(event.clientX, event.clientY);
    if (!accepted) {
      mixingFeedback.textContent =
        drag.ingredient === "soup"
          ? "还没有倾到碗口，汤碗已经回到原处。"
          : "还没放进碗里，食材已经回到原处。";
      returnIngredientToSource(drag.button);
      return;
    }

    drag.button.classList.add("is-dropped");
    setIngredientDragTransform(
      drag.button,
      drag.dx,
      drag.dy,
      0,
      0.72,
    );
    void handleIngredient(drag.button, { fromDrag: true });
  }

  function animateIngredientToBowl(button) {
    const image = button.querySelector("img");
    if (!image || reducedMotion.matches) return wait(120);

    const source = image.getBoundingClientRect();
    const target = stirZone.getBoundingClientRect();
    const clone = image.cloneNode();
    clone.className = "gbc-moving-ingredient";
    clone.style.left = `${source.left}px`;
    clone.style.top = `${source.top}px`;
    clone.style.width = `${source.width}px`;
    clone.style.height = `${source.height}px`;
    canvas.append(clone);

    const deltaX =
      target.left + target.width / 2 - (source.left + source.width / 2);
    const deltaY =
      target.top + target.height * 0.46 - (source.top + source.height / 2);
    const animation = clone.animate(
      [
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${deltaX * 0.45}px, ${deltaY * 0.18 - 34}px) scale(0.72) rotate(-5deg)`,
          opacity: 0.88,
          offset: 0.48,
        },
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.28) rotate(4deg)`,
          opacity: 0.12,
        },
      ],
      {
        duration: 500,
        easing: "cubic-bezier(0.36, 0, 0.22, 1)",
        fill: "forwards",
      },
    );

    return animation.finished
      .catch(() => undefined)
      .finally(() => clone.remove());
  }

  async function animateSoupPour(button) {
    const sourceImage = button.querySelector("img");
    button.classList.add("is-pouring-source");
    soupPourBackground.hidden = false;
    soupPourImage.hidden = false;

    let decodeFailed = false;
    try {
      await Promise.all([
        soupPourImage.decode(),
        soupPourBackground.decode(),
      ]);
    } catch {
      decodeFailed = true;
    }

    if (decodeFailed || !sourceImage) {
      button.classList.remove("is-pouring-source");
      soupPourImage.style.opacity = "";
      soupPourImage.hidden = true;
      soupPourBackground.classList.remove("is-visible");
      soupPourBackground.hidden = true;
      setMixingAssetError(
        "倒汤动画素材未找到，请检查汤碗与倒汤图后刷新页面。",
      );
      return false;
    }

    window.requestAnimationFrame(() => {
      soupPourBackground.classList.add("is-visible");
    });
    await wait(reducedMotion.matches ? 20 : 160);

    if (reducedMotion.matches) {
      soupPourImage.style.opacity = "1";
      await wait(reducedMotion.matches ? 140 : 20);
      soupPourImage.style.opacity = "0";
      soupPourImage.hidden = true;
      soupPourBackground.classList.remove("is-visible");
      soupPourBackground.hidden = true;
      button.classList.remove("is-pouring-source");
      return true;
    }

    const sourceRect = sourceImage.getBoundingClientRect();
    const targetRect = soupPourImage.getBoundingClientRect();
    const startScale = Math.max(
      0.52,
      Math.min(0.62, (sourceRect.height / targetRect.height) * 2.2),
    );
    const targetAnchorX = targetRect.left + targetRect.width * 0.38;
    const targetAnchorY = targetRect.top + targetRect.height * 0.28;
    const startX =
      sourceRect.left + sourceRect.width / 2 - targetAnchorX;
    const startY =
      sourceRect.top + sourceRect.height / 2 - targetAnchorY;

    const animation = soupPourImage.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px) scale(${startScale}) rotate(-2deg)`,
          opacity: 0,
        },
        {
          transform: `translate(${startX * 0.82}px, ${startY * 0.66}px) scale(${startScale + 0.1}) rotate(-1deg)`,
          opacity: 0.92,
          offset: 0.2,
        },
        {
          transform: "translate(0, 0) scale(1) rotate(0deg)",
          opacity: 1,
          offset: 0.74,
        },
        {
          transform: "translate(0, -7px) scale(1.012) rotate(0deg)",
          opacity: 1,
          offset: 0.9,
        },
        {
          transform: "translate(0, 2px) scale(1.018) rotate(0deg)",
          opacity: 0,
        },
      ],
      {
        duration: 1550,
        easing: "cubic-bezier(0.34, 0.02, 0.2, 1)",
        fill: "forwards",
      },
    );

    await animation.finished.catch(() => undefined);
    soupPourImage.hidden = true;
    soupPourImage.style.opacity = "";
    soupPourBackground.classList.remove("is-visible");
    soupPourBackground.hidden = true;
    button.classList.remove("is-pouring-source");
    return true;
  }

  async function handleIngredient(button, options = {}) {
    const { fromDrag = false } = options;
    const ingredient = button.dataset.gbcMixingIngredient;
    const step = currentMixingStep();
    if (
      !mixingCanInteract() ||
      step.id !== ingredient ||
      mixing.used[ingredient]
    ) {
      return;
    }

    mixing.busy = true;
    mixing.feedback = step.message;
    renderMixing();

    if (ingredient === "soup") {
      const poured = await animateSoupPour(button);
      if (!poured) {
        clearIngredientDragTransform(button);
        return;
      }
      clearIngredientDragTransform(button);
    } else if (fromDrag) {
      await wait(reducedMotion.matches ? 20 : 220);
      button.classList.remove("is-dropped");
      clearIngredientDragTransform(button);
    } else {
      button.classList.add("is-flying");
      await animateIngredientToBowl(button);
      button.classList.remove("is-flying");
      clearIngredientDragTransform(button);
    }

    mixing.used[ingredient] = true;
    const nextIndex = MIXING_STEPS.findIndex((item) => item.id === step.id) + 1;
    mixing.step = MIXING_STEPS[nextIndex]?.id || "complete";
    mixing.busy = false;
    renderStage();
    announce(step.message);
  }

  async function handleChopsticks() {
    if (!mixingCanInteract() || currentMixingStep().id !== "chopsticks") {
      return;
    }
    const step = currentMixingStep();
    mixing.busy = true;
    mixing.feedback = "筷子已经落入碗中。";
    renderMixing();
    chopsticksButton.classList.add("is-lifting");
    await wait(reducedMotion.matches ? 20 : 180);
    chopsticksButton.classList.remove("is-lifting");
    chopsticksButton.classList.add("is-in-bowl");
    await wait(reducedMotion.matches ? 20 : 420);
    mixing.busy = false;
    mixing.step = "stirring";
    renderStage();
    announce(step.message);
  }

  function skipMixing() {
    if (state.phase !== PHASE.MIXING || completed.mixing) return;
    cancelAutoStir();
    mixing.busy = false;
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    const activeDrag = mixing.drag;
    mixing.drag = null;
    mixing.tilt = 0;
    if (activeDrag) releaseDragPointer(activeDrag);
    stirZone.classList.remove("is-drop-target");
    dropHint.hidden = true;
    mixing.skipped = true;
    mixing.step = "complete";
    mixing.feedback = "已跳过互动。可以直接进入包制工序。";
    completed.mixing = true;
    renderStage();
    announce("已跳过调馅互动，包制工序已解锁");
  }

  function resetMixing() {
    cancelAutoStir();
    mixing.step = "meat";
    Object.keys(mixing.used).forEach((key) => {
      mixing.used[key] = false;
    });
    mixing.progress = 0;
    mixing.busy = false;
    mixing.skipped = false;
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    const activeDrag = mixing.drag;
    mixing.drag = null;
    mixing.tilt = 0;
    if (activeDrag) releaseDragPointer(activeDrag);
    mixing.feedback = "";
    mixingFeedback.classList.remove("is-error");
    mixingStateImage.classList.remove("is-visible", "is-scene-view");
    mixingStateImage.hidden = true;
    mixingStateImage.removeAttribute("src");
    chopsticksButton.classList.remove(
      "is-in-bowl",
      "is-current",
      "is-lifting",
    );
    chopsticksButton.hidden = false;
    soupPourImage.hidden = true;
    soupPourImage.style.opacity = "";
    soupPourBackground.hidden = true;
    soupPourBackground.classList.remove("is-visible");
    stirZone.classList.remove("is-drop-target");
    dropHint.hidden = true;
    mixingIngredientButtons.forEach((button) => {
      button.classList.remove(
        "is-current",
        "is-draggable",
        "is-dragging",
        "is-dropped",
        "is-flying",
        "is-returning",
        "is-pouring-source",
      );
      clearIngredientDragTransform(button);
      button.hidden = false;
      button.disabled = false;
    });
  }

  async function loadAssetInventory() {
    if (window.location.protocol === "file:") return null;
    try {
      const response = await window.fetch(ASSET_ROOT, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return Array.isArray(payload.files) ? new Set(payload.files) : null;
    } catch {
      // 静态托管没有目录清单时，仍按约定路径尝试加载图片。
      return null;
    }
  }

  function showResolvedImage(
    image,
    fallback,
    filename,
    alt,
    version,
    companion = null,
  ) {
    image.hidden = true;
    image.removeAttribute("src");
    image.alt = "";
    fallback.hidden = false;
    if (companion) companion.hidden = false;

    assetInventoryPromise.then((inventory) => {
      if (version !== renderVersion) return;
      if (inventory && !inventory.has(filename)) return;

      const path = resolveAsset(filename);
      const probe = new Image();
      probe.onload = () => {
        if (version !== renderVersion) return;
        image.src = path;
        image.alt = alt;
        image.hidden = false;
        fallback.hidden = true;
        if (companion) companion.hidden = true;
      };
      probe.onerror = () => {
        if (version !== renderVersion) return;
        image.hidden = true;
        image.removeAttribute("src");
        fallback.hidden = false;
        if (companion) companion.hidden = false;
      };
      probe.src = path;
    });
  }

  function actionLabelFor(stage) {
    const stageIsComplete = state.completed[stage.id];
    const followingStage = nextStage(stage.id);
    if (!stageIsComplete) return stage.action;
    if (followingStage) return `进入${followingStage.label}`;
    return "查看制作完成";
  }

  function renderStage() {
    renderVersion += 1;
    const version = renderVersion;
    const stage = currentStage();
    const courseCompleted = state.phase === PHASE.COMPLETED;
    const stageComplete = state.completed[stage.id];
    const assets = ASSETS[stage.id];
    const backgroundFile =
      (stage.id === PHASE.MIXING && currentMixingStep().backgroundFile) ||
      assets.background;

    canvas.dataset.stage = stage.id;
    canvas.classList.toggle("is-course-complete", courseCompleted);
    ordinal.textContent = courseCompleted ? "四道工序 · 已齐" : stage.ordinal;
    title.textContent = courseCompleted ? "制作完成" : stage.title;
    hint.textContent = courseCompleted
      ? "白汽散开，刚蒸好的十八褶包子完整出了笼。"
      : stage.hint;
    noteTitle.textContent = courseCompleted
      ? "十八褶收口，白汽里出笼"
      : stage.noteTitle;
    noteCopy.textContent = courseCompleted
      ? "肉馅已调匀，面皮已收拢，十八褶把收口收得端正。笼盖一开，这一笼包子便出了手。"
      : stage.noteCopy;
    actionText.textContent = courseCompleted ? "再做一笼" : actionLabelFor(stage);

    completionSeal.hidden = !courseCompleted;
    stageCompleteNote.hidden =
      courseCompleted ||
      !stageComplete ||
      stage.id === PHASE.MIXING ||
      stage.id === PHASE.WRAPPING ||
      stage.id === PHASE.PLEATING ||
      stage.id === PHASE.STEAMING;
    stageCompleteNote.textContent = stageComplete ? stage.completeNote : "";
    actionButton.hidden =
      stage.id === PHASE.MIXING ||
      stage.id === PHASE.WRAPPING ||
      stage.id === PHASE.PLEATING ||
      stage.id === PHASE.STEAMING;
    actionButton.classList.toggle(
      "is-next-step",
      !courseCompleted && stageComplete,
    );
    previousStageButton.hidden =
      !courseCompleted && stage.order === 1;
    previousStageButton.disabled = transitioning;
    skipStageButton.hidden =
      courseCompleted ||
      stage.id === PHASE.MIXING ||
      (stage.id === PHASE.PLEATING &&
        completed.pleating &&
        pleating.revealPending);
    skipStageButton.disabled = transitioning;
    restartCourseButton.disabled = transitioning;

    backgroundName.textContent = stage.backgroundAlt;
    subjectName.textContent = courseCompleted
      ? "竹蒸笼 · 热包子出笼"
      : stage.caption;
    subjectLabel.textContent = stage.artLabel;
    ingredientStrip.hidden = stage.id !== PHASE.MIXING || courseCompleted;
    showResolvedImage(
      backgroundImage,
      backgroundFallback,
      backgroundFile,
      stage.backgroundAlt,
      version,
      backgroundNotice,
    );
    showResolvedImage(
      subjectImage,
      subjectFallback,
      assets.subject,
      stage.subjectAlt,
      version,
    );

    stageButtons.forEach((button) => {
      const buttonStage = button.dataset.gbcStage;
      const isCurrent = buttonStage === stage.id;
      const isComplete = state.completed[buttonStage];
      const isLocked =
        !state.completed.mixing && buttonStage !== PHASE.MIXING;
      button.classList.toggle("is-complete", isComplete);
      button.disabled = isLocked;
      button.setAttribute("aria-disabled", String(isLocked));
      if (isCurrent) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundLabel.textContent = soundEnabled ? "音效：开" : "音效：关";
    renderMixing();
    renderWrapping();
    renderPleating();
    renderSteaming();
    saveProgress();
  }

  async function showStage(stageId, options = {}) {
    const { animate = true } = options;
    if (!stageById.has(stageId) || transitioning) return;
    if (state.phase === stageId) return;
    if (
      state.phase === PHASE.MIXING &&
      !state.completed.mixing &&
      stageId !== PHASE.MIXING
    ) {
      announce("请先完成调馅，或使用“跳过互动”继续阅读");
      return;
    }

    const version = ++transitionVersion;
    transitioning = true;
    const shouldAnimate = animate && !reducedMotion.matches;

    if (shouldAnimate) {
      fade.classList.add("is-visible");
      await wait(240);
    }
    if (version !== transitionVersion) return;

    wrapping.transitionVersion += 1;
    if (state.phase === PHASE.WRAPPING) {
      wrapping.busy = false;
      const drag = wrapping.drag;
      wrapping.drag = null;
      if (
        drag &&
        wrapDoughButton.hasPointerCapture?.(drag.pointerId)
      ) {
        wrapDoughButton.releasePointerCapture(drag.pointerId);
      }
      wrapHandDrop.hidden = true;
      wrapHandDrop.classList.remove("is-target");
      wrapDoughButton.classList.remove(
        "is-dragging",
        "is-dropped",
        "is-returning",
      );
      clearWrapDoughDragTransform(wrapDoughButton);
    }
    if (
      state.phase === PHASE.STEAMING &&
      stageId !== PHASE.STEAMING &&
      !completed.steaming
    ) {
      resetSteaming();
    }
    if (state.phase === PHASE.PLEATING) {
      pleating.transitionVersion += 1;
      pleating.busy = false;
      if (stageId !== PHASE.PLEATING) {
        pleating.revealPending = false;
      }
      pleatingLayer.classList.remove("is-pinching");
    }
    state.phase = stageId;
    renderStage();
    const stage = stageById.get(stageId);
    announce(`已切换到${stage.label}工序`);

    if (shouldAnimate) {
      await wait(20);
      fade.classList.remove("is-visible");
      await wait(240);
    }

    if (version === transitionVersion) {
      transitioning = false;
      previousStageButton.disabled = false;
      skipStageButton.disabled = false;
      restartCourseButton.disabled = false;
    }
  }

  function unlockNextStorySegment() {
    document.dispatchEvent(
      new CustomEvent("dogBuLiCraft:unlock", {
        detail: { page: "market" },
      }),
    );
  }

  function skipCurrentStage() {
    if (transitioning || state.phase === PHASE.COMPLETED) return;

    if (state.phase === PHASE.MIXING) {
      skipMixing();
      return;
    }

    if (state.phase === PHASE.WRAPPING) {
      wrapping.transitionVersion += 1;
      wrapping.step = "complete";
      wrapping.busy = false;
      wrapping.drag = null;
      wrapHandDrop.hidden = true;
      wrapHandDrop.classList.remove("is-target");
      wrapDoughButton.classList.remove(
        "is-dragging",
        "is-dropped",
        "is-returning",
      );
      clearWrapDoughDragTransform(wrapDoughButton);
      wrapping.feedback = "已跳过包制互动，十八褶已经解锁。";
      completed.wrapping = true;
      setWrappingFrameImmediate(
        WRAPPING_STATE_FILES[3],
        WRAPPING_STEPS[3].imageAlt,
      );
      renderStage();
      announce("已跳过包制互动，十八褶已经解锁");
      return;
    }

    if (state.phase === PHASE.PLEATING) {
      pleating.transitionVersion += 1;
      pleating.count = PLEAT_COUNT_MAX;
      pleating.busy = false;
      pleating.assetError = false;
      pleating.feedback = "已跳过捏褶互动，十八褶已经收齐。";
      pleating.revealPending = true;
      completed.pleating = true;
      setPleatingFrameImmediate(
        PLEATING_STATE_FILES[PLEATING_STATE_FILES.length - 1],
        "第一人称视角下，包子外沿已经收齐十八道褶",
      );
      renderStage();
      announce("已跳过十八褶互动，可以放入蒸笼");
      return;
    }

    if (state.phase === PHASE.STEAMING) {
      steaming.transitionVersion += 1;
      steaming.opened = true;
      steaming.busy = false;
      steaming.phase = "complete";
      steaming.feedback = "已跳过揭笼动画，一笼包子完整出笼。";
      completed.steaming = true;
      state.phase = PHASE.COMPLETED;
      renderStage();
      unlockNextStorySegment();
      announce("已跳过揭笼互动，故事下一段已经解锁");
    }
  }

  function goToPreviousStage() {
    if (transitioning) return;
    if (state.phase === PHASE.COMPLETED) {
      void showStage(PHASE.STEAMING);
      return;
    }
    const stage = currentStage();
    const previous = STAGES[stage.order - 2];
    if (previous) void showStage(previous.id);
  }

  function markCurrentStageComplete() {
    const stage = currentStage();
    if (state.completed[stage.id]) return false;
    state.completed[stage.id] = true;
    renderStage();
    return true;
  }

  function handleAction() {
    if (state.phase === PHASE.COMPLETED) {
      resetCourse();
      announce("已从调馅重新开始");
      return;
    }

    const stage = currentStage();
    if (stage.id === PHASE.MIXING) {
      announce("调馅要在碗边一步步完成，也可使用“跳过互动”");
      return;
    }
    if (stage.id === PHASE.PLEATING) {
      announce("十八褶要沿包子外沿逐道捏出，完成后才可放入蒸笼");
      return;
    }
    if (stage.id === PHASE.STEAMING) {
      announce("揭笼要直接点击蒸笼盖完成");
      return;
    }
    if (markCurrentStageComplete()) {
      announce(stage.completeNote);
      return;
    }

    const followingStage = nextStage(stage.id);
    if (followingStage) {
      void showStage(followingStage.id);
      return;
    }

    state.phase = PHASE.COMPLETED;
    renderStage();
    announce("制作完成，热包子已经出笼");
  }

  function resetCourse(options = {}) {
    const { persist = true } = options;
    transitionVersion += 1;
    transitioning = false;
    fade.classList.remove("is-visible");
    hideResumePrompt();
    state.phase = PHASE.MIXING;
    STAGES.forEach((stage) => {
      state.completed[stage.id] = false;
    });
    resetMixing();
    wrapping.transitionVersion += 1;
    wrapping.step = "dough";
    wrapping.busy = false;
    wrapping.drag = null;
    wrapping.feedback = "";
    wrapHandDrop.hidden = true;
    wrapHandDrop.classList.remove("is-target");
    wrapDoughButton.classList.remove(
      "is-dragging",
      "is-dropped",
      "is-returning",
    );
    clearWrapDoughDragTransform(wrapDoughButton);
    setWrappingFrameImmediate(
      WRAPPING_STATE_FILES[0],
      WRAPPING_STEPS[0].imageAlt,
    );
    pleating.transitionVersion += 1;
    pleating.count = 0;
    pleating.busy = false;
    pleating.feedback = "";
    pleating.revealPending = false;
    pleatingLayer.classList.remove("is-pinching", "is-complete");
    setPleatingFrameImmediate(
      PLEATING_STATE_FILES[0],
      "第一人称视角下，左手托着包子皮与肉馅，准备捏出第一道褶",
    );
    steaming.transitionVersion += 1;
    steaming.opened = false;
    steaming.busy = false;
    steaming.phase = "closed";
    steaming.feedback = "";
    clearSteamingAnimationClasses();
    setSteamingImages();
    if (persist) clearSavedProgress();
    renderStage();
  }

  function restoreProgress(progress) {
    if (!progress || progress.version !== PROGRESS_VERSION) return false;
    resetCourse({ persist: false });

    const requestedPhase = Object.values(PHASE).includes(progress.phase)
      ? progress.phase
      : PHASE.MIXING;
    const safePhase =
      requestedPhase === PHASE.COMPLETED &&
      !progress.completed?.steaming
        ? PHASE.STEAMING
        : requestedPhase;
    const phaseIndex = Object.values(PHASE).indexOf(safePhase);

    STAGES.forEach((stage, index) => {
      state.completed[stage.id] = Boolean(
        progress.completed?.[stage.id] ||
          (safePhase === PHASE.COMPLETED) ||
          (phaseIndex > index && safePhase !== PHASE.COMPLETED),
      );
    });

    if (
      MIXING_STEP_BY_ID.has(progress.mixing?.step)
    ) {
      mixing.step = progress.mixing.step;
    }
    if (progress.mixing?.used) {
      Object.keys(mixing.used).forEach((key) => {
        mixing.used[key] = Boolean(progress.mixing.used[key]);
      });
    }
    mixing.progress = Math.max(
      0,
      Math.min(100, Number(progress.mixing?.progress) || 0),
    );
    mixing.skipped = Boolean(progress.mixing?.skipped);
    mixing.busy = false;
    mixing.pointerActive = false;
    mixing.lastAngle = null;

    if (WRAPPING_STEP_BY_ID.has(progress.wrapping?.step)) {
      wrapping.step = progress.wrapping.step;
    }
    wrapping.feedback =
      typeof progress.wrapping?.feedback === "string"
        ? progress.wrapping.feedback
        : "";
    wrapping.busy = false;
    if (wrapping.step === "complete") {
      state.completed.wrapping = true;
    }
    const wrappingStep = currentWrappingStep();
    setWrappingFrameImmediate(
      wrappingStep.imageFile,
      wrappingStep.imageAlt,
    );

    pleating.count = Math.max(
      0,
      Math.min(
        PLEAT_COUNT_MAX,
        Math.round(Number(progress.pleating?.count) || 0),
      ),
    );
    pleating.feedback =
      typeof progress.pleating?.feedback === "string"
        ? progress.pleating.feedback
        : "";
    pleating.busy = false;
    pleating.assetError = false;
    pleating.revealPending =
      safePhase === PHASE.PLEATING &&
      pleating.count >= PLEAT_COUNT_MAX &&
      progress.pleating?.revealPending !== false;
    if (pleating.count >= PLEAT_COUNT_MAX) {
      state.completed.pleating = true;
    }
    setPleatingFrameImmediate(
      PLEATING_STATE_FILES[pleatingFrameIndex()],
      pleating.count >= PLEAT_COUNT_MAX
        ? "第一人称视角下，包子外沿已经收齐十八道褶"
        : `第一人称视角下，包子外沿正在捏出第 ${pleating.count} 道褶`,
    );

    steaming.opened =
      Boolean(progress.completed?.steaming) ||
      safePhase === PHASE.COMPLETED;
    steaming.busy = false;
    steaming.phase = steaming.opened ? "complete" : "closed";
    steaming.feedback = steaming.opened
      ? "白汽渐散，一笼热包子完整出笼。"
      : "";
    clearSteamingAnimationClasses();
    if (steaming.opened) {
      steamingLayer.classList.add(
        "is-open",
        "is-steam-fading",
        "is-complete",
      );
    }
    setSteamingImages();

    if (safePhase === PHASE.COMPLETED) {
      state.completed.steaming = true;
    }
    state.phase = safePhase;
    renderStage();
    announce(`已继续上次的制作进度：${describeProgress(progress)}`);
    return true;
  }

  function open() {
    if (!module.hidden) {
      title.focus({ preventScroll: true });
      return;
    }
    const saved = readSavedProgress();
    lastFocusBeforeOpen = document.activeElement;
    module.hidden = false;
    document.body.classList.add("gbc-craft-open");
    progressSaveSuspended = true;
    renderStage();
    progressSaveSuspended = false;
    if (saved) {
      showResumePrompt(saved);
    } else {
      window.requestAnimationFrame(() => {
        title.focus({ preventScroll: true });
      });
    }
  }

  function close(options = {}) {
    const { restoreFocus = true, silent = false } = options;
    if (module.hidden) return;
    transitionVersion += 1;
    transitioning = false;
    fade.classList.remove("is-visible");
    saveProgress();
    hideResumePrompt();
    module.hidden = true;
    document.body.classList.remove("gbc-craft-open");
    if (!silent) announce("已退出制作台");
    if (
      restoreFocus &&
      lastFocusBeforeOpen instanceof HTMLElement &&
      !lastFocusBeforeOpen.hidden
    ) {
      lastFocusBeforeOpen.focus({ preventScroll: true });
    }
  }

  function getState() {
    return {
      phase: state.phase,
      completed: { ...state.completed },
      mixing: {
        step: mixing.step,
        used: { ...mixing.used },
        progress: Math.round(mixing.progress),
        busy: mixing.busy,
        skipped: mixing.skipped,
        assetError: mixing.assetError,
        tilt: Math.round(mixing.tilt),
        drag: mixing.drag
          ? {
              ingredient: mixing.drag.ingredient,
              overBowl: mixing.drag.overBowl,
              triggered: mixing.drag.triggered,
              tiltProgress: Math.round(
                (mixing.drag.tiltProgress || 0) * 100,
              ),
            }
          : null,
      },
      wrapping: {
        step: wrapping.step,
        busy: wrapping.busy,
        feedback: wrapping.feedback,
        imageFile: wrapping.imageFile,
        drag: wrapping.drag
          ? {
              dx: Math.round(wrapping.drag.dx),
              dy: Math.round(wrapping.drag.dy),
              overHand: wrapping.drag.overHand,
            }
          : null,
      },
      pleating: {
        count: pleating.count,
        busy: pleating.busy,
        feedback: pleating.feedback,
        imageFile: pleating.imageFile,
        frameIndex: pleatingFrameIndex(),
        revealPending: pleating.revealPending,
      },
      steaming: {
        opened: steaming.opened,
        busy: steaming.busy,
        phase: steaming.phase,
        feedback: steaming.feedback,
      },
    };
  }

  function getFocusableElements() {
    if (!resumePrompt.hidden) {
      return [resumeButton, restartFromPromptButton];
    }
    return [
      ...module.querySelectorAll(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hidden && element.getClientRects().length);
  }

  pleatingStateImages.forEach((image) => {
    image.addEventListener("error", () => {
      if (state.phase === PHASE.PLEATING) {
        setPleatingAssetError(true);
        renderPleating();
      }
    });
  });

  mixingIngredientButtons.forEach((button) => {
    const image = button.querySelector("img");
    const reportError = () => {
      if (state.phase === PHASE.MIXING) {
        setMixingAssetError(
          `${button.querySelector("span")?.textContent || "调馅食材"}素材未找到，请检查 public/assets/goubuli 后刷新页面。`,
        );
      }
    };
    image?.addEventListener("error", reportError);
    if (image?.complete && image.naturalWidth === 0) reportError();
  });
  mixingStateImage.addEventListener("error", () => {
    if (state.phase === PHASE.MIXING) {
      setMixingAssetError(
        "调馅状态图片未找到，互动已暂停，请检查素材后刷新页面。",
      );
    }
  });

  trigger.addEventListener("click", open);
  closeButton.addEventListener("click", () => close());
  previousStageButton.addEventListener("click", goToPreviousStage);
  skipStageButton.addEventListener("click", skipCurrentStage);
  restartCourseButton.addEventListener("click", () => {
    resetCourse();
    announce("已从调馅重新开始");
  });
  resumeButton.addEventListener("click", () => {
    const progress = pendingResume;
    hideResumePrompt();
    if (restoreProgress(progress)) {
      window.requestAnimationFrame(() => {
        title.focus({ preventScroll: true });
      });
    }
  });
  restartFromPromptButton.addEventListener("click", () => {
    resetCourse();
    announce("已清除上次进度，从调馅重新开始");
    window.requestAnimationFrame(() => {
      title.focus({ preventScroll: true });
    });
  });
  actionButton.addEventListener("click", handleAction);
  mixingIngredientButtons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      beginIngredientDrag(event, button);
    });
    button.addEventListener("pointermove", (event) => {
      moveIngredientDrag(event);
    });
    button.addEventListener("pointerup", (event) => {
      finishIngredientDrag(event);
    });
    button.addEventListener("pointercancel", (event) => {
      finishIngredientDrag(event, true);
    });
    button.addEventListener("lostpointercapture", (event) => {
      const drag = mixing.drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      mixing.drag = null;
      mixing.tilt = 0;
      stirZone.classList.remove("is-drop-target");
      dropHint.hidden = true;
      returnIngredientToSource(drag.button);
    });
    button.addEventListener("click", (event) => {
      if (event.detail === 0) void handleIngredient(button);
    });
  });
  chopsticksButton.addEventListener("click", () => {
    void handleChopsticks();
  });
  wrapDoughButton.addEventListener("pointerdown", beginWrapDoughDrag);
  wrapDoughButton.addEventListener("pointermove", moveWrapDoughDrag);
  wrapDoughButton.addEventListener("pointerup", (event) => {
    finishWrapDoughDrag(event);
  });
  wrapDoughButton.addEventListener("pointercancel", (event) => {
    finishWrapDoughDrag(event, true);
  });
  wrapDoughButton.addEventListener("lostpointercapture", (event) => {
    const drag = wrapping.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    wrapping.drag = null;
    wrapping.feedback = "拖拽已取消，面皮回到原处。";
    wrapFeedback.textContent = wrapping.feedback;
    returnWrapDoughToSource();
  });
  wrapDoughButton.addEventListener("click", (event) => {
    if (event.detail === 0) {
      void handleWrappingStep("dough");
    }
  });
  wrapFillingButton.addEventListener("click", () => {
    void handleWrappingStep("filling");
  });
  wrapPromptButton.addEventListener("click", () => {
    void handleWrappingStep("ready");
  });
  wrapReplayButton.addEventListener("click", resetWrapping);
  wrapNextButton.addEventListener("click", () => {
    void showStage(PHASE.PLEATING);
  });
  pleatHotspot.addEventListener("click", (event) => {
    if (pleatFeedbackForEdgeClick(event)) {
      void handlePleatClick();
    }
  });
  pleatReplayButton.addEventListener("click", resetPleating);
  pleatRevealContinue.addEventListener("click", continueFromPleatReveal);
  pleatNextButton.addEventListener("click", () => {
    void showStage(PHASE.STEAMING);
  });
  steamLidButton.addEventListener("click", () => {
    void handleSteamOpen();
  });
  steamStoryButton.addEventListener("click", continueFromSteam);
  steamReplayButton.addEventListener("click", resetCourse);
  autoStirButton.addEventListener("click", startAutoStir);
  skipMixingButton.addEventListener("click", skipMixing);
  mixingNextButton.addEventListener("click", () => {
    void showStage(PHASE.WRAPPING);
  });
  stirHandle.addEventListener("pointerdown", handleStirPointerDown);
  stirHandle.addEventListener("pointermove", handleStirPointerMove);
  stirHandle.addEventListener("pointerup", handleStirPointerEnd);
  stirHandle.addEventListener("pointercancel", handleStirPointerEnd);
  stirHandle.addEventListener("lostpointercapture", () => {
    mixing.pointerActive = false;
    mixing.lastAngle = null;
    stirZone.classList.remove("is-stirring");
    stirHandle.classList.remove("is-stirring");
  });
  stirZone.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      mixingCanInteract() &&
      isStirringStep()
    ) {
      event.preventDefault();
      startAutoStir();
    }
  });
  stageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      void showStage(button.dataset.gbcStage);
    });
  });
  originalButton.addEventListener("click", () => {
    if (typeof window.dogBuLiStory?.openOriginal === "function") {
      window.dogBuLiStory.openOriginal({
        stageId: state.phase === PHASE.COMPLETED
          ? PHASE.STEAMING
          : state.phase,
      });
    } else {
      document.querySelector("#dogOriginalButton")?.click();
    }
  });
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundLabel.textContent = soundEnabled ? "音效：开" : "音效：关";
    announce(soundEnabled ? "声音开关已打开" : "声音开关已关闭");
  });

  module.addEventListener("keydown", (event) => {
    if (module.hidden) return;
    if (event.key === "Escape" && originalModal.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || !originalModal.hidden) return;

    const focusable = getFocusableElements();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  reducedMotion.addEventListener?.("change", renderStage);
  renderStage();

  window.gouBuliCraft = {
    open,
    close,
    showStage,
    reset: resetCourse,
    skipMixing,
    skipCurrentStage,
    previousStage: goToPreviousStage,
    continueStory: continueFromSteam,
    continueFromPleatReveal,
    autoStir: startAutoStir,
    resetWrapping,
    openSteamer: handleSteamOpen,
    getState,
    getSavedProgress: readSavedProgress,
    restoreProgress,
    isOpen: () => !module.hidden,
    phases: PHASE,
    assets: ASSETS,
    mixingAssets: MIXING_STATE_FILES,
    wrappingAssets: WRAPPING_STATE_FILES,
    pleatingAssets: PLEATING_STATE_FILES,
    pleatRevealAsset: PLEAT_REVEAL_FILE,
    steamingAssets: STEAMING_STATE_FILES,
  };
})();
