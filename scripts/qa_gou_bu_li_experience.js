const fs = require("node:fs");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4173/";
const OUTPUT_DIR = "C:\\Users\\liyage\\Documents\\ChatGPT\\俗世奇人\\";
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = browserCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable found.");
  return executable;
}

async function openCraft(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
}

async function dragDoughToLeftPalm(page, useTouch = false) {
  const source = await page.locator("#gbcWrapDoughButton").boundingBox();
  const canvas = await page.locator(".gbc-canvas").boundingBox();
  if (!source || !canvas) throw new Error("Wrapping drag geometry is missing.");
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const target = {
    x: canvas.x + canvas.width * 0.405,
    y: canvas.y + canvas.height * 0.625,
  };
  if (!useTouch) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 12 });
    await page.mouse.up();
    return;
  }

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  for (let index = 1; index <= 12; index += 1) {
    const ratio = index / 12;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: start.x + (target.x - start.x) * ratio,
          y: start.y + (target.y - start.y) * ratio,
          id: 1,
        },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function state(page) {
  return page.evaluate(() => window.gouBuliCraft.getState());
}

async function waitForStageControls(page) {
  await page.waitForFunction(() => {
    const buttons = [
      "#gbcPreviousStageButton",
      "#gbcSkipStageButton",
      "#gbcRestartCourseButton",
    ];
    return buttons.every((selector) => {
      const button = document.querySelector(selector);
      return button && !button.disabled;
    });
  });
}

function observeErrors(page, errors, label) {
  page.on("pageerror", (error) => {
    errors.push(`${label} pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
}

async function runProgressFlow(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  observeErrors(page, errors, "progress");
  await openCraft(page);

  results.initial = {
    state: await state(page),
    resumeVisible: await page.locator("#gbcResumePrompt").isVisible(),
    guideLabel: await page.locator(".gbc-note-label").textContent(),
    guideTitle: await page.locator("#gbcNoteTitle").textContent(),
  };

  await page.locator("#gbcOriginalButton").click();
  results.mixingOriginal = {
    visible: await page.locator("#sharedOriginalReader").isVisible(),
    stage: await page
      .locator(".shared-original-reader__eyebrow")
      .textContent(),
    title: await page
      .locator(".shared-original-reader__title")
      .textContent(),
    paragraphCount: await page
      .locator(".shared-original-reader__text > p")
      .count(),
    hasCraftParagraph: await page
      .locator(
        '.shared-original-reader__text > p[data-scene-ids~="craft"]',
      )
      .count(),
    returnLabel: await page
      .locator(".shared-original-reader__return")
      .textContent(),
  };
  await page.locator(".shared-original-reader__close").click();
  results.originalReturned = {
    craftVisible: await page.locator("#gouBuliCraftModule").isVisible(),
    modalHidden: await page.locator("#sharedOriginalReader").isHidden(),
    phase: (await state(page)).phase,
  };

  await page.locator("#gbcSkipMixingButton").click();
  await page.locator('[data-gbc-stage="wrapping"]').click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "wrapping",
  );
  await dragDoughToLeftPalm(page);
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().wrapping.step === "filling",
  );
  const beforeClose = await state(page);

  await page.locator("#gbcCloseButton").click();
  await page.locator("#dogCraftBenchOpen").click();
  results.resumePrompt = {
    visible: await page.locator("#gbcResumePrompt").isVisible(),
    title: await page.locator("#gbcResumeTitle").textContent(),
    description: await page.locator("#gbcResumeDescription").textContent(),
    phaseBehindPrompt: (await state(page)).phase,
  };
  await page.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-resume-desktop.png`,
    fullPage: false,
  });

  await page.locator("#gbcRestartFromPromptButton").click();
  results.restartFromPrompt = {
    promptHidden: await page.locator("#gbcResumePrompt").isHidden(),
    state: await state(page),
  };

  await page.locator("#gbcSkipMixingButton").click();
  await page.locator('[data-gbc-stage="wrapping"]').click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "wrapping",
  );
  await dragDoughToLeftPalm(page);
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().wrapping.step === "filling",
  );
  const beforeReload = await state(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#dogCraftBenchOpen").click();

  results.reloadResumeVisible = await page
    .locator("#gbcResumePrompt")
    .isVisible();
  await page.locator("#gbcResumeButton").click();
  results.resumedAfterReload = {
    promptHidden: await page.locator("#gbcResumePrompt").isHidden(),
    state: await state(page),
  };
  results.beforeClose = beforeClose;
  results.beforeReload = beforeReload;
  await page.close();
}

