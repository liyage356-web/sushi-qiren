const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  "C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright",
);

const ORIGIN = process.argv[2] || "http://127.0.0.1:4180/web/";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "output",
  "qa-ni-ren-zhang-clay-transition.json",
);
const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "844x390", width: 844, height: 390, hasTouch: true },
  { name: "390x844", width: 390, height: 844, hasTouch: true },
];
const CAPTION =
  "只见人家泥人张听赛没听，左手伸到桌子下边，打鞋底下抠下一块泥巴。";
const EXPECTED_CONFIG = {
  enterShoe: 600,
  shoeHold: 2000,
  shoeToTable: 800,
  tableHold: 1000,
  enterCraft: 600,
  captionDelay: 500,
  captionDuration: 700,
};

function browserExecutable() {
  const executable = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("No installed Edge or Chrome executable.");
  return executable;
}

async function openMockery(page) {
  await page.goto(`${ORIGIN}index.html#ni-ren-zhang/observe`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () =>
      window.niRenZhangStory?.getCurrentPage() === "observe" &&
      window.niRenZhangStory?.getObserveScene() === "appearance",
  );
  await page.locator("#nrObserveNextButton").click();
  await page.waitForFunction(
    () =>
      window.niRenZhangStory?.getObserveScene() === "mockery" &&
      document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
        "false",
  );
}

async function startTransition(page, method = "click") {
  if (method === "tap") await page.locator("#nrObserveNextButton").tap();
  else await page.locator("#nrObserveNextButton").click();
  await page.waitForFunction(
    () =>
      window.ClayStoryTransition?.getState() === "shoe-clay" &&
      !document.querySelector("#clayStoryTransition").hidden,
  );
}

