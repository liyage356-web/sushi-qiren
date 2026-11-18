const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-heitou-follow.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

function getMatrixScale(transform) {
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  if (!match) return transform === "none" ? 0 : 1;
  return Number(match[1].split(",")[0]);
}

async function openFollow(page, options = {}) {
  const query = options.debug === false ? "" : "?followDebug=1";
  await page.goto(`${ORIGIN}${query}#heitou/follow`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () =>
      document.querySelector("#storyPageFollow")?.hidden === false &&
      window.heiTouFollow?.getSnapshot().active === true,
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("#heiTouFollow img")].every(
        (image) => image.complete,
      ),
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().ready === true,
    { timeout: 4000 },
  );
  await page.waitForTimeout(850);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("#followStage");
    const viewport = document.querySelector("#followViewport");
    const shang = document.querySelector("#followShang");
    const hold = document.querySelector("#followHold");
    const stageRect = stage.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const shangRect = shang.getBoundingClientRect();
    const holdRect = hold.getBoundingClientRect();
    const images = [...document.querySelectorAll("#heiTouFollow img")].map(
      (image) => ({
        source: decodeURIComponent(new URL(image.src).pathname),
        loaded: image.complete && image.naturalWidth > 0,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      }),
    );
    const worldObjects = [
      ...document.querySelectorAll(".follow-world-object"),
    ].map((object) => ({
      objectId: object.dataset.objectId,
      hidden: object.hidden,
      groundX: Number(object.dataset.groundX),
      groundY: Number(object.dataset.groundY),
      depth: Number(object.dataset.depth),
    }));
    const distant = document.querySelector("#followDistant");
    return {
      controller: window.heiTouFollow.getSnapshot(),
      currentPage: document.querySelector(
        '.story-step-nav button[aria-current="page"]'
      )?.dataset.storyPage,
      currentPageLabel: document.querySelector(
        '.story-step-nav button[aria-current="page"] strong'
      )?.textContent,
      stage: {
        logicalWidth: stage.offsetWidth,
        logicalHeight: stage.offsetHeight,
        renderedWidth: stageRect.width,
        renderedHeight: stageRect.height,
        viewportWidth: viewportRect.width,
        viewportHeight: viewportRect.height,
        scale: Number(
          getComputedStyle(stage).getPropertyValue("--follow-stage-scale")
        ),
      },
      shang: {
        hidden: shang.hidden,
        left: shangRect.left,
        top: shangRect.top,
        width: shangRect.width,
        height: shangRect.height,
        groundX: Number(shang.dataset.groundX),
        groundY: Number(shang.dataset.groundY),
        depth: Number(shang.dataset.depth),
        action: shang.dataset.action,
        walkFrame: shang.dataset.walkFrame,
      },
      hold: {
        width: holdRect.width,
        height: holdRect.height,
        visible: holdRect.width > 0 && holdRect.height > 0,
      },
      progress: {
        transform:
          getComputedStyle(document.querySelector("#followProgressFill"))
            .transform,
        expectedScale: Math.min(
          1,
          Math.max(0, window.heiTouFollow.getSnapshot().playerZ / 56.5),
        ),
      },
      objectCount: document.querySelectorAll(".follow-world-object").length,
      worldObjects,
      roadTileCount: document.querySelectorAll(".follow-road-tile").length,
      distant: {
        source: distant
          ? decodeURIComponent(new URL(distant.src).pathname)
          : "",
        opacity: distant ? Number(getComputedStyle(distant).opacity) : 0,
        filter: distant ? getComputedStyle(distant).filter : "",
      },
      images,
      debugVisible: !document.querySelector("#followDebugPanel").hidden,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      followOverflow:
        document.querySelector("#heiTouFollow").scrollWidth -
        document.querySelector("#heiTouFollow").clientWidth,
      touchAction: getComputedStyle(
        document.querySelector("#followCanvas")
      ).touchAction,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      shangAnimation: getComputedStyle(
        document.querySelector("#followShangImage")
      ).animationName,
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [];
  const checks = {};
  const detail = {};

  function check(name, condition, value = "") {
    checks[name] = {
      passed: Boolean(condition),
      detail: typeof value === "string" ? value : JSON.stringify(value),
    };
  }

  function observe(page) {
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => {
      if (request.url().startsWith(ORIGIN)) {
        errors.push(`request failed: ${request.url()}`);
      }
    });
  }

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const desktop = await desktopContext.newPage();
  observe(desktop);
  await openFollow(desktop);
  const initial = await snapshot(desktop);
  detail.initial = initial;

  check(
    "followRouteAndNavigation",
    initial.currentPage === "follow" &&
      initial.currentPageLabel === "跟随",
    {
      page: initial.currentPage,
      label: initial.currentPageLabel,
    },
  );
  check(
    "unifiedDesignStage",
    Math.abs(initial.stage.logicalWidth - 1920) < 0.1 &&
      Math.abs(initial.stage.logicalHeight - 1080) < 0.1 &&
      initial.stage.scale > 0,
    initial.stage,
  );
  check(
    "storefrontBillboardsRemoved",
    initial.objectCount === 0 &&
      initial.worldObjects.length === 0 &&
      initial.roadTileCount === 22,
    {
      objectCount: initial.objectCount,
      objectIds: initial.worldObjects.map((object) => object.objectId),
      roadTileCount: initial.roadTileCount,
    },
  );
  check(
    "paintedStreetBackdropIsPrimary",
    initial.distant.source ===
      "/images/hei-tou/follow/distant-street-alt.png" &&
      initial.distant.opacity >= 0.99 &&
      initial.distant.filter === "none",
    initial.distant,
  );
  check(
    "allSceneImagesLoad",
    initial.images.length >= 5 &&
      initial.images.every((image) => image.loaded),
    initial.images,
  );
  check(
    "introLowersCamera",
    initial.controller.ready === true &&
      Math.abs(initial.controller.cameraHeight - 1.2) < 0.01,
    {
      ready: initial.controller.ready,
      cameraHeight: initial.controller.cameraHeight,
    },
  );
  check(
    "shangStartsAheadOnRoad",
    initial.shang?.hidden !== true &&
      initial.shang?.width > 0,
    initial.shang,
  );
  check(
    "longPressTargetIsAccessible",
    initial.hold.visible &&
      initial.hold.width >= 160 &&
      initial.hold.height >= 44 &&
      initial.touchAction === "none",
    {
      hold: initial.hold,
      touchAction: initial.touchAction,
    },
  );
  check(
    "debugPanelOptIn",
    initial.debugVisible === true,
    { debugVisible: initial.debugVisible },
  );
  check(
    "desktopHasNoOverflow",
    initial.horizontalOverflow <= 0 && initial.followOverflow <= 0,
    {
      horizontalOverflow: initial.horizontalOverflow,
      followOverflow: initial.followOverflow,
    },
  );

  const groundSamples = [];
  for (const percent of [0, 25, 50, 75]) {
    await desktop.evaluate(
      (targetPercent) =>
        window.heiTouFollow.setProgress(
          56.5 * (targetPercent / 100),
        ),
      percent,
    );
    await desktop.waitForTimeout(90);
    const sample = await snapshot(desktop);
    groundSamples.push({
      percent,
      shangGroundY: sample.shang.groundY,
      visibleObjectGroundY: sample.worldObjects
        .filter((object) => !object.hidden)
        .map((object) => object.groundY),
    });
  }
  check(
    "roadGroundingRemainsStable",
    groundSamples.every(
      (sample) =>
        Number.isFinite(sample.shangGroundY) &&
        Math.abs(sample.shangGroundY - 794.54) < 5 &&
        sample.visibleObjectGroundY.every(
          (groundY) =>
            Number.isFinite(groundY) &&
            groundY > 646 &&
            groundY <= 1080,
        ),
    ),
    groundSamples,
  );
  await desktop.evaluate(() => window.heiTouFollow.setProgress(0));
  await desktop.waitForTimeout(180);

  await desktop.screenshot({
    path: path.join(ROOT, "heitou-follow-initial-desktop-1440.png"),
    fullPage: false,
  });

  await desktop.mouse.move(720, 500);
  await desktop.mouse.down();
  await desktop.waitForTimeout(1150);
  const mouseHolding = await snapshot(desktop);
  detail.mouseHolding = mouseHolding;
  await desktop.screenshot({
    path: path.join(ROOT, "heitou-follow-walking-desktop-1440.png"),
    fullPage: false,
  });
  await desktop.mouse.up();
  check(
    "mouseHoldAdvances",
    mouseHolding.controller.holding === true &&
      mouseHolding.controller.playerZ > 0.75 &&
      mouseHolding.controller.speed > 0.5,
    {
      playerZ: mouseHolding.controller.playerZ,
      speed: mouseHolding.controller.speed,
      action: mouseHolding.controller.action,
    },
  );
  check(
    "shangWalksWithDistanceControl",
    mouseHolding.shang.action === "walk" &&
      mouseHolding.controller.shangZ > initial.controller.shangZ &&
      mouseHolding.controller.distance > 4 &&
      mouseHolding.controller.distance < 13,
    {
      action: mouseHolding.shang.action,
      shangZ: mouseHolding.controller.shangZ,
      distance: mouseHolding.controller.distance,
    },
  );

  await desktop.waitForTimeout(680);
  const slowing = await snapshot(desktop);
  await desktop.waitForTimeout(1100);
  const stopped = await snapshot(desktop);
  check(
    "releaseDeceleratesAndStops",
    slowing.controller.speed < mouseHolding.controller.speed &&
      stopped.controller.speed < 0.08 &&
      stopped.controller.holding === false,
    {
      holdingSpeed: mouseHolding.controller.speed,
      slowingSpeed: slowing.controller.speed,
      stoppedSpeed: stopped.controller.speed,
    },
  );

  const spaceStart = stopped.controller.playerZ;
  await desktop.keyboard.down("Space");
  await desktop.waitForTimeout(620);
  const spaceHolding = await snapshot(desktop);
  await desktop.keyboard.up("Space");
  check(
    "spaceHoldAdvances",
    spaceHolding.controller.holding === true &&
      spaceHolding.controller.playerZ > spaceStart + 0.25,
    {
      startZ: spaceStart,
      endZ: spaceHolding.controller.playerZ,
      holding: spaceHolding.controller.holding,
    },
  );

  await desktop.evaluate(() => window.heiTouFollow.setProgress(18, 32));
  await desktop.waitForTimeout(160);
  const tooFar = await snapshot(desktop);
  check(
    "distanceWarningAppears",
    tooFar.controller.distance > 10.15 &&
      tooFar.controller.warning === true,
    {
      distance: tooFar.controller.distance,
      warning: tooFar.controller.warning,
    },
  );

  await desktop.evaluate(() => window.heiTouFollow.setProgress(22, 25));
  await desktop.keyboard.down("Space");
  await desktop.waitForTimeout(500);
  const tooClose = await snapshot(desktop);
  await desktop.keyboard.up("Space");
  check(
    "minimumDistancePreventsOverlap",
    tooClose.controller.distance > 2.8 &&
      tooClose.controller.playerZ < 22.4 &&
      tooClose.controller.speed < 0.25,
    {
      distance: tooClose.controller.distance,
      playerZ: tooClose.controller.playerZ,
      speed: tooClose.controller.speed,
    },
  );

  await desktop.evaluate(() => window.heiTouFollow.setProgress(54.7));
  await desktop.keyboard.down("Space");
  await desktop.waitForTimeout(390);
  const approaching = await snapshot(desktop);
  await desktop.keyboard.up("Space");
  check(
    "arrivalApproachSlowsDown",
    approaching.controller.speed < mouseHolding.controller.speed * 0.65 &&
      approaching.controller.playerZ > 54.7,
    {
      speed: approaching.controller.speed,
      referenceWalkingSpeed: mouseHolding.controller.speed,
      playerZ: approaching.controller.playerZ,
    },
  );

  await desktop.evaluate(() => {
    const slider = document.querySelector("#followDebugSlider");
    slider.value = "64";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#followDebugAnchors").click();
    document.querySelector("#followDebugVanishing").click();
  });
  const debugState = await desktop.evaluate(() => ({
    sliderValue: document.querySelector("#followDebugSlider").value,
    anchors: document
      .querySelector("#heiTouFollow")
      .classList.contains("show-anchors"),
    vanishing: document
      .querySelector("#heiTouFollow")
      .classList.contains("show-vanishing"),
  }));
  check(
    "debugControlsWork",
    Number(debugState.sliderValue) === 64 &&
      debugState.anchors &&
      debugState.vanishing,
    debugState,
  );

  await desktop.evaluate(() => {
    window.heiTouFollow.reset();
    window.heiTouFollow.complete();
  });
  await desktop.waitForFunction(
    () =>
      document.querySelector("#storyPageCourtyard")?.hidden === false &&
      document.querySelector(
        '.story-step-nav button[aria-current="page"]'
      )?.dataset.storyPage === "courtyard",
    { timeout: 6000 },
  );
  const arrival = await desktop.evaluate(() => ({
    courtVisible:
      document.querySelector("#storyPageCourtyard").hidden === false,
    followActive: window.heiTouFollow.getSnapshot().active,
    activePage: document.querySelector(
      '.story-step-nav button[aria-current="page"]'
    )?.dataset.storyPage,
    originalTriggers: document.querySelectorAll(
      '#storyPageCourtyard [data-original-reader="heitou"]'
    ).length,
  }));
  check(
    "arrivalTransitionsToCourtyard",
    arrival.courtVisible &&
      arrival.activePage === "courtyard" &&
      arrival.followActive === false,
    arrival,
  );

  const originalTrigger = desktop
    .locator('#storyPageCourtyard [data-original-reader="heitou"]')
    .first();
  if (arrival.originalTriggers > 0) {
    await originalTrigger.click();
    await desktop.waitForFunction(
      () => document.querySelector("#sharedOriginalReader")?.open === true,
    );
  }
  const originalReading = await desktop.evaluate(() => ({
    triggerCount: document.querySelectorAll(
      '#storyPageCourtyard [data-original-reader="heitou"]'
    ).length,
    readerOpen:
      document.querySelector("#sharedOriginalReader")?.open === true,
    paragraphCount: document.querySelectorAll(
      "#sharedOriginalReader .shared-original-reader__text p"
    ).length,
  }));
  check(
    "originalReadingStillAvailable",
    originalReading.triggerCount > 0 &&
      originalReading.readerOpen &&
      originalReading.paragraphCount > 0,
    originalReading,
  );
  if (originalReading.readerOpen) {
    await desktop
      .locator("#sharedOriginalReader .shared-original-reader__return")
      .click();
  }

  await desktop.goto(`${ORIGIN}?followDebug=1#heitou/follow`, {
    waitUntil: "domcontentloaded",
  });
  await desktop.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().active === true,
  );
  await desktop.waitForTimeout(1450);
  const replay = await snapshot(desktop);
  check(
    "reentryResetsJourney",
    replay.controller.playerZ === 0 &&
      replay.controller.completed === false &&
      replay.controller.cameraHeight === 1.2,
    replay.controller,
  );

  await desktop.locator("#followSkip").click();
  await desktop.waitForFunction(
    () => document.querySelector("#storyPageCourtyard")?.hidden === false,
    { timeout: 3000 },
  );
  check(
    "skipEntersNextScene",
    await desktop.locator("#storyPageCourtyard").isVisible(),
  );

  const timingContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const timingPage = await timingContext.newPage();
  observe(timingPage);
  await openFollow(timingPage);
  const timingHold = timingPage.locator("#followHold");
  const timingBox = await timingHold.boundingBox();
  await timingPage.mouse.move(
    timingBox.x + timingBox.width / 2,
    timingBox.y + timingBox.height / 2,
  );
  const continuousStartedAt = Date.now();
  await timingPage.mouse.down();
  await timingPage.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().completed === true,
    null,
    { timeout: 60000, polling: "raf" },
  );
  const continuousHoldMs = Date.now() - continuousStartedAt;
  await timingPage.mouse.up();
  await timingPage.waitForTimeout(140);
  const continuousComplete = await snapshot(timingPage);
  const progressScale = Number(
    getMatrixScale(continuousComplete.progress.transform).toFixed(3),
  );
  detail.continuousCompletion = {
    holdMs: continuousHoldMs,
    progressScale,
    controller: continuousComplete.controller,
  };
  check(
    "continuousHoldCompletesNearTwelveSeconds",
    continuousHoldMs >= 11000 && continuousHoldMs <= 13200,
    {
      holdMs: continuousHoldMs,
      progressScale,
      playerZ: continuousComplete.controller.playerZ,
    },
  );
  check(
    "progressAndSceneReachEndpointTogether",
    continuousComplete.controller.completed === true &&
      continuousComplete.controller.playerZ >= 56.485 &&
      Math.abs(progressScale - 1) < 0.002,
    {
      completed: continuousComplete.controller.completed,
      playerZ: continuousComplete.controller.playerZ,
      progressScale,
      progress: continuousComplete.progress,
    },
  );
  await timingPage.waitForFunction(
    () =>
      document.querySelector("#storyPageCourtyard")?.hidden === false &&
      document
        .querySelector('.story-step-nav button[aria-current="page"]')
        ?.dataset.storyPage === "courtyard",
    { timeout: 6000 },
  );
  check(
    "normalHoldCompletionEntersCourtyard",
    await timingPage.locator("#storyPageCourtyard").isVisible(),
  );
  await timingContext.close();

  const resumeContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const resumePage = await resumeContext.newPage();
  observe(resumePage);
  await openFollow(resumePage);
  const resumeHold = resumePage.locator("#followHold");
  const resumeBox = await resumeHold.boundingBox();
  await resumePage.mouse.move(
    resumeBox.x + resumeBox.width / 2,
    resumeBox.y + resumeBox.height / 2,
  );
  const firstHoldStartedAt = Date.now();
  await resumePage.mouse.down();
  await resumePage.waitForTimeout(5000);
  await resumePage.mouse.up();
  const firstHoldMs = Date.now() - firstHoldStartedAt;
  await resumePage.waitForTimeout(900);
  const pausedBeforeWait = await snapshot(resumePage);
  await resumePage.waitForTimeout(700);
  const pausedAfterWait = await snapshot(resumePage);
  const resumedStartedAt = Date.now();
  await resumePage.mouse.down();
  await resumePage.waitForFunction(
    () => window.heiTouFollow?.getSnapshot().completed === true,
    null,
    { timeout: 30000, polling: "raf" },
  );
  const secondHoldMs = Date.now() - resumedStartedAt;
  await resumePage.mouse.up();
  const resumedComplete = await snapshot(resumePage);
  const cumulativeHoldMs = firstHoldMs + secondHoldMs;
  detail.resumeCompletion = {
    firstHoldMs,
    secondHoldMs,
    cumulativeHoldMs,
    pausedBeforeWait: pausedBeforeWait.controller,
    pausedAfterWait: pausedAfterWait.controller,
    completed: resumedComplete.controller,
  };
  check(
    "releasePausesAndResumeContinuesFromCurrentProgress",
    pausedBeforeWait.controller.holding === false &&
      pausedBeforeWait.controller.speed < 0.08 &&
      Math.abs(
        pausedAfterWait.controller.playerZ -
          pausedBeforeWait.controller.playerZ,
      ) < 0.01 &&
      resumedComplete.controller.completed === true &&
      resumedComplete.controller.playerZ >
        pausedAfterWait.controller.playerZ + 10,
    {
      pausedPlayerZ: pausedAfterWait.controller.playerZ,
      resumedController: resumedComplete.controller,
    },
  );
  check(
    "interruptedHoldRetainsCompletedProgress",
    cumulativeHoldMs >= 11000 && cumulativeHoldMs <= 13200,
    {
      firstHoldMs,
      secondHoldMs,
      cumulativeHoldMs,
    },
  );
  await resumeContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const mobile = await mobileContext.newPage();
  observe(mobile);
  await openFollow(mobile);
  const mobileInitial = await snapshot(mobile);
  detail.mobileInitial = mobileInitial;
  check(
    "mobileSceneFillsViewport",
    mobileInitial.stage.scale > 0 &&
      mobileInitial.horizontalOverflow <= 0 &&
      mobileInitial.followOverflow <= 0,
    mobileInitial.stage,
  );
  check(
    "mobileControlsRemainVisible",
    mobileInitial.hold.visible &&
      mobileInitial.hold.height >= 44 &&
      mobileInitial.touchAction === "none",
    mobileInitial.hold,
  );

  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 195, y: 410, radiusX: 8, radiusY: 8 }],
  });
  await mobile.waitForTimeout(920);
  const touchHolding = await snapshot(mobile);
  await mobile.screenshot({
    path: path.join(ROOT, "heitou-follow-touch-mobile-390.png"),
    fullPage: false,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  check(
    "touchHoldAdvances",
    touchHolding.controller.holding === true &&
      touchHolding.controller.playerZ > 0.45 &&
      touchHolding.controller.speed > 0.35,
    {
      holding: touchHolding.controller.holding,
      playerZ: touchHolding.controller.playerZ,
      speed: touchHolding.controller.speed,
    },
  );

  const noDebugContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "no-preference",
  });
  const noDebugPage = await noDebugContext.newPage();
  observe(noDebugPage);
  await openFollow(noDebugPage, { debug: false });
  const noDebug = await snapshot(noDebugPage);
  check(
    "debugPanelHiddenByDefault",
    noDebug.debugVisible === false,
    { debugVisible: noDebug.debugVisible },
  );

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const reduced = await reducedContext.newPage();
  observe(reduced);
  await openFollow(reduced);
  await reduced.keyboard.down("Space");
  await reduced.waitForTimeout(500);
  const reducedState = await snapshot(reduced);
  await reduced.keyboard.up("Space");
  check(
    "reducedMotionDisablesCameraBobAndSpriteAnimation",
    reducedState.reducedMotion === true &&
      reducedState.shangAnimation === "none" &&
      reducedState.controller.holding === true,
    {
      reducedMotion: reducedState.reducedMotion,
      animationName: reducedState.shangAnimation,
      holding: reducedState.controller.holding,
    },
  );

  check("runtimeErrors", errors.length === 0, errors);
  await browser.close();

  const failed = Object.entries(checks)
    .filter(([, result]) => !result.passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    checkCount: Object.keys(checks).length,
    failed,
    errors,
    checks,
    detail,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      failed,
      errors,
      report: REPORT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
