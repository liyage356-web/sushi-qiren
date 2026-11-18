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
  if (!executable) {
    throw new Error("No installed Edge or Chrome executable found.");
  }
  return executable;
}

async function openWrapping(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    window.gouBuliCraft.skipMixing();
    await window.gouBuliCraft.showStage("wrapping", { animate: false });
  });
  await page.locator("#gbcWrappingLayer").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      document.querySelector(
        "[data-gbc-wrap-frame].is-visible",
      )?.complete === true,
  );
  await page.waitForTimeout(220);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas");
    const layer = document.querySelector("#gbcWrappingLayer");
    const frame = document.querySelector(
      "[data-gbc-wrap-frame].is-visible",
    );
    const dough = document.querySelector("#gbcWrapDoughButton");
    const filling = document.querySelector("#gbcWrapFillingButton");
    const prompt = document.querySelector("#gbcWrapPromptButton");
    const next = document.querySelector("#gbcWrapNextButton");
    const replay = document.querySelector("#gbcWrapReplayButton");
    const drop = document.querySelector("#gbcWrapHandDrop");
    const doughImage = dough.querySelector("img");
    const rect = canvas.getBoundingClientRect();
    const doughRect = dough.getBoundingClientRect();
    const inside = (element) => {
      const box = element.getBoundingClientRect();
      return (
        box.left >= rect.left - 1 &&
        box.top >= rect.top - 1 &&
        box.right <= rect.right + 1 &&
        box.bottom <= rect.bottom + 1
      );
    };
    return {
      state: window.gouBuliCraft.getState(),
      layerStep: layer.dataset.step,
      frameSource: frame?.getAttribute("src") || "",
      frameLoaded: Boolean(frame?.complete && frame.naturalWidth > 0),
      guide: {
        counter: document
          .querySelector("#gbcWrapStepCounter")
          .textContent.trim(),
        title: document
          .querySelector("#gbcWrapStepTitle")
          .textContent.trim(),
        copy: document.querySelector("#gbcWrapStepCopy").textContent.trim(),
        feedback: document
          .querySelector("#gbcWrapFeedback")
          .textContent.trim(),
        hint: document.querySelector("#gbcStageHint").textContent.trim(),
      },
      controls: {
        doughVisible: !dough.hidden && getComputedStyle(dough).display !== "none",
        fillingVisible:
          !filling.hidden && getComputedStyle(filling).display !== "none",
        promptVisible:
          !prompt.hidden && getComputedStyle(prompt).display !== "none",
        nextVisible: !next.hidden && getComputedStyle(next).display !== "none",
        replayVisible:
          !replay.hidden && getComputedStyle(replay).display !== "none",
        doughInsideCanvas: inside(dough),
        fillingInsideCanvas: inside(filling),
        promptInsideCanvas: inside(prompt),
      },
      dough: {
        source: doughImage?.getAttribute("src") || "",
        loaded: Boolean(
          doughImage?.complete && doughImage.naturalWidth > 0,
        ),
        naturalWidth: doughImage?.naturalWidth || 0,
        naturalHeight: doughImage?.naturalHeight || 0,
        relative: {
          left: (doughRect.left - rect.left) / rect.width,
          top: (doughRect.top - rect.top) / rect.height,
          width: doughRect.width / rect.width,
          height: doughRect.height / rect.height,
        },
      },
      drop: {
        visible: !drop.hidden && getComputedStyle(drop).display !== "none",
        targeted: drop.classList.contains("is-target"),
      },
      canvas: {
        width: rect.width,
        height: rect.height,
        bodyScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      },
    };
  });
}

async function waitForStep(page, step) {
  await page.waitForFunction(
    (expected) =>
      window.gouBuliCraft.getState().wrapping.step === expected,
    step,
  );
}

