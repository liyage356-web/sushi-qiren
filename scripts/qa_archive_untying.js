const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "output", "qa-archive-untying.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
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

async function openArchive(page, query = "") {
  await page.goto(`${PAGE_ORIGIN}index.html${query}`, {
    waitUntil: "networkidle",
  });
  await page.locator("#enterButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "CLOSED",
  );
  await page.waitForTimeout(120);
}

async function cordState(page) {
  return page.evaluate(() => {
    const upper = document.querySelector("#archiveUpperFastener");
    const lower = document.querySelector("#archiveLooseCord");
    const tie = document.querySelector("#archiveTieCord");
    const paths = [...tie.querySelectorAll(".archive-tie-stroke")];
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      state: window.archiveExperience.state,
      progress: Number(tie.dataset.unwindProgress),
      hint: document.querySelector("#archiveHint").textContent.trim(),
      tieOpacity: Number(getComputedStyle(tie).opacity),
      remainingWrapTurns: Number(tie.dataset.remainingWrapTurns),
      firstRemainingTurns: Number(tie.dataset.firstRemainingTurns),
      secondRemainingTurns: Number(tie.dataset.secondRemainingTurns),
      firstCcwTravel: Number(tie.dataset.firstCcwTravel),
      secondCcwTravel: Number(tie.dataset.secondCcwTravel),
      unwindStage: tie.dataset.unwindStage,
      svgTransform: tie.getAttribute("transform"),
      computedTransform: getComputedStyle(tie).transform,
      lowerOpacity: Number(getComputedStyle(lower).opacity),
      upperOpacity: Number(getComputedStyle(upper).opacity),
      pathCount: paths.length,
      paths: paths.map((item) => item.getAttribute("d")),
      upperParent: upper.parentElement?.id || null,
      upperRect: box(upper),
      lowerRect: box(lower),
      threadDisabled: document.querySelector("#archiveThreadButton").disabled,
      overflowX: document.documentElement.scrollWidth > innerWidth,
      stateDuration: window.archiveExperience.timeline?.duration() || 0,
    };
  });
}

