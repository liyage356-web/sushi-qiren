const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-prelude.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const PRELUDE_TEXT =
  "手艺道上的人，捏泥人的“泥人张”排第一。而且，有第一，没第二，第三差着十万八千里。 泥人张大名叫张明山。咸丰年间常去的地方有两处：一是东北城角的戏院大观楼，一是北关口的饭馆天庆馆。坐在那儿，为了瞧各样的人，也为捏各样的人。";
const THEATRE_TEXT = "去大观楼要看戏台上的各种角色，";
const ARRIVAL_TEXT =
  "去天庆馆要看人世间的各种角色。这后一种的样儿更多。";

function browserExecutable() {
  const executable = BROWSERS.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

function normalize(text) {
  return text.replace(/\s+/g, "");
}

async function readState(page) {
  return page.evaluate(() => {
    const activePage = document.querySelector(
      "[data-nr-page-panel]:not([hidden])",
    );
    const activeNav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );
    const reader = document.querySelector("#nrPreludeReader");
    const preludeImage = document.querySelector(".nr-prelude-background");
    const theatreImage = document.querySelector(
      "#nrPageTheatre .nr-prelude-scene-target > img",
    );
    const arrivalImage = document.querySelector(
      "#nrPageArrival .nr-prelude-scene-target > img",
    );
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      hash: location.hash,
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      activePage: activePage?.dataset.nrPagePanel || null,
      activeNav: activeNav?.dataset.nrPage || null,
      preludeState: window.niRenZhangStory?.getPreludeState(),
      preludeCopy: document.querySelector("#nrPreludeText")?.textContent.trim(),
      theatreCopy: document
        .querySelector("#nrPageTheatre .nr-prelude-scene-copy")
        ?.textContent.trim(),
      arrivalCopy: document
        .querySelector("#nrPageArrival .nr-prelude-scene-copy")
        ?.textContent.trim(),
      restaurantTitle: document
        .querySelector("#nrRestaurantTitle")
        ?.textContent.trim(),
      text: {
        clientHeight: reader.clientHeight,
        scrollHeight: reader.scrollHeight,
        scrollTop: reader.scrollTop,
        overflowY: getComputedStyle(reader).overflowY,
        fontSize: getComputedStyle(
          document.querySelector("#nrPreludeText"),
        ).fontSize,
        lineHeight: getComputedStyle(
          document.querySelector("#nrPreludeText"),
        ).lineHeight,
        rect: rectOf(reader),
      },
      images: {
        prelude: {
          loaded: preludeImage.complete && preludeImage.naturalWidth > 0,
          source: preludeImage.getAttribute("src"),
          width: preludeImage.naturalWidth,
          height: preludeImage.naturalHeight,
          objectFit: getComputedStyle(preludeImage).objectFit,
        },
        theatre: {
          loaded: theatreImage.complete && theatreImage.naturalWidth > 0,
          source: theatreImage.getAttribute("src"),
          width: theatreImage.naturalWidth,
          height: theatreImage.naturalHeight,
          objectFit: getComputedStyle(theatreImage).objectFit,
        },
        arrival: {
          loaded: arrivalImage.complete && arrivalImage.naturalWidth > 0,
          source: arrivalImage.getAttribute("src"),
          width: arrivalImage.naturalWidth,
          height: arrivalImage.naturalHeight,
          objectFit: getComputedStyle(arrivalImage).objectFit,
        },
      },
      horizontalOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function scrollReaderTo(page, progress) {
  await page.evaluate((targetProgress) => {
    const reader = document.querySelector("#nrPreludeReader");
    const maxScroll = reader.scrollHeight - reader.clientHeight;
    reader.scrollTop = Math.max(0, maxScroll * targetProgress);
  }, progress);
  await page.waitForTimeout(100);
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#street`, {
    waitUntil: "networkidle",
  });
  await page.locator(".hotspot-clay").click();
  await page.locator("#nrPagePrelude").waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-prelude-desktop.png"),
  });

  await page.waitForTimeout(1100);
  const idle = await readState(page);
  await scrollReaderTo(page, 0.55);
  const midpoint = await readState(page);
  await scrollReaderTo(page, 1);
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "theatre",
    null,
    { timeout: 3000 },
  );
  const theatre = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-prelude-theatre-desktop.png"),
  });

  await page.mouse.click(700, 420);
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "arrival",
    null,
    { timeout: 2000 },
  );
  const arrival = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-prelude-arrival-desktop.png"),
  });

  await page.mouse.click(700, 420);
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "restaurant",
    null,
    { timeout: 2000 },
  );
  const restaurant = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-prelude-restaurant-desktop.png"),
  });

  const existingChapterFlow = [];
  for (const chapter of [
    "observe",
    "craft",
    "reveal",
    "market",
    "ending",
    "reflection",
  ]) {
    await page.locator(`[data-nr-page="${chapter}"]`).click();
    await page.waitForFunction(
      (pageName) =>
        window.niRenZhangStory.getCurrentPage() === pageName,
      chapter,
    );
    const state = await readState(page);
    existingChapterFlow.push({
      expected: chapter,
      currentPage: state.currentPage,
      activePage: state.activePage,
    });
  }

  await page.locator("#niRenZhangOriginalButton").click();
  await page.locator("#sharedOriginalReader").waitFor({
    state: "visible",
  });
  const originalParagraphCount = await page
    .locator(".shared-original-reader__text p")
    .count();
  await page.locator(".shared-original-reader__close").click();
  await page.locator("#sharedOriginalReader").waitFor({
    state: "hidden",
  });

  await page.locator("#niRenZhangRestartButton").click();
  await page.locator("#nrPagePrelude").waitFor({ state: "visible" });
  const restarted = await readState(page);
  await page.locator("#niRenZhangBackButton").click();
  const returnedToStreet = await page.evaluate(() => ({
    experienceHidden: document.querySelector("#niRenZhangExperience").hidden,
    hash: location.hash,
  }));

  await context.close();
  return {
    initial,
    idle,
    midpoint,
    theatre,
    arrival,
    restaurant,
    existingChapterFlow,
    originalParagraphCount,
    restarted,
    returnedToStreet,
    errors: { pageErrors, consoleErrors },
  };
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/prelude`, {
    waitUntil: "networkidle",
  });
  await page.locator("#nrPagePrelude").waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-prelude-mobile-390.png"),
  });

  const client = await context.newCDPSession(page);
  const readerBox = await page.locator("#nrPreludeReader").boundingBox();
  if (!readerBox) throw new Error("Missing mobile prelude reader.");
  const startX = readerBox.x + readerBox.width / 2;
  const startY = readerBox.y + readerBox.height * 0.75;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY }],
  });
  for (let offset = 20; offset <= 150; offset += 26) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - offset }],
    });
    await page.waitForTimeout(20);
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(250);
  const afterTouch = await readState(page);

  await context.close();
  return {
    initial,
    afterTouch,
    errors: { pageErrors, consoleErrors },
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  try {
    const desktop = await runDesktop(browser);
    const mobile = await runMobile(browser);
    const assertions = {
      streetEntryOpensPrelude:
        desktop.initial.currentPage === "prelude" &&
        desktop.initial.activePage === "prelude" &&
        desktop.initial.hash === "#ni-ren-zhang/prelude",
      preludeCopyExact:
        normalize(desktop.initial.preludeCopy) === normalize(PRELUDE_TEXT),
      theatreCopyExact:
        normalize(desktop.theatre.theatreCopy) === normalize(THEATRE_TEXT),
      arrivalCopyExact:
        normalize(desktop.arrival.arrivalCopy) === normalize(ARRIVAL_TEXT),
      sourceImagesLoad:
        desktop.initial.images.prelude.loaded &&
        desktop.theatre.images.theatre.loaded &&
        desktop.arrival.images.arrival.loaded,
      sourceImageDimensions:
        desktop.initial.images.prelude.width === 1671 &&
        desktop.initial.images.prelude.height === 941 &&
        desktop.theatre.images.theatre.width === 1672 &&
        desktop.theatre.images.theatre.height === 941 &&
        desktop.arrival.images.arrival.width === 1672 &&
        desktop.arrival.images.arrival.height === 941,
      allImagesUseCover:
        desktop.initial.images.prelude.objectFit === "cover" &&
        desktop.theatre.images.theatre.objectFit === "cover" &&
        desktop.arrival.images.arrival.objectFit === "cover",
      preludeTextScrolls:
        desktop.initial.text.scrollHeight >
          desktop.initial.text.clientHeight + 8 &&
        desktop.initial.text.overflowY === "auto",
      noAutoAdvance:
        desktop.idle.currentPage === "prelude" &&
        desktop.idle.preludeState.complete === false,
      noPrematureAdvance:
        desktop.midpoint.currentPage === "prelude" &&
        desktop.midpoint.preludeState.complete === false,
      readingCompletionOpensTheatre:
        desktop.theatre.currentPage === "theatre" &&
        desktop.theatre.activeNav === "restaurant" &&
        desktop.theatre.hash === "#ni-ren-zhang/theatre",
      theatreAnywhereClickOpensArrival:
        desktop.arrival.currentPage === "arrival" &&
        desktop.arrival.hash === "#ni-ren-zhang/arrival",
      arrivalAnywhereClickOpensInteraction:
        desktop.restaurant.currentPage === "restaurant" &&
        desktop.restaurant.activePage === "restaurant" &&
        desktop.restaurant.restaurantTitle.includes("雨落天庆馆"),
      chapterNavStaysOnFirstStep:
        desktop.initial.activeNav === "restaurant" &&
        desktop.theatre.activeNav === "restaurant" &&
        desktop.arrival.activeNav === "restaurant",
      restartReturnsToPrelude:
        desktop.restarted.currentPage === "prelude" &&
        desktop.restarted.text.scrollTop === 0,
      existingChaptersRemainNavigable:
        desktop.existingChapterFlow.length === 6 &&
        desktop.existingChapterFlow.every(
          (state) =>
            state.currentPage === state.expected &&
            state.activePage === state.expected,
        ),
      originalReaderRemainsComplete: desktop.originalParagraphCount === 12,
      backReturnsToStreet:
        desktop.returnedToStreet.experienceHidden &&
        desktop.returnedToStreet.hash === "#street",
      desktopNoHorizontalOverflow:
        desktop.initial.horizontalOverflow <= 0,
      desktopNoBrowserErrors:
        desktop.errors.pageErrors.length === 0 &&
        desktop.errors.consoleErrors.length === 0,
      mobileTextRemainsReadable:
        Number.parseFloat(mobile.initial.text.fontSize) >= 16 &&
        Number.parseFloat(mobile.initial.text.lineHeight) /
          Number.parseFloat(mobile.initial.text.fontSize) >=
          1.75,
      mobileNoHorizontalOverflow: mobile.initial.horizontalOverflow <= 0,
      mobileTouchScrollsText:
        mobile.afterTouch.text.scrollTop >
          mobile.initial.text.scrollTop + 8 ||
        (mobile.afterTouch.currentPage === "theatre" &&
          mobile.afterTouch.preludeState.complete === true),
      mobileNoBrowserErrors:
        mobile.errors.pageErrors.length === 0 &&
        mobile.errors.consoleErrors.length === 0,
    };
    const failed = Object.entries(assertions)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    const result = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions,
      failed,
      passed: failed.length === 0,
      desktop,
      mobile,
    };
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
