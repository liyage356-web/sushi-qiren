const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-ni-ren-zhang-door.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

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
    const activePage = document.querySelector(
      "[data-nr-page-panel]:not([hidden])",
    );
    const activeNav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );
    const restaurant = document.querySelector("#nrPageRestaurant");
    const observe = document.querySelector("#nrPageObserve");
    const door = document.querySelector("#nrDoorHotspot");
    const background = restaurant.querySelector(".nr-restaurant-background");
    const observeImage = observe.querySelector(".nr-observe-background");
    const doorStyle = getComputedStyle(door);

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      activePage: activePage?.dataset.nrPagePanel || null,
      activeNav: activeNav?.dataset.nrPage || null,
      hash: location.hash,
      ariaBusy: document
        .querySelector("#niRenZhangExperience")
        .getAttribute("aria-busy"),
      nav: [...document.querySelectorAll(".nr-step-nav button")].map(
        (button) => ({
          page: button.dataset.nrPage,
          label: button.querySelector("strong")?.textContent.trim(),
          disabled: button.disabled,
        }),
      ),
      restaurantHidden: restaurant.hidden,
      observeHidden: observe.hidden,
      restaurantClass: restaurant.className,
      observeClass: observe.className,
      restaurantRect: rectOf(restaurant),
      navRect: rectOf(document.querySelector(".nr-step-nav")),
      door: {
        rect: rectOf(door),
        disabled: door.disabled,
        cursor: doorStyle.cursor,
        border: doorStyle.border,
        backgroundColor: doorStyle.backgroundColor,
        backgroundImage: doorStyle.backgroundImage,
      },
      removedExploration: {
        hotspots: document.querySelectorAll("[data-nr-hotspot]").length,
        observationCard: Boolean(
          document.querySelector(".nr-observation-card"),
        ),
        observeButton: [...restaurant.querySelectorAll("button")].some(
          (button) => button.textContent.includes("观察人物"),
        ),
      },
      restaurantArticle: {
        title: restaurant.querySelector(".nr-page-title")?.textContent.trim(),
        description: restaurant
          .querySelector(".nr-scene-heading > p:last-child")
          ?.textContent.trim(),
        background: {
          source: background?.getAttribute("src"),
          loaded:
            Boolean(background?.complete) && background?.naturalWidth > 0,
          width: background?.naturalWidth,
          height: background?.naturalHeight,
          objectFit: background
            ? getComputedStyle(background).objectFit
            : null,
        },
      },
      observeArticle: {
        title: observe.querySelector(".nr-page-title")?.textContent.trim(),
        cards: observe.querySelectorAll(".nr-portrait-card").length,
        nextVisible: Boolean(
          observe.querySelector('[data-nr-next="craft"]'),
        ),
        image: {
          source: observeImage?.getAttribute("src"),
          loaded:
            Boolean(observeImage?.complete) && observeImage?.naturalWidth > 0,
          width: observeImage?.naturalWidth,
          height: observeImage?.naturalHeight,
          objectFit: observeImage
            ? getComputedStyle(observeImage).objectFit
            : null,
        },
      },
      horizontalOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      historyLength: history.length,
    };
  });
}

