const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:/Users/liyage/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output");
const BASE_URL =
  process.env.SUSHI_QIREN_BASE_URL || "http://127.0.0.1:4173/";
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

const ENTRIES = [
  {
    key: "candy",
    label: "四十八样",
    tooltipName: "俞六",
    selector: '[data-street-entry="candy"]',
    route: (url) =>
      url.pathname.endsWith("/si-shi-ba-yang/index.html") &&
      url.hash === "#sishi/chapter1",
    backSelector: ".back-link",
  },
  {
    key: "heitou",
    label: "黑头",
    tooltipName: "黑头",
    selector: '[data-street-entry="heitou"]',
    route: (url) => url.hash === "#heitou/street",
    backSelector: "#storyBackButton",
  },
  {
    key: "baozi",
    label: "狗不理",
    tooltipName: "狗不理",
    selector: '[data-street-entry="baozi"]',
    route: (url) => url.hash === "#gou-bu-li/street",
    backSelector: "#dogBuLiBackButton",
  },
  {
    key: "clay",
    label: "泥人张",
    tooltipName: "泥人张",
    selector: '[data-street-entry="clay"]',
    route: (url) => url.hash === "#ni-ren-zhang/prelude",
    backSelector: "#niRenZhangBackButton",
  },
];

const checks = {};
const errors = [];
const details = {};

function record(name, passed, detail = "") {
  checks[name] = Boolean(passed);
  if (!passed) errors.push(`${name}: ${detail}`);
}

async function openStreet(page) {
  await page.goto(`${BASE_URL}#street`, { waitUntil: "networkidle" });
  await page.locator("#streetView").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      window.StreetEntries &&
      window.StreetEntries.getEntryState().every((entry) => entry.alphaReady),
  );
}

async function inspectEntry(page, selector) {
  return page.locator(selector).evaluate((link) => {
    const image = link.querySelector(".street-entry-art");
    const scene = link.closest(".street-scene");
    const linkRect = link.getBoundingClientRect();
    const imageStyle = getComputedStyle(image);
    const sceneRect = scene.getBoundingClientRect();
    const key = link.dataset.streetEntry;
    let opaquePoint = null;
    let transparentPoint = null;

    for (let row = 1; row < 24 && !opaquePoint; row += 1) {
      for (let column = 1; column < 24; column += 1) {
        const x = linkRect.left + (linkRect.width * column) / 24;
        const y = linkRect.top + (linkRect.height * row) / 24;
        if (window.StreetEntries.entryAt(x, y)?.dataset.streetEntry === key) {
          opaquePoint = { x, y };
          break;
        }
      }
    }

    for (let row = 1; row < 24 && !transparentPoint; row += 1) {
      for (let column = 1; column < 24; column += 1) {
        const x = linkRect.left + (linkRect.width * column) / 24;
        const y = linkRect.top + (linkRect.height * row) / 24;
        if (!window.StreetEntries.entryAt(x, y)) {
          transparentPoint = { x, y };
          break;
        }
      }
    }

    return {
      key,
      href: link.getAttribute("href"),
      transform: link.getAttribute("transform"),
      imageLoaded: Boolean(image.getAttribute("href")),
      opacity: Number(imageStyle.opacity),
      filter: imageStyle.filter,
      animationName: imageStyle.animationName,
      transitionDuration: imageStyle.transitionDuration,
      transformStyle: imageStyle.transform,
      cursor: getComputedStyle(scene).cursor,
      linkRect: {
        left: linkRect.left,
        top: linkRect.top,
        width: linkRect.width,
        height: linkRect.height,
      },
      normalizedRect: {
        left: (linkRect.left - sceneRect.left) / sceneRect.width,
        top: (linkRect.top - sceneRect.top) / sceneRect.height,
        width: linkRect.width / sceneRect.width,
        height: linkRect.height / sceneRect.height,
      },
      opaquePoint,
      transparentPoint,
    };
  });
}

async function inspectTooltip(page, entrySelector) {
  return page.evaluate((selector) => {
    const link = document.querySelector(selector);
    const tooltip = document.querySelector("#streetNameTooltip");
    const scene = document.querySelector("#streetScene");
    const style = getComputedStyle(tooltip);
    const rect = tooltip.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const anchorX =
      sceneRect.left +
      (Number(link.dataset.tooltipX) / 1675) * sceneRect.width;
    const anchorY =
      sceneRect.top +
      (Number(link.dataset.tooltipY) / 939) * sceneRect.height;
    return {
      name: tooltip.querySelector("[data-street-tooltip-name]").textContent,
      visible: tooltip.classList.contains("is-visible"),
      opacity: Number(style.opacity),
      visibility: style.visibility,
      pointerEvents: style.pointerEvents,
      transitionDuration: style.transitionDuration,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      ariaHidden: tooltip.getAttribute("aria-hidden"),
      count: document.querySelectorAll(".street-name-tooltip").length,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      anchor: { x: anchorX, y: anchorY },
      sceneRect: {
        left: sceneRect.left,
        top: sceneRect.top,
        right: sceneRect.right,
        bottom: sceneRect.bottom,
        width: sceneRect.width,
        height: sceneRect.height,
      },
    };
  }, entrySelector);
}