async function runCompletionFlow(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  observeErrors(page, errors, "completion");
  await openCraft(page);
  await page.locator("#gbcSkipMixingButton").click();
  await page.locator('[data-gbc-stage="wrapping"]').click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "wrapping",
  );
  await waitForStageControls(page);

  await page.locator("#gbcSkipStageButton").click();
  results.skipWrapping = {
    state: await state(page),
    nextVisible: await page.locator("#gbcWrapNextButton").isVisible(),
  };
  await page.locator("#gbcPreviousStageButton").click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "mixing",
  );
  await waitForStageControls(page);
  results.previousStage = await state(page);

  await page.locator('[data-gbc-stage="pleating"]').click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "pleating",
  );
  await waitForStageControls(page);
  await page.locator("#gbcSkipStageButton").click();
  results.skipPleating = await state(page);
  results.skipPleatingReveal = await page.evaluate(() => {
    const reveal = document.querySelector("#gbcPleatReveal");
    const image = document.querySelector("#gbcPleatRevealImage");
    return {
      visible: !reveal.hidden,
      loaded: image.complete && image.naturalWidth > 0,
    };
  });

  await page.locator('[data-gbc-stage="steaming"]').click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "steaming",
  );
  await waitForStageControls(page);
  await page.locator("#gbcSkipStageButton").click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "completed",
  );

  results.completion = {
    state: await state(page),
    craftVisible: await page.locator("#gouBuliCraftModule").isVisible(),
    storyActionVisible: await page
      .locator("#gbcSteamStoryButton")
      .isVisible(),
    marketUnlocked: await page
      .locator('[data-dog-page="market"]')
      .getAttribute("data-unlocked"),
    currentStoryPage: await page.evaluate(() =>
      window.dogBuLiStory.getCurrentPage(),
    ),
  };

  await page.locator("#gbcOriginalButton").click();
  results.completedOriginal = {
    stage: await page.locator("#dogOriginalStage").textContent(),
    title: await page.locator("#dogOriginalTitle").textContent(),
  };
  await page.locator("#dogOriginalReturnButton").click();
  await page.locator("#gbcSteamStoryButton").click();
  results.storyReturn = {
    currentPage: await page.evaluate(() =>
      window.dogBuLiStory.getCurrentPage(),
    ),
    craftHidden: await page.locator("#gouBuliCraftModule").isHidden(),
    marketVisible: await page.locator("#dogPageMarket").isVisible(),
  };
  await page.close();
}

