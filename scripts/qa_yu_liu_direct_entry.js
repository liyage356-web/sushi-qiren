const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const STORY_URL = `${ORIGIN}si-shi-ba-yang/index.html#sishi/chapter1`;
const reportPath = path.join(ROOT, "output", "qa-yu-liu-direct-entry.json");
const browsers = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function assertCheck(checks, name, passed, detail = "") {
  checks[name] = { passed: Boolean(passed), detail };
  if (!passed) throw new Error(`${name} failed${detail ? `: ${detail}` : ""}`);
}

async function waitForStreet(page) {
  await page.waitForFunction(
    () =>
      window.location.hash === "#street" &&
      !document.querySelector("#streetView")?.hidden &&
      document.querySelector("#characterModal")?.hidden,
  );
}

async function run() {
  const executablePath = browsers.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) throw new Error("No installed Edge/Chrome executable found.");

  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1856, height: 1024 },
    deviceScaleFactor: 1,
  });
  const checks = {};
  const errors = [];
  await page.addInitScript(() => {
    window.__sishiPageHistory = [];
    window.__sishiDirectGuardSeen = false;
    const record = () => {
      if (document.documentElement.classList.contains("sishi-direct-load")) {
        window.__sishiDirectGuardSeen = true;
      }
      const pageName = document.body?.dataset.sishiPage;
      if (
        pageName &&
        window.__sishiPageHistory.at(-1) !== pageName
      ) {
        window.__sishiPageHistory.push(pageName);
      }
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-sishi-page"],
    });
    document.addEventListener("readystatechange", record);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${ORIGIN}#street`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      !document.querySelector("#streetView")?.hidden &&
      document.querySelector("#characterModal")?.hidden,
  );

  const candy = page.locator(".hotspot-candy");
  await candy.hover();
  await page.waitForTimeout(240);
  const hoverState = await candy.evaluate((button) => {
    const portrait = button.querySelector(".hotspot-portrait");
    return {
      cursor: getComputedStyle(button).cursor,
      portraitOpacity: getComputedStyle(portrait).opacity,
      portraitTransform: getComputedStyle(portrait).transform,
    };
  });
  assertCheck(
    checks,
    "yuLiuHoverFeedbackPreserved",
    hoverState.cursor === "pointer" &&
      Number(hoverState.portraitOpacity) > 0.9 &&
      hoverState.portraitTransform !== "none",
    JSON.stringify(hoverState),
  );
  await page.screenshot({
    path: path.join(ROOT, "yu-liu-entry-hover-1366.png"),
    fullPage: false,
  });

  await candy.click();
  await page.waitForURL(STORY_URL);
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  assertCheck(
    checks,
    "clickEntersChapterOneWithoutModal",
    page.url() === STORY_URL &&
      (await page.locator("#sishiOriginal-chapter1").isVisible()) &&
      (await page.locator("[data-sishi-page]").count()) >= 8,
    page.url(),
  );
  const directEntryTrace = await page.evaluate(() => ({
    pages: window.__sishiPageHistory,
    guarded: window.__sishiDirectGuardSeen,
    coverVisible:
      Boolean(document.querySelector(".opening")) &&
      getComputedStyle(document.querySelector(".opening")).display !== "none",
  }));
  assertCheck(
    checks,
    "noIntermediateCoverOrPage",
    directEntryTrace.guarded &&
      directEntryTrace.pages.length === 1 &&
      directEntryTrace.pages[0] === "chapter1" &&
      directEntryTrace.coverVisible === false,
    JSON.stringify(directEntryTrace),
  );
  assertCheck(
    checks,
    "existingStoryContentAndNavigationPresent",
    (await page.locator("#sishiChapterNav [data-sishi-page]").count()) === 7 &&
      (await page.locator("#candyCabinet .candy-box").count()) === 12 &&
      (await page.locator("#readingEntry").count()) === 1,
  );
  await page.screenshot({
    path: path.join(ROOT, "yu-liu-direct-chapter1-1856.png"),
    fullPage: false,
  });

  await page.locator(".back-link").click();
  await waitForStreet(page);
  assertCheck(
    checks,
    "returnToStreetKeepsModalClosed",
    page.url().endsWith("#street") &&
      (await page.locator("#characterModal").isHidden()),
    page.url(),
  );

  await page.locator(".hotspot-candy").dblclick();
  await page.waitForURL(STORY_URL);
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter1",
  );
  assertCheck(
    checks,
    "secondEntryStillDirectAndDebounced",
    page.url() === STORY_URL,
    page.url(),
  );

  await page.locator(".back-link").click();
  await waitForStreet(page);
  await page.locator(".hotspot-clay").click();
  await page.waitForURL("**/index.html#ni-ren-zhang/prelude");
  await page.waitForFunction(
    () => !document.querySelector("#niRenZhangExperience")?.hidden,
  );
  assertCheck(
    checks,
    "clayEntryUnaffected",
    page.url().endsWith("#ni-ren-zhang/prelude") &&
      (await page.locator("#characterModal").isHidden()),
    page.url(),
  );
  await page.locator("#niRenZhangBackButton").click();
  await waitForStreet(page);

  await page.locator(".hotspot-baozi").click();
  await page.waitForURL("**/index.html#gou-bu-li/street");
  await page.waitForFunction(
    () => !document.querySelector("#dogBuLiExperience")?.hidden,
  );
  assertCheck(
    checks,
    "baoziEntryUnaffected",
    page.url().endsWith("#gou-bu-li/street") &&
      (await page.locator("#characterModal").isHidden()),
    page.url(),
  );
  await page.locator("#dogBuLiBackButton").click();
  await waitForStreet(page);

  await page.locator(".hotspot-hei-tou").click();
  await page.waitForURL("**/index.html#heitou/street");
  await page.waitForFunction(
    () => !document.querySelector("#heiTouExperience")?.hidden,
  );
  assertCheck(
    checks,
    "heitouEntryUnaffected",
    page.url().endsWith("#heitou/street") &&
      (await page.locator("#characterModal").isHidden()),
    page.url(),
  );

  assertCheck(checks, "noBrowserErrors", errors.length === 0, errors.join("\n"));
  const report = {
    passed: Object.values(checks).every((check) => check.passed),
    checks,
    errors,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checkCount: Object.keys(checks).length,
        errors,
        report: reportPath,
      },
      null,
      2,
    ),
  );
  await browser.close();
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
