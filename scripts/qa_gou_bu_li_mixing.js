const fs = require("node:fs");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4174/";
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

async function openCraft(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.locator("#gbcMixingLayer").waitFor({ state: "visible" });
}

async function state(page) {
  return page.evaluate(() => window.gouBuliCraft.getState());
}

async function mixingSnapshot(page) {
  return page.evaluate(() => {
    const image = document.querySelector("#gbcMixingStateImage");
    return {
      step: window.gouBuliCraft.getState().mixing.step,
      title: document.querySelector("#gbcMixingStepTitle").textContent.trim(),
      hint: document.querySelector("#gbcStageHint").textContent.trim(),
      image: image.getAttribute("src"),
      imageLoaded: image.complete && image.naturalWidth > 0,
      emptyBowl: {
        hidden: document.querySelector("#gbcReplacementBowlEmpty").hidden,
        source: document
          .querySelector("#gbcReplacementBowlEmpty")
          .getAttribute("src"),
        loaded:
          document.querySelector("#gbcReplacementBowlEmpty").complete &&
          document.querySelector("#gbcReplacementBowlEmpty").naturalWidth > 0,
      },
      bowlShell: {
        hidden: document.querySelector("#gbcReplacementBowlShell").hidden,
        source: document
          .querySelector("#gbcReplacementBowlShell")
          .getAttribute("src"),
        loaded:
          document.querySelector("#gbcReplacementBowlShell").complete &&
          document.querySelector("#gbcReplacementBowlShell").naturalWidth > 0,
      },
    };
  });
}

async function waitForMixingStep(page, expectedStep) {
  await page.waitForFunction(
    (step) => window.gouBuliCraft.getState().mixing.step === step,
    expectedStep,
  );
}

async function bowlCenter(page) {
  const box = await page.locator("#gbcStirZone").boundingBox();
  if (!box) throw new Error("Mixing bowl drop zone has no bounding box.");
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height * 0.48,
  };
}

async function dragIngredientToBowl(page, ingredient, screenshotPath = null) {
  const source = await page
    .locator(`[data-gbc-mixing-ingredient="${ingredient}"]`)
    .boundingBox();
  const target = await bowlCenter(page);
  if (!source) throw new Error(`${ingredient} drag source has no bounds.`);
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 10 });
  const beforeDrop = await page.evaluate((ingredientName) => ({
    state: window.gouBuliCraft.getState().mixing,
    highlight: document
      .querySelector("#gbcStirZone")
      .classList.contains("is-drop-target"),
    dropHintVisible: !document.querySelector("#gbcDropHint").hidden,
    dragX: Number.parseFloat(
      document
        .querySelector(`[data-gbc-mixing-ingredient="${ingredientName}"]`)
        ?.style.getPropertyValue("--gbc-drag-x") || "0",
    ),
  }), ingredient);
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }
  await page.mouse.up();
  return beforeDrop;
}

