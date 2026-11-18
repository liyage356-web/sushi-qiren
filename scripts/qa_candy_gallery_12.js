const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-candy-gallery-12.json");
const EXPECTED_NAMES = [
  "茶膏糖",
  "丹桂糖",
  "鲜姜糖",
  "玫瑰糖",
  "豆蔻糖",
  "橘皮糖",
  "薄荷糖",
  "酸梅糖",
  "鸭梨糖",
  "枇杷糖",
  "西瓜糖",
  "樱桃糖",
];
const candidateExecutables = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  return candidateExecutables.find((executable) => fs.existsSync(executable));
}

async function openCandyInteraction(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter1`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  const gateButton = page
    .locator("#sishiOriginal-chapter1")
    .getByRole("button", { name: "进入本段互动" });
  if (await gateButton.isVisible()) await gateButton.click();
  await page.waitForFunction(
    () =>
      document.querySelector("#candyCabinet .sishi-interaction-content")
        ?.hidden === false &&
      document.querySelectorAll("#candyCabinet .candy-box").length === 12,
  );
  await page.locator("#candyCabinet").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("#candyGrid .candy-box")];
    const grid = document.querySelector("#candyGrid");
    const rects = cards.map((card) => ({
      left: card.offsetLeft,
      top: card.offsetTop,
      width: card.offsetWidth,
      height: card.offsetHeight,
      bottom: card.offsetTop + card.offsetHeight,
    }));
    return {
      columnCount: new Set(rects.map((rect) => rect.left)).size,
      rowCount: new Set(rects.map((rect) => rect.top)).size,
      rects,
      gridHeight: grid.clientHeight,
      gridWidth: grid.clientWidth,
      gridScrollHeight: grid.scrollHeight,
      gridScrollWidth: grid.scrollWidth,
      pageHasHorizontalOverflow:
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

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`desktop pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`desktop console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/assets/candy-12/")) {
      errors.push(`candy image request failed: ${request.url()}`);
    }
  });

  await openCandyInteraction(page);

  const cardSnapshot = await page.evaluate(() => {
    return [...document.querySelectorAll("#candyGrid .candy-box")].map((card) => {
      const image = card.querySelector("img");
      return {
        label: card.getAttribute("aria-label"),
        imageFile: decodeURIComponent(new URL(image.src).pathname.split("/").pop()),
        imageLoaded: image.complete && image.naturalWidth > 0,
      };
    });
  });
  const cardNames = cardSnapshot.map((card) => card.label.replace(/^打开第\d+盒，/, ""));

  check(
    "titleShowsTwelveTrialCards",
    (
      await page.locator(".cabinet-heading strong").textContent()
    )?.includes("四十八样 · 试看十二格") &&
      (await page.locator("#candyTitle").textContent()) ===
        "掀开玻璃盖，先认十二样糖",
  );
  check("cardCountIsTwelve", cardSnapshot.length === 12, String(cardSnapshot.length));
  check(
    "cardOrderMatchesArtworkSheet",
    JSON.stringify(cardNames) === JSON.stringify(EXPECTED_NAMES),
    JSON.stringify(cardNames),
  );
  check(
    "allCardImagesLoad",
    cardSnapshot.every((card) => card.imageLoaded),
    JSON.stringify(cardSnapshot),
  );
  check(
    "cardImagesUseIndependentAssets",
    cardSnapshot.every((card) => /^\d{2}-.+\.png$/.test(card.imageFile)) &&
      new Set(cardSnapshot.map((card) => card.imageFile)).size === 12,
    JSON.stringify(cardSnapshot.map((card) => card.imageFile)),
  );

  const desktopLayout = await collectLayout(page);
  check(
    "desktopUsesThreeRowsByFourColumns",
    desktopLayout.rowCount === 3 && desktopLayout.columnCount === 4,
    JSON.stringify(desktopLayout),
  );
  check(
    "desktopCardsKeepFourByThreeBoxes",
    desktopLayout.rects.every(
      (rect) => Math.abs(rect.width / rect.height - 4 / 3) < 0.04,
    ),
    JSON.stringify(desktopLayout.rects),
  );
  check(
    "desktopThirdRowIsNotClipped",
    desktopLayout.rects.at(-1).bottom <= desktopLayout.gridHeight + 1 &&
      desktopLayout.gridScrollHeight <= desktopLayout.gridHeight + 1,
    JSON.stringify(desktopLayout),
  );
  check("desktopHasNoHorizontalOverflow", !desktopLayout.pageHasHorizontalOverflow);

  for (let index = 0; index < EXPECTED_NAMES.length; index += 1) {
    await page.locator("#candyGrid .candy-box").nth(index).click();
    await page.waitForTimeout(160);
    const detail = await page.evaluate(() => ({
      name: document.querySelector("#candyName")?.textContent,
      previewFile: decodeURIComponent(
        new URL(document.querySelector("#candyPreviewImage").src).pathname
          .split("/")
          .pop(),
      ),
      progress: document.querySelector("#candyProgress")?.textContent,
      pressedIndex: [
        ...document.querySelectorAll("#candyGrid .candy-box"),
      ].findIndex((card) => card.getAttribute("aria-pressed") === "true"),
    }));
    check(
      `opensCard${String(index + 1).padStart(2, "0")}`,
      detail.name === EXPECTED_NAMES[index] &&
        detail.previewFile === cardSnapshot[index].imageFile &&
        detail.progress === String(index + 1) &&
        detail.pressedIndex === index,
      JSON.stringify(detail),
    );
  }

  await page.locator("#candyGrid .candy-box").first().click();
  await page.waitForTimeout(160);
  const finalState = await page.evaluate(() => ({
    progress: document.querySelector("#candyProgress")?.textContent,
    progressMax: document.querySelector("#candyDots")?.getAttribute("aria-valuemax"),
    viewedCount: document.querySelectorAll("#candyGrid .candy-box.is-viewed").length,
    stored: JSON.parse(
      localStorage.getItem("sushi-qiren:candy-identified:v1") || "[]",
    ),
  }));
  check(
    "repeatClickDoesNotDoubleCount",
    finalState.progress === "12" && finalState.viewedCount === 12,
    JSON.stringify(finalState),
  );
  check(
    "twelveUniqueIdsArePersisted",
    Array.isArray(finalState.stored) &&
      finalState.stored.length === 12 &&
      new Set(finalState.stored).size === 12,
    JSON.stringify(finalState.stored),
  );
  check("progressMaximumIsTwelve", finalState.progressMax === "12", finalState.progressMax);

  await page.locator("#candyCabinet").screenshot({
    path: path.join(ROOT, "candy-gallery-12-desktop.png"),
  });

  const continueButton = page.locator("#candyToAssembly");
  const continueButtonText = (await continueButton.textContent())
    .replace(/\s+/g, " ")
    .trim();
  check(
    "detailCardButtonCopyIsUpdated",
    continueButtonText === "十二样看罢，去学绝活 →",
    continueButtonText,
  );

  await continueButton.click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter2",
  );
  await page.waitForTimeout(120);
  await page.waitForFunction(
    () => {
      const reader = document.querySelector("#sishiOriginal-chapter2");
      if (!reader) return false;
      const toolbar = document.querySelector(".topbar");
      const nav = document.querySelector("#sishiChapterNav");
      const expected =
        toolbar.getBoundingClientRect().height +
        nav.getBoundingClientRect().height +
        12;
      return Math.abs(reader.getBoundingClientRect().top - expected) <= 3;
    },
    { timeout: 2500 },
  );
  const chapterTwoRoute = await page.evaluate(() => {
    const reader = document.querySelector("#sishiOriginal-chapter2");
    const readerRect = reader.getBoundingClientRect();
    const toolbarRect = document.querySelector(".topbar").getBoundingClientRect();
    const navRect = document
      .querySelector("#sishiChapterNav")
      .getBoundingClientRect();
    return {
      hash: window.location.hash,
      page: document.body.dataset.sishiPage,
      activeNav: document
        .querySelector("#sishiChapterNav [aria-current='page'] strong")
        ?.textContent.trim(),
      readerTop: readerRect.top,
      expectedTop: toolbarRect.height + navRect.height + 12,
      assemblyVisible:
        document.querySelector("#assemblyBackyard").getClientRects().length > 0,
      candyProgress: document.querySelector("#candyProgress")?.textContent,
      firstParagraph: reader
        .querySelector(".sishi-original-text p")
        ?.textContent.trim()
        .slice(0, 18),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  check(
    "buttonRoutesToChapterTwoReadingStart",
    chapterTwoRoute.hash === "#sishi/chapter2" &&
      chapterTwoRoute.page === "chapter2" &&
      chapterTwoRoute.activeNav === "二爷指点" &&
      Math.abs(chapterTwoRoute.readerTop - chapterTwoRoute.expectedTop) <= 3 &&
      !chapterTwoRoute.assemblyVisible &&
      chapterTwoRoute.candyProgress === "12" &&
      chapterTwoRoute.firstParagraph.length === 18 &&
      chapterTwoRoute.overflow <= 1,
    JSON.stringify(chapterTwoRoute),
  );

  await page
    .locator("#sishiChapterNav [data-sishi-page='chapter1']")
    .click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  check(
    "candyCollectionSurvivesReturn",
    (await page.locator("#candyProgress").textContent()) === "12" &&
      (await page.locator("#candyGrid .candy-box.is-viewed").count()) === 12 &&
      (await page
        .locator("#candyCabinet .sishi-interaction-content")
        .isVisible()),
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      document.body.dataset.sishiPage === "chapter1" &&
      document.querySelector("#candyProgress")?.textContent === "12",
  );
  check(
    "identifiedStateSurvivesReload",
    (await page.locator("#candyGrid .candy-box.is-viewed").count()) === 12,
  );

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("pageerror", (error) =>
    errors.push(`mobile pageerror: ${error.message}`),
  );
  mobilePage.on("console", (message) => {
    if (message.type() === "error") errors.push(`mobile console: ${message.text()}`);
  });

  await openCandyInteraction(mobilePage);
  const mobileLayout = await collectLayout(mobilePage);
  check(
    "mobileUsesTwoColumnsForAllTwelve",
    mobileLayout.rowCount === 6 && mobileLayout.columnCount === 2,
    JSON.stringify(mobileLayout),
  );
  check(
    "mobileLastRowIsNotClipped",
    mobileLayout.rects.at(-1).bottom <= mobileLayout.gridHeight + 1 &&
      mobileLayout.gridScrollHeight <= mobileLayout.gridHeight + 1,
    JSON.stringify(mobileLayout),
  );
  check("mobileHasNoHorizontalOverflow", !mobileLayout.pageHasHorizontalOverflow);
  await mobilePage.locator("#candyCabinet").screenshot({
    path: path.join(ROOT, "candy-gallery-12-mobile-390.png"),
  });

  check("noBrowserErrors", errors.length === 0, errors.join("\n"));
  const passed = Object.values(checks).every((item) => item.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
    screenshots: [
      "candy-gallery-12-desktop.png",
      "candy-gallery-12-mobile-390.png",
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
