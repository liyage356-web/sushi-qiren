(() => {
  "use strict";

  // 七个页面共用一个阅读状态机；互动只提供观察角度，不阻止读者直接读原文。
  const pageOrder = [
    "street",
    "shop",
    "craft",
    "market",
    "name",
    "fame",
    "reflection",
  ];

  const experience = document.querySelector("#dogBuLiExperience");
  const dogPages = document.querySelector("#dogPages");
  const pages = [...document.querySelectorAll("[data-dog-page-panel]")];
  const stepNav = document.querySelector(".dog-step-nav");
  const navButtons = [...document.querySelectorAll("[data-dog-page]")];
  const nextButtons = [...document.querySelectorAll("[data-dog-next]")];
  const pageTargetButtons = [
    ...document.querySelectorAll("[data-dog-page-target]"),
  ];
  const originalButtons = [
    ...document.querySelectorAll("[data-dog-original]"),
  ];
  const backButton = document.querySelector("#dogBuLiBackButton");
  const skipButton = document.querySelector("#dogSkipButton");
  const originalButton = document.querySelector("#dogOriginalButton");
  const restartButton = document.querySelector("#dogRestartButton");
  const reflectionRestart = document.querySelector("#dogReflectionRestart");
  const audioToggle = document.querySelector("#dogAudioToggle");
  const experienceTitle = document.querySelector("#dogBuLiExperienceTitle");
  const liveStatus = document.querySelector("#dogLiveStatus");
  const openingPage = document.querySelector("#dogPageStreet");
  const openingText = document.querySelector("#dogOpeningText");
  const openingProgress = document.querySelector("#dogOpeningProgress");
  const openingProgressFill = openingProgress.querySelector("span");
  const openingProgressLabel = document.querySelector(
    "#dogOpeningProgressLabel",
  );
  const openingReadState = document.querySelector("#dogOpeningReadState");
  const streetNarrative = document.querySelector("#dogOpeningSpread");
  const streetTransition = document.querySelector("#dogStreetTransition");
  const shopPage = document.querySelector("#dogPageShop");
  const shopIntro = document.querySelector("#dogShopIntro");
  const shopMain = document.querySelector("#dogShopMain");
  const shopTransition = document.querySelector("#dogShopTransition");
  const shopIntroText = document.querySelector("#dogShopIntroText");
  const shopIntroProgress = document.querySelector(
    "#dogShopIntroProgress",
  );
  const shopIntroProgressLabel = document.querySelector(
    "#dogShopIntroProgressLabel",
  );
  const shopIntroReadState = document.querySelector(
    "#dogShopIntroReadState",
  );
  const originalModal = document.querySelector("#dogOriginalModal");
  const originalSheet = originalModal.querySelector(".dog-original-sheet");
  const originalStage = document.querySelector("#dogOriginalStage");
  const originalTitle = document.querySelector("#dogOriginalTitle");
  const originalIntro = document.querySelector("#dogOriginalIntro");
  const originalText = document.querySelector("#dogOriginalText");
  const originalNote = document.querySelector("#dogOriginalNote");
  const originalSource =
    window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["gou-bu-li"];
  const originalReturnButton = document.querySelector(
    "#dogOriginalReturnButton",
  );
  const originalCloseButtons = [
    ...document.querySelectorAll("[data-dog-original-close]"),
  ];
  const marketStage = document.querySelector(".dog-market-stage");
  const marketItems = [
    ...document.querySelectorAll("[data-dog-market-item]"),
  ];
  const marketHint = document.querySelector("#dogMarketHint");
  const marketProgress = document.querySelector("#dogMarketProgress");
  const nameSign = document.querySelector("#dogNameSign");
  const nameSignChars = [
    ...document.querySelectorAll("[data-dog-sign-char]"),
  ];
  const talkCards = [
    ...document.querySelectorAll("[data-dog-talk]"),
  ];
  const nameHint = document.querySelector("#dogNameHint");
  const fameStops = [
    ...document.querySelectorAll("[data-dog-fame-stop]"),
  ];
  const fameEyebrow = document.querySelector("#dogFameEyebrow");
  const fameQuote = document.querySelector("#dogFameQuote");
  const fameContext = document.querySelector("#dogFameContext");
  const fameAdvance = document.querySelector("#dogFameAdvance");
  const fameProgress = document.querySelector("#dogFameProgress");
  const reflectionPrompts = document.querySelector(
    "#dogReflectionPrompts",
  );
  const reflectionText = document.querySelector("#dogReflectionText");
  const reflectionStatus = document.querySelector(
    "#dogReflectionStatus",
  );
  const reflectionSave = document.querySelector("#dogReflectionSave");
  const narrativeStage = document.querySelector("#dogNarrativeStage");
  const narrativeLayers = [
    ...document.querySelectorAll("[data-dog-narrative-layer]"),
  ];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const CRAFT_STAGE_LABELS = Object.freeze({
    mixing: "调馅",
    wrapping: "包制",
    pleating: "十八褶",
    steaming: "揭笼",
  });
  const READING_SESSION_KEY = "gou-bu-li-reading-position-v1";
  const UNLOCK_SESSION_KEY = "gou-bu-li-story-unlocked-v1";
  const REFLECTION_STORAGE_KEY =
    "sushi-qiren-gou-bu-li-reflection-v1";

  let currentPage = "street";
  let lastFocusBeforeOriginal = null;
  let originalReturnLabel = "返回故事";
  let openingAdvanceTimer = null;
  let openingComplete = false;
  let openingStarted = false;
  let shopIntroAdvanceTimer = null;
  let shopIntroReadingComplete = false;
  let shopIntroStarted = false;
  let shopIntroComplete = false;
  const visitedMarketItems = new Set();
  const visitedTalkCards = new Set();
  let nameSignIndex = 0;
  let fameStage = 0;
  let audioContext = null;
  let audioGain = null;
  let audioEnabled = false;
  let narrativeMode = false;
  let narrativeFrame = null;
  let narrativeActiveScene = "street";
  let narrativeActivePage = "street";
  let narrativePreloadedScene = null;

  const SCENE_LAYOUTS = window.GOU_BU_LI_SCENE_LAYOUTS || {};
  const NARRATIVE_SCENE_PAGES = Object.freeze({
    street: "street",
    shopIntro: "shop",
    shopMain: "shop",
  });

  function announce(message) {
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function narrativeLayout(sceneKey) {
    return SCENE_LAYOUTS[sceneKey] || SCENE_LAYOUTS.street;
  }

  function applyNarrativeLayer(index, sceneKey, opacity) {
    const layer = narrativeLayers[index];
    const layout = narrativeLayout(sceneKey);
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const image = layer.querySelector("img");
    const wash = layer.querySelector(".dog-narrative-wash");
    const position = mobile
      ? layout.mobile?.backgroundPosition || layout.backgroundPosition
      : layout.backgroundPosition;
    const sceneWash = mobile
      ? layout.mobile?.sceneWash || layout.sceneWash
      : layout.sceneWash;

    if (image.dataset.sceneKey !== sceneKey) {
      image.src = layout.backgroundImage;
      image.dataset.sceneKey = sceneKey;
    }
    layer.style.setProperty("--dog-narrative-position", position);
    wash.style.setProperty(
      "--dog-narrative-wash",
      sceneWash || "transparent",
    );
    layer.style.opacity = String(opacity);
  }

  function preloadNarrativeScene(sceneKey) {
    if (!sceneKey || narrativePreloadedScene === sceneKey) return;
    const layout = narrativeLayout(sceneKey);
    if (!layout?.backgroundImage) return;
    const image = new Image();
    image.decoding = "async";
    image.src = layout.backgroundImage;
    narrativePreloadedScene = sceneKey;
  }

  function transitionProgress(element) {
    const viewportHeight = dogPages.getBoundingClientRect().height;
    const rect = element.getBoundingClientRect();
    return clamp((viewportHeight - rect.top) / viewportHeight);
  }

  function updateNarrativeNavigation(pageName) {
    const changed =
      narrativeActivePage !== pageName || currentPage !== pageName;
    const enteredNewChapter = currentPage !== pageName;
    narrativeActivePage = pageName;
    currentPage = pageName;
    if (pageName === "shop") {
      shopPage.setAttribute(
        "aria-labelledby",
        narrativeActiveScene === "shopMain"
          ? "dogShopTitle"
          : "dogShopIntroTitle",
      );
    }
    let activeNavButton = null;
    navButtons.forEach((button) => {
      if (button.dataset.dogPage === pageName) {
        button.setAttribute("aria-current", "page");
        activeNavButton = button;
      } else {
        button.removeAttribute("aria-current");
      }
    });
    if (
      changed &&
      activeNavButton &&
      stepNav.scrollWidth > stepNav.clientWidth
    ) {
      window.requestAnimationFrame(() => {
        const left =
          activeNavButton.offsetLeft -
          (stepNav.clientWidth - activeNavButton.offsetWidth) / 2;
        stepNav.scrollTo({
          left: Math.max(0, left),
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
      });
    }
    if (changed) {
      if (enteredNewChapter && narrativeMode) {
        announce(
          pageName === "street"
            ? "已回到巷口"
            : narrativeActiveScene === "shopMain"
              ? "已进入包子铺"
              : "已进入运河边的包子摊",
        );
      }
      if (window.location.hash.startsWith("#gou-bu-li/")) {
        history.replaceState(
          { view: "dog-bu-li", page: pageName },
          "",
          `#gou-bu-li/${pageName}`,
        );
      }
      saveReadingPosition(pageName);
    }
  }

  function textProgress(body, root) {
    const viewport = dogPages.getBoundingClientRect();
    const rect = body.getBoundingClientRect();
    const globalTop = rect.top - viewport.top + dogPages.scrollTop;
    const rootRect = root?.getBoundingClientRect();
    const start = Math.max(
      0,
      rootRect
        ? rootRect.top - viewport.top + dogPages.scrollTop
        : globalTop - viewport.height * 0.78,
    );
    const end = Math.max(start + 1, globalTop + rect.height - viewport.height);
    const progress = clamp((dogPages.scrollTop - start) / (end - start));
    return {
      progress,
      started: dogPages.scrollTop > start + 4,
      complete: dogPages.scrollTop >= end - 2,
    };
  }

  function revealSceneText(root, article) {
    if (!root || !article) return;
    const viewportHeight = dogPages.getBoundingClientRect().height;
    const rect = root.getBoundingClientRect();
    const reveal = reduceMotion.matches
      ? 1
      : clamp((viewportHeight - rect.top) / (viewportHeight * 0.42));
    article.style.opacity = String(reveal);
  }

  function updateNarrativeScroller() {
    narrativeFrame = null;
    if (!narrativeMode || experience.hidden) return;

    const streetProgress = textProgress(openingText, streetNarrative);
    const shopProgress = textProgress(shopIntroText, shopIntro);
    setOpeningProgress(streetProgress.progress);
    setShopIntroProgress(shopProgress.progress);

    if (streetProgress.started) openingStarted = true;
    if (shopProgress.started) shopIntroStarted = true;

    if (streetProgress.complete && !openingComplete) {
      openingComplete = true;
      openingPage.classList.add("is-complete");
      openingReadState.textContent =
        "本段已读完，继续向下前往运河边的包子摊";
    } else if (!streetProgress.complete) {
      openingReadState.textContent = openingStarted
        ? "继续向下滚动，读完本段后进入包子铺"
        : "向下滚动，读完这段文字";
    }

    if (shopProgress.complete && !shopIntroReadingComplete) {
      shopIntroReadingComplete = true;
      shopIntro.classList.add("is-complete");
      shopIntroReadState.textContent =
        "本段已读完，继续向下进入正式铺面";
    } else if (!shopProgress.complete) {
      shopIntroReadState.textContent = shopIntroStarted
        ? "继续向下滚动，读完本段后进入正式铺面"
        : "向下滚动，读完这段文字";
    }

    let from = "street";
    let to = "shopIntro";
    let blend = 0;
    let activeScene = "street";
    const first = reduceMotion.matches
      ? transitionProgress(streetTransition) >= 0.5
        ? 1
        : 0
      : transitionProgress(streetTransition);
    const second = reduceMotion.matches
      ? transitionProgress(shopTransition) >= 0.5
        ? 1
        : 0
      : transitionProgress(shopTransition);

    if (first > 0 && first < 1) {
      blend = first;
      activeScene = first >= 0.5 ? "shopIntro" : "street";
    } else if (second > 0 && second < 1) {
      from = "shopIntro";
      to = "shopMain";
      blend = second;
      activeScene = second >= 0.5 ? "shopMain" : "shopIntro";
    } else if (second >= 1) {
      from = "shopMain";
      to = null;
      activeScene = "shopMain";
    } else if (first >= 1) {
      from = "shopIntro";
      to = null;
      activeScene = "shopIntro";
    }

    applyNarrativeLayer(0, from, to ? 1 - blend : 1);
    if (to) {
      applyNarrativeLayer(1, to, blend);
      preloadNarrativeScene(to);
    } else {
      narrativeLayers[1].style.opacity = "0";
    }

    revealSceneText(streetNarrative, streetNarrative.querySelector("article"));
    revealSceneText(shopIntro, shopIntro.querySelector("article"));
    revealSceneText(shopMain, shopMain.querySelector("article"));

    narrativeActiveScene = activeScene;
    updateNarrativeNavigation(NARRATIVE_SCENE_PAGES[activeScene]);
    if (activeScene === "street") {
      preloadNarrativeScene("shopIntro");
    } else if (activeScene === "shopIntro") {
      preloadNarrativeScene("shopMain");
    }
  }

  function scheduleNarrativeUpdate() {
    if (!narrativeMode || narrativeFrame !== null) return;
    narrativeFrame = window.requestAnimationFrame(updateNarrativeScroller);
  }

  function prepareNarrativeContent() {
    shopIntro.hidden = false;
    shopMain.hidden = false;
    shopPage.dataset.dogShopStage = "intro";
    shopIntro.classList.remove("is-leaving");
    shopMain.classList.remove("is-scene-entering");
    applySceneLayout("street");
    applySceneLayout("shop");
  }

  function setNarrativeMode(enabled) {
    narrativeMode = enabled;
    dogPages.classList.toggle("is-narrative", enabled);
    narrativeStage.hidden = !enabled;
    if (!enabled) {
      if (narrativeFrame !== null) {
        window.cancelAnimationFrame(narrativeFrame);
        narrativeFrame = null;
      }
      dogPages.scrollTop = 0;
    }
  }

  function scrollToNarrativePage(pageName, behavior = "auto") {
    const target = pageName === "street" ? streetNarrative : shopIntro;
    const viewport = dogPages.getBoundingClientRect();
    const top =
      target.getBoundingClientRect().top -
      viewport.top +
      dogPages.scrollTop;
    dogPages.scrollTo({
      top,
      behavior:
        reduceMotion.matches && behavior === "smooth" ? "auto" : behavior,
    });
    scheduleNarrativeUpdate();
  }

  function cancelOpeningAdvance() {
    if (openingAdvanceTimer !== null) {
      window.clearTimeout(openingAdvanceTimer);
      openingAdvanceTimer = null;
    }
    openingPage.classList.remove("is-leaving");
  }

  function openingIsAtEnd() {
    const maxScroll = openingText.scrollHeight - openingText.clientHeight;
    return (
      maxScroll > 8 &&
      openingText.scrollTop >= maxScroll - 3
    );
  }

  function setOpeningProgress(value) {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    const label = `${percent}%`;
    openingProgress.style.setProperty(
      "--dog-opening-progress",
      `${percent}%`,
    );
    openingProgress.setAttribute("aria-valuenow", String(percent));
    openingProgressLabel.textContent = label;
  }

  function scheduleOpeningAdvance(announceCompletion = true) {
    if (openingAdvanceTimer !== null) {
      window.clearTimeout(openingAdvanceTimer);
    }
    openingComplete = true;
    openingPage.classList.add("is-complete");
    setOpeningProgress(1);
    if (announceCompletion) {
      openingReadState.textContent = "文字已读完，正在进入包子铺";
      announce("序章读完，进入狗不理包子铺");
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const readingPause = reducedMotion ? 180 : 900;
    const exitDuration = reducedMotion ? 20 : 780;
    openingAdvanceTimer = window.setTimeout(() => {
      openingAdvanceTimer = null;
      if (currentPage !== "street" || !originalModal.hidden) return;
      openingPage.classList.add("is-leaving");
      openingAdvanceTimer = window.setTimeout(() => {
        openingAdvanceTimer = null;
        if (currentPage !== "street" || !originalModal.hidden) return;
        showPage("shop", true, { enteredFromOpening: true });
      }, exitDuration);
    }, readingPause);
  }

  function updateOpeningProgress() {
    if (currentPage !== "street") return;
    const maxScroll = openingText.scrollHeight - openingText.clientHeight;
    if (maxScroll > 8 && openingText.scrollTop > 8) {
      openingStarted = true;
    }
    const progress =
      maxScroll <= 0
        ? 0
        : Math.max(0, Math.min(1, openingText.scrollTop / maxScroll));
    setOpeningProgress(progress);
    if (
      openingStarted &&
      !openingComplete &&
      openingIsAtEnd()
    ) {
      scheduleOpeningAdvance();
    }
  }

  function resetOpeningReader() {
    cancelOpeningAdvance();
    openingComplete = false;
    openingStarted = false;
    openingPage.classList.remove("is-complete", "is-leaving");
    openingText.scrollTop = 0;
    setOpeningProgress(0);
    openingReadState.textContent = "滚动至文末，自动进入下一幕";
    window.requestAnimationFrame(updateOpeningProgress);
  }

  function cancelShopIntroAdvance() {
    if (shopIntroAdvanceTimer !== null) {
      window.clearTimeout(shopIntroAdvanceTimer);
      shopIntroAdvanceTimer = null;
    }
    shopIntro.classList.remove("is-leaving");
  }

  function shopIntroIsAtEnd() {
    const maxScroll =
      shopIntroText.scrollHeight - shopIntroText.clientHeight;
    return (
      maxScroll > 8 &&
      shopIntroText.scrollTop >= maxScroll - 3
    );
  }

  function setShopIntroProgress(value) {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    shopIntroProgress.style.setProperty(
      "--dog-opening-progress",
      `${percent}%`,
    );
    shopIntroProgress.setAttribute("aria-valuenow", String(percent));
    shopIntroProgressLabel.textContent = `${percent}%`;
  }

  function showShopMain(animate = true) {
    if (currentPage !== "shop") return;
    cancelShopIntroAdvance();
    shopIntroComplete = true;
    shopIntroReadingComplete = true;
    shopIntro.hidden = true;
    shopMain.hidden = false;
    shopPage.dataset.dogShopStage = "main";
    applySceneLayout("shop");
    shopPage.setAttribute("aria-labelledby", "dogShopTitle");
    shopMain.classList.toggle("is-scene-entering", animate);
    shopPage.scrollTop = 0;
  }

  function scheduleShopIntroContinue(announceCompletion = true) {
    if (shopIntroAdvanceTimer !== null) {
      window.clearTimeout(shopIntroAdvanceTimer);
    }
    shopIntroReadingComplete = true;
    shopIntro.classList.add("is-complete");
    setShopIntroProgress(1);
    if (announceCompletion) {
      shopIntroReadState.textContent =
        "文字已读完，正在进入正式铺面";
      announce("入铺文字读完，进入狗子的包子铺");
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const readingPause = reducedMotion ? 180 : 850;
    const exitDuration = reducedMotion ? 20 : 720;
    shopIntroAdvanceTimer = window.setTimeout(() => {
      shopIntroAdvanceTimer = null;
      if (currentPage !== "shop" || !originalModal.hidden) return;
      shopIntro.classList.add("is-leaving");
      shopIntroAdvanceTimer = window.setTimeout(() => {
        shopIntroAdvanceTimer = null;
        if (currentPage !== "shop" || !originalModal.hidden) return;
        showShopMain();
      }, exitDuration);
    }, readingPause);
  }

  function updateShopIntroProgress() {
    if (
      currentPage !== "shop" ||
      shopIntro.hidden ||
      shopIntroComplete
    ) {
      return;
    }
    const maxScroll =
      shopIntroText.scrollHeight - shopIntroText.clientHeight;
    if (maxScroll > 8 && shopIntroText.scrollTop > 8) {
      shopIntroStarted = true;
    }
    const progress =
      maxScroll <= 0
        ? 0
        : Math.max(
            0,
            Math.min(1, shopIntroText.scrollTop / maxScroll),
          );
    setShopIntroProgress(progress);
    if (
      shopIntroStarted &&
      !shopIntroReadingComplete &&
      shopIntroIsAtEnd()
    ) {
      scheduleShopIntroContinue();
    }
  }

  function resetShopIntro() {
    cancelShopIntroAdvance();
    shopIntroReadingComplete = false;
    shopIntroStarted = false;
    shopIntroComplete = false;
    shopIntro.hidden = false;
    shopMain.hidden = true;
    shopPage.dataset.dogShopStage = "intro";
    applySceneLayout("shop");
    shopPage.setAttribute("aria-labelledby", "dogShopIntroTitle");
    shopIntro.classList.remove("is-complete", "is-leaving");
    shopMain.classList.remove("is-scene-entering");
    shopIntroText.scrollTop = 0;
    shopIntroReadState.textContent = "滚动至文末，进入正式铺面";
    setShopIntroProgress(0);
    window.requestAnimationFrame(updateShopIntroProgress);
  }

  const MARKET_HINTS = Object.freeze({
    bowl: "大海碗就是柜台：顾客自己伸手取包子，该付的钱先放在碗里。",
    coin: "钱箱接住碗里的钱。狗子不招呼、不寒暄，手上的活始终没有停。",
    busy: "你看见的不是冷淡，是顾不上。顾客把这份专注叫成了“不理人”。",
  });

  function updateMarketProgress() {
    marketProgress.textContent =
      `${visitedMarketItems.size} / ${marketItems.length}`;
    const complete =
      visitedMarketItems.size === marketItems.length;
    marketStage.classList.toggle("is-complete", complete);
    if (complete) {
      marketHint.textContent =
        "自己取、自己付、狗子只管手里的活。三样合在一起，“不理人”的闲话就有了来处。";
      unlockPage("name");
      announce("经营场景已看完，可以进入名字反转");
    }
  }

  function resetMarket() {
    visitedMarketItems.clear();
    marketItems.forEach((item) => {
      item.setAttribute("aria-pressed", "false");
    });
    marketStage.classList.remove("is-complete");
    marketHint.textContent =
      "依次点开海碗、钱箱和狗子，看清这套不声不响的买卖。";
    updateMarketProgress();
  }

  function inspectMarketItem(item) {
    const itemName = item.dataset.dogMarketItem;
    visitedMarketItems.add(itemName);
    item.setAttribute("aria-pressed", "true");
    marketHint.textContent = MARKET_HINTS[itemName];
    updateMarketProgress();
  }

  function updateNameTalkState() {
    const ready = visitedTalkCards.size === talkCards.length;
    nameSign.disabled = !ready || nameSignIndex >= nameSignChars.length;
    if (ready && nameSignIndex === 0) {
      nameHint.textContent =
        "三位街坊的话都听完了。现在点击空白招牌，让“狗不理”逐字落定。";
      nameSign.setAttribute(
        "aria-label",
        "把狗不理三个字写到招牌上。还要点三次",
      );
      announce("三位街坊已经说完，可以点击招牌写上名字");
    }
  }

  function resetNameInteraction() {
    visitedTalkCards.clear();
    nameSignIndex = 0;
    nameSign.disabled = true;
    nameSign.classList.remove("is-complete");
    talkCards.forEach((card) => {
      card.setAttribute("aria-pressed", "false");
    });
    nameSignChars.forEach((character) => {
      character.classList.remove("is-revealed");
    });
    nameSign.setAttribute(
      "aria-label",
      "空白招牌。先听完三位街坊的话，再把名字写上",
    );
    nameHint.textContent =
      "先听完三位街坊的话，再点击空白招牌，让“狗不理”逐字落定。";
  }

  function hearTownTalk(card) {
    visitedTalkCards.add(card.dataset.dogTalk);
    card.setAttribute("aria-pressed", "true");
    const remaining = talkCards.length - visitedTalkCards.size;
    if (remaining > 0) {
      nameHint.textContent =
        `已经听过 ${visitedTalkCards.size} 位。再听 ${remaining} 位，闲话就凑成了名字。`;
      announce(`已听过 ${visitedTalkCards.size} 位街坊`);
    }
    updateNameTalkState();
  }

  function writeNameOnSign() {
    if (nameSign.disabled) return;
    const character = nameSignChars[nameSignIndex];
    character.classList.add("is-revealed");
    nameSignIndex += 1;
    nameHint.textContent =
      `“狗不理”已经写下 ${nameSignIndex} 个字。`;
    announce(`招牌写下第 ${nameSignIndex} 个字`);
    if (nameSignIndex < nameSignChars.length) {
      nameSign.setAttribute(
        "aria-label",
        `继续把“狗不理”写到招牌上。还要点 ${nameSignChars.length - nameSignIndex} 次`,
      );
      return;
    }

    nameSign.disabled = true;
    nameSign.classList.add("is-complete");
    nameSign.setAttribute(
      "aria-label",
      "狗不理招牌已完成",
    );
    nameHint.textContent =
      "“狗不理”三个字落定。原是一句骂名，如今成了包子铺的名字。";
    unlockPage("fame");
    announce("狗不理招牌完成，可以进入名声远播");
  }

  const FAME_STAGES = Object.freeze([
    {
      eyebrow: "名声起处 · 包子铺",
      quote:
        "狗子的包子原本没有店名，这一来，反倒有了名。人一提他的包子就是“狗不理”。虽是骂名，也出了名。",
      context: "点一下，让这个被街坊叫开的称呼先走进市场。",
      button: "让名字走进市场",
    },
    {
      eyebrow: "名声第一站 · 市井",
      quote:
        "好事不出门，坏事传千里；好名没人稀罕，骂名人人好奇。狗不理是骂名，却好玩好笑好说好传好记，里边好像还有点故事，狗子再把包子做得好吃，狗不理这骂名反成了在市场扬名立万的大名了！",
      context: "原文摘引。名字靠一句闲话传开，也靠包子本身接住好奇。",
      button: "沿官场再走一程",
    },
    {
      eyebrow: "名声第二站 · 官场",
      quote:
        "袁大人一口咬上去，满嘴流油，满口喷香，大喜说：“我这辈子头次吃这么好吃的包子。”",
      context: "原文摘引。包子从码头脚夫的碗里，进了直隶总督的席面。",
      button: "再往京城传一程",
    },
    {
      eyebrow: "名声第三站 · 京城与更远的地方",
      quote:
        "“老天爷吃了也保管说好！”这句话跟着从宫里传到宫外，从京城传到天津。金口一开，天下大吉，狗不理名满四海，直贯当今。",
      context: "原文摘引。三个字从这里离开天津街巷，成了远播的名号。",
      button: "名声已到远方",
    },
  ]);

  function renderFameStage() {
    const stage =
      FAME_STAGES[Math.max(0, Math.min(FAME_STAGES.length - 1, fameStage))];
    fameEyebrow.textContent = stage.eyebrow;
    fameQuote.textContent = stage.quote;
    fameContext.textContent = stage.context;
    fameProgress.textContent = `${fameStage} / 3`;
    fameAdvance.disabled = fameStage >= 3;
    fameAdvance.innerHTML = fameStage >= 3
      ? `${stage.button} <span aria-hidden="true">✓</span>`
      : `${stage.button} <span aria-hidden="true">→</span>`;

    fameStops.forEach((stop, index) => {
      const reached = fameStage > index;
      stop.classList.toggle("is-reached", reached);
      stop.classList.toggle("is-active", fameStage === index + 1);
      stop.disabled = !reached;
      stop.setAttribute("aria-pressed", String(reached && fameStage === index + 1));
    });

    if (fameStage >= 3) {
      unlockPage("reflection");
      announce("名声传播的三站已经看完，可以写读后笺");
    }
  }

  function advanceFame() {
    if (fameStage >= 3) return;
    fameStage += 1;
    renderFameStage();
    announce(`名声传播到第 ${fameStage} 站`);
  }

  function resetFameInteraction() {
    fameStage = 0;
    renderFameStage();
  }

  function selectedReflectionOptions() {
    return [
      ...reflectionPrompts.querySelectorAll(
        "[data-dog-reflection-option][aria-pressed='true']",
      ),
    ].map((button) => button.dataset.dogReflectionOption);
  }

  function resetReflectionInteraction(restoreSaved = true) {
    reflectionPrompts
      .querySelectorAll("[data-dog-reflection-option]")
      .forEach((button) => {
        button.setAttribute("aria-pressed", "false");
      });
    reflectionText.value = "";
    reflectionStatus.textContent = "读后笺尚未保存。";
    if (restoreSaved) loadReflection();
  }

  function loadReflection() {
    let saved = null;
    try {
      saved = JSON.parse(
        window.localStorage.getItem(REFLECTION_STORAGE_KEY) || "null",
      );
    } catch {
      saved = null;
    }
    if (!saved || typeof saved !== "object") return;

    const validOptions = new Set(
      [...reflectionPrompts.querySelectorAll("[data-dog-reflection-option]")]
        .map((button) => button.dataset.dogReflectionOption),
    );
    if (Array.isArray(saved.keywords)) {
      saved.keywords.forEach((keyword) => {
        const button = reflectionPrompts.querySelector(
          `[data-dog-reflection-option="${CSS.escape(keyword)}"]`,
        );
        if (button && validOptions.has(keyword)) {
          button.setAttribute("aria-pressed", "true");
        }
      });
    }
    if (typeof saved.text === "string") {
      reflectionText.value = saved.text.slice(0, 500);
    }
    reflectionStatus.textContent = saved.savedAt
      ? `已载入上次保存的读后笺 · ${saved.savedAt}`
      : "已载入上次保存的读后笺。";
  }

  function toggleReflectionOption(button) {
    const selected = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!selected));
  }

  function saveReflection() {
    const keywords = selectedReflectionOptions();
    const text = reflectionText.value.trim();
    if (keywords.length === 0 && !text) {
      reflectionStatus.textContent =
        "先选一个关键词，或写下一句话，再保存。";
      announce("读后笺还是空的");
      return;
    }
    const savedAt = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    try {
      window.localStorage.setItem(
        REFLECTION_STORAGE_KEY,
        JSON.stringify({ keywords, text, savedAt }),
      );
      reflectionStatus.textContent =
        `已保存在当前浏览器 · ${savedAt}`;
      announce("读后笺已保存在当前浏览器");
    } catch {
      reflectionStatus.textContent =
        "当前浏览器不允许本地保存，请先保留这段文字。";
      announce("读后笺保存失败");
    }
  }

  function setAudioEnabled(enabled) {
    if (!audioToggle) return;
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      audioToggle.disabled = true;
      audioToggle.textContent = "街声不可用";
      return;
    }
    audioEnabled = enabled;
    audioToggle.setAttribute("aria-pressed", String(enabled));
    audioToggle.textContent = enabled ? "街声 · 开" : "街声 · 关";
    audioToggle.setAttribute(
      "aria-label",
      enabled ? "关闭街声" : "开启街声",
    );

    if (enabled) {
      if (!audioContext) {
        audioContext = new AudioContextClass();
        const sampleCount = audioContext.sampleRate * 2;
        const buffer = audioContext.createBuffer(
          1,
          sampleCount,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let index = 0; index < sampleCount; index += 1) {
          data[index] = (Math.random() * 2 - 1) * 0.2;
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 760;
        filter.Q.value = 0.45;
        audioGain = audioContext.createGain();
        audioGain.gain.value = 0;
        noise
          .connect(filter)
          .connect(audioGain)
          .connect(audioContext.destination);
        noise.start();
      }
      audioContext
        .resume()
        .then(() => {
          audioGain.gain.cancelScheduledValues(audioContext.currentTime);
          audioGain.gain.linearRampToValueAtTime(
            0.032,
            audioContext.currentTime + 0.5,
          );
        })
        .catch(() => {
          audioEnabled = false;
          audioToggle.setAttribute("aria-pressed", "false");
          audioToggle.textContent = "街声 · 关";
        });
    } else if (audioGain && audioContext) {
      audioGain.gain.cancelScheduledValues(audioContext.currentTime);
      audioGain.gain.linearRampToValueAtTime(
        0,
        audioContext.currentTime + 0.25,
      );
    }
  }

  function saveReadingPosition(pageName) {
    try {
      window.sessionStorage.setItem(
        READING_SESSION_KEY,
        JSON.stringify({
          page: pageName,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // 禁用会话存储时，当前页面内导航仍可正常使用。
    }
  }

  function textPlacement(position) {
    switch (position) {
      case "right":
        return {
          left: "auto",
          right: "clamp(20px, 4vw, 64px)",
          top: "calc(var(--dog-content-top) + 2vh)",
          bottom: "clamp(22px, 4vh, 46px)",
        };
      case "center":
        return {
          left: "50%",
          right: "auto",
          top: "calc(var(--dog-content-top) + 2vh)",
          bottom: "clamp(22px, 4vh, 46px)",
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          left: "9px",
          right: "9px",
          top: "auto",
          bottom: "8px",
          height: "58svh",
          transform: "none",
        };
      case "left":
      default:
        return {
          left: "clamp(18px, 3.6vw, 58px)",
          right: "auto",
          top: "calc(var(--dog-content-top) + 1.4vh)",
          bottom: "clamp(22px, 4vh, 46px)",
          transform: "none",
        };
    }
  }

  function setPlacementVariables(page, prefix, layout) {
    const placement = textPlacement(layout.textPosition);
    const width = layout.textWidth || "min(620px, 42vw)";
    page.style.setProperty(`--dog-${prefix}text-left`, placement.left);
    page.style.setProperty(`--dog-${prefix}text-right`, placement.right);
    page.style.setProperty(`--dog-${prefix}text-top`, placement.top);
    page.style.setProperty(`--dog-${prefix}text-bottom`, placement.bottom);
    page.style.setProperty(
      `--dog-${prefix}text-height`,
      placement.height || "auto",
    );
    page.style.setProperty(
      `--dog-${prefix}text-transform`,
      placement.transform,
    );
    page.style.setProperty(`--dog-${prefix}text-width`, width);
    page.style.setProperty(
      `--dog-${prefix}text-align`,
      layout.textAlign || "left",
    );
    page.style.setProperty(
      `--dog-${prefix}text-color`,
      layout.textColor || "#2d2921",
    );
    page.style.setProperty(
      `--dog-${prefix}text-overlay`,
      layout.textOverlay || "transparent",
    );
  }

  function sceneLayoutKey(pageName) {
    if (pageName !== "shop") return pageName;
    return shopPage.dataset.dogShopStage === "main"
      ? "shopMain"
      : "shopIntro";
  }

  function applySceneLayout(pageName) {
    const page = pages.find(
      (item) => item.dataset.dogPagePanel === pageName,
    );
    if (!page) return;
    const key = sceneLayoutKey(pageName);
    const layout = SCENE_LAYOUTS[key] || SCENE_LAYOUTS.street;
    if (!layout) return;
    const mobile = layout.mobile || layout;

    page.dataset.dogSceneId = layout.sceneId;
    page.dataset.dogTextPosition = layout.textPosition;
    page.style.setProperty(
      "--dog-scene-image",
      `url("${layout.backgroundImage}")`,
    );
    page.style.setProperty(
      "--dog-scene-position",
      layout.backgroundPosition,
    );
    page.style.setProperty(
      "--dog-scene-mobile-position",
      mobile.backgroundPosition,
    );
    page.style.setProperty(
      "--dog-scene-wash",
      layout.sceneWash || "transparent",
    );
    page.style.setProperty(
      "--dog-scene-mobile-wash",
      mobile.sceneWash || layout.sceneWash || "transparent",
    );
    setPlacementVariables(page, "", layout);
    setPlacementVariables(page, "mobile-", mobile);
  }

  function showPage(
    pageName,
    pushHistory = true,
    { enteredFromOpening = false } = {},
  ) {
    if (!pageOrder.includes(pageName)) pageName = "street";
    const narrativePage = pageName === "street" || pageName === "shop";
    if (pageName !== "craft") {
      window.gouBuliCraft?.close({
        restoreFocus: false,
        silent: true,
      });
    }
    if (pageName !== "street") {
      cancelOpeningAdvance();
    }
    if (pageName !== "shop") {
      cancelShopIntroAdvance();
    }
    currentPage = pageName;
    narrativeActivePage = pageName;
    setNarrativeMode(narrativePage);
    if (narrativePage) {
      prepareNarrativeContent();
    }
    applySceneLayout(pageName);

    pages.forEach((page) => {
      const pageKey = page.dataset.dogPagePanel;
      const active = narrativePage
        ? pageKey === "street" || pageKey === "shop"
        : pageKey === pageName;
      page.hidden = !active;
      page.classList.remove("is-scene-entering");
      page.classList.remove("is-story-entering");
      if (active && !narrativePage) {
        page.scrollTop = 0;
        page.classList.add("is-story-entering");
        if (enteredFromOpening) {
          page.classList.add("is-scene-entering");
        }
      }
    });

    let activeNavButton = null;
    navButtons.forEach((button) => {
      if (button.dataset.dogPage === pageName) {
        button.setAttribute("aria-current", "page");
        activeNavButton = button;
      } else {
        button.removeAttribute("aria-current");
      }
    });
    if (
      activeNavButton &&
      stepNav.scrollWidth > stepNav.clientWidth
    ) {
      window.requestAnimationFrame(() => {
        const left =
          activeNavButton.offsetLeft -
          (stepNav.clientWidth - activeNavButton.offsetWidth) / 2;
        stepNav.scrollTo({
          left: Math.max(0, left),
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches
            ? "auto"
            : "smooth",
        });
      });
    }

    if (pushHistory) {
      history.pushState(
        { view: "dog-bu-li", page: pageName },
        "",
        `#gou-bu-li/${pageName}`,
      );
    }
    saveReadingPosition(pageName);

    const activePage = document.querySelector(
      `[data-dog-page-panel="${pageName}"]`,
    );
    window.requestAnimationFrame(() => {
      activePage.focus({ preventScroll: true });
      if (narrativePage) {
        scrollToNarrativePage(
          pageName,
          pushHistory ? "smooth" : "auto",
        );
        scheduleNarrativeUpdate();
      }
      if (pageName === "reflection") {
        window.ReadingReflectionModal?.open("goubuli", {
          onBack: () => showPage("fame"),
          onRestart: resetExperience,
        });
      } else {
        window.ReadingReflectionModal?.notifyPageChange("goubuli", pageName);
      }
    });
  }

  function open(pageName = "street", pushHistory = true) {
    experience.hidden = false;
    document.body.classList.add("dog-story-open");
    showPage(pageName, false);
    if (pushHistory) {
      history.pushState(
        { view: "dog-bu-li", page: currentPage },
        "",
        `#gou-bu-li/${currentPage}`,
      );
    }
    window.requestAnimationFrame(() => {
      experienceTitle.focus({ preventScroll: true });
    });
  }

  function close(pushHistory = true) {
    if (experience.hidden) return;
    setAudioEnabled(false);
    cancelOpeningAdvance();
    cancelShopIntroAdvance();
    window.gouBuliCraft?.close({
      restoreFocus: false,
      silent: true,
    });
    closeOriginal(false);
    experience.hidden = true;
    document.body.classList.remove("dog-story-open");
    window.ReadingReflectionModal?.dismiss("goubuli");
    document.dispatchEvent(
      new CustomEvent("dogBuLi:return", {
        detail: { pushHistory },
      }),
    );
  }

  function closeSilently() {
    if (experience.hidden) return;
    setAudioEnabled(false);
    cancelOpeningAdvance();
    cancelShopIntroAdvance();
    window.gouBuliCraft?.close({
      restoreFocus: false,
      silent: true,
    });
    closeOriginal(false);
    experience.hidden = true;
    document.body.classList.remove("dog-story-open");
    window.ReadingReflectionModal?.dismiss("goubuli");
  }

  function resetExperience() {
    setAudioEnabled(false);
    window.gouBuliCraft?.reset();
    resetOpeningReader();
    resetShopIntro();
    resetMarket();
    resetNameInteraction();
    resetFameInteraction();
    resetReflectionInteraction(true);
    narrativeActiveScene = "street";
    narrativeActivePage = "street";
    dogPages.scrollTop = 0;
    showPage("street", true);
    announce("已回到序章，重新阅读天津人的吃与玩");
  }

  function openOriginal(context = null) {
    if (currentPage === "street") {
      cancelOpeningAdvance();
    }
    if (currentPage === "shop" && !shopIntro.hidden) {
      cancelShopIntroAdvance();
    }
    const stageId =
      typeof context === "string" ? context : context?.stageId || null;
    const stageLabel = CRAFT_STAGE_LABELS[stageId];

    if (typeof window.OriginalReadingModal?.open === "function") {
      window.OriginalReadingModal.open("goubuli", {
        trigger: document.activeElement,
        targetScene: stageLabel ? "craft" : undefined,
      });
      return;
    }

    lastFocusBeforeOriginal = document.activeElement;
    if (stageLabel) {
      originalStage.textContent = `冯骥才 · 《狗不理》· ${stageLabel}`;
      originalTitle.textContent = `${stageLabel} · 原文阅读`;
      originalIntro.textContent =
        "制作台会定位到本阶段对应的原著段落；原文按完整顺序保存在同一阅读面板中，不重复、不拆分。";
      originalReturnButton.textContent = "回到当前工序";
      originalReturnLabel = "回到当前工序";
    } else {
      originalStage.textContent = "冯骥才 · 《狗不理》";
      originalTitle.textContent = "狗不理 · 原文阅读";
      originalIntro.textContent =
        "按用户提供的 Word 原文顺序完整显示；自然段、标点、人物对话和天津方言均保持不变。";
      originalReturnButton.textContent = "返回故事";
      originalReturnLabel = "返回故事";
    }
    originalSheet.scrollTop = 0;
    originalModal.hidden = false;
    window.requestAnimationFrame(() => {
      originalSheet.focus({ preventScroll: true });
      if (stageLabel) {
        const anchor = [...originalText.querySelectorAll("p")].find((item) =>
          item.dataset.sceneIds.split(" ").includes("craft"),
        );
        anchor?.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  }

  function renderOriginalText() {
    originalText.replaceChildren();
    originalText.hidden = !originalSource;
    originalNote.hidden = !originalSource;
    if (!originalSource) {
      originalIntro.textContent =
        "未找到《狗不理》的原文数据，请检查 web/data/original-text.js。";
      originalNote.hidden = false;
      originalNote.textContent = "";
      return;
    }

    originalSource.paragraphs.forEach((paragraph) => {
      const element = document.createElement("p");
      element.id = paragraph.paragraphId;
      element.dataset.sceneIds = paragraph.sceneIds.join(" ");
      element.dataset.sourceVerified = String(paragraph.sourceVerified);
      element.textContent = paragraph.content;
      originalText.append(element);
    });
    originalIntro.textContent =
      "按用户提供的 Word 原文顺序完整显示；自然段、标点、人物对话和天津方言均保持不变。";
    originalNote.textContent =
      `来源：${window.SUSHI_QIREN_ORIGINAL_TEXT.source.edition}。` +
      `共 ${originalSource.paragraphs.length} 个自然段，已与提供的 Word 文件逐段核对。`;
  }

  function closeOriginal(restoreFocus = true) {
    if (originalModal.hidden) return;
    originalModal.hidden = true;
    if (
      restoreFocus &&
      lastFocusBeforeOriginal instanceof HTMLElement &&
      experience.contains(lastFocusBeforeOriginal)
    ) {
      lastFocusBeforeOriginal.focus({ preventScroll: true });
    }
    if (
      currentPage === "street" &&
      openingComplete &&
      openingIsAtEnd() &&
      restoreFocus
    ) {
      scheduleOpeningAdvance(false);
    }
    if (
      currentPage === "shop" &&
      shopIntroReadingComplete &&
      shopIntroIsAtEnd() &&
      restoreFocus
    ) {
      scheduleShopIntroContinue(false);
    }
  }

  function unlockPage(pageName) {
    if (!pageOrder.includes(pageName)) return;
    const button = navButtons.find(
      (item) => item.dataset.dogPage === pageName,
    );
    if (!button) return;
    button.classList.add("is-story-unlocked");
    button.dataset.unlocked = "true";
    button.setAttribute(
      "aria-label",
      `${button.querySelector("strong")?.textContent || pageName} · 已解锁`,
    );
    try {
      const unlocked = new Set(
        JSON.parse(
          window.sessionStorage.getItem(UNLOCK_SESSION_KEY) || "[]",
        ),
      );
      unlocked.add(pageName);
      window.sessionStorage.setItem(
        UNLOCK_SESSION_KEY,
        JSON.stringify([...unlocked]),
      );
    } catch {
      // 静态原型在禁用存储时仍保留本次页面的解锁样式。
    }
    announce(`已解锁故事段落：${button.querySelector("strong")?.textContent}`);
  }

  try {
    const unlocked = JSON.parse(
      window.sessionStorage.getItem(UNLOCK_SESSION_KEY) || "[]",
    );
    if (Array.isArray(unlocked)) {
      unlocked.forEach((pageName) => {
        const button = navButtons.find(
          (item) => item.dataset.dogPage === pageName,
        );
        if (button) {
          button.classList.add("is-story-unlocked");
          button.dataset.unlocked = "true";
        }
      });
    }
  } catch {
    // 会话存储为空或不可用时，从默认阅读状态开始。
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.dogPage);
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.dogNext);
    });
  });

  pageTargetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.dogPageTarget);
    });
  });

  marketItems.forEach((item) => {
    item.addEventListener("click", () => inspectMarketItem(item));
  });

  talkCards.forEach((card) => {
    card.addEventListener("click", () => hearTownTalk(card));
  });
  nameSign.addEventListener("click", writeNameOnSign);

  fameAdvance.addEventListener("click", advanceFame);
  fameStops.forEach((stop) => {
    stop.addEventListener("click", () => {
      if (stop.disabled) return;
      fameStage = Number(stop.dataset.dogFameStop) + 1;
      renderFameStage();
    });
  });

  reflectionPrompts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dog-reflection-option]");
    if (button) toggleReflectionOption(button);
  });
  reflectionSave.addEventListener("click", saveReflection);
  audioToggle.addEventListener("click", () => {
    setAudioEnabled(!audioEnabled);
  });

  openingText.addEventListener("scroll", updateOpeningProgress, {
    passive: true,
  });
  shopIntroText.addEventListener("scroll", updateShopIntroProgress, {
    passive: true,
  });
  dogPages.addEventListener("scroll", scheduleNarrativeUpdate, {
    passive: true,
  });
  window.addEventListener("resize", () => {
    updateOpeningProgress();
    updateShopIntroProgress();
    scheduleNarrativeUpdate();
  });
  if ("ResizeObserver" in window) {
    const openingResizeObserver = new ResizeObserver(
      scheduleNarrativeUpdate,
    );
    const shopResizeObserver = new ResizeObserver(
      scheduleNarrativeUpdate,
    );
    openingResizeObserver.observe(openingText);
    shopResizeObserver.observe(shopIntroText);
  }
  reduceMotion.addEventListener("change", scheduleNarrativeUpdate);

  originalButtons.forEach((button) => {
    button.addEventListener("click", openOriginal);
  });
  skipButton.addEventListener("click", openOriginal);
  originalButton.addEventListener("click", openOriginal);
  originalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => closeOriginal());
  });
  renderOriginalText();
  resetMarket();
  resetNameInteraction();
  resetFameInteraction();
  resetReflectionInteraction(true);

  backButton.addEventListener("click", () => close());
  restartButton.addEventListener("click", resetExperience);
  reflectionRestart.addEventListener("click", resetExperience);

  document.addEventListener("keydown", (event) => {
    if (experience.hidden) return;
    if (event.key === "Escape" && !originalModal.hidden) {
      event.preventDefault();
      closeOriginal();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || originalModal.hidden) return;
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
  });

  document.addEventListener("dogBuLiCraft:unlock", (event) => {
    unlockPage(event.detail?.page || "market");
  });

  window.dogBuLiStory = {
    open,
    close,
    closeSilently,
    showPage,
    openOriginal,
    getCurrentPage: () => currentPage,
    getOpeningState: () => {
      const state = narrativeMode
        ? textProgress(openingText, streetNarrative)
        : {
            complete: openingComplete,
            started: openingStarted,
            progress: 0,
          };
      return {
        ...state,
        scrollTop: dogPages.scrollTop,
        maxScroll: Math.max(
          0,
          dogPages.scrollHeight - dogPages.clientHeight,
        ),
      };
    },
    getShopIntroState: () => {
      const state = narrativeMode
        ? textProgress(shopIntroText, shopIntro)
        : {
            complete: shopIntroReadingComplete,
            started: shopIntroStarted,
            progress: 0,
          };
      return {
        ...state,
        readingComplete: shopIntroReadingComplete,
        scrollTop: dogPages.scrollTop,
        maxScroll: Math.max(
          0,
          dogPages.scrollHeight - dogPages.clientHeight,
        ),
      };
    },
    getNarrativeState: () => ({
      mode: narrativeMode,
      activeScene: narrativeActiveScene,
      activePage: narrativeActivePage,
      scrollTop: dogPages.scrollTop,
      scrollHeight: dogPages.scrollHeight,
      clientHeight: dogPages.clientHeight,
      streetProgress: textProgress(openingText, streetNarrative).progress,
      shopProgress: textProgress(shopIntroText, shopIntro).progress,
      streetTransition: narrativeMode
        ? transitionProgress(streetTransition)
        : 0,
      shopTransition: narrativeMode
        ? transitionProgress(shopTransition)
        : 0,
      layers: narrativeLayers.map((layer, index) => ({
        index,
        sceneKey: layer.querySelector("img").dataset.sceneKey || "",
        opacity: Number.parseFloat(layer.style.opacity || "0"),
      })),
    }),
    getOriginalReturnLabel: () => originalReturnLabel,
    getMarketState: () => ({
      visited: [...visitedMarketItems],
      complete: visitedMarketItems.size === marketItems.length,
    }),
    getNameState: () => ({
      talksHeard: [...visitedTalkCards],
      revealedCharacters: nameSignIndex,
      complete: nameSignIndex === nameSignChars.length,
    }),
    getFameState: () => ({
      stage: fameStage,
      complete: fameStage >= 3,
    }),
    getAudioState: () => ({
      enabled: audioEnabled,
      contextState: audioContext?.state || "uninitialized",
    }),
    resetInteractions: () => {
      resetMarket();
      resetNameInteraction();
      resetFameInteraction();
      resetReflectionInteraction(true);
    },
    getLastReadingPage: () => {
      try {
        const saved = JSON.parse(
          window.sessionStorage.getItem(READING_SESSION_KEY) || "null",
        );
        return pageOrder.includes(saved?.page) ? saved.page : currentPage;
      } catch {
        return currentPage;
      }
    },
    unlockPage,
  };
})();
