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
const EXPECTED = {
  candy: "translate(364 499) scale(0.318)",
  heitou: "translate(947 495) scale(0.2505)",
  baozi: "translate(1111 485) scale(0.2653)",
  clay: "translate(681 374) scale(0.0915)",
};
const CALIBRATED = ["heitou", "baozi", "clay"];
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

async function placementState(page) {
  return page.evaluate(() => {
    const scene = document.querySelector("#streetScene");
    const world = document.querySelector("#streetWorld");
    const photo = document.querySelector(".street-photo");
    const layer = document.querySelector("#streetEntryLayer");
    const entries = Object.fromEntries(
      [...document.querySelectorAll(".street-entry-link")].map((link) => [
        link.dataset.streetEntry,
        {
          transform: link.getAttribute("transform"),
          opacity: Number(
            getComputedStyle(link.querySelector(".street-entry-art")).opacity,
          ),
        },
      ]),
    );
    return {
      entries,
      panelCount: document.querySelectorAll("#streetAlignCalibrator").length,
      boundaryCount: document.querySelectorAll(
        "[data-street-align-boundary]",
      ).length,
      anchorCount: document.querySelectorAll("[data-street-align-anchor]")
        .length,
      calibrator: window.StreetEntries?.calibrator?.getState(),
      scene: (() => {
        const rect = scene.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          x: rect.left,
          y: rect.top,
        };
      })(),
      world: (() => {
        const rect = world.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          x: rect.left,
          y: rect.top,
        };
      })(),
      background: {
        width: photo.naturalWidth,
        height: photo.naturalHeight,
        objectFit: getComputedStyle(photo).objectFit,
      },
      layer: {
        viewBox: layer.getAttribute("viewBox"),
        preserveAspectRatio: layer.getAttribute("preserveAspectRatio"),
      },
    };
  });
}

async function checkResponsive(browser) {
  const sizes = [
    [1920, 1080],
    [1600, 900],
    [1366, 768],
  ];
  const normalized = {};

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
    const state = await placementState(page);

    record(
      `${width}x${height}-final-transforms`,
      Object.entries(EXPECTED).every(
        ([key, transform]) => state.entries[key]?.transform === transform,
      ),
      JSON.stringify(state.entries),
    );
    record(
      `${width}x${height}-normal-opacity`,
      Object.values(state.entries).every((entry) => entry.opacity === 1),
      JSON.stringify(state.entries),
    );
    record(
      `${width}x${height}-no-debug-chrome`,
      state.panelCount === 0 &&
        state.boundaryCount === 0 &&
        state.anchorCount === 0,
      JSON.stringify(state),
    );
    record(
      `${width}x${height}-one-coordinate-system`,
      state.background.width === 1675 &&
        state.background.height === 939 &&
        state.background.objectFit === "fill" &&
        state.layer.viewBox === "0 0 1675 939" &&
        state.layer.preserveAspectRatio === "none" &&
        Math.abs(state.scene.width - state.world.width) < 0.1 &&
        Math.abs(state.scene.height - state.world.height) < 0.1,
      JSON.stringify(state),
    );
    record(
      `${width}x${height}-no-errors`,
      pageErrors.length === 0,
      pageErrors.join(" | "),
    );

    normalized[`${width}x${height}`] = {
      width: state.scene.width / state.world.width,
      height: state.scene.height / state.world.height,
    };
    if (width === 1920) {
      await page.screenshot({
        path: path.join(
          OUTPUT,
          `street-precise-final-normal-${width}x${height}.png`,
        ),
      });
    }
    await context.close();
  }

  const baseline = normalized["1920x1080"];
  for (const size of ["1600x900", "1366x768"]) {
    const current = normalized[size];
    record(
      `${size}-scene-ratio`,
      Math.abs(current.width - baseline.width) < 0.001 &&
        Math.abs(current.height - baseline.height) < 0.001,
      JSON.stringify({ baseline, current }),
    );
  }
}

