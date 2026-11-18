(() => {
  "use strict";

  const READING_KICKER = "《俗世奇人》· 原文阅读";
  const actionOrder = Object.freeze({
    skip: 10,
    original: 20,
    restart: 30,
    motion: 40,
    sound: 50,
  });

  const stories = [
    {
      id: "goubuli",
      title: "狗不理",
      root: "#dogBuLiExperience",
      toolbar: ".dog-toolbar",
      titleBlock: ".dog-toolbar-title",
      actions: ".dog-toolbar-actions",
      back: ".dog-back-button",
      chapters: ".dog-step-nav",
      chapterButton: "[data-dog-page]",
    },
    {
      id: "nirenzhang",
      title: "泥人张",
      root: "#niRenZhangExperience",
      toolbar: ".nr-toolbar",
      titleBlock: ".nr-toolbar-title",
      actions: ".nr-toolbar-actions",
      back: ".nr-back-button",
      chapters: ".nr-step-nav",
      chapterButton: "[data-nr-page]",
    },
    {
      id: "heitou",
      title: "黑头",
      root: "#heiTouExperience",
      toolbar: ".story-toolbar",
      titleBlock: ".story-toolbar-title",
      actions: ".story-toolbar-actions",
      back: ".story-back",
      chapters: ".story-step-nav",
      chapterButton: "[data-story-page]",
    },
    {
      id: "sishibayang",
      title: "四十八样",
      root: "body",
      toolbar: ".topbar",
      titleBlock: ".wordmark",
      actions: ".utility-nav",
      back: ".back-link",
      chapters: "#sishiChapterNav",
      chapterButton: "[data-sishi-page]",
    },
  ];

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  function setClass(element, className, enabled = true) {
    if (element) element.classList.toggle(className, enabled);
  }

  function actionType(element) {
    const id = element.id || "";
    const text = element.textContent.trim();
    if (/skip/i.test(id) || text.includes("跳过")) return "skip";
    if (/original|readingEntry/i.test(id) || text.includes("原文")) {
      return "original";
    }
    if (/restart/i.test(id) || text.includes("重新体验")) return "restart";
    if (/motion/i.test(id) || text.includes("动画")) return "motion";
    if (/sound|audio/i.test(id) || /街声|声音|雨声/.test(text)) return "sound";
    return "";
  }

  function normalizeActions(config, actions) {
    if (!actions) return;
    [...actions.children].forEach((element) => {
      const kind = actionType(element);
      if (!kind) return;
      element.dataset.readingAction = kind;
      element.classList.add("reading-nav-button");
      if (kind === "original") {
        const originalText = element.querySelector("span");
        if (!originalText) element.textContent = "阅读原文";
      }
    });

    const placeholder = actions.querySelector(".nr-audio-state");
    if (placeholder) {
      placeholder.classList.add("reading-nav-placeholder");
      placeholder.setAttribute("aria-hidden", "true");
    }

    const elements = [...actions.children].filter(
      (element) =>
        element.matches("button, a") &&
        element.dataset.readingAction in actionOrder,
    );
    elements.sort(
      (first, second) =>
        actionOrder[first.dataset.readingAction] -
        actionOrder[second.dataset.readingAction],
    );
    elements.forEach((element) => actions.append(element));

    if (config.id === "heitou" && !actions.querySelector("#heitouNavOriginal")) {
      const readOriginal = document.createElement("button");
      readOriginal.id = "heitouNavOriginal";
      readOriginal.className = "reading-nav-button";
      readOriginal.type = "button";
      readOriginal.textContent = "阅读原文";
      readOriginal.dataset.readingAction = "original";
      readOriginal.setAttribute("aria-label", "阅读《黑头》原文");
      readOriginal.addEventListener("click", () => {
        document
          .querySelector(
            '.story-step-nav [data-story-page="ending"]',
          )
          ?.click();
      });
      const firstNonOriginal = elements.find(
        (element) => element.dataset.readingAction !== "original",
      );
      actions.insertBefore(readOriginal, firstNonOriginal || null);
    }
  }

  function normalizeChapters(config, nav) {
    if (!nav) return;
    const buttons = [
      ...nav.querySelectorAll(config.chapterButton),
    ];
    buttons.forEach((button, index) => {
      const number = `${index + 1}`.padStart(2, "0");
      const isReflection = index === buttons.length - 1;
      const labelNode =
        button.querySelector("strong") ||
        button.querySelector("[data-reading-chapter-label]");
      const label = labelNode?.textContent.trim() || "";
      const numberNode =
        button.querySelector("span") ||
        button.querySelector("[data-reading-chapter-number]");
      if (numberNode) {
        numberNode.textContent = isReflection ? "笺" : number;
        numberNode.classList.add("reading-chapter-number");
        numberNode.classList.toggle(
          "reading-chapter-number--note",
          isReflection,
        );
      }
      button.classList.add("reading-chapter-link");
      button.dataset.readingChapterIndex = number;
      if (isReflection && labelNode) {
        labelNode.textContent = "读后";
      }
      if (isReflection) {
        button.setAttribute("aria-label", "读后");
      } else if (label) {
        button.setAttribute("aria-label", `${number} ${label}`);
      }
    });
    nav.style.setProperty("--reading-chapter-count", String(buttons.length));
    nav.dataset.readingChapterCount = String(buttons.length);

    if (!nav.dataset.readingObserverReady) {
      const observer = new MutationObserver(() => {
        const current = nav.querySelector(
          '.reading-chapter-link[aria-current="page"]',
        );
        if (
          current &&
          nav.scrollWidth > nav.clientWidth + 2
        ) {
          current.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: reduceMotion.matches ? "auto" : "smooth",
          });
        }
      });
      observer.observe(nav, {
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-current"],
      });
      nav.dataset.readingObserverReady = "true";
    }
  }

  function decorate(config) {
    const root = document.querySelector(config.root);
    if (!root) return;
    const toolbar = document.querySelector(config.toolbar);
    const titleBlock = document.querySelector(config.titleBlock);
    const actions = document.querySelector(config.actions);
    const back = document.querySelector(config.back);
    const chapters = document.querySelector(config.chapters);

    if (!toolbar || !titleBlock || !chapters) return;
    toolbar.classList.add("reading-global-nav");
    toolbar.dataset.readingStory = config.id;
    titleBlock.classList.add("reading-nav-title");
    actions?.classList.add("reading-nav-actions");
    back?.classList.add("reading-nav-back");
    chapters.classList.add("reading-chapter-nav");

    const kicker = titleBlock.querySelector("span");
    const title = titleBlock.querySelector("strong");
    if (kicker) kicker.textContent = READING_KICKER;
    if (title) title.textContent = config.title;
    if (back) back.setAttribute("aria-label", "返回天津老街");

    normalizeActions(config, actions);
    normalizeChapters(config, chapters);
  }

  function refresh() {
    document.body.classList.add("story-reading-navigation-ready");
    stories.forEach(decorate);
  }

  refresh();

  window.StoryReadingNavigation = Object.freeze({
    refresh,
    readingKicker: READING_KICKER,
  });
})();
