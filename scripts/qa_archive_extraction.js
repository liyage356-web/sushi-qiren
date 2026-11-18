const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");
const sharp = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "output", "qa-archive-extraction.json");
const PROGRESS_POINTS = [0, 0.25, 0.5, 0.75];
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

async function openArchive(page, query = "") {
  await page.goto(`${PAGE_ORIGIN}index.html${query}`, {
    waitUntil: "networkidle",
  });
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
    () => window.archiveExperience?.state === "PAPER_SLIDING",
    null,
    { timeout: 5000 },
  );
  await page.locator("#archiveHorizontalAsset img").evaluate(
    async (image) => image.decode(),
  );
  await page.waitForTimeout(120);
}

async function readFrame(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        centerX: box.left + box.width / 2,
        centerY: box.top + box.height / 2,
      };
    };
    const paperWindow = document.querySelector("#archivePaperWindow");
    const folder = document.querySelector("#archiveFolder");
    const horizontalAsset = document.querySelector(
      "#archiveHorizontalAsset",
    );
    const horizontalImage = horizontalAsset.querySelector("img");
    const horizontalAssetRect = rect(horizontalAsset);
    const horizontalMouthRight =
      horizontalAssetRect.left +
      horizontalAssetRect.width * (2675 / 3352);
    const pages = [
      ...document.querySelectorAll(".archive-paper-sheet"),
    ].map((page, index) => ({
      index,
      ...rect(page),
      x: Number(window.gsap.getProperty(page, "x")),
      y: Number(window.gsap.getProperty(page, "y")),
      rotation: Number(window.gsap.getProperty(page, "rotation")),
      opacity: Number(getComputedStyle(page).opacity),
      zIndex: Number(getComputedStyle(page).zIndex),
    }));
    const visiblePages = pages.filter((page) => page.opacity > 0.01);
    return {
      state: window.archiveExperience.state,
      timelineTime:
        window.archiveExperience.timeline?.time() ?? null,
      timelineDuration:
        window.archiveExperience.timeline?.duration() ?? null,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      folder: rect(folder),
      paperWindow: rect(paperWindow),
      paperWindowClip: getComputedStyle(paperWindow).clipPath,
      paperMouthX: Number(paperWindow.dataset.paperMouthX),
      paperPocketClip: paperWindow.dataset.paperPocketClip || null,
      paperContent: {
        left: Math.min(...visiblePages.map((page) => page.left)),
        top: Math.min(...visiblePages.map((page) => page.top)),
        right: Math.max(...visiblePages.map((page) => page.right)),
        bottom: Math.max(...visiblePages.map((page) => page.bottom)),
      },
      pages,
      layerOrder: {
        back: Number(
          getComputedStyle(document.querySelector("#archiveBagBack")).zIndex,
        ),
        paper: Number(getComputedStyle(paperWindow).zIndex),
        front: Number(getComputedStyle(folder).zIndex),
      },
      horizontalAsset: {
        rect: horizontalAssetRect,
        mouthRight: horizontalMouthRight,
        source: horizontalImage.currentSrc,
        naturalWidth: horizontalImage.naturalWidth,
        naturalHeight: horizontalImage.naturalHeight,
        objectFit: getComputedStyle(horizontalImage).objectFit,
        imageFilter: getComputedStyle(horizontalImage).filter,
        visibility: getComputedStyle(horizontalAsset).visibility,
        opacity: Number(getComputedStyle(horizontalAsset).opacity),
        sourceBounds: horizontalAsset.dataset.sourceBounds,
      },
      legacyLayersHidden:
        getComputedStyle(folder).visibility === "hidden" &&
        getComputedStyle(document.querySelector("#archiveBagBack")).visibility ===
          "hidden",
    };
  });
}

