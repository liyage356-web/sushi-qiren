const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-reading-notes.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const GUIDE =
  "可以选一个词，也可以写下自己记住的细节。内容只保存在当前浏览器，不会上传到网络。";
const ACTIONS = ["保存读后笺", "返回上一章节", "重新体验"];
const REFERENCE_PAPER = "rgb(237, 230, 214)";

const stories = [
  {
    id: "goubuli",
    route: `${ORIGIN}#gou-bu-li/reflection`,
    title: "你记住了狗子的哪一种品质？",
    keywords: ["用心", "坚持", "智慧", "实在", "手艺", "名声"],
    storageKey: "reading-note-goubuli",
    backHash: "#gou-bu-li/fame",
    restartHash: "#gou-bu-li/street",
    marker: "#dogPageReflection .dog-reflection-sheet",
  },
  {
    id: "nirenzhang",
    route: `${ORIGIN}#ni-ren-zhang/reflection`,
    title: "泥人张真正让你佩服的是什么？",
    keywords: ["沉着", "骨气", "机智", "手艺", "尊严", "不服输"],
    storageKey: "reading-note-nirenzhang",
    backHash: "#ni-ren-zhang/ending",
    restartHash: "#ni-ren-zhang/prelude",
    marker: "#nrPageReflection .nr-reflection-sheet",
  },
  {
    id: "heitou",
    route: `${ORIGIN}#heitou/reflection`,
    title: "如果黑头能够说话，你最想对它说什么？",
    keywords: ["忠诚", "守护", "误解", "信任", "委屈", "遗憾"],
    storageKey: "reading-note-heitou",
    backHash: "#heitou/ending",
    restartHash: "#heitou/street",
    marker: "#storyPageReflection .reflection-sheet",
  },
  {
    id: "sishibayang",
    route: `${ORIGIN}si-shi-ba-yang/index.html#sishi/chapter7`,
    title: "俞六的故事让你怎样理解“绝活”？",
    keywords: ["勤练", "创新", "坚持", "智慧", "感恩", "传承"],
    storageKey: "reading-note-sishibayang",
    backHash: "#sishi/chapter6",
    restartHash: "#sishi/cover",
    marker: "#sishiChapter7 .sishi-reflection",
  },
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForModal(page, storyId) {
  await page.waitForFunction(
    (id) => {
      const snapshot = window.ReadingReflectionModal?.getSnapshot();
      return snapshot?.open === true && snapshot.activeStoryId === id;
    },
    storyId,
    { timeout: 9000 },
  );
  await page.waitForTimeout(380);
}

async function openStory(page, story) {
  await page.goto(story.route, { waitUntil: "domcontentloaded" });
  await waitForModal(page, story.id);
}

async function inspectModal(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector(".reading-note-sheet");
    const rect = sheet.getBoundingClientRect();
    const mode = getComputedStyle(sheet).animationName;
    return {
      snapshot: window.ReadingReflectionModal.getSnapshot(),
      role: sheet.getAttribute("role"),
      ariaModal: sheet.getAttribute("aria-modal"),
      labelledBy: sheet.getAttribute("aria-labelledby"),
      title: document.querySelector("#readingNoteTitle")?.textContent,
      guide: document.querySelector("#readingNoteGuide")?.textContent,
      actions: [...document.querySelectorAll(".reading-note-actions button")].map(
        (button) => button.textContent,
      ),
      keywords: [
        ...document.querySelectorAll(".reading-note-keyword"),
      ].map((button) => button.textContent),
      selected: [
        ...document.querySelectorAll(
          ".reading-note-keyword[aria-pressed='true']",
        ),
      ].map((button) => button.textContent),
      text: document.querySelector("#readingNoteText")?.value || "",
      maxLength:
        document.querySelector("#readingNoteText")?.maxLength || 0,
      status: document.querySelector("#readingNoteStatus")?.textContent || "",
      sheet: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      internalOverflow: sheet.scrollHeight > sheet.clientHeight,
      animationName: mode,
      background: {
        color: getComputedStyle(sheet).backgroundColor,
        image: getComputedStyle(sheet).backgroundImage,
        paper:
          getComputedStyle(sheet.closest(".reading-note-layer"))
            .getPropertyValue("--reading-note-paper")
            .trim(),
        referencePaper:
          (document.querySelector(".hzw-viewer")
            ? getComputedStyle(
                document.querySelector(".hzw-viewer"),
              ).getPropertyValue("--hzw-paper")
            : "#ede6d6"
          ).trim() || "#ede6d6",
      },
      activeElement: document.activeElement?.id || document.activeElement?.className || "",
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      managedSource: Boolean(
        document.querySelector("[data-reading-note-managed='true']"),
      ),
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  const detail = {};

  function check(name, task) {
    checks[name] = Boolean(task);
    if (!task) throw new Error(`Check failed: ${name}`);
  }

  function observe(page, label) {
    page.on("pageerror", (error) =>
      errors.push(`${label}: pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`${label}: console: ${message.text()}`);
      }
    });
  }

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "no-preference",
  });
  const desktop = await desktopContext.newPage();
  observe(desktop, "desktop");
  const savedPayloads = {};

  for (const [index, story] of stories.entries()) {
    await openStory(desktop, story);
    const initial = await inspectModal(desktop);
    detail[story.id] = { initial };

    check(`${story.id}RoleAndAria`, initial.role === "dialog" && initial.ariaModal === "true");
    check(`${story.id}Question`, initial.title === story.title);
    check(`${story.id}Guide`, initial.guide === GUIDE);
    check(
      `${story.id}Keywords`,
      JSON.stringify(initial.keywords) === JSON.stringify(story.keywords),
    );
    check(
      `${story.id}Actions`,
      JSON.stringify(initial.actions) === JSON.stringify(ACTIONS),
    );
    check(
      `${story.id}FreshDraft`,
      initial.text === "" &&
        initial.selected.length === 0 &&
        initial.status === "读后感尚未保存。",
    );
    check(
      `${story.id}ModalGeometry`,
      initial.sheet.width <= 721 &&
        initial.sheet.width > 280 &&
        initial.sheet.height <= initial.viewport.height * 0.9 + 1 &&
        initial.horizontalOverflow <= 0,
    );
    check(
      `${story.id}UsesSharedRicePaperBackground`,
      initial.background.color === REFERENCE_PAPER &&
        initial.background.image === "none" &&
        initial.background.paper.toLowerCase() ===
          initial.background.referencePaper.toLowerCase(),
    );
    check(`${story.id}LegacyFormCovered`, initial.managedSource);
    check(
      `${story.id}FocusInside`,
      initial.activeElement === "readingNoteLayer" ||
        ["", "reading-note-close", "reading-note-sheet"].includes(
          initial.activeElement,
        ),
    );

    await desktop.screenshot({
      path: path.join(ROOT, "output", `reading-note-${story.id}-desktop.png`),
    });

    const keyword = story.keywords[index % story.keywords.length];
    const text = `QA-${story.id}-${index + 1}`;
    await desktop.locator(`.reading-note-keyword`, { hasText: keyword }).click();
    await desktop.locator("#readingNoteText").fill(text);

    await desktop.locator(".reading-note-close").click();
    await desktop.waitForFunction(
      () => window.ReadingReflectionModal.getSnapshot().open === false,
    );
    const unsavedClosed = await desktop.evaluate(() =>
      window.ReadingReflectionModal.getSnapshot(),
    );
    check(
      `${story.id}UnsavedCloseKeepsDraft`,
      unsavedClosed.launcherVisible === true &&
        unsavedClosed.text === text &&
        unsavedClosed.keywords.includes(keyword) &&
        unsavedClosed.status === "读后感尚未保存。",
    );
    await desktop.locator("#readingNoteLauncher").click();
    await waitForModal(desktop, story.id);

    await desktop.locator("#readingNoteSave").click();
    await desktop.waitForFunction(
      () =>
        document.querySelector("#readingNoteStatus")?.textContent ===
        "你的读后笺已经收好。",
    );
    const payload = await desktop.evaluate((key) => {
      return JSON.parse(window.localStorage.getItem(key));
    }, story.storageKey);
    savedPayloads[story.id] = payload;
    check(
      `${story.id}SavedPayload`,
      payload.storyId === story.id &&
        payload.keywords.includes(keyword) &&
        payload.text === text &&
        !Number.isNaN(Date.parse(payload.savedAt)),
    );

    await desktop.locator(".reading-note-close").click();
    await desktop.waitForFunction(
      () => window.ReadingReflectionModal.getSnapshot().open === false,
    );
    const closed = await desktop.evaluate(() =>
      window.ReadingReflectionModal.getSnapshot(),
    );
    check(
      `${story.id}CloseKeepsDraft`,
      closed.launcherVisible === true &&
        closed.text === text &&
        closed.keywords.includes(keyword),
    );
    await desktop.locator("#readingNoteLauncher").click();
    await waitForModal(desktop, story.id);
    const reopened = await inspectModal(desktop);
    check(
      `${story.id}ReopenRestoresDraft`,
      reopened.text === text &&
        reopened.selected.includes(keyword) &&
        reopened.status === "你的读后笺已经收好。",
    );

    const selectedChip = desktop.locator(`.reading-note-keyword`, {
      hasText: keyword,
    });
    await selectedChip.focus();
    await desktop.keyboard.press("Space");
    check(
      `${story.id}KeywordCanCancelByKeyboard`,
      (await selectedChip.getAttribute("aria-pressed")) === "false",
    );
    await desktop.keyboard.press("Space");
    check(
      `${story.id}KeywordCanRestoreByKeyboard`,
      (await selectedChip.getAttribute("aria-pressed")) === "true",
    );

    await desktop
      .locator("#readingNoteLayer")
      .getByRole("button", { name: "返回上一章节" })
      .click();
    await desktop.waitForFunction(
      (hash) => window.location.hash === hash,
      story.backHash,
    );
    check(
      `${story.id}BackRoute`,
      !(await desktop.evaluate(
        () => window.ReadingReflectionModal.getSnapshot().open,
      )),
    );

    await openStory(desktop, story);
    await desktop
      .locator("#readingNoteLayer")
      .getByRole("button", { name: "重新体验" })
      .click();
    await desktop.waitForFunction(
      (hash) => window.location.hash === hash,
      story.restartHash,
    );
    check(
      `${story.id}RestartRoute`,
      !(await desktop.evaluate(
        () => window.ReadingReflectionModal.getSnapshot().open,
      )),
    );
  }

  check(
    "StorageKeysAreIndependent",
    new Set(stories.map((story) => savedPayloads[story.id]?.storyId)).size === 4 &&
      savedPayloads.goubuli.text !== savedPayloads.nirenzhang.text &&
      savedPayloads.heitou.text !== savedPayloads.sishibayang.text,
  );

  const migrationContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const migrationPage = await migrationContext.newPage();
  observe(migrationPage, "migration");
  await migrationPage.goto(`${ORIGIN}#street`, { waitUntil: "domcontentloaded" });
  await migrationPage.evaluate(() => {
    window.localStorage.setItem(
      "sushi-qiren-gou-bu-li-reflection-v1",
      JSON.stringify({
        keywords: ["坚持"],
        text: "旧版保存的狗不理读后笺",
        savedAt: "2026-01-02T03:04:05.000Z",
      }),
    );
  });
  await openStory(migrationPage, stories[0]);
  const migrated = await inspectModal(migrationPage);
  check(
    "LegacyDraftMigration",
    migrated.text === "旧版保存的狗不理读后笺" &&
      migrated.selected.includes("坚持"),
  );
  await migrationPage.locator("#readingNoteSave").click();
  const migratedPayload = await migrationPage.evaluate(() =>
    JSON.parse(window.localStorage.getItem("reading-note-goubuli")),
  );
  check(
    "LegacyDraftWrittenToUnifiedKey",
    migratedPayload.storyId === "goubuli" &&
      migratedPayload.text === "旧版保存的狗不理读后笺",
  );
  await migrationContext.close();

  const failureContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const failurePage = await failureContext.newPage();
  observe(failurePage, "storage-failure");
  await openStory(failurePage, stories[2]);
  await failurePage.locator("#readingNoteText").fill("无法保存时仍保留在窗口内");
  await failurePage.evaluate(() => {
    Storage.prototype.setItem = function setItem() {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await failurePage.locator("#readingNoteSave").click();
  check(
    "StorageFailureMessage",
    (await failurePage.locator("#readingNoteStatus").textContent()) ===
      "保存失败，请重试。",
  );
  await failureContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const mobile = await mobileContext.newPage();
  observe(mobile, "mobile");
  for (const story of stories) {
    await openStory(mobile, story);
    const mobileState = await inspectModal(mobile);
    check(
      `${story.id}MobileFits`,
      mobileState.sheet.width <= 366.5 &&
        mobileState.sheet.height <= 820 &&
        mobileState.horizontalOverflow <= 0,
    );
    check(
      `${story.id}MobileControls`,
      mobileState.actions.length === 3 &&
        mobileState.actions[0] === "保存读后笺",
    );
    await mobile.screenshot({
      path: path.join(ROOT, "output", `reading-note-${story.id}-mobile.png`),
    });
  }
  await mobileContext.close();

  const shortContext = await browser.newContext({
    viewport: { width: 1024, height: 520 },
    reducedMotion: "no-preference",
  });
  const shortPage = await shortContext.newPage();
  observe(shortPage, "short-viewport");
  await openStory(shortPage, stories[2]);
  const shortState = await inspectModal(shortPage);
  check(
    "ShortViewportUsesInternalScroll",
    shortState.sheet.height <= 469 &&
      shortState.internalOverflow === true &&
      shortState.horizontalOverflow <= 0,
  );
  await shortPage.locator(".reading-note-sheet").evaluate((sheet) => {
    sheet.scrollTop = sheet.scrollHeight;
  });
  check(
    "ShortViewportCanReachActions",
    await shortPage.locator("#readingNoteSave").isVisible(),
  );
  await shortContext.close();

  const unaffectedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const unaffected = await unaffectedContext.newPage();
  observe(unaffected, "unaffected");
  await unaffected.goto(`${ORIGIN}#street`, { waitUntil: "domcontentloaded" });
  await unaffected.waitForTimeout(350);
  check(
    "StreetUnaffected",
    (await unaffected.evaluate(
      () => !window.ReadingReflectionModal?.getSnapshot().open,
    )) && (await unaffected.locator("#streetView").isVisible()),
  );
  await unaffected.goto(`${ORIGIN}#heitou/follow`, {
    waitUntil: "domcontentloaded",
  });
  await unaffected.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().active === true,
  );
  check(
    "FollowSceneUnaffected",
    (await unaffected.evaluate(
      () => !window.ReadingReflectionModal?.getSnapshot().open,
    )) && (await unaffected.locator("#followCanvas").isVisible()),
  );
  await unaffectedContext.close();

  check("RuntimeErrors", errors.length === 0);
  await browser.close();

  const report = {
    passed: Object.values(checks).every(Boolean),
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    detail,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      errors,
      report: REPORT,
    }),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