async function checkResponsive(browser) {
  const sizes = [
    [1920, 1080],
    [1600, 900],
    [1366, 768],
  ];
  const snapshots = {};

  for (const [width, height] of sizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });
    await openStreet(page);

    const state = await page.evaluate(async () => {
      const background = document.querySelector(".street-photo");
      const layer = document.querySelector("#streetEntryLayer");
      const entries = window.StreetEntries.getEntryState();
      const loaded = [];
      for (const entry of entries) {
        loaded.push(
          await new Promise((resolve) => {
            const image = new Image();
            image.onload = () =>
              resolve({
                key: entry.key,
                loaded: image.naturalWidth > 0,
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            image.onerror = () =>
              resolve({
                key: entry.key,
                loaded: false,
                width: 0,
                height: 0,
              });
            image.src = document
              .querySelector(`[data-street-entry="${entry.key}"] .street-entry-art`)
              .getAttribute("href");
          }),
        );
      }
      return {
        backgroundLoaded:
          background.complete &&
          background.naturalWidth === 1675 &&
          background.naturalHeight === 939,
        layerViewBox: layer.getAttribute("viewBox"),
        preserveAspectRatio: layer.getAttribute("preserveAspectRatio"),
        entries,
        loaded,
      };
    });

    const entryStates = {};
    for (const entry of ENTRIES) {
      entryStates[entry.key] = await inspectEntry(page, entry.selector);
      record(
        `${width}x${height}-${entry.key}-alpha-ready`,
        state.entries.find((item) => item.key === entry.key)?.alphaReady,
        "alpha hit mask did not load",
      );
      record(
        `${width}x${height}-${entry.key}-opaque-hit`,
        Boolean(entryStates[entry.key].opaquePoint),
        "no opaque hit point found",
      );
      record(
        `${width}x${height}-${entry.key}-transparent-ignored`,
        Boolean(entryStates[entry.key].transparentPoint),
        "the transformed art bounds contain no transparent area to test",
      );
      await page.mouse.move(
        entryStates[entry.key].opaquePoint.x,
        entryStates[entry.key].opaquePoint.y,
      );
      await page.waitForTimeout(200);
      const tooltip = await inspectTooltip(page, entry.selector);
      record(
        `${width}x${height}-${entry.key}-tooltip-name`,
        tooltip.visible &&
          tooltip.opacity > 0.95 &&
          tooltip.name === entry.tooltipName,
        JSON.stringify(tooltip),
      );
      record(
        `${width}x${height}-${entry.key}-tooltip-above`,
        tooltip.rect.bottom <= tooltip.anchor.y - 10 &&
          tooltip.rect.left >= tooltip.sceneRect.left &&
          tooltip.rect.right <= tooltip.sceneRect.right &&
          tooltip.rect.top >= tooltip.sceneRect.top,
        JSON.stringify({
          rect: tooltip.rect,
          anchor: tooltip.anchor,
          scene: tooltip.sceneRect,
        }),
      );
      record(
        `${width}x${height}-${entry.key}-tooltip-size`,
        tooltip.rect.width >= 140 &&
          tooltip.rect.width <= 180 &&
          tooltip.rect.height >= 65 &&
          tooltip.rect.height <= 88,
        `${tooltip.rect.width}x${tooltip.rect.height}`,
      );
      await page.mouse.move(2, 2);
      await page.waitForTimeout(200);
      const hiddenTooltip = await inspectTooltip(page, entry.selector);
      record(
        `${width}x${height}-${entry.key}-tooltip-hides`,
        !hiddenTooltip.visible &&
          hiddenTooltip.opacity === 0 &&
          hiddenTooltip.ariaHidden === "true",
        JSON.stringify(hiddenTooltip),
      );
    }

    record(
      `${width}x${height}-background`,
      state.backgroundLoaded,
      "street background changed or failed to load",
    );
    record(
      `${width}x${height}-coordinate-system`,
      state.layerViewBox === "0 0 1675 939" &&
        state.preserveAspectRatio === "none",
      JSON.stringify(state.layerViewBox),
    );
    record(
      `${width}x${height}-assets`,
      state.loaded.every((item) => item.loaded),
      JSON.stringify(state.loaded),
    );
    record(
      `${width}x${height}-no-errors`,
      pageErrors.length === 0,
      pageErrors.join(" | "),
    );
    snapshots[`${width}x${height}`] = entryStates;
    await context.close();
  }

  for (const entry of ENTRIES) {
    const baseline = snapshots["1920x1080"][entry.key].normalizedRect;
    for (const size of ["1600x900", "1366x768"]) {
      const current = snapshots[size][entry.key].normalizedRect;
      const delta = Math.max(
        ...Object.keys(baseline).map((key) =>
          Math.abs(current[key] - baseline[key]),
        ),
      );
      record(
        `${entry.key}-responsive-${size}`,
        delta <= 0.001,
        `normalized placement moved by ${delta}`,
      );
    }
  }
  details.responsive = snapshots;
}