async function screenshotDifference(page, filePath, mouthRight) {
  const visible = await page.screenshot();
  await page.evaluate(() => {
    document.querySelector("#archivePaperStack").style.visibility = "hidden";
  });
  await page.waitForTimeout(60);
  const hidden = await page.screenshot();
  await page.evaluate(() => {
    document.querySelector("#archivePaperStack").style.visibility = "";
  });

  fs.writeFileSync(filePath, visible);
  const visibleImage = await sharp(visible)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const hiddenImage = await sharp(hidden)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = visibleImage.info.width;
  const height = visibleImage.info.height;
  const scale = width / (await page.evaluate(() => innerWidth));
  const cutoff = Math.max(0, Math.floor(mouthRight * scale) - 2);
  let allChangedPixels = 0;
  let changedPixelsLeftOfMouth = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const changed =
        Math.abs(visibleImage.data[offset] - hiddenImage.data[offset]) > 1 ||
        Math.abs(
          visibleImage.data[offset + 1] - hiddenImage.data[offset + 1],
        ) > 1 ||
        Math.abs(
          visibleImage.data[offset + 2] - hiddenImage.data[offset + 2],
        ) > 1 ||
        Math.abs(
          visibleImage.data[offset + 3] - hiddenImage.data[offset + 3],
        ) > 1;
      if (!changed) continue;
      allChangedPixels += 1;
      if (x < cutoff) changedPixelsLeftOfMouth += 1;
    }
  }

  return {
    allChangedPixels,
    changedPixelsLeftOfMouth,
    pixelWidth: width,
    pixelHeight: height,
  };
}

async function captureProgress(browser, viewport, progress) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openArchive(page, `?paperProgress=${progress}`);
  const frame = await readFrame(page);
  const filename = `archive-extraction-${viewport.name}-${Math.round(
    progress * 100,
  )}.png`;
  const pixels = await screenshotDifference(
    page,
    path.join(OUTPUT_DIR, filename),
    frame.horizontalAsset.mouthRight,
  );
  await context.close();
  return {
    progress: Math.round(progress * 100),
    screenshot: filename,
    geometry: frame,
    pixels,
    pageErrors,
    consoleErrors,
  };
}

