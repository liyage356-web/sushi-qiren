(() => {
  "use strict";

  const GUIDE_TEXT =
    "可以选一个词，也可以写下自己记住的细节。内容只保存在当前浏览器，不会上传到网络。";
  const PLACEHOLDER =
    "写下你对故事人物的理解，或最难忘的一个瞬间……";

  const STORIES = Object.freeze({
    goubuli: {
      id: "goubuli",
      storageKey: "reading-note-goubuli",
      legacyKeys: ["sushi-qiren-gou-bu-li-reflection-v1"],
      question: "你记住了狗子的哪一种品质？",
      keywords: ["用心", "坚持", "智慧", "实在", "手艺", "名声"],
      maxLength: 500,
      sourceSelector: "#dogPageReflection .dog-reflection-sheet",
    },
    nirenzhang: {
      id: "nirenzhang",
      storageKey: "reading-note-nirenzhang",
      legacyKeys: [
        "sushi-qiren-ni-ren-zhang-reflection-v1",
        "reading-note-ni-ren-zhang",
      ],
      question: "泥人张真正让你佩服的是什么？",
      keywords: ["沉着", "骨气", "机智", "手艺", "尊严", "不服输"],
      maxLength: 1200,
      sourceSelector: "#nrPageReflection .nr-reflection-sheet",
    },
    heitou: {
      id: "heitou",
      storageKey: "reading-note-heitou",
      legacyKeys: ["sushi-qiren-hei-tou-reflection-v1"],
      question: "如果黑头能够说话，你最想对它说什么？",
      keywords: ["忠诚", "守护", "误解", "信任", "委屈", "遗憾"],
      maxLength: 1200,
      sourceSelector: "#storyPageReflection .reflection-sheet",
    },
    sishibayang: {
      id: "sishibayang",
      storageKey: "reading-note-sishibayang",
      legacyKeys: ["sishi-reflection-v1"],
      question: "俞六的故事让你怎样理解“绝活”？",
      keywords: ["勤练", "创新", "坚持", "智慧", "感恩", "传承"],
      maxLength: 1200,
      sourceSelector: "#sishiChapter7 .sishi-reflection",
    },
  });

  const drafts = new Map();
  let activeStoryId = "";
  let activeOptions = {};
  let previousFocus = null;
  let layer = null;
  let sheet = null;
  let launcher = null;
  let title = null;
  let keywordList = null;
  let textarea = null;
  let status = null;
  let closeButton = null;

  const clampText = (value, maxLength) =>
    typeof value === "string" ? value.slice(0, maxLength) : "";

  function parseSavedValue(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function readStoredStory(config) {
    let newest = null;
    try {
      newest = parseSavedValue(window.localStorage.getItem(config.storageKey));
    } catch {
      return null;
    }
    if (newest) return newest;

    for (const legacyKey of config.legacyKeys || []) {
      let legacy = null;
      try {
        legacy = parseSavedValue(window.localStorage.getItem(legacyKey));
      } catch {
        return null;
      }
      if (!legacy) continue;
      const keywords = Array.isArray(legacy.keywords)
        ? legacy.keywords
        : Array.isArray(legacy.words)
          ? legacy.words
          : [];
      return {
        storyId: config.id,
        keywords,
        text: clampText(legacy.text, config.maxLength),
        savedAt: typeof legacy.savedAt === "string" ? legacy.savedAt : "",
      };
    }
    return null;
  }

  function normalizeDraft(config, saved = null) {
    const validKeywords = new Set(config.keywords);
    return {
      keywords: Array.isArray(saved?.keywords)
        ? saved.keywords.filter((keyword) => validKeywords.has(keyword))
        : [],
      text: clampText(saved?.text, config.maxLength),
      savedAt: typeof saved?.savedAt === "string" ? saved.savedAt : "",
    };
  }

  function getDraft(config) {
    if (!drafts.has(config.id)) {
      drafts.set(config.id, normalizeDraft(config, readStoredStory(config)));
    }
    return drafts.get(config.id);
  }

  function buildShell() {
    if (layer) return;

    layer = document.createElement("div");
    layer.id = "readingNoteLayer";
    layer.className = "reading-note-layer";
    layer.hidden = true;

    const backdrop = document.createElement("div");
    backdrop.className = "reading-note-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    sheet = document.createElement("article");
    sheet.className = "reading-note-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "readingNoteTitle");
    sheet.setAttribute("aria-describedby", "readingNoteGuide");
    sheet.tabIndex = -1;

    const header = document.createElement("header");
    header.className = "reading-note-header";
    const eyebrow = document.createElement("p");
    eyebrow.className = "reading-note-eyebrow";
    eyebrow.textContent = "读后笺 · 情感出口";
    closeButton = document.createElement("button");
    closeButton.className = "reading-note-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "关闭读后笺");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => closeModal());
    header.append(eyebrow, closeButton);

    title = document.createElement("h2");
    title.id = "readingNoteTitle";
    title.className = "reading-note-title";

    const guide = document.createElement("p");
    guide.id = "readingNoteGuide";
    guide.className = "reading-note-guide";
    guide.textContent = GUIDE_TEXT;

    keywordList = document.createElement("div");
    keywordList.className = "reading-note-keywords";
    keywordList.setAttribute("aria-label", "读后关键词");

    const writingLabel = document.createElement("label");
    writingLabel.className = "reading-note-writing-label";
    writingLabel.htmlFor = "readingNoteText";
    writingLabel.textContent = "写下你的读后笺";

    textarea = document.createElement("textarea");
    textarea.id = "readingNoteText";
    textarea.className = "reading-note-text";
    textarea.rows = 5;
    textarea.placeholder = PLACEHOLDER;
    textarea.addEventListener("input", () => {
      const config = STORIES[activeStoryId];
      if (!config) return;
      getDraft(config).text = clampText(textarea.value, config.maxLength);
      markUnsaved();
    });
    textarea.addEventListener("focus", () => {
      window.setTimeout(() => {
        textarea.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 120);
    });

    status = document.createElement("p");
    status.id = "readingNoteStatus";
    status.className = "reading-note-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "reading-note-actions";
    const saveButton = document.createElement("button");
    saveButton.id = "readingNoteSave";
    saveButton.className = "reading-note-button is-primary";
    saveButton.type = "button";
    saveButton.textContent = "保存读后笺";
    saveButton.addEventListener("click", saveCurrent);

    const backButton = document.createElement("button");
    backButton.className = "reading-note-button";
    backButton.type = "button";
    backButton.textContent = "返回上一章节";
    backButton.addEventListener("click", () => {
      const handler = activeOptions.onBack;
      closeModal({ keepLauncher: false });
      handler?.();
    });

    const restartButton = document.createElement("button");
    restartButton.className = "reading-note-button";
    restartButton.type = "button";
    restartButton.textContent = "重新体验";
    restartButton.addEventListener("click", () => {
      const handler = activeOptions.onRestart;
      closeModal({ keepLauncher: false });
      handler?.();
    });
    actions.append(saveButton, backButton, restartButton);

    sheet.append(
      header,
      title,
      guide,
      keywordList,
      writingLabel,
      textarea,
      status,
      actions,
    );
    layer.append(backdrop, sheet);

    launcher = document.createElement("button");
    launcher.id = "readingNoteLauncher";
    launcher.className = "reading-note-launcher";
    launcher.type = "button";
    launcher.hidden = true;
    launcher.textContent = "继续写读后笺";
    launcher.addEventListener("click", () => {
      if (activeStoryId) open(activeStoryId, activeOptions);
    });

    document.body.append(layer, launcher);
    document.addEventListener("keydown", onKeyDown);
  }

  function markUnsaved() {
    if (!status) return;
    status.textContent = "读后感尚未保存。";
  }

  function renderKeywords(config, draft) {
    const selected = new Set(draft.keywords);
    keywordList.replaceChildren(
      ...config.keywords.map((keyword) => {
        const button = document.createElement("button");
        button.className = "reading-note-keyword";
        button.type = "button";
        button.dataset.keyword = keyword;
        button.textContent = keyword;
        button.setAttribute("aria-pressed", String(selected.has(keyword)));
        button.addEventListener("click", () => {
          const isPressed = button.getAttribute("aria-pressed") === "true";
          const nextPressed = !isPressed;
          button.setAttribute("aria-pressed", String(nextPressed));
          const nextDraft = getDraft(config);
          nextDraft.keywords = [
            ...keywordList.querySelectorAll(
              ".reading-note-keyword[aria-pressed='true']",
            ),
          ].map((item) => item.dataset.keyword);
          markUnsaved();
        });
        return button;
      }),
    );
  }

  function renderSheet(config) {
    const draft = getDraft(config);
    title.textContent = config.question;
    textarea.maxLength = config.maxLength;
    textarea.value = draft.text;
    renderKeywords(config, draft);
    status.textContent = draft.savedAt
      ? "你的读后笺已经收好。"
      : "读后感尚未保存。";
  }

  function hideLegacyForm(config) {
    document.querySelectorAll(config.sourceSelector).forEach((source) => {
      source.dataset.readingNoteManaged = "true";
      previousFocus =
        previousFocus ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
    });
  }

  function saveCurrent() {
    const config = STORIES[activeStoryId];
    if (!config) return;
    const draft = getDraft(config);
    const savedAt = new Date().toISOString();
    const payload = {
      storyId: config.id,
      keywords: [...draft.keywords],
      text: clampText(draft.text, config.maxLength),
      savedAt,
    };
    try {
      window.localStorage.setItem(config.storageKey, JSON.stringify(payload));
      draft.savedAt = savedAt;
      status.textContent = "你的读后笺已经收好。";
      document.dispatchEvent(
        new CustomEvent("reading-note:saved", {
          detail: { ...payload },
        }),
      );
    } catch {
      status.textContent = "保存失败，请重试。";
    }
  }

  function onKeyDown(event) {
    if (!layer || layer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab" || !sheet) return;
    const focusable = [
      ...sheet.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (!focusable.length) return;
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

  function open(storyId, options = {}) {
    const config = STORIES[storyId];
    if (!config) return;
    buildShell();
    if (activeStoryId && activeStoryId !== storyId && !layer.hidden) {
      closeModal({ keepLauncher: false });
    }
    activeStoryId = storyId;
    activeOptions = options;
    hideLegacyForm(config);
    renderSheet(config);
    launcher.hidden = true;
    layer.hidden = false;
    document.body.classList.add("reading-note-open");
    document.body.dataset.readingNoteStory = storyId;
    window.requestAnimationFrame(() => {
      sheet.focus({ preventScroll: true });
      window.setTimeout(() => closeButton.focus({ preventScroll: true }), 20);
    });
  }

  function closeModal({ keepLauncher = true } = {}) {
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    document.body.classList.remove("reading-note-open");
    delete document.body.dataset.readingNoteStory;
    if (keepLauncher) {
      launcher.hidden = false;
      window.requestAnimationFrame(() => launcher.focus({ preventScroll: true }));
    } else {
      launcher.hidden = true;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    }
    previousFocus = null;
  }

  function dismiss(storyId = "") {
    if (storyId && activeStoryId && storyId !== activeStoryId) return;
    if (layer && !layer.hidden) {
      layer.hidden = true;
      document.body.classList.remove("reading-note-open");
      delete document.body.dataset.readingNoteStory;
    }
    if (launcher) launcher.hidden = true;
    if (!storyId || storyId === activeStoryId) {
      activeStoryId = "";
      activeOptions = {};
      previousFocus = null;
    }
  }

  function notifyPageChange(storyId, pageName) {
    if (storyId !== activeStoryId) return;
    if (pageName !== "reflection") dismiss(storyId);
  }

  function getSnapshot() {
    const config = STORIES[activeStoryId];
    const draft = config ? getDraft(config) : null;
    return {
      activeStoryId,
      open: Boolean(layer && !layer.hidden),
      launcherVisible: Boolean(launcher && !launcher.hidden),
      status: status?.textContent || "",
      keywords: [...(draft?.keywords || [])],
      text: draft?.text || "",
      savedAt: draft?.savedAt || "",
      managedSources: document.querySelectorAll(
        "[data-reading-note-managed='true']",
      ).length,
      storageKeys: Object.fromEntries(
        Object.entries(STORIES).map(([id, entry]) => [id, entry.storageKey]),
      ),
    };
  }

  window.ReadingReflectionModal = Object.freeze({
    open,
    close: closeModal,
    dismiss,
    notifyPageChange,
    getSnapshot,
    stories: STORIES,
  });
})();
