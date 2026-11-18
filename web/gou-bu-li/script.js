(() => {
  "use strict";

  // ============================================================
  // 1. 故事文字与状态
  // 初学者可优先修改这一部分，不必先理解下面的交互逻辑。
  // ============================================================
  const storyData = {
    street: {
      steamer: {
        kicker: "蒸笼 · 香气",
        title: "白汽先把人带到铺子门前",
        copy:
          "顺着香味，老街上的脚步慢下来。蒸笼里的热气把顾客引向这家不起眼的小铺。",
      },
      sign: {
        kicker: "铺面 · 狗子",
        title: "狗子，本名高贵友",
        copy:
          "街坊更熟悉他的小名。他守在铺子里，手上总忙着面皮、馅料和蒸笼。",
      },
      customer: {
        kicker: "顾客 · 印象",
        title: "桌边的人，自己取包子",
        copy:
          "顾客围着木桌吃包子，也熟门熟路地自己取用。热气、谈笑和后厨的忙碌，把小小铺面填得满满当当。",
      },
      person: {
        kicker: "人物 · 狗子",
        title: "只顾手上的活计",
        copy:
          "狗子俯身在青花大碗前拌馅，案上摆着切好的肉、葱和豆腐。他把心思都放在味道与手艺上，很少停下招呼人。",
      },
    },

    craftSteps: {
      mix: {
        kicker: "第一步 · 调馅",
        title: "让肉馅更香、更润",
        instruction:
          "依次点击鲜汤、猪油和肉馅，把平时得到的经验调入馅料。",
      },
      wrap: {
        kicker: "第二步 · 包制",
        title: "把馅放进面皮里",
        instruction:
          "点击面皮三次：放入馅料、收拢边缘、压实形状。",
      },
      pleat: {
        kicker: "第三步 · 十八褶",
        title: "让一圈褶子像花一样展开",
        instruction:
          "按顺序点击每一道褶。这里模拟手艺步骤，不要求真实完成精确的十八次捏合。",
      },
      steam: {
        kicker: "第四步 · 揭笼",
        title: "热气散开，包子成形",
        instruction:
          "点击笼盖。热气散开后，看到刚出笼的包子，也看见手艺留在细节里的成果。",
      },
    },

    busy: {
      bowl: {
        title: "大海碗里放着顾客要取的包子",
        copy: "顾客自己从碗里取包子，不需要一遍遍等狗子招呼。",
      },
      coin: {
        title: "铜钱落进钱箱，买卖继续",
        copy: "该留的钱放在箱里，狗子忙着收钱、补货和继续制作。",
      },
      dog: {
        title: "他把时间用在手上的活计",
        copy: "狗子很少有闲空回应闲话，顾客便打趣说他“不理人”。",
      },
    },

    gossip: {
      neighbor: "“狗子行呵，不理人啦！”",
      rival:
        "同行把这句话当成嘲讽：一个只顾做包子、不招呼人的年轻人，能有什么能耐？",
      customer:
        "可顾客尝过包子，又觉得这个名字直白、好记。于是议论越传越远。",
    },

    fame: [
      {
        title: "香气先走过街巷",
        copy: "街坊与顾客的口耳相传，让“狗不理”从一句闲话变成熟悉的称呼。",
      },
      {
        title: "一屉包子离开原处",
        copy: "故事中的进献情节，让天津街头的手艺进入更大的视野。",
      },
      {
        title: "名字随味道传得更远",
        copy: "品尝、议论与流传叠加在一起，“狗不理”最终成为众人熟知的名号。",
      },
    ],

    originalItems: [
      {
        text: "“狗子行呵，不理人啦！”",
        source: "来自你提供的设计文档中的明确引语；正式出版原文仍待核对。",
      },
    ],

    reflectionKeywords: [
      "用心",
      "坚持",
      "智慧",
      "实惠",
      "手艺",
      "名字",
    ],
  };

  const reflectionStorageKey = "sushi-qiren-gou-bu-li-reflection-v1";
  const sceneOrder = ["street", "craft", "shop", "name", "fame", "reflection"];
  const sceneLabels = {
    street: "第一幕 / 五幕",
    craft: "第二幕 / 五幕",
    shop: "第三幕 / 五幕",
    name: "第四幕 / 五幕",
    fame: "第五幕 / 五幕",
    reflection: "读后笺",
  };

  // ============================================================
  // 2. 获取页面元素
  // ============================================================
  const scenePanels = [...document.querySelectorAll("[data-scene]")];
  const sceneButtons = [...document.querySelectorAll("[data-scene-go]")];
  const chapterButtons = [...document.querySelectorAll(".chapter-nav button")];
  const progressFill = document.querySelector("#progressFill");
  const liveStatus = document.querySelector("#liveStatus");

  const streetPanel = document.querySelector("#streetPanel");
  const streetPanelKicker = streetPanel.querySelector(".kicker");
  const streetPanelTitle = streetPanel.querySelector("h2");
  const streetPanelCopy = document.querySelector("#streetPanelCopy");
  const streetVisitCount = document.querySelector("#streetVisitCount");

  const craftStage = document.querySelector("#craftStage");
  const craftTabs = [...document.querySelectorAll("[data-craft-step]")];
  const craftKicker = document.querySelector("#craftKicker");
  const craftTitleSmall = document.querySelector("#craftTitleSmall");
  const craftInstruction = document.querySelector("#craftInstruction");
  const craftProgress = document.querySelector("#craftProgress");
  const mixButtons = [...document.querySelectorAll("[data-mix]")];
  const wrapDough = document.querySelector("#wrapDough");
  const wrapHint = document.querySelector("#wrapHint");
  const pleatRing = document.querySelector("#pleatRing");
  const pleatCounter = document.querySelector("#pleatCounter");
  const steamerLid = document.querySelector("#steamerLid");
  const steamerStack = document.querySelector(".steamer-stack");
  const steamHint = document.querySelector("#steamHint");

  const busyObjects = [...document.querySelectorAll("[data-busy]")];
  const busyTitle = document.querySelector("#busyTitle");
  const busyCopy = document.querySelector("#busyCopy");
  const busyMeters = {
    bowl: document.querySelector("#meterBowl"),
    coin: document.querySelector("#meterCoin"),
    dog: document.querySelector("#meterDog"),
  };
  const streetSaying = document.querySelector("#streetSaying");

  const gossipCards = [...document.querySelectorAll("[data-gossip]")];
  const shopNameSign = document.querySelector("#shopNameSign");
  const signCharacters = [
    ...document.querySelectorAll(".sign-character"),
  ];
  const nameHint = document.querySelector("#nameHint");

  const fameSign = document.querySelector("#fameSign");
  const fameSteps = [...document.querySelectorAll("[data-fame-step]")];

  const originalButton = document.querySelector("#originalButton");
  const skipButton = document.querySelector("#skipButton");
  const originalModal = document.querySelector("#originalModal");
  const originalDialog = originalModal.querySelector(".original-dialog");
  const originalContent = document.querySelector("#originalContent");
  const soundButton = document.querySelector("#soundButton");

  const reflectionChips = document.querySelector("#reflectionChips");
  const reflectionText = document.querySelector("#reflectionText");
  const saveReflection = document.querySelector("#saveReflection");
  const reflectionStatus = document.querySelector("#reflectionStatus");
  const restartStory = document.querySelector("#restartStory");

  // ============================================================
  // 3. 可修改的交互状态
  // ============================================================
  const state = {
    currentScene: "street",
    streetVisited: new Set(),
    craftStep: "mix",
    mixedIngredients: new Set(),
    wrapPresses: 0,
    pleatsDone: new Set(),
    steamOpened: false,
    busyCompleted: new Set(),
    gossipRead: new Set(),
    visibleSignCharacters: 0,
    fameStep: -1,
    soundEnabled: false,
  };

  let focusBeforeOriginal = null;
  let ambientContext = null;
  let ambientSource = null;
  let ambientGain = null;

  // ============================================================
  // 4. 通用辅助函数
  // ============================================================
  function announce(message) {
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function showScene(sceneId, pushHistory = true) {
    if (!sceneOrder.includes(sceneId)) return;
    state.currentScene = sceneId;

    scenePanels.forEach((panel) => {
      const current = panel.dataset.scene === sceneId;
      panel.hidden = !current;
      panel.classList.toggle("is-active", current);
    });

    chapterButtons.forEach((button) => {
      if (button.dataset.sceneGo === sceneId) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const index = sceneOrder.indexOf(sceneId);
    progressFill.style.width = `${((index + 1) / sceneOrder.length) * 100}%`;

    if (pushHistory) {
      history.pushState({ scene: sceneId }, "", `#${sceneId}`);
    }

    window.scrollTo({
      top: 0,
      behavior: pushHistory ? "smooth" : "auto",
    });

    const panel = document.querySelector(`[data-scene="${sceneId}"]`);
    const heading = panel.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }

  // ============================================================
  // 5. 第一幕：街景观察
  // ============================================================
  function renderStreetSpot(key) {
    const content = storyData.street[key];
    if (!content) return;
    state.streetVisited.add(key);
    streetPanelKicker.textContent = content.kicker;
    streetPanelTitle.textContent = content.title;
    streetPanelCopy.textContent = content.copy;
    streetVisitCount.textContent = `${state.streetVisited.size} / 4`;
    document.querySelectorAll("[data-street]").forEach((button) => {
      button.classList.toggle(
        "is-visited",
        state.streetVisited.has(button.dataset.street),
      );
    });
    announce(`${content.kicker}：${content.title}`);
  }

  // ============================================================
  // 6. 第二幕：包子制作
  // ============================================================
  function updateCraftCopy() {
    const step = storyData.craftSteps[state.craftStep];
    craftKicker.textContent = step.kicker;
    craftTitleSmall.textContent = step.title;
    craftInstruction.textContent = step.instruction;

    if (state.craftStep === "mix") {
      craftProgress.textContent =
        `已加入 ${state.mixedIngredients.size} / 3 样`;
    } else if (state.craftStep === "wrap") {
      craftProgress.textContent = `包制进度 ${state.wrapPresses} / 3`;
    } else if (state.craftStep === "pleat") {
      craftProgress.textContent =
        `已捏出 ${state.pleatsDone.size} / 18 道褶`;
    } else {
      craftProgress.textContent = state.steamOpened
        ? "包子已经出笼"
        : "笼盖还盖着";
    }
  }

  function setCraftStep(step, shouldAnnounce = true) {
    if (!storyData.craftSteps[step]) return;
    state.craftStep = step;
    craftStage.dataset.step = step;
    craftTabs.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.craftStep === step),
      );
    });
    updateCraftCopy();
    if (shouldAnnounce) {
      announce(`进入${storyData.craftSteps[step].kicker}`);
    }
  }

  function buildPleats() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 18; index += 1) {
      const angle = ((index * 20 - 90) * Math.PI) / 180;
      const radius = 42;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pleat-button";
      button.dataset.pleatIndex = String(index);
      button.textContent = String(index + 1).padStart(2, "0");
      button.setAttribute("aria-label", `第 ${index + 1} 道褶`);
      // 把十八个小按钮均匀排在一个圆环上。
      button.style.left = `${50 + Math.cos(angle) * radius}%`;
      button.style.top = `${50 + Math.sin(angle) * radius}%`;
      fragment.append(button);
    }
    pleatRing.append(fragment);
  }

  function completeMixIfReady() {
    const complete = state.mixedIngredients.size === 3;
    craftStage.classList.toggle("is-mixed", complete);
    if (complete) {
      craftProgress.textContent = "馅料调配完成";
      announce("馅料已经调配完成，可以进入包制");
    }
  }

  function renderWrapPress() {
    wrapDough.dataset.press = String(state.wrapPresses);
    const messages = [
      "点击面皮中央，依次放入馅料、收边、压实。",
      "馅料已经在面皮中央，再点一次收拢边缘。",
      "边缘已经收拢，再点一次压实形状。",
      "包制完成，可以开始捏十八褶。",
    ];
    wrapHint.textContent = messages[state.wrapPresses];
    updateCraftCopy();

    if (state.wrapPresses === 3) {
      announce("包制完成，下一步是十八褶");
      window.setTimeout(() => setCraftStep("pleat"), 260);
    }
  }

  // ============================================================
  // 7. 第三幕：忙碌经营
  // ============================================================
  function renderBusyObject(key) {
    const content = storyData.busy[key];
    if (!content) return;
    state.busyCompleted.add(key);
    busyTitle.textContent = content.title;
    busyCopy.textContent = content.copy;

    const button = document.querySelector(`[data-busy="${key}"]`);
    button.classList.add("is-complete");
    busyMeters[key].textContent = `${busyMeters[key].textContent.split(" · ")[0]} · 已完成`;
    busyMeters[key].classList.add("is-complete");

    if (state.busyCompleted.size === 3) {
      streetSaying.hidden = false;
      announce("海碗、钱箱与忙碌制作都已完成，街坊议论出现");
    } else {
      announce(content.title);
    }
  }

  // ============================================================
  // 8. 第四幕：名字反转
  // ============================================================
  function renderGossip(key) {
    const card = document.querySelector(`[data-gossip="${key}"]`);
    if (!card) return;
    const active = card.getAttribute("aria-pressed") !== "true";
    card.setAttribute("aria-pressed", String(active));

    if (active) {
      state.gossipRead.add(key);
      nameHint.textContent = storyData.gossip[key];
      announce(storyData.gossip[key]);
    } else {
      state.gossipRead.delete(key);
      nameHint.textContent =
        state.gossipRead.size > 0
          ? `已经听过 ${state.gossipRead.size} 个人的说法。`
          : "街坊的一句话，怎样变成一块招牌？";
    }
  }

  function revealNextSignCharacter() {
    state.visibleSignCharacters = Math.min(
      3,
      state.visibleSignCharacters + 1,
    );
    signCharacters.forEach((character, index) => {
      character.classList.toggle(
        "is-visible",
        index < state.visibleSignCharacters,
      );
    });

    if (state.visibleSignCharacters < 3) {
      nameHint.textContent =
        `“狗不理”已经显现 ${state.visibleSignCharacters} / 3 个字。`;
    } else {
      nameHint.textContent =
        "街坊的一句打趣，最终变成大家都记得的招牌。";
      announce("狗不理三个字已经完整显现");
    }
  }

  // ============================================================
  // 9. 第五幕：名声传播
  // ============================================================
  function revealNextFameStep() {
    state.fameStep = Math.min(storyData.fame.length - 1, state.fameStep + 1);
    fameSteps.forEach((step, index) => {
      step.classList.toggle("is-visible", index <= state.fameStep);
    });
    const current = storyData.fame[state.fameStep];
    fameSign.querySelector("small").textContent =
      state.fameStep === storyData.fame.length - 1
        ? "名声已传开 · 可以留下读后笺"
        : `继续点击 · ${state.fameStep + 1} / ${storyData.fame.length}`;
    announce(current.title);
  }

  // ============================================================
  // 10. 原文阅读、声音和读后笺
  // ============================================================
  function buildOriginalContent() {
    storyData.originalItems.forEach((item) => {
      const entry = document.createElement("article");
      entry.className = "original-entry";
      const quote = document.createElement("blockquote");
      quote.textContent = item.text;
      const cite = document.createElement("cite");
      cite.textContent = item.source;
      entry.append(quote, cite);
      originalContent.append(entry);
    });

    const pending = document.createElement("p");
    pending.className = "original-pending";
    pending.textContent =
      "其余关键情节的完整原文尚未录入。请将获得授权并核对过出版版本的段落加入 script.js 的 originalItems 数组，不要用简介或改写文字代替原文。";
    originalContent.append(pending);
  }

  function openOriginal() {
    focusBeforeOriginal = document.activeElement;
    originalModal.hidden = false;
    document.body.classList.add("modal-open");
    originalDialog.focus();
  }

  function closeOriginal() {
    if (originalModal.hidden) return;
    originalModal.hidden = true;
    document.body.classList.remove("modal-open");
    if (focusBeforeOriginal instanceof HTMLElement) {
      focusBeforeOriginal.focus();
    }
  }

  function createStreetSound() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    ambientContext = new AudioContextClass();
    const seconds = 2;
    const buffer = ambientContext.createBuffer(
      1,
      ambientContext.sampleRate * seconds,
      ambientContext.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.978 + white * 0.022;
      data[index] = last * 0.58;
    }

    ambientSource = ambientContext.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;
    const filter = ambientContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 580;
    filter.Q.value = 0.5;
    ambientGain = ambientContext.createGain();
    ambientGain.gain.value = 0.032;
    ambientSource
      .connect(filter)
      .connect(ambientGain)
      .connect(ambientContext.destination);
    ambientSource.start();
    return true;
  }

  async function setSoundEnabled(enabled) {
    if (enabled && !ambientContext && !createStreetSound()) {
      soundButton.textContent = "街声：不可用";
      soundButton.disabled = true;
      return;
    }

    if (enabled) {
      await ambientContext.resume();
    } else if (ambientContext) {
      await ambientContext.suspend();
    }

    state.soundEnabled = enabled;
    soundButton.setAttribute("aria-pressed", String(enabled));
    soundButton.textContent = enabled ? "街声：开" : "街声：关";
    announce(enabled ? "街市环境声已开启" : "街市环境声已关闭");
  }

  function buildReflectionChips() {
    storyData.reflectionKeywords.forEach((keyword) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = keyword;
      button.setAttribute("aria-pressed", "false");
      reflectionChips.append(button);
    });
  }

  function loadReflection() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(reflectionStorageKey) || "null",
      );
      if (!saved || typeof saved !== "object") return;
      reflectionText.value =
        typeof saved.text === "string" ? saved.text : "";
      const selected = new Set(
        Array.isArray(saved.keywords) ? saved.keywords : [],
      );
      reflectionChips
        .querySelectorAll("button")
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(selected.has(button.textContent)),
          );
        });
      if (saved.savedAt) {
        reflectionStatus.textContent = `已载入上次保存的读后笺 · ${saved.savedAt}`;
      }
    } catch (error) {
      reflectionStatus.textContent = "当前浏览器未能载入本地读后笺。";
    }
  }

  function saveReflectionToBrowser() {
    const keywords = [
      ...reflectionChips.querySelectorAll('button[aria-pressed="true"]'),
    ].map((button) => button.textContent);
    const savedAt = new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    try {
      localStorage.setItem(
        reflectionStorageKey,
        JSON.stringify({
          keywords,
          text: reflectionText.value.trim(),
          savedAt,
        }),
      );
      reflectionStatus.textContent = `已保存在当前浏览器 · ${savedAt}`;
      announce("读后笺保存成功");
    } catch (error) {
      reflectionStatus.textContent =
        "保存失败：当前浏览器不允许本地存储，请先复制文字。";
    }
  }

  // ============================================================
  // 11. 重置体验
  // ============================================================
  function resetExperience() {
    state.streetVisited.clear();
    state.mixedIngredients.clear();
    state.wrapPresses = 0;
    state.pleatsDone.clear();
    state.steamOpened = false;
    state.busyCompleted.clear();
    state.gossipRead.clear();
    state.visibleSignCharacters = 0;
    state.fameStep = -1;

    document.querySelectorAll("[data-street]").forEach((button) => {
      button.classList.remove("is-visited");
    });
    streetVisitCount.textContent = "0 / 4";
    streetPanelKicker.textContent = "巷口提示";
    streetPanelTitle.textContent = "蒸汽后面，是一位忙碌的手艺人";
    streetPanelCopy.textContent =
      "点击蒸笼、铺面招牌、狗子和桌边顾客，看看街坊怎样认识这家包子铺。";
    mixButtons.forEach((button) => button.classList.remove("is-added"));
    craftStage.classList.remove("is-mixed");
    wrapDough.removeAttribute("data-press");
    pleatRing
      .querySelectorAll(".pleat-button")
      .forEach((button) => button.classList.remove("is-done"));
    steamerStack.classList.remove("is-open");
    busyObjects.forEach((button) => button.classList.remove("is-complete"));
    gossipCards.forEach((button) => button.setAttribute("aria-pressed", "false"));
    signCharacters.forEach((character) => {
      character.classList.remove("is-visible");
    });
    fameSteps.forEach((step) => step.classList.remove("is-visible"));
    fameSign.querySelector("small").textContent =
      "点击招牌 · 让名声传开";

    Object.entries(busyMeters).forEach(([key, meter]) => {
      const label = {
        bowl: "取包子",
        coin: "投钱",
        dog: "忙碌",
      }[key];
      meter.textContent = `${label} · 未完成`;
      meter.classList.remove("is-complete");
    });
    streetSaying.hidden = true;

    setCraftStep("mix", false);
    pleatCounter.textContent = "按顺序点击每一道褶：0 / 18";
    wrapHint.textContent =
      "点击面皮中央，依次放入馅料、收边、压实。";
    steamHint.textContent = "点击笼盖，看看刚出笼的包子。";
    showScene("street");
    announce("已重新开始《狗不理》");
  }

  // ============================================================
  // 12. 绑定事件
  // ============================================================
  buildPleats();
  buildOriginalContent();
  buildReflectionChips();
  loadReflection();
  setCraftStep("mix", false);

  sceneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showScene(button.dataset.sceneGo);
    });
  });

  document.querySelectorAll("[data-street]").forEach((button) => {
    button.addEventListener("click", () => {
      renderStreetSpot(button.dataset.street);
    });
  });

  craftTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setCraftStep(button.dataset.craftStep);
    });
  });

  mixButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mixedIngredients.add(button.dataset.mix);
      button.classList.add("is-added");
      updateCraftCopy();
      completeMixIfReady();
    });
  });

  wrapDough.addEventListener("click", () => {
    if (state.wrapPresses >= 3) return;
    state.wrapPresses += 1;
    renderWrapPress();
  });

  pleatRing.addEventListener("click", (event) => {
    const button = event.target.closest(".pleat-button");
    if (!button || button.classList.contains("is-done")) return;
    button.classList.add("is-done");
    state.pleatsDone.add(Number(button.dataset.pleatIndex));
    pleatCounter.textContent =
      `按顺序点击每一道褶：${state.pleatsDone.size} / 18`;
    updateCraftCopy();

    if (state.pleatsDone.size === 18) {
      pleatCounter.textContent = "十八褶完成，像一朵花一样展开";
      announce("十八褶完成，可以揭笼");
      window.setTimeout(() => setCraftStep("steam"), 300);
    }
  });

  steamerLid.addEventListener("click", () => {
    if (state.steamOpened) return;
    state.steamOpened = true;
    steamerStack.classList.add("is-open");
    steamHint.textContent = "热气散开，刚出笼的包子已经成形。";
    updateCraftCopy();
    announce("蒸笼已经揭开，包子出笼");
  });

  busyObjects.forEach((button) => {
    button.addEventListener("click", () => {
      renderBusyObject(button.dataset.busy);
    });
  });

  gossipCards.forEach((button) => {
    button.addEventListener("click", () => {
      renderGossip(button.dataset.gossip);
    });
  });

  shopNameSign.addEventListener("click", revealNextSignCharacter);
  fameSign.addEventListener("click", revealNextFameStep);

  [originalButton, skipButton, ...document.querySelectorAll("[data-open-original]")]
    .filter(Boolean)
    .forEach((button) => button.addEventListener("click", openOriginal));

  originalModal
    .querySelectorAll("[data-close-original]")
    .forEach((button) => button.addEventListener("click", closeOriginal));

  reflectionChips.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    button.setAttribute(
      "aria-pressed",
      String(button.getAttribute("aria-pressed") !== "true"),
    );
  });

  saveReflection.addEventListener("click", saveReflectionToBrowser);
  restartStory.addEventListener("click", resetExperience);
  soundButton.addEventListener("click", () => {
    setSoundEnabled(!state.soundEnabled);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !originalModal.hidden) {
      closeOriginal();
      return;
    }

    if (event.key === "Tab" && !originalModal.hidden) {
      const focusable = [
        ...originalModal.querySelectorAll("button:not([disabled])"),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("popstate", () => {
    const route = location.hash.replace(/^#/, "");
    showScene(sceneOrder.includes(route) ? route : "street", false);
  });

  const initialScene = location.hash.replace(/^#/, "");
  showScene(
    sceneOrder.includes(initialScene) ? initialScene : "street",
    false,
  );
})();