async function touchDragIngredientToBowl(page, ingredient) {
  const source = await page
    .locator(`[data-gbc-mixing-ingredient="${ingredient}"]`)
    .boundingBox();
  const target = await bowlCenter(page);
  if (!source) throw new Error(`${ingredient} touch source has no bounds.`);
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  for (let step = 1; step <= 10; step += 1) {
    const ratio = step / 10;
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
  const beforeDrop = await page.evaluate(() => ({
    state: window.gouBuliCraft.getState().mixing,
    highlight: document
      .querySelector("#gbcStirZone")
      .classList.contains("is-drop-target"),
  }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  return beforeDrop;
}

async function canvasRect(page) {
  return page.locator(".gbc-canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyScrollHeight: document.documentElement.scrollHeight,
    };
  });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const errors = [];
  const results = {};
  const desktop = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  desktop.on("pageerror", (error) =>
    errors.push(`desktop pageerror: ${error.message}`),
  );
  desktop.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`desktop console: ${message.text()}`);
    }
  });

  await openCraft(desktop);
  await desktop.waitForTimeout(350);
  results.desktopRect = await canvasRect(desktop);
  results.initial = await mixingSnapshot(desktop);
  results.initialState = await state(desktop);
  results.initialBackground = await desktop
    .locator("#gbcBackgroundImage")
    .evaluate((image) => ({
      source: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
    }));
  results.soupBowlLayering = await desktop.evaluate(async () => {
    const button = document.querySelector(".gbc-mixing-piece-soup");
    const foregroundBowl = document.querySelector(".gbc-mixing-state-image");
    const emptyBowl = document.querySelector("#gbcReplacementBowlEmpty");
    const bowlShell = document.querySelector("#gbcReplacementBowlShell");
    const style = getComputedStyle(button);
    const foregroundStyle = getComputedStyle(foregroundBowl);
    const emptyStyle = getComputedStyle(emptyBowl);
    const shellStyle = getComputedStyle(bowlShell);
    const image = button.querySelector("img");
    return {
      maskImage: style.maskImage,
      zIndex: style.zIndex,
      foregroundBowlZIndex: foregroundStyle.zIndex,
      emptyBowlZIndex: emptyStyle.zIndex,
      bowlShellZIndex: shellStyle.zIndex,
      emptyBowlPointerEvents: emptyStyle.pointerEvents,
      bowlShellPointerEvents: shellStyle.pointerEvents,
      emptyBowlLoaded: emptyBowl.complete && emptyBowl.naturalWidth > 0,
      bowlShellLoaded: bowlShell.complete && bowlShell.naturalWidth > 0,
      opacity: Number.parseFloat(style.opacity),
      source: image?.getAttribute("src"),
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
    };
  });
  results.lockedStageNav = await desktop
    .locator('[data-gbc-stage="wrapping"]')
    .isDisabled();
  results.navGating = await desktop.evaluate(async () => {
    await window.gouBuliCraft.showStage("wrapping", { animate: false });
    return window.gouBuliCraft.getState().phase;
  });
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-initial.png`,
    fullPage: false,
  });

  await desktop
    .locator('[data-gbc-mixing-ingredient="meat"]')
    .click();
  await desktop.waitForTimeout(380);
  results.clickFallbackIgnored = await mixingSnapshot(desktop);

  const meatBox = await desktop
    .locator('[data-gbc-mixing-ingredient="meat"]')
    .boundingBox();
  await desktop.mouse.move(
    meatBox.x + meatBox.width / 2,
    meatBox.y + meatBox.height / 2,
  );
  await desktop.mouse.down();
  await desktop.mouse.move(
    results.desktopRect.left + results.desktopRect.width * 0.9,
    results.desktopRect.top + results.desktopRect.height * 0.45,
    { steps: 8 },
  );
  await desktop.mouse.up();
  await desktop.waitForTimeout(380);
  results.invalidDrop = await desktop.evaluate(() => ({
    step: window.gouBuliCraft.getState().mixing.step,
    visible: !document
      .querySelector('[data-gbc-mixing-ingredient="meat"]')
      .hidden,
    transform:
      document.querySelector(
        '[data-gbc-mixing-ingredient="meat"]',
      ).style.getPropertyValue("--gbc-drag-x") || "0px",
  }));

  results.meatDrag = await dragIngredientToBowl(
    desktop,
    "meat",
    `${OUTPUT_DIR}gou-bu-li-mixing-drag-target.png`,
  );
  await desktop.waitForTimeout(650);
  results.afterMeat = await mixingSnapshot(desktop);
  results.meatUsed = await desktop.evaluate(
    () => window.gouBuliCraft.getState().mixing.used.meat,
  );
  results.meatHidden = await desktop
    .locator('[data-gbc-mixing-ingredient="meat"]')
    .isHidden();
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-meat.png`,
    fullPage: false,
  });

  const sequence = ["scallion", "soup", "fat"];
  results.sequence = {};
  for (const ingredient of sequence) {
    if (ingredient === "soup") {
      const soupBox = await desktop
        .locator('[data-gbc-mixing-ingredient="soup"]')
        .boundingBox();
      const target = await bowlCenter(desktop);
      const start = {
        x: soupBox.x + soupBox.width / 2,
        y: soupBox.y + soupBox.height / 2,
      };
      await desktop.mouse.move(start.x, start.y);
      await desktop.mouse.down();
      await desktop.mouse.move(start.x + 28, start.y + 34, { steps: 3 });
      results.soupPartialTilt = await desktop.evaluate((selector) => ({
        state: window.gouBuliCraft.getState().mixing,
        rotation: document
          .querySelector(selector)
          .style.getPropertyValue("--gbc-drag-rotate"),
      }), '[data-gbc-mixing-ingredient="soup"]');
      await desktop.screenshot({
        path: `${OUTPUT_DIR}gou-bu-li-mixing-soup-drag.png`,
        fullPage: false,
      });
      await desktop.mouse.move(target.x, target.y, { steps: 8 });
      await desktop.waitForTimeout(320);
      await desktop.mouse.up();
    } else {
      await dragIngredientToBowl(desktop, ingredient);
    }
    await desktop.waitForTimeout(650);
    if (ingredient === "soup") {
      results.soupPourAnimation = await desktop.evaluate(() => {
        const image = document.querySelector("#gbcSoupPourImage");
        const background = document.querySelector("#gbcSoupPourBackground");
        const button = document.querySelector(
          '[data-gbc-mixing-ingredient="soup"]',
        );
        const style = getComputedStyle(image);
        const backgroundStyle = getComputedStyle(background);
        return {
          visible: !image.hidden && style.display !== "none",
          imageLoaded: image.complete && image.naturalWidth > 0,
          opacity: Number.parseFloat(style.opacity),
          sourceHidden: button.classList.contains("is-pouring-source"),
          backgroundVisible:
            !background.hidden &&
            backgroundStyle.display !== "none" &&
            Number.parseFloat(backgroundStyle.opacity) > 0.2,
          backgroundSource: background.getAttribute("src"),
          backgroundLoaded:
            background.complete && background.naturalWidth > 0,
        };
      });
      await desktop.screenshot({
        path: `${OUTPUT_DIR}gou-bu-li-mixing-soup-pouring-animation.png`,
        fullPage: false,
      });
      await desktop.waitForTimeout(1100);
      results.soupPourBackgroundRestored = await desktop
        .locator("#gbcSoupPourBackground")
        .evaluate((background) => background.hidden);
    }
    results.sequence[ingredient] = await mixingSnapshot(desktop);
    if (ingredient === "soup") {
      results.soupSceneUnclipped = await desktop
        .locator("#gbcMixingStateImage")
        .evaluate((image) => getComputedStyle(image).clipPath === "inset(0px)");
      results.soupToolOverlayHidden = await desktop
        .locator("#gbcChopsticksButton")
        .isHidden();
    }
    if (ingredient === "fat") {
      results.fatStateReturnedToBowl = await desktop
        .locator("#gbcMixingStateImage")
        .evaluate((image) =>
          getComputedStyle(image).clipPath.includes("ellipse"),
        );
      results.chopsticksBackground = await desktop
        .locator("#gbcBackgroundImage")
        .evaluate((image) => ({
          source: image.getAttribute("src"),
          loaded: image.complete && image.naturalWidth > 0,
        }));
    }
    await desktop.screenshot({
      path: `${OUTPUT_DIR}gou-bu-li-mixing-${ingredient}.png`,
      fullPage: false,
    });
  }

  const chopsticksBox = await desktop
    .locator("#gbcChopsticksButton")
    .boundingBox();
  results.chopsticksAlignment = await desktop.evaluate(() => {
    const image = document.querySelector("#gbcBackgroundImage");
    const button = document.querySelector("#gbcChopsticksButton");
    const imageRect = image.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const scale = Math.max(
      imageRect.width / image.naturalWidth,
      imageRect.height / image.naturalHeight,
    );
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const position = getComputedStyle(image).objectPosition.split(/\s+/);
    const offsetX = (imageRect.width - renderedWidth) / 2;
    const offsetY =
      (imageRect.height - renderedHeight) *
      (Number.parseFloat(position[1] || "50") / 100);
    return {
      naturalSize: [image.naturalWidth, image.naturalHeight],
      source: {
        left: (buttonRect.left - imageRect.left - offsetX) / scale,
        top: (buttonRect.top - imageRect.top - offsetY) / scale,
        width: buttonRect.width / scale,
        height: buttonRect.height / scale,
      },
      expected: {
        left: 1242,
        top: 426,
        width: 225 * 1.15,
        height: 392 * 1.15,
      },
    };
  });
  await desktop.locator("#gbcChopsticksButton").click();
  await desktop.waitForTimeout(90);
  results.chopsticksLiftObserved = await desktop
    .locator("#gbcChopsticksButton")
    .evaluate((button) => button.classList.contains("is-lifting"));
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-chopsticks-lift.png`,
    fullPage: false,
  });
  await desktop.waitForTimeout(650);
  results.toolsReady = await mixingSnapshot(desktop);
  results.stirringToolOverlayHidden = await desktop
    .locator("#gbcChopsticksButton")
    .isHidden();
  results.stirProgressVisible = await desktop
    .locator("#gbcStirProgressWrap")
    .isVisible();
  results.autoStirVisible = await desktop
    .locator("#gbcAutoStirButton")
    .isVisible();
  results.chopsticksAsset = await desktop
    .locator("#gbcChopsticksButton img")
    .evaluate((image) => ({
      source: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
    }));
  results.chopsticksAsset.targetWidth = chopsticksBox?.width || 0;
  results.chopsticksAsset.targetHeight = chopsticksBox?.height || 0;
  results.stirHandleVisible = await desktop
    .locator("#gbcStirHandle")
    .isVisible();
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-tools-ready.png`,
    fullPage: false,
  });

  const stirBox = await desktop.locator("#gbcStirZone").boundingBox();
  const centerX = stirBox.x + stirBox.width / 2;
  const centerY = stirBox.y + stirBox.height / 2;
  const radiusX = stirBox.width * 0.32;
  const radiusY = stirBox.height * 0.32;
  const stirHandleBox = await desktop
    .locator("#gbcStirHandle")
    .boundingBox();
  const handleX = stirHandleBox.x + stirHandleBox.width / 2;
  const handleY = stirHandleBox.y + stirHandleBox.height / 2;
  const startAngle = Math.atan2(handleY - centerY, handleX - centerX);

  await desktop.mouse.move(centerX, centerY - radiusY);
  await desktop.mouse.down();
  await desktop.mouse.move(centerX + radiusX, centerY, { steps: 4 });
  await desktop.mouse.up();
  results.outsideHandleIgnored = await desktop.evaluate(
    () => window.gouBuliCraft.getState().mixing.progress,
  );

  await desktop.mouse.move(handleX, handleY);
  await desktop.mouse.down();
  await desktop.mouse.move(
    centerX + Math.cos(startAngle + Math.PI) * radiusX,
    centerY + Math.sin(startAngle + Math.PI) * radiusY,
    { steps: 1 },
  );
  await desktop.waitForTimeout(80);
  results.angleJumpFiltered = await desktop.evaluate(
    () => window.gouBuliCraft.getState().mixing.progress,
  );
  await desktop.mouse.up();

  await desktop.mouse.move(handleX, handleY);
  await desktop.mouse.down();
  const stirSteps = 60;
  for (let index = 1; index <= stirSteps; index += 1) {
    const angle = startAngle + (index * Math.PI) / 22.5;
    await desktop.mouse.move(
      centerX + Math.cos(angle) * radiusX,
      centerY + Math.sin(angle) * radiusY,
    );
    if (index === 20) {
      await desktop.waitForTimeout(80);
      results.stirMidState = await desktop.evaluate(() => ({
        progress: window.gouBuliCraft.getState().mixing.progress,
        source: document
          .querySelector("#gbcMixingStateImage")
          .getAttribute("src"),
      }));
    }
  }
  await desktop.mouse.up();
  await desktop.waitForTimeout(250);

  results.completed = await state(desktop);
  results.final = await mixingSnapshot(desktop);
  results.completionText = await desktop
    .locator("#gbcMixingStepTitle")
    .textContent();
  results.nextVisible = await desktop
    .locator("#gbcMixingNextButton")
    .isVisible();
  results.stagesUnlocked = await desktop.evaluate(() =>
    [...document.querySelectorAll("[data-gbc-stage]")].every(
      (button) => !button.disabled,
    ),
  );
  results.usedIngredients = await desktop.evaluate(() =>
    [...document.querySelectorAll("[data-gbc-mixing-ingredient]")].map(
      (button) => ({
        ingredient: button.dataset.gbcMixingIngredient,
        hidden: button.hidden,
      }),
    ),
  );
  await desktop.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-complete-desktop.png`,
    fullPage: false,
  });

  await desktop.evaluate(() => window.gouBuliCraft.reset());
  await desktop.locator("#gbcSkipMixingButton").click();
  await desktop.waitForTimeout(150);
  results.skipped = await state(desktop);
  results.skipNextVisible = await desktop
    .locator("#gbcMixingNextButton")
    .isVisible();
  await desktop.locator("#gbcMixingNextButton").click();
  await desktop.waitForTimeout(560);
  results.afterSkipStage = await desktop.locator("#gbcStageTitle").textContent();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobile.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });
  await openCraft(mobile);
  await mobile.waitForTimeout(700);
  results.mobileInitial = await mixingSnapshot(mobile);
  await mobile.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-mobile-initial-390.png`,
    fullPage: false,
  });
  results.mobileDragTargets = {};
  for (const ingredient of ["meat", "scallion", "soup", "fat"]) {
    results.mobileDragTargets[ingredient] =
      await touchDragIngredientToBowl(mobile, ingredient);
    if (ingredient === "soup") {
      await mobile.waitForTimeout(700);
      results.mobileSoupPour = await mobile.evaluate(() => {
        const image = document.querySelector("#gbcSoupPourImage");
        const background = document.querySelector("#gbcSoupPourBackground");
        const style = getComputedStyle(image);
        const backgroundStyle = getComputedStyle(background);
        return {
          visible: !image.hidden && style.display !== "none",
          imageLoaded: image.complete && image.naturalWidth > 0,
          opacity: Number.parseFloat(style.opacity),
          backgroundVisible:
            !background.hidden &&
            backgroundStyle.display !== "none" &&
            Number.parseFloat(backgroundStyle.opacity) > 0.2,
          backgroundLoaded:
            background.complete && background.naturalWidth > 0,
        };
      });
      await mobile.screenshot({
        path: `${OUTPUT_DIR}gou-bu-li-mixing-soup-pouring-mobile-390.png`,
        fullPage: false,
      });
      await mobile.waitForTimeout(1020);
      await waitForMixingStep(mobile, "fat");
      results.mobileSoupFinal = await mixingSnapshot(mobile);
      await mobile.screenshot({
        path: `${OUTPUT_DIR}gou-bu-li-mixing-soup-mobile-390.png`,
        fullPage: false,
      });
    } else {
      await mobile.waitForTimeout(620);
      const nextIngredients = {
        meat: "scallion",
        fat: "chopsticks",
      };
      if (nextIngredients[ingredient]) {
        await waitForMixingStep(mobile, nextIngredients[ingredient]);
      }
    }
  }
  results.mobileBeforeChopsticks = await state(mobile);
  const mobileChopsticksBox = await mobile
    .locator("#gbcChopsticksButton")
    .boundingBox();
  results.mobileChopsticksTarget = await mobile.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return {
        id: target?.id || "",
        className:
          typeof target?.className === "string" ? target.className : "",
      };
    },
    {
      x: mobileChopsticksBox.x + mobileChopsticksBox.width / 2,
      y: mobileChopsticksBox.y + mobileChopsticksBox.height / 2,
    },
  );
  await mobile.evaluate(() => {
    document.querySelector("#gbcChopsticksButton").click();
  });
  await mobile.waitForTimeout(760);
  results.mobileAfterChopsticks = await state(mobile);
  await mobile.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-mobile-stir-390.png`,
    fullPage: false,
  });

  const mobileStirBox = await mobile.locator("#gbcStirZone").boundingBox();
  const mobileCdp = await mobile.context().newCDPSession(mobile);
  const mobileCenter = {
    x: mobileStirBox.x + mobileStirBox.width / 2,
    y: mobileStirBox.y + mobileStirBox.height / 2,
  };
  const mobileStirHandleBox = await mobile
    .locator("#gbcStirHandle")
    .boundingBox();
  results.mobileStirHandleVisible = await mobile
    .locator("#gbcStirHandle")
    .isVisible();
  const mobileHandleCenter = {
    x: mobileStirHandleBox.x + mobileStirHandleBox.width / 2,
    y: mobileStirHandleBox.y + mobileStirHandleBox.height / 2,
  };
  const mobileStartAngle = Math.atan2(
    mobileHandleCenter.y - mobileCenter.y,
    mobileHandleCenter.x - mobileCenter.x,
  );
  const mobileStart = {
    x: mobileHandleCenter.x,
    y: mobileHandleCenter.y,
  };
  await mobileCdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: mobileStart.x, y: mobileStart.y, id: 1 }],
  });
  for (let index = 1; index <= 8; index += 1) {
    const angle = mobileStartAngle + (index * Math.PI) / 16;
    await mobileCdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x:
            mobileCenter.x +
            Math.cos(angle) * mobileStirBox.width * 0.31,
          y:
            mobileCenter.y +
            Math.sin(angle) * mobileStirBox.height * 0.31,
          id: 1,
        },
      ],
    });
  }
  await mobileCdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await mobileCdp.detach();
  await mobile.waitForTimeout(180);
  results.mobileBeforeAuto = await state(mobile);
  results.mobileTouchStirProgress = results.mobileBeforeAuto.mixing.progress;

  if (
    results.mobileBeforeAuto.mixing.step === "stirring" &&
    results.mobileTouchStirProgress < 100
  ) {
    await mobile.evaluate(() => {
      document.querySelector("#gbcAutoStirButton").click();
    });
    await mobile.waitForTimeout(2200);
  }
  results.mobileRect = await canvasRect(mobile);
  results.mobileCompleted = await state(mobile);
  results.mobilePositionedAssets = await mobile.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas").getBoundingClientRect();
    return [...document.querySelectorAll(
      ".gbc-mixing-piece img, #gbcChopsticksButton img",
    )].map((image) => {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image.parentElement);
      return {
        source: image.getAttribute("src"),
        loaded: image.complete && image.naturalWidth > 0,
        top: style.top,
        left: style.left,
        width: style.width,
        height: style.height,
        insideCanvas:
          rect.right <= canvas.right + 1 &&
          rect.bottom <= canvas.bottom + 1,
      };
    });
  });
  results.mobileControlsInsideCanvas = await mobile.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas").getBoundingClientRect();
    return [
      "#gbcMixingNextButton",
      "#gbcCloseButton",
      "#gbcOriginalButton",
      "#gbcSoundButton",
    ].every((selector) => {
      const element = document.querySelector(selector);
      if (element.hidden) return true;
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= canvas.left &&
        rect.right <= canvas.right &&
        rect.top >= canvas.top &&
        rect.bottom <= canvas.bottom
      );
    });
  });
  await mobile.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-mixing-mobile-390.png`,
    fullPage: false,
  });

  const reduced = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  reduced.on("pageerror", (error) =>
    errors.push(`reduced-motion pageerror: ${error.message}`),
  );
  reduced.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`reduced-motion console: ${message.text()}`);
    }
  });
  await openCraft(reduced);
  const reducedStartedAt = Date.now();
  await dragIngredientToBowl(reduced, "meat");
  await waitForMixingStep(reduced, "scallion");
  results.reducedMotion = {
    duration: Date.now() - reducedStartedAt,
    state: await state(reduced),
  };
  await reduced.close();

  const missing = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  await missing.route("**/ingredient-meat-position.webp", (route) =>
    route.abort(),
  );
  await missing.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await missing.locator("#dogCraftBenchOpen").click();
  await missing.waitForFunction(() =>
    document
      .querySelector("#gbcMixingFeedback")
      .textContent.includes("素材未找到"),
  );
  results.missingAssetFallback = await missing.evaluate(() => ({
    message: document.querySelector("#gbcMixingFeedback").textContent.trim(),
    state: window.gouBuliCraft.getState().mixing,
    draggable: document
      .querySelector('[data-gbc-mixing-ingredient="meat"]')
      .classList.contains("is-current"),
  }));
  await missing.close();

  await browser.close();
  const desktopAspect = results.desktopRect.width / results.desktopRect.height;
  const mobileAspect = results.mobileRect.width / results.mobileRect.height;
  results.assertions = {
    desktopSixteenNine: Math.abs(desktopAspect - 16 / 9) < 0.01,
    mobileSixteenNine: Math.abs(mobileAspect - 16 / 9) < 0.01,
    initialStepMeat: results.initial.step === "meat",
    fixedBackgroundLoaded: results.initialBackground.loaded,
    chopsticksBackgroundUpdated:
      results.initialBackground.source.endsWith("scene-mixing.webp") &&
      results.chopsticksBackground.loaded &&
      results.chopsticksBackground.source.endsWith(
        "scene-mixing-chopsticks.webp",
      ),
    soupBowlLayeringReady:
      results.soupBowlLayering.maskImage === "none" &&
      Number(results.soupBowlLayering.zIndex) <
        Number(results.soupBowlLayering.emptyBowlZIndex) &&
      results.soupBowlLayering.emptyBowlZIndex ===
        results.soupBowlLayering.bowlShellZIndex &&
      Number(results.soupBowlLayering.foregroundBowlZIndex) <
        Number(results.soupBowlLayering.emptyBowlZIndex) &&
      results.soupBowlLayering.emptyBowlPointerEvents === "none" &&
      results.soupBowlLayering.bowlShellPointerEvents === "none" &&
      results.soupBowlLayering.emptyBowlLoaded &&
      results.soupBowlLayering.bowlShellLoaded &&
      results.soupBowlLayering.opacity === 1 &&
      results.soupBowlLayering.imageLoaded &&
      results.soupBowlLayering.source.endsWith(
        "supplied-soup-bowl.png",
      ),
    emptyBowlInitial:
      results.initial.image === null &&
      !results.initial.emptyBowl.hidden &&
      results.initial.bowlShell.hidden &&
      results.initial.emptyBowl.loaded &&
      results.initial.emptyBowl.source.endsWith("supplied-blue-bowl.png"),
    replacementBowlStateTransition:
      results.afterMeat.emptyBowl.hidden &&
      !results.afterMeat.bowlShell.hidden &&
      results.afterMeat.bowlShell.loaded &&
      results.afterMeat.bowlShell.source.endsWith(
        "supplied-blue-bowl-shell.png",
      ) &&
      results.final.emptyBowl.hidden &&
      !results.final.bowlShell.hidden,
    laterStagesLocked: results.lockedStageNav && results.navGating === "mixing",
    clickDoesNotAdvance: results.clickFallbackIgnored.step === "meat",
    invalidDropReturns:
      results.invalidDrop.step === "meat" &&
      results.invalidDrop.visible &&
      results.invalidDrop.transform === "0px",
    validDragDropTarget:
      results.meatDrag.state.step === "meat" &&
      results.meatDrag.state.drag?.ingredient === "meat" &&
      results.meatDrag.state.drag?.overBowl &&
      results.meatDrag.highlight &&
      results.meatDrag.dropHintVisible &&
      Math.abs(results.meatDrag.dragX) > 10,
    rapidClicksIgnored: results.afterMeat.step === "scallion",
    meatUsedOnce: results.meatUsed && results.meatHidden,
    ingredientOrder: {
      scallion: results.sequence.scallion.step === "soup",
      soup: results.sequence.soup.step === "fat",
      fat: results.sequence.fat.step === "chopsticks",
    },
    correctBowlStates: [
      results.afterMeat.image,
      results.sequence.scallion.image,
      results.sequence.soup.image,
      results.sequence.fat.image,
    ]
      .map((value) => value?.split("/").pop())
      .join(",") ===
      "mixing-after-meat.webp,mixing-after-scallion.webp,mixing-after-soup.webp,mixing-ingredients-ready.webp",
    soupPourAnimationVisible:
      results.soupPourAnimation.visible &&
      results.soupPourAnimation.imageLoaded &&
      results.soupPourAnimation.opacity > 0.2 &&
      results.soupPourAnimation.sourceHidden,
    soupPourBackgroundChanged:
      results.soupPourAnimation.backgroundVisible &&
      results.soupPourAnimation.backgroundLoaded &&
      results.soupPourAnimation.backgroundSource.endsWith(
        "scene-soup-pour-background-v2.webp",
      ) &&
      results.soupPourBackgroundRestored,
    soupTiltGesture:
      results.soupPartialTilt.state.step === "soup" &&
      results.soupPartialTilt.state.drag?.ingredient === "soup" &&
      results.soupPartialTilt.state.drag?.tiltProgress > 0 &&
      results.soupPartialTilt.state.drag?.tiltProgress < 80 &&
      results.soupPartialTilt.state.tilt > 0 &&
      results.soupPartialTilt.state.tilt < 80 &&
      results.soupPartialTilt.rotation !== "0deg",
    mobileSoupPourWorks:
      results.mobileSoupPour.visible &&
      results.mobileSoupPour.imageLoaded &&
      results.mobileSoupPour.opacity > 0.2 &&
      results.mobileSoupPour.backgroundVisible &&
      results.mobileSoupPour.backgroundLoaded &&
      results.mobileSoupFinal.step === "fat" &&
      results.mobileSoupFinal.image.endsWith("mixing-after-soup.webp"),
    bowlStateImagesLoaded: [
      results.afterMeat,
      results.sequence.scallion,
      results.sequence.soup,
      results.sequence.fat,
      results.toolsReady,
      results.final,
    ].every((snapshot) => snapshot.imageLoaded),
    soupSceneUsesFullFrame:
      results.soupSceneUnclipped && results.fatStateReturnedToBowl,
    sceneImagesAvoidDuplicateTools:
      results.soupToolOverlayHidden && results.stirringToolOverlayHidden,
    toolsStepReady: results.toolsReady.step === "stirring",
    chopsticksAssetLoaded: results.chopsticksAsset.loaded,
    chopsticksSourceUpdated: results.chopsticksAsset.source.endsWith(
      "chopsticks-click-v2.webp",
    ),
    chopsticksLiftObserved: results.chopsticksLiftObserved,
    chopsticksAlignedWithBackground: Object.entries(
      results.chopsticksAlignment.source,
    ).every(
      ([key, value]) =>
        Math.abs(value - results.chopsticksAlignment.expected[key]) <= 1,
    ),
    chopsticksClickTargetPractical:
      results.chopsticksAsset.targetWidth >= 88 &&
      results.chopsticksAsset.targetHeight >= 88,
    stirControlsVisible:
      results.stirProgressVisible &&
      results.autoStirVisible &&
      results.stirHandleVisible,
    stirStartsOnChopsticks:
      results.outsideHandleIgnored === 0 &&
      results.angleJumpFiltered === 0,
    stirProgressChangesState:
      results.stirMidState.progress >= 35 &&
      results.stirMidState.source.endsWith("mixing-state-05.webp"),
    manualStirCompletes:
      results.completed.mixing.progress === 100 &&
      results.completed.mixing.step === "complete" &&
      results.completed.completed.mixing,
    reducedMotionDrag:
      results.reducedMotion.state.mixing.step === "scallion" &&
      results.reducedMotion.duration < 800,
    missingMixingAssetFallback:
      results.missingAssetFallback.message.includes("素材未找到") &&
      results.missingAssetFallback.state.assetError &&
      !results.missingAssetFallback.draggable,
    finalBowlState:
      results.final.image.endsWith("mixing-complete.webp") &&
      results.final.imageLoaded,
    completionMessage: results.completionText === "肉馅调好了",
    nextStageUnlocked:
      results.nextVisible && results.stagesUnlocked,
    allIngredientsConsumed: results.usedIngredients.every(
      (item) => item.hidden,
    ),
    skipPathWorks:
      results.skipped.completed.mixing &&
      results.skipped.mixing.skipped &&
      results.skipNextVisible &&
      results.afterSkipStage === "包制",
    mobileAutoStirCompletes:
      results.mobileCompleted.mixing.progress === 100 &&
      results.mobileCompleted.completed.mixing,
    mobileTouchDrags:
      ["meat", "scallion", "fat"].every(
        (ingredient) =>
          results.mobileDragTargets[ingredient].highlight &&
          results.mobileDragTargets[ingredient].state.drag?.overBowl,
      ) &&
      results.mobileSoupFinal.step === "fat",
    mobileTouchStirGesture:
      results.mobileStirHandleVisible &&
      results.mobileTouchStirProgress > 0 &&
      results.mobileTouchStirProgress < 100,
    positionedAssetsLoaded: results.mobilePositionedAssets.every(
      (asset) => asset.loaded,
    ),
    positionedAssetsInsideCanvas: results.mobilePositionedAssets.every(
      (asset) => asset.insideCanvas,
    ),
    mobileControlsInsideCanvas: results.mobileControlsInsideCanvas,
    mobileNoHorizontalOverflow:
      results.mobileRect.bodyScrollWidth <= results.mobileRect.viewportWidth + 1,
    noBrowserErrors: errors.length === 0,
  };
  results.assertions.ingredientOrder = Object.values(
    results.assertions.ingredientOrder,
  ).every(Boolean);
  results.errors = errors;

  console.log(JSON.stringify(results, null, 2));
  if (
    Object.values(results.assertions).some(
      (value) => typeof value === "boolean" && !value,
    )
  ) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
