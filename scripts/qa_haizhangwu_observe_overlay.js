const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-haizhangwu-observe-overlay.json");
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

function captureName(name, viewport) {
  return `haizhangwu-observe-overlay-${name}-${viewport.width}x${viewport.height}.png`;
}

function compareVisibleArea(before, after, bounds) {
  const leftImage = PNG.sync.read(before);
  const rightImage = PNG.sync.read(after);
  if (
    leftImage.width !== rightImage.width ||
    leftImage.height !== rightImage.height
  ) {
    return {
      comparable: false,
      changedPixels: Number.POSITIVE_INFINITY,
      maxChannelDelta: Number.POSITIVE_INFINITY,
    };
  }
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(leftImage.width, Math.ceil(bounds.right));
  const bottom = Math.min(leftImage.height, Math.ceil(bounds.bottom));
  let changedPixels = 0;
  let changedPixelsOver16 = 0;
  let totalChannelDelta = 0;
  let maxChannelDelta = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = (y * leftImage.width + x) * 4;
      const delta = Math.max(
        Math.abs(leftImage.data[index] - rightImage.data[index]),
        Math.abs(leftImage.data[index + 1] - rightImage.data[index + 1]),
        Math.abs(leftImage.data[index + 2] - rightImage.data[index + 2]),
      );
      if (delta > 2) changedPixels += 1;
      if (delta > 16) changedPixelsOver16 += 1;
      totalChannelDelta +=
        Math.abs(leftImage.data[index] - rightImage.data[index]) +
        Math.abs(leftImage.data[index + 1] - rightImage.data[index + 1]) +
        Math.abs(leftImage.data[index + 2] - rightImage.data[index + 2]);
      if (delta > maxChannelDelta) maxChannelDelta = delta;
    }
  }
  return {
    comparable: true,
    changedPixels,
    changedPixelsOver16,
    meanChannelDelta:
      totalChannelDelta /
      Math.max(1, (right - left) * (bottom - top) * 3),
    maxChannelDelta,
  };
}

