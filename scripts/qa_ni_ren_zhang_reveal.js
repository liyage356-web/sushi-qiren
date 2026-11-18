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

async function openReveal(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#ni-ren-zhang/reveal`, {
    waitUntil: "networkidle",
  });
  await page.locator("#nrPageReveal").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-reveal-background");
    return image?.complete && image.naturalWidth === 1671;
  });
}

async function inspect(page) {
  return page.evaluate(() => {
    const pagePanel = document.querySelector("#nrPageReveal");
    const background = document.querySelector(".nr-reveal-background");
    const wash = document.querySelector(".nr-reveal-wash");
    const panel = document.querySelector("#nrPageReveal .nr-copy-panel");
    const title = document.querySelector("#nrRevealTitle");
    const buttons = [
      ...document.querySelectorAll(
        "#nrPageReveal .nr-page-actions button",
      ),
    ];
    const pageRect = pagePanel.getBoundingClientRect();
    const backgroundRect = background.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const panelStyle = getComputedStyle(panel);
    const backgroundStyle = getComputedStyle(background);
    const washStyle = getComputedStyle(wash);
    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      pageRect: {
        left: pageRect.left,
        top: pageRect.top,
        width: pageRect.width,
        height: pageRect.height,
      },
      source: background.getAttribute("src"),
      imageLoaded:
        background.complete &&
        background.naturalWidth === 1671 &&
        background.naturalHeight === 941,
      imageObjectFit: backgroundStyle.objectFit,
      imageObjectPosition: backgroundStyle.objectPosition,
      backgroundCoversPage:
        Math.abs(backgroundRect.left - pageRect.left) <= 1 &&
        Math.abs(backgroundRect.top - pageRect.top) <= 1 &&
        Math.abs(backgroundRect.width - pageRect.width) <= 1 &&
        Math.abs(backgroundRect.height - pageRect.height) <= 1,
      washCoversPage:
        Math.abs(wash.getBoundingClientRect().width - pageRect.width) <= 1 &&
        Math.abs(wash.getBoundingClientRect().height - pageRect.height) <= 1,
      washImage: washStyle.backgroundImage,
      panel: {
        left: panelRect.left,
        top: panelRect.top,
        right: panelRect.right,
        bottom: panelRect.bottom,
        width: panelRect.width,
        height: panelRect.height,
        widthRatio: panelRect.width / innerWidth,
        leftRatio: panelRect.left / innerWidth,
        overflowY: panelStyle.overflowY,
        backgroundColor: panelStyle.backgroundColor,
        backgroundImage: panelStyle.backgroundImage,
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
      },
      titleText: title.textContent.replace(/\s+/g, " ").trim(),
      titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
      intro: panel
        .querySelector(":scope > p:not(.nr-eyebrow)")
        .textContent.replace(/\s+/g, " ")
        .trim(),
      detailCount: panel.querySelectorAll(".nr-detail-list > article").length,
      sourceNotePresent: Boolean(panel.querySelector(".nr-source-note")),
      buttonLabels: buttons.map((button) =>
        button.textContent.replace(/\s+/g, " ").trim(),
      ),
      buttonsInsidePanel: buttons.every((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.left >= panelRect.left - 1 &&
          rect.right <= panelRect.right + 1
        );
      }),
      oldShowcasePresent: Boolean(
        document.querySelector("#nrPageReveal .nr-clay-showcase"),
      ),
      oldSpotlightPresent: Boolean(
        document.querySelector("#nrPageReveal .nr-spotlight"),
      ),
      navRevealCurrent: document
        .querySelector('[data-nr-page="reveal"]')
        ?.getAttribute("aria-current") === "page",
      horizontalOverflow:
        document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function runViewport(browser, viewport, screenshotName, mobile = false) {
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

  await openReveal(page);
  await page.waitForTimeout(220);
  const initial = await inspect(page);
  await page.screenshot({
    path: path.join(ROOT, screenshotName),
  });

  let interactions = null;
  if (!mobile) {
    await page.locator("#nrPageReveal [data-nr-original]").click();
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
    await page.locator("#sharedOriginalReader").waitFor({
      state: "hidden",
    });
    await page.locator('[data-nr-next="market"]').click();
    await page.waitForFunction(
      () => window.niRenZhangStory.getCurrentPage() === "market",
    );
    interactions = await page.evaluate(() => ({
      currentPage: window.niRenZhangStory.getCurrentPage(),
      marketVisible: !document.querySelector("#nrPageMarket").hidden,
    }));
    interactions.originalModal = originalModal;
  } else {
    const button = page.locator('[data-nr-next="market"]');
    await button.scrollIntoViewIfNeeded();
    const visibleAfterScroll = await button.isVisible();
    await button.click();
    await page.waitForFunction(
      () => window.niRenZhangStory.getCurrentPage() === "market",
    );
    interactions = await page.evaluate(
      (wasVisible) => ({
        buttonVisibleAfterPanelScroll: wasVisible,
        currentPage: window.niRenZhangStory.getCurrentPage(),
        marketVisible: !document.querySelector("#nrPageMarket").hidden,
      }),
      visibleAfterScroll,
    );
  }

  await context.close();
  return {
    initial,
    interactions,
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
      "ni-ren-zhang-reveal-wide-1920.png",
    );
    const desktop = await runViewport(
      browser,
      { width: 1440, height: 900 },
      "ni-ren-zhang-reveal-desktop.png",
    );
    const laptop = await runViewport(
      browser,
      { width: 1366, height: 768 },
      "ni-ren-zhang-reveal-laptop.png",
    );
    const tablet = await runViewport(
      browser,
      { width: 1024, height: 768 },
      "ni-ren-zhang-reveal-tablet.png",
    );
    const mobile = await runViewport(
      browser,
      { width: 390, height: 844 },
      "ni-ren-zhang-reveal-mobile-390.png",
      true,
    );

    const assertions = {
      suppliedBackgroundIsUsed:
        desktop.initial.source.includes(
          "/reveal/tea-house-clay-reveal.png",
        ) &&
        desktop.initial.imageLoaded,
      backgroundCoversFullContent:
        desktop.initial.backgroundCoversPage &&
        desktop.initial.washCoversPage,
      backgroundUsesCoverWithoutStretch:
        desktop.initial.imageObjectFit === "cover",
      oldSplitSceneRemoved:
        !desktop.initial.oldShowcasePresent &&
        !desktop.initial.oldSpotlightPresent,
      readingPanelMovesLeft:
        desktop.initial.panel.leftRatio >= 0.03 &&
        desktop.initial.panel.leftRatio <= 0.05 &&
        desktop.initial.panel.right < desktop.initial.pageRect.width * 0.37,
      readingPanelUsesSuggestedWidth:
        desktop.initial.panel.widthRatio >= 0.28 &&
        desktop.initial.panel.widthRatio <= 0.33 &&
        desktop.initial.panel.width <= 480,
      readableTitleAndIntro:
        desktop.initial.titleText ===
          "手里的小人，桌边的一场反转" &&
        desktop.initial.titleFontSize >= 32 &&
        desktop.initial.titleFontSize <= 41 &&
        desktop.initial.intro.includes("泥人张把泥像放在桌上"),
      observationsAndSourceStay:
        desktop.initial.detailCount === 3 &&
        desktop.initial.sourceNotePresent,
      localGradientIsUsed:
        desktop.initial.washImage.includes("linear-gradient") &&
        desktop.initial.panel.backgroundColor === "rgba(0, 0, 0, 0)",
      buttonsPreserved:
        desktop.initial.buttonLabels[0].includes("第二天去估衣街") &&
        desktop.initial.buttonLabels[1].includes("对照原文") &&
        desktop.initial.buttonsInsidePanel,
      desktopNavigationStillWorks:
        desktop.initial.navRevealCurrent &&
        desktop.interactions.originalModal.visible &&
        desktop.interactions.originalModal.textLength > 1000 &&
        desktop.interactions.currentPage === "market" &&
        desktop.interactions.marketVisible,
      laptopBackgroundCoversFullContent:
        laptop.initial.backgroundCoversPage &&
        laptop.initial.imageObjectFit === "cover",
      tabletBackgroundCoversFullContent:
        tablet.initial.backgroundCoversPage &&
        tablet.initial.imageObjectFit === "cover",
      tabletButtonsStayInPanel: tablet.initial.buttonsInsidePanel,
      wideSixteenByNineBackgroundCoversFullContent:
        wide.initial.backgroundCoversPage &&
        wide.initial.imageObjectFit === "cover",
      wideReadingColumnStaysLeft:
        wide.initial.panel.leftRatio >= 0.03 &&
        wide.initial.panel.leftRatio <= 0.05 &&
        wide.initial.panel.right < wide.initial.pageRect.width * 0.31,
      mobileUsesBottomReadingSheet:
        mobile.initial.panel.left <= 11 &&
        mobile.initial.panel.right >= 379 &&
        mobile.initial.panel.top > 220,
      mobileCopyRemainsReadableAndContained:
        mobile.initial.panel.overflowY === "auto" &&
        mobile.initial.buttonsInsidePanel &&
        mobile.initial.panel.bottom <= 844 &&
        mobile.initial.panel.scrollHeight >=
          mobile.initial.panel.clientHeight,
      mobileButtonsRemainReachable:
        mobile.interactions.buttonVisibleAfterPanelScroll &&
        mobile.interactions.currentPage === "market",
      allViewportsHaveNoHorizontalOverflow:
        [wide, desktop, laptop, tablet, mobile].every(
          (result) => result.initial.horizontalOverflow <= 1,
        ),
      noBrowserErrors:
        [wide, desktop, laptop, tablet, mobile].every(
          (result) =>
            result.errors.pageErrors.length === 0 &&
            result.errors.consoleErrors.length === 0,
        ),
    };

    const failed = Object.entries(assertions)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    const errors = [wide, desktop, laptop, tablet, mobile].flatMap((result) => [
      ...result.errors.pageErrors,
      ...result.errors.consoleErrors,
    ]);
    const report = {
      generatedAt: new Date().toISOString(),
      pageOrigin: PAGE_ORIGIN,
      assertions,
      wide,
      desktop,
      laptop,
      tablet,
      mobile,
      failed,
      errors,
      passed: failed.length === 0,
    };
    fs.mkdirSync(path.join(ROOT, "output"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "output", "qa-ni-ren-zhang-reveal.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          passed: report.passed,
          assertionCount: Object.keys(assertions).length,
          failed,
          errors,
        },
        null,
        2,
      ),
    );
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
