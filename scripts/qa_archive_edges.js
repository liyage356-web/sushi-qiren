const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "output", "qa-archive-edges.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Users\\liyage\\AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = browserCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) {
    throw new Error("No installed Edge or Chrome executable found.");
  }
  return executable;
}

async function openArchive(page) {
  await page.goto(`${PAGE_ORIGIN}index.html`, { waitUntil: "networkidle" });
  await page.locator("#enterButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "CLOSED",
  );
  await page.waitForTimeout(220);
}

async function readArchiveState(page) {
  return page.evaluate(() => {
    const folder = document.querySelector("#archiveFolder");
    const back = document.querySelector("#archiveBagBack");
    const body = document.querySelector(".archive-bag-body");
    const closedFlap = document.querySelector("#archiveFlapClosed");
    const openFlap = document.querySelector("#archiveFlapOpen");
    const openFlapImage = openFlap.querySelector("img");
    const openThread = document.querySelector("#archiveOpenThread");
    const openThreadPath = openThread.querySelector("path");
    const closedImage = closedFlap.querySelector("img");
    const openImage = openFlap.querySelector("img");
    const paperStack = document.querySelector("#archivePaperStack");
    const currentPaper = document.querySelector(".archive-paper-current");
    const hint = document.querySelector("#archiveHint");
    const stage = document.querySelector(".archive-stage");
    const box = (element) => {
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
    const backStyle = getComputedStyle(back);
    const folderStyle = getComputedStyle(folder);

    return {
      state: window.archiveExperience.state,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      rects: {
        stage: box(stage),
        folder: box(folder),
        back: box(back),
        body: box(body),
      },
      backStyle: {
        backgroundColor: backStyle.backgroundColor,
        backgroundImage: backStyle.backgroundImage,
        borderTopWidth: backStyle.borderTopWidth,
        borderRightWidth: backStyle.borderRightWidth,
        borderBottomWidth: backStyle.borderBottomWidth,
        borderLeftWidth: backStyle.borderLeftWidth,
        boxShadow: backStyle.boxShadow,
      },
      folderFilter: folderStyle.filter,
      body: {
        source: body.currentSrc,
        naturalWidth: body.naturalWidth,
        naturalHeight: body.naturalHeight,
        objectFit: getComputedStyle(body).objectFit,
        loaded: body.complete && body.naturalWidth > 0,
      },
      flaps: {
        closedOpacity: Number(getComputedStyle(closedFlap).opacity),
        openOpacity: Number(getComputedStyle(openFlap).opacity),
        closedLoaded: closedImage.complete && closedImage.naturalWidth > 0,
        openLoaded: openImage.complete && openImage.naturalWidth > 0,
        openRect: box(openFlap),
        openSource: openFlapImage.currentSrc,
        openNaturalWidth: openFlapImage.naturalWidth,
        openNaturalHeight: openFlapImage.naturalHeight,
      },
      openThread: {
        loaded: openThread.isConnected,
        rect: box(openThread),
        pathRect: box(openThreadPath),
        path: openThreadPath.getAttribute("d"),
      },
      paper: {
        visible: getComputedStyle(paperStack).visibility !== "hidden",
        opacity: Number(getComputedStyle(paperStack).opacity),
        rect: box(paperStack),
        currentPage: currentPaper?.dataset.paperIndex || null,
      },
      transform: folderStyle.transform,
      hint: hint.textContent.trim(),
      overflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

async function runDesktop(browser) {
  const page = await browser.newPage({
    viewport: { width: 2474, height: 1367 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openArchive(page);
  const closed = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-clean.png"),
  });

  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "OPEN",
  );
  await page.waitForTimeout(120);
  const open = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-open.png"),
  });

  await page.locator("#archiveOpenButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "ROTATING",
  );
  await page.waitForTimeout(320);
  const rotating = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-rotating.png"),
  });
  await page.waitForFunction(
    () => window.archiveExperience?.state === "PAPER_SLIDING",
  );
  await page.waitForTimeout(420);
  const paperSliding = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-sliding.png"),
  });
  await page.waitForFunction(
    () => window.archiveExperience?.state === "COMPLETE",
  );
  const complete = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-complete.png"),
  });

  await page.locator("#archiveReplayButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "CLOSED",
  );
  const replay = await readArchiveState(page);
  const pageResult = {
    closed,
    open,
    rotating,
    paperSliding,
    complete,
    replay,
    pageErrors,
    consoleErrors,
  };
  await page.close();
  return pageResult;
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
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
  await openArchive(page);
  const closed = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-mobile-390.png"),
  });
  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "OPEN",
  );
  await page.waitForTimeout(120);
  const open = await readArchiveState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-edge-fixed-mobile-open-390.png"),
  });
  await page.locator("#archiveCloseButton").click();
  const closedDialog =
    (await page.locator("#archiveModal").getAttribute("hidden")) !== null;
  await context.close();
  return { closed, open, closedDialog, pageErrors, consoleErrors };
}

