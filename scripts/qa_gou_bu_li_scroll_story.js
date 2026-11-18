const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "qa-gou-bu-li-scroll-story.json");
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

async function waitForScroll(page) {
  await page.waitForTimeout(80);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const scroller = document.querySelector("#dogPages");
        let last = scroller.scrollTop;
        let stable = 0;
        const inspect = () => {
          if (Math.abs(scroller.scrollTop - last) < 0.5) stable += 1;
          else stable = 0;
          last = scroller.scrollTop;
          if (stable >= 3) resolve();
          else requestAnimationFrame(inspect);
        };
        inspect();
      }),
  );
}

async function scrollTransitionTo(page, selector, progress) {
  await page.evaluate(
    ({ selector: transitionSelector, progress: targetProgress }) => {
      const scroller = document.querySelector("#dogPages");
      const transition = document.querySelector(transitionSelector);
      const rect = transition.getBoundingClientRect();
      const targetTop =
        scroller.getBoundingClientRect().height * (1 - targetProgress);
      scroller.scrollTop += rect.top - targetTop;
    },
    { selector, progress },
  );
  await waitForScroll(page);
}

async function scrollBodyToEnd(page, bodySelector) {
  await page.evaluate((selector) => {
    const scroller = document.querySelector("#dogPages");
    const viewport = scroller.getBoundingClientRect();
    const body = document.querySelector(selector);
    const rect = body.getBoundingClientRect();
    const globalTop = rect.top - viewport.top + scroller.scrollTop;
    scroller.scrollTop = globalTop + rect.height - viewport.height + 2;
  }, bodySelector);
  await waitForScroll(page);
}

