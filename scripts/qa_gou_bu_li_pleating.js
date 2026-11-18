const fs = require("node:fs");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const OUTPUT_DIR = "C:\\Users\\liyage\\Documents\\ChatGPT\\俗世奇人\\";
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
  if (!executable) throw new Error("No installed Edge or Chrome executable found.");
  return executable;
}

async function openPleating(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    window.gouBuliCraft.skipMixing();
    await window.gouBuliCraft.showStage("pleating", { animate: false });
  });
  await page.locator("#gbcPleatingLayer").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document.querySelector(
        "[data-gbc-pleat-frame].is-visible",
      )?.complete === true,
  );
  await page.waitForTimeout(180);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas");
    const layer = document.querySelector("#gbcPleatingLayer");
    const visibleFrames = [
      ...document.querySelectorAll("[data-gbc-pleat-frame].is-visible"),
    ];
    const frame = visibleFrames[0];
    const hotspot = document.querySelector("#gbcPleatHotspot");
    const next = document.querySelector("#gbcPleatNextButton");
    const replay = document.querySelector("#gbcPleatReplayButton");
    const reveal = document.querySelector("#gbcPleatReveal");
    const revealImage = document.querySelector("#gbcPleatRevealImage");
    const revealContinue = document.querySelector(
      "#gbcPleatRevealContinue",
    );
    const progress = document.querySelector("#gbcPleatProgressWrap");
    const canvasRect = canvas.getBoundingClientRect();
    const inside = (element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= canvasRect.left - 1 &&
        rect.top >= canvasRect.top - 1 &&
        rect.right <= canvasRect.right + 1 &&
        rect.bottom <= canvasRect.bottom + 1
      );
    };
    const hotspotRect = hotspot.getBoundingClientRect();
    return {
      state: window.gouBuliCraft.getState(),
      layerCount: layer.dataset.count,
      layerBusy: layer.getAttribute("aria-busy"),
      layerClasses: layer.className,
      frame: {
        source: frame?.getAttribute("src") || "",
        loaded: Boolean(frame?.complete && frame.naturalWidth > 0),
        visibleCount: visibleFrames.length,
      },
      progress: {
        count: document
          .querySelector("#gbcPleatProgressCount")
          .textContent.trim(),
        now: progress.getAttribute("aria-valuenow"),
        max: progress.getAttribute("aria-valuemax"),
        width: Number.parseFloat(
          getComputedStyle(
            document.querySelector("#gbcPleatProgressFill"),
          ).width,
        ),
      },
      guide: {
        counter: document
          .querySelector("#gbcPleatStepCounter")
          .textContent.trim(),
        title: document
          .querySelector("#gbcPleatStepTitle")
          .textContent.trim(),
        copy: document.querySelector("#gbcPleatStepCopy").textContent.trim(),
        feedback: document
          .querySelector("#gbcPleatFeedback")
          .textContent.trim(),
        hint: document.querySelector("#gbcStageHint").textContent.trim(),
      },
      controls: {
        hotspotVisible:
          !hotspot.hidden && getComputedStyle(hotspot).display !== "none",
        hotspotDisabled: hotspot.disabled,
        hotspotLabel: hotspot.getAttribute("aria-label"),
        hotspotInsideCanvas: inside(hotspot),
        hotspotWidthRatio: hotspotRect.width / canvasRect.width,
        hotspotHeightRatio: hotspotRect.height / canvasRect.height,
        nextVisible: !next.hidden && getComputedStyle(next).display !== "none",
        replayVisible:
          !replay.hidden && getComputedStyle(replay).display !== "none",
        nextInsideCanvas: inside(next),
        replayInsideCanvas: inside(replay),
        nextHeight: next.getBoundingClientRect().height,
        replayHeight: replay.getBoundingClientRect().height,
        hotspotMinDimension: Math.min(hotspotRect.width, hotspotRect.height),
        fallbackHidden: document.querySelector("#gbcPleatingFallback").hidden,
      },
      reveal: {
        visible:
          !reveal.hidden && getComputedStyle(reveal).display !== "none",
        source: revealImage.getAttribute("src") || "",
        loaded: Boolean(
          revealImage.complete && revealImage.naturalWidth > 0,
        ),
        buttonVisible:
          !revealContinue.hidden &&
          getComputedStyle(revealContinue).display !== "none",
        buttonInsideCanvas: inside(revealContinue),
        buttonHeight: revealContinue.getBoundingClientRect().height,
      },
      canvas: {
        width: canvasRect.width,
        height: canvasRect.height,
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      },
    };
  });
}

