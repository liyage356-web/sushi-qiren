const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(
  ROOT,
  "output",
  "qa-dragon-assembly-freeform.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const FREE_POSITIONS = Object.freeze({
  yoke: { x: 0.08, y: 0.31 },
  dragonLeft: { x: 0.12, y: 0.2 },
  dragonRight: { x: 0.7, y: 0.23 },
  goldBead: { x: 0.33, y: 0.12 },
  springLeft: { x: 0.15, y: 0.31 },
  springRight: { x: 0.74, y: 0.32 },
  pompomLeft: { x: 0.27, y: 0.41 },
  pompomRight: { x: 0.63, y: 0.43 },
  signLeft: { x: 0.08, y: 0.65 },
  signRight: { x: 0.6, y: 0.66 },
});

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate));
}

function closeEnough(actual, expected, tolerance = 0.012) {
  return Math.abs(actual - expected) <= tolerance;
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
  await page.waitForTimeout(250);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const component = document.querySelector("#dragonAssembly");
    const canvasElement = document.querySelector(
      ".dragon-assembly__coordinate",
    );
    const canvas = canvasElement.getBoundingClientRect();
    const baseline = document.querySelector("#dragonAssemblyBaseline");
    const baselineStyle = getComputedStyle(baseline);
    const yokeCard = document.querySelector('[data-drag-part="yoke"]');
    const yokeImage = yokeCard.querySelector("img");
    const token = document.querySelector(".dragon-drag-token");
    const tokenRect = token?.getBoundingClientRect();
    const panel = document
      .querySelector(".assembly-controls")
      .getBoundingClientRect();
    const layerState = (selector) => {
      const layer = document.querySelector(selector);
      const rect = layer.getBoundingClientRect();
      return {
        className: layer.className,
        opacity: Number(getComputedStyle(layer).opacity),
        pointerEvents: getComputedStyle(layer).pointerEvents,
        x: Number(layer.dataset.positionX),
        y: Number(layer.dataset.positionY),
        right: (rect.right - canvas.left) / canvas.width,
        bottom: (rect.bottom - canvas.top) / canvas.height,
      };
    };
    const cards = [...document.querySelectorAll("[data-drag-part]")].map(
      (card) => ({
        id: card.dataset.dragPart,
        disabled: card.disabled,
        installed: card.classList.contains("is-installed"),
        mediaMissing: card.classList.contains("is-media-missing"),
        label: card.getAttribute("aria-label"),
        imageAlt: card.querySelector("img")?.alt,
      }),
    );
    return {
      controller: window.dragonAssemblyComponent.getSnapshot(),
      progress: document
        .querySelector("#dragonAssemblyProgressText")
        .textContent.trim(),
      progressLabel: document
        .querySelector(".dragon-assembly__progress small")
        .textContent.trim(),
      activeStage: component.dataset.activeStage,
      componentStep: component.dataset.assemblyStep,
      feedbackClasses: [...component.classList].filter((name) =>
        name.startsWith("stage-feedback-"),
      ),
      completionVisible: !document.querySelector("#assemblyComplete").hidden,
      carryIllustrationDisplay: getComputedStyle(
        document.querySelector(".carry-illustration"),
      ).display,
      cards,
      duplicateCardIds: cards.filter(
        (card, index) =>
          cards.findIndex((candidate) => candidate.id === card.id) !== index,
      ),
      cardCount: cards.length,
      yokeCard: {
        present: Boolean(yokeCard),
        imageSource: yokeImage?.currentSrc || yokeImage?.src || "",
        naturalWidth: yokeImage?.naturalWidth || 0,
        objectFit: yokeImage ? getComputedStyle(yokeImage).objectFit : "",
      },
      baseline: {
        className: baseline.className,
        top: baselineStyle.top,
        width: baselineStyle.width,
        topRatio:
          (baseline.getBoundingClientRect().top - canvas.top) / canvas.height,
        widthRatio:
          baseline.getBoundingClientRect().width / canvas.width,
        borderStyle: baselineStyle.borderTopStyle,
        borderColor: baselineStyle.borderTopColor,
      },
      drag: token
        ? {
            className: token.className,
            position: getComputedStyle(token).position,
            zIndex: Number(getComputedStyle(token).zIndex),
            width: tokenRect.width,
            height: tokenRect.height,
          }
        : null,
      dragPrompt: document.querySelector("#assemblyStepBody").textContent.trim(),
      sourceDragging: Boolean(
        document.querySelector(".assembly-part-card.is-dragging"),
      ),
      tokenAbovePanel: token
        ? Number(getComputedStyle(token).zIndex) >= 2147483000
        : false,
      canvas: {
        x: canvas.x,
        y: canvas.y,
        width: canvas.width,
        height: canvas.height,
      },
      panel: { x: panel.x, y: panel.y, width: panel.width, height: panel.height },
      layers: {
        bucketLeft: layerState(".dragon-assembly__layer--bucket-left"),
        bucketRight: layerState(".dragon-assembly__layer--bucket-right"),
        yoke: layerState(".dragon-assembly__layer--yoke"),
        dragonLeft: layerState(".dragon-assembly__layer--dragon-left"),
        dragonRight: layerState(".dragon-assembly__layer--dragon-right"),
        goldBead: layerState(".dragon-assembly__layer--bead"),
        springLeft: layerState(".dragon-assembly__layer--chain-left"),
        springRight: layerState(".dragon-assembly__layer--chain-right"),
        pompomLeft: layerState(".dragon-assembly__layer--pompom-left"),
        pompomRight: layerState(".dragon-assembly__layer--pompom-right"),
        signLeft: layerState(".dragon-assembly__layer--sign"),
        signRight: layerState(".dragon-assembly__layer--sign-right"),
      },
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function destinationPoint(page, id, position) {
  return page.evaluate(
    ({ partId, desired }) => {
      const component = window.dragonAssemblyComponent;
      const part = component.config.parts[partId];
      const canvas = document
        .querySelector(".dragon-assembly__coordinate")
        .getBoundingClientRect();
      const system = component.config.coordinateSystem;
      const width = part.target.width / system.width;
      const height = part.target.height / system.height;
      return {
        x:
          canvas.left +
          (desired.x + width / 2) * canvas.width,
        y:
          canvas.top +
          (desired.y + height / 2) * canvas.height,
      };
    },
    { partId: id, desired: position },
  );
}

async function startPoint(page, id) {
  const card = page.locator(`[data-drag-part="${id}"]`);
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error(`No card bounds for ${id}.`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function mouseDrag(page, id, position) {
  const start = await startPoint(page, id);
  const destination = await destinationPoint(page, id, position);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 18, start.y - 14, { steps: 3 });
  await page.mouse.move(destination.x, destination.y, { steps: 16 });
  await page.waitForTimeout(100);
  const during = await snapshot(page);
  await page.mouse.up();
  await page.waitForTimeout(420);
  return { start, destination, during, after: await snapshot(page) };
}

async function mouseDragLayer(page, selector, position) {
  const layer = page.locator(selector);
  const box = await layer.boundingBox();
  if (!box) throw new Error(`No layer bounds for ${selector}.`);
  const partId = await layer.getAttribute("data-part-id");
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const destination = await destinationPoint(page, partId, position);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 8, { steps: 3 });
  await page.mouse.move(destination.x, destination.y, { steps: 16 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(420);
  return snapshot(page);
}

async function touchDrag(page, id, position) {
  const client = await page.context().newCDPSession(page);
  try {
    const start = await startPoint(page, id);
    const destination = await destinationPoint(page, id, position);
    const point = (value) => ({
      x: value.x,
      y: value.y,
      id: 1,
      radiusX: 7,
      radiusY: 7,
      force: 1,
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point(start)],
    });
    for (let index = 1; index <= 20; index += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          point({
            x:
              start.x +
              ((destination.x - start.x) * index) / 20,
            y:
              start.y +
              ((destination.y - start.y) * index) / 20,
          }),
        ],
      });
      await page.waitForTimeout(12);
    }
    await page.waitForTimeout(100);
    const during = await snapshot(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(420);
    return { during, after: await snapshot(page) };
  } finally {
    await client.detach();
  }
}

async function dragOutsideCanvas(page, id) {
  const start = await startPoint(page, id);
  const outside = await page.evaluate(() => {
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    return { x: canvas.right + 18, y: canvas.bottom + 18 };
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 20, start.y - 12, { steps: 4 });
  await page.mouse.move(outside.x, outside.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(420);
  return snapshot(page);
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
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-freeform-initial.png"),
  });

  const bucketLeft = await mouseDrag(page, "bucketLeft", {
    x: 0.12,
    y: 0.36,
  });
  const bucketRight = await mouseDrag(page, "bucketRight", {
    x: 0.42,
    y: 0.36,
  });
  const afterBuckets = await snapshot(page);

  const yoke = await mouseDrag(
    page,
    "yoke",
    FREE_POSITIONS.yoke,
  );
  const afterYoke = await snapshot(page);

  await mouseDrag(page, "dragonLeft", FREE_POSITIONS.dragonLeft);
  await mouseDrag(page, "dragonRight", FREE_POSITIONS.dragonRight);
  const afterDragons = await snapshot(page);

  await mouseDrag(page, "goldBead", FREE_POSITIONS.goldBead);
  await mouseDrag(page, "springLeft", FREE_POSITIONS.springLeft);
  await mouseDrag(page, "springRight", FREE_POSITIONS.springRight);
  await mouseDrag(page, "pompomLeft", FREE_POSITIONS.pompomLeft);
  await mouseDrag(page, "pompomRight", FREE_POSITIONS.pompomRight);
  const afterDecorations = await snapshot(page);

  const movedDragon = await mouseDragLayer(
    page,
    ".dragon-assembly__layer--dragon-left",
    { x: 0.18, y: 0.15 },
  );

  await mouseDrag(page, "signLeft", FREE_POSITIONS.signLeft);
  await mouseDrag(page, "signRight", FREE_POSITIONS.signRight);
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState ===
      "complete",
    { timeout: 5000 },
  );
  const completed = await snapshot(page);
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-freeform-complete.png"),
  });

  await page.locator("#assemblyCompleteReset").click();
  await page.waitForTimeout(120);
  const invalidDrop = await dragOutsideCanvas(page, "bucketLeft");

  for (let stage = 1; stage <= 5; stage += 1) {
    await page.locator("#assemblyAdvance").click();
    await page.waitForFunction(
      (expectedStage) =>
        window.dragonAssemblyComponent.getSnapshot().completedStages
          .length >= expectedStage,
      stage,
      { timeout: 5000 },
    );
  }
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState ===
      "complete",
    { timeout: 5000 },
  );
  const automatic = await snapshot(page);
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-freeform-auto.png"),
  });

  const positionsBeforeResize = automatic.controller.positions;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(250);
  const resized = await snapshot(page);

  await context.close();
  return {
    initial,
    bucketLeft,
    bucketRight,
    afterBuckets,
    yoke,
    afterYoke,
    afterDragons,
    afterDecorations,
    movedDragon,
    completed,
    invalidDrop,
    automatic,
    positionsBeforeResize,
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
  const initial = await snapshot(page);
  const left = await touchDrag(page, "bucketLeft", {
    x: 0.11,
    y: 0.36,
  });
  const right = await touchDrag(page, "bucketRight", {
    x: 0.44,
    y: 0.36,
  });
  const yoke = await touchDrag(page, "yoke", {
    x: 0.09,
    y: 0.3,
  });
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-freeform-mobile.png"),
    fullPage: true,
  });
  await context.close();
  return { initial, left, right, yoke, errors };
}

