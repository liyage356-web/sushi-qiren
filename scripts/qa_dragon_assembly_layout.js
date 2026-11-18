const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-dragon-assembly-layout.json");
const ASSET_ROOT = path.join(
  ROOT,
  "public",
  "assets",
  "forty-eight",
  "dragon-assembly",
);
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return browserCandidates.find((candidate) => fs.existsSync(candidate));
}

async function createPage(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(`request failed: ${request.url()}`);
  });
  return { context, page, errors };
}

async function openAssembly(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter3`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter3",
  );
  await page
    .locator("#sishiOriginal-chapter3")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#assemblyBackyard .sishi-interaction-content")
        ?.hidden === false,
  );
  await page.waitForTimeout(450);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const component = document.querySelector("#dragonAssembly");
    const stage = document.querySelector("#assemblyStage");
    const workbench = document.querySelector(".assembly-workbench");
    const canvas = document.querySelector(".dragon-assembly__coordinate");
    const parts = document.querySelector(".assembly-controls");
    const progress = document.querySelector(".dragon-assembly__progress");
    const completion = document.querySelector("#assemblyComplete");
    const rect = component.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const workbenchRect = workbench.getBoundingClientRect();
    const partsRect = parts.getBoundingClientRect();
    const progressRect = progress.getBoundingClientRect();
    const layerRect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        centerX: (box.left - canvasRect.left + box.width / 2) / canvasRect.width,
        centerY: (box.top - canvasRect.top + box.height / 2) / canvasRect.height,
        inside:
          box.left >= canvasRect.left - 1 &&
          box.right <= canvasRect.right + 1 &&
          box.top >= canvasRect.top - 1 &&
          box.bottom <= canvasRect.bottom + 1,
      };
    };
    return {
      component: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        ratio: rect.width / rect.height,
      },
      stageStep: Number(stage.dataset.assemblyStep),
      componentStep: Number(component.dataset.assemblyStep),
      progressText: document
        .querySelector("#dragonAssemblyProgressText")
        .textContent.trim(),
      progressNow: document
        .querySelector("#dragonAssemblyProgressBar")
        .getAttribute("aria-valuenow"),
      progressWidth: getComputedStyle(
        document.querySelector(".dragon-assembly__progress-track span"),
      ).width,
      completionHidden: completion.hidden,
      completionText: completion.textContent.replace(/\s+/g, " ").trim(),
      canvas: {
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      workbench: {
        left: workbenchRect.left,
        top: workbenchRect.top,
        width: workbenchRect.width,
        height: workbenchRect.height,
        ratio: workbenchRect.width / workbenchRect.height,
      },
      partsTop: partsRect.top,
      canvasBottom: canvasRect.bottom,
      progressBottom: progressRect.bottom,
      componentNames: [
        ...document.querySelectorAll("[data-component]"),
      ].map((element) => element.dataset.component),
      layerOpacity: Object.fromEntries(
        [
          "yoke",
          "bucket-left",
          "bucket-right",
          "dragon-left",
          "dragon-right",
          "bead",
          "pompom-left",
          "pompom-right",
          "sign",
        ].map((name) => [
          name,
          getComputedStyle(
            document.querySelector(`.dragon-assembly__layer--${name}`),
          ).opacity,
        ]),
      ),
      bucketLeft: layerRect(".dragon-assembly__layer--bucket-left"),
      bucketRight: layerRect(".dragon-assembly__layer--bucket-right"),
      bead: layerRect(".dragon-assembly__layer--bead"),
      images: [...document.querySelectorAll("#dragonAssembly img")].map(
        (image) => ({
          source: image.getAttribute("src"),
          loaded: image.complete && image.naturalWidth > 0,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          missing: image.classList.contains("is-missing"),
        }),
      ),
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      assetMap: window.dragonAssemblyComponent?.assets,
      audioMap: window.dragonAssemblyComponent?.audioAssets,
    };
  });
}

async function runMissingAssetFallback(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) =>
    pageErrors.push(`pageerror: ${error.stack || error.message}`),
  );
  await page.route("**/parts/chain-left.png", (route) => route.abort());
  await openAssembly(page);
  await page.waitForFunction(
    () =>
      document
        .querySelector(".dragon-assembly__layer--chain-left")
        ?.classList.contains("is-missing"),
  );
  const fallback = await page.evaluate(() => ({
    hidden: document.querySelector(".dragon-assembly__asset-fallback").hidden,
    text: document
      .querySelector(".dragon-assembly__asset-fallback")
      .textContent.trim(),
    missing: document
      .querySelector(".dragon-assembly__layer--chain-left")
      .classList.contains("is-missing"),
  }));
  await context.close();
  return { fallback, pageErrors };
}

function normalizedDistance(left, right) {
  return Math.hypot(
    left.centerX - right.centerX,
    left.centerY - right.centerY,
  );
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  const screenshots = [];
  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(ASSET_ROOT, "manifest.json"), "utf8"),
  );
  const visualEntries = [
    manifest.assets.background.courtyard,
    manifest.assets.structure.yoke,
    manifest.assets.structure.bucketLeft,
    manifest.assets.structure.bucketRight,
    manifest.assets.parts.dragonLeft,
    manifest.assets.parts.dragonRight,
    manifest.assets.parts.goldBead,
    manifest.assets.parts.pompomLeft,
    manifest.assets.parts.pompomRight,
    manifest.assets.parts.lacquerSign,
    manifest.assets.parts.chainLeft,
    manifest.assets.parts.chainRight,
    manifest.assets.ui.stepSeal,
    manifest.assets.ui.panelDivider,
  ];
  check(
    "assetManifestMatchesFiles",
    visualEntries.every((entry) => fs.existsSync(path.join(ASSET_ROOT, entry))) &&
      manifest.assets.audio.status === "missing" &&
      !fs.existsSync(
        path.join(ASSET_ROOT, manifest.assets.audio.assemblyStep),
      ),
    JSON.stringify(manifest),
  );

  const desktopSession = await createPage(browser, {
    width: 1440,
    height: 960,
  });
  const desktop = desktopSession.page;
  errors.push(...desktopSession.errors);
  await openAssembly(desktop);
  const initial = await snapshot(desktop);
  check(
    "desktopLayoutUses16By9Stage",
    Math.abs(initial.component.ratio - 16 / 9) < 0.005 &&
      initial.component.left >= 0 &&
      initial.component.right <= initial.viewport.width &&
      initial.documentOverflow <= 1,
    JSON.stringify(initial.component),
  );
  check(
    "requiredComponentStructureExists",
    ["BackgroundLayer", "AssemblyCanvas", "PartsPanel", "ProgressIndicator", "CompletionOverlay"]
      .every((name) => initial.componentNames.includes(name)),
    JSON.stringify(initial.componentNames),
  );
  check(
    "allMappedVisualAssetsLoad",
    initial.images.length >= 18 &&
      initial.images.every(
        (image) =>
          image.loaded &&
          !image.missing &&
          image.source.endsWith(".png") &&
          image.source.startsWith(
            "../../public/assets/forty-eight/dragon-assembly/",
          ),
      ),
    JSON.stringify(initial.images),
  );
  check(
    "partsPanelSitsBesideAssemblyCanvas",
    initial.partsTop < initial.canvas.top &&
      Math.abs(initial.partsTop - initial.component.top) < 2 &&
      initial.completionHidden &&
      initial.progressText === "0 / 5",
    JSON.stringify(initial),
  );
  await desktop.screenshot({
    path: path.join(ROOT, "dragon-assembly-layout-desktop.png"),
    fullPage: false,
  });
  screenshots.push("dragon-assembly-layout-desktop.png");

  const initialCenters = {
    left: initial.bucketLeft,
    right: initial.bucketRight,
    bead: initial.bead,
  };
  await desktop.setViewportSize({ width: 1920, height: 1080 });
  await desktop.waitForTimeout(220);
  const wide = await snapshot(desktop);
  check(
    "relativePartPositionsSurviveDesktopResize",
    normalizedDistance(initialCenters.left, wide.bucketLeft) < 0.004 &&
      normalizedDistance(initialCenters.right, wide.bucketRight) < 0.004 &&
      normalizedDistance(initialCenters.bead, wide.bead) < 0.004,
    JSON.stringify({
      initial: initialCenters,
      wide: {
        left: wide.bucketLeft,
        right: wide.bucketRight,
        bead: wide.bead,
      },
    }),
  );

  await desktop.evaluate(() => {
    [
      "bucketLeft",
      "bucketRight",
      "yoke",
      "dragonLeft",
      "dragonRight",
      "goldBead",
      "springLeft",
      "springRight",
      "pompomLeft",
      "pompomRight",
      "signLeft",
      "signRight",
    ].forEach((partId) =>
      window.dragonAssemblyComponent.installPart(partId),
    );
  });
  await desktop.waitForTimeout(3200);
  const completed = await snapshot(desktop);
  check(
    "assemblyLayersAndProgressPreviewSteps",
    completed.stageStep === 5 &&
      completed.componentStep === 5 &&
      completed.progressText === "5 / 5" &&
      completed.progressNow === "5" &&
      completed.bucketLeft.inside &&
      completed.bucketRight.inside &&
      completed.bead.inside &&
      Object.values(completed.layerOpacity).every(
        (opacity) => Number(opacity) > 0.95,
      ),
    JSON.stringify(completed),
  );
  check(
    "completionOverlayAppears",
    !completed.completionHidden &&
      completed.completionText.includes("四十八样，都在这担上了") &&
      completed.completionText.includes("好赛从宫里挑出来的") &&
      completed.completionText.includes("冯骥才《四十八样》原文"),
    completed.completionText,
  );
  await desktop.screenshot({
    path: path.join(ROOT, "dragon-assembly-layout-complete.png"),
    fullPage: false,
  });
  screenshots.push("dragon-assembly-layout-complete.png");

  const readerBefore = await desktop.evaluate(() => ({
    chapter: document.body.dataset.sishiPage,
    progress: localStorage.getItem("sishi-reading-progress-v1"),
  }));
  await desktop.locator("#dragonAssemblyReturn").click();
  await desktop.waitForTimeout(700);
  const returned = await desktop.evaluate(() => {
    const reader = document.querySelector("#sishiOriginal-chapter3");
    const rect = reader.getBoundingClientRect();
    return {
      chapter: document.body.dataset.sishiPage,
      readerVisible: rect.top < window.innerHeight && rect.bottom > 0,
      progress: localStorage.getItem("sishi-reading-progress-v1"),
    };
  });
  check(
    "returnStoryKeepsChapterAndReadingProgress",
    returned.chapter === "chapter3" &&
      returned.readerVisible &&
      returned.progress === readerBefore.progress,
    JSON.stringify({ readerBefore, returned }),
  );
  await desktop.context().close();

  const mobileSession = await createPage(browser, {
    width: 390,
    height: 844,
  });
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await openAssembly(mobile);
  const mobileLayout = await snapshot(mobile);
  const operationRatio = mobileLayout.workbench.ratio;
  check(
    "mobileKeepsOperationAreaRatioAndOrder",
    mobileLayout.workbench.height >= 280 &&
      mobileLayout.canvas.height >= 190 &&
      mobileLayout.partsTop > mobileLayout.canvasBottom &&
      mobileLayout.documentOverflow <= 1 &&
      mobileLayout.images.every((image) => image.loaded),
    JSON.stringify({ operationRatio, mobileLayout }),
  );
  await mobile.locator("#assemblyAdvance").click();
  await mobile.waitForTimeout(900);
  const mobileStep = await snapshot(mobile);
  check(
    "mobilePartsStayAlignedAfterStep",
    mobileStep.componentStep === 1 &&
      mobileStep.bucketLeft.inside &&
      mobileStep.bucketRight.inside &&
      mobileStep.progressText === "1 / 5",
    JSON.stringify(mobileStep),
  );
  await mobile.screenshot({
    path: path.join(ROOT, "dragon-assembly-layout-mobile.png"),
    fullPage: true,
  });
  screenshots.push("dragon-assembly-layout-mobile.png");
  await mobile.context().close();

  const missingAsset = await runMissingAssetFallback(browser);
  check(
    "missingAssetShowsNamedPlaceholder",
    !missingAsset.fallback.hidden &&
      missingAsset.fallback.missing &&
      missingAsset.fallback.text.includes("左链条缺失"),
    JSON.stringify(missingAsset),
  );
  check(
    "noBrowserErrors",
    errors.length === 0 && missingAsset.pageErrors.length === 0,
    [...errors, ...missingAsset.pageErrors].join("\n"),
  );
  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        passed,
        checkCount: report.checkCount,
        failed: Object.entries(checks)
          .filter(([, entry]) => !entry.passed)
          .map(([name]) => name),
        errors,
        report: REPORT,
      },
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