async function captureProgress(browser, progress) {
  const page = await browser.newPage({
    viewport: { width: 2474, height: 1367 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openArchive(page, `?cordProgress=${progress}`);
  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "UNTYING",
  );
  await page.evaluate((targetProgress) => {
    window.archiveExperience.tieMotion.progress = targetProgress;
    window.archiveExperience.renderTieCord(targetProgress);
  }, progress);
  await page.waitForTimeout(40);
  const state = await cordState(page);
  const phase = Math.round(progress * 100)
    .toString()
    .padStart(2, "0");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `archive-untie-${phase}-desktop.png`),
  });
  if (progress === 0.38) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "archive-untie-first-loop-desktop.png"),
    });
  }
  if (progress === 0.72) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "archive-untie-loose-desktop.png"),
    });
  }
  await page.close();
  return { progress, phase, state, errors };
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
  const closed = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-closed-desktop.png"),
  });

  const startedAt = Date.now();
  await page.locator("#archiveThreadButton").click();
  const started = await cordState(page);
  await page.waitForFunction(
    () => window.archiveExperience?.state === "OPEN",
  );
  const elapsedToOpen = Date.now() - startedAt;
  const open = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-open-desktop.png"),
  });

  await page.locator("#archiveOpenButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "COMPLETE",
  );
  const complete = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-complete-desktop.png"),
  });

  await page.locator("#archiveReplayButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "CLOSED",
  );
  const replayed = await cordState(page);
  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () => window.archiveExperience?.state === "UNTYING",
  );
  const replayStarted = await cordState(page);
  const result = {
    closed,
    started,
    open,
    complete,
    replayed,
    replayStarted,
    elapsedToOpen,
    pageErrors,
    consoleErrors,
  };
  await page.close();
  return result;
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
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openArchive(page);
  const closed = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-mobile-closed-390.png"),
  });
  await page.locator("#archiveThreadButton").click();
  await page.waitForFunction(
    () =>
      window.archiveExperience?.state === "UNTYING" &&
      window.archiveExperience.tieMotion.progress >= 0.4,
  );
  const untying = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-mobile-progress-390.png"),
  });
  await page.waitForFunction(
    () => window.archiveExperience?.state === "OPEN",
  );
  const open = await cordState(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "archive-untie-mobile-open-390.png"),
  });
  await context.close();
  return { closed, untying, open, pageErrors };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const progressFrames = [];
  for (const progress of [0, 0.22, 0.38, 0.58, 0.72, 0.9, 1]) {
    progressFrames.push(await captureProgress(browser, progress));
  }
  const desktop = await runDesktop(browser);
  const mobile = await runMobile(browser);
  await browser.close();

  const closedMain = desktop.closed.paths[0] || "";
  const closedUpper = desktop.closed.paths[1] || "";
  const firstLoopFrame = progressFrames.find(
    (frame) => frame.progress === 0.38,
  );
  const secondLoopFrame = progressFrames.find(
    (frame) => frame.progress === 0.58,
  );
  const looseFrame = progressFrames.find(
    (frame) => frame.progress === 0.72,
  );
  const clearedFrame = progressFrames.find(
    (frame) => frame.progress === 0.9,
  );
  const allErrors = [
    ...progressFrames.flatMap((frame) => frame.errors),
    ...desktop.pageErrors,
    ...desktop.consoleErrors,
    ...mobile.pageErrors,
  ];
  const assertions = {
    exactDoubleLoopRestState:
      Math.abs(desktop.closed.remainingWrapTurns - 2) < 0.001 &&
      Math.abs(desktop.closed.firstRemainingTurns - 1) < 0.001 &&
      Math.abs(desktop.closed.secondRemainingTurns - 1) < 0.001,
    splitStaticLayers:
      desktop.closed.upperParent === "archiveFlapClosed" &&
      desktop.closed.pathCount === 6,
    counterClockwiseAndMonotonic:
      progressFrames.every((frame, index) => {
        if (index === 0) return true;
        const previous = progressFrames[index - 1].state;
        const current = frame.state;
        return (
          current.remainingWrapTurns <= previous.remainingWrapTurns + 0.0001 &&
          current.firstCcwTravel <= previous.firstCcwTravel + 0.0001 &&
          current.secondCcwTravel <= previous.secondCcwTravel + 0.0001
        );
      }),
    firstCoilClearsBeforeSecond:
      firstLoopFrame.state.firstRemainingTurns < 0.12 &&
      firstLoopFrame.state.secondRemainingTurns > 0.95,
    twoLoopsReleaseSequentially:
      secondLoopFrame.state.firstRemainingTurns < 0.001 &&
      looseFrame.state.secondRemainingTurns < 0.35 &&
      clearedFrame.state.remainingWrapTurns < 0.001,
    pivotsRemainFixed:
      progressFrames
        .slice(1)
        .every((frame) => {
          const upper = frame.state.upperRect;
          const lower = frame.state.lowerRect;
          const reference = progressFrames[1].state;
          return (
            ["left", "top", "width", "height"].every(
              (key) =>
                Math.abs(upper[key] - reference.upperRect[key]) < 0.01 &&
                Math.abs(lower[key] - reference.lowerRect[key]) < 0.01,
            )
          );
        }),
    pathNotWholeSvgRotation:
      progressFrames.every(
        (frame) =>
          frame.state.svgTransform === null &&
          (frame.state.computedTransform === "none" ||
            frame.state.computedTransform === "matrix(1, 0, 0, 1, 0, 0)"),
      ),
    closedCordRestored:
      closedMain === desktop.replayed.paths[0] &&
      closedUpper === desktop.replayed.paths[1] &&
      desktop.replayed.tieOpacity === 1 &&
      desktop.replayed.upperOpacity === 1 &&
      desktop.replayed.lowerOpacity === 1,
    lowerHitHotspotDisabled:
      desktop.started.state === "UNTYING" &&
      desktop.started.threadDisabled,
    firstLoopUnwraps:
      firstLoopFrame.state.paths[0] !== closedMain &&
      firstLoopFrame.state.unwindStage === "first-loop",
    twoLoopsLoose:
      looseFrame.state.paths[0] !== firstLoopFrame.state.paths[0] &&
      looseFrame.state.secondRemainingTurns < 0.35,
    delayedFlapOpen:
      desktop.elapsedToOpen >= 4000 &&
      desktop.elapsedToOpen <= 5000 &&
      desktop.open.state === "OPEN",
    dynamicCordCleared:
      desktop.open.tieOpacity === 0 &&
      desktop.open.lowerOpacity === 0 &&
      desktop.open.upperOpacity === 0,
    openStatePreserved:
      desktop.open.state === "OPEN" &&
      desktop.open.hint.includes("横置") &&
      desktop.complete.state === "COMPLETE",
    replayCanUntieAgain:
      desktop.replayStarted.state === "UNTYING" &&
      desktop.replayStarted.progress < 0.05,
    debugFramesRendered: progressFrames.every(
      (frame) =>
        frame.state.pathCount === 6 &&
        frame.state.paths.every((value) => value?.includes("Q")),
    ),
    mobileInteraction:
      mobile.closed.state === "CLOSED" &&
      mobile.untying.state === "UNTYING" &&
      mobile.open.state === "OPEN" &&
      !mobile.closed.overflowX &&
      !mobile.open.overflowX,
    noBrowserErrors: allErrors.length === 0,
  };

  const result = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    progressFrames,
    desktop,
    mobile,
  };
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ assertions, elapsedToOpen: desktop.elapsedToOpen }, null, 2));
  if (Object.values(assertions).some((value) => !value)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