function buildChecks(result) {
  const afterBuckets = result.afterBuckets.controller;
  const afterYoke = result.afterYoke.controller;
  const afterDragons = result.afterDragons.controller;
  const afterDecorations = result.afterDecorations.controller;
  const completed = result.completed.controller;
  const automatic = result.automatic.controller;
  const mobileYoke = result.mobile.yoke.after.controller;
  const positions = afterDecorations.positions;
  return {
    initialCanvasOnlyHasBackground:
      result.initial.controller.completedParts.length === 0 &&
      result.initial.cards.every((card) => !card.installed) &&
      Object.values(result.initial.layers).every(
        (layer) => layer.opacity < 0.01,
      ) &&
      result.initial.carryIllustrationDisplay === "none",
    yokeIsDraggablePanelAsset:
      result.initial.yokeCard.present &&
      /structure\/yoke\.png$/.test(result.initial.yokeCard.imageSource) &&
      result.initial.yokeCard.naturalWidth > 0 &&
      result.initial.yokeCard.objectFit === "contain",
    uniquePartCardsAndNoDuplicates:
      result.initial.cardCount === 12 &&
      result.initial.duplicateCardIds.length === 0 &&
      result.initial.cards.every((card) => !card.mediaMissing),
    baselineMatchesGroundGuide:
      result.initial.baseline.borderStyle === "dashed" &&
      closeEnough(result.initial.baseline.topRatio, 0.82) &&
      closeEnough(result.initial.baseline.widthRatio, 0.7) &&
      result.initial.baseline.borderColor !== "rgba(0, 0, 0, 0)",
    dragTokenEscapesPanelAndShowsSnap:
      Boolean(result.bucketLeft.during.drag) &&
      result.bucketLeft.during.drag.position === "fixed" &&
      result.bucketLeft.during.tokenAbovePanel &&
      result.bucketLeft.during.sourceDragging &&
      result.bucketLeft.during.baseline.className.includes("is-snap-ready") &&
      result.bucketLeft.during.controller.snapped,
    bucketsSnapBottomToBaseline:
      afterBuckets.completedStages.includes(1) &&
      closeEnough(positions.bucketLeft.y + positions.bucketLeft.height, 0.82) &&
      closeEnough(positions.bucketRight.y + positions.bucketRight.height, 0.82),
    bucketHorizontalPlacementIsFree:
      closeEnough(positions.bucketLeft.x, 0.12, 0.02) &&
      closeEnough(positions.bucketRight.x, 0.42, 0.02) &&
      !closeEnough(positions.bucketRight.x, 0.6, 0.02) &&
      result.afterBuckets.progress === "1 / 5" &&
      result.afterBuckets.activeStage === "2",
    yokePlacesAtReleasedPosition:
      afterYoke.completedParts.includes("yoke") &&
      closeEnough(afterYoke.positions.yoke.x, FREE_POSITIONS.yoke.x, 0.016) &&
      closeEnough(afterYoke.positions.yoke.y, FREE_POSITIONS.yoke.y, 0.016) &&
      result.afterYoke.progress === "2 / 5" &&
      result.afterYoke.activeStage === "3" &&
      result.afterYoke.feedbackClasses.includes("stage-feedback-2") &&
      !closeEnough(afterYoke.positions.yoke.y, 0.17, 0.02),
    freePartsKeepArbitraryCoordinates:
      afterDragons.completedStages.includes(3) &&
      afterDecorations.completedStages.includes(4) &&
      Object.entries(FREE_POSITIONS)
        .filter(([id]) => !["yoke", "signLeft", "signRight"].includes(id))
        .every(
          ([id, position]) =>
            closeEnough(afterDecorations.positions[id].x, position.x, 0.018) &&
            closeEnough(afterDecorations.positions[id].y, position.y, 0.018),
        ),
    placedPartsRemainAdjustable:
      closeEnough(
        result.movedDragon.controller.positions.dragonLeft.x,
        0.18,
        0.018,
      ) &&
      closeEnough(
        result.movedDragon.controller.positions.dragonLeft.y,
        0.15,
        0.018,
      ) &&
      result.movedDragon.controller.completedParts.filter(
        (id) => id === "dragonLeft",
      ).length === 1,
    fiveStagesCompleteAndFinaleRuns:
      completed.completedStages.join("|") === "1|2|3|4|5" &&
      completed.completedParts.length === 12 &&
      result.completed.progress === "5 / 5" &&
      result.completed.completionVisible &&
      completed.finaleState === "complete",
    outsideDropReturnsWithoutGhost:
      !result.invalidDrop.controller.completedParts.length &&
      result.invalidDrop.controller.dragging === null &&
      result.invalidDrop.drag === null &&
      result.invalidDrop.progress === "0 / 5",
    automaticAssemblyStillWorks:
      automatic.completedStages.join("|") === "1|2|3|4|5" &&
      automatic.completedParts.length === 12 &&
      automatic.finaleState === "complete" &&
      result.automatic.progress === "5 / 5",
    resizePreservesNormalizedPositions:
      Object.keys(result.positionsBeforeResize).every(
        (id) =>
          closeEnough(
            result.positionsBeforeResize[id].x,
            result.resized.controller.positions[id].x,
            0.0001,
          ) &&
          closeEnough(
            result.positionsBeforeResize[id].y,
            result.resized.controller.positions[id].y,
            0.0001,
          ),
      ),
    mobileTouchPlacesBothBuckets:
      result.mobile.left.after.controller.completedParts.includes(
        "bucketLeft",
      ) &&
      result.mobile.right.after.controller.completedParts.includes(
        "bucketRight",
      ) &&
      result.mobile.right.after.controller.completedStages.includes(1) &&
      closeEnough(
        result.mobile.right.after.controller.positions.bucketLeft.y +
          result.mobile.right.after.controller.positions.bucketLeft.height,
        0.82,
      ) &&
      closeEnough(
        result.mobile.right.after.controller.positions.bucketRight.y +
          result.mobile.right.after.controller.positions.bucketRight.height,
        0.82,
      ),
    mobileTouchSupportsFreeYoke:
      mobileYoke.completedStages.includes(2) &&
      mobileYoke.activeStage === 3 &&
      result.mobile.yoke.during.controller.snapped === false &&
      result.mobile.yoke.during.sourceDragging &&
      result.mobile.yoke.after.horizontalOverflow <= 0,
    progressCopyMatchesNewOrder:
      result.initial.progressLabel ===
        "桶柜 → 横梁 → 龙头 → 金珠挂饰 → 金漆字",
    noBrowserErrors:
      result.errors.length === 0 && result.mobile.errors.length === 0,
  };
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge or Chrome found.");
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const desktop = await runDesktop(browser);
    const mobile = await runMobile(browser);
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
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
