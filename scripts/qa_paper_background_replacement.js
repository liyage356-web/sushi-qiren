const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-paper-background-replacement.json");
const TARGET_COLOR = "rgb(237, 230, 214)";
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

function createRecorder() {
  const checks = [];
  const errors = [];
  return {
    checks,
    errors,
    check(name, passed, detail = null) {
      checks.push({ name, passed: Boolean(passed), detail });
    },
    error(stage, error) {
      errors.push({
        stage,
        message: error.stack || error.message || String(error),
      });
    },
  };
}

async function waitForApp(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => Boolean(window.niRenZhangStory && window.HAIZHANGWU_OVERLAY_CONFIG),
  );
  await page.waitForTimeout(180);
}

async function openHaizhangwuViewer(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/observe`, {
    waitUntil: "networkidle",
  });
  await waitForApp(page);
  const point = await page.evaluate(() => {
    const hotspot = document.querySelector("#nrSeaHotspot");
    const shape = document.querySelector("#nrSeaHotspotShape");
    const config = window.HAIZHANGWU_OVERLAY_CONFIG;
    const matrix = shape.getScreenCTM();
    const svgPoint = hotspot.createSVGPoint();
    const eye = config.keypoints.find((item) => item.id === "eye");
    svgPoint.x = config.transform.left + eye.x * config.transform.scale;
    svgPoint.y = config.transform.top + eye.y * config.transform.scale;
    const result = svgPoint.matrixTransform(matrix);
    return { x: result.x, y: result.y };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(
    () => document.querySelector("#haizhangwuViewer")?.hidden === false,
  );
  await page.waitForTimeout(450);
}

async function readBackground(page, selector) {
  return page.locator(selector).evaluate((element, selectorName) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      selector: selectorName,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundRepeat: style.backgroundRepeat,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }, selector);
}

function isTargetBackground(background) {
  return (
    background.backgroundColor === TARGET_COLOR &&
    background.backgroundImage === "none"
  );
}

async function testHaizhangwu(page, recorder, viewportName) {
  await openHaizhangwuViewer(page);
  const background = await readBackground(page, ".hzw-sheet");
  recorder.check(
    `${viewportName}: 海张五人物细观使用目标纯色`,
    isTargetBackground(background),
    background,
  );

  const structure = await page.evaluate(() => ({
    title: document.querySelector("#hzwTitle")?.textContent.trim(),
    figureVisible: Boolean(
      document.querySelector(".hzw-portrait-frame")?.getBoundingClientRect()
        .width,
    ),
    infoVisible: Boolean(
      document.querySelector(".hzw-info")?.getBoundingClientRect().width,
    ),
    controls: document.querySelectorAll(".hzw-controls button").length,
    closeVisible:
      document.querySelector(".hzw-close")?.getBoundingClientRect().width > 0,
  }));
  recorder.check(
    `${viewportName}: 海张五标题、人物、说明面板、控制按钮和关闭入口保留`,
    structure.title === "人物细观 · 海张五" &&
      structure.figureVisible &&
      structure.infoVisible &&
      structure.controls >= 5 &&
      structure.closeVisible,
    structure,
  );

  const infoBackground = await readBackground(page, ".hzw-info");
  recorder.check(
    `${viewportName}: 右侧说明面板原有半透明底色未被替换`,
    infoBackground.backgroundColor !== TARGET_COLOR &&
      infoBackground.backgroundColor !== "rgba(0, 0, 0, 0)",
    infoBackground,
  );

  await page.locator('[data-hzw-rotate="1"]').click();
  await page.waitForFunction(
    () => document.querySelector("#hzwAngleReadout")?.textContent.trim() !== "0°",
  );
  const angle = await page.locator("#hzwAngleReadout").textContent();
  recorder.check(
    `${viewportName}: 人物旋转按钮仍可推进视角`,
    angle.trim() === "45°",
    { angle: angle.trim() },
  );

  await page.locator(".hzw-close").click();
  await page.waitForFunction(
    () => document.querySelector("#haizhangwuViewer")?.hidden === true,
  );
  recorder.check(`${viewportName}: 海张五细观关闭后返回原页面`, true);
}

async function openClayWorkshop(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/craft`, {
    waitUntil: "networkidle",
  });
  await waitForApp(page);
  await page.locator("#nrPageCraft").waitFor({ state: "visible" });
  await page.locator("#nrOpenClayStudio").click();
  await page.locator("#nrClayWelcome").waitFor({ state: "visible" });
  await page.waitForTimeout(220);
}

