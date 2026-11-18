(() => {
  "use strict";

  // 序章先完成三段新增内容，再进入原有天庆馆互动阅读。
  const PRELUDE_PAGES = new Set(["prelude", "theatre", "arrival"]);
  const pageOrder = [
    "prelude",
    "theatre",
    "arrival",
    "restaurant",
    "observe",
    "craft",
    "reveal",
    "market",
    "ending",
    "reflection",
  ];

  const observations = {
    cup: {
      kicker: "酒杯 · 如常",
      title: "桌边的酒，没有打断他的从容",
      copy:
        "泥人张坐在桌边饮酒，吃喝如常。周围开始热闹时，他仍把动作收在手边，不急着回应。",
    },
    door: {
      kicker: "天庆馆旗帜 · 场景",
      title: "海张五从雨里横冲直撞地进来",
      copy:
        "门口带来一阵脚步声。海张五的出现改变了饭馆里的注意力，众人停筷，目光向他聚过去。",
    },
    diners: {
      kicker: "吃客 · 围观",
      title: "停下的筷子，比说话更快",
      copy:
        "邻桌吃客先是张望，随后渐渐围拢。泥像出现之后，所有人的目光又一起转向桌面。",
    },
    mudman: {
      kicker: "人物 · 泥人张",
      title: "看不见的手，正在桌下工作",
      copy:
        "泥人张没有争辩。他从脚边取泥，靠手指在桌下慢慢捏出人物，真正的动作藏在众人视线之外。",
    },
  };

  const experience = document.querySelector("#niRenZhangExperience");
  const pages = [...document.querySelectorAll("[data-nr-page-panel]")];
  const restaurantPage = document.querySelector("#nrPageRestaurant");
  const restaurantBackground = restaurantPage?.querySelector(
    ".nr-restaurant-background",
  );
  const restaurantHotspotLayer = document.querySelector(
    "#nrRestaurantHotspotLayer",
  );
  const observePage = document.querySelector("#nrPageObserve");
  const observeBackgroundMockery = observePage?.querySelector(
    ".nr-observe-background-mockery",
  );
  const observeTitle = document.querySelector("#nrObserveTitle");
  const observeDescription = document.querySelector(
    "#nrObserveDescription",
  );
  const observeReadingHint = document.querySelector(
    "#nrObserveReadingHint",
  );
  const observeNextButton = document.querySelector(
    "#nrObserveNextButton",
  );
  const observeNextLabel = document.querySelector(
    "#nrObserveNextLabel",
  );
  const navButtons = [...document.querySelectorAll("[data-nr-page]")];
  const nextButtons = [...document.querySelectorAll("[data-nr-next]")];
  const pageTargetButtons = [
    ...document.querySelectorAll("[data-nr-page-target]"),
  ];
  const originalButtons = [
    ...document.querySelectorAll("[data-nr-original]"),
  ];
  const backButton = document.querySelector("#niRenZhangBackButton");
  const skipButton = document.querySelector("#niRenZhangSkipButton");
  const originalButton = document.querySelector("#niRenZhangOriginalButton");
  const restartButton = document.querySelector("#niRenZhangRestartButton");
  const reflectionRestart = document.querySelector("#nrReflectionRestart");
  const experienceTitle = document.querySelector(
    "#niRenZhangExperienceTitle",
  );
  const liveStatus = document.querySelector("#niRenZhangLiveStatus");
  const originalModal = document.querySelector("#niRenZhangOriginalModal");
  const originalSheet = originalModal.querySelector(".nr-original-sheet");
  const originalTitle = document.querySelector("#nrOriginalTitle");
  const originalText = document.querySelector("#nrOriginalText");
  const originalNote = document.querySelector("#nrOriginalNote");
  const originalSource =
    window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["ni-ren-zhang"];
  const originalCloseButtons = [
    ...document.querySelectorAll("[data-nr-original-close]"),
  ];
  const preludeReader = document.querySelector("#nrPreludeReader");
  const preludeNextButtons = [
    ...document.querySelectorAll("[data-nr-prelude-next]"),
  ];
  const hotspotButtons = [
    ...document.querySelectorAll("[data-nr-hotspot]"),
  ];
  const observationKicker = document.querySelector("#nrObservationKicker");
  const observationTitle = document.querySelector("#nrObservationTitle");
  const observationCopy = document.querySelector("#nrObservationCopy");
  const observationCount = document.querySelector("#nrObservationCount");
  const revealPage = document.querySelector("#nrPageReveal");
  const revealBackground = revealPage?.querySelector(
    ".nr-reveal-background",
  );
  const revealClayScene = document.querySelector("#nrRevealClayScene");
  const revealInsultScene = document.querySelector(
    "#nrRevealInsultScene",
  );
  const revealHotspotLayer = document.querySelector(
    "#nrRevealHotspotLayer",
  );
  const revealClayHotspot = document.querySelector(
    "#nrRevealClayHotspot",
  );
  const revealContinueButton = document.querySelector(
    "#nrRevealContinueButton",
  );
  const revealMarketButton = document.querySelector(
    "#nrRevealMarketButton",
  );
  const revealViewer = document.querySelector("#nrRevealClayViewer");
  const revealViewerSheet = revealViewer?.querySelector(
    ".nr-reveal-viewer-sheet",
  );
  const revealClayFrame = document.querySelector("#nrRevealClayFrame");
  const revealClayImage = document.querySelector("#nrRevealClayImage");
  const revealZoomLabel = document.querySelector(
    "#nrRevealClayZoomLabel",
  );
  const revealViewerCloseButtons = [
    ...document.querySelectorAll("[data-nr-reveal-viewer-close]"),
  ];
  const revealZoomButtons = [
    ...document.querySelectorAll("[data-nr-reveal-zoom]"),
  ];

  let currentPage = "prelude";
  let lastFocusBeforeOriginal = null;
  let lastFocusBeforeRevealViewer = null;
  let preludeStarted = false;
  let preludeComplete = false;
  let preludeAdvanceTimer = null;
  let revealViewerCloseTimer = null;
  let revealScale = 1;
  let revealPanX = 0;
  let revealPanY = 0;
  let revealDrag = null;
  let revealScene = "clay-reveal";
  let observeScene = "appearance";
  let observeCopyTimer = null;
  let observeTransitionTimer = null;
  const viewedHotspots = new Set();

  const OBSERVE_SCENES = {
    appearance: {
      title: "谁在看戏，谁在看人？",
      description:
        "海张五横冲直撞，众人停筷观看；泥人张仍坐着喝酒。" +
        "两种姿态放在一起，故事真正的较量才慢慢显露。",
      button: "继续阅读",
    },
    mockery: {
      title: "泥人张遭冷嘲热讽",
      description:
        "有个细嗓门的说：“人家台下一边看戏，一边手在袖子里捏泥人。" +
        "捏完拿出来一瞧，台上的嘛样，他捏的嘛样。”跟着就是海张五的大粗嗓门说：" +
        "“在哪儿捏？在袖子里捏？在裤裆里捏吧！”随后一阵笑，拿泥人张找乐子。",
      button: "开始袖中捏泥",
    },
  };

  function announce(message) {
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function updateObservationCount() {
    observationCount.textContent = `${viewedHotspots.size} / 4`;
  }

  function objectPositionRatio(token, freeSpace) {
    if (!token) return 0.5;
    if (token === "left" || token === "top") return 0;
    if (token === "center") return 0.5;
    if (token === "right" || token === "bottom") return 1;
    if (token.endsWith("%")) return Number.parseFloat(token) / 100;
    if (token.endsWith("px") && Math.abs(freeSpace) > 0.5) {
      return -Number.parseFloat(token) / freeSpace;
    }
    return 0.5;
  }

  function syncRestaurantHotspotLayer() {
    if (
      !restaurantPage ||
      !restaurantBackground ||
      !restaurantHotspotLayer ||
      restaurantPage.hidden ||
      !restaurantBackground.naturalWidth ||
      !restaurantBackground.naturalHeight
    ) {
      return;
    }

    const pageRect = restaurantPage.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return;

    const scale = Math.max(
      pageRect.width / restaurantBackground.naturalWidth,
      pageRect.height / restaurantBackground.naturalHeight,
    );
    const renderedWidth = restaurantBackground.naturalWidth * scale;
    const renderedHeight = restaurantBackground.naturalHeight * scale;
    const freeX = pageRect.width - renderedWidth;
    const freeY = pageRect.height - renderedHeight;
    const [positionX = "50%", positionY = "50%"] = getComputedStyle(
      restaurantBackground,
    )
      .objectPosition.split(/\s+/)
      .filter(Boolean);

    restaurantHotspotLayer.style.left = `${
      freeX * objectPositionRatio(positionX, freeX)
    }px`;
    restaurantHotspotLayer.style.top = `${
      freeY * objectPositionRatio(positionY, freeY)
    }px`;
    restaurantHotspotLayer.style.width = `${renderedWidth}px`;
    restaurantHotspotLayer.style.height = `${renderedHeight}px`;
  }

  function syncRevealHotspotLayer() {
    if (
      !revealPage ||
      !revealBackground ||
      !revealHotspotLayer ||
      revealPage.hidden ||
      !revealBackground.naturalWidth ||
      !revealBackground.naturalHeight
    ) {
      return;
    }

    const pageRect = revealPage.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return;

    const scale = Math.max(
      pageRect.width / revealBackground.naturalWidth,
      pageRect.height / revealBackground.naturalHeight,
    );
    const renderedWidth = revealBackground.naturalWidth * scale;
    const renderedHeight = revealBackground.naturalHeight * scale;
    const freeX = pageRect.width - renderedWidth;
    const freeY = pageRect.height - renderedHeight;
    const [positionX = "50%", positionY = "50%"] = getComputedStyle(
      revealBackground,
    )
      .objectPosition.split(/\s+/)
      .filter(Boolean);

    revealHotspotLayer.style.left = `${
      freeX * objectPositionRatio(positionX, freeX)
    }px`;
    revealHotspotLayer.style.top = `${
      freeY * objectPositionRatio(positionY, freeY)
    }px`;
    revealHotspotLayer.style.width = `${renderedWidth}px`;
    revealHotspotLayer.style.height = `${renderedHeight}px`;
  }

  function renderObserveScene(sceneName) {
    const scene = OBSERVE_SCENES[sceneName] || OBSERVE_SCENES.appearance;
    observeTitle.textContent = scene.title;
    observeDescription.textContent = scene.description;
    observeNextLabel.textContent = scene.button;
    observeReadingHint.hidden = sceneName !== "appearance";
  }

  function setObserveScene(
    sceneName,
    { animate = true, pushHistory = false } = {},
  ) {
    if (!observePage || !OBSERVE_SCENES[sceneName]) return;

    if (observeCopyTimer !== null) {
      window.clearTimeout(observeCopyTimer);
      observeCopyTimer = null;
    }
    if (observeTransitionTimer !== null) {
      window.clearTimeout(observeTransitionTimer);
      observeTransitionTimer = null;
    }

    const previousScene = observeScene;
    observeScene = sceneName;
    observePage.dataset.nrObserveScene = sceneName;
    observePage.classList.toggle("is-mockery", sceneName === "mockery");

    if (pushHistory && previousScene !== sceneName) {
      history.pushState(
        {
          view: "ni-ren-zhang",
          page: "observe",
          observeScene: sceneName,
        },
        "",
        "#ni-ren-zhang/observe",
      );
    }

    if (!animate || previousScene === sceneName) {
      observePage.classList.remove("is-scene-transitioning");
      observePage.setAttribute("aria-busy", "false");
      observeNextButton.disabled = false;
      renderObserveScene(sceneName);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      observePage.classList.remove("is-scene-transitioning");
      observePage.setAttribute("aria-busy", "false");
      observeNextButton.disabled = false;
      renderObserveScene(sceneName);
      return;
    }

    observePage.classList.add("is-scene-transitioning");
    observePage.setAttribute("aria-busy", "true");
    observeNextButton.disabled = true;
    observeCopyTimer = window.setTimeout(() => {
      renderObserveScene(sceneName);
      window.requestAnimationFrame(() => {
        observePage.classList.remove("is-scene-transitioning");
      });
      observeCopyTimer = null;
    }, 260);
    observeTransitionTimer = window.setTimeout(() => {
      observePage.setAttribute("aria-busy", "false");
      observeNextButton.disabled = false;
      observeTransitionTimer = null;
    }, 640);
  }

  function setRevealScene(
    sceneName,
    { pushHistory = false } = {},
  ) {
    if (
      !revealPage ||
      !revealClayScene ||
      !revealInsultScene ||
      !["clay-reveal", "hai-zhang-wu-insult"].includes(sceneName)
    ) {
      return false;
    }

    if (sceneName === "hai-zhang-wu-insult") {
      closeRevealViewer(false, true);
    }

    const isInsult = sceneName === "hai-zhang-wu-insult";
    revealScene = sceneName;
    revealPage.dataset.nrRevealScene = sceneName;
    revealPage.classList.toggle("is-hai-zhang-wu-insult", isInsult);
    revealPage.setAttribute(
      "aria-labelledby",
      isInsult ? "nrRevealInsultTitle" : "nrRevealTitle",
    );

    revealClayScene.inert = isInsult;
    revealClayScene.setAttribute("aria-hidden", String(isInsult));
    revealInsultScene.inert = !isInsult;
    revealInsultScene.setAttribute("aria-hidden", String(!isInsult));
    revealHotspotLayer.inert = isInsult;
    revealHotspotLayer.setAttribute("aria-hidden", String(isInsult));

    if (pushHistory) {
      history.pushState(
        {
          view: "ni-ren-zhang",
          page: "reveal",
          revealScene: sceneName,
        },
        "",
        isInsult
          ? "#ni-ren-zhang/reveal/hai-zhang-wu-insult"
          : "#ni-ren-zhang/reveal",
      );
    }

    announce(
      isInsult
        ? "继续阅读：海张五指着泥人张嘲讽"
        : "泥像亮相",
    );
    if (!isInsult) syncRevealHotspotLayer();
    return true;
  }

  function showPage(
    pageName,
    pushHistory = true,
    { revealScene: requestedRevealScene = "clay-reveal" } = {},
  ) {
    window.ClayStoryTransition?.cancel({ restoreFocus: false });
    if (!pageOrder.includes(pageName)) pageName = "prelude";
    if (preludeAdvanceTimer !== null) {
      window.clearTimeout(preludeAdvanceTimer);
      preludeAdvanceTimer = null;
    }
    currentPage = pageName;
    if (pageName === "reveal") {
      setRevealScene(requestedRevealScene);
    }
    if (pageName === "observe") {
      setObserveScene("appearance", {
        animate: false,
        pushHistory: false,
      });
    }

    pages.forEach((page) => {
      const active = page.dataset.nrPagePanel === pageName;
      page.hidden = !active;
      if (active) page.scrollTop = 0;
    });
    if (pageName === "prelude") resetPreludeReading();

    const navPage = PRELUDE_PAGES.has(pageName) ? "restaurant" : pageName;
    navButtons.forEach((button) => {
      if (button.dataset.nrPage === navPage) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (pushHistory) {
      const currentHash =
        pageName === "reveal" && revealScene === "hai-zhang-wu-insult"
          ? "#ni-ren-zhang/reveal/hai-zhang-wu-insult"
          : `#ni-ren-zhang/${pageName}`;
      history.pushState(
        {
          view: "ni-ren-zhang",
          page: pageName,
          revealScene:
            pageName === "reveal" ? revealScene : undefined,
        },
        "",
        currentHash,
      );
    }

    const activePage = document.querySelector(
      `[data-nr-page-panel="${pageName}"]`,
    );
    window.requestAnimationFrame(() => {
      activePage.focus({ preventScroll: true });
      if (pageName === "restaurant") syncRestaurantHotspotLayer();
      if (pageName === "reveal") syncRevealHotspotLayer();
      if (pageName === "reflection") {
        window.ReadingReflectionModal?.open("nirenzhang", {
          onBack: () => showPage("ending"),
          onRestart: resetExperience,
        });
      } else {
        window.ReadingReflectionModal?.notifyPageChange(
          "nirenzhang",
          pageName,
        );
      }
    });
  }

  function preludeReadingAtEnd() {
    const maxScroll = preludeReader.scrollHeight - preludeReader.clientHeight;
    return maxScroll > 8 && preludeReader.scrollTop >= maxScroll - 3;
  }

  function updatePreludeReading() {
    if (experience.hidden || currentPage !== "prelude" || preludeComplete) {
      return;
    }
    if (preludeReader.scrollTop > 8) preludeStarted = true;
    if (!preludeStarted || !preludeReadingAtEnd()) return;

    preludeComplete = true;
    announce("开篇文字已读完，进入大观楼");
    preludeAdvanceTimer = window.setTimeout(() => {
      preludeAdvanceTimer = null;
      if (
        experience.hidden ||
        currentPage !== "prelude" ||
        !originalModal.hidden
      ) {
        return;
      }
      showPage("theatre", true);
    }, 320);
  }

  function resetPreludeReading() {
    if (preludeAdvanceTimer !== null) {
      window.clearTimeout(preludeAdvanceTimer);
      preludeAdvanceTimer = null;
    }
    preludeStarted = false;
    preludeComplete = false;
    preludeReader.scrollTop = 0;
  }

  function open(
    pageName = "prelude",
    pushHistory = true,
    options = {},
  ) {
    experience.hidden = false;
    document.body.classList.add("nr-story-open");
    showPage(pageName, false, options);
    if (pushHistory) {
      const currentHash =
        currentPage === "reveal" &&
        revealScene === "hai-zhang-wu-insult"
          ? "#ni-ren-zhang/reveal/hai-zhang-wu-insult"
          : `#ni-ren-zhang/${currentPage}`;
      history.pushState(
        {
          view: "ni-ren-zhang",
          page: currentPage,
          revealScene:
            currentPage === "reveal" ? revealScene : undefined,
        },
        "",
        currentHash,
      );
    }
    window.requestAnimationFrame(() => {
      experienceTitle.focus({ preventScroll: true });
    });
  }

  function close(pushHistory = true) {
    if (experience.hidden) return;
    window.ClayStoryTransition?.cancel({ restoreFocus: false });
    closeOriginal(false);
    closeRevealViewer(false, true);
    experience.hidden = true;
    document.body.classList.remove("nr-story-open");
    window.ReadingReflectionModal?.dismiss("nirenzhang");
    document.dispatchEvent(
      new CustomEvent("niRenZhang:return", {
        detail: { pushHistory },
      }),
    );
  }

  function closeSilently() {
    if (experience.hidden) return;
    window.ClayStoryTransition?.cancel({ restoreFocus: false });
    closeOriginal(false);
    closeRevealViewer(false, true);
    experience.hidden = true;
    document.body.classList.remove("nr-story-open");
    window.ReadingReflectionModal?.dismiss("nirenzhang");
  }

  function resetExperience() {
    viewedHotspots.clear();
    hotspotButtons.forEach((button) => {
      button.classList.remove("is-visited");
    });
    observationCount.textContent = "0 / 4";
    observationKicker.textContent = "馆中一瞥 · 观察";
    observationTitle.textContent = "桌面安静，众人的目光并不安静";
    observationCopy.textContent =
      "泥人张坐在桌边饮酒，吃喝如常；邻桌的人说话、张望，雨声和脚步声混在一处。";
    showPage("prelude", true);
    announce("已回到故事开篇，重新阅读泥人张");
  }

  function clampRevealPan() {
    if (!revealClayFrame || !revealClayImage) return;
    const maxX = Math.max(
      0,
      (revealClayImage.offsetWidth * revealScale -
        revealClayFrame.clientWidth) /
        2,
    );
    const maxY = Math.max(
      0,
      (revealClayImage.offsetHeight * revealScale -
        revealClayFrame.clientHeight) /
        2,
    );
    revealPanX = Math.min(maxX, Math.max(-maxX, revealPanX));
    revealPanY = Math.min(maxY, Math.max(-maxY, revealPanY));
  }

  function applyRevealViewerTransform() {
    if (!revealClayImage || !revealZoomLabel) return;
    revealClayImage.style.transform =
      `translate3d(${revealPanX}px, ${revealPanY}px, 0) ` +
      `scale(${revealScale})`;
    revealZoomLabel.textContent = `${revealScale.toFixed(1)}×`;
    revealZoomButtons.forEach((button) => {
      const action = button.dataset.nrRevealZoom;
      button.disabled =
        (action === "in" && revealScale >= 3) ||
        (action === "out" && revealScale <= 1);
    });
  }

  function resetRevealViewerImage() {
    revealScale = 1;
    revealPanX = 0;
    revealPanY = 0;
    revealDrag = null;
    revealClayFrame?.classList.remove("is-dragging");
    applyRevealViewerTransform();
  }

  function setRevealViewerScale(nextScale, anchor = null) {
    const previousScale = revealScale;
    const clampedScale = Math.min(3, Math.max(1, nextScale));
    if (clampedScale <= 1) {
      revealScale = 1;
      revealPanX = 0;
      revealPanY = 0;
      applyRevealViewerTransform();
      return;
    }

    if (anchor && previousScale > 0) {
      const ratio = clampedScale / previousScale;
      revealPanX = anchor.x - (anchor.x - revealPanX) * ratio;
      revealPanY = anchor.y - (anchor.y - revealPanY) * ratio;
    }
    revealScale = clampedScale;
    clampRevealPan();
    applyRevealViewerTransform();
  }

  function openRevealViewer() {
    if (!revealViewer || !revealViewer.hidden) return;
    if (revealViewerCloseTimer !== null) {
      window.clearTimeout(revealViewerCloseTimer);
      revealViewerCloseTimer = null;
    }
    lastFocusBeforeRevealViewer =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : revealClayHotspot;
    resetRevealViewerImage();
    revealViewer.hidden = false;
    revealViewer.classList.remove("is-closing");
    document.body.classList.add("nr-reveal-viewer-open");
    window.requestAnimationFrame(() => {
      revealViewer.classList.add("is-open");
      revealViewerSheet?.focus({ preventScroll: true });
    });
  }

  function closeRevealViewer(restoreFocus = true, immediate = false) {
    if (!revealViewer || revealViewer.hidden) return;
    revealViewer.classList.remove("is-open");
    revealViewer.classList.add("is-closing");
    document.body.classList.remove("nr-reveal-viewer-open");
    revealDrag = null;
    revealClayFrame?.classList.remove("is-dragging");

    const finish = () => {
      revealViewer.hidden = true;
      revealViewer.classList.remove("is-closing");
      resetRevealViewerImage();
      revealViewerCloseTimer = null;
      if (
        restoreFocus &&
        lastFocusBeforeRevealViewer instanceof HTMLElement
      ) {
        lastFocusBeforeRevealViewer.focus({ preventScroll: true });
      }
    };

    if (revealViewerCloseTimer !== null) {
      window.clearTimeout(revealViewerCloseTimer);
    }
    if (immediate) {
      finish();
      return;
    }
    revealViewerCloseTimer = window.setTimeout(finish, 200);
  }

  function openOriginal() {
    window.ClayStoryTransition?.cancel({ restoreFocus: false });
    if (typeof window.OriginalReadingModal?.open === "function") {
      window.OriginalReadingModal.open("nirenzhang", {
        trigger: document.activeElement,
      });
      return;
    }
    lastFocusBeforeOriginal = document.activeElement;
    originalSheet.scrollTop = 0;
    originalModal.hidden = false;
    window.requestAnimationFrame(() => {
      originalSheet.focus({ preventScroll: true });
    });
  }

  function renderOriginalText() {
    originalText.replaceChildren();
    originalText.hidden = !originalSource;
    originalNote.hidden = !originalSource;
    if (!originalSource) {
      originalTitle.textContent = "原文尚未录入";
      originalNote.textContent =
        "未找到《泥人张》的原文数据，请检查 web/data/original-text.js。";
      originalNote.hidden = false;
      return;
    }

    originalTitle.textContent = `${originalSource.title} · 原文阅读`;
    originalSource.paragraphs.forEach((paragraph) => {
      const element = document.createElement("p");
      element.id = paragraph.paragraphId;
      element.dataset.sceneIds = paragraph.sceneIds.join(" ");
      element.dataset.sourceVerified = String(paragraph.sourceVerified);
      element.textContent = paragraph.content;
      originalText.append(element);
    });
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
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(
        button.dataset.nrPage === "restaurant"
          ? "prelude"
          : button.dataset.nrPage,
      );
    });
  });

  preludeNextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.nrPreludeNext);
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.nrNext);
    });
  });

  observeNextButton?.addEventListener("click", () => {
    if (observeScene === "appearance") {
      setObserveScene("mockery", {
        animate: true,
        pushHistory: true,
      });
      announce("继续阅读：泥人张遭冷嘲热讽");
      return;
    }
    const transition = window.ClayStoryTransition;
    if (
      transition &&
      !transition.isRunning() &&
      transition.start({ onComplete: () => showPage("craft") })
    ) {
      announce("鞋底取泥，桌边捏泥");
      return;
    }
    if (!transition?.isRunning()) showPage("craft");
  });

  pageTargetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.nrPageTarget);
    });
  });

  hotspotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const content = observations[button.dataset.nrHotspot];
      if (!content) return;

      viewedHotspots.add(button.dataset.nrHotspot);
      button.classList.add("is-visited");
      observationKicker.textContent = content.kicker;
      observationTitle.textContent = content.title;
      observationCopy.textContent = content.copy;
      updateObservationCount();
      announce(`已观察：${content.kicker}`);
    });
  });

  revealContinueButton?.addEventListener("click", () => {
    setRevealScene("hai-zhang-wu-insult", {
      pushHistory: true,
    });
  });
  revealClayHotspot?.addEventListener("click", openRevealViewer);
  revealViewerCloseButtons.forEach((button) => {
    button.addEventListener("click", () => closeRevealViewer());
  });
  revealZoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.nrRevealZoom;
      if (action === "reset") {
        resetRevealViewerImage();
      } else if (action === "in") {
        setRevealViewerScale(revealScale + 0.25);
      } else if (action === "out") {
        setRevealViewerScale(revealScale - 0.25);
      }
    });
  });

  revealClayFrame?.addEventListener("pointerdown", (event) => {
    if (revealScale <= 1 || event.button !== 0) return;
    revealDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: revealPanX,
      originY: revealPanY,
    };
    revealClayFrame.classList.add("is-dragging");
    revealClayFrame.setPointerCapture?.(event.pointerId);
  });

  revealClayFrame?.addEventListener("pointermove", (event) => {
    if (!revealDrag || revealDrag.pointerId !== event.pointerId) return;
    revealPanX =
      revealDrag.originX + event.clientX - revealDrag.startX;
    revealPanY =
      revealDrag.originY + event.clientY - revealDrag.startY;
    clampRevealPan();
    applyRevealViewerTransform();
  });

  const endRevealDrag = (event) => {
    if (!revealDrag || revealDrag.pointerId !== event.pointerId) return;
    if (revealClayFrame?.hasPointerCapture?.(event.pointerId)) {
      revealClayFrame.releasePointerCapture(event.pointerId);
    }
    revealDrag = null;
    revealClayFrame?.classList.remove("is-dragging");
  };
  revealClayFrame?.addEventListener("pointerup", endRevealDrag);
  revealClayFrame?.addEventListener("pointercancel", endRevealDrag);
  revealClayFrame?.addEventListener("lostpointercapture", endRevealDrag);

  revealClayFrame?.addEventListener(
    "wheel",
    (event) => {
      if (revealViewer.hidden) return;
      event.preventDefault();
      const rect = revealClayFrame.getBoundingClientRect();
      const anchor = {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      };
      const nextScale =
        revealScale * Math.exp(-event.deltaY * 0.0015);
      setRevealViewerScale(nextScale, anchor);
    },
    { passive: false },
  );

  originalButtons.forEach((button) => {
    button.addEventListener("click", openOriginal);
  });
  preludeReader.addEventListener("scroll", updatePreludeReading, {
    passive: true,
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(updatePreludeReading).observe(preludeReader);
    const restaurantResizeObserver = new ResizeObserver(
      syncRestaurantHotspotLayer,
    );
    if (restaurantPage) restaurantResizeObserver.observe(restaurantPage);
    if (restaurantBackground) {
      restaurantResizeObserver.observe(restaurantBackground);
    }
    const revealResizeObserver = new ResizeObserver(
      syncRevealHotspotLayer,
    );
    if (revealPage) revealResizeObserver.observe(revealPage);
    if (revealBackground) {
      revealResizeObserver.observe(revealBackground);
    }
  }
  restaurantBackground?.addEventListener("load", syncRestaurantHotspotLayer);
  revealBackground?.addEventListener("load", syncRevealHotspotLayer);
  observeBackgroundMockery?.addEventListener("load", () => {
    void observeBackgroundMockery.decode?.().catch(() => {});
  });
  window.addEventListener("resize", () => {
    syncRestaurantHotspotLayer();
    syncRevealHotspotLayer();
  });
  skipButton.addEventListener("click", openOriginal);
  originalButton.addEventListener("click", openOriginal);
  originalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => closeOriginal());
  });

  renderOriginalText();
  renderObserveScene("appearance");

  backButton.addEventListener("click", () => close());
  restartButton.addEventListener("click", resetExperience);
  reflectionRestart.addEventListener("click", resetExperience);

  document.addEventListener("keydown", (event) => {
    if (experience.hidden) return;
    if (event.key === "Escape" && !revealViewer.hidden) {
      event.preventDefault();
      closeRevealViewer();
      return;
    }
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
    if (event.key !== "Tab") return;
    if (!revealViewer.hidden) {
      const focusable = [
        ...revealViewer.querySelectorAll(
          "button:not([disabled]), [tabindex='0']",
        ),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (originalModal.hidden) return;
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

  window.niRenZhangStory = {
    open,
    close,
    closeSilently,
    showPage,
    getCurrentPage: () => currentPage,
    getObserveScene: () => observeScene,
    getRevealScene: () => revealScene,
    syncRestaurantHotspots: syncRestaurantHotspotLayer,
    syncRevealHotspots: syncRevealHotspotLayer,
    getRevealViewerState: () => ({
      open: !revealViewer.hidden,
      scale: revealScale,
      x: revealPanX,
      y: revealPanY,
    }),
    getPreludeState: () => {
      const maxScroll =
        preludeReader.scrollHeight - preludeReader.clientHeight;
      return {
        started: preludeStarted,
        complete: preludeComplete,
        scrollTop: preludeReader.scrollTop,
        maxScroll: Math.max(0, maxScroll),
      };
    },
  };
})();
