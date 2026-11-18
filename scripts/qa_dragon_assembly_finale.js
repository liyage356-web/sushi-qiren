const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const ORIGIN = "http://127.0.0.1:4173/";
const REPORT = path.join(ROOT, "output", "qa-dragon-assembly-finale.json");
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const PART_ORDER = [
  "bucketLeft",
  "bucketRight",
  "yoke",
  "dragonLeft",
  "dragonRight",
  "goldBead",
  "pompomLeft",
  "pompomRight",
  "springLeft",
  "springRight",
  "signLeft",
  "signRight",
];

function findBrowser() {
  return BROWSERS.find((candidate) => fs.existsSync(candidate));
}

async function openAssembly(page) {
  await page.goto(`${ORIGIN}si-shi-ba-yang/#sishi/chapter3`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter3",
  );
  await page
    .locator("#sishiOriginal-chapter3")
    .getByRole("button", { name: "进入本段互动" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#assemblyBackyard .sishi-interaction-content")
        ?.hidden === false,
  );
  await page.waitForTimeout(300);
}

async function installAllParts(page, { leaveLast = false } = {}) {
  const ids = leaveLast ? PART_ORDER.slice(0, -1) : PART_ORDER;
  return page.evaluate((partIds) => {
    return partIds.map((id) =>
      window.dragonAssemblyComponent.installPart(id),
    );
  }, ids);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const component = document.querySelector("#dragonAssembly");
    const canvas = document
      .querySelector(".dragon-assembly__coordinate")
      .getBoundingClientRect();
    const completion = document.querySelector("#assemblyComplete");
    const readingTarget = document.querySelector("#si-shi-ba-yang-p14");
    const readingDialog = document.querySelector("#readingDialog");
    const style = (element) => {
      if (!element) return null;
      const computed = getComputedStyle(element);
      return {
        animationName: computed.animationName,
        animationDelay: computed.animationDelay,
        animationDuration: computed.animationDuration,
        opacity: Number(computed.opacity),
        rotate: computed.rotate,
        translate: computed.translate,
        pointerEvents: computed.pointerEvents,
      };
    };
    const normalizedCenter = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return {
        x: (rect.left - canvas.left + rect.width / 2) / canvas.width,
        y: (rect.top - canvas.top + rect.height / 2) / canvas.height,
      };
    };
    return {
      page: document.body.dataset.sishiPage,
      hash: location.hash,
      controller: window.dragonAssemblyComponent.getSnapshot(),
      finaleState: component.dataset.finaleState,
      finalizing: component.classList.contains("is-finalizing"),
      finaleComplete: component.classList.contains("is-finale-complete"),
      completion: {
        hidden: completion.hidden,
        ariaHidden: completion.getAttribute("aria-hidden"),
        opacity: Number(getComputedStyle(completion).opacity),
        animationName: getComputedStyle(completion).animationName,
        text: completion.textContent.replace(/\s+/g, " ").trim(),
        clientWidth: completion.clientWidth,
        scrollWidth: completion.scrollWidth,
        clientHeight: completion.clientHeight,
        scrollHeight: completion.scrollHeight,
        readingButtonVisible: !document
          .querySelector("#assemblyContinueReading")
          .closest("[hidden]"),
      },
      coordinate: style(
        document.querySelector(".dragon-assembly__coordinate"),
      ),
      signs: [
        style(document.querySelector(".dragon-assembly__layer--sign")),
        style(document.querySelector(".dragon-assembly__layer--sign-right")),
      ],
      pompoms: [
        style(
          document.querySelector(".dragon-assembly__layer--pompom-left"),
        ),
        style(
          document.querySelector(".dragon-assembly__layer--pompom-right"),
        ),
      ],
      background: style(
        document.querySelector(".dragon-assembly__background"),
      ),
      centers: {
        bucketLeft: normalizedCenter(
          ".dragon-assembly__layer--bucket-left",
        ),
        bucketRight: normalizedCenter(
          ".dragon-assembly__layer--bucket-right",
        ),
        bead: normalizedCenter(".dragon-assembly__layer--bead"),
      },
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      reading: {
        open: Boolean(readingDialog?.open),
        scrollTop: readingDialog?.scrollTop || 0,
        targetExists: Boolean(readingTarget),
        targetOffsetTop: readingTarget?.offsetTop || 0,
        targetText: readingTarget?.textContent || "",
      },
    };
  });
}

