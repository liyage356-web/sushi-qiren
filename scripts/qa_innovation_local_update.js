const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-innovation-local-update.json");
const candidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function openInnovation(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter5`, {
    waitUntil: "networkidle",
  });
  const stage = page.locator("#innovationStage");
  const interactionContent = stage.locator(".sishi-interaction-content");
  if (!(await interactionContent.isVisible())) {
    await page
      .locator(
        "#sishiOriginal-chapter5 .sishi-original-footer button.is-primary",
      )
      .click();
    await interactionContent.waitFor({ state: "visible" });
  }
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter5" &&
      document.querySelector("#innovationSceneImage")?.complete === true &&
      document.querySelector("#innovationSceneImage")?.naturalWidth > 0,
  );
}

async function snapshot(page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".innovation-frame");
    const image = document.querySelector("#innovationSceneImage");
    const button = document.querySelector("#innovationNext");
    const label = document.querySelector("#innovationNextLabel");
    const imageStyle = getComputedStyle(image);
    const frameRect = frame.getBoundingClientRect();
    return {
      step: Number(
        document.querySelector("#innovationExperience").dataset.innovationStep,
      ),
      labels: [
        ...document.querySelectorAll(".innovation-beats strong"),
      ].map((item) => item.textContent.trim()),
      current: [
        ...document.querySelectorAll(".innovation-beats [aria-current='step']"),
      ].map((item) => item.dataset.innovationStep),
      buttonText: label.textContent.replace(/\s+/g, " ").trim(),
      buttonHidden: button.hidden,
      arrowVisible: Boolean(
        button.querySelector("[aria-hidden='true']")?.textContent.trim(),
      ),
      buttonColor: getComputedStyle(button).backgroundColor,
      imageSource: decodeURIComponent(new URL(image.src).pathname),
      imageNaturalWidth: image.naturalWidth,
      imageNaturalHeight: image.naturalHeight,
      imageObjectFit: imageStyle.objectFit,
      frameRatio: frameRect.width / frameRect.height,
      naturalRatio: image.naturalWidth / image.naturalHeight,
      horizontalOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const checks = {};
  const errors = [];
  const screenshots = [];
  const check = (name, condition, detail = "") => {
    checks[name] = { passed: Boolean(condition), detail };
  };

  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) =>
    errors.push(`request failed: ${request.url()}`),
  );

  await openInnovation(page);
  await page.waitForTimeout(350);
  const initial = await snapshot(page);
  check(
    "initialSceneUsesNewImageWithoutDistortion",
    initial.step === 0 &&
      initial.imageSource.endsWith(
        "/assets/innovation-candy-peddler.png",
      ) &&
      initial.imageNaturalWidth === 1672 &&
      initial.imageNaturalHeight === 941 &&
      initial.imageObjectFit === "contain" &&
      Math.abs(initial.naturalRatio - 1672 / 941) < 0.001,
    JSON.stringify(initial),
  );
  check(
    "navigationLabelsAreSwappedWithoutMovingCards",
    initial.labels.join("|") === "担子被仿|三改出招|二爷点醒" &&
      initial.current.join("|") === "0",
    JSON.stringify(initial),
  );
  check(
    "firstAndSecondButtonCopyAreCorrect",
    initial.buttonText === "看俞六怎么变法" &&
      !initial.buttonHidden &&
      initial.arrowVisible,
    JSON.stringify(initial),
  );
  const initialShot = path.join(ROOT, "innovation-local-desktop.png");
  await page.screenshot({ path: initialShot });
  screenshots.push(path.basename(initialShot));

  await page.locator('[data-innovation-step="1"]').click();
  await page.waitForTimeout(220);
  const second = await snapshot(page);
  check(
    "secondNavigationStateUpdatesOnlyButtonCopy",
    second.step === 1 &&
      second.current.join("|") === "1" &&
      second.buttonText === "去后院问刘二爷" &&
      !second.buttonHidden &&
      second.labels.join("|") === "担子被仿|三改出招|二爷点醒",
    JSON.stringify(second),
  );

  await page.locator('[data-innovation-step="2"]').click();
  await page.waitForTimeout(220);
  const third = await snapshot(page);
  check(
    "thirdNavigationStateKeepsOriginalHiddenButtonBehavior",
    third.step === 2 &&
      third.current.join("|") === "2" &&
      third.buttonHidden &&
      third.labels.join("|") === "担子被仿|三改出招|二爷点醒",
    JSON.stringify(third),
  );

  await page.locator('[data-innovation-step="0"]').click();
  await page.locator("#innovationNext").click();
  await page.waitForTimeout(220);
  const nextBehavior = await snapshot(page);
  check(
    "existingNextActionStillAdvancesOneStep",
    nextBehavior.step === 1 &&
      nextBehavior.buttonText === "去后院问刘二爷",
    JSON.stringify(nextBehavior),
  );
  check(
    "desktopHasNoHorizontalOverflow",
    initial.horizontalOverflow <= 1 && nextBehavior.horizontalOverflow <= 1,
    JSON.stringify({
      initial: initial.horizontalOverflow,
      next: nextBehavior.horizontalOverflow,
    }),
  );

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobile.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });
  await openInnovation(mobile);
  await mobile.waitForTimeout(350);
  const mobileState = await snapshot(mobile);
  check(
    "mobileKeepsNewImageAndNavigationUsable",
    mobileState.horizontalOverflow <= 1 &&
      mobileState.imageObjectFit === "contain" &&
      mobileState.labels.join("|") === "担子被仿|三改出招|二爷点醒" &&
      mobileState.buttonText === "看俞六怎么变法",
    JSON.stringify(mobileState),
  );
  const mobileShot = path.join(ROOT, "innovation-local-mobile-390.png");
  await mobile.screenshot({ path: mobileShot });
  screenshots.push(path.basename(mobileShot));

  check("noBrowserErrors", errors.length === 0, errors.join("\n"));
  const passed = Object.values(checks).every((item) => item.passed);
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
          .filter(([, value]) => !value.passed)
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
  console.error(error);
  process.exitCode = 1;
});
