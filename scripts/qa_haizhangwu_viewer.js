const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-haizhangwu-viewer.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

function installErrorCapture(page, label, errors) {
  page.on("pageerror", (error) => {
    errors.push(`${label} pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
}

async function openObserve(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/observe`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "observe",
  );
  await page.waitForTimeout(180);
}

async function readState(page) {
  return page.evaluate(() => {
    const rectOf = (selector) => {
      const element =
        typeof selector === "string"
          ? document.querySelector(selector)
          : selector;
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const viewer = document.querySelector("#haizhangwuViewer");
    const observePage = document.querySelector("#nrPageObserve");
    const trigger = document.querySelector("#nrSeaHotspot");
    const triggerShape = document.querySelector("#nrSeaHotspotShape");
    const triggerHitBounds = document.querySelector("#nrSeaHitBounds");
    const overlay = document.querySelector("#nrSeaFigureOverlay");
    const overlayPlacement = document.querySelector("#nrSeaFigurePlacement");
    const overlayConfig = window.HAIZHANGWU_OVERLAY_CONFIG;
    const background = observePage?.querySelector(".nr-observe-background");
    const heading = observePage?.querySelector(".nr-center-heading");
    const side = observePage?.querySelector(".nr-observe-side");
    const nextButton = observePage?.querySelector("#nrObserveNextButton");
    const frame = document.querySelector("#hzwPortraitFrame");
    const visual = document.querySelector("#hzwVisual");
    const activeImage = document.querySelector(".hzw-layer.is-active");
    const viewerState = window.HaizhangwuViewer?.getState();
    const overlayCalibrator = window.HaizhangwuOverlayCalibrator;
    const matrix = triggerShape?.getScreenCTM();
    const mapSourcePoint = (x, y) => {
      if (!trigger || !matrix) return null;
      const point = trigger.createSVGPoint();
      point.x = x;
      point.y = y;
      const client = point.matrixTransform(matrix);
      return { x: client.x, y: client.y };
    };
    const overlayTransform = overlayConfig?.transform;
    const overlayFigure = overlayConfig?.figure;
    const overlayExpectedStart =
      overlayTransform && mapSourcePoint(overlayTransform.left, overlayTransform.top);
    const overlayExpectedEnd =
      overlayTransform && overlayFigure
        ? mapSourcePoint(
            overlayTransform.left + overlayFigure.width * overlayTransform.scale,
            overlayTransform.top + overlayFigure.height * overlayTransform.scale,
          )
        : null;
    const overlayExpectedRect =
      overlayExpectedStart && overlayExpectedEnd
        ? {
            left: overlayExpectedStart.x,
            top: overlayExpectedStart.y,
            right: overlayExpectedEnd.x,
            bottom: overlayExpectedEnd.y,
            width: overlayExpectedEnd.x - overlayExpectedStart.x,
            height: overlayExpectedEnd.y - overlayExpectedStart.y,
          }
        : null;
    const hitAt = (point) => {
      if (!point) return null;
      const target = document.elementFromPoint(point.x, point.y);
      return {
        tag: target?.tagName || null,
        insideHotspot: Boolean(target?.closest?.("#nrSeaHotspot")),
        insideSide: Boolean(target?.closest?.(".nr-observe-side")),
        insideNav: Boolean(target?.closest?.(".nr-step-nav")),
      };
    };
    const hitTargets = {
      torso: mapSourcePoint(620, 430),
      leftCompanion: mapSourcePoint(150, 300),
      rightCompanion: mapSourcePoint(880, 300),
      rightWaiter: mapSourcePoint(1350, 430),
      transparentInsideBounds: mapSourcePoint(800, 200),
    };
    const activeElement = document.activeElement;
    return {
      devicePixelRatio: window.devicePixelRatio,
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      viewer: {
        hidden: viewer.hidden,
        openClass: viewer.classList.contains("is-open"),
        role: viewer.getAttribute("role"),
        ariaModal: viewer.getAttribute("aria-modal"),
        title: document.querySelector("#hzwTitle")?.textContent.trim(),
        rect: rectOf(viewer),
        sheetRect: rectOf(".hzw-sheet"),
        state: viewerState,
        activeImage: activeImage?.getAttribute("src"),
        activeView: activeImage?.dataset.viewId,
        resolution: activeImage?.dataset.resolution,
        imageComplete: Boolean(activeImage?.complete),
        naturalWidth: activeImage?.naturalWidth,
        naturalHeight: activeImage?.naturalHeight,
        imageStyle: {
          objectFit: activeImage ? getComputedStyle(activeImage).objectFit : null,
          imageRendering: activeImage
            ? getComputedStyle(activeImage).imageRendering
            : null,
          filter: activeImage ? getComputedStyle(activeImage).filter : null,
          transform: activeImage
            ? getComputedStyle(activeImage).transform
            : null,
          width: activeImage
            ? getComputedStyle(activeImage).width
            : null,
          height: activeImage
            ? getComputedStyle(activeImage).height
            : null,
        },
        angleLabel: document.querySelector("#hzwAngleLabel")?.textContent.trim(),
        angleReadout:
          document.querySelector("#hzwAngleReadout")?.textContent.trim(),
        activeTick: document
          .querySelector("#hzwAngleDial i.is-active")
          ?.getAttribute("data-angle"),
        tickCount: document.querySelectorAll("#hzwAngleDial i").length,
        rotationMode:
          document.querySelector("#hzwRotationMode")?.textContent.trim(),
        rotationNote:
          document.querySelector("#hzwRotationNote")?.textContent.trim(),
        availableViews: window.HaizhangwuViewer?.getAvailableViews?.() || [],
        hotspots: [
          ...document.querySelectorAll(".hzw-hotspot"),
        ].map((button) => button.dataset.kind),
        hotspotDetails: [
          ...document.querySelectorAll(".hzw-hotspot"),
        ].map((button) => {
          const rect = button.getBoundingClientRect();
          const beforeStyle = getComputedStyle(button, "::before");
          const dotStyle = getComputedStyle(
            button.querySelector("span"),
          );
          return {
            kind: button.dataset.kind,
            left: button.style.left,
            top: button.style.top,
            hitWidth: rect.width,
            hitHeight: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            visualScale: new DOMMatrixReadOnly(beforeStyle.transform).a,
            dotScale: new DOMMatrixReadOnly(dotStyle.transform).a,
            background: beforeStyle.backgroundColor,
          };
        }),
        detailTitle: document
          .querySelector("#hzwDetailTitle")
          ?.textContent.trim(),
        detailCopy: document
          .querySelector("#hzwDetailCopy")
          ?.textContent.trim(),
        modeHidden: document.querySelector("[data-hzw-mode-switch]").hidden,
        modeButtons: [
          ...document.querySelectorAll("[data-hzw-mode]"),
        ].map((button) => ({
          mode: button.dataset.hzwMode,
          label: button.textContent.trim(),
          pressed: button.getAttribute("aria-pressed"),
          disabled: button.disabled,
        })),
        frame: rectOf(frame),
        visual: rectOf(visual),
        visualBaseWidth: visual.offsetWidth,
        visualBaseHeight: visual.offsetHeight,
        transform: getComputedStyle(visual).transform,
        visualWillChange: getComputedStyle(visual).willChange,
        visualFilter: getComputedStyle(visual).filter,
        bodyOverflow: document.body.style.overflow,
        activeElement: {
          tag: activeElement?.tagName || null,
          role: activeElement?.getAttribute?.("role") || null,
          label: activeElement?.getAttribute?.("aria-label") || null,
        },
      },
      trigger: {
        rect: rectOf(trigger),
        role: trigger.getAttribute("role"),
        tabIndex: trigger.tabIndex,
        label: trigger.getAttribute("aria-label"),
        pointerEvents: getComputedStyle(trigger).pointerEvents,
        polygons: trigger.querySelectorAll("polygon").length,
        shapeTransform: triggerShape.getAttribute("transform"),
        hintExists: Boolean(
          observePage.querySelector(".nr-sea-hotspot-hint"),
        ),
        hitBounds: {
          rect: rectOf(triggerHitBounds),
          pointerEvents: triggerHitBounds
            ? getComputedStyle(triggerHitBounds).pointerEvents
            : null,
          cursor: triggerHitBounds?.style.cursor || null,
        },
        alphaHits: {
          torso: overlayCalibrator?.isFigurePoint?.(
            hitTargets.torso?.x,
            hitTargets.torso?.y,
          ),
          leftCompanion: overlayCalibrator?.isFigurePoint?.(
            hitTargets.leftCompanion?.x,
            hitTargets.leftCompanion?.y,
          ),
          rightCompanion: overlayCalibrator?.isFigurePoint?.(
            hitTargets.rightCompanion?.x,
            hitTargets.rightCompanion?.y,
          ),
          rightWaiter: overlayCalibrator?.isFigurePoint?.(
            hitTargets.rightWaiter?.x,
            hitTargets.rightWaiter?.y,
          ),
          transparent: overlayCalibrator?.isFigurePoint?.(
            hitTargets.transparentInsideBounds?.x,
            hitTargets.transparentInsideBounds?.y,
          ),
        },
        hitTargets,
        hits: Object.fromEntries(
          Object.entries(hitTargets).map(([key, point]) => [
            key,
            hitAt(point),
          ]),
        ),
      },
      overlay: {
        source: overlay?.getAttribute("href"),
        loaded:
          Boolean(overlay?.complete) &&
          overlay?.naturalWidth > 0 &&
          overlay?.naturalHeight > 0,
        naturalWidth: overlay?.naturalWidth,
        naturalHeight: overlay?.naturalHeight,
        rect: rectOf(overlay),
        expectedRect: overlayExpectedRect,
        placement: overlayPlacement?.getAttribute("transform"),
        pointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : null,
        opacity: overlay ? Number(getComputedStyle(overlay).opacity) : null,
        preserveAspectRatio: overlay?.getAttribute("preserveAspectRatio"),
        calibratorHidden:
          document.querySelector("#nrSeaCalibrator")?.hidden ?? null,
        pageClass: observePage?.className || "",
        debugBoundaryDisplay: getComputedStyle(
          document.querySelector("#nrSeaFigureBounds"),
        ).display,
        debugPointCount:
          document.querySelectorAll("#nrSeaDebugPoints > g").length,
        calibrator: overlayCalibrator
          ? {
              ...overlayCalibrator.getState(),
              isDevelopment: overlayCalibrator.isDevelopment(),
              isEnabled: overlayCalibrator.isEnabled(),
            }
          : null,
        config: overlayConfig || null,
      },
      scene: {
        background: {
          source: background?.getAttribute("src"),
          loaded:
            Boolean(background?.complete) && background?.naturalWidth > 0,
          naturalWidth: background?.naturalWidth,
          naturalHeight: background?.naturalHeight,
          objectFit: background
            ? getComputedStyle(background).objectFit
            : null,
          objectPosition: background
            ? getComputedStyle(background).objectPosition
            : null,
          filter: background ? getComputedStyle(background).filter : null,
        },
        heading: {
          rect: rectOf(heading),
          eyebrow: heading?.querySelector(".nr-eyebrow")?.textContent.trim(),
          title: heading?.querySelector(".nr-page-title")?.textContent.trim(),
          copy: heading
            ?.querySelector("#nrObserveDescription")
            ?.textContent.replace(/\s+/g, " ")
            .trim(),
          background: heading
            ? getComputedStyle(heading).backgroundColor
            : null,
        },
        side: rectOf(side),
        nextButton: {
          text: nextButton?.textContent.replace(/\s+/g, " ").trim(),
          rect: rectOf(nextButton),
        },
      },
      cards: document.querySelectorAll("#nrPageObserve .nr-portrait-card").length,
      observePageScrollTop: observePage?.scrollTop,
      horizontalOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function drag(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing drag target ${selector}`);
  const startX = box.x + box.width * from.x;
  const startY = box.y + box.height * from.y;
  const endX = box.x + box.width * to.x;
  const endY = box.y + box.height * to.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 12 });
  await page.mouse.up();
}

async function waitForRotationState(page, expected) {
  try {
    await page.waitForFunction(
      (state) =>
        window.HaizhangwuViewer?.getState()?.rotationState === state,
      expected,
    );
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      viewerState: window.HaizhangwuViewer?.getState(),
    }));
    throw new Error(
      `${error.message}\nRotation diagnostic: ${JSON.stringify(diagnostic)}`,
    );
  }
}

async function dragRotationSweep(page, direction, steps) {
  const box = await page.locator("#hzwPortraitFrame").boundingBox();
  if (!box) throw new Error("Missing portrait frame");
  const startX =
    direction > 0 ? box.x + 42 : box.x + box.width - 42;
  const y = box.y + box.height * 0.52;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  const states = [];
  for (let index = 1; index <= steps; index += 1) {
    await page.mouse.move(
      startX + direction * index * 55,
      y,
    );
    await page.waitForTimeout(45);
    states.push(await readState(page));
  }
  await page.mouse.up();
  return states;
}

function rectsClose(actual, expected, tolerance = 0.8) {
  return (
    actual &&
    expected &&
    ["left", "top", "right", "bottom", "width", "height"].every(
      (key) => Math.abs(actual[key] - expected[key]) <= tolerance,
    )
  );
}

async function readOverlayAlpha(page) {
  return page.evaluate(() => {
    const config = window.HAIZHANGWU_OVERLAY_CONFIG;
    const alphaAt = (x, y) =>
      window.HaizhangwuOverlayCalibrator?.getAlphaAt?.(x, y) ?? -1;
    return {
      width: config.figure.width,
      height: config.figure.height,
      transparentCorners: [
        alphaAt(4, 4),
        alphaAt(config.figure.width - 5, 4),
        alphaAt(4, config.figure.height - 5),
        alphaAt(config.figure.width - 5, config.figure.height - 5),
      ],
      opaqueCenter: alphaAt(
        Math.round(config.figure.width * 0.5),
        Math.round(config.figure.height * 0.5),
      ),
    };
  });
}

function overlayLayoutPasses(state) {
  const overlay = state.overlay;
  const config = overlay?.config?.transform;
  const figure = overlay?.config?.figure;
  return (
    overlay?.source ===
      "assets/ni-ren-zhang/sea-zhang-wu-insitu-overlay.png" &&
    figure?.width === 1672 &&
    figure?.height === 941 &&
    overlay.calibrator?.alphaReady &&
    overlay.pointerEvents === "none" &&
    overlay.opacity >= 0.999 &&
    overlay.preserveAspectRatio === "none" &&
    config &&
    config.opacity === 1 &&
    overlay.placement ===
      `translate(${config.left} ${config.top}) scale(${config.scale})` &&
    rectsClose(overlay.rect, overlay.expectedRect)
  );
}

async function runResponsiveScene(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  installErrorCapture(page, "responsive", errors);
  const sizes = [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 844, height: 390 },
  ];

  for (const [index, size] of sizes.entries()) {
    if (index === 0) {
      await openObserve(page);
    } else {
      await page.setViewportSize(size);
      await page.waitForTimeout(180);
    }
    const state = await readState(page);
    const key = `overlayTracksBackgroundAt${size.width}x${size.height}`;
    assertions[key] =
      state.viewport.width === size.width &&
      state.viewport.height === size.height &&
      overlayLayoutPasses(state) &&
      state.horizontalOverflow === 0;
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await openObserve(page);
  const alpha = await readOverlayAlpha(page);
  assertions.overlaySourceHasTransparentBackground =
    alpha?.width === 1672 &&
    alpha?.height === 941 &&
    alpha.transparentCorners.every((value) => value === 0) &&
    alpha.opaqueCenter > 200;

  const normal = await readState(page);
  assertions.formalReadingModeHasNoDebugChrome =
    normal.overlay.calibratorHidden &&
    normal.overlay.config?.transform.opacity === 1 &&
    normal.overlay.opacity >= 0.999 &&
    normal.overlay.debugBoundaryDisplay === "none" &&
    normal.overlay.debugPointCount === 0 &&
    !normal.overlay.pageClass.includes("is-calibrating") &&
    !normal.scene.heading.background.includes("rgba(0, 0, 0, 0)") &&
    normal.scene.side.right <= normal.scene.nextButton.rect.right + 1;

  await page.keyboard.press("Control+Shift+D");
  await page.waitForTimeout(120);
  const debug = await readState(page);
  assertions.calibrationHotkeyOpensOnLocalDevelopment =
    debug.overlay.calibrator?.isDevelopment &&
    debug.overlay.calibrator?.isEnabled &&
    !debug.overlay.calibratorHidden &&
    debug.overlay.pageClass.includes("is-calibrating") &&
    debug.overlay.pageClass.includes("show-overlay-bounds") &&
    debug.overlay.debugBoundaryDisplay !== "none" &&
    debug.overlay.debugPointCount ===
      debug.overlay.config?.keypoints.length &&
    debug.overlay.calibrator?.opacity === 0.5 &&
    Math.abs(debug.overlay.opacity - 0.5) < 0.001;
  const debugControls = await page.evaluate(() => {
    const values = Object.fromEntries(
      [...document.querySelectorAll("[data-overlay-input]")].map((input) => [
        input.dataset.overlayInput,
        {
          value: Number(input.value),
          min: Number(input.min),
          max: Number(input.max),
          step: Number(input.step),
        },
      ]),
    );
    const labels = [...document.querySelectorAll(
      ".nr-sea-calibrator-sliders > label > span",
    )].map((label) => label.textContent.trim());
    return { values, labels };
  });
  assertions.calibrationExposesFourComparisonControls =
    debugControls.labels.join("|") === "X 轴|Y 轴|缩放|透明度" &&
    debugControls.values.left?.value ===
      debug.overlay.config?.transform.left &&
    debugControls.values.top?.value ===
      debug.overlay.config?.transform.top &&
    debugControls.values.scale?.value ===
      debug.overlay.config?.transform.scale &&
    debugControls.values.opacity?.value === 50 &&
    debugControls.values.opacity?.min === 0 &&
    debugControls.values.opacity?.max === 100;
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-overlay-calibration-desktop.png"),
  });

  const beforeMove = debug.overlay.calibrator;
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  const moved = await readState(page);
  assertions.calibrationKeyboardMovesOneAndTenPixels =
    moved.overlay.calibrator?.left === beforeMove.left + 1 &&
    moved.overlay.calibrator?.top === beforeMove.top + 10;
  assertions.calibrationControlsRemainSynchronized = await page.evaluate(() => {
    const bounds = document.querySelector(
      '[data-overlay-action="bounds"]',
    );
    const points = document.querySelector(
      '[data-overlay-action="points"]',
    );
    return (
      bounds?.getAttribute("aria-pressed") === "true" &&
      points?.getAttribute("aria-pressed") === "true"
    );
  });

  await page.locator('[data-overlay-action="bounds"]').click();
  const boundsHidden = await readState(page);
  assertions.calibrationCanToggleBoundary =
    boundsHidden.overlay.debugBoundaryDisplay === "none" &&
    (await page
      .locator('[data-overlay-action="bounds"]')
      .getAttribute("aria-pressed")) === "false";
  await page.locator('[data-overlay-action="points"]').click();
  const pointsHidden = await readState(page);
  assertions.calibrationCanToggleKeypoints =
    pointsHidden.overlay.debugPointCount === 0 &&
    (await page
      .locator('[data-overlay-action="points"]')
      .getAttribute("aria-pressed")) === "false";

  await page.locator('[data-overlay-action="reset"]').click();
  const reset = await readState(page);
  assertions.calibrationResetRestoresConfiguredTransform =
    reset.overlay.calibrator?.left === reset.overlay.config?.transform.left &&
    reset.overlay.calibrator?.top === reset.overlay.config?.transform.top &&
    reset.overlay.calibrator?.scale ===
      reset.overlay.config?.transform.scale &&
    reset.overlay.debugBoundaryDisplay !== "none" &&
    reset.overlay.debugPointCount ===
      reset.overlay.config?.keypoints.length &&
    reset.overlay.calibrator?.opacity === 0.5;

  await page.evaluate(() => {
    const config = window.HAIZHANGWU_OVERLAY_CONFIG.transform;
    const updates = {
      left: config.left + 5,
      top: config.top - 4,
      scale: config.scale + 0.004,
      opacity: 25,
    };
    Object.entries(updates).forEach(([key, value]) => {
      const input = document.querySelector(`[data-overlay-input="${key}"]`);
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
  const sliderAdjusted = await readState(page);
  assertions.calibrationSlidersAdjustEveryComparisonValue =
    sliderAdjusted.overlay.calibrator?.left ===
      sliderAdjusted.overlay.config?.transform.left + 5 &&
    sliderAdjusted.overlay.calibrator?.top ===
      sliderAdjusted.overlay.config?.transform.top - 4 &&
    Math.abs(
      sliderAdjusted.overlay.calibrator?.scale -
        (sliderAdjusted.overlay.config?.transform.scale + 0.004),
    ) < 0.001 &&
    sliderAdjusted.overlay.calibrator?.opacity === 0.25 &&
    Math.abs(sliderAdjusted.overlay.opacity - 0.25) < 0.001;

  await page.locator('[data-overlay-action="copy"]').click();
  await page.waitForTimeout(50);
  assertions.calibrationCopiesCurrentParameters =
    (await page.locator("[data-overlay-status]").textContent())?.includes(
      "已复制最终定位参数",
    );

  await page.locator('[data-overlay-action="close"]').click();
  await page.waitForTimeout(320);
  const closed = await readState(page);
  assertions.calibrationClosesWithoutChangingReadingMode =
    closed.overlay.calibratorHidden &&
    !closed.overlay.calibrator?.isEnabled &&
    !closed.overlay.pageClass.includes("is-calibrating") &&
    closed.overlay.opacity >= 0.999 &&
    closed.horizontalOverflow === 0;

  await context.close();
}

async function runHighResolutionSwitch(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  });
  let highResRequests = 0;
  await context.addInitScript(() => {
    window.HAIZHANGWU_VIEWER_HD_SOURCES = {
      front: "/public/images/haizhangwu/rotation/view-000-hd.png",
    };
  });
  await context.route(
    "**/public/images/haizhangwu/rotation/view-000-hd.png",
    async (route) => {
      highResRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 320));
      await route.fulfill({
        path: path.join(
          ROOT,
          "public/images/haizhangwu/rotation/view-000.png",
        ),
        contentType: "image/png",
      });
    },
  );
  const page = await context.newPage();
  installErrorCapture(page, "high-resolution", errors);
  await openObserve(page);
  await waitForRotationState(page, "full");
  const observe = await readState(page);
  await page.mouse.click(
    observe.trigger.hitTargets.torso.x,
    observe.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(460);

  await page.locator('[data-hzw-zoom="in"]').click();
  await page.locator('[data-hzw-zoom="in"]').click();
  const belowThreshold = await readState(page);
  assertions.highResolutionStartsOnlyAboveThreshold =
    belowThreshold.viewer.state.scale === 1.4 &&
    belowThreshold.viewer.resolution === "standard" &&
    highResRequests === 0;

  await drag(page, "#hzwPortraitFrame", { x: 0.5, y: 0.68 }, {
    x: 0.5,
    y: 0.42,
  });
  await page.locator('[data-hzw-zoom="in"]').click();
  const beforeSwap = await readState(page);
  await page.waitForFunction(
    () =>
      document.querySelector(
        "[data-hzw-layer].is-active",
      )?.dataset.resolution === "high",
  );
  const afterSwap = await readState(page);
  assertions.highResolutionSwapPreservesView =
    highResRequests === 1 &&
    beforeSwap.viewer.state.scale === 1.6 &&
    beforeSwap.viewer.state.viewId === "front" &&
    afterSwap.viewer.state.viewId === beforeSwap.viewer.state.viewId &&
    afterSwap.viewer.state.angle === beforeSwap.viewer.state.angle &&
    afterSwap.viewer.state.scale === beforeSwap.viewer.state.scale &&
    Math.abs(
      afterSwap.viewer.state.panX - beforeSwap.viewer.state.panX,
    ) < 0.1 &&
    Math.abs(
      afterSwap.viewer.state.panY - beforeSwap.viewer.state.panY,
    ) < 0.1 &&
    afterSwap.viewer.resolution === "high" &&
    afterSwap.viewer.imageComplete;

  await page.locator('[data-hzw-rotate="1"]').click();
  await page.waitForFunction(
    () =>
      window.HaizhangwuViewer.getState().viewId === "front-right" &&
      document.querySelector(
        "[data-hzw-layer].is-active",
      )?.dataset.resolution === "standard",
  );
  assertions.rotationAfterHighResolutionReturnsSafely =
    (await readState(page)).viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-045.png";
  await context.close();
}

async function runHighResolutionFallback(browser, assertions) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    window.HAIZHANGWU_VIEWER_HD_SOURCES = {
      front: "/public/images/haizhangwu/rotation/view-000-hd.png",
    };
  });
  await context.route(
    "**/public/images/haizhangwu/rotation/view-000-hd.png",
    (route) => route.abort(),
  );
  const page = await context.newPage();
  await openObserve(page);
  await waitForRotationState(page, "full");
  const observe = await readState(page);
  await page.mouse.click(
    observe.trigger.hitTargets.torso.x,
    observe.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(460);
  for (let index = 0; index < 3; index += 1) {
    await page.locator('[data-hzw-zoom="in"]').click();
  }
  await page.waitForTimeout(420);
  const fallback = await readState(page);
  assertions.highResolutionFailureKeepsStandardFrame =
    fallback.viewer.resolution === "standard" &&
    fallback.viewer.state.scale === 1.6 &&
    fallback.viewer.state.viewId === "front" &&
    fallback.viewer.imageComplete &&
    fallback.viewer.naturalWidth === 1024 &&
    (await page.locator("#hzwLoading").isHidden());
  await context.close();
}

async function runLimitedFallback(browser, assertions) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route(
    "**/public/images/haizhangwu/rotation/view-135.png",
    (route) => route.abort(),
  );
  await openObserve(page);
  await waitForRotationState(page, "limited");
  const observe = await readState(page);
  await page.mouse.click(
    observe.trigger.hitTargets.torso.x,
    observe.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(460);
  const initial = await readState(page);
  assertions.missingFrameUsesLimitedMode =
    !initial.viewer.state.fullRotationEnabled &&
    initial.viewer.state.rotationState === "limited" &&
    initial.viewer.state.viewCount === 4 &&
    initial.viewer.rotationMode.includes("有限角度") &&
    initial.viewer.activeImage ===
      "../public/images/haizhangwu/front-walk.png";
  assertions.missingFrameKeepsFourContiguousViews =
    initial.viewer.availableViews.map((view) => view.angle).join("|") ===
      "270|0|90|180";

  await page.locator('[data-hzw-rotate="1"]').click();
  await page.locator('[data-hzw-rotate="1"]').click();
  const limitedRight = await readState(page);
  assertions.limitedModeStopsAtBack =
    limitedRight.viewer.state.angle === 180 &&
    (await page.locator('[data-hzw-rotate="1"]').isDisabled());
  const stopped = await dragRotationSweep(page, 1, 1);
  assertions.limitedModeNeverWraps =
    stopped[0].viewer.state.angle === 180;
  assertions.missingFrameDoesNotBreakComponent =
    pageErrors.length === 0 &&
    stopped[0].viewer.imageComplete &&
    stopped[0].horizontalOverflow === 0;

  await context.close();
}

async function runDesktop(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  installErrorCapture(page, "desktop", errors);
  await openObserve(page);
  await waitForRotationState(page, "full");

  const initial = await readState(page);
  assertions.bothPortraitCardsRemoved = initial.cards === 0;
  assertions.seaHotspotIsKeyboardTrigger =
    initial.trigger.role === "button" &&
    initial.trigger.tabIndex === 0 &&
    initial.trigger.pointerEvents === "none" &&
    initial.trigger.hitBounds.pointerEvents === "all";
  assertions.seaHotspotUsesAlphaHitMask =
    initial.trigger.polygons === 0 &&
    !initial.trigger.hintExists &&
    initial.trigger.label === "点击海张五，进入人物观察" &&
    initial.trigger.alphaHits.torso === true &&
    initial.trigger.alphaHits.transparent === false;
  assertions.backgroundUsesSuppliedScene =
    initial.scene.background.source ===
      "assets/ni-ren-zhang/sea-zhang-wu-enters-tianqingguan.png" &&
    initial.scene.background.loaded &&
    initial.scene.background.naturalWidth === 1672 &&
    initial.scene.background.naturalHeight === 941 &&
    initial.scene.background.objectFit === "cover" &&
    !initial.scene.background.filter.includes("blur");
  assertions.headingMovesToRightColumn =
    initial.scene.heading.rect.left > initial.viewport.width * 0.66 &&
    initial.scene.heading.rect.right <= initial.viewport.width * 0.97 + 1 &&
    initial.scene.heading.rect.width / initial.viewport.width >= 0.25 &&
    initial.scene.heading.rect.width / initial.viewport.width <= 0.28;
  assertions.storyCopyAndNextActionPreserved =
    initial.scene.heading.title === "谁在看戏，谁在看人？" &&
    initial.scene.heading.copy.includes("海张五横冲直撞") &&
    initial.scene.nextButton.text.includes("继续阅读");
  assertions.hotspotTracksPersonOnly =
    initial.trigger.hits.torso.insideHotspot &&
    !initial.trigger.alphaHits.leftCompanion &&
    !initial.trigger.alphaHits.rightCompanion &&
    !initial.trigger.alphaHits.rightWaiter &&
    initial.trigger.alphaHits.torso &&
    !initial.trigger.alphaHits.transparent &&
    initial.trigger.hits.transparentInsideBounds.insideHotspot;
  assertions.figureOverlayDoesNotCoverTopNavigation = await page.evaluate(
    () => {
      const active = document.querySelector(
        ".nr-step-nav [aria-current='page']",
      );
      const rect = active?.getBoundingClientRect();
      if (!rect) return false;
      const target = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return Boolean(
        target?.closest(".nr-step-nav") &&
          !target.closest("#nrSeaHotspot"),
      );
    },
  );
  assertions.viewerStartsClosed = initial.viewer.hidden;
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-observe-scene-desktop.png"),
  });

  await page.mouse.move(
    initial.trigger.hitTargets.torso.x,
    initial.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(220);
  const hovered = await readState(page);
  assertions.hoveringOpaqueFigureUsesPointer =
    hovered.trigger.hitBounds.cursor === "pointer" &&
    hovered.overlay.pageClass.includes("is-figure-hit");

  await page.mouse.click(
    initial.trigger.hitTargets.transparentInsideBounds.x,
    initial.trigger.hitTargets.transparentInsideBounds.y,
  );
  assertions.backgroundOutsidePersonStaysInactive = await page
    .locator("#haizhangwuViewer")
    .isHidden();

  await page.mouse.click(
    initial.trigger.hitTargets.torso.x,
    initial.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(460);
  const opened = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-desktop-front.png"),
  });

  assertions.viewerOpensAsDialog =
    !opened.viewer.hidden &&
    opened.viewer.openClass &&
    opened.viewer.role === "dialog" &&
    opened.viewer.ariaModal === "true";
  assertions.viewerTitleIsExact =
    opened.viewer.title === "人物细观 · 海张五";
  assertions.viewerStartsFrontAndFull =
    opened.viewer.state.viewId === "front" &&
    opened.viewer.state.angle === 0 &&
    opened.viewer.state.fullRotationEnabled &&
    opened.viewer.state.rotationState === "full" &&
    opened.viewer.state.viewCount === 8 &&
    opened.viewer.state.scale === 1 &&
    opened.viewer.state.mode === "rotate" &&
    opened.viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-000.png" &&
    opened.viewer.imageComplete &&
    opened.viewer.naturalWidth === 1024 &&
    opened.viewer.naturalHeight === 1536 &&
    opened.viewer.angleLabel === "0°" &&
    opened.viewer.angleReadout === "0°" &&
    opened.viewer.activeTick === "0" &&
    opened.viewer.tickCount === 8 &&
    opened.viewer.rotationMode.includes("360°");
  assertions.personContainedInFrame =
    opened.viewer.visual.left >= opened.viewer.frame.left - 1 &&
    opened.viewer.visual.right <= opened.viewer.frame.right + 1 &&
    opened.viewer.visual.top >= opened.viewer.frame.top - 1 &&
    opened.viewer.visual.bottom <= opened.viewer.frame.bottom + 1;
  assertions.backgroundScrollLocked =
    opened.viewer.bodyOverflow === "hidden";
  assertions.viewerStaysInsideViewport =
    opened.viewer.sheetRect.left >= 0 &&
    opened.viewer.sheetRect.top >= 0 &&
    opened.viewer.sheetRect.right <= opened.viewport.width + 0.5 &&
    opened.viewer.sheetRect.bottom <= opened.viewport.height + 0.5;
  assertions.frontHasFourCalibratedPoints =
    opened.viewer.hotspots.join("|") === "face|vest|fan|jade";
  assertions.hotspotVisualsAreOneThird =
    opened.viewer.hotspotDetails.every(
      (hotspot) =>
        Math.abs(hotspot.visualScale - 1 / 3) < 0.001 &&
        Math.abs(hotspot.dotScale - 1 / 3) < 0.001 &&
        hotspot.hitWidth === 34 &&
        hotspot.hitHeight === 34,
    );
  assertions.hotspotCentresAreUnchanged = (() => {
    const expected = [
      [520.8125, 198.8125],
      [548.59375, 328.453125],
      [517.734375, 272.890625],
      [471.4375, 407.15625],
    ];
    return opened.viewer.hotspotDetails.every(
      (hotspot, index) =>
        Math.abs(hotspot.centerX - expected[index][0]) < 1 &&
        Math.abs(hotspot.centerY - expected[index][1]) < 1,
    );
  })();
  assertions.eightFramesHaveUniqueOrderedSources =
    opened.viewer.availableViews.map((view) => view.angle).join("|") ===
      "0|45|90|135|180|225|270|315" &&
    new Set(
      opened.viewer.availableViews.map((view) => view.src),
    ).size === 8;
  assertions.frontUsesFullNativePng =
    opened.viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-000.png" &&
    opened.viewer.resolution === "standard" &&
    opened.viewer.imageStyle.objectFit === "contain" &&
    opened.viewer.imageStyle.imageRendering === "auto" &&
    opened.viewer.imageStyle.filter === "none";
  assertions.singleCssTransformWithoutBlur =
    opened.viewer.imageStyle.transform === "none" &&
    opened.viewer.visualWillChange === "auto" &&
    opened.viewer.visualFilter === "none" &&
    Math.abs(
      opened.viewer.visualBaseWidth /
        opened.viewer.visualBaseHeight -
        2 / 3,
    ) < 0.002;
  assertions.rotationButtonsMatchBrief = await page.evaluate(() => {
    const left = document.querySelector('[data-hzw-rotate="-1"]');
    const right = document.querySelector('[data-hzw-rotate="1"]');
    const reset = document.querySelector("[data-hzw-reset]");
    return (
      left?.getAttribute("aria-label") === "向左旋转45度" &&
      right?.getAttribute("aria-label") === "向右旋转45度" &&
      reset?.textContent.trim() === "恢复正面"
    );
  });

  const rightSweep = await dragRotationSweep(page, 1, 8);
  assertions.rightDragFollowsEightFrameSequence =
    rightSweep.map((state) => state.viewer.state.angle).join("|") ===
      "45|90|135|180|225|270|315|0" &&
    rightSweep.map((state) => state.viewer.state.viewId).join("|") ===
      "front-right|right-side|back-right|back|back-left|left-side|front-left|front";
  assertions.wrapAfterFullCircle =
    rightSweep.at(-1)?.viewer.state.angle === 0 &&
    rightSweep.at(-1)?.viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-000.png";
  assertions.releaseKeepsCurrentView =
    (await readState(page)).viewer.state.angle === 0;
  assertions.rotationKeepsSizeAndBaselineStable =
    rightSweep.every((state) => {
      const rect = state.viewer.visual;
      const first = rightSweep[0].viewer.visual;
      return (
        Math.abs(rect.left - first.left) < 1 &&
        Math.abs(rect.top - first.top) < 1 &&
        Math.abs(rect.width - first.width) < 1 &&
        Math.abs(rect.height - first.height) < 1
      );
    });
  assertions.everyRotationFrameLoadedWithoutBlanks =
    rightSweep.every(
      (state) =>
        state.viewer.imageComplete &&
        state.viewer.activeImage?.includes("/rotation/view-"),
    );

  const leftSweep = await dragRotationSweep(page, -1, 1);
  assertions.leftDragUsesReverseDirection =
    leftSweep[0].viewer.state.angle === 315 &&
    leftSweep[0].viewer.state.viewId === "front-left" &&
    leftSweep[0].viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-315.png";
  assertions.angleIndicatorTracksDrag =
    leftSweep[0].viewer.angleReadout === "315°" &&
    leftSweep[0].viewer.activeTick === "315";

  await page.locator("[data-hzw-reset]").click();
  for (let index = 0; index < 4; index += 1) {
    await page.locator('[data-hzw-rotate="1"]').click();
  }
  await page.waitForTimeout(120);
  const back = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-desktop-back.png"),
  });
  assertions.arrowReachesBackView =
    back.viewer.state.viewId === "back" &&
    back.viewer.state.angle === 180;
  assertions.backViewHasNoFacePoint =
    !back.viewer.hotspots.includes("face") &&
    back.viewer.hotspots.includes("vest") &&
    back.viewer.hotspots.includes("fan");

  await page.locator("[data-hzw-reset]").click();
  await page.locator('[data-hzw-zoom="in"]').click();
  const autoPan = await readState(page);
  assertions.zoomInAutomaticallyEntersPan =
    autoPan.viewer.state.scale === 1.2 &&
    autoPan.viewer.state.mode === "pan" &&
    autoPan.viewer.state.interactionMode === "pan" &&
    autoPan.viewer.state.angle === 0 &&
    !autoPan.viewer.modeHidden;
  assertions.modeButtonsMatchBrief =
    autoPan.viewer.modeButtons.map((button) => button.label).join("|") ===
      "旋转人物|移动观察" &&
    autoPan.viewer.modeButtons.find((button) => button.mode === "pan")
      ?.pressed === "true";

  const beforeVerticalPan = await readState(page);
  await drag(page, "#hzwPortraitFrame", { x: 0.5, y: 0.78 }, {
    x: 0.5,
    y: 0.22,
  });
  const afterUpPan = await readState(page);
  assertions.panMovesVerticallyWithoutRotating =
    afterUpPan.viewer.state.mode === "pan" &&
    afterUpPan.viewer.state.panY <
      beforeVerticalPan.viewer.state.panY - 100 &&
    afterUpPan.viewer.state.angle ===
      beforeVerticalPan.viewer.state.angle &&
    afterUpPan.viewer.transform !== beforeVerticalPan.viewer.transform;
  await drag(page, "#hzwPortraitFrame", { x: 0.5, y: 0.78 }, {
    x: 0.5,
    y: 0.22,
  });
  assertions.lowerImageCanReachViewportCentre = await page.evaluate(() => {
    const visual = document
      .querySelector("#hzwVisual")
      .getBoundingClientRect();
    const frame = document
      .querySelector("#hzwPortraitFrame")
      .getBoundingClientRect();
    return Math.abs(visual.bottom - (frame.top + frame.height / 2)) < 3;
  });

  await drag(page, "#hzwPortraitFrame", { x: 0.5, y: 0.08 }, {
    x: 0.5,
    y: 0.92,
  });
  await drag(page, "#hzwPortraitFrame", { x: 0.5, y: 0.08 }, {
    x: 0.5,
    y: 0.92,
  });
  const afterDownPan = await readState(page);
  assertions.upperImageCanReachViewportCentre = await page.evaluate(() => {
    const visual = document
      .querySelector("#hzwVisual")
      .getBoundingClientRect();
    const frame = document
      .querySelector("#hzwPortraitFrame")
      .getBoundingClientRect();
    return Math.abs(visual.top - (frame.top + frame.height / 2)) < 3;
  });
  assertions.dragKeepsPanAndRotationIndependent =
    afterDownPan.viewer.state.mode === "pan" &&
    afterDownPan.viewer.state.panY > 0 &&
    afterDownPan.viewer.state.angle === 0 &&
    afterDownPan.viewer.state.viewId === "front";

  await page.locator('[data-hzw-mode="rotate"]').click();
  const beforeRotateWhileZoomed = await readState(page);
  const zoomedRotationSweep = await dragRotationSweep(page, 1, 1);
  const zoomedRotation = zoomedRotationSweep[0];
  assertions.zoomDoesNotDisableRotation =
    zoomedRotation.viewer.state.mode === "rotate" &&
    zoomedRotation.viewer.state.scale === 1.2 &&
    zoomedRotation.viewer.state.angle === 45 &&
    zoomedRotation.viewer.activeImage ===
      "../public/images/haizhangwu/rotation/view-045.png" &&
    Math.abs(
      zoomedRotation.viewer.state.panY -
        beforeRotateWhileZoomed.viewer.state.panY,
    ) < 1;

  await page.locator('[data-hzw-mode="pan"]').click();
  const beforeReturnToPan = await readState(page);
  await drag(page, "#hzwPortraitFrame", { x: 0.45, y: 0.65 }, {
    x: 0.56,
    y: 0.35,
  });
  const afterReturnToPan = await readState(page);
  assertions.canReturnToPanAndKeepAngle =
    afterReturnToPan.viewer.state.mode === "pan" &&
    afterReturnToPan.viewer.state.angle ===
      beforeReturnToPan.viewer.state.angle &&
    afterReturnToPan.viewer.state.panY <
      beforeReturnToPan.viewer.state.panY;

  await page.locator("[data-hzw-reset]").click();
  const wheelBefore = await readState(page);
  const wheelPoint = {
    x: wheelBefore.viewer.frame.left +
      wheelBefore.viewer.frame.width * 0.64,
    y: wheelBefore.viewer.frame.top +
      wheelBefore.viewer.frame.height * 0.23,
  };
  const wheelAnchorBefore =
    (wheelPoint.y -
      (wheelBefore.viewer.frame.top +
        wheelBefore.viewer.frame.height / 2) -
      wheelBefore.viewer.state.y) /
      wheelBefore.viewer.state.scale /
      wheelBefore.viewer.visualBaseHeight +
    0.5;
  await page.mouse.move(wheelPoint.x, wheelPoint.y);
  await page.mouse.wheel(0, -500);
  const wheelAfter = await readState(page);
  const wheelAnchorAfter =
    (wheelPoint.y -
      (wheelAfter.viewer.frame.top +
        wheelAfter.viewer.frame.height / 2) -
      wheelAfter.viewer.state.y) /
      wheelAfter.viewer.state.scale /
      wheelAfter.viewer.visualBaseHeight +
    0.5;
  assertions.wheelZoomsAroundPointer =
    wheelAfter.viewer.state.scale > 1.05 &&
    wheelAfter.viewer.state.mode === "pan" &&
    Math.abs(wheelAnchorAfter - wheelAnchorBefore) < 0.015;

  await page.evaluate(() => {
    const frame = document.querySelector("#hzwPortraitFrame");
    const rect = frame.getBoundingClientRect();
    const fire = (type, y) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 71,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          clientX: rect.left + rect.width * 0.5,
          clientY: y,
        }),
      );
    fire("pointerdown", rect.top + rect.height * 0.58);
    fire("pointermove", rect.top + rect.height * 0.42);
  });
  const canceledDrag = await readState(page);
  await page.evaluate(() => {
    const frame = document.querySelector("#hzwPortraitFrame");
    const rect = frame.getBoundingClientRect();
    frame.dispatchEvent(
      new PointerEvent("pointercancel", {
        bubbles: true,
        cancelable: true,
        pointerId: 71,
        pointerType: "mouse",
        isPrimary: true,
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.42,
      }),
    );
    frame.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerId: 71,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.2,
      }),
    );
  });
  const afterCancel = await readState(page);
  assertions.pointerCancelEndsDragWithoutSticking =
    canceledDrag.viewer.state.panY <
      wheelAfter.viewer.state.panY &&
    afterCancel.viewer.state.panY ===
      canceledDrag.viewer.state.panY &&
    afterCancel.viewer.state.angle ===
      canceledDrag.viewer.state.angle;

  await page.locator("[data-hzw-reset]").click();
  for (let i = 0; i < 10; i += 1) {
    await page.locator('[data-hzw-zoom="in"]').click();
  }
  const threeTimes = await readState(page);
  assertions.desktopThreeTimesUsesNativeSourcePixels =
    threeTimes.devicePixelRatio === 1 &&
    threeTimes.viewer.naturalWidth >= threeTimes.viewer.visual.width;
  await page.locator('[data-hzw-mode="pan"]').click();
  const beforeThreeTimesPan = await readState(page);
  await drag(page, "#hzwPortraitFrame", { x: 0.12, y: 0.22 }, {
    x: 0.72,
    y: 0.78,
  });
  const afterThreeTimesPan = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-desktop-pan-3x.png"),
  });
  assertions.hotspotsTrackZoomAndPan = (() => {
    const visual = afterThreeTimesPan.viewer.visual;
    return afterThreeTimesPan.viewer.hotspotDetails.every((hotspot) => {
      const expectedX =
        visual.left + visual.width * (Number.parseFloat(hotspot.left) / 100);
      const expectedY =
        visual.top + visual.height * (Number.parseFloat(hotspot.top) / 100);
      return (
        Math.abs(hotspot.centerX - expectedX) < 1 &&
        Math.abs(hotspot.centerY - expectedY) < 1
      );
    });
  })();
  assertions.panModeMovesZoomedPerson =
    threeTimes.viewer.state.scale === 3 &&
    afterThreeTimesPan.viewer.state.mode === "pan" &&
    afterThreeTimesPan.viewer.state.panX >
      beforeThreeTimesPan.viewer.state.panX &&
    afterThreeTimesPan.viewer.state.panY >
      beforeThreeTimesPan.viewer.state.panY &&
    afterThreeTimesPan.viewer.state.angle ===
      beforeThreeTimesPan.viewer.state.angle &&
    afterThreeTimesPan.viewer.transform !==
      beforeThreeTimesPan.viewer.transform;

  await drag(page, "#hzwPortraitFrame", { x: 0.82, y: 0.5 }, {
    x: 0.12,
    y: 0.5,
  });
  await drag(page, "#hzwPortraitFrame", { x: 0.82, y: 0.5 }, {
    x: 0.12,
    y: 0.5,
  });
  assertions.zoomedImageCanPanHorizontally = await page.evaluate(() => {
    const state = window.HaizhangwuViewer.getState();
    const visual = document
      .querySelector("#hzwVisual")
      .getBoundingClientRect();
    const frame = document
      .querySelector("#hzwPortraitFrame")
      .getBoundingClientRect();
    return (
      state.panX < 0 &&
      Math.abs(visual.right - frame.right) < 3
    );
  });

  for (let i = 0; i < 5; i += 1) {
    await page.locator('[data-hzw-zoom="in"]').click();
  }
  const maxZoom = await readState(page);
  assertions.zoomClampsAtFourTimes =
    maxZoom.viewer.state.scale === 4 &&
    maxZoom.viewer.state.mode === "pan" &&
    !maxZoom.viewer.modeHidden;

  for (let i = 0; i < 15; i += 1) {
    await page.locator('[data-hzw-zoom="out"]').click();
  }
  const zoomedOutToBase = await readState(page);
  assertions.zoomOutRestoresCentredRotation =
    zoomedOutToBase.viewer.state.scale === 1 &&
    zoomedOutToBase.viewer.state.mode === "rotate" &&
    zoomedOutToBase.viewer.state.panX === 0 &&
    zoomedOutToBase.viewer.state.panY === 0 &&
    zoomedOutToBase.viewer.modeHidden;

  await page.locator("[data-hzw-reset]").click();
  await page.waitForTimeout(220);
  const reset = await readState(page);
  assertions.resetRestoresFrontAndScale =
    reset.viewer.state.viewId === "front" &&
    reset.viewer.state.angle === 0 &&
    reset.viewer.state.scale === 1 &&
    reset.viewer.state.mode === "rotate" &&
    reset.viewer.modeHidden;

  const openedHotspotDetails = {};
  for (const kind of ["face", "fan", "vest", "jade"]) {
    await page.locator("[data-hzw-reset]").click();
    await page.waitForTimeout(80);
    await page.locator(`.hzw-hotspot[data-kind="${kind}"]`).click();
    await page.waitForTimeout(80);
    const pointState = await readState(page);
    openedHotspotDetails[kind] = {
      title: pointState.viewer.detailTitle,
      scale: pointState.viewer.state.scale,
      mode: pointState.viewer.state.mode,
    };
  }
  assertions.allFourSmallHotspotsOpenDetails =
    Object.values(openedHotspotDetails).every(
      (detailState) =>
        detailState.title !== "先看他的姿态" &&
        detailState.scale === 1.8 &&
        detailState.mode === "pan",
    );
  await page.locator("[data-hzw-reset]").click();
  await page.waitForTimeout(220);

  const faceHotspot = page.locator('.hzw-hotspot[data-kind="face"]');
  await faceHotspot.hover();
  await page.waitForTimeout(220);
  const hoveredHotspot = await readState(page);
  assertions.smallHotspotKeepsHoverFeedback =
    hoveredHotspot.viewer.hotspotDetails.find(
      (hotspot) => hotspot.kind === "face",
    )?.background === "rgb(114, 50, 36)" &&
    Math.abs(
      hoveredHotspot.viewer.hotspotDetails.find(
        (hotspot) => hotspot.kind === "face",
      )?.visualScale -
        1 / 3,
    ) < 0.001;
  await faceHotspot.click();
  await page.waitForTimeout(80);
  const detail = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-desktop-face-detail.png"),
  });
  assertions.detailPointZoomsAndExplains =
    detail.viewer.state.scale === 1.8 &&
    detail.viewer.state.mode === "pan" &&
    detail.viewer.detailTitle.includes("眉眼") &&
    detail.viewer.detailCopy.length > 12;
  assertions.zoomCannotCoverCloseButton = await page.evaluate(() => {
    const close = document.querySelector(".hzw-close").getBoundingClientRect();
    const frame = document
      .querySelector("#hzwPortraitFrame")
      .getBoundingClientRect();
    const footer = document
      .querySelector(".hzw-footer")
      .getBoundingClientRect();
    return frame.top >= close.bottom && frame.bottom <= footer.top;
  });

  const pageBeforeClose = await page.evaluate(() => ({
    page: window.niRenZhangStory.getCurrentPage(),
    hash: location.hash,
    scrollTop: document.querySelector("#nrPageObserve").scrollTop,
  }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(450);
  const closed = await readState(page);
  assertions.escapeReturnsToSameStoryPoint =
    closed.viewer.hidden &&
    !closed.viewer.openClass &&
    closed.currentPage === pageBeforeClose.page &&
    closed.hash === pageBeforeClose.hash &&
    closed.observePageScrollTop === pageBeforeClose.scrollTop;
  assertions.closeRestoresBackgroundScroll =
    closed.viewer.bodyOverflow === "" &&
    closed.viewer.activeElement.tag === "svg" &&
    closed.viewer.activeElement.label === "点击海张五，进入人物观察";

  await page.locator("[data-haizhangwu-open]").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  assertions.enterOpensViewer = await page
    .locator("#haizhangwuViewer")
    .isVisible();
  await page.locator(".hzw-return").click();
  await page.waitForTimeout(500);
  assertions.returnButtonClosesViewer = await page
    .locator("#haizhangwuViewer")
    .isHidden();
  await page.locator("#nrObserveNextButton").click();
  await page.waitForFunction(
    () =>
      window.niRenZhangStory.getObserveScene() === "mockery" &&
      document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
        "false",
  );
  await page.locator("#nrObserveNextButton").click();
  await page.waitForFunction(
    () => window.ClayStoryTransition?.getState() === "shoe-clay",
  );
  await page.locator("#clayStoryTransitionSkip").click();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "craft",
  );
  assertions.nextChapterStillWorks =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "craft";
  assertions.noDesktopHorizontalOverflow =
    opened.horizontalOverflow === 0 &&
    closed.horizontalOverflow === 0;

  await context.close();
}

async function runMobile(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  installErrorCapture(page, "mobile", errors);
  await openObserve(page);
  await waitForRotationState(page, "full");
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-observe-scene-mobile.png"),
  });
  assertions.mobileSceneRemovesCardsAndKeepsRightCopy =
    initial.cards === 0 &&
    initial.scene.heading.rect.left > initial.viewport.width * 0.48 &&
    initial.scene.heading.rect.right <= initial.viewport.width - 8 &&
    initial.scene.heading.title === "谁在看戏，谁在看人？";
  assertions.mobileHotspotTracksPerson =
    initial.trigger.hits.torso.insideHotspot &&
    !initial.trigger.alphaHits.leftCompanion &&
    !initial.trigger.alphaHits.rightCompanion &&
    !initial.trigger.alphaHits.rightWaiter &&
    initial.trigger.alphaHits.torso === true &&
    initial.trigger.alphaHits.transparent === false;
  assertions.mobileSceneNoHorizontalOverflow =
    initial.horizontalOverflow === 0;

  await page.touchscreen.tap(
    initial.trigger.hitTargets.torso.x,
    initial.trigger.hitTargets.torso.y,
  );
  await page.waitForTimeout(460);
  const opened = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-mobile-front.png"),
  });
  assertions.mobileViewerFitsViewport =
    opened.viewer.sheetRect.left >= 0 &&
    opened.viewer.sheetRect.top >= 0 &&
    opened.viewer.sheetRect.right <= opened.viewport.width + 0.5 &&
    opened.viewer.sheetRect.bottom <= opened.viewport.height + 0.5;
  assertions.mobilePersonFullyVisible =
    opened.viewer.visual.left >= opened.viewer.frame.left - 1 &&
    opened.viewer.visual.right <= opened.viewer.frame.right + 1 &&
    opened.viewer.visual.top >= opened.viewer.frame.top - 1 &&
    opened.viewer.visual.bottom <= opened.viewer.frame.bottom + 1;
  assertions.mobileNoHorizontalOverflow =
    opened.horizontalOverflow === 0;
  assertions.mobileControlsAreTouchSized = await page.evaluate(() =>
    [...document.querySelectorAll(
      ".hzw-control, .hzw-mode-button, .hzw-return, .hzw-close",
    )]
      .filter((button) => button.offsetParent !== null)
      .every((button) => button.getBoundingClientRect().height >= 40),
  );
  assertions.mobileHotspotHitAreaPreserved =
    opened.viewer.hotspotDetails.every(
      (hotspot) =>
        hotspot.hitWidth === 32 &&
        hotspot.hitHeight === 32 &&
        Math.abs(hotspot.visualScale - 1 / 3) < 0.001 &&
        Math.abs(hotspot.dotScale - 1 / 3) < 0.001,
    );

  await page.evaluate(() => {
    const frame = document.querySelector("#hzwPortraitFrame");
    const rect = frame.getBoundingClientRect();
    const point = (id, x, y) =>
      new PointerEvent("pointer" + id, {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
    frame.dispatchEvent(point("down", rect.left + rect.width * 0.5 - 28, rect.top + rect.height * 0.5));
    frame.dispatchEvent(point("move", rect.left + rect.width * 0.5 + 28, rect.top + rect.height * 0.5));
    frame.dispatchEvent(point("up", rect.left + rect.width * 0.5 + 28, rect.top + rect.height * 0.5));
  });
  await page.waitForTimeout(220);
  const rotated = await readState(page);
  assertions.mobileTouchDragRotates =
    rotated.viewer.state.viewId === "front-right" &&
    rotated.viewer.state.angle === 45 &&
    rotated.viewer.activeTick === "45";

  await page.evaluate(() => {
    const frame = document.querySelector("#hzwPortraitFrame");
    const rect = frame.getBoundingClientRect();
    const fire = (type, id, x, y) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: id,
          pointerType: "touch",
          isPrimary: id === 51,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    fire("pointerdown", 51, rect.left + rect.width * 0.35, rect.top + rect.height * 0.5);
    fire("pointerdown", 52, rect.left + rect.width * 0.65, rect.top + rect.height * 0.5);
    fire("pointermove", 51, rect.left + rect.width * 0.22, rect.top + rect.height * 0.5);
    fire("pointermove", 52, rect.left + rect.width * 0.78, rect.top + rect.height * 0.5);
    fire("pointerup", 51, rect.left + rect.width * 0.22, rect.top + rect.height * 0.5);
    fire("pointerup", 52, rect.left + rect.width * 0.78, rect.top + rect.height * 0.5);
  });
  await page.waitForTimeout(120);
  const pinched = await readState(page);
  assertions.mobilePinchZooms =
    pinched.viewer.state.scale > 1.1 &&
    pinched.viewer.state.mode === "pan" &&
    pinched.viewer.state.angle === 45 &&
    !pinched.viewer.modeHidden;

  await page.evaluate(() => {
    const frame = document.querySelector("#hzwPortraitFrame");
    const rect = frame.getBoundingClientRect();
    const fire = (type, y) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 61,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          clientX: rect.left + rect.width * 0.5,
          clientY: y,
        }),
      );
    fire("pointerdown", rect.top + rect.height * 0.78);
    fire("pointermove", rect.top + rect.height * 0.34);
    fire("pointerup", rect.top + rect.height * 0.34);
  });
  await page.waitForTimeout(80);
  const mobilePanned = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "haizhangwu-viewer-mobile-pan.png"),
  });
  assertions.mobileSingleFingerPansWhenZoomed =
    mobilePanned.viewer.state.mode === "pan" &&
    mobilePanned.viewer.state.angle === 45 &&
    mobilePanned.viewer.state.panY < -20 &&
    mobilePanned.viewer.transform !== pinched.viewer.transform;

  await page.locator(".hzw-close").click();
  await page.waitForTimeout(450);
  assertions.mobileCloseReturnsToObserve =
    (await page.locator("#haizhangwuViewer").isHidden()) &&
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "observe";
  const nextButton = page.locator("#nrObserveNextButton");
  await nextButton.scrollIntoViewIfNeeded();
  await nextButton.tap();
  await page.waitForFunction(
    () =>
      window.niRenZhangStory.getObserveScene() === "mockery" &&
      document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
        "false",
  );
  await nextButton.tap();
  await page.waitForFunction(
    () => window.ClayStoryTransition?.getState() === "shoe-clay",
  );
  await page.locator("#clayStoryTransitionSkip").tap();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "craft",
  );
  assertions.mobileNextChapterStillWorks =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "craft";
  assertions.mobileNoCompletedOverflow =
    pinched.horizontalOverflow === 0;

  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const assertions = {};
  const errors = [];
  try {
    await runResponsiveScene(browser, assertions, errors);
    await runDesktop(browser, assertions, errors);
    await runMobile(browser, assertions, errors);
    await runHighResolutionSwitch(browser, assertions, errors);
    await runHighResolutionFallback(browser, assertions);
    await runLimitedFallback(browser, assertions);
  } finally {
    await browser.close();
  }

  assertions.noBrowserErrors = errors.length === 0;
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const report = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    failed,
    errors,
    passed: failed.length === 0,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
