const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "output", "qa-archive-pages.json");
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = BROWSER_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) {
    throw new Error("No installed Edge or Chrome executable found.");
  }
  return executable;
}

async function openPaperStack(page) {
  await page.goto(`${PAGE_ORIGIN}index.html`, { waitUntil: "networkidle" });
  await page.locator("#enterButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "CLOSED",
  );
  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "OPEN",
    null,
    { timeout: 8000 },
  );
  await page.locator("#archiveOpenButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "COMPLETE",
    null,
    { timeout: 7000 },
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#archiveCanvas")
      ?.classList.contains("archive-paper-settled"),
  );
  await page.waitForTimeout(80);
}

async function readPaperStack(page) {
  return page.evaluate(() => {
    const stack = document.querySelector("#archivePaperStack");
    const canvas = document.querySelector("#archiveCanvas");
    const pages = [...document.querySelectorAll(".archive-paper-sheet")];
    const decorativeLayers = [
      ...document.querySelectorAll(".paper-sheet-back, .paper-sheet-mid"),
    ];
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const numberProperty = (element, property) =>
      Number(window.gsap.getProperty(element, property));

    return {
      state: window.archiveExperience.state,
      currentIndex: window.archiveExperience.currentPaperIndex,
      transitioning: window.archiveExperience.paperTransitioning,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      overflowX: document.documentElement.scrollWidth > innerWidth,
      stack: {
        rect: rect(stack),
        cssWidth: stack.style.width,
        transform: getComputedStyle(stack).transform,
        x: numberProperty(stack, "x"),
        y: numberProperty(stack, "y"),
        rotation: numberProperty(stack, "rotation"),
        scale: numberProperty(stack, "scale"),
        filter: getComputedStyle(stack).filter,
        willChange: getComputedStyle(stack).willChange,
        settled: canvas.classList.contains("archive-paper-settled"),
      },
      decorativeLayersHidden: decorativeLayers.every(
        (layer) => getComputedStyle(layer).display === "none",
      ),
      pages: pages.map((page, index) => {
        const image = page.querySelector(".archive-page-image");
        const pageStyle = getComputedStyle(page);
        const imageStyle = getComputedStyle(image);
        return {
          index,
          visible: Number(pageStyle.opacity) > 0,
          current: page.classList.contains("archive-paper-current"),
          enabled: !page.disabled,
          x: numberProperty(page, "x"),
          y: numberProperty(page, "y"),
          rotation: numberProperty(page, "rotation"),
          scale: numberProperty(page, "scale"),
          zIndex: Number(pageStyle.zIndex),
          opacity: Number(pageStyle.opacity),
          rect: rect(page),
          boxShadow: pageStyle.boxShadow,
          source: image.currentSrc,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          imageFilter: imageStyle.filter,
          imageRendering: imageStyle.imageRendering,
          objectFit: imageStyle.objectFit,
        };
      }),
    };
  });
}

function samePose(page, pose) {
  return (
    Math.abs(page.x - pose.x) < 0.05 &&
    Math.abs(page.y - pose.y) < 0.05 &&
    Math.abs(page.rotation - pose.rotation) < 0.05
  );
}

function naturalPoseChain(frame) {
  const expected = [
    { x: 0, y: 0, rotation: 0 },
    { x: -9, y: -7, rotation: -2 },
    { x: 7, y: -5, rotation: 1.5 },
    { x: -13, y: 4, rotation: -3 },
    { x: 4, y: 7, rotation: 2 },
  ];
  const visible = frame.pages
    .filter((page) => page.visible)
    .sort((first, second) => first.index - second.index);
  return visible.every((page, visibleIndex) =>
    samePose(page, expected[visibleIndex]),
  );
}

