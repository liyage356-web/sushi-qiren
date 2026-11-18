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

const expectedLines = [
  "天津药糖家家好",
  "四十八样数第一",
  "一色一味块块香",
  "再饶半块随您意",
  "俞家能耐不传女",
  "谁我儿子谁学艺",
];

function findBrowser() {
  return candidateExecutables.find((executable) => fs.existsSync(executable));
}

async function waitForImages(page) {
  await page.waitForFunction(() =>
    [...document.images]
      .filter((image) => image.closest("#wordsStage"))
      .every((image) => image.complete),
  );
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 1366, height: 960 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(`desktop pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`desktop console: ${message.text()}`);
  });

  await page.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await page.locator("#wordsStage").scrollIntoViewIfNeeded();
  await waitForImages(page);
  await page.waitForTimeout(450);

  const initial = await page.evaluate(() => {
    const stage = document.querySelector("#wordStage");
    const walker = document.querySelector("#wordWalker");
    const crowd = document.querySelector(".words-crowd");
    return {
      step: Number(stage.dataset.wordStep),
      progress: document.querySelector("#wordProgress").getAttribute("aria-valuenow"),
      nextLabel: document.querySelector("#wordNextLabel").textContent.trim(),
      backDisabled: document.querySelector("#wordBack").disabled,
      voiceDisabled: document.querySelector("#dialectToggle").disabled,
      voiceChecked: document.querySelector("#dialectToggle").getAttribute("aria-checked"),
      completeHidden: document.querySelector("#wordComplete").hidden,
      applauseHidden: document.querySelector("#wordApplause").hidden,
      crowdLoaded: crowd.complete && crowd.naturalWidth > 0,
      walkerLoaded: walker.querySelector("img").complete &&
        walker.querySelector("img").naturalWidth > 0,
      walkerPosition: {
        left: walker.style.getPropertyValue("--word-left"),
        bottom: walker.style.getPropertyValue("--word-bottom"),
      },
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  await page.screenshot({
    path: path.join(process.cwd(), "si-shi-ba-stage5-initial-1366.png"),
    fullPage: false,
  });

  const steps = [];
  for (let index = 1; index <= expectedLines.length; index += 1) {
    await page.locator("#wordNext").click();
    await page.waitForTimeout(220);
    steps.push(await page.evaluate(() => {
      const walker = document.querySelector("#wordWalker");
      return {
        step: Number(document.querySelector("#wordStage").dataset.wordStep),
        progress: document.querySelector("#wordProgress").getAttribute("aria-valuenow"),
        revealed: document.querySelectorAll("#wordLines .is-revealed").length,
        current: document.querySelector("#wordsPanelTitle").textContent.trim(),
        nextLabel: document.querySelector("#wordNextLabel").textContent.trim(),
        nextDisabled: document.querySelector("#wordNext").disabled,
        completeHidden: document.querySelector("#wordComplete").hidden,
        walkerLeft: walker.style.getPropertyValue("--word-left"),
        walkerBottom: walker.style.getPropertyValue("--word-bottom"),
      };
    }));
  }

  await page.locator("#wordStage").screenshot({
    path: path.join(process.cwd(), "si-shi-ba-stage5-step6-stage-1366.png"),
  });
  await page.locator("#wordComplete").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const complete = await page.evaluate(() => ({
    lines: [...document.querySelectorAll("#wordLines li p")]
      .map((line) => line.textContent.trim()),
    completeHidden: document.querySelector("#wordComplete").hidden,
    applauseHidden: document.querySelector("#wordApplause").hidden,
    progress: document.querySelector("#wordProgress").getAttribute("aria-valuenow"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  await page.screenshot({
    path: path.join(process.cwd(), "si-shi-ba-stage5-complete-1366.png"),
    fullPage: false,
  });

  await page.locator("#wordsReading").click();
  const readingDialogOpen = await page.locator("#readingDialog").evaluate(
    (dialog) => dialog.open,
  );
  await page.locator("#readingClose").click();
  await page.locator("#wordReplayComplete").click();
  await page.waitForTimeout(120);
  const replay = await page.evaluate(() => ({
    step: Number(document.querySelector("#wordStage").dataset.wordStep),
    completeHidden: document.querySelector("#wordComplete").hidden,
    nextDisabled: document.querySelector("#wordNext").disabled,
  }));

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  mobilePage.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobilePage.on("console", (message) => {
    if (message.type() === "error") errors.push(`mobile console: ${message.text()}`);
  });
  await mobilePage.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await mobilePage.locator("#wordsStage").scrollIntoViewIfNeeded();
  await waitForImages(mobilePage);
  await mobilePage.waitForTimeout(350);
  await mobilePage.locator("#wordNext").click();
  await mobilePage.locator("#wordNext").click();
  await mobilePage.waitForTimeout(250);
  const mobile = await mobilePage.evaluate(() => {
    const section = document.querySelector("#wordsStage").getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      sectionWidth: Math.round(section.width),
      step: Number(document.querySelector("#wordStage").dataset.wordStep),
      revealed: document.querySelectorAll("#wordLines .is-revealed").length,
      nextVisible: document.querySelector("#wordNext").getBoundingClientRect().width > 0,
      stageHeight: Math.round(
        document.querySelector("#wordStage").getBoundingClientRect().height,
      ),
    };
  });
  await mobilePage.locator("#wordStage").screenshot({
    path: path.join(process.cwd(), "si-shi-ba-stage5-step2-mobile-390.png"),
  });

  const reducedPage = await browser.newPage({
    viewport: { width: 1024, height: 800 },
  });
  reducedPage.on("pageerror", (error) =>
    errors.push(`reduced pageerror: ${error.message}`),
  );
  await reducedPage.goto("http://127.0.0.1:4173/si-shi-ba-yang/", {
    waitUntil: "networkidle",
  });
  await reducedPage.locator("#motionToggle").click();
  for (let index = 0; index < expectedLines.length; index += 1) {
    await reducedPage.locator("#wordNext").click();
  }
  const reduced = await reducedPage.evaluate(() => ({
    step: Number(document.querySelector("#wordStage").dataset.wordStep),
    revealed: document.querySelectorAll("#wordLines .is-revealed").length,
    completeVisible: !document.querySelector("#wordComplete").hidden,
  }));

  const entryPage = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  entryPage.on("pageerror", (error) =>
    errors.push(`entry pageerror: ${error.message}`),
  );
  await entryPage.goto("http://127.0.0.1:4173/index.html#street", {
    waitUntil: "networkidle",
  });
  await entryPage.locator(".hotspot-candy").click();
  await entryPage.waitForTimeout(420);
  const entryButton = entryPage.locator("#modalActionButton");
  const entryButtonVisible = await entryButton.isVisible();
  const entry = {
    character: await entryButton.getAttribute("data-character"),
    buttonVisible: entryButtonVisible,
  };
  if (entryButtonVisible) {
    await entryButton.click();
    await entryPage.waitForTimeout(1200);
  }
  entry.destinationUrl = entryPage.url();
  entry.wordsStageVisible = await entryPage.locator("#wordsStage").count() === 1;

  await browser.close();

  const linesMatch = JSON.stringify(complete.lines) === JSON.stringify(expectedLines);
  const stepsAdvance = steps.every((entry, index) =>
    entry.step === index + 1 &&
    entry.progress === String(index + 1) &&
    entry.revealed === index + 1,
  );
  const walkerAdvances = steps.every((entry, index) =>
    index === 0 ||
    (entry.walkerLeft !== steps[index - 1].walkerLeft &&
      entry.walkerBottom !== steps[index - 1].walkerBottom),
  );

  console.log(JSON.stringify({
    browser: executablePath,
    initial,
    steps,
    complete,
    readingDialogOpen,
    replay,
    mobile,
    reduced,
    entry,
    assertions: {
      linesMatch,
      stepsAdvance,
      walkerAdvances,
      desktopNoOverflow: initial.overflow <= 0 && complete.overflow <= 0,
      mobileNoOverflow: mobile.overflow <= 0,
      entryReachesStageFive: entry.destinationUrl.endsWith("/si-shi-ba-yang/index.html") &&
        entry.wordsStageVisible,
      noRuntimeErrors: errors.length === 0,
    },
    errors,
  }, null, 2));

  if (
    !linesMatch ||
    !stepsAdvance ||
    !walkerAdvances ||
    initial.overflow > 0 ||
    complete.overflow > 0 ||
    mobile.overflow > 0 ||
    errors.length
  ) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
