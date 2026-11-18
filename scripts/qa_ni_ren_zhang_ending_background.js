const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ORIGIN = process.argv[2] || "http://127.0.0.1:4173/";
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-ending-background.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  const executable = BROWSERS.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function openEnding(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/ending`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "ending",
  );
  await page.waitForFunction(() => {
    const panel = document.querySelector("#nrPageEnding");
    const source = getComputedStyle(panel).backgroundImage.match(
      /url\(["']?([^"')]+)["']?\)/,
    )?.[1];
    if (!source) return false;
    const image = new Image();
    image.src = source;
    return (
      image.complete && image.naturalWidth === 1672 && image.naturalHeight === 941
    );
  });
  await page.evaluate(() => document.fonts.ready);
}

async function inspect(page) {
  return page.evaluate(() => {
    const clean = (text) =>
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
    const styleOf = (element) => getComputedStyle(element);
    const panel = document.querySelector("#nrPageEnding");
    const sheet = panel.querySelector(".nr-ending-sheet");
    const title = panel.querySelector("#nrEndingTitle");
    const body = sheet.querySelector(
      ":scope > p:not(.nr-eyebrow):not(.nr-ending-original-excerpt)",
    );
    const quote = sheet.querySelector("blockquote");
    const excerpt = sheet.querySelector(".nr-ending-original-excerpt");
    const pathLine = sheet.querySelector(".nr-ending-path i");
    const buttons = [
      ...sheet.querySelectorAll(".nr-page-actions button"),
    ];
    const toolbar = document.querySelector(".nr-toolbar");
    const nav = document.querySelector(".nr-step-nav");
    const sheetStyle = styleOf(sheet);
    const pageStyle = styleOf(panel);
    const sheetRect = rectOf(sheet);
    const navRect = rectOf(nav);

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      viewport: { width: innerWidth, height: innerHeight },
      activePage:
        document.querySelector("[data-nr-page-panel]:not([hidden])")
          ?.dataset.nrPagePanel || null,
      activeNav:
        document.querySelector(
          ".nr-step-nav [aria-current='page']",
        )?.dataset.nrPage || null,
      pageRect: rectOf(panel),
      background: {
        image: pageStyle.backgroundImage,
        color: pageStyle.backgroundColor,
        position: pageStyle.backgroundPosition,
        size: pageStyle.backgroundSize,
        repeat: pageStyle.backgroundRepeat,
      },
      sheet: {
        rect: sheetRect,
        width: sheetStyle.width,
        paddingTop: sheetStyle.paddingTop,
        paddingRight: sheetStyle.paddingRight,
        paddingBottom: sheetStyle.paddingBottom,
        paddingLeft: sheetStyle.paddingLeft,
        backgroundColor: sheetStyle.backgroundColor,
        backgroundImage: sheetStyle.backgroundImage,
        border: sheetStyle.border,
        boxShadow: sheetStyle.boxShadow,
        backdropFilter: sheetStyle.backdropFilter,
        zIndex: sheetStyle.zIndex,
        contentsFitWidth: sheet.scrollWidth <= sheet.clientWidth + 1,
      },
      text: {
        eyebrow: clean(
          sheet.querySelector(".nr-eyebrow")?.textContent,
        ),
        title: clean(title?.textContent),
        body: clean(body?.textContent),
        quote: clean(quote?.textContent),
        excerpt: clean(excerpt?.textContent),
        path: [
          ...sheet.querySelectorAll(".nr-ending-path span"),
        ].map((element) => clean(element.textContent)),
      },
      colors: {
        title: styleOf(title).color,
        body: styleOf(body).color,
        eyebrow: styleOf(
          sheet.querySelector(".nr-eyebrow"),
        ).color,
        quote: styleOf(quote).color,
        excerpt: styleOf(excerpt).color,
        path: styleOf(
          sheet.querySelector(".nr-ending-path"),
        ).color,
        divider: styleOf(pathLine).backgroundColor,
      },
      fonts: {
        title: styleOf(title).fontSize,
        body: styleOf(body).fontSize,
        quote: styleOf(quote).fontSize,
        excerpt: styleOf(excerpt).fontSize,
      },
      markerPresent: Boolean(document.querySelector(".nr-ending-mark")),
      buttons: buttons.map((button) => ({
        text: clean(button.textContent),
        rect: rectOf(button),
        disabled: button.disabled,
      })),
      textButton: {
        color: styleOf(
          sheet.querySelector(".nr-text-button"),
        ).color,
        backgroundColor: styleOf(
          sheet.querySelector(".nr-text-button"),
        ).backgroundColor,
      },
      nav: {
        activeEnding:
          document
            .querySelector('[data-nr-page="ending"]')
            ?.getAttribute("aria-current") === "page",
        labels: [
          ...document.querySelectorAll(".nr-step-nav strong"),
        ].map((element) => clean(element.textContent)),
        toolbarLabels: [
          ...document.querySelectorAll(".nr-toolbar button"),
        ].map((element) => clean(element.textContent)),
        toolbarZIndex: styleOf(toolbar).zIndex,
        navBottom: navRect.bottom,
        cardInsideContentViewport:
          sheetRect.left >= 0 &&
          sheetRect.right <= innerWidth + 1 &&
          sheetRect.top >= navRect.bottom - 1,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

function attachErrors(page, errors, name) {
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${name}: ${message.text()}`);
    }
  });
}

