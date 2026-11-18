const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const candidateExecutables = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidateExecutables.find((executable) => fs.existsSync(executable));
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.log("No installed Edge/Chrome executable found.");
    console.log("Playwright Chromium:", chromium.executablePath());
    return;
  }

  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 960 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await page.locator("#innovationStage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);

  const initial = await page.evaluate(() => {
    const stage = document.querySelector("#innovationStage");
    const image = document.querySelector("#innovationSceneImage");
    return {
      step: stage.querySelector("#innovationExperience").dataset.innovationStep,
      title: stage.querySelector("#innovationPanelTitle").textContent.trim(),
      imageLoaded: image.complete && image.naturalWidth > 0,
      imageWidth: image.naturalWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await page.screenshot({
    path: path.join(process.cwd(), "archive-si-shi-ba-stage4-initial-1366.png"),
    fullPage: false,
  });

  await page.locator("#innovationNext").click();
  await page.waitForTimeout(250);
  const mentor = await page.evaluate(() => ({
    step: document.querySelector("#innovationExperience").dataset.innovationStep,
    noteVisible: !document.querySelector("#innovationMentorNote").hidden,
    heading: document.querySelector("#innovationPanelTitle").textContent.trim(),
  }));

  await page.locator("#innovationNext").click();
  await page.waitForTimeout(250);
  const choiceStep = await page.evaluate(
    () => document.querySelector("#innovationExperience").dataset.innovationStep,
  );
  await page.locator('[data-innovation-choice="language"]').click();
  const choice = await page.evaluate(() => ({
    choiceVisible: !document.querySelector("#innovationChoiceCopy").hidden,
    choiceTitle: document.querySelector("#innovationChoiceTitle").textContent.trim(),
    pressed: document
      .querySelector('[data-innovation-choice="language"]')
      .getAttribute("aria-pressed"),
  }));
  await page.screenshot({
    path: path.join(process.cwd(), "archive-si-shi-ba-stage4-choices-1366.png"),
    fullPage: false,
  });

  await page.locator("#innovationOrderButton").click();
  await page.waitForTimeout(2200);
  const result = await page.evaluate(() => ({
    resolutionVisible: !document.querySelector("#innovationResolution").hidden,
    revealed: document.querySelectorAll(
      "#innovationOrder [data-innovation-order].is-revealed",
    ).length,
    label: document.querySelector("#innovationOrderButtonLabel").textContent.trim(),
    signatureLoaded: (() => {
      const image = document.querySelector("#innovationResolution img");
      return image.complete && image.naturalWidth > 0;
    })(),
  }));
  await page.locator("#innovationReading").click();
  const readingDialogOpen = await page.locator("#readingDialog").evaluate(
    (dialog) => dialog.open,
  );
  await page.locator("#readingClose").click();
  await page.locator("#innovationResolution").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(process.cwd(), "archive-si-shi-ba-stage4-result-1366.png"),
    fullPage: false,
  });

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  mobilePage.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobilePage.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`mobile console: ${message.text()}`);
    }
  });
  await mobilePage.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await mobilePage.locator("#innovationStage").scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(300);
  const mobileInitial = await mobilePage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    stageWidth: Math.round(
      document.querySelector("#innovationStage").getBoundingClientRect().width,
    ),
  }));
  await mobilePage.screenshot({
    path: path.join(process.cwd(), "archive-si-shi-ba-stage4-initial-mobile-390.png"),
    fullPage: false,
  });

  const reducedPage = await browser.newPage({
    viewport: { width: 1024, height: 800 },
  });
  reducedPage.on("pageerror", (error) =>
    errors.push(`reduced-motion pageerror: ${error.message}`),
  );
  await reducedPage.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await reducedPage.locator("#motionToggle").click();
  await reducedPage.locator("#innovationNext").click();
  await reducedPage.locator("#innovationNext").click();
  await reducedPage.locator('[data-innovation-choice="routine"]').click();
  await reducedPage.locator("#innovationOrderButton").click();
  const reducedMotion = await reducedPage.evaluate(() => ({
    resolutionVisible: !document.querySelector("#innovationResolution").hidden,
    revealed: document.querySelectorAll(
      "#innovationOrder [data-innovation-order].is-revealed",
    ).length,
    imageLoaded: (() => {
      const image = document.querySelector("#innovationSceneImage");
      return image.complete && image.naturalWidth > 0;
    })(),
  }));

  await mobilePage.locator('[data-innovation-step="2"]').click();
  await mobilePage.locator('[data-innovation-choice="reward"]').click();
  await mobilePage.locator("#innovationOrderButton").click();
  await mobilePage.waitForTimeout(2200);
  await mobilePage.evaluate(() =>
    document
      .querySelector("#innovationResolution")
      .scrollIntoView({ block: "start" }),
  );
  await mobilePage.waitForTimeout(250);
  const mobileResult = await mobilePage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    resolutionVisible: !document.querySelector("#innovationResolution").hidden,
    revealed: document.querySelectorAll(
      "#innovationOrder [data-innovation-order].is-revealed",
    ).length,
  }));
  await mobilePage.screenshot({
    path: path.join(process.cwd(), "archive-si-shi-ba-stage4-result-mobile-390.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(
    JSON.stringify(
      {
        browser: executablePath,
        initial,
        mentor,
        choiceStep,
        choice,
        result,
        readingDialogOpen,
        mobileInitial,
        mobileResult,
        reducedMotion,
        errors,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
