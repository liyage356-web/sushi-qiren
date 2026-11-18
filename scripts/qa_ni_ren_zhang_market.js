const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4175/";
const ROOT = path.resolve(__dirname, "..");
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

async function openMarket(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/market`, {
    waitUntil: "networkidle",
  });
  await page.locator("#nrPageMarket").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-market-background");
    return image?.complete && image.naturalWidth === 1672;
  });
  await page.waitForTimeout(160);
}

async function inspect(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("#nrPageMarket");
    const hero = document.querySelector(".nr-market-hero");
    const background = document.querySelector(".nr-market-background");
    const wash = document.querySelector(".nr-market-wash");
    const heading = document.querySelector(".nr-market-heading");
    const advance = document.querySelector(".nr-market-advance");
    const advanceCue = document.querySelector(".nr-market-advance-cue");
    const title = document.querySelector("#nrMarketTitle");
    const intro = heading.querySelector(":scope > p:last-child");
    const nav = document.querySelector(".nr-step-nav");
    const panelRect = panel.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const backgroundRect = background.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const advanceRect = advance.getBoundingClientRect();
    const advanceCueRect = advanceCue.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const backgroundStyle = getComputedStyle(background);
    const navStyle = getComputedStyle(nav);
    const headingStyle = getComputedStyle(heading);
    const advanceStyle = getComputedStyle(advance);
    const advanceCueStyle = getComputedStyle(advanceCue);
    const titleStyle = getComputedStyle(title);
    const introStyle = getComputedStyle(intro);
    const topControls = [
      "#niRenZhangBackButton",
      "#niRenZhangSkipButton",
      "#niRenZhangOriginalButton",
      "#niRenZhangRestartButton",
    ].map((selector) => {
      const button = document.querySelector(selector);
      const rect = button.getBoundingClientRect();
      return {
        selector,
        visible: rect.width > 0 && rect.height > 0,
        pointerEvents: getComputedStyle(button).pointerEvents,
      };
    });
    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      viewport: { width: innerWidth, height: innerHeight },
      panelRect: {
        left: panelRect.left,
        top: panelRect.top,
        right: panelRect.right,
        bottom: panelRect.bottom,
        width: panelRect.width,
        height: panelRect.height,
      },
      panelOverflowX: getComputedStyle(panel).overflowX,
      panelOverflowY: getComputedStyle(panel).overflowY,
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      panelScrollWidth: panel.scrollWidth,
      panelClientWidth: panel.clientWidth,
      navBottom: navRect.bottom,
      navZIndex: Number.parseInt(navStyle.zIndex, 10),
      navBackground: navStyle.backgroundColor,
      navBackdropFilter: navStyle.backdropFilter,
      heroRect: {
        left: heroRect.left,
        top: heroRect.top,
        right: heroRect.right,
        bottom: heroRect.bottom,
        width: heroRect.width,
        height: heroRect.height,
      },
      background: {
        source: background.getAttribute("src"),
        loaded:
          background.complete &&
          background.naturalWidth === 1672 &&
          background.naturalHeight === 941,
        naturalRatio: background.naturalWidth / background.naturalHeight,
        objectFit: backgroundStyle.objectFit,
        objectPosition: backgroundStyle.objectPosition,
        transform: backgroundStyle.transform,
        filter: backgroundStyle.filter,
        pointerEvents: backgroundStyle.pointerEvents,
        coversHero:
          Math.abs(backgroundRect.left - heroRect.left) <= 1 &&
          Math.abs(backgroundRect.top - heroRect.top) <= 1 &&
          Math.abs(backgroundRect.width - heroRect.width) <= 1 &&
          Math.abs(backgroundRect.height - heroRect.height) <= 1,
      },
      washBackground: getComputedStyle(wash).backgroundImage,
      advance: {
        target: advance.dataset.nrNext,
        ariaLabel: advance.getAttribute("aria-label"),
        cursor: advanceStyle.cursor,
        pointerEvents: advanceStyle.pointerEvents,
        zIndex: Number.parseInt(advanceStyle.zIndex, 10),
        coversHero:
          Math.abs(advanceRect.left - heroRect.left) <= 1 &&
          Math.abs(advanceRect.top - heroRect.top) <= 1 &&
          Math.abs(advanceRect.width - heroRect.width) <= 1 &&
          Math.abs(advanceRect.height - heroRect.height) <= 1,
        cueVisible:
          advanceCueRect.width > 0 &&
          advanceCueRect.height > 0 &&
          advanceCueStyle.display !== "none" &&
          advanceCueStyle.visibility !== "hidden",
        hitTargets: [
          [innerWidth * 0.5, innerHeight * 0.5],
          [
            headingRect.left + headingRect.width * 0.5,
            headingRect.top + headingRect.height * 0.5,
          ],
          [innerWidth * 0.82, innerHeight * 0.72],
        ].map(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(hit?.closest(".nr-market-advance"));
        }),
      },
      heading: {
        left: headingRect.left,
        top: headingRect.top,
        right: headingRect.right,
        bottom: headingRect.bottom,
        width: headingRect.width,
        leftRatio: headingRect.left / innerWidth,
        widthRatio: headingRect.width / innerWidth,
        textAlign: headingStyle.textAlign,
        backgroundColor: headingStyle.backgroundColor,
        eyebrowText: heading
          .querySelector(".nr-eyebrow")
          .textContent.replace(/\s+/g, " ")
          .trim(),
        titleText: title.textContent.replace(/\s+/g, " ").trim(),
        introText: intro.textContent.replace(/\s+/g, "").trim(),
        titleFontSize: Number.parseFloat(titleStyle.fontSize),
        introFontSize: Number.parseFloat(introStyle.fontSize),
        introLineHeight:
          Number.parseFloat(introStyle.lineHeight) /
          Number.parseFloat(introStyle.fontSize),
        titleContained:
          titleRect.left >= headingRect.left - 1 &&
          titleRect.right <= headingRect.right + 1 &&
          titleRect.bottom <= headingRect.bottom + 1,
      },
      oldLayout: {
        row: Boolean(document.querySelector(".nr-market-row")),
        interactions: Boolean(
          document.querySelector(".nr-market-interactions"),
        ),
        clayStrip: Boolean(document.querySelector(".nr-clay-strip")),
        ticket: Boolean(document.querySelector(".nr-sale-ticket")),
        footer: Boolean(document.querySelector(".nr-market-page-footer")),
        phaseNote: Array.from(panel.querySelectorAll(".nr-phase-note")).some(
          (element) => element.textContent.includes("横向浏览"),
        ),
        oldLabels: ["杂货摊", "泥像摊", "纸条"].filter((label) =>
          panel.textContent.includes(label),
        ),
      },
      topControls,
      activeMarketNav:
        document
          .querySelector('[data-nr-page="market"]')
          ?.getAttribute("aria-current") === "page",
      endingNavPresent: Boolean(
        document.querySelector('[data-nr-page="ending"]'),
      ),
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function testSceneClick(page) {
  const point = await page.locator(".nr-market-heading").evaluate((heading) => {
    const rect = heading.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "ending",
  );
  return page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    hash: location.hash,
    endingVisible: !document.querySelector("#nrPageEnding").hidden,
  }));
}

async function testKeyboardAdvance(page) {
  await page.locator(".nr-market-advance").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "ending",
  );
  return page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    endingVisible: !document.querySelector("#nrPageEnding").hidden,
  }));
}

async function testNavigation(page) {
  await page.locator("#niRenZhangOriginalButton").click();
  await page.locator("#sharedOriginalReader").waitFor({
    state: "visible",
  });
  const originalModal = await page.evaluate(() => ({
    visible: document.querySelector("#sharedOriginalReader").open,
    textLength: document
      .querySelector(".shared-original-reader__text")
      .textContent.trim().length,
  }));
  await page.locator(".shared-original-reader__close").click();
  await page.locator("#sharedOriginalReader").waitFor({ state: "hidden" });

  await page.locator('[data-nr-page="ending"]').click();
  await page.waitForFunction(
    () => window.niRenZhangStory.getCurrentPage() === "ending",
  );
  const chapterJump = await page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    endingVisible: !document.querySelector("#nrPageEnding").hidden,
  }));

  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/market`, {
    waitUntil: "networkidle",
  });
  await page.locator("#niRenZhangBackButton").click();
  await page.waitForFunction(() => location.hash === "#street");
  const backToStreet = await page.evaluate(() => ({
    hash: location.hash,
    streetVisible: !document.querySelector("#streetView").hidden,
  }));

  return { originalModal, chapterJump, backToStreet };
}