async function checkCalibrator(browser) {
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

  const normal = await placementState(page);
  record(
    "yu-liu-unchanged",
    normal.entries.candy.transform === EXPECTED.candy,
    normal.entries.candy.transform,
  );

  const heitou = page.locator('[data-street-entry="heitou"]');
  const hitPoint = await heitou.evaluate((link) => {
    const rect = link.getBoundingClientRect();
    for (let row = 3; row < 22; row += 1) {
      for (let column = 3; column < 22; column += 1) {
        const x = rect.left + (rect.width * column) / 24;
        const y = rect.top + (rect.height * row) / 24;
        if (
          window.StreetEntries.entryAt(x, y)?.dataset.streetEntry === "heitou"
        ) {
          return { x, y };
        }
      }
    }
    return null;
  });
  if (hitPoint) {
    await page.mouse.move(hitPoint.x, hitPoint.y);
    await page.waitForTimeout(220);
  }
  record(
    "tooltip-preserved",
    (await page.locator("#streetNameTooltip").getAttribute("aria-hidden")) ===
      "false" &&
      (await page
        .locator("[data-street-tooltip-name]")
        .textContent()) === "黑头",
  );
  await page.mouse.move(2, 2);
  await page.waitForTimeout(220);

  await page.keyboard.press("Control+Shift+A");
  await page.locator("#streetAlignCalibrator").waitFor({ state: "visible" });
  record(
    "calibrator-development-only",
    await page.evaluate(() => {
      const state = window.StreetEntries.calibrator.getState();
      return state.isDevelopment && state.active;
    }),
  );

  for (const key of CALIBRATED) {
    await page
      .locator("[data-street-align-entry]")
      .selectOption(key);
    await page.waitForTimeout(50);
    const state = await page.evaluate((selectedKey) => {
      const calibrator = window.StreetEntries.calibrator.getState();
      const link = document.querySelector(
        `[data-street-entry="${selectedKey}"]`,
      );
      return {
        calibrator,
        opacity: Number(
          getComputedStyle(link.querySelector(".street-entry-art")).opacity,
        ),
        boundary: Boolean(
          link.querySelector("[data-street-align-boundary]"),
        ),
        anchor: Boolean(link.querySelector("[data-street-align-anchor]")),
        readout: document.querySelector("[data-street-align-readout]")
          ?.textContent,
        controlCount: document.querySelectorAll(
          "[data-street-align-input]",
        ).length,
      };
    }, key);

    record(
      `${key}-calibrator-50-percent`,
      state.calibrator.selectedKey === key &&
        Math.abs(state.opacity - 0.5) < 0.001,
      JSON.stringify(state),
    );
    record(
      `${key}-calibrator-guides`,
      state.boundary && state.anchor,
      JSON.stringify(state),
    );
    record(
      `${key}-calibrator-controls`,
      state.controlCount === 4 &&
        state.readout?.includes(EXPECTED[key].split(" scale")[0]),
      JSON.stringify(state),
    );
    await page.screenshot({
      path: path.join(OUTPUT, `street-precise-browser-${key}-50.png`),
    });
  }

  await page.locator("[data-street-align-entry]").selectOption("heitou");
  const beforeAdjust = await page
    .locator('[data-street-entry="heitou"]')
    .getAttribute("transform");
  await page.locator('[data-street-align-input="x"]').evaluate((input) => {
    input.value = "948";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const afterAdjust = await page
    .locator('[data-street-entry="heitou"]')
    .getAttribute("transform");
  record(
    "calibrator-realtime-adjust",
    beforeAdjust === EXPECTED.heitou &&
      afterAdjust === "translate(948 495) scale(0.2505)",
    `${beforeAdjust} -> ${afterAdjust}`,
  );
  await page.locator("[data-street-align-reset]").click();
  record(
    "calibrator-reset",
    (await page
      .locator('[data-street-entry="heitou"]')
      .getAttribute("transform")) === EXPECTED.heitou,
  );

  await page.locator("[data-street-align-close]").click();
  const closed = await placementState(page);
  record(
    "calibrator-close-restores-normal",
    closed.panelCount === 0 &&
      closed.boundaryCount === 0 &&
      closed.anchorCount === 0 &&
      Object.values(closed.entries).every((entry) => entry.opacity === 1) &&
      Object.entries(EXPECTED).every(
        ([key, transform]) => closed.entries[key].transform === transform,
      ),
    JSON.stringify(closed),
  );
  record("desktop-no-errors", pageErrors.length === 0, pageErrors.join(" | "));
  details.closed = closed;
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
    await checkCalibrator(browser);
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
  const reportPath = path.join(
    OUTPUT,
    "qa-street-precise-alignment.json",
  );
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
