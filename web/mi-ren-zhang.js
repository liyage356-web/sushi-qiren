(() => {
  const story = window.MI_REN_ZHANG_STORY;
  if (!story) return;

  const sceneOrder = story.scenes.map((scene) => scene.id);
  const scenePanels = [...document.querySelectorAll("[data-scene]")];
  const sceneButtons = [...document.querySelectorAll("[data-scene-go]")];
  const chapterButtons = [...document.querySelectorAll(".chapter-nav button")];
  const progressFill = document.querySelector("#progressFill");
  const storyMain = document.querySelector("#storyMain");
  const liveStatus = document.querySelector("#liveStatus");

  const observationPanel = document.querySelector("#observationPanel");
  const observationTone = document.querySelector("#observationTone");
  const observationTitle = document.querySelector("#observationTitle");
  const observationCopy = document.querySelector("#observationCopy");

  const comparisonCards = [...document.querySelectorAll("[data-compare]")];
  const comparePose = document.querySelector("#comparePose");
  const compareTitle = document.querySelector("#compareTitle");
  const compareCopy = document.querySelector("#compareCopy");
  const compareFocus = document.querySelector("#compareFocus");

  const craftWorkbench = document.querySelector(".craft-workbench");
  const craftStepButtons = [
    ...document.querySelectorAll("[data-craft-step]"),
  ];
  const craftStepNumber = document.querySelector("#craftStepNumber");
  const craftStepTitle = document.querySelector("#craftStepTitle");
  const craftStepNote = document.querySelector("#craftStepNote");
  const clayLump = document.querySelector("#clayLump");
  const clayFeatures = [...document.querySelectorAll("[data-feature]")];
  const craftNextButton = document.querySelector("#craftNextButton");
  const craftResetButton = document.querySelector("[data-craft-reset]");

  const revealSpots = [...document.querySelectorAll("[data-reveal]")];
  const revealDetailLabel = document.querySelector("#revealDetailLabel");
  const revealDetailTitle = document.querySelector("#revealDetailTitle");
  const revealDetailCopy = document.querySelector("#revealDetailCopy");
  const reactionButton = document.querySelector("#reactionButton");
  const reactionCopy = document.querySelector("#reactionCopy");

  const marketViewport = document.querySelector("#marketViewport");
  const marketStalls = [...document.querySelectorAll("[data-stall]")];
  const marketArrows = [...document.querySelectorAll("[data-market-direction]")];
  const marketStallLabel = document.querySelector("#marketStallLabel");
  const marketStallTitle = document.querySelector("#marketStallTitle");
  const marketStallCopy = document.querySelector("#marketStallCopy");

  const originalButtons = [
    document.querySelector("#originalButton"),
    ...document.querySelectorAll("[data-open-original]"),
  ];
  const originalModal = document.querySelector("#originalModal");
  const originalDialog = originalModal.querySelector(".original-dialog");
  const originalList = document.querySelector("#originalList");
  const soundButton = document.querySelector("#soundButton");

  const reflectionChips = document.querySelector("#reflectionChips");
  const reflectionText = document.querySelector("#reflectionText");
  const reflectionSave = document.querySelector("#reflectionSave");
  const reflectionStatus = document.querySelector("#reflectionStatus");
  const restartStory = document.querySelector("#restartStory");

  const reflectionStorageKey = "sushi-qiren-ni-ren-zhang-reflection-v1";
  let currentScene = "restaurant";
  let craftStep = 1;
  let focusBeforeOriginal = null;
  let rainAudioContext = null;
  let rainSource = null;
  let rainGain = null;
  let soundEnabled = false;

  function announce(message) {
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function renderSceneCopy() {
    story.scenes.forEach((scene) => {
      const eyebrow = document.querySelector(`#${scene.id}Eyebrow`);
      const lead = document.querySelector(`#${scene.id}Lead`);
      if (eyebrow) eyebrow.textContent = scene.eyebrow;
      if (lead) lead.textContent = scene.lead;
    });
    document.querySelector("#endingQuote").textContent = story.ending.quote;
    document.querySelector("#endingSummary").textContent =
      story.ending.summary;
  }

  function showScene(sceneId, pushHistory = true) {
    if (!sceneOrder.includes(sceneId)) return;
    currentScene = sceneId;

    scenePanels.forEach((panel) => {
      const isCurrent = panel.dataset.scene === sceneId;
      panel.hidden = !isCurrent;
      panel.classList.toggle("is-active", isCurrent);
    });

    chapterButtons.forEach((button) => {
      if (button.dataset.sceneGo === sceneId) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const sceneIndex = sceneOrder.indexOf(sceneId);
    progressFill.style.width =
      `${((sceneIndex + 1) / sceneOrder.length) * 100}%`;

    if (pushHistory) {
      history.pushState({ scene: sceneId }, "", `#${sceneId}`);
    }

    window.scrollTo({ top: 0, behavior: pushHistory ? "smooth" : "auto" });
    const panel = document.querySelector(`[data-scene="${sceneId}"]`);
    const heading = panel.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }

  function renderObservation(key) {
    const observation = story.observations[key];
    if (!observation) return;
    observationTone.textContent = `观察 · ${observation.kicker}`;
    observationTitle.textContent = observation.title;
    observationCopy.textContent = observation.copy;
    observationPanel.dataset.tone = observation.tone;
    announce(`${observation.kicker}：${observation.title}`);
  }

  function renderComparison(key) {
    const comparison = story.comparisons[key];
    if (!comparison) return;
    comparisonCards.forEach((card) => {
      const selected = card.dataset.compare === key;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
    comparePose.textContent = `姿态 · ${comparison.pose}`;
    compareTitle.textContent = comparison.label;
    compareCopy.textContent = comparison.copy;
    compareFocus.textContent = `观察重点 · ${comparison.focus}`;
    announce(`正在观察${comparison.label}`);
  }

  function updateCraftInstruction(stepNumber) {
    const step = story.craft.steps[stepNumber - 1];
    const labels = ["第一步", "第二步", "第三步"];
    craftStepNumber.textContent = `${labels[stepNumber - 1]} · ${step.title}`;
    craftStepTitle.textContent = step.action;
    craftStepNote.textContent = step.note;
  }

  function setCraftStep(stepNumber, announceChange = false) {
    craftStep = Math.max(1, Math.min(3, stepNumber));
    craftWorkbench.dataset.step = String(craftStep);
    craftStepButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.craftStep) === craftStep),
      );
    });
    updateCraftInstruction(craftStep);
    craftNextButton.disabled = craftStep !== 3;
    if (announceChange) {
      announce(`已进入${story.craft.steps[craftStep - 1].title}阶段`);
    }
  }

  function resetCraft() {
    clayLump.classList.remove("is-round");
    clayFeatures.forEach((button) => button.classList.remove("is-set"));
    clayLump.querySelector("span").textContent = "点击揉泥";
    setCraftStep(1);
    announce("泥团已恢复，可以重新开始");
  }

  function completeCraftIfReady() {
    const allSet = clayFeatures.every((button) =>
      button.classList.contains("is-set"),
    );
    if (!allSet) return;
    window.setTimeout(() => {
      setCraftStep(3, true);
      announce("泥像完成，可以进入亮相环节");
    }, 260);
  }

  function renderReveal(key) {
    const detail = story.reveal.details[key];
    if (!detail) return;
    revealDetailLabel.textContent = `泥像细节 · ${detail.label}`;
    revealDetailTitle.textContent = detail.title;
    revealDetailCopy.textContent = detail.copy;
    revealSpots.forEach((spot) => {
      spot.classList.toggle("is-active", spot.dataset.reveal === key);
    });
    announce(`${detail.label}：${detail.title}`);
  }

  function renderMarketStall(index) {
    const stall = story.market.stalls[index];
    if (!stall) return;
    marketStallLabel.textContent = `摊位 · ${stall.label}`;
    marketStallTitle.textContent = stall.title;
    marketStallCopy.textContent = stall.copy;
    marketStalls.forEach((card) => {
      const selected = Number(card.dataset.stall) === index;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
    marketStallLabel.classList.toggle(
      "ticket-found",
      Number(index) === story.market.stalls.length - 1,
    );
    announce(`${stall.label}：${stall.title}`);
  }

  function buildOriginalList() {
    story.originalExcerpts.forEach((excerpt) => {
      const entry = document.createElement("article");
      entry.className = "original-entry";
      const quote = document.createElement("blockquote");
      quote.textContent = excerpt.text;
      const source = document.createElement("cite");
      source.textContent = excerpt.source;
      entry.append(quote, source);
      originalList.append(entry);
    });
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

  function buildReflectionChips() {
    story.reflectionKeywords.forEach((keyword) => {
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
        window.localStorage.getItem(reflectionStorageKey) || "null",
      );
      if (!saved || typeof saved !== "object") return;
      reflectionText.value =
        typeof saved.text === "string" ? saved.text : "";
      const keywords = new Set(
        Array.isArray(saved.keywords) ? saved.keywords : [],
      );
      reflectionChips
        .querySelectorAll("button")
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(keywords.has(button.textContent)),
          );
        });
      if (saved.savedAt) {
        reflectionStatus.textContent = `已载入上次保存的读后笺 · ${saved.savedAt}`;
      }
    } catch (error) {
      reflectionStatus.textContent = "当前浏览器未能载入本地读后笺。";
    }
  }

  function saveReflection() {
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
      window.localStorage.setItem(
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

  function createRainSound() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    rainAudioContext = new AudioContextClass();
    const bufferSize = rainAudioContext.sampleRate * 2;
    const buffer = rainAudioContext.createBuffer(
      1,
      bufferSize,
      rainAudioContext.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < bufferSize; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.982 + white * 0.018;
      samples[index] = previous * 0.68;
    }

    rainSource = rainAudioContext.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;

    const filter = rainAudioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.42;

    rainGain = rainAudioContext.createGain();
    rainGain.gain.value = 0.035;
    rainSource
      .connect(filter)
      .connect(rainGain)
      .connect(rainAudioContext.destination);
    rainSource.start();
    return true;
  }

  async function setSoundEnabled(enabled) {
    if (enabled && !rainAudioContext && !createRainSound()) {
      soundButton.textContent = "雨声：不可用";
      soundButton.disabled = true;
      return;
    }

    if (enabled) {
      await rainAudioContext.resume();
    } else if (rainAudioContext) {
      await rainAudioContext.suspend();
    }

    soundEnabled = enabled;
    soundButton.setAttribute("aria-pressed", String(enabled));
    soundButton.textContent = enabled ? "雨声：开" : "雨声：关";
    announce(enabled ? "雨声已开启" : "雨声已关闭");
  }

  function resetExperience() {
    resetCraft();
    reactionCopy.hidden = true;
    reactionCopy.textContent = "";
    showScene("restaurant");
    announce("已重新开始《泥人张》");
  }

  renderSceneCopy();
  buildOriginalList();
  buildReflectionChips();
  loadReflection();
  setCraftStep(1);
  renderComparison("mudman");
  renderMarketStall(0);

  document.addEventListener("click", (event) => {
    const sceneButton = event.target.closest("[data-scene-go]");
    if (sceneButton) {
      showScene(sceneButton.dataset.sceneGo);
      return;
    }

    const observation = event.target.closest("[data-observation]");
    if (observation) {
      renderObservation(observation.dataset.observation);
      return;
    }

    const comparison = event.target.closest("[data-compare]");
    if (comparison) {
      renderComparison(comparison.dataset.compare);
      return;
    }

    const craftButton = event.target.closest("[data-craft-step]");
    if (craftButton) {
      setCraftStep(Number(craftButton.dataset.craftStep), true);
      return;
    }

    const revealSpot = event.target.closest("[data-reveal]");
    if (revealSpot) {
      renderReveal(revealSpot.dataset.reveal);
      return;
    }

    const stall = event.target.closest("[data-stall]");
    if (stall) {
      renderMarketStall(Number(stall.dataset.stall));
      return;
    }

    const marketArrow = event.target.closest("[data-market-direction]");
    if (marketArrow) {
      const direction = Number(marketArrow.dataset.marketDirection);
      marketViewport.scrollBy({
        left: direction * marketViewport.clientWidth * 0.82,
        behavior: "smooth",
      });
    }
  });

  clayLump.addEventListener("click", () => {
    if (craftStep !== 1) return;
    clayLump.classList.add("is-round");
    clayLump.querySelector("span").textContent = "泥团已揉圆";
    announce("泥团已经揉圆，进入塑形阶段");
    window.setTimeout(() => setCraftStep(2), 420);
  });

  clayFeatures.forEach((button) => {
    button.addEventListener("click", () => {
      if (craftStep !== 2) setCraftStep(2);
      button.classList.add("is-set");
      const feature = button.closest("[data-feature]")?.dataset.feature;
      if (feature) announce(story.craft.features[feature]);
      completeCraftIfReady();
    });
  });

  craftResetButton.addEventListener("click", resetCraft);
  reactionButton.addEventListener("click", () => {
    reactionCopy.hidden = false;
    reactionCopy.textContent = story.reveal.reaction;
    announce("众人的反应已经显现");
  });

  originalButtons.filter(Boolean).forEach((button) => {
    button.addEventListener("click", openOriginal);
  });

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

  reflectionSave.addEventListener("click", saveReflection);
  restartStory.addEventListener("click", resetExperience);
  soundButton.addEventListener("click", () => {
    setSoundEnabled(!soundEnabled);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !originalModal.hidden) {
      closeOriginal();
      return;
    }

    if (event.key === "Tab" && !originalModal.hidden) {
      const focusable = originalModal.querySelectorAll(
        "button:not([disabled])",
      );
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
    const route = window.location.hash.replace(/^#/, "");
    showScene(sceneOrder.includes(route) ? route : "restaurant", false);
  });

  const initialScene = window.location.hash.replace(/^#/, "");
  showScene(
    sceneOrder.includes(initialScene) ? initialScene : "restaurant",
    false,
  );

  window.setTimeout(() => {
    if (!storyMain.hidden) {
      announce("《泥人张》交互体验已载入");
    }
  }, 700);
})();