async function runViewport(browser, viewport, name, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await openMarket(page);
  const initial = await inspect(page);
  await page.screenshot({
    path: path.join(ROOT, `ni-ren-zhang-market-${name}.png`),
  });
  const sceneClick = await testSceneClick(page);
  await openMarket(page);
  const keyboardAdvance =
    name === "desktop-1440" ? await testKeyboardAdvance(page) : null;
  if (keyboardAdvance) await openMarket(page);
  const navigation = await testNavigation(page);

  await context.close();
  return {
    initial,
    sceneClick,
    keyboardAdvance,
    navigation,
    errors: { pageErrors, consoleErrors },
  };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  try {
    const wide = await runViewport(
      browser,
      { width: 1920, height: 1080 },
      "wide-1920",
    );
    const desktop = await runViewport(
      browser,
      { width: 1440, height: 900 },
      "desktop-1440",
    );
    const laptop = await runViewport(
      browser,
      { width: 1366, height: 768 },
      "laptop-1366",
    );
    const tablet = await runViewport(
      browser,
      { width: 1024, height: 768 },
      "tablet-1024",
    );
    const mobile = await runViewport(
      browser,
      { width: 390, height: 844 },
      "mobile-390",
      true,
    );

    const all = [wide, desktop, laptop, tablet, mobile];
    const noOldLayout = (result) => {
      const old = result.initial.oldLayout;
      return (
        !old.row &&
        !old.interactions &&
        !old.clayStrip &&
        !old.ticket &&
        !old.footer &&
        !old.phaseNote &&
        old.oldLabels.length === 0
      );
    };
    const fillsStoryArea = (result) => {
      const view = result.initial;
      return (
        Math.abs(view.heroRect.top) <= 1 &&
        Math.abs(view.heroRect.bottom - view.viewport.height) <= 1 &&
        Math.abs(view.heroRect.width - view.viewport.width) <= 1 &&
        view.background.coversHero
      );
    };
    const hasNoScroll = (result) => {
      const view = result.initial;
      return (
        view.panelOverflowX === "hidden" &&
        view.panelOverflowY === "hidden" &&
        view.panelScrollHeight <= view.panelClientHeight + 1 &&
        view.panelScrollWidth <= view.panelClientWidth + 1
      );
    };

    const assertions = {
      oldThreeColumnLayoutRemoved: all.every(noOldLayout),
      suppliedBackgroundIsUsed:
        desktop.initial.background.source.includes(
          "/public/images/niren-zhang/market/gu-yi-street-clay-stall.png",
        ) && desktop.initial.background.loaded,
      backgroundKeepsOriginalRatio:
        Math.abs(desktop.initial.background.naturalRatio - 16 / 9) < 0.002,
      backgroundUsesCoverWithoutModifyingFilter:
        desktop.initial.background.objectFit === "cover" &&
        desktop.initial.background.objectPosition === "50% 50%" &&
        desktop.initial.background.transform === "none" &&
        desktop.initial.background.filter === "none",
      backgroundCoversWholeSceneCanvas: all.every(fillsStoryArea),
      navigationStaysAboveBackground:
        all.every(
          (result) =>
            result.initial.navZIndex > 0 &&
            result.initial.navBackground !==
              "rgba(0, 0, 0, 0)" &&
            result.initial.navBackdropFilter !== "none",
        ),
      backgroundDoesNotBlockPointer:
        all.every(
          (result) =>
            result.initial.background.pointerEvents === "none",
        ),
      marketSceneIsSingleAdvanceTarget:
        all.every(
          (result) =>
            result.initial.advance.target === "ending" &&
            result.initial.advance.ariaLabel.includes(
              "点击画面任意位置",
            ) &&
            result.initial.advance.coversHero &&
            result.initial.advance.cursor === "pointer" &&
            result.initial.advance.pointerEvents === "auto" &&
            result.initial.advance.zIndex > 2 &&
            result.initial.advance.cueVisible &&
            result.initial.advance.hitTargets.every(Boolean),
        ),
      sceneClickAdvancesToEnding:
        all.every(
          (result) =>
            result.sceneClick.currentPage === "ending" &&
            result.sceneClick.hash === "#ni-ren-zhang/ending" &&
            result.sceneClick.endingVisible,
        ),
      sceneAdvanceSupportsKeyboard:
        desktop.keyboardAdvance.currentPage === "ending" &&
        desktop.keyboardAdvance.endingVisible,
      noExtraStoryScrollbars: all.every(hasNoScroll),
      localGradientOnly:
        desktop.initial.washBackground.includes("linear-gradient") &&
        desktop.initial.washBackground.includes("rgba(246, 239, 225, 0)"),
      titleMovesToTopLeft:
        desktop.initial.heading.leftRatio >= 0.03 &&
        desktop.initial.heading.leftRatio <= 0.04 &&
        desktop.initial.heading.top > desktop.initial.navBottom &&
        desktop.initial.heading.textAlign === "left" &&
        desktop.initial.heading.backgroundColor === "rgba(0, 0, 0, 0)",
      headingUsesReadingColumnWidth:
        desktop.initial.heading.widthRatio >= 0.28 &&
          desktop.initial.heading.widthRatio <= 0.32 ||
        desktop.initial.heading.width === 580,
      originalTextPreserved:
        desktop.initial.heading.eyebrowText === "第五幕 · 估衣街" &&
        desktop.initial.heading.titleText ===
          "从一只泥像，到一排泥像" &&
        desktop.initial.heading.introText ===
          "第二天，估衣街的摊位上出现了一排排小泥像。人们停下来看，也笑起来：被捏住的神态已经传遍街头。",
      titleAndCopyRemainReadable:
        desktop.initial.heading.titleFontSize >= 32 &&
        desktop.initial.heading.introFontSize >= 14 &&
        desktop.initial.heading.introFontSize <= 16 &&
        desktop.initial.heading.introLineHeight >= 1.7 &&
        desktop.initial.heading.titleContained,
      headingDoesNotCoverRightFigures:
        [wide, desktop, laptop, tablet].every(
          (result) =>
            result.initial.heading.right <
            result.initial.viewport.width * 0.52,
        ),
      topControlsRemainClickable:
        desktop.initial.topControls.every(
          (control) =>
            control.visible &&
            control.pointerEvents !== "none",
        ),
      chapterNavigationPreserved:
        desktop.initial.activeMarketNav &&
        desktop.initial.endingNavPresent &&
        desktop.navigation.chapterJump.currentPage === "ending" &&
        desktop.navigation.chapterJump.endingVisible,
      originalReaderWorks:
        desktop.navigation.originalModal.visible &&
        desktop.navigation.originalModal.textLength > 1000,
      returnsToStreet:
        desktop.navigation.backToStreet.hash === "#street" &&
        desktop.navigation.backToStreet.streetVisible,
      mobileTitleContainedAndReadable:
        mobile.initial.heading.left >= 9 &&
        mobile.initial.heading.right <= mobile.initial.viewport.width - 9 &&
        mobile.initial.heading.bottom <= mobile.initial.viewport.height &&
        mobile.initial.heading.titleContained,
      allViewportsHaveNoHorizontalOverflow:
        all.every(
          (result) => result.initial.horizontalOverflow <= 0,
        ),
      noBrowserErrors: all.every(
        (result) =>
          result.errors.pageErrors.length === 0 &&
          result.errors.consoleErrors.length === 0,
      ),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions,
      results: { wide, desktop, laptop, tablet, mobile },
      failed: Object.entries(assertions)
        .filter(([, value]) => !value)
        .map(([name]) => name),
      errors: [],
      passed: Object.values(assertions).every(Boolean),
    };
    fs.mkdirSync(path.join(ROOT, "output"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "output", "qa-ni-ren-zhang-market.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(
      JSON.stringify(
        {
          passed: report.passed,
          assertionCount: Object.keys(assertions).length,
          failed: report.failed,
          errors: report.errors,
        },
        null,
        2,
      ),
    );
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
