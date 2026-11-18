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

async function stageRect(page) {
  return page.locator(".gbc-canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyScrollHeight: document.documentElement.scrollHeight,
    };
  });
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

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const errors = [];
  const results = {};

  const desktop = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  desktop.on("pageerror", (error) => errors.push(`desktop pageerror: ${error.message}`));
  desktop.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`desktop console: ${message.text()}`);
    }
  });

  await openCraft(desktop);
  await desktop.waitForTimeout(250);
  results.desktopRect = await stageRect(desktop);
  results.initialState = await desktop.evaluate(() => window.gouBuliCraft.getState());
  results.initialStage = await desktop.locator("#gbcStageTitle").textContent();
  results.initialPlaceholder = await desktop
    .locator("#gbcSubjectName")
    .textContent();
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-craft-desktop.png`,
    fullPage: false,
  });

  results.lockedStageNav = await desktop
    .locator('[data-gbc-stage="wrapping"]')
    .isDisabled();
  await desktop.locator("#gbcSkipMixingButton").click();
  await desktop.waitForTimeout(120);
  results.navUnlockedAfterMixing = await desktop
    .locator('[data-gbc-stage="wrapping"]')
    .isEnabled();

  results.stageAssets = {};
  for (const [stage, expectedTitle] of [
    ["wrapping", "包制"],
    ["pleating", "十八褶"],
    ["steaming", "揭笼"],
    ["mixing", "调馅"],
  ]) {
    await desktop.locator(`[data-gbc-stage="${stage}"]`).click();
    await desktop.waitForTimeout(560);
    const title = await desktop.locator("#gbcStageTitle").textContent();
    if (title !== expectedTitle) {
      throw new Error(`Expected ${expectedTitle}, received ${title}`);
    }
    results.stageAssets[stage] = await desktop.evaluate(() => {
      const background = document.querySelector("#gbcBackgroundImage");
      const subject = document.querySelector("#gbcSubjectImage");
      const stageId = document
        .querySelector(".gbc-canvas")
        .getAttribute("data-stage");
      const loaded = (image) =>
        Boolean(image) && image.complete && image.naturalWidth > 0;
      const visibleImages = stageId === "steaming"
        ? [
            document.querySelector("#gbcSteamClosedImage"),
            document.querySelector("#gbcSteamOpenImage"),
          ]
        : stageId === "pleating"
          ? [
              ...document.querySelectorAll(
                "[data-gbc-pleat-frame].is-visible",
              ),
            ]
        : stageId === "wrapping"
          ? [
              ...document.querySelectorAll(
                ".gbc-wrapping-state-image",
              ),
            ].filter((image) => image.classList.contains("is-visible"))
          : [subject];
      return {
        stageId,
        background: background.getAttribute("src"),
        subject: subject.getAttribute("src"),
        loaded: loaded(background) && visibleImages.every(loaded),
      };
    });
    await desktop.screenshot({
      path: `${OUTPUT_DIR}gou-bu-li-craft-${stage}.png`,
      fullPage: false,
    });
  }
  results.navigation = "four stages switched";

  await desktop.evaluate(() => window.gouBuliCraft.reset());
  await desktop.locator("#gbcSkipMixingButton").click();
  await desktop.waitForTimeout(120);

  await desktop.locator('[data-gbc-stage="wrapping"]').click();
  await desktop.waitForTimeout(560);
  await dragDoughToLeftPalm(desktop);
  await desktop.waitForTimeout(640);
  await desktop.locator("#gbcWrapFillingButton").click();
  await desktop.waitForTimeout(640);
  await desktop.locator("#gbcWrapPromptButton").click();
  await desktop.waitForTimeout(640);
  await desktop.locator("#gbcWrapNextButton").click();
  await desktop.waitForTimeout(560);

  for (let count = 1; count <= 18; count += 1) {
    const box = await desktop.locator("#gbcPleatHotspot").boundingBox();
    await desktop.mouse.click(
      box.x + box.width * 0.08,
      box.y + box.height / 2,
    );
    await desktop.waitForFunction(
      (expected) => {
        const pleating = window.gouBuliCraft.getState().pleating;
        return pleating.count === expected && !pleating.busy;
      },
      count,
    );
  }
  results.pleatingComplete = await desktop.evaluate(
    () => window.gouBuliCraft.getState(),
  );
  results.pleatReveal = await desktop.evaluate(() => {
    const reveal = document.querySelector("#gbcPleatReveal");
    const image = document.querySelector("#gbcPleatRevealImage");
    return {
      visible: !reveal.hidden,
      source: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
    };
  });
  await desktop.locator("#gbcPleatRevealContinue").click();
  await desktop.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "steaming",
  );
  await desktop.waitForTimeout(560);
  await desktop.locator("#gbcSteamLidButton").click();
  await desktop.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "completed",
    null,
    { timeout: 5000 },
  );
  await desktop.waitForTimeout(80);
  results.completedState = await desktop.evaluate(() =>
    window.gouBuliCraft.getState(),
  );
  results.completedTitle = await desktop.locator("#gbcStageTitle").textContent();
  results.completionSealVisible = await desktop
    .locator("#gbcCompletionSeal")
    .isVisible();
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-craft-completed-desktop.png`,
    fullPage: false,
  });

  await desktop.locator("#gbcSoundButton").click();
  results.soundPressed = await desktop
    .locator("#gbcSoundButton")
    .getAttribute("aria-pressed");
  await desktop.locator("#gbcOriginalButton").click();
  results.originalModalVisible = await desktop
    .locator("#sharedOriginalReader")
    .isVisible();
  await desktop.keyboard.press("Escape");
  results.moduleAfterOriginalEscape = await desktop
    .locator("#gouBuliCraftModule")
    .isVisible();
  await desktop.keyboard.press("Escape");
  results.moduleAfterEscape = await desktop
    .locator("#gouBuliCraftModule")
    .isVisible();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  mobile.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });
  await openCraft(mobile);
  await mobile.locator("#gbcSkipMixingButton").tap();
  await mobile.waitForTimeout(120);
  await mobile.locator('[data-gbc-stage="steaming"]').tap();
  await mobile.waitForTimeout(560);
  results.mobileRect = await stageRect(mobile);
  results.mobileStage = await mobile.locator("#gbcStageTitle").textContent();
  results.mobileControlsInsideCanvas = await mobile.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas").getBoundingClientRect();
    const selectors = [
      "#gbcSteamLidButton",
      "#gbcCloseButton",
      "#gbcOriginalButton",
      "#gbcSoundButton",
    ];
    return selectors.every((selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return (
        rect.left >= canvas.left &&
        rect.right <= canvas.right &&
        rect.top >= canvas.top &&
        rect.bottom <= canvas.bottom
      );
    });
  });
  await mobile.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-craft-mobile-390.png`,
    fullPage: false,
  });

  await browser.close();

  const desktopAspect = results.desktopRect.width / results.desktopRect.height;
  const mobileAspect = results.mobileRect.width / results.mobileRect.height;
  results.assertions = {
    stageIs16By9:
      Math.abs(desktopAspect - 16 / 9) < 0.01 &&
      Math.abs(mobileAspect - 16 / 9) < 0.01,
    desktopInsideViewport:
      results.desktopRect.left >= 0 &&
      results.desktopRect.top >= 0 &&
      results.desktopRect.right <= results.desktopRect.viewportWidth &&
      results.desktopRect.bottom <= results.desktopRect.viewportHeight,
    laterStagesLockedBeforeMixing: results.lockedStageNav,
    navUnlockedAfterMixing:
      results.navUnlockedAfterMixing && results.navigation === "four stages switched",
    mobileInsideViewport:
      results.mobileRect.left >= 0 &&
      results.mobileRect.top >= 0 &&
      results.mobileRect.right <= results.mobileRect.viewportWidth &&
      results.mobileRect.bottom <= results.mobileRect.viewportHeight,
    mobileNoHorizontalOverflow:
      results.mobileRect.bodyScrollWidth <= results.mobileRect.viewportWidth + 1,
    mobileControlsInsideCanvas: results.mobileControlsInsideCanvas,
    finalPhaseCompleted: results.completedState.phase === "completed",
    allStagesCompleted: Object.values(results.completedState.completed).every(
      Boolean,
    ),
    pleatingCompleted:
      results.pleatingComplete.pleating.count === 18 &&
      results.pleatingComplete.completed.pleating,
    pleatRevealShown:
      results.pleatingComplete.pleating.revealPending &&
      results.pleatReveal.visible &&
      results.pleatReveal.source.endsWith("pleat-hand-reveal.png") &&
      results.pleatReveal.loaded,
    completionTitle: results.completedTitle === "制作完成",
    closeUpKeepsSealClear: !results.completionSealVisible,
    originalOpened: results.originalModalVisible,
    originalEscapeKeepsCraft: results.moduleAfterOriginalEscape,
    secondEscapeClosesCraft: !results.moduleAfterEscape,
    touchNavigation: results.mobileStage === "揭笼",
    soundToggleFeedback: results.soundPressed === "true",
    allStageImagesLoaded: Object.values(results.stageAssets).every(
      (stage) => stage.loaded,
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
