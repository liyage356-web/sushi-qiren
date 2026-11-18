const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-dragon-assembly-interaction.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate));
}

async function openAssembly(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter3`, {
    waitUntil: "networkidle",
  });
  await page
    .locator("#sishiOriginal-chapter3")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#assemblyBackyard .sishi-interaction-content")
        ?.hidden === false,
  );
  await page.waitForFunction(() => {
    const images = [
      ...document.querySelectorAll(
        "#dragonAssembly img[data-assembly-asset]",
      ),
    ];
    return images.every((image) => image.complete && image.naturalWidth > 0);
  });
  await page.waitForTimeout(450);
}

function partCard(page, id) {
  return page.locator(`[data-drag-part="${id}"]`);
}

async function targetPoint(page, id) {
  return page.evaluate((partId) => {
    const component = window.dragonAssemblyComponent;
    const part = component.config.parts[partId];
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    const system = component.config.coordinateSystem;
    return {
      x:
        canvas.left +
        ((part.target.x + part.target.width / 2) / system.width) *
          canvas.width,
      y:
        canvas.top +
        ((part.target.y + part.target.height / 2) / system.height) *
          canvas.height,
      radius: (part.target.radius / system.width) * canvas.width,
    };
  }, id);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const component = document.querySelector("#dragonAssembly");
    const stage = document.querySelector("#assemblyStage");
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    const layerState = (selector) => {
      const layer = document.querySelector(selector);
      const rect = layer.getBoundingClientRect();
      return {
        className: layer.className,
        opacity: Number(getComputedStyle(layer).opacity),
        transitionDuration: getComputedStyle(layer).transitionDuration,
        centerX: (rect.left - canvas.left + rect.width / 2) / canvas.width,
        centerY: (rect.top - canvas.top + rect.height / 2) / canvas.height,
      };
    };
    return {
      controller: window.dragonAssemblyComponent.getSnapshot(),
      componentStep: component.dataset.assemblyStep,
      activeStage: component.dataset.activeStage,
      progress: document
        .querySelector("#dragonAssemblyProgressText")
        .textContent.trim(),
      stageLabel: document
        .querySelector("#dragonAssemblyStepLabel")
        .textContent.trim(),
      stepTitle: document.querySelector("#assemblyStepTitle").textContent.trim(),
      stepBody: document.querySelector("#assemblyStepBody").textContent.trim(),
      completionVisible: !document.querySelector("#assemblyComplete").hidden,
      feedbackClasses: [...component.classList].filter((name) =>
        name.startsWith("stage-feedback-"),
      ),
      cards: [...document.querySelectorAll("[data-drag-part]")].map((card) => ({
        id: card.dataset.dragPart,
        disabled: card.disabled,
        installed: card.classList.contains("is-installed"),
        current: card.classList.contains("is-current"),
        locked: card.classList.contains("is-locked"),
        label: card.getAttribute("aria-label"),
      })),
      dragToken: document.querySelector(".dragon-drag-token")
        ? {
            className: document.querySelector(".dragon-drag-token").className,
            transform: getComputedStyle(
              document.querySelector(".dragon-drag-token"),
            ).transform,
          }
        : null,
      sourceDragging: Boolean(
        document.querySelector(".assembly-part-card.is-dragging"),
      ),
      targetHint: Boolean(
        document.querySelector(".dragon-assembly__layer.is-target-hint"),
      ),
      layers: {
        bucketLeft: layerState(".dragon-assembly__layer--bucket-left"),
        bucketRight: layerState(".dragon-assembly__layer--bucket-right"),
        dragonLeft: layerState(".dragon-assembly__layer--dragon-left"),
        dragonRight: layerState(".dragon-assembly__layer--dragon-right"),
        bead: layerState(".dragon-assembly__layer--bead"),
        springLeft: layerState(".dragon-assembly__layer--chain-left"),
        springRight: layerState(".dragon-assembly__layer--chain-right"),
        pompomLeft: layerState(".dragon-assembly__layer--pompom-left"),
        pompomRight: layerState(".dragon-assembly__layer--pompom-right"),
        signLeft: layerState(".dragon-assembly__layer--sign"),
        signRight: layerState(".dragon-assembly__layer--sign-right"),
      },
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
    };
  });
}

async function mouseDrag(page, id, { wrong = false, release = true } = {}) {
  const card = partCard(page, id);
  const box = await card.boundingBox();
  const target = await targetPoint(page, id);
  const start = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const destination = wrong
    ? await page.evaluate(() => {
        const canvas = document
          .querySelector(".dragon-assembly__coordinate")
          .getBoundingClientRect();
        return {
          x: canvas.left + canvas.width * 0.5,
          y: canvas.top + canvas.height * 0.92,
        };
      })
    : target;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 24, start.y - 16, { steps: 3 });
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await page.waitForTimeout(80);
  const active = await snapshot(page);
  if (release) await page.mouse.up();
  return { active, start, destination };
}

async function touchDrag(page, id) {
  const client = await page.context().newCDPSession(page);
  const card = partCard(page, id);
  const box = await card.boundingBox();
  const target = await targetPoint(page, id);
  const start = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const point = (position) => ({
    x: position.x,
    y: position.y,
    id: 1,
    radiusX: 7,
    radiusY: 7,
    force: 1,
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(start)],
  });
  await page.waitForFunction(
    (partId) =>
      window.dragonAssemblyComponent?.getSnapshot().dragging === partId,
    id,
    { timeout: 1500 },
  );
  for (let index = 1; index <= 20; index += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        point({
          x: start.x + ((target.x - start.x) * index) / 20,
          y: start.y + ((target.y - start.y) * index) / 20,
        }),
      ],
    });
    await page.waitForTimeout(12);
  }
  await page.waitForTimeout(100);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await openAssembly(page);
  const initial = await snapshot(page);

  await page.locator('[data-assembly-step="2"]').evaluate((button) => {
    button.click();
  });
  await page.waitForTimeout(80);
  const skipBlocked = await snapshot(page);

  const correctDrag = await mouseDrag(page, "bucketLeft");
  await page.waitForTimeout(650);
  const firstBucket = await snapshot(page);

  const wrongDrag = await mouseDrag(page, "bucketRight", { wrong: true });
  const wrongDuring = wrongDrag.active;
  await page.waitForTimeout(80);
  const wrongReturning = await snapshot(page);
  await page.waitForTimeout(360);
  const wrongReturned = await snapshot(page);

  await partCard(page, "bucketRight").click();
  const stageOneFeedback = await snapshot(page);
  await page.waitForTimeout(80);
  const stageOneReady = await snapshot(page);

  await page.locator("#soundToggle").click();
  const yokeDrag = await mouseDrag(page, "yoke");
  await page.waitForTimeout(360);
  const firstYoke = await snapshot(page);
  const dragonRightDrag = await mouseDrag(page, "dragonRight");
  await page.waitForTimeout(360);
  const firstDragon = await snapshot(page);
  const dragonLeftDrag = await mouseDrag(page, "dragonLeft");
  await page.waitForTimeout(80);
  const stageTwoFeedback = await snapshot(page);
  await page.waitForTimeout(360);
  const stageTwoReady = await snapshot(page);

  await mouseDrag(page, "goldBead");
  const beadFeedback = await snapshot(page);
  await page.waitForTimeout(360);
  const stageThreeReady = await snapshot(page);

  await partCard(page, "pompomRight").click();
  await mouseDrag(page, "springRight");
  await page.waitForTimeout(360);
  await partCard(page, "springLeft").click();
  await page.waitForTimeout(80);
  const partialStageFour = await snapshot(page);
  await partCard(page, "pompomLeft").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const stageFourFeedback = await snapshot(page);
  await page.waitForTimeout(360);
  const stageFourReady = await snapshot(page);

  await mouseDrag(page, "signRight");
  await page.waitForTimeout(360);
  await partCard(page, "signLeft").click();
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState === "complete",
    { timeout: 4000 },
  );
  await page.waitForTimeout(720);
  const completed = await snapshot(page);
  await page.locator("#assemblyComplete").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-interaction-complete.png"),
  });

  await page.locator("#assemblyCompleteReset").click();
  await page.waitForTimeout(100);
  const reset = await snapshot(page);
  await page.locator("#assemblyAdvance").click();
  await page.waitForTimeout(850);
  const autoInstall = await snapshot(page);

  const centersBeforeResize = {
    bucketLeft: autoInstall.layers.bucketLeft,
    bucketRight: autoInstall.layers.bucketRight,
  };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(250);
  const resized = await snapshot(page);

  await context.close();
  return {
    initial,
    skipBlocked,
    correctDrag,
    firstBucket,
    wrongDuring,
    wrongReturning,
    wrongReturned,
    stageOneFeedback,
    stageOneReady,
    yokeDrag,
    firstYoke,
    dragonRightDrag,
    firstDragon,
    dragonLeftDrag,
    stageTwoFeedback,
    stageTwoReady,
    beadFeedback,
    stageThreeReady,
    partialStageFour,
    stageFourFeedback,
    stageFourReady,
    completed,
    reset,
    autoInstall,
    centersBeforeResize,
    resized,
    errors,
  };
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await openAssembly(page);
  await touchDrag(page, "bucketLeft");
  await page.waitForTimeout(380);
  const afterTouchDrag = await snapshot(page);
  await partCard(page, "bucketRight").tap();
  await page.waitForTimeout(120);
  const afterTap = await snapshot(page);
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-interaction-mobile.png"),
    fullPage: true,
  });
  await context.close();
  return { afterTouchDrag, afterTap, errors };
}

function distance(left, right) {
  return Math.hypot(left.centerX - right.centerX, left.centerY - right.centerY);
}

function buildChecks(result) {
  const checks = {
    startsAtStageOne:
      result.initial.controller.activeStage === 1 &&
      result.initial.controller.completedParts.length === 0 &&
      result.initial.cards.filter((card) => card.current).length === 2,
    cannotSkipStages:
      result.skipBlocked.controller.activeStage === 1 &&
      result.skipBlocked.controller.completedStages.length === 0,
    dragTokenAndHintsVisible:
      Boolean(result.correctDrag.active.dragToken) &&
      result.correctDrag.active.sourceDragging &&
      result.correctDrag.active.controller.snapped,
    correctDropInstallsOnePart:
      result.firstBucket.controller.completedParts.includes("bucketLeft") &&
      !result.firstBucket.controller.completedParts.includes("bucketRight") &&
      result.firstBucket.controller.activeStage === 1 &&
      result.firstBucket.layers.bucketLeft.opacity > 0.95,
    wrongDropReturnsWithoutInstall:
      !result.wrongReturned.controller.completedParts.includes("bucketRight") &&
      result.wrongReturned.controller.dragging === null &&
      result.wrongReturned.dragToken === null &&
      result.wrongReturned.cards.find((card) => card.id === "bucketRight")
        ?.disabled === false,
    clickCompletesStageOne:
      result.stageOneReady.controller.completedStages.includes(1) &&
      result.stageOneReady.controller.activeStage === 2 &&
      result.stageOneReady.progress === "1 / 5" &&
      result.stageOneReady.feedbackClasses.includes("stage-feedback-1"),
    stageTwoUsesRotationAndSound:
      result.stageTwoReady.controller.completedStages.includes(2) &&
      result.stageTwoReady.controller.completedParts.includes("yoke") &&
      result.firstYoke.feedbackClasses.includes("stage-feedback-2") &&
      result.stageTwoReady.controller.placementSoundCount >= 2,
    dragonsCompleteStageThree:
      result.stageThreeReady.controller.completedStages.includes(3) &&
      result.stageThreeReady.controller.activeStage === 4 &&
      result.stageThreeReady.controller.stageCounts[4].installed === 1,
    stageFourWaitForAllParts:
      result.partialStageFour.controller.stageCounts[4].installed === 4 &&
      result.partialStageFour.controller.activeStage === 4 &&
      !result.partialStageFour.controller.completedStages.includes(4),
    stageFourCompletesWithWobble:
      result.stageFourReady.controller.completedStages.includes(4) &&
      result.stageFourReady.controller.activeStage === 5 &&
      result.stageFourFeedback.feedbackClasses.includes("stage-feedback-4"),
    fiveStagesComplete:
      result.completed.controller.activeStage === 6 &&
      result.completed.controller.completedStages.join("|") === "1|2|3|4|5" &&
      result.completed.controller.completedParts.length === 12 &&
      result.completed.progress === "5 / 5" &&
      result.completed.completionVisible,
    transitionsAreSmooth:
      result.firstBucket.layers.bucketLeft.transitionDuration.includes("0.32s"),
    resetClearsEverything:
      result.reset.controller.activeStage === 1 &&
      result.reset.controller.completedParts.length === 0 &&
      result.reset.progress === "0 / 5" &&
      !result.reset.completionVisible,
    autoInstallAlternative:
      result.autoInstall.controller.completedStages.includes(1) &&
      result.autoInstall.controller.activeStage === 2,
    resizeKeepsCoordinates:
      distance(result.centersBeforeResize.bucketLeft, result.resized.layers.bucketLeft) <
        0.006 &&
      distance(
        result.centersBeforeResize.bucketRight,
        result.resized.layers.bucketRight,
      ) < 0.006,
    mobileTouchInstall:
      result.mobile.afterTouchDrag.controller.completedParts.includes(
        "bucketLeft",
      ) &&
      result.mobile.afterTap.controller.completedStages.includes(1) &&
      result.mobile.afterTap.controller.activeStage === 2 &&
      result.mobile.afterTap.overflow <= 0,
    noDuplicateInstall:
      result.firstBucket.controller.completedParts.filter(
        (id) => id === "bucketLeft",
      ).length === 1,
    noBrowserErrors:
      result.errors.length === 0 && result.mobile.errors.length === 0,
  };
  return checks;
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge or Chrome found.");
  const browser = await chromium.launch({ executablePath, headless: true });
  const desktop = await runDesktop(browser);
  const mobile = await runMobile(browser);
  await browser.close();
  const result = { ...desktop, mobile };
  const checks = buildChecks(result);
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    generatedAt: new Date().toISOString(),
    checkCount: Object.keys(checks).length,
    failed,
    checks,
    desktop,
    mobile,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checkCount: report.checkCount,
        failed,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
