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
  "qa-ni-ren-zhang-craft-background.json",
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

function clean(text) {
  return (text || "").replace(/\s+/g, "").trim();
}

async function openCraft(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/craft`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "craft",
  );
  await page.waitForFunction(() => {
    const image = document.querySelector(".nr-clay-chapter-background");
    return Boolean(image?.complete && image.naturalWidth);
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
    const pageElement = document.querySelector("#nrPageCraft");
    const background = pageElement.querySelector(
      ".nr-clay-chapter-background",
    );
    const wash = pageElement.querySelector(".nr-clay-chapter-wash");
    const title = pageElement.querySelector("#nrCraftTitle");
    const heading = pageElement.querySelector(".nr-clay-heading");
    const cards = [...pageElement.querySelectorAll(".nr-craft-card")];
    const studioButton = pageElement.querySelector("#nrOpenClayStudio");
    const revealButton = pageElement.querySelector('[data-nr-next="reveal"]');
    const activePage = document.querySelector(
      "[data-nr-page-panel]:not([hidden])",
    );
    const activeNav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );
    const backgroundStyle = styleOf(background);
    const washStyle = styleOf(wash);

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      activePage: activePage?.dataset.nrPagePanel || null,
      activeNav: activeNav?.dataset.nrPage || null,
      hash: location.hash,
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
      pageRect: rectOf(pageElement),
      background: {
        source: background.getAttribute("src"),
        loaded:
          Boolean(background.complete) && background.naturalWidth > 0,
        naturalWidth: background.naturalWidth,
        naturalHeight: background.naturalHeight,
        rect: rectOf(background),
        objectFit: backgroundStyle.objectFit,
        objectPosition: backgroundStyle.objectPosition,
        opacity: Number(backgroundStyle.opacity),
        zIndex: backgroundStyle.zIndex,
        pointerEvents: backgroundStyle.pointerEvents,
        filter: backgroundStyle.filter,
      },
      wash: {
        rect: rectOf(wash),
        background: washStyle.backgroundImage,
        zIndex: washStyle.zIndex,
        pointerEvents: washStyle.pointerEvents,
      },
      heading: {
        rect: rectOf(heading),
        zIndex: styleOf(heading).zIndex,
        eyebrow: clean(pageElement.querySelector(".nr-eyebrow")?.textContent),
        title: clean(title?.textContent),
        intro: clean(
          heading?.querySelector(":scope > p:last-child")?.textContent,
        ),
        titleFontSize: Number.parseFloat(styleOf(title).fontSize),
      },
      cardsContainerZIndex: styleOf(
        pageElement.querySelector(".nr-clay-tutorial-cards"),
      ).zIndex,
      cards: cards.map((card) => ({
        rect: rectOf(card),
        zIndex: styleOf(card).zIndex,
        index: clean(card.querySelector(".nr-step-index")?.textContent),
        title: clean(card.querySelector("h3")?.textContent),
        copy: clean(card.querySelector("p")?.textContent),
        note: clean(card.querySelector("small")?.textContent),
        imageLoaded:
          Boolean(card.querySelector("img")?.complete) &&
          card.querySelector("img").naturalWidth > 0,
      })),
      buttons: {
        studio: {
          rect: rectOf(studioButton),
          text: clean(studioButton?.textContent),
          disabled: studioButton?.disabled,
        },
        reveal: {
          rect: rectOf(revealButton),
          text: clean(revealButton?.textContent),
          disabled: revealButton?.disabled,
        },
      },
      studioOpen: !pageElement.querySelector("#nrClayWorkshop")?.hidden,
      navLabels: [
        ...document.querySelectorAll(".nr-step-nav strong"),
      ].map((element) => clean(element.textContent)),
      toolbarLabels: [
        ...document.querySelectorAll(".nr-toolbar button"),
      ].map((element) => clean(element.textContent)),
      pageScroll: {
        top: pageElement.scrollTop,
        height: pageElement.scrollHeight,
        clientHeight: pageElement.clientHeight,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

function attachErrorCapture(page, errors, label) {
  page.on("pageerror", (error) => {
    errors.push(`${label}: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label}: ${message.text()}`);
    }
  });
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
  attachErrorCapture(page, errors, name);

  await openCraft(page);
  const initial = await inspect(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      `ni-ren-zhang-craft-background-${name}.png`,
    ),
  });

  await page.evaluate(() => {
    const panel = document.querySelector("#nrPageCraft");
    panel.scrollTop = panel.scrollHeight;
  });
  const scrolled = await inspect(page);
  if (mobile) {
    await page.screenshot({
      path: path.join(
        ROOT,
        `ni-ren-zhang-craft-background-${name}-scroll.png`,
      ),
    });
  }

  await page.locator("#nrOpenClayStudio").click();
  await page.waitForFunction(
    () => !document.querySelector("#nrClayWorkshop").hidden,
  );
  const studioOpened = await inspect(page);
  if (await page.locator("#nrClayWelcome").isVisible()) {
    await page.locator("#nrClaySkipWelcome").click();
    await page.waitForFunction(
      () => document.querySelector("#nrClayWelcome").hidden,
    );
  }
  await page.locator("[data-clay-close]").click();
  await page.waitForFunction(
    () => document.querySelector("#nrClayWorkshop").hidden,
  );

  await page.locator('[data-nr-next="reveal"]').click();
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "reveal",
  );
  const reveal = await page.evaluate(() => {
    const image = document.querySelector(".nr-reveal-background");
    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      visible: !document.querySelector("#nrPageReveal").hidden,
      imageLoaded:
        Boolean(image?.complete) &&
        image.naturalWidth > 0 &&
        image.naturalHeight > 0,
    };
  });

  await context.close();
  return { initial, scrolled, studioOpened, reveal, errors };
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
    const mobile = await runViewport(
      browser,
      { width: 390, height: 844 },
      "mobile-390",
      true,
    );
    const all = [wide, desktop, laptop, mobile];

    const fillsViewport = (state) =>
      Math.abs(state.background.rect.left) <= 1 &&
      Math.abs(state.background.rect.top) <= 1 &&
      Math.abs(
        state.background.rect.width - state.viewport.width,
      ) <= 1 &&
      Math.abs(
        state.background.rect.height - state.viewport.height,
      ) <= 1;

    const expectedCards = [
      ["01", "揉出泥团"],
      ["02", "添形刻画"],
      ["03", "修整完成"],
    ];
    const checks = {
      newWorkshopBackgroundLoaded: all.every(
        (result) =>
          result.initial.background.source.includes(
            "/public/images/niren-zhang/environment/clay-studio-workshop.png",
          ) &&
          result.initial.background.loaded &&
          result.initial.background.naturalWidth === 1671 &&
          result.initial.background.naturalHeight === 941,
      ),
      backgroundFillsEveryViewport: all.every(
        (result) =>
          fillsViewport(result.initial) &&
          fillsViewport(result.scrolled),
      ),
      backgroundUsesCoverAndOriginalAspectRatio: all.every(
        (result) =>
          result.initial.background.objectFit === "cover" &&
          result.initial.background.objectPosition === "50% 50%",
      ),
      imageOnlyIsFaded: all.every(
        (result) =>
          Math.abs(result.initial.background.opacity - 0.42) < 0.001 &&
          result.initial.background.pointerEvents === "none",
      ),
      washSitsAboveImageWithoutBlocking: all.every(
        (result) =>
          result.initial.background.zIndex === "0" &&
          result.initial.wash.zIndex === "1" &&
          result.initial.wash.pointerEvents === "none" &&
          result.initial.wash.background.includes("linear-gradient"),
      ),
      foregroundSitsAboveWash: all.every(
        (result) =>
          result.initial.heading.zIndex === "2" &&
          result.initial.cardsContainerZIndex === "2",
      ),
      titleAndIntroPreserved: all.every(
        (result) =>
          result.initial.heading.eyebrow === "第三幕·袖中捏泥" &&
          result.initial.heading.title === "一块泥，三步行" &&
          result.initial.heading.intro ===
            "揉泥、塑形、完成。先看清手艺的三步节奏，再进入工坊，从一团不规则泥料开始制作属于自己的海张五泥像。",
      ),
      threeTutorialCardsPreserved: all.every(
        (result) =>
          result.initial.cards.length === 3 &&
          result.initial.cards.every(
            (card, index) =>
              card.index === expectedCards[index][0] &&
              card.title === expectedCards[index][1] &&
              card.copy.length > 10 &&
              card.note.length > 8 &&
              card.imageLoaded &&
              card.rect.width > 0 &&
              card.rect.height > 0,
          ),
      ),
      navigationAndToolbarPreserved: all.every(
        (result) =>
          result.initial.activePage === "craft" &&
          result.initial.activeNav === "craft" &&
          result.initial.navLabels.join("|") ===
            "天庆馆|识人|捏泥|亮相|估衣街|结局|读后" &&
          result.initial.toolbarLabels.join("|") ===
            "←回到老街|跳过互动|阅读原文|重新体验",
      ),
      studioButtonWorks: all.every(
        (result) =>
          result.initial.buttons.studio.text ===
            "进入自由捏泥工坊→" &&
          result.initial.buttons.studio.disabled === false &&
          result.studioOpened.studioOpen,
      ),
      revealButtonWorks: all.every(
        (result) =>
          result.initial.buttons.reveal.text === "看泥像亮相→" &&
          result.initial.buttons.reveal.disabled === false &&
          result.reveal.currentPage === "reveal" &&
          result.reveal.hash === "#ni-ren-zhang/reveal" &&
          result.reveal.visible &&
          result.reveal.imageLoaded,
      ),
      noHorizontalOverflow: all.every(
        (result) => result.initial.horizontalOverflow <= 0,
      ),
      noBrowserErrors: all.every((result) => result.errors.length === 0),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      pageOrigin: ORIGIN,
      checks,
      results: { wide, desktop, laptop, mobile },
      failed: Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name),
      errors: all.flatMap((result) => result.errors),
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