async function readState(page) {
  return page.evaluate(() => {
    const experience = document.querySelector("#dogBuLiExperience");
    const scroller = document.querySelector("#dogPages");
    const streetReader = document.querySelector(
      "#dogOpeningSpread .dog-opening-reader",
    );
    const shopReader = document.querySelector(
      "#dogShopIntro .dog-opening-reader",
    );
    const streetText = document.querySelector("#dogOpeningText");
    const shopText = document.querySelector("#dogShopIntroText");
    const streetTitle = document.querySelector("#dogStreetTitle");
    const shopTitle = document.querySelector("#dogShopIntroTitle");
    const viewport = scroller.getBoundingClientRect();
    const readerRect = streetReader.getBoundingClientRect();
    const shopReaderRect = shopReader.getBoundingClientRect();
    const titleLeft = streetTitle.getBoundingClientRect().left;
    const paragraphLeft = streetText
      .querySelector(":scope > p")
      .getBoundingClientRect().left;
    const layers = [
      ...document.querySelectorAll("[data-dog-narrative-layer]"),
    ].map((layer) => ({
      sceneKey: layer.querySelector("img").dataset.sceneKey || "",
      source: layer.querySelector("img").getAttribute("src") || "",
      opacity: Number.parseFloat(layer.style.opacity || "0"),
    }));
    return {
      route: location.hash,
      currentPage: window.dogBuLiStory.getCurrentPage(),
      narrative: window.dogBuLiStory.getNarrativeState(),
      activeNav: document.querySelector(
        '.dog-step-nav [aria-current="page"] strong',
      )?.textContent,
      streetVisible: !document
        .querySelector("#dogPageStreet")
        .hasAttribute("hidden"),
      shopVisible: !document
        .querySelector("#dogPageShop")
        .hasAttribute("hidden"),
      shopMainVisible: !document
        .querySelector("#dogShopMain")
        .hasAttribute("hidden"),
      streetReader: {
        width: readerRect.width,
        left: readerRect.left,
        top: readerRect.top,
      },
      shopReader: {
        width: shopReaderRect.width,
        left: shopReaderRect.left,
        top: shopReaderRect.top,
      },
      titleParagraphAligned: Math.abs(titleLeft - paragraphLeft) < 2,
      streetTextOverflow: getComputedStyle(streetText).overflowY,
      shopTextOverflow: getComputedStyle(shopText).overflowY,
      streetTextClipped:
        streetText.scrollHeight > streetText.clientHeight + 1,
      shopTextClipped:
        shopText.scrollHeight > shopText.clientHeight + 1,
      scroller: {
        top: scroller.scrollTop,
        height: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
        overflowY: getComputedStyle(scroller).overflowY,
      },
      stageHidden: document
        .querySelector("#dogNarrativeStage")
        .hasAttribute("hidden"),
      layers,
      horizontalOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      errors: {
        page: window.__dogScrollPageErrors || [],
        console: window.__dogScrollConsoleErrors || [],
      },
      viewport: {
        width: viewport.width,
        height: viewport.height,
        experienceVisible: !experience.hidden,
      },
    };
  });
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
  await page.locator(".hotspot-baozi").click();
  await page.locator("#dogBuLiExperience").waitFor({ state: "visible" });
  await waitForScroll(page);

  const initial = await readState(page);
  await page.waitForTimeout(1200);
  const idle = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-desktop-initial.png"),
  });

  await page.evaluate(() => {
    const scroller = document.querySelector("#dogPages");
    const body = document.querySelector("#dogOpeningText");
    scroller.scrollTop = body.offsetTop * 0.45;
  });
  await waitForScroll(page);
  const streetMid = await readState(page);

  await scrollBodyToEnd(page, "#dogOpeningText");
  const streetEnd = await readState(page);
  await page.waitForTimeout(1100);
  const afterStreetEnd = await readState(page);

  await scrollTransitionTo(page, "#dogStreetTransition", 0.25);
  const crossfadeEarly = await readState(page);
  await scrollTransitionTo(page, "#dogStreetTransition", 0.52);
  const crossfadeMid = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-desktop-transition.png"),
  });

  await page.evaluate(() => {
    const scroller = document.querySelector("#dogPages");
    const target = document.querySelector("#dogShopIntro");
    scroller.scrollTop +=
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top;
  });
  await waitForScroll(page);
  const shopStart = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-desktop-shop.png"),
  });

  await scrollBodyToEnd(page, "#dogShopIntroText");
  const shopTextEnd = await readState(page);
  await scrollTransitionTo(page, "#dogShopTransition", 0.48);
  const shopMainTransition = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-desktop-shop-main-transition.png"),
  });

  await page.evaluate(() => {
    const scroller = document.querySelector("#dogPages");
    const target = document.querySelector("#dogShopMain");
    scroller.scrollTop +=
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top;
  });
  await waitForScroll(page);
  const shopMainStart = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-desktop-shop-main.png"),
  });

  await scrollTransitionTo(page, "#dogStreetTransition", 0.35);
  const reverse = await readState(page);

  await page.locator('[data-dog-page="shop"]').click();
  await waitForScroll(page);
  const navToShop = await readState(page);

  await page.locator('[data-dog-page="street"]').click();
  await waitForScroll(page);
  const navToStreet = await readState(page);

  await page.goBack();
  await waitForScroll(page);
  const historyBack = await readState(page);
  await page.goForward();
  await waitForScroll(page);
  const historyForward = await readState(page);

  await page.locator('[data-dog-page="craft"]').click();
  await page.locator("#dogPageCraft").waitFor({ state: "visible" });
  const craft = await page.evaluate(() => ({
    visible: !document.querySelector("#dogPageCraft").hasAttribute("hidden"),
    nav: document.querySelector(
      '.dog-step-nav [aria-current="page"] strong',
    )?.textContent,
    openButtons: document.querySelectorAll(
      '#dogPageCraft button, #gouBuliCraftModule button',
    ).length,
    narrativeMode: window.dogBuLiStory.getNarrativeState().mode,
  }));

  await page.locator("#dogRestartButton").click();
  await waitForScroll(page);
  const restarted = await readState(page);

  const assertions = {
    entryOpensStreet: initial.currentPage === "street",
    entryScrollsToTop: initial.scroller.top < 2,
    entryShowsStreetNav: initial.activeNav === "巷口",
    noAutoAdvanceOnIdle:
      idle.currentPage === "street" &&
      idle.narrative.streetTransition === 0,
    backgroundFullBleed:
      !initial.stageHidden &&
      initial.layers[0].opacity === 1 &&
      initial.layers[0].sceneKey === "street",
    desktopTextAboutOneThird:
      initial.streetReader.width / initial.viewport.width >= 0.3 &&
      initial.streetReader.width / initial.viewport.width <= 0.36 &&
      initial.shopReader.width / initial.viewport.width >= 0.3 &&
      initial.shopReader.width / initial.viewport.width <= 0.36,
    textLeftStaysLeft:
      initial.streetReader.left < initial.viewport.width * 0.08 &&
      initial.shopReader.left < initial.viewport.width * 0.08,
    titleAndParagraphAligned: initial.titleParagraphAligned,
    singleScrollSurface:
      initial.scroller.overflowY === "auto" &&
      initial.streetTextOverflow === "visible" &&
      initial.shopTextOverflow === "visible",
    noTextClipping:
      !initial.streetTextClipped && !initial.shopTextClipped,
    doesNotAdvanceAtMidpoint:
      streetMid.currentPage === "street" &&
      streetMid.narrative.streetTransition === 0,
    streetCompletionUsesTextPosition:
      streetEnd.narrative.streetProgress >= 0.99,
    completedTextWaitsForMoreScroll:
      afterStreetEnd.currentPage === "street" &&
      afterStreetEnd.narrative.streetTransition === 0,
    crossfadeHasBothLayers:
      crossfadeEarly.layers[0].sceneKey === "street" &&
      crossfadeEarly.layers[1].sceneKey === "shopIntro" &&
      crossfadeEarly.layers[0].opacity > 0 &&
      crossfadeEarly.layers[0].opacity < 1 &&
      crossfadeEarly.layers[1].opacity > 0 &&
      crossfadeEarly.layers[1].opacity < 1,
    navigationUpdatesDuringCrossfade:
      crossfadeMid.currentPage === "shop" &&
      crossfadeMid.activeNav === "铺子",
    shopStartsFresh:
      shopStart.currentPage === "shop" &&
      shopStart.activeNav === "铺子" &&
      shopStart.narrative.shopProgress === 0,
    shopTextCompletesBeforeSecondTransition:
      shopTextEnd.currentPage === "shop" &&
      shopTextEnd.narrative.shopProgress >= 0.99 &&
      shopTextEnd.narrative.shopTransition === 0,
    shopMainCrossfadeUsesScrollProgress:
      shopMainTransition.currentPage === "shop" &&
      shopMainTransition.layers[0].sceneKey === "shopIntro" &&
      shopMainTransition.layers[1].sceneKey === "shopMain" &&
      shopMainTransition.layers[0].opacity > 0 &&
      shopMainTransition.layers[0].opacity < 1 &&
      shopMainTransition.layers[1].opacity > 0 &&
      shopMainTransition.layers[1].opacity < 1,
    shopMainIsReachableAsThirdScene:
      shopMainStart.currentPage === "shop" &&
      shopMainStart.activeNav === "铺子" &&
      shopMainStart.shopMainVisible &&
      shopMainStart.narrative.activeScene === "shopMain" &&
      shopMainStart.narrative.layers[0].sceneKey === "shopMain",
    reverseReturnsToStreet:
      reverse.currentPage === "street" &&
      reverse.activeNav === "巷口",
    navShopScrollsCorrectly:
      navToShop.currentPage === "shop" &&
      navToShop.activeNav === "铺子",
    navStreetScrollsCorrectly:
      navToStreet.currentPage === "street" &&
      navToStreet.activeNav === "巷口",
    browserBackRestoresShop:
      historyBack.currentPage === "shop" &&
      historyBack.route === "#gou-bu-li/shop",
    browserForwardRestoresStreet:
      historyForward.currentPage === "street" &&
      historyForward.route === "#gou-bu-li/street",
    craftViewPreserved:
      craft.visible &&
      craft.nav === "制作" &&
      !craft.narrativeMode &&
      craft.openButtons >= 2,
    restartReturnsToStart:
      restarted.currentPage === "street" &&
      restarted.scroller.top < 2 &&
      restarted.activeNav === "巷口",
    noHorizontalOverflow: initial.horizontalOverflow === 0,
    noBrowserErrors:
      pageErrors.length === 0 && consoleErrors.length === 0,
  };

  await context.close();
  return {
    assertions,
    states: {
      initial,
      idle,
      streetMid,
      streetEnd,
      afterStreetEnd,
      crossfadeEarly,
      crossfadeMid,
      shopStart,
      shopTextEnd,
      shopMainTransition,
      shopMainStart,
      reverse,
      navToShop,
      navToStreet,
      historyBack,
      historyForward,
      craft,
      restarted,
    },
    errors: { pageErrors, consoleErrors },
  };
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/street`, {
    waitUntil: "networkidle",
  });
  await waitForScroll(page);
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-mobile-initial.png"),
  });

  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 190, y: 650 }],
  });
  for (let y = 600; y >= 180; y -= 60) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 190, y }],
    });
    await page.waitForTimeout(24);
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(450);
  await waitForScroll(page);
  const afterTouch = await readState(page);

  await scrollBodyToEnd(page, "#dogOpeningText");
  await scrollTransitionTo(page, "#dogStreetTransition", 0.55);
  const mobileTransition = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-mobile-transition.png"),
  });

  const assertions = {
    mobileReadingLayerExpanded:
      initial.streetReader.width / initial.viewport.width > 0.8,
    mobileNoHorizontalOverflow: initial.horizontalOverflow === 0,
    touchScrollMovesPage: afterTouch.scroller.top > initial.scroller.top + 80,
    mobileSingleScrollSurface:
      initial.scroller.overflowY === "auto" &&
      initial.streetTextOverflow === "visible",
    mobileCrossfade:
      mobileTransition.currentPage === "shop" &&
      mobileTransition.layers[0].opacity > 0 &&
      mobileTransition.layers[0].opacity < 1 &&
      mobileTransition.layers[1].opacity > 0 &&
      mobileTransition.layers[1].opacity < 1,
    mobileNoBrowserErrors:
      pageErrors.length === 0 && consoleErrors.length === 0,
  };

  await context.close();
  return {
    assertions,
    states: { initial, afterTouch, mobileTransition },
    errors: { pageErrors, consoleErrors },
  };
}

async function runTablet(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/street`, {
    waitUntil: "networkidle",
  });
  await waitForScroll(page);
  const initial = await readState(page);
  await page.screenshot({
    path: path.join(ROOT, "gou-bu-li-scroll-tablet-1024-initial.png"),
  });

  await context.close();
  return {
    assertions: {
      tabletTextBalanced:
        initial.streetReader.width / initial.viewport.width >= 0.3 &&
        initial.streetReader.width / initial.viewport.width <= 0.36,
      tabletNoHorizontalOverflow: initial.horizontalOverflow === 0,
      tabletNoBrowserErrors:
        pageErrors.length === 0 && consoleErrors.length === 0,
    },
    states: { initial },
    errors: { pageErrors, consoleErrors },
  };
}