async function inspect(page, viewport, errors, label) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/observe`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "observe",
  );
  await page.waitForFunction(() => {
    const background = document.querySelector(".nr-observe-background");
    return (
      background?.complete &&
      background.naturalWidth > 0 &&
      window.HaizhangwuOverlayCalibrator?.getState?.().alphaReady
    );
  });
  await page.waitForTimeout(250);

  const state = await page.evaluate(() => {
    const pagePanel = document.querySelector("#nrPageObserve");
    const background = document.querySelector(".nr-observe-background");
    const hotspot = document.querySelector("#nrSeaHotspot");
    const shape = document.querySelector("#nrSeaHotspotShape");
    const placement = document.querySelector("#nrSeaFigurePlacement");
    const overlay = document.querySelector("#nrSeaFigureOverlay");
    const hitBounds = document.querySelector("#nrSeaHitBounds");
    const side = document.querySelector(".nr-observe-side");
    const heading = document.querySelector(
      "#nrPageObserve .nr-center-heading",
    );
    const nav = document.querySelector("#niRenZhangExperience .nr-step-nav");
    const next = document.querySelector("#nrObserveNextButton");
    const config = window.HAIZHANGWU_OVERLAY_CONFIG;
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      };
    };
    const matrix = shape?.getScreenCTM();
    const sourcePoint = (x, y) => {
      if (!hotspot || !matrix) return null;
      const point = hotspot.createSVGPoint();
      point.x = x;
      point.y = y;
      const result = point.matrixTransform(matrix);
      return { x: result.x, y: result.y };
    };
    const backgroundRect = rect(background);
    const backgroundPosition = getComputedStyle(background)
      .objectPosition.split(/\s+/)
      .filter(Boolean);
    const positionFactor = (token, fallback) => {
      if (token === "center") return 0.5;
      if (token === "left" || token === "top") return 0;
      if (token === "right" || token === "bottom") return 1;
      const percentage = Number.parseFloat(token);
      return Number.isFinite(percentage) ? percentage / 100 : fallback;
    };
    const focusX = positionFactor(backgroundPosition[0], 0.5);
    const focusY = positionFactor(backgroundPosition[1], 0.5);
    const coverScale = Math.max(
      backgroundRect.width / background.naturalWidth,
      backgroundRect.height / background.naturalHeight,
    );
    const renderedWidth = background.naturalWidth * coverScale;
    const renderedHeight = background.naturalHeight * coverScale;
    const fitOffset = {
      x: (backgroundRect.width - renderedWidth) * focusX,
      y: (backgroundRect.height - renderedHeight) * focusY,
    };
    const overlayStart = sourcePoint(
      config.transform.left,
      config.transform.top,
    );
    const overlayEnd = sourcePoint(
      config.transform.left + config.figure.width * config.transform.scale,
      config.transform.top + config.figure.height * config.transform.scale,
    );
    const eyePoint = sourcePoint(
      config.transform.left +
        ((config.keypoints.find((point) => point.id === "eye")?.x || 414) *
          config.transform.scale),
      config.transform.top +
        ((config.keypoints.find((point) => point.id === "eye")?.y || 82) *
          config.transform.scale),
    );
    const transparentPoint = sourcePoint(700, 153);
    const transparentClickPoint = sourcePoint(
      config.transform.left + 500 * config.transform.scale,
      config.transform.top + 50 * config.transform.scale,
    );
    const elementAt = (point) =>
      point
        ? document.elementFromPoint(point.x, point.y)?.closest?.(
            "#nrSeaHotspot, .nr-observe-side, .nr-step-nav",
          )?.id || null
        : null;

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        devicePixelRatio,
      },
      page: rect(pagePanel),
      background: {
        rect: backgroundRect,
        naturalWidth: background.naturalWidth,
        naturalHeight: background.naturalHeight,
        objectFit: getComputedStyle(background).objectFit,
        objectPosition: getComputedStyle(background).objectPosition,
        focus: { x: focusX, y: focusY },
        coverScale,
        fitOffset,
        filter: getComputedStyle(background).filter,
      },
      overlay: {
        src: overlay.getAttribute("href"),
        naturalWidth: config.figure.width,
        naturalHeight: config.figure.height,
        transform: placement.getAttribute("transform"),
        preserveAspectRatio: overlay.getAttribute("preserveAspectRatio"),
        opacity: getComputedStyle(overlay).opacity,
        filter: getComputedStyle(overlay).filter,
        alphaBounds: config.figure.alphaBounds,
        visibleStart: overlayStart,
        visibleEnd: overlayEnd,
        matrix: matrix
          ? {
              a: matrix.a,
              b: matrix.b,
              c: matrix.c,
              d: matrix.d,
              e: matrix.e,
              f: matrix.f,
            }
          : null,
        hitBounds: rect(hitBounds),
      },
      layout: {
        nav: rect(nav),
        side: rect(side),
        heading: rect(heading),
        next: rect(next),
      },
      hitTargets: {
        eye: elementAt(eyePoint),
        transparent: elementAt(transparentPoint),
      },
      hitMask: {
        eye:
          Boolean(eyePoint) &&
          Boolean(
            window.HaizhangwuOverlayCalibrator?.isFigurePoint?.(
              eyePoint.x,
              eyePoint.y,
            ),
          ),
        transparent:
          Boolean(transparentPoint) &&
          Boolean(
            window.HaizhangwuOverlayCalibrator?.isFigurePoint?.(
              transparentPoint.x,
              transparentPoint.y,
            ),
          ),
      },
      points: {
        eye: eyePoint,
        transparentClick: transparentClickPoint,
      },
      calibratorVisible: !document.querySelector("#nrSeaCalibrator").hidden,
      pageClass: pagePanel.className,
    };
  });

  await page.evaluate(() => {
    document.querySelector("#nrSeaFigureOverlay").style.visibility = "hidden";
  });
  await page.waitForTimeout(80);
  const backgroundScreenshot = await page.screenshot({
    fullPage: false,
  });
  await page.evaluate(() => {
    document.querySelector("#nrSeaFigureOverlay").style.visibility = "visible";
  });
  await page.waitForTimeout(80);
  const visibleScreenshot = await page.screenshot({
    fullPage: false,
  });
  const visibleDiff = compareVisibleArea(
    backgroundScreenshot,
    visibleScreenshot,
    state.overlay.hitBounds,
  );

  const screenshot = captureName(label, viewport);
  await page.screenshot({
    path: path.join(ROOT, screenshot),
    fullPage: false,
  });

  await page.mouse.move(state.points.eye.x, state.points.eye.y);
  await page.waitForTimeout(80);
  const hoverTracksFigure = await page.evaluate(
    () => document.querySelector("#nrPageObserve").classList.contains("is-figure-hit"),
  );
  await page.mouse.move(
    state.points.transparentClick.x,
    state.points.transparentClick.y,
  );
  await page.waitForTimeout(80);
  const hoverClearsOutsideFigure = await page.evaluate(
    () => !document.querySelector("#nrPageObserve").classList.contains("is-figure-hit"),
  );

  await page.mouse.click(state.points.eye.x, state.points.eye.y);
  await page.waitForFunction(
    () => document.querySelector("#haizhangwuViewer")?.hidden === false,
  );
  const viewerOpenedFromFigure = await page.evaluate(
    () => document.querySelector("#haizhangwuViewer")?.hidden === false,
  );
  await page.locator("#haizhangwuViewer .hzw-close").click();
  await page.waitForFunction(
    () => document.querySelector("#haizhangwuViewer")?.hidden === true,
  );
  await page.mouse.click(
    state.points.transparentClick.x,
    state.points.transparentClick.y,
  );
  await page.waitForTimeout(220);
  const transparentClickStayedClosed = await page.evaluate(
    () => document.querySelector("#haizhangwuViewer")?.hidden === true,
  );

  const mat = state.overlay.matrix;
  const imageRect = state.overlay.hitBounds;
  const tests = {
    observePageVisible: state.currentPage === "observe",
    backgroundLoaded:
      state.background.naturalWidth === 1672 &&
      state.background.naturalHeight === 941,
    sceneAlignedOverlayLoaded:
      state.overlay.naturalWidth === 1672 &&
      state.overlay.naturalHeight === 941 &&
      state.overlay.src.endsWith(
        "sea-zhang-wu-insitu-overlay.png",
      ),
    overlayUsesScenePixelBounds:
      state.overlay.alphaBounds.left === 436 &&
      state.overlay.alphaBounds.top === 153 &&
      state.overlay.alphaBounds.right === 978 &&
      state.overlay.alphaBounds.bottom === 941,
    overlayFullOpacity: Number(state.overlay.opacity) === 1,
    overlayFilterMatchesBackground:
      state.overlay.filter === state.background.filter,
    backgroundUsesCover:
      state.background.objectFit === "cover" &&
      state.background.objectPosition.includes("50%"),
    overlayUsesBackgroundCoordinateSpace:
      Math.abs(Math.abs(mat.a) - state.background.coverScale) < 0.002 &&
      Math.abs(Math.abs(mat.d) - state.background.coverScale) < 0.002,
    overlayNotNonUniformlyScaled: Math.abs(Math.abs(mat.a) - Math.abs(mat.d)) < 0.001,
    overlayMatchesSceneCrop:
      Math.abs(
        state.overlay.visibleStart.x -
          (state.background.rect.left +
            state.background.fitOffset.x +
            state.background.coverScale * 0),
      ) < 1.5 &&
      Math.abs(
        state.overlay.visibleStart.y -
          (state.background.rect.top +
            state.background.fitOffset.y +
            state.background.coverScale * 0),
      ) < 1.5,
    overlayCoversCharacterBounds:
      imageRect.width / state.page.width > 0.28 &&
      imageRect.height / state.page.height > 0.7,
    normalModeHasNoCalibrationChrome:
      !state.calibratorVisible &&
      !state.pageClass.includes("is-calibrating") &&
      !state.pageClass.includes("show-overlay-bounds"),
    eyeOpensCharacterViewer: state.hitTargets.eye === "nrSeaHotspot",
    hitMaskAcceptsFigure: state.hitMask.eye,
    hitMaskRejectsTransparentMargin: !state.hitMask.transparent,
    hoverTracksFigure,
    hoverClearsOutsideFigure,
    figureClickOpensOriginalViewer: viewerOpenedFromFigure,
    transparentClickDoesNotOpenViewer: transparentClickStayedClosed,
    sideCardPreserved:
      state.layout.side.width >= Math.min(180, viewport.width * 0.46) &&
      state.layout.heading.top >= state.layout.nav.bottom - 2,
    nextButtonPreserved: state.layout.next.width > 150,
    overlayRendersFromScenePixels:
      visibleDiff.comparable &&
      visibleDiff.meanChannelDelta <= 8.5 &&
      visibleDiff.changedPixelsOver16 <=
        imageRect.width * imageRect.height * 0.13,
    noMinimumViewportErrors: errors.length === 0,
  };

  return {
    viewport,
    screenshot,
    state,
    visibleDiff,
    tests,
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = [];
  try {
    for (const caseDefinition of [
      { label: "desktop", width: 1672, height: 941 },
      { label: "wide", width: 1920, height: 1080 },
      { label: "standard", width: 1600, height: 900 },
      { label: "compact", width: 1366, height: 768 },
      { label: "laptop", width: 1440, height: 810 },
      { label: "mobile", width: 390, height: 844, isMobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: {
          width: caseDefinition.width,
          height: caseDefinition.height,
        },
        deviceScaleFactor: 1,
        isMobile: Boolean(caseDefinition.isMobile),
        hasTouch: Boolean(caseDefinition.isMobile),
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) =>
        errors.push(`pageerror: ${error.message}`),
      );
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`console: ${message.text()}`);
        }
      });
      results.push(
        await inspect(
          page,
          {
            width: caseDefinition.width,
            height: caseDefinition.height,
          },
          errors,
          caseDefinition.label,
        ),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const flatTests = results.flatMap((result) =>
    Object.entries(result.tests).map(([name, passed]) => ({
      viewport: result.viewport,
      name,
      passed,
    })),
  );
  const failed = flatTests.filter((test) => !test.passed);
  const report = {
    passed: failed.length === 0,
    assertionCount: flatTests.length,
    failed,
    results,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        assertionCount: report.assertionCount,
        failed,
        report: OUTPUT,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
