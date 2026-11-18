const fs = require("node:fs");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
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
  if (!executable) {
    throw new Error("No installed Edge or Chrome executable found.");
  }
  return executable;
}

async function openSteaming(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    window.gouBuliCraft.skipMixing();
    await window.gouBuliCraft.showStage("steaming", { animate: false });
  });
  await page.locator("#gbcSteamingLayer").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document.querySelector("#gbcSteamClosedImage")?.complete === true &&
      document.querySelector("#gbcSteamOpenImage")?.complete === true,
  );
  await page.waitForTimeout(180);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas");
    const layer = document.querySelector("#gbcSteamingLayer");
    const closed = document.querySelector("#gbcSteamClosedImage");
    const open = document.querySelector("#gbcSteamOpenImage");
    const lid = document.querySelector("#gbcSteamLidButton");
    const actions = document.querySelector("#gbcSteamActions");
    const story = document.querySelector("#gbcSteamStoryButton");
    const replay = document.querySelector("#gbcSteamReplayButton");
    const canvasRect = canvas.getBoundingClientRect();
    const inside = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= canvasRect.left - 1 &&
        rect.top >= canvasRect.top - 1 &&
        rect.right <= canvasRect.right + 1 &&
        rect.bottom <= canvasRect.bottom + 1
      );
    };
    return {
      state: window.gouBuliCraft.getState(),
      layerPhase: layer.dataset.phase,
      layerClasses: layer.className,
      images: {
        closedSource: closed.getAttribute("src"),
        closedOpacity: Number.parseFloat(getComputedStyle(closed).opacity),
        closedLoaded: closed.complete && closed.naturalWidth > 0,
        openSource: open.getAttribute("src"),
        openOpacity: Number.parseFloat(getComputedStyle(open).opacity),
        openClipPath: getComputedStyle(open).clipPath,
        openLoaded: open.complete && open.naturalWidth > 0,
      },
      guide: {
        counter: document.querySelector("#gbcSteamCounter").textContent.trim(),
        title: document.querySelector("#gbcSteamTitle").textContent.trim(),
        copy: document.querySelector("#gbcSteamCopy").textContent.trim(),
        feedback: document
          .querySelector("#gbcSteamFeedback")
          .textContent.trim(),
        hint: document.querySelector("#gbcStageHint").textContent.trim(),
      },
      controls: {
        lidVisible: !lid.hidden && getComputedStyle(lid).display !== "none",
        lidDisabled: lid.disabled,
        actionsVisible:
          !actions.hidden && getComputedStyle(actions).display !== "none",
        storyText: story.textContent.trim(),
        replayText: replay.textContent.trim(),
        storyInsideCanvas: inside(story),
        replayInsideCanvas: inside(replay),
      },
      vapor: {
        spans: [...layer.querySelectorAll(".gbc-steam-vapor span")].length,
        running: [
          ...layer.querySelectorAll(".gbc-steam-vapor span"),
        ].filter((span) => getComputedStyle(span).animationName !== "none")
          .length,
      },
      canvas: {
        width: canvasRect.width,
        height: canvasRect.height,
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      },
    };
  });
}

async function finishOpening(page) {
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "completed",
    null,
    { timeout: 5000 },
  );
  await page.waitForTimeout(80);
}

async function runDesktop(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) =>
    errors.push(`desktop pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`desktop console: ${message.text()}`);
    }
  });

  await openSteaming(page);
  results.desktopInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-initial-desktop.png`,
  });

  const startedAt = Date.now();
  await page.locator("#gbcSteamLidButton").click();
  results.desktopImmediate = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState(),
    lidVisible: !document.querySelector("#gbcSteamLidButton").hidden,
    phase: document.querySelector("#gbcSteamingLayer").dataset.phase,
  }));
  await page.waitForTimeout(620);
  results.desktopHalf = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-half-desktop.png`,
  });

  await page.waitForTimeout(700);
  results.desktopOpening = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-opening-desktop.png`,
  });

  await finishOpening(page);
  results.desktopDuration = Date.now() - startedAt;
  results.desktopComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-complete-desktop.png`,
  });

  await page.evaluate(() => window.gouBuliCraft.openSteamer());
  await page.waitForTimeout(120);
  results.repeatTrigger = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );

  await page.locator("#gbcOriginalButton").click();
  await page.locator("#sharedOriginalReader").waitFor({ state: "visible" });
  results.progressBeforeOriginal = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );
  await page.locator(".shared-original-reader__close").click();
  await page.waitForTimeout(80);
  results.progressAfterOriginal = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );

  await page.locator("#gbcSteamStoryButton").click();
  await page.waitForFunction(
    () => window.dogBuLiStory.getCurrentPage() === "market",
  );
  results.storyRoute = await page.evaluate(() => ({
    page: window.dogBuLiStory.getCurrentPage(),
    craftOpen: window.gouBuliCraft.isOpen(),
    phase: window.gouBuliCraft.getState().phase,
  }));

  await page.evaluate(() => window.dogBuLiStory.showPage("craft", false));
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.locator("#gbcResumePrompt").waitFor({ state: "visible" });
  await page.locator("#gbcResumeButton").click();
  await page.locator("#gbcSteamReplayButton").click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "mixing",
  );
  results.desktopReplay = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );
  await page.close();
}

async function runMobile(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  page.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });

  await openSteaming(page);
  results.mobileInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-initial-mobile-390.png`,
  });
  await page.locator("#gbcSteamLidButton").tap();
  await page.waitForTimeout(620);
  results.mobileHalf = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-half-mobile-390.png`,
  });
  await finishOpening(page);
  results.mobileComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-steaming-complete-mobile-390.png`,
  });
  await page.close();
}