function zOrderValid(frame) {
  return frame.pages
    .filter((page) => page.visible)
    .every((page, visibleIndex) => page.zIndex === 5 - visibleIndex);
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 2474, height: 1367 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openPaperStack(page);
  const frames = [await readPaperStack(page)];
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-pages-stack-desktop-2x.png"),
  });

  for (let nextIndex = 1; nextIndex < 5; nextIndex += 1) {
    await page.locator(".archive-paper-current:enabled").click();
    await page.waitForFunction(
      (expectedIndex) =>
        window.archiveExperience?.state === "COMPLETE" &&
        window.archiveExperience.currentPaperIndex === expectedIndex &&
        !window.archiveExperience.paperTransitioning,
      nextIndex,
    );
    await page.waitForTimeout(60);
    frames.push(await readPaperStack(page));
    await page.screenshot({
      path: path.join(
        OUTPUT_DIR,
        `archive-pages-after-flip-${nextIndex + 1}-desktop.png`,
      ),
    });
  }

  await page.locator(".archive-paper-current:enabled").click();
  await page.waitForFunction(() => !document.querySelector("#streetView").hidden);
  const enteredStreet = await page.evaluate(
    () => !document.querySelector("#streetView").hidden,
  );

  const result = {
    frames,
    enteredStreet,
    pageErrors,
    consoleErrors,
  };
  await context.close();
  return result;
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openPaperStack(page);
  const initial = await readPaperStack(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-pages-stack-mobile-390-2x.png"),
  });
  await page.locator(".archive-paper-current:enabled").click();
  await page.waitForFunction(
    () =>
      window.archiveExperience?.currentPaperIndex === 1 &&
      !window.archiveExperience.paperTransitioning,
  );
  const afterFlip = await readPaperStack(page);

  await context.close();
  return { initial, afterFlip, pageErrors, consoleErrors };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const desktop = await runDesktop(browser);
  const mobile = await runMobile(browser);
  await browser.close();

  const initial = desktop.frames[0];
  const allFrames = [
    ...desktop.frames,
    mobile.initial,
    mobile.afterFlip,
  ];
  const desktopFrames = desktop.frames;
  const sourceCoverage = initial.pages.map(
    (page) => page.naturalWidth / (page.rect.width * initial.viewport.dpr),
  );
  const sourceHeightCoverage = initial.pages.map(
    (page) => page.naturalHeight / (page.rect.height * initial.viewport.dpr),
  );
  const allFiveIndependent =
    initial.pages.length === 5 &&
    initial.pages.every((page) => page.index >= 0);
  const allHighResolution = initial.pages.every(
    (page) =>
      page.source.includes("/archive-page-") &&
      page.source.endsWith("-hd.png") &&
      page.naturalWidth === 2420 &&
      page.naturalHeight === 1620,
  );
  const noContentFilters = allFrames.every((frame) =>
    frame.pages.every(
      (page) =>
        page.imageFilter === "none" && page.imageRendering !== "pixelated",
    ),
  );
  const allRestStable = allFrames.every(
    (frame) =>
      frame.stack.settled &&
      frame.stack.filter === "none" &&
      frame.stack.willChange === "auto" &&
      Math.abs(frame.stack.scale - 1) < 0.001,
  );
  const stackShapeValid = desktopFrames.every(
    (frame) => naturalPoseChain(frame) && zOrderValid(frame),
  );
  const topAlwaysFlat = desktopFrames.every((frame) => {
    const current = frame.pages.find((page) => page.current);
    return (
      current &&
      Math.abs(current.x) < 0.05 &&
      Math.abs(current.y) < 0.05 &&
      Math.abs(current.rotation) < 0.05 &&
      current.zIndex === 5
    );
  });
  const nonMechanicalOffsets =
    new Set(initial.pages.slice(1).map((page) => `${page.x}:${page.y}`)).size ===
      4 &&
    new Set(initial.pages.slice(1).map((page) => page.rotation)).size === 4;
  const noOverflow =
    !initial.overflowX &&
    !mobile.initial.overflowX &&
    !mobile.afterFlip.overflowX;
  const mobileValid =
    mobile.initial.pages.length === 5 &&
    naturalPoseChain(mobile.initial) &&
    zOrderValid(mobile.initial) &&
    mobile.afterFlip.currentIndex === 1 &&
    naturalPoseChain(mobile.afterFlip) &&
    zOrderValid(mobile.afterFlip);

  const assertions = {
    fiveIndependentLayers: allFiveIndependent,
    decorativeStackLayersRemoved: initial.decorativeLayersHidden,
    highestResolutionSourcesUsed: allHighResolution,
    sourceCoversTwiceCssPixels:
      Math.min(...sourceCoverage) >= 1 &&
      Math.min(...sourceHeightCoverage) >= 1,
    contentFiltersAbsent: noContentFilters,
    stableAfterAnimation: allRestStable,
    naturalStackParameters:
      stackShapeValid &&
      topAlwaysFlat &&
      nonMechanicalOffsets,
    allFivePagesTurn: desktopFrames.length === 5,
    pageOrderAdvances:
      desktopFrames.every((frame, index) => frame.currentIndex === index),
    restackingSmoothTargets: desktopFrames.every(
      (frame) => naturalPoseChain(frame) && zOrderValid(frame),
    ),
    mobileStackPreserved: mobileValid,
    noHorizontalOverflow: noOverflow,
    storyEntryStillWorks: desktop.enteredStreet === true,
    noBrowserErrors:
      desktop.pageErrors.length === 0 &&
      desktop.consoleErrors.length === 0 &&
      mobile.pageErrors.length === 0 &&
      mobile.consoleErrors.length === 0,
  };
  const result = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    sourceCoverage,
    sourceHeightCoverage,
    desktop,
    mobile,
  };
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ assertions }, null, 2));
  if (Object.values(assertions).some((value) => !value)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
