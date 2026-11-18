const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const outputJson = path.join(ROOT, "output", "qa-si-shi-ba-yang-framework.json");
const candidateExecutables = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidateExecutables.find((executable) => fs.existsSync(executable));
}

function assertCondition(assertions, key, condition, detail = "") {
  assertions[key] = { passed: Boolean(condition), detail };
  if (!condition) throw new Error(`${key} failed${detail ? `: ${detail}` : ""}`);
}

async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(ROOT, `sishi-framework-${name}.png`),
    fullPage: false,
  });
}

async function openChapter(page, chapter) {
  await page.locator(`[data-sishi-page="${chapter}"]`).click();
  await page.waitForFunction(
    (expected) => document.body.dataset.sishiPage === expected,
    chapter,
  );
  if (chapter === "chapter7") {
    await page.waitForFunction(
      () => window.ReadingReflectionModal?.getSnapshot().open === true,
    );
    await page.locator(".reading-note-close").click();
    await page.waitForFunction(
      () => window.ReadingReflectionModal.getSnapshot().open === false,
    );
  }
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const assertions = {};
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(`desktop pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`desktop console: ${message.text()}`);
  });

  await page.goto(`${ORIGIN}si-shi-ba-yang/`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "cover" &&
      document.querySelectorAll("#sishiChapterNav [data-sishi-page]").length === 7,
  );

  assertCondition(
    assertions,
    "coverUsesUnifiedShell",
    await page.evaluate(
      () =>
        document.body.classList.contains("sishi-shell-active") &&
        document.body.classList.contains("sishi-cover-mode") &&
        document.querySelector(".sishi-cover-art") !== null &&
        document.querySelector("#sishiChapterNav").hidden,
    ),
  );
  assertCondition(
    assertions,
    "coverStoryIdentity",
    await page.evaluate(
      () =>
        document.querySelector("#pageTitle")?.textContent.includes("四十八样") &&
        document.querySelector("#pageTitle")?.textContent.includes("俞六") &&
        document.querySelector(".opening-lead")?.textContent.includes("刘二爷"),
    ),
  );
  assertCondition(
    assertions,
    "noDuplicateElementIds",
    await page.evaluate(() => {
      const seen = new Set();
      const duplicates = [];
      document.querySelectorAll("[id]").forEach((element) => {
        if (seen.has(element.id)) duplicates.push(element.id);
        seen.add(element.id);
      });
      return duplicates.length === 0;
    }),
  );
  await shot(page, "cover-desktop-1440");

  await page.locator("#enterSceneButton").click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  assertCondition(
    assertions,
    "chapter1Route",
    page.url().endsWith("#sishi/chapter1"),
    page.url(),
  );
  assertCondition(
    assertions,
    "chapter1OriginalParagraphs",
    (await page.locator("#sishiOriginal-chapter1 .sishi-original-text p").count()) === 5,
  );
  assertCondition(
    assertions,
    "removedStreetDisplayNotRendered",
    await page.evaluate(
      () =>
        !document.querySelector("#streetScene") &&
        !document.querySelector(".scene-seal") &&
        !document.querySelector(".phase-jump") &&
        !document.querySelector("#continueButton"),
    ),
  );
  assertCondition(
    assertions,
    "removedStreetNarrativeNotRendered",
    await page.evaluate(
      () =>
        !document.querySelector(".discovery-section") &&
        !document.querySelector("#sceneDetail") &&
        !document.querySelector(".narrative-card") &&
        !document.querySelector("#mainContent").innerText.includes(
          "糖香出了巷，名气还没进门",
        ),
    ),
  );
  assertCondition(
    assertions,
    "chapter1EndsWithoutRemovedCard",
    await page.evaluate(() => {
      const reader = document.querySelector("#sishiOriginal-chapter1");
      const gate = document.querySelector("#sishiInteractionGate-chapter1");
      const footerButtons = [
        ...reader.querySelectorAll(".sishi-original-footer button"),
      ].map((button) => button.textContent.trim());
      return (
        reader?.getBoundingClientRect().height > 300 &&
        !gate &&
        footerButtons.join(",") === "打开完整原文,进入本段互动" &&
        getComputedStyle(reader).visibility !== "hidden"
      );
    }),
  );
  assertCondition(
    assertions,
    "chapterNavVisible",
    await page.locator("#sishiChapterNav").isVisible(),
  );
  await shot(page, "chapter1-desktop-1440");

  await page.locator("#chapterSkipButton").click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter2",
  );
  assertCondition(
    assertions,
    "skipMovesToNextOriginalChapter",
    page.url().endsWith("#sishi/chapter2"),
    page.url(),
  );
  await openChapter(page, "chapter1");

  await page.locator("#sishiOriginal-chapter1").getByRole("button", {
    name: "进入本段互动",
  }).click();
  assertCondition(
    assertions,
    "candyInteractionPreserved",
    (await page.locator("#candyCabinet .candy-box").count()) === 12 &&
      (await page.locator("#candyCabinet .sishi-interaction-content").isVisible()),
  );

  const chapterParagraphCounts = {};
  for (const [chapter, expected] of Object.entries({
    chapter2: 7,
    chapter3: 2,
    chapter4: 3,
    chapter5: 4,
    chapter6: 11,
    chapter7: 2,
  })) {
    await openChapter(page, chapter);
    const count = await page
      .locator(`#sishiOriginal-${chapter} .sishi-original-text p`)
      .count();
    chapterParagraphCounts[chapter] = count;
    if (count !== expected) {
      throw new Error(`${chapter} expected ${expected} paragraphs, found ${count}`);
    }
  }
  assertCondition(
    assertions,
    "allThirtyFourOriginalParagraphs",
    Object.values(chapterParagraphCounts).reduce((sum, count) => sum + count, 0) === 29 &&
      (await page.locator("#sishiOriginal-chapter1 .sishi-original-text p").count()) === 5,
    JSON.stringify(chapterParagraphCounts),
  );
  assertCondition(
    assertions,
    "sevenChapterOrder",
    (
      await page
        .locator("#sishiChapterNav [data-sishi-page]")
        .evaluateAll((buttons) =>
          buttons.map((button) =>
            button.querySelector("strong")?.textContent.trim(),
          ),
        )
    ).join("|") === "卖糖人|二爷指点|二龙戏珠|走八字|再创新|六句词|读后",
  );
  await shot(page, "chapter7-desktop-1440");

  const cleanupSnapshots = {};
  for (const chapter of [
    "chapter1",
    "chapter2",
    "chapter3",
    "chapter4",
    "chapter5",
    "chapter6",
  ]) {
    await openChapter(page, chapter);
    cleanupSnapshots[chapter] = await page.evaluate((chapterName) => {
      const reader = document.querySelector(`#sishiOriginal-${chapterName}`);
      const footerButtons = [
        ...reader.querySelectorAll(".sishi-original-footer button"),
      ].map((button) => button.textContent.trim());
      const visibleButtons = [
        ...document.querySelectorAll("main button"),
      ].filter((button) => button.getClientRects().length > 0);
      const activeSections = [
        ...document.querySelectorAll("#mainContent > section"),
      ].filter((section) => section.getClientRects().length > 0);
      const lastSectionBottom = Math.max(
        0,
        ...activeSections.map(
          (section) =>
            section.getBoundingClientRect().bottom + window.scrollY,
        ),
      );
      return {
        activePage: document.body.dataset.sishiPage,
        gateCount: document.querySelectorAll(".sishi-interaction-gate")
          .length,
        removedCardText: /原文之后\s*·\s*原有互动/.test(
          document.querySelector("#mainContent")?.innerText || "",
        ),
        redundantNavigation: visibleButtons
          .map((button) => button.textContent.trim())
          .filter(
            (label) =>
              label === "上一章" ||
              label.startsWith("下一章") ||
              label === "继续下一章",
          ),
        footerButtons,
        progressVisible:
          reader
            ?.querySelector(".sishi-original-progress")
            ?.getBoundingClientRect().height > 0,
        readerWidth: reader?.getBoundingClientRect().width || 0,
        bottomGap:
          document.documentElement.scrollHeight - lastSectionBottom,
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    }, chapter);
  }
  assertCondition(
    assertions,
    "sixChaptersRemoveRedundantNavigationAndBottomCard",
    Object.entries(cleanupSnapshots).every(
      ([chapter, snapshot]) =>
        snapshot.activePage === chapter &&
        snapshot.gateCount === 0 &&
        !snapshot.removedCardText &&
        snapshot.redundantNavigation.length === 0 &&
        snapshot.footerButtons[0] === "打开完整原文" &&
        (chapter === "chapter2"
          ? snapshot.footerButtons.join(",") ===
            "打开完整原文,去看二龙戏珠 →"
          : snapshot.footerButtons.join(",") ===
            "打开完整原文,进入本段互动") &&
        snapshot.progressVisible &&
        Math.abs(snapshot.readerWidth - 1040) <= 1 &&
        snapshot.bottomGap <= 130 &&
        snapshot.overflow <= 1,
    ),
    JSON.stringify(cleanupSnapshots),
  );

  await openChapter(page, "chapter2");
  const nextReadingLayout = await page.evaluate(() => {
    const footer = document.querySelector(
      "#sishiOriginal-chapter2 .sishi-original-footer",
    );
    const buttons = [...footer.querySelectorAll("button")];
    const white = buttons[0].getBoundingClientRect();
    const green = buttons[1].getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const greenStyle = getComputedStyle(buttons[1]);
    return {
      labels: buttons.map((button) => button.textContent.trim()),
      sameHeight: Math.abs(white.height - green.height) <= 1,
      sameRow: Math.abs(white.top - green.top) <= 1,
      gap: green.left - white.right,
      rightAligned: Math.abs(green.right - footerRect.right) <= 1,
      greenBackground: greenStyle.backgroundColor,
      greenColor: greenStyle.color,
      greenButtonClass: buttons[1].className,
    };
  });
  await page
    .locator("#sishiOriginal-chapter2")
    .getByRole("button", { name: "去看二龙戏珠 →" })
    .click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter3",
  );
  await page.waitForFunction(
    () => {
      const reader = document.querySelector("#sishiOriginal-chapter3");
      const toolbar = document.querySelector(".topbar");
      const nav = document.querySelector("#sishiChapterNav");
      if (!reader || !toolbar || !nav) return false;
      const expected =
        toolbar.getBoundingClientRect().height +
        nav.getBoundingClientRect().height +
        12;
      return Math.abs(reader.getBoundingClientRect().top - expected) <= 3;
    },
    { timeout: 2500 },
  );
  const nextReadingRoute = await page.evaluate(() => ({
    hash: window.location.hash,
    page: document.body.dataset.sishiPage,
    activeNav: document
      .querySelector("#sishiChapterNav [aria-current='page'] strong")
      ?.textContent.trim(),
    interactionHidden:
      document.querySelector(
        "#assemblyBackyard .sishi-interaction-content",
      )?.hidden === true,
    firstParagraph: document
      .querySelector(
        "#sishiOriginal-chapter3 .sishi-original-text p",
      )
      ?.textContent.trim()
      .slice(0, 18),
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  assertCondition(
    assertions,
    "chapterTwoNextReadingButtonLayoutAndRoute",
    nextReadingLayout.labels.join(",") ===
      "打开完整原文,去看二龙戏珠 →" &&
      nextReadingLayout.sameHeight &&
      nextReadingLayout.sameRow &&
      nextReadingLayout.gap >= 12 &&
      nextReadingLayout.gap <= 16 &&
      nextReadingLayout.rightAligned &&
      nextReadingLayout.greenButtonClass.includes("is-primary") &&
      nextReadingLayout.greenBackground === "rgb(66, 93, 80)" &&
      nextReadingRoute.hash === "#sishi/chapter3" &&
      nextReadingRoute.page === "chapter3" &&
      nextReadingRoute.activeNav === "二龙戏珠" &&
      nextReadingRoute.interactionHidden &&
      nextReadingRoute.firstParagraph.length === 18 &&
      nextReadingRoute.overflow <= 1,
    JSON.stringify({ nextReadingLayout, nextReadingRoute }),
  );

  const footerReaderChecks = {};
  for (const chapter of [
    "chapter1",
    "chapter2",
    "chapter3",
    "chapter4",
    "chapter5",
    "chapter6",
  ]) {
    await openChapter(page, chapter);
    await page
      .locator(`#sishiOriginal-${chapter}`)
      .getByRole("button", { name: "打开完整原文" })
      .click();
    await page.waitForFunction(
      () => document.querySelector("#readingDialog")?.open === true,
    );
    footerReaderChecks[chapter] = await page.evaluate(
      () => ({
        title: document.querySelector("#readingTitle")?.textContent.trim(),
        paragraphs: document.querySelectorAll(
          "#readingText [data-sishi-order]",
        ).length,
      }),
    );
    await page.locator("#readingDialogConfirm").click();
    await page.waitForFunction(
      () => document.querySelector("#readingDialog")?.open === false,
    );
  }
  assertCondition(
    assertions,
    "fullOriginalButtonWorksFromEveryChapter",
    Object.values(footerReaderChecks).every(
      (entry) => entry.title === "四十八样" && entry.paragraphs === 34,
    ),
    JSON.stringify(footerReaderChecks),
  );

  await openChapter(page, "chapter3");
  await page.locator("#sishiOriginal-chapter3").getByRole("button", {
    name: "进入本段互动",
  }).click();
  for (let step = 1; step <= 5; step += 1) {
    await page.locator("#assemblyAdvance").click();
    await page.waitForFunction(
      (completedStep) =>
        document.querySelector("#assemblyStage")?.dataset.assemblyStep ===
        String(completedStep),
      step,
    );
  }
  const assemblyStep = await page
    .locator("#assemblyStage")
    .getAttribute("data-assembly-step");
  await openChapter(page, "chapter4");
  await openChapter(page, "chapter3");
  assertCondition(
    assertions,
    "interactionStateSurvivesChapterSwitch",
    assemblyStep === "5" &&
      (await page.locator("#assemblyStage").getAttribute("data-assembly-step")) === "5",
    assemblyStep,
  );

  await openChapter(page, "chapter4");
  await page.locator("#sishiOriginal-chapter4").getByRole("button", {
    name: "进入本段互动",
  }).click();
  const walkPlan = [
    "left",
    "left",
    "left",
    "switch",
    "right",
    "right",
    "right",
    "switch",
  ];
  for (const action of walkPlan) {
    await page.locator(`#walkFigureEight [data-walk-action="${action}"]`).click();
  }
  assertCondition(
    assertions,
    "walkFigureEightPreserved",
    (await page.locator("#walkProgress").textContent()) === "8",
  );
  await shot(page, "chapter4-desktop-1440");

  await openChapter(page, "chapter5");
  await page.locator("#sishiOriginal-chapter5").getByRole("button", {
    name: "进入本段互动",
  }).click();
  await page.locator("#innovationNext").click();
  await page.locator("#innovationNext").click();
  await page.locator("[data-innovation-choice='language']").click();
  assertCondition(
    assertions,
    "innovationInteractionPreserved",
    await page.locator("[data-innovation-choice='language']").isVisible(),
  );

  await openChapter(page, "chapter6");
  await page.locator("#sishiOriginal-chapter6").getByRole("button", {
    name: "进入本段互动",
  }).click();
  for (let index = 0; index < 6; index += 1) {
    await page.locator("[data-word-line-play]").nth(index).click();
    await page.waitForFunction(
      () =>
        window.wordLyricsController.getSnapshot().playbackState === "playing",
    );
    await page.waitForFunction(
      ([lineIndex, unlocked]) => {
        const state = window.wordLyricsController.getSnapshot();
        return (
          state.playbackState === "idle" &&
          state.completed.includes(lineIndex) &&
          state.unlockedCount >= unlocked
        );
      },
      [index, Math.min(6, index + 2)],
      { timeout: 15000 },
    );
  }
  assertCondition(
    assertions,
    "sixLineInteractionPreserved",
    (await page.locator("#wordProgressLabel").textContent()) === "已念 6 / 6",
  );

  await page.locator("#readingEntry").click();
  await page.waitForFunction(() => document.querySelector("#readingDialog")?.open);
  assertCondition(
    assertions,
    "unifiedOriginalReader",
    (await page.locator("#readingText [data-sishi-order]").count()) === 34 &&
      (await page.locator(".sishi-original-dialog-tools").isVisible()) &&
      (await page.locator(".sishi-original-jumps button").count()) === 7,
  );
  await page.locator("[data-sishi-dialog-order='33']").click();
  await page.waitForTimeout(450);
  await shot(page, "original-reader-desktop-1440");
  assertCondition(
    assertions,
    "originalReaderProgress",
    /已读 \d+%/.test(await page.locator(".sishi-original-dialog-tools strong").textContent()),
    await page.locator(".sishi-original-dialog-tools strong").textContent(),
  );
  await page.locator("#readingDialogConfirm").click();

  await openChapter(page, "chapter7");
  assertCondition(
    assertions,
    "endingAndReflectionPreserved",
    (await page.locator(".sishi-eight-days").count()) === 1 &&
      (await page.locator("#sishiReflectionText").count()) === 1 &&
      (await page.locator("a[href='../index.html#archive']").count()) === 1 &&
      (await page.locator("a[href='../index.html#street']").count()) >= 1,
  );
  await page.goto(`${ORIGIN}index.html#archive`, {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/index.html#archive");
  await page.waitForFunction(
    () =>
      document.querySelector("#archiveModal") &&
      !document.querySelector("#archiveModal").hidden &&
      Boolean(window.archiveExperience),
  );
  assertCondition(
    assertions,
    "sharedCharacterArchiveOpens",
    await page.evaluate(
      () =>
        window.location.hash === "#archive" &&
        !document.querySelector("#archiveModal").hidden,
    ),
  );

  const widePage = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  widePage.on("pageerror", (error) =>
    errors.push(`wide pageerror: ${error.message}`),
  );
  widePage.on("console", (message) => {
    if (message.type() === "error") errors.push(`wide console: ${message.text()}`);
  });
  await widePage.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter2`, {
    waitUntil: "networkidle",
  });
  await widePage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter2",
  );
  await widePage.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await widePage.waitForTimeout(250);
  const wideChapterTwoButtons = await widePage.evaluate(() => {
    const reader = document
      .querySelector("#sishiOriginal-chapter2")
      .getBoundingClientRect();
    const footer = document
      .querySelector("#sishiOriginal-chapter2 .sishi-original-footer")
      .getBoundingClientRect();
    const buttons = [
      ...document.querySelectorAll(
        "#sishiOriginal-chapter2 .sishi-original-footer button",
      ),
    ];
    const first = buttons[0].getBoundingClientRect();
    const second = buttons[1].getBoundingClientRect();
    return {
      labels: buttons.map((button) => button.textContent.trim()),
      sameRow: Math.abs(first.top - second.top) <= 1,
      sameHeight: Math.abs(first.height - second.height) <= 1,
      gap: second.left - first.right,
      rightAligned: Math.abs(second.right - footer.right) <= 1,
      readerWidth: reader.width,
      buttonHeight: first.height,
      insideReader: second.right <= reader.right && first.left >= reader.left,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  assertCondition(
    assertions,
    "chapterTwoButtonsMatchWideSixteenByNineLayout",
    wideChapterTwoButtons.labels.join(",") ===
      "打开完整原文,去看二龙戏珠 →" &&
      wideChapterTwoButtons.sameRow &&
      wideChapterTwoButtons.sameHeight &&
      wideChapterTwoButtons.gap >= 12 &&
      wideChapterTwoButtons.gap <= 16 &&
      wideChapterTwoButtons.rightAligned &&
      Math.abs(wideChapterTwoButtons.readerWidth - 1040) <= 1 &&
      Math.abs(wideChapterTwoButtons.buttonHeight - 42) <= 1 &&
      wideChapterTwoButtons.insideReader &&
      wideChapterTwoButtons.overflow <= 1,
    JSON.stringify(wideChapterTwoButtons),
  );
  await widePage.screenshot({
    path: path.join(ROOT, "sishi-framework-chapter2-1920-1080.png"),
  });
  await widePage.close();

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  mobilePage.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobilePage.on("console", (message) => {
    if (message.type() === "error") errors.push(`mobile console: ${message.text()}`);
  });
  await mobilePage.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter1`, {
    waitUntil: "networkidle",
  });
  await mobilePage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  assertCondition(
    assertions,
    "removedModulesMobileFlow",
    await mobilePage.evaluate(
      () =>
        !document.querySelector("#streetScene") &&
        !document.querySelector(".discovery-section") &&
        document.querySelector("#sishiOriginal-chapter1")?.getBoundingClientRect()
          .height > 300 &&
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
    ),
  );
  await shot(mobilePage, "chapter1-mobile-390");
  await mobilePage.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter2`, {
    waitUntil: "networkidle",
  });
  await mobilePage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter2",
  );
  const mobileChapterTwoButtons = await mobilePage.evaluate(() => {
    const footer = document.querySelector(
      "#sishiOriginal-chapter2 .sishi-original-footer",
    );
    const buttons = [...footer.querySelectorAll("button")];
    const first = buttons[0].getBoundingClientRect();
    const second = buttons[1].getBoundingClientRect();
    const reader = document
      .querySelector("#sishiOriginal-chapter2")
      .getBoundingClientRect();
    return {
      labels: buttons.map((button) => button.textContent.trim()),
      sameRow: Math.abs(first.top - second.top) <= 1,
      sameHeight: Math.abs(first.height - second.height) <= 1,
      noOverlap: second.left >= first.right,
      insideReader: first.left >= reader.left && second.right <= reader.right,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  assertCondition(
    assertions,
    "mobileChapterTwoButtonsFitWithoutOverlap",
    mobileChapterTwoButtons.labels.join(",") ===
      "打开完整原文,去看二龙戏珠 →" &&
      mobileChapterTwoButtons.sameRow &&
      mobileChapterTwoButtons.sameHeight &&
      mobileChapterTwoButtons.noOverlap &&
      mobileChapterTwoButtons.insideReader &&
      mobileChapterTwoButtons.overflow <= 1,
    JSON.stringify(mobileChapterTwoButtons),
  );
  await mobilePage.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter6`, {
    waitUntil: "networkidle",
  });
  await mobilePage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter6",
  );
  assertCondition(
    assertions,
    "mobileChapterLayout",
    await mobilePage.evaluate(
      () =>
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1 &&
        document.querySelector("#sishiChapterNav")?.scrollWidth >
          document.querySelector("#sishiChapterNav")?.clientWidth,
    ),
  );
  await shot(mobilePage, "chapter6-mobile-390");
  await mobilePage.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter7`, {
    waitUntil: "networkidle",
  });
  await mobilePage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter7",
  );
  await shot(mobilePage, "chapter7-mobile-390");
  const mobileInteractionOverflow = {};
  for (const chapter of ["chapter3", "chapter4", "chapter5", "chapter6"]) {
    await mobilePage.goto(
      `${ORIGIN}si-shi-ba-yang/#sishi/${chapter}`,
      { waitUntil: "networkidle" },
    );
    await mobilePage
      .locator(`#sishiOriginal-${chapter}`)
      .getByRole("button", { name: "进入本段互动" })
      .click();
    mobileInteractionOverflow[chapter] = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  }
  assertCondition(
    assertions,
    "mobileInteractionsHaveNoOverflow",
    Object.values(mobileInteractionOverflow).every((overflow) => overflow <= 1),
    JSON.stringify(mobileInteractionOverflow),
  );

  const mainPage = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  mainPage.on("pageerror", (error) =>
    errors.push(`main pageerror: ${error.message}`),
  );
  mainPage.on("console", (message) => {
    if (message.type() === "error") errors.push(`main console: ${message.text()}`);
  });
  const unaffectedStories = [
    ["#heitou/street", "#heiTouExperience"],
    ["#gou-bu-li/street", "#dogBuLiExperience"],
    ["#ni-ren-zhang/prelude", "#niRenZhangExperience"],
  ];
  for (const [route, selector] of unaffectedStories) {
    await mainPage.goto(`${ORIGIN}${route}`, { waitUntil: "networkidle" });
    await mainPage.waitForFunction(
      (target) => {
        const experience = document.querySelector(target);
        return experience && !experience.hidden;
      },
      selector,
    );
  }
  assertCondition(
    assertions,
    "threeExistingStoryRoutesStillWork",
    unaffectedStories.every(Boolean),
  );
  await mainPage.goto(`${ORIGIN}#street`, { waitUntil: "networkidle" });
  assertCondition(
    assertions,
    "otherStoriesUnaffected",
    (await mainPage.locator("#streetView").isVisible()) &&
      (await mainPage.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      )),
  );
  await mainPage.goto(
    `${ORIGIN}si-shi-ba-yang/index.html#sishi/chapter1`,
    { waitUntil: "networkidle" },
  );
  await mainPage.waitForURL(
    "**/si-shi-ba-yang/index.html#sishi/chapter1",
  );
  await mainPage.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  assertCondition(
    assertions,
    "directChapterOneLoadStillWorks",
    mainPage.url().endsWith(
      "/si-shi-ba-yang/index.html#sishi/chapter1",
    ) &&
      (await mainPage.locator("#sishiOriginal-chapter1").isVisible()),
    mainPage.url(),
  );

  assertCondition(
    assertions,
    "noBrowserErrors",
    errors.length === 0,
    errors.join("\n"),
  );

  const report = {
    passed: Object.values(assertions).every((value) => value.passed),
    assertions,
    chapterParagraphCounts,
    errors,
    screenshots: [
      "sishi-framework-cover-desktop-1440.png",
      "sishi-framework-chapter1-desktop-1440.png",
      "sishi-framework-chapter1-mobile-390.png",
      "sishi-framework-chapter4-desktop-1440.png",
      "sishi-framework-chapter7-desktop-1440.png",
      "sishi-framework-original-reader-desktop-1440.png",
      "sishi-framework-chapter6-mobile-390.png",
      "sishi-framework-chapter7-mobile-390.png",
    ],
  };
  fs.mkdirSync(path.dirname(outputJson), { recursive: true });
  fs.writeFileSync(outputJson, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({
    passed: report.passed,
    assertionCount: Object.keys(assertions).length,
    errors,
    report: outputJson,
  }, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
