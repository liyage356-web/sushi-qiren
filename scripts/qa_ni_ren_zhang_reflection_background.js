const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const ORIGIN = process.argv[2] || "http://127.0.0.1:4173/";
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-reflection-background.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function openReflection(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/reflection`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "reflection",
  );
  await page.waitForFunction(() => {
    const panel = document.querySelector("#nrPageReflection");
    const source = getComputedStyle(panel).backgroundImage.match(
      /url\(["']?([^"')]+)["']?\)/,
    )?.[1];
    if (!source) return false;
    const image = new Image();
    image.src = source;
    return (
      image.complete && image.naturalWidth === 1671 && image.naturalHeight === 941
    );
  });
  await page.evaluate(() => document.fonts.ready);
}

async function inspect(page) {
  return page.evaluate(() => {
    const clean = (text) => (text || "").replace(/\s+/g, "").trim();
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
    const panel = document.querySelector("#nrPageReflection");
    const pageStyle = getComputedStyle(panel);
    const toolbar = document.querySelector(".nr-toolbar");
    const nav = document.querySelector(".nr-step-nav");
    const source = document.querySelector(
      "#nrPageReflection .nr-reflection-sheet",
    );
    const launcher = document.querySelector("#readingNoteLauncher");
    const modal = document.querySelector("#readingNoteLayer");

    return {
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      hash: location.hash,
      viewport: { width: innerWidth, height: innerHeight },
      activePage:
        document.querySelector("[data-nr-page-panel]:not([hidden])")?.dataset
          .nrPagePanel || null,
      activeNav:
        document.querySelector(".nr-step-nav [aria-current='page']")?.dataset
          .nrPage || null,
      pageRect: rectOf(panel),
      background: {
        image: pageStyle.backgroundImage,
        color: pageStyle.backgroundColor,
        position: pageStyle.backgroundPosition,
        size: pageStyle.backgroundSize,
        repeat: pageStyle.backgroundRepeat,
      },
      toolbar: {
        rect: rectOf(toolbar),
        labels: [...document.querySelectorAll(".nr-toolbar button")].map(
          (button) => clean(button.textContent),
        ),
      },
      nav: {
        rect: rectOf(nav),
        labels: [...document.querySelectorAll(".nr-step-nav strong")].map(
          (element) => clean(element.textContent),
        ),
      },
      noteSource: {
        exists: Boolean(source),
        managed: source?.dataset.readingNoteManaged === "true",
        title: clean(source?.querySelector("h2")?.textContent),
      },
      modal: {
        open: Boolean(modal && !modal.hidden),
        title: clean(document.querySelector("#readingNoteTitle")?.textContent),
        launcherVisible: Boolean(launcher && !launcher.hidden),
        launcherText: clean(launcher?.textContent),
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

async function closeInitialModal(page) {
  await page.locator("#readingNoteLayer .reading-note-close").click();
  await page.locator("#readingNoteLayer").waitFor({ state: "hidden" });
  await page.locator("#readingNoteLauncher").waitFor({ state: "visible" });
}

async function testLauncherAndSaving(page) {
  await page.locator("#readingNoteLauncher").click();
  await page.locator("#readingNoteLayer").waitFor({ state: "visible" });

  const modal = await page.evaluate(() => {
    const layer = document.querySelector("#readingNoteLayer");
    return {
      open: Boolean(layer && !layer.hidden),
      title: document.querySelector("#readingNoteTitle")?.textContent.trim(),
      saveText: document.querySelector("#readingNoteSave")?.textContent.trim(),
      textareaVisible:
        document.querySelector("#readingNoteText")?.getBoundingClientRect()
          .height > 0,
    };
  });

  await page.locator("#readingNoteText").fill("测试读后笺：手艺与骨气。");
  await page.locator("#readingNoteSave").click();
  const saved = await page.evaluate(() => ({
    exists: Boolean(localStorage.getItem("reading-note-nirenzhang")),
    status: document.querySelector("#readingNoteStatus")?.textContent.trim(),
  }));

  await page.evaluate(() => localStorage.removeItem("reading-note-nirenzhang"));
  await page.locator("#readingNoteLayer .reading-note-close").click();
  await page.locator("#readingNoteLauncher").waitFor({ state: "visible" });

  return { modal, saved };
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

  await openReflection(page);
  await closeInitialModal(page);
  await page
    .locator("#readingNoteLauncher")
    .evaluate((element) => element.blur());
  const initial = await inspect(page);
  await page.screenshot({
    path: path.join(
      ROOT,
      `ni-ren-zhang-reflection-background-${name}.png`,
    ),
  });
  const interaction = await testLauncherAndSaving(page);

  await context.close();
  return { initial, interaction, errors };
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

    const checks = {
      reflectionBackgroundUsesSuppliedImage: all.every(
        (state) =>
          state.initial.background.image.includes(
            "/public/images/niren-zhang/environment/tianjin-clay-street-scene.png",
          ) && !state.initial.background.image.includes("paper-fibers"),
      ),
      backgroundUsesCoverAndCenter: all.every(
        (state) =>
          state.initial.background.position === "50% 50%" &&
          state.initial.background.size === "cover" &&
          state.initial.background.repeat === "no-repeat",
      ),
      backgroundCoversContentViewport: all.every(
        (state) =>
          Math.abs(state.initial.pageRect.width - state.initial.viewport.width) <
            1 &&
          Math.abs(
            state.initial.pageRect.height - state.initial.viewport.height,
          ) < 1,
      ),
      reflectionRouteAndNavigationPreserved: all.every(
        (state) =>
          state.initial.currentPage === "reflection" &&
          state.initial.hash === "#ni-ren-zhang/reflection" &&
          state.initial.activePage === "reflection" &&
          state.initial.activeNav === "reflection" &&
          state.initial.nav.labels.join("|") ===
            "天庆馆|识人|捏泥|亮相|估衣街|结局|读后" &&
          state.initial.toolbar.labels.join("|") ===
            "←回到老街|跳过互动|阅读原文|重新体验",
      ),
      readingNoteManagedContentPreserved: all.every(
        (state) =>
          state.initial.noteSource.exists &&
          state.initial.noteSource.managed &&
          state.initial.noteSource.title === "你看见了哪一种力量？",
      ),
      continueWritingLauncherPreserved: all.every(
        (state) =>
          state.initial.modal.launcherVisible &&
          state.initial.modal.launcherText === "继续写读后笺",
      ),
      readingNoteCanOpenAndSave: all.every(
        (state) =>
          state.interaction.modal.open &&
          state.interaction.modal.title ===
            "泥人张真正让你佩服的是什么？" &&
          state.interaction.modal.saveText === "保存读后笺" &&
          state.interaction.modal.textareaVisible &&
          state.interaction.saved.exists &&
          state.interaction.saved.status === "你的读后笺已经收好。",
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