async function runReducedMotion(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) =>
    errors.push(`reduced-motion pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`reduced-motion console: ${message.text()}`);
    }
  });

  await openSteaming(page);
  const startedAt = Date.now();
  await page.locator("#gbcSteamLidButton").click();
  await finishOpening(page);
  results.reducedMotion = {
    duration: Date.now() - startedAt,
    state: await page.evaluate(() => window.gouBuliCraft.getState()),
  };
  await page.close();
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = {};
  const errors = [];

  await runDesktop(browser, results, errors);
  await runMobile(browser, results, errors);
  await runReducedMotion(browser, results, errors);
  await browser.close();

  results.assertions = {
    desktopInitial:
      results.desktopInitial.state.phase === "steaming" &&
      results.desktopInitial.images.closedSource.endsWith(
        "steamer-closed.webp",
      ) &&
      results.desktopInitial.images.closedLoaded &&
      results.desktopInitial.images.closedOpacity >= 0.98 &&
      results.desktopInitial.images.openLoaded &&
      results.desktopInitial.controls.lidVisible &&
      !results.desktopInitial.controls.actionsVisible &&
      results.desktopInitial.guide.copy === "包子蒸好了，揭开笼盖看看吧。" &&
      results.desktopInitial.vapor.spans === 4 &&
      results.desktopInitial.vapor.running === 4,
    openingIsLocked:
      results.desktopImmediate.state.steaming.opened &&
      results.desktopImmediate.state.steaming.busy &&
      !results.desktopImmediate.lidVisible,
    halfOpenState:
      results.desktopHalf.images.closedOpacity >= 0.98 &&
      results.desktopHalf.images.openOpacity >= 0.98 &&
      results.desktopHalf.images.openClipPath.includes("ellipse") &&
      results.desktopHalf.layerPhase === "half",
    completeState:
      results.desktopComplete.state.phase === "completed" &&
      results.desktopComplete.state.steaming.phase === "complete" &&
      results.desktopComplete.state.completed.steaming &&
      results.desktopComplete.images.openSource.endsWith(
        "steamer-open.webp",
      ) &&
      results.desktopComplete.images.openLoaded &&
      results.desktopComplete.images.openOpacity >= 0.98 &&
      results.desktopComplete.images.closedOpacity <= 0.02 &&
      !results.desktopComplete.controls.lidVisible &&
      results.desktopComplete.controls.actionsVisible &&
      results.desktopComplete.guide.title === "十八褶，一口鲜" &&
      results.desktopComplete.guide.hint.includes("十八褶") &&
      results.desktopComplete.layerClasses.includes("is-steam-fading"),
    durationInRange:
      results.desktopDuration >= 2000 && results.desktopDuration <= 3100,
    repeatedTriggerIgnored:
      results.repeatTrigger.phase === "completed" &&
      results.repeatTrigger.steaming.busy === false,
    originalPreservesProgress:
      JSON.stringify(results.progressBeforeOriginal) ===
      JSON.stringify(results.progressAfterOriginal),
    storyAction:
      results.storyRoute.page === "market" &&
      !results.storyRoute.craftOpen &&
      results.storyRoute.phase === "completed",
    replayAction: results.desktopReplay.phase === "mixing",
    mobileTouchFlow:
      results.mobileHalf.layerPhase === "half" &&
      results.mobileComplete.state.phase === "completed" &&
      results.mobileComplete.state.completed.steaming &&
      results.mobileComplete.controls.actionsVisible,
    mobileControlsInsideCanvas:
      results.mobileComplete.controls.storyInsideCanvas &&
      results.mobileComplete.controls.replayInsideCanvas,
    mobileNoHorizontalOverflow:
      results.mobileComplete.canvas.bodyScrollWidth <=
      results.mobileComplete.canvas.viewportWidth + 1,
    reducedMotionWorks:
      results.reducedMotion.state.phase === "completed" &&
      results.reducedMotion.duration < 600,
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
