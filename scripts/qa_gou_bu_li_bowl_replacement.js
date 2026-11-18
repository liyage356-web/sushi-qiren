const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
} = require("C:\\Users\\liyage\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const PAGE_ORIGIN = process.argv[2] || "http://127.0.0.1:4173/";
const OUTPUT_DIR = "C:\\Users\\liyage\\Documents\\ChatGPT\\俗世奇人\\";
const REPORT_PATH = path.join(OUTPUT_DIR, "output", "qa-gou-bu-li-bowl-replacement.json");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function browserExecutable() {
  const executable = browserCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!executable) throw new Error("No installed Edge or Chrome executable found.");
  return executable;
}

async function openCraft(page) {
  await page.goto(`${PAGE_ORIGIN}index.html#gou-bu-li/craft`, {
    waitUntil: "networkidle",
  });
  await page.locator("#dogCraftBenchOpen").click();
  await page.locator("#gouBuliCraftModule").waitFor({ state: "visible" });
  await page.locator("#gbcMixingLayer").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const empty = document.querySelector("#gbcReplacementBowlEmpty");
    const soup = document.querySelector(".gbc-mixing-piece-soup img");
    return empty.complete && empty.naturalWidth > 0 &&
      soup.complete && soup.naturalWidth > 0;
  });
}

async function bowlGeometry(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".gbc-canvas");
    const canvasRect = canvas.getBoundingClientRect();
    const empty = document.querySelector("#gbcReplacementBowlEmpty");
    const shell = document.querySelector("#gbcReplacementBowlShell");
    const soupButton = document.querySelector(".gbc-mixing-piece-soup");
    const soup = soupButton.querySelector("img");
    const state = document.querySelector("#gbcMixingStateImage");
    const canvasContent = {
      left: canvasRect.left + canvas.clientLeft,
      top: canvasRect.top + canvas.clientTop,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
    const normalize = (rect) => {
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        normalizedLeft:
          (rect.left - canvasContent.left) / canvasContent.width,
        normalizedTop:
          (rect.top - canvasContent.top) / canvasContent.height,
        normalizedWidth: rect.width / canvasContent.width,
        normalizedHeight: rect.height / canvasContent.height,
      };
    };
    const visibleImageRect = (image) => {
      const rect = image.getBoundingClientRect();
      if (!image.naturalWidth || !image.naturalHeight) return rect;
      const scale = Math.min(
        rect.width / image.naturalWidth,
        rect.height / image.naturalHeight,
      );
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      return {
        left: rect.left + (rect.width - width) / 2,
        top: rect.top + (rect.height - height) / 2,
        right: rect.left + (rect.width + width) / 2,
        bottom: rect.top + (rect.height + height) / 2,
        width,
        height,
      };
    };
    return {
      canvas: {
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      empty: normalize(visibleImageRect(empty)),
      shell: normalize(visibleImageRect(shell)),
      soup: normalize(visibleImageRect(soup)),
      emptyStyle: {
        hidden: empty.hidden,
        pointerEvents: getComputedStyle(empty).pointerEvents,
        zIndex: Number(getComputedStyle(empty).zIndex),
        source: empty.getAttribute("src"),
        naturalWidth: empty.naturalWidth,
        naturalHeight: empty.naturalHeight,
        loaded: empty.complete && empty.naturalWidth > 0,
        objectFit: getComputedStyle(empty).objectFit,
      },
      shellStyle: {
        hidden: shell.hidden,
        pointerEvents: getComputedStyle(shell).pointerEvents,
        zIndex: Number(getComputedStyle(shell).zIndex),
        source: shell.getAttribute("src"),
        naturalWidth: shell.naturalWidth,
        naturalHeight: shell.naturalHeight,
        loaded: shell.complete && shell.naturalWidth > 0,
        objectFit: getComputedStyle(shell).objectFit,
      },
      soupStyle: {
        zIndex: Number(getComputedStyle(soupButton).zIndex),
        source: soup.getAttribute("src"),
        naturalWidth: soup.naturalWidth,
        naturalHeight: soup.naturalHeight,
        loaded: soup.complete && soup.naturalWidth > 0,
        objectFit: getComputedStyle(soup).objectFit,
      },
      stateZIndex: Number(getComputedStyle(state).zIndex),
      step: window.gouBuliCraft.getState().mixing.step,
    };
  });
}