async function runReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/street`, {
    waitUntil: "networkidle",
  });
  await waitForScroll(page);
  await scrollTransitionTo(page, "#dogStreetTransition", 0.35);
  const beforeThreshold = await readState(page);
  await scrollTransitionTo(page, "#dogStreetTransition", 0.65);
  const afterThreshold = await readState(page);

  await context.close();
  return {
    assertions: {
      reducedMotionUsesDiscreteCrossfade:
        beforeThreshold.layers[0].sceneKey === "street" &&
        beforeThreshold.layers[0].opacity === 1 &&
        beforeThreshold.layers[1].opacity === 0 &&
        afterThreshold.layers[0].sceneKey === "shopIntro" &&
        afterThreshold.layers[0].opacity === 1 &&
        afterThreshold.layers[1].opacity === 0,
      reducedMotionNoBrowserErrors:
        pageErrors.length === 0 && consoleErrors.length === 0,
    },
    states: { beforeThreshold, afterThreshold },
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
    const tablet = await runTablet(browser);
    const mobile = await runMobile(browser);
    const reducedMotion = await runReducedMotion(browser);
    const failed = [
      ...Object.entries(desktop.assertions),
      ...Object.entries(tablet.assertions),
      ...Object.entries(mobile.assertions),
      ...Object.entries(reducedMotion.assertions),
    ]
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    const result = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions: {
        ...desktop.assertions,
        ...tablet.assertions,
        ...mobile.assertions,
        ...reducedMotion.assertions,
      },
      failed,
      passed: failed.length === 0,
      desktop: desktop.states,
      tablet: tablet.states,
      mobile: mobile.states,
      reducedMotion: reducedMotion.states,
      errors: {
        desktop: desktop.errors,
        tablet: tablet.errors,
        mobile: mobile.errors,
        reducedMotion: reducedMotion.errors,
      },
    };
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