async function openRestaurant(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/restaurant`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "restaurant",
  );
  await page.waitForTimeout(250);
}

function installErrorCapture(page, label, errors) {
  page.on("pageerror", (error) => {
    errors.push(`${label} pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label} console: ${message.text()}`);
    }
  });
}

async function runDesktop(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  installErrorCapture(page, "desktop", errors);
  await openRestaurant(page);

  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-door-desktop.png"),
  });
  await page.locator("#nrDoorHotspot").hover();
  const hoverOpacity = await page.locator("#nrDoorHotspot").evaluate(
    (element) => getComputedStyle(element, "::after").opacity,
  );

  assertions.noLegacyHotspots = initial.removedExploration.hotspots === 0;
  assertions.noObservationCard =
    !initial.removedExploration.observationCard;
  assertions.noObserveButton =
    !initial.removedExploration.observeButton;
  assertions.restaurantTitlePreserved =
    normalize(initial.restaurantArticle.title || "") ===
    normalize("雨落天庆馆，先看人怎样看人");
  assertions.restaurantDescriptionPreserved =
    normalize(initial.restaurantArticle.description || "") ===
    normalize(
      "点桌上的酒杯、门口、邻桌吃客和泥人张，观察同一间饭馆里不同的目光。",
    );
  assertions.restaurantBackgroundPreserved =
    initial.restaurantArticle.background.source ===
      "assets/ni-ren-zhang/rainy-tianqingguan-teahouse-crowd.png" &&
    initial.restaurantArticle.background.loaded &&
    initial.restaurantArticle.background.objectFit === "cover";
  assertions.doorIsTransparent =
    initial.door.border === "0px none rgb(34, 35, 31)" &&
    initial.door.backgroundColor === "rgba(0, 0, 0, 0)" &&
    initial.door.backgroundImage === "none";
  assertions.doorPointerCursor = initial.door.cursor === "pointer";
  assertions.doorAlignedToRightDoorway =
    initial.door.rect.left > initial.restaurantRect.width * 0.5 &&
    initial.door.rect.right < initial.restaurantRect.right &&
    initial.door.rect.width >= 44 &&
    initial.door.rect.height >= 44;
  assertions.doorBelowNavigation =
    initial.door.rect.top >= initial.navRect.bottom;
  assertions.doorHoverFeedback = Number(hoverOpacity) > 0;
  assertions.navStillHasSevenChapters =
    initial.nav.length === 7 &&
    initial.nav.map((item) => item.label).join("|") ===
      "天庆馆|识人|捏泥|亮相|估衣街|结局|读后";

  const historyBefore = initial.historyLength;
  await page.locator("#nrDoorHotspot").click();
  const immediate = await readState(page);
  assertions.transitionLocksImmediately =
    immediate.ariaBusy === "true" &&
    immediate.currentPage === "restaurant" &&
    immediate.nav.every((item) => item.disabled) &&
    immediate.door.disabled;
  assertions.bothScenesComposeDuringTransition =
    !immediate.restaurantHidden &&
    !immediate.observeHidden &&
    immediate.restaurantClass.includes("is-door-leaving") &&
    immediate.observeClass.includes("is-door-entering");

  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-door-transition.png"),
  });
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "observe",
    null,
    { timeout: 3000 },
  );
  const completed = await readState(page);
  await page.waitForTimeout(80);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-observe-desktop.png"),
  });

  assertions.entersObserveChapter =
    completed.currentPage === "observe" &&
    completed.activePage === "observe" &&
    completed.activeNav === "observe" &&
    completed.hash === "#ni-ren-zhang/observe";
  assertions.oldSceneRemovedAfterTransition =
    completed.restaurantHidden &&
    !completed.observeHidden &&
    completed.ariaBusy === null;
  assertions.observeBackgroundUsesSuppliedImage =
    completed.observeArticle.image.source ===
      "assets/ni-ren-zhang/sea-zhang-wu-enters-tianqingguan.png" &&
    completed.observeArticle.image.loaded &&
    completed.observeArticle.image.width === 1672 &&
    completed.observeArticle.image.height === 941 &&
    completed.observeArticle.image.objectFit === "cover";
  assertions.observeContentPreserved =
    normalize(completed.observeArticle.title || "") ===
      normalize("谁在看戏，谁在看人？") &&
    completed.observeArticle.cards === 2 &&
    completed.observeArticle.nextVisible;
  assertions.transitionAddsSingleHistoryEntry =
    completed.historyLength === historyBefore + 1;

  await page.locator('#nrPageObserve [data-nr-next="craft"]').click();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "craft",
  );
  assertions.nextChapterStillWorks =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "craft";

  await page.locator("#niRenZhangOriginalButton").click();
  assertions.originalReaderStillOpens = await page
    .locator("#sharedOriginalReader")
    .isVisible();
  await page.locator(".shared-original-reader__close").click();
  await page.locator("#niRenZhangRestartButton").click();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "prelude",
  );
  assertions.restartReturnsToPrelude =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "prelude";
  assertions.noDesktopHorizontalOverflow =
    completed.horizontalOverflow === 0;

  await openRestaurant(page);
  await page.locator("#nrDoorHotspot").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "observe",
    null,
    { timeout: 3000 },
  );
  assertions.enterActivatesDoor =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "observe";

  await openRestaurant(page);
  await page.locator("#nrDoorHotspot").focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "observe",
    null,
    { timeout: 3000 },
  );
  assertions.spaceActivatesDoor =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "observe";

  await openRestaurant(page);
  const repeatedBefore = await page.evaluate(() => history.length);
  await page.locator("#nrDoorHotspot").evaluate((button) => {
    button.click();
    button.click();
    button.click();
  });
  await page.waitForTimeout(100);
  assertions.repeatedClicksStayLocked = await page.evaluate(
    () =>
      window.niRenZhangStory.getCurrentPage() === "restaurant" &&
      document.querySelector("#niRenZhangExperience").getAttribute(
        "aria-busy",
      ) === "true",
  );
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "observe",
    null,
    { timeout: 3000 },
  );
  assertions.repeatedClicksAddOneEntry =
    (await page.evaluate(() => history.length)) === repeatedBefore + 1;

  await context.close();
}

async function runMobile(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  installErrorCapture(page, "mobile", errors);
  await openRestaurant(page);
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-door-mobile.png"),
  });
  assertions.mobileDoorAligned =
    initial.door.rect.left > initial.restaurantRect.width * 0.5 &&
    initial.door.rect.right > initial.restaurantRect.right &&
    initial.door.rect.top >= initial.navRect.bottom &&
    initial.door.rect.height >= 44;
  assertions.mobileNoLegacyExploration =
    initial.removedExploration.hotspots === 0 &&
    !initial.removedExploration.observationCard &&
    !initial.removedExploration.observeButton;
  assertions.mobileNoHorizontalOverflow =
    initial.horizontalOverflow === 0;

  await page.locator("#nrDoorHotspot").tap();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "observe",
    null,
    { timeout: 3000 },
  );
  const completed = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "ni-ren-zhang-observe-mobile.png"),
  });
  assertions.mobileTouchEntersObserve =
    completed.currentPage === "observe" &&
    completed.activeNav === "observe";
  assertions.mobileNoCompletedOverflow =
    completed.horizontalOverflow === 0;
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const assertions = {};
  const errors = [];
  try {
    await runDesktop(browser, assertions, errors);
    await runMobile(browser, assertions, errors);
  } finally {
    await browser.close();
  }

  assertions.noBrowserErrors = errors.length === 0;
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const report = {
    generatedAt: new Date().toISOString(),
    pageOrigin: PAGE_ORIGIN,
    assertions,
    failed,
    errors,
    passed: failed.length === 0,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
