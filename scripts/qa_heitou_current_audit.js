const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-heitou-current-audit.json");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function createPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
    deviceScaleFactor: options.deviceScaleFactor || 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return { context, page, errors };
}

async function snapshot(page) {
  return page.evaluate(() => ({
    route: location.hash,
    experienceVisible:
      document.querySelector("#heiTouExperience")?.hidden === false,
    activePanel: document.querySelector(
      "[data-story-page-panel]:not([hidden])",
    )?.dataset.storyPagePanel,
    activeNav: document.querySelector(
      ".story-step-nav [aria-current='page']",
    )?.textContent.trim(),
    feedAttempts: Number(
      document.querySelector("#streetFeedAttempt")?.textContent || 0,
    ),
    followDisabled: document.querySelector("#streetFollowButton")?.disabled,
    fishLevel: Number(
      document.querySelector("#fishCanvas")?.dataset.fishLevel || 0,
    ),
    fishPrompt: document
      .querySelector("#fishPrompt")
      ?.textContent.trim(),
    yardState: document.querySelector("#yardCanvas")?.dataset.yardState,
    yardDoor: document.querySelector("#yardDoorStatus")?.textContent.trim(),
    yardStageStates: [
      ...document.querySelectorAll(".yard-state-button[data-yard-state]"),
    ].map((button) => button.dataset.yardState),
    yardStageLabels: [
      ...document.querySelectorAll(".yard-state-button[data-yard-state]"),
    ].map((button) => button.textContent.trim()),
    originalParagraphs: document.querySelectorAll("#storyOriginal > p").length,
    epilogueStep: Number(
      document.querySelector("#epilogueScene")?.dataset.epilogueStep || 0,
    ),
    epilogueTitle: document
      .querySelector("#endingPageTitle")
      ?.textContent.trim(),
    epilogueVisible:
      document.querySelector("#epilogueScene")?.hidden !== true,
    originalReaderTriggerVisible:
      document.querySelector("#heitouNavOriginal")?.hidden === false,
    images: [...document.querySelectorAll("#heiTouExperience img")].map(
      (image) => ({
        source: image.getAttribute("src"),
        loaded: image.complete && image.naturalWidth > 0,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }),
    ),
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
}

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const checks = {};
  const errors = [];
  function check(name, condition, detail = "") {
    checks[name] = { passed: Boolean(condition), detail };
  }

  const desktopSession = await createPage(browser, {
    width: 1366,
    height: 900,
  });
  const page = desktopSession.page;
  errors.push(...desktopSession.errors);
  await page.goto(`${ORIGIN}#heitou/street`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector("#heiTouExperience")?.hidden === false,
  );
  await page.waitForTimeout(250);
  const street = await snapshot(page);
  check(
    "streetSceneAndCharactersLoad",
    street.experienceVisible &&
      street.activePanel === "street" &&
      street.images
        .filter((image) => image.source)
        .every((image) => image.loaded) &&
      street.overflow <= 1,
    JSON.stringify(street),
  );

  await page.locator("[data-street-object='cargo']").click();
  await page.locator("#streetDogHotspot").click();
  await page.waitForFunction(
    () => document.querySelector("#streetExplore")?.dataset.state === "focused",
  );
  check(
    "streetHotspotsOpenDogObservation",
    await page.locator("#streetFocusCard").isVisible(),
  );

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.locator("#streetFeedFood").click();
    await page.locator("#streetFeedTarget").click();
    await page.waitForFunction(
      (expected) =>
        Number(document.querySelector("#streetFeedAttempt")?.textContent) ===
        expected,
      attempt,
    );
    await page.waitForTimeout(850);
  }
  const fedStreet = await snapshot(page);
  check(
    "twoStreetFeedAttemptsUnlockFollow",
    fedStreet.feedAttempts === 2 && fedStreet.followDisabled === false,
    JSON.stringify(fedStreet),
  );

  await page.locator("#streetFollowButton").click();
  await page.waitForFunction(
    () => document.querySelector("#fishCanvas")?.dataset.fishLevel === "0",
  );
  for (let level = 1; level <= 3; level += 1) {
    await page.locator("#fishTarget").click();
    await page.waitForFunction(
      (expected) =>
        document.querySelector("#fishCanvas")?.dataset.fishLevel ===
        String(expected),
      level,
      { timeout: 7000 },
    );
  }
  const fish = await snapshot(page);
  check(
    "threeFishFeedsReachTrustState",
    fish.activePanel === "fish" &&
      fish.fishLevel === 3 &&
      fish.images
        .filter((image) => image.source)
        .every((image) => image.loaded),
    JSON.stringify(fish),
  );

  await page
    .locator(".story-step-nav [data-story-page='courtyard']")
    .click();
  await page.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.yardState === "follow",
  );
  await page.locator("[data-yard-state='accepted']").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#yardCanvas")?.dataset.yardState === "accepted",
  );
  await page.evaluate(() => window.setYardState("guard"));
  await page.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.yardState === "guard",
  );
  await page.evaluate(() => window.setYardState("leave"));
  await page.waitForFunction(
    () => document.querySelector("#yardCanvas")?.dataset.yardState === "leave",
  );
  const yard = await snapshot(page);
  check(
    "courtyardKeepsTwoStageSelectorsAndGateResponds",
    yard.activePanel === "courtyard" &&
      yard.yardState === "leave" &&
      yard.yardDoor === "夺门而去" &&
      yard.yardStageStates.join(",") === "follow,accepted" &&
      yard.yardStageLabels.join(",") === "一 · 跟随,二 · 接纳",
    JSON.stringify(yard),
  );

  await page.locator(".story-step-nav [data-story-page='ending']").click();
  await page.waitForFunction(
    () => document.querySelector("#storyPageEnding")?.hidden === false,
  );
  await page.waitForTimeout(150);
  const ending = await snapshot(page);
  check(
    "endingUsesFourStageSceneAndKeepsOriginalReaderEntry",
    ending.activePanel === "ending" &&
      ending.epilogueVisible &&
      ending.epilogueStep === 0 &&
      ending.epilogueTitle === "尾声" &&
      ending.originalParagraphs === 0 &&
      ending.originalReaderTriggerVisible,
    JSON.stringify(ending),
  );

  await page.context().close();

  const mobileSession = await createPage(
    browser,
    { width: 390, height: 844 },
    { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  );
  const mobile = mobileSession.page;
  errors.push(...mobileSession.errors);
  await mobile.goto(`${ORIGIN}#heitou/street`, { waitUntil: "networkidle" });
  await mobile.waitForFunction(
    () => document.querySelector("#heiTouExperience")?.hidden === false,
  );
  await mobile.waitForTimeout(200);
  const mobileStreet = await snapshot(mobile);
  await mobile.locator("#streetDogHotspot").tap();
  await mobile.waitForFunction(
    () => document.querySelector("#streetExplore")?.dataset.state === "focused",
  );
  const mobileFocus = await snapshot(mobile);
  check(
    "mobileStreetAndFirstPersonFocusWork",
    mobileStreet.images
      .filter((image) => image.source)
      .every((image) => image.loaded) &&
      mobileStreet.overflow <= 1 &&
      mobileFocus.overflow <= 1 &&
      await mobile.locator("#streetFocusCard").isVisible(),
    JSON.stringify({ mobileStreet, mobileFocus }),
  );
  await mobile.context().close();

  check("noBrowserErrors", errors.length === 0, errors.join("\n"));
  const passed = Object.values(checks).every((entry) => entry.passed);
  const report = {
    passed,
    checkCount: Object.keys(checks).length,
    checks,
    errors,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed,
        checkCount: report.checkCount,
        failed: Object.entries(checks)
          .filter(([, entry]) => !entry.passed)
          .map(([name]) => name),
        errors,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