async function dragDoughToHand(page, useTouch = false) {
  const source = await page.locator("#gbcWrapDoughButton").boundingBox();
  const canvas = await page.locator(".gbc-canvas").boundingBox();
  if (!source || !canvas) throw new Error("Dough drag geometry is missing.");
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const target = {
    x: canvas.x + canvas.width * 0.405,
    y: canvas.y + canvas.height * 0.625,
  };
  if (!useTouch) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 12 });
    return { start, target };
  }

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  for (let index = 1; index <= 12; index += 1) {
    const ratio = index / 12;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: start.x + (target.x - start.x) * ratio,
          y: start.y + (target.y - start.y) * ratio,
          id: 1,
        },
      ],
    });
  }
  return { start, target, cdp };
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

  await openWrapping(page);
  results.desktopInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-initial-desktop.png`,
  });

  const invalidSource = await page
    .locator("#gbcWrapDoughButton")
    .boundingBox();
  const initialCanvas = await page.locator(".gbc-canvas").boundingBox();
  await page.mouse.move(
    invalidSource.x + invalidSource.width / 2,
    invalidSource.y + invalidSource.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    initialCanvas.x + initialCanvas.width * 0.82,
    initialCanvas.y + initialCanvas.height * 0.32,
    { steps: 8 },
  );
  results.desktopInvalidDropDuringDrag = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState().wrapping,
    dropVisible: !document.querySelector("#gbcWrapHandDrop").hidden,
  }));
  await page.mouse.up();
  await page.waitForTimeout(380);
  results.desktopInvalidDrop = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState().wrapping,
    transform:
      document.querySelector("#gbcWrapDoughButton").style.getPropertyValue(
        "--gbc-wrap-drag-x",
      ) || "0px",
    dropHidden: document.querySelector("#gbcWrapHandDrop").hidden,
  }));

  const validDrag = await dragDoughToHand(page);
  results.desktopValidDropDuringDrag = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-dough-drag-desktop.png`,
  });
  const doughStartedAt = Date.now();
  await page.mouse.up();
  results.desktopAfterDoughImmediate = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState(),
    doughVisible: !document.querySelector("#gbcWrapDoughButton").hidden,
  }));
  await waitForStep(page, "filling");
  results.desktopDoughDuration = Date.now() - doughStartedAt;
  results.desktopAfterDough = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-dough-desktop.png`,
  });

  const fillingStartedAt = Date.now();
  await page.locator("#gbcWrapFillingButton").click();
  results.desktopAfterFillingImmediate = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState(),
    fillingVisible: !document.querySelector("#gbcWrapFillingButton").hidden,
  }));
  await waitForStep(page, "ready");
  results.desktopFillingDuration = Date.now() - fillingStartedAt;
  results.desktopAfterFilling = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-filling-desktop.png`,
  });

  const promptStartedAt = Date.now();
  await page.locator("#gbcWrapPromptButton").click();
  results.desktopAfterPromptImmediate = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState(),
    promptVisible: !document.querySelector("#gbcWrapPromptButton").hidden,
  }));
  await waitForStep(page, "complete");
  results.desktopPromptDuration = Date.now() - promptStartedAt;
  results.desktopComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-complete-desktop.png`,
  });

  await page.locator("#gbcWrapNextButton").click();
  await page.waitForFunction(
    () => window.gouBuliCraft.getState().phase === "pleating",
  );
  results.desktopNextStage = await page.evaluate(
    () => window.gouBuliCraft.getState(),
  );

  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    await window.gouBuliCraft.showStage("wrapping", { animate: false });
  });
  await page.locator("#gbcWrapReplayButton").click();
  await waitForStep(page, "dough");
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

  await openWrapping(page);
  results.mobileInitial = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-initial-mobile-390.png`,
  });

  const mobileDrag = await dragDoughToHand(page, true);
  results.mobileDuringDoughDrag = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-dough-drag-mobile-390.png`,
  });
  await mobileDrag.cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await waitForStep(page, "filling");
  results.mobileAfterDough = await snapshot(page);

  await page.locator("#gbcWrapFillingButton").tap();
  await waitForStep(page, "ready");
  results.mobileAfterFilling = await snapshot(page);

  await page.locator("#gbcWrapPromptButton").tap();
  await waitForStep(page, "complete");
  results.mobileComplete = await snapshot(page);
  await page.locator(".gbc-canvas").screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-wrapping-complete-mobile-390.png`,
  });
  await page.close();
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const results = {};
  const errors = [];

  await runDesktop(browser, results, errors);
  await runMobile(browser, results, errors);
  await browser.close();

  const expectedSources = {
    initial: "wrap-bg-hand.png",
    dough: "wrap-01.webp",
    filling: "wrap-02.webp",
    complete: "wrap-03.webp",
  };
  const sourceSkin = results.desktopInitial.dough;
  results.assertions = {
    desktopInitial:
      results.desktopInitial.state.wrapping.step === "dough" &&
      results.desktopInitial.frameSource.endsWith(expectedSources.initial) &&
      results.desktopInitial.frameLoaded &&
      results.desktopInitial.controls.doughVisible &&
      !results.desktopInitial.controls.fillingVisible &&
      results.desktopInitial.guide.counter === "第 1 / 3 步",
    suppliedSkinIsExactAsset:
      sourceSkin.source.endsWith("wrap-dough-drag.png") &&
      sourceSkin.loaded &&
      sourceSkin.naturalWidth === 1597 &&
      sourceSkin.naturalHeight === 923,
    suppliedSkinCoversSource:
      Math.abs(sourceSkin.relative.left - 0.509) <= 0.002 &&
      Math.abs(sourceSkin.relative.top - 0.1985) <= 0.002 &&
      Math.abs(sourceSkin.relative.width - 0.1449) <= 0.002 &&
      Math.abs(sourceSkin.relative.height - 0.1274) <= 0.002,
    suppliedHandBackground:
      results.desktopInitial.frameSource.endsWith(
        "wrap-bg-hand.png",
      ) &&
      results.desktopInitial.frameLoaded &&
      results.mobileInitial.frameSource.endsWith(
        "wrap-bg-hand.png",
      ) &&
      results.mobileInitial.frameLoaded,
    invalidDropReturnsToSource:
      results.desktopInvalidDrop.state.step === "dough" &&
      !results.desktopInvalidDrop.state.drag &&
      results.desktopInvalidDrop.transform === "0px" &&
      results.desktopInvalidDrop.dropHidden,
    dragTargetTracksLeftPalm:
      results.desktopValidDropDuringDrag.state.wrapping.drag?.overHand ===
        true &&
      results.desktopValidDropDuringDrag.drop.visible &&
      results.desktopValidDropDuringDrag.drop.targeted,
    doughTransition:
      results.desktopAfterDoughImmediate.state.wrapping.busy &&
      !results.desktopAfterDoughImmediate.doughVisible &&
      results.desktopAfterDough.state.wrapping.step === "filling" &&
      results.desktopAfterDough.frameSource.endsWith(expectedSources.dough) &&
      results.desktopAfterDough.frameLoaded &&
      results.desktopAfterDough.guide.feedback === "包子皮已托稳。" &&
      results.desktopAfterDough.controls.fillingVisible &&
      results.desktopDoughDuration >= 400 &&
      results.desktopDoughDuration <= 750,
    fillingTransition:
      results.desktopAfterFillingImmediate.state.wrapping.busy &&
      !results.desktopAfterFillingImmediate.fillingVisible &&
      results.desktopAfterFilling.state.wrapping.step === "ready" &&
      results.desktopAfterFilling.frameSource.endsWith(expectedSources.filling) &&
      results.desktopAfterFilling.frameLoaded &&
      results.desktopAfterFilling.guide.feedback ===
        "肉馅已放在面皮中央。" &&
      results.desktopAfterFilling.controls.promptVisible &&
      results.desktopFillingDuration >= 400 &&
      results.desktopFillingDuration <= 750,
    promptTransition:
      results.desktopAfterPromptImmediate.state.wrapping.busy &&
      !results.desktopAfterPromptImmediate.promptVisible &&
      results.desktopComplete.state.wrapping.step === "complete" &&
      results.desktopComplete.frameSource.endsWith(
        expectedSources.complete,
      ) &&
      results.desktopComplete.frameLoaded &&
      results.desktopComplete.state.completed.wrapping &&
      results.desktopComplete.guide.hint.includes("十八道褶") &&
      results.desktopComplete.controls.nextVisible &&
      results.desktopPromptDuration >= 400 &&
      results.desktopPromptDuration <= 750,
    nextStageUnlocked: results.desktopNextStage.phase === "pleating",
    replayWorks:
      results.desktopReplay.state.wrapping.step === "dough" &&
      !results.desktopReplay.state.completed.wrapping &&
      !results.desktopReplay.controls.nextVisible &&
      results.desktopReplay.frameSource.endsWith(expectedSources.initial),
    desktopControlsInsideCanvas:
      results.desktopInitial.controls.doughInsideCanvas &&
      results.desktopAfterDough.controls.fillingInsideCanvas &&
      results.desktopAfterFilling.controls.promptInsideCanvas,
    mobileTouchFlow:
      results.mobileDuringDoughDrag.state.wrapping.drag?.overHand === true &&
      results.mobileDuringDoughDrag.drop.visible &&
      results.mobileDuringDoughDrag.drop.targeted &&
      results.mobileAfterDough.state.wrapping.step === "filling" &&
      results.mobileAfterFilling.state.wrapping.step === "ready" &&
      results.mobileComplete.state.wrapping.step === "complete" &&
      results.mobileComplete.frameSource.endsWith(
        expectedSources.complete,
      ) &&
      results.mobileComplete.state.completed.wrapping &&
      results.mobileComplete.controls.nextVisible,
    mobileControlsInsideCanvas:
      results.mobileInitial.controls.doughInsideCanvas &&
      results.mobileAfterDough.controls.fillingInsideCanvas &&
      results.mobileAfterFilling.controls.promptInsideCanvas,
    mobileNoHorizontalOverflow:
      results.mobileComplete.canvas.bodyScrollWidth <=
      results.mobileComplete.canvas.viewportWidth + 1,
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
