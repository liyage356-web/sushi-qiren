const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-walk8-actions-switch.json");
const STORAGE_KEY = "sishi-qiren:walk8-route:v1";
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

async function openStage(page, { clearProgress = false } = {}) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter4`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.querySelector("[data-walk8-reset-open]") !== null,
  );
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
  if (clearProgress) {
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  }
  await page.locator("[data-walk8-reset-open]").click();
  await page.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
  await page.waitForTimeout(320);
}

async function closeStage(page) {
  await page.locator("#walk8Close").click();
  await page.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
}

async function reopenStage(page) {
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

async function snapshot(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("#walk8Stage");
    const prompt = document.querySelector("#walk8SwitchPrompt");
    const button = document.querySelector("#walk8SwitchButton");
    const spoon = document.querySelector(".walk8-copper-spoon");
    const actor = document.querySelector(".walk8-yu-liu");
    const activeSprite = document.querySelector(
      ".walk8-yu-liu__sprite.is-active",
    );
    const actorStyle = activeSprite ? getComputedStyle(activeSprite) : null;
    const spoonStyle = getComputedStyle(spoon);
    const buttonRect = button.getBoundingClientRect();
    const actorRect = actor.getBoundingClientRect();
    const leftBucketRect = document
      .querySelector(".walk8-bucket-slot--left")
      .getBoundingClientRect();
    const rightBucketRect = document
      .querySelector(".walk8-bucket-slot--right")
      .getBoundingClientRect();
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      return (
        !element.hidden &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0
      );
    };
    return {
      model: window.walk8StageController?.getSnapshot?.(),
      status: document
        .querySelector("#walk8StageStatus")
        .textContent.trim(),
      activePose: activeSprite?.dataset.pose || "",
      activeSpriteSource: activeSprite?.src || "",
      spriteTransitionDuration: actorStyle?.transitionDuration || "",
      switchState: stage.dataset.switchState || "",
      actorClassName: actor.className,
      actorTransform: getComputedStyle(
        document.querySelector(".walk8-yu-liu__portrait"),
      ).transform,
      promptHidden: prompt.hidden,
      promptAriaHidden: prompt.getAttribute("aria-hidden"),
      promptVisible: isVisible(prompt),
      buttonHidden: button.hidden,
      buttonVisible: isVisible(button),
      buttonDisabled: button.disabled,
      buttonText: button.textContent.trim(),
      buttonSize: {
        width: buttonRect.width,
        height: buttonRect.height,
      },
      spoonAnimation: spoonStyle.animationName,
      spoonOpacity: spoonStyle.opacity,
      spoonTransform: spoonStyle.transform,
      actorRect: {
        left: actorRect.left,
        top: actorRect.top,
        width: actorRect.width,
        height: actorRect.height,
      },
      leftBucketRect: {
        left: leftBucketRect.left,
        top: leftBucketRect.top,
        width: leftBucketRect.width,
        height: leftBucketRect.height,
      },
      rightBucketRect: {
        left: rightBucketRect.left,
        top: rightBucketRect.top,
        width: rightBucketRect.width,
        height: rightBucketRect.height,
      },
      storage: JSON.parse(localStorage.getItem(
        "sishi-qiren:walk8-route:v1",
      ) || "null"),
      startLabel: document
        .querySelector("#walk8Start .walk8-start__label")
        ?.textContent.trim(),
    };
  });
}

async function mouseGuide(page, fromProgress, toProgress, steps = 16) {
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

async function touchGuide(page, fromProgress, toProgress, steps = 16) {
  const client = await page.context().newCDPSession(page);
  const start = await pointAtProgress(page, fromProgress);
  const point = (position) => ({
    x: position.x,
    y: position.y,
    id: 1,
    radiusX: 6,
    radiusY: 6,
    force: 1,
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(start)],
  });
  for (let index = 1; index <= steps; index += 1) {
    const progress =
      fromProgress + ((toProgress - fromProgress) * index) / steps;
    const next = await pointAtProgress(page, progress);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [point(next)],
    });
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(45);
}

function rectsClose(left, right, tolerance = 1.5) {
  return ["left", "top", "width", "height"].every(
    (key) => Math.abs(left[key] - right[key]) <= tolerance,
  );
}

function parseMilliseconds(value) {
  const first = String(value).split(",")[0].trim();
  return first.endsWith("ms")
    ? Number.parseFloat(first)
    : Number.parseFloat(first) * 1000;
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
  await openStage(desktop, { clearProgress: true });

  const assets = await desktop.evaluate(() =>
    [...document.querySelectorAll(".walk8-yu-liu__sprite")].map((sprite) => ({
      pose: sprite.dataset.pose,
      loaded: sprite.complete && sprite.naturalWidth > 0,
      source: decodeURIComponent(new URL(sprite.src).pathname),
    })),
  );
  check(
    "fourActorAssetsLoad",
    ["idle", "left", "right", "switch"].every((pose) =>
      assets.some(
        (asset) =>
          asset.pose === pose &&
          asset.loaded &&
          asset.source.endsWith(`/assets/walk8/yu-liu-${pose}.png`),
      ),
    ),
    JSON.stringify(assets),
  );

  const nodeGeometry = await desktop.evaluate(() => {
    const route = document.querySelector("#walk8RoutePath");
    const length = route.getTotalLength();
    return window.walk8StageModel.routeNodes.map((node) => {
      const point = route.getPointAtLength(node.progress * length);
      return {
        id: node.id,
        progress: node.progress,
        action: node.action,
        x: point.x,
        y: point.y,
      };
    });
  });
  const node = (id) => nodeGeometry.find((entry) => entry.id === id);
  check(
    "sixNodesMapToRouteGeometry",
    nodeGeometry.length === 6 &&
      node("left-orbit").x < 960 &&
      node("left-pickup").x < 691 &&
      Math.abs(node("left-pickup").y - 540) < 40 &&
      Math.hypot(node("center-switch").x - 960, node("center-switch").y - 540) <
        36 &&
      node("right-orbit").x > 1050 &&
      node("right-pickup").x > 1229 &&
      Math.abs(node("right-pickup").y - 540) < 40 &&
      Math.hypot(node("center-return").x - 960, node("center-return").y - 540) <
        60,
    JSON.stringify(nodeGeometry),
  );

  const initial = await snapshot(desktop);
  await startStage(desktop);
  await mouseGuide(desktop, 0, 0.04, 10);
  const leftOrbit = await snapshot(desktop);
  check(
    "leftOrbitUsesLeftAction",
    leftOrbit.model?.currentAction === "left" &&
      leftOrbit.activePose === "left" &&
      leftOrbit.spoonAnimation === "none" &&
      Math.abs(
        leftOrbit.model.progress - node("left-orbit").progress,
      ) < 0.02,
    JSON.stringify(leftOrbit),
  );
  check(
    "actorAndBucketsRemainInSeparateLayers",
    !rectsClose(leftOrbit.actorRect, initial.leftBucketRect) &&
      rectsClose(leftOrbit.leftBucketRect, initial.leftBucketRect) &&
      rectsClose(leftOrbit.rightBucketRect, initial.rightBucketRect),
    JSON.stringify({
      initial,
      leftOrbit,
    }),
  );

  await mouseGuide(
    desktop,
    leftOrbit.model.progress,
    node("left-pickup").progress + 0.006,
    18,
  );
  const leftPickup = await snapshot(desktop);
  check(
    "leftPickupShowsSpoonFeedback",
    leftPickup.model?.currentAction === "take-left" &&
      leftPickup.activePose === "left" &&
      leftPickup.model?.activeHand === "right" &&
      leftPickup.spoonAnimation === "walk8-scoop-left" &&
      Number(leftPickup.spoonOpacity) > 0 &&
      leftPickup.status.includes("右手舀起一块药糖"),
    JSON.stringify(leftPickup),
  );
  const transitionMs = parseMilliseconds(leftPickup.spriteTransitionDuration);
  check(
    "actionSpriteTransitionIsSmooth",
    transitionMs >= 150 && transitionMs <= 250,
    JSON.stringify({ transitionMs, style: leftPickup.spriteTransitionDuration }),
  );
  await desktop.waitForTimeout(580);
  const leftPickupSettled = await snapshot(desktop);
  check(
    "pickupActionReturnsToOrbit",
    leftPickupSettled.model?.currentAction === "left" &&
      leftPickupSettled.activePose === "left",
    JSON.stringify(leftPickupSettled),
  );

  await mouseGuide(
    desktop,
    leftPickupSettled.model.progress,
    0.505,
    42,
  );
  const switchPaused = await snapshot(desktop);
  check(
    "switchPausesAtTrueCenterNode",
    Math.abs(switchPaused.model?.progress - 0.5) < 0.0002 &&
      switchPaused.model?.switchPending === true &&
      switchPaused.model?.switchCompleted === false &&
      switchPaused.model?.currentAction === "switch" &&
      switchPaused.activePose === "switch" &&
      switchPaused.switchState === "pending" &&
      switchPaused.promptVisible &&
      switchPaused.promptAriaHidden === "false" &&
      switchPaused.buttonVisible &&
      !switchPaused.buttonDisabled,
    JSON.stringify(switchPaused),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-switch-pending-desktop.png"),
    fullPage: false,
  });
  screenshots.push("walk8-switch-pending-desktop.png");

  const pausedProgress = switchPaused.model.progress;
  await mouseGuide(desktop, pausedProgress, 0.51, 4);
  const blockedWhilePending = await snapshot(desktop);
  check(
    "pendingSwitchBlocksRoute",
    blockedWhilePending.model?.progress === pausedProgress &&
      blockedWhilePending.model?.switchPending === true,
    JSON.stringify(blockedWhilePending),
  );

  await closeStage(desktop);
  await reopenStage(desktop);
  const restoredPending = await snapshot(desktop);
  check(
    "pendingSwitchRestoresOnReentry",
    Math.abs(restoredPending.model?.progress - 0.5) < 0.0002 &&
      restoredPending.model?.switchPending === true &&
      restoredPending.promptVisible &&
      restoredPending.buttonVisible &&
      restoredPending.status.includes("中央换手点"),
    JSON.stringify(restoredPending),
  );

  await desktop.keyboard.press("Space");
  await desktop.waitForTimeout(75);
  const switching = await snapshot(desktop);
  check(
    "switchActionPlaysOnce",
    switching.model?.switchAnimating === true &&
      switching.model?.switchPending === false &&
      switching.model?.currentAction === "switch" &&
      switching.activePose === "switch" &&
      switching.actorClassName.includes("is-switching") &&
      switching.switchState === "playing" &&
      switching.spoonAnimation === "none",
    JSON.stringify(switching),
  );
  await desktop.keyboard.press("Space");
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchCompleted === true,
  );
  await desktop.keyboard.press("Space");
  const switchComplete = await snapshot(desktop);
  check(
    "singleSwitchChangesHandAndClearsPrompt",
    switchComplete.model?.switchCompleted === true &&
      switchComplete.model?.activeHand === "left" &&
      switchComplete.model?.switchPending === false &&
      switchComplete.model?.switchAnimating === false &&
      switchComplete.model?.currentAction === "right" &&
      switchComplete.activePose === "right" &&
      !switchComplete.promptVisible &&
      !switchComplete.buttonVisible &&
      switchComplete.status.includes("换手完成"),
    JSON.stringify(switchComplete),
  );
  await startStage(desktop);

  await mouseGuide(desktop, switchComplete.model.progress, 0.56, 12);
  const rightOrbit = await snapshot(desktop);
  check(
    "rightOrbitResumesAfterSwitch",
    rightOrbit.model?.progress > 0.54 &&
      rightOrbit.model?.progress < 0.57 &&
      rightOrbit.model?.currentAction === "right" &&
      rightOrbit.activePose === "right",
    JSON.stringify(rightOrbit),
  );

  await mouseGuide(desktop, rightOrbit.model.progress, 0.76, 34);
  const rightMilestone = await snapshot(desktop);
  check(
    "rightMilestoneRemainsGated",
    rightMilestone.model?.progress >= 0.75 &&
      rightMilestone.model?.progress < 0.77 &&
      rightMilestone.model?.lastNode === "0.75",
    JSON.stringify(rightMilestone),
  );

  check(
    "rightPickupUsesSwitchedHand",
    rightMilestone.model?.currentAction === "take-right" &&
      rightMilestone.model?.activeHand === "left" &&
      rightMilestone.spoonAnimation === "walk8-scoop-right" &&
      Number(rightMilestone.spoonOpacity) > 0,
    JSON.stringify(rightMilestone),
  );
  await desktop.waitForTimeout(580);
  const rightPickupSettled = await snapshot(desktop);
  await mouseGuide(desktop, rightPickupSettled.model.progress, 0.94, 26);
  const beforeComplete = await snapshot(desktop);

  await mouseGuide(desktop, beforeComplete.model.progress, 1, 24);
  const complete = await snapshot(desktop);
  check(
    "routeCompletesWithInteractionState",
    complete.model?.progress >= 0.9999 &&
      complete.model?.switchCompleted === true &&
      complete.model?.activeHand === "left" &&
      complete.model?.interactionCompleted === true &&
      complete.model?.experienceState === "complete" &&
      complete.model?.routeCompleted === true &&
      complete.model?.manualCompleted === true &&
      complete.model?.completionSource === "manual" &&
      complete.model?.performanceActive === true &&
      complete.startLabel === "重新引导",
    JSON.stringify(complete),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-switch-complete-desktop.png"),
    fullPage: false,
  });
  screenshots.push("walk8-switch-complete-desktop.png");

  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().performanceFinished ===
      true,
  );
  await desktop.locator("#walk8FinaleRestart").click();
  const restarted = await snapshot(desktop);
  check(
    "restartResetsAllSwitchState",
    restarted.model?.progress === 0 &&
      restarted.model?.active === true &&
      restarted.model?.activeHand === "right" &&
      restarted.model?.switchCompleted === false &&
      restarted.model?.switchPending === false &&
      restarted.model?.switchAnimating === false &&
      restarted.model?.interactionCompleted === false &&
      restarted.model?.currentAction === "idle" &&
      restarted.activePose === "idle" &&
      !restarted.promptVisible &&
      !restarted.buttonVisible &&
      restarted.storage?.progress === 0,
    JSON.stringify(restarted),
  );

  await desktop.locator("#walk8Demo").click();
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchPending === true,
  );
  const demoPaused = await snapshot(desktop);
  check(
    "demoPausesForRequiredSwitch",
    Math.abs(demoPaused.model?.progress - 0.5) < 0.0002 &&
      demoPaused.model?.demo === false &&
      demoPaused.model?.switchPending === true &&
      demoPaused.buttonVisible,
    JSON.stringify(demoPaused),
  );
  await desktop.locator("#walk8SwitchButton").click();
  await desktop.waitForFunction(
    () => window.walk8StageController?.getSnapshot?.().progress > 0.55,
  );
  const demoResumed = await snapshot(desktop);
  check(
    "demoResumesAfterSwitch",
    demoResumed.model?.demo === true &&
      demoResumed.model?.progress > 0.55 &&
      demoResumed.model?.switchCompleted === true,
    JSON.stringify(demoResumed),
  );
  await desktop.locator("#walk8Demo").click();
  await desktop.context().close();

  const mobileSession = await createPage(
    browser,
    { width: 390, height: 844 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await openStage(mobile, { clearProgress: true });
  await startStage(mobile);
  await touchGuide(mobile, 0, 0.5, 58);
  const mobilePending = await snapshot(mobile);
  check(
    "mobileTouchReachesSwitchPrompt",
    Math.abs(mobilePending.model?.progress - 0.5) < 0.0002 &&
      mobilePending.model?.switchPending === true &&
      mobilePending.buttonVisible &&
      mobilePending.buttonSize.width >= 44 &&
      mobilePending.buttonSize.height >= 44,
    JSON.stringify(mobilePending),
  );
  await mobile.screenshot({
    path: path.join(ROOT, "walk8-switch-pending-mobile.png"),
    fullPage: false,
  });
  screenshots.push("walk8-switch-pending-mobile.png");

  await mobile.locator("#walk8SwitchButton").tap();
  await mobile.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchCompleted === true,
  );
  await mobile.evaluate(() =>
    document.querySelector("#walk8SwitchButton").click(),
  );
  const mobileComplete = await snapshot(mobile);
  check(
    "mobileButtonCompletesSwitchOnce",
    mobileComplete.model?.switchCompleted === true &&
      mobileComplete.model?.activeHand === "left" &&
      !mobileComplete.buttonVisible &&
      !mobileComplete.promptVisible,
    JSON.stringify(mobileComplete),
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