async function captureComplete(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openArchive(page);
  await page.waitForFunction(
    () => window.archiveExperience?.state === "COMPLETE",
  );
  const filename = `archive-extraction-${viewport.name}-100.png`;
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename) });
  const frame = await readFrame(page);

  await page.locator("#archiveReplayButton").click();
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
  const replayCompleted = true;

  for (let nextIndex = 1; nextIndex < 5; nextIndex += 1) {
    await page.locator(".archive-paper-current:enabled").click();
    await page.waitForFunction(
      (index) =>
        window.archiveExperience?.currentPaperIndex === index &&
        !window.archiveExperience.paperTransitioning,
      nextIndex,
    );
  }
  await page.locator(".archive-paper-current:enabled").click();
  await page.waitForFunction(
    () => !document.querySelector("#streetView").hidden,
  );
  const enteredStreet = true;

  await context.close();
  return {
    progress: 100,
    screenshot: filename,
    geometry: frame,
    replayCompleted,
    enteredStreet,
    pageErrors,
    consoleErrors,
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const viewports = [
    {
      name: "desktop",
      width: 2474,
      height: 1367,
      dpr: 1,
      mobile: false,
    },
    {
      name: "mobile",
      width: 390,
      height: 844,
      dpr: 2,
      mobile: true,
    },
  ];
  const results = {};

  for (const viewport of viewports) {
    const frames = [];
    for (const progress of PROGRESS_POINTS) {
      frames.push(await captureProgress(browser, viewport, progress));
    }
    frames.push(await captureComplete(browser, viewport));
    results[viewport.name] = frames;
  }
  await browser.close();

  const allFrames = [...results.desktop, ...results.mobile];
  const extractionFrames = {
    desktop: results.desktop.slice(0, 4),
    mobile: results.mobile.slice(0, 4),
  };
  const everyExtractionFrameClipped = Object.values(extractionFrames)
    .flat()
    .every(
      (frame) =>
        frame.geometry.paperWindowClip.startsWith("inset(") &&
        frame.geometry.paperPocketClip === frame.geometry.paperWindowClip &&
        Number.isFinite(frame.geometry.paperMouthX),
    );
  const noInitialRightExposure = Object.values(extractionFrames).every(
    (frames) =>
      frames[0].geometry.paperContent.right <
      frames[0].geometry.horizontalAsset.mouthRight - 1,
  );
  const noInitialVisiblePaper = Object.values(extractionFrames).every(
    (frames) => frames[0].pixels.allChangedPixels <= 2,
  );
  const onlyRightOfMouthChanges = Object.values(extractionFrames)
    .flat()
    .every((frame) => frame.pixels.changedPixelsLeftOfMouth <= 1);
  const fullHorizontalAssetUsed = Object.values(extractionFrames)
    .flat()
    .every((frame) => {
      const asset = frame.geometry.horizontalAsset;
      const coverWidth =
        (asset.rect.width * (2419 - 22)) / 3352;
      const coverCenterX =
        asset.rect.left + asset.rect.width * ((22 + 2419) / 2 / 3352);
      const bodyCenterY =
        asset.rect.top + asset.rect.height * ((12 + 1631) / 2 / 1719);
      const mobileLayoutIsSafe =
        asset.rect.left >= 8.5 &&
        asset.rect.right <= frame.geometry.viewport.width - 8.5;
      return (
        asset.source.endsWith(
          "/assets/archive/archive-horizontal-full.png",
        ) &&
        asset.naturalWidth === 3352 &&
        asset.naturalHeight === 1719 &&
        asset.objectFit === "contain" &&
        asset.imageFilter === "none" &&
        asset.visibility === "visible" &&
        asset.opacity === 1 &&
        asset.sourceBounds === "22,2419,12,1631" &&
        frame.geometry.legacyLayersHidden &&
        Math.abs(asset.rect.width / asset.rect.height - 3352 / 1719) <
          0.001 &&
        Math.abs(bodyCenterY - frame.geometry.folder.centerY) < 1 &&
        (frame.geometry.viewport.width <= 760
          ? mobileLayoutIsSafe
          : Math.abs(coverWidth - frame.geometry.folder.width) < 1 &&
            Math.abs(coverCenterX - frame.geometry.folder.centerX) < 1)
      );
    });
  const monotonicTrajectory = Object.values(extractionFrames).every((frames) =>
    frames.every(
      (frame, index) =>
        index === 0 ||
        frame.geometry.paperContent.right >
          frames[index - 1].geometry.paperContent.right,
    ),
  );
  const stackMovesAsOne = Object.values(extractionFrames).every((frames) => {
    const first = frames[0].geometry.pages;
    const second = frames[1].geometry.pages;
    const deltas = second.map(
      (page, index) => page.centerX - first[index].centerX,
    );
    return Math.max(...deltas) - Math.min(...deltas) < 0.6;
  });
  const layerOrderPreserved = Object.values(extractionFrames)
    .flat()
    .every(
      (frame) =>
        frame.geometry.layerOrder.back < frame.geometry.layerOrder.paper &&
        frame.geometry.layerOrder.paper < frame.geometry.layerOrder.front,
    );
  const completeFrames = [results.desktop[4], results.mobile[4]];
  const readingPresentationPreserved = completeFrames.every(
    (frame) =>
      frame.geometry.state === "COMPLETE" &&
      frame.geometry.paperWindowClip === "none" &&
      frame.geometry.layerOrder.paper === 30 &&
      frame.geometry.pages.filter((page) => page.opacity > 0.01).length === 5,
  );
  const noBrowserErrors = allFrames.every(
    (frame) =>
      frame.pageErrors.length === 0 && frame.consoleErrors.length === 0,
  );

  const assertions = {
    everyExtractionFrameClipped,
    noInitialRightExposure,
    noInitialVisiblePaper,
    onlyRightOfMouthChanges,
    fullHorizontalAssetUsed,
    monotonicTrajectory,
    stackMovesAsOne,
    layerOrderPreserved,
    readingPresentationPreserved,
    replayPreserved:
      results.desktop[4].replayCompleted === true &&
      results.mobile[4].replayCompleted === true,
    fivePageTurnPreserved: results.desktop[4].enteredStreet === true,
    mobileExtractionPreserved:
      results.mobile[0].geometry.viewport.width === 390 &&
      results.mobile[0].geometry.viewport.dpr === 2,
    noBrowserErrors,
  };
  const result = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    desktop: results.desktop,
    mobile: results.mobile,
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