function check(checks, name, condition, detail) {
  checks[name] = { passed: Boolean(condition), detail };
}

function normalizedDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

async function runNormal(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`pageerror: ${error.stack || error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await openAssembly(page);
  const initial = await snapshot(page);
  await installAllParts(page, { leaveLast: true });
  const beforeFinalPart = await snapshot(page);
  await page.evaluate(() =>
    window.dragonAssemblyComponent.installPart("signRight"),
  );
  await page.waitForTimeout(80);
  const playing = await snapshot(page);
  await page.waitForTimeout(1250);
  const midFinale = await snapshot(page);
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-finale-playing.png"),
  });
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState === "complete",
    { timeout: 4000 },
  );
  await page.waitForTimeout(760);
  const complete = await snapshot(page);
  await page.locator("#assemblyContinueReading").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-finale-complete.png"),
  });

  const duplicateResults = await page.evaluate(() => {
    const component = window.dragonAssemblyComponent;
    const installedAgain = component.installPart("signRight");
    window.assemblyStageBridge.render(5, { announce: false });
    return {
      installedAgain,
      state: component.getSnapshot(),
    };
  });
  await page.waitForTimeout(80);
  const duplicateGuard = await snapshot(page);

  await page.locator("#assemblyContinueReading").click();
  await page.waitForFunction(
    () => document.querySelector("#readingDialog")?.open,
  );
  await page.waitForTimeout(250);
  const reading = await snapshot(page);
  await page.screenshot({
    path: path.join(ROOT, "dragon-assembly-finale-reading.png"),
  });
  await page.locator("#readingClose").click();

  await page.locator('[data-sishi-page="chapter4"]').first().click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter4",
  );
  await page.locator('[data-sishi-page="chapter3"]').first().click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter3",
  );
  await page.waitForTimeout(250);
  const reentered = await snapshot(page);

  const beforeResize = reentered.centers;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(240);
  const resized = await snapshot(page);

  await page.locator("#assemblyCompleteReset").click();
  await page.waitForTimeout(100);
  const reset = await snapshot(page);
  await page.evaluate(() =>
    window.dragonAssemblyComponent.installPart("bucketLeft"),
  );
  await page.waitForTimeout(100);
  const partial = await snapshot(page);

  await context.close();
  return {
    initial,
    beforeFinalPart,
    playing,
    midFinale,
    complete,
    duplicateResults,
    duplicateGuard,
    reading,
    reentered,
    beforeResize,
    resized,
    reset,
    partial,
    errors,
  };
}

async function runReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`pageerror: ${error.stack || error.message}`),
  );
  await openAssembly(page);
  await installAllParts(page);
  await page.waitForTimeout(100);
  const state = await snapshot(page);
  await context.close();
  return { state, errors };
}

async function runInterrupted(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`pageerror: ${error.stack || error.message}`),
  );
  await openAssembly(page);
  await installAllParts(page);
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState === "playing",
  );
  await page.waitForTimeout(650);
  await page.locator('[data-sishi-page="chapter4"]').first().click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter4",
  );
  await page.locator('[data-sishi-page="chapter3"]').first().click();
  await page.waitForFunction(
    () => document.body.dataset.sishiPage === "chapter3",
  );
  await page.waitForTimeout(780);
  const state = await snapshot(page);
  await context.close();
  return { state, errors };
}

async function runMobileFinale(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`pageerror: ${error.stack || error.message}`),
  );
  await openAssembly(page);
  await installAllParts(page);
  await page.waitForFunction(
    () =>
      window.dragonAssemblyComponent.getSnapshot().finaleState === "complete",
    { timeout: 4000 },
  );
  await page.waitForTimeout(780);
  const state = await snapshot(page);
  await page.locator("#assemblyComplete").screenshot({
    path: path.join(ROOT, "dragon-assembly-finale-mobile.png"),
  });
  await context.close();
  return { state, errors };
}

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) throw new Error("No installed Edge or Chrome found.");
  const browser = await chromium.launch({ executablePath, headless: true });
  const normal = await runNormal(browser);
  const reduced = await runReducedMotion(browser);
  const interrupted = await runInterrupted(browser);
  const mobile = await runMobileFinale(browser);
  await browser.close();

  const checks = {};
  check(
    checks,
    "incompleteAssemblyDoesNotStartFinale",
    normal.initial.finaleState === "idle" &&
      normal.initial.controller.completedParts.length === 0 &&
      normal.beforeFinalPart.finaleState === "idle" &&
      normal.beforeFinalPart.controller.completedParts.length === 11 &&
      normal.beforeFinalPart.completion.hidden,
    JSON.stringify({
      initial: normal.initial.finaleState,
      beforeLastPart: normal.beforeFinalPart.controller,
    }),
  );
  check(
    checks,
    "fullAssemblyStartsFinaleOnce",
    normal.playing.finaleState === "playing" &&
      normal.playing.controller.finalePlayCount === 1 &&
      normal.playing.finalizing &&
      !normal.playing.finaleComplete &&
      normal.playing.completion.hidden,
    JSON.stringify(normal.playing.controller),
  );
  check(
    checks,
    "timelineUsesSpecifiedVisualStages",
    normal.playing.signs.every(
      (entry) =>
        entry.animationName === "assembly-finale-sign" &&
        entry.animationDuration === "0.4s",
    ) &&
      normal.playing.coordinate.animationName === "assembly-finale-sway" &&
      normal.playing.coordinate.animationDelay === "0.4s" &&
      normal.playing.coordinate.animationDuration === "2.1s" &&
      normal.playing.pompoms[0].animationName ===
        "assembly-finale-pompom-left" &&
      normal.playing.pompoms[1].animationName ===
        "assembly-finale-pompom-right" &&
      normal.playing.pompoms[0].animationDelay === "0.5s" &&
      normal.playing.pompoms[1].animationDelay === "0.62s" &&
      normal.playing.background.animationName === "none",
    JSON.stringify({
      signs: normal.playing.signs,
      coordinate: normal.playing.coordinate,
      pompoms: normal.playing.pompoms,
      background: normal.playing.background,
    }),
  );
  check(
    checks,
    "backgroundStaysStillWhileCarryMoves",
    normal.midFinale.background.animationName === "none" &&
      normal.midFinale.coordinate.animationName ===
        "assembly-finale-sway" &&
      normal.midFinale.finaleState === "playing",
    JSON.stringify({
      coordinate: normal.midFinale.coordinate,
      background: normal.midFinale.background,
    }),
  );
  check(
    checks,
    "evaluationAppearsAfterCarrySettles",
    normal.complete.finaleState === "complete" &&
      normal.complete.finaleComplete &&
      !normal.complete.finalizing &&
      !normal.complete.completion.hidden &&
      normal.complete.completion.opacity > 0.9 &&
      normal.complete.completion.text.includes("好赛从宫里挑出来的。") &&
      normal.complete.completion.text.includes("冯骥才《四十八样》原文") &&
      normal.complete.completion.readingButtonVisible,
    JSON.stringify(normal.complete.completion),
  );
  check(
    checks,
    "duplicateCompletionCannotReplay",
    normal.duplicateResults.installedAgain === true &&
      normal.duplicateResults.state.completedParts.length === 12 &&
      new Set(normal.duplicateResults.state.completedParts).size === 12 &&
      normal.duplicateResults.state.finalePlayCount === 1 &&
      normal.duplicateGuard.controller.finalePlayCount === 1 &&
      !normal.duplicateGuard.completion.hidden,
    JSON.stringify(normal.duplicateResults),
  );
  check(
    checks,
    "continueReadingOpensVerifiedParagraph",
    normal.reading.page === "chapter3" &&
      normal.reading.reading.open &&
      normal.reading.reading.targetExists &&
      normal.reading.reading.targetText.includes("好赛从宫里挑出来的") &&
      Math.abs(
        normal.reading.reading.targetOffsetTop -
          normal.reading.reading.scrollTop -
          120,
      ) < 80,
    JSON.stringify(normal.reading.reading),
  );
  check(
    checks,
    "reentryPreservesCompletedFinale",
    normal.reentered.page === "chapter3" &&
      normal.reentered.finaleState === "complete" &&
      normal.reentered.controller.finalePlayCount === 1 &&
      !normal.reentered.completion.hidden,
    JSON.stringify(normal.reentered),
  );
  check(
    checks,
    "scaledAssemblyKeepsDesignCoordinates",
    normalizedDistance(
      normal.beforeResize.bucketLeft,
      normal.resized.centers.bucketLeft,
    ) < 0.008 &&
      normalizedDistance(
        normal.beforeResize.bucketRight,
        normal.resized.centers.bucketRight,
      ) < 0.008 &&
      normalizedDistance(
        normal.beforeResize.bead,
        normal.resized.centers.bead,
      ) < 0.008 &&
      normal.resized.overflow <= 0,
    JSON.stringify({
      before: normal.beforeResize,
      after: normal.resized.centers,
    }),
  );
  check(
    checks,
    "resetClearsFinaleState",
    normal.reset.finaleState === "idle" &&
      normal.reset.controller.completedParts.length === 0 &&
      normal.reset.completion.hidden &&
      normal.partial.finaleState === "idle" &&
      normal.partial.controller.completedParts.length === 1 &&
      normal.partial.completion.hidden,
    JSON.stringify({
      reset: normal.reset.controller,
      partial: normal.partial.controller,
    }),
  );
  check(
    checks,
    "reducedMotionShowsStableFinalState",
    reduced.state.finaleState === "complete" &&
      reduced.state.controller.finalePlayCount === 1 &&
      !reduced.state.completion.hidden &&
      reduced.state.coordinate.animationName === "none" &&
      reduced.state.signs.every(
        (entry) => entry.animationName === "none",
      ) &&
      reduced.state.pompoms.every(
        (entry) => entry.animationName === "none",
      ),
    JSON.stringify(reduced.state),
  );
  check(
    checks,
    "leavingMidFinaleSettlesWithoutReplay",
    interrupted.state.page === "chapter3" &&
      interrupted.state.finaleState === "complete" &&
      interrupted.state.controller.finalePlayCount === 1 &&
      !interrupted.state.finalizing &&
      !interrupted.state.completion.hidden,
    JSON.stringify(interrupted.state),
  );
  check(
    checks,
    "mobileCompletionRemainsReadable",
    mobile.state.page === "chapter3" &&
      mobile.state.finaleState === "complete" &&
      !mobile.state.completion.hidden &&
      mobile.state.completion.readingButtonVisible &&
      mobile.state.completion.text.includes("好赛从宫里挑出来的") &&
      mobile.state.completion.scrollWidth <=
        mobile.state.completion.clientWidth + 1 &&
      mobile.state.overflow <= 0,
    JSON.stringify(mobile.state.completion),
  );
  check(
    checks,
    "noBrowserErrors",
    normal.errors.length === 0 &&
      reduced.errors.length === 0 &&
      interrupted.errors.length === 0 &&
      mobile.errors.length === 0,
    JSON.stringify({
      normal: normal.errors,
      reduced: reduced.errors,
      interrupted: interrupted.errors,
      mobile: mobile.errors,
    }),
  );

  const failed = Object.entries(checks)
    .filter(([, entry]) => !entry.passed)
    .map(([name]) => name);
  const report = {
    passed: failed.length === 0,
    generatedAt: new Date().toISOString(),
    checkCount: Object.keys(checks).length,
    failed,
    checks,
    normal,
    reduced,
    interrupted,
    mobile,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checkCount: report.checkCount,
        failed,
        report: REPORT,
      },
      null,
      2,
    ),
  );
  if (!report.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