async function testInteractions(page) {
  await page.locator('[data-nr-next="reflection"]').click();
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "reflection",
  );
  const reflection = await page.evaluate(() => ({
    currentPage: window.niRenZhangStory.getCurrentPage(),
    hash: location.hash,
  }));

  await openEnding(page);
  await page
    .locator("#nrPageEnding [data-nr-original]")
    .click();
  await page.locator("#sharedOriginalReader").waitFor({ state: "visible" });
  const original = await page.evaluate(() => ({
    open: document.querySelector("#sharedOriginalReader").open,
    textLength: document
      .querySelector(".shared-original-reader__text")
      .textContent.trim().length,
  }));
  await page.locator(".shared-original-reader__close").click();
  await page.locator("#sharedOriginalReader").waitFor({ state: "hidden" });

  return { reflection, original };
}

async function runViewport(browser, viewport, name, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const errors = [];
  attachErrors(page, errors, name);

  await openEnding(page);
  const initial = await inspect(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      `ni-ren-zhang-ending-background-${name}.png`,
    ),
  });
  const interactions = await testInteractions(page);
  await context.close();
  return { initial, interactions, errors };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: findBrowser(),
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
      { width: 1440, height: 810 },
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

    const expectedText = {
      eyebrow: "第六幕·故事结尾",
      title: "没有争吵，手艺已经说完",
      body:
        "泥人张没有改动故事里的任何一个关键事件。他看见、记住、捏出，再把泥像放回众人眼前。街上的笑声和泥像的重复出现，让一次冒犯变成了众人共同见证的回击。",
      quote: "“贱卖海张五”",
      excerpt:
        "三天后，海张五派人花了大价钱，才把这些泥人全买走，据说连泥模子也买走了。泥人是没了，可“贱卖海张五”这事却传了一百多年，直到今儿个。",
    };
    const expectedWidth = (state) =>
      Math.min(760, state.initial.viewport.width - 40);
    const checks = {
      backgroundAssetUsesCoverAndCenter: all.every(
        (state) =>
          state.initial.background.image.includes(
            "/public/images/niren-zhang/environment/gu-jie-hai-zhang-wu-ending.png",
          ) &&
          state.initial.background.position === "50% 50%" &&
          state.initial.background.size === "cover" &&
          state.initial.background.repeat === "no-repeat",
      ),
      decorativeGreenBackgroundRemoved: all.every(
        (state) =>
          !state.initial.markerPresent &&
          !state.initial.background.image.includes("linear-gradient"),
      ),
      cardUsesWarmPaperSurface: all.every(
        (state) =>
          state.initial.sheet.backgroundColor ===
            "rgba(247, 240, 225, 0.88)" &&
          state.initial.sheet.border.includes("rgba(116, 96, 76, 0.26)") &&
          state.initial.sheet.boxShadow !== "none" &&
          state.initial.sheet.backdropFilter === "none",
      ),
      cardDimensionsAndCenteringPreserved: all.every(
        (state) =>
          Math.abs(state.initial.sheet.rect.width - expectedWidth(state)) <
            1 &&
          Math.abs(
            state.initial.sheet.rect.left +
              state.initial.sheet.rect.width / 2 -
              state.initial.viewport.width / 2,
          ) < 1 &&
          state.initial.nav.cardInsideContentViewport &&
          state.initial.sheet.contentsFitWidth,
      ),
      allOriginalTextPreserved: all.every(
        (state) =>
          state.initial.text.eyebrow === expectedText.eyebrow &&
          state.initial.text.title === expectedText.title &&
          state.initial.text.body === expectedText.body &&
          state.initial.text.quote === expectedText.quote &&
          state.initial.text.excerpt === expectedText.excerpt &&
          state.initial.text.path.join("|") ===
            "天庆馆|桌下捏泥|估衣街",
      ),
      lightCardTextColorsApplied: all.every(
        (state) =>
          state.initial.colors.title === "rgb(48, 43, 37)" &&
          state.initial.colors.body === "rgb(98, 92, 82)" &&
          state.initial.colors.eyebrow === "rgb(169, 101, 84)" &&
          state.initial.colors.quote === "rgb(79, 74, 66)" &&
          state.initial.colors.excerpt === "rgb(75, 70, 62)",
      ),
      cardTypographyPreserved: all.every(
        (state) =>
          state.initial.fonts.title ===
            (state.initial.viewport.width <= 760
              ? "60.8px"
              : `${Math.min(80, state.initial.viewport.width * 0.053)}px`) ||
          state.initial.viewport.width <= 760,
      ),
      navigationStaysAboveContent: all.every(
        (state) =>
          state.initial.nav.activeEnding &&
          Number(state.initial.nav.toolbarZIndex) > 2 &&
          state.initial.nav.labels.join("|") ===
            "天庆馆|识人|捏泥|亮相|估衣街|结局|读后" &&
          state.initial.nav.toolbarLabels.join("|") ===
            "←回到老街|跳过互动|阅读原文|重新体验",
      ),
      bothButtonsPreservedAndWorking: all.every(
        (state) =>
          state.initial.buttons.map((button) => button.text).join("|") ===
            "写下读后笺→|阅读原文" &&
          state.initial.buttons.every((button) => !button.disabled) &&
          state.interactions.reflection.currentPage === "reflection" &&
          state.interactions.reflection.hash ===
            "#ni-ren-zhang/reflection" &&
          state.interactions.original.open &&
          state.interactions.original.textLength > 1000,
      ),
      noHorizontalOverflow: all.every(
        (state) => state.initial.horizontalOverflow <= 0,
      ),
      noBrowserErrors: all.every((state) => state.errors.length === 0),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      pageOrigin: ORIGIN,
      checks,
      results: { wide, desktop, laptop, tablet, mobile },
      failed: Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name),
      errors: all.flatMap((state) => state.errors),
      passed: Object.values(checks).every(Boolean),
    };
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      JSON.stringify({
        passed: report.passed,
        checkCount: Object.keys(checks).length,
        failed: report.failed,
        errors: report.errors,
        report: REPORT_PATH,
      }),
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