async function checkDesktopInteraction(browser) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await openStreet(page);

  record(
    "street-chrome-preserved",
    (await page.locator("#streetBackButton").innerText()).includes("回到封面") &&
      (await page.locator("#streetTitle").innerText()).includes("天津老街"),
  );
  record(
    "old-entry-effects-removed",
    (await page.locator(".scene-hotspot").count()) === 0 &&
      (await page.locator(".hotspot-portrait").count()) === 0 &&
      (await page.locator(".scene-identity-card").count()) === 0 &&
      (await page.locator(".street-ink-transition").count()) === 0,
  );
  const initialTooltip = await inspectTooltip(page, ENTRIES[0].selector);
  record(
    "name-tooltip-component",
    initialTooltip.count === 1 &&
      initialTooltip.pointerEvents === "none" &&
      initialTooltip.backgroundColor === "rgb(245, 238, 223)" &&
      initialTooltip.color === "rgb(48, 43, 37)" &&
      parseFloat(initialTooltip.borderRadius) <= 3,
    JSON.stringify(initialTooltip),
  );
  const candyPoint = (await inspectEntry(page, ENTRIES[0].selector)).opaquePoint;
  const baoziPoint = (await inspectEntry(page, ENTRIES[2].selector)).opaquePoint;
  await page.mouse.move(candyPoint.x, candyPoint.y);
  await page.waitForTimeout(190);
  await page.mouse.move(baoziPoint.x, baoziPoint.y);
  await page.waitForTimeout(210);
  const rapidTooltip = await inspectTooltip(page, ENTRIES[2].selector);
  record(
    "rapid-switch-single-tooltip",
    rapidTooltip.count === 1 &&
      rapidTooltip.visible &&
      rapidTooltip.name === "狗不理",
    JSON.stringify(rapidTooltip),
  );
  await page.screenshot({
    path: path.join(OUTPUT, "street-name-tooltip-1920x1080.png"),
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(220);
  const clearedTooltip = await inspectTooltip(page, ENTRIES[2].selector);
  record(
    "tooltip-clear-on-leave",
    !clearedTooltip.visible &&
      clearedTooltip.opacity === 0 &&
      clearedTooltip.ariaHidden === "true",
    JSON.stringify(clearedTooltip),
  );

  for (const entry of ENTRIES) {
    const before = await inspectEntry(page, entry.selector);
    await page.mouse.move(before.opaquePoint.x, before.opaquePoint.y);
    await page.waitForTimeout(220);
    const during = await inspectEntry(page, entry.selector);
    const hoverHit = await page.evaluate(
      ({ key, point }) =>
        window.StreetEntries.entryAt(point.x, point.y)?.dataset.streetEntry ===
        key,
      { key: entry.key, point: before.opaquePoint },
    );

    record(
      `${entry.key}-hover-hit`,
      hoverHit && during.cursor === "pointer",
      `cursor=${during.cursor}`,
    );
    record(
      `${entry.key}-hover-visual-static`,
      before.transform === during.transform &&
        before.opacity === during.opacity &&
        before.filter === during.filter &&
        before.transformStyle === during.transformStyle &&
        Math.abs(before.linkRect.width - during.linkRect.width) < 0.01 &&
        Math.abs(before.linkRect.height - during.linkRect.height) < 0.01,
      JSON.stringify({
        before: {
          opacity: before.opacity,
          filter: before.filter,
          transformStyle: before.transformStyle,
        },
        during: {
          opacity: during.opacity,
          filter: during.filter,
          transformStyle: during.transformStyle,
        },
      }),
    );
    record(
      `${entry.key}-no-animation`,
      during.animationName === "none" &&
        (during.transitionDuration === "0s" ||
          Number.parseFloat(during.transitionDuration) === 0),
      `animation=${during.animationName}, transition=${during.transitionDuration}`,
    );
    const tooltip = await inspectTooltip(page, entry.selector);
    record(
      `${entry.key}-tooltip`,
      tooltip.visible &&
        tooltip.opacity > 0.95 &&
        tooltip.visibility === "visible" &&
        tooltip.name === entry.tooltipName &&
        tooltip.ariaHidden === "false" &&
        tooltip.pointerEvents === "none",
      JSON.stringify(tooltip),
    );
    record(
      `${entry.key}-tooltip-transition`,
      tooltip.transitionDuration.split(",").some((duration) => {
        const seconds = Number.parseFloat(duration);
        return seconds >= 0.15 && seconds <= 0.2;
      }),
      tooltip.transitionDuration,
    );

    if (before.transparentPoint) {
      const transparentRoute = await page.evaluate(
        ({ point }) => window.StreetEntries.entryAt(point.x, point.y),
        { point: before.transparentPoint },
      );
      record(
        `${entry.key}-transparent-inactive`,
        transparentRoute === null,
        "transparent PNG area resolved to an entry",
      );
    }

    const startedAt = Date.now();
    await page.mouse.click(before.opaquePoint.x, before.opaquePoint.y);
    await page.waitForURL((url) => entry.route(url), { timeout: 5000 });
    const elapsed = Date.now() - startedAt;
    record(
      `${entry.key}-direct-route`,
      entry.route(new URL(page.url())),
      page.url(),
    );
    record(
      `${entry.key}-no-confirmation`,
      elapsed < 1200,
      `navigation took ${elapsed}ms`,
    );
    record(
      `${entry.key}-canvas-modal-closed`,
      await page.locator("#characterModal").isHidden(),
    );
    details[`route-${entry.key}`] = { url: page.url(), elapsed };

    await page.locator(entry.backSelector).waitFor({ state: "visible" });
    await page.locator(entry.backSelector).click();
    await page.waitForURL(
      (url) =>
        (url.pathname === "/" || url.pathname.endsWith("/index.html")) &&
        url.hash === "#street",
      { timeout: 5000 },
    );
    await page.locator("#streetView").waitFor({ state: "visible" });
    await page.waitForFunction(() =>
      window.StreetEntries.getEntryState().every((item) => item.alphaReady),
    );
    record(
      `${entry.key}-return-works`,
      Boolean((await inspectEntry(page, entry.selector)).opaquePoint),
    );
  }

  await openStreet(page);
  const candy = await inspectEntry(page, ENTRIES[0].selector);
  await page.mouse.click(candy.opaquePoint.x, candy.opaquePoint.y);
  await page.waitForURL((url) => ENTRIES[0].route(url), { timeout: 5000 });
  record("reentry-after-return", ENTRIES[0].route(new URL(page.url())));
  await page.goto(`${BASE_URL}#street`, { waitUntil: "networkidle" });
  await page.locator("#streetView").waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    window.StreetEntries.getEntryState().every((item) => item.alphaReady),
  );
  await page.locator(ENTRIES[3].selector).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => ENTRIES[3].route(url), { timeout: 5000 });
  record("keyboard-entry-works", ENTRIES[3].route(new URL(page.url())));
  await page.locator(ENTRIES[3].backSelector).click();
  await page.waitForURL(
    (url) =>
      (url.pathname === "/" || url.pathname.endsWith("/index.html")) &&
      url.hash === "#street",
    { timeout: 5000 },
  );
  await page.locator("#streetView").waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    window.StreetEntries.getEntryState().every((item) => item.alphaReady),
  );
  await page.screenshot({
    path: path.join(OUTPUT, "street-entry-final-1920x1080.png"),
  });
  record("desktop-no-errors", pageErrors.length === 0, pageErrors.join(" | "));
  details.desktopErrors = pageErrors;
  await context.close();
}

async function checkMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await openStreet(page);
  const candy = await inspectEntry(page, ENTRIES[0].selector);
  await page.touchscreen.tap(candy.opaquePoint.x, candy.opaquePoint.y);
  await page.waitForURL((url) => ENTRIES[0].route(url), { timeout: 5000 });
  record("mobile-tap-direct", ENTRIES[0].route(new URL(page.url())), page.url());
  record("mobile-no-errors", pageErrors.length === 0, pageErrors.join(" | "));
  await context.close();
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const executablePath = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) throw new Error("No installed Edge or Chrome executable.");

  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });
  try {
    await checkResponsive(browser);
    await checkDesktopInteraction(browser);
    await checkMobile(browser);
  } finally {
    await browser.close();
  }

  const failed = Object.entries(checks).filter(([, passed]) => !passed);
  const report = {
    passed: failed.length === 0 && errors.length === 0,
    checkCount: Object.keys(checks).length,
    failedCount: failed.length,
    checks,
    errors,
    details,
  };
  const reportPath = path.join(OUTPUT, "qa-street-hotspots.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      failedCount: report.failedCount,
      errors,
      report: reportPath,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