async function readState(page) {
  return page.evaluate(() => {
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
    const root = document.querySelector("#clayStoryTransition");
    const shoe = document.querySelector("#clayStoryShoeImage");
    const table = document.querySelector("#clayStoryTableImage");
    const caption = document.querySelector("#clayStoryTransitionCaption");
    const skip = document.querySelector("#clayStoryTransitionSkip");
    const card = document.querySelector("#nrPageObserve .nr-observe-side");
    const experience = document.querySelector("#niRenZhangExperience");
    const craft = document.querySelector("#nrPageCraft");
    const nav = document.querySelector(
      ".nr-step-nav [aria-current='page']",
    );
    const shoeStyle = getComputedStyle(shoe);
    const tableStyle = getComputedStyle(table);
    const captionStyle = getComputedStyle(caption);
    const captionTextStyle = getComputedStyle(caption.querySelector("p"));
    const skipStyle = getComputedStyle(skip);
    return {
      root: {
        hidden: root.hidden,
        state: window.ClayStoryTransition?.getState(),
        dataState: root.dataset.state,
        busy: root.getAttribute("aria-busy"),
        classes: [...root.classList],
        rect: rectOf(root),
      },
      currentPage: window.niRenZhangStory?.getCurrentPage(),
      observeScene: window.niRenZhangStory?.getObserveScene(),
      craftVisible: craft ? !craft.hidden : false,
      activeNav: nav?.dataset.nrPage || null,
      progress: window.ClayStoryTransition?.getDiagnostics(),
      experienceClass:
        experience?.classList.contains("is-clay-story-transition") || false,
      card: {
        opacity: Number.parseFloat(getComputedStyle(card).opacity),
        pointerEvents: getComputedStyle(card).pointerEvents,
      },
      shoe: {
        rect: rectOf(shoe),
        source: shoe.getAttribute("src"),
        loaded: Boolean(shoe.complete) && shoe.naturalWidth > 0,
        naturalWidth: shoe.naturalWidth,
        naturalHeight: shoe.naturalHeight,
        objectFit: shoeStyle.objectFit,
        objectPosition: shoeStyle.objectPosition,
        opacity: Number.parseFloat(shoeStyle.opacity),
        ariaHidden: shoe.getAttribute("aria-hidden"),
      },
      table: {
        rect: rectOf(table),
        source: table.getAttribute("src"),
        loaded: Boolean(table.complete) && table.naturalWidth > 0,
        naturalWidth: table.naturalWidth,
        naturalHeight: table.naturalHeight,
        objectFit: tableStyle.objectFit,
        objectPosition: tableStyle.objectPosition,
        opacity: Number.parseFloat(tableStyle.opacity),
        ariaHidden: table.getAttribute("aria-hidden"),
      },
      caption: {
        text: caption.textContent.replace(/\s+/g, "").trim(),
        rect: rectOf(caption),
        opacity: Number.parseFloat(captionStyle.opacity),
        fontSize: Number.parseFloat(captionTextStyle.fontSize),
        lineHeight: Number.parseFloat(captionTextStyle.lineHeight),
        maxWidth: captionStyle.maxWidth,
        textAlign: captionTextStyle.textAlign,
        color: captionTextStyle.color,
        ariaHidden: caption.getAttribute("aria-hidden"),
      },
      skip: {
        text: skip.textContent.trim(),
        rect: rectOf(skip),
        visible:
          skip.offsetParent !== null &&
          getComputedStyle(skip).visibility !== "hidden",
        color: skipStyle.color,
        background: skipStyle.backgroundColor,
      },
      config: window.ClayStoryTransition?.config,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function waitForTable(page) {
  await page.waitForFunction(
    () => window.ClayStoryTransition?.getState() === "table-clay",
    null,
    { timeout: 8000 },
  );
}

async function waitForCraft(page, timeout = 14000) {
  await page.waitForFunction(
    () => window.niRenZhangStory?.getCurrentPage() === "craft",
    null,
    { timeout },
  );
}

async function installTransitionTimingProbe(page) {
  await page.evaluate(() => {
    const root = document.querySelector("#clayStoryTransition");
    window.__clayTransitionTimingProbe?.observer?.disconnect();
    const events = [{ state: root.dataset.state, time: performance.now() }];
    const observer = new MutationObserver(() => {
      const state = root.dataset.state;
      if (events.at(-1)?.state === state) return;
      events.push({ state, time: performance.now() });
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
    window.__clayTransitionTimingProbe = { events, observer };
  });
}

async function readTransitionTiming(page) {
  return page.evaluate(() => window.__clayTransitionTimingProbe?.events ?? []);
}

function timingBetween(events, fromState, toState) {
  const from = events.find((event) => event.state === fromState);
  const to = events.find((event) => event.state === toState);
  return from && to ? to.time - from.time : null;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const checks = [];
  const errors = [];
  const screenshots = [];
  const add = (name, passed, detail = null) =>
    checks.push({ name, passed: Boolean(passed), detail });

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desktopContext.newPage();
    page.on("pageerror", (error) => errors.push(`desktop: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`desktop: ${message.text()}`);
      }
    });

    await openMockery(page);
    const config = await page.evaluate(() => window.ClayStoryTransition.config);
    add(
      "timing constants match the requested schedule",
      Object.entries(EXPECTED_CONFIG).every(
        ([key, value]) => config[key] === value,
      ),
      config,
    );

    await installTransitionTimingProbe(page);
    await startTransition(page);
    await page.waitForTimeout(110);
    const entering = await readState(page);
    add(
      "first illustration fades in without leaving the current chapter",
      entering.currentPage === "observe" &&
        entering.observeScene === "mockery" &&
        entering.root.state === "shoe-clay" &&
        entering.root.busy === "true" &&
        entering.shoe.loaded &&
        entering.shoe.opacity > 0 &&
        entering.shoe.opacity < 1 &&
        !entering.craftVisible,
      entering,
    );
    add(
      "story card is temporarily hidden during playback",
      entering.experienceClass &&
        entering.card.opacity < 0.8 &&
        entering.card.pointerEvents === "none",
      entering.card,
    );
    add(
      "skip control is visible in the existing ink-and-paper palette",
      entering.skip.visible &&
        entering.skip.text === "跳过" &&
        entering.skip.rect.top < entering.skip.rect.bottom &&
        entering.skip.rect.right <= entering.viewport.width,
      entering.skip,
    );

    const repeatedStart = await page.evaluate(() =>
      window.ClayStoryTransition.start(),
    );
    add(
      "a running transition cannot be started twice",
      repeatedStart === false &&
        (await page
          .locator("#clayStoryTransition")
          .evaluateAll((nodes) => nodes.length)) === 1,
    );

    await page.waitForTimeout(1200);
    const shoe = await readState(page);
    add(
      "shoe-clay illustration fills the story area with cover sizing",
      shoe.root.state === "shoe-clay" &&
        shoe.shoe.loaded &&
        shoe.shoe.naturalWidth === 1672 &&
        shoe.shoe.naturalHeight === 941 &&
        shoe.shoe.objectFit === "cover" &&
        shoe.shoe.opacity === 1 &&
        Math.abs(shoe.shoe.rect.width - shoe.root.rect.width) < 1 &&
        Math.abs(shoe.shoe.rect.height - shoe.root.rect.height) < 1,
      shoe.shoe,
    );
    add(
      "shoe-clay caption is exact and fully readable",
      shoe.caption.text === CAPTION &&
        shoe.caption.opacity === 1 &&
        shoe.caption.fontSize >= 23.9 &&
        shoe.caption.lineHeight >= 38 &&
        shoe.caption.textAlign === "center" &&
        shoe.caption.rect.width <= 851,
      shoe.caption,
    );
    add(
      "the second chapter stays selected during the illustration sequence",
      shoe.activeNav === "observe",
      shoe.activeNav,
    );
    const shoeScreenshot = path.join(
      ROOT,
      "ni-ren-zhang-clay-transition-shoe-1440x900.png",
    );
    await page.screenshot({ path: shoeScreenshot, fullPage: true });
    screenshots.push(shoeScreenshot);

    await waitForTable(page);
    await page.waitForTimeout(260);
    const crossing = await readState(page);
    add(
      "shoe and table illustrations crossfade without a blank frame",
      crossing.shoe.loaded &&
        crossing.table.loaded &&
        crossing.shoe.opacity > 0 &&
        crossing.shoe.opacity < 1 &&
        crossing.table.opacity > 0 &&
        crossing.table.opacity < 1 &&
        !crossing.craftVisible,
      {
        shoeOpacity: crossing.shoe.opacity,
        tableOpacity: crossing.table.opacity,
      },
    );

    await page.waitForTimeout(900);
    const table = await readState(page);
    add(
      "table-clay illustration is full-frame and has no caption",
      table.root.state === "table-clay" &&
        table.table.loaded &&
        table.table.naturalWidth === 1672 &&
        table.table.naturalHeight === 941 &&
        table.table.objectFit === "cover" &&
        table.table.opacity === 1 &&
        table.caption.opacity === 0 &&
        table.caption.ariaHidden === "true",
      {
        table: table.table,
        caption: table.caption,
      },
    );
    add(
      "table scene still leaves navigation and current chapter intact",
      table.activeNav === "observe" &&
        table.currentPage === "observe" &&
        table.observeScene === "mockery",
      {
        currentPage: table.currentPage,
        observeScene: table.observeScene,
        nav: table.activeNav,
      },
    );
    const tableScreenshot = path.join(
      ROOT,
      "ni-ren-zhang-clay-transition-table-1440x900.png",
    );
    await page.screenshot({ path: tableScreenshot, fullPage: true });
    screenshots.push(tableScreenshot);

    await waitForCraft(page);
    await page.waitForFunction(
      () => document.querySelector("#nrPageCraft").hidden === false,
    );
    const craft = await readState(page);
    add(
      "automatic playback enters the existing craft chapter",
      craft.currentPage === "craft" &&
        craft.craftVisible &&
        (await page.locator(".nr-clay-workshop").count()) === 1,
      craft,
    );
    add(
      "existing craft interaction remains available after the sequence",
      await page.evaluate(() => {
        const clay = document.querySelector(".nr-clay-workshop");
        return Boolean(
          clay &&
            clay.querySelector("#nrEditableClay") &&
            clay.querySelector(".nr-clay-toolbar") &&
            clay.querySelector(".nr-clay-reference"),
        );
      }),
    );
    await page.waitForTimeout(700);
    const hidden = await readState(page);
    add(
      "transition layer disappears after the final fade",
      hidden.root.hidden &&
        hidden.root.state === "completed" &&
        hidden.craftVisible,
      hidden.root,
    );
    const timing = await readTransitionTiming(page);
    const shoeToTableElapsed = timingBetween(
      timing,
      "shoe-clay",
      "table-clay",
    );
    const tableToCraftElapsed = timingBetween(
      timing,
      "table-clay",
      "completed",
    );
    const totalElapsed = timingBetween(timing, "shoe-clay", "completed");
    add(
      "automatic sequence keeps the requested two-second and one-second holds",
      timing.map((event) => event.state).join("|") ===
        "idle|shoe-clay|table-clay|completed" &&
      shoeToTableElapsed >= 2200 &&
        shoeToTableElapsed <= 2900 &&
        tableToCraftElapsed >= 1600 &&
        tableToCraftElapsed <= 2100 &&
        totalElapsed >= 3900 &&
        totalElapsed <= 5000,
      {
        shoeToTableElapsed,
        tableToCraftElapsed,
        totalElapsed,
      },
    );

    await page.locator(".nr-step-nav [data-nr-page='observe']").click();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory.getCurrentPage() === "observe" &&
        window.niRenZhangStory.getObserveScene() === "appearance",
    );
    await page.locator("#nrObserveNextButton").click();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory.getObserveScene() === "mockery" &&
        document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
          "false",
    );
    await installTransitionTimingProbe(page);
    await startTransition(page);
    await waitForTable(page);
    await waitForCraft(page);
    const reentryTiming = await readTransitionTiming(page);
    const reentryShoeToTable = timingBetween(
      reentryTiming,
      "shoe-clay",
      "table-clay",
    );
    const reentryTableToCraft = timingBetween(
      reentryTiming,
      "table-clay",
      "completed",
    );
    add(
      "re-entering the chapter restores both holds without duplicate timers",
      reentryTiming.map((event) => event.state).join("|") ===
        "idle|shoe-clay|table-clay|completed" &&
        reentryShoeToTable >= 2200 &&
        reentryShoeToTable <= 2900 &&
        reentryTableToCraft >= 1600 &&
        reentryTableToCraft <= 2100,
      {
        reentryShoeToTable,
        reentryTableToCraft,
      },
    );

    await page.locator(".nr-step-nav [data-nr-page='observe']").click();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory.getCurrentPage() === "observe" &&
        window.niRenZhangStory.getObserveScene() === "appearance",
    );
    await page.locator("#nrObserveNextButton").click();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory.getObserveScene() === "mockery" &&
        document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
          "false",
    );
    await startTransition(page);
    await page.waitForTimeout(180);
    await page.locator("#clayStoryTransitionSkip").click();
    await waitForCraft(page, 2000);
    const skipped = await readState(page);
    add(
      "skip enters the existing craft interaction immediately",
      skipped.currentPage === "craft" &&
        skipped.craftVisible &&
        skipped.root.hidden &&
        skipped.root.state === "completed",
      skipped.root,
    );

    await page.locator(".nr-step-nav [data-nr-page='observe']").click();
    await page.locator("#nrObserveNextButton").click();
    await page.waitForFunction(
      () =>
        window.niRenZhangStory.getObserveScene() === "mockery" &&
        document.querySelector("#nrPageObserve").getAttribute("aria-busy") ===
          "false",
    );
    await startTransition(page);
    await page.waitForTimeout(250);
    await page.locator(".nr-step-nav [data-nr-page='reveal']").click();
    await page.waitForFunction(
      () => window.niRenZhangStory.getCurrentPage() === "reveal",
    );
    await page.waitForTimeout(5000);
    add(
      "leaving the chapter cancels delayed playback",
      (await page.evaluate(() => window.niRenZhangStory.getCurrentPage())) ===
        "reveal" &&
        (await page
          .locator("#clayStoryTransition")
          .evaluate((node) => node.hidden)),
    );

    await desktopContext.close();

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: Boolean(viewport.hasTouch),
      });
      const current = await context.newPage();
      current.on("pageerror", (error) =>
        errors.push(`${viewport.name}: ${error.message}`),
      );
      current.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`${viewport.name}: ${message.text()}`);
        }
      });
      try {
        await openMockery(current);
        await startTransition(
          current,
          viewport.hasTouch ? "tap" : "click",
        );
        await current.waitForTimeout(700);
        const responsive = await readState(current);
        add(
          `${viewport.name}: shoe illustration covers the responsive story area`,
          responsive.shoe.loaded &&
            responsive.shoe.objectFit === "cover" &&
            Math.abs(
              responsive.shoe.rect.width - responsive.root.rect.width,
            ) < 1 &&
            Math.abs(
              responsive.shoe.rect.height - responsive.root.rect.height,
            ) < 1 &&
            responsive.horizontalOverflow === 0,
          {
            shoe: responsive.shoe,
            root: responsive.root,
            overflow: responsive.horizontalOverflow,
          },
        );
        add(
          `${viewport.name}: skip remains reachable`,
          responsive.skip.visible &&
            responsive.skip.rect.left >= 0 &&
            responsive.skip.rect.right <= responsive.viewport.width &&
            responsive.skip.rect.top >= 0 &&
            responsive.skip.rect.bottom <= responsive.viewport.height,
          responsive.skip,
        );
        if (viewport.name === "390x844") {
          await current.waitForTimeout(650);
          const mobileScreenshot = path.join(
            ROOT,
            "ni-ren-zhang-clay-transition-shoe-390x844.png",
          );
          await current.screenshot({
            path: mobileScreenshot,
            fullPage: true,
          });
          screenshots.push(mobileScreenshot);
        }
        await current.locator("#clayStoryTransitionSkip").click();
        await waitForCraft(current, 2000);
        add(
          `${viewport.name}: skip opens the original craft page`,
          (await current.locator("#nrPageCraft").isVisible()) &&
            (await current.locator("#nrPageObserve").isHidden()),
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failed = checks.filter((check) => !check.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    assertionCount: checks.length,
    passed: failed.length === 0 && errors.length === 0,
    failed,
    errors,
    screenshots,
    checks,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      passed: report.passed,
      assertions: report.assertionCount,
      failed: failed.length,
      errors: errors.length,
      report: OUTPUT,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
