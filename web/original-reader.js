(() => {
  "use strict";

  const KICKER = "冯骥才 · 原著阅读";
  const SOURCE_NOTE = "摘自冯骥才著《俗世奇人》原文片段";
  const CHINESE_NUMBERS = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
  ];

  const STORIES = Object.freeze({
    goubuli: {
      id: "goubuli",
      sourceId: "gou-bu-li",
      title: "狗不理",
      pageRoot: "#dogBuLiExperience",
      navSelector: "[data-dog-page]",
    },
    nirenzhang: {
      id: "nirenzhang",
      sourceId: "ni-ren-zhang",
      title: "泥人张",
      pageRoot: "#niRenZhangExperience",
      navSelector: "[data-nr-page]",
    },
    heitou: {
      id: "heitou",
      sourceId: "hei-tou",
      title: "黑头",
      pageRoot: "#heiTouExperience",
      navSelector: "[data-story-page]",
    },
  });

  const triggerSelectors = Object.freeze([
    {
      storyId: "goubuli",
      selector: "[data-dog-original], #dogOriginalButton, #dogSkipButton",
    },
    {
      storyId: "nirenzhang",
      selector:
        "[data-nr-original], #niRenZhangOriginalButton, #niRenZhangSkipButton",
    },
    {
      storyId: "heitou",
      selector: '[data-original-reader="heitou"], #heitouNavOriginal',
    },
  ]);

  let dialog = null;
  let closeButton = null;
  let title = null;
  let previousButton = null;
  let nextButton = null;
  let progress = null;
  let chapters = null;
  let text = null;
  let source = null;
  let returnButton = null;

  let activeStory = null;
  let activeChapters = [];
  let activeTrigger = null;
  let chapterButtons = [];

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  function createElement(tagName, className, content) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement("dialog");
    dialog.id = "sharedOriginalReader";
    dialog.className = "shared-original-reader";
    dialog.setAttribute("aria-labelledby", "sharedOriginalReaderTitle");

    closeButton = createElement(
      "button",
      "shared-original-reader__close",
      "×",
    );
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "关闭原文阅读");
    closeButton.addEventListener("click", close);

    const eyebrow = createElement(
      "p",
      "shared-original-reader__eyebrow",
      KICKER,
    );
    title = createElement("h2", "shared-original-reader__title");
    title.id = "sharedOriginalReaderTitle";

    const tools = createElement("div", "shared-original-reader__tools");
    previousButton = createElement("button", "", "上一节");
    previousButton.type = "button";
    previousButton.addEventListener("click", () => moveChapter(-1));
    nextButton = createElement("button", "", "下一节");
    nextButton.type = "button";
    nextButton.addEventListener("click", () => moveChapter(1));
    progress = createElement(
      "strong",
      "shared-original-reader__progress",
      "已读 0%",
    );
    tools.append(previousButton, progress, nextButton);

    chapters = createElement("nav", "shared-original-reader__chapters");
    chapters.setAttribute("aria-label", "原文章节跳转");

    text = createElement("div", "shared-original-reader__text");

    const meta = createElement("div", "shared-original-reader__meta");
    const metaLabel = createElement("span", "", "原文来源");
    source = createElement("strong");
    meta.append(metaLabel, source);

    returnButton = createElement(
      "button",
      "shared-original-reader__return",
      "返回故事",
    );
    returnButton.type = "button";
    returnButton.addEventListener("click", close);

    const footer = createElement(
      "div",
      "shared-original-reader__footer",
    );
    footer.append(returnButton);

    dialog.append(
      closeButton,
      eyebrow,
      title,
      tools,
      chapters,
      text,
      meta,
      footer,
    );
    document.body.append(dialog);

    dialog.addEventListener("scroll", updateControls, { passive: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("close", () => {
      const trigger = activeTrigger;
      activeTrigger = null;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }

  function navLabelMap(config) {
    const map = new Map();
    document
      .querySelectorAll(`${config.pageRoot} ${config.navSelector}`)
      .forEach((button) => {
        const key =
          button.dataset.dogPage ||
          button.dataset.nrPage ||
          button.dataset.storyPage;
        const label = button.querySelector("strong")?.textContent.trim();
        if (key && label && !map.has(key)) map.set(key, label);
      });
    return map;
  }

  function buildChapters(config, originalStory) {
    const firstParagraphByScene = new Map();
    originalStory.paragraphs.forEach((paragraph) => {
      paragraph.sceneIds.forEach((sceneId) => {
        if (!firstParagraphByScene.has(sceneId)) {
          firstParagraphByScene.set(sceneId, paragraph.order);
        }
      });
    });
    const labels = navLabelMap(config);
    const entries = [...firstParagraphByScene.entries()]
      .map(([sceneId, start]) => ({
        sceneId,
        start,
        label: labels.get(sceneId) || sceneId,
      }))
      .sort((first, second) => first.start - second.start);
    return entries.map((chapter, index) => ({
      ...chapter,
      index,
      end: entries[index + 1]?.start ?? originalStory.paragraphs.length + 1,
    }));
  }

  function renderChapters() {
    chapters.replaceChildren();
    chapterButtons = activeChapters.map((chapter) => {
      const number = CHINESE_NUMBERS[chapter.index] || chapter.index + 1;
      const button = createElement(
        "button",
        "",
        `第${number}章 ${chapter.label}`,
      );
      button.type = "button";
      button.dataset.chapterIndex = String(chapter.index);
      button.dataset.chapterStart = String(chapter.start);
      button.addEventListener("click", () => scrollToChapter(chapter.index));
      chapters.append(button);
      return button;
    });
  }

  function renderStory(config, originalStory) {
    title.textContent = config.title;
    text.replaceChildren();
    originalStory.paragraphs.forEach((paragraph) => {
      const element = document.createElement("p");
      element.id = paragraph.paragraphId;
      element.dataset.originalOrder = String(paragraph.order);
      element.dataset.sceneIds = paragraph.sceneIds.join(" ");
      element.dataset.sourceVerified = String(paragraph.sourceVerified);
      element.textContent = paragraph.content;
      text.append(element);
    });
    source.textContent = SOURCE_NOTE;
    activeChapters = buildChapters(config, originalStory);
    renderChapters();
  }

  function chapterIndexAt(order) {
    let index = 0;
    activeChapters.forEach((chapter, chapterIndex) => {
      if (order >= chapter.start) index = chapterIndex;
    });
    return index;
  }

  function updateControls() {
    if (!dialog?.open || !activeChapters.length) return;
    const maxScroll = Math.max(
      1,
      dialog.scrollHeight - dialog.clientHeight,
    );
    const percentage = Math.min(
      100,
      Math.max(0, Math.round((dialog.scrollTop / maxScroll) * 100)),
    );
    progress.textContent = `已读 ${percentage}%`;

    const marker = dialog.scrollTop + 130;
    const paragraphs = [...text.querySelectorAll("[data-original-order]")];
    const currentParagraph =
      [...paragraphs]
        .reverse()
        .find((paragraph) => paragraph.offsetTop <= marker) ||
      paragraphs[0];
    const order = Number(currentParagraph?.dataset.originalOrder || 1);
    const currentIndex =
      dialog.scrollTop >= maxScroll - 2
        ? activeChapters.length - 1
        : chapterIndexAt(order);
    chapterButtons.forEach((button, index) => {
      if (index === currentIndex) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    previousButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= activeChapters.length - 1;
  }

  function scrollToChapter(index) {
    const chapter = activeChapters[index];
    const target = chapter
      ? text.querySelector(`[data-original-order="${chapter.start}"]`)
      : null;
    if (!target) return;
    dialog.scrollTo({
      top: Math.max(0, target.offsetTop - 120),
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  }

  function currentChapterIndex() {
    const index = chapterButtons.findIndex(
      (button) => button.getAttribute("aria-current") === "page",
    );
    return index < 0 ? 0 : index;
  }

  function moveChapter(direction) {
    const next = Math.max(
      0,
      Math.min(
        activeChapters.length - 1,
        currentChapterIndex() + direction,
      ),
    );
    scrollToChapter(next);
  }

  function open(storyId, options = {}) {
    const config = STORIES[storyId];
    const originalStory =
      window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.[config?.sourceId];
    if (!config || !originalStory) return;
    buildDialog();
    activeStory = storyId;
    activeTrigger =
      options.trigger instanceof HTMLElement
        ? options.trigger
        : document.activeElement;
    if (dialog.open) dialog.close();
    renderStory(config, originalStory);
    dialog.scrollTop = 0;
    previousButton.disabled = true;
    nextButton.disabled = activeChapters.length <= 1;
    progress.textContent = "已读 0%";

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    closeButton.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      if (options.targetScene) {
        const index = activeChapters.findIndex(
          (chapter) => chapter.sceneId === options.targetScene,
        );
        if (index >= 0) scrollToChapter(index);
      }
      updateControls();
    });
  }

  function close() {
    if (!dialog?.open) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new Event("close"));
    }
  }

  function storyIdForTrigger(trigger) {
    return triggerSelectors.find((entry) =>
      trigger.matches(entry.selector),
    )?.storyId;
  }

  function installTriggers() {
    const selector = triggerSelectors
      .map((entry) => entry.selector)
      .join(",");
    document
      .querySelectorAll(selector)
      .forEach((trigger) => trigger.setAttribute("aria-haspopup", "dialog"));

    document.addEventListener(
      "click",
      (event) => {
        const trigger = event.target.closest(selector);
        if (!trigger) return;
        const storyId = storyIdForTrigger(trigger);
        if (!storyId) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        open(storyId, { trigger });
      },
      true,
    );
  }

  installTriggers();

  window.OriginalReadingModal = Object.freeze({
    open,
    close,
    stories: STORIES,
    getSnapshot: () => ({
      activeStory,
      open: Boolean(dialog?.open),
      progress: progress?.textContent || "",
      chapters: activeChapters.map((chapter) => ({ ...chapter })),
    }),
  });
})();