async function clickRing(page, useTouch = false) {
  const box = await page.locator("#gbcPleatHotspot").boundingBox();
  if (!box) throw new Error("Pleating hotspot has no bounding box.");
  const x = box.x + box.width * 0.08;
  const y = box.y + box.height * 0.5;
  if (useTouch) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y);
  }
}

async function waitForPleat(page, expectedCount) {
  await page.waitForFunction(
    (count) => {
      const state = window.gouBuliCraft.getState();
      return (
        state.pleating.count === count &&
        state.pleating.busy === false
      );
    },
    expectedCount,
  );
}

async function collectFrameSources(page, counts) {
  const samples = {};
  let current = await page.evaluate(
    () => window.gouBuliCraft.getState().pleating.count,
  );
  for (const target of counts) {
    while (current < target) {
      await clickRing(page, false);
      current += 1;
      await waitForPleat(page, current);
    }
    if (target === 18) await page.waitForTimeout(480);
    samples[target] = await snapshot(page);
    await page.locator(".gbc-canvas").screenshot({
      path: `${OUTPUT_DIR}gou-bu-li-pleating-${String(target).padStart(2, "0")}-desktop.png`,
    });
  }
  return samples;
}

async function runDesktop(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) =>
    errors.push(`desktop pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`desktop console: ${message.text()}`);
    }
  });

  await openPleating(page);
  results.desktopInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-pleating-initial-desktop.png`,
  });

  const center = await page.locator("#gbcPleatHotspot").boundingBox();
  await page.mouse.click(
    center.x + center.width / 2,
    center.y + center.height / 2,
  );
  await page.waitForTimeout(80);
  results.centerRejected = await page.evaluate(() => ({
    count: window.gouBuliCraft.getState().pleating.count,
    feedback: document.querySelector("#gbcPleatFeedback").textContent.trim(),
  }));

  await clickRing(page);
  results.desktopImmediate = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState(),
    disabled: document.querySelector("#gbcPleatHotspot").disabled,
  }));
  await page.mouse.click(
    center.x + center.width * 0.08,
    center.y + center.height / 2,
  );
  await page.waitForTimeout(80);
  results.rapidSecondClickCount = await page.evaluate(
    () => window.gouBuliCraft.getState().pleating.count,
  );
  await waitForPleat(page, 1);
  results.desktopAfterFirst = await snapshot(page);

  await clickRing(page);
  await waitForPleat(page, 2);
  results.desktopAfterSecond = await snapshot(page);
  await clickRing(page);
  await waitForPleat(page, 3);
  results.desktopAfterThird = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-pleating-03-desktop.png`,
  });

  results.frameSamples = await collectFrameSources(
    page,
    [6, 9, 12, 15, 18],
  );
  results.desktopComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-pleating-complete-desktop.png`,
  });

  await page.evaluate(() => {
    document.querySelector("#gbcPleatHotspot").click();
  });
  await page.waitForTimeout(80);
  results.countAfterCompletionAttempt = await page.evaluate(
    () => window.gouBuliCraft.getState().pleating.count,
  );

  await page.locator("#gbcPleatRevealContinue").click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "steaming",
  );
  await page.waitForTimeout(600);
  results.nextStageState = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );

  await page.evaluate(async () =>
    window.gouBuliCraft.showStage("pleating", { animate: false }),
  );
  await page.locator("#gbcPleatReplayButton").click();
  await page.waitForTimeout(80);
  results.desktopReplay = await snapshot(page);
  await page.close();
}