async function testClayWorkshop(page, recorder, viewportName) {
  await openClayWorkshop(page);

  const welcome = await readBackground(page, ".nr-clay-welcome-sheet");
  recorder.check(
    `${viewportName}: 捏泥工坊欢迎窗使用目标纯色`,
    isTargetBackground(welcome),
    welcome,
  );

  await page.locator("#nrClayOpenTutorial").click();
  await page.locator("#nrClayTutorialOverlay").waitFor({ state: "visible" });
  const tutorial = await readBackground(page, ".nr-clay-tutorial-sheet");
  recorder.check(
    `${viewportName}: 捏泥教学窗使用目标纯色`,
    isTargetBackground(tutorial),
    tutorial,
  );
  await page.locator("#nrClayCloseTutorial").click();

  const skipWelcome = page.locator("#nrClaySkipWelcome");
  if (await skipWelcome.isVisible()) await skipWelcome.click();
  await page.locator("#nrClayWorkshop").waitFor({ state: "visible" });
  await page.locator('[data-reference-open]').first().click();
  await page.locator("#nrClayReferenceLightbox").waitFor({ state: "visible" });
  const reference = await readBackground(page, ".nr-clay-reference-sheet");
  recorder.check(
    `${viewportName}: 人物参考窗使用目标纯色`,
    isTargetBackground(reference),
    reference,
  );
  await page.locator("#nrClayCloseReference").click();

  await page.locator("#nrClayComplete").click();
  await page.locator("#nrClayPresentation").waitFor({ state: "visible" });
  const presentation = await readBackground(page, ".nr-clay-presentation-sheet");
  recorder.check(
    `${viewportName}: 作品展示窗使用目标纯色`,
    isTargetBackground(presentation),
    presentation,
  );

  const artworkPaper = await readBackground(page, ".nr-clay-presentation-paper");
  recorder.check(
    `${viewportName}: 作品预览纸面保留原有宣纸质感`,
    artworkPaper.backgroundImage.includes("paper-fibers.png")
      && artworkPaper.backgroundColor !== TARGET_COLOR,
    artworkPaper,
  );

  await page.locator("#nrClayContinueEditing").click();
  await page.locator("#nrClayPresentation").waitFor({ state: "hidden" });
  recorder.check(`${viewportName}: 作品展示窗仍可返回继续编辑`, true);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const recorder = createRecorder();
  const runs = [];

  try {
    for (const viewport of [
      { name: "desktop-1440x900", width: 1440, height: 900 },
      { name: "mobile-390x844", width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const run = {
        viewport: viewport.name,
        targetColor: TARGET_COLOR,
        passed: false,
      };
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        recorder.error(`${viewport.name}:pageerror`, error),
      );
      page.on("console", (message) => {
        if (message.type() === "error") {
          recorder.error(`${viewport.name}:console`, message.text());
        }
      });
      try {
        await testHaizhangwu(page, recorder, viewport.name);
        await testClayWorkshop(page, recorder, viewport.name);
        run.passed = true;
      } catch (error) {
        recorder.error(viewport.name, error);
      } finally {
        await context.close();
      }
      runs.push(run);
    }
  } finally {
    await browser.close();
  }

  const failed = recorder.checks
    .filter((check) => !check.passed)
    .map((check) => check.name);
  const report = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    targetColor: TARGET_COLOR,
    targetWindows: [
      "海张五人物细观",
      "自由捏泥工坊：欢迎、教学、人物参考、作品展示",
    ],
    preservedRegions: [
      "海张五右侧说明面板",
      "人物旋转控制及关闭流程",
      "捏泥工坊作品预览宣纸",
      "作品展示返回继续编辑",
    ],
    runs,
    checks: recorder.checks,
    assertionCount: recorder.checks.length,
    failed,
    errors: recorder.errors,
    passed: failed.length === 0 && recorder.errors.length === 0,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