async function bowlAlpha(page) {
  return page.evaluate(async () => {
    async function read(selector) {
      const source = document.querySelector(selector).getAttribute("src");
      const bitmap = await createImageBitmap(await (await fetch(source)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const sample = (x, y) =>
        context.getImageData(
          Math.max(0, Math.min(bitmap.width - 1, Math.round(bitmap.width * x))),
          Math.max(0, Math.min(bitmap.height - 1, Math.round(bitmap.height * y))),
          1,
          1,
        ).data[3];
      return {
        width: bitmap.width,
        height: bitmap.height,
        center: sample(0.5, 0.5),
        topRim: sample(0.5, 0.04),
        bottomFoot: sample(0.5, 0.97),
      };
    }
    return {
      empty: await read("#gbcReplacementBowlEmpty"),
      shell: await read("#gbcReplacementBowlShell"),
    };
  });
}

async function dragToBowl(page, ingredient) {
  const source = await page
    .locator(`[data-gbc-mixing-ingredient="${ingredient}"]`)
    .boundingBox();
  const target = await page.locator("#gbcStirZone").boundingBox();
  if (!source || !target) throw new Error(`Missing ${ingredient} drag geometry.`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height * 0.48,
    { steps: 12 },
  );
  await page.mouse.up();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
  });
  const errors = [];
  const viewports = [
    { name: "full-hd", width: 1920, height: 1080 },
    { name: "laptop", width: 1600, height: 900 },
    { name: "compact", width: 1366, height: 768 },
    { name: "mobile", width: 390, height: 844 },
  ];
  const sessions = {};

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (error) =>
      errors.push(`${viewport.name} pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(`${viewport.name} console: ${message.text()}`);
      }
    });
    await openCraft(page);
    const geometry = await bowlGeometry(page);
    const alpha = viewport.name === "full-hd" ? await bowlAlpha(page) : null;
    await page.screenshot({
      path: `${OUTPUT_DIR}gou-bu-li-bowl-replacement-${viewport.name}.png`,
      fullPage: false,
    });
    sessions[viewport.name] = { geometry, alpha };
    await page.close();
  }

  const interactive = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  interactive.on("pageerror", (error) =>
    errors.push(`interactive pageerror: ${error.message}`),
  );
  interactive.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`interactive console: ${message.text()}`);
    }
  });
  await openCraft(interactive);
  await dragToBowl(interactive, "meat");
  await interactive.waitForFunction(
    () => window.gouBuliCraft.getState().mixing.step === "scallion",
  );
  const afterMeat = await bowlGeometry(interactive);
  await interactive.screenshot({
    path: `${OUTPUT_DIR}gou-bu-li-bowl-replacement-after-meat.png`,
    fullPage: false,
  });
  await dragToBowl(interactive, "scallion");
  await interactive.waitForFunction(
    () => window.gouBuliCraft.getState().mixing.step === "soup",
  );
  const soupStep = await bowlGeometry(interactive);
  const soupHit = await interactive.evaluate(() => {
    const button = document.querySelector(".gbc-mixing-piece-soup");
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      ingredient: hit?.closest("[data-gbc-mixing-ingredient]")?.dataset
        .gbcMixingIngredient || null,
      tag: hit?.tagName || null,
    };
  });
  await interactive.close();
  await browser.close();

  const expected = {
    soupLeft: 0.321557,
    soupTop: 0.190052,
    soupWidth: 0.135928,
    soupHeight: 0.158616,
    bowlLeft: 0.27485,
    bowlTop: 0.293312,
    bowlWidth: 0.466467,
    bowlHeight: 0.628077,
  };
  const near = (actual, target, tolerance) =>
    Math.abs(actual - target) <= tolerance;
  const naturalRatio = (style) => style.naturalWidth / style.naturalHeight;
  const renderedRatio = (rect) => rect.width / rect.height;
  const checks = [];
  const add = (name, passed, detail) => checks.push({ name, passed, detail });

  for (const viewport of viewports) {
    const session = sessions[viewport.name];
    const geometry = session.geometry;
    add(
      `${viewport.name}: central bowl keeps its supplied aspect ratio`,
      near(
        renderedRatio(geometry.empty),
        naturalRatio(geometry.emptyStyle),
        0.006,
      ),
      {
        rendered: renderedRatio(geometry.empty),
        natural: naturalRatio(geometry.emptyStyle),
      },
    );
    add(
      `${viewport.name}: soup bowl keeps its supplied aspect ratio`,
      near(
        renderedRatio(geometry.soup),
        naturalRatio(geometry.soupStyle),
        0.006,
      ),
      {
        rendered: renderedRatio(geometry.soup),
        natural: naturalRatio(geometry.soupStyle),
      },
    );
    add(
      `${viewport.name}: both bowls retain the calibrated scene position`,
      near(geometry.soup.normalizedLeft, expected.soupLeft, 0.003) &&
        near(geometry.soup.normalizedTop, expected.soupTop, 0.003) &&
        near(geometry.soup.normalizedWidth, expected.soupWidth, 0.003) &&
        near(geometry.soup.normalizedHeight, expected.soupHeight, 0.003) &&
        near(geometry.empty.normalizedLeft, expected.bowlLeft, 0.003) &&
        near(geometry.empty.normalizedTop, expected.bowlTop, 0.003) &&
        near(geometry.empty.normalizedWidth, expected.bowlWidth, 0.003) &&
        near(geometry.empty.normalizedHeight, expected.bowlHeight, 0.003),
      {
        soup: geometry.soup,
        central: geometry.empty,
      },
    );
  }

  const fullHd = sessions["full-hd"].geometry;
  add(
    "supplied soup bowl is the active soup source",
    fullHd.soupStyle.loaded &&
      fullHd.soupStyle.source.endsWith("supplied-soup-bowl.png"),
    fullHd.soupStyle,
  );
  add(
    "supplied empty blue bowl replaces the central bowl initially",
    !fullHd.emptyStyle.hidden &&
      fullHd.emptyStyle.loaded &&
      fullHd.emptyStyle.source.endsWith("supplied-blue-bowl.png"),
    fullHd.emptyStyle,
  );
  add(
    "small soup bowl is behind the central bowl",
    fullHd.soupStyle.zIndex < fullHd.emptyStyle.zIndex &&
      fullHd.soup.right > fullHd.empty.left &&
      fullHd.soup.bottom > fullHd.empty.top,
    {
      soupZIndex: fullHd.soupStyle.zIndex,
      bowlZIndex: fullHd.emptyStyle.zIndex,
      soup: fullHd.soup,
      bowl: fullHd.empty,
    },
  );
  add(
    "replacement layers do not intercept ingredient dragging",
    fullHd.emptyStyle.pointerEvents === "none" &&
      fullHd.shellStyle.pointerEvents === "none",
    {
      empty: fullHd.emptyStyle.pointerEvents,
      shell: fullHd.shellStyle.pointerEvents,
    },
  );
  const alpha = sessions["full-hd"].alpha;
  add(
    "supplied blue bowl has an opaque interior while empty",
    alpha.empty.center > 245 && alpha.empty.topRim > 245,
    alpha.empty,
  );
  add(
    "bowl shell preserves the rim and foot but opens the food area",
    alpha.shell.center < 5 &&
      alpha.shell.topRim > 200 &&
      alpha.shell.bottomFoot > 200,
    alpha.shell,
  );
  add(
    "food-state overlays stay below the replacement bowl shell",
    afterMeat.emptyStyle.hidden &&
      !afterMeat.shellStyle.hidden &&
      afterMeat.stateZIndex < afterMeat.soupStyle.zIndex &&
      afterMeat.soupStyle.zIndex < afterMeat.shellStyle.zIndex,
    {
      emptyHidden: afterMeat.emptyStyle.hidden,
      shellHidden: afterMeat.shellStyle.hidden,
      stateZIndex: afterMeat.stateZIndex,
      soupZIndex: afterMeat.soupStyle.zIndex,
      shellZIndex: afterMeat.shellStyle.zIndex,
    },
  );
  add(
    "the replacement soup bowl remains the actual drop and drag target",
    soupStep.step === "soup" && soupHit.ingredient === "soup",
    soupHit,
  );
  add("no browser runtime errors", errors.length === 0, errors);

  const failed = checks.filter((check) => !check.passed);
  const report = {
    passed: failed.length === 0,
    checkCount: checks.length,
    failed,
    errors,
    sessions,
    interactive: { afterMeat, soupStep, soupHit },
    checks,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      checkCount: report.checkCount,
      failed: failed.map((check) => check.name),
      errors: errors.length,
      report: REPORT_PATH,
    }),
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
