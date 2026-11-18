const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-walk8-stage1.json");
const candidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function openChapterFour(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter4`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter4" &&
      document.querySelector("[data-walk8-reset-open]") !== null,
  );
}

async function enterWalk8Interaction(page) {
  await page
    .locator(
      "#sishiOriginal-chapter4 .sishi-original-footer button.is-primary",
    )
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-walk8-reset-open]")?.offsetParent !==
      null,
  );
}

async function openWalk8Experience(page) {
  await enterWalk8Interaction(page);
  await page.locator("[data-walk8-reset-open]").click();
  await page.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === true,
  );
}

async function stageSnapshot(page) {
  return page.evaluate(() => {
    const cinema = document.querySelector(".walk8-cinema").getBoundingClientRect();
    const stage = document.querySelector("#walk8Stage");
    const route = document.querySelector("#walk8RoutePath");
    const figure = document.querySelector(".walk8-yu-liu");
    const portrait = document.querySelector("#walk8YuLiu");
    return {
      cinemaWidth: cinema.width,
      cinemaHeight: cinema.height,
      logicalWidth: stage.dataset.logicalWidth,
      logicalHeight: stage.dataset.logicalHeight,
      actorX: stage.dataset.actorX,
      actorY: stage.dataset.actorY,
      routeLength: Number(stage.dataset.routeLength),
      routeDomLength: route.getTotalLength(),
      routeLengthAttribute: route.dataset.routeLength,
      leftBucketX: stage.dataset.leftBucketX,
      rightBucketX: stage.dataset.rightBucketX,
      bucketCount: document.querySelectorAll(".walk8-bucket-slot").length,
      figureLeft: figure.getBoundingClientRect().left,
      figureTop: figure.getBoundingClientRect().top,
      figureWidth: figure.getBoundingClientRect().width,
      figureHeight: figure.getBoundingClientRect().height,
      imageLoaded: portrait.complete && portrait.naturalWidth > 0,
      imageSource: decodeURIComponent(new URL(portrait.src).pathname),
      groundBackground: getComputedStyle(
        document.querySelector(".walk8-ground"),
      ).backgroundImage,
      groundPointerEvents: getComputedStyle(
        document.querySelector(".walk8-ground"),
      ).pointerEvents,
      bucketArtOpacity: [
        ...document.querySelectorAll(".walk8-bucket-art"),
      ].map((image) => getComputedStyle(image.parentElement).opacity),
      audiences: [
        ...document.querySelectorAll(".walk8-audience"),
      ].map((audience) => {
        const image = audience.querySelector("img");
        const rect = audience.getBoundingClientRect();
        const style = getComputedStyle(audience);
        return {
          className: audience.className,
          loaded: image.complete && image.naturalWidth > 0,
          source: decodeURIComponent(new URL(image.src).pathname),
          pointerEvents: style.pointerEvents,
          z: Number(style.zIndex),
          leftRatio: (rect.left - cinema.left) / cinema.width,
          rightRatio: (rect.right - cinema.left) / cinema.width,
          topRatio: (rect.top - cinema.top) / cinema.height,
          bottomRatio: (rect.bottom - cinema.top) / cinema.height,
        };
      }),
      groundZ: getComputedStyle(document.querySelector(".walk8-ground")).zIndex,
      routeZ: getComputedStyle(document.querySelector(".walk8-route")).zIndex,
      figureZ: getComputedStyle(figure).zIndex,
      hudZ: getComputedStyle(document.querySelector(".walk8-scene-layer")).zIndex,
      pageHorizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  async function createPage(viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", (request) => {
      errors.push(`request failed: ${request.url()}`);
    });
    return page;
  }

  const desktop = await createPage({ width: 1440, height: 960 });
  await openChapterFour(desktop);
  const readerPosition = await desktop.evaluate(() => {
    const reader = document.querySelector("#sishiOriginal-chapter4");
    const footerButtons = [
      ...reader.querySelectorAll(".sishi-original-footer button"),
    ].map((button) => button.textContent.trim());
    return {
      paragraphCount:
        reader.querySelectorAll(".sishi-original-text p").length,
      guideCardCount:
        document.querySelectorAll(".walk8-reader-entry").length,
      removedGuideCopyPresent:
        document.body.innerText.includes("按住路线，带俞六绕过两只桶"),
      footerButtons,
      progressTracks:
        reader.querySelectorAll(".sishi-original-progress").length,
      interactionHidden:
        reader.nextElementSibling?.classList.contains(
          "sishi-interaction-content",
        ) && reader.nextElementSibling.hidden,
    };
  });
  check("chapterFourOriginalReading", readerPosition.paragraphCount === 3);
  check(
    "readerGuideCardIsCompletelyRemoved",
    readerPosition.guideCardCount === 0 &&
      readerPosition.removedGuideCopyPresent === false &&
      readerPosition.footerButtons.join(",") ===
        "打开完整原文,进入本段互动" &&
      readerPosition.progressTracks === 1 &&
      readerPosition.interactionHidden,
    JSON.stringify(readerPosition),
  );
  await desktop
    .locator("#sishiOriginal-chapter4")
    .getByRole("button", { name: "打开完整原文" })
    .click();
  await desktop.waitForFunction(
    () => document.querySelector("#readingDialog")?.open === true,
  );
  check(
    "completeOriginalButtonStillWorksAfterCardRemoval",
    await desktop.evaluate(
      () =>
        document.querySelector("#readingDialog")?.open === true &&
        document.querySelector("#readingTitle")?.textContent.trim() ===
          "四十八样",
    ),
  );
  await desktop.locator("#readingClose").click();
  await desktop.waitForFunction(
    () => document.querySelector("#readingDialog")?.open === false,
  );

  await openWalk8Experience(desktop);
  await desktop.waitForTimeout(600);
  const desktopStage = await stageSnapshot(desktop);
  check(
    "desktopStageIsSixteenByNine",
    Math.abs(desktopStage.cinemaWidth / desktopStage.cinemaHeight - 16 / 9) <
      0.01,
    JSON.stringify(desktopStage),
  );
  check(
    "logicalCanvasIs1920By1080",
    desktopStage.logicalWidth === "1920" &&
      desktopStage.logicalHeight === "1080",
  );
  check(
    "sceneAssetsLoad",
    desktopStage.bucketCount === 2 &&
      desktopStage.imageLoaded &&
      desktopStage.imageSource.endsWith("/assets/walk8/yu-liu-idle.png"),
    JSON.stringify(desktopStage),
  );
  const poseSprites = await desktop.evaluate(() =>
    [...document.querySelectorAll(".walk8-yu-liu__sprite")].map((sprite) => ({
      pose: sprite.dataset.pose,
      loaded: sprite.complete && sprite.naturalWidth > 0,
      source: decodeURIComponent(new URL(sprite.src).pathname),
    })),
  );
  check(
    "poseSpritesLoad",
    poseSprites.length === 4 &&
      poseSprites.every((sprite) => sprite.loaded) &&
      ["idle", "left", "right", "switch"].every((pose) =>
        poseSprites.some(
          (sprite) =>
            sprite.pose === pose &&
            sprite.source.endsWith(`/assets/walk8/yu-liu-${pose}.png`),
        ),
      ),
    JSON.stringify(poseSprites),
  );
  check(
    "originalStoneStreetBackdropRestored",
    desktopStage.groundBackground.includes("/assets/walk8/walk8-ground.png"),
    desktopStage.groundBackground,
  );
  check(
    "replacementAudienceLayersRemoved",
    desktopStage.audiences.length === 0,
    JSON.stringify({ count: desktopStage.audiences.length }),
  );
  check(
    "characterUsesOriginalSquarePoseArt",
    Math.abs(
      desktopStage.figureWidth / desktopStage.figureHeight - 1,
    ) < 0.015,
    JSON.stringify({
      width: desktopStage.figureWidth,
      height: desktopStage.figureHeight,
      stageHeight: desktopStage.cinemaHeight,
      ratio: desktopStage.figureWidth / desktopStage.figureHeight,
    }),
  );
  check(
    "originalBucketLayersRestored",
    desktopStage.bucketArtOpacity.every((opacity) => opacity === "1"),
    JSON.stringify(desktopStage.bucketArtOpacity),
  );
  check(
    "routeHasReadableLength",
    desktopStage.routeLength > 1000 &&
      Math.abs(desktopStage.routeLength - desktopStage.routeDomLength) < 0.1 &&
      desktopStage.routeLengthAttribute === desktopStage.routeLength.toFixed(2),
    JSON.stringify(desktopStage),
  );
  check(
    "actorAndBucketCoordinatesAreReadable",
    desktopStage.actorX === "960" &&
      desktopStage.actorY === "540" &&
      desktopStage.leftBucketX === "691" &&
      desktopStage.rightBucketX === "1229",
    JSON.stringify(desktopStage),
  );
  check(
    "layerOrderIsGroundRouteFigureHud",
    Number(desktopStage.groundZ) < Number(desktopStage.routeZ) &&
      Number(desktopStage.routeZ) < Number(desktopStage.figureZ) &&
      Number(desktopStage.figureZ) < Number(desktopStage.hudZ),
    JSON.stringify(desktopStage),
  );

  const beforeStart = await desktop.evaluate(() => ({
    x: document.querySelector("#walk8Stage").dataset.actorX,
    y: document.querySelector("#walk8Stage").dataset.actorY,
    left: document.querySelector(".walk8-yu-liu").getBoundingClientRect().left,
  }));
  await desktop.locator("#walk8Start").click();
  await desktop.waitForTimeout(150);
  const afterStart = await desktop.evaluate(() => ({
    x: document.querySelector("#walk8Stage").dataset.actorX,
    y: document.querySelector("#walk8Stage").dataset.actorY,
    left: document.querySelector(".walk8-yu-liu").getBoundingClientRect().left,
    status: document.querySelector("#walk8StageStatus").textContent.trim(),
  }));
  check(
    "startPhaseHasNoMovementAnimation",
    beforeStart.x === afterStart.x &&
      beforeStart.y === afterStart.y &&
      Math.abs(beforeStart.left - afterStart.left) < 0.1 &&
      afterStart.status.includes("已开始"),
    JSON.stringify({ beforeStart, afterStart }),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "walk8-stage1-desktop.png"),
    fullPage: false,
  });

  await desktop.locator("#walk8Return").click();
  await desktop.waitForFunction(
    () => document.querySelector("#walk8Experience")?.open === false,
  );
  await desktop.waitForTimeout(100);
  check(
    "returnGoesBackToOriginal",
    await desktop.evaluate(
      () =>
        document.activeElement?.id === "sishiOriginal-chapter4" &&
        document.querySelectorAll(".walk8-reader-entry").length === 0,
    ),
  );

  await enterWalk8Interaction(desktop);
  await desktop.waitForFunction(
    () =>
      document.querySelector("#candyCabinet .sishi-interaction-content") !==
        null &&
      document.querySelector("#walkFigureEight .sishi-interaction-content")
        ?.hidden === false,
  );
  for (const action of [
    "left",
    "left",
    "left",
    "switch",
    "right",
    "right",
    "right",
    "switch",
  ]) {
    await desktop.locator(`[data-walk-action="${action}"]`).click();
  }
  check(
    "existingEightStepPracticeStillWorks",
    (await desktop.locator("#walkProgress").textContent()) === "8" &&
      (await desktop.locator("#walkComplete").isVisible()),
  );

  const landscape = await createPage({ width: 844, height: 390 });
  await openChapterFour(landscape);
  await openWalk8Experience(landscape);
  await landscape.waitForTimeout(600);
  const landscapeStage = await stageSnapshot(landscape);
  check(
    "mobileLandscapeKeepsStageRatio",
    Math.abs(
      landscapeStage.cinemaWidth / landscapeStage.cinemaHeight - 16 / 9,
    ) < 0.01 && !landscapeStage.pageHorizontalOverflow,
    JSON.stringify(landscapeStage),
  );
  await landscape.screenshot({
    path: path.join(ROOT, "walk8-stage1-mobile-landscape.png"),
    fullPage: false,
  });

  const portrait = await createPage({ width: 390, height: 844 });
  await openChapterFour(portrait);
  await openWalk8Experience(portrait);
  await portrait.waitForTimeout(600);
  const portraitStage = await stageSnapshot(portrait);
  check(
    "mobilePortraitKeepsStageRatio",
    Math.abs(portraitStage.cinemaWidth / portraitStage.cinemaHeight - 16 / 9) <
      0.01 && !portraitStage.pageHorizontalOverflow,
    JSON.stringify(portraitStage),
  );
  await portrait.screenshot({
    path: path.join(ROOT, "walk8-stage1-mobile-portrait.png"),
    fullPage: false,
  });

  check("noBrowserErrors", errors.length === 0, errors.join("\n"));
  const passed = Object.values(checks).every((item) => item.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots: [
      "walk8-stage1-desktop.png",
      "walk8-stage1-mobile-landscape.png",
      "walk8-stage1-mobile-portrait.png",
    ],
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      { passed, checkCount: report.checkCount, errors, report: REPORT },
      null,
      2,
    ),
  );
  await browser.close();
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
