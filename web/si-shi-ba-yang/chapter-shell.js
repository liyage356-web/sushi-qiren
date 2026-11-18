(() => {
  "use strict";

  const story = window.SUSHI_QIREN_ORIGINAL_TEXT?.stories?.["si-shi-ba-yang"];
  const main = document.querySelector("#mainContent");
  const opening = document.querySelector(".opening");
  if (!main || !opening || !story) return;

  const pageOrder = [
    "chapter1",
    "chapter2",
    "chapter3",
    "chapter4",
    "chapter5",
    "chapter6",
    "chapter7",
  ];
  const chapterMeta = {
    chapter1: {
      number: "第一章",
      title: "默默无闻的卖糖人",
      start: 1,
      end: 5,
      hasInteraction: true,
    },
    chapter2: {
      number: "第二章",
      title: "刘二爷指点绝活",
      start: 6,
      end: 12,
    },
    chapter3: {
      number: "第三章",
      title: "二龙戏珠的新挑担",
      start: 13,
      end: 14,
      hasInteraction: true,
    },
    chapter4: {
      number: "第四章",
      title: "走八字的真把式",
      start: 15,
      end: 17,
      hasInteraction: true,
    },
    chapter5: {
      number: "第五章",
      title: "绝活也有人偷学",
      start: 18,
      end: 21,
      hasInteraction: true,
    },
    chapter6: {
      number: "第六章",
      title: "六句天津话",
      start: 22,
      end: 32,
      hasInteraction: true,
    },
    chapter7: {
      number: "第七章",
      title: "一担绝活的余韵",
      start: 33,
      end: 34,
    },
  };

  const pageButtons = [
    ...document.querySelectorAll("[data-sishi-page]"),
  ];
  const chapterNav = document.querySelector("#sishiChapterNav");
  const liveStatus = document.querySelector("#sishiLiveStatus");
  const readingDialog = document.querySelector("#readingDialog");
  const readingText = document.querySelector("#readingText");
  const skipButton = document.querySelector("#chapterSkipButton");
  const chapterRestartButton = document.querySelector(
    "#chapterRestartButton",
  );
  const restartButton = document.querySelector("#restartButton");
  const streetScene = document.querySelector("#streetScene");
  const discovery = document.querySelector(".discovery-section");
  streetScene?.remove();
  discovery?.remove();
  const manuscripts = document.querySelector(".manuscripts-section");
  const candy = document.querySelector("#candyCabinet");
  const assembly = document.querySelector("#assemblyBackyard");
  const walk = document.querySelector("#walkFigureEight");
  const innovation = document.querySelector("#innovationStage");
  const words = document.querySelector("#wordsStage");
  const stageEnd = document.querySelector(".stage-end");
  const siteFooter = document.querySelector(".site-footer");
  const resumeKey = "sishi-reading-progress-v1";
  const reflectionKey = "sishi-reflection-v1";

  let currentPage = "cover";
  let currentReader = null;
  let lastFocusedPageButton = null;
  const pageScroll = {};
  const completedPages = new Set();

  function announce(message) {
    if (!liveStatus) return;
    liveStatus.textContent = "";
    window.requestAnimationFrame(() => {
      liveStatus.textContent = message;
    });
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(resumeKey) || "{}");
      if (pageOrder.includes(saved.page)) {
        // Saved automatically without jumping away from the cover.
        opening.dataset.resumePage = saved.page;
      }
      if (Array.isArray(saved.completedPages)) {
        saved.completedPages.forEach((page) => {
          if (pageOrder.includes(page)) completedPages.add(page);
        });
      }
    } catch {
      // Local storage is optional; reading still works without it.
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(
        resumeKey,
        JSON.stringify({
          page: currentPage === "cover" ? "chapter1" : currentPage,
          completedPages: [...completedPages],
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore storage restrictions.
    }
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createChapterMarker(chapterName) {
    const meta = chapterMeta[chapterName];
    const marker = createElement("header", "sishi-chapter-marker");
    marker.id = `sishiMarker-${chapterName}`;
    const label = createElement("span", "", `${meta.number} · 原文阅读`);
    const title = createElement("strong", "", meta.title);
    marker.append(label, title);
    return marker;
  }

  function getParagraphs(start, end) {
    return story.paragraphs.filter(
      (paragraph) => paragraph.order >= start && paragraph.order <= end,
    );
  }

  function createOriginalReader(chapterName) {
    const meta = chapterMeta[chapterName];
    const article = createElement("article", "sishi-original");
    article.id = `sishiOriginal-${chapterName}`;
    article.tabIndex = -1;

    const header = createElement("header", "sishi-original-head");
    const titleGroup = createElement("div");
    const eyebrow = createElement(
      "p",
      "",
      `${meta.number} · 冯骥才《四十八样》`,
    );
    const title = createElement("h2", "", meta.title);
    titleGroup.append(eyebrow, title);
    const count = createElement(
      "small",
      "",
      `原文 ${meta.start}—${meta.end} 段`,
    );
    header.append(titleGroup, count);

    const text = createElement("div", "sishi-original-text nr-original-text");
    getParagraphs(meta.start, meta.end).forEach((paragraph) => {
      const element = createElement("p", "", paragraph.content);
      element.id = `chapter-${paragraph.paragraphId}`;
      element.dataset.sishiParagraph = String(paragraph.order);
      text.append(element);
    });

    const progress = createElement("div", "sishi-original-progress");
    const progressLabel = createElement("span", "", "本章阅读进度");
    const track = document.createElement("span");
    const fill = document.createElement("i");
    track.append(fill);
    const progressValue = createElement("strong", "", "0%");
    progress.append(progressLabel, track, progressValue);

    const footer = createElement("footer", "sishi-original-footer");
    const originalButton = createElement("button", "", "打开完整原文");
    originalButton.type = "button";
    originalButton.addEventListener("click", () => {
      document.querySelector("#readingEntry").click();
    });

    if (meta.hasInteraction) {
      const enterButton = createElement(
        "button",
        "is-primary",
        "进入本段互动",
      );
      enterButton.type = "button";
      enterButton.addEventListener("click", () => {
        enterInteraction(chapterName);
      });
      footer.append(originalButton, enterButton);
    } else if (chapterName === "chapter2") {
      const nextReadingButton = createElement(
        "button",
        "is-primary",
        "去看二龙戏珠 →",
      );
      nextReadingButton.type = "button";
      nextReadingButton.addEventListener("click", () => {
        routeAction("chapter3", "#sishiOriginal-chapter3");
      });
      footer.classList.add("has-next-reading");
      footer.append(originalButton, nextReadingButton);
    } else {
      footer.append(originalButton);
    }

    article.append(header, text, progress, footer);
    article.dataset.progressFill = "0";
    article._sishiFill = fill;
    article._sishiValue = progressValue;
    return article;
  }

  function prepareInteractiveSection(chapterName, section) {
    if (!section) return;
    const marker = createChapterMarker(chapterName);
    const reader = createOriginalReader(chapterName);
    section.prepend(marker);
    marker.after(reader);
    prepareInteractionContent(chapterName, section, reader);
  }

  function prepareInteractionContent(chapterName, section, insertionPoint = null) {
    if (!section) return;
    const content = createElement("div", "sishi-interaction-content");
    content.hidden = true;
    const hasVisibleReader = insertionPoint?.parentNode === section;
    if (hasVisibleReader) {
      insertionPoint.after(content);
    } else {
      section.hidden = true;
      section.prepend(content);
    }
    const movingNodes = [];
    let node = content.nextSibling;
    while (node) {
      movingNodes.push(node);
      node = node.nextSibling;
    }
    movingNodes.forEach((item) => content.append(item));
    section.dataset.sishiInteraction = "ready";
    section.dataset.sishiInteractionFor = chapterName;
  }

  function createChapterTwoSection() {
    const section = createElement("section", "sishi-chapter sishi-ending");
    section.id = "sishiChapter2";
    section.append(
      createChapterMarker("chapter2"),
      createOriginalReader("chapter2"),
    );

    const note = createElement("article", "sishi-scene-note");
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = "assets/signature-carry.webp";
    image.alt = "刘二爷与俞六在院中商议药糖挑担，身旁是一整排药糖盒";
    image.loading = "lazy";
    figure.append(image);
    const copy = document.createElement("article");
    copy.append(
      createElement("p", "", "院中一问"),
      createElement("h3", "", "绝活，一是琢磨，二是练"),
      createElement(
        "span",
        "",
        "刘二爷点出俞六不善吆喝的短处，也把路指回来：不必学别人的热闹，得从自己的糖和手上再找出新法儿。",
      ),
    );
    note.append(figure, copy);
    section.append(note);
    return section;
  }

  function createChapterSevenSection() {
    const section = createElement("section", "sishi-ending");
    section.id = "sishiChapter7";
    section.append(
      createChapterMarker("chapter7"),
      createOriginalReader("chapter7"),
    );

    const hero = createElement("section", "sishi-ending-hero");
    const copy = createElement("article", "sishi-ending-copy");
    copy.append(
      createElement("p", "", "篇末 · 八天一轮"),
      createElement("h2", "", "糖送到了人走以后"),
      createElement(
        "p",
        "",
        "俞六天天给刘二爷送糖，一天六块，一天换一样，八天正好送遍四十八样。他的手艺后继无人，这份记挂却留在了长年的药糖里。",
      ),
    );

    const eightDays = createElement("aside", "sishi-eight-days");
    const grid = createElement("div", "sishi-eight-grid");
    ["一", "二", "三", "四", "五", "六", "七", "八"].forEach((day) => {
      grid.append(createElement("i", "", day));
    });
    const pending = createElement(
      "button",
      "",
      "八天送糖图鉴 · 待接入",
    );
    pending.type = "button";
    pending.disabled = true;
    pending.title = "原规划入口，本轮不重做尚未开发的互动";
    eightDays.append(
      createElement("span", "", "结尾互动规划入口"),
      grid,
      createElement("strong", "", "每天六块，换一样糖"),
      createElement(
        "p",
        "",
        "保留原有规划入口；本轮不把这段尚未开发的互动替换成简易点击。",
      ),
      pending,
    );
    hero.append(copy, eightDays);

    const reflection = createElement("article", "sishi-reflection");
    reflection.append(
      createElement("p", "", "读后感悟 · 只留给自己"),
      createElement("h3", "", "绝活之外，还留下了什么？"),
    );
    const prompts = createElement("div", "sishi-reflection-prompts");
    ["琢磨", "练功", "创新", "人情", "余韵"].forEach((word) => {
      const button = createElement("button", "", word);
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        const active = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!active));
        saveReflection();
      });
      prompts.append(button);
    });
    const textarea = document.createElement("textarea");
    textarea.id = "sishiReflectionText";
    textarea.maxLength = 1200;
    textarea.placeholder =
      "可以从一担糖、一次绕桶，或最后八天的送糖写起。";
    const status = createElement(
      "p",
      "sishi-reflection-status",
      "感想只保存在当前浏览器本地。",
    );
    status.setAttribute("aria-live", "polite");
    const actions = createElement("div", "sishi-ending-actions");
    const save = createElement("button", "is-primary", "保存读后感悟");
    save.type = "button";
    save.addEventListener("click", () => saveReflection(true));
    const archive = createElement("a", "", "打开人物档案");
    archive.href = "../index.html#archive";
    const street = createElement("a", "", "返回天津老街");
    street.href = "../index.html#street";
    actions.append(save, archive, street);
    reflection.append(prompts, textarea, status, actions);

    section.append(hero, reflection);
    section._sishiReflection = {
      textarea,
      prompts,
      status,
    };
    return section;
  }

  function saveReflection(showFeedback = false) {
    const reflection = document.querySelector("#sishiChapter7")?._sishiReflection;
    if (!reflection) return;
    const value = {
      text: reflection.textarea.value,
      words: [
        ...reflection.prompts.querySelectorAll(
          "button[aria-pressed='true']",
        ),
      ].map((button) => button.textContent),
      savedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(reflectionKey, JSON.stringify(value));
      if (showFeedback) {
        reflection.status.textContent = "读后感悟已保存在当前浏览器。";
        announce("读后感悟已保存");
      }
    } catch {
      if (showFeedback) {
        reflection.status.textContent = "当前浏览器未能保存读后感悟。";
      }
    }
  }

  function loadReflection() {
    const reflection = document.querySelector("#sishiChapter7")?._sishiReflection;
    if (!reflection) return;
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(reflectionKey) || "{}",
      );
      reflection.textarea.value = saved.text || "";
      const words = new Set(saved.words || []);
      reflection.prompts
        .querySelectorAll("button")
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(words.has(button.textContent)),
          );
        });
      if (saved.savedAt) {
        reflection.status.textContent = "已载入上次保存的读后感悟。";
      }
    } catch {
      // Keep the blank local reflection form.
    }
  }

  function enterInteraction(chapterName) {
    const section = document.querySelector(
      `[data-sishi-interaction-for="${chapterName}"]`,
    );
    const content = section?.querySelector(".sishi-interaction-content");
    if (!content) return;
    section.hidden = false;
    content.hidden = false;
    completedPages.add(chapterName);
    saveState();
    updateNavState();
    window.requestAnimationFrame(() => {
      scrollToElement(content);
      const focusTarget = content.querySelector(
        "[data-assembly-step], [data-walk-action], [data-innovation-step], #wordNext, .candy-box",
      );
      focusTarget?.focus?.({ preventScroll: true });
    });
    announce(`${chapterMeta[chapterName].number}互动内容已打开`);
  }

  function nextChapter(pageName) {
    const index = pageOrder.indexOf(pageName);
    return pageOrder[Math.min(pageOrder.length - 1, index + 1)];
  }

  function previousChapter(pageName) {
    const index = pageOrder.indexOf(pageName);
    return pageOrder[Math.max(0, index - 1)];
  }

  function getActiveSections(pageName) {
    if (pageName === "cover") return new Set([opening]);
    const sections = {
      chapter1: [
        document.querySelector("#sishiChapter1"),
        document.querySelector("#candyCabinet"),
      ],
      chapter2: [document.querySelector("#sishiChapter2")],
      chapter3: [document.querySelector("#assemblyBackyard")],
      chapter4: [document.querySelector("#walkFigureEight")],
      chapter5: [document.querySelector("#innovationStage")],
      chapter6: [document.querySelector("#wordsStage")],
      chapter7: [document.querySelector("#sishiChapter7")],
    };
    return new Set((sections[pageName] || []).filter(Boolean));
  }

  function allDirectSections() {
    return [
      ...main.querySelectorAll(
        ":scope > section, :scope > article, :scope > div",
      ),
    ];
  }

  function updateNavState() {
    pageButtons.forEach((button) => {
      const active = button.dataset.sishiPage === currentPage;
      button.toggleAttribute("aria-current", active);
      if (active) button.setAttribute("aria-current", "page");
      button.classList.toggle(
        "is-read",
        completedPages.has(button.dataset.sishiPage),
      );
    });
  }

  function scrollToElement(element) {
    if (!element) return;
    const toolbar = document.querySelector(".topbar");
    const nav = document.querySelector("#sishiChapterNav");
    const offset =
      (toolbar?.getBoundingClientRect().height || 0) +
      (nav?.hidden ? 0 : nav?.getBoundingClientRect().height || 0) +
      12;
    const top = window.scrollY + element.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }

  function showPage(pageName, pushHistory = true, restoreScroll = true) {
    if (pageName !== "cover" && !pageOrder.includes(pageName)) {
      pageName = "chapter1";
    }
    if (currentPage !== pageName) {
      pageScroll[currentPage] = window.scrollY;
    }
    currentPage = pageName;
    const isCover = pageName === "cover";
    const activeSections = getActiveSections(pageName);

    document.body.classList.add("sishi-shell-active");
    document.body.classList.toggle("sishi-cover-mode", isCover);
    document.body.dataset.sishiPage = pageName;
    if (chapterNav) chapterNav.hidden = isCover;
    skipButton.hidden = isCover;
    chapterRestartButton.hidden = isCover;

    allDirectSections().forEach((section) => {
      section.classList.toggle("sishi-page-hidden", !activeSections.has(section));
    });

    updateNavState();
    const target = isCover
      ? opening.querySelector("#pageTitle")
      : document.querySelector(`#sishiMarker-${pageName}`) ||
        activeSections.values().next().value;

    if (pushHistory) {
      history.pushState(
        { view: "si-shi-ba-yang", page: pageName },
        "",
        `#sishi/${pageName}`,
      );
    }

    window.requestAnimationFrame(() => {
      if (restoreScroll && pageName !== "cover") {
        const savedScroll = pageScroll[pageName] || 0;
        window.scrollTo({ top: savedScroll, behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      target?.focus?.({ preventScroll: true });
      updateCurrentReaderProgress();
      if (pageName === "chapter7") {
        window.ReadingReflectionModal?.open("sishibayang", {
          onBack: () => showPage(previousChapter("chapter7"), true, true),
          onRestart: () => {
            restartButton?.click();
            showPage("cover", true, false);
          },
        });
      } else {
        window.ReadingReflectionModal?.notifyPageChange(
          "sishibayang",
          pageName,
        );
      }
    });

    if (!isCover) {
      completedPages.add(pageName);
      saveState();
    }
    announce(
      isCover
        ? "已回到《四十八样》封面"
        : `已进入${chapterMeta[pageName].number}：${chapterMeta[pageName].title}`,
    );
  }

  function applyRoute(pushHistory) {
    const route = window.location.hash.replace(/^#/, "");
    if (route.startsWith("sishi/")) {
      const requested = route.split("/")[1] || "chapter1";
      showPage(requested, pushHistory, true);
      return;
    }
    if (route === "cover") {
      showPage("cover", pushHistory, false);
      return;
    }
    showPage("cover", pushHistory, false);
  }

  function updateReaderProgress(reader) {
    if (!reader) return;
    const rect = reader.getBoundingClientRect();
    const readingLine = window.innerHeight * 0.78;
    const denominator = Math.max(1, rect.height - window.innerHeight * 0.22);
    const travelled = readingLine - rect.top;
    const progress = Math.max(0, Math.min(100, (travelled / denominator) * 100));
    const rounded = Math.round(progress);
    reader.dataset.progressFill = String(rounded);
    reader._sishiFill.style.width = `${progress}%`;
    reader._sishiValue.textContent = `${rounded}%`;
    if (progress >= 85) {
      const chapterName = reader.id.replace("sishiOriginal-", "");
      if (!completedPages.has(chapterName)) {
        completedPages.add(chapterName);
        saveState();
        updateNavState();
      }
    }
  }

  function updateCurrentReaderProgress() {
    currentReader = document.querySelector(
      `#sishiOriginal-${currentPage}`,
    );
    if (currentReader) updateReaderProgress(currentReader);
  }

  function prepareOriginalDialog() {
    if (!readingDialog || !readingText) return;
    if (readingDialog.querySelector(".sishi-original-dialog-tools")) return;

    const tools = createElement("div", "sishi-original-dialog-tools");
    const previous = createElement("button", "", "上一节");
    const next = createElement("button", "", "下一节");
    previous.type = "button";
    next.type = "button";
    const status = createElement("strong", "", "已读 0%");
    previous.addEventListener("click", () => moveDialogSection(-1));
    next.addEventListener("click", () => moveDialogSection(1));
    tools.append(previous, status, next);

    const jumps = createElement("nav", "sishi-original-jumps");
    jumps.setAttribute("aria-label", "原文章节跳转");
    pageOrder.forEach((pageName) => {
      const button = createElement(
        "button",
        "",
        `${chapterMeta[pageName].number} ${chapterMeta[pageName].title}`,
      );
      button.type = "button";
      button.dataset.sishiDialogOrder = String(chapterMeta[pageName].start);
      button.addEventListener("click", () => {
        scrollDialogToOrder(chapterMeta[pageName].start);
      });
      jumps.append(button);
    });

    const heading = readingDialog.querySelector("#readingTitle");
    heading?.after(tools, jumps);
    readingDialog._sishiProgress = status;

    const decorateParagraphs = () => {
      [...readingText.children].forEach((paragraph, index) => {
        paragraph.dataset.sishiOrder = String(index + 1);
      });
      updateDialogProgress();
    };
    decorateParagraphs();
    new MutationObserver(decorateParagraphs).observe(readingText, {
      childList: true,
    });
    readingDialog.addEventListener("scroll", updateDialogProgress, {
      passive: true,
    });
  }

  function scrollDialogToOrder(order) {
    const target = readingText.querySelector(
      `[data-sishi-order="${order}"], #chapter-si-shi-ba-yang-p${String(order).padStart(2, "0")}`,
    );
    if (!target) return;
    readingDialog.scrollTo({
      top: Math.max(0, target.offsetTop - 120),
      behavior: document.body.classList.contains("motion-off")
        ? "auto"
        : "smooth",
    });
  }

  function moveDialogSection(direction) {
    const paragraphs = [...readingText.querySelectorAll("[data-sishi-order]")];
    if (!paragraphs.length) return;
    const marker = readingDialog.scrollTop + 130;
    const currentIndex = Math.max(
      0,
      paragraphs.findIndex((paragraph) => paragraph.offsetTop >= marker),
    );
    const currentOrder = Number(
      paragraphs[currentIndex]?.dataset.sishiOrder || 1,
    );
    const chapterIndex = pageOrder.findIndex((pageName) => {
      const meta = chapterMeta[pageName];
      return currentOrder >= meta.start && currentOrder <= meta.end;
    });
    const nextIndex = Math.max(
      0,
      Math.min(pageOrder.length - 1, chapterIndex + direction),
    );
    scrollDialogToOrder(chapterMeta[pageOrder[nextIndex]].start);
  }

  function updateDialogProgress() {
    if (!readingDialog?._sishiProgress) return;
    const maxScroll = Math.max(
      1,
      readingDialog.scrollHeight - readingDialog.clientHeight,
    );
    const progress = Math.min(
      100,
      Math.max(0, Math.round((readingDialog.scrollTop / maxScroll) * 100)),
    );
    readingDialog._sishiProgress.textContent = `已读 ${progress}%`;
  }

  function prepareCover() {
    const eyebrow = opening.querySelector(".eyebrow");
    const title = opening.querySelector("#pageTitle");
    const lead = opening.querySelector(".opening-lead");
    const enterButton = opening.querySelector("#enterSceneButton");
    const readingButton = opening.querySelector("#readingShortcut");
    const seal = opening.querySelector(".opening-seal");

    eyebrow.textContent = "《俗世奇人》· 第四篇";
    const titleLine = createElement("span", "", "俞六 · 刘二爷 · 一担四十八样");
    title.replaceChildren(document.createTextNode("四十八样"), titleLine);
    lead.textContent =
      "药糖色艳味厚，俞六却不善吆喝。刘二爷一句点拨，引出一担二龙戏珠、一套走八字，也引出天津人既厉害又幽默的六句词。";
    enterButton.firstChild.textContent = "入卷读故事 ";
    if (readingButton) readingButton.textContent = "直接读原著";
    const names = createElement("strong", "sishi-cover-names");
    names.append(
      createElement("span", "", "俞六"),
      createElement("span", "", "刘二爷"),
    );
    seal.replaceChildren(
      createElement("span", "opening-seal__chapter", "本卷"),
      names,
      createElement("span", "opening-seal__stamp", "津"),
    );

    const coverArt = createElement("figure", "sishi-cover-art");
    const caption = document.createElement("figcaption");
    caption.append(
      createElement("span", "", "主题插画 · 二龙戏珠药糖挑担"),
      createElement("strong", "", "琢磨 · 练功 · 创新 · 余韵"),
    );
    coverArt.append(caption);
    opening.insertBefore(coverArt, seal);

    const resumePage = opening.dataset.resumePage;
    if (resumePage && pageOrder.includes(resumePage)) {
      const resume = createElement(
        "button",
        "text-button",
        `继续读${chapterMeta[resumePage].number}`,
      );
      resume.type = "button";
      resume.addEventListener("click", () => {
        showPage(resumePage, true, true);
      });
      opening.querySelector(".opening-actions")?.append(resume);
    }
  }

  function adjustLegacyHeadings() {
    const labels = [
      [candy, "第一章 · 原文后互动", "掀开玻璃盖，先认十二样糖"],
      [assembly, "第三章 · 原文后互动", "一担二龙戏珠，怎样装成"],
      [walk, "第四章 · 原文后互动", "两桶之间，走个八字"],
      [innovation, "第五章 · 原文后互动", "模样学得去，心思要再长一层"],
      [words, "第六章 · 原文后互动", "一句一顿步，走进天津话"],
    ];
    labels.forEach(([section, eyebrowText, titleText]) => {
      if (!section) return;
      const eyebrow = section.querySelector(".section-heading .eyebrow");
      const title = section.querySelector(".section-heading h2");
      if (eyebrow) eyebrow.textContent = eyebrowText;
      if (title && titleText) title.textContent = titleText;
    });
  }

  function routeAction(pageName, targetSelector) {
    showPage(pageName, true, false);
    window.requestAnimationFrame(() => {
      const target = document.querySelector(targetSelector);
      scrollToElement(target);
      target?.focus?.({ preventScroll: true });
    });
  }

  const routeTargets = {
    "#candyCabinet": ["chapter1", "#sishiOriginal-chapter1"],
    "#assemblyBackyard": ["chapter3", "#assemblyBackyard"],
    "#walkFigureEight": ["chapter4", "#walkFigureEight"],
    "#innovationStage": ["chapter5", "#innovationStage"],
    "#wordsStage": ["chapter6", "#wordsStage"],
  };

  document.addEventListener(
    "click",
    (event) => {
      const control = event.target.closest("button, a");
      if (!control) return;

      if (
        control.id === "enterSceneButton" ||
        control.id === "continueButton"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        routeAction("chapter1", "#sishiOriginal-chapter1");
        return;
      }

      if (control.id === "candyToAssembly") {
        event.preventDefault();
        event.stopImmediatePropagation();
        routeAction("chapter2", "#sishiOriginal-chapter2");
        return;
      }

      if (control.matches("a[href^='#']")) {
        const route = routeTargets[control.getAttribute("href")];
        if (route) {
          event.preventDefault();
          event.stopImmediatePropagation();
          routeAction(route[0], route[1]);
        }
      }
    },
    true,
  );

  pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      lastFocusedPageButton = button;
      showPage(button.dataset.sishiPage, true, true);
    });
  });

  skipButton.addEventListener("click", () => {
    if (currentPage === "chapter7") {
      announce("已到篇末，没有可跳过的互动");
      return;
    }
    showPage(nextChapter(currentPage), true, false);
  });

  chapterRestartButton.addEventListener("click", () => {
    restartButton?.click();
    window.setTimeout(() => showPage("cover", true, false), 0);
    announce("已从头重新体验");
  });

  document
    .querySelector(".wordmark")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      showPage("cover", true, false);
    });

  window.addEventListener("popstate", () => applyRoute(false));
  window.addEventListener("hashchange", () => {
    if (document.body.dataset.sishiPage) updateDialogProgress();
  });
  window.addEventListener("scroll", updateCurrentReaderProgress, {
    passive: true,
  });
  window.addEventListener("resize", updateCurrentReaderProgress);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && readingDialog?.open) {
      // The existing reader owns Escape and restores focus.
      return;
    }
  });

  if (manuscripts) manuscripts.classList.add("sishi-internal-reference");
  document
    .querySelector(".phase-rail")
    ?.classList.add("sishi-internal-reference");
  if (stageEnd) stageEnd.classList.add("sishi-internal-reference");
  if (siteFooter) siteFooter.classList.add("sishi-internal-reference");

  const chapter1 = createElement("section", "sishi-chapter");
  chapter1.id = "sishiChapter1";
  chapter1.append(
    createChapterMarker("chapter1"),
    createOriginalReader("chapter1"),
  );
  opening.after(chapter1);
  if (candy) chapter1.after(candy);
  prepareInteractionContent("chapter1", candy);

  const chapter2 = createChapterTwoSection();
  assembly?.before(chapter2);

  prepareInteractiveSection("chapter3", assembly);
  prepareInteractiveSection("chapter4", walk);
  prepareInteractiveSection("chapter5", innovation);
  prepareInteractiveSection("chapter6", words);

  const chapter7 = createChapterSevenSection();
  stageEnd?.before(chapter7);

  loadSavedState();
  prepareCover();
  adjustLegacyHeadings();
  prepareOriginalDialog();
  loadReflection();
  updateNavState();
  applyRoute(false);
  document.documentElement.classList.remove("sishi-direct-load");
})();
