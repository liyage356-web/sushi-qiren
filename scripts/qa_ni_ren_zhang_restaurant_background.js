const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-restaurant-background.json",
);
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
  return text.replace(/\s+/g, "").trim();
}

async function openRestaurant(page) {
  const url = new URL(PAGE_ORIGIN);
  url.hash = "ni-ren-zhang/restaurant";
  await page.goto(url.href);
  await page.waitForFunction(
    () =>
      window.niRenZhangStory?.getCurrentPage() === "restaurant",
  );
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-restaurant-background");
    return Boolean(image?.complete && image.naturalWidth);
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const normalizeText = (text) =>
      (text || "").replace(/\s+/g, "").trim();
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
    const pageElement = document.querySelector("#nrPageRestaurant");
    const background = pageElement.querySelector(
      ".nr-restaurant-background",
    );
    const hotspotLayer = pageElement.querySelector(".nr-hotspot-layer");
    const wash = pageElement.querySelector(".nr-restaurant-wash");
    const card = pageElement.querySelector(".nr-observation-card");
    const footer = pageElement.querySelector(".nr-scene-footer");
    const backgroundStyle = getComputedStyle(background);
    const washStyle = getComputedStyle(wash);
    const layerRect = rectOf(hotspotLayer);
    const hotspots = [
      ...pageElement.querySelectorAll("[data-nr-hotspot]"),
    ].map((button) => {
      const style = getComputedStyle(button);
      const dot = button.querySelector(".nr-hotspot-dot");
      const dotStyle = getComputedStyle(dot);
      const label = button.querySelector("strong");
      const labelStyle = getComputedStyle(label);
      const buttonRect = rectOf(button);
      return {
        key: button.dataset.nrHotspot,
        label: label?.textContent.trim(),
        labelDisplay: labelStyle.display,
        rect: buttonRect,
        centerWithinLayer: {
          x: layerRect.width
            ? ((buttonRect.left + buttonRect.width / 2 - layerRect.left) /
                layerRect.width) *
              100
            : null,
          y: layerRect.height
            ? ((buttonRect.top + buttonRect.height / 2 - layerRect.top) /
                layerRect.height) *
              100
            : null,
        },
        cursor: style.cursor,
        borderWidth: style.borderTopWidth,
        borderStyle: style.borderTopStyle,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        dot: {
          rect: rectOf(dot),
          borderWidth: dotStyle.borderTopWidth,
          backgroundColor: dotStyle.backgroundColor,
        },
        visited: button.classList.contains("is-visited"),
      };
    });
    const activePage = document.querySelector(
      "[data-nr-page-panel]:not([hidden])",
    );
    const activeNav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );

    return {
      hash: location.hash,
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      activePage: activePage?.dataset.nrPagePanel || null,
      activeNav: activeNav?.dataset.nrPage || null,
      pageRect: rectOf(pageElement),
      navLabels: [
        ...document.querySelectorAll(".nr-step-nav strong"),
      ].map((element) => element.textContent.trim()),
      toolbarButtons: [
        ...document.querySelectorAll(".nr-toolbar button"),
      ].map((element) => element.textContent.replace(/\s+/g, "").trim()),
      heading: {
        text: normalizeText(
          pageElement.querySelector(".nr-scene-heading")?.textContent,
        ),
        rect: rectOf(pageElement.querySelector(".nr-scene-heading")),
      },
      background: {
        source: background.getAttribute("src"),
        loaded:
          Boolean(background.complete) && background.naturalWidth > 0,
        naturalWidth: background.naturalWidth,
        naturalHeight: background.naturalHeight,
        objectFit: backgroundStyle.objectFit,
        objectPosition: backgroundStyle.objectPosition,
        filter: backgroundStyle.filter,
        rect: rectOf(background),
        zIndex: backgroundStyle.zIndex,
      },
      hotspotLayer: {
        rect: layerRect,
        expectedScale: Math.max(
          rectOf(background).width / background.naturalWidth,
          rectOf(background).height / background.naturalHeight,
        ),
        expectedWidth:
          background.naturalWidth *
          Math.max(
            rectOf(background).width / background.naturalWidth,
            rectOf(background).height / background.naturalHeight,
          ),
        expectedHeight:
          background.naturalHeight *
          Math.max(
            rectOf(background).width / background.naturalWidth,
            rectOf(background).height / background.naturalHeight,
          ),
      },
      wash: {
        background: washStyle.backgroundImage,
        zIndex: washStyle.zIndex,
        pointerEvents: washStyle.pointerEvents,
        rect: rectOf(wash),
      },
      observation: {
        visible: Boolean(card && rectOf(card).width),
        rect: rectOf(card),
        count: pageElement
          .querySelector("#nrObservationCount")
          ?.textContent.replace(/\s+/g, " ")
          .trim(),
        kicker: pageElement
          .querySelector("#nrObservationKicker")
          ?.textContent.trim(),
        title: pageElement
          .querySelector("#nrObservationTitle")
          ?.textContent.trim(),
        copy: normalizeText(
          pageElement.querySelector("#nrObservationCopy")?.textContent,
        ),
      },
      hotspots,
      footer: {
        rect: rectOf(footer),
        buttons: [
          ...footer.querySelectorAll("button"),
        ].map((button) => button.textContent.replace(/\s+/g, "").trim()),
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

function installErrorCapture(page, bucket, environment) {
  page.on("pageerror", (error) => {
    bucket.push(`${environment}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      bucket.push(`${environment}: ${message.text()}`);
    }
  });
}

async function runDesktop(browser, assertions, errors) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  installErrorCapture(page, errors, "desktop");
  await openRestaurant(page);

  const initial = await readState(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      "ni-ren-zhang-restaurant-background-desktop.png",
    ),
  });

  assertions.newBackgroundIsLoaded =
    initial.background.source ===
      "assets/ni-ren-zhang/rainy-tianqingguan-teahouse-crowd.png" &&
    initial.background.loaded &&
    initial.background.naturalWidth === 1671 &&
    initial.background.naturalHeight === 941;
  assertions.backgroundStillUsesCover =
    initial.background.objectFit === "cover" &&
    initial.background.objectPosition === "50% 50%";
  assertions.backgroundKeepsExistingLayerAndFilter =
    initial.background.zIndex === "0" &&
    initial.background.filter ===
      "saturate(0.83) contrast(0.98) brightness(0.98)" &&
    initial.wash.zIndex === "1" &&
    initial.wash.pointerEvents === "none";
  assertions.backgroundFillsPage =
    Math.abs(
      initial.background.rect.width -
        initial.pageRect.width,
    ) < 1 &&
    Math.abs(
      initial.background.rect.height -
        initial.pageRect.height,
    ) < 1;
  assertions.navigationPreserved =
    initial.navLabels.join("|") ===
    "天庆馆|识人|捏泥|亮相|估衣街|结局|读后";
  assertions.toolbarPreserved =
    initial.toolbarButtons.join("|") ===
    "←回到老街|跳过互动|阅读原文|重新体验";
  assertions.headingPreserved =
    initial.heading.text.includes("第一幕·天庆馆") &&
    initial.heading.text.includes("雨落天庆馆，先看人怎样看人") &&
    initial.heading.text.includes(
      "点桌上的酒杯、天庆馆旗帜、邻桌吃客和泥人张，观察同一间饭馆里不同的目光。",
    );
  assertions.allFourHotspotsPreserved =
    initial.hotspots.map((hotspot) => hotspot.key).join("|") ===
      "cup|door|diners|mudman" &&
    initial.hotspots.map((hotspot) => hotspot.label).join("|") ===
      "酒杯|天庆馆旗帜|吃客|泥人张";
  assertions.hotspotStylingPreserved = initial.hotspots.every(
    (hotspot) =>
      hotspot.rect.width >= 32 &&
      hotspot.rect.height >= 32 &&
      hotspot.cursor === "pointer" &&
      hotspot.borderWidth === "0px" &&
      hotspot.borderStyle === "none" &&
      hotspot.backgroundColor === "rgba(0, 0, 0, 0)" &&
      hotspot.dot.rect.width >= 10 &&
      hotspot.dot.rect.width <= 12 &&
      hotspot.dot.rect.height >= 10 &&
      hotspot.dot.rect.height <= 12 &&
      hotspot.dot.borderWidth === "2px" &&
      hotspot.dot.backgroundColor === "rgb(166, 90, 72)" &&
      hotspot.labelDisplay === "none",
  );
  assertions.hotspotLayerTracksBackgroundCover =
    Math.abs(
      initial.hotspotLayer.rect.width -
        initial.hotspotLayer.expectedWidth,
    ) < 1 &&
    Math.abs(
      initial.hotspotLayer.rect.height -
        initial.hotspotLayer.expectedHeight,
    ) < 1;
  const expectedHotspotCoordinates = {
    cup: [57.6, 56.2],
    door: [89.2, 25.5],
    diners: [20.8, 62.5],
    mudman: [60.4, 67],
  };
  assertions.hotspotPositionsUseIllustrationCoordinates =
    initial.hotspots.every((hotspot) => {
      const expected = expectedHotspotCoordinates[hotspot.key];
      return (
        Math.abs(hotspot.centerWithinLayer.x - expected[0]) < 0.35 &&
        Math.abs(hotspot.centerWithinLayer.y - expected[1]) < 0.35
      );
    });
  {
    const cup = initial.hotspots.find(
      (hotspot) => hotspot.key === "cup",
    );
    const mudman = initial.hotspots.find(
      (hotspot) => hotspot.key === "mudman",
    );
    assertions.closeHotspotsRemainSeparate =
      cup.rect.right <= mudman.rect.left ||
      mudman.rect.right <= cup.rect.left ||
      cup.rect.bottom <= mudman.rect.top ||
      mudman.rect.bottom <= cup.rect.top;
  }
  assertions.observationCardPreserved =
    initial.observation.visible &&
    initial.observation.count === "0 / 4" &&
    initial.observation.kicker === "馆中一瞥 · 观察" &&
    initial.observation.title === "桌面安静，众人的目光并不安静" &&
    initial.observation.copy.length > 20;
  assertions.footerButtonsPreserved =
    initial.footer.buttons.join("|") ===
    "跳过互动，阅读原文|观察人物→";

  const hoverLabels = {
    cup: "酒杯",
    door: "天庆馆旗帜",
    diners: "吃客",
    mudman: "泥人张",
  };
  for (const [key, label] of Object.entries(hoverLabels)) {
    await page.locator(`[data-nr-hotspot="${key}"]`).hover();
    const hovered = await readState(page);
    const hotspot = hovered.hotspots.find(
      (item) => item.key === key,
    );
    assertions[`${key}HoverLabelWorks`] =
      hotspot.label === label && hotspot.labelDisplay !== "none";
  }
  await page.mouse.move(1350, 740);

  const observations = [
    ["cup", "酒杯 · 如常", "1 / 4"],
    ["door", "天庆馆旗帜 · 场景", "2 / 4"],
    ["diners", "吃客 · 围观", "3 / 4"],
    ["mudman", "人物 · 泥人张", "4 / 4"],
  ];
  for (const [key, kicker, count] of observations) {
    await page.locator(`[data-nr-hotspot="${key}"]`).click();
    const state = await readState(page);
    assertions[`${key}UpdatesObservation`] =
      state.observation.kicker === kicker &&
      state.observation.count === count &&
      state.hotspots.find((hotspot) => hotspot.key === key).visited;
  }

  const observed = await readState(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      "ni-ren-zhang-restaurant-background-observed-desktop.png",
    ),
  });
  assertions.observationProgressCompletes =
    observed.observation.count === "4 / 4" &&
    observed.hotspots.every((hotspot) => hotspot.visited);

  await page
    .locator('#nrPageRestaurant [data-nr-next="observe"]')
    .click();
  assertions.observeButtonStillWorks =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "observe";

  await openRestaurant(page);
  await page
    .locator("#nrPageRestaurant [data-nr-original]")
    .click();
  assertions.skipButtonStillWorks = await page
    .locator("#sharedOriginalReader")
    .isVisible();
  await page.locator(".shared-original-reader__close").click();

  for (const chapter of [
    "observe",
    "craft",
    "reveal",
    "market",
    "ending",
    "reflection",
  ]) {
    await page
      .locator(`.nr-step-nav [data-nr-page="${chapter}"]`)
      .click();
  }
  assertions.otherChaptersRemainNavigable =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "reflection";
  assertions.noDesktopHorizontalOverflow =
    observed.horizontalOverflow === 0;

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
  installErrorCapture(page, errors, "mobile");
  await openRestaurant(page);

  const initial = await readState(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      "ni-ren-zhang-restaurant-background-mobile.png",
    ),
  });
  assertions.mobileBackgroundStillCover =
    initial.background.loaded &&
    initial.background.objectFit === "cover";
  assertions.mobileHotspotsPreserved =
    initial.hotspots.length === 4 &&
    initial.hotspots.every(
      (hotspot) =>
        hotspot.rect.width >= 44 &&
        hotspot.rect.height >= 44,
    );
  assertions.mobileObservationCardPreserved =
    initial.observation.visible &&
    initial.footer.buttons.length === 2;
  assertions.mobileNoHorizontalOverflow =
    initial.horizontalOverflow === 0;

  await page.locator('[data-nr-hotspot="mudman"]').tap();
  const touched = await readState(page);
  assertions.mobileHotspotTouchWorks =
    touched.observation.count === "1 / 4" &&
    touched.observation.kicker === "人物 · 泥人张";
  await page
    .locator('#nrPageRestaurant [data-nr-next="observe"]')
    .tap();
  assertions.mobileObserveButtonWorks =
    (await page.evaluate(() =>
      window.niRenZhangStory.getCurrentPage(),
    )) === "observe";
  assertions.mobileNoCompletedOverflow =
    (await readState(page)).horizontalOverflow === 0;
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