function isClose(a, b, tolerance = 0.6) {
  return Math.abs(a - b) <= tolerance;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const desktop = await runDesktop(browser);
  const mobile = await runMobile(browser);
  await browser.close();

  const closedRect = desktop.closed.rects;
  const cleanLayer =
    desktop.closed.backStyle.backgroundColor === "rgba(0, 0, 0, 0)" &&
    desktop.closed.backStyle.backgroundImage === "none" &&
    [
      desktop.closed.backStyle.borderTopWidth,
      desktop.closed.backStyle.borderRightWidth,
      desktop.closed.backStyle.borderBottomWidth,
      desktop.closed.backStyle.borderLeftWidth,
    ].every((value) => value === "0px") &&
    desktop.closed.backStyle.boxShadow === "none";
  const alignedLayers = [
    "left",
    "top",
    "width",
    "height",
  ].every(
    (key) =>
      isClose(closedRect.back[key], closedRect.folder[key]) &&
      isClose(closedRect.folder[key], closedRect.body[key]),
  );
  const assertions = {
    archiveOpens:
      desktop.closed.state === "CLOSED" &&
      desktop.closed.rects.folder.width > 0 &&
      desktop.closed.rects.folder.height > 0,
    cleanTransformShell: cleanLayer,
    alignedTransformShell: alignedLayers,
    cleanBodyAsset:
      desktop.closed.body.loaded &&
      desktop.closed.body.source.endsWith("archive-bag-body-clean.png") &&
      desktop.closed.body.naturalWidth === 1656 &&
      desktop.closed.body.naturalHeight === 2276 &&
      desktop.closed.body.objectFit === "fill",
    naturalFolderShadow:
      desktop.closed.folderFilter.includes("drop-shadow"),
    flapAssetsLoaded:
      desktop.closed.flaps.closedLoaded && desktop.closed.flaps.openLoaded,
    bodyLayerAligned:
      isClose(desktop.open.rects.body.left, desktop.open.rects.folder.left) &&
      isClose(desktop.open.rects.body.top, desktop.open.rects.folder.top) &&
      isClose(desktop.open.rects.body.width, desktop.open.rects.folder.width) &&
      isClose(desktop.open.rects.body.height, desktop.open.rects.folder.height),
    cleanOpenFlapShape:
      desktop.open.flaps.openSource.endsWith("archive-flap-open-clean.png") &&
      desktop.open.flaps.openNaturalWidth === 1656 &&
      desktop.open.flaps.openNaturalHeight === 480 &&
      isClose(desktop.open.flaps.openRect.width, desktop.open.rects.folder.width),
    openFlapProportion:
      desktop.open.flaps.openRect.height / desktop.open.rects.body.width >
        0.27 &&
      desktop.open.flaps.openRect.height / desktop.open.rects.body.width < 0.31,
    connectedFlapAndBody:
      desktop.open.flaps.openRect.bottom >=
        desktop.open.rects.body.top + 2 &&
      desktop.open.flaps.openRect.top < desktop.open.rects.body.top,
    openThreadShape:
      desktop.open.openThread.pathRect.width /
        desktop.open.rects.body.width > 0.55 &&
      desktop.open.openThread.pathRect.height /
        desktop.open.rects.body.width > 0.32 &&
      desktop.open.openThread.path.includes("C"),
    cordInteraction:
      desktop.open.state === "OPEN" &&
      desktop.open.flaps.closedOpacity === 0 &&
      desktop.open.flaps.openOpacity === 1 &&
      desktop.open.hint.includes("横置"),
    rotationInteraction:
      desktop.rotating.state === "ROTATING" &&
      desktop.rotating.transform !== "none" &&
      desktop.complete.state === "COMPLETE",
    paperInteraction:
      desktop.complete.hint.includes("轻触纸页") &&
      desktop.complete.rects.folder.width > 0,
    paperSlides:
      desktop.paperSliding.state === "PAPER_SLIDING" &&
      desktop.paperSliding.paper.visible &&
      desktop.paperSliding.paper.opacity > 0 &&
      desktop.paperSliding.paper.rect.width > 0 &&
      desktop.paperSliding.paper.currentPage === "0",
    replayInteraction:
      desktop.replay.state === "CLOSED" &&
      desktop.replay.flaps.closedOpacity === 1 &&
      desktop.replay.flaps.openOpacity === 0,
    mobileClosed:
      mobile.closed.state === "CLOSED" &&
      mobile.closed.backStyle.backgroundColor === "rgba(0, 0, 0, 0)" &&
      !mobile.closed.overflowX,
    mobileOpen:
      mobile.open.state === "OPEN" &&
      mobile.open.backStyle.backgroundColor === "rgba(0, 0, 0, 0)" &&
      !mobile.open.overflowX,
    closeControl: mobile.closedDialog,
    noPageErrors:
      desktop.pageErrors.length === 0 &&
      mobile.pageErrors.length === 0 &&
      desktop.consoleErrors.length === 0 &&
      mobile.consoleErrors.length === 0,
  };

  const result = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    desktop,
    mobile,
  };
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  if (Object.values(assertions).some((value) => !value)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
