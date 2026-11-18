const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-walk8-finale.json");
const WALK_STORAGE_KEY = "sishi-qiren:walk8-route:v1";
const READING_STORAGE_KEY = "sishi-reading-progress-v1";
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function createPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor || 1,
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
    reducedMotion: options.reducedMotion || "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(`request failed: ${request.url()}`);
  });
  return { context, page, errors };
}

async function openChapterFour(page, { clearProgress = false } = {}) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter4`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter4" &&
      document.querySelector("[data-walk8-reset-open]") !== null,
  );
  if (clearProgress) {
    await page.evaluate((key) => localStorage.removeItem(key), WALK_STORAGE_KEY);
  }
}

async function enterWalk8Interaction(page) {
  await page
    .locator(
      "#sishiOriginal-chapter4 .sishi-original-footer button.is-primary",
    )
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-walk8-reset-open]")?.offsetParent !==
      null,
  );
}

async function openWalk8Experience(page) {
  await enterWalk8Interaction(page);
  await page.locator("[data-walk8-reset-open]").click();
  await page.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  await page.waitForTimeout(180);
}

async function resumeWalk8ExperienceForTest(page) {
  await enterWalk8Interaction(page);
  await page.evaluate(() => {
    const button = document.querySelector("[data-walk8-reset-open]");
    button.removeAttribute("data-walk8-reset-open");
    button.setAttribute("data-walk8-open", "true");
    button.click();
    button.removeAttribute("data-walk8-open");
    button.setAttribute("data-walk8-reset-open", "");
  });
  await page.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  await page.waitForTimeout(180);
}

async function openStageFromReading(page) {
  await page.locator("#readingEntry").click();
  await page.waitForFunction(
    () => document.querySelector("#readingDialog")?.open === true,
  );
  await page.locator("#readingDialogConfirm").click();
  await page.waitForFunction(
    () => document.querySelector("#readingDialog")?.open === false,
  );
  await openWalk8Experience(page);
}

async function startStage(page) {
  await page.locator("#walk8Start").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#walk8Stage")?.dataset.experienceState ===
      "guiding",
  );
}

async function pointAtProgress(page, progress) {
  return page.evaluate((nextProgress) => {
    const route = document.querySelector("#walk8RoutePath");
    const point = route.getPointAtLength(
      Math.max(0, Math.min(1, nextProgress)) * route.getTotalLength(),
    );
    const matrix = route.getScreenCTM();
    return {
      x: point.x * matrix.a + point.y * matrix.c + matrix.e,
      y: point.x * matrix.b + point.y * matrix.d + matrix.f,
    };
  }, progress);
}

async function mouseGuide(page, fromProgress, toProgress, steps = 18) {
  const start = await pointAtProgress(page, fromProgress);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let index = 1; index <= steps; index += 1) {
    const progress =
      fromProgress + ((toProgress - fromProgress) * index) / steps;
    const point = await pointAtProgress(page, progress);
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
  await page.waitForTimeout(35);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("#walk8Stage");
    const finale = document.querySelector("#walk8Finale");
    const panel = document.querySelector("#walk8FinalePanel");
    const route = document.querySelector(".walk8-route");
    const street = document.querySelector(".walk8-finale__street");
    const carrier = document.querySelector(".walk8-finale__carrier");
    const carryImage = document.querySelector(".walk8-finale__carry img");
    const crowd = document.querySelector(".walk8-finale__crowd");
    const pompom = document.querySelector(".walk8-finale__pompom");
    const cheer = document.querySelector(".walk8-finale__cheer");
    const readingDialog = document.querySelector("#readingDialog");
    const readingText = document.querySelector("#readingText");
    const readingTarget = readingText?.querySelector("#si-shi-ba-yang-p20");
    const panelRect = panel.getBoundingClientRect();
    const buttons = [
      document.querySelector("#walk8FinaleRestart"),
      document.querySelector("#walk8FinaleContinue"),
      document.querySelector("#walk8FinaleBack"),
    ].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        text: button.textContent.trim(),
        visible:
          !button.hidden &&
          getComputedStyle(button).visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0,
        width: rect.width,
        height: rect.height,
      };
    });
    return {
      model: window.walk8StageController?.getSnapshot?.(),
      stageClass: stage.className,
      stageLabel: stage.getAttribute("aria-label"),
      performanceState: stage.dataset.performance || "",
      finaleHidden: finale.hidden,
      finaleAriaHidden: finale.getAttribute("aria-hidden"),
      finaleOpacity: getComputedStyle(finale).opacity,
      routeOpacity: getComputedStyle(route).opacity,
      finaleStreetOpacity: getComputedStyle(street).opacity,
      finaleStreetBackground: getComputedStyle(street).backgroundImage,
      carrierOpacity: getComputedStyle(carrier).opacity,
      carrierTransform: getComputedStyle(carrier).transform,
      carryLoaded:
        carryImage.complete &&
        carryImage.naturalWidth > 0 &&
        decodeURIComponent(new URL(carryImage.src).pathname).endsWith(
          "/assets/walk8/yu-liu-carry.png",
        ),
      crowdOpacity: getComputedStyle(crowd).opacity,
      crowdAnimationDuration: getComputedStyle(crowd).animationDuration,
      crowdAnimationDelay: getComputedStyle(crowd).animationDelay,
      pompomAnimationName: getComputedStyle(pompom).animationName,
      pompomAnimationDuration: getComputedStyle(pompom).animationDuration,
      cheerOpacity: getComputedStyle(cheer).opacity,
      cheerText: cheer.textContent.replace(/\s+/g, " ").trim(),
      panelHidden: panel.hidden,
      panelRect: {
        left: panelRect.left,
        top: panelRect.top,
        right: panelRect.right,
        bottom: panelRect.bottom,
        width: panelRect.width,
        height: panelRect.height,
      },
      buttons,
      originalPassage: document
        .querySelector("#walk8FinaleOriginal")
        .textContent.trim(),
      walkStorage: JSON.parse(localStorage.getItem(
        "sishi-qiren:walk8-route:v1",
      ) || "null"),
      readingDialogOpen: Boolean(readingDialog?.open),
      readingScrollTop: readingDialog?.scrollTop || 0,
      readingTargetTop: readingTarget
        ? Math.max(0, readingTarget.offsetTop - 120)
        : null,
      readingTargetText: readingTarget?.textContent.trim() || "",
      readingProgressText:
        readingDialog?._sishiProgress?.textContent.trim() || "",
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  const screenshots = [];
  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  const desktopSession = await createPage(browser, {
    width: 1440,
    height: 960,
  });
  const desktop = desktopSession.page;
  errors.push(...desktopSession.errors);
  await openChapterFour(desktop, { clearProgress: true });
  await openStageFromReading(desktop);

  const beforeStart = await snapshot(desktop);
  check(
    "finaleIsGatedBeforeRoute",
    beforeStart.model?.progress === 0 &&
      beforeStart.model?.performanceState === "idle" &&
      beforeStart.finaleHidden &&
      beforeStart.panelHidden,
    JSON.stringify(beforeStart),
  );

  await startStage(desktop);
  await mouseGuide(desktop, 0, 0.26, 30);
  const leftMilestone = await snapshot(desktop);
  await mouseGuide(desktop, leftMilestone.model.progress, 0.51, 28);
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchPending === true,
  );
  await desktop.keyboard.press("Space");
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchCompleted === true,
  );
  const afterSwitch = await snapshot(desktop);
  await mouseGuide(desktop, afterSwitch.model.progress, 0.76, 32);
  const rightMilestone = await snapshot(desktop);
  await mouseGuide(desktop, rightMilestone.model.progress, 0.94, 28);
  const rightPickup = await snapshot(desktop);
  await mouseGuide(desktop, rightPickup.model.progress, 1, 22);
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().performanceActive === true,
  );
  const performanceStart = await snapshot(desktop);
  const startedAt = Date.now();
  check(
    "manualRouteAndSwitchUnlockFinale",
    performanceStart.model?.routeCompleted === true &&
      performanceStart.model?.manualCompleted === true &&
      performanceStart.model?.interactionCompleted === true &&
      performanceStart.model?.completionSource === "manual" &&
      performanceStart.model?.performanceActive === true &&
      performanceStart.stageClass.includes("is-finale"),
    JSON.stringify(performanceStart),
  );
  await desktop.waitForTimeout(900);
  const performanceRevealed = await snapshot(desktop);
  check(
    "finaleShowsStreetAndCompleteCarry",
    !performanceRevealed.finaleHidden &&
      performanceRevealed.finaleAriaHidden === "false" &&
      performanceRevealed.finaleStreetBackground.includes(
        "tianjin-street.jpg",
      ) &&
      performanceRevealed.carryLoaded &&
      Number(performanceRevealed.finaleStreetOpacity) > 0.8 &&
      Number(performanceRevealed.carrierOpacity) > 0.8,
    JSON.stringify(performanceRevealed),
  );

  await desktop.waitForTimeout(1500);
  const crowdSnapshot = await snapshot(desktop);
  check(
    "crowdFadesInWithoutCameraShake",
    Number(crowdSnapshot.crowdOpacity) > 0.15 &&
      crowdSnapshot.crowdAnimationDuration === "0.76s" &&
      crowdSnapshot.crowdAnimationDelay === "1.9s" &&
      crowdSnapshot.carrierTransform !== performanceRevealed.carrierTransform,
    JSON.stringify({ performanceRevealed, crowdSnapshot }),
  );

  await desktop.waitForTimeout(2500);
  const activeFinale = await snapshot(desktop);
  check(
    "pompomsAndIllustrationFeedbackAnimate",
    activeFinale.pompomAnimationName === "walk8-finale-pompom" &&
      activeFinale.pompomAnimationDuration === "1.18s" &&
      Number(activeFinale.cheerOpacity) > 0.8 &&
      activeFinale.cheerText.includes("好！这才叫绝活！") &&
      activeFinale.cheerText.includes("非原著原文"),
    JSON.stringify(activeFinale),
  );
  check(
    "routeLineFadesForPerformance",
    Number(activeFinale.routeOpacity) <= 0.05 &&
      Number(activeFinale.finaleOpacity) > 0.95 &&
      activeFinale.panelHidden,
    JSON.stringify(activeFinale),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-finale-desktop-playing.png"),
    fullPage: false,
  });
  screenshots.push("walk8-finale-desktop-playing.png");

  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().performanceFinished ===
      true,
  );
  const elapsed = Date.now() - startedAt;
  await desktop.waitForTimeout(480);
  const finished = await snapshot(desktop);
  const expectedPassage = await desktop.evaluate(
    () =>
      window.SUSHI_QIREN_ORIGINAL_TEXT.stories["si-shi-ba-yang"].paragraphs.find(
        (paragraph) => paragraph.order === 19,
      ).content,
  );
  check(
    "finaleRunsForFiveToEightSeconds",
    elapsed >= 5900 && elapsed <= 7900,
    JSON.stringify({ elapsed }),
  );
  check(
    "finalControlsAppearAfterPerformance",
    finished.model?.performanceFinished === true &&
      !finished.panelHidden &&
      finished.buttons.length === 3 &&
      finished.buttons.every(
        (button) => button.visible && button.height >= 40,
      ) &&
      finished.buttons.map((button) => button.text).join("|") ===
        "重新体验|继续阅读 →|返回上一段",
    JSON.stringify(finished),
  );
  check(
    "originalPassageIsSeparatedFromAuxiliaryFeedback",
    finished.originalPassage === expectedPassage &&
      !expectedPassage.includes("好！这才叫绝活！") &&
      finished.cheerText !== finished.originalPassage,
    JSON.stringify({
      expectedPassage,
      shown: finished.originalPassage,
    }),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-finale-desktop-finished.png"),
    fullPage: false,
  });
  screenshots.push("walk8-finale-desktop-finished.png");

  const readingStorageBefore = await desktop.evaluate((key) =>
    localStorage.getItem(key),
  READING_STORAGE_KEY);
  await desktop.locator("#walk8FinaleContinue").click();
  await desktop.waitForFunction(
    () =>
      document.querySelector("#walk8Experience")?.open === false &&
      document.querySelector("#readingDialog")?.open === true,
  );
  await desktop.waitForTimeout(120);
  const continuedReading = await snapshot(desktop);
  const readingStorageAfter = await desktop.evaluate((key) =>
    localStorage.getItem(key),
  READING_STORAGE_KEY);
  check(
    "continueReadingOpensAfterWalkParagraph",
    continuedReading.readingDialogOpen &&
      continuedReading.readingScrollTop === continuedReading.readingTargetTop &&
      continuedReading.readingTargetText.startsWith(
        "可不久，听说又有人开始练这走八字的把式了。",
      ) &&
      continuedReading.readingProgressText !== "已读 0%",
    JSON.stringify(continuedReading),
  );
  check(
    "continueReadingPreservesChapterProgress",
    readingStorageAfter === readingStorageBefore &&
      Boolean(readingStorageBefore),
    JSON.stringify({
      readingStorageBefore,
      readingStorageAfter,
    }),
  );
  await desktop.context().close();

  const demoSession = await createPage(browser, {
    width: 1280,
    height: 860,
  });
  const demoPage = demoSession.page;
  errors.push(...demoSession.errors);
  await openChapterFour(demoPage, { clearProgress: true });
  await openWalk8Experience(demoPage);
  await demoPage.locator("#walk8Demo").click();
  await demoPage.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchPending === true,
  );
  await demoPage.keyboard.press("Space");
  await demoPage.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().performanceActive === true,
  );
  const demoFinale = await snapshot(demoPage);
  check(
    "demoPerformanceDoesNotRecordManualSuccess",
    demoFinale.model?.routeCompleted === true &&
      demoFinale.model?.manualCompleted === false &&
      demoFinale.model?.interactionCompleted === false &&
      demoFinale.model?.completionSource === "demo" &&
      demoFinale.model?.performanceActive === true &&
      demoFinale.walkStorage?.manualCompleted === false &&
      demoFinale.walkStorage?.interactionCompleted === false,
    JSON.stringify(demoFinale),
  );
  await demoPage.context().close();

  const mobileSession = await createPage(
    browser,
    { width: 390, height: 844 },
    {
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    },
  );
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await openChapterFour(mobile, { clearProgress: true });
  await mobile.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        progress: 1,
        routeProgress: 1,
        currentAction: "return",
        activeHand: "left",
        switchCompleted: true,
        interactionCompleted: true,
        routeCompleted: true,
        manualCompleted: true,
        completionSource: "manual",
        performancePlayed: false,
        performanceFinished: false,
      }),
    );
  }, WALK_STORAGE_KEY);
  await resumeWalk8ExperienceForTest(mobile);
  await mobile.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().performanceFinished ===
      true,
  );
  await mobile.waitForTimeout(120);
  const mobileFinished = await snapshot(mobile);
  check(
    "mobileFinalePanelFitsAndRemainsUsable",
    mobileFinished.panelRect.left >= 0 &&
      mobileFinished.panelRect.right <= mobileFinished.viewportWidth &&
      mobileFinished.panelRect.bottom <= mobileFinished.viewportHeight &&
      mobileFinished.documentScrollWidth <= mobileFinished.viewportWidth &&
      mobileFinished.buttons.every(
        (button) => button.visible && button.height >= 44,
      ),
    JSON.stringify(mobileFinished),
  );
  await mobile.screenshot({
    path: path.join(ROOT, "walk8-finale-mobile-finished.png"),
    fullPage: false,
  });
  screenshots.push("walk8-finale-mobile-finished.png");
  await mobile.locator("#walk8FinaleBack").click();
  await mobile.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
  const returnedToSection = await mobile.evaluate(() => ({
    page: document.body.dataset.sishiPage,
    sectionVisible:
      getComputedStyle(document.querySelector("#walkFigureEight")).display !==
      "none",
    dialogOpen: document.querySelector("#walk8Experience").open,
  }));
  check(
    "backReturnsToPreviousWalkSection",
    returnedToSection.page === "chapter4" &&
      returnedToSection.sectionVisible &&
      returnedToSection.dialogOpen === false,
    JSON.stringify(returnedToSection),
  );
  await mobile.context().close();

  check("noBrowserErrors", errors.length === 0, errors.join("\n"));
  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        passed,
        checkCount: report.checkCount,
        failed: Object.entries(checks)
          .filter(([, entry]) => !entry.passed)
          .map(([name]) => name),
        errors,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
