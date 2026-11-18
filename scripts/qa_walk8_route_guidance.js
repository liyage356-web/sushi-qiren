const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-walk8-route-guidance.json");
const STORAGE_KEY = "sishi-qiren:walk8-route:v1";
const candidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidates.find((candidate) => fs.existsSync(candidate));
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

async function openChapterFour(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter4`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter4" &&
      document.querySelector("[data-walk8-reset-open]") !== null,
  );
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

async function reopenWithExistingProgress(page) {
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
}

async function openStage(page, { clearProgress = false } = {}) {
  await openChapterFour(page);
  await enterWalk8Interaction(page);
  if (clearProgress) {
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  }
  await page.locator("[data-walk8-reset-open]").click();
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
    const status = document.querySelector("#walk8StageStatus");
    const progressPath = document.querySelector("#walk8RouteProgress");
    const cue = document.querySelector("#walk8RouteCue");
    const activeSprite = document.querySelector(
      ".walk8-yu-liu__sprite.is-active",
    );
    const stageRect = stage.getBoundingClientRect();
    return {
      model: window.walk8StageController?.getSnapshot?.(),
      status: status.textContent.trim(),
      actorX: Number(stage.dataset.actorX),
      actorY: Number(stage.dataset.actorY),
      progressStyle: progressPath.style.strokeDasharray,
      cueX: Number(cue.getAttribute("cx")),
      cueY: Number(cue.getAttribute("cy")),
      activePose: activeSprite?.dataset.pose || "",
      startLabel: document
        .querySelector("#walk8Start .walk8-start__label")
        ?.textContent.trim(),
      touchAction: getComputedStyle(stage).touchAction,
      captureCount: window.__walk8CaptureCount || 0,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      pointerTypes: window.__walk8PointerTypes || [],
      lastPointerId: window.__walk8LastPointerId ?? null,
    };
  });
}

async function instrumentPointers(page) {
  await page.evaluate(() => {
    window.__walk8PointerTypes = [];
    window.__walk8LastPointerId = null;
    window.__walk8CaptureCount = 0;
    const stage = document.querySelector("#walk8Stage");
    stage.addEventListener(
      "pointerdown",
      (event) => {
        window.__walk8PointerTypes.push(event.pointerType);
        window.__walk8LastPointerId = event.pointerId;
      },
      { capture: true },
    );
    stage.addEventListener("gotpointercapture", () => {
      window.__walk8CaptureCount += 1;
    });
  });
}

async function mouseGuide(page, fromProgress, toProgress, steps = 12) {
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
  await page.waitForTimeout(40);
}

async function touchGuide(page, fromProgress, toProgress, steps = 8) {
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
  await page.waitForTimeout(60);
}

function nearlyEqual(left, right, tolerance = 0.003) {
  return Math.abs(left - right) <= tolerance;
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
  await instrumentPointers(desktop);
  await startStage(desktop);

  const ready = await snapshot(desktop);
  check(
    "startEntersGuidingWithoutMoving",
    ready.model?.active === true &&
      ready.model?.progress === 0 &&
      ready.actorX === 960 &&
      ready.actorY === 540 &&
      ready.touchAction === "none",
    JSON.stringify(ready),
  );

  const crossRouteGeometry = await desktop.evaluate(() => {
    const route = document.querySelector("#walk8RoutePath");
    const total = route.getTotalLength();
    const at = (progress) => {
      const point = route.getPointAtLength(total * progress);
      return { x: point.x, y: point.y };
    };
    const distance = (left, right) =>
      Math.hypot(left.x - right.x, left.y - right.y);
    const angle = (start, end) =>
      Math.atan2(end.y - start.y, end.x - start.x);
    const lineAngle = (progress) =>
      angle(at(Math.max(0, progress - 0.002)), at(Math.min(1, progress + 0.002)));
    const firstCrossAngle = lineAngle(0.5);
    const secondCrossAngle = lineAngle(1);
    const angleDifference = Math.abs(firstCrossAngle - secondCrossAngle);
    const acuteCrossingAngle = Math.min(
      angleDifference,
      Math.PI - angleDifference,
    );
    const points = {
      start: at(0),
      firstCross: at(0.5),
      end: at(1),
      leftApex: at(0.25),
      rightApex: at(0.75),
      leftDeparture: at(0.01),
      leftReturn: at(0.49),
      rightDeparture: at(0.51),
      rightReturn: at(0.99),
    };
    return {
      total,
      points,
      startToFirstCross: distance(points.start, points.firstCross),
      firstCrossToEnd: distance(points.firstCross, points.end),
      crossingAngleDegrees: (acuteCrossingAngle * 180) / Math.PI,
    };
  });
  check(
    "routeFormsOneContinuousSymmetricalCrossing",
    crossRouteGeometry.total > 4000 &&
      crossRouteGeometry.startToFirstCross < 1 &&
      crossRouteGeometry.firstCrossToEnd < 1 &&
      crossRouteGeometry.points.leftApex.x < 200 &&
      crossRouteGeometry.points.rightApex.x > 1720 &&
      Math.abs(
        crossRouteGeometry.points.leftApex.y -
          crossRouteGeometry.points.rightApex.y,
      ) < 1,
    JSON.stringify(crossRouteGeometry),
  );
  check(
    "routeCrossesAtAReadableDiagonalAngle",
    crossRouteGeometry.crossingAngleDegrees > 65 &&
      crossRouteGeometry.crossingAngleDegrees < 100,
    JSON.stringify(crossRouteGeometry),
  );
  check(
    "referenceArrowDirectionIsPreserved",
    crossRouteGeometry.points.leftDeparture.x <
      crossRouteGeometry.points.start.x &&
      crossRouteGeometry.points.leftReturn.x >
        crossRouteGeometry.points.leftApex.x &&
      crossRouteGeometry.points.rightDeparture.x >
        crossRouteGeometry.points.firstCross.x &&
      crossRouteGeometry.points.rightReturn.x <
        crossRouteGeometry.points.rightApex.x,
    JSON.stringify(crossRouteGeometry),
  );

  const endpoint = await pointAtProgress(desktop, 1);
  await desktop.mouse.click(endpoint.x, endpoint.y);
  const afterEndpointClick = await snapshot(desktop);
  check(
    "endpointClickCannotCompleteRoute",
    afterEndpointClick.model?.progress === 0 &&
      afterEndpointClick.model?.experienceState !== "complete",
    JSON.stringify(afterEndpointClick),
  );

  await mouseGuide(desktop, 0, 0.1, 18);
  const firstMove = await snapshot(desktop);
  check(
    "mouseFollowsSvgPath",
    firstMove.model?.progress > 0.08 &&
      firstMove.model?.progress < 0.11 &&
      firstMove.model?.pointerState === "paused" &&
      firstMove.activePose === "left" &&
      firstMove.startLabel === "继续引导" &&
      Math.abs(
        Number.parseFloat(firstMove.progressStyle) -
          firstMove.model.progress * 1000,
      ) < 0.1,
    JSON.stringify(firstMove),
  );
  const actorOnPath = await desktop.evaluate((progress) => {
    const route = document.querySelector("#walk8RoutePath");
    const stage = document.querySelector("#walk8Stage");
    const point = route.getPointAtLength(
      progress * route.getTotalLength(),
    );
    return {
      distance: Math.hypot(
        point.x - Number(stage.dataset.actorX),
        point.y - Number(stage.dataset.actorY),
      ),
    };
  }, firstMove.model.progress);
  check(
    "actorUsesTheSameSvgRoute",
    actorOnPath.distance < 0.8,
    JSON.stringify(actorOnPath),
  );
  check(
    "pointerEventsUseMouseAndCapture",
    firstMove.pointerTypes.includes("mouse") &&
      Number.isFinite(firstMove.lastPointerId) &&
      firstMove.captureCount > 0,
    JSON.stringify(firstMove),
  );

  const savedAt = firstMove.model.progress;
  const toleranceStart = await pointAtProgress(desktop, savedAt);
  const toleranceTarget = await pointAtProgress(desktop, savedAt + 0.012);
  await desktop.mouse.move(toleranceStart.x, toleranceStart.y);
  await desktop.mouse.down();
  await desktop.mouse.move(toleranceTarget.x + 18, toleranceTarget.y + 14);
  const toleranceMove = await snapshot(desktop);
  await desktop.mouse.up();
  check(
    "nearbyDeviationSnapsToRoute",
    toleranceMove.model?.progress > savedAt &&
      toleranceMove.model?.pointerState !== "off-route" &&
      toleranceMove.model?.progress < savedAt + 0.02,
    JSON.stringify({ savedAt, toleranceMove }),
  );

  const afterTolerance = await snapshot(desktop);
  const continueAt = afterTolerance.model.progress;
  await mouseGuide(desktop, continueAt, continueAt + 0.02, 8);
  const resumedWithMouse = await snapshot(desktop);
  check(
    "mouseContinuesFromSavedPosition",
    resumedWithMouse.model?.progress > continueAt + 0.01 &&
      resumedWithMouse.model?.progress < continueAt + 0.025,
    JSON.stringify({ savedAt, continueAt, resumedWithMouse }),
  );

  const beforeFastJump = resumedWithMouse.model.progress;
  const currentPoint = await pointAtProgress(desktop, beforeFastJump);
  const farPoint = await pointAtProgress(desktop, 0.72);
  await desktop.mouse.move(currentPoint.x, currentPoint.y);
  await desktop.mouse.down();
  await desktop.mouse.move(farPoint.x, farPoint.y);
  const duringFastJump = await snapshot(desktop);
  await desktop.mouse.up();
  check(
    "fastPointerJumpCannotSkipNodes",
    duringFastJump.model?.progress === beforeFastJump &&
      duringFastJump.model?.pointerState === "off-route" &&
      duringFastJump.status.includes("偏离路线"),
    JSON.stringify({ beforeFastJump, duringFastJump }),
  );

  const offRoutePoint = await pointAtProgress(desktop, 0.92);
  const beforeOffRoute = (await snapshot(desktop)).model.progress;
  await desktop.mouse.click(offRoutePoint.x, offRoutePoint.y);
  const afterOffRoute = await snapshot(desktop);
  check(
    "offRouteClickPausesWithoutReset",
    afterOffRoute.model?.progress === beforeOffRoute &&
      afterOffRoute.status.includes("还没抓住路线"),
    JSON.stringify({ beforeOffRoute, afterOffRoute }),
  );

  const beforeReverse = afterOffRoute.model.progress;
  const reversePoint = await pointAtProgress(desktop, Math.max(0, beforeReverse - 0.08));
  await desktop.mouse.click(reversePoint.x, reversePoint.y);
  const afterReverse = await snapshot(desktop);
  check(
    "backwardClickCannotRewind",
    afterReverse.model?.progress === beforeReverse,
    JSON.stringify({ beforeReverse, afterReverse }),
  );

  const crossStart = afterReverse.model.progress;
  await mouseGuide(desktop, crossStart, 0.3, 24);
  const firstMilestone = await snapshot(desktop);
  check(
    "firstMilestoneStopsAtQuarter",
    firstMilestone.model?.progress >= 0.25 &&
      firstMilestone.model?.progress < 0.31 &&
      firstMilestone.model?.lastNode === "0.25",
    JSON.stringify(firstMilestone),
  );

  const cancelStart = firstMilestone.model.progress;
  const cancelPoint = await pointAtProgress(desktop, cancelStart);
  await desktop.mouse.move(cancelPoint.x, cancelPoint.y);
  await desktop.mouse.down();
  const cancelSnapshot = await snapshot(desktop);
  await desktop.evaluate(
    (pointerId) => {
      document.querySelector("#walk8Stage").dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
          pointerId,
          pointerType: "mouse",
        }),
      );
    },
    cancelSnapshot.lastPointerId,
  );
  const afterPointerCancel = await snapshot(desktop);
  await desktop.mouse.up();
  check(
    "pointerCancelPausesAndSaves",
    afterPointerCancel.model?.dragging === false &&
      afterPointerCancel.model?.progress === cancelStart &&
      afterPointerCancel.status.includes("系统取消"),
    JSON.stringify({ cancelStart, afterPointerCancel }),
  );

  await mouseGuide(desktop, afterPointerCancel.model.progress, 0.51, 36);
  const switchPaused = await snapshot(desktop);
  check(
    "centerSwitchPausesRoute",
    switchPaused.model?.progress >= 0.4999 &&
      switchPaused.model?.progress <= 0.5001 &&
      switchPaused.model?.switchPending === true &&
      switchPaused.model?.switchCompleted === false &&
      switchPaused.activePose === "switch" &&
      switchPaused.status.includes("路线已暂停"),
    JSON.stringify(switchPaused),
  );
  await desktop.keyboard.press("Space");
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().switchCompleted === true,
  );
  const switchComplete = await snapshot(desktop);
  check(
    "keyboardCompletesSingleSwitch",
    switchComplete.model?.switchCompleted === true &&
      switchComplete.model?.activeHand === "left" &&
      switchComplete.model?.switchPending === false,
    JSON.stringify(switchComplete),
  );

  const secondCrossingAttemptPoint = await pointAtProgress(desktop, 0.998);
  const beforeSecondCrossingAttempt = switchComplete.model.progress;
  await desktop.mouse.move(
    secondCrossingAttemptPoint.x,
    secondCrossingAttemptPoint.y,
  );
  await desktop.mouse.down();
  await desktop.mouse.move(
    secondCrossingAttemptPoint.x,
    secondCrossingAttemptPoint.y,
    { steps: 3 },
  );
  const afterSecondCrossingAttempt = await snapshot(desktop);
  await desktop.mouse.up();
  check(
    "secondCrossingCannotBeSkippedAfterFirstPass",
    afterSecondCrossingAttempt.model?.progress <=
      beforeSecondCrossingAttempt + 0.005,
    JSON.stringify({
      beforeSecondCrossingAttempt,
      afterSecondCrossingAttempt,
    }),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-cross-first-pass.png"),
    fullPage: false,
  });
  screenshots.push("walk8-cross-first-pass.png");

  await mouseGuide(desktop, switchComplete.model.progress, 0.56, 12);
  const secondMilestone = await snapshot(desktop);
  check(
    "rightOrbitFollowsSwitch",
    secondMilestone.model?.progress > 0.54 &&
      secondMilestone.model?.progress < 0.57 &&
      secondMilestone.model?.currentAction === "right" &&
      secondMilestone.model?.switchCompleted === true &&
      secondMilestone.activePose === "right",
    JSON.stringify(secondMilestone),
  );

  const leaveStart = secondMilestone.model.progress;
  const leavePoint = await pointAtProgress(desktop, leaveStart);
  const stageBox = await desktop
    .locator("#walk8Stage")
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
  await desktop.mouse.move(leavePoint.x, leavePoint.y);
  await desktop.mouse.down();
  await desktop.mouse.move(leavePoint.x, stageBox.top - 40);
  await desktop.waitForTimeout(40);
  const afterLeavingStage = await snapshot(desktop);
  await desktop.mouse.up();
  check(
    "leavingStagePausesWithoutAdvancing",
    afterLeavingStage.model?.progress === leaveStart &&
      afterLeavingStage.model?.dragging === false &&
      afterLeavingStage.model?.pointerState === "paused" &&
      afterLeavingStage.status.includes("离开场景"),
    JSON.stringify({ leaveStart, afterLeavingStage }),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-route-desktop-mid.png"),
    fullPage: false,
  });
  screenshots.push("walk8-route-desktop-mid.png");

  await mouseGuide(desktop, secondMilestone.model.progress, 0.985, 42);
  const secondCrossingApproach = await snapshot(desktop);
  check(
    "secondCrossingIsReachedByContinuousProgress",
    secondCrossingApproach.model?.progress >= 0.98 &&
      secondCrossingApproach.model?.progress < 0.999 &&
      Math.hypot(
        secondCrossingApproach.actorX - 960,
        secondCrossingApproach.actorY - 540,
      ) < 80,
    JSON.stringify(secondCrossingApproach),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-cross-second-pass.png"),
    fullPage: false,
  });
  screenshots.push("walk8-cross-second-pass.png");

  const beforeDemo = secondMilestone.model.progress;
  await desktop.locator("#walk8Demo").click();
  await desktop.waitForFunction(
    () =>
      window.walk8StageController?.getSnapshot?.().progress >= 0.9999,
    { timeout: 8000 },
  );
  const demoComplete = await snapshot(desktop);
  check(
    "demoRouteCompletesWithoutSkip",
    beforeDemo > 0.5 &&
      demoComplete.model?.progress >= 0.9999 &&
      demoComplete.model?.active === false &&
      demoComplete.model?.demo === false &&
      demoComplete.model?.experienceState === "complete" &&
      demoComplete.model?.routeCompleted === true &&
      demoComplete.model?.completionSource === "demo" &&
      demoComplete.model?.manualCompleted === false &&
      demoComplete.model?.performanceActive === true,
    JSON.stringify({ beforeDemo, demoComplete }),
  );

  await desktop.locator("#walk8Close").click();
  await desktop.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
  await reopenWithExistingProgress(desktop);
  const restoredComplete = await snapshot(desktop);
  check(
    "completedRouteRestoresOnReentry",
    restoredComplete.model?.progress >= 0.9999 &&
      restoredComplete.model?.routeCompleted === true &&
      restoredComplete.model?.manualCompleted === false &&
      restoredComplete.model?.performanceActive === true,
    JSON.stringify(restoredComplete),
  );
  await desktop.context().close();

  const zoomSession = await createPage(browser, {
    width: 1366,
    height: 900,
  });
  const zoomPage = zoomSession.page;
  errors.push(...zoomSession.errors);
  await openStage(zoomPage, { clearProgress: true });
  await instrumentPointers(zoomPage);
  await zoomPage.evaluate(() => {
    document.body.style.zoom = "1.2";
  });
  await startStage(zoomPage);
  await mouseGuide(zoomPage, 0, 0.04, 7);
  const zoomed = await snapshot(zoomPage);
  check(
    "browserZoomKeepsPointerCoordinates",
    zoomed.model?.progress > 0.03 &&
      zoomed.model?.progress < 0.05 &&
      zoomed.pointerTypes.includes("mouse"),
    JSON.stringify(zoomed),
  );
  await zoomPage.screenshot({
    path: path.join(ROOT, "walk8-route-browser-zoom.png"),
    fullPage: false,
  });
  screenshots.push("walk8-route-browser-zoom.png");
  await zoomPage.context().close();

  const portraitSession = await createPage(
    browser,
    { width: 390, height: 844 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const portrait = portraitSession.page;
  errors.push(...portraitSession.errors);
  await openStage(portrait, { clearProgress: true });
  await instrumentPointers(portrait);
  await startStage(portrait);
  const portraitReady = await snapshot(portrait);
  const effectiveTouchRadius =
    (230 / 1920) * portraitReady.stageWidth;
  await touchGuide(portrait, 0, 0.055, 9);
  const touchMoved = await snapshot(portrait);
  check(
    "portraitTouchUsesPointerEvents",
    touchMoved.model?.progress > 0.04 &&
      touchMoved.model?.progress < 0.07 &&
      touchMoved.pointerTypes.includes("touch") &&
      touchMoved.touchAction === "none",
    JSON.stringify(touchMoved),
  );
  check(
    "portraitTouchAreaIsUsable",
    portraitReady.stageWidth >= 360 &&
      portraitReady.stageHeight >= 200 &&
      effectiveTouchRadius >= 42,
    JSON.stringify({ portraitReady, effectiveTouchRadius }),
  );
  await portrait.screenshot({
    path: path.join(ROOT, "walk8-route-touch-portrait.png"),
    fullPage: false,
  });
  screenshots.push("walk8-route-touch-portrait.png");

  const savedTouchProgress = touchMoved.model.progress;
  await portrait.locator("#walk8Close").click();
  await portrait.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
  await reopenWithExistingProgress(portrait);
  const touchRestored = await snapshot(portrait);
  check(
    "touchProgressRestoresAfterReaderRoundTrip",
    nearlyEqual(touchRestored.model?.progress, savedTouchProgress) &&
      touchRestored.status.includes("已回到上次位置"),
    JSON.stringify({ savedTouchProgress, touchRestored }),
  );
  await startStage(portrait);
  await touchGuide(
    portrait,
    touchRestored.model.progress,
    touchRestored.model.progress + 0.015,
    5,
  );
  const touchAfterStart = await snapshot(portrait);
  check(
    "touchCanContinueFromRestoredPosition",
    touchAfterStart.model?.progress > touchRestored.model.progress,
    JSON.stringify({ touchRestored, touchAfterStart }),
  );
  await portrait.context().close();

  const landscapeSession = await createPage(
    browser,
    { width: 844, height: 390 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const landscape = landscapeSession.page;
  errors.push(...landscapeSession.errors);
  await openStage(landscape, { clearProgress: true });
  await startStage(landscape);
  await touchGuide(landscape, 0, 0.035, 7);
  const landscapeTouch = await snapshot(landscape);
  check(
    "landscapeTouchFollowsRoute",
    landscapeTouch.model?.progress > 0.025 &&
      landscapeTouch.model?.progress < 0.045 &&
      landscapeTouch.touchAction === "none",
    JSON.stringify(landscapeTouch),
  );
  await landscape.screenshot({
    path: path.join(ROOT, "walk8-route-touch-landscape.png"),
    fullPage: false,
  });
  screenshots.push("walk8-route-touch-landscape.png");
  await landscape.context().close();

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