async function runMobile(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  page.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });

  await openPleating(page);
  results.mobileInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-pleating-initial-mobile-390.png`,
  });
  for (let count = 1; count <= 18; count += 1) {
    await clickRing(page, true);
    await waitForPleat(page, count);
  }
  await page.waitForTimeout(480);
  results.mobileComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-pleating-complete-mobile-390.png`,
  });
  await page.close();
}

async function runReducedMotion(browser, results, errors) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) =>
    errors.push(`reduced-motion pageerror: ${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`reduced-motion console: ${message.text()}`);
    }
  });
  await openPleating(page);
  const startedAt = Date.now();
  for (let count = 1; count <= 18; count += 1) {
    await clickRing(page);
    await waitForPleat(page, count);
  }
  results.reducedMotion = {
    duration: Date.now() - startedAt,
    state: await page.evaluate(() => window.gouBuliCraft.getState()),
  };
  await page.close();
}

async function runMissingAssetFallback(browser, results) {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  await page.route("**/pleat-*.webp", (route) => route.abort());
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.evaluate(async () => {
    window.gouBuliCraft.skipMixing();
    await window.gouBuliCraft.showStage("pleating", { animate: false });
  });
  await page.waitForFunction(
    () =>
      !document.querySelector("#gbcPleatingFallback").hidden,
  );
  results.missingAssetFallback = await page.evaluate(() => ({
    fallbackVisible: !document.querySelector("#gbcPleatingFallback").hidden,
    fallbackText: document
      .querySelector("#gbcPleatingFallback")
      .textContent.trim(),
    hotspotDisabled: document.querySelector("#gbcPleatHotspot").disabled,
    guideTitle: document.querySelector("#gbcPleatStepTitle").textContent.trim(),
  }));
  await page.close();
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = {};
  const errors = [];

  try {
    await runDesktop(browser, results, errors);
    await runMobile(browser, results, errors);
    await runReducedMotion(browser, results, errors);
    await runMissingAssetFallback(browser, results);
  } finally {
    await browser.close();
  }

  const expectedSources = {
    0: "pleat-00.webp",
    3: "pleat-03.webp",
    6: "pleat-06.webp",
    9: "pleat-09.webp",
    12: "pleat-12.webp",
    15: "pleat-15.webp",
    18: "pleat-18.webp",
  };
  const sampleSourcesMatch = [
    [6, 6],
    [9, 9],
    [12, 12],
    [15, 15],
    [18, 18],
  ].every(([count, sourceCount]) =>
    results.frameSamples[count].frame.source.endsWith(
      expectedSources[sourceCount],
    ),
  );

  results.assertions = {
    desktopInitial:
      results.desktopInitial.state.phase === "pleating" &&
      results.desktopInitial.state.pleating.count === 0 &&
      results.desktopInitial.frame.source.endsWith(expectedSources[0]) &&
      results.desktopInitial.frame.loaded &&
      results.desktopInitial.frame.visibleCount === 1 &&
      results.desktopInitial.progress.count === "0 / 18" &&
      results.desktopInitial.progress.now === "0" &&
      results.desktopInitial.progress.max === "18" &&
      results.desktopInitial.controls.hotspotVisible &&
      results.desktopInitial.controls.fallbackHidden &&
      !results.desktopInitial.controls.nextVisible,
    locatorIsLocalRing:
      results.desktopInitial.controls.hotspotInsideCanvas &&
      results.desktopInitial.controls.hotspotWidthRatio < 0.3 &&
      results.desktopInitial.controls.hotspotHeightRatio < 0.5 &&
      results.centerRejected.count === 0 &&
      results.centerRejected.feedback.includes("外沿"),
    oneClickOnePleat:
      results.desktopImmediate.state.pleating.count === 1 &&
      results.desktopImmediate.state.pleating.busy &&
      results.desktopImmediate.disabled &&
      results.rapidSecondClickCount === 1 &&
      results.desktopAfterFirst.state.pleating.count === 1,
    firstTwoKeepInitialFrame:
      results.desktopAfterFirst.frame.source.endsWith(expectedSources[0]) &&
      results.desktopAfterSecond.state.pleating.count === 2 &&
      results.desktopAfterSecond.frame.source.endsWith(expectedSources[0]),
    thirdCrossesFrame:
      results.desktopAfterThird.state.pleating.count === 3 &&
      results.desktopAfterThird.frame.source.endsWith(expectedSources[3]) &&
      results.desktopAfterThird.frame.loaded &&
      results.desktopAfterThird.frame.visibleCount === 1,
    frameSequence: sampleSourcesMatch,
    exactlyEighteen:
      results.desktopComplete.state.pleating.count === 18 &&
      results.desktopComplete.state.completed.pleating &&
      results.desktopComplete.state.pleating.revealPending &&
      results.desktopComplete.frame.source.endsWith(expectedSources[18]) &&
      results.desktopComplete.progress.count === "18 / 18" &&
      results.desktopComplete.progress.now === "18" &&
      !results.desktopComplete.controls.hotspotVisible &&
      results.desktopComplete.guide.title ===
        "十八道褶，捏出一朵花",
    pleatRevealMoment:
      results.desktopComplete.reveal.visible &&
      results.desktopComplete.reveal.source.endsWith(
        "pleat-hand-reveal.png",
      ) &&
      results.desktopComplete.reveal.loaded &&
      results.desktopComplete.reveal.buttonVisible &&
      results.desktopComplete.reveal.buttonInsideCanvas,
    cannotExceedEighteen: results.countAfterCompletionAttempt === 18,
    nextStageUnlocked:
      results.nextStageState.phase === "steaming" &&
      results.nextStageState.completed.pleating,
    resetWorks:
      results.desktopReplay.state.pleating.count === 0 &&
      !results.desktopReplay.state.completed.pleating &&
      results.desktopReplay.frame.source.endsWith(expectedSources[0]) &&
      !results.desktopReplay.controls.nextVisible,
    desktopControlsInsideCanvas:
      results.desktopInitial.controls.replayInsideCanvas &&
      results.desktopComplete.reveal.buttonInsideCanvas &&
      results.desktopComplete.controls.replayInsideCanvas,
    mobileTouchFlow:
      results.mobileComplete.state.pleating.count === 18 &&
      results.mobileComplete.state.completed.pleating &&
      results.mobileComplete.frame.source.endsWith(expectedSources[18]) &&
      results.mobileComplete.state.pleating.revealPending &&
      results.mobileComplete.reveal.visible &&
      results.mobileComplete.reveal.loaded &&
      results.mobileComplete.reveal.buttonVisible,
    mobileControlsInsideCanvas:
      results.mobileInitial.controls.hotspotInsideCanvas &&
      results.mobileComplete.reveal.buttonInsideCanvas &&
      results.mobileComplete.controls.replayInsideCanvas,
    mobileTouchTargets:
      results.mobileInitial.controls.hotspotMinDimension >= 44 &&
      results.mobileComplete.reveal.buttonHeight >= 32 &&
      results.mobileComplete.controls.replayHeight >= 32,
    mobileNoHorizontalOverflow:
      results.mobileComplete.canvas.bodyScrollWidth <=
      results.mobileComplete.canvas.viewportWidth + 1,
    reducedMotionWorks:
      results.reducedMotion.state.pleating.count === 18 &&
      results.reducedMotion.state.completed.pleating &&
      results.reducedMotion.duration < 1500,
    missingAssetFallback:
      results.missingAssetFallback.fallbackVisible &&
      results.missingAssetFallback.fallbackText.includes("褶形素材未找到") &&
      results.missingAssetFallback.hotspotDisabled &&
      results.missingAssetFallback.guideTitle === "褶形素材未找到",
    noBrowserErrors: errors.length === 0,
  };
  results.errors = errors;

  console.log(JSON.stringify(results, null, 2));
  if (Object.values(results.assertions).some((value) => !value)) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