async function runMobileFlow(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  observeErrors(page, errors, "mobile");
  await openCraft(page);
  await page.locator("#gbcSkipMixingButton").tap();
  await page.locator('[data-gbc-stage="wrapping"]').tap();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "wrapping",
  );
  await waitForStageControls(page);
  await dragDoughToLeftPalm(page, true);
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().wrapping.step === "filling",
  );

  results.mobile = await page.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas").getBoundingClientRect();
    const selectors = [
      "#gbcCloseButton",
      "#gbcPreviousStageButton",
      "#gbcSkipStageButton",
      "#gbcRestartCourseButton",
      "#gbcOriginalButton",
      "#gbcSoundButton",
    ];
    const controls = selectors.map((selector) => {
      const button = document.querySelector(selector);
      const rect = button.getBoundingClientRect();
      return {
        selector,
        visible: !button.hidden && rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
        inside:
          rect.left >= canvas.left &&
          rect.right <= canvas.right &&
          rect.top >= canvas.top &&
          rect.bottom <= canvas.bottom,
      };
    });
    return {
      controls,
      overflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  await page.locator("#gbcCloseButton").tap();
  await page.locator("#dogCraftBenchOpen").tap();
  results.mobileResumeVisible = await page
    .locator("#gbcResumePrompt")
    .isVisible();
  await page.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-resume-mobile-390.png`,
    fullPage: false,
  });
  await page.close();
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = {};
  const errors = [];

  try {
    await runProgressFlow(browser, results, errors);
    await runCompletionFlow(browser, results, errors);
    await runMobileFlow(browser, results, errors);
  } finally {
    await browser.close();
  }

  const mobileControls = results.mobile.controls;
  results.assertions = {
    firstEntryHasNoResumePrompt: !results.initial.resumeVisible,
    stageGuidePresent:
      results.initial.guideLabel.includes("故事导读") &&
      results.initial.guideTitle === "一碗馅，先要调得香润",
    stageOriginalCorrespondence:
      results.mixingOriginal.visible &&
      results.mixingOriginal.stage.includes("调馅") &&
      results.mixingOriginal.title === "调馅 · 原文阅读" &&
      results.mixingOriginal.paragraphCount === 14 &&
      results.mixingOriginal.hasCraftParagraph === 1,
    originalReturnsToCurrentStage:
      results.mixingOriginal.returnLabel.includes("回到当前工序") &&
      results.originalReturned.craftVisible &&
      results.originalReturned.modalHidden &&
      results.originalReturned.phase === "mixing",
    resumePromptAfterReentry:
      results.resumePrompt.visible &&
      results.resumePrompt.description.includes("包制") &&
      results.resumePrompt.phaseBehindPrompt === "wrapping",
    restartClearsCourse:
      results.restartFromPrompt.promptHidden &&
      results.restartFromPrompt.state.phase === "mixing" &&
      !Object.values(results.restartFromPrompt.state.completed).some(Boolean),
    reloadOffersResume: results.reloadResumeVisible,
    continueRestoresProgress:
      results.resumedAfterReload.promptHidden &&
      results.resumedAfterReload.state.phase === "wrapping" &&
      results.resumedAfterReload.state.mixing.step === "complete" &&
      results.resumedAfterReload.state.wrapping.step === "filling" &&
      results.resumedAfterReload.state.completed.mixing,
    skipWrapping:
      results.skipWrapping.state.completed.wrapping &&
      results.skipWrapping.state.phase === "wrapping" &&
      results.skipWrapping.nextVisible,
    previousStage:
      results.previousStage.phase === "mixing" &&
      results.previousStage.completed.mixing,
    skipPleating:
      results.skipPleating.phase === "pleating" &&
      results.skipPleating.pleating.count === 18 &&
      results.skipPleating.completed.pleating &&
      results.skipPleating.pleating.revealPending &&
      results.skipPleatingReveal.visible &&
      results.skipPleatingReveal.loaded,
    completionStaysInScene:
      results.completion.state.phase === "completed" &&
      results.completion.craftVisible &&
      results.completion.currentStoryPage === "craft",
    nextStoryUnlocked:
      results.completion.storyActionVisible &&
      results.completion.marketUnlocked === "true",
    completedStageOriginal:
      results.completedOriginal.stage.includes("揭笼") &&
      results.completedOriginal.title === "揭笼 · 原文阅读",
    storyReturn:
      results.storyReturn.currentPage === "market" &&
      results.storyReturn.craftHidden &&
      results.storyReturn.marketVisible,
    mobileResumeVisible: results.mobileResumeVisible,
    mobileNoOverflow: !results.mobile.overflow,
    mobileControlsInsideCanvas: mobileControls.every(
      (control) => control.visible && control.inside,
    ),
    mobileTouchTargets: mobileControls.every(
      (control) => control.height >= 32,
    ),
    noBrowserErrors: errors.length === 0,
  };
  results.errors = errors;
  console.log(JSON.stringify(results, null, 2));
  if (Object.values(results.assertions).some((value) => !value)) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
